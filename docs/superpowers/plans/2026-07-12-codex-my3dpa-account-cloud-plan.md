# My 3DPA account/cloud platform — gated implementation plan

**Date:** 2026-07-12  
**Status:** independent Codex plan — review pending  
**Source spec:** `docs/superpowers/specs/2026-07-12-codex-my3dpa-account-cloud-design.md`  
**Audience:** owner and one implementation session per gate  
**Program rule:** no gate starts until every dependency is merged and its exit evidence is attached; one gate = one focused PR unless an iOS gate is deliberately held as local commits by the iOS push rule.

## 0. Outcome and direct recommendation

Implement My 3DPA as an optional local-first platform in four release trains:

1. **Contract + offline foundation** — no external services and no account UX.
2. **Account + Workshop sync** — free, optional, staged web first, then iOS.
3. **My 3DPA product hub + export history + inventory** — local first, then sync, then iOS.
4. **One-time Pro + later platforms** — only after inventory usage and cost data exist.

Do not bundle auth, sync, inventory, UI, and monetization into one launch. Android v1 remains unblocked and account-free; Android sync is v1.1. Native macOS remains later and reuses the iOS packages.

## 1. Read-first and standing constraints

Every gate reads, in order:

1. `CLAUDE.md` / `AGENTS.md` in the repo being changed;
2. `docs/planning/ROADMAP.md` and `docs/3dpa-context.md` in web;
3. the source spec above;
4. `contracts/pdm2/manifest.json` after Gate C0 exists;
5. the immediately prior gate's review note and migration/rollback evidence.

Hard constraints:

- Current configurator, troubleshooter, Workshop, Mine, export, and JSON backup remain free and signed-out capable.
- Web is canonical for `engine.js`, data, and PDM2 contracts. No client forks a contract.
- Anonymous analytics remains identity-free and separate from account metrics.
- No production Firebase, D1, R2, Queue, or key material before Owner Gate O0.
- No email/password in account v1; Apple + Google only, subject to O0 confirmation.
- No user content in durable result caches, logs, Analytics Engine, or deletion receipts.
- All schema changes use expand/backfill/switch/contract; destructive contraction is a later PR.
- One review finding = one commit.
- Every gate includes the data/logic-change evaluation in §8.
- iOS work is committed locally but not pushed until the full version is XCTest-green, walkthrough-green, version-bumped, and owner-ready for TestFlight.

## 2. Dependency graph and release gates

```text
G0 + O0 → C0 candidate → IC0 Swift parity PASS → C0 merge
C0 → W0
C0 → I0
C0 → B0 → B1 → A0 → A1a → A1b → A1c → S0a → S0b → S0c → S0d
W0 + S0d → S1
B1 + A1c + S0d → O1 (production foundation, flags off)
S1 → S1G (signed soak PASS)
O1 + S1G → R0a (owner account canary) → R0b (owner sync canary) → R0c (5% → 25% → 100%)
S1 → U0
I0 + S1 + A1c → I1a → I1b
I1b + R0b → I1c → 7-day TestFlight soak
I1c soak + R0c → App Store account-feature activation

W0 → X0a
X0a + S1 → X0b
X0a + I1c → IX0 → IXR
W0 + C0 → F0 → F1a → F1b
F1b + R0c → F2
F2 + I1c → F3 → F3R
F2 named usage/cost evidence + owner GO → E0a → E0p
E0p + F3R → E0b → E0bR

Android v1 + C0 + A1c + S0d + owner AG0 → D0
E0a + D0 → E0c
I1c + architecture extraction GO → M0
```

G0 is the first docs/tooling PR and creates the canonical ledger before any decision is recorded. O0 is then a decision gate, not a code PR. The IDs in the atomic-gate matrix in §5 are the authoritative one-PR boundaries; headings such as A1, S0, I1, X0, F1, E0 are program groupings only. C0 through R0c deliver the first public account release. X0/F0 may run after W0, but must not compete with the account critical path in the same session.

## 3. Definition of done for every implementation PR

Each PR must contain:

- one gate only, with scope paths enforced in review;
- red tests/fixtures first, then implementation, then green output;
- migration up + compatibility/rollback proof where storage changes;
- signed-out regression proof;
- security/privacy checklist when account data is touched;
- exact commands and output counts in `docs/reviews/<date>-<gate>-review.md`;
- subagent architecture review and separate QA review;
- cross-model review for contract/auth/sync/lifecycle/entitlement gates, repeated until zero P0–P2;
- feature flag or clean revert path;
- ROADMAP checkbox/status update only after merge.

Default web regression command set (add gate-specific tests):

```sh
node --test scripts/state-codec.test.js scripts/workshop-store.test.js \
  scripts/workshop-tuning.test.js scripts/workshop-tuning-rules.test.js
node --test functions/api/*.test.mjs
node scripts/validate-data.js
node scripts/walkthrough-harness.js
```

Default iOS command pattern (resolve a current simulator UDID first):

```sh
xcodebuild build-for-testing -project 3DPrintAssistant.xcodeproj \
  -scheme 3DPrintAssistant \
  -destination "platform=iOS Simulator,id=<UDID>" \
  -derivedDataPath /tmp/3dpa-derived
xcodebuild test-without-building -project 3DPrintAssistant.xcodeproj \
  -scheme 3DPrintAssistant \
  -destination "platform=iOS Simulator,id=<UDID>" \
  -derivedDataPath /tmp/3dpa-derived
```

## 4. Gate briefs

### O0 — owner/provider/legal GO

**Goal:** freeze choices that authorize external state and materially affect privacy/cost.

**Owner decisions:**

1. Firebase Auth identity + EU-jurisdiction Cloudflare D1 domain data.
2. Apple + Google providers only for v1; no email/password.
3. Workshop sync is optional and free; existing features stay free forever.
4. Android v1 stays account-free; My 3DPA is Android v1.1.
5. Accept provider DPAs/SCCs/transfer-risk notes and the DR retention model.
6. Approve dev/staging resource creation; production remains a separate O1 GO.
7. Confirm only that the inventory free boundary/price is deferred to the later entitlement gate; 50 active spools / 99 DKK remains a recommendation, not a locked default.

**Evidence:** signed decision block in `docs/planning/MY3DPA-GATE-LEDGER.md`, DPA/version references, privacy/data-safety change list, cost owner, rollback owner. ROADMAP links the decision but is not a second decision record.

**Exit:** all seven explicit GO/NO-GO; any NO-GO sends the spec back to review. No silent default.

---

### C0 — canonical PDM2 contract PR

**Repo:** web.  
**Depends on:** G0 + O0; contract work may draft locally before the owner decision, but the C0 PR cannot open or merge first.
**Goal:** one executable, versioned data/API contract before persistence or clients.

**Create:**

- `contracts/pdm2/manifest.json`
- `contracts/pdm2/namespaces.json`
- `contracts/pdm2/common/*.schema.json`
- `contracts/pdm2/entities/*.schema.json` for every portable PDM2 entity, explicitly including spool, inventory event, export snapshot, preset, printer, profile, outcome, tuning, and custom material; `inventory_projection` is a disposable server-cache contract and location/AMS assignment remains inventory-event metadata, never standalone portable entities
- `contracts/pdm2/api/*.schema.json` for account/device/sync/export/delete/errors
- `contracts/pdm2/fixtures/valid/`, `invalid/`, `golden/`
- `scripts/pdm-contract.test.js`
- `docs/runbooks/pdm2-contract-versioning.md`

**Tasks:**

