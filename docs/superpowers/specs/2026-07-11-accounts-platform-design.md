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
| iOS | v1.0.4 live; 1.0.5 TestFlight; 1.0.7 train in flight (mac-mini) | SwiftUI + JavaScriptCore (byte-identical `engine.js` + `data/`) |
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
4. **Apple rules:** 4.8 (Sign in with Apple required if third-party login offered), 5.1.1(v) (in-app account deletion required), 3.1.1 (IAP for digital unlocks — relevant to Phase-2 Pro, not this spec).
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
- G-E: **Foundation for Phase-2 "3dpa Pro"** (entitlements table + account plumbing) and for Android/macOS to join the same account later.

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
- **APD1 — Backend is Cloudflare-native: Workers + D1.** New endpoints live in the existing web repo under `functions/api/` (same deploy pipeline, same repo review flow). D1 (SQLite) holds users, sessions, sync documents, inventory documents, entitlements. KV is not used for user data (D1 gives transactions + relational integrity). No new vendor, ~zero cost at hobby scale (D1 free tier ≫ expected load), and the owner already operates Workers in this repo. R2/Durable Objects are explicitly not needed in v1.
- **APD2 — Auth v1 = Sign in with Apple + Google OAuth. Email magic-link deferred.** Both providers on both platforms (Apple 4.8 satisfied). No passwords, ever (prohibited-by-design: no credential storage, no reset flows). Magic-link/OTP requires an email-sending dependency — deferred to backlog (candidate: Cloudflare Email Service) so v1 ships with zero email infrastructure. Passkeys are a post-v1 enhancement on top of the same user record.
- **APD3 — Sessions: short-lived JWT access token (≤1h) + rotating refresh token (revocable, stored hashed in D1).** Web: httpOnly Secure SameSite=Lax cookies. iOS: Keychain. Refresh rotation with reuse detection (stolen-token family revocation). Signing key = Worker secret; `kid` header for rotation.
- **APD4 — Sync v1 = versioned-document sync; merge is client-side; the merge layer is mostly NEW code.** The server stores a schema-validated, size-capped (256 KB v1) JSON document per user per doc-type with a monotonically increasing integer version. Protocol: `GET /api/v1/sync/:doc` (returns doc + version) and `PUT /api/v1/sync/:doc` with `If-Match: <version>` (409 on mismatch → client pulls, merges locally, re-pushes). No server-side merging, no server knowledge of Workshop semantics — the server is a dumb versioned store.
  **Honest reuse audit (verified against shipped code):** the shipped Workshop import merge (`workshop-store.js` / iOS `WorkshopStore`) provides **only** (a) the byte-compatible backup format and (b) op-union for the tuning ledger. Its profile handling is *incoming-wins-wholesale on id collision* (no timestamp comparison; journal records are nested inside profiles and get replaced with the profile) and it has **no tombstone/deletion tracking**. That machinery, used as-is, loses data in the basic two-device conflict (device A adds a journal outcome while device B renames the same profile). Therefore sync v1 requires a **new client-side merge layer on both platforms**: per-record last-write-wins keyed on `updated` timestamps for saved profiles, **journal-record union within a profile** (journal entries merge by entry id, not replaced with the parent profile), tuning op-union (reused), and a **local deletion ledger** (`{id, kind, deleted_at}` recorded at every `remove()`-class call, additive to the local store, compacted after 90 days) that feeds envelope tombstones. This is the single largest new client component in the platform; the plan sizes P3/P5 and the iOS I2 sub-gate accordingly, and the cross-platform merge tests (shared JSON fixtures, same cases on web and iOS) are a hard gate.
