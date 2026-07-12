# 2026-07-12 — Remote (cloud): intake-runner post-run fail-closed gate

## Durable context

- **Environment:** remote Claude Code cloud session on a fresh clone of
  `mustiodk/3dprintassistant` (branch `claude/3dpa-intake-runner-debug-jbpcbx`).
  Mac-mini-local evidence (branch `intake/centauri_carbon_2`, commit `be49fea`,
  `scripts/.intake-runner-state/`, `~/Library/Logs/3dpa-intake.*.log`, the
  untracked `bridge-2026-07-12-222924-350261.md`, the Bridge and
  ai-operating-model checkouts, the LaunchAgent) was **not reachable** from
  this session; nothing on the mac-mini was touched or deleted.
- **Incident being fixed (22:20 run, mac-mini):** the runner session passed
  preflight, committed candidate `be49fea` on `intake/centauri_carbon_2`, then
  exited 0 with **no** PD5 dual review, **no** merge/park, **no** run report,
  **no** Discord notify, and **no** cleanup back to `main` — and the wrapper
  reported success because it only checked `claude -p`'s exit code.
- **Root cause (wrapper layer, reproduced deterministically):** `claude -p`
  rc=0 only proves the CLI completed. `intake-run-wrapper.sh` had zero
  post-run verification of the contract's terminal obligations, so an
  empty/incomplete runner session passed silently. Reproduced 1:1 with a stub
  `claude` that commits a candidate on an intake branch and exits 0 with empty
  output: unpatched wrapper returned rc=0, stale report, no notify, branch
  left on `intake/centauri_carbon_2`.
- **Second finding (`bridge config`):** the session invoked Bridge with the
  bare word `config`; Bridge has no `config` subcommand, so it ran an
  irrelevant FULL-mode review with task "config". Why the model chose that,
  and why it then ended with exit 0 and an ~empty session log, is not
  deterministically recoverable from here (the log was empty) — which is
  exactly why the fix is a deterministic wrapper gate, not more prompt hope.
- `centauri_carbon_2` remains **not shipped**; remote `main` stayed `92c49a2`
  throughout. The parked sidecar/custody evidence is untouched.

## What happened / Actions

1. Cold start on the remote clone; established which handover evidence exists
   here (runner scripts, session docs, ledger) vs mac-mini-only (state, logs,
   `be49fea`, Bridge/ai-om repos — MCP repo add needs interactive approval).
2. Reproduced the wrapper false-success with a fixture repo + stub `claude`
   (incident signature: rc=0, empty log, stale report, no notify, intake
   branch left checked out).
3. TDD RED: authored `intake-post-run-invariants.test.sh` (10 cases) and
   `intake-run-wrapper.test.sh` (incident replay / complete run / crash);
   both observed failing before implementation.
4. GREEN: new `scripts/intake-post-run-invariants.sh` — deterministic
   fail-closed POST-run gate (machine line `POSTRUN ok=…`, exit 65):
   non-empty `last-run-session.log`; `last-run-report.md` freshly written
   this run (mtime ≥ run start — `intake-notify.js` always writes it, so
   freshness proves the notify stage ran); HEAD back on `main`; clean or
   custody-only tree; custody-only ahead commits. mtime via zsh `zstat`
   (BSD/GNU-portable).
5. Wired the gate into `intake-run-wrapper.sh` after the rc=0 path: violation
   → `intake-notify.js --failure "post-run: …" --shipped-unknown` (PD8
   fail-closed: an incomplete session MAY have shipped) → exit 65. Wrapper
   gained test seams `--repo/--oauth-env/--path-prepend`; production launchd
   passes no args, defaults unchanged.
6. Hardened `intake-run-kickoff.md`: only `bridge --health` and the PD5
   reviewer-2 turn `bridge --mode codex-only "<concrete review of
   main...intake/<id> diff>"` are allowed (direct fallback
   `codex exec -s read-only -m gpt-5.5`); explicit note that `bridge config`
   does not exist and that the wrapper now enforces post-run invariants.
7. Full verification: both new suites + `intake-run-preflight.test.sh` +
   all 22 `scripts/*.test.js` suites green; `zsh -n` clean. The invariants
   trip on the incident state at three independent points (empty log, stale
   report, not-on-main) and pass on the green 19:59 parked-run shape.
8. Wrap: this log + INDEX + NEXT-SESSION + ROADMAP status line; PR to `main`.

## Files touched

- `scripts/intake-post-run-invariants.sh` (new)
- `scripts/intake-post-run-invariants.test.sh` (new)
- `scripts/intake-run-wrapper.sh`
- `scripts/intake-run-wrapper.test.sh` (new)
- `scripts/intake-run-kickoff.md`
- `docs/planning/ROADMAP.md`
- `docs/sessions/INDEX.md`
- `docs/sessions/NEXT-SESSION.md`
- `docs/sessions/2026-07-12-remote-intake-runner-postrun-gate.md`

## Commits

- `60ca199` — `fix(intake): fail-closed post-run invariants — claude exit 0 is not success`
- `49f77e1` — `docs(intake): pin the only allowed bridge invocation forms in the kickoff`
- Wrap documentation commit recorded at close.

## Open questions / Follow-up

- **Mac-mini-only, not executable remotely:** verify the runner contract's
  PD5 reviewer-2 section in `ai-operating-model` matches the pinned
  invocation form; run the Bridge smoke test; pull merged `main` into the
  launchd checkout (preflight will fail-close `web-out-of-sync` until then);
  kickstart exactly ONE LaunchAgent run and monitor to a terminal state —
  wrapper exit 0 is no longer trusted alone, but the semantic verification
  list in NEXT-SESSION still applies.
- The mac-mini's local `intake/centauri_carbon_2` branch + `be49fea` +
  untracked bridge transcript are debugging evidence — keep them until the
  rerun reaches a terminal report (the runner works from `main`; the stale
  local branch does not block preflight, only tree/branch state does).
- Why the headless model emitted `bridge config` and ended its turn remains
  unproven (empty session log). If it recurs, the new gate converts it into a
  non-zero, notified failure with the POSTRUN reason in the Discord report —
  capture `last-run-session.log` before it is overwritten by the next run.
- `centauri_carbon_2` retry state unchanged: `intake-parked@2`, class
  `availability-blocked`, retries 0/5, reviewer 1 GO recorded, Codex verdict
  null. Never ship it around PD5.

## Next session

On the mac-mini: run the regenerated `NEXT-SESSION.md` kickoff — sync the
launchd checkout to merged `main`, verify contract + Bridge smoke, then one
monitored LaunchAgent intake run to a terminal, semantically verified state.
