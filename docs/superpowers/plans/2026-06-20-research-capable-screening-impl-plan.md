# Research-capable printer screening: implementation plan

**Date:** 2026-06-20
**Status:** Draft **v2** — **Codex-reviewed (verdict NO-GO → patched, this revision).** Pending owner go. **EXECUTION DEFERRED** (no code until explicit owner command). Review transcript: [`../../codex/research-screening-review/bridge-2026-06-20-202510-529494.md`](../../codex/research-screening-review/bridge-2026-06-20-202510-529494.md); dispositions in §8.
**Spec:** [`../specs/2026-06-20-research-capable-screening-design.md`](../specs/2026-06-20-research-capable-screening-design.md) (v2, hostile-reviewed; owner chose **"more autonomous"** research).
**Topic:** Follow-on to **S2** — capture any *plausible* printer request → research-resolve (brand / existence / FDM / specs) → owner-approved add, incl. brand-new brands. Autonomy: scheduled unattended research + staging (owner decision 2026-06-20).
**Scope:** Worker capture (`functions/api/_lib/printer-mention.js` + `functions/api/feedback.js`), Scout routing + **Scout contract** (`scripts/printer-intake-scout.js` + `ai-operating-model/docs/agents/printer-intake-scout.md`), Assistant contract + ledger (`ai-operating-model/docs/agents/printer-addition-assistant.md`), and — last, heaviest — an autonomous research routine. **No engine / data / overlay / iOS-binary change for the screening.** Real adds follow `docs/runbooks/printer-addition-protocol.md`.
**Ship path:** web auto-deploys from `main`; the Scout is a local/scheduled script; the contracts are parent-repo (ai-om) docs.
**Commit decomposition:** ≥ 5 commits — G1 (web), G2 (script) + G2b (ai-om Scout contract), G3 (ai-om Assistant contract + ledger), + per-add commits in G4; G5 gets its own spec/plan.

> **EXECUTION IS DEFERRED.** This plan describes the gates for when execution is authorized. Develop under a `claude-sync.sh hold`; one finding = one commit.

---

## 0. Preconditions & grounded context

- **Spec v2 is hostile-reviewed.** The v1 BLOCK (false premise that the Scout resolves brands from `brandTokens`/`familyTokens`) is corrected: the Scout resolves via `brandByNorm` (catalog; built at `scripts/printer-intake-scout.js:305`), `brandAliases` (value ∈ `brands[].id`; `resolveBrand` `:350`), `familyToBrand` (catalog-derived; built `:321-322`). **Tier-1 is therefore Worker-only.**
- **Two structurally distinct cases:**
  - **(a) brand present-but-uncatalogued** → the Scout already emits `needs-research` with `isNewBrand:true` (`:571`) and a manufacturer (`:563`) — **no Scout-code edit**;
  - **(b) brand absent** → today terminal `incomplete` "model given but brand could not be inferred" (`:519`) → needs the new routing (Gate 2).
- **`isStrongModelToken` is digit-OR-variant, not digit-only** (`functions/api/_lib/printer-mention.js:84` returns true for a digit-bearing token **or** a `MODEL_VARIANTS` word — `pro`/`max`/`plus`/`mini`/…). Tier-2 therefore does **not** reuse it verbatim: Tier-2 uses a **strict digit-bearing predicate** (`/[0-9]/` on a model token) so bare "Pro"/"Max" can't fire brandless. ("Creator 5 Pro" and "Snapmaker 2" both carry a digit → still caught.)
- **Test tooling reality:** no `package.json`. Lib → `node --test` on a `.test.mjs` (live `functions/api/` pattern). Scout suite is **spawn-based** (`spawnSync('node',[SCRIPT,'--queue',fixture])` → parse stdout JSON), 35+ cases.
- **S2/S3/S4 already landed:** `sourceLane`/`originalCategory` threaded in `classify` (`:468-469`); heuristic grouping in the report (`:919`); S3 guardrails config + diff-validator (`brandTokens`/`familyTokens` are **forbidden diff targets** — Tier-1 expansion is plain Worker-source, not a guardrails diff, so this is unaffected); S4 outcomes ledger (keys/hashes only). The new `intent` field + manufacturer-null `needs-research` must not break these — see Gate 2/Gate 3.
- **Bundling:** single `worker.js` entry imports `functions/api/*`; the `_lib` import bundles identically. `scripts/**` is asset-ignored.
- **iOS push gate / TestFlight: N/A for the screening.** Real adds (G4) touch the iOS bundled mirror **local-only** per the runbook. (mac-mini now has full Xcode → local XCTest available for the mirror.)