- **APD5 — Filament inventory is a new app-layer module, local-first, synced as its own document.** Web: new `inventory.js` module (UI in `app.js` orbit; engine.js untouched). iOS: new `InventoryStore` + SwiftUI surfaces mirroring the same JSON schema (schema shared as a fixture, like the Workshop backup format). Data model ported from bambuinventory: `{id, material_type, variant, color_name, color_hex, vendor, weight_g_initial, weight_g_remaining_est, price, currency, purchase_date, status(active|archived|empty), notes, created_at, updated_at, tombstone?}`. v1 entry is manual CRUD + quick-add presets from 3dpa's own `materials.json` vocabulary. Deferred: Bambu order import, AMS/RFID live state, humidity (backlog; bambuinventory JSON import is the bridge).
- **APD6 — Inventory ↔ configurator integration is app-layer only in v1.** Material picker shows an "in stock" badge when the selected material family matches an active spool; the print journal can attach a spool reference; the output page can show a one-line "you have N matching spools". `engine.js` and `data/*.json` are **untouched** in v1 (standing data/logic-change evaluation: no engine/data change → no byte-mirror implications; both platforms need app-layer UI work, listed in the plan). Any future engine-aware inventory logic (e.g. remaining-weight vs estimated print usage) is a recorded seed, not v1.
- **APD7 — "My 3dpa" profile hub.** Web: a new in-app view following the Workshop surface pattern (not a separate static page — keeps SPA state + i18n machinery). iOS: new screen reachable from Settings + tab-bar-adjacent entry point (final placement is a UI-session decision). Contents v1: account identity (provider, display name optional), sync status per doc (last synced, version), Workshop summary (counts), inventory summary (spool counts by material), **data export (single JSON download of everything)**, **delete account (in-app, immediate, cascades all server data)**, sign out. Pro status placeholder appears only in Phase 2.
- **APD8 — Privacy & GDPR posture.** Store the minimum: provider subject id, email (needed for account identity + dedupe across providers), optional display name, timestamps. No IP retention beyond Cloudflare's default logs; no analytics linkage (account ids never sent to Analytics Engine — existing anonymity rule is unchanged); no marketing use of email. GDPR self-serve: export (APD7) + deletion (APD7, hard delete of D1 rows). Privacy policy gets an accounts section (web + iOS App Privacy label update — iOS's first label change: "Email address, linked to identity, for app functionality"). D1 primary location hint WEUR (Cloudflare is the processor; owner accepts standard DPA).
- **APD9 — Rollout order: web first (feature-flagged), then iOS as its own release train, then Android/macOS inherit.** Web ships dark (endpoints live, UI behind a flag) → owner smoke-tests → flag on for all. iOS account train follows after 1.0.7 (and 1.0.8 tip jar, unless owner re-sequences) — suggested version **1.1.0** (feature-tier bump; owner picks final number at train start). The Android AG-plan gets one seed line (account client + Play Billing entitlement room), no gated-bundle rework.
- **APD10 — Entitlements table exists from day 1, empty.** `entitlements(user_id, product, source, granted_at)` — written by nothing in v1. Phase-2 Pro (MD2) will decide App Store receipt validation vs manual grants; that design is explicitly out of scope here but the schema slot prevents a migration later. Tips (Phase-1 monetization) remain account-less consumables — no linkage.
- **APD11 — Supersession is bounded and staged.** MD3 ("no accounts / no backend") is superseded by this spec **when the owner ratifies APD0–APD12**; `docs/3dpa-context.md`'s "User accounts NOT in scope" + "no cross-device sync" non-goals are updated **only when the first account code merges** (G1 in the plan), so context files never lead reality. The monetization plan itself is not edited — its MD3 line gets one cross-reference note in the same G1 PR.
- **APD12 — API surface, abuse posture.** All new endpoints under `/api/v1/` (existing feedback/analytics endpoints are untouched; they stay unversioned). CORS locked to `https://3dprintassistant.com` + app origins; native clients authenticate purely via Bearer tokens (no cookies). Rate limits via Cloudflare rules (auth endpoints tight, sync endpoints per-user). Turnstile on the web OAuth-start endpoint is **deferred** unless abuse appears (OAuth providers are the bot barrier in v1). Payload caps: sync docs 256 KB, inventory 128 KB, request bodies rejected above cap with a clear client-side "your data exceeds sync size" surface (local data untouched).
- **APD13 — Monetization Phase-2 anchor: explicit owner decision required (AP0 blocker).** MD2 (ratified 2026-07-11) anchors the "3dpa Pro" one-time unlock on **filament inventory** and lists **cloud sync** as a Pro candidate. This spec ships inventory (free, local-first) and cloud sync — and MD0 forbids retro-paywalling anything once shipped free. Shipping both free would silently gut Phase 2's entire monetizable surface, irreversibly. The owner must pick ONE before any build:

  | Option | Shape | Consequence |
  |---|---|---|
  | (a) Everything free | Inventory + sync free; Pro retires the MD2 anchor list and re-anchors on **future** modules (W4 custom-filament cloud library, fleet views, AMS/RFID, cost analytics) | Max adoption + simplest build; Phase-2 revenue deferred and dependent on unbuilt features |
  | **(b) Sync = Pro (recommended)** | Inventory local-first **free**; **cloud sync + multi-device is the "3dpa Pro" one-time unlock** (~49–99 kr, MD2 pricing) | Honest value story (cloud costs real money; sync never shipped free so MD0 untouched); inventory still drives adoption; consequence: public sync launch (AP9) is coupled to Phase-2 Pro purchase rails (iOS IAP first; web users buy on iOS — web-native payment stays deferred per MD3) |
  | (c) Inventory = Pro | Inventory behind the unlock | Weakest option: kills inventory adoption, contradicts the local-first free posture of this spec, and web has no payment rail |
  | (d) Free tier + caps | Sync/inventory free up to N profiles/spools; Pro lifts caps | Meterable but adds permanent complexity (cap enforcement on both platforms) and community-goodwill risk |

  Recommendation: **(b)**. Whatever the pick, it is recorded as an MD2 amendment note in the monetization plan in the same PR that ratifies it. Until the owner decides, gates AP4+ (everything sync-dependent) are design-final but build-blocked; AP1–AP3 and AP7 (inventory local) are unaffected under every option.

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
      D1 (users, oauth_identities, refresh_tokens, sync_docs, entitlements)
