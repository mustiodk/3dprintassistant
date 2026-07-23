# iOS 1.1.0 Notification Release Gate Ledger

**State (2026-07-23):** **Tasks 0–9 complete; owner G0 given; Task 10 Steps 1–4
complete (dark provider deployed); Step 5 device canary pending the owner's
physical device.** The independent hostile implementation review produced a
valid verdict (NO-GO: 1 P1 + 6 P2), every accepted finding was closed one per
commit, the full cross-repo gate battery was rerun green, and the confirmation
review returned **`GO` with no remaining or new P0/P1/P2**. Under G0 the dark
Cloudflare provider is now provisioned and deployed with **both send flags
`"false"`**. **Still not done (Task 12, own owner gates):** no iOS commit
pushed, no TestFlight build dispatched, no App Review submission, and no public
notification sent. Registration also remains disabled
(`PUSH_REGISTRATION_ENABLED="false"`) until the Step 5 canary.

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
| 9 | PASS | Step 1: full cross-repo verification green after two independently committed gate fixes. Step 2 (2026-07-23): valid canonical `bridge --mode claude-only` review (870.1 s, exit 0, non-empty) returned NO-GO with 1 P1 + 6 P2; accepted findings fixed one per commit (web `8682ab6`/`18c41ad`/`247bea7`/`8f8acce`/`29c3e94`, iOS `3f886bf`), P2-E refuted with code evidence; full gates rerun green (provider 62, Worker 33, XCTest 177, XCUITest 4, all validators/audits/dry-run/identity/diff); confirmation review of the applied fixes returned `GO`, no remaining or new P0/P1/P2. Step 3: stopped at G0 with the exact owner prerequisites reported. Disposition: [`implementation-review-disposition.md`](../reviews/2026-07-18-ios-1.1.0-notification-release/implementation/implementation-review-disposition.md). |

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
| Independent hostile implementation review | PASS (2026-07-23) | Valid `bridge --mode claude-only` verdict after the 2026-07-19 invalid attempts: initial NO-GO (1 P1, 6 P2, 5 optionals) → all accepted findings fixed one per commit → gates rerun green (provider 62, XCTest 177) → confirmation review of the applied diffs: `GO`, no remaining or new P0/P1/P2. Transcripts: `bridge-2026-07-23-140114-042091.md` + `bridge-2026-07-23-142532-902585.md`. |

Two Task 9 gate defects were fixed one per commit before review:

- `91323c1` restores the CommonJS boundary for legacy validation scripts after
  the provider harness introduced package-wide ESM mode.
- iOS `b20be21` restores `MARKETING_VERSION=1.0.7`; the reviewed plan reserves
  the 1.1.0 bump for Task 11, and the existing 1.0.7 bundled-catalog baseline
  is therefore the correct pre-G0 validation surface.

## Independent review — resolved 2026-07-23

- The 2026-07-19 blocker is closed. Invalid attempts (preserved as evidence):
  [`bridge-invalid-2026-07-19.md`](../reviews/2026-07-18-ios-1.1.0-notification-release/implementation/bridge-invalid-2026-07-19.md)
  + [`direct-claude-invalid-2026-07-19.md`](../reviews/2026-07-18-ios-1.1.0-notification-release/implementation/direct-claude-invalid-2026-07-19.md).
- Valid review round:
  [`bridge-2026-07-23-140114-042091.md`](../reviews/2026-07-18-ios-1.1.0-notification-release/implementation/bridge-2026-07-23-140114-042091.md)
  (NO-GO, 1 P1 + 6 P2 + 5 optionals) → six one-finding-one-commit fixes + one
  refutation → full gate rerun green → confirmation round
  [`bridge-2026-07-23-142532-902585.md`](../reviews/2026-07-18-ios-1.1.0-notification-release/implementation/bridge-2026-07-23-142532-902585.md)
  (`GO`, applied fixes verified, no remaining or new P0/P1/P2).
- Full finding-by-finding record:
  [`implementation-review-disposition.md`](../reviews/2026-07-18-ios-1.1.0-notification-release/implementation/implementation-review-disposition.md).

## Task 10 evidence (owner G0 given — Steps 1–4 complete, Step 5 pending)

Step 1 — Apple (owner-side, controller-assisted in-browser): Push Notifications
capability enabled on `dk.mragile.3DPrintAssistant` (verified persisted on
reload); dedicated APNs Auth Key `3DPA APNs Push` created (Sandbox &
Production, Team Scoped All Topics), Key ID `VL83ZC2PD7`, Team ID `76GG9356DU`;
`.p8` stored by the owner outside the repo at mode 600. The prior ASC API key
was not reused.

