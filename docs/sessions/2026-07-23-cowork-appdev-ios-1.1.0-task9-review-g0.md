# 2026-07-23 — Cowork (appdev): iOS 1.1.0 Task 9 review closed, G0 reached, release copy prepared

## Durable context

- **Tasks 0–9 are complete.** The 2026-07-19 independent-review blocker is
  resolved: the canonical protected `bridge --mode claude-only` produced its
  first valid verdict (870.1 s, exit 0, non-empty) — NO-GO with 1 P1 + 6 P2 —
  every accepted finding was fixed one per commit, the full cross-repo gate
  battery was rerun green, and a confirmation review of the APPLIED diffs
  returned `GO` with no remaining or new P0/P1/P2. **The train is stopped at
  G0 awaiting the owner.**
- The session kickoff prompt was **stale** (asserted "no implementation has
  started"); the sync/verify gate caught it and the session resumed at Task 9
  Step 2 per the repos' own NEXT-SESSION directive instead of rebuilding
  Tasks 0–8. Ground truth always outranked the prompt.
- The P1-A fix is **refresh-on-miss** (coordinator keeps a missed `new_printer`
  destination pending and requests exactly one `engineRetry` re-bootstrap,
  which then runs `prepareForLaunch`), chosen over the reviewer's
  launchOptions mechanism — rationale in the disposition. Design §6.2 ("races
  are test cases, not timing assumptions") is the governing requirement.
- Cross-model complementarity proved out both ways: the reviewer caught P1-A
  (controller's parallel review missed the `.task` timing), and the controller
  refuted P2-E with code evidence (reviewer had read only
  NotificationService.swift) and corrected the P2-F recovery-driver premise.
- The full 1.1.0 App Store submit package now exists ahead of G0
  (`3dprintassistant-ios/docs/app-store-v1.1.0-submit.md` + metadata + privacy
  labels), using the ratified design §11 copy verbatim and §10.1's
  Identifiers → Device ID privacy change; catalog totals recounted from the
  release branch (78 printers / 14 brands — matches the ratified block). No
  MARKETING_VERSION bump, no web privacy.html change (both reserved for
  Task 11).
- One full iOS suite attempt failed 5/5 on simulator SpringBoard launch denial
  (`Busy / Application failed preflight checks`) with zero code failures;
  `simctl bootstatus` + rerun was clean (177/177 + 4/4). Flake signature
  recorded in the disposition for future sessions.

## What happened / Actions

1. Cold start with full sync gate; discovered ground truth: web on
   `codex/ios-1.1.0-provider` (5 commits), iOS on `codex/ios-1.1.0-release`
   (10 commits), Tasks 0–8 + Task 9 Step 1 already complete and blocked only
   on the invalid review. Surfaced the stale-prompt reconciliation to the
   owner and resumed at Task 9 Step 2 only.
2. Set the claude-sync hold, verified baseline tags (`a0a8060` web,
   `cdf5906` iOS), probed `bridge --health` (credential source: env), and ran
   the canonical review with `oauth.env` sourced only inside the subshell.
3. While the review ran, independently hostile-reviewed the full
   security/consent/routing core of both repos (self-refuted one candidate
   finding against the migration's triggers before filing it).
4. Review verdict NO-GO (1 P1, 6 P2, 5 optionals). Verified every finding
   against code before acting: accepted P1-A + P2-A/B/C/D + reduced P2-F,
   refuted P2-E.
5. Landed six fixes one per commit, TDD each (inverted-first or stash-RED
   artifacts): web `8682ab6` (TopicDisallowed → blocked), `18c41ad` (atomic
   finishCampaign + 3 new terminal-status tests), `247bea7` (atomic cadence
   INSERT + UNIQUE translation), `8f8acce` (replay blocked-restore), `29c3e94`
   (DLQ advisory catch); iOS `3f886bf` (refresh-on-miss routing + 2 new race
   tests).
6. Reran the entire Task 9 Step 1 battery green: provider 62/62, Worker 33/33,
   data/overlay validators, walkthrough, export audit 0 FAIL, Wrangler dry-run
   (send flags `"false"`), engine/data byte-identity, iOS 177/177 + 4/4
   (after the sim-flake rerun), clean diff checks.
7. Confirmation review of the applied diffs: **`GO`**, no remaining or new
   P0/P1/P2; optional O-1 recorded as an ios-push runbook replay note.
8. Closed Task 9 in the plan (Steps 2–3 checked), gate ledger (Tasks 0–9
   complete + exact non-secret G0 owner prerequisites), ROADMAP (new terminal
   banner + corrected stale Current Snapshot row), disposition (confirmation
   round + gate evidence). Released the sync hold.
9. Owner returned and requested the release-copy package: created
   `app-store-v1.1.0-submit.md` (v1.0.4 template, ratified §11 copy verbatim,
   §10.1 privacy change, recounted WHAT'S INCLUDED, Task 12 capture commands,
   nine owner TestFlight gates, rollback), updated `app-store-metadata.md` and
   `app-store-privacy-labels.md`. Committed docs-only on the iOS branch.

## Files touched

- Web (branch `codex/ios-1.1.0-provider`): `functions/api/push/{apns,consumer,
  campaigns}.js` + their test files, `docs/runbooks/ios-push.md`,
  `docs/planning/{IOS-1.1.0-GATE-LEDGER,ROADMAP}.md`, plan checkboxes,
  review-evidence files under
  `docs/reviews/2026-07-18-ios-1.1.0-notification-release/implementation/`.
- iOS (branch `codex/ios-1.1.0-release`):
  `3DPrintAssistant/Services/NotificationCoordinator.swift`,
  `3DPrintAssistant/App/ContentView.swift`,
  `3DPrintAssistantTests/NotificationCoordinatorTests.swift`,
  `docs/app-store-v1.1.0-submit.md` (new), `docs/app-store-metadata.md`,
  `docs/app-store-privacy-labels.md`.

## Commits

- Web: `8682ab6`, `18c41ad`, `247bea7`, `8f8acce`, `29c3e94` (fixes),
  `f3d9229` (review evidence), `66e641f` (Task 9 close-out docs).
- iOS: `3f886bf` (P1-A fix), + the release-copy docs commit (this session's
  final iOS commit).
- Nothing pushed anywhere: web `main` == `origin/main` (untouched); iOS `main`
  exactly 9 ahead of origin, unpushed; both implementation branches
  intentionally local-only per the plan until Task 12.

## Open questions / Follow-up

- **Owner G0 prerequisites** (the only blocker): Apple Push capability on the
  App ID; dedicated APNs key (Key ID/Team ID/`.p8` for secure entry);
  approval to provision EU D1/Queues/rate-limit + the six Worker secrets; ASC
  canary Device ID + privacy-update confirmation. Full list in the gate
  ledger.
- VBM summary (verbatim, per the standing rule — owner's read is the
  false-flag measurement): `verify-before-mutate ledger: 3 flags (0
  resolved_same_turn, 0 resolved_late, 3 unresolved_by_session_end), 0
  destructive-core, 3 unclassified, 0 generated-write` — flags:
  `consumer.test.mjs (edit)`, `campaigns.test.mjs (edit)`,
  `NotificationCoordinatorTests.swift (edit)`. Controller note: each was
  verified by test-execution in the same turn with the outcome stated inline
  (RED/GREEN runs); the classifier does not recognize execution as
  resolution — owner adjudicates whether these are false flags.
- Md-hygiene: no drift (CLAUDE.md == AGENTS.md), both trees clean, no secret
  patterns in new docs, no stray `</content>` tags. One deliberate residue:
  the superseded 2026-07-19 ROADMAP banner is retained as history under a
  "Previous" prefix.
- Lesson/finding sweep: **no new ai-om findings.** No K3/K4; reviewer
  disagreement (P2-E refutation, P1-A mechanism substitution) was captured in
  the designed surface (implementation-review-disposition.md), so no K1
  safety-net catch. Calibration row appended.

## Next session

Owner completes G0 prerequisites, then a fresh session executes **Task 10**
(owner G0, dark provider deployment, device canary, opt-out proof) from
`docs/sessions/NEXT-SESSION.md` — locked entry point, do not re-run Tasks 0–9.
