# 2026-07-11 — 3dpa Accounts Platform: optional accounts, profile hub, cloud sync, filament inventory (design spec)

**Status:** DRAFT (pending sub-agent + QA + cross-model review; owner ratifies §3 decisions before any implementation).
**Scope:** design only. The executable gated plan lives at `../plans/2026-07-11-accounts-platform-plan.md`.
**Owner intent (§2-style explicit statement):** Musti wants 3dpa packaged as a complete product: user accounts, a profile ("My 3dpa") page, cloud sync, and filament inventory (reusing as much as possible from `bambuinventory`), on top of the existing configurator + Workshop + export. Audience is 3dpa's existing hobbyist/pro users; the owner remains a solo hobbyist developer — operational simplicity is a first-class requirement, not a nice-to-have. This spec deliberately **supersedes** the "no accounts / no backend" non-goal in `docs/3dpa-context.md` and MD3 of the monetization plan — see APD11 for how that supersession is bounded.

---

## 1. As-is analysis (verified 2026-07-11 against live `main` @ `0e8e405`)

### 1.1 Surfaces

| Surface | Status | Stack |
|---|---|---|
| Web | Live (3dprintassistant.com) | Vanilla JS (`app.js` UI, `engine.js` logic), Cloudflare Workers + Assets |
| iOS | v1.0.4 live on the App Store; newer builds (1.0.5–1.0.7) in TestFlight/acceptance states; the 1.0.7 issue-fix train is in flight (web half merged 2026-07-11) — **ROADMAP is truth for release state** | SwiftUI + JavaScriptCore (byte-identical `engine.js` + `data/`) |
| Android | Planned, gated on owner AG0 (native Kotlin/Compose, QuickJS) | — |
| macOS | Assessed light companion, sequenced after Android | — |

### 1.2 Feature inventory (all free, live)

- **Configurator** — printer × material × nozzle × goals × environment; Safe / Tuned / Mine profile tiers; provenance sidecars.
- **Workshop** — saved profiles, print journal (web), accepted-tuning ledger feeding the Mine tier, **JSON backup format that is byte-compatible across web and iOS**, with an op-log tuning ledger and fork-lossless op-union merge on import.
- **Export** — native Bambu Studio JSON + OrcaSlicer JSON + PrusaSlicer `.ini` (Phases 2–4 all merged + live 2026-07-11), with recorded owner import gates; copy-text everywhere else.
- **Troubleshooter**, **share URLs** (mine→safe mapping), **session persistence** (`3dpa_state_v1`).
- **Anonymous analytics** (Workers + Analytics Engine; no user/session/device IDs — a hard rule today).
- **Feedback → Discord Worker**, **printer-intake automation**, **remote iOS printer overlay** (versioned content payloads).

### 1.3 Storage & backend today

- All user data is **device-local**: web `localStorage` (`3dpa_state_v1` + Workshop store), iOS app state + `WorkshopStore`. The only cross-device path is manual JSON backup export/import.
- Server side is stateless Workers: `functions/api/feedback.js`, `analytics.js`, `analytics-query.js`; KV for printer intake; static assets. **No database, no user records.**
- `engine.js` runs entirely client-side (browser / JSCore). Standing rule: engine and `app.js` never merge; web is master, iOS mirrors bytes.

### 1.4 bambuinventory as-is (reuse assessment)

Single-user PHP + MySQL app on Simply.com (`api.php`, `app.js` ~2.3k LoC) with Gmail order intake (LaunchAgent + Python), Bambu P1S MQTT daemon (AMS live slots), eWeLink humidity sensors, two-band RGB color matcher with ambiguity gate, spool-card UI with product images.

| Piece | Reusable for 3dpa? | How |
|---|---|---|
| Spool data model (material, variant, color name+hex, weight, price, order refs, status) | ✅ Yes | Port field set to a 3dpa-native JSON schema (adapted, not copied — drop Bambu-order-specific fields to optional) |
| Color-matcher heuristics + ambiguity gate | ✅ Yes (later phase) | Straight JS port when AMS/RFID-adjacent features arrive; not needed for manual v1 |
| Spool-card UI patterns (CSS spool, dual swatch, grouped cards) | ✅ Yes | Re-implement in 3dpa's design system (dark/light, EN+DA) |
| PHP/MySQL stack, `api.php` | ❌ No | 3dpa is Cloudflare-native; different trust model (multi-user) |
| Gmail intake, MQTT daemon, eWeLink sensors | ❌ Not in v1 | Personal single-user infra; keep running in bambuinventory. A one-time "import from bambuinventory JSON" is the cheap bridge (backlog) |

### 1.5 Constraints this design must respect

