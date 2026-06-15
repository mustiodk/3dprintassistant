# S5 — Assistant autonomy ladder (design spec)

**Date:** 2026-06-15
**Status:** Draft — pending sub-agent review → patch → QA gate
**Topic:** S5 of the feedback-pipeline evolution (S1 · S2 · S3 · S4 · **S5 autonomy ladder**) — the capstone.
**Scope:** the Printer Addition Assistant's **autonomy posture** + a graduation mechanism gated on **S4's calibration evidence** + a branch/review-note/PR workflow. **Process/contract only — no engine, app, data-profile, overlay, or runtime change.**
**Ship path:** docs/contract (ai-om) + a runbook note. **Depends on S4** (the evidence engine).

> Realizes the owner's **"more-automation"** ask as **graduated, earned, reversible** autonomy — *not* blanket trust. Autonomy advances only on objective maturity from S4's calibration + the Scout/reviewer track record, and **safety gates never bend** regardless of rung.

---

## 1. Problem

The Printer Addition Assistant requires **per-candidate owner approval before any commit**, with the owner in the loop at every step (its current `project-writer` posture). As the pipeline's guardrails mature (S3 config + S4 learning loop), that per-candidate gate becomes the **bottleneck**. But autonomy can't simply be *granted* — granting it blanket is how the Aries-overlay collision and the X2D overlay-only mishaps happened. It must be **earned** by demonstrated guardrail maturity and be **reversible** the instant something regresses. Without a defined ladder, autonomy is either all-or-nothing (risky) or never advances (bottleneck forever).

## 2. Approach

A **staged autonomy ladder.** Each rung grants the Assistant *more* initiative, gated on objective maturity metrics drawn from **S4's calibration** + the Scout's track record + reviewer outcomes. The headline rung = the Assistant prepares a complete, reviewed, shippable change on a **branch** with a **review note** and opens a **PR**; the owner's only act is **go/no-go (merge)**. Autonomy is **earned, monitored, and reversible** (a regression demotes a rung). This is graduated trust backed by S4's evidence engine — **the "same project" as S4 in the owner's framing: the loop is the evidence that justifies the autonomy.**

## 3. Scope

**In:** (a) the ladder's **rungs** + each rung's autonomy delta; (b) the **maturity gates** (objective metrics from S4 calibration + Scout/reviewer track record) that promote/demote; (c) the **branch + review-note + PR** workflow for the headline rung; (d) the per-rung amendments to the Assistant contract's **Permission Level**; (e) the **demotion/safety triggers**.

**Out:** the learning loop itself (S4); the Scout's determinism (unchanged); **any removal of a SAFETY gate** (FDM-scope, the validators, the overlay-collision check, new-brand sign-off, the visual-picker check, the iOS push gate — never auto-skipped at any rung); any engine/app change.

## 4. Design

### 4.1 The rungs

- **Rung 0 — Assisted (today).** Per-candidate owner approval before any commit; owner in the loop step-by-step. This is the current contract posture and the **default for any candidate carrying a risk flag** (new brand, app-cap field, source conflict) **at every rung**.
- **Rung 1 — Batch-proposed.** For candidates whose **every field is `confirmed`** (manufacturer-sourced) **and** which carry **no risk flag**, the Assistant prepares the full change set + a review note and presents it for a **single** owner approval (batch), instead of step-by-step. Still owner-approved **before** commit — just less round-trip.
- **Rung 2 — Branch + PR (the headline rung).** The Assistant does the full prep **on a web branch** (never web `main`): edits `data/printers.json` + the overlay + the walkthrough combo, makes the **iOS mirror as a LOCAL iOS-repo commit** (never on the branch, never pushed — §4.5), **runs every validator** (validate-data, picker-dry-run, walkthrough-harness, profile-matrix-audit, the overlay validator, validate-guardrails if the config is touched), writes a **review note**, and **opens a web PR**. The owner's action = **review the PR + go/no-go (merge)**. **The Assistant never merges.** Honest framing: this rung **relocates the owner checkpoint from pre-commit (Rung 0/1) to PR-review** — a real autonomy increase, not pure added rigor; the review-note quality bar (§8.3) is what keeps it from degrading into rubber-stamping.
- **Rung 3 — Auto-merge, narrow class (defined, default-DISABLED).** Restricted to the narrowest class that **touches no overlay payload** — a **bundled-only value re-publish** fully covered by the data-only XCTest waiver — because auto-merging an **overlay** change is the *highest*-risk action on the ladder (the Aries class: validator-green yet runtime-reject on stale baselines), **not** the lowest. Were an overlay publish ever in scope, it would require the **post-deploy live-overlay verification to pass automatically with auto-rollback (`enabled:false` republish) on mismatch**. Even so the safety gates run and any regression **auto-demotes**. **This rung may remain permanently disabled** — defined for completeness, enabled only by an explicit, separate owner decision.

