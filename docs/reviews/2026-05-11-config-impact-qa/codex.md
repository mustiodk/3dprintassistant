# Codex configuration-impact QA report

- **Deliverable:** `docs/reviews/2026-05-11-config-impact-qa/codex.md`
- **Version of record:** `ab979f47538d699ad996b6019bf86d69c5396f13`
- **Date:** 2026-05-11
- **Scope:** read-only QA sweep across configuration-option impact in web engine/data. Findings imply web source changes first and iOS byte-identical sync afterward.

## Baseline and process

Phase 0 baseline was green:

- `node scripts/validate-data.js` - PASS, all data files valid.
- `node scripts/walkthrough-harness.js` - PASS, 10 walkthrough combos clean; 17 known schema soft warnings for `max_mvs` key gaps; DQ-2 Safe/Tuned assertions passed.
- `node scripts/profile-matrix-audit.js` - PASS, 55/55 curated scenarios and 46,512 broad configurations, 0 failures/observations.

Constraints honored:

- Source files stayed read-only. I did not modify `engine.js`, `app.js`, `data/**`, scripts, tests, runbooks, ROADMAP, session logs, or NEXT-SESSION.
- Peer-agent independence was preserved. I did not read/list/grep/open files under `docs/reviews/2026-05-11-config-impact-qa/` other than this deliverable path. One reviewer from an earlier gate reported that `git status` surfaced only the existence of the review directory, not peer file names or content; I did not incorporate any peer content.
- No commits were made.

Phase review gates:

- Phase 0: two agents approved the baseline/tooling state.
- Phase 1: two agents approved the data-to-code audit and added several dead/partial-field candidates.
- Phase 2: two agents approved behavior sampling and added multicolor and special-filter checks.
- Phase 3: two agents approved not browsing external sources because the active candidates are internal dead-field/ignored-option issues, not suspicious emitted numeric magnitudes.
- Phase 4: two agents approved the interaction pass, with severity trims for `advanced`, `decorative`, `uv_resistant`, and environment/support.

## Findings

### [HIGH-01] Printer nozzle inventory is ignored

- **Surface:** `data/printers.json:540-542`, `data/printers.json:1074-1076`, `engine.js:431-432`, `engine.js:2317-2325`, `app.js:934`; option `printer x nozzle`.
- **What's wrong (one paragraph):** Printer entries define `available_nozzle_sizes`, but nozzle filtering and compatibility checks do not read the selected printer. The UI exposes every nozzle globally and `getCompatibleNozzles(materialId)` only checks material/nozzle compatibility plus material MVS support. As a result, printers whose data says they only ship/support `0.4` can still produce a profile for `std_0.8` with no printer-nozzle warning.
- **Evidence:**
  ```text
  data/printers.json:540-542  Ender-3 V3 SE multi_color_systems [], available_plates ["textured_pei"], available_nozzle_sizes [0.4]
  data/printers.json:1074-1076 Centauri Carbon multi_color_systems [], available_plates ["textured_pei"], available_nozzle_sizes [0.4]

  git grep -n "available_nozzle_sizes" -- engine.js app.js
  # no matches

  engine.js:431-432       nozzleChips = _nozzles.map(...)
  engine.js:2317-2325     getCompatibleNozzles(materialId) maps _nozzles using material rules only

  Phase 4 probe:
  ender3_v3_se + std_0.8 + PLA -> warnings []
  centauri_carbon + std_0.8 + PLA -> warnings ["pla_heat_creep"] only
  getCompatibleNozzles("pla_basic") -> std_0.8 compatible true
  ```
- **Suggested fix shape (1-3 sentences):** Thread the selected printer into nozzle filtering and compatibility checks. Filter or mark nozzles incompatible when `nozzle.size` is not in `printer.available_nozzle_sizes`, and add a warning/coercion path for already-selected invalid states.
- **Sources (if magnitude finding):** N/A - internal dead-field and behavior finding.
- **Risk if not fixed:** Users can be given settings for a nozzle their selected printer data says is unavailable, producing profiles they cannot apply or trust.
- **Touches iOS?:** yes.

### [HIGH-02] AMS Lite incompatibility is ignored

- **Surface:** `data/printers.json:127`, `data/materials.json:777-778`, `data/materials.json:1749-1750`, `engine.js:1469-1474`, `engine.js:2170-2179`, `engine.js:1310-1317`; option `printer x material x colors`.
- **What's wrong (one paragraph):** Material data distinguishes `ams_compatible` from `ams_lite_compatible`, and A-series printers declare `multi_color_systems: ["ams_lite"]`. Runtime multicolor checks only read `material.ams_compatible`, so materials that are AMS-compatible but not AMS-Lite-compatible, such as ABS and PA-CF, get multicolor output on A1/A1 Mini with no AMS Lite warning. The profile still enables a prime tower and the checklist still says to check the AMS path.
- **Evidence:**
  ```text
  data/printers.json:127        A1 multi_color_systems ["ams_lite"]
  data/materials.json:777-778   ABS ams_compatible true, ams_lite_compatible false
  data/materials.json:1749-1750 PA-CF ams_compatible true, ams_lite_compatible false

  git grep -n "ams_lite_compatible" -- engine.js app.js
  # no matches

  engine.js:1469-1474 only checks !material.ams_compatible

  Phase 4 probe:
  a1 + abs + colors=multi_2_4 -> prime_tower "Enabled"; warnings ["mat_abs_0","enclosure_required","printer_max_bed_temp_clamped","high_shrink_open"]
  a1 + pa_cf + hrd_0.6 + colors=multi_2_4 -> prime_tower "Enabled"; no AMS Lite warning
  ```
