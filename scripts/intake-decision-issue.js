#!/usr/bin/env node
// ─── Decision-required issues ───────────────────────────────────────────────
//
// WHY THIS EXISTS (gap found 2026-08-10):
// The park taxonomy gives the `decision-required` class `trigger: "owner"` and
// `bound: null` — it waits for the owner, forever, with no retry. The mechanism
// to UNPARK one is complete (`intake-owner-decision.js` writes the envelope,
// `verify-reentry` gates it). What was missing was the mechanism to TELL the
// owner. `intake-owner-questions.js` opens issues, but is hard-scoped by
// OWNER_ATTESTABLE_FIELDS to the three askable fields and refuses everything
// else — correctly, that is its safety property. So a park on a taxonomy call
// or a source conflict produced one line in a Discord run report and then
// nothing. `hi` (2026-08-09, new-series-group) and `ender3_s1_pro` (2026-08-10,
// needs-source-resolution) both parked correctly and both went silent.
//
// WHAT THIS IS NOT: an answer channel. Nothing here authorizes re-entry. The
// only authorization remains an owner-decision envelope validated by
// `intake-owner-decision.js verify-reentry`, and the issue body says so. The
// label is deliberately different from the owner-question label so that
// `intake-owner-questions.js read` — which parses YAML answer blocks into
// owner-attested field values — can never pick a decision issue up.
//
// The primary entry point is `sync`, not `open`. Per-candidate bookkeeping is
// something a runner session can forget; a sweep over the parked store cannot
// drift, backfills anything previously missed, and is a fixpoint.
//
// Usage:
//   node scripts/intake-decision-issue.js sync  [--state-dir <dir>] [--repo owner/name] [--apply]
//   node scripts/intake-decision-issue.js open  --candidate <id> [--state-dir <dir>] [--repo owner/name] [--apply]
//   node scripts/intake-decision-issue.js close --candidate <id> [--comment "..."] [--repo owner/name] [--apply]

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const DECISION_LABEL = 'intake-decision';
const DEFAULT_STATE_DIR = path.join(__dirname, '.intake-runner-state');
const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..');
const ID_RE = /^[A-Za-z0-9._-]+$/;

// The generated command has to name the checkout it must write into (#34).
// Parked sidecars are gitignored and host-local, so "the repo root" is not a
// property of the repo — it is a property of the machine. The runner's own dev
// tree and the automation checkout are both valid git roots, and only one of
// them is read at 12:00. The failure is asymmetric and that is what makes prose
// insufficient: a checkout with NO state dir fails loudly (`active parked
// sidecar missing`), but one with a STALE state dir accepts the envelope,
// prints `ok=true`, and the runner never sees it. `intake-owner-decision.js`
// resolves every path from `--repo-root` (its `defaults()`), so binding the
// command to an absolute root removes the guess instead of documenting it.
function repoRootForStateDir(stateDir) {
  // stateDir is `<repo>/scripts/.intake-runner-state` — by construction for the
  // default, and by convention for an explicit `--state-dir`.
  return path.resolve(stateDir, '..', '..');
}

// Mirrors intake-park-taxonomy.json's decision-required class. Kept as a local
// constant rather than read from the taxonomy so a taxonomy read failure can
// never silence the owner; the taxonomy file remains authoritative for the
// runner, this list only decides who gets told.
const DECISION_REASONS = new Set([
  'new-series-group',
  'app-cap-no-go',
  'pd4-criteria-unmet',
  'review-split',
  'needs-owner-taxonomy',
  'needs-taxonomy-decision',
  'blocked',
  'needs-source-resolution',
]);

