# Next session — cold-start prompt

**Last updated:** 2026-04-23 evening — post v1.0.2 App Review submission. Regenerated on explicit owner ask per the owner-triggered-only rule locked 2026-04-23.

**Phase:** IR-2a v1.0.2 **awaiting Apple review** (submitted 2026-04-23, typical 24–48h). No Claude-executable code work pending. Remaining owner steps: release on approval + day-1 monitoring.

A stale file between sessions is acceptable. Regenerate only on explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — post v1.0.2 submission

## Project at a glance

**3D Print Assistant** generates optimized 3D printing profiles based on printer + material + nozzle + user goals. Two apps, one shared engine:

- **Web app** (`3dprintassistant.com`, repo `3dprintassistant/`) — live, Cloudflare Pages, auto-deploys from `main`. 64 printers, 12 brands, 18 materials, 9 nozzles, 3 slicers.
- **iOS app** (repo `3dprintassistant-ios/`) — **v1.0 live** in ~121 non-EU countries since 2026-04-16. EU distribution still blocked by DSA Trader Status (submitted 2026-04-16). Dark-only. **v1.0.2 submitted to App Review 2026-04-23** — awaiting Apple approval; then Manual release.
- **Engine** (`engine.js`) — single JS module, master in the web repo. Byte-identical to iOS via `cp` + committed on both sides after every engine edit. Runs on iOS through JavaScriptCore via `EngineService.swift` (since 2026-04-23: `final class` + serial `DispatchQueue`, per HIGH-003).
- **Owner:** Musti (solo hobbyist dev, mustiodk@gmail.com). MacBook Air, Claude Max plan, token-conscious. GitHub Actions on 2000 min/month (TestFlight workflow is manual-dispatch-only).

**Hard external deadline:** April 28, 2026 — Apple's iOS 26 SDK cutoff for App Store submissions. v1.0.2 was built on macos-26 + Xcode 26.2, so the compliance requirement is already satisfied for this submission.

## State right now (2026-04-23 evening)

**iOS v1.0 (current live):** ~121 non-EU countries. EU blocked by DSA. Announcement held until DK/EU unlocks.

**iOS v1.0.2 (in review):**
- Submitted to App Review 2026-04-23 with **Manual release toggle**.
- Build: TestFlight upload from `gh workflow run testflight.yml --ref main` (run [24848532846](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/24848532846), SUCCESS).
- On-device smoke tests 4a–4e all green on real hardware.
- What's New: final casual English version locked at [`docs/app-store-whats-new-v1.0.2.md`](../app-store-whats-new-v1.0.2.md).
- Promotional Text: "Generate optimized 3D print profiles for 64 printers across 12 brands. Bambu, Prusa, Creality, and more."
- Expected Apple decision: 24–48h from submit (owner will get push + email).

**Web app:** live at 3dprintassistant.com. No pending code work. Worker + rate-limit + HMAC all live on `/api/feedback`.

**Post-v1.0.2 known issue (tracked, not blocking):**
- **`[CRITICAL-001-followup]`** — Worker routes iOS + web feedback to a single `DISCORD_WEBHOOK_URL` → `#web-app-feedback`. Original intent per 2026-04-16 session was iOS → `#ios-app-feedback`. Filed in IR-5 backlog. v1.0.3 scope: ~15 LoC branch on `payload.context.appSource === "ios"` + new Cloudflare secret `DISCORD_WEBHOOK_URL_IOS` + redeploy. Backend-only, no iOS binary change, no App Review re-submit.

## Branching on Apple's decision

The next session has three possible entry states. Ask the owner which one applies before deciding a first action:

### State A — Apple APPROVED v1.0.2

**First action:** confirm release timing and EU inclusion.

1. Ask owner: "Ready to release right now?" and "EU DSA cleared yet?"
2. If release now, EU-decision yes/no:
   - Owner opens ASC → iOS App → 1.0.2 → **Release This Version**.
   - If EU cleared: before releasing, check the **Pricing and Availability** tab — EU countries should be toggle-on. If not, toggle them on first, save, then release.
   - If EU still blocked: release as-is — v1.0.2 ships to the same ~121 non-EU countries as v1.0.0.
