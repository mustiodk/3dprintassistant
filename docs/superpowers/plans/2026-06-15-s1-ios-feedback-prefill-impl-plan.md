# S1 — iOS contextual-feedback prefill fix: implementation plan

**Date:** 2026-06-15
**Status:** Draft — pending sub-agent review → patch → QA gate
**Spec:** [`../specs/2026-06-15-ios-feedback-prefill-fix-design.md`](../specs/2026-06-15-ios-feedback-prefill-fix-design.md) (QA-green)
**Topic:** S1 of the feedback-pipeline evolution (S1→S5)
**Scope:** iOS app only (`3dprintassistant-ios`). No engine, data, web, or overlay change.
**Ship path:** iOS binary — push-gated to TestFlight (does not reach users until a TestFlight build is dispatched).
**Commit decomposition:** **single commit** (intermediate splits won't compile — see §3).

> **EXECUTION IS DEFERRED.** This plan is a creation artifact. No code is written, no file in `3dprintassistant-ios` is touched, until an explicit owner command to execute S1. The gates below describe *how* execution will proceed when authorized; running them is a separate, owner-gated act.

---

## 0. Preconditions & grounded context

- **Grounded against** the `3dprintassistant-ios` tree as read on 2026-06-15 (cold-start grounding pass). MARKETING_VERSION currently `1.0.4`; CURRENT_PROJECT_VERSION `1` (`project.yml`). The line numbers in §2 are from that read and **must be re-confirmed at execution time** (Gate 0) — they drift.
- **Inventory is confirmed complete** (grounding re-grep): **8 button actions / 6 screens / 6 `.sheet(isPresented:)` presentations / exactly 2 `feedbackPrefill = nil` sites.** No feedback presenter exists outside the spec §5 table. (Re-grep is repeated as Gate 0 anyway — the spec mandates it.)
- **No-local-iOS-test reality (load-bearing).** The current Mac has **CommandLineTools only** (`xcode-select -p` → `/Library/Developer/CommandLineTools`; no `/Applications/Xcode*.app`). Therefore:
  - `xcodebuild test` / the simulator **cannot run here at all** — neither unit nor UI tests.
  - The **data-only XCTest waiver is VOID** for S1 (it changes Swift, not value-only data).
  - All test *execution* happens on a **full-Xcode Mac** or in the **TestFlight CI workflow** (`macos-26` runner, full Xcode; the UITest target is wired into the scheme). Gate verification is structured accordingly (§2, §4).
- **Single-commit rule.** `.sheet(item:)` requires `FeedbackPrefill: Identifiable`; the two nil sites require the value change; the 6 views require the new presentation. Any intermediate split leaves the tree **non-compiling**, so the whole change lands as one commit (§3). The "gates" below are *implementation milestones with their own review/patch/QA*, **not** separate commits.
- **iOS push gate stays active.** The commit is local-only until the version is TestFlight-ready (all S1 landed, XCTest green on a real runner, walkthrough N/A for iOS-only view change, MARKETING_VERSION bumped, owner ready to dispatch). See §5.

---

## 1. Approach (from spec §4 — do not re-litigate)

Migrate every contextual entry point from `.sheet(isPresented:)` + a separate `@State` optional to **`.sheet(item:)`**, which binds presentation to the exact item value that triggered it — removing the stale-capture bug class. Specifically:

1. `FeedbackPrefill: Identifiable` with a **fresh `UUID` per instance** (not category-derived — a category-derived id would suppress re-presenting the same category twice).
2. Apply the prefill in the **view-model init**, not `FeedbackView.onAppear` (eliminates the first-frame General-layout flash).
3. Every `.sheet(item: $feedbackPrefill) { prefill in FeedbackView(prefill: prefill) }`; drop the now-redundant `showFeedback: Bool`.
4. The two general-feedback sites pass an **explicit** `FeedbackPrefill(category: .generalFeedback)` (a nil item won't present under `.sheet(item:)`).
5. Add **accessibility identifiers** to the category-specific fields so the UITest asserts queryably (the category `Picker` is `.menu` + `EmptyView()` label and is **not** reliably queryable — confirmed in grounding).

---

## 2. Gates

Each gate: **edit → per-gate review → patch → gate QA.** Because no test runs locally, **gate QA = (a) a sub-agent cold-read of that gate's diff for type/compile correctness + intent, and (b) a written compile-trace** (does every reference resolve? does every call site still type-check?). The *real* test QA is the single final Verification Gate (§4), which runs off-machine. This honesty is deliberate: per-gate QA catches structural/compile errors early; behavioral proof is deferred to CI/device because it physically cannot run here.

### Gate 0 — Re-ground (no edits)
- `xcode-select -p` + `ls -d /Applications/Xcode*.app` → confirm the test-execution route (still CI/full-Xcode, or has full Xcode appeared?).
- Re-grep the whole `3DPrintAssistant/` tree:
  - `\.sheet(isPresented:` presenting `FeedbackView` → expect 6.
  - `FeedbackView(` → expect 6.
  - `feedbackPrefill = nil` / `prefill = nil` → expect exactly 2.
- Re-confirm the §2 line numbers below; **update them in-place** if drifted. If the re-grep finds a 7th presenter or a 3rd nil site, **STOP and surface** — the spec's scope assumption is broken.
- **Gate QA:** counts match the spec (6/6/2) or the discrepancy is surfaced to the owner before proceeding.

### Gate A — Model layer (`FeedbackViewModel.swift`)
Two edits in `3DPrintAssistant/Views/Feedback/FeedbackViewModel.swift`:

1. **`FeedbackPrefill: Identifiable`** (currently struct at ~`126–134`):
   ```swift
   struct FeedbackPrefill: Identifiable {
       let id = UUID()                 // fresh per instance — drives .sheet(item:) re-present
       let category: FeedbackCategory
       let contextNote: String?

       init(category: FeedbackCategory, contextNote: String? = nil) {
           self.category = category
           self.contextNote = contextNote
       }                                // `id` keeps its default; existing call sites unchanged
   }
   ```
   The defaulted `id` does **not** break the existing `FeedbackPrefill(category:contextNote:)` initializer (grounding confirms all call sites use that initializer). `.sheet(item:)` needs only `Identifiable` (not `Equatable`/`Hashable`).

2. **`FeedbackViewModel.init(prefill:)`** that applies in init. `FeedbackViewModel` is an `@Observable @MainActor final class` (review-confirmed), and **all 14 stored props are inline-defaulted** — `category = .generalFeedback`, `message/title/steps/brand/model/materialName/materialType/nozzleDetails/slicerName/notes`, `email`, **plus the three lifecycle props `isSubmitting`/`submitError`/`didSubmit`** — so `self` is fully initialized and `apply(prefill:)` is legally callable as the first statement of `init`:
   ```swift
   init(prefill: FeedbackPrefill? = nil) {
       apply(prefill: prefill)         // existing apply(prefill:) is reused unchanged
   }
   ```
   `apply(prefill:)` itself is **unchanged** (its `guard let prefill else { return }` early-return is correct; nil → keeps the `.generalFeedback` default).

- **Per-gate review focus:** does `id = UUID()` default-init coexist with the custom `init`? (Yes in Swift — a `let` with a default + a memberwise-bypassing custom init is valid.) Does adding `init(prefill:)` collide with the implicit memberwise init? (No — `FeedbackViewModel` is a class/observable with stored-property defaults; adding an init is additive.)
- **Gate QA:** `FeedbackPrefill` conforms to `Identifiable`; the VM compiles with the new init; no existing `FeedbackPrefill(...)` call site needs editing.

### Gate B — `FeedbackView` applies via init (`FeedbackView.swift`)
In `3DPrintAssistant/Views/Feedback/FeedbackView.swift`:
- Today: `@State private var vm = FeedbackViewModel()` (~`12`); `let prefill: FeedbackPrefill?` (~`8`) with `init(prefill:)` (~`21–23`) storing it; `onAppear` (~`50–60`) calls `vm.apply(prefill: prefill)`.
- Change to seed the VM from the prefill in init, and drop the stored `prefill` + the `apply` call:
  ```swift
  @State private var vm: FeedbackViewModel

  init(prefill: FeedbackPrefill?) {
      _vm = State(initialValue: FeedbackViewModel(prefill: prefill))
  }
  ```
- **`onAppear` keeps** its analytics + review-prompt registration, now reading the correct `vm.category`:
  ```swift
  .onAppear {
      reviewPromptService.registerFeedbackOpened()
      Task { await AnalyticsService.shared.trackFeedbackOpened(category: vm.category) }
  }
  ```
  Only the `vm.apply(prefill:)` line is removed from `onAppear`; the `prefill` stored property is removed.
- **Per-gate review focus:** `_vm = State(initialValue:)` is the correct wrapper for an `@Observable` class held by `@State` (review-confirmed — **not** `@StateObject`/`StateObject(wrappedValue:)`). The view's other wrappers — `@Environment(\.dismiss)`, `@Environment(ReviewPromptService.self)`, `@FocusState focusedField` — **self-initialize and need no explicit init** in the custom `init`; only `_vm` is set. The analytics call now reads the right category (the spec's free analytics fix — confirm it's preserved, not dropped). No other view reads `FeedbackView.prefill` directly (grounding: only `onAppear` used it).
- **Gate QA:** `FeedbackView` compiles; `onAppear` still registers analytics/review-prompt; the first-frame window is gone (VM has the right category before first layout).

### Gate C — The 6 presentation migrations
For each of the 6 views, three coupled edits: drop `@State showFeedback`, change the button action to set the prefill value directly, and switch the `.sheet` to `item:`. **Line numbers from grounding — re-confirm in Gate 0.**

| View | `@State` to remove / keep | Button action(s) → | `.sheet` migration |
|---|---|---|---|
| `Views/Configurator/PrinterPickerView.swift` | remove `showFeedback` (~11); keep `feedbackPrefill` (~12) | closure (~73–76): `feedbackPrefill = prefill` (drop `showFeedback = true`) | (~88–90) → `.sheet(item: $feedbackPrefill) { prefill in FeedbackView(prefill: prefill) }` |
| `Views/Configurator/BrandPickerView.swift` | remove `showFeedback` (~12); keep `feedbackPrefill` (~13) | closure (~75–78) | (~89–91) → `.sheet(item:)` |
| `Views/Configurator/MaterialPickerView.swift` | remove `showFeedback` (~10); keep `feedbackPrefill` (~11) | closure (~93–96) | (~107–109) → `.sheet(item:)` |
| `Views/Configurator/NozzlePickerView.swift` | remove `showFeedback` (~11); keep `feedbackPrefill` (~12) | closure (~85–88) | (~101–103) → `.sheet(item:)` |
| `Views/Home/HomeView.swift` | remove `showFeedback` (~10); keep `feedbackPrefill` (~9) | engine-error action (~71–76): drop `showFeedback = true`, keep the `.bugReport` prefill | (~162–164) → `.sheet(item:)` |
| `Views/Output/OutputView.swift` | remove `showFeedback` (~20); keep `feedbackPrefill` (~21) | export-alert action (~144–150): drop `showFeedback = true`, keep `.bugReport` prefill + `model.exportError = nil` | (~155–157) → `.sheet(item:)` |

- The shared `MissingSomethingButton` (picker footers) is **unchanged** — it already hands its `FeedbackPrefill` to the caller's `onTap` closure; only the caller's storage/presentation changes.
- **Per-gate review focus:** every `showFeedback` reference is removed (no dangling reads); every `.sheet` closure now takes the unwrapped `prefill`; the `OutputView` export-alert path still clears `model.exportError` (don't regress that side effect). Site #7 (export alert → sheet) is the timing-sensitive one (spec §8.2) — note for device verification, no code difference here.
- **Gate QA:** all 6 views compile; zero `showFeedback` symbols remain in the 6 files (grep proof); each `.sheet(item:)` closure is well-typed.

### Gate D — The 2 nil → `.generalFeedback` sites
- `Views/Home/HomeView.swift` (~141): `feedbackPrefill = nil` → `feedbackPrefill = FeedbackPrefill(category: .generalFeedback)`.
- `Views/Output/OutputView.swift` (~369): `feedbackPrefill = nil` → `feedbackPrefill = FeedbackPrefill(category: .generalFeedback)`.
- **Per-gate review focus:** after this gate, **zero** `feedbackPrefill = nil` / `prefill = nil` remain anywhere (grep proof) — under `.sheet(item:)` a nil item never presents, so a missed nil site = a dead feedback button.
- **Gate QA:** `grep -rn 'feedbackPrefill = nil\|prefill = nil' 3DPrintAssistant/` returns nothing. **Note:** OutputView's *declaration* `@State private var feedbackPrefill: FeedbackPrefill? = nil` (~21) **keeps its `= nil`** — that is the correct `.sheet(item:)` starting state (nil item = not presented); the type annotation means this grep matches only the two *assignment* sites, not the declaration. Do **not** strip the declaration default.

### Gate E — Tests + accessibility identifiers
1. **Accessibility identifiers** in `FeedbackView.swift`. The category-specific fields render through the **shared** `singleLineField`/`multilineField` helpers (~176/196), so the id **must be passed per call site as a parameter** (e.g. `singleLineField(label:…, text:$vm.brand, field:.brand, accessibilityId: "feedback.field.brand")`) — **not** hardcoded inside the helper, or every category's field would collide on one id. Assign: `.brand`→`feedback.field.brand`, `.model`→`feedback.field.model`, `.materialName`→`feedback.field.materialName`, `.nozzleDetails`→`feedback.field.nozzleDetails`, `.message`→`feedback.field.message`. **Note:** `$vm.message` is the bound field for generalFeedback, featureRequest, *and* bugReport, so `feedback.field.message` is intentionally shared across those three — fine for the UITest, which only checks `message` **absence** under `.missingPrinter`. (The category `Picker` is `.menu` + `EmptyView()` label → its selected value is **not** XCUITest-readable; the fields are. Grounding confirmed no ids exist today.) Promoted from the spec §6 "optional hardening" to **required** here because label-text parsing of styled uppercase `Text` is brittle.
2. **Unit tests** (`3DPrintAssistantTests/FeedbackTests.swift`) — keep the existing `testPrefillSeedsCategoryAndContextNote` + `testPrefillDoesNotOverwriteExistingField`; add:
   - `testViewModelInitAppliesPrefill` — `FeedbackViewModel(prefill: FeedbackPrefill(category: .missingPrinter, contextNote: "Bambu"))` → `category == .missingPrinter` and `brand == "Bambu"`; `FeedbackViewModel(prefill: nil)` → `category == .generalFeedback`. **Genuine RED** (the init doesn't compile until Gate A) — this is the test that locks the init-based-apply behavior.
   - `testFeedbackPrefillIdentifiableUniqueId` — two `FeedbackPrefill(category: .missingPrinter)` instances have **different** `id`s. **Honesty:** this is a *design-pin* — it would pass on the buggy code too; it does **not** catch the original view-layer bug. It only guards the re-present-same-category decision. (Spec §6 TDD note: degenerate RED is acceptable for a design-pin, and the cross-platform-mirror breadcrumb rule does **not** apply — S1 is a real defect with a natural failing test, the UITest.)
3. **UITest** — **default to adding a `test…()` method to the existing `3DPrintAssistantUITests/ScreenCaptureUITests.swift`** (it is already in the project and inside the xcodegen source-glob dir, so **no `xcodegen` run and no `.pbxproj` churn** — the `.xcodeproj` is git-tracked and merge-noisy; don't regenerate it just for a test). Create a new file only if isolation is genuinely wanted (then see §3 staging). The test:
   - **Nav recipe (reuse the `ScreenCaptureUITests` predicate-tap pattern):** launch → Home "Configure Print" → BrandPicker → tap "Bambu" → PrinterPicker → `swipeUp` to bring the "Printer missing?" footer (below the scrollable `LazyVStack`, `PrinterPickerView.swift:67`) on-screen → tap it.
   - **Assertion:** the `.missingPrinter` fields exist — `app.textFields["feedback.field.brand"].waitForExistence(timeout: 2)` and `feedback.field.model` — **and the general field is absent**: `XCTAssertFalse(app.textViews["feedback.field.message"].waitForExistence(timeout: 1))` — a **bounded `waitForExistence`**, never a bare `.exists`, so the absence check doesn't race the sheet animation into a flaky false-RED.
   - This **fails RED on the old `.sheet(isPresented:)` code** (sheet opens on General → `message` present, `brand`/`model` absent) and **passes after the fix**.
- **Per-gate review focus:** the unit init-test has a real RED; the design-pin's degenerate RED is labeled as such; the UITest asserts on **queryable** identifiers, not the `.menu` Picker value; the accessibility ids are stable strings (not localized).
- **Gate QA:** test files compile *as source* (type-check by review — cannot run here); the UITest's queried identifiers exist in `FeedbackView` after edit 1 of this gate.

---

## 3. Atomic-commit assembly

- After Gates A–E pass their gate-QA, **run a final full-diff sub-agent review** (cold read of the entire change as one unit) → patch → then stage and commit **once**.
- **Staging discipline:** stage every touched file — the 8 source files (`FeedbackViewModel.swift`, `FeedbackView.swift`, the 4 picker views, `HomeView.swift`, `OutputView.swift`) and the 2 test files (`FeedbackTests.swift`, and `ScreenCaptureUITests.swift` if the UITest extends it — the default). **If a new UITest file was created instead,** run `xcodegen generate` and stage **every** file `git status` shows changed under `3DPrintAssistant.xcodeproj/` (xcodegen regenerates PBX UUIDs wholesale — `project.pbxproj`, and possibly the scheme / `Package.resolved`, all git-tracked), not just `project.pbxproj`. (Project-level rule: stage ALL modified files, incl. project files, when files are added.)
- **Commit message** (single logical fix): `fix(ios): deliver contextual feedback category via .sheet(item:) (S1)` with a body summarizing the `.sheet(isPresented:)` stale-capture root cause, the 8 sites, the init-based apply, and the test additions. **No `MARKETING_VERSION` bump in this commit** — the bump belongs to the ship sequence (§5), kept separate so the fix commit is reviewable on its own.
- **Local-only.** Do not push (iOS push gate, §5).

---

## 4. Verification gate (the real QA — runs off this machine)

This is where behavioral proof happens; it **cannot** run on the current Mac. Route at execution time:

- **Build + unit + UITests:** on a **full-Xcode Mac** (`xcodebuild test -scheme 3DPrintAssistant`) **or** via a **TestFlight CI build** (the workflow runs the test targets on `macos-26`). Required green:
  - new `testViewModelInitAppliesPrefill` (genuine RED→GREEN),
  - `testFeedbackPrefillIdentifiableUniqueId` (design-pin),
  - existing `FeedbackTests` unchanged-green,
  - the new UITest (RED on the pre-fix pattern, GREEN after).
- **Manual on-device acceptance (the real gate, spec §6 + §10):** on a TestFlight build, verify:
  1. All **8 entry points** open the sheet on the **correct** category (4 "missing X" → their specific category; 2 bug CTAs → bug report; 2 general buttons → general feedback).
  2. The **2 bug CTAs carry their `contextNote`** (engine-load error string; export-failed error string) into the message field.
  3. **No first-frame field-layout flash** (init-based apply).
  4. **Re-tapping the same entry point re-presents** correctly (fresh-UUID id).
  5. **Site #7 (Output export-alert → sheet)** transitions cleanly (alert dismiss → sheet present; spec §8.2 flagged this as the timing-sensitive transition).
  6. `trackFeedbackOpened` logs the correct category (analytics side-fix — verify via `/analytics` feedback-category breakdown post-release, or a debug log).
- **STOP conditions:** any unit/UITest red that isn't a known-flaky environment issue → fix before ship; any on-device category mismatch → fix before ship.

---

## 5. Ship sequence (when execution + acceptance are done)

1. Bump `MARKETING_VERSION` (1.0.4 → 1.0.5) by editing **`project.yml:12`** (`settings.base` — the source of truth) then `xcodegen generate` + stage the regenerated project files — **separate commit** from the fix; S1 is user-facing and needs a version bump (spec §8.4).
2. Confirm the iOS push gate is clear: all planned S1 changes landed, tests green on a real runner, MARKETING_VERSION bumped, owner ready to dispatch.
3. `git push` iOS `main` (only now — the gate releases here).
4. Owner dispatches TestFlight (`gh workflow run testflight.yml --ref main`).
5. After acceptance, the user-facing change rides whatever release the owner chooses (its own 1.0.5, or bundled — owner decision at ship time).

---

## 6. Cross-platform impact (mandatory evaluation)

- **Engine / data / overlay:** **none** touched — Swift view-layer only. The mandatory data/logic-change evaluation is N/A for engine/data and recorded here per the standing rule.
- **Web:** **unaffected, re-verified in the spec (§7).** Web reads `data-feedback-category` synchronously (`app.js:806-809` → `feedback-form.js:289-291` assigns `currentCategory` before `renderAll()`), so the SwiftUI deferred-capture failure mode cannot occur; web has no per-picker "missing X" entry points (that's an S2 question). **No web work in S1.**
- **iOS push gate:** S1 changes Swift → data-only XCTest waiver void → the standard gate applies (build + full XCTest green on a real runner + MARKETING_VERSION bump + owner dispatch) before users see it.

---

## 7. Risks & fallbacks

| # | Risk (spec §8) | Plan mitigation |
|---|---|---|
| 1 | No local iOS test execution | Gate verification routes to CI/full-Xcode + manual on-device; gate-QA here is review + compile-trace only, stated honestly (§2, §4). |
| 2 | Alert→sheet transition (site #7) | `.sheet(item:)` is more robust than the bool, but §4 step 5 makes the on-device check of this transition explicit. Fallback if it misbehaves: present the sheet from a parent container rather than inside the alert-bearing view. |
| 3 | Completeness (missed presenter) | Gate 0 re-greps the whole tree; a 7th presenter or 3rd nil site STOPs the run. |
| 4 | `MARKETING_VERSION` bump | Handled as a separate ship-sequence commit (§5.1), not in the fix commit. |
| 5 | UITest assertion not queryable | Gate E adds accessibility identifiers to the category fields up front (the `.menu` Picker value is not queryable) — the UITest asserts on those, not the Picker. |
| 6 | Init-based apply regresses something | Fallback (spec §4.4): keep `apply` in `onAppear`. Init is chosen because it removes the only residual first-frame window; the fallback is a one-line revert of Gate B. |

---

## 8. Done criteria (plan-level)

- [ ] Gate 0 re-ground: 6/6/2 counts confirmed (or discrepancy surfaced).
- [ ] Gates A–E implemented; each gate's QA passed (review + compile-trace).
- [ ] Final full-diff review → patched → single commit assembled with all touched files staged.
- [ ] Verification gate routed and **green** off-machine (unit + UITest), manual on-device acceptance passed for all 8 entry points incl. contextNote preservation, no flash, re-present, site-#7 transition.
- [ ] No engine/data/web/overlay change; web confirmed unaffected.
- [ ] Commit local-only; ship sequence (§5) is a separate, owner-gated step.

---

## 9. What this plan deliberately does NOT do

- It does **not** execute. No `3dprintassistant-ios` file is touched until owner go.
- It does **not** bump `MARKETING_VERSION` in the fix commit.
- It does **not** push iOS `main`.
- It does **not** change feedback categories, fields, the Discord payload, the web tee, or the Scout — those are S2/S3.
