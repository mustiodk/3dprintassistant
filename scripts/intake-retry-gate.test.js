const test = require('node:test');
const assert = require('node:assert/strict');

const { canRetryJudgment } = require('./intake-retry-gate.js');

function sidecar() {
  return {
    class: 'judgment-on-evidence',
    diffSha: 'old',
    evidence: [{ canonicalSource: 'creality.com/products/k2-se' }],
    objections: [{
      field: 'max_speed',
      question: 'source 500',
      raisedAt: '2026-07-10T00:00:00Z',
    }],
  };
}

function resolution(overrides = {}) {
  return {
    source: 'https://support.creality.com/k2-se-specs',
    excerpt: 'Maximum speed 500 mm/s',
    claim: 'max_speed=500',
    resolvedAt: '2026-07-10T12:00:00Z',
    ...overrides,
  };
}

function retry(overrides = {}) {
  return {
    diffSha: 'new',
    objections: [{
      field: 'max_speed',
      question: 'source 500',
      raisedAt: '2026-07-10T00:00:00Z',
      resolvedBy: resolution(),
    }],
    ...overrides,
  };
}

test('bare URL does not satisfy objection', () => {
  const r = canRetryJudgment(sidecar(), retry({
    objections: [{ resolvedBy: {
      source: 'https://creality.com/products/k2-se',
      resolvedAt: '2026-07-10T12:00:00Z',
    } }],
  }));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'review-no-go-unresolved');
  assert.equal(r.reviewRequests, 0);
});

test('same canonical source with query param is not novel', () => {
  const r = canRetryJudgment(sidecar(), retry({
    objections: [{ resolvedBy: resolution({
      source: 'https://www.creality.com/products/k2-se?utm_source=x',
    }) }],
  }));
  assert.equal(r.ok, false);
  assert.equal(r.reviewRequests, 0);
});

test('new source with excerpt claim and resolvedAt passes structural gate', () => {
  const r = canRetryJudgment(sidecar(), retry());
  assert.deepEqual(r, { ok: true, reason: null, errors: [], reviewRequests: 1 });
});

test('unchanged diffSha refuses retry before any review turn', () => {
  const r = canRetryJudgment(sidecar(), retry({ diffSha: 'old' }));
  assert.equal(r.ok, false);
  assert.equal(r.reviewRequests, 0);
});

test('every recorded objection requires its own resolution', () => {
  const parked = sidecar();
  parked.objections.push({ field: 'multi_color_systems', question: 'source CFS' });

  const r = canRetryJudgment(parked, retry());
  assert.equal(r.ok, false);
  assert.match(r.errors.join('\n'), /objection 1.*resolvedBy/i);
  assert.equal(r.reviewRequests, 0);
});

test('reordered objections cannot attach evidence to the wrong question', () => {
  const parked = sidecar();
  parked.objections.push({
    field: 'multi_color_systems',
    question: 'source CFS',
    raisedAt: '2026-07-10T00:05:00Z',
  });
  const r = canRetryJudgment(parked, retry({
    objections: [
      {
        ...parked.objections[1],
        resolvedBy: resolution({
          source: 'https://support.creality.com/cfs',
          excerpt: 'Supports CFS',
          claim: 'multi_color_systems=["cfs"]',
        }),
      },
      { ...parked.objections[0], resolvedBy: resolution() },
    ],
  }));

  assert.equal(r.ok, false);
  assert.match(r.errors.join('\n'), /identity|order/i);
  assert.equal(r.reviewRequests, 0);
});

test('extra regenerated objections fail closed', () => {
  const r = canRetryJudgment(sidecar(), retry({
    objections: [
      {
        field: 'taxonomy',
        question: 'unrelated',
        raisedAt: '2026-07-10T00:10:00Z',
        resolvedBy: resolution({ source: 'https://support.creality.com/unrelated' }),
      },
      retry().objections[0],
    ],
  }));

  assert.equal(r.ok, false);
  assert.match(r.errors.join('\n'), /count/i);
  assert.equal(r.reviewRequests, 0);
});

for (const [field, value] of [
  ['source', ''],
  ['excerpt', ''],
  ['claim', ''],
  ['resolvedAt', ''],
]) {
  test(`resolvedBy requires non-empty ${field}`, () => {
    const r = canRetryJudgment(sidecar(), retry({
      objections: [{ resolvedBy: resolution({ [field]: value }) }],
    }));
    assert.equal(r.ok, false);
    assert.equal(r.reviewRequests, 0);
  });
}

for (const invalidTimestamp of ['not-a-timestamp', '2026-02-30T12:00:00Z']) {
  test(`resolvedAt rejects invalid timestamp ${invalidTimestamp}`, () => {
    const parked = sidecar();
    const r = canRetryJudgment(parked, retry({
      objections: [{
        ...parked.objections[0],
        resolvedBy: resolution({ resolvedAt: invalidTimestamp }),
      }],
    }));

    assert.equal(r.ok, false);
    assert.match(r.errors.join('\n'), /resolvedAt.*ISO-8601/i);
    assert.equal(r.reviewRequests, 0);
  });
}

test('invalid source fails closed without throwing', () => {
  const r = canRetryJudgment(sidecar(), retry({
    objections: [{ resolvedBy: resolution({ source: 'not a URL' }) }],
  }));
  assert.equal(r.ok, false);
  assert.match(r.errors.join('\n'), /source/i);
  assert.equal(r.reviewRequests, 0);
});

test('non-judgment parks cannot enter the judgment retry gate', () => {
  const parked = sidecar();
  parked.class = 'decision-required';
  const r = canRetryJudgment(parked, retry());
  assert.equal(r.ok, false);
  assert.equal(r.reviewRequests, 0);
});

test('malformed inputs fail closed without throwing or review turns', () => {
  for (const [parked, regenerated] of [[null, null], [{}, {}]]) {
    const r = canRetryJudgment(parked, regenerated);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'review-no-go-unresolved');
    assert.equal(r.reviewRequests, 0);
  }
});
