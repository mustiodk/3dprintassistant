# Audience-overlap survey design (v1) — **PARKED**

> **Status:** PARKED 2026-05-17 (post-problem-statement v3 reframe). **Not used for the resin-scaling discovery work.**
>
> **Why parked:** problem-statement v3 §2 reframed the audience for resin work as the owner himself, not 3dpa's users. Audience-overlap data among 3dpa users is irrelevant to the resin decision. There is no user-facing survey to run.
>
> **Why kept (not deleted):** the survey pattern itself — in-app banner triggered by engagement signal, multi-level question, no user/session/device IDs, pre-registered analysis plan with thresholds — is a viable template for future *general-purpose* feedback features 3dpa might add later. Worth keeping for reference.
>
> **Known issues if revived for a different purpose:** §3 (response taxonomy + event shape) and §8 (implementation scope) make an analytics-pipeline assumption that bridge round 1 caught as wrong — `/analytics` is a dashboard, NOT a response-capture surface; `/api/analytics` allowlists only 3 events. Any revival must reconcile against [`functions/api/analytics.js`](../../functions/api/analytics.js).
>
> **Purpose (historical, kept verbatim from v1):** Answer Gate 1 from problem-statement v2: of users actively engaged with 3dpa-web or 3dpa-iOS, what fraction own or regularly use at least one resin (MSLA / LCD) printer?
>
> **What this document was:** a delivery-ready survey spec — question text, response taxonomy, delivery channel, sample-size targets, decision thresholds.

---

## 1. The decision this data informs

| Result | Implication for the architecture decision |
|---|---|
| **<25% of respondents** own/use resin | Integrated path (D1/D2/D3) is wrong on audience grounds. The existing 3dpa audience won't engage with resin features. Decision narrows to **sibling product** or **no-go**. |
| **25–40%** | Ambiguous on audience grounds alone. Need Gate 2 (wizard-frame fit) before deciding integrated vs sibling. Possibly a second-round qualitative ask. |
| **>40%** | Integrated path is **justifiable on audience grounds**. Still need Gate 2 to confirm settings-advice is the right product shape for resin before committing. |

Thresholds are pre-registered here so the analysis can't be motivated-reasoning'd after the data lands. If owner wants to adjust thresholds post-hoc, that's a change to v2+ of this document and must be explicit.

## 2. The question

### Primary question (single-screen ask)

> **Which of these describes you?**
>
> - I own / regularly use one FDM (filament) printer
> - I own / regularly use multiple FDM printers
> - I own / regularly use FDM **and** resin (MSLA / LCD) printers
> - I own / regularly use resin printers only
> - I don't own a 3D printer right now — just exploring

Five mutually exclusive options. Sums cleanly:
- "Has any resin" = options 3 + 4 → drives the Gate 1 fraction
- "Has FDM only (single or multiple)" = options 1 + 2 → the FDM-loyal base
- "No printer" = option 5 → exploratory traffic (subtract from the base for Gate 1 math, or analyze separately)

### Why this shape (vs. binary)

- **Binary yes/no** captures the headline number but loses everything else. "Yes, my brother has a resin printer" answers yes but isn't decision-relevant.
- **Multi-level** disambiguates ownership intensity (single FDM vs multiple FDM) — proxy for engagement depth — and separates "exploring" responses out of the denominator.
- Five options is the max for a single-screen ask without becoming a form.

### What this question explicitly does NOT measure

- **Whether resin-owners would use 3dpa for resin advice.** Even at 40% overlap, users may go elsewhere for resin help. This is a separate question; possibly addressed by a follow-up qualitative round.
- **The unserved audience** (resin-owners who never visited 3dpa). The survey only reaches existing 3dpa users. Market-size estimation needs outside data.
- **Frequency of resin use.** "Regularly use" is subjective. A v2 of this survey could add a frequency follow-up if Gate 1 lands in the ambiguous zone.

## 3. Response taxonomy + event shape

Single new analytics event, consistent with existing privacy posture (no user/session/device IDs, no free text, no generated profile output):

```
event: audience_survey_response
value: "fdm_one" | "fdm_multiple" | "fdm_and_resin" | "resin_only" | "none"
appSource: "web" | "ios"
appVersion: <current>
```

That's the entire payload. Reuses the existing analytics pipeline ([`functions/api/analytics.js`](../../functions/api/analytics.js) on web; the iOS analytics client on iOS). No new privacy surface, no policy update needed.

## 4. Delivery channel

### Web

