# iOS 1.1.0 Notification Release Gate Ledger

**State:** Tasks 0–8 complete; Task 9 verification and hostile implementation
review in progress. Stop at G0. No Apple or Cloudflare resources have been
provisioned, no iOS commit has been pushed, no TestFlight build has been
dispatched, no App Review submission has been made, and no public notification
has been sent.

## Protected baselines

- Web baseline tag: `ios-1.1.0-plan-baseline-20260718` at `a0a8060`.
- Web implementation branch: `codex/ios-1.1.0-provider`.
- iOS recovery tag: `ios-1.1.0-nine-commit-baseline-20260718` at `cdf5906`.
- iOS implementation branch: `codex/ios-1.1.0-release`.
- The nine pre-authorized iOS commits remain in their original order; none was
  squashed, replayed, or pushed.

## Task evidence

| Task | State | Evidence |
|---|---|---|
| 0 | PASS | Cold-start health, parent verification, dry-run child push audit, fetch/status/divergence checks, baseline tags, and local branches completed before mutation. Android remained missing/out-of-scope; iOS began clean and nine commits ahead. |
| 1 | PASS | `df9aa8e` alone was fast-forwarded and pushed to web `main`; Cloudflare version 532 served root 200 while `/wrangler.toml`, `/worker.js`, and `/functions/api/feedback.js` returned 404. |
| 2 | PASS | `32ef0f0` adds the encrypted, authenticated, idempotent registration boundary with real local D1 tests. No production resource identifiers were added. |
| 3 | PASS | `91742d7` adds bounded campaign fan-out, APNs classification, Queue/DLQ handling, retention, supported owner CLI, and dark configuration. No production resources or secrets were created. |
| 4 | PASS | Local iOS commit `cf78b28` adds explicit topic consent, protected token state, rotation/unregister handling, signed API requests, entitlements/config wiring, and no Background Modes. |
| 5 | PASS | Local iOS commit `1a61c7d` adds safe typed routing and the Product Updates UX. Twenty controlled simulator timing samples: median 69.2 ms, p95 86.3 ms, max 88.0 ms; below the 750 ms blocking threshold. |
| 6 | PASS | `1e6f7be` fixes unchanged Workshop re-save (#2); `6bdb73c` uses the permanent Discord invite (#3). |
| 7 | PASS | Current web already contained the reviewed Workshop event contract; 30 web analytics tests passed without mutation. Local iOS commits `6391583`, `4720f12`, and `9f01f82` add selective backups, visible transfer actions, and privacy-safe successful-operation analytics. |
| 8 | PASS | Local iOS commits `e870420` and `d52ab0f` add native Bambu/Orca/Prusa file exports and allowlisted intent analytics. Focused gate: 22 unit/integration tests and 4 UI tests, 0 failures. |
| 9 | IN PROGRESS | Full cross-repo verification is green after two independently committed gate fixes; independent hostile Claude review is pending below. |

## Task 9 verification matrix

| Gate | Result | Evidence |
|---|---|---|
| Push provider suite | PASS | 9 files / 56 tests, 0 failures. |
| Worker analytics suites | PASS | 33 tests, 0 failures. |
| Data validation | PASS | All six data surfaces valid. |
| iOS printer overlay validation | PASS | 2 brands / 9 printers; collision baselines 1.0.3 and 1.0.4. |
| Walkthrough harness | PASS | 18 combinations clean; DQ-2 assertions green. Existing 17 schema soft warnings recorded, no failures. |
| Export audit | PASS | 0 FAIL / 0 warn / 5 info; all drift guards green. |
| Wrangler dry-run | PASS | Worker/assets bundle compiled with registration and public-send flags both `false`; no deployment performed. |
| `engine.js` byte identity | PASS | `cmp` exit 0. |
| `data/` recursive identity | PASS | `diff -qr` exit 0. |
| Full XCTest/XCUITest | PASS | 175 unit/integration tests + 4 UI tests, 0 failures. |
| Web and iOS diff checks | PASS | `git diff --check` clean in both repositories. |
| Independent hostile implementation review | PENDING | |

Two Task 9 gate defects were fixed one per commit before review:

- `91323c1` restores the CommonJS boundary for legacy validation scripts after
  the provider harness introduced package-wide ESM mode.
- iOS `b20be21` restores `MARKETING_VERSION=1.0.7`; the reviewed plan reserves
  the 1.1.0 bump for Task 11, and the existing 1.0.7 bundled-catalog baseline
  is therefore the correct pre-G0 validation surface.

## Web + iOS data/logic and UI/UX evaluation

- Provider logic belongs to the web Worker; the iOS app consumes only its
  explicit signed registration contract and APNs payload schema.
- No shared `engine.js` or `data/*.json` behavior changed in Tasks 0–8. Task 9
  must still prove the web-owned engine/data mirrors remain byte-identical.
- iOS functional/UI/UX changes are intentional and bounded: explicit opt-in
  Product Updates controls, safe notification routing, truthful Workshop
  transfer controls, and one slicer-honest native export action.
- Web UI requires no notification-provider surface. Provider administration is
  the supported CLI/runbook; registration remains dark until the post-G0
  provisioning and canary gates.

## External-state boundary

The following remain prohibited before owner G0: Apple capability or APNs-key
creation, Cloudflare D1/Queue/DLQ/rate-limit/secrets provisioning, iOS push,
TestFlight dispatch, App Review submission, and public notification delivery.
