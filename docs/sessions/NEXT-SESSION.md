# Next session — cold-start prompt

**Last updated:** 2026-04-23 (end of [`2026-04-23-cowork-appdev-ir2-cleanup-sweep.md`](2026-04-23-cowork-appdev-ir2-cleanup-sweep.md)). 10 findings shipped tonight + R8 schema validator + TestFlight workflow switched to manual-dispatch-only.

**Phase:** IR-2a v1.0.2 ship pass — code is COMPLETE, owner-activation + TestFlight + App Review pending. See section below.

This file is regenerated every session end. It contains everything needed to start a cold Cowork session without reading the rest of the docs first. The copy-paste block is between the `>>> START >>>` / `<<< END <<<` markers.

---

>>> START >>>

# Cold-start: 3D Print Assistant — IR-2a v1.0.2 ship pass

## Project at a glance

**3D Print Assistant** generates optimized 3D printing profiles based on printer + material + nozzle + user goals. Two apps, one shared engine:

- **Web app** (`3dprintassistant.com`, repo `3dprintassistant/`) — live, Cloudflare Pages, auto-deploys from `main`. 64 printers, 12 brands, 18 materials, 9 nozzles, 3 slicers.
- **iOS app** (repo `3dprintassistant-ios/`) — **v1.0 live** in ~121 non-EU countries as of 2026-04-16. EU distribution blocked by DSA Trader Status (submitted 2026-04-16, awaiting Apple verification). Dark-only for now.
- **Engine** (`engine.js`) — single JS module, master copy in the web repo. Byte-identical to iOS via `cp` + committed on both sides after every engine edit. Runs on iOS through JavaScriptCore (JSCore) via `EngineService.swift`.
- **Owner:** Musti (solo hobbyist dev, mustiodk@gmail.com). MacBook Air, Claude Max plan, token-conscious. GitHub Actions also tight — 2000 min/month plan.

**Hard deadline:** April 28, 2026 for all v1.0.2 release work.

## Repo layout (paths you'll need)

```
/Users/mragile.io/Documents/Claude/Projects/
├── 3dprintassistant/                          ← WEB REPO (master)
│   ├── engine.js                              ← ALL business logic (+ R8 _validateSchema as of 2026-04-23)
│   ├── app.js                                 ← UI only, no logic (MEDIUM-022 escHtml on innerHTML sites)
│   ├── index.html, style.css
│   ├── data/
│   │   ├── printers.json  materials.json  nozzles.json
│   │   ├── environment.json  objective_profiles.json
│   │   ├── warnings.json  troubleshooter.json
│   │   └── rules/slicer_capabilities.json
│   ├── functions/api/feedback.js              ← /api/feedback Cloudflare Worker (CRITICAL-001 + HIGH-010-A)
│   ├── worker.js  wrangler.toml               ← Worker entrypoint + config
│   ├── scripts/walkthrough-harness.js         ← Node regression harness (10 combos)
│   ├── scripts/validate-data.js               ← Data schema validator (run alongside harness)
│   ├── locales/en.json  da.json
│   └── docs/
│       ├── planning/ROADMAP.md                ← single source of truth for planning
│       ├── sessions/                          ← session logs + INDEX + this file
│       ├── reviews/2026-04-20-internal/       ← 59-finding internal review package
│       ├── runbooks/incident-response.md      ← solo-dev incident runbook
│       ├── app-store-whats-new-v1.0.2.md      ← locked "What's New" draft
│       ├── research/  specs/  prompts/
│       └── 3rd-party-review/                  ← external review kit (sent 2026-04-20)
│
├── 3dprintassistant-ios/                      ← iOS REPO (synced from web for engine + data)
│   ├── 3DPrintAssistant/
│   │   ├── App/Info.plist                     ← SentryDSN, DiscordFeedbackWebhook, FeedbackAPIURL, FeedbackHMACSecret
│   │   ├── Engine/
│   │   │   ├── engine.js                      ← byte-identical sync from web
│   │   │   └── EngineService.swift            ← JSCore bridge (actor) — MEDIUM-010 reset, OBS-006 polyfill
│   │   ├── Services/
│   │   │   ├── DataService.swift
│   │   │   └── FeedbackService.swift          ← routes to Worker (HMAC) or Discord fallback
│   │   ├── Data/*.json                        ← byte-identical sync from web
│   │   ├── Models/                            ← AppState, FeedbackCategory, etc.
│   │   ├── Views/                             ← SwiftUI screens
│   │   └── Utils/AppConstants.swift           ← URL config, feeds from Info.plist
│   ├── 3DPrintAssistantTests/                 ← 37 XCTests
│   ├── 3DPrintAssistantUITests/               ← screenshot capture UITest
│   ├── Config.xcconfig                        ← gitignored — SENTRY_DSN, DISCORD_FEEDBACK_WEBHOOK, FEEDBACK_HMAC_SECRET
│   ├── Config.xcconfig.template               ← tracked, empty values
│   ├── project.yml                            ← XcodeGen spec (CFBundleShortVersionString lives here)
│   ├── fastlane/Fastfile                      ← beta upload via ASC API key
│   ├── .github/workflows/testflight.yml       ← ⚠ workflow_dispatch-only as of 2026-04-23 (was push-on-main)
│   └── docs/                                  ← App Store metadata, screenshots (iphone/ + ipad/)
│
└── CLAUDE.md                                  ← TOP-LEVEL rules — read this first every session
```

