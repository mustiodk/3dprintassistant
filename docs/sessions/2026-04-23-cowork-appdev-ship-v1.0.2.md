# 2026-04-23 — Cowork (appdev): v1.0.2 ship sequence (submitted to App Review)

## Durable context

What a future session needs that ROADMAP doesn't capture:

- **Mid-session scope expansion: Home-screen version-display footer.** Owner asked for a visible version indicator between step 2 (version bump) and step 3 (TestFlight dispatch). Motivation: TestFlight testers need to tell builds apart at a glance without digging into App Store Connect metadata. Implementation is two parts: (a) `AppConstants.appVersion` + `AppConstants.appBuildNumber` computed props reading `CFBundleShortVersionString` + `CFBundleVersion` from `Bundle.main.infoDictionary`, (b) a small muted `Text("v\(appVersion) (\(buildNumber))")` at the bottom of HomeView's footer VStack, `.font(.system(size: 11))` + `.foregroundStyle(ColorTheme.textSecondary.opacity(0.6))`. Shows as e.g. `v1.0.2 (202604240123)`. Build number format is `YYYYMMDDHHMM` generated at archive time by the `Auto Build Number (archive only)` preBuildScript. 40/40 XCTest still green. This is now a permanent UX element — don't remove without owner consent.

- **`[CRITICAL-001-followup]` Worker feedback routing: discovered during step 5 webhook rotation.** The Cloudflare Worker at `functions/api/feedback.js` uses a single `DISCORD_WEBHOOK_URL` env var for BOTH iOS and web feedback — branching is only in the footer format, not the destination. Current state points to `#web-app-feedback`, which means iOS v1.0.2 feedback pools into the web channel. The original design intent (per 2026-04-16 session log: "`#ios-app-feedback` and `#web-app-feedback` share category schema") was for iOS to land in `#ios-app-feedback`. **Three options were considered:** (1) accept pooling for v1.0.2, fix in v1.0.3 — CHOSEN, (2) fix Worker routing now before shipping v1.0.2 — rejected to avoid re-test cycle on already-green TestFlight build, (3) retire `#ios-app-feedback` entirely — rejected. Filed in IR-5 backlog. v1.0.3 scope: ~15 LoC branching on `payload.context.appSource === "ios"` to a new `DISCORD_WEBHOOK_URL_IOS` Cloudflare secret + redeploy. Backend-only fix — no iOS binary change, no App Review re-submission.

- **Old `#ios-app-feedback` webhook deleted 2026-04-23.** The URL that was hardcoded in v1.0.0/v1.0.1 iOS binaries is now invalid. Attack surface from those old binaries is closed. Consequence: any user still on v1.0.0/v1.0.1 who taps "Send feedback" in the app silently 404s — acceptable because v1.0.2 is in Apple's review queue and ships within days. Owner hit a transient Discord server error on the first delete attempt; second attempt (after page refresh) succeeded.

- **Step 4 `invalid_preset` warning was not synthetically triggered.** Accepting indirect signals (engine init passes + restore-from-state works cleanly) as sufficient proof of CRITICAL-003 behaviour. To force-trigger for future verifications, the tester would need to edit `UserDefaults` directly to reference a nonexistent printer/material/nozzle ID, which is skipping-level friction for on-device testing. If we ever need a harder test, consider adding a debug-only toggle in the app or a UI test that sets up stale state via `launchEnvironment`.

- **Apple App Store Connect form: Promotional Text updates do NOT require re-submission.** Owner chose option C1 for v1.0.2: "Generate optimized 3D print profiles for 64 printers across 12 brands. Bambu, Prusa, Creality, and more." (104 chars, well under 170). This field can be updated anytime post-release without a new build or review. What's New tone-pass went with casual short English ("Mostly a behind-the-scenes tune-up…" + 6 user-visible bullets + thanks-close). Final content locked in `docs/app-store-whats-new-v1.0.2.md`.

- **TestFlight workflow is manual-dispatch-only.** Dispatched via `gh workflow run testflight.yml --ref main` from the iOS repo. Run [24848532846](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/24848532846), SUCCESS. Owner asked Claude to fire the dispatch ("go") — the protocol requires Claude confirm once before firing, which held. Autonomous sweeps must still NEVER trigger a build.

- **ROADMAP / session-log cadence rule held all session.** Session log + INDEX + ROADMAP updated this session-close per the mandatory protocol. NEXT-SESSION.md regenerated **only because owner explicitly asked** ("update the project, roadmap and next session log") — matches the 2026-04-23 owner-triggered-only rule. First test of that rule in an end-of-session context: worked cleanly.