---

## 1. Gates

Each gate: **implement → sub-agent hostile review → patch → gate QA (local) → commit.** Advance only on green.

### Gate 1 — Worker capture recall (web commit 1)

**Files:**
- `functions/api/_lib/printer-mention.js`:
  - **Tier-1:** expand `BRAND_TOKENS` with a curated, **verified** set of real FDM brands beyond the catalog (e.g. snapmaker, kingroon, tronxy, two-trees, sunlu, longer, raise3d, ultimaker, weedo). Family-token additions are **enumerated** and each checked against the prose-collision rule (keep "mega" excluded; never add a common English word). One-line source note per new token in a comment.
  - **Tier-2 (new):** when no brand/family token matches, fire **only** on `intentTrigger + strictDigitModelToken` (a NEW `/[0-9]/`-on-a-model-token predicate — **not** `isStrongModelToken`, which also accepts variant words). Capture `{ model, intent:"unresolved-brand", span }` (no brand). Bounded span ≤ 160.
  - **Intent triggers (closed list, expanded per Codex MEDIUM):** add/support/missing/want/"would love"/"please add" **plus** the common "not in catalog" phrasings — "not listed", "isn't listed", "can't find", "cant find", "do you have", "missing from the list". (Anything outside this list → no Tier-2 fire; documented residual.)
  - **Denylist (reject; expanded per Codex MEDIUM) — never a Tier-2 capture even with a digit:** app features (dark mode, export, account, theme); **languages** (czech/german/…); **materials/accessories** (petg/pla/abs/tpu incl. "petg cf", nozzle, ams, filament, spool, hotend, bed, plate); **platforms** (iphone/ipad/apple watch/android/windows/mac/watch); **auth** (2fa/mfa/otp); resin/non-FDM stop-words still excluded from the span.
  - extend the return shape to `{ brand?, model, span, intent? }`.
- `functions/api/feedback.js`: thread `intent` into the teed KV `record` (built near `functions/api/feedback.js:292`); heuristic branch otherwise unchanged (3-category gate, 30-day TTL, fail-open swallow).
- `functions/api/_lib/printer-mention.test.mjs`:
  - **recall:** "Snapmaker 2" → `{brand:snapmaker, model:2}`; "would love the Creator 5 pro" → `{model:"Creator 5 Pro", intent:unresolved-brand}` (no brand); "can't find Kingroon KP3S" → brand path; "Creator 5 Pro isn't listed" → intent path.
  - **precision (must be null):** "would love a Night Mode", "please add Czech support", "add Multi Color printing", "would love PETG CF support", "I service my printer", "Error 500", "love this app", **"please add 2FA support", "please support iPhone 16 Pro", "add Apple Watch SE", "please add 0.6 nozzle support", "add AMS 2 Pro"** (Codex MEDIUM negative classes).
  - **span-tightness:** no resin word enters the span.
  - **tee-threading (Codex MEDIUM):** a mocked-`PRINTER_INTAKE.put` (or `.mjs` integration) assertion that an extraction-positive POST records `intent` in the KV value, and a non-printer POST tees nothing.
**Gate 1 QA (local):** `node --test functions/api/_lib/printer-mention.test.mjs` green; `node --check` on feedback.js + the lib; trace that the heuristic branch is inside the swallow and fires only for general/feature/bug.
**Commit 1:** `feat(web): research-capable capture — brand expansion + brandless intent recall (screening)`

### Gate 2 — Scout brandless routing + Scout contract (script commit 2 + ai-om commit 2b)