### 4.2 The maturity gates (what earns a promotion)

Objective metrics — **all derived from artifacts S3/S4 already produce; no new telemetry.** The headline gate is the **Assistant's own track record**, not the learning loop's:
- **Assistant outcome quality (the headline gate)** — from **S4's outcomes ledger** (`ownerResolution`): **zero `was-*` corrective signals** (no `was-mis-declined` / `was-duplicate-missed` / `was-brand-typo` / `was-suffix-variant` / `was-noise`) on the Assistant's shipped candidates over the window. This measures whether the *Assistant* prepared correct changes — the right signal for *Assistant* autonomy. *(The S4 **retrospective reject-rate** measures the **learning loop's** proposal quality, not the Assistant's — so it is a **freeze-promotions** trigger (§4.3), **not** a promotion gate.)*
- **Scout true-positive rate (a derived join, not a Scout-report field)** — Scout `needs-research` emissions that proved real novel FDM adds vs. false positives caught downstream. The Scout report emits only outcome **counts** with no downstream truth, so this is a **join** of Scout `needs-research` candidate keys × the S4 outcomes-ledger `ownerResolution`, computed by the retrospective (or a small helper) — **not** read from the Scout report.
- **Reviewer GO-rate** — the adversarial reviewer's GO rate on the Assistant's prepared changes (no un-self-caught NO-GOs in the last N).
- **Config maturity (context, with a stated threshold)** — a **named threshold** (e.g. ≥K ratified aliases/suffixes **and** the last M runs produced no *new* `correctiveSignal` class), not a raw count — a proxy that the deterministic core now handles the common cases.
- **Promotion requires ALL gates green over a sustained window** (N consecutive clean candidates/cycles) **+ explicit owner ratification.** Autonomy is granted, never self-claimed.

### 4.3 Demotion / safety triggers (autonomy is reversible)

- Any **shipped error** (wrong printer, an overlay collision like the Aries bug, a mis-declined FDM printer) → **immediate one-rung demotion + a post-mortem**. **Detection caveat:** "immediate" is from *detection*, not occurrence — the Aries collision was latent ~10 days. So the **automatic** detector for the Aries class is a **RED from the overlay-collision (union-of-baselines) validator** on any prepared change → **freeze + demote**; the general "wrong printer" case can't be fully automated (honest) and rests on the live-verification + the later outcome-ledger signal.
- A reviewer **NO-GO the Assistant didn't self-catch** → demotion.
- The **S4 retrospective reject-rate** crossing the **halt threshold** → **freeze promotions** (the learning loop is misfiring — a reason to pause, per §4.2).
- The owner may **demote at will**, no justification required.

### 4.4 Safety gates that NEVER skip (rung-invariant)

Regardless of rung, these always run — the ladder changes **who initiates** and **how much batching**, **never whether the gates run**:
- the **FDM-scope** check; **validate-data**; **picker-dry-run**; **walkthrough-harness**; **profile-matrix-audit**; the **overlay-collision validator** (the union-of-baselines-≥-min_app_version check from the Aries fix); **validate-guardrails** (when the config is touched); **new-brand explicit sign-off**; the **visual-picker check** for a new brand / new series_group / overlay publish; the **iOS push gate** (iOS mirror stays local; TestFlight owner-dispatched); the **committed-≠-deployed** live-overlay verification.

### 4.5 The branch + review-note + PR workflow (Rung 2)

**Cross-repo split (load-bearing): web and iOS are SEPARATE GitHub repos** (`mustiodk/3dprintassistant` + `mustiodk/3dprintassistant-ios`). The PR is **web-repo only**.
- **Branch** off `main` in the **web** repo (e.g. `intake/<printer-id>`); the Assistant pushes the **web branch only**, never web `main`. The PR contains **`data/printers.json` + the overlay + the walkthrough combo** — **not** the iOS mirror.
- **The iOS bundled mirror stays a LOCAL commit in the iOS repo** (`diff -q` byte-identical), **never on the web branch, never pushed** — exactly as Rung 0 already does. The **iOS push gate is fully preserved** (no iOS remote push, branch or main; TestFlight owner-dispatched). The review note **references** that the local iOS mirror was made + verified; the iOS commit does **not** enter the PR.
- **Review note** (the PR body) — a fixed template: the candidate; **sources + every manufacturer-over-reseller decision recorded**; per-field confidences; **all validator results**; risk flags + how each was cleared; the ship-path; the local-iOS-mirror verification; and the **post-merge live-overlay `content_version` verification** step (committed ≠ deployed).
- **Owner go/no-go** — review the PR, merge or request changes. On merge: web auto-deploys; the overlay republish + live verification is part of the PR's **done criteria**.

### 4.6 Reuse

