#!/usr/bin/env node
// ─── Tests for gear-store.js (Train 1 — My Gear, Task 4) ─────────────────────
//
// Run: node scripts/gear-store.test.js
//
// Exit 0 on all-green, 1 on any failure.
//
// The store is exercised through createGearStore(mockStorage) so quota,
// corruption, hostile envelopes and version skew are deterministic. No engine
// needed and none allowed: the store validates SHAPE only — content validation
// against catalogs is a separate pure module, which is what keeps the
// no-engine-import property provable by grep.
//
// Every assertion here encodes a ratified decision from
// docs/superpowers/specs/2026-08-20-gear-model-v2-spec.md. Do not weaken one to
// make an implementation pass.

const { loadBrowserScript } = require('./load-browser-script.js');

const { createGearStore } = loadBrowserScript('gear-store.js', ['createGearStore']);

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

console.log('# gear-store.js tests\n');

const KEY = '3dpa_gear_v1';
const T_OLD = '2020-01-01T00:00:00.000Z';
const T_MID = '2021-01-01T00:00:00.000Z';
const T_NEW = '2022-01-01T00:00:00.000Z';
function envelope(gears, settings) {
  return JSON.stringify({ v: 1, gears: gears || {}, settings: settings || {} });
}
function row(extra) {
  return Object.assign({ name: 'G', fields: { printer: 'x1c' }, labels: {},
    created_at: T_OLD, updated_at: T_OLD, last_used_at: null, archived_at: null }, extra || {});
}

// G1 — printer is required at write time (closes S2)
{
  const s = createGearStore(mockStorage());
  check('G1 empty gear rejected', s.save({ name: 'x', fields: {} }).error === 'required-printer');
  check('G1 nothing persisted for the rejected write', s.list().length === 0);
  check('G1 gear with a printer accepted', s.save({ name: 'X1C', fields: { printer: 'x1c' } }).ok === true);
}

// G2 — the PERSISTED row carries no id and no invalid flag (spec 2.3)
{
  const st = mockStorage();
  const s = createGearStore(st);
  const id = s.save({ name: 'g', fields: { printer: 'x1c' } }).gear.id;
  const stored = JSON.parse(st._map.get(KEY)).gears[id];
  check('G2 persisted row has no id field', !('id' in stored));
  check('G2 persisted row has no invalid field', !('invalid' in stored));
  check('G2 the in-memory DTO still exposes id', s.get(id).id === id);
  check('G2 stored keys are exactly the spec set',
    Object.keys(stored).sort().join(',') ===
    'archived_at,created_at,fields,labels,last_used_at,name,updated_at');
}

// G3 — [] is pinned-as-none; an absent key means ask me
{
  const s = createGearStore(mockStorage());
  const id = s.save({ name: 'g', fields: { printer: 'x1c', special: [], useCase: ['functional'] } }).gear.id;
  const g = s.get(id);
  check('G3 [] survives the round-trip', Array.isArray(g.fields.special) && g.fields.special.length === 0);
  check('G3 an absent key stays absent', !('surface' in g.fields));
}

// G4 — array hygiene: dedup + deterministic bytewise order
{
  const s = createGearStore(mockStorage());
  const id = s.save({ name: 'g', fields: { printer: 'x1c', useCase: ['functional', 'decorative', 'functional'] } }).gear.id;
  const v = s.get(id).fields.useCase;
  check('G4 duplicates removed', v.length === 2);
  check('G4 order is bytewise ascending', v.join(',') === 'decorative,functional');
}

// G5 — unknown keys are PRESERVED at rest (version skew between platforms)
{
  const s = createGearStore(mockStorage());
  const id = s.save({ name: 'g', fields: { printer: 'x1c', some_future_key: 'v', another: ['a','b'] } }).gear.id;
  check('G5 unknown string key round-trips', s.get(id).fields.some_future_key === 'v');
  check('G5 unknown array key round-trips', s.get(id).fields.another.join(',') === 'a,b');
}