**Files:**
- `scripts/printer-intake-scout.js`:
  - thread `entry.intent` into `classify` (`:440`; today only lane/originalCategory at `:468-469`);
  - at the "model given but brand could not be inferred" branch (`:519`): when `entry.intent==='unresolved-brand'` → emit **`needs-research`** with `researchReason:"resolve-brand"`, `resolved:{manufacturer:null, model}` — instead of terminal `incomplete`. ("brand given but no model" `:516` stays `incomplete`.)
  - **ONE shared null-brand key/name helper (Codex HIGH)** used everywhere a manufacturer is assumed:
    - `collapse()` dedupe key (`:578-583`) → `nr:?|${norm(model)}` when manufacturer is null (today keys on manufacturer);
    - the **report** collapse/grouping path (`:891`) — must not emit `null|creator5pro`;
    - the **candidate filename** path (`:900`, via `snake()` `:136`) — `snake(null)` is empty → today yields `candidate--creator_5_pro.json`; the helper must produce a stable, non-empty name (e.g. `candidate-unresolved-brand-creator_5_pro.json`);
    - `suggestId` (`:432`) / `candidateSkeleton` (`:614`): when manufacturer is null, **defer id** (no mint), carry `researchReason` + a risk flag "brand unresolved — research to resolve before add".
  - **numeric-only new-brand id guard (Codex LOW):** for a present-but-uncatalogued brand whose model is numeric-only ("Snapmaker" + "2" → suggested id "2"), add a risk flag and/or prefix the new-brand id so a bare "2" can't become a printer id.
  - report counts (`:885,897`) + heuristic grouping (`:919`) include the manufacturer-null `needs-research` items.
- `scripts/printer-intake-scout.test.js`: fixtures —
  - brand-present-unknown ("Snapmaker"/"2") → `needs-research isNewBrand:true`, manufacturer set, **non-numeric id guard asserted** (**regression** otherwise);
  - brand-less intent ("Creator 5 Pro", `intent:unresolved-brand`) → `needs-research researchReason:resolve-brand`, manufacturer null;
  - two brand-less same-model collapse → single item, key `nr:?|creator5pro`, **stable candidate filename**, correct report grouping, correct `--out` skeleton;
  - form-lane behaviour unchanged.
- **`ai-operating-model/docs/agents/printer-intake-scout.md` (Codex HIGH — the missed contract):** amend so `needs-research` may carry `manufacturer:null` **only** for `intent:"unresolved-brand"` + `researchReason:"resolve-brand"`; the model-only-unresolved-stays-`incomplete` line is narrowed to "no `unresolved-brand` intent"; **keep the no-LLM determinism invariant explicit** (the Scout only labels; it does not resolve the brand).
**Gate 2 QA (local):** `node scripts/printer-intake-scout.test.js` green (existing + new); the existing sample-queue form-lane counts unchanged; `node --check`; grep proof that no manufacturer-null path emits a `null|…` key or an empty-snake filename.
**Commit 2:** `feat(scout): route brandless printer mentions to needs-research(resolve-brand) (screening)`
**Commit 2b (ai-om):** `docs(agents): scout may emit manufacturer-null needs-research for unresolved-brand (screening)`

### Gate 3 — Assistant contract + S4 ledger (ai-om commit 3)

**Files:** `ai-operating-model/docs/agents/printer-addition-assistant.md`:
- add a **Mission step**: accept a `needs-research` skeleton with `manufacturer:null` / `researchReason:"resolve-brand"`; **resolve the brand** via web research + name-convention attempts *before* classify;
- add a **stop condition**: brand unresolvable by any authoritative source → classify `unverified-model`; never guess;
- **S4 ledger compatibility (Codex HIGH):** the outcomes-ledger `ownerResolution` enum (Mission step 10 / Permission section) currently has no value for a brand-resolution outcome. Extend it (e.g. `was-unresolved-brand-resolved`, `unverified-brand`) **or** define an explicit mapping onto existing values, and **update the Intake Retrospective expectations** (`ai-operating-model/docs/agents/intake-retrospective.md` + its calibration) so the new enum/mapping is recognised. Keys/hashes only — PII-safe contract preserved.
- note the input shape + that the id is minted post-resolution; existing gates (new-brand sign-off, per-field confidence blocks, reviewer dispatch, runbook Phases 3–5) unchanged.
**Gate 3 QA:** doc consistent with the Scout's new output shape + the runbook + the retrospective enum; parent `CLAUDE.md`/`AGENTS.md` byte-identical unaffected; no code.
**Commit 3 (ai-om):** `docs(agents): assistant resolves unknown brand + ledger enum for brand-resolution (screening)`

### Gate 4 — First real run (manual; per-candidate owner-gated)

