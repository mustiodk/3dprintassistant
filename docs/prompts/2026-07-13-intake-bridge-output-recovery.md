# Intake Bridge Output + Candidate Recovery — Execution Prompt

## Read first

1. `/Users/mustafaozturk-macmini/dev/Claude/Projects/AGENTS.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md`
5. `3dprintassistant/docs/superpowers/specs/2026-07-13-intake-bridge-output-recovery-design.md`
6. `3dprintassistant/docs/superpowers/plans/2026-07-13-intake-bridge-output-recovery-plan.md`
7. `ai-operating-model/docs/agents/intake-pipeline-runner.md`
8. `3dprintassistant/docs/runbooks/printer-addition-protocol.md`

## Goal

Execute the reviewed recovery plan end to end. Fix Bridge output and the narrow
candidate-evidence parity gap first. Then continue `centauri_carbon_2` from the
preserved branch/state checkpoint, with fresh PD5 reviews. Do not rerun Scout or
the full LaunchAgent.

## Verified starting state

- Web candidate is not shipped.
- `intake/centauri_carbon_2` points to
  `8695583b8748ee247970d9c598f729ecf5dc90e6`.
- Earlier candidate commit
  `be49fea245277e601d20e95a144bc80777e48397` exists but is not ref-protected.
- Parked state is `review-split` / `decision-required`, tainted, with R1 NO-GO
  on `cool_plate` and `open_door_threshold_bed_temp`; R2 was GO.
- Root incident report SHA-256 is
  `1f03b8aa2897d4eb4c5427a138f1e690124492c140c5867a26fec33d7f108774`.
- All 21 current passive-enclosure catalog rows use threshold 45.
- iOS is six local commits ahead under the push gate. Never push it.
- Bridge v0.2.0 health is green; scheduled PD5 remains `codex-only`. Because
  Codex is the controller, independent cross-model reviews use Claude Opus 4.8.

## Required workflow

1. Use Work Protocol Full lane and `superpowers:executing-plans`.
2. Show the progress tracker after every completed task.
3. Require the planning bundle to be committed/pushed, then activate the sync
   hold and temporarily unload the LaunchAgent.
4. Provision and verify the durable exact-model wrapper
   `~/.local/bin/claude-opus-4-8`; never depend on `/tmp` for reviewer routing.
5. Preserve the current runner session log before any replacement.
6. Execute the implementation plan strictly task by task with TDD RED→GREEN.
7. Keep one accepted review finding per commit.
8. Prove Bridge honours the ignored `--out-dir`, then fix and land the web +
   AI-OM contracts before moving the root report.
9. Fix and land evidence parity/canonical contracts before rebasing the candidate.
10. Create and push both immutable checkpoint tags before rebase; never force them.
11. Preserve the old packet/state and continue the existing candidate; do not run Scout.
12. Run every pre-review validator, then exactly one fresh Claude Opus R1 and one
    fresh Bridge Codex R2. Validate their structured objects.
13. Ship only on fresh `{GO,GO}`. Any other verdict parks and stops without a
    same-run retry.
14. Write provenance/ledger custody only after merge, push, live verification,
    and the local-only iOS mirror.
15. Return the web checkout to clean `main`, then notify, obtain manual
    `POSTRUN ok=true`, verify evidence refs, and restore the scheduler on every
    terminal path. Do not kickstart it.
16. Treat scheduler restoration + sync-hold release as a mandatory finally block
    on every success, failure, and early abort after launchd is unloaded.

## Hard stop rules

- Never edit `engine.js`, `app.js`, Swift, Android, or another validator.
- Never hand-edit the overlay; use `republish-overlay.js` and PD6 rollback.
- Never delete the candidate branch, checkpoint commits/tags, parked state,
  session logs, or Bridge reports.
- Never put a Bridge report in repo root.
- Never push iOS.
- Never treat reviewer exit 0 or prose as a verdict.
- If POSTRUN fails, archive `last-run-session.log` before any later run.
- After terminal intake status, hand back to iOS 1.0.7 → 1.0.8. My 3DPA stays
  parked until an explicit owner command.
