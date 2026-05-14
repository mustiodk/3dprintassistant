# 2026-05-15 — Cowork (appdev): v1.0.4 S8.7 — Codex post-S8.5 re-audit cleanup

## Durable context

- **One-session cleanup arc.** S8.7 remediated all 4 findings from the 2026-05-15 Codex post-S8.5 re-audit (2 Medium + 2 Low). Codex's verdict on S8.5 was already **GO for S9** with 0 Critical / 0 Important; this arc shipped the optional Medium/Low cleanup before the S9 ship gate per owner directive "we fix everything found by codex before proceeding."
- **Path-A lock on Medium #2 (`fan_multiplier` schema range).** Codex framed two paths: (A) range check `> 0 && <= 1` to align schema with engine, OR (B) allow `0` as "fan off" (engine change). Locked Path A as the *fix* interpretation; Path B is a v1.0.5 feature addition if ever wanted. Schema is now intentionally tighter than engine on the upper bound (engine has no `<= 1` clamp) — reviewer surfaced this asymmetry as Medium M1 and recommended carrying to v1.0.5.
- **Cooling-UI rewrite blast radius.** Task 3 changed user-facing rendering in `FilamentSettingsView.swift`. Simple mode unchanged (falls through to `filProfile.coolingFanMin`); Advanced mode now reads two env-scaled rows from `advancedSettings` (Min fan + Overhang). Slow-layer-time row deferred to v1.0.5 (requires extending `AdvancedFilamentSettings` Codable struct again, which would have been Codex Important #2 territory in S8.5 had it been included then).
- **TDD-RED breadcrumb convention used in both iOS test changes.** The convention itself was tightened by commit `746244e` in this same arc (Task 1, Codex Low #1) — first arc that consumes its own tightened convention. Both Task 3 and Task 4 RED demos were actually run (flipped → captured failure output → flipped back), with the captured failure message inlined in the test doc comment as a code breadcrumb.
- **Reviewer pattern stays 6-for-6.** Internal code-review subagent dispatched across `web d9e58fa..HEAD` + `iOS fd4761a..HEAD`. Verdict: GO. Surfaced 1 Medium (M1 — engine upper-bound asymmetry) + 4 Minor — none are Codex-originated, all carried to v1.0.5 per owner's "Codex-only" scope directive. Pattern is 6-for-6 on surfacing real value (S7-N + S8 + S8.5 + S8.7 internal reviewers all caught real findings).

## What happened / Actions

1. **Cold-start (Trigger C).** Read the 11 cold-start files + Codex re-audit response. Verdict was GO for S9 with optional Medium #1. Surfaced execution-mode choice; owner dismissed the question.
2. **Owner directive arrived: "we fix everything found by codex before proceeding."** Reframed S9 as gated behind a small cleanup arc (S8.7). Wrote per-task plan at `docs/superpowers/plans/2026-05-15-s8-7-codex-post-s8-5-cleanup.md`. Locked Path A on Medium #2.
3. **Task 1 — Codex Low #1 (web).** Tightened `docs/ai-collab.md:135-153` TDD-RED breadcrumb convention. Split the closing "Either way" paragraph into two posture-specific rules: inverted-first needs code/history artifact (commit-body-only NOT sufficient); skipped/degenerated-RED is commit-body sufficient. Web `746244e`.
4. **Task 2 — Codex Medium #2 (web).** Added range check `> 0 && <= 1` in `scripts/validate-data.js:163-170`. TDD-RED demo for real: mutated cold's `fan_multiplier` to `0`, ran validator, watched it pass (bug). Added check, re-ran, watched it correctly emit `✗ [data/rules/environment.json] environment_options[1] (id=cold): fan_multiplier must be a number in (0, 1] (got 0)` + exit 1. Reverted fixture; full gate green (validate-data 6/6, walkthrough 11 v1.0.4 OK lines, profile-matrix-audit 47196/0 broad + 55/55 curated). Web `48304d3`.
5. **Task 3 — Codex Medium #1 (iOS).** Rewired `FilamentSettingsView.swift` cooling tab Advanced mode to read from `advancedSettings.fanMinSpeed` / `coolingFanOverhang` (env-scaled, mirrors web `app.js:1244-1253`). Simple mode unchanged. Added new XCTest `testV104_S8_7_CoolingUI_AdvancedSourceIsEnvScaled` pinning the source-of-truth contract (env-scaled < raw for PLA+cold+x1c). TDD-RED inverted-first demo: flipped first assertion to `XCTAssertGreaterThan`, ran via xcodebuild, captured `XCTAssertGreaterThan failed: ("63.0") is not greater than ("70.0")`, flipped to `XCTAssertLessThan`. Added `Strings.FilamentTab.fanOverhang` string. 108 unit tests green (was 107). iOS local-only `41c9956`.
6. **Task 4 — Codex Low #2 (iOS).** Added 2 negative assertions in T5's x1c AMS-like sub-case at `EngineServiceTests.swift:1258-1268`: `XCTAssertFalse(idsAMS.contains("ams_lite_material_incompat"))` + `XCTAssertFalse(idsAMS.contains("mcs_empty_no_multicolor"))` — mirroring `scripts/walkthrough-harness.js:876-884`. TDD-RED inverted-first demo on the first: flipped to `XCTAssertTrue`, ran T5, captured `XCTAssertTrue failed - x1c (ams_like) must NOT fire ams_lite-specific warning; got ids: ["pla_heat_creep"]`, flipped back. T5 still passes; no new test method. iOS local-only `ad46fd3`.
7. **Pre-reviewer verification gate.** Re-ran the full gate at S8.7 HEAD: validate-data 6/6, walkthrough 11 v1.0.4 OK lines, profile-matrix-audit 47196/0 broad + 55/55 curated, iOS XCTest 108/0 unit.
8. **Internal code-review subagent dispatch.** Ranges `web d9e58fa..HEAD` + `iOS fd4761a..HEAD`. Reviewer returned GO with:
   - 1 **Medium (M1):** Schema is now `> 0 && <= 1` but engine `engine.js:1246` + `engine.js:2655` only check `> 0` — no upper clamp. So data spanning `[0.8, 1.0]` is fine today, but the schema and engine disagree on `>1` (schema rejects, engine accepts and would scale by `>1.0`). Reviewer recommended carrying to v1.0.5 cleanup, not blocking S8.7. Owner-scope: Codex-originated only → carry.
   - 4 **Minor (m1-m4):** (a) iOS Advanced cooling drops Min row if `adv.fanMinSpeed` is nil — web has same pattern, parity-intentional; (b) `testV104_S8_7_CoolingUI_*` is a contract-pinning test not a UI test — rename candidate for v1.0.5; (c) RED breadcrumb format paraphrased not exact-quoted — reviewer judged compliant; (d) doc edit clarity nit — no action.
9. **Tightening skipped.** Per reviewer GO + owner Codex-only directive, no tightening commit. M1 + Minor m1-m4 captured below as v1.0.5 carry-forwards.
10. **Trigger A close.** Md-hygiene sweep clean (only untracked file = the S8.7 plan, staged in this close commit); protocol files `Projects/CLAUDE.md` vs `Projects/AGENTS.md` byte-identical (`diff -q` exit 0); no secrets; no root-level stubs. ROADMAP + INDEX + NEXT-SESSION regenerated. Memory + vault sweeps below.

## Files touched

**Web repo `3dprintassistant` main:**
- `docs/ai-collab.md` — Task 1 doc clarification (commit `746244e`).
- `scripts/validate-data.js` — Task 2 schema range check (commit `48304d3`).
- `docs/superpowers/plans/2026-05-15-s8-7-codex-post-s8-5-cleanup.md` — new (this session-close commit stages it).
- `docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s8-7-codex-cleanup.md` — this log (this session-close commit).
- `docs/sessions/INDEX.md` — prepend entry (this session-close commit).
- `docs/planning/ROADMAP.md` — v1.0.4 status update; S8.7 closed; S9 clean entry (this session-close commit).
- `docs/sessions/NEXT-SESSION.md` — regenerated for S9 Phase 2.2 ship gate (this session-close commit).

**iOS repo `3dprintassistant-ios`:**
- `3DPrintAssistant/Views/Output/FilamentSettingsView.swift` — Task 3 view rewire (commit `41c9956`).
- `3DPrintAssistant/Utils/Strings.swift` — Task 3 new `fanOverhang` label (commit `41c9956`).
- `3DPrintAssistantTests/EngineServiceTests.swift` — Task 3 new test + Task 4 T5 mirror (commits `41c9956` + `ad46fd3`).

## Commits

**Web `3dprintassistant` main:**
- `746244e` — `docs: clarify TDD-RED breadcrumb convention (Codex Low #1)`
- `48304d3` — `fix: validate fan_multiplier range (0, 1] (Codex Medium #2)`
- This session-close commit (plan + log + INDEX + ROADMAP + NEXT-SESSION).

**iOS `3dprintassistant-ios` (local-only — Phase 2 push gate active, 7 commits ahead of `eeb2915`):**
- `41c9956` — `fix: render env-scaled fan values in Advanced cooling UI (Codex Medium #1)`
- `ad46fd3` — `test: mirror x1c AMS-like must-not-fire warnings in T5 (Codex Low #2)`

## Open questions / Follow-up

**Md-hygiene findings from this session:**
- Only finding: the S8.7 plan file `docs/superpowers/plans/2026-05-15-s8-7-codex-post-s8-5-cleanup.md` was untracked at start. Staged in the close commit. No buried content, no orphan stubs, no secrets, no protocol-file drift (`diff -q Projects/CLAUDE.md Projects/AGENTS.md` exit 0).

**Reviewer-surfaced carry-forwards for v1.0.5 (none Codex-originated, none ship-blocking):**
- **Reviewer M1 — engine upper-clamp asymmetry.** `engine.js:1246` and `engine.js:2655` accept `fan_multiplier > 1` (no upper guard), but the schema now rejects `> 1`. Current data spans `[0.8, 1.0]` so harmless; if a future env preset declares `fan_multiplier: 1.5`, the schema rejects at validate-time but if it ever bypassed validation the engine would silently scale fan by 1.5×. v1.0.5 fix shape: add `&& v <= 1.0` to the engine guards (2-line change). Carry as cheapest v1.0.5 cleanup.
- **Reviewer m2 — test naming clarity.** `testV104_S8_7_CoolingUI_AdvancedSourceIsEnvScaled` is framed as UI-coverage but asserts on bridge values. Consider renaming to `testV104_S8_7_CoolingAdvancedScaledLessThanRawForPlaCold` in v1.0.5. No behavior change.
- **Reviewer m1 — Min fan row drop in Advanced when `adv.fanMinSpeed == nil`.** Web parity-intentional (`app.js:1247` has same omission via empty `fanMinHtml`); surface for awareness only. No action.

**S8.5 carry-forwards still pending for v1.0.5** (unchanged by this arc):
- iOS slow_layer_time row in Advanced cooling (would require `AdvancedFilamentSettings` Codable extension).
- Helper extraction priority (math duplication now 4 sites — `_computeEnvScaledFan` + `_computeInitBedTarget`).
- TDD-RED breadcrumb retroactive for F1/F2/F3 (optional artifact).
- Walkthrough hardcoded baseline (`Math.round(100 * 0.9)` derivation from materials.json).

**Prior S7-N carry-forwards still pending for v1.0.5** (unchanged):
- S7-3 math duplication 3× (now 4× post-S8.5).
- S7-3 `isPETG ? 5 : 0` magic constant.
- S7-3 profile-matrix-audit env-axis blind spot.
- S7-3 mobile-card warning text length check.
- S7-3 smoke assertion for emit-vs-claim parity.
- S7-4 shared `RETIRED_IDS` const array.
- Prior Codex MEDIUM-02 + OBSERVATION-01.

## Memory sweep

No durable memory to add. Considered:
- **TDD-RED inverted-first discipline on degenerate cases** — already in `feedback_skill_discipline_remediation_arcs.md` (which references the convention) and now in `docs/ai-collab.md` itself. Not a new pattern.
- **Path-A vs Path-B disambiguation on schema-vs-engine tightening** — one-off design-fork framing, not a recurring rule. Don't memorize.
- **Reviewer-pattern 6-for-6 reliability** — already implicit in `feedback_skill_discipline_remediation_arcs.md`. Don't double-memorize.

## Vault sweep

Nothing durable to propagate. Checked:
- **Strategic / rationale** — no new strategic call this session; it was a tight cleanup arc.
- **Shorthand / new terms** — no new vocabulary. "S8.7" is a session label, not a term.
- **Cross-project pattern / tool routing** — no new tool routing or pattern.
- **Hobby observation** — no hardware-side observation.
- **Consulting insight** — N/A.
- **External source** — N/A.

## Next session

**S9 cold-starts on Phase 2.2 / Task 9 — UI walkthrough + `MARKETING_VERSION` 1.0.3 → 1.0.4 + 5-point ship-ready handoff.** No more Codex audit gate (S8.5 GO verdict was clean; S8.7 cleared optional Medium/Low; no new audit needed).

Mechanics per the canonical v1.0.4 plan Task 9 section:

1. `git status` clean check (web + iOS).
2. `xcodebuild ScreenCaptureUITests` — spot-check `/tmp/ui-review/pro/01-home.png` through `09-checklist.png` for visible regressions. Pay attention to:
   - Output panel fan rows (env-scaled for cold/vcold per Tasks 3 + S8.5)
   - Cooling tab Advanced mode (new env-scaled Min + Overhang rows per Task 3)
   - Warning copy for chamber-cap PLA on X1E
   - First-layer bed warning copy for fully-clipped / partially-clipped cases
3. Bump `MARKETING_VERSION` 1.0.3 → 1.0.4 in `project.yml` + `xcodegen generate`.
4. Second iOS local commit: `chore: bump MARKETING_VERSION 1.0.3 → 1.0.4 (S9 Phase 2.2)` — iOS would be 8 commits ahead of `eeb2915` after this.
5. Internal code-review subagent on the final commit (`fd4761a..HEAD` becomes `ad46fd3..HEAD` after S9's commit). Pattern is 6-for-6 — keep using.
6. Tightening commit if reviewer surfaces Important findings.
7. 5-point ship-ready check.
8. Owner authorizes iOS push + TestFlight dispatch (`gh workflow run testflight.yml --ref main`).
9. Trigger A close for S9.