1. Encode every normative field, bound, enum, reference, unknown-field, ID, hash, cursor, and typed-error rule.
2. Add golden UUID/hash/blob/canonical-JSON vectors and valid/invalid boundary fixtures.
3. Add manifest hashing and a drift test.
4. Run JSON Schema meta-validation and the shared fixture suite.
5. Hash every path and byte named by `manifest.json`, reject missing/extra contract files, and verify the computed aggregate equals the manifest root hash.
6. Verify the selected R2 conditional-create primitive with a disposable development probe, including persisted-write/response-timeout and competing-create cases; if semantics are insufficient, freeze a per-op Durable Object coordinator instead.

**Tests:**

```sh
node --test scripts/pdm-contract.test.js
node --test scripts/state-codec.test.js scripts/workshop-store.test.js
node scripts/pdm-contract.test.js --verify-full-manifest-hash
node --test scripts/r2-conditional-capability.test.mjs
```

**Review gate:** schema/domain review, security review, Claude cross-model zero P0–P2, owner manifest approval. The read-only pre-merge Swift check is IC0 evidence; durable native implementation remains I0.

**Pre-merge IC0 parity gate:** once the web C0 PR has a frozen candidate commit/hash, copy only that candidate's manifest/fixtures into an iOS local review branch, add a read-only Swift fixture verifier, and run the default iOS commands with `-only-testing:3DPrintAssistantTests/PDMContractTests`. Record the candidate web commit, full manifest hash, iOS local commit, test count, and zero-diff result in the C0 ledger row. IC0 creates no app behavior, is never pushed, and must report PASS before the web C0 PR may merge. I0 later owns the durable vendoring/repository/migration implementation.

**Rollback:** contract-only revert; no stored PDM2 data exists yet.

**Exit:** IC0 PASS exists against the exact candidate commit, then the web-only C0 PR merges and its manifest becomes the immutable baseline; all downstream gates pin its hash.

---

### G0 — reproducible tooling, feature flags, and gate ledger

**Repo:** web.
**Depends on:** none; this gate creates no external resource and enables no runtime path.
**Goal:** make every later gate independently runnable, safely dark-launchable, and auditable before runtime code starts.

**Create:**

- `package.json` + `package-lock.json` with an exact Wrangler dev dependency selected and recorded by this gate;
- `config/feature-flags.json` plus schema/default validation;
- `scripts/verify-toolchain.mjs`, `scripts/feature-flags.test.mjs`, and `scripts/gate-evidence.test.mjs`;
- `docs/planning/MY3DPA-GATE-LEDGER.md` as the only canonical gate/evidence ledger.

**Flag registry:** `pdm2Local`, `accountApi`, `authUi`, `syncWrites`, `webSync`, `my3dpaUi`, `exportLibraryLocal`, `exportLibrarySync`, `inventoryLocal`, `inventorySync`, `iosAccountSync`, `iosInventory`, `proGrants`, and `androidSync`. Every flag defaults false, has an owner, environment scope, dependency, enable/disable command, audit record, and tested safe-off behavior. A server capability response must prevent a stale client flag from enabling an unsupported path.

**Tasks/tests:** use `npm ci` for all Worker/D1 gates; make `node scripts/verify-toolchain.mjs` compare the installed Wrangler version to the exact `package.json`/lock value and fail on drift; validate flag names/defaults/dependencies and unknown-flag rejection; validate every ledger row has dependency hashes, commands, expected result, rollback proof, reviewer evidence, and owner decision where required.

**Rollback:** config/docs/test-only revert; all runtime features remain off.

**Exit:** clean-clone `npm ci` plus ledger/flag tests are green; the empty C0 hash slot and all seven O0 decision slots exist and are structurally validated. C0 later fills the hash.

---

### W0 — web local PDM2 repository and v1 migration

**Repo:** web.  
**Depends on:** C0.
**Goal:** signed-out PDM2 persistence/outbox works locally without auth or network.

**Create/modify:**

- `pdm-store.js`, `pdm-migration.js`, `pdm-backup.js`
- `scripts/pdm-store.test.js`, `scripts/pdm-migration.test.js`, fixtures
- `workshop-store.js`, `state-codec.js` only through adapters
- `app.js`, `index.html`, `style.css` only for feature-flagged backup/migration status

**Tasks:**

1. Add IndexedDB repository, transactional outbox, account/device scope, raw unknown-field preservation, and content-free receipts.
2. Implement idempotent `3dpa_workshop_v1` → PDM2 conversion with deterministic legacy IDs/reference rewrite.
3. Stage migration separately; retain/verify transition backup and implement signed-out cleanup eligibility.
4. Keep v1 import/export compatibility and all existing Workshop behavior.
5. Put PDM2 behind `pdm2Local`; default off until fixture and browser QA pass.

**Tests:** exact/legacy IDs, crash points, corrupt backup, unknown future fields, repeated migration, quota, signed-out reload, v1↔PDM2 round trip. Prove a backup is valid only when it is stored at a distinct durable location and passes byte hash plus restore validation; overwriting the source record is not a backup. When File System Access is unavailable, require an explicit JSON download plus user confirmation before destructive migration or first-sync cleanup.

**Review/rollback:** storage specialist + QA; disable flag and restore untouched v1 store. No cloud code.

**Exit:** two-browser manual backup round trip and full web regressions green; no baseline engine/profile diff.

---

### I0 — iOS PDM2 adapter, local migration, and Workshop journal parity

**Repo:** iOS, local commits only.  
**Depends on:** C0; may run parallel to W0 after manifest freeze.
**Goal:** native local store consumes exact contract and reaches Workshop outcome/journal parity before sync.

**Create/modify:**

- `3DPrintAssistant/Models/PDM/`
- `3DPrintAssistant/Services/PDMRepository.swift`
- `3DPrintAssistant/Services/PDMMigration.swift`
- `WorkshopStore.swift`, Workshop views
- `3DPrintAssistantTests/PDMContractTests.swift`
- `3DPrintAssistantTests/PDMMigrationTests.swift`

**Tasks:** first add the minimal Swift fixture reader and record exact C0 hash parity; then vendor manifest/fixtures by hash; preserve unknown raw JSON; atomically migrate Application Support files; add outbox/conflict models; expose journal/outcome UI parity; keep engine startup independent of PDM/cloud.

**Tests:** shared fixtures, file-write failure injection, fallback legacy IDs, backup cleanup, journal parity, existing Workshop/AppState/Engine tests.

**Review/rollback:** Swift architecture + QA; feature flag/local store fallback. Do not push or dispatch TestFlight.

**Exit:** local commit recorded in web gate review, XCTest green, byte/value parity with web fixtures.

---

### B0 — local backend/schema foundation

**Repo:** web.  
**Depends on:** C0 + O0 dev/staging authorization.
**Goal:** testable Worker modules and expand-only local D1 schema with no remote resource or public account UI.

**Create/modify:**

- `functions/api/v1/_lib/` for schema, errors, canonical JSON, quotas, DB helpers
- `functions/api/v1/schema/versions.js`
- `migrations/account/0001_expand.sql`
- `wrangler.toml` local/preview bindings only
- `scripts/account-schema.test.mjs`, `scripts/account-dr.test.mjs`
- `docs/runbooks/account-backend.md`, `account-dr-restore.md`, `key-rotation.md`