- **Suggested fix shape (1-3 sentences):** Add multicolor-system-aware material gating. When a printer uses `ams_lite`, check `material.ams_lite_compatible`; keep the existing `ams_compatible` check for full AMS-style systems, and make checklist/profile output avoid AMS-specific actions when the selected printer/material path is not valid.
- **Sources (if magnitude finding):** N/A - internal data/behavior finding.
- **Risk if not fixed:** A1/A1 Mini users can be told to run multicolor profiles through AMS Lite with materials the data already marks incompatible.
- **Touches iOS?:** yes.

### [HIGH-03] Printer and material build-plate data is ignored in favor of a static map

- **Surface:** `data/printers.json:541`, `data/printers.json:1075`, `data/materials.json:754-771`, `data/materials.json:1726-1743`, `engine.js:318-328`, `engine.js:505-512`, `engine.js:1650-1668`; option `printer x material x build_plate`.
- **What's wrong (one paragraph):** Printer data has `available_plates`, and material data has `compatible_plates[*].plate_id` plus `bed_temp_range`, but runtime plate behavior does not use those inventories. The UI offers a fixed global plate list, and warnings use the hardcoded `BUILD_PLATE_COMPAT` material-group map. Generic material plate warnings work for some cases, but printer-specific plate availability and material-specific `plate_id`/`bed_temp_range` do not affect output.
- **Evidence:**
  ```text
  data/printers.json:1075 Centauri Carbon available_plates ["textured_pei"]
  engine.js:505-512       build_plate filter offers smooth_pei, textured_pei, cool_plate, engineering_plate, glass, garolite for everyone
  engine.js:1650-1668     build plate warnings read BUILD_PLATE_COMPAT[material.group][state.build_plate]

  git grep -n "available_plates" -- engine.js app.js
  # no matches

  Phase 4 probe:
  centauri_carbon + PLA + build_plate=glass -> warnings ["pla_heat_creep"] only
  ABS + cool_plate -> warnings include "build_plate_avoid" from BUILD_PLATE_COMPAT
  ```
- **Suggested fix shape (1-3 sentences):** Split plate validation into printer availability and material compatibility. Use `printer.available_plates` to filter/warn impossible plate selections, then use material-specific `compatible_plates` where present before falling back to the generic group map.
- **Sources (if magnitude finding):** N/A - internal dead-field/partial-consumption finding.
- **Risk if not fixed:** Users can select plates their printer data does not support, while material-specific bed ranges in data never inform the recommendation.
- **Touches iOS?:** yes.

### [HIGH-04] Strength speed multipliers never affect emitted speeds

- **Surface:** `data/rules/objective_profiles.json:61-108`, `engine.js:1917-1973`, `engine.js:1975-2023`; option `strength x speed`.
- **What's wrong (one paragraph):** `strength_levels[*].speed_multiplier` exists and encodes that Strong/Maximum should be slower (`0.9` and `0.8`), but speed emission never reads that field. Strength changes walls, shells, infill density, and pattern; speed remains governed by speed preset, material caps, MVS, and printer limits. Stronger profiles therefore miss a data-backed speed slowdown.
- **Evidence:**
  ```text
  data/rules/objective_profiles.json:93  strong speed_multiplier 0.9
  data/rules/objective_profiles.json:107 maximum speed_multiplier 0.8

  git grep -n "speed_multiplier" -- engine.js app.js
  # no matches

  Phase 2 probe on X1C + PLA + balanced:
  strength=standard -> outer_wall_speed "100 mm/s", inner_wall_speed "200 mm/s"
  strength=strong   -> outer_wall_speed "100 mm/s", inner_wall_speed "200 mm/s"
  strength=maximum  -> outer_wall_speed "100 mm/s", inner_wall_speed "200 mm/s"
  ```
- **Suggested fix shape (1-3 sentences):** Apply the strength multiplier in the speed-calculation path after the base speed preset is chosen and before printer/material clamps are applied. Preserve existing material caps and MVS clamps as the final safety gates.
- **Sources (if magnitude finding):** N/A - internal dead-field finding.
- **Risk if not fixed:** Users selecting stronger parts get more walls and infill, but not the slower movement the data says should accompany those stronger profiles.
- **Touches iOS?:** yes.

### [HIGH-05] Environment options contain additional dead fields and misleading cold compensation text

- **Surface:** `data/rules/environment.json:23-33`, `data/rules/environment.json:41-52`, `engine.js:1127-1165`, `engine.js:1181-1229`, `engine.js:2073-2081`; option `environment`.
- **What's wrong (one paragraph):** The handover already identifies `bed_first_layer_adj` as a known HIGH dead field, so I am not re-filing that standalone bug. The same environment entries also define `fan_multiplier` and `force_draft_shield`, but those fields do not feed cooling, support, or warning logic. Cold warning text says "first layer bed +7C" even though both simple and advanced temperature paths consume `bed_adj`, not `bed_first_layer_adj`; in the PETG cold sample, the first-layer bed is elevated by PETG's material initial-layer offset, not by the environment field advertised in the warning.
- **Evidence:**
  ```text
  data/rules/environment.json:25-29 cold bed_first_layer_adj 7, fan_multiplier 0.9, force_draft_shield true
  data/rules/environment.json:32    warning says first layer bed +7C

  git grep -n "fan_multiplier" -- engine.js app.js
  # no matches
  git grep -n "force_draft_shield" -- engine.js app.js
  # no matches
  git grep -n "bed_first_layer_adj" -- engine.js app.js
  # no matches

  engine.js:1135-1136 simple temps read env.nozzle_adj and env.bed_adj
  engine.js:1191-1197 advanced temps read env.nozzle_adj and env.bed_adj
  engine.js:2077 initial layer speed reads env.first_layer_speed_multiplier

  Phase 4 probe:
  PLA cold -> bed "55 C", initial_layer_bed "55 C", warning says first layer bed +7C
  PETG cold -> bed "75 C", initial_layer_bed "85 C", warning says first layer bed +7C
  ```
