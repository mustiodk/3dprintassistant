# S8.7 — Codex Post-S8.5 Re-Audit Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline (this arc) or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remediate all 4 Codex findings (2 Medium + 2 Low) from the 2026-05-15 post-S8.5 re-audit before S9 Phase 2.2 ship gate.

**Architecture:** Four small, independent commits — 1 web docs (Low #1), 1 web schema (Medium #2), 2 iOS local-only (Medium #1 UI parity + Low #2 XCTest gap). Each finding = one commit per platform it touches. iOS push gate stays active; iOS goes from 5 → 7 commits ahead of `origin/main` (`eeb2915`) heading into S9. Internal reviewer subagent across the full SHA range after all four land; tightening commit if needed. Trigger A close — new session log `2026-05-15-cowork-appdev-v1.0.4-s8-7-codex-cleanup.md`, ROADMAP + INDEX + NEXT-SESSION regen pointing to S9.

**Tech Stack:** Vanilla JS (web `scripts/validate-data.js`); markdown docs (`docs/ai-collab.md`); SwiftUI + Combine view-model (iOS Output flow); XCTest.

**Design locks (stated, not for re-litigation):**
- **Medium #2 path:** Path A (range `> 0 && <= 1`) — aligns schema with current engine guard at `engine.js:1246` / `engine.js:2655` (engine treats `0` as malformed and falls back to identity `1.0`). Path B ("allow `0` as fan-off") is a feature addition, not a fix — carries to v1.0.5 if ever wanted.
- **TDD discipline:** every code change lands behind a failing test or red-validator demo first. Pure docs (Low #1) is the only exception.
- **iOS push gate:** all iOS commits local-only. No push until S9 Phase 2.2 5-point ship-ready check + owner authorization.

---

### Task 1 — Codex Low #1: Tighten TDD-RED breadcrumb convention wording

**Files:**
- Modify: `docs/ai-collab.md:135-153` (web repo)

Codex finding: the current text at `docs/ai-collab.md:135-143` requires an inverted-first RED demo to leave a code comment or pre-commit, while `docs/ai-collab.md:151-153` says commit-body-only is acceptable. Future agents could read this as contradictory.

Codex's recommended wording: "commit body is acceptable only for explicit skipped/degenerated RED; inverted-first needs code breadcrumb or history artifact."

- [ ] **Step 1: Read `docs/ai-collab.md:130-160` to anchor exact phrasing**

- [ ] **Step 2: Edit the contradiction in place**

  Replace the ambiguous pair with a single rule that distinguishes the two RED postures. Exact replacement TBD on Step 1 inspection — must read first to preserve surrounding context.

- [ ] **Step 3: Verify the resulting paragraph reads coherently end-to-end**

  Read the full TDD-RED breadcrumb section after the edit. Confirm no contradiction remains.

- [ ] **Step 4: Commit**

  ```bash
  cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant
  git add docs/ai-collab.md
  git commit -m "docs: clarify TDD-RED breadcrumb convention (Codex Low #1)"
  ```

---

### Task 2 — Codex Medium #2: validate-data range check on `fan_multiplier`

**Files:**
- Modify: `scripts/validate-data.js:163-170` (web repo)

Codex finding: web `scripts/validate-data.js:163-170` only requires `fan_multiplier` to be `typeof === 'number'`; engine at `engine.js:1246` and `engine.js:2655` treats `0` as malformed and silently falls back to identity. Schema is more permissive than engine; surprising values pass validation but get silently corrected at runtime. Range check the schema against engine reality.

**Lock:** Path A — `typeof === 'number' && > 0 && <= 1`.

- [ ] **Step 1: Read `scripts/validate-data.js:155-185` to see the current env-rule validation block**

- [ ] **Step 2: TDD-RED — temporarily mutate `data/rules/environment.json` `cold` entry to `fan_multiplier: 0`, run validator, watch it pass**

  ```bash
  cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant
  # Manually edit data/rules/environment.json, change cold's fan_multiplier from 0.9 to 0
  node scripts/validate-data.js
  # Expected (bug): "6/6 files valid" — RED proven (validator misses the bad value)
  ```

- [ ] **Step 3: Add the range check**

  In the env-rule validator block at the cited lines, alongside the existing `typeof === 'number'` check on `fan_multiplier`, add:

  ```js
  if (env.fan_multiplier !== undefined && (env.fan_multiplier <= 0 || env.fan_multiplier > 1)) {
    errors.push(`environment.json: ${env.id}.fan_multiplier must be > 0 and <= 1 (got ${env.fan_multiplier})`);
  }
  ```

  (Exact statement form per the existing style at the cited lines; verify on Step 1 read.)

- [ ] **Step 4: Re-run validator with broken fixture, confirm it now FAILS**

  ```bash
  node scripts/validate-data.js
  # Expected: validator surfaces "cold.fan_multiplier must be > 0 and <= 1 (got 0)" and exits non-zero — GREEN
  ```

- [ ] **Step 5: Revert `data/rules/environment.json` back to `fan_multiplier: 0.9`**

  ```bash
  git checkout data/rules/environment.json
  ```

- [ ] **Step 6: Run full verification gate**

  ```bash
  node scripts/validate-data.js               # 6/6 files valid
  node scripts/walkthrough-harness.js         # 11 v1.0.4 OK lines, all green
  node scripts/profile-matrix-audit.js        # 55/55 curated + 47196/0 broad
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add scripts/validate-data.js
  git commit -m "fix: validate fan_multiplier range > 0 and <= 1 (Codex Medium #2)"
  ```

---

### Task 3 — Codex Medium #1: iOS Advanced cooling UI env-scaled parity

**Files:**
- Read: `3DPrintAssistant/Views/Output/FilamentSettingsView.swift:52-65` (iOS repo)
- Read: `3DPrintAssistant/ViewModels/OutputViewModel.swift:87-96` (iOS repo)
- Read: `3DPrintAssistant/Engine/EngineService.swift:70-84` + `:690-704` (Codable + bridge — verify decode path)
- Modify: `3DPrintAssistant/ViewModels/OutputViewModel.swift` (wire `advancedSettings` into cooling rows)
- Modify: `3DPrintAssistant/Views/Output/FilamentSettingsView.swift` (consume env-scaled values for cooling rows)
- Modify: `3DPrintAssistantTests/EngineServiceTests.swift` (add new test `testV104_AdvancedCoolingUIRendersEnvScaled`)

Codex finding: iOS decodes the new env-scaled Advanced fan fields and tests them at the bridge layer (`EngineServiceTests.swift:1025-1050`), but `FilamentSettingsView.swift:52-65` still renders the raw `filProfile.coolingFan` / `filProfile.coolingFanMin` from state-less `getFilamentProfile`. Web Advanced shows `63%` env-scaled for PLA+cold; iOS Advanced still shows `70%`.

Web reference: `app.js:1244-1252` renders `adv.fan_min_speed.value` and `adv.cooling_fan_overhang` (env-scaled from `getAdvancedFilamentSettings`).

- [ ] **Step 1: Read the three iOS source files at the cited line ranges**

  ```bash
  cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios
  ```

  Confirm: (a) `OutputViewModel` already fetches `advancedSettings` but currently routes only the temperature rows to it; (b) `FilamentSettingsView`'s cooling rows pull from a different property; (c) `AdvancedFilamentSettings` Codable struct already exposes `fanMinSpeed`, `fanMaxSpeed`, `coolingFanOverhang` per S8.5's F2 fix.

- [ ] **Step 2: Read web reference to confirm the expected env-scaled values for the test fixture**

  Web walkthrough OK line for the PLA+cold+x1c case asserts `fan_min=63, fan_max=90, cooling_fan_overhang=90`. Use those as the iOS test's expected values.

- [ ] **Step 3: Write the failing XCTest — `testV104_AdvancedCoolingUIRendersEnvScaled`**

  Add to `3DPrintAssistantTests/EngineServiceTests.swift` in the `testV104_*` block. Test asserts the view-model's cooling-row output (or equivalent presentation property) reports `63 / 90 / 90` for state `{printer: x1c, material: pla_basic, nozzle: std_0.4, environment: cold, ...}` in Advanced mode, NOT the raw `70 / 100 / 100`.

  Test shape (verify exact API on Step 1 read):

  ```swift
  func testV104_AdvancedCoolingUIRendersEnvScaled() throws {
      let state = AppState(printer: "x1c", material: "pla_basic",
                           nozzle: "std_0.4", environment: "cold", /* ... defaults ... */)
      let vm = OutputViewModel(state: state, mode: .advanced)
      vm.refresh()
      // Cooling rows must reflect env-scaled values from getAdvancedFilamentSettings,
      // not raw state-less values from getFilamentProfile.
      XCTAssertEqual(vm.advancedFanMin, 63, "PLA+cold+x1c: fan_min must be env-scaled to 63%")
      XCTAssertEqual(vm.advancedFanMax, 90, "PLA+cold+x1c: fan_max must be env-scaled to 90%")
      XCTAssertEqual(vm.advancedFanOverhang, 90, "PLA+cold+x1c: overhang must be env-scaled to 90%")
  }
  ```

- [ ] **Step 4: Run the new test, confirm RED**

  ```bash
  xcodebuild test -project 3DPrintAssistant.xcodeproj \
    -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,id=5F8312F5-B1C2-46C8-8DE3-E9355475DCAF' \
    -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_AdvancedCoolingUIRendersEnvScaled
  ```

  Expected: fails because view-model exposes raw `70/100/100` (or properties don't exist yet).

- [ ] **Step 5: Wire `OutputViewModel.swift` to expose env-scaled cooling values from `advancedSettings`**

  Add three properties (or extend the existing cooling section) that read from `advancedSettings?.fanMinSpeed` / `fanMaxSpeed` / `coolingFanOverhang` and fall back to `filProfile` only when not in Advanced mode.

- [ ] **Step 6: Wire `FilamentSettingsView.swift:52-65` to consume the new view-model properties for the cooling rows in Advanced mode**

  Keep Simple-mode rendering on `filProfile` unchanged.

- [ ] **Step 7: Re-run the new test, confirm GREEN**

  ```bash
  xcodebuild test -project 3DPrintAssistant.xcodeproj \
    -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,id=5F8312F5-B1C2-46C8-8DE3-E9355475DCAF' \
    -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_AdvancedCoolingUIRendersEnvScaled
  ```

- [ ] **Step 8: Run full iOS XCTest suite — confirm 108 → 109 unit tests green (plus 1 UI)**

  ```bash
  xcodebuild test -project 3DPrintAssistant.xcodeproj \
    -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,id=5F8312F5-B1C2-46C8-8DE3-E9355475DCAF' \
    -skip-testing:3DPrintAssistantUITests
  ```

- [ ] **Step 9: Commit (local-only — push gate active)**

  ```bash
  git add 3DPrintAssistant/Views/Output/FilamentSettingsView.swift \
          3DPrintAssistant/ViewModels/OutputViewModel.swift \
          3DPrintAssistantTests/EngineServiceTests.swift
  git commit -m "fix: render env-scaled fan values in Advanced cooling UI (Codex Medium #1)"
  ```

---

### Task 4 — Codex Low #2: iOS T5 mirror gap — x1c AMS-like must-not-fire

**Files:**
- Read: `scripts/walkthrough-harness.js:876-884` (web repo — reference for exact warning IDs)
- Modify: `3DPrintAssistantTests/EngineServiceTests.swift:1199-1203` (iOS T5 block, x1c AMS-like sub-case)

Codex finding: web harness at `scripts/walkthrough-harness.js:876-884` asserts the x1c AMS-like branch must NOT fire `ams_lite_material_incompat` or `mcs_empty_no_multicolor`. iOS T5 (`testV104_T5_PracticalMCSTiers`) at `EngineServiceTests.swift:1199-1203` only asserts `prime_tower` is present for the same x1c AMS-like sub-case. Add the negative assertions to mirror.

- [ ] **Step 1: Read the web harness assertion block at `scripts/walkthrough-harness.js:876-884`** to copy the exact warning IDs and the exact sub-case state.

- [ ] **Step 2: Read the iOS T5 block at `EngineServiceTests.swift:1199-1203`** to anchor the insertion point (within the existing x1c AMS-like sub-case).

- [ ] **Step 3: TDD-RED — temporarily insert one inverted assertion**

  ```swift
  // RED demo: prove the matcher works by asserting the wrong thing
  XCTAssertTrue(warningIds.contains("ams_lite_material_incompat"),
                "TDD-RED demo — should fail because x1c AMS-like must NOT fire this")
  ```

  Run that single test. Expected: fails with full warning-ID dump showing the warning is correctly absent.

- [ ] **Step 4: Flip to correct form — add both negative assertions**

  ```swift
  XCTAssertFalse(warningIds.contains("ams_lite_material_incompat"),
                 "x1c AMS-like must not fire ams_lite_material_incompat")
  XCTAssertFalse(warningIds.contains("mcs_empty_no_multicolor"),
                 "x1c AMS-like must not fire mcs_empty_no_multicolor")
  ```

- [ ] **Step 5: Run T5, confirm GREEN**

  ```bash
  cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios
  xcodebuild test -project 3DPrintAssistant.xcodeproj \
    -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,id=5F8312F5-B1C2-46C8-8DE3-E9355475DCAF' \
    -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_T5_PracticalMCSTiers
  ```

- [ ] **Step 6: Run full iOS XCTest suite — confirm 109 → still 109 unit (assertions added to existing test, no new test method)**

- [ ] **Step 7: Commit (local-only)**

  ```bash
  git add 3DPrintAssistantTests/EngineServiceTests.swift
  git commit -m "test: mirror x1c AMS-like must-not-fire warnings in T5 (Codex Low #2)"
  ```

---

### After all four land — reviewer + verification + close

- [ ] **Step A: Internal code-review subagent — both repos**

  SHA range web: `d9e58fa..HEAD`. SHA range iOS: `fd4761a..HEAD`. Same template as S8.5/S8/S7-N reviewer prompts. Pattern is 5-for-5 across the v1.0.4 arc — expect at least one substantive finding.

- [ ] **Step B: Tightening commit if reviewer surfaces Important findings**

  Per S8.5 pattern, address Important findings inline; carry Minor as informational notes in the session log.

- [ ] **Step C: Final verification gate (verification-before-completion discipline)**

  ```bash
  # Web
  cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant
  node scripts/validate-data.js               # 6/6 files valid
  node scripts/walkthrough-harness.js         # 11 v1.0.4 OK lines
  node scripts/profile-matrix-audit.js        # 55/55 curated + 47196/0 broad

  # iOS
  cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios
  xcodebuild test -project 3DPrintAssistant.xcodeproj \
    -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,id=5F8312F5-B1C2-46C8-8DE3-E9355475DCAF' \
    -skip-testing:3DPrintAssistantUITests
  # Expected: 109 unit tests green
  ```

- [ ] **Step D: Trigger A close**

  - Session log: `docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s8-7-codex-cleanup.md`
  - INDEX prepend (one bullet, top of file)
  - ROADMAP update — replace S8.5 GO-for-S9 callout with "S8.7 closed all 4 Codex Medium/Low; S9 cold-starts on Phase 2.2 / Task 9 ship gate (no audit gate remaining)"
  - NEXT-SESSION regen — strip the "PREREQUISITE: read Codex response first" section; rewrite as clean S9 Phase 2.2 cold-start
  - Memory sweep + vault sweep per Phase 3 of Trigger A
  - Self-check per Phase 5

---

## Self-review (writing-plans skill)

- **Spec coverage:** all 4 Codex findings → 4 tasks. Medium #1 (iOS UI) → Task 3. Medium #2 (web schema) → Task 2. Low #1 (web docs) → Task 1. Low #2 (iOS test) → Task 4. ✓
- **Placeholder scan:** none. Test names, file paths, line refs, expected values, and exact commands all concrete. Step 1 "exact replacement TBD" in Task 1 is acceptable — wording change must be anchored to live file content, can't be pre-written without inspection.
- **Type consistency:** view-model property names (`advancedFanMin` / `advancedFanMax` / `advancedFanOverhang`) used consistently in Task 3 Steps 3 + 5 + 6. Warning IDs (`ams_lite_material_incompat` / `mcs_empty_no_multicolor`) consistent in Task 4 Steps 1 + 4.

---

**Maintenance note:** This plan is the canonical S8.7 task list. Tightening discoveries during reviewer pass append as a separate sub-section, not as inline edits to the original tasks.
