# Intake Autonomy v2.1 — Evidence provenance and retry semantics (design spec)

**Date:** 2026-07-10
**Status:** DRAFT v4. Hostile sub-agent review (GO-WITH-PATCHES, 14 findings) → owner ratification (RD0–RD10) → Codex review #1 (**NO-GO**, 9 findings, applied — §12) → Codex review #2 (**NO-GO**, 5 findings, applied — §13). Ready for the impl plan.

> **⚠ LIVE-SYSTEM ACTION REQUIRED (Codex #2, must-fix 2 — owner decision).** The **running** runner contract v1 still says `review-no-go → weekly ×4` and `others → weekly ×4` (`intake-pipeline-runner.md:234`). The ratchet is live *today*: K2 SE's weekly retry falls due **2026-07-17**. See §14.
**Type:** Amendment to [`2026-07-09-intake-autonomy-v2-design.md`](2026-07-09-intake-autonomy-v2-design.md) (v2 remains authoritative for everything not restated here). Not a new system.
**Evidence base:** the FIRST live autonomous run, 2026-07-10T10:02:33Z–10:17:30Z (`shipped:0 parked:1`), its branch preserved as tag `intake-k2se-first-run-evidence` (diff hash `b88ae6df048d75c6`), its parked sidecar, and the v2 spec/contract git history. Every claim is grounded in an artifact.

> **Note on the title.** The retrospective **agent** is **deferred** (RD6). The owner's original ask — *"make sure the findings are used next time we run an entire end-to-end process"* — is satisfied by RD5 (warm parks), not by a new agent.

---

## 1. What the first live run actually taught us

The pipeline processed one real request (Creality K2 SE) and **parked it** rather than shipping. Correct outcome. Reading *why* exposed one root cause, two amplifiers, and one gap.

**The reviewer saw this** (`git diff main...intake-k2se-first-run-evidence -- data/printers.json`):

```json
"max_speed": 500,
"multi_color_systems": ["cfs"],
"notes": ["CFS multicolor — up to 16 colors"]
```

No source. No citation. No confidence marking. And the candidate packet — the artifact the protocol *defines* as the evidence carrier — is **still the raw Scout skeleton**: every field `value: null, source: null, confidence: "low-confidence"`.

The researcher gathered evidence, wrote numbers into `data/printers.json`, and **never recorded where they came from**. The evidence lived only in that session's context and evaporated with it.

The reviewer, asked to bless a safety-relevant `max_speed: 500` beside four K-series siblings that all say `600`, with zero evidence attached, said NO-GO. **That is correct reviewer behaviour.** The earlier characterisation of it as "overcautious" was wrong about attribution: the *facts* support the values (creality.com/products/k2-se lists ≤500 mm/s, CFS ≤4 units), but the *artifact* contained nothing to check.

Corroborating tell: the runner wrote `available_nozzle_sizes: [0.4, 0.6]`; an independent research pass the same day read the manufacturer page and wrote `[0.4]`. **Two agents, same printer, different data, no way to adjudicate.**

### The four defects

| # | Defect | Class | Addressed by |
|---|---|---|---|
| **D1** | Research evidence never reaches the candidate packet or the row's `notes[]`, so the reviewer judges safety-relevant numbers with no provenance. | **Root cause** | RD1, RD10 |
| **D2** | Parking preserves the reviewer's objections but discards the researcher's findings. The retry starts **colder** than the first attempt. | Amplifier | RD5 |
| **D3** | `review-no-go` is retried on a **weekly timer ×4**. Nothing time touches is an input to that judgment. | Amplifier | RD2, RD3 |
| **D4** | Nothing converts a run's lessons into the next run's behaviour. | Gap (owner's ask) | **RD5** + RD6b |

### Provenance of D3 (recorded honestly)

The v2 spec (§3.2, hostile-reviewed ×14) defined exactly **two** retry policies — `review-unavailable` → next run; `unverified-model` → weekly ×4 then expire. Both are **environment-dependent**: time genuinely changes an input.

`review-no-go → weekly ×4` and the catch-all `others → weekly ×4` were **introduced at Gate B4 by the controller** in the runner contract (`ai-operating-model` commit `f38d270`), not by the spec. The same sentence states the correct rule and then contradicts it. The B4 hostile review caught that parked retries were *unreachable*; the reachability was fixed and nobody re-examined the semantics. One real run exposed it.

---

## 2. The behavioural principle (twice revised — both drafts were wrong in instructive ways)

> **A retry is rational only if some *input* to the decision can change between attempts — and the retry's trigger must be whatever changes that input. Never a timer by default.**

**Draft 1 was motivated reasoning.** It argued `review-no-go` retries re-ask a *fixed* question of a stochastic reviewer (`1 − pᴺ`). False: stage 2b re-enters a parked candidate into stage 3, which **re-runs research from scratch**. A retry re-samples **two** stochastic stages — the researcher may produce a *different row*, the reviewer a *different verdict*. The `[0.4]` vs `[0.4, 0.6]` disagreement is direct evidence. Consequences: a `diffSha` guard is near-vacuous (a re-researched row is rarely byte-identical); and the retry can re-roll the **data**, not just the verdict. *The asymmetry survives as the real defect: a NO-GO is re-attempted on a clock; **a GO is never re-examined.** No process revisits a shipped printer. The loop runs one way — toward shipping.*

**Draft 2 then committed the same sin one stage upstream (Codex review, must-fix #1 + #2).** Having moved `evidence-incomplete` into a weekly-timer lane, it (a) fed unbounded re-researched rows into the stochastic review gate four times over, and (b) routed **RD3's own failure path** back into that timed lane — thereby laundering a corroborated judgment NO-GO into timed re-research. The spec reintroduced the exact ratchet it exists to abolish.

### The sharpened principle

> **The hazard is not retrying. The hazard is repeated attempts at a *stochastic* gate.**

- A **deterministic** gate (the evidence validator, the diff guards, `validate-data`) may be re-attempted freely. It will keep refusing until the input genuinely satisfies it. Re-running research against it is a *repair*, not a re-roll.
- A **stochastic** gate (an LLM reviewer) may not. Every attempt is a fresh sample, and only one direction (GO) is terminal.

Therefore: **every lane that can reach a review turn must be bounded, and must require new *external* evidence to enter it.** Internal effort — thinking harder, researching again — is never sufficient to buy another review sample.

### The single invariant (added after the SECOND Codex NO-GO)

Three drafts reintroduced this bug class in three different places. Enumerating per-lane rules evidently does not work. One invariant, mechanically testable, subsumes them all:

> **NO-GO taint.** Once a candidate has **any** NO-GO verdict on record, it is permanently tainted: it may occupy only `judgment-on-evidence` or `decision-required`, and it may reach a review turn **only** via (i) new external evidence that satisfies RD3, or (ii) an explicit owner instruction. **No timer, no repair lane, and no migration may ever move a tainted candidate into a lane that leads to a review turn.**

The taint is carried in the sidecar's `verdictRefs` and is **monotone** — nothing clears it except a ship or an owner decision. Enforced by `intake-parked-store.js` (refuses to write a tainted candidate into an untainted class) and by a **taxonomy-graph unit test** that asserts no path exists from a NO-GO verdict to a review turn other than the two sanctioned edges. This test is the headline regression guard of v2.1: *each of the three drafts would have failed it.*

### The reframe

**A NO-GO is not a failure. It is a question.** The next attempt may not *repeat* — it must **answer**, citing evidence not already on file. No new external evidence → no re-review, ever, regardless of how much time passes.

Because the answering step is performed by an agent that wants to ship, RD3 is explicit about what it can and cannot enforce: it raises the cost of a junk citation and makes it visible. It is **not** a semantic guarantee (see RD3's limits).

---

## 3. Decision points (RD0–RD10) — ratified 2026-07-10, amended by the Codex NO-GO

- **RD0 — Goal + scope. ✅** Amendment to v2. No new agent framework, no scheduler, **no new ledger**.

- **RD1 — Evidence provenance is a gate before the review turn (fixes D1). ✅ (amended: absence rationale)**
  For every **profile/safety-critical field** the researcher MUST record `{value, source, confidence, evidenceType}` in the candidate packet, and the row's `notes[]` MUST carry ≥1 manufacturer-class citation. `validate-candidate-evidence.js` runs **before** the PD5 gate; a field that fails → `auto-parked:research-defect` or `world-absent` (RD2), **without consuming a review turn.**

  **Field set is by reference:** `printer-addition-protocol.md` §"Field confidence" → *profile/safety-critical fields* (single source of truth).

  **A field passes when ANY of:**
  1. `confidence == "confirmed"` **and** `source != null` (a manufacturer-class citation), **or**
  2. `evidenceType == "app-cap"` on `max_acceleration` **only** — the runbook's sanctioned unpublished-figure lane; routes to the app-cap dispatch (four runbook conditions + reviewer GO). *Without this, no app-cap candidate could ever ship (hostile F3).*
  3. `evidenceType == "absence-rationale"` for a `false`/absent boolean, carrying a **typed, structurally-validated** record — not prose (Codex #2, should-fix 4: draft 3 quoted the runbook's three components but gave the schema no fields to hold them, so nothing was checkable):
     ```
     absenceRationale: { sourceClassesChecked: [...],   // e.g. ["official-product-page","manual","support-wiki"]
                         checkedSources: [{ canonicalSource, retrievedAt }],
                         normallyAdvertisedIfPresent: "<why this feature would be advertised>",
                         omissionSafeBecause: "<why the omission is safe for THIS field>" }
     ```
     All four keys required and non-empty; `sourceClassesChecked` must include ≥1 manufacturer-class entry. This mirrors `printer-addition-protocol.md`'s definition (*"which source classes were checked, what feature would normally be advertised if present, and why the omission is safe for this field"*); *"silence alone is `low-confidence`"* and still parks. *Without this, `has_lidar:false`, `has_camera:false`, `active_chamber_heating:false` — which manufacturers rarely state explicitly — would deadlock every candidate.*

  **Producer change required:** the Scout skeleton (`printer-intake-scout.js:710`) has **no `{value,source,confidence}` slot for `extruder_type` or `max_acceleration`** (nor chamber/camera/lidar). Adding the slots + the `evidenceType` field is an explicit build item.

- **RD2 — The retry taxonomy (fixes D3). ✅ (substantially amended by Codex must-fix #1, #2, #4)**

  | Class | Reasons | Trigger | Bound |
  |---|---|---|---|
  | `availability-blocked` | `review-unavailable`, bridge/network down | next run | ×5 → `decision-required` + notify |
  | `research-defect` **(untainted candidates ONLY)** | `evidence` missing/unrecorded although the source **plausibly exists** — a *repair*, not a re-roll (must clear the **deterministic** evidence gate before any review turn) | **next run, ONE bounded repair pass** — never a weekly clock | ×1 → `decision-required` + notify |
  | `world-absent` **(untainted candidates ONLY)** | evidence genuinely not published — **assignable only with a recorded complete source sweep** | **slow clock (weekly)** — re-queries the *world*, the only input a timer changes | ×4 → `decision-required` + notify |
  | `judgment-on-evidence` | `review-no-go` (corroborated), **`review-no-go-unresolved`** (an RD3 retry-gate failure), `needs-source-resolution:conflicting` | **event only**: new *external* evidence answering the objections / rules change / owner instruction. **Never a timer, and never reclassified into a timed lane.** | none; **14-day** silence → `decision-required` + one notify (RD9) |
  | `decision-required` | `new-series-group`, `app-cap-no-go`, `pd4-criteria-unmet`, `review-split`, `needs-owner-taxonomy`, `needs-taxonomy-decision`, `blocked`, **unsuffixed legacy `needs-source-resolution`**, any expired park, **any unrecognised reason** | **owner** | never auto |
  | `transient-pipeline` | `main-moved` | immediate | ×2 |

  **Why `evidence-incomplete` was split (Codex must-fix #2).** Draft 2 filed it under a weekly timer with the rationale *"a fresh research pass may find what the last one missed."* That is not a changed input — it is a **research-stage re-roll**, which §2 condemns. The split honours the sharpened principle: `research-defect` gets **one** bounded repair (it must still clear a *deterministic* gate, so re-running is safe and self-limiting); `world-absent` gets the weekly clock **only after the researcher has documented a complete source sweep**, because there the timer genuinely re-queries the world.

  **Why RD3 failures get their own reason (Codex must-fix #1).** Draft 2 said an RD3 failure parks as `evidence-incomplete` → which sat in a *timed* lane. That silently converted a corroborated NO-GO back into weekly re-research: the ratchet, reintroduced by the very rule meant to kill it. A retry-gate failure now parks as **`review-no-go-unresolved`, which stays in `judgment-on-evidence`** — event-only, forever, no clock. **Invariant: nothing that has ever received a corroborated NO-GO may re-enter a timed lane.**

  **The NO-GO taint gates the whole table (Codex #2, must-fix 1).** `research-defect`, `world-absent`, and `availability-blocked` are assignable **only to candidates with no NO-GO verdict on record.** A tainted candidate may only be `judgment-on-evidence` or `decision-required` — including on **migration**. Draft 3 migrated K2 SE (a NO-GO'd candidate) into `research-defect`, which grants a bounded repair pass that ends at a review turn: laundering, via the very fix meant to prevent it. *(Round-1 Codex recommended that migration; round-2 Codex refuted it. Recorded, because it is the cleanest possible illustration of RD4's thesis.)*

  **Producer compatibility (Codex #1, must-fix #4).** The runbook and runner emit **unsuffixed** `needs-source-resolution` (`printer-addition-protocol.md:199`, `intake-pipeline-runner.md:116`). The `:missing` / `:conflicting` subtypes do **not exist** until the producer contracts are amended to emit them — a build item. Until then, an unsuffixed reason classifies **fail-closed → `decision-required`.** The spec does not invent taxonomy its producers cannot emit.

  **Build-order constraint (Codex #2, must-fix 2 — binding on the impl plan).** The **live** runner contract v1 still carries `review-no-go → weekly ×4` and `others → weekly ×4` (`intake-pipeline-runner.md:234`). Under it, a brand-new `review-no-go-unresolved` sidecar would fall into `others` and inherit a weekly timer. **Therefore the FIRST build gate must be the taxonomy config + the runner-contract patch that fails closed on unknown reasons — before any v2.1 sidecar, store, or schema can exist.** No component that can write a v3 sidecar may land before the contract that reads it correctly. See §14 for the interim live-risk decision.

  **The `others → weekly ×4` catch-all is DELETED.** Unrecognised reason → `decision-required` + notify.

- **RD3 — The materiality gate (anti-re-roll), with honest limits. ✅ (amended by Codex must-fix #1, #3)**
  A `judgment-on-evidence` candidate may re-enter the PD5 gate **only if the attempt answers the recorded objections**. `intake-retry-gate.js` enforces:
  1. **Presence:** every recorded `objection` carries a `resolvedBy: {source, excerpt, claim, resolvedAt}`.
  2. **Novelty, on a canonical source identity:** `resolvedBy.source` normalises (lowercase host, strip query/fragment/tracking params, resolve known mirrors) to an id **not already present** in the parked `evidence[]`. Re-citing what the reviewer already rejected — or the same page with `?ref=x` — is not an answer.
  3. **Substantiation:** each `resolvedBy` carries a verbatim **`excerpt`** from the source and the **`claim`** (field + value) it supports. A bare URL is not an answer. *(Codex must-fix #3: on the real K2 SE park, `evidence[]` is empty, so under a bare-URL rule literally every source is "novel" and the cheapest bypass is "cite any new-looking link.")*
  4. **Replay guard:** the regenerated diff's `diffSha` differs from the parked `diffSha`. *(Weak necessary condition only — see §2.)*

  **Any failure → `auto-parked:review-no-go-unresolved` (class `judgment-on-evidence`), NOT a timed lane, and without a review turn.**

  **Honest limits.** Objections arrive as free-text reviewer prose. Structuring them is an LLM step, and the agent writing `resolvedBy` is the same agent that wants to ship. Therefore: **(a)** structured objections are emitted by the **reviewer output contract**, never authored by the shipping agent; **(b)** the retry gate checks *presence + canonical novelty + substantiation* — **structural** checks, not a semantic guarantee that the excerpt supports the claim; **(c)** the second reviewer (RD4) is instructed to verify each `excerpt` **against its source**, and to treat `resolvedBy.note`/`claim` as *assertions to check*, never as authority. **Codex is right that two LLM judgments do not close this.** RD3 makes the cheapest bypass (a bare plausible URL) fail, and forces a fabrication to be a *quoted excerpt* — a stronger, checkable lie. **It raises cost and visibility; it does not make bypass impossible. Claiming otherwise would repeat the motivated reasoning this spec exists to correct.**

  **Enforceable invariant:** *a review turn is never spent on an attempt without a canonically-novel, substantiated source.*

- **RD4 — Always run both reviewers; classify by the multiset. ✅ RATIFIED (owner).**
  - `{GO, GO}` → ship *(unchanged)*
  - `{NO-GO, NO-GO}` → `review-no-go` → `judgment-on-evidence`
  - `{GO, NO-GO}` → `review-split` → **`decision-required`** (owner sees both verdicts verbatim; never auto-retried)

  On a **retry**, both reviewers additionally verify each `resolvedBy.excerpt` against its source (RD3c).

  **Cost, stated without motivated minimisation (Codex #2, should-fix 5).** Both reviewers run on **every** candidate that reaches the gate — that is the rule, not "the second runs only on a NO-GO." v2 already ran both whenever the first GOed (both GOs are required to ship), so the *incremental* cost over v2's fail-fast is one extra turn **on NO-GO paths**. Draft 3's risk table said "second reviewer only on a NO-GO," which contradicted the rule; it is corrected. **Park frequency is unknown (N=1, which parked 1/1) and will be measured** — draft 1's "blocked candidates are rare" was reasoning from the desired conclusion.

  *(Note the demonstration: the hostile sub-agent's F7 — "move `evidence-incomplete` to the timed lane" — is precisely what created Codex must-fix #1 and #2. Two reviewers, opposite conclusions, and the second was right. RD4's thesis, proven on the spec that proposes RD4.)*

- **RD5 — The parked sidecar becomes the candidate's memory (fixes D2; DELIVERS D4). ✅ (amended by Codex should-fix #7)**
  ```
  { schema: "intake-parked@2", candidateKey, reason, class, firstParkedAt, lastAttemptAt,
    attempts: [{ at, runId, diffSha, outcome }],
    diffSha, baseSha, preservedRef, nextEligibleTrigger,
    candidateArtifact,            // path + sha of the filled candidate packet
    rowDraft, overlayDraft,       // what was proposed, so a retry starts from it
    validatorSummary,             // deterministic gate outputs
    verdictRefs: [{ reviewer, verdict, at, ref }],   // verbatim; ANY "NO-GO" here sets the taint
    tainted: <bool>,              // monotone; derived from verdictRefs, never hand-set
    objections: [{ reviewer, field, question, raisedAt,
                   resolvedBy?: { source, canonicalSource, excerpt, claim, note, resolvedAt } }],
    evidence:   [{ field, value, source, canonicalSource, confidence, evidenceType,
                   absenceRationale?, gatheredAt }] }
  ```
  Draft 2's schema could not reconstruct a retry (no artifact, base, ref, drafts, or validator output). PII-safe: keys/hashes only. `intake-parked-store.js` **refuses to write a tainted candidate into `research-defect` / `world-absent` / `availability-blocked`.**

  **K2 SE migration (corrected — Codex #2, must-fix 1).** Its sidecar is `review-no-go` with reviewer objections ⇒ **tainted**. Draft 3 migrated it as `research-defect`, handing a NO-GO'd candidate a bounded repair pass that ends at a review turn. It migrates instead as **`decision-required`**: its `evidence[]` is empty and unreconstructible (so RD3's novelty check has no baseline to bite on), its objections are free text, and it has already consumed a review turn. The owner may then explicitly authorise one re-attempt with sources attached — an owner instruction is a sanctioned RD2 event trigger. Fail-closed, one candidate, no special path invented.

- **RD6 — The retrospective AGENT is DEFERRED. ✅ (trigger corrected per Codex should-fix #8)**
  **Rationale.** The most valuable retrospective this pipeline will ever get already happened — manually, one day after go-live, because the owner asked *"why?"*. An automated retrospective scoped to *read the run's artifacts* would plausibly have found D1, maybe D2, and **almost certainly not D3** (that required git archaeology plus a conceptual argument). Its realistic ceiling is "catches shallow things when nobody is looking," at ~35–40% of this amendment's build cost, with its own influence surface. Further: (i) building a defect-finder while holding a backlog of found-but-unfixed defects is out of order; (ii) automated reflection always produces findings, signal or not — the existing `lesson-spotter` + calibration ledger is the same shape.

  **Build trigger:** **five non-trivial runs** (park/error/rollback/freeze) have accumulated, **or the owner asks.**
  *Draft 2's second trigger — "nobody reads the report within seven days" — is **deleted**. Codex correctly observed it has **no observable signal**: `intake-notify.js` overwrites `last-run-report.md` and there is no ack/read tracking. A "falsifiable" trigger that cannot be evaluated is exactly the unfalsifiable rubbish this spec keeps catching in itself.*

- **RD6b — Richer bad-run reports (the cheap 80%). ✅** On a non-trivial run the report carries: **verbatim** verdicts from both reviewers, the branch diff ref/stat, structured `objections[]`, the evidence table, the validator summary, and per-stage timings. Zero new components.

  **Consequence:** the typed cross-run context store (`intake-run-context.json`) is **dropped** from v2.1 — with RD6 deferred it has no producer.

- **RD7 — Consumption.** *(Merged into RD5 + RD6b. The only automatic injection into a run is a retried candidate's own sidecar.)*

- **RD8 — The constitutional line. ✅ (claim corrected per Codex optional #9)**
  > **No automated component of the pipeline may weaken a gate.**

  Automation may *add* evidence and context — better-informed decisions, never more permissive ones. Automation may **never** change: PD2/PD4 criteria, reviewer prompts or criteria, confidence thresholds, the RD1 field set, the RD2 taxonomy, or promote a park to a ship.

  **Correction — draft 2's "there is no channel by which an automated component can influence a future run" was FALSE.** RD5's sidecar *is* a channel: `objections[].question` and `resolvedBy.note` are free text, written by one agent and injected into a later run's context. It is a *narrower* channel than a retrospective (scoped to one candidate; `question` is authored by the reviewer, not the shipping agent), but it exists. Mitigations, none of which are "it can't happen":
  - `objections[].question` is authored by the **reviewer contract**; the shipping agent may not write or edit it.
  - `resolvedBy.note` is capped in length, stored quote-delimited, and **prompt-escaped on injection**; reviewers are instructed to treat it as an assertion to verify against the `excerpt`, never as authority.
  - No cross-candidate, cross-run, or free-form context is injected at all.
  - Runner **Forbidden Actions** extend to `scripts/intake-park-taxonomy.json` and to editing `objections[]`.
  - **If RD6 is ever built, its findings MUST be typed/enumerated, never free-text.** Inherited constraint.

  **Residual risks, stated plainly:** a fabricated excerpt (mitigated by RD3 substantiation + RD4 source verification — not eliminated); an owner ratifying a bad rule-change. `rule-change` findings are **owner-MANUAL** edits, not an `apply-guardrails-diff.js` target (that tool writes only the five `printer-intake-guardrails.json` keys).

  **This is not the return of babysitting.** Human gates were removed from *shipping decisions*. Amending the *safety rules themselves* is a constitutional change, and constitutional changes need a signature.

- **RD9 — Parks must not rot silently. ✅ 14 days (owner).** A `judgment-on-evidence` park reclassifies to `decision-required` after **14 days** with one notification carrying the full objection history. Other classes reclassify on bound exhaustion rather than expiring quietly.

- **RD10 — Durable committed provenance. ✅ (amended by Codex must-fix #5 — commit custody)**
  **The fact that decides it:** runner stage 8 says *"Terminal resolution (**shipped** / declined / …) → delete the staging skeleton."* Sidecar-only provenance would preserve evidence for every printer we *rejected* and destroy it for every printer that is *live*.

  **Therefore:** a tracked `docs/printer-provenance.json`, keyed by printer id, holding per-field `{value, source, canonicalSource, confidence, evidenceType, gatheredAt}` + run id. PII-free. It cannot live in `data/printers.json` (the overlay validator's `allowedPrinterFields` rejects unknown keys) and `docs/**` is `.assetsignore`d, so no deploy churn.

  **Commit custody (the v2 CRITICAL-C1 defect class, verified applicable):** the preflight fail-closes on *any* dirty web tree **and on `ahead != 0`**. `docs/**` being asset-ignored does **not** solve git dirt. Therefore the ledger line and the provenance update land in **ONE atomic per-candidate custody commit, pushed BEFORE the runner watermark advances and before staging cleanup.**

  **Custody repair must precede the generic predicate (Codex #2, must-fix 3).** Draft 3 promised stage-0 repair, but stage 0 is unreachable: a crash *before* the commit leaves `web-dirty` (preflight exits) and a crash/push-failure *after* it leaves `ahead=1` (preflight exits) — the pipeline deadlocks and the repair never runs. Therefore **`intake-run-preflight.sh` gains an exactly-recognised custody-state pass, evaluated BEFORE the clean/in-sync predicate:**
  - a dirty tree is tolerated **iff** the *only* modified paths are `scripts/printer-intake-outcomes.jsonl` and `docs/printer-provenance.json`;
  - `ahead > 0` is tolerated **iff** *every* ahead commit touches only those two paths and matches the custody-commit subject pattern.

  Anything else remains fail-closed. The runner then completes or rolls back the custody transaction as its first act. **This is a narrowly-scoped relaxation of a safety predicate and must be treated as such:** it is exactly-recognised (two paths, one subject pattern), unit-tested against a crash-injection fixture, and any deviation still blocks the run.

---

## 4. Architecture delta

| Stage | v1 | v2.1 |
|---|---|---|
| 0 startup reconciliation | ledger identity check | + **repair ledger/provenance disagreement** (RD10); no context injection |
| 2b parked retry sweep | due-by-timer | **RD2 taxonomy**; `judgment-on-evidence` is event-only and **never reclassified into a timed lane**; branch deletion must not precede sidecar `diffSha`/`preservedRef` salvage |
| 3 research + fill | fills the row | + record `{source, confidence, evidenceType}` per profile/safety-critical field + `notes[]` citation (RD1); + read `objections[]`/`evidence[]`/`rowDraft` on retries (RD5) |
| **3b evidence gate** *(new)* | — | `validate-candidate-evidence.js`; app-cap + absence-rationale accepted (RD1) |
| **4b retry gate** *(new)* | — | `intake-retry-gate.js`: presence + canonical novelty + substantiation + replay (RD3) |
| 5 merge gate (PD5) | fail-fast on first NO-GO | **always run both**; multiset classification; reviewers emit **structured objections**; on retries both verify each `excerpt` against its source (RD3c, RD4) |
| 7 ledger | ledger line per candidate | **ONE atomic custody commit: ledger line + provenance, pushed before watermark advance** (RD10) |
| 8 staging lifecycle | ad-hoc retry | RD2 taxonomy; sidecar v2 (RD5); RD9 14-day no-rot |
| 10 notify | summary | + non-trivial runs: verbatim verdicts, objections, evidence table, validator summary, diff ref, timings (RD6b) |

**Components:** `scripts/intake-park-taxonomy.json` + validator · `validate-candidate-evidence.js` + test · `intake-retry-gate.js` + test (incl. canonical-source normaliser) · `intake-parked-store.js` + test + v1→v2 migration · `intake-provenance-store.js` + test · `docs/printer-provenance.json` · Scout skeleton slots + `evidenceType` · reviewer output contract (structured objections) · runner contract **v2** · Assistant amendment · runbook amendment.

**Dropped vs draft 1:** `intake-run-context.json` + schema validator, `intake-findings.js`, `docs/intake-run-findings.jsonl`, `intake-run-retrospective.md` — deferred with RD6.

---

## 5. Non-goals

- No new agent framework, scheduler, **or ledger**; no self-modifying rules engine.
- **No retrospective agent in v2.1** (RD6, deferred).
- **No cross-run or cross-candidate context injection.**
- **No relaxation of PD5's merge condition.** RD4 adds *"always ask both"*, never *"one GO is enough."*
- **No timed lane is ever reachable from a corroborated NO-GO.**
- No change to Scout triage, S3 guardrails, or S4's `--apply` loop.
- No engine / `app.js` / `data/*` semantics change; `data/printers.json` row *schema* untouched (RD10 records provenance beside it, never inside it).
- No reviewer-prompt tuning (data-gated; N=1).

## 6. Mandatory data/logic-change evaluation (web + iOS + Android-plan)

- **Engine / app / data semantics: untouched.** Rows ship through the identical validator stack.
- **Web UI:** none. **iOS:** none (delivery unchanged; mirror stays a local post-merge commit under the push gate). **Android (planned):** the future `android-printer-overlay-v1.json` extension point is unaffected; evidence + retry semantics apply unchanged.
- **RD10 constraint:** per-field provenance cannot live in shipped rows (`allowedPrinterFields` rejects unknown keys, `validate-ios-printer-overlay.js:121`); it lives in a sibling tracked file. `docs/**` is `.assetsignore`d (verified `.assetsignore:16-17`), so zero served bytes change; the **git-dirt** hazard is handled by RD10's custody commit, not by asset-ignoring.

## 7. Testing / validation strategy

- Every new script: `node:test`, RED-first, fixtures only; never mutates live parked state, the real ledger, or the real provenance file.
- **RD3 adversarial tests:** byte-identical diff → refuse, **zero review requests emitted**; whitespace-only change → refuse; `resolvedBy.source` differing only by `?ref=`/host case/known mirror → **refuse** (canonical identity); `resolvedBy` without `excerpt`/`claim` → refuse.
- **THE headline test — NO-GO taint / taxonomy-graph reachability:** enumerate the taxonomy as a graph and assert **no path exists from any NO-GO verdict to a review turn** except the two sanctioned edges (RD3-satisfying new external evidence; explicit owner instruction). Assert `intake-parked-store.js` refuses to write a tainted candidate into `research-defect` / `world-absent` / `availability-blocked`, **including on migration**. *Each of the three spec drafts would have failed this test — draft 1 via `review-no-go → weekly`, draft 2 via `retry-gate failure → evidence-incomplete → weekly`, draft 3 via `K2 SE migration → research-defect → repair → review`.*
- **RD2 lane test:** `research-defect` gets exactly ONE repair pass; `world-absent` requires a recorded source sweep before assignment; both refuse tainted candidates.
- **RD10 crash-injection test:** kill between ledger-write and commit → preflight's custody pass recognises the two-path dirt and the runner repairs; kill between commit and push → `ahead=1` recognised, repaired; **a third dirty path or a foreign ahead-commit still fail-closes.**
- **RD1 regressions:** an app-cap `max_acceleration` candidate **passes** the evidence gate and reaches the reviewer; a `has_lidar:false` with a three-component absence rationale **passes**; the same with silence **parks**; a `null`-source `max_speed` parks without a review turn.
- **RD10:** provenance append is idempotent per printer id; ledger + provenance land in one commit; a simulated crash between them is repaired by stage-0 reconciliation; `git status` is clean afterwards (preflight green — the C1 proof).
- Migration proven against the **real** K2 SE (from the tag; never mutated in place until the migration commit), asserting it lands in `research-defect`.
- Per-gate: implement → hostile sub-agent review → patch → QA → commit → ledger tick. Codex review gates the impl plan.

## 8. Success criteria

1. **K2 SE is the end-to-end acceptance test.** Under v2.1 it either ships with a `notes[]` citation + per-field sources in `docs/printer-provenance.json`, or parks for a **different, better** reason. *Re-parking for the identical unexamined reason is a failure of this spec.*
2. **A `judgment-on-evidence` candidate without a canonically-novel, substantiated source consumes zero review turns** — provable from the report (review-invocation count = 0).
3. **No path exists from any NO-GO verdict to a review turn**, except new RD3-satisfying external evidence or an explicit owner instruction — unit-enforced over the taxonomy graph, migration included.
4. **No park reason lacks a class**; the catch-all is gone; unsuffixed legacy reasons fail closed.
5. **Every profile/safety-critical field of a shipped printer is traceable to a source (or a recorded absence rationale) from committed data alone**, and stays so after the sidecar is deleted at ship time.
6. **A retried candidate's report cites the objection it answered, the new canonical source, and the excerpt** — the measurable form of "findings used next time."
7. Preflight is green after every run (custody commit left no dirt).
8. The manual protocol still works unchanged; the runbook remains canonical on conflict.

## 9. Risks

| Risk | Mitigation |
|---|---|
| **Fabricated excerpt satisfies RD3** | Canonical novelty + substantiation + RD4's source verification. **Mitigated, not eliminated — two LLM judgments do not close this (Codex).** Residual accepted; over-flagging beats bypass |
| **A ratchet re-appears somewhere new** | **Three drafts reintroduced it in three different places.** Per-lane rules demonstrably do not hold. The single NO-GO-taint invariant + the taxonomy-graph reachability test (criterion 3) is the structural guard; every draft would have failed it |
| **The LIVE contract still carries the ratchet** | Build-order constraint: taxonomy + contract fail-closed patch is gate R0, before anything can write a v3 sidecar. **Interim live risk (K2 SE weekly retry due 2026-07-17) is an owner decision — §14** |
| RD10's custody pass relaxes a safety predicate | Exactly-recognised (two paths, one subject pattern), crash-injection tested, everything else still fail-closed |
| Evidence gate deadlocks legitimate candidates | app-cap lane + absence-rationale evidence type (both by the runbook's own definitions); ship/park ratio measured before tightening |
| `judgment-on-evidence` parks accumulate | RD9: 14 days → `decision-required` + one notify |
| RD10 dirties the tree → preflight deadlock | One atomic custody commit (ledger + provenance) pushed before watermark advance; stage-0 repair; explicit test |
| RD4 raises review cost | Second reviewer only on a NO-GO; frequency unmeasured (N=1) — tracked, not assumed |
| Over-fitting to N=1 | RD1/RD2/RD3 are structural. The retrospective — the most speculative component — is deferred |
| Deferring RD6 leaves a blind spot | Honest residual. The deleted "nobody reads it" trigger had no signal; the surviving trigger is a countable one (5 non-trivial runs) or an owner ask |
| The `intake/k2_se` branch is deleted by the next run | **Owner ratified: accept.** Tag `intake-k2se-first-run-evidence` + scratchpad patch + hash `b88ae6df048d75c6` |

## 10. Owner decision record (2026-07-10)

| # | Question | Decision |
|---|---|---|
| Q1 | Always run both reviewers on a NO-GO? | **Yes** ("I agree") → RD4 |
| Q2 | Retrospective scope | Owner asked for an honest value/effort call → **agent DEFERRED**; RD6b built instead |
| Q3 | Committed provenance vs sidecar-only | Owner delegated → **tracked `docs/printer-provenance.json`** (RD10), because shipped sidecars are deleted |
| Q4 | Judgment-park silence window | **14 days** → RD9 |
| Q5 | Tomorrow's branch deletion | **Do nothing** ("Fine by me") — the tag preserves it |

## 11. Review record — hostile sub-agent (GO-WITH-PATCHES, 14 findings, all applied)

5 HIGH: **F1** §2's ratchet argument was motivated reasoning (retries re-run research; `diffSha` near-vacuous); **F2** RD3's "deterministic" semantic check is an LLM trust boundary; **F3** RD1 broke the ratified app-cap lane; **F4** the field set dropped 5 runbook fields and demanded slots the Scout doesn't emit; **F5** the provenance success criterion was unachievable (→ RD10); **F6** the preserved branch dies on the next *daily* run, not the weekly retry date.
MEDIUM: **F7** *(later shown WRONG by Codex — see §12 #1/#2)* move `evidence-incomplete` to the timed lane; **F8** free-text context injection is an influence vector; **F9** the spec violated its own "no new ledger"; **F10** the S4 `--apply` reuse claim was empty; **F11** the taxonomy missed real reasons.
LOW: **F12** "blocked candidates are rare" vs a 100%-park sample; **F13** RD4 order-independence; **F14** an unfalsifiable success criterion.

## 12. Review record — Codex cross-model (**NO-GO**, 9 findings, all applied)

Transcript: [`codex/intake-autonomy-v2.1-review/bridge-2026-07-10-154723-685395.md`](../../../codex/intake-autonomy-v2.1-review/bridge-2026-07-10-154723-685395.md).

**must-fix**
1. **RD3 failure reclassified a corroborated NO-GO into a weekly retry lane** — the ratchet, reintroduced by the anti-ratchet rule. → RD3 failures park as `review-no-go-unresolved`, staying `judgment-on-evidence`; **no timed lane is reachable from a NO-GO** (unit-enforced, criterion 3).
2. **`evidence-incomplete` on a weekly timer contradicts the spec's own principle** — "fresh research may find what the last one missed" is a research-stage re-roll, not a changed input. → Split into `research-defect` (ONE bounded repair; must clear a *deterministic* gate) and `world-absent` (weekly, only after a recorded complete source sweep). §2 sharpened: *the hazard is repeated attempts at a **stochastic** gate.*
3. **RD3's novelty check is trivially bypassed on the real K2 SE park** (its `evidence[]` is empty ⇒ every source is "novel"; cheapest bypass = cite any new-looking URL). → Canonical source identity + mandatory `excerpt` + `claim` per objection; K2 SE migrates as `research-defect`.
4. **The `needs-source-resolution:missing/conflicting` subtypes don't exist in the producers** (runbook `:199`, runner `:116` emit it unsuffixed). → Unsuffixed = fail-closed `decision-required`; subtypes only after an explicit producer-contract change.
5. **RD10 recreates the v2 CRITICAL-C1 dirty-tree deadlock** (`docs/**` is asset-ignored, which does not solve git dirt). → ONE atomic custody commit (ledger + provenance) pushed before watermark advance; stage-0 repairs disagreement.

**should-fix**
6. RD1 deadlocks legitimate absence fields (`has_lidar:false` etc.) → structured `absence-rationale` evidence type, using the runbook's own three-component definition.
7. RD5's sidecar cannot reconstruct a retry → added `candidateArtifact`, `baseSha`, `preservedRef`, `rowDraft`, `overlayDraft`, `validatorSummary`, `verdictRefs`.
8. RD6's trigger (b) *"nobody reads the report within seven days"* has **no observable signal** (`intake-notify.js` overwrites the report; no ack tracking) → trigger deleted; survivors are "5 non-trivial runs" or an owner ask.

**optional**
9. *"No free-text is injected"* was **false** — RD5 injects `objections[].question` and `resolvedBy.note`. → RD8's claim corrected; the channel is named, narrowed (reviewer-authored questions; capped, escaped, quote-delimited notes treated as assertions-to-verify), and honestly disclosed.

## 13. Review record — Codex cross-model, pass #2 (**NO-GO**, 5 findings, all applied)

Transcript: [`codex/intake-autonomy-v2.1-review/bridge-2026-07-10-155809-076395.md`](../../../codex/intake-autonomy-v2.1-review/bridge-2026-07-10-155809-076395.md).

**must-fix**
1. **The K2 SE migration launders a prior NO-GO into a fresh review path.** Draft 3 migrated it as `research-defect` — which grants a bounded repair pass ending at a review turn — while its real sidecar is `review-no-go` with objections. **Codex round 1 recommended exactly this migration; round 2 refuted its own advice.** → The **NO-GO taint invariant** (§2) + `decision-required` migration. *This is the single most valuable finding of the whole exercise: it generalises three separate bugs into one testable rule.*
2. **The LIVE runner contract still has the bad timer path** (`review-no-go → weekly ×4`, `others → weekly ×4`, `intake-pipeline-runner.md:234`); a new `review-no-go-unresolved` sidecar would fall into `others` and inherit a weekly clock. → Build-order constraint (gate R0 = taxonomy + fail-closed contract patch, before any v2.1 store/sidecar exists) + §14 interim decision.
3. **RD10's custody commit still deadlocks on crash/push failure**: preflight blocks on dirty *and* on `ahead != 0`, so stage-0 repair is unreachable in both crash windows. → Exactly-recognised custody-state pass evaluated *before* the generic predicate; crash-injection tested; everything else fail-closed.

**should-fix**
4. `absence-rationale` matched the runbook's wording but the schema had **no fields to hold it**, so nothing was checkable. → Typed `absenceRationale { sourceClassesChecked, checkedSources, normallyAdvertisedIfPresent, omissionSafeBecause }`, all required.
5. RD4's cost model contradicted its own rule ("always run both" vs "second reviewer only on a NO-GO") — *motivated cost minimisation*. → Corrected: both always run; the **incremental** cost over v2's fail-fast is one turn on NO-GO paths.

**Codex's own summary of the residue:** *"RD3's canonical source + excerpt + claim does raise bypass cost for the normal judgment lane. The cheaper bypass is now the K2/research-defect migration, not RD3 itself."* — i.e. the core mechanism held; the remaining hole was in the migration, and is now closed by the taint invariant.

## 14. Live-system decision required (before 2026-07-17)

The **running** pipeline still executes runner contract v1: `review-no-go → weekly ×4`. K2 SE was parked `review-no-go` on 2026-07-10, so its first timed retry falls due **2026-07-17** — a real re-roll of a real candidate through re-research + re-review. v2.1 will not be built by then.

| Option | Effect | Cost |
|---|---|---|
| **(a) Patch the contract line now** *(recommended)* | Make `review-no-go` event-only in `intake-pipeline-runner.md` + fail-closed on unknown reasons. The ratchet stops immediately; K2 SE sits until v2.1 or an owner instruction. | ~2 min, **docs/contract only, no code**. Becomes gate R0 of the plan. |
| (b) Freeze the pipeline | `scripts/.intake-autonomy-freeze` halts all runs until v2.1 lands. | Blocks legitimate new requests. |
| (c) Do nothing | The 07-17 run re-rolls K2 SE through research + review. | Accepts one live ratchet firing. |

**Recommendation: (a).** It is the minimal intervention that removes a known live safety defect, it is a contract edit rather than code, and it is required as gate R0 regardless.

**Next gate:** owner picks §14 → gated impl plan (R0 = taxonomy + contract fail-closed) → hostile + Codex review of the plan → build.
