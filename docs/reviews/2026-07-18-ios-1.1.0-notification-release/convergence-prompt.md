# Hostile cross-model convergence prompt — iOS 1.1.0 notifications

This is round 2 of the read-only Claude hostile review. Read the current full
spec and verify that every round-1 finding is durably corrected without creating
a new P0/P1/P2 contradiction at pre-implementation design altitude.

## Artifacts

- Current spec:
  `docs/superpowers/specs/2026-07-18-ios-1.1.0-notification-release-design.md`
- Round 1 report:
  `docs/reviews/2026-07-18-ios-1.1.0-notification-release/bridge-2026-07-18-160823-605833.md`
- Disposition:
  `docs/reviews/2026-07-18-ios-1.1.0-notification-release/disposition.md`

## Patch set

- F1 `ea80b02` — opt-out/device-row race becomes `consent_removed`, no retry/DLQ.
- F2 `d3a4fcd` — APNs provider-auth failure blocks campaign and DLQs cursor
  without invalidating devices.
- F3 `7abc6a4` — current source/config HTTP-200 exposure named and gated behind
  exact exclusions, Worker denies, and non-200 production probes.
- F4 `aa00da3` — signed APNs rotation atomically replaces retained prior token.
- F5 `7f61fd6` — Cron config + exported/testable scheduled retention handler.
- F6 `af1563d` — DLQ recovery replays the same campaign/cursor/ledger.
- F7 `31f249e` — authenticated cancellation + in-flight status checks.
- F8 `fcee70e` — provider-auth halt and register-off/unregister-open tests.
- Controller correction `bf32511` — delivery keys/canary selection include APNs
  environment.

The controller independently verified the round-1 iOS source claims that your
web-repo sandbox could not read. Do not re-report that access limitation as a
design defect.

## Review job

1. Verify F1–F8 against the current text; a defective or contradictory patch is
   a finding.
2. Check interactions among consent deletion, token rotation, campaign
   idempotency/cadence, cancellation, provider-auth halt, DLQ replay, retention,
   flags, and the TestFlight/App Review sequence.
3. Report only remaining/new actionable P0/P1/P2 findings at spec altitude.
4. Do not demand implementation-level naming or code that the future TDD plan
   can safely decide.

For each finding: severity, exact section, concrete failure, smallest durable
correction. Finish with exactly one verdict: `GO`, `GO-WITH-PATCHES`, or
`NO-GO`, plus one sentence. If no P0/P1/P2 remains, say `GO` plainly.

Read-only constraints remain: no edits, commits, pushes, deploys, provisioning,
notifications, TestFlight actions, or secret access/output.
