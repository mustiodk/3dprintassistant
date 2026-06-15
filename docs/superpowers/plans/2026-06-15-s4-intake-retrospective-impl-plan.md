# S4 — Intake Retrospective: implementation plan

**Date:** 2026-06-15
**Status:** Draft — pending sub-agent review → patch → QA gate
**Spec:** [`../specs/2026-06-15-s4-intake-retrospective-design.md`](../specs/2026-06-15-s4-intake-retrospective-design.md) (QA-green — the plumbing gaps from review are folded: ledger-as-durable-spine, `request.key`/`watermarkOut` identity, Assistant permission amendment, empty-diff, v1 targets exclude `brandTokens`/`familyTokens`)
**Topic:** S4 of the feedback-pipeline evolution
**Scope:** cross-repo — `scripts/` + `docs/` in `3dprintassistant`, `docs/agents/` in `ai-operating-model`. **No engine, app, data-profile, overlay, or runtime-Scout change.**
**Ship path:** process/automation — owner-run or scheduled; only **owner-ratified** diffs are applied.
**Commit decomposition:** **3 commits** (cross-repo).

> **EXECUTION IS DEFERRED, and additionally GATED ON S3 + S2.** S4 needs S3's config + the v3 report + S3's validator, and the outcomes ledger needs entries. Until S3 ships, the retrospective is a **no-op**. This plan describes the gates for when both S3 has landed and execution is authorized.

---

## 0. Preconditions & grounded context

- **Spec QA-green.** Design + pattern-fidelity confirmed (deterministic-runtime invariant preserved; Curator + lesson-spotter reuse faithful). The patches fixed the plumbing the design assumed.
- **Hard dependency: S3 must land first** (the config, the v3 report, the config validator). S4 also reads the **outcomes ledger** as its durable history — raw run reports are overwritten + gitignored (verified), so they are **not** a history source.
- **Identity:** `candidateKey` = the Scout's `request.key`; for a **collapsed** multi-request candidate use the full **`requestKeys[]`** set (the singular `request.key` is only the first occurrence — the ≥2-corroboration cluster rule needs all of them). `runId` = `source.watermarkOut`; it is **run-granular** (same for every candidate in a run) and is **absent on `--no-watermark`/non-KV runs** → fall back to the report-file mtime / run wall-clock. Both are PII-safe.
- **Assistant permission is a contract amendment, not just a step** — the Assistant's `project-writer` scope enumerates 4 paths and forbids writing outside them; Gate 1 amends it.
- **Test reality:** spawn/import Node tests, **no `package.json`**; the diff validator chains S3's config validator.
- **Deterministic-runtime invariant (load-bearing):** nothing here puts an LLM in the Scout's decision path. The retrospective only **proposes** diffs read-only; the owner ratifies; the Scout reads only the static ratified config.

---

## 1. Gates

Each gate: **implement → sub-agent review → patch → gate QA (local Node) → commit.** Advance only on green.

### Gate 1 — Outcomes ledger + Assistant permission amendment (3dpa + ai-om)

