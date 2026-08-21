# Train 1 — Web half (My Gear) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship My Gear on the web — a user can save a named shortcut after a configurator run, see their gears on Home, and re-run one in a tap — on a storage format that is safe to freeze forever.

**Architecture:** A new `gear-store.js` owns a versioned `localStorage` envelope at `3dpa_gear_v1`, written as an **open partial-state map** over the engine's own filter keys. The store validates *shape* only and never imports the engine; a separate pure function validates *content* against injected catalogs. `app.js` gains the save prompt, the Home cards, and apply-time bookkeeping. Three shipped `workshop-store.js` defects are fixed **first**, because the web write freezes the format for iCloud sync and for iOS.

**Tech Stack:** Vanilla ES5-compatible browser JS (sloppy mode, loaded by `<script src>` in `index.html`), CommonJS Node test suites under `scripts/` run by bare `node`, existing `loadBrowserScript` harness.

**Specs:**
- [`../specs/2026-08-20-gear-model-v2-spec.md`](../specs/2026-08-20-gear-model-v2-spec.md) — **RATIFIED**. The model, storage, validation, apply.
- [`../specs/2026-08-20-sync-v1-spec.md`](../specs/2026-08-20-sync-v1-spec.md) — **RATIFIED 2026-08-21**. Why the format is frozen and which defects must land first.
- [`../../reviews/2026-08-20-gear-model-owner-decisions.md`](../../reviews/2026-08-20-gear-model-owner-decisions.md) — D1–D18b, the binding record.

**Supersedes:** `2026-08-17-train1-my-gear-setups-plan.md`, which is **void, not amendable**. Do not read it for requirements. Its mechanics survive only via §6 of the gear spec.

---

## Global Constraints

Copied verbatim from the specs. Every task's requirements implicitly include this section.

- **Storage key is `3dpa_gear_v1`** and it is a forever promise. Nothing has ever been written to a real user, so `v1` still means "the first shape users see."
- **A gear is a shortcut, not an inventory.** No stored ownership pool. No build-a-gear page.
- **Gears are born only by saving after a completed configurator run** (D6).
- **`printer` is required** and non-empty. A gear without it is rejected at write time.
- **Values are a string or an array of strings.** Cardinality is *not* fixed by the schema.
- **`[]` means "pinned as none"**; an absent key means "ask me". They are different.
- **Unknown keys are preserved, never dropped** — the two platforms run different engine versions.
- **Every map is null-prototype** (`Object.create(null)`): `gears`, `settings`, `fields`, `labels`.
- **Type mismatches degrade, never throw.** A gear that fails validation on read is **retained and reported `stale`**, never deleted.
- **The store never imports the engine.** Callers inject catalogs.
- **`state` in `app.js` is a `const` (`app.js:66`)** — merge with `Object.assign`, never reassign.
- **The printer row's brand field is `manufacturer`, not `brand`.**
- **A restored session always wins** over auto-applying the active gear on boot (protects IMPL-042 share links).
- **User-typed names are untrusted** — escape on render. The parked branch shipped a stored XSS before its review caught it.
- **A write that fails must not be reported as a save.** Keep the `{ ok, error }` contract including the `quota` distinction.
- **One finding = one commit.** Web pushes freely; iOS is out of scope for this plan entirely.
- Test files under `scripts/` are **CommonJS** and run by bare `node <file>`, exit 0 green / 1 red (CI tier 2/6).

---

## File Structure

| File | Responsibility |
|---|---|
| `workshop-store.js` (modify) | Tasks 1–3 only. Non-destructive version-mismatch reads, soft-delete, journal timestamp split. |
| `scripts/workshop-store.test.js` (modify) | Regression coverage for the three defects. |
| `gear-store.js` (create) | The envelope: read, write, normalize, required-field enforcement, hostile-envelope defence. Shape only — never imports the engine. |
| `gear-validate.js` (create) | Pure content validation + apply. `inspectGear`, `applyGearToState`, `gearDisplayName`. Takes injected catalogs. Split from the store so the store's no-engine-import property stays provable. |
| `scripts/gear-store.test.js` (create) | Envelope + hostile-envelope suite. |
| `scripts/gear-validate.test.js` (create) | States, cardinality coercion, `mine`→`safe`, apply bookkeeping. |
| `app.js` (modify) | Save prompt, Home cards, apply wiring, picker lead. |
| `index.html` (modify) | Two `<script src>` tags; Home + overlay markup. |
| `style.css` (modify) | Gear card, overlay, save dialog. |
| `locales/en.json`, `locales/da.json` (modify) | All user-visible strings. |

**Why two files instead of the parked branch's one.** The gear spec's §2.4 rule — *"Catalog validation stays out of the store so the store never imports the engine — that separation is what keeps the golden-snapshot proof meaningful"* — is a property that is trivially true when the code is in a different file and easy to erode when it is not.

---

## A defect this plan found while being written — read before Task 1

The sync spec files **D-5** against `workshop-store.js:35`. That is correct but **incomplete**: the same destructive pattern is at **two** sites, and the second is worse.

| Site | Behaviour on `env.v !== VERSION` | Destructive? |
|---|---|---|
| `_read()` `:35` | returns `[]` | **Yes** — a later `_write` persists the empty result over real data. This is the site the spec names. |
| `_readEnv()` `:49` | returns `{ v: VERSION, profiles: [] }` | **Yes, and wider.** `_write(profiles)` routes through `_readEnv()`, so every profile write after meeting a newer envelope persists an envelope with **the tuning ledger erased too** — not just profiles. |
| `importJSON()` `:231` | returns `{ ok: false, error: 'format' }` | **No** — correctly refuses. Leave it alone. |

Task 1 fixes both destructive sites. **This is a third instance of the class named in the open finding [`fixed a defect class then missed it next door`](../../../../ai-operating-model/docs/findings/2026-08-20-fixed-a-defect-class-then-missed-it-next-door.md)** — surface it at wrap-up.

Also swept, and clean for now: `state-codec.js:70` returns `null` on version mismatch. That store holds session state which §1 of the sync spec deliberately does **not** sync, so skew there costs a restored session rather than data. Out of scope; recorded so the sweep is not repeated.

---

## Tasks 1-3 — `workshop-store.js` defects — ✅ DONE 2026-08-21