Process the two real misses end-to-end:
- Build a controlled local `--queue` (or guarded live smoke) for Snapmaker 2 + Creator 5 Pro; run the Scout → confirm Snapmaker → `needs-research`(new-brand, guarded id), Creator 5 Pro → `needs-research`(resolve-brand).
- Run the Assistant research: resolve FlashForge for Creator 5 Pro; source **manufacturer** specs for both; new-brand sign-off for Snapmaker.
- Per-candidate **owner approval** → add via the runbook (web `data/printers.json` + walkthrough combo + iOS mirror **local-only** + overlay `content_version` bump + validators) → live-overlay verify.
**Gate 4 QA:** runbook Phase 3 gates green (validate-data, picker-dry-run, walkthrough-harness, profile-matrix-audit, overlay validator); live overlay `content_version` confirmed; local iOS XCTest for the mirror.
**Commits:** per the runbook (one finding = one commit per platform; iOS mirror local-only).

### Gate 5 — Autonomous research routine ("more autonomous") — its own spec/plan

The owner chose autonomous research. This is the **heaviest, most novel** gate and **depends on G1–G3 + a green manual run (G4).** Before any build, resolve in a dedicated short spec/plan iteration:
- **(a) Schedule host** — web research needs network; the standing rule routes scheduled external-API pipelines away from Cowork → Codex scheduled automation, Mac `launchd`, or a Claude Code scheduled Routine. Pick + environment-probe first.
- **(b) S5 reuse** — this is an S5-shaped autonomy rung; reuse S5's guardrail-maturity gating + the S4 outcomes-ledger/calibration signal, not a parallel mechanism.
- **(c) Staging surface** — where the owner reviews the auto-researched batch (staged candidate packets + a summary).
- **(d) Hard safety rule** — **autonomous research + staging only; NEVER autonomous ship.** Per-candidate owner approval before any commit / overlay bump stands; research-sourced specs still pass per-field confidence + reviewer dispatch.
**Gate 5 QA:** defined in its own plan. **Not built in this plan's first pass.**

---

## 2. Verification gate

