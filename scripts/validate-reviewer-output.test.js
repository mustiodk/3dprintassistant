const test = require('node:test');
const assert = require('node:assert/strict');
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

test('objections must be an array', () => {
  const result = validateReviewerOutput({ reviewer: 'codex', verdict: 'NO-GO', objections: {} });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /array/);
});
