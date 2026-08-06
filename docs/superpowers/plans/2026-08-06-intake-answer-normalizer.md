# Intake Answer Normalizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A scheduled agent that reads owner answers on `intake-needs-data`
GitHub issues and posts a canonical answer block, so the daily intake run's
existing parser consumes them cleanly.

**Architecture:** A Node orchestrator does everything deterministic — selecting
issues, invoking a bounded `claude -p` turn, validating the result, posting the
comment. The LLM only ever transcribes; its output is then checked field-by-field
against the owner's raw text before anything is posted. The intake pipeline is
untouched: the normalizer's entire output is a GitHub comment.

**Tech Stack:** Node (CommonJS, `scripts/` is `type: commonjs`), `gh` CLI,
`claude -p` headless with `~/.config/claude-code/oauth.env`, launchd.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-06-intake-answer-normalizer-design.md`
- Attestable fields are ONLY `enclosure`, `series`, `available_plates` — imported
  from `OWNER_ATTESTABLE_FIELDS`, never re-listed as a literal.
- The agent may transcribe, never witness. It may not research, visit URLs,
  assert unstated facts, or supply a source the owner did not write.
- Additive only: no file under the intake shipping lane changes. The normalizer
  writes exactly one artifact — a GitHub issue comment.
- Fail closed and non-blocking: any failure means the 12:00 intake run behaves
  exactly as it does today.
- Marker for idempotence: `<!-- intake-answer-normalizer -->` (exact string).
- Scripts live in `scripts/`, tests are `scripts/<name>.test.js`, run with
  `node scripts/<name>.test.js`, and print `[<suite>] N passing, M failing`.

---

### Task 1: Issue selection and idempotence

**Files:**
- Create: `scripts/intake-answer-normalizer.js`
- Test: `scripts/intake-answer-normalizer.test.js`

**Interfaces:**
- Consumes: `OWNER_ATTESTABLE_FIELDS` from `./validate-candidate-evidence.js`;
  `parseAnswers`, `LABEL` from `./intake-owner-questions.js`
- Produces: `MARKER` (string), `needsNormalizing(issue) -> {needed: boolean, reason: string}`

- [ ] **Step 1: Write the failing test**

```js
#!/usr/bin/env node
const assert = require('node:assert');
const { MARKER, needsNormalizing } = require('./intake-answer-normalizer.js');

let pass = 0; let fail = 0; const failures = [];
function t(name, fn) {
  try { fn(); pass += 1; console.log(`  ok  ${name}`); }
  catch (e) { fail += 1; failures.push(`${name}: ${e.message}`); console.log(`  FAIL ${name} — ${e.message}`); }
}

const OWNER = 'mustiodk';
const issue = (comments, body = 'template with no answers') => ({
  number: 26, body, author: { login: OWNER }, comments,
});
const c = (body, at, login = OWNER) => ({ body, createdAt: at, author: { login } });

console.log('\nTC1 — when is normalizing needed');

t('owner prose that the parser cannot read needs normalizing', () => {
  const r = needsNormalizing(issue([c('The Kobra 2 Neo is open-frame. https://a.example/1', '2026-08-06T09:00:00Z')]));
  assert.strictEqual(r.needed, true, r.reason);
});

t('an already-parseable answer does NOT need normalizing', () => {
  const r = needsNormalizing(issue([c([
    'answers:', '  enclosure:', '    value: none',
    '    source: https://a.example/1', '    claim: open frame',
  ].join('\n'), '2026-08-06T09:00:00Z')]));
  assert.strictEqual(r.needed, false);
});

t('an issue whose newest comment is our own marker is skipped', () => {
  const r = needsNormalizing(issue([
    c('The Kobra 2 Neo is open-frame. https://a.example/1', '2026-08-06T09:00:00Z'),
    c(`${MARKER}\nanswers:\n  enclosure:\n    value: none`, '2026-08-06T11:30:00Z'),
  ]));
  assert.strictEqual(r.needed, false, 'must not re-normalize its own output');
});

