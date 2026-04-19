# IMPL-039 — Printer-capability clamping + slicer-aware values

**Created:** 2026-04-19
**Status:** Specification. Not yet implemented.
**Trigger:** 0.30 → 0.28mm Draft layer-height bug (fixed in web `e734d0d`, iOS `ad5c7da`) exposed a structural gap: we emit many hardcoded values that don't cross-check against the target printer's actual slicer limits or the target slicer's accepted value set.

---

## Scope

Every field the configurator emits for a profile is effectively a *request*. Each slicer (Bambu Studio, PrusaSlicer, OrcaSlicer) has its own printer-level + preset-level limits. A value that's fine in Orca can be rejected by Bambu. Today we don't ask the target's opinion; we just emit.

This spec inventories every known or suspected mismatch and proposes one data+engine refactor that removes all of them with a single mechanism.

## Verified risks (ground truth: vendor preset JSONs in `bambu configs/`)

### HIGH — silent wrong value on import

| # | Field | Current behavior | Real Bambu value | Why it breaks |
|---|-------|-----------------|------------------|---------------|
| H1 | `support_interface_pattern` | Engine emits `"Grid"` / `"Rectilinear"`. Bambu export (engine.js:1924) maps `rectilinear → rectilinear`. | Bambu's vendor presets use `"rectilinear_interlaced"` — `rectilinear` alone is not a valid Bambu value for this field | Bambu Studio import either rejects the value or silently falls back to default, and user's support interface pattern choice is lost |
| H2 | `initial_layer_height` | Hardcoded `"0.20 mm"` for every nozzle (engine.js:1214) | Bambu's real `initial_layer_print_height` values: `"0.16"` (fine), `"0.28"` (draft). Must be ≤ `max_layer_height` for the nozzle | On a 0.2mm nozzle setup (max_layer_height ≈ 0.14), `0.20` exceeds the ceiling → "layer height exceeds limit" import error, same class as the 0.30 bug |

### MEDIUM — silent quality or performance loss

| # | Field | Current behavior | Issue | Who's affected |
|---|-------|-----------------|-------|----------------|
| M1 | `sparse_infill_pattern` = `"Cross Hatch"` (objective_profiles.json) for `minimal` strength | Bambu export maps `cross hatch → crosshatch` ✓. Prusa has no equivalent — UI-read users copying the name into PrusaSlicer get "unknown pattern" | Prusa users on Minimal strength |
| M2 | Material-specific speed caps hardcoded: ABS 60/100, PC 40/60, PA 50/80 (engine.js:1315–1329) | Caps ignore `printer.max_speed`. Creality K2 Plus (max_speed 600) prints ABS at 60 when it can comfortably do 200+. Core-XY users routinely lose 50-70% speed potential | High-speed printer owners: K2 Plus, H2D, Voron, etc. |
| M3 | Line widths `nozzle × 1.05` (outer), `× 1.10` (inner) (engine.js:1217) | Fine for all 0.4mm-class use. Small nozzles (0.2mm): emits `0.21 / 0.22` — some printers reject `<0.3` line widths. Large nozzles (0.8mm): emits `0.84 / 0.88` — well below capability, prints slower than needed | 0.2mm + 0.8mm nozzle users, edge cases |
| M4 | `retraction_distance` pulled from `material.base_settings.retraction_distance` (engine.js:1519) | Material-only. No scaling for nozzle size or extruder type (direct-drive vs bowden). 0.6mm retraction is fine for 0.4mm direct-drive, wrong for 0.2mm (too much, grinds) or 0.8mm (too little) | 0.2mm + 0.8mm nozzle users, bowden users |
| M5 | `max_volumetric_speed` read from material per-nozzle (engine.js resolves via `max_mvs[nozzleSize]`) | Good — this one IS per-nozzle. But no cross-check against `printer.max_speed * layer_height * line_width` — some printers are motion-limited below what the material can flow | Rare; only if printer firmware caps feed rate below material MVS |

### LOW — edge or aesthetic

| # | Field | Note |
|---|-------|------|
| L1 | Wall generator "Arachne" | Fine — Bambu, Orca, AND PrusaSlicer 2.6+ all support Arachne. Agent flag was false. |
| L2 | `support_z_distance` 0.30mm for "Easy" | Fine — Bambu vendor presets use `"0.3"` as `support_top_z_distance`. Not constrained by `max_layer_height`. Agent flag was false. |
| L3 | Beginner-mode 0.8× speed reduction | Conservative multiplier on top of already-conservative caps. Harmless. |
| L4 | `internal_solid_infill_pattern` `"Auto (Rectilinear)"` → `"zig-zag"` on Bambu export | Bambu-correct. Only risk is Prusa users reading the UI value and typing it in — same class as M1. |

