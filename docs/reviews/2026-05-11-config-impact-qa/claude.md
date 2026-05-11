# Configuration impact QA — Claude

- **Pass run on:** 2026-05-11
- **Web SHA at start:** `ab979f47538d699ad996b6019bf86d69c5396f13`
- **iOS SHA at start (read-only reference):** `a7dbea91f1b7ff043bb63df7816692917150a9c4`
- **Baseline tooling status:**
  - `node scripts/validate-data.js` → **green** (6/6 files valid).
  - `node scripts/walkthrough-harness.js` → **green for hard failures**, 17 known soft warnings (`max_mvs missing keys present in k_factor_matrix: 0.8` across 9 materials — pre-existing `[MEDIUM-019-followup]` per ROADMAP IR-5 backlog).
  - `node scripts/profile-matrix-audit.js` → **green** (curated 55/55 PASS, broad sweep 46,512 / 0 failures).
- **Time spent (rough):** ~3.5 hours of focused work in a Cowork session.
- **Coverage achieved:** Phase 1 — every leaf field of `printers.json`, `materials.json`, `nozzles.json`, `rules/environment.json`, `rules/objective_profiles.json` enumerated and grep-checked against engine.js + app.js (out-of-scope rule files spot-checked only). Enum-only options all 13 covered. Phase 2 — per-value sampling for all 13 options + 18 materials × 1 baseline + 25 representative printers × 1 baseline. Phase 3 — magnitude check **partial** (see methodology deviations). Phase 4 — 13 named cross-option interaction probes + DQ-2 invariant verification.
- **Methodology deviations from handover:**
  - **Phase 3 not fully executed.** The handover requires cross-referencing suspicious output magnitudes against tier-1 sources (Bambu / PrusaSlicer / OrcaSlicer bundled presets, vendor TDS pages). This pass had no live web access and no local copy of bundled slicer presets. Local Obsidian vault sources at `Obsidian Vault/50-Wiki/raw/3dpa/bambu/` are product / how-to pages, not preset tables. Spot-checked baseline material temps for internal consistency vs the data files (engine emit matches data math); did not verify against vendor presets. Honest call-out: any magnitude-suspicion finding in this report is based on engine-internal logic gaps, not a vendor-source delta. Recommend a separate Gemini-style research handover for material magnitude verification (mirror `gemini-environments-taxonomy-research.md` template) before any value-changing implementation.
  - **Sub-agent reviewer used twice** as "extra eyes" per owner instruction at start of pass. Reviewer #1 spot-checked 14 Phase 1 DEAD-field claims; all 14 CONFIRMED. Reviewer #2 spot-checked 6 Phase 2 findings (HIGH-09, HIGH-10, HIGH-11, HIGH-12, MEDIUM-04, MEDIUM-05); all 6 CONFIRMED. No claims rejected.
  - **Did NOT spawn a third reviewer for Phase 4** — Phase 4 findings (HIGH-01 / HIGH-02 / HIGH-03 / MEDIUM-06) are direct corroborations of Phase 1 / 2 claims through interaction probes; the underlying claims were already reviewer-verified.
  - **Throwaway sampler scripts** lived at `scripts/.qa-claude-phase2.js` + `scripts/.qa-claude-phase4.js`. Per the handover's "do NOT commit ad-hoc scratch scripts" rule, both are **deleted at synthesis** (also dotfile-prefixed to be safe).

---

## Executive summary

The pass surfaced **12 HIGH**, **6 MEDIUM**, **6 LOW**, and **5 OBSERVATION** findings. No CRITICAL findings — no path was reproduced as actively emitting a printer- or material-damaging value. **HIGH-05** (`safe_chamber_temp_max` DEAD on active-chamber printers) is the closest borderline; it's filed HIGH not CRITICAL because chamber temp isn't currently emitted as a numeric output, only as warning copy — but it should be promoted to CRITICAL the moment a chamber-temp profile field is added to active-chamber printers.

The single dominant pattern is **dead data fields** — fields defined per the data-model intent that the engine simply doesn't read. The starting facts already triaged one example (`environment.bed_first_layer_adj`); this pass found ~20 more across all four data files and the rule files. The three highest-leverage to fix:

1. **`strength_levels[].speed_multiplier` is DEAD (HIGH-09).** Picking "Maximum" strength bumps wall_loops 3→6 and infill 15%→60% but leaves print speed unchanged. Heavy-walled prints fail at speeds tuned for thin-walled prints. ~5 LoC engine fix.
2. **The whole environment-data layer is half-DEAD (HIGH-07, HIGH-08, plus the known starting fact on `bed_first_layer_adj`).** Cold environments don't reduce cooling fan, don't auto-enable draft shield, and don't bump first-layer bed — three fields the data file declares, the engine ignores. Cold-garage users get zero of the protective effects the data was designed to apply.
3. **Multi-color systems aren't differentiated (HIGH-03 + HIGH-04).** Engine treats AMS Lite, full AMS, AMS HT, CFS, MMU3, ACE, IDEX, Toolchanger, and Filament Hub as one binary "colors !== single" signal. A1 Mini owners get the same multi-color guidance as P1S owners; K2 Plus owners get warnings worded for "AMS"; one printer-specific (`k2_plus_cfs`) hardcode hints the architecture should generalise.

Two additional structural concerns worth highlighting:

- **Chip-promise vs engine-behaviour gap (HIGH-10, HIGH-11).** Several chip descriptions promise specific profile changes that the engine never delivers. `useCase=decorative` produces the same output as `prototype` despite advertising "prioritises surface finish and detail." `special` flags `metallic`, `waterproof`, `glossy` only emit warnings, not the profile changes their chip text promises. Users trust the chip; the engine doesn't deliver.
- **Engine env-ID hardcodes (OBS-01) compound the env-data-layer DEAD-fields finding.** Even if owner extends `environment.json` with new env entries (e.g. `hot`, `dry`, `tropical`), the engine literal checks at engine.js:1287 / 1296 / 1621 won't honour them without paired engine edits. Schema brittleness.

**Recommended priority order for the merged v1.0.4 batch (after Codex pass and owner triage):**

1. HIGH-09 (strength speed_multiplier wired in — small fix, immediate measurable correctness).
2. HIGH-07 + HIGH-08 + bed_first_layer_adj from starting facts (env data layer wired in — single related batch).
3. HIGH-12 (cf_small_nozzle warning copy fix — small, clear win).
4. HIGH-10 + HIGH-11 (decorative + special chip-promise gap — needs design call from owner on what each should *actually* do).
5. HIGH-01 + HIGH-02 (printer × nozzle and printer × plate compat filters).
6. HIGH-03 + HIGH-04 (multi-color system differentiation — biggest scope, needs research handover).
7. HIGH-05 (chamber-temp safe-cap — promote to CRITICAL if chamber emission is added).
8. HIGH-06 (nozzle.not_suitable_for runtime DEAD — single-source-of-truth cleanup).
9. MEDIUMs and LOWs after the HIGH backlog clears.

Material-magnitude work (the original Bug-2 follow-up question on cold env not being aggressive enough for engineering filaments) is **explicitly held out of this report** per the "Known starting facts" section of the handover, and recommended for a separate Gemini research handover.

---

## Findings

> All findings cross-referenced against verified Phase 1 grep counts and Phase 2 sampler output. Sampler script lived at `scripts/.qa-claude-phase2.js` (gitignored throwaway, deleted at synthesis). Each finding cites file:line; reproduction commands are inline.

### CRITICAL

_None._ No printer-damaging or material-damaging behaviour was reproducible during sampling. HIGH-05 (`safe_chamber_temp_max` DEAD) borders on CRITICAL but the active-chamber printer × low-tolerance material combination wasn't reproduced as actually emitting an unsafe chamber value — it's a missing safeguard, not an active emission of unsafe values.

### HIGH

#### [HIGH-01] `printers.json:available_nozzle_sizes` is DEAD — engine never validates user's nozzle pick against printer capability

- **Surface:** [`data/printers.json`](3dprintassistant/data/printers.json) field `available_nozzle_sizes` per printer; `engine.js` lacks any check.
- **What's wrong:** every printer entry declares which nozzle sizes the printer physically supports (Bambu = 0.2/0.4/0.6/0.8; Creality K1C = 0.4/0.6 only; Ender-3 V3 KE = 0.4 only). `engine.js` never reads this. A user can pick Ender-3 V3 KE + a 0.8mm nozzle and the engine emits a profile with no warning, even though the printer's hot end physically cannot mount that size.
- **Evidence:** `git grep -nw "available_nozzle_sizes" engine.js app.js` → 0 hits. No dynamic key access on the parent object (verified by reviewer agent). Real per-printer variation: `node -e "const p=require('./data/printers.json'); console.log(p.printers.find(x=>x.id==='ender3_v3_ke').available_nozzle_sizes)"` → `[0.4]`.
- **Suggested fix shape:** filter the nozzle picker by selected printer's `available_nozzle_sizes`; emit a warning if `state.nozzle.size` is not in `state.printer.available_nozzle_sizes`.
- **Risk if not fixed:** silently invalid combos get a confident-looking profile.
- **Touches iOS?:** yes (engine.js change).