// What the owner actually has to DO, per reason. An issue that says "a decision
// is required" and stops is the same dead end as no issue at all.
const REASON_GUIDANCE = {
  'new-series-group': {
    what: 'The printer is confirmed and shippable, but its `series_group` does not exactly match '
      + 'any existing sibling in the catalog. Auto-ship requires an exact match; inventing a new '
      + 'series label is a taxonomy call only you can make.',
    how: (id, repoRoot) => [
      '# pick the label — either an existing sibling group, or a new one you are establishing',
      `node ${repoRoot}/scripts/intake-owner-decision.js approve-series --candidate ${id} \\`,
      `  --repo-root ${repoRoot} \\`,
      '  --series-group "<the exact series_group label>" --apply',
    ].join('\n'),
  },
  'needs-source-resolution': {
    what: 'Two manufacturer-class sources disagree on a profile- or safety-critical field. The '
      + 'pipeline will not pick a winner on its own. Give it the source that settles it — your URLs '
      + 'are treated as LEADS: research re-runs against them and anything they do not substantiate '
      + 'still parks.',
    how: (id, repoRoot) => [
      '# --source is repeatable; --field names what is still unresolved',
      `node ${repoRoot}/scripts/intake-owner-decision.js provide-evidence --candidate ${id} \\`,
      `  --repo-root ${repoRoot} \\`,
      '  --edge rd3-external-evidence --source "<url>" --field <field_name> --apply',
    ].join('\n'),
  },
  'review-split': {
    what: 'The two PD5 reviewers disagreed (one GO, one NO-GO). Overriding a reviewer judgment is '
      + 'an owner call, and it still has to clear the retry gate afterwards.',
    how: (id, repoRoot) => [
      `node ${repoRoot}/scripts/intake-owner-decision.js provide-evidence --candidate ${id} \\`,
      `  --repo-root ${repoRoot} \\`,
      '  --edge owner-instruction --source "<url backing your call>" --apply',
    ].join('\n'),
  },
};

const GENERIC_GUIDANCE = {
  what: 'This park is in the `decision-required` class: it has no retry bound and no timer. '
    + 'It will sit exactly as it is until you record a decision.',
  how: (id, repoRoot) => [
    '# see the sanctioned re-entry edges in scripts/intake-park-taxonomy.json',
    `node ${repoRoot}/scripts/intake-owner-decision.js provide-evidence --candidate ${id} \\`,
    `  --repo-root ${repoRoot} \\`,
    '  --edge owner-instruction --source "<url backing your call>" --apply',
  ].join('\n'),
};

function gh(args, { allowFail = false } = {}) {
  try {
    return execFileSync('gh', args, { encoding: 'utf8' });
  } catch (error) {
    if (allowFail) return '';
    throw new Error(`gh ${args.slice(0, 2).join(' ')} failed: ${(error.stderr || error.message).toString().slice(0, 300)}`);
  }
}

function assertCandidate(id) {
  if (typeof id !== 'string' || !ID_RE.test(id)) {
    throw new Error('candidate must match [A-Za-z0-9._-]+');
  }
  return id;
}

function isDecisionPark(sidecar) {
  if (!sidecar || typeof sidecar !== 'object') return false;
  // Either signal is enough. Requiring both would let a single mislabelled
  // field silence the owner, and over-notifying is the safe direction here.
  return sidecar.class === 'decision-required' || DECISION_REASONS.has(sidecar.reason);
}

// The parked store is the source of truth for "what is stuck right now".
// Anything unreadable is skipped rather than thrown on: a sweep that dies on
// one bad sidecar would stop telling the owner about all the good ones.
function collectDecisionParks(stateDir = DEFAULT_STATE_DIR) {
  const parkedRoot = path.join(stateDir, 'parked');
  let entries;
  try {
    entries = fs.readdirSync(parkedRoot, { withFileTypes: true });
  } catch (_) {
    return [];
  }
  const parks = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    // A directory name becomes a `--candidate` argument in the issue body and a
    // path segment here; anything outside the token charset is not ours.
    if (!ID_RE.test(entry.name)) continue;
    let sidecar;
    try {
      sidecar = JSON.parse(fs.readFileSync(path.join(parkedRoot, entry.name, 'parked.json'), 'utf8'));
    } catch (_) {
      continue;
    }
    if (!isDecisionPark(sidecar)) continue;
    parks.push({ ...sidecar, candidateId: sidecar.candidateId && ID_RE.test(sidecar.candidateId) ? sidecar.candidateId : entry.name });
  }
  return parks.sort((a, b) => a.candidateId.localeCompare(b.candidateId));
}

