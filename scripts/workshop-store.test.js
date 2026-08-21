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

const { loadBrowserScript } = require('./load-browser-script.js');

const { createWorkshopStore } = loadBrowserScript('workshop-store.js', ['createWorkshopStore']);

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

// ── TC-D5 — a version-mismatched envelope is preserved, never overwritten ──
// Sync spec D-5. Two destructive sites, not the one the spec named:
//   _read()    :35 returns []                       -> benign alone
//   _readEnv() :49 returns a fresh empty envelope    -> _write routes through
//                                                       it, so the TUNING
//                                                       LEDGER dies too
// importJSON() :231 already refuses correctly and must stay untouched.
{
  console.log('TC-D5 — version-mismatched read is non-destructive');
  const future = JSON.stringify({
    v: 999,
    profiles: [{ id: 'p1', name: 'Real', state: { printer: 'x1c' } }],
    tuning: { accepted: [{ pairKey: 'x1c|pla_basic', offsetKey: 'nozzle_temp_delta', ops: [] }], dismissed: [] },
  });
  const st = mockStorage({ '3dpa_workshop_v1': future });
  const ws = createWorkshopStore(st);

  check('skew is reported', ws.hasVersionSkew() === true);
  check('list() is empty under skew', ws.list().length === 0);

  // The dangerous part: a write must REFUSE, not persist the empty read.
  const w = ws.save('New profile', { printer: 'a1' });
  check('save refuses under skew', w.ok === false && w.error === 'version-skew');

  const after = JSON.parse(st._map.get('3dpa_workshop_v1'));
  check('original envelope version survives', after.v === 999);
  check('original profile survives',
    Array.isArray(after.profiles) && after.profiles.length === 1 && after.profiles[0].id === 'p1');
  check('tuning ledger survives too (the _readEnv site)',
    !!after.tuning && Array.isArray(after.tuning.accepted) && after.tuning.accepted.length === 1);

  // Every other mutator must refuse identically rather than silently no-op.
  check('rename refuses under skew', ws.rename('p1', 'x').error === 'version-skew');
  check('remove refuses under skew', ws.remove('p1').error === 'version-skew');
  check('addOutcome refuses under skew', ws.addOutcome('p1', { note: 'n' }).error === 'version-skew');
  check('addTuningOp refuses under skew',
    ws.addTuningOp('x1c|pla_basic', 'nozzle_temp_delta', '°C',
      { kind: 'accept', step: -5, clampMin: -15, clampMax: 15 }).error === 'version-skew');
  const stillThere = JSON.parse(st._map.get('3dpa_workshop_v1'));
  check('storage byte-identical after every refused mutator',
    JSON.stringify(stillThere) === JSON.stringify(JSON.parse(future)));

  // importJSON's own gate is a DIFFERENT thing and must keep refusing by format.
  check('importJSON still refuses a foreign-version payload',
    ws.importJSON(future).error === 'format');

  // A normal envelope is completely unaffected.
  const ok = createWorkshopStore(mockStorage());
  check('no skew on a fresh store', ok.hasVersionSkew() === false);
  check('normal save still works', ok.save('fine', STATE_A).ok === true);
}

// ── TC-D1 — remove() leaves a tombstone so the deletion can travel ──
// Sync spec D-1. Under plain hard-delete, any device still holding the
// profile re-uploads it and the deletion undoes itself.
{
  console.log('TC-D1 — deletes are soft');
  const ws = createWorkshopStore(mockStorage());
  const a = ws.save('Keeper', STATE_A).profile;
  const b = ws.save('Doomed', STATE_B).profile;

  check('remove reports ok', ws.remove(b.id).ok === true);
  check('list() hides the removed profile', ws.list().length === 1 && ws.list()[0].id === a.id);
  check('get() also hides it', ws.get(b.id) === null);
  check('the row survives with a tombstone',
    ws.listArchived().some(p => p.id === b.id && typeof p.archived_at === 'string'));
  check('removing twice is not-found, not a second tombstone',
    ws.remove(b.id).error === 'not-found');
  check('live profiles carry an explicit null tombstone', ws.list()[0].archived_at === null);

  // Old envelopes and old user backup files have no archived_at at all.
  // Absent MUST read as live, or a restore would hide everything.
  const legacy = JSON.stringify({
    v: 1, profiles: [{ id: 'old', name: 'Legacy', state: { printer: 'x1c' }, created: '2026-01-01T00:00:00.000Z', updated: '2026-01-01T00:00:00.000Z' }],
  });
  const ws2 = createWorkshopStore(mockStorage({ '3dpa_workshop_v1': legacy }));
  check('a legacy row with no archived_at reads as live', ws2.list().length === 1);
  check('and is not reported as archived', ws2.listArchived().length === 0);

  // Round-trip fidelity: the tombstone is part of the record, so it must
  // survive export -> import. NOT asserted here: whether an incoming LIVE row
  // should beat a local tombstone. That is D-2 (import-merge direction) and
  // sync spec §9.2, both explicitly still open — deciding it with a test here
  // would pre-empt an owner call. D-2 lands with sync.
  const ws3 = createWorkshopStore(mockStorage());
  const gone = ws3.save('Gone', STATE_A).profile;
  ws3.save('Live', STATE_B);
  ws3.remove(gone.id);
  const dump = ws3.exportJSON();
  check('export carries the tombstone',
    JSON.parse(dump).profiles.some(p => p.id === gone.id && typeof p.archived_at === 'string'));
  const ws4 = createWorkshopStore(mockStorage());
  check('import of that dump reports ok', ws4.importJSON(dump).ok === true);
  check('the tombstone survives the round-trip', ws4.list().every(p => p.id !== gone.id));
  check('and the live sibling came back', ws4.list().length === 1 && ws4.list()[0].name === 'Live');
}