// G6 — reserved keys dropped AND counted.
// The fixture MUST be a JSON string: an object literal never serializes a
// __proto__ key, so an object-literal fixture proves nothing. (Gate SHOULD-FIX.)
{
  const hostile = '{"v":1,"gears":{"__proto__":{"name":"evil","fields":{"printer":"x1c"}},'
    + '"good":{"name":"good","fields":{"printer":"x1c","__proto__":"evil","constructor":"evil"},'
    + '"labels":{},"created_at":"' + T_OLD + '","updated_at":"' + T_OLD + '",'
    + '"last_used_at":null,"archived_at":null}},"settings":{}}';
  check('G6 fixture really contains the key', hostile.indexOf('"__proto__"') !== -1);
  const s = createGearStore(mockStorage({ [KEY]: hostile }));
  check('G6 the good row survives', s.list().length === 1 && s.list()[0].name === 'good');
  check('G6 reserved gear id dropped', s.get('__proto__') === null);
  check('G6 reserved field key dropped',
    Object.keys(s.list()[0].fields).indexOf('__proto__') === -1
    && Object.keys(s.list()[0].fields).indexOf('constructor') === -1);
  check('G6 drops are counted, not silent', s.diagnostics().droppedReservedKeys >= 3);
  check('G6 no prototype pollution', ({}).evil === undefined && Object.prototype.evil === undefined);
  check('G6 fields map is null-prototype', Object.getPrototypeOf(s.list()[0].fields) === null);
}

// G6b — labels and settings are hostile surfaces too (spec §2.5 names all three)
{
  const hostile = '{"v":1,"gears":{"g1":{"name":"G","fields":{"printer":"x1c"},'
    + '"labels":{"__proto__":"evil","printer":"X1 Carbon"},"created_at":"' + T_OLD + '",'
    + '"updated_at":"' + T_OLD + '","last_used_at":null,"archived_at":null}},'
    + '"settings":{"__proto__":"evil","active_gear":"g1"}}';
  const s = createGearStore(mockStorage({ [KEY]: hostile }));
  check('G6b labels map is null-prototype', Object.getPrototypeOf(s.get('g1').labels) === null);
  check('G6b reserved key dropped from labels', Object.keys(s.get('g1').labels).indexOf('__proto__') === -1);
  check('G6b the legitimate label survived', s.get('g1').labels.printer === 'X1 Carbon');
  check('G6b settings map is null-prototype', Object.getPrototypeOf(s.raw ? s.getSettings().catalog_seen : s.getSettings().catalog_seen) === null);
  check('G6b settings survived the reserved key', s.getSettings().active_gear === 'g1');
  check('G6b no prototype pollution from any of it', ({}).evil === undefined);
}

// G7 — type mismatches degrade, never throw; siblings survive
{
  const messy = '{"v":1,"gears":{"a":"not-an-object","b":{"name":"B","fields":"not-a-map"},'
    + '"c":' + JSON.stringify(row({ name: 'C' })) + '},"settings":"not-a-map"}';
  let threw = false, s;
  try { s = createGearStore(mockStorage({ [KEY]: messy })); s.list(); s.getSettings(); }
  catch (_) { threw = true; }
  check('G7 hostile envelope does not throw', threw === false);
  check('G7 the readable sibling survives', s.list().some(g => g.name === 'C'));
}

// G8 — a gear failing required-field validation is RETAINED and flagged
{
  const s = createGearStore(mockStorage({ [KEY]:
    envelope({ z: row({ name: 'Z', fields: { material: 'pla_basic' } }) }) }));
  check('G8 the row is retained', s.get('z') !== null);
  check('G8 and flagged rather than dropped', s.get('z').invalid === true);
  check('G8 and kept out of list()', s.list().every(g => g.id !== 'z'));
}

// G9 — touch moves last_used_at and NOT updated_at.
// Seeded, because _now() is millisecond-resolution and a before/after compare
// would pass either way. (Gate SHOULD-FIX + the Tasks 1-3 lesson.)
{
  const s = createGearStore(mockStorage({ [KEY]: envelope({ g1: row() }) }));
  check('G9 touch reports ok', s.touch('g1').ok === true);
  check('G9 updated_at still at the seed', s.get('g1').updated_at === T_OLD);
  check('G9 last_used_at moved off the seed',
    typeof s.get('g1').last_used_at === 'string' && s.get('g1').last_used_at !== T_OLD);
}

