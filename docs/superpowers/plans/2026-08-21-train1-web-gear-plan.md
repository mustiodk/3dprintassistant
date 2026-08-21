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

## Gate result — this plan was rewritten after a NO-GO

Tasks 4–9 below are a **rewrite**, not the original draft. The original was gated by Codex
(`bridge --mode codex-only`) before any code was written and came back **NO-GO with ten
MUST-FIX**. Transcript:
[`bridge-2026-08-21-103854-167671.md`](../../reviews/bridge-2026-08-21-103854-167671.md).

**The root cause was mine and it is worth naming: I wrote the original against spec §1,
§2.1–2.2 and §3, and skipped §2.3 "Why this shape."** That section carries the identity
rule, the ordering rule, the total-order requirements and the never-repair-on-read rule —
so four of the ten MUST-FIX were a single unread section. The other six were drift or
missing product scope.

| # | What was wrong | Corrected in |
|---|---|---|
| 1 | persisted `id` and `invalid` into the record; spec §2.3 says the record carries **no `id`** — the map key is identity | Task 4 (persisted row vs in-memory DTO) |
| 2 | `_normGear` rewrote missing timestamps to `_now()`; §2.3 forbids read-side rewrites and says missing `created_at` sorts **last** via a sentinel | Task 4 |
| 3 | archive/restore did not move `updated_at`; §4.2 counts `archived_at` as a content edit | Task 4 |
| 4 | ordering used `last_used_at \|\| created_at`, so an unused new gear outranked a used one; §2.3 is nulls-last then `created_at` then **bytewise** id | Task 4 |
| 5 | `inspectGear` applied unknown keys into `state`; §2.4 preserves them at rest and **ignores them when applying** | Task 5 |
| 6 | only the four catalog fields were content-validated; engine enum values can disappear too and must go `stale` | Task 5 |
| 7 | called `setActiveSlicer(printerId)`; the real API takes a **slicer** id — `setActiveSlicer(getSlicerForPrinter(p))` | Task 5 |
| 8 | apply did not clear unpinned fields, so old answers survived and the wizard stopped asking | Task 5 |
| 9 | no tasks for D6 (My Gear list/edit/delete), D9 ("New setup" CTA), D10 (own **printers**, not only brands), D11 (catalog-news line) | Tasks 7, 8, 9 |
| 10 | `save_prompt_dismissed` had no setter | Task 4 |

Seven SHOULD-FIX are folded in below: the `__proto__` fixture had to be a JSON **string**
(an object literal never serializes the key, so the test proved nothing), `G9` and `V6`
were vacuous, `mineAvailable` must be a per-printer+material predicate evaluated **after**
cardinality coercion, `browser-globals.test.js` needs the two new globals, `update()` must
merge into a null-prototype target, and the stale-repair string contradicted the
out-of-scope list.

### A structural error the plan gate did not catch, and the recon did

**The web app has no Home screen.** It has four sibling views — `configure`,
`troubleshoot`, `workshop`, `feedback` — switched by `setView()` (`app.js:832`). The only
"Home" token in the repo is an outbound nav link to the marketing site
(`index.html:84`). The "twelve stacked elements" that motivated the 2.0 redesign were in
**`HomeView.swift`** — the iOS app. I carried an iOS finding into a web plan.

D9, D10 and D11 all say "Home", and all three were decided against the iOS 2.0 design.

**Plan-level decision, flagged for the owner rather than buried:** on web, gear lives in a
**section at the top of the Configure view**, above `#filtersContainer`
(`index.html:94`) — not as a fifth nav view. A gear is a shortcut *into* the configurator,
and the top of Configure is where a run begins, so the shortcut belongs in the path the
user is already on. A fifth view would make the shortcut require a detour.

This is UI placement, it is reversible, and it does not touch the frozen storage format —
so it is not worth blocking on. **If the owner wants a separate My Gear view on web to
mirror the iOS tab shell, Tasks 7–9 move wholesale into a new `#viewMyGear` container and
nothing else in this plan changes.**

---

## Corrected file structure

