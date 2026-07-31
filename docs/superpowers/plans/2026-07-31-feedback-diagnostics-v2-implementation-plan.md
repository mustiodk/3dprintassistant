# Feedback Diagnostics v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace free-text-only web/iOS bug reports with one privacy-bounded diagnostic report that is stored encrypted in EU D1, announced through a minimized Discord alert, and triaged from the existing owner analytics page.

**Architecture:** Keep `/api/feedback` as the single public write boundary. Both legacy and `feedback_v2` payloads normalize into one server model; the Worker encrypts user content, writes one D1 row, then posts a pseudonymous Discord alert. Web and iOS each maintain a max-25 RAM-only breadcrumb recorder and submit diagnostics only when the user explicitly sends a bug report.

**Tech Stack:** Vanilla JavaScript/HTML/CSS, Cloudflare Workers + Assets, D1/SQLite, Web Crypto AES-GCM/HMAC/SHA-256, Vitest Workers pool, Node test runner, Swift 5.9, SwiftUI, CryptoKit, Sentry Cocoa, XCTest, XcodeGen.

## Global Constraints

- Canonical design: `docs/superpowers/specs/2026-07-31-feedback-diagnostics-design.md`.
- Web repo owns the Worker/schema and web client; iOS mirrors the exact `feedback_v2` wire contract in Swift.
- `engine.js` and `data/*.json` remain byte-identical and unchanged; this feature reads existing app state only.
- One Worker endpoint, one dedicated feedback D1 table, one section in `/analytics`; no account, ticketing app, attachments, general telemetry, automatic GitHub issue or Android work.
- Bug reports carry full diagnostics; general feedback and feature requests carry minimal application/release context only.
- Maximum 25 allowlisted RAM-only breadcrumbs. No text input, URLs, filenames, generated profiles, stack traces, IP storage or persistent user/session/device identifier.
- Custom physical-printer text, reporter email and all user-authored report text are encrypted together and never enter Discord.
- Every report expires no later than 90 days after receipt. Manual owner deletion is immediate.
- Use prepared D1 statements, Web Crypto, cryptographically random report ids with at least 80 random bits, and exact-key validation.
- Preserve web Origin auth, native HMAC auth, honeypot behavior and both Printer Intake lanes for legacy and v2 clients.
- The direct iOS-to-Discord fallback is removed; native reports must use the authenticated Worker.
- `FEEDBACK_DB`, `FEEDBACK_DATA_KEY` and `FEEDBACK_RATE_LIMITER` are owner-gated production resources. Do not create, bind, migrate or set them before O0.
- No preview deployment may bind production feedback storage. Local Miniflare D1 is the only pre-O0 persistence target.
- One accepted review finding equals one focused commit. No iOS push until all planned iOS work is landed, full XCTest is green, `MARKETING_VERSION` starts exactly one new release train, and the final implementation review is GO.
- TestFlight dispatch, App Store submission and public canary reports remain owner/manual actions.

---

### Task 1: Lock the shared server contract and local D1 schema

**Files:**
- Create: `functions/api/_lib/feedback-contract.js`
- Create: `functions/api/_lib/feedback-contract.test.mjs`
- Create: `feedback-migrations/0001_feedback_reports.sql`
- Modify: `.assetsignore`
- Modify: `worker.js`
- Test: `functions/api/worker.test.mjs`

**Interfaces:**
- Produces: `normalizeFeedbackPayload(payload, source)` returning `{ ok: true, report }` or `{ ok: false, error }`.
- Produces: normalized `report.userContent`, `report.canonicalFields`, `report.diagnostics`, `report.breadcrumbs`, `report.summary`.
- Produces: one `feedback_reports` table with the columns required by the design.

- [ ] **Step 1: Write failing contract tests**

