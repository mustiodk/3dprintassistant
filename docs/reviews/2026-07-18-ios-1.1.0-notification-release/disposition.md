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
- Post-patch controller consistency review aligned the delivery ledger and
  canary selector with the device table's APNs environment key; development and
  production rows cannot collide or be guessed across environments.

## Findings

| ID | Severity | Decision | Status | Required correction |
|---|---|---|---|---|
| F1 | P1 | Accept | Patched | Missing device row becomes `consent_removed` and never retries/DLQs. |
| F2 | P1 | Accept | Patched | APNs 403/provider-auth errors block the campaign, DLQ the cursor, and preserve device rows. |
| F3 | P1 | Accept | Patched | Live 200 paths are named; exact exclusions/denies and non-200 probes are gate zero. |
| F4 | P2 | Accept with stronger fix | Patched | Signed rotation atomically upserts new token and deletes the retained previous route. |
| F5 | P2 | Accept | Patched | `wrangler.toml` Cron plus exported/testable scheduled retention handler are explicit gates. |
| F6 | P2 | Accept | Patched | Authenticated DLQ replay resumes the same campaign/cursor and ledger; no new cadence entry. |
| F7 | P2 | Accept | Patched | Authenticated cancellation plus status checks before pages/sends stop in-flight fan-out. |
| F8 | P2 | Accept | Patched | Both provider-auth mid-fan-out and register-off/unregister-open tests are explicit. |

One accepted finding lands per commit. A convergence Bridge round follows all
eight corrections; reviewer verdict remains evidence, not ship permission.

## Convergence attempts

- Web-repo retry
  [`bridge-2026-07-18-161630-451842.md`](bridge-2026-07-18-161630-451842.md)
  exited 0 but was **semantically incomplete**: Claude requested sibling iOS
  permission and returned no required verdict. It is preserved but contributes
  no review evidence. Retry runs from the narrowest common parent.
- Common-parent retry
  [`bridge-2026-07-18-162226-327511.md`](bridge-2026-07-18-162226-327511.md)
  is valid: Claude read both repos, verified F1–F8 and the iOS starting-state
  claims, and returned `GO-WITH-PATCHES` with one new P2.

| ID | Severity | Decision | Status | Required correction |
|---|---|---|---|---|
| F9 | P2 | Accept with stronger fix | Patched | `token_rotated` has distinct ledger/status/count semantics and wins races by compare-and-set. |

The final reviewer classified retry overcount as below P2. Final controller
tightening nevertheless makes the aggregate increment equal the number of rows
that actually transition, so a retry adds zero.

- Final confirmation
  [`bridge-2026-07-18-162715-485017.md`](bridge-2026-07-18-162715-485017.md)
  returned **`GO`**: F1–F8 remained corrected, F9 is coherent with F1/F4/F6,
  retention, and idempotency, and no remaining/new P0/P1/P2 was found.

## Patch commits

| Finding | Commit |
|---|---|
| F1 | `ea80b02` |
| F2 | `d3a4fcd` |
| F3 | `7abc6a4` |
| F4 | `aa00da3` |
| F5 | `7f61fd6` |
| F6 | `af1563d` |
| F7 | `31f249e` |
| F8 | `fcee70e` |
| Controller environment-key correction | `bf32511` |
| F9 | `1869568` |
| Below-P2 retry-count tightening | `5d331f9` |

**Final state:** design review complete and owner-ratified 2026-07-18. The
replacement implementation plan is drafted, but its hostile review is
`BLOCKED-AUTH`; see
[`plan-review-disposition.md`](plan-review-disposition.md). No implementation,
infrastructure, iOS push, TestFlight, or App Store action taken.