All three landed on web `main`, cross-model gated, and pushed. The full task text is
preserved in this file's history at `d70547d`; it is collapsed here because the plan's
live purpose is now Tasks 4-9.

| Task | Defect | Commit |
|---|---|---|
| 1 | **D-5** — a version-mismatched envelope is preserved, never overwritten | `a442f1f` |
| 2 | **D-1** — deletes leave a tombstone so they can travel | `1354bf9` |
| 3 | **D-3** — journal writes touch a journal clock, not the value clock | `fa305f4` |

**The Codex gate on those three found five more defects, all fixed:** `exportJSON`
fabricated an empty backup under skew (`c434d77`); archived rows were mutable and a
non-string `archived_at` resurrected a deleted row (`d3b9488`); `revertTuning` reported
the wrong error under skew (`d3b9488`); four assertions passed under the reverted
implementation and were replaced with a discriminating one (`d3b9488`); and the Workshop
card date silently stopped moving when an outcome was logged (`d559bee`).

**Two findings were deferred to an owner call** — both argue against a ratified spec
decision. Disposition: [`../../reviews/2026-08-21-workshop-defect-fixes-review.md`](../../reviews/2026-08-21-workshop-defect-fixes-review.md)
DEF-1 (tombstone location), DEF-2 (backups carrying archived rows), DEF-3 (spec wording).
**None blocks web shipping gear; all three block planning sync.**

**Two lessons that carry into Tasks 4-9:**

1. **`_now()` is millisecond-resolution.** A stamp taken immediately before a call equals
   the one taken after, so before/after comparisons are degenerate. Anchor timestamp
   assertions to a seeded past value. Task 4's `G9` (`touch` moves `last_used_at`, not
   `updated_at`) has exactly this shape — **seed it, do not compare before/after.**
2. **Fail closed on shapes you do not understand.** Mapping an unrecognized `archived_at`
   to `null` resurrected deleted rows. Task 4's `_normValue` returns `null` for
   unrepresentable values, which DROPS them — re-check that against spec §2.4's
   "unknown keys are preserved, never dropped."

---

## Task 4: `gear-store.js` — the envelope

**Files:**
- Create: `gear-store.js`
- Create: `scripts/gear-store.test.js`
- Modify: `index.html` (add `<script src="gear-store.js"></script>` before `app.js`)

**Interfaces:**
- Consumes: nothing. **Must not reference `Engine` or import any engine file.**
- Produces:
  - `createGearStore(storage) -> { list, get, save, update, archive, restore, getSettings, setActiveGear, markCatalogSeen, catalogNews, raw }`
  - `list() -> Array<{ id, name, fields, labels, created_at, updated_at, last_used_at, archived_at }>` — live gears only, ordered by `last_used_at` descending then `created_at` descending (a total order; there is no stored `order`).
  - `save({ name, fields, labels }) -> { ok: true, gear } | { ok: false, error: 'required-printer' | 'quota' | 'storage' | 'version-skew' }`
  - `update(id, patch) -> { ok, error? }` — bumps `updated_at`.
  - `touch(id) -> { ok }` — bumps **`last_used_at` only**. Using a gear is not editing it.
  - `raw() -> { droppedReservedKeys: number, skew: boolean }` — diagnostics for surfacing, not silence.

- [ ] **Step 1: Write the failing test**

Create `scripts/gear-store.test.js`:

```js
#!/usr/bin/env node
// ─── Tests for gear-store.js (Train 1 web — My Gear) ────────────────────────
// Run: node scripts/gear-store.test.js       Exit 0 all-green, 1 on failure.

const { loadBrowserScript } = require('./load-browser-script.js');
const { createGearStore } = loadBrowserScript('gear-store.js', ['createGearStore']);

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log(`  ok   ${name}`);
  else { console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); failures++; }
}
function mockStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return { getItem: k => (map.has(k) ? map.get(k) : null),
           setItem: (k, v) => map.set(k, String(v)),
           removeItem: k => map.delete(k), _map: map };
}
const KEY = '3dpa_gear_v1';

console.log('# gear-store.js tests\n');

// G1 — printer is required at write time (closes S2)
{
  const s = createGearStore(mockStorage());
  check('G1 empty gear is rejected', s.save({ name: 'x', fields: {} }).ok === false);
  check('G1 rejection names the reason', s.save({ name: 'x', fields: {} }).error === 'required-printer');
  check('G1 gear with a printer is accepted', s.save({ name: 'X1C', fields: { printer: 'x1c' } }).ok === true);
  check('G1 nothing was persisted for the rejected write', s.list().length === 1);
}

// G2 — empty array means "pinned as none"; absent means "ask me"
{
  const s = createGearStore(mockStorage());
  const r = s.save({ name: 'g', fields: { printer: 'x1c', special: [], useCase: ['functional'] } });
  const g = s.get(r.gear.id);
  check('G2 [] survives the round-trip', Array.isArray(g.fields.special) && g.fields.special.length === 0);
  check('G2 an absent key stays absent', !('surface' in g.fields));
}

// G3 — array hygiene: duplicates removed, order normalized
{
  const s = createGearStore(mockStorage());
  const r = s.save({ name: 'g', fields: { printer: 'x1c', useCase: ['b', 'a', 'b'] } });
  const v = s.get(r.gear.id).fields.useCase;
  check('G3 duplicates removed', v.length === 2);
  check('G3 order normalized deterministically', v.join(',') === 'a,b');
}

// G4 — unknown keys are preserved, never dropped (version skew between platforms)
{
  const s = createGearStore(mockStorage());
  const r = s.save({ name: 'g', fields: { printer: 'x1c', some_future_key: 'v' } });
  check('G4 unknown key round-trips', s.get(r.gear.id).fields.some_future_key === 'v');
}

// G5 — hostile envelope: every map is null-prototype, incl. fields (closes S3)
{
  const s = createGearStore(mockStorage());
  const r = s.save({ name: 'g', fields: { printer: 'x1c' } });
  const g = s.get(r.gear.id);
  check('G5 fields has null prototype', Object.getPrototypeOf(g.fields) === null);
  check('G5 gears map has null prototype', Object.getPrototypeOf(s.raw().gears) === null);
}

// G6 — reserved keys are dropped AND counted, never silently
{
  const hostile = JSON.stringify({
    v: 1,
    gears: { '__proto__': { name: 'evil', fields: { printer: 'x1c' } },
             'ok1': { name: 'good', fields: { printer: 'x1c', '__proto__': 'evil' } } },
    settings: {},
  });
  const s = createGearStore(mockStorage({ [KEY]: hostile }));
  check('G6 the good row survives', s.list().length === 1 && s.list()[0].name === 'good');
  check('G6 the reserved field key is gone', !('__proto__' in Object.keys(s.list()[0].fields).reduce((a,k)=>(a[k]=1,a),{})));
  check('G6 drops are counted', s.raw().droppedReservedKeys >= 2);
}

// G7 — type mismatches degrade, they do not throw, and siblings survive
{
  const messy = JSON.stringify({
    v: 1,
    gears: { a: 'not-an-object',
             b: { name: 'B', fields: 'not-a-map' },
             c: { name: 'C', fields: { printer: 'x1c' }, created_at: 42 } },
    settings: 'not-a-map',
  });
  let threw = false; let s;
  try { s = createGearStore(mockStorage({ [KEY]: messy })); s.list(); } catch (_) { threw = true; }
  check('G7 a hostile envelope does not throw', threw === false);
  check('G7 the readable sibling survives', s.list().some(g => g.name === 'C'));
}

// G8 — a gear failing validation on read is RETAINED, not deleted
{
  const noPrinter = JSON.stringify({
    v: 1, gears: { z: { name: 'Z', fields: { material: 'pla_basic' } } }, settings: {},
  });
  const s = createGearStore(mockStorage({ [KEY]: noPrinter }));
  check('G8 the row is retained', s.get('z') !== null);
  check('G8 and flagged rather than dropped', s.get('z').invalid === true);
}

// G9 — using a gear moves last_used_at and NOT updated_at
{
  const s = createGearStore(mockStorage());
  const r = s.save({ name: 'g', fields: { printer: 'x1c' } });
  const before = s.get(r.gear.id).updated_at;
  s.touch(r.gear.id);
  check('G9 touch leaves updated_at alone', s.get(r.gear.id).updated_at === before);
  check('G9 touch moves last_used_at', s.get(r.gear.id).last_used_at >= before);
}

// G10 — archive is soft and ordering is a total order
{
  const s = createGearStore(mockStorage());
  const a = s.save({ name: 'A', fields: { printer: 'x1c' } }).gear;
  const b = s.save({ name: 'B', fields: { printer: 'a1' } }).gear;
  s.archive(a.id);
  check('G10 archived gear leaves list()', s.list().every(g => g.id !== a.id));
  check('G10 archived row still exists', s.get(a.id) !== null && typeof s.get(a.id).archived_at === 'string');
  s.restore(a.id);
  check('G10 restore returns it', s.list().some(g => g.id === a.id));
  s.touch(b.id);
  check('G10 most-recently-used leads', s.list()[0].id === b.id);
}

// G11 — a failed write is never reported as a save
{
  const st = mockStorage();
  st.setItem = () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; };
  const s = createGearStore(st);
  const r = s.save({ name: 'g', fields: { printer: 'x1c' } });
  check('G11 quota failure reports not-ok', r.ok === false);
  check('G11 and names quota specifically', r.error === 'quota');
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall green');
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/gear-store.test.js`
Expected: FAIL — `gear-store.js` does not exist.

- [ ] **Step 3: Write the implementation**

Create `gear-store.js`. Key decisions already made by the spec — implement them, do not re-derive:

```js
// ─── 3D Print Assistant — Gear store (Train 1 web) ──────────────────────────
// Versioned localStorage envelope at `3dpa_gear_v1`. A gear is a SHORTCUT: a
// named partial snapshot of configurator answers. There is no ownership pool.
//
// This file validates SHAPE ONLY and must never import the engine. Catalog
// (content) validation lives in gear-validate.js and takes injected catalogs.

function createGearStore(storage) {

  const KEY = '3dpa_gear_v1';
  const VERSION = 1;
  const RESERVED = ['__proto__', 'constructor', 'prototype'];

  let droppedReservedKeys = 0;
  let skew = false;

  function _now() { return new Date().toISOString(); }
  function _newId() {
    try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
    return 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }
  function _map(src) {
    const out = Object.create(null);
    if (!src || typeof src !== 'object') return out;
    Object.keys(src).forEach(k => {
      if (RESERVED.indexOf(k) !== -1) { droppedReservedKeys++; return; }
      out[k] = src[k];
    });
    return out;
  }
  function _normValue(v) {
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) {
      const seen = Object.create(null); const out = [];
      v.forEach(x => { if (typeof x === 'string' && !seen[x]) { seen[x] = 1; out.push(x); } });
      return out.sort();          // deterministic across devices; apply-time re-orders for the engine
    }
    return null;                  // degrade: drop a value we cannot represent
  }
  function _normFields(src) {
    const raw = _map(src); const out = Object.create(null);
    Object.keys(raw).forEach(k => { const v = _normValue(raw[k]); if (v !== null) out[k] = v; });
    return out;
  }
  function _normGear(id, r) {
    if (!r || typeof r !== 'object') return null;
    const fields = _normFields(r.fields);
    const g = {
      id: id,
      name: typeof r.name === 'string' ? r.name : '',
      fields: fields,
      labels: _map(typeof r.labels === 'object' ? r.labels : null),
      created_at:   typeof r.created_at   === 'string' ? r.created_at   : _now(),
      updated_at:   typeof r.updated_at   === 'string' ? r.updated_at   : _now(),
      last_used_at: typeof r.last_used_at === 'string' ? r.last_used_at : null,
      archived_at:  typeof r.archived_at  === 'string' ? r.archived_at  : null,
    };
    // Retained, never deleted — but flagged. Deleting a user's data because we
    // could not parse it is the worst available outcome (spec §2.5).
    g.invalid = !(typeof fields.printer === 'string' && fields.printer);
    return g;
  }

  function _empty() {
    return { v: VERSION, gears: Object.create(null), settings: Object.create(null) };
  }

  function _read() {
    droppedReservedKeys = 0; skew = false;
    let raw = null;
    try { raw = storage.getItem(KEY); } catch (_) { return _empty(); }
    if (!raw) return _empty();
    let env;
    try { env = JSON.parse(raw); } catch (_) { return _empty(); }
    if (!env || typeof env !== 'object') return _empty();
    if (env.v !== VERSION) { skew = true; return { v: env.v, gears: Object.create(null), settings: Object.create(null), _skew: true }; }
    const gears = Object.create(null);
    const rows = _map(env.gears);
    Object.keys(rows).forEach(id => { const g = _normGear(id, rows[id]); if (g) gears[id] = g; });
    return { v: VERSION, gears: gears, settings: _map(env.settings) };
  }

  function _write(env) {
    if (env && env._skew) return { ok: false, error: 'version-skew' };
    try {
      storage.setItem(KEY, JSON.stringify({ v: VERSION, gears: env.gears, settings: env.settings }));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e && e.name === 'QuotaExceededError') ? 'quota' : 'storage' };
    }
  }

  function _live(g) { return !g.archived_at && !g.invalid; }
  function _order(a, b) {
    const av = a.last_used_at || a.created_at, bv = b.last_used_at || b.created_at;
    if (av !== bv) return av < bv ? 1 : -1;
    return a.created_at < b.created_at ? 1 : (a.created_at > b.created_at ? -1 : (a.id < b.id ? -1 : 1));
  }

  function list() {
    const env = _read();
    return Object.keys(env.gears).map(k => env.gears[k]).filter(_live).sort(_order);
  }
  function get(id) { const env = _read(); return env.gears[id] || null; }

  function save(input) {
    const env = _read();
    if (env._skew) return { ok: false, error: 'version-skew' };
    const fields = _normFields(input && input.fields);
    if (!(typeof fields.printer === 'string' && fields.printer)) {
      return { ok: false, error: 'required-printer' };
    }
    const id = _newId(); const t = _now();
    env.gears[id] = { id: id, name: String((input && input.name) || ''), fields: fields,
                      labels: _map(input && input.labels), created_at: t, updated_at: t,
                      last_used_at: null, archived_at: null, invalid: false };
    const w = _write(env);
    return w.ok ? { ok: true, gear: env.gears[id] } : w;
  }

  function update(id, patch) {
    const env = _read();
    if (env._skew) return { ok: false, error: 'version-skew' };
    const g = env.gears[id];
    if (!g) return { ok: false, error: 'not-found' };
    if (patch && typeof patch.name === 'string') g.name = patch.name;
    if (patch && patch.fields) {
      const merged = _normFields(Object.assign({}, g.fields, patch.fields));
      if (!(typeof merged.printer === 'string' && merged.printer)) return { ok: false, error: 'required-printer' };
      g.fields = merged;
    }
    if (patch && patch.labels) g.labels = _map(Object.assign({}, g.labels, patch.labels));
    g.updated_at = _now();
    return _write(env);
  }

  function touch(id) {
    const env = _read();
    if (env._skew) return { ok: false, error: 'version-skew' };
    const g = env.gears[id];
    if (!g) return { ok: false, error: 'not-found' };
    g.last_used_at = _now();          // NOT updated_at — using is not editing
    return _write(env);
  }

  function _setArchived(id, value) {
    const env = _read();
    if (env._skew) return { ok: false, error: 'version-skew' };
    if (!env.gears[id]) return { ok: false, error: 'not-found' };
    env.gears[id].archived_at = value;
    return _write(env);
  }
  function archive(id) { return _setArchived(id, _now()); }
  function restore(id) { return _setArchived(id, null); }

  function getSettings() {
    const s = _read().settings;
    return { active_gear: typeof s.active_gear === 'string' ? s.active_gear : null,
             catalog_seen: _map(s.catalog_seen),
             save_prompt_dismissed: s.save_prompt_dismissed === true,
             updated_at: typeof s.updated_at === 'string' ? s.updated_at : null };
  }
  function _patchSettings(patch) {
    const env = _read();
    if (env._skew) return { ok: false, error: 'version-skew' };
    Object.keys(patch).forEach(k => { env.settings[k] = patch[k]; });
    env.settings.updated_at = _now();
    return _write(env);
  }
  function setActiveGear(id) { return _patchSettings({ active_gear: id }); }
  function markCatalogSeen(counts) { return _patchSettings({ catalog_seen: _map(counts) }); }
  function catalogNews(current) {
    const seen = getSettings().catalog_seen;
    const out = Object.create(null);
    Object.keys(_map(current)).forEach(k => {
      out[k] = Math.max(0, (Number(current[k]) || 0) - (Number(seen[k]) || 0));
    });
    return out;
  }

  function raw() { const env = _read(); return { gears: env.gears, settings: env.settings,
                                                 droppedReservedKeys: droppedReservedKeys, skew: skew }; }

  return { list, get, save, update, touch, archive, restore,
           getSettings, setActiveGear, markCatalogSeen, catalogNews, raw };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createGearStore };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/gear-store.test.js`
Expected: PASS, `all green`, exit 0.

- [ ] **Step 5: Register the script and confirm CI's sloppy-mode classifier sees it**

In `index.html`, add before the `app.js` tag:

```html
<script src="gear-store.js"></script>
```

Run: `node --input-type=commonjs --check < gear-store.js`
Expected: no output (exit 0). CI tier 1/6 derives the sloppy-mode set from `index.html`, so registering the tag is what makes the check correct.

- [ ] **Step 6: Commit**

```bash
git add gear-store.js scripts/gear-store.test.js index.html
git commit -m "feat(gear): gear-store.js — the 3dpa_gear_v1 envelope

An open partial-state map over the engine's filter keys, per the ratified
gear model v2 spec. Shape validation only; never imports the engine.

Closes the four defects the parked branch's review found: no stored order
(S1/S4 — ordering is derived and total), printer required at write time (S2),
and every map null-prototype including fields and labels (S3).

Using a gear moves last_used_at and never updated_at."
```

---

## Task 5: `gear-validate.js` — states, coercion, and apply