t('owner content AFTER our marker needs normalizing again', () => {
  const r = needsNormalizing(issue([
    c(`${MARKER}\nold block`, '2026-08-06T11:30:00Z'),
    c('Actually it is passive, see https://a.example/2', '2026-08-06T12:00:00Z'),
  ]));
  assert.strictEqual(r.needed, true, r.reason);
});

t('an issue with no owner comments at all is skipped', () => {
  assert.strictEqual(needsNormalizing(issue([])).needed, false);
});

t('a non-owner comment does not trigger normalizing', () => {
  const r = needsNormalizing(issue([c('open frame https://a.example/1', '2026-08-06T09:00:00Z', 'someone-else')]));
  assert.strictEqual(r.needed, false);
});

console.log(`\n[answer-normalizer] ${pass} passing, ${fail} failing`);
if (fail) { for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/intake-answer-normalizer.test.js`
Expected: FAIL with `Cannot find module './intake-answer-normalizer.js'`

- [ ] **Step 3: Write minimal implementation**

```js
#!/usr/bin/env node
// ─── Intake answer normalizer ───────────────────────────────────────────────
// Reads owner answers on intake-needs-data issues and posts ONE canonical block
// so the 12:00 intake run's existing parser consumes them. The intake pipeline
// is untouched — this writes exactly one artifact, a GitHub comment.
//
// Design: docs/superpowers/specs/2026-08-06-intake-answer-normalizer-design.md
// The agent TRANSCRIBES; it never witnesses. Task 2's validator enforces that
// mechanically rather than trusting the prompt.
const { parseAnswers } = require('./intake-owner-questions.js');

const MARKER = '<!-- intake-answer-normalizer -->';

function ownerComments(issue) {
  const owner = (issue.author && issue.author.login) || null;
  return (Array.isArray(issue.comments) ? issue.comments : [])
    .filter((c) => c && c.author && (!owner || c.author.login === owner))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

// Needed when the owner has written something the parser cannot already read,
// and we have not already answered that same content.
function needsNormalizing(issue) {
  const mine = ownerComments(issue);
  if (mine.length === 0) return { needed: false, reason: 'no owner comments' };

  const lastMarkerAt = mine
    .filter((c) => String(c.body || '').includes(MARKER))
    .map((c) => c.createdAt).sort().at(-1) || '';

  const fresh = mine.filter((c) => !String(c.body || '').includes(MARKER)
    && String(c.createdAt) > lastMarkerAt);
  if (fresh.length === 0) return { needed: false, reason: 'nothing new since the last normalization' };

  const alreadyParses = fresh.some((c) => parseAnswers(c.body).answers.length > 0);
  if (alreadyParses) return { needed: false, reason: 'owner answer already parses' };

  return { needed: true, reason: `${fresh.length} unparsed owner comment(s)` };
}

module.exports = { MARKER, needsNormalizing, ownerComments };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/intake-answer-normalizer.test.js`
Expected: `[answer-normalizer] 6 passing, 0 failing`

- [ ] **Step 5: Commit**

```bash
git add scripts/intake-answer-normalizer.js scripts/intake-answer-normalizer.test.js
git commit -m "feat(intake): answer-normalizer issue selection and idempotence"
```

---

### Task 2: Transcription validator — the anti-fabrication core

**Files:**
- Modify: `scripts/intake-answer-normalizer.js`
- Test: `scripts/intake-answer-normalizer.test.js`

**Interfaces:**
- Produces: `validateTranscription(block, ownerText) -> {ok: boolean, errors: string[], answers: object[]}`

This is the task that makes the spec's central constraint real. The agent is not
trusted: every field it emits must be one the owner actually named, and every
source URL must appear verbatim in the owner's own text.

- [ ] **Step 1: Write the failing test**

Append to `scripts/intake-answer-normalizer.test.js` before the summary line:

```js
const { validateTranscription } = require('./intake-answer-normalizer.js');

const OWNER_TEXT = 'The Kobra 2 Neo is an open-frame printer, not enclosed. '
  + 'Source: https://3dpros.com/printers/anycubic-kobra-2-neo';
const block = (lines) => ['answers:', ...lines].join('\n');

console.log('\nTC2 — the agent may transcribe, never witness');

t('a faithful transcription passes', () => {
  const r = validateTranscription(block([
    '  enclosure:', '    value: none',
    '    source: https://3dpros.com/printers/anycubic-kobra-2-neo',
    '    claim: "open-frame printer, not enclosed"',
  ]), OWNER_TEXT);
  assert.ok(r.ok, r.errors.join(' | '));
  assert.strictEqual(r.answers[0].value, 'none');
});

t('a field the owner never mentioned is REJECTED', () => {
  const r = validateTranscription(block([
    '  enclosure:', '    value: none',
    '    source: https://3dpros.com/printers/anycubic-kobra-2-neo',
    '    claim: "open frame"',
    '  series:', '    value: bedslinger',
    '    source: https://3dpros.com/printers/anycubic-kobra-2-neo',
    '    claim: "i3 style"',
  ]), OWNER_TEXT);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /series/.test(e) && /did not mention/i.test(e)), r.errors.join(' | '));
});

