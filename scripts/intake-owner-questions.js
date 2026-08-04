#!/usr/bin/env node
// ─── Owner question issues ──────────────────────────────────────────────────
//
// When a candidate parks on a field the manufacturer never states, the runner
// opens ONE GitHub issue asking the owner. The owner edits a fenced block in
// the browser, and the next scheduled run consumes it. Nobody is blocked: if
// the issue is unanswered the run simply does nothing and asks again tomorrow.
//
// Design decisions taken by the owner 2026-08-04, deliberately simpler than
// the reviewer proposed:
//   - NO nonce / no cryptographic issue binding. This is a private, single-owner
//     repo; the "someone else edits the issue" threat model does not exist and
//     the ceremony would be process for its own sake.
//   - NO answer expiry against a packet SHA. Answers may be added a field at a
//     time across days and must all still count.
//
// The safety property is NOT in this file — it is the OWNER_ATTESTABLE_FIELDS
// allowlist in validate-candidate-evidence.js. This module can only ever ask
// about, and pass through, fields on that list. A YAML block naming a bed
// temperature is rejected here AND at the writer AND at the gate.
//
// Usage:
//   node scripts/intake-owner-questions.js open   --candidate <id> --fields a,b [--tried "..."] [--repo owner/name]
//   node scripts/intake-owner-questions.js read   --candidate <id> [--repo owner/name]
//   node scripts/intake-owner-questions.js close  --candidate <id> --comment "..." [--repo owner/name]

const { execFileSync } = require('node:child_process');
const { OWNER_ATTESTABLE_FIELDS } = require('./validate-candidate-evidence.js');

const LABEL = 'intake-needs-data';
const ID_RE = /^[A-Za-z0-9._-]+$/;