**Files:**
- Create: `gear-validate.js`
- Create: `scripts/gear-validate.test.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: gear objects from Task 4's `list()`/`get()`.
- Produces:
  - `inspectGear(gear, catalogs, engineMeta) -> { state: 'ok'|'degraded'|'stale', resolved: object, notes: Array<{ key, reason }> }`
    - `catalogs` = `{ printers: Set, materials: Set, nozzles: Set, plates: Set }`
    - `engineMeta` = `{ multi: { useCase: true, special: true, … }, order: { useCase: ['functional', …] }, mineAvailable: boolean }`
  - `applyGearToState(resolved, state, deps) -> void` — `deps` = `{ setActiveSlicer, setExpandedBrand, collapsePicker, printerRow }`
  - `gearDisplayName(gear) -> string`

- [ ] **Step 1: Write the failing test**

Create `scripts/gear-validate.test.js`:

```js
#!/usr/bin/env node
const { loadBrowserScript } = require('./load-browser-script.js');
const { inspectGear, applyGearToState, gearDisplayName } =
  loadBrowserScript('gear-validate.js', ['inspectGear', 'applyGearToState', 'gearDisplayName']);

let failures = 0;
function check(n, c, d) { if (c) console.log(`  ok   ${n}`); else { console.log(`  FAIL ${n}${d?' — '+d:''}`); failures++; } }

const CAT = { printers: new Set(['x1c','a1']), materials: new Set(['pla_basic']),
              nozzles: new Set(['std_0.4']), plates: new Set(['textured_pei']) };
const META = { multi: { useCase: true, special: true }, order: { useCase: ['functional','visual'] }, mineAvailable: false };
function gear(fields, labels) {
  return { id: 'g', name: 'G', fields: fields, labels: labels || {},
           created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
           last_used_at: null, archived_at: null, invalid: false };
}

console.log('# gear-validate.js tests\n');

// V1 — everything resolves
{
  const r = inspectGear(gear({ printer: 'x1c', material: 'pla_basic', nozzle: 'std_0.4' }), CAT, META);
  check('V1 state ok', r.state === 'ok');
  check('V1 resolved carries the fields', r.resolved.printer === 'x1c');
}

// V2 — an unknown catalog id makes the gear stale and is left UNSET so the wizard asks
{
  const r = inspectGear(gear({ printer: 'retired_printer', material: 'pla_basic' }), CAT, META);
  check('V2 state stale', r.state === 'stale');
  check('V2 the unknown field is left unset', !('printer' in r.resolved));
  check('V2 the known field still resolves', r.resolved.material === 'pla_basic');
  check('V2 a note names the key', r.notes.some(n => n.key === 'printer'));
}

// V3 — profileMode 'mine' degrades to 'safe' when tuning is absent, and SAYS SO
{
  const r = inspectGear(gear({ printer: 'x1c', profileMode: 'mine' }), CAT, META);
  check('V3 state degraded', r.state === 'degraded');
  check('V3 applied value is safe', r.resolved.profileMode === 'safe');
  check('V3 the downgrade is reported, not silent', r.notes.some(n => n.key === 'profileMode' && n.reason === 'mine-unavailable'));
}
{
  const r = inspectGear(gear({ printer: 'x1c', profileMode: 'mine' }), CAT,
                        Object.assign({}, META, { mineAvailable: true }));
  check('V3 mine survives when tuning exists', r.state === 'ok' && r.resolved.profileMode === 'mine');
}

// V4 — cardinality coercion, both directions
{
  const r = inspectGear(gear({ printer: 'x1c', useCase: 'functional' }), CAT, META);
  check('V4 single -> array for a multi key', Array.isArray(r.resolved.useCase) && r.resolved.useCase[0] === 'functional');
  check('V4 widening is lossless, so state stays ok', r.state === 'ok');
}
{
  const r = inspectGear(gear({ printer: 'x1c', surface: ['a','b'] }), CAT, META);
  check('V4 array -> single for a non-multi key takes the first', r.resolved.surface === 'a');
  check('V4 narrowing loses information, so state degrades', r.state === 'degraded');
}

// V5 — [] is pinned-as-none and must NOT be treated as absent
{
  const r = inspectGear(gear({ printer: 'x1c', special: [] }), CAT, META);
  check('V5 [] survives to resolved', Array.isArray(r.resolved.special) && r.resolved.special.length === 0);
}

// V6 — a stale gear renders from labels
{
  const g = gear({ printer: 'retired_printer' }, { printer: 'Retired Printer' });
  check('V6 display name falls back to labels', gearDisplayName(g).indexOf('Retired Printer') !== -1 || g.name === 'G');
}

// V7 — apply performs the four bookkeeping steps in order (the parked branch's Critical finding)
{
  const calls = [];
  const state = { printer: null, material: null };
  applyGearToState({ printer: 'x1c', material: 'pla_basic' }, state, {
    setActiveSlicer: id => calls.push('slicer:' + id),
    setExpandedBrand: b => calls.push('brand:' + b),
    collapsePicker: () => calls.push('collapse'),
    printerRow: id => ({ id: id, manufacturer: 'bambu', brand: 'WRONG' }),
  });
  check('V7 fields merged into the existing state object', state.printer === 'x1c' && state.material === 'pla_basic');
  check('V7 slicer re-routed for the new printer', calls.indexOf('slicer:x1c') !== -1);
  check('V7 expanded brand comes from manufacturer, NOT brand', calls.indexOf('brand:bambu') !== -1);
  check('V7 picker collapsed last', calls[calls.length - 1] === 'collapse');
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall green');
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/gear-validate.test.js`
Expected: FAIL — `gear-validate.js` does not exist.

- [ ] **Step 3: Write the implementation**

Create `gear-validate.js`. The catalog key for each field:

```js
// ─── 3D Print Assistant — Gear validation + apply ───────────────────────────
// Content validation against INJECTED catalogs. Separate from gear-store.js so
// the store's "never imports the engine" property stays provable.

var GEAR_CATALOG_KEY = { printer: 'printers', material: 'materials',
                         nozzle: 'nozzles', build_plate: 'plates' };

function inspectGear(gear, catalogs, engineMeta) {
  var resolved = Object.create(null);
  var notes = [];
  var stale = false, degraded = false;
  var fields = (gear && gear.fields) || {};
  var meta = engineMeta || {};
  var multi = meta.multi || {};

  Object.keys(fields).forEach(function (key) {
    var value = fields[key];

    // 1. Catalog membership, for the four keys that have one.
    var cat = GEAR_CATALOG_KEY[key];
    if (cat && catalogs && catalogs[cat]) {
      var ids = Array.isArray(value) ? value : [value];
      var missing = ids.filter(function (id) { return !catalogs[cat].has(id); });
      if (missing.length) { stale = true; notes.push({ key: key, reason: 'unknown-id' }); return; }
    }

    // 2. The one conditional value in the vocabulary today (spec §3.2).
    if (key === 'profileMode' && value === 'mine' && !meta.mineAvailable) {
      resolved[key] = 'safe';
      degraded = true;
      notes.push({ key: 'profileMode', reason: 'mine-unavailable' });
      return;
    }

    // 3. Cardinality, checked against the engine's CURRENT multi flag.
    var wantsArray = multi[key] === true;
    if (wantsArray && typeof value === 'string') {
      resolved[key] = [value];                      // widening is lossless
    } else if (!wantsArray && Array.isArray(value)) {
      if (value.length > 1) { degraded = true; notes.push({ key: key, reason: 'cardinality-narrowed' }); }
      resolved[key] = value.length ? value[0] : undefined;
      if (resolved[key] === undefined) delete resolved[key];
    } else if (wantsArray && Array.isArray(value)) {
      var order = (meta.order && meta.order[key]) || null;
      resolved[key] = order
        ? value.slice().sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); })
        : value.slice();
    } else {
      resolved[key] = value;
    }
  });

  return { state: stale ? 'stale' : (degraded ? 'degraded' : 'ok'), resolved: resolved, notes: notes };
}