- **G1 + G2 QA run locally** (Node). **G3** is doc-only.
- **Post-deploy smoke is SPLIT BY GATE (Codex CRITICAL — G1 ships before G2, so routing can't be smoked at G1):**
  - **after G1** (web auto-deploys): a brand-less printer-ish general-feedback POST → a KV entry carrying `lane:"heuristic"` **and `intent`** (capture only — the current Scout still returns `incomplete` for it, which is expected pre-G2); a non-printer POST → not teed.
  - **after G2** (affects the next Scout run): `node scripts/printer-intake-scout.js --source kv` routes that same entry to `needs-research(resolve-brand)` under `heuristicCandidates`, **not** auto-promoted.
- **G4** = the runbook's full Phase 3 verification + the live-overlay `committed-is-not-deployed` check.

---

## 3. Cross-platform impact (mandatory evaluation)

- **Engine / data / overlay:** none for the screening (G1–G3, G5). **Downstream (G4):** each resolved add hits `data/printers.json` + the overlay + the iOS mirror + an overlay `content_version` bump (via the runbook) — so success increases add throughput that reaches iOS users.
- **Web:** capture lib + tee auto-deploy from `main`.
- **iOS:** capture is server-side → catches iOS general-feedback too; binary change only via G4's local mirror (push-gated).
- **Analytics:** unchanged.

---

## 4. Risks & fallbacks (from spec §8 + Codex review)

| Risk | Plan handling |
|---|---|
| Tier-2 noise (features/languages/materials/**platforms/accessories/auth**) | strict-digit predicate + intent trigger + the **expanded** denylist classes + `heuristicCandidates` grouping + research/owner filter; S4 tunes; precision tests for each negative class |
| Deterministic-Scout invariant | preserved — research only in the Assistant (G3) / routine (G5); the Scout only labels; Scout-contract amendment keeps it explicit |
| Brand-less + digit-less FN (+ phrasing outside the closed intent list) | accepted; the web nudge (S2 Gate 3) is the backstop; documented residual |
| Wrong brand resolution by research | manufacturer-source confirmation + per-field confidence + reviewer dispatch + the new `unverified-model` stop |
| Manufacturer-null `needs-research` breaks downstream (collapse key, **report key, candidate filename**, suggestId) | ONE shared null-brand key/name helper + tests across collapse/report/filename/`--out`; Scout contract amended; S4 ledger enum extended |
| Numeric-only new-brand id ("2") | id guard + risk flag + test (Codex LOW) |
| Autonomy scope creep (G5) | G5 is its own spec/plan, gated on G1–G4 + S5 maturity; never autonomous ship |

---

## 5. Ship sequence (when executed)

1. **G1** → push web → **capture-only smoke** (KV has `intent`). 2. **G2** + **G2b** → push script + ai-om → **routing smoke** (`--source kv` → `needs-research(resolve-brand)`). 3. **G3** → push ai-om. 4. **G4** manual real run (per-candidate owner approval, runbook). 5. **G5** only after its own spec/plan + owner go. Develop under a `claude-sync.sh hold`; release after the deliberate commits.

---

## 6. Done criteria (plan-level)

- [ ] G1 capture (brand expansion + strict-digit brand-less intent + expanded intent triggers/denylist) + lib tests (incl. new negative classes + tee-threading) green; committed.
- [ ] G2 Scout brand-less routing via the **shared null-brand helper** (collapse + report + filename + skeleton) + numeric-id guard + tests green; form-lane regression clean; committed. **G2b** Scout contract amended.
- [ ] G3 Assistant contract updated + **S4 ledger enum/mapping** + retrospective expectations; consistent with the Scout output + runbook; committed.
- [ ] G4 Snapmaker 2 + FlashForge Creator 5 Pro researched + owner-approved + added (runbook green, live overlay verified).
- [ ] G5 autonomous routine has its own approved spec/plan before any build.
- [ ] No engine/data/overlay/iOS-binary change outside G4's runbook adds.

---

## 7. What this plan deliberately does NOT do

- It does **not** execute (no code until owner go).
- It does **not** build the autonomous routine in the first pass (G5 = its own spec/plan).
- It does **not** mirror tokens into the Scout config (Tier-1 is Worker-only; the Scout never reads `brandTokens`/`familyTokens`; the S3 diff-validator forbids them as targets — corrected from the v1 spec).
- It does **not** touch the engine, data profiles, or the overlay except via G4's normal runbook adds.

---

## 8. Codex review dispositions (2026-06-20, verdict NO-GO → patched)

Transcript: [`../../codex/research-screening-review/bridge-2026-06-20-202510-529494.md`](../../codex/research-screening-review/bridge-2026-06-20-202510-529494.md).

| # | Sev | Finding | Disposition |
|---|---|---|---|
| 1 | CRITICAL | G1/G2 smoke mis-sequenced (routing smoked before G2) | **Fixed** — §2 smoke split by gate (capture-only after G1; routing after G2). |
| 2 | HIGH | Manufacturer-null surfaces missed (report key `:891`, candidate filename `:900`/`snake(null)` `:136`) | **Fixed** — G2 now mandates ONE shared null-brand key/name helper covering collapse + report + filename + `--out`, with tests. |
| 3 | HIGH | Scout **contract** not updated (still requires manufacturer) | **Fixed** — new G2b amends `printer-intake-scout.md`. |
| 4 | HIGH | S4 ledger enum lacks a brand-resolution value | **Fixed** — G3 extends `ownerResolution` (or maps) + updates the retrospective. |
| 5 | HIGH | "digit-bearing" premise wrong — `isStrongModelToken` accepts variant words too | **Fixed** — §0 + G1 use a strict `/[0-9]/` Tier-2 predicate, not `isStrongModelToken`. |
| 6 | MEDIUM | Tier-2 leaks platform/accessory/auth ("iPhone 16 Pro", "AMS 2 Pro", "2FA") | **Fixed** — G1 denylist expanded + precision tests for each class. |
| 7 | MEDIUM | Tier-2 misses "not listed / can't find / do you have" | **Fixed** — intent-trigger list expanded; residual documented. |
| 8 | MEDIUM | `feedback.js` intent threading lacks an automated test | **Fixed** — G1 adds a mocked-`put`/`.mjs` integration assertion. |
| 9 | LOW | `brandByNorm` citation wrong (`:305`, not `:321`) | **Fixed** — §0 corrected. |
| 10 | LOW | Snapmaker stages with weak id "2" | **Fixed** — G2 numeric-only-id guard + test. |
