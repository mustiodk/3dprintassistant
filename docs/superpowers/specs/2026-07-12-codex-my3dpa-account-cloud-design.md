# My 3DPA — optional accounts, cloud sync, Workshop, exports, and filament inventory

**Date:** 2026-07-12  
**Status:** independent Codex proposal — review pending  
**Audience:** owner / future implementation sessions  
**Scope:** product architecture and implementation-grade contracts; no product code in this session  
**Independence cutoff:** product/session context was read from web commit `0e8e405` (the first parent of Claude PR #16). The Claude accounts-platform session log, spec, plan, and review artifacts were deliberately not read while producing this design.

---

## 1. Decision summary

Build **My 3DPA** as an optional personal workspace layered on top of the existing local-first apps.

1. **The configurator, troubleshooter, Workshop, native export, local backup, and Mine tuning remain usable without an account and remain free.** Login never becomes an app-launch wall.
2. **An account initially buys convenience, not permission:** automatic backup and cross-device sync of Workshop/profile data. The local JSON backup remains supported forever as an escape hatch.
3. **Use Firebase Authentication only for identity** and verify Firebase ID tokens in the existing Cloudflare Worker. Store 3dpa domain data in a new **EU-jurisdiction Cloudflare D1** database. Do not put Workshop/inventory data in Firebase.
4. **Introduce one Portable Data Model v2 (PDM2)** across web, iOS, Android, and later macOS. Existing `3dpa_workshop_v1` data migrates locally before sync is enabled.
5. **Sync append-only facts as operations, not mutable totals.** Outcomes, tuning, and filament usage are op-log/event entities. Mutable objects use optimistic concurrency and produce a visible conflict copy instead of silent data loss.
6. **Inventory is the first major new My 3DPA module.** Reuse bambuinventory's domain lessons, import pipeline, AMS concepts, and UX patterns; do not reuse its current unauthenticated single-user PHP API as a multi-user backend.
7. **Monetization remains the already-ratified phased model:** tips first; no subscriptions or retro-paywalls. Basic account sync is free. A later one-time Pro unlock is anchored on advanced inventory, while current features remain free forever.
8. **Do not block Android v1 on accounts.** Android v1 keeps its already-planned local-first scope. My 3DPA sync becomes a v1.1 train unless the owner explicitly reopens Android Gate AG0. Native macOS inherits the same PDM2/sync client when that target exists.

This design deliberately avoids becoming a slicer, remote printer-control cloud, social network, or file-hosting service. 3dpa's differentiator stays: **configure → export → print → learn → remember**, now across devices.

## 2. Product positioning

### 2.1 The product sentence

> My 3DPA is the private, cross-platform memory for a maker's printers, proven settings, print outcomes, exports, and filament — while the core configurator remains fast, free, and account-optional.

### 2.2 Market boundary

The adjacent market is already crowded at remote control, webcams, cloud slicing, and print-farm operations:

- SimplyPrint combines printer control, cloud slicing, filament management, print history, teams, and paid tiers; its free tier includes two printers and basic filament management, while its standalone Filament Manager is subscription-priced. [Official pricing](https://simplyprint.io/pricing) and [print-history feature](https://simplyprint.io/features/print-history).
- Obico sells remote access, video, AI failure detection, and cloud G-code storage, with a one-printer free tier and recurring premium plan. [Official pricing](https://app.obico.io/ent_pub/pricing/).
- Spoolman is a self-hosted inventory service with a REST API and community filament database. [Official repository](https://github.com/Donkie/Spoolman).

3dpa should not chase those products into cameras, remote motion/control, cloud slicing, or farm/team administration. Its cheaper and more coherent wedge is **settings intelligence plus personal memory**. Remote-printer integrations may later enrich inventory/print history, but they are adapters into My 3DPA, not the core platform.

## 3. As-is audit

| Surface | Ground truth | Consequence |
|---|---|---|
| Web app state | `state-codec.js` owns a versioned state schema used by local persistence, share URLs, and Workshop profiles. | Keep this single-codec principle; PDM2 wraps it rather than replacing engine state. |
| Web Workshop | `workshop-store.js` stores `v:1`, profiles, journals, tuning accepts/dismissals, and supports atomic import plus op-union tuning merge. | This is a strong local source and migration input, but profiles/journals need explicit entity IDs/revisions for online sync. |
| iOS persistence | `AppStatePersistence.swift` stores the web-shaped state in Application Support. | Preserve offline boot; cloud sync must never be required for engine startup. |
| iOS Workshop | `WorkshopStore.swift` emits a byte-compatible web envelope and preserves unknown additive top-level keys. UI exposes shelf + backup, but not the full web journal/harvest experience. | PDM2 fixtures can extend an already-proven cross-platform contract. iOS journal parity remains a separate product gap. |
| Export | Bambu, Orca, and Prusa native exporters are deterministic engine outputs. | Sync export **recipes/presets and history metadata**, not generated files by default. Regenerate files locally from the recorded engine/data version. |
| Web backend | `worker.js` routes only feedback, analytics, and analytics-query. `wrangler.toml` binds Analytics Engine and intake KV. | Add explicit `/api/v1/*` routes and D1 binding; do not mix account APIs into feedback handlers. |
| Identity | No accounts or auth client exist. Analytics intentionally has no user/session/device identifiers. | Account telemetry must remain separate from anonymous product analytics; do not retrofit identity into existing events. |
| Android | Native Kotlin/Compose v1 is planned, local-first, with accounts/sync explicitly out of scope. | Consume PDM2 in Android v1.1 unless AG0 is reopened; do not silently expand the v1 release. |
| macOS | Current recommendation is iOS-on-Apple-silicon as stopgap, later native SwiftUI target after Android/iOS architecture work. | The future target reuses iOS auth/sync/domain packages; no standalone macOS backend. |
| bambuinventory | Single-user PHP/MySQL app with Gmail intake, AMS/MQTT state, humidity probes, spool CRUD, and explicit-match UX. MySQL is truth. | Reuse domain vocabulary and import/adaptor logic. Its wildcard CORS and unauthenticated UI writes are unacceptable for multi-user reuse. |

### 3.1 Existing assets to preserve

- Web/iOS state-shape parity.
- Stable UUID-like profile, outcome, and tuning-op identifiers.
- Versioned JSON backup with additive top-level sections.
- Atomic local file writes on iOS and one-write localStorage import on web.
- Tuning op-union semantics and pair-key safety.
- Engine/data remain local and byte-mirrored; server never generates profiles.
- Local backup/import remains a supported portability path even after cloud sync ships.

### 3.2 Existing gaps the platform must solve

- No account lifecycle, authenticated API, server database, or deletion/export workflow.
- Web and iOS profile collision behavior is whole-object/imported-wins; that is unsafe for concurrent devices.
- Journal entries are nested under profiles, making independent merge/deletion difficult.
- Inventory has no 3dpa domain contract.
- Export actions are ephemeral; there is no personal export library/history.
- The current anonymous analytics schema cannot answer account adoption, and it must not be identity-linked to do so.

## 4. Experience architecture

### 4.1 Navigation and naming

Add a top-level personal destination named **My 3DPA**. “Profile” is reserved for account identity; it is too narrow for inventory and print history.

My 3DPA contains:

1. **Overview** — local/cloud status, recent profiles, inventory alerts, recent print outcomes.
2. **Workshop** — saved configurations, print journal, accepted Mine tuning, custom materials.
3. **Filament** — inventory, spool details, locations, remaining amount, drying/usage history.
4. **Printers** — saved/favorite printers and optional device/integration status; not remote control.
5. **Exports** — pinned export recipes and recent export metadata; regenerate/download locally.
6. **Sync & Backup** — last sync, pending/conflicts, devices, JSON export/import.
7. **Account & Privacy** — linked sign-in methods, data export, account deletion, privacy explanation.

### 4.2 Signed-out mode

My 3DPA remains useful while signed out:

- Header state: **On this device**.
- All existing local Workshop features work.
- Inventory can begin locally before an account exists.
- Backup export/import stays prominent.
- “Sync across devices” is an explicit action, not an interrupting prompt.

Do not prompt for login on first launch or first profile. The best account conversion moment is when a user explicitly chooses sync/backup or has meaningful local data and opens My 3DPA.

### 4.3 First sign-in with local data

Before upload, create a local JSON safety backup and show a preview:

- local profiles/outcomes/tuning/custom materials/spools count;
- cloud item counts;
- default action: **Merge safely**;
- alternative: keep cloud and export local backup (never destructive without a backup);
- conflicts create named copies or explicit choices; no silent overwrite.

Backup must have a receipt containing schema version, byte count, SHA-256, creation time, and storage class. On web, leave the original v1/local store untouched, stage migration in a separate IndexedDB database, and offer a PDM2 file: use File System Access write+readback verification where available; otherwise require an explicit download/confirmation and retain the untouched original store until cloud round-trip succeeds. On iOS/macOS and Android, atomically write a sibling backup file in Application Support/internal app storage, reopen it, verify its hash, and keep it through the compatibility window. A backup receipt is valid only after readback or after the browser fallback's explicit download confirmation; a same-record overwrite never counts as a backup.

### 4.4 Sync visibility

Use a quiet status model:

- `On this device`
- `Syncing…`
- `Synced just now`
- `Offline — N changes waiting`
- `Needs attention — N conflicts`

Sync state belongs in My 3DPA and a small account/status affordance, not in the configurator's step flow.

## 5. Non-goals and boundaries

Not in the accounts/sync program:

- mandatory login;
- cloud-side profile generation or engine execution;
- STL/3MF/G-code hosting;
- remote printer movement, cameras, or print control;
- public profiles, follower graph, comments, messaging, or community marketplace;
- team/farm permissions;
- importing Gmail credentials into 3dpa cloud;
- storing printer LAN/cloud credentials in D1;
- syncing anonymous analytics identifiers to an account;
- subscription monetization;
- rewriting `engine.js` or porting it to server code;
- blocking Android v1 or the macOS availability check.

Public sharing/community contributions require a later privacy/moderation spec. Device integrations require a separate local-bridge security spec.

## 6. Architecture decision

### 6.1 Options evaluated

| Option | Strength | Cost / risk | Verdict |
|---|---|---|---|
| Supabase Auth + Postgres + Storage | Integrated auth/RLS/database; Swift and Kotlin clients. | Production Pro starts at $25/month; direct-client RLS adds a second backend style; free projects pause after inactivity. [Official pricing](https://supabase.com/pricing), [Auth architecture](https://supabase.com/docs/guides/auth/architecture). | Good fallback, not the default for a cost-cover hobby project. |
| Custom auth + Cloudflare D1 | Single vendor and full control. | Password/OAuth recovery, abuse, provider linking, security updates, native SDK work, and account support become owner responsibilities. | Reject. Identity is not 3dpa's differentiator. |
| Firebase Auth + Cloudflare Worker/D1 | Mature web/iOS/Android SDKs, Apple+Google providers, custom-backend ID-token verification; keeps current deployment and scale-to-zero D1. | Two vendors; Firebase Auth is US-only; Worker must verify/cache JWT keys and implement domain authorization. | **Recommended.** Smallest reliable cross-platform identity layer while domain data remains in 3dpa infrastructure. |

Firebase documents iOS, Android, and web auth SDKs and custom-backend ID tokens. Its non-phone auth tier covers substantial early usage without a fixed monthly production fee. [Firebase Auth](https://firebase.google.com/docs/auth), [pricing](https://firebase.google.com/pricing), and [ID-token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens).

### 6.2 Target topology

```text
Web / iOS / Android / later macOS
  ├─ local engine + local PDM2 store (always works signed out)
  ├─ Firebase Auth SDK (identity only)
  └─ HTTPS Bearer Firebase ID token
          ↓
Cloudflare Worker: /api/v1/*
  ├─ JWT verification + active-account authorization
  ├─ sync validation/conflict rules
  ├─ account export/deletion
  └─ entitlement validation endpoints (later)
          ↓
EU-jurisdiction D1: 3dpa-account-v1
  ├─ users/devices
  ├─ sync_entities
  ├─ sync_ops/idempotency
  ├─ user_revision counters
  └─ entitlements/purchase events (later)
```

The D1 database must be created with `--jurisdiction=eu`; Cloudflare states that this constrains where the database runs and stores data. [D1 data location](https://developers.cloudflare.com/d1/configuration/data-location/).

### 6.3 Cost posture

D1's current free allowance is 5M rows read/day, 100k rows written/day, and 5 GB storage; it scales to zero and has no D1 egress fee. [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/). Treat that as a measured launch envelope, not an “ample” assumption.

Initial capacity model: 500 daily synced accounts × 10 mutations gives 5,000 ops/day; budget three D1 writes/op (entity, revision, idempotency) = 15,000 writes/day. Six pulls/account/day × 20 changed rows budgets 60,000 row reads/day, plus 10× overhead for user/device/schema queries remains below 1M reads. A stress case of 2,000 daily accounts × 20 mutations × three writes reaches 120,000 writes/day and requires Workers/D1 Paid or batching redesign. The 5 MB active-payload cap reaches the 5 GB storage tier at roughly 1,000 maximally filled accounts, so observed p50/p95 bytes per account matters more than account count alone.

Production alerts fire at 50% and 75% of daily read/write/storage allowance, at p95 sync latency/error thresholds, and on export/conflict amplification. The launch gate replays baseline and 4× load against staging, records rows/op and bytes/account, and sets the paid-plan/optimization threshold before enabling signups.

Abuse/cost ceilings are independent of burst rate limits: an account may apply at most 500 domain ops/day and 200/hour, with batch cost charged per op plus payload-size units; active payload is capped at 5 MB and compact operational metadata at 2 MB/50,000 lifetime entity IDs. Delete, export, pull, and account deletion remain available at a quota. A global write breaker makes sync read-only before 70,000 D1 writes/day on Free, preserving pull/export/delete and local-first behavior. Legitimate cap increases require an observed workload and paid-capacity decision, not a client flag.

R2 is used narrowly in the first account release for short-lived asynchronous account-export artifacts and the restore-independent erasure ledger; normal sync payloads remain in D1. Scheduled DB exports or future user files require their own retention gate. R2's current Standard free tier includes 10 GB-month, 1M writes, 10M reads, and free egress. [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

## 7. Identity and account lifecycle

### 7.1 Principles

- Identity provider UID, not email, is the D1 primary user key.
- D1 stores no email in v1. Display name is optional and user-supplied.
- Firebase keeps provider identity/email. 3dpa remains the GDPR controller; Firebase/Google is a processor. Firebase Auth currently processes in US data centers, which must be disclosed. [Firebase privacy](https://firebase.google.com/support/privacy).
- Account is optional; signed-out mode remains first-class.

### 7.2 Providers

Launch with **Sign in with Apple** and **Google Sign-In** on every platform where each is supported; Firebase supports Apple on iOS, web, and Android. Use the same provider when moving devices. Add email auth only if real demand appears.

The provider-linking screen lets a signed-in user link the other provider only when that credential is not already owned by another Firebase UID. Never auto-merge accounts because emails match; Apple private relay makes email identity especially unreliable. If the credential belongs to another account, v1 stops before mutation, keeps both accounts untouched, explains which original provider must be used, and offers data export—not merge. Cross-account provider/data/entitlement merging is deferred until a separate design specifies recent authentication to both accounts, freeze/order, deterministic conflict and entitlement union, rollback, and retirement of the source UID. Firebase supports multiple linked providers under one UID and reports occupied-credential conflicts. [Provider linking](https://firebase.google.com/docs/auth/web/account-linking/).

Apple requires apps using third-party/social login for a primary account to provide an equivalent privacy-preserving option, and apps with account creation must provide in-app deletion. [App Review Guidelines 4.8 and 5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/).

### 7.3 API authorization

Every `/api/v1/*` request:

1. requires HTTPS `Authorization: Bearer <Firebase ID token>`;
2. verifies RS256 signature, `kid`, `aud`, `iss`, `exp`, `iat`, and non-empty `sub` using cached Google public keys;
3. derives `user_id` only from verified `sub`;
4. checks D1 `users.status='active'` before any domain action;
5. applies per-user and per-IP rate limits;
6. ignores any client-supplied user ID.

JWKS handling is fail-closed and bounded: accept only `alg=RS256`; cache Google's successfully validated key set for `min(Cache-Control max-age, 60 minutes)` and refresh single-flight at 80% of lifetime. An unknown `kid` triggers one rate-limited immediate refresh and a five-minute negative cache; it never falls back to another key. If refresh fails, still-valid cached keys may be used until their deadline, then auth returns retryable `503 auth_keys_unavailable` rather than accepting stale/unverified tokens. Metrics/alerts cover refresh failure, unknown kids, cache age, and auth-key outages without logging tokens.

The active-user D1 check makes account deletion effective immediately even if a short-lived Firebase token still exists.

### 7.4 Account creation

First authenticated request creates:

- an active D1 user row;
- a server-registered device row and device signing public key after recent provider reauthentication;
- PDM version `2`;
- zero domain data until the user confirms first upload.

The client generates a P-256 signing key in Keychain/Secure Enclave, Android Keystore, or non-exportable Web Crypto storage; D1 stores only the public key. Sync calls include device ID, strictly increasing request counter, timestamp, canonical body hash, and ECDSA signature over method/path/body hash/device ID/counter/timestamp. In the same D1 transaction as the request, the Worker verifies the public key and advances `last_request_counter`. A retry at the current counter returns the cached result only when its request hash matches; lower counters or same-counter/different-hash requests are replay errors. Registering or rotating a key requires a Firebase token with recent `auth_time`, so a revoked installation cannot simply invent a new device ID using a background refresh token.

Web has no cleartext fallback: when required Web Crypto/key persistence is unavailable, sign-in, local use, and manual export remain available but device registration/sync is disabled with a specific browser-support message; private keys never enter localStorage, JSON backup, or logs. If browser storage cleanup removes a previously registered private key, keep local data, require recent provider reauthentication, revoke that single stale device row, generate/register a new key, and bootstrap-merge. Routine storage clearing does not trigger account-wide refresh-token revocation; the separate lost-device flow is reserved for suspected credential theft.

Device removal therefore revokes sync capability for that installation. The lost-device flow additionally calls Firebase refresh-token revocation for the account, revokes all device public keys, and requires fresh provider sign-in before trusted devices are re-registered. The UI states clearly that account-wide sign-out is required for a suspected stolen credential.

Do not create anonymous Firebase accounts for every install. That would turn every local user into server state and weaken the no-account promise.

### 7.5 Account export and deletion

Account & Privacy must provide:

- **Export my data:** machine-readable PDM2 JSON, including active entities, tombstones still retained, devices, entitlement state, and a schema/version manifest. Auth provider secrets/tokens are never included. Export is an asynchronous, retryable job: start returns `202` + `requestId`; status polling reports progress/failure/expiry and eventually streams the authenticated artifact.
- **Delete account:** reauthentication, impact summary, local-backup offer, typed/explicit confirmation, immediate D1 status lock, active-domain deletion plus Firebase identity deletion, then sign out locally. Cloud-account deletion does **not** silently erase offline data: the explicit `Delete local data on this device too` control defaults off. Keeping it converts the installation back to signed-out `On this device` mode; selecting it removes local PDM2 data only after a verified export when the user requested one.
- **Web deletion route:** `/account/delete`, available to users without reinstalling an app.

Deletion is an idempotent cross-vendor saga, not an assumed transaction:

1. recent reauthentication creates a `deletion_jobs` row and moves the user `active → deleting`; all account/sync APIs then fail closed except deletion status;
2. delete every user-scoped row—including active/tombstoned entities, projections, `deletion_graveyard` buckets, `sync_ops`, devices, entitlements, and encrypted purchase/source transaction handles—then record `domain_deleted`; schema migration tests fail if a new user-scoped table is absent from this enumerated cascade/check;
3. revoke Firebase refresh tokens and delete the Firebase identity, retrying `identity_deletion_pending` with bounded alerts until confirmed or already absent;
4. before discarding the UID, write a restore-independent erasure-ledger record described below; then compact the D1 job to a content-free deletion receipt (`requestId`, status, timestamps, error class only), irreversibly discard the UID from D1, and retain the receipt for 30 days before deletion.

The job table is outside the domain-row cascade, so a crash cannot erase retry state. Every step is idempotent; a reconciler resumes incomplete jobs, and support tooling can see status without seeing user content. If identity deletion remains unavailable, the D1 lock still prevents all data access and the user sees a non-misleading pending status.

The start response returns `requestId` plus a random 256-bit, scoped status capability exactly once; D1 stores only its hash. `GET /api/v1/account/deletion/{requestId}` accepts that capability instead of Firebase identity and returns only `locked|domain_deleted|identity_pending|complete|failed_retrying`, timestamps, and `retryAfter`—never UID or content. Apps keep it in protected local storage until completion/receipt expiry; the web deletion page can resume from the capability. It expires with the 30-day receipt and is never logged or accepted by any other endpoint.

Google Play requires both an in-app path and a web deletion resource when account creation exists. [Official requirement](https://support.google.com/googleplay/android-developer/answer/13327111). GDPR rights include access, correction, erasure, and portability. [European Commission](https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en).

D1 Time Travel can retain recoverable database history up to 30 days on Workers Paid or 7 days on Free. Privacy copy must state the backup-aging window; deleted accounts must remain API-inaccessible immediately. [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/).

Time Travel and encrypted recovery exports are inaccessible to the application and are used only for disaster recovery, never to recover an individual deleted account. A separate write-once erasure ledger lives outside the D1/backup restore boundary (private R2 objects or an equivalently isolated store). It records `requestId`, `HMAC(erasureKey, firebaseUid)`, deletion time/status, and expiry—no raw UID or content—and is retained for the longest recovery window plus 15 days. The HMAC key is a dedicated Worker secret with rotation/runbook controls.

Any restore to a point before deletion must scan each restored UID through the same keyed locator, reconcile every matching external ledger record, and re-run domain/identity deletion **before** the restored database can receive traffic; promotion is blocked until a report proves those users and domain rows absent. The external ledger is not rolled back with D1. Retained disaster-recovery copies and ledger locators age out under their disclosed windows. Production provisioning requires written confirmation that the Cloudflare DPA and transfer terms cover this residual backup retention and that the privacy/erasure procedure reflects the restore-before-promotion rule.

## 8. Portable Data Model v2 (PDM2)

### 8.1 Envelope

```json
{
  "format": "3dpa-portable-data",
  "version": 2,
  "exportedAt": "2026-07-12T00:00:00.000Z",
  "entities": [],
  "manifest": {
    "engineVersion": "git-sha-or-app-version",
    "dataVersion": "git-sha-or-catalog-version",
    "sourcePlatform": "web|ios|android|macos"
  }
}
```

Each entity:

```json
{
  "kind": "profile",
  "id": "uuid",
  "schemaVersion": 1,
  "version": 7,
  "createdAt": "...",
  "updatedAt": "...",
  "deletedAt": null,
  "payload": {}
}
```

`version` is server-controlled after sync. Signed-out local entities use `version:0` until first upload.

Readers must round-trip unknown envelope and payload fields byte-for-value through their raw representation. Mutable sync writes are field-mask updates, not blind replacement: the operation carries `changedFields`, the complete values for those fields, and the entity `baseVersion`; the Worker merges only those known paths into the current payload. A client may not name a field its supported entity schema does not define. Full replacement is allowed only for a new `version:0` entity or when the client supports the server entity's schema version. This prevents an older client from erasing fields added by a newer one.

### 8.2 Entity kinds

| Kind | Merge class | Payload summary |
|---|---|---|
| `profile` | Mutable / conflict-copy | name, web-shaped app state, notes, created engine/data version |
| `outcome` | Append-only | profileId, worked/failed, symptom IDs, note, timestamp |
| `tuning_op` | Append-only | pairKey, offsetKey, accept/revert step, clamps, symptomId, timestamp |
| `tuning_dismissal` | Latest-per-key | suggestion key, dismissedAt |
| `custom_material` | Mutable / conflict-copy | namespaced id, canonical template id, validated overrides |
| `printer` | Mutable | favorite/name/model id, optional integration metadata excluding secrets |
| `spool` | Mutable metadata | product/material/color, capacity, purchase/source metadata; no mutable remaining/status/location fields |
| `inventory_event` | Append-only | spoolId, acquire/consume/adjust/move/assign/dry/retire/reactivate, delta and reason |
| `export_snapshot` | Append-only / content-addressed | immutable canonical app-state snapshot plus engine/data/catalog versions and SHA-256 hash |
| `export_preset` | Mutable / conflict-copy | exportSnapshotId, slicer/type, favorite name |
| `preference` | Latest-per-key | account-level language/display/sync preferences only |

Journal entries move out of nested profile arrays during migration. Remaining filament is derived only from `sum(inventory_event.deltaMg)`: every new/imported spool begins with an `acquire` event, never both an initial quantity and an event. Never sync a mutable remaining percentage when two devices can consume the same spool.

#### 8.2.1 Normative schema contract

Before any client implementation, the contract gate publishes versioned JSON Schema 2020-12 files in `contracts/pdm2/entities/` and `contracts/pdm2/api/`. Those checked-in files, not prose or a platform model, are authoritative. They set `additionalProperties: true` for forward-compatible payload fields, while the Worker separately allowlists writable paths per client schema version. All strings are valid UTF-8; IDs and reference fields are bounded to 128 bytes; user labels are 1–80 Unicode scalar values; notes are at most 2,000; timestamps use RFC 3339 UTC; monetary values are integer minor units plus ISO-4217 currency; quantities are finite integer milligrams internally and rendered in user units.

The first schema set must fully define:

| Kind | Required payload contract |
|---|---|
| `profile` | `name`, complete web-shaped `state`, `engineVersion`, `dataVersion`; optional `notes` |
| `outcome` | `profileId`, `result: worked|failed`, `symptomIds[]`, `occurredAt`; optional `note`; reference may point to a tombstoned same-user profile |
| `tuning_op` | `pairKey`, `offsetKey`, `action: accept|revert`, finite `step`, `clampMin`, `clampMax`, `occurredAt`; optional `symptomId` |
| `tuning_dismissal` | deterministic `suggestionKey`, `dismissedAt` |
| `custom_material` | namespaced `materialId`, `canonicalTemplateId`, schema-allowlisted `overrides` |
| `printer` | canonical `modelId`; optional bounded `label`, nozzle/material/location references; no credentials or serials |
| `spool` | `product`, `materialId`, `capacityMg`; optional color/purchase fields; status/location/assignment are event-derived projections |
| `inventory_event` | `spoolId`, event enum, signed `deltaMg`, `occurredAt`, reason/source; same-user reference required unless importing a tombstoned spool |
| `export_snapshot` | complete canonical web-shaped `state`, engine/data/catalog versions, and content hash; entity ID is derived from the hash |
| `export_preset` | same-user `exportSnapshotId`, `slicer: bambu|orca|prusa`, `exportType`; optional label |
| `preference` | deterministic allowlisted `key` and typed `value`; account secrets and engine/profile values are forbidden |

API schemas define every request, success response, per-op result, page cursor, bootstrap manifest, export manifest, deletion status, and error body. Errors use `{code, message, retryable, requestId, details?}` with a closed `code` enum. Push returns one ordered result per submitted op (`applied|duplicate|conflict|rejected`), never an ambiguous batch boolean; dependency rejection names the prerequisite op. Pull returns `{entities, nextRevision, currentRevision, minAvailableRevision, hasMore}`. Canonical payload hashes use RFC 8785 JSON Canonicalization Scheme plus SHA-256.

One shared fixture corpus contains valid boundary examples, every invalid enum/reference/size case, unknown-field round trips, canonical hashes, partial-batch dependency cases, and expected typed errors. JavaScript, Swift, and Kotlin conformance suites must consume the exact same files before their adapters can merge.

### 8.3 IDs and timestamps

- New ordinary entities use UUID v4 identifiers generated locally. Validated legacy IDs are namespaced as described in §15.1.
- Latest-per-key entities use a deterministic UUID v5 from the fixed 3dpa namespace plus `kind + normalizedLogicalKey`: preference keys are a closed account-setting enum; tuning-dismissal keys are the canonical suggestion key. D1 also enforces `UNIQUE(user_id, kind, logical_key)`.
- RFC 3339 UTC display timestamps.
- Ordering/causality uses server revisions, not client wall clocks.
- Client timestamps are informational and bounded/validated.
- IDs are opaque; no email, printer serial, or provider ID embedded.

### 8.4 Tombstones

Deletes create content-free tombstones `(kind, entityId, deletedRevision, deletedAt)` immediately; undo content stays only in a local, explicit seven-day undo buffer. After 30 days, server tombstones compact into a keyed-hash graveyard set, bucketed/chunked to bound row overhead while retaining membership checks. A graveyard member is removed only with the account, never by normal sync compaction. At the 2 MB/50,000-ID operational quota, the account stays pull/export/delete capable but cannot create new entity IDs until an explicit capacity/support decision; deletion is never blocked. Account deletion bypasses normal tombstone retention and hard-deletes domain rows after immediate account lock.

Compacting the ordered change stream advances `users.min_available_revision`. A pull using an older cursor returns `410 cursor_expired` with `minAvailableRevision` and requires an authoritative bootstrap/reconciliation. Bootstrap stages the server snapshot and graveyard against the local store, preserves unsynced local operations, rejects stale recreation of graveyard IDs, and exposes any legitimate local resurrection as an explicit **Restore as new copy** action with a new ID. The server rejects a push for an absent entity when `baseVersion > 0`; it also rejects any create whose ID is in the graveyard.

## 9. Sync contract

### 9.1 Server tables

```text
users(user_id PK, status, pdm_version, next_revision, min_available_revision,
      created_at, deleted_at)
devices(user_id, device_id, signing_public_key, last_request_counter,
        last_request_hash, last_request_result, last_applied_op_sequence,
        platform, app_version, label,
        last_seen_at, revoked_at, PK(user_id, device_id))
sync_entities(user_id, kind, entity_id, entity_version, user_revision,
              schema_version, payload_json, payload_hash, deleted_at, updated_at,
              PK(user_id, kind, entity_id))
sync_ops(user_id, op_id, op_sequence, request_hash, device_id, kind, entity_id,
         base_version, applied_version, user_revision, compact_result, created_at,
         UNIQUE(user_id, op_id))
deletion_graveyard(user_id, kind, entity_id, deleted_revision, deleted_at,
                   PK(user_id, kind, entity_id))
deletion_jobs(request_id PK, user_id, status, requested_at, updated_at,
              retry_after, last_error_class, receipt_expires_at)
entitlements(user_id, product_key, status, source, source_tx_id_hash,
             granted_at, revoked_at)  -- later monetization gate
```

Indexes: `(user_id,user_revision)`, `(user_id,kind,deleted_at)`, `(user_id,device_id)`. Payloads are bounded JSON; the Worker has a per-kind allowlist and schema validator.

### 9.2 API

```text
GET  /api/v1/account
POST /api/v1/account/export
GET  /api/v1/account/export/{requestId}     (status or authenticated download)
POST /api/v1/account/delete
GET  /api/v1/account/deletion/{requestId}   (scoped status capability)
GET  /api/v1/devices
POST /api/v1/devices/{id}/revoke
POST /api/v1/devices/register              (recent reauthentication required)
POST /api/v1/devices/revoke-all            (lost-device incident flow)
POST /api/v1/sync/push
GET  /api/v1/sync/pull?after=<revision>&limit=<n>
POST /api/v1/sync/bootstrap
GET  /api/v1/entitlements              (later)
POST /api/v1/purchases/apple/verify    (later)
POST /api/v1/purchases/google/verify   (later)
```

Limits for v1: 100 ops/push, 500 entities/pull page, 64 KB/entity, 5 MB active payload/account, and rate limits sized from measured traffic. Exceeding a limit returns a structured, non-destructive error.

Account export uses `export_jobs` plus a Cloudflare Queue consumer that pages D1, validates counts/hashes, and writes the completed archive to a private, encrypted R2 object. The GET endpoint requires the same active reauthenticated user, returns progress or streams the object; object keys are random and never public. Jobs are idempotent by request ID, retry page checkpoints safely, expose typed terminal errors, and delete artifacts within 24 hours of completion. Account deletion waits for or explicitly cancels an export the user requested. R2/Queue resources are therefore activated at the account-lifecycle gate, not for normal sync payload storage.

Day-1 conservative limits are enforced before traffic data exists: per verified user, 20 pushes/minute, 60 pulls/minute, 2 exports/hour, 5 device registration/revocation attempts/hour, and 3 deletion starts/day; per source IP, 300 authenticated API requests/minute and 30 failed/unauthenticated auth requests/minute, with a higher documented emergency allowance for known provider callbacks. Responses use `429`, typed code, and `Retry-After`. Load tests verify normal foreground/debounce/bootstrap stays below these ceilings. Changes are configuration-reviewed against abuse, NAT/shared-IP impact, D1 cost, and observed p95—not silently relaxed in code.

### 9.3 Push semantics

Every local mutation gets `opId = <registeredDeviceId>:<monotonicOpSequence>`, registered `deviceId`, kind/entity ID, `baseVersion`, schema version, explicit `dependsOnOpIds[]`, field mask plus changed values (or complete payload for a create), and payload/tombstone. One device uploads its durable outbox in contiguous sequence order; gaps reject before mutation. This makes cross-device collisions impossible and lets the server compact old idempotency rows into a per-device applied-sequence watermark. The signed request proves possession of that device's private key as defined in §7.4. Clients topologically order a batch: sequential mutations of one entity depend on the prior mutation; an event/reference to an entity created in the batch depends on that create.

- Duplicate `opId` with the same canonical request hash: return the recorded result; never apply twice. The same `opId` with different bytes returns `409 idempotency_mismatch`.
- Append-only kinds: union by entity ID. An existing ID with the same canonical payload hash is a duplicate; different bytes return `409 immutable_id_conflict` and neither version is changed.
- Append-only payloads cannot be edited, but a distinct current-base tombstone operation is allowed for user-deletable `outcome` and unreferenced `export_snapshot` entities. It atomically discards content and emits the content-free deletion marker; it is not compared as a replacement payload. `tuning_op` and `inventory_event` are corrected by new revert/adjust events and cannot be tombstoned individually because removing history would change derived state. An export snapshot referenced by an active preset returns `409 entity_referenced`; after preset deletion, deterministic garbage collection may tombstone it.
- Latest-per-key kinds address the deterministic entity ID/logical key. With the current base version they replace the prior value and receive a new server revision; a stale base returns the current value, after which the client may deliberately reapply. Client timestamps never choose the winner.
- Mutable kinds with current `baseVersion`: apply and increment entity + user revision atomically.
- Mutable updates merge only the validated field mask. A full replacement from a client below the stored entity schema version returns `409 schema_write_unsupported` instead of dropping unknown fields.
- Stale mutable base: return `409 conflict` plus current server entity; do not overwrite.
- Absent entity with `baseVersion > 0`, or any create reusing an ID in `deletion_graveyard`: return `409 deleted_entity`; restoration requires a new entity ID.
- Invalid schema/size/reference: reject that op with a typed error. Every later/transitive op naming it in `dependsOnOpIds` is rejected as `dependency_failed`; independent valid ops may still apply. Cycles, missing dependency IDs, a same-entity sequence without the required dependency, or an in-batch reference without dependency on its create reject the whole malformed batch before mutation.
- A user can never reference another user's entity; foreign IDs resolve as not found.

### 9.4 Conflict UX

- Profile/custom material/export preset: preserve both by creating a local **Conflict copy — <device/date>**, then let the user choose/merge.
- Preference: newest server revision wins; no modal.
- Outcomes/tuning/inventory events: op-union; no conflict modal.
- Spool metadata: field-level merge is deliberately rejected for v1; return a conflict copy/choice to avoid invented combinations.
- Stale edit after a deletion: deletion remains; offer “Restore as a new copy” locally.

Conflict creation is retry-safe. The copy ID is deterministic UUID v5 from `conflict + rejectedOpId`; its local `version`/`baseVersion` are zero, and its new create operation has a deterministically persisted resolution op ID. In one local transaction the client writes the copy, writes its outbox op, records the original op as resolved-to-copy, and only then clears the rejected op. A crash/retry derives the same IDs and cannot create duplicate conflict copies. “Restore as a new copy” uses the same rule from the rejected stale-delete op.

### 9.5 Pull and cursor

Server assigns a monotonic per-user `user_revision` to every accepted entity change. Client persists `lastPulledRevision`, pages until caught up, applies all changes in one local transaction/write boundary, then advances the cursor. Cursor advances only after durable local apply. Every pull response includes `currentRevision` and `minAvailableRevision`; `after < minAvailableRevision` returns typed `410 cursor_expired` and cannot be treated as an empty delta. The client then runs the non-destructive bootstrap/reconciliation defined in §8.4.

### 9.6 Sync triggers

- foreground/app-open after auth;
- 1–3 second debounce after local mutation;
- network-restored;
- manual “Sync now”.

No mandatory background task in v1. Backoff with jitter on failure. Local mutations never block on network.

## 10. Module design

### 10.1 Workshop

- Migrate `3dpa_workshop_v1` into separate profile/outcome/tuning entities.
- Preserve original logical identity and timestamps through the deterministic legacy-ID map in §15.1.
- Store a migration marker and original v1 backup until at least one PDM2 export succeeds.
- Continue emitting/importing v1 backups during a transition window; PDM2 becomes the preferred full-account export.
- Engine personal tuning is injected from locally derived tuning ops exactly as today. Server data never bypasses local engine clamps.

### 10.2 Exports

Do not upload generated slicer files initially. Store:

- an immutable `export_snapshot` containing the canonical configuration state needed for regeneration, content-addressed by its verified RFC-8785/SHA-256 hash;
- an `export_preset`/history record referencing that immutable snapshot rather than a mutable profile;
- slicer and export type;
- engine/data/catalog version;
- export timestamp;
- optional user label/favorite.

Regenerate locally from the stored snapshot body; the hash verifies integrity but is never treated as reconstructable content. If the recorded historical engine/data/catalog version is unavailable, label that honestly and offer current-engine regeneration from the same immutable state. Actual generated-file storage is a later R2-backed feature only if demand proves it.

### 10.3 Filament inventory

Inventory v1 includes:

- spool/product/material/color;
- initial and derived remaining grams/percent;
- active/empty/retired status;
- location and assigned printer/AMS slot labels;
- purchase source/date/price optional;
- drying history, notes, and explicit adjustments;
- manual add, JSON/CSV import/export.

Inventory event invariants are normative:

- `capacityMg` is an integer from 1 through 50,000,000 (50 kg); `deltaMg` is a safe integer whose absolute value is at most 50,000,000; the Worker computes the running total in a checked 64-bit transaction before accepting the event;
- `acquire`: positive `deltaMg`, at most spool capacity;
- `consume`: negative `deltaMg` and cannot make the derived balance negative;
- `adjust`: non-zero signed `deltaMg`, mandatory reason, and resulting balance must remain from zero through capacity;
- `move`, `assign`, `dry`, `retire`, `reactivate`: exactly zero `deltaMg` and their own typed metadata;
- capacity changes are explicit spool metadata edits and cannot move capacity below the current derived balance without a preceding adjustment;
- integer overflow, NaN/fractional internal quantities, negative balance, or over-capacity balance is rejected with a typed error—never silently clamped.

Percent remaining is a presentation derived from `balanceMg / capacityMg`. CSV/import adapters normalize source units to integer milligrams, report rounding, and emit one idempotent `acquire` event per imported spool.

Inventory events are authoritative for remaining amount, status, location, and assignment; the `spool` row holds only descriptive/capacity/purchase metadata. Projections fold events by server `user_revision` (or durable local op sequence before first sync): `move` replaces location, `assign` replaces/clears printer/slot, `retire` sets retired, `acquire`/explicit `reactivate` sets active, and a zero balance projects empty unless a later retire exists. Projection rows are disposable caches updated atomically with event acceptance and always rebuildable from the log. Concurrent moves/retires resolve by accepted server revision and remain visible in history; fixtures cover both arrival orders and offline reconciliation.

CSV export is RFC 4180 encoded and spreadsheet-safe: text cells whose first non-whitespace character is `=`, `+`, `-`, `@`, tab, carriage return, or line feed are prefixed with a visible apostrophe in the CSV representation. JSON export preserves the exact original text. Fixtures cover quoted delimiters/newlines and formula payloads in every user-controlled field; CSV import never evaluates formulas.

Reuse from bambuinventory:

- material/color/product vocabulary and grouping;
- “explicit confirm beats fuzzy auto-enroll” for RFID/AMS matching;
- ambiguity gate: never fabricate identity from color proximity;
- Gmail order parser as an **owner-side import adapter**, not a cloud credential flow;
- tray/slot event concepts and remaining-amount UI;
- optional sensors/local MQTT as later adapters.

Do not reuse:

- PHP endpoints, shared action keys, wildcard CORS, unauthenticated writes;
- Simply.com MySQL as account truth;
- hard-coded user id `1`;
- Bambu LAN/cloud access codes or Gmail OAuth tokens in D1.

Migration adapter sequence:

1. add a read-only, authenticated bambuinventory JSON export or local CLI exporter;
2. map rows to `spool` metadata + one positive, idempotent `acquire` event representing current quantity;
3. dry-run report with skipped/ambiguous rows;
4. user-confirmed import with idempotent source IDs;
5. keep bambuinventory read-only until parity is accepted; no big-bang cutover.

Spoolman interoperability is a later adapter using its documented REST API; it is not the internal data model.

### 10.4 Printers

Saved printers are preference/context entities, not remote-control credentials. A printer can have:

- canonical catalog model ID;
- user label;
- nozzle/default material/location;
- links to inventory assignments;
- future integration capability flags.

Serials and cloud credentials are excluded from account sync until an integration-specific threat model exists.

### 10.5 Future community contribution

W5-style contribution remains opt-in per submission. It exports a minimized review packet, not the user's account/entity graph. Notes, provider UID, device ID, inventory, and timestamps are excluded. This requires its own consent and moderation spec.

## 11. Platform rollout and UI

### 11.1 Web

- Add My 3DPA nav destination without removing Workshop deep links.
- Local PDM2 store can use IndexedDB; keep small boot/config state in localStorage.
- A never-signed-in installation loads Firebase Web Auth only when account UI opens, avoiding weight on the core configurator path. After successful sign-in, persist only a non-sensitive `accountEnabled` boot marker. On later boots that marker lazy-imports the lightweight auth/sync path, restores the Firebase session, and runs the foreground/network sync triggers; sign-out/account deletion clears it. The marker grants no access and contains no UID/token.
- Ship an explicit Content Security Policy allowlist for the production Firebase `authDomain`, Firebase identity/token endpoints, Google provider frame/script endpoints, and Apple authorization endpoint actually observed in staging. Add only the narrow `connect-src`, `frame-src`, `script-src`, and redirect origins required by the pinned SDK/provider flows—never a wildcard or `unsafe-eval` workaround. Automated browser tests run Google and Apple popup/redirect, blocked-origin, and core signed-out flows under the production CSP before rollout.
- Service-worker/offline caching is optional and not required for first sync; current offline behavior remains local storage plus loaded assets.

### 11.2 iOS

- Add Account/My 3DPA surface in SwiftUI, with Sign in with Apple and Google.
- Auth token/session stays in Firebase SDK/keychain-managed storage.
- PDM2 local store uses atomic files or SQLite; do not perform cloud calls inside `EngineService`.
- Bring journal/outcome UI to parity before calling Workshop sync “complete”.
- Account deletion is in-app and links to the web deletion resource.
- Ship as its own release train under the existing iOS push/TestFlight gate.

### 11.3 Android

- Do not modify current native v1 gates silently; accounts/sync remains post-v1 by default.
- Android v1.1 adds Firebase Auth + PDM2 local store + sync client after the local Workshop contract exists.
- If the owner reopens AG0 before code starts, add only architectural seams to v1; do not add the full account program to the launch critical path without re-reviewing schedule and Play testing.
- Google Play deletion/Data Safety requirements become release blockers once account creation exists.

### 11.4 macOS

- “Designed for iPad” inherits iOS account functionality when Apple allows the app on Mac.
- Later native SwiftUI target shares iOS domain/auth/sync packages and adapts only navigation/windowing.
- No macOS-only account backend or schema.

## 12. Monetization packaging

### 12.1 Permanent free promise

Free forever, signed in or out:

- configurator and all current profile modes;
- troubleshooter;
- Workshop local profiles/journal/Mine tuning;
- Bambu/Orca/Prusa export;
- JSON backup/import;
- basic account and Workshop sync;
- manual inventory starter tier.

This respects the ratified MD0 decision and avoids using data portability as coercion.

### 12.2 Phase 1 remains tips

The existing Ko-fi web track and iOS consumable tips stay independent. A tip never changes entitlement. Account creation is not required to tip.

### 12.3 Later one-time Pro

Pro is specified only after inventory v1 has real usage. Recommended initial boundary:

- Free: up to **50 active spools**, manual add/edit, core remaining/location, JSON/CSV import/export, Workshop sync.
- Pro lifetime (target **99 DKK local price point**, revalidated at implementation): unlimited active spools, advanced inventory search/views, QR/label workflows, purchase/order import helpers, drying/usage analytics, multi-location, and future automation adapters.

Do not meter past/empty spool history in a way that forces deletion. The 50-spool limit applies to active inventory only.

For entitlement enforcement, a spool counts as active when `status == active` **or** its derived balance is greater than zero. `empty`/`retired` with zero balance does not count. Retiring a non-empty spool therefore does not bypass the cap; the user must record an explicit consume/adjust event (with disposal/transfer reason) to reach zero. The Worker computes this definition transactionally for create, reactivate, import, and inventory-event operations.

Refund, revocation, expired test entitlement, or an import may leave a free account above 50 active spools. The system never deletes, hides, or stops backing up those records: reading, export, retirement, consumption/adjustment of existing spools, and sync of existing records remain available. While over limit, creating/reactivating a spool and bulk imports that increase the active count are blocked with the exact count and two remedies: retire spools or restore Pro. Metadata edits are allowed. A platform without current store connectivity honors the last server-verified entitlement through a bounded grace period, then applies this same non-destructive over-limit state.

Entitlement is account-level and cross-platform. Apple allows multiplatform services to expose features bought elsewhere when those features are also available as IAP in the app. [App Review Guideline 3.1.3(b)](https://developer.apple.com/app-store/review/guidelines/). Therefore:

- iOS offers the non-consumable via StoreKit;
- Android offers it via Play Billing;
- Worker validates store transactions and writes an entitlement;
- web checkout remains deferred; if added, the same Pro feature must also remain purchasable in-app;
- no client-supplied “isPro” flag is trusted.

The later entitlement gate must use a server-authoritative purchase contract:

- Apple: StoreKit 2 supplies the signed transaction JWS and a per-account `appAccountToken`; the Worker/server component validates the Apple certificate chain/signature, bundle ID, product ID, environment, ownership type, signed date, and revocation status, then reconciles against App Store Server API. An App Store Server Notifications v2 endpoint verifies `signedPayload`, deduplicates `notificationUUID`, and applies refund/revocation events.
- Google: the client sends only the purchase token; the server calls the Google Play Developer API for the exact package/product, validates purchase/acknowledgement/state, and processes verified Real-time Developer Notifications or a scheduled reconciliation for refunds/revocations. Service-account credentials remain server-side.
- On account creation, the server issues and stores a random per-account `appAccountToken`; iOS must present that exact token to StoreKit, and validation verifies the returned token maps to the authenticated Firebase UID before granting or transferring entitlement.
- `purchase_events` stores provider transaction/token hashes for uniqueness plus the provider reconciliation handle encrypted at rest with a dedicated, rotation-capable server key and access limited to the purchase reconciler. Decrypted Apple original transaction IDs / Google purchase tokens are never returned to clients, logs, analytics, or account exports. Retain them only while the entitlement is active plus the documented refund/chargeback reconciliation window, then erase or revalidate the retention basis. Immutable provider event IDs, environment, validation status, and entitlement effect remain content-minimized. Replays are idempotent; sandbox never grants production entitlement; account transfer and family/ownership behavior require explicit fixtures.
- Entitlement is derived from validated purchase events, never written directly by the client or a notification without provider verification.

Every purchase surface includes **Restore Purchases** without requiring a new payment. iOS invokes StoreKit account sync/current entitlements and sends each verified transaction to the server; Android queries current Play purchases and revalidates their tokens. Restore is idempotent, shows pending/complete/error state, refreshes `/entitlements`, and has fixtures for reinstall, new device, provider-account mismatch, revoked/refunded purchase, and temporary store outage. It never grants from local history alone.

### 12.4 Subscription reconsideration trigger

Do not add a subscription merely because accounts exist. Reopen only if measured recurring per-user costs or a genuinely recurring service (large cloud files, compute, monitoring) cannot be funded by tips/lifetime Pro. Record the cost threshold and owner decision then.

## 13. Privacy, security, and abuse controls

### 13.1 Data minimization

- No email in D1.
- No public profile/name required.
- No device fingerprint; device ID is random and account-scoped.
- No printer credentials, Gmail tokens, raw G-code, or model files.
- Notes sync because the user explicitly enables account sync; disclose this clearly.
- Anonymous analytics remains anonymous and separate.

GDPR principles include purpose limitation, minimization, storage limitation, integrity/confidentiality, and accountability. [European Commission summary](https://commission.europa.eu/law/law-topic/data-protection/reform/what-does-general-data-protection-regulation-gdpr-govern_en) and [EDPB privacy by design](https://www.edpb.europa.eu/topics/ai-and-technology/privacy-by-design-and-by-default_en).

The production record of processing and privacy notice must state the purpose/legal-basis map: GDPR Art. 6(1)(b), performance of the user-requested service, for account identity, sync, backup/export, deletion, and entitlement delivery; Art. 6(1)(c) only for purchase/tax records that law requires retaining; and Art. 6(1)(f) for narrowly retained security, abuse, and deletion-operation logs after a documented legitimate-interest assessment and opt-out analysis. Optional product analytics stays separate under its existing consent/ePrivacy analysis and is never reclassified as “contract” merely because the user creates an account. No marketing purpose is introduced. Retention and recipients are recorded per purpose before production GO.

### 13.2 API defenses

- strict origins for browser account endpoints; native clients use bearer auth, not CORS as authentication;
- content-type, method, size, count, and schema validation;
- per-kind payload key allowlists;
- prepared D1 statements only;
- rate limits per verified user and source IP;
- idempotency via `op_id`;
- structured audit counters without payload/notes;
- secrets only in Worker secrets/Firebase configuration appropriate to platform;
- development/staging Firebase project + separate D1 database;
- dependency/SBOM review for auth SDKs and JWT library;
- no Firebase Admin service-account key shipped to clients.

### 13.3 Threat cases that must be tested

- forged/expired/wrong-audience JWT;
- user A requesting user B entity/device/export;
- replayed op/purchase;
- oversized entity/batch and decompression/JSON bombs;
- stale edit after delete;
- account disabled while token remains valid;
- provider-link collision fails before mutation, preserves both accounts, and offers the safe export path;
- local corruption during bootstrap apply;
- deleted device continuing to push;
- malicious custom-material values trying to bypass engine clamps;
- inventory delta overflow/underflow;
- export formula injection in CSV fields;
- account deletion partial failure.

## 14. Operations and observability

### 14.1 Environments

- Firebase: development and production projects.
- D1: local, preview/staging, production EU-jurisdiction DBs.
- Worker feature flags: account API, web auth UI, sync per platform, inventory beta.

Deploy schema-affecting gates in expand/backfill/switch/contract order: add nullable tables/columns and dual-read support; deploy the new writer behind a flag; backfill idempotently with counts/hashes; switch reads; observe at least one stable client release window; only then contract obsolete server fields in a later PR. A rollback may disable the new writer and return to dual-read, but never rolls data back by dropping new fields. Each migration has `up`, compatibility verification, and a non-destructive rollback/forward-fix runbook exercised against a production-shaped staging snapshot.

### 14.2 Metrics (no content)

- auth success/failure by provider/platform;
- active synced accounts (aggregate only);
- push/pull latency and error counts;
- ops applied/duplicate/conflict/rejected by kind;
- payload bytes and D1 row metrics;
- deletion/export completion/failure;
- entitlement verification outcomes later.

Do not send entity names, notes, printer selections, filament colors, or provider UIDs into Analytics Engine.

### 14.3 Backup and recovery

- D1 Time Travel is the short recovery layer.
- Schedule a periodic encrypted D1 export to private R2 only when real account data exists; define retention before enabling.
- Quarterly restore rehearsal against staging.
- User PDM2 export is always available and tested across platforms.
- Disaster-recovery rehearsal restores D1 without the live database, reads the external erasure ledger, proves keyed-locator matches are re-erased, and blocks promotion on any unmatched/incomplete record.
- Keep detailed `sync_ops` results for 30 days or the latest 1,024 ops/device, whichever is larger. Older contiguous rows compact to `devices.last_applied_op_sequence`; a retry at/below that watermark returns `already_applied_pull_required` and cannot mutate, while a sequence gap is rejected. Recent same-sequence/different-hash reuse remains a corruption error. This bounds operational rows without weakening at-most-once application.

### 14.4 Kill switches

- disable new signups;
- put sync writes read-only while preserving pull/export/delete;
- disable one entity kind;
- revoke a device;
- disable store verification/Pro grants without breaking free features.

The configurator/engine must remain available during every backend incident.

## 15. Migration and compatibility

### 15.1 Local v1 → PDM2

1. Detect `3dpa_workshop_v1` / iOS `workshop.json` v1.
2. Parse with existing tolerant readers.
3. Convert profiles, journals, tuning accepts/dismissals into PDM2 entities in memory.
4. For every valid UUID v4 source ID, retain it. For legacy fallback IDs such as `p_<timestamp>_<random>`, derive UUID v5 from the fixed 3dpa legacy namespace plus `kind + sourceId`; rewrite every reference through the same map and record source→target IDs in the migration report. Reject malformed/oversized IDs instead of guessing.
5. Validate rewritten references and prove the mapping is collision-free in the source set.
6. Atomically write PDM2 plus `migrationSourceHash`.
7. Export/retain the untouched v1 backup.
8. Run round-trip fixtures for UUID and fallback IDs web↔Swift↔Kotlin before enabling upload.

Migration is idempotent; rerunning the same source hash creates no duplicate entities.

### 15.2 Account bootstrap

- Verify the platform-specific backup and receipt from §4.3; do not mutate the source store before it succeeds.
- Pull cloud snapshot/cursor first.
- Merge local entities with cloud in a staging store/transaction.
- Present conflict summary.
- Commit staged PDM2 locally while retaining the original store and backup.
- Push remaining local ops.
- Mark sync enabled only after a pull verifies server round-trip; only then schedule transition-backup cleanup under §15.4.

Failure injection is tested after backup write, readback, migration, cloud pull, staged merge, local commit, every partial push result, and verification pull. Before local commit, discard staging. After local commit, restore the verified backup/source store atomically and leave the failed PDM2 store quarantined for diagnostics. Every failure leaves local v1/PDM2 data usable and sync disabled.

### 15.3 Import modes and server versions

Serialized `entity.version`/`baseVersion` is never trusted as authorization state:

- **Signed-out/portable import:** validate content, reset every imported entity to local `version:0`, and create new outbox ops only after future sync opt-in. If an ID collides with different local content, derive a deterministic UUID v5 from `import + manifestHash + kind + sourceId` and rewrite all references; identical canonical content deduplicates.
- **New/different account import:** apply the same reset. Bootstrap checks server active IDs and graveyard membership; collisions are deterministically remapped as above, never sent as `baseVersion > 0` creates.
- **Same-account restore:** permitted only from a server-signed account export whose opaque account-scope claim verifies for the currently reauthenticated UID. Pull current server state first and reconcile by ID/content; serialized versions are hints for conflict reporting, while current D1 versions control mutations.

The import report names resets, deduplications, remaps, and rewritten references. Fixtures cover signed-out backup, cross-account portability, same-account restore, graveyard collision, and malicious forged high versions.

ID remapping is a graph transaction, not a single-record edit. Build the complete old→new map first; atomically rewrite entity IDs, every schema-declared reference in staged entities, every pending outbox operation's target/reference payload, and any conflict-resolution metadata; then revalidate schemas, hashes, dependency graph, and operation sequence before commit. A reference that cannot be rewritten quarantines the entire connected outbox component with an exportable diagnostic—never silently drops it or uploads a stale ID. Required fixtures include a remapped spool create followed by multiple inventory events and an export preset/snapshot chain.

### 15.4 Compatibility window

- Keep v1 Workshop backup import/export for at least two stable app release trains after PDM2 ships on every active platform.
- PDM2 readers preserve unknown additive fields losslessly and ignore unknown entity kinds for presentation, but reject unsupported major versions. Writers use field-mask mutations and never serialize a lossy full replacement over a newer entity schema.
- An unsupported future major version aborts import/bootstrap before mutation, preserves the raw artifact/staging data for export, disables sync writes, and shows **Update required to use this account data**. The signed-out configurator and last compatible local store remain usable read-only/local-first; the client never silently skips future-major entities or crashes through partial decoding.
- Shared downgrade fixtures prove that a newer client can add a field, an older client can edit a known field, and the newer field survives unchanged.
- Engine state continues to serialize through `StateCodec` / `AppStateWebCodec`; PDM2 does not fork that vocabulary.
- The API publishes `minReadSchema`, `maxReadSchema`, and `minWriteSchema` per entity. It supports the current and previous two released entity schema versions for reads; a client below `minWriteSchema` remains local/read/export capable but receives `426 client_upgrade_required` for that entity kind instead of risking lossy writes.
- Local migrations are forward-only and retain the verified prior store. Installing an older app never downgrades/destructively rewrites PDM2; downgrade fixtures prove it can preserve or quarantine unknown data and continue the signed-out core safely.
- A PR is “independently revertible” only when its feature-off path and prior Worker/client versions have passed fixtures against the post-migration database/local store. Feature flags alone are insufficient evidence.

## 16. Acceptance criteria

The platform design is implemented only when:

1. Signed-out configurator, Workshop, Mine, backup, and export behave byte/value-identically to baseline.
2. A web-created PDM2 account export imports on iOS and later Android with fixture equality for every supported entity.
3. Offline mutations survive app restarts and sync exactly once when network returns.
4. Concurrent append-only ops union without loss.
5. Concurrent mutable edits never silently overwrite; conflict copy/choice is visible.
6. Deletions reach offline devices via tombstones and stale edits cannot silently resurrect data.
7. First sign-in with local data creates a backup and can roll back from every failure injection point.
8. Cross-user access tests fail closed.
9. In-app and web account deletion remove access immediately and complete domain/auth deletion with recorded status.
10. Anonymous analytics remains free of user/session/device identity.
11. Account/sync outage cannot prevent local engine initialization or profile generation.
12. Inventory remaining amount is event-derived and bambuinventory import is idempotent with an ambiguity report.
13. Store entitlements, when built, are server-verified and cross-platform without trusting clients.
14. Every gate ships in an independently revertible PR with its named review and QA evidence.

## 17. Data/logic-change evaluation

This design introduces account/domain/sync logic but does **not** change engine profile logic or canonical `data/` in the first program.

| Change | Web impact | iOS impact | Android impact | Engine/data mirror |
|---|---|---|---|---|
| PDM2/local migration | IndexedDB/local adapter + My 3DPA UI | local store adapter + migration | v1.1 adapter | None |
| Auth/account | Firebase Web UI + account routes | Firebase SDK + Apple/Google UI | post-v1 SDK/UI | None |
| Sync | Worker API + web client | iOS sync client | post-v1 client | None |
| Workshop entity split | UI reads derived local repository | journal parity + repository | post-v1 | Engine tuning injection unchanged |
| Inventory | new local/account module | later native module | later native module | Custom-material engine hook remains its own reviewed W4 train |
| Export library | local metadata/history UI | same | same | Export generation remains local/current engine |

If custom materials, new tuning fields, or printer-integration data later alter `engine.js`/canonical data, the normal web-master → byte-mirror → walkthrough/XCTest/Android fixture gate applies in a separate PR train.

## 18. Backlog additions and ordering

### Now — account foundation program

- PDM2 schema + migration fixtures.
- Firebase Auth spike and decision confirmation.
- D1 EU database + authenticated account API.
- Account export/deletion and privacy-policy/App Privacy/Data Safety updates.
- Workshop-only sync beta on web, then iOS.
- My 3DPA overview/status UI.

### Next — inventory program

- local inventory foundation and PDM2 entities;
- bambuinventory read-only export/import adapter;
- inventory sync;
- iOS inventory surface;
- usage/drying history;
- one-time Pro entitlement design/verification.

### Later

- Android v1.1 My 3DPA sync;
- native macOS shared sync package;
- QR/label workflows;
- Spoolman import/export adapter;
- optional local printer bridge for automatic consumption/history;
- custom materials W4 completion;
- explicit community contribution W5;
- export file storage only if demand proves it;
- public sharing/community features only under a new moderation/privacy spec.

### Explicitly not backlog candidates

- mandatory accounts;
- remote control/camera cloud;
- cloud slicer;
- model/G-code library;
- subscription by default;
- team/farm administration before a distinct business case.

## 19. Owner decision gates

These decisions must be explicit before implementation mutates external services:

1. Confirm Firebase Auth + Cloudflare D1 as the provider split.
2. Confirm Apple + Google only for initial providers (no email/password in v1).
3. Confirm basic Workshop sync is free and account-optional.
4. Confirm Android v1 remains unblocked/account-free; sync is v1.1 by default.
5. Confirm inventory free boundary only when inventory product detail is specified; 50 active spools / 99 DKK lifetime is a recommendation, not a silently locked price.
6. Before creating production Firebase/D1 resources or processing user data: approve the provider split; execute/accept the current Google Cloud/Firebase and Cloudflare DPAs; confirm the applicable EU Standard Contractual Clauses and transfer-risk measures cover Firebase Authentication's US processing and Cloudflare recovery copies; record agreement versions/effective dates; and approve the matching privacy, App Privacy, and Play Data Safety disclosures. This is an evidence-recorded GO gate, not a launch-day checkbox.

No owner decision is needed to continue local docs/planning/review work in this session.
