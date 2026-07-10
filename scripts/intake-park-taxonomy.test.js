const test = require('node:test');
const assert = require('node:assert/strict');
const {
  loadTaxonomy,
  classifyParkReason,
  validateTaxonomyGraph,
} = require('./intake-park-taxonomy.js');

test('review-no-go is judgment-on-evidence and never timer-triggered', () => {
  const t = loadTaxonomy();
  const c = classifyParkReason('review-no-go', { tainted: true }, t);
  assert.equal(c.className, 'judgment-on-evidence');
  assert.equal(c.trigger, 'event');
  assert.equal(c.reviewEntry, false);
});

test('tainted candidates are redirected away from automatic review classes', () => {
  const t = loadTaxonomy();
  const c = classifyParkReason('research-defect', { tainted: true }, t);
  assert.equal(c.className, 'decision-required');
  assert.equal(c.trigger, 'owner');
  assert.equal(c.reviewEntry, false);
});

test('unknown reasons fail closed to decision-required', () => {
  const t = loadTaxonomy();
  const c = classifyParkReason('future-surprise', { tainted: false }, t);
  assert.equal(c.className, 'decision-required');
  assert.equal(c.trigger, 'owner');
});

test('NO-GO taint has no automatic path to a review turn', () => {
  const t = loadTaxonomy();
  const result = validateTaxonomyGraph(t);
  assert.deepEqual(result.violations, []);
  assert.equal(result.ok, true);
});

test('graph validation rejects a tainted class with automatic review entry', () => {
  const t = structuredClone(loadTaxonomy());
  t.classes['research-defect'].taintedAllowed = true;
  const result = validateTaxonomyGraph(t);
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /research-defect.*automatic review entry/i);
});

test('graph validation rejects unsanctioned tainted review edges', () => {
  const t = structuredClone(loadTaxonomy());
  t.sanctionedTaintedReviewEdges.push('weekly-retry');
  const result = validateTaxonomyGraph(t);
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /weekly-retry.*not sanctioned/i);
});

test('future needs-source-resolution:conflicting is not active yet', () => {
  const t = loadTaxonomy();
  const c = classifyParkReason('needs-source-resolution:conflicting', { tainted: false }, t);
  assert.equal(c.className, 'decision-required');
});
