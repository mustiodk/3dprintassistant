# Codex post-S8.5 audit response — 2026-05-15

## Critical

None.

## Important

None. I do not see a must-fix blocker for S9 / iOS push.

## Medium

1. **iOS decodes the new Advanced fan fields but still does not render them in the Advanced cooling tab.** Web now renders env-scaled Advanced cooling rows from `adv`: `app.js:1244-1252` uses `adv.fan_min_speed.value` and `adv.cooling_fan_overhang`. iOS decodes the equivalent fields at `3DPrintAssistant/Engine/EngineService.swift:70-84` and `3DPrintAssistant/Engine/EngineService.swift:690-704`, and tests them at `3DPrintAssistantTests/EngineServiceTests.swift:1025-1050`, but `3DPrintAssistant/Views/Output/FilamentSettingsView.swift:52-65` still renders `filProfile.coolingFan` / `coolingFanMin` from state-less `getFilamentProfile`; `OutputViewModel.swift:87-96` fetches both profile + Advanced settings but the cooling case never uses `advancedSettings`. This is not the prior Important coverage bug, because tests now directly pin the bridge, and `resolveProfile.fan_speed` is scaled; but the iOS UI can still show raw `70%` min fan where web Advanced shows `63%`. Cheap S9 UI tightening if desired; otherwise carry as explicit v1.0.5 UI parity.

2. **`fan_multiplier: 0` is schema-legal but engine-invalid-by-guard.** Web `scripts/validate-data.js:163-170` only requires `fan_multiplier` to be a number, while `engine.js:1246` and `engine.js:2655` treat `0` as malformed and silently fall back to identity (`1.0`). The iOS byte-identical engine carries the same behavior at `3DPrintAssistant/Engine/engine.js:1246` and `3DPrintAssistant/Engine/engine.js:2655`. Current data only uses `1.0`, `0.9`, and `0.8`, so this does not block v1.0.4. Add a range check (`> 0`, probably `<= 1`) or intentionally allow `0` as "fan off" before adding new env presets.

## Low

1. **The TDD-RED convention has one confusing sentence pair.** `docs/ai-collab.md:135-143` says an inverted-first RED demo should leave a code comment or tiny reverted pre-commit, while `docs/ai-collab.md:151-153` says the "commit body OR test code" may surface the posture but also says self-reported commit-message-only demos are the gap to avoid. Future agents could read that as contradictory. Tighten wording to: "commit body is acceptable only for explicit skipped/degenerated RED; inverted-first needs code breadcrumb or history artifact."

2. **One small iOS T5 mirror gap remains.** Web asserts `x1c` AMS-like must not fire `ams_lite_material_incompat` or `mcs_empty_no_multicolor` at `scripts/walkthrough-harness.js:876-884`; iOS T5 only asserts `prime_tower` is present for the same AMS-like branch at `3DPrintAssistantTests/EngineServiceTests.swift:1199-1203`. The higher-risk MCS tiers are covered, including `sparkx_i7`, `mk4`, `multi_5`, and retired IDs, so this is non-blocking.

## Observation

S8.5 fan scaling is now exhaustive across current engine fan emissions. `getAdvancedFilamentSettings` scales `fan_max_speed`, `fan_min_speed`, and `cooling_fan_overhang` at `engine.js:1243-1271`; Bambu export reads those values at `engine.js:3153-3167`; text export reads `adv.cooling_fan_overhang` at `engine.js:3244-3252`; `resolveProfile` scales the profile `fan_speed` chip at `engine.js:2646-2671`. The state-less `getFilamentProfile.cooling_overhang` at `engine.js:1113-1122` staying raw is defensible because it has no `state` / env input.

Carry-forwards remain v1.0.5: fan math duplication is more painful now, profile-matrix still sweeps `environment: 'normal'` at `scripts/profile-matrix-audit.js:51-59` / `482-496`, `isPETG ? 5 : 0`, shared `RETIRED_IDS`, and mobile long-text checks remain unchanged. I would not block v1.0.4 on these.

Verification evidence: live snapshots were generated in this folder before code inspection. `diff -q` was clean for all 8 web→iOS sync files. `node scripts/validate-data.js` passed. `node scripts/walkthrough-harness.js` emitted all 11 v1.0.4 OK lines, including `min=63, max=90, overhang=90, profile fan_speed=90%`. `node scripts/profile-matrix-audit.js` reported 47196 broad configs with no broad failures and no curated findings. XcodeBuildMCP `test_sim` passed 108/108 on iPhone 17 Pro. Test count is 107 unit + 1 UI.

## Strengths

The S8.5 tightening fixed the real missed surface (`p.fan_speed`) and added useful direct iOS coverage. The MCS mirror is now broad enough to catch practical tier regressions, and byte-identity discipline held.

## GO/NO-GO

**GO for S9.** I found no Critical or Important issues. Consider folding the Medium iOS cooling UI parity into S9 if it is a tiny view-only patch, but it does not require another S8.6 tightening cycle before the planned UI walkthrough / version bump gate.
