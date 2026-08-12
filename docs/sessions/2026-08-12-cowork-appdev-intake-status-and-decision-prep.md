# 2026-08-12 — Cowork (appdev): intake status, and preparing the two owner decisions

## Durable context

- **`claude-sync` health reporting `current` does not mean the checkout shows
  current project truth.** This session opened on
  `codex/feedback-diagnostics-v2` — eleven days behind `main` on intake — and
  the gate passed, because the branch was in sync with *its own* upstream.
  ROADMAP, INDEX, `NEXT-SESSION.md`, the guardrails file and the outcomes
  ledger were all then read from that branch, which presents a self-consistent
  stale world with no seam in it. Three claims were published to the owner
  before the mistake surfaced; two were wrong. Finding:
  [`2026-08-12-sync-health-reports-current-on-a-stale-feature-branch`](../../../ai-operating-model/docs/findings/2026-08-12-sync-health-reports-current-on-a-stale-feature-branch.md).
  **The sharp part:** `main`'s `NEXT-SESSION.md:28-32` already carried this
  warning in bold — *"check the BRANCH, not just the health line … that exact
  failure has bitten three cold starts"* — and it went unread because it was
  read from the stale branch, whose copy predates it. This is recurrence #4, and
  it shows a per-project resume surface structurally cannot protect against a
  stale checkout of that project; the mitigation has to live in the
  `claude-sync` health line, outside every project repo. Writing the advice a
  fourth time in another project file is not a mitigation.
  **Until then: check the branch at cold start.**
- **The intake runner host is the mac-mini, confirmed from source, not from
  memory.** `scripts/launchd/dk.mragile.3dpa-intake.plist:34` writes to
  `/Users/mustafaozturk-macmini/Library/Logs/3dpa-intake.out.log`. The iMac has
  no `~/.local/share/3dpa-intake` and no intake LaunchAgent.
