#!/usr/bin/env node
'use strict';
// ─── 3D Print Assistant — Gear fixture generator (3dpa_gear_v1) ──────────────
//
//   node scripts/gen-gear-fixtures.cjs > scripts/fixtures/gear-fixtures.json
//
// Drives the REAL gear-store.js and gear-validate.js — no re-implementation,
// no hand-written expectations — and prints one JSON document to stdout. The
// committed output at scripts/fixtures/gear-fixtures.json is the cross-platform
// conformance corpus for the iOS port: every case is a behaviour a Swift
// implementation of `3dpa_gear_v1` must reproduce byte for byte.
//
// `3dpa_gear_v1` has been frozen since the first production browser write on
// 2026-08-21, so a fixture that drifts is a compatibility bug, not a style
// choice. Regenerate and diff; every changed line must be intentional.
//
// ─── WHY THE DETERMINISM SCAFFOLDING BELOW LOOKS THE WAY IT DOES ────────────
//
// Do NOT "simplify" the two hacks at the top of this file. Both are load-bearing
// and both fail SILENTLY — the generator keeps exiting 0 and keeps printing
// plausible-looking JSON while the fixtures quietly stop being reproducible.
//
//  1. The frozen Date is a SUBCLASS, and `Date.parse` stays the REAL one.
//     gear-store.js:74-79 (`_validIso`) decides ISO validity by ROUND TRIP:
//     regex → `Date.parse(v)` → `new Date(t).toISOString() === v`. Stubbing
//     `Date` with a plain object, or with something whose `parse` returns a
//     constant, collapses that round trip. VERIFIED by disabling it: with
//     `Date.parse` returning the frozen instant, EVERY timestamp fails the
//     round trip, every row falls through to the id tie-break, and the total
//     order in case O1 silently becomes plain id-ascending — exit 0, no error,
//     a corpus that pins the wrong order. So: `new Date()` and `Date.now()`
//     are frozen; `new Date(x)` and `Date.parse(x)` are real behaviour.
//
//  2. `crypto` is installed with Object.defineProperty, NOT assignment.
//     On Node >= 19 `globalThis.crypto` is an ACCESSOR WITH A GETTER AND NO
//     SETTER, so `globalThis.crypto = {...}` cannot replace it. Under this
//     file's 'use strict' prologue that assignment throws a TypeError; drop or
//     relocate the prologue (a vm-loaded scope is sloppy by default — see
//     load-browser-script.js) and it becomes a SILENT no-op instead: the
//     generator keeps minting real random UUIDs and prints a different document
//     on every run, exit 0, with nothing to explain it. VERIFIED by disabling
//     it: two consecutive sloppy-mode runs produced two different sha256s.
//     defineProperty is the only way to replace an accessor property.
//
// Determinism is verified by running the generator twice and diffing; that
// check is part of the commit procedure for this file.
//
// Related: scripts/engine-golden-snapshot.js (same fixtures/ conventions —
// 1-space indent, trailing newline, `__meta` note).

// ─── 1. Freeze the clock BEFORE the modules are loaded ──────────────────────
const RealDate = Date;
const EPOCH = RealDate.parse('2026-08-22T09:00:00.000Z');
let FROZEN = EPOCH;

class FrozenDate extends RealDate {
  constructor(...args) {
    // Zero-arg `new Date()` is the only form that reads the clock; every other
    // form must behave exactly as the real constructor does, because
    // `_validIso` builds `new Date(parsedMillis)` and compares the round trip.
    if (args.length === 0) super(FROZEN);
    else super(...args);
  }
  static now() { return FROZEN; }
}
// Explicit, even though static inheritance would already provide them: a
// future reader must be able to see that parse/UTC are the REAL implementations
// and not accidentally shadow them.
FrozenDate.parse = RealDate.parse;
FrozenDate.UTC = RealDate.UTC;
globalThis.Date = FrozenDate;

function nowIso() { return new RealDate(FROZEN).toISOString(); }
// `_now()` is millisecond-resolution. Two operations in the same tick produce
// IDENTICAL ISO strings, and a before/after comparison over them has already
// produced two false REDs in this repo (see gear-store.test.js G9 and G31).
// Any case that needs two distinguishable timestamps advances the clock here,
// explicitly, so the fixture states which instant each write carries.
function advance(ms) { FROZEN += ms; return nowIso(); }
function resetClock() { FROZEN = EPOCH; return nowIso(); }

// ─── 2. Deterministic crypto.randomUUID ─────────────────────────────────────
// Lowercase, because `crypto.randomUUID()` is lowercase and the gear id is a
// SORT KEY (gear-store.js:149 `_cmpKey`). Swift's `UUID().uuidString` is
// UPPERCASE, which is a different byte sequence and therefore a different total
// order — the ids here are what a conforming port must be able to produce.
let uuidCounter = 0;
function nextUuid() {
  uuidCounter += 1;
  return '00000000-0000-4000-8000-' + uuidCounter.toString(16).padStart(12, '0');
}
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: nextUuid },
  writable: true,
  configurable: true,
  enumerable: false,
});
if (globalThis.crypto.randomUUID !== nextUuid) {
  // Fail loudly rather than emit a non-reproducible corpus.
  throw new Error('gen-gear-fixtures: crypto stub did not take — see note (2) above');
}

// ─── 3. Load the real modules (after the globals are in place) ──────────────
const { loadBrowserScript } = require('./load-browser-script.js');
const { createGearStore } = loadBrowserScript('gear-store.js', ['createGearStore']);
const { inspectGear } = loadBrowserScript('gear-validate.js', ['inspectGear']);

// ─── Harness ────────────────────────────────────────────────────────────────
const KEY = '3dpa_gear_v1';