3. Immediately after release: open **day-1 monitoring** posture.
   - Keep Sentry Issues tab open for 24h. Watchlist: any new issue with `count > 1` in the first hour.
   - Keep `#web-app-feedback` Discord channel open for 24h. Note that iOS v1.0.2 feedback currently pools here (see `[CRITICAL-001-followup]`) — expect both iOS and web submissions in one lane.
   - Rate-limit rule + HMAC sanitisation should keep noise down. If abuse spikes, tighten the Cloudflare rule.
4. Optional: announcement pipeline (Discord general / Twitter / LinkedIn) — held until DK/EU unlocks per current owner policy, regardless of whether this release itself ships to EU.

### State B — Apple REJECTED v1.0.2

**First action:** triage the rejection.

1. Open the rejection notice in App Store Connect → Resolution Center. Read it in full before proposing fixes.
2. Classify:
   - **Metadata-only** (wording, screenshots, category, privacy policy) → fix in ASC, resubmit. No build change.
   - **Binary-level** (crash, permission missing, policy violation) → code change needed. Scope the fix as one finding, one commit per platform, run full `walkthrough-harness.js` + iOS XCTest before re-dispatching TestFlight.
3. Report back to owner with recommended path before executing.
4. Never resubmit on the same build number — re-dispatch TestFlight to get a fresh build.

### State C — Apple STILL PENDING (>48h)

**First action:** confirm with owner, then pick an unrelated task.

Pending >48h is normal on weekends. Don't panic.

Backlog options to pick from (ordered by payoff):

- **`[CRITICAL-001-followup]`** — iOS feedback routing fix (see above). Can be shipped any time; v1.0.3-safe but could be bundled with next release. ~1 h including Worker + CF secret + curl verification.
- **`[MEDIUM-019-followup]`** — domain-sourced `max_mvs` 0.8mm volumetric numbers for 16 mainstream materials + HIPS 0.2mm. Data-entry task, needs vendor spec lookups. ~2–3 h.
- **`[LOW-005]`** — product decision on whether `prc_0.2` Precision-nozzle variants should exist across all sizes. Owner needs to decide, then code is straightforward.
- **Prusa `wall_loops` Strength-tab gap** — pre-existing engine data gap surfaced by HIGH-006's snapshot test. Low priority but tracked.
- **IR-3 failure-mode rehearsal** — 6 items: force engine.init throw on iOS, force `/api/feedback` 500, malformed-data preview deploy, rollback rehearsal, Sentry+CF baseline pull, runbook update. Deferred per owner but can be picked up.
- **Export path re-enable** — HIGH-001, MEDIUM-006/008, LOW-007 + live Bambu Studio import test. LOW-003 retraction naming collapse already unblocked HIGH-001.

## Repo layout (paths you'll need)

