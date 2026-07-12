# 2026-07-12 — My 3DPA merged decision set + plan: review ledger

**Artifacts:** [`../superpowers/specs/2026-07-12-my3dpa-merged-decision-set.md`](../superpowers/specs/2026-07-12-my3dpa-merged-decision-set.md) (SYN-00…SYN-17) + [`../superpowers/plans/2026-07-12-my3dpa-merged-plan.md`](../superpowers/plans/2026-07-12-my3dpa-merged-plan.md) (MG0–MG19).
**Context:** synthesis of the two parallel account-platform candidates per the owner comparison gate (audit: [`2026-07-12-account-candidates-comparison-audit.md`](2026-07-12-account-candidates-comparison-audit.md)); owner-locked inputs: sync = Pro, Firebase Auth, ~15–20 gates, full scope with V0–V5 milestones.
**Process:** draft → two parallel hostile sub-agent lanes (architecture/consistency + QA/plan-executability, fresh context, repo-verified) → patch → rerun both lanes → patch → one combined verification lane → patch. Reviewers were told the four owner-locked decisions were non-disputable; everything else was fair game, with explicit instructions to hunt the synthesis seams (adopt-by-reference onto deleted machinery, consequences of the SYN-04/-08/-11 simplifications, sync=Pro launch-order coherence).

## Round ledger

| Round | Lens | Findings | Commit |
|---|---|---|---|
| R1 | Architecture (hostile, repo-verified) | 0 P0 · 7 P1 · 12 P2 | `e4cecc7` (family) |
| R1 | QA/executability (hostile, repo-verified) | 1 P0 · 7 P1 · 9 P2 | `e4cecc7` (family) |
| R2 | Architecture (verification + fresh pass) | 0 P0 · 1 P1 · 5 P2 | `6b5b30e` (family) |
| R2 | QA/executability (verification + fresh pass) | 0 P0 · 1 P1 · 6 P2 | `6b5b30e` (family) |
| R3 | Combined verification | **0 P0 · 0 P1 · 2 P2** — both one-sentence clarifications | R3 commit |

Convergence: 26 unique → 12 → 2. All findings dispositioned as fixes (none rejected); finding→hunk mapping is preserved in the three commit bodies.

## Standout catches (why the round was mandatory — the K1 lesson held)

- **R1 QA P0:** the MG12 production owner canary had no executable entitlement source — both offered paths (sandbox purchase, undocumented owner-grant) violated the plan's own invariants. Resolved with the `PRO_OWNER_GRANT` registered exception (built/tested MG11, revoked at MG17 after the owner's real purchase).
- **R1:** several "adopt §x verbatim" references imported machinery the synthesis had deleted (Codex §12.3's free-sync tier + spool caps vs owner-locked sync=Pro; Gate C0's R2 probe/graveyard vectors; Claude §4.3 revocation mechanics presupposing self-built OAuth). All converted to enumerated adoptions with explicit strikes.
- **R1:** the deletion saga as merged either let a live Firebase identity mint a fresh account mid-deletion or left the UID in D1 forever — fixed by adopting Codex §7.5's retained-`users`-row ordering + a `deleting`-sub registration block + a cron retry primitive.
- **R1:** the account-namespace local storage model was undefined (the synthesis had deleted both candidates' answers). Resolved: v1-shaped stores remain the local source of record forever; PDM2 exists only at the sync boundary via a per-namespace sidecar — no PDM2 UI read path is ever built.
- **R2:** the production purchase justifying grant revocation was never produced by any step (sandbox-only paths everywhere); MG17 gained an ordered launch flip list whose first step is the owner's real App Store purchase. The iOS kill switch defaulted off during the very canaries that needed it on.
- **R3:** sandbox-tagged entitlements needed one sentence to reconcile MG16's canary with "sandbox never grants production"; the staging harness needed a real delivery mechanism (`.assetsignore` excludes it from staging too, not just prod).

## Deviation note

Review fixes landed as grouped family commits (one per round), not strictly one-finding-one-commit — 40 findings across three rounds on two doc files; the finding→fix mapping is preserved in each commit body and this ledger (same deviation + justification as the 2026-07-12 accounts-platform precedent).

## Remaining gates before implementation

1. **Owner ratification (MG0):** SYN-00…SYN-17, the Pro price, and the MG0.2/0.3 registration/approval items.
2. **SYN-17 Codex cross-model round** (owner-side `bridge`): this synthesis deliberately deviates from both candidates' reviewed zero-P0 states (dropped request signing, dropped graveyard/lifecycle machinery, sync=Pro launch reordering, synchronous export) — the internal lanes above do not substitute for the cross-model lens (K1 recurrence finding). Patch until zero P0–P2, appending rounds to this ledger.

No product code, engine, data, or external resource was touched; all three artifacts are docs-only on branch `claude/3dpa-audit-merge-ws1ziw`.