- **Suggested fix shape (1-3 sentences):** Fold the known `bed_first_layer_adj` fix into the follow-up environment batch, and either wire or remove/rename `fan_multiplier` and `force_draft_shield`. Keep warning copy generated from the actual applied adjustment values so it cannot claim a compensation that is not emitted.
- **Sources (if magnitude finding):** N/A for this finding. The environment magnitude concern is a known starting fact in the handover and was not re-derived.
- **Risk if not fixed:** Users see environment warnings that overstate applied compensation, and cooling/draft-shield data silently has no effect.
- **Touches iOS?:** yes.

### [MEDIUM-01] Non-Creality printers with no multicolor system still get multicolor output

- **Surface:** `data/printers.json:1074`, `engine.js:1491-1505`, `engine.js:2170-2179`, `engine.js:1310-1317`; option `printer x colors`.
- **What's wrong (one paragraph):** `multi_color_systems: []` is only turned into a no-system warning for Creality printers. Non-Creality printers with no multicolor system, such as Centauri Carbon, still get `prime_tower: Enabled` and an AMS checklist item with no warning that automatic multicolor is unsupported. Creality no-system printers do get a warning, but they still also get prime tower and AMS checklist output.
- **Evidence:**
  ```text
  data/printers.json:1074 Centauri Carbon multi_color_systems []
  engine.js:1491-1498 no-system warning is gated by printer.manufacturer === "creality"
  engine.js:2172-2174 colors !== "single" always emits prime_tower
  engine.js:1311-1314 colors !== "single" always emits "Check AMS filament path and spool seating"

  Phase 4 probe:
  centauri_carbon + colors=multi_2_4 -> prime_tower "Enabled"; warnings ["pla_heat_creep"]; checklist includes AMS path
  ender3_v3_se + colors=multi_2_4 -> warnings ["creality_no_multicolor"], but prime_tower "Enabled" and AMS checklist still emit
  ```
- **Suggested fix shape (1-3 sentences):** Make no-system handling generic for any printer with empty `multi_color_systems`, not manufacturer-specific. Gate AMS/prime-tower checklist copy by the actual multicolor system, and decide whether manual-color printers should get different output rather than AMS-specific output.
- **Sources (if magnitude finding):** N/A - internal cross-option behavior finding.
- **Risk if not fixed:** Users on unsupported printers can receive automatic-multicolor setup guidance that their selected printer cannot perform.
- **Touches iOS?:** yes.

### [MEDIUM-02] Special flags promise profile changes but mostly emit warnings only

- **Surface:** `engine.js:527-533`, `engine.js:1437-1467`, `engine.js:1917-1973`, `engine.js:1975-2130`, `engine.js:2181-2190`, `engine.js:2205`; option `special`.
- **What's wrong (one paragraph):** Several special-purpose flags use UI copy or warning text that implies concrete setting changes, but the profile values remain unchanged. `waterproof` says extra walls/top layers and warns to use 4+ walls/60%+ infill, but emitted walls/infill/shells stay at baseline. `metallic` says slower outer wall for sheen, but speed stays baseline. `glossy` says ironing and fine layers are recommended, but it does not change surface or enable ironing. `high_temp` does influence auto-brim in some states and emits a material warning, so this is not a blanket "dead special flags" finding.
- **Evidence:**
  ```text
  engine.js:528 waterproof desc "Extra walls and top layers..."
  engine.js:530 metallic desc "slower outer wall..."
  engine.js:532 glossy desc "ironing and fine layers recommended"
  engine.js:1437-1467 special flags mostly push warnings

  Phase 4 probe with useCase=[] baseline:
  baseline          -> wall_loops 3, top_shell_layers 5, sparse_infill_density 15%, outer_wall_speed 80 mm/s, ironing absent
  special=waterproof -> same profile values, warnings ["waterproof_settings"]
  special=metallic   -> same profile values, warnings ["metallic_soft_nozzle"]
  special=glossy     -> same profile values, warnings ["glossy_finish"]
  special=high_temp  -> brim_width "5-8 mm" plus warning; limited visible profile delta
  ```
- **Suggested fix shape (1-3 sentences):** Decide which special flags are advisory and which are profile-shaping. For profile-shaping flags, emit actual parameter changes with provenance; for advisory flags, soften UI/warning copy so it does not imply automatic changes.
- **Sources (if magnitude finding):** N/A as framed. If the implementation later treats warning numbers such as 60%+ infill or 40-50 mm/s as target values, those specific numbers need source research.
- **Risk if not fixed:** Users can select a special goal believing the assistant changed the profile, when it only displayed advice to change settings manually.
- **Touches iOS?:** yes.