**Tasks:** implement every current-spec D1 table/index/constraint in `0001_expand.sql`, including dark export, deletion, lifecycle, sync, projection, inventory, and purchase/retention structures; local migration tests; schema manifest endpoint; the C0-selected R2-or-Durable-Object coordination adapter behind local fakes; feature flags/global write breaker; content-free logging; expand/rollback rehearsal. Later feature gates activate this schema but do not re-own it; a genuinely new column/table requires a separately reviewed additive schema-amendment gate.

**Tests:**

```sh
npx wrangler d1 migrations apply 3dpa-account-preview --local
node --test scripts/account-schema.test.mjs scripts/account-dr.test.mjs
node --test functions/api/*.test.mjs
```

**Review/rollback:** DB/security/DR reviews; remove preview bindings and recreate the empty local database. Remote creation is still blocked.

**Exit:** fresh + upgrade + rollback/forward-fix local rehearsal, the C0 coordination decision implemented without semantic drift, cost counters observable in fixtures.

---

### B1 — remote staging provision, deploy, and rollback

**Repo:** web.
**Depends on:** B0 + O0 dev/staging authorization.
**Goal:** create the actual remote staging environment required by A0–S1, while every public/product flag remains false.

**Create/modify:** staging-only `wrangler` environment/bindings, redacted `docs/runbooks/account-staging.md`, `docs/runbooks/firebase-staging.md`, synthetic smoke tests, and the B1 ledger run sheet. No production binding or product UI is allowed.

**Reviewed command sequence after `npm ci`:**

```sh
npx wrangler d1 create 3dpa-account-staging --jurisdiction=eu
npx wrangler r2 bucket create 3dpa-account-staging
npx wrangler r2 bucket create 3dpa-erasure-ledger-staging
npx wrangler queues create 3dpa-account-staging
npx wrangler queues create 3dpa-account-staging-dlq
npx wrangler d1 migrations apply 3dpa-account-staging --remote --env staging
npx wrangler deploy --env staging
node --test scripts/staging-foundation-smoke.test.mjs scripts/staging-rollback.test.mjs
npx wrangler rollback --env staging
npx wrangler deploy --env staging
```

Wrangler-generated D1/Queue IDs are inserted into the staging binding file and reviewed before migrate/deploy. Secrets are set through the non-echoing `npx wrangler secret put <NAME> --env staging` command list in the ledger; the values and command stdin are never logged. The smoke suite proves remote schema/hash, R2 conditional races, Queue→DLQ, secret-presence without disclosure, route-disabled behavior, cost counters, and rollback/forward-deploy.

The same reviewed B1 run sheet provisions Firebase staging before A0: create the dedicated `3dpa-account-staging` project; record project number/ID and least-privilege owners; enable only Apple and Google identity providers; explicitly prove anonymous and email/password disabled; register only the exact staging origin and OAuth/Apple redirect domains; store Apple/Google secrets outside git; record SHA-256 hashes of the public Firebase config and provider/domain export; obtain one Google and one Apple staging token and verify exact issuer/audience/redirect rejection cases. The rollback rehearsal disables both providers, removes the staging origin, proves new sign-in fails while local/signed-out use remains intact, then restores the reviewed config. Screenshots/exports are sanitized and checksummed in the ledger; secret values and tokens are never captured.

**Exit:** a fresh remote migrate/deploy/smoke/rollback/forward-deploy exits 0; Firebase provider/domain disable-and-restore evidence is green; all flags remain false; no public hostname/navigation exposes the staging app; resource IDs, revisions, timestamps, provider/config hashes, and sanitized output are in the ledger.

---

### A0 — auth, account creation, and device trust

**Repo:** web.  
**Depends on:** B1 + O0 provider/dev-staging GO.
**Goal:** optional Apple/Google sign-in and atomic account/device registration in dev/staging, with sync still off.

**Create/modify:**

- `account-auth.js`, `account-device.js`
- `functions/api/v1/devices/register.js`, `rotate-key.js`, `revoke.js`
- Firebase token/JWKS verifier and exact auth-exception router
- `functions/api/v1/account.js`
- CSP/header configuration, privacy copy
- auth/device/JWKS/CSP tests

**Tasks:** configure dev/staging Firebase; lazy signed-out loading; P-256 non-exportable keys; signed request counters/retries; device recovery/lost-device flow; provider-link collision safe-stop; reject Firebase anonymous users; use the verified Firebase token `sub` unchanged as D1 `user_id`, then atomically generate a separate random UUID in `users.app_account_token` and return it from the account API without logging or portable export; accountEnabled marker; strict CSP.

**Tests:** JWT confusion/rotation/outage, registration races, replay/counter, key loss with pending outbox, revocation, no-Web-Crypto degraded UX, Apple/Google popup+redirect CSP, signed-out no-auth load, anonymous-Firebase-token rejection, same-email/different-provider collision without silent linking, exact Firebase-`sub` D1-key equality, and independent stable `app_account_token` creation/retry/non-log/non-export behavior.

**Rollout:** dev/staging only, then one owner staging account. Production auth remains disabled until R0a and public signup until R0c; production sync writes remain disabled until R0b.

**Rollback:** disable staging signups/auth UI and remove/reset the owner test account with an environment-locked staging teardown script that cannot bind to production; configurator stays local. This gate does not promise production export/delete routes.

**Review/exit:** architecture, QA, security, and cross-model review must all report zero P0–P2; zero cross-user access; account/device recovery works; privacy/DPA evidence recorded.

---

### A1 — account export, deletion, and privacy lifecycle program

**Repo:** web.  
**Depends on:** A0.  
**Goal:** compliant portability/deletion exists before general account rollout.

This heading is delivered as three separately reviewed PRs: A1a export, A1b deletion/account lifecycle, and A1c lifecycle ledger/DR. See §5.

**Create/modify across the three PRs:**

- account export start/status/verify handlers and Queue consumer
- deletion start/status/reconciler handlers
- lifecycle ledger/lease/DR modules
- R2 encryption/key wrappers
- `/account/delete` web route and Account & Privacy UI
- deletion/export/DR fixtures and runbooks

**Tasks:** revision-consistent export snapshot; signed ES256 envelope; AES-256-GCM R2 artifact; seven-day expiry and verified receipt. A1b adds deletion preflight, status capability, account lock, and explicit cancel/continue UX but keeps deletion execution hard-disabled. A1c adds the external erasure/lifecycle evidence, single-winner lease decisions, reconciler, minimal purchase-retention seam, and DR promotion blocker; only A1c may enable domain/identity deletion.

**Tests:** every saga crash point, timeout-after-success, concurrent entity/reference writes, artifact crypto tamper, key rotation, Time Travel restore with account/entity erasure, no payload in caches/logs. Enumerate deletion during all export states: queued, snapshotting, artifact-ready/unverified, verified, expired, and failed/cancelled. A1b proves execution remains disabled and no domain mutation occurs without the A1c external-ledger capability. A1c injects failure before/after the external `pending_erasure` write and proves write failure leaves the account locked, performs zero domain/identity deletion, and is retried by the reconciler. Reject deletion-status capabilities supplied in query, JSON body, cookies, headers other than the dedicated authorization header, or any non-status endpoint; reject wrong-account, expired, replayed, and log-reflected capabilities. Prove encrypted `export_job_items` and temporary artifact material are deleted within 24 hours in staging.

**Review/rollback:** privacy/security/DR hostile review + QA + cross-model zero. Kill switch keeps export/delete available while other account writes are off.

**Exit:** A1b exits only with locked/preflight/status UX and execution disabled. A1c exits when the full staging deletion/reconciler/restore rehearsal proves erased accounts/entities stay erased and failed external pre-write never starts deletion; only then are in-app/web deletion flows ready before iOS/Android account creation.

