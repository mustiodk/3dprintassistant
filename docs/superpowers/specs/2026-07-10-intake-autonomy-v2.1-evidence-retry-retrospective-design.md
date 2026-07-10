# Intake Autonomy v2.1 — Evidence provenance and retry semantics (design spec)

**Date:** 2026-07-10
**Status:** **RATIFIED by owner 2026-07-10** (RD0–RD10; see §10 for the decision record). Hostile-reviewed (GO-WITH-PATCHES, 14 findings, all applied) → owner-ratified → **Codex cross-model review pending** → gated impl plan → build.
**Type:** Amendment to [`2026-07-09-intake-autonomy-v2-design.md`](2026-07-09-intake-autonomy-v2-design.md) (v2 remains authoritative for everything not restated here). Not a new system.
**Evidence base:** the FIRST live autonomous run, 2026-07-10T10:02:33Z–10:17:30Z (`shipped:0 parked:1`), its branch `intake/k2_se` (preserved as tag `intake-k2se-first-run-evidence`; diff hash `b88ae6df048d75c6`), its parked sidecar, and the v2 spec/contract git history. Every claim is grounded in an artifact.

> **Note on the title.** The first draft was titled "…and the run retrospective." The retrospective **agent** is **deferred** (RD6) — its stated purpose is delivered by RD5 (warm parks) and RD6b (richer bad-run reports) at a fraction of the cost. The owner's original ask — *"make sure the findings are used next time we run an entire end-to-end process"* — is satisfied by RD5, not by a new agent.

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

Corroborating tell — and, per §2, a more alarming one than first assumed: the runner wrote `available_nozzle_sizes: [0.4, 0.6]`; an independent research pass the same day read the manufacturer page and wrote `[0.4]`. **Two agents, same printer, different data, no way to adjudicate.**

### The four defects

