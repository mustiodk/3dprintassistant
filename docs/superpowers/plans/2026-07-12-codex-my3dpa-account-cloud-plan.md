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
- Every gate includes the data/logic-change evaluation in §7.
- iOS work is committed locally but not pushed until the full version is XCTest-green, walkthrough-green, version-bumped, and owner-ready for TestFlight.

## 2. Dependency graph and release gates

```text
O0 owner/provider/legal GO
  └─ C0 PDM2 contract
      ├─ W0 web local repository + migration
      ├─ I0 iOS contract adapter + local migration
      └─ B0 backend foundation (local/staging only)
           └─ A0 auth + device registration
                ├─ A1 account export/delete lifecycle
                └─ S0 sync server protocol
                     ├─ S1 web Workshop sync beta
                     │    └─ U0 My 3DPA web hub
                     └─ I1 iOS auth + Workshop sync

W0 ── X0 export history/library
W0 ── F0 local inventory domain/web
        └─ F1 bambuinventory export/import
             └─ F2 inventory cloud sync/web
                  └─ F3 iOS inventory
                       └─ E0 one-time Pro entitlement

I1 + Android v1 shipped ── D0 Android v1.1 sync
I1 + architecture extraction ── M0 native macOS
```

O0 is a decision gate, not a code PR. C0 through U0 deliver the first useful account release. X0/F0 may run after W0, but must not compete with the account critical path in the same session.

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
6. Approve dev/staging resource creation; production remains a separate GO in B0/A0.

**Evidence:** signed decision block in ROADMAP or gate ledger, DPA/version references, privacy/data-safety change list, cost owner, rollback owner.

**Exit:** all six explicit GO/NO-GO; any NO-GO sends the spec back to review. No silent default.

---

### C0 — canonical PDM2 contract PR

**Repo:** web.  
**Depends on:** O0 for provider-facing fields; contract work itself may draft before external-resource GO.  
**Goal:** one executable, versioned data/API contract before persistence or clients.

**Create:**

- `contracts/pdm2/manifest.json`
- `contracts/pdm2/namespaces.json`
- `contracts/pdm2/common/*.schema.json`
- `contracts/pdm2/entities/*.schema.json` for every spec entity
- `contracts/pdm2/api/*.schema.json` for account/device/sync/export/delete/errors
- `contracts/pdm2/fixtures/valid/`, `invalid/`, `golden/`
- `scripts/pdm-contract.test.js`
- `docs/runbooks/pdm2-contract-versioning.md`

**Tasks:**

1. Encode every normative field, bound, enum, reference, unknown-field, ID, hash, cursor, and typed-error rule.
2. Add golden UUID/hash/blob/canonical-JSON vectors and valid/invalid boundary fixtures.
3. Add manifest hashing and a drift test.
4. Add a minimal Swift fixture reader test in iOS without changing app behavior; record its local commit/hash, do not push iOS.
5. Run JSON Schema meta-validation and the shared fixture suite.

**Tests:**

```sh
node --test scripts/pdm-contract.test.js
node --test scripts/state-codec.test.js scripts/workshop-store.test.js
shasum -a 256 contracts/pdm2/manifest.json contracts/pdm2/namespaces.json
```

**Review gate:** schema/domain review, security review, Swift parity QA, Claude cross-model zero P0–P2, owner manifest approval.

**Rollback:** contract-only revert; no stored PDM2 data exists yet.

**Exit:** merged manifest is the immutable C0 baseline; all downstream gates pin its hash.

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

**Tests:** exact/legacy IDs, crash points, corrupt backup, unknown future fields, repeated migration, quota, signed-out reload, v1↔PDM2 round trip.

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

**Tasks:** vendor manifest/fixtures by hash; preserve unknown raw JSON; atomically migrate Application Support files; add outbox/conflict models; expose journal/outcome UI parity; keep engine startup independent of PDM/cloud.

**Tests:** shared fixtures, file-write failure injection, fallback legacy IDs, backup cleanup, journal parity, existing Workshop/AppState/Engine tests.

**Review/rollback:** Swift architecture + QA; feature flag/local store fallback. Do not push or dispatch TestFlight.

**Exit:** local commit recorded in web gate review, XCTest green, byte/value parity with web fixtures.

---

### B0 — backend foundation, migrations, and local/staging runbooks

**Repo:** web.  
**Depends on:** C0 + O0 dev/staging authorization.  
**Goal:** testable Worker modules and expand-only D1 schema with no public account UI.