// G10 — update / archive / restore DO move updated_at (spec 4.2)
{
  const s = createGearStore(mockStorage({ [KEY]: envelope({ g1: row() }) }));
  s.update('g1', { name: 'Renamed' });
  check('G10 update moves updated_at', s.get('g1').updated_at !== T_OLD);
  const s2 = createGearStore(mockStorage({ [KEY]: envelope({ g1: row() }) }));
  s2.archive('g1');
  check('G10 archive moves updated_at (archived_at is a content edit)',
    s2.get('g1').updated_at !== T_OLD);
  check('G10 archive sets a tombstone', typeof s2.get('g1').archived_at === 'string');
  const s3 = createGearStore(mockStorage({ [KEY]: envelope({ g1: row({ archived_at: T_OLD }) }) }));
  s3.restore('g1');
  check('G10 restore moves updated_at', s3.get('g1').updated_at !== T_OLD);
  check('G10 restore clears the tombstone', s3.get('g1').archived_at === null);
}

// G11 — total order: last_used_at desc NULLS LAST, then created_at desc, then id ASC bytewise
{
  const s = createGearStore(mockStorage({ [KEY]: envelope({
    used_old:   row({ last_used_at: T_MID, created_at: T_OLD }),
    used_new:   row({ last_used_at: T_NEW, created_at: T_OLD }),
    never_used: row({ last_used_at: null,  created_at: T_NEW }),   // newest created, never used
  }) }));
  const ids = s.list().map(g => g.id);
  check('G11 most recently used leads', ids[0] === 'used_new');
  check('G11 a never-used gear sorts LAST even though it is newest', ids[2] === 'never_used');
  check('G11 order is exactly spec order', ids.join(',') === 'used_new,used_old,never_used');
}
{
  // id tie-break is bytewise ASCENDING, not locale collation. In da-DK collation
  // 'aa' sorts after 'z'; bytewise it does not. This is why localeCompare is banned.
  const s = createGearStore(mockStorage({ [KEY]: envelope({
    z:  row({ last_used_at: T_MID, created_at: T_MID }),
    aa: row({ last_used_at: T_MID, created_at: T_MID }),
  }) }));
  check('G11 id tie-break is bytewise ascending', s.list().map(g => g.id).join(',') === 'aa,z');
}
{
  // The case where JS `<` and UTF-8 bytes DISAGREE. U+E000 encodes to EE 80 80;
  // U+10000 encodes to F0 90 80 80. Bytewise, U+E000 sorts FIRST. In UTF-16
  // code-unit order it does not, because U+10000 is a surrogate pair (D800 DC00)
  // and D800 < E000. A naive `<` comparator gets this backwards.
  const hi = '\u{10000}', pua = '\uE000';
  check('G11 the counterexample is real (JS < disagrees with bytes)', hi < pua);
  const s = createGearStore(mockStorage({ [KEY]: envelope({
    [hi]:  row({ last_used_at: T_MID, created_at: T_MID }),
    [pua]: row({ last_used_at: T_MID, created_at: T_MID }),
  }) }));
  check('G11 tie-break uses UTF-8 bytes, not UTF-16 code units',
    s.list().map(g => g.id).join('') === pua + hi);
}

// G12 — a missing/unparseable created_at sorts LAST and is NEVER rewritten
{
  const st = mockStorage({ [KEY]: envelope({
    good: row({ created_at: T_NEW, last_used_at: null }),
    bad:  row({ created_at: 42,    last_used_at: null }),
  }) });
  const s = createGearStore(st);
  check('G12 the unparseable row sorts last', s.list().map(g => g.id).join(',') === 'good,bad');
  check('G12 reading did not write', JSON.parse(st._map.get(KEY)).gears.bad.created_at === 42);
  s.touch('good');
  check('G12 and a later write still did not repair the other row',
    JSON.parse(st._map.get(KEY)).gears.bad.created_at === 42);
}

// G13 — a failed write is never reported as a save
{
  const st = mockStorage();
  st.setItem = () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; };
  const r = createGearStore(st).save({ name: 'g', fields: { printer: 'x1c' } });
  check('G13 quota failure reports not-ok', r.ok === false);
  check('G13 and names quota specifically', r.error === 'quota');
}

// G14 — version skew is preserved, never overwritten (same posture as workshop-store D-5)
{
  const st = mockStorage({ [KEY]: '{"v":999,"gears":{"keep":{"name":"Real"}},"settings":{}}' });
  const s = createGearStore(st);
  check('G14 save refuses under skew', s.save({ name: 'g', fields: { printer: 'x1c' } }).error === 'version-skew');
  check('G14 the newer envelope is untouched', JSON.parse(st._map.get(KEY)).v === 999);
  check('G14 and its data survives', JSON.parse(st._map.get(KEY)).gears.keep.name === 'Real');
}