- **Metrics** come from S4's calibration ledger + the Scout's reports — read them, don't build new telemetry.
- The workflow **reuses the existing adversarial-review dispatch pattern** (the protocol's risk-triggered `requesting-code-review`); the **branch + PR + owner-merge mechanic is net-new** to the Assistant contract (which is pre-commit-approval today) and is the principal autonomy change Rung 2 introduces — the surface most deserving of careful review.

## 5. Affected sites

| Surface | File | Change |
|---|---|---|
| Autonomy ladder | **new** `ai-operating-model/docs/agents/intake-autonomy-ladder.md` | the rungs + per-rung Permission deltas + maturity gates + demotion triggers + the rung-invariant safety list + the promotion/demotion procedure |
| Assistant contract | `ai-operating-model/docs/agents/printer-addition-assistant.md` | reference the ladder; state the per-rung Permission Level deltas; the never-skip safety invariants |
| Review-note / PR template | **new** doc (in the ladder file or `docs/`) | the fixed PR-body template |
| Metric source | S4's **outcomes ledger** (`scripts/printer-intake-outcomes.jsonl`) + `ai-operating-model/docs/agents/intake-retrospective-calibration.md` + Scout reports | read-only inputs to the maturity gates (the **headline** gate reads the outcomes ledger; both are **S4 deliverables**, not S5's) |
| Runbook | `docs/runbooks/printer-addition-protocol.md` | a rung-aware note: the safety gates are unchanged; the ladder governs **initiation + batching**, not the gates |

## 6. Testing / validation strategy

S5 is **process/contract**, so validation = **internal consistency**, not code tests:
- the **safety invariants** (§4.4) are demonstrably **never gated by a rung** — walk a sample candidate through each rung and confirm every gate still fires;
- the **demotion triggers** are defined and reference real signals;
- the **maturity gates** reference **real S3/S4 metrics** (no invented telemetry);
- the **iOS push gate** is preserved at every rung.
The PR workflow is first exercised on a real candidate at Rung 2 **under owner observation** (the promotion to Rung 2 is itself owner-ratified).

## 7. Cross-platform impact (mandatory evaluation)

- **Engine / data-profile / overlay / app:** **none directly.** S5 governs the **process** by which the Assistant proposes data/overlay changes; the changes themselves still pass the same gates. The data/logic-change evaluation is **N/A** — S5 changes process, not data/logic.
- **iOS:** the **iOS push gate is a rung-invariant safety gate** the ladder never relaxes (iOS mirror stays local; TestFlight owner-dispatched) — explicitly preserved at every rung.
- **Web:** web PRs merge → auto-deploy (the existing path); the Assistant opens the PR, the **owner merges**.

## 8. Risks / open questions

1. **Premature autonomy** → the maturity gates + reversible demotion + the rung-invariant safety list.
2. **Metric gaming / small-sample promotion** → sustained windows + owner ratification of each promotion; never promote on a handful of samples.
3. **Owner becomes a rubber-stamp at Rung 2** → the review note must be **genuinely reviewable** (sources, confidences, risk, validator results) so go/no-go is informed; a periodic audit of merged PRs.
4. **Rung 3** → keep **default-disabled**; narrowest class only; auto-demote on any regression; enabling it is a separate explicit owner decision.
5. **Scope vs S4** → S5 **consumes** S4's calibration; it does not build the loop. S5 = graduation; S4 = evidence.
6. **iOS push-gate interaction** → never relaxed; the ladder mostly governs the **web + overlay** ship path (where the Assistant already has push rights) — the branch/PR adds **review rigor** even where push was already permitted.

## 9. Relationship to the rest of the pipeline

S5 is the **capstone**: it turns S4's evidence (calibration, config maturity) into **earned** autonomy for the Assistant, with safety invariants that never bend and demotion that is automatic on regression. Depends on **S4** (the evidence engine). Completes the arc — **S1/S2 capture, S3 robust + config, S4 learn, S5 graduate.**

## 10. Success criteria

- A defined ladder (**rungs 0–2**, with **rung 3 defined-but-default-disabled**) where each rung's autonomy delta is explicit and gated on **objective** maturity metrics from S4 calibration + Scout/reviewer track record.
- **Promotion** requires all gates green over a sustained window **+ owner ratification**; **demotion** is automatic on any regression + owner-at-will.
- The **safety invariants** (FDM-scope, all validators, overlay-collision check, new-brand sign-off, visual picker, iOS push gate, committed-≠-deployed) **never skip** regardless of rung.
- **Rung 2** = the Assistant prepares a complete, reviewed change on a **branch + review note + PR**; **owner go/no-go (merge)**; the Assistant **never merges**.
- Autonomy is **earned, monitored, reversible** — not blanket.
- **No engine/data/overlay/app change** (S5 is process/contract).
- **Commit decomposition:** (1) the ladder definition (rungs + maturity gates + demotion + safety invariants); (2) the review-note/PR template + the Assistant-contract per-rung Permission deltas; (3) the runbook rung-aware note. One finding = one commit (ai-om docs + the runbook).
