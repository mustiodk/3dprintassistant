# S1 — iOS contextual-feedback prefill fix (design spec)

**Date:** 2026-06-15
**Status:** Draft — sub-agent reviewed (verdict `patch-then-proceed`), patched, pending QA gate
**Topic owner:** S1 of the feedback-pipeline evolution (S1 iOS prefill fix · S2 intake capture completeness · S3 Scout robustness + learned-guardrails config · S4 Intake Retrospective · S5 Assistant autonomy ladder)
**Scope:** iOS app only (`3dprintassistant-ios`). No engine, data, web, or overlay change.
**Ship path:** iOS binary — push-gated to TestFlight (does not reach users until a TestFlight build is dispatched).

---

## 1. Problem

iOS has **eight contextual feedback entry points across six screens**, each meant to open the in-app feedback sheet **pre-selected to the matching category**. In the shipped app (v1.0.4) the sheet **always opens on "General feedback"** regardless of which entry point was tapped. The user must manually change the category dropdown, and most won't.

Three concrete harms, all from the same defect:

1. **Misrouted printer requests (the pipeline harm).** An iOS "Printer missing?" tap that isn't manually re-categorised files `category: generalFeedback`. The web `/api/feedback` tee only forwards `missingPrinter` submissions to the `PRINTER_INTAKE` queue, so these are **invisible to the Printer Intake Scout**. S1 is the upstream repair for one of the two root causes of "printer requests we never see" (the other — genuine user misrouting on either platform — is S2).
2. **Lost diagnostic context.** The two bug-report entry points carry a `contextNote` (`"Engine failed to load: <error>"`, `"Export failed: <error>"`). The same defect drops that note, so bug reports arrive without the error string that triggered them.
3. **Wrong analytics.** `FeedbackView.onAppear` logs `AnalyticsService.trackFeedbackOpened(category: vm.category)`; with the defect `vm.category` is always `.generalFeedback`, so the `/analytics` feedback-category breakdown is mis-attributed. Fixing delivery fixes this for free.

## 2. Root cause

**Verified (this session, against the v1.0.4 tree):**

- The category is correct *at the button*. Each entry point constructs a `FeedbackPrefill` with the right category (pickers → `.missingPrinter`/`.missingFilament`/`.missingNozzle`; Home/Output bug CTAs → `.bugReport` with a contextNote).
- The view-model is correct and already unit-tested. `FeedbackViewModel.apply(prefill:)` sets `category = prefill.category` and seeds the context field; `FeedbackTests.testPrefillSeedsCategoryAndContextNote` proves it. The defect is **not** in the model.
- The defect is in **view-layer delivery**. Every screen uses:
  ```swift
  @State private var showFeedback = false
  @State private var feedbackPrefill: FeedbackPrefill?      // starts nil
  // button action:
  feedbackPrefill = prefill; showFeedback = true
  // presentation:
  .sheet(isPresented: $showFeedback) { FeedbackView(prefill: feedbackPrefill) }
  ```
  `FeedbackView.onAppear` then calls `vm.apply(prefill: prefill)`, and `apply` early-returns on nil (`guard let prefill else { return }`, FeedbackViewModel.swift:36).

**Root-cause mechanism (well-established SwiftUI behavior):** `.sheet(isPresented:)` whose content closure reads a *separate* `@State` optional is the classic stale-capture footgun — SwiftUI captures the content for presentation before the separate `feedbackPrefill` write is observed, so `FeedbackView` receives `prefill: nil`, `apply` early-returns, and the VM stays at its `.generalFeedback` default. This is consistent with the symptom (always General feedback, every entry point). The exact frame-timing is SwiftUI-internal; we confirm the fix **behaviorally**, not by asserting the internal mechanism.

## 3. Scope

**In scope:** Reliable delivery of the contextual category (and context note) to the feedback sheet, for all eight iOS entry points, plus the strongest regression guard the environment allows.

**Out of scope:** Web (structurally immune — §7). Any change to feedback categories, fields, the Discord payload, the web tee, or the Scout (S2/S3). Any redesign of the feedback sheet UI.

## 4. Design

Migrate every contextual entry point from `.sheet(isPresented:)` + a separate optional to **`.sheet(item:)`**, which binds the presented content to the exact item value that triggered presentation — the idiomatic Apple pattern for "present a sheet carrying associated data," which removes the stale-capture bug class entirely.

1. **`FeedbackPrefill: Identifiable`** with a per-instance stable identity:
   ```swift
   struct FeedbackPrefill: Identifiable {
       let id = UUID()
       let category: FeedbackCategory
       let contextNote: String?
       init(category: FeedbackCategory, contextNote: String? = nil) { ... }   // existing custom init; id takes its default
   }
   ```
   The `id` is a fresh `UUID` per instance, **not** derived from `category`. `.sheet(item:)` dedupes by `id`, so a category-derived id would suppress re-presentation when the same category is tapped twice in a row; a fresh-UUID id guarantees every tap re-presents. `.sheet(item:)` requires only `Identifiable` (not `Equatable`/`Hashable`), and the defaulted `id` does not break the existing `FeedbackPrefill(category:contextNote:)` initializer.

