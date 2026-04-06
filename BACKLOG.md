# 3D Print Assistant — Feature Backlog

> **Interactive dashboard:** Open [`backlog.html`](backlog.html) for the full backlog with filters, priority reordering, and gem highlighting.

## Status legend
- **Idea** — captured, not yet assessed
- **Planned** — approved, implementation ready
- **In Progress** — currently being built
- **Done** — see archive at bottom

---

## Planned

### #036 — Profile Parameter Data Architecture + Value Correctness
**Status:** Planned | **Scope:** Medium-Large | **Spec:** [IMPL-036-profile-params.md](IMPL-036-profile-params.md)

Eliminate hardcoded slicer dropdown values in engine.js. Move all parameter values to `objective_profiles.json` as BS-compatible values. Fix broken exports, add missing parameters, expand support style options.

**Root problems:**
- `internal_solid_infill_pattern` exports `"zig-zag"` — invalid BS value ❌
- `ironing_pattern` never exported (separate BS field) ❌
- `seam_position` shows "Aligned (or Back)" / "Sharpest corner" — not real BS labels ⚠
- `support_style` uses 2 of 5 BS options, no use-case awareness ⚠
- `ironing` stored as display string, not BS value ⚠
- `internal_solid_infill_pattern` always "Auto (Rectilinear)" regardless of quality level ⚠

**Deliverables:**
- [ ] `objective_profiles.json` — add 5 new fields to surface_quality entries (seam_position, only_one_wall_top, ironing_type, ironing_pattern, internal_solid_infill_pattern)
- [ ] `engine.js` resolveProfile() — replace hardcoded strings with data reads + display lookup tables
- [ ] `engine.js` exportBambuStudioJSON() — fix zig-zag bug, add ironing_pattern, expand support_style map (5 options)
- [ ] SLICER_TABS + SLICER_PARAM_LABELS — split ironing → ironing_type + ironing_pattern across all 3 slicers
- [ ] Full import test in Bambu Studio

---

### #001 — AMS Purge Volume Calculator
**Status:** Planned | **Scope:** Medium

Restore the previously-shipped purge calculator. Users select active AMS slots (2–4), assign brightness levels (dark/medium/light), and get a flush volume matrix per source→target transition adjusted by material multiplier.

- [ ] engine.js — restore purge calculation logic
- [ ] app.js — restore `purgeState`, `renderPurgeCalculator()`, nav listener, `setView('purge')`
- [ ] index.html — restore `#navPurge` button and `#viewPurge` container
- [ ] style.css — restore `.purge-*` styles
- [ ] locales/en.json + da.json — purge strings already present, verify they render

---

### #026 — Smart Simple/Advanced Configurator Mode
**Status:** Planned | **Scope:** Medium

Extend the Simple/Advanced toggle to also control configurator input — not just output. Simple mode shows fewer filters with sensible defaults pre-applied; Advanced mode shows all 12 filters unchanged.

Simple shows: Printer (all), Nozzle (std/hrd 0.4), Material (PLA Basic, PLA Matte, PETG HF, ABS, ASA, TPU), Surface Quality, Strength, Support. Hidden filters default: Speed → balanced, Env → normal, Use Case/Colors/Level/Special → none.

- [ ] **Audit first** — re-read `resolveProfile()` to verify defaults don't produce unexpected output
- [ ] engine.js — add `simpleVisible` flag + `SIMPLE_DEFAULTS` constant to filter definitions
- [ ] app.js — update `buildFilters()` to skip hidden filters; `setMode()` to apply/clear defaults

---

### #032 — JSDoc Typedefs for Core Engine Objects
**Status:** Planned | **Scope:** Small

Add `@typedef` for `State`, `Profile`, `Warning`, `PrinterDef`, `MaterialDef`, `NozzleDef`, `Param`. Zero runtime cost — unlocks VS Code autocomplete and catches property misuse without TypeScript.

- [ ] engine.js — add `@typedef` blocks near top; annotate return types on public functions
- [ ] app.js — annotate `state` object and key variables with `@type`

---

### #033 — Engine Modularization (ES Modules)
**Status:** Planned | **Scope:** Medium

Split engine.js into native ES modules (no bundler). Public `Engine` API re-exported from `engine/index.js` — app.js needs one import change only. Only pursue when engine is actively growing.

