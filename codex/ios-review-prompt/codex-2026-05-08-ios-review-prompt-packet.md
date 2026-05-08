# Codex design review — 3dpa-iOS App Store review prompt v1 (pre-implementation)

> **How this file works.** Claude (Opus 4.7, 1M context) writes everything above the `# Codex Response` marker — Context + Decision to challenge + Apple mandates + Alternatives + Architecture + Tests + Uncertainty + Feedback wanted + Time pressure + Reversibility + final challenge paragraph. Codex appends findings into the `# Codex Response` section at the bottom (Must-Fix / Should-Fix / Optional / Genuinely good enough + Recommendation + Confidence). Claude then appends `# Resolution` with per-finding accept / modify / decline. The file is the single artifact for this review — no parallel session log, no copy-paste blocks.
>
> **Read-only constraint (MANDATORY).** During this review, Codex MUST NOT modify any project source files. Codex's only allowed write surface is the `# Codex Response` section of THIS file. No edits to iOS source (`*.swift`), `AppState.swift`, `Services/*.swift`, `AppConstants.swift`, `Info.plist`, locales, tests, scripts, the research foundation file, or any other artifact. Findings that imply a code change are described in prose / Swift snippets inside the response; Claude applies the change after the owner approves dispositions in the `# Resolution` section.
>
> **Project context (read first).** [`docs/3dpa-context.md`](../../docs/3dpa-context.md) — what 3dpa is, the engine architecture, the data model, the standing rules, the AI Operating Model under which this review runs. The packet below assumes you've read that.
>
> **Research foundation (load-bearing inputs).** [`docs/research/gemini-ios-review-prompt-best-practices.md`](../../docs/research/gemini-ios-review-prompt-best-practices.md) — the executed Resolution after 4 prior peer-review passes (Gemini response → Codex pass 1 → Codex pre-execution review → Codex Milestone 1 review → Codex Milestone 2 review). The Apple primary-source quotes cited in this packet are extracted verbatim from owner-clipped Apple pages at `Obsidian Vault/50-Wiki/raw/apple/review/`. This packet is M3 of that step-by-step process.

## Context

### What's being built

**3D Print Assistant (iOS) v1.0.2** is currently live worldwide on the App Store (released 2026-04-16, EU-unblocked 2026-04-27). The owner wants to add an **in-app review prompt** to nudge engaged recurring users toward leaving a positive App Store review, shipped as one of five user-facing items in the v1.0.3 batch.

**State today: greenfield.** The iOS app currently has zero review-prompt code: no `SKStoreReviewController` import, no SwiftUI `RequestReviewAction`, no `UserDefaults` engagement tracking, no launch counter. Both the engagement-tracking layer AND the trigger heuristic must be designed from scratch.

### What 3dpa-iOS is (compressed)

