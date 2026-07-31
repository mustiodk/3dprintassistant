# 3dpa — Next Session Kickoff

**Purpose:** resume Feedback Diagnostics v2 from the reviewed web/Worker gate without widening scope or crossing production/iOS release gates.

**Last updated:** 2026-08-01 after Tasks 1–7 reached independent GO on the isolated feature branch.

The task is locked. Do not choose another ROADMAP item and do not provision or deploy feedback infrastructure.

Copy everything between the markers into the fresh session.

>>> START >>>

Cold start 3dpa. Follow the Work Protocol and resume the locked Feedback Diagnostics v2 sequence. Work autonomously through safe local implementation and review gates, but stop at owner gate O0.

First verify GitHub/sync health and the exact branches. Web work is on `codex/feedback-diagnostics-v2`; reviewed baseline `6381e9e` must be an ancestor of the remote feature-branch tip. iOS must still be clean/current on `main` before creating a Task 8 worktree. Do not trust stale session state over live Git/GitHub evidence.

Read in this order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `~/dev/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `~/dev/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
4. `~/dev/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
5. `~/dev/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
6. `~/dev/Claude/Projects/3dprintassistant/docs/sessions/2026-08-01-cowork-appdev-feedback-diagnostics-v2-web-gate.md`
7. `~/dev/Claude/Projects/3dprintassistant/docs/superpowers/specs/2026-07-31-feedback-diagnostics-design.md`
8. `~/dev/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-07-31-feedback-diagnostics-v2-implementation-plan.md`
9. `~/dev/Claude/Projects/3dprintassistant/docs/reviews/2026-08-01-feedback-diagnostics-v2-web-implementation-review.md`
10. Both linked Bridge artifacts in that review disposition.
11. `~/dev/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md`

Locked execution order:

1. Close review P2 #3–#7 and the confirmation review's client-side capture-vocabulary should-fix on the existing web feature branch. Use TDD and one finding per commit. Rerun affected web/Worker gates after each finding.
2. Create `3dprintassistant-ios/.worktrees/feedback-diagnostics-v2-ios` on branch `codex/feedback-diagnostics-v2-ios` from verified current iOS `main`; execute implementation-plan Task 8.
3. Execute Task 9 across both repos: full local gates, shared-file identity proof and bounded cross-model implementation review. Apply accepted findings one per commit and require final GO on exact reviewed heads.
4. Stop at Task 10 O0 and report the exact prerequisites. Do not create/bind/migrate `FEEDBACK_DB`, set `FEEDBACK_DATA_KEY`, allocate `FEEDBACK_RATE_LIMITER`, deploy the Worker/web client, send production canaries, bump the iOS release train, push iOS, dispatch TestFlight or touch App Store state without explicit owner authority.

Standing constraints:

- The current web feature branch is not production-approved merely because Tasks 1–7 have GO for handoff.
- Preserve legacy web/iOS and Printer Intake behavior, the strict wire contract, Discord minimization, encryption boundary and 90-day retention.
- Keep the user flow simple: automatic diagnostics only for submitted bug reports; no attachments, general telemetry, accounts or ticketing system.
- One finding = one commit. Web owns the wire contract. iOS push gate remains active.
- If a real blocker repeats, leave a durable fail-closed gate; never weaken O0 or silently deploy around it.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
