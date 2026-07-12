# 2026-07-12 — Cowork (appdev): intake preflight recovery + supervised rerun

## Durable context

- The scheduled 12:00 intake did not expose a runner-code defect. Its local web
  checkout was clean but 179 commits behind `origin/main`; the deterministic
  preflight correctly fail-closed as `web-out-of-sync`.
- A safe `git pull --ff-only` moved local `main` from `1d5e273` to the then-current
  `dc9544a`. The original symptom reproduced before the pull (`behind=186`) and
  both dry-run and full preflight returned `ok=true` afterwards.
- A manual `launchctl kickstart -k gui/501/dk.mragile.3dpa-intake` used the exact
  daily launchd path. The run completed `exit 0`, posted its Discord report,
  released the lock, and left web `main` clean/current.
- The run found one real candidate, **Elegoo Centauri Carbon 2**. Research,
  evidence, validators and diff guards passed; hostile reviewer 1 returned GO.
  Reviewer 2 was unavailable because local Codex CLI v0.139.0 could not use
  `gpt-5.6-sol`; bridge and direct fallback both exited 1. The fail-closed
  result is `auto-parked:review-unavailable`, not shipped.
- Custody commit `1e3aec5` was pushed to web `main`; it appends only the parked
  outcome. No printer row, overlay, engine, UI or iOS data was shipped.

## What happened / Actions

- Ran the 3dpa cold-start spine and surfaced health before trusting local state.
- Read the launchd plist, wrapper, preflight, runner contract, intake runbook,
  logs and gate ledger; reproduced the exact preflight failure.
- Proved the root cause against git history: yesterday's run was green, then
  179 remote commits landed without the launchd checkout being fast-forwarded.
- Fast-forwarded the clean, behind-only checkout; re-ran dry and full preflight.
- Manually started and monitored the installed LaunchAgent through completion.
- Final run evidence: `started 2026-07-12T19:42:00Z`, finished
  `2026-07-12T19:59:13Z`; shipped 0, parked 1, errored 0; KV hygiene
  `deletes=0 kept=5`; notify `posted=true shipped=0 frozen=false`.
- Synced `~/.claude` during wrap. A silent autostash-pop conflict in marketplace
  timestamp metadata was recovered; companion ai-om K3 recurrence:
  [`2026-07-12-claude-sync-autostash-conflict-moved-to-marketplace-metadata`](../../../ai-operating-model/docs/findings/2026-07-12-claude-sync-autostash-conflict-moved-to-marketplace-metadata.md).

## Files touched

### Runtime commit produced by the runner

- `scripts/printer-intake-outcomes.jsonl`

### Wrap documentation

- `docs/planning/ROADMAP.md`
- `docs/sessions/INDEX.md`
- `docs/sessions/NEXT-SESSION.md`
- `docs/sessions/2026-07-12-cowork-appdev-intake-preflight-recovery.md`

### Deleted / Untracked

- No tracked file deleted. Runner scratch/lock state stayed gitignored.

## Commits

- `1e3aec5` — `chore(intake): custody centauri_carbon_2 park:review-unavailable`
- Wrap documentation commit recorded at close.

## Open questions / Follow-up

- **Next action:** verify and update the Codex CLI/runtime path so the configured
  `gpt-5.6-sol` review can run; then kickstart the same launchd job and let the
  `review-unavailable` retry policy re-enter `centauri_carbon_2`. Do not ship it
  manually around PD5.
- `centauri_carbon_2` sidecar is `intake-parked@2`, class
  `availability-blocked`, retries 0/5; hostile reviewer GO is recorded, Codex
  verdict is null.
- Md-hygiene found pre-existing ROADMAP drift: the top export-sequence banner is
  behind the active queue, and the remote-catalog operations row still names
  overlay `2026070401` although current verified project state is `2026071005`.
  Per protocol this is surfaced for a later focused cleanup, not silently fixed
  during the intake incident wrap.
- No secret file, root redirect stub, untracked markdown, INDEX orphan, bare
  trailing `</content>` tag, or top-level `CLAUDE.md`/`AGENTS.md` drift was found.
- Lesson spotter: sync recurrence accepted as a K3 finding; intake stale checkout
  stayed project-local because preflight behaved as designed. No K4, K1
  safety-net miss, reviewer-disagreement finding, or MCP ledger update.
- Memory sweep proposal: add the marketplace-metadata recurrence to the existing
  claude-sync architecture memory; not written because the owner did not request
  a memory update.
- Vault sweep: nothing durable to propagate.
- Verify-before-mutate summary: `verify-before-mutate ledger: no entries this session`.

## Next session

Start with Codex reviewer availability, then rerun the parked candidate through
the autonomous pipeline. Once the run produces a terminal report, return to the
existing iOS 1.0.7 → 1.0.8 release sequence; My 3DPA remains parked behind it.
