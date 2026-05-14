# Codex post-Phase-1 audit response — 2026-05-14

## Critical

None found. The 8-file iOS sync is byte-identical, the retired IDs are absent from both engines, and the required verification commands are green.

## Important

1. **HIGH-01 fan scaling is still incomplete for overhang fan.** Web scales only `fan_max_speed` / `fan_min_speed`: `engine.js:1243-1251`, `engine.js:1286-1317`, `engine.js:3122-3129`. It still emits raw overhang cooling from material data in the Advanced surface, text export, and Bambu export: `engine.js:1259`, `engine.js:3131-3133`, `engine.js:3217-3218`. Concrete PLA+cold output: min/max are `63/90`, but `adv.cooling_fan_overhang`, text `Overhang fan speed`, and BS `overhang_fan_speed[0]` remain `100`. iOS mirrors the same engine behavior at `3DPrintAssistant/Engine/engine.js:1259`, `3DPrintAssistant/Engine/engine.js:3131-3133`, while `EngineServiceTests.swift:1284-1315` only asserts min/max. If `env.fan_multiplier` means cold/vcold cooling reduction, overhang cooling is still a live unscaled export/UI surface. Fix before iOS push/TestFlight: derive an env-scaled overhang fan value, emit/export it, and pin `90` for PLA+cold on web + iOS.

2. **The iOS Advanced fan mirror should land before TestFlight, not v1.0.5.** JS already returns stateful fan fields at `engine.js:1286-1317`, but Swift drops them: `3DPrintAssistant/Engine/EngineService.swift:70-78` and `3DPrintAssistant/Engine/EngineService.swift:672-678` decode only the four temperature strings. The test suite documents the gap at `3DPrintAssistantTests/EngineServiceTests.swift:997-1003` and relies on export coverage. That is not equivalent: a regression could break the Advanced filament surface while leaving `exportBambuStudioJSON` green. Add `fanMinSpeed` / `fanMaxSpeed` to the Codable bridge and re-enable the direct T2a fan assertion before the iOS push gate opens.

## Medium

1. **T5 iOS MCS mirror is materially narrower than the web walkthrough.** Web covers `ams_lite`, `ams_like`, `cfs`, `cfs_lite`, `generic_non_ams`, retired `k2_plus_cfs` on both CFS and CFS-Lite, and `multi_5` empty-MCS suppression at `scripts/walkthrough-harness.js:821-887`. iOS T5 covers empty-MCS, AMS prime tower, K2 retired-ID silence, and Creality empty-MCS at `3DPrintAssistantTests/EngineServiceTests.swift:1156-1201`, but does not assert positive `mcs_tier_cfs_guidance`, `sparkx_i7` CFS-Lite, `generic_non_ams`, or AMS-Lite incompatibility. Cheap to tighten before ship; otherwise it is a v1.0.5 mirror debt, not an engine blocker because the web harness covers it.

## Low

TDD-RED breadcrumbing is acceptable as a process carry-forward. One inverted T1 assertion was documented, and `xcodebuild` now proves the final suite, but the other 10 mirrors use different API/assertion shapes. A code breadcrumb or commit-body convention is worth standardizing after v1.0.4, not blocking S9.

## Observation

Sync and coverage evidence: diff snapshots were generated in this folder before source inspection; `diff -q` was clean for all 8 web→iOS resources; `project.yml:37-44` and `3DPrintAssistant.xcodeproj/project.pbxproj:501-508` bundle the resources EngineService fetches at `EngineService.swift:891-899`. `node scripts/validate-data.js` passed. `node scripts/walkthrough-harness.js` emitted all 11 v1.0.4 OK lines. `node scripts/profile-matrix-audit.js` reported no broad or curated failures. XcodeBuildMCP’s wrapper timed out, but the underlying result bundle summary reports `108` passed, `0` failed on iPhone 17 Pro.

PLA chamber cap check: `safe_chamber_temp_max: 50` is conservative for PLA-CF and PLA Metal. Bambu lists PLA-CF heat deflection around `55°C` ([Bambu PLA-CF](https://us.store.bambulab.com/products/pla-cf?_pos=1&_sid=c6f4daa42&_ss=r&variant=41003202248840)) and PLA Metal around `62°C` ([Bambu PLA Metal](https://eu.store.bambulab.com/products/pla-metal)). The PLA-only gates are consistent across `engine.js:1516-1520`, `engine.js:1374-1379`, and `engine.js:1705-1708`; current cold/vcold copy is covered by the regex.

The deferred bed-temp helper, PETG `+5` data-driving, matrix env-axis sweep, visual long-warning check, smoke assertion, and shared `RETIRED_IDS` const are real hygiene items, but I do not see them blocking v1.0.4 once the Important items above are fixed. Prior MEDIUM-02 / OBSERVATION-01 remain appropriate v1.0.5 carry-forwards.

## Strengths

The Phase 1.5 tightening is mostly strong: MEDIUM-01 now covers full, partial, and fully clipped branches; HIGH-02 correctly avoids PVA scope creep; LOW-01 successor-case guards are well placed on web; and S8 preserved byte identity instead of hand-porting engine/data.

## GO/NO-GO

**NO-GO for iOS push / TestFlight dispatch until the two Important fan items are tightened.** No Critical pause is needed for general audit work or S9 planning, but v1.0.4 should not ship with cold/vcold overhang fan still unscaled and the iOS Advanced fan mirror knowingly indirect.