1. **MD0 (monetization plan):** everything currently shipped stays free, forever. No retro-paywalls.
2. **Engine purity:** no server-side profile generation; `engine.js` stays client-side and byte-mirrored.
3. **Analytics anonymity:** account identifiers must never enter analytics payloads.
4. **Apple rules:** 4.8 (a login service meeting Apple's privacy bar — SiwA qualifies — must be offered alongside third-party login; current wording is "equivalent privacy option", satisfied here by offering SiwA first-class), 5.1.1(v) (in-app account deletion required, incl. SiwA token revocation), 3.1.1 (IAP for digital unlocks — relevant to Phase-2 Pro, not this spec).
5. **iOS push gate + release trains:** iOS account work is its own train, after 1.0.7 (and after the 1.0.8 tip-jar train unless the owner re-sequences).
6. **Solo-dev ops budget:** any backend introduced must be near-zero maintenance, near-zero cost at hobby scale, and have a kill-switch that degrades to today's local-only behavior.
7. **GDPR:** owner is DK-based; EU users; data minimization + self-serve export/delete are table stakes.

---

## 2. Goals / non-goals

**Goals (v1 of the platform):**

- G-A: **Optional** user accounts (web + iOS) — sign in adds value; signed-out experience remains 100% of today's feature set.
- G-B: **Cloud sync** of Workshop data (saved profiles, journal, accepted tuning) across devices/platforms.
- G-C: **Filament inventory** as a first-class 3dpa feature (local-first, synced when signed in), integrated with the configurator (in-stock hints) and journal (spool references).
- G-D: **"My 3dpa" profile page** — account, sync status, Workshop/inventory summaries, data export, account deletion.
- G-E: **Foundation for Phase-2 "3dpa Pro"** (stable user ids + migration rail + the APD13 decision record — no entitlement schema in v1 per APD10) and for Android/macOS to join the same account later.

**Non-goals (v1):**

- Community/social features (public profile pages, shared profile browsing) — backlog #015/#022 remain separate.
- Server-side profile generation or any engine logic on the server.
- Mandatory accounts for anything shipped today, or for inventory/local Workshop usage.
- Email marketing, newsletters, or any outbound email beyond auth (v1 has no email sending at all — see APD2).
- Web-Pro licensing / payments (Phase-2 spec territory; MD2).
- Replacing bambuinventory's personal automation (Gmail/MQTT/sensors) — it keeps running for the owner; 3dpa inventory is the product-grade sibling.
- Realtime collaborative sync (sync is coarse-grained, last-merge-wins via client-side merge).

---

## 3. Decisions (APD0–APD12) — owner ratifies before build

- **APD0 — Local-first, accounts optional, forever.** Every feature works signed-out with device-local storage exactly as today. Signing in adds: cross-device sync, cloud backup, profile page, future Pro entitlement portability. This extends MD0's trust promise and preserves the privacy stance that is part of 3dpa's identity ("free, no account required" becomes the copy, replacing "no accounts").
- **APD1 — Backend is Cloudflare-native: Workers + D1.** New endpoints live in the existing web repo under `functions/api/` (same deploy pipeline, same repo review flow). Note: `worker.js` statically imports and dispatches every endpoint (its own comment forbids prefix-matching) — AP1 adds a **router module with an exact method+path table** that `worker.js` dispatches into; every later API gate registers its routes there; unknown paths under `/api/v1/` return JSON 404/405 (never fall through to Assets); endpoint tests exercise `worker.fetch` end-to-end, not bare handlers. D1 (SQLite) holds users, sessions, sync documents, inventory documents, entitlements. KV is not used for user data (D1 gives transactions + relational integrity). No new vendor, ~zero cost at hobby scale (D1 free tier ≫ expected load), and the owner already operates Workers in this repo. R2/Durable Objects are explicitly not needed in v1.
- **APD2 — Auth v1 = Sign in with Apple + Google OAuth. Email magic-link deferred.** Both providers on both platforms (Apple 4.8 satisfied). No passwords, ever (prohibited-by-design: no credential storage, no reset flows). Magic-link/OTP requires an email-sending dependency — deferred to backlog (candidate: Cloudflare Email Service) so v1 ships with zero email infrastructure. Passkeys are a post-v1 enhancement on top of the same user record.
- **APD3 — Sessions: short-lived JWT access token (≤1h) + rotating refresh token (revocable, stored hashed in D1).** Web: httpOnly Secure SameSite=Lax cookies. iOS: Keychain. Refresh rotation with reuse detection (stolen-token family revocation). Signing key = Worker secret; `kid` header for rotation.
- **APD4 — Sync v1 = versioned-document sync; merge is client-side; the merge layer is mostly NEW code.** The server stores a schema-validated, size-capped (256 KB v1) JSON document per user per doc-type with a monotonically increasing integer version. Protocol: `GET /api/v1/sync/:doc` (returns doc + version) and `PUT /api/v1/sync/:doc` with `If-Match: <version>` (409 on mismatch → client pulls, merges locally, re-pushes). No server-side merging, no server knowledge of Workshop semantics — the server is a dumb versioned store.
  **Honest reuse audit (verified against shipped code):** the shipped Workshop import merge (`workshop-store.js` / iOS `WorkshopStore`) provides **only** (a) the byte-compatible backup format and (b) op-union for the tuning ledger. Its profile handling is *incoming-wins-wholesale on id collision* (no timestamp comparison; journal records are nested inside profiles and get replaced with the profile) and it has **no tombstone/deletion tracking**. That machinery, used as-is, loses data in the basic two-device conflict (device A adds a journal outcome while device B renames the same profile). Therefore sync v1 requires a **new client-side merge layer on both platforms**: **per-field deterministic revision ordering — NOT wall-clock LWW and NOT whole-record resolution** (each synced record carries a per-field rev map `revs: {field: {counter, device_id}}` — Lamport-style counters bumped past the highest seen, `device_id` as total-order tiebreak; merge takes each field from its highest rev, so disjoint concurrent edits — e.g. one device edits a spool's `notes` while another updates `weight_g_remaining_est` — both survive; wall clocks are display-only, so a fast-clock device can never permanently shadow later edits and equal-revision conflicts resolve identically in both merge directions), **journal-record union within a profile** (journal entries merge by entry id, not replaced with the parent profile), tuning op-union (reused), and a **local deletion ledger** (`{id, kind, deleted_at, rev}` recorded at every `remove()`-class call, additive to the local store) that feeds envelope tombstones. Merge-layer test contract (shared JSON fixtures, same cases on web Node tests and iOS XCTests, hard gate): clock-skew, equal-revision tiebreak, order-reversal (merge(A,B) == merge(B,A)), associativity, idempotence, rename-vs-journal-append, **disjoint-field concurrent edits both survive**, resurrection. **Forward compatibility:** clients must preserve unknown fields losslessly (merge structurally on raw JSON; iOS keeps raw JSON alongside typed models — never decode→re-encode through lossy Codable structs), and the envelope carries `schema_version` + `min_reader`; a client below `min_reader` pauses push with an "update the app to keep syncing" state instead of silently down-converting. This is the single largest new client component in the platform; the plan sizes P3/P5 and the iOS I2 sub-gate accordingly.
- **APD5 — Filament inventory is a new app-layer module, local-first, synced as its own document.** Web: new `inventory.js` module (UI in `app.js` orbit; engine.js untouched). iOS: new `InventoryStore` + SwiftUI surfaces mirroring the same JSON schema (schema shared as a fixture, like the Workshop backup format). Data model ported from bambuinventory (full field audit, not a lossy collapse): `{id, material_id, material_display, variant, product_code?, format(spool|refill), color_name, color_hex, vendor, weight_g_initial, weight_g_remaining_est, remaining_pct?, price, currency, purchase_date, order_ref?, location?, in_use(bool), defect?(text), source(manual|import), status(active|archived|empty), notes, created_at, revs}` — **`material_id` is the stable 3dpa material id from the `materials.json` vocabulary** (that is what "in stock" matching keys on; `material_display` holds free text for unmapped imports, which never match-badge). The AP7 gate validates the schema against a **fixture exported from the real bambuinventory `api.php`** so the port is proven against actual data, not assumed. v1 entry is manual CRUD + quick-add presets from the vocabulary. Deferred: Bambu order import, AMS/RFID live state, humidity (backlog; bambuinventory JSON import is the bridge — `source:'import'` + `order_ref` exist so the bridge is lossless).
- **APD6 — Inventory ↔ configurator integration is app-layer only in v1.** Material picker shows an "in stock" badge when the selected material family matches an active spool; the print journal can attach a spool reference; the output page can show a one-line "you have N matching spools". `engine.js` and `data/*.json` are **untouched** in v1 (standing data/logic-change evaluation: no engine/data change → no byte-mirror implications; both platforms need app-layer UI work, listed in the plan). Any future engine-aware inventory logic (e.g. remaining-weight vs estimated print usage) is a recorded seed, not v1.
- **APD7 — "My 3dpa" profile hub.** Web: a new in-app view following the Workshop surface pattern (not a separate static page — keeps SPA state + i18n machinery). iOS: new screen reachable from Settings + tab-bar-adjacent entry point (final placement is a UI-session decision). Contents v1: account identity (provider, display name optional), sync status per doc (last synced, version), Workshop summary (counts), inventory summary (spool counts by material), **data export — labeled "cloud account export"** (single JSON of everything the server holds: user row, identities sans tokens, sync docs; it can NOT contain never-synced/`local`-namespace/over-cap device data — for that the UI points at the existing local Workshop backup export, which remains the full-device path), **delete account (in-app, immediate, cascades all server data)**, sign out. Pro status placeholder appears only in Phase 2.
- **APD8 — Privacy & GDPR posture.** Store the minimum: provider subject id, email (needed for account identity + dedupe across providers), optional display name, timestamps. No IP retention beyond Cloudflare's default logs; no analytics linkage (account ids never sent to Analytics Engine — existing anonymity rule is unchanged); no marketing use of email. GDPR self-serve: export (APD7) + deletion (APD7, hard delete of D1 rows). **The live `privacy.html` today explicitly asserts that name/email/User ID are NOT collected — accounts falsify those sentences, so AP9 rewrites the collection sections (and the GDPR notice), it does not merely append an accounts paragraph.** iOS App Privacy label update (the app's first) declares: **Name** (optional display name), **Email address**, **User ID**, and **Other User Content** (synced Workshop/inventory documents) — all linked to identity, for app functionality, none used for tracking. D1 created with **`--jurisdiction=eu`** — an actual residency guarantee (a `weur` location *hint* is latency-only and guarantees nothing); Cloudflare is the processor; owner accepts standard DPA.
- **APD9 — Rollout order: web first (feature-flagged), then iOS as its own release train, then Android/macOS inherit.** Web ships dark (endpoints live, UI behind a flag) → owner smoke-tests → flag on for all. iOS account train follows after 1.0.7 (and 1.0.8 tip jar, unless owner re-sequences) — suggested version **1.1.0** (feature-tier bump; owner picks final number at train start). The Android AG-plan gets one seed line (account client + Play Billing entitlement room), no gated-bundle rework.
- **APD10 — Entitlements are Phase-2's design, not v1 schema.** v1 creates **no** entitlements table (a half-designed slot lacking revocation/status/transaction-identity would not actually prevent a later migration — the migration system from AP1 makes adding it cheap when Phase-2 Pro specs it properly). What v1 guarantees Phase 2: stable `user_id`s, the migration rail, and the APD13 decision record. Tips (Phase-1 monetization) remain account-less consumables — no linkage.
- **APD11 — Supersession is bounded and staged.** MD3 ("no accounts / no backend") is superseded by this spec **when the owner ratifies APD0–APD15**; `docs/3dpa-context.md`'s "User accounts NOT in scope" + "no cross-device sync" non-goals are updated **only when the first account code merges** (G1 in the plan), so context files never lead reality. The monetization plan itself is not edited — its MD3 line gets one cross-reference note in the same G1 PR.
- **APD12 — API surface, abuse posture.** All new endpoints under `/api/v1/` (existing feedback/analytics endpoints are untouched; they stay unversioned). CORS locked to `https://3dprintassistant.com` + app origins; native clients authenticate purely via Bearer tokens (no cookies). Rate limits are **in-Worker via rate-limit bindings** (Free-plan WAF offers only a single IP-keyed rule, so WAF is not the mechanism): pre-auth endpoints keyed by IP, authenticated endpoints keyed by user id; limits configured in `wrangler.toml`, 429 paths tested. Turnstile on the web OAuth-start endpoint is **deferred** unless abuse appears (OAuth providers are the bot barrier in v1). Payload caps: sync docs 256 KB, inventory 128 KB, request bodies rejected above cap with a clear client-side "your data exceeds sync size" surface (local data untouched).
- **APD13 — Monetization Phase-2 anchor: explicit owner decision required (AP0 blocker).** MD2 (ratified 2026-07-11) anchors the "3dpa Pro" one-time unlock on **filament inventory** and lists **cloud sync** as a Pro candidate. This spec ships inventory (free, local-first) and cloud sync — and MD0 forbids retro-paywalling anything once shipped free. Shipping both free would silently gut Phase 2's entire monetizable surface, irreversibly. The owner must pick ONE before any build:

  | Option | Shape | Consequence |
  |---|---|---|
  | (a) Everything free | Inventory + sync free; Pro retires the MD2 anchor list and re-anchors on **future** modules (W4 custom-filament cloud library, fleet views, AMS/RFID, cost analytics) | Max adoption + simplest build; Phase-2 revenue deferred and dependent on unbuilt features |
  | **(b) Sync = Pro (recommended)** | Inventory local-first **free**; **cloud sync + multi-device is the "3dpa Pro" one-time unlock** (~49–99 kr, MD2 pricing) | Honest value story (cloud costs real money; sync never shipped free so MD0 untouched); inventory still drives adoption; consequence: public sync launch (AP9) is coupled to Phase-2 Pro purchase rails (iOS IAP first; web users buy on iOS — web-native payment stays deferred per MD3) |
  | (c) Inventory = Pro | Inventory behind the unlock | Weakest option: kills inventory adoption, contradicts the local-first free posture of this spec, and web has no payment rail |
  | (d) Free tier + caps | Sync/inventory free up to N profiles/spools; Pro lifts caps | Meterable but adds permanent complexity (cap enforcement on both platforms) and community-goodwill risk |

  Recommendation: **(b)**. Whatever the pick, it is recorded as an MD2 amendment note in the monetization plan in the same PR that ratifies it. Until the owner decides, gates AP4+ (everything sync-dependent) are design-final but build-blocked; AP1–AP3 and AP7 (inventory local) are unaffected under every option.
- **APD14 — Local-data policy at sign-in / sign-out / account-switch (shared devices): replica namespaces, not a boolean.** Local storage is partitioned into **replica namespaces**: one `local` (anonymous) namespace plus one namespace per account that has ever signed in on the device (a `local_only` flag cannot distinguish "anonymous", "owned by A", and "hidden from B" — namespaces can). Rules: (1) the UI always shows exactly one active namespace — the signed-in account's, else `local`. (2) **First sign-in of account X on a device with non-empty `local` data** shows a one-time choice: "Merge this device's data into your account" (records copy `local`→X with fresh revs; `local` namespace is then emptied into X) vs "Start clean (keep this device's existing data separate)" (`local` data stays put, invisible while X is active, offered again only from `local`). **Account-scoped namespaces are never offered for merging into a different account.** (3) **Sign-out immediately switches the active namespace to `local`** — account X's namespace stays stored on the device but is hidden and inactive until X signs in again (a signed-out family member must never see X's Workshop/inventory); if a *different* account Y then signs in, X's namespace remains hidden, is never merged into Y, and Y gets rule 2 against `local` only. Test: signed-out UI shows only `local` data. (4) Deletion ledgers/tombstones are per-namespace and never cross namespaces. (5) **Account deletion** asks one local question: "Remove this account's data from this device too?" — "keep" converts namespace X's records into the `local` namespace (fresh ids/revs, so a later re-created account cannot resurrect server-side state from them). Required tests: A→sign-out→B→sign-out→A round-trip isolation; delete→re-auth yields an empty account; tombstones never cross namespaces. This closes the family-iPad data-bleed, cross-account tombstone-deletion, and delete-then-reupload scenarios.
- **APD15 — Terms + age posture (v1-light).** Accounts add a short ToS section to the existing legal page (service provided as-is, hobby project, data handling per privacy policy, termination = self-serve deletion) — owner reviews the draft at AP0. Age: account sign-up copy + policy state accounts require **age 13+** (Denmark's GDPR digital-consent age; the app is not child-directed and collects only email/name via OAuth). No age verification mechanism in v1 (statement + no-child-direction is the proportionate posture at this scale).

---

## 4. Architecture

### 4.1 Components

```
Browser (app.js + auth.js + sync.js + inventory.js)      iOS (AccountService + SyncService + InventoryStore)
        │  httpOnly cookie session                                │  Bearer JWT (Keychain)
        ▼                                                         ▼
Cloudflare Workers  /api/v1/auth/*  /api/v1/sync/:doc  /api/v1/account/*
        │
        ▼
      D1 (users, oauth_identities, refresh_tokens, auth_codes, devices, sync_docs, revocation_outbox)  +  KV (deletion log)
```

### 4.2 D1 schema (v1)

Schema changes ship as **checked-in numbered SQL migrations** applied with `wrangler d1 migrations apply` (production + preview/local bindings; **deploy-order gate: migrations apply before the code that needs them deploys**). Runtime code never mutates schema — no `CREATE TABLE IF NOT EXISTS` in request handling. Endpoint tests run against a real local D1 (wrangler/miniflare harness — introduced in AP1; the repo's existing Worker tests are plain mocks, so this harness is new work).

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- uuid v4
  email TEXT UNIQUE,                -- normalized lowercase; NULLABLE (Apple returns email only on first auth); SQLite UNIQUE permits multiple NULLs
  display_name TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE oauth_identities (
  provider TEXT NOT NULL CHECK (provider IN ('apple','google')),
  subject TEXT NOT NULL,            -- provider 'sub'
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,                       -- as asserted by provider at link time
  email_verified INTEGER NOT NULL DEFAULT 0,
  provider_refresh_token TEXT,      -- Apple only; encrypted (Worker secret); needed for /auth/revoke on deletion
  created_at INTEGER NOT NULL,
  PRIMARY KEY (provider, subject)
);
CREATE TABLE auth_codes (           -- one-time intermediate codes for native clients (see §4.3)
  id TEXT PRIMARY KEY,              -- random 128-bit, stored hashed
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client TEXT NOT NULL CHECK (client IN ('ios','android','macos')),
  pkce_challenge TEXT NOT NULL,     -- S256 challenge from the app (RFC 8252)
  redirect_target TEXT NOT NULL,    -- bound custom-scheme redirect
  expires_at INTEGER NOT NULL,      -- now + 120s
  consumed_at INTEGER
);
CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,              -- token id (jti); token value never stored raw
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,         -- SHA-256
  family_id TEXT NOT NULL,          -- rotation family for reuse detection
  replaced_by TEXT,                 -- successor jti (grace-window idempotency)
  grace_response TEXT,              -- AEAD-sealed successor response, purged after the 30s grace (a hash cannot be replayed back to the client)
  expires_at INTEGER NOT NULL,
  rotated_at INTEGER,
  revoked_at INTEGER,
  client TEXT NOT NULL CHECK (client IN ('web','ios','android','macos'))
);
CREATE TABLE revocation_outbox (    -- provider revocations that must survive account deletion (see §4.3)
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  encrypted_token TEXT NOT NULL,    -- AEAD; the only surviving copy after the cascade
  created_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);                                  -- retried opportunistically; >30 days old -> owner runbook manual fallback
CREATE TABLE devices (              -- tombstone-compaction acks (see §4.4); NOT a tracking surface
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,          -- client-generated uuid; no hardware identifiers
  doc_type TEXT NOT NULL,
  acked_version INTEGER NOT NULL DEFAULT 0,
  last_seen_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, device_id, doc_type)
);
CREATE TABLE sync_docs (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('workshop','inventory')),  -- additive: future doc types (e.g. settings) need their own decision + cap
  version INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL,               -- JSON, schema-validated at write
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, doc_type)
);
-- deletion log: lives in KV, NOT in D1 (a D1 Time-Travel restore would overwrite
-- the very journal needed to replay deletions). KV key `del:<sha256(user_id)>`,
-- value = deleted_at, TTL 90 days; disclosed in the privacy policy.
-- entitlements: DELIBERATELY NOT CREATED in v1. Phase-2 Pro owns that design
-- (revocation/status, transaction identity, source uniqueness) and ships it as
-- its own numbered migration. Reserving a half-designed table here would not
-- prevent a migration and would pretend a design that doesn't exist yet.
```

### 4.3 Auth flows

- **Web:** `GET /api/v1/auth/:provider/start` sets a short-lived pre-auth cookie (`__Host-3dpa_preauth`, httpOnly, Secure, **SameSite=None**, Max-Age 600 — None is required because Apple's `form_post` callback is a cross-site POST that would drop a Lax cookie) carrying `state` + hashed `nonce` (+ PKCE verifier for Google) → provider consent → callback (`GET` Google / `POST` Apple) validates `state` against the pre-auth cookie, verifies the `id_token` against the provider JWKS (cached by `kid`), upserts `oauth_identities`/`users` → sets session cookies (httpOnly, Secure, **SameSite=Lax** — session cookies stay Lax; only the pre-auth cookie is None) → redirects to a **fixed same-origin path** (`/#account`; no caller-supplied return URL — closes the open-redirect class).
- **Identity linking:** identities link to an existing user by email **only when the provider asserts the email is verified** (`email_verified` claim); otherwise a distinct user is created (unverified-email auto-linking is an account-takeover vector). Apple private-relay emails create distinct users by design; the profile page shows which provider is linked.
- **Apple web prerequisites (real owner + impl work, in AP0/AP2):** Services ID, domain verification file, and an **ES256 client-secret JWT minted per code-exchange from the `.p8` key** (key in Worker secrets). The Apple code exchange returns an Apple `refresh_token` — **stored (encrypted with a Worker secret) on the identity row** because account deletion must call Apple's `/auth/revoke` (mandatory for SiwA apps offering account deletion; also resets Apple's email-release behavior so a returning user counts as a first authorization).
- **Apple email caveat:** Apple returns email **only on first authorization** → `users.email` is nullable; account identity falls back to per-identity data. All email-based dedupe is skipped when the token carries no verified email.
- **Native (iOS, later Android):** Apple = native `ASAuthorizationController` (token audience = **bundle id**; requires the Services ID to be associated with the primary App ID). The app sends **both** the `id_token` AND Apple's `authorizationCode` to `POST /api/v1/auth/token`; the server **exchanges the authorization code** (client id = bundle id for native, Services ID for web) to obtain the Apple `refresh_token` — without this exchange the revoke-on-deletion flow has nothing to revoke. Google = `ASWebAuthenticationSession` against the same web `/start` endpoint with `client=ios` — Google forbids custom-scheme redirects on web clients, so the Worker callback completes the Google exchange itself, then mints a **one-time intermediate code** and 302s to the app's custom scheme; the app exchanges it at `POST /api/v1/auth/token`. **Intermediate codes are PKCE-bound per RFC 8252** (`auth_codes` stores the app-generated S256 challenge + client + redirect target; the exchange requires the matching verifier), so an intercepted code is useless. The callback is therefore **dual-mode**: `client=web` → cookies + redirect; `client=ios` → intermediate-code redirect. `POST /api/v1/auth/token` validates **both Apple audiences** (bundle id native, Services ID web).
- **Refresh:** `POST /api/v1/auth/refresh` rotates with a **30-second reuse-grace window**: within the grace, replaying the immediately-prior token idempotently returns the same successor (two tabs / a retried request must not nuke the session); reuse outside the grace, or of any older-generation token, revokes the family. Web tabs coordinate refreshes single-flight (Web Locks with a localStorage-lock fallback). Cookies are `__Host-`-prefixed (`Path=/`, no `Domain`, Secure). **Keys:** JWT signing and provider-token encryption use **separate versioned keyrings** (Worker secrets, `kid`-selected; old keys retained for verify/decrypt until rotation completes); provider refresh tokens are AEAD-encrypted (AES-256-GCM, random nonce per value). `POST /api/v1/auth/logout` revokes.
- **Deletion:** `DELETE /api/v1/account` (authenticated) runs one **atomic child-first D1 batch**: (1) copy the encrypted Apple refresh token into `revocation_outbox` (when an Apple identity exists — the cascade would otherwise destroy the only credential the mandatory revoke needs), (2) delete identities, refresh tokens, auth_codes, devices, sync docs, then the `users` row (all FKs also declare `ON DELETE CASCADE` as belt-and-braces — D1 enforces foreign keys, so child-first ordering is mandatory, not stylistic), (3) append the KV deletion log entry. Apple `/auth/revoke` is then attempted from the outbox — success deletes the outbox row; failure leaves it for opportunistic retry (piggybacked on later requests) with a 30-day owner-runbook manual fallback. The user-facing deletion is complete at the batch; revocation is an independent, retryable follow-through. `requireAuth` treats a JWT whose user row no longer exists as unauthenticated. iOS surfaces deletion per 5.1.1(v). **Kill-switch carve-out:** `ACCOUNTS_API_ENABLED=false` disables sign-up/sign-in/sync but `DELETE /api/v1/account`, `GET /api/v1/account/export`, and `logout` stay reachable — GDPR rights survive the kill switch.