**Files:**
- **new** `scripts/printer-intake-outcomes.jsonl` (tracked, PII-safe; one JSON line per processed candidate: `{candidateKey, runId, scoutOutcome, ownerResolution, correctiveSignal}`). Ships empty (with a header comment in a sibling `.md` or a leading schema-marker line).
- **new** `scripts/printer-intake-outcomes.jsonl` ships **truly empty** + a sibling `README` (a marker line inside a `.jsonl` must itself be a valid JSON object the reader skips by a `_schema` key — never a non-JSON comment, which breaks strict JSONL readers incl. the retrospective's gather).
- `ai-operating-model/docs/agents/printer-addition-assistant.md` — **amend the Permission Level + Allowed Actions** to add **append-only write to `scripts/printer-intake-outcomes.jsonl`** (the only new path), **plus** a mission step: after processing each candidate, append the outcome line. **Carve-out:** the ledger append is an **automatic post-processing step, NOT per-candidate-owner-approval-gated** (unlike the contract's other path edits) — state this explicitly so the append doesn't inherit the approval gate. Keep every existing Forbidden Action intact; the Forbidden "edit outside the scoped list" wording is unchanged (it references the list, not a count), so the 5th path composes cleanly.
- **Gate 1 QA:** a `git diff` shows **exactly** the one added path + the mission step + the carve-out, and **no deletion** of any existing Forbidden Action; a sample append line conforms to the documented shape; `request.key`/`requestKeys` confirmed present in the real run-report items so `candidateKey` is sourceable.
- **Commits:** 3dpa `feat(intake): outcomes ledger surface (S4)` + ai-om `docs(assistant): permit append-only outcomes-ledger write + outcome step (S4)`.

### Gate 2 — Diff schema + validator (3dpa)

**Files:**
- **new** `scripts/validate-guardrails-diff.js` (+ a schema): validates a proposed diff — required fields `action`/`target`/`value`/`evidence`/`confidence`/`rationale`; `target` enum = `brandAliases`/`modelSuffixStrip`/`resinKeywords`/`nonFdmTech`/`nonFdmNoteAcronyms` (**not** `brandTokens`/`familyTokens`); **permits an empty `changes:[]`** (no `minItems:1` on the wrapper — empty = success); **chains S3's config validator** (an `add: brandAliases.<k>` whose value isn't a real `brands[].id` is rejected); rejects missing-field / no-evidence / invalid-target.
- **new** `scripts/validate-guardrails-diff.test.js`: malformed rejected; **invalid-action** (not add/modify/retire) rejected; **invalid-confidence** (not stated/observed) rejected; no-evidence rejected; invalid-target (`familyTokens`) rejected; alias→nonexistent-brand rejected (via the S3 chain); **empty wrapper accepted** (only the wrapper `minItems` is dropped — per-entry `evidence` rigor is retained); valid diff accepted. (Tombstone-on-`retire` + reconcile/park are tested in Gate 3 against the apply path.)
- **Gate 2 QA (local):** tests green; `node --check`; depends on S3's `validate-guardrails.js` (an S3-plan **Gate 1** deliverable; the v3 report is S3-plan **Gate 2**) — S4 **chains** the former and **best-effort-reads** the latter.
- **Commit:** 3dpa `feat(intake): guardrails-diff schema + validator (S4)`.

### Gate 3 — Retrospective agent contract + calibration + apply path (ai-om + 3dpa)

**Files:**
- **new** `ai-operating-model/docs/agents/intake-retrospective.md` — role; **inputs (ledger primary, run report best-effort, config for dedupe)**; the gather→extract→cluster→reconcile→compact→emit-diff loop (Curator-faithful); **read-only propose** (never edits the config); the **mechanical/judgment split** (only mechanical auto-applies at Run; all content changes owner-approved); the **watermark** (`scripts/.printer-intake-retrospective.watermark.json`, loud-rebuild on stale); the **>30%-reject / 3-cycle calibration halt**; compact/escalate like lesson-spotter.
- **new** `ai-operating-model/docs/agents/intake-retrospective-calibration.md` (mirror `lesson-spotter-calibration.md`; one row per run).
- **the apply path** — a small `scripts/apply-guardrails-diff.js` (or a documented procedure): on **owner approval**, apply the validated diff to `scripts/printer-intake-guardrails.json` — entries added with `_provenance` **keyed by target** (e.g. `_provenance["brandAliases.sparkx"]`, so a re-add of the same target+value is detectable); the `version` bump + `lastRatified` + watermark advance are **conditional on a non-empty *effective* changeset** (entries whose target+value already match are skipped). **Idempotent:** re-applying the same approved diff leaves the file **byte-identical** (no version bump, no duplicate `_provenance`). The config `version` is a **content-revision counter distinct from the `schema` string** (S3 ships `version:1`; S4 increments it on each *effective* ratification). A `retire` writes a **tombstone**, never a silent delete.
- tests: a **golden-file** gather/cluster/dedup from a fixture ledger → expected candidate diff (the deterministic pre-judgment parts); the apply path is idempotent + version-bumping.
- **Gate 3 QA (local):** validator green; the fixture produces a sane candidate diff; apply is idempotent + bumps version + writes `_provenance` + advances the watermark; `node --check`.
- **Commits:** ai-om `docs(intake): retrospective contract + calibration ledger (S4)` + 3dpa `feat(intake): owner-approved guardrails-diff apply path (S4)`.

---

## 2. Verification gate

- All gate QA runs locally (Node). The **judgment** part (which candidates to propose) is **owner-calibrated, not unit-tested**; the **deterministic + validator** parts are tested (validator rejection matrix, golden-file gather/cluster, idempotent apply).
- **Dry-run is the default** (propose only); **applying requires explicit owner approval.**

---

## 3. Cross-platform impact (mandatory evaluation)

- **Engine / data-profile / overlay / app:** **none.** The retrospective only **proposes** diffs to the intake config (S3, under `scripts/`, not served); **runtime stays deterministic.** Data/logic-change evaluation: **N/A for the app surfaces.**
- **iOS:** **none.** **iOS push gate:** **N/A.**

---

## 4. Risks & fallbacks (from spec §8)

| Risk | Plan handling |
|---|---|
| Run-history substrate | the committed PII-safe ledger is the durable spine; raw run reports best-effort; no-op until S3 v3 + ledger entries |
| Bad learning | ≥2-corroboration + owner approval + S3's referential validator (in the diff-validator chain) |
| Owner fatigue | >30%-reject / 3-cycle calibration halt |
| Dead targets | `brandTokens`/`familyTokens` excluded from the v1 target enum |
| LLM in runtime | structurally impossible — propose-only + owner-ratify + static-config-read |

---

## 5. Ship sequence (when executed — after S3 lands)

1. Gate 1 (ledger + Assistant amendment) → 2 commits (3dpa + ai-om). 2. Gate 2 (diff validator) → 3dpa commit (after S3's `validate-guardrails.js` exists). 3. Gate 3 (contract + calibration + apply) → ai-om + 3dpa commits.
- Cross-repo; **no iOS / overlay / web-functional / TestFlight.**

---

## 6. Done criteria (plan-level)

- [ ] Gate 1: ledger file + Assistant permission amendment with **no contract contradiction**; sample line conforms.
- [ ] Gate 2: diff validator green (rejection matrix incl. empty-diff-accepted, invalid-target-rejected, S3-chain).
- [ ] Gate 3: retrospective contract + calibration + **idempotent, version-bumping** apply path; golden-file gather/cluster.
- [ ] Runtime stays deterministic; no app change.

---

## 7. What this plan deliberately does NOT do

- It does **not** execute (no code until owner go **and** S3 landed).
- It does **not** build the autonomy ladder — that is **S5** (which consumes this calibration record).
- It does **not** put an LLM in the Scout's runtime decision path.
- It does **not** make `brandTokens`/`familyTokens` learnable (deferred until S2 lands + emits outcomes).