---

### S0 — sync server protocol and lifecycle program

**Repo:** web.  
**Depends on:** A0 + A1.  
**Goal:** complete server sync semantics behind staging flags; no client auto-sync or production binding yet. This heading is delivered as S0a normal push/status, S0b pull/cursor/entity, S0c bootstrap/lifecycle, and S0d load/DR soak; see §5.

**Create/modify:**

- `functions/api/v1/sync/push.js`, `pull.js`, `entity.js`, `status.js`, `lifecycle.js`, `bootstrap.js`
- `functions/api/v1/_lib/sync/` for validation, conflicts, cursors, graveyard, projections, quotas
- `scripts/sync-protocol.test.mjs`, `sync-concurrency.test.mjs`, `sync-dr.test.mjs`
- load/cost fixtures and incident runbook

**Tasks:** batch-atomic normal push; request/device/op idempotency; dependency results; async lifecycle op; content-free durable status; pull/cursor expiry; bootstrap/remap rules; tombstone/graveyard set union; lifecycle leases/reconciler; schema negotiation; per-account/global budgets. B0 owns the day-1 limiter implementation; S0a proves per-IP pre-auth and per-account/device post-auth enforcement plus global breaker behavior.

**Tests:** property/concurrency tests for two devices, lost ACK, partial dependency failure, conflict copies, delete/reset/reactivate, old cursor, old client fields, malicious IDs/references, quota/write breaker, DR replay and later-update dominance. Reject a user/device attempting the reserved system actor and reject forged system-actor operations at every public route. Simulate unavailable graveyard encryption/decryption keys and require fail-closed `503` with no mutation. Run 1× and 4× capacity fixtures and record rows/op.

**Review/rollback:** protocol/security/DB subagents, QA, Claude zero P0–P2. Keep `syncWrites=false`; pulls/exports/deletes stay available.

**Exit:** contract fixture equality and 24-hour staging soak with no cursor gap, duplicate apply, payload leak, or unbounded row growth.

---

### S1 — owner-only web Workshop sync soak

**Repo:** web.  
**Depends on:** W0 + S0.  
**Goal:** optional Workshop/profile/outcome/tuning/custom-material sync for signed-in web users.

**Create/modify:**

- `sync-client.js`, `sync-outbox.js`, `sync-bootstrap.js`
- PDM repository adapters, account status component, conflict UI
- service-worker/network hooks only if needed
- browser integration tests and two-browser fixtures

**Tasks:** first-sign-in verified backup; pull-stage-merge-push bootstrap; foreground/debounce/network/manual triggers; retry/backoff; conflict copies; cursor expiry; device key rotation; quiet status UX; sync opt-out/sign-out leaves local data usable.

**Tests:** two browser profiles offline/concurrent, reload at every transaction boundary, lost response, stale delete, future fields, over quota, backend outage, sign-out, account deletion, signed-out baseline.

**Rollout:** one owner staging account only. Production/public rollout belongs to R0a–R0c, not this gate.

**Rollback:** `webSync=false`; never delete local/outbox data; export remains available.

**Exit:** seven-day owner soak: zero data loss, cross-user access, payload leak, unhandled lifecycle/DR failure, cursor gaps, duplicate apply, and projection divergence; p95 push/pull under 2 seconds at the recorded staging fixture; 5xx below 1%; daily D1/R2/Queue use below 50% of the owner-approved budget. Any zero-tolerance event, 5xx at/above 1%, latency above 2 seconds for two consecutive windows, or budget at/above 75% disables `webSync`/`syncWrites` and blocks S1G. S1G exists only when the evidence validator passes and the owner signs PASS in the ledger.

---

### O1 — production foundation with every product flag off

**Repo:** web.
**Depends on:** B1 + A1a–A1c + S0a–S0d green; fresh owner production/cost GO.
**Goal:** provision and rehearse production without exposing signup or accepting sync writes.

**Tasks:** create production Firebase project/provider config; EU D1 (`--jurisdiction=eu`); private `3dpa-account-production` export-artifact R2 bucket; separate private `3dpa-erasure-ledger-production` R2 bucket outside the D1/backup restore boundary; Queue/DLQ; secrets and least-privilege access. The reviewed O1 run sheet must literally contain `npx wrangler r2 bucket create 3dpa-account-production` and `npx wrangler r2 bucket create 3dpa-erasure-ledger-production`, bind them to distinct names, and fail smoke if either is absent or aliased. Apply expand-only migrations before deploying code that needs them; deploy with `accountApi`, `authUi`, `syncWrites`, and `webSync` false; verify schema/hash/capabilities; create a Time Travel checkpoint; rehearse restore, key rotation, and flag disable from the runbook.

**Commands/evidence:** use only the lock-pinned Wrangler via `npm ci` and `npx wrangler`; the exact resource IDs and migration/deploy commands are generated in a redacted O1 run sheet, executed by the production owner, and pasted with timestamps/exit codes into the gate ledger. No secret value enters git or logs.

**Rollback/exit:** disable all flags, roll the Worker back to the recorded deployment, and restore/forward-fix from the checkpoint without contracting schema. Zero public traffic and zero product writes are permitted; O1 health checks are limited to deployment, schema, capability, secret-presence, route-disabled, and rollback probes. The allowlisted owner account and product-flow smoke tests begin only in R0a.

---

### R0 — production account and Workshop-sync rollout program

**Repo:** web.
**Depends on:** O1 + signed S1G owner-soak PASS + A1 export/delete/DR evidence.
**Goal:** make optional accounts public only after the lifecycle promises work in production.

**Atomic rollout gates:** R0a enables `accountApi` then `authUi` for the allowlisted owner only and observes account creation/link/recovery/export/delete for 48 hours. R0b may then enable `syncWrites`/`webSync` for that owner only and observes Queue/DLQ, two-browser sync, breaker, and erasure-aware restore for a separate 48 hours. Only a signed R0b PASS allows I1c or R0c. R0c rolls public exposure 5% → 25% → 100%, at least 48 hours each. The same numeric thresholds and zero-tolerance conditions from S1 apply to every gate; a failure returns to the prior safe flag set and requires a new clean window.

**Tests:** production synthetic signup/link/recovery, provider collision, export verify/expiry, deletion capability misuse, account deletion/recreation, two-browser sync, outage breaker, restore/erasure blocker, signed-out baseline, and privacy/runtime disclosure audit.

**Rollback/exit:** disable newest flag/percentage first while keeping export/delete/status/pull reachable for existing accounts. Public completion is R0c at 100% for 48 hours within thresholds, no unresolved P0–P2, and owner GO recorded in the ledger.

---

### U0 — My 3DPA web hub

**Repo:** web.  
**Depends on:** S1 stable.  
**Goal:** consolidate personal functionality without turning “Profile” into a misleading catch-all.

**Create/modify:** `my3dpa.js`, My 3DPA route/sections, `index.html`, `style.css`, navigation, locale strings, account/sync components.

**Sections:** Overview; Workshop; Filament placeholder/flag; Printers; Exports; Sync & Backup; Account & Privacy.

**Tasks:** signed-out “On this device” experience; recent profiles/outcomes; sync/conflict/device status; export/delete actions; responsive/dark-mode/accessibility; existing Workshop deep links preserved; no login prompt in configurator flow.

**Tests/review:** keyboard/screen-reader, mobile/desktop, offline/backend outage, signed-out first launch, locale/layout, visual QA. No new data contract.

**Rollback:** nav flag restores current Workshop route; account lifecycle remains directly reachable.

