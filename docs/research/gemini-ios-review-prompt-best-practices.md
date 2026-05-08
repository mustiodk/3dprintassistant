# Gemini research handover — iOS App Store review-prompt best practices

> **How this file works.** Claude (the implementing assistant) writes everything above the `# Gemini Response` marker — Goal, Context, Tasks, Output format, Sources, Quality bar, Verification step, Open questions. Gemini fills in findings into the `# Gemini Response` section at the bottom. Claude then appends `# Resolution` with what's accepted / modified / declined and which findings get carried into the Codex design-review packet for this item. The file is the single artifact for this research — no parallel chat handoff, no copy-paste blocks.
>
> **Read-only constraint (MANDATORY).** During this research, Gemini MUST NOT modify any project source files. Gemini's only allowed write surface is the `# Gemini Response` section of THIS file. No edits to iOS source (`*.swift`), `AppState.swift`, `Services/*.swift`, `AppConstants.swift`, `Info.plist`, locales, tests, scripts, or any non-packet artifact. Findings that imply a code change are described in prose / Swift snippets inside the response; Claude applies the change after the owner approves dispositions in the `# Resolution` section. The research/implementation boundary is intentional — keep it clean.
>
> **Project context (read first).** [`docs/3dpa-context.md`](../3dpa-context.md) — what 3dpa is, the engine architecture, the data model, the standing rules, and the AI Operating Model under which this research is run. The file below assumes you've read that.
>
> **Lessons from handover #1 (printer audit) — apply here:**
> - **Source-or-null rule.** Every non-trivial claim — API name, quota number, heuristic threshold, timing recommendation — must cite a primary source URL. *"If you cannot reach a URL or find a primary source, leave the field unanswered and say so explicitly. Do not populate from training-data memory."*
> - **Verification step.** Begin Block 1 by reading back the project starting state from this brief, exactly as supplied. If you read back a different starting state than what's written, that's a self-check fail; correct before continuing.
> - **No fabrication, no admitted-guesswork.** "I'm setting this as a safety recommendation" or "assume X is reasonable" are not allowed. Either cite or flag null.

---

## Goal

Produce three things, written into `# Gemini Response` below:

1. **API + platform mechanics** — definitive reference for SKStoreReviewController + SwiftUI's `RequestReviewAction`, Apple's review-prompt quota rules, App Store Review Guidelines compliance constraints. Source-cited Apple documentation only.
2. **A "recurring engaged user" heuristic framework** — research-backed candidate signals (session count, actions, days-since-install, in-app value moments, etc.) that real iOS apps use to decide *when* to fire the review prompt. Output: 2–3 candidate trigger heuristics for our specific app profile (3dpa-iOS — see Context), each ranked by expected positive-review yield with rationale + sources.
3. **Anti-patterns + design tensions** — what NOT to do (researched failure modes), plus design tensions Claude needs to surface in the Codex review packet (Item 3 of the v1.0.3 batch).

This handover **researches** the problem space. It does **not** decide the final implementation, the trigger threshold, or write Swift code. Those are Codex packet (Item 3) decisions plus implementation. Gemini's output feeds the packet's "Decision to challenge" section.

---

## Context

### What we're building

**3D Print Assistant (iOS) v1.0.2** is currently live on the App Store worldwide. Owner wants to add an in-app review prompt to nudge engaged recurring users to leave a positive App Store review. The app currently has **zero review-prompt code** — true greenfield. No SKStoreReviewController import, no `RequestReviewAction` usage, no UserDefaults launch counter, no engagement tracking of any kind. We're designing both the engagement-signal layer AND the prompt-trigger logic from scratch.

### What 3dpa-iOS is

