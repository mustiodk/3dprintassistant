# Next session — cold-start prompt

**Last updated:** 2026-04-24 (early) — post HIGH-003 squash-merge + session close of [`2026-04-23-cowork-appdev-ir4-ir5-bundle.md`](2026-04-23-cowork-appdev-ir4-ir5-bundle.md).

**Phase:** IR-2a v1.0.2 **ship-execution pass** — all code is merged on both repos. Remaining work is exclusively owner-executed steps (tone-pass, version bump, TestFlight dispatch, webhook rotate, App Review submit).

This file is regenerated **only on owner ask** per rule locked 2026-04-23. A stale file between sessions is acceptable.

---

>>> START >>>

# Cold-start: 3D Print Assistant — v1.0.2 ship execution

## Project at a glance

**3D Print Assistant** generates optimized 3D printing profiles based on printer + material + nozzle + user goals. Two apps, one shared engine:

- **Web app** (`3dprintassistant.com`, repo `3dprintassistant/`) — live, Cloudflare Pages, auto-deploys from `main`. 64 printers, 12 brands, 18 materials, 9 nozzles, 3 slicers.
- **iOS app** (repo `3dprintassistant-ios/`) — **v1.0 live** in ~121 non-EU countries since 2026-04-16. EU distribution still blocked by DSA Trader Status (submitted 2026-04-16). Dark-only. **v1.0.2 fully merged on `main` but not yet dispatched to TestFlight.**
- **Engine** (`engine.js`) — single JS module, master in the web repo. Byte-identical to iOS via `cp` + committed on both sides after every engine edit. Runs on iOS through JavaScriptCore via `EngineService.swift` (since 2026-04-23: `final class` + serial `DispatchQueue`, per HIGH-003).
- **Owner:** Musti (solo hobbyist dev, mustiodk@gmail.com). MacBook Air, Claude Max plan, token-conscious. GitHub Actions on 2000 min/month (TestFlight workflow is manual-dispatch-only as of 2026-04-23).

**Hard external deadline:** April 28, 2026 — Apple's iOS 26 SDK cutoff for App Store submissions. CI runner already on `macos-26` + Xcode 26.2; builds will satisfy TMS-90725 automatically.

## What's in v1.0.2 (already shipped to `main`)

v1.0.2 is a large release. ~40+ findings from a 2026-04-20 internal review, plus the scope-expansion the owner chose to bundle in on 2026-04-23. Grouped by effect:

**User-visible:**
- `[CRITICAL-001]` iOS feedback now routes through `/api/feedback` Cloudflare Worker (HMAC-signed). Discord webhook URL no longer extractable from the iOS binary. HMAC secret is already deployed to all 3 places; round-trip verified.
- Warning messages name the actual printer instead of the generic "A1/A1 Mini" string (HIGH-012 + followups).
- New bed-temperature clamp + warning when printer capability is below material requirement (CRITICAL-002).
- Recovers gracefully from stale / invalid saved state instead of rendering empty output (CRITICAL-003).
- Surfaces silent slicer-pattern substitutions (HIGH-008, e.g. Prusa fine-quality Monotonic line → monotonic).

**Silent-correctness / drift prevention (IR-4 bundle, shipped via HIGH-003 external Codex review):**
- `EngineService` is now a `final class` + serial `DispatchQueue` instead of an `actor`, matching JSCore's mutual-exclusion contract. `assertOnEngineQueue()` debug guards catch off-queue misuse. Public API unchanged (still `async throws`; callers still `await`).
- Engine owns the slicer-layout tabs (`getSlicerTabs` / `getSlicerParamLabels`), display names (`getSlicerDisplayName`), filament tabs (`getFilamentTabs`), and nozzle-size resolution (`getNozzleSize`). 270+ lines of Swift static data deleted. Snapshot test locks the structure.
- `resolveProfile` output now has typed Codable decode on iOS (MEDIUM-009).
- Chips carry structured numeric `value` alongside `desc` (HIGH-011) — tests assert on the field, not via regex.
- `_validateSchema()` runs at engine init: critical→throw, soft→warn. Surfaces 16 soft warnings documenting `max_mvs[0.8]` data-entry gaps across 16 materials.

**Infrastructure:**
- `/api/feedback` Worker accepts iOS HMAC path + sanitises `@everyone`/`@here`/mention tags/markdown links.
- Cloudflare rate-limit rule `feedback-per-ip`: 2 req/10s per IP → Block 10s. Verified with curl flood.
- TestFlight GitHub Action switched from push-triggered to manual dispatch (was burning the Actions quota on every silent-correctness commit).

**External review kit preserved:** [`3dprintassistant-ios/docs/reviews/2026-04-23-high-003-codex/`](../../3dprintassistant-ios/docs/reviews/2026-04-23-high-003-codex/) — the full before/after/diff/prompt kit Codex reviewed across 3 passes before HIGH-003 merged.

