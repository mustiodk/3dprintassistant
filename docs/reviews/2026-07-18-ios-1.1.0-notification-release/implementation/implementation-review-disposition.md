# iOS 1.1.0 implementation — hostile review disposition

**Review transcript:** [`bridge-2026-07-23-140114-042091.md`](bridge-2026-07-23-140114-042091.md)
(canonical `bridge --mode claude-only`, 870.1 s, exit 0, non-empty — the first
valid independent verdict after the two invalid 2026-07-19 attempts).

**Reviewed surfaces:** web `a0a8060..codex/ios-1.1.0-provider`, iOS
`origin/main..codex/ios-1.1.0-release` + focused baseline-tag diff.

**Initial verdict:** `NO-GO` — 1 P1, 6 P2, 5 optionals, evidence-gap list.

**Controller cross-check:** the controller (Claude, cross-model to the Codex
implementation) independently reviewed the full security/consent/routing core
in parallel and verified every finding against the code before acceptance; one
candidate controller finding (campaign counters never incremented) was
self-refuted by the migration's AFTER UPDATE triggers before it was ever
filed.

## Required findings

| Finding | Severity | Verification | Decision | Commit |
|---|---:|---|---|---|
| Cold-launch notification routing race: launch bootstrap conditions `prepareForLaunch()` on a pending destination whose delivery races SwiftUI `.task` | P1-A | CONFIRMED — design spec §6.2 says races are test cases, not timing assumptions; the miss path dead-ended in "not ready" without any refresh | Accept; fix as **refresh-on-miss** (see mechanism note below) | iOS `refresh-on-miss` commit |
| `finishCampaign` computed terminal status across three sequential D1 statements | P2-A | CONFIRMED | Accept; single atomic UPDATE with NOT EXISTS pending guard + new complete/partial/failed coverage | web `18c41ad` |
| Campaign duplicate + public-cadence checks TOCTOU | P2-B | PARTIAL — duplicate id was already PK-enforced (race loser got a 500, not a dupe); the 7-day cadence pre-read was a real TOCTOU | Accept cadence; guard moved into a conditional `INSERT..SELECT WHERE NOT EXISTS`, deliveries conditioned on the campaign row, UNIQUE race translated to the existing 409 | web `247bea7` |
| `replayCampaignCursor` set `queued` before enqueuing cursors | P2-C | CONFIRMED (sharpened: first-send failure leaves `queued` with zero in-flight messages — silent stall) | Accept; restore `blocked`/`replay_incomplete` when nothing was enqueued; partial progress stays `queued` + error drives operator replay | web `8f8acce` |
| APNs 400 `TopicDisallowed` classified `failed` instead of `blocked` | P2-D | CONFIRMED | Accept; classify like 403 so the campaign halts for repair | web `8682ab6` |
| Foreground permission revocation undetected until next cold launch | P2-E | **REFUTED** — `ContentView.onChange(of: scenePhase)` already calls `notificationService.refreshForLaunch()` on `.active`; the reviewer read only `NotificationService.swift` | Reject with evidence; no change | — |
| `PUSH_DLQ.send` outside the D1 batch leaves a blocked campaign with "no automated recovery driver" | P2-F | PARTIAL — the recovery driver is the D1 `preserved` cursor consumed by the admin replay endpoint; the DLQ copy is advisory, so nothing is lost. Real residue: the uncaught send failure converted the message into a pointless retry cycle | Accept reduced fix: swallow the DLQ transport failure after the D1 batch commits | web `29c3e94` |

### P1-A mechanism note

The reviewer's implied fix (populate the coordinator from
`launchOptions[.remoteNotification]` in `didFinishLaunching`) was not adopted:
with a `UNUserNotificationCenter` delegate the canonical tap path is
`didReceive`, launchOptions semantics for user taps are not reliable across
that configuration, and a synchronous pre-population would introduce a
double-delivery dedup problem. The adopted fix removes the timing dependence
entirely: on a catalog miss the coordinator keeps the destination pending and
requests exactly one fresh single-snapshot re-bootstrap (the existing
`engineRetry` path, which then observes `hasPendingNewPrinterDestination ==
true` and runs `prepareForLaunch()`); only a miss against the refreshed
catalog shows the locked not-ready fallback. This also repairs the same
staleness defect for warm taps, which the launchOptions approach would not.

## Optional findings (not promoted, dispositioned)

| Finding | Decision |
|---|---|
| `announcement_id` not unique-constrained across campaigns | Note; collapse reuse is an operator-controlled CLI input, runbook documents one announcement per event |
| `apns-id` response header discarded | Note; add if APNs-side debugging is ever needed |
| Registration token hex length unbounded below the 4096-byte body cap | Note; body bound + hash-keyed storage bound the risk |
| `Content-Type` not validated on push endpoints | Note; HMAC-over-raw-body is the actual gate |
| `ProductUpdatesView.task` re-runs `refreshForLaunch()` per sheet open | Note; idempotent and user-triggered |
| (evidence-gap adjunct) `push_replay_cursors` rows never purged by `runRetention` | Note for Task 10 runbook; rows are rare (blocked campaigns only) and tiny |

## Evidence gaps

The reviewer could not verify locally: issues #2–#5, native export
serializers, notification test coverage, entitlements env resolution,
engine/data byte-identity, canary round-trip. These are covered by the Task 9
Step 1 full local gate (provider suite, Worker suites, validators, walkthrough,
export audit, Wrangler dry-run, byte-identity `cmp`/`diff -qr`, full
XCTest/XCUITest) recorded in
[`IOS-1.1.0-GATE-LEDGER.md`](../../../planning/IOS-1.1.0-GATE-LEDGER.md), which
is rerun after the fix train; the canary round-trip is a designed post-G0 Task
10 gate.

## Stop rule

- A follow-up confirmation review must verify the applied fixes before Task 9
  Step 2 closes (a reviewer's proposed fix carries no authority; the applied
  diff is the review surface).
- `GO` with no open P0/P1/P2 completes Task 9 Step 2 only. Provisioning, iOS
  push, TestFlight, App Review, and any public send stay prohibited until
  owner G0.
