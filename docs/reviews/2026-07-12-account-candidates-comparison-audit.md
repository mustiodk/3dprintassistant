# 2026-07-12 — Account-platform candidates: comparison audit (Claude vs independent Codex)

**Status:** audit complete — awaiting owner clarifications + GO before the merged/synthesized plan is authored.
**Task source:** `docs/sessions/NEXT-SESSION.md` (owner comparison gate).
**Candidate A (Claude, 2026-07-11):** spec `docs/superpowers/specs/2026-07-11-accounts-platform-design.md` (APD0–APD15) · plan `docs/superpowers/plans/2026-07-11-accounts-platform-plan.md` (AP0–AP11) · review `docs/reviews/2026-07-11-accounts-platform-review.md` (17 Codex rounds + 3 sub-agent lenses → GO).
**Candidate B (Codex, 2026-07-12, independent):** spec `docs/superpowers/specs/2026-07-12-codex-my3dpa-account-cloud-design.md` · plan `docs/superpowers/plans/2026-07-12-codex-my3dpa-account-cloud-plan.md` (G0/O0/C0…M0) · reviews `docs/reviews/2026-07-12-codex-my3dpa-spec-review.md` + `-plan-review.md` (architecture + QA + isolated cross-model, all zero P0–P2).

Both candidates are review-hardened and internally consistent. **Neither "zero findings" verdict compared the candidates against each other** — each ladder validated its own frame. This audit is that missing comparison.

---

## 1. Executive summary

The two candidates optimize for different objective functions:

- **Claude optimizes for solo-dev operational survivability and time-to-value.** Single vendor (Cloudflare only), no local-store migration, ~12 gates, dumb versioned-document server, everything scoped to "near-zero maintenance" (its constraint §1.5.6). Its cost: it self-builds the single riskiest component (OAuth/session/link/revocation — its own #1 HIGH risk), and its mutable-document inventory model is weaker under concurrent multi-device consumption.
- **Codex optimizes for long-term correctness and platform breadth.** Contract-first PDM2 (JSON Schema + cross-platform fixtures — a perfect match for 3dpa's byte-mirror culture), event-sourced inventory (correct under concurrency), Firebase offloads auth liability, complete entitlement/StoreKit design, real cost model. Its cost: enterprise-grade machinery (P-256 signed requests, fenced lifecycle sagas with external decision objects, HMAC graveyard buckets, DR reconcilers) and a ~40-gate program with multi-day soaks/canaries that likely runs 2–3× Claude's calendar — heavy for a solo hobbyist at 3dpa's traffic scale.

**Verdict: neither should be executed as-is.** The strongest synthesis takes **Codex's data-model correctness** (PDM2 contract, entity/op-level sync, event-sourced inventory, buy-not-build identity) and **Claude's operational minimalism** (lean gate count, no forced signed-out migration, synchronous-first export, kill-switch GDPR carve-out, privacy-policy-before-collection sequencing, shared-device namespace semantics), and drops each candidate's over/under-engineered extremes.

## 2. Dimension-by-dimension comparison and recommendation

| # | Dimension | Claude (A) | Codex (B) | Recommendation |
|---|---|---|---|---|
| 1 | **Free vs Pro boundary** | APD13, recommends **(b) sync = Pro**; inventory local-first free. Argues shipping sync free irreversibly burns it as a Pro anchor (MD0 no-retro-paywall). | **Sync free**; Pro = advanced inventory (free cap 50 active spools; lifetime ~99 DKK). | **OWNER DECISION — the one true fork.** Audit lean: **Codex** — it preserves MD2's *ratified* inventory anchor, avoids coupling public sync launch to an iOS IAP rail (Claude's (b) forces web users to buy on iOS), and the cost model shows sync ≈ free at hobby scale. Counter-argument (Claude's, valid): sync is the only feature with real recurring cost, and free-shipping it is irreversible under MD0. |
| 2 | **Identity** | Self-built OAuth in Worker: SiwA (Services ID, ES256, form_post) + Google, JWT + rotating refresh, two-phase PKCE+receipt link protocol, Apple revocation outbox. | Firebase Auth (identity only); Worker verifies ID tokens; no email in D1; domain data never in Firebase. | **Codex (buy, don't build).** Auth is Claude's own top HIGH risk; the sheer intricacy of its link/revocation protocol is evidence. Firebase costs a second vendor + US identity processing (DPA/SCC disclosure) — accept it. **Carry over from Claude:** the SiwA token-revocation-on-deletion diligence (verify Firebase's Apple-revocation path explicitly — under-specified in the Codex spec) and identity = provider `sub`, never email (both agree). |
| 3 | **Device trust layer** | None beyond sessions (device registry only for tombstone acks). | P-256 Secure-Enclave/Keystore keys, ECDSA-signed requests, monotonic counters, cached mutation results, key-rotation/lost-device flows. | **Synthesize (simplify).** Keep device registration + device IDs (needed for sync watermarks/device management). ECDSA request signing on top of Firebase bearer tokens is the most over-engineered piece at this scale — replace with bearer + per-op idempotency keys, and record it as an explicit accepted-risk owner decision (Codex's zero-P0 state assumed signing, so this deviation needs one fresh review pass). |
| 4 | **Sync & conflict semantics** | Whole-document versioned sync (256 KB cap), server dumb, NEW client-side per-field rev-map merge layer byte-mirrored on both platforms (its largest new component). | Entity/op-level sync, server-assigned per-user revisions, field-mask updates, append-only union, **visible conflict copies** for mutable kinds (field-level merge deliberately rejected). | **Codex, trimmed.** Entity-level with server revisions is clearly right for append-only kinds (outcomes, tuning ops, inventory events) and avoids the 256 KB whole-doc cliff. For mutable kinds, Codex's conflict-copy is *simpler and safer* than Claude's deterministic per-field merge — it eliminates the cross-platform merge-fixture layer entirely (Claude's plan sized it at AP5=2 + I2=2 sessions). Cut from Codex: the fenced lifecycle saga/external-decision-object machinery can shrink once request signing goes (see #3) — deletes become ordinary tombstone ops + the graveyard check. |
| 5 | **Local data model & migration** | Keep existing storage keys untouched; additive rev/deletion-ledger metadata; sync envelope wraps the shipped backup format. Signed-out users never migrate. | Full local v1→PDM2 migration (web IndexedDB, journal un-nesting, legacy-ID UUID-v5 remap, receipted transition backups, 30-day cleanup) **before** sync. | **Synthesize.** Adopt PDM2 as the *portable/sync contract* (C0 contract-first gate is a keeper), but **migrate only on sync opt-in** — signed-out users stay on today's stores forever (Claude's posture). Journal un-nesting happens in the sync adapter, which entity-level sync genuinely requires. This removes the riskiest mandatory step (migrating every existing user with no benefit to them). |
| 6 | **Inventory model** | Mutable spool document incl. `weight_g_remaining_est`, per-field rev merge; full bambuinventory field port with `import_meta` lossless passthrough; real-`api.php`-fixture validation. | Spool = immutable-ish metadata; remaining/status/location derived **only** from append-only `inventory_event` sum; typed mg invariants; projections; CSV formula-injection safety; idempotent import IDs. | **Codex — clear correctness winner** (two devices consuming the same spool is the *normal* case; per-field merge on a mutable weight loses consumption). **Carry over from Claude:** the ratified field-by-field bambuinventory mapping table, `import_meta` opaque passthrough, and export→import→export round-trip fixture against the owner's real data. |
| 7 | **My 3DPA hub UX** | Lean profile page v1: identity/link, per-doc sync status, summaries, cloud export, delete, sign out. | 7-section hub (Overview/Workshop/Filament/Printers/Exports/Sync/Account) + export recipe/history library (X gates) + signed-out "On this device" framing. | **Synthesize.** Codex's naming ("My 3DPA", not "Profile") + signed-out "On this device" framing + conversion-moment rule are good product thinking; ship **Claude's lean content set first** inside that frame. Export library (X0/IX0) and Printers section → post-v1 backlog (Codex's own graph already keeps X off the critical path). |
| 8 | **Export / deletion / backup / DR** | Synchronous export; KV deletion log (outside D1 restore boundary); Apple revocation outbox; restore-replay script + rehearsal; **kill-switch GDPR rights carve-out** (rights usable, not just routable). | Async Queue/R2 export jobs with signed+AES-GCM artifacts and verify receipts; cross-vendor deletion saga; R2 erasure ledger; capability status tokens; DR promotion blockers. | **Synthesize by scale.** Cross-vendor deletion saga is unavoidable once Firebase is in (Codex). Erasure record outside the D1 restore boundary + restore-must-replay-deletions + rehearsal: both agree — keep. **Simplify:** synchronous export while accounts are small (payloads ≤ a few MB), with Codex's async job design recorded as the scale trigger; drop the signed-envelope/KEK machinery from v1 accordingly. Keep Claude's kill-switch rights carve-out wording verbatim. |
| 9 | **Rollout & platform sequencing** | Web gates flags-off → AP9: policy live → prod dark window → UI on; iOS train after 1.0.7/1.0.8 (1.1.0); Android seed line; staging = Access-gated + notice + purge. | Owner staging soak (7d) → O1 prod dark → R0a/R0b owner canaries (48h each) → R0c 5%→25%→100%; iOS 7-day production-backed TestFlight soaks per release gate; Android v1.1; macOS shared packages. | **Synthesize.** Keep the *shape* owner-canary → public (Codex) but trim to hobby scale: percentage rollouts are unmeasurable at 3dpa traffic (5% ≈ a handful of users) — owner canary + single public flip. Keep Claude's hard sequencing rule **privacy policy live before any prod collection** (the C14–C16 catch) and its staging Access-gate/notice/purge detail; merge with Codex's B1 Firebase-staging evidence discipline. Platform order is identical in both: web → iOS (own train, after 1.0.7/1.0.8) → Android v1.1 → macOS. |
| 10 | **Gate granularity, cost, ops load** | ~12 gates; est. 10–14 web sessions + ≥7 iOS; one PR per gate; review before merge. | ~40 atomic gates + signed ledger transitions, scope allowlists, per-gate exact commands, multi-day soaks; likely 2–3× calendar. | **Synthesize at ~15–20 gates.** Keep Codex's discipline artifacts (gate ledger, per-gate scope allowlist, exact command + evidence rows, `npm ci`/pinned toolchain G0) — they are cheap and prevent drift. Collapse micro-gates (A1a–c→2, S0a–d→2); drop X/M/E0c from the v1 program. Keep Claude's honest per-gate session estimates. |

## 3. Direct contradictions (must be resolved, not averaged)

1. **Sync free vs sync = Pro** (dimension 1) — opposite recommendations; owner decision.
2. **Build vs buy identity** — Claude Worker-native OAuth vs Codex Firebase. (Rec: Firebase.)
3. **Server-dumb vs server-authoritative sync** — Claude "server never merges, no Workshop semantics server-side" vs Codex server-assigned revisions + per-kind validation + projections. (Rec: server-authoritative revisions; server still never runs engine logic — both agree on that.)
4. **Silent deterministic merge vs visible conflict copies** for mutable records. (Rec: conflict copies.)
5. **Mutable remaining-weight vs event-derived balance** for spools. (Rec: event-derived.)
6. **Mandatory local migration vs keep-keys-forever.** (Rec: migrate only on sync opt-in.)
7. **Email in D1** — Claude stores it as metadata; Codex stores none. (Rec: none, enabled by Firebase.)
8. **R2/Queues/Durable-Objects in v1** — Claude: explicitly not needed; Codex: required (export artifacts, erasure ledger, lifecycle coordination). (Rec: R2 only for the erasure ledger; Queues/DO out of v1 with the simplifications above. Claude's KV deletion log is an acceptable cheaper alternative if R2 is dropped entirely.)
9. **Rollout weight** — dark-launch + smoke vs canary/percentage/soak program. (Rec: middle.)

## 4. Unique catches worth keeping regardless of synthesis

**From Claude:**
- Asset exposure: `functions/**`, `worker.js`, `wrangler.toml` publicly fetchable on the live site today (AP0.5 owner decision) — applies to every candidate.
- Privacy-policy **rewrite** (current `privacy.html` explicitly denies collecting name/email/User ID — appending a paragraph is not enough) + iOS App Privacy label being the app's first.
- Kill-switch GDPR carve-out: export/delete/refresh/logout reachable AND usable with flags off, tested post-token-expiry.
- APD14 replica namespaces: shared-device (family iPad) isolation, sign-out hides account data, tombstones never cross namespaces — the Codex spec covers account/device scoping but not the shared-device UX this explicitly.
- Flags as Worker **secrets** not `[vars]` (git-connected deploys silently re-apply `[vars]`).
- Staging: Cloudflare Access-gated, corrected privacy notice pre-consent, scripted post-E2E purge.

**From Codex:**
- Gate C0 contract-first: checked-in JSON Schemas + manifest hash + cross-platform fixture conformance (IC0 Swift parity before merge) — institutionalizes 3dpa's byte-mirror rule for the new domain.
- Event-sourced inventory + typed invariants + projection-as-disposable-cache.
- Concrete cost/capacity model with alert thresholds and a global write breaker.
- Complete entitlement design (StoreKit 2 JWS + ASSN v2, `appAccountToken` binding, purchase-retention GDPR carve-out, restore purchases, 7-day offline grace, non-destructive over-limit state).
- CSV formula-injection defense; market boundary analysis (don't chase SimplyPrint/Obico).
- G0 pinned toolchain (`package-lock`, wrangler version drift check) + canonical gate ledger with structural validation.

## 5. Process observations

- Both ladders converged asymptotically (Claude: 17 rounds; Codex: 101+ remediation commits, 14 bridge rounds) — consistent with the K3 finding (budget O(10+) rounds for greenfield multi-domain specs).
- The K1 recurrence (subagents green while the bridge still found 3 P2s) argues the **merged plan must get its own fresh cross-model review pass** — synthesis creates new seams neither ladder ever saw, and several recommended simplifications (dropping request signing, sync export, trimmed lifecycle) deviate from the reviewed zero-P0 states.
- Both plans are docs-only to date; nothing is provisioned or live. The existing release sequence (Export Phase 3/4 shipped; 1.0.7 train; 1.0.8 tip jar) is untouched by this audit.

## 6. Owner clarifications required before the merged plan is authored

1. **Free-vs-Pro boundary** (contradiction #1): (i) Claude (b) sync = Pro, (ii) Codex sync free + Pro = advanced inventory *(audit lean)*, (iii) everything free (Claude (a)), or (iv) defer with a written default. The merged plan's AP4+/R-gates change shape with this answer.
2. **Firebase as second vendor:** accept Firebase Auth (US identity processing, Google DPA/SCC disclosures) to avoid self-built auth — yes/no. A "no" flips the whole identity half back to Claude's design.
3. **Weight class:** lean (~12 gates), full (~40 gates + soaks), or the recommended middle (~15–20 gates, owner canary, trimmed soaks).
4. **v1 scope:** export recipe/history library + Printers hub section in the first program, or backlog *(audit lean: backlog)*.
