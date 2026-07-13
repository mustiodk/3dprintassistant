#!/usr/bin/env node
// Tests for republish-overlay.js (Intake Autonomy v2, Gate B1).
// Fixture-copied overlay/baselines/printers files ONLY — never the live repo
// overlay (plan B1.1). Run: node --test scripts/republish-overlay.test.js

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const SCRIPT = path.join(__dirname, 'republish-overlay.js');
const {
  nextVersion,
  rollbackVersion,
  addPrinter,
  bumpVersion,
  rollbackTo,
  setEnabled,
  writeSnapshot,
} = require('./republish-overlay.js');
const { validateOverlay, stableStringify, sha256 } = require('./validate-ios-printer-overlay.js');

// UTC date base, same derivation the module uses.
function todayBase() {
  const d = new Date();
  return d.getUTCFullYear() * 10_000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}
const TODAY01 = todayBase() * 100 + 1;

const SYNTH_PRINTER = {
  id: 'b1_test_printer',
  name: 'B1 Test Printer',
  manufacturer: 'bambu_lab',
  series: 'corexy',
  series_group: 'Test Series',
  enclosure: 'none',
  extruder_type: 'direct_drive',
  max_nozzle_temp: 300,
  max_bed_temp: 100,
  max_speed: 500,
  max_acceleration: 10_000,
  available_nozzle_sizes: [0.4],
};

const SYNTH_BRAND = {
  id: 'b1_test_brand',
  name: 'B1 Test Brand',
  sort_order: 9_999,
  primary: false,
  default_slicer: 'orcaslicer',
};

const SYNTH_BRAND_PRINTER = {
  ...SYNTH_PRINTER,
  id: 'b1_test_brand_printer',
  name: 'B1 Test Brand Printer',
  manufacturer: 'b1_test_brand',
};

// Build an isolated fixture root: real overlay + baselines copied, synthetic
// printers.json rows appended, synthetic project.yml.
function makeFixture({ contentVersion } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'republish-b1-'));
  const overlayPath = path.join(dir, 'overlay.json');
  const baselinesPath = path.join(dir, 'baselines.json');
  const printersPath = path.join(dir, 'printers.json');
  const projectPath = path.join(dir, 'project.yml');

  const overlay = JSON.parse(fs.readFileSync(path.join(repoRoot, 'catalog', 'ios-printer-overlay-v1.json'), 'utf8'));
  if (contentVersion !== undefined) overlay.content_version = contentVersion;
  fs.writeFileSync(overlayPath, `${JSON.stringify(overlay, null, 2)}\n`);

  fs.copyFileSync(path.join(repoRoot, 'catalog', 'ios-bundled-catalog-baselines.json'), baselinesPath);

  const printers = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data', 'printers.json'), 'utf8'));
  printers.printers.push(SYNTH_PRINTER, SYNTH_BRAND_PRINTER);
  printers.brands.push(SYNTH_BRAND);
  fs.writeFileSync(printersPath, `${JSON.stringify(printers, null, 2)}\n`);

  fs.writeFileSync(projectPath, 'settings:\n  base:\n    MARKETING_VERSION: "1.0.7"\n');

  const paths = { overlayPath, baselinesPath, printersPath, projectPath };
  return { dir, paths, readOverlay: () => JSON.parse(fs.readFileSync(overlayPath, 'utf8')) };
}

test('nextVersion: past-day current jumps to <today>01', () => {
  assert.strictEqual(nextVersion(2020010101), TODAY01);
});

test('nextVersion: current already on today advances the counter', () => {
  assert.strictEqual(nextVersion(TODAY01), TODAY01 + 1);
  assert.strictEqual(nextVersion(TODAY01 + 41), TODAY01 + 42);
});

test('nextVersion: counter-99 on today fails LOUD (CRITICAL)', () => {
  assert.throws(() => nextVersion(todayBase() * 100 + 99), /CRITICAL/);
});

test('nextVersion: 2099 cap fails LOUD (CRITICAL)', () => {
  assert.throws(() => nextVersion(2_099_123_199), /CRITICAL/);
});

