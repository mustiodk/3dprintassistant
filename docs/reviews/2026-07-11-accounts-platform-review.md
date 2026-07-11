# 2026-07-11/12 — Accounts Platform: review dispositions

**Artifacts under review:** [`../superpowers/specs/2026-07-11-accounts-platform-design.md`](../superpowers/specs/2026-07-11-accounts-platform-design.md) + [`../superpowers/plans/2026-07-11-accounts-platform-plan.md`](../superpowers/plans/2026-07-11-accounts-platform-plan.md).
**Process:** Work Protocol Full lane (accounts + payment-adjacent + cross-platform architecture + owner "komplet" ask). Draft → hostile sub-agent review → patch → 12 Codex cross-model rounds (`bridge --mode codex-only`) patch-until-clean → plan-level hostile sub-agent review → QA verification review. One review-family per commit (deviation from strict one-finding-one-commit surfaced in the session log: single-file doc patches, finding→hunk mapping preserved in commit bodies + this file).

## Round ledger

| Round | Reviewer | Findings | Verdict | Report |
|---|---|---|---|---|
| S1 | Hostile sub-agent (fresh context, code-verified) | 2 P0 · 6 P1 · 6 P2 · 2 P3 | NO-GO | (agent output; dispositions in commits `8a80c5b`,`b6f5d55`,`1aee6cc`,`74798e6`) |
| C1 | Codex | 12 P1 · 4 P2 | NO-GO | [bridge R1](bridge-2026-07-12-000932-423960.md) |
| C2 | Codex | 12 P1 · 3 P2 | NO-GO | [bridge R2](bridge-2026-07-12-002253-557468.md) |
| C3 | Codex | 5 P1 · 3 P2 | NO-GO | [bridge R3](bridge-2026-07-12-003135-436387.md) |
| C4 | Codex | 3 P1 | NO-GO | [bridge R4](bridge-2026-07-12-003802-798321.md) |
| C5 | Codex | 2 P1 | NO-GO | [bridge R5](bridge-2026-07-12-004243-921239.md) |
| C6 | Codex | 1 P1 · 1 P2 | NO-GO | [bridge R6](bridge-2026-07-12-004604-036303.md) |
| C7 | Codex | 1 P2 | GO-WITH-PATCHES | [bridge R7](bridge-2026-07-12-004842-215591.md) |
| C8 | Codex | 1 P1 · 1 P2 | NO-GO | [bridge R8](bridge-2026-07-12-005152-604933.md) |
| C9 | Codex | 1 P1 · 1 P2 | NO-GO | [bridge R9](bridge-2026-07-12-005522-213511.md) |
| C10 | Codex | 2 P1 · 1 P2 | NO-GO | [bridge R10](bridge-2026-07-12-005847-560408.md) |
| C11 | Codex | 1 P1 | NO-GO | [bridge R11](bridge-2026-07-12-010151-529430.md) |
| C12 | Codex | **0** | **GO** (pre-plan-review text) | [bridge R12](bridge-2026-07-12-010408-567552.md) |
| P1 | Hostile sub-agent — plan executability lens | 6 P1 · 7 P2 · 3 P3 | GO-WITH-PATCHES | (agent output; dispositions in `d4234f3`) |
| QA | Fresh sub-agent verification pass | 6 P2 · 5 P3 | QA PASS WITH FIXES | (agent output; fixes in the R13 commit) |
| C13 | Codex (post-plan-review) | 4 P2 | GO-WITH-PATCHES | [bridge R13](bridge-2026-07-12-011745-160275.md) |
| C14 | Codex | 1 P1 · 1 P2 | NO-GO | [bridge R14](bridge-2026-07-12-012146-391881.md) |
| C15 | Codex | 1 P1 · 1 P2 | NO-GO | [bridge R15](bridge-2026-07-12-012603-788200.md) |
| C16 | Codex | 1 P1 · 1 P2 | NO-GO | [bridge R16](bridge-2026-07-12-013039-121715.md) |
| C17 | Codex | **0** | **GO (final)** | [bridge R17](bridge-2026-07-12-013643-068458.md) |

## Standout catches (why the ladder earned its cost)

- **Sub-agent P0:** the sync design's claimed reuse of "shipped op-union merge machinery" was factually false against `workshop-store.js` — only the tuning op-union exists; the real merge is incoming-wins and loses data in the basic two-device conflict. The merge layer was re-specced as new cross-platform code (per-field revs, tombstones, deletion ledger).
- **Sub-agent P0:** shipping inventory + sync free would have silently and irreversibly gutted the owner-ratified MD2 "3dpa Pro" anchor → now an explicit owner decision (APD13, recommendation (b): sync = Pro).
- **Codex:** wall-clock LWW → deterministic per-field revs; time-based tombstone compaction → ack-based with compaction watermark; deletion log moved out of the database it was meant to repair (D1 → KV); Apple revocation outbox with per-client grants; recycled-email account-takeover closed (identity = `(provider, sub)` only); two-phase PKCE+receipt link flow; kill switch made GDPR-usable, not just GDPR-routable.
- **Non-overlap:** the sub-agent found the two P0s (reuse-claim falsity, monetization conflict); Codex found none of those but owned the protocol-correctness ladder. Same pattern as prior 3dpa reviews — the two lenses do not substitute for each other.
- **Plan-executability lens (P1):** an uncheckable AP1 exit gate, an undefined kill-switch mechanism colliding with git-connected `[vars]` re-application, an uncreated KV namespace on the deletion path, publicly-served `functions/`/`worker.js`/`wrangler.toml` on the live site TODAY (pre-existing exposure surfaced to the owner at AP0), and a rule consuming a test six gates before it exists — exactly the class spec-centric rounds don't see.
- **Late-round dividends (C14–C16):** prod dark launch before the privacy-policy rewrite would have collected data the live policy denies collecting; preview OAuth was unexecutable without registered staging callbacks; staging itself then needed Access-gating + notice + purge. Convergence was asymptotic — each patch exposed one smaller consequence — matching the altitude-based convergence heuristic (`feedback_cross_model_review_convergence_altitude`).

## Outcome

Spec + plan are ratification-ready: **Codex GO (C17, 0 findings)** + QA PASS + both hostile sub-agent rounds dispositioned. Execution is gated on **owner AP0** (APD0–APD15, esp. APD13). No code, engine, or data was touched in this session (docs-only; Codex independently verified 90/90 API tests + golden no-drift on the untouched tree).