**Exit:** owner walkthrough confirms clean/minimal UI and account conversion occurs only on explicit sync/backup intent.

---

### I1 — iOS account, My 3DPA, and Workshop sync program

**Repo:** iOS, local commits until complete.  
**Depends on:** I0 + S0 + A1; start after S1 protocol soak.  
**Goal:** native Apple/Google account lifecycle and Workshop sync with signed-out parity. Deliver as I1a auth/device, I1b sync/lifecycle, and I1c My 3DPA UI/release; see §5.

**Create/modify:**

- `Models/Account/`, `Services/Auth/`, `Services/Sync/`
- Keychain P-256 device key service
- My 3DPA SwiftUI views and Account & Privacy
- Firebase dependencies/configuration
- unit/integration/UI tests, privacy manifest/strings

**Tasks:** contract hash pin; Sign in with Apple/Google; device registration/rotation; first-sync backup; outbox/pull/lifecycle; journal parity; conflicts; devices; export/delete/status capability; deep link to web deletion; offline status and no cloud call in `EngineService`.

**Tests:** shared fixtures; multi-device simulator/API stub; keychain loss; reinstall; backend outage; deletion partial failure; signed-out engine/Workshop/output; UI accessibility/animations. Full XCTest + web walkthrough.

**Release gate:** all local commits green → marketing version/bundle review → owner TestFlight GO → push iOS main once → manual TestFlight workflow → at least seven days of production-backed owner TestFlight soak. The soak replays account creation/recovery, two-device sync, export/delete/recreation, key loss, backend outage, and signed-out baseline; it must meet S1's zero-tolerance, p95 latency, 5xx, and budget thresholds for the iOS cohort. The App Store build may release only after both that soak and R0c PASS; until R0c, `iosAccountSync=false` for every non-owner production account. Any breach disables `iosAccountSync`, blocks App Store release, and starts a new clean seven-day window after the fix. Never use TestFlight as an iteration loop.

**Rollback:** remote iOS sync/auth flags; local store remains authoritative; App Store account deletion stays reachable for created accounts.

**Exit:** seven consecutive green production-backed TestFlight days, owner walkthrough, and R0c PASS, then phased App Store release with crash/sync monitoring.

---

### X0 — export recipe/history program

**Repo:** web first; iOS is a distinct IX0 gate after web model acceptance.
**Depends on:** W0; cloud sync portion depends on S1.  
**Goal:** retain reproducible export inputs/metadata, not generated slicer files. Deliver X0a local web library, X0b sync integration, then IX0 iOS repository/UI; see §5.

**Create/modify:** `export-library.js`, PDM export snapshot/preset adapter, Exports section, tests. IX0 separately implements the iOS Output/Export repository.

**Tasks:** immutable content-addressed snapshots; preset pin/rename/repoint/delete; engine/data/catalog version labels; current-engine regeneration honesty; GC/reference races; optional sync under existing protocol.

**Tests:** Bambu/Orca/Prusa deterministic regeneration, snapshot hash vectors, repoint/GC concurrency, unavailable historical version, offline/local export.

**Rollback:** hide library UI; exporters remain unchanged; retained metadata stays exportable.

**Exit:** no generated files in D1/R2 and existing export output fixtures unchanged. IX0 remains reviewed local iOS commits; IXR is the only gate that may ship it.

---

### F0 — local filament inventory domain and web UI

**Repo:** web.  
**Depends on:** C0 + W0.  
**Goal:** useful manual inventory signed out before cloud sync or monetization.

**Create/modify:**

- inventory adapters and fixtures against the already-complete C0 inventory schemas
- `inventory-store.js`, `inventory-projection.js`, `inventory-import.js`
- Filament section/UI/styles/locales
- inventory accounting/import/CSV safety tests

**Tasks:** consume the C0 spool/event/projection/location contract without adding or changing schemas; event-authoritative acquire/consume/adjust/move/assign/dry/retire/reactivate; checked milligram bounds; projections; locations/AMS labels; search/filter; JSON/CSV import/export; dry-run ambiguity UI; no credentials/integrations. Any contract defect returns to a separately approved C0 versioning gate and blocks F0.

**Tests:** all event invariants, concurrent ordering, projection rebuild, capacity edits, negative/overflow, exact CSV re-import, formula injection, future fields, 50-spool presentation only (no entitlement enforcement yet).

**Review/rollback:** domain + UX + QA; `inventoryLocal=false` hides module but preserves exportable local entities.

**Exit:** owner can add/import/manage a realistic inventory offline with zero accounting drift.

---

### F1 — bambuinventory read-only export and confirmed import program

**Repos:** F1a bambuinventory exporter PR, then F1b web importer PR; never combine writes across repos.
**Depends on:** F0.  
**Goal:** reuse data/domain value without reusing insecure single-user API behavior.

**F1a bambuinventory PR:** add the local CLI `export_inventory.py`; it reads through the existing local configuration/database path and writes a versioned JSON file only to the explicit `--output <path>`. It never adds or calls a web write/export endpoint. The envelope includes stable source IDs, integer gram/milligram units, ambiguity metadata, schema version, row count, and SHA-256; tests use a sanitized fixture and prove no database mutation.

**web PR:** map rows to spool metadata + one acquire event; normalize units; dry-run skipped/ambiguous rows; deterministic import IDs; explicit confirmation; idempotent re-import.

**Cutover:** bambuinventory remains source/read-only until owner compares counts, totals, locations, AMS assignments and approves. No big-bang deletion.

**Rollback:** dry-run creates no entities/events. Before confirmation, cancel with zero writes. Before first sync, a verified distinct-location backup may restore the whole local import transaction. After any imported event has synced, rollback is compensating inventory events plus metadata correction only; immutable events are never deleted or rewritten. The exporter is read-only.

**Exit:** signed reconciliation report with source/import/skipped/ambiguous counts and exact remaining-total comparison.

---

### F2 — inventory sync and My 3DPA web integration

**Repo:** web.  
**Depends on:** F0 stable + R0c + F1 accepted.
**Goal:** sync spool/events/projections safely while keeping local inventory useful.

**Tasks:** enable inventory entity kinds server-side; reference/lifecycle tests; projection rebuild; quota UI; multi-device event union; Filament Overview cards/alerts; optional printer assignment; account export/delete coverage.

**Tests:** two-device consume/move/retire; event id collision; lifecycle fence; projection crash/rebuild; old cursor; deletion/DR; 50k operational-ID boundary; signed-out and sync-off behavior.

**Rollout/rollback:** owner beta → invite beta; `inventorySync=false` preserves local inventory and pull/export/delete. No Pro enforcement.

**Exit:** 14-day beta with reconciled balance totals, zero projection/source divergence, per-account operation/storage distributions, D1/R2/Queue usage and projected free/paid cost at 1×/10×/100× adoption recorded in the ledger.

---

### F3 — iOS inventory release train

**Repo:** iOS local commits, later one gated push.  
**Depends on:** I1 + F2.  
**Goal:** native Filament module with shared contract/account behavior.

**Tasks:** vendor updated manifest; inventory repository/projection; native list/detail/add/adjust/move/dry/retire; import/export; sync status/conflicts; polished dark-mode animations/accessibility; account deletion/export inclusion.

**Tests:** shared event/projection fixtures, offline/restart, multi-device stub, import parity, UI tests, full XCTest and web walkthrough.

**Rollback/release:** remote inventory flag; local entities remain exportable. Follow iOS push/TestFlight gate exactly.

