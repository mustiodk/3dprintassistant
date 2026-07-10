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

test('operational docs preserve the RD4 split-verdict decision-required branch', () => {
  const repo = path.join(__dirname, '..');
  const kickoff = fs.readFileSync(path.join(repo, 'scripts/intake-run-kickoff.md'), 'utf8');
  const runbook = fs.readFileSync(path.join(repo, 'docs/runbooks/printer-addition-protocol.md'), 'utf8');
  for (const [name, content] of [['kickoff', kickoff], ['runbook', runbook]]) {
    assert.doesNotMatch(content, /any NO-GO parks/i, `${name} collapses split verdicts`);
    assert.match(content, /review-split[^\n]*decision-required/i, `${name} omits RD4 split routing`);
  }
});