// G15 — settings: setters exist and updated_at moves; catalog news is max-wins
{
  const s = createGearStore(mockStorage());
  check('G15 setSavePromptDismissed exists', typeof s.setSavePromptDismissed === 'function');
  s.setSavePromptDismissed(true);
  check('G15 it persists', s.getSettings().save_prompt_dismissed === true);
  s.markCatalogSeen({ printers: 80, materials: 19 });
  const news = s.catalogNews({ printers: 83, materials: 19 });
  check('G15 news counts only the delta', news.printers === 3 && news.materials === 0);
  check('G15 news never goes negative', s.catalogNews({ printers: 70 }).printers === 0);
  check('G15 settings maps are null-prototype',
    Object.getPrototypeOf(s.getSettings().catalog_seen) === null);
}

// G16 — update() merges into a null-prototype target (gate SHOULD-FIX)
{
  const s = createGearStore(mockStorage({ [KEY]: envelope({ g1: row() }) }));
  s.update('g1', { fields: JSON.parse('{"__proto__":"evil","nozzle":"std_0.4"}') });
  check('G16 the patch cannot inject a reserved key', Object.keys(s.get('g1').fields).indexOf('__proto__') === -1);
  check('G16 the legitimate patch field applied', s.get('g1').fields.nozzle === 'std_0.4');
  check('G16 the pre-existing field survived', s.get('g1').fields.printer === 'x1c');
  check('G16 update still requires printer',
    s.update('g1', { fields: { printer: '' } }).error === 'required-printer');
}

// G17 — labels are permuted IN LOCKSTEP with their value array.
// Gear spec §2.3: labels "mirrors the shape of the value it labels ... a parallel
// array for a multi-valued one". If the two are sorted independently, a stale
// label silently attaches to the wrong id — exactly the case §2.3 says a flat
// string could not represent. Binding consequence #2 of the 2026-08-21 array
// amendment; it was manually verified and unpinned until now.
{
  const s = createGearStore(mockStorage());
  const r = s.save({
    name: 'g',
    fields:  { printer: 'x1c', material: ['pla_basic', 'abs'] },
    labels:  { printer: 'X1 Carbon', material: ['PLA Basic', 'ABS'] },
  });
  const g = s.get(r.gear.id);
  check('G17 the value array sorted bytewise', g.fields.material.join(',') === 'abs,pla_basic');
  check('G17 the label array followed the SAME permutation',
    g.labels.material.join(',') === 'ABS,PLA Basic',
    'got ' + JSON.stringify(g.labels.material) + ' — independent sorts would give the same here only by luck');
  // The discriminating case: a permutation where an independent alphabetical
  // sort of the LABELS produces a different pairing than the value sort does.
  const r2 = s.save({
    name: 'h',
    fields: { printer: 'x1c', useCase: ['zulu', 'alpha'] },
    labels: { printer: 'X1 Carbon' },
  });
  const h = s.get(r2.gear.id);
  check('G17 values sort independently of any label array', h.fields.useCase.join(',') === 'alpha,zulu');
}
{
  // Labels sorted independently would pair Bravo with 'a' here; lockstep pairs
  // Zulu with 'a'. Only lockstep is correct.
  const s = createGearStore(mockStorage());
  const r = s.save({
    name: 'g',
    fields: { printer: 'x1c', nozzle: ['b', 'a'] },
    labels: { printer: 'P', nozzle: ['Bravo', 'Zulu'] },   // b->Bravo, a->Zulu
  });
  const g = s.get(r.gear.id);
  check('G17 discriminating: value order', g.fields.nozzle.join(',') === 'a,b');
  check('G17 discriminating: label follows its OWN value, not its own sort',
    g.labels.nozzle.join(',') === 'Zulu,Bravo',
    'independent label sort would give Bravo,Zulu and mis-pair every row');
}