**Create/modify:**

- `functions/api/v1/_lib/` for schema, errors, canonical JSON, quotas, DB helpers
- `functions/api/v1/schema/versions.js`
- `migrations/account/0001_expand.sql`
- `wrangler.toml` preview bindings only
- `scripts/account-schema.test.mjs`, `scripts/account-dr.test.mjs`
- `docs/runbooks/account-backend.md`, `account-dr-restore.md`, `key-rotation.md`

**Tasks:** implement all normative tables/indexes/constraints; local D1 migration tests; public schema manifest endpoint; feature flags/global write breaker; content-free logging; staging-only R2/Queue/conditional-decision probe; expand/rollback rehearsal.

**Tests:**

```sh
npx wrangler d1 migrations apply 3dpa-account-preview --local
node --test scripts/account-schema.test.mjs scripts/account-dr.test.mjs
node --test functions/api/*.test.mjs
```

**Review/rollback:** DB/security/DR reviews; remove preview bindings and revert expand migration before data. Production creation is still blocked.

**Exit:** fresh + upgrade + rollback/forward-fix staging rehearsal, conditional-create capability proven, cost counters observable.

---

### A0 — auth, account creation, and device trust

**Repo:** web.  
**Depends on:** B0 + O0 production/provider GO.  
**Goal:** optional Apple/Google sign-in and atomic account/device registration, with sync still read-only/off.

**Create/modify:**

- `account-auth.js`, `account-device.js`
- `functions/api/v1/devices/register.js`, `rotate-key.js`, `revoke.js`
- Firebase token/JWKS verifier and exact auth-exception router
- `functions/api/v1/account.js`
- CSP/header configuration, privacy copy
- auth/device/JWKS/CSP tests

**Tasks:** configure dev/staging Firebase; lazy signed-out loading; P-256 non-exportable keys; signed request counters/retries; device recovery/lost-device flow; provider-link collision safe-stop; accountEnabled marker; strict CSP.

**Tests:** JWT confusion/rotation/outage, registration races, replay/counter, key loss with pending outbox, revocation, no-Web-Crypto degraded UX, Apple/Google popup+redirect CSP, signed-out no-auth load.

**Rollout:** internal staging accounts → owner account → 5% web flag → 100%; production sync writes remain disabled.

**Rollback:** disable signups/auth UI, retain export/delete/account access for created accounts; configurator stays local.

**Exit:** zero cross-user access, account/device recovery works, privacy/DPA evidence recorded.

---

### A1 — account export, deletion, and privacy lifecycle

**Repo:** web.  
**Depends on:** A0.  
**Goal:** compliant portability/deletion exists before general account rollout.

**Create/modify:**

- account export start/status/verify handlers and Queue consumer
- deletion start/status/reconciler handlers
- lifecycle ledger/lease/DR modules
- R2 encryption/key wrappers
- `/account/delete` web route and Account & Privacy UI
- deletion/export/DR fixtures and runbooks

**Tasks:** revision-consistent export snapshot; signed ES256 envelope; AES-256-GCM R2 artifact; seven-day expiry and verified receipt; deletion preflight; status capability; external account/entity lifecycle evidence; single-winner lease decisions; minimal purchase-retention seam; DR promotion blocker.

**Tests:** every saga crash point, timeout-after-success, concurrent entity/reference writes, deletion during export states, artifact crypto tamper, key rotation, Time Travel restore with account/entity erasure, no payload in caches/logs.

**Review/rollback:** privacy/security/DR hostile review + QA + cross-model zero. Kill switch keeps export/delete available while other account writes are off.

**Exit:** staging restore rehearsal proves erased accounts/entities stay erased; in-app/web deletion flows are ready before iOS/Android account creation.

---

### S0 — sync server protocol and lifecycle endpoint

**Repo:** web.  
**Depends on:** A0 + A1.  
**Goal:** complete server sync semantics behind a staging/read-only production flag; no client auto-sync yet.

**Create/modify:**

- `functions/api/v1/sync/push.js`, `pull.js`, `entity.js`, `status.js`, `lifecycle.js`, `bootstrap.js`
- `functions/api/v1/_lib/sync/` for validation, conflicts, cursors, graveyard, projections, quotas
- `scripts/sync-protocol.test.mjs`, `sync-concurrency.test.mjs`, `sync-dr.test.mjs`
- load/cost fixtures and incident runbook

