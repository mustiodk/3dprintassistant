# 2026-07-11 — 3dpa Accounts Platform: gated implementation plan

**Status:** DRAFT (pending sub-agent + QA + cross-model review; execution gated on owner AP0 ratification).
**Design source:** [`../specs/2026-07-11-accounts-platform-design.md`](../specs/2026-07-11-accounts-platform-design.md) (APD0–APD12).
**Shape:** small gates, one branch + one PR per gate, review gate before every merge. Each web gate is independently shippable and flag-safe (`ACCOUNTS_ENABLED` off = today's behavior). iOS is one release train with internal sub-gates under the push gate.

**Standing-rule evaluation (mandatory):** Gates AP1–AP9 touch **no `engine.js` and no `data/*.json`** — every web PR must include walkthrough-harness + golden-snapshot proof of zero engine/data diff. Web/iOS impact: both platforms gain app-layer UI (auth, profile hub, inventory, sync); no byte-mirror implications until AP10 copies nothing (engine untouched) — AP10 mirrors only the shared JSON schema fixtures. The first engine-adjacent inventory feature (cost-per-print) is backlog, not this plan.

---

## Gate table (overview)

| Gate | Content | Repo | PR | Review gate before merge |
|---|---|---|---|---|
| AP0 | Owner ratification + registrations | — | — | owner |
| AP1 | D1 + auth foundation (dark) | web | PR-a | sub-agent |
| AP2 | OAuth endpoints (Apple+Google) | web | PR-b | sub-agent + cross-model (security) |
| AP3 | Web auth UI (flag-gated) | web | PR-c | sub-agent |
| AP4 | Sync endpoints | web | PR-d | sub-agent + cross-model (protocol) |
| AP5 | Web sync client + merge | web | PR-e | sub-agent + cross-model (merge/data-loss) |
| AP6 | My 3dpa view shell | web | PR-f | sub-agent |
| AP7 | Inventory v1 (local-first) | web | PR-g | sub-agent |
| AP8 | Inventory sync + journal spool refs | web | PR-h | sub-agent |
| AP9 | Export/delete + privacy + flag ON + live verify | web | PR-i | sub-agent + cross-model (privacy/deletion) |
| AP10 | iOS account train (sub-gates I1–I6) | iOS | one push at TestFlight-ready | per-sub-gate sub-agent + cross-model before push |
| AP11 | Docs/ROADMAP/Android-seed closeout | web | PR-j | sub-agent (light) |

Estimated envelope: AP1–AP9 ≈ 7–9 focused sessions; AP10 ≈ 4–6 sessions (mac-mini); AP11 ≈ half session. One gate per session by default.

---

## AP0 — Owner gate (no code)

1. Ratify APD0–APD12 (reply GO or override per decision).
2. Registrations (owner, ~1–2h total, days of lead time for Apple):
   - Apple Developer: create a **Services ID** for web Sign in with Apple + key (`.p8`) — store in Worker secrets, never in repo (md-hygiene checklist already guards `AuthKey*`).
   - Google Cloud Console: OAuth client (web) + authorized redirect `https://3dprintassistant.com/api/v1/auth/google/callback`; a second client for iOS custom-scheme flow if needed.
   - Confirm D1 availability on the Cloudflare account; owner runs nothing — AP1 creates the DB via wrangler, but billing plan visibility is owner's.
3. Approve the privacy-policy delta draft (AP9 publishes it).
4. Sequencing decision: confirm AP10 runs after the 1.0.7 and 1.0.8 trains, and pick the AP10 version number (suggest 1.1.0).

**Exit:** written GO in the session log / ROADMAP row.

## AP1 — Backend foundation (dark)

Branch `accounts/ap1-foundation`. Files:

- `wrangler.toml`: `[[d1_databases]]` binding `ACCOUNTS_DB`; `ACCOUNTS_ENABLED` var (default `"false"`).
- `functions/api/v1/_lib/db.js` — D1 helpers + migration runner (idempotent `CREATE TABLE IF NOT EXISTS`, schema from spec §4.2; **additive-only migrations rule** recorded at top of file).
- `functions/api/v1/_lib/tokens.js` — JWT (WebCrypto HS256 v1, `kid` support), refresh-token hash/rotation helpers.
- `functions/api/v1/_lib/guard.js` — `requireEnabled` (503 when flag off), `requireAuth` (Bearer/cookie → user), rate-limit headers passthrough.
- Tests `functions/api/v1/foundation.test.mjs` following the existing `functions/api/*.test.mjs` pattern (run: `node --test functions/api/v1/*.test.mjs`): token round-trip, rotation-reuse revokes family, flag-off returns 503, migration idempotency (miniflare/`better-sqlite3` in-memory stand-in consistent with existing test approach — match whatever `analytics.test.mjs` uses).
- `docs/3dpa-context.md`: update the two non-goal lines per APD11 (accounts now optional-by-design; cloud sync exists as optional; engine purity unchanged) + one cross-ref note added to the monetization plan MD3 line.

**Gates before merge:** tests green; `node scripts/walkthrough-harness.js` clean; golden snapshot NO DRIFT; `wrangler deploy` dry-run/preview OK; sub-agent review; **live verify after merge:** `curl https://3dprintassistant.com/api/v1/auth/status` → 503 (flag off) — proves dark.
**Rollback:** revert PR (no data yet).

## AP2 — OAuth endpoints

Branch `accounts/ap2-oauth`. Files: `functions/api/v1/auth/[provider]/start.js`, `.../callback.js`, `functions/api/v1/auth/token.js` (native code exchange), `refresh.js`, `logout.js`, `status.js`.

- Google: PKCE + `state`; Apple: `response_mode=form_post` + `state`/nonce; both `id_token`s verified against provider JWKS (cached in Worker cache API, keyed by `kid`).
- User upsert per spec §4.3 (email-dedupe rule; Apple private-relay note honored).
- Cookies: httpOnly Secure; **callback CSRF note:** SameSite=Lax cookies + `state` param double-check (Apple form_post is a cross-site POST — session cookie set only in our callback response, `state` validated against a short-lived `__Host-` pre-auth cookie set at `/start` with SameSite=None).
- Tests: state mismatch → 400; JWKS `kid` rotation; email dedupe (google then apple with same email → one user); relay email → distinct user; refresh reuse → family revoked; logout revokes.

**Gates:** tests green; sub-agent review; **cross-model review (security lens) — patch until no P0–P2**; walkthrough/golden clean; merge; still dark (flag off).
**Rollback:** revert PR; D1 rows additive only.

## AP3 — Web auth UI (flag-gated)

Branch `accounts/ap3-web-auth-ui`. Files: `auth.js` (new module, Workshop-module pattern), `index.html` (header button container), `style.css`, `locales/en.json` + `locales/da.json` (sign-in modal, promise copy per spec §5), `app.js` (mount point only — keep auth logic in `auth.js`).

- Client flag: bootstrap `GET /api/v1/auth/status` → 503 ⇒ hide all account UI (no layout shift).
- Sign-in modal: Apple + Google buttons, privacy sentence, policy link. Signed-in: header initial + menu (My 3dpa placeholder, Sign out).
- Tests: Node UI-logic tests where the project pattern allows; manual browser smoke on preview; walkthrough/golden clean.

**Gates:** sub-agent review; merge. Flag stays off in prod (owner can smoke-test with a local flag override query param — dev-only, documented in the PR).

## AP4 — Sync endpoints

Branch `accounts/ap4-sync-api`. Files: `functions/api/v1/sync/[doc].js` (GET/PUT), `functions/api/v1/_lib/sync-schema.js` (envelope validation: doc_type allowlist, size caps 256 KB/128 KB, JSON shape check — **no Workshop semantics server-side**).

- PUT requires `If-Match` integer version; mismatch → 409 + current doc; success → version+1 returned.
- Tests: happy path, 409 flow, cap rejection (413), auth required (401), flag off (503), per-user isolation (user A cannot read B).

**Gates:** tests; sub-agent review; **cross-model (protocol lens) until no P0–P2**; merge (dark).

## AP5 — Web sync client + merge

Branch `accounts/ap5-sync-client`. Files: `sync.js` (new module): debounced push (5s after local mutation), pull on load/sign-in, 409 → merge → re-push loop (bounded, 3 attempts then surface "sync conflict — will retry"), sync envelope `{format: '3dpa-sync-v1', payload: <existing backup format>, tombstones: [...]}` — **the shipped backup format is embedded unchanged** (byte-compat contract stays; assertion test pins it against a real fixture backup).

- Merge: reuse the existing Workshop import merge (op-union tuning, id-union + `updated_at` LWW for profiles/journal) + tombstone application; 90-day tombstone compaction on push.
- Tests (Node, `scripts/` or module-level like existing web tests): two-device conflict converges; deletion does not resurrect; tuning op-union preserved; envelope fixture byte-pin; cap-exceeded → local-only badge state.

**Gates:** tests; sub-agent review; **cross-model (merge/data-loss lens) until no P0–P2**; walkthrough/golden clean; merge (dark).

## AP6 — My 3dpa view shell

Branch `accounts/ap6-profile-shell`. Files: `app.js`/`profile.js` view (Workshop surface pattern), strings EN+DA.
Contents: identity, per-doc sync status ("last synced HH:MM · v12"), Workshop counts, Sign out. Export/delete arrive in AP9 (buttons hidden until then).
**Gates:** sub-agent review; walkthrough/golden clean; merge.

## AP7 — Inventory v1 (local-first — ships user value even with accounts dark)

Branch `accounts/ap7-inventory-local`. Files: `inventory.js` (store + CRUD + rendering), `index.html` nav entry, `style.css` (spool-card pattern adapted from bambuinventory: swatch circle, material/vendor/remaining), locales EN+DA.

- Local store `3dpa_inventory_v1` (try-catch localStorage per project rule). Schema per spec APD5 incl. `updated_at` + tombstone-ready `id`s (uuid).
- Quick-add presets derived from the material vocabulary **read via existing engine data accessors at runtime** (no new engine API, no data file edits).
- Configurator integration: "in stock" badge in material picker (app-layer lookup by material family), journal entry optional `spool_id` selector.
- Tests: store CRUD + archive/empty transitions; badge logic; schema fixture for iOS mirroring.

**Gates:** sub-agent review; walkthrough/golden clean (engine/data untouched); merge; **this gate is visible to users immediately** (local feature, no flag needed — decision: ship it on, consistent with MD0 free-forever).

## AP8 — Inventory sync + journal spool refs polish

Branch `accounts/ap8-inventory-sync`. Wire `inventory` doc_type through `sync.js` (same envelope/tombstone machinery — mostly config + tests), journal↔spool cross-references included in workshop doc payload, My 3dpa inventory summary.
Tests: inventory two-device convergence; spool deletion tombstone; journal ref survives sync.
**Gates:** sub-agent review; merge (sync still dark).

## AP9 — Export / delete / privacy / flag ON / live verify

Branch `accounts/ap9-launch`. Files: `functions/api/v1/account/export.js` (single JSON: user + all docs), `functions/api/v1/account/index.js` (DELETE cascade per spec §4.3), profile-page export/delete UI (typed confirmation for delete), privacy policy page update (EN+DA), analytics-anonymity assertion test (grep-level test that no account module imports/touches the analytics sender + runtime payload assertion), Worker `ACCOUNTS_ENABLED="true"`.

**Launch sequence (in-PR checklist):** merge → deploy → owner creates a real account (both providers) → sync smoke on two browsers → export → delete → re-auth shows empty account → flag stays on.
**Gates:** sub-agent review; **cross-model (privacy/deletion lens) until no P0–P2**; owner smoke = exit gate; ROADMAP row flip.
**Rollback:** flag off (kill switch) — documented one-liner in the PR.

## AP10 — iOS account train (own release, after 1.0.7 + 1.0.8 trains)

One train, local commits per sub-gate, **single push when TestFlight-ready** (push gate). Suggested `MARKETING_VERSION=1.1.0` (owner confirms at AP0.4). Sub-gates:

- **I1** `AccountService` (SiwA native via `ASAuthorizationController`; Google via `ASWebAuthenticationSession` to the web endpoints; Keychain token storage; refresh rotation) + XCTest (mocked network).
- **I2** `SyncService` (envelope + merge reusing `WorkshopStore`'s shipped op-union import; pull on foreground; debounced push) + XCTest incl. the byte-compat fixture pin.
- **I3** `InventoryStore` + inventory screens (schema fixture shared with web; spool cards per iOS design system) + XCTest.
- **I4** My 3dpa screen (account, sync status, summaries, **export + in-app account deletion — Apple 5.1.1(v)**) + XCTest.
- **I5** App Privacy label update (email, linked to identity, app functionality) + policy link + copy EN/DA parity.
- **I6** Release gates: full XCTest suite green, walkthrough parity items, MARKETING_VERSION bump, TestFlight dispatch (owner), on-device acceptance incl. account create/sync/delete, App Store submission.

**Per-sub-gate:** hostile sub-agent review + QA; **cross-model review once before the push** (release lens). Engine/data: byte-identical check even though untouched (`diff -q`).
**Rollback:** don't push; or ship next train with account UI behind iOS-side flag reading `auth/status`.

## AP11 — Closeout (docs)

ROADMAP: flip platform rows, promote backlog seeds (spec §9) into Backlog table with IDs; Android AG-plan seed note (one line in the AG ledger area — do NOT rework the gated bundle); memory/vault sweep via normal wrap.
**Gates:** light sub-agent check; merge.

---

## Cross-cutting rules for every gate

1. One gate = one branch = one PR; review gate BEFORE merge; merged PR = gate closed in the ledger.
2. Gate ledger: `docs/planning/ACCOUNTS-PLATFORM-GATE-LEDGER.md` created at AP1 (per-gate evidence rows, same pattern as EXPORT/MINE ledgers).
3. Every web PR: `node --test functions/api/**/*.test.mjs` (or project test runner) + `node scripts/walkthrough-harness.js` + golden snapshot NO-DRIFT proof pasted in PR body.
4. No secrets in repo: Apple `.p8`, Google client secret, JWT signing key → `wrangler secret put` only.
5. D1 migrations additive-only; destructive changes need a new owner gate.
6. Analytics anonymity assertion runs from AP3 onward in every PR.
7. Sequencing vs in-flight work: AP1–AP9 (web) can interleave with other web work but not with another session editing `functions/api/` the same day; AP10 strictly after 1.0.7 + 1.0.8 trains; Android untouched until AG0.
8. Findings from reviews: one finding = one commit.