function issueTitle(park) {
  return `intake: ${park.candidateId} needs a decision — ${park.reason || 'decision-required'}`;
}

function guidanceFor(reason) {
  return REASON_GUIDANCE[reason] || GENERIC_GUIDANCE;
}

function buildBody(park, repoRoot = DEFAULT_REPO_ROOT) {
  const id = park.candidateId;
  const guidance = guidanceFor(park.reason);
  const parkedAt = park.firstParkedAt ? ` on ${String(park.firstParkedAt).slice(0, 10)}` : '';

  return `The intake pipeline researched **${id}** and stopped at a call it is not allowed to make
on its own. It parked${parkedAt} as \`${park.reason || 'decision-required'}\` — a
\`decision-required\` park, which has **no retry and no timer**. Nothing moves until you decide.

**What it needs from you**

${guidance.what}

**What the run found**

> ${String(park.resolutionNote || 'No note recorded.').replace(/\n/g, '\n> ')}

**How to record the decision**

\`\`\`bash
${guidance.how(id, repoRoot)}
\`\`\`

The \`--repo-root\` above is the checkout the runner actually reads, so you can run this from any
directory. Do not drop it and do not point it at a different clone: the parked sidecars are
gitignored and host-local, and a clone carrying a **stale** copy of them will accept the envelope
and print \`ok=true\` while the runner never sees it.

It writes an owner-decision envelope into the candidate's parked sidecar; the next scheduled run
calls \`intake-owner-decision.js verify-reentry\` and only an \`ok=true\` envelope re-enters the
pipeline. Every normal gate — evidence, both reviewers, live verify, custody — still runs
afterwards.

---
Commenting here is fine for your own notes, but a comment is **not** a decision: prose never
authorizes re-entry, only the envelope does. This issue closes itself when the candidate
reaches terminal custody.

<sub>Opened automatically by the intake runner (\`intake-decision-issue.js\`).</sub>`;
}

