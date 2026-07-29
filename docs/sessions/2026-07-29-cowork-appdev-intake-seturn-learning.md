# 2026-07-29 — Intake recovery proof + Seturn retrospective learning

## Durable context

- Scheduled run `run-20260729T100106Z` crossed the shipped PD8 exact-run
  recovery path and reached terminal custody in `cd9adf9`. It resolved
  `Elegoo seturn 4 ultra 16k` to the Elegoo Saturn 4 Ultra 16K, confirmed that
  it is an MSLA/resin printer, and correctly declined it as non-FDM without
  catalog, overlay, or provenance changes.
- The durable custody commit proves the scheduled runner got beyond the former
  retained-freeze stop. The exact raw `RECOVERY` line, overwritten run report,
  and Discord message remain host-local on the mac-mini and were not available
  from this MacBook Air session.
- The outcome's original corrective signal
  `resinKeywords:seturn-typo-of-saturn` was not parseable by the retrospective,
  and `declined-correct` outcomes were excluded from miss clustering. A correct
  final product decision could therefore hide a deterministic Scout miss.
- `a0b9100` fixes that learning gap narrowly: `declined-correct` is eligible
  only when an explicit parseable signal exists, and the append-only correction
  now proposes literal `resinKeywords:seturn`. Applying that proposal to live
  guardrails still requires the normal owner-apply gate.
- This is intake-automation logic only. It changes no printer data, engine
  behavior, web UI, iOS UI, or bundled/remote catalog, so no walkthrough,
  mirror, XCTest, TestFlight, or app deployment was needed.

## What happened / Actions

- Ran the mandatory 3dpa cold start and reconciled web/iOS Git state before
  trusting local logs. Web fast-forwarded; iOS `main` aligned to
  `origin/main`, with the displaced local commits preserved on
  `origin/codex/export-phase2-ios-sync-20260711`.
- Read the latest implementation/planning logs, ROADMAP, S2 ledger,
  `NEXT-SESSION.md`, the intake patch, custody outcome, and current
  retrospective implementation.
- Reconstructed the latest run from durable evidence and reported the correct
  non-FDM decline plus the missing learning signal.
- Added a RED regression proving a `declined-correct` outcome with explicit
  `resinKeywords:seturn` must generate one literal candidate.
- Added `declined-correct` to the retrospective miss-resolution set and
  appended an owner-approved last-line-wins correction to the outcomes ledger;
  the original line remains untouched.
- Verified the real ledger now yields exactly one stated-confidence proposal:
  add `seturn` to `resinKeywords`, backed by
  `run-20260729T100106Z`.
- Closed the recovery incident as operationally proven in ROADMAP, the intake
  autonomy v2 gate ledger, and the prior resume surface.
- Pushed both product commits to web `main`; local `HEAD` and `origin/main`
  matched at `81f11f3`.
- Lesson spotter escalated because the owner corrected the initial sync
  hesitation. K4
  [`2026-07-29-controller-paused-cold-start-instead-of-syncing`](../../../ai-operating-model/docs/findings/2026-07-29-controller-paused-cold-start-instead-of-syncing.md)
  captures the execution-discipline miss without adding a duplicate protocol
  rule.

## Files touched

### Modified

- `scripts/intake-retrospective-gather.js`
- `scripts/intake-retrospective.test.js`
- `scripts/printer-intake-outcomes.jsonl`
- `docs/planning/ROADMAP.md`
- `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md`
- `docs/sessions/INDEX.md`
- `docs/sessions/NEXT-SESSION.md`

### Added

- `docs/sessions/2026-07-29-cowork-appdev-intake-seturn-learning.md`

### Deleted

- None.

### Untracked

- Pre-existing hygiene item:
  `codex/intake-autonomy-v2.1-review/direct-codex-2026-07-10-r6-followup.md`.
  It appears to be a substantive July 10 review output but is not tracked;
  owner should decide whether to commit it into that review packet or retire
  it. This session did not alter it.

## Commits

- `cd9adf9` — scheduled-run custody for the correctly declined resin printer
  (pre-existing run output reviewed this session).
- `a0b9100` — `fix(intake): learn from correct researched declines`.
- `81f11f3` — `docs(intake): close freeze recovery incident`.
- Parent/AI-OM `05792bc` — K4 sync-discipline finding.
- Wrap-only web commit recorded after finalization.

## Open questions / Follow-up

- Owner decision remains whether to apply the generated
  `resinKeywords:seturn` proposal to live guardrails. The retrospective remains
  propose-and-approve; this session did not ratify or apply it.
- Exact raw mac-mini run-report/Discord evidence was unavailable on the Air.
  Durable custody proves the terminal outcome and recovery traversal, but a
  future incident that needs line-level operational forensics must inspect the
  runtime host before the single report is overwritten.
- Md-hygiene: no root redirect stubs, secret files, bare trailing
  `</content>` tags, ROADMAP staleness, or session-INDEX parity gaps were found.
  The one pre-existing untracked Codex review output above needs owner
  disposition; no silent cleanup was performed.
- Lesson spotter: escalated mode, 1 candidate, 1 accepted, 1 high-value enough
  to capture as a low-friction K4; no K1, K3, MCP, or K1 safety-net finding.
- Verify-before-mutate v2 summary, verbatim:

```text
verify-before-mutate ledger: no entries this session
```

## Next session

No implementation task is locked. Run `3dpa cold start`, verify Git health, and
ask the owner which live ROADMAP priority to take. If the owner chooses the
Seturn learning follow-up, regenerate/inspect the retrospective candidate and
obtain explicit approval before changing live guardrails.
