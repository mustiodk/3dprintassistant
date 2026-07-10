# Intake Autonomy v2.1 — Evidence provenance, retry semantics, and the run retrospective (design spec)

**Date:** 2026-07-10
**Status:** DRAFT v2 (hostile-reviewed — GO-WITH-PATCHES, 14 findings, all applied; see §11). **Awaiting owner ratification of RD0–RD9.**
**Type:** Amendment to [`2026-07-09-intake-autonomy-v2-design.md`](2026-07-09-intake-autonomy-v2-design.md) (v2 remains authoritative for everything not restated here). Not a new system.
**Evidence base:** the FIRST live autonomous run, 2026-07-10T10:02:33Z–10:17:30Z (`shipped:0 parked:1`), its branch `intake/k2_se` (preserved as tag `intake-k2se-first-run-evidence`), its parked sidecar, and the v2 spec/contract git history. Every claim is grounded in an artifact.

> **⚠ TIME-CRITICAL (review finding F6, verified):** runner contract stage 2b deletes the preserved `intake/<id>` branch on the **next run after** a `review-no-go` ledger line — i.e. **the 2026-07-11 12:00 run**, not the weekly retry date. `intake/k2_se` is **local-only** (`git ls-remote` → no remote intake branches) and is the **sole surviving copy of the researched data** (the candidate packet is all-nulls). It has been preserved as a local tag; the row's diff hash (`b88ae6df048d75c6`) is the RD3 baseline. **Any interim action must precede 2026-07-11 12:00.**

---

## 1. What the first live run actually taught us

The pipeline processed one real request (Creality K2 SE) and **parked it** rather than shipping. Correct outcome. Reading *why* exposed one root cause, two amplifiers, and one gap.

**The reviewer saw this** (`git diff main...intake/k2_se -- data/printers.json`):

```json
"max_speed": 500,
"multi_color_systems": ["cfs"],
"notes": ["CFS multicolor — up to 16 colors"]
```

No source. No citation. No confidence marking. And the candidate packet — the artifact the protocol *defines* as the evidence carrier — is **still the raw Scout skeleton**: every field `value: null, source: null, confidence: "low-confidence"`.

The researcher gathered evidence, wrote numbers into `data/printers.json`, and **never recorded where they came from**. The evidence lived only in that session's context and evaporated with it.

The reviewer, asked to bless a safety-relevant `max_speed: 500` beside four K-series siblings that all say `600`, with zero evidence attached, said NO-GO. **That is correct reviewer behaviour.** The earlier characterisation of it as "overcautious" was wrong about attribution: the *facts* support the values (creality.com/products/k2-se lists ≤500 mm/s, CFS ≤4 units), but the *artifact* contained nothing to check.

Corroborating tell — and, as §2 shows, a more alarming one than first assumed: the runner wrote `available_nozzle_sizes: [0.4, 0.6]`; an independent research pass the same day read the manufacturer page and wrote `[0.4]`. **Two agents, same printer, different data, no way to adjudicate.**

### The four defects