#### [HIGH-02] `printers.json:available_plates` is DEAD — engine never validates user's build_plate pick against printer

- **Surface:** [`data/printers.json`](3dprintassistant/data/printers.json) field `available_plates` per printer; engine consumes only `material.compatible_plates` and `state.build_plate` directly (engine.js:1644-1664).
- **What's wrong:** each printer declares the plate inventory it ships with (Bambu = cool/textured/engineering/high_temp; H2D = textured/smooth only; Creality = textured/glass). Engine warns about material × plate compat (PLA on aggressive PEI etc.) but never about printer × plate compat. A user can pick H2D + `cool_plate` (which H2D doesn't ship) and the engine treats it as valid.
- **Evidence:** `git grep -nw "available_plates" engine.js app.js` → 0 hits. Build-plate logic at engine.js:1644-1664 only checks `material.compatible_plates[state.build_plate]`.
- **Suggested fix shape:** when `state.build_plate` is selected, intersect against `printer.available_plates` and emit a `plate_not_on_printer` warning if missing.
- **Risk if not fixed:** confident profile for a plate the user doesn't have.
- **Touches iOS?:** yes (engine.js change).

#### [HIGH-03] Multi-color system distinction lost — engine treats AMS, AMS Lite, CFS, MMU3, ACE, IDEX, Toolchanger, Filament Hub identically

- **Surface:** `printers.json:multi_color_systems` (per-printer array) + `materials.json:ams_compatible` (boolean) + state field `colors`.
- **What's wrong:** engine.js cares about two binary signals: `material.ams_compatible` and `colors !== 'single'`. It does not read `printer.multi_color_systems`. So:
  - A1 (AMS Lite, no enclosed feed, weak with high-temp) gets the same multi-color guidance as P1S (full AMS, enclosed).
  - K2 series (CFS — different mechanism) gets warnings worded for "AMS" — wrong noun.
  - MK4 + MMU3 (Prusa, totally different operating model) gets warnings worded for "AMS".
  - SV04 IDEX / Guider 3 Ultra (two independent extruders) get the same generic AMS warnings even though their constraints are completely different.
- **Evidence:** `engine.js:1431` `if (material.group === 'TPU' && !material.ams_compatible && colors && colors !== 'single')` — no branch on `printer.multi_color_systems`. Same at `engine.js:1470`.
- **Suggested fix shape:** propagate `printer.multi_color_systems` into the warning copy templates; differentiate compat checks for `ams_lite` (no enclosed feed → harder restrictions on hygroscopic/high-temp) vs `ams` vs `ams_ht` vs `cfs` vs `mmu3`/`ace`/`idex`/`toolchanger` (each with its own quirks). At minimum: rename warning copy to use the correct system name.
- **Risk if not fixed:** AMS Lite owners get false-confidence on materials that genuinely can't go through AMS Lite; non-Bambu owners see "AMS" copy that doesn't apply to their MCS.
- **Touches iOS?:** yes.

#### [HIGH-04] `materials.json:ams_lite_compatible` is DEAD — A1 / A1 Mini owners get full-AMS guidance

- **Surface:** [`data/materials.json`](3dprintassistant/data/materials.json) field `ams_lite_compatible`; `engine.js` reads only `ams_compatible`.
- **What's wrong:** sister field to `ams_compatible`. Defined per material to acknowledge that AMS Lite cannot reliably feed materials that full AMS can (e.g. high-temp materials, abrasives, or materials needing the enclosed feed path). Engine never reads it. A1 / A1 Mini owners are evaluated against the same compat rules as P1S/X1C owners.
- **Evidence:** `git grep -nw "ams_lite_compatible" engine.js app.js` → 0 hits.
- **Suggested fix shape:** when `printer.multi_color_systems` includes `ams_lite` (and no `ams`/`ams_2_pro`), use `material.ams_lite_compatible` instead of `material.ams_compatible` for the multi-color compat check.
- **Risk if not fixed:** AMS Lite false-confidence on materials that need full-AMS feed paths.
- **Touches iOS?:** yes.

#### [HIGH-05] `materials.json:safe_chamber_temp_max` is DEAD — chamber temp can be set above safe limit on active-chamber printers

