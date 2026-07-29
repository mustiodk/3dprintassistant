# 3dpa — Next Session Kickoff

**Purpose:** start the next independent 3dpa session from the closed
printer-intake recovery/learning state.

**Last updated:** 2026-07-29 after the Seturn retrospective-learning wrap.

No implementation task is locked. The intake recovery incident is closed:
scheduled custody `cd9adf9` proves `run-20260729T100106Z` crossed the recovery
path, and `a0b9100` now surfaces literal owner-gated
`resinKeywords:seturn` learning. Choose the next priority from the live ROADMAP.

Copy everything between the markers into the fresh session.

>>> START >>>

Cold start 3dpa. Confirm repository health, read the canonical project spine,
then ask the owner which live ROADMAP priority to take next. No implementation
task is locked. Do not rerun or re-diagnose the closed printer-intake recovery
incident without new runtime evidence.

Read in this order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `~/dev/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `~/dev/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
4. `~/dev/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
5. `~/dev/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
6. `~/dev/Claude/Projects/3dprintassistant/docs/sessions/2026-07-29-cowork-appdev-intake-seturn-learning.md`
7. `~/dev/Claude/Projects/3dprintassistant/docs/sessions/2026-07-28-cowork-appdev-intake-freeze-auto-recovery-impl.md`
8. `~/dev/Claude/Projects/3dprintassistant/docs/sessions/2026-07-28-cowork-appdev-intake-freeze-auto-recovery-planning.md`
9. `~/dev/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md`
10. The task-specific finding/spec selected by the owner.

Today's task:

- Verify GitHub-first health and reconcile any in-scope sync blocker.
- Present the live ROADMAP queue and get the owner's priority.
- If the owner selects the Seturn follow-up, inspect the retrospective proposal
  from `scripts/printer-intake-outcomes.jsonl` with
  `scripts/intake-retrospective-gather.js`; do not apply it to
  `scripts/printer-intake-guardrails.json` without explicit approval.

Scope and process:

- Treat `docs/planning/ROADMAP.md` as status truth.
- Preserve the closed recovery evidence: web `53e032b`, AI-OM contract
  `3dee67c`, scheduled custody `cd9adf9`, learning fix `a0b9100`, tracking close
  `81f11f3`.
- Use TDD for behavior changes and verify before claiming success.
- For any data or engine change, evaluate functional/structural/UI/UX impact on
  both web and iOS, keep the engine mirror byte-identical, and run walkthrough
  plus XCTest.

Standing rules:

- One finding = one commit.
- Web is master.
- Do not push iOS `main` until the complete release train is TestFlight-ready.
- Do not treat a committed or published artifact as deployed/live without
  same-session runtime evidence.
- Do not reopen the intake recovery incident without new failure evidence.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