| # | Defect | Class |
|---|---|---|
| **D1** | Research evidence is never written into the candidate packet or the row's `notes[]`, so the reviewer judges safety-relevant numbers with no provenance. The v2 protocol *demands* per-field source authority + confidence; the runner contract never *enforces* it into the review packet. | **Root cause** |
| **D2** | Parking preserves the reviewer's objections but discards the researcher's findings. The retry starts **colder** than the first attempt. | Amplifier |
| **D3** | `review-no-go` is retried on a **weekly timer ×4**. Nothing time touches is an input to that judgment. See §2 — unsafe, not merely wasteful. | Amplifier |
| **D4** | Nothing converts a run's lessons into the next run's behaviour. | Gap (the owner's ask) |

### Provenance of D3 (recorded honestly)

The v2 spec (§3.2, hostile-reviewed ×14) defined exactly **two** retry policies — `review-unavailable` → next run; `unverified-model` → weekly ×4 then expire. Both are **environment-dependent**: time genuinely changes an input (the tool returns; the manufacturer publishes a page). The retry re-queries the *world*.

`review-no-go → weekly ×4` and the catch-all `others → weekly ×4` were **introduced at Gate B4 by the controller** in the runner contract (`ai-operating-model` commit `f38d270`), not by the spec. The same sentence states the correct rule (*"retry only when the diff would materially change (new sources)"*) and then contradicts it. The B4 hostile review caught that parked retries were *unreachable*; the reachability was fixed and nobody re-examined the semantics. One real run exposed it.

---

## 2. The behavioural principle (revised — the first draft's argument was partly motivated)

> **A retry is rational only if some *input* to the decision can change between attempts — and the retry's trigger must be whatever changes that input. Never a timer by default.**

The first draft of this spec argued that `review-no-go` retries re-ask a *fixed* question of a stochastic reviewer, giving `1 − pᴺ` odds of eventually drawing a GO. **The hostile review showed that premise is false, and the truth is worse.**

Stage 2b re-enters a parked candidate into stage 3, which **re-runs the research from scratch**. So a retry re-samples **two** stochastic stages, not one: the researcher may produce a *different row*, and the reviewer may return a *different verdict*. The `[0.4]` vs `[0.4, 0.6]` disagreement is direct evidence of the first — the same printer, researched twice, yielded different safety-relevant data.

Three consequences:

1. **The mechanical "byte-identical diff" guard is near-vacuous.** A re-researched row will rarely be byte-identical, so it sails past that check. Any design resting on `diffSha` alone is theatre. *(This retracts the first draft's claim that RD3 makes re-rolling "structurally impossible.")*
2. **The retry doesn't just re-roll the verdict — it can re-roll the data.** A row that finally passes review may have passed because both samplers happened to land favourably, not because it became better-evidenced. That is strictly worse than a fixed-diff dice roll.
3. **The asymmetry — the actual ratchet — survives untouched, and is the real defect.** A NO-GO is re-attempted on a weekly clock; **a GO is never re-examined.** No process revisits a shipped printer. The loop runs one way only: toward shipping. That asymmetry, not the arithmetic, is what makes a timer-triggered `review-no-go` retry a mechanism for eventually getting past the gate.

A second inconsistency falls out of the same reading: the pipeline is **fail-closed on infrastructure** (Codex unreachable → park, don't guess) but **fail-open on judgment** (reviewer says no → try again next week). Those policies contradict each other.

### The reframe

**A NO-GO is not a failure. It is a question.** The next attempt may not *repeat* — it must **answer**. The reviewer's objections become mandatory acceptance criteria, and the answer must cite **evidence not already on file**. No new evidence → no re-review. Reviews stop being a repeatable lottery and become a dialogue with memory.

Because the answering step is itself performed by an agent that wants to ship, RD3 is honest about what it can and cannot enforce (see F2/RD3 below): it is a **structural presence-and-novelty check**, backed by the *second* reviewer re-examining the resolution — not a semantic guarantee.

---

## 3. Decision points (owner ratifies or overrides — RD0–RD9)

- **RD0 — Goal + scope.** Fix D1–D3 and close D4 as an **amendment** to v2. No new agent framework, no new scheduler, **no new ledger** (see RD6: process findings route to the existing `ai-operating-model/docs/findings/` ledger; per-candidate memory lives in the existing parked sidecar). *(Recommended: ratify.)*

- **RD1 — Evidence provenance becomes a gate before the review turn (fixes D1).** For every **profile/safety-critical field** the researcher MUST record `{value, source, confidence}` in the candidate packet, and the row's `notes[]` MUST carry ≥1 manufacturer-class citation. `validate-candidate-evidence.js` runs **before** the PD5 gate: any such field with `source == null` or `confidence != "confirmed"` → `auto-parked:evidence-incomplete`, **without consuming a review turn.** The review packet handed to reviewers includes the evidence table, not just the git diff.

  **Field set is NOT re-listed here — it is `printer-addition-protocol.md` §"Field confidence" → *profile/safety-critical fields*, by reference** (single source of truth; the first draft's hand-copied list silently dropped `active_chamber_heating`, `max_chamber_temp`, `available_plates`, `has_lidar`, `has_camera` — F4a).

  **App-cap exception (F3 — the first draft broke a ratified lane):** `max_acceleration` with `confidence: "app-cap"` and `source: null` is the runbook's **sanctioned** case for an unpublished manufacturer figure and **must NOT park as `evidence-incomplete`.** It routes to the existing app-cap dispatch (four runbook conditions + reviewer GO). Without this carve-out, no app-cap candidate could ever ship autonomously.

  **Producer change required (F4b):** the Scout skeleton's `printersJsonRow` (`printer-intake-scout.js:710`) emits `{value,source,confidence}` slots for `series, series_group, enclosure, max_nozzle_temp, max_bed_temp, max_speed, available_nozzle_sizes, multi_color_systems, available_plates` — it has **no slot for `extruder_type` or `max_acceleration`** (nor the chamber/camera/lidar fields). Adding those slots is an explicit build item, not an assumption.

- **RD2 — The retry taxonomy replaces per-reason ad-hoc policies (fixes D3).** Park reasons classify by **what input must change**:

  | Class | Reasons | Trigger | Bound |
  |---|---|---|---|
  | `availability-blocked` | `review-unavailable`, bridge/network down | next run | ×5 → `decision-required` + notify |
  | `evidence-absent` | `unverified-model`, `needs-source-resolution:missing`, **`evidence-incomplete`** | **slow clock (weekly)** — a fresh research pass may find what the last one missed | ×4 → `decision-required` + notify |
  | `judgment-on-evidence` | `review-no-go` (corroborated), `needs-source-resolution:conflicting` | **event only**: new evidence answering the objections / rules change / owner instruction. **Never a timer.** | none; 30-day silence → `decision-required` + one notify (RD9) |
  | `decision-required` | `new-series-group`, `app-cap-no-go`, `pd4-criteria-unmet`, `review-split`, `needs-owner-taxonomy`, `needs-taxonomy-decision`, `blocked`, any expired park, **any unrecognised reason** | **owner** | never auto |
  | `transient-pipeline` | `main-moved` | immediate | ×2 (already bounded) |

  **`evidence-incomplete` sits in `evidence-absent`, not `judgment-on-evidence` (F7).** The first draft filed it beside `review-no-go` — a category error: it parks *before* any review, so it has **no objections to answer**, which would make RD3's semantic gate vacuously true while denying it the timer that would actually fix it. It is missing evidence, and a fresh research pass is exactly the retry that can supply it.

  **The `others → weekly ×4` catch-all is DELETED.** Unrecognised reason → `decision-required` (fail-closed) + notify. Every reason the current contract or Assistant can emit is enumerated above (F11).

- **RD3 — The materiality gate (anti-re-roll), with honest limits.** A `judgment-on-evidence` candidate may re-enter the PD5 gate **only if the attempt answers the recorded objections**. `intake-retry-gate.js` enforces:
  1. **Presence:** every recorded `objection` carries a `resolvedBy: {source, note, resolvedAt}`.
  2. **Novelty:** each `resolvedBy.source` is a source **not already present** in the parked `evidence[]`. Re-citing what the reviewer already rejected is not an answer.
  3. **Replay guard:** the regenerated diff's `diffSha` differs from the parked `diffSha`. *(Catches only exact replays; per §2 this is a weak necessary condition, not the load-bearing one.)*

  Any failure → `auto-parked:evidence-incomplete` (RD2: `evidence-absent`), **without a review turn.**

  **Honest limits (F2).** Objections arrive as free-text reviewer prose (today: one unstructured `reviewFindings` string). Structuring them is an LLM step, and the agent writing `resolvedBy` is the same agent that wants to ship. Therefore: **(a)** structured objections are emitted by the **reviewer output contract**, never authored by the shipping agent; **(b)** the retry gate checks *presence + novelty*, which is a **structural** check, not a semantic guarantee that the citation supports the claim; **(c)** the second reviewer (RD4) explicitly re-examines each `resolvedBy` on a retry. RD3 raises the cost of a junk citation and makes it visible; it does not make it impossible. **Claiming otherwise would be the same motivated reasoning this spec exists to correct.**

  **Invariant that IS enforceable:** *a review turn is never spent on an attempt with no new cited source.*

- **RD4 — Always run both reviewers; classify by the multiset (F13).** Today the gate fail-fasts on the first NO-GO, so K2 SE was blocked on **one stochastic opinion** and Codex never ran. Change: **always run both** (order-independent):
  - `{GO, GO}` → ship *(unchanged)*
  - `{NO-GO, NO-GO}` → `review-no-go` — a **corroborated** block → `judgment-on-evidence`
  - `{GO, NO-GO}` → `review-split` → **`decision-required`**: owner sees both verdicts verbatim; never auto-retried

  **Cost:** one extra reviewer turn per NO-GO. **Park frequency is unknown (N=1, which parked 1/1) and will be measured** — the first draft asserted "blocked candidates are rare" against a 100%-park sample, which was reasoning from the desired conclusion (F12). **Noted asymmetry (F13b):** the *weaker* block (`review-split`) lands on the owner while the *stronger* block (`NO-GO+NO-GO`) can self-clear on new evidence. Deliberate — a split is a genuine disagreement and disagreement is the K1 signal — but it does route more work to the owner. Tolerable at single-digit requests/week; revisit if split rates rise.

- **RD5 — The parked sidecar becomes the candidate's memory (fixes D2).** `parked.json` v2:
  ```
  { schema: "intake-parked@2", candidateKey, reason, class, firstParkedAt, lastAttemptAt,
    attempts: [{ at, runId, diffSha, outcome }],
    diffSha, nextEligibleTrigger,
    objections: [{ reviewer, field, question, raisedAt, resolvedBy?: {source, note, resolvedAt} }],
    evidence:   [{ field, value, source, confidence, gatheredAt }] }
  ```
  The researcher's findings travel with the park, so a retry starts **warm**. PII-safe by the ledger's contract: keys/hashes only, never raw requester text or emails. Written by a schema-validating `intake-parked-store.js`. A v1→v2 migration handles the currently-parked K2 SE **and must salvage `diffSha` + the researched row from tag `intake-k2se-first-run-evidence` before stage 2b deletes the branch** (see the F6 banner).

- **RD6 — Post-run retrospective: bounded, fresh-context, advisory-only — and NO new ledger (closes D4; F9).**
  - **Trigger:** run outcome ∈ {any park, any error, any rollback, any freeze}. Clean-ship and 0-candidate runs produce none.
  - **Executor:** a **fresh-context sub-agent**, never the run session that just failed (the conflict-of-interest logic that made the build's gate reviews separate hostile agents).
  - **Inputs:** run report, ledger lines, branch diff, **verbatim** review verdicts, validator output, parked sidecars, stage timings.
  - **Outputs — routed to existing homes, not a fifth artifact:**
    - **Process / methodology findings** (reviewer blind spots, contract defects, K1 reviewer-vs-reviewer, K4 controller-vs-tool) → the **existing** `ai-operating-model/docs/findings/` ledger, which exists for exactly this. Human-readable; the owner acts on them.
    - **Per-candidate operational memory** → the parked sidecar (RD5). Already structured, already consumed on retry.
    - **A summary section** in the Discord run report.
  - The retrospective **proposes**; it never applies (RD8).

- **RD7 — Consumption: how findings are used next time (the owner's actual ask) — typed, not free text (F8).** A retrospective nobody reads is theatre; a retrospective whose free text a future agent *obeys* is a reward-hack vector. Both are avoided:
  - **Per-candidate (automatic, safe):** a retried candidate's `objections[]` and `evidence[]` are injected from its sidecar. Structured, scoped to that candidate, purely additive.
  - **Cross-run (constrained):** the ONLY cross-run injectable is a typed, schema-validated `scripts/intake-run-context.json` whose values are **enumerated keys with URL-or-enum values** — e.g. `knownSources: { "<brandId|printerId>": ["https://…"] }`. **No free-text prose is ever injected into a run.** A URL cannot argue; a paragraph can.
  - **Everything else is `rule-change`:** it appears in the report + an owner-decision queue and is **never** injected as behaviour.
  - Findings close when the owner closes them, or automatically when their condition lapses (e.g. the candidate ships).

- **RD8 — The constitutional line.**
  > **No automated component of the pipeline may weaken a gate.**

  Automation may *add* evidence and context — better-informed decisions, never more permissive ones. Automation may **never** change: PD2/PD4 criteria, reviewer prompts or criteria, confidence thresholds, the RD1 field set, the RD2 taxonomy, or promote a park to a ship. **Rationale:** the pipeline's objective (ship printers) is in direct tension with the reviewer's (block unsafe rows); any loop letting the shipping side tune the blocking side converges on *"stop blocking."*

  **How it is actually enforced (F8, F10 — the first draft over-claimed "enforced in code"):**
  - The **typed-slot schema** of RD7 is the real enforcement: free text cannot be injected, so a finding cannot *argue* a gate down. This is a schema check, genuinely deterministic.
  - Runner **Forbidden Actions** already ban editing contracts; extend to `intake-park-taxonomy.json` and `intake-run-context.json`'s schema.
  - **`rule-change` findings are owner-MANUAL edits** to the relevant contract/spec/taxonomy file. They are **not** an `apply-guardrails-diff.js` target — that tool only writes the five `printer-intake-guardrails.json` keys (`brandAliases`, `modelSuffixStrip`, `resinKeywords`, `nonFdmTech`, `nonFdmNoteAcronyms`) and has no mechanism for criteria or prompts. The first draft's "reuse the S4 `--apply` pattern" claim was empty for exactly the changes RD8 governs.
  - **Residual risks RD8 does NOT close, stated plainly:** a fabricated citation (mitigated, not eliminated, by RD3 novelty + RD4 second-reviewer re-check); the retrospective closing its own findings (forbidden — closure is owner-only or condition-lapse); an owner ratifying a bad rule-change (out of scope of any automation).

  **This is not the return of babysitting.** Human gates were removed from *shipping decisions* — those stay fully automated. Amending the *safety rules themselves* is a constitutional change, and constitutional changes need a signature.

- **RD9 — Parks must not rot silently.** A `judgment-on-evidence` park has no timer, so after 30 days it reclassifies to `decision-required` with **one** notification carrying the full objection history. `availability-blocked` and `evidence-absent` parks reclassify to `decision-required` on bound exhaustion rather than expiring quietly. KV retention unchanged (7-day contact window per class policy).

---

## 4. Architecture delta

Runner contract v1 → **v2**, stage order changes only where marked:

| Stage | v1 | v2.1 |
|---|---|---|
| 0 startup reconciliation | ledger identity check | + inject typed `intake-run-context.json` (RD7) |
| 2b parked retry sweep | due-by-timer | **classify by RD2 taxonomy; `judgment-on-evidence` is event-triggered, never due-by-clock.** Branch-deletion of prior `review-no-go` candidates **must not run before their sidecar has salvaged `diffSha`** (F6) |
| 3 research + fill | fills the row | + MUST record `{source, confidence}` per profile/safety-critical field + a `notes[]` citation (RD1); + read `objections[]`/`evidence[]` on retries (RD5) |
| **3b evidence gate** *(new)* | — | `validate-candidate-evidence.js` → park `evidence-incomplete` **before any review turn**, with the app-cap carve-out (RD1) |
| **4b retry gate** *(new)* | — | `intake-retry-gate.js` → presence + novelty + replay guard (RD3) |
| 5 merge gate (PD5) | fail-fast on first NO-GO | **always run both; classify by multiset; reviewers emit STRUCTURED objections; second reviewer re-examines `resolvedBy` on retries** (RD3, RD4) |
| 8 staging lifecycle | per-reason ad-hoc retry | RD2 taxonomy; sidecar v2 (RD5); RD9 no-rot |
| **10b retrospective** *(new)* | — | fresh-context sub-agent on non-trivial runs → ai-om findings + sidecar + report section (RD6), advisory-only (RD8) |

**Components** (all `scripts/` tooling + contracts + one typed context file — no engine, app, data-semantics, Worker, or iOS code):

| Component | Type |
|---|---|
| `scripts/intake-park-taxonomy.json` + validator | committed config — RD2 as data |
| `scripts/validate-candidate-evidence.js` + test | deterministic (RD1, incl. app-cap carve-out) |
| `scripts/intake-retry-gate.js` + test | deterministic (RD3) |
| `scripts/intake-parked-store.js` + test + v1→v2 migration | deterministic (RD5) |
| `scripts/intake-run-context.json` + schema validator + test | typed cross-run context (RD7) |
| Scout skeleton: add missing provenance slots | producer change (RD1/F4b) |
| Reviewer output contract: structured objections | contract (RD3/F2) |
| `ai-operating-model/docs/agents/intake-run-retrospective.md` | agent contract (RD6) |
| runner contract **v2** | contract (all RDs) |
| Printer Addition Assistant amendment | contract (RD1 recording duty) |
| runbook amendment | doc (RD1–RD4 as protocol law) |

---

## 5. Non-goals (explicit)

- No new agent framework, no scheduler, **no new ledger**, no self-modifying rules engine.
- **No relaxation of PD5's merge condition.** RD4 adds *"always ask both"*, never *"one GO is enough."*
- No auto-apply of any `rule-change` finding (RD8).
- No free-text cross-run context injection (RD7).
- No change to Scout triage, S3 guardrails, or S4's existing propose→`--apply` loop.
- No engine / `app.js` / `data/*` semantics change; no Worker, no iOS binary, no TestFlight.
- **No reviewer-prompt tuning in this amendment.** If the retrospective finds a genuine reviewer blind spot it *proposes*; acting is a separate owner-ratified change (RD8), data-gated per `feedback_maturity_gate_before_propagating` (N=1 today).

## 6. Mandatory data/logic-change evaluation (web + iOS + Android-plan)

- **Engine / app / data semantics: untouched.** This amendment changes *how a candidate is evidenced, reviewed, parked, and retried* — not what the engine emits. Rows ship through the identical validator stack.
- **Web UI:** none. **iOS:** none (delivery unchanged; mirror stays a local post-merge commit under the push gate). **Android (planned):** the future `android-printer-overlay-v1.json` extension point is unaffected; evidence + retry semantics apply to it unchanged.
- **Note (F5):** `data/printers.json` rows are flat values and the overlay validator's `allowedPrinterFields` **rejects unknown keys** (`validate-ios-printer-overlay.js:121`), so per-field provenance **cannot** be added to shipped rows without a schema+validator change. This amendment therefore commits provenance as `notes[]` citations only; per-field evidence lives in the sidecar. See RD-open-Q3.
- New repo surfaces are `scripts/` tooling, contracts, one runbook section, one typed context file — no user-facing behaviour.

## 7. Testing / validation strategy

- Every new script: `node:test`, RED-first, fixtures only; never mutates live parked state or the real ledger.
- **RD3 adversarial tests:** byte-identical regenerated diff → refuse, **zero review requests emitted**; whitespace-only change → refuse (novelty, not bytes); `resolvedBy.source` already present in `evidence[]` → refuse.
- **RD1:** an app-cap `max_acceleration` candidate must **pass** the evidence gate and reach the reviewer (regression test for F3); a `null`-source `max_speed` must park without a review turn.
- **RD2 is data + a validator**, so an unclassified reason fails a unit test rather than inheriting a timer.
- **RD7/RD8 enforcement is a schema test:** a free-text context entry must be *rejected by the validator*, not merely discouraged.
- The v1→v2 sidecar migration is proven against the **real** currently-parked K2 SE (from the tag/fixture; never mutated in place until the migration commit).
- Per-gate: implement → hostile sub-agent review → patch → QA → commit → ledger tick. A Codex cross-model review gates the impl plan before build (v2 precedent).

## 8. Success criteria (revised for falsifiability)

1. **The end-to-end acceptance test is K2 SE itself.** Under v2.1 it either (a) ships with a manufacturer citation in `notes[]` and per-field sources in its sidecar, or (b) parks for a **different, better** reason (`evidence-incomplete` naming the missing source; a corroborated `NO-GO+NO-GO`; or `review-split` escalated to the owner). *Re-parking for the identical unexamined reason is a failure of this spec.*
2. **A `judgment-on-evidence` candidate with no new cited source consumes zero review turns** — provable from the run report (review-invocation count = 0) and the retry-gate log.
3. **No park reason lacks a taxonomy class** — unit-enforced over the enumerated set; the catch-all is gone.
4. **Every profile/safety-critical field in a shipped row is traceable to a source** from `notes[]` (committed) plus the sidecar (local). *(Weakened from the first draft's "checkable from the committed artifact alone", which F5 proved unachievable: rows are flat and the overlay allowlist rejects provenance keys.)*
5. **A retrospective finding is injected into a later run and referenced in its report** (the measurable half; the first draft's "demonstrably changes behaviour" has no counterfactual — F14). **No `rule-change` finding is ever auto-applied.**
6. The manual protocol still works unchanged; the runbook remains canonical on conflict.

## 9. Risks

| Risk | Mitigation |
|---|---|
| **Retrospective becomes the reward-hacking vector it exists to prevent** | RD8 line; RD7 typed slots (schema-enforced — free text cannot be injected); Forbidden Actions cover the taxonomy + context schema |
| **Junk citations satisfy RD3** | Novelty check (source not already in `evidence[]`) + RD4's second reviewer re-examines each `resolvedBy`. **Mitigated, not eliminated — stated plainly (F2)** |
| Evidence gate is so strict nothing ships | Gate covers profile/safety-critical fields only; app-cap carve-out preserved; `evidence-absent` keeps its timer; measure ship/park ratio before tightening |
| `judgment-on-evidence` parks accumulate silently | RD9: 30 days → `decision-required` + one notify |
| RD4 raises review cost | Second reviewer runs only on a NO-GO; **frequency unmeasured (N=1)** — to be tracked, not assumed |
| **Over-fitting to N=1** | RD1/RD2/RD3 are structural (right at zero data). Reviewer *calibration* deferred (§5) |
| **F6: the only copy of the researched diff is deleted by the 2026-07-11 run** | Preserved as tag `intake-k2se-first-run-evidence` + scratchpad patch; migration must salvage before stage 2b runs. **Owner decision Q5** |

## 10. Open questions for the owner (answer with RD ratification)

1. **RD4** — always run both reviewers (extra turn per NO-GO), or keep fail-fast and accept single-opinion parks? *(Recommend: both.)*
2. **RD6** — retrospective on non-trivial runs only, or on clean-ship runs too? *(Recommend: non-trivial only — cost.)*
3. **F5 / §6** — accept `notes[]`-only committed provenance, or add a tracked per-printer provenance file (`docs/`) so per-field sources survive outside the gitignored sidecar? *(Recommend: notes[] now; revisit if adjudication pain recurs.)*
4. **RD9** — is 30 days the right silence window before a `judgment-on-evidence` park escalates?
5. **F6 / timing** — the `intake/k2_se` branch is deleted by **tomorrow's 12:00 run**. Options: (a) land v2.1's migration first (unrealistic in <24 h), (b) let me neutralise the sidecar/branch now with a one-line interim, (c) set the freeze flag until v2.1 lands, (d) accept the loss (the tag + scratchpad patch already preserve the diff, so the practical loss is small). *(Recommend: (d) + proceed — the tag is sufficient; no live change needed.)*

## 11. Review record

**Hostile sub-agent design review, 2026-07-10 — GO-WITH-PATCHES, 14 findings, all applied.**
5 HIGH: **F1** §2's "one-way ratchet / structurally impossible" argument was **motivated reasoning** — retries re-run *research* too, so the diff isn't fixed and `diffSha` is near-vacuous (§2 rewritten; the asymmetry survives as the real defect); **F2** RD3's "deterministic" semantic check is an LLM trust boundary (downgraded to presence+novelty + reviewer re-check, limits stated); **F3** RD1 silently broke the ratified app-cap lane (carve-out added); **F4** RD1's hand-copied field set dropped 5 runbook fields and demanded slots the Scout doesn't emit (now by-reference + producer change listed); **F5** §8.4 was unachievable — rows are flat, the overlay allowlist rejects provenance keys, the sidecar is gitignored (criterion weakened + Q3 opened); **F6** the branch dies on the **next daily run (07-11)**, not 07-17 (banner + tag + migration ordering).
MEDIUM-HIGH/MEDIUM: **F7** `evidence-incomplete` was a category error in `judgment-on-evidence` (moved to `evidence-absent`); **F8** free-text context injection is an influence vector and RD8's "enforced in code" was prose (RD7 now typed slots, URL/enum only); **F9** the spec violated its own "no new ledger" (fifth artifact dropped; findings route to the existing ai-om ledger); **F10** the S4 `--apply` reuse claim was empty for the changes RD8 governs (rule-changes are owner-manual); **F11** taxonomy missed real reasons (`needs-source-resolution`, `needs-owner-taxonomy`, `needs-taxonomy-decision`, `blocked` — enumerated).
LOW: **F12** "blocked candidates are rare" asserted against a 100%-park sample (retracted, to be measured); **F13** RD4 restated order-independently + split asymmetry noted; **F14** §8.5 made falsifiable.

**Next gate:** owner ratification of RD0–RD9 + Q1–Q5 → gated impl plan → Codex cross-model review → build sessions.
