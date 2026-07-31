# Feedback Diagnostics v2 — web/Worker implementation review

**Scope:** Tasks 1–7 only, on `codex/feedback-diagnostics-v2`. This is a feature-branch handoff review, not a production-deploy approval.

## Disposition

- Initial Bridge review: [`bridge-2026-08-01-003539-010382.md`](bridge-2026-08-01-003539-010382.md) — `GO-WITH-PATCHES`, 0 P0, 2 P1, 5 P2.
- P1 #1 fixed in `ed8ffc0`: capture metadata is validated against bounded server-side formats and closed vocabularies.
- P1 #2 fixed in `1dab6d0`: breadcrumb values use matching closed client/server vocabularies; the client drops unsafe values and the server rejects forged values.
- Confirmation Bridge review: [`bridge-2026-08-01-004403-679174.md`](bridge-2026-08-01-004403-679174.md) — `GO` for a clean feature-branch handoff, with both P1 findings confirmed closed and no new P0/P1 regression.

## Explicit carry to the next locked session

The initial review's five P2 findings remain open and must be handled one finding per commit before iOS Task 8:

1. Persist diagnostic completeness instead of computing and discarding it.
2. Do not classify a different physical-printer preference as supported when no canonical printer id exists.
3. Include catalog provenance and stop reporting a hard-coded initialized state.
4. Enforce minimal diagnostics for non-bug categories at the server boundary, not only in the client.
5. Align the client/server screen-length contract.

The confirmation reviewer also recorded a non-blocking should-fix: validate `captureReason` and `entryPoint` against the closed vocabulary on the client before submission. Treat it as part of the first P2 review-fix pass rather than widening this handoff gate.

## Local verification on the reviewed branch

- 81 Node tests: pass.
- Workers/Vitest: 12 files, 69 tests: pass.
- Release manifest: current.
- Data validation: pass; 17 pre-existing soft schema warnings remain.
- Domain walkthrough: 18 combinations, no automated failures.
- Export audit: 0 FAIL / 0 warn.
- Wrangler dry-run: pass; no feedback production bindings were added.
- `git diff --check`: pass.

No Cloudflare resource, secret, migration, preview, production deploy, iOS code, TestFlight build or App Store state was changed.
