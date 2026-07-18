# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for a fresh session on the mac-mini.

**Last updated:** 2026-07-18 after Snapmaker U1 shipped live and its saved
notification was recovered. The PD8 freeze remains owner-gated.

Copy everything between the markers into the fresh session.

>>> START >>>

3dpa cold start on the mac-mini. Verify the completed U1 ship and the repaired
isolated-checkout notifier configuration. Do not clear the PD8 autonomy freeze
without explicit owner authorization; do not rerun U1 or `i7_i`, and do not
start or push the iOS 1.0.7/1.0.8 trains during the audit.

Read in order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md` in full
5. `3dprintassistant/docs/sessions/INDEX.md`
6. These latest three session logs in full:
   - `3dprintassistant/docs/sessions/2026-07-18-cowork-appdev-u1-owner-reentry-ship.md`
   - `3dprintassistant/docs/sessions/2026-07-16-cowork-appdev-intake-parked-path-root-cause.md`
   - `3dprintassistant/docs/sessions/2026-07-14-cowork-appdev-sv06-ace-synthetic-e2e.md`
7. This `NEXT-SESSION.md`
8. Task-specific evidence:
   - `ai-operating-model/docs/findings/2026-07-18-pd5-reviewers-split-on-u1-evidence.md`
   - `3dprintassistant/scripts/install-intake-runner.sh`
   - `3dprintassistant/scripts/install-intake-runner.test.sh`

Before any mutation:

```bash
cd ~/dev/Claude/Projects
~/.claude/claude-sync.sh health
~/.claude/claude-sync.sh verify-parents
~/.claude/claude-sync.sh push-children --dry
git -C 3dprintassistant fetch origin --prune
git -C 3dprintassistant status --short --branch
git -C 3dprintassistant rev-list --left-right --count main...origin/main
git -C ai-operating-model status --short --branch
git -C 3dprintassistant-ios status --short --branch
git -C 3dprintassistant-ios rev-list --left-right --count main...origin/main
test ! -e 3dprintassistant/i7_i
test ! -e 3dprintassistant/scripts/.intake-run.lock
test -f ~/.local/share/3dpa-intake/checkout/3dprintassistant/scripts/.intake-autonomy-freeze
test -s ~/.local/share/3dpa-intake/checkout/3dprintassistant/scripts/.printer-intake.local.json
stat -f '%Sp %N' ~/.local/share/3dpa-intake/checkout/3dprintassistant/scripts/.printer-intake.local.json
```

Expected state to verify, not assume:

- Web is clean/current at custody `732cbc8`; U1 ship commit is `cc65622`.
- U1 is live in the remote overlay and production picker at
  `snapmaker / U Series / u1`, with nozzles `[0.2,0.4,0.6,0.8]` and corrected
  prime/wiping-tower wording.
- Production run `run-20260718T112636Z` reported
  `1 shipped · 0 parked · 0 errored`, fresh `R1/R2 GO`, live overlay/picker
  green, `POSTRUN ok=true`, and `SYNCBOOT ok=true`.
- The installed checkout has the restored protected notifier config at mode
  600, and replaying only the saved report returned `posted=true`. Never print
  or parse out its webhook value.
- The installed checkout still has the `shipped-and-unreported` PD8 freeze.
  This is intentional owner custody, not a failed cleanup. The next daily
  12:00 run will stop fail-closed until the owner authorizes deletion.
- No U1 parked sidecar/candidate branch remains after custody; `i7_i` is already
  resolved as duplicate `sparkx_i7`. Neither candidate should rerun.
- iOS is clean and nine commits ahead locally; `cdf5906` is the U1 data mirror.
  Preserve the push gate.

Owner decision:

- Ask whether the owner authorizes clearing the exact installed PD8 freeze now.
- If yes, re-verify its reason, successful saved-report delivery, mode-600
  config, no intake lock, and clean/current installed checkout; then remove only
  that freeze marker. Do not run a candidate as part of clearance.
- Keep the installer hardening as the next implementation lane: TDD-add safe
  migration/verification of the protected notifier config without printing the
  secret. Use the normal work protocol and cross-model review for that change.

Standing rules:

- Show the progress tracker on multi-step work.
- ROADMAP is truth; read it fully before status claims.
- Preserve fail-closed intake semantics and one-finding-one-commit.
- A successful notification replay does not itself authorize freeze deletion.
- Future printer ships still require fresh semantic `{GO,GO}`, live
  verification, custody, notification, and green POSTRUN/SYNCBOOT.
- Preserve the iOS push gate; do not start either release train by inference.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
