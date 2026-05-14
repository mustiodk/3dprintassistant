# Codex audit packet — post-S8.5 (v1.0.4 ship-readiness re-audit)

**Status:** ready for owner dispatch. **Owner-gated** — run Codex against this packet manually.

## Why a second audit pass

The prior audit `codex/post-phase-1-audit/codex-2026-05-14-post-phase-1-audit-response.md` flagged:

- **Important #1** — `cooling_fan_overhang` unscaled by `env.fan_multiplier` across 3 emission surfaces.
- **Important #2** — iOS `AdvancedFilamentSettings` Codable struct doesn't expose fan; T2a relied on transitive coverage.
- **Medium #1** — iOS `testV104_T5_PracticalMCSTiers` materially narrower than web walkthrough (covered 4 of 7+ sub-cases).
- **Low #1** — TDD-RED breadcrumb convention not codified.

Verdict was **NO-GO for iOS push / TestFlight** until the two Important items were fixed.

**S8.5 remediated all four findings**, and the internal-reviewer subagent caught a 5th substantive miss during the S8.5 review cycle (reviewer's `I-1` — see Tightening below). This packet asks Codex to confirm the remediations hold + spot for new finds before S9 (UI walkthrough + MARKETING_VERSION bump + owner TestFlight dispatch).

## Scope

- **Web:** `9603d37..HEAD` (post-S8 close → post-S8.5 close). 4 commits pushed.
- **iOS:** `fc3ee6b..HEAD` (post-S8 tightening → post-S8.5 tightening). 3 commits local-only.
- **Out of scope:** Phase 1 (already audited at `codex/v1.0.4-audit/`). Prior carry-forwards (math duplication, isPETG magic, matrix env-axis sweep, RETIRED_IDS const, mobile-card text-length) remain v1.0.5 — note if S8.5 changed any priority, but don't fully re-audit.

## Repos + SHAs

**Web:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant` — `origin/main` matches HEAD.
**iOS:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios` — `origin/main` still at `eeb2915`, local 4 commits ahead. Phase 2 gate active.

**Diff snapshot (pre-generated):** `codex/post-s8-5-audit/v1.0.4-since-post-phase-1-codex.diff` (612 lines, web + iOS combined).

**Generate live snapshots:**

```bash
# Web
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant log --oneline 9603d37..HEAD
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant diff 9603d37..HEAD --stat

# iOS
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios log --oneline fc3ee6b..HEAD
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios diff fc3ee6b..HEAD --stat
```

## Commits in scope

### Web (newest first, pushed)

| SHA | Subject | Maps to |
|---|---|---|
| `6e06404` | fix: tighten S8.5 — env-scale resolveProfile p.fan_speed (reviewer I-1) + float-tolerant fanMult identity check (reviewer M-3) | **Tightening — reviewer's catch** |
| `be5c4e8` | docs: TDD-RED breadcrumb convention in ai-collab.md (S8.5 Codex Low) | **F4** |
| `b3111cf` | fix: env-scale cooling_fan_overhang across all surfaces (S8.5 Codex Important #1) | **F1** |

### iOS (newest first, **local-only — NOT pushed**)

| SHA | Subject | Maps to |
|---|---|---|
| `fd4761a` | chore: sync engine post-S8.5-tightening (web 6e06404 — p.fan_speed env-scaling) | **Tightening sync** |
| `6970c86` | test: extend testV104_T5_PracticalMCSTiers MCS coverage breadth (S8.5 Codex Medium) | **F3** |
| `fef685e` | chore: sync engine post-F1 + extend AdvancedFilamentSettings Codable for fan (S8.5 Codex Important #1 + #2) | **F2** |

## Files touched (web 9603d37..HEAD code + data only)

```
docs/ai-collab.md              | +38 lines  (F4 breadcrumb convention)
engine.js                      | +71 / -8  (F1 overhang + tightening fan_speed + M-3 fanMultIsIdentity)
scripts/walkthrough-harness.js | +47 / -2  (F1 overhang assertions + tightening fan_speed assertion)
```

## Per-finding remediation

### F1 — Codex Important #1 (overhang fan unscaled)

**Web commit:** `b3111cf`

**Engine changes (`engine.js`):**
- **Hoisted** `overhangScaled = round(bs.cooling_fan_overhang × fanMult)` alongside the existing `fanMaxScaled` / `fanMinScaled` calc at `engine.js:1247-1257`.
- `engine.js:1259` `getAdvancedFilamentSettings` returns `cooling_fan_overhang: overhangScaled` (was raw `bs.cooling_fan_overhang`).
- `engine.js:1306-1308` `_prov.cooling_fan_overhang` flips `source` to `'rule'` when `fanMult != 1.0`.
- `engine.js:3144` BS export switched from `bs.cooling_fan_overhang` to `adv.cooling_fan_overhang` (auto-scaled).
- `engine.js:3221` text export already reads `adv.cooling_fan_overhang` (no edit needed — auto-picks scaled value).
- `engine.js:1122` `getFilamentProfile.cooling_overhang` **intentionally stays raw** — this is the state-less material-reference panel display (no `env` access). Reviewer accepted this scope.

**Walkthrough (`scripts/walkthrough-harness.js:659-686`):**
- P1.5 HIGH-01-export block extended with 3 overhang assertions:
  1. Text export `Overhang fan speed: 90` (was `100`).
  2. BS export `filament.overhang_fan_speed[0] === "90"`.
  3. Advanced surface `advCold.cooling_fan_overhang === 90`.
- Console.log mentions all 4 fan dimensions: `min=63, max=90, overhang=90, profile fan_speed=90%`.

**TDD-RED:** assertion landed RED first ("text export Overhang fan speed=100 should match env-scaled 90") proving machinery + bug both verified before engine fix.

### F2 — Codex Important #2 (iOS Codable fan extension)

**iOS commit:** `fef685e`

**Codable struct (`EngineService.swift:70-86`):**
```swift
struct AdvancedFilamentSettings {
    let initialLayerTemp: String
    let otherLayersTemp: String
    let initialLayerBedTemp: String
    let otherLayersBedTemp: String
    let fanMinSpeed: String?         // NEW
    let fanMaxSpeed: String?         // NEW
    let coolingFanOverhang: String?  // NEW
    let prov: [String: Provenance]
}
```

**Decoder (`EngineService.swift:684-708`):**
- `fan_min_speed` / `fan_max_speed` read S-wrapped `.value` (engine emits `{value: "63", why, _prov}` dict).
- `cooling_fan_overhang` read permissively: `as? String` first, then `as? NSNumber` fallback (post-F1 engine emits the env-scaled Int; JSCore → JSONSerialization marshals as NSNumber).
- Fallback constructor at lines 675-684 carries `nil` for all three.

**XCTest extensions (`EngineServiceTests.swift`):**
- `testV104_T2a_EnvDataLayerCold` (line ~1003+): direct Advanced-surface assertions via `advCold.fanMaxSpeed` / `fanMinSpeed` / `coolingFanOverhang`. Drops the now-obsolete scope-note from the docstring.
- `testV104_P1_5_HIGH01_ExportEnvFanDraftShield` (line ~1218+ / ~1234+): overhang assertions on BS export (`firstFromBSArray(bs.filament["overhang_fan_speed"]) == "90"`) and text export (regex `Overhang fan speed:\s*(\d+)` captures "90").
- New `parseFan()` helper throws via `XCTUnwrap` on nil so a missing Codable decode fails loudly.

### F3 — Codex Medium #1 (T5 MCS coverage breadth)

**iOS commit:** `6970c86`

**6 new sub-cases appended to `testV104_T5_PracticalMCSTiers` (`EngineServiceTests.swift:1227-1297`):**

| Sub-case | Setup | Assertion |
|---|---|---|
| (a) AMS-Lite gate fires | a1 + abs + multi_2_4 | `ams_lite_material_incompat` present |
| (b) AMS-Lite compatible | a1 + pla_basic + multi_2_4 | `ams_lite_material_incompat` absent |
| (c) CFS positive | k2_plus + pla_basic + multi_2_4 | `mcs_tier_cfs_guidance` present |
| (d) CFS-Lite system label | sparkx_i7 + pla_basic + multi_2_4 | `mcs_tier_cfs_guidance` present + retired `k2_plus_cfs` silent |
| (e) Generic non-AMS | mk4 + pla_basic + multi_2_4 | `mcs_tier_generic_non_ams_guidance` present |
| (f) multi_5 empty-MCS | centauri_carbon + pla_basic + multi_5 | `prime_tower` + `flush_into_infill` both NOT containing "enabled" |

All warning IDs grepped from web walkthrough source per `feedback_ios_xctest_exact_ids` — no speculative substring matchers.

### F4 — Codex Low #1 (TDD-RED breadcrumb convention)

**Web commit:** `be5c4e8`

`docs/ai-collab.md` extended at the bottom (after "3dpa Standing Rules") with a "TDD-RED breadcrumb" subsection. Two acceptable patterns codified:
1. Inverted-first on one representative + breadcrumb (code comment OR pre-commit reverted in follow-up).
2. Skip with explicit commit-body note for degenerate-RED test-only batches.

### Tightening — Reviewer I-1 + M-3 (caught by internal-reviewer subagent)

**Web commit:** `6e06404`. **iOS commit:** `fd4761a`.

The internal-reviewer subagent dispatched after F1-F4 caught a 4th env-scaling surface missed by both the S8.5 committer AND Codex's prior audit:

**`resolveProfile`'s `p.fan_speed` at `engine.js:2641-2667`** was emitting raw `'100%' / '50%' / '25%' / '0%'` from `fanMap[material.fan_policy]` without applying `env.fan_multiplier`. Same intent as the F1 fixes ("reduce cooling in cold envs to preserve layer adhesion") — same bug, different surface. The `fan_speed` chip is the labeled "Fan speed" column rendered in every slicer tab (Bambu / Prusa / Orca), so the live profile output told users "100%" while the F1-corrected surfaces emitted "90%" for cold env. Inconsistency exactly Codex would catch on re-audit.

**Fix:**
- `engine.js:2641-2667`: `fanMap` converted from string-with-% to integer; local `fanMultProfile` + `fanMultIsIdentity` computed (env is in scope at line 2132); `p.fan_speed` emits `${scaledPct}%` with prov flipped to `'rule'` and `ref: 'env.fan_multiplier × materials.json#fan_policy'` when scaling applies.
- `engine.js:1246-1253`: hoisted `fanMultIsIdentity = Math.abs(fanMult - 1.0) < 1e-9` for M-3 float-tolerance; replaced all 5 sites of strict `fanMult !== 1.0` with `!fanMultIsIdentity`.
- Walkthrough `scripts/walkthrough-harness.js:679+`: extended P1.5 HIGH-01-export block with `PLA+cold profCold.fan_speed.value === '90%'` + `profCold.fan_speed.prov.source === 'rule'` assertion. Console.log now mentions `profile fan_speed=90%`.

iOS: re-cp engine.js post-tightening → byte-identical (203404 bytes). XCTest 108/108 still green — existing T2a / T12 / T5 + helpers decode the new `fan_speed` shape without changes.

## Verification evidence (live, post-S8.5)

```
node scripts/walkthrough-harness.js   →  11 v1.0.4 OK lines (HIGH-01-export
                                          now asserts overhang=90 + profile
                                          fan_speed=90%)
node scripts/validate-data.js          →  6/6 clean
node scripts/profile-matrix-audit.js   →  No core failures; 47196 broad +
                                          55/55 curated
iOS XCTest (iPhone 17 Pro, x86_64)     →  108 passed / 0 failed
                                          (107 unit + 1 ScreenCaptureUITest)
```

## Specific things to challenge

Anchor every finding with `file:line` on BOTH repos.

### A — Env-scaling exhaustiveness (cross-cutting)

S8.5 now scales `env.fan_multiplier` across **4 surfaces**: `fan_max_speed`, `fan_min_speed`, `cooling_fan_overhang` (all in `getAdvancedFilamentSettings`), and `p.fan_speed` (in `resolveProfile`). Plus the BS export filament block reads these via `adv.*`, and text export likewise.

- **A1.** Is there a 5th surface still emitting raw fan? Specifically, grep `engine.js` for: `aux_fan`, `support_fan`, `cooling_fan_initial`, `additional_cooling_fan`, `fan_speed`, `cooling_fan`, anything emitting a fan percentage. Confirm coverage is exhaustive.
- **A2.** `getFilamentProfile.cooling_overhang` at `engine.js:1122` stays raw because it's state-less. Verify this is correct (the function takes only `materialId`, no `state`) AND that no future refactor would silently start passing state without env-scaling. Worth a code-level invariant comment?
- **A3.** The float-tolerant `fanMultIsIdentity = Math.abs(fanMult - 1.0) < 1e-9` is correct for normal env values (0.9, 0.8, 1.0). What if a future env defines `fan_multiplier: 0` (full cooling kill)? `fanMult > 0` guard at line 1246 falls back to `1.0` for `0` → silent identity. Intentional? Should `0` be respected as "fan off completely"?

### B — F1 correctness (engine + walkthrough)

- **B1.** Read `engine.js:1247-1257`, `1259`, `3144`. Are the 3 emission sites genuinely consistent — i.e., do BS export + text export + Advanced surface all show the *same* env-scaled overhang value for PLA+cold (90)?
- **B2.** The `bs.cooling_fan_overhang != null` guard at line 1252 returns `null` when the material has no overhang. BS export at line 3144 gates on `adv.cooling_fan_overhang != null` — consistent. But the BS export line `[String(parseInt(adv.cooling_fan_overhang) || 0)]` would output `"0"` if the parseInt fails. Is that the right default, or should the field be omitted entirely?
- **B3.** Walkthrough hardcodes `Math.round(100 * 0.9) = 90` — durable only as long as PLA's `cooling_fan_overhang` stays at `"100%"`. Could a future `_tuned` PLA override break this baseline silently?

### C — Tightening (reviewer I-1) correctness

- **C1.** Read `engine.js:2641-2667`. Is the env-scaling logic correct for ALL four `fan_policy` values? Specifically: `off` (0 × 0.9 = 0 → `"0%"`) — still semantically correct; `low` (25 × 0.9 = 22.5 → rounds to 23 → `"23%"`); `moderate` (50 × 0.9 = 45 → `"45%"`); `high` (100 × 0.9 = 90 → `"90%"`). Are these clinically defensible recommendations, or does any of them produce a value that's misleading?
- **C2.** The why-string concatenation `${baseWhy} Reduced to ${Math.round(fanMultProfile * 100)}% of recommendation for cold environment.` — is this user-friendly + accurate? Read the concatenated text for cold (90%) and vcold (80%) envs.
- **C3.** The walkthrough assertion at `scripts/walkthrough-harness.js:683-686` asserts both value AND prov.source. Is the prov flip correct end-to-end (i.e., when fanMultProfile=1.0, source='default'; when !=1.0, source='rule')?

### D — F2 + iOS Codable

- **D1.** Decoder at `EngineService.swift:684-693`: does the `cooling_fan_overhang` permissive cast (String → NSNumber fallback) handle the actual JSCore marshaling correctly? Verify by reading what JS emits at `engine.js:1259` (after F1) — it's a Number, not a string.
- **D2.** Are the new Codable fields surfaced anywhere in the iOS UI? Check `3DPrintAssistant/Views/Output/FilamentSettingsView.swift` + `OutputViewModel.swift`. If unused, they're test-only — fine for v1.0.4 per Codex's prior call, but flag the UI integration as a separate work item if needed.
- **D3.** `parseFan` helper at `EngineServiceTests.swift:~1410+`: throws on nil via `XCTUnwrap`. What if a material genuinely has no `cooling_fan_min` (some don't)? T2a uses PLA Basic which emits all three. Is there any test combo where a missing field would crash the helper unexpectedly?

### E — F3 MCS coverage exhaustiveness

- **E1.** T5 now covers 4 + 6 = 10 sub-cases. Web walkthrough's MCS block (`scripts/walkthrough-harness.js:803-915`) covers ~9 named checks. Any web invariant still unmirrored on iOS?
- **E2.** Sub-case (e) uses `mk4` for generic_non_ams tier. Verify by reading `data/printers.json` mk4 entry — does it actually fall in the `generic_non_ams` tier today? If a future printer reclassification moves mk4, the assertion silently fails.
- **E3.** Sub-case (f) uses `centauri_carbon` + `multi_5`. Web walkthrough at line 906-914 asserts the same combo. Does the iOS test's lowercase-contains "enabled" check match web's `/enabled/i.test(...)` regex semantically?

### F — F4 convention

- **F1.** `docs/ai-collab.md` TDD-RED subsection. Is it actionable + falsifiable? Read it cold and decide whether a future agent would correctly apply it.
- **F2.** F1's commit body documents the RED demo but no code breadcrumb was added (the convention only landed in F4 afterwards). Should F1 retroactively get a `// RED demo verified 2026-05-15: ...` comment near `scripts/walkthrough-harness.js:670`?

### G — Cross-cutting

- **G1.** **Byte-identity:** `diff -q` all 8 sync targets between web HEAD and iOS HEAD. Any drift = Critical.
- **G2.** **iOS test count:** should still be 107 unit + 1 UI = 108. Confirm via `grep -c "func test" 3DPrintAssistantTests/*.swift`.
- **G3.** **Carry-forwards from prior audit** that S8.5 may have nudged:
  - Math duplication: now 4 sites (fanMax, fanMin, overhang in getAdvancedFilamentSettings + fan_speed in resolveProfile). Reviewer M-2 flagged this is "actively painful" post-S8.5. Does this block v1.0.4 ship?
  - `isPETG ? 5 : 0` magic constant: unchanged.
  - profile-matrix-audit env-axis blind spot: unchanged, but more env-emission surfaces now uncovered by the broad sweep (DEFAULT_STATE.environment = 'normal').
  - RETIRED_IDS const: unchanged.
  - mobile-card text-length: unchanged.
- **G4.** **Reviewer 5-for-5 streak:** the internal-reviewer pattern caught a substantive Important on every Phase 1.5 + S8 + S8.5 session. Is the pattern still adding marginal value, or is it becoming a self-fulfilling exercise? Honest assessment.

## Output format

Structured report under 1200 words:

- **Critical**: must-fix before any further action (pause v1.0.4 ship).
- **Important**: must-fix before iOS push / TestFlight dispatch.
- **Medium**: fix before v1.0.4 ship if cheap; otherwise carry to v1.0.5.
- **Low**: defer.
- **Observation**: noted but not actionable, or already filed as carry-forward.
- **Strengths**: brief.
- **GO/NO-GO**: is v1.0.4 ready for S9 + TestFlight dispatch, or pause for another tightening cycle?

Anchor every finding with `file:line` on BOTH repos where applicable.

## Notes for the audit

- **Web is live + auto-deploys per commit.** The F1 / tightening fan-scaling fixes are already live on `3dprintassistant.com`. iOS is gated.
- **Owner standing rule:** "Quality is key. No cutting corners."
- **If you find anything Important+, surface it explicitly.** Don't soften.
- **If clean (no Critical / Important):** v1.0.4 proceeds to S9 (UI walkthrough + MARKETING_VERSION 1.0.3 → 1.0.4 + 5-point ship-ready handoff + owner TestFlight dispatch).

When ready, place your structured response at:
`/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/post-s8-5-audit/codex-2026-05-15-post-s8-5-audit-response.md`.