### [LOW-01] Surface ironing data and runtime ironing rules disagree

- **Surface:** `data/rules/objective_profiles.json:24-56`, `engine.js:402-407`, `engine.js:2181-2190`; option `surface x ironing`.
- **What's wrong (one paragraph):** `surface_quality[*].ironing` marks only `maximum` as `true`, and `getFilters` uses that field when building surface chip descriptions. Runtime ironing is controlled by `state.ironing` and a hard-coded surface-id list that auto-enables ironing for `fine`, `very_fine`, `ultra`, and `maximum`. The output behavior is coherent, but the data field and chip-copy path no longer reflect the runtime rule.
- **Evidence:**
  ```text
  data/rules/objective_profiles.json:25-29 fine ironing false
  data/rules/objective_profiles.json:34-38 very_fine ironing false
  data/rules/objective_profiles.json:43-47 ultra ironing false
  data/rules/objective_profiles.json:52-56 maximum ironing true
  engine.js:2183-2184 auto ironing enables for fine, maximum, very_fine, ultra

  Phase 2 probe:
  surface=fine + ironing=auto -> profile.ironing "Enabled - Monotonic line"
  ```
- **Suggested fix shape (1-3 sentences):** Make one source own auto-ironing: either derive chip descriptions from the same runtime `state.ironing` rule, or move the auto-enabled surface list back into data and have `resolveProfile` consume it.
- **Sources (if magnitude finding):** N/A - data/runtime drift finding.
- **Risk if not fixed:** The UI/data contract can drift further, making surface-chip copy disagree with emitted settings.
- **Touches iOS?:** yes.

### [LOW-02] Some enum options are effectively no-ops

- **Surface:** `engine.js:455-461`, `engine.js:479-483`, `engine.js:517-521`, `engine.js:1476-1480`, `engine.js:1671-1678`, `engine.js:1786-1816`; options `useCase`, `userLevel`, `filament_condition`.
- **What's wrong (one paragraph):** Several enum values exist mostly as labels and do not drive output. `useCase: ["decorative"]` produces the same sampled profile/warnings as no use case, despite copy saying it prioritizes surface finish/detail. `userLevel: "advanced"` is indistinguishable from `intermediate`; only `beginner` affects speeds/warnings. `filament_condition` has a real `unknown` warning path for hygroscopic materials, but `freshly_dried` and `opened_recently` are informational and otherwise no-op.
- **Evidence:**
  ```text
  engine.js:458 decorative desc "prioritizes surface finish and detail"
  engine.js:1476-1480 only beginner branches for userLevel warnings
  engine.js:1814 isBeginnerMode = state.userLevel === "beginner"
  engine.js:1671-1678 only filament_condition === "unknown" branches

  Phase 2/4 probes:
  useCase=[] and useCase=["decorative"] -> same sampled profile keys and warnings []
  userLevel=intermediate and userLevel=advanced on ABS -> same sampled profile/warnings
  material=PA + filament_condition=unknown -> adds "filament_condition_unknown"
  material=PA + filament_condition=freshly_dried -> no condition warning
  ```
- **Suggested fix shape (1-3 sentences):** Either wire these values to meaningful behavior or reframe their UI copy as preference labels/advisory metadata. `decorative` is the strongest candidate for real behavior because the current copy promises output prioritization.
- **Sources (if magnitude finding):** N/A - enum behavior finding.
- **Risk if not fixed:** Users may expect a changed profile from selections that are currently labels only.
- **Touches iOS?:** yes.

### [LOW-03] Nozzle suitable/unsuitable arrays are schema-only, not runtime gates

- **Surface:** `data/nozzles.json:10-18`, `data/nozzles.json:32-40`, `engine.js:201-209`, `engine.js:2301-2325`, `scripts/validate-data.js:127-128`; option `nozzle x material`.
- **What's wrong (one paragraph):** `nozzles.json` defines `suitable_for` and `not_suitable_for`, but runtime compatibility is driven from material-side `nozzle_requirements` and material `max_mvs`; the nozzle arrays are only schema/soft-warning inputs. Many real incompatibilities are still caught, so this is lower severity than the printer-nozzle issue, but the data convention is misleading and easy to extend incorrectly.
- **Evidence:**
  ```text
  data/nozzles.json defines suitable_for / not_suitable_for on nozzle entries
  scripts/validate-data.js:127-128 validates they are arrays
  engine.js:201-209 soft-validates not_suitable_for references during init
  engine.js:2307-2325 runtime compatibility checks material.nozzle_requirements and material.base_settings.max_mvs

  git grep -n "suitable_for" -- engine.js app.js
  # no runtime consumer

  Phase 4 probe:
  pa_cf + std_0.2 -> warns via material min diameter / hardened / MVS-null paths
  pa_cf + hrd_0.6 -> avoids nozzle warnings
  ```
- **Suggested fix shape (1-3 sentences):** Either remove/rename the nozzle arrays as documentation-only metadata, or include them in `isNozzleCompatibleWithMaterial` with a clear precedence model against material-side requirements.
- **Sources (if magnitude finding):** N/A - internal data-convention finding.
- **Risk if not fixed:** Future nozzle data additions can look behaviorally meaningful while having no effect.
- **Touches iOS?:** yes.

### [OBSERVATION-01] Environment x support has no direct interaction

