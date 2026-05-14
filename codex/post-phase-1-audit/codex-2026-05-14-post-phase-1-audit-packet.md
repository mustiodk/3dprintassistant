# Codex audit packet — v1.0.4 post-Phase-1 (Phase 1.5 + S8 iOS sync)

**Status:** ready for dispatch. **Owner-gated** — run Codex against this packet manually.

## Scope of this audit

This is the second Codex audit of the v1.0.4 arc. The prior audit (`codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-response.md`) reviewed Phase 1 commit range `5bcd68b..901153a` and produced 0 CRITICAL / 2 HIGH / 2 MEDIUM / 1 LOW / 1 OBSERVATION. Owner triaged: HIGH-01 + HIGH-02 + MEDIUM-01 + LOW-01 in v1.0.4; MEDIUM-02 + OBSERVATION-01 deferred to v1.0.5.

**This audit covers everything since:**

- **Web:** `901153a..9603d37` (Phase 1 end → S8 close). 17 commits, +463 / -30 across `engine.js` + `data/` + `scripts/`. This is the **Phase 1.5 remediation work** (4 findings shipped: HIGH-01 / HIGH-02 / MEDIUM-01 / LOW-01, each with an internal-reviewer tightening commit on top) **plus the S8 close docs**.
- **iOS:** `eeb2915..fc3ee6b` (last touched 2026-04-27 era → current local HEAD). 2 commits = S8 Phase 2.1 iOS sync. **Local-only — Phase 2 gate active, not pushed to `origin/main`.**

**Out of scope:** Phase 1 (Tasks 1-7) — already audited. v1.0.5 candidates (MEDIUM-02 + OBSERVATION-01 carry-forwards from prior audit) — note them in your report if relevant but don't fully re-audit. iOS app code outside `EngineService` Codable layer + the new `EngineServiceTests.swift` additions.

**You are Codex.** Audit critically and skeptically. The internal-reviewer subagent's 4-for-4 streak across Phase 1.5 + S8 (PVA scope creep / Creality empty-MCS mis-targeting / partial-clip branch dead-untested / PLA chamber-cap missing + HIGH-05 banner missing + 4 loose substring matchers) sets the bar: find at least one substantive finding the committers + internal reviewers all missed.

## Repos + reference SHAs

**Web:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant`
- Phase 1 end (start of audit window): `901153a` — `fix: enforce material-side nozzle authority; cleanup nozzle min-diameter warning (T7 — HIGH-12/HIGH-06)`
- S8 close (end of audit window): `9603d37` — `docs: wrap S8 v1.0.4 Phase 2.1 — iOS sync + 11 XCTest mirrors (Phase 2.1 closes)`
- `origin/main` matches local HEAD on web.

**iOS:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios`
- Pre-S8 HEAD (start of iOS audit window): `eeb2915`
- Current local HEAD (end of audit window): `fc3ee6b`
- `origin/main` still at `eeb2915` — local-only, 2 commits ahead.

**Generate diff snapshots for your review:**

```bash
# Web
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant log --oneline 901153a..9603d37
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant diff 901153a..9603d37 -- engine.js data scripts
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant diff 901153a..9603d37 --stat

# iOS
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios log --oneline eeb2915..fc3ee6b
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios diff eeb2915..fc3ee6b
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios diff eeb2915..fc3ee6b --stat
```

## Commits in scope (web, newest first)

| SHA | Subject | Phase |
|---|---|---|
| `9603d37` | docs: wrap S8 v1.0.4 Phase 2.1 | S8 close docs |
| `2994d3b` | docs: wrap S7-3 v1.0.4 Phase 1.5 MEDIUM-01 (Phase 1.5 CLOSES) | S7-3 close |
| `58d919b` | fix: tighten P1.5 MEDIUM-01 — partial-clip branch + safety comment | **MEDIUM-01 tightening** |
| `243be51` | fix: first-layer bed-clamp attribution honesty (P1.5 MEDIUM-01) | **MEDIUM-01 impl** |
| `8787bc1` | docs: wrap S7-4 v1.0.4 Phase 1.5 LOW-01 | S7-4 close |
| `bc9c655` | test: tighten P1.5 LOW-01 — Creality empty-MCS sub-case | **LOW-01 tightening** |
| `d863635` | test: harden contract for retired warning IDs (P1.5 LOW-01) | **LOW-01 impl** |
| `28089e5` | docs: wrap S7-2 v1.0.4 Phase 1.5 HIGH-02 | S7-2 close |
| `f2aa84f` | fix: tighten P1.5 HIGH-02 — narrow PLA-only scope + vcold pin + schema guard | **HIGH-02 tightening** |
| `a4b8873` | fix: PLA-aware cold/chamber safety guidance (P1.5 HIGH-02) | **HIGH-02 impl** |
| `ef0250c` | docs: lock S7-N skill-discipline directive into NEXT-SESSION | docs |
| `f7d5207` | docs: wrap S7-1 v1.0.4 Phase 1.5 HIGH-01 | S7-1 close |
| `eaf3f09` | fix: wire env-fan + draft_shield through live web export surfaces (P1.5 HIGH-01) | **HIGH-01 impl** |
| `fe2964e` | docs: capture Codex v1.0.4 Phase 1.5 audit response | docs |
| `d6df6d3` | docs: wrap S6 v1.0.4 Phase 1.5 — Codex audit packet prepped | S6 close |
| `690519e` | chore: prep v1.0.4 Phase 1.5 Codex audit packet | S6 |
| `e36a91b` | docs: wrap S5 v1.0.4 impl — Phase 1 complete | (Phase 1 close docs only) |