test('rollbackVersion: same-day rollback lands ABOVE the bad version (PD6 CRITICAL rule)', () => {
  // deployed bad 2026071002, snapshot 2026071001 -> 2026071003, never snapshot+1-naive
  assert.strictEqual(rollbackVersion({ snapshotVersion: 2026071001, badVersion: 2026071002 }), 2026071003);
});

test('rollbackVersion: bad version from a LATER day than snapshot -> bad+1', () => {
  assert.strictEqual(rollbackVersion({ snapshotVersion: 2026071001, badVersion: 2026071502 }), 2026071503);
});

test('rollbackVersion: counter-99 fails LOUD (CRITICAL)', () => {
  assert.throws(() => rollbackVersion({ snapshotVersion: 2026071001, badVersion: 2026071099 }), /CRITICAL/);
});

test('addPrinter: byte-identical row, version rule, hash, validator green', () => {
  const { paths, readOverlay } = makeFixture({ contentVersion: 2020010101 });
  const before = readOverlay();
  const result = addPrinter('b1_test_printer', paths);
  assert.strictEqual(result.changed, true);

  const after = readOverlay();
  const sourceRow = JSON.parse(fs.readFileSync(paths.printersPath, 'utf8')).printers
    .find((p) => p.id === 'b1_test_printer');
  const overlayRow = after.payload.printers.find((p) => p.id === 'b1_test_printer');
  assert.strictEqual(stableStringify(overlayRow), stableStringify(sourceRow), 'row must be byte-identical (canonical form)');

  assert.strictEqual(after.content_version, TODAY01, 'past-day current must jump to <today>01');
  assert.notStrictEqual(after.generated_at, before.generated_at, 'generated_at must refresh');
  assert.ok(!Number.isNaN(Date.parse(after.generated_at)));
  assert.strictEqual(after.payload_sha256, sha256(stableStringify(after.payload)));
  assert.ok(validateOverlay(paths).ok, 'validator must pass on the republished overlay');
});

test('addPrinter: same-day current advances the counter (current+1)', () => {
  const { paths, readOverlay } = makeFixture({ contentVersion: TODAY01 });
  addPrinter('b1_test_printer', paths);
  assert.strictEqual(readOverlay().content_version, TODAY01 + 1);
});

test('addPrinter: idempotent no-op when the id is already in the overlay', () => {
  const { paths, readOverlay } = makeFixture({ contentVersion: 2020010101 });
  addPrinter('b1_test_printer', paths);
  const bytesAfterFirst = fs.readFileSync(paths.overlayPath, 'utf8');
  const result = addPrinter('b1_test_printer', paths);
  assert.strictEqual(result.changed, false);
  assert.match(result.message, /already/i);
  assert.strictEqual(fs.readFileSync(paths.overlayPath, 'utf8'), bytesAfterFirst, 'no version churn on no-op');
  assert.strictEqual(readOverlay().content_version, TODAY01);
});

test('addPrinter: existing differing row is refreshed in place from the exact source row', () => {
  const { paths, readOverlay } = makeFixture({ contentVersion: 2020010101 });
  addPrinter('b1_test_printer', paths);
  const before = readOverlay();
  const existingIndex = before.payload.printers.findIndex((p) => p.id === 'b1_test_printer');
  assert.notStrictEqual(existingIndex, -1);

  const source = JSON.parse(fs.readFileSync(paths.printersPath, 'utf8'));
  const sourceRow = source.printers.find((p) => p.id === 'b1_test_printer');
  sourceRow.notes = ['Corrected source note'];
  fs.writeFileSync(paths.printersPath, `${JSON.stringify(source, null, 2)}\n`);

  const result = addPrinter('b1_test_printer', paths);
  assert.strictEqual(result.changed, true);
  assert.match(result.message, /refreshed/i);

  const after = readOverlay();
  const refreshedIndex = after.payload.printers.findIndex((p) => p.id === 'b1_test_printer');
  assert.strictEqual(refreshedIndex, existingIndex, 'existing row must be replaced at the same index');
  assert.deepStrictEqual(after.payload.printers[refreshedIndex], sourceRow, 'overlay row must exactly equal the source row');
  assert.strictEqual(after.content_version, TODAY01 + 1, 'refresh must advance content_version');
  assert.strictEqual(after.payload_sha256, sha256(stableStringify(after.payload)));
  assert.ok(validateOverlay(paths).ok, 'validator must pass on the refreshed overlay');
});