- **Stack:** SwiftUI, JavaScriptCore for engine logic, dark-mode only.
- **Surface area:** Home → Configurator wizard (printer / material / nozzle / goals) → Output (profile params, warnings, checklist, troubleshooter). Plus a feedback flow that posts to a Cloudflare Worker → Discord channel.
- **Distribution:** App Store, free, no IAPs, no account, no telemetry today (analytics is a separate v1.0.3 item — handover #4).
- **Owner:** solo hobbyist, side project. Review prompt is for App Store credibility, not monetisation.

Full context in [`docs/3dpa-context.md`](../../docs/3dpa-context.md).

### Why this review fires now

This packet runs under the v1.0.3 batch's per-phase Codex filter on three predicates:

1. **Contract surface change** — new persistent `UserDefaults` keys + new `ReviewPromptService` public API + new view-layer integration in `OutputView`.
2. **Hard-to-reverse user-side cost** — Apple's quota is per-user, per-app, 365 days. A wrong-trigger burns one of the user's three annual prompts on negative sentiment; that user is unlikely to leave a positive review for the next year regardless of subsequent fixes. Wrong-trigger cost is real and lasting per user.
3. **Durable naming** — `UserDefaults` keys persist across versions; getting them wrong now means schema drift in v1.1+.

### AI Operating Model pilot context

3dpa is in the pilot's final week (ends 2026-05-14). This packet is **M3 of a step-by-step research-then-design-then-implement sequence** under the operating model. The prior milestones (M0 Gemini research → M1 plan v2 with Codex pass 2 incorporation → M2 Apple primary-source gap-fill) all peer-reviewed by Codex with 0 wholesale-decline outcomes; the per-finding triage pattern was validated as the right alternative to handover #1's wholesale-decline failure.

This is the first Codex full-design review of the v1.0.3 batch (the prior Codex passes were lighter peer-reviews on plan-shape and gap-fill outputs, not full design challenges). After this review lands and the owner approves, implementation lands as a single PR per the operating model's "research-then-Codex-then-implement" sequence.

## Your role + how this review works

This review runs under the AI Operating Model. Owner is attaching the operating-model spec ([`docs/ai-collab.md`](../../docs/ai-collab.md)) to this conversation. Read it before reading the design files. It defines:

- Your role (independent challenger — not validator).
- Decision authority (owner's, always — your verdict is one input).
- The review-packet template.
- The scorecard the owner fills in after your response.

Format your response so the scorecard is easy to fill in:

- Separate findings into **Must-Fix / Should-Fix / Optional / Genuinely good enough**.
- End with a **clear recommendation** + a **confidence level** (low / medium / high) on that recommendation.

This is the **first** Codex full-design review on 3dpa under the pilot. The prior Codex passes (4 total on this very feature, plus a separate Phase A printer-audit filter-skip) were lighter peer-reviews on research-plan-shape and gap-fill correctness — not full design challenges. Calibrate accordingly: the owner expects this review to push hard on architecture, persistence shape, and the four open packet questions enumerated below.

## Decision to challenge

**Should 3dpa-iOS ship the in-app review prompt described below in v1.0.3, with the proposed v2 baseline as the trigger heuristic, the proposed `ReviewPromptService` architecture, and the four open packet questions resolved as proposed — or is one of those load-bearing decisions wrong, and what should it be instead?**

### The proposed v2 baseline (candidate-to-challenge)

```text
Request review when:
  distinct_successful_profile_generations >= 4
  AND days_since_first_launch >= 3
  AND current_marketing_version != last_version_prompt_requested
  AND local_request_cooldown has elapsed (duration: see open question 1)
  AND (last_feedback_opened_at is nil OR older than 14 days)
  AND current surface is OutputView after a successful profile generation
  AND distribution is not TestFlight

After requesting:
  store last_prompt_request_date
  store last_version_prompt_requested
  treat the local request as consumed regardless of whether Apple displayed UI
  (no callback exists; StoreKit may have suppressed or shown silently)
```

**Apple-anchored conditions** (firm; non-negotiable unless Codex finds new evidence):
- `distinct_successful_profile_generations >= 4` — anchored to Apple's "Requesting App Store reviews" sample (verbatim *"successfully completes the three-step process at least four times. **This number is arbitrary**"*).
- `current_marketing_version != last_version_prompt_requested` — directly from Apple's sample code pattern.
- "Store on request, not on display" — load-bearing; Apple provides no callback / display-confirmation API.
- "Distribution is not TestFlight" — Apple confirms the prompt is a no-op on TestFlight builds.
- OutputView surface + delay before request — HIG-aligned ("look for natural breaks or stopping points" + Apple sample's `Task.sleep(for: .seconds(2))`).

**Local-policy conditions** (Apple-flagged "arbitrary"; Codex should challenge each):
- `days_since_first_launch >= 3` — local guard so a same-day power user can't be asked on day 1.
- `last_feedback_opened_at older than 14 days OR nil` — local cooldown to avoid asking unhappy users.
- `local_request_cooldown` between successful requests — duration to be decided in this packet.

## Apple primary-source mandates

These are non-negotiable unless the review surfaces a primary source overriding them. All quotes verbatim from owner-clipped Apple pages in `Obsidian Vault/50-Wiki/raw/apple/review/`. Cross-references in [`docs/research/gemini-ios-review-prompt-best-practices.md`](../../docs/research/gemini-ios-review-prompt-best-practices.md) Part B.

### Quota wording (RequestReviewAction)

> *"If the person hasn't rated or reviewed your app on this device, StoreKit displays the ratings and review request a maximum of three times within a 365-day period. If the person has rated or reviewed your app on this device, StoreKit displays the ratings and review request if the app version is new, and if more than 365 days have passed since the person's previous review."*

**Implication:** Apple's quota is a *display* limit, not a *request* limit. The app can call `requestReview()` more often without penalty; Apple just silently no-ops. But the app can't see which branch StoreKit applied. Hence the local cooldown.

### No display callback (RequestReviewAction Topics list + Overview)

The RequestReviewAction Topics list contains exactly two members: `callAsFunction()` and the `requestReview` environment value. **No completion handler. No callback. No display-confirmation API.** Plus the Overview wording: *"App Store policy governs the actual display of a rating and review request view."*

**Implication:** The app cannot programmatically confirm whether the prompt displayed. Treating a fired request as consumed (storing `last_prompt_request_date` + `last_version_prompt_requested` regardless of display) is the only defensible path.

### Heuristic anchor (Requesting App Store Reviews article + sample code)

> *"The person successfully completes the three-step process at least four times. **This number is arbitrary** and developers can choose something that fits well with how many times someone is likely to complete a process in their apps."*

```swift
// Apple verbatim sample
if processCompletedCount >= 4, currentAppVersion != lastVersionPromptedForReview {
    presentReview()
    lastVersionPromptedForReview = currentAppVersion
}

private func presentReview() {
    Task {
        // Delay for two seconds to avoid interrupting the person using the app.
        try await Task.sleep(for: .seconds(2))
        await requestReview()
    }
}
```

**Implication:** `>= 4` is the Apple-derived default. Apple's caveat ("this number is arbitrary") gives the project license to tune it if real evidence emerges, but absent that evidence, `>= 4` is the right default — and *not* `5`, `6`, or `10`. The 2-second delay is Apple-prescribed.

### "Natural break" timing (HIG)

> *"Avoid interrupting people while they're performing a task or playing a game. Asking for feedback can disrupt the user experience and feel like a burden. Look for natural breaks or stopping points in your app or game where a rating request is less likely to be bothersome."*

**Implication:** OutputView is the natural break — user has just finished the configurator, profile is rendered, no active task. Firing during the navigation transition into OutputView would violate this; firing after the 2-second delay does not.

### Anti-pestering (HIG)

> *"Avoid pestering people. Repeated rating requests can be irritating, and may even negatively influence people's opinion of your app. Consider allowing at least a week or two between requests, prompting again after people demonstrate additional engagement with your experience."*

**Implication:** Apple suggests "at least a week or two between requests" — relevant for the local cooldown duration packet question.

### App Review Guideline 5.6.1 (verbatim)

> ***5.6.1 App Store Reviews** — App Store customer reviews can be an integral part of the app experience, so you should treat customers with respect when responding to their comments. Keep your responses targeted to the user's comments and do not include personal information, spam, or marketing in your response. Use the provided API to prompt users to review your app; this functionality allows customers to provide an App Store rating and review without the inconvenience of leaving your app, and we will disallow custom review prompts.*

**Implication:** **Custom review prompt UI is forbidden.** Apple's `RequestReviewAction` is mandatory; any "Do you like this app? [Yes / No]" pre-prompt or rating-routing UI is grounds for App Review rejection. This rules out the "filter-by-pre-prompt" pattern some apps use.

### Localisation note (system-rendered prompt)

The HIG describes the prompt as "system-provided." No clipped Apple page contains an explicit Danish-localisation guarantee. **Resolution wording (binding for this packet):** *"StoreKit owns the system prompt UI; standard iOS device-language localisation applies; 3dpa does not provide DA strings for the prompt itself."* No app-side localisation work for the prompt.

## Alternatives considered

### Alternative A — Launch-count-based heuristic (rejected)

Gemini's original Block 2 recommendations were anchored on `launch_count >= 5–10` plus `days_since_install >= 3–14`, drawn from "Incipia" and "Nil Coalescing" sources that the brief's source-or-null rule disallowed. Rejected during M0–M1 because:

- `launch_count` is a noisy proxy for value. A user can launch repeatedly while confused (comparing printers, checking if data updated). Each launch isn't an "experienced value" moment.
- `successful_profile_generations` directly measures the app's value-delivery moment: printer × material × nozzle × goals → usable slicer profile.
- Apple's own sample anchors on "completed process," not launches.

Adopted instead: `distinct_successful_profile_generations >= 4`. Codex pass 1 proposed this; Codex pass 2 promoted `distinct_*` to baseline; Apple primary-source confirmed the `>= 4` anchor verbatim.

### Alternative B — HomeView trigger surface (rejected as default; tension carried)

Codex pass 1 noted the choice between OutputView (immediate value-delivery moment) and HomeView (calmer rest-state, post-task return). Adopted: **OutputView with 2-second delay**, anchored to HIG "natural break" + Apple sample. But the tension persists: HomeView is less interruptive (user has navigated back voluntarily) but emotionally less connected to the value moment.

**Codex challenge:** is there evidence that HomeView-on-return outperforms OutputView for hobbyist apps with intermittent usage patterns? The packet's working assumption is OutputView; happy to be challenged.

### Alternative C — Persistent "Write a review" link only, no automatic prompt (deferred)

A persistent App Store link (`https://apps.apple.com/app/id6761634761?action=write-review` per Apple's sample) in Settings or the About sheet would be lower-risk and lower-yield than the automatic prompt. Apple's Requesting App Store Reviews article documents this as a valid pattern.

**Status:** Deferred for v1.0.3. The owner's primary goal is *automatic* engagement-aware prompting; the persistent link is additive and can land in v1.0.4 or beyond. Surfaced as packet question 6 below.

### Alternative D — Defer feature to v1.0.4 (rejected)

The "do nothing in v1.0.3" alternative. Rejected because:

- v1.0.3 is the right vehicle (already-batched user-facing items, single TestFlight cycle).
- The pilot ends 2026-05-14 (6 days). Shipping under the operating model's research-then-Codex-then-implement sequence is part of the pilot evaluation; deferring loses that data point.
- The work is small (~150 LoC + 7 unit tests) once the design is locked. Most of the cost is the design challenge being run right now.

### Alternative E — Smaller scope: skip distinct-profile-key idempotency, count every successful render (rejected)

Codex pass 3 (M1 review) flagged that without idempotency, a user generating the same profile 4 times in one sitting becomes eligible — fast-tracking through engagement gating. Adopted: `distinct_successful_profile_keys` with hash-based idempotency. The packet question is *which fields make up the key*, not *whether* to use distinct counting (that's settled).

### Alternative F — Smaller scope: drop FeedbackView cooldown (rejected)

The FeedbackView cooldown defends against asking unhappy users. Without it, opening Feedback (presumably because something went wrong) doesn't suppress eligibility, and the app may ask within minutes of a user complaint. Cooldown duration is open (packet question 5); the cooldown's *existence* is settled.

## Open packet questions

These are the M3 decisions Codex needs to adjudicate (or surface a fundamentally different framing for).

### Q1 — Local request cooldown duration

After firing a `requestReview()` (regardless of whether Apple displayed it), how long must `local_request_cooldown` be before the app is eligible to fire again?

**Tradeoffs:**
- **Short (14 days):** more attempts within Apple's 3/year quota window → more chances to actually display. Risk: if Apple suppressed silently, asking again 14 days later could feel pestering even though Apple isn't actually showing the prompt repeatedly.
- **Medium (30 days):** balanced; Apple's HIG says "consider allowing at least a week or two."
- **Long (90 days, 6 months, 1 year):** preserves quota for higher-confidence eligibility moments. Risk: misses the 365-day Apple quota window if user becomes eligible early in the year and only re-engages much later.
- **Apple-quota-aligned (122 days = ~365/3):** ensures up to 3 attempts spread evenly across the year if the user remains engaged.

**Proposed:** 30 days. Codex challenge: should this be longer / shorter / version-bump-only?

### Q2 — Profile-key field list (`distinct_successful_profile_generations`)

What constitutes a "distinct" successful profile generation for the purposes of incrementing the engagement counter?

**Default proposal (12 fields):**
```
printer, material, nozzle,
useCase, surface, strength, speed,
environment, support, colors, special,
profileMode
```

**Excluded (UI-only):** `userLevel` (Simple vs Advanced view).

**Tradeoffs:**
- **Narrow (only `printer / material / nozzle`):** user can fast-track eligibility by toggling goals after the first 3 nozzle changes. Probably too narrow.
- **Default (12 fields):** captures all engine-relevant input; `userLevel` excluded as UI-only. **Proposed.**
- **Wide (include `userLevel`):** treats a user toggling Simple/Advanced as a new "experienced value" moment. Probably too wide — Simple/Advanced doesn't change the underlying profile output materially.

**Persistence shape:** `UserDefaults` cannot store native Swift `Set` directly. `ReviewPromptService` exposes a Set-like API backed by `[String]` (array of `ProfileKeyHash` values) or `[String: Bool]` dictionary in `UserDefaults`. Hash function: stable order-independent serialisation of the field list above into a SHA256-prefixed string (or just sorted key=value joined; collisions tolerable at this scale).

**Codex challenge:** is the 12-field list right? Does any field get incorrectly conflated (e.g. `colors: single` vs `colors: multi` is a meaningfully different profile because of AMS routing — keep), or incorrectly distinguished (e.g. if `special: []` and `special: ["something"]` change a fan curve but otherwise the same profile, is that really a "new value moment"?). Hash collision handling — defensible at hobbyist scale (< 1000 distinct profiles per user), or worth adding fallback?

### Q3 — Critical-warnings filter

Should a profile generation that emits one or more critical warnings (e.g. `printer_bed_temp_incompatible`, `material_printer_incompatible`) increment `distinct_successful_profile_generations`?

**Tradeoffs:**
- **Include critical-warning profiles:** simpler logic; argument: "the engine still produced a profile, value was delivered, even if it warns."
- **Decline critical-warning profiles:** sounder semantically; argument: "a critical warning means the user got a profile they shouldn't actually print — the value was incomplete; asking for a review on the back of an incomplete value moment risks negative sentiment."

**Proposed:** Decline. Critical-warning generations don't increment. Document in packet rationale.

**Codex challenge:** is this the right call? If Codex disagrees, which warning categories should/shouldn't gate eligibility (CRITICAL only? CRITICAL + HIGH? all warnings?).

### Q4 — TestFlight detection mechanism

Two candidates surfaced in M2; AppTransaction page not in the M2 clipping batch (deferred to M3 packet decision).

**Candidate 1 — Receipt-path check:**
```swift
let isTestFlight = Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"
```
Pros: well-known pattern; works on iOS 14+; no async / no error handling.
Cons: receipt-based detection has historically been brittle (StoreKit 2 changed receipt locations; receipt may be missing on first launch before the app has any receipt yet).

**Candidate 2 — `AppTransaction.shared.environment`:**
```swift
let isTestFlight = (try? await AppTransaction.shared.environment) == .sandbox
```
Pros: iOS 16+, explicit StoreKit 2 API for distribution detection; designed for exactly this purpose.
Cons: async / can throw; requires iOS 16+ (3dpa-iOS deployment target is iOS 17+, so fine); unverified against Apple primary source in M2 (the page wasn't in the clipping batch).

**Proposed:** Candidate 2 (`AppTransaction.shared.environment`). Reasoning: iOS 17+ deployment target removes the version concern; StoreKit 2 API is explicitly designed for this use; receipt-path is legacy.

**Codex challenge:** verify against Apple's primary docs (or recommend deferring receipt-path verification to a quick gap-fill before implementation). If Codex prefers Candidate 1 or "both as belt-and-suspenders," surface that.

### Q5 — FeedbackView cooldown duration

Codex pass 1 listed 7 / 14 / 30 days as candidates. Proposed: **14 days**. Anchored loosely on HIG's "at least a week or two" and the symmetry with Q1's cooldown.

**Tradeoffs:**
- **7 days:** lighter touch; user complaining about a small UX thing on day 1 is back in eligibility on day 8.
- **14 days:** symmetric with Q1; gives complaint signal a substantive cooldown.
- **30 days:** conservative; risks losing legitimately-engaged users who happened to open Feedback once for an unrelated reason (e.g. praise).

**Codex challenge:** is 14 days right? Does it matter what the user did in FeedbackView (sent feedback vs just opened and closed)?

### Q6 — Persistent "Write a review" link in app UI

Apple's article documents the `action=write-review` deep link as a valid pattern for user-initiated review submission. Should v1.0.3 include this?

**Tradeoffs:**
- **Include:** belts-and-braces approach. User who *wants* to leave a review (not Apple-prompted) has a discoverable path. Settings/About sheet candidate.
- **Decline for v1.0.3:** ship the automatic prompt first; observe; add the persistent link in v1.0.4 if data suggests value. Smaller v1.0.3 scope.

**Proposed:** Decline for v1.0.3. Persistent link is additive and not load-bearing for the engagement-prompt design.

**Codex challenge:** is deferring right? Is the marginal cost of adding the link to Settings high enough to justify deferring?

### Q7 — `MARKETING_VERSION` vs `CFBundleVersion` for per-version gating

`current_marketing_version != last_version_prompt_requested` requires picking which version string to compare. Apple's sample uses `currentAppVersion` ambiguously.

**Tradeoffs:**
- **`MARKETING_VERSION` (`1.0.3`):** semver-aligned; bumps with feature releases; matches App Store-visible version.
- **`CFBundleVersion` (build number, e.g. `42`):** bumps with every build; would re-eligible per build, even within a single user-facing version. Almost certainly wrong for per-version gating but worth ruling out.

**Proposed:** `MARKETING_VERSION` via `AppConstants.appVersion`. Already used in HomeView footer.

**Codex challenge:** trivial decision but worth confirming.

### Q8 (carry-forward from Codex pass 1) — Eligibility distinct or every render?

This is settled by Q2 (distinct profile keys with idempotency) but Codex pass 1 surfaced it generically. If Codex disagrees with Q2's distinct-counting approach and prefers raw-render counting, this is the question to challenge.

## Candidate architecture

### Service layer — `ReviewPromptService` with dependency injection

```swift
protocol ReviewPromptStorage {
    var firstLaunchDate: Date? { get set }
    var lastVersionPromptedForReview: String? { get set }
    var lastPromptRequestDate: Date? { get set }
    var lastFeedbackOpenedDate: Date? { get set }
    func registerSuccessfulProfile(keyHash: String) -> Bool  // returns true if novel
    var distinctSuccessfulProfileCount: Int { get }
}

protocol DistributionDetector {
    var isTestFlight: Bool { get }  // Q4 mechanism injected
}

protocol Clock {
    var now: Date { get }
}

protocol AppVersionProvider {
    var currentMarketingVersion: String { get }
}

@MainActor
final class ReviewPromptService {
    private let storage: ReviewPromptStorage
    private let clock: Clock
    private let appVersion: AppVersionProvider
    private let distribution: DistributionDetector

    init(storage: ReviewPromptStorage,
         clock: Clock,
         appVersion: AppVersionProvider,
         distribution: DistributionDetector) {
        self.storage = storage
        self.clock = clock
        self.appVersion = appVersion
        self.distribution = distribution
    }

    /// Records a successful profile generation and returns whether this generation
    /// was novel (i.e. distinct profile-key hash not seen before).
    func registerSuccessfulProfileGeneration(keyHash: String) -> Bool {
        return storage.registerSuccessfulProfile(keyHash: keyHash)
    }

    func registerFeedbackOpened() {
        storage.lastFeedbackOpenedDate = clock.now
    }

    /// Returns true if all eligibility conditions are satisfied. Read-only.
    func isEligibleForReviewPrompt() -> Bool {
        guard !distribution.isTestFlight else { return false }
        guard storage.distinctSuccessfulProfileCount >= 4 else { return false }
        guard let firstLaunch = storage.firstLaunchDate else {
            storage.firstLaunchDate = clock.now
            return false
        }
        guard clock.now.timeIntervalSince(firstLaunch) >= 3 * 86_400 else { return false }
        guard storage.lastVersionPromptedForReview != appVersion.currentMarketingVersion else { return false }
        if let lastReq = storage.lastPromptRequestDate,
           clock.now.timeIntervalSince(lastReq) < cooldownSeconds(Q1) {
            return false
        }
        if let lastFb = storage.lastFeedbackOpenedDate,
           clock.now.timeIntervalSince(lastFb) < 14 * 86_400 {
            return false
        }
        return true
    }

    /// Records that a request was fired, regardless of whether StoreKit displayed it.
    /// Apple provides no display callback — treat the request as consumed.
    func markReviewRequested() {
        storage.lastPromptRequestDate = clock.now
        storage.lastVersionPromptedForReview = appVersion.currentMarketingVersion
    }
}
```

### View layer — `OutputView` integration

```swift
struct OutputView: View {
    @Environment(\.requestReview) private var requestReview
    @StateObject private var viewModel: OutputViewModel
    @EnvironmentObject private var reviewPromptService: ReviewPromptService

    var body: some View {
        // ... existing OutputView content ...
        .task {
            await viewModel.loadProfile(state: appState)
            // After profile renders successfully, register + maybe prompt.
            if viewModel.profileRenderedSuccessfully {
                let keyHash = ProfileKeyHasher.hash(appState)  // 12-field hash per Q2
                let isNovel = reviewPromptService.registerSuccessfulProfileGeneration(keyHash: keyHash)
                guard isNovel, reviewPromptService.isEligibleForReviewPrompt() else { return }

                Task {
                    try? await Task.sleep(for: .seconds(2))  // Apple-prescribed delay
                    await requestReview()
                    reviewPromptService.markReviewRequested()  // store regardless of display
                }
            }
        }
    }
}
```

### `UserDefaults` shape (Q2 persistence answer)

```swift
// Storage keys (binding for v1.0.3; renames are version-migration-class going forward).
private enum Keys {
    static let firstLaunchDate              = "rps.firstLaunchDate"
    static let lastVersionPromptedForReview = "rps.lastVersionPromptedForReview"
    static let lastPromptRequestDate        = "rps.lastPromptRequestDate"
    static let lastFeedbackOpenedDate       = "rps.lastFeedbackOpenedDate"
    static let distinctProfileKeyHashes     = "rps.distinctProfileKeyHashes"  // [String]
}

final class UserDefaultsReviewPromptStorage: ReviewPromptStorage {
    // ... gettters/setters wrapping UserDefaults.standard ...

    func registerSuccessfulProfile(keyHash: String) -> Bool {
        var hashes = UserDefaults.standard.stringArray(forKey: Keys.distinctProfileKeyHashes) ?? []
        guard !hashes.contains(keyHash) else { return false }
        hashes.append(keyHash)
        UserDefaults.standard.set(hashes, forKey: Keys.distinctProfileKeyHashes)
        return true
    }

    var distinctSuccessfulProfileCount: Int {
        UserDefaults.standard.stringArray(forKey: Keys.distinctProfileKeyHashes)?.count ?? 0
    }
}
```

### OutputView idempotency

SwiftUI's `.task` modifier re-runs on view-lifecycle changes. The `registerSuccessfulProfileGeneration` call must be idempotent per profile key. The hash check inside `registerSuccessfulProfile` provides this — if `.task` re-runs with the same `appState`, the hash already exists and the register returns `false`, no double-counting, no double-prompt. **Critical:** the eligibility check happens *after* `registerSuccessfulProfileGeneration` returns true, so the same key generating the prompt request once is the same key that prevents asking again.

### Profile-key hashing

```swift
struct ProfileKeyHasher {
    static func hash(_ state: AppState) -> String {
        // Stable order-independent serialisation of the 12 engine-relevant fields.
        // userLevel intentionally excluded.
        let parts: [String] = [
            "printer=\(state.printer)",
            "material=\(state.material)",
            "nozzle=\(state.nozzle)",
            "useCase=\(state.useCase.sorted().joined(separator: ","))",
            "surface=\(state.surface)",
            "strength=\(state.strength)",
            "speed=\(state.speed)",
            "environment=\(state.environment)",
            "support=\(state.support)",
            "colors=\(state.colors)",
            "special=\(state.special.sorted().joined(separator: ","))",
            "profileMode=\(state.profileMode ?? "safe")",
        ]
        return parts.joined(separator: "|")
        // No SHA needed at hobbyist scale — string is stable + readable.
    }
}
```

## Tests

`ReviewPromptServiceTests` (XCTest, no StoreKit dependency thanks to DI):

1. **Threshold not met → not eligible.** `distinctSuccessfulProfileCount = 3`, all other conditions met → `isEligibleForReviewPrompt() == false`.
2. **4th distinct profile + all conditions met → eligible.** `distinctSuccessfulProfileCount = 4`, `firstLaunchDate = now - 4 days`, version unset, no last-request, no recent feedback, distribution = production → `isEligibleForReviewPrompt() == true`.
3. **Same-version re-fire suppressed.** All conditions met but `lastVersionPromptedForReview == currentMarketingVersion` → `false`.
4. **FeedbackView opened within cooldown → not eligible.** All conditions met, `lastFeedbackOpenedDate = now - 7 days` → `false` (within 14-day cooldown).
5. **TestFlight build → not eligible.** All conditions met but `distribution.isTestFlight == true` → `false`.
6. **Same profile key generated 4× → distinct count == 1, not eligible.** `registerSuccessfulProfileGeneration("X")` four times → returns `true, false, false, false`; final `distinctSuccessfulProfileCount == 1`; `isEligibleForReviewPrompt() == false`.
7. **Critical-warning generation does not increment.** (Pending Q3 disposition.) If decline: `registerSuccessfulProfileGeneration` is only called from OutputView when no critical warnings present; tested by integration / UI test, not unit. If include: no test needed beyond test 6.

Plus walkthrough harness no-op (no engine.js change, no data change).

Plus iOS XCTest count: from 46 → 53 (7 new tests). Acceptance: all green pre-push.

## Uncertainty

- **Q4 (`AppTransaction`) primary source unverified.** The M2 clipping batch did not include the AppTransaction Apple page. Codex should either (a) confirm Candidate 2 from general iOS knowledge with appropriate confidence, or (b) flag that owner should pull the page before implementation.
- **Q3 (critical-warnings filter) is a judgment call.** No Apple primary source guides this; it's project-specific. Owner has a stake in the call ("does my user feel asked-for-review on a profile that warns about hardware incompatibility?").
- **Q1 (cooldown duration) is local-policy.** Apple says "at least a week or two"; everything beyond that is judgment. 30 days is a guess; could be 14, could be 90.
- **Hash collision tolerance.** At hobbyist scale (probably < 200 distinct profile-key permutations for an active user), string-collision is essentially zero. If Codex thinks SHA is needed regardless, surface — willing to defer.

## Feedback wanted

- **Push hard on the 4 open packet questions.** Especially Q1 (cooldown), Q2 (field list), Q3 (warnings filter), Q4 (TestFlight detection). These are the design decisions I most want challenged.
- **Architecture pushback welcome.** If `ReviewPromptService` should be split (e.g. eligibility logic separate from registration logic), or if `@MainActor` is wrong, or if the storage protocol shape is wrong, surface.
- **OutputView integration shape.** The proposed `.task` flow assumes view-model has a `profileRenderedSuccessfully` flag to gate the registration call. If OutputViewModel doesn't have that today, that's an extra change. Confirm.
- **Honest uncertainty** is welcome. "I couldn't verify Q4 against primary docs" is a useful answer.
- **Push back on the brief if the framing is wrong.** If the right approach is fundamentally different (e.g. don't use StoreKit at all, or the entire service layer is overkill, or persistent-link-only beats automatic prompt), surface in Must-Fix.

## Time pressure

- **AI Operating Model pilot ends 2026-05-14** — 6 days from now. End-of-pilot decision matrix (continue / modify / drop) requires this packet's review as evidence of the operating model's value.
- **v1.0.3 batch is the target** — 5 user-facing items, this is item 3. Items 2 (environments), 4 (analytics), 5 (web output UX) still in earlier phases. Implementation of item 3 doesn't block them.
- **No hard external deadline.** Quality > speed. v1.0.3 ships when ready. The pilot deadline is the only soft pressure.

## Reversibility

A review-prompt implementation is **mostly reversible** in code (any subsequent build can remove or disable the prompt). But two semi-permanent costs:

1. **Apple's quota window is per-user, per-app, 365 days.** If we trigger badly and a user gets prompted at the wrong moment, that's one of their 3 annual prompts burned with negative sentiment — that user is unlikely to leave a positive review for the next 365 days regardless of subsequent fixes. **Wrong-trigger cost is real and lasting per user.**
2. **Negative reviews are durable.** A 1-star review with text like *"asked me to review while showing an error"* stays on the App Store unless the user edits it. Not directly removable.

Plus the operating-model cost: this is the first full Codex design review on 3dpa under the pilot; getting the design wrong here is a strike against the operating model's case in the 2026-05-14 evaluation, irrespective of code reversibility.

## Final challenge paragraph

This is a small feature (~150 LoC + 7 tests) with disproportionate per-user lasting cost when wrong. The Apple primary sources are firmly nailed down (M2's gap-fill + your prior 3 passes); the load-bearing decisions are now policy choices, not research gaps. Push hard on Q1–Q4; surface anything that looks wrong about the architecture, persistence shape, or OutputView integration; rule on the alternatives where you have a stronger view; and tell me explicitly which of the four ⚠️ packet questions you want resolved *before* implementation lands vs which can be deferred to in-flight tuning. Apple flags `>= 4` as arbitrary — all the local-policy values inherit that "arbitrary" property. Where should I tighten, where should I loosen, and which decision should I revisit entirely?

---

# Codex Response

*(Codex appends here. Format: Must-Fix / Should-Fix / Optional / Genuinely good enough + Recommendation + Confidence.)*

## Must-Fix

| Finding | Why it matters | Required change |
|---|---|---|
| **Q4 / architecture: `AppTransaction.shared.environment` is not implementation-ready as written.** | The packet's Candidate 2 snippet treats `AppTransaction.shared.environment` as directly awaitable, but Apple's `AppTransaction` docs expose `shared` as a `VerificationResult<AppTransaction>` and `environment` as a property on the app transaction. Also, Apple's sandbox docs say both development-signed apps and TestFlight apps use the sandbox environment for StoreKit, so `.sandbox` is not strictly "TestFlight" detection. A sync `DistributionDetector.isTestFlight` also cannot call an async StoreKit API without preloading/caching. | Resolve Q4 before implementation. Either (a) use a correctly unwrapped async/cached `AppTransaction` detector and rename the predicate to something honest like `isStoreKitSandboxOrTestFlight`, accepting that Xcode/dev builds are suppressed too; or (b) use a true TestFlight-focused detector such as receipt path if the implementation specifically wants dev builds to show the prompt. Do not ship the current snippet or a sync protocol that hides async work. Sources checked: [Apple AppTransaction](https://developer.apple.com/documentation/storekit/apptransaction), [Apple sandbox testing](https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox). |
| **Q2: the profile-key field list is missing engine-relevant advanced fields.** | `AppState.toJSDictionary()` sends advanced fields when set: `seam`, `brim`, `build_plate`, `extruder_type`, `filament_condition`, and `ironing`. `engine.js` uses several of these to change output or warnings, especially seam, brim, build plate, extruder type, filament condition, and ironing. The proposed 12-field key can collapse materially different generated profiles into one engagement moment, which weakens the whole "distinct successful profile" premise. | Expand the profile key to include every state field that can materially affect engine output: the current 12 plus `seam`, `brim`, `buildPlate`, `extruderType`, `filamentCondition`, and `ironing`, normalised with explicit defaults/nil sentinels. Continue excluding `brand`; it is UI-only. Re-check `userLevel`: it is sent to the engine and affects at least beginner warnings/brim logic, so exclude it only if the packet deliberately defines "distinct profile" as slicer-output distinct rather than warning/checklist distinct. |
| **OutputView delayed request must be cancellation-bound to the view.** | The candidate integration launches a nested `Task` inside `.task`. That child task can continue after the user leaves `OutputView`, opens Feedback, resets the configurator, or otherwise changes context during the 2-second delay. That breaks the HIG "natural break" rationale and can burn a prompt on the wrong surface. | Keep the delay inside the view's structured `.task` flow, or store/cancel a task explicitly. Re-check eligibility after the 2-second sleep and before `requestReview()`, including current surface/no presented Feedback sheet if available. Only call `markReviewRequested()` when the request call is actually made. |
| **Q3: "critical warnings" needs a concrete source of truth before implementation.** | `PrintWarning` currently has no `critical` or severity field in Swift; only `ChecklistItem` has `critical`. The packet's proposed test says "critical-warning generation does not increment," but the architecture does not define how OutputView identifies critical warnings except by implicit examples or text. That invites brittle ID/string filtering. | Define the Q3 filter precisely before coding. Best low-scope version: "do not increment if `model.invalidSelection` is true or if the generated checklist has any `critical == true` item; additionally maintain an explicit allow/deny list only if specific warning IDs must block." If actual warning severity is needed, make that a deliberate engine/Swift contract change, not ad hoc text matching. |

## Should-Fix

| Finding | Why it matters | Suggested change |
|---|---|---|
| **`firstLaunchDate` is mutated inside a method documented as read-only.** | `isEligibleForReviewPrompt()` says read-only but writes `firstLaunchDate` when nil. More importantly, if this date is first set only after the 4th novel profile reaches eligibility evaluation, `days_since_first_launch >= 3` becomes "days since first eligibility check," not launch/install/update. | Add `registerLaunchIfNeeded()` or initialise the storage date at app start/service creation. Then make `isEligibleForReviewPrompt()` genuinely side-effect-free. Existing users can fairly start the clock on first launch after v1.0.3. |
| **Q1: 30-day local request cooldown is acceptable but a little loose for a three-per-year Apple quota.** | Apple suggests "at least a week or two"; 30 days satisfies that, but it still allows many local attempts inside a year if version gating changes later. Today same-version gating already dominates, so Q1 mostly matters across versions and silent suppressions. | Keep 30 days for v1.0.3, but document that same-marketing-version gating is the real hard stop. If 3dpa starts releasing frequent versions, revisit 90 or 122 days. |
| **Q5: opening FeedbackView alone is too broad a negative-sentiment signal.** | The app opens Feedback from multiple surfaces, including issue-reporting but potentially also praise or curiosity. A 14-day cooldown on mere open is safe but may suppress good candidates unnecessarily. | For v1.0.3, 14 days on open is acceptable. Better design if cheap: track `lastFeedbackSubmittedDate` separately and prefer submitted feedback over opened feedback; keep opened-feedback cooldown only if the view is launched from an error/report-issue context. |
| **Tests need one integration-level guard for the OutputView flow, not only service tests.** | The riskiest behavior is the view/service boundary: register once, delay, cancellation, no prompt on same key, no increment on critical/ineligible output. Pure service tests will not catch a badly placed `.task`. | Add at least one view-model or thin integration test around "same OutputView/task rerun does not double register/request" and one test for the Q3 gate source chosen above. If UI testing StoreKit is awkward, inject a `ReviewRequester` closure/protocol and assert it is called once. |

## Optional

| Finding | Notes |
|---|---|
| **Q6 persistent review link can stay deferred.** | Deferring the `action=write-review` link is fine for v1.0.3. It is additive, low-risk, and not needed to validate the automatic prompt design. Add later in Settings/About if review volume remains low. |
| **Hashing can stay readable rather than SHA.** | A sorted key-value string is better than a SHA for debugging and has no collision problem if values are escaped/canonicalised. Just make the serialisation unambiguous: stable field order, array sorting, explicit nil/default markers, and delimiter escaping or JSON encoding. |
| **Consider separating `ReviewEligibilityPolicy` from storage later.** | The current service is small enough. A separate pure policy object would make tests neat, but it is not required before v1.0.3 if DI remains clean. |

## Genuinely good enough

| Area | Ruling |
|---|---|
| **Alternative A rejected: launch-count heuristic.** | Correct rejection. Completed/distinct profile generation is much closer to 3dpa's value moment than launch count, and it aligns with Apple's completed-process sample. |
| **Alternative B rejected as default: HomeView trigger.** | OutputView + 2-second delay is the right default. HomeView is calmer, but it is further from the value moment and depends on the user navigating back. The cancellation-bound delay fix above handles the main interruption risk. |
| **Alternative C deferred: persistent link only.** | Correct. Persistent-link-only is too passive for the owner's stated goal; persistent link as later additive UI is fine. |
| **Alternative D rejected: defer to v1.0.4.** | Correct. The feature is small once Q2/Q3/Q4 are clarified, and this is exactly the kind of design-bearing packet the operating-model pilot is meant to test. |
| **Alternative E rejected: count every render.** | Correct rejection. Raw render count would let repeated `.task` runs or repeated same-profile visits fast-track eligibility. |
| **Alternative F rejected: drop FeedbackView cooldown.** | Correct rejection. Some cooldown is a cheap guard against asking recently unhappy users. |
| **Q7: use `MARKETING_VERSION` / `CFBundleShortVersionString`.** | Correct. `CFBundleVersion` changes per build and would create wrong per-build eligibility semantics. `AppConstants.appVersion` already reads the marketing version. |
| **UserDefaults persistence shape.** | `[String]` backing storage with a Set-like service API is good enough at this scale. No migration machinery is needed for v1.0.3 as long as key names are stable and namespaced. |
| **DI'd `ReviewPromptService` + no StoreKit dependency in unit tests.** | Good direction. It keeps Apple display behavior out of tests and lets the app test local policy deterministically. |

## Recommendation

Proceed with the feature after fixing Q2, Q3, Q4, and the OutputView task-cancellation shape. I would not roll back to launch-count, HomeView, persistent-link-only, or defer-to-v1.0.4. The strongest design change is to make the implementation slightly more honest about what it can know: count distinct engine-affecting states, define "critical" from an actual contract, and treat StoreKit sandbox/TestFlight detection as an async or explicitly cached dependency rather than a synchronous boolean shortcut.

## Confidence

High on the must-fix findings and on the recommendation to proceed after those changes. Medium on the exact Q1/Q5 durations because those are product-policy choices without project telemetry yet.

---

# Resolution

> **Status: Resolution drafted. Awaiting owner per-finding approval before implementation.**
>
> Verification done before drafting: `AppState.toJSDictionary()` (`AppState.swift:49–70`) confirms 6 missing advanced fields (`seam`, `brim`, `buildPlate`, `extruderType`, `filamentCondition`, `ironing`); `userLevel` is on line 61 (sent to engine) and consumed by `engine.js:1447` + `engine.js:1756` for beginner-mode output-affecting branches; `PrintWarning` (`EngineService.swift:25–31`) has no `critical` field while `ChecklistItem` (`:33–37`) does. All 4 Must-Fix claims independently verified before resolution.

## Must-Fix dispositions

### MF1 — Q4 `AppTransaction` detector implementation-readiness ✅ Accept

**Codex finding:** Sync `DistributionDetector.isTestFlight` cannot wrap async StoreKit; `AppTransaction.shared` returns `VerificationResult<AppTransaction>`, not `AppTransaction`; sandbox covers both Xcode dev AND TestFlight, so `.sandbox` is not strictly TestFlight detection.

**Disposition:** Accept fully. The packet's snippet was wrong on the type shape AND the semantic claim AND the sync/async mismatch.

**Resolution path — option (a):** async + cached AppTransaction-based detector with honest naming. Rationale:
- Deployment target is iOS 17+, so AppTransaction availability is fine.
- Semantic broadening is acceptable for our use case — we want the prompt suppressed in Xcode dev builds too (a developer iterating shouldn't fire it).
- Cache once at service init to avoid awaiting on every eligibility check.

**New protocol shape:**
```swift
protocol DistributionDetector {
    func isStoreKitSandboxOrTestFlight() async -> Bool
}

final class StoreKitDistributionDetector: DistributionDetector {
    private var cached: Bool?
    func isStoreKitSandboxOrTestFlight() async -> Bool {
        if let cached { return cached }
        do {
            let verification = try await AppTransaction.shared
            // Unwrap VerificationResult — for our purposes both .verified and .unverified
            // sandbox should suppress; we don't need to validate signature.
            let environment: AppStore.Environment? = {
                switch verification {
                case .verified(let txn):   return txn.environment
                case .unverified(let txn, _): return txn.environment
                }
            }()
            let result = (environment == .sandbox || environment == .xcode)
            cached = result
            return result
        } catch {
            // Conservative: if AppTransaction errors, assume sandbox (suppress prompt).
            cached = true
            return true
        }
    }
}
```

**Service eligibility check becomes async:**
```swift
@MainActor
func isEligibleForReviewPrompt() async -> Bool {
    if await distribution.isStoreKitSandboxOrTestFlight() { return false }
    // ... rest of conditions ...
}
```

**Owner decision needed:** confirm option (a) over option (b) (receipt-path TestFlight-strict detector). My lean is (a) for the reasons above.

---

### MF2 — Q2 profile-key field list incomplete ✅ Accept

**Codex finding:** Missing 6 advanced fields (`seam`, `brim`, `buildPlate`, `extruderType`, `filamentCondition`, `ironing`); `userLevel` likely should be re-included since engine reads it.

**Disposition:** Accept fully. Verified against `AppState.swift:49–70` and `engine.js`.

**Updated profile-key field list (19 fields, was 12):**
```
printer, material, nozzle,                                       (3 core)
useCase, surface, strength, speed,                                (4 goals)
environment, support, colors, special, profileMode,               (5 context)
userLevel,                                                         (1 — re-included; engine.js:1447, :1756 output-affecting)
seam, brim, buildPlate, extruderType, filamentCondition, ironing  (6 advanced)
```

**Updated `ProfileKeyHasher.hash()`:**
```swift
struct ProfileKeyHasher {
    static func hash(_ state: AppState) -> String {
        let parts: [String] = [
            "printer=\(state.printer)",
            "material=\(state.material)",
            "nozzle=\(state.nozzle)",
            "useCase=\(state.useCase.sorted().joined(separator: ","))",
            "surface=\(state.surface)",
            "strength=\(state.strength)",
            "speed=\(state.speed)",
            "environment=\(state.environment)",
            "support=\(state.support)",
            "colors=\(state.colors)",
            "special=\(state.special.sorted().joined(separator: ","))",
            "profileMode=\(state.profileMode ?? "safe")",
            "userLevel=\(state.userLevel)",
            "seam=\(state.seam ?? "_nil")",
            "brim=\(state.brim ?? "_nil")",
            "buildPlate=\(state.buildPlate ?? "_nil")",
            "extruderType=\(state.extruderType ?? "_nil")",
            "filamentCondition=\(state.filamentCondition ?? "_nil")",
            "ironing=\(state.ironing ?? "_nil")",
        ]
        return parts.joined(separator: "|")
    }
}
```

`_nil` sentinel keeps "field unset" deterministically distinct from any valid value.

**Reasoning for `userLevel` re-inclusion:** semantically "distinct successful profile generation" should mean *distinct value moment*. Beginner-mode at `engine.js:1447` triggers material-incompatibility warnings that don't fire in intermediate/advanced. A user who sets `userLevel: beginner` and gets a warning is experiencing a materially different output than the same physical printer/material combination at `userLevel: advanced`. Counting them as the same key would conflate two different value moments.

---

### MF3 — OutputView delayed task cancellation ✅ Accept

**Codex finding:** Nested `Task` inside `.task` escapes structured concurrency; can fire `requestReview()` after user navigates away (e.g. opens FeedbackView during the 2-second delay).

**Disposition:** Accept fully. Real SwiftUI gotcha.

**Updated OutputView integration:**
```swift
struct OutputView: View {
    @Environment(\.requestReview) private var requestReview
    @StateObject private var viewModel: OutputViewModel
    @EnvironmentObject private var reviewPromptService: ReviewPromptService

    var body: some View {
        // ... existing OutputView content ...
        .task {
            await viewModel.loadProfile(state: appState)
            await maybePromptForReview()  // structured: cancels with view exit
        }
    }

    private func maybePromptForReview() async {
        // Gate 1: profile rendered cleanly (Q3 critical-gate handled inside)
        guard viewModel.profileRenderedSuccessfully,
              !viewModel.invalidSelection,
              !viewModel.checklist.contains(where: { $0.critical }) else { return }

        // Gate 2: register profile generation (idempotent on duplicate key)
        let keyHash = ProfileKeyHasher.hash(appState)
        let isNovel = reviewPromptService.registerSuccessfulProfileGeneration(keyHash: keyHash)
        guard isNovel else { return }

        // Gate 3: pre-delay eligibility
        guard await reviewPromptService.isEligibleForReviewPrompt() else { return }

        // 2-second delay (Apple-prescribed); structured concurrency cancels with view
        try? await Task.sleep(for: .seconds(2))
        guard !Task.isCancelled else { return }

        // Gate 4: re-check eligibility post-sleep (FeedbackView could have opened mid-delay)
        guard await reviewPromptService.isEligibleForReviewPrompt() else { return }

        // Fire request + mark consumed (StoreKit display-or-not is unobservable)
        await requestReview()
        reviewPromptService.markReviewRequested()
    }
}
```

**Key changes vs original packet:**
- `maybePromptForReview()` runs INSIDE the `.task` flow (not nested `Task { ... }`). Auto-cancels with view.
- `Task.isCancelled` check post-sleep.
- Eligibility re-checked post-sleep so a mid-delay FeedbackView open suppresses the prompt.
- `markReviewRequested()` called only after `requestReview()` actually fires (not on early-returns).

---

### MF4 — Q3 critical-warnings source of truth ✅ Accept (low-scope option)

**Codex finding:** `PrintWarning` has no `critical` / severity field; only `ChecklistItem` does. Packet's "critical-warning generation does not increment" was undefined.

**Disposition:** Accept; use Codex's low-scope option (a). No engine contract change.

**Resolution wording for Q3:**
> A profile generation is **excluded** from `distinct_successful_profile_generations` counting if EITHER:
> - `OutputViewModel.invalidSelection == true` (engine refused to produce profile), OR
> - any item in `OutputViewModel.checklist` has `critical == true`.
>
> No `PrintWarning.critical` field is added. Severity-aware warning gating is deferred (would be an engine contract change; out of v1.0.3 scope).

**Implementation:** baked into `MF3`'s `maybePromptForReview()` gates (the `viewModel.invalidSelection` and `viewModel.checklist.contains` checks gate registration before counting).

**Future enhancement (out of scope for v1.0.3):** if real warning severity becomes valuable, add `PrintWarning.severity: .info | .warning | .critical` as a deliberate engine contract change with corresponding `engine.js` tag emissions. Filed as IR-5 followup candidate.

---

## Should-Fix dispositions

### SF1 — `firstLaunchDate` mutation in read-only method ✅ Accept

**Disposition:** Accept. Initialise `firstLaunchDate` on app start, not lazy on first eligibility check.

**Implementation:** add `registerLaunchIfNeeded()` to `ReviewPromptService`, call from `App.init()` or `@main`'s startup:

```swift
@main
struct PrintAssistantApp: App {
    @StateObject private var reviewPromptService = ReviewPromptService(...)

    init() {
        reviewPromptService.registerLaunchIfNeeded()
    }
    // ...
}

// In ReviewPromptService:
func registerLaunchIfNeeded() {
    if storage.firstLaunchDate == nil {
        storage.firstLaunchDate = clock.now
    }
}
```

`isEligibleForReviewPrompt()` becomes genuinely side-effect-free.

---

### SF2 — Q1 30-day cooldown justification ✅ Accept; document

**Disposition:** Keep 30 days for v1.0.3. Document that same-marketing-version gating is the real hard stop, with the local cooldown as a secondary defense for cross-version scenarios.

**Architectural note:** since 3dpa releases versions roughly monthly (v1.0.0 → v1.0.2 in 8 days, v1.0.3 ~3 weeks later), same-version gating is the dominant constraint. The 30-day cooldown becomes meaningful only if (a) version cadence slows, or (b) AppStore review cycles delay versions. Revisit at v1.0.5+ if cadence patterns shift.

---

### SF3 — Q5 FeedbackView cooldown breadth ✅ Accept principle; defer separate-tracking to v1.0.4

**Disposition:** For v1.0.3, keep 14-day cooldown on FeedbackView open (broad but cheap signal). Separate `lastFeedbackSubmittedDate` tracking is additive — defer to v1.0.4 when richer telemetry around feedback flow lands (analytics is item 4 of the v1.0.3 batch, but its data shape isn't decided yet).

**Filed as v1.0.4 candidate:** track `lastFeedbackOpenedDate` AND `lastFeedbackSubmittedDate` separately; prefer submitted as the negative-sentiment signal once analytics is in place.

---

### SF4 — Integration test for OutputView flow ✅ Accept

**Disposition:** Add 2 view-level integration tests beyond the 7 service-level unit tests. Total iOS XCTest count: 46 → 55 (+9).

**New tests:**

8. **`OutputViewIntegration.testTaskRerunDoesNotDoubleRegister`** — render OutputView with state X, force `.task` re-trigger via lifecycle change, assert `registerSuccessfulProfileGeneration` was called exactly once for the same `keyHash`. Mock `ReviewPromptService` via DI.

9. **`OutputViewIntegration.testCriticalWarningsBlockEligibility`** — render OutputView with state that produces `invalidSelection == true` (or `checklist` containing `critical == true`); assert `registerSuccessfulProfileGeneration` is NOT called.

**Test harness:** inject `ReviewRequester` closure protocol so StoreKit doesn't get called from XCTest:

```swift
protocol ReviewRequester {
    func requestReview() async
}
```

Production wraps `@Environment(\.requestReview)`; tests use a mock that records calls.

---

## Optional dispositions

| Item | Disposition |
|---|---|
| **O1** — Q6 persistent link deferred | ✅ Confirmed. Defer to v1.0.4 or beyond. |
| **O2** — Hashing readable rather than SHA | ✅ Confirmed. Sorted key-value with `_nil` sentinel + `\|` delimiter is unambiguous at hobbyist scale. |
| **O3** — Separate `ReviewEligibilityPolicy` later | ✅ Acknowledged. Not required for v1.0.3; revisit if service grows past ~150 LoC. |

## Genuinely good enough — confirmations noted

All 8 of Codex's "good enough" rulings noted as validating prior calls:
- Alternative A (launch-count) rejection ✓
- Alternative B (HomeView default) rejection ✓
- Alternative C (persistent link only) deferral ✓
- Alternative D (defer v1.0.4) rejection ✓
- Alternative E (raw render count) rejection ✓
- Alternative F (drop FeedbackView cooldown) rejection ✓
- Q7 `MARKETING_VERSION` ✓
- UserDefaults `[String]` storage shape ✓
- DI'd `ReviewPromptService` direction ✓

## Net delta into implementation

**Architecture changes (vs original packet):**
1. `DistributionDetector` becomes async + cached + renamed to `StoreKitDistributionDetector` with `isStoreKitSandboxOrTestFlight()` predicate (MF1).
2. `isEligibleForReviewPrompt()` becomes async + side-effect-free (MF1 + SF1).
3. `ReviewPromptService` gains `registerLaunchIfNeeded()` called from `@main` init (SF1).
4. `ProfileKeyHasher.hash()` covers 19 fields (MF2).
5. `OutputView.maybePromptForReview()` runs inline in structured `.task`, with post-sleep `Task.isCancelled` + eligibility re-check + critical-gate via `invalidSelection` / `checklist.critical` (MF3 + MF4).

**Test count:** 46 → 55 (+9 = 7 service unit + 2 view-level integration).

**Persistence keys (final):**
```
rps.firstLaunchDate              — Date (set on first launch)
rps.lastVersionPromptedForReview — String? (CFBundleShortVersionString)
rps.lastPromptRequestDate        — Date? (set unconditionally after requestReview)
rps.lastFeedbackOpenedDate       — Date? (set when FeedbackView opens)
rps.distinctProfileKeyHashes     — [String] (Set-like via array)
```

**Open packet questions — final state:**

| Question | Disposition |
|---|---|
| Q1 (cooldown duration) | 30 days (SF2) |
| Q2 (profile-key fields) | 19 fields per MF2 |
| Q3 (critical-warnings filter) | low-scope: `invalidSelection` + checklist `critical` (MF4) |
| Q4 (TestFlight detector) | async cached AppTransaction with sandbox-or-xcode predicate (MF1, owner-confirm option (a)) |
| Q5 (FeedbackView cooldown) | 14 days on open; separate-tracking deferred (SF3) |
| Q6 (persistent link) | Deferred (O1) |
| Q7 (`MARKETING_VERSION`) | Confirmed |
| Q8 (distinct-or-every-render) | Distinct via Q2's hashing |

**Out of scope for v1.0.3 (carried forward):**
- 2024–2026 App Store rejection examples.
- Uninstall-threat anti-pattern.
- Persistent "Write a review" link.
- `PrintWarning.severity` engine contract change.
- `lastFeedbackSubmittedDate` separate tracking.
- Receipt-path TestFlight detector (alternative to MF1's option (a)).

## Owner decisions needed before implementation

1. **MF1 option (a) vs (b):** confirm async cached AppTransaction with broadened semantic ("sandbox or xcode" suppresses prompt) over receipt-path TestFlight-strict detector. My lean: (a).
2. **MF2 `userLevel` inclusion:** confirm semantic interpretation of "distinct profile" as warning-distinct (include) vs slicer-output-distinct (exclude). My lean: include — beginner-mode warnings are part of the value moment.

Both are judgment calls on top of accepted findings; otherwise everything in this Resolution is implementation-ready.

## Implementation sequence (post-owner-approval)

Single PR per the operating model's "research-then-Codex-then-implement" sequence:

1. New file: `Services/ReviewPromptService.swift` (service + protocols + DI shape).
2. New file: `Services/StoreKitDistributionDetector.swift` (async cached AppTransaction).
3. New file: `Models/ProfileKeyHasher.swift` (19-field hashing).
4. Modify: `App.swift` / main app file (init `reviewPromptService.registerLaunchIfNeeded()`).
5. Modify: `OutputView.swift` (`.task` + `maybePromptForReview()`).
6. Modify: `OutputViewModel.swift` (expose `profileRenderedSuccessfully` if not already; `invalidSelection` + `checklist` already exist).
7. New tests: `ReviewPromptServiceTests.swift` (7 cases) + `OutputViewIntegrationTests.swift` (2 cases).
8. Locale: no new strings needed (StoreKit owns prompt UI; no app-side localisation).

Estimated: ~200 LoC (was ~150; +50 for the 6 advanced fields, async detector, structured `.task` flow, registerLaunchIfNeeded). 9 new tests.

Walkthrough harness: no engine.js or data changes → unchanged. iOS XCTest 46 → 55 expected pre-push.

---

## Final Resolution status

Resolution drafted; awaiting owner sign-off on the 2 decision points above. After approval, implementation lands as a single PR on `ai/operating-model-pilot` (or `main` per owner's branching preference at that point), unblocked by Codex pass 5's design review.

Pilot evaluation (2026-05-14) gets this Resolution as evidence of the operating model's value: 5 Codex passes (1 + 1 pre-execution + 2 milestone reviews + 1 full design review) + 1 Gemini pass on a single feature, producing a verified-against-primary-sources design with 4 caught-before-implementation Must-Fix bugs (Q4 type errors, Q2 missing fields, MF3 task escape, MF4 undefined contract).
