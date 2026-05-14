# Codex audit packet — post-S8.7 (v1.0.4 final pre-S9 audit)

**Status:** ready for owner dispatch. **Owner-gated** — run Codex against this packet manually.

## Why a third audit pass

The prior audit `codex/post-s8-5-audit/codex-2026-05-15-post-s8-5-audit-response.md` returned **GO for S9** with:

- **Critical / Important:** none.
- **Medium #1:** iOS Advanced cooling tab still renders raw `filProfile.coolingFanMin` / `coolingFan` instead of env-scaled `advancedSettings.fanMinSpeed` / `coolingFanOverhang`. UI parity gap; bridge data was correct.
- **Medium #2:** `fan_multiplier: 0` is schema-legal but engine-invalid-by-guard (silent fallback to `1.0`).
- **Low #1:** TDD-RED breadcrumb convention has one contradictory sentence pair (commit-body OR test code "either way" weakens the inverted-first rule).
- **Low #2:** iOS T5 mirror gap — x1c AMS-like sub-case asserts only `prime_tower`; web walkthrough also asserts NOT firing `ams_lite_material_incompat` / `mcs_empty_no_multicolor`.

Owner directive after the GO verdict: "we fix everything found by codex before proceeding." **S8.7 remediated all 4 findings in one session** (2 web + 2 iOS commits). The internal-reviewer subagent dispatched across the S8.7 SHA range returned **VERDICT: GO** with 1 reviewer-surfaced Medium (M1 — schema/engine asymmetry on `fan_multiplier > 1`) + 4 Minor — none Codex-originated, all carried to v1.0.5.

This packet asks Codex to confirm the 4 S8.7 remediations hold + spot any new issues before S9 (UI walkthrough + MARKETING_VERSION 1.0.3 → 1.0.4 + 5-point ship-ready handoff + owner TestFlight dispatch). **If Codex returns clean (no Critical / Important), S9 proceeds with no further audit gate.**

## Scope

- **Web:** `d9e58fa..HEAD` (post-S8.5 close → post-S8.7 close). 3 commits pushed.
- **iOS:** `fd4761a..HEAD` (post-S8.5 sync → post-S8.7 cleanup). 2 commits local-only.
- **Out of scope:** Phase 1 (audited at `codex/v1.0.4-audit/`). S8.5 fixes (audited at `codex/post-s8-5-audit/` — returned GO). Prior carry-forwards (math duplication, `isPETG ? 5 : 0` magic, matrix env-axis sweep, RETIRED_IDS const, mobile-card text-length, slow-layer-time row) — all remain v1.0.5 unless S8.7 nudged priority.

## Repos + SHAs

**Web:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant` — `origin/main` matches HEAD (`872e05f`).
**iOS:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios` — `origin/main` still at `eeb2915`, local **7 commits ahead** (`ad46fd3`). Phase 2 gate active.

**Diff snapshots (pre-generated):**
- `codex/post-s8-7-audit/s8-7-combined.diff` (171 lines — code + data only, excludes docs metadata noise from the close commit).
- `codex/post-s8-7-audit/web-d9e58fa..HEAD-log.txt` + `*-stat.txt`.
- `codex/post-s8-7-audit/ios-fd4761a..HEAD-log.txt` + `*-stat.txt`.

**Generate live snapshots:**

```bash
# Web
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant log --oneline d9e58fa..HEAD
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant diff d9e58fa..HEAD --stat

# iOS
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios log --oneline fd4761a..HEAD
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios diff fd4761a..HEAD --stat
```

## Commits in scope

### Web (newest first, pushed)