function gearDisplayName(gear) {
  if (gear && typeof gear.name === 'string' && gear.name) return gear.name;
  var l = (gear && gear.labels) || {};
  return [l.printer, l.nozzle, l.material].filter(Boolean).join(' · ') || 'Gear';
}

// Apply-time bookkeeping. Found the hard way on the parked branch — it was the
// Critical finding of its final review. The order matters.
function applyGearToState(resolved, state, deps) {
  Object.assign(state, resolved);                       // state is a const; never reassign
  if (resolved.printer && deps.setActiveSlicer) deps.setActiveSlicer(resolved.printer);
  if (resolved.printer && deps.printerRow && deps.setExpandedBrand) {
    var row = deps.printerRow(resolved.printer);
    if (row && row.manufacturer) deps.setExpandedBrand(row.manufacturer);  // manufacturer, NOT brand
  }
  if (resolved.printer && deps.collapsePicker) deps.collapsePicker();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { inspectGear, applyGearToState, gearDisplayName, GEAR_CATALOG_KEY };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/gear-validate.test.js`
Expected: PASS.

- [ ] **Step 5: Register the script**

In `index.html`, add after `gear-store.js` and before `app.js`:

```html
<script src="gear-validate.js"></script>
```

- [ ] **Step 6: Commit**

```bash
git add gear-validate.js scripts/gear-validate.test.js index.html
git commit -m "feat(gear): gear-validate.js — ok/degraded/stale, coercion, apply

Content validation against injected catalogs, split from the store so the
store's no-engine-import property stays provable.

profileMode 'mine' degrades to 'safe' with a note when the user has no
Workshop tuning for that printer+material pair — a silent downgrade inside a
saved shortcut is exactly the quiet wrong answer the app must not give.

Cardinality is checked against the engine's current multi flag, not the
schema, which is what keeps a future cardinality change out of the migration
column. Apply carries the parked branch's four bookkeeping steps intact,
including expanded-brand coming from manufacturer and not brand."
```

---

## Task 6: Save-after-run — the only way a gear is born

**Files:**
- Modify: `app.js` — the profile-generated / Output render path
- Modify: `index.html` — save dialog markup
- Modify: `style.css`, `locales/en.json`, `locales/da.json`

**Interfaces:**
- Consumes: `createGearStore`, `gearDisplayName`.
- Produces: `window.__gearSavePrompt` is **not** created; the dialog is internal to `app.js`. Exposes nothing to later tasks except the store instance `GearStore`.

- [ ] **Step 1: Write the failing test**

`app.js` has no unit harness; this task is proven by the walkthrough in Task 9 plus a browser smoke. Write the browser smoke as an explicit checklist item instead of a unit test, and add the string-parity assertion that *is* automatable:

Append to `scripts/gear-store.test.js`:

```js
// G12 — every gear string exists in BOTH locales (catches a half-translated ship)
{
  const en = require('../locales/en.json'), da = require('../locales/da.json');
  const keys = Object.keys(en).filter(k => k.indexOf('gear.') === 0);
  check('G12 gear strings exist', keys.length > 0);
  check('G12 every en gear key has a da counterpart', keys.every(k => typeof da[k] === 'string' && da[k].length));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/gear-store.test.js`
Expected: FAIL on "G12 gear strings exist" — no `gear.*` keys yet.

- [ ] **Step 3: Add the strings**

Add to `locales/en.json` (and the Danish equivalents to `locales/da.json`):

```json
"gear.save.title": "Save this as a gear?",
"gear.save.body": "A gear is a shortcut — next time we'll skip the questions you pin here.",
"gear.save.namePlaceholder": "Name this gear",
"gear.save.confirm": "Save gear",
"gear.save.cancel": "Not now",
"gear.save.dontAsk": "Don't offer this again",
"gear.save.failedQuota": "Storage is full — the gear was not saved.",
"gear.save.failedGeneric": "The gear could not be saved."
```

- [ ] **Step 4: Implement the dialog**

After a completed configurator run, if `GearStore.getSettings().save_prompt_dismissed` is false, render a dialog listing every **answered** field with the seven defaults pre-checked:

```js
var GEAR_DEFAULT_FIELDS = ['printer', 'nozzle', 'material', 'build_plate',
                           'environment', 'profileMode', 'extruder_type'];
```

Name is pre-filled from hardware labels via `gearDisplayName({ labels: … })` and is overwritable. On confirm, build `fields` from the ticked boxes only and call `GearStore.save(...)`.

**Escape the name on render** — every place a gear name reaches the DOM uses `textContent` or an escaping helper, never `innerHTML` with interpolation. The parked branch shipped a stored XSS here.

Handle the write result explicitly:

```js
    var r = GearStore.save({ name: name, fields: fields, labels: labels });
    if (!r.ok) {
      showToast(t(r.error === 'quota' ? 'gear.save.failedQuota' : 'gear.save.failedGeneric'));
      return;                                   // a failed write is NOT reported as a save
    }
    GearStore.setActiveGear(r.gear.id);
```

- [ ] **Step 5: Run the suites and a browser smoke**

Run: `node scripts/gear-store.test.js && npx serve -l 4200 .`
Then in the browser: complete a configurator run → confirm the dialog appears with seven boxes ticked → save → reload → confirm the gear persists in `localStorage` under `3dpa_gear_v1`.
Also: save a gear named `<img src=x onerror=alert(1)>` and confirm it renders as literal text.

- [ ] **Step 6: Commit**

```bash
git add app.js index.html style.css locales/en.json locales/da.json scripts/gear-store.test.js
git commit -m "feat(gear): save-after-run dialog — the only way a gear is born

Seven defaults pre-checked, every other answered field tickable (D5). Name
pre-filled from hardware labels and overwritable (D7). No build-a-gear page
exists, per D6.

Names render via textContent — the parked branch shipped a stored XSS here.
A failed write surfaces and is never reported as a save."
```

---

## Task 7: Home — three cards and the all-gears row

**Files:**
- Modify: `app.js` (Home render), `index.html`, `style.css`, both locale files

**Interfaces:**
- Consumes: `GearStore.list()`, `inspectGear`, `applyGearToState`.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Add the strings**

```json
"gear.home.heading": "My Gear",
"gear.home.showAll": "All gears",
"gear.home.generate": "Generate",
"gear.home.stale": "Something in this gear is no longer available",
"gear.home.degraded": "Adjusted: personal tuning isn't available here — using Safe",
"gear.home.repair": "Review"
```

- [ ] **Step 2: Render three cards**

Show the active gear plus the two most recently used — `GearStore.list()` is already in that order, so take `.slice(0, 3)`. At **four or more** gears, render the "All gears" row (D8).

**Cards differentiate on nozzle + filament, not printer name** (D1/owner) — most users own one printer. The card's primary line is `nozzle · material`; the printer is secondary.

- [ ] **Step 3: Wire the two interactions (D4)**

- Tapping the **card body** opens a review overlay showing every pinned field, then continues into the wizard.
- Tapping the **Generate control on the card** runs straight through.

Both call:

```js
    var r = inspectGear(g, catalogs, engineMeta);
    applyGearToState(r.resolved, state, deps);
    GearStore.touch(g.id);                 // last_used_at only
    GearStore.setActiveGear(g.id);
    if (r.state !== 'ok') showGearNotice(r);   // never a silent downgrade
```

Fields left unset by `inspectGear` mean the wizard asks — that is what makes D4 work with no special cases. A gear that pinned everything leaves nothing to ask and generates; a gear that pinned seven lands on the first unanswered step.

- [ ] **Step 4: Protect the share-link path**

On boot, **a restored session always wins** over auto-applying the active gear. Find the existing restore branch and add the gear application only in its `else`.

Run: open an IMPL-042 share URL with a gear saved and active. The share link's state must win.

- [ ] **Step 5: Run suites + browser smoke**

Run: `for f in $(git ls-files '*.test.js'); do node "$f" >/dev/null || echo "FAIL $f"; done`
Browser: 0 gears (no section) → 1 → 3 → 4 (all-gears row appears).

- [ ] **Step 6: Commit**

```bash
git add app.js index.html style.css locales/en.json locales/da.json
git commit -m "feat(gear): Home shows three gear cards with an all-gears row at four

Active gear plus the two most recently used (D8). Cards differentiate on
nozzle + filament rather than printer name, because most users own one
printer and keep several gears for it (D1).

Card body opens a review overlay; the card's generate control runs straight
through (D4). Unset fields mean the wizard asks, so both paths work with no
special cases. A restored session still wins over auto-applying the active
gear, protecting IMPL-042 share links."
```

---

## Task 8: Pickers lead with the user's own brands

**Files:**
- Modify: `app.js` (brand/printer picker render)
- Modify: `style.css`, both locale files

**Interfaces:**
- Consumes: `GearStore.list()`.
- Produces: `gearDerivedBrandIds(gears, printerRow) -> Array<string>`.

**This is derivation, not a pool.** There is no stored ownership layer (D1). Where the app needs to know what the user has, it derives it from their gears.

- [ ] **Step 1: Write the failing test**

Append to `scripts/gear-validate.test.js`:

```js
// V8 — owned brands are DERIVED from gears, never stored
{
  const rows = { x1c: { manufacturer: 'bambu' }, a1: { manufacturer: 'bambu' }, mk4: { manufacturer: 'prusa' } };
  const gears = [ { fields: { printer: 'x1c' } }, { fields: { printer: 'mk4' } }, { fields: { printer: 'x1c' } } ];
  const ids = gearDerivedBrandIds(gears, id => rows[id] || null);
  check('V8 derives both brands', ids.indexOf('bambu') !== -1 && ids.indexOf('prusa') !== -1);
  check('V8 deduplicates', ids.length === 2);
  check('V8 uses manufacturer, not brand', ids.every(b => b === 'bambu' || b === 'prusa'));
  check('V8 an unknown printer is skipped, not thrown on',
    gearDerivedBrandIds([{ fields: { printer: 'ghost' } }], id => rows[id] || null).length === 0);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/gear-validate.test.js`
Expected: FAIL — `gearDerivedBrandIds is not a function`.

- [ ] **Step 3: Implement**

In `gear-validate.js`:

```js
function gearDerivedBrandIds(gears, printerRow) {
  var seen = Object.create(null); var out = [];
  (gears || []).forEach(function (g) {
    var p = g && g.fields && g.fields.printer;
    if (typeof p !== 'string' || !p) return;
    var row = printerRow(p);
    if (!row || !row.manufacturer) return;         // manufacturer, NOT brand
    if (!seen[row.manufacturer]) { seen[row.manufacturer] = 1; out.push(row.manufacturer); }
  });
  return out;
}
```

Export it, and add it to the `loadBrowserScript` name list in the test.

- [ ] **Step 4: Wire the picker**

Render derived brands first under a "Your gear" heading, then the existing primary row, then the rest. Add:

```json
"gear.picker.yours": "Your gear"
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node scripts/gear-validate.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add gear-validate.js scripts/gear-validate.test.js app.js style.css locales/en.json locales/da.json
git commit -m "feat(gear): pickers lead with brands derived from the user's gears

Derived, never stored — there is no ownership pool (D1). Uses the printer
row's manufacturer field, not brand."
```

> **Adjacent, and deliberately NOT in this task — needs an owner call.**
> `app.js:1536` calls `Engine.getCompatibleNozzles(state.material)` instead of
> `getCompatibleNozzlesForPrinter`, so **every printer on web offers all nine nozzle
> sizes** — Creality Hi (0.4/0.6) lists 0.8 mm as mountable. iOS was fixed 2026-08-18
> (`7c695d9`); the owner chose iOS-only at the time and a task chip was filed. It is live
> on web right now, it is one line, and this task is the picker task — so it is the
> cheapest it will ever be to fix. **Ask before folding it in**: it is a separate finding
> and therefore a separate commit, and the owner's prior scoping call stands until he
> changes it.

---

## Task 9: Close-out — walkthrough, drift proof, CI, push

**Files:**
- Modify: `docs/planning/ROADMAP.md`, `docs/sessions/NEXT-SESSION.md`

- [ ] **Step 1: Run every tier the CI runs**

```bash
node scripts/walkthrough-harness.js
for f in $(git ls-files '*.test.js'); do node "$f" >/dev/null 2>&1 || echo "FAIL $f"; done
npx vitest run
node scripts/engine-golden-snapshot.js --check
```

Expected: walkthrough green, no `FAIL` lines, vitest green, snapshot unchanged.

- [ ] **Step 2: Prove the engine did not drift**

This train is **app-layer only**. `engine.js` and `data/` must be untouched.

Run: `git diff --stat main -- engine.js data/`
Expected: **empty output.** If it is not empty, something in this train reached into the engine and must be reverted or re-justified.

- [ ] **Step 3: Prove the store never imported the engine**

Run: `grep -n 'Engine\.\|engine\.js' gear-store.js`
Expected: no output. This is the property that keeps the golden-snapshot proof meaningful.

- [ ] **Step 4: Data/logic-change evaluation (mandatory standing rule)**

Write one paragraph in the session log answering: did this train change engine logic or data? (No — app-layer only.) Does the improvement require web or iOS UI changes to be used well? (Web: delivered here. **iOS: yes — the entire iOS half is deferred and gated on the 2.0 design spec's font-bundling and light-mode prerequisites.**)

- [ ] **Step 5: Browser smoke on a real page**

Run: `npx serve -l 4200 .`
Walk: fresh profile → generate → save gear → reload → gear on Home → generate from card → archive → confirm it leaves Home and the row survives in `localStorage`.

- [ ] **Step 6: Push and update the planning surfaces**

```bash
git push origin main
```

Then update ROADMAP's Active Work Queue: Train 1 web **shipped**, iOS half still gated. Note in NEXT-SESSION that **the format is now frozen** — the first real browser write has happened, so `3dpa_gear_v1` is a forever commitment.

---

## Explicitly out of scope for this plan

- **The entire iOS half.** It is gated on the 2.0 design spec's two prerequisites (font bundling; the light-mode migration across 6 `.preferredColorScheme(.dark)` locks and ~49 hardcoded colour sites). It gets its own plan.
- **`workshop-store.js` D-2 and D-4.** The sync spec scopes only D-1/D-3/D-5 before web ships gear; D-2 (import merge direction) and D-4 (journal tombstones) land with sync itself. Not scope creep — a deliberate boundary.
- **Inventory.** D18b answered its architecture (local-first, iCloud-synced); it ships after 2.0.
- **The `stale` repair interaction.** The state is defined and surfaced; the repair *flow* is gear spec open question 2 and still needs a design pass.
- **The web nozzle-picker bug** — see the note under Task 8. Owner call.

---

## Self-Review

Run against the two ratified specs after writing.

**1. Spec coverage.** Gear spec §1 model → Tasks 4/6/7. §1.1 default fields → Task 6. §1.2 lifecycle → Tasks 6 (birth), 7 (use), 4 (death/archive). §2.1 versioning → Task 4. §2.2 envelope → Task 4. §2.4 field rules → Task 4 (G1–G4). §2.5 hostile-envelope → Task 4 (G5–G8). §3.1 states → Task 5 (V1–V2). §3.2 `mine` → Task 5 (V3). §3.3 apply → Task 5 (V7) + Task 7. §4 sync-readiness → satisfied by the format; no code. §5 S1–S4 → Task 4. §6 carryover → Tasks 4/5/6. Sync spec §10.4 D-1/D-3/D-5 → Tasks 1–3. **Gap found and closed:** D10's derived "your gear" picker lead had no task; added as Task 8.

**2. Placeholder scan.** No TBD, no "add error handling", no "similar to Task N". Every code step carries real code. Task 6 has no unit test because `app.js` has no unit harness — that is stated explicitly with the automatable part (locale parity) extracted into a real assertion rather than waved at.

**3. Type consistency.** `createGearStore` returns `touch`, and Tasks 5/7 call `GearStore.touch(id)` — consistent. `inspectGear(gear, catalogs, engineMeta)` is defined in Task 5 and called with the same three arguments in Task 7. `applyGearToState(resolved, state, deps)` — `deps` keys (`setActiveSlicer`, `setExpandedBrand`, `collapsePicker`, `printerRow`) match between the Task 5 test, the Task 5 implementation, and the Task 7 call. `gearDerivedBrandIds(gears, printerRow)` is defined and tested in Task 8 and exported from `gear-validate.js`, whose `loadBrowserScript` name list must be extended in the same task — noted in Task 8 Step 3.

**One inconsistency found and fixed during review:** Task 4's `_normValue` sorts arrays alphabetically for cross-device determinism, while the gear spec §2.4 says "order normalized to the engine's own item order at write time." The store cannot know engine order without importing the engine, which is forbidden. Resolved by sorting alphabetically **at rest** (deterministic, engine-free) and re-ordering to engine order **at apply time** in `inspectGear` (Task 5, `meta.order`). Both properties hold; the spec's intent — two devices pinning the same set produce the same stored value — is satisfied. Flag this to the owner as a spec-wording refinement.
