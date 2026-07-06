#!/usr/bin/env node
// ─── 3D Print Assistant — Engine golden value-level snapshot ────────────────
// Dumps the FULL engine output surface (resolved profile + warnings +
// checklist + adjusted temps + advanced filament settings + export payloads
// + text formatting) for a deterministic state matrix into
// scripts/fixtures/engine-golden.json.
//
// Purpose: value-level regression net for engine-touching work (IMPL-043 /
// IMPL-044 arcs). Regenerate after any engine/data change and diff against
// the committed file — every changed line must be intentional + enumerated
// in the commit message.
//
// Run:        node scripts/engine-golden-snapshot.js            (writes file)
// Check mode: node scripts/engine-golden-snapshot.js --check    (diff only, exit 1 on drift)

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const OUT  = path.join(__dirname, 'fixtures', 'engine-golden.json');

// ─── Engine bootstrap (walkthrough-harness pattern) ─────────────────────────
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.fetch = async function localFetch(url) {
  if (typeof url !== 'string') throw new Error('snapshot fetch expects string URL');
  const filePath = path.join(ROOT, url.replace(/^\.\//, ''));
  let content;
  try { content = await fs.promises.readFile(filePath, 'utf8'); }
  catch (e) { return { ok: false, status: 404, url, json: async () => null, text: async () => '' }; }
  return { ok: true, status: 200, url, json: async () => JSON.parse(content), text: async () => content };
};
const engineSrc = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
vm.runInThisContext(engineSrc + '\n;globalThis.__Engine = Engine;\n', { filename: 'engine.js' });
const Engine = globalThis.__Engine;

// ─── Deterministic matrix ───────────────────────────────────────────────────
function stateDefault(overrides) {
  return {
    useCase: ['functional'], surface: 'standard', strength: 'standard',
    speed: 'balanced', environment: 'normal', support: 'none',
    colors: 'single', userLevel: 'intermediate', special: [],
    profileMode: 'safe',
    ...overrides,
  };
}

// Base combos mirror the walkthrough harness COMBOS (real ids, all slicer
// routes, edge printers) so the two nets agree on coverage.
const BASE = [
  { key: 'x1c-std04-pla',        s: { printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic' } },
  { key: 'x1c-prc02-tpu-fineq',  s: { printer: 'x1c', nozzle: 'prc_0.2', material: 'tpu_95a', surface: 'fine', speed: 'quality' } },
  { key: 'x1c-std08-pla-draft',  s: { printer: 'x1c', nozzle: 'std_0.8', material: 'pla_basic', surface: 'draft', speed: 'fast' } },
  { key: 'p1s-hrd06-placf-str',  s: { printer: 'p1s', nozzle: 'hrd_0.6', material: 'pla_cf', strength: 'strong' } },
  { key: 'a1mini-std04-petg',    s: { printer: 'a1mini', nozzle: 'std_0.4', material: 'petg_basic' } },
  { key: 'a1-std04-abs',         s: { printer: 'a1', nozzle: 'std_0.4', material: 'abs' } },
  { key: 'mk4-std04-plasilk',    s: { printer: 'mk4', nozzle: 'std_0.4', material: 'pla_silk', surface: 'fine', speed: 'quality' } },
  { key: 'mk4s-std04-petghf',    s: { printer: 'mk4s', nozzle: 'std_0.4', material: 'petg_hf', speed: 'fast' } },
  { key: 'voron24-hrd04-pacf',   s: { printer: 'voron_2_4', nozzle: 'hrd_0.4', material: 'pa_cf', surface: 'maximum' } },
  { key: 'k1max-std04-pc-str',   s: { printer: 'k1_max', nozzle: 'std_0.4', material: 'pc', strength: 'strong' } },
  { key: 'sparkxi7-hrd04-placf', s: { printer: 'sparkx_i7', nozzle: 'hrd_0.4', material: 'pla_cf' } },
  { key: 'aries-std04-abs',      s: { printer: 'aries', nozzle: 'std_0.4', material: 'abs' } },
  { key: 'megax-std04-petg',     s: { printer: 'mega_x', nozzle: 'std_0.4', material: 'petg_basic' } },
  { key: 'snapmaker-std04-pla',  s: { printer: 'snapmaker_2_a350', nozzle: 'std_0.4', material: 'pla_basic' } },
  { key: 'creator5-std04-abs',   s: { printer: 'creator_5_pro', nozzle: 'std_0.4', material: 'abs' } },
];

// Environment + support + multicolor variants on representative printers.
const VARIANTS = [
  { key: 'x1c-std04-pla-cold',     s: { printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic', environment: 'cold' } },
  { key: 'x1c-std04-petg-vcold',   s: { printer: 'x1c', nozzle: 'std_0.4', material: 'petg_basic', environment: 'vcold' } },
  { key: 'a1-std04-petg-humid',    s: { printer: 'a1', nozzle: 'std_0.4', material: 'petg_basic', environment: 'humid' } },
  { key: 'x1c-std04-pla-support',  s: { printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic', support: 'organic' } },
  { key: 'x1c-std04-pla-multi',    s: { printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic', colors: 'multi_ams' } },
  { key: 'mk4-std04-abs-cold',     s: { printer: 'mk4', nozzle: 'std_0.4', material: 'abs', environment: 'cold' } },
];

const MATRIX = [];
for (const c of BASE) {
  MATRIX.push({ key: c.key + '~safe',  state: stateDefault({ ...c.s, profileMode: 'safe' }) });
  MATRIX.push({ key: c.key + '~tuned', state: stateDefault({ ...c.s, profileMode: 'tuned' }) });
}
for (const c of VARIANTS) {
  MATRIX.push({ key: c.key + '~safe', state: stateDefault(c.s) });
}

// ─── Stable serialization ───────────────────────────────────────────────────
function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = sortDeep(v[k]);
    return out;
  }
  return v;
}

function capture(fn) {
  try { return fn(); }
  catch (e) { return { __error: String(e && e.message || e) }; }
}

// exportProfile embeds `_meta.generated_at: new Date().toISOString()` (engine.js:3343).
// Normalize it so the snapshot is deterministic; the engine itself stays untouched.
function normalizeExportRef(obj) {
  if (obj && obj._meta && obj._meta.generated_at) {
    obj._meta.generated_at = '<normalized-for-snapshot>';
  }
  return obj;
}

async function main() {
  await Engine.init();
  const snapshot = { __meta: { note: 'Generated by scripts/engine-golden-snapshot.js — do not hand-edit', states: MATRIX.length } };

  for (const { key, state } of MATRIX) {
    // Match the app's slicer routing so PARAM_LABELS / tabs / export match UI behavior.
    const slicer = Engine.getSlicerForPrinter(state.printer);
    Engine.setActiveSlicer(slicer);

    const entry = {
      slicer,
      profile:   capture(() => Engine.resolveProfile(state)),
      warnings:  capture(() => Engine.getWarnings(state)),
      checklist: capture(() => Engine.getChecklist(state)),
      temps:     capture(() => Engine.getAdjustedTemps(state.material, state.environment, state.nozzle)),
      advanced:  capture(() => Engine.getAdvancedFilamentSettings(state)),
      exportRef: normalizeExportRef(capture(() => Engine.exportProfile(state, Engine.resolveProfile(state)))),
      text:      capture(() => Engine.formatProfileAsText(state)),
    };
    if (slicer === 'bambu_studio') {
      entry.exportBambu = capture(() => Engine.exportBambuStudioJSON(state));
    }
    snapshot[key] = entry;
  }

  const json = JSON.stringify(sortDeep(snapshot), null, 1) + '\n';

  if (process.argv.includes('--check')) {
    const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (prev === json) { console.log('engine-golden: NO DRIFT (' + MATRIX.length + ' states)'); return; }
    console.error('engine-golden: DRIFT DETECTED — regenerate and enumerate deltas');
    process.exitCode = 1;
    return;
  }

  fs.writeFileSync(OUT, json);
  console.log('engine-golden: wrote ' + MATRIX.length + ' states → ' + path.relative(ROOT, OUT));
}

main().catch(e => { console.error('snapshot failed:', e); process.exit(1); });
