# 2026-07-19 — Cowork (appdev): iOS 1.1.0 Tasks 0–9

## Durable context

- Tasks 0–8 and Task 9 Step 1 are complete. The source candidate is locally
  proven but not independently implementation-reviewed.
- Task 9 Step 2 is blocked fail-closed: both authorized Claude transports
  returned empty output at their 900-second bounds. G0 was not reached.
- Web provider work remains local on `codex/ios-1.1.0-provider`. iOS work
  remains local on `codex/ios-1.1.0-release`; the iOS push gate is intact.
- No Apple capability/APNs key or Cloudflare D1/Queue/DLQ/rate-limit/secrets
  resource was created. No TestFlight, App Review, or public send occurred.

## What happened / Actions

1. Ran the complete cold-start sync/custody gate. Web was clean/current at
   `a0a8060`; iOS was clean and nine commits ahead. Tagged both baselines and
   created local implementation branches without replaying history.
2. Closed the production source-exposure gate TDD-first. `df9aa8e` alone was
   fast-forwarded/pushed; production root remained 200 while `/wrangler.toml`,
   `/worker.js`, and `/functions/api/feedback.js` returned 404.
3. Built the local provider registration, encrypted token storage, campaigns,
   APNs fan-out, cancellation, retention, Queue/DLQ handling, owner CLI, and
   dark config. No external resource or secret was created.
4. Built explicit iOS notification consent, protected token lifecycle, signed
   requests, safe notification routing, fresh-catalog launch, and Product
   Updates UI. Twenty simulator timing samples measured median 69.2 ms, p95
   86.3 ms, max 88.0 ms.
5. Landed issues #2–#5 one concern per commit: stable Workshop saved-state
   identity, permanent Discord link, selective backups/visible transfer,
   Workshop analytics, native slicer exports, and export-intent analytics.
6. Task 9 initially exposed package-wide ESM breaking four CommonJS validator
   scripts and a premature 1.1.0 marketing-version bump. Fixed separately in
   web `91323c1` and iOS `b20be21`, then reran the exact gates.
7. Full local verification passed: provider 56/56; Worker/analytics 33/33; data,
   overlay, 18-combo walkthrough, export audit (0 FAIL / 0 warn), Wrangler
   dry-run, engine/data identity, diff checks, XCTest 175/175, XCUITest 4/4.
8. Ran the canonical protected `bridge --mode claude-only` review: exit 124,
   empty stdout/stderr after 900 seconds. Preserved it as invalid evidence.
9. Ran the one authorized protected direct read-only `claude -p` fallback with
   edit/write tools disabled: empty through 900 seconds, then terminated.
   Preserved it as invalid evidence and stopped fail-closed.

## Commits

### Web

- `df9aa8e` — production source/config denial; the only implementation pushed.
- `32ef0f0` — encrypted consent registration boundary (local branch only).
- `91742d7` — bounded APNs campaign delivery (local branch only).
- `91323c1` — preserve CommonJS validation scripts (local branch only).
- `1b46c83` — initial Task 9 gate ledger and review prompt (local branch only).

### iOS — all local, none pushed

- `cf78b28`, `1a61c7d` — consent lifecycle and safe Product Updates routing.
- `1e6f7be`, `6bdb73c` — issues #2 and #3.
- `6391583`, `4720f12`, `9f01f82` — Workshop issue #4/#5 train.
- `e870420`, `d52ab0f` — native slicer export issue #4/#5 train.
- `b20be21` — defer the marketing-version bump to Task 11.

## Open questions / Follow-up

- Resume **only Task 9 Step 2** in a fresh session. Do not rebuild Tasks 0–8.
- Obtain one valid, non-empty independent Claude implementation review against
  the stable diffs. If it finds P0/P1/P2 defects, fix each in its own commit,
  rerun focused plus full gates, and seek a final `GO`.
- Task 9 Step 3 and G0 remain closed until that `GO`. Do not report the owner
  prerequisites early and do not provision or ship.
- Evidence: `docs/planning/IOS-1.1.0-GATE-LEDGER.md` and
  `docs/reviews/2026-07-18-ios-1.1.0-notification-release/implementation/`.

## Next session

Cold-start 3dpa, verify both local branches and their clean state, then resume
the reviewed plan at Task 9 Step 2 only. Preserve the same protected review
subprocess boundary. Stop fail-closed unless a valid review closes all
P0/P1/P2; only then declare G0 and report Task 9 Step 3's exact non-secret
owner prerequisites.

