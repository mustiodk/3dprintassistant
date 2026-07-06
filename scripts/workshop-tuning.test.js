#!/usr/bin/env node
// ─── Tests for workshop-tuning.js (IMPL-044 W3, gate B3) ─────────────────────
//
// Run: node scripts/workshop-tuning.test.js
// Exit 0 on all-green, 1 on any failure.
//
// Fixtures are raw envelope JSON written into a mock storage so journal DATES
// are fully controlled (the store stamps _now() on live writes — fine for the
// app, useless for ordering tests). engineFacts is a stub — the module must
// never load the engine.

const path = require('path');
const ROOT = path.join(__dirname, '..');
const { createWorkshopStore } = require(path.join(ROOT, 'workshop-store.js'));
const { TUNING_RULES, rulesForSymptom } = require(path.join(ROOT, 'workshop-tuning-rules.js'));
const { createWorkshopTuning } = require(path.join(ROOT, 'workshop-tuning.js'));

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log(`  ok   ${name}`);
  else { console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); failures++; }
}

function mockStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
  };
}

let _oid = 0;
function out(result, symptoms, date) {
  return { id: 'o' + (++_oid), result, symptoms: symptoms || [], note: '', date };
}
function prof(id, printer, material, nozzle, journal) {
  return { id, name: id, state: { printer, material, nozzle, environment: 'normal' }, journal: journal || [] };
}
function mk(profiles, tuning) {
  const env = { v: 1, profiles };
  if (tuning) env.tuning = tuning;
  const store = createWorkshopStore(mockStorage({ '3dpa_workshop_v1': JSON.stringify(env) }));
  const facts = {
    materialGroup: id => ({ pla_basic: 'PLA', tpu_95a: 'TPU', petg_basic: 'PETG' }[id] || null),
    printerExists: id => ['x1c', 'a1'].includes(id),
    materialExists: id => ['pla_basic', 'tpu_95a', 'petg_basic'].includes(id),
    symptomName: id => id,
  };
  return { store, wt: createWorkshopTuning(store, { TUNING_RULES, rulesForSymptom }, facts) };
}

const D1 = '2026-07-01T10:00:00.000Z', D2 = '2026-07-02T10:00:00.000Z',
      D3 = '2026-07-03T10:00:00.000Z', D4 = '2026-07-04T10:00:00.000Z';

console.log('# workshop-tuning.js tests\n');

// ── TC1 — threshold fires at 2 same-nozzle failures ──
{
  const { wt } = mk([prof('p1', 'x1c', 'pla_basic', 'std_0.4',
    [out('failed', ['stringing'], D1), out('failed', ['stringing'], D2)])]);
  const s = wt.harvest();
  check('fires one offset suggestion', s.length === 1 && s[0].kind === 'offset');
  check('suggestion key', s[0].key === 'x1c|pla_basic|stringing|retraction_distance_delta');
  check('step + unit from rule', s[0].step === 0.2 && s[0].unit === 'mm');
  check('cumulativeAfterAccept', s[0].cumulativeAfterAccept === 0.2);
  check('clamps carried on suggestion', s[0].clampMin === 0 && s[0].clampMax === 0.6);
  check('evidence counts + bucket nozzle', s[0].evidence.failed === 2 && s[0].evidence.nozzles[0] === 'std_0.4');
  check('secondary hints present (PLA: temp only)', s[0].secondaryHints.length === 1);
}

// ── TC2 — 1+1 failures across DIFFERENT nozzles do not fire ──
{
  const { wt } = mk([
    prof('p1', 'x1c', 'pla_basic', 'std_0.4', [out('failed', ['stringing'], D1)]),
    prof('p2', 'x1c', 'pla_basic', 'std_0.8', [out('failed', ['stringing'], D2)]),
  ]);
  check('split nozzles do not fire', wt.harvest().length === 0);
}

// ── TC3 — positive lock-out: newer worked suppresses; older does not ──
{
  const newerWorked = mk([prof('p1', 'x1c', 'pla_basic', 'std_0.4',
    [out('failed', ['stringing'], D1), out('failed', ['stringing'], D2), out('worked', [], D3)])]);
  check('newer worked suppresses', newerWorked.wt.harvest().length === 0);
  const olderWorked = mk([prof('p1', 'x1c', 'pla_basic', 'std_0.4',
    [out('worked', [], D1), out('failed', ['stringing'], D2), out('failed', ['stringing'], D3)])]);
  check('older worked does not suppress', olderWorked.wt.harvest().length === 1);
}

