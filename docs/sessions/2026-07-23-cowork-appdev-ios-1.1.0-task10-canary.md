# 2026-07-23 — Cowork (appdev): iOS 1.1.0 Task 10 — G0 executed, dark deploy, device canary, Task 11 authorized

## Durable context

- **Task 10 is complete and the owner authorized Task 11.** The full gate
  record lives in `docs/planning/IOS-1.1.0-GATE-LEDGER.md`; this log carries
  the why/how that the ledger doesn't.
- **The canary gate caught two real iOS defects that every prior review
  (hostile bridge review + confirmation GO + 177 green tests) had missed** —
  both were only observable on a physical device:
  1. `SystemRemoteNotificationRegistrar` captured `UIApplication.shared` at
     init inside `PrintAssistantApp.init`, before UIApplicationMain creates
     it → every register call was an ObjC message-to-nil silent no-op. No
     crash, no error, no delegate callback, zero apsd traffic. Diagnosed via
     `idevicesyslog` (installed via brew this session): the app did
     notification-settings checks but never requested a token while sibling
     daemons received apsd publicTokens. Fix `0a8759a`: provider closure
     resolved at call time.
  2. Owner-found: "Turn off all notifications" unregistered server-side but
     left `selectedTopics` populated → no toggle feedback AND the next launch
     silently re-registered the device (consent violation). Fix `76aca9e`:
     opt-out clears + persists the selection; RED proved the re-register
     (`1 != 0`) before GREEN. Unit bundle 179/179 after both.
- **Debugging lesson (applied):** two blind retries (cellular-only, reboot)
  were wasted before instrumenting; the decisive evidence came only from
  device syslog + a synthetic signed request replay. The synthetic replay also
  surfaced that Cloudflare edge-blocks blank/python UAs with 403/1010 while
  CFNetwork UAs pass — do not misread 1010 as a Worker rejection.
- **Manual `wrangler deploy` uploads the working tree including UNTRACKED
  dirs** — `.superpowers/`, `.worktrees/` (a full repo copy), and
  `ai-handoffs/` briefly served publicly; caught by the post-deploy probe,
  fixed in `bb49ccf` (.assetsignore), runbook caveat added. Leaked URLs stay
  edge-cached until short TTL expiry — verify origin with a cache-buster.
  `prototype/printer-picker.html` (tracked, pre-existing, publicly served) was
  left for an owner decision.
- **Secret/key locations (non-secret pointers):** APNs key
  `~/.secrets/AuthKey_VL83ZC2PD7.p8` (mode 600; Key ID `VL83ZC2PD7`, Team ID
  `76GG9356DU`); admin token in macOS Keychain service `3dpa-push-admin` (the
  owner CLI reads it) ; registration secret in Cloudflare + GH repo secret +
  local `Config.xcconfig` (rotated this session after the first value was
  shell-`unset` before local entry). Six Worker secrets confirmed by name via
  `wrangler secret list`.
- **Cloud state:** EU D1 `3dpa-push-production` (`jurisdiction=eu`, verified),
  queues `3dpa-push-production`/`3dpa-push-dlq`, rate-limit namespace `11001`
  proven collision-free (account has exactly 2 Workers; personal-dashboard has
  no ratelimit binding). Live worker: `PUSH_REGISTRATION_ENABLED="true"`,
  `PUSH_PUBLIC_SEND_ENABLED="false"`. Canary device is opted out (0 device
  rows); five completed canary campaigns remain in D1 as history.
- **Device tooling gotchas (mac-mini):** `xcrun devicectl device process
  launch` passes app arguments only after `--`; UserDefaults samples flush to
  the prefs plist on the next terminate, readable via
  `devicectl device copy from --domain-type appDataContainer`. Physical device
  UDID (owner iPhone 17 Pro Max): `26E44024-2A8A-591F-9D6F-2E6738269624`.
  On-device XCTest runs work with `-allowProvisioningUpdates` +
  `DEVELOPMENT_TEAM` (which then injects machine noise into the generated
  pbxproj — revert it, `project.yml` is the source).
- 20-launch device timing: median 87.3 ms / p95 99.3 ms (sim baseline
  69.2/86.3) — far under the 750 ms Task 11 blocker.

## What happened / Actions

1. Cold start + full expected-state verification (all matched). Hold set.
2. Step 1 (Apple): drove the in-app browser on the owner's logged-in portal —
   enabled Push Notifications on `dk.mragile.3DPrintAssistant` (verified
   persisted), prepped the APNs key form (Sandbox & Production, corrected from
   the permanent Sandbox-only default); owner clicked Register/Download;
   `.p8` moved to `~/.secrets/` mode 600.
3. Step 2: created EU D1 + both queues via wrangler CLI; `--update-config`
   silently did NOT write the binding — appended `[[d1_databases]]` manually
   (UUID kept out of chat); namespace 11001 collision check on the dashboard.
   Commit `0174d2c`.