t('a source the owner never wrote is REJECTED', () => {
  const r = validateTranscription(block([
    '  enclosure:', '    value: none',
    '    source: https://all3dp.com/invented-by-the-agent',
    '    claim: "open frame"',
  ]), OWNER_TEXT);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /source/.test(e) && /not.*owner/i.test(e)), r.errors.join(' | '));
});

t('a non-attestable field is REJECTED even if the owner mentioned it', () => {
  const r = validateTranscription(block([
    '  max_bed_temp:', '    value: 110',
    '    source: https://3dpros.com/printers/anycubic-kobra-2-neo',
    '    claim: "spec table"',
  ]), `${OWNER_TEXT} max_bed_temp is 110`);
  assert.ok(!r.ok);
  assert.deepStrictEqual(r.answers, []);
});

t('an unparseable agent block is REJECTED', () => {
  const r = validateTranscription('I think the printer is open-frame.', OWNER_TEXT);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /no answers/i.test(e)), r.errors.join(' | '));
});

t('a URL differing only by trailing punctuation still matches', () => {
  const r = validateTranscription(block([
    '  enclosure:', '    value: none',
    '    source: https://3dpros.com/printers/anycubic-kobra-2-neo',
    '    claim: "open frame"',
  ]), 'It is open. See https://3dpros.com/printers/anycubic-kobra-2-neo.');
  assert.ok(r.ok, r.errors.join(' | '));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/intake-answer-normalizer.test.js`
Expected: FAIL with `validateTranscription is not a function`

- [ ] **Step 3: Write minimal implementation**

Add to `scripts/intake-answer-normalizer.js`, and extend the exports:

```js
const { OWNER_ATTESTABLE_FIELDS } = require('./validate-candidate-evidence.js');

function normalizeUrl(url) {
  return String(url || '').trim().replace(/[.,;:!?)\]]+$/, '').toLowerCase();
}