**Exit:** implementation/XCTest reconciliation is green in local commits; F3R performs the push, TestFlight soak, and App Store release.

---

### E0 — one-time Pro entitlement and inventory-boundary program

**Repos:** E0a web/backend contract, E0b iOS StoreKit, then E0c Android Play after D0; each is a separate PR.
**Depends on:** F2's named 14-day usage/cost exit evidence; fresh owner pricing/legal GO. E0b additionally depends on E0p PASS and the completed F3R inventory release gate.
**Goal:** server-authoritative lifetime Pro only when inventory proves value.

**Owner gate:** confirm 50 active-spool definition, target 99 DKK localized price, seven-day offline grace, refund/chargeback/statutory retention, web checkout decision, and no subscription.

**Tasks:** E0a activates server truth on the purchase/retention schema already created by B0—no migration; E0b adds StoreKit 2 JWS + ASSN v2 using the stable A0 account UUID as `appAccountToken`; E0c adds Play Developer API/RTDN only after D0. All include restore purchases, non-destructive downgrade/over-limit, server reconciliation, and key rotation.

**Tests:** sandbox/production isolation, replay, refund/revoke, family/ownership, account mismatch, restore on new device, offline grace timestamp, over-limit edits/export/sync, deletion inside/outside retention window.

**Rollback:** disable new grants/checkout, preserve validated existing entitlement/read/export; never delete or hide inventory.

**Exit:** E0a server and E0b local iOS StoreKit implementation are sandbox/security green; E0bR alone performs the iOS push, production-backed TestFlight purchase/restore/refund soak, and App Store release.

---

### E0p — owner-only production entitlement backend canary

**Repo:** web; operational gate after the reviewed E0a merge.
**Depends on:** E0a + fresh owner StoreKit production-canary GO.
**Goal:** prove the production validation/reconciliation path before any iOS entitlement build can ship.

**Tasks/evidence:** configure the exact production App Store Server API issuer/key IDs and ASSN v2 URL outside git; verify signed-environment separation and Apple root/key rotation; deploy with checkout and `proGrants=false`; smoke JWS validation, ASSN authentication/replay, `appAccountToken` binding, restore, refund/revoke, Queue/DLQ, and purchase-retention deletion rules. Then allowlist the owner account only, enable grants for that account, and run a 48-hour sandbox-to-production-backend purchase/restore/refund canary with zero cross-account grants, replay acceptance, missed revocation, or secret/token logging.

**Rollback/exit:** stop new owner grants/checkout while keeping ASSN/refund/revoke reconciliation and validated existing rights active; rehearse key disable/restore and Queue replay. E0p PASS is a signed ledger transition with config hashes, notification/reconciliation counts, rollback timestamps, and owner GO; E0b/E0bR remain blocked without it.

---

### D0 — Android v1.1 My 3DPA sync

**Repo:** Android on mac-mini only.  
**Depends on:** Android v1 shipped + C0 manifest + A1/S0 protocol/lifecycle soak + owner AG0 reopens Android. I1 is not a dependency unless D0's approved brief names a concrete shared artifact from I1.
**Goal:** add contract/auth/local repository/sync without changing v1 launch scope retroactively.

**Tasks:** vendor manifest; Room/local PDM store; Firebase Apple/Google where supported; Android Keystore device key; Workshop/account sync; deletion in-app + web resource; Data Safety update; shared fixtures.

**Tests:** Kotlin contract vectors, offline/process death, key loss, two-device sync, deletion, Play policy checklist. No web/engine logic fork.

**Rollback:** remote Android sync flag; local v1 remains functional.

**Exit:** Android v1.1 closed test and Play deletion/Data Safety compliance.

---

### M0 — native macOS shared packages

**Repo:** iOS/macOS workspace, future gate.  
**Depends on:** I1 stable + architecture extraction decision after Android.  
**Goal:** reuse iOS PDM/auth/sync/domain packages; macOS changes navigation/windowing only.

**Tasks:** extract Swift packages without behavior change; macOS target; Keychain/device registration; My 3DPA navigation; file import/export; accessibility/window tests.

**Rollback:** keep iOS-on-Mac availability; native target can remain unreleased.

**Exit:** same contract/XCTest fixtures and account deletion/export behavior on macOS.

## 5. Atomic one-PR gate matrix and execution evidence

This matrix overrides broader program-heading wording. Each implementation row is one merge/review boundary; explicitly named owner/operational decision rows such as S1G are signed ledger transitions with no code PR. Every command must exit 0 with zero failed tests; the ledger records test counts, C0 hash, migration version, deployed revision when relevant, flag state, rollback result, architecture/QA review links, and cross-model link where required. Runtime gates use `npm ci` first and the lock-pinned Wrangler only. `node --test <path>` means the PR must create that exact test path.