---

## Proposed refactor: `printer.limits` schema + engine `clampEmit()` helper

### 1. Data: add `limits` to every printer in `data/printers.json`

Source of truth: vendor preset JSONs. Bambu samples already live in `bambu configs/` — we can parse `max_layer_height`, `min_layer_height`, `max_print_speed`, `printable_area` from the printer `.json` files in this repo. For Prusa/Orca we read the respective vendor preset repos on GitHub (one-time extraction).

```json
{
  "printers": [
    {
      "id": "x1c",
      "name": "X1 Carbon",
      "manufacturer": "bambu_lab",
      "type": "corexy",
      "max_speed": 500,
      "max_accel": 20000,
      "limits": {
        "nozzles": {
          "0.2": { "max_layer_height": 0.14, "min_layer_height": 0.04, "max_line_width": 0.4 },
          "0.4": { "max_layer_height": 0.28, "min_layer_height": 0.08, "max_line_width": 0.8 },
          "0.6": { "max_layer_height": 0.42, "min_layer_height": 0.12, "max_line_width": 1.2 },
          "0.8": { "max_layer_height": 0.56, "min_layer_height": 0.16, "max_line_width": 1.6 }
        },
        "motion": {
          "max_outer_wall_speed": 200,
          "max_inner_wall_speed": 300,
          "max_travel_speed": 500
        }
      }
    }
  ]
}
```

This is ~64 printers × ~4 nozzle entries = ~250 rows. Most have a common profile (Bambu family shares the same numbers per nozzle). A small CSV import script cuts the effort to ~1 hour of data work.

### 2. Engine: `clampEmit(value, limit, fieldId, reason, warnings)`

One helper, three call patterns:

```js
function clampEmit(value, limit, fieldId, reason, warnings) {
  // Returns the clamped value. Emits a structured warning when a clamp fires.
  if (!limit || typeof value !== 'number') return value;
  const max = limit.max;
  const min = limit.min;
  if (max != null && value > max + 1e-6) {
    warnings.push(w(`${fieldId}_clamped`,
      `${fieldId.replace(/_/g, ' ')} capped for ${reason}.`,
      `Requested ${value.toFixed(2)}, reduced to ${max.toFixed(2)} — the maximum accepted by your printer for this setup.`));
    return max;
  }
  if (min != null && value < min - 1e-6) {
    warnings.push(w(`${fieldId}_min`,
      `${fieldId.replace(/_/g, ' ')} raised to printer minimum.`,
      `Requested ${value.toFixed(2)}, raised to ${min.toFixed(2)}.`));
    return min;
  }
  return value;
}
```

Call sites (each replaces an existing hardcoded `Math.min` or threshold):
- Draft layer-height emit → `clampEmit(surface.layer_height, printerLimits.nozzles[nz].max_layer_height...)`
- Initial layer height → same
- Outer/inner wall speed per material → against `printerLimits.motion.max_outer_wall_speed`
- Line widths → against `max_line_width`
- Retraction → resolved via material + nozzle + extruder table (see §3 below)

### 3. Data: `material.retraction` becomes nozzle × extruder-type matrix

```json
{
  "id": "pla_basic",
  "base_settings": { /* ... */ },
  "retraction": {
    "direct_drive": { "0.2": 0.3, "0.4": 0.6, "0.6": 0.7, "0.8": 0.8 },
    "bowden":       { "0.2": 1.0, "0.4": 1.5, "0.6": 1.7, "0.8": 2.0 }
  }
}
```

Engine resolves via `material.retraction[extruderType][nozzleSize]` with fallback to the current single `base_settings.retraction_distance` if the matrix is missing. Backwards compatible.

### 4. Slicer-aware pattern + option mapping

New data file: `data/rules/slicer_capabilities.json`