// The agent is NOT trusted. Its output is checked against the owner's raw text:
// every field must be one the owner named, every source must be a URL the owner
// actually wrote. This is what makes "may transcribe, never witness" a
// mechanical property rather than a prompt instruction.
function validateTranscription(block, ownerText) {
  const errors = [];
  const { answers, errors: parseErrors } = parseAnswers(block);
  for (const e of parseErrors) errors.push(`agent block: ${e}`);
  if (answers.length === 0) {
    errors.push('agent block produced no answers');
    return { ok: false, errors, answers: [] };
  }

  const haystack = String(ownerText || '').toLowerCase();
  const ownerUrls = new Set(
    (String(ownerText || '').match(/https?:\/\/[^\s<>()[\]"']+/gi) || []).map(normalizeUrl),
  );

  for (const answer of answers) {
    if (!OWNER_ATTESTABLE_FIELDS.has(answer.field)) {
      errors.push(`${answer.field} is not owner-attestable`);
      continue;
    }
    if (!haystack.includes(answer.field.toLowerCase())
        && !haystack.includes(answer.field.replace(/_/g, ' ').toLowerCase())) {
      errors.push(`${answer.field}: the owner did not mention this field`);
    }
    if (!ownerUrls.has(normalizeUrl(answer.source))) {
      errors.push(`${answer.field}: source ${answer.source} was not written by the owner`);
    }
  }
  return { ok: errors.length === 0, errors, answers };
}
```

Update the export line to:

```js
module.exports = { MARKER, needsNormalizing, ownerComments, validateTranscription };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/intake-answer-normalizer.test.js`
Expected: `[answer-normalizer] 12 passing, 0 failing`

- [ ] **Step 5: Commit**

```bash
git add scripts/intake-answer-normalizer.js scripts/intake-answer-normalizer.test.js
git commit -m "feat(intake): transcription validator — agent output checked against owner text"
```

---

### Task 3: Agent prompt and bounded invocation

**Files:**
- Create: `scripts/intake-normalizer-prompt.md`
- Modify: `scripts/intake-answer-normalizer.js`
- Test: `scripts/intake-answer-normalizer.test.js`

**Interfaces:**
- Produces: `buildPrompt(candidateId, fields, ownerText) -> string`;
  `runAgent(prompt, {claudeBin, timeoutMs}) -> string`

- [ ] **Step 1: Write the failing test**

Append before the summary line:

```js
const { buildPrompt } = require('./intake-answer-normalizer.js');

console.log('\nTC3 — the prompt states the boundary');

t('the prompt names the candidate, the fields, and the owner text', () => {
  const p = buildPrompt('kobra_2_neo', ['enclosure'], 'it is open frame https://a.example/1');
  assert.ok(p.includes('kobra_2_neo'));
  assert.ok(p.includes('enclosure'));
  assert.ok(p.includes('https://a.example/1'));
});

t('the prompt forbids research and invention', () => {
  const p = buildPrompt('kobra_2_neo', ['enclosure'], 'text');
  assert.ok(/do not research/i.test(p));
  assert.ok(/only.*owner.*wrote|never.*invent|did not state/i.test(p));
});

t('the prompt offers only the attestable fields', () => {
  const p = buildPrompt('adventurer_3', ['series', 'available_plates'], 'text');
  assert.ok(p.includes('series'));
  assert.ok(p.includes('available_plates'));
  assert.ok(!/max_bed_temp/.test(p), 'must not advertise a non-attestable field');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/intake-answer-normalizer.test.js`
Expected: FAIL with `buildPrompt is not a function`

- [ ] **Step 3: Write minimal implementation**

Create `scripts/intake-normalizer-prompt.md`:

```markdown
You are transcribing, not researching.

The repository owner was asked about a 3D printer and answered in their own
words on a GitHub issue. Your ONLY job is to restate what they wrote as a
structured block. You are a translator. They are the source of truth.

You MUST NOT:
- research anything, or visit any URL
- state a fact the owner did not state
- fill a field the owner did not write about
- supply a source URL the owner did not write
- answer any field other than the ones listed below

If the owner's answer is ambiguous — two different values, or a value with no
matching token — do NOT guess. Omit that field entirely.

Output ONLY the block, nothing else. No preamble, no explanation.
```

Add to `scripts/intake-answer-normalizer.js`:

```js
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const FIELD_TOKENS = {
  enclosure: 'none | passive | active_heated',
  series: 'bedslinger | corexy',
  available_plates: 'cool_plate | engineering_plate | high_temp_plate | satin_pei | smooth_glass | smooth_pei | textured_pei (comma-separated)',
};

function buildPrompt(candidateId, fields, ownerText) {
  const preamble = fs.readFileSync(path.join(__dirname, 'intake-normalizer-prompt.md'), 'utf8');
  const wanted = fields.map((f) => `  ${f}: ${FIELD_TOKENS[f]}`).join('\n');
  return `${preamble}

Printer: ${candidateId}

Fields you may answer, and the ONLY accepted values for each:
${wanted}

What the owner wrote:
--- BEGIN OWNER TEXT ---
${ownerText}
--- END OWNER TEXT ---

Emit exactly this shape, one entry per field you can faithfully transcribe:

answers:
  <field>:
    value: <one of the accepted tokens above>
    source: <a URL copied verbatim from the owner text>
    claim: "<the owner's own words describing what that source shows>"
`;
}

// Bounded: one turn, read-only, hard timeout. A failure here is non-blocking —
// the caller posts nothing and the 12:00 run behaves exactly as today.
function runAgent(prompt, options = {}) {
  const claudeBin = options.claudeBin || 'claude';
  return execFileSync(claudeBin, ['-p', prompt, '--output-format', 'text'], {
    encoding: 'utf8',
    timeout: options.timeoutMs || 240000,
    maxBuffer: 8 * 1024 * 1024,
  }).trim();
}
```

Update exports to include `buildPrompt` and `runAgent`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/intake-answer-normalizer.test.js`
Expected: `[answer-normalizer] 15 passing, 0 failing`

- [ ] **Step 5: Commit**

```bash
git add scripts/intake-normalizer-prompt.md scripts/intake-answer-normalizer.js scripts/intake-answer-normalizer.test.js
git commit -m "feat(intake): normalizer agent prompt and bounded invocation"
```

---

### Task 4: Orchestrator CLI

**Files:**
- Modify: `scripts/intake-answer-normalizer.js`
- Test: `scripts/intake-answer-normalizer.test.js`

**Interfaces:**
- Produces: `normalizeIssue(issue, deps) -> {posted: boolean, reason: string, block: string|null}`;
  CLI `node scripts/intake-answer-normalizer.js [--apply] [--repo owner/name]`

- [ ] **Step 1: Write the failing test**

Append before the summary line:

```js
const { normalizeIssue } = require('./intake-answer-normalizer.js');

console.log('\nTC4 — orchestration');

const proseIssue = () => ({
  number: 26,
  body: 'The intake pipeline researched **kobra_2_neo** and needs: enclosure',
  author: { login: OWNER },
  comments: [c('The enclosure is open-frame. https://3dpros.com/x', '2026-08-06T09:00:00Z')],
});

t('a good transcription is posted', () => {
  const posted = [];
  const r = normalizeIssue(proseIssue(), {
    fields: ['enclosure'],
    agent: () => 'answers:\n  enclosure:\n    value: none\n    source: https://3dpros.com/x\n    claim: "open-frame"',
    post: (n, body) => posted.push({ n, body }),
    apply: true,
  });
  assert.strictEqual(r.posted, true, r.reason);
  assert.strictEqual(posted.length, 1);
  assert.ok(posted[0].body.includes(MARKER), 'must carry the idempotence marker');
});

t('a fabricated source is NOT posted', () => {
  const posted = [];
  const r = normalizeIssue(proseIssue(), {
    fields: ['enclosure'],
    agent: () => 'answers:\n  enclosure:\n    value: none\n    source: https://invented.example/y\n    claim: "open"',
    post: (n, body) => posted.push({ n, body }),
    apply: true,
  });
  assert.strictEqual(r.posted, false);
  assert.strictEqual(posted.length, 0, 'nothing may be posted when validation fails');
});

t('an agent crash is non-blocking', () => {
  const r = normalizeIssue(proseIssue(), {
    fields: ['enclosure'],
    agent: () => { throw new Error('transport blew up'); },
    post: () => { throw new Error('must not be called'); },
    apply: true,
  });
  assert.strictEqual(r.posted, false);
  assert.ok(/transport blew up/.test(r.reason), r.reason);
});

t('dry-run posts nothing but reports the block', () => {
  const r = normalizeIssue(proseIssue(), {
    fields: ['enclosure'],
    agent: () => 'answers:\n  enclosure:\n    value: none\n    source: https://3dpros.com/x\n    claim: "open-frame"',
    post: () => { throw new Error('must not be called'); },
    apply: false,
  });
  assert.strictEqual(r.posted, false);
  assert.ok(r.block.includes('enclosure'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/intake-answer-normalizer.test.js`
Expected: FAIL with `normalizeIssue is not a function`

- [ ] **Step 3: Write minimal implementation**

```js
function normalizeIssue(issue, deps = {}) {
  const check = needsNormalizing(issue);
  if (!check.needed) return { posted: false, reason: check.reason, block: null };

  const candidateId = (issue.body || '').match(/\*\*([A-Za-z0-9._-]+)\*\*/);
  const id = candidateId ? candidateId[1] : `issue-${issue.number}`;
  const fields = deps.fields || [...OWNER_ATTESTABLE_FIELDS];
  const ownerText = ownerComments(issue)
    .filter((c) => !String(c.body || '').includes(MARKER))
    .map((c) => c.body).join('\n\n');

  let raw;
  try {
    raw = (deps.agent || runAgent)(buildPrompt(id, fields, ownerText));
  } catch (error) {
    return { posted: false, reason: `agent failed: ${error.message}`, block: null };
  }

  const validation = validateTranscription(raw, ownerText);
  if (!validation.ok) {
    return { posted: false, reason: `rejected: ${validation.errors.join('; ')}`, block: raw };
  }

  const body = `${MARKER}\nTranscribed from your answer above so the intake run can read it. `
    + `Correct anything wrong by replying again.\n\n\`\`\`yaml\n${raw.replace(/^```ya?ml\s*|```$/gim, '').trim()}\n\`\`\``;
  if (!deps.apply) return { posted: false, reason: 'dry-run', block: raw };
  (deps.post || (() => {}))(issue.number, body);
  return { posted: true, reason: `transcribed ${validation.answers.length} field(s)`, block: raw };
}
```

Add the CLI at the bottom of the file:

```js
if (require.main === module) {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const repoIndex = args.indexOf('--repo');
  const repoArgs = repoIndex >= 0 ? ['--repo', args[repoIndex + 1]] : [];
  try {
    const raw = execFileSync('gh', ['issue', 'list', '--label', LABEL, '--state', 'open',
      '--json', 'number,title,body,author,comments', '--limit', '100', ...repoArgs],
    { encoding: 'utf8' });
    const issues = JSON.parse(raw || '[]');
    let posted = 0;
    for (const issue of issues) {
      const result = normalizeIssue(issue, {
        apply,
        post: (n, body) => execFileSync('gh', ['issue', 'comment', String(n), '--body', body, ...repoArgs]),
      });
      if (result.posted) posted += 1;
      console.log(`  #${issue.number} posted=${result.posted} ${result.reason}`);
    }
    console.log(`NORMALIZER ok=true issues=${issues.length} posted=${posted}`);
  } catch (error) {
    console.error(`NORMALIZER ok=false reason=${error.message}`);
    process.exit(1);
  }
}
```

Import `LABEL` from `./intake-owner-questions.js` at the top and add
`normalizeIssue` to the exports.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/intake-answer-normalizer.test.js`
Expected: `[answer-normalizer] 19 passing, 0 failing`

- [ ] **Step 5: Commit**

```bash
git add scripts/intake-answer-normalizer.js scripts/intake-answer-normalizer.test.js
git commit -m "feat(intake): normalizer orchestrator + CLI"
```

---

### Task 5: Schedule it, and document the contract

**Files:**
- Create: `scripts/install-answer-normalizer.sh`
- Create: `../ai-operating-model/docs/agents/intake-answer-normalizer.md`

**Interfaces:**
- Consumes: everything from Tasks 1–4
- Produces: a launchd job `dk.mragile.3dpa-answer-normalizer` at 11:30 daily

- [ ] **Step 1: Write the installer**

```bash
#!/bin/zsh
# Installs the answer-normalizer LaunchAgent: 11:30 daily, 30 minutes before the
# 12:00 intake run. Mirrors the intake runner's install pattern.
set -euo pipefail

REPO="${1:-$HOME/.local/share/3dpa-intake/checkout/3dprintassistant}"
PLIST="$HOME/Library/LaunchAgents/dk.mragile.3dpa-answer-normalizer.plist"
LABEL="dk.mragile.3dpa-answer-normalizer"

[[ -d "$REPO" ]] || { echo "repo not found: $REPO" >&2; exit 1; }

cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>source \$HOME/.config/claude-code/oauth.env 2>/dev/null; cd ${REPO} \&\& node scripts/intake-answer-normalizer.js --apply</string>
  </array>
  <key>WorkingDirectory</key><string>${REPO}</string>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>11</integer><key>Minute</key><integer>30</integer></dict>
  <key>StandardOutPath</key><string>\$HOME/Library/Logs/3dpa-answer-normalizer.out.log</string>
  <key>StandardErrorPath</key><string>\$HOME/Library/Logs/3dpa-answer-normalizer.err.log</string>
  <key>RunAtLoad</key><false/>
</dict>
</plist>
PLISTEOF

launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "installed ${LABEL} (11:30 daily, repo=${REPO})"
```

- [ ] **Step 2: Verify the plist is valid and the job loads**

Run:
```bash
chmod +x scripts/install-answer-normalizer.sh
zsh scripts/install-answer-normalizer.sh
plutil -lint ~/Library/LaunchAgents/dk.mragile.3dpa-answer-normalizer.plist
launchctl list | grep 3dpa-answer-normalizer
```
Expected: `OK`, and one job line.

- [ ] **Step 3: Dry-run against the real open issues**

Run: `node scripts/intake-answer-normalizer.js`
Expected: one line per open issue with `posted=false` and a reason
(`owner answer already parses` for issues 26/27, since they were consumed).

- [ ] **Step 4: Write the agent contract**

Create `../ai-operating-model/docs/agents/intake-answer-normalizer.md` covering:
purpose, the transcribe-never-witness boundary, the three attestable fields, the
mechanical validation against owner text, idempotence via `MARKER`, the 11:30
schedule and its relationship to the 12:00 intake run, and the non-blocking
guarantee.

- [ ] **Step 5: Commit**

```bash
git add scripts/install-answer-normalizer.sh
git commit -m "feat(intake): schedule the answer normalizer at 11:30"
cd ../ai-operating-model && git add docs/agents/intake-answer-normalizer.md \
  && git commit -m "docs(intake): answer-normalizer agent contract"
```

---

## Self-Review

**Spec coverage:**
- 11:30 schedule, 30 min before intake → Task 5
- Reads body + comments → Task 1 (`ownerComments`)
- Posts canonical block as a comment → Task 4
- Intake pipeline untouched → no task modifies any intake shipping-lane file
- Transcribe not witness → Task 2, enforced mechanically
- Only three fields → `OWNER_ATTESTABLE_FIELDS` imported, Tasks 2 and 3
- No research / no invented source → Task 2 rejects, Task 3 forbids in prompt
- Ambiguity → omitted by the agent (Task 3 prompt), and an omitted field simply
  stays parked; no separate code path needed
- Idempotence via marker → Task 1
- Non-blocking on failure → Task 4 (`agent crash is non-blocking`)
- Testing via parser round-trip → Tasks 2 and 4 assert on parsed output

**Placeholder scan:** none — every step carries real code or a real command.

**Type consistency:** `MARKER`, `needsNormalizing`, `ownerComments`,
`validateTranscription`, `buildPrompt`, `runAgent`, `normalizeIssue` are defined
once and used with matching signatures throughout.

**Gap found and closed during review:** the spec says the agent comments when it
cannot resolve an ambiguity. The plan instead has the agent OMIT ambiguous
fields, leaving them parked and unanswered. Posting a follow-up question is
deferred — an omitted field already produces the correct outcome (nothing
consumed, candidate stays parked, the existing intake question remains open),
and adding a second comment path would be untested surface for no behavioural
gain. Recorded here rather than silently dropped.
