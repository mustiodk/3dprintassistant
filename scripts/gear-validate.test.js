#!/usr/bin/env node
// ─── Tests for gear-validate.js (Train 1 — My Gear, Task 5) ──────────────────
//
// Run: node scripts/gear-validate.test.js
//
// Exit 0 on all-green, 1 on any failure.
//
// gear-validate.js is the CONTENT half of the gear model: gear-store.js
// validates shape and never imports the engine, this module validates values
// against catalogs and filter metadata that the CALLER injects. Nothing here
// requires the engine either — the fixtures below are hand-built stand-ins for
// `Engine.getFilters(state)` and the four catalog Sets, which is what keeps the
// no-engine-import property provable by grep on both files.
//
// Every assertion here encodes a ratified decision from
// docs/superpowers/specs/2026-08-20-gear-model-v2-spec.md (§2.4, §3.1–§3.3) or
// a MUST-FIX from the plan's cross-model gate. Do not weaken one to make an
// implementation pass.

const { loadBrowserScript } = require('./load-browser-script.js');

const {
  inspectGear, applyGearToState, gearDisplayName,
  gearDerivedBrandIds, gearDerivedPrinterIds,
} = loadBrowserScript('gear-validate.js', [
  'inspectGear', 'applyGearToState', 'gearDisplayName',
  'gearDerivedBrandIds', 'gearDerivedPrinterIds',
]);

let failures = 0;