- **The automation checkout is `$INSTALL_ROOT/checkout/3dprintassistant`, one
  level deeper than the 2026-08-10 session log records.** Source:
  `install-intake-runner.sh:64`. `INSTALL_ROOT` has no default — it is supplied
  at install time via `--install-root`, so `~/.local/share/3dpa-intake` is the
  recorded value, not a guaranteed one; the authoritative copy is
  `WorkingDirectory` in the installed plist. Getting this path wrong matters
  asymmetrically: a checkout with **no** state dir fails loudly
  (`active parked sidecar missing`), but a checkout with a **stale** one writes
  an envelope, prints `ok=true`, and the runner never sees it. Issue
  [#34](https://github.com/mustiodk/3dprintassistant/issues/34).
- **`provide-evidence` structurally cannot carry field values, and numeric
  safety fields are never owner-attestable.** `validateReentryDecision` rejects
  `overrides` on the evidence edge outright
  (`owner-decision-evidence-must-not-override`), and
  `OWNER_ATTESTABLE_FIELDS` is `{enclosure, series, available_plates}` — the
  writer refuses everything else with *"numeric safety fields are never
  attestable"*. So for `ender3_s1_pro` the owner supplies **sources**, and the
  researcher must re-derive `max_speed` / `max_acceleration` from them through
  the unchanged evidence gate. The owner's proposed values cannot be written
  directly, by design.
- **`attest-field` and `approve-series` cannot be stacked, in either order.**
  `attest-field` writes its own `ownerDecision` with
  `action:"reenter-with-evidence"` / `edge:"owner-instruction"`, and
  `intake-run-kickoff.md:9` says the runner applies a `series_group` only from
  the `action:"reenter"` envelope shape. Run attestation second and the series
  label survives in the packet but is no longer declared by the sanctioned
  envelope; run it first and `approve-series` throws
  `conflicting owner decision already exists`. For `hi` this is very likely
  moot — it parked on `new-series-group` alone, so `available_plates` should
  already be populated — but confirm the packet before assuming it.

## What happened / Actions

1. **Cold start (Trigger C).** Health line showed `3dprintassistant: current`,
   `3dprintassistant-ios: 4 unpushed`, `3dprintassistant-android: 4 unpushed`.
   No `behind:`/`diverged:` → gate passed, ahead-state surfaced. Read the
   protocol files, ROADMAP top, `NEXT-SESSION.md`, and the 2026-07-29 intake
   session log.
2. **Published an intake status — from the wrong branch.** Reported the last
   custody commit as 2026-07-31, flagged a possible dead runner and a stale
   headless-auth token, and questioned whether `provide-evidence` existed.
3. **Caught it while preparing issue #28/#29 work.** The GitHub issue footer
   names `intake-decision-issue.js`; the file was absent from `scripts/`. That
   disagreement — an artifact outside the checkout contradicting it — was the
   only signal. Switched to `main`, pulled, and re-verified every claim.
4. **Corrected the record.** Runner is healthy: custody commits on 08-06,
   08-07, 08-08, 08-09, 08-10. Headless auth is fine. `provide-evidence` and
   `attest-field` both exist on `main`. Only the `seturn` finding survived.
5. **Filed two issues** (owner asked for findings to be documented):
   [#33](https://github.com/mustiodk/3dprintassistant/issues/33) the
   owner-approved `seturn` guardrail proposal from run-20260729 was never
   applied — verified still open on `main`, the guardrails file has not been
   touched since 2026-06-15;
   [#34](https://github.com/mustiodk/3dprintassistant/issues/34) the generated
   decision-issue text says "run it from the repo root", which is the wrong
   root and fails silently in the stale-dev-tree case.
6. **Prepared both owner decisions** by reading `intake-owner-decision.js`
   (875 lines on `main`), `validate-candidate-evidence.js` and
   `intake-run-kickoff.md` rather than trusting the issue bodies. Produced the
   exact command sequence for `hi` (pre-check → dry-run → apply →
   verify-reentry) and for `ender3_s1_pro` (three source URLs, two unresolved
   fields). Handed off for execution on the mac-mini.
7. **Corrected my own `cd` path** after a backgrounded `find` returned and
   `install-intake-runner.sh:64` proved the checkout sits one directory
   deeper — while documenting in #34 that this path is hard to get right.

## Files touched

### Added

- `docs/sessions/2026-08-12-cowork-appdev-intake-status-and-decision-prep.md` (this file)
- `../ai-operating-model/docs/findings/2026-08-12-sync-health-reports-current-on-a-stale-feature-branch.md`

### Modified

- `docs/sessions/INDEX.md`
- `docs/sessions/NEXT-SESSION.md`
- `docs/planning/ROADMAP.md`
- `../ai-operating-model/docs/findings/INDEX.md`

### Deleted

- None.

## Commits

**No product code changed.** This session was read-only against the codebase;
its outputs are two GitHub issues, one finding, and the documentation commits
listed above. The repo was left on `main` (it opened on
`codex/feedback-diagnostics-v2`).

## Open questions / Follow-up

- **Both owner decisions are prepared but unexecuted.** They require the
  mac-mini; the parked sidecars are gitignored and host-local. `hi` is a single
  `approve-series` if the packet's `available_plates` is already valid — that
  pre-check is the one open unknown and gates the go/no-go.
- **#33 (`seturn`) is unassigned and unscheduled.** Low impact — the pipeline
  declined correctly both times; the cost is a wasted research lane on a
  repeat.
- **#34 fix is unwritten.** The suggested change is a one-line edit to the
  generated text in `intake-decision-issue.js` plus an optional stale-store
  warning.
- **The `workshop-*` and `state-codec` suites are still red on `main`**, open
  since 2026-08-10 and not touched here.
- **Md-hygiene sweep:** `diff -u Projects/CLAUDE.md Projects/AGENTS.md` clean;
  findings INDEX↔files parity verified programmatically (0 orphans, anchor
  uniqueness 1); no orphan root stubs; no untracked `.md` needing tracking; no
  secrets; no stray `</content>` tags in session-created files.
- **Lesson spotter:** escalated mode — the session contains a controller error
  corrected mid-flight. One candidate, accepted, captured as the K3 above. No
  K4 (no tool overruled the controller; the tool's silence *was* the finding),
  no K1 (no reviewer disagreement), no MCP finding (MCP not in scope).
- **Verify-before-mutate v2 summary, verbatim:**

```text
verify-before-mutate ledger: no entries this session
```

  One flag fired mid-session on the findings `INDEX.md` edit and was verified
  in the same turn by Bash (anchor uniqueness = 1, entry position, linked-file
  existence, 0 orphans across all findings) with the outcome stated inline
  before continuing. The end-of-session ledger reports no entries; the owner's
  read of that is the measurement, not mine.

## Next session

Nothing is blocked on code. The work is on the mac-mini: run the `hi`
pre-check, then the three-command `approve-series` sequence, then `ender3_s1_pro`.
All four commands are reproduced verbatim in `NEXT-SESSION.md`.
