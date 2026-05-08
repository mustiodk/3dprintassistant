# Codex code review — 3dpa-iOS App Store review prompt v1 (post-implementation)

> **How this file works.** Claude (Opus 4.7, 1M context) writes everything above the `# Codex Response` marker — Context + Scope + What changed + Review focus + Out-of-scope + Format expectations + final challenge. Codex appends findings into the `# Codex Response` section at the bottom (Must-Fix / Should-Fix / Optional / Genuinely good enough + Recommendation + Confidence). Claude then appends `# Resolution` with per-finding accept / modify / decline. The file is the single artifact for this review.
>
> **Read-only constraint (MANDATORY).** Codex MUST NOT modify any project source files. Codex's only allowed write surface is the `# Codex Response` section of THIS file. No edits to iOS source (`*.swift`), `project.yml`, `project.pbxproj`, `Config.xcconfig`, locales, tests, the design packet, the research file, ROADMAP, or any other artifact. Findings that imply a code change are described in prose / Swift snippets inside the response; Claude applies the change after the owner approves dispositions in the `# Resolution` section.
>
> **Project context (read first).** [`docs/3dpa-context.md`](../../docs/3dpa-context.md) — what 3dpa is, the engine architecture, the data model, the standing rules, the AI Operating Model under which this review runs.
>
> **Design review (already adjudicated).** [`codex/ios-review-prompt/codex-2026-05-08-ios-review-prompt-packet.md`](codex-2026-05-08-ios-review-prompt-packet.md) — the M3 design packet with your prior verdict (Must-Fix MF1–MF4, Should-Fix SF1–SF4, Optional O1–O3) and Claude's Resolution applying all 4 Must-Fix + 4 Should-Fix + 3 Optional findings. **This review does NOT re-litigate design decisions** — see "Out of scope" below.

## What this review is

A **post-implementation code review** of the v1.0.3 batch item 3 (iOS App Store review prompt) implementation that landed on `3dprintassistant-ios` `main` (local-only commit `756b107`) and the supporting design + ROADMAP commits on `3dprintassistant` `ai/operating-model-pilot` (commit `381dac1`).

**Goal:** verify the code (a) faithfully implements the Resolution from the M3 design packet, (b) is correct on the load-bearing concurrency / persistence / async-boundary contracts, and (c) doesn't introduce code-quality issues the design review couldn't have seen. Sign off so the owner can `git push` iOS `main` and dispatch the TestFlight build.

## Files to read (MANDATORY, in full)

Read these files end-to-end before writing findings. Snippets inline in this packet are excerpts for orientation, not substitutes for full reads. Paths are relative to the **repo root** for each repo (the iOS files live in `3dprintassistant-ios/`, the web files in `3dprintassistant/`).

### Primary — the new code (iOS repo)

1. [`3dprintassistant-ios/3DPrintAssistant/Models/ProfileKeyHasher.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Models/ProfileKeyHasher.swift) — full file (~50 lines).
2. [`3dprintassistant-ios/3DPrintAssistant/Services/ReviewPromptService.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Services/ReviewPromptService.swift) — full file (~225 lines). Includes `ReviewPromptService`, `ReviewPromptStorage` protocol, `Clock` / `AppVersionProvider` protocols, `UserDefaultsReviewPromptStorage`. **The load-bearing file.**
3. [`3dprintassistant-ios/3DPrintAssistant/Services/StoreKitDistributionDetector.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Services/StoreKitDistributionDetector.swift) — full file (~55 lines). The MF1 fix; AppTransaction unwrap.
4. [`3dprintassistant-ios/3DPrintAssistantTests/ReviewPromptServiceTests.swift`](../../../3dprintassistant-ios/3DPrintAssistantTests/ReviewPromptServiceTests.swift) — full file (~205 lines). 10 unit tests with DI fakes.
5. [`3dprintassistant-ios/3DPrintAssistantTests/OutputViewIntegrationTests.swift`](../../../3dprintassistant-ios/3DPrintAssistantTests/OutputViewIntegrationTests.swift) — full file (~140 lines). 4 integration tests.

### Primary — the modified code (iOS repo)

Read in full to see the changes in context, not just the diff:

6. [`3dprintassistant-ios/3DPrintAssistant/App/ContentView.swift`](../../../3dprintassistant-ios/3DPrintAssistant/App/ContentView.swift) — full file. Service init in `init()`; environment injection.
7. [`3dprintassistant-ios/3DPrintAssistant/Views/Output/OutputView.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Views/Output/OutputView.swift) — full file (~340 lines). New imports; new `@Environment` injections; `maybePromptForReview()` method; `.task` flow modification.
8. [`3dprintassistant-ios/3DPrintAssistant/Views/Output/OutputViewModel.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Views/Output/OutputViewModel.swift) — full file (~110 lines). New `checklist` field; new engine call in `loadProfile`.
9. [`3dprintassistant-ios/3DPrintAssistant/Views/Feedback/FeedbackView.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Views/Feedback/FeedbackView.swift) — full file. New `@Environment` injection; `registerFeedbackOpened()` call in `.onAppear`.