| SHA | Subject | Maps to |
|---|---|---|
| `872e05f` | docs: wrap v1.0.4 S8.7 — Codex post-S8.5 re-audit cleanup | Trigger A close (docs only) |
| `48304d3` | fix: validate fan_multiplier range (0, 1] (Codex Medium #2) | **F2** |
| `746244e` | docs: clarify TDD-RED breadcrumb convention (Codex Low #1) | **F1** |

### iOS (newest first, **local-only — NOT pushed**)

| SHA | Subject | Maps to |
|---|---|---|
| `ad46fd3` | test: mirror x1c AMS-like must-not-fire warnings in T5 (Codex Low #2) | **F4** |
| `41c9956` | fix: render env-scaled fan values in Advanced cooling UI (Codex Medium #1) | **F3** |

## Files touched (code + data only — docs close commit excluded)

```
Web:
  docs/ai-collab.md                                       | +12 / -4   (F1 convention split)
  scripts/validate-data.js                                |  +2 / -1   (F2 range check)

iOS (local-only):
  3DPrintAssistant/Utils/Strings.swift                    |  +1        (F3 fanOverhang label)
  3DPrintAssistant/Views/Output/FilamentSettingsView.swift| +24 / -1   (F3 cooling tab rewrite)
  3DPrintAssistantTests/EngineServiceTests.swift          | +58        (F3 new test + F4 T5 mirror)
```

## Per-finding remediation

### F1 — Codex Low #1 (TDD-RED breadcrumb convention contradiction)

**Web commit:** `746244e`

**Edit at `docs/ai-collab.md:151-162`:** the prior closing paragraph said "Either way: the commit body OR test code must surface the RED-discipline posture" — which contradicted the inverted-first rule at lines 138-143 that mandates a code/history artifact. Split into two posture-specific bullets:

```markdown
The two postures have different breadcrumb requirements:

- **Inverted-first (rule 1 above):** code breadcrumb or git-history artifact is
  mandatory. A commit-body-only note is NOT sufficient — the discipline must be
  auditable from the diff or `git log -p`, not from prose.
- **Skipped / degenerated RED (rule 2 above):** commit-body note is sufficient
  and is the only available artifact, since there's no real RED to capture
  in code.

"Self-reported only" — claiming an inverted-first demo in the commit message
without any code or commit-history artifact — is the specific gap to avoid. It
forces external review to prove a negative.
```

No code/test changes.

### F2 — Codex Medium #2 (validate-data fan_multiplier range)

**Web commit:** `48304d3`

**Locked path: Path A (range check), NOT Path B (allow `0` as fan-off).** Path B would have required engine changes at `engine.js:1246` + `engine.js:2655` to special-case `0`, which is a feature addition, not a fix.

**Edit at `scripts/validate-data.js:169-170`:**
```js
// Before:
check(file, isNumber(e.fan_multiplier),   `${ctx}: fan_multiplier must be a number`);

// After:
check(file, isNumber(e.fan_multiplier) && e.fan_multiplier > 0 && e.fan_multiplier <= 1,
                                          `${ctx}: fan_multiplier must be a number in (0, 1] (got ${e.fan_multiplier})`);
```

**TDD-RED verified for real:** mutated `data/rules/environment.json` cold's `fan_multiplier` from `0.9` to `0`, ran `node scripts/validate-data.js`, observed `All data files valid.` + exit 0 (bug confirmed). Applied range check, re-ran:

```
✗ [data/rules/environment.json] environment_options[1] (id=cold): fan_multiplier must be a number in (0, 1] (got 0)
Found 1 error. Fix before deploying.
exit: 1
```

Reverted fixture to `0.9`; validator 6/6 green again. Commit body documents the demo.

**Internal-reviewer Medium M1 was raised here** (carried to v1.0.5, NOT fixed in S8.7): engine guards at `engine.js:1246` + `engine.js:2655` only check `fanMult > 0`; no upper-bound clamp. So schema rejects `> 1`, engine accepts `> 1`. Today: harmless (data spans `[0.8, 1.0]`). Future: if a code path bypasses validate-data and feeds `1.5`, engine silently amplifies fan. **Codex should evaluate whether this asymmetry is a v1.0.4 blocker or accept the v1.0.5 deferral.**

### F3 — Codex Medium #1 (iOS Advanced cooling UI env-scaled parity)

**iOS commit:** `41c9956`

**Edit at `3DPrintAssistant/Views/Output/FilamentSettingsView.swift` — `case "cooling"` block:**

Prior code (S8.5 close): always rendered `filProfile.coolingFan` + `filProfile.coolingFanMin` (state-less, raw). Never consulted `advancedSettings` despite the prop being plumbed through from `OutputView.swift:84-91`.

New behavior:
- **Always show "Cooling fan"** (material default ceiling) from `filProfile.coolingFan` — matches web `app.js:1242` "always" row.
- **Advanced mode** (`isAdvanced && let adv = advancedSettings`): render TWO env-scaled rows using `adv.fanMinSpeed` (with prov `fan_min_speed`) + `adv.coolingFanOverhang` (with prov `cooling_fan_overhang`). Mirrors web `app.js:1244-1253`.
- **Simple mode fallback**: keep `filProfile.coolingFanMin` (no env scaling), preserves prior Simple-mode behavior.

**Added `Strings.FilamentTab.fanOverhang = "Overhang fan"`** at `3DPrintAssistant/Utils/Strings.swift:135` for the new Advanced-mode row.

**New XCTest `testV104_S8_7_CoolingUI_AdvancedSourceIsEnvScaled` at `EngineServiceTests.swift:1071-1113`** pins the source-of-truth contract: for PLA+cold+x1c, `advancedSettings.fanMinSpeed` (parses to `63.0`) MUST be `<` `filProfile.coolingFanMin` (parses to `70.0`), and `advancedSettings.coolingFanOverhang` (parses to `90.0`) MUST be `<` `filProfile.coolingFan` (parses to `100.0`). If a future refactor accidentally points the view back at the state-less source, this test catches it even though the bridge math is correct.

**TDD-RED verified inverted-first** per the F1-tightened convention:
```
XCTAssertGreaterThan failed: ("63.0") is not greater than ("70.0")
```
Flipped to `XCTAssertLessThan`. RED demo breadcrumb in the test's doc comment (verbatim failure quote).

**iOS XCTest count:** 107 unit (pre-S8.7) → 108 unit (post-S8.7). UITests skipped in the run. Total with `ScreenCaptureUITests` = 109. The `xcodebuild test ... -skip-testing:UITests` invocation prints `Executed 108 tests`.

**Slow layer time** (web app.js:1253 third Advanced cooling row) NOT mirrored — would require extending `AdvancedFilamentSettings` Codable struct again (parallel to S8.5 F2). Deferred to v1.0.5 per minimum-surface principle. Document in carry-forwards.

### F4 — Codex Low #2 (iOS T5 mirror gap — x1c AMS-like)

**iOS commit:** `ad46fd3`

**Edit at `3DPrintAssistantTests/EngineServiceTests.swift:1257-1268`** — within the existing `testV104_T5_PracticalMCSTiers` function's x1c AMS-like sub-case (which previously asserted only `XCTAssertNotNil(profAMS["prime_tower"])`). Added two negative assertions mirroring web walkthrough `scripts/walkthrough-harness.js:876-884`:

```swift
let warnsAMS = try await EngineService.shared.getWarnings(ams)
let idsAMS = warnsAMS.map(\.id)
XCTAssertFalse(idsAMS.contains("ams_lite_material_incompat"),
               "x1c (ams_like) must NOT fire ams_lite-specific warning; got ids: \(idsAMS)")
XCTAssertFalse(idsAMS.contains("mcs_empty_no_multicolor"),
               "x1c (ams_like) must NOT fire empty-MCS warning; got ids: \(idsAMS)")
```

**Warning IDs grepped from web walkthrough source** per `feedback_ios_xctest_exact_ids` memory rule — no speculative substring matchers.

**TDD-RED verified inverted-first:** flipped first assertion to `XCTAssertTrue(idsAMS.contains("ams_lite_material_incompat"))`, ran:

```
XCTAssertTrue failed - x1c (ams_like) must NOT fire ams_lite-specific warning; got ids: ["pla_heat_creep"]
```

Confirms x1c+PLA Basic+multi_2_4 only fires `pla_heat_creep` (correct — material-side warning, no AMS/MCS-side warning). Flipped back to `XCTAssertFalse`. Breadcrumb in inline comment.

T5 still passes; no new test method. Total iOS test count unchanged from F3 (108 unit).

### Internal-reviewer subagent (post-F1-F4, pre-Codex)

Dispatched across `web d9e58fa..872e05f` + `iOS fd4761a..ad46fd3`. **VERDICT: GO.** Surfaced:

- **1 Medium (M1):** see F2 above — engine/schema asymmetry on `fan_multiplier` upper bound. Reviewer recommended carrying to v1.0.5 cleanup, not blocking S8.7. Owner-scope: Codex-only directive → carried.
- **4 Minor:** (a) Advanced cooling drops Min row if `adv.fanMinSpeed == nil` — web parity-intentional; (b) `testV104_S8_7_CoolingUI_*` name implies UI coverage but asserts on bridge values — v1.0.5 rename candidate; (c) RED breadcrumb format paraphrased not exact-quoted — reviewer judged compliant with the just-tightened convention; (d) doc edit clarity nit — no action.

Reviewer-pattern stays **6-for-6** on surfacing real value across the v1.0.4 arc (Phase 1.5 / S8 / S8.5 / S8.7 all caught real findings).

## Verification evidence (live, post-S8.7)

```
node scripts/walkthrough-harness.js   →  11 v1.0.4 OK lines (unchanged from
                                          S8.5 — no engine/data behavior
                                          changes in S8.7 web)
node scripts/validate-data.js          →  6/6 clean
node scripts/profile-matrix-audit.js   →  No core failures; 47196 broad +
                                          55/55 curated
iOS XCTest (iPhone 17 Pro, x86_64)     →  108 unit / 0 failed
                                          (107 prior + 1 new S8.7 test).
                                          UITests skipped in this run;
                                          `ScreenCaptureUITests` adds 1 more
                                          for the full ship-gate walkthrough.
```

## Specific things to challenge

Anchor every finding with `file:line` on BOTH repos where applicable.

### A — F1 convention rewrite (`docs/ai-collab.md`)

- **A1.** Read `docs/ai-collab.md:135-165` (the full TDD-RED breadcrumb subsection). Does the new split between "Inverted-first" and "Skipped / degenerated RED" disambiguate cleanly? Could a future agent reading it cold misapply either branch?
- **A2.** The convention was applied to F3 + F4 within the same arc (RED demo breadcrumbs in test doc comments). Are those breadcrumbs compliant under the new rules — i.e., does a paraphrased failure-message quote count as a "code breadcrumb" (compliant) or a "self-reported" note (forbidden)?
- **A3.** Should F1 retroactively also add a code-level RED breadcrumb to S8.5's F1 / F2 / F3 commits (which predate the convention)? Reviewer m4 from S8.5 flagged this as optional. Confirm carry-forward decision.

### B — F2 schema range + engine asymmetry

- **B1.** Read `scripts/validate-data.js:169-170` and `engine.js:1246` + `engine.js:2655`. Is the schema-stricter-than-engine asymmetry on the upper bound (`> 1`) a v1.0.4 ship blocker, or is the v1.0.5 carry-forward acceptable? The internal reviewer judged the v1.0.5 path acceptable because (a) no current data violates `<= 1`, (b) no code path bypasses validate-data in practice. Codex's stricter view welcome.
- **B2.** The chosen error message `"fan_multiplier must be a number in (0, 1] (got X)"` uses interval notation `(0, 1]`. Is this clear enough for someone editing data files without context, or should it expand to "must be > 0 and <= 1"?
- **B3.** The TDD-RED demo for F2 mutates `environment.json` cold's `fan_multiplier` from `0.9` to `0` and reverts. The git history at `872e05f^` and `872e05f` does NOT show the fixture mutation (it was pre-commit experimentation, not committed). The convention's "code breadcrumb or history artifact" rule — is the commit body's prose recount of the captured failure-message sufficient as a breadcrumb, or does this fall under "self-reported only"?

### C — F3 cooling UI rewrite (largest blast radius)

- **C1.** Read `3DPrintAssistant/Views/Output/FilamentSettingsView.swift` `case "cooling"` block (lines ~52-93). Walk the four code paths:
  - (i) `filProfile == nil` → emptyNote rendered (correct).
  - (ii) `isAdvanced && advancedSettings != nil` → "Cooling fan" + Min (adv) + Overhang (adv) rendered.
  - (iii) `isAdvanced && advancedSettings == nil` → "Cooling fan" rendered + Min fallback from `filProfile.coolingFanMin`. Reviewer m1 flagged this corner case is "silent drop of Overhang row." Is this real risk for any material/state? When can `getAdvancedFilamentSettings` return non-nil but `fanMinSpeed == nil`?
  - (iv) Simple mode → "Cooling fan" + Min from `filProfile.coolingFanMin`. Unchanged behavior.
- **C2.** **Web parity check.** Web `app.js:1244-1253` renders 3 Advanced rows: `rowFanMin`, `rowFanOverhang`, `rowSlowLayer`. iOS now renders 2 (Min + Overhang); Slow layer time is deferred to v1.0.5 because `AdvancedFilamentSettings` Codable struct doesn't expose `slow_layer_time`. Is this parity gap acceptable for v1.0.4 ship, or should the Codable extension land in S8.7 as a 5th remediation?
- **C3.** Read `3DPrintAssistantTests/EngineServiceTests.swift:1071-1113` (`testV104_S8_7_CoolingUI_AdvancedSourceIsEnvScaled`). The test asserts on **bridge values** (env-scaled vs raw differ), not on the view layer. Reviewer m2 flagged the name implies UI coverage. Is the test's value claim (catches future regression of the UI source-of-truth) defensible despite the name mismatch, or should it be renamed before v1.0.4 ship?
- **C4.** **Cross-platform render parity for PLA+cold+x1c on Advanced mode.** Web emits `Min fan speed: 63%` + `Overhang fan: 90%` (raw `cooling_fan` row also 100%). iOS now should emit the same three rows. The new test pins values but doesn't render-test. Should `ScreenCaptureUITests` in S9 specifically include a PLA+cold+x1c cooling-tab Advanced screenshot to verify, or is the bridge-pin sufficient?

### D — F4 T5 mirror gap + ID exactness

- **D1.** Read `3DPrintAssistantTests/EngineServiceTests.swift:1257-1268` (the new x1c AMS-like negative assertions). Compare against web `scripts/walkthrough-harness.js:876-884`. Are the two warning IDs (`ams_lite_material_incompat`, `mcs_empty_no_multicolor`) byte-identical between web and iOS? Per `feedback_ios_xctest_exact_ids`, substring or partial-match would be a regression of discipline.
- **D2.** The RED demo captured `["pla_heat_creep"]` — only one warning fires for x1c+PLA+multi_2_4. Are there any other x1c material combos (e.g., ABS, PETG, TPU) where the AMS-like sub-case SHOULD fire a different warning, and the negative assertion would mask it? T5's sub-case scope is x1c+PLA Basic specifically — confirm intentional.
- **D3.** Reviewer m1 from S8.5 already widened T5 coverage (sub-cases a-f). F4's negative assertions are added to the EXISTING x1c AMS-like sub-case (not the post-S8.5 widened set). Does this leave any of the S8.5-added sub-cases (AMS-Lite gate, CFS, generic_non_ams, multi_5 empty-MCS) without parallel negative-assertion coverage that web has?

### E — Cross-cutting + reviewer-pattern health

- **E1.** **Byte-identity check.** No engine.js or data/*.json changed in S8.7 (Tasks 3 + 4 are iOS-only view/test). Confirm `diff -q` would still show all 8 sync targets identical between web HEAD and iOS HEAD. If S8.7 introduced unintended drift, surface as Critical.
- **E2.** **Test count drift.** iOS pre-S8.7 was 107 unit + 1 UI = 108. Post-S8.7 should be 108 unit + 1 UI = 109. The S8.7 session log says "108 unit (was 107)"; NEXT-SESSION says "108/108 (107 unit + 1 UI)". One of those is wrong. Verify via `grep -c "func test" 3DPrintAssistantTests/*.swift` + `grep -c "func test" 3DPrintAssistantUITests/*.swift`.
- **E3.** **Reviewer pattern 6-for-6.** Each S7-N / S8 / S8.5 / S8.7 reviewer caught a real finding (S7-2 PVA scope creep, S7-3 partial-clip branch gap, S8 4 Important findings, S8.5 fifth env-scaling miss `p.fan_speed`, S8.7 schema/engine asymmetry M1). Is the pattern still adding marginal value, or is it becoming a self-fulfilling exercise? Honest assessment requested.
- **E4.** **Carry-forwards to v1.0.5.** S8.7 added:
  - Reviewer M1 — engine upper-clamp asymmetry (this packet's central question).
  - Reviewer m2 — test naming clarity (`testV104_S8_7_CoolingUI_*`).
  - Slow-layer-time row in iOS Advanced cooling.
  
  Combined with prior unchanged carry-forwards (math duplication 4 sites, `isPETG ? 5 : 0` magic, matrix env-axis blind spot, RETIRED_IDS const, mobile-card text-length, S8.5 helper extraction `_computeEnvScaledFan` / `_computeInitBedTarget`, TDD-RED retroactive for F1/F2/F3, walkthrough hardcoded baseline). Is the v1.0.5 backlog now load-bearing enough that v1.0.5 should be planned as a hygiene release rather than another feature release? Codex's planning judgment welcome.

## Output format

Structured report under 1000 words:

- **Critical**: must-fix before any further action (pause v1.0.4 ship).
- **Important**: must-fix before iOS push / TestFlight dispatch.
- **Medium**: fix before v1.0.4 ship if cheap; otherwise carry to v1.0.5.
- **Low**: defer.
- **Observation**: noted but not actionable, or already filed as carry-forward.
- **Strengths**: brief.
- **GO/NO-GO**: is v1.0.4 ready for S9 + TestFlight dispatch, or pause for an S8.8 tightening cycle?

Anchor every finding with `file:line` on BOTH repos where applicable.

## Notes for the audit

- **Web is live + auto-deploys per commit.** S8.7's docs + schema-tightening changes are already live on `3dprintassistant.com`. iOS is gated.
- **Owner standing rule:** "Quality is key. No cutting corners."
- **If you find anything Important+, surface it explicitly.** Don't soften.
- **If clean (no Critical / Important):** v1.0.4 proceeds to S9 (UI walkthrough + MARKETING_VERSION 1.0.3 → 1.0.4 + 5-point ship-ready handoff + owner TestFlight dispatch). **No further audit gate.**

When ready, place your structured response at:
`/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/post-s8-7-audit/codex-2026-05-15-post-s8-7-audit-response.md`.