- **Surface:** `engine.js:1127-1165`, `engine.js:2073-2081`, `engine.js:2132-2168`; options `environment x support`.
- **What's wrong (one paragraph):** The handover called out `environment x support` as a plausible interaction, so I sampled it explicitly. Cold environment changes temps, warnings, and initial-layer speed, but support type, threshold, and Z distance are unchanged. I am not filing this as a correctness bug because I did not find a data promise or concrete physical rule requiring support geometry to change in cold environments.
- **Evidence:**
  ```text
  Phase 4 probe:
  support=easy + normal -> support_type Tree, support_z_distance 0.30 mm, threshold 40 deg, initial_layer_speed 25 mm/s
  support=easy + cold   -> support_type Tree, support_z_distance 0.30 mm, threshold 40 deg, initial_layer_speed 20 mm/s, warnings ["env_cold_0","env_cold_1"]
  ```
- **Suggested fix shape (1-3 sentences):** No immediate fix recommended. If future research says cold/draft environments should change support style or support interface behavior, add an explicit environment-support rule and tests.
- **Sources (if magnitude finding):** N/A - observation.
- **Risk if not fixed:** Low; current behavior is explicit enough unless the product later promises support adaptation by environment.
- **Touches iOS?:** yes if changed later.

### [OBSERVATION-02] Positive interaction controls mostly behaved as expected

- **Surface:** `engine.js:1394-1414`, `engine.js:1416-1428`, `engine.js:1476-1480`, `engine.js:1542-1581`, `engine.js:1650-1678`, `engine.js:1790-1816`, `engine.js:1986-1991`; multiple option pairs.
- **What's wrong (one paragraph):** This is not a bug. The cross-option pass also checked positive controls so the report does not only list failures. Open-frame PC emits enclosure/high-shrink/bed-cap warnings; passive-enclosed PLA emits heat-creep guidance; TPU Fast is speed-capped; PA-CF with bad nozzles warns and with hardened 0.6 avoids nozzle warnings; ABS on cool plate warns; Safe equals absent `profileMode`; Tuned differs where `_tuned` exists and caps do not mask it; beginner+ABS warns/slows; unknown hygroscopic filament warns while freshly dried does not add the condition warning.
- **Evidence:**
  ```text
  Phase 4 probes:
  a1 + pc -> warnings include enclosure_required, printer_max_bed_temp_clamped, high_shrink_open
  centauri_carbon + pla_basic -> warnings ["pla_heat_creep"]
  tpu_85a + fast -> outer_wall_speed 18 mm/s, inner_wall_speed 25 mm/s
  pa_cf + std_0.2 -> warnings include cf_soft_nozzle, cf_small_nozzle, nozzle_too_small, nozzle_not_supported
  pa_cf + hrd_0.6 -> no nozzle-size/hardened warnings
  profileMode absent equals safe -> true
  profileMode tuned + x1c + strong + fast -> strong infill 25% vs safe 35%, accel 10000 vs 6000
  ```
- **Suggested fix shape (1-3 sentences):** Preserve these paths while fixing the dead/ignored fields above. Add regression tests around any changed interaction so working behavior is not lost during v1.0.4 fixes.
- **Sources (if magnitude finding):** N/A - observation.
- **Risk if not fixed:** No risk; this is a guardrail note for implementation.
- **Touches iOS?:** yes if tests/engine paths change later.

## Phase 1 audit snapshot

| Area | Fields / values checked | Status |
|---|---|---|
| `printers.json` | `available_nozzle_sizes` | DEAD in engine/app; filed HIGH-01. |
| `printers.json` | `available_plates` | DEAD in engine/app; filed HIGH-03. |
| `printers.json` | `multi_color_systems` | PARTIAL; CFS and Creality no-system paths exist, but non-Creality empty systems are missed; filed MEDIUM-01. |
| `printers.json` | `open_door_threshold_bed_temp` | Printer-level field has no direct consumer; material `enclosure_behavior.open_door_threshold_bed_temp` is consumed for PLA heat-creep guidance. Not filed separately. |
| `materials.json` | `ams_lite_compatible` | DEAD in engine/app; filed HIGH-02. |
| `materials.json` | `compatible_plates[*].plate_id`, `bed_temp_range` | Effectively unused for behavior; `glue` is consumed in checklist. Filed with HIGH-03. |
| `materials.json` | `difficulty` | No runtime consumer; beginner material warning uses hard-coded groups. Covered under LOW-02/appendix only. |
| `materials.json` | `drying.heatbed_temp`, `heatbed_duration_hours`, `storage_max_humidity_pct` | No observed runtime consumer; oven temp/duration are consumed. Not filed as a top finding because drying advice still emits from oven fields. |
| `nozzles.json` | `suitable_for`, `not_suitable_for` | Runtime-dead/schema-only; filed LOW-03. |
| `environment.json` | `nozzle_adj`, `bed_adj`, `first_layer_speed_multiplier`, `preheat_minutes` | Consumed. |
| `environment.json` | `bed_first_layer_adj` | Known HIGH starting fact from handover; referenced in HIGH-05 but not re-filed standalone. |
| `environment.json` | `fan_multiplier`, `force_draft_shield` | DEAD in engine/app; filed HIGH-05. |
| `environment.json` | `humidity_warning` | No direct consumer, but humid behavior emits from `warnings`; not filed separately. |
| `objective_profiles.json` | `strength_levels[*].speed_multiplier` | DEAD in engine/app; filed HIGH-04. |
| `objective_profiles.json` | `surface_quality[*].ironing` | PARTIAL/drift with runtime auto-ironing rule; filed LOW-01. |
| Enum values | `decorative`, `advanced`, `freshly_dried`, `opened_recently` | No-op or informational values; filed LOW-02. |