```
engine/index.js · data-loader.js · i18n.js · profile.js
       warnings.js · troubleshooter.js · estimator.js
```

- [ ] Create `engine/` and split engine.js into modules above
- [ ] index.html — add `type="module"`; update script src
- [ ] Verify app.js works unchanged; remove old engine.js

---

## Ideas

### #003 — Copy Individual Setting Value
**Scope:** Small

Click a value in the results panel to copy it to clipboard with a brief "Copied!" flash.

- [ ] app.js — wrap param value in `<span class="copy-value">`; click → `clipboard.writeText()`; toggle `.copied` for ~1.5s
- [ ] style.css — pointer cursor, hover highlight, tooltip animation

---

### #004 — Copy All Settings as Formatted Text
**Scope:** Small

"Copy all" button assembles the active tab's params as `label: value` plain text, paste-ready for notes or chat.

- [ ] app.js — button in results header; iterate sections/params; `clipboard.writeText()`; brief confirmation

---

### #005 — Shareable Profile URL
**Scope:** Small

Encode active filter selections as URL query params so a profile can be shared via link.

- [ ] app.js — read `URLSearchParams` on load, pre-populate `appState`; `history.replaceState()` on each state change

---

### #006 — Parameter Tooltip / Info Panel
**Scope:** Medium

Clicking ⓘ next to a parameter opens a modal explaining what it controls, why this value was chosen, and what changing it does.

- [ ] data/param-info.json — entries keyed by param ID with `description`, `whyThisValue`, `increaseEffect`, `decreaseEffect` in EN/DA
- [ ] app.js — click handler on ⓘ; render `<dialog>` modal
- [ ] style.css — modal backdrop and card

---

### #007 — Auto Dark Mode
**Scope:** Small

Detect `prefers-color-scheme: dark` on first visit and apply matching theme. Explicit toggle stored in localStorage takes priority.

- [ ] app.js — on init, check localStorage; if absent use `matchMedia`; store on toggle; add reactive listener

---

### #008 — Expanded Warning Explanations
**Scope:** Small

Make each warning chip expandable — click reveals root cause and 1–2 concrete fix steps.

- [ ] engine.js — ensure warnings include `detail` and `fix` fields
- [ ] app.js — toggle `.expanded` on click; show detail div
- [ ] style.css — expand/collapse transition

---

### #010 — More Printer Support
**Scope:** Medium

Add Bambu Lab A1 Combo, Prusa MK4, Prusa XL, Voron 2.4, Creality K1 Max.

- [ ] data/printers.json — add entries with full printer fields
- [ ] engine.js — audit warning rules for Bambu-specific assumptions; add overrides for Prusa/Voron

---

### #011 — More Material Support
**Scope:** Medium

Add PLA+, PLA Sparkle, PETG Transparent, PA12-CF, PPA-CF, ABS-GF.

- [ ] data/materials.json — add entries with speed multiplier, enclosure/nozzle/drying requirements
- [ ] engine.js — extend warnings for CF/GF materials

---

### #012 — Saved Presets (localStorage)
**Scope:** Medium

Name and save current filter state as a preset; reload from a picker in one click. No backend required.

- [ ] app.js — "Save preset" button; store `{ name, state }` in localStorage; preset picker with delete; validate stale keys on load
- [ ] style.css — picker and save button

---

### #015 — Community-Contributed Profiles
**Scope:** Large

Read-only community profiles submitted via GitHub PR, shown as "Community verified" panel alongside generated profile.

- [ ] data/community-profiles.json — `{ id, contributor, printer, nozzle, material, settings{}, rating, notes }`
- [ ] engine.js — `getCommunityProfiles(state)` sorted by rating
- [ ] app.js + style.css — community panel and badges

---

### #016 — Troubleshooter Expansion
**Scope:** Large

Expand from 8 to 20+ symptoms: nozzle clog, layer shifting, z-banding, wet filament, poor overhangs, bridging failure. Each with 3–5 ranked causes and diagnostic steps.

- [ ] data/troubleshooter.json — add symptom entries
- [ ] engine.js — extend cause ranking by printer/material context

---

### #017 — Profile Export to Bambu Studio .json
**Scope:** Large

Generate a valid Bambu Studio process profile `.json` importable directly — eliminates manual transcription.