## Context

Session entry point: owner asked to read NEXT-SESSION.md and then executed the v1.0.2 ship sequence end-to-end in a single sitting. NEXT-SESSION.md had all 8 steps pre-staged from the prior IR-4/IR-5 bundle session, which turned out to be correct: sequence ran without re-planning.

## What happened / Actions

Order of execution:

1. **Step 1 — What's New tone-pass.** Read existing draft at `docs/app-store-whats-new-v1.0.2.md`, diffed against IR-4/IR-5 bundle scope, confirmed only `[LOW-003]` retraction collapse was missing from the draft. Owner requested "casual short English" — produced 6-bullet version (~530 chars), replaced the locked draft in-place.

2. **Step 2 — Version bump.** Edited `project.yml` line 12: `MARKETING_VERSION: "1.0.1"` → `"1.0.2"`. Ran `xcodegen generate` — regenerated `3DPrintAssistant.xcodeproj/project.pbxproj` (2 lines: Debug + Release configs). Committed + pushed: iOS `11b9c8d`. TestFlight did NOT auto-build (manual-dispatch only, as intended).

3. **Mid-session scope add — Home-screen version display.** Owner asked for a visible version indicator before proceeding to TestFlight dispatch. Added `appVersion` + `appBuildNumber` computed props to `AppConstants.swift`; added a small muted line below the Send-feedback button in HomeView footer. Ran 40/40 XCTest — all green. Committed + pushed: iOS `15c1002`.

4. **Step 3 — TestFlight dispatch.** Ran `gh workflow run testflight.yml --ref main` after owner "go". Reported run URL back. Run completed SUCCESS ~10 min later.

5. **Step 4 — On-device smoke tests.** Pre-staged a 4a–4e checklist (install + home-screen version visible, feedback via Worker confirmed via Cloudflare Logs, no crash on engine init warm + cold, MK4 acceleration why-text names MK4). All 5 steps came back green from owner.

6. **Step 5 — Discord webhook rotation.** Original procedure assumed Worker URL pointed to `#ios-app-feedback`. Owner's step-4b result (feedback landed in `#web-app-feedback`, not `#ios-app-feedback`) exposed the routing bug — filed as `[CRITICAL-001-followup]` in IR-5 backlog. Chose Option 1 (ship v1.0.2 as-is, fix in v1.0.3). Simplified step 5 to just "delete the old `#ios-app-feedback` webhook". Owner hit a transient Discord server error on first attempt; second attempt succeeded after page refresh.

7. **Step 6 — App Review submission.** Pre-staged full step-by-step (6a–6k) covering new version creation, What's New paste, screenshots (leave alone), Promotional Text (offered A/B/C options — owner picked C1), description/keywords/age/category (leave alone), build selection, export compliance (same as v1.0.1: yes uses encryption, yes qualifies for exemption 15 CFR 740.17(b)(3)(iv)), Version Release (**Manual** — critical), Save + Add for Review + IDFA (no) + Submit. Owner back with "submitted for review".

8. **Session close** — this log + INDEX + ROADMAP status tick + NEXT-SESSION regeneration (owner-asked).

## Files touched

### Web (`3dprintassistant`)

**Modified (committed in session-close):**
- `docs/planning/ROADMAP.md` — added `[CRITICAL-001-followup]` in IR-5 backlog; ticked all Release mechanics boxes in IR-2a; updated Last-updated header + IR-tracking row + section title.
- `docs/app-store-whats-new-v1.0.2.md` — tone-pass to final casual English version.

**Untracked (promoted in session-close):**
- `docs/sessions/2026-04-23-cowork-appdev-ship-v1.0.2.md` (this log)
- `docs/sessions/INDEX.md` — prepended bullet.
- `docs/sessions/NEXT-SESSION.md` — regenerated for post-submission state.

### iOS (`3dprintassistant-ios`)

**Modified (committed in-session):**
- `project.yml` — `MARKETING_VERSION: "1.0.1"` → `"1.0.2"` (commit `11b9c8d`).
- `3DPrintAssistant.xcodeproj/project.pbxproj` — regenerated by xcodegen (commit `11b9c8d`).
- `3DPrintAssistant/Utils/AppConstants.swift` — added `appVersion` + `appBuildNumber` computed props (commit `15c1002`).
- `3DPrintAssistant/Views/Home/HomeView.swift` — added version-display footer line (commit `15c1002`).

