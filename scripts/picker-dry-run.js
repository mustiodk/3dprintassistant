#!/usr/bin/env node
// ─── 3dpa picker dry-run ─────────────────────────────────────────────────────
//
// Validates a printer's placement in the brand picker BEFORE committing.
// Catches the class of taxonomy bug that hit SPARKX/i7 (2026-05-12): wrong
// manufacturer, wrong series_group, or accidental new-brand creation.
//
// Usage:
//   node scripts/picker-dry-run.js <brand_id> <series_group> <printer_id> [wrong_brand_id]
//
// Examples:
//   node scripts/picker-dry-run.js creality "i Series" sparkx_i7
//   node scripts/picker-dry-run.js creality "i Series" sparkx_i7 sparkx
//
// Exit 0 = picker shape matches expectations (GREEN).
// Exit 1 = mismatch or usage error (RED).
//
// See docs/runbooks/printer-addition-protocol.md Phase 2.

const path = require('path');
const { loadEngine, initEngine, collectPickerFailures } = require('./lib/engine-bootstrap.js');

const ROOT = path.join(__dirname, '..');

function usage(msg) {
  if (msg) console.error(`error: ${msg}\n`);
  console.error('Usage: node scripts/picker-dry-run.js <brand_id> <series_group> <printer_id> [wrong_brand_id]');
  console.error('');
  console.error('Asserts <printer_id> is registered under <brand_id> / <series_group>.');
  console.error('If <wrong_brand_id> is given, also asserts no brand with that id exists.');
  process.exit(1);
}

const [brandId, seriesGroup, printerId, wrongBrandId] = process.argv.slice(2);
if (!brandId || !seriesGroup || !printerId) usage('missing required args');

// ─── Engine bootstrap (shared: scripts/lib/engine-bootstrap.js) ──────────────
const Engine = loadEngine(ROOT);

// ─── Run ─────────────────────────────────────────────────────────────────────
(async () => {
  // Capture engine.init()'s pre-existing soft-warning chatter (k_factor_matrix
  // gaps, etc.). It's informational and unrelated to picker shape. On GREEN
  // we drop it; on RED we re-emit so it's available for debugging.
  const init = await initEngine(Engine);
  const captured = init.captured;
  if (!init.ok) {
    if (captured.length) captured.forEach(line => process.stderr.write(line + '\n'));
    console.error(`RED: Engine.init() threw: ${init.error.message}`);
    process.exit(1);
  }

  const failures = collectPickerFailures(Engine, { brandId, seriesGroup, printerId, wrongBrandId });

  if (failures.length === 0) {
    const wrongBrandNote = wrongBrandId ? `, no spurious '${wrongBrandId}' brand` : '';
    console.log(`GREEN: ${printerId} present under ${brandId} / ${seriesGroup}${wrongBrandNote}`);
    process.exit(0);
  } else {
    // RED: flush captured init warnings to stderr (debugging context) then
    // emit the failure report on stdout.
    if (captured.length) captured.forEach(line => process.stderr.write(line + '\n'));
    console.log('RED: picker dry-run found mismatches:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
})();