### 4.4 Sync protocol (per doc_type)

1. Client mutates locally (exactly as today — local store is always authoritative for the UI).
2. Debounced push: `PUT /api/v1/sync/workshop` `If-Match: v` with full doc. Server: version==v ? store v+1 : 409 with current doc.
3. On 409: client merges the server doc into local using the **APD4 merge layer** (per-field rev ordering; journal-record union; tuning op-union; tombstone application), then re-pushes with the new version.
4. Pull on app start / sign-in / foreground (iOS) with the same merge path.
5. Sync failures are silent-degrade: UI shows "last synced" state on the profile page; nothing blocks local usage.

**Deletions & tombstones:** deletions in synced docs are tombstoned (`{id, kind, deleted_at, rev, since_version}` — `since_version` is the server doc version that introduced the tombstone, making "acked past it" well-defined). Detection requires the **local deletion ledger from APD4** — an additive extension to the local stores on both platforms (every delete path records a ledger entry). **Compaction is acknowledgment-based, not time-based:** acks are explicit and post-apply — after a client has *durably applied* a pulled doc it acks that version (piggybacked on its next request via an `X-Applied-Version` header, or a bare `POST /api/v1/sync/:doc/ack`); a GET alone never advances acks. The server keeps the `devices` registry (per-doc `acked_version`) and returns `safe_compact_through = min(acked_version over active devices)` on every GET/PUT; **the pushing client performs compaction** — it may drop tombstones with `since_version ≤ safe_compact_through`. Devices idle > 180 days are auto-retired (excluded from the min); **the server rejects a PUT from a device whose `acked_version` is below the doc's oldest retained tombstone `since_version` with a 409-forced full pull** (retirement enforcement, not honor-system). Tests: premature-GET-no-ack, retired-device push rejection, compaction only at `safe_compact_through`. **Accepted residual risk (documented):** a device offline > 180 days can resurrect records deleted after its last sync — surfaced as a "this device was away a long time; review restored items" notice rather than silent re-add. The shipped backup *export* format stays byte-compatible with existing user exports; the sync envelope is `{format: '3dpa-sync-v1', schema_version, min_reader, payload: <backup format>, deletions: [...]}` — the envelope wraps the backup format, but the local store gains the (additive) deletion ledger; claiming "local store unchanged" would be false and is not claimed.