## Phase self-check

- **Found:** 5 HIGH, 2 MEDIUM, 3 LOW/OBS findings; all have line references and reproducible behavior snippets.
- **Found but not re-filed standalone:** known `environment_options[].bed_first_layer_adj` HIGH from the handover; included only where it explains HIGH-05.
- **Skipped:** external Tier-1/Tier-2 magnitude sourcing, because Phase 3 and both review agents agreed the active findings are internal dead-field/ignored-option issues rather than suspicious emitted numeric values.
- **Skipped:** DQ-3/DQ-4/DQ-5 additive feature proposals, slicer-tab routing, web Advanced temp row parity, iOS-specific UI bugs, and cosmetic copy-only cleanup per handover scope.
- **Skipped:** peer review directory discovery; no files under `docs/reviews/2026-05-11-config-impact-qa/` were read/listed/grepped/opened except this deliverable.
- **Changed:** only this file, `docs/reviews/2026-05-11-config-impact-qa/codex.md`.
- **Not changed:** source files, data files, tests, scripts, runbooks, ROADMAP, session logs, NEXT-SESSION.
- **Not committed:** no commit made; owner reviews and commits/merges later.

## Cross-pass review - Codex reviews Claude (added 2026-05-11 after merge step triggered)

Original report content above is unchanged. Peer-read independence was lifted by the owner for this merge exercise only. I re-read the handover, `docs/3dpa-context.md`, this report, and `claude.md` in the requested order. Audited web SHA remains `ab979f47538d699ad996b6019bf86d69c5396f13`.

### Pre-flight self-check

- Read `docs/research/configuration-impact-qa-handover.md` end-to-end as a refresher.
- Read `docs/3dpa-context.md` end-to-end.
- Read `docs/reviews/2026-05-11-config-impact-qa/codex.md` end-to-end for reference only.
- Read `docs/reviews/2026-05-11-config-impact-qa/claude.md` end-to-end, including `## Cross-pass review - Claude reviews Codex`.
- Acknowledged peer-read constraint is lifted only for this specific cross-pass exercise.
- Appended only this section; source files remain read-only and no commit was made.

### Layer A - direct review of Claude's findings

#### Areas of independent agreement

| Finding | Claude ID | Codex ID | Adjudication |
|---|---:|---:|---|
| Printer nozzle inventory is ignored | HIGH-01 | HIGH-01 | CONFIRMED. `printer.available_nozzle_sizes` has no app/engine runtime consumer, and engine emits profiles for impossible printer/nozzle pairs. |
| Printer plate inventory is ignored | HIGH-02 | HIGH-03 | CONFIRMED. `printer.available_plates` is not used to validate `state.build_plate`; engine plate warnings key off the static `BUILD_PLATE_COMPAT` map at `engine.js:1651-1668`. |
| `ams_lite_compatible` is ignored | HIGH-04 | HIGH-02 | CONFIRMED. `material.ams_lite_compatible` is data-only while AMS checks use `material.ams_compatible` and generic color state at `engine.js:1431` and `engine.js:1470`. |
| Strength `speed_multiplier` is ignored | HIGH-09 | HIGH-04 | CONFIRMED. Strength affects walls/infill but not emitted speed; this is one of the cleanest v1.0.4 fixes. |
| Environment data fields are partially dead | HIGH-07/HIGH-08 plus handover known `bed_first_layer_adj` | HIGH-05 | CONFIRMED. `fan_multiplier`, `force_draft_shield`, and `bed_first_layer_adj` do not reach profile output; my report also caught that cold warning copy promises a first-layer bed bump that is not emitted. |

#### Claude findings I missed or under-filed