| Gate | Depends on | Exact gate command | Default/rollout | Required rollback proof |
|---|---|---|---|---|
| G0 | none | `npm ci && node scripts/verify-toolchain.mjs && node --test scripts/feature-flags.test.mjs scripts/gate-evidence.test.mjs` | all flags false | clean-clone safe defaults |
| IC0 | frozen C0 candidate commit | default iOS commands + `-only-testing:3DPrintAssistantTests/PDMContractTests` against copied candidate fixtures | read-only local evidence; no push | discard local verifier branch |
| C0 | G0,O0; merge requires IC0 PASS | `node --test scripts/pdm-contract.test.js scripts/r2-conditional-capability.test.mjs && node scripts/pdm-contract.test.js --verify-full-manifest-hash` | web contract only | revert on empty store |
| W0 | C0 | `node --test scripts/pdm-store.test.js scripts/pdm-migration.test.js scripts/state-codec.test.js scripts/workshop-store.test.js` | `pdm2Local=false` | validated distinct backup restore |
| I0 | C0 | default iOS build/test commands + `-only-testing:3DPrintAssistantTests/PDMContractTests` and `PDMMigrationTests` | local iOS commits | legacy-file restore; no push |
| B0 | C0,O0 | `npm ci && npx wrangler d1 migrations apply 3dpa-account-preview --local && node --test scripts/account-schema.test.mjs scripts/account-dr.test.mjs functions/api/*.test.mjs` | local/preview; `accountApi=false` | fresh/upgrade/forward-fix rehearsal |
| B1 | B0,O0 | exact B1 provision/migrate/deploy/smoke/rollback/forward-deploy sequence in §4 | remote staging; all flags false | prior staging deploy + forward-deploy proof |
| A0 | B1,O0 provider GO | `node --test scripts/auth-device.test.mjs scripts/auth-negative.test.mjs scripts/csp.test.mjs` | owner staging only; `authUi=false` | staging account reset; local app intact |
| A1a | A0 | `node --test scripts/account-export.test.mjs scripts/export-crypto.test.mjs` | staging export only | cancel/expire and 24h purge proof |
| A1b | A1a | `node --test scripts/account-delete-preflight.test.mjs scripts/delete-capability-negative.test.mjs` | execution hard-disabled | lock/status rollback; zero domain mutation |
| A1c | A1b | `node --test scripts/account-delete.test.mjs scripts/account-lifecycle.test.mjs scripts/account-dr.test.mjs scripts/erasure-prewrite-failure.test.mjs` | lifecycle/deletion staging only | reconciler resumes every crash state; Time Travel retains erasure |
| S0a | A0,A1c | `node --test scripts/sync-push-status.test.mjs scripts/sync-auth-limits.test.mjs` | `syncWrites=false` | write breaker plus idempotent retry |
| S0b | S0a | `node --test scripts/sync-pull-cursor.test.mjs scripts/sync-entity.test.mjs` | staging pull only | cursor reset/bootstrap path |
| S0c | S0b | `node --test scripts/sync-bootstrap.test.mjs scripts/sync-lifecycle.test.mjs scripts/sync-system-actor.test.mjs` | staging lifecycle only | lease/reconciler and key-unavailable fail-close |
| S0d | S0c | `node --test scripts/sync-concurrency.test.mjs scripts/sync-dr.test.mjs scripts/sync-load.test.mjs` | 24h staging soak | breaker/restore rehearsal |
| S1 | W0,S0d | `node --test scripts/web-sync.test.mjs scripts/web-sync-browser.test.mjs && node scripts/walkthrough-harness.js` | owner staging; `webSync=false` until start | local/outbox survives disable |
| O1 | A1c,S0d | redacted ledger commands: `npm ci`, exact `npx wrangler d1 create --jurisdiction=eu`, migrate/deploy/smoke/rollback invocations | production flags false | prior deploy + checkpoint restore |
| S1G | S1 | `node scripts/gate-evidence.test.mjs --gate S1 --require-owner-pass` | signed operational decision; no code PR | fail/unsigned keeps production flags false |
| R0a | O1,S1G | `node --test scripts/production-account-smoke.test.mjs` with synthetic owner tenant | owner-only account flags, 48h | disable `authUi`/`accountApi`; lifecycle stays up |
| R0b | R0a | `node --test scripts/production-sync-smoke.test.mjs scripts/production-lifecycle-smoke.test.mjs` | owner-only sync flags, separate 48h | disable `webSync`/`syncWrites`; local/lifecycle stays up |
| R0c | R0b | `node scripts/gate-evidence.test.mjs --gate R0c --require-steps 5,25,100` | 5%→25%→100%, 48h each | newest percentage disabled; lifecycle stays up |
| U0 | S1 | `node --test scripts/my3dpa-ui.test.mjs && node scripts/walkthrough-harness.js` | `my3dpaUi=false` added by this PR | old navigation + direct lifecycle route |
| I1a | I0,S1,A1c | default iOS commands + `-only-testing:3DPrintAssistantTests/AuthDeviceTests` | reviewed local commits; `iosAccountSync=false` | remove auth UI/dependency; signed-out store intact |
| I1b | I1a,S0d | default iOS commands + `-only-testing:3DPrintAssistantTests/SyncLifecycleTests` | reviewed local commits; sync off | remote flag; local outbox/export intact |
| I1c | I1b,R0b | full default iOS suite, UI tests, and `node scripts/walkthrough-harness.js` in web | TestFlight after R0b; App Store only after soak + R0c | remote flag; deletion/export remains reachable |
| X0a | W0 | `node --test scripts/export-library.test.mjs scripts/export-regression.test.mjs` | local only | hide UI; metadata exportable |
| X0b | X0a,S1 | `node --test scripts/export-library-sync.test.mjs scripts/sync-reference-race.test.mjs` | sync flag off | local library remains authoritative |
| IX0 | X0a,I1c | default iOS build/test commands + `-only-testing:3DPrintAssistantTests/ExportLibraryTests` | local iOS commits | hide UI; local export retained |
| IXR | IX0 | full default iOS suite + UI tests + web walkthrough; version bump; owner GO; one push; manual TestFlight; seven-day production-backed soak | only IX0 release path | remote flag; prior App Store build remains |
| F0 | C0,W0 | `node --test scripts/inventory-store.test.mjs scripts/inventory-projection.test.mjs scripts/inventory-import.test.mjs` | `inventoryLocal=false` | hide UI; JSON export retained |
| F1a | F0 | `python3 -m unittest discover -s tests -p 'test_export*.py'` in bambuinventory | read-only exporter | remove exporter; zero writes |
| F1b | F1a | `node --test scripts/inventory-bambu-import.test.mjs scripts/inventory-reconcile.test.mjs` | dry-run first | backup pre-sync; compensation post-sync |
| F2 | F1b,R0c | `node --test scripts/inventory-sync.test.mjs scripts/inventory-lifecycle.test.mjs scripts/inventory-projection.test.mjs` | owner beta; `inventorySync=false` | local/events/export survive disable |
| F3 | F2,I1c | default iOS build/test commands + `-only-testing:3DPrintAssistantTests/InventoryTests` | local iOS commits | remote flag; local export retained |
| F3R | F3 | full default iOS suite + UI tests + web walkthrough; version bump; owner GO; one push; manual TestFlight; seven-day production-backed reconciliation soak | only F3 release path | `iosInventory=false`; prior App Store build remains |
| E0a | F2 named 14-day usage/cost evidence + owner price/legal GO | `node --test scripts/entitlement-server.test.mjs scripts/purchase-retention.test.mjs` | grants/checkout off | stop grants; retain validated rights |
| E0p | E0a + owner GO | production App Store Server API/ASSN configuration smoke + owner-only 48-hour purchase/restore/refund canary | signed operational decision; no code PR | stop new grants; reconciliation remains active |
| E0b | E0p,F3R | default iOS build/test commands + `-only-testing:3DPrintAssistantTests/StoreKitEntitlementTests` | StoreKit sandbox, local commits | checkout off; read/export retained |
| E0bR | E0b,E0p | full default iOS suite + StoreKit sandbox/UI tests + web walkthrough; version bump; owner GO; one push; manual TestFlight; seven-day production-backed purchase/restore/refund soak | only E0b release path | checkout/grants off; validated rights remain |
| D0 | Android v1,C0,A1c,S0d,AG0 | `./gradlew test connectedCheck` on mac-mini | Android sync flag off | local Android v1 behavior |
| E0c | E0a,D0 | `./gradlew test --tests '*PlayEntitlement*'` on mac-mini | Play sandbox/grants off | checkout off; rights retained |
| M0 | I1c + extraction GO | default iOS/macOS build/test commands with macOS destination | unreleased target | iOS-on-Mac remains |

Authoritative scope allowlist (tests, the gate review note, ledger row, and ROADMAP status are additionally allowed for every gate; any other production path requires a plan amendment before coding):

