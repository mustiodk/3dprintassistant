// ─── 3D Print Assistant — Gear validation & apply (Train 1 — My Gear) ────────
// The CONTENT half of the gear model. `gear-store.js` owns the `3dpa_gear_v1`
// envelope and validates SHAPE only; this module decides whether a stored
// gear's VALUES still mean anything against the catalog and filter vocabulary
// the app is running today, and performs the bookkeeping an applied gear needs.
//
// THIS FILE MUST NEVER IMPORT OR REFERENCE THE RULES ENGINE either. Everything
// it needs — the four catalog Sets, the filter metadata, the personal-tuning
// predicate, and every app-state mutator — arrives as an INJECTED argument.
// The split exists so the store's no-engine-import property stays provable by
// grep (spec §2.4); putting the content rules in a second file rather than a
// second function is what keeps that property hard to erode by accident.
//
// The five public names are assigned inside an IIFE rather than declared at top
// level so the dozen helpers below stay private in the browser's shared global
// scope. `var` at classic-script top level becomes a window property exactly as
// a function declaration would, and inside the Node test loader's function
// wrapper it is picked up by the CommonJS tail — one shape, both surfaces.
// (gear-store.js gets the same encapsulation from its createGearStore factory;
// this module has no per-instance state, so it has no factory to hide in.)
//
// Spec: docs/superpowers/specs/2026-08-20-gear-model-v2-spec.md (RATIFIED),
// §2.4 field rules, §3.1 states, §3.2 the `mine` case, §3.3 applying.

var inspectGear, applyGearToState, gearDisplayName, gearDerivedBrandIds, gearDerivedPrinterIds;

