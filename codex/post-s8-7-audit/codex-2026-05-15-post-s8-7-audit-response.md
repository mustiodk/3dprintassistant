# Codex post-S8.7 audit response — 2026-05-15

## Critical

None.

## Important

None.

## Medium

None for v1.0.4 ship. I accept the internal-reviewer M1 deferral: schema now rejects `fan_multiplier <= 0` and `> 1` at `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/scripts/validate-data.js:169`, current bundled data is `0.8...1.0` at `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/data/rules/environment.json:11`, `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/data/rules/environment.json:26`, `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/data/rules/environment.json:44`, `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/data/rules/environment.json:63`, and the web/iOS engine/data sync is byte-identical. The remaining engine-side upper-bound asymmetry at `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/engine.js:1246` and `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/engine.js:2655` is real hygiene, but I do not see a v1.0.4 user path that bypasses validated bundled data and feeds `> 1`.

## Low

None blocking. The F2 RED artifact was pre-commit and therefore still partly self-reported, but the clarified convention is now unambiguous for future batches: inverted-first needs a code/history breadcrumb at `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/ai-collab.md:135` and `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/ai-collab.md:153`. This is process evidence, not a product error.

## Observation

The iOS Advanced cooling fix is acceptable for v1.0.4: `FilamentSettingsView` now renders `advancedSettings.fanMinSpeed` and `advancedSettings.coolingFanOverhang` in Advanced mode at `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Views/Output/FilamentSettingsView.swift:60`, matching the web env-scaled min/overhang rows at `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/app.js:1244`. The deferred slow-layer row remains a v1.0.5 parity item because web renders it at `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/app.js:1253` while `AdvancedFilamentSettings` exposes fan fields but no `slowLayerTime` at `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Engine/EngineService.swift:70`.

The new iOS test name is slightly broader than its assertion surface, but its contract is defensible: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistantTests/EngineServiceTests.swift:1091` proves scaled bridge values differ from raw material defaults, and the view reads that bridge at `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Views/Output/FilamentSettingsView.swift:65`. Rename can wait for v1.0.5.

Test-count drift is resolved: source contains 108 unit tests plus 1 UI test at `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistantUITests/ScreenCaptureUITests.swift:12`; XcodeBuildMCP executed 109/109 passing.

## Strengths

S8.7 closes all four Codex-originated post-S8.5 findings. The live snapshots were generated before code review:

- `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/post-s8-7-audit/web-d9e58fa..HEAD-live-log.txt`
- `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/post-s8-7-audit/web-d9e58fa..HEAD-live-stat.txt`
- `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/post-s8-7-audit/ios-fd4761a..HEAD-live-log.txt`
- `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/post-s8-7-audit/ios-fd4761a..HEAD-live-stat.txt`

Verification: `node scripts/validate-data.js` passed; `node scripts/walkthrough-harness.js` passed all automated checks; `node scripts/profile-matrix-audit.js` reported 55/55 curated and 47,196/0 broad sweep; XcodeBuildMCP simulator tests passed 109/109.

## GO/NO-GO

GO for S9 + v1.0.4 TestFlight dispatch. No Critical or Important findings, and I do not see a known v1.0.4 user-facing error left. Plan v1.0.5 as a hygiene release, with the fan upper-bound guard, slow-layer iOS row, test rename, helper extraction, and existing carry-forwards bundled deliberately.
