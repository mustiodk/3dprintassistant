# 2026-07-12 — Remote (Claude Code): account-candidate comparison audit + My 3DPA merged plan

## Durable context

- **The owner comparison gate is DONE and the two account-platform candidates are merged into one canonical proposal.** Audit: `docs/reviews/2026-07-12-account-candidates-comparison-audit.md` (9 dimensions, 9 direct contradictions, unique catches preserved from both). Merged decision set: `docs/superpowers/specs/2026-07-12-my3dpa-merged-decision-set.md` (SYN-00–SYN-17) · merged plan: `docs/superpowers/plans/2026-07-12-my3dpa-merged-plan.md` (MG0–MG19, milestones V0–V5 with owner stop points) · review ledger: `docs/reviews/2026-07-12-my3dpa-merged-plan-review.md`.
- **Owner locked four decisions in-session (2026-07-12):** (1) **sync = Pro** (Claude APD13(b) — inventory free/local-first; cloud sync is the one-time unlock; consequence: the iOS purchase rail precedes public sync launch, so web+iOS launch together at V3); (2) **Firebase Auth** for identity (chosen after a pros/cons round — buy-not-build; domain data stays in EU D1, no email in D1, US identity processing disclosed via DPA/SCC evidence); (3) **~15–20 gates** weight class; (4) **full scope in one plan with V1/V2/… milestones so the owner picks the stop point**.
- **Synthesis shape:** Codex's data-model correctness (PDM2 contract-first C0/IC0, entity/op-level sync with server revisions, conflict copies instead of a client merge layer, event-sourced inventory, complete StoreKit 2/ASSN entitlement rail) + Claude's operational minimalism (v1-shaped local stores remain source of record forever — PDM2 only at the sync boundary via a per-namespace sidecar; opt-in-only migration; synchronous export; KV erasure ledger; kill-switch GDPR carve-out; APD14 replica namespaces; policy-before-collection sequencing). Deliberately deleted from both reviewed candidates: P-256 request signing, HMAC graveyard/fenced lifecycle sagas, R2/Queues/DO in v1, per-field rev-map merge layer — each recorded as an accepted deviation that mandates the SYN-17 fresh cross-model round.
- **Review economics:** 3 internal hostile rounds (parallel architecture + QA lanes, fresh-context sub-agents, repo-verified) converged 26 → 12 → 2 findings, all patched. Round-1 QA found a genuine P0 (the MG12 production owner canary had no legal entitlement source — fixed with the registered `PRO_OWNER_GRANT` exception). The K1 lesson held: every round caught real synthesis seams the previous pass missed.
- **ROADMAP now carries the merged plan as a PARKED LOCKED ENTRY POINT** (banner + Active Work Queue row): after the 1.0.7 → 1.0.8 trains, the next platform train starts at **MG0 (owner ratification) + the SYN-17 Codex cross-model round** — no account implementation or external provisioning before both. Both source candidates stay parked as evidence (AP0 superseded by MG0).

## What happened / Actions

1. Cold start per owner ask: read both candidates (specs, plans, review ledgers), NEXT-SESSION, ROADMAP/MD2 anchor; wrote and committed the comparison audit; delivered executive summary + per-dimension recommendations + 4 clarification questions; **stopped for owner permission per the session contract**.
2. Owner answered: sync = Pro · pros/cons requested on identity → Firebase chosen · 15–20 gates · full scope with milestones.
3. Authored the merged decision set + gated plan; ran 3 hostile review rounds (2 lanes → 2 lanes → 1 combined verification), patching between rounds as family commits with finding→hunk mapping in commit bodies.
4. Owner wrap order: ROADMAP banner + merged queue row (locked entry point), candidate rows re-marked as synthesized/parked evidence, NEXT-SESSION regenerated, this log + INDEX entry.

## Files touched

- **Added:** comparison audit, merged decision set, merged plan, merged-plan review ledger, this log.
- **Modified:** `docs/planning/ROADMAP.md` (banner + merged queue row + two candidate-row status flips), `docs/sessions/NEXT-SESSION.md` (regenerated — comparison task closed, locked sequence restated), `docs/sessions/INDEX.md`.
- **No code, engine, data, or external resource touched** (docs-only branch).

## Commits

All on `claude/3dpa-audit-merge-ws1ziw` (remote session; owner merges): `a108bbc` audit → `ddfb35f` merged drafts → `e4cecc7` round-1 fixes (family) → `6b5b30e` round-2 fixes (family) → `3b8c2fd` round-3 fixes + ledger → wrap commit (ROADMAP/NEXT-SESSION/log/INDEX).

## Open questions / Follow-up

- **Owner (when the entry point unlocks):** MG0 ratification of SYN-00–SYN-17 + the registrations with lead time (Firebase projects incl. the multiple-accounts-per-email setting, Apple Services ID/.p8 + SiwA capability, ASC Paid Applications + Pro IAP product + ASSN URLs, Workers-plan record) and the **SYN-17 Codex cross-model round** via the local bridge (append rounds to the merged-plan review ledger; patch until zero P0–P2).
- Deviation note: review fixes landed as per-round family commits, not one-finding-one-commit (40 findings, two doc files); mapping preserved in commit bodies + the ledger — same precedent as the 2026-07-12 accounts-platform session.
- This session ran remotely (Claude Code on the web); the local verify-parents/health-check chain was not run — expect the usual iOS-ahead push-gate warning at next local cold start.

## Next session

Continue the locked release sequence (1.0.7 issue-fix train → 1.0.8 tip jar) unchanged — the My 3DPA merged plan stays parked until the owner opens MG0. When opened: run SYN-17 (bridge) + ratify, then MG1 starts the V0 milestone.