2. **Presentation, every site:**
   ```swift
   .sheet(item: $feedbackPrefill) { prefill in
       FeedbackView(prefill: prefill)
   }
   ```
   Presentation is now driven by `feedbackPrefill != nil`. The `showFeedback: Bool` becomes redundant and is removed from all six views; each button action reduces to `feedbackPrefill = FeedbackPrefill(...)`.

3. **General-feedback entry points must pass an explicit prefill.** The two sites that today do `feedbackPrefill = nil; showFeedback = true` must instead set `feedbackPrefill = FeedbackPrefill(category: .generalFeedback)`. Under `.sheet(item:)` a nil item will not present, and this also makes general feedback a deliberate category rather than the accidental fallthrough that caused this bug.

4. **`FeedbackView` applies the prefill in init, not `onAppear` (eliminates the first-frame window).** Today `apply` runs in `onAppear`, which fires after first layout — leaving a one-frame window where `categoryFields` could render the General layout before switching (a polish regression the owner cares about). Instead:
   ```swift
   // FeedbackView
   init(prefill: FeedbackPrefill?) { _vm = State(initialValue: FeedbackViewModel(prefill: prefill)) }
   // FeedbackViewModel
   init(prefill: FeedbackPrefill? = nil) { apply(prefill: prefill) }   // all stored props have defaults before apply runs
   ```
   The `onAppear` block keeps its analytics + review-prompt registration (now reading the correct `vm.category`); only the `apply` call moves to init, and `FeedbackView` no longer needs to store `prefill`. (Fallback if a problem surfaces: keep `apply` in `onAppear` — but init is the chosen design because it removes the only residual timing window.)

5. **`MissingSomethingButton`** (shared picker-footer component) is unchanged — it already hands its `FeedbackPrefill` to the caller's closure; only the caller's storage/presentation changes.

## 5. Affected sites

Eight button actions across six screens, all in `3dprintassistant-ios/3DPrintAssistant/Views/`. Line numbers are from this session's grounding; the plan re-confirms them and re-greps for any presenter not listed here.

| # | Screen / trigger | File:line | Category | Change |
|---|---|---|---|---|
| 1 | Printer picker footer "Printer missing?" | `Configurator/PrinterPickerView.swift:67-76` | `.missingPrinter` (+ brand note) | presentation migration |
| 2 | Brand picker footer "Brand missing?" | `Configurator/BrandPickerView.swift:71-77` | `.missingPrinter` (+ "whole brand" note) | presentation migration |
| 3 | Material picker footer "Filament missing?" | `Configurator/MaterialPickerView.swift:92-95` | `.missingFilament` | presentation migration |
| 4 | Nozzle picker footer "Nozzle missing?" | `Configurator/NozzlePickerView.swift:84-87` | `.missingNozzle` | presentation migration |
| 5 | Home engine-load-error "Report Issue" | `Home/HomeView.swift:71-77` | `.bugReport` (+ engine-error note) | presentation migration (value already correct) |
| 6 | Home footer "Send feedback" | `Home/HomeView.swift:140-142` | currently **nil** | **nil → `.generalFeedback`** + migration |
| 7 | Output export-failed alert "Report Issue" | `Output/OutputView.swift:144-150` | `.bugReport` (+ export-error note) | presentation migration (value already correct) |
| 8 | Output toolbar feedback button | `Output/OutputView.swift:368-370` | currently **nil** | **nil → `.generalFeedback`** + migration |

`.sheet(isPresented: $showFeedback)` sites to migrate (one per view): PrinterPicker:88, BrandPicker:89, MaterialPicker:107, NozzlePicker:101, OutputView:155, HomeView:162.

**Complete nil-prefill inventory: exactly two** — `HomeView.swift:141` and `OutputView.swift:369`. Both become `.generalFeedback`. The plan must verify no `feedbackPrefill = nil` survives.

Model file: `Views/Feedback/FeedbackViewModel.swift` (the `FeedbackPrefill` struct gains `Identifiable`; the VM gains the `init(prefill:)`).

## 6. Testing strategy

The defect is view-layer presentation timing, which XCTest cannot exercise directly without a tool the project doesn't use (e.g. ViewInspector). Worse, **no iOS test — unit or UI — runs on the current Mac**: only CommandLineTools is installed (no full Xcode/simulator), so `xcodebuild test` cannot run at all here. The data-only XCTest waiver used for value-only data adds is **void** for S1 (it changes Swift). All iOS test execution therefore happens on a full-Xcode Mac or in the TestFlight CI workflow (`macos-26` runner, full Xcode; the UITest target is wired into the scheme). The strategy is layered and honest about what each layer proves and where it runs:

- **Unit (XCTest — runnable only in CI / full-Xcode Mac):**
  - Keep the existing `apply(prefill:)` tests.
  - Add a test for the **new `FeedbackViewModel(prefill:)` init**: a printer prefill yields `category == .missingPrinter` and seeds `brand`; nil yields `.generalFeedback`. This has a genuine RED (the init doesn't compile until added) and locks the init-based-apply behaviour.
  - Add a `FeedbackPrefill: Identifiable` test: two instances with the same category have **different** `id`s. **Honesty:** this is a *design-pin* (it would pass on the buggy code too) — it does **not** catch the original view-layer bug. It only guards the re-present-same-category decision.
- **UITest (XCUITest — regression-grade, CI/full-Xcode only):** add one test in `3DPrintAssistantUITests` that navigates to a picker, taps the "missing X?" footer, and asserts the **category-specific fields** rendered — e.g. the `Brand` and `Model` `TextField`s appear for `.missingPrinter`, which is what `categoryFields` switches to. We assert on these **queryable `TextField`s**, *not* on the `Picker(.menu)`'s selected value, because a `.menu` picker with an `EmptyView()` label does not reliably expose its selection as XCUITest-readable text. (Optional hardening if field-based assertion proves flaky: add an `.accessibilityIdentifier`/`.accessibilityValue` to the category control exposing the selected category.) This is the test that genuinely fails RED on the current code and passes after the fix; the plan must prove the chosen assertion is actually queryable before relying on it.
- **Manual on-device (the real acceptance gate):** on a TestFlight build, verify all eight entry points open the correct category, the two bug CTAs carry their contextNote, and there is no first-frame field-layout flash.

TDD note: this is a real defect with a natural failing test (the UITest), so standard TDD applies — the cross-platform-mirror degenerate-RED breadcrumb rule does not. The unique-id unit test's degenerate RED is acceptable precisely because it is a design-pin, not a mirror test.

## 7. Cross-platform impact (mandatory evaluation)

- **Engine / data / overlay:** none touched. This is a Swift view-layer fix only; the mandatory data/logic-change evaluation is N/A for engine/data and recorded here per the standing rule.
- **Web:** **unaffected, verified.** Web feedback entry points carry the category in a `data-feedback-category` attribute; `app.js:806-809` reads it synchronously and calls `window.FeedbackForm.open(category)`, and `feedback-form.js:289-291` assigns `currentCategory` **synchronously** before `renderAll()` — no deferred-state capture, so the SwiftUI failure mode cannot occur. Web also has **no** per-picker "missing X" entry points (only bug/feature/general cards at `index.html:161-171`), so whether web should gain dedicated missing-printer routing is an **S2** question, not S1.
- **iOS push gate:** S1 changes Swift, so the data-only XCTest waiver is void; the standard gate (build green + full XCTest green + bumped `MARKETING_VERSION` + owner TestFlight dispatch) applies before it reaches users, and per §6 that gate is satisfied in CI/full-Xcode, not locally.

## 8. Risks / open questions

1. **No local iOS test execution.** Full Xcode is absent on the current Mac (`xcode-select -p` → CommandLineTools; no `/Applications/Xcode.app`), so neither unit nor UI tests run here. Decision for the owner at execution time: run build+tests on a full-Xcode Mac, or rely on the TestFlight CI run plus manual on-device verification. Does not block writing the spec/plan; it gates execution-verification and shapes the plan's gate definitions.
2. **Alert → sheet transition (site #7).** OutputView's "Report Issue" lives inside an `.alert` action that dismisses the alert and then presents the sheet. Alert-dismiss-then-sheet-present in the same view can have its own SwiftUI timing quirks; `.sheet(item:)` should be more robust than the bool, but the plan must verify this transition on-device.
3. **Completeness re-grep.** Grounding found eight sites/six `.sheet`s. The plan must re-grep the whole app for any `FeedbackView(` presenter or `.sheet(isPresented:` feedback presenter not in §5 so none is left on the buggy pattern.
4. **`MARKETING_VERSION` bump.** S1 is user-facing and needs a version bump in the eventual ship sequence — out of scope for the spec, noted for the plan.

## 9. Relationship to the rest of the pipeline

S1 repairs the iOS funnel so a deliberately-tapped "Printer missing?" reliably files `missingPrinter`. It **reduces** but does not **eliminate** misrouted requests — users can still pick the wrong category or type a printer into General feedback. Capturing that residual is **S2** (intake capture completeness). S1 and S2 are independent and ship on different paths (S1 = iOS binary/TestFlight; S2 = web, immediate).

## 10. Success criteria

- All eight iOS contextual entry points open the feedback sheet on the **correct** category (four "missing X" → their specific category; two bug CTAs → bug report **with their contextNote preserved**; two general buttons → general feedback).
- Re-tapping the same entry point re-presents correctly (id-per-instance).
- No first-frame field-layout flash (init-based apply).
- `trackFeedbackOpened` logs the correct category (analytics side-fix).
- Unit tests green: new `FeedbackViewModel(prefill:)` init test + `Identifiable` unique-id design-pin + existing feedback tests. A UITest exists that fails on the old pattern and passes on the new one (CI/full-Xcode).
- No engine/data/web/overlay change; web confirmed unaffected.
- **Commit decomposition: a single commit.** This is one logical finding/fix — `FeedbackPrefill: Identifiable` + the VM init + all six view migrations must land together, because intermediate splits would not compile (`.sheet(item:)` needs `Identifiable`; nil sites need the value change). iOS stays local-only until the push gate clears.
```
