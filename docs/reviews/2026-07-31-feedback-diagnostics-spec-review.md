# Feedback Diagnostics v2 — cross-model spec review

**Date:** 2026-07-31
**Target:** [`../superpowers/specs/2026-07-31-feedback-diagnostics-design.md`](../superpowers/specs/2026-07-31-feedback-diagnostics-design.md)
**Reviewer:** Claude through Bridge, driven by Codex
**Command shape:** `bridge --mode claude-only ... --turn-timeout-seconds 900`
**Evidence:** Bridge health green; review exit `0`; completed in 292.9 seconds
**Raw session output:** `/tmp/bridge-2026-07-31-231119-148879.md` on the review machine
**Verdict:** `GO-WITH-PATCHES`

## Reviewer findings

### Must-fix

1. The new `userContent` shape could silently disconnect the existing Printer
   Intake heuristic tee, which currently reads legacy `fields`.
2. The web release-manifest mechanism was unspecified for the build-less static
   deploy and could reproduce the current hard-coded-version defect.
3. EU D1 jurisdiction was asserted without a current verification gate.

### Should-fix

1. Remove synchronous fingerprint-match counting from the submission path.
2. Collapse `status`, `resolution` and duplicate linkage into a simpler solo
   triage taxonomy.
3. Add rate limiting before persisting feedback in D1.
4. Expand the privacy update to cover the already-existing Discord relay,
   optional email and Sentry cross-link.
5. Prevent preview/canary work from writing real data into production storage.
6. Mirror web ring-buffer eviction coverage in iOS tests.
7. Remove `key_version` unless a real rotation procedure exists.

### Optional

- Validate release channels per platform.
- Enumerate initial error entry points before implementation.
- State the intentional Discord-failure-semantics change explicitly.
- Mention that “My printer” remains local until a report is submitted.

## Controller disposition

All findings were accepted and applied to the spec. The simplification choices
were:

- one `disposition` field rather than status + resolution;
- fingerprint matches queried only when the owner opens a report;
- no keyring—on emergency rotation, delete the disposable active report rows;
- local D1 integration tests plus synthetic production canaries instead of a
  second preview database;
- one section in the existing `/analytics` owner page, not a support app.

No implementation, provisioning, deployment or iOS release action was taken.