**Tasks:** batch-atomic normal push; request/device/op idempotency; dependency results; async lifecycle op; content-free durable status; pull/cursor expiry; bootstrap/remap rules; tombstone/graveyard set union; lifecycle leases/reconciler; schema negotiation; per-account/global budgets.

**Tests:** property/concurrency tests for two devices, lost ACK, partial dependency failure, conflict copies, delete/reset/reactivate, old cursor, old client fields, malicious IDs/references, quota/write breaker, DR replay and later-update dominance. Run 1× and 4× capacity fixtures and record rows/op.

**Review/rollback:** protocol/security/DB subagents, QA, Claude zero P0–P2. Keep `syncWrites=false`; pulls/exports/deletes stay available.

**Exit:** contract fixture equality and 24-hour staging soak with no cursor gap, duplicate apply, payload leak, or unbounded row growth.

---

### S1 — web Workshop sync beta

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

**Rollout:** owner-only → invite beta → 5% → 25% → 100%, each with 48-hour error/cost observation and rollback threshold.

**Rollback:** `webSync=false`; never delete local/outbox data; export remains available.

**Exit:** 7-day owner beta with no data loss/conflict surprise and measured D1 budget below threshold.

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

### I1 — iOS account, My 3DPA, and Workshop sync release train

**Repo:** iOS, local commits until complete.  
**Depends on:** I0 + S0 + A1; start after S1 protocol soak.  
**Goal:** native Apple/Google account lifecycle and Workshop sync with signed-out parity.

**Create/modify:**

- `Models/Account/`, `Services/Auth/`, `Services/Sync/`
- Keychain P-256 device key service
- My 3DPA SwiftUI views and Account & Privacy
- Firebase dependencies/configuration
- unit/integration/UI tests, privacy manifest/strings

**Tasks:** contract hash pin; Sign in with Apple/Google; device registration/rotation; first-sync backup; outbox/pull/lifecycle; journal parity; conflicts; devices; export/delete/status capability; deep link to web deletion; offline status and no cloud call in `EngineService`.

**Tests:** shared fixtures; multi-device simulator/API stub; keychain loss; reinstall; backend outage; deletion partial failure; signed-out engine/Workshop/output; UI accessibility/animations. Full XCTest + web walkthrough.

**Release gate:** all local commits green → marketing version/bundle review → owner TestFlight GO → push iOS main once → manual TestFlight workflow. Never use TestFlight as iteration.

**Rollback:** remote iOS sync/auth flags; local store remains authoritative; App Store account deletion stays reachable for created accounts.

**Exit:** TestFlight owner walkthrough, then phased App Store release with crash/sync monitoring.

---

### X0 — export recipe/history library

**Repo:** web first; iOS follow-up only after web model acceptance.  
**Depends on:** W0; cloud sync portion depends on S1.  
**Goal:** retain reproducible export inputs/metadata, not generated slicer files.

**Create/modify:** `export-library.js`, PDM export snapshot/preset adapter, Exports section, tests; iOS Output/Export repository later.

**Tasks:** immutable content-addressed snapshots; preset pin/rename/repoint/delete; engine/data/catalog version labels; current-engine regeneration honesty; GC/reference races; optional sync under existing protocol.

**Tests:** Bambu/Orca/Prusa deterministic regeneration, snapshot hash vectors, repoint/GC concurrency, unavailable historical version, offline/local export.

**Rollback:** hide library UI; exporters remain unchanged; retained metadata stays exportable.

**Exit:** no generated files in D1/R2 and existing export output fixtures unchanged.

---

### F0 — local filament inventory domain and web UI

**Repo:** web.  
**Depends on:** C0 + W0.  
**Goal:** useful manual inventory signed out before cloud sync or monetization.

**Create/modify:**

- inventory PDM schemas/fixtures via a C0-compatible additive contract PR
- `inventory-store.js`, `inventory-projection.js`, `inventory-import.js`
- Filament section/UI/styles/locales
- inventory accounting/import/CSV safety tests

**Tasks:** spool metadata; event-authoritative acquire/consume/adjust/move/assign/dry/retire/reactivate; checked milligram bounds; projections; locations/AMS labels; search/filter; JSON/CSV import/export; dry-run ambiguity UI; no credentials/integrations.

**Tests:** all event invariants, concurrent ordering, projection rebuild, capacity edits, negative/overflow, exact CSV re-import, formula injection, future fields, 50-spool presentation only (no entitlement enforcement yet).

