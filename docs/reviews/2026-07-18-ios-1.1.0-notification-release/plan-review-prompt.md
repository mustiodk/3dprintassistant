# Hostile review prompt — iOS 1.1.0 implementation plan

## Context

The owner ratified the iOS 1.1.0 notification-release design. Codex created the
replacement implementation plan that must govern both the web/provider repo and
the sibling iOS repo. No implementation or provisioning has started.

## Decision to challenge

Challenge whether the plan is executable, correctly sequenced, testable, and
complete enough to ship a first-party APNs system plus the existing release
scope without privacy/security/release gaps.

## Artifacts

- `3dprintassistant/docs/superpowers/specs/2026-07-18-ios-1.1.0-notification-release-design.md`
- `3dprintassistant/docs/superpowers/plans/2026-07-18-ios-1.1.0-notification-release-plan.md`
- `3dprintassistant/docs/reviews/2026-07-18-ios-1.1.0-notification-release/disposition.md`
- Current `3dprintassistant/` and sibling `3dprintassistant-ios/` source/tests.

## Checks already run

- Spec hostile review converged to GO with no remaining P0/P1/P2.
- Both worktrees were clean before planning; web was 15 ahead and iOS nine
  ahead under its push gate.
- Current interfaces, release templates, privacy text, Worker config, iOS
  startup/navigation/export/analytics code, and canonical review protocol were
  inspected.
- Current Cloudflare D1, Queue/DLQ, rate-limit, Cron, Vitest, and Apple APNs
  entitlement documentation was checked.

## Concrete uncertainty

Look hardest for D1 atomicity/schema gaps, Queue/DLQ replay impossibility,
provider-auth blast radius, secret handling, APNs/JWT assumptions, registration
abuse, opt-out/rotation races, cancellation timing, privacy mismatch, iOS
delegate/permission/cold-launch races, catalog snapshot divergence, native file
export claims, wrong owner boundaries, stale version sequencing, and commands
that cannot work in these repos.

## Feedback wanted

Return:

1. P0/P1/P2 findings with exact artifact/file references and concrete fixes.
2. Optional findings separately.
3. A final verdict: `GO`, `GO-WITH-PATCHES`, or `NO-GO`.

Be hostile and evidence-based. Do not edit files. Do not request or print
secrets. A reviewer verdict is evidence, not ship permission.