**Write concurrency (server + client):** the version check is a **single atomic conditional statement** (`UPDATE sync_docs SET body=?, version=version+1, updated_at=? WHERE user_id=? AND doc_type=? AND version=?` — success iff exactly 1 row changed; first-write uses `INSERT ... ON CONFLICT DO NOTHING` + the conditional update), never read-then-write; two genuinely concurrent PUTs must yield exactly one 200 and one 409 (test). Client side runs a **single-flight sync coordinator** with a dirty-generation counter: mutations landing while a push is in flight bump the generation, and a completed push only clears dirty state for the generation it snapshotted — so an edit during upload is never lost as "clean".

### 4.5 Failure modes & kill switch

- Any 5xx/timeout on sync → local-only mode, retry with backoff, badge on profile page. No data loss possible (server never authoritative).
- **Two flags** (one flag cannot express the dark launch): `ACCOUNTS_API_ENABLED` (Worker env; off ⇒ all `/api/v1` endpoints return 503 — this is the **kill switch**) and `ACCOUNTS_UI_ENABLED` (Worker env, surfaced to clients via `GET /api/v1/auth/status` → `{api, ui}`; off ⇒ clients hide all account UI). Dark launch = API on, UI off. Both off = today's behavior, byte-for-byte.
- D1 outage: same degrade. Recovery: **D1 Time Travel** point-in-time restore is primary — **7 days on Workers Free, 30 on Paid; AP0 records which plan the account is on** and the runbook states the actual window. **Restore procedure must re-apply deletions**: account deletions append a **KV** deletion-log entry (`del:<sha256(user_id)>` → deleted_at, 90-day TTL, hashed id only, disclosed in the policy — KV specifically because a D1 Time-Travel restore overwrites D1 in place and would erase a D1-resident journal) and any restore replays deletions logged after the restore point before traffic resumes. A quarterly `wrangler d1 export` (encrypted at rest, 90-day retention, disclosed) is belt-and-braces.