// ── TC-D3 — journal writes must not bump the VALUE timestamp ──
// Sync spec D-3 / §3.1. Concretely: device A renames a profile at t1; device
// B, still holding the old name, logs a print outcome at t2. B's write bumps
// `updated`, so B's stale name/notes/state beat A's rename — while the
// journal entry that actually changed merges fine. The user loses the edit
// they made deliberately and keeps the one they made incidentally.
//
// The rule: appending to a record is not editing its values.
//
// NOTE ON TEST DESIGN: _now() is millisecond-resolution, so two writes in the
// same tick produce identical ISO strings. Comparing a stamp taken just before
// the call against the one just after is degenerate — it passes whether or not
// the bump happened. Every assertion below is therefore anchored to a SEEDED
// timestamp far in the past, so "unchanged" and "changed" are both decidable.
{
  console.log('TC-D3 — journal writes leave the value timestamp alone');
  const T0 = '2020-01-01T00:00:00.000Z';   // unmistakably not "now"
  function seeded(extra) {
    return mockStorage({ '3dpa_workshop_v1': JSON.stringify({
      v: 1,
      profiles: [Object.assign({
        id: 'p1', name: 'Original', state: STATE_A, notes: '',
        created: T0, updated: T0, archived_at: null,
      }, extra || {})],
    }) });
  }

  {
    const ws = createWorkshopStore(seeded());
    const oc = ws.addOutcome('p1', { note: 'first print' });
    check('addOutcome reports ok', oc.ok === true);
    check('addOutcome leaves updated at the seeded value', ws.get('p1').updated === T0);
    check('addOutcome moves journal_updated off the seed',
      typeof ws.get('p1').journal_updated === 'string' && ws.get('p1').journal_updated !== T0);
    check('the outcome was actually recorded', ws.get('p1').journal.length === 1);
  }

  {
    const ws = createWorkshopStore(seeded({
      journal: [{ id: 'o1', date: T0 }], journal_updated: T0,
    }));
    check('removeOutcome reports ok', ws.removeOutcome('p1', 'o1').ok === true);
    check('removeOutcome leaves updated at the seeded value', ws.get('p1').updated === T0);
    check('removeOutcome moves journal_updated off the seed', ws.get('p1').journal_updated !== T0);
    check('the outcome was actually removed', ws.get('p1').journal.length === 0);
  }

  // The other half of the rule: a real value edit MUST still move `updated`,
  // and must NOT disturb the journal clock.
  {
    const ws = createWorkshopStore(seeded({
      journal: [{ id: 'o1', date: T0 }], journal_updated: T0,
    }));
    check('rename reports ok', ws.rename('p1', 'Renamed').ok === true);
    check('rename DOES move updated off the seed', ws.get('p1').updated !== T0);
    check('rename leaves journal_updated at the seeded value', ws.get('p1').journal_updated === T0);
    check('the rename actually applied', ws.get('p1').name === 'Renamed');
  }

  // Records written before this change have no journal_updated. Absent is fine
  // and must not be manufactured on read.
  {
    const ws = createWorkshopStore(seeded({ journal: [{ id: 'o1', date: T0 }] }));
    check('a legacy row with no journal_updated still reads', ws.list().length === 1);
    check('and its updated is untouched', ws.get('p1').updated === T0);
    check('and journal_updated is not fabricated on read',
      ws.get('p1').journal_updated === undefined);
  }
}