Add literal fixtures for a legacy web report, a legacy iOS report and a complete v2 bug report. Assert that v2 rejects unknown keys, invalid platform/channel pairs, more than 25 breadcrumbs, unallowlisted breadcrumb properties, oversized fields and custom-printer text outside `userContent`. Assert that both legacy and v2 printer requests yield canonical `[{ id, value }]` fields.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test functions/api/_lib/feedback-contract.test.mjs`

Expected: FAIL because `feedback-contract.js` does not exist.

- [ ] **Step 3: Implement the exact validator/normalizer**

Export closed constants for categories, dispositions, platform channels, entry points and breadcrumb events. Use own-property key comparison at every object level. Convert legacy `{fields,email,context}` into encrypted `userContent` plus canonical fields without inventing absent diagnostics. Preserve v2 user-content ids `whatHappened`, `expected`, `steps`, `message`, `title`, `email`, `customPrinterBrand`, and `customPrinterModel` with explicit per-field bounds.

- [ ] **Step 4: Add the migration and private-asset guard**

Create `feedback_reports` with `report_id TEXT PRIMARY KEY`, schema/category/source/timestamps, one checked `disposition`, list-summary columns, encrypted user-content ciphertext/IV, diagnostic/breadcrumb JSON, issue fingerprint and `expires_at`. Add indexes on `received_at DESC`, `expires_at`, and `issue_fingerprint`. Exclude `/feedback-migrations` from Workers Assets in `.assetsignore` and `PRIVATE_ASSET_ROOTS`; extend the existing 404 test.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
node --test functions/api/_lib/feedback-contract.test.mjs functions/api/worker.test.mjs
git diff --check
```

Expected: all focused tests pass and diff check is empty.

Commit: `feat(feedback): lock v2 contract and D1 schema`

### Task 2: Encrypt, fingerprint and persist normalized reports

**Files:**
- Create: `functions/api/_lib/feedback-crypto.js`
- Create: `functions/api/_lib/feedback-crypto.test.mjs`
- Create: `functions/api/_lib/feedback-store.js`
- Create: `functions/api/feedback/persistence.test.mjs`
- Create: `functions/api/feedback/retention.test.mjs`
- Modify: `vitest.config.mjs`
- Modify: `functions/api/push/test-setup.mjs`

**Interfaces:**
- Produces: `createReportId()` with `RPT-` plus 10 random bytes encoded base64url.
- Produces: `fingerprintReport(report)` as lowercase hex SHA-256 over stable diagnostic facts only.
- Produces: `encryptUserContent(value, keyBase64, reportId, schemaVersion)` and `decryptUserContent(...)` using AES-256-GCM with report id + schema version as AAD.
- Produces: `insertFeedbackReport(db, storedReport)`, `readFeedbackReport`, `listFeedbackReports`, `setFeedbackDisposition`, `deleteFeedbackReport`, `deleteExpiredFeedbackReports`.

- [ ] **Step 1: Write failing crypto and storage tests**

Assert report-id format and decoded entropy length, deterministic fingerprints across identity/timestamp changes, fingerprint changes for error/printer/operation changes, AES round trip, wrong-key failure, and AAD mismatch failure. In Vitest's Workers pool, apply `feedback-migrations/0001_feedback_reports.sql` to local `FEEDBACK_DB` and assert write/read/list/disposition/delete/expiry behavior with literal rows. Keep pure Web Crypto tests under Node; every test that imports `cloudflare:workers` or touches D1 belongs under `functions/api/feedback/` and runs only in the Workers pool.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
node --test functions/api/_lib/feedback-crypto.test.mjs
npm test -- --run functions/api/feedback/persistence.test.mjs
```

Expected: both commands fail because crypto/store modules and the local binding do not exist.

- [ ] **Step 3: Implement Web Crypto and prepared D1 statements**

Decode `FEEDBACK_DATA_KEY` as exactly 32 bytes. Generate a fresh 12-byte IV per row. Serialize canonical JSON with stable key order for the fingerprint input. Use `.prepare(...).bind(...)` exclusively and bounded newest-first pagination; never interpolate request values into SQL.

- [ ] **Step 4: Wire isolated Miniflare feedback migrations**

Read `feedback-migrations/` separately in `vitest.config.mjs`, expose it as `FEEDBACK_TEST_MIGRATIONS`, add local `FEEDBACK_DB: "feedback-db"`, and apply only those migrations to `env.FEEDBACK_DB` in the test setup. Existing push migrations remain applied only to `PUSH_DB`. Widen `test.include` from push-only to both `functions/api/push/**/*.test.mjs` and `functions/api/feedback/**/*.test.mjs`; the shared setup must initialize both isolated bindings without cross-applying migrations.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
node --test functions/api/_lib/feedback-crypto.test.mjs
npm test -- --run
git diff --check
```