### Reference — pre-existing (read selectively, only if needed for verification)

10. [`3dprintassistant-ios/3DPrintAssistant/Models/AppState.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Models/AppState.swift) — for F5 (verify the 19-field list against `toJSDictionary()` lines 49–73).
11. [`3dprintassistant-ios/3DPrintAssistant/Engine/EngineService.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Engine/EngineService.swift) — for F6 (verify `getChecklist` signature) and the `PrintWarning` / `ChecklistItem` struct shapes (lines 25–37).
12. [`3dprintassistant-ios/3DPrintAssistant/Utils/AppConstants.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Utils/AppConstants.swift) — for `appVersion` reading shape used by `BundleAppVersionProvider`.

### Reference — design context (web repo)

13. [`3dprintassistant/codex/ios-review-prompt/codex-2026-05-08-ios-review-prompt-packet.md`](codex-2026-05-08-ios-review-prompt-packet.md) — the M3 design packet. Read your prior verdict (Must-Fix MF1–MF4, Should-Fix SF1–SF4) and especially Claude's Resolution section (line ~580 onward) so you know what the implementation was supposed to deliver.
14. [`3dprintassistant/docs/research/gemini-ios-review-prompt-best-practices.md`](../../docs/research/gemini-ios-review-prompt-best-practices.md) — research artifact. Skim only if a Resolution dispute requires going back to source-of-truth Apple-doc citations.

### Skip (auto-generated or not relevant)

- `3dprintassistant-ios/3DPrintAssistant.xcodeproj/project.pbxproj` — xcodegen output; not human-reviewed.
- `3dprintassistant/docs/planning/ROADMAP.md` — admin/tracking change, no code implications.

## What changed

### iOS commit `756b107` (`main`, local-only)

10 files, 790 insertions, 2 deletions.

**New files:**
- [`3DPrintAssistant/Models/ProfileKeyHasher.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Models/ProfileKeyHasher.swift) — 19-field stable hash of engine-relevant `AppState` for distinct-profile counting.
- [`3DPrintAssistant/Services/ReviewPromptService.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Services/ReviewPromptService.swift) — `@Observable` service + DI protocols + `UserDefaultsReviewPromptStorage`.
- [`3DPrintAssistant/Services/StoreKitDistributionDetector.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Services/StoreKitDistributionDetector.swift) — async cached AppTransaction-based detector with `VerificationResult` unwrap.
- [`3DPrintAssistantTests/ReviewPromptServiceTests.swift`](../../../3dprintassistant-ios/3DPrintAssistantTests/ReviewPromptServiceTests.swift) — 10 service unit tests with full DI fakes.
- [`3DPrintAssistantTests/OutputViewIntegrationTests.swift`](../../../3dprintassistant-ios/3DPrintAssistantTests/OutputViewIntegrationTests.swift) — 4 integration tests covering hash determinism + checklist gate state.

**Modified files:**
- [`3DPrintAssistant/App/ContentView.swift`](../../../3dprintassistant-ios/3DPrintAssistant/App/ContentView.swift) — adds `@State private var reviewPromptService` initialised in `init()` with `registerLaunchIfNeeded()` called once; injected via `.environment()` alongside `appState` and `router`.
- [`3DPrintAssistant/Views/Output/OutputView.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Views/Output/OutputView.swift) — adds `@Environment(ReviewPromptService.self)` + `@Environment(\.requestReview)` + `import StoreKit`; wires `await maybePromptForReview()` after `await model.loadProfile(appState)` inside the existing structured `.task` modifier on body. New private `maybePromptForReview()` runs the full eligibility + delay + re-check flow inline (no detached `Task`).
- [`3DPrintAssistant/Views/Output/OutputViewModel.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Views/Output/OutputViewModel.swift) — adds `var checklist: [ChecklistItem] = []`; `loadProfile` now calls `EngineService.shared.getChecklist(appState)` alongside `getWarnings`. Used by `OutputView.maybePromptForReview()` for the critical-warning gate.
- [`3DPrintAssistant/Views/Feedback/FeedbackView.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Views/Feedback/FeedbackView.swift) — adds `@Environment(ReviewPromptService.self)` and calls `reviewPromptService.registerFeedbackOpened()` inside the existing `.onAppear` so all entry points (Home, Output, error sheet) participate in the 14-day cooldown automatically.
- [`3DPrintAssistant.xcodeproj/project.pbxproj`](../../../3dprintassistant-ios/3DPrintAssistant.xcodeproj/project.pbxproj) — xcodegen-regenerated. `project.yml` itself unchanged (sources auto-discovered from path globs).

### Web commit `381dac1` (`ai/operating-model-pilot`)

3 files, 1499 insertions, 3 deletions.

- [`docs/research/gemini-ios-review-prompt-best-practices.md`](../../docs/research/gemini-ios-review-prompt-best-practices.md) — the M0–M2 research artifact with all 4 prior Codex peer-review passes and the executed Resolution. Frozen per the operating model after M3 packet drafted.
- [`codex/ios-review-prompt/codex-2026-05-08-ios-review-prompt-packet.md`](codex-2026-05-08-ios-review-prompt-packet.md) — the M3 design packet itself, with your prior full-design-review verdict + Claude's Resolution.
- [`docs/planning/ROADMAP.md`](../../docs/planning/ROADMAP.md) — new "v1.0.3 batch" section after IR tracking; item 3 marked SHIPPED with full provenance + acceptance criteria; "Last updated" header rewritten.

### Test results

- Build (`xcodebuild ... build`): **clean** (one fix needed during implementation: `import StoreKit` in OutputView.swift).
- Test (`xcodebuild test ... -only-testing:3DPrintAssistantTests`): **60/60 passed** (was 46; +14 new). Walkthrough harness baseline unchanged (no `engine.js` or data changes).

### iOS push gate active

Per the project rule, the iOS commit is **local-only on `main`** until ready for TestFlight. `MARKETING_VERSION` still `1.0.2` — the bump to `1.0.3` + xcodegen + `gh workflow run testflight.yml --ref main` happens at ship time, not now. Your sign-off here unblocks the push.

## Review focus

Concentrate on these areas. Each is a place the M3 design review couldn't have caught the issue because it lives in actual Swift / Xcode contracts, not design decisions.

### F1 — `AppTransaction.shared` unwrap correctness (load-bearing)

[`StoreKitDistributionDetector.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Services/StoreKitDistributionDetector.swift) — the MF1 fix. The original M3 packet draft was wrong about the API shape; the fix unwraps `VerificationResult<AppTransaction>` via a switch:

```swift
let verification = try await AppTransaction.shared
switch verification {
case .verified(let txn):           return txn.environment
case .unverified(let txn, _):      return txn.environment
}
```

**Verify:**
- Is `AppTransaction.shared` actually `try`-throwing-async-returns-`VerificationResult<AppTransaction>` on iOS 17+? (The deployment target is iOS 17.0; `AppTransaction` is iOS 16+.)
- Is the `.unverified(let txn, _)` pattern accepting `txn.environment` correct, or does the unverified case wrap a different shape? Should we treat `.unverified` as conservatively suppressed (return nil from the closure) instead of trusting `txn.environment`?
- Is the catch-block default `cached = true` (suppress on error) correct, or is it too conservative (e.g. unsigned simulator builds with no transaction would never show the prompt during local debugging)?
- The `environment != .production` check — is `.production` the only environment we want to allow? (`AppStore.Environment` cases on iOS 17+: `.production`, `.sandbox`, `.xcode` — verify.)

### F2 — `OutputView.maybePromptForReview()` concurrency correctness

[`OutputView.swift:238–283`](../../../3dprintassistant-ios/3DPrintAssistant/Views/Output/OutputView.swift) — the MF3 fix. The flow runs INSIDE the `.task` on body so structured concurrency cancels the entire chain on view exit. Implementation:

```swift
private func maybePromptForReview() async {
    guard !model.invalidSelection,
          !model.checklist.contains(where: { $0.critical }) else { return }
    let keyHash = ProfileKeyHasher.hash(appState)
    let isNovel = reviewPromptService.registerSuccessfulProfileGeneration(keyHash: keyHash)
    guard isNovel else { return }
    guard await reviewPromptService.isEligibleForReviewPrompt() else { return }
    try? await Task.sleep(for: .seconds(ReviewPromptService.preRequestDelay))
    guard !Task.isCancelled else { return }
    guard await reviewPromptService.isEligibleForReviewPrompt() else { return }
    requestReview()
    reviewPromptService.markReviewRequested()
}
```