**Test counts at merge:** web walkthrough 9/9 clean + 1 pre-existing (Combo 3), iOS XCTest **40/40 green**.

## Repo layout (paths you'll need)

```
/Users/mragile.io/Documents/Claude/Projects/
├── 3dprintassistant/                          ← WEB REPO (master)
│   ├── engine.js                              ← ALL business logic
│   ├── app.js                                 ← UI only
│   ├── index.html, style.css
│   ├── data/
│   │   ├── printers.json  materials.json  nozzles.json
│   │   ├── rules/environment.json  rules/objective_profiles.json
│   │   ├── rules/troubleshooter.json
│   │   └── rules/slicer_capabilities.json
│   ├── functions/api/feedback.js              ← /api/feedback Worker
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
│       ├── app-store-whats-new-v1.0.2.md      ← locked What's New draft (awaits tone pass)
│       └── 3rd-party-review/
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
│   │   ├── Views/
│   │   └── Utils/AppConstants.swift
│   ├── 3DPrintAssistantTests/                 ← 40 XCTests
│   ├── 3DPrintAssistantUITests/
│   ├── Config.xcconfig                        ← gitignored — SENTRY_DSN, DISCORD_FEEDBACK_WEBHOOK, FEEDBACK_HMAC_SECRET
│   ├── Config.xcconfig.template               ← tracked, empty values
│   ├── project.yml                            ← XcodeGen spec (bump CFBundleShortVersionString here)
│   ├── fastlane/Fastfile
│   ├── .github/workflows/testflight.yml       ← workflow_dispatch ONLY (2026-04-23 quota fix)
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

## Files to read in order before answering

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — top-level rules.
2. `3dprintassistant/docs/planning/ROADMAP.md` — **full file.** Pay attention to IR-2a section (the only one still in progress).
3. `3dprintassistant/docs/sessions/INDEX.md` — top 5 entries.
4. `3dprintassistant/docs/sessions/2026-04-23-cowork-appdev-ir4-ir5-bundle.md` — most recent session (HIGH-003 merge).
5. `3dprintassistant/docs/sessions/2026-04-23-cowork-appdev-ir5-backlog-sweep.md` — two sessions ago.
6. `3dprintassistant/docs/sessions/2026-04-23-cowork-appdev-ir2-cleanup-sweep.md` — three sessions ago.
7. `3dprintassistant/docs/app-store-whats-new-v1.0.2.md` — locked What's New draft (awaiting tone pass).

## Current state right now (2026-04-24)

**iOS app:** v1.0 live in ~121 non-EU countries. EU blocked by DSA. Announcement held until DK/EU unlocks.

**Web app:** live. All engine changes through IR-4 (incl. HIGH-003 refactor) landed on main.

**v1.0.2 code status:** **100% merged.** All Phase 0 + IR-4 + remaining IR-5 findings shipped. Worker HMAC live. Cloudflare rate-limit live. No pending code work.

**What remains to ship v1.0.2** (all owner-executed or Claude-on-ask):

### Ship sequence (owner execution, ~30 min total)

1. **Tone-pass on `docs/app-store-whats-new-v1.0.2.md`.** The current draft is generic-professional voice. Edit in place in your voice (Musti / Danish-style / casual / whatever feels right). Commit when done. Content is factual-locked; only voice changes. Alternatively: ask Claude to rewrite in a specific style.
2. **Bump `CFBundleShortVersionString`** → `1.0.2` in `3dprintassistant-ios/project.yml`, run `xcodegen generate`, commit + push to iOS main. Pushing alone does NOT trigger a build.
3. **Ask Claude to trigger TestFlight** (e.g. "trigger the build"). Claude confirms once then runs `gh workflow run testflight.yml --ref main` and reports the run URL + estimated 10-min wait. Autonomous sweeps NEVER trigger builds.
4. **TestFlight internal test round.** Install the uploaded build on a test device. Verify:
   - Send a feedback through the app → lands in Discord via the Worker path (not direct-to-Discord). Check Discord channel for the new-format footer ("via /api/feedback").
   - No crash on engine init (with/without a printer pre-selected).
   - `invalid_preset` warning surfaces if you feed stale saved state.
   - MK4 + Standard output no longer says "A1/A1 Mini" in the acceleration why-text.
5. **Rotate the old Discord webhook URL** *after* TestFlight confirms the Worker path. In Cloudflare Worker env: update `DISCORD_WEBHOOK_URL` to a freshly-created webhook on the same Discord channel. This invalidates the URL that's hardcoded in v1.0.0/v1.0.1 binaries — those users' in-app feedback will stop sending until they update to v1.0.2. Acceptable since v1.0.2 ships within days.
6. **Submit v1.0.2 to App Review** from App Store Connect with **Manual release** toggle. Paste tone-passed What's New. Screenshots: reuse v1.0.0 set (no UI changes in this release).
7. **On approval:** release manually. If EU DSA Trader Status has cleared by then, enable EU in rollout; otherwise ships to the same ~121 non-EU countries as v1.0.0.
8. **Day-1 monitoring:** Sentry Issues tab + Discord `#web-app-feedback` for first 24 h. The rate-limit rule + HMAC sanitisation should keep noise down.