| File | Responsibility |
|---|---|
| `gear-store.js` (create) | The `3dpa_gear_v1` envelope. Shape only. Reads never write. **Never imports the engine.** |
| `gear-validate.js` (create) | Content validation against injected catalogs + apply. Takes full filter metadata and a `mineAvailable` predicate. |
| `scripts/gear-store.test.js` (create) | Envelope, hostile envelope, ordering, timestamp discipline. |
| `scripts/gear-validate.test.js` (create) | States, coercion, unknown-key handling, apply. |
| `scripts/browser-globals.test.js` (modify) | Register the two new globals. |
| `app.js` (modify) | Save prompt, gear section, My Gear list, picker lead, catalog-news line. |
| `index.html`, `style.css`, `locales/*.json` (modify) | Markup, styling, strings. |

---

## Task 4: `gear-store.js` — the envelope

**Files:** Create `gear-store.js`, `scripts/gear-store.test.js`. Modify `index.html`,
`scripts/browser-globals.test.js`.

**Interfaces — produced:**

- `createGearStore(storage)` → `{ list, get, save, update, touch, archive, restore, getSettings, setActiveGear, setSavePromptDismissed, markCatalogSeen, catalogNews, diagnostics }`
- **In-memory DTO** (what `list`/`get` return): `{ id, name, fields, labels, created_at, updated_at, last_used_at, archived_at, invalid }`
- **Persisted row** (what goes in `gears[id]`): `{ name, fields, labels, created_at, updated_at, last_used_at, archived_at }` — **no `id`, no `invalid`.** The key is identity (spec §2.3).
- `save({ name, fields, labels })` → `{ ok: true, gear } | { ok: false, error: 'required-printer' | 'quota' | 'storage' | 'version-skew' }`
- `touch(id)` moves **`last_used_at` only**. `update`/`archive`/`restore` move `updated_at` (§4.2: `archived_at` is a content edit).

**Ordering, verbatim from spec §2.3** — `last_used_at` descending with **nulls last** →
`created_at` descending → **`id` ascending, bytewise**. `localeCompare` is explicitly
forbidden: it is locale-dependent and would order differently on a Danish and an English
device, breaking the total order sync needs.

**Missing `created_at` sorts last via a fixed sentinel and is NEVER rewritten to now.**
Read-side repair never writes (§2.3).

- [ ] **Step 1: Write the failing test** — `scripts/gear-store.test.js`

Header and helpers as in `scripts/workshop-store.test.js` (same `loadBrowserScript`,
`check`, `mockStorage` shape). Then:

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/gear-store.test.js`
Expected: FAIL — `gear-store.js` does not exist (`load-browser-script: cannot read`).

- [ ] **Step 3: Implement `gear-store.js`**

Non-negotiables, each traceable to a spec line:

```js
  // Identity lives in the map key. The record carries no `id` (spec §2.3) — an
  // envelope like {"gears":{"a":{"id":"b"}}} is ambiguous and JS and Swift
  // decoders could reasonably disagree about which wins.
  const PERSIST_KEYS = ['name','fields','labels','created_at','updated_at','last_used_at','archived_at'];

  // Sorts last, and is NEVER written back (spec §2.3 — read-side repair never
  // writes; the parked build rewrote to now(), which both diverges across
  // devices and manufactures a spurious sync write).
  const CREATED_SENTINEL = '0000-00-00T00:00:00.000Z';

  function _cmp(a, b) { return a < b ? -1 : (a > b ? 1 : 0); }   // bytewise; localeCompare is forbidden

  function _order(a, b) {
    const au = a.last_used_at, bu = b.last_used_at;
    if (au !== bu) {
      if (!au) return 1;            // nulls LAST, even if created most recently
      if (!bu) return -1;
      return -_cmp(au, bu);         // descending
    }
    const ac = _validIso(a.created_at) ? a.created_at : CREATED_SENTINEL;
    const bc = _validIso(b.created_at) ? b.created_at : CREATED_SENTINEL;
    if (ac !== bc) return -_cmp(ac, bc);
    return _cmp(a.id, b.id);        // ascending, bytewise
  }
