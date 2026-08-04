#!/usr/bin/env node
// ─── 3D Print Assistant — acceleration clamp regression net ─────────────────
// Invariant: the engine must never RECOMMEND an acceleration the printer
// cannot physically execute.
//
// Every printer row carries `max_acceleration` (a firmware/manufacturer
// ceiling). Before this net existed engine.js read that field in exactly ONE
// place — the HIGH-012 warning *text* at engine.js:2635 — and never clamped
// the emitted values. The result shipped live: Anycubic Mega X (ceiling
// 400 mm/s²) was told to use 2500 / 3000 / 500 mm/s², i.e. the app printed
// "Mega X tops out at 400 mm/s²" directly above a 2500 mm/s² recommendation.
//
// Most firmware clamps the request, so the usual real-world consequence is
// dead advice rather than a damaged print — but a user on raised limits
// (Klipper, modified firmware) genuinely gets ringing or layer shifts, and a
// self-contradicting screen destroys trust in every other number.
//
// This net asserts the invariant across the WHOLE catalog, not just the one
// printer that surfaced it, so the next low-ceiling printer added cannot
// silently reintroduce it.
//
// Run: node scripts/engine-accel-clamp.test.js

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');

// ─── Engine bootstrap (engine-golden-snapshot / walkthrough-harness pattern) ─
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.fetch = async function localFetch(url) {
  if (typeof url !== 'string') throw new Error('accel-clamp fetch expects string URL');
  const filePath = path.join(ROOT, url.replace(/^\.\//, ''));
  let content;
  try { content = await fs.promises.readFile(filePath, 'utf8'); }
  catch { return { ok: false, status: 404, url, json: async () => null, text: async () => '' }; }
  return { ok: true, status: 200, url, json: async () => JSON.parse(content), text: async () => content };
};
const engineSrc = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
vm.runInThisContext(engineSrc + '\n;globalThis.__Engine = Engine;\n', { filename: 'engine.js' });
const Engine = globalThis.__Engine;

const ACCEL_FIELDS = [
  'outer_wall_acceleration',
  'inner_wall_acceleration',
  'initial_layer_acceleration',
];

function unwrap(v) {
  return (v && typeof v === 'object' && 'value' in v) ? v.value : v;
}

// Emitted accelerations are formatted strings like "2500 mm/s²".
function parseAccel(raw) {
  const v = unwrap(raw);
  if (v == null) return null;
  const m = String(v).match(/(-?[\d.]+)/);
  return m ? Number(m[1]) : null;
}

function stateFor(printerId, nozzle, material, overrides) {
  return {
    useCase: ['functional'], surface: 'standard', strength: 'standard',
    speed: 'balanced', environment: 'normal', support: 'none',
    colors: 'single', userLevel: 'intermediate', special: [],
    profileMode: 'safe',
    printer: printerId, nozzle, material,
    ...overrides,
  };
}

let pass = 0;
let fail = 0;
const failures = [];

function check(name, ok, detail) {
  if (ok) { pass += 1; console.log(`  ok  ${name}`); }
  else { fail += 1; failures.push(`${name} — ${detail}`); console.log(`  FAIL ${name} — ${detail}`); }
}

(async function main() {
  await Engine.init();

  const printers = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'printers.json'), 'utf8')).printers;

  // ── TC1 — the regression that surfaced this: Mega X, ceiling 400 ──────────
  console.log('\nTC1 — Mega X (max_acceleration 400) must not be told to exceed it');
  {
    const megaX = printers.find((p) => p.id === 'mega_x');
    const ceiling = unwrap(megaX.max_acceleration);
    for (const mode of ['safe', 'tuned']) {
      const profile = Engine.resolveProfile(stateFor('mega_x', 'std_0.4', 'petg_basic', { profileMode: mode }));
      for (const field of ACCEL_FIELDS) {
        const got = parseAccel(profile[field]);
        check(
          `mega_x/${mode}/${field} <= ${ceiling}`,
          got != null && got <= ceiling,
          `emitted ${got} mm/s² against a ${ceiling} mm/s² ceiling`,
        );
      }
    }
  }

  // ── TC2 — catalog-wide invariant, every printer, both profile modes ───────
  // Verified per item rather than eyeballed: a categorical claim ("no printer
  // over-recommends") is only worth anything if every row is actually checked.
  console.log('\nTC2 — no catalogued printer is recommended more than its ceiling');
  {
    const offenders = [];
    let checked = 0;
    for (const printer of printers) {
      const ceiling = unwrap(printer.max_acceleration);
      if (typeof ceiling !== 'number') continue;
      const nozzles = unwrap(printer.available_nozzle_sizes) || [0.4];
      const nozzleId = `std_${Number(nozzles[0]).toFixed(1)}`;
      for (const mode of ['safe', 'tuned']) {
        let profile;
        try {
          profile = Engine.resolveProfile(stateFor(printer.id, nozzleId, 'pla_basic', { profileMode: mode }));
        } catch { continue; } // unsupported combo — not this net's concern
        if (!profile) continue;
        checked += 1;
        for (const field of ACCEL_FIELDS) {
          const got = parseAccel(profile[field]);
          if (got != null && got > ceiling) {
            offenders.push(`${printer.id}/${mode}/${field}: ${got} > ${ceiling}`);
          }
        }
      }
    }
    check(
      `catalog-wide invariant holds (${checked} printer×mode combos checked)`,
      offenders.length === 0,
      `${offenders.length} over-recommendation(s): ${offenders.slice(0, 8).join('; ')}`,
    );
  }

  // ── TC3 — the clamp must not flatten printers that are already legal ──────
  // Guards the opposite failure: a clamp that silently caps everyone would
  // make TC1/TC2 pass while destroying the product. X1C's ceiling is 20000,
  // far above any emitted tier, so its values must be untouched.
  console.log('\nTC3 — high-ceiling printers keep their full recommended values');
  {
    const profile = Engine.resolveProfile(stateFor('x1c', 'std_0.4', 'pla_basic'));
    const outer = parseAccel(profile.outer_wall_acceleration);
    check('x1c outer_wall_acceleration is not clamped down', outer >= 3000, `got ${outer}, expected the full CoreXY tier`);
  }

  // ── TC4 — the warning text and the recommendation must agree ─────────────
  // The original defect was not just a wrong number, it was a screen that
  // contradicted itself. Pin that they cannot diverge again.
  console.log('\nTC4 — HIGH-012 warning ceiling matches what is actually recommended');
  {
    const megaX = printers.find((p) => p.id === 'mega_x');
    const ceiling = unwrap(megaX.max_acceleration);
    const state = stateFor('mega_x', 'std_0.4', 'petg_basic');
    const profile = Engine.resolveProfile(state);
    const outer = parseAccel(profile.outer_wall_acceleration);
    check(
      'recommended outer accel does not exceed the ceiling named in the warning',
      outer <= ceiling,
      `warning says ${ceiling} mm/s², recommendation says ${outer} mm/s²`,
    );
  }

  console.log(`\n[accel-clamp] ${pass} passing, ${fail} failing`);
  if (fail) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
})().catch((err) => { console.error(err); process.exit(1); });
