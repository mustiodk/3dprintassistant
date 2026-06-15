# S3 — Scout robustness + learned-guardrails config: implementation plan

**Date:** 2026-06-15
**Status:** Draft — pending sub-agent review → patch → QA gate
**Spec:** [`../specs/2026-06-15-s3-scout-robustness-guardrails-config-design.md`](../specs/2026-06-15-s3-scout-robustness-guardrails-config-design.md) (QA-green v2 — CRITICAL resolved: `sparkx→creality` alias; config under `scripts/`, not served)
**Topic:** S3 of the feedback-pipeline evolution
**Scope:** the Scout (`scripts/printer-intake-scout.js`) + a new versioned config + a validator + a one-line Scout-contract amendment (parent repo). **No engine, app, data-profile, or overlay change.**
**Ship path:** script + committed config data (under `scripts/`, asset-ignored — not served). The Scout is local/scheduled.
**Commit decomposition:** **3 commits in `3dprintassistant` + 1 doc commit in `ai-operating-model`** (one finding = one commit).

> **EXECUTION IS DEFERRED.** No code is written until an explicit owner command. This plan describes the gates for when execution is authorized. All gate QA runs **locally** (Node) — unlike S1.

---

## 0. Preconditions & grounded context

- **Spec QA-green (v2).** The CRITICAL ("Sparkx i7 w/CFS") is re-rooted: 1a = brand-alias (`sparkx→creality`, `bmbulab→bambu_lab`), 1b = pure model-suffix (`Creality i7 w/CFS`); the combined case needs both.
- **The externalisation is a real refactor with named signatures** (spec §4.1): `loadGuardrails()` in `main()` **before** `loadCatalog()` (`:716`); `loadCatalog(guardrails)` folds `brandAliases` (replaces inline `:229`); `fdmDecline(brand, model, notes, guardrails)` (current 3-arg `:203` gains a param); threaded via `classify(entry, cat, guardrails)` (current `(entry, cat)` `:306`).
- **The byte-identical-outcomes fixture is the load-bearing proof** that commit 1 is a pure refactor — it is a hard gate.
- **Test reality:** spawn-based Scout suite (`node scripts/printer-intake-scout.test.js`, custom `check()` harness, TC1–28); the new validator is tested the same way; **no `package.json`**.
- **Config under `scripts/`** is asset-ignored (`.assetsignore:13-14`, verified) → **not** publicly served (unlike the overlay).

---

## 1. Gates

Each gate: **implement → sub-agent review → patch → gate QA (local Node) → commit.** Advance only on green.

### Gate 1 — Config + validator + behaviour-preserving externalisation (3dpa commit 1)

**Files:**
- **new** `scripts/printer-intake-guardrails.json` — schema `printer-intake-guardrails@1`, `version:1`, content = **EXACTLY today's hardcoded values**: all **14** `BRAND_TOKEN_ALIASES` entries (**copy the object verbatim from `:229-235`; the **test** (`validate-guardrails.test.js` TC6) asserts the 14-key set, NOT the validator — which stays count-agnostic by design so Gate 2's +2 seeds + S4 accretion need no validator edit** — do not transcribe against a count), the full `resinKeywords`/`nonFdmTech`/`nonFdmNoteAcronyms` lists, the `brandTokens`/`familyTokens`/`modelSuffixStrip` lists, `_provenance:{}`. **No new alias seeds** (those are Gate 2).
- **new** `scripts/validate-guardrails.js` — schema-check; **referential** check (every `brandAliases` value ∈ `data/printers.json` `brands[].id`); flat-array dup/normalise checks on the token/suffix/keyword arrays (`familyTokens` is a flat array, **not** a →brand map).
- `scripts/printer-intake-scout.js`:
  - `loadGuardrails(path)` — reads the config; on missing/invalid → **bundled-default constant (= the v1 values) + an emitted run-error** (visible, never silent);
  - `--guardrails <path>` flag in `parseArgs()` (`:60-99`) + `usage()` (`:107-124`), default `scripts/printer-intake-guardrails.json` (distinct from the existing `--config` KV flag `:87`);
  - call `loadGuardrails()` in `main()` **before** `loadCatalog()` (`:716`); `loadCatalog(guardrails)` folds `brandAliases` (replaces inline `:229`);
  - `fdmDecline(brand, model, notes, guardrails)` reads resin/non-FDM from config (`:203-216`); threaded via `classify(entry, cat, guardrails)` (`:306`, `:717`);
  - **no report-shape change on a valid config** (the load run-error only appears on a *bad* config, so the byte-identical gate holds).