## Architecture notes you'll actually need

- **engine.js is the brain.** `resolveProfile(state)` returns `{ paramId: { value, why, mode } }`. `getWarnings(state)` returns `[{ id, text, detail, fix }]` (structured, not HTML — see RB-1). Other public functions: `getFilters`, `getChecklist`, `getAdvancedFilamentSettings`, `getAdjustedTemps`, `getFilamentProfile`, `getCompatibleNozzles`, `getSymptoms`, `getTroubleshootingTips`, `calcPurgeVolumes`, `calcPrintTime`, `exportBambuStudioJSON`, `formatProfileAsText`.
- **Web is master, iOS mirrors.** Edit `engine.js` or `data/*.json` on web first, `cp` to iOS (byte-identical), run walkthrough harness, run iOS XCTest, commit both sides with matching finding IDs in the subject.
- **Purity invariants:** `resolveProfile` + `getWarnings` both stay pure of each other. The warning-emission logic sometimes duplicates the clamping math that `resolveProfile` uses — that's intentional (e.g. CRITICAL-002 bed-temp, CRITICAL-003 preset IDs). Don't "DRY up" without reading the session log for why.
- **IMPL-040 single-source-of-truth:** UI chip numbers MUST be computed at render time from the same source `resolveProfile` reads. Never hardcode numbers in data `desc` fields. See `docs/specs/IMPL-040-chip-desc-parity.md`. MEDIUM-004 `_fmtLayer` + LOW-010 unified `_SUPPORT_TYPES` both reinforce this invariant.
- **R8 `_validateSchema()` runs at init.** Two-tier: critical→throw (unknown `printer.series`, bad `limits_override.nozzles` keys, missing required material fields), soft→warn (unknown `nozzle.not_suitable_for` refs, `max_mvs` key gaps vs `k_factor_matrix`). Idempotent via `_schemaValidated` flag. Current data: 0 critical, 16 soft (documenting MEDIUM-019-followup).
- **Slicer-aware output:** Bambu/Prusa/Orca each have different tab structures + param labels. `SLICER_TABS` + `SLICER_PARAM_LABELS` in engine.js. PARAM_LABELS stay in English (they match the slicer UI exactly).
- **patternFor + mapForSlicer:** engine emits canonical names ("Monotonic line"), `mapForSlicer` translates to slicer-specific valid values using `slicer_capabilities.json`. Falls back to `validSet[0]` when no match — C6 warning loop (extended via HIGH-008) surfaces those substitutions.
- **JSCore thread-affinity:** `EngineService` is `actor` — known hazard flagged in HIGH-003 (deferred to v1.1). Don't worry for v1.0.2; do worry if you touch the init path.
- **Info.plist → AppConstants.swift pattern:** all config (Sentry DSN, feedback URLs, secrets) flows `Config.xcconfig` → `Info.plist` `$(VAR)` → `AppConstants.swift` Bundle lookup → consumer code. Keeps secrets out of binary source.
- **TestFlight CI is now manual-dispatch-only.** `push: branches: [main]` was removed 2026-04-23 after GitHub Actions quota hit 100%. Owner asks Claude to trigger ("build it" / "dispatch the build") and Claude confirms once before firing `gh workflow run testflight.yml --ref main`. Claude must never auto-trigger during sweeps. Added `concurrency: cancel-in-progress` so repeat dispatches don't stack.

## Standing rules (from CLAUDE.md — binding every session)