- **Surface:** [`data/materials.json`](3dprintassistant/data/materials.json) field `safe_chamber_temp_max`; engine only reads `enclosure_behavior?.target_chamber_temp` at `engine.js:1568` with hardcoded fallbacks (40 / 45°C).
- **What's wrong:** active-chamber printers (X1E, H2 series, X2D, K2, kobra_s1) can heat the chamber. Each material has a documented SAFE chamber maximum (PLA: ~30°C, PETG: ~40°C). Engine emits / suggests chamber temps without validating against `material.safe_chamber_temp_max`. The DEAD field exists in data per material; engine never consults it.
- **Evidence:** `git grep -nw "safe_chamber_temp_max" engine.js app.js` → 0 hits. The actively-consumed alternative `target_chamber_temp` (engine.js:1568) is a *target*, not a *safe ceiling*.
- **Suggested fix shape:** when emitting chamber-temp guidance, clamp / warn at `material.safe_chamber_temp_max`. Severity is borderline CRITICAL because PLA at chamber >30°C softens and bonds to the bed too aggressively; PETG above its safe range can warp inside the chamber. Not reproducible as an actively-emitted unsafe value during this pass (engine doesn't currently emit a chamber number for non-active-chamber printers), so filed HIGH not CRITICAL — promote if Phase 4 cross-option testing shows X1E / H2 series actively emitting chamber values above material safe max.
- **Risk if not fixed:** missing safety check on the highest-end Bambu printers when running PLA / PETG.
- **Touches iOS?:** yes.

#### [HIGH-06] `nozzles.json:not_suitable_for` is DEAD-AT-RUNTIME — all 4 hits are init-time validation only

- **Surface:** [`data/nozzles.json`](3dprintassistant/data/nozzles.json) field `not_suitable_for` per nozzle; `engine.js:201-208` reads it ONLY inside `_validateSchema` (init-time soft check).
- **What's wrong:** runtime nozzle/material warnings come from `material.nozzle_requirements?.material === 'hardened'` and `material.abrasive`. The nozzle-side `not_suitable_for` list is consulted only to validate refs at init. Schema duplication: a new abrasive material that's added to existing nozzles' `not_suitable_for` arrays but doesn't set `material.abrasive=true` triggers ZERO runtime warnings — the nozzle side rots silently while the material side is the only authority.
- **Evidence:** `grep -n "not_suitable_for" engine.js` → 4 hits, all in `_validateSchema` between engine.js:201-208. `grep -n "isNozzleCompatibleWithMaterial" engine.js` (engine.js:2302) shows the runtime path uses `material.nozzle_requirements`.
- **Suggested fix shape:** either (a) collapse to a single source of truth — drop nozzle-side `not_suitable_for` (and `suitable_for`) entirely, drive everything from material side; or (b) make runtime compat consult both sides and require agreement.
- **Risk if not fixed:** silent inconsistency between data files; future material additions may forget the material-side flag and produce no warnings.
- **Touches iOS?:** yes (data-only fix touches iOS via byte-identical sync).

#### [HIGH-07] `environment.json:fan_multiplier` is DEAD — cold environments don't reduce cooling fan

- **Surface:** [`data/rules/environment.json`](3dprintassistant/data/rules/environment.json) per-env `fan_multiplier` (cold = 0.9, vcold = 0.8); engine never multiplies any cooling fan emission.
- **What's wrong:** community guidance for cold-environment printing reduces cooling fan to retain layer warmth (especially for engineering filaments). The data file declares the multipliers, the engine ignores them.
- **Evidence:** `git grep -nw "fan_multiplier" engine.js app.js` → 0 hits. Direct sample: `getAdvancedFilamentSettings({...env:'cold'})` returns `cooling_fan_min=70%, cooling_fan_overhang=100%`; same as `env:'normal'`. Same for `vcold`.
- **Suggested fix shape:** in `getAdvancedFilamentSettings`, multiply emitted `cooling_fan_min` and `cooling_fan_overhang` by `env.fan_multiplier ?? 1.0`; same in any other cooling fan emission site (export paths, simple summary if applicable).
- **Risk if not fixed:** cold-environment users get the same fan settings as room-temperature users → poor layer adhesion on engineering filaments.
- **Touches iOS?:** yes.

#### [HIGH-08] `environment.json:force_draft_shield` is DEAD — cold/vcold envs don't auto-enable draft shield

- **Surface:** [`data/rules/environment.json`](3dprintassistant/data/rules/environment.json) per-env boolean (cold/vcold = true); engine consumes only as a hardcoded warning string at `engine.js:1633`.
- **What's wrong:** cold envs are supposed to auto-enable draft-shield emission in the profile output. Engine only mentions it inside a literal string in a warning body. The output profile never has a `draft_shield: 'enabled'` row, regardless of env.
- **Evidence:** `git grep -nw "force_draft_shield" engine.js app.js` → 0 hits. The warning at engine.js:1633 hardcodes `'Use a draft shield'` text but doesn't toggle a profile param.
- **Suggested fix shape:** add a `draft_shield` emission in `resolveProfile` that flips `'enabled'` when `env.force_draft_shield`; expose the param in `SLICER_TABS`.
- **Risk if not fixed:** users in cold envs get told about draft shields in copy but never get the actual setting.
- **Touches iOS?:** yes.

#### [HIGH-09] `objective_profiles.json:strength_levels[].speed_multiplier` is DEAD — Strong/Maximum strength does NOT slow the print

- **Surface:** [`data/rules/objective_profiles.json`](3dprintassistant/data/rules/objective_profiles.json) per-strength-level `speed_multiplier` (minimal/standard = 1.0, strong = 0.9, maximum = 0.8); engine never multiplies any emitted speed by it.
- **What's wrong:** picking "Maximum" strength bumps wall_loops 3→6, infill 15%→60%, top shells 5→7, bottom shells 4→6 — the print becomes 2-3× longer in volume — but the print speeds stay identical. Per data intent, Maximum should run 20% slower (0.8 multiplier), Strong 10% slower. Engine ignores both. Confirmed by direct sample: `outer_wall_speed`, `inner_wall_speed`, `top_surface_speed`, `initial_layer_speed` are byte-identical across all 4 strength tiers.
- **Evidence:** `grep -c "speed_multiplier" engine.js` → 0. Phase 2 sampler:
  ```
  strength = "minimal":  no speed change vs baseline
  strength = "standard": no speed change vs baseline
  strength = "strong":   no speed change vs baseline (wall_loops 3→4, infill 15→35%, etc.)
  strength = "maximum":  no speed change vs baseline (wall_loops 3→6, infill 15→60%, etc.)
  ```
- **Suggested fix shape:** in `resolveProfile`, after computing wall/infill speeds from `speed_priority`, multiply by `strength.speed_multiplier ?? 1.0`.
- **Risk if not fixed:** large heavy-walled prints fail at speeds tuned for thin-walled prints.
- **Touches iOS?:** yes.

#### [HIGH-10] `useCase` value `'decorative'` is counterproductive — produces same output as `'prototype'`, not the quality boost the chip promises

- **Surface:** `engine.js:458` chip definition: `'decorative'` desc = `'Visual display — prioritizes surface finish and detail.'`; no engine.js branch ever reads `useCase.includes('decorative')`.
- **What's wrong:** picking Decorative produces the same output as picking Prototype: both unset `brim_width`, `xy_hole_compensation`, and `elephant_foot_compensation` (because the *default* useCase=functional adds those, and any non-functional unsets them). Decorative does not enable ironing, finer layers, lower outer-wall speed, or any quality lever. Worse than DEAD: actively wrong-direction relative to the chip promise.
- **Evidence:** `grep -n "'decorative'" engine.js` → 2 hits; both definition-only (line 236, 458). Phase 2 sampler:
  ```
  useCase = ["prototype"]:  brim_width unset, xy_hole_comp unset, elephant_foot unset
  useCase = ["decorative"]: brim_width unset, xy_hole_comp unset, elephant_foot unset (identical to prototype)
  useCase = ["functional"]: NO DELTA vs baseline (baseline IS functional)
  ```
- **Suggested fix shape:** decide what Decorative *should* do (probably: enable ironing, drop layer height to 0.16, reduce outer wall speed, keep tolerance compensation) and add the branch in `resolveProfile`. Or remove the chip if it's not going to be a real feature.
- **Risk if not fixed:** users who pick Decorative get a worse profile than functional.
- **Touches iOS?:** yes.

#### [HIGH-11] `special` flags `metallic`, `waterproof`, `glossy` chip-promise vs engine-behaviour gap

- **Surface:** `engine.js:485` chip definitions; `engine.js:1438-1463` warning sites.
- **What's wrong:** three of the six `special` flags promise specific profile changes in their chip descriptions, but the engine only emits warnings — it never modifies any profile parameter:
  - `metallic`: chip says `"slower outer wall for best sheen"`. Engine warns about hardened nozzle requirement (line 1448) but does NOT slow `outer_wall_speed`.
  - `waterproof`: chip says `"Extra walls and top layers to prevent water penetration."`. Engine warns about waterproofing recommendations (line 1453) but does NOT increase `wall_loops` or `top_shell_layers`.
  - `glossy`: chip says `"ironing and fine layers recommended."`. Engine warns about PLA Silk preference (line 1458) but does NOT enable `ironing` or reduce `layer_height`.
  Confirmed by Phase 2 sampler: each flag adds exactly one `_warn_ids` entry and zero profile-param changes.
- **Evidence:** `grep -B1 -A4 "special.includes('metallic'|'waterproof'|'glossy')" engine.js` → all three sites only `warnings.push(...)`, no `p.<param> = ...` assignment.
- **Suggested fix shape:** either (a) implement the promised profile changes inside each branch (recommended), or (b) rewrite the chip descriptions to say "Reminder: ..." instead of presenting the change as automatic.
- **Risk if not fixed:** users trust the chip text, expect the profile to reflect the special flag, and get a generic profile with one extra warning.
- **Touches iOS?:** yes.

#### [HIGH-12] `cf_small_nozzle` warning misnamed + hardcodes "0.2mm" message for any min-diameter mismatch

- **Surface:** `engine.js:1424-1427`.
- **What's wrong:** the warning ID is `cf_small_nozzle` (carbon-fiber-specific naming) but the trigger is `material.nozzle_requirements?.min_diameter > 0.2 && nozzle.size < min_diameter` — fires for ANY material with a min_diameter requirement above 0.2 when a smaller nozzle is selected. TPU 85A (`min_diameter: 0.6, abrasive: false`) on a std_0.4 nozzle triggers `cf_small_nozzle`, even though TPU 85A is not carbon fibre. The warning body hardcodes `"0.2mm nozzle will clog immediately"` even though the user might have selected a 0.4mm nozzle.
- **Evidence:** Phase 2 material sweep showed TPU 85A on std_0.4 emits `cf_small_nozzle` + `nozzle_too_small` + `nozzle_not_supported`. Inspecting engine.js:1424-1427 confirms the message string is literally `0.2mm nozzle will clog immediately` regardless of the actual nozzle size selected.
- **Suggested fix shape:** rename the warning ID to `nozzle_below_min_diameter`; use the actual selected nozzle size + the material's required min_diameter in the message body. (May overlap with the existing `nozzle_too_small` warning at engine.js:1586 — consider deduplicating.)
- **Risk if not fixed:** misleading warning body for non-CF materials with min_diameter requirements; "0.2mm" mention is wrong when user has a different nozzle.
- **Touches iOS?:** yes.

### MEDIUM

#### [MEDIUM-01] `materials.json:moisture_resistant` + `storage_max_humidity_pct` are DEAD — humidity warnings not material-aware

- **Surface:** materials.json fields; engine humidity logic at engine.js:1620-1621.
- **What's wrong:** humidity warning fires for any material when `state.environment === 'humid'` AND `material.base_settings.hygroscopic === 'high'`. Material-side `moisture_resistant` (boolean) and `storage_max_humidity_pct` (numeric per-material humidity ceiling) are unused. PETG-HF, ABS, ASA could downgrade or skip the humidity warning if `moisture_resistant: true`. PA / PA-CF could upgrade to a critical warning at lower humidity than the binary `'humid'` env category captures.
- **Evidence:** zero hits for both fields.
- **Suggested fix shape:** when `state.environment === 'humid'`, check `material.moisture_resistant` to downgrade the warning; track `material.storage_max_humidity_pct` for nuanced critical/warning thresholds.
- **Risk if not fixed:** false-positive humidity warnings for moisture-resistant materials; false-negative on the most-fragile materials.
- **Touches iOS?:** yes.

#### [MEDIUM-02] `materials.json:shrinkage_factor` is DEAD — XY hole comp + elephant foot are material-blind

- **Surface:** materials.json field `shrinkage_factor`; engine emits hardcoded `xy_hole_compensation = '0.05–0.1 mm'` and `elephant_foot_compensation = '0.15 mm'` at engine.js:1909-1912.
- **What's wrong:** `shrinkage_factor` exists per material (PA = 1.5%, PLA < 0.5%, ABS ~0.7%, PC ~0.7%). Engine emits the same XY hole compensation and elephant foot compensation regardless. PA-CF, ABS, PC need 2-3× the XY comp PLA needs.
- **Evidence:** `grep -c "shrinkage_factor" engine.js` → 0. Sister field `shrink_risk` (categorical) IS consumed at engine.js:1630, 2204 — for warnings, not numeric output.
- **Suggested fix shape:** scale `xy_hole_compensation` and `elephant_foot_compensation` from `shrinkage_factor` (e.g. `xy_comp = base × (shrinkage_factor / 0.5%)`).
- **Risk if not fixed:** dimensionally inaccurate prints in engineering filaments; hole sizes drift > 0.2mm without warning.
- **Touches iOS?:** yes.

#### [MEDIUM-03] `environment.json:humidity_warning` is DEAD — engine hardcodes env ID instead of reading the data flag

- **Surface:** environment.json per-env boolean; engine.js:1621 hardcodes `state.environment === 'humid'`.
- **What's wrong:** schema brittleness. The current data only has one humid env, so the hardcode happens to work. But it ties humidity warnings to the literal string ID `'humid'`. Adding a future env value (e.g. `tropical`, `coastal`) with `humidity_warning: true` would not trigger the warning unless engine.js is also edited.
- **Evidence:** `grep -nw "humidity_warning" engine.js app.js` → 0 hits. `engine.js:1621` reads `state.environment === 'humid'` literally.
- **Suggested fix shape:** replace ID hardcode with `env.humidity_warning === true`.
- **Risk if not fixed:** future env additions are partially DEAD by design.
- **Touches iOS?:** yes.

#### [MEDIUM-04] `userLevel` value `'advanced'` produces NO output delta — same as `'intermediate'` and unset

- **Surface:** engine.js:1477, 1814.
- **What's wrong:** only `state.userLevel === 'beginner'` is branched. `'intermediate'` and `'advanced'` produce identical output in every sampled state. The chip presents 3 levels but only Beginner is functionally distinct.
- **Evidence:** Phase 2 sampler:
  ```
  userLevel = "beginner":     2 keys differ (outer_wall_speed 80→64, inner_wall_speed 160→128)
  userLevel = "intermediate": NO DELTA vs baseline
  userLevel = "advanced":     NO DELTA vs baseline
  ```
- **Suggested fix shape:** decide what Advanced means (probably: more aggressive defaults, fewer warnings, opt-out of beginner safety nets) and branch on it. Or collapse to a 2-level toggle (Beginner ↔ everything else).
- **Risk if not fixed:** chip implies meaningful differentiation that doesn't exist.
- **Touches iOS?:** yes.

#### [MEDIUM-05] env compensation can push materials above `nozzle_temp_max` — clamp warning misattributes the cause

- **Surface:** [`engine.js`](3dprintassistant/engine.js) `getAdjustedTemps` (line 1127) + `getAdvancedFilamentSettings` (line 1182).
- **What's wrong:** PLA Basic has `nozzle_temp_base: 220, nozzle_temp_max: 230`. env=vcold applies +10°C nozzle_adj. Result: adjusted nozzle = 230 (right at cap), initial-layer wants base+10+5 = 235 → clamped to 230. So:
  1. The env's intended +10°C boost is realised for `other_layers_temp` (220+10=230) but is silently CANCELLED for `initial_layer_temp` (220+10+5=235 → clamped to 230, same as other layers).
  2. The fired warning is `material_max_nozzle_temp_clamped` — copy says "X material max temperature is 230°C" — pointing the finger at the material, not at the env compensation that pushed it there.
- **Evidence:** Direct sample (vcold + PLA Basic + std_0.4 + a1):
  ```
  adjusted nozzle: 230 °C  (+10 adj)
  advanced init nozzle: 230 °C
  advanced other nozzle: 230 °C
  warnings: env_vcold_0, env_vcold_1, env_vcold_2, material_max_nozzle_temp_clamped
  ```
- **Suggested fix shape:** when env compensation triggers a material-cap clamp, attribute correctly: warn `env_compensation_capped_by_material` with body explaining the env asked for +10 but the material caps at 230. Better: scale env compensation per-material (HIGH-Bug-2-followup territory).
- **Risk if not fixed:** users see a clamp warning, blame the printer or the material, miss that env compensation is the actual driver.
- **Touches iOS?:** yes.

### LOW

- **[LOW-01] `materials.json:difficulty` DEAD.** Per-material difficulty (beginner/intermediate/advanced) never surfaces. Could pair with `userLevel` filtering. → Touches iOS.
- **[LOW-02] `materials.json:food_safe_possible` DEAD.** Could surface in future food-safe `useCase` value. No `useCase` value currently maps. → Touches iOS.
- **[LOW-03] `materials.json:heatbed_temp` + `heatbed_duration_hours` DEAD.** Sister to `oven_temp` / `oven_duration_hours` (both consumed). Drying-via-heatbed is a real community technique; checklist could surface it. → Touches iOS.
- **[LOW-04] `materials.json:outdoor_suitable` DEAD.** Could pair with a future outdoor `useCase`. → Touches iOS.
- **[LOW-05] `nozzles.json:suitable_for` DEAD.** Positive-list intent (this nozzle works WELL with these materials). Picker could highlight recommended nozzles per material. → Touches iOS.
- **[LOW-06] `environment.json:ambient_temp_range` DEAD.** Numeric range for chip desc enrichment. → Touches iOS.

### OBSERVATION

- **[OBS-01] Engine hardcodes env IDs `'cold'/'vcold'/'humid'`** at engine.js:1287, 1296, 1621. Adding new env values via data alone (e.g. `hot`, `dry`, `tropical`, `dusty`) is impossible; schema additions require paired engine.js edits. This is a design constraint to surface, not a bug.
- **[OBS-02] `userLevel='beginner'` applies a hardcoded ~20% wall-speed reduction** (80→64 mm/s outer, 160→128 mm/s inner) material- and printer-blind. Acceptable as a safety net but worth documenting as a single-multiplier choice rather than a finer policy.
- **[OBS-03] `support='easy'` and `support='balanced'`** both emit `Tree` + `Tree Hybrid` with only `support_z_distance` differing (0.30 vs 0.20 mm). Acceptable as design — they share a pattern with different stick-strength.
- **[OBS-04] `printer.has_camera` / `has_lidar`** are display-only metadata; never consumed. Acceptable; could surface in checklist (e.g. "use LiDAR auto-cal") but currently lives in hardcoded `notes` strings.
- **[OBS-05] `materials.json:bed_temp_range`** is DEAD-OK display string redundant with `bed_temp_min`/`max`.

---

## Phase 1 — Data-file consumption tables

> **Method:** for each leaf field in each data file, ran `grep -c -w "<field>" engine.js` and `grep -c -w "<field>" app.js`. CONSUMED = at least one runtime read; DEAD = zero hits in both files (and no dynamic-key access on the parent object); PARTIAL = read in some paths but missing from others where consistency would be expected. Init-time-only consumption (`_validateSchema`) counts as DEAD for runtime purposes — schema validation is not output behaviour.

### `data/printers.json`

| Field | engine.js | app.js | Status | Notes |
|---|---:|---:|---|---|
| `active_chamber_heating` | 3 | 0 | CONSUMED | Used by chamber-related warnings + checklist. |
| `available_nozzle_sizes` | 0 | 0 | **DEAD** | Real per-printer variation (Bambu = 0.2/0.4/0.6/0.8; Creality = 0.4/0.6; Ender-3 V3 KE = 0.4 only). Engine never filters or validates user's nozzle choice against printer capability. → finding HIGH-01. |
| `available_plates` | 0 | 0 | **DEAD** | Per-printer plate inventory varies (Bambu cool/textured/engineering/high-temp; Creality textured/glass; H2D textured/smooth only). Engine never filters or validates user's `state.build_plate` selection against printer's available plates. → finding HIGH-02. |
| `default_slicer` | 1 | 0 | CONSUMED | Used by `getSlicerForPrinter` routing. |
| `enclosure` | 26 | 2 | CONSUMED | Drives a lot of warning / checklist behaviour. |
| `extruder_type` | 6 | 2 | CONSUMED | Direct-drive vs Bowden retraction logic. |
| `has_camera` | 0 | 0 | DEAD-OK | Display metadata only; no engine use intended. → OBSERVATION. |
| `has_lidar` | 0 | 0 | DEAD-OK | Same. Could surface in checklist (e.g. "use LiDAR auto-cal") but currently lives in hardcoded `notes` string. → OBSERVATION. |
| `manufacturer` | 8 | 6 | CONSUMED | |
| `max_acceleration` | 2 | 0 | CONSUMED | Acceleration cap. |
| `max_bed_temp` | 16 | 0 | CONSUMED | Bed clamp. |
| `max_chamber_temp` | 2 | 0 | CONSUMED | Chamber warning copy. |
| `max_nozzle_temp` | 11 | 0 | CONSUMED | Nozzle clamp (post audit). |
| `max_speed` | 9 | 0 | CONSUMED | Speed clamp. |
| `multi_color_systems` | 2 | 0 | PARTIAL | Read for filter chip but engine doesn't differentiate AMS / AMS Lite / CFS / MMU3 / ACE / Toolchanger / IDEX in compat checks. → finding HIGH-03. |
| `open_door_threshold_bed_temp` | 4 | 0 | CONSUMED | |
| `primary` | 1 | 3 | CONSUMED | UI ordering. |
| `series` | 8 | 3 | CONSUMED | |
| `series_group` | 2 | 1 | CONSUMED | |
| `sort_order` | 1 | 0 | CONSUMED | |

### `data/materials.json`

(Excluding metadata-only fields `id`, `name`, `display`, `group`, `notes`, `warnings`, `properties`, `material(s)`, `reason`, `min_diameter` (read inside `nozzle_requirements` block).)

| Field | engine.js | app.js | Status | Notes |
|---|---:|---:|---|---|
| `abrasive` | 4 | 0 | CONSUMED | Triggers abrasive-soft-nozzle warning. |
| `adhesion_risk_pei` | 1 | 0 | CONSUMED | Plate selection prompt. |
| `ams_compatible` | 3 | 0 | CONSUMED | Boolean — but does not distinguish multi-color system type. → cross-finding with HIGH-03. |
| `ams_lite_compatible` | 0 | 0 | **DEAD** | Defined per material; engine never reads it. A1 / A1 Mini owners get the same AMS warnings as P1S owners. → finding HIGH-04. |
| `bed_temp_base` / `_max` / `_min` | 13 / 8 / 2 | 0 / 0 / 0 | CONSUMED | |
| `bed_temp_range` | 0 | 0 | DEAD-OK | Display string for material panel; redundant with min/max. → OBSERVATION. |
| `build_plate_display` | 1 | 0 | CONSUMED | |
| `compatible_plates` | 2 | 0 | CONSUMED | Plate compat warnings. |
| `cooling_fan` | 4 | 1 | CONSUMED | |
| `cooling_fan_min` / `_overhang` | 8 / 8 | 1 / 1 | CONSUMED | |
| `difficulty` | 0 | 0 | **DEAD** | Per-material difficulty rating (beginner/intermediate/advanced) never surfaces. Could feed into `userLevel`-aware filtering or warnings. → finding LOW-01. |
| `drying` | 13 | 2 | CONSUMED | |
| `enclosed_preferred` | 1 | 0 | CONSUMED | |
| `enclosure_behavior` | 6 | 0 | CONSUMED | |
| `enclosure_required` | 4 | 0 | CONSUMED | |
| `enclosure_strongly_recommended` | 2 | 0 | CONSUMED | |
| `fan_policy` | 6 | 0 | CONSUMED | |
| `flexible` | 9 | 0 | CONSUMED | |
| `flow_ratio` | 7 | 1 | CONSUMED | |
| `food_safe_possible` | 0 | 0 | **DEAD** | Could surface in `useCase` warnings (e.g. user picks "food-safe" use case but material is not food-safe). No `useCase` value currently maps to it. → finding LOW-02. |
| `glue` | 12 | 0 | CONSUMED | |
| `heat_resistance_celsius` | 2 | 0 | CONSUMED | |
| `heatbed_duration_hours` | 0 | 0 | **DEAD** | Sister to `oven_duration_hours` (consumed). Drying-via-heatbed is a real community technique; checklist could surface it. → finding LOW-03. |
| `heatbed_temp` | 0 | 0 | **DEAD** | Same. → folded into LOW-03. |
| `hygroscopic` | 4 | 0 | CONSUMED | Hardcoded `=== 'high'` check; categorical scale. |
| `initial_layer_bed_offset` / `_nozzle_offset` | 3 / 3 | 0 / 0 | CONSUMED | |
| `k_factor_matrix` | 10 | 0 | CONSUMED | |
| `max_mvs` / `max_speed` / `max_volumetric_speed` | 15 / 9 / 3 | 2 / 0 / 0 | CONSUMED | (`[MEDIUM-019-followup]` 0.8mm gap is known.) |
| `moisture_resistant` | 0 | 0 | **DEAD** | Boolean per material. Could downgrade humidity warnings for moisture-resistant materials (PETG-HF, ABS, ASA). → finding MEDIUM-01. |
| `nozzle_requirements` | 8 | 0 | CONSUMED | Drives hardened-nozzle + min-diameter warnings. |
| `nozzle_temp_base` / `_max` / `_min` | 11 / 6 / 2 | 0 / 0 / 0 | CONSUMED | |
| `open_door_threshold_bed_temp` | 4 | 0 | CONSUMED | |
| `open_preferred` | 1 | 0 | CONSUMED | |
| `outdoor_suitable` | 0 | 0 | **DEAD** | Boolean per material. No `useCase` or `special` value maps to outdoor-use; UV-resistant `uv_resistant` IS consumed (engine=3) but not paired with this. → finding LOW-04. |
| `oven_duration_hours` / `oven_temp` | 4 / 4 | 0 / 0 | CONSUMED | |
| `pressure_advance` | 13 | 1 | CONSUMED | |
| `retraction_distance` / `_max` / `_speed` | 17 / 3 / 11 | 1 / 0 / 1 | CONSUMED | |
| `safe_chamber_temp_max` | 0 | 0 | **DEAD** | Per-material maximum SAFE chamber temperature. Not the same as `target_chamber_temp` (which IS read at engine.js:1568). For active-chamber printers (X1E, H2-series, X2D, K2, kobra_s1), engine sets / suggests chamber temp without checking the material's documented safe ceiling. Real safety risk on materials with low chamber tolerance (PLA: <30°C; PETG: <40°C). → finding HIGH-05. |
| `shrink_risk` | 2 | 0 | CONSUMED | Categorical (high/medium/low). |
| `shrinkage_factor` | 0 | 0 | **DEAD** | Numeric (e.g. PA = 1.5%). Engine emits hardcoded `xy_hole_compensation = 0.05–0.1 mm` and `elephant_foot_compensation = 0.15 mm` material-blind (engine.js:1909-1912). PA-CF / ABS need much larger compensation than PLA. → finding MEDIUM-02. |
| `slow_layer_time` | 8 | 1 | CONSUMED | |
| `storage_max_humidity_pct` | 0 | 0 | **DEAD** | Per-material max storage humidity. Could feed humidity-warning thresholds. → folded into MEDIUM-01. |
| `target_chamber_temp` | 1 | 0 | CONSUMED | But indirectly: only via `enclosure_behavior?.target_chamber_temp`. |
| `uv_resistant` | 3 | 0 | CONSUMED | |
| `ventilation_required` | 1 | 0 | CONSUMED | |

### `data/nozzles.json`

| Field | engine.js | app.js | Status | Notes |
|---|---:|---:|---|---|
| `hardened` | 10 | 0 | CONSUMED | |
| `material` (nozzle's metal) | 193 | 30 | CONSUMED | |
| `not_suitable_for` | 4 | 0 | **DEAD-AT-RUNTIME** | All 4 hits are in `_validateSchema` (init-time only) at engine.js:201-208. Runtime warnings about material/nozzle compatibility come from `material.nozzle_requirements` and `material.abrasive` — never from `nozzle.not_suitable_for`. Schema duplication: a new abrasive material that updates `nozzle.not_suitable_for` but forgets `material.abrasive=true` produces zero warnings. → finding HIGH-06. |
| `size` | 24 | 3 | CONSUMED | |
| `suitable_for` | 0 | 0 | **DEAD** | Positive-list intent (this nozzle works WELL with these materials). Could power "recommended nozzles for {material}" UI. Currently nozzle picker shows all nozzles regardless of fit. → finding LOW-05. |
| `temp_offset` | 6 | 0 | CONSUMED | |

### `data/rules/environment.json`

| Field | engine.js | app.js | Status | Notes |
|---|---:|---:|---|---|
| `ambient_temp_range` | 0 | 0 | **DEAD** | `[5,15]` for `cold` etc. Could surface in chip desc. → finding LOW-06. |
| `bed_adj` | 6 | 0 | CONSUMED | |
| `bed_first_layer_adj` | 0 | 0 | **DEAD** | Already triaged HIGH per "Known starting facts"; cited here for completeness. Cold env's intended +7°C first-layer bed bump silently disappears. |
| `fan_multiplier` | 0 | 0 | **DEAD** | Per-env fan multiplier (cold = 0.9, vcold = 0.8) never applied to any cooling fan emission. Engine emits raw `bs.cooling_fan*` values regardless of env. → finding HIGH-07. |
| `first_layer_speed_multiplier` | 1 | 0 | CONSUMED | At engine.js:2077. |
| `force_draft_shield` | 0 | 0 | **DEAD** | Per-env boolean (cold/vcold = true). Engine never auto-enables draft-shield emission; only mentioned in a hardcoded warning string at engine.js:1633. → finding HIGH-08. |
| `humidity_warning` | 0 | 0 | **DEAD** | Per-env boolean. The actual humidity warning at engine.js:1620-1621 hardcodes `state.environment === 'humid'` instead of reading the flag. Schema brittleness: adding a future env value with `humidity_warning: true` (e.g. `tropical`) requires an engine.js code edit. → finding MEDIUM-03 (paired with the OBSERVATION below). |
| `nozzle_adj` | 6 | 0 | CONSUMED | (Already triaged conservative/material-blind per Known starting facts.) |
| `preheat_minutes` | 1 | 0 | CONSUMED | At engine.js:1290. |
| `warnings` | 68 | 4 | CONSUMED | Heavy generic consumption; `env.warnings` specifically pushed via `getWarnings`. |

> **Cross-cutting OBSERVATION on env handling:** engine.js hardcodes specific env IDs (`'cold'/'vcold'/'humid'`) at lines 1287, 1296, 1621. Adding new env values via data alone (e.g. `hot`, `dry`, `tropical`, `dusty`) is impossible — schema additions require paired engine.js edits. This compounds with the dead-flag findings: even if owner extends env data with `force_draft_shield: true` on a new env, the engine still wouldn't honour it.

### `data/rules/objective_profiles.json`

(Excluding `_meta`, `desc`, `id`, `name` — metadata.)

| Field | engine.js | Status | Notes |
|---|---:|---|---|
| `_tuned` | 14 | CONSUMED | DQ-2 sparse override pattern. |
| `bottom_shell_layers_base` / `top_shell_layers_base` | 1 / 1 | CONSUMED | |
| `desc_convention` | 0 | DEAD-OK | Documentation key inside `_meta`. → OBSERVATION (no action). |
| `gap_fill_bedslinger` / `_corexy` | 1 / 1 | CONSUMED | |
| `infill_density` / `_pattern` | 7 / 6 | CONSUMED | |
| `initial_accel` / `initial_layer` | 2 / 1 | CONSUMED | |
| `inner_accel_bedslinger` / `_corexy` | 1 / 1 | CONSUMED | |
| `inner_bedslinger` / `_corexy` | 1 / 1 | CONSUMED | |
| `ironing` | 20 | CONSUMED | |
| `layer_height` | 26 | CONSUMED | |
| `outer_accel_bedslinger` / `_corexy` | 2 / 2 | CONSUMED | |
| `outer_bedslinger` / `_corexy` | 4 / 6 | CONSUMED | |
| `seam_aligned` | 1 | CONSUMED | |
| `speed_multiplier` | 0 | **DEAD** | Per-`strength_levels` value. Strong = 0.9, Maximum = 0.8 — i.e. picking Maximum should slow the print 20% to handle the extra walls + density. Engine ignores it; print speed is identical across all strength selections. → finding HIGH-09. |
| `speed_priority` | 4 | CONSUMED | |
| `strength_levels` | 4 | CONSUMED | |
| `surface_quality` | 4 | CONSUMED | |
| `top_surface_bedslinger` / `_corexy` | 1 / 1 | CONSUMED | |
| `wall_generator` / `wall_loops` | 10 / 13 | CONSUMED | |

### `data/rules/slicer_capabilities.json`

Out of audit scope per handover (IMPL-039 owns this surface). Spot-checked: top-level `_meta`, `slicers`, `fallbacks`. No findings raised.

### `data/rules/troubleshooter.json`

Out of detailed audit scope. Will spot-check in Phase 4 that `causes[].setting` references resolve to engine-emitted params.

### Enum-only options (no data file)

These are defined in `app.js` filter chips and the engine handlers. Audited via grep on the option key + value.

| Option | Source | Values | Engine consumption | Notes |
|---|---|---|---|---|
| `useCase` | engine.js:455 | prototype / functional / decorative / miniature / large | PARTIAL | `prototype / functional / miniature / large` consumed (engine.js:1809-1812). **`decorative` zero-hit** beyond chip definition. → finding HIGH-10. |
| `surface` | objective_profiles `surface_quality` | draft / standard / fine | CONSUMED | Data-backed via objective_profiles. |
| `strength` | objective_profiles `strength_levels` | minimal / standard / strong / maximum | PARTIAL | `speed_multiplier` DEAD per HIGH-09. |
| `speed` | objective_profiles `speed_priority` | silent / balanced / fast | CONSUMED | (Plus a hardcoded `speedId === 'fast' → +5°C` nozzle adj at engine.js:1138 — material-blind.) |
| `environment` | rules/environment.json | normal / cold / vcold / humid | PARTIAL | 4 DEAD env fields per above. |
| `support` | engine.js:467 | none / easy / balanced / best_underside | CONSUMED | Driven by `_SUPPORT_TYPES` table (z-gap + pattern). engine.js:1747, 2133. |
| `colors` | engine.js:474 | single / multi_2_4 / multi_5 | PARTIAL | Engine cares about `colors !== 'single'` only. No distinction between AMS / AMS Lite / CFS / MMU3 / etc. per HIGH-03. |
| `userLevel` | engine.js:479 | beginner / intermediate / advanced | PARTIAL | Only `beginner` branches (engine.js:1477, 1814). `intermediate` and `advanced` produce IDENTICAL output to leaving the field unset. → finding MEDIUM-04. |
| `special` | engine.js:485 | waterproof / high_temp / metallic / matte / glossy / uv_resistant | PARTIAL | All 6 emit warnings (engine.js:1438-1463). Only `high_temp` actually changes profile output (brim logic at engine.js:2205). `metallic`, `waterproof`, `glossy` chip descs promise profile changes ("Extra walls and top layers", "slower outer wall for best sheen", "ironing and fine layers recommended") but engine emits same profile regardless. → finding HIGH-11. |
| `profileMode` | engine | safe / tuned | CONSUMED | DQ-2 invariant enforced by walkthrough + iOS XCTest. |

---

## Phase 4 — Cross-option interaction matrix

> Method: `scripts/.qa-claude-phase4.js` (gitignored throwaway). For each combination, captured emitted nozzle / bed temps, outer wall speed, retraction, and warning IDs. Baseline is the same as Phase 2 unless overridden.

| # | Combination | Expected | Observed | Match? | Cross-ref |
|---|---|---|---|---|---|
| I-1 | A1 + PC | `enclosure_required` warning + bed clamp | ✓ Both fire (`mat_pc_0`, `enclosure_required`, `printer_max_bed_temp_clamped`, `high_shrink_open`) | ✓ | — |
| I-1b | P1S + PC | enclosure-OK; bed clamp at 100 (P1S max) | ✓ `printer_max_bed_temp_clamped` fires; no `enclosure_required` | ✓ | — |
| I-1c | X1C + PC | enclosure-OK; bed reaches 110 (X1C max 120) | ✓ no clamp, bed = 115/110 | ✓ | — |
| I-2 | Ender-3 V3 KE + 0.8mm nozzle (KE only supports 0.4) | warning that printer doesn't physically support nozzle | **✗ ZERO warnings, profile emits as if 0.8 is fine** | ✗ | confirms **HIGH-01** |
| I-2b | K1C + 0.8mm nozzle (K1C supports 0.4/0.6) | warning that printer doesn't support 0.8 | ✗ Only `pla_heat_creep` fires; nothing about nozzle availability | ✗ | confirms **HIGH-01** |
| I-3 | PETG + cold env vs PLA + cold env | env effect should be larger on PETG (engineering filament) | Both get +5°C nozzle uniformly; bed unchanged (DEAD `bed_first_layer_adj`) | ✗ | known starting fact + **HIGH-07/08** |
| I-3b | ABS + cold (P1S) | bed clamp + env warnings | ✓ `printer_max_bed_temp_clamped` + `env_cold_*` fire | ✓ | — |
| I-4 | TPU 95A + fast | speed clamps low | ✓ `outer_speed=31 mm/s` (clamped from balanced 80) | ✓ | — |
| I-4b | TPU 85A + fast (0.6 nozzle) | very slow speed clamp | ✓ `outer_speed=12 mm/s` | ✓ | — |
| I-5 | prc_0.2 + PA-CF | block / heavy warning flood | ✓ 10 warnings fire including `cf_soft_nozzle`, `cf_small_nozzle`, `nozzle_not_supported`, `abrasive_soft_nozzle`, `layer_height_clamped` | ✓ | — |
| I-6 | profileMode safe vs tuned (DQ-2 invariant) | no diff at standard/balanced; 2-3 fields diff at strong/fast | ✓ Standard/balanced: only `outer_wall_speed` differs (80→100); A1+strong+fast: 3 fields (infill 35→25, outer wall 100→130, accel 3000→6000); X1C+strong+fast: 2 fields. **Invariant `profileMode=undefined === profileMode='safe'`: 0 keys differ (verified)** | ✓ | DQ-2 healthy |
| I-7 | env=cold × support pattern | possibly tighter Z gap or denser support in cold | Identical output for `cold + easy` and `cold + best_underside` (env doesn't reach support). | ✓ acceptable | OBS — env doesn't influence support; arguably acceptable |
| I-8 | special[high_temp] + PLA | warn (PLA isn't high-temp) | ✓ `high_temp_material` fires | ✓ | — |
| I-8b | special[high_temp] + ABS | no high-temp warning (ABS IS high-temp) | ✓ no `high_temp_material`; brim emitted via the `needsBrim` branch | ✓ | — |
| I-9 | special[uv_resistant] + PLA | warn (PLA is not UV-resistant) | ✓ `uv_resistance` fires | ✓ | — |
| I-9b | special[uv_resistant] + ASA | no UV warning (ASA IS uv-resistant) | ✓ no `uv_resistance` warning | ✓ | — |
| I-10 | A1 + multi_2_4 (AMS Lite) vs P1S + multi_2_4 (full AMS) | different guidance based on MCS | A1: zero warnings. P1S: `pla_heat_creep` (PLA-specific, not AMS-specific). Engine doesn't differentiate AMS vs AMS Lite. | ✗ | confirms **HIGH-03 / HIGH-04** |
| I-10b | K2 Plus + multi_2_4 (CFS) | warning about CFS feed, not "AMS" | ✓ Fires `k2_plus_cfs` (printer-specific hardcode). But this is K2 Plus only — other K2 variants and other CFS-equipped printers don't get any equivalent. | ½ | enriches **HIGH-03** — CFS awareness exists but only for K2 Plus, not generalised |
| I-11 | H2D + `build_plate=cool_plate` (H2D doesn't ship cool_plate) | warn that plate isn't on this printer | **✗ ZERO warnings; emits a profile as if plate is available** | ✗ | confirms **HIGH-02** |
| I-11b | A1 Mini + `build_plate=engineering_plate` (A1 Mini doesn't ship engineering_plate) | warn | ✗ Zero warnings | ✗ | confirms **HIGH-02** |
| I-12 | useCase=`miniature` + nozzle=`std_0.4` (chip implies fine detail) | suggest prc_0.2 / std_0.2 nozzle | ✗ no warning, no nozzle recommendation | ✗ | new **MEDIUM-06** |
| I-12b | useCase=`decorative` + PLA Silk | profile boost (ironing, slower outer wall, fine layers) | ✗ same profile as standard PLA Silk | ✗ | confirms **HIGH-10** |
| I-13 | surface=`fine` + PA-CF | warnings + clamped layer height | ✓ `cf_soft_nozzle`, `abrasive_soft_nozzle` etc. fire | ✓ | — |
| I-13b | surface=`fine` + TPU 95A (0.6 nozzle) | works | ✓ | ✓ | — |

### New finding from Phase 4

#### [MEDIUM-06] `useCase='miniature'` doesn't recommend a fine-detail nozzle

- **Surface:** `engine.js:458` chip definition: `'miniature'` desc = `'Small detailed models — Arachne walls, fine layers recommended.'` Phase 2 confirmed `wall_generator` switches to Arachne for miniature, but no nozzle guidance fires.
- **What's wrong:** Miniature use case implies fine detail, which on most printers means `prc_0.2` / `std_0.2` nozzle (or better at small sizes). When the user has miniature selected with the default `std_0.4`, the engine emits the Arachne wall change but does not warn or recommend switching to a smaller nozzle. The chip text says "fine layers recommended" but no checklist item or warning surfaces the nozzle suggestion.
- **Evidence:** Phase 4 I-12: `useCase=['miniature']`, `nozzle='std_0.4'`, A1 + PLA Basic — zero warnings, no checklist item about fine-detail nozzle.
- **Suggested fix shape:** when `useCase.includes('miniature')` AND `nozzle.size > 0.2`, push an info-level warning suggesting a 0.2mm nozzle for fine detail (or modify the recommendation tier in checklist).
- **Risk if not fixed:** users following Miniature guidance still print with the default 0.4mm and don't get the detail Miniature implies.
- **Touches iOS?:** yes.

---

## Open questions for the owner

1. **HIGH-10 / HIGH-11 design intent.** What *should* `useCase=decorative` do? What *should* `special=metallic / waterproof / glossy` do? These are owner-design calls, not technical decisions. The chip text suggests the original intent (decorative = ironing + finer layers + slower outer wall; metallic = slower outer wall + hardened-nozzle warning; waterproof = +walls, +top shells; glossy = ironing + finer layers). Confirm or rewrite the chip descriptions to match what the engine actually does.
2. **MEDIUM-04 userLevel scope.** `'advanced'` produces zero delta vs `'intermediate'`. Is this an oversight (advanced should remove some safety nets) or is `userLevel` effectively a binary "beginner ↔ everything else" toggle? If the latter, consider collapsing the chip to two values.
3. **HIGH-05 chamber-temp safe-cap promotion criteria.** Should `safe_chamber_temp_max` be wired in *before* any active-chamber printer's profile starts emitting a chamber-temp value? (Currently no chamber-temp number is in the SLICER_TABS — the field would have to be added.) Treat as a precondition for active-chamber-temp emission, not as a separate effort.
4. **HIGH-06 single-source-of-truth direction.** Drop nozzle-side `not_suitable_for`/`suitable_for` entirely (collapse to material-side authority), or keep both and require runtime agreement?
5. **HIGH-03 multi-color system differentiation scope.** Differentiate just AMS vs AMS Lite (smallest meaningful step) or extend to all 8 MCS types (CFS, MMU3, ACE, Toolchanger, IDEX, Filament Hub, AMS HT)? Larger scope = better differentiation but bigger blast radius.
6. **OBS-01 env hardcodes vs data extensibility.** Is the env taxonomy expansion (Bug-2-followup, deferred per ROADMAP) the right time to delete the env-ID hardcodes and switch to flag-driven env logic? They're related — bundling makes sense.
7. **MEDIUM-06 miniature nozzle recommendation strength.** Hard warning, soft suggestion, or checklist item? The chip already says "fine layers recommended" — the engine could either upgrade that to a fired warning or quietly nudge via the nozzle picker.

---

---

## Cross-pass review — Claude reviews Codex (added 2026-05-11 after merge step triggered)

> Original report above is unchanged. This section is the cross-pass comparison written after Codex's deliverable landed at `codex.md`. Honest self-assessment: where we agreed, where Codex caught something I missed, where I caught something Codex missed, where we disagreed on severity, and an adjudicated merge-batch priority.

### Where we strongly agree (5 HIGH findings — both reports independently land on the same calls)

| Finding | Claude | Codex |
|---|---|---|
| `printers.json:available_nozzle_sizes` DEAD — engine never validates user's nozzle vs printer | HIGH-01 | HIGH-01 |
| `printers.json:available_plates` DEAD — engine never validates user's plate vs printer | HIGH-02 | HIGH-03 |
| `materials.json:ams_lite_compatible` DEAD — A1/A1 Mini owners get full-AMS guidance | HIGH-04 | HIGH-02 |
| `strength_levels[].speed_multiplier` DEAD — Strong/Maximum don't slow the print | HIGH-09 | HIGH-04 |
| Environment dead fields (`fan_multiplier`, `force_draft_shield`, plus the known `bed_first_layer_adj`) | HIGH-07 + HIGH-08 | HIGH-05 |

These five are the **safe core of the v1.0.4 batch.** Two independent passes converged on the exact same calls.

### Where Codex caught something I missed (3 real findings + 1 enum-coverage gap)

1. **Cold-environment warning text lies to the user (Codex's HIGH-05, sharper framing than mine).** I caught that `bed_first_layer_adj` is DEAD. Codex went one step further: the cold-env warning text *literally says* "first layer bed +7°C" even though the engine doesn't apply that adjustment. So it's not just a silently-DEAD field — the warning copy promises a compensation that never reaches the output. Worse than DEAD; mis-information. **Solid catch I should have made.**
2. **Empty-MCS printers still get multicolor output (Codex's MEDIUM-01).** Centauri Carbon has `multi_color_systems: []` (no multicolor system at all). Engine still emits `prime_tower: Enabled` and the AMS checklist item when `colors=multi_2_4`. I covered the broader AMS-vs-AMS-Lite-vs-CFS differentiation under my HIGH-03 but missed the specific empty-MCS gap. The engine has a Creality-only manufacturer hardcode for the no-system warning at `engine.js:1491-1498`, so non-Creality empty-MCS printers (Centauri) get nothing. **Real catch I missed.**
3. **Surface ironing data/runtime drift (Codex's LOW-01).** `objective_profiles.json:surface_quality[*].ironing` marks only `maximum` as `true`. But the engine's auto-ironing rule (engine.js:2183-2184) fires ironing for `fine`, `very_fine`, `ultra`, AND `maximum`. So `surface=fine` enables ironing in the output even though the data field for `fine` says `ironing: false`. The chip-desc path uses the data field; runtime contradicts it. I sampled `surface=fine` in Phase 2 and saw `ironing` enabled, but didn't think to cross-check the data field. **Real catch I missed.**
4. **Codex flagged a no-op enum I didn't audit at all: `filament_condition`** (with values `unknown / freshly_dried / opened_recently` — only `unknown` branches; the other two are labels). I missed this entirely because it's not in the canonical AppState shape in `docs/3dpa-context.md`. Worth treating as a finding.

### Where I caught things Codex missed (8 findings)

- **HIGH-03 multi-color *system-type* differentiation** (AMS vs AMS Lite vs AMS HT vs CFS vs MMU3 vs ACE vs IDEX vs Toolchanger vs Filament Hub). Codex caught the empty-MCS case (their MEDIUM-01) but didn't generalise to the system-type-naming gap. K2 owners get warnings worded for "AMS"; MK4 owners get the same; etc. My finding is broader.
- **HIGH-05 `safe_chamber_temp_max` DEAD** on active-chamber printers (X1E, H2 series, X2D, K2, kobra_s1). Borderline-CRITICAL safety gap. Codex didn't catch this.
- **HIGH-12 `cf_small_nozzle` warning misnamed + hardcoded "0.2mm" message body** when triggered by any min-diameter material (TPU 85A on a 0.4mm nozzle gets told "0.2mm nozzle will clog immediately" — wrong nozzle size in the message, wrong warning ID for non-CF material). Codex didn't catch.
- **MEDIUM-02 `shrinkage_factor` DEAD** — XY hole compensation + elephant foot are emitted material-blind. PA-CF needs ~3× the comp PLA does.
- **MEDIUM-01 `moisture_resistant` + `storage_max_humidity_pct` DEAD** — humidity warnings aren't material-aware.
- **MEDIUM-05 env compensation can push materials past their `nozzle_temp_max`** — clamp fires, attributes blame to the material, eats the initial-layer offset silently.
- **MEDIUM-06 `useCase=miniature` doesn't recommend a fine-detail nozzle** — chip says "fine layers recommended" but engine doesn't fire any nozzle suggestion.
- Several lower-severity DEAD fields (`food_safe_possible`, `heatbed_temp`, `outdoor_suitable`, `difficulty`, `ambient_temp_range`) — Codex saw most of these in the audit snapshot and chose not to file them as standalone findings; I filed each as LOW. Reasonable disagreement on the line, not on the underlying facts.

### Severity disagreements

| Finding | Codex | Claude | My adjudication |
|---|---|---|---|
| `special` flags (metallic / waterproof / glossy) chip-promise gap | MEDIUM | HIGH | **Codex is right; should be MEDIUM.** User still gets the warning advice; not damaging. |
| `useCase=decorative` counterproductive | LOW (bundled) | HIGH | **Likely MEDIUM.** Worse than DEAD (matches `prototype` against the chip's quality promise) but not damaging. Codex's LOW underrates; my HIGH overrates. |
| `userLevel=advanced` no-op | LOW (bundled) | MEDIUM | **Hold MEDIUM.** Chip presents 3 options, only 1 functional — UX claim that doesn't deliver. Codex's bundling under "enum no-ops" loses the user-facing impact. |
| `nozzle.not_suitable_for` runtime-DEAD | LOW | HIGH-06 | **Hold HIGH or step down to MEDIUM.** Codex's LOW understates the silent-inconsistency risk for future material additions. The single-source-of-truth concern is real. |

### Honest self-assessment

Codex's report is tighter and more focused (~10 findings vs my 29), with sharper framing on a couple of items (cold-warning-text drift especially). My report has wider coverage and catches things Codex didn't (chamber safety, multi-color SYSTEM-type, several material-side dead fields), but I overrated severity on `decorative` and `special-flags`, and I missed the warning-copy-vs-engine-emit gap that Codex framed best in their HIGH-05.

Two passes worked as designed: the union is meaningfully bigger than either individual report, and the disagreements are narrow (adjacent severity tiers, not factual). No CRITICAL findings on either side; agreement that no actively-emitted unsafe value was reproduced.

### Adjudicated merge-batch priority for v1.0.4

1. **Mutual HIGHs (the 5 above).** Immediate, low-risk, narrow scope each.
2. **Codex HIGH-05 cold-warning-text drift** bundled with my **HIGH-07 + HIGH-08** + the known `bed_first_layer_adj` — single env-data batch. Includes the warning-copy fix so it stops claiming compensations the engine doesn't apply.
3. **My HIGH-12** (`cf_small_nozzle` warning copy fix) — small, clear win.
4. **Codex MEDIUM-01** (empty-MCS prime_tower) bundled with my **HIGH-03** (multi-color SYSTEM-type differentiation) — single MCS batch. Generalise the manufacturer hardcode at engine.js:1491-1498 to any printer with empty `multi_color_systems`, then layer the per-system-type guidance on top.
5. **My HIGH-05** (chamber-temp safe-cap). Treat as a precondition for any future active-chamber-temp profile-field emission.
6. **My HIGH-06 / Codex LOW-03** (`nozzle.suitable_for` / `not_suitable_for` cleanup) — consensus on the bug, decide single-source direction (drop nozzle-side vs require runtime agreement).
7. **The chip-promise design calls** (`decorative`, `special` flags) — needs your design input before any fix. Likely MEDIUM after re-tier.
8. **Codex LOW-01** (surface ironing data/runtime drift) — collapse to a single source for auto-ironing.
9. **Codex LOW-02** (`filament_condition` enum no-ops) — wire or relabel.
10. **Material-side dead fields** (`shrinkage_factor`, `moisture_resistant`, etc.) and the rest of LOWs — schedule after the higher-impact backlog clears.

---

## Methodology actually followed

**Phase 0 — pre-flight (completed):** read `docs/3dpa-context.md` end-to-end (cold-start + reread); read this handover end-to-end (authored most of it during the same session); captured baseline tooling status (validate-data green; walkthrough green for hard failures, 17 known soft warnings; profile-matrix-audit 55/55 + 46,512/0); captured starting SHAs for both repos; created deliverable file at `docs/reviews/2026-05-11-config-impact-qa/claude.md`; acknowledged read-only and peer-agent-independence constraints.

**Phase 1 — data-file consumption audit (completed in full):** enumerated every leaf field in `printers.json`, `materials.json`, `nozzles.json`, `rules/environment.json`, `rules/objective_profiles.json` via Node walker. For each field, ran `grep -c -w "<field>" engine.js` and `grep -c -w "<field>" app.js`. Verified DEAD candidates by case-insensitive sweep + dynamic-key-access spot check. Built per-file consumption tables. Out-of-scope rule files (`slicer_capabilities.json`, `troubleshooter.json`) marked appropriately. Spawned **reviewer agent #1** to spot-check 14 highest-stakes DEAD-field claims; all 14 CONFIRMED.

**Phase 2 — per-option output behaviour sample (completed in full):** wrote `scripts/.qa-claude-phase2.js` (gitignored throwaway) reusing the walkthrough-harness Node + vm scaffold. Sampled all 13 configuration options × every value (using corrected enum values after a first pass with wrong `'silent'` and `'voron_24'` IDs). Sampled 18 materials × baseline. Sampled 25 representative printers × baseline. Captured 25-key fingerprint per state, diffed against baseline. Spawned **reviewer agent #2** to spot-check 6 highest-stakes Phase 2 claims; all 6 CONFIRMED.

**Phase 3 — magnitude reality check (PARTIAL — see Methodology deviations).** Sampled baseline material temps for internal consistency vs data files (engine emit matches data math). Did NOT cross-reference against tier-1 vendor presets due to no live web access and no local copy of bundled slicer presets. Local Obsidian vault Bambu sources at `Obsidian Vault/50-Wiki/raw/3dpa/bambu/` are product / how-to pages, not preset tables. Magnitude-suspicion findings in this report are based on engine-internal logic gaps, not vendor-source deltas. Recommend separate Gemini-style research handover for material magnitude verification before any value-changing implementation.

**Phase 4 — cross-option interaction matrix (completed in full):** wrote `scripts/.qa-claude-phase4.js` (gitignored throwaway). Probed 13 named cross-option combinations covering printer × material, printer × nozzle, material × env, material × speed, nozzle × material, profileMode × strength × speed (DQ-2 invariant), env × support, special × material, colors × printer MCS, build_plate × printer × material, useCase × material, surface × material. Verified DQ-2 Safe baseline byte-equality invariant (`profileMode=undefined === profileMode='safe'` returned 0 keys differ). Phase 4 surfaced one new finding (MEDIUM-06) and corroborated four Phase 1/2 findings (HIGH-01, HIGH-02, HIGH-03, HIGH-10).

**Phase 5 — synthesis (this section).** Wrote executive summary, recommended priority order for v1.0.4 batch, open questions for owner, methodology declaration. Cleaned up throwaway scripts from `scripts/.qa-claude-phase{2,4}.js`.

**Honest limitations to flag:**
- Magnitude reality check is the weakest leg of this pass. Findings about engine-internal gaps are well-grounded; findings about whether engine-emitted *values* match vendor reality are not in this report.
- 13 cross-option probes is a sample, not a matrix. With 13 options × 13 options × N values per option, full pairwise coverage is impractical for one pass; the probes were chosen to test the highest-suspicion pairs based on Phase 1 findings.
- Reviewer-agent passes targeted ~20 highest-stakes claims, not every finding. Lower-tier findings (LOW-01 through LOW-06, OBS-01 through OBS-05) are based on direct grep results without secondary verification — but they're also lower-impact, so the reviewer cost wasn't worth it.