function listOpenIssues(repoArgs) {
  const raw = gh(['issue', 'list', '--label', DECISION_LABEL, '--state', 'open',
    '--json', 'number,title,body', '--limit', '100', ...repoArgs], { allowFail: true });
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function issueMatches(issue, candidateId) {
  return String(issue.body || '').includes(`**${candidateId}**`);
}

function findIssue(candidateId, issues) {
  return issues.find((i) => issueMatches(i, candidateId)) || null;
}

// Pure: what would sync do, given the world. Separating this from the gh calls
// is what makes the fixpoint property testable offline.
// `repoRoot` is optional. Given one, an already-open issue whose published body
// no longer matches what buildBody renders is planned for REFRESH.
//
// Without this, a fix to buildBody only ever reached issues opened after the
// fix: #36 and #29 both kept instructing the owner to "run it from the repo
// root" for two days after d2c39d3 corrected that exact sentence, and both had
// to be regenerated by hand (2026-08-15). The generator being right is not the
// same as the published copy being right.
//
// Rewriting the body is safe because the body is entirely machine-generated —
// the issue text directs the owner's own notes to COMMENTS, which are never
// touched here. Comparing before writing is what keeps the sweep a fixpoint:
// an unchanged world plans no refresh and therefore performs no gh call.
function planSync(parks, openIssues, repoRoot) {
  const toOpen = [];
  const existing = [];
  const toRefresh = [];
  for (const park of parks) {
    const issue = findIssue(park.candidateId, openIssues);
    if (issue) {
      existing.push(issue);
      if (repoRoot !== undefined) {
        const body = buildBody(park, repoRoot);
        if (String(issue.body || '') !== body) toRefresh.push({ issue, park, body });
      }
    } else toOpen.push(park);
  }
  const parkedIds = new Set(parks.map((p) => p.candidateId));
  const toClose = openIssues.filter((issue) => ![...parkedIds].some((id) => issueMatches(issue, id)));
  return { toOpen, toClose, existing, toRefresh };
}

function createIssue(park, repoArgs, repoRoot) {
  const out = gh(['issue', 'create', '--label', DECISION_LABEL,
    '--title', issueTitle(park),
    '--body', buildBody(park, repoRoot), ...repoArgs]);
  return Number((out.match(/\/issues\/(\d+)/) || [])[1]) || null;
}

// The label may not exist yet on a fresh repo, and `gh issue create` fails hard
// on an unknown label. Creating it is idempotent and cheap.
function ensureLabel(repoArgs) {
  gh(['label', 'create', DECISION_LABEL,
    '--color', 'B60205',
    '--description', 'Intake parked on an owner decision — no retry until answered',
    ...repoArgs], { allowFail: true });
}

// The receipt POSTRUN check 7 reads. A live gh query in that fail-closed gate
// would put a network call on the run's critical path — a GitHub outage would
// fail the whole intake run — so the sweep leaves proof instead and the gate
// checks its mtime, exactly as check 2 proves notify ran via last-run-report.md.
function receiptPath(stateDir) {
  return path.join(stateDir, 'last-decision-sync.json');
}

function writeReceipt(stateDir, result) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(receiptPath(stateDir), `${JSON.stringify({
    schema: 'intake-decision-sync@1',
    syncedAt: new Date().toISOString(),
    opened: result.opened || [],
    closed: result.closed || [],
    existing: result.existing || [],
    refreshed: result.refreshed || [],
  }, null, 2)}\n`);
}

function syncIssues(options) {
  const repoArgs = options.repo ? ['--repo', options.repo] : [];
  const stateDir = options.stateDir || DEFAULT_STATE_DIR;
  const parks = collectDecisionParks(stateDir);
  const repoRoot = repoRootForStateDir(stateDir);
  const plan = planSync(parks, listOpenIssues(repoArgs), repoRoot);

  if (!options.apply) {
    return {
      changed: false,
      action: 'sync',
      opened: [],
      closed: [],
      refreshed: [],
      wouldOpen: plan.toOpen.map((p) => p.candidateId),
      wouldClose: plan.toClose.map((i) => i.number),
      wouldRefresh: plan.toRefresh.map((r) => r.issue.number),
      existing: plan.existing.map((i) => i.number),
    };
  }

  if (plan.toOpen.length > 0) ensureLabel(repoArgs);
  const opened = [];
  for (const park of plan.toOpen) {
    opened.push({ candidateId: park.candidateId, issue: createIssue(park, repoArgs, repoRoot) });
  }
  const closed = [];
  for (const issue of plan.toClose) {
    gh(['issue', 'close', String(issue.number), '--comment',
      'No longer parked on an owner decision — closed by the intake runner.', ...repoArgs]);
    closed.push(issue.number);
  }
  // Body-only edit: never touches title, labels, state or comments, so an owner
  // note on the issue survives a rewrite of the machine-generated instructions.
  const refreshed = [];
  for (const { issue, body } of plan.toRefresh) {
    gh(['issue', 'edit', String(issue.number), '--body', body, ...repoArgs]);
    refreshed.push(issue.number);
  }
  const result = {
    changed: opened.length > 0 || closed.length > 0 || refreshed.length > 0,
    action: 'sync',
    opened,
    closed,
    refreshed,
    existing: plan.existing.map((i) => i.number),
  };
  // A zero-change sweep still writes: "nothing was stuck" has to be provable,
  // otherwise a quiet day is indistinguishable from a skipped stage.
  writeReceipt(stateDir, result);
  return result;
}