**Review/rollback:** domain + UX + QA; `inventoryLocal=false` hides module but preserves exportable local entities.

**Exit:** owner can add/import/manage a realistic inventory offline with zero accounting drift.

---

### F1 — bambuinventory read-only export and confirmed import

**Repos:** bambuinventory exporter PR, then web importer PR; never combine writes across repos.  
**Depends on:** F0.  
**Goal:** reuse data/domain value without reusing insecure single-user API behavior.

**bambuinventory PR:** add authenticated read-only export or local CLI exporter; no wildcard/new write endpoint; include stable source IDs, units, ambiguity metadata, checksum/version; tests against a sanitized fixture.

**web PR:** map rows to spool metadata + one acquire event; normalize units; dry-run skipped/ambiguous rows; deterministic import IDs; explicit confirmation; idempotent re-import.

**Cutover:** bambuinventory remains source/read-only until owner compares counts, totals, locations, AMS assignments and approves. No big-bang deletion.

**Rollback:** delete the unconfirmed import transaction locally or restore its pre-import backup; exporter is read-only.

**Exit:** signed reconciliation report with source/import/skipped/ambiguous counts and exact remaining-total comparison.

---

### F2 — inventory sync and My 3DPA web integration

**Repo:** web.  
**Depends on:** F0 stable + S1 + F1 accepted.  
**Goal:** sync spool/events/projections safely while keeping local inventory useful.

**Tasks:** enable inventory entity kinds server-side; reference/lifecycle tests; projection rebuild; quota UI; multi-device event union; Filament Overview cards/alerts; optional printer assignment; account export/delete coverage.

**Tests:** two-device consume/move/retire; event id collision; lifecycle fence; projection crash/rebuild; old cursor; deletion/DR; 50k operational-ID boundary; signed-out and sync-off behavior.

**Rollout/rollback:** owner beta → invite beta; `inventorySync=false` preserves local inventory and pull/export/delete. No Pro enforcement.

**Exit:** 14-day beta with reconciled balance totals and no projection/source divergence.

---

### F3 — iOS inventory release train

**Repo:** iOS local commits, later one gated push.  
**Depends on:** I1 + F2.  
**Goal:** native Filament module with shared contract/account behavior.

**Tasks:** vendor updated manifest; inventory repository/projection; native list/detail/add/adjust/move/dry/retire; import/export; sync status/conflicts; polished dark-mode animations/accessibility; account deletion/export inclusion.

**Tests:** shared event/projection fixtures, offline/restart, multi-device stub, import parity, UI tests, full XCTest and web walkthrough.

**Rollback/release:** remote inventory flag; local entities remain exportable. Follow iOS push/TestFlight gate exactly.

**Exit:** owner TestFlight reconciliation against the same account/web inventory.

---

### E0 — one-time Pro entitlement and inventory boundary

**Repos:** web backend/UI, then iOS and Android store-specific PRs.  
**Depends on:** F2 usage/cost evidence + F3 architecture; fresh owner pricing/legal GO.  
**Goal:** server-authoritative lifetime Pro only when inventory proves value.

**Owner gate:** confirm 50 active-spool definition, target 99 DKK localized price, seven-day offline grace, refund/chargeback/statutory retention, web checkout decision, and no subscription.

**Tasks:** purchase event/retention migrations; StoreKit 2 JWS + ASSN v2; Play Developer API/RTDN later; appAccountToken; restore purchases; cross-platform entitlement; non-destructive downgrade/over-limit; server reconciliation and key rotation.

**Tests:** sandbox/production isolation, replay, refund/revoke, family/ownership, account mismatch, restore on new device, offline grace timestamp, over-limit edits/export/sync, deletion inside/outside retention window.

**Rollback:** disable new grants/checkout, preserve validated existing entitlement/read/export; never delete or hide inventory.

**Exit:** store sandbox and hostile security review green, owner purchase/restore/refund walkthrough complete.

---

### D0 — Android v1.1 My 3DPA sync

**Repo:** Android on mac-mini only.  
**Depends on:** Android v1 shipped + S1 protocol stable + C0 manifest + owner reopens Android gate.  
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

## 5. Backlog after the gated program

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

## 6. Review and release cadence

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

## 7. Mandatory data/logic cross-platform evaluation

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

## 8. Program completion criteria

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
