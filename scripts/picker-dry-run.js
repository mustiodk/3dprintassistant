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

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

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

// ─── Engine bootstrap (mirrors scripts/walkthrough-harness.js) ───────────────
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

global.fetch = async function localFetch(url) {
  if (typeof url !== 'string') throw new Error('picker dry-run fetch expects string URL');
  const rel = url.replace(/^\.\//, '');
  const filePath = path.join(ROOT, rel);
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return { ok: true, status: 200, url, json: async () => JSON.parse(content), text: async () => content };
  } catch (e) {
    return { ok: false, status: 404, url, json: async () => null, text: async () => '' };
  }
};

const engineSrc = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
vm.runInThisContext(engineSrc + '\n;globalThis.__Engine = Engine;\n', { filename: 'engine.js' });
const Engine = globalThis.__Engine;

// ─── Run ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await Engine.init();
  } catch (e) {
    console.error(`RED: Engine.init() threw: ${e.message}`);
    process.exit(1);
  }

  const failures = [];

  const brands = Engine.getBrands();
  const brand = brands.find(b => b.id === brandId);
  if (!brand) {
    failures.push(`brand id '${brandId}' not found in getBrands(); known: ${brands.map(b => b.id).join(', ')}`);
  }

  const groups = Engine.getPrintersByBrand(brandId);
  const group = groups.find(g => g.label === seriesGroup);
  if (!group) {
    failures.push(`series_group '${seriesGroup}' not found under brand '${brandId}'; known: ${groups.map(g => g.label).join(', ') || '(none)'}`);
  }

  const model = group && group.models.find(m => m.id === printerId);
  if (group && !model) {
    failures.push(`printer id '${printerId}' not in group '${seriesGroup}'; group contains: ${group.models.map(m => m.id).join(', ') || '(none)'}`);
  }

  if (wrongBrandId) {
    const spurious = brands.find(b => b.id === wrongBrandId);
    if (spurious) {
      failures.push(`spurious brand '${wrongBrandId}' is registered in getBrands() (taxonomy regression)`);
    }
  }

  if (failures.length === 0) {
    const wrongBrandNote = wrongBrandId ? `, no spurious '${wrongBrandId}' brand` : '';
    console.log(`GREEN: ${printerId} present under ${brandId} / ${seriesGroup}${wrongBrandNote}`);
    process.exit(0);
  } else {
    console.log('RED: picker dry-run found mismatches:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
})();