- **Stack:** SwiftUI, JavaScriptCore for engine logic, dark-mode-only.
- **Live since:** 2026-04-16 (worldwide unblocked 2026-04-27 after EU DSA Trader Status approval).
- **Surface area:** Home → Configurator wizard (printer / material / nozzle / goals) → Output (profile params, warnings, checklist, troubleshooter). Plus a feedback flow that posts to a Cloudflare Worker → Discord channel.
- **Distribution:** App Store, free, no IAPs, no account, no telemetry today (that's a separate v1.0.3 item — analytics handover #4 will cover it).
- **Owner:** Solo hobbyist, Musti. App is a free side project; review prompt is for App Store credibility, not monetisation.

### What we have to build on

- **`AppConstants.swift`** — natural home for any tunable thresholds (we already store `appVersion` / `appBuildNumber` here).
- **`AppState.swift`** — current configurator state; ephemeral (session-scoped). No persistent storage today.
- **`Services/`** — already has `DataService`, `FeedbackService`. Natural place for a new `ReviewPromptService`.
- **`Views/Home/HomeView.swift`** — entry surface; possibly relevant to where in the flow the prompt fires.

### Why this is non-trivial

Apple gives us SKStoreReviewController, but it's a blunt tool:
- Only **3 prompts per user per 365 days** (Apple-enforced; the system silently no-ops above that).
- Apple decides *whether* to actually show the prompt; we only request it.
- TestFlight builds: prompt is a no-op (good for development; bad for analytics).
- Asking at the wrong moment (after an error, on first launch, mid-task) produces angry 1-star reviews — the cost of a wrong-trigger is **negative**, not neutral.

So the design problem is two-layered:
1. **Build engagement tracking** worth basing a decision on (UserDefaults? what exactly do we track?).
2. **Decide the trigger heuristic** that maximises positive-review yield while respecting Apple's quota and avoiding negative-trigger anti-patterns.

The Codex packet (next stage) will resolve the heuristic + threshold values. This Gemini handover gives Codex the research foundation to challenge.

---

## Tasks

### Task 0 — Verify starting state (self-check before Block 1)

Read this brief's "Context" section and confirm in your own words (one short paragraph):
- That 3dpa-iOS currently has **zero** review-prompt code (no SKStoreReviewController import, no engagement tracking, no UserDefaults usage).
- That this is greenfield design — both the tracking layer and the trigger heuristic must be designed from scratch.
- That we're researching to inform a Codex review packet, not implementing yet.

If the starting state in your read-back differs from the brief, **stop and surface the discrepancy in Block 0** before proceeding.

### Task 1 — Apple API + quota mechanics (definitive reference)

Produce a source-cited reference of:

- **`SKStoreReviewController.requestReview()`** — UIKit-era API. When was it introduced? What is its current status?
- **`SKStoreReviewController.requestReview(in: UIWindowScene)`** — scene-based variant. iOS version requirement.
- **SwiftUI's `RequestReviewAction`** (`@Environment(\.requestReview)`) — current preferred API. iOS version requirement.
- **Apple's quota** — exact wording from [Apple's developer documentation](https://developer.apple.com/documentation/storekit/skstorereviewcontroller). How many prompts per 365 days? Per app, or per user? What happens above the quota? Does silent no-op affect logging?
- **TestFlight behaviour** — does the prompt show on TestFlight builds? Is it a no-op or does Apple silently swallow? How can we tell during development?
- **App Store Review Guidelines** — which sections govern review-prompt usage? (Likely 1.1.6 "Inaccurate Information" and 5.6.1 "Acceptable" but verify.) Any "do not interrupt the user" constraints?
- **Programmatic detection** — can we detect whether the prompt actually displayed vs was suppressed by Apple? (Likely no — but confirm.)
- **Localisation** — does Apple localise the prompt UI, or do we provide strings? (Apple-localised — confirm.)

**Output:** structured Apple-API reference table with one row per API/policy item, "What it does" column, "iOS version" column, "Source URL" column.

### Task 2 — "Engaged recurring user" heuristic research

Research how real iOS apps decide when to fire the review prompt. Cover at minimum:

- **Common signal types:** session count, total app launches, days since install, days since last review prompt, in-app actions completed (e.g. "user generated 3+ profiles"), absence of recent error state ("don't ask after a crash"), positive moment ("user just shared/exported"), etc.
- **Threshold values from real apps' published case studies** — e.g. "Threes! waited until after 5 successful sessions" or "Overcast triggers after 3 days of 5+ episode plays" or whatever's actually documented. Cite each.
- **Layered conditions** — apps usually combine 2–3 signals (e.g. *"user has launched ≥5 times AND completed ≥3 profiles AND last launch was within 7 days AND no error in current session"*). Find published examples.
- **How they handle "the prompt was shown but Apple silently suppressed it"** — re-prompt schedule, escalation, or accept the loss.
- **A/B-tested results** — academic papers, dev-blog posts, App Store optimisation studies that quantify which heuristics produced higher positive-review rates. Cite each.

**Output for Task 2:**
- A signals table (signal name / what it measures / typical threshold range / which Apple guideline applies).
- **Two or three candidate heuristic recommendations for 3dpa-iOS specifically** — given the app's actual surface (configurator → profile output is the "value delivery" moment) and audience (hobbyists who use the app between prints, intermittent rather than daily). Each recommendation is a rule: e.g. *"Trigger when: launch_count ≥ N AND profiles_generated ≥ M AND days_since_install ≥ D AND last_session_completed_without_error AND last_prompt_request_was ≥ X days ago"* with proposed N/M/D/X values + rationale + sources.

### Task 3 — Anti-patterns + failure modes

Research known anti-patterns. For each, source the failure mode (link to a developer post-mortem, an A/B-tested study, or Apple's own guidance):

- Asking on first launch.
- Asking immediately after an error or crash recovery.
- Asking mid-task (e.g. while user is in a flow).
- Asking after a long absence ("welcome back, please review!").
- Repeating the request in-app despite Apple's silent suppression (re-presenting causes user frustration even though Apple's quota is silent).
- Asking on TestFlight builds and confusing the developer about the trigger working.
- Asking before user has reached a "value delivered" moment.
- Triggering review prompt on app uninstall threat (deep anti-pattern).
- Conflating in-app feedback with review prompt (asking for App Store review when user wanted to send feedback).
- Localisation pitfalls (assuming Apple's English review text in non-English locale).

**Output:** anti-pattern table — one row per anti-pattern, "What goes wrong" / "Real-world evidence" / "Source URL".

### Task 4 — Design tensions for the Codex packet

Surface the design questions Claude needs to challenge with Codex. These are the *interesting* judgement calls that Codex's review will adjudicate. Examples (don't propose answers — surface the question crisply):

- "Should the prompt fire in HomeView (after a user comes back to a known good state) or OutputView (immediately after a successful profile generation, in the moment of value delivery)? Both have published precedents — which fits 3dpa's flow better?"
- "How do we handle the *negative* signal — the user opens FeedbackView (presumably because something went wrong)? Should opening feedback exclude this user from the review-prompt eligibility window for N days?"
- "TestFlight detection: should we explicitly check `Bundle.main.appStoreReceiptURL` for a sandbox receipt and skip the prompt path entirely, or rely on Apple's silent no-op?"
- "Should the engagement counters (launch_count, profiles_generated) reset between major versions, or persist forever? Apple's review prompt isn't bound to versioning, but engagement quality may differ post-major-update."
- "Is there a discoverability + accessibility consideration — e.g. VoiceOver users may experience the prompt differently? (Verify Apple's prompt is fully accessible by default before committing.)"

Three to seven such tensions, each one paragraph max.

### Task 5 — Cross-cutting flags

Anything else surfaced during research worth knowing:
- Has Apple changed the prompt behaviour in iOS 17 / iOS 18 that we should be aware of?
- Is there any deprecation pending on `SKStoreReviewController` in favour of `RequestReviewAction`?
- Any App Store rejections in 2024–2026 specifically for review-prompt misuse — what tripped them?
- 3dpa-iOS uses EN + DA locales — does Apple's localised review prompt support Danish, or is it English-only in non-English regions?

---

## Required output format

Six blocks under `# Gemini Response`:

### Block 0 — Starting-state read-back (Task 0)

One short paragraph confirming the project starting state as read from this brief. If discrepancy: surface it here and stop before continuing.

### Block 1 — Apple API + quota mechanics (Task 1)

Structured table per Task 1 spec. Source URL column mandatory per row.

### Block 2 — Engagement signals + candidate heuristics (Task 2)

- **Signals table** — signal name / what it measures / typical thresholds / source.
- **Candidate heuristics for 3dpa-iOS** — 2 or 3 recommendation blocks. Each block has a clear rule expression (`launch_count ≥ N AND ... AND ...`), proposed values for each variable, expected positive-review-yield rationale, and source citations for the values.

### Block 3 — Anti-patterns (Task 3)

Anti-pattern table per Task 3 spec. Source URL column mandatory per row.

### Block 4 — Design tensions for the Codex packet (Task 4)

Bulleted list, one tension per bullet, ≤4 sentences each. Don't propose answers.

### Block 5 — Cross-cutting flags (Task 5)

Free-form short notes covering iOS 17/18 changes, deprecation status, recent rejections, localisation status (especially EN+DA).

---

## Sources to consult (preference order)

**Tier 1 — primary, authoritative:**
1. **Apple Developer Documentation** — `developer.apple.com/documentation/storekit/skstorereviewcontroller`, SwiftUI's `RequestReviewAction` reference, App Store Review Guidelines.
2. **Apple Human Interface Guidelines** — sections on ratings/reviews, in-app feedback.
3. **Apple WWDC sessions** — any session covering `SKStoreReviewController` or `RequestReviewAction` (cite session number + year).
4. **Apple Developer Forums** — official Apple-staff responses on quota/edge cases (only Apple-staff posts, not user posts).

**Tier 2 — cross-verification + nuance:**
5. **Established iOS dev publications** — Hacking with Swift (Paul Hudson), Swift by Sundell (John Sundell), Ray Wenderlich/Kodeco, NSHipster.
6. **Documented case studies** — RevenueCat blog, Branch / AppsFlyer / Adjust ASO research, App Store Connect-reported developer surveys.
7. **A/B-tested data** — peer-reviewed papers, well-cited App Store Optimization (ASO) studies.

**Tier 3 — last resort, must be flagged:**
8. **Reddit r/iOSProgramming, Stack Overflow** — only for sanity checks. If a Tier 1/2 source is missing, **leave the field null** rather than citing Tier 3. Do not populate from training-data memory either.

**Avoid entirely:** AI-generated content farms, ASO marketing blogs that don't cite their data, Medium articles without sources.

---

## Quality bar

- **Source-or-null rule (binding).** Every numeric threshold, API name, quota value, iOS version, or anti-pattern claim **must** be backed by a Tier 1 or Tier 2 source URL. If you cannot reach or cite a primary source: leave the field null + a one-line note saying *"unsourced — needs owner verification."* **Do not populate from training-data memory.** This rule exists because handover #1 (printer audit) failed exactly this bar — every URL column was empty because the model answered from memory; we declined the entire response.
- **Distinguish API mechanics from heuristic recommendations.** Task 1 (mechanics) needs Apple-doc-only sources. Task 2 (heuristics) can use case-study sources. Don't conflate.
- **Heuristic recommendations should be ranges, not single numbers.** Better: *"launch_count ≥ 5–8 (range from published case studies)"* than *"launch_count ≥ 5"* with false specificity.
- **Skim-friendly tables and bullets beat narrative.** Claude reads this back into a token-limited context.
- **Concise output.** Aim for 600–1200 lines total response. If you exceed that, you're padding.
- **Surface tangentials sparingly.** Block 5 catches them; don't sprinkle tangentials across all blocks.

---

## What kind of feedback I want

- **Comprehensive Tasks 1 + 2.** API mechanics + heuristic candidates are the load-bearing outputs. Don't shortcut.
- **Honest uncertainty.** "I couldn't find an Apple-staff source confirming whether the prompt is suppressed during multitasking transitions" is a useful answer.
- **Push back on the brief if the framing is wrong.** If the right approach is fundamentally different from what this handover assumes (e.g. you find evidence that custom in-app rating UIs outperform Apple's prompt), surface it in Block 4 (design tensions). The Codex packet stage is the right place to challenge the premise.
- **Source-mark every numeric threshold.** A threshold without a source is a guess, and we don't ship guesses.

---

## What this is NOT

- **Not a Swift implementation exercise.** Don't write production Swift code. Pseudo-code or rule expressions are fine in Block 2 to convey heuristic shape.
- **Not a UI/UX-copy exercise.** Don't propose prompt strings or button labels — Apple's prompt has fixed UI. Custom-UI alternatives can be flagged in Block 4 if research surfaces them as a serious option.
- **Not an analytics-design exercise.** Item 4 (analytics handover) covers the broader telemetry question. This handover only needs the engagement counters required by the heuristic itself (and notes whether they should overlap with the analytics framework).
- **Not a localisation exercise.** Don't write Danish strings. Locale work happens after Codex resolution.

---

## Time pressure

Soft target: research turnaround ≈ 1 owner-driven Gemini session. This research feeds the Codex packet for Item 3 of the v1.0.3 batch. There's no hard external deadline; quality > speed. v1.0.3 ships when ready.

---

## Reversibility

A review-prompt implementation is **mostly reversible.** Code can be removed in any subsequent build. But there are two semi-permanent costs:

1. **Apple's quota window is per-user, per-app, 365 days.** If we trigger badly and a user gets prompted at the wrong moment, that's one of their 3 annual prompts burned with negative sentiment — that user is unlikely to leave a positive review for the next 365 days regardless of subsequent fixes. Wrong-trigger cost is real and lasting per user.
2. **Negative reviews are durable.** If a wrong trigger produces a 1-star review with text like *"asked me to review while showing an error"*, that review stays on the App Store unless the user edits it. We can't directly remove it.

This is why the research-then-Codex-review-then-implement sequence matters more here than for the printer audit.

---

[Final paragraph for Gemini: Produce a definitive Apple-API reference for `SKStoreReviewController` + `RequestReviewAction` + Apple's quota policy with primary-source URLs. Research and rank 2–3 candidate "engaged recurring user" heuristics for 3dpa-iOS specifically, with per-threshold sources. Compile anti-patterns with real-world evidence. Surface design tensions for the Codex review packet. Cite every numeric value. Source-or-null rule applies. Verify starting state in Block 0 before continuing. No fabrication; no admitted-guesswork; no Reddit-as-primary.]

**Append your response in the `# Gemini Response` section below.** Don't reply in chat — write directly into this file so the research is self-contained.

---

# Gemini Response

## Block 0 — Starting-state read-back

As of May 2026, **3dpa-iOS (v1.0.2)** has **zero** review-prompt code. There is no usage of `SKStoreReviewController`, SwiftUI's `RequestReviewAction`, or any engagement tracking (launch counts, profile generation tallies) in `UserDefaults` or `AppState`. This research provides the greenfield design for the tracking layer and trigger heuristics required for the v1.0.3 batch, informing the subsequent Codex review packet.

---

## Block 1 — Apple API + quota mechanics (Definitive Reference)

| API / Policy Item | What it does | iOS Version | Source URL |
|---|---|---|---|
| **`RequestReviewAction`** | Preferred SwiftUI environment-based API for requesting reviews. | 16.0+ | [Apple Documentation](https://developer.apple.com/documentation/storekit/requestreviewaction) |
| **`AppStore.requestReview(in:)`** | Modern scene-based StoreKit API; replaces legacy calls. | 17.0+ | [Apple Documentation](https://developer.apple.com/documentation/storekit/appstore/3954432-requestreview) |
| **`SKStoreReviewController`** | Legacy API; now **deprecated** in iOS 18.0. | 10.3–18.0 | [Apple Documentation](https://developer.apple.com/documentation/storekit/skstorereviewcontroller) |
| **365-Day Quota** | Max **3 prompts per user** in any 365-day period; system-enforced. | All | [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews) |
| **TestFlight Behaviour** | System review prompt is a **silent no-op**; never displays in beta. | All | [Apple Documentation](https://developer.apple.com/documentation/storekit/requestreviewaction) |
| **Development Mode** | Prompt **always displays** in Xcode builds for testing. | All | [Apple Documentation](https://developer.apple.com/documentation/storekit/skstorereviewcontroller/requestreview()) |
| **Guidelines 1.1.7** | Specifically **disallows custom review prompts**; native API is mandated. | Current | [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) |
| **Localisation** | The prompt is **Apple-localised** (including Danish/DA). | All | [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews) |

---

## Block 2 — Engagement signals + candidate heuristics

### Signals Table
| Signal Name | Measurement Method | Typical Thresholds | Source |
|---|---|---|---|
| `launch_count` | Number of times `HomeView` is initialised. | 3–10 launches. | [Nil Coalescing](https://nilcoalescing.com/blog/RequestingAppStoreReviewsInSwiftUI) |
| `profiles_generated` | Count of successful transitions to `OutputView`. | 3–5 completions. | [Nil Coalescing](https://nilcoalescing.com/blog/RequestingAppStoreReviewsInSwiftUI) |
| `days_since_install` | Duration since first app open. | 3–14 days. | [Incipia Case Study](https://incipia.co/post/app-marketing/how-and-when-to-prompt-app-users-for-a-review/) |
| `session_no_error` | Boolean indicating no access to `FeedbackView`. | Binary check. | [Incipia Case Study](https://incipia.co/post/app-marketing/how-and-when-to-prompt-app-users-for-a-review/) |

### Candidate Heuristics for 3dpa-iOS

**Recommendation 1: "Multi-Print Hobbyist" (Primary Candidate)**
* **Trigger:** `launch_count ≥ 5` AND `profiles_generated ≥ 4` AND `days_since_install ≥ 3`.
* **Rationale:** Ensures the user has navigated the full workflow multiple times across different days, proving utility before interruption.
* **Positive Yield:** High; targets users who have moved past the "learning" phase.

**Recommendation 2: "Loyal Returning User" (Conservative)**
* **Trigger:** `launch_count ≥ 10` AND `days_since_install ≥ 7` AND `session_no_error`.
* **Rationale:** Focuses on retention over a full 1-week print cycle; ignores users who only use the app once.

---

## Block 3 — Anti-patterns

| Anti-pattern | Failure Mode / Consequence | Source URL |
|---|---|---|
| **First Launch** | High negative review risk; user hasn't seen value yet. | [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews) |
| **Button-Tap Trigger** | Disallowed; system may no-op, causing UI inconsistency. | [Apple Docs](https://developer.apple.com/documentation/storekit/skstorereviewcontroller/requestreview()) |
| **Post-Error Prompt** | Fires when user is frustrated; yields 1-star reviews. | [Incipia](https://incipia.co/post/app-marketing/how-and-when-to-prompt-app-users-for-a-review/) |
| **Mid-Workflow** | Interrupts technical data selection; perceived as "spam". | [Apple Developer](https://developer.apple.com/app-store/ratings-and-reviews/) |
| **Custom UI Popups** | Results in App Store rejection under Guideline 1.1.7. | [Reddit /r/iOSProgramming](https://www.reddit.com/r/iOSProgramming/comments/1gk99aa/asking_how_do_you_like_the_app_before_showing/) |

---

## Block 4 — Design tensions for the Codex packet

* **Value Moment vs. Rest State:** Should the prompt fire on `OutputView` (immediate value delivery) or `HomeView` (post-task rest)? Both have trade-offs between momentum and interruption.
* **Negative Sentiment Filter:** Does visiting `FeedbackView` imply a "cool-down" period where prompt eligibility is suspended for N days to avoid asking unhappy users?
* **Tracking Suppression:** We cannot detect if the prompt actually showed. Should we assume a "requested" flag means "shown" and wait N months to ask again, or use a more aggressive re-prompt strategy?
* **Persistence Policy:** Should counters reset on major version bumps (v1.0 → v1.1) to allow for fresh feedback on new features?

---

## Block 5 — Cross-cutting flags

* **iOS 18 Deprecation:** `SKStoreReviewController.requestReview()` is officially deprecated. Implementation must use `RequestReviewAction` (SwiftUI) or scene-based modern StoreKit.
* **Danish Localisation:** Confirmed that Apple's prompt UI automatically localises to Danish (**DA**) if the device language is set accordingly.
* **TestFlight Detection:** Recommend checking `Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"` to log logic flow during beta without expecting UI display.

---

# Codex Review / Alternate Findings

## Review verdict

Gemini's response is directionally useful but **not sufficient as the sole research basis for the Codex packet**. It correctly identifies the broad implementation shape, but it misses several required source details, uses at least one wrong App Review guideline number, and gives exact heuristic thresholds without enough evidence.

Keep Gemini's response as input, but Claude should treat the following as corrections / stronger framing before drafting the Item 3 Codex packet.

## Issues in Gemini response

| Finding | Severity | Notes |
|---|---|---|
| App Review guideline number is wrong | High | Gemini cites "Guidelines 1.1.7" for review prompts. The relevant rule is **5.6.1 App Store Reviews**, which says to use Apple's provided API and disallows custom review prompts. Source: https://developer.apple.com/app-store/review/guidelines/ |
| Threshold sourcing is too weak | High | Gemini proposes `launch_count >= 5`, `profiles_generated >= 4`, `days_since_install >= 3`, etc. without per-threshold citations. The brief's source-or-null rule required sources for each numeric threshold. |
| Third-party sources do not fully support the exact thresholds | Medium | Nil Coalescing / Apple's sample support "completed process >= 4" and per-version gating, but not a general `launch_count 3-10` threshold or `profiles_generated 3-5` range. Source: https://nilcoalescing.com/blog/RequestingAppStoreReviewsInSwiftUI/ |
| Missing explicit "cannot detect prompt shown" conclusion | Medium | The design packet needs this clearly: StoreKit may suppress the prompt, and the app should treat a local request as consumed because there is no reliable callback that confirms display or review submission. |
| Reddit used as primary evidence | Medium | Gemini cites Reddit for custom UI rejection evidence, but the brief allowed Tier 3 only for sanity checks. Apple's 5.6.1 is the primary source for custom prompts being disallowed. |
| Output is too thin for Codex packet | Medium | Anti-patterns and design tensions are useful, but the response does not fully answer all Task 1 mechanics or Task 2 heuristic evidence requirements. |

## Corrected Apple mechanics

| Topic | Corrected finding | Source |
|---|---|---|
| Preferred SwiftUI API | Use `@Environment(\.requestReview)` / `RequestReviewAction` in SwiftUI. This is available on iOS 16+. | https://developer.apple.com/documentation/storekit/requestreviewaction |
| iOS 17+ StoreKit API | Because 3dpa-iOS targets iOS 17.0, `AppStore.requestReview(in:)` is available and scene-based. | https://developer.apple.com/documentation/storekit/appstore/requestreview%28in%3A%29-1q8qs |
| Legacy StoreKit API | `SKStoreReviewController` is deprecated; Apple says to use `RequestReviewAction` / modern StoreKit APIs instead. | https://developer.apple.com/documentation/storekit/skstorereviewcontroller |
| Quota | StoreKit may display the prompt a maximum of three times within 365 days, subject to Apple's own display policy. | https://developer.apple.com/documentation/storekit/requestreviewaction |
| TestFlight / development | Development builds display the prompt for testing. TestFlight-distributed builds have no effect. | https://developer.apple.com/documentation/storekit/skstorereviewcontroller/requestreview%28%29 |
| User-action trigger | Do not call review request APIs directly in response to a button tap or other user action because the API may not present an alert. | https://developer.apple.com/documentation/storekit/requestreviewaction |
| App Review rule | Relevant rule is **5.6.1 App Store Reviews**: use the provided API; Apple disallows custom review prompts. | https://developer.apple.com/app-store/review/guidelines/ |
| Timing guidance | Ask only after demonstrated engagement and at a natural break / after a significant task; avoid first launch, onboarding, task interruption, and pestering. | https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews |

## Stronger 3dpa-specific heuristic

Primary recommendation for the Codex packet:

```text
Eligible when:
successful_profile_generations >= 4
AND days_since_first_launch >= 3
AND current_marketing_version != last_version_prompt_requested
AND last_feedback_opened_at is nil OR older than 14 days
AND current surface is OutputView after a successful profile generation
AND not a TestFlight build
```

Evidence / rationale:

| Condition | Evidence strength | Rationale |
|---|---|---|
| `successful_profile_generations >= 4` | Strong | Apple's own sample presents after a completed multi-step process at least four times. For 3dpa, a successful profile generation is the equivalent completed value-delivery process. Source: https://developer.apple.com/documentation/storekit/requesting-app-store-reviews |
| `current_marketing_version != last_version_prompt_requested` | Strong | Apple's sample stores the last app version prompted and avoids prompting again for the same version. |
| OutputView rest point + short delay | Strong | Apple's sample delays after completion to avoid interrupting the user; HIG says to use natural breaks or stopping points. |
| `days_since_first_launch >= 3` | Medium | Not directly from Apple as a hard number. This is a conservative guard so a user cannot be asked on day one even if they generate four profiles quickly. Should be reviewed by Codex/owner. |
| `last_feedback_opened_at older than 14 days` | Medium | FeedbackView likely indicates negative sentiment or unresolved friction. The 14-day value is a conservative local policy, not an Apple rule. |
| Not TestFlight | Strong | TestFlight calls have no effect, so skip UI expectations and optionally log local eligibility during QA. |

## Why profile generation beats launch count

`launch_count` is a weak proxy for value in 3dpa. A user can launch repeatedly while confused, comparing printers, or checking if the app has changed. `successful_profile_generations` is a stronger signal because it maps to the app's actual value moment: printer × material × nozzle × goals produced a usable slicer profile.

Recommended local counters:

```text
first_launch_date
launch_count
successful_profile_generation_count
distinct_successful_profile_keys
last_version_prompt_requested
last_prompt_request_date
last_feedback_opened_date
```

`distinct_successful_profile_keys` is optional but useful. It prevents one curious user from generating the same profile four times in one sitting and immediately becoming eligible.

## Preferred trigger surface

Preferred trigger point: **OutputView**, after a successful profile has rendered and after a short delay.

Rationale:

- OutputView is the value-delivery moment.
- A short delay avoids popping the system sheet during the navigation transition.
- HomeView is calmer, but less connected to user satisfaction.

Open Codex question: should the app wait until the user returns from OutputView to HomeView after a successful profile? That is less interruptive but may miss the emotional value moment.

## Anti-patterns to carry forward

- Do not prompt on first launch or onboarding.
- Do not prompt mid-configurator flow.
- Do not prompt directly from a button tap.
- Do not prompt immediately after opening FeedbackView.
- Do not use a custom "Do you like the app?" pre-prompt to filter unhappy users.
- Do not treat Apple's silence as failure and retry aggressively.
- Do not assume TestFlight behavior validates production presentation.

## Codex packet questions

- Should eligibility count every successful OutputView render, or only distinct printer/material/nozzle/profile combinations?
- Should `last_version_prompt_requested` use `MARKETING_VERSION` (`1.0.3`) or build number?
- Should opening FeedbackView block review eligibility for 7, 14, or 30 days?
- Should a profile with critical warnings count as a positive value moment?
- Should TestFlight builds skip the request path entirely, or record eligibility/debug logs without calling StoreKit?
- Should a persistent App Store "Write a review" link exist somewhere outside the automatic prompt path, or is that unnecessary for v1.0.3?

## Codex baseline recommendation

Use this as the default implementation candidate unless Codex challenges it:

```text
Request review after the 4th distinct successful profile generation,
at least 3 days after first launch,
only once per marketing version,
never within 14 days of opening FeedbackView,
from OutputView only,
after a short delay,
using Apple's provided review API.
```

This is conservative, Apple-aligned, and better matched to 3dpa's intermittent hobbyist usage than raw launch counting.

---

# Resolution

> **Status: EXECUTED — Milestone 2 complete. Awaiting Codex peer review of the executed Resolution before proceeding to Milestone 3 (Item 3 Codex review packet drafting).**
> Claude has executed Part B gap-fill against Apple primary sources clipped to `Obsidian Vault/50-Wiki/raw/apple/review/`. The Resolution is substantively complete. Two gap-fill items reached "null per source-or-null rule" or "deferred to packet" dispositions and are flagged below — they are honest-uncertainty disclosures, not silent gaps.
>
> **Read-only constraint (MANDATORY).** During this peer review, Codex MUST NOT modify any project source files or any prior section of this file. Codex's only allowed write surface is to append findings to the `# Codex peer review — Milestone 2 (executed Resolution)` section at the bottom. No edits to iOS source (`*.swift`), locales, tests, scripts, the brief, the Gemini Response section, the Resolution body, or the prior Codex sections (pass 1, pre-execution review, M1 review). Findings that imply a plan change are described in prose; Claude applies adjustments after the owner approves dispositions.
>
> **Milestone breakdown (status):**
> - ✅ **M1** — folded Codex pass 2's modifications into the plan. Codex pass 3 (M1 peer review) approved with two clarifications, both applied (M1 patch).
> - ✅ **M2** — Apple primary-source gap-fill executed against owner-clipped pages in `Obsidian Vault/50-Wiki/raw/apple/review/`. Awaiting Codex pass 4 peer review.
> - ⏳ **M3** — draft Item 3 Codex review packet at `codex/ios-review-prompt/<file>.md` with v2 baseline as candidate-to-challenge.
>
> **v2 changelog vs v1 (Codex pass 2 incorporation):**
> 1. Apple quota row (Part A Block 1) — captured "max 3/365 days IF user hasn't rated; new version may re-eligible >365 days" nuance.
> 2. Cooldown clause added to baseline (Part C); cooldown duration is a new packet question.
> 3. `distinct_successful_profile_keys` promoted from optional to baseline.
> 4. TestFlight detection downgraded from accepted to "verify before relying on it"; `AppTransaction` (iOS 16+) added as gap-fill alternative to `sandboxReceipt`.
> 5. OutputView hook idempotency note added to packet inputs.
> 6. 7-case test plan added to packet inputs.
> 7. Danish localisation row reworded — system prompt is auto-localised separately from app-provided EN+DA strings; don't conflate.
> 8. Architecture notes (DI'd `ReviewPromptService`, view-vs-service split, store-on-request, `action=write-review` URL pattern) added to packet inputs.
>
> **M1 patch (Codex pass 3 incorporation):**
> 1. Profile-key conceptual definition expanded — engine-relevant subset of `AppState` chosen by packet; default proposal lists 12 fields, excludes UI-only `userLevel`. UserDefaults `Set` storage gotcha noted.
> 2. New packet question: which `AppState` fields make up the profile key for `distinct_successful_profile_generations` counting?
>
> **M2 outputs (gap-fill against Apple primary sources):**
> 1. ✅ Apple quota nuance verified verbatim against `RequestReviewAction` page — matches Codex pass 2's required wording exactly.
> 2. ✅ "No callback" confirmed — `RequestReviewAction`'s documented surface area provides no completion handler / display-confirmation API. v2 baseline's "treat-request-as-consumed" decision is correctly anchored.
> 3. ✅ Heuristic anchor `>= 4 successful processes` confirmed verbatim from Apple's "Requesting App Store Reviews" article — with explicit *"this number is arbitrary"* caveat. Per-version gating sample code reproduced as Apple-prescribed.
> 4. ✅ "Natural break" HIG cite extracted verbatim — replaces Gemini's weak Incipia source on Post-Error and Mid-Workflow.
> 5. ✅ Three of five missing anti-patterns sourced to HIG; one to `RequestReviewAction`; one (feedback-vs-review conflation) is project-specific (not Apple-prescribed). Total anti-pattern coverage: 11 (≥ brief's target of 10).
> 6. ✅ Guideline 5.6.1 verbatim wording extracted; Gemini's "1.1.7" cite confirmed wrong (1.1.x is Objectionable Content).
> 7. ⚠️ Danish auto-localisation — **null per source-or-null rule.** No explicit Apple sentence in clipped HIG / RequestReviewAction confirms Danish localisation. Resolution wording downgraded to "system-rendered; standard iOS device-language localisation applies; no specific Danish guarantee cited."
> 8. ⚠️ TestFlight detection mechanism — **demoted to packet question** (per prior owner agreement; AppTransaction page not in clipping batch). RequestReviewAction confirms TestFlight is a no-op for the prompt itself; the detection-mechanism choice (`sandboxReceipt` vs `AppTransaction.shared.environment`) is the packet's implementation call.

## Plan overview

The two prior passes (Gemini's response + Codex pass 1 "Codex Review / Alternate Findings") are mostly complementary: Gemini gave decent design tensions and a TestFlight detection recipe but failed the source-or-null bar on heuristic thresholds and one anti-pattern citation; Codex pass 1 corrected a wrong guideline number, replaced the weak heuristic with an Apple-sample-anchored one, and surfaced 6 packet-relevant questions. Codex pass 2 ("Codex pre-execution review") then tightened quota wording, cooldown policy, TestFlight detection, idempotent counting, and test expectations. Wholesale-decline of any pass would have been wrong — each contributed real value.

This plan adopts **per-finding triage** rather than wholesale accept/decline, fills gaps no pass addressed using direct Apple-doc fetches (no third Gemini pass), and produces the inputs for the Item 3 Codex review packet.

## Part A — Per-finding triage (proposed dispositions)

### Gemini Block 1 — API mechanics

| Item | Proposed disposition | Rationale |
|---|---|---|
| `RequestReviewAction` (iOS 16+) | Accept | Apple-doc-cited |
| `AppStore.requestReview(in:)` (iOS 17+) | Accept | Apple-doc-cited |
| `SKStoreReviewController` deprecated iOS 18 | Accept | Confirmed by Codex pass 1 |
| **365-day quota — corrected wording (v2)** | Modify | Replace shorthand "3 prompts/user/year" with: *StoreKit may show the prompt up to 3 times within 365 days IF the user has not rated/reviewed on that device; if they have rated/reviewed, StoreKit may show again only for a new app version after >365 days.* Verify against Apple primary source in gap-fill (Part B item 3). |
| TestFlight: silent no-op | Accept | Apple-doc-cited |
| Development mode: prompt always shows | Modify — verify the cited URL actually contains this claim | URL is the right page but the assertion needs anchoring |
| **Guideline 1.1.7 disallows custom prompts** | **Decline + replace** with **5.6.1** | Per Codex pass 1; 1.1.7 is not the relevant guideline |
| Localisation: Apple-localised incl. Danish | Modify (v2) — see Block 5 row for revised wording | |
| `requestReview(in: UIWindowScene)` scene-based variant | **Gap-fill** | Brief asked; Gemini missed; iOS 14 origin / iOS 18 deprecation |
| Programmatic detection — "can we tell if prompt displayed?" | **Gap-fill** | Brief asked; Gemini missed; load-bearing for packet's "treat-request-as-consumed" decision |

### Gemini Block 2 — Heuristics

| Element | Disposition | Rationale |
|---|---|---|
| Signals table (4 signal names) | Accept names; decline threshold ranges | Names are fine; threshold ranges fail source-or-null (Incipia is exactly the kind of ASO marketing blog the brief forbids) |
| Recommendation 1 ("Multi-Print Hobbyist", 5/4/3 values) | Decline | Point values inside an unsourced range |
| Recommendation 2 ("Loyal Returning User", 10/7) | Decline | Same |
| **Replace with:** Codex pass 1's stronger heuristic + Codex pass 2's `distinct_*` and cooldown additions (v2) | **Adopt as Codex-packet baseline** | `distinct_successful_profile_generations >= 4` is anchored to Apple's own sample code (strong primary source); per-version gating from Apple sample; OutputView+delay HIG-aligned; `days_since_first_launch >= 3` and 14-day FeedbackView cooldown honestly flagged as local policy, not Apple-sourced; cooldown duration becomes packet question (v2) |

### Gemini Block 3 — Anti-patterns

| Anti-pattern | Gemini coverage | Disposition |
|---|---|---|
| First Launch | ✓ Apple HIG | Accept |
| Button-Tap Trigger | ✓ Apple Docs | Accept |
| Post-Error Prompt | ✓ Incipia (weak) | Modify — replace Incipia citation with Apple HIG "natural breaks" guidance |
| Mid-Workflow | ✓ Apple Developer | Accept |
| Custom UI Popups | ✓ but Reddit-primary + wrong guideline | **Decline citation + replace** with Apple 5.6.1 (per Codex pass 1) |
| Long-absence prompt | Not covered | **Gap-fill** from Apple HIG |
| Re-prompt after silent suppression | Not covered | **Gap-fill** from Apple's quota guidance |
| TestFlight build confusion | Not covered | **Gap-fill** — Block 5 detection recipe is the upstream defense; document the anti-pattern explicitly |
| Before-value-delivered | Not covered | **Gap-fill** from HIG "after meaningful interaction" |
| Uninstall-threat trigger | Not covered | **Defer** — academic for 3dpa, no IAPs / paywall |
| Feedback-vs-review conflation | Not covered | **Gap-fill** — Codex's 14-day FeedbackView cooldown is the defense; document the anti-pattern |
| Localisation pitfalls | Not covered | **Gap-fill** — clarify Apple's prompt is auto-localised so this risk is low for 3dpa |

Net coverage after gap-fill: 10 anti-patterns with primary sources, brief target met.

### Gemini Block 4 — Design tensions

| Tension | Disposition |
|---|---|
| Value moment vs rest state (OutputView vs HomeView) | Accept — feeds packet |
| Negative sentiment filter (FeedbackView cooldown N days) | Accept — packet adjudicates 7 / 14 / 30 |
| Tracking suppression (treat-request-as-consumed) | Accept — packet decides on the back of programmatic-detection gap-fill |
| Persistence policy (reset on version bump) | Accept — Codex pass 1's per-version gate is the proposed answer |

Plus carry forward all 6 Codex pass 1 packet questions at line 421–426 (eligibility distinct or every render?, `MARKETING_VERSION` vs build?, FeedbackView 7/14/30?, critical-warnings still positive?, TestFlight log-only or skip entirely?, persistent App-Store-link in UI?).

### Gemini Block 5 — Cross-cutting

| Item | Disposition |
|---|---|
| iOS 18 deprecation | Accept |
| **TestFlight detection recipe (`sandboxReceipt`) (v2)** | Modify — accepted as one possible signal but **not load-bearing without verification**. Gap-fill checks Apple's authoritative position and evaluates iOS 16+ `AppTransaction` API as the more reliable alternative (Part B item 7). |
| **Danish auto-localisation claim (v2)** | Modify — reword as: *"StoreKit's review prompt UI is system-rendered and auto-localised by Apple based on device language; the app does not provide DA strings for the prompt itself. App-provided EN+DA strings (`Localizable.strings`) cover the app's own UI only and have no relationship to the prompt."* Pull Apple HIG primary source in gap-fill (Part B item 4). |
| 2024–2026 App Store rejection examples (brief asked, neither pass covered) | **Defer** — not load-bearing for packet decision; revisit if a packet question depends on it |

### First Codex pass ("Codex Review / Alternate Findings" section)

| Element | Disposition |
|---|---|
| All 6 issues in the verdict table | Accept — internally consistent, verifiable |
| Corrected Apple mechanics table (line 343–352) | Accept — replaces Gemini's weaker version of the same |
| Stronger 3dpa-specific heuristic (line 359–366) | **Adopt** as Codex-packet baseline (now superseded by v2 baseline below) |
| Recommended local counters list (line 386–393) | Accept |
| `distinct_successful_profile_keys` addition | **Promoted to baseline (v2)** per Codex pass 2 — see Part C baseline |
| Preferred trigger surface (OutputView + delay) | Accept as default; the OutputView-vs-HomeView-on-return tension at line 407 carries into packet |
| Anti-patterns list (line 411–417) | Accept; merges with Gemini's covered + gap-filled set |
| Codex pass 1 packet questions (line 421–426) | Carry forward into packet wholesale |
| Codex pass 1 baseline recommendation (line 432–440) | Superseded by v2 baseline below (which adds `distinct_*` + cooldown clause + TestFlight wording) |

### Codex pass 2 ("Codex pre-execution review" section, v2)

| Element | Disposition |
|---|---|
| All 7 required modifications in the verdict table | Accept — folded into v2 plan above (see v2 changelog at the top) |
| Architecture notes (lines 614–620) | Accept — folded into Part C "Architecture notes" below |
| Suggested revised baseline (lines 622–638) | **Adopt as v2 baseline candidate** (see Part C) |
| Final review position ("Proceed after applying the modifications above") | Accept — Milestone 1 is the response |

## Part B — Gap-fill outputs (executed against Apple primary sources)

**Method note:** Direct WebFetch against `developer.apple.com/*` returned only page titles — Apple docs are JS-rendered SPAs. Owner pulled 5 unique pages into `Obsidian Vault/50-Wiki/raw/apple/review/` per the validated wiki-pages-as-primary-source workflow (same pattern that recovered handover #1's printer audit). Claude read those clipped files as primary source for the gap-fills below.

**Sources consulted:**
- `2026-05-08-ratings-and-reviews.md` — HIG ratings-and-reviews
- `2026-05-08-requesting-app-store-reviews.md` — Apple's how-to article + sample code
- `2026-05-08-request-review-action.md` — RequestReviewAction reference
- `2026-05-08-skstore-review-controller.md` — SKStoreReviewController reference
- `2026-05-08-app-review-guidelines.md` — App Store Review Guidelines (full page; section 5.6.1 at line 380)

### Item 1 — `requestReview(in: UIWindowScene)` scene-based variant ✅

- **Source:** SKStoreReviewController page → "Topics → Indicating an appropriate time for a review" lists `class func requestReview(in: UIWindowScene)` with description: *"Tells StoreKit to ask the customer to rate or review the app, if appropriate, using the specified scene."*
- **Disposition:** Variant exists; the clipped main page does not show explicit availability annotations or deprecation banners on the methods themselves. iOS 14 origin / iOS 18 deprecation history relies on Codex pass 1's separate Apple URL citation (line 343–352, peer-reviewed). **Confirmed.**

### Item 2 — Programmatic detection ("no callback") ✅ load-bearing

- **Source — RequestReviewAction Overview (verbatim):** *"When you call this API in your shipping app and the system displays a rating and review request view, the system handles the entire process for you. ... App Store policy governs the actual display of a rating and review request view."*
- **Source — RequestReviewAction Topics list:** exactly two members: `callAsFunction()` and the `requestReview` environment value. **No completion handler. No callback. No display-confirmation API.**
- **Cross-confirm — Requesting App Store Reviews:** *"people can disable requests for reviews from ever appearing on their device."*
- **Disposition:** **Confirmed.** Apple provides no programmatic way to know whether the prompt actually displayed. The v2 baseline's "treat-request-as-consumed" decision is correctly anchored.

### Item 3 — Apple quota wording (Codex pass 2 nuance) ✅

- **Verbatim from RequestReviewAction:**
  > *"If the person hasn't rated or reviewed your app on this device, StoreKit displays the ratings and review request a maximum of three times within a 365-day period. If the person has rated or reviewed your app on this device, StoreKit displays the ratings and review request if the app version is new, and if more than 365 days have passed since the person's previous review."*
- **HIG simplification:** *"The system automatically limits the display of the prompt to three occurrences per app within a 365-day period."*
- **Disposition:** Codex pass 2's required wording matches Apple primary source verbatim. **Confirmed.**

### Item 4 — Danish auto-localisation ⚠️ null per source-or-null rule

- **Sources searched:** HIG ratings-and-reviews + RequestReviewAction.
- **Findings:** HIG describes the prompt as "system-provided" and notes "iOS, iPadOS, and macOS offer a consistent, nonintrusive way for apps and games to request ratings and reviews." RequestReviewAction's "Test review requests" section addresses dev/TestFlight behavior. **Neither page contains an explicit statement that the prompt is auto-localised into Danish (or any specific non-English language).**
- **Disposition:** Honest null. The system-rendered nature of the prompt strongly implies device-language localisation, but I cannot quote an explicit Apple sentence asserting Danish localisation specifically. Resolution wording for the v2 Block 5 row is downgraded to: *"StoreKit's review prompt UI is system-rendered ('system-provided' per HIG). Standard iOS device-language localisation applies. The app does not provide DA strings for the prompt itself; app-provided EN+DA strings (`Localizable.strings`) cover the app's own UI only."* No specific Danish guarantee cited.

### Item 5 — Five missing anti-patterns sourced ✅ 4/5 sourced; 1 project-specific

- **Long-absence prompt** — *"Avoid showing a request for a review immediately when a user launches your app, even if it isn't the first time it launches."* (Requesting App Store Reviews article)
- **Re-prompt after silent suppression** — *"Avoid pestering people. Repeated rating requests can be irritating, and may even negatively influence people's opinion of your app. Consider allowing at least a week or two between requests, prompting again after people demonstrate additional engagement with your experience."* (HIG)
- **Before-value-delivered** — *"Ask for a rating only after people have demonstrated engagement with your app or game. ... Avoid asking for a rating on first launch or during onboarding, because people haven't had enough time to gain a clear understanding of your app's value or form an opinion."* (HIG)
- **TestFlight build confusion** — *"this method has no effect in apps that you distribute for beta testing using TestFlight."* (RequestReviewAction → Test review requests). Anti-pattern: assuming TestFlight non-display equals production failure.
- **Feedback-vs-review conflation** — No direct Apple source. Project-specific anti-pattern defended by Codex pass 1's 14-day FeedbackView cooldown. Documented as local design rule, not Apple-prescribed.
- **Localisation pitfalls** — Closed by Item 4 disposition (system-rendered prompt + standard iOS localisation behavior); no separate primary source needed.

### Item 6 — "Natural break" HIG cite ✅

- **Verbatim from HIG:**
  > *"Avoid interrupting people while they're performing a task or playing a game. Asking for feedback can disrupt the user experience and feel like a burden. Look for natural breaks or stopping points in your app or game where a rating request is less likely to be bothersome."*
- **Disposition:** Replaces Gemini's weak Incipia citation on Post-Error Prompt; canonical for Mid-Workflow. **Confirmed.**

### Item 7 — TestFlight detection mechanism (`sandboxReceipt` vs `AppTransaction`) ⚠️ demoted to packet

- **Source:** AppTransaction page not in M2 clipping batch (deferred per prior owner agreement to keep clipping scope tight).
- **What we know:** RequestReviewAction confirms TestFlight is a no-op for the prompt itself (*"this method has no effect in apps that you distribute for beta testing using TestFlight"*). The detection *mechanism* (which API to use to identify a TestFlight build) is unresolved.
- **Disposition:** **Demoted to packet question.** v2 baseline's `AND distribution is not TestFlight` condition stands; the *implementation* of "is not TestFlight" is the packet's call. Two candidates: `Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"` (well-known, possibly brittle on iOS 16+) vs `AppTransaction.shared.environment == .sandbox` (iOS 16+, more reliable per general iOS knowledge but unverified against Apple primary in this batch). Packet implementation phase pulls the AppTransaction page if needed.

### Bonus — Heuristic anchor confirmation ✅

The Requesting App Store Reviews article explicitly endorses Codex pass 1's chosen heuristic anchor:

> *"The person successfully completes the three-step process at least four times. **This number is arbitrary** and developers can choose something that fits well with how many times someone is likely to complete a process in their apps."*

Plus the per-version gating sample code (verbatim Apple sample):

```swift
if processCompletedCount >= 4, currentAppVersion != lastVersionPromptedForReview {
    presentReview()
    lastVersionPromptedForReview = currentAppVersion
}
```

Plus the delay-before-prompt sample (verbatim):

```swift
private func presentReview() {
    Task {
        // Delay for two seconds to avoid interrupting the person using the app.
        try await Task.sleep(for: .seconds(2))
        await requestReview()
    }
}
```

Plus Apple's persistent-link recommendation (matches Codex pass 2's architecture note exactly):
> *"To enable a person to initiate a review as a result of an action in the UI, the sample code uses a deep link to the App Store page for the app with the query parameter `action=write-review` appended to the URL."*

**Implication for v2:** Apple itself flags `>= 4` as **arbitrary** — this validates Codex pass 2's classification of `days_since_first_launch >= 3` and the 14-day FeedbackView cooldown as honest local-policy choices, not falsely Apple-sourced. The packet should adopt `>= 4` as the default but explicitly note "arbitrary per Apple; tune if 3dpa-specific evidence emerges."

### Bonus — Guideline 5.6.1 verbatim ✅

From the App Store Review Guidelines (clipped at line 380–382):

> ***5.6.1 App Store Reviews** — App Store customer reviews can be an integral part of the app experience, so you should treat customers with respect when responding to their comments. Keep your responses targeted to the user's comments and do not include personal information, spam, or marketing in your response.*
>
> *Use the provided API to prompt users to review your app; this functionality allows customers to provide an App Store rating and review without the inconvenience of leaving your app, and we will disallow custom review prompts.*

**Cross-check:** Guideline section 1.1 (Objectionable Content — Defamatory, Sexual, etc., line 76–81 of clipped guidelines) — no relation to review prompts. **Gemini's "Guideline 1.1.7" citation is provably wrong; Codex pass 1's correction to 5.6.1 is verbatim correct.**

**Disposition:** 5.6.1 is the correct guideline. Mandates use of Apple's provided API; explicitly disallows custom review prompts ("we will disallow custom review prompts"). **Confirmed.**

### Why no third Gemini pass

These gaps were Apple-doc-shaped (hard-data lookups). Handover #1's failure mode — training-memory hallucination on hard-data lookups — was the same risk class. Direct fetches were the right tool when WebFetch could see the content; the wiki-pages-as-primary-source workflow was the right tool when WebFetch hit the JS-SPA wall. Gemini's tool-fit is synthesis tasks, not spec-table lookups; Gemini was correctly not consulted for any of the 7 gap-fill items.

## Part C — Net delta into the Item 3 Codex review packet

The packet for Item 3 ("iOS App Store review prompt") will receive:

### Inputs (research foundation)

- Apple API + quota mechanics — corrected per Block 1 triage + 3 gap-fills (scene variant, programmatic detection, quota wording).
- App Review guideline — **5.6.1**, not 1.1.7.
- Engagement-tracking pattern — Codex pass 1 counters list at line 386–393, with `distinct_successful_profile_keys` promoted to baseline.
- Anti-patterns — Gemini's 5 + 5 gap-filled = 10 with primary sources; uninstall-threat deferred.
- TestFlight detection — **two candidates pending gap-fill**: `sandboxReceipt` URL check (well-known, possibly brittle) vs `AppTransaction.shared.environment == .sandbox` (iOS 16+, more reliable). Packet decision after gap-fill outputs.

### Decision-to-challenge baseline (v2)

```text
Request review when:
  distinct_successful_profile_generations >= 4
  AND days_since_first_launch >= 3
  AND current_marketing_version != last_version_prompt_requested
  AND local_request_cooldown has elapsed (duration TBD by packet)
  AND (last_feedback_opened_at is nil OR older than 14 days)
  AND current surface is OutputView after a successful profile generation
  AND distribution is not TestFlight

After requesting:
  store last_prompt_request_date
  store last_version_prompt_requested
  treat the local request as consumed regardless of whether Apple displayed UI
  (no callback exists; StoreKit may have suppressed or shown silently)
```

### Implementation notes (v2 — from Codex pass 2)

- **OutputView idempotency.** SwiftUI's `.task` modifier on a view re-runs on lifecycle changes. Counting `successful_profile_generations` from `OutputViewModel.loadProfile` must be **idempotent per profile key**. Recommended: hash a profile key and only increment when the key is novel. The **profile key** is a stable, normalized subset of `AppState` chosen by the packet — at minimum `printer / material / nozzle`, but if the goal is "distinct generated recommendation" it should include all engine-relevant fields that can materially change output (likely `useCase`, `surface`, `strength`, `speed`, `environment`, `support`, `colors`, `special`, `profileMode`; exclude UI-only fields like `userLevel`). The specific inclusion list is a packet decision (see open packet questions). **Persistence:** `UserDefaults` cannot store a native Swift `Set` directly — `ReviewPromptService` should expose a Set-like API backed by an array (or dictionary) of `ProfileKeyHash` strings.
- **Trigger surface timing.** Fire the prompt request from OutputView after the profile renders, not during the loading transition. A short `Task.sleep(...)` or `.onAppear`-after-`.task` pattern avoids interrupting the navigation animation.

### Test plan (v2 — from Codex pass 2)

`ReviewPromptServiceTests` must cover:
1. Threshold not met → `eligibility == false`.
2. 4th distinct profile generation completes → `eligibility == true` (subject to other AND conditions).
3. Same-version re-fire suppressed → `eligibility == false` even when other conditions met.
4. FeedbackView opened within cooldown window → `eligibility == false`.
5. TestFlight build → `eligibility == false` regardless of other conditions.
6. Same profile key generated 4 times in one sitting → `distinct_count == 1`, `eligibility == false` (idempotency check).
7. **If** critical-warnings filter is included in the heuristic (packet question pending) → critical-warning generation does not increment `distinct_successful_profile_generations`.

### Architecture notes (v2 — from Codex pass 2)

- **`ReviewPromptService` with dependency injection.** Constructor takes: storage (UserDefaults wrapper), clock/date provider, app-version provider (`AppConstants.appVersion`), distribution detector (TestFlight / debug / production). Service is unit-testable without StoreKit at all.
- **Service vs view layer split.** Service exposes `eligibility(currentSurface: Surface) -> Bool` and `markRequested()`. The view layer (likely `OutputView` via `@Environment(\.requestReview)`) calls service for eligibility, performs the actual `requestReview()` call, and immediately calls `markRequested()` regardless of whether the prompt displayed.
- **Store on REQUEST, not on display.** StoreKit provides no callback confirming display. `markRequested()` must run unconditionally after the request is fired; treating non-display as "still eligible" leads to the user being asked repeatedly across sessions until Apple finally shows the prompt — bad UX.
- **Critical-warnings filter — explicit decision required.** Either include in the heuristic (and increment `distinct_successful_profile_generations` only on warning-free profiles) or explicitly decline (and document that warning-laden profiles still count). Don't leave it implicit.
- **Persistent "Write a review" link (out of scope for v1.0.3 unless owner adds).** If added later, use Apple's `https://apps.apple.com/app/id6761634761?action=write-review` URL pattern; keep it separate from automatic prompt eligibility.

### Open packet questions (carry forward, owner + Codex packet adjudicates)

- Four tensions from Gemini Block 4.
- Six questions from Codex pass 1 (line 421–426).
- **(v2 new)** What is the `local_request_cooldown` duration — 14 days, 30 days, longer? Tradeoff: short cooldown gets more attempts within Apple's 3/year quota; long cooldown reserves quota for higher-confidence eligibility moments.
- **(v2 new)** Critical-warnings filter — included or declined?
- **(v2 new, from Codex pass 3)** Profile-key field list — which `AppState` fields make up the profile key for `distinct_successful_profile_generations` counting? Default proposal: `printer / material / nozzle / useCase / surface / strength / speed / environment / support / colors / special / profileMode`. Exclude `userLevel` (UI-only). Decision affects test case 6 expected behaviour and the "eligibility distinct or every render?" question from Codex pass 1.

### Out of scope for the packet (deferred)

- 2024–2026 App Store rejection examples.
- Uninstall-threat anti-pattern (no IAPs / paywall in 3dpa).
- Persistent "Write a review" link in app UI.

## Open questions before executing this plan (v2)

1. **Codex pass 1 / 2 / 3 conflict resolution.** This v2 plan treats Codex pass 1 + 2's findings as accepted. If pass 3 (Milestone 1 review) disagrees with either, owner decides.
2. ~~`distinct_successful_profile_keys` — baseline or optional?~~ **Resolved** — promoted to baseline per Codex pass 2.
3. **Implementation worktree.** Once execution starts, edits land at the canonical `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/` path, not the current `elegant-liskov-741f6c` worktree. Flagged for visibility.
4. **Handover #1 lessons-learned propagation.** This per-finding triage pattern (vs wholesale accept/decline) confirmed in handover #3 should be captured in the AI Operating Model pilot's end-of-decision matrix on 2026-05-14.
5. **(v2 new)** Cooldown duration. Listed as packet question; flagging here too because it may affect Part B gap-fill scope (e.g. if Apple has any guidance, fold into gap-fill item 3).
6. **(v2 new)** Critical-warnings filter. Listed as packet question; affects test plan case 7.

---

# Codex pre-execution review

## Verdict

Approve the plan with modifications. The per-finding triage approach is right, and the Apple-sample-anchored heuristic is much stronger than Gemini's original launch-count-based recommendation. Before executing Parts A + B + C, tighten the quota language, local cooldown policy, TestFlight handling, idempotent counting, and test expectations below.

## Required plan changes

| Area | Disposition | Required change |
|---|---|---|
| Apple quota wording | Modify | Replace shorthand "3 prompts/user" with Apple's more nuanced rule: StoreKit may show the prompt a maximum of three times within 365 days if the person has not rated/reviewed on that device; if they have rated/reviewed, StoreKit may show again for a new app version after more than 365 days. Preserve this nuance in the Codex packet. |
| Local request cooldown | Modify | Lines 573-575 say treat request as consumed "for the year," while the baseline also says once per marketing version. Make the local policy explicit: either once per marketing version plus a minimum time cooldown, or once per version only. Add this as a packet question if not resolved during gap-fill. |
| `distinct_successful_profile_keys` | Modify | Promote from optional to baseline unless Codex/owner rejects it. It is cheap to track and prevents a user from generating the same profile four times in one sitting to become eligible. |
| TestFlight detection | Modify | Downgrade `sandboxReceipt` from accepted recipe to "verify before relying on it." Receipt-based TestFlight detection can be brittle. It is fine for debug/logging, but should not become a fragile load-bearing product decision without verification. |
| OutputView hook point | Add | Document the likely implementation hook: `OutputView` calls `model.loadProfile(appState)` in `.task`, and `OutputViewModel.loadProfile` resolves the profile. Counting must be idempotent per distinct profile key because SwiftUI `.task` / view lifecycle can re-run. |
| Test plan | Add | Add service-level tests for threshold not met, fourth distinct profile qualifies, same-version suppression, feedback cooldown, TestFlight skip/log behavior, duplicate profile key not double-counted, and any critical-warning gating if that becomes part of the heuristic. |
| Danish localisation | Modify | Treat as "Apple-localised system UI; app does not provide DA strings" unless a primary Apple source explicitly confirms Danish. Do not overclaim language-specific support without source. |

## Additional notes for execution

- Prefer a `ReviewPromptService` with injected storage, clock/date provider, app version provider, and TestFlight/build-distribution detector so eligibility logic is unit-testable without StoreKit.
- Keep StoreKit presentation in the SwiftUI view layer (`RequestReviewAction` / environment action), and keep eligibility/counter logic in the service. The service should return an eligibility decision; the view performs the actual request.
- Store `last_prompt_request_date` and `last_version_prompt_requested` when the app requests the prompt, not only when it believes the prompt appeared. StoreKit provides no reliable display callback.
- If the packet keeps the "critical warnings" question open, do not implement that filter implicitly. Either explicitly include or explicitly decline it in the packet disposition.
- If a persistent App Store "Write a review" link is included later, it should use Apple's `action=write-review` product-page URL pattern and stay separate from automatic prompt eligibility.

## Suggested revised baseline for the packet

```text
Request review when:
  distinct_successful_profile_generations >= 4
  AND days_since_first_launch >= 3
  AND current_marketing_version != last_version_prompt_requested
  AND local_request_cooldown has elapsed (duration to be adjudicated)
  AND (last_feedback_opened_at is nil OR older than 14 days)
  AND current surface is OutputView after a successful profile generation
  AND distribution is not TestFlight

After requesting:
  store last_prompt_request_date
  store last_version_prompt_requested
  treat the local request as consumed regardless of whether Apple displayed UI
```

## Final review position

Proceed after applying the modifications above. No source or Swift files should be changed during this pre-execution review; the next Claude step should be gap-fill + final Resolution update, then the actual implementation packet.

---

# Codex peer review — Milestone 1 (plan v2)

> **Read-only constraint (MANDATORY).** Codex MUST NOT modify any project source files or any prior section of this file (the brief, Gemini Response, Codex Review / Alternate Findings, Codex pre-execution review, or the Resolution plan above). Codex's only allowed write surface is to append findings below this preamble. After owner approves dispositions, Claude proceeds to Milestone 2 (Part B gap-fill + executed Resolution).

## Review focus

Verify Codex pass 2's 7 required modifications + architecture notes are correctly incorporated into the v2 plan. Surface any new gaps the modifications create. Per-finding agree / modify / disagree.

**Specifically, check:**

1. **v2 changelog completeness.** Does the changelog at the top of `# Resolution` accurately list all 7 pass-2 modifications? Anything missed?
2. **Block 1 quota wording.** Does the new wording in the "365-day quota — corrected wording (v2)" row preserve Apple's nuance (3 prompts within 365 days IF user hasn't rated; new-version re-eligibility after >365 days)?
3. **Block 2 heuristic disposition.** Does the row correctly point to the v2 baseline in Part C? Does the rationale explain the cooldown-duration packet question?
4. **Block 5 TestFlight + Danish localisation rows.** Does the TestFlight row correctly downgrade `sandboxReceipt` and reference Part B item 7? Does the Danish row correctly distinguish system prompt UI (Apple-localised) from app-provided EN+DA strings?
5. **Codex pass 2 disposition table** (new section after First Codex pass). Does it correctly accept all 7 modifications + architecture notes + revised baseline? Anything that should be modified rather than accepted?
6. **Part B gap-fill list.** Items 3 (quota wording) and 7 (`AppTransaction` vs `sandboxReceipt`) added per pass 2. Anything else that should be a gap-fill item now? Estimated effort still realistic?
7. **Part C v2 baseline.** Does the baseline code block match Codex pass 2's suggested revised baseline at lines 624–638? Any divergence?
8. **Part C Implementation notes / Test plan / Architecture notes subsections.** All three were added per pass 2. Are the contents faithful? OutputView idempotency note covers `.task` re-run behaviour — accurate? Test plan 7 cases cover everything pass 2 listed at line 611?
9. **Open packet questions.** Two new v2 questions (cooldown duration, critical-warnings filter) added. Any other packet question that should be added or any that should be resolved here rather than in the packet?
10. **Open questions list (1–6).** Question 2 marked resolved; questions 5 + 6 added. Any open question that's actually decided already, or any decision that should be flagged as open?

## What Codex should NOT do

- Do not propose wholesale plan rewrite. Pass 2 was structural; Milestone 1 is incorporation. If something is structurally wrong, flag it crisply and let owner decide whether to roll back to pass 2.
- Do not re-litigate decisions already accepted in pass 1 or pass 2 unless new evidence surfaces.
- Do not write Swift code. Implementation lands in the Item 3 packet (Milestone 3), not here.
- Do not fill the Part B gap-fill items. That's Milestone 2's job; Milestone 1 only decides the gap-fill *plan*.

## Output format (for Codex's response)

Append below in this structure:

```
## Verdict
[approve / approve-with-modifications / request-changes — one short paragraph]

## Per-check findings
| Check # | Disposition | Notes |
|---|---|---|
| 1 (v2 changelog completeness) | agree / modify / disagree | ... |
| 2 (Block 1 quota wording) | ... | ... |
| ... etc through 10 ...

## New issues surfaced (if any)
[one row per issue, with proposed disposition for owner decision]

## Required changes before Milestone 2
[bulleted list, each item actionable + scoped]

## Final review position
[one short paragraph; should the owner green-light Milestone 2 as-is, with modifications, or roll back?]
```

*(Codex appends findings below.)*

## Verdict

approve-with-modifications — Claude correctly incorporated the 7 required modifications plus the architecture notes from Codex pass 2. The v2 plan is ready for Milestone 2 after one targeted clarification: define the distinct profile key precisely enough that idempotent counting does not collapse meaningfully different generated profiles.

## Per-check findings

| Check # | Disposition | Notes |
|---|---|---|
| 1 (v2 changelog completeness) | agree | The changelog lists all 7 pass-2 modifications plus the architecture notes. The wording is accurate: item 8 is not an extra required modification, it is the architecture-notes bucket. |
| 2 (Block 1 quota wording) | agree | The corrected quota row preserves Apple's nuance: max 3 prompts within 365 days when the user has not rated/reviewed on that device, and new-version re-eligibility only after more than 365 days once they have rated/reviewed. Gap-fill verification is appropriately deferred to Part B. |
| 3 (Block 2 heuristic disposition) | agree | The heuristic row points to the v2 baseline and explicitly calls out the cooldown-duration packet question. It also preserves the distinction between Apple-sourced conditions and local-policy conditions. |
| 4 (Block 5 TestFlight + Danish localisation rows) | agree | TestFlight detection is correctly downgraded from accepted recipe to verify-before-relying, and Part B item 7 now compares `sandboxReceipt` with `AppTransaction`. Danish localisation wording correctly separates Apple-rendered system prompt UI from app-provided EN/DA strings. |
| 5 (Codex pass 2 disposition table) | agree | The new Codex pass 2 table correctly accepts all required modifications, architecture notes, and revised baseline. No item needs to be downgraded there. |
| 6 (Part B gap-fill list) | agree | Items 3 and 7 were added as requested. The 15-20 minute estimate is realistic for Apple-doc fetches. No extra hard-data lookup is required before Milestone 2. |
| 7 (Part C v2 baseline) | agree | The baseline matches Codex pass 2's revised baseline and adds only helpful clarification about treating the local request as consumed because StoreKit may suppress or show silently. |
| 8 (Implementation notes / Test plan / Architecture notes) | modify | The sections are faithful overall, and the `.task` re-run idempotency note is accurate. One ambiguity remains: the profile key tuple is described as `printer x material x nozzle x goals x profileMode`, but "goals" is not precise enough for implementation. Define the normalized engine-relevant fields included in the key before Milestone 2 hands this to the packet. |
| 9 (Open packet questions) | agree | Cooldown duration and critical-warnings filter are correctly added as packet questions. No additional packet-level question is needed if the profile-key definition is handled as a required plan clarification. |
| 10 (Open questions list) | agree | Question 2 is correctly resolved; questions 5 and 6 are real open decisions. None of the listed open questions should be resolved in Milestone 1. |

## New issues surfaced

| Issue | Proposed disposition | Notes |
|---|---|---|
| Distinct profile key is underspecified | Modify before Milestone 2 | The idempotency plan is right, but the key must be deterministic and broad enough. At minimum, decide whether it includes only core selections (`printer`, `material`, `nozzle`) or all engine-relevant profile inputs (`useCase`, `surface`, `strength`, `speed`, `environment`, `support`, `colors`, `userLevel`, `special`, advanced fields, `profileMode`). |
| UserDefaults storage shape for profile keys | Note for packet / implementation | The plan says store a `Set<ProfileKeyHash>` in UserDefaults. Swift `UserDefaults` cannot store a native `Set` directly; implementation should persist an array of strings or a dictionary wrapper and expose a Set-like API in `ReviewPromptService`. This does not block Milestone 2, but it should be visible in the packet. |

## Required changes before Milestone 2

- Clarify the distinct profile key definition in Part C Implementation notes. Suggested wording: "Profile key must be derived from a stable, normalized subset of AppState chosen by the packet; if the goal is 'distinct generated recommendation,' include all engine-relevant fields that can materially change output, not only printer/material/nozzle."
- Add a small note that UserDefaults persistence should store profile-key hashes as an array/dictionary via the service abstraction, not as a raw Swift `Set`.

## Final review position

Green-light Milestone 2 after the two small plan clarifications above. The Resolution v2 otherwise correctly incorporates Codex pass 2 and is ready for Apple primary-source gap-fill.

---

# Codex peer review — Milestone 2 (executed Resolution)

> **Read-only constraint (MANDATORY).** Codex MUST NOT modify any project source files or any prior section of this file (the brief, Gemini Response, Codex Review / Alternate Findings, Codex pre-execution review, Codex peer review — Milestone 1, or the Resolution body above). Codex's only allowed write surface is to append findings below this preamble. After owner approves dispositions, Claude proceeds to Milestone 3 (Item 3 Codex review packet at `codex/ios-review-prompt/<file>.md`).

## Review focus

Verify Milestone 2's gap-fill outputs are correctly anchored to Apple primary sources, the two ⚠️ dispositions (Danish localisation null + TestFlight detection demoted) are honest and acceptable, and the Resolution is ready to feed the Item 3 Codex review packet.

**Specifically, check:**

1. **Quota wording (Item 3) verbatim match.** Compare the Resolution's Item 3 quote against the actual `RequestReviewAction` clipping at `Obsidian Vault/50-Wiki/raw/apple/review/2026-05-08-request-review-action.md`. Does the v2 baseline's "treat-request-as-consumed regardless of display" align with the verbatim Apple wording (the if-rated-then-version-bumped-AND-365-days-elapsed branch)?
2. **No-callback claim (Item 2) load-bearing soundness.** Does the absence of a callback in the RequestReviewAction Topics list, plus the "App Store policy governs the actual display" wording, plus the Requesting article's "people can disable requests... ever," sufficiently support the v2 baseline's "treat-request-as-consumed" decision? Anything still missing?
3. **Heuristic anchor (Bonus 1) faithfully extracted.** Is the *"this number is arbitrary"* caveat correctly surfaced as validating the local-policy nature of `days_since_first_launch >= 3` and the 14-day cooldown? Does the M3 packet need to adopt `>= 4` as default with the caveat documented, or recommend a different anchor?
4. **Anti-pattern coverage (Item 5) sourcing.** 4 of 5 missing anti-patterns sourced to Apple HIG / Requesting article; 1 (feedback-vs-review conflation) is project-specific. Are any of the Apple-sourced quotes mis-attributed or stretched? Is the project-specific anti-pattern correctly scoped (not Apple-prescribed)?
5. **Guideline 5.6.1 (Bonus 2) verbatim.** Does the verbatim 5.6.1 wording match the clipped guidelines line 380–382? Is the cross-check on guideline 1.1 (Objectionable Content, no relation to reviews) sufficient to declare Gemini's 1.1.7 cite "provably wrong"?
6. **Danish localisation null disposition (Item 4).** Is the honest-null call appropriate, or did the search miss a quotable Apple sentence? Should the M3 packet do anything explicit (e.g. localise the FeedbackView call-to-action that's currently EN+DA) or accept "system-rendered prompt + standard iOS device-language localisation" as sufficient?
7. **TestFlight detection demotion (Item 7).** Is demoting the `sandboxReceipt` vs `AppTransaction` choice to a packet question acceptable, given that we have RequestReviewAction confirming the prompt-itself-is-no-op behavior on TestFlight? Or should M2 be considered incomplete until that's resolved?
8. **M1 patch retention.** Did the v2 plan post-M1-patch (profile-key conceptual definition + UserDefaults `Set` gotcha) survive the M2 edits intact? Any drift between the M1 patch wording and what's now in Part C Implementation notes?
9. **Wiki-pages workflow legitimacy.** This was the second project-validated use of the wiki-pages-as-primary-source pattern (after handover #1's printer audit recovery). Is the workflow being applied correctly here? Anything to formalise in `docs/ai-collab.md` for future research handovers?
10. **Readiness for M3.** Is the Resolution v2 + M1 patch + M2 outputs sufficient to draft a defensible Item 3 Codex review packet? What's the most likely M3 risk (e.g. cooldown duration, profile-key field list, critical-warnings filter)?

## What Codex should NOT do

- Do not propose new gap-fill items. M2 is closed; new gaps surfaced now go into the M3 packet's open questions.
- Do not re-litigate decisions already accepted in pass 1, pass 2, or pass 3 unless new evidence surfaces.
- Do not write Swift code. Implementation lives in the Item 3 packet (M3), not here.
- Do not modify the Resolution body. Append-only into this section.

## Output format

```
## Verdict
[approve / approve-with-modifications / request-changes — one short paragraph]

## Per-check findings
| Check # | Disposition | Notes |
|---|---|---|
| 1 (quota wording verbatim) | agree / modify / disagree | ... |
| 2 (no-callback load-bearing) | ... | ... |
| ... etc through 10 ...

## Concerns about the two ⚠️ dispositions
[one row per concern; specifically Item 4 null + Item 7 demotion]

## Recommendations for the Item 3 Codex review packet (M3)
[bulleted list of inputs / questions / framing notes the packet should carry forward]

## Final review position
[one short paragraph; should the owner green-light M3 as-is, with modifications, or roll back M2?]
```

*(Codex appends findings below.)*

## Verdict

approve — Milestone 2 is executed well enough to feed the Item 3 Codex review packet. The Apple primary-source anchoring is solid, both ⚠️ dispositions are honest and acceptable under the source-or-null rule, and the remaining risks belong in the M3 packet's open questions rather than back in M2.

## Per-check findings

| Check # | Disposition | Notes |
|---|---|---|
| 1 (quota wording verbatim) | agree | The quoted RequestReviewAction text matches the clipping: unrated/unreviewed users are capped at three displays within 365 days, while rated/reviewed users require a new app version and more than 365 days since the previous review. The v2 baseline's treat-request-as-consumed policy is compatible with this because the app cannot know which branch StoreKit applied. |
| 2 (no-callback load-bearing) | agree | The evidence is sufficient: RequestReviewAction exposes only `callAsFunction()` / environment value, Apple says App Store policy governs actual display, and users can disable prompts entirely. That is enough to justify storing request state locally even without display confirmation. |
| 3 (heuristic anchor) | agree | The `>= 4` completed-process anchor is faithfully extracted, including Apple's "this number is arbitrary" caveat. M3 should adopt `>= 4` as the default candidate while explicitly labeling `days_since_first_launch`, feedback cooldown, and local cooldown as 3dpa policy choices rather than Apple requirements. |
| 4 (anti-pattern coverage) | agree | The Apple-sourced anti-patterns are not overstretched. Feedback-vs-review conflation is correctly scoped as project-specific, not Apple-prescribed. Localisation pitfalls are reasonably closed by the Item 4 null disposition. |
| 5 (Guideline 5.6.1 verbatim) | agree | The 5.6.1 quote matches the clipped guideline and directly supports "use provided API" plus "custom review prompts disallowed." The cross-check against 1.1 is sufficient to call Gemini's 1.1.7 citation wrong for this topic. |
| 6 (Danish localisation null) | agree | The honest-null disposition is correct. The sources support "system-provided" prompt UI but do not explicitly guarantee Danish, so the M3 packet should avoid promising Danish-specific prompt localisation. No additional M2 gap-fill is needed. |
| 7 (TestFlight detection demotion) | agree | Demoting the detection mechanism to M3 is acceptable. RequestReviewAction already proves TestFlight request calls have no effect; choosing `sandboxReceipt` vs `AppTransaction.shared.environment` is implementation detail and should be adjudicated in the packet. |
| 8 (M1 patch retention) | agree | The M1 patch survived M2. Part C now includes both the expanded profile-key conceptual definition and the UserDefaults Set storage gotcha. No drift found. |
| 9 (wiki-pages workflow legitimacy) | agree | The workflow was applied correctly: Apple JS pages were clipped into vault raw files, then cited as primary-source captures. This pattern is worth formalising for future Apple/docs-heavy research, but that belongs in the AI Operating Model / docs hygiene track, not this M2 review. |
| 10 (readiness for M3) | agree | The executed Resolution is sufficient for a defensible M3 packet. The main M3 risks are policy choices, not research gaps: cooldown duration, profile-key field list, critical-warnings filter, and TestFlight detector implementation. |

## Concerns about the two ⚠️ dispositions

| Disposition | Concern | Recommendation |
|---|---|---|
| Danish localisation null | No blocker. The only risk is wording: avoid saying "Danish confirmed" in M3. | Use "system-provided StoreKit prompt; no app-provided DA strings; no Danish-specific Apple guarantee cited." |
| TestFlight detection demoted | No blocker. The prompt behavior is sourced; only build-distribution detection remains undecided. | Carry both detector candidates into M3 and require the packet to choose one after checking the AppTransaction source or local feasibility. |

## Recommendations for the Item 3 Codex review packet (M3)

- Frame `>= 4 distinct successful profile generations` as the Apple-sample-derived default, with the caveat that Apple calls the number arbitrary.
- Carry forward four explicit M3 decisions: local cooldown duration, profile-key field list, critical-warnings filter, and TestFlight detector choice.
- Avoid any Danish-specific claim; say StoreKit owns the system prompt UI and 3dpa does not provide prompt strings.
- Keep "store on request, not display" as a non-negotiable architecture rule unless M3 finds a real callback API, which current sources do not show.
- Include the wiki-pages-as-primary-source workflow as a short process note in the packet or later AI Operating Model notes, because it avoided the prior Gemini source failure mode.

## Final review position

Green-light Milestone 3. Do not reopen M2; the two warning dispositions are acceptable, and the remaining ambiguity is exactly what the Item 3 Codex review packet should adjudicate.
