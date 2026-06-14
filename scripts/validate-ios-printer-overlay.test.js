#!/usr/bin/env node
//
// Self-test for the iOS printer-overlay ship validator.
//
// Guards the regression behind the 2026-06-14 Aries-collision fix: the validator must
// collide overlay ids against the UNION of all bundled baselines >= min_app_version (not
// just the min_app_version baseline), and must require a baseline for the current
// MARKETING_VERSION. See docs/superpowers/specs/2026-06-14-ios-overlay-aries-collision-fix-design.md.

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  validateOverlay,
  collectBaselineUnion,
  compareVersions,
  stableStringify,
  sha256,
} = require('./validate-ios-printer-overlay.js');

let tmpRoot;

function makeBrand(id) {
  return { id, name: id.toUpperCase(), sort_order: 50, primary: false, default_slicer: 'orcaslicer' };
}

function makePrinter(id, manufacturer) {
  return {
    id,
    name: id,
    manufacturer,
    series: 'bedslinger',
    series_group: 'Test Series',
    enclosure: 'none',
    extruder_type: 'bowden',
    max_nozzle_temp: 250,
    max_bed_temp: 110,
    max_speed: 180,
    max_acceleration: 5000,
    available_nozzle_sizes: [0.4],
  };
}

function makeOverlay({ contentVersion = 2026010101, minApp = '1.0.3', brands, printers }) {
  const payload = { brands, printers };
  return {
    content_version: contentVersion,
    enabled: true,
    generated_at: '2026-06-14T00:00:00.000Z',
    min_app_version: minApp,
    payload,
    payload_sha256: sha256(stableStringify(payload)),
    schema_version: 1,
  };
}