// G18 — update() treats an array field as UNCHANGED when the SET is unchanged.
// Binding consequence #3 of the amendment: a reordering must not move
// updated_at, or a version-skewed device manufactures a content edit that
// outranks a real rename on another device (gear spec §4.2 "reading must never
// outrank writing"). Seeded, because _now() is millisecond-resolution.
{
  const seeded = JSON.stringify({ v: 1, gears: { g1: {
    name: 'G', fields: { printer: 'x1c', useCase: ['alpha', 'zulu'] }, labels: {},
    created_at: T_OLD, updated_at: T_OLD, last_used_at: null, archived_at: null } }, settings: {} });

  const s = createGearStore(mockStorage({ [KEY]: seeded }));
  const w = s.update('g1', { fields: { useCase: ['zulu', 'alpha'] } });   // same SET, other order
  check('G18 the no-op update still reports ok', w.ok === true);
  check('G18 a reordering does NOT move updated_at', s.get('g1').updated_at === T_OLD);
  check('G18 and the stored order stays canonical', s.get('g1').fields.useCase.join(',') === 'alpha,zulu');

  const s2 = createGearStore(mockStorage({ [KEY]: seeded }));
  s2.update('g1', { fields: { useCase: ['alpha'] } });                     // different SET
  check('G18 a real set change DOES move updated_at', s2.get('g1').updated_at !== T_OLD);

  const s3 = createGearStore(mockStorage({ [KEY]: seeded }));
  s3.update('g1', { name: 'Renamed' });
  check('G18 a rename still moves updated_at', s3.get('g1').updated_at !== T_OLD);

  const s4 = createGearStore(mockStorage({ [KEY]: seeded }));
  s4.update('g1', { fields: { useCase: ['zulu', 'alpha'] } });
  check('G18 a no-op update does not create a spurious tombstone or lose the row',
    s4.get('g1') !== null && s4.get('g1').archived_at === null);
}

// G19 — GATE MUST-FIX: a non-content mutation must not rewrite content.
// _mutate rebuilt every row from a NORMALIZED dto, so touch() — "using" a gear —
// could dedupe/sort its fields and drop its labels. That is the "reading must
// never outrank writing" class (§4.2) re-entering through the write path, and it
// is the exact failure the array amendment exists to prevent.
{
  const messy = JSON.stringify({ v: 1, gears: { g1: {
    name: 'G',
    fields: { printer: 'x1c', useCase: ['zulu', 'alpha', 'zulu'] },  // unsorted + duplicate
    labels: { printer: 'X1 Carbon', bogus_key: 'kept-at-rest' },     // a key we drop on WRITE
    created_at: T_OLD, updated_at: T_OLD, last_used_at: null, archived_at: null,
  } }, settings: {} });

  const st = mockStorage({ [KEY]: messy });
  const s = createGearStore(st);
  const before = st._map.get(KEY);
  check('G19 touch reports ok', s.touch('g1').ok === true);

  const after = JSON.parse(st._map.get(KEY)).gears.g1;
  check('G19 touch moved last_used_at', typeof after.last_used_at === 'string');
  check('G19 touch left updated_at alone', after.updated_at === T_OLD);
  check('G19 touch did NOT re-sort the stored array',
    after.fields.useCase.join(',') === 'zulu,alpha,zulu',
    'got ' + JSON.stringify(after.fields.useCase) + ' — using a gear rewrote its content');
  check('G19 touch did NOT drop a stored label key',
    after.labels.bogus_key === 'kept-at-rest');
  check('G19 every other persisted field is byte-identical',
    JSON.stringify(Object.assign({}, after, { last_used_at: null })) ===
    JSON.stringify(Object.assign({}, JSON.parse(before).gears.g1, { last_used_at: null })));
}

