#!/usr/bin/env node
// ─── Tests for workshop-store.js (IMPL-044 Phase W1) ─────────────────────────
//
// Run: node scripts/workshop-store.test.js
//
// Exit 0 on all-green, 1 on any failure.
//
// The store is exercised through createWorkshopStore(mockStorage) so quota
// and corruption scenarios are deterministic. No engine needed: the store
// persists opaque state objects; id validation happens at restore time in
// app.js via StateCodec.validateState (covered by state-codec.test.js).

const path = require('path');
const ROOT = path.join(__dirname, '..');

const { createWorkshopStore } = require(path.join(ROOT, 'workshop-store.js'));

let failures = 0;

function check(name, cond, detail) {
  if (cond) {
    console.log(`  ok   ${name}`);
  } else {
    console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`);
    failures++;
  }
}

function mockStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    _map: map,
  };
}

const STATE_A = { printer: 'x1c', material: 'pla_basic', nozzle: 'std_0.4', useCase: ['functional'], profileMode: 'safe' };
const STATE_B = { printer: 'a1', material: 'petg_basic', nozzle: 'std_0.4', useCase: [], surface: 'fine' };

console.log('# workshop-store.js tests\n');

// ── TC1 — save + list round-trip ──
{
  console.log('TC1 — save + list round-trip');
  const ws = createWorkshopStore(mockStorage());
  const r1 = ws.save('Voron PLA brackets', STATE_A);
  const r2 = ws.save('A1 PETG vases', STATE_B);
  check('save returns ok', r1.ok === true && r2.ok === true, JSON.stringify(r1));
  const list = ws.list();
  check('two profiles listed', list.length === 2, `got ${list.length}`);
  check('state preserved deep-equal', JSON.stringify(list[0].state) === JSON.stringify(STATE_A),
    JSON.stringify(list[0].state));
  check('name preserved', list[0].name === 'Voron PLA brackets', list[0].name);
  check('ids unique', list[0].id !== list[1].id, `${list[0].id}`);
  check('created + updated dates present', !!list[0].created && !!list[0].updated);
}

// ── TC2 — rename + delete ──
{
  console.log('TC2 — rename + delete');
  const ws = createWorkshopStore(mockStorage());
  const { profile } = ws.save('Old name', STATE_A);
  ws.save('Keeper', STATE_B);
  check('rename ok', ws.rename(profile.id, 'New name').ok === true);
  check('rename applied', ws.get(profile.id).name === 'New name');
  check('rename unknown id fails', ws.rename('nope', 'x').ok === false);
  check('remove ok', ws.remove(profile.id).ok === true);
  check('removed from list', ws.list().length === 1 && ws.list()[0].name === 'Keeper');
  check('remove unknown id fails', ws.remove(profile.id).ok === false);
}

// ── TC3 — corrupt storage degrades to empty, save recovers ──
{
  console.log('TC3 — corrupt storage');
  const ws = createWorkshopStore(mockStorage({ '3dpa_workshop_v1': '{broken!!' }));
  check('corrupt → empty list', ws.list().length === 0);
  check('save recovers over corrupt blob', ws.save('Fresh', STATE_A).ok === true && ws.list().length === 1);
}

// ── TC4 — wrong envelope version treated as empty ──
{
  console.log('TC4 — version handling');
  const ws = createWorkshopStore(mockStorage({ '3dpa_workshop_v1': '{"v":99,"profiles":[{"id":"a"}]}' }));
  check('future version → empty list', ws.list().length === 0);
  const ws2 = createWorkshopStore(mockStorage({ '3dpa_workshop_v1': '{"v":1,"profiles":"not-an-array"}' }));
  check('malformed profiles member → empty list', ws2.list().length === 0);
}

// ── TC5 — quota exceeded surfaces as ok:false, nothing half-written ──
{
  console.log('TC5 — quota exceeded');
  const st = mockStorage();
  const ws = createWorkshopStore(st);
  ws.save('Survivor', STATE_A);
  st.setItem = () => { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; };
  const r = ws.save('Too big', STATE_B);
  check('save under quota failure → ok:false', r.ok === false, JSON.stringify(r));
  check('existing profiles untouched', ws.list().length === 1 && ws.list()[0].name === 'Survivor');
}

// ── TC6 — export / import backup round-trip with id dedupe ──
{
  console.log('TC6 — export/import backup');
  const ws = createWorkshopStore(mockStorage());
  ws.save('One', STATE_A);
  ws.save('Two', STATE_B);
  const backup = ws.exportJSON();
  check('export is parseable JSON with v+profiles', (() => {
    const p = JSON.parse(backup); return p.v === 1 && Array.isArray(p.profiles) && p.profiles.length === 2;
  })(), backup.slice(0, 80));

  const fresh = createWorkshopStore(mockStorage());
  const imp = fresh.importJSON(backup);
  check('import ok with count 2', imp.ok === true && imp.count === 2, JSON.stringify(imp));
  check('imported states intact', JSON.stringify(fresh.list().map(p => p.state)) ===
    JSON.stringify(ws.list().map(p => p.state)));

  const again = fresh.importJSON(backup);
  check('re-import dedupes by id', again.ok === true && fresh.list().length === 2,
    `len=${fresh.list().length}`);

  // merge: import into a store that already has a different profile
  const merged = createWorkshopStore(mockStorage());
  merged.save('Local only', STATE_B);
  merged.importJSON(backup);
  check('import merges with existing', merged.list().length === 3, `len=${merged.list().length}`);
}

// ── TC6b — single-profile export (issue #4) ──
{
  console.log('TC6b — single-profile export');
  const ws = createWorkshopStore(mockStorage());
  const { profile: one } = ws.save('One', STATE_A);
  ws.save('Two', STATE_B);
  ws.addTuningOp('x1c|pla_basic', 'nozzle_temp_delta', '°C',
    { kind: 'accept', step: 5, clampMin: -15, clampMax: 15 });

  const single = JSON.parse(ws.exportJSON([one.id]));
  check('partial export keeps only selected profile',
    single.profiles.length === 1 && single.profiles[0].id === one.id,
    JSON.stringify(single.profiles.map(p => p.name)));
  check('partial export omits global tuning', single.tuning === undefined);
  check('unknown id → empty selection', JSON.parse(ws.exportJSON(['nope'])).profiles.length === 0);

  const full = JSON.parse(ws.exportJSON());
  check('argless export unchanged (all profiles + tuning)',
    full.profiles.length === 2 && !!full.tuning);

  // a single-profile file imports into another store like any backup
  const fresh = createWorkshopStore(mockStorage());
  const imp = fresh.importJSON(ws.exportJSON([one.id]));
  check('single-profile file imports', imp.ok === true && imp.count === 1 &&
    fresh.list()[0].name === 'One', JSON.stringify(imp));
}

// ── TC7 — import rejects garbage ──
{
  console.log('TC7 — import validation');
  const ws = createWorkshopStore(mockStorage());
  check('not JSON → ok:false', ws.importJSON('hello').ok === false);
  check('wrong shape → ok:false', ws.importJSON('{"v":1}').ok === false);
  check('wrong version → ok:false', ws.importJSON('{"v":42,"profiles":[]}').ok === false);
  check('profile entries missing id/state are skipped', (() => {
    const r = ws.importJSON('{"v":1,"profiles":[{"id":"ok1","name":"n","state":{}},{"name":"no-id"}]}');
    return r.ok === true && r.count === 1 && ws.list().length === 1;
  })());
}

// ── TC8 — journal: addOutcome (IMPL-044 W2) ──
{
  console.log('TC8 — journal addOutcome');
  const ws = createWorkshopStore(mockStorage());
  const { profile } = ws.save('Journaled', STATE_A);
  const r1 = ws.addOutcome(profile.id, { result: 'worked', note: 'first try' });
  const r2 = ws.addOutcome(profile.id, { result: 'failed', symptoms: ['stringing', 'warping'], note: '' });
  check('worked outcome ok', r1.ok === true && r1.outcome.result === 'worked', JSON.stringify(r1));
  check('failed outcome keeps symptom tags', r2.ok === true &&
    JSON.stringify(r2.outcome.symptoms) === JSON.stringify(['stringing', 'warping']), JSON.stringify(r2));
  const j = ws.get(profile.id).journal;
  check('journal persisted in order', j.length === 2 && j[0].note === 'first try' && j[1].result === 'failed');
  check('outcome dates present', !!j[0].date && !!j[0].id);
  check('unknown profile fails', ws.addOutcome('nope', { result: 'worked' }).ok === false);
  check('bad result normalizes to worked', ws.addOutcome(profile.id, { result: 'exploded' }).outcome.result === 'worked');
  check('non-array symptoms degrade to []', JSON.stringify(ws.addOutcome(profile.id, { result: 'failed', symptoms: 'x' }).outcome.symptoms) === '[]');

  // journal survives the backup round-trip
  const fresh = createWorkshopStore(mockStorage());
  fresh.importJSON(ws.exportJSON());
  check('journal survives export/import', fresh.get(profile.id).journal.length === 4);
}

// ── TC9 — journal: removeOutcome + journal-less profiles tolerated ──
{
  console.log('TC9 — journal removeOutcome + legacy profiles');
  const ws = createWorkshopStore(mockStorage());
  const { profile } = ws.save('J', STATE_A);
  const { outcome } = ws.addOutcome(profile.id, { result: 'failed', symptoms: ['adhesion'] });
  check('removeOutcome ok', ws.removeOutcome(profile.id, outcome.id).ok === true);
  check('journal emptied', ws.get(profile.id).journal.length === 0);
  check('unknown outcome fails', ws.removeOutcome(profile.id, outcome.id).ok === false);
  check('unknown profile fails', ws.removeOutcome('nope', outcome.id).ok === false);
  // a profile written without journal (W1-era) still lists/gets fine
  const legacy = createWorkshopStore(mockStorage({ '3dpa_workshop_v1':
    '{"v":1,"profiles":[{"id":"old1","name":"Legacy","state":{"printer":"x1c"}}]}' }));
  check('legacy journal-less profile listed', legacy.list().length === 1);
  check('addOutcome creates journal array on legacy profile',
    legacy.addOutcome('old1', { result: 'worked' }).ok === true && legacy.get('old1').journal.length === 1);
}

// ── TC-T1 — tuning ops: accept, revert, clamp defense, derived value (IMPL-044 W3 gate B3) ──
{
  const st = mockStorage();
  const ws = createWorkshopStore(st);
  const r1 = ws.addTuningOp('x1c|pla_basic', 'nozzle_temp_delta', '°C',
    { kind: 'accept', step: -5, symptomId: 'over_extrusion', clampMin: -15, clampMax: 15 });
  check('accept op ok', r1.ok === true && r1.entry.value === -5);
  ws.addTuningOp('x1c|pla_basic', 'nozzle_temp_delta', '°C',
    { kind: 'accept', step: -5, symptomId: 'over_extrusion', clampMin: -15, clampMax: 15 });
  const t = ws.getTuning();
  check('value accumulates', t.accepted[0].value === -10);
  check('ops have unique ids', new Set(t.accepted[0].ops.map(o => o.opId)).size === 2);
  check('accept ops carry symptomId', t.accepted[0].ops.every(o => o.symptomId === 'over_extrusion'));
  const rv = ws.addTuningOp('x1c|pla_basic', 'nozzle_temp_delta', '°C', { kind: 'revert', step: +5 });
  check('revert op subtracts', rv.entry.value === -5);
  // clamp defense: accepts at/past the clamp are REJECTED (raw sum can never outrun a revert)
  ws.addTuningOp('x1c|pla_basic', 'nozzle_temp_delta', '°C', { kind: 'accept', step: -5, clampMin: -15, clampMax: 15 });
  ws.addTuningOp('x1c|pla_basic', 'nozzle_temp_delta', '°C', { kind: 'accept', step: -5, clampMin: -15, clampMax: 15 });
  const over = ws.addTuningOp('x1c|pla_basic', 'nozzle_temp_delta', '°C', { kind: 'accept', step: -5, clampMin: -15, clampMax: 15 });
  check('accept at clamp rejected', over.ok === false && over.error === 'clamp');
  check('value stopped at clamp', ws.getTuning().accepted[0].value === -15);
  const rz = ws.revertTuning('x1c|pla_basic', 'nozzle_temp_delta');
  check('revert clears to exactly zero', rz.ok === true && ws.getTuning().accepted[0].value === 0);
  check('revertTuning unknown entry fails', ws.revertTuning('nope|nope', 'nozzle_temp_delta').ok === false);
  // second pair+key entry is independent
  ws.addTuningOp('a1|petg_basic', 'fan_delta_pct', '%', { kind: 'accept', step: 10, symptomId: 'stringing', clampMin: -20, clampMax: 20 });
  check('independent entries per pair+key', ws.getTuning().accepted.length === 2);
}

// ── TC-T2 — dismissals: upsert newer date ──
{
  const ws = createWorkshopStore(mockStorage());
  check('dismiss ok', ws.dismissSuggestion('x1c|pla_basic|stringing|retraction_distance_delta').ok === true);
  const d1 = ws.getDismissal('x1c|pla_basic|stringing|retraction_distance_delta');
  check('dismissal stored', !!d1 && typeof d1.date === 'string');
  check('unknown dismissal null', ws.getDismissal('nope') === null);
  ws.dismissSuggestion('x1c|pla_basic|stringing|retraction_distance_delta');
  check('re-dismiss upserts (still one entry)', ws.getTuning().dismissed.length === 1);
}

// ── TC-T3 — backup round-trip carries tuning; op-union merge fork-lossless + idempotent + ATOMIC ──
{
  const wsA = createWorkshopStore(mockStorage());
  const wsB = createWorkshopStore(mockStorage());
  wsA.addTuningOp('x1c|pla_basic', 'nozzle_temp_delta', '°C', { kind: 'accept', step: -5, clampMin: -15, clampMax: 15 });
  const backup = wsA.exportJSON();
  check('export contains tuning', JSON.parse(backup).tuning.accepted.length === 1);
  wsB.addTuningOp('x1c|pla_basic', 'nozzle_temp_delta', '°C', { kind: 'accept', step: -5, clampMin: -15, clampMax: 15 });
  wsB.importJSON(backup);
  const merged = wsB.getTuning().accepted[0];
  check('fork-lossless: both devices accepts survive', merged.ops.length === 2 && merged.value === -10);
  wsB.importJSON(backup);
  check('idempotent re-import', wsB.getTuning().accepted[0].ops.length === 2);
  // W1-era envelope (no tuning) still imports fine and keeps existing tuning
  const legacyJson = JSON.stringify({ v: 1, profiles: [] });
  check('legacy envelope import ok', wsB.importJSON(legacyJson).ok === true);
  check('legacy import kept tuning', wsB.getTuning().accepted.length === 1);
  // profiles still round-trip beside tuning
  const wsC = createWorkshopStore(mockStorage());
  wsC.save('Test', STATE_A);
  wsC.addTuningOp('x1c|pla_basic', 'nozzle_temp_delta', '°C', { kind: 'accept', step: -5, clampMin: -15, clampMax: 15 });
  const full = wsC.exportJSON();
  const wsD = createWorkshopStore(mockStorage());
  wsD.importJSON(full);
  check('import carries profiles AND tuning', wsD.list().length === 1 && wsD.getTuning().accepted.length === 1);
  // W1-era profile writes preserve tuning (envelope-preserving _write)
  wsC.rename(wsC.list()[0].id, 'Renamed');
  check('profile write preserves tuning', wsC.getTuning().accepted.length === 1);
  // ATOMIC import: failing write leaves profiles AND tuning untouched
  const st = mockStorage();
  const wsE = createWorkshopStore(st);
  wsE.save('Keep', STATE_A);
  wsE.addTuningOp('x1c|pla_basic', 'nozzle_temp_delta', '°C', { kind: 'accept', step: -5, clampMin: -15, clampMax: 15 });
  const before = st.getItem('3dpa_workshop_v1');
  const realSet = st.setItem;
  st.setItem = () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
  const failed = wsE.importJSON(full);
  st.setItem = realSet;
  check('atomic import: failure reported', failed.ok === false && failed.error === 'quota');
  check('atomic import: storage untouched on failure', st.getItem('3dpa_workshop_v1') === before);
}

console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASS');
  process.exit(0);
} else {
  console.log(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