iOS commits (newest first):

| SHA | Subject |
|---|---|
| `fc3ee6b` | chore: tighten S8 XCTest mirrors per internal code-review subagent |
| `350d23f` | chore: sync v1.0.4 engine + data; add Phase 1 + Phase 1.5 XCTest mirrors |

## Files touched (web `901153a..9603d37`, code + data only)

```
data/materials.json             |    5 ++
engine.js                       |  122 +++++++++---
scripts/profile-matrix-audit.js |    4 +-
scripts/validate-data.js        |   23 +++
scripts/walkthrough-harness.js  |  339 +++++++++++++++++++++++++++++++++++-
```

Plus extensive docs surface (session logs, ROADMAP, INDEX, NEXT-SESSION, the S8 implementation plan, the prior Codex audit response file). Docs are reference-only for the audit — don't audit doc prose unless it cross-references code claims (then verify the code claim).

## Web side — what was built (per finding)

### Phase 1.5 HIGH-01 — Export env-fan + draft_shield wiring

**Codex finding (prior audit):** `exportBambuStudioJSON` filament block used unscaled material defaults for `fan_min_speed` / `fan_max_speed` (didn't apply `env.fan_multiplier`); BAMBU_PROCESS_MAP lacked `draft_shield → enable_draft_shield`. `formatProfileAsText` likewise read unscaled fan values.

**Impl commit:** `eaf3f09`. Tightening: none for HIGH-01 (passed first-time green per internal reviewer).

**What to verify:**
- `engine.js` BAMBU_PROCESS_MAP near where `draft_shield` is now mapped to `enable_draft_shield` with `'Enabled' → '1'` mapping. Mapping correctness + no other side effects.
- `exportBambuStudioJSON` filament block — does it now read env-scaled `adv.fan_min_speed` / `adv.fan_max_speed`? (Note: `getAdvancedFilamentSettings` is one path; the export should read the env-scaled emission, not the raw material default.)
- `formatProfileAsText` fan line — does the rendered text now show env-scaled `Fan speed (min): 63` for PLA+cold (not unscaled 70)?
- `scripts/walkthrough-harness.js` new block `[v1.0.4 P1.5 HIGH-01-export]` (~line 612-660): does it actually exercise both the text export path AND the BS export path? Are the assertion thresholds correct (63 = 70 × 0.9, 90 = 100 × 0.9)?

### Phase 1.5 HIGH-02 — PLA cold/chamber safety (Option B)

**Codex finding (prior audit):** PLA-family materials on active-chamber printers (X1E) had no safety guidance against chamber temps exceeding PLA's softening threshold (~50°C). The existing `chamber_above_material_safe` guard at `engine.js:1746-1754` was PETG-aware (via `safe_chamber_temp_max: 50` in PETG Basic's `enclosure_behavior` block) but didn't extend to PLA. The cold env warning copy ("Keep door closed", "Preheat the enclosure") was actively counterproductive for PLA on active enclosures (X1E chamber can hit 60°C — closing the door makes it worse).

**Impl commit:** `a4b8873`. **Tightening commit:** `f2aa84f`.

**Data change:** `safe_chamber_temp_max: 50` added inside `enclosure_behavior` block of all 5 PLA-family materials (pla_basic, pla_matte, pla_silk, pla_metal, pla_cf).

**Engine changes (3 sites):**
1. Warning #4 `pla_heat_creep` predicate `printer.enclosure === 'passive'` → `printer.enclosure !== 'none'` (extends to X1E active enclosure).
2. `getChecklist` item #4 "Preheat enclosure" — now suppressed for PLA-family + enclosed + has `open_door_threshold_bed_temp`.
3. `getWarnings` env-warning verbatim pass — material-aware regex filter that skips `/door closed|preheat the enclosure|preheat \(/i` for PLA-family + enclosed.