- **Placement:** small dismissible banner above the output panel, appearing on the **second profile generation** in a session (first generation is "I'm here to actually use the app" — don't interrupt; second generation signals real engagement).
- **Dismissal:** explicit dismiss button + auto-dismiss-on-response. localStorage flag `audience_survey_responded_v1` prevents re-display for the same browser instance.
- **Position:** above output, not modal — minimizes disruption.

### iOS

- **Placement:** dismissible card on `HomeView` after second `profile_generated` event in the app's lifetime (use existing AppStorage / UserDefaults flag).
- **Dismissal:** same model — explicit dismiss + auto-dismiss-on-response. `audienceSurveyRespondedV1: Bool` in UserDefaults.

### Both surfaces

- **Never re-show after dismissal.** Single response per device-instance. Yes, this means we lose the ability to re-ask on iteration; acceptable cost.
- **No nudge / no incentive.** Voluntary response only. Response-rate is itself a data point worth tracking.

## 5. Sample size + timeline

### Statistics

| Sample size | ±margin at 95% CI (binary "any resin" Y/N) |
|---|---|
| n=100 | ±10% |
| n=200 | ±7% |
| n=400 | ±5% |
| n=600 | ±4% |

**Target: n=400.** ±5% margin is tight enough to distinguish "<25% / 25-40% / >40%" decision regions without false confidence. n=200 is the floor; n=600 is overkill.

### Timeline

Depends on response rate × current traffic. **This is the largest unknown** — surfaced as an owner-ask: how many profile-generations per week does 3dpa currently see on web + iOS? Even rough order-of-magnitude lets us estimate weeks-to-n=400.

Rough estimate assuming 30% response rate (high for in-app surveys but plausible given engaged audience):
- 1000 profile-generations/week × 30% = 300 responses/week → n=400 in ~10 days
- 200 profile-generations/week × 30% = 60 responses/week → n=400 in ~7 weeks

The 30% assumption is itself uncertain. Sensitivity check after first week of data: if response rate is <10%, the survey design needs revision (more visible prompt, or shorter question).

## 6. Bias risks + mitigations

| Risk | Mitigation |
|---|---|
| **Self-selection bias** — enthusiasts more likely to respond | Track response rate; flag if <20% (likely heavily biased). |
| **Time-of-day / weekend bias** | Wait for at least 7 days of data before any analysis. |
| **Web vs iOS bias** — different audience profiles per surface | Analyze + report each surface separately as well as combined. |
| **"Exploring" overestimate** — option 5 might catch friends-of-friends-of-3dpa | Report the "any printer" subset alongside the full-base number. |
| **Question-order effect** — listing FDM options first could prime away from resin | Mitigation deferred; if Gate 1 result is close to threshold, randomize option order in v2 of the survey to test sensitivity. |
| **Recall bias** — "regularly use" is fuzzy | Accepted. v2 could split into "own" vs "use weekly" if needed. |

## 7. Pre-registered analysis plan

To prevent post-hoc rationalization:

1. **First reporting milestone: n=400 reached or 14 days elapsed, whichever first.** Snapshot the data, compute fractions per option per surface, write a one-page summary.
2. **Headline metric:** % of respondents in options 3+4 (any resin) ÷ (options 1+2+3+4) — i.e., resin-overlap among 3D-printer-owners. Option 5 ("exploring") excluded from the denominator.
3. **Secondary metric:** option-5 fraction itself — proxy for exploratory audience size.
4. **Per-surface breakdown:** same fractions computed for web-only and iOS-only.
5. **Decision call:** apply §1 thresholds. If ambiguous (25-40%), do **not** decide architecture; trigger Gate 2 (wizard-frame fit) work as the next blocking gate.

## 8. Implementation scope (for the eventual implementation session)

No code authored in this artifact. Scope sketch only:

- **Web:** ~50 LoC in `app.js` + ~30 LoC in `style.css` for the banner UI + Worker event in `functions/api/analytics.js` (one new event handler).
- **iOS:** ~40 LoC for the `HomeView` card + AppStorage flag + analytics client emission (mirroring existing event pattern).
- **Analytics:** new event registered in the dataset; dashboard at `/analytics` adds a "audience-survey" panel with the per-option counts.
- **Locales:** `en.json` + `da.json` keys for the survey copy.

Estimated total implementation: ~1 day of focused work across web + iOS. Bridge review + Codex packet on the implementation step itself (post-design-review pattern, per `docs/ai-collab.md`).

## 9. Open questions (carried into bridge round 2)

Things v1 is uncertain about, that bridge round 2 should pressure-test:

1. Is **multi-level on a single screen** the right shape, or is a **2-step micro-flow** (Q1: any printer? Q2: which?) better? Trade-off: micro-flow adds friction (lower response rate) but reduces question complexity.
2. Is **second profile generation** the right trigger, or should it be **third** (more signal of real engagement) or **first** (max exposure, but interrupts intent)?
3. Is the **30% response-rate assumption** defensible? Are there in-app survey benchmarks I should be citing?
4. The §6 "question-order effect" risk — should v1 already randomize, or is that overkill for a v1?
5. Is excluding option 5 ("no printer") from the Gate 1 denominator the right call? Could it itself be decision-relevant (e.g., if 40% of 3dpa traffic is exploratory, the audience may be much broader than current users)?
6. Web vs iOS — should the survey be shipped to **both surfaces simultaneously**, or **web-first as a test** before iOS deployment? Web is cheaper to iterate; iOS is push-gated.
7. Anything v1 missed that a future-me will regret not having captured in the survey before the data starts flowing in?

## 10. Bibliography

- Gate 1 definition: [`problem-statement.md`](problem-statement.md) §3.
- Existing analytics shape: [`../specs/analytics-v1.md`](../specs/analytics-v1.md)
- Analytics Worker handler: [`../../functions/api/analytics.js`](../../functions/api/analytics.js)
- Dashboard: [`../../analytics.html`](../../analytics.html) + Worker query handler
- Privacy posture context: [`../3dpa-context.md`](../3dpa-context.md) §"AI collaboration context" — analytics excludes identity-linked telemetry by design.
