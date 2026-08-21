// ─── 3D Print Assistant — Gear store (Train 1 — My Gear) ─────────────────────
// A gear is a SHORTCUT: a named, partial snapshot of the configurator that lets
// a returning user skip the questions whose answers do not change between
// prints. It is not an inventory of what the user owns.
//
// Versioned localStorage envelope at `3dpa_gear_v1`, written as an OPEN PARTIAL
// MAP over the configurator's own filter keys. `v1` is a forever promise —
// nothing has ever been written to a real user, so the first real browser write
// freezes this shape for iCloud sync and for iOS.
//
// THIS FILE MUST NEVER IMPORT OR REFERENCE THE RULES ENGINE. It validates
// SHAPE only; content validation against catalogs lives in a separate pure
// module that takes injected catalogs. That separation is the property that
// keeps the golden-snapshot proof meaningful, and it is grep-verified.
//
// createGearStore(storage) takes any localStorage-like object so Node tests can
// inject mocks and drive quota, corruption, hostile envelopes and version skew
// deterministically. The browser gets a ready instance bound to
// window.localStorage, which is the surface app.js consumes.
//
// Spec: docs/superpowers/specs/2026-08-20-gear-model-v2-spec.md (RATIFIED).

function createGearStore(storage) {

  const KEY = '3dpa_gear_v1';
  const VERSION = 1;

  // Identity lives in the map key. The record carries no `id` (spec §2.3) — an
  // envelope like {"gears":{"a":{"id":"b"}}} is ambiguous and JS and Swift
  // decoders could reasonably disagree about which wins. `invalid` is likewise
  // derived in memory and never persisted.
  const PERSIST_KEYS = ['name', 'fields', 'labels', 'created_at', 'updated_at', 'last_used_at', 'archived_at'];

  // Sorts last, and is NEVER written back (spec §2.3 — read-side repair never
  // writes; the parked build rewrote to now(), which both diverges across
  // devices and manufactures a spurious sync write).
  const CREATED_SENTINEL = '0000-00-00T00:00:00.000Z';

  // `labels` is a rendering fallback for ids that can vanish from the catalog,
  // restricted to exactly the four catalog-backed fields (spec §2.3). Every
  // other field holds an enum value that is localized at render time and needs
  // no snapshot. Any other key in `labels` is dropped on write.
  const LABEL_KEYS = ['printer', 'nozzle', 'material', 'build_plate'];

  const RESERVED = ['__proto__', 'constructor', 'prototype'];

  function _isReserved(k) { return RESERVED.indexOf(k) !== -1; }

  function _newId() {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    } catch (_) {}
    return 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function _now() { return new Date().toISOString(); }

  function _isPlainMap(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  // A regex alone is not enough: it accepts impossible dates (9999-99-99), local
  // offsets, and a missing millisecond field — and an impossible date sorts
  // ABOVE every real row, which is the opposite of what §2.3 requires. Validity
  // is therefore a round-trip: the string must be exactly what Date renders back
  // as UTC-with-milliseconds. That also makes CREATED_SENTINEL unreachable as
  // real data, since it fails the round-trip and can never be mistaken for a
  // genuine timestamp.
  const _ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  function _validIso(v) {
    if (typeof v !== 'string' || !_ISO.test(v)) return false;
    const t = Date.parse(v);
    if (!isFinite(t)) return false;
    return new Date(t).toISOString() === v;
  }

  // ─── Comparators ───────────────────────────────────────────────────────────
  // Spec §2.3 requires a BYTEWISE comparison of the UTF-8 key. JS `<`/`>`
  // compares UTF-16 code units, which is NOT the same thing: U+10000 (a
  // surrogate pair, D800 DC00) sorts before U+E000 by code unit but AFTER it by
  // UTF-8 bytes (F0 90 80 80 vs EE 80 80). Gear ids we generate are ASCII
  // UUIDs, but a hand-edited or foreign envelope can carry any key, and the
  // total order is load-bearing for sync — so compare real bytes, with an ASCII
  // fast path. `localeCompare` is explicitly forbidden: it is locale-dependent
  // and would order differently on a Danish and an English device.
  const _enc = (typeof TextEncoder !== 'undefined') ? new TextEncoder() : null;
  const _ASCII = /^[\x00-\x7F]*$/;

  function _cmp(a, b) {                       // timestamps: always ASCII
    return a < b ? -1 : (a > b ? 1 : 0);
  }

  // The frozen order is UTF-8 bytes. If TextEncoder is unavailable we encode by
  // hand rather than degrading to UTF-16 code units, which would be a DIFFERENT
  // order on exactly the inputs the strict comparator exists for.
  function _utf8Bytes(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.codePointAt(i);
      if (c > 0xFFFF) i++;                     // consumed a surrogate pair
      // A LONE surrogate is not a scalar value and has no UTF-8 encoding.
      // TextEncoder substitutes U+FFFD (WHATWG); this must match it exactly, or
      // the two comparators disagree on that key and the "frozen" order becomes
      // a function of whether TextEncoder happens to exist. Verified against
      // TextEncoder: a lone surrogate encodes to EF BF BD, not ED A0 80.
      if (c >= 0xD800 && c <= 0xDFFF) c = 0xFFFD;
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }
  function _cmpUtf8Manual(a, b) {
    const x = _utf8Bytes(a), y = _utf8Bytes(b);
    const n = Math.min(x.length, y.length);
    for (let i = 0; i < n; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    return x.length - y.length;
  }

  function _cmpKey(a, b) {                    // gear ids and array values: anything
    if (_ASCII.test(a) && _ASCII.test(b)) return _cmp(a, b);
    if (!_enc) return _cmpUtf8Manual(a, b);   // never silently fall back to UTF-16
    const x = _enc.encode(a), y = _enc.encode(b);
    const n = Math.min(x.length, y.length);
    for (let i = 0; i < n; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    return x.length - y.length;
  }

  // last_used_at descending with NULLS LAST → created_at descending → id
  // ascending bytewise. A timestamp we cannot parse is treated as absent rather
  // than compared raw: `42 > "2020-…"` under JS coercion, so an unparseable
  // stamp would otherwise outrank every real one.
  function _order(a, b) {
    const au = _validIso(a.last_used_at) ? a.last_used_at : null;
    const bu = _validIso(b.last_used_at) ? b.last_used_at : null;
    if (au !== bu) {
      if (!au) return 1;            // nulls LAST, even if created most recently
      if (!bu) return -1;
      return -_cmp(au, bu);         // descending
    }
    const ac = _validIso(a.created_at) ? a.created_at : CREATED_SENTINEL;
    const bc = _validIso(b.created_at) ? b.created_at : CREATED_SENTINEL;
    if (ac !== bc) return -_cmp(ac, bc);
    return _cmpKey(a.id, b.id);     // ascending, real UTF-8 bytes
  }

  // ─── Envelope read / write ─────────────────────────────────────────────────
  // A version-mismatched envelope is PRESERVED, never overwritten — the same
  // posture workshop-store.js now takes for D-5. Reads degrade to empty; the
  // write chokepoint refuses, so nothing can clobber an envelope written by a
  // newer build on another device.
  function _emptyEnv() { return { v: VERSION, gears: Object.create(null), settings: Object.create(null) }; }

  function _readEnv() {
    let raw = null;
    try { raw = storage.getItem(KEY); } catch (_) { return _emptyEnv(); }
    if (!raw) return _emptyEnv();
    let env;
    try { env = JSON.parse(raw); } catch (_) { return _emptyEnv(); }
    if (!_isPlainMap(env)) return _emptyEnv();
    if (env.v !== VERSION) {
      // Readable as JSON but not a version we understand. Report the skew and
      // mark the envelope unwritable; callers surface it rather than clobber.
      return { v: env.v, gears: {}, settings: {}, _skew: true };
    }
    if (!_isPlainMap(env.gears)) env.gears = {};
    if (!_isPlainMap(env.settings)) env.settings = {};
    return env;
  }

  function _writeEnv(env) {
    if (env && env._skew) return { ok: false, error: 'version-skew' };
    try {
      storage.setItem(KEY, JSON.stringify(env));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e && e.name === 'QuotaExceededError') ? 'quota' : 'storage' };
    }
  }

  function _skewed() { return _readEnv()._skew === true; }

  // ─── Normalization (in memory only — a read NEVER writes) ──────────────────
  // Values are a string or an array of strings; cardinality is not fixed by the
  // schema (spec §2.4). Arrays are deduplicated and sorted UTF-8 bytewise so
  // two devices that pin the same set produce the same bytes regardless of
  // which build each is running.
  //
  // Anything we do not recognize — a number, a boolean, an object, a mixed
  // array — is PRESERVED VERBATIM rather than dropped or coerced. Spec §2.4
  // says unknown data is preserved and §2.5 says type mismatches degrade
  // rather than throw; the Tasks 1-3 lesson (an unrecognized `archived_at`
  // mapped to null resurrected deleted rows) says do not invent a meaning for
  // a shape you do not understand. Half-normalizing a mixed array would do
  // exactly that, so it is left alone as a whole.
  function _isStringArray(v) {
    if (!Array.isArray(v)) return false;
    for (let i = 0; i < v.length; i++) if (typeof v[i] !== 'string') return false;
    return true;
  }

  // Sorts a string array and, when the field carries a parallel `labels` array
  // of the same length, applies the SAME permutation to the (value, label)
  // PAIRS — never two independent sorts, or a stale label attaches to the wrong
  // id (spec §2.4). Deduplication keeps the first label seen for a value.
  function _sortPairs(values, labels) {
    const parallel = _isStringArray(labels) && labels.length === values.length;
    const pairs = [];
    const seen = Object.create(null);
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (seen[v] === true) continue;
      seen[v] = true;
      pairs.push([v, parallel ? labels[i] : null]);
    }
    pairs.sort((a, b) => _cmpKey(a[0], b[0]));
    const outV = pairs.map(p => p[0]);
    return { values: outV, labels: parallel ? pairs.map(p => p[1]) : labels };
  }

  // Builds the null-prototype `fields` and `labels` maps together, because the
  // array sort is a joint permutation over both.
  function _normFieldsAndLabels(rawFields, rawLabels) {
    let dropped = 0;

    // Pass 1 — the label candidates, so pass 2 can sort pairs.
    const labIn = Object.create(null);
    if (_isPlainMap(rawLabels)) {
      const lk = Object.keys(rawLabels);
      for (let i = 0; i < lk.length; i++) {
        const k = lk[i];
        if (_isReserved(k)) { dropped++; continue; }
        if (LABEL_KEYS.indexOf(k) === -1) continue;   // spec §2.3 restriction
        labIn[k] = rawLabels[k];
      }
    }

    const fields = Object.create(null);
    const labels = Object.create(null);

    if (_isPlainMap(rawFields)) {
      const fk = Object.keys(rawFields);
      for (let i = 0; i < fk.length; i++) {
        const k = fk[i];
        if (_isReserved(k)) { dropped++; continue; }
        const v = rawFields[k];
        if (typeof v === 'string') {
          fields[k] = v;
          if (k in labIn) labels[k] = labIn[k];
        } else if (_isStringArray(v)) {
          const sorted = _sortPairs(v, (k in labIn) ? labIn[k] : null);
          fields[k] = sorted.values;
          if (k in labIn) labels[k] = sorted.labels;
        } else {
          fields[k] = v;                              // preserved verbatim
          if (k in labIn) labels[k] = labIn[k];
        }
      }
    }

    // A label for a field the gear does not pin is still legitimate data (the
    // field may be dropped by a future build); keep it rather than lose it.
    const remaining = Object.keys(labIn);
    for (let i = 0; i < remaining.length; i++) {
      const k = remaining[i];
      if (!(k in labels)) labels[k] = labIn[k];
    }

    return { fields, labels, dropped };
  }

  // `printer` is required and non-empty at write time (spec §2.4, closes S2).
  function _hasPrinter(fields) {
    const p = fields.printer;
    if (typeof p === 'string') return p.trim() !== '';
    if (Array.isArray(p)) return p.some(x => typeof x === 'string' && x.trim() !== '');
    return false;
  }

  // The in-memory DTO adds `id` (from the map key) and `invalid` (derived).
  // Neither is ever persisted.
  function _toDto(id, raw) {
    const nl = _normFieldsAndLabels(raw.fields, raw.labels);
    const dto = {
      id: id,
      name: typeof raw.name === 'string' ? raw.name : '',
      fields: nl.fields,
      labels: nl.labels,
      created_at: (raw.created_at === undefined) ? null : raw.created_at,
      updated_at: (raw.updated_at === undefined) ? null : raw.updated_at,
      last_used_at: (raw.last_used_at === undefined) ? null : raw.last_used_at,
      archived_at: (raw.archived_at === undefined) ? null : raw.archived_at,
      invalid: !_hasPrinter(nl.fields),
    };
    return { dto: dto, dropped: nl.dropped };
  }

  function _toPersist(dto) {
    const out = {};
    for (let i = 0; i < PERSIST_KEYS.length; i++) {
      const k = PERSIST_KEYS[i];
      out[k] = dto[k];
    }
    return out;
  }

  // One read → every DTO, sorted, plus the diagnostics for THAT read. Rows that
  // are not objects are skipped at their own level so the rest of the envelope
  // stays readable (spec §2.5). A gear that fails required-field validation is
  // RETAINED and flagged `invalid`, never deleted.
  function _scan() {
    const env = _readEnv();
    const gears = [];
    let dropped = 0;
    const ids = Object.keys(env.gears);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (_isReserved(id)) { dropped++; continue; }
      const raw = env.gears[id];
      if (!_isPlainMap(raw)) continue;
      const r = _toDto(id, raw);
      dropped += r.dropped;
      gears.push(r.dto);
    }
    gears.sort(_order);
    return { env: env, gears: gears, dropped: dropped, skew: env._skew === true };
  }

  function _isLive(g) { return !g.archived_at; }

  // ─── Public read API ───────────────────────────────────────────────────────

  function list() { return _scan().gears.filter(g => _isLive(g) && !g.invalid); }

  function listArchived() { return _scan().gears.filter(g => !_isLive(g)); }

  function get(id) {
    const found = _scan().gears.filter(g => g.id === id);
    return found.length ? found[0] : null;
  }

  function diagnostics() {
    const s = _scan();
    return {
      droppedReservedKeys: s.dropped,
      gearCount: s.gears.length,
      versionSkew: s.skew,
    };
  }

  function hasVersionSkew() { return _skewed(); }

  // ─── Public write API ──────────────────────────────────────────────────────
  // Every write returns { ok: true, … } or { ok: false, error } — a write that
  // fails must never be reported as a save, and `quota` stays distinguishable
  // from any other storage failure.

  // §2.4: a value is a string, or an array of strings. READING preserves
  // whatever is on disk (§2.5 degrade-never-throw, and unknown keys survive a
  // round-trip between platform versions) — but our own write API must not
  // CREATE non-conforming data. Those are different jobs and were conflated.
  function _conformingValue(v) {
    if (typeof v === 'string') return true;
    if (!Array.isArray(v)) return false;
    for (let i = 0; i < v.length; i++) if (typeof v[i] !== 'string') return false;
    return true;
  }

  // §2.3: `labels` mirrors the SHAPE of the value it labels — a string for a
  // single-valued field, a parallel array for a multi-valued one. A wrong shape
  // or a wrong length cannot be permuted in lockstep, so it is rejected at the
  // boundary rather than persisted misaligned.
  function _conformingLabel(labelVal, fieldVal) {
    if (typeof fieldVal === 'string') return typeof labelVal === 'string';
    if (Array.isArray(fieldVal)) {
      return Array.isArray(labelVal) && labelVal.length === fieldVal.length
        && labelVal.every(x => typeof x === 'string');
    }
    return false;
  }

  function _validateWrite(rawFields, rawLabels) {
    const f = _isPlainMap(rawFields) ? rawFields : {};
    const fk = Object.keys(f);
    for (let i = 0; i < fk.length; i++) {
      if (_isReserved(fk[i])) continue;                 // dropped, not rejected
      if (!_conformingValue(f[fk[i]])) return 'bad-value';
    }
    const l = _isPlainMap(rawLabels) ? rawLabels : {};
    const lk = Object.keys(l);
    for (let i = 0; i < lk.length; i++) {
      const k = lk[i];
      if (_isReserved(k) || LABEL_KEYS.indexOf(k) === -1) continue;   // dropped
      if (!(k in f)) continue;                          // a label for an unpinned field
      if (!_conformingLabel(l[k], f[k])) return 'bad-label';
    }
    return null;
  }

  function save(input) {
    const env = _readEnv();
    if (env._skew) return { ok: false, error: 'version-skew' };
    const src = _isPlainMap(input) ? input : {};
    const bad = _validateWrite(src.fields, src.labels);
    if (bad) return { ok: false, error: bad };
    const nl = _normFieldsAndLabels(src.fields, src.labels);
    if (!_hasPrinter(nl.fields)) return { ok: false, error: 'required-printer' };
    const now = _now();
    const dto = {
      id: _newId(),
      name: typeof src.name === 'string' ? src.name.trim() : '',
      fields: nl.fields,
      labels: nl.labels,
      created_at: now,
      updated_at: now,
      last_used_at: null,
      archived_at: null,
      invalid: false,
    };
    env.gears[dto.id] = _toPersist(dto);
    const w = _writeEnv(env);
    return w.ok ? { ok: true, gear: dto } : w;
  }

  // Only the touched row is rewritten; every other row goes back exactly as it
  // was read. That is what makes G12 hold — a later, unrelated write must not
  // repair a sibling's unparseable `created_at`.
  function _mutate(id, fn) {
    const env = _readEnv();
    if (env._skew) return { ok: false, error: 'version-skew' };
    if (_isReserved(id)) return { ok: false, error: 'not-found' };
    const raw = env.gears[id];
    if (!_isPlainMap(raw)) return { ok: false, error: 'not-found' };
    const dto = _toDto(id, raw).dto;
    const r = fn(dto);
    if (r && r.error) return r.error && r.error.ok === false ? r.error : r;
    if (r && r.skipWrite) return { ok: true, gear: dto };
    env.gears[id] = _toPersist(dto);
    const w = _writeEnv(env);
    return w.ok ? { ok: true, gear: dto } : w;
  }

  // Set equality, not sequence equality: reordering an array field is not a
  // content edit and must not move `updated_at` (spec §2.4 amendment). This
  // holds the property even if a future implementation gets the canonical order
  // wrong, which is what you want on a format that can never be reformatted.
  function _sameValue(a, b) {
    if (_isStringArray(a) && _isStringArray(b)) {
      if (a.length !== b.length) return false;
      const seen = Object.create(null);
      for (let i = 0; i < a.length; i++) seen[a[i]] = true;
      for (let i = 0; i < b.length; i++) if (seen[b[i]] !== true) return false;
      const seen2 = Object.create(null);
      for (let i = 0; i < b.length; i++) seen2[b[i]] = true;
      for (let i = 0; i < a.length; i++) if (seen2[a[i]] !== true) return false;
      return true;
    }
    if (typeof a === 'string' || typeof b === 'string') return a === b;
    if (a === b) return true;
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (_) { return false; }
  }

  function _sameMap(a, b) {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (let i = 0; i < ka.length; i++) {
      if (!(ka[i] in b)) return false;
      if (!_sameValue(a[ka[i]], b[ka[i]])) return false;
    }
    return true;
  }

  function update(id, patch) {
    return _mutate(id, dto => {
      const p = _isPlainMap(patch) ? patch : {};
      // Same boundary rule as save(): our API must not CREATE a non-conforming
      // value or a mis-shaped label, even though reading tolerates both.
      if ('fields' in p || 'labels' in p) {
        const probeFields = Object.create(null);
        let pk = Object.keys(dto.fields);
        for (let i = 0; i < pk.length; i++) probeFields[pk[i]] = dto.fields[pk[i]];
        if (_isPlainMap(p.fields)) {
          pk = Object.keys(p.fields);
          for (let i = 0; i < pk.length; i++) probeFields[pk[i]] = p.fields[pk[i]];
        }
        const probeLabels = Object.create(null);
        pk = Object.keys(dto.labels);
        for (let i = 0; i < pk.length; i++) probeLabels[pk[i]] = dto.labels[pk[i]];
        if (_isPlainMap(p.labels)) {
          pk = Object.keys(p.labels);
          for (let i = 0; i < pk.length; i++) probeLabels[pk[i]] = p.labels[pk[i]];
        }
        const bad = _validateWrite(probeFields, probeLabels);
        if (bad) return { error: { ok: false, error: bad } };
      }

      const nextName = ('name' in p)
        ? (typeof p.name === 'string' ? p.name.trim() : String(p.name == null ? '' : p.name).trim())
        : dto.name;

      // Merge into a FRESH null-prototype target, never Object.assign({}, …) —
      // a patch parsed from JSON can carry a reserved key as a real own
      // property, and the merge target must not be able to inherit it.
      let mergedFields = dto.fields;
      let mergedLabels = dto.labels;
      if ('fields' in p || 'labels' in p) {
        const fIn = Object.create(null);
        let k = Object.keys(dto.fields);
        for (let i = 0; i < k.length; i++) fIn[k[i]] = dto.fields[k[i]];
        if (_isPlainMap(p.fields)) {
          k = Object.keys(p.fields);
          for (let i = 0; i < k.length; i++) {
            if (_isReserved(k[i])) continue;
            fIn[k[i]] = p.fields[k[i]];
          }
        }
        const lIn = Object.create(null);
        k = Object.keys(dto.labels);
        for (let i = 0; i < k.length; i++) lIn[k[i]] = dto.labels[k[i]];
        if (_isPlainMap(p.labels)) {
          k = Object.keys(p.labels);
          for (let i = 0; i < k.length; i++) {
            if (_isReserved(k[i])) continue;
            lIn[k[i]] = p.labels[k[i]];
          }
        }
        const nl = _normFieldsAndLabels(fIn, lIn);
        mergedFields = nl.fields;
        mergedLabels = nl.labels;
      }

      if (!_hasPrinter(mergedFields)) return { error: 'required-printer' };

      const changed = nextName !== dto.name
        || !_sameMap(dto.fields, mergedFields)
        || !_sameMap(dto.labels, mergedLabels);
      if (!changed) return { skipWrite: true };

      dto.name = nextName;
      dto.fields = mergedFields;
      dto.labels = mergedLabels;
      dto.updated_at = _now();   // spec §4.2 — a content edit moves the value clock
      return null;
    });
  }

  // touch() moves `last_used_at` ALONE. Spec §4.2: using a gear is not editing
  // it. If a read bumped the value clock, opening a gear on the iPad would win
  // last-write-wins against a rename made moments earlier on the iPhone and
  // silently discard it — reading must never outrank writing.
  // touch() is a NON-CONTENT mutation, so it must not go through the normalizing
  // _mutate path. _mutate rebuilds the row from a normalized DTO, which means a
  // row holding un-normalized data — from a hand edit (§2.5 blesses those), an
  // older build, or another implementation — would be silently deduped, re-sorted
  // and stripped of non-catalog labels simply because the user USED the gear.
  // That is "reading must never outrank writing" (§4.2) re-entering through the
  // write path. The raw row is written back with exactly one field changed.
  function touch(id) {
    const env = _readEnv();
    if (env._skew) return { ok: false, error: 'version-skew' };
    if (_isReserved(id)) return { ok: false, error: 'not-found' };
    const raw = env.gears[id];
    if (!_isPlainMap(raw)) return { ok: false, error: 'not-found' };
    raw.last_used_at = _now();          // the ONLY mutation; every other byte untouched
    const w = _writeEnv(env);
    return w.ok ? { ok: true, gear: _toDto(id, raw).dto } : w;
  }

  // archive/restore DO move `updated_at`: spec §4.2 counts `archived_at` as
  // part of the record's content. A hard delete cannot travel under sync — any
  // device still holding the row would re-upload it and the deletion would undo
  // itself — so death is a tombstone, never a removal.
  function archive(id) {
    return _mutate(id, dto => {
      const now = _now();
      dto.archived_at = now;
      dto.updated_at = now;
      return null;
    });
  }

  function restore(id) {
    return _mutate(id, dto => {
      dto.archived_at = null;
      dto.updated_at = _now();
      return null;
    });
  }

  // ─── Settings ──────────────────────────────────────────────────────────────
  // `settings` is a separate object so a conflict over `active_gear` can never
  // touch the gears (spec §4). `active_gear` is a HINT, not a guarantee (§4.3):
  // callers fall back when it does not resolve, and it is not repaired on read.

  function getSettings() {
    const env = _readEnv();
    const s = _isPlainMap(env.settings) ? env.settings : {};
    const out = Object.create(null);
    out.active_gear = (typeof s.active_gear === 'string' && !_isReserved(s.active_gear))
      ? s.active_gear : null;
    out.save_prompt_dismissed = s.save_prompt_dismissed === true;
    const seen = Object.create(null);
    const rawSeen = _isPlainMap(s.catalog_seen) ? s.catalog_seen : {};
    const k = Object.keys(rawSeen);
    for (let i = 0; i < k.length; i++) {
      if (_isReserved(k[i])) continue;
      const n = rawSeen[k[i]];
      if (typeof n === 'number' && isFinite(n)) seen[k[i]] = n;
    }
    out.catalog_seen = seen;
    out.updated_at = typeof s.updated_at === 'string' ? s.updated_at : null;
    return out;
  }

  function _writeSettings(mutator) {
    const env = _readEnv();
    if (env._skew) return { ok: false, error: 'version-skew' };
    const cur = getSettings();
    mutator(cur);
    // §2.2 defines the settings shape exhaustively, so a write emits exactly
    // those four fields. An earlier version carried unknown keys through, which
    // silently froze an undocumented extension point into the format — the
    // opposite of what a frozen format wants. `fields` preserves unknowns
    // because §2.4 says so explicitly; `settings` has no such rule.
    const next = Object.create(null);
    next.active_gear = cur.active_gear;
    next.catalog_seen = Object.assign(Object.create(null), cur.catalog_seen);
    next.save_prompt_dismissed = cur.save_prompt_dismissed === true;
    next.updated_at = _now();
    env.settings = next;
    return _writeEnv(env);
  }

  function setActiveGear(id) {
    return _writeSettings(s => {
      s.active_gear = (typeof id === 'string' && id && !_isReserved(id)) ? id : null;
    });
  }

  function setSavePromptDismissed(flag) {
    return _writeSettings(s => { s.save_prompt_dismissed = flag === true; });
  }

  // Records the catalog sizes the user has already been shown, so the
  // catalog-news line can report only what arrived since.
  function markCatalogSeen(counts) {
    return _writeSettings(s => {
      const c = _isPlainMap(counts) ? counts : {};
      const k = Object.keys(c);
      for (let i = 0; i < k.length; i++) {
        if (_isReserved(k[i])) continue;
        const n = Number(c[k[i]]);
        if (isFinite(n)) s.catalog_seen[k[i]] = n;
      }
    });
  }

  // Never negative: a catalog that SHRANK (a retired printer) is not news, and
  // a negative count would render as nonsense.
  function catalogNews(current) {
    const seen = getSettings().catalog_seen;
    const c = _isPlainMap(current) ? current : {};
    const out = Object.create(null);
    const k = Object.keys(c);
    for (let i = 0; i < k.length; i++) {
      if (_isReserved(k[i])) continue;
      const now = Number(c[k[i]]);
      const was = Number(seen[k[i]] || 0);
      out[k[i]] = (isFinite(now) && isFinite(was)) ? Math.max(0, now - was) : 0;
    }
    return out;
  }

  return {
    list, listArchived, get, save, update, touch, archive, restore,
    getSettings, setActiveGear, setSavePromptDismissed, markCatalogSeen, catalogNews,
    diagnostics, hasVersionSkew,
  };
}

const GearStore = (typeof localStorage !== 'undefined')
  ? createGearStore(localStorage)
  : null;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createGearStore };
}