// ── TC-R1 — exportJSON must not manufacture an empty backup under skew ──
// Codex gate MUST-FIX. Under skew _read() is [] and getTuning() is empty, so
// export produced a well-formed {v:1, profiles:[]}. It never touched
// localStorage — but the user hits "Backup", gets a valid-looking file, and
// now holds a destructive artifact built from data we could not read.
{
  console.log('TC-R1 — export refuses under version skew');
  const future = JSON.stringify({ v: 999, profiles: [{ id: 'p1', name: 'Real', state: { printer: 'x1c' } }] });
  const ws = createWorkshopStore(mockStorage({ '3dpa_workshop_v1': future }));
  const dump = ws.exportJSON();
  check('export does not return a fabricated v1 envelope', dump !== JSON.stringify({ v: 1, profiles: [] }, null, 2));
  check('export signals the skew instead', dump === null);
  // And a healthy store still exports normally.
  const ok = createWorkshopStore(mockStorage());
  ok.save('Fine', STATE_A);
  check('a healthy store still exports', typeof ok.exportJSON() === 'string'
    && JSON.parse(ok.exportJSON()).profiles.length === 1);
}

// ── TC-R2 — an archived profile is immutable ──
// Codex gate MUST-FIX against D-1. Before the soft delete, remove() made the
// row vanish, so rename/addOutcome/removeOutcome on a deleted profile were
// impossible by construction. _read() now returns archived rows, and those
// call sites only looked up by id — so a deleted profile became mutable.
{
  console.log('TC-R2 — archived profiles are immutable');
  const ws = createWorkshopStore(mockStorage());
  const p = ws.save('Doomed', STATE_A).profile;
  const oc = ws.addOutcome(p.id, { note: 'before delete' }).outcome;
  ws.remove(p.id);

  check('rename refuses on an archived row', ws.rename(p.id, 'Zombie').error === 'not-found');
  check('addOutcome refuses on an archived row', ws.addOutcome(p.id, { note: 'x' }).error === 'not-found');
  check('removeOutcome refuses on an archived row', ws.removeOutcome(p.id, oc.id).error === 'not-found');
  const row = ws.listArchived().find(x => x.id === p.id);
  check('the archived row was not mutated', row.name === 'Doomed' && row.journal.length === 1);
}

// ── TC-R3 — a non-string archived_at fails CLOSED ──
// Codex gate SHOULD-FIX. _read() mapped any non-string archived_at to null,
// so a hand-edited or foreign `archived_at: true` resurrected a deleted row.
// Absent and null mean live; anything else truthy means archived.
{
  console.log('TC-R3 — unknown tombstone shapes fail closed');
  function seededTombstone(v) {
    return createWorkshopStore(mockStorage({ '3dpa_workshop_v1': JSON.stringify({
      v: 1, profiles: [{ id: 'p1', name: 'X', state: STATE_A, created: '2020-01-01T00:00:00.000Z',
                         updated: '2020-01-01T00:00:00.000Z', archived_at: v }] }) }));
  }
  check('archived_at: true is treated as archived', seededTombstone(true).list().length === 0);
  check('archived_at: 1 is treated as archived', seededTombstone(1).list().length === 0);
  check('archived_at: {} is treated as archived', seededTombstone({}).list().length === 0);
  check('archived_at: null is live', seededTombstone(null).list().length === 1);
  check('archived_at: "" is live', seededTombstone('').list().length === 1);
  check('a real ISO tombstone is archived', seededTombstone('2026-01-01T00:00:00.000Z').list().length === 0);
}

// ── TC-R4 — every mutator surfaces skew, including revertTuning ──
// Codex gate SHOULD-FIX: revertTuning returned not-found under skew. It never
// persisted, but the skew contract says the condition must surface.
{
  console.log('TC-R4 — revertTuning surfaces skew');
  const future = JSON.stringify({ v: 999, profiles: [] });
  const ws = createWorkshopStore(mockStorage({ '3dpa_workshop_v1': future }));
  check('revertTuning reports version-skew',
    ws.revertTuning('x1c|pla_basic', 'nozzle_temp_delta').error === 'version-skew');
  check('dismissSuggestion reports version-skew',
    ws.dismissSuggestion('x1c|pla_basic').error === 'version-skew');
}

// ── TC-R5 — the D-1 assertions actually discriminate ──
// Codex gate OBSERVATION: "list() hides the removed profile" and "get() hides
// it" pass under a hard delete too. The discriminating property is that the
// underlying row COUNT does not shrink.
{
  console.log('TC-R5 — soft delete is observable in storage');
  const st = mockStorage();
  const ws = createWorkshopStore(st);
  const a = ws.save('A', STATE_A).profile;
  ws.save('B', STATE_B);
  const before = JSON.parse(st._map.get('3dpa_workshop_v1')).profiles.length;
  ws.remove(a.id);
  const after = JSON.parse(st._map.get('3dpa_workshop_v1')).profiles;
  check('the stored row count does not shrink on delete', after.length === before);
  check('and the deleted row carries an ISO tombstone',
    /^\d{4}-\d{2}-\d{2}T/.test(after.find(x => x.id === a.id).archived_at));
}

console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASS');
  process.exit(0);
} else {
  console.log(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