const FIELD_PROMPTS = {
  enclosure: 'none | passive | active_heated   (is it open-frame, passively enclosed, or actively heated?)',
  series: 'bedslinger | corexy | ...            (does the bed move front-to-back, or does the toolhead move in X/Y?)',
  available_plates: 'comma-separated plate ids  (which build surfaces ship with it?)',
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

// Only ever ask about fields the gate could actually accept an answer for.
// Asking about a bed temperature would train the owner to expect it to work.
function attestableOnly(fields) {
  const asked = (Array.isArray(fields) ? fields : String(fields || '').split(','))
    .map((f) => f.trim()).filter(Boolean);
  const allowed = asked.filter((f) => OWNER_ATTESTABLE_FIELDS.has(f));
  const refused = asked.filter((f) => !OWNER_ATTESTABLE_FIELDS.has(f));
  return { allowed, refused };
}

function issueTitle(candidateId, fields) {
  return `intake: ${candidateId} needs ${fields.length} field${fields.length === 1 ? '' : 's'}`;
}

function buildBody(candidateId, fields, tried) {
  const block = fields.map((f) => [
    `  ${f}:`,
    '    value:   # ' + (FIELD_PROMPTS[f] || 'the value'),
    '    source:  # a URL backing this (a review, a photo page, the manual — anything you actually looked at)',
    '    claim:   # what that source shows, e.g. "product photo shows open gantry, no panels"',
  ].join('\n')).join('\n');

  return `The intake pipeline researched **${candidateId}** and confirmed everything it could from the
manufacturer. It could not confirm the field${fields.length === 1 ? '' : 's'} below, so it parked rather than guess.

${tried ? `**Already tried:** ${tried}\n` : ''}
Fill in the block and leave the issue open — the next scheduled run picks it up.
You can answer one field now and the rest later; partial answers are kept.

\`\`\`yaml
answers:
${block}
\`\`\`

---
Recorded as \`owner-attested\` — never as manufacturer evidence — with your name, the date,
and your claim. Temperatures, speeds, acceleration and nozzle sizes can never be answered
this way; those always park.

<sub>Opened automatically by the intake runner. Closes itself when consumed.</sub>`;
}

function findIssue(candidateId, repoArgs) {
  const raw = gh(['issue', 'list', '--label', LABEL, '--state', 'open',
    '--json', 'number,title,body,author', '--limit', '100', ...repoArgs], { allowFail: true });
  if (!raw.trim()) return null;
  let list;
  try { list = JSON.parse(raw); } catch (_) { return null; }
  const marker = `**${candidateId}**`;
  return list.find((i) => (i.body || '').includes(marker)) || null;
}

function openQuestion(options) {
  const candidateId = assertCandidate(options.candidate);
  const { allowed, refused } = attestableOnly(options.fields);
  if (allowed.length === 0) {
    throw new Error(`no owner-attestable fields among [${String(options.fields)}]; nothing to ask`);
  }
  const repoArgs = options.repo ? ['--repo', options.repo] : [];
  const existing = findIssue(candidateId, repoArgs);
  if (existing) {
    return { changed: false, action: 'open', issue: existing.number, refused };
  }
  if (!options.apply) {
    return { changed: false, action: 'open', issue: null, refused, wouldAsk: allowed };
  }
  const out = gh(['issue', 'create', '--label', LABEL,
    '--title', issueTitle(candidateId, allowed),
    '--body', buildBody(candidateId, allowed, options.tried), ...repoArgs]);
  const number = Number((out.match(/\/issues\/(\d+)/) || [])[1]) || null;
  return { changed: true, action: 'open', issue: number, refused };
}

// Deterministic parse of the fenced block. Intentionally a tiny line parser
// rather than a YAML dependency: the block shape is fixed and generated by
// buildBody(), and an unparseable answer must fail closed rather than be
// guessed at. Comment tails (`# ...`) are the template's own hints — stripped.
function parseAnswers(body) {
  const fence = (body || '').match(/```ya?ml\s*\n([\s\S]*?)```/i);
  if (!fence) return { answers: [], errors: ['no ```yaml block found'] };
  const lines = fence[1].split('\n');
  const answers = [];
  const errors = [];
  let current = null;

  // Anchor on start-of-string OR whitespace. A line that is ONLY the template
  // hint (`value:   # none | passive`) has already had its leading whitespace
  // eaten by the key regex, so a bare `\s+#` pattern misses it and the hint
  // text itself becomes the "answer" — caught by the suite's own
  // freshly-generated-template case. A `#` inside a real value (a URL fragment)
  // has no whitespace before it and is correctly left alone.
  // Returns a value, or throws so the field is reported rather than mangled.
  // Silent corruption is the worst outcome for a provenance record: an answer
  // that half-parses still passes buildAttestation's non-empty check and gets
  // written as if it were what the owner meant.
  const strip = (v) => {
    const raw = String(v).trim();
    // YAML block scalars need multi-line handling this parser does not do.
    // Matching the full header grammar (`|`, `|-`, `|2-`, `>2+`, `| # note`…)
    // is easy to get subtly wrong — an earlier attempt missed the comment and
    // indentation-indicator forms and consumed them as literal claims. Any
    // leading `|` or `>` is refused instead: no legitimate answer starts that
    // way, and refusing is the fail-closed direction.
    if (/^[|>]/.test(raw)) {
      throw new Error('multi-line values are not supported — keep the answer on one line');
    }
    // A fully-quoted scalar is taken verbatim: the owner explicitly delimited
    // it, so a `#` inside is content, not a comment. Without this a legitimate
    // claim like "photo caption says #3 is open-frame" truncated to "photo
    // caption says" and corrupted the record with no error.
    const quoted = raw.match(/^(["'])([\s\S]*)\1\s*(?:#.*)?$/);
    if (quoted) return quoted[2].trim();
    // Opens a quote but never closes it: ambiguous. Refuse rather than guess
    // which half the owner meant.
    if (/^["']/.test(raw)) {
      throw new Error('unterminated quote — close the quote or remove it');
    }
    return raw.replace(/(^|\s+)#.*$/, '').trim();
  };

  for (const line of lines) {
    if (/^\s*answers:\s*$/.test(line)) continue;
    const fieldMatch = line.match(/^\s{2}([A-Za-z0-9_]+):\s*$/);
    if (fieldMatch) {
      current = { field: fieldMatch[1] };
      answers.push(current);
      continue;
    }
    const kv = line.match(/^\s{4}(value|source|claim):\s*(.*)$/);
    if (kv && current) {
      try {
        current[kv[1]] = strip(kv[2]);
      } catch (error) {
        current[kv[1]] = '';
        current._malformed = `${kv[1]}: ${error.message}`;
      }
    }
  }

  const complete = [];
  for (const a of answers) {
    if (!OWNER_ATTESTABLE_FIELDS.has(a.field)) {
      errors.push(`${a.field} is not owner-attestable — ignored`);
      continue;
    }
    // A malformed line is reported and NOT consumed, even if the other two keys
    // look fine — a half-parsed answer must never be written as provenance.
    if (a._malformed) {
      errors.push(`${a.field} ${a._malformed} — not consumed`);
      continue;
    }
    // A field left as the blank template is not an error, it is simply
    // unanswered: the owner may be answering the rest later.
    if (!a.value && !a.source && !a.claim) continue;
    const missing = ['value', 'source', 'claim'].filter((k) => !a[k]);
    if (missing.length) {
      errors.push(`${a.field} is partially filled (missing ${missing.join(', ')}) — not consumed`);
      continue;
    }
    if (!/^https?:\/\//i.test(a.source)) {
      errors.push(`${a.field} source must be an http(s) URL — not consumed`);
      continue;
    }
    complete.push(a);
  }
  return { answers: complete, errors };
}

function readAnswers(options) {
  const candidateId = assertCandidate(options.candidate);
  const repoArgs = options.repo ? ['--repo', options.repo] : [];
  const issue = findIssue(candidateId, repoArgs);
  if (!issue) return { action: 'read', issue: null, answers: [], errors: [] };
  const parsed = parseAnswers(issue.body);
  return {
    action: 'read',
    issue: issue.number,
    answeredBy: (issue.author && issue.author.login) || null,
    answers: parsed.answers,
    errors: parsed.errors,
  };
}

function closeQuestion(options) {
  const candidateId = assertCandidate(options.candidate);
  const repoArgs = options.repo ? ['--repo', options.repo] : [];
  const issue = findIssue(candidateId, repoArgs);
  if (!issue) return { changed: false, action: 'close', issue: null };
  if (!options.apply) return { changed: false, action: 'close', issue: issue.number };
  gh(['issue', 'close', String(issue.number), '--comment',
    options.comment || 'Consumed by the intake runner.', ...repoArgs]);
  return { changed: true, action: 'close', issue: issue.number };
}

function parseCli(argv) {
  const [command, ...rest] = argv;
  if (!['open', 'read', 'close'].includes(command)) {
    throw new Error('command must be open, read, or close');
  }
  const options = { apply: false };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--apply') { options.apply = true; continue; }
    if (arg === '--dry-run') { options.apply = false; continue; }
    const value = rest[++i];
    if (value === undefined) throw new Error(`${arg} requires a value`);
    const key = {
      '--candidate': 'candidate', '--fields': 'fields', '--tried': 'tried',
      '--repo': 'repo', '--comment': 'comment',
    }[arg];
    if (!key) throw new Error(`unknown argument ${arg}`);
    options[key] = value;
  }
  return { command, options };
}

module.exports = { parseAnswers, buildBody, attestableOnly, openQuestion, readAnswers, closeQuestion, LABEL };

if (require.main === module) {
  try {
    const { command, options } = parseCli(process.argv.slice(2));
    const result = command === 'open' ? openQuestion(options)
      : command === 'read' ? readAnswers(options)
        : closeQuestion(options);
    if (command === 'read') {
      console.log(`OWNERQUESTION ok=true action=read issue=${result.issue ?? 'none'} answered=${result.answers.length} errors=${result.errors.length}`);
      for (const a of result.answers) console.log(`  ANSWER ${a.field}=${JSON.stringify(a.value)} source=${a.source}`);
      for (const e of result.errors) console.log(`  NOTE ${e}`);
    } else {
      console.log(`OWNERQUESTION ok=true action=${result.action} issue=${result.issue ?? 'none'} changed=${result.changed}`);
    }
  } catch (error) {
    console.error(`OWNERQUESTION ok=false reason=${error.message}`);
    process.exit(1);
  }
}
