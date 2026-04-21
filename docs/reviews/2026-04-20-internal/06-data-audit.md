# Data audit

Scope: all 8 data files + 2 locale files verified byte-identical web↔iOS.
Reviewed commits: web `c4c5071`, iOS `24aef66`.

## Summary

**No CRITICAL/dangerous data values found.** All 18 material temp/bed ranges are within industry-safe norms. Schema is consistent. A handful of MEDIUM items (captured in [03-medium.md](03-medium.md)) and a few LOW nits ([04-low.md](04-low.md)). Three slicer-capability corrections worth making.

## Top-10 printers × key fields

| Printer | manufacturer | max_speed | max_accel | max_noz_t | max_bed_t | Verdict | Notes |
|---|---|---|---|---|---|---|---|
| Bambu X1 Carbon | bambu_lab | 500 | 20000 | 300 | 120 | ✓ | Matches Bambu spec |
| Bambu P1S | bambu_lab | 500 | 20000 | 300 | 120 | ✓ | |
| Bambu A1 | bambu_lab | 500 | 10000 | 300 | 100 | ✓ | |
| Bambu A1 mini | bambu_lab | 500 | 10000 | 300 | **100** | **?** | Bambu product page lists bed max as 80°C. PETG `bed_temp_max=85` would be above the real hardware limit. Verify. |
| Prusa MK4 | prusa | 200 | 8000 | 290 | 120 | ✓ | Firmware cap correct |
| Prusa MK4S | prusa | 200 | 8000 | 290 | 120 | ✓ | |
| Prusa CORE One | prusa | 500 | 20000 | 290 | 120 | ✓ | |
| Creality K1 | creality | 600 | 20000 | 300 | 100 | ✓ | `available_nozzle_sizes: [0.4, 0.6]` is conservative — Unicorn 0.2/0.8 also sold. |
| Creality K1 Max | creality | 600 | 20000 | 300 | 100 | ✓ | Same nozzle-set comment as K1 |
| Creality Ender-3 V3 SE | creality | 250 | 5000 | 260 | 100 | ✓ | Tight firmware cap — confirm formula-clamped output doesn't under-utilise |
| Voron 2.4 | voron | 500 | 20000 | 300 | 120 | ✓ | Conservative; kit builds regularly exceed these |

## Material temperature ranges

| Material | Nozzle range | Bed range | Verdict |
|---|---|---|---|
| PLA Basic | 190–230 (base 220) | 35–65 (base 55) | ✓ Industry-normal |
| PLA Matte | 190–230 | 35–65 | ✓ |
| PLA Silk | 210–235 | 35–65 | ✓ (silk pigments correctly bumped) |
| PLA-CF | 210–240 | 35–65 | ✓ |
| PETG Basic | 230–270 (base 260) | 60–85 (base 75) | ✓ |
| PETG HF | 230–260 (base 245) | 65–75 (base 70) | ✓ |
| PETG-CF | 240–270 | 60–85 | ✓ |
| ABS | 240–270 (base 260) | 90–110 (base 100) | ✓ |
| ASA | 240–270 | 90–110 | ✓ |
| TPU 95A / 90A / 85A | 220–250 / 220–245 / 220–240 | 35–60 / 30–50 / 30–45 | ✓ progressive bed cooling for softer grades |
| PVA | 190–210 | 35–55 | ✓ |
| PA (Nylon) | 240–270 (base 250) | 70–90 (base 80) | ✓ safe; drying temp slightly low (OBS) |
| PA-CF | 250–280 (base 260) | 70–90 | ✓ |
| PET-CF | 250–275 | 70–90 | ✓ |
| PC | 270–300 (base 280) | 100–120 (base 110) | ✓ |
| HIPS | 220–245 | 80–100 | ✓ |

**No CRITICAL/HIGH temperature findings.** All material ranges are within safe industry norms.

## Slicer capability audit — `data/rules/slicer_capabilities.json`

### Bambu Studio

| Pattern/category | Listed? | Verdict |
|---|---|---|
| gyroid / grid / line / crosshatch / lightning / zig-zag / honeycomb / cubic / 3dhoneycomb / concentric | ✓ | ✓ |
| **adaptive cubic** | ✗ | **MEDIUM-016** — Bambu Studio supports Adaptive Cubic; missing from list |
| top_surface_patterns (monotonic, monotonicline, rectilinear, concentric) | ✓ | ✓ |
| support_interface_patterns (rectilinear_interlaced, rectilinear, concentric, grid, auto) | ✓ | ✓ |
| wall_generators (classic, arachne) | ✓ | ✓ |
| seam_positions (aligned, nearest, back, random) | ✓ | ✓ |

### PrusaSlicer