// Mirrors scripts/gear-store.test.js mockStorage, plus a write log: several
// properties of this format are visible ONLY in the persisted bytes (a label
// key outside LABEL_KEYS, a non-conforming stored value, top-level junk), never
// in the DTO that get()/list() return. Every case captures both sides.
function mockStorage(rawSeed) {
  const map = new Map();
  if (typeof rawSeed === 'string') map.set(KEY, rawSeed);
  const writes = [];
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { const s = String(v); map.set(k, s); writes.push(s); },
    removeItem: k => map.delete(k),
    raw: () => (map.has(KEY) ? map.get(KEY) : null),
    writes,
  };
}

const CASES = [];

function newCase(id, title, pins, seed) {
  const st = mockStorage(seed);
  const store = createGearStore(st);
  const rec = {
    id, title, pins,
    seed: seed === undefined ? null : seed,
    steps: [],
    persisted_final: null,
    read: null,
  };
  const api = {
    store,
    storage: st,
    // Runs one operation and records the clock it ran at, what it returned, and
    // the EXACT string handed to setItem (null when the operation wrote
    // nothing — a no-op that does not write is itself a pinned behaviour).
    step(label, fn) {
      const before = st.writes.length;
      const clock = nowIso();
      const result = fn();
      const wrote = st.writes.slice(before);
      rec.steps.push({
        op: label,
        clock,
        result: result === undefined ? null : result,
        wrote: wrote.length ? wrote[wrote.length - 1] : null,
        write_count: wrote.length,
      });
      return result;
    },
    advance(ms, why) {
      const to = advance(ms);
      rec.steps.push({ op: 'ADVANCE CLOCK', clock: to, reason: why, result: null, wrote: null, write_count: 0 });
      return to;
    },
    finish(read) {
      rec.persisted_final = st.raw();
      rec.read = read === undefined ? null : read;
      CASES.push(rec);
      return rec;
    },
  };
  return api;
}

const T_OLD = '2020-01-01T00:00:00.000Z';
const T_MID = '2021-01-01T00:00:00.000Z';
const T_NEW = '2022-01-01T00:00:00.000Z';

function row(extra) {
  return Object.assign({
    name: 'G', fields: { printer: 'x1c' }, labels: {},
    created_at: T_OLD, updated_at: T_OLD, last_used_at: null, archived_at: null,
  }, extra || {});
}
function envelope(gears, settings) {
  return JSON.stringify({ v: 1, gears: gears || {}, settings: settings || {} });
}

// ════════════════════════════════════════════════════════════════════════════
// SAVE
// ════════════════════════════════════════════════════════════════════════════

// Written with EXPLICIT escapes, never as literal characters: U+FEFF and U+0085
// are invisible and an editor, a linter or a copy-paste will silently eat them,
// turning this probe into a plain-whitespace test that proves nothing.
//   U+FEFF ZERO WIDTH NO-BREAK SPACE — JS trim() DOES strip it
//   U+0009 TAB                       — JS trim() DOES strip it
//   U+0085 NEXT LINE (NEL)           — JS trim() does NOT strip it
// Swift's .whitespacesAndNewlines is wrong in BOTH directions (it strips NEL and
// does not strip U+FEFF), so a port must build the trim set explicitly.
const TRIM_PROBE = '\uFEFF \tBench Gear\u0085 \t';