**Verify:**
- Is the `Task.isCancelled` check post-sleep sufficient, or does Swift Concurrency have a better idiom (e.g. `try Task.checkCancellation()`)? `Task.sleep(for:)` should throw `CancellationError` on cancel — does the `try?` swallow it correctly?
- Is `requestReview()` synchronous (it's a `RequestReviewAction.callAsFunction()`), and is the call ordering (request fires, then `markReviewRequested()`) atomic from the user's view? Could the user navigate away between those two lines (no — both run synchronously after the `await` completes)?
- The `registerSuccessfulProfileGeneration` call happens BEFORE the eligibility check — is that the right order? It means the engagement counter increments even when the user is in TestFlight or hasn't met other gates. Intentional (we want the counter to keep growing across builds), but confirm it doesn't violate any contract.
- Is registering the profile from inside the eligibility-skipped branch (e.g. invalidSelection-true case) handled? Currently the early-return at the top means `isNovel` is never called for invalid profiles — is that the intended semantic?

### F3 — `ReviewPromptService.isEligibleForReviewPrompt()` is async + side-effect-free

[`ReviewPromptService.swift:185–217`](../../../3dprintassistant-ios/3DPrintAssistant/Services/ReviewPromptService.swift) — the SF1 fix.

**Verify:**
- The function is now genuinely side-effect-free (no `firstLaunchDate = clock.now` mutation inside it).
- The async-ness is justified — it awaits `distribution.isStoreKitSandboxOrTestFlight()`. After cache warms, the await is essentially synchronous; before that it's a real async hop. Is that acceptable, or should the cache-warm happen at app start so `isEligible` is sync-fast?
- All 6 conditions are evaluated in correct order (cheapest first). The order is: TestFlight → distinct count → first-launch age → version gate → request cooldown → feedback cooldown. Is that optimal? Should the version gate go before TestFlight (cheapest is the storage read)?

### F4 — Persistence keys + storage shape

[`ReviewPromptService.swift:50–96`](../../../3dprintassistant-ios/3DPrintAssistant/Services/ReviewPromptService.swift):

```swift
private enum Keys {
    static let firstLaunchDate              = "rps.firstLaunchDate"
    static let lastVersionPromptedForReview = "rps.lastVersionPromptedForReview"
    static let lastPromptRequestDate        = "rps.lastPromptRequestDate"
    static let lastFeedbackOpenedDate       = "rps.lastFeedbackOpenedDate"
    static let distinctProfileKeyHashes     = "rps.distinctProfileKeyHashes"
}
```

**Verify:**
- The `rps.` prefix avoids collisions with any other UserDefaults keys in the app. Confirm by grepping for other `UserDefaults.standard.set(...)` call sites — anything that might collide?
- `distinctProfileKeyHashes` stored as `[String]` (UserDefaults can't store native `Set`). The array grows monotonically (no eviction). For an active user, what's the upper bound on size? Hobbyist scale = probably < 200 distinct keys; each key is ~250 bytes (19 fields concatenated). 200 × 250 = ~50 KB in UserDefaults. Defensible? Should there be a cap or LRU eviction?
- Date storage via `UserDefaults.set(Date?...)` — does setting nil correctly clear, or do we need `removeObject(forKey:)`? The `defaults.set(newValue, forKey:)` line has `newValue` as `Date?` — when nil, what happens?
- No migration logic for the keys. If we later rename or restructure, all engagement progress resets. Acceptable for v1.0.3?

### F5 — `ProfileKeyHasher` field list correctness

[`ProfileKeyHasher.swift`](../../../3dprintassistant-ios/3DPrintAssistant/Models/ProfileKeyHasher.swift) — the MF2 fix. 19 fields, normalised serialisation:

```swift
"useCase=\(state.useCase.sorted().joined(separator: ","))"
"special=\(state.special.sorted().joined(separator: ","))"
"seam=\(state.seam ?? "_nil")"
// ... etc for 6 advanced optionals using _nil sentinel
```

**Verify:**
- Field list matches `AppState.toJSDictionary()` (`AppState.swift:49–73`) — every field that gets sent to engine.js is in the hash, with the explicit exception of `brand` (UI-only, not in `toJSDictionary`).
- Sorted arrays for `useCase` and `special` produce stable hashes regardless of insertion order. Confirm the sort is correct.
- `_nil` sentinel choice — could a valid value ever equal `"_nil"`? Looking at AppState's `valid:` comments, no valid string starts with underscore. Defensible.
- Hash is plain string (no SHA, per Codex pass 5 O2). Delimiter is `|`. Could any field value contain `|` literally? Looking at AppState valid values, all are kebab-case identifiers — no `|` in any of them. Defensible at hobbyist scale; what about future field additions (e.g. user-supplied strings)?

### F6 — `OutputViewModel.checklist` field load contract

[`OutputViewModel.swift:14–17, 74–75`](../../../3dprintassistant-ios/3DPrintAssistant/Views/Output/OutputViewModel.swift) — added to support the MF4 critical-warning gate.

**Verify:**
- The new `getChecklist` call inside `loadProfile` is conditionally executed (after the `invalidSelection` early-return). Confirm: if `printer` or `material` is empty, `checklist` stays at `[]` from the early-return path. Correct semantic for the gate (no false positives on `model.checklist.contains { $0.critical }` when invalidSelection is already-true).
- The added engine call is the same one `ChecklistSheet.swift:147` was already making on demand. Double-fetching now (once in `loadProfile`, again on `ChecklistSheet.onAppear`) is fine for a user who opens the sheet — minor redundant cost. Should `ChecklistSheet` be refactored to read from `OutputViewModel.checklist` instead of re-fetching? Out of scope for this review unless it's load-bearing.

### F7 — `ContentView.init()` service initialisation

[`ContentView.swift:27–35`](../../../3dprintassistant-ios/3DPrintAssistant/App/ContentView.swift) — the SF1 fix. Service created in `init()`, `registerLaunchIfNeeded()` called once.

**Verify:**
- `init()` for a SwiftUI `View` may run multiple times across the app's lifetime (e.g. on environment changes). Each `init` would create a new `ReviewPromptService` instance and call `registerLaunchIfNeeded()` again. Idempotency in `registerLaunchIfNeeded` handles repeat calls (no double-set), but does each new service instance lose any in-memory state? The `UserDefaultsReviewPromptStorage` reads from `UserDefaults` on every getter — no in-memory cache — so multiple service instances are equivalent. Confirm.
- Alternative: `init` the service via `@State private var reviewPromptService = ReviewPromptService()` (declarative default) and call `registerLaunchIfNeeded()` from a `.task` modifier. Cleaner? The current pattern uses `_reviewPromptService = State(wrappedValue: service)` inside `init`. Both work; current choice avoids `.task` boilerplate.
- `StoreKitDistributionDetector` instantiation happens lazily inside `ReviewPromptService.init`'s default value — at app start. The first eligibility check then awaits it. Acceptable, or should we warm the cache eagerly at `App.init()` to avoid the first-eligibility-check delay?

### F8 — `FeedbackView.onAppear` registration

[`FeedbackView.swift:11, 49–55`](../../../3dprintassistant-ios/3DPrintAssistant/Views/Feedback/FeedbackView.swift) — adds `@Environment(ReviewPromptService.self)` and calls `registerFeedbackOpened()` in onAppear.

**Verify:**
- `onAppear` runs each time the sheet is presented. Multiple opens of FeedbackView in the same session correctly stamp `lastFeedbackOpenedDate` to the latest open. Intentional — most-recent open is the right cooldown anchor.
- The 14-day cooldown is one-sided: opening Feedback suppresses prompts for 14 days, but opening Feedback then immediately closing without sending feedback still counts as a negative signal. Is that too aggressive? (The M3 packet's SF3 verdict said this is acceptable for v1.0.3 with `lastFeedbackSubmittedDate` separate-tracking deferred.)
- All FeedbackView entry points (HomeView "Send Feedback" button, OutputView toolbar `bubble.left`, OutputView export error sheet's "Report Issue") share the same registration. Confirm no other entry point exists that we missed.

### F9 — Test coverage gaps

`ReviewPromptServiceTests` (10 tests) covers eligibility logic with full DI fakes. `OutputViewIntegrationTests` (4 tests) covers hashing determinism + invalidSelection / checklist exposure.

**Verify:**
- Are there meaningful contract-level paths NOT tested? Specifically:
  - The `markReviewRequested()` → next-eligibility-check-suppressed flow is tested (test 8). Good.
  - The async path through `StoreKitDistributionDetector` is NOT tested (the `FakeDistribution` is sync-mocked). Acceptable since `StoreKitDistributionDetector` itself has no logic beyond AppTransaction unwrap + cache. No test verifies the AppTransaction unwrap is correct — we're trusting the type system + Apple's API contract.
  - The `registerFeedbackOpened()` writes to storage — is that tested? Looking at tests... not explicitly. We test the feedback-opened cooldown (test 4) but not the write itself.
  - The `Task.isCancelled` post-sleep behavior in `OutputView.maybePromptForReview` is NOT tested. Hard to test (would need ViewInspector or UI test). Acceptable miss for unit tests.
- The 4 integration tests rely on `EngineService.shared.initialize()` succeeding. Are they robust to engine-init flakiness? Each test calls `setUp` async — if engine init fails, all 4 fail with confusing errors. Existing `OutputViewModelTests` has the same pattern; not a regression.

### F10 — Code style / Swift idioms / dead code

Anything else: variable naming, access control, MainActor coverage, force-unwraps, missing nil checks, dead code, leftover TODOs / FIXMEs, comment quality, missing doc comments on public API, etc.

## Out of scope (do NOT re-litigate)

These were adjudicated in prior passes. Bring them up only if you find new evidence:

- **The `>= 4` heuristic anchor** — Apple-anchored verbatim ("this number is arbitrary"); accepted in M3.
- **The 30-day local cooldown** — local-policy choice; accepted in M3 SF2 with documentation.
- **The 14-day FeedbackView cooldown** — local-policy choice; accepted in M3 SF3 with separate-tracking deferred.
- **The 19-field profile-key list** — verified against `AppState.swift:49–73` in M3 MF2; accepted as final.
- **`userLevel` inclusion** — owner-confirmed in M3 Resolution after engine.js:1447 + :1756 verification.
- **OutputView vs HomeView trigger surface** — accepted in M3 packet's "Genuinely good enough" ruling.
- **Persistent "Write a review" link** — deferred to v1.0.4 in M3 O1.
- **`PrintWarning.severity` engine contract change** — out of scope per M3 MF4 Resolution.
- **`lastFeedbackSubmittedDate` separate tracking** — deferred to v1.0.4 in M3 SF3.
- **The semantic of "distinct" (warning-distinct vs slicer-output-distinct)** — owner-confirmed warning-distinct in M3 Resolution.
- **Sandbox vs TestFlight-strict detection** — owner-confirmed sandbox-broadened in M3 MF1 Resolution (option (a)).

If you find a Must-Fix issue that intersects one of these, surface it but flag explicitly that it's a design re-litigation, not a code-correctness issue.

## Format

Append findings below in this structure:

```
## Verdict
[approve / approve-with-modifications / request-changes — one short paragraph stating
whether the owner can git push iOS main and dispatch TestFlight, with confidence level]

## Must-Fix
| Finding | File:line | Why it matters | Required change |
|---|---|---|---|
| ... | ... | ... | ... |

## Should-Fix
| Finding | File:line | Why it matters | Suggested change |
|---|---|---|---|
| ... | ... | ... | ... |

## Optional
| Finding | File:line | Notes |
|---|---|---|
| ... | ... | ... |

## Genuinely good enough
| Area | Ruling |
|---|---|
| ... | ... |

## Confidence
[High / Medium / Low on the verdict + per-area where it differs]
```

**File:line references mandatory** for every Must-Fix and Should-Fix. Use the file paths from "What changed" above (relative to repo root). Code snippets in findings are welcome but optional.

**Confidence calibration:** High = "I would bet on this finding"; Medium = "this looks wrong but I'd want to verify"; Low = "this is a hunch worth raising."

## Final challenge

This is post-implementation review for a feature with disproportionate per-user lasting cost when wrong (Apple's quota is per-user, per-app, 365 days; a wrong-trigger burns one of three annual prompts on negative sentiment). The design review (M3 packet) already caught 4 Must-Fix bugs before any code was written. Your job here is to catch the bugs the design review couldn't see — concurrency contracts, async-boundary correctness, persistence shape, AppTransaction unwrap correctness, and any code-quality issue that risks regression in TestFlight or App Review.

Sign off on `approve` if the owner can `git push` and dispatch TestFlight as-is. Approve-with-modifications if there are Must-Fix items that should land before pushing. Request-changes only if the implementation has a load-bearing correctness bug that would risk a TestFlight rejection or production-user negative-trigger.

The owner is on a tight pilot deadline (2026-05-14, 6 days). This packet's review is the marquee artifact for the AI Operating Model pilot evaluation — your independent code-review verdict is the final gate before the feature ships.

---

# Codex Response

*(Codex appends here. Format: Verdict / Must-Fix / Should-Fix / Optional / Genuinely good enough + Confidence per the spec above.)*

## Verdict

approve-with-modifications — the implementation is faithful to the M3 Resolution in the big pieces, but I would not push iOS `main` / dispatch TestFlight until the one Must-Fix below lands. The current `OutputView` flow can miss prompting users who cross the 4-distinct-profile threshold while another gate is still closed, then later revisit an already-counted profile after becoming eligible.

## Must-Fix

| Finding | File:line | Why it matters | Required change |
|---|---|---|---|
| **Eligibility is only evaluated for novel profile keys, so users can get stranded after crossing the threshold while another gate is closed.** | `3DPrintAssistant/Views/Output/OutputView.swift:278-283`; `3DPrintAssistant/Services/ReviewPromptService.swift:193-216` | `registerSuccessfulProfileGeneration` correctly increments the distinct counter before eligibility. But `guard isNovel else { return }` means a user who generates 4 distinct profiles on day 1, while `minDaysSinceFirstLaunch` blocks eligibility, will not be evaluated when they revisit any of those same 4 profiles on day 4. Same pattern applies after recent FeedbackView cooldown, StoreKit sandbox/TestFlight suppression, or local cooldown. They need a 5th novel profile even though the baseline says eligibility is `distinct_successful_profile_generations >= 4` plus the other gates. | Keep idempotent counting, but do not make novelty the only path into eligibility evaluation. Move this into the service as a single method if possible, e.g. `registerSuccessfulProfileGenerationAndShouldEvaluate(keyHash:)`, or expose a read-only `hasMetEngagementThreshold`. After registering, evaluate eligibility whenever the threshold is met, even if the current key was already seen. Preserve duplicate-prompt protection with same-version / request-cooldown gates and the post-sleep eligibility re-check. Add a regression test for "4th profile registered while first-launch age is too recent; after clock advances, revisiting same key can prompt." |

## Should-Fix

| Finding | File:line | Why it matters | Suggested change |
|---|---|---|---|
| **The "successful profile" gate does not check that the engine actually produced a profile.** | `3DPrintAssistant/Views/Output/OutputView.swift:273-280`; `3DPrintAssistant/Views/Output/OutputViewModel.swift:70-79`; prior Resolution: `codex/ios-review-prompt/codex-2026-05-08-ios-review-prompt-packet.md:704-729` | The M3 Resolution expected a `profileRenderedSuccessfully`-style gate. The implementation gates on `!invalidSelection` and no critical checklist, but `loadProfile` uses `try?` fallbacks. If `resolveProfile` fails and returns `[:]` for a nominally valid state, the review service can still count that output as a successful value moment. That is exactly the kind of "asked after a bad result" case this feature is trying to avoid. | Add an explicit success predicate, at minimum `!model.resolvedParams.isEmpty`, preferably `model.profileRenderedSuccessfully` set only after the required engine calls complete with usable output. Use that predicate before registering the profile key. |
| **The integration tests do not exercise `OutputView.maybePromptForReview()` itself.** | `3DPrintAssistantTests/OutputViewIntegrationTests.swift:20-52`; `3DPrintAssistantTests/OutputViewIntegrationTests.swift:85-120`; `3DPrintAssistant/Views/Output/OutputView.swift:269-300` | The tests validate the hasher/storage behavior and that `OutputViewModel` exposes gate state, but they do not instantiate `OutputView`, inject a fake review service/requester, or verify the actual structured `.task` prompt path. This misses the exact boundary SF4 asked to protect, including the novelty/eligibility ordering bug above. | After the Must-Fix refactor, add a focused test around the orchestration boundary. If direct SwiftUI testing is too heavy, extract the prompt-decision orchestration into a testable method/service that takes gate state + key hash and returns whether to request. |
| **Local request cooldown is untested independently of same-version gating.** | `3DPrintAssistant/Services/ReviewPromptService.swift:206-208`; `3DPrintAssistantTests/ReviewPromptServiceTests.swift:170-190` | `testMarkReviewRequestedUpdatesStorageAndSuppressesNextEligibility` proves same-version suppression after marking, but not the 30-day cooldown for the next marketing version. A future change could break Q1 behavior without failing tests. | Add one test with `lastVersionPromptedForReview = "1.0.2"`, current version `"1.0.3"`, and `lastPromptRequestDate = now - 7 days` asserting ineligible; add the outside-cooldown counterpart if cheap. |

## Optional

| Finding | File:line | Notes |
|---|---|---|
| **Cheap storage gates could run before the async distribution detector.** | `3DPrintAssistant/Services/ReviewPromptService.swift:187-203` | Current order is correct functionally. If the StoreKit detector ever feels slow or flaky, check count/version/date gates before awaiting distribution. Not worth blocking v1.0.3. |
| **`UserDefaults` optional setters are fine, but no clear path is exposed.** | `3DPrintAssistant/Services/ReviewPromptService.swift:61-79` | `set(nil, forKey:)` removes the value, so this is not a bug. A test-only reset helper is unnecessary unless future tests use real `UserDefaults` suites. |

## Genuinely good enough

| Area | Ruling |
|---|---|
| **F1 AppTransaction unwrap / sandbox semantics** | Good enough. `StoreKitDistributionDetector` correctly unwraps `VerificationResult<AppTransaction>`, caches the result, and uses the honest sandbox-or-TestFlight/Xcode semantic accepted in M3. Suppressing on error is conservative but acceptable. |
| **F3 side-effect-free eligibility** | Good enough. `isEligibleForReviewPrompt()` no longer writes `firstLaunchDate`; launch registration moved to `ContentView.init()` via `registerLaunchIfNeeded()`. |
| **F4 persistence keys/storage shape** | Good enough. `rps.` namespacing avoids collisions, `[String]` backing storage is appropriate at this scale, and no migration is needed for a new v1.0.3 key set. |
| **F5 profile-key field list** | Good enough. The 19-field hash matches `AppState.toJSDictionary()`'s engine-facing fields, excludes only `brand`, sorts multi-select arrays, and uses a defensible `_nil` sentinel. |
| **F6 checklist load contract** | Good enough. `OutputViewModel` loads `checklist` with the same engine API used by the sheet, and the low-scope critical gate matches the M3 Resolution. |
| **F7 service initialisation** | Good enough. Multiple `ContentView.init()` calls are safe because `registerLaunchIfNeeded()` is idempotent and storage is persisted, not service-instance-local. |
| **F8 FeedbackView registration** | Good enough. Registering on every `FeedbackView.onAppear` matches the accepted broad cooldown policy for v1.0.3. |
| **F10 code style / access control** | Clean overall. The new code is readable, scoped, and consistent with the repo's Observation/SwiftUI style. |

## Confidence

High on the Must-Fix: the novelty guard changes the effective eligibility semantics in a way tests do not cover. High on the AppTransaction/profile-key/checklist/storage confirmations. Medium on the `profileRenderedSuccessfully` Should-Fix because it depends on how often engine bridge fallbacks can occur, but the guard is cheap and matches the Resolution.

---

# Resolution

> **Status: Resolution applied. iOS `main` ready to push and dispatch TestFlight.**
> All 1 Must-Fix + 3 Should-Fix dispositions accepted and shipped as 3 separate commits on iOS `main` per the project's "one finding = one commit per platform" rule. Codex's wording captured: novelty controls counter increments only, not eligibility evaluation. 64/64 XCTest green (was 60).

## Per-finding dispositions

### Must-Fix

| # | Codex finding | Disposition | Implementation |
|---|---|---|---|
| **MF1-impl** | Eligibility only evaluated for novel keys → users stranded after threshold while another gate closed | **Accept** | iOS commit `1bb543e`. Added `ReviewPromptService.evaluateForRequest(profileKeyHash:)` that registers idempotently AND evaluates eligibility (novelty discarded). `OutputView.maybePromptForReview()` now calls this single method instead of the two-step register-then-guard-isNovel pattern. Duplicate-prompt protection unchanged (same-version + cooldown gates). Regression test added: `testEvaluateForRequestRevisitsExistingKeyEligibleAfterClockAdvance` — 4 keys registered with launch-age gate closed → ineligible; clock advances; revisit existing key → eligible AND counter unchanged. |

### Should-Fix

| # | Codex finding | Disposition | Implementation |
|---|---|---|---|
| **SF1-impl** | Successful-profile gate doesn't check engine actually produced | **Accept** | iOS commit `de4aa9d`. Added `OutputViewModel.profileRenderedSuccessfully` computed property (`!invalidSelection && !resolvedParams.isEmpty`). `OutputView.maybePromptForReview()` first guard now uses this property. Test added: `testProfileRenderedSuccessfullyRequiresNonEmptyResolvedParams` covers the degraded-render rejection + invalid-but-populated rejection + happy path. |
| **SF2-impl** | Integration tests don't exercise `maybePromptForReview()` | **Accept (resolved by MF1-impl)** | The MF1-impl refactor moved the orchestration boundary into `evaluateForRequest` on the service — directly testable via DI fakes (no SwiftUI view harness needed). The MF1-impl regression test exercises the full register + evaluate path that `OutputView` consumes. SwiftUI-level UI testing of the structured `.task` flow remains a UI-test layer concern (existing `ScreenCaptureUITests` target) and is not load-bearing for this v1.0.3 ship. |
| **SF3-impl** | Cross-version local cooldown untested independently | **Accept** | iOS commit `2309af1`. Added 2 paired tests for symmetric coverage: `testCrossVersionWithinLocalCooldownIsNotEligible` (suppression case) + `testCrossVersionOutsideLocalCooldownIsEligible` (allowed case). |

### Optional

| # | Codex finding | Disposition |
|---|---|---|
| **O1-impl** | Cheap storage gates before async distribution detector | **Decline** — per Codex's own note "not worth blocking v1.0.3"; revisit if AppTransaction first-call latency surfaces as a problem in TestFlight QA. |
| **O2-impl** | `set(nil, forKey:)` removes — confirmation only | **Note only** — current code is correct; no change. |

### Genuinely good enough — confirmations noted

All 8 of Codex's "good enough" rulings noted: F1 (AppTransaction unwrap / sandbox semantics), F3 (side-effect-free eligibility), F4 (persistence keys / storage shape), F5 (profile-key field list), F6 (checklist load contract), F7 (service initialisation), F8 (FeedbackView registration), F10 (code style / access control).

## Commit summary

iOS `main`, all local-only per push gate (now ready to push):

| Commit | Subject | Files | Tests |
|---|---|---|---|
| `1bb543e` | fix(review-prompt): MF1-impl — eligibility no longer gated on novelty | 3 (Service + OutputView + tests) | 60 → 61 |
| `de4aa9d` | fix(review-prompt): SF1-impl — explicit successful-profile gate | 3 (OutputViewModel + OutputView + tests) | 61 → 62 |
| `2309af1` | test(review-prompt): SF3-impl — cross-version local cooldown coverage | 1 (tests only) | 62 → 64 |

Plus the prior `756b107` (initial implementation). Net: 4 commits on iOS `main` for the v1.0.3 batch item 3 review-prompt feature.

## Final state

- ✅ All Codex pass 6 Must-Fix + Should-Fix dispositions implemented.
- ✅ 64/64 XCTest green.
- ✅ Build clean (xcodegen + xcodebuild).
- ✅ Walkthrough harness baseline unchanged (no `engine.js` or data changes).
- ✅ iOS push gate: ready to lift. Owner can `git push origin main` + bump `MARKETING_VERSION` 1.0.2 → 1.0.3 in `project.yml` + `xcodegen generate` + `gh workflow run testflight.yml --ref main` when ready to ship.
- ✅ AI Operating Model pilot evaluation (2026-05-14) gets this packet as the marquee artifact: 6 Codex passes total (1 design phase + 4 milestone peer-reviews + 1 post-implementation code review) + 1 Gemini research pass on a single feature, 5 caught-before-ship bugs (4 in design + 1 stranded-eligibility runtime bug), all with verbatim Apple primary-source citations.

*(Claude appends after Codex response. Per-finding accept / modify / decline with rationale.)*
