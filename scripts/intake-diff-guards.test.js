#!/usr/bin/env node
// Tests for intake-diff-guards.js (Intake Autonomy v2, Gate B4).
// Pure-function tests over synthetic diffs/sources — no git repo mutation.
// Run: node --test scripts/intake-diff-guards.test.js

const test = require('node:test');
const assert = require('node:assert');

const { checkWalkthroughGuard, checkPrintersSpliceGuard, combosRange } = require('./intake-diff-guards.js');

function harness({ before = 5, combos = 10, after = 5 } = {}) {
  const lines = [];
  for (let i = 0; i < before; i += 1) lines.push(`// pre ${i}`);
  lines.push('const COMBOS = [');
  for (let i = 0; i < combos; i += 1) lines.push(`  { id: ${i + 1}, label: 'combo ${i + 1}' },`);
  lines.push('];');
  for (let i = 0; i < after; i += 1) lines.push(`// post ${i}`);
  return lines.join('\n');
}

function diffWithHunk(from, count) {
  return `diff --git a/scripts/walkthrough-harness.js b/scripts/walkthrough-harness.js\n@@ -1,0 +${from},${count} @@ const COMBOS = [\n`;
}

test('combosRange finds the block (1-indexed inclusive)', () => {
  const src = harness({ before: 5, combos: 10 });
  const r = combosRange(src);
  assert.strictEqual(r.start, 6);
  assert.strictEqual(r.end, 17);
});

test('walkthrough guard: hunk inside COMBOS passes', () => {
  const src = harness();
  const r = checkWalkthroughGuard({ diffText: diffWithHunk(10, 3), harnessSource: src, base: 'x' });
  assert.strictEqual(r.ok, true);
});

test('walkthrough guard: hunk BEFORE the block fails (the mutates-outside test the plan demanded)', () => {
  const src = harness();
  const r = checkWalkthroughGuard({ diffText: diffWithHunk(2, 1), harnessSource: src, base: 'x' });
  assert.strictEqual(r.ok, false);
  assert.match(r.detail, /outside COMBOS/);
});

test('walkthrough guard: hunk straddling the closing bracket fails', () => {
  const src = harness();
  const range = combosRange(src);
  const r = checkWalkthroughGuard({ diffText: diffWithHunk(range.end, 2), harnessSource: src, base: 'x' });
  assert.strictEqual(r.ok, false);
});

test('walkthrough guard: untouched file passes vacuously-but-honestly', () => {
  const r = checkWalkthroughGuard({ diffText: '', harnessSource: harness(), base: 'x' });
  assert.strictEqual(r.ok, true);
  assert.match(r.detail, /untouched/);
});

test('printers-splice guard: +21/-0 passes', () => {
  const r = checkPrintersSpliceGuard({ numstat: '21\t0\tdata/printers.json\n', base: 'x' });
  assert.strictEqual(r.ok, true);
});

test('printers-splice guard: any deletion fails (reserialize signature)', () => {
  const r = checkPrintersSpliceGuard({ numstat: '1060\t254\tdata/printers.json\n', base: 'x' });
  assert.strictEqual(r.ok, false);
  assert.match(r.detail, /reserialize|splice/);
});

test('printers-splice guard: additions above the bound fail', () => {
  const r = checkPrintersSpliceGuard({ numstat: '200\t0\tdata/printers.json\n', base: 'x' });
  assert.strictEqual(r.ok, false);
});

test('printers-splice guard: binary numstat ("-") fails loudly', () => {
  const r = checkPrintersSpliceGuard({ numstat: '-\t-\tdata/printers.json\n', base: 'x' });
  assert.strictEqual(r.ok, false);
  assert.match(r.detail, /binary|unparseable/);
});

test('printers-splice guard: untouched passes', () => {
  const r = checkPrintersSpliceGuard({ numstat: '', base: 'x' });
  assert.strictEqual(r.ok, true);
});
