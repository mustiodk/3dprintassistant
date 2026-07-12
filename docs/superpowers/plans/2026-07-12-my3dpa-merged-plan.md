# 2026-07-12 — My 3DPA merged gated implementation plan (MG0–MG19)

**Status:** DRAFT — pending owner ratification (MG0) + the SYN-17 fresh hostile/cross-model review round before MG1 implementation.
**Decision source:** [`../specs/2026-07-12-my3dpa-merged-decision-set.md`](../specs/2026-07-12-my3dpa-merged-decision-set.md) (SYN-00…SYN-17). Source-candidate specs/plans stay normative for mechanics adopted by reference.
**Shape:** ~20 gates in 6 milestones. One gate = one branch = one PR (iOS sub-gates held as local/feature-branch commits under the push gate); review gate before every merge; ledger row per gate. **The owner can stop after any milestone** — each milestone ends in a shippable, self-consistent state.

**Standing-rule evaluation:** no gate in V0–V4 touches `engine.js` or canonical `data/*.json`; every web PR carries walkthrough + golden-snapshot zero-diff proof (`node scripts/engine-golden-snapshot.js --check` + base-vs-head walkthrough diff — Claude plan rule 3). Web/iOS impact is app-layer UI + new modules on both platforms; byte-mirror applies only to shared contract fixtures (`contracts/pdm2/**` → iOS test bundle, `diff -q` at release gates).

---

## Milestone map

| Milestone | Outcome when you stop here | Gates |
|---|---|---|
| **V0 — Contract & rails** | Ratified decisions, pinned tooling, gate ledger, PDM2 contract frozen. Nothing user-visible; no external resources. | MG0–MG2 |
| **V1 — Free inventory (web)** | Filament inventory live for everyone, local-first, free, incl. bambuinventory import. Accounts machinery built + staging-verified but **dark in prod**. | MG3–MG8 |
| **V2 — Sync + Pro rail (web, owner-canary)** | Sync protocol + web client + entitlement server rail complete and owner-canaried in prod-dark. **Not public** (public launch needs the iOS purchase rail — SYN-01). | MG9–MG12 |
| **V3 — iOS 1.1.0 + public launch** | iOS accounts/sync/inventory/Pro purchase ships; web+iOS sync goes public together. The platform is launched. | MG13–MG17 |
| **V4 — Export library** | Export recipes/history (snapshots + presets) on web then iOS. | MG18–MG19 |
| **V5 — Android/macOS (pointers)** | Android v1.1 sync train (post-AG0/Android-v1) and macOS shared packages — briefs written when their trains open. | — |

Estimated envelope: V0 ≈ 2–3 sessions · V1 ≈ 7–10 · V2 ≈ 7–9 · V3 ≥ 8 (mac-mini) · V4 ≈ 3–4. One gate per session by default; MG3/MG4/MG5/MG9/MG10 may take two (MG3 fuses Codex's B0+B1 scope; MG5 is Claude AP9's core minus launch).