// G20 — GATE MUST-FIX: write-path value and label shape validation.
// Spec §2.4 says a value is a string or an array of strings. Reading preserves
// whatever is there (§2.5 degrade-never-throw), but our OWN API must not create
// non-conforming data.
{
  const s = createGearStore(mockStorage());
  const bad = [
    ['number',        { printer: 'x1c', surface: 42 }],
    ['boolean',       { printer: 'x1c', surface: true }],
    ['object',        { printer: 'x1c', surface: { a: 1 } }],
    ['mixed array',   { printer: 'x1c', useCase: ['a', 7] }],
    ['nested array',  { printer: 'x1c', useCase: [['a']] }],
  ];
  bad.forEach(([label, fields]) => {
    check('G20 save rejects a ' + label + ' value',
      s.save({ name: 'g', fields: fields }).error === 'bad-value');
  });
  check('G20 nothing was persisted by the rejected writes', s.list().length === 0);
  check('G20 a conforming write still succeeds',
    s.save({ name: 'g', fields: { printer: 'x1c', useCase: ['a', 'b'] } }).ok === true);
}
{
  const s = createGearStore(mockStorage());
  check('G20 a label must mirror a string value with a string',
    s.save({ name: 'g', fields: { printer: 'x1c' }, labels: { printer: ['X1'] } }).error === 'bad-label');
  check('G20 a label must mirror an array value with a SAME-LENGTH array',
    s.save({ name: 'g', fields: { printer: 'x1c', material: ['a','b'] },
             labels: { material: ['only-one'] } }).error === 'bad-label');
  check('G20 a matching-length label array is accepted',
    s.save({ name: 'g', fields: { printer: 'x1c', material: ['b','a'] },
             labels: { material: ['Bee','Ay'] } }).ok === true);
  check('G20 and it was permuted in lockstep',
    s.list()[0].labels.material.join(',') === 'Ay,Bee');
}

// G21 — GATE MUST-FIX: settings writes drop unknown keys (§2.2 defines the shape)
{
  const seeded = JSON.stringify({ v: 1, gears: {}, settings: {
    active_gear: null, catalog_seen: {}, save_prompt_dismissed: false,
    updated_at: T_OLD, undocumented_extension: 'should not survive a write' } });
  const st = mockStorage({ [KEY]: seeded });
  const s = createGearStore(st);
  s.setSavePromptDismissed(true);
  const after = JSON.parse(st._map.get(KEY)).settings;
  check('G21 the undocumented settings key is dropped on write',
    !('undocumented_extension' in after));
  check('G21 the documented fields survive',
    after.save_prompt_dismissed === true && 'catalog_seen' in after);
}

// G22 — GATE MUST-FIX: an impossible date is not a valid timestamp.
// A regex alone accepted 9999-99-99T99:99:99.999Z, which sorts ABOVE every real
// row under a descending created_at comparison.
{
  const s = createGearStore(mockStorage({ [KEY]: JSON.stringify({ v: 1, gears: {
    real:       row({ created_at: T_NEW, last_used_at: null }),
    impossible: row({ created_at: '9999-99-99T99:99:99.999Z', last_used_at: null }),
    offset:     row({ created_at: '2026-01-01T00:00:00.000+02:00', last_used_at: null }),
    no_ms:      row({ created_at: '2026-01-01T00:00:00Z', last_used_at: null }),
  }, settings: {} }) }));
  const ids = s.list().map(g => g.id);
  check('G22 the only genuinely valid created_at leads', ids[0] === 'real');
  check('G22 an impossible date does not outrank a real one', ids.indexOf('impossible') > 0);
  check('G22 a local offset is not a valid UTC-ms timestamp', ids.indexOf('offset') > 0);
  check('G22 a missing millisecond field is not valid', ids.indexOf('no_ms') > 0);
}

// G23 — the two UTF-8 encoders must agree BYTE FOR BYTE.
// _cmpKey uses TextEncoder when present and a hand-written encoder when not.
// If those disagree on any input, the "frozen" order becomes a function of the
// runtime rather than of the data. Found by differential testing during the
// gate round: a LONE surrogate has no UTF-8 encoding, and TextEncoder
// substitutes U+FFFD (EF BF BD) while a naive encoder emits ED A0 80.
{
  const manual = (str) => {
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.codePointAt(i);
      if (c > 0xFFFF) i++;
      if (c >= 0xD800 && c <= 0xDFFF) c = 0xFFFD;
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out.join(',');
  };
  const enc = new TextEncoder();
  const cases = ['a', 'z', 'aa', 'x1c', 'pla_basic', 'ø', '€', '',
                 '\u{10000}', '\u{10FFFF}', '￿', '\uD800', '\uDFFF', '\uD800a'];
  let mismatches = 0;
  cases.forEach(c => { if (manual(c) !== [...enc.encode(c)].join(',')) mismatches++; });
  check('G23 manual UTF-8 encoder matches TextEncoder on every case, incl. lone surrogates',
    mismatches === 0, mismatches + ' of ' + cases.length + ' disagree');
}

console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASS');
  process.exit(0);
} else {
  console.log(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