1. **Progress bar on every multi-step task:** `[🟩🟩⬜⬜⬜⬜ 40%] Step`. Owner wants this visible.
2. **Direct recommendations** — no endless options lists.
3. **ROADMAP is truth** — read it in full before reporting any project status. Tick checkboxes directly as items land.
4. **One finding = one commit per platform.** Never batch. Web commit + iOS commit per finding.
5. **Propose diff in plain English before each edit. Wait for owner sign-off per finding** — unless the owner explicitly authorises a session-scoped autonomous sweep (common pattern for overnight work; see 2026-04-22 + 2026-04-23 session logs for examples).
6. **Chain mechanical tool calls.** For doc-close / sync-then-commit / multi-file rewrite loops, fire 5–10 tool calls in a single message then summarise. Don't stop after every single tool call.
7. **Test after every engine or data edit:** `cp` to iOS byte-identical → `node scripts/walkthrough-harness.js` (from web repo root) → iOS XCTest.
8. **Never push iOS `main` if XCTest is red.** (Separately: iOS `main` pushes no longer auto-trigger TestFlight — dispatch manually when ready.)
9. **Commit message format:** `engine: <summary> [<FINDING-ID>]` / `iOS: …` / `data: …` / `worker: …`. Trailer must be `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. Never skip hooks (`--no-verify`), never amend published commits.
10. **Data/logic change evaluation (MANDATORY):** every change must mention whether web + iOS UI need updates to best use the improvement.
11. **Md-hygiene sweep at session end** — see checklist at bottom of CLAUDE.md.
12. **Right thing, not easy thing, post-live** — apply fixes to web + iOS both, never narrowed scope.

## Files to read in order before answering

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — standing rules (always read first).
2. `3dprintassistant/docs/planning/ROADMAP.md` — **full file.** Pay attention to IR-2a section.
3. `3dprintassistant/docs/sessions/INDEX.md` — skim top 5 entries.
4. `3dprintassistant/docs/sessions/2026-04-23-cowork-appdev-ir2-cleanup-sweep.md` — last session log (most recent).
5. `3dprintassistant/docs/sessions/2026-04-23-cowork-appdev-ir2a-engine-sweep.md` — two-sessions-ago (IR-2a engine sweep).
6. `3dprintassistant/docs/sessions/2026-04-22-cowork-appdev-ir0-sweep.md` — three-sessions-ago (IR-0 context).
7. `3dprintassistant/docs/reviews/2026-04-20-internal/01-critical.md` — re-read `[CRITICAL-001]` specifically.
8. Any review file the task-at-hand references.

## Current state right now (2026-04-23, late)

**iOS app:** v1.0 live in ~121 non-EU countries. EU blocked by DSA. Announcement held until DK/EU unlocks.

**Web app:** live. All engine correctness through IR-0 + IR-2a + IR-2 code is landed.

**v1.0.2 code status:** **COMPLETE + HARDENED.** On top of yesterday's 13 findings, tonight shipped:
- **Engine correctness / drift resistance:** MEDIUM-004 (_fmtLayer parity), LOW-010 (unified support table), MEDIUM-004, R8 schema validator at init.
- **Data hygiene:** MEDIUM-017 (dead condition_warnings deleted), MEDIUM-019 partial (5 materials gain explicit `max_mvs["0.2"]: null` for CF/PA/PC incompat).
- **iOS reliability:** MEDIUM-010 (init-reset), LOW-009 (da.json presence test), OBS-006 (console polyfill).
- **Security / failure resistance:** MEDIUM-022 (5 escHtml sites in app.js), LOW-008 (soft-fail non-critical init files).
- **CI infrastructure:** TestFlight workflow switched to `workflow_dispatch`-only + concurrency cancel.

37/37 iOS XCTest green. Walkthrough 9 clean + 1 pre-existing (Combo 3, unchanged since IR-0). R8 emits 16 soft warnings at init — **not a regression**, documents the MEDIUM-019-followup gap (max_mvs 0.8 needs domain data).

**What's left for v1.0.2 to actually ship** (the entire task for the next session):

### Owner secret config (5 min)

- Generate HMAC secret: `openssl rand -hex 32`. Save this value in 3 places:
  1. Cloudflare dashboard → Workers & Pages → `3dprintassistant` → Settings → Environment Variables → add `FEEDBACK_HMAC_SECRET` (Production).
  2. GitHub → `mustiodk/3dprintassistant-ios` → Settings → Secrets and variables → Actions → add `FEEDBACK_HMAC_SECRET`.
  3. Local: edit `3dprintassistant-ios/Config.xcconfig` — fill in `FEEDBACK_HMAC_SECRET = <value>`.

### Owner dashboard config (5 min)

- `[HIGH-010 part B]` — Cloudflare dashboard → Security → WAF → Rate Limiting Rules → new rule targeting `/api/feedback`: 10 requests per minute per IP, plus a second global rule at 100 req/min. Action: block for 1 min.

### Owner decisions (Track 1)

- `[HIGH-014]` — Bambu A1 mini product page lists `max_bed_temp` as? (80 or 100°C). If 80, patch `data/printers.json` + the CRITICAL-002 bed-clamp auto-fires on Combo 5 (A1 mini + PETG).
- `[LOW-002]` — HIPS `enclosure_behavior.reason` text. Currently copy-pasted from ABS. Give me one sentence for HIPS specifically and I'll commit it.
- `[MEDIUM-018 part B]` — unify `nozzles.json` `not_suitable_for` via material **IDs** (e.g. `pla_cf`, `petg_cf`) or **group strings** (e.g. `pla`, `petg`)? Currently mixed.
- `[MEDIUM-019-followup]` (new) — domain-sourced volumetric capacity numbers for `max_mvs["0.8"]` on 16 mainstream materials + `max_mvs["0.2"]` on HIPS. Not a ship blocker; documents a data-entry pass when you have the source. R8 soft warnings surface the gap.

### Ship sequence (owner execution, ~30 min total)

1. Tone-pass on `docs/app-store-whats-new-v1.0.2.md` — edit in place, commit.
2. Bump `CFBundleShortVersionString` → `1.0.2` in `3dprintassistant-ios/project.yml`, run `xcodegen generate`, commit + push.
3. **Ask Claude to trigger the TestFlight build.** Claude confirms once, runs `gh workflow run testflight.yml --ref main`, and reports the run URL. Workflow no longer auto-runs on push (2026-04-23 CI-quota fix). Build takes ~10 min. Claude must NEVER trigger a build during an autonomous sweep — only on explicit owner ask in a foreground turn.
4. Install the TestFlight build, submit one feedback through the app, confirm it lands in Discord via the Worker (not direct).
5. **Rotate old Discord webhook URL** (the one in GitHub secret `DISCORD_FEEDBACK_WEBHOOK` + Cloudflare env var). Create a new webhook on the same Discord channel, update both env var locations. The old URL hardcoded in v1.0.0/v1.0.1 binaries becomes dead — those binaries stop sending feedback until users update to v1.0.2.
6. Submit v1.0.2 to App Review with **Manual release** toggle.
7. If EU DSA Trader Status has cleared by then, enable EU in rollout. Otherwise ships to ~121 non-EU countries (same as v1.0.0).
8. Day-1 monitoring: Sentry Issues tab + Discord feedback channel for first 24 h.

## First action in the next session

1. Read the files listed above, in order.
2. Confirm understanding of current state + what's pending.
3. Ask the owner: which track do you want first?
   - **Track A:** secret config + rate limit rule (unblocks v1.0.2 ship).
   - **Track B:** Track 1 owner-asks (HIGH-014 / LOW-002 / MEDIUM-018-B).
   - **Track C:** version bump + manual TestFlight dispatch + App Review submit.
   - **Track D:** something else (post-v1.0.2 Phase 2 polish, feedback responses, IR-3/IR-4, MEDIUM-019-followup if data arrives).
4. Execute per owner's pick.

## Session process (don't drift)

- Propose diff in plain English before each edit. Wait for owner sign-off per finding. Exception: owner may grant session-scoped autonomous execution (overnight-sweep pattern); if so, execute end-to-end with progress updates.
- One finding = one commit per platform. Web commit + iOS commit, matching subject.
- After every web `engine.js` or `data/*.json` edit: `cp` to iOS byte-identical → `node scripts/walkthrough-harness.js` → iOS XCTest (`xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant -destination "platform=iOS Simulator,id=59B628C6-C142-42ED-8CFC-E671FCB4C077" -only-testing:3DPrintAssistantTests CODE_SIGNING_ALLOWED=NO`).
- Commit trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. Never skip hooks.
- **Batch mechanical tool calls** — don't stop after every Edit. Chain 5–10 calls per turn on doc-close / sync-then-commit / multi-file rewrite loops.
- **iOS `main` pushes no longer auto-trigger TestFlight.** You can push freely during dev without burning Actions minutes. When you want a TestFlight build, ask Claude ("trigger the build"); Claude confirms once and fires the dispatch. Never during autonomous sweeps.

## Acceptance for IR-2a phase close

- iOS v1.0.2 in Apple's "Ready for Sale" state (same country reach as v1.0.0 at minimum).
- Cloudflare Worker env `FEEDBACK_HMAC_SECRET` is set; TestFlight confirms iOS feedback routes through it.
- Old Discord webhook URL rotated (new URL known only to Worker env, never in a binary).
- Cloudflare Rate Limiting rule active on `/api/feedback` — curl-flood test confirms 429 at threshold.
- Full iOS XCTest suite still green (≥ 37/37).
- ROADMAP IR-2a section fully ticked; this file regenerated.

<<< END <<<

---

## How to maintain this file

- **Every session end**, this file is rewritten. It should contain everything needed to start a cold Cowork session without reading the rest of the docs first.
- **The copy-paste block between the markers is the prompt to start the next session** — it includes project overview, architecture, repo layout, standing rules, and task-specific context.
- **Update the "Last updated" date + the "Current state right now" section** every session.
- **Owner action: paste the block between markers into a new Cowork session.** That's it.
