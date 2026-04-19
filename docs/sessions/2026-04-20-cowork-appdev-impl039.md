# Session: 2026-04-20 — Cowork App Dev — IMPL-039 execution

**Type:** Engine + data refactor. Autonomous overnight session (user asleep, explicit "execute + push both" sign-off).
**Scope:** Full implementation of [IMPL-039 printer-capability clamping + slicer-aware values](../specs/IMPL-039-preset-clamping.md). Web + iOS in parallel, production-ready.

---

## Summary

Yesterday's 0.30→0.28 Draft layer-height bug surfaced a structural gap: the engine emitted many hardcoded values that didn't cross-check against the target printer's real slicer limits or the target slicer's valid value set. This session implements the full fix per the spec: every emitted value now goes through a printer-aware clamp and a slicer-aware pattern substitution.

## Engine architecture changes

### New module-level helpers (`engine.js`)

| Helper | Purpose |
|--------|---------|
| `getPrinterLimits(printer, nozzleSize)` | Returns `{ max_layer_height, min_layer_height, max_line_width, max_outer_wall_speed, max_inner_wall_speed, max_travel_speed }` derived from formula (nozzle × 0.70 / 0.20 / 2.00 + `printer.max_speed` × 0.40/0.60). Optional `printer.limits_override` field can shadow any value per-printer. |
| `_clampNum(value, min, max)` | Pure value clamp with 1e-6 floating-point epsilon. Returns the original if within range, else clamped. |
| `mapForSlicer(value, field, slicer)` | Slicer-aware pattern substitution via `data/rules/slicer_capabilities.json`. Loose-matches (strips whitespace/underscores/dashes) so UI names ("Cross Hatch") harmonize with vendor names ("crosshatch"). Falls back to explicit substitution or first-valid-value when the pattern isn't in the slicer's set. |

### New data file: `data/rules/slicer_capabilities.json`

Per-slicer (Bambu / Prusa / Orca) canonical value sets for: `sparse_infill_pattern`, `top_surface_pattern`, `bottom_surface_pattern`, `internal_solid_infill_pattern`, `support_interface_pattern`, `wall_generator`, `seam_position`. Plus an explicit `fallbacks` map for known cross-slicer translations (e.g. "Cross Hatch" → Prusa "Rectilinear"; "Back" → Prusa "Rear").

Loaded in `engine.init()` alongside other data files; registered in iOS `EngineService.buildFetchData()` file list and in `project.yml` resources + regenerated into `project.pbxproj` via `xcodegen`.

### `resolveProfile()` call-site changes

Inline clamping + slicer-aware emission at every touched field:

- **`layer_height`** — clamped to `[limits.min_layer_height, limits.max_layer_height]`
- **`initial_layer_height`** — nozzle-scaled (`max(0.12, min(nozzleSize × 0.5, 0.32))`), then clamped against printer max
- **`outer_wall_line_width` + `inner_wall_line_width` + `top_surface_line_width`** — clamped to `limits.max_line_width`
- **`outer_wall_speed` + `inner_wall_speed`** — final clamp after material caps + beginner mode
- **`sparse_infill_pattern` / `internal_solid_infill_pattern` / `top_surface_pattern` / `bottom_surface_pattern` / `support_interface_pattern`** — routed through `patternFor()` so Prusa users never see Bambu-only pattern names
- **`seam_position`** — routed through `patternFor()` so Prusa users see "Rear" not "Back", all users see "Nearest" not "Sharpest corner" when the target slicer uses that canonical form

### Retraction system upgrade

Previously: material `retraction_distance` was used as-is for all nozzles, with a separate Bowden multiplier conditional on `state.extruder_type === 'bowden'` (user-selected filter only).

Now: retraction scales by `sqrt(nozzleSize / 0.4)` so small nozzles retract less (less melt in the path) and large nozzles retract more. Bowden multiplier (1.5× flexible / 3.5× rigid) is **auto-detected** from `printer.extruder_type` when the user hasn't set an explicit override. Final value still clamped to `material.retraction_max`.

Behavior table for PLA Basic (base 0.6mm):

| Nozzle | Extruder | Output | Rationale |
|--------|----------|--------|-----------|
| 0.4mm | direct-drive | 0.6 mm | Reference value unchanged |
| 0.2mm | direct-drive | 0.4 mm | Less melt in a 0.2mm nozzle — less retraction needed |
| 0.6mm | direct-drive | 0.7 mm | √1.5 × 0.6 ≈ 0.73, rounded |
| 0.8mm | direct-drive | 0.8 mm | √2 × 0.6 ≈ 0.85, capped at retraction_max |
| 0.4mm | bowden (MINI+ auto) | 2.0 mm | 0.6 × 3.5 = 2.1, capped at retraction_max |

### Bambu export parity

Verified against `bambu configs/*.json` vendor-saved presets:

| Field | Our output | Vendor preset |
|-------|-----------|---------------|
| `layer_height` | `"0.28"` | `"0.28"` ✓ |
| `sparse_infill_pattern` | `"crosshatch"` | `"crosshatch"` ✓ |
| `internal_solid_infill_pattern` | `"zig-zag"` | `"zig-zag"` ✓ |
| `support_interface_pattern` | `"rectilinear_interlaced"` (was `"rectilinear"`) | `"rectilinear_interlaced"` ✓ **H1 fix** |
| `seam_position` | `"nearest"` | `"nearest"` ✓ |
| `top_surface_pattern` | `"monotonic"` | `"monotonic"` ✓ |
| `wall_generator` | `"classic"` | `"classic"` ✓ |

### New warnings (C5, C6 in `getWarnings()`)

| id | Fires when |
|----|-----------|
| `layer_height_clamped` | User's surface preset layer_height exceeds printer-nozzle max_layer_height (e.g. 0.2mm nozzle + Standard 0.20mm → capped to 0.14mm with notice) |
| `outer_wall_speed_clamped` | Base speed from speed preset exceeds printer's motion ceiling (e.g. Ender 3 V3 SE at max_speed=250 + Fast preset inner=200 on bedslinger) |
| `pattern_substituted_sparse_infill_pattern` | Prusa users on Minimal strength: "Cross Hatch" → "Rectilinear" (with notice) |
| `pattern_substituted_support_interface_pattern` | Prusa users on Easy/Balanced support: pattern substituted |

C3 (layer height too tall) removed — superseded by C5 which says "engine clamped it to X" rather than asking user to change selection.

## Verification matrix

Tested via preview-engine eval across 5 canonical combos + 4 edge cases:

| Combo | Expected | Actual | ✓ |
|-------|----------|--------|---|
| X1C + 0.4mm + PETG HF + Draft (original 0.30 bug) | layer=0.28, no errors | layer=0.28, no errors | ✓ |
| X1C + 0.2mm + PLA Basic + Standard | layer clamped to 0.14, clamp warning fires | 0.14, `layer_height_clamped` | ✓ |
| H2D + 0.6mm + PA + Fine | layer=0.15, bambu export valid | 0.15, valid | ✓ |
| MK4 + 0.4mm + PLA Basic (Prusa) | `Cross Hatch` → `Rectilinear` | substitution fires | ✓ |
| K2 Plus + 0.4mm + ABS (Orca) | No crash, no undefined | Clean render | ✓ |
| P1S + 0.8mm + PLA Draft | layer=0.28 (< 0.56 max), widths 0.84/0.88 | ✓ | ✓ |
| MINI+ (bowden auto) | retraction 2.0 mm, bowden warning fires | ✓ | ✓ |
| X1C + explicit bowden override | retraction 2.0 mm (user override wins) | ✓ | ✓ |
| X1C + TPU 95A + bowden | retraction 1.2 mm (flexible retraction_max cap) | ✓ | ✓ |

## iOS sync

- `engine.js` + `data/rules/slicer_capabilities.json` copied byte-identical from web
- `EngineService.buildFetchData()` registers new file in the fetch polyfill
- `project.yml` resource path added; `project.pbxproj` regenerated via `xcodegen generate`
- iOS build verified: `xcodebuild build` succeeds, slicer_capabilities.json confirmed in `.app` bundle at `build/Build/Products/Debug-iphonesimulator/3DPrintAssistant.app/slicer_capabilities.json`

## Files changed

### Web (`3dprintassistant/`)
- `engine.js` +247 / -63 — helpers, clamping, patternFor, retraction, warnings, seam export fix
- `data/rules/slicer_capabilities.json` **new** — 60 lines
- `docs/sessions/2026-04-20-cowork-appdev-impl039.md` **new** — this file
- `docs/planning/ROADMAP.md` — status + #039 completion

### iOS (`3dprintassistant-ios/`)
- `3DPrintAssistant/Engine/engine.js` — byte-identical web sync
- `3DPrintAssistant/Data/rules/slicer_capabilities.json` **new**
- `3DPrintAssistant/Engine/EngineService.swift` — one tuple in fetch list
- `project.yml` — one resource path
- `3DPrintAssistant.xcodeproj/project.pbxproj` — regenerated (4 lines added)

## Not done in this session (rolled back / deferred)

- **Material-level speed caps refactor (M2 risk)** — ABS/PC/PA hardcoded caps (60/40/50) still don't scale with `printer.max_speed`. K2 Plus (max_speed 600) still emits 60 for ABS. The new printer-limit clamp doesn't bite here because material caps are lower. Fixing this properly requires a separate material × printer-class table and is a distinct concern from #039's "clamp to printer capability". Left for a future session with explicit scope.
- **Per-printer `limits_override` blocks** — the schema exists (`printer.limits_override`), and no printer needs a manual override today since the formula matches vendor defaults. Add as needed when a printer's firmware deviates.

## Risk assessment before push

- **Blast radius:** web auto-deploys to Cloudflare on push; iOS push triggers TestFlight. User explicitly signed off on both.
- **Rollback plan:** web is revertable by `git revert <sha>`. iOS rollback is App Store Connect "expire build" if a released build turns out broken (TestFlight only, not production).
- **Test coverage:** engine-level tests via preview eval (9 combos passed); iOS build compiles; Bambu export byte-verified against vendor preset format.
- **Known limitations documented above under "not done".**
