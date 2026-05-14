# S8 — Phase 2.1 / Task 8: iOS Engine + Data Byte-Identical Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The 7 remediation-arc skills (using-superpowers + writing-plans + executing-plans + requesting-code-review + systematic-debugging + test-driven-development + verification-before-completion) are already loaded for this session.

**Goal:** Byte-identical sync of web `engine.js` + `data/*.json` into the iOS app, plus iOS XCTests mirroring every Phase 1 + Phase 1.5 walkthrough invariant, producing ONE iOS local commit. No push.

**Architecture:** Web is master; iOS mirrors via `cp` + `diff -q` byte-identity. The iOS `JSContext` engine layer doesn't change — `EngineService.swift` reads the same JS module. Data files are bundled resources, so `cp` to the iOS `3DPrintAssistant/Data/` and `3DPrintAssistant/Engine/` directories is sufficient. New XCTests cover the v1.0.4 behavior surface (Phase 1: 7 tasks; Phase 1.5: HIGH-01 export, HIGH-02 PLA cold/chamber, MEDIUM-01 bed-clamp attribution; LOW-01 is test-only on web — no iOS analog needed).

**Tech Stack:** SwiftUI, JavaScriptCore, XCTest, xcodebuild, xcodegen. No new dependencies. Test runner: `xcodebuild test` on iPhone 17 Pro simulator with `CODE_SIGNING_ALLOWED=NO`.

