# Hostile cross-model convergence prompt — common-parent retry

This is the semantic retry of the convergence review. The prior retry exited 0
but returned no verdict because its sandbox could not read the sibling iOS repo.
You are now running from the narrowest common parent, `Projects/`, so read the
artifacts directly and do not request another permission grant.

## Artifacts

- Current spec:
  `3dprintassistant/docs/superpowers/specs/2026-07-18-ios-1.1.0-notification-release-design.md`
- Round 1 report:
  `3dprintassistant/docs/reviews/2026-07-18-ios-1.1.0-notification-release/bridge-2026-07-18-160823-605833.md`
- Disposition:
  `3dprintassistant/docs/reviews/2026-07-18-ios-1.1.0-notification-release/disposition.md`
- Relevant iOS proof surfaces:
  `3dprintassistant-ios/project.yml`,
  `3dprintassistant-ios/3DPrintAssistant/App/PrintAssistantApp.swift`,
  `3dprintassistant-ios/3DPrintAssistant/App/ContentView.swift`,
  `3dprintassistant-ios/3DPrintAssistant/Services/PrinterCatalogProvider.swift`,
  `3dprintassistant-ios/3DPrintAssistant/Views/Output/OutputViewModel.swift`, and
  `3dprintassistant-ios/3DPrintAssistant/Views/Output/OutputView.swift`.

## Round-1 patch set

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

## Review job

1. Read the current full spec and verify F1–F8 are durably corrected.
2. Verify the named iOS starting-state claims now that both repos are readable.
3. Check interactions among consent deletion, token rotation, campaign
   idempotency/cadence, cancellation, provider-auth halt, DLQ replay, retention,
   flags, launch routing, and TestFlight/App Review sequence.
4. Report only remaining/new actionable P0/P1/P2 findings at pre-implementation
   design altitude. A defective patch is a finding; implementation-level naming
   that a later TDD plan can safely decide is not.

For each finding give severity, exact section, concrete failure, and smallest
durable correction. Finish with exactly one verdict: `GO`,
`GO-WITH-PATCHES`, or `NO-GO`, plus one sentence. If no P0/P1/P2 remains, say
`GO` plainly.

Read-only: no edits, commits, pushes, deploys, provisioning, notifications,
TestFlight actions, or secret access/output.