(function () {

  // The four fields whose values are catalog ids that can disappear when a
  // printer, nozzle, material or plate is retired (spec §2.3). They are checked
  // against the INJECTED catalogs rather than against the filter's own items:
  // the catalogs are the caller's authority on what exists, and a filter's item
  // list can legitimately be a filtered view of them. Every other field holds
  // an engine enum value and is checked against that filter's items.
  //
  // Null-prototype so a field key of `constructor` cannot resolve through
  // Object.prototype and silently pick up a catalog name that was never there.
  const CATALOG_OF = Object.create(null);
  CATALOG_OF.printer     = 'printers';
  CATALOG_OF.material    = 'materials';
  CATALOG_OF.nozzle      = 'nozzles';
  CATALOG_OF.build_plate = 'plates';

  // Same four fields, in the order a fallback title reads them (spec §2.3 —
  // `labels` is a rendering fallback for exactly these). Hardware first,
  // because a gear whose printer id no longer resolves still has to say which
  // printer it was.
  const LABEL_KEYS = ['printer', 'nozzle', 'material', 'build_plate'];

  // Last-resort title when a gear has neither a user name nor any label. The
  // caller localizes it if it ever reaches the screen; it exists so
  // gearDisplayName can promise a non-empty string unconditionally.
  const UNNAMED = 'Saved gear';

  // CONDITIONAL values: valid vocabulary that is only *offered* under a
  // runtime condition. `profileMode: 'mine'` is the only one today
  // (engine.js:570-572 adds the item only when personal tuning exists for the
  // state's exact printer+material pair), and spec §3.2 exists because a gear
  // pinning it is valid on the day it is saved and can stop being valid later —
  // the user deletes the tuning, or opens the gear on another device. The
  // fallback applies and the user is TOLD; a silent downgrade inside a saved
  // shortcut is the quiet wrong answer this app must not give.
  //
  // Evaluated AFTER cardinality coercion so the predicate reads coerced scalars
  // — a gear written by a build where the key was `multi` arrives as ['mine'],
  // and a conditional that ran first would compare against the array, never
  // match, and leave an array sitting in a single-valued field.
  const CONDITIONALS = [{
    key: 'profileMode',
    value: 'mine',
    fallback: 'safe',
    reason: 'mine-unavailable',
    available: function (meta, resolved) {
      // Fail CLOSED: no predicate means we cannot prove the tuning exists, and
      // claiming a personal profile the engine will not honour is worse than
      // downgrading to safe and saying so.
      if (!meta || typeof meta.mineAvailable !== 'function') return false;
      return meta.mineAvailable(resolved.printer, resolved.material) === true;
    },
  }];

  function _isMap(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  // `k in obj` walks the prototype chain, so an injected gear built with
  // Object.create(proto) could pull an INHERITED key into validation. Only what
  // the caller actually set is a pinned field.
  const _hasOwn = Object.prototype.hasOwnProperty;
  function _own(obj, k) { return _hasOwn.call(obj, k); }

  function _isNonEmptyString(v) { return typeof v === 'string' && v !== ''; }

  // A note carries the value it is about so the caller can say WHICH pin went
  // missing. Copy an array rather than aliasing the gear's own — a note is
  // display data that renderers sort and truncate, and an alias would let that
  // reach back into the record the store handed us.
  function _noteValue(raw) { return Array.isArray(raw) ? raw.slice() : raw; }

  // ─── Filter metadata ───────────────────────────────────────────────────────
  // meta.filters is the engine's own `getFilters(state)` result, handed over
  // as-is by the caller — this module never reaches for that global. Passing the
  // whole thing rather than four Sets is what lets EVERY enum field be validated
  // against its own item list, not just the four catalog-backed ones. Enum values
  // disappear too (a retired surface-quality level), and a gear pinning one must
  // go `stale` rather than be applied blindly into a state the engine no longer
  // understands.
  //
  // A real Map, not an object: filter keys come from a foreign build and
  // `__proto__` as a key would be a trap in a plain object.
  function _indexFilters(meta) {
    const index = new Map();
    const list = (meta && Array.isArray(meta.filters)) ? meta.filters : [];
    for (let i = 0; i < list.length; i++) {
      const f = _ownIdx(list, i);
      if (!_isMap(f)) continue;
      // Own-property reads: this is caller-supplied metadata, and an inherited
      // `key` or `id` must not be mistaken for a real filter declaration.
      const fKey = _ownGet(f, 'key');
      if (!_isNonEmptyString(fKey)) continue;
      const ids = new Set();
      const order = new Map();
      const rawItems = _ownGet(f, 'items');
      const items = Array.isArray(rawItems) ? rawItems : [];
      for (let j = 0; j < items.length; j++) {
        const it = _ownIdx(items, j);
        if (!_isMap(it)) continue;
        const itId = _ownGet(it, 'id');
        if (!_isNonEmptyString(itId)) continue;
        if (!ids.has(itId)) { ids.add(itId); order.set(itId, order.size); }
      }
      // First declaration wins on a duplicated key, so a malformed filter list
      // cannot make validation depend on iteration luck.
      if (!index.has(fKey)) index.set(fKey, { multi: _ownGet(f, 'multi') === true, ids: ids, order: order });
    }
    return index;
  }

  // Membership. Catalog-backed fields consult the injected Set; everything else
  // consults the filter's own items. A catalog-backed field whose Set was not
  // injected falls back to the filter items rather than passing everything —
  // an absent catalog must not become an accidental amnesty.
  // Values whose membership in the engine's item list is CONDITIONAL on app
  // state rather than on the value being valid. Today there is exactly one
  // (`profileMode: 'mine'`, engine.js:568-572); it is enumerated rather than
  // inferred so a future conditional value is a deliberate addition here.
  // NULL-PROTOTYPE, and looked up with own-property checks. As a plain object
  // literal this table inherits from Object.prototype, so
  // CONDITIONAL_VALUES.profileMode['toString'] is truthy — and since this table
  // EXEMPTS a value from the membership check, that made `toString`,
  // `constructor`, `hasOwnProperty` and `__proto__` all bypass validation and
  // apply as `ok`.
  //
  // This is the same prototype-chain defect closed in gear-store.js earlier the
  // same day, reintroduced in the sibling file. Any map keyed by untrusted
  // strings gets both treatments here: null prototype AND hasOwnProperty.
  var CONDITIONAL_VALUES = Object.create(null);
  CONDITIONAL_VALUES.profileMode = Object.create(null);
  CONDITIONAL_VALUES.profileMode.mine = true;

  var _hasOwnCV = Object.prototype.hasOwnProperty;

  // Everything below reads CALLER-PROVIDED data — engine metadata, catalog
  // objects, gear values. All of it uses own-property reads.
  //
  // This class of defect has now recurred five times across gear-store.js and
  // this file in a single day, each time wearing different syntax: `k in obj`,
  // a plain object literal used as a lookup table, an inherited catalog Set, an
  // inherited array index. Naming the invariant did not stop it, because the
  // next occurrence never looked like the last one. So it is applied
  // mechanically to every caller-boundary read here rather than case by case.
  var RESERVED_KEYS = ['__proto__', 'constructor', 'prototype'];
  function _isReservedKey(k) { return RESERVED_KEYS.indexOf(k) !== -1; }
  function _ownGet(obj, k) {
    if (!obj || typeof obj !== 'object') return undefined;
    return _hasOwnCV.call(obj, k) ? obj[k] : undefined;
  }
  function _ownIdx(arr, i) {
    return _hasOwnCV.call(arr, String(i)) ? arr[i] : undefined;
  }
  function _isConditionalValue(key, value) {
    if (typeof key !== 'string' || typeof value !== 'string') return false;
    if (!_hasOwnCV.call(CONDITIONAL_VALUES, key)) return false;
    return _hasOwnCV.call(CONDITIONAL_VALUES[key], value);
  }

  function _isMember(key, value, filter, catalogs) {
    const name = _own(CATALOG_OF, key) ? CATALOG_OF[key] : null;
    // Own-property read: an INHERITED catalog would otherwise validate ids the
    // caller never actually offered — probed as
    // Object.create({ printers: new Set(['proto_printer']) }).
    const cat = name ? _ownGet(catalogs, name) : undefined;
    if (cat && typeof cat.has === 'function') return cat.has(value);
    return filter.ids.has(value);
  }

  // ─── Value shape ───────────────────────────────────────────────────────────
  // Spec §2.4: a value is a string or an array of strings, and cardinality is
  // NOT fixed by the schema. Anything else is unrepresentable — a number, an
  // object, a nested array — and cannot be coerced into a meaningful answer, so
  // the field is dropped and the gear reports `stale`: unusable pins are left
  // unset precisely so the wizard asks the question again.
  function _shapeOf(raw) {
    if (typeof raw === 'string') return { multi: false, values: [raw] };
    if (!Array.isArray(raw)) return null;
    // A sparse array reads its holes off the prototype, so an array with no own
    // index 0 but a prototype carrying `0` would resolve a value the gear never
    // stored. Every element must be an OWN string, and `slice()` would preserve
    // the holes, so the values are built explicitly.
    const values = [];
    for (let i = 0; i < raw.length; i++) {
      const v = _ownIdx(raw, i);
      if (typeof v !== 'string') return null;
      values.push(v);
    }
    return { multi: true, values: values };
  }

  // ─── inspectGear ───────────────────────────────────────────────────────────
  // Returns { state, resolved, notes }. `resolved` is what may be merged into
  // app state; `notes` is why anything is missing from it, so the caller can
  // explain rather than silently applying something different from what the
  // user saved.
  //
  // Validation order per key, and the order is load-bearing:
  //   1. is the key known to the engine at all?  no → note and SKIP
  //   2. membership of EVERY member of the value  miss → stale, leave unset
  //   3. cardinality coercion against the filter's `multi` flag
  //   4. conditional values, therefore after coercion
  //   5. re-order multi values into the engine's item order
  //
  // Steps 1 and 2 are the two the plan's cross-model gate corrected. Running
  // cardinality before membership would narrow ['fine','retired_finish'] to
  // 'fine' and report `ok`, quietly discarding the evidence that the gear was
  // written against a vocabulary this build no longer has.
  //
  // Never mutates `gear`: the same gear is inspected repeatedly (once per
  // render, and against different `meta` when tuning changes underneath it).
  inspectGear = function (gear, catalogs, meta) {
    const notes = [];
    const resolved = Object.create(null);
    let stale = false;
    let degraded = false;

    const fields = (_isMap(gear) && _isMap(gear.fields)) ? gear.fields : null;
    if (!fields) {
      // Type mismatches degrade, never throw (spec §2.5). A gear we cannot read
      // at all is stale with nothing resolved, which the caller renders from
      // `labels` exactly as any other stale gear.
      notes.push({ key: null, reason: 'unreadable-gear', value: null });
      return { state: 'stale', resolved: resolved, notes: notes };
    }

    // The store retains a gear that fails required-field validation rather than
    // deleting it (spec §2.5) and flags it. Content validation cannot repair a
    // missing printer, so the flag is reported here rather than being dropped
    // on the floor between the two modules.
    if (gear.invalid === true) {
      stale = true;
      notes.push({ key: 'printer', reason: 'missing-required', value: null });
    }

    const filters = _indexFilters(meta);
    const keys = Object.keys(fields);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!_own(fields, key)) continue;
      const raw = fields[key];

      // 1 — unknown keys are PRESERVED at rest by the store because the two
      // platforms run different engine versions (spec §2.4), and IGNORED when
      // applying: a key this build has never heard of has no meaning in app
      // state, and it does not make the gear stale — the value is intact and
      // will mean something again on the build that wrote it. Noted so the
      // caller can surface "saved on a newer version" rather than pretending
      // the gear is complete.
      const f = filters.get(key);
      if (!f) { notes.push({ key: key, reason: 'unknown-key', value: _noteValue(raw) }); continue; }

      const shape = _shapeOf(raw);
      if (!shape) { stale = true; notes.push({ key: key, reason: 'invalid-type', value: _noteValue(raw) }); continue; }

      // 2 — membership, over every member, BEFORE any coercion.
      //
      // CONDITIONAL values are exempt. `engine.js:571` spreads `mine` into
      // profileMode.items ONLY when personal tuning exists for the current
      // printer|material pair — so in exactly the situation spec §3.2 is about
      // (the tuning was deleted, or this device never had it), `mine` is absent
      // from `items` and a plain membership test would reject it as an unknown
      // id and mark the gear stale. §3.2 requires it to DEGRADE to `safe` and
      // say so. `mine` is part of the vocabulary whose AVAILABILITY is
      // conditional, not an unknown value, so membership must let it through to
      // step 4, which is the rule that actually owns this decision.
      const missing = [];
      for (let j = 0; j < shape.values.length; j++) {
        if (_isConditionalValue(key, shape.values[j])) continue;
        if (!_isMember(key, shape.values[j], f, catalogs)) missing.push(shape.values[j]);
      }
      if (missing.length > 0) {
        stale = true;
        notes.push({ key: key, reason: 'unknown-id', value: _noteValue(raw), missing: missing });
        continue;                    // left UNSET so the wizard asks (spec §3.1)
      }

      // 3 — cardinality coercion (spec §2.4). This is what keeps a future
      // `multi` flip out of the migration column in §2.1.
      let out;
      if (!f.multi && shape.multi && shape.values.length === 0) {
        // `[]` on a SINGLE-valued field. At rest the store keeps it and the
        // "pinned as none" vs "absent" distinction survives — but app state has
        // no representation for it: `state-codec.js:28` declares `surface`
        // kind:'single', so applying it would persist an array in a scalar slot,
        // URL-encode it as `sq=`, make resolveProfile fall back, and make
        // getWarnings (`engine.js:1663`) show the user an INVALID PRESET for a
        // field they deliberately left open.
        //
        // So it is reported and left UNSET, which makes the wizard ask — the
        // closest honest behaviour app state can express. Not stale: the gear is
        // not corrupt, we simply cannot carry this pin into a scalar field.
        notes.push({ key: key, reason: 'empty-pin-unrepresentable', value: _noteValue(raw) });
        continue;
      }
      if (shape.multi && shape.values.length === 0) {
        // `[]` is "pinned as none" — the user said "I have no special
        // requirements, do not ask" — and is distinct from the key being
        // absent, which means "ask me". Coercing it to a scalar would produce
        // `undefined` and collapse the two, so an empty pin is never coerced in
        // either direction. On a single-valued field that is an anomaly only a
        // foreign build can produce, so it is noted; nothing was lost or
        // changed, so it does not degrade.
        out = [];
        if (!f.multi) notes.push({ key: key, reason: 'empty-pin-kept', value: _noteValue(raw) });
      } else if (f.multi && !shape.multi) {
        out = [shape.values[0]];
        notes.push({ key: key, reason: 'cardinality-widened', value: _noteValue(raw) });
      } else if (!f.multi && shape.multi) {
        // Narrowing to a single value. Spec §2.4 says "array->single takes the
        // first and marks the gear degraded"; spec §3.1 DEFINES degraded as a
        // coercion that "lost information". Those disagree for a one-element
        // array, where nothing is lost.
        //
        // §3.1 is the definition of the state and §2.4 is shorthand for the
        // lossy case, so `degraded` is set only when values are actually
        // discarded. A note is emitted either way, so the coercion is never
        // silent — but a gear that applied exactly as saved must not be
        // reported as adjusted.
        //
        // This is deliberately NOT the "over-flag beats bypass" case. That rule
        // governs safety classifiers, where under-flagging is dangerous and
        // noise is cheap. Here under-flagging costs nothing (nothing was lost)
        // while over-flagging spends the user's trust in a warning they will
        // learn to ignore — which makes the real narrowing notice worth less.
        out = shape.values[0];
        if (shape.values.length > 1) {
          degraded = true;
          notes.push({ key: key, reason: 'cardinality-narrowed', value: _noteValue(raw) });
        } else {
          notes.push({ key: key, reason: 'cardinality-narrowed-lossless', value: _noteValue(raw) });
        }
      } else {
        out = shape.multi ? shape.values.slice() : shape.values[0];
      }
      resolved[key] = out;
    }

    // 4 — conditional values, on the coerced scalars.
    for (let i = 0; i < CONDITIONALS.length; i++) {
      const c = CONDITIONALS[i];
      if (!_own(resolved, c.key) || resolved[c.key] !== c.value) continue;
      if (c.available(meta, resolved)) continue;
      const f = filters.get(c.key);
      if (f && !_isMember(c.key, c.fallback, f, catalogs)) {
        // The fallback itself has left the vocabulary. Substituting it would
        // apply a value the engine no longer offers, so leave the field unset
        // and let the wizard ask — the same treatment any unresolvable pin gets.
        delete resolved[c.key];
        stale = true;
        notes.push({ key: c.key, reason: 'fallback-unavailable', value: c.value });
        continue;
      }
      resolved[c.key] = c.fallback;
      degraded = true;
      notes.push({ key: c.key, reason: c.reason, value: c.value });
    }

    // 5 — engine item order is the APPLY order; the bytewise order the store
    // writes is only the at-rest order (spec §2.4, amended 2026-08-21). The two
    // are deliberately different: bytewise at rest is a function of the values
    // alone and therefore identical on every build, while the order the user
    // SEES has to match the chips the engine is rendering today.
    const rkeys = Object.keys(resolved);
    for (let i = 0; i < rkeys.length; i++) {
      const v = resolved[rkeys[i]];
      if (!Array.isArray(v) || v.length < 2) continue;
      const f = filters.get(rkeys[i]);
      if (!f || f.order.size === 0) continue;
      resolved[rkeys[i]] = _byItemOrder(v, f.order);
    }

    // stale outranks degraded: a gear missing a pin needs the wizard, which is
    // a bigger claim on the user's attention than a value we substituted.
    return {
      state: stale ? 'stale' : (degraded ? 'degraded' : 'ok'),
      resolved: resolved,
      notes: notes,
    };
  };

  // Decorate-sort-undecorate rather than a comparator over the raw strings, so
  // the sort is explicitly stable for values the filter does not rank (only
  // reachable for a catalog-backed field that became `multi`, where membership
  // was proved against the catalog rather than the item list). Unranked values
  // keep their relative order and go last, instead of being scattered.
  function _byItemOrder(values, order) {
    const decorated = values.map(function (v, i) {
      const rank = order.has(v) ? order.get(v) : Infinity;
      return { v: v, rank: rank, i: i };
    });
    decorated.sort(function (a, b) { return (a.rank - b.rank) || (a.i - b.i); });
    return decorated.map(function (d) { return d.v; });
  }

  // ─── applyGearToState ──────────────────────────────────────────────────────
  // The bookkeeping below was found the hard way on the parked branch — it was
  // the Critical finding of its final review — and is carried forward intact
  // (spec §3.3).
  //
  // `resetFields()` runs FIRST. `Object.assign(state, resolved)` alone leaves
  // the previous run's answers in place for every field the gear did not pin,
  // so a gear that deliberately pins only hardware would inherit the last run's
  // use case and surface finish and the wizard would stop asking — which is the
  // whole mechanism behind D4 ("a fully pinned gear runs straight through, a
  // partial one lands on the first unanswered step").
  //
  // `state` is a `const` in app.js (app.js:66): merge into it, never reassign.
  //
  // The merge is a single Object.assign rather than field-by-field assignment
  // on purpose: updateNozzleChips (app.js:1543) clears state.nozzle when the
  // selected nozzle is incompatible with the current material, so a gear
  // pinning printer + nozzle + material must land material and nozzle together
  // or the pinned nozzle is wiped on the next render.
  //
  // Every dep is checked before it is called. This module is loaded before
  // app.js has wired its half, and a missing mutator must degrade the apply
  // rather than throw a TypeError out of a click handler.
  applyGearToState = function (resolved, state, deps) {
    if (!_isMap(state)) return;
    const d = _isMap(deps) ? deps : {};

    // Everything that can THROW is computed before app state is touched. An
    // earlier version reset and merged first, so a dependency that threw left
    // the configurator half-applied: the previous answers cleared, the new ones
    // partly in, and no slicer routed. Nothing here is transactional, so the
    // only honest guarantee is that a failure happens before the mutation
    // rather than in the middle of it.
    const printer = (_isMap(resolved) && _isNonEmptyString(resolved.printer))
      ? resolved.printer : null;

    let slicer = null, brand = null;
    if (printer) {
      // setActiveSlicer takes a SLICER id, not a printer id (engine.js:979).
      // The plan's original draft passed the printer straight through, which the
      // cross-model gate caught: it would have silently selected no slicer.
      if (typeof d.getSlicerForPrinter === 'function' && typeof d.setActiveSlicer === 'function') {
        try {
          const v = d.getSlicerForPrinter(printer);
          if (_isNonEmptyString(v)) slicer = v;
        } catch (_) { slicer = null; }
      }
      // The picker's expanded group comes from the printer row's `manufacturer`.
      // The row also carries a `brand` field and it is NOT the one to use.
      if (typeof d.printerRow === 'function' && typeof d.setExpandedBrand === 'function') {
        try {
          const row = d.printerRow(printer);
          if (_isMap(row) && _isNonEmptyString(row.manufacturer)) brand = row.manufacturer;
        } catch (_) { brand = null; }
      }
    }

    // Every dep call is optional bookkeeping around a mutation that has to
    // happen. A throw from one must not abort the others or leave the picker in
    // a state that contradicts app state. The engine's real setters do not
    // throw today (engine.js:979), so this is contract hardening rather than a
    // live failure — but the helper's contract is what future callers rely on.
    const _try = (fn, arg) => { try { if (typeof fn === 'function') fn(arg); } catch (_) {} };

    // resetFields is NOT in that category and must NOT be wrapped. It is the
    // step that clears the previous run's unpinned answers, and "unset fields
    // mean the wizard asks" (spec §3.3) depends on it. Swallowing a throw here
    // would merge the gear on top of stale answers and then route the slicer and
    // collapse the picker as if everything were fine — the user gets a gear that
    // silently carries someone else's surface and useCase.
    //
    // Letting it propagate aborts before the merge, so state is left as the
    // reset found it rather than half-applied with foreign answers. An earlier
    // revision of this function wrapped it; that was a regression and the gate
    // was right that swallowing is worse here.
    if (typeof d.resetFields === 'function') d.resetFields();

    // Copy arrays rather than aliasing them into app state. `state.useCase` is
    // mutated in place on every chip click (app.js:1565); aliasing would let a
    // click reach back into the caller's `resolved` object — and, through it,
    // into whatever produced it.
    if (_isMap(resolved)) {
      const k = Object.keys(resolved);
      for (let i = 0; i < k.length; i++) {
        // `state` is an ordinary object (app.js:66), so assigning a key named
        // `__proto__` would replace its prototype rather than set a field.
        // `resolved` from inspectGear can never contain one, but this function
        // is public and its caller is not required to have come through there.
        if (_isReservedKey(k[i])) continue;
        const v = resolved[k[i]];
        state[k[i]] = Array.isArray(v) ? v.slice() : v;
      }
    }

    if (!printer) return;
    if (slicer) _try(d.setActiveSlicer, slicer);
    if (brand) _try(d.setExpandedBrand, brand);

    // Last: a printer is set, so the picker has nothing left to ask.
    _try(d.collapsePicker);
  };

  // ─── gearDisplayName ───────────────────────────────────────────────────────
  // `name` is the gear's title and the user owns it (D7). `labels` is the
  // fallback — display names captured at save time for exactly the four
  // catalog-backed fields (spec §2.3) — which is what lets a gear whose printer
  // id has been retired still say which printer it was.
  //
  // Returns plain text, never markup: the caller escapes. User-typed names are
  // untrusted, and the parked branch shipped a stored XSS on this exact string.
  gearDisplayName = function (gear) {
    if (!_isMap(gear)) return UNNAMED;
    if (typeof gear.name === 'string' && gear.name.trim() !== '') return gear.name;

    const labels = _isMap(gear.labels) ? gear.labels : null;
    const parts = [];
    for (let i = 0; labels && i < LABEL_KEYS.length; i++) {
      const k = LABEL_KEYS[i];
      if (!_own(labels, k)) continue;
      const v = labels[k];
      // `labels` mirrors the shape of the value it labels (spec §2.3): a string
      // for a single-valued field, a parallel array for a multi-valued one.
      if (_isNonEmptyString(v)) parts.push(v);
      else if (Array.isArray(v)) {
        const live = v.filter(_isNonEmptyString);
        if (live.length > 0) parts.push(live.join(', '));
      }
    }
    return parts.length > 0 ? parts.join(' · ') : UNNAMED;
  };

  // ─── Derived ownership (D10) ───────────────────────────────────────────────
  // What the user owns is DERIVED from their gears and never stored (D1): a
  // gear is a shortcut, not an inventory, and a second source of truth for
  // ownership is a second thing to keep in sync. First-seen order, so the
  // printer the user set up first leads their own group.
  function _printerIdsOf(gear) {
    const fields = (_isMap(gear) && _isMap(gear.fields)) ? gear.fields : null;
    if (!fields || !_own(fields, 'printer')) return [];
    const p = fields.printer;
    if (_isNonEmptyString(p)) return [p];
    if (Array.isArray(p)) return p.filter(_isNonEmptyString);
    return [];
  }

  gearDerivedPrinterIds = function (gears) {
    const seen = new Set();
    const out = [];
    const list = Array.isArray(gears) ? gears : [];
    for (let i = 0; i < list.length; i++) {
      const ids = _printerIdsOf(list[i]);
      for (let j = 0; j < ids.length; j++) {
        if (seen.has(ids[j])) continue;
        seen.add(ids[j]);
        out.push(ids[j]);
      }
    }
    return out;
  };

  gearDerivedBrandIds = function (gears, printerRow) {
    const seen = new Set();
    const out = [];
    if (typeof printerRow !== 'function') return out;
    const ids = gearDerivedPrinterIds(gears);
    for (let i = 0; i < ids.length; i++) {
      // A printer that has left the catalog is SKIPPED, not thrown on: a stale
      // gear must not be able to empty the user's own group.
      const row = printerRow(ids[i]);
      // `manufacturer`, not `brand`.
      if (!_isMap(row) || !_isNonEmptyString(row.manufacturer)) continue;
      if (seen.has(row.manufacturer)) continue;
      seen.add(row.manufacturer);
      out.push(row.manufacturer);
    }
    return out;
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    inspectGear, applyGearToState, gearDisplayName,
    gearDerivedBrandIds, gearDerivedPrinterIds,
  };
}
