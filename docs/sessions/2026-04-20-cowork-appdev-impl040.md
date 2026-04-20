# Session: 2026-04-20 — Cowork App Dev — IMPL-040 execution

**Type:** Follow-up structural fix after IMPL-039.
**Trigger:** During the IMPL-039 verification the user noticed the Surface Quality chips still showed hardcoded numbers (`Draft — 0.28mm layers`) even though the actual emitted layer height could be clamped to a lower value on small nozzles. IMPL-039 had fixed emitted profile *values* — IMPL-040 fixes the UI chip *text* that describes those values.

## The principle they pushed for

> "How can we make sure that the info text is aligned with our suggestion in the end?"

Rule: any number shown in UI that depends on state must be computed by the same function that emits it to the profile. Never store state-dependent numbers in static text.

## What changed

### Data — numbers removed from desc strings

`data/rules/objective_profiles.json`:
- Surface: `"0.28mm layers — fast prints..."` → `"Fast prints, visible layer lines. Good for prototypes."`
- Strength: `"2 walls · 8% — lightweight..."` → `"Lightweight, fast, not load-bearing."`
- Same structural strip for all 6 surface presets and all 4 strength presets.
- Speed descs left alone (already qualitative).
- Added `_meta.desc_convention` documenting the rule for future contributors.

### Engine — state-aware `getFilters(state)`

- New signature: `Engine.getFilters(state?)`. When state is given, chip descs for surface/strength/support get a numeric prefix computed from the same code paths `resolveProfile` uses (`_clampNum` for layer height, wall/infill data fields for strength, `_SUPPORT_GEOMETRY` map for support).
- Legacy `Engine.FILTERS` getter still works (calls `getFilters()` without state) — backward-compatible for any first-render path that doesn't yet know state.
- New module-scoped `_SUPPORT_GEOMETRY` map is the single source of truth for support type + Z-gap. Both `getFilters` (for chip desc) and `resolveProfile` (for emitted `support_z_distance`) read from it. The hardcoded `support.id === 'easy' ? '0.30' : ...` ternary in `resolveProfile` was replaced with a lookup into this map, removing the drift vector.

### Web UI — dynamic chip desc refresh

`app.js`:
- `buildFilters()`, `restoreChipSelections()`, `updateCollapseBadges()` all now call `Engine.getFilters(state)` instead of `Engine.FILTERS`.
- New `updateDynamicChipDescs()` called from `render()` — patches chip-desc `.textContent` in place when state changes. Preserves selection + focus without a full DOM rebuild.

### iOS UI — same refresh pattern

`EngineService.getFilters(state:)` accepts an optional state dict; encodes it as JSON and calls `Engine.getFilters(…)` via the polyfill.
`GoalsView.loadFilters()` passes `appState.toJSDictionary()`; `.onChange(of: appState.printer)` + `.onChange(of: appState.nozzle)` handlers re-fetch so chip descs refresh on selection change.

### Guard tests — CI-enforced invariant

Two new XCTests in `EngineServiceTests.swift`:
- `testSurfaceChipDescsMatchResolveProfileEmission` — 7 printer/nozzle combos × 6 surface presets = 42 assertions. For each combo, parses the number out of the chip desc, resolves the profile, parses the number out of `profile.layer_height.value`, asserts equality.
- `testSupportChipDescsMatchResolveProfileEmission` — 3 support types verified against emitted `support_z_distance`.

**20/20 EngineServiceTests pass** (18 existing + 2 new IMPL-040 guards). These run on every push → CI catches any reintroduction of a hardcoded UI number that drifts from emission.

Also ran a one-shot preview-side matrix: 90 surface + 16 strength + 12 support = **118 combos, 0 mismatches.**

## What the user sees

- 0.4mm nozzle: `Draft — 0.28 mm layers` (unclamped) ✓
- 0.2mm nozzle: `Draft — 0.14 mm layers`, `Standard — 0.14 mm layers`, `Fine — 0.14 mm layers` (all clamped to 0.2mm × 0.70 = 0.14 max) ✓
- 0.6mm nozzle: `Ultra — 0.12 mm layers` (0.08 clamped UP to min 0.12 for 0.6mm) ✓
- 0.8mm nozzle: all presets unclamped ✓

Chip descs update live as the user clicks a different nozzle.

## Spec

Full write-up: [`docs/specs/IMPL-040-chip-desc-parity.md`](../specs/IMPL-040-chip-desc-parity.md)

## Files changed

### Web
- `engine.js` (+~70 lines) — `getFilters(state)` signature, dynamic prefix helpers, `_SUPPORT_GEOMETRY`, refactored `resolveProfile` support Z-gap.
- `data/rules/objective_profiles.json` — qualitative descs, `_meta` convention note.
- `app.js` — state-aware filter building + `updateDynamicChipDescs()`.
- `docs/specs/IMPL-040-chip-desc-parity.md` new
- `docs/sessions/2026-04-20-cowork-appdev-impl040.md` new (this file)
- `docs/planning/ROADMAP.md` — completion row.

### iOS
- `3DPrintAssistant/Engine/engine.js` — byte-identical web sync.
- `3DPrintAssistant/Data/rules/objective_profiles.json` — byte-identical web sync.
- `3DPrintAssistant/Engine/EngineService.swift` — new `state:` parameter on `getFilters`.
- `3DPrintAssistant/Views/Configurator/GoalsView.swift` — pass state + refresh on nozzle/printer change.
- `3DPrintAssistantTests/EngineServiceTests.swift` — 2 new guard tests.

## Standing rule (added to backlog/roadmap)

> Any field that embeds a numeric value in chip desc text must follow the IMPL-040 pattern:
> 1. Qualitative text in data file (no embedded numbers).
> 2. Numeric prefix generated by `getFilters(state)` from the same source `resolveProfile` reads.
> 3. Guard test added to `EngineServiceTests.swift`.

## Trust dependencies

- Web guard: preview-eval matrix (dev-time only) + the standing rule in [CLAUDE.md](../../CLAUDE.md) if the user wants me to add it there.
- iOS guard: XCTest runs on every CI push → any drift fails the TestFlight build immediately.
