# 3dpa — Next Session Kickoff

**Purpose:** obtain the missing cross-model implementation review for Feedback Diagnostics v2, then stop at owner gate O0.

**Last updated:** 2026-08-01, after the web review-fix pass and iOS Task 8 completed locally green but Task 9's independent review was blocked fail-closed.

The task is locked. Do not choose another ROADMAP item, do not provision or deploy feedback infrastructure, and do not weaken O0.

**Hard precondition:** the Codex account was exhausted until **2026-08-07 12:35**. If that window has not passed, `bridge --mode codex-only` will fail again — check first and do not burn the session on it.

Copy everything between the markers into the fresh session.

>>> START >>>

Cold start 3dpa. Follow the Work Protocol and resume the locked Feedback Diagnostics v2 sequence at Task 9 Step 3. Work autonomously through safe local gates, but stop at owner gate O0.

First verify sync/GitHub health and the exact branches. Trust live Git evidence over stale session notes.

- Web: `codex/feedback-diagnostics-v2`, expected HEAD `fda09aa`, already pushed to origin.
- iOS: `codex/feedback-diagnostics-v2-ios` at `acfd8fb`, in worktree `3dprintassistant-ios/.worktrees/feedback-diagnostics-v2-ios`, based on `main` `2be10a4`. Local only — the push gate is active and stays active.
- If the iOS worktree is missing or was pruned, recreate it from `2be10a4` and copy `Config.xcconfig` in from the main checkout first; it is gitignored, and without it the build fails immediately with "Unable to open base configuration reference file". Never read or rewrite that file.

Read in this order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `~/dev/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `~/dev/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
4. `~/dev/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md` (the 2026-08-01 terminal entry only; the file is very large)
5. `~/dev/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
6. `~/dev/Claude/Projects/3dprintassistant/docs/sessions/2026-08-01-cowork-appdev-feedback-diagnostics-v2-ios-task8.md`
7. `~/dev/Claude/Projects/3dprintassistant/docs/superpowers/specs/2026-07-31-feedback-diagnostics-design.md`
8. `~/dev/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-07-31-feedback-diagnostics-v2-implementation-plan.md`
9. `~/dev/Claude/Projects/3dprintassistant/docs/reviews/2026-07-31-feedback-diagnostics-v2-implementation-review.md`
10. `~/dev/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md`

Locked execution order:

1. Re-run the local gates to confirm the heads are still green: web `node --test functions/api/*.test.mjs functions/api/_lib/*.test.mjs scripts/gen-release-manifest.test.mjs scripts/feedback-diagnostics.test.mjs`, `npm test -- --run`, `npm run verify:release`, `node scripts/validate-data.js`, `node scripts/walkthrough-harness.js`, `node scripts/export-audit.js`, `npx wrangler deploy --dry-run`, `git diff --check`; iOS `xcodebuild test -only-testing:3DPrintAssistantTests`.
2. Run `bridge --health`, then the cross-model review from `~/dev/Claude/Projects` (both repos must be in scope):
   `bridge --mode codex-only --turn-timeout-seconds 900`
   over web `6381e9e..fda09aa` and iOS `2be10a4..acfd8fb`, against the design and plan Tasks 8–9.
   **Use `codex-only`, not the `claude-only` written in the plan** — the plan assumed a Codex controller; `codex-only` is the cross-model mode when the controller is Claude. If the controller is Codex, invert this.
   A timeout, empty artifact or auth failure is invalid evidence and blocks progression — record it fail-closed rather than substituting a same-model review.
3. Apply every accepted finding one per TDD commit, rerun the affected gates, and obtain a final GO on the exact reviewed heads. Record rejected findings with code evidence.
4. Stop at Task 10 O0 and report the exact owner prerequisites.

Before explicit O0 authorisation you must not: create, bind or migrate `FEEDBACK_DB`; set `FEEDBACK_DATA_KEY`; allocate `FEEDBACK_RATE_LIMITER`; deploy the Worker or web client; send production canaries; bump the iOS release train; push iOS; start TestFlight; or change App Store Connect.

Standing constraints:

- The web branch has GO for handoff, never for production deployment.
- Preserve legacy web/iOS and Printer Intake behaviour, the encryption boundary, Discord minimisation and 90-day retention.
- Keep the user flow simple: automatic diagnostics for submitted bug reports only. No attachments, general telemetry, accounts, ticketing or automatic GitHub issues.
- One finding = one commit. Web owns the wire contract. The iOS push gate stays active.
- Commit and push only the authorised feature branches; merge/deploy/release each require their own gate.
- On a real blocker, document it fail-closed and update this file. Never weaken O0 to make progress.

<<< END <<<

## Known-open, carried into that session

- **`ScreenCaptureUITests` fails 4/6 on the iMac at pristine `main` `2be10a4`** — reproduced with none of the feedback changes applied, so it is not a regression from this work. Until it is diagnosed (simulator state vs real drift since the mac-mini 1.1.3 clean-container run), the UI suite is not a trustworthy gate on this machine. Do not let it block Task 9, and do not claim 6/6.
- Confirmation-review optionals, deliberately still open: no HTTP-handler-layer rejection test (`feedback.v2.test.mjs` covers `normalizeFeedbackPayload` directly), and some `freezeFailure()`-tied enum members still have no web call sites.

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
