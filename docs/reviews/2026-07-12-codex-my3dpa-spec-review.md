# My 3DPA independent spec — review ledger

**Date:** 2026-07-12  
**Target:** `docs/superpowers/specs/2026-07-12-codex-my3dpa-account-cloud-design.md`  
**Status:** complete — architecture, QA, and Claude cross-model all report zero P0–P2  
**Independence boundary:** reviewers were prohibited from opening Claude PR #16's accounts-platform spec, plan, session log, review, or bridge artifacts. Cross-model runs used an isolated git repository containing only the Codex spec.

## Protocol

1. Commit the independent draft as a fixed baseline.
2. Run two read-only subagent lanes:
   - product/architecture/auth/security/privacy;
   - QA/implementability/migration/rollback/testability.
3. Run Claude through `bridge --mode claude-only` in the isolated review repository.
4. Patch every actionable finding; one finding/theme per commit.
5. Repeat on the updated file until architecture, QA, and cross-model all report zero P0–P2.

No product code or external cloud resource was created during this review.

## Cross-model rounds

| Artifact | Result at that snapshot | Main newly exposed classes |
|---|---|---|
| `bridge-2026-07-12-020701-447282.md` | P0–P2 remained | DR erasure, tombstone resurrection, DPAs/SCCs, batch causality, purchases |
| `bridge-2026-07-12-021849-847302.md` | P0–P2 remained | JWKS caching, browser key recovery, async export, outbox rewrites, grace window |
| `bridge-2026-07-12-023312-850621.md` | P0–P2 remained | UUID namespaces, signed restore envelope, schema negotiation, local-backup cleanup |
| `bridge-2026-07-12-024428-082625.md` | P0–P2 remained | intermediate focused verification |
| `bridge-2026-07-12-024719-617257.md` | P0–P2 remained | API/auth exceptions, export acknowledgement/snapshot, projections |
| `bridge-2026-07-12-025502-027720.md` | P0–P2 remained | entity deletion across DR, export TTL, App Store account token |
| `bridge-2026-07-12-030515-628030.md` | P0–P2 remained | snapshot ID encoding, capability transport, graveyard HMAC, device/account creation |
| `bridge-2026-07-12-031110-285536.md` | P0–P2 remained | graveyard blob, signed-request result cache, snapshot GC |
| `bridge-2026-07-12-032022-486648.md` | P0–P2 remained | lifecycle reference fencing |
| `bridge-2026-07-12-032743-964845.md` | P0–P2 remained | lease reconciliation and conditional decision races |
| `bridge-2026-07-12-033503-425910.md` | P0–P2 remained | purchase-retention conflict and missing graveyard key behavior |
| `bridge-2026-07-12-043806-436181.md` | P0–P2 remained | kind-specific ID schema, lifecycle retry caching, internal GC actor |
| `bridge-2026-07-12-050336-262997.md` | empty output; invalid gate | rerun required because no verdict was emitted |
| `bridge-2026-07-12-051118-986229.md` | **`VERDICT: ZERO P0-P2`** | final current-file cross-model gate |

The timestamped bridge files remain in the isolated `/tmp/my3dpa-spec-review-output/` workspace during the session. This committed ledger records the durable conclusions without importing any quarantined Claude solution artifact.

## Remediation themes

The initial draft is commit `9d23ae9`. The final reviewed spec accumulated 101+ isolated remediation commits during the loop. High-impact closures include:

- permanent graveyard membership plus cursor-expiry/bootstrap semantics;
- lossless unknown-field writes and normative cross-platform JSON Schemas;
- device P-256 request signing, key rotation, replay counters, and device revocation;
- resumable account deletion with external account/entity lifecycle evidence;
- causal, fenced `delete | neutral_reset | reactivate` lifecycle actions;
- lease recovery with a single-winner external decision object;
- lifecycle-generation ordering separated from sync revisions and later-update dominance;
- request-scoped durable sync results and a single-op async lifecycle endpoint;
- immutable revision-consistent, signed, encrypted, asynchronously downloadable account export;
- explicit export/delete coordination, verification receipt, and retention;
- portable-import version reset, per-kind collision rules, and graph-safe outbox reconciliation;
- event-authoritative inventory accounting/projections with bounded arithmetic;
- server-authoritative StoreKit/Play validation, restore purchases, grace, downgrade, and minimal purchase retention;
- concrete Day-1 quotas, cost model, fail-closed JWKS/CSP/graveyard-key behavior;
- Gate C0 ownership and acceptance for the portable contract.

## Current subagent verdicts

| Lane | Latest verdict |
|---|---|
| Architecture/security | **`ZERO P0-P2`** on final file |
| QA/implementability | **`ZERO P0-P2`** on final file |
| Cross-model Claude | **`VERDICT: ZERO P0-P2`** — `bridge-2026-07-12-051118-986229.md` |

## Gate rule

Gate passed. The isolated current-file Claude rerun literally reported `VERDICT: ZERO P0-P2`; both internal lanes independently reported the same. The implementation-plan gate may begin from this exact spec revision.
