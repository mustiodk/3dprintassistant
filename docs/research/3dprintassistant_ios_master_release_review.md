# Master iOS Review + Public Release Readiness — `mustiodk/3dprintassistant-ios`

## Executive summary

The iOS app has a strong foundation and is clearly heading in the right direction.

What is already good:
- Clean SwiftUI app structure
- Clear routing and state flow
- Practical shared-engine strategy through JavaScriptCore
- Good product flow from brand → printer → material → nozzle → goals → output
- A useful start on crash reporting and integration tests
- Solid reusable UI components and a clear visual direction

What is not ready enough for a broad public launch:
- The Swift ↔ `engine.js` contract is still too fragile
- Some core technical work currently happens on the main actor
- Too much user-facing copy is hardcoded
- Public-release hygiene is incomplete in a few important places
- Test coverage is still too thin around the highest-risk paths
- A few product and App Store readiness details still need tightening

This document merges:
1. the original code review
2. a public-release readiness analysis

It is intentionally grouped by priority:

- **Fix now**
- **Before release**
- **Fix later (after release)**

---

# Fix now

These are the most important items. I would treat them as the current top-priority list.

## 1. Replace brittle HTML-based warning parsing with a structured contract
**Files:** `3DPrintAssistant/Engine/EngineService.swift`, shared JS engine contract

### Problem
The iOS app currently parses warnings by assuming `engine.js` returns HTML-like strings such as:

- `<strong>Title</strong> detail text`

Then Swift splits on `</strong>` and strips tags.

### Why this is a serious issue
This is the biggest architectural weakness in the current iOS app.

It means:
- the app depends on presentation formatting, not data
- a small JS-side content change can silently break warning parsing
- warnings can degrade without an obvious compile-time failure
- the iOS app is tightly coupled to a weak bridge contract

### Recommendation
Make the engine return structured warning objects.

### Target shape
```json
[
  {
    "id": "wrong_nozzle",
    "text": "Wrong nozzle for PLA-CF.",
    "detail": "A hardened steel nozzle is required.",
    "fix": "Switch to a hardened steel nozzle."
  }
]
```

### Status
**Critical**
This is the single most important technical fix before trusting the app at scale.

---

## 2. Move heavy engine bridge work off the main actor
**Files:** `3DPrintAssistant/Engine/EngineService.swift`, `3DPrintAssistant/App/PrintAssistantApp.swift`

### Problem
`EngineService` is currently `@MainActor` and handles:
- JSContext initialization
- bundled JSON loading
- JS evaluation
- JSON serialization/deserialization
- repeated bridge calls for profile/warnings/filters/checklists/etc.

### Why this matters
This creates avoidable UI hitch risk and makes the engine bridge harder to scale.

### Recommendation
Move heavy engine work to a dedicated actor or background-isolated service, and keep only the UI boundary on the main actor.

### Status
**Critical**

---

## 3. Remove hardcoded Sentry DSN from app code
**File:** `3DPrintAssistant/App/PrintAssistantApp.swift`

### Problem
The current app code contains a concrete Sentry DSN directly in source.

### Why this matters
For a public app, this is not a great release pattern:
- environment management becomes harder
- staging/beta/prod boundaries become weaker
- config rotation becomes more annoying
- secrets/config handling is less clean than it should be

### Recommendation
Move Sentry configuration to build settings, xcconfig, or environment-specific configuration injection.

### Status
**Critical before public release**

---

## 4. Strengthen bridge error handling so failures are not silently treated as empty data
**File:** `3DPrintAssistant/Engine/EngineService.swift`

### Problem
Several bridge calls return empty arrays or nil when parsing/evaluation fails.

Examples:
- `getWarnings(_:)`
- `getChecklist(_:)`
- `getFilters()`
- `getFilamentProfile(_:)`

### Why this matters
In a public app, silent failure is dangerous because:
- broken data contracts can look like “no content”
- bugs are harder to detect
- support/debugging gets slower
- telemetry becomes less useful

### Recommendation
Differentiate these cases:
- valid empty result
- malformed bridge result
- JS exception
- serialization error
- engine not initialized

### Status
**Critical**

---

## 5. Expand test coverage for the bridge layer before trusting public usage
**File:** `3DPrintAssistantTests/EngineServiceTests.swift`

### Problem
The current tests are useful but still narrow.

### Missing higher-value tests
- `getChecklist`
- `getFilters`
- `getCompatibleNozzles`
- `getFilamentProfile`
- `getAdjustedTemps`
- `exportBambuStudioJSON`
- failure-path / malformed-contract tests
- warning parsing contract tests