// S1 — the create literal, end to end.
{
  resetClock();
  const c = newCase('S1', 'save() — the create literal',
    'The exact bytes a fresh save writes: id from crypto.randomUUID() (lowercase), '
    + 'created_at == updated_at == _now(), last_used_at and archived_at null, and NO `id` / '
    + '`invalid` key in the persisted row (identity lives in the map key, spec §2.3). '
    + 'The name is trimmed with JS String.prototype.trim: U+FEFF and U+0009 ARE stripped, '
    + 'U+0085 (NEL) is NOT — Swift .whitespacesAndNewlines is wrong in both directions. '
    + 'The multi-value array is deduplicated and sorted UTF-8 bytewise with its parallel '
    + 'label array carried along in LOCKSTEP (never two independent sorts), and `[]` '
    + 'survives as pinned-as-none, distinct from an absent key.');
  const r = c.step('save', () => c.store.save({
    name: TRIM_PROBE,
    fields: {
      printer: 'x1c',
      material: ['pla_basic', 'abs', 'pla_basic'],
      special: [],
      some_future_key: 'preserved-at-rest',
    },
    labels: {
      printer: 'X1 Carbon',
      material: ['PLA Basic', 'ABS', 'PLA Basic (dup)'],
      bogus_key: 'dropped-on-write (outside LABEL_KEYS)',
    },
    top_level_junk: 'the public API cannot create this',
  }));
  const id = r.gear.id;
  c.finish({
    saved_id: id,
    name_input_codepoints: [...TRIM_PROBE].map(ch => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')),
    name_persisted_codepoints: [...r.gear.name].map(ch => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')),
    get: c.store.get(id),
    list: c.store.list(),
    diagnostics: c.store.diagnostics(),
  });
}

// ════════════════════════════════════════════════════════════════════════════
// TOTAL ORDER
// ════════════════════════════════════════════════════════════════════════════

// O1 — the full comparator, in one envelope.
{
  resetClock();
  const seed = envelope({
    used_new:    row({ last_used_at: T_NEW, created_at: T_OLD }),
    used_old:    row({ last_used_at: T_MID, created_at: T_OLD }),
    never_newest: row({ last_used_at: null, created_at: T_NEW }),
    // created_at tie → id ascending, bytewise UTF-8.
    '':          row({ last_used_at: null, created_at: T_MID }),   // EMPTY STRING            -> (no bytes)
    zz:          row({ last_used_at: null, created_at: T_MID }),
    '\u00F8':    row({ last_used_at: null, created_at: T_MID }),   // LATIN SMALL O WITH STROKE -> C3 B8
    '\uE000':    row({ last_used_at: null, created_at: T_MID }),   // PRIVATE USE AREA        -> EE 80 80
    '\u{10000}': row({ last_used_at: null, created_at: T_MID }),   // LINEAR B SYLLABLE B008 A -> F0 90 80 80
    // last_used_at that fails the round trip is treated as ABSENT, not compared
    // raw: `42 > "2020-…"` under JS coercion would otherwise outrank every real
    // stamp. Same for created_at, which falls back to the sort sentinel.
    offset_used: row({ last_used_at: '2099-01-01T00:00:00.000+02:00', created_at: T_OLD }),
    bad_created: row({ last_used_at: null, created_at: 42 }),
  });
  const c = newCase('O1', 'total order — last_used_at desc, NULLS LAST, created_at desc, id asc bytewise',
    'The frozen sync order. NOTE the two traps: (a) `\u{10000}` sorts AFTER `` by UTF-8 '
    + 'bytes (F0 90 80 80 vs EE 80 80) but BEFORE it by UTF-16 code units (surrogate D800 < E000), '
    + 'so a naive `<` / String comparison gets it backwards — and Swift `String <` is canonical '
    + 'equivalence, not bytes, so it is also wrong. Use Array(s.utf8) lexicographic, shorter-is-less '
    + 'on a prefix tie (which is why the empty-string id leads its created_at group). '
    + '(b) An unparseable last_used_at / created_at is treated as absent, never compared raw. '
    + 'localeCompare / Swift compare(_:) are forbidden: in da-DK collation this order changes.',
    seed);
  const ids = c.store.list().map(g => g.id);
  c.finish({
    expected_order: ids,
    expected_order_codepoints: ids.map(s => [...s].map(ch => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'))),
    utf8_bytes_of_ids: ids.map(s => Array.from(Buffer.from(s, 'utf8'))),
    list: c.store.list(),
    diagnostics: c.store.diagnostics(),
    // Reading never writes: the unparseable created_at is still 42 on disk.
    bytes_unchanged_by_read: c.storage.raw() === seed,
  });
}

// O2 — a later, unrelated write must not repair a sibling's bad created_at.
{
  resetClock();
  const seed = envelope({
    good: row({ created_at: T_NEW, last_used_at: null }),
    bad:  row({ created_at: 42, last_used_at: null }),
  });
  const c = newCase('O2', 'read-side repair NEVER writes, and neither does an unrelated write',
    'The sort sentinel 0000-00-00T00:00:00.000Z exists only in memory. Rewriting a bad '
    + 'created_at to now() would diverge across devices AND manufacture a spurious sync write.',
    seed);
  c.step('touch("good")', () => c.store.touch('good'));
  c.finish({
    order_before_write: ['good', 'bad'],
    order_after_write: c.store.list().map(g => g.id),
    bad_created_at_still_42: JSON.parse(c.storage.raw()).gears.bad.created_at === 42,
    get_bad: c.store.get('bad'),
  });
}

// ════════════════════════════════════════════════════════════════════════════
// ISO VALIDITY — a ROUND TRIP, not a parse
// ════════════════════════════════════════════════════════════════════════════
{
  const probes = [
    ['I1', '2026-01-01T00:00:00.000+02:00', 'a local UTC offset — ISO8601DateFormatter accepts it, the store must NOT'],
    ['I2', '2026-01-01T00:00:00Z', 'a missing millisecond field — passes a lenient parser, fails the regex'],
    ['I3', '2026-02-30T00:00:00.000Z', 'an impossible date — Date.parse ROLLS IT OVER to 2026-03-02 and a parse-only check '
      + 'would accept it; the round-trip re-render is what rejects it. An accepted impossible date sorts ABOVE every real row.'],
  ];
  for (const [id, stamp, why] of probes) {
    resetClock();
    // Isolated against ONE older-but-valid row, so "sorts last" is decidable
    // (a shared envelope hides a rejection behind whichever row took first place).
    const seed = envelope({
      good:  row({ created_at: T_MID, last_used_at: null }),
      probe: row({ created_at: stamp, last_used_at: null }),
    });
    const c = newCase(id, 'ISO validity rejection: ' + stamp, why, seed);
    c.finish({
      probe_created_at: stamp,
      // What a parse-only implementation would have produced, for contrast.
      parse_only_would_render: (function () {
        const t = RealDate.parse(stamp);
        return isFinite(t) ? new RealDate(t).toISOString() : null;
      })(),
      round_trip_matches_input: (function () {
        const t = RealDate.parse(stamp);
        return isFinite(t) && new RealDate(t).toISOString() === stamp;
      })(),
      // The probe row carries a NEWER-looking stamp, so if it were accepted it
      // would lead. It must sort behind the genuinely older valid row.
      expected_order: c.store.list().map(g => g.id),
      get_probe: c.store.get('probe'),
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TOUCH — a non-content mutation must launder nothing
// ════════════════════════════════════════════════════════════════════════════
{
  resetClock();
  const seed = JSON.stringify({ v: 1, gears: { g1: {
    name: 'G',
    fields: {
      printer: 'x1c',
      surface: 42,                                 // non-conforming value
      useCase: ['zulu', 'alpha', 'zulu'],          // unsorted + duplicate
    },
    labels: {
      printer: 'X1 Carbon',
      bogus_key: 'kept-at-rest',                   // outside LABEL_KEYS
    },
    created_at: T_OLD, updated_at: T_OLD, last_used_at: null, archived_at: null,
    top_level_junk: 'from a hand edit',
  } }, settings: {} });
  const c = newCase('T1', 'touch() moves last_used_at ALONE and rewrites nothing else',
    'touch() deliberately BYPASSES the normalizing _mutate path. Using a gear is not editing it '
    + '(spec §4.2 "reading must never outrank writing"): if touch bumped updated_at, opening a gear '
    + 'on the iPad would beat a rename made moments earlier on the iPhone. And the raw row is patched, '
    + 'never rebuilt — the numeric `surface`, the unsorted duplicate array, the non-LABEL_KEYS label '
    + 'and the top-level junk all survive verbatim. Compare `get` below (normalized IN MEMORY: '
    + 'labels.bogus_key is gone) against `persisted_final` (bytes: it is still there). That divergence '
    + 'is the point — a Swift JSONDecoder → mutate → JSONEncoder round trip cannot express it.',
    seed);
  c.step('touch("g1")', () => c.store.touch('g1'));
  const after = JSON.parse(c.storage.raw()).gears.g1;
  c.finish({
    get: c.store.get('g1'),
    updated_at_unchanged: after.updated_at === T_OLD,
    last_used_at_after: after.last_used_at,
    stored_useCase_not_resorted: after.fields.useCase,
    stored_surface_not_coerced: after.fields.surface,
    stored_bogus_label_survived: after.labels.bogus_key,
    stored_top_level_junk_survived: after.top_level_junk,
    dto_labels_keys: Object.keys(c.store.get('g1').labels),
    every_other_byte_identical:
      JSON.stringify(Object.assign({}, after, { last_used_at: null })) ===
      JSON.stringify(Object.assign({}, JSON.parse(seed).gears.g1, { last_used_at: null })),
  });
}

// ════════════════════════════════════════════════════════════════════════════
// ARCHIVE / RESTORE — including the redundant no-ops
// ════════════════════════════════════════════════════════════════════════════
{
  resetClock();
  const c = newCase('A1', 'archive / restore, with the redundant calls that must be NO-OPS',
    'archived_at is part of the record content, so a REAL archive/restore moves updated_at. '
    + 'A redundant one must not: moving the clock with no content change manufactures an edit '
    + 'that can win a later sync merge. Death is a tombstone, never a removal — a hard delete '
    + 'cannot travel under sync (any device still holding the row would re-upload it). '
    + 'Note `_isLive` is TRUTHINESS, not != nil: archived_at of "", 0 or false means LIVE. '
    + 'The clock is advanced between steps because _now() is millisecond-resolution.',
    envelope({ g1: row() }));
  c.advance(60000, 'so the archive stamp is distinguishable from the seed');
  c.step('archive("g1") — real', () => c.store.archive('g1'));
  const afterArchive = JSON.parse(c.storage.raw()).gears.g1.updated_at;
  c.advance(60000, 'so a clock move by the redundant call would be VISIBLE');
  c.step('archive("g1") — redundant, must be a no-op', () => c.store.archive('g1'));
  c.advance(60000, 'so the restore stamp is distinguishable from the archive stamp');
  c.step('restore("g1") — real', () => c.store.restore('g1'));
  c.advance(60000, 'so a clock move by the redundant call would be VISIBLE');
  c.step('restore("g1") — redundant, must be a no-op', () => c.store.restore('g1'));
  const final = JSON.parse(c.storage.raw()).gears.g1;
  c.finish({
    updated_at_after_real_archive: afterArchive,
    updated_at_final: final.updated_at,
    archived_at_final: final.archived_at,
    get: c.store.get('g1'),
    list_contains_it_again: c.store.list().map(g => g.id),
    listArchived: c.store.listArchived().map(g => g.id),
  });
}
{
  // Seeded ARCHIVED, so "restore moved the clock" is decidable without relying
  // on archive-then-restore inside one tick producing two identical stamps.
  resetClock();
  const c = newCase('A2', 'archive/restore visibility in list() vs listArchived()',
    'An archived gear leaves list() and appears in listArchived(); restoring puts it back. '
    + 'The row is never removed from the envelope in either direction.',
    envelope({ live: row({ name: 'Live' }), dead: row({ name: 'Dead', archived_at: T_OLD }) }));
  c.finish({
    list: c.store.list().map(g => g.id),
    listArchived: c.store.listArchived().map(g => g.id),
    get_dead: c.store.get('dead'),
    diagnostics: c.store.diagnostics(),
  });
}

// ════════════════════════════════════════════════════════════════════════════
// UPDATE — one basis: the post-image of every touched (value, label) PAIR
// ════════════════════════════════════════════════════════════════════════════
function seedPairs(fields, labels) {
  return JSON.stringify({ v: 1, gears: { g1: {
    name: 'G', fields: fields, labels: labels,
    created_at: T_OLD, updated_at: T_OLD, last_used_at: null, archived_at: null,
  } }, settings: {} });
}

// U1 — labels-only patch must re-associate coherently, never half-apply.
{
  resetClock();
  const c = newCase('U1', 'update() — a labels-only patch re-associates the PAIR',
    'Stored a->Ay, b->Bee. The patch names only labels, reversed. Sorting the two sides '
    + 'independently would leave the association inverted; the pair must move in lockstep, so '
    + 'the value side is written together with the label side. Compare STRUCTURALLY, element by '
    + 'element — an earlier fix serialized each pair into one delimited string, which collides '
    + 'whenever a conforming value or label CONTAINS the delimiter and silently swallows a real patch.',
    seedPairs({ printer: 'x1c', material: ['a', 'b'] }, { material: ['Ay', 'Bee'] }));
  c.advance(60000, 'so a clock move is decidable against the T_OLD seed');
  c.step('update labels only, reversed', () => c.store.update('g1', { labels: { material: ['Bee', 'Ay'] } }));
  const a = JSON.parse(c.storage.raw()).gears.g1;
  c.finish({
    persisted_pairs: a.fields.material.map((v, i) => v + '->' + a.labels.material[i]),
    updated_at_moved: a.updated_at !== T_OLD,
    get: c.store.get('g1'),
  });
}

// U2 — a pure reordering is not a content edit.
{
  resetClock();
  const c = newCase('U2', 'update() — a pure reordering is a NO-OP (set equality, not sequence equality)',
    'Array fields compare as SETS. A version-skewed device that re-sorts must not manufacture a '
    + 'content edit that outranks a real rename made elsewhere. Nothing is written at all: '
    + 'note `wrote: null` on the step below, not merely an unchanged updated_at.',
    seedPairs({ printer: 'x1c', material: ['a', 'b'] }, { material: ['A', 'B'] }));
  c.advance(60000, 'so a clock move would be VISIBLE if the no-op were mis-detected');
  c.step('update with the SAME pairs, reordered', () => c.store.update('g1', {
    fields: { material: ['b', 'a'] }, labels: { material: ['B', 'A'] },
  }));
  c.finish({
    updated_at_unchanged: JSON.parse(c.storage.raw()).gears.g1.updated_at === T_OLD,
    bytes_untouched: c.storage.writes.length === 0,
    get: c.store.get('g1'),
  });
}

// U3 — a real pair change.
{
  resetClock();
  const c = newCase('U3', 'update() — a real pair change DOES move updated_at',
    'The discriminating counterpart to U2: same shape of patch, different SET, so the write '
    + 'happens and the value clock moves. Fields and labels are written TOGETHER or not at all.',
    seedPairs({ printer: 'x1c', material: ['a', 'b'] }, { material: ['A', 'B'] }));
  c.advance(60000, 'so the new updated_at is distinguishable from the seed');
  c.step('update to a different SET', () => c.store.update('g1', {
    fields: { material: ['a', 'c'] }, labels: { material: ['A', 'C'] },
  }));
  const a = JSON.parse(c.storage.raw()).gears.g1;
  c.finish({
    updated_at_moved: a.updated_at !== T_OLD,
    persisted_pairs: a.fields.material.map((v, i) => v + '->' + a.labels.material[i]),
    get: c.store.get('g1'),
  });
}

// U4 — narrowing a field under an array label is REJECTED.
{
  resetClock();
  const c = newCase('U4', 'update() — narrowing a value under an array label is rejected, then accepted when both move',
    'The mirror rule (labels mirror the SHAPE of the value they label) is checked against the value '
    + 'the label will ACTUALLY accompany, including when only the FIELD side moved. A string value '
    + 'cannot carry a two-element label array, so the write fails closed with `bad-label` and nothing '
    + 'is persisted. Patching both sides together is accepted.',
    seedPairs({ printer: 'x1c', material: ['a', 'b'] }, { material: ['A', 'B'] }));
  c.step('update fields only → bad-label', () => c.store.update('g1', { fields: { material: 'pla_basic' } }));
  c.advance(60000, 'so the accepted write below carries a distinguishable stamp');
  c.step('update both sides together → ok', () => c.store.update('g1', {
    fields: { material: 'pla_basic' }, labels: { material: 'PLA Basic' },
  }));
  c.finish({
    get: c.store.get('g1'),
    // required-printer is enforced against the POST-IMAGE, not the patch.
    narrowing_printer_to_empty: c.store.update('g1', { fields: { printer: '' } }),
  });
}

// U5 — three-state patch fields, and the name coercion that differs from save().
{
  resetClock();
  const c = newCase('U5', 'update() — absent vs null vs value, and String() name coercion',
    'A patch field has THREE states: absent (leave alone), null (explicit), value. Collapsing '
    + 'absent and null loses the delete path. Note the name asymmetry a port must NOT unify: '
    + 'update() coerces via String(p.name) with null/undefined → "" (so ["a","b"] becomes "a,b" '
    + 'and {} becomes "[object Object]"), while save() does NOT coerce — a non-string name there '
    + 'simply becomes "".',
    seedPairs({ printer: 'x1c', material: ['a', 'b'] }, { material: ['A', 'B'] }));
  c.advance(60000, 'distinguishable stamp for the rename');
  c.step('update name from an ARRAY (String() coercion)', () => c.store.update('g1', { name: ['a', 'b'] }));
  c.advance(60000, 'distinguishable stamp');
  c.step('update name to null → empty string', () => c.store.update('g1', { name: null }));
  c.advance(60000, 'a clock move here would mean the no-op was mis-detected');
  c.step('update with an EMPTY patch → no-op', () => c.store.update('g1', {}));
  c.advance(60000, 'distinguishable stamp');
  c.step('save() does NOT coerce a non-string name', () => c.store.save({ name: ['a', 'b'], fields: { printer: 'x1c' } }));
  c.finish({
    g1: c.store.get('g1'),
    list: c.store.list().map(g => ({ id: g.id, name: g.name })),
  });
}

// ════════════════════════════════════════════════════════════════════════════
// HOSTILE ENVELOPE
// ════════════════════════════════════════════════════════════════════════════
{
  resetClock();
  // MUST be a JSON string. An object literal never serializes a `__proto__` key
  // (`{__proto__: x}` sets the prototype instead of creating a property), so an
  // object-literal fixture would prove nothing at all.
  const hostile =
    '{"v":1,"gears":{'
    + '"__proto__":{"name":"evil-gear-id","fields":{"printer":"x1c"},"labels":{},'
    + '"created_at":"' + T_OLD + '","updated_at":"' + T_OLD + '","last_used_at":null,"archived_at":null},'
    + '"good":{"name":"good","fields":{"printer":"x1c","__proto__":"evil-field-key","constructor":"evil","prototype":"evil"},'
    + '"labels":{"__proto__":"evil-label-key","printer":"X1 Carbon"},'
    + '"created_at":"' + T_OLD + '","updated_at":"' + T_OLD + '","last_used_at":null,"archived_at":null}},'
    + '"settings":{"__proto__":"evil-settings-key","active_gear":"good","catalog_seen":{"__proto__":9,"printers":80}}}';
  const c = newCase('H1', 'hostile envelope — __proto__ as gear id, as field key, as label key, in settings',
    'RESERVED = __proto__ / constructor / prototype, dropped and COUNTED at every level: the gears '
    + 'map, fields, labels, settings, catalog_seen. The readable sibling survives. Every returned map '
    + 'is null-prototype. In Swift the analogous hazard is different and worse: Dictionary keys compare '
    + 'by canonical equivalence, so two gear ids differing only by Unicode normalization COLLAPSE to one '
    + 'row (silent loss of a whole gear) — hence the required raw preflight scan of the gears keys.',
    hostile);
  c.finish({
    fixture_really_contains_the_key: hostile.indexOf('"__proto__"') !== -1,
    list: c.store.list(),
    get_reserved_id: c.store.get('__proto__'),
    good_field_keys: Object.keys(c.store.list()[0].fields),
    good_label_keys: Object.keys(c.store.list()[0].labels),
    fields_null_prototype: Object.getPrototypeOf(c.store.list()[0].fields) === null,
    labels_null_prototype: Object.getPrototypeOf(c.store.list()[0].labels) === null,
    diagnostics: c.store.diagnostics(),
    settings: c.store.getSettings(),
    settings_catalog_seen_null_prototype: Object.getPrototypeOf(c.store.getSettings().catalog_seen) === null,
    no_prototype_pollution: ({}).evil === undefined && Object.prototype.evil === undefined,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// VERSION SKEW — preserved, never overwritten
// ════════════════════════════════════════════════════════════════════════════
{
  const skews = [
    ['K1', '{"v":2,"gears":{"keep":{"name":"Written by a newer build"}},"settings":{"active_gear":"keep"}}',
      'v:2 — a NUMBER we do not understand'],
    ['K2', '{"v":"1","gears":{"keep":{"name":"Written by a sloppy build"}},"settings":{}}',
      'v:"1" — the STRING "1". The check is `env.v !== VERSION`, a strict comparison against the '
      + 'number 1, so "1" is skew. A Swift decoder that coerces the type would clobber the envelope.'],
  ];
  for (const [id, seed, why] of skews) {
    resetClock();
    const c = newCase(id, 'version skew: ' + why,
      'Readable as JSON but not a version we understand → reads degrade to empty, the write '
      + 'chokepoint REFUSES with `version-skew`, and the bytes are left exactly as found so a '
      + 'newer build on another device is never clobbered.', seed);
    c.step('save under skew', () => c.store.save({ name: 'g', fields: { printer: 'x1c' } }));
    c.step('touch under skew', () => c.store.touch('keep'));
    c.step('archive under skew', () => c.store.archive('keep'));
    c.step('setActiveGear under skew', () => c.store.setActiveGear('other'));
    c.finish({
      hasVersionSkew: c.store.hasVersionSkew(),
      list: c.store.list(),
      diagnostics: c.store.diagnostics(),
      bytes_untouched: c.storage.raw() === seed,
      write_attempts: c.storage.writes.length,
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════════════════════════════════
{
  resetClock();
  const c = newCase('E1', 'settings — active_gear, catalog_seen, save_prompt_dismissed, and the no-op rule',
    'settings is its own sync record resolved by settings.updated_at (§4.2), so a setter that '
    + 'changes NOTHING must not write — otherwise a device that merely read the settings beats a real '
    + 'change made elsewhere. §2.2 defines the shape exhaustively, so a write emits exactly the four '
    + 'documented fields and DROPS unknown keys (unlike `fields`, where §2.4 mandates preservation). '
    + 'active_gear is a HINT: it is not repaired on read and callers fall back when it does not resolve.',
    JSON.stringify({ v: 1, gears: {}, settings: {
      active_gear: null, catalog_seen: { printers: 80 }, save_prompt_dismissed: false,
      updated_at: T_OLD, undocumented_extension: 'must not survive a write',
    } }));
  c.advance(60000, 'distinguishable stamp for the first real write');
  c.step('setActiveGear("g1") — real change', () => c.store.setActiveGear('g1'));
  c.advance(60000, 'a clock move here would mean the no-op was mis-detected');
  c.step('setActiveGear("g1") again — no-op', () => c.store.setActiveGear('g1'));
  c.advance(60000, 'a clock move here would mean the no-op was mis-detected');
  c.step('markCatalogSeen({printers:80}) — same value, no-op', () => c.store.markCatalogSeen({ printers: 80 }));
  c.advance(60000, 'distinguishable stamp');
  c.step('markCatalogSeen({printers:83, materials:19}) — real change', () => c.store.markCatalogSeen({ printers: 83, materials: 19 }));
  c.advance(60000, 'a clock move here would mean the no-op was mis-detected');
  c.step('setSavePromptDismissed(false) — already false, no-op', () => c.store.setSavePromptDismissed(false));
  c.advance(60000, 'distinguishable stamp');
  c.step('setSavePromptDismissed(true) — real change', () => c.store.setSavePromptDismissed(true));
  c.finish({
    settings: c.store.getSettings(),
    undocumented_key_dropped: !('undocumented_extension' in JSON.parse(c.storage.raw()).settings),
    catalogNews_growth: c.store.catalogNews({ printers: 90, materials: 19 }),
    catalogNews_unseen_key_counts_from_zero: c.store.catalogNews({ plates: 5 }),
    // A catalog that SHRANK (a retired printer) is not news, and a negative
    // count would render as nonsense. Math.max(0, now - was).
    catalogNews_would_go_negative: c.store.catalogNews({ printers: 70 }),
    catalogNews_non_numeric: c.store.catalogNews({ printers: 'lots', materials: null }),
  });
}
{
  resetClock();
  const c = newCase('E2', 'settings — active_gear is a HINT and is not repaired on read',
    'A dangling active_gear (the gear was archived, or never existed) is returned as-is. '
    + 'A reserved or non-string value reads back as null without a write.',
    JSON.stringify({ v: 1, gears: { g1: row() }, settings: {
      active_gear: 'does_not_exist', catalog_seen: {}, save_prompt_dismissed: false, updated_at: T_OLD,
    } }));
  c.step('setActiveGear("__proto__") → coerced to null', () => c.store.setActiveGear('__proto__'));
  c.finish({
    settings: c.store.getSettings(),
    list: c.store.list().map(g => g.id),
  });
}

// ════════════════════════════════════════════════════════════════════════════
// inspectGear — the CONTENT half (gear-validate.js)
// ════════════════════════════════════════════════════════════════════════════
const CATALOGS = {
  printers:  new Set(['x1c', 'a1']),
  materials: new Set(['pla_basic']),
  nozzles:   new Set(['std_0.4']),
  plates:    new Set(['textured_pei']),
};
const FILTERS_WITH_MINE = [
  { key: 'printer',     multi: false, items: [{ id: 'x1c' }, { id: 'a1' }] },
  { key: 'material',    multi: false, items: [{ id: 'pla_basic' }] },
  { key: 'useCase',     multi: true,  items: [{ id: 'functional' }, { id: 'decorative' }, { id: 'large' }] },
  { key: 'surface',     multi: false, items: [{ id: 'fine' }, { id: 'standard' }] },
  { key: 'profileMode', multi: false, items: [{ id: 'safe' }, { id: 'tuned' }, { id: 'mine' }] },
];
// engine.js only spreads `mine` into profileMode.items when personal tuning
// exists for the state's exact printer+material pair, so the no-tuning fixture
// must OMIT it — a fixture that lists `mine` while mineAvailable is false is a
// state the real engine can never produce.
const FILTERS_NO_MINE = FILTERS_WITH_MINE.map(f => (f.key !== 'profileMode' ? f
  : { key: 'profileMode', multi: false, items: [{ id: 'safe' }, { id: 'tuned' }] }));

const META_NO_TUNING   = { filters: FILTERS_NO_MINE,   mineAvailable: () => false };
const META_WITH_TUNING = { filters: FILTERS_WITH_MINE, mineAvailable: () => true };

function dtoGear(fields, extra) {
  return Object.assign({
    id: 'g', name: 'G', fields: fields, labels: {},
    created_at: T_OLD, updated_at: T_OLD, last_used_at: null, archived_at: null,
    invalid: false,
  }, extra || {});
}

function inspectCase(id, title, pins, fields, meta, extra) {
  const g = dtoGear(fields, extra);
  const result = inspectGear(g, CATALOGS, meta);
  CASES.push({
    id, title, pins,
    seed: null,
    steps: [{
      op: 'inspectGear(gear, catalogs, meta)',
      clock: null,
      result: result,
      wrote: null,
      write_count: 0,
    }],
    persisted_final: null,
    read: {
      gear_in: g,
      meta_in: {
        filters: (meta.filters || []).map(f => ({ key: f.key, multi: f.multi === true, items: f.items.map(i => i.id) })),
        mineAvailable: meta.mineAvailable(),
      },
      catalogs_in: Object.keys(CATALOGS).reduce((o, k) => (o[k] = Array.from(CATALOGS[k]), o), {}),
      state: result.state,
      resolved_keys: Object.keys(result.resolved),
      note_reasons: result.notes.map(n => n.key + ':' + n.reason),
    },
  });
}

inspectCase('N1', 'inspectGear — ok',
  'Everything pins to live vocabulary. `resolved` is what may be merged into app state.',
  { printer: 'x1c', material: 'pla_basic', useCase: ['functional', 'large'] }, META_WITH_TUNING);

inspectCase('N2', 'inspectGear — stale (unknown catalog id)',
  'A retired catalog id makes the gear STALE and the field is left UNSET so the wizard asks again '
  + '(never silently substituted). Sibling fields still resolve. stale outranks degraded.',
  { printer: 'retired_printer', material: 'pla_basic' }, META_WITH_TUNING);

inspectCase('N2b', 'inspectGear — stale via the store\'s required-printer flag',
  'The store RETAINS a gear that fails required-field validation and flags `invalid`; content '
  + 'validation cannot repair a missing printer, so the flag is reported here rather than dropped '
  + 'on the floor between the two modules.',
  { material: 'pla_basic' }, META_WITH_TUNING, { invalid: true });

inspectCase('N3', 'inspectGear — degraded (profileMode "mine" with no tuning)',
  'The ONLY conditional value today. `mine` is valid vocabulary whose AVAILABILITY is conditional, '
  + 'so membership must let it through to the conditional rule, which downgrades it to `safe` and '
  + 'SAYS SO. Fail CLOSED: no mineAvailable predicate at all also means downgrade. A silent downgrade '
  + 'inside a saved shortcut is the quiet wrong answer this app must not give.',
  { printer: 'x1c', material: 'pla_basic', profileMode: 'mine' }, META_NO_TUNING);

inspectCase('N3b', 'inspectGear — "mine" survives when tuning exists',
  'The discriminating counterpart to N3: same gear, engine offers `mine`, predicate returns true.',
  { printer: 'x1c', material: 'pla_basic', profileMode: 'mine' }, META_WITH_TUNING);

inspectCase('N3c', 'inspectGear — the conditional runs AFTER cardinality coercion',
  '`mine` arriving as a single-element ARRAY (from a build where the key was multi) must be coerced '
  + 'to a scalar FIRST, or the conditional compares against ["mine"], never matches, and leaves an '
  + 'array sitting in a single-valued field.',
  { printer: 'x1c', material: 'pla_basic', profileMode: ['mine'] }, META_NO_TUNING);

inspectCase('N4', 'inspectGear — unknown key',
  'A key this build has never heard of is PRESERVED at rest (the two platforms run different engine '
  + 'versions) and IGNORED when applying. It does NOT make the gear stale — the value is intact and '
  + 'will mean something again on the build that wrote it — but it is noted so the caller can say '
  + '"saved on a newer version" rather than pretending the gear is complete.',
  { printer: 'x1c', some_future_key: 'v', another_future_key: ['a', 'b'] }, META_WITH_TUNING);

inspectCase('N5', 'inspectGear — cardinality WIDENING (lossless, stays ok)',
  'single → array on a multi field. Nothing is lost, so the gear is not reported as adjusted, but '
  + 'the coercion is still noted. Multi values are then re-ordered into ENGINE ITEM order at apply '
  + 'time — deliberately different from the bytewise order the store writes AT REST.',
  { printer: 'x1c', useCase: 'functional' }, META_WITH_TUNING);

inspectCase('N5b', 'inspectGear — apply order is ENGINE item order, not the at-rest bytewise order',
  'At rest the store sorts UTF-8 bytewise (identical on every build); at apply time the order must '
  + 'match the chips the engine renders TODAY. Two different orders, both intentional.',
  { printer: 'x1c', useCase: ['large', 'decorative', 'functional'] }, META_WITH_TUNING);

inspectCase('N6', 'inspectGear — cardinality NARROWING, lossy (degraded)',
  'array → single takes the first AND discards the rest, so the gear is degraded. §2.4 says '
  + '"marks the gear degraded" unconditionally; §3.1 DEFINES degraded as a coercion that "lost '
  + 'information". §3.1 wins — see N6b.',
  { printer: 'x1c', surface: ['fine', 'standard'] }, META_WITH_TUNING);

inspectCase('N6b', 'inspectGear — cardinality NARROWING, lossless (stays ok)',
  'A one-element array narrows with nothing discarded. Reported via a note, but the gear applied '
  + 'exactly as saved and must not be reported as adjusted — over-flagging spends the user\'s trust '
  + 'in a warning they will learn to ignore.',
  { printer: 'x1c', surface: ['fine'] }, META_WITH_TUNING);

inspectCase('N7', 'inspectGear — membership runs BEFORE cardinality',
  'The order is load-bearing. If cardinality ran first, ["fine","retired_finish"] would narrow to '
  + '"fine" and report ok — quietly discarding the evidence that the gear was written against a '
  + 'vocabulary this build no longer has.',
  { printer: 'x1c', surface: ['fine', 'retired_finish'] }, META_WITH_TUNING);

inspectCase('N8', 'inspectGear — [] is pinned-as-none on multi, unrepresentable on single',
  'On a MULTI field [] means "I have no special requirements, do not ask" and survives, distinct '
  + 'from the key being absent ("ask me"). On a SINGLE-valued field app state has no representation '
  + 'for it, so it is reported and left UNSET — applying it would persist an array in a scalar slot '
  + 'and show the user a bogus invalid-preset warning.',
  { printer: 'x1c', useCase: [], surface: [] }, META_WITH_TUNING);

inspectCase('N9', 'inspectGear — an unreadable value type is stale, never coerced',
  'A number / object / nested array is unrepresentable under §2.4. The field is dropped and the gear '
  + 'reports stale precisely so the wizard asks the question again. Type mismatches degrade, never throw.',
  { printer: 'x1c', surface: 42, useCase: [['a']] }, META_WITH_TUNING);

// ════════════════════════════════════════════════════════════════════════════
// Output
// ════════════════════════════════════════════════════════════════════════════
const out = {
  __meta: {
    note: 'Generated by scripts/gen-gear-fixtures.cjs — do not hand-edit. Regenerate with: '
      + 'node scripts/gen-gear-fixtures.cjs > scripts/fixtures/gear-fixtures.json',
    purpose: 'Cross-platform conformance corpus for the frozen `3dpa_gear_v1` envelope. Produced by '
      + 'driving the real gear-store.js and gear-validate.js — never by hand.',
    storage_key: KEY,
    cases: CASES.length,
    frozen_clock: new RealDate(EPOCH).toISOString(),
    uuid_scheme: '00000000-0000-4000-8000-<counter as 12 lowercase hex digits>, minted in call order',
    key_order_is_significant:
      'Unlike scripts/fixtures/engine-golden.json this document is NOT sorted deep. `Object.keys` '
      + 'ordering (integer-like keys first in ascending numeric order, then insertion order) is part '
      + 'of what a port must reproduce for `fields` / `labels` / `gears`, and sorting the fixture '
      + 'would erase exactly that evidence.',
    both_sides_captured:
      '`wrote` / `persisted_final` are the raw strings handed to setItem — the write authority. '
      + '`read` / `steps[].result` are the in-memory DTOs. Several properties (a label key outside '
      + 'LABEL_KEYS, a non-conforming stored value, top-level junk) exist ONLY in the bytes.',
  },
  cases: CASES,
};

process.stdout.write(JSON.stringify(out, null, 1) + '\n');