// Writes overlay + baselines + a project.yml fixture to a fresh temp dir and returns paths.
function fixture({ overlay, baselines, marketingVersion }) {
  const dir = fs.mkdtempSync(path.join(tmpRoot, 'case-'));
  const overlayPath = path.join(dir, 'overlay.json');
  const baselinesPath = path.join(dir, 'baselines.json');
  const projectPath = path.join(dir, 'project.yml');
  fs.writeFileSync(overlayPath, JSON.stringify(overlay));
  fs.writeFileSync(baselinesPath, JSON.stringify(baselines));
  fs.writeFileSync(projectPath, `name: PrintAssistant\nsettings:\n    MARKETING_VERSION: "${marketingVersion}"\n`);
  return { overlayPath, baselinesPath, projectPath };
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ---------------------------------------------------------------------------
// Case (a): the UNION is what catches the collision.
// An overlay carrying a printer that is absent from the 1.0.3 baseline but present in the
// 1.0.4 baseline must PASS under a 1.0.3-only baseline set and FAIL once 1.0.4 is in the
// union. This is exactly the i7+aries scenario the fix addresses.
// ---------------------------------------------------------------------------
// RED demo verified 2026-06-14: with the fixture printer id 'collidep' the two halves
// genuinely flip — 1.0.3-only baseline → GREEN (collidep absent from union); add a 1.0.4
// baseline bundling 'collidep' → RED (collidep enters the union). Renaming 'collidep' to a
// bundled id (e.g. 'x1c') makes the GREEN half RED too, confirming the assertion is real.
test('(a) union: passes under 1.0.3-only baseline, fails once 1.0.4 baseline is in the union', () => {
  const overlay = makeOverlay({
    contentVersion: 2026061401,
    minApp: '1.0.3',
    brands: [],
    printers: [makePrinter('collidep', 'creality')],
  });

  // 1.0.3-only baseline set → 'collidep' not in union → PASS.
  const onlyV103 = fixture({
    overlay,
    marketingVersion: '1.0.3',
    baselines: {
      '1.0.3': { source: 'test', brand_ids: ['creality'], printer_ids: ['x1c'] },
    },
  });
  const okResult = validateOverlay(onlyV103);
  assert.strictEqual(okResult.ok, true, 'expected GREEN under 1.0.3-only baseline');

  // Add a 1.0.4 baseline that bundles 'collidep' → union now contains it → FAIL.
  const withV104 = fixture({
    overlay,
    marketingVersion: '1.0.4',
    baselines: {
      '1.0.3': { source: 'test', brand_ids: ['creality'], printer_ids: ['x1c'] },
      '1.0.4': { source: 'test', brand_ids: ['creality'], printer_ids: ['x1c', 'collidep'] },
    },
  });
  assert.throws(
    () => validateOverlay(withV104),
    /overlay printer collidep already exists in a bundled baseline/,
    'expected RED once the 1.0.4 baseline (with collidep) is in the union',
  );
});

// ---------------------------------------------------------------------------
// Case (b): aries-only overlay is GREEN against the 1.0.3 + 1.0.4 baseline union.
// ---------------------------------------------------------------------------
test('(b) aries-only overlay passes against the 1.0.3 + 1.0.4 baseline union', () => {
  const overlay = makeOverlay({
    contentVersion: 2026061401,
    minApp: '1.0.3',
    brands: [makeBrand('voxelab')],
    printers: [makePrinter('aries', 'voxelab')],
  });
  const paths = fixture({
    overlay,
    marketingVersion: '1.0.4',
    baselines: {
      '1.0.3': { source: 'test', brand_ids: ['creality'], printer_ids: ['x1c'] },
      '1.0.4': { source: 'test', brand_ids: ['creality'], printer_ids: ['x1c', 'sparkx_i7'] },
    },
  });
  const result = validateOverlay(paths);
  assert.strictEqual(result.ok, true, 'expected aries-only overlay to be GREEN');
});

// ---------------------------------------------------------------------------
// Case (c): missing baseline for the current MARKETING_VERSION fails clearly.
// ---------------------------------------------------------------------------
test('(c) missing MARKETING_VERSION baseline fails with a clear message', () => {
  const overlay = makeOverlay({
    contentVersion: 2026061401,
    minApp: '1.0.3',
    brands: [makeBrand('voxelab')],
    printers: [makePrinter('aries', 'voxelab')],
  });
  const paths = fixture({
    overlay,
    marketingVersion: '1.0.4', // but no 1.0.4 baseline below
    baselines: {
      '1.0.3': { source: 'test', brand_ids: ['creality'], printer_ids: ['x1c'] },
    },
  });
  assert.throws(
    () => validateOverlay(paths),
    /MARKETING_VERSION 1\.0\.4 — add a bundled-catalog baseline for 1\.0\.4/,
    'expected failure naming the missing MARKETING_VERSION baseline',
  );
});

// ---------------------------------------------------------------------------
// Case (d): direct unit coverage for the pure helpers (the heart of the fix).
// Locks numeric-not-lexical version comparison and the >= boundary / non-version-key skip.
// ---------------------------------------------------------------------------
test('(d) compareVersions is numeric (1.0.10 > 1.0.9), not lexical', () => {
  assert.strictEqual(compareVersions('1.0.10', '1.0.9'), 1, '1.0.10 must sort after 1.0.9');
  assert.strictEqual(compareVersions('1.0.9', '1.0.10'), -1);
  assert.strictEqual(compareVersions('1.0.4', '1.0.4'), 0);
  assert.strictEqual(compareVersions('1.2.0', '1.10.0'), -1, 'minor must compare numerically');
});

test('(d) collectBaselineUnion includes only baselines >= min, skips lower + non-version keys', () => {
  const baselines = {
    '1.0.2': { brand_ids: ['old_brand'], printer_ids: ['old_printer'] },
    '1.0.3': { brand_ids: ['creality'], printer_ids: ['x1c'] },
    '1.0.4': { brand_ids: ['creality'], printer_ids: ['x1c', 'sparkx_i7'] },
    _comment: 'not a version key — must be skipped, not crash',
  };
  const { brandUnion, printerUnion, includedVersions } = collectBaselineUnion(baselines, '1.0.3');
  assert.deepStrictEqual(includedVersions.sort(), ['1.0.3', '1.0.4'], 'only >= min, no 1.0.2/_comment');
  assert.ok(printerUnion.has('x1c') && printerUnion.has('sparkx_i7'));
  assert.ok(!printerUnion.has('old_printer'), '1.0.2 (below min) must be excluded');
  assert.ok(brandUnion.has('creality') && !brandUnion.has('old_brand'));
});

// ---------------------------------------------------------------------------
// Case (e): live smoke — the committed overlay must validate GREEN against the committed
// baselines + the iOS MARKETING_VERSION. Durable regression guard: re-adding a bundled id
// (e.g. sparkx_i7) to the overlay, or letting the baselines/MARKETING_VERSION go stale,
// flips this RED. Skips if the sibling iOS project.yml isn't checked out.
// ---------------------------------------------------------------------------
test('(e) committed overlay validates GREEN against committed baselines (live smoke)', () => {
  const iosProject = path.resolve(__dirname, '..', '..', '3dprintassistant-ios', 'project.yml');
  if (!fs.existsSync(iosProject)) {
    console.log('      (skipped — sibling iOS project.yml not checked out)');
    return;
  }
  const result = validateOverlay(); // default paths = real catalog/ + iOS project.yml
  assert.strictEqual(result.ok, true, 'the committed overlay must validate green');
});

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'overlay-validator-test-'));
let failures = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL  ${name}\n      ${error.message}`);
  }
}
fs.rmSync(tmpRoot, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\n[overlay-validator-test] ${failures} failing`);
  process.exit(1);
}
console.log(`\n[overlay-validator-test] ${tests.length}/${tests.length} passing`);