### Why this matters
The highest-risk part of the app is the bridge, not the screen layout.

### Status
**Critical**

---

## 6. Split `OutputView` before it becomes the main regression hotspot
**File:** `3DPrintAssistant/Views/Output/OutputView.swift`

### Problem
`OutputView` already handles:
- loading engine output
- tab state
- advanced/simple mode
- warning UI
- checklist sheet
- export menu
- share sheet
- toolbar actions
- derived profile logic
- filament tab logic

### Why this matters
This file is already large enough to become the most likely place for regressions as the product grows.

### Recommendation
Split into:
- `OutputViewModel`
- `WarningsBannerView`
- `FilamentSettingsView`
- `PrintProfileTabView`
- `ExportActionsView`

### Status
**Critical / immediate refactor priority**

---

# Before release

These are the items I would complete before an actual public App Store launch, but after the most urgent technical fixes above.

## 7. Centralize and localize all user-facing strings
**Files:** multiple SwiftUI views

### Problem
There are many hardcoded user-facing strings in:
- `HomeView.swift`
- `BrandPickerView.swift`
- `PrinterPickerView.swift`
- `MaterialPickerView.swift`
- `NozzlePickerView.swift`
- `GoalsView.swift`
- `OutputView.swift`
- `SharedComponents.swift`

### Why this matters
Before public launch, this should be cleaned up for:
- consistency
- easier copy changes
- localization
- future Danish support on iOS
- App Store polish

### Recommendation
Move UI strings into `Localizable.strings` or a typed localization layer.

### Status
**Before release**

---

## 8. Improve export UX and file naming
**File:** `3DPrintAssistant/Views/Output/OutputView.swift`

### Problem
Bambu exports currently use generic filenames like:
- `process.json`
- `filament.json`

### Why this matters
Public users will export/share multiple files. Generic temp filenames are confusing and easy to overwrite.

### Recommendation
Use descriptive filenames including printer, nozzle, and material.

### Example
```swift
3DPA_process_x1c_std_0.4_pla_basic.json
3DPA_filament_x1c_std_0.4_pla_basic.json
```

### Status
**Before release**

---

## 9. Revisit dark-mode lock and appearance strategy
**File:** `3DPrintAssistant/App/ContentView.swift`

### Problem
The app currently hard-locks dark mode with `.preferredColorScheme(.dark)`.

### Why this matters
This may be intentional, but before public launch it should be a conscious product decision, not just a development default.

### Recommendation
Choose one:
- keep dark-only and treat it as branding
- or support system appearance
- or add explicit appearance preference later

### Status
**Before release decision**

---

## 10. Improve public failure states and recovery UX
**Files:** `HomeView.swift`, `OutputView.swift`, bridge error flows

### Problem
The app shows some failure states, but public users need clearer recovery paths.

### Missing polish examples
- retry actions after engine load failure
- better explanation if bundled engine data fails
- clearer export failure feedback
- fallback support path when profile generation fails

### Recommendation
Add:
- retry buttons
- clearer user-safe messaging
- error telemetry hooks
- possibly a “Report issue” path if profile generation fails

### Status
**Before release**

---

## 11. Audit external links and production configuration
**Files:** `HomeView.swift`, app config

### Problem
There is a hardcoded Discord invite link in the UI.

### Why this matters
Public-release apps should avoid scattered environment/config constants in view files.

### Recommendation
Move:
- Discord URL
- support/reporting URLs
- telemetry config
- any public environment endpoints

into centralized config.

### Status
**Before release**

---

## 12. Tighten App Store readiness details
**Files:** `Info.plist`, project config, release process

### Observations
`Info.plist` is fairly minimal and clean, but public release still needs a release-readiness pass.

### Checklist items
- confirm orientation strategy is intentional
- verify launch behavior and launch screen polish
- confirm app privacy disclosures match Sentry usage
- verify no beta wording remains in production flows
- verify App Store metadata matches actual capabilities
- confirm versioning/build numbering process is stable

### Status
**Before release**

---

## 13. Privacy / analytics / crash-reporting review
**Files:** `PrintAssistantApp.swift`, release setup

### Problem
Sentry is present, which is good, but public release needs a proper privacy review.

### Recommendation
Before release, confirm:
- what data is sent to Sentry
- whether PII is excluded
- whether breadcrumbs or traces contain sensitive app state
- whether the privacy policy reflects this
- whether App Store privacy nutrition labels are accurate