test('addPrinter with --add-brand: new brand + printer rows byte-identical, validator green', () => {
  const { paths, readOverlay } = makeFixture({ contentVersion: 2020010101 });
  const result = addPrinter('b1_test_brand_printer', { ...paths, addBrand: 'b1_test_brand' });
  assert.strictEqual(result.changed, true);
  const after = readOverlay();
  const source = JSON.parse(fs.readFileSync(paths.printersPath, 'utf8'));
  const srcBrand = source.brands.find((b) => b.id === 'b1_test_brand');
  const ovBrand = after.payload.brands.find((b) => b.id === 'b1_test_brand');
  assert.strictEqual(stableStringify(ovBrand), stableStringify(srcBrand));
  assert.ok(validateOverlay(paths).ok);
});

test('addPrinter: unknown printer id fails without touching the overlay', () => {
  const { paths } = makeFixture({ contentVersion: 2020010101 });
  const bytesBefore = fs.readFileSync(paths.overlayPath, 'utf8');
  assert.throws(() => addPrinter('no_such_printer_xyz', paths), /no_such_printer_xyz/);
  assert.strictEqual(fs.readFileSync(paths.overlayPath, 'utf8'), bytesBefore);
});

test('bumpVersion: payload byte-identical, version advances, hash recomputed', () => {
  const { paths, readOverlay } = makeFixture({ contentVersion: 2020010101 });
  const before = readOverlay();
  const result = bumpVersion(paths);
  assert.strictEqual(result.changed, true);
  const after = readOverlay();
  assert.strictEqual(stableStringify(after.payload), stableStringify(before.payload), 'payload must be untouched');
  assert.strictEqual(after.content_version, TODAY01);
  assert.strictEqual(after.payload_sha256, sha256(stableStringify(after.payload)));
  assert.ok(validateOverlay(paths).ok);
});

test('rollbackTo: same-day second publish rolls back ABOVE the bad version, payload == snapshot', () => {
  const { paths, readOverlay, dir } = makeFixture({ contentVersion: 2026071001 });
  const snapshotPath = path.join(dir, 'known-good.json');
  writeSnapshot(snapshotPath, paths);
  const snapshotPayloadHash = sha256(stableStringify(readOverlay().payload));

  // Simulate the bad publish: add a printer (payload changes, version becomes live/bad).
  addPrinter('b1_test_printer', paths);
  const bad = readOverlay();
  assert.notStrictEqual(sha256(stableStringify(bad.payload)), snapshotPayloadHash);

  const result = rollbackTo(snapshotPath, { ...paths, badVersion: bad.content_version });
  assert.strictEqual(result.changed, true);
  const after = readOverlay();
  assert.strictEqual(after.content_version, Math.max(bad.content_version, 2026071001) + 1, 'max(bad, snapshot)+1');
  assert.ok(after.content_version > bad.content_version, 'rollback must land ABOVE the bad version (iOS poisoned-cache guard)');
  assert.strictEqual(sha256(stableStringify(after.payload)), snapshotPayloadHash, 'payload must equal the snapshot');
  assert.strictEqual(after.payload_sha256, snapshotPayloadHash);
  assert.ok(validateOverlay(paths).ok);
});

test('setEnabled false: PD8 emergency stop applies the SAME version rule', () => {
  const { paths, readOverlay } = makeFixture({ contentVersion: TODAY01 });
  const result = setEnabled(false, { ...paths, badVersion: TODAY01 + 1 });
  assert.strictEqual(result.changed, true);
  const after = readOverlay();
  assert.strictEqual(after.enabled, false);
  assert.strictEqual(after.content_version, TODAY01 + 2, 'max(bad, current)+1');
  assert.ok(validateOverlay(paths).ok);
});

function runCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
    return { status: 0, out: stdout };
  } catch (error) {
    return { status: error.status, out: `${error.stdout || ''}${error.stderr || ''}` };
  }
}

function pathArgs(paths) {
  return [
    '--overlay', paths.overlayPath,
    '--baselines', paths.baselinesPath,
    '--printers', paths.printersPath,
    '--project', paths.projectPath,
  ];
}

test('CLI: counter-99 exits 2 (freeze-mapped) with a CRITICAL line', () => {
  const { paths } = makeFixture({ contentVersion: todayBase() * 100 + 99 });
  const { status, out } = runCli(['--bump-version', ...pathArgs(paths)]);
  assert.strictEqual(status, 2, 'CRITICAL failures must exit 2 — the runner maps 2 to freeze+notify');
  assert.match(out, /CRITICAL/);
});

test('CLI: ordinary failure (unknown printer) exits 1, not 2', () => {
  const { paths } = makeFixture({ contentVersion: 2020010101 });
  const { status, out } = runCli(['--add-printer', 'no_such_printer_xyz', ...pathArgs(paths)]);
  assert.strictEqual(status, 1);
  assert.doesNotMatch(out, /CRITICAL/);
});

test('CLI: garbage --bad-version is rejected, never coerced to a zero PD6 floor', () => {
  const { paths, dir, readOverlay } = makeFixture({ contentVersion: 2026070401 });
  const snapshotPath = path.join(dir, 'snap.json');
  execFileSync(process.execPath, [SCRIPT, '--snapshot', snapshotPath, '--overlay', paths.overlayPath], { encoding: 'utf8' });
  const before = fs.readFileSync(paths.overlayPath, 'utf8');
  const { status, out } = runCli(['--rollback-to', snapshotPath, '--bad-version', '2O26071002', ...pathArgs(paths)]);
  assert.notStrictEqual(status, 0);
  assert.match(out, /--bad-version must be an integer/);
  assert.strictEqual(fs.readFileSync(paths.overlayPath, 'utf8'), before, 'overlay untouched on rejected input');
  assert.strictEqual(readOverlay().content_version, 2026070401);
});

test('addPrinter: no-op path refuses to silently discard --min-app-version/--add-brand', () => {
  const { paths } = makeFixture({ contentVersion: 2020010101 });
  addPrinter('b1_test_printer', paths);
  assert.throws(() => addPrinter('b1_test_printer', { ...paths, minAppVersion: '1.0.6' }), /refusing to no-op/);
});

test('bumpVersion: file text differs ONLY on content_version + generated_at lines', () => {
  const { paths } = makeFixture({ contentVersion: 2020010101 });
  // Normalize the fixture to the script's own serialization first, so the
  // diff below measures the bump, not fixture formatting.
  bumpVersion(paths);
  const before = fs.readFileSync(paths.overlayPath, 'utf8').split('\n');
  bumpVersion(paths);
  const after = fs.readFileSync(paths.overlayPath, 'utf8').split('\n');
  assert.strictEqual(before.length, after.length);
  const changed = [];
  for (let i = 0; i < before.length; i += 1) {
    if (before[i] !== after[i]) changed.push(after[i].trim());
  }
  // generated_at may collide at millisecond resolution when both bumps run
  // within the same ms — content_version always changes, nothing else may.
  assert.ok(changed.length >= 1 && changed.length <= 2, `1-2 changed lines expected, got ${changed.length}: ${changed.join(' | ')}`);
  assert.ok(changed.some((l) => l.startsWith('"content_version"')), 'content_version line must change');
  assert.ok(changed.every((l) => l.startsWith('"content_version"') || l.startsWith('"generated_at"')));
});

test('CLI: --snapshot writes a byte-identical copy of the overlay file', () => {
  const { paths, dir } = makeFixture({ contentVersion: 2026071001 });
  const out = path.join(dir, 'snap.json');
  execFileSync(process.execPath, [SCRIPT, '--snapshot', out, '--overlay', paths.overlayPath], { encoding: 'utf8' });
  assert.strictEqual(fs.readFileSync(out, 'utf8'), fs.readFileSync(paths.overlayPath, 'utf8'));
});