```
/Users/mragile.io/Documents/Claude/Projects/
├── 3dprintassistant/                          ← WEB REPO (master)
│   ├── engine.js                              ← ALL business logic
│   ├── app.js                                 ← UI only
│   ├── index.html, style.css
│   ├── data/
│   │   ├── printers.json  materials.json  nozzles.json
│   │   └── rules/                             ← environment, objective_profiles, troubleshooter, slicer_capabilities
│   ├── functions/api/feedback.js              ← /api/feedback Worker (CRITICAL-001-followup lives here)
│   ├── worker.js  wrangler.toml               ← Worker entrypoint + config
│   ├── scripts/walkthrough-harness.js         ← 10-combo regression harness
│   ├── scripts/extract-correctness-tuples.js  ← MEDIUM-011 regen script
│   ├── scripts/validate-data.js
│   ├── locales/en.json  da.json
│   └── docs/
│       ├── planning/ROADMAP.md                ← single source of truth
│       ├── sessions/                          ← session logs + INDEX + this file
│       ├── reviews/2026-04-20-internal/       ← 59-finding internal review
│       ├── runbooks/incident-response.md
│       └── app-store-whats-new-v1.0.2.md      ← final casual version
│
├── 3dprintassistant-ios/                      ← iOS REPO
│   ├── 3DPrintAssistant/
│   │   ├── App/Info.plist                     ← SentryDSN, DiscordFeedbackWebhook, FeedbackAPIURL, FeedbackHMACSecret
│   │   ├── Engine/
│   │   │   ├── engine.js                      ← byte-identical sync from web
│   │   │   └── EngineService.swift            ← final class + serial queue (HIGH-003)
│   │   ├── Services/{DataService,FeedbackService}.swift
│   │   ├── Data/*.json                        ← byte-identical sync from web
│   │   ├── Models/
│   │   ├── Views/Home/HomeView.swift          ← has v1.0.2 (build) version footer
│   │   └── Utils/AppConstants.swift           ← appVersion + appBuildNumber computed props
│   ├── 3DPrintAssistantTests/                 ← 40 XCTests
│   ├── 3DPrintAssistantUITests/
│   ├── Config.xcconfig                        ← gitignored — SENTRY_DSN, DISCORD_FEEDBACK_WEBHOOK, FEEDBACK_HMAC_SECRET
│   ├── project.yml                            ← XcodeGen spec (MARKETING_VERSION: "1.0.2")
│   ├── fastlane/Fastfile
│   ├── .github/workflows/testflight.yml       ← workflow_dispatch ONLY
│   └── docs/
│       └── reviews/2026-04-23-high-003-codex/ ← HIGH-003 external review kit
│
└── CLAUDE.md                                  ← top-level rules — read this first
```

## Architecture notes you'll actually need

- **engine.js is the brain.** Public API: `resolveProfile`, `getWarnings`, `getChecklist`, `getAdvancedFilamentSettings`, `getAdjustedTemps`, `getFilamentProfile`, `getCompatibleNozzles`, `getFilters`, `getSymptoms`, `getTroubleshootingTips`, `calcPurgeVolumes`, `calcPrintTime`, `exportBambuStudioJSON`, `formatProfileAsText`, `getSlicerForPrinter`, `getSlicerDisplayName`, `getNozzleSize`, `getFilamentTabs`, `getSlicerTabs`, `getSlicerParamLabels`.
- **Web is master, iOS mirrors.** Edit `engine.js` or `data/*.json` on web first, `cp` to iOS (byte-identical), run walkthrough harness, run iOS XCTest, commit both sides with matching finding IDs in the subject.
- **iOS EngineService isolation model (post-HIGH-003):** `final class EngineService: @unchecked Sendable` — all state queue-pinned via `private let queue = DispatchQueue(label: "engine.js", qos: .userInitiated)`. Every public `async throws` method runs a private `sync_*` via `withCheckedThrowingContinuation`. `assertOnEngineQueue()` guards. **Don't reintroduce actor isolation** — JSCore requires serial access and Swift's actor doesn't pin to a single OS thread across suspension points. See the class header comment + the Codex review kit if you need the argument.
- **IMPL-040 single-source-of-truth:** UI chip numbers must be computed at render time from the same source `resolveProfile` reads. Never hardcode numbers in data `desc` fields. `getFilters(state)` returns chips with both `desc` (prose + number) and `value` (raw numeric) — tests prefer `value`. See `docs/specs/IMPL-040-chip-desc-parity.md`.
- **Slicer-aware output:** Bambu/Prusa/Orca each have different tab structures + param labels. Engine owns `SLICER_TABS` + `SLICER_PARAM_LABELS`; iOS receives them via bridge. PARAM_LABELS stay in English (they match the slicer UI exactly).
- **TestFlight is manual-dispatch only.** Pushing to iOS `main` does NOT build. When you want a build, either click **Run workflow** in the GitHub Actions tab or **ask Claude** ("trigger the build") — Claude confirms once then runs `gh workflow run testflight.yml --ref main`. Autonomous sweeps must never trigger a build.
- **Home-screen version footer (new 2026-04-23):** small muted `v1.0.2 (<build>)` line at the bottom of HomeView. Reads from `Bundle.main.infoDictionary`. Auto-updates with future version bumps via `$(MARKETING_VERSION)`.

## Standing rules (from CLAUDE.md — binding every session)