**Untracked at session start (not promoted in this session):**
- `docs/reviews/2026-04-23-high-003-codex/06-single-paste.pdf` — leftover from the HIGH-003 review kit. **Md-hygiene sweep flags this** — see Open questions.

## Commits

**iOS (`3dprintassistant-ios`) — 2 commits this session, pushed to `main`:**
- `11b9c8d` — `iOS: bump MARKETING_VERSION to 1.0.2 for v1.0.2 ship`
- `15c1002` — `iOS: show app version + build number on Home screen`

**Web (`3dprintassistant`) — session-close commit (pending at time of log write):**
- Single commit bundling ROADMAP update + tone-passed What's New + this session log + INDEX.md + NEXT-SESSION.md.

## Data/logic change evaluation (standing rule)

- **Version bump + xcodegen:** zero logic change. Marketing metadata only. No web counterpart (web has no discrete version).
- **Home-screen version display:** iOS-only UI addition. No engine touch, no data touch, no tests affected. Web app has no equivalent planned — continuously deployed, no natural "version" surface. Separate product decision if ever wanted.
- **What's New tone pass:** metadata-only, App Store presentation layer. No code change.
- **Worker webhook URL rotation (Discord side):** backend infra only, no code change. Worker's `DISCORD_WEBHOOK_URL` env var was **not** touched — that continues to serve the Worker path for v1.0.2 feedback.
- **App Review submission:** metadata-only. No code change.
- **`[CRITICAL-001-followup]` filed in IR-5:** v1.0.3 scope (no iOS binary change, Worker + CF secret change only).

## Walkthrough harness / XCTest result

- **iOS XCTest:** 40/40 green after Home-screen version-display commit. No engine edits this session, so walkthrough harness was not re-run (last run 2026-04-23 afternoon after HIGH-003 merge: 9/9 clean + Combo 3 pre-existing).

## Md-hygiene sweep

1. **Root stubs:** none in web repo. `mockup_e_nøglekort.png` at web repo root is **untracked** — unrelated to 3dpa, likely a stray file from an adjacent project. Flagged to owner; do not silently commit or delete.
2. **Untracked-but-should-be-tracked:** this session log, INDEX update, NEXT-SESSION regeneration — all promoted in session-close commit.
3. **Secrets in tree:** clean. `Config.xcconfig` remains gitignored. No `.p8`/`.mobileprovision`/webhook URLs in tracked files.
4. **Content buried in session log:** promoted `[CRITICAL-001-followup]` finding + `appVersion`/`appBuildNumber` pattern + Worker-routing discovery to Durable context (future sessions need these before touching the Worker or home screen).
5. **Stale ROADMAP sections:** none introduced. IR-2a updated to reflect submission.
6. **Duplicate specs:** none added.
7. **iOS untracked artefact:** `docs/reviews/2026-04-23-high-003-codex/06-single-paste.pdf` (binary PDF version of the Codex single-paste review input). Left from prior session. **Decision needed:** commit (preserves the exact input Codex reviewed) or gitignore + delete. Flagged in Open questions.

## Open questions / owner asks

- **PDF review artefact (`docs/reviews/2026-04-23-high-003-codex/06-single-paste.pdf`)** — commit it (audit preservation) or gitignore the file extension in `docs/reviews/`? Other 5 files in that review kit are tracked `.md` / `.swift` / `.patch` / `.txt` — PDF is the odd one out. Owner decide at next session.
- **Unrelated file at web repo root: `mockup_e_nøglekort.png`** — looks like a non-3dpa design asset. Owner: delete it, move it into its actual project, or confirm it belongs here?
- **When Apple approves v1.0.2:** decide EU inclusion at that moment based on DSA Trader Status state.
- **Post-release:** schedule `[CRITICAL-001-followup]` for v1.0.3. Bundle with any other Worker-side changes if accumulated.

## Next session

Most likely state when owner returns: Apple has reviewed v1.0.2.

**If Apple approved:** execute step 7 (release manually) + step 8 (day-1 monitoring). NEXT-SESSION.md reflects this path.

**If Apple rejected:** triage the rejection notice from ASC, decide if it needs a code change or a metadata fix, re-submit. NEXT-SESSION.md has a branch for this too.

**If Apple still pending:** unrelated work — pick from IR-5 backlog items (`[CRITICAL-001-followup]`, `[MEDIUM-019-followup]` 0.8mm max_mvs domain-sourcing, `[LOW-005]` prc_0.2 siblings, Prusa `wall_loops` tab gap) or start IR-3 failure-mode rehearsal.

NEXT-SESSION.md was regenerated this session-close per explicit owner ask.