Expected: crypto tests and all Worker-runtime tests pass.

Commit: `feat(feedback): encrypt and persist diagnostic reports`

### Task 3: Upgrade `/api/feedback` without breaking legacy or Printer Intake

**Files:**
- Modify: `functions/api/feedback.js`
- Create: `functions/api/feedback.v2.test.mjs`
- Modify: `functions/api/feedback.intent.test.mjs`

**Interfaces:**
- Consumes: contract, crypto and store functions from Tasks 1–2.
- Produces: `{ ok: true, reportId, notified }` after a committed D1 row; stable 4xx/5xx errors otherwise.
- Consumes production bindings `FEEDBACK_DB`, `FEEDBACK_DATA_KEY`, `FEEDBACK_RATE_LIMITER`, `DISCORD_WEBHOOK_URL`, `FEEDBACK_HMAC_SECRET`, `PRINTER_INTAKE`.

- [ ] **Step 1: Write failing endpoint tests**

Use complete fakes for D1, rate limiter, KV and outbound Discord. Cover web Origin and iOS HMAC, 32 KiB cap, limiter rejection before body parsing, missing bindings fail closed, legacy/v2 normalization, encrypted persisted user content, minimized Discord payload, D1 failure preventing Discord, Discord failure returning `notified:false`, report-id response, honeypot no-op and unknown-key rejection.

- [ ] **Step 2: Add failing Printer Intake regression cases**

Prove a v2 `bugReport.userContent.whatHappened` printer request enters the heuristic lane, a v2 `missingPrinter` report enters the form lane, and a non-printer v2 report is not teed. Assert KV receives only the existing bounded matched span/custom form fields, never the full diagnostic JSON.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `node --test functions/api/feedback.v2.test.mjs functions/api/feedback.intent.test.mjs`

Expected: new v2 expectations fail against the legacy Discord-only handler.

- [ ] **Step 4: Implement the authoritative D1-first flow**