function check(name, cond, detail) {
  if (cond) {
    console.log(`  ok   ${name}`);
  } else {
    console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`);
    failures++;
  }
}

console.log('# gear-validate.js tests\n');

const CAT = { printers: new Set(['x1c','a1']), materials: new Set(['pla_basic']),
              nozzles: new Set(['std_0.4']), plates: new Set(['textured_pei']) };
const FILTERS = [
  { key: 'printer',  multi: false, items: [{ id: 'x1c' }, { id: 'a1' }] },
  { key: 'material', multi: false, items: [{ id: 'pla_basic' }] },
  { key: 'useCase',  multi: true,  items: [{ id: 'functional' }, { id: 'decorative' }, { id: 'large' }] },
  { key: 'surface',  multi: false, items: [{ id: 'fine' }, { id: 'standard' }] },
  { key: 'profileMode', multi: false, items: [{ id: 'safe' }, { id: 'tuned' }, { id: 'mine' }] },
];
const META = { filters: FILTERS, mineAvailable: () => false };
function gear(fields, labels) {
  return { id: 'g', name: 'G', fields, labels: labels || {},
           created_at: '2020-01-01T00:00:00.000Z', updated_at: '2020-01-01T00:00:00.000Z',
           last_used_at: null, archived_at: null, invalid: false };
}

// V1 — everything resolves
{
  const r = inspectGear(gear({ printer: 'x1c', material: 'pla_basic' }), CAT, META);
  check('V1 state ok', r.state === 'ok');
  check('V1 resolved carries the fields', r.resolved.printer === 'x1c');
}

// V2 — an unknown CATALOG id is stale and left UNSET so the wizard asks
{
  const r = inspectGear(gear({ printer: 'retired', material: 'pla_basic' }), CAT, META);
  check('V2 state stale', r.state === 'stale');
  check('V2 the unknown field is left unset', !('printer' in r.resolved));
  check('V2 the known field still resolves', r.resolved.material === 'pla_basic');
  check('V2 a note names the key', r.notes.some(n => n.key === 'printer' && n.reason === 'unknown-id'));
}

// V3 — an unknown ENUM value is ALSO stale (gate MUST-FIX 6)
{
  const r = inspectGear(gear({ printer: 'x1c', surface: 'retired_finish' }), CAT, META);
  check('V3 a disappeared enum value is stale, not applied blindly', r.state === 'stale');
  check('V3 and left unset', !('surface' in r.resolved));
}

// V4 — UNKNOWN KEYS are preserved at rest but NOT applied (gate MUST-FIX 5)
{
  const r = inspectGear(gear({ printer: 'x1c', some_future_key: 'v' }), CAT, META);
  check('V4 an unknown key never reaches resolved', !('some_future_key' in r.resolved));
  check('V4 and does not make the gear stale', r.state === 'ok');
  check('V4 but it is noted so it can be surfaced', r.notes.some(n => n.key === 'some_future_key'));
}

// V5 — profileMode 'mine' is a per printer+material predicate, after coercion
{
  const g = gear({ printer: 'x1c', material: 'pla_basic', profileMode: 'mine' });
  const r = inspectGear(g, CAT, META);
  check('V5 state degraded', r.state === 'degraded');
  check('V5 applied value is safe', r.resolved.profileMode === 'safe');
  check('V5 the downgrade is reported, never silent',
    r.notes.some(n => n.key === 'profileMode' && n.reason === 'mine-unavailable'));

  let seen = null;
  const metaYes = { filters: FILTERS, mineAvailable: (p, m) => { seen = [p, m]; return true; } };
  const r2 = inspectGear(g, CAT, metaYes);
  check('V5 mine survives when tuning exists for the pair', r2.resolved.profileMode === 'mine');
  check('V5 the predicate received the gear pair, not globals',
    seen && seen[0] === 'x1c' && seen[1] === 'pla_basic');
}

// V6 — cardinality coercion. NOT vacuous: each branch asserts the exact value.
{
  const r = inspectGear(gear({ printer: 'x1c', useCase: 'functional' }), CAT, META);
  check('V6 single -> array for a multi key',
    Array.isArray(r.resolved.useCase) && r.resolved.useCase.join(',') === 'functional');
  check('V6 widening is lossless so state stays ok', r.state === 'ok');
}
{
  const r = inspectGear(gear({ printer: 'x1c', surface: ['fine','standard'] }), CAT, META);
  check('V6 array -> single takes the first', r.resolved.surface === 'fine');
  check('V6 narrowing loses information so state degrades', r.state === 'degraded');
  check('V6 and says why', r.notes.some(n => n.key === 'surface' && n.reason === 'cardinality-narrowed'));
}

// V7 — multi values are re-ordered to ENGINE item order at apply time
{
  const r = inspectGear(gear({ printer: 'x1c', useCase: ['large','decorative','functional'] }), CAT, META);
  check('V7 engine order, not the bytewise at-rest order',
    r.resolved.useCase.join(',') === 'functional,decorative,large');
}

// V7b — the validation ORDER is discriminating, not just the prose.
// Membership must run BEFORE cardinality, and the conditional AFTER it.
{
  const r = inspectGear(gear({ printer: 'x1c', surface: ['fine','retired_finish'] }), CAT, META);
  check('V7b membership runs before cardinality — a bad member makes it stale',
    r.state === 'stale', 'if cardinality ran first it would narrow to "fine" and report ok');
  check('V7b and the field is left unset', !('surface' in r.resolved));
}
{
  // 'mine' arrives as a single-element ARRAY. If the conditional ran before
  // coercion it would compare against ['mine'] and never match, silently
  // leaving an array in a single-valued field.
  let seen = null;
  const meta = { filters: FILTERS, mineAvailable: (p, m) => { seen = [p, m]; return false; } };
  const r = inspectGear(gear({ printer: 'x1c', material: 'pla_basic', profileMode: ['mine'] }), CAT, meta);
  check('V7b conditional runs AFTER coercion — it saw the coerced pair', seen !== null);
  check('V7b and produced the scalar fallback, not an array', r.resolved.profileMode === 'safe');
}

// V8 — [] survives as pinned-as-none
{
  const r = inspectGear(gear({ printer: 'x1c', useCase: [] }), CAT, META);
  check('V8 [] reaches resolved as an empty array',
    Array.isArray(r.resolved.useCase) && r.resolved.useCase.length === 0);
}

// V9 — display name. NOT vacuous: no `|| g.name` escape hatch.
{
  check('V9 the user name wins when set', gearDisplayName(gear({ printer: 'x1c' })) === 'G');
  const unnamed = gear({ printer: 'retired' }, { printer: 'Retired Printer', nozzle: '0.4 Standard' });
  unnamed.name = '';
  check('V9 falls back to labels when the name is empty',
    gearDisplayName(unnamed) === 'Retired Printer · 0.4 Standard');
  const bare = gear({ printer: 'x1c' }); bare.name = ''; bare.labels = {};
  check('V9 and to a constant when there is nothing at all', bare.name === '' && gearDisplayName(bare).length > 0);
}

// V10 — apply resets unpinned fields, then performs bookkeeping IN ORDER
{
  const calls = [];
  const state = { printer: 'old', material: 'old_mat', surface: 'fine', useCase: ['x'] };
  applyGearToState({ printer: 'x1c', material: 'pla_basic' }, state, {
    resetFields: () => { calls.push('reset'); state.printer = null; state.material = null;
                         state.surface = null; state.useCase = []; },
    setActiveSlicer: id => calls.push('slicer:' + id),
    getSlicerForPrinter: p => (p === 'x1c' ? 'bambu_studio' : 'orcaslicer'),
    setExpandedBrand: b => calls.push('brand:' + b),
    collapsePicker: () => calls.push('collapse'),
    printerRow: id => ({ id, manufacturer: 'bambu_lab', brand: 'WRONG' }),
  });
  check('V10 reset ran FIRST', calls[0] === 'reset');
  check('V10 an unpinned field was cleared, so the wizard will ask', state.surface === null);
  check('V10 pinned fields applied', state.printer === 'x1c' && state.material === 'pla_basic');
  check('V10 slicer receives a SLICER id, not a printer id', calls.indexOf('slicer:bambu_studio') !== -1);
  check('V10 expanded brand comes from manufacturer, not brand', calls.indexOf('brand:bambu_lab') !== -1);
  check('V10 picker collapsed last', calls[calls.length - 1] === 'collapse');
}

// V11 — derived ownership (D10): brands AND printers, never stored
{
  const rows = { x1c: { manufacturer: 'bambu_lab' }, mk4: { manufacturer: 'prusa' } };
  const gears = [gear({ printer: 'x1c' }), gear({ printer: 'mk4' }), gear({ printer: 'x1c' })];
  const brands = gearDerivedBrandIds(gears, id => rows[id] || null);
  check('V11 derives both brands', brands.indexOf('bambu_lab') !== -1 && brands.indexOf('prusa') !== -1);
  check('V11 deduplicates', brands.length === 2);
  check('V11 an unknown printer is skipped, not thrown on',
    gearDerivedBrandIds([gear({ printer: 'ghost' })], id => rows[id] || null).length === 0);
  check('V11 brands are exactly the two, in first-seen order', brands.join(',') === 'bambu_lab,prusa');
  const printers = gearDerivedPrinterIds(gears);
  check('V11 derives printer ids too (D10 says printers, not only brands)',
    printers.join(',') === 'x1c,mk4');
}

// V12 — `degraded` means information was LOST, not merely that a coercion ran.
// Spec §2.4 says "array->single takes the first and marks the gear degraded";
// §3.1 DEFINES degraded as a coercion that "lost information". They disagree
// for a one-element array. §3.1 is the definition, so it wins: the coercion is
// still reported via a note, but the gear is not flagged as adjusted when it
// applied exactly as saved.
{
  const r1 = inspectGear(gear({ printer: 'x1c', surface: ['fine'] }), CAT, META);
  check('V12 a lossless one-element narrowing resolves to the scalar', r1.resolved.surface === 'fine');
  check('V12 and does NOT degrade the gear', r1.state === 'ok',
    'nothing was discarded, so the user must not be told their gear was adjusted');
  check('V12 but the coercion is still reported, never silent',
    r1.notes.some(n => n.key === 'surface'));

  const r2 = inspectGear(gear({ printer: 'x1c', surface: ['fine', 'standard'] }), CAT, META);
  check('V12 a LOSSY narrowing still degrades', r2.state === 'degraded');
  check('V12 and takes the first value', r2.resolved.surface === 'fine');
  check('V12 and names the reason', r2.notes.some(n => n.reason === 'cardinality-narrowed'));
}

// V13 — an empty array on a single-valued field stays an empty array.
// `[]` is "pinned as none" and an absent key is "ask me" (spec §2.4). Coercing
// [] to a scalar yields undefined, which collapses the two into one — the exact
// distinction the spec exists to protect. Only a foreign build can produce this
// shape, so it is reported but not treated as a loss.
{
  // SUPERSEDED 2026-08-21 by V15. This originally asserted that `[]` survives
  // into `resolved` on a single-valued field, to keep "pinned as none" distinct
  // from "absent". The cross-model gate traced the consequence: app state has no
  // scalar-none representation, so the array is persisted into a scalar slot and
  // the user is shown an invalid-preset warning. The distinction is preserved AT
  // REST by the store; it simply cannot be carried into app state. Kept as a
  // record of the reversal rather than deleted.
  const r = inspectGear(gear({ printer: 'x1c', surface: [] }), CAT, META);
  check('V13 (superseded) [] is reported rather than silently dropped',
    r.notes.some(n => n.key === 'surface'));
  check('V13 (superseded) and is NOT carried into app state', !('surface' in r.resolved));
}

// V14 — GATE MUST-FIX: 'mine' must degrade with REAL filter metadata.
// engine.js:571 spreads `mine` into profileMode.items ONLY when personal tuning
// exists for that printer|material pair. So when tuning is absent — which is
// exactly the case spec §3.2 is about — `mine` is NOT in items, and a plain
// membership check rejects it as an unknown id and marks the gear stale.
//
// The earlier fixture always listed `mine` while mineAvailable was false, which
// is a state the real engine can never produce. The test passed for the wrong
// reason. These use realistic metadata.
{
  const REAL_NO_TUNING = { filters: [
    { key: 'printer',  multi: false, items: [{ id: 'x1c' }, { id: 'a1' }] },
    { key: 'material', multi: false, items: [{ id: 'pla_basic' }] },
    // no `mine` — the engine omits it when there is no tuning for the pair
    { key: 'profileMode', multi: false, items: [{ id: 'safe' }, { id: 'tuned' }] },
  ], mineAvailable: () => false };

  const REAL_WITH_TUNING = { filters: [
    { key: 'printer',  multi: false, items: [{ id: 'x1c' }, { id: 'a1' }] },
    { key: 'material', multi: false, items: [{ id: 'pla_basic' }] },
    { key: 'profileMode', multi: false, items: [{ id: 'safe' }, { id: 'tuned' }, { id: 'mine' }] },
  ], mineAvailable: () => true };

  const g = gear({ printer: 'x1c', material: 'pla_basic', profileMode: 'mine' });

  const r = inspectGear(g, CAT, REAL_NO_TUNING);
  check('V14 a gear pinning mine with no tuning DEGRADES, not stale', r.state === 'degraded',
    'got ' + r.state + ' — membership rejected a conditional value before the conditional ran');
  check('V14 and applies safe', r.resolved.profileMode === 'safe');
  check('V14 and says why', r.notes.some(n => n.key === 'profileMode' && n.reason === 'mine-unavailable'));

  const r2 = inspectGear(g, CAT, REAL_WITH_TUNING);
  check('V14 mine survives when the engine offers it and tuning exists',
    r2.state === 'ok' && r2.resolved.profileMode === 'mine');

  // A genuinely unknown profileMode value is still stale.
  const bad = gear({ printer: 'x1c', material: 'pla_basic', profileMode: 'invented' });
  const r3 = inspectGear(bad, CAT, REAL_NO_TUNING);
  check('V14 an actually-unknown profileMode is still stale', r3.state === 'stale');
  check('V14 and is left unset', !('profileMode' in r3.resolved));
}

// V15 — GATE MUST-FIX: [] on a single-valued field must not reach app state.
// state-codec.js:28 declares `surface` kind:'single'. Applying surface:[] would
// persist an array in a scalar slot, URL-encode it as `sq=`, make
// resolveProfile fall back to 'standard', and make getWarnings (engine.js:1663)
// report an INVALID PRESET to the user. The distinction between "pinned as
// none" and "absent" is preserved AT REST by the store; app state has no
// representation for it, so `resolved` must not carry it.
{
  const r = inspectGear(gear({ printer: 'x1c', surface: [] }), CAT, META);
  check('V15 [] on a single-valued field is NOT applied to state',
    !('surface' in r.resolved),
    'an array in a scalar slot triggers a bogus invalid-preset warning downstream');
  check('V15 and it is reported rather than silent',
    r.notes.some(n => n.key === 'surface'));
  check('V15 and the gear is not marked stale for it', r.state !== 'stale');
  // On a MULTI field, [] is meaningful and must survive.
  const r2 = inspectGear(gear({ printer: 'x1c', useCase: [] }), CAT, META);
  check('V15 [] on a multi field still survives as pinned-as-none',
    Array.isArray(r2.resolved.useCase) && r2.resolved.useCase.length === 0);
}

// V16 — GATE SHOULD-FIX: apply must not alias arrays into app state, and must
// not leave state half-applied when a dependency throws.
{
  const resolved = { printer: 'x1c', useCase: ['functional'] };
  const state = { printer: null, useCase: [] };
  applyGearToState(resolved, state, {
    resetFields: () => { state.printer = null; state.useCase = []; },
    setActiveSlicer: () => {}, getSlicerForPrinter: () => 'bambu_studio',
    setExpandedBrand: () => {}, collapsePicker: () => {},
    printerRow: () => ({ manufacturer: 'bambu_lab' }),
  });
  state.useCase.push('decorative');
  check('V16 state arrays are copies, not aliases of resolved',
    resolved.useCase.length === 1,
    'pushing to state.useCase mutated the caller-owned resolved object');
}
{
  const state = { printer: 'old', surface: 'fine' };
  const snapshot = JSON.stringify(state);
  let threw = false;
  try {
    applyGearToState({ printer: 'x1c' }, state, {
      resetFields: () => { state.printer = null; state.surface = null; },
      setActiveSlicer: () => {},
      getSlicerForPrinter: () => { throw new Error('engine unavailable'); },
      setExpandedBrand: () => {}, collapsePicker: () => {},
      printerRow: () => ({ manufacturer: 'bambu_lab' }),
    });
  } catch (_) { threw = true; }
  check('V16 a throwing dependency does not leave state half-applied',
    threw === false && state.printer === 'x1c',
    'state=' + JSON.stringify(state) + ' snapshot=' + snapshot);
}

// V17 — GATE R2 MUST-FIX: the conditional-value exemption must not be a
// prototype-chain hole. CONDITIONAL_VALUES was a plain object literal, so
// CONDITIONAL_VALUES.profileMode['toString'] was truthy via Object.prototype —
// and because this table EXEMPTS a value from membership, every inherited
// property name bypassed validation and applied as `ok`.
//
// Same defect class closed in gear-store.js earlier the same day and
// reintroduced here.
{
  const REAL = { filters: [
    { key: 'printer',  multi: false, items: [{ id: 'x1c' }] },
    { key: 'material', multi: false, items: [{ id: 'pla_basic' }] },
    { key: 'profileMode', multi: false, items: [{ id: 'safe' }, { id: 'tuned' }] },
  ], mineAvailable: () => false };

  ['toString', 'constructor', 'hasOwnProperty', '__proto__', 'valueOf'].forEach(name => {
    const r = inspectGear(gear({ printer: 'x1c', material: 'pla_basic', profileMode: name }), CAT, REAL);
    check('V17 "' + name + '" does not bypass membership', r.state === 'stale',
      'got ' + r.state + ' resolved=' + JSON.stringify(r.resolved.profileMode));
    check('V17 "' + name + '" is left unset', !('profileMode' in r.resolved));
  });

  // and the genuine conditional value still works
  const ok = inspectGear(gear({ printer: 'x1c', material: 'pla_basic', profileMode: 'mine' }), CAT, REAL);
  check('V17 the real conditional value still degrades to safe',
    ok.state === 'degraded' && ok.resolved.profileMode === 'safe');
}

// V18 — GATE R2 SHOULD-FIX: a throwing dep must not abort the remaining
// bookkeeping or leave the picker contradicting app state.
{
  const calls = [];
  const state = { printer: 'old' };
  let threw = false;
  try {
    applyGearToState({ printer: 'x1c' }, state, {
      resetFields: () => { calls.push('reset'); state.printer = null; },
      getSlicerForPrinter: () => 'bambu_studio',
      setActiveSlicer: () => { calls.push('slicer'); throw new Error('boom'); },
      printerRow: () => ({ manufacturer: 'bambu_lab' }),
      setExpandedBrand: () => calls.push('brand'),
      collapsePicker: () => calls.push('collapse'),
    });
  } catch (_) { threw = true; }
  check('V18 a throwing setter does not propagate', threw === false);
  check('V18 state is still fully applied', state.printer === 'x1c');
  check('V18 and the remaining bookkeeping still ran',
    calls.indexOf('brand') !== -1 && calls[calls.length - 1] === 'collapse',
    'calls=' + calls.join(','));
}

// V19 — GATE R3 MUST-FIX: resetFields is NOT optional bookkeeping.
// A previous revision wrapped every dep in a try/catch. That was a REGRESSION
// for this one: resetFields clears the previous run's unpinned answers, and
// "unset fields mean the wizard asks" (spec §3.3) depends on it. Swallowing a
// throw merged the gear on top of stale answers and then routed the slicer and
// collapsed the picker as if nothing were wrong.
{
  const state = { printer: 'old', material: 'old_mat', surface: 'fine', useCase: ['old'] };
  const calls = [];
  let threw = false;
  try {
    applyGearToState({ printer: 'x1c', material: 'pla_basic' }, state, {
      resetFields: () => { throw new Error('reset unavailable'); },
      getSlicerForPrinter: () => 'bambu_studio',
      setActiveSlicer: () => calls.push('slicer'),
      printerRow: () => ({ manufacturer: 'bambu_lab' }),
      setExpandedBrand: () => calls.push('brand'),
      collapsePicker: () => calls.push('collapse'),
    });
  } catch (_) { threw = true; }
  check('V19 a throwing resetFields propagates rather than being swallowed', threw === true);
  check('V19 and the gear is NOT merged on top of stale answers',
    state.surface === 'fine' && state.printer === 'old',
    'state=' + JSON.stringify(state));
  check('V19 and no bookkeeping ran', calls.length === 0, 'calls=' + calls.join(','));
}

// V20 — GATE R3: caller-boundary reads use own properties everywhere.
// This defect class has now recurred five times across the two gear files in
// one day, each time in different syntax. These probes cover every site the
// gate identified rather than the one that happened to be found.
{
  // (a) inherited catalog Set must not validate an id the caller never offered
  const protoCat = Object.create({ printers: new Set(['proto_printer']) });
  protoCat.materials = new Set(['pla_basic']);
  protoCat.nozzles = new Set();
  protoCat.plates = new Set();
  const r = inspectGear(gear({ printer: 'proto_printer' }), protoCat, META);
  check('V20a an inherited catalog Set does not validate an id', r.state === 'stale');
  check('V20a and the field is left unset', !('printer' in r.resolved));

  // (b) inherited filter metadata must not be accepted as a real declaration
  const protoFilter = Object.create({ key: 'surface', items: [{ id: 'ghost' }], multi: false });
  const metaProto = { filters: [
    { key: 'printer', multi: false, items: [{ id: 'x1c' }] },
    protoFilter,
  ], mineAvailable: () => false };
  const r2 = inspectGear(gear({ printer: 'x1c', surface: 'ghost' }), CAT, metaProto);
  check('V20b an inherited filter key is not a real filter', !('surface' in r2.resolved));

  // (c) inherited array indexes must not become values
  const sparse = [];
  sparse.length = 1;                       // no own index 0
  Object.setPrototypeOf(sparse, Object.assign(Object.create(Array.prototype), { 0: 'functional' }));
  const r3 = inspectGear(gear({ printer: 'x1c', useCase: sparse }), CAT, META);
  check('V20c an inherited array element is not resolved',
    !('useCase' in r3.resolved) || r3.resolved.useCase.indexOf('functional') === -1,
    'resolved=' + JSON.stringify(r3.resolved.useCase));

  // (d) a reserved key in `resolved` must not replace state's prototype
  const state = { printer: null };
  const hostile = Object.create(null);
  hostile.printer = 'x1c';
  hostile.__proto__ = ['polluted'];        // own property on a null-proto object
  applyGearToState(hostile, state, {
    resetFields: () => {}, getSlicerForPrinter: () => 'bambu_studio',
    setActiveSlicer: () => {}, printerRow: () => ({ manufacturer: 'bambu_lab' }),
    setExpandedBrand: () => {}, collapsePicker: () => {},
  });
  check('V20d a reserved key does not replace state prototype',
    Object.getPrototypeOf(state) === Object.prototype);
  check('V20d and the legitimate field still applied', state.printer === 'x1c');
}

console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASS');
  process.exit(0);
} else {
  console.log(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
