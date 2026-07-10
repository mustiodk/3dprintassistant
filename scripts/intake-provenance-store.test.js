const test = require('node:test');
const assert = require('node:assert/strict');

const { upsertPrinterProvenance } = require('./intake-provenance-store.js');

function provenance(overrides = {}) {
  return {
    max_speed: {
      value: 500,
      source: 'https://creality.com/products/k2-se',
      canonicalSource: 'creality.com/products/k2-se',
      confidence: 'confirmed',
      evidenceType: 'manufacturer',
      gatheredAt: '2026-07-10T00:00:00Z',
    },
    ...overrides,
  };
}

test('upsert is idempotent by printer id', () => {
  const doc = { schema: 'printer-provenance@1', printers: {} };
  const p = provenance();

  const once = upsertPrinterProvenance(doc, 'k2_se', p);
  const twice = upsertPrinterProvenance(once, 'k2_se', p);

  assert.deepEqual(twice, once);
});

test('upsert preserves other printers and does not mutate the input document', () => {
  const doc = {
    schema: 'printer-provenance@1',
    printers: {
      aries: provenance({ series: { value: 'i Series' } }),
    },
  };
  const before = JSON.parse(JSON.stringify(doc));

  const next = upsertPrinterProvenance(doc, 'k2_se', provenance());

  assert.deepEqual(doc, before);
  assert.deepEqual(next.printers.aries, before.printers.aries);
  assert.deepEqual(next.printers.k2_se, provenance());
});