```

### 4.2 D1 schema (v1)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- uuid v4
  email TEXT NOT NULL UNIQUE,       -- normalized lowercase
  display_name TEXT,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER                -- soft-delete tombstone; hard purge job optional later
);
CREATE TABLE oauth_identities (
  provider TEXT NOT NULL CHECK (provider IN ('apple','google')),
  subject TEXT NOT NULL,            -- provider 'sub'
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (provider, subject)
);
CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,              -- token id (jti); token value never stored raw
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,         -- SHA-256
  family_id TEXT NOT NULL,          -- rotation family for reuse detection
  expires_at INTEGER NOT NULL,
  rotated_at INTEGER,
  revoked_at INTEGER,
  client TEXT NOT NULL CHECK (client IN ('web','ios','android','macos'))
);
CREATE TABLE sync_docs (
  user_id TEXT NOT NULL REFERENCES users(id),
  doc_type TEXT NOT NULL CHECK (doc_type IN ('workshop','inventory','settings')),
  version INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL,               -- JSON, schema-validated at write
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, doc_type)
);
CREATE TABLE entitlements (
  user_id TEXT NOT NULL REFERENCES users(id),
  product TEXT NOT NULL,
  source TEXT NOT NULL,
  granted_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, product)
);
```

### 4.3 Auth flows

- **Web:** `GET /api/v1/auth/:provider/start` → provider consent → `GET /api/v1/auth/:provider/callback` (PKCE for Google; form_post for Apple) → upsert `oauth_identities`/`users` (dedupe by verified email: same email across providers = same user; Apple private-relay emails create distinct users by design and the profile page shows which provider is linked) → set cookies → redirect back. State + nonce validated; Apple `id_token` verified against Apple JWKS, Google against Google JWKS.
- **iOS:** native `ASAuthorizationController` (Apple) / Google Sign-In SDK **decision: avoid the Google SDK dependency — use ASWebAuthenticationSession against the same web OAuth endpoints with a custom-scheme redirect**, exchange `code` at `POST /api/v1/auth/token` → JWT + refresh token (Keychain).
- **Refresh:** `POST /api/v1/auth/refresh` rotates; reuse of a rotated token revokes the family. `POST /api/v1/auth/logout` revokes.
- **Deletion:** `DELETE /api/v1/account` (authenticated) → immediate cascade delete of all rows for the user (identities, tokens, docs, entitlements) + `users` row hard-deleted after cascade (soft-delete window not needed for v1 hobby scale; simpler = safer). iOS surfaces this per 5.1.1(v).

### 4.4 Sync protocol (per doc_type)