| Claude finding | Verdict | Evidence checked | Severity adjudication |
|---|---|---|---|
| HIGH-03 broader multi-color system-type differentiation | CONFIRMED with caveat | Engine uses generic AMS copy in the multicolor checklist at `engine.js:1313`, generic AMS compatibility warnings at `engine.js:1431` and `engine.js:1470`, only a Creality no-system warning at `engine.js:1493-1498`, a CFS-specific branch at `engine.js:1501-1504`, and unconditional `prime_tower` for multicolor at `engine.js:2172-2174`. `data/printers.json` contains many distinct systems. | Real, but I would merge it into one multicolor batch rather than keep it as a separate HIGH from AMS Lite/empty-MCS. The type-copy/type-guidance gap is MEDIUM by the handover's "printer-blind meaningful handling" rule; `ams_lite_compatible` being entirely dead remains HIGH. |
| HIGH-05 `safe_chamber_temp_max` dead | CONFIRMED with caveat | `safe_chamber_temp_max` exists on selected materials, e.g. `data/materials.json:553`, `data/materials.json:660`, `data/materials.json:1414`, and `data/materials.json:1824`. Active chamber copy uses `target_chamber_temp` or hardcoded fallback at `engine.js:1566-1574` and does not consult the safe cap. | HIGH is fair as a safety-relevant dead field. Claude slightly overstates breadth when implying every material has this field. Not CRITICAL at this SHA because no numeric chamber field is emitted. |
| HIGH-12 `cf_small_nozzle` warning misnamed/hardcoded | CONFIRMED | Generic min-diameter mismatch emits id `cf_small_nozzle` and hardcodes "0.2mm nozzle will clog immediately" at `engine.js:1424-1427`; a second nozzle-too-small path exists at `engine.js:1585-1587`. | I would retier to MEDIUM. The warning is wrong/misleading, but a separate nozzle-too-small warning can still fire, so this is not as urgent as dead physical-compat fields. |
| MEDIUM-01 `moisture_resistant` and `storage_max_humidity_pct` dead | CONFIRMED | Material fields exist but humid warnings are keyed to `material.base_settings.hygroscopic === 'high' && state.environment === 'humid'` at `engine.js:1621`, not to moisture resistance or storage limits. | MEDIUM is fair: material-aware humidity handling is meaningful, but this should be bundled with moisture/drying policy rather than rushed alone. |
| MEDIUM-02 `shrinkage_factor` dead | CONFIRMED with source caution | `shrinkage_factor` is data-only while `xy_hole_compensation` and `elephant_foot_compensation` are hardcoded for functional parts at `engine.js:1909-1913`. | MEDIUM is plausible. Claude's exact "PA-CF needs 2-3x" magnitude claim should be treated as unverified until Tier-1/Tier-2 sourcing is done. |
| MEDIUM-03 `environment.humidity_warning` dead | BORDERLINE | Environment data has `humidity_warning` flags; runtime hardcodes `state.environment === 'humid'` at `engine.js:1621`. | Real schema brittleness, but with only one humid environment in current data I would file LOW/OBS or bundle it with the environment batch, not standalone MEDIUM. |
| MEDIUM-05 cold/vcold clamp misattribution | CONFIRMED | In a reproduced `PLA + vcold` run, env temperature uplift was clamped to material max and emitted `material_max_nozzle_temp_clamped`; the clamp path lives in the temperature computation and warning phase around `engine.js:1127-1216`. | MEDIUM is acceptable when bundled into the env batch. The emitted value is safe; the risk is misleading attribution and silently lost env compensation. |
| MEDIUM-06 miniature does not recommend a fine-detail nozzle | BORDERLINE | The chip copy mentions fine layers at `engine.js:459`; runtime sets Arachne for miniature at `engine.js:1810` and `engine.js:1844`, but emits no nozzle suggestion. | This is a product guidance gap, not a dead declared field. I would keep it LOW/OBS unless owner explicitly wants use-case chips to drive nozzle recommendations. |
| LOW material metadata dead fields (`difficulty`, `food_safe_possible`, heatbed drying, `outdoor_suitable`, `ambient_temp_range`) | CONFIRMED | Grep found no app/engine consumers for these fields, while related fields like oven drying are consumed. | LOW/OBS is right. These are mostly future-feature or display metadata unless tied to an existing chip promise. |

#### Findings I caught that Claude missed

- `Codex HIGH-05` cold warning text drift was correctly acknowledged by Claude at `claude.md:503-505`. The source behavior is worse than a silent dead field: env data says cold bed first layer should change, warning text says it changed, but emitted bed temperatures do not carry that compensation.
- `Codex MEDIUM-01` empty-MCS multicolor output was correctly acknowledged at `claude.md:506`. It is distinct from system-type differentiation because `multi_color_systems: []` should suppress or warn before `prime_tower` and AMS checklist output.
- `Codex LOW-01` surface ironing data/runtime drift was correctly acknowledged at `claude.md:507`. Data says only `maximum` has ironing true, while runtime auto-enables ironing for several surface values.
- `Codex LOW-02` `filament_condition` no-op values were correctly acknowledged at `claude.md:508`. `freshly_dried` and `opened_recently` are accepted enum choices but do not change output beyond the default path.
- Claude did not fully preserve the material-side half of `Codex HIGH-03`: `compatible_plates[*].plate_id` and `bed_temp_range` are effectively unused for behavior, while `glue` is used only for checklist text at `engine.js:1258-1259`; actual plate compatibility warnings use the static map at `engine.js:1651-1668`. Claude's HIGH-02 covers printer `available_plates`, but not the material plate range drift as sharply.

#### Severity disagreements

- `special` flags: I agree with Claude's cross-pass correction that my MEDIUM is better than Claude's original HIGH. The flags mostly emit warnings, not profile mutations; this is a chip-promise/product semantics issue, not an immediate unsafe profile.
- `decorative`: I would raise my LOW to MEDIUM, matching Claude's adjusted view. The chip promises visual intent but decorative currently equals prototype/no use case in output. I still reject HIGH because no damaging or materially wrong slicer value is emitted.
- `advanced` user level: I would keep LOW/OBS, not Claude's MEDIUM. `advanced` is a no-op relative to intermediate, but the current wording is broad "precise tuning" copy rather than a specific safety or physical-profile promise.
- `nozzle.not_suitable_for`: I would raise my LOW to MEDIUM, but not to Claude's HIGH. The source-of-truth split is real future risk, yet current material-side runtime checks already catch the sampled abrasive/min-diameter cases.

### Layer B - review of Claude's cross-pass review of my report

Claude characterized most of my findings accurately and, importantly, acknowledged the cold-warning-text bug rather than flattening it into generic env dead fields. I agree with its statement that our five overlapping HIGHs form the safe core of the v1.0.4 batch.

Pushbacks on framing:

- Claude's broader MCS finding is real, but one detail is overstated: the CFS branch is not literally K2-Plus-only at this SHA; it checks `printer.multi_color_systems.includes('cfs')` at `engine.js:1501`. The warning id is still `k2_plus_cfs`, and generic AMS checklist copy still leaks to non-AMS systems, so the underlying finding stands.
- Claude's chamber finding is real, but "each material has a safe max" is too broad. The field exists on selected material enclosure records, not universally.
- Claude under-credited my plate finding by mapping it mostly to printer `available_plates`. My report also covered material `compatible_plates[*].plate_id` and `bed_temp_range` being ignored in favor of `BUILD_PLATE_COMPAT`.
- Claude's table says the engine consumes `material.compatible_plates` and `state.build_plate` for the build-plate warning path. That is partly misleading: `compatible_plates` feeds glue checklist text at `engine.js:1258-1259`, but the warning compatibility decision is static-map based at `engine.js:1651-1668`.

Claude's "where I missed" admissions are accurate. The four items it credited to my pass are real and not over-credited. It under-credited only the material plate range part of my HIGH-03, noted above.

Claude's four-row severity table mostly holds after reread, with two changes from me:

- I agree with MEDIUM for `special` and `decorative`.
- I disagree with MEDIUM for `advanced`; I would keep LOW/OBS unless the owner treats input chip copy as a strict behavioral contract.
- I agree my LOW on `nozzle.not_suitable_for` was too low, but I would land MEDIUM rather than HIGH.

Claude's proposed v1.0.4 priority list is directionally useful, but I would reorder/bundle it this way:

1. Keep the mutual HIGH core, but separate very small engine fixes from UI/filter work: strength `speed_multiplier`, env fields/text, and hard runtime guards can land before broader picker work.
2. Move the multicolor batch above `cf_small_nozzle`: bundle `Codex MEDIUM-01`, Claude HIGH-03, and Claude HIGH-04 so empty-MCS, AMS Lite, and per-system guidance are solved together.
3. Move `cf_small_nozzle` down from priority 3. It is a good small fix, but I rate it MEDIUM and less important than wrong multicolor workflows or chamber safety preconditions.
4. Keep chamber safe-cap in the batch, but treat it as a precondition for any future numeric chamber profile emission. At the current SHA it is warning-copy safety infrastructure, not an emitted unsafe setting.
5. Keep nozzle `suitable_for` / `not_suitable_for` cleanup after the physical printer/nozzle guard. Decide whether nozzle data is authoritative or derived before wiring both sides.
6. Split Claude's "material-side dead fields" bucket: `shrinkage_factor` and moisture/storage humidity are MEDIUM candidates; `difficulty`, food safety, outdoor, ambient range, and heatbed drying stay LOW/OBS unless tied to existing UI promises.
7. Keep chip-promise work (`special`, `decorative`, `advanced`, `miniature`) as an owner product-decision batch rather than mixing it with dead safety/compat fields.
8. Keep surface ironing and `filament_condition` as small cleanup items after the higher-risk behavior paths.

### Layer C - honest self-assessment

Strengths of my pass relative to Claude's:

- It was tighter and lower-noise. I focused on findings with direct runtime consequences and avoided turning every unused metadata field into a top-tier item.
- The cold-environment bug was framed more sharply: not only dead data, but user-facing warning text claiming an emitted adjustment that does not exist.
- I included positive controls, which helped distinguish broken paths from working ones and reduced false positives.
- The material/printer plate finding captured both sides of the static-map problem, not only printer inventory.

Weaknesses of my pass relative to Claude's:

- I missed several legitimate dead fields: `safe_chamber_temp_max`, `shrinkage_factor`, `moisture_resistant`, `storage_max_humidity_pct`, and `humidity_warning`.
- I missed the broader multicolor system-type problem beyond AMS Lite and empty-MCS cases.
- I under-tiered nozzle-side `not_suitable_for` by treating it mostly as schema-only metadata instead of a source-of-truth split.
- I did not catch the misleading `cf_small_nozzle` warning/id or the clamp-misattribution case.
- I was probably too conservative on `decorative`; MEDIUM is a better owner-triage tier than LOW.

Items I still want owner verification on before v1.0.4 implementation:

- Chamber semantics: confirm whether `safe_chamber_temp_max` should cap warning copy only today, or block any future chamber-temp profile output.
- Shrinkage compensation: confirm desired source and magnitude before deriving XY/elephant-foot compensation from `shrinkage_factor`; Claude's magnitude examples need external sourcing.
- Multicolor system scope: decide whether v1.0.4 differentiates only none/AMS Lite/full AMS/CFS first, or all listed systems including MMU3, ACE, IDEX, Toolchanger, Filament Hub, and AMS HT.
- Chip contract: decide whether use-case/special/user-level chips are promises of slicer-profile mutation or mostly advisory warnings/copy. Severity for `decorative`, `advanced`, `miniature`, and special flags depends on that product rule.
- Nozzle authority: choose whether material-side `nozzle_requirements` is the single runtime source, or whether nozzle-side `suitable_for` / `not_suitable_for` must participate in validation.

Self-check for this cross-pass:

- Found: strong agreement on five core HIGHs; several Claude-only findings confirmed; multiple severity retier recommendations.
- Skipped: no external magnitude sourcing, no edits to source/data/tests, no peer-agent spawning in this cross-pass.
- Changed: appended only this section to `docs/reviews/2026-05-11-config-impact-qa/codex.md`.
- Not changed: original report text above, source files, data files, tests, scripts, `claude.md`, ROADMAP, session logs, NEXT-SESSION.
- Not committed: owner reviews and commits later.
