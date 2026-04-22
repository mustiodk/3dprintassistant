# RB-2: Move EngineService off @MainActor

**Branch:** `feat/rb2-actor` (branch off `feat/rb3-rb1-bridge-hardening`)
**Scope:** 6 files, ~20 mechanical edits. No logic changes anywhere.
**Goal:** Convert `EngineService` from `@MainActor final class` to `actor`, move all bridge work off the main thread, update every call site to `await` the now-async methods.

---

## Context

`EngineService` is currently annotated `@MainActor`, meaning all its JSCore work — file loading, JS evaluation, Engine.init() polling, and every bridge call — runs on the main thread. This blocks UI for the entire duration of engine initialization and profile resolution. Converting to `actor` gives us automatic actor isolation on a non-main thread with zero manual locking.

Module name: `PrintAssistant` (not `3DPrintAssistant`).

---

## Step 1 — Branch

```bash
git checkout feat/rb3-rb1-bridge-hardening
git pull
git checkout -b feat/rb2-actor
```

---

## Step 2 — EngineService.swift (1 change)

File: `3DPrintAssistant/Engine/EngineService.swift`

Change **only** the class declaration. Nothing else in this file changes.

```swift
// BEFORE:
@MainActor
final class EngineService {

// AFTER:
actor EngineService {
```

