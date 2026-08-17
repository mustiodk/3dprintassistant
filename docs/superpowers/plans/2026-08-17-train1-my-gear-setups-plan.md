# Train 1 — My Gear + Setups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship My Gear (pool of owned printers/filaments/nozzles) + named Setups (one default, one-tap configurator prefill) on web and iOS, per the ratified platform spec §2.

**Architecture:** A new dedicated, forever-versioned local store (`3dpa_gear_v1`) on each surface — web `gear-store.js` (localStorage, same factory pattern as `workshop-store.js`), iOS `GearStore.swift` (Codable JSON in Application Support, same pattern as `AppStatePersistence`). App-layer only: pickers filter *on top of* engine output; applying a setup merges input-state keys and the engine regenerates. **No `engine.js` change, no `data/` change, no byte-mirror event, no golden-snapshot movement** — the drift gate proves it.

**Tech Stack:** Vanilla JS + localStorage (web) · SwiftUI + Codable JSON (iOS) · plain-node test scripts via `loadBrowserScript` (web) · XCTest (iOS).

**Spec:** `docs/superpowers/specs/2026-08-17-next-gen-platform-design.md` (§2 is the contract; §9 Q4 badge mechanics decided here: *new-since-last-My-Gear-visit*).

## Global Constraints

- **Store format is kept forever** once shipped (spec §2): keyed maps + `archived_at` + denormalized `label` + stable `order`; version field `v: 1`; keys exactly as Task 1 defines them. iOS decodes the identical JSON shape (Task 6 parity fixture).
- Setup fields use the app state's own key names: `printer`, `nozzle`, `material`, `build_plate` (optional). Goals/surface/strength/speed/environment/support/colors/userLevel are NEVER in a setup.
- All ids come from catalog vocabularies; no free-text ids. Free text exists only in `name` (user's setup name).
- Preference-hiding ≠ correctness-hiding (spec §2 constraint 1): pool filtering renders under a labeled "Your gear" group; the engine's `core`/compat treatment stays visually distinct and always wins.
- `localStorage` access wrapped in try-catch (project rule 4); iOS persistence best-effort like `AppStatePersistence`.
- Localization EN + DA for every new user-facing string.
- iOS commits stay LOCAL under the push gate; web pushes freely per task. `MARKETING_VERSION` stays 1.1.4-era until the owner composes the 1.2.0 train (version per release train).
- Web tests: plain-node scripts with `check()` + exit code (CI runs them via the reconciled selector — a new `*.test.js` in `scripts/` is picked up automatically; verify in Task 1 Step 6).
- Data/logic-change evaluation (standing rule): engine and data untouched; both surfaces change at app layer only. Re-evaluated per task; any task that finds itself wanting an engine edit STOPS and escalates to the owner.

## File Structure

```
web (3dprintassistant/)
  gear-store.js                    NEW   store factory + pure setup-apply helper
  scripts/gear-store.test.js       NEW   node tests (loader pattern)
  app.js                           MOD   boot apply, setup switcher, My Gear UI wiring, pool-first pickers
  index.html                       MOD   script tag + My Gear section shell + switcher mount
  style.css                        MOD   .gear-* styles, "Your gear" chip-group treatment
  locales/en.json, locales/da.json MOD   gear* keys

iOS (3dprintassistant-ios/)
  3DPrintAssistant/Services/GearStore.swift        NEW   Codable store, same JSON shape
  3DPrintAssistantTests/GearStoreTests.swift       NEW   XCTest incl. web-parity fixture
  3DPrintAssistant/Views/Gear/MyGearView.swift     NEW   pool + setups management
  3DPrintAssistant/Views/Gear/SetupEditorView.swift NEW  create/edit one setup
  3DPrintAssistant/Views/Home/HomeView.swift       MOD   default-setup CTA + switcher
  3DPrintAssistant/Views/Configurator/BrandPickerView.swift    MOD  pool-first
  3DPrintAssistant/Views/Configurator/MaterialPickerView.swift MOD  pool-first (featuredIds = fallback)
  3DPrintAssistant/App/Router.swift (or equivalent route enum)  MOD  .myGear route
  Localizable.strings (en/da)                       MOD   gear keys
```

---

### Task 1: Web gear store (`gear-store.js`) — TDD

**Files:**
- Create: `gear-store.js`
- Test: `scripts/gear-store.test.js`

**Interfaces:**
- Consumes: nothing (catalog id-sets are injected as plain `Set`s so the store stays engine-independent, exactly like `workshop-store.js` stays state-codec-independent).
- Produces (used by Tasks 2–5 and mirrored by Task 6):
  - `createGearStore(storage)` →
    - `getPool()` → `{ printers: [{id, nozzles, archived_at}], filaments: [{id, archived_at}] }` (active first, stable order)
    - `addPrinter(id, nozzles[])` / `archivePrinter(id)` / `restorePrinter(id)`
    - `addFilament(id)` / `archiveFilament(id)` / `restoreFilament(id)`
    - `listSetups()` → `[{id, name, printer, nozzle, material, build_plate, label, created_at, archived_at}]` in `order`
    - `saveSetup({name, printer, nozzle, material, build_plate, label})` → `id`
    - `updateSetup(id, patch)` / `archiveSetup(id)`
    - `getDefaultSetup()` → setup object or `null` (never an archived one)
    - `setDefaultSetup(id)`
    - `catalogNews({printers, materials})` → `{printers: n, materials: n}` (current − seen, floor 0)
    - `markCatalogSeen({printers, materials})`
  - `validateSetup(setup, pool, catalogs)` → `'valid' | 'missing_pool_ref' | 'missing_catalog_ref'` (pure export; `catalogs = { printers:Set, materials:Set, nozzles:Set, plates:Set }`)
  - `applySetupToState(setup, state)` → **new** state object with only `printer`, `nozzle`, `material` (+ `build_plate` if set) replaced (pure export)

Envelope on disk (`localStorage['3dpa_gear_v1']`) — THE forever shape:

```json
{ "v": 1,
  "printers":  { "x1c": { "nozzles": ["std_0.4","hrd_0.6"], "added_at": "<iso>", "archived_at": null } },
  "filaments": { "petg_basic": { "added_at": "<iso>", "archived_at": null } },
  "setups":    { "<uuid>": { "name": "Functional rig", "printer": "x1c", "nozzle": "hrd_0.6",
                              "material": "petg_basic", "build_plate": null,
                              "label": "X1 Carbon · 0.6 hardened · PETG Basic",
                              "created_at": "<iso>", "archived_at": null } },
  "order": ["<uuid>"],
  "default_setup": "<uuid or null>",
  "catalog_seen": { "printers": 0, "materials": 0 } }
```

- [ ] **Step 1: Write the failing test file**

`scripts/gear-store.test.js` — same skeleton as `scripts/workshop-store.test.js` (shebang, run comment, `check()`, `mockStorage()`, exit code):

```js
#!/usr/bin/env node
// ─── Tests for gear-store.js (Train 1 — My Gear + Setups) ───────────────────
// Run: node scripts/gear-store.test.js       Exit 0 all-green, 1 on failure.

const { loadBrowserScript } = require('./load-browser-script.js');
const { createGearStore, validateSetup, applySetupToState } =
  loadBrowserScript('gear-store.js', ['createGearStore', 'validateSetup', 'applySetupToState']);

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
const CATALOGS = {
  printers: new Set(['x1c', 'a1']), materials: new Set(['pla_basic', 'petg_basic']),
  nozzles: new Set(['std_0.4', 'hrd_0.6']), plates: new Set(['textured_pei']),
};

console.log('# gear-store.js tests\n');

// TC1 — pool round-trip + archive is soft
{
  const s = createGearStore(mockStorage());
  s.addPrinter('x1c', ['std_0.4', 'hrd_0.6']);
  s.addFilament('petg_basic');
  check('TC1 printer in pool', s.getPool().printers.some(p => p.id === 'x1c' && p.archived_at === null));
  s.archivePrinter('x1c');
  const p = s.getPool().printers.find(p => p.id === 'x1c');
  check('TC1 archive keeps row, sets archived_at', !!p && typeof p.archived_at === 'string');
  s.restorePrinter('x1c');
  check('TC1 restore clears archived_at', s.getPool().printers.find(p => p.id === 'x1c').archived_at === null);
}

// TC2 — setup save/list/default; archived setup can't be default
{
  const s = createGearStore(mockStorage());
  s.addPrinter('x1c', ['hrd_0.6']); s.addFilament('petg_basic');
  const id = s.saveSetup({ name: 'Rig', printer: 'x1c', nozzle: 'hrd_0.6',
                           material: 'petg_basic', build_plate: null,
                           label: 'X1 Carbon · 0.6 hardened · PETG Basic' });
  check('TC2 listSetups returns saved', s.listSetups().some(x => x.id === id && x.name === 'Rig'));
  s.setDefaultSetup(id);
  check('TC2 default set', s.getDefaultSetup()?.id === id);
  s.archiveSetup(id);
  check('TC2 archived setup never returned as default', s.getDefaultSetup() === null);
}

// TC3 — validation states
{
  const pool = { printers: [{ id: 'x1c', nozzles: ['hrd_0.6'], archived_at: null }],
                 filaments: [{ id: 'petg_basic', archived_at: null }] };
  const ok = { printer: 'x1c', nozzle: 'hrd_0.6', material: 'petg_basic', build_plate: null };
  check('TC3 valid', validateSetup(ok, pool, CATALOGS) === 'valid');
  check('TC3 missing_pool_ref (printer archived)',
    validateSetup(ok, { ...pool, printers: [{ ...pool.printers[0], archived_at: '2026-01-01' }] }, CATALOGS) === 'missing_pool_ref');
  check('TC3 missing_catalog_ref (id left catalog)',
    validateSetup({ ...ok, printer: 'gone_printer' }, pool, CATALOGS) === 'missing_catalog_ref');
}

// TC4 — applySetupToState merges ONLY hardware keys, returns new object
{
  const state = { printer: 'a1', nozzle: 'std_0.4', material: 'pla_basic',
                  useCase: ['functional'], surface: 'fine', profileMode: 'tuned' };
  const out = applySetupToState({ printer: 'x1c', nozzle: 'hrd_0.6',
                                  material: 'petg_basic', build_plate: 'textured_pei' }, state);
  check('TC4 hardware keys replaced', out.printer === 'x1c' && out.nozzle === 'hrd_0.6'
    && out.material === 'petg_basic' && out.build_plate === 'textured_pei');
  check('TC4 intent keys untouched', out.useCase[0] === 'functional' && out.surface === 'fine'
    && out.profileMode === 'tuned');
  check('TC4 input not mutated', state.printer === 'a1');
  const noPlate = applySetupToState({ printer: 'x1c', nozzle: 'hrd_0.6',
                                      material: 'petg_basic', build_plate: null }, state);
  check('TC4 null build_plate leaves state plate alone', !('build_plate' in noPlate) || noPlate.build_plate === state.build_plate);
}

// TC5 — catalog news floor + markSeen
{
  const s = createGearStore(mockStorage());
  s.markCatalogSeen({ printers: 80, materials: 19 });
  const n = s.catalogNews({ printers: 82, materials: 19 });
  check('TC5 counts delta', n.printers === 2 && n.materials === 0);
  check('TC5 floor 0 when catalog shrinks', s.catalogNews({ printers: 79, materials: 19 }).printers === 0);
}

// TC6 — corruption + quota resilience (workshop-store posture)
{
  const s = createGearStore(mockStorage({ '3dpa_gear_v1': '{not json' }));
  check('TC6 corrupt envelope reads as empty', s.listSetups().length === 0 && s.getPool().printers.length === 0);
  const throwing = { getItem: () => { throw new Error('denied'); },
                     setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
  const t = createGearStore(throwing);
  check('TC6 throwing storage never throws out', (() => { try { t.addPrinter('x1c', []); t.getPool(); return true; } catch (_) { return false; } })());
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall green');
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/gear-store.test.js`
Expected: loader error — `gear-store.js` not found (or export missing).

- [ ] **Step 3: Implement `gear-store.js`**

Follow `workshop-store.js`'s factory + guard style exactly (module.exports tail included — the shared loader depends on it):

```js
// ─── 3D Print Assistant — Gear store (Train 1: My Gear + Setups) ─────────────
// Versioned localStorage envelope at `3dpa_gear_v1`. THE FOREVER SHAPE — see
// docs/superpowers/specs/2026-08-17-next-gen-platform-design.md §2. Keyed maps
// + archived_at soft-delete + denormalized setup labels + stable order.
// App-layer only: catalog id-sets are injected; the store never touches Engine.

function createGearStore(storage) {
  const KEY = '3dpa_gear_v1';
  const VERSION = 1;

  const _now = () => new Date().toISOString();
  function _newId() {
    try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
    return 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function _empty() {
    return { v: VERSION, printers: {}, filaments: {}, setups: {},
             order: [], default_setup: null, catalog_seen: { printers: 0, materials: 0 } };
  }

  function _read() {
    let raw = null;
    try { raw = storage.getItem(KEY); } catch (_) { return _empty(); }
    if (!raw) return _empty();
    let env;
    try { env = JSON.parse(raw); } catch (_) { return _empty(); }
    if (!env || typeof env !== 'object' || env.v !== VERSION) return _empty();
    const base = _empty();
    for (const k of ['printers', 'filaments', 'setups']) {
      if (env[k] && typeof env[k] === 'object' && !Array.isArray(env[k])) base[k] = env[k];
    }
    if (Array.isArray(env.order)) base.order = env.order.filter(id => base.setups[id]);
    if (typeof env.default_setup === 'string' && base.setups[env.default_setup]) base.default_setup = env.default_setup;
    if (env.catalog_seen && typeof env.catalog_seen === 'object') {
      base.catalog_seen = { printers: Number(env.catalog_seen.printers) || 0,
                            materials: Number(env.catalog_seen.materials) || 0 };
    }
    return base;
  }

  function _write(env) { try { storage.setItem(KEY, JSON.stringify(env)); } catch (_) {} }

  // ── pool ──
  function getPool() {
    const env = _read();
    const row = ([id, r]) => ({ id, ...r });
    const act = r => r.archived_at === null;
    const printers = Object.entries(env.printers).map(row);
    const filaments = Object.entries(env.filaments).map(row);
    return { printers: [...printers.filter(act), ...printers.filter(r => !act(r))],
             filaments: [...filaments.filter(act), ...filaments.filter(r => !act(r))] };
  }
  function addPrinter(id, nozzles) {
    if (typeof id !== 'string' || !id) return;
    const env = _read();
    env.printers[id] = { nozzles: Array.isArray(nozzles) ? nozzles.filter(n => typeof n === 'string') : [],
                         added_at: env.printers[id]?.added_at || _now(), archived_at: null };
    _write(env);
  }
  function _setArchived(kind, id, value) {
    const env = _read();
    if (env[kind][id]) { env[kind][id].archived_at = value; _write(env); }
  }
  const archivePrinter = id => _setArchived('printers', id, _now());
  const restorePrinter = id => _setArchived('printers', id, null);
  function addFilament(id) {
    if (typeof id !== 'string' || !id) return;
    const env = _read();
    env.filaments[id] = { added_at: env.filaments[id]?.added_at || _now(), archived_at: null };
    _write(env);
  }
  const archiveFilament = id => _setArchived('filaments', id, _now());
  const restoreFilament = id => _setArchived('filaments', id, null);

  // ── setups ──
  function listSetups() {
    const env = _read();
    return env.order.map(id => ({ id, ...env.setups[id] }));
  }
  function saveSetup(s) {
    if (!s || typeof s !== 'object') return null;
    const env = _read();
    const id = _newId();
    env.setups[id] = { name: String(s.name || ''), printer: String(s.printer || ''),
                       nozzle: String(s.nozzle || ''), material: String(s.material || ''),
                       build_plate: typeof s.build_plate === 'string' ? s.build_plate : null,
                       label: String(s.label || ''), created_at: _now(), archived_at: null };
    env.order.push(id);
    _write(env);
    return id;
  }
  function updateSetup(id, patch) {
    const env = _read();
    if (!env.setups[id] || !patch || typeof patch !== 'object') return;
    const allowed = ['name', 'printer', 'nozzle', 'material', 'build_plate', 'label'];
    for (const k of allowed) if (k in patch) env.setups[id][k] = patch[k];
    _write(env);
  }
  function archiveSetup(id) {
    const env = _read();
    if (!env.setups[id]) return;
    env.setups[id].archived_at = _now();
    if (env.default_setup === id) env.default_setup = null;
    _write(env);
  }
  function getDefaultSetup() {
    const env = _read();
    const id = env.default_setup;
    if (!id || !env.setups[id] || env.setups[id].archived_at !== null) return null;
    return { id, ...env.setups[id] };
  }
  function setDefaultSetup(id) {
    const env = _read();
    if (env.setups[id] && env.setups[id].archived_at === null) { env.default_setup = id; _write(env); }
  }

  // ── catalog news (badge = new since last My Gear visit; spec §9 Q4) ──
  function catalogNews(current) {
    const seen = _read().catalog_seen;
    return { printers: Math.max(0, (Number(current?.printers) || 0) - seen.printers),
             materials: Math.max(0, (Number(current?.materials) || 0) - seen.materials) };
  }
  function markCatalogSeen(current) {
    const env = _read();
    env.catalog_seen = { printers: Number(current?.printers) || 0,
                         materials: Number(current?.materials) || 0 };
    _write(env);
  }

  return { getPool, addPrinter, archivePrinter, restorePrinter,
           addFilament, archiveFilament, restoreFilament,
           listSetups, saveSetup, updateSetup, archiveSetup,
           getDefaultSetup, setDefaultSetup, catalogNews, markCatalogSeen };
}

// Pure helpers (also exported for iOS-parity reasoning + tests) ───────────────

// 'valid' | 'missing_pool_ref' | 'missing_catalog_ref'
function validateSetup(setup, pool, catalogs) {
  if (!setup) return 'missing_catalog_ref';
  const ids = [['printers', setup.printer], ['nozzles', setup.nozzle],
               ['materials', setup.material]];
  if (setup.build_plate) ids.push(['plates', setup.build_plate]);
  for (const [kind, id] of ids) {
    if (!id || !catalogs[kind] || !catalogs[kind].has(id)) return 'missing_catalog_ref';
  }
  const pp = (pool.printers || []).find(p => p.id === setup.printer && p.archived_at === null);
  const pf = (pool.filaments || []).find(f => f.id === setup.material && f.archived_at === null);
  if (!pp || !pf) return 'missing_pool_ref';
  return 'valid';
}

// Merges ONLY hardware-identity keys; never intent keys. Returns a new object.
function applySetupToState(setup, state) {
  const out = { ...state, printer: setup.printer, nozzle: setup.nozzle, material: setup.material };
  if (typeof setup.build_plate === 'string' && setup.build_plate) out.build_plate = setup.build_plate;
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createGearStore, validateSetup, applySetupToState };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `node scripts/gear-store.test.js` → Expected: `all green`, exit 0.

- [ ] **Step 5: Verify CI selector picks the new suite up**

Run: `grep -rn "test" .github/workflows/ci.yml | head` and confirm the tier that runs `scripts/*.test.js` covers `scripts/gear-store.test.js` (the coverage reconciliation fails the build if no tier claims it — that failure, not silence, is the signal to fix tier globs).

- [ ] **Step 6: Commit**

```bash
git add gear-store.js scripts/gear-store.test.js
git commit -m "feat(gear): 3dpa_gear_v1 store — pool, setups, default, catalog-news (Train 1)"
```

---

### Task 2: Web boot integration + setup switcher

**Files:**
- Modify: `app.js` (boot sequence near the `3dpa_state_v1` restore at `app.js:199-210`; header switcher render; new `Gear` instance)
- Modify: `index.html` (script tag before `app.js`; switcher mount `<div id="setupSwitcher"></div>` in the configurator header area)
- Modify: `locales/en.json` + `locales/da.json`
- Test: `scripts/gear-store.test.js` already covers apply semantics; browser behavior verified in Step 5 via preview.

**Interfaces:**
- Consumes: `createGearStore`, `applySetupToState` (Task 1).
- Produces: global `Gear = createGearStore(window.localStorage)` used by Tasks 3–4; `applyActiveSetup(setupId)` app.js function used by the switcher and My Gear UI.

- [ ] **Step 1: Load the store**

`index.html`: add `<script src="gear-store.js"></script>` immediately before the `app.js` script tag (same pattern as `workshop-store.js`).

- [ ] **Step 2: Boot rule + apply function in `app.js`**

Boot rule (spec'd here, binding): **the persisted `3dpa_state_v1` session wins; the default setup applies only when state restore returns false** (fresh visitor/new device/expired storage). Insert after the existing restore call (the function containing `app.js:204`):

```js
const Gear = createGearStore(window.localStorage);

function applyActiveSetup(setupId) {
  const setup = Gear.listSetups().find(s => s.id === setupId && s.archived_at === null);
  if (!setup) return false;
  state = applySetupToState(setup, state);
  persistState();            // existing 3dpa_state_v1 writer (app.js:199)
  renderAll();               // existing full re-render entry point
  renderSetupSwitcher();
  return true;
}

// boot: fresh sessions start on the default setup
if (!restored) {             // `restored` = boolean the existing restore path returns
  const def = Gear.getDefaultSetup();
  if (def) { state = applySetupToState(def, state); }
}
```

(Adopt the file's actual names for `persistState`/`renderAll`/`restored` at the insertion site — they exist in the restore block already; do not invent parallel paths.)

- [ ] **Step 3: Switcher UI**

`renderSetupSwitcher()` in `app.js` — a compact chip row in the configurator header, active setup highlighted, one chip per active setup + a gear icon linking to My Gear (Task 3 route). Empty store renders nothing:

```js
function renderSetupSwitcher() {
  const el = document.getElementById('setupSwitcher');
  if (!el) return;
  const setups = Gear.listSetups().filter(s => s.archived_at === null);
  el.innerHTML = '';
  if (!setups.length) { el.hidden = true; return; }
  el.hidden = false;
  const active = setups.find(s => s.printer === state.printer
    && s.nozzle === state.nozzle && s.material === state.material);
  setups.forEach(s => {
    const chip = document.createElement('button');
    chip.className = 'chip gear-setup-chip' + (active && active.id === s.id ? ' selected' : '');
    chip.innerHTML = `<span>${s.name}</span><span class="chip-desc">${s.label}</span>`;
    chip.addEventListener('click', () => applyActiveSetup(s.id));
    el.appendChild(chip);
  });
}
```

Call `renderSetupSwitcher()` from the same place `renderAll()` finishes its top-level render.

- [ ] **Step 4: Locale keys**

`locales/en.json`: `"gearSwitcherTitle": "My setups"`, `"gearOpen": "My Gear"`.
`locales/da.json`: `"gearSwitcherTitle": "Mine opsætninger"`, `"gearOpen": "Mit udstyr"`.

- [ ] **Step 5: Browser verification (preview tools)**

Start the dev server (`npx serve -l 4200 .` via the launch config), seed a setup from the console (`Gear.saveSetup({...}); Gear.setDefaultSetup(id)`), reload, and verify: fresh-profile session lands on the default setup's printer/nozzle/material; switcher chips render and switch; console shows no errors; existing restore path unchanged when `3dpa_state_v1` exists.

- [ ] **Step 6: Commit**

```bash
git add app.js index.html locales/en.json locales/da.json
git commit -m "feat(gear): default-setup boot + setup switcher on web (Train 1)"
```

---

### Task 3: Web My Gear management UI

**Files:**
- Modify: `app.js` (My Gear panel: pool pickers + setup editor + news badge; `openMyGear()`/`closeMyGear()`)
- Modify: `index.html` (My Gear section shell, entry button next to the Workshop entry)
- Modify: `style.css` (`.gear-panel`, `.gear-pool-chip`, `.gear-news-badge`, reuse `.chip` family)
- Modify: `locales/en.json` + `locales/da.json`

**Interfaces:**
- Consumes: `Gear` (Task 2), `Engine.getBrands()`, `Engine.getPrintersByBrand(id)`, `Engine.searchPrinters(q)`, `Engine.getFilters(state)` (materials/nozzles/plates lists), `validateSetup`.
- Produces: `openMyGear()` used by the switcher gear icon (Task 2) and header nav; on open it calls `Gear.markCatalogSeen({printers, materials})` with counts derived from `Engine.getBrands()` totals + `getFilters` materials length — the badge contract Task 4 renders.

- [ ] **Step 1: Section shell + entry** — `index.html`: a `.gear-panel` section (hidden by default) with three tabs: *Printers*, *Filaments*, *Setups*; entry button `id="navGear"` beside the existing Workshop nav entry.

- [ ] **Step 2: Pool pickers** — Printers tab: brand chips → printer chips (from `Engine.getBrands()` / `getPrintersByBrand`), tap toggles pool membership (`addPrinter(id, [])` / `archivePrinter`); per owned printer, nozzle multi-select from `getFilters` nozzle items writes `addPrinter(id, nozzles)`. Filaments tab: material chips from `getFilters`, toggle `addFilament`/`archiveFilament`. Owned chips get `.selected`; archived render dimmed with a restore affordance. All rendering reuses the existing chip renderer patterns from `app.js:742-752`.

- [ ] **Step 3: Setups tab** — list via `Gear.listSetups()` + validation state chip per setup (`validateSetup` with a catalogs object built once from `getFilters` + `getBrands`; `missing_catalog_ref` → warning style + repair hint; `missing_pool_ref` → hint naming the archived item). "New setup" opens an inline editor: name field + printer (pool only) → nozzle (that printer's pool nozzles) → material (pool filaments) → optional plate; label auto-composed `"${printerName} · ${nozzleName} · ${materialName}"`; Save → `saveSetup` + optional "make default" toggle → `setDefaultSetup`.

- [ ] **Step 4: News badge on open** — on `openMyGear()`: compute `current = { printers: totalPrinterCount, materials: materialItemCount }`, render "N new printers / M new materials since your last visit" when `Gear.catalogNews(current)` is non-zero, then `Gear.markCatalogSeen(current)`.

- [ ] **Step 5: Locales** — EN/DA keys for tab names, buttons, validation hints, badge text (`gearNewSince`: "{n} new since your last visit" / "{n} nye siden sidst").

- [ ] **Step 6: Browser verification** — via preview: build a pool (2 printers, 3 filaments), create 2 setups, set default, archive one pool printer and confirm its setup shows `missing_pool_ref` hint; reload survives; no console errors; dark + light themes; 320px width (chip rows wrap, panel scrolls).

- [ ] **Step 7: Commit**

```bash
git add app.js index.html style.css locales/en.json locales/da.json
git commit -m "feat(gear): My Gear management panel on web — pool, setups, news badge (Train 1)"
```

---

### Task 4: Web pool-first pickers

**Files:**
- Modify: `app.js` — brand row renderer (`app.js:468-478`) and the generic chips renderer (`app.js:742-752`)
- Modify: `style.css` — `.chip-group-label` ("Your gear" header row)
- Modify: `locales/en.json`/`da.json` — `gearYourGear`: "Your gear" / "Dit udstyr", `gearShowAll`: "Show all" / "Vis alle"

**Interfaces:**
- Consumes: `Gear.getPool()` (Task 1).
- Produces: the picker behavior Tasks 5–8 mirror on iOS.

Binding semantics (spec §2 constraint 1): when the pool is non-empty, the pool REPLACES the `core`/`primary` set as the *initially visible* group, rendered under a labeled **"Your gear"** group header (a text label — visually distinct from compat dimming, which stays untouched); everything else stays reachable behind the existing `+N more` affordance (`pickerShowMore` for brands, `showAll` for chips). Empty pool → today's behavior exactly (core/primary defaults). The engine's `core:` tag and compat logic are not touched.

- [ ] **Step 1: Brand row** — in the `app.js:472` block: `const ownedBrands = new Set(pool.printers.filter(p => !p.archived_at).map(p => Engine.getPrinter(p.id)?.brand))` (use the existing brand lookup the row already relies on); when non-empty and `!pickerShowMore`, `visible = brands.filter(b => ownedBrands.has(b.id))` with the "Your gear" group label above and the show-more chip labeled with the remaining count.
- [ ] **Step 2: Material/nozzle chips** — in the `app.js:742` loop: when pool non-empty, `isHidden = !showAll && !ownedIds.has(item.id)` (ownedIds from `getPool()` filaments / active printer's nozzles) replacing the `item.core === false` clause; group label rendered before the first owned chip.
- [ ] **Step 3: Printer chips within a brand** — same treatment using pool printer ids.
- [ ] **Step 4: Browser verification** — with a pool: pickers open on "Your gear" + show-more reveals the rest; incompatible-but-owned items still render the compat treatment on top (select ASA-incompatible printer/nozzle combo and confirm the dimming still fires); with an empty pool: pixel-identical to today (compare against production in a second tab).
- [ ] **Step 5: Commit**

```bash
git add app.js style.css locales/en.json locales/da.json
git commit -m "feat(gear): pool-first pickers with Your-gear grouping on web (Train 1)"
```

---

### Task 5: Web walkthrough + drift proof + push

**Files:** none new — verification task.

- [ ] **Step 1:** `node scripts/walkthrough-harness.js` → green (engine untouched, must be a no-op).
- [ ] **Step 2:** `node scripts/engine-golden-snapshot.js --check` → **NO DRIFT** (the proof no engine/data byte moved).
- [ ] **Step 3:** full local suite: run the CI tiers' commands from `.github/workflows/ci.yml` locally; exit 0 each.
- [ ] **Step 4:** `git push origin main` → confirm CI green on GitHub (`gh run watch`).
- [ ] **Step 5:** production smoke: `https://3dprintassistant.com` — seed a setup, verify switcher + My Gear live; empty-pool visitors unchanged.

---

### Task 6: iOS `GearStore.swift` — TDD with web-parity fixture

**Files:**
- Create: `3DPrintAssistant/Services/GearStore.swift`
- Test: `3DPrintAssistantTests/GearStoreTests.swift`

**Interfaces:**
- Consumes: `FileManager` Application Support dir (same pattern as `AppStatePersistence`, injectable `fileURL` for tests).
- Produces (Tasks 7–9): `GearStore.shared`, `struct GearSetup { id, name, printer, nozzle, material, buildPlate, label, createdAt, archivedAt }`, `struct GearPoolPrinter { id, nozzles, archivedAt }`, API mirroring web: `pool()`, `addPrinter(_:nozzles:)`, `archivePrinter(_:)`, `addFilament(_:)`, `setups()`, `saveSetup(_:)`, `updateSetup(id:patch:)`, `archiveSetup(id:)`, `defaultSetup()`, `setDefaultSetup(id:)`, `catalogNews(current:)`, `markCatalogSeen(current:)`, plus `static func apply(_ setup: GearSetup, to state: AppState) -> AppState` (hardware keys only — printer/nozzle/material/buildPlate; iOS `brand` field updated from the printer's brand so the picker preselection logic keeps working).

**JSON contract:** decodes/encodes the exact Task 1 envelope (snake_case keys via `CodingKeys`; file `gear.json` beside `app-state.json`). Unknown fields tolerated (additivity rule).

- [ ] **Step 1: Failing tests** — `GearStoreTests.swift`: (a) round-trip pool + setups through a temp-dir store; (b) archived default returns nil; (c) `apply` replaces only hardware keys and sets `brand`; (d) **parity fixture**: embed the exact envelope JSON string from Task 1's spec block, decode, assert every field; re-encode and decode again (stability); (e) corrupt file → empty store, no crash; (f) catalogNews floor-0. Follow `AppStatePersistenceTests` structure for temp-file injection.
- [ ] **Step 2:** Run: `xcodebuild test -scheme 3DPrintAssistant -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:3DPrintAssistantTests/GearStoreTests` (project's standard invocation; `CODE_SIGNING_ALLOWED=NO`) → FAIL (type missing).
- [ ] **Step 3:** Implement `GearStore.swift`: Codable envelope structs with `CodingKeys` for snake_case; best-effort atomic writes (`AppStatePersistence` posture); all mutating APIs read-modify-write the file.
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5:** Commit (LOCAL — push gate): `git commit -m "feat(gear): GearStore — 3dpa_gear_v1 Codable mirror with web parity fixture (Train 1)"`

---

### Task 7: iOS Home default-setup + switcher

**Files:**
- Modify: `3DPrintAssistant/Views/Home/HomeView.swift` (the CTA block containing line 91's `router.push(.brandPicker)`)
- Test: extend `GearStoreTests.swift` with the CTA-decision helper test.

**Interfaces:**
- Consumes: `GearStore.shared.defaultSetup()`, `GearStore.apply(_:to:)`.
- Produces: `HomeView` behavior — when a default setup exists: primary CTA reads `Strings.Gear.continueWith(setupName)` and applies the setup to `appState` then `router.push(.goals)` (skipping brand/printer/material/nozzle pickers); a secondary row lists other active setups (tap = apply+push) + a "My Gear" link (Task 8's route). No default setup → today's CTA to `.brandPicker` unchanged.

- [ ] **Step 1:** Extract the decision into a testable helper `GearHomeCTA.destination(defaultSetup:) -> (title: String, appliesSetup: Bool)`; write its test first (default present/absent), run RED (TDD-RED breadcrumb rule: inverted-first on the present-case assertion, flip after observing the failure, leave `// RED demo verified 2026-08-…` comment).
- [ ] **Step 2:** Implement helper + wire `HomeView` CTA; switcher row styled with existing `SharedComponents` chip pattern; spring-feel selection consistent with the app's animation conventions (owner UI preference).
- [ ] **Step 3:** Run the full unit bundle (`-only-testing:3DPrintAssistantTests`) → green.
- [ ] **Step 4:** Simulator proof: seed via `GearStore.shared` in a debug hook, screenshot Home with switcher, verify skip-to-goals flow and that clearing the default restores the old CTA. (Simulator tools; attach panel if the owner is watching.)
- [ ] **Step 5:** Commit local: `git commit -m "feat(gear): default-setup CTA + switcher on Home (Train 1)"`

---

### Task 8: iOS My Gear screens

**Files:**
- Create: `3DPrintAssistant/Views/Gear/MyGearView.swift`, `3DPrintAssistant/Views/Gear/SetupEditorView.swift`
- Modify: router/route enum (add `.myGear`), Home link (Task 7), Settings row entry
- Modify: `Localizable.strings` EN/DA

**Interfaces:**
- Consumes: `GearStore` API (Task 6), `DataService.shared` catalogs (brand/printer/material/nozzle lists — same sources the pickers use), `PrinterCatalogProvider` for printer names.
- Produces: `.myGear` route used from Home and Settings.

- [ ] **Step 1:** `MyGearView`: three segments (Printers / Filaments / Setups) using the app's `SlidingSegmentedControl`; pool toggling mirrors web Task 3 semantics (archive = dimmed + restore); news badge on appear via `catalogNews` against `DataService` counts, then `markCatalogSeen`.
- [ ] **Step 2:** `SetupEditorView` presented with `.sheet(item:)` (project rule — never `.sheet(isPresented:)` with a separate optional): name, printer (pool), nozzle (that printer's pool nozzles), material (pool), optional plate, auto-label, make-default toggle.
- [ ] **Step 3:** Validation chips per setup (`missing_pool_ref` / `missing_catalog_ref` hints) using the same derivation rules as web's `validateSetup` (implement as `GearSetup.validation(pool:catalogs:)`, unit-tested in `GearStoreTests` with the same three cases as web TC3).
- [ ] **Step 4:** Strings EN/DA; dark-mode-only styling per `ColorTheme`; stagger-reveal on list appear consistent with existing views.
- [ ] **Step 5:** Full unit bundle green; simulator walkthrough (create pool → setups → default → Home CTA reflects it) with screenshots.
- [ ] **Step 6:** Commit local: `git commit -m "feat(gear): My Gear + setup editor screens (Train 1)"`

---

### Task 9: iOS pool-first pickers

**Files:**
- Modify: `3DPrintAssistant/Views/Configurator/BrandPickerView.swift` (`:7-8` primary consumption), `MaterialPickerView.swift` (`:13-25` featured/more split), the nozzle picker view (locate via `grep -rn "std_0.4" 3DPrintAssistant/Views/Configurator/`)
- Test: extend `GearStoreTests.swift` with the list-splitting helper tests.

**Interfaces:**
- Consumes: `GearStore.shared.pool()`.
- Produces: pickers open on a "Your gear" section when the pool is non-empty (`featuredIds`/`primary` stay the empty-pool fallback — spec #32 Q7); "Show all" reveals the rest; compat dimming untouched.

- [ ] **Step 1:** Testable helper `GearPickerSplit.split(all: [String], owned: Set<String>) -> (featured: [String], more: [String])` — owned non-empty → featured = owned∩all in catalog order; owned empty → nil signal to use existing behavior. TDD (RED first with the batch's inverted-first breadcrumb or degenerate-RED commit-body note per project rule).
- [ ] **Step 2:** Wire into the three pickers with a `Text(Strings.Gear.yourGear)` section header; keep each file's existing structure (featured/more arrays swap source, rendering unchanged).
- [ ] **Step 3:** Full unit bundle + `ScreenCaptureUITests` smoke → green; simulator screenshots of each picker with and without a pool.
- [ ] **Step 4:** Commit local: `git commit -m "feat(gear): pool-first pickers with featured fallback (Train 1)"`

---

### Task 10: Train close-out (verification + planning surfaces)

**Files:**
- Modify: `docs/planning/ROADMAP.md` (Train 1 row → shipped-on-web / iOS-local state), GitHub #32 (comment + close when both surfaces land), `docs/sessions/` log at wrap-up.

- [ ] **Step 1:** Web: rerun walkthrough + golden `--check` (NO DRIFT) + full CI-green confirmation on `main`.
- [ ] **Step 2:** iOS: full XCTest bundle + UITest smoke green by exit code; repo state = clean tree, N commits ahead, **unpushed** (push gate — push only at 1.2.0 train composition with owner authorization).
- [ ] **Step 3:** Cross-surface parity spot-check: export the web envelope from localStorage, drop it into the iOS parity fixture location, run `GearStoreTests` → green.
- [ ] **Step 4:** Update ROADMAP (statuses, next: 1.2.0 composition gates: MARKETING_VERSION bump, release notes incl. Elegoo iOS row from #31, TestFlight dispatch, owner device acceptance) and comment on #32 with the shipped scope; leave the issue open until iOS ships.
- [ ] **Step 5:** Commit docs: `git commit -m "docs(gear): Train 1 status — web live, iOS local under push gate"`

---

## Self-Review (run after writing — completed 2026-08-17)

1. **Spec coverage:** §2 pool ✓(T1/T3/T8) · setups+default ✓(T1/T2/T7) · partial-preset keys ✓(T1 TC4) · lifecycle/orphans ✓(T1 TC3, T3.3, T8.3) · dedicated store forever-shape ✓(T1) · picker filtering + distinct treatment ✓(T4/T9) · new-items badge ✓(T1 TC5, T3.4, T8.1) · analytics caveat = no new events, nothing to do · app-layer only ✓(T5.2 drift proof).
2. **Placeholder scan:** none — every code step carries real code or an exact existing-pattern binding.
3. **Type consistency:** `createGearStore/validateSetup/applySetupToState` names match across T1→T4; iOS `GearStore`/`GearSetup`/`apply` match T6→T9; envelope keys identical in T1 spec block and T6 parity fixture.