| # | Defect | Class | Addressed by |
|---|---|---|---|
| **D1** | Research evidence never reaches the candidate packet or the row's `notes[]`, so the reviewer judges safety-relevant numbers with no provenance. The v2 protocol *demands* per-field source authority + confidence; the runner contract never *enforces* it into the review packet. | **Root cause** | RD1, RD10 |
| **D2** | Parking preserves the reviewer's objections but discards the researcher's findings. The retry starts **colder** than the first attempt. | Amplifier | RD5 |
| **D3** | `review-no-go` is retried on a **weekly timer ×4**. Nothing time touches is an input to that judgment. See §2 — unsafe, not merely wasteful. | Amplifier | RD2, RD3 |
| **D4** | Nothing converts a run's lessons into the next run's behaviour. | Gap (the owner's ask) | **RD5** (per-candidate, automatic) + RD6b (human-readable). RD6 agent deferred. |

### Provenance of D3 (recorded honestly)

The v2 spec (§3.2, hostile-reviewed ×14) defined exactly **two** retry policies — `review-unavailable` → next run; `unverified-model` → weekly ×4 then expire. Both are **environment-dependent**: time genuinely changes an input (the tool returns; the manufacturer publishes a page). The retry re-queries the *world*.

`review-no-go → weekly ×4` and the catch-all `others → weekly ×4` were **introduced at Gate B4 by the controller** in the runner contract (`ai-operating-model` commit `f38d270`), not by the spec. The same sentence states the correct rule (*"retry only when the diff would materially change (new sources)"*) and then contradicts it. The B4 hostile review caught that parked retries were *unreachable*; the reachability was fixed and nobody re-examined the semantics. One real run exposed it.

---

## 2. The behavioural principle (revised — the first draft's argument was partly motivated)

> **A retry is rational only if some *input* to the decision can change between attempts — and the retry's trigger must be whatever changes that input. Never a timer by default.**

The first draft argued that `review-no-go` retries re-ask a *fixed* question of a stochastic reviewer, giving `1 − pᴺ` odds of eventually drawing a GO. **The hostile review showed that premise is false, and the truth is worse.**

Stage 2b re-enters a parked candidate into stage 3, which **re-runs the research from scratch**. So a retry re-samples **two** stochastic stages: the researcher may produce a *different row*, and the reviewer may return a *different verdict*. The `[0.4]` vs `[0.4, 0.6]` disagreement is direct evidence of the first.

Three consequences:

1. **The mechanical "byte-identical diff" guard is near-vacuous.** A re-researched row is rarely byte-identical, so it sails past that check. Any design resting on `diffSha` alone is theatre. *(This retracts the first draft's claim that RD3 makes re-rolling "structurally impossible.")*
2. **The retry doesn't just re-roll the verdict — it can re-roll the data.** A row that finally passes review may have passed because both samplers landed favourably, not because it became better-evidenced. Strictly worse than a fixed-diff dice roll.
3. **The asymmetry — the actual ratchet — survives untouched, and is the real defect.** A NO-GO is re-attempted on a weekly clock; **a GO is never re-examined.** No process revisits a shipped printer. The loop runs one way only: toward shipping.

A second inconsistency falls out of the same reading: the pipeline is **fail-closed on infrastructure** (Codex unreachable → park, don't guess) but **fail-open on judgment** (reviewer says no → try again next week). Those policies contradict each other.

### The reframe

**A NO-GO is not a failure. It is a question.** The next attempt may not *repeat* — it must **answer**, citing evidence **not already on file**. No new evidence → no re-review. Reviews stop being a repeatable lottery and become a dialogue with memory.

Because the answering step is performed by an agent that wants to ship, RD3 is explicit about what it can and cannot enforce: it is a **structural presence-and-novelty check**, backed by the *second* reviewer re-examining the resolution — not a semantic guarantee.

---

## 3. Decision points (RD0–RD10) — **all ratified 2026-07-10**

- **RD0 — Goal + scope. ✅ RATIFIED.** Fix D1–D3 and close D4 as an **amendment** to v2. No new agent framework, no new scheduler, **no new ledger**. Reuse the parked sidecar and the existing `ai-operating-model/docs/findings/` ledger.

- **RD1 — Evidence provenance becomes a gate before the review turn (fixes D1). ✅ RATIFIED.** For every **profile/safety-critical field** the researcher MUST record `{value, source, confidence}` in the candidate packet, and the row's `notes[]` MUST carry ≥1 manufacturer-class citation. `validate-candidate-evidence.js` runs **before** the PD5 gate: any such field with `source == null` or `confidence != "confirmed"` → `auto-parked:evidence-incomplete`, **without consuming a review turn.** The review packet handed to reviewers includes the evidence table, not just the git diff.

  **Field set is NOT re-listed here — it is `printer-addition-protocol.md` §"Field confidence" → *profile/safety-critical fields*, by reference** (single source of truth; the first draft's hand-copied list silently dropped `active_chamber_heating`, `max_chamber_temp`, `available_plates`, `has_lidar`, `has_camera` — review F4a).

  **App-cap exception (review F3 — the first draft broke a ratified lane):** `max_acceleration` with `confidence: "app-cap"` and `source: null` is the runbook's **sanctioned** case for an unpublished manufacturer figure and **must NOT park as `evidence-incomplete`.** It routes to the existing app-cap dispatch (four runbook conditions + reviewer GO). Without this carve-out no app-cap candidate could ever ship autonomously.

  **Producer change required (review F4b):** the Scout skeleton's `printersJsonRow` (`printer-intake-scout.js:710`) has **no `{value,source,confidence}` slot for `extruder_type` or `max_acceleration`** (nor the chamber/camera/lidar fields). Adding those slots is an explicit build item.

- **RD2 — The retry taxonomy replaces per-reason ad-hoc policies (fixes D3). ✅ RATIFIED.** Park reasons classify by **what input must change**:

  | Class | Reasons | Trigger | Bound |
  |---|---|---|---|
  | `availability-blocked` | `review-unavailable`, bridge/network down | next run | ×5 → `decision-required` + notify |
  | `evidence-absent` | `unverified-model`, `needs-source-resolution:missing`, **`evidence-incomplete`** | **slow clock (weekly)** — a fresh research pass may find what the last one missed | ×4 → `decision-required` + notify |
  | `judgment-on-evidence` | `review-no-go` (corroborated), `needs-source-resolution:conflicting` | **event only**: new evidence answering the objections / rules change / owner instruction. **Never a timer.** | none; **14-day** silence → `decision-required` + one notify (RD9) |
  | `decision-required` | `new-series-group`, `app-cap-no-go`, `pd4-criteria-unmet`, `review-split`, `needs-owner-taxonomy`, `needs-taxonomy-decision`, `blocked`, any expired park, **any unrecognised reason** | **owner** | never auto |
  | `transient-pipeline` | `main-moved` | immediate | ×2 (already bounded) |

  **`evidence-incomplete` sits in `evidence-absent`, not `judgment-on-evidence` (review F7).** It parks *before* any review, so it has **no objections to answer** — filing it beside `review-no-go` would make RD3's gate vacuously true while denying it the timer that would actually fix it. It is missing evidence; a fresh research pass is exactly the retry that can supply it.

  **The `others → weekly ×4` catch-all is DELETED.** Unrecognised reason → `decision-required` (fail-closed) + notify.

- **RD3 — The materiality gate (anti-re-roll), with honest limits. ✅ RATIFIED.** A `judgment-on-evidence` candidate may re-enter the PD5 gate **only if the attempt answers the recorded objections**. `intake-retry-gate.js` enforces:
  1. **Presence:** every recorded `objection` carries a `resolvedBy: {source, note, resolvedAt}`.
  2. **Novelty:** each `resolvedBy.source` is a source **not already present** in the parked `evidence[]`. Re-citing what the reviewer already rejected is not an answer.
  3. **Replay guard:** the regenerated diff's `diffSha` differs from the parked `diffSha`. *(Catches only exact replays; per §2 a weak necessary condition, not load-bearing.)*

  Any failure → `auto-parked:evidence-incomplete` (RD2: `evidence-absent`), **without a review turn.**

  **Honest limits (review F2).** Objections arrive as free-text reviewer prose. Structuring them is an LLM step, and the agent writing `resolvedBy` is the same agent that wants to ship. Therefore: **(a)** structured objections are emitted by the **reviewer output contract**, never authored by the shipping agent; **(b)** the retry gate checks *presence + novelty* — a **structural** check, not a semantic guarantee that the citation supports the claim; **(c)** the second reviewer (RD4) explicitly re-examines each `resolvedBy` on a retry. RD3 raises the cost of a junk citation and makes it visible; it does not make it impossible. **Claiming otherwise would be the same motivated reasoning this spec exists to correct.**

  **Enforceable invariant:** *a review turn is never spent on an attempt with no new cited source.*

- **RD4 — Always run both reviewers; classify by the multiset. ✅ RATIFIED (owner: "I agree").** Today the gate fail-fasts on the first NO-GO, so K2 SE was blocked on **one stochastic opinion** and Codex never ran. Change: **always run both** (order-independent):
  - `{GO, GO}` → ship *(unchanged)*
  - `{NO-GO, NO-GO}` → `review-no-go` — a **corroborated** block → `judgment-on-evidence`
  - `{GO, NO-GO}` → `review-split` → **`decision-required`**: owner sees both verdicts verbatim; never auto-retried

  **Cost:** one extra reviewer turn per NO-GO. **Park frequency is unknown (N=1, which parked 1/1) and will be measured** — the first draft asserted "blocked candidates are rare" against a 100%-park sample, which was reasoning from the desired conclusion (review F12). **Noted asymmetry:** the *weaker* block (`review-split`) routes to the owner while the *stronger* block (`NO-GO+NO-GO`) can self-clear on new evidence. Deliberate — a split is genuine disagreement, and disagreement is the K1 signal.

- **RD5 — The parked sidecar becomes the candidate's memory (fixes D2; DELIVERS D4). ✅ RATIFIED.** `parked.json` v2:
  ```
  { schema: "intake-parked@2", candidateKey, reason, class, firstParkedAt, lastAttemptAt,
    attempts: [{ at, runId, diffSha, outcome }],
    diffSha, nextEligibleTrigger,
    objections: [{ reviewer, field, question, raisedAt, resolvedBy?: {source, note, resolvedAt} }],
    evidence:   [{ field, value, source, confidence, gatheredAt }] }
  ```
  The researcher's findings travel with the park, so a retry starts **warm**, and the reviewer's objections become the retry's acceptance criteria. **This is the mechanism that satisfies the owner's "findings used next time" ask** — automatic, structured, scoped to one candidate, purely additive, and impossible to use as a gate-relaxing channel (it carries citations and questions, not instructions). PII-safe by the ledger's contract: keys/hashes only. Written by a schema-validating `intake-parked-store.js`. A v1→v2 migration handles the currently-parked K2 SE, salvaging `diffSha` + the researched row from tag `intake-k2se-first-run-evidence`.

- **RD6 — The retrospective AGENT is DEFERRED behind a falsifiable trigger. ✅ RATIFIED (owner asked for an honest value/effort call).**

  **Rationale, stated plainly.** The most valuable retrospective this pipeline will ever get already happened — manually, in conversation, one day after go-live, because the owner asked *"why?"*. It found D1–D4. An automated retrospective scoped to *read the run's artifacts* would plausibly have found D1, maybe D2, and **almost certainly not D3** — that required reading the v2 spec's git history, noticing the controller introduced the policy at B4, and making a conceptual argument about stochastic samplers and asymmetric gates. Its realistic ceiling is "catches shallow things when nobody is looking," at ~35–40% of this amendment's build cost, with its own reward-hack surface (free-text findings a future agent obeys).

  Two further arguments: (i) **building a defect-finder while holding a backlog of found-but-unfixed defects is out of order** — fix D1–D3, then see what's left to find; (ii) **automated reflection always produces findings**, signal or not — the existing `lesson-spotter` + calibration ledger is the same shape and its honest rows mostly read "no finding file."

  **Falsifiable build trigger (not a vague "later"):** build it when **either** (a) five non-trivial runs (park/error/rollback/freeze) have accumulated, **or** (b) a run parks and nobody reads the report within seven days. Condition (b) is the honest test of "will the owner look?" — if it never fires, the agent was never needed. This applies `feedback_maturity_gate_before_propagating` to the idea itself.

- **RD6b — Richer bad-run reports (the cheap 80%). ✅ RATIFIED.** On a non-trivial run, the existing run report carries the raw materials for a five-minute human read: **verbatim** review verdicts (both reviewers), the branch diff (or its stat + a tag/ref to recover it), the structured `objections[]`, the evidence table, and per-stage timings. Zero new components, zero injection surface. It rides along with RD5.

  **Consequence: the typed cross-run context store (`intake-run-context.json`) is DROPPED from v2.1.** It existed only to carry retrospective findings into a future run. With RD6 deferred it has no producer — so the component, its schema validator, and the entire cross-run injection surface disappear. Per-candidate memory (RD5) is the only automatic consumption path in v2.1.

- **RD7 — Consumption.** *(Merged into RD5 + RD6b. Nothing is injected into a run except a retried candidate's own `objections[]` and `evidence[]`. **No free-text is ever injected.**)*

- **RD8 — The constitutional line. ✅ RATIFIED.**
  > **No automated component of the pipeline may weaken a gate.**

  Automation may *add* evidence and context — better-informed decisions, never more permissive ones. Automation may **never** change: PD2/PD4 criteria, reviewer prompts or criteria, confidence thresholds, the RD1 field set, the RD2 taxonomy, or promote a park to a ship. **Rationale:** the pipeline's objective (ship printers) is in direct tension with the reviewer's (block unsafe rows); any loop letting the shipping side tune the blocking side converges on *"stop blocking."*

  **How it is actually enforced (reviews F8, F10 — the first draft over-claimed "enforced in code"):**
  - **v2.1's strongest enforcement is structural absence:** with RD6 deferred and the context store dropped, **there is no channel by which an automated component can influence a future run's judgment.** Nothing to police.
  - Runner **Forbidden Actions** already ban editing contracts; extend to `scripts/intake-park-taxonomy.json`.
  - **`rule-change` findings are owner-MANUAL edits** to the relevant contract/spec/taxonomy file. They are **not** an `apply-guardrails-diff.js` target — that tool only writes the five `printer-intake-guardrails.json` keys and has no mechanism for criteria or prompts. The first draft's "reuse the S4 `--apply` pattern" claim was empty for exactly the changes RD8 governs.
  - **Residual risks RD8 does NOT close, stated plainly:** a fabricated citation (mitigated, not eliminated, by RD3 novelty + RD4's second-reviewer re-check); an owner ratifying a bad rule-change (outside any automation's scope). **When RD6 is eventually built, its findings MUST be typed/enumerated, never free-text** — that constraint is inherited, not re-litigated.

  **This is not the return of babysitting.** Human gates were removed from *shipping decisions* — those stay fully automated. Amending the *safety rules themselves* is a constitutional change, and constitutional changes need a signature.

- **RD9 — Parks must not rot silently. ✅ RATIFIED at 14 days (owner).** A `judgment-on-evidence` park has no timer, so after **14 days** it reclassifies to `decision-required` with **one** notification carrying the full objection history. `availability-blocked` and `evidence-absent` parks reclassify to `decision-required` on bound exhaustion rather than expiring quietly. KV retention unchanged (7-day contact window per class policy).

- **RD10 — Durable committed provenance (NEW; owner delegated the call). ✅ RATIFIED.**

  **The fact that decides it:** runner contract stage 8 says *"Terminal resolution (**shipped** / declined / unactionable / duplicate) → delete the staging skeleton."* Under RD5 alone, per-field evidence lives only in the sidecar — which is **deleted at the moment a printer successfully ships**. We would preserve provenance for every printer we *rejected* and destroy it for every printer that is *live in front of users*. The `[0.4]` vs `[0.4, 0.6]` question would be permanently unanswerable for exactly the rows that matter.

  **Therefore:** a small **tracked** `docs/printer-provenance.json`, keyed by printer id, written at ship time (stage 7, alongside the ledger commit): structured per-field `{value, source, confidence, gatheredAt}` + the run id. PII-free.

  Constraints honoured: it **cannot** go into `data/printers.json` — the overlay validator's `allowedPrinterFields` allowlist rejects unknown keys (`validate-ios-printer-overlay.js:121`), and iOS/web mirror those rows byte-identically. `notes[]` remains the human-readable citation it already conventionally is. **Scoped as its own small gate at the end of the build, droppable without touching the safety fixes.**

---

## 4. Architecture delta

Runner contract v1 → **v2**, stage order changes only where marked:

| Stage | v1 | v2.1 |
|---|---|---|
| 0 startup reconciliation | ledger identity check | *(unchanged — no cross-run context injection in v2.1)* |
| 2b parked retry sweep | due-by-timer | **classify by the RD2 taxonomy; `judgment-on-evidence` is event-triggered, never due-by-clock.** Branch deletion of prior `review-no-go` candidates must not run before their sidecar has salvaged `diffSha` (review F6) |
| 3 research + fill | fills the row | + MUST record `{source, confidence}` per profile/safety-critical field + a `notes[]` citation (RD1); + read `objections[]`/`evidence[]` on retries (RD5) |
| **3b evidence gate** *(new)* | — | `validate-candidate-evidence.js` → park `evidence-incomplete` **before any review turn**, with the app-cap carve-out (RD1) |
| **4b retry gate** *(new)* | — | `intake-retry-gate.js` → presence + novelty + replay guard (RD3) |
| 5 merge gate (PD5) | fail-fast on first NO-GO | **always run both; classify by multiset; reviewers emit STRUCTURED objections; the second reviewer re-examines `resolvedBy` on retries** (RD3, RD4) |
| 7 ledger | ledger line per candidate | **+ append the shipped row's provenance to `docs/printer-provenance.json`** (RD10) |
| 8 staging lifecycle | per-reason ad-hoc retry | RD2 taxonomy; sidecar v2 (RD5); RD9 14-day no-rot |
| 10 notify | summary report | **+ on non-trivial runs: verbatim verdicts, objections, evidence table, diff ref, stage timings** (RD6b) |

**Components** (all `scripts/` tooling + contracts + one tracked provenance file — no engine, app, data-semantics, Worker, or iOS code):

| Component | Type |
|---|---|
| `scripts/intake-park-taxonomy.json` + validator | committed config — RD2 as data |
| `scripts/validate-candidate-evidence.js` + test | deterministic (RD1, incl. app-cap carve-out) |
| `scripts/intake-retry-gate.js` + test | deterministic (RD3) |
| `scripts/intake-parked-store.js` + test + v1→v2 migration | deterministic (RD5) |
| `scripts/intake-provenance-store.js` + test | deterministic (RD10) |
| `docs/printer-provenance.json` | committed, PII-free record |
| Scout skeleton: add missing provenance slots | producer change (RD1) |
| Reviewer output contract: structured objections | contract (RD3) |
| runner contract **v2** | contract (all RDs) |
| Printer Addition Assistant amendment | contract (RD1 recording duty) |
| runbook amendment | doc (RD1–RD4, RD10 as protocol law) |

**Dropped vs the first draft:** `intake-run-context.json` + its schema validator, `intake-findings.js`, `docs/intake-run-findings.jsonl`, and `ai-operating-model/docs/agents/intake-run-retrospective.md` — all deferred with RD6.

---

## 5. Non-goals (explicit)

- No new agent framework, no scheduler, **no new ledger**, no self-modifying rules engine.
- **No retrospective agent in v2.1** (RD6 — deferred behind a falsifiable trigger).
- **No cross-run context injection of any kind**, typed or free-text (RD6b consequence).
- **No relaxation of PD5's merge condition.** RD4 adds *"always ask both"*, never *"one GO is enough."*
- No change to Scout triage, S3 guardrails, or S4's existing propose→`--apply` loop.
- No engine / `app.js` / `data/*` semantics change; no Worker, no iOS binary, no TestFlight. `data/printers.json` row *schema* is untouched (RD10 records provenance beside it, never inside it).
- **No reviewer-prompt tuning.** If a blind spot emerges it is *proposed*; acting is a separate owner-ratified change (RD8), data-gated (N=1 today).

## 6. Mandatory data/logic-change evaluation (web + iOS + Android-plan)

- **Engine / app / data semantics: untouched.** This amendment changes *how a candidate is evidenced, reviewed, parked, and retried* — not what the engine emits. Rows ship through the identical validator stack.
- **Web UI:** none. **iOS:** none (delivery unchanged; mirror stays a local post-merge commit under the push gate). **Android (planned):** the future `android-printer-overlay-v1.json` extension point is unaffected; evidence + retry semantics apply to it unchanged.
- **RD10 constraint (review F5):** `data/printers.json` rows are flat values and the overlay validator's `allowedPrinterFields` **rejects unknown keys** (`validate-ios-printer-overlay.js:121`), so per-field provenance **cannot** live in shipped rows. It lives in a sibling tracked file; iOS/web byte-mirroring is unaffected because `docs/` is not mirrored and is `.assetsignore`d.
- New repo surfaces are `scripts/` tooling, contracts, one runbook section, one committed record — no user-facing behaviour.

## 7. Testing / validation strategy

- Every new script: `node:test`, RED-first, fixtures only; never mutates live parked state, the real ledger, or the real provenance file.
- **RD3 adversarial tests:** byte-identical regenerated diff → refuse, **zero review requests emitted**; whitespace-only change → refuse (novelty, not bytes); `resolvedBy.source` already in `evidence[]` → refuse.
- **RD1 regression:** an app-cap `max_acceleration` candidate must **pass** the evidence gate and reach the reviewer; a `null`-source `max_speed` must park without a review turn.
- **RD2 is data + a validator**, so an unclassified reason fails a unit test rather than inheriting a timer.
- **RD10:** provenance append is idempotent per printer id; the file never contains requester text; `validate-data` + the overlay validator stay green (proving the row schema is untouched).
- The v1→v2 sidecar migration is proven against the **real** currently-parked K2 SE (from the tag/fixture; never mutated in place until the migration commit).
- Per-gate: implement → hostile sub-agent review → patch → QA → commit → ledger tick. A Codex cross-model review gates the impl plan before build (v2 precedent).

## 8. Success criteria

1. **The end-to-end acceptance test is K2 SE itself.** Under v2.1 it either (a) ships with a `notes[]` citation, per-field sources in `docs/printer-provenance.json`, or (b) parks for a **different, better** reason (`evidence-incomplete` naming the missing source; a corroborated `NO-GO+NO-GO`; or `review-split` escalated to the owner). *Re-parking for the identical unexamined reason is a failure of this spec.*
2. **A `judgment-on-evidence` candidate with no new cited source consumes zero review turns** — provable from the run report (review-invocation count = 0) and the retry-gate log.
3. **No park reason lacks a taxonomy class** — unit-enforced over the enumerated set; the catch-all is gone.
4. **Every profile/safety-critical field of a shipped printer is traceable to a source from committed data alone** (`notes[]` + `docs/printer-provenance.json`) — the `[0.4]` vs `[0.4, 0.6]` ambiguity becomes adjudicable, and stays adjudicable after the sidecar is deleted at ship time.
5. **A retried candidate's report cites the objection it answered and the new source it cited** (the measurable form of "findings used next time").
6. The manual protocol still works unchanged; the runbook remains canonical on conflict.

## 9. Risks

| Risk | Mitigation |
|---|---|
| **Junk citations satisfy RD3** | Novelty check (source absent from `evidence[]`) + RD4's second reviewer re-examines each `resolvedBy`. **Mitigated, not eliminated — stated plainly** |
| Evidence gate is so strict nothing ships | Gate covers profile/safety-critical fields only; app-cap carve-out preserved; `evidence-absent` keeps its timer; measure ship/park ratio before tightening |
| `judgment-on-evidence` parks accumulate silently | RD9: 14 days → `decision-required` + one notify |
| RD4 raises review cost | Second reviewer runs only on a NO-GO; **frequency unmeasured (N=1)** — to be tracked, not assumed |
| **Over-fitting to N=1** | RD1/RD2/RD3 are structural (right at zero data). The retrospective agent — the most speculative component — is explicitly deferred behind a falsifiable trigger (RD6) |
| Reward-hacking via a learning loop | **Structurally absent in v2.1:** no cross-run injection channel exists (RD6b consequence). Inherited constraint if RD6 is ever built: typed findings only |
| Deferring RD6 means nobody ever looks | RD6's trigger (b) — *a run parks and nobody reads the report within 7 days* — is precisely the falsification test |
| The `intake/k2_se` branch is deleted by the 2026-07-11 run | **Owner ratified: accept.** Preserved as tag `intake-k2se-first-run-evidence` + scratchpad patch; diff hash `b88ae6df048d75c6` recorded; migration salvages from the tag |

## 10. Owner decision record (2026-07-10)

| # | Question | Decision |
|---|---|---|
| Q1 | Always run both reviewers on a NO-GO? | **Yes** — "I agree." → RD4 ratified |
| Q2 | Retrospective on non-trivial runs only, or all runs? | Owner asked for an honest value/effort call → **agent DEFERRED entirely** behind a falsifiable trigger; cheap 80% (RD6b) built instead |
| Q3 | Committed provenance file, or sidecar-only? | Owner delegated → **tracked `docs/printer-provenance.json`** (RD10). Decisive fact: shipped candidates' sidecars are *deleted*, so sidecar-only would preserve evidence for rejected printers and destroy it for live ones |
| Q4 | Silence window before a judgment-park escalates | **14 days** (owner) → RD9 |
| Q5 | Tomorrow's branch deletion | **Do nothing** — "Fine by me." The tag + patch preserve the evidence |

## 11. Review record

**Hostile sub-agent design review, 2026-07-10 — GO-WITH-PATCHES, 14 findings, all applied.**
5 HIGH: **F1** §2's "one-way ratchet / structurally impossible" argument was **motivated reasoning** — retries re-run *research* too, so the diff isn't fixed and `diffSha` is near-vacuous (§2 rewritten; the asymmetry survives as the real defect); **F2** RD3's "deterministic" semantic check is an LLM trust boundary (downgraded to presence+novelty + reviewer re-check, limits stated); **F3** RD1 silently broke the ratified app-cap lane (carve-out added); **F4** RD1's hand-copied field set dropped 5 runbook fields and demanded slots the Scout doesn't emit (by-reference + producer change); **F5** §8.4 was unachievable — rows are flat, the overlay allowlist rejects provenance keys, the sidecar is gitignored (→ **RD10**, which restores the criterion properly); **F6** the branch dies on the **next daily run**, not the weekly retry date (banner, tag, migration ordering).
MEDIUM-HIGH/MEDIUM: **F7** `evidence-incomplete` was a category error (moved to `evidence-absent`); **F8** free-text context injection is an influence vector and RD8's "enforced in code" was prose (→ resolved by *deleting the channel*, RD6b); **F9** the spec violated its own "no new ledger" (fifth artifact dropped); **F10** the S4 `--apply` reuse claim was empty for the changes RD8 governs (owner-manual); **F11** taxonomy missed real reasons (enumerated).
LOW: **F12** "blocked candidates are rare" asserted against a 100%-park sample (retracted, to be measured); **F13** RD4 restated order-independently + split asymmetry noted; **F14** §8.5 made falsifiable.

**Owner ratification, 2026-07-10:** RD0–RD10 accepted per §10, with RD6 deferred and RD10 added on the owner's delegation.

**Codex cross-model review:** *(pending — see §12 when complete)*

**Next gate:** Codex GO → gated impl plan → hostile + Codex review of the plan → build sessions.