- **new** `scripts/validate-guardrails.test.js` — malformed rejected; `brandAliases` value not in `brands[].id` rejected; valid v1 passes.
- **Gate 1 QA (hard gate, local) — defined mechanism (you can't A/B pre/post-refactor in one process):** the **existing 28-case suite stays green with ZERO assertion edits** (the hardcoded expected counts in TC2/TC16/TC25-28 are the count-preservation proof); **stronger byte proof (do this too):** capture `run-report.json` for the three fixtures on `HEAD~1`, then `diff` against the post-refactor reports — identical. `node scripts/validate-guardrails.js` passes on v1; `node --check` clean.
- **Commit 1:** `refactor(scout): externalise guardrails to versioned config, behaviour-preserving (S3)`.

### Gate 2 — Brand-alias resolution + typo hint + report-version (3dpa commit 2 + ai-om doc commit)

**Files:**
- `scripts/printer-intake-scout.js`:
  - `resolveBrand` alias layer: consult `cat.brandAliases[norm(brandRaw)]` **after** the exact `brandByNorm` match, **before** the new-brand fallthrough (`:277-279`);
  - `possibleBrandTypo` — edit-distance ≤1 vs known brand norms, emit `{got, didYouMean}` on the report `items[]` **only on a single unique match** (suppress on ≥2 ties); **flag-not-resolve**;
  - **bump `report.version` 2 → 3** (`:749`) — the report-shape change rides **here** (with `possibleBrandTypo`), keeping commit 1 report-neutral.
- `scripts/printer-intake-guardrails.json`: **add seeds** `"bmbulab":"bambu_lab"` + `"sparkx":"creality"` with `_provenance` (behaviour-changing).
- `scripts/printer-intake-scout.test.js`: "Bmbulab X2D" → `duplicate`; "Sparkx i7" → `duplicate` (alias→creality known → **within-brand** dedupe `creality|i7` matches `sparkx_i7`, branch (e) `:380` — *not* the cross-brand path); an unknown near-miss brand → new-brand candidate **+** `possibleBrandTypo` (single match) / **suppressed** on a tie. Expected counts updated for the seeds. *(The typo-hint fixtures are **synthetic-by-necessity** — no real brand pair ties at ed1; use e.g. "Crealty"→creality for the single-match case + two fabricated ed1 brands for tie-suppression.)*
- **ai-om doc commit:** `ai-operating-model/docs/agents/printer-intake-scout.md` — one line in the Output Format documenting the `possibleBrandTypo` hint (the contract describes the report in prose and does **not** pin `report.version`, so only the new item-field needs documenting — the 2→3 bump needs no contract edit).
- **Gate 2 QA (local):** tests green; counts reflect the seeds; `validate-guardrails` still passes (the new aliases point to real brands); `node --check`.
- **Commit 2 (3dpa):** `feat(scout): brand-alias resolution + typo hint (Finding 1a) (S3)`. **+ commit (ai-om):** `docs(scout-contract): document possibleBrandTypo hint`.

### Gate 3 — Model-suffix-strip (3dpa commit 3)

**Files:**
- `scripts/printer-intake-scout.js`: `stripModelSuffixes(model, guardrails)` — **trailing-anchored at a token boundary** (strip a config suffix only at the end, preceded by whitespace/`/`/`+`/`(`; **never `indexOf`** mid-string), config-list-only; apply the **stripped** model to the **brand-known dedupe lookups (`:380` within-brand, `:400` cross-brand)** while **preserving the original `model`**. **Exclude `:357`** (the model-only, brand-*absent* path): stripping there changes *brand inference* (not just dedupe) and re-keys the `:361` multi-match guard — a behaviour change out of scope for this commit; defer model-only-with-suffix to its own bullet + fixture if wanted.
- `scripts/printer-intake-scout.test.js`: "Creality i7 w/CFS" → `duplicate` (pure suffix, brand known); a model merely *containing* a suffix word mid-name is **not** truncated; "Ender 3" vs "Ender 3 V3" stay distinct.
- **Gate 3 QA (local):** tests green; `node --check`.
- **Commit 3:** `feat(scout): model-suffix-strip for dedupe (Finding 1b) (S3)`.

### Runbook (its OWN trailing doc commit — do NOT mix into commit 1's pure refactor)
- `docs/runbooks/profile-data-change-test-protocol.md`: add `validate-guardrails` to the gate **when the config changes**. Keep it out of commit 1 so the byte-identical-refactor commit stays pure (own tiny doc commit, or fold into Gate 2).

---

## 2. Verification gate

- **All gate QA runs locally** (Node). The **byte-identical outcome-counts** fixture (Gate 1) is the load-bearing proof that the externalisation is a pure refactor.
- The two seed aliases (Gate 2) and the suffix-strip (Gate 3) are **behaviour-changing** — their fixtures assert the new `duplicate` outcomes and updated counts.

---

## 3. Cross-platform impact (mandatory evaluation)

- **Engine / data-profile / overlay / app:** **none.** The config is intake-pipeline data under `scripts/` (not served); it never reaches `engine.js`, `resolveProfile`, the UI, or the overlay. The mandatory data/logic-change evaluation is **N/A for the web + iOS app surfaces** — recorded per the standing rule.
- **iOS:** **none.** **iOS push gate:** **N/A.**

---

## 4. Risks & fallbacks (from spec §8)

| Risk | Plan handling |
|---|---|
| Behaviour-preservation is load-bearing | the byte-identical outcome-counts fixture is a **hard gate** (Gate 1); seeds quarantined into Gate 2 |
| Fuzzy false-map | flag-not-resolve + single-unique-match tie-break |
| Suffix over-strip | trailing-anchored, token-boundary, config-list-only |
| Config drift from `printers.json` | the validator's referential check (alias value ∈ `brands[].id`) |
| Config exposure | under `scripts/` (asset-ignored, verified) — not served |

---

## 5. Ship sequence (when executed)

1. Gate 1 → commit (3dpa). Gate 2 → commit (3dpa) + the ai-om contract doc commit. Gate 3 → commit (3dpa).
2. Web push is allowed (the change is a script + config — **no Worker functional change, no deploy impact**; the Scout is local/scheduled). The ai-om contract line is a parent-repo doc commit. **No iOS / overlay / TestFlight.**

---

## 6. Done criteria (plan-level)

- [ ] Gate 1: config (today's values) + validator green; **byte-identical outcome counts** proven; committed.
- [ ] Gate 2: brand-alias + seeds + `possibleBrandTypo` green; counts updated; report.version → 3; ai-om contract line committed.
- [ ] Gate 3: suffix-strip green; no mid-name truncation; committed.
- [ ] No engine/data-profile/overlay/app change.

---

## 7. What this plan deliberately does NOT do

- It does **not** execute (no code until owner go).
- It does **not** add the learning loop — that is **S4** (which proposes diffs into this config).
- It does **not** wire S2's not-yet-built Worker extractor to import the shared tokens — that is **S2 follow-up**, gated on S2 landing (the config only *defines* the tokens).
