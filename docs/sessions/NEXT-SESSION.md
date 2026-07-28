# 3dpa — Next Session Kickoff

**Purpose:** resume the owner-approved printer-intake freeze auto-recovery fix
from its exact TDD boundary.

**Last updated:** 2026-07-28. Diagnosis, design, and implementation plan are
complete on branch `codex/intake-freeze-auto-recovery`. No runtime behavior has
been changed or deployed. The installed U1 `shipped-and-unreported` freeze
still blocks scheduled intake before Scout, and the queued request remains
unprocessed.

**Locked next step:** plan Task 1 — add RED recovery tests to
`scripts/intake-notify.test.js`, run them, and preserve the failing evidence
before editing `scripts/intake-notify.js`.

Copy everything between the markers into the fresh session.

>>> START >>>

Cold start 3dpa. Resume the locked intake freeze auto-recovery fix
autonomously end-to-end. Stop only for a critical gate.

Sync/branch gate first:

1. Run `~/.claude/claude-sync.sh pull` and health checks.
2. Work only in
   `~/dev/Claude/Projects/3dprintassistant/.worktrees/intake-freeze-auto-recovery`
   on `codex/intake-freeze-auto-recovery`.
3. Fetch and verify the branch against its remote before trusting local state.
4. Set `~/.claude/claude-sync.sh hold` before new review-gated commits.

Read in order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md`
5. `3dprintassistant/docs/sessions/INDEX.md`
6. `3dprintassistant/docs/sessions/2026-07-28-cowork-appdev-intake-freeze-auto-recovery-planning.md`
7. `3dprintassistant/docs/sessions/2026-07-25-cowork-appdev-export-coverage.md`
8. `3dprintassistant/docs/sessions/2026-07-25-cowork-appdev-visible-tip-jar-1.1.1.md`
9. This `NEXT-SESSION.md`
10. `3dprintassistant/docs/superpowers/specs/2026-07-28-intake-freeze-auto-recovery-design.md`
11. `3dprintassistant/docs/superpowers/plans/2026-07-28-intake-freeze-auto-recovery-plan.md`

Task:

Implement the approved exact-run recovery safely:

- Newly created freezes carry structured `runId`, `shipState`, and shipped
  count.
- The notifier may clear only a known-shipment freeze whose run ID exactly
  matches a saved positive-shipment report, and only after a successful
  Discord POST.
- Unknown, missing, malformed, mismatched, or failed-delivery evidence remains
  frozen.
- A strict legacy parser may recover the existing U1 freeze; one possible
  duplicate U1 Discord report is owner-approved.
- The wrapper invokes recovery before normal preflight and continues once.
- The installer migrates/verifies `.printer-intake.local.json` byte-identically
  at mode `0600`, without printing secrets or overwriting conflicts.

Process:

1. Start at plan Task 1: write RED notifier tests and capture the failures.
2. Implement notifier recovery; rerun notifier tests green.
3. Add RED wrapper ordering tests; wire recovery before preflight.
4. Add RED installer secret/mode/conflict tests; implement protected migration.
5. Align web + AI operating-model PD8 contracts.
6. Run adversarial review; one accepted finding per commit.
7. Run the complete verification battery.
8. Merge/push only after green review and tests.
9. Deploy through installer + verify-only.
10. Do **not** kickstart the LaunchAgent. The next scheduled 12:00 run owns the
    exact-run recovery and normal candidate processing.

Hard boundaries:

- Do not manually clear `scripts/.intake-autonomy-freeze`.
- Do not run Scout/intake manually, process the queued candidate, advance a
  watermark, delete KV, or acknowledge the request by hand.
- Do not expose the notifier config or webhook URL.
- Runtime freeze and queue stay untouched until reviewed code is deployed.
- Engine/data/web UI/iOS remain out of scope; the iOS push gate stays active.
- ROADMAP is truth; verify runtime/remote claims live.
- One finding = one commit.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