### What to do if anything breaks at step 3 or 4

- **TestFlight build fails:** check the GitHub Actions run log for the dispatched workflow. Most-likely culprits: `FEEDBACK_HMAC_SECRET` missing from repo secrets (I verified it's there 2026-04-23 but spot-check), CI cert expired, Config.xcconfig template mismatch. Paste the log tail to Claude.
- **Build succeeds but feedback doesn't reach Discord:** compare the Worker's `FEEDBACK_HMAC_SECRET` env var to the GitHub repo secret — they must match. Run the curl round-trip test Claude used on 2026-04-23 to verify the Worker side works.

## After v1.0.2 ships — what's next

v1.0.2 is the last "internal-review-follow-up" release. Post-ship priorities are owner-driven and unscheduled:

- **IR-3 failure-mode rehearsal** (6 items) — incident drills: force engine.init throw on iOS, force `/api/feedback` 500, malformed-data preview deploy, rollback rehearsal, Sentry+CF baseline pull, runbook update. Owner deferred in favour of bundling IR-4+IR-5 into v1.0.2.
- **`[MEDIUM-019-followup]`** — domain-sourced `max_mvs` 0.8mm volumetric numbers for 16 mainstream materials + HIPS 0.2mm. Data-entry task; needs you to source from Bambu/Prusa/vendor specs.
- **`[LOW-005]` prc_0.2 siblings** — product-taste decision on whether Precision-nozzle variants should exist across all sizes.
- **Prusa Strength tab gap** — `wall_loops` isn't exposed in the Prusa layout despite having a label mapping. Pre-existing engine data gap surfaced by HIGH-006's snapshot test.
- **Light mode** — v1.1 candidate.
- **Export path re-enable** — HIGH-001, MEDIUM-006/008, LOW-007 + live Bambu Studio import test. LOW-003 (retraction naming collapse) unblocked HIGH-001 this session.

## First action in the next session

1. Read the files listed above, in order.
2. Confirm understanding. Report the current state (v1.0.2 100% code-merged, owner ship-sequence pending).
3. Ask the owner: which step of the ship sequence do you want to start with?
   - **Step 1: tone-pass What's New** (owner does, or ask Claude to rewrite in a specified voice)
   - **Step 2: version bump + push** (Claude can propose the edits; you approve)
   - **Step 3: dispatch TestFlight build** (Claude runs `gh workflow run ...` on explicit ask)
   - **Step 4+: testing + webhook rotate + submit** (owner-driven)
4. Execute per owner's pick. Don't drift — every action has a clear owner (`[You]` vs `[Claude on ask]`).

## Session process (don't drift)

- Propose diff in plain English before each edit. Wait for owner sign-off. Exception: session-scoped autonomous execution when owner authorises it (common for sweep patterns).
- One finding = one commit per platform. Web + iOS, matching subject.
- After every web `engine.js` or `data/*.json` edit: `cp` to iOS byte-identical → `node scripts/walkthrough-harness.js` → iOS XCTest (`xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant -destination "platform=iOS Simulator,id=59B628C6-C142-42ED-8CFC-E671FCB4C077" -only-testing:3DPrintAssistantTests CODE_SIGNING_ALLOWED=NO`).
- Commit trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. Never skip hooks.
- TestFlight CI is manual-dispatch-only — ask Claude to fire it at the right moment in the ship sequence.

## Acceptance for IR-2a phase close (v1.0.2 shipped)

- iOS v1.0.2 in Apple's "Ready for Sale" state (same reach as v1.0.0 at minimum).
- Old Discord webhook URL rotated; iOS binary no longer contains it (Worker path is the channel now).
- Cloudflare Rate Limiting rule + HMAC active on `/api/feedback`.
- Full iOS XCTest suite green (40/40 at merge, should remain 40/40 after any ship-time edits).
- ROADMAP IR-2a section fully ticked (will auto-tick once the submit is complete).

<<< END <<<

---

## How to maintain this file

- **This file is owner-triggered, not session-end-triggered.** Regenerate only when the owner explicitly asks (e.g. "update NEXT-SESSION", "refresh the kickoff", "I'm starting cold tomorrow").
- **The copy-paste block between the markers is the prompt to start the next session** — includes project overview, architecture, repo layout, standing rules, and task-specific context.
- **Owner action:** paste the block between markers into a new Cowork session. That's it.