---

## 5. UX surfaces (v1)

- **Web:** header gains a small account button (signed-out: "Sign in"; signed-in: avatar/initial → menu: My 3dpa, Sync now, Sign out). New in-app **My 3dpa** view (Workshop-pattern). Sign-in modal with two provider buttons + one privacy sentence + link to policy. EN+DA from day 1.
- **iOS:** Settings gains an Account section (sign in / manage). **My 3dpa** screen (account, sync status, summaries, export data, delete account). Sign in with Apple button per HIG; Google via ASWebAuthenticationSession.
- **Inventory:** new "Filament" surface (web view + iOS screen): spool cards (adapted bambuinventory pattern: color swatch, material, vendor, remaining estimate), add/edit/archive; filter by material family; "in stock" badge appears in the configurator material picker when signed-in OR local inventory exists (inventory works signed-out too — local-first).
- **Copy rule:** every account touchpoint repeats the promise: "3dpa works fully without an account. An account only adds sync + backup." (EN+DA).

---

## 6. Phasing (maps to the gated plan's AP-gates; the plan is finer-grained)

| Phase | Content | Platform |
|---|---|---|
| P0 | Owner ratification (APD0–APD12) + provider/app registrations + privacy-policy draft | owner |
| P1 | Backend foundation: D1 schema + auth endpoints + tests (dark, flag off) | Web repo (Workers) |
| P2 | Web auth UI + session plumbing (flag-gated) | Web |
| P3 | Sync v1 (workshop doc) + profile-page shell w/ sync status | Web |
| P4 | Inventory v1 local-first (CRUD + cards + picker badge) — ships value even signed-out | Web |
| P5 | Inventory sync + journal spool-refs + My 3dpa completion (export/delete) + flag ON + policy live | Web |
| P6 | iOS account train (auth + sync + My 3dpa + inventory), own MARKETING_VERSION | iOS |
| P7 | Context/doc supersession finalization + Android AG-plan seed note + backlog grooming | docs |