Step 2 — Cloudflare provisioning (account `mustiodk@gmail.com`):
- EU D1 `3dpa-push-production` created, `jurisdiction = eu` (running region
  EEUR), bound as `PUSH_DB` in `wrangler.toml` (commit `0174d2c`).
- Queues `3dpa-push-production` + `3dpa-push-dlq` created.
- Rate-limit `namespace_id = 11001` collision-checked: the account has exactly
  two Workers (Workers & Pages "Showing 1-2 of 2"); `personal-dashboard` has no
  rate-limit binding, so `11001` is free — no change.

Step 3 — Secrets (owner-entered interactively, values never printed): all six
Worker secrets present via `wrangler secret list`
(`IOS_PUSH_REGISTRATION_SECRET`, `PUSH_ADMIN_TOKEN`,
`PUSH_TOKEN_ENCRYPTION_KEY_V1`, `APNS_KEY_ID`, `APNS_TEAM_ID`,
`APNS_PRIVATE_KEY_P8`), distinct from `FEEDBACK_HMAC_SECRET`;
`IOS_PUSH_REGISTRATION_SECRET` also set on GitHub repo
`mustiodk/3dprintassistant-ios` with a matching value. Formats verified against
Worker code: encryption key = base64 of exactly 32 bytes; registration secret =
hex (xcconfig-safe, no `/`); `.p8` = raw PKCS#8 PEM via file stdin.

Step 4 — Migrate + dark deploy:
- `0001_push.sql` applied to remote EU `PUSH_DB` (17 statements ✅; re-list
  clean; `push_devices` / `push_replay_cursors` / … tables present).
- `wrangler deploy` succeeded; output confirms `PUSH_DB` (D1), producers
  `PUSH_FANOUT`/`PUSH_DLQ`, **Consumer for 3dpa-push-production**,
  `PUSH_REGISTRATION_RATE_LIMITER` (30/60s), cron `0 3 * * *`, and both send
  flags `"false"`.
- Exposure re-probe (production): `/wrangler.toml`, `/worker.js`,
  `/functions/api/feedback.js`, `/migrations/0001_push.sql` all **404**; root
  **200**; `POST /api/feedback` **403** (auth intact).
- Exposure finding (controller-caught, fixed): a manual `wrangler deploy`
  uploads the working tree including untracked dirs, so `.superpowers/`,
  `.worktrees/`, and `ai-handoffs/` briefly served as public assets. Added all
  three to `.assetsignore` (commit `bb49ccf`), redeployed, and confirmed all
  three **404** at origin (cache-busted); edge-cached copies expired on their
  own. `prototype/printer-picker.html` (tracked, pre-existing) was left in place
  pending an owner decision.

Step 5 — device canary + opt-out proof + 20-launch timing: **pending** the
owner's development-signed build on the physical canary device. Registration
stays disabled (`PUSH_REGISTRATION_ENABLED="false"`) until that gate begins.

## G0 owner prerequisites (Task 9 Step 3 — the exact, non-secret list)

1. **Apple — Push Notifications capability:** enable Push Notifications on the
   `dk.mragile.3DPrintAssistant` App ID in the developer portal.
2. **Apple — dedicated APNs key:** create a dedicated APNs Auth Key; have the
   Key ID, Team ID, and the `.p8` ready for secure secret entry (never paste
   the key text into chat or a file in this repo).
3. **Cloudflare — approval to provision:** approve creating the EU D1
   database, the `3dpa-push-production` and `3dpa-push-dlq` queues, the
   registration rate-limit binding, and the Worker secrets
   (`IOS_PUSH_REGISTRATION_SECRET`, `PUSH_TOKEN_ENCRYPTION_KEY_V1`,
   `PUSH_ADMIN_TOKEN`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY_P8`)
   via `wrangler secret put` (values entered without printing).
4. **App Store Connect:** confirm the physical canary Device ID to use for the
   Task 10 device gate, and confirm the App Privacy answers may be updated for
   push-token processing when Task 11 composes the release.

## Web + iOS data/logic and UI/UX evaluation

- Provider logic belongs to the web Worker; the iOS app consumes only its
  explicit signed registration contract and APNs payload schema.
- No shared `engine.js` or `data/*.json` behavior changed in Tasks 0–8. Task 9
  proved the web-owned engine/data mirrors remain byte-identical.
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