```

`_toPersist(dto)` picks exactly `PERSIST_KEYS`. `_toDto(id, row)` synthesizes `id` and
computes `invalid` in memory. Every map is `Object.create(null)`, including `fields` and
`labels`. Reserved keys (`__proto__`, `constructor`, `prototype`) are dropped as gear ids
**and** as field keys, and each drop increments a counter exposed by `diagnostics()`.
`update()` merges into a fresh null-prototype object, never `Object.assign({}, …)`.
`_writeEnv` refuses when the envelope is version-skewed, exactly as `workshop-store.js`
now does.

**`labels` is restricted to the four catalog-backed fields** — `printer`, `nozzle`,
`material`, `build_plate` (spec §2.3) — and **mirrors the shape of the value it labels**:
a string for a single-valued field, a parallel array for a multi-valued one. Any other key
in `labels` is dropped on write.

- [ ] **Step 4: Run to verify it passes** — `node scripts/gear-store.test.js` → all green.

- [ ] **Step 5: Register the globals**

`index.html`: add `<script src="gear-store.js"></script>` before `app.js`.
`scripts/browser-globals.test.js`: add `GearStore` to the expected-globals list
(gate SHOULD-FIX — the contract currently covers only `StateCodec`, `WorkshopStore` and
the tuning globals).

Verify: `node --input-type=commonjs --check < gear-store.js` and
`node scripts/browser-globals.test.js`.

- [ ] **Step 6: Commit**

```bash
git add gear-store.js scripts/gear-store.test.js scripts/browser-globals.test.js index.html
git commit -m "feat(gear): gear-store.js — the 3dpa_gear_v1 envelope

An open partial-state map over the engine's filter keys, per the ratified gear
model v2 spec. Shape validation only; never imports the engine.

Identity is the map key — the persisted row carries no id and no invalid flag
(spec 2.3). Ordering is derived and total: last_used_at desc nulls last,
created_at desc, then id ascending BYTEWISE (localeCompare is forbidden; it
would order differently on a Danish and an English device). A missing or
unparseable created_at sorts last via a sentinel and is never rewritten —
read-side repair never writes.

updated_at moves on content edits including archive/restore; touch() moves
last_used_at alone.

Closes S1-S4 from the parked build."
```

---

## Task 5: `gear-validate.js` — states, coercion, apply

**Files:** Create `gear-validate.js`, `scripts/gear-validate.test.js`. Modify `index.html`,
`scripts/browser-globals.test.js`.

**Interfaces — produced:**

- `inspectGear(gear, catalogs, meta)` → `{ state: 'ok'|'degraded'|'stale', resolved, notes }`
  - `catalogs` = `{ printers:Set, materials:Set, nozzles:Set, plates:Set }`
  - `meta` = `{ filters: [{ key, multi, items:[{id}] }], mineAvailable(printer, material) -> boolean }`
    — `filters` is `Engine.getFilters(state)` as-is, so **every** enum field is validated
    against its own item list, not just the four catalog fields (gate MUST-FIX 6).
- `applyGearToState(resolved, state, deps)` — `deps` = `{ resetFields, setActiveSlicer, getSlicerForPrinter, setExpandedBrand, collapsePicker, printerRow }`
- `gearDisplayName(gear)`, `gearDerivedBrandIds(gears, printerRow)`, `gearDerivedPrinterIds(gears)`

**Three rules the gate corrected:**

1. **Unknown keys are ignored when applying.** They are preserved at rest by the store
   (§2.4) but must **not** reach `state` — the original sketch resolved every key, which
   pollutes app state with fields the engine has never heard of.
2. **`mineAvailable` is a predicate over `(printer, material)`**, not a global boolean —
   `'mine'` is valid only for the exact pair the user has tuning for — and it is evaluated
   **after** cardinality coercion, so it reads the coerced values.
3. **Apply resets first.** `Object.assign(state, resolved)` alone leaves the previous run's
   answers in place for fields the gear did not pin, which silently breaks "unset fields
   mean the wizard asks."

- [ ] **Step 1: Write the failing test** — `scripts/gear-validate.test.js`

```js
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
  const printers = gearDerivedPrinterIds(gears);
  check('V11 derives printer ids too (D10 says printers, not only brands)',
    printers.length === 2 && printers.indexOf('x1c') !== -1);
}
```

- [ ] **Step 2: Run to verify it fails** — `node scripts/gear-validate.test.js` → cannot read `gear-validate.js`.

- [ ] **Step 3: Implement**

Validation order per key, and the order matters: **is the key known to the engine?** →
if not, note it and **skip** (never resolve). → **catalog or enum membership** → stale and
unset on miss. → **cardinality coercion** against that filter's `multi`. → **conditional
values** (`profileMode: 'mine'` via `meta.mineAvailable(resolved.printer, resolved.material)`),
which therefore runs last and sees coerced values. → **multi re-ordering** to the filter's
own `items` order.

`applyGearToState` calls `deps.resetFields()` first, then `Object.assign(state, resolved)`,
then `setActiveSlicer(getSlicerForPrinter(printer))` — **the real API takes a slicer id**
(`engine.js:979`) — then the expanded brand from `printerRow(p).manufacturer`, then
`collapsePicker()`.

- [ ] **Step 4: Verify green**, register the script + global, commit.

```bash
git commit -m "feat(gear): gear-validate.js — ok/degraded/stale, coercion, apply