| Gate | Allowed production/create paths and migration owner | Explicit boundary |
|---|---|---|
| G0 | `package*.json`, `config/feature-flags.json`, `scripts/verify-toolchain.mjs`, ledger validator, canonical ledger | no runtime feature code |
| IC0 | local iOS read-only contract fixture verifier and C0 ledger evidence | no app behavior, persistence, push, or web mutation |
| C0 | web `contracts/pdm2/**` plus contract scripts/fixtures/runbook | owns no persistence migration or native-client file |
| W0 | web `pdm-*.js`, adapters in `workshop-store.js`/`state-codec.js`, IndexedDB migration/backup UI | no Worker/auth/sync route |
| I0 | iOS `Models/PDM/**`, PDM repository/migration, local Workshop parity views | no auth/network; owns iOS PDM migration |
| B0 | `functions/api/v1/_lib/**`, schema versions, `migrations/account/0001_expand.sql`, preview bindings, backend/DR runbooks | sole owner of initial D1 expand migration; no auth UI |
| B1 | staging bindings, `docs/runbooks/account-staging.md`, staging smoke/rollback scripts | remote staging only; no production or product code |
| A0 | web auth/device modules, device/account registration routes, CSP/privacy copy | no export/delete/sync persistence migration |
| A1a | export routes/consumer/crypto and export runbook using B0 schema | no migration, deletion, or sync route |
| A1b | deletion preflight/lock/status UI, capability verifier, deletion runbook using B0 schema | deletion execution remains hard-disabled; no migration, DR promotion, or sync route |
| A1c | deletion executor, external erasure/lifecycle ledger, lease/reconciler, and restore runbook using B0 schema | sole deletion-enable owner; no migration or normal sync handler |
| S0a | push/status handlers and auth/limit/idempotency sync library using B0 schema | no migration or pull/bootstrap/lifecycle handler |
| S0b | pull/entity/cursor handlers using B0 indexes | no migration or lifecycle/bootstrap mutation |
| S0c | bootstrap/lifecycle/graveyard/reconciler modules using B0 schema | no migration or client UI |
| S0d | load/DR fixtures, observability config, incident runbook | no protocol behavior except reviewed defect fixes |
| S1 | web sync client/outbox/bootstrap, repository adapters, conflict/status UI | no server contract/migration |
| O1 | production bindings/config and redacted provision/deploy/rollback run sheet | no product code or contraction migration |
| S1G | canonical ledger decision row only | no code or runtime change |
| R0a | owner-account rollout config, account smoke, privacy/runtime disclosures | no sync/schema/protocol change |
| R0b | owner-sync rollout config and sync/lifecycle smoke | no schema/protocol change |
| R0c | public percentage config and evidence | no schema/protocol change |
| U0 | `my3dpa.js`, route/nav/sections/styles/locales | no data schema or sync behavior |
| I1a | iOS `Models/Account/**`, `Services/Auth/**`, device Keychain, sign-in/account views, privacy config | no sync client |
| I1b | iOS `Services/Sync/**`, PDM/outbox adapters, conflict/device/lifecycle views | no hub redesign/release metadata |
| I1c | iOS My 3DPA presentation, accessibility/UI tests, version/release metadata | no contract/schema change; only gate allowed to push |
| X0a | web export-library repository/UI/adapters | no server migration or iOS file |
| X0b | export sync adapter and server kind allowlist using B0 schema | no migration or local exporter logic change |
| IX0 | iOS export repository/Output UI | no web/server path; local commits until an iOS release gate |
| IXR | iOS version/release metadata and release evidence only | no IX0 behavior change except reviewed release blocker fix |
| F0 | web inventory store/projection/import/UI/locales consuming C0 | no contract or Worker migration |
| F1a | bambuinventory `export_inventory.py` and sanitized exporter fixtures | read-only; no API/PHP change |
| F1b | web bambuinventory importer/reconciliation UI | no source-system write or server sync |
| F2 | inventory server kind/projection handlers and My 3DPA cards using B0 schema | no migration or entitlement enforcement |
| F3 | iOS inventory domain/repository/views | no store purchase code; local commits until release gate |
| F3R | iOS version/release metadata and release evidence only | no inventory behavior change except reviewed release blocker fix |
| E0a | web entitlement/purchase callbacks and UI boundary state using B0 purchase/retention schema | no migration or StoreKit/Play client code |
| E0p | production entitlement config, smoke evidence, and canonical ledger row | no client code or schema change |
| E0b | iOS StoreKit service/purchase UI/privacy metadata | no Android or backend schema change |
| E0bR | iOS version/release metadata and release evidence only | no entitlement behavior change except reviewed release blocker fix |
| D0 | Android PDM/auth/sync/data-safety paths in native Android repo | no entitlement/Play Billing path |
| E0c | Android Play Billing/RTDN client integration only | no base Android sync or web migration |
| M0 | shared Swift-package extraction and macOS target/window/navigation/files | no behavior change to shipped iOS paths without separate proof |

I1a and I1b remain reviewed local commits under the iOS push hold. I1c is the only push gate for the I1 program; later IXR, F3R, and E0bR are the only push gates for their respective iOS feature programs. Each named release gate repeats the full XCTest/UI/web-walkthrough/version-bump/owner-GO/single-push/manual-TestFlight protocol and requires seven clean production-backed TestFlight days before App Store release. S1 also proves cleanup of a synced transition backup through two eligible cleanup cycles separated by an app/browser restart, including the automatic 30-day erasure rule and an auditable user-triggered early cleanup.

O1's command cell is deliberately template-shaped because Cloudflare resource IDs do not exist before owner authorization; it is not permission to improvise. G0 pins the tool version, B0 writes the exact parameterized runbook, and O1 materializes the redacted, copy/paste command list in the ledger before execution. Any command absent from that reviewed run sheet blocks O1.

## 6. Backlog after the gated program

Add, but do not pull into the account critical path:

- Spoolman import/export adapter;
- QR/label printing after inventory usage proves demand;
- owner-side/local printer bridge for automatic consumption/AMS/humidity—separate credential threat model;
- custom materials W4 completion and explicit W5 community contribution;
- opt-in print outcome insights and inventory reorder/drying reminders;
- account security screen for device/session history;
- public sharing/community only after moderation/consent spec;
- generated export file storage only after measured demand/cost;
- accessibility/localization audit for every My 3DPA module;
- support/admin runbooks that never expose user content by default.

Explicitly reject from this backlog: mandatory accounts, cloud slicer, STL/G-code library, remote cameras/control, farm/team administration without a separate business case, and subscription-by-default.

## 7. Review and release cadence

For each gate:

1. implementation session opens from the gate brief only;
2. red tests and baseline hashes land first;
3. implementation and migration evidence land;
4. subagent architecture + QA reviews run;
5. hostile/cross-model review runs where §3 requires;
6. every finding is one commit; rerun until zero P0–P2;
7. owner review/GO;
8. merge; 24–48 hour observation where runtime behavior changed;
9. update ROADMAP and next gate input.

Never stack unreviewed dependent PRs. A draft may begin locally, but it does not open/merge until the dependency's final contract hash and migration state are known.

## 8. Mandatory data/logic cross-platform evaluation

| Gate/change | Web | iOS | Android | macOS | Engine/data action |
|---|---|---|---|---|---|
| C0 contract | canonical schemas/fixtures | vendor/read fixtures | later vendor | later Swift reuse | none |
| W0/I0 PDM2 | IndexedDB migration | Application Support migration | v1.1 only | later | no engine logic change |
| Auth/account | Firebase web/device key | Apple/Google + Keychain | post-v1 | shared Swift | no analytics identity link |
| Sync/lifecycle | Worker + web client | native client | post-v1 | shared client | server never runs engine |
| Export library | canonical snapshot/recipe | native regeneration | later | later | exporters remain local; run output fixtures |
| Inventory | domain/projection source | native consumer | later | shared domain | custom-material engine hook remains separate W4 |
| Entitlement | server truth + web state | StoreKit | Play Billing | shared account | never changes generated profile values |

If any later gate changes `engine.js` or canonical `data/`, it becomes a separate web-master PR: edit web first, byte-mirror iOS/Android, run web walkthrough/data validators and native tests, and document UI/UX changes required to expose the improvement. None of C0–S1 is authorized to change profile formulas or canonical printer/material data.

## 9. Program completion criteria

The account/cloud foundation is complete only when:

- signed-out behavior is baseline-equivalent on every shipped platform;
- account export/delete, DR, auth, and sync gates are green before general signup;
- web and iOS Workshop sync have owner soak evidence with no loss;
- My 3DPA is coherent signed in and signed out;
- inventory ships local-first before Pro;
- cost/abuse alerts and kill switches are rehearsed;
- all privacy/App Privacy/Data Safety disclosures match runtime;
- ROADMAP links the canonical spec, this plan, gate ledger, and current active gate;
- Android/macOS remain explicitly gated rather than implied complete.