Remove the `@MainActor` line entirely. Keep `final` removed too — actors cannot be `final` (it's redundant and not valid syntax).

**Do not change any method signatures, property declarations, or logic.**

> ⚠️ If the build produces a warning about `JSContext` not being `Sendable`, add `nonisolated(unsafe)` to the `private var context: JSContext?` property. Do this only if the compiler warns — don't add it preemptively.

---

## Step 3 — EngineServiceTests.swift (2 changes)

File: `3DPrintAssistantTests/EngineServiceTests.swift`

**Change 1:** Remove `@MainActor` from the test class declaration.

```swift
// BEFORE:
@MainActor
final class EngineServiceTests: XCTestCase {

// AFTER:
final class EngineServiceTests: XCTestCase {
```

**Change 2:** Add `await` to every direct EngineService call that is currently `try` without `await`. The `initialize()` call already has `await` — leave it. Update these:

```swift
// resolveProfile calls — add await:
let profile = try await EngineService.shared.resolveProfile(state)

// getWarnings calls — add await:
let warnings = try await EngineService.shared.getWarnings(state)

// getSlicerForPrinter calls — add await:
let slicer = try await EngineService.shared.getSlicerForPrinter("x1c")
let slicer = try await EngineService.shared.getSlicerForPrinter("mk4")
```

All test methods are already `async throws` — no structural changes needed.

---

## Step 4 — OutputView.swift (3 changes)

File: `3DPrintAssistant/Views/Output/OutputView.swift`

**Change 1 — loadProfile():** Already `async`. Add `await` to each of the 5 bridge calls:

```swift
private func loadProfile() async {
    do {
        slicer = (try? await EngineService.shared.getSlicerForPrinter(appState.printer)) ?? "bambu_studio"
        resolvedParams = (try? await EngineService.shared.resolveProfile(appState)) ?? [:]
        filProfile = try? await EngineService.shared.getFilamentProfile(appState.material)
        adjustedTemps = (try? await EngineService.shared.getAdjustedTemps(
            materialId: appState.material,
            environmentId: appState.environment,
            nozzleId: appState.nozzle,
            speedId: appState.speed
        )) ?? AdjustedTemps(nozzle: "—", bed: "—")
        warnings = (try? await EngineService.shared.getWarnings(appState)) ?? []
    }
    withAnimation { isLoading = false }
}
```

**Change 2 — exportBambuJSON():** Sync button action — wrap the engine call in a `Task`. UI state updates must stay on `@MainActor` (they already are since this is a SwiftUI View):

```swift
private func exportBambuJSON() {
    Task { @MainActor in
        guard let result = try? await EngineService.shared.exportBambuStudioJSON(appState) else { return }
        let tmpDir = FileManager.default.temporaryDirectory
        do {
            let processData = try JSONSerialization.data(withJSONObject: result.process, options: [.prettyPrinted, .sortedKeys])
            let filamentData = try JSONSerialization.data(withJSONObject: result.filament, options: [.prettyPrinted, .sortedKeys])
            let processURL = tmpDir.appendingPathComponent("process.json")
            let filamentURL = tmpDir.appendingPathComponent("filament.json")
            try processData.write(to: processURL)
            try filamentData.write(to: filamentURL)
            shareItems = [processURL, filamentURL]
            showShareSheet = true
        } catch {
            print("[OutputView] Export error: \(error)")
        }
    }
}
```

**Change 3 — shareAsText():** Same pattern:

```swift
private func shareAsText() {
    Task { @MainActor in
        guard let text = try? await EngineService.shared.formatProfileAsText(appState) else { return }
        shareItems = [text]
        showShareSheet = true
    }
}
```

---

## Step 5 — GoalsView.swift (2 changes)

File: `3DPrintAssistant/Views/Configurator/GoalsView.swift`

**Change 1 — loadFilters():** Make async, add `await`:

```swift
private func loadFilters() async {
    let groups = (try? await EngineService.shared.getFilters()) ?? []
    filterGroups = Dictionary(uniqueKeysWithValues: groups.map { ($0.key, $0) })
}
```

**Change 2 — .task modifier:** Add `await`:

```swift
.task { await loadFilters() }
```

---

## Step 6 — ChecklistSheet.swift (1 change)

File: `3DPrintAssistant/Views/Output/ChecklistSheet.swift`

In the `.task` modifier, add `await`:

```swift
.task {
    items = (try? await EngineService.shared.getChecklist(appState)) ?? []
}
```

---

## Step 7 — NozzlePickerView.swift (2 changes)

File: `3DPrintAssistant/Views/Configurator/NozzlePickerView.swift`

**Change 1 — loadNozzles():** Make async, add `await`:

```swift
private func loadNozzles() async {
    nozzles = (try? await EngineService.shared.getCompatibleNozzles(appState.material)) ?? []
    if let existing = nozzles.first(where: { $0.id == appState.nozzle && $0.compatible }) {
        selectedId = existing.id
    }
}
```

**Change 2 — .task modifier:** Add `await`:

```swift
.task { await loadNozzles() }
```

---

## Step 8 — Build and test

```bash
# Build check
xcodegen generate
xcodebuild build -scheme PrintAssistant -destination 'platform=iOS Simulator,name=iPhone 16'

# Run all tests
xcodebuild test -scheme PrintAssistant -destination 'platform=iOS Simulator,name=iPhone 16'
```

**Expected:** All 10 tests pass. Zero new warnings (or only the JSContext Sendable warning if strict concurrency is enabled — handle per Step 2 note).

---

## Step 9 — Commit

```bash
git add 3DPrintAssistant/Engine/EngineService.swift \
        3DPrintAssistant/Views/Output/OutputView.swift \
        3DPrintAssistant/Views/Configurator/GoalsView.swift \
        3DPrintAssistant/Views/Output/ChecklistSheet.swift \
        3DPrintAssistant/Views/Configurator/NozzlePickerView.swift \
        3DPrintAssistantTests/EngineServiceTests.swift

git commit -m "RB-2: move EngineService off @MainActor to actor

Convert EngineService from @MainActor final class to actor.
All JSCore work now runs off the main thread with automatic
actor isolation. Update all 5 call-site files to await bridge
methods. Remove @MainActor from test class. Zero logic changes."
```

---

## Done when

- [ ] `actor EngineService` — no `@MainActor` anywhere in EngineService.swift
- [ ] All 10 tests pass
- [ ] No `@MainActor` on the test class
- [ ] Build succeeds with no new errors