function openIssueFor(options) {
  const candidateId = assertCandidate(options.candidate);
  const stateDir = options.stateDir || DEFAULT_STATE_DIR;
  const park = collectDecisionParks(stateDir)
    .find((p) => p.candidateId === candidateId);
  if (!park) {
    throw new Error(`${candidateId} is not a decision-required park in the parked store`);
  }
  const repoArgs = options.repo ? ['--repo', options.repo] : [];
  const existing = findIssue(candidateId, listOpenIssues(repoArgs));
  if (existing) return { changed: false, action: 'open', issue: existing.number };
  if (!options.apply) return { changed: false, action: 'open', issue: null, wouldOpen: candidateId };
  ensureLabel(repoArgs);
  return { changed: true, action: 'open', issue: createIssue(park, repoArgs, repoRootForStateDir(stateDir)) };
}

function closeIssueFor(options) {
  const candidateId = assertCandidate(options.candidate);
  const repoArgs = options.repo ? ['--repo', options.repo] : [];
  const issue = findIssue(candidateId, listOpenIssues(repoArgs));
  if (!issue) return { changed: false, action: 'close', issue: null };
  if (!options.apply) return { changed: false, action: 'close', issue: issue.number };
  gh(['issue', 'close', String(issue.number), '--comment',
    options.comment || 'Consumed by the intake runner.', ...repoArgs]);
  return { changed: true, action: 'close', issue: issue.number };
}

function parseCli(argv) {
  const [command, ...rest] = argv;
  if (!['sync', 'open', 'close'].includes(command)) {
    throw new Error('command must be sync, open, or close');
  }
  const options = { apply: false };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--apply') { options.apply = true; continue; }
    if (arg === '--dry-run') { options.apply = false; continue; }
    const value = rest[++i];
    if (value === undefined) throw new Error(`${arg} requires a value`);
    const key = {
      '--candidate': 'candidate', '--state-dir': 'stateDir',
      '--repo': 'repo', '--comment': 'comment',
    }[arg];
    if (!key) throw new Error(`unknown argument ${arg}`);
    options[key] = value;
  }
  return { command, options };
}

module.exports = {
  collectDecisionParks, buildBody, issueTitle, planSync, repoRootForStateDir,
  syncIssues, openIssueFor, closeIssueFor, writeReceipt, receiptPath,
  DECISION_LABEL, DECISION_REASONS,
};

if (require.main === module) {
  try {
    const { command, options } = parseCli(process.argv.slice(2));
    const result = command === 'sync' ? syncIssues(options)
      : command === 'open' ? openIssueFor(options)
        : closeIssueFor(options);
    if (command === 'sync') {
      const opened = result.opened.length || (result.wouldOpen || []).length;
      const closed = result.closed.length || (result.wouldClose || []).length;
      const refreshed = result.refreshed.length || (result.wouldRefresh || []).length;
      console.log(`DECISIONISSUE ok=true action=sync opened=${opened} closed=${closed} refreshed=${refreshed} existing=${result.existing.length} changed=${result.changed}`);
      for (const o of result.opened) console.log(`  OPENED ${o.candidateId} issue=${o.issue}`);
      for (const c of result.wouldOpen || []) console.log(`  WOULD-OPEN ${c}`);
      for (const c of result.closed) console.log(`  CLOSED issue=${c}`);
      for (const c of result.wouldClose || []) console.log(`  WOULD-CLOSE issue=${c}`);
    } else {
      console.log(`DECISIONISSUE ok=true action=${result.action} issue=${result.issue ?? 'none'} changed=${result.changed}`);
    }
  } catch (error) {
    console.error(`DECISIONISSUE ok=false reason=${error.message}`);
    process.exit(1);
  }
}
