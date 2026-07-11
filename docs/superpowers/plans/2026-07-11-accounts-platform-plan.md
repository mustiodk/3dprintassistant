# 2026-07-11 — 3dpa Accounts Platform: gated implementation plan

**Status:** DRAFT (pending sub-agent + QA + cross-model review; execution gated on owner AP0 ratification).
**Design source:** [`../specs/2026-07-11-accounts-platform-design.md`](../specs/2026-07-11-accounts-platform-design.md) (APD0–APD15).
**Shape:** small gates, one branch + one PR per gate, review gate before every merge. Each web gate is independently shippable and flag-safe (`ACCOUNTS_API_ENABLED` + `ACCOUNTS_UI_ENABLED` both off = today's behavior; export/delete/logout carve-out per spec §4.3). iOS is one release train with internal sub-gates under the push gate.

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
| AP5 | Web sync client + NEW merge layer | web | PR-e | sub-agent + cross-model (merge/data-loss) |
| AP6 | My 3dpa view shell | web | PR-f | sub-agent |
| AP7 | Inventory v1 (local-first; independent — only needs AP0) | web | PR-g | sub-agent |
| AP8 | Inventory sync + journal spool refs | web | PR-h | sub-agent |
| AP9 | Export/delete + privacy + flag ON + live verify | web | PR-i | sub-agent + cross-model (privacy/deletion) |
| AP10 | iOS account train (sub-gates I1–I6) | iOS | one push at TestFlight-ready | per-sub-gate sub-agent + cross-model before push |
| AP11 | Docs/ROADMAP/Android-seed closeout | web | PR-j | sub-agent (light) |

Estimated envelope: AP1–AP9 ≈ 8–11 focused sessions (AP5 alone = 2: the merge layer is new cross-platform code, not reuse); AP10 ≥ 7 sessions (mac-mini; I2 = 2; checkpoints on a remote feature branch); AP11 ≈ half session. One gate per session by default.

---

## AP0 — Owner gate (no code)

1. Ratify APD0–APD15 (reply GO or override per decision). **APD13 (Phase-2 Pro anchor: option a/b/c/d) is a hard blocker for AP4+** — AP1–AP3 may proceed under any option; AP7 under (a)/(b). **This plan is executable end-to-end only under option (a); picking (b)/(c)/(d) makes a reviewed Phase-2 Pro companion plan (entitlements, IAP rail, sync guard, launch reorder) a prerequisite before AP4 starts.** Also approve the ToS-light draft (APD15).
2. Registrations (owner, ~1–2h total, days of lead time for Apple):
   - Apple Developer: create a **Services ID** for web Sign in with Apple + key (`.p8`) — store in Worker secrets, never in repo (md-hygiene checklist already guards `AuthKey*`). Includes **domain verification** for 3dprintassistant.com; AP2 mints the ES256 client-secret JWT from the `.p8` per exchange.
   - Google Cloud Console: **one** web-application OAuth client + authorized redirect `https://3dprintassistant.com/api/v1/auth/google/callback` (native iOS reuses it via `ASWebAuthenticationSession` → Worker-minted intermediate code; no second client).
   - Apple Developer (native prerequisites): enable the **Sign in with Apple capability on the primary App ID** and **associate the Services ID with it** — without this the native flow cannot ship (AP10-I1 consumes it).
   - Confirm D1 availability on the Cloudflare account; owner runs nothing — AP1 creates the DB via wrangler, but billing plan visibility is owner's.
3. Approve the privacy-policy delta draft (AP9 publishes it).
4. Sequencing decision: confirm AP10 runs after the 1.0.7 and 1.0.8 trains, and pick the AP10 version number (suggest 1.1.0).

**Exit:** written GO in the session log / ROADMAP row.

## AP1 — Backend foundation (dark)

Branch `accounts/ap1-foundation`. Files:

- `wrangler.toml`: `[[d1_databases]]` binding `ACCOUNTS_DB`; `ACCOUNTS_API_ENABLED` + `ACCOUNTS_UI_ENABLED` vars (both default `"false"`); explicit `/api/v1/` route branch in `worker.js` (no prefix-matching per its own comment).
- `migrations/0001_accounts_init.sql` — checked-in numbered migration (schema from spec §4.2), applied with `wrangler d1 migrations apply` to local/preview/prod; **deploy-order gate: migration applies before dependent code deploys**; runtime code never mutates schema. `functions/api/v1/_lib/db.js` — D1 query helpers only. D1 database created `--jurisdiction=eu`.
- `functions/api/v1/_lib/router.js` — exact method+path route table dispatched from an explicit `/api/v1/` branch in `worker.js`; JSON 404/405 for unknown `/api/v1/` paths (no Assets fall-through); later gates register routes here.
- Local-D1 test harness (wrangler/miniflare) — NEW (existing Worker tests are plain mocks); endpoint tests exercise `worker.fetch` end-to-end.
- Rate-limit bindings in `wrangler.toml` (per-IP pre-auth, per-user authed) — consumed from AP2 on.
- `functions/api/v1/_lib/tokens.js` — JWT (WebCrypto HS256 v1, `kid` support), refresh-token hash/rotation helpers.
- `functions/api/v1/_lib/guard.js` — `requireEnabled` (503 when flag off), `requireAuth` (Bearer/cookie → user), rate-limit headers passthrough.
- Tests `functions/api/v1/foundation.test.mjs` (run: `node --test functions/api/v1/*.test.mjs`): token round-trip, rotation-reuse revokes family, grace-window successor replay (AEAD-sealed `grace_response` decrypts to the identical successor), **keyring rotation** (new `kid` signs, old `kid` still verifies/decrypts until retired), flag-off returns 503 (with GDPR carve-out list exempted), migration apply. **Integration tests run against the real local D1 binding (wrangler/miniflare harness) through `worker.fetch`** — plain SQLite stand-ins are allowed only for isolated pure-logic unit tests, never as the integration layer (D1 batch/binding/migration semantics differ).
- `docs/3dpa-context.md`: update the two non-goal lines per APD11 (accounts now optional-by-design; cloud sync exists as optional; engine purity unchanged) + one cross-ref note added to the monetization plan MD3 line.

**Gates before merge:** tests green (incl. worker.fetch route tests: unknown `/api/v1/x` → JSON 404, wrong method → 405); `node scripts/walkthrough-harness.js` clean; golden snapshot NO DRIFT; migration applied to preview D1 before deploy; sub-agent review; **live verify after merge:** `curl https://3dprintassistant.com/api/v1/auth/status` → 503 (flag off) — proves dark.
**Rollback:** revert PR (no data yet).

## AP2 — OAuth endpoints

Branch `accounts/ap2-oauth`. Files: `functions/api/v1/auth/[provider]/start.js`, `.../callback.js`, `functions/api/v1/auth/token.js` (native code exchange), `refresh.js`, `logout.js`, `status.js`.

- Google: PKCE + `state`; Apple: `response_mode=form_post` + `state`/nonce + **ES256 client-secret minting from the `.p8`**; both `id_token`s verified against provider JWKS (cached in Worker cache API, keyed by `kid`). Apple grants stored AEAD-encrypted per-client (`provider_grants` map — web Services-ID and native bundle-id grants coexist; deletion revocation needs the matching `client_id` per grant).
- User identity per spec §4.3: strictly `(provider, sub)` — email is non-unique metadata and never auto-links; explicit authenticated link flow (`/api/v1/auth/:provider/start?link=1` while signed in — initiating user_id + session jti AEAD-sealed into the pre-auth cookie per spec §4.3; callback verifies the bound session, 409-no-mutation on identities owned by another user); Apple grants stored per-client in `provider_grants`. Native link path per spec §4.3: `POST /api/v1/auth/link-intent` (Bearer) mints the single-use 120s PKCE-bound intent consumed by `/start?link_intent=<id>`. Link-flow tests: bound-session invalidation rejected; already-owned identity 409 without mutation; intent replay + expiry rejected.
- Cookies: session cookies httpOnly Secure SameSite=Lax; pre-auth `__Host-3dpa_preauth` cookie **SameSite=None** Max-Age 600 (Apple form_post is cross-site POST); post-login redirect pinned to fixed same-origin path.
- **Native support:** `auth_codes` one-time intermediate codes (hashed, 120s TTL, single-use) + dual-mode callback (`client=web` → cookies; `client=ios` → custom-scheme redirect with code) + `POST /api/v1/auth/token` accepting both Apple audiences (bundle id + Services ID).
- Tests: state mismatch → 400; missing/expired pre-auth cookie → 400; JWKS `kid` rotation; **same-verified-email two-provider isolation (two distinct users — email never links)**; explicit-link attach + linked-identity sign-in resolves to the same user; relay email → distinct user; nullable-email Apple re-auth; refresh reuse inside 30s grace → same successor, outside grace → family revoked; logout revokes; auth_code single-use + expiry + **PKCE verifier mismatch → 400**; native Apple `authorizationCode` exchange stores the per-client grant; dual-audience validation; **cookie-attribute assertions** (session: `__Host-`, `Path=/`, no `Domain`, Secure, httpOnly, SameSite=Lax; pre-auth: SameSite=None, Max-Age 600); rate-limit 429 paths.
- **Exit step (dark launch):** after merge, flip `ACCOUNTS_API_ENABLED="true"` in prod with UI off — API live dark from AP2 on (this is what AP9 later relies on).

**Gates:** tests green; sub-agent review; **cross-model review (security lens) — patch until no P0–P2**; walkthrough/golden clean; merge → apply prod migration → **flip `ACCOUNTS_API_ENABLED="true"` (UI stays off) = dark-live** (matches the exit step above; "dark" always means API-on/UI-off from here on).
**Rollback:** kill switch off; revert PR; D1 rows additive only.

## AP3 — Web auth UI (flag-gated)

Branch `accounts/ap3-web-auth-ui`. Files: `auth.js` (new module, Workshop-module pattern), `index.html` (header button container), `style.css`, `locales/en.json` + `locales/da.json` (sign-in modal, promise copy per spec §5), `app.js` (mount point only — keep auth logic in `auth.js`).

- Client flag: bootstrap `GET /api/v1/auth/status` → `{api, ui}`; `ui:false` or 503 ⇒ hide all account UI (no layout shift).
- Sign-in modal: Apple + Google buttons, privacy sentence, policy link. Signed-in: header initial + menu (My 3dpa placeholder, Sign out).
- Tests: Node UI-logic tests where the project pattern allows; manual browser smoke on preview; walkthrough/golden clean.

**Gates:** sub-agent review; merge. Flag stays off in prod (owner can smoke-test with a local flag override query param — dev-only, documented in the PR).

## AP4 — Sync endpoints

Branch `accounts/ap4-sync-api`. Files: `functions/api/v1/sync/[doc].js` (GET/PUT), `functions/api/v1/_lib/sync-schema.js` (envelope validation: doc_type allowlist, size caps 256 KB/128 KB, JSON shape check — **no Workshop semantics server-side**).

- PUT requires `If-Match` integer version; the check is one atomic conditional `UPDATE ... WHERE version=?` (spec §4.4) — mismatch → 409 + current doc; success → version+1 returned.
- **Device registration vs acknowledgment are separate:** any request upserts the device row's `last_seen_at`; `acked_version` advances ONLY via the explicit post-apply ack (`X-Applied-Version` header on a later request, or `POST /api/v1/sync/:doc/ack`) — a GET alone never acks. Responses carry `safe_compact_through`; the server persists a per-doc **compaction watermark** (highest `since_version` ever compacted, updated on PUTs that dropped tombstones) and rejects a PUT from a device whose `acked_version` < watermark with a 409-forced full pull (retired/stale-replica enforcement even after tombstones are gone).
- Tests: happy path, 409 flow, **two genuinely concurrent PUTs → exactly one 200 + one 409**, cap rejection (413), auth required (401), flag off (503), per-user isolation (user A cannot read B), GET-does-not-ack, ack advances only post-apply, below-watermark PUT rejected, `safe_compact_through` = min over active devices with retired devices excluded.

**Gates:** tests; sub-agent review; **cross-model (protocol lens) until no P0–P2**; merge (dark).

## AP5 — Web sync client + NEW merge layer (largest client gate — allow 2 sessions)

Branch `accounts/ap5-sync-client`. Files: `sync.js` (transport: debounced push 5s after local mutation, pull on load/sign-in, 409 → merge → re-push loop bounded at 3 attempts then "sync conflict — will retry") + `merge.js` (**new merge layer per spec APD4 — the shipped Workshop import merge is NOT sufficient**: **per-field** deterministic rev maps `revs:{field:{counter,device_id}}` (no wall-clock LWW, no whole-record resolution — disjoint concurrent field edits both survive), journal-record union by entry id within a profile, tuning op-union (the one reused piece), deletion-ledger tombstone application, lossless unknown-field preservation) + workshop-store additive **local deletion ledger** (`{id, kind, deleted_at, rev}` on every remove path; compaction is server-ack-based per spec §4.4) + **replica-namespace storage partitioning per APD14**. Envelope `{format: '3dpa-sync-v1', schema_version, min_reader, payload: <backup format unchanged>, deletions: [...]}` (byte-compat assertion pins the payload against a real fixture backup); single-flight coordinator with dirty generations.

- APD14 UI: first-sign-in merge/start-clean prompt (namespace move `local`→account); **sign-out switches the active namespace to `local` immediately** (account namespace stored but hidden — spec APD14 rule 3) + stops sync; different-account sign-in hides prior namespaces; account-deletion local keep/remove question.
- Tests (Node, shared JSON fixtures that AP10-I2 will re-run on iOS): profile-rename vs journal-append conflict converges losslessly; **disjoint-field concurrent edits both survive**; clock-skew immunity; equal-rev tiebreak; merge(A,B)==merge(B,A); associativity; idempotence; deletion does not resurrect; A→B→A namespace isolation; **signed-out UI shows only `local`-namespace data**; delete→reauth empty account; unknown-field round-trip; min_reader pause; tuning op-union preserved; envelope fixture byte-pin; dirty-generation edit-during-push; cap-exceeded → local-only badge state.

**Gates:** tests; sub-agent review; **cross-model (merge/data-loss lens) until no P0–P2**; walkthrough/golden clean; merge (dark).

## AP6 — My 3dpa view shell

Branch `accounts/ap6-profile-shell`. Files: `app.js`/`profile.js` view (Workshop surface pattern), strings EN+DA.
Contents: identity with **linked-provider list + "Link Apple/Google" action** (spec §4.3 link flow; UI acceptance test: linked providers render, link action launches `start?link=1`, 409 shows the "already linked to another account" message), per-doc sync status ("last synced HH:MM · v12"), Workshop counts, Sign out. Export/delete arrive in AP9 (buttons hidden until then).
**Gates:** sub-agent review; walkthrough/golden clean; merge.

## AP7 — Inventory v1 (local-first — ships user value even with accounts dark)

Branch `accounts/ap7-inventory-local`. Files: `inventory.js` (store + CRUD + rendering), `index.html` nav entry, `style.css` (spool-card pattern adapted from bambuinventory: swatch circle, material/vendor/remaining), locales EN+DA.

- **Independence note:** AP7 depends only on AP0 — it can run before or parallel to AP1–AP6 (local-first, no accounts machinery).
- Local store `3dpa_inventory_v1` (try-catch localStorage per project rule). Schema per spec APD5 (full ported field set incl. `color_code`/`gradient`/`order_status`/`defect_note` + the `import_meta` lossless passthrough; `material_id` = stable materials.json id) incl. per-field `revs` + tombstone-ready `id`s (uuid); **ratified field-by-field mapping table (bambuinventory column → 3dpa field/import_meta) + an export→import→export round-trip fixture from the owner's real `api.php` data** (proves the port lossless against actual data, not shape-plausible).
- `workshop-store.js` change: `addOutcome` accepts an optional `spool_id` and **persists it** (today it reconstructs a fixed record and drops unknown fields) + round-trip test; journal UI shows "(deleted spool)" fallback when the referenced spool is gone.
- Quick-add presets derived from the material vocabulary **read via existing engine data accessors at runtime** (no new engine API, no data file edits).
- Configurator integration: "in stock" badge in material picker (app-layer lookup by material family), journal entry optional `spool_id` selector.
- Tests: store CRUD + archive/empty transitions; badge logic; schema fixture for iOS mirroring.

**Gates:** sub-agent review; walkthrough/golden clean (engine/data untouched); merge; **this gate is visible to users immediately** (local feature, no flag needed — decision: ship it on, consistent with MD0 free-forever).

## AP8 — Inventory sync + journal spool refs polish

Branch `accounts/ap8-inventory-sync`. Wire `inventory` doc_type through `sync.js` (same envelope/tombstone machinery — mostly config + tests), journal↔spool cross-references included in workshop doc payload, My 3dpa inventory summary.
Tests: inventory two-device convergence; spool deletion tombstone; journal ref survives sync.
**Gates:** sub-agent review; merge (sync still dark).

## AP9 — Export / delete / privacy / launch / live verify

Branch `accounts/ap9-launch`. Files: `functions/api/v1/account/export.js` (cloud-account export, full APD7 scope: user row + identities sans secrets + all sync docs + device-registry rows + non-secret session metadata — labeled per spec APD7; local backup export remains the full-device path; acceptance test asserts the full enumeration), `functions/api/v1/account/index.js` (DELETE per spec §4.3 order: idempotent KV deletion intent FIRST → atomic child-first D1 batch incl. revocation_outbox enqueue → independent retryable Apple `/auth/revoke` from the outbox; tests: KV-written-batch-failed retry, double-delete idempotency, revoke-failure leaves outbox row, **web-only / native-only / both-grant Apple revocation** (client_id-matched per grant); reachable even with the kill switch on), profile-page export/delete UI (typed confirmation for delete), **privacy policy rewrite** (`privacy.html` today asserts name/email/User ID are NOT collected — those collection sections and the GDPR notice are rewritten, not appended to; + ToS-light section, 13+ age line, export/deletion_log retention disclosures, EN+DA), analytics-anonymity assertion test (grep-level test that no account module imports/touches the analytics sender + runtime payload assertion), flags per spec §4.5: `ACCOUNTS_API_ENABLED` already on (dark since AP2), now `ACCOUNTS_UI_ENABLED="true"`.

**APD13 conditionality:** if the owner picked (b)/(c)/(d), "UI flag ON for everyone" is replaced by the Pro-gated rollout defined in the Phase-2 monetization spec (which must then exist before AP9 completes); under (a) AP9 launches sync free as written.

Also in AP9: `docs/runbooks/accounts-recovery.md` + a scripted restore-replay tool (`scripts/accounts-restore-replay.js`: reads the KV deletion log, re-deletes matching users) — **exit gate includes one restore rehearsal against a preview D1: restore → replay → deleted users provably absent before traffic resumes**; privacy policy discloses the ≤30-day revocation-outbox credential retention alongside the deletion-log + export retentions; kill-switch rights test (export/delete usable after access-token expiry with `ACCOUNTS_API_ENABLED=false`).

**Launch sequence (in-PR checklist):** merge → deploy → owner creates a real account (both providers) → sync smoke on two browsers → export → delete → re-auth shows empty account → flag stays on.
**Gates:** sub-agent review; **cross-model (privacy/deletion lens) until no P0–P2**; owner smoke = exit gate; ROADMAP row flip.
**Rollback:** flag off (kill switch) — documented one-liner in the PR.

## AP10 — iOS account train (own release, after 1.0.7 + 1.0.8 trains)

One train. **Checkpoint safety:** sub-gate commits push to a non-deploying remote feature branch `codex/accounts-train` after each sub-gate (precedent: the 2026-07-11 export transfer branch — the iOS push gate governs `main` + TestFlight dispatch, not feature branches; a 7+-session train held only on one machine is a machine-loss risk). `main` is pushed **once**, when TestFlight-ready. Suggested `MARKETING_VERSION=1.1.0` (owner confirms at AP0.4). Estimate ≥7 focused sessions. Sub-gates:

- **I1** `AccountService` (SiwA native via `ASAuthorizationController` sending `id_token` + `authorizationCode`; Google via `ASWebAuthenticationSession` to the web endpoints with PKCE; Keychain token storage; refresh rotation) + **project mutations**: SiwA entitlement/capability in `project.yml` (+ regenerated pbxproj) and the fixed custom callback URL scheme in Info.plist — neither exists today + XCTest (mocked network).
- **I2** `SyncService` + the **new Swift merge layer mirroring AP5's `merge.js`** (**per-field rev maps**, journal union, tuning op-union, deletion ledger on `WorkshopStore` delete paths, replica namespaces, APD14 prompts) — re-runs **all** of AP5's shared JSON merge fixtures as XCTests (incl. the disjoint-field case) + the byte-compat fixture pin + lossless unknown-field preservation (raw-JSON retention, no lossy Codable round-trip). Largest I-sub-gate; allow 2 sessions.
- **I3** `InventoryStore` + inventory screens (schema fixture shared with web; spool cards per iOS design system) + XCTest.
- **I4** My 3dpa screen (account with **linked-provider list + authenticated "Link Apple/Google" action** — same §4.3 link flow and 409 collision message as web, XCTest covers bound-session rejection + already-owned collision UI states —, sync status, summaries, **export + in-app account deletion — Apple 5.1.1(v)**) + XCTest.
- **I5** App Privacy label update — **all four new types: Name, Email address, User ID, Other User Content** (synced Workshop/inventory docs), linked to identity, app functionality, no tracking — merged with the existing declared diagnostics/usage disclosures in `docs/app-store-privacy-labels.md` (which today explicitly denies all four) + policy link + copy EN/DA parity.
- **I6** Release gates: full XCTest suite green, walkthrough parity items, MARKETING_VERSION bump, **ASC App Privacy answers verified against I5 as an explicit exit item**, TestFlight dispatch (owner), on-device acceptance incl. account create/sync/delete, App Store submission.

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
