const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { validateReviewerOutput } = require('./validate-reviewer-output.js');

const OBJECTION = {
  field: 'max_speed',
  question: 'Source the 500 mm/s cap.',
  raisedAt: '2026-07-10T00:00:00Z',
};

test('null output fails without throwing', () => {
  const result = validateReviewerOutput(null);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /object/i);
});

test('NO-GO requires at least one structured objection', () => {
  const result = validateReviewerOutput({ reviewer: 'hostile', verdict: 'NO-GO', objections: [] });
  assert.equal(result.ok, false);
});

test('GO requires no objections', () => {
  const result = validateReviewerOutput({ reviewer: 'hostile', verdict: 'GO', objections: [] });
  assert.equal(result.ok, true);
});

test('structured NO-GO passes', () => {
  const result = validateReviewerOutput({
    reviewer: 'codex',
    verdict: 'NO-GO',
    objections: [OBJECTION],
  });
  assert.equal(result.ok, true);
});

test('GO with objections fails', () => {
  const result = validateReviewerOutput({
    reviewer: 'codex',
    verdict: 'GO',
    objections: [OBJECTION],
  });
  assert.equal(result.ok, false);
});

test('malformed objection fails without throwing', () => {
  const result = validateReviewerOutput({
    reviewer: 'codex',
    verdict: 'NO-GO',
    objections: [null],
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /objections\[0\]/);
});

test('raisedAt must use explicit ISO-8601 syntax', () => {
  const result = validateReviewerOutput({
    reviewer: 'codex',
    verdict: 'NO-GO',
    objections: [{ ...OBJECTION, raisedAt: 'July 10 2026' }],
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /ISO-8601/);
});

test('raisedAt rejects impossible ISO-looking calendar dates', () => {
  const result = validateReviewerOutput({
    reviewer: 'codex',
    verdict: 'NO-GO',
    objections: [{ ...OBJECTION, raisedAt: '2026-02-30T00:00:00Z' }],
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /ISO-8601/);
});

test('reviewer id must be a stable non-whitespace token', () => {
  const result = validateReviewerOutput({ reviewer: '   ', verdict: 'GO', objections: [] });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /reviewer/);
});

test('reviewer id must use canonical lowercase spelling', () => {
  const result = validateReviewerOutput({ reviewer: 'Codex', verdict: 'GO', objections: [] });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /reviewer/);
});

test('objections must be an array', () => {
  const result = validateReviewerOutput({ reviewer: 'codex', verdict: 'NO-GO', objections: {} });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /array/);
});

test('kickoff routes reviewer 2 through its boundary, under ignored runner state', () => {
  const repo = path.join(__dirname, '..');
  const kickoff = fs.readFileSync(path.join(repo, 'scripts/intake-run-kickoff.md'), 'utf8');
  const expectedCommand =
    'zsh scripts/intake-r2-review.sh \\\n' +
    '  --prompt-file "$fresh_r2_prompt" \\\n' +
    '  --out-dir scripts/.intake-runner-state/bridge-reviews \\\n' +
    '  --label "$r2_label"';

  assert.ok(
    kickoff.includes(expectedCommand),
    `kickoff must contain the exact R2 boundary command:\n${expectedCommand}`,
  );
  assert.doesNotMatch(kickoff, /--out-dir \/Users\/[^\s]+\/3dprintassistant\/scripts\/\.intake-runner-state\/bridge-reviews/);
});

// 2026-08-07 kobra_2_neo: the runner hand-wrote the R2 prompt, omitted the
// structured-output instruction, and Codex answered in prose — an unreadable
// verdict and a day parked. The instruction now lives in the boundary, so the
// kickoff must not reintroduce a direct bridge review call for the runner to
// compose a prompt into. `bridge --health` stays allowed.
test('kickoff leaves no direct bridge review invocation for reviewer 2', () => {
  const repo = path.join(__dirname, '..');
  const kickoff = fs.readFileSync(path.join(repo, 'scripts/intake-run-kickoff.md'), 'utf8');
  assert.doesNotMatch(
    kickoff,
    /^\s*bridge\s+--mode\s+codex-only/m,
    'kickoff must invoke reviewer 2 only through intake-r2-review.sh',
  );
  assert.ok(kickoff.includes('bridge --health'), 'kickoff still permits the health preflight');
});

// v3.1 (2026-08-07): the direct `codex exec` fallback is DELETED from the
// autonomous run. It required the runner to carry R2's output contract by hand
// — the exact defect that parked kobra_2_neo — and it had never been exercised
// in 34 ledgered outcomes. A boundary failure parks `review-unavailable` and
// the next run retries. This test is the inverse of the one it replaces.
test('kickoff offers no hand-composed reviewer fallback', () => {
  const repo = path.join(__dirname, '..');
  const kickoff = fs.readFileSync(path.join(repo, 'scripts/intake-run-kickoff.md'), 'utf8');
  // Match the PERMISSION, not the token: the no-fallback rule itself has to
  // name `codex exec` in order to forbid it. RED-demoed 2026-08-07 by pasting
  // the deleted sentence back in — this assertion fires on it.
  assert.doesNotMatch(
    kickoff,
    /(the |a )?(direct )?fallback is[^\n]*codex exec/i,
    'kickoff must not offer a hand-run codex fallback for reviewer 2',
  );
  assert.match(
    kickoff,
    /There is no fallback \(v3\.1\)/,
    'kickoff must state the no-fallback rule explicitly',
  );
});

test('operational docs preserve the RD4 split-verdict decision-required branch', () => {
  const repo = path.join(__dirname, '..');
  const kickoff = fs.readFileSync(path.join(repo, 'scripts/intake-run-kickoff.md'), 'utf8');
  const runbook = fs.readFileSync(path.join(repo, 'docs/runbooks/printer-addition-protocol.md'), 'utf8');
  for (const [name, content] of [['kickoff', kickoff], ['runbook', runbook]]) {
    assert.doesNotMatch(content, /any NO-GO parks/i, `${name} collapses split verdicts`);
    assert.match(content, /review-split[^\n]*decision-required/i, `${name} omits RD4 split routing`);
  }
});