Content validation against injected catalogs, split from the store so the
store's no-engine-import property stays provable by grep.

Three corrections from the plan gate: unknown keys are preserved at rest but
IGNORED when applying, so they never pollute app state; every engine enum
field is validated, not only the four catalog-backed ones, because enum values
disappear too; and 'mine' is a per printer+material predicate evaluated after
cardinality coercion rather than a global boolean.

Apply resets the known StateCodec fields before merging, or the previous run's
answers survive for fields the gear did not pin and the wizard stops asking.
setActiveSlicer receives a SLICER id via getSlicerForPrinter, not a printer id."
```

---

## Task 6: Save-after-run — the only way a gear is born

**Files:** `app.js`, `index.html`, `style.css`, `locales/*.json`.

Hook the `render()` tail after the `hasMin` guard (`app.js:1693–1707`), mirroring the
existing `saveProfileBtn` precedent (`app.js:1687`, handler `app.js:1314`). Seven defaults
pre-checked (D2), every other answered field tickable (D3/D5), name pre-filled from
hardware labels and overwritable (D7). `labels` captured for the four catalog fields only.

`GEAR_DEFAULT_FIELDS = ['printer','nozzle','material','build_plate','environment','profileMode','extruder_type']`

Reuse `openNameModal` (`app.js:851`) for the name; the field checkboxes need a small
dialog of their own following the `.info-modal` skeleton (`index.html:224`). "Don't offer
this again" calls `GearStore.setSavePromptDismissed(true)`.

**Names render via `escHtml`/`textContent`, never interpolated `innerHTML`** — the parked
branch shipped a stored XSS here. A failed write surfaces via `showToast` and is never
reported as a save.

Automatable assertion (append to `scripts/gear-store.test.js`): every `gear*` key in
`locales/en.json` has a non-empty counterpart in `da.json`.

- [ ] Steps: add strings → build dialog → wire save → run suites → browser smoke
  (including saving a gear named `<img src=x onerror=alert(1)>` and confirming it renders
  as literal text) → commit.

---

## Task 7: The gear section + My Gear management (D4, D6, D8, D9)

**Files:** `app.js`, `index.html`, `style.css`, `locales/*.json`.

A section at the **top of the Configure view**, above `#filtersContainer`
(`index.html:94`) — see the placement note above.

- **Three cards**: the active gear plus the two most recently used. `GearStore.list()` is
  already in that order, so `.slice(0, 3)`. An **"All gears" row at four or more** (D8).
- **Cards differentiate on nozzle + filament, not printer name** (D1) — most users own one
  printer and keep several gears for it. Primary line `nozzle · material`; printer secondary.
- **Card body** opens a review overlay listing every pinned field; **the card's generate
  control** runs straight through (D4).
- **"New setup" CTA** (D9) — always starts a fresh run at brand selection.
- **My Gear management** (D6): list, rename, set-default, delete. A list, not a builder —
  there is no build-a-gear page.

Apply path, using the existing `restoreWorkshopProfile` sequence (`app.js:1203`) as the
template:

```js
    const r = inspectGear(g, catalogs, meta);
    applyGearToState(r.resolved, state, deps);
    GearStore.touch(g.id);            // last_used_at only
    GearStore.setActiveGear(g.id);
    buildFilters(); restoreChipSelections(); renderPrinterSummary(); setView('configure'); render();
    if (r.state !== 'ok') showGearNotice(r);      // never a silent downgrade
```

**`active_gear` is a hint, not a guarantee** (§4.3): if it does not resolve to a live gear,
fall back to the most recently used non-archived gear; if there is none, show the
first-run state. **Do not repair the pointer on read.**

**Boot order.** Extend `restoreInitialState()` (`app.js:221`) with a third branch **after**
the URL check and **after** `restorePersistedState()`, returning a new `'gear'`
discriminator so the `restored === 'storage'` toast (`app.js:176`) is untouched. A share
link must still win. **Note `render()` calls `persistState()` (`app.js:1592`), so a
gear-applied state is written to `3dpa_state_v1` on the first render and the `'storage'`
branch wins on the next boot** — decide deliberately whether the gear branch should run
only when there is no persisted state, and write the choice into the commit message.

**Stale gears**: render from `labels`, mark the state, and offer nothing further. The
**repair interaction is out of scope** (gear spec open question 2) — so the section shows
the state and does not promise a fix. No "Review"/repair string is added.

---

## Task 8: Pickers lead with the user's own printers and brands (D10)

**Files:** `app.js`, `style.css`, `locales/*.json`.

Derived from gears, never stored (D1). D10 says **brands *and* printers**, so both
`gearDerivedBrandIds` and `gearDerivedPrinterIds` are consumed: a "Yours" group leads the
brand chips (`renderBrandChips`, `app.js:466`) and the model list
(`buildPrinterPicker`, `app.js:378`), with the full catalog beneath.

**The engine's compatibility dimming must stay visually distinct from this grouping** —
spec §2 constraint 1. A "Yours" chip and a dimmed-incompatible chip must not look alike.

`pickerShowMore` must be forced `true` when a derived brand is non-primary, or the chip is
not in the DOM at all (`app.js:457–461`).

> **Adjacent, deliberately NOT in this task — owner call.** `app.js:1546` (not 1536) calls
> `Engine.getCompatibleNozzles(state.material)`, so **every printer on web offers all nine
> nozzle sizes**; Creality Hi (0.4/0.6) lists 0.8 mm. `getCompatibleNozzlesForPrinter`
> exists (`engine.js:3031`, exported `:7757`) and is unused by `app.js`. iOS was fixed
> 2026-08-18 (`7c695d9`); the owner chose iOS-only and a task chip was filed. It is live on
> web now, it is one line, and this is the picker task. **Ask before folding it in** — it is
> a separate finding and therefore a separate commit.
>
> It also has a **direct bearing on gear**: `updateNozzleChips` (`app.js:1543`) silently
> clears `state.nozzle` when the selected nozzle is incompatible (`app.js:1552`), so a gear
> that pins printer + nozzle + material must set `material` before `render()` or the pinned
> nozzle is wiped. Task 5's `applyGearToState` assigns the whole resolved object at once,
> which satisfies this — **add a regression test rather than relying on assignment order.**

---

## Task 9: Catalog-news line (D11) + close-out

**Files:** `app.js`, `locales/*.json`, `docs/planning/ROADMAP.md`, `docs/sessions/NEXT-SESSION.md`.

**D11**: a short line beneath the gear cards — *"3 new printers since last time · 214 in
the catalog"*. It exists **because** D10 puts the user's own things first, which would
otherwise make new catalog entries invisible to anyone with gears. Uses
`GearStore.catalogNews(current)` and `markCatalogSeen(current)`.

**Close-out gates:**

- [ ] `node scripts/walkthrough-harness.js` → green
- [ ] `for f in $(git ls-files '*.test.js'); do node "$f" >/dev/null || echo "FAIL $f"; done` → silent
- [ ] `npx vitest run` → green
- [ ] `node scripts/engine-golden-snapshot.js --check` → unchanged
- [ ] `git diff --stat main -- engine.js data/` → **empty**; this train is app-layer only
- [ ] `grep -n 'Engine\.\|engine\.js' gear-store.js` → **no output**; this is the property
      that keeps the golden-snapshot proof meaningful
- [ ] **Data/logic-change evaluation** (standing rule) written into the session log: no
      engine or data change; web delivered here; **iOS deferred and gated on the 2.0 design
      spec's font-bundling and light-mode prerequisites**
- [ ] Browser smoke: fresh profile → generate → save gear → reload → gear section → generate
      from card → rename → archive → confirm it leaves the section and the row survives in
      `localStorage`
- [ ] Push, then record in NEXT-SESSION that **the format is now frozen** — the first real
      browser write has happened and `3dpa_gear_v1` is a forever commitment

---

## Explicitly out of scope

- **The entire iOS half** — gated on the 2.0 design spec's font-bundling and light-mode
  prerequisites. Its own plan.
- **`workshop-store.js` D-2 and D-4** — they land with sync, per sync spec §10.4.
- **DEF-1/DEF-2/DEF-3** from the Tasks 1–3 gate — owner calls, due before sync is planned.
- **Inventory** — D18b settled the architecture (local-first, iCloud-synced); ships after 2.0.
- **The `stale` repair interaction** — gear spec open question 2, still needs a design pass.
- **The web nozzle-picker bug** — see the note in Task 8. Owner call.

---

## Self-Review

**Spec coverage.** §1 model → Tasks 4/6/7. §1.1 defaults → Task 6. §1.2 lifecycle → 6
(birth), 7 (use), 4 (death). §2.1 versioning → 4. §2.2 envelope → 4 (G2 asserts the exact
key set). §2.3 identity/ordering/no-repair-on-read → 4 (G2, G11, G12). §2.4 field rules →
4 (G3–G5) + 5 (V4). §2.5 hostile envelope → 4 (G6, G7). §3.1 states → 5 (V1–V3). §3.2
`mine` → 5 (V5). §3.3 apply → 5 (V10). §4.2 merge/timestamps → 4 (G9, G10). §4.3 dangling
`active_gear` → 7. §5 S1–S4 → 4. D4/D6/D8/D9 → 7. D10 → 8. D11 → 9.

**Placeholders.** None. Task 6 has no unit test for the dialog because `app.js` has no unit
harness — stated explicitly, with the automatable part (locale parity) extracted into a
real assertion.

**Type consistency.** `inspectGear(gear, catalogs, meta)` — same three arguments in the
test, the implementation and the Task 7 call. `meta.mineAvailable(printer, material)` is a
two-argument predicate everywhere. `applyGearToState(resolved, state, deps)` with `deps`
keys `resetFields`, `setActiveSlicer`, `getSlicerForPrinter`, `setExpandedBrand`,
`collapsePicker`, `printerRow` — identical in V10, in the implementation note, and in Task
7. `GearStore.touch` / `setActiveGear` / `setSavePromptDismissed` / `catalogNews` /
`markCatalogSeen` / `diagnostics` are all defined in Task 4's interface block and called
nowhere else by another name.

**Degenerate-assertion sweep**, since this codebase shipped two this week and the gate
caught three more in the previous draft: G9 is seeded rather than before/after. G6's
fixture is a **JSON string**, because an object literal never serializes a `__proto__` key
— the previous draft's fixture proved nothing, and the gate proved *that* with a Node
check. V9 has no `|| g.name` escape hatch. G12 asserts storage bytes are unchanged after a
read *and* after a subsequent unrelated write. V6 asserts the exact coerced value in both
directions rather than just the array-ness.