// ── TC4 — dismissal suppresses; a NEWER failure re-surfaces; a newer failure on ANOTHER nozzle does not ──
{
  const dismissed = { accepted: [], dismissed: [{ key: 'x1c|pla_basic|stringing|retraction_distance_delta', date: D3 }] };
  const still = mk([prof('p1', 'x1c', 'pla_basic', 'std_0.4',
    [out('failed', ['stringing'], D1), out('failed', ['stringing'], D2)])], dismissed);
  check('dismissal suppresses', still.wt.harvest().length === 0);
  const resurfaced = mk([prof('p1', 'x1c', 'pla_basic', 'std_0.4',
    [out('failed', ['stringing'], D1), out('failed', ['stringing'], D2), out('failed', ['stringing'], D4)])], dismissed);
  check('newer failure re-surfaces', resurfaced.wt.harvest().length === 1);
  const otherNozzle = mk([
    prof('p1', 'x1c', 'pla_basic', 'std_0.4', [out('failed', ['stringing'], D1), out('failed', ['stringing'], D2)]),
    prof('p2', 'x1c', 'pla_basic', 'std_0.8', [out('failed', ['stringing'], D4)]),
  ], dismissed);
  check('newer failure on another nozzle does NOT re-surface', otherNozzle.wt.harvest().length === 0);
}

// ── TC5 — accept anti-ride: per pair+key+SYMPTOM, until a newer failure ──
{
  const antiRide = { accepted: [{ pairKey: 'x1c|pla_basic', offsetKey: 'retraction_distance_delta', unit: 'mm',
    value: 0.2, clampMin: 0, clampMax: 0.6,
    ops: [{ opId: 'op1', kind: 'accept', step: 0.2, symptomId: 'stringing', date: D3 }] }], dismissed: [] };
  const suppressed = mk([prof('p1', 'x1c', 'pla_basic', 'std_0.4',
    [out('failed', ['stringing'], D1), out('failed', ['stringing'], D2)])], antiRide);
  check('accept suppresses same symptom until new evidence', suppressed.wt.harvest().length === 0);
  const newEvidence = mk([prof('p1', 'x1c', 'pla_basic', 'std_0.4',
    [out('failed', ['stringing'], D1), out('failed', ['stringing'], D2), out('failed', ['stringing'], D4)])], antiRide);
  const s2 = newEvidence.wt.harvest();
  check('newer failure re-enables next step', s2.length === 1 && s2[0].cumulativeAfterAccept === 0.4);
  // per-symptom scope: accepted under_extrusion nozzle offset does not block layer_separation
  const crossSymptom = { accepted: [{ pairKey: 'x1c|pla_basic', offsetKey: 'nozzle_temp_delta', unit: '°C',
    value: 5, clampMin: -15, clampMax: 15,
    ops: [{ opId: 'op2', kind: 'accept', step: 5, symptomId: 'under_extrusion', date: D3 }] }], dismissed: [] };
  const other = mk([prof('p1', 'x1c', 'pla_basic', 'std_0.4',
    [out('failed', ['layer_separation'], D1), out('failed', ['layer_separation'], D2)])], crossSymptom);
  const s3 = other.wt.harvest();
  check('anti-ride is per-symptom (layer_separation still fires)',
    s3.length === 1 && s3[0].symptomId === 'layer_separation');
}

// ── TC6 — clamp stop: cumulative at clamp emits nothing ──
{
  const atClamp = { accepted: [{ pairKey: 'x1c|pla_basic', offsetKey: 'retraction_distance_delta', unit: 'mm',
    value: 0.6, clampMin: 0, clampMax: 0.6,
    ops: [{ opId: 'op1', kind: 'accept', step: 0.6, symptomId: 'stringing', date: D1 }] }], dismissed: [] };
  const { wt } = mk([prof('p1', 'x1c', 'pla_basic', 'std_0.4',
    [out('failed', ['stringing'], D2), out('failed', ['stringing'], D3)])], atClamp);
  check('clamp stop', wt.harvest().length === 0);
}

// ── TC7 — TPU stringing → advice card; first_layer → advice card; tpu_jam scoping ──
{
  const tpu = mk([prof('p1', 'x1c', 'tpu_95a', 'std_0.4',
    [out('failed', ['stringing'], D1), out('failed', ['stringing'], D2)])]);
  const s = tpu.wt.harvest();
  check('TPU stringing is advice', s.length === 1 && s[0].kind === 'advice' && s[0].adviceKey === 'dry_filament');
  const fl = mk([prof('p1', 'x1c', 'pla_basic', 'std_0.4',
    [out('failed', ['first_layer'], D1), out('failed', ['first_layer'], D2)])]);
  const s2 = fl.wt.harvest();
  check('first_layer is advice', s2.length === 1 && s2[0].kind === 'advice' && s2[0].adviceKey === 'first_layer_basics');
  const jam = mk([prof('p1', 'x1c', 'pla_basic', 'std_0.4',
    [out('failed', ['tpu_jam'], D1), out('failed', ['tpu_jam'], D2)])]);
  check('tpu_jam on PLA pair emits nothing', jam.wt.harvest().length === 0);
}