**Tightening fixes (`f2aa84f`):**
- Narrowed predicates from "marker presence" (`open_door_threshold_bed_temp != null`) to `material.group === 'PLA'` (PVA also carries the marker; PVA still wants "Keep door closed" per humidity posture — PVA scope creep was the internal reviewer's Important finding).
- Added `plaHeatCreepPair` named const at both engine call sites for self-documentation.
- New harness assertions for vcold pin + PVA scope-guard.
- New `validate-data.js` schema checks for `safe_chamber_temp_max` + `open_door_threshold_bed_temp` (presence + type + range [30, 90]°C).

**What to verify:**
- Are the three predicate sites in `engine.js` truly consistent on `material.group === 'PLA'` after tightening? Grep for `plaHeatCreepPair` and the three sites.
- Does the env-warning regex `/door closed|preheat the enclosure|preheat \(/i` cover ALL the natural language variants in `data/rules/environment.json` for cold + vcold env strings, or could a future env-copy edit silently un-suppress a warning? The harness pins both cold + vcold; would a new env (e.g., `extreme_cold`) need a similar pin?
- Does the `getChecklist` item #4 suppression respect the `material.group === 'PLA'` predicate, or does it use a separate condition that could drift? Read carefully.
- Is the `safe_chamber_temp_max: 50` value defensible for PLA-CF and PLA Metal specifically? Both share the same heat-resistance ballpark as PLA Basic (~57°C softening), so a single conservative floor is defensible — verify.
- `validate-data.js` schema check at `scripts/validate-data.js` for `safe_chamber_temp_max` — is the [30, 90]°C range correct? Could a future material legitimately need a value outside this range?

### Phase 1.5 MEDIUM-01 — First-layer bed-clamp attribution honesty

**Codex finding (prior audit):** The env first-layer bed warning emitted `"+N°C applied to first-layer bed temperature"` regardless of whether the requested delta was actually applied (fully clipped by material cap, partially clipped, or full apply). Concrete static example: PETG Basic + cold env on a printer where the bed cap is binding — the engine's initial-layer math already reaches the cap before env compensation, so the +7°C "applied" claim was a lie. Pair: `printer_max_bed_temp_clamped` warning's initTarget didn't include `env.bed_first_layer_adj`, so cap-warnings missed env-driven over-cap pushes.

**Impl commit:** `243be51`. **Tightening commit:** `58d919b`.

**Engine changes (2 sites):**
1. Env first-layer bed warning at `engine.js:~L1637`: replaced static `"+${env.bed_first_layer_adj}°C applied"` template with a three-branch effective-delta computation:
   - Branch 1 (full apply): `"+N°C applied"` (original wording when `effectiveAdj === requestedAdj`)
   - Branch 2 (fully clipped): `"+N°C requested but fully clipped by <cap source>"` (when `effectiveAdj <= 0`)
   - Branch 3 (partially clipped): `"+X°C applied (requested +N°C, partially clipped by <cap source>)"` (when `0 < effectiveAdj < requestedAdj`)
   - `capSource` names binding cap (material vs printer) via `matBedCap <= prnBedCap` ternary.
2. `printer_max_bed_temp_clamped` initTarget at `engine.js:~L1742`: added `bedFirstLayerEnvAdj` so initTarget reflects the env-pushed initial-layer bed.

**Tightening fixes (`58d919b`):**
- Reviewer Important #3 (partial-clip branch dead-untested): added harness assertion (e) covering PLA+X1C+vcold (the only naturally-reachable partial-clip combo with current data).
- Reviewer Minor #5: brief safety comment above the `capSource` ternary.

**What to verify:**
- Read the three-branch computation at `engine.js:~L1637` carefully. Is the `effectiveAdj <= 0` guard inclusive of the boundary case where `effectiveAdj === 0` (exactly clipped to zero — what copy should fire)? Does it match the "fully clipped" semantic the user expects?
- Is the `capSource` ternary safe under all combinations? Specifically: `matBedCap <= prnBedCap` — what if `matBedCap === prnBedCap` (both caps equal)? The current code names whichever side the ternary picks; could that confuse users?
- The bed-temp formula is now duplicated **3× across engine.js**: in `getAdvancedFilamentSettings` (~L1227), in the new env-warning rewrite at L1637+, and in the `printer_max_bed_temp_clamped` initTarget at L1742+. Internal reviewer flagged this as Important #1 + #2 (math + `(isPETG ? 5 : 0)` magic constant). **Carry-forward to v1.0.5: extract `_computeInitBedTarget(state)` helper + data-drive `(isPETG ? 5 : 0)`**. Is the duplication acceptable for v1.0.4 ship, or does it block ship?
- Does the warning text accurately name the binding cap source ("material" / "printer") for the partial-clip case? Read the partial-clip branch wording.
- Is the partial-clip assertion combo (PLA+X1C+vcold → `bedAdj=5 + bed_first_layer_adj=10`, effective `min(70,65) - min(60,65) = 5`, partial-clipped by PLA's 65°C cap) actually correct math? Verify against `data/materials.json` PLA Basic + `data/rules/environment.json` vcold.

### Phase 1.5 LOW-01 — Test-contract hardening for retired warning IDs

**Codex finding (prior audit):** Retired warning IDs (`nozzle_too_small`, `creality_no_multicolor`, `k2_plus_cfs`) had no negative regression guards on their successor positive cases. A future refactor could silently re-introduce one of the retired IDs and the test suite would pass.

**Impl commit:** `d863635`. **Tightening commit:** `bc9c655`. Test-only changes (no engine surface).

**Changes:**
- `scripts/walkthrough-harness.js`: 4 new negative assertions
  - HIGH-12 block: `nozzle_too_small` absent on successor case (TPU 85A + std_0.4 → paired with positive `nozzle_below_min_diameter`)
  - MCS empty-MCS block: `creality_no_multicolor` absent on `centauri_carbon` (Elegoo) — generalized re-introduction guard
  - MCS CFS block: `k2_plus_cfs` absent on `k2_plus` CFS successor case
  - MCS CFS-Lite block: `k2_plus_cfs` absent on `sparkx_i7` CFS-Lite successor case
- `scripts/profile-matrix-audit.js` line 146 + line 283: 2 new `noWarning('k2_plus_cfs')` additions.

**Tightening fixes (`bc9c655`):**
- Reviewer Important #2: original `centauri_carbon` (Elegoo) empty-MCS sub-case didn't exercise the *manufacturer gate* the retirement removed (Creality-gated). Added parallel sub-case on `ender3_v3_se` (Creality manufacturer + empty MCS).
- HIGH-12 console.log updated to mention `nozzle_too_small` silence.

**TDD-RED demo:** Done deliberately on `nozzle_too_small` (assertion inverted to `includes` first, ran harness, observed expected fail with full warning-ID dump, flipped to `!includes`). Other 3 negative assertions trusted by symmetry.

**What to verify:**
- Are all 3 retired IDs (`nozzle_too_small`, `creality_no_multicolor`, `k2_plus_cfs`) actually unused in `engine.js`? Grep — should produce no engine-side hits. The harness/audit guards are the only references that should remain.
- Are the negative assertions placed at the **successor positive case**, not just any case where the retired ID happens to be silent? (For `nozzle_too_small`, the successor is `nozzle_below_min_diameter` firing on TPU 85A + std_0.4. For `creality_no_multicolor`, the successor is `mcs_empty_no_multicolor` on empty-MCS. For `k2_plus_cfs`, the successor is the CFS-tier MCS guidance.)
- The reviewer flagged (Important #1) that the literal-ID guards are **vacuous-by-construction against typo regressions**: a new code path emitting `nozzle_to_small` (one char off) would slip through. The fix recommendation was a shared `RETIRED_IDS` const array referenced from both harness and engine. Was that carried forward? (Per S7-4 log: deferred to multi-arc audit beyond v1.0.4 scope.) Does Codex agree that's acceptable, or should the shared-const-array land before ship?

## iOS side — what was built (S8 Phase 2.1)

**Implementation plan:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-05-14-s8-phase-2-1-ios-sync.md`. Read this for the full task breakdown.

**Session log:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s8-ios-sync.md`.

### What was changed

1. **Byte-identical sync** of 8 files (web → iOS):
   - `engine.js` (174618 → 201074 bytes)
   - `data/printers.json`, `data/materials.json`, `data/nozzles.json`
   - `data/rules/{environment,objective_profiles,slicer_capabilities,troubleshooter}.json`
   - Verified via `diff -q` on each. Note: only `engine.js`, `materials.json`, and `nozzles.json` show up in `git diff` — the other 5 files happened to be byte-identical pre-sync (printers.json from a separate 2026-05-12 SPARKX i7 hotfix at `eeb2915`; rules/*.json unchanged since pre-v1.0.4).

2. **11 new XCTests** in `3DPrintAssistantTests/EngineServiceTests.swift` mirroring web walkthrough invariants for **Phase 1 (8)** + **Phase 1.5 (3)**:
   - Phase 1: `testV104_T1_StrengthSpeedMultiplier`, `testV104_T2a_EnvDataLayerCold`, `testV104_T2b_EnvClampMisattribution`, `testV104_T3_PrinterNozzleGuard`, `testV104_T4_PrinterPlateGuard`, `testV104_T5_PracticalMCSTiers`, `testV104_T6_ChamberSafeCapGuard`, `testV104_T7_NozzleMinDiameter`.
   - Phase 1.5: `testV104_P1_5_HIGH01_ExportEnvFanDraftShield`, `testV104_P1_5_HIGH02_PLAColdChamberSafety`, `testV104_P1_5_MEDIUM01_BedClampAttribution`.

3. **4 file-private static helpers**: `numeric(_:)`, `parseTemp(_:)`, `toIntString(_:)`, `firstFromBSArray(_:)`.

4. **Tightening commit `fc3ee6b`** addressed 4 Important + 2 Minor findings from the internal-reviewer subagent (run after `350d23f`):
   - I-1: T6 added PLA chamber-cap branch entirely (X1E+PLA fires + X1C+PLA silent + guard text "50" check).
   - I-2: T2a added HIGH-05 banner check (regex-extract `+N°C` from warning, assert equals delta).
   - I-3: T6 added guard-text "50°C" content check on both PETG + PLA branches.
   - I-4: T3 tightened to exact ID `nozzle_not_on_printer` + multi-nozzle non-regression.
   - M-1: T4 tightened to exact ID `plate_bed_temp_range` + PLA non-regression.
   - M-2: T2b replaced loose substring with web's exact regex `/env_compensation_capped|env.*clamp|cold.*clamp/i`.

5. **TDD-RED demo on T1**: authored with `XCTAssertEqual(strongOuter, 999, accuracy: 0.01, ...)`, ran, observed `("90.0") is not equal to ("999.0")`, flipped to `, 90, ...`. **No artifact left in code** — only the commit body documents it.

6. **iOS XCTest:** 96 baseline → 107 unit (108 incl. ScreenCaptureUITests). All green on iPhone 17 Pro simulator (`5F8312F5-B1C2-46C8-8DE3-E9355475DCAF`, iOS 26.3.1, macOS 15.7.4).

7. **iOS push gate:** local HEAD `fc3ee6b`, `origin/main` `eeb2915` (2 commits ahead). **NOT pushed** — Phase 2 gate active until S9's 5-point ship-ready check.

### Known iOS-side coverage gap (S9 carry-forward)

`AdvancedFilamentSettings` Codable struct at `3DPrintAssistant/Engine/EngineService.swift:70-78` exposes only the four temperature fields. The web walkthrough's HIGH-07/08 ENV block uses `advNormal.fan_max_speed.value` for the env-fan-multiplier check; iOS cannot mirror this directly because the Swift struct drops `fan_max_speed` / `fan_min_speed` during Codable decode. **T2a fan coverage was dropped** and rely on **transitive coverage via `testV104_P1_5_HIGH01_ExportEnvFanDraftShield`** (text export `Fan speed (min): 63` + Bambu Studio `fan_min_speed[0]=63` / `fan_max_speed[0]=90`).

**S9 plan:** extend the Codable struct + decoder (small additive change) + re-extend T2a.

## Specific things to challenge

Be specific. Anchor every finding with `file:line` references on web AND iOS. Output format under the next section.

### A — Sync integrity (S8)

- **A1.** Run `diff -q` for all 8 sync targets between web `9603d37` and iOS `fc3ee6b`. Any divergence is **Critical**.
- **A2.** Are there web data/engine files **outside** the 8 that the iOS bundle also consumes? Check by grepping `EngineService.swift` for `Bundle.main.url(forResource:` / `Bundle.main.path(forResource:` and cross-referencing against the synced list. Any orphaned resource = potential bug.
- **A3.** Does the iOS `project.yml` / `3DPrintAssistant.xcodeproj/project.pbxproj` correctly bundle all data files? If `materials.json` got new fields in v1.0.4 (it did — `safe_chamber_temp_max`), is the Xcode project still bundling it?
- **A4.** Are there any data shape changes that broke the **forgiving Codable** rule (3dpa-context.md standing rule #9)? S8 ran a smoke test (full existing XCTest suite pre-additions) and got 96/96 green — but spot-check: is there any new required-in-spirit field that's currently optional in Swift Codable that could decode incorrectly?

### B — Engine.js correctness across Phase 1.5 surfaces (web)

For **each of the 4 Phase 1.5 findings**, verify the engine fix is correct end-to-end:

- **B1. HIGH-01 (`eaf3f09`):** Read the `exportBambuStudioJSON` filament block + `formatProfileAsText` fan line + BAMBU_PROCESS_MAP draft_shield entry. Are env-scaled values used everywhere fan is emitted in the export surfaces? Are there any other fan emissions (e.g., overhang fan, support cooling fan) that should ALSO be env-scaled but aren't?
- **B2. HIGH-02 (`a4b8873` + `f2aa84f`):**
  - Are the 3 engine sites consistently gated on `material.group === 'PLA'`? Grep for `plaHeatCreepPair` and read each call site.
  - Does the env-warning regex `/door closed|preheat the enclosure|preheat \(/i` cover ALL the natural-language variants present in `data/rules/environment.json` for cold + vcold? Read the env rules file and enumerate.
  - PLA-CF and PLA Metal both got `safe_chamber_temp_max: 50` — is that defensible vs their actual heat-resistance datasheet values? Verify against material vendor specs.
- **B3. MEDIUM-01 (`243be51` + `58d919b`):**
  - Re-verify the three-branch logic at `engine.js:~L1637`. Is the `effectiveAdj <= 0` boundary handling correct? (`effectiveAdj === 0` should fire "fully clipped" copy, not "+0°C applied".)
  - Is `capSource` correct for the edge case where `matBedCap === prnBedCap`? Read the ternary.
  - **The bed-temp formula is now duplicated 3× across engine.js** (`getAdvancedFilamentSettings` ~L1227, env-warning ~L1637, `printer_max_bed_temp_clamped` ~L1742). Plus `(isPETG ? 5 : 0)` magic constant duplicated 3×. Internal reviewer flagged both as Important#1/#2 follow-ups. **Question for Codex:** does this duplication block v1.0.4 ship, or is it safely deferrable to v1.0.5? Specifically — if a future engine.js touch updates one of the 3 sites and forgets the others, what's the failure mode and which test surface (walkthrough / matrix-audit) would catch it?
- **B4. LOW-01 (`d863635` + `bc9c655`):**
  - Verify retired IDs (`nozzle_too_small`, `creality_no_multicolor`, `k2_plus_cfs`) are NOT emitted anywhere in `engine.js`. Any residual emission = Critical.
  - Internal reviewer suggested a shared `RETIRED_IDS` const array referenced from both harness + engine to defend against typo regressions. Was that carried forward? (Per S7-4 log: deferred.) Codex's call: does this block ship, or is "test-only contract hardening" enough for v1.0.4?

### C — Walkthrough harness + matrix-audit coverage (web)

- **C1.** Are all 11 cumulative v1.0.4 walkthrough OK lines actually green on the post-S8 web HEAD? Run `node scripts/walkthrough-harness.js` and verify.
- **C2.** Does `scripts/profile-matrix-audit.js` (47196 broad configs across 55/55 curated) stay clean? Run it.
- **C3.** **profile-matrix-audit env-axis blind spot** — internal reviewer flagged that `DEFAULT_STATE.environment = 'normal'` means the broad sweep does NOT exercise cold/vcold environments. New MEDIUM-01 surfaces (env first-layer bed warning copy branches, env-contributed `printer_max_bed_temp_clamped`) are entirely outside the sweep. Filed as backlog hygiene. **Codex call:** does this block ship, or is the curated harness enough?
- **C4.** Is the new HIGH-01 export assertion block (`scripts/walkthrough-harness.js:~612-660`) actually exercising both text export AND BS export? Are the threshold values (63 / 90 / `enable_draft_shield="1"`) correct for PLA + cold env?
- **C5.** Is the MEDIUM-01 assertion block (`scripts/walkthrough-harness.js:~1110-1221`) covering all 3 copy branches (full apply / fully clipped / partially clipped) AND the printer-cap pair? Spot-check the assertion text vs the engine emission.
- **C6.** Is the LOW-01 negative-assertion placement correct? Specifically — the `creality_no_multicolor` guard pairs on BOTH `centauri_carbon` (Elegoo, generalized re-introduction) AND `ender3_v3_se` (Creality, manufacturer-gated re-introduction). The second pair was added in tightening. Is that pairing strategy correct, or is one pair sufficient?

### D — iOS XCTest 1-for-1 alignment with web walkthrough

For **each of the 11 `testV104_*` tests**:

- **D1.** Does the iOS test assert the **same key invariants** the corresponding web walkthrough block proves? List anything web asserts that iOS doesn't.
- **D2.** Substring matchers (post-tightening, expected to be tight on most tests):
  - **T2b (line ~1043 area):** uses regex `/env_compensation_capped|env.*clamp|cold.*clamp/i` via `NSRegularExpression`. Is the regex correct mirror of web?
  - **T3 (line ~1080 area):** tightened to exact `nozzle_not_on_printer`. Correct?
  - **T4 (line ~1110 area):** tightened to exact `plate_not_on_printer` + `plate_bed_temp_range`. Correct?
  - **T7 (line ~1190 area):** exact `nozzle_below_min_diameter` + body `.contains("0.4")` / `.contains("0.6")` / NOT `.contains("0.2")`. Correct?
  - Any **remaining** loose substring matchers in any other v1.0.4 test? Flag with `file:line`.
- **D3. T5 PracticalMCSTiers** — does it cover all 5 tiers (`none` / `ams_lite` / `ams_like` / `cfs` / `generic_non_ams`)? The current iOS test covers empty-MCS + ams_like + CFS + Creality empty-MCS. Are `ams_lite` (A1/A1Mini gating) and `generic_non_ams` (Filament Hub / Toolchanger / etc.) materially uncovered?
- **D4. T6 ChamberSafeCapGuard** — does it now cover BOTH the PETG branch AND the PLA branch with guard-text "50" check? (Tightening was supposed to add this.) Verify.
- **D5. T2a EnvDataLayerCold** — the HIGH-05 banner regex `\+\s*(\d+)\s*°?C` extraction: could it match an unrelated "+N°C" phrase in a different warning's text (e.g., "+5°C nozzle adj" embedded somewhere)? Is the `first[\s-]?layer\s+bed` filter strict enough?
- **D6.** Are there v1.0.4 behaviors in the walkthrough (Phase 1 + Phase 1.5) **without** an iOS mirror at all? Grep `v1.0.4` block headers in `scripts/walkthrough-harness.js` and cross-check `testV104_*` count in `EngineServiceTests.swift`.
- **D7. Helper safety:**
  - `numeric()` strips ` mm/s` / ` mm` / `%` / `°C`. What does it do on `"5/15°C"` (range strings) or `"Enabled"` (booleans)? Are there `ProfileParam` values that fall into either format?
  - `parseTemp()` strips `°` then `C` everywhere. What about `"125°C cap reached"` — does it strip the `C` from `cap`? Currently unused that way, but is it a footgun?
  - `toIntString()` handles `String` / `Int` / `Double`. What if it's `NSNumber` (which JSCore marshals through dictionaries)? `as? Int` does bridge — but `as? String` does not.
  - `firstFromBSArray()` casts to `NSArray`, takes index 0. What if the JS array contains `null`? What if the array is empty?

### E — T2a fan-coverage drop justification

Claim: iOS `AdvancedFilamentSettings` Codable struct doesn't expose fan; transitive coverage via P1.5 HIGH-01 export is sufficient.

- **E1.** Is that justification correct? Verify by reading both `EngineService.swift:70-78` (struct) AND the JS `getAdvancedFilamentSettings` output in `engine.js` (does the JS return `fan_max_speed` / `fan_min_speed` in that bridge call?). If JS returns them but Swift drops them, that's a Codable bug, not a fundamental gap.
- **E2.** Is the transitive coverage via export surfaces **actually sufficient** for the HIGH-07/08 invariant? The web walkthrough's HIGH-07 check uses the Advanced filament panel surface; P1.5 HIGH-01 uses Export surfaces. Could a regression that re-disables `env.fan_multiplier` on the Advanced surface (but keeps it on Export) slip through iOS XCTest?
- **E3.** Should the AdvancedFilamentSettings struct extension land in S9 BEFORE ship, or is it safely deferrable to v1.0.5? **Codex call.**

### F — LOW-01 skip justification (iOS)

Claim: LOW-01 is test-only on web with no engine surface; retired-ID silence is covered by `XCTAssertFalse(ids.contains("retired_id"))` checks inside T5 + T7. No dedicated iOS test needed.

- **F1.** Is that correct? Specifically:
  - T5 asserts `creality_no_multicolor` absent on Elegoo `centauri_carbon` empty-MCS (line ~1135) AND `creality_no_multicolor` absent on Creality `ender3_v3_se` empty-MCS (line ~1147). Same manufacturer-gate guard as web. ✓
  - T5 asserts `k2_plus_cfs` absent on `k2_plus` (line ~1142). Does NOT cover CFS-Lite `sparkx_i7` case. Is that a gap?
  - T7 asserts `nozzle_too_small` absent on TPU 85A + std_0.4 (line ~1192) AND `cf_small_nozzle` absent (line ~1194). ✓
- **F2.** Are there walkthrough LOW-01 negative assertions that have NO iOS mirror? Compare web `scripts/walkthrough-harness.js` LOW-01 guards against iOS coverage. List any gaps.

### G — TDD-RED breadcrumb gap

Claim: T1 was authored with deliberately-inverted assertion (`XCTAssertEqual(strongOuter, 999, ...)`), run, observed RED, flipped. Other 10 tests trusted by symmetry. Internal reviewer Minor #4: "self-reported only — no artifact in code or commit history."

- **G1.** Is this process gap acceptable, or should every multi-test mirror commit include either (a) a `// RED demo verified YYYY-MM-DD` breadcrumb in the code, or (b) a tiny pre-commit with the inverted assertion that gets reverted in a follow-up? **Codex call.**
- **G2.** Did the other 10 tests warrant the symmetry shortcut? Specifically: each `testV104_*` uses a different combination of `EngineService.shared.X(state)` call + assertion pattern. Could any of them silently pass for the wrong reason without the RED demo?

### H — Carry-forwards from internal reviewer (deferred to S9 / v1.0.5)

The internal-reviewer subagents (across Phase 1.5 + S8) surfaced findings the committers deferred. **Codex's call: do any of these block ship?**

- **H1.** S7-3 reviewer Important #1: `_computeInitBedTarget(state)` helper extraction (3 engine sites duplicate the same bed-temp math).
- **H2.** S7-3 reviewer Important #2: `(isPETG ? 5 : 0)` magic constant — should be data-driven via `material.initial_layer_group_offset` or similar.
- **H3.** S7-3 reviewer Minor #6: profile-matrix-audit env-axis blind spot (sweeps only `environment: 'normal'`).
- **H4.** S7-3 reviewer Minor #7: visual mobile-card warning text length check before ship. Partial-clip wording is ~140 chars (longest in v1.0.4 arc).
- **H5.** S7-3 reviewer Hidden assumption #1: smoke assertion that emitted `bed_temperature_initial_layer` equals the env-warning's claimed effective bed value.
- **H6.** S7-4 reviewer Important #1: shared `RETIRED_IDS` const array (typo-class regression defense).
- **H7.** S8 reviewer Minor M-4: TDD-RED breadcrumb pattern.
- **H8.** S8 carry-forward: extend `AdvancedFilamentSettings` Codable struct to expose fan — closes the only iOS-side v1.0.4 mirror gap.

### I — Cross-cutting

- **I1.** Is the **iOS push gate semantics** correct? Two iOS local commits (`350d23f` + `fc3ee6b`) on top of `eeb2915` without push. S9 plans one more commit + then push after 5-point check. Is "no autonomous push to iOS `main`" the right Phase 2 posture, or should the first sync commit have pushed?
- **I2.** Does the **5-point ship-ready check** (all planned changes landed / iOS XCTest green at 108 / walkthrough green / MARKETING_VERSION bumped / owner ready) adequately gate ship? Anything missing from the checklist?
- **I3.** **Web auto-deploy** — every Phase 1.5 commit on web auto-deploys to Cloudflare Pages without an iOS counterpart. Owner verifies live each time per ROADMAP. Are there any Phase 1.5 surfaces that should have been gated behind a flag (e.g., behind feature detection) instead of shipping web-first?
- **I4.** Deferred from prior Codex audit: **MEDIUM-02 + OBSERVATION-01**. What's their current status — still appropriate for v1.0.5 deferral, or should one or both be re-considered for v1.0.4 inclusion before ship?
- **I5.** **Engine + data byte-identity rule** — the standing rule says "web is master, iOS mirrors byte-identical." After S8 sync this holds. Does any of the Phase 1.5 work introduce a behavior that DEPENDS on the byte-identical assumption (e.g., a numeric threshold that's compared across the bridge)? If yes, what's the failure mode if web ever drifts ahead of iOS without a sync?

## Output format

Structured report under 1200 words:

- **Critical**: must-fix before any further action (pause v1.0.4 ship).
- **Important**: must-fix before iOS push / TestFlight dispatch.
- **Medium**: fix before v1.0.4 ship if cheap; otherwise carry to v1.0.5.
- **Low**: defer to v1.0.5 or beyond.
- **Observation**: noted but not actionable, or already filed as carry-forward.
- **Strengths**: brief; what the committers + internal reviewers got right.
- **GO/NO-GO**: is v1.0.4 ready for S9 + TestFlight dispatch, or pause for a tightening cycle?

Anchor every finding with `file:line` references for BOTH the web finding AND (if iOS-relevant) the iOS analog. Be specific. The internal-reviewer pattern is 4-for-4 across Phase 1.5 + S8 — match or beat that bar.

## Notes for the audit

- **Don't audit the prior Codex audit's recommendations** themselves — those landed as the 4 Phase 1.5 findings shipped here. Audit the **shipped remediations** instead.
- **Don't re-audit Phase 1 (Tasks 1-7)** — already covered in `codex/v1.0.4-audit/`.
- **Owner posture:** "Quality is key. No cutting corners." If you find anything that smells off, surface it.
- **Web is live worldwide; iOS is local-only.** Web auto-deploys on push. iOS is gated until S9 5-point check passes. Findings on web are higher-stakes per commit; findings on iOS are caught by the S9 gate.

When ready, place your structured response at `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/post-phase-1-audit/codex-2026-05-14-post-phase-1-audit-response.md`.
