#!/usr/bin/env node
// ─── 3D Print Assistant — Export audit harness (IMPL-043 Phase 0) ───────────
// Diffs the app's generated slicer exports against (a) owner-exported golden
// fixtures in scripts/fixtures/slicer-golden/ and (b) the engine's own
// resolved-profile values. This is the verification loop the April 2026
// export work never had (IMPL-043 §1.3).
//
// Check classes:
//   FAIL — drift: an exported value disagrees with the resolved profile /
//          canonical source. These are real defects; exit code 1 while any live.
//   WARN — schema-form difference vs the golden fixture that needs the owner
//          import test to adjudicate (e.g. 1-element vs 2-element arrays).
//   INFO — expected differences (sparse user presets) recorded for the log.
//
// Run: node scripts/export-audit.js
// Phase 0 note: this harness EXPECTS to exit 1 on the pre-IMPL-043-P1 code —
// it documents the live defects (HIGH-001 unscaled retraction, filament
// version). It goes green in Phase 1.

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.join(__dirname, '..');
const GOLDEN = path.join(__dirname, 'fixtures', 'slicer-golden');

// ─── Engine bootstrap (walkthrough-harness pattern) ─────────────────────────
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.fetch = async function localFetch(url) {
  if (typeof url !== 'string') throw new Error('audit fetch expects string URL');
  const filePath = path.join(ROOT, url.replace(/^\.\//, ''));
  let content;
  try { content = await fs.promises.readFile(filePath, 'utf8'); }
  catch (e) { return { ok: false, status: 404, url, json: async () => null, text: async () => '' }; }
  return { ok: true, status: 200, url, json: async () => JSON.parse(content), text: async () => content };
};
const engineSrc = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
vm.runInThisContext(engineSrc + '\n;globalThis.__Engine = Engine;\n', { filename: 'engine.js' });
const Engine = globalThis.__Engine;

let fails = 0, warns = 0, infos = 0;
const FAIL = (name, detail) => { fails++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); };
const WARN = (name, detail) => { warns++; console.log(`  warn ${name}${detail ? ' — ' + detail : ''}`); };
const INFO = (name, detail) => { infos++; console.log(`  info ${name}${detail ? ' — ' + detail : ''}`); };
const PASS = (name) => console.log(`  ok   ${name}`);
const checkFail = (name, cond, detail) => cond ? PASS(name) : FAIL(name, detail);
const checkWarn = (name, cond, detail) => cond ? PASS(name) : WARN(name, detail);

function num(v) {
  if (v == null) return null;
  const m = String(Array.isArray(v) ? v[0] : v).match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function stateFor(printer, material, nozzle, extra) {
  return {
    printer, material, nozzle,
    useCase: ['functional'], surface: 'standard', strength: 'standard',
    speed: 'balanced', environment: 'normal', support: 'none',
    colors: 'single', userLevel: 'intermediate', special: [],
    profileMode: 'safe', ...(extra || {}),
  };
}

async function main() {
  await Engine.init();
  const caps = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/rules/slicer_capabilities.json'), 'utf8'));

  // ═══ Bambu Studio ═══════════════════════════════════════════════════════
  const goldenProcess  = JSON.parse(fs.readFileSync(path.join(GOLDEN, 'bambu-x1c-process.json'), 'utf8'));
  const goldenFilament = JSON.parse(fs.readFileSync(path.join(GOLDEN, 'bambu-x1c-filament.json'), 'utf8'));

  console.log('# Export audit — Bambu Studio (golden: X1C process + PLA filament)\n');

  const st = stateFor('x1c', 'pla_basic', 'std_0.4');
  Engine.setActiveSlicer('bambu_studio');
  const exp = Engine.exportBambuStudioJSON(st);
  if (!exp) { FAIL('exportBambuStudioJSON returned null'); finish(); return; }
  const { process: proc, filament: fil } = exp;

  // — Version strings (IMPL-043 §1.4 LOW-007 + fixtures versions.md) —
  checkFail('process version matches golden', proc.version === goldenProcess.version,
    `app ${proc.version} vs golden ${goldenProcess.version}`);
  checkFail('filament version matches golden', fil.version === goldenFilament.version,
    `app ${fil.version} vs golden ${goldenFilament.version}`);

  // — Inherits parents —
  checkFail('process inherits matches golden system preset (x1c/0.20)',
    proc.inherits === goldenProcess.inherits,
    `app "${proc.inherits}" vs golden "${goldenProcess.inherits}"`);
  INFO('filament inherits (app vs golden — cross-printer parents are legit per the owner preset itself)',
    `app "${fil.inherits}" vs golden "${goldenFilament.inherits}"`);

  // — Boolean form: golden encodes booleans as string "0"/"1" —
  const goldenBoolStyle = typeof goldenProcess.enable_support === 'string';
  checkFail('golden boolean form is string "0"/"1"', goldenBoolStyle, typeof goldenProcess.enable_support);
  if (proc.only_one_wall_top !== undefined) {
    checkFail('only_one_wall_top uses string bool form',
      proc.only_one_wall_top === '0' || proc.only_one_wall_top === '1', String(proc.only_one_wall_top));
  }

  // — Array wrapping form vs golden (per-key, where both sides have the key) —
  let arrayFormMismatch = 0, elementCountDelta = 0;
  Object.keys(proc).forEach(k => {
    if (!(k in goldenProcess)) return;
    const a = Array.isArray(proc[k]), g = Array.isArray(goldenProcess[k]);
    if (a !== g) { arrayFormMismatch++; WARN(`array-form mismatch on "${k}"`, `app ${a ? 'array' : 'scalar'} vs golden ${g ? 'array' : 'scalar'}`); }
    else if (a && g && proc[k].length !== goldenProcess[k].length) elementCountDelta++;
  });
  if (!arrayFormMismatch) PASS('array/scalar form agrees with golden for all shared process keys');
  checkFail('array element count matches golden (dual-extruder-variant schema)', elementCountDelta === 0,
    `${elementCountDelta} shared keys where element count differs from golden (Export P2: app now emits the 7-key dual ["v","v"] form)`);

  // — Export P2 dual-variant contract (three explicit guards; Codex round-2 finding 5:
  //   the shared-key loop above iterates PROCESS keys only and never sees filament) —
  const DUAL_ALLOWLIST = ['outer_wall_speed', 'inner_wall_speed', 'initial_layer_speed',
    'top_surface_speed', 'gap_infill_speed', 'outer_wall_acceleration', 'initial_layer_acceleration'];
  const emittedDual = Object.keys(proc).filter(k => Array.isArray(proc[k]) && proc[k].length === 2).sort();
  checkFail('emitted 2-element process arrays equal exactly the 7-key allowlist (both directions)',
    JSON.stringify(emittedDual) === JSON.stringify([...DUAL_ALLOWLIST].sort()),
    `emitted dual: ${JSON.stringify(emittedDual)} vs allowlist ${JSON.stringify([...DUAL_ALLOWLIST].sort())}`);
  const filTempKeys = ['nozzle_temperature', 'nozzle_temperature_initial_layer'];
  checkFail('filament temps stay 1-element AND golden 2nd entries are "nil" (schema self-check)',
    filTempKeys.every(k => Array.isArray(fil[k]) && fil[k].length === 1
      && Array.isArray(goldenFilament[k]) && goldenFilament[k][1] === 'nil'),
    filTempKeys.map(k => `app.${k}=${JSON.stringify(fil[k])} golden.${k}=${JSON.stringify(goldenFilament[k])}`).join('; '));
  checkFail('variant-name/id keys are never emitted (machine-inferred by BS)',
    !('print_extruder_variant' in proc) && !('filament_extruder_variant' in fil) && !('print_extruder_id' in proc),
    `present: ${['print_extruder_variant' in proc && 'print_extruder_variant', 'filament_extruder_variant' in fil && 'filament_extruder_variant', 'print_extruder_id' in proc && 'print_extruder_id'].filter(Boolean).join(', ')}`);

  // — Key inventory: app keys the golden lacks (user presets are sparse = expected) —
  const appOnly = Object.keys(proc).filter(k => !(k in goldenProcess));
  INFO(`process keys emitted by app but absent from (sparse) golden: ${appOnly.length}`, appOnly.slice(0, 8).join(', ') + (appOnly.length > 8 ? ', …' : ''));

  // — Contested claim: zig-zag validity for internal_solid_infill_pattern —
  const validInternal = caps.slicers.bambu_studio.internal_solid_infill_patterns;
  checkFail('exported internal_solid_infill_pattern is capability-valid (zig-zag contested claim)',
    validInternal.includes(proc.internal_solid_infill_pattern),
    `exported "${proc.internal_solid_infill_pattern}" not in ${JSON.stringify(validInternal)}`);
  // A-review M1: the zig-zag→rectilinear change is DELIBERATE (export now matches
  // the displayed value + the data's canonical); pin it so it can never silently
  // flip back or drift again. Owner import test verifies BS shows Rectilinear.
  checkFail('internal_solid export equals the data canonical (deliberate zig-zag→rectilinear, pinned)',
    proc.internal_solid_infill_pattern === 'rectilinear', proc.internal_solid_infill_pattern);
  INFO('capability note', `BS internal-solid valid set = ${JSON.stringify(validInternal)} — NO "monotonic"; IMPL-036's fine-surface "monotonic" must map per-slicer via mapForSlicer`);

  // — A-review S1: generic sidecar drift guard — every BAMBU_PROCESS_MAP param
  //   that carries a _slicer_value must export EXACTLY that value (the former
  //   special-case handlers, key-by-key, no exceptions) —
  {
    const MAP = { // engineKey → bs key (mirror of BAMBU_PROCESS_MAP's string-param rows)
      seam_position: 'seam_position', order_of_walls: 'wall_infill_order',
      wall_generator: 'wall_generator', arc_fitting: 'enable_arc_fitting',
      avoid_crossing_walls: 'reduce_crossing_wall', only_one_wall_top: 'only_one_wall_top',
      sparse_infill_pattern: 'sparse_infill_pattern', top_surface_pattern: 'top_surface_pattern',
      bottom_surface_pattern: 'bottom_surface_pattern', internal_solid_infill_pattern: 'internal_solid_infill_pattern',
      infill_combination: 'infill_combination', support_type: 'support_type',
      support_style: 'support_style', support_interface_pattern: 'support_interface_pattern',
      ironing: 'ironing_type', slow_down_tall: 'enable_height_slowdown',
      draft_shield: 'enable_draft_shield', brim_width: 'brim_width',
    };
    const sidecarStates = [
      st,
      stateFor('x1c', 'pla_basic', 'std_0.4', { surface: 'fine', useCase: ['decorative'], support: 'easy', seam: 'sharpest_corner' }),
      stateFor('p1s', 'petg_basic', 'std_0.4', { support: 'best_underside', brim: 'mouse_ears', speed: 'fast' }),
    ];
    let sidecarChecked = 0, sidecarBad = 0;
    sidecarStates.forEach(s2 => {
      const pr = Engine.resolveProfile(Object.assign({ surface: 'standard', strength: 'standard', speed: 'balanced', environment: 'normal' }, s2));
      const ex = Engine.exportBambuStudioJSON(s2);
      if (!ex) return;
      Object.entries(MAP).forEach(([ek, bk]) => {
        const param = pr[ek];
        if (!param || param._slicer_value == null) return;
        sidecarChecked++;
        const exported = Array.isArray(ex.process[bk]) ? ex.process[bk][0] : ex.process[bk];
        if (exported !== param._slicer_value) {
          sidecarBad++;
          FAIL(`sidecar drift: ${ek}→${bk}`, `exported ${JSON.stringify(exported)} vs sidecar ${JSON.stringify(param._slicer_value)}`);
        }
      });
    });
    checkFail(`sidecar passthrough exact for all string params (${sidecarChecked} checks across 3 states)`, sidecarBad === 0);
  }

  // — A-review S2: support_style 5-map hard assertions —
  const styleCase = (extra, want) => {
    const ex = Engine.exportBambuStudioJSON(stateFor('x1c', 'pla_basic', 'std_0.4', extra));
    checkFail(`support_style map: ${JSON.stringify(extra.useCase || [])}/${extra.support} → ${want}`,
      ex && ex.process.support_style === want, ex ? ex.process.support_style : 'null');
  };
  styleCase({ useCase: ['decorative'], support: 'easy' }, 'tree_slim');
  styleCase({ useCase: ['functional'], support: 'easy' }, 'tree_strong');
  styleCase({ useCase: ['prototype'], support: 'balanced' }, 'tree_hybrid');
  styleCase({ useCase: ['functional'], support: 'best_underside' }, 'default');

  // — Drift guards: exported value == resolved-profile value —
  const profile = Engine.resolveProfile(st);
  const adv = Engine.getAdvancedFilamentSettings(st);
  const driftPairs = [
    ['layer_height', num(proc.layer_height), num(profile.layer_height && profile.layer_height.value)],
    ['wall_loops', num(proc.wall_loops), num(profile.wall_loops && profile.wall_loops.value)],
    ['top_shell_layers', num(proc.top_shell_layers), num(profile.top_shell_layers && profile.top_shell_layers.value)],
    ['sparse_infill_density', num(proc.sparse_infill_density), num(profile.sparse_infill_density && profile.sparse_infill_density.value)],
    ['outer_wall_speed', num(proc.outer_wall_speed), num(profile.outer_wall_speed && profile.outer_wall_speed.value)],
    ['nozzle_temperature (filament vs adv other-layers)', num(fil.nozzle_temperature), num(adv.other_layers_temp)],
    ['nozzle_temperature_initial_layer', num(fil.nozzle_temperature_initial_layer), num(adv.initial_layer_temp)],
    ['hot_plate_temp', num(fil.hot_plate_temp), num(adv.other_layers_bed_temp)],
    ['fan_max_speed', num(fil.fan_max_speed), num(adv.fan_max_speed && adv.fan_max_speed.value)],
  ];
  driftPairs.forEach(([name, exported, resolved]) => {
    checkFail(`drift guard: ${name}`, exported != null && exported === resolved,
      `exported ${exported} vs resolved ${resolved}`);
  });

  // — HIGH-001: retraction must be the engine's SCALED value —
  const resolvedRetraction = num(profile.retraction_distance && profile.retraction_distance.value);
  checkFail('drift guard: filament_retraction_length equals resolved (scaled) retraction [HIGH-001]',
    num(fil.filament_retraction_length) === resolvedRetraction,
    `exported ${num(fil.filament_retraction_length)} vs resolved ${resolvedRetraction}`);

  // HIGH-001 across a state where scaling is guaranteed non-identity (0.2 precision nozzle)
  const st2 = stateFor('x1c', 'pla_basic', 'prc_0.2');
  const exp2 = Engine.exportBambuStudioJSON(st2);
  const prof2 = Engine.resolveProfile(st2);
  const scaled2 = num(prof2.retraction_distance && prof2.retraction_distance.value);
  checkFail('drift guard: retraction scaled on 0.2 nozzle [HIGH-001 non-identity case]',
    exp2 && num(exp2.filament.filament_retraction_length) === scaled2,
    exp2 ? `exported ${num(exp2.filament.filament_retraction_length)} vs resolved ${scaled2}` : 'export null');

  // — Ironing pattern export (IMPL-036 3a) — fine surface enables ironing —
  const st3 = stateFor('x1c', 'pla_basic', 'std_0.4', { surface: 'fine' });
  const exp3 = Engine.exportBambuStudioJSON(st3);
  checkFail('ironing_pattern exported when ironing active (IMPL-036 3a)',
    exp3 && exp3.process.ironing_pattern !== undefined,
    'ironing_pattern key absent from process export');

  // — support_style map breadth (IMPL-036 3d) — decorative tree case —
  const st4 = stateFor('x1c', 'pla_basic', 'std_0.4', { useCase: ['decorative'], support: 'easy' });
  const exp4 = Engine.exportBambuStudioJSON(st4);
  INFO('support_style on decorative+tree (5-option map lands in A-P1)',
    exp4 ? `exports "${exp4.process.support_style}"` : 'export null');

  // ═══ PrusaSlicer (fixture validation only — .ini export is Phase 4) ═════
  console.log('\n# Export audit — PrusaSlicer (fixture parse + inventory; serializer is Phase 4)\n');
  const ini = fs.readFileSync(path.join(GOLDEN, 'prusa-coreone-config.ini'), 'utf8');
  const kv = {};
  ini.split(/\r?\n/).forEach(line => {
    const m = line.match(/^([a-zA-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) kv[m[1]] = m[2];
  });
  checkFail('prusa config parses to a full key inventory (>300 settings)',
    Object.keys(kv).length > 300, `${Object.keys(kv).length} keys`);
  checkFail('prusa reference print preset recorded (versions.md)',
    (kv.print_settings_id || '').includes('0.20mm SPEED'), kv.print_settings_id);
  checkFail('prusa reference filament preset recorded (versions.md)',
    (kv.filament_settings_id || '').includes('Generic ABS'), kv.filament_settings_id);
  INFO('prusa key inventory captured for the Phase 4 key map', `${Object.keys(kv).length} keys, e.g. retract_length=${kv.retract_length}, temperature=${kv.temperature}, first_layer_temperature=${kv.first_layer_temperature}`);

  finish();
}

function finish() {
  console.log(`\n# Summary: ${fails} FAIL / ${warns} warn / ${infos} info`);
  if (fails) {
    console.log('FAIL-class findings are live export defects (expected pre-IMPL-043-P1; must be zero after).');
    process.exitCode = 1;
  } else {
    console.log('All drift guards green.');
  }
}

main().catch(e => { console.error('export-audit failed:', e); process.exit(1); });
