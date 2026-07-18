# Hostile implementation review — iOS 1.1.0 notifications release

You are the independent Claude reviewer. Do not edit files, create resources,
deploy, push, or reveal secrets. Review the implementation as evidence only.

## Authoritative requirements

Read in full:

1. `3dprintassistant/docs/superpowers/specs/2026-07-18-ios-1.1.0-notification-release-design.md`
2. `3dprintassistant/docs/superpowers/plans/2026-07-18-ios-1.1.0-notification-release-plan.md`
3. `3dprintassistant/docs/reviews/2026-07-18-ios-1.1.0-notification-release/plan-review-disposition.md`
4. `3dprintassistant/docs/planning/IOS-1.1.0-GATE-LEDGER.md`

## Exact review surfaces

From `/Users/mustafaozturk-macmini/dev/Claude/Projects`, inspect:

- Web source-complete diff: `git -C 3dprintassistant diff a0a8060..codex/ios-1.1.0-provider`
- Web implementation commits: `df9aa8e`, `32ef0f0`, `91742d7`
- iOS release-train diff including the owner-authorized nine-commit baseline:
  `git -C 3dprintassistant-ios diff origin/main..codex/ios-1.1.0-release`
- Focused iOS Tasks 4–8 diff:
  `git -C 3dprintassistant-ios diff ios-1.1.0-nine-commit-baseline-20260718..codex/ios-1.1.0-release`
- The relevant tests, `wrangler.toml`, migrations, runbook/CLI, project config,
  entitlements, and Task 9 verification evidence.

The web implementation branch is intentionally local-only after Task 1. The
iOS branch is intentionally entirely local-only. Treat absence of deployment,
resource identifiers, secrets, iOS push, and TestFlight as required gate
behavior, not missing implementation.

## Hostile review checklist

Look specifically for defects in:

- static source denial and production security isolation;
- request-size limits, raw-body HMAC, secret separation, replay resistance,
  encryption at rest, rotation, opt-out, and deletion-handle preservation;
- D1 transaction/atomicity behavior, uniqueness/idempotency, concurrency,
  cancellation, retention, and redaction;
- Queue/DLQ contracts, bounded fan-out, retry/terminal APNs classification,
  HTTP/2 headers, 403 campaign halt, and APNs environment separation;
- explicit consent, no launch-time prompt, topic defaults, external permission
  revocation, protected token lifecycle, and truthfulness of UI state;
- one-slot cold/warm routing, same-snapshot catalog use, timeout fallback,
  malformed/untrusted payload handling, and missing-printer fallback;
- issue #2 stable identity, issue #3 URL, Workshop backup/import behavior;
- Bambu/Orca/Prusa serializer selection, atomic file creation/cleanup, safe
  filenames, visible errors, and share-sheet timing;
- analytics allowlists, privacy boundaries, success-vs-intent timing, and lack
  of arbitrary strings/content/URLs;
- twin-repo engine/data identity and release gates, including the hard stop at
  G0 and preservation of the iOS push gate.

## Required response contract

Return:

1. `VERDICT: GO` or `VERDICT: NO-GO`.
2. Every P0, P1, and P2 finding, each with severity, exact file and line
   reference, concrete failure mode, and smallest safe correction.
3. Optional findings separately; do not promote stylistic preferences.
4. A requirement-to-evidence gap list for anything that cannot be proven
   locally.

`GO` is valid only when no P0/P1/P2 finding remains open. A green review is not
permission to provision or ship.

