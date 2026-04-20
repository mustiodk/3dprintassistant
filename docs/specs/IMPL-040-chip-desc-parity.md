# IMPL-040 — Chip desc / resolveProfile single source of truth

**Created:** 2026-04-20
**Status:** Shipped 2026-04-20.
**Trigger:** During IMPL-039 review the user noticed Surface Quality chips still showed hardcoded numbers (`Draft — 0.28mm layers`) even when the actual emitted layer height was going to be clamped to a lower value (e.g. 0.14mm for a 0.2mm nozzle). The IMPL-039 audit had fixed emitted profile *values* but missed UI chip *descriptions*.

---

## Principle

Any number shown in UI text that depends on state must be computed by the same function that emits it to the profile. Never store state-dependent numbers in static text. When a chip desc says "Draft — 0.28 mm layers", that "0.28" must come from the engine's clamping logic for the current printer+nozzle — not from a JSON field that was authored for a 0.4mm reference.

## Architectural change

### Before (drift-prone)

```
data/rules/objective_profiles.json:
  { "id": "draft", "desc": "0.30mm layers — fast prints...", "layer_height": 0.30 }

engine.js resolveProfile:
  p.layer_height = clamp(surface.layer_height, printer_limits)
```

Two independent number sources for the same concept. UI desc had its own `0.30mm` string; engine emitted a clamped (maybe different) value. Nothing enforced parity.

### After (single source of truth)

```
data/rules/objective_profiles.json:
  { "id": "draft", "desc": "Fast prints...", "layer_height": 0.28 }   ← qualitative desc, numeric field

engine.js getFilters(state):
  // Computes effective layer height from the SAME clamping logic resolveProfile uses,
  // then generates the chip desc as: `${effective_lh} mm layers — ${qualitative_desc}`
  surfaceDesc(s) = `${clamp(s.layer_height, limits)} mm layers — ${s.desc}`

engine.js resolveProfile:
  p.layer_height = clamp(surface.layer_height, limits)  // same clamp call
```

Both the UI chip and the emitted profile go through the same clamp. They **cannot** drift.

## Scope covered

| Filter | Before | After |
|--------|--------|-------|
| `surface` (layer height) | Hardcoded `"0.30mm layers — ..."` in JSON desc | Qualitative desc + numeric computed from `_clampNum(layer_height, printer_limits)` |
| `strength` (walls · infill) | Hardcoded `"2 walls · 8% — ..."` in JSON desc | Qualitative desc + numeric computed from `wall_loops` + `infill_density` fields |
| `support` (Z-gap) | Hardcoded `"Tree · Z 0.30 mm — ..."` in engine.js static array | Qualitative desc + numeric computed from new `_SUPPORT_GEOMETRY` module map |

`_SUPPORT_GEOMETRY` is now the single source for the Z-gap per support type. Both the chip desc (via `getFilters`) and the emitted `support_z_distance` (via `resolveProfile`) read from it. Changing a value in this map updates both call sites atomically.

## Guard tests (permanent, runs in CI)

### Web (dev-time only, run in preview eval)

Matrix of 90 surface combos (5 printers × 4–5 nozzles × 6 surface presets) + 16 strength + 12 support combos. Asserts `parseFloat(chip.desc)` equals `parseFloat(resolveProfile.value)` for every combo. **118/118 passed on first run.**

### iOS (runs on every CI build)

Two new XCTests in `EngineServiceTests.swift`:
- `testSurfaceChipDescsMatchResolveProfileEmission` — 7 printer/nozzle combos × 6 surface presets = 42 assertions
- `testSupportChipDescsMatchResolveProfileEmission` — 3 support types

If anyone reintroduces a hardcoded number that drifts from the engine's emission, these tests fail on the next push. That's the structural guarantee the user asked for.

## API additions

```js
// engine.js (new signature — backward compatible)
Engine.getFilters(state?)          // When state given, chip descs embed
                                    // computed numbers for that state.
                                    // When omitted, descs show default values.

Engine.FILTERS                      // Legacy getter — calls getFilters().
                                    // Still works for any caller that
                                    // doesn't need state-aware descs.
```

```swift
// iOS EngineService.swift (new parameter — backward compatible)
func getFilters(state: [String: Any]? = nil) throws -> [FilterGroup]
```

## Wiring

- **Web (`app.js`)**: `buildFilters()`, `restoreChipSelections()`, `updateCollapseBadges()` all pass `state` to `Engine.getFilters(state)`. Added `updateDynamicChipDescs()` called from `render()` that patches chip-desc text spans in place when state changes — preserves selection + focus without a full rebuild.
- **iOS (`GoalsView.swift`)**: `loadFilters()` passes `appState.toJSDictionary()`; added `.onChange(of: appState.printer)` and `.onChange(of: appState.nozzle)` handlers that re-fetch filters so chip descs refresh on selection change.

## What the user now sees

Picking a 0.2mm nozzle:
```
SURFACE QUALITY
 ┌────────────────────────────────────────────┐
 │ Draft                                      │
 │ 0.14 mm layers — Fast prints, visible      │   ← chip desc reflects clamp
 │ layer lines. Good for prototypes.          │
 └────────────────────────────────────────────┘
 ┌────────────────────────────────────────────┐
 │ Standard                                   │
 │ 0.14 mm layers — Balanced speed and        │   ← same number: 0.20 also
 │ quality for everyday prints.               │      clamps to 0.14 on 0.2mm
 └────────────────────────────────────────────┘
```

Switching to a 0.4mm nozzle: the chip descs update in place to show the unclamped values (`0.28 mm layers`, `0.20 mm layers`, etc).

## Out of scope for this ticket (preserved as standing rule)

The principle — "numbers in UI come from the same source that emits them" — now applies to any future state-dependent field added to the configurator. If someone adds, say, a Retraction Length chip desc showing a specific mm value, the same pattern must be followed: qualitative desc in data, numeric prefix generated by the engine from the source of truth that `resolveProfile` reads.

The iOS guard tests should be extended to cover any new field that embeds numbers in chip descs. The test helper pattern is established; adding a new field is ~20 lines.