### Status
**Before release**

---

## 14. Expand product QA across real device scenarios
**Scope:** manual QA + test checklist

### Must test
- first launch on slow devices
- profile generation on older but supported devices
- app background/foreground transitions during engine init
- export/share flows
- clipboard/long-press copy flows
- rotation behavior, if landscape is supported
- empty results / malformed results
- warning-heavy configurations
- incompatible nozzle flows
- non-Bambu export/share flows

### Status
**Before release**

---

## 15. Add better source-of-truth tests around bundled data
**Files:** engine bridge tests, release QA

### Problem
The app depends on bundled JSON and JS files. Public release safety depends heavily on those packaged resources being valid together.

### Recommendation
Add tests or pre-release checks that confirm:
- bundled resources exist
- expected engine methods resolve
- key filter groups load
- representative printer/material combinations produce sane results

### Status
**Before release**

---

# Fix later (after release)

These are worthwhile improvements, but they do not need to block launch if the higher-priority items are addressed.

## 16. Introduce stronger typing for `AppState`
**File:** `3DPrintAssistant/Models/AppState.swift`

### Problem
`AppState` is mostly stringly typed.

### Recommendation
Gradually introduce enums for:
- environment
- support
- colors
- user level
- advanced options
- slicer IDs where appropriate

### Benefit
Better compile-time safety and less typo-driven state drift.

### Status
**Post-release refactor**

---

## 17. Introduce lightweight view models for major screens
**Files:** future refactor

### Good candidates
- `GoalsViewModel`
- `OutputViewModel`
- maybe a small picker view model layer

### Why
This will reduce view bloat and improve testability.

### Status
**After release**

---

## 18. Make the JS bridge more strongly decoded with `Codable`
**Files:** `EngineService.swift`, bridge models

### Problem
Current parsing is mostly manual.

### Recommendation
Use `Codable` decoding for structured bridge results where possible.

### Benefit
Safer contracts, better error reporting, easier maintenance.

### Status
**After release**

---

## 19. Refine the navigation/state architecture as feature count grows
**Files:** `ContentView.swift`, router/state flow

### Current state
The router is clean and simple.

### Later need
As features grow, you may want:
- deeper route state
- restoration support
- more explicit flow logic
- possibly a more formal coordinator or navigation model

### Status
**After release**

---

## 20. Expand visual polish and accessibility depth
**Files:** multiple views/components

### Areas to improve later
- Dynamic Type review
- VoiceOver labels and flow
- contrast audit
- larger tap-target review
- subtle animation consistency
- iPad layout optimization
- share/export feedback polish

### Status
**After release, but worth planning early**

---

## 21. Separate reusable design system pieces from app-specific components
**File:** `SharedComponents.swift`

### Problem
`SharedComponents.swift` is useful, but risks becoming a mixed bucket over time.

### Recommendation
Split later into:
- typography/components
- feedback components
- settings/profile components
- utility wrappers

### Status
**After release**

---

# Strengths worth preserving

These are things you should actively protect while fixing the above.

## Product flow
The step-based flow is easy to understand and feels approachable.

## Shared engine strategy
Using one rules engine across platforms is a smart move, as long as the contract gets hardened.

## UI component quality
`ParamRow`, `WarningCard`, `SlidingSegmentedControl`, and related reusable pieces are a good base.

## Data-driven direction
The app is clearly built around structured printer/material/rule data, which is the right long-term direction.

## Reusability potential
The current architecture is still small enough to improve without major rewrite pain.

---

# Suggested release path

## Phase 1 — Stabilize now
- Structured warning contract
- Bridge hardening
- Main-actor cleanup
- Stronger tests
- `OutputView` decomposition
- Sentry config cleanup

## Phase 2 — Public release prep
- Localization/string centralization
- Export naming cleanup
- public error-state polish
- privacy review
- App Store readiness pass
- device QA sweep

## Phase 3 — Post-launch refinement
- stronger typing
- view models
- better decoding
- accessibility polish
- architecture refinement

---

# Bottom line

The app is **close enough to be exciting**, but **not yet at the point where I would recommend a broad public release unchanged**.

My honest recommendation:

## Safe to continue beta
Yes.

## Safe for broad public release right now
Not yet.

## What must happen first
If you do only a few things before launch, do these:

1. Fix the warning/data contract
2. Harden the bridge and its error handling
3. Move heavy bridge work off the main actor
4. Expand bridge-focused tests
5. Clean up public-release config, strings, and export UX

Once those are in place, the app will be in a much stronger position for a public release.