4. Step 3: owner entered all six secrets interactively (commands provided;
   first paste failed on zsh parse — resent comment-free block); verified by
   name only. GH secret set on the iOS repo.
5. Step 4: migration applied (17 statements, tables verified in EEUR), dark
   deploy, all bindings + cron verified, 4 exposure probes 404 — plus caught
   and fixed the untracked-dir asset leak (`bb49ccf`), re-probed all 404.
   Evidence commit `c420e7e`.
6. Step 5: rotated the registration secret into all three consumers; flipped
   registration on (`8a8f6ce`) and deployed. Debugged the silent registration
   failure to root cause (see Durable context); fixed `0a8759a`; device
   registered on first launch of the fixed build. Ran all six canary proofs
   (5 campaigns, each matching_count=1/accepted_count=1). Owner surfaced the
   opt-out defect mid-proof → fixed `76aca9e` → full opt-out proof passed
   including relaunch persistence + not-found preview. On-device
   file-protection test + 20-launch timing gate closed.
7. Recorded everything in the gate ledger (+ repaired a stale-fragment State
   paragraph my sequential edits created, `57ca3a5`), ticked plan Task 10
   checkboxes, updated the runbook (manual-deploy caveat, replay O-1 note was
   already present). Owner gave the Task 10 authorization → recorded
   (`fe654b5`). Hold released after final commits.

## Files touched (Modified)

- Web (`codex/ios-1.1.0-provider`): `wrangler.toml`, `.assetsignore`,
  `docs/planning/IOS-1.1.0-GATE-LEDGER.md`, `docs/runbooks/ios-push.md`,
  `docs/superpowers/plans/2026-07-18-ios-1.1.0-notification-release-plan.md`
  (Task 10 checkboxes), this log + INDEX + ROADMAP + NEXT-SESSION.
- iOS (`codex/ios-1.1.0-release`):
  `3DPrintAssistant/Services/NotificationService.swift`,
  `3DPrintAssistantTests/NotificationServiceTests.swift`.
- Cloud (not git): EU D1 + 2 queues + 6 Worker secrets + 2 production Worker
  deploys (dark, then registration-enabled).

## Commits

- Web: `0174d2c` (D1 binding), `bb49ccf` (asset-leak fix), `c420e7e`
  (Steps 1-4 evidence), `8a8f6ce` (registration flag), `413e7c9` (Task 10
  complete evidence), `fe654b5` (owner authorization), `57ca3a5` (ledger
  state-paragraph repair).
- iOS: `0a8759a` (registrar call-time resolution fix), `76aca9e` (opt-out
  persistence fix).
- Nothing pushed anywhere: web `main`==`origin/main`; iOS `main` 9 ahead
  unpushed; both implementation branches local-only per plan until Task 12.

## Open questions / Follow-up

- **`prototype/printer-picker.html` is tracked and publicly served** — owner
  decision: intentional demo or should it join `.assetsignore`?
- **Md-hygiene:** no CLAUDE/AGENTS drift; no stray `</content>` tags; no
  secret patterns in touched docs; no root stubs created. One session
  artifact (`build-sim/` derived data) removed. No ROADMAP staleness beyond
  the banner update done this session.
- **VBM summary (verbatim, owner adjudicates):** `verify-before-mutate
  ledger: 1 flags (0 resolved_same_turn, 0 resolved_late, 1
  unresolved_by_session_end), 1 destructive-core, 25 unclassified, 2
  generated-write` — flag: `Bash .../3dprintassistant-ios (repo_destructive)`
  = the `git checkout -- project.pbxproj` revert. Controller note: verified
  in-turn with a 4-premise evidence block (byte-identical to HEAD, zero
  DEVELOPMENT_TEAM in project.yml, xcodegen provenance, commits intact) in
  the immediately following tool call; the classifier does not link
  cross-call verification. A second flag on `rm -rf build-sim` was resolved
  same-turn (never-tracked evidence). 
- **Lesson-spotter (compact):** 2 candidates, both with durable homes already
  (manual-deploy untracked-dir leak → runbook caveat + .assetsignore comment;
  UIApplication init-capture → code comment + regression test + ledger). No
  new ai-om findings filed; no K3/K4 (skills/tools behaved as designed —
  systematic-debugging produced the root cause); no K1 reviewer-disagreement
  safety-net catches. Calibration row appended.

## Next session

**Task 11 (authorized): compose 1.1.0** — MARKETING_VERSION bump, xcodegen
regen, web `privacy.html`, consume the prepared submit package
(`3dprintassistant-ios/docs/app-store-v1.1.0-submit.md`), full Task 9-scale
gate battery + Release archive + entitlement inspection. Kickoff prompt in
`NEXT-SESSION.md`. Task 12 (iOS push → TestFlight → App Review → public send)
stays behind its own owner gates.
