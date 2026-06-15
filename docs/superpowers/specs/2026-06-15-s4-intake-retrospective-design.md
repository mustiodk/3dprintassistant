# S4 — Intake Retrospective (learning loop, Approach A) (design spec)

**Date:** 2026-06-15
**Status:** Draft — pending sub-agent review → patch → QA gate
**Topic:** S4 of the feedback-pipeline evolution (S1 · S2 · S3 · **S4 Intake Retrospective** · S5 autonomy ladder)
**Scope:** a new **Intake Retrospective** agent/skill + a **diff schema + validator** (extends S3's) + a lightweight **outcomes ledger** + a calibration ledger. Reads intake run history + owner triage outcomes; **proposes** owner-ratified diffs to S3's `scripts/printer-intake-guardrails.json`. **No engine, app, data-profile, overlay, or runtime-Scout change.**
**Ship path:** process/automation — the retrospective is owner-run or scheduled; only **owner-ratified** diffs are applied. **Depends on S3** (the config + validator).

> Implements the **locked Approach A**: agents "evolve" via a reflective propose-and-approve pass *between* runs — reusing the **lesson-spotter** read-only-candidate pattern + the **Curator** schema-validated structured-diff mechanism — that proposes diffs to the versioned config the **deterministic** Scout reads. **Runtime stays deterministic and auditable — no LLM at decision time.** Approach B (runtime reasoning) is rejected; C (selective B later) only if A's evidence demands it.

---

## 1. Problem

The pipeline does not learn. Every brand typo, model suffix, mis-decline, or misroute pattern that defeats the Scout (the S1/S2/S3 evidence) is caught — if at all — by the human safety net or a one-off code/config edit. Nothing systematically reflects on what the Scout got wrong and proposes **durable** guardrail improvements. So S3's config stays *static* ("defined", not "learned"), and S5's autonomy can't be *earned* (there is no evidence engine to justify it).

## 2. Approach (locked: Approach A)

Learn **between** runs via a reflective **propose-and-approve** pass; **runtime stays deterministic.** The retrospective is the *only* place judgment enters, and it only **proposes** — the owner ratifies, and the Scout at decision time reads only the ratified config (deterministic, auditable). This is **lesson-spotter** (read-only candidates) + **Curator** (schema-validated structured diff, owner-ratified, versioned, tombstoned). "Defined guardrails" = the static contract; "learned guardrails" = the owner-ratified accretion of S3's config. **Approach B (runtime LLM reasoning) is explicitly rejected**; C only if A's evidence demands.

## 3. Scope

**In:** (a) an Intake Retrospective agent/skill that reads owner outcomes since a watermark and **proposes** config diffs; (b) a **diff schema + validator** that extends S3's config validator; (c) the **propose-and-approve flow** (owner approves → validated diff applied → version bump + `_provenance` + watermark advance); (d) a committed, PII-safe **outcomes ledger** — the durable supervision spine — which **requires amending the Printer Addition Assistant's permission scope** to append to it (the Assistant's `project-writer` scope currently forbids writing outside its 4 enumerated paths); (e) a **calibration ledger + halt threshold**.

**Out:** runtime LLM reasoning (Approach B); the autonomy **ladder** (S5 — branch/PR/go-no-go graduation); auto-applying **judgment** diffs without owner approval; any engine/app/overlay/runtime-Scout change.

## 4. Design

### 4.1 Inputs (what the retrospective reflects on)

1. **The outcomes ledger — the PRIMARY, durable supervision signal.** The Scout's raw run report is a **single, overwritten, gitignored** file (`scripts/.printer-intake-out/run-report.json`, confirmed git-ignored) — there is **no accumulating run-history corpus on disk**, so the retrospective cannot iterate "run reports since a watermark." The durable input is instead a **committed, PII-safe outcomes ledger** the Printer Addition Assistant appends to when it processes a run: one line per candidate — `{ candidateKey, runId, scoutOutcome, ownerResolution, correctiveSignal }`, where:
   - `candidateKey` = the Scout's `request.key` (exists today, PII-safe);
   - `runId` = the run's `source.watermarkOut` timestamp (**the only run-identity the report has — there is no `runId` field**);
   - `ownerResolution ∈ {shipped, declined-correct, was-duplicate-missed, was-brand-typo, was-suffix-variant, was-noise, was-mis-declined}`;
   - `correctiveSignal` names the guardrail that *would* have prevented a Scout miss (e.g. `brandAliases:sparkx→creality`, `modelSuffixStrip:w/cfs`, `nonFdmNoteAcronyms:+sla`, or `resinKeywords:-mars` for a mis-decline).
   This ledger **is** the history the retrospective reads since its watermark; without it the retrospective can only guess.
2. **The latest Scout run report — best-effort context only.** When present, the retrospective may read the current `run-report.json` for `possibleBrandTypo` hints (an S3 deliverable — present only once S3 ships **report `version ≥ 3`**) + counts. It is **not** a history source and the retrospective does not depend on it. (`sourceLane` is an **S2** field — present only if S2 has landed; treat as optional.)
3. **The current config** (S3) — to dedupe proposals and stay idempotent.

**Dependency gate:** the retrospective is a **no-op until S3 ships** (the config + the v3 report) and the **outcomes ledger has ≥1 entry**. Bootstrapping = empty diff (correct, not a failure).

### 4.2 The retrospective loop (mirrors the Curator: gather → extract → cluster → reconcile → compact → emit diff)

1. **Gather** — read run reports + outcomes ledger **newer than the watermark** (bounded look-back; missing/stale watermark → **loud full rebuild, never silent unbounded re-read** — the Curator's gotcha).
2. **Extract** — candidate guardrail changes, each with a **citation** (which run/outcome evidences it). No citation → not proposed (HYPOTHESIS at most).
3. **Cluster** — promotion requires **≥2 independent corroborations** (the same typo/suffix in ≥2 distinct requests; deduped by requester identity — repetition by one requester ≠ confirmation). **Exception:** a single **owner-STATED** correction (from the outcomes ledger) suffices — `stated > observed`, as in the Curator.
4. **Reconcile** — a proposed change that overturns a deliberate prior config entry needs **equal-or-higher** evidence; a lone contradiction is **parked**, not auto-applied.
5. **Compact** — merge by target key (e.g. `brandAliases.<x>`); **idempotent** (identical re-run = no-op); a proposed removal writes a **tombstone**, never a silent delete.
6. **Emit a diff** — a structured changeset where **every entry conforms to a schema a validator enforces** (not prose). **The wrapper permits an empty `changes: []`** (a clean no-op diff — do **not** copy the Curator's `minItems:1` on the wrapper; the validator treats empty as success, for the bootstrapping / no-learning case):
   ```
   action:     add | modify | retire
   target:     brandAliases.<key> | modelSuffixStrip[] | resinKeywords[] | nonFdmTech[] | nonFdmNoteAcronyms[]
   value:      <the entry>
   evidence:   <≥1 citation: candidateKey(s) (request.key) + runId(s) (watermarkOut)>
   confidence: stated | observed         # owner-tagged correction vs inferred-from-outcomes
   rationale:  <one line>
   ```
   **v1 diff targets are only the config keys the deterministic Scout actually reads** — `brandAliases`, `modelSuffixStrip`, `resinKeywords`, `nonFdmTech`, `nonFdmNoteAcronyms`. **`brandTokens`/`familyTokens` are deliberately excluded from v1**: the Scout never reads them (S3 §4.1 — S2-consumed-only), so no Scout outcome could ever evidence a change to them; they become learnable **only once S2 has landed and emits its own outcomes**.
   The validator **rejects** any entry missing a required field, any `add` whose target/value would fail **S3's config validator** (e.g. an alias whose value isn't a real `brands[].id`), and any change with **no evidence**.

### 4.3 Propose-and-approve (owner ratifies)

- The retrospective **emits the diff read-only — it never edits the config.**
- The owner reviews the diff **in-session**, or **merges a PR** (scheduled/Walk stage). On approval, the validated diff is applied to `scripts/printer-intake-guardrails.json`: each entry added with `_provenance` (`candidateKey`s + `runId`s + date + rationale), **`version` bumped**, `lastRatified` updated, the retrospective **watermark advanced**.
- **Mechanical vs judgment split (Curator):** the only changes auto-appliable at a "Run" stage are **mechanical** (date-stamp / dedup / format-normalisation / applying an *already-owner-approved* tombstone). **All content changes** (a new alias/suffix/keyword/token) are **judgment → always owner-approved, even at Run.** "Config content is never silently auto-edited at any stage."

### 4.4 Reuse, not reinvention (the load-bearing constraint)

- **Read-only candidate pattern = lesson-spotter.** The retrospective is a read-only checkpoint returning **candidate diffs**; **compact** by default, **escalate** only when the window had owner corrections / repeated Scout misses / a painful repeat. It does not edit; the owner accepts/rejects. Append one row per run to a **calibration ledger** (`ai-operating-model/docs/agents/intake-retrospective-calibration.md`, mirroring `lesson-spotter-calibration.md`).
- **Schema-validated structured diff + watermark + versioning + tombstone audit + calibration-halt = Curator.** Adopt the Curator's diff-schema/validator shape and its **calibration threshold: >30% owner-reject over 3 consecutive cycles → halt the auto-proposal cadence + recalibrate.** Do not rebuild these mechanisms.
- **Curator source-root gotcha** — the config is in-repo (`scripts/`), not a per-cwd memory store, so the migration trap doesn't directly apply; but the principle holds — **resolve the run-report/ledger input paths at runtime and count-confirm; never hardcode.**

### 4.5 Where state lives

| State | Location |
|---|---|
| The config (diff target) | `scripts/printer-intake-guardrails.json` (S3) |
| Retrospective watermark | `scripts/.printer-intake-retrospective.watermark.json` (sibling of the Scout's watermark) |
| Outcomes ledger (the durable history) | **committed, PII-safe** at a *tracked* path — `scripts/printer-intake-outcomes.jsonl` (**not** under the gitignored `scripts/.printer-intake-out/` staging dir). It must be durable history (raw run reports are overwritten + gitignored), so committed is the right call; PII-safety (`candidateKey` + `runId` only, **no raw text**) makes committing acceptable. **Trade-off:** the Assistant gains a commit obligation when processing a queue (acceptable — it already commits when shipping a printer) and the ledger is a permanent PII-surface decision (mitigated by keys-only). |
| Calibration ledger | `ai-operating-model/docs/agents/intake-retrospective-calibration.md` |
| The agent contract | `ai-operating-model/docs/agents/intake-retrospective.md` (+ optional skill in `Projects/skills/`) |

## 5. Affected sites

| Surface | File | Change |
|---|---|---|
| Agent contract | **new** `ai-operating-model/docs/agents/intake-retrospective.md` | the retrospective's role, inputs, the diff schema, the loop, the mechanical/judgment split, calibration |
| Diff schema + validator | **new** `scripts/validate-guardrails-diff.js` (+ schema) | validates a proposed diff against the schema **and** S3's config validator before it is shown/applied; **permits an empty `changes:[]`** (no-op); v1 `target` enum excludes `brandTokens`/`familyTokens` |
| Outcomes ledger | **new** `scripts/printer-intake-outcomes.jsonl` + **amend the Assistant's Permission Level + Allowed Actions** in `ai-operating-model/docs/agents/printer-addition-assistant.md` | add **append-only write to that one path** (the Assistant's `project-writer` scope enumerates 4 paths and *forbids* writing outside them — a mission step alone is insufficient; the **permission scope must be amended**) + the mission step appending one PII-safe outcome line per processed candidate |
| Calibration | **new** `ai-operating-model/docs/agents/intake-retrospective-calibration.md` | one row per run; the >30%/3-cycle halt rule |
| Config | `scripts/printer-intake-guardrails.json` (S3) | gains `_provenance` + version bumps **only when an owner-approved diff is applied** |

## 6. Testing / validation strategy

- The retrospective is **judgment** (an agent), so "testing" targets the **deterministic + validator** parts:
  - **diff validator** unit tests (Node, spawn-or-import style matching the repo): rejects malformed / evidence-less / invalid-target diffs (e.g. alias value not in `brands[].id`); accepts a valid diff.
  - **gather/cluster/dedup** golden-file check: a fixture of run-reports + outcomes → an expected candidate-diff (the deterministic pre-judgment parts).
  - **apply path:** an approved diff bumps `version` + writes `_provenance` + advances the watermark; **idempotent re-run = no-op**; a malformed diff is refused.
- **Dry-run is the default** (propose only); applying requires explicit owner approval.
- **QA gate:** validator tests green; the fixture produces a sane candidate diff; the apply path is idempotent + version-bumping; `node --check` clean.

## 7. Cross-platform impact (mandatory evaluation)

- **Engine / data-profile / overlay / app:** **none.** The retrospective only **proposes** diffs to the intake config (S3, under `scripts/`, not served); **runtime stays deterministic.** The mandatory data/logic-change evaluation is **N/A for the web + iOS app surfaces** — recorded per the standing rule.
- **iOS:** **none.** **iOS push gate:** **N/A.**

## 8. Risks / open questions

1. **Over-proposing / owner fatigue** → the **>30%-reject / 3-cycle halt** + compact-by-default.
2. **Bad learning** (a "typo" alias that's actually a real new brand) → the **≥2-corroboration** cluster rule + **owner approval** + S3's **referential validator** (alias value must be a real brand).
3. **Outcomes-ledger capture burden** on the Assistant → keep it **one PII-safe line per candidate**; the minimal `{candidateKey, scoutOutcome, ownerResolution, correctiveSignal}` set.
4. **Watermark / look-back** → the Curator's **loud-full-rebuild-on-stale-watermark** rule.
5. **PII in the outcomes ledger** → reference candidate **keys/hashes**, never raw requester text; gitignore the ledger if any context leaks.
6. **Scope creep into S5** → S4 only **proposes** config diffs + calibration; the autonomy **ladder** (branch/PR/go-no-go graduation) is S5. S4 is the *evidence engine*; S5 is the *graduation*.
7. **Bootstrapping** → before any history accrues, the retrospective proposes nothing (empty diff) — that is correct, not a failure (the schema permits empty `changes:[]`).
8. **Input substrate** → raw run reports are overwritten + gitignored, so the **committed outcomes ledger is the durable history** (§4.1); the retrospective does not depend on a run-report corpus, and is a **no-op until S3 ships report v3 + the ledger has entries**.
9. **Learning into a field nothing reads** → v1 diff targets exclude `brandTokens`/`familyTokens` (the Scout never reads them); they become learnable only after S2 lands + emits outcomes (§4.2 step 6).

## 9. Relationship to the rest of the pipeline

S4 is the **evidence engine**: it turns S3's static config into a learning surface, and its calibration record (owner accept-rate, config maturity) is **exactly what S5's autonomy ladder is gated on**. Depends on **S3** (the config + validator); reuses the **lesson-spotter** + **Curator** patterns; feeds **S5**. S4 and S5 are "the same project" in the owner's framing — the loop is the evidence that justifies more autonomy.

## 10. Success criteria

- A reflective **propose-and-approve** pass reads the owner-outcomes ledger since a watermark and emits a **schema-validated diff** of candidate guardrail changes (aliases / suffixes / resin & non-FDM keywords — the config keys the Scout reads; `brandTokens`/`familyTokens` excluded in v1), each **evidence-cited** (`candidateKey` + `runId`), **read-only** (never auto-edits content).
- **Owner approval** applies the validated diff: config **version bump** + `_provenance` + **watermark advance**; reject = no change; **idempotent**.
- **Runtime stays deterministic** (no LLM at Scout decision time).
- **Reuses** lesson-spotter (read-only candidate, compact/escalate, calibration ledger) + Curator (schema diff, validator, mechanical/judgment split, tombstone, >30%-reject halt) — **not reinvented.**
- A malformed / evidence-less / invalid-target diff is **rejected** by the validator.
- No engine/data/overlay/app change.
- **Commit decomposition:** (1) the outcomes-ledger file + the **Assistant permission-scope amendment + mission step**; (2) the diff schema + validator; (3) the retrospective agent contract + calibration ledger + the apply path. One finding = one commit (cross-repo: `scripts/` in 3dpa, `docs/agents/` in ai-om).