P4 is deliberately sequenced so inventory lands as a **free local feature first** (MD0-consistent; also de-risks: inventory UX is validated before sync complexity touches it).

---

## 7. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Solo-dev operational burden (auth is a liability surface) | HIGH | No passwords; two OAuth providers only; managed platform (CF); kill switch; rate limits; small API surface; runbook + monthly D1 export |
| Scope creep into community/Pro features | MED | Non-goals §2; Phase 2 gets only stable user ids + the migration rail (APD10) |
| Apple review friction (account deletion, SiwA) | MED | APD7 in-app deletion; SiwA first-class; account optional = review-friendly |
| Sync data corruption / resurrection bugs | MED-HIGH | The merge layer is NEW code — mitigated by deterministic revs, shared cross-platform fixture suite (skew/commutativity/associativity/idempotence/resurrection), ack-based tombstone compaction, atomic versioned writes, server never merges, 256 KB cap |
| GDPR complaint / data request | LOW-MED | Self-serve export + delete; minimal data; documented processor chain |
| Analytics anonymity regression | MED | Explicit test: no account id in any analytics payload; review-gate check item |
| iOS push-gate / train collisions (1.0.7, 1.0.8 in flight) | MED | P6 is strictly after those trains; web phases don't touch iOS |
| bambuinventory divergence (owner's personal tool vs product inventory) | LOW | Explicit non-goal; import bridge on backlog |

---

## 8. Acceptance criteria (platform v1 = P1–P5 live on web + P6 on the App Store)

1. Signed-out web + iOS behave byte-for-byte as today (feature-flag-off path proven; no engine/data diff in P1–P5 — golden/walkthrough proof per PR).
2. A user can sign in with Apple or Google on web and iOS, and the same account syncs Workshop + inventory across both.
3. Conflict scenario (two devices editing offline) converges without data loss via the **new** client-side merge layer (APD4); shared cross-platform fixtures cover: profile rename vs journal-append conflict, per-field rev ordering (incl. disjoint-field concurrent edits), journal-record union, resurrection (tombstone/deletion ledger), and op-union tuning cases — same fixtures run on web (Node) and iOS (XCTest).
4. My 3dpa page: cloud-account export produces the complete server-held JSON (labeled as such, local backup export still available for device data); delete (incl. Apple token revocation) removes all server rows — verified by a test that re-auth after delete creates a fresh empty account; export/delete/logout remain reachable with the kill switch on.
5. Analytics payloads contain no account identifiers (assertion test).
6. Privacy policy updated; iOS App Privacy label updated; App Review passes with account-optional flow.
7. All new Workers covered by tests in the existing `functions/api/*.test.mjs` pattern; walkthrough harness + golden snapshots prove engine/data untouched through P5.

## 9. New backlog candidates surfaced by this design (added to ROADMAP backlog)

- Email magic-link auth (needs email provider — Cloudflare Email Service candidate) + passkeys.
- bambuinventory → 3dpa inventory one-time import (JSON export bridge).
- AMS/RFID-aware inventory (port color matcher + ambiguity gate); low-stock notifications.
- Cost-per-print estimates (spool price × estimated usage) — first engine-adjacent inventory feature (needs data/logic evaluation then).
- Filament drying tracker (journal-adjacent).
- Community profile sharing on accounts rails (#015/#022 successor).
- Hosted engine API (engine-as-a-service for third parties) — accounts rails make API keys feasible.
- Cross-platform Pro entitlement (Phase-2 monetization spec, MD2).