Rate-limit with `await env.FEEDBACK_RATE_LIMITER.limit({ key: request.headers.get("CF-Connecting-IP") || "unknown" })`, without logging or persisting the key. Authenticate, parse, normalize, tee Printer Intake fail-open, encrypt and insert. Only then post a Discord embed containing report id, category, source/version/channel, physical-vs-selected classification, error operation/code and fingerprint. Never include email, user text, breadcrumbs, Sentry id or diagnostic JSON.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
node --test functions/api/feedback.v2.test.mjs functions/api/feedback.intent.test.mjs
node --test functions/api/*.test.mjs
git diff --check
```

Expected: endpoint suite and all Node API tests pass.

Commit: `feat(feedback): store reports before minimized Discord alerts`

### Task 4: Add the bounded owner API and retention hook

**Files:**
- Create: `functions/api/feedback-admin.js`
- Create: `functions/api/feedback/admin.test.mjs`
- Create: `functions/api/_lib/feedback-retention.js`
- Modify: `worker.js`
- Modify: `functions/api/worker.test.mjs`

**Interfaces:**
- Produces POST `/api/feedback-admin` actions `list`, `detail`, `setDisposition`, `delete`.
- Reuses `X-Analytics-Admin-Token` and `ANALYTICS_ADMIN_TOKEN` with a SHA-256 fixed-size timing-safe comparison.
- Extends scheduled retention with `deleteExpiredFeedbackReports(env.FEEDBACK_DB, now)`.

- [ ] **Step 1: Write failing owner API and retention tests**

Assert missing/mismatched admin token rejection, closed action allowlist, newest-first bounded list, detail decryption, on-demand fingerprint matches, disposition enum enforcement, deletion, ciphertext-safe decryption failure and expiry cleanup. Verify `/api/feedback-admin` never reaches Assets and the scheduled handler awaits both push and feedback retention through one tracked promise.

- [ ] **Step 2: Run and verify RED**

Run `npm test -- --run functions/api/feedback/admin.test.mjs functions/api/feedback/retention.test.mjs` for D1-backed tests, then `node --test functions/api/worker.test.mjs` for the pure Worker router test.

Expected: route/modules are absent.

- [ ] **Step 3: Implement minimal owner operations**

Use one POST endpoint rather than a REST subtree. Return only list-summary fields for `list`; decrypt user content only for `detail`. Query fingerprint siblings only when opening detail. Log structured error codes without report content or tokens.

- [ ] **Step 4: Integrate scheduled retention**

Keep the existing push-retention behavior. Use `ctx.waitUntil(Promise.all([runRetention(env), runFeedbackRetention(env)]))`; when `FEEDBACK_DB` is absent in local/legacy environments, feedback retention returns a resolved no-op and never hides push-retention failures.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
npm test -- --run functions/api/feedback/admin.test.mjs functions/api/feedback/retention.test.mjs
node --test functions/api/worker.test.mjs
npm test -- --run
git diff --check
```

Expected: all owner/retention and Worker-runtime tests pass.

Commit: `feat(feedback): add owner triage API and retention`

### Task 5: Generate truthful web release provenance

**Files:**
- Create: `scripts/gen-release-manifest.mjs`
- Create: `scripts/gen-release-manifest.test.mjs`
- Create: `release-manifest.js`
- Modify: `index.html`
- Modify: `app.js`
- Modify: `feedback-form.js`
- Modify: `package.json`

**Interfaces:**
- Produces immutable `globalThis.__3DPA_RELEASE__ = { appVersion, releaseId, assetFingerprint }`, with `releaseId` equal to the full content fingerprint and `appVersion` equal to `web-` plus its first 12 hex characters.
- Produces CLI modes default write and `--check` with non-zero exit on drift.
- Both analytics and feedback consume the same global manifest.

- [ ] **Step 1: Write the failing generator test**

In a temporary fixture directory, hash literal runtime assets and assert deterministic sorted hashing, changed fingerprint after one asset mutation, write-mode output, and `--check` failure on drift. Assert `index.html` loads `release-manifest.js` before `feedback-form.js` and `app.js`.

- [ ] **Step 2: Run and verify RED**

Run: `node --test scripts/gen-release-manifest.test.mjs`

Expected: generator module is absent.

- [ ] **Step 3: Implement generator and replace hard-coded metadata reads**

Hash the explicit diagnostic-relevant asset list; use the full content fingerprint as `releaseId` and `web-<first-12-hex>` as `appVersion`. This avoids a recursive checked-in-commit marker and makes every behaviorally distinct asset set self-identifying without a build service. Replace `<meta name="app-version" content="1.0">` consumption in analytics/feedback with the manifest and retain the meta only as a non-authoritative human-readable fallback during one release.

- [ ] **Step 4: Add verification command and generate the manifest**

Add `verify:release` to `package.json`, run the generator, then run its check mode.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
node --test scripts/gen-release-manifest.test.mjs
npm run verify:release
git diff --check
```

Expected: generator tests pass and manifest is current.

Commit: `feat(feedback): generate shared web release provenance`

### Task 6: Add the web RAM recorder and simple disclosed bug-report UX

**Files:**
- Create: `feedback-diagnostics.js`
- Create: `scripts/feedback-diagnostics.test.mjs`
- Modify: `feedback-form.js`
- Modify: `app.js`
- Modify: `index.html`
- Modify: `style.css`
- Modify: `locales/en.json`
- Modify: `locales/da.json`

**Interfaces:**
- Produces `globalThis.FeedbackDiagnostics.record(name, props)`, `.freezeFailure(failure)`, `.setSnapshotProvider(fn)`, `.snapshot(reason, entryPoint)`, `.physicalPrinterPreference()` and `.savePhysicalPrinterPreference(value)`.
- Produces `feedback_v2` request bodies for bug reports and minimal v2 bodies for other categories.

- [ ] **Step 1: Write failing recorder/payload tests**

Name the breaks: 26th event must evict the oldest; unknown event/property must not enter output; snapshots must deep-freeze state at capture time; later navigation must not mutate a frozen failure snapshot; localStorage exceptions must degrade to `unknown`; custom printer text must be placed in `userContent`, not diagnostics; non-bug categories must omit breadcrumbs/configuration.

- [ ] **Step 2: Run and verify RED**

Run: `node --test scripts/feedback-diagnostics.test.mjs`

Expected: `feedback-diagnostics.js` is absent.

- [ ] **Step 3: Implement recorder and state snapshot provider**

Load `release-manifest.js`, then `feedback-diagnostics.js`, before form/app scripts. In `app.js`, register a provider that returns stable ids for selected configuration, current view/tab/output mode, resolved slicer, selected-printer existence and catalog/overlay provenance already available at runtime. Record only the allowlisted screen/selection/profile/export/catalog/feedback events.

- [ ] **Step 4: Keep the form simple**

For bug reports render required “What happened?”, optional expected result and steps, a compact expandable diagnostics disclosure, and physical-printer confirmation only when printer context exists and no local preference exists. Add the “do not include personal or sensitive information” copy. Preserve existing category dropdown and missing-item forms. Show the returned `reportId` in the existing success state.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
node --test scripts/feedback-diagnostics.test.mjs
node --test functions/api/*.test.mjs
npm run verify:release
git diff --check
```

Expected: recorder/payload/API tests pass and release manifest is current.

Commit: `feat(feedback): attach disclosed web diagnostics to reports`

### Task 7: Add owner triage UI and truthful privacy disclosure

**Files:**
- Modify: `analytics.html`
- Create: `feedback-owner.js`
- Create: `functions/api/feedback-owner-ui.test.mjs`
- Modify: `privacy.html`
- Modify: `docs/planning/ROADMAP.md`

**Interfaces:**
- Consumes `/api/feedback-admin` with the token already held in session storage.
- Produces list/detail/disposition/delete UI inside the existing analytics page only.
- Produces pure escaping/row/detail render functions in `feedback-owner.js` that the real page calls and Node tests exercise with literal API responses.

- [ ] **Step 1: Write failing owner-UI behavior tests**

Exercise the extracted pure render helpers with complete literal API responses and use a small fetch harness for the real request builder. Assert token header reuse, escaped user content, newest-first rows, detail rendering, fingerprint matches, disposition action and explicit delete confirmation. Do not assert only that source strings exist.

- [ ] **Step 2: Run and verify RED**

Run: `node --test functions/api/feedback-owner-ui.test.mjs`

Expected: owner feedback UI helpers/section are absent.

- [ ] **Step 3: Implement one compact Feedback section**

Add list and detail panels after existing analytics summaries. No charts, assignment, comments, SLA or outbound-email UI. Escape every decrypted/user-derived value before rendering. Reuse the current token input and session-only token storage.

- [ ] **Step 4: Update privacy and release documentation**

Describe current and v2 feedback collection, optional email, local “My printer”, Cloudflare/D1, minimized Discord, Sentry-event linking, 90-day retention, access/deletion via report id, controller contact, legitimate-interest assessment gate and App Store privacy-answer review. Do not claim that encryption anonymizes reports.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
node --test functions/api/feedback-owner-ui.test.mjs functions/api/*.test.mjs
npm test -- --run
npm run verify:release
npx wrangler deploy --dry-run
git diff --check
```

Expected: tests pass, dry-run bundles successfully, and no production deploy occurs.

Commit: `feat(feedback): add compact owner triage and privacy copy`

### Task 8: Mirror the v2 recorder and payload on iOS

**Files:**
- Create: `3DPrintAssistant/Models/FeedbackDiagnostics.swift`
- Create: `3DPrintAssistant/Services/FeedbackDiagnosticRecorder.swift`
- Modify: `3DPrintAssistant/Services/FeedbackService.swift`
- Modify: `3DPrintAssistant/Views/Feedback/FeedbackViewModel.swift`
- Modify: `3DPrintAssistant/Views/Feedback/FeedbackView.swift`
- Modify: `3DPrintAssistant/App/ContentView.swift`
- Modify: `3DPrintAssistant/App/PrintAssistantApp.swift`
- Modify: `3DPrintAssistant/Views/Output/OutputView.swift`
- Modify: `3DPrintAssistant/Engine/EngineService.swift`
- Modify: `3DPrintAssistant/Utils/Strings.swift`
- Modify: `project.yml`
- Modify: `3DPrintAssistant.xcodeproj/project.pbxproj`
- Modify: `3DPrintAssistantTests/FeedbackTests.swift`
- Create: `3DPrintAssistantTests/FeedbackDiagnosticRecorderTests.swift`
- Modify: `docs/app-store-privacy-labels.md`

**Interfaces:**
- Produces Codable `FeedbackV2Submission`, `FeedbackDiagnosticSnapshot`, `FeedbackBreadcrumb`, `FeedbackFailure`, `PhysicalPrinterPreference` matching the web fixture keys.
- Produces main-actor `FeedbackDiagnosticRecorder` with max-25 FIFO, closed event/property enums and frozen failure snapshot.
- Changes `FeedbackService.submit` to return `FeedbackReceipt { reportId, notified }`.

- [ ] **Step 1: Create the iOS feature worktree and write failing model/recorder tests**

Create `codex/feedback-diagnostics-v2-ios` from current iOS `main`. Use literal shared JSON fixtures copied from Task 1 expectations. Assert exact encoded wire shape, platform/channel, 25-entry eviction, unknown-value rejection through typed enums, frozen snapshot immutability, no persistent identifier, and no direct Discord fallback.

- [ ] **Step 2: Run focused XCTest and verify RED**

Run:

```bash
xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:3DPrintAssistantTests/FeedbackTests \
  -only-testing:3DPrintAssistantTests/FeedbackDiagnosticRecorderTests \
  CODE_SIGNING_ALLOWED=NO
```

Expected: compile/test failure because v2 models and recorder do not exist.

- [ ] **Step 3: Implement models, recorder and Worker-only service**

Build diagnostics from `AppStateWebCodec.webDict`, `AppConstants.appVersion/appBuildNumber`, `UIDevice`, active route/screen, selected printer/slicer and catalog provider metadata. Store “My printer” locally in `UserDefaults` under a single namespaced key; custom text joins `userContent`. Remove `submitToDiscord` and make missing Worker/HMAC configuration a visible setup error.

- [ ] **Step 4: Instrument bounded known paths**

Record app/screen/selection/profile/export/feedback breadcrumbs at existing event boundaries. When an existing Sentry capture occurs on engine initialization/decoding failure, save `SentrySDK.capture(...).sentryIdString` with a stable safe code; do not create Sentry events for generic manual reports or copy stack/localized error text.

- [ ] **Step 5: Update the SwiftUI form**

For bug reports use what-happened required, expected and steps optional, diagnostics disclosure, contextual physical-printer confirmation and returned report id. Other categories remain visually unchanged and send minimal context. Keep all existing contextual `.sheet(item:)` prefill behavior.

Update the iOS repo's `docs/app-store-privacy-labels.md` against the final payload before the App Store privacy-answer review gate.

- [ ] **Step 6: Regenerate project and verify GREEN**

Run:

```bash
xcodegen generate
xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:3DPrintAssistantTests/FeedbackTests \
  -only-testing:3DPrintAssistantTests/FeedbackDiagnosticRecorderTests \
  CODE_SIGNING_ALLOWED=NO
git diff --check
```

Expected: focused feedback suites pass.

Commit: `feat(ios): attach privacy-bounded diagnostics to feedback`

### Task 9: Full local verification and independent implementation review

**Files:**
- Create: `docs/reviews/2026-07-31-feedback-diagnostics-v2-implementation-review.md`
- Modify only if findings require focused fixes: files named by the reviewer.

**Interfaces:**
- Produces one exact-HEAD review disposition and green web/Worker/iOS evidence.

- [ ] **Step 1: Run full web/Worker gates**

Run:

```bash
node --test functions/api/*.test.mjs scripts/gen-release-manifest.test.mjs scripts/feedback-diagnostics.test.mjs
npm test -- --run
npm run verify:release
node scripts/validate-data.js
node scripts/walkthrough-harness.js
node scripts/export-audit.js
npx wrangler deploy --dry-run
git diff --check
```

Expected: zero failed tests, validators report no failures, dry-run succeeds.

- [ ] **Step 2: Run full iOS gates**

Run:

```bash
xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  CODE_SIGNING_ALLOWED=NO
diff -q /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/engine.js 3DPrintAssistant/Engine/engine.js
for f in printers.json materials.json nozzles.json; do diff -q "/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/data/$f" "3DPrintAssistant/Data/$f"; done
```

Expected: complete XCTest/UI suite succeeds and all shared-file diffs are empty.

- [ ] **Step 3: Run Bridge implementation review**

From the web repo, run `bridge --health`, then `bridge --mode claude-only` with both feature-branch diffs, the approved design, this plan and all verification evidence. Require explicit P0/P1/P2 findings and verdict. A timeout, empty artifact or auth failure is invalid evidence and blocks release progression.

- [ ] **Step 4: Apply findings one per commit**

For every accepted finding: write/adjust the failing regression test first, verify RED, implement the narrow fix, verify GREEN, commit only that finding, and rerun affected gates. Record rejected findings with code/test evidence.

- [ ] **Step 5: Obtain final GO on the reviewed HEADs**

Run one bounded confirmation review after fixes. Save reviewer findings, dispositions, exact web/iOS HEADs and command outputs in the durable review document.

### Task 10: O0 infrastructure gate, dark rollout and release-train completion

**Files:**
- Modify after O0 only: `wrangler.toml`
- Modify after O0 only: `docs/planning/ROADMAP.md`
- Modify after O0 only: `project.yml`
- Modify after O0 only: `3DPrintAssistant.xcodeproj/project.pbxproj`

**Interfaces:**
- Produces owner-provisioned `3dpa-feedback-production` with immutable `jurisdiction=eu`, binding `FEEDBACK_DB`, secret `FEEDBACK_DATA_KEY`, and unique `FEEDBACK_RATE_LIMITER` namespace.
- Produces backend dark deploy, then web rollout, then iOS release-train-ready branch.

- [ ] **Step 1: Stop at O0 and report exact prerequisites**

Do not create resources or secrets autonomously. Present the reviewed commits and request permission for: `wrangler d1 create 3dpa-feedback-production --jurisdiction=eu`, one interactive `wrangler secret put FEEDBACK_DATA_KEY`, feedback rate-limit namespace assignment, remote migration, Worker deploy and synthetic production canaries.

- [ ] **Step 2: After explicit O0, provision and independently verify EU jurisdiction**

Create the database with `--jurisdiction=eu`. Run `wrangler d1 info 3dpa-feedback-production` and require `jurisdiction: eu` before adding its UUID to `wrangler.toml`. Add `migrations_dir = "feedback-migrations"`; configure the unique limiter at five accepted attempts per 60 seconds. Set the AES key interactively without printing it.

- [ ] **Step 3: Apply migration and deploy backend dark**

Apply `feedback-migrations` remotely, deploy the backward-compatible Worker, send one synthetic legacy and one synthetic v2 canary, verify encrypted storage/minimized Discord/admin read, then delete both rows immediately. If any proof fails, stop and roll back the Worker version; do not deploy clients.

- [ ] **Step 4: Merge and push web after live-dark proof**

Fast-forward the reviewed web branch to `main`, push once, verify production asset manifest, controlled supported/custom printer reports, owner list/detail/disposition/delete and privacy page. Update ROADMAP from pending to web-live/iOS-ready with exact evidence.

- [ ] **Step 5: Start exactly one iOS release train and push only when ship-ready**

Bump `MARKETING_VERSION` from 1.1.3 to 1.1.4 once, regenerate Xcode project, rerun the complete XCTest/UI suite, confirm the backend/web production proof and final review still match, then fast-forward iOS `main` and push. Do not dispatch TestFlight; report the exact reviewed iOS HEAD for the owner's manual workflow.

- [ ] **Step 6: Final verification**

Verify both repos are clean, remote branches contain the intended commits, web production returns the new release manifest and privacy copy, no report canaries remain in D1, and no iOS TestFlight workflow was dispatched.