// ── TC8 — contradiction: opposing directions on one key → single conflict card ──
{
  const { wt } = mk([prof('p1', 'x1c', 'pla_basic', 'std_0.4', [
    out('failed', ['under_extrusion'], D1), out('failed', ['under_extrusion'], D2),
    out('failed', ['over_extrusion'], D1), out('failed', ['over_extrusion'], D2),
  ])]);
  const s = wt.harvest();
  check('single conflict card', s.length === 1 && s[0].kind === 'conflict');
  check('conflict names both symptoms',
    s[0].conflictingSymptoms.includes('under_extrusion') && s[0].conflictingSymptoms.includes('over_extrusion'));
  check('conflict key form', s[0].key === 'x1c|pla_basic|conflict|nozzle_temp_delta');
  // conflict is dismissible
  const dis = { accepted: [], dismissed: [{ key: 'x1c|pla_basic|conflict|nozzle_temp_delta', date: D4 }] };
  const { wt: wt2 } = mk([prof('p1', 'x1c', 'pla_basic', 'std_0.4', [
    out('failed', ['under_extrusion'], D1), out('failed', ['under_extrusion'], D2),
    out('failed', ['over_extrusion'], D1), out('failed', ['over_extrusion'], D2),
  ])], dis);
  check('conflict dismissible', wt2.harvest().length === 0);
}

// ── TC9 — unknown ids skipped; W1-era envelope safe ──
{
  const unknown = mk([prof('p1', 'ender99', 'pla_basic', 'std_0.4',
    [out('failed', ['stringing'], D1), out('failed', ['stringing'], D2)])]);
  check('unknown printer pair skipped', unknown.wt.harvest().length === 0);
  const w1 = createWorkshopStore(mockStorage({ '3dpa_workshop_v1':
    '{"v":1,"profiles":[{"id":"old1","name":"L","state":{"printer":"x1c","material":"pla_basic"}}]}' }));
  const facts = { materialGroup: () => 'PLA', printerExists: () => true, materialExists: () => true, symptomName: id => id };
  const wtL = createWorkshopTuning(w1, { TUNING_RULES, rulesForSymptom }, facts);
  check('W1-era envelope harvests without crash', Array.isArray(wtL.harvest()) && wtL.harvest().length === 0);
}

// ── TC10 — accept() forwards clamps + symptom; acceptedFor; revert ──
{
  const { store, wt } = mk([prof('p1', 'x1c', 'pla_basic', 'std_0.4',
    [out('failed', ['stringing'], D1), out('failed', ['stringing'], D2)])]);
  const s = wt.harvest()[0];
  const a = wt.accept(s);
  check('accept ok', a.ok === true);
  const entry = store.getTuning().accepted[0];
  check('accept forwarded clamps', entry.clampMin === 0 && entry.clampMax === 0.6);
  check('accept forwarded symptom', entry.ops[0].symptomId === 'stringing');
  check('acceptedFor exposes cumulative', wt.acceptedFor('x1c', 'pla_basic').retraction_distance_delta.value === 0.2);
  check('acceptedFor empty for other pair', Object.keys(wt.acceptedFor('a1', 'petg_basic')).length === 0);
  wt.revert('x1c|pla_basic', 'retraction_distance_delta');
  check('revert zeroes acceptedFor', Object.keys(wt.acceptedFor('x1c', 'pla_basic')).length === 0);
}

// ── TC11 — PETG stringing carries the fan secondary hint ──
{
  const { wt } = mk([prof('p1', 'a1', 'petg_basic', 'std_0.4',
    [out('failed', ['stringing'], D1), out('failed', ['stringing'], D2)])]);
  const s = wt.harvest();
  check('PETG stringing fires retraction primary', s.length === 1 && s[0].offsetKey === 'retraction_distance_delta');
  check('PETG secondary hints include fan + temp', s[0].secondaryHints.length === 2);
}

console.log(failures ? `\n${failures} FAILURES` : '\nAll green');
process.exit(failures ? 1 : 0);
