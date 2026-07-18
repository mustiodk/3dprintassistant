# iOS 1.1.0 notification release — hostile review disposition

**Pre-review spec commit:** `aae423b`

**Round 1:**
[`bridge-2026-07-18-160823-605833.md`](bridge-2026-07-18-160823-605833.md)
— Claude `GO-WITH-PATCHES`, 3 P1 + 5 P2

## Controller validation

- Bridge exited 0 after 541.6 seconds; the Claude section is non-empty.
- The reviewer could not read the sibling iOS repo from its web-repo sandbox.
  The controller independently verified the iOS worktree is clean and that
  `EngineService` has Bambu/Orca/Prusa serializers while `OutputViewModel` only
  wires Bambu and `OutputView.exportMenu` remains private/unreferenced.
- F3's source-exposure premise was tested against production without printing
  content: `/wrangler.toml`, `/worker.js`, and `/functions/api/feedback.js` each
  returned HTTP 200. This is a current pre-existing security finding, not merely
  a future D1/Queue concern. Runtime remediation remains outside this spec-only
  session and is tracked as the first implementation gate.

## Findings

| ID | Severity | Decision | Status | Required correction |
|---|---|---|---|---|
| F1 | P1 | Accept | Patched | Missing device row becomes `consent_removed` and never retries/DLQs. |
| F2 | P1 | Accept | Patched | APNs 403/provider-auth errors block the campaign, DLQ the cursor, and preserve device rows. |
| F3 | P1 | Accept | Pending | Name all currently exposed source/config paths and make non-200 production probes a first gate. |
| F4 | P2 | Accept with stronger fix | Pending | Atomically replace the prior APNs token on rotation instead of accepting duplicate orphan rows. |
| F5 | P2 | Accept | Pending | Name Wrangler Cron config plus exported scheduled handler. |
| F6 | P2 | Accept | Pending | DLQ recovery replays the same campaign/delivery ledger and does not bypass cadence. |
| F7 | P2 | Accept | Pending | Add campaign cancellation; consumer rechecks it while in flight. |
| F8 | P2 | Accept | Pending | Add provider-auth halt and register-disabled/unregister-open tests. |

One accepted finding lands per commit. A convergence Bridge round follows all
eight corrections; reviewer verdict remains evidence, not ship permission.
