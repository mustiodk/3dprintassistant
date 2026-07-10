#!/usr/bin/env node
// verify-live-picker.js — PD3 post-deploy picker probe (Intake Autonomy v2, Gate B2).
//
// The visual-picker replacement (spec PD3, owner-waived 2026-07-10): downloads
// the LIVE deployed engine.js + every file Engine.init() fetches into a temp
// root, runs the shared engine bootstrap against that root (the fetch shim is
// LOCAL-FILE-ONLY by design — no HTTP support added), and asserts the same
// picker shape picker-dry-run.js asserts locally — but against PRODUCTION data:
// <printer_id> resolves under <brand_id> / <series_group>, and optionally that
// no spurious <wrong_brand_id> brand exists.
//
// Usage:
//   node scripts/verify-live-picker.js <brand_id> <series_group> <printer_id> \
//        [wrong_brand_id] [--base-url https://3dprintassistant.com] [--keep-temp]
//
// Exit codes: 0 GREEN / 2 picker mismatch / 3 download-or-init error / 1 usage.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadEngine, initEngine, collectPickerFailures } = require('./lib/engine-bootstrap.js');

const DEFAULT_BASE_URL = 'https://3dprintassistant.com';

// Everything Engine.init() fetches (engine.js:163-171) plus the engine itself —
// live engine + live data, mirroring the repo layout the bootstrap expects.
// verify-live-picker.test.js cross-checks this list against engine.js's actual
// fetch sites, so an init() change fails the suite instead of rotting here.
const REQUIRED_FILES = [
  'engine.js',
  'data/printers.json',
  'data/materials.json',
  'data/nozzles.json',
  'data/rules/environment.json',
  'data/rules/objective_profiles.json',
  'data/rules/troubleshooter.json',
  'data/rules/slicer_capabilities.json',
  'locales/en.json',
  'locales/da.json',
];

async function downloadSiteFiles(baseUrl, destRoot, fetchImpl = global.fetch) {
  for (const rel of REQUIRED_FILES) {
    const url = `${baseUrl.replace(/\/$/, '')}/${rel}`;
    const res = await fetchImpl(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`download failed: ${rel} -> HTTP ${res.status} (${url})`);
    const body = await res.text();
    const dest = path.join(destRoot, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, body);
  }
}

module.exports = { REQUIRED_FILES, downloadSiteFiles };

if (require.main === module) {
  const positional = [];
  let baseUrl = DEFAULT_BASE_URL;
  let keepTemp = false;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--base-url') {
      i += 1;
      if (i >= args.length) { console.error('[verify-live-picker] missing value for --base-url'); process.exit(1); }
      baseUrl = args[i];
    } else if (args[i] === '--keep-temp') {
      keepTemp = true;
    } else if (args[i].startsWith('--')) {
      // A typo'd flag must never silently become the wrong-brand positional
      // (which would then pass vacuously).
      console.error(`[verify-live-picker] unknown argument: ${args[i]}`);
      process.exit(1);
    } else {
      positional.push(args[i]);
    }
  }

  const [brandId, seriesGroup, printerId, wrongBrandId] = positional;
  if (!brandId || !seriesGroup || !printerId) {
    console.error('Usage: node scripts/verify-live-picker.js <brand_id> <series_group> <printer_id> [wrong_brand_id] [--base-url U] [--keep-temp]');
    process.exit(1);
  }

  (async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), '3dpa-live-picker-'));
    const cleanup = () => {
      if (keepTemp) {
        console.log(`[verify-live-picker] temp root kept: ${tempRoot}`);
      } else {
        try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch (_) { /* best effort */ }
      }
    };

    try {
      await downloadSiteFiles(baseUrl, tempRoot);
    } catch (error) {
      console.error(`[verify-live-picker] DOWNLOAD-ERROR: ${error.message}`);
      cleanup();
      process.exit(3);
    }

    // loadEngine vm-evaluates the DOWNLOADED engine.js — a garbage-200 body
    // (e.g. an HTML error page served with HTTP 200) throws a SyntaxError
    // here, which must classify as exit 3, not crash into exit 1.
    let Engine;
    let init;
    try {
      Engine = loadEngine(tempRoot);
      init = await initEngine(Engine);
    } catch (error) {
      console.error(`[verify-live-picker] INIT-ERROR: downloaded engine.js failed to load: ${error.message}`);
      cleanup();
      process.exit(3);
    }
    if (!init.ok) {
      if (init.captured.length) init.captured.forEach((line) => process.stderr.write(`${line}\n`));
      console.error(`[verify-live-picker] INIT-ERROR: Engine.init() threw on live data: ${init.error.message}`);
      cleanup();
      process.exit(3);
    }

    const failures = collectPickerFailures(Engine, { brandId, seriesGroup, printerId, wrongBrandId });
    if (failures.length === 0) {
      const wrongBrandNote = wrongBrandId ? `, no spurious '${wrongBrandId}' brand` : '';
      console.log(`GREEN: ${printerId} present under ${brandId} / ${seriesGroup}${wrongBrandNote} (PRODUCTION data from ${baseUrl})`);
      cleanup();
      process.exit(0);
    }

    if (init.captured.length) init.captured.forEach((line) => process.stderr.write(`${line}\n`));
    console.log(`RED: live picker probe found mismatches (data from ${baseUrl}):`);
    for (const f of failures) console.log(`  - ${f}`);
    cleanup();
    process.exit(2);
  })().catch((error) => {
    // Anything that escapes the handled paths is an environment problem, not
    // a usage error — classify as 3 so the runner never misreads it.
    console.error(`[verify-live-picker] UNEXPECTED-ERROR: ${error.message}`);
    process.exit(3);
  });
}