1. **Progress bar on every multi-step task:** `[🟩🟩⬜⬜⬜⬜ 40%] Step`. Owner wants this visible.
2. **Direct recommendations** — no endless options lists.
3. **ROADMAP is truth** — read it in full before reporting any project status. Tick checkboxes directly as items land.
4. **One finding = one commit per platform.** Web commit + iOS commit per finding. Never batch.
5. **Propose diff in plain English before each edit. Wait for owner sign-off per finding** — unless the owner explicitly authorises a session-scoped autonomous sweep.
6. **Chain mechanical tool calls.** For doc-close / sync-then-commit / multi-file rewrite loops, fire 5–10 tool calls in a single message then summarise.
7. **Test after every engine or data edit:** `cp` to iOS byte-identical → `node scripts/walkthrough-harness.js` → iOS XCTest.
8. **Never push iOS `main` if XCTest is red.** Free to push otherwise — TestFlight is manual-dispatch only.
9. **Commit message format:** `engine: <summary> [<FINDING-ID>]` / `iOS: …` / `data: …` / `worker: …`. Trailer must be `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. Never skip hooks.
10. **Data/logic change evaluation (MANDATORY):** every change must mention whether web + iOS UI need updates to best use the improvement.
11. **Md-hygiene sweep at session end** — checklist at bottom of CLAUDE.md.
12. **Right thing, not easy thing, post-live** — apply fixes to web + iOS both, never narrowed scope.
13. **NEXT-SESSION.md is owner-triggered only.** Session log + INDEX + ROADMAP still update every session end.
14. **Give Musti step-by-step guides for anything he needs to do manually.** Explicit, numbered, zero-jargon — established 2026-04-23.

## Files to read in order before answering

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — top-level rules.
2. `3dprintassistant/docs/planning/ROADMAP.md` — **full file.** Pay attention to IR-2a section (submitted to App Review).
3. `3dprintassistant/docs/sessions/INDEX.md` — top 5 entries.
4. `3dprintassistant/docs/sessions/2026-04-23-cowork-appdev-ship-v1.0.2.md` — most recent session (this one).
5. `3dprintassistant/docs/sessions/2026-04-23-cowork-appdev-ir4-ir5-bundle.md` — two sessions ago (HIGH-003 merge).
6. `3dprintassistant/docs/sessions/2026-04-23-cowork-appdev-ir5-backlog-sweep.md` — three sessions ago.

## First action in the next session

1. Read the files listed above, in order.
2. Ask the owner which of the three branching states applies (A: Apple approved, B: Apple rejected, C: Apple still pending).
3. Execute per the matching branch in "Branching on Apple's decision" above.
4. Progress-bar anything with 3+ steps.

## Session process (don't drift)

- Propose diff in plain English before each edit. Wait for owner sign-off. Exception: session-scoped autonomous execution when owner authorises it.
- One finding = one commit per platform. Web + iOS, matching subject.
- After every web `engine.js` or `data/*.json` edit: `cp` to iOS byte-identical → `node scripts/walkthrough-harness.js` → iOS XCTest (`xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant -destination "platform=iOS Simulator,id=59B628C6-C142-42ED-8CFC-E671FCB4C077" -only-testing:3DPrintAssistantTests CODE_SIGNING_ALLOWED=NO`).
- Commit trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. Never skip hooks.
- TestFlight CI is manual-dispatch-only — ask Claude to fire it at the right moment in the ship sequence.

## Acceptance for IR-2a phase close (v1.0.2 shipped to users)

- iOS v1.0.2 in Apple's "Ready for Sale" state (same reach as v1.0.0 at minimum).
- Day-1 monitoring window completed (24h clean Sentry + Discord).
- ROADMAP IR-2a section fully ticked including Release + Day-1 boxes.
- IR-2a moved to ✅ status in the IR-tracking table.

<<< END <<<

---

## How to maintain this file

- **This file is owner-triggered, not session-end-triggered.** Regenerate only when the owner explicitly asks (e.g. "update NEXT-SESSION", "refresh the kickoff", "I'm starting cold tomorrow").
- **The copy-paste block between the markers is the prompt to start the next session** — includes project overview, architecture, repo layout, standing rules, and task-specific context.
- **Owner action:** paste the block between markers into a new Cowork session. That's it.
