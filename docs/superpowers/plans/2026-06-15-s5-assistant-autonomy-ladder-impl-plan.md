# S5 — Assistant autonomy ladder: implementation plan

**Date:** 2026-06-15
**Status:** Draft — pending sub-agent review → patch → QA gate
**Spec:** [`../specs/2026-06-15-s5-assistant-autonomy-ladder-design.md`](../specs/2026-06-15-s5-assistant-autonomy-ladder-design.md) (QA-green — the headline maturity gate reads S4's **outcomes-ledger `was-*` rate** [not the retrospective reject-rate]; the Rung-2 PR is **web-repo only**, iOS mirror stays a local iOS-repo commit)
**Topic:** S5 of the feedback-pipeline evolution — the capstone.
**Scope:** `ai-operating-model/docs/agents/` + a 3dpa runbook note. **Process/contract only — no engine, app, data-profile, overlay, or runtime change.**
**Ship path:** docs/contract. **Depends on S4** (the evidence engine) **+ S3**.
**Commit decomposition:** **3 commits** (2 ai-om + 1 3dpa runbook).

> **EXECUTION IS DEFERRED, and GATED ON S4 (→ S3).** The maturity gates read S4's outcomes ledger + calibration — **no data exists until S4 produces it**, so until S4 lands the ladder is *defined but dormant*: the Assistant stays at **Rung 0 (today's posture)** and **no promotion is possible**. This plan describes the gates for when S4 has landed and execution is authorized.

---

## 0. Preconditions & grounded context

- **Spec QA-green.** Both review must-fixes folded: the headline gate is the **Assistant's own track record** (outcomes-ledger `was-*` rate), and the Rung-2 branch+PR is **web-repo-only** with the iOS mirror staying a local iOS-repo commit (the iOS push gate is fully preserved).
- **Hard dependency: S4 must land first** (the outcomes ledger + calibration), which depends on S3. Without S4's ledger, the maturity gates have no data and the Assistant cannot leave Rung 0.
- **Cross-repo reality (load-bearing):** web (`mustiodk/3dprintassistant`) and iOS (`mustiodk/3dprintassistant-ios`) are **separate GitHub repos** — verified. A web PR cannot contain an iOS commit; an iOS branch push would violate the iOS push gate.
- **No code:** S5 is process/contract; "QA" = **internal consistency** (every safety gate verified to exist + never rung-gated; metrics sourced from real S3/S4 artifacts; iOS push gate preserved at every rung).

---

## 1. Gates

Each gate: **implement → sub-agent review → patch → gate QA (internal-consistency) → commit.** Advance only on green.

### Gate 1 — The ladder definition (ai-om)