**Key constraints:**
- **iOS push gate active** — local commits only. `git push` is BLOCKED until S9's 5-point ship-ready check passes.
- **Byte-identical rule** — `diff -q` must produce no output for every synced file.
- **No `AppStateBuilder` helper** — the codebase uses direct `AppState()` mutation (verified at `3DPrintAssistant/Models/AppState.swift`); match the existing style.
- **Forgiving Codable layer** (3dpa-context standing rule #9) — new additive fields decode cleanly; if a test fails on decode, escalate, do not patch Codable layer without owner consent.
- **One iOS commit** for the whole sync + XCTest bundle. Tightening commit allowed if internal reviewer surfaces Important findings (matches S7-2 / S7-4 / S7-3 pattern; 3-for-3 on Phase 1.5).

---

## Pre-Flight Verification

### Task 0: Confirm clean state on both repos

**Files:** none (read-only).

- [ ] **Step 0.1: Confirm web HEAD is post-Phase-1.5 close**

```bash
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant log --oneline -8
```

Expected (top 6 commits, in this order):
- `2994d3b docs: wrap S7-3 v1.0.4 Phase 1.5 MEDIUM-01 — Phase 1.5 CLOSES; S8 prep`
- `58d919b fix: tighten P1.5 MEDIUM-01 — partial-clip branch coverage + safety comment`
- `243be51 fix: first-layer bed-clamp attribution honesty (P1.5 MEDIUM-01)`
- `bc9c655 test: tighten P1.5 LOW-01 — Creality empty-MCS sub-case + console.log symmetry`
- `d863635 test: harden contract for retired warning IDs (P1.5 LOW-01)`
- `28089e5 docs: wrap S7-2 v1.0.4 Phase 1.5 HIGH-02 — Option B PLA cold/chamber safety`

If the top commit is not `2994d3b`, STOP and surface the divergence.

- [ ] **Step 0.2: Confirm both worktrees clean**

```bash
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant status --short
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios status --short
```

Expected: no output from either command (both clean).

If either shows changes, STOP and surface the diff before continuing.

- [ ] **Step 0.3: Confirm iOS HEAD is `eeb2915`**

```bash
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios log --oneline -3
```

Expected top line: `eeb2915 fix: place i7 under Creality catalog`

If different, STOP and surface what's diverged.

---

## Phase A — Byte-Identical Sync

### Task 1: Sync engine.js (web → iOS)

**Files:**
- Modify: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Engine/engine.js` (byte-identical from web `engine.js`)

- [ ] **Step 1.1: Pre-sync byte size snapshot**

```bash
wc -c /Users/mragile.io/Documents/Claude/Projects/3dprintassistant/engine.js \
      /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Engine/engine.js
```

Expected: web = `201074` bytes (current); iOS = `174618` bytes (pre-sync, from 2026-05-10 era). Numbers will differ — that's exactly the surface this sync closes.

- [ ] **Step 1.2: Copy engine.js**

```bash
cp /Users/mragile.io/Documents/Claude/Projects/3dprintassistant/engine.js \
   /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Engine/engine.js
```

- [ ] **Step 1.3: Verify byte-identity**

```bash
diff -q /Users/mragile.io/Documents/Claude/Projects/3dprintassistant/engine.js \
        /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Engine/engine.js && \
echo "engine.js byte-identical"
```

Expected: only `engine.js byte-identical` printed (no `diff` output).

### Task 2: Sync data/*.json (top-level)

**Files:**
- Modify: `3DPrintAssistant/Data/printers.json` (byte-identical)
- Modify: `3DPrintAssistant/Data/materials.json` (byte-identical)
- Modify: `3DPrintAssistant/Data/nozzles.json` (byte-identical)

- [ ] **Step 2.1: Copy all three top-level data files**

```bash
WEB_DATA=/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/data
IOS_DATA=/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Data
cp "$WEB_DATA/printers.json"   "$IOS_DATA/printers.json"
cp "$WEB_DATA/materials.json"  "$IOS_DATA/materials.json"
cp "$WEB_DATA/nozzles.json"    "$IOS_DATA/nozzles.json"
```

- [ ] **Step 2.2: Verify byte-identity of all three**

```bash
WEB_DATA=/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/data
IOS_DATA=/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Data
diff -q "$WEB_DATA/printers.json"  "$IOS_DATA/printers.json"  && \
diff -q "$WEB_DATA/materials.json" "$IOS_DATA/materials.json" && \
diff -q "$WEB_DATA/nozzles.json"   "$IOS_DATA/nozzles.json"   && \
echo "top-level data files byte-identical"
```

Expected: only `top-level data files byte-identical` printed.

### Task 3: Sync data/rules/*.json

**Files:**
- Modify: `3DPrintAssistant/Data/rules/environment.json`
- Modify: `3DPrintAssistant/Data/rules/objective_profiles.json`
- Modify: `3DPrintAssistant/Data/rules/slicer_capabilities.json`
- Modify: `3DPrintAssistant/Data/rules/troubleshooter.json`

- [ ] **Step 3.1: Pre-sync diff to confirm which rule files actually differ**

```bash
WEB_RULES=/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/data/rules
IOS_RULES=/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Data/rules
for f in environment.json objective_profiles.json slicer_capabilities.json troubleshooter.json; do
  if diff -q "$WEB_RULES/$f" "$IOS_RULES/$f" > /dev/null 2>&1; then
    echo "$f: identical (skip)"
  else
    echo "$f: DIFFERS (will sync)"
  fi
done
```

Expected: at least `environment.json: DIFFERS` (Task 2's env data layer landed there). The other three may be identical or differ — record what's printed.

- [ ] **Step 3.2: Copy all rules files**

```bash
cp /Users/mragile.io/Documents/Claude/Projects/3dprintassistant/data/rules/*.json \
   /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Data/rules/
```

- [ ] **Step 3.3: Verify byte-identity of all four rule files**

```bash
WEB_RULES=/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/data/rules
IOS_RULES=/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Data/rules
diff -q "$WEB_RULES/environment.json"        "$IOS_RULES/environment.json"        && \
diff -q "$WEB_RULES/objective_profiles.json" "$IOS_RULES/objective_profiles.json" && \
diff -q "$WEB_RULES/slicer_capabilities.json" "$IOS_RULES/slicer_capabilities.json" && \
diff -q "$WEB_RULES/troubleshooter.json"     "$IOS_RULES/troubleshooter.json"     && \
echo "all rules files byte-identical"
```

Expected: only `all rules files byte-identical` printed.

### Task 4: Decode smoke test — run existing iOS XCTest pre-additions

**Files:** none (read-only verification).

**Purpose:** Catch any Codable decode breakage from new additive fields BEFORE writing new tests. If the existing 96 tests still pass with the synced data, the forgiving-Codable rule held; if any fail on decode, escalate.

- [ ] **Step 4.1: Run full existing iOS XCTest suite**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    CODE_SIGNING_ALLOWED=NO 2>&1 | tail -50
```

Expected: `** TEST SUCCEEDED **` at the end. Test count = **96** (pre-additions baseline, verified via `grep -c "func test" 3DPrintAssistantTests/*.swift`).

If ANY test fails (especially `testAllBundledResourcesPresent` or decode-adjacent tests):
- STOP. Read the failure output carefully.
- Verify it's an actual decode failure (would mention `keyNotFound`, `typeMismatch`, or a Codable error).
- If decode failure: surface to owner — the forgiving-Codable rule held for additive changes in past phases; a failure now points to a non-additive change that needs an EngineService.swift adjustment outside Task 8 scope (escalate per Stop Condition #2 in NEXT-SESSION).
- If non-decode failure: surface — likely a real behavior change that breaks an existing iOS-side assertion; needs case-by-case review.

---

## Phase B — XCTest Mirroring (TDD-First per new behavior)

**Pattern:** For each new behavior, add ONE new `func test...` to `3DPrintAssistantTests/EngineServiceTests.swift` mirroring the web walkthrough assertion. Match existing test style:
- `let state = AppState()` then property mutation
- `await EngineService.shared.resolveProfile(state)` / `getWarnings(state)` / `getChecklist(state)` / `exportBambuStudioJSON(state)` / `formatProfileAsText(state)`
- Assertions via `XCTAssertEqual`, `XCTAssertTrue`, `XCTAssertFalse`, etc.

**Test naming convention:** `testV104_<TASK>_<BEHAVIOR_DESCRIPTION>()` — e.g. `testV104_T1_StrengthSpeedMultiplier()`. Group together at the bottom of `EngineServiceTests.swift` under a new `// MARK: - v1.0.4 Phase 1` divider.

**TDD discipline:** The web walkthrough already proves these behaviors on engine.js. Since iOS shares the same engine.js byte-identically, these tests are regression coverage — the natural RED is degenerate (tests pass on first run). Follow the S7-4 pattern: write ONE representative assertion **deliberately inverted first**, run the test, watch it fail with a clear message, then flip it. This proves the assertion machinery works without absurd extra work on the remaining mirror tests.

### Task 5: T1 mirror — strength `speed_multiplier` (HIGH-09)

**Files:**
- Modify: `3DPrintAssistantTests/EngineServiceTests.swift` (append new test)

**Mirrors:** Walkthrough block `[v1.0.4 HIGH-09]` at `scripts/walkthrough-harness.js:532`.

- [ ] **Step 5.1: Add the test**

Append to `EngineServiceTests.swift` before the closing `}`:

```swift
    // MARK: - v1.0.4 Phase 1

    /// Mirrors walkthrough [v1.0.4 HIGH-09]: strength tier reduces outer/inner wall speeds proportionally.
    func testV104_T1_StrengthSpeedMultiplier() async throws {
        let state = AppState()
        state.printer = "x1c"
        state.nozzle = "std_0.4"
        state.material = "pla_basic"
        state.useCase = ["functional"]
        state.speed = "balanced"
        state.environment = "normal"

        state.strength = "standard"
        let std = try await EngineService.shared.resolveProfile(state)
        state.strength = "strong"
        let strong = try await EngineService.shared.resolveProfile(state)
        state.strength = "maximum"
        let maxStr = try await EngineService.shared.resolveProfile(state)

        let stdOuter = try Self.numeric(std["outer_wall_speed"])
        let strongOuter = try Self.numeric(strong["outer_wall_speed"])
        let maxOuter = try Self.numeric(maxStr["outer_wall_speed"])
        XCTAssertEqual(stdOuter, 100, accuracy: 0.01, "standard outer should be 100 mm/s on X1C+PLA+balanced")
        XCTAssertEqual(strongOuter, 90, accuracy: 0.01, "strong outer = 100 * 0.9")
        XCTAssertEqual(maxOuter, 80, accuracy: 0.01, "maximum outer = 100 * 0.8")

        let stdInner = try Self.numeric(std["inner_wall_speed"])
        let strongInner = try Self.numeric(strong["inner_wall_speed"])
        XCTAssertLessThan(strongInner, stdInner, "strong inner should be < standard inner")
    }

    /// Helper: strip " mm/s" / " mm" / "%" / "°C" units from a ProfileParam.value and parse as Double.
    private static func numeric(_ param: ProfileParam?) throws -> Double {
        let value = try XCTUnwrap(param?.value, "missing param")
        let stripped = value
            .replacingOccurrences(of: " mm/s", with: "")
            .replacingOccurrences(of: " mm", with: "")
            .replacingOccurrences(of: "°C", with: "")
            .replacingOccurrences(of: "%", with: "")
            .trimmingCharacters(in: .whitespaces)
        return try XCTUnwrap(Double(stripped), "value '\(value)' not numeric")
    }
```

- [ ] **Step 5.2: TDD-RED demo via deliberately-inverted assertion**

Temporarily change line `XCTAssertEqual(strongOuter, 90, accuracy: 0.01, ...)` to `XCTAssertEqual(strongOuter, 999, accuracy: 0.01, ...)` and run JUST this test:

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_T1_StrengthSpeedMultiplier \
    CODE_SIGNING_ALLOWED=NO 2>&1 | tail -20
```

Expected: `Test Failed` with message naming the actual emitted strongOuter (should be 90.0 vs expected 999.0). This proves: (a) the test method is discovered + executed, (b) `numeric()` helper works, (c) `strong` strength resolves to outer speed 90 in iOS exactly as web.

- [ ] **Step 5.3: Flip back to correct value and re-run GREEN**

Revert the line to `XCTAssertEqual(strongOuter, 90, accuracy: 0.01, ...)` and re-run the same `xcodebuild` command. Expected: `Test Succeeded`.

### Task 6: T2 mirror — env data layer + cold-warning copy + env clamp attribution (HIGH-07/08 + HIGH-05 + MEDIUM-05)

**Files:**
- Modify: `3DPrintAssistantTests/EngineServiceTests.swift` (append two tests)

**Mirrors:** Walkthrough block `[v1.0.4 ENV]` (`scripts/walkthrough-harness.js:560`) + `[v1.0.4 MEDIUM-05]` (`:663`).

- [ ] **Step 6.1: Add env data layer test**

Append to `EngineServiceTests.swift` (after Task 5's test):

```swift
    /// Mirrors walkthrough [v1.0.4 ENV] (HIGH-07/08): cold env raises first-layer bed by +7°C,
    /// reduces fan by env.fan_multiplier, and emits draft_shield enabled.
    func testV104_T2a_EnvDataLayerCold() async throws {
        let state = AppState()
        state.printer = "x1c"
        state.nozzle = "std_0.4"
        state.material = "pla_basic"

        state.environment = "normal"
        let advNormal = try await EngineService.shared.getAdvancedFilamentSettings(state)
        state.environment = "cold"
        let advCold = try await EngineService.shared.getAdvancedFilamentSettings(state)

        // Bed first-layer +7°C delta on cold
        let bedNormal = try XCTUnwrap(Double(advNormal.bed_temperature_initial_layer.replacingOccurrences(of: "°C", with: "")))
        let bedCold = try XCTUnwrap(Double(advCold.bed_temperature_initial_layer.replacingOccurrences(of: "°C", with: "")))
        XCTAssertEqual(bedCold - bedNormal, 7, accuracy: 0.01, "cold should raise first-layer bed by env.cold.bed_first_layer_adj=+7°C")

        // Fan reduction
        let fanNormal = try XCTUnwrap(Double(advNormal.fan_max_speed.replacingOccurrences(of: "%", with: "")))
        let fanCold = try XCTUnwrap(Double(advCold.fan_max_speed.replacingOccurrences(of: "%", with: "")))
        XCTAssertLessThan(fanCold, fanNormal, "cold fan_max should be lower than normal")
        XCTAssertEqual(round(fanCold), round(fanNormal * 0.9), accuracy: 0.01, "fan reduced by env.fan_multiplier=0.9 on cold")

        // draft_shield enabled on cold
        let profCold = try await EngineService.shared.resolveProfile(state)
        let draftShield = profCold["draft_shield"]
        XCTAssertNotNil(draftShield, "cold env must emit draft_shield param")
        XCTAssertTrue(draftShield?.value.lowercased().contains("enabled") ?? false,
                      "draft_shield value should indicate enabled on cold; got \(draftShield?.value ?? "(nil)")")
    }
```

- [ ] **Step 6.2: Add env clamp misattribution test (MEDIUM-05)**

```swift
    /// Mirrors walkthrough [v1.0.4 MEDIUM-05]: env-driven nozzle clamp is attributed via
    /// env_compensation_capped_by_material warning (not material-side default).
    func testV104_T2b_EnvClampMisattribution() async throws {
        let state = AppState()
        state.printer = "a1"
        state.nozzle = "std_0.4"
        state.material = "pla_basic"
        state.environment = "vcold"

        let warnings = try await EngineService.shared.getWarnings(state)
        let ids = warnings.map(\.id)
        XCTAssertTrue(ids.contains(where: { $0.contains("env_compensation_capped_by_material") || $0.contains("env_capped") }),
                      "PLA+a1+vcold should emit env-attributed clamp warning; got ids: \(ids)")
    }
```

- [ ] **Step 6.3: Run both tests GREEN**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_T2a_EnvDataLayerCold \
    -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_T2b_EnvClampMisattribution \
    CODE_SIGNING_ALLOWED=NO 2>&1 | tail -20
```

Expected: both `Test Succeeded`.

If T2b fails because the actual warning id is different from the substring match: read web walkthrough lines 663-677 to find the exact id Codex flagged + the actual id emitted by engine.js, and update the assertion's `$0.contains(...)` check to match.

### Task 7: T3 mirror — Physical printer × nozzle guard (HIGH-01)

**Files:**
- Modify: `3DPrintAssistantTests/EngineServiceTests.swift` (append test)

**Mirrors:** Walkthrough block `[v1.0.4 HIGH-01]` (`scripts/walkthrough-harness.js:680`).

- [ ] **Step 7.1: Add the test**

```swift
    /// Mirrors walkthrough [v1.0.4 HIGH-01]: physical printer × nozzle guard
    /// fires for ender3_v3_se+std_0.8 (incompatible), silent for centauri_carbon+std_0.4 (compatible).
    func testV104_T3_PrinterNozzleGuard() async throws {
        let incompat = AppState()
        incompat.printer = "ender3_v3_se"
        incompat.nozzle = "std_0.8"
        incompat.material = "pla_basic"
        let wIncompat = try await EngineService.shared.getWarnings(incompat)
        let idsIncompat = wIncompat.map(\.id)
        XCTAssertTrue(idsIncompat.contains(where: { $0.contains("nozzle") && ($0.contains("not_supported") || $0.contains("incompat") || $0.contains("printer")) }),
                      "ender3_v3_se+std_0.8 must fire physical guard; got ids: \(idsIncompat)")

        let compat = AppState()
        compat.printer = "centauri_carbon"
        compat.nozzle = "std_0.4"
        compat.material = "pla_basic"
        let wCompat = try await EngineService.shared.getWarnings(compat)
        let idsCompat = wCompat.map(\.id)
        XCTAssertFalse(idsCompat.contains(where: { $0 == "printer_nozzle_incompatible" || $0 == "nozzle_not_supported_by_printer" }),
                       "centauri_carbon+std_0.4 must NOT fire physical guard; got ids: \(idsCompat)")
    }
```

- [ ] **Step 7.2: Run GREEN**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_T3_PrinterNozzleGuard \
    CODE_SIGNING_ALLOWED=NO 2>&1 | tail -15
```

Expected: `Test Succeeded`. If the substring match fails, read web harness line 680-721 for the exact warning id and tighten the assertion.

### Task 8: T4 mirror — Physical printer × plate guard + material plate range (HIGH-02 / HIGH-03)

**Files:**
- Modify: `3DPrintAssistantTests/EngineServiceTests.swift` (append test)

**Mirrors:** Walkthrough block `[v1.0.4 HIGH-02/HIGH-03]` (`scripts/walkthrough-harness.js:724`).

- [ ] **Step 8.1: Add the test**

```swift
    /// Mirrors walkthrough [v1.0.4 HIGH-02/HIGH-03]: plate guard fires for h2d+cool_plate (incompat),
    /// silent for compatible plates; plate_bed_temp_range fires for petg_basic+textured_pei (out of range).
    func testV104_T4_PrinterPlateGuard() async throws {
        // Incompatible plate
        let incompat = AppState()
        incompat.printer = "h2d"
        incompat.nozzle = "std_0.4"
        incompat.material = "pla_basic"
        incompat.buildPlate = "cool_plate"
        let wIncompat = try await EngineService.shared.getWarnings(incompat)
        let idsIncompat = wIncompat.map(\.id)
        XCTAssertTrue(idsIncompat.contains(where: { $0.contains("plate") && ($0.contains("not_supported") || $0.contains("incompat")) }),
                      "h2d+cool_plate must fire plate guard; got ids: \(idsIncompat)")

        // Compatible plate, silent
        let compat = AppState()
        compat.printer = "centauri_carbon"
        compat.nozzle = "std_0.4"
        compat.material = "pla_basic"
        compat.buildPlate = "textured_pei"
        let wCompat = try await EngineService.shared.getWarnings(compat)
        let idsCompat = wCompat.map(\.id)
        XCTAssertFalse(idsCompat.contains(where: { $0 == "printer_plate_incompatible" || $0 == "plate_not_supported_by_printer" }),
                       "centauri_carbon+textured_pei must NOT fire plate guard; got ids: \(idsCompat)")

        // Material plate temp range fires for PETG on textured_pei (PETG bed exceeds plate cap)
        let petg = AppState()
        petg.printer = "x1c"
        petg.nozzle = "std_0.4"
        petg.material = "petg_basic"
        petg.buildPlate = "textured_pei"
        let wPetg = try await EngineService.shared.getWarnings(petg)
        let idsPetg = wPetg.map(\.id)
        XCTAssertTrue(idsPetg.contains(where: { $0.contains("plate") && ($0.contains("temp_range") || $0.contains("temp") || $0.contains("range")) }),
                      "petg_basic+textured_pei should fire plate temp-range warning; got ids: \(idsPetg)")
    }
```

- [ ] **Step 8.2: Run GREEN**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_T4_PrinterPlateGuard \
    CODE_SIGNING_ALLOWED=NO 2>&1 | tail -15
```

Expected: `Test Succeeded`. If a substring match misses, read web harness line 724-772 for the exact warning id.

### Task 9: T5 mirror — Practical MCS tiers

**Files:**
- Modify: `3DPrintAssistantTests/EngineServiceTests.swift` (append test)

**Mirrors:** Walkthrough block `[v1.0.4 MCS]` (`scripts/walkthrough-harness.js:775`). This is the largest single block on web — multiple sub-assertions. Mirror as ONE focused iOS test asserting the key invariants (empty-MCS suppression + ams_lite gate + ams_like preserves prime_tower + retired ID silence) rather than splitting into many tests (matches existing iOS test density).

- [ ] **Step 9.1: Add the test**

```swift
    /// Mirrors walkthrough [v1.0.4 MCS]: practical MCS resolver tiers.
    /// Empty-MCS suppresses prime_tower; ams_like preserves it; retired Creality-only / k2_plus_cfs warnings silent.
    func testV104_T5_PracticalMCSTiers() async throws {
        // Empty MCS (Elegoo centauri_carbon, multi_color_systems:[])
        let empty = AppState()
        empty.printer = "centauri_carbon"
        empty.nozzle = "std_0.4"
        empty.material = "pla_basic"
        empty.colors = "multi_2_4"
        let profEmpty = try await EngineService.shared.resolveProfile(empty)
        let warnsEmpty = try await EngineService.shared.getWarnings(empty)
        let idsEmpty = warnsEmpty.map(\.id)
        XCTAssertTrue(idsEmpty.contains("mcs_empty_no_multicolor"),
                      "empty-MCS should fire mcs_empty_no_multicolor; got ids: \(idsEmpty)")
        XCTAssertFalse(idsEmpty.contains("creality_no_multicolor"),
                       "retired creality_no_multicolor must NOT fire on Elegoo empty-MCS (LOW-01 guard)")
        // prime_tower suppressed on empty MCS
        XCTAssertNil(profEmpty["prime_tower"],
                     "empty-MCS must suppress prime_tower emission")

        // ams_like (X1C with AMS) — prime_tower preserved
        let ams = AppState()
        ams.printer = "x1c"
        ams.nozzle = "std_0.4"
        ams.material = "pla_basic"
        ams.colors = "multi_2_4"
        let profAMS = try await EngineService.shared.resolveProfile(ams)
        XCTAssertNotNil(profAMS["prime_tower"],
                        "ams_like tier must preserve prime_tower emission")

        // K2 Plus CFS — retired k2_plus_cfs warning silent
        let cfs = AppState()
        cfs.printer = "k2_plus"
        cfs.nozzle = "std_0.4"
        cfs.material = "pla_basic"
        cfs.colors = "multi_2_4"
        let warnsCfs = try await EngineService.shared.getWarnings(cfs)
        let idsCfs = warnsCfs.map(\.id)
        XCTAssertFalse(idsCfs.contains("k2_plus_cfs"),
                       "retired k2_plus_cfs must NOT fire on k2_plus CFS successor case (LOW-01 guard)")

        // Creality empty-MCS (ender3_v3_se) — retired creality_no_multicolor silent
        let crealityEmpty = AppState()
        crealityEmpty.printer = "ender3_v3_se"
        crealityEmpty.nozzle = "std_0.4"
        crealityEmpty.material = "pla_basic"
        crealityEmpty.colors = "multi_2_4"
        let warnsCrealityEmpty = try await EngineService.shared.getWarnings(crealityEmpty)
        let idsCrealityEmpty = warnsCrealityEmpty.map(\.id)
        XCTAssertFalse(idsCrealityEmpty.contains("creality_no_multicolor"),
                       "retired creality_no_multicolor must NOT fire on Creality empty-MCS (manufacturer-gate regression caught)")
        XCTAssertTrue(idsCrealityEmpty.contains("mcs_empty_no_multicolor"),
                      "Creality empty-MCS should still fire mcs_empty_no_multicolor")
    }
```

- [ ] **Step 9.2: Run GREEN**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_T5_PracticalMCSTiers \
    CODE_SIGNING_ALLOWED=NO 2>&1 | tail -15
```

Expected: `Test Succeeded`.

### Task 10: T6 mirror — Chamber safe-cap guard (HIGH-05)

**Files:**
- Modify: `3DPrintAssistantTests/EngineServiceTests.swift` (append test)

**Mirrors:** Walkthrough block `[v1.0.4 HIGH-05]` (`scripts/walkthrough-harness.js:893`).

- [ ] **Step 10.1: Add the test**

```swift
    /// Mirrors walkthrough [v1.0.4 HIGH-05]: chamber_above_material_safe fires for X1E+PETG
    /// (cap 50°C) and silent for X1C (no active chamber).
    func testV104_T6_ChamberSafeCapGuard() async throws {
        // X1E + PETG → guard fires (active chamber can hit 60°C; PETG safe cap = 50°C)
        let active = AppState()
        active.printer = "x1e"
        active.nozzle = "std_0.4"
        active.material = "petg_basic"
        let warnsActive = try await EngineService.shared.getWarnings(active)
        let idsActive = warnsActive.map(\.id)
        XCTAssertTrue(idsActive.contains("chamber_above_material_safe"),
                      "X1E + PETG must fire chamber_above_material_safe; got ids: \(idsActive)")

        // X1C + PETG → silent (no active chamber)
        let passive = AppState()
        passive.printer = "x1c"
        passive.nozzle = "std_0.4"
        passive.material = "petg_basic"
        let warnsPassive = try await EngineService.shared.getWarnings(passive)
        let idsPassive = warnsPassive.map(\.id)
        XCTAssertFalse(idsPassive.contains("chamber_above_material_safe"),
                       "X1C + PETG (no active chamber) must NOT fire guard; got ids: \(idsPassive)")
    }
```

- [ ] **Step 10.2: Run GREEN**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_T6_ChamberSafeCapGuard \
    CODE_SIGNING_ALLOWED=NO 2>&1 | tail -15
```

Expected: `Test Succeeded`.

### Task 11: T7 mirror — Nozzle min-diameter cleanup + nozzle-side authority drop (HIGH-12 / HIGH-06)

**Files:**
- Modify: `3DPrintAssistantTests/EngineServiceTests.swift` (append test)

**Mirrors:** Walkthrough block `[v1.0.4 HIGH-12/HIGH-06]` (`scripts/walkthrough-harness.js:1064`).

- [ ] **Step 11.1: Add the test**

```swift
    /// Mirrors walkthrough [v1.0.4 HIGH-12/HIGH-06]: nozzle_below_min_diameter is parameterized;
    /// retired cf_small_nozzle + nozzle_too_small stay silent on successor case.
    func testV104_T7_NozzleMinDiameter() async throws {
        // pla_cf needs ≥0.6mm; std_0.4 should fire nozzle_below_min_diameter
        let state = AppState()
        state.printer = "x1c"
        state.nozzle = "std_0.4"
        state.material = "pla_cf"
        let warnings = try await EngineService.shared.getWarnings(state)
        let ids = warnings.map(\.id)
        XCTAssertTrue(ids.contains("nozzle_below_min_diameter"),
                      "pla_cf + std_0.4 must fire nozzle_below_min_diameter; got ids: \(ids)")
        // Retired IDs must be silent on the successor positive case
        XCTAssertFalse(ids.contains("nozzle_too_small"),
                       "retired nozzle_too_small must NOT fire on successor case (LOW-01 guard)")
        XCTAssertFalse(ids.contains("cf_small_nozzle"),
                       "retired cf_small_nozzle must NOT fire on successor case (LOW-01 guard)")

        // Warning text references the required diameter (parameterized, not hardcoded "0.2mm")
        let nbmd = try XCTUnwrap(warnings.first(where: { $0.id == "nozzle_below_min_diameter" }))
        XCTAssertTrue(nbmd.text.contains("0.6mm") || nbmd.text.contains("0.6 mm"),
                      "warning text should reference required diameter 0.6mm; got: \(nbmd.text)")
    }
```

- [ ] **Step 11.2: Run GREEN**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_T7_NozzleMinDiameter \
    CODE_SIGNING_ALLOWED=NO 2>&1 | tail -15
```

Expected: `Test Succeeded`.

### Task 12: P1.5 HIGH-01 mirror — Export env-fan + draft_shield

**Files:**
- Modify: `3DPrintAssistantTests/EngineServiceTests.swift` (append test)

**Mirrors:** Walkthrough block `[v1.0.4 P1.5 HIGH-01-export]` (`scripts/walkthrough-harness.js:612`).

- [ ] **Step 12.1: Add the test**

```swift
    // MARK: - v1.0.4 Phase 1.5

    /// Mirrors walkthrough [v1.0.4 P1.5 HIGH-01-export]: text + Bambu Studio export use env-scaled fan
    /// (63/90 for PLA+cold) + enable_draft_shield='1'.
    func testV104_P1_5_HIGH01_ExportEnvFanDraftShield() async throws {
        let state = AppState()
        state.printer = "x1c"
        state.nozzle = "std_0.4"
        state.material = "pla_basic"
        state.environment = "cold"

        // Text export
        let txt = try XCTUnwrap(try await EngineService.shared.formatProfileAsText(state),
                                "formatProfileAsText returned nil for x1c+cold")
        XCTAssertTrue(txt.contains("Fan speed (min): 63"),
                      "text export should show env-scaled fan_min=63 (70×0.9); got:\n\(txt.prefix(500))")
        XCTAssertTrue(txt.contains("Fan speed (max): 90") || txt.contains("Fan speed (max): 90%"),
                      "text export should show env-scaled fan_max=90 (100×0.9); got:\n\(txt.prefix(500))")

        // Bambu Studio export
        let bs = try XCTUnwrap(try await EngineService.shared.exportBambuStudioJSON(state),
                               "exportBambuStudioJSON returned nil for x1c+cold")
        // draft_shield enabled
        let draftShield = bs.process["enable_draft_shield"]
        XCTAssertEqual(draftShield as? String, "1",
                       "BS process.enable_draft_shield should be '1' on cold env; got: \(String(describing: draftShield))")
        // Fan values env-scaled
        let bsFanMin = bs.filament["fan_min_speed"]
        let bsFanMax = bs.filament["fan_max_speed"]
        XCTAssertTrue(Self.toIntString(bsFanMin) == "63" || (bsFanMin as? Int) == 63,
                      "BS filament.fan_min_speed should be 63 (env-scaled); got: \(String(describing: bsFanMin))")
        XCTAssertTrue(Self.toIntString(bsFanMax) == "90" || (bsFanMax as? Int) == 90,
                      "BS filament.fan_max_speed should be 90 (env-scaled); got: \(String(describing: bsFanMax))")
    }

    /// Helper to coerce Any? → its string representation for permissive int/string checks
    /// (Bambu export marshals some numeric fields as strings, others as Int).
    private static func toIntString(_ x: Any?) -> String? {
        if let s = x as? String { return s }
        if let i = x as? Int { return String(i) }
        if let d = x as? Double { return String(Int(d)) }
        return nil
    }
```

- [ ] **Step 12.2: Run GREEN**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_P1_5_HIGH01_ExportEnvFanDraftShield \
    CODE_SIGNING_ALLOWED=NO 2>&1 | tail -20
```

Expected: `Test Succeeded`. If the BS field type is unexpected (`Any?` cast fails), read `EngineService.swift:746-765` (sync_exportBambuStudioJSON) to verify the actual marshaled types and adjust the cast.

### Task 13: P1.5 HIGH-02 mirror — PLA cold/chamber safety

**Files:**
- Modify: `3DPrintAssistantTests/EngineServiceTests.swift` (append test)

**Mirrors:** Walkthrough block `[v1.0.4 P1.5 HIGH-02]` (`scripts/walkthrough-harness.js:963`).

- [ ] **Step 13.1: Add the test**

```swift
    /// Mirrors walkthrough [v1.0.4 P1.5 HIGH-02]: PLA on X1E (active enclosure) + cold:
    /// pla_heat_creep fires; "Keep door closed" / "Preheat enclosure" suppressed; "Open front door" present.
    func testV104_P1_5_HIGH02_PLAColdChamberSafety() async throws {
        // X1E + PLA + cold → pla_heat_creep fires + door/preheat copy suppressed
        let active = AppState()
        active.printer = "x1e"
        active.nozzle = "std_0.4"
        active.material = "pla_basic"
        active.environment = "cold"
        let warnsActive = try await EngineService.shared.getWarnings(active)
        let idsActive = warnsActive.map(\.id)
        XCTAssertTrue(idsActive.contains("pla_heat_creep"),
                      "X1E + PLA + cold must fire pla_heat_creep (active-enclosure extension); got ids: \(idsActive)")

        // No env warning containing "Keep door closed" / "Preheat the enclosure" / "Extended preheat ("
        let combinedText = warnsActive.map(\.text).joined(separator: " || ")
        XCTAssertFalse(combinedText.lowercased().contains("keep door closed"),
                       "PLA + enclosed + cold MUST NOT carry 'Keep door closed' env copy; got: \(combinedText)")
        XCTAssertFalse(combinedText.lowercased().contains("preheat the enclosure"),
                       "PLA + enclosed + cold MUST NOT carry 'Preheat the enclosure' env copy; got: \(combinedText)")
        XCTAssertFalse(combinedText.lowercased().contains("extended preheat ("),
                       "PLA + enclosed + cold MUST NOT carry 'Extended preheat (' env copy; got: \(combinedText)")

        // Checklist: "Open front door" present; "Preheat enclosure" item suppressed
        let checklist = try await EngineService.shared.getChecklist(active)
        let checklistText = checklist.map(\.text).joined(separator: " || ").lowercased()
        XCTAssertTrue(checklistText.contains("open front door"),
                      "PLA + enclosed + cold checklist must include 'Open front door'; got: \(checklistText)")
        XCTAssertFalse(checklistText.contains("preheat enclosure"),
                       "PLA + enclosed + cold checklist MUST NOT include 'Preheat enclosure' item; got: \(checklistText)")

        // Non-regression: passive enclosure (P1S) still fires pla_heat_creep on cold
        let passive = AppState()
        passive.printer = "p1s"
        passive.nozzle = "std_0.4"
        passive.material = "pla_basic"
        passive.environment = "cold"
        let warnsPassive = try await EngineService.shared.getWarnings(passive)
        let idsPassive = warnsPassive.map(\.id)
        XCTAssertTrue(idsPassive.contains("pla_heat_creep"),
                      "P1S (passive) + PLA + cold non-regression: pla_heat_creep must still fire; got ids: \(idsPassive)")

        // Non-regression: PETG + X1E + cold keeps "Keep door closed" (PLA-only suppression scope)
        let petg = AppState()
        petg.printer = "x1e"
        petg.nozzle = "std_0.4"
        petg.material = "petg_basic"
        petg.environment = "cold"
        let warnsPetg = try await EngineService.shared.getWarnings(petg)
        let petgText = warnsPetg.map(\.text).joined(separator: " || ").lowercased()
        XCTAssertTrue(petgText.contains("keep door closed"),
                      "PETG + X1E + cold non-regression: 'Keep door closed' env copy must still fire (PLA-only scope guard)")
    }
```

- [ ] **Step 13.2: Run GREEN**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_P1_5_HIGH02_PLAColdChamberSafety \
    CODE_SIGNING_ALLOWED=NO 2>&1 | tail -20
```

Expected: `Test Succeeded`.

### Task 14: P1.5 MEDIUM-01 mirror — Bed-clamp attribution honesty

**Files:**
- Modify: `3DPrintAssistantTests/EngineServiceTests.swift` (append test)

**Mirrors:** Walkthrough block `[v1.0.4 P1.5 MEDIUM-01]` (`scripts/walkthrough-harness.js:1110`).

- [ ] **Step 14.1: Add the test**

```swift
    /// Mirrors walkthrough [v1.0.4 P1.5 MEDIUM-01]: env_*_bed_first_layer warning reflects post-clamp truth
    /// (3 honest copy branches: full apply / fully clipped / partially clipped).
    func testV104_P1_5_MEDIUM01_BedClampAttribution() async throws {
        // Branch 1 — Fully clipped: PETG + X1C + cold → "requested but clipped"
        // (PETG bed_temp_max=85; engine's +5 PETG initial-layer offset + env's +7 cold → fully clipped by material cap)
        let petgCold = AppState()
        petgCold.printer = "x1c"
        petgCold.nozzle = "std_0.4"
        petgCold.material = "petg_basic"
        petgCold.environment = "cold"
        let warnsPetgCold = try await EngineService.shared.getWarnings(petgCold)
        let envBedWarnPetg = warnsPetgCold.first(where: { $0.id.lowercased().contains("env") && $0.id.lowercased().contains("first_layer") && $0.text.lowercased().contains("bed") })
        XCTAssertNotNil(envBedWarnPetg, "PETG + X1C + cold should emit env first-layer bed warning; got ids: \(warnsPetgCold.map(\.id))")
        if let w = envBedWarnPetg {
            XCTAssertTrue(w.text.lowercased().contains("clipped") || w.text.lowercased().contains("requested but"),
                          "fully-clipped branch should say 'requested but clipped' or similar; got: \(w.text)")
        }

        // Branch 2 — Full apply (un-clipped): PLA + X1C + cold → keeps "+7°C applied"
        let plaCold = AppState()
        plaCold.printer = "x1c"
        plaCold.nozzle = "std_0.4"
        plaCold.material = "pla_basic"
        plaCold.environment = "cold"
        let warnsPlaCold = try await EngineService.shared.getWarnings(plaCold)
        let envBedWarnPlaCold = warnsPlaCold.first(where: { $0.id.lowercased().contains("env") && $0.id.lowercased().contains("first_layer") && $0.text.lowercased().contains("bed") })
        XCTAssertNotNil(envBedWarnPlaCold, "PLA + X1C + cold should emit env first-layer bed warning; got ids: \(warnsPlaCold.map(\.id))")
        if let w = envBedWarnPlaCold {
            XCTAssertTrue(w.text.contains("+7°C applied") || w.text.contains("+7 °C applied"),
                          "full-apply branch should keep '+7°C applied' copy; got: \(w.text)")
        }

        // Branch 3 — Partial clip: PLA + X1C + vcold → "partially clipped"
        let plaVcold = AppState()
        plaVcold.printer = "x1c"
        plaVcold.nozzle = "std_0.4"
        plaVcold.material = "pla_basic"
        plaVcold.environment = "vcold"
        let warnsPlaVcold = try await EngineService.shared.getWarnings(plaVcold)
        let envBedWarnPlaVcold = warnsPlaVcold.first(where: { $0.id.lowercased().contains("env") && $0.id.lowercased().contains("first_layer") && $0.text.lowercased().contains("bed") })
        XCTAssertNotNil(envBedWarnPlaVcold, "PLA + X1C + vcold should emit env first-layer bed warning; got ids: \(warnsPlaVcold.map(\.id))")
        if let w = envBedWarnPlaVcold {
            XCTAssertTrue(w.text.lowercased().contains("partial"),
                          "partial-clip branch should say 'partially clipped' or similar; got: \(w.text)")
        }

        // Pair: printer_max_bed_temp_clamped now fires on PETG + Kobra 3 Max + cold (env contributes to initTarget)
        let petgKobra = AppState()
        petgKobra.printer = "kobra_3_max"
        petgKobra.nozzle = "std_0.4"
        petgKobra.material = "petg_basic"
        petgKobra.environment = "cold"
        let warnsKobra = try await EngineService.shared.getWarnings(petgKobra)
        let idsKobra = warnsKobra.map(\.id)
        XCTAssertTrue(idsKobra.contains("printer_max_bed_temp_clamped"),
                      "PETG + Kobra 3 Max + cold must fire printer_max_bed_temp_clamped (env now contributes to initTarget); got ids: \(idsKobra)")
    }
```

- [ ] **Step 14.2: Run GREEN**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_P1_5_MEDIUM01_BedClampAttribution \
    CODE_SIGNING_ALLOWED=NO 2>&1 | tail -25
```

Expected: `Test Succeeded`. If the env first-layer warning id pattern differs from the substring match, read web harness lines 1110-1221 to find the exact id naming convention and tighten the filter.

---

## Phase C — Full Suite Verification + Commit

### Task 15: Run full iOS XCTest suite post-additions

**Files:** none (read-only verification).

- [ ] **Step 15.1: Run the entire suite**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    CODE_SIGNING_ALLOWED=NO 2>&1 | tail -60
```

Expected:
- `** TEST SUCCEEDED **`.
- Test count = **107** (96 baseline + 11 new). The 11 new tests: T1 strength, T2a env data, T2b env clamp attribution, T3 nozzle guard, T4 plate guard, T5 MCS tiers, T6 chamber cap, T7 nozzle min-diameter, P1.5 HIGH-01 export, P1.5 HIGH-02 PLA cold, P1.5 MEDIUM-01 bed-clamp.

- [ ] **Step 15.2: Verify test count matches expectation**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  grep -c "func test" 3DPrintAssistantTests/*.swift | awk -F: '{sum+=$2} END {print "Total tests:", sum}'
```

Expected: `Total tests: 107`.

If less: a test was lost; re-read EngineServiceTests.swift bottom to confirm all 11 v1.0.4 tests are present.
If more: a test was duplicated or another file changed; investigate.

### Task 16: Pre-commit sanity check on iOS working tree

**Files:** none (read-only verification).

- [ ] **Step 16.1: Confirm only expected files changed**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && git status --short
```

Expected — exactly these modified files (no others):
- `M 3DPrintAssistant/Engine/engine.js`
- `M 3DPrintAssistant/Data/printers.json`
- `M 3DPrintAssistant/Data/materials.json`
- `M 3DPrintAssistant/Data/nozzles.json`
- `M 3DPrintAssistant/Data/rules/environment.json` (and possibly the other 3 rules files if they differed)
- `M 3DPrintAssistantTests/EngineServiceTests.swift`

If you see anything else (`.DS_Store`, build artefacts under `build/`, untracked test scaffolds): surface it. `.DS_Store` is gitignored — should not appear. Build artefacts should not be staged.

- [ ] **Step 16.2: Double-check byte-identity one more time before committing**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant && \
  diff -q engine.js                  ../3dprintassistant-ios/3DPrintAssistant/Engine/engine.js && \
  diff -q data/printers.json         ../3dprintassistant-ios/3DPrintAssistant/Data/printers.json && \
  diff -q data/materials.json        ../3dprintassistant-ios/3DPrintAssistant/Data/materials.json && \
  diff -q data/nozzles.json          ../3dprintassistant-ios/3DPrintAssistant/Data/nozzles.json && \
  diff -q data/rules/environment.json ../3dprintassistant-ios/3DPrintAssistant/Data/rules/environment.json && \
  diff -q data/rules/objective_profiles.json ../3dprintassistant-ios/3DPrintAssistant/Data/rules/objective_profiles.json && \
  diff -q data/rules/slicer_capabilities.json ../3dprintassistant-ios/3DPrintAssistant/Data/rules/slicer_capabilities.json && \
  diff -q data/rules/troubleshooter.json ../3dprintassistant-ios/3DPrintAssistant/Data/rules/troubleshooter.json && \
  echo "ALL byte-identical"
```

Expected: only `ALL byte-identical` printed.

### Task 17: ONE iOS local commit — NO PUSH

**Files:**
- Commit covers all 6 file types from Step 16.1.

- [ ] **Step 17.1: Stage and commit**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  git add 3DPrintAssistant/Engine/engine.js \
          3DPrintAssistant/Data \
          3DPrintAssistantTests/EngineServiceTests.swift && \
  git commit -m "$(cat <<'EOF'
chore: sync v1.0.4 engine + data; add Phase 1 + Phase 1.5 XCTest mirrors

Byte-identical sync from web HEAD 2994d3b (post-Phase-1.5 close):
- engine.js (201074 bytes)
- data/printers.json
- data/materials.json
- data/nozzles.json
- data/rules/*.json

New XCTests in EngineServiceTests.swift mirror walkthrough invariants:
Phase 1:
- testV104_T1_StrengthSpeedMultiplier (HIGH-09)
- testV104_T2a_EnvDataLayerCold (HIGH-07/08)
- testV104_T2b_EnvClampMisattribution (MEDIUM-05)
- testV104_T3_PrinterNozzleGuard (HIGH-01)
- testV104_T4_PrinterPlateGuard (HIGH-02/HIGH-03)
- testV104_T5_PracticalMCSTiers (MCS + LOW-01 guards)
- testV104_T6_ChamberSafeCapGuard (HIGH-05)
- testV104_T7_NozzleMinDiameter (HIGH-12/HIGH-06 + LOW-01 guards)
Phase 1.5:
- testV104_P1_5_HIGH01_ExportEnvFanDraftShield
- testV104_P1_5_HIGH02_PLAColdChamberSafety
- testV104_P1_5_MEDIUM01_BedClampAttribution

iOS XCTest: 96 → 107 (all green). MARKETING_VERSION bump deferred
to S9 Task 9. Phase 2 gate active — no push.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 17.2: Confirm commit landed locally**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && git log --oneline -2
```

Expected: top line is the new commit; second line is `eeb2915 fix: place i7 under Creality catalog`.

- [ ] **Step 17.3: Confirm NOT pushed (Phase 2 gate)**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  git rev-parse HEAD && \
  git rev-parse origin/main && \
  echo "Local HEAD should be AHEAD of origin/main by exactly 1 commit; do NOT push."
```

Expected: local HEAD differs from origin/main (local is ahead by 1).

---

## Phase D — Internal Code Review + Optional Tightening

### Task 18: Dispatch internal code-review subagent on the iOS local commit

**Files:** none (subagent runs read-only).

**Pattern:** Validated 3-for-3 on Phase 1.5 (S7-2 PVA scope creep / S7-4 Creality empty-MCS / S7-3 partial-clip branch coverage). Skipping risks shipping the same class of Important findings.

- [ ] **Step 18.1: Capture commit SHAs for reviewer context**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  BASE_SHA=$(git rev-parse HEAD~1) && HEAD_SHA=$(git rev-parse HEAD) && \
  echo "BASE_SHA=$BASE_SHA"; echo "HEAD_SHA=$HEAD_SHA"
```

Expected: BASE_SHA = `eeb2915`; HEAD_SHA = the new commit.

- [ ] **Step 18.2: Dispatch the reviewer**

Use the Agent tool (`general-purpose` subagent) with a prompt that includes:
1. **What was built** — S8 iOS sync: byte-identical engine.js + data; 11 new XCTests mirroring walkthrough invariants for Phase 1 + Phase 1.5.
2. **Plan reference** — this file (`docs/superpowers/plans/2026-05-14-s8-phase-2-1-ios-sync.md`).
3. **SHA range** — `BASE_SHA..HEAD_SHA` on iOS repo (`/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios`).
4. **Specific things to challenge:**
   - Byte-identity holds? (`diff -q` all 8 files vs web HEAD `2994d3b`).
   - XCTest assertions match the web walkthrough invariants 1-for-1? Any substring matches too loose? (e.g. `$0.contains("plate") && $0.contains("not_supported")` — could that match unrelated future warning ids?)
   - Are all 11 new XCTests actually exercising what the test name claims?
   - Are there v1.0.4 behaviors in the walkthrough that have no iOS mirror? Cross-check `grep -c "v1.0.4" scripts/walkthrough-harness.js` (web) vs the count of `testV104_*` tests (iOS).
   - Test naming collisions or drift from existing iOS test style?
   - Did anything other than the expected 6 files get staged? (Compare against `git show --stat HEAD`.)
   - Is the `numeric()` helper or `toIntString()` helper safe across all uses, or are there edge cases (negative numbers, `Optional<Any>`, ints marshaled as strings)?
   - LOW-01 was deliberately not mirrored (test-only on web, no engine surface) — is that justification correct, or did a behavior surface get missed?
5. **Output format:** Critical / Important / Minor with line-anchored references.

- [ ] **Step 18.3: Triage reviewer findings**

- **Critical:** STOP. Fix in tightening commit before any close.
- **Important:** fix in tightening commit before close.
- **Minor:** evaluate; either fix in tightening or carry-forward to S9 with explicit note.

If the reviewer surfaces 0 Critical + 0 Important: proceed directly to Task 19 (close). If anything Important+: do Task 18.4 below.

- [ ] **Step 18.4 (conditional): Tightening commit**

Apply the must-fix changes from the reviewer. Re-run any affected `-only-testing:` xcodebuild commands GREEN. Then commit:

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  git add <changed files> && \
  git commit -m "$(cat <<'EOF'
chore: tighten S8 sync — <one-line summary of reviewer fixes>

Addresses internal code-review subagent findings:
- <bullet 1>
- <bullet 2>

iOS XCTest still green at 107.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Re-run the full iOS XCTest suite (Task 15.1) post-tightening. **Still no push.**

---

## Phase E — Trigger A Close

### Task 19: Write session log + INDEX + ROADMAP + NEXT-SESSION

**Files:**
- Create: `3dprintassistant/docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s8-ios-sync.md`
- Modify: `3dprintassistant/docs/sessions/INDEX.md` (prepend new bullet)
- Modify: `3dprintassistant/docs/planning/ROADMAP.md` (header date + active-queue v1.0.4 pointer to S9)
- Modify: `3dprintassistant/docs/sessions/NEXT-SESSION.md` (regenerate for S9 Phase 2.2 / Task 9)

- [ ] **Step 19.1: Write session log** following the documented structure (Durable context / What happened / Files touched / Commits / Open questions / Memory sweep / Vault sweep / Next session / Self-check).

- [ ] **Step 19.2: Prepend INDEX bullet** per the documented one-line format.

- [ ] **Step 19.3: Update ROADMAP header date to 2026-05-14, flip active-queue v1.0.4 pointer to "Phase 2.1 closed; S9 Phase 2.2 opens (UI walkthrough + MARKETING_VERSION 1.0.3 → 1.0.4 bump + 5-point ship-ready handoff)".**

- [ ] **Step 19.4: Regenerate NEXT-SESSION.md** for S9 — read order, required-skills list, cold-start procedure, concrete entry point (project.yml `MARKETING_VERSION: 1.0.3` → `1.0.4` + `xcodegen generate` + ScreenCaptureUITests + 5-point ship-ready check), copy-paste prompt block.

- [ ] **Step 19.5: Md-hygiene sweep** per the 7-point checklist at end of `Projects/CLAUDE.md`. Findings → Open questions in the session log.

- [ ] **Step 19.6: Memory sweep + vault sweep** — propose entries OR explicitly say "nothing durable to propagate."

- [ ] **Step 19.7: Self-check section** in session log — one line per Trigger A phase step stating *what was found or skipped*.

### Task 20: Commit + push the close (web-only docs, no iOS push)

**Files:** the four files listed in Task 19.

- [ ] **Step 20.1: Commit on web `3dprintassistant`**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant && \
  git add docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s8-ios-sync.md \
          docs/sessions/INDEX.md \
          docs/planning/ROADMAP.md \
          docs/sessions/NEXT-SESSION.md && \
  git commit -m "$(cat <<'EOF'
docs: wrap S8 v1.0.4 Phase 2.1 — iOS sync + XCTest mirrors (Phase 2.1 closes)

iOS HEAD now <SHA> with byte-identical engine.js + data + 11 new XCTests
mirroring Phase 1 + Phase 1.5 walkthrough invariants. iOS XCTest 96 → 107
all green. iOS local-only — Phase 2 gate active until S9 5-point check.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 20.2: Push web (Cloudflare Pages auto-deploys docs only — no behavioral change)**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant && \
  git push origin main
```

- [ ] **Step 20.3: Confirm iOS is still local-only**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  git status && git log --oneline -3 && \
  echo "iOS local commits: $(git rev-list origin/main..HEAD --count)"
```

Expected: working tree clean; local HEAD is ahead of origin by 1 (or 2 if tightening landed). **Do NOT `git push`** on iOS.

---

## Verification gate (complete)

After Task 20:
- ✅ Web engine + data byte-identical with iOS engine + data (`diff -q` clean).
- ✅ iOS XCTest 96 → 107, all green.
- ✅ One iOS local commit (+ optional tightening commit) with the sync + XCTests; no push.
- ✅ Web docs commit pushed with Trigger A close artefacts.
- ✅ Reviewer findings triaged + addressed.
- ✅ NEXT-SESSION regenerated for S9 Phase 2.2.

**Phase 2.1 closes after this plan completes.**

---

## Stop Conditions / Abort Triggers

If any of these fire mid-execution: STOP, surface to owner, run Trigger B handoff (no NEXT-SESSION regen for vault-primary; iOS is not vault-primary so regen for the partial state).

1. **Decode failure on existing tests (Task 4.1)** — forgiving-Codable rule didn't hold; means a non-additive data shape change snuck in. Diagnose before patching.
2. **A walkthrough invariant cannot be mirrored** on iOS because the underlying EngineService method is missing or returns the wrong shape — surface; not S8 scope to add Swift glue.
3. **Byte-identity diff fails after `cp`** — investigate file-system or encoding issue; do not commit non-identical data.
4. **More than 5 reviewer Important findings** — pause; this would be a sign of structural drift between web + iOS, not just placement bugs.
5. **iOS XCTest takes >5 min per single-test invocation** — simulator state may be wedged; `xcrun simctl shutdown all && xcrun simctl erase all` and retry once; if still slow, surface.

---

## Self-Review (per writing-plans skill)

- **Spec coverage:** Phase 2.1 / Task 8 from the canonical v1.0.4 plan is fully covered. Extension beyond canonical: the canonical plan only references Phase 1 mirrors ("+7 tests"); this S8 plan additionally mirrors the 3 Phase 1.5 engine-surface findings (HIGH-01 export, HIGH-02 PLA cold/chamber, MEDIUM-01 bed-clamp attribution) for total +11 tests. LOW-01 is correctly skipped (test-only on web; no engine surface).
- **Placeholders:** none — every step has runnable bash or complete Swift code.
- **Type consistency:** `EngineService.shared.resolveProfile/getWarnings/getChecklist/getAdvancedFilamentSettings/formatProfileAsText/exportBambuStudioJSON` API signatures verified against `3DPrintAssistant/Engine/EngineService.swift:408+`. `AppState` properties (`printer`, `nozzle`, `material`, `useCase`, `surface`, `strength`, `speed`, `environment`, `support`, `colors`, `userLevel`, `special`, `buildPlate`, `profileMode`) verified against `3DPrintAssistant/Models/AppState.swift`. `numeric()` + `toIntString()` helpers are file-private statics on the test class — no collision.
- **No `AppStateBuilder` reference** — canonical plan's example used it; the codebase doesn't have one, so all tests use direct mutation.

---

## Execution Handoff

Execution mode: **Inline** (per superpowers:executing-plans). The 7 remediation-arc skills are already loaded; this plan slots directly into them.

**No subagent-driven-development for this plan** — the surface is mechanical sync + mirror-tests, not feature work where per-task subagents add value. The internal code-review subagent (Task 18) is the only subagent dispatch.