Dependency spine: `MG0 → MG1 → MG2 → MG3 → MG4 → MG5 → {MG6, MG9}`; `MG7 → MG8` needs only MG2; `MG9 → MG10`; `MG11` needs MG4+MG5 (its retention/refund handling hooks the MG5 saga and its sweeper rides MG5's cron); `MG12` needs MG5+MG6+MG10+MG11; `MG13–MG17` need MG12 (and the 1.0.7 + 1.0.8 trains closed); `MG18 → MG19` need MG10/MG17.

---

## V0 — Contract & rails

### MG0 — Owner ratification + registrations (no code)

1. Ratify SYN-00…SYN-17 (GO or per-decision override). Confirm the Pro price (suggest 99 DKK) and the MD2 amendment note text (lands with this ratification).
2. Registrations (lead time — start early): Firebase **staging + production** projects (Apple + Google providers only; anonymous + email/password provably disabled; **"Multiple accounts per email address" enabled** — Firebase's one-account-per-email default would silently violate SYN-03's "email never links"; settings evidence hashed into the ledger — Codex B1 discipline); Apple Services ID + `.p8` key configured **in the Firebase console** (never in repo) + SiwA capability on the primary App ID; Google provider config via Firebase; staging hostname `accounts-staging.3dprintassistant.com`. **App Store Connect prerequisites MG11 consumes** (lead time; coordinate with the 1.0.8 tip-jar train's overlapping items rather than duplicating them): Paid Applications agreement active, the Pro non-consumable IAP product created, ASSN v2 sandbox + production URLs configured.
3. Approve: privacy-policy delta draft (rewrite scope per SYN-12), ToS-light, asset-exposure decision (exclude `functions/**`, `worker.js`, `wrangler.toml` via `.assetsignore` — recommended), iOS version 1.1.0, DPA/SCC evidence checklist for Firebase US processing (production GO items may be accepted here or deferred to the MG12 launch gate, but must exist before any prod collection), and **record the Cloudflare Workers plan** (it fixes the D1 Time-Travel window — 7 vs 30 days — that SYN-12's policy wording must state, and the Worker CPU envelope that sizes SYN-11's synchronous export).
4. SYN-17 review round (hostile sub-agent + Codex cross-model on this plan + decision set, patch to zero P0–P2) — before or after ratification, but before MG1.
5. After ratification: update ROADMAP to name this plan canonical; park both source candidates as evidence (do not delete).

**Exit:** written GO recorded immediately in two places that exist at gate close — the decision set's Status line flips to RATIFIED and a ROADMAP note names the canonical plan; the formal ledger row is backfilled at MG1 (Claude AP1 precedent).

### MG1 — Tooling, flags, ledger, asset hygiene (web)

`package.json`/`package-lock.json` with pinned wrangler + `scripts/verify-toolchain.mjs` drift check; the **flag registry** (documentation of the literal Worker-secret names — SYN-05 — one row each: name → gated behavior → default → flipping gate → safe-off semantics):

| Secret | Gates | Default | Flipped by |
|---|---|---|---|
| `ACCOUNTS_API_ENABLED` | all account/sync endpoints except the SYN-11 rights carve-out (the kill switch) | false | MG12 (prod dark) |
| `ACCOUNTS_UI_ENABLED` | public account/sync UI (sign-in, My 3DPA account + sync sections) | false | MG17 (public launch) |
| `SYNC_WRITES_ENABLED` | server sync-write acceptance (manual arm of the SYN-05 auto write-breaker) | false | MG12 (canary) — "confirm on" is an explicit MG17 flip-list line |
| `PRO_OWNER_GRANT` | the SYN-16 allowlisted owner/staging entitlement grant | false | on at MG11 (staging) + MG12 (prod owner canary); revoked at MG17 only after the owner's real App Store purchase |
| `IOS_ACCOUNT_SYNC` | remote iOS account/sync kill switch, surfaced as the `ios` field of `auth/status` (built dormant at MG3, honored by MG14/MG15) | false | on at MG16 (owner-only phase — no public binary carries account code yet); confirmed public at MG17 |
| `EXPORT_LIBRARY_ENABLED` | export snapshots/presets kinds + Exports section | false | MG18 |

Inventory is deliberately **absent** — MG7 ships unflagged per SYN-01/MD0. Every secret's safe-off behavior is tested in the gate that first reads it. Also in MG1: `docs/planning/MY3DPA-GATE-LEDGER.md` + structural validator; `.assetsignore` additions per the MG0.3 decision (+ `migrations/**`, `contracts/**` review). Docs/tooling only — no runtime feature code.
**Review:** sub-agent (light). **Rollback:** revert; all flags off. **Exit:** clean-clone `npm ci` + validators green; live-site curl proves the excluded assets are no longer served.

### MG2 — C0: PDM2 contract (web) + IC0 Swift parity

Adopt Codex Gate C0 trimmed to SYN-06 (active kinds: profile, outcome, tuning_op, tuning_dismissal, spool, inventory_event, preference; dormant schemas: custom_material, export_snapshot, export_preset, printer). `contracts/pdm2/{manifest,namespaces}.json`, entity schemas, and the **surviving API-schema subset only**: push request/per-op results, pull page/cursor, entity read, `schema/versions` manifest, account contract, synchronous export shape, deletion saga statuses, typed error bodies. **Not in the contract** (referents deleted by SYN-04/-08/-11): lifecycle endpoint, async export-job/deletion-capability schemas, graveyard `hash_set_blob` vectors, the R2 conditional-create probe. Valid/invalid/golden fixtures (canonical RFC-8785 hash vectors, UUID-v5 vectors), `scripts/pdm-contract.test.js` + full-manifest-hash verification, versioning runbook. **IC0:** read-only Swift fixture verifier on an iOS local branch against the frozen candidate commit; PASS recorded in the ledger before the web PR merges; any contract-byte change reruns IC0. **Machine note:** IC0 needs the mac-mini/Xcode — if unavailable, the web PR is HELD, not merged without parity.
**Review:** sub-agent + cross-model (contract lens) to zero P0–P2. **Rollback:** contract-only revert (no stored data exists). **Exit:** manifest hash frozen; all downstream gates pin it.

---

## V1 — Free inventory + dark account machinery (web)

### MG3 — Backend foundation (dark)

`wrangler.toml`: `ACCOUNTS_DB` D1 binding (created `--jurisdiction=eu`), `ACCOUNTS_DEL` KV namespace, rate-limit bindings (availability verified first; KV/D1 counter fallback recorded — Claude AP1), full `[env.staging]` mirror (bindings non-inheritable; explicit deploy/migrate commands), staging behind Cloudflare Access (owner-only) with the corrected privacy notice + scripted purge. `migrations/0001_accounts_init.sql` — expand-only, whole SYN schema: `users` (id = Firebase sub, status, pdm_version, next_revision, min_available_revision, app_account_token, timestamps — **no email column**), `devices` (device_id, platform, last_seen, revoked_at, op watermarks), `sync_entities` (kind, entity_id, entity_version, user_revision, schema_version, payload_json, payload_hash, deleted_at), `sync_ops` (request/op idempotency + typed results), `deletion_jobs`, `entitlements`, `purchase_events`, `purchase_retention` + indexes. Router module (exact method+path table, JSON 404/405, explicit `/api/v1/` branch in `worker.js`), guards (`requireEnabled` 503 with GDPR carve-out list, `requireAuth`), **Firebase ID-token verifier** (RS256-only, JWKS fail-closed caching per Codex §7.3, `503 auth_keys_unavailable`), `auth/status` stub `{api,ui,rights,ios}` (the `ios` field reads `IOS_ACCOUNT_SYNC` — dormant now, honored by MG14/MG15), `functions/api/v1/schema/versions.js` (the static per-kind min/max read/write contract manifest SYN-07's 426 discipline presupposes). Local wrangler/miniflare D1 harness (new — existing Worker tests are mocks); tests run through `worker.fetch`.
**Review:** sub-agent. **Rollback:** revert PR — the applied empty schema and provisioned D1/KV resources remain (inert; contraction requires a new owner gate per rule 4). **Exit:** migration applied local+staging+prod (inert, pre-merge per Claude AP1); live curls: `auth/status` JSON, unknown path JSON-404, migration file not served.

### MG4 — Auth, account creation, device trust (staging E2E)

`functions/api/v1/devices/register.js` (sole account creator: verified fresh-`auth_time` Firebase token → atomic user+device transaction, idempotent re-registration, `403 device_not_registered` elsewhere, rejection of `status='deleting'` subs per SYN-11), `revoke`/`revoke-all` (lost-device flow: Firebase refresh-token revocation + device revocation). **Surviving Codex §7.4 clauses are exactly these** — no key `rotate` endpoint (there is no device key), no Web-Crypto degrade path, no cached-mutation-result contract (all deleted with P-256 signing per SYN-04). `GET /api/v1/account` (`{status, pdmVersion, currentRevision, appAccountToken, devicesSummary, entitlements[]}` — `app_account_token` server-generated at creation, never logged/exported), web `account-auth.js` (lazy Firebase SDK load only on account UI open + `accountEnabled` boot marker + strict CSP allowlist — Codex §11.1), rate limits live.
**Tests:** JWT confusion matrix (alg:none/HS256-with-public-key/wrong aud/iss/exp/unknown kid/JWKS outage), anonymous-Firebase rejection, registration races, cross-user isolation, provider-link collision safe-stop, same-email-two-providers = two users (presupposes the MG0.2 Firebase multi-account setting), deleted-user token = unauthenticated, `deleting`-sub registration rejected, 429 paths, signed-out page loads zero Firebase bytes.
**Exit items:** **SiwA revocation verification FIRST** (before broad staging E2E), per SYN-03's named oracle: delete the staging Firebase test user, verify the app disappears from the owner's appleid.apple.com "Sign in with Apple" list, before/after evidence in the ledger; working assumption is that the fallback (authorizationCode capture at sign-in + Worker exchange + encrypted grant column via schema amendment + saga revoke step in MG5) IS needed — descope it only on a proven pass. Then real Apple + Google sign-ins E2E on Access-gated staging, driven by a **staging-only harness page at `scripts/dev/staging-auth-harness.html`** (`scripts/**` is already `.assetsignore`-excluded, so the git-connected prod deploy never serves it; `account-auth.js` invoked directly — the shipped sign-in modal is MG6), finished with the scripted purge.
**Review:** sub-agent + cross-model (security lens) to zero P0–P2. Prod flags stay off through V1–V2 (dark window lives in MG12).

### MG5 — Account export + deletion + rights carve-out

Synchronous `GET /api/v1/account/export` (full server-held enumeration per SYN-11; labeled "cloud account export"); `DELETE /api/v1/account` saga per the revised SYN-11 ordering: KV erasure intent FIRST (idempotent; `users.status='deleting'` locks the API and blocks re-registration from step 1) → atomic child-first D1 wipe of everything EXCEPT the retained `users` + `deletion_jobs` rows (schema-migration test fails on any user-scoped table missing from the enumerated cascade) → Firebase identity deletion + token revocation with retry (+ Apple revocation per MG4's finding) → after identity deletion confirms: delete `users`, KV completion marker, content-free 30-day receipt. **Worker cron trigger** (`[triggers]` in `wrangler.toml`, this gate) owns saga resumption for users who never return AND the `purchase_retention.erase_after` sweeper; `deletion_jobs` is its state table. Web deletion route `/account/delete` (works without the app). Kill-switch rights carve-out per Claude §4.5 verbatim (export/delete/status/sign-out reachable AND usable with `ACCOUNTS_API_ENABLED=false`, post-token-expiry test). `scripts/accounts-restore-replay.js` + **one staging Time-Travel restore rehearsal: restore → replay KV deletions → deleted users provably absent**.
**Tests:** KV-written-batch-failed retry, double-delete idempotency, Firebase-deletion-pending status honesty (retained `deleting` row; register blocked; cron resumes), export completeness assertion, `appAccountToken` absent from export/logs, post-saga re-auth = fresh empty account.
**Review:** sub-agent + cross-model (privacy/deletion lens) to zero P0–P2.

### MG6 — Web auth UI + My 3DPA shell (flag-gated)

`auth-ui.js` + `my3dpa.js` (Workshop surface pattern), header account affordance, sign-in modal (two providers + promise copy EN+DA per SYN-00), My 3DPA lean contents (identity/providers, summaries, export/delete wired to MG5, sign out), signed-out "On this device" framing, `rights:true` minimal section under kill switch (Claude AP3). **Analytics-anonymity grep assertion ships here** and runs in every later PR.
**Review:** sub-agent. UI flag off in prod; owner smoke on staging/preview only (hostname-restricted override — Claude AP3; the allowlist names the specific preview/staging hostnames MG12's canary will reuse).
**Exit:** staging smoke checklist green (sign-in both providers through the shipped modal, sign-out, My 3DPA renders EN+DA, export/delete round-trip), kill-switch rights-section render test, zero-Firebase-bytes-signed-out assertion, analytics grep assertion — all recorded in the ledger row.

### MG7 — Inventory v1: local-first, free, event-sourced (web)

`inventory-store.js` (append-only events + client-side projection fold per SYN-10, typed mg invariants, try-catch localStorage per project rule), `inventory-ui.js` + nav + spool-card CSS (bambuinventory pattern adapted), quick-add presets via existing engine data accessors (no engine/data edits), configurator "in stock" badge + journal `spool_id` (with the `workshop-store.js` `addOutcome` persistence fix + "(deleted spool)" fallback), CSV/JSON import/export with formula-injection defense + idempotent import IDs, locales EN+DA. Contract kinds from MG2 are authoritative; a contract defect returns to a versioned MG2 amendment, never a local fork.
**Ships ON** (unflagged free feature per MD0/SYN-01). Depends only on MG2 — may run early/parallel (but no two gates editing `app.js`/`index.html`/`style.css`/locales concurrently — Claude rule 7).
**Review:** sub-agent. **Exit:** walkthrough/golden zero-diff; owner manages a realistic inventory offline with zero accounting drift.

### MG8 — bambuinventory import bridge

Two PRs, two repos, never combined: **(a)** bambuinventory read-only CLI `export_inventory.py` (versioned JSON to `--output`, stable source IDs, integer units, row count + SHA-256; proves zero DB mutation — Codex F1a). **(b)** web importer: ratified field-mapping table + `import_meta` passthrough, spool + one `acquire` event per row, dry-run ambiguity report, explicit confirm, idempotent re-import; **round-trip fixture from the owner's real `api.php` export** (Claude APD5). bambuinventory stays running/read-only until the owner signs the reconciliation report (counts + remaining-total comparison).
**Review:** sub-agent. **V1 stop point:** inventory public + accounts fully built but dark.

---

## V2 — Sync + Pro rail (web, owner-canary; public launch deferred to V3)

### MG9 — Sync server protocol

`functions/api/v1/sync/{push,pull,entity,status}.js` + `_lib/sync/` per SYN-07: contiguous per-device batches, dependency-ordered per-op typed results + ack watermarks, append-only union / latest-per-key / mutable base-version checks, content-free conflict metadata + live entity read, tombstone ops (retained, no compaction — SYN-08), cursor + `minAvailableRevision` + bootstrap path, `426` schema negotiation, caps/quotas + global write breaker, **entitlement guard on sync writes** (`403 pro_required`; pull/export/delete never gated — SYN-16). Workshop AND inventory kinds enabled together.
`sync_ops` retention per SYN-07 (ack-watermark compaction, latest 1,024/device, `already_acknowledged_pull_required` below watermark). `min_available_revision` is constant in V1–V3 (SYN-08): the `410 cursor_expired` path is contract-reserved and tested via injected state only. **Staging entitlement bootstrap for this gate's soak and MG10's tests:** a documented `wrangler d1 execute` insert on the staging D1 (superseded by `PRO_OWNER_GRANT` once MG11 lands).
**Tests:** two-device concurrency, exactly-one-winner races, lost-response idempotent retry, dependency-failure isolation, stale-edit-after-delete, cross-user isolation, quota/breaker, cap rejection, ack-compaction/below-watermark rejection, injected 410, no-entitlement write rejection with pull still allowed. **24h staging soak:** driven by a scripted loop replaying the gate's test corpus against staging under the documented entitlement insert; pass criterion = zero 5xx and zero invariant violations over the window, with ack-compaction and `sync_ops` retention behavior observed in the D1 rows.
**Review:** sub-agent + cross-model (protocol lens) to zero P0–P2.

### MG10 — Web sync client + opt-in PDM2 adapter

`sync-client.js` + `sync-outbox.js` + the SYN-09 sync boundary: account namespaces are **v1-shaped stores + the `3dpa_sync_meta_<ns>` sidecar** (entity versions, journal-entry/legacy-ID maps, outbox, deletion ledger, conflict bookkeeping) — the existing UI read path is untouched; entities derive at push time (journal un-nesting in the derivation) and pulls fold back into v1 shapes. **Opt-in requires an active Pro entitlement BEFORE any migration step starts** (a non-Pro user must never be walked through backup + namespace materialization just to hit `403 pro_required`). Then: verified safety backup w/ receipt → namespace + sidecar materialization → staged bootstrap (pull, merge staging, conflict summary, commit, push, verify-pull) with failure injection at every boundary — **including entitlement loss (`403`) at the push boundary**; replica namespaces per Claude APD14 as adapted by SYN-09 (first-sign-in merge/start-clean, sign-out → `local` immediately, cross-account isolation, deletion keep/remove without back-conversion); conflict-copy UX (Codex §9.4, deterministic copy IDs); triggers = foreground/debounce/network/manual; quiet status states; sign-out/opt-out leaves local data fully usable.
**Tests:** two browser profiles offline/concurrent; A→sign-out→B→A namespace isolation; signed-out UI shows only `local`; reload at every transaction boundary; v1 backup byte-compat pinned against a real fixture; unknown-field round-trip; injected cursor expiry → bootstrap; entitlement absent/lost at opt-in and mid-bootstrap.
**Review:** sub-agent + cross-model (data-loss lens) to zero P0–P2.

### MG11 — Entitlement server rail

Per SYN-16's enumerated adoption: StoreKit 2 JWS validation + App Store Server API reconciliation + ASSN v2 endpoint (notificationUUID dedup, replay-safe), `appAccountToken` binding to the authenticated user, entitlement writes only from verified events, restore endpoint, refund/revocation → never-data-hostage state, `purchase_retention` at deletion, sandbox/production isolation. **Plus the `PRO_OWNER_GRANT` carve-out** (SYN-16 exception): flag-gated server-side grant for explicitly allowlisted accounts, logged and revocable, with its own tests (allowlist miss rejected, flag-off rejected, grant/revoke audit rows) — this is what entitles the MG12 owner canary and replaces MG9's staging D1 insert. Web My 3DPA shows Pro status + "buy on the iOS app" explanation (web checkout deferred per MD3).
**Also owned here (SYN-16):** the server-side 7-day offline grace — when App Store reconciliation is unreachable, the last successful verification is honored for 7 days — with a reconciliation-outage test.
**Test honesty:** without the MG16 StoreKit client, this gate proves fixture-JWS validation, ASSN `requestTestNotification` connectivity/auth/replay, the grace path, and the owner-grant path; **sandbox** purchase→entitlement E2E lands at MG16, and the first **production** purchase is MG17's explicit owner-purchase step (optionally earlier sandbox coverage via a local-only mac-mini StoreKit harness build, never shipped).
**Review:** sub-agent + cross-model (payments lens) to zero P0–P2.

### MG12 — Web launch gate (held at owner canary)

Publish the rewritten `privacy.html` + ToS-light (SYN-12) → flip prod `ACCOUNTS_API_ENABLED` + `SYNC_WRITES_ENABLED` + `PRO_OWNER_GRANT` (owner allowlist) → **owner canary ~48h**: real accounts both providers, two-browser sync (owner entitled via MG11's `PRO_OWNER_GRANT` — the only permitted pre-purchase mechanism), export, delete, re-auth-empty, kill-switch drill (ending with the flags restored to the documented canary state) → leave `ACCOUNTS_UI_ENABLED` **off for the public**. **Owner UI access path with public UI off:** the MG6 hostname-restricted override on a named preview/staging deployment that shares the production bindings, with that hostname registered in Firebase authorized domains + the CSP allowlist (documented in this gate's run sheet). `rights:true` flips here (code change in this gate — Claude AP9). Runtime analytics-payload assertion ships here. DPA/SCC evidence recorded if deferred from MG0.
**Exit:** canary clean; ledger row "READY — public flip bound to V3 completion". **V2 stop point:** everything proven; nothing public-facing changed except the policy.

---

## V3 — iOS 1.1.0 + coordinated public launch

Sub-gates commit to a non-deploying remote feature branch (`codex/my3dpa-train` precedent); `main` pushed once at TestFlight-ready. Strictly after the 1.0.7 and 1.0.8 trains.

- **MG13 — iOS sync-boundary adapter + inventory:** vendor contract fixtures by manifest hash (parity XCTests re-run MG2's corpus). **iOS storage model mirrors SYN-09, not Codex I0:** the existing native store shapes (`workshop.json` etc.) remain the local source of record forever; a `sync_meta_<ns>.json` sidecar in Application Support is the iOS equivalent of web's sync sidecar; `PDMSyncAdapter` (sync-boundary derivation/fold-back, raw-JSON retention, no lossy Codable round-trip) replaces Codex I0's `PDMRepository`+mandatory-migration, which is NOT adopted. `InventoryStore` + SwiftUI Filament screens; opt-in adapter mirrors MG10's rules; engine startup independent of sync/cloud.
- **MG14 — iOS accounts:** Firebase SDK (SiwA native + Google), device registration/revocation, Keychain/session per SDK, My 3DPA screen (lean contents), **in-app export + account deletion (Apple 5.1.1(v))**, replica namespaces + APD14 prompts. **Exit:** XCTests + staging E2E for registration, device revocation, in-app export, and in-app deletion driving the MG5 saga to completion (staging Firebase user provably gone), recorded in the ledger.
- **MG15 — iOS sync client:** outbox/pull/bootstrap/conflict copies mirroring MG10 (shared fixtures as XCTests), sync status UX, backend-outage degrade, and the **remote kill-switch honor**: the client reads `auth/status.ios` (built dormant at MG3) and degrades to local-only account UI when false — with an explicit kill-switch degrade XCTest (this is what makes MG17's rollback claim real).
- **MG16 — iOS Pro purchase + owner canary:** StoreKit 2 non-consumable + `appAccountToken` + Restore Purchases + grace/lapse **state UX** (the 7-day grace itself is MG11 server scope) + never-data-hostage lapse UX. **Flip `IOS_ACCOUNT_SYNC=true` at gate start** (owner-only phase; no public binary carries account code yet — without this, MG15's tested degrade path would block the canary). **Owner-only production-backend sandbox canary (~48h)** with the reviewed local build before any push (Codex E0p, trimmed): sandbox purchase → production-backend validation → entitlement grant, restore, and the refund leg via sandbox/ASSN test-notification fixtures (a real production refund is Apple-adjudicated and not deterministically completable in 48h). Exit state: rail proven in sandbox; owner's production purchase deliberately deferred to MG17.
- **MG17 — Release + public launch:** full XCTest + walkthrough parity + contract `diff -q`; App Privacy labels (Name/Email/User ID/Other User Content — first-ever for the app) verified against ASC answers; version 1.1.0; owner GO → one push → TestFlight (~7-day soak incl. account create/two-device sync/export/delete/sandbox-purchase; `IOS_ACCOUNT_SYNC` already on from MG16) → App Store release → **launch flip list, in order:** (1) owner purchases Pro on the released App Store build and the MG11 rail provably grants the production entitlement (the plan's first production purchase); (2) revoke the owner's `PRO_OWNER_GRANT`; (3) flip `ACCOUNTS_UI_ENABLED` on; (4) confirm `SYNC_WRITES_ENABLED` and `IOS_ACCOUNT_SYNC` on (SYN-01: the purchase rail now exists, so public sync may launch). ROADMAP flip; `3dpa-context.md` non-goals updated (APD11 timing).

**Per-sub-gate:** hostile sub-agent + QA; one cross-model round before the push (release lens). **Rollback:** don't push; post-release, `IOS_ACCOUNT_SYNC=false` degrades shipped binaries to local-only account UI (MG15's tested path) with the local store authoritative.

---

## V4 — Export library

- **MG18 — Web:** enable dormant `export_snapshot`/`export_preset` kinds (content-addressed snapshots per Codex §10.2, regenerate locally, honest current-engine relabeling, preset↔snapshot reference GC without the fenced machinery — a repoint/delete recheck transaction suffices under SYN-08), Exports section in My 3DPA, sync integration, `EXPORT_LIBRARY_ENABLED` flip. **Snapshot-revival rule** (content-addressed IDs make "Restore as new copy" impossible for identical content): a create whose recomputed RFC-8785/SHA-256 hash matches a tombstoned snapshot's ID revives that entity as an ordinary transaction (new server revision, tombstone cleared) — mismatched content under a claimed ID stays `409`. Existing exporter output fixtures unchanged.
- **MG19 — iOS:** export library repository/UI + its own trimmed release train (local commits → full suite → owner GO → push → TestFlight soak → release).

## V5 — Android v1.1 + macOS (pointer gates)

Android sync train opens only after Android v1 ships (AG0 owner gate, unchanged): vendor contract, Room store, Firebase Auth, sync client, Play Data Safety + web deletion resource — full brief written then, inheriting MG2/MG9 contracts. macOS = shared Swift package extraction after iOS stabilizes (Codex §11.4). The dormant `printer` kind + the My 3DPA Printers section also live here (moved out of V4 — SYN-13). Neither platform train is authorized by this plan alone.

---

## Cross-cutting rules (every gate)

1. One gate = one branch = one PR; review before merge; ledger row with commands/evidence/rollback (flag flips = `wrangler secret put`, config not code).
2. Engine/data untouched proof in every web PR that could touch runtime (golden snapshot check + base-vs-head walkthrough diff pasted in the PR body); docs-only PRs exempt.
3. No secrets in repo (Firebase config values that are public-by-design are allowlisted explicitly; `.p8`, service credentials, signing keys never).
4. D1 migrations expand-only; contraction = new owner gate.
5. Analytics anonymity: grep assertion from MG6 onward, runtime assertion from MG12.
6. One review finding = one commit.
7. Sequencing: no two gates editing `app.js`/`index.html`/`style.css`/`locales/*` in parallel; **cross-plan collision rule:** no My 3DPA gate edits `functions/api/**` the same day as another session's Worker work (the in-flight 1.0.7 train's web half) and none of MG6/MG7/MG10 runs parallel to tip-jar Track W's `app.js`/`index.html` edits; V3 strictly after the 1.0.7 + 1.0.8 trains; Android untouched until AG0.
8. Kill-switch degrade: any account-surface failure leaves today's local behavior intact; the configurator must never depend on backend health.
9. Rollback default: flags cover behavior, revert the PR; gate-specific notes override (MG10: v1-shaped stores remain the local source of record per SYN-09, so a revert strands only the inert sync sidecar + namespace prefixes, never data; MG7 revert leaves the local inventory key orphaned — harmless, documented).