**Files:**
- **new** `ai-operating-model/docs/agents/intake-autonomy-ladder.md`:
  - the **rungs** — 0 (assisted, today) / 1 (batch-proposed, confirmed-fields-no-risk) / 2 (web-branch + PR, iOS mirror local-only, never-merge) / **3 (auto-merge, default-DISABLED, bundled-only no-overlay class)**;
  - the **maturity gates** — **Assistant outcome quality** (headline: zero `was-*` corrective signals on shipped candidates, from S4's outcomes ledger) + the **derived** Scout true-positive join (Scout `needs-research` keys × S4 `ownerResolution`) + reviewer GO-rate + a **named** config-maturity threshold;
  - the **demotion triggers** — shipped error → demote (with the honest detection-lag caveat; the **overlay-collision-validator RED** is the automatic Aries-class detector) / un-self-caught reviewer NO-GO → demote / S4 reject-rate halt → freeze promotions / owner-at-will;
  - the **rung-invariant safety list** (§4.4 of the spec) — each item verified to exist in the protocol/contract;
  - promotion = **owner-ratified over a sustained window**; demotion = **automatic on regression + owner-at-will**.
- **Gate 1 QA (internal-consistency):** every safety gate that exists in the *shipped* protocol/contract is confirmed real in `printer-addition-protocol.md` / the Assistant contract; gates that are themselves **S3/S4 deliverables** (`validate-guardrails`, the outcomes ledger) are confirmed to exist **because S4 has landed** (the execution precondition) — *not* invented by S5; **no rung bypasses one**; the **overlay-collision validator runs whenever the overlay is touched** (a bundled-only change has no overlay to collide — which is *why* Rung 3 is the no-overlay class, not a bypass); the **iOS push gate is preserved at every rung** (incl. Rung 2/3); the maturity metrics reference **real** S3/S4 artifacts (the outcomes ledger is an S4 deliverable, not invented telemetry); Rung 3 touches **no overlay payload**.
- **Commit (ai-om):** `docs(intake): autonomy ladder — earned, reversible, safety-invariant (S5)`.

### Gate 2 — Review-note/PR template + Assistant per-rung Permission deltas (ai-om)

**Files:**
- **Precondition:** S4's Gate 1 has already amended this contract's Permission Level (adding the outcomes-ledger write → **5 scoped paths**, not the pre-S4 4); Gate 2's deltas **extend that post-S4 section**, not the stale 4-path version.
- `ai-operating-model/docs/agents/printer-addition-assistant.md` — reference the ladder; state the **per-rung Permission Level deltas** (Rung 0 = today's per-candidate-approval; Rung 1 = single batch approval for confirmed-no-risk; Rung 2 = web-branch push + PR, **iOS mirror local-only**, **never merge**); restate the **never-skip safety invariants** + the **cross-repo split** (web PR only); **TIGHTEN the Forbidden Action "Pushing the iOS repo to `main`" → "Pushing the iOS repo (branch OR main)"** — Rung 2 introduces branch pushes, so the existing main-only wording leaves an iOS-branch-push hole an additions-only diff check would miss.
- the **review-note / PR-body template** (in the ladder file or a sibling doc): candidate; sources + manufacturer-over-reseller decisions; per-field confidences; all validator results; risk flags + clearance; ship-path; local-iOS-mirror verification; the committed-≠-deployed live-overlay verification step.
- **Gate 2 QA (internal-consistency):** the contract deltas **relax no safety gate** (FDM-scope, validators, overlay-collision check, new-brand sign-off, visual picker, iOS push gate, committed-≠-deployed all intact); the cross-repo split is correct (no implied iOS push); the **no-iOS-push invariant is closed against *branch* pushes** (the Forbidden Action now reads "branch or main"), **not just main** — "additions only" is insufficient here, this gate requires a deliberate *strengthening*; otherwise `git diff` shows only additions + the per-rung deltas + that one tightening, with no deletion of any other Forbidden Action.
- **Commit (ai-om):** `docs(assistant): per-rung permission deltas + review-note/PR template (S5)`.

### Gate 3 — Runbook rung-aware note (3dpa)

**Files:**
- `docs/runbooks/printer-addition-protocol.md` — a **rung-aware note**: the safety gates (Phase 1 FDM-scope, Phase 3 validators, Phase 4b overlay-collision) are **unchanged**; the ladder governs **initiation + batching**, never **whether** a gate runs.
- **Gate 3 QA:** the note alters **no** existing gate; consistent with the ladder.
- **Commit (3dpa):** `docs(runbook): rung-aware note — ladder governs initiation, not the gates (S5)`.

---

## 2. Verification gate

- **Process/contract → internal-consistency walk:** trace a sample candidate through each rung and confirm **every** safety gate fires regardless of rung, the **iOS push gate** is preserved, and the maturity metrics are sourced from **real** S3/S4 artifacts. **No code tests** (nothing executable changes).
- The Rung-2 PR workflow is first exercised on a **real candidate under owner observation** (the promotion to Rung 2 is itself owner-ratified).

---

## 3. Cross-platform impact (mandatory evaluation)

- **Engine / data-profile / overlay / app:** **none directly.** S5 governs the **process** by which the Assistant proposes changes; the changes still pass the same gates. Data/logic-change evaluation: **N/A** — process, not data/logic.
- **iOS:** the **iOS push gate is a rung-invariant safety gate** — preserved at every rung (iOS mirror local-only; TestFlight owner-dispatched).
- **Web:** web PRs merge → auto-deploy (existing path); the Assistant opens the PR, the **owner merges**.

---

## 4. Risks & fallbacks (from spec §8)

| Risk | Plan handling |
|---|---|
| Premature autonomy | maturity gates + reversible demotion + the rung-invariant safety list |
| Metric gaming / small sample | sustained windows + owner ratification of each promotion |
| Owner rubber-stamps at Rung 2 | the review note must be genuinely reviewable; periodic PR audit |
| Rung 3 risk | default-disabled; bundled-only no-overlay class; auto-demote on regression |
| Wrong S4 signal | headline gate reads the outcomes-ledger `was-*` rate (Assistant track record), not the retrospective reject-rate |

---

## 5. Ship sequence (when executed — after S4 lands)

1. Gate 1 (ladder) → ai-om commit. 2. Gate 2 (Assistant deltas + template) → ai-om commit. 3. Gate 3 (runbook note) → 3dpa commit.
- Docs only; **no web-functional / iOS / overlay / TestFlight.**

---

## 6. Done criteria (plan-level)

- [ ] Gate 1: ladder defined; **every** safety invariant verified-real + **never rung-bypassed**; metrics sourced from real S3/S4 artifacts; Rung 3 no-overlay + default-disabled.
- [ ] Gate 2: Assistant per-rung deltas + PR template; **no safety relaxation**; cross-repo split correct; **iOS push gate intact**.
- [ ] Gate 3: runbook rung-aware note; existing gates unchanged.
- [ ] No engine/data/overlay/app change.

---

## 7. What this plan deliberately does NOT do

- It does **not** execute (no code until owner go **and** S4 landed).
- It does **not** relax any safety gate at any rung.
- It does **not** push iOS (branch or main) — the iOS mirror stays a local iOS-repo commit.
- It does **not** enable Rung 3 (defined, default-disabled; a separate explicit owner decision).