1. Client mutates locally (exactly as today — local store is always authoritative for the UI).
2. Debounced push: `PUT /api/v1/sync/workshop` `If-Match: v` with full doc. Server: version==v ? store v+1 : 409 with current doc.
3. On 409: client merges the server doc into local using the existing backup-import merge (op-union for tuning ledger; id-union for saved profiles/journal/spools with `updated_at` last-write-wins per record; deletions carried as `tombstone` records to prevent resurrection), then re-pushes with the new version.
4. Pull on app start / sign-in / foreground (iOS) with the same merge path.
5. Sync failures are silent-degrade: UI shows "last synced" state on the profile page; nothing blocks local usage.

**Deletions & tombstones:** deletions in synced docs are tombstoned (`{id, kind, deleted_at}`) so a stale device can't resurrect deleted records; tombstones compact after 90 days. Detection requires the **local deletion ledger from APD4** — an additive extension to the local stores on both platforms (every delete path records a ledger entry). The shipped backup *export* format stays byte-compatible with existing user exports; the sync envelope is `{format: '3dpa-sync-v1', payload: <backup format>, deletions: [...]}` — the envelope wraps the backup format, but the local store gains the (additive) deletion ledger; claiming "local store unchanged" would be false and is not claimed.

### 4.5 Failure modes & kill switch

- Any 5xx/timeout on sync → local-only mode, retry with backoff, badge on profile page. No data loss possible (server never authoritative).
- Feature flag `ACCOUNTS_ENABLED` (Worker env + client flag): off = endpoints return 503, client hides all account UI, app behaves exactly as today. This is the kill switch and the dark-launch mechanism.
- D1 outage: same degrade. Backup: scheduled D1 export (wrangler d1 export) — owner runbook item, monthly.

---

## 5. UX surfaces (v1)

- **Web:** header gains a small account button (signed-out: "Sign in"; signed-in: avatar/initial → menu: My 3dpa, Sync now, Sign out). New in-app **My 3dpa** view (Workshop-pattern). Sign-in modal with two provider buttons + one privacy sentence + link to policy. EN+DA from day 1.
- **iOS:** Settings gains an Account section (sign in / manage). **My 3dpa** screen (account, sync status, summaries, export data, delete account). Sign in with Apple button per HIG; Google via ASWebAuthenticationSession.
- **Inventory:** new "Filament" surface (web view + iOS screen): spool cards (adapted bambuinventory pattern: color swatch, material, vendor, remaining estimate), add/edit/archive; filter by material family; "in stock" badge appears in the configurator material picker when signed-in OR local inventory exists (inventory works signed-out too — local-first).
- **Copy rule:** every account touchpoint repeats the promise: "3dpa works fully without an account. An account only adds sync + backup." (EN+DA).

---

## 6. Phasing (maps 1:1 to the gated plan)

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
| Scope creep into community/Pro features | MED | Non-goals §2; entitlements table is the only Phase-2 concession |
| Apple review friction (account deletion, SiwA) | MED | APD7 in-app deletion; SiwA first-class; account optional = review-friendly |
| Sync data corruption / resurrection bugs | MED | Client-side merge reuses shipped, tested machinery; tombstones; versioned optimistic concurrency; server never merges; 256 KB cap |
| GDPR complaint / data request | LOW-MED | Self-serve export + delete; minimal data; documented processor chain |
| Analytics anonymity regression | MED | Explicit test: no account id in any analytics payload; review-gate check item |
| iOS push-gate / train collisions (1.0.7, 1.0.8 in flight) | MED | P6 is strictly after those trains; web phases don't touch iOS |
| bambuinventory divergence (owner's personal tool vs product inventory) | LOW | Explicit non-goal; import bridge on backlog |

---

## 8. Acceptance criteria (platform v1 = P1–P5 live on web + P6 on the App Store)

1. Signed-out web + iOS behave byte-for-byte as today (feature-flag-off path proven; no engine/data diff in P1–P5 — golden/walkthrough proof per PR).
2. A user can sign in with Apple or Google on web and iOS, and the same account syncs Workshop + inventory across both.
3. Conflict scenario (two devices editing offline) converges without data loss via the **new** client-side merge layer (APD4); shared cross-platform fixtures cover: profile rename vs journal-append conflict, per-record LWW, journal-record union, resurrection (tombstone/deletion ledger), and op-union tuning cases — same fixtures run on web (Node) and iOS (XCTest).
4. My 3dpa page: export produces a complete JSON; delete removes all server rows (verified by a test that re-auth after delete creates a fresh empty account).
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