- [ ] engine.js — `exportToBambuStudio(profile)` mapping internal params to Bambu Studio field names
- [ ] data/bambu-field-map.json — param ID → Bambu Studio key + value transformations
- [ ] app.js — "Export for Bambu Studio" button triggering file download

---

### #018 — Print Time Estimator Improvements
**Scope:** Large

Acceleration/deceleration modeling, support volume estimation, and comparison table across Draft/Standard/Fine presets.

- [ ] engine.js — extend `estimatePrintTime()` with accel correction; add `estimateAllPresets()`
- [ ] app.js + style.css — comparison table UI

---

### #019 — Multi-Language Expansion
**Scope:** Medium

Add German (DE), Dutch (NL), Swedish (SV). With locale files now external, each language is a pure data task.

- [ ] locales/de.json, nl.json, sv.json — translate all keys from en.json
- [ ] app.js — render language buttons dynamically from loaded locale keys

---

### #020 — Filament Database / Brand Profiles
**Scope:** Large

Secondary "Brand" selector after material type with temp/speed overrides from brand datasheets. Generic applies no override.

- [ ] data/brands.json — `{ materialId, brandId, tempOverride?, speedOverride?, source }`
- [ ] engine.js — apply brand overrides after base material resolution
- [ ] app.js + style.css — secondary brand selector under material chips

---

### #021 — Export as HTML Print Sheet
**Scope:** Small

Self-contained, fully offline HTML file showing all selections and settings — permanent print reference with no external dependencies.

- [ ] engine.js — `generateHTMLSheet(state, profile)` with inlined CSS
- [ ] app.js — trigger download via `<a href="data:text/html;...">` with generated filename

---

### #022 — User Profiles & Community Layer
**Scope:** Large

Optional user accounts (passwordless/social auth) for cross-device preset sync, print history, and community profile sharing. Core tool stays fully functional without login.

- [ ] Phase 1 — Supabase Auth (Google/GitHub); sync localStorage presets to user record
- [ ] Phase 2 — Auto-save profile snapshots; History view with one-click restore
- [ ] Phase 3 — "Share profile" button; Community browse filtered by printer/material

---

### #029 — Source Attribution for Recommendations
**Scope:** Medium

Badge each parameter value as `📋 Brand guideline`, `👥 Community tested`, or `🔧 Tool calculated`.

- [ ] engine.js — add `source: 'brand' | 'community' | 'calculated'` to each param object
- [ ] data/materials.json — tag base settings per source
- [ ] app.js + style.css — subtle badge next to each value; legend tooltip

---

### #034 — app.js Render/Event Refactor
**Scope:** Large | **Deferred — high risk, low near-term reward**

Declarative per-view render functions and centralized event registration to reduce DOM coupling. Only pursue if app.js becomes a source of regressions.

- [ ] app.js — extract `renderConfigure()`, `renderTroubleshoot()`, `renderFeedback()` as pure functions
- [ ] app.js — consolidate all listeners into `bindControls()` on boot using event delegation

---

### #035 — CI Pipeline
**Scope:** Small | **Deferred — add when second contributor joins**

ESLint + data validation + headless smoke test on push/PR via GitHub Actions.

- [ ] package.json — `lint`, `test:data`, `test:smoke` scripts
- [ ] .github/workflows/ci.yml — install → lint → validate → smoke test

---

## Archive — Shipped

| # | Feature | Shipped |
|---|---------|---------|
| #002 | Match Bambu Studio Process Tab Structure | 2026-04-02 |
| #023 | Analytics — Cloudflare Web Analytics | 2026-04-01 |
| #024 | SEO Optimization | 2026-04-01 |
| #025 | Roadmap modal in footer | 2026-04-01 |
| #027 | Slicer-aware tab structure (Bambu Studio + PrusaSlicer) | 2026-04-02 |
| #028 | TPU 85A / 90A print & support guidance | 2026-04-02 |
| #030 | i18n locale extraction to locales/*.json | 2026-04-03 |
| #031 | JSON schema validation script | 2026-04-03 |
| #009 | Orca Slicer layout support (auto via printer brand) | 2026-04-03 |
| #013 | Print checklist / pre-flight panel | 2026-04-03 |
| #014 | Mobile layout improvements | 2026-04-03 |