| Pattern/category | Listed? | Verdict |
|---|---|---|
| rectilinear / monotoniclines / honeycomb / 3dhoneycomb / gyroid / triangles / stars / cubic / grid / concentric | ✓ | ✓ |
| **lightning** | ✗ | **MEDIUM-015** — PrusaSlicer has lightning since 2.6; currently falls back to rectilinear |
| crosshatch / line / zig-zag | ✗ | ✓ correct omission (Prusa really doesn't support these) |
| seam_positions (aligned, nearest, rear, random) | ✓ | ✓ ("rear" is Prusa's term for "back") |

### OrcaSlicer

| Pattern/category | Listed? | Verdict |
|---|---|---|
| gyroid / grid / line / crosshatch / lightning / zig-zag / honeycomb / cubic / 3dhoneycomb / concentric / rectilinear | ✓ | ✓ |
| **adaptive cubic** | ✗ | **MEDIUM-016** — Orca supports Adaptive Cubic; missing from list |

### Fallback map

| Source → Prusa | Verdict |
|---|---|
| crosshatch → rectilinear (sparse_infill) | ? Semantically weak. Prusa `triangles` or `cubic` preserves interlocking better. LOW — document as "loss-of-fidelity". |
| zig-zag → rectilinear | ✓ |
| line → rectilinear | ✓ |
| lightning → rectilinear | ✗ — remove once Prusa lightning is added to the valid set (MEDIUM-015) |
| monotonic → rectilinear (Bambu, internal_solid) | ✓ |
| rectilinear_interlaced → rectilinear (Prusa, support_interface) | ✓ |
| grid → rectilinear (Prusa, support_interface) | ✓ |
| sharpest corner → nearest (all, seam) | ✓ |
| back → rear (Prusa, seam) | ✓ |

## Schema health

### `printers.json` (64 entries)

- ✅ All required fields present on every entry.
- ⚠️ `limits_override` completely absent from dataset — see [OBS-001](05-observations.md).
- ⚠️ `series` values inconsistent in edge cases (Ender-3 V3 marked `corexy`; actually CoreXZ — acceptable since kinematics are fixed-bed like CoreXY, but worth documenting).
- ✅ No duplicate IDs, consistent snake_case.
- ✅ `max_chamber_temp` only on `active_chamber_heating: true` printers — consistent.

### `materials.json` (18 entries)

- ✅ All have full `base_settings` blocks.
- ⚠️ `retraction_length` + `retraction_distance` dual-name — [LOW-003](04-low.md).
- ⚠️ `max_mvs` key coverage inconsistent vs `k_factor_matrix` — [MEDIUM-019](03-medium.md).
- ⚠️ `flexible` field duplicated (top-level + `properties.flexible`) — [LOW-006](04-low.md).
- ⚠️ `max_mvs` / `cooling_fan` are strings-with-units, not numbers. Display-only consumption works; arithmetic would break.
- ✅ All material IDs unique; consistent snake_case.
- ✅ Enclosure + ventilation flags correct for ABS/ASA/PC/HIPS.

### `nozzles.json` (9 entries)

- ⚠️ `not_suitable_for` references undefined materials (`abs_cf`, `pla_wood`, `pla_glow`) — [MEDIUM-018](03-medium.md).
- ⚠️ `prc_0.2` is the only Precision variant — [LOW-005](04-low.md).
- ✅ All required fields present.

### `rules/objective_profiles.json`

- ✅ All `desc` strings qualitative — IMPL-040 invariant holds. Scanned all 13 entries, no embedded numbers.
- ✅ All referenced infill patterns (`Grid`, `Cross Hatch`, `Gyroid`, etc.) resolve via `mapForSlicer`.

### `rules/environment.json`

- ✅ Schema complete.
- ⚠️ `vcold.ambient_temp_range: [-20, 5]` — lower bound unrealistic for indoor — [OBS-008](05-observations.md).

### `rules/warnings.json`

- ⚠️ `condition_warnings` block appears to be dead data (engine fires these warnings inline via `w()`) — [MEDIUM-017](03-medium.md).
- ✅ `material_warnings` consumed by engine.

### `rules/troubleshooter.json`

- ✅ All 9 symptoms have full schema (`id`, `name`, `icon`, `desc`, `causes[]`).
- ✅ Each cause has `rank`, `title`, `detail`, `setting`, `fix`, `materials`.
- ✅ No placeholder/lorem content. `materials` values align with `material.group` casing.

### Locale files

- ✅ `en.json` + `da.json` byte-identical web↔iOS.
- ➖ Danish coverage completeness not reviewed (out of scope per review brief).

## What we didn't verify

- Creality K-series `available_nozzle_sizes` against Creality's official Unicorn nozzle SKU list.
- Full PrusaSlicer capability set against Prusa's source (only spot-checked for lightning).
- Bambu P2S shipping status.
- Drying temps against OEM spec PDFs (Bambu/Polymaker) beyond industry norms.