```json
{
  "bambu_studio": {
    "sparse_infill_patterns":     ["gyroid", "grid", "line", "crosshatch", "lightning", "zig-zag", "honeycomb"],
    "support_interface_patterns": ["rectilinear_interlaced", "grid", "auto"],
    "wall_generators":            ["classic", "arachne"]
  },
  "prusaslicer": {
    "sparse_infill_patterns":     ["rectilinear", "grid", "gyroid", "honeycomb", "3d_honeycomb", "concentric"],
    "support_interface_patterns": ["rectilinear", "concentric"],
    "wall_generators":            ["classic", "arachne"]
  },
  "orcaslicer": {
    "sparse_infill_patterns":     ["gyroid", "grid", "line", "crosshatch", "lightning", "zig-zag", "honeycomb"],
    "support_interface_patterns": ["rectilinear_interlaced", "rectilinear", "grid", "auto"],
    "wall_generators":            ["classic", "arachne"]
  }
}
```

Engine helper `mapForSlicer(value, field, slicer)` normalizes values at the export boundary. Also drives validation: "Cross Hatch" for Prusa → auto-substitutes to `rectilinear` with a warning.

### 5. Export-path integration

`exportBambuStudioJSON()` (engine.js:~1880–1930) and the text-copy export path both go through `mapForSlicer()` before writing the final JSON/text. Any value without a valid mapping triggers a warning with a human-readable fallback.

---

## Web-vs-iOS execution plan

The engine is shared. **Both platforms fix in one pass:**

| Step | Web | iOS |
|------|-----|-----|
| 1. Collect vendor limits into `printers.json` `limits` block | **Edit** (source of truth) | Inherits via sync |
| 2. Implement `clampEmit()` + `mapForSlicer()` in `engine.js` | **Edit** | Inherits via sync |
| 3. Replace hardcoded call-sites in `resolveProfile()` | **Edit** | Inherits via sync |
| 4. Add new warning strings to `locales/en.json` + `da.json` (`*_clamped`, `unsupported_pattern`) | **Edit** | Inherits via sync |
| 5. Add `data/rules/slicer_capabilities.json` + register in iOS `EngineService.swift` fetch list | Edit + register in web init | Add file path to `EngineService.buildFetchData()` alongside other data files |
| 6. Verify web in preview, run iOS test suite, spot-check exported Bambu JSON against vendor configs | ✓ | ✓ |
| 7. Deploy: web auto-deploys on push; iOS commits local, user opts into the TestFlight push | ✓ | Held for release-cut signal |

The only iOS-side code change is step 5 — one `("data/rules/slicer_capabilities.json", "slicer_capabilities", "json", nil)` tuple in the fetch list. Everything else is pure sync.

## Fix order (independent → dependent)

1. **H2 — initial_layer_height** (standalone, 1 data+engine edit, 20 min).
2. **H1 — support_interface_pattern** (engine export mapping fix, 15 min).
3. **Data schema: `printers.json` `limits` block** (1 h data entry).
4. **`clampEmit()` helper + layer height / line width / speed call-sites** (2 h engine work).
5. **M4 — retraction matrix** (30 min data + 15 min engine).
6. **`slicer_capabilities.json` + `mapForSlicer()`** (1 h).
7. **Replace all existing hardcoded pattern names with slicer-aware lookups** (1 h).
8. **iOS sync + build + test pass** (30 min).

Total: ~7 h focused work. One session.

## Verification matrix

Every fix must pass all of:
- Existing unit tests (iOS `EngineServiceTests`).
- Preview test: build a profile for each of 5 canonical printer+nozzle+material combos, confirm no "undefined" warnings, confirm all emitted values fall inside `printers.json` limits for that combo.
- Export test: `exportBambuStudioJSON()` output imports cleanly into Bambu Studio 1.9+ with zero pop-ups for each canonical combo.
- Cross-slicer spot-check: for the same state, verify UI-displayed values on Prusa and Orca-targeted printers use patterns the respective slicer accepts.

Canonical combos for the matrix:
| Printer | Nozzle | Material | Reason |
|---------|--------|----------|--------|
| X1C | 0.4mm | PETG HF | Original reported bug |
| X1C | 0.2mm | PLA Basic | Small-nozzle layer-height ceiling |
| H2D | 0.6mm | PA-CF | High-temp + abrasive + high-speed |
| MK4 | 0.4mm | PLA Basic | Prusa path |
| K2 Plus | 0.4mm | ABS | Creality + non-Bambu slicer |

## Out of scope for this ticket

- Adding new printers or nozzles. That's regular data-entry work.
- UI changes to how warnings render. The existing RB-1 structured warning pipeline handles the new clamp warnings without any frontend change.
- Retraction tuning for advanced extruder types beyond "direct_drive" / "bowden" (e.g. tool-changer).
