# S3 — Scout dedupe/triage robustness + learned-guardrails config (design spec)

**Date:** 2026-06-15
**Status:** Draft v2 — sub-agent reviewed (v1 verdict **PATCH-THEN-PROCEED**: a CRITICAL mis-attribution of the "Sparkx i7 w/CFS" example, a v1-default-vs-seed contradiction, a dead `familyTokens` field, and an unverified public-serving claim). v2 corrects all. Pending re-review → QA gate.
**Topic:** S3 of the feedback-pipeline evolution (S1 · S2 · **S3 Scout robustness + learned-guardrails config** · S4 · S5)
**Scope:** the Scout (`scripts/printer-intake-scout.js`) + a new versioned guardrails config + a validator + a one-line Scout-contract amendment. **No engine, app, data-profile, or overlay change.**
**Ship path:** script + committed config data (the config lives under `scripts/`, which is **asset-ignored** — `.assetsignore:13-14` — so it is **not** publicly served, unlike the overlay). The Scout is local/scheduled. No app version, no TestFlight.

> Absorbs **Scout finding 1** (brand typos + model-variant suffixes defeat dedupe → already-shipped printers surface as `needs-research` false positives). **Creates the versioned config that S4's learning loop proposes diffs into** — the hinge between "defined guardrails" (static) and "learned guardrails" (owner-ratified accretion).

---

## 1. Problem

Two distinct robustness gaps (the 2026-06-14 run hit both, sometimes combined) and one architectural gap.

1. **Finding 1a — brand typos / non-canonical brand strings defeat dedupe.** `resolveBrand` (`scripts/printer-intake-scout.js:274-280`) does **exact normalised match only** (`brandByNorm`, or the hardcoded `BRAND_TOKEN_ALIASES`), then falls through to a **new-brand candidate**. Two real cases:
   - **"Bmbulab" → bambu_lab.** `norm("Bmbulab")`=`bmbulab` matches neither → new-brand candidate → the already-bundled **X2D** (`bambu_lab|x2d`) surfaces as a `needs-research` **false positive**.
   - **"Sparkx" → creality.** The real printer is `sparkx_i7` (name **"i7"**, manufacturer **creality**); **there is no `sparkx` brand** in `data/printers.json`. So `resolveBrand("Sparkx")`=`{id:'sparkx', known:false}`, and the cross-brand rescue (`:400`) is **gated on `brandKnown`** — which `sparkx` fails — so even an exact model match is skipped → `needs-research` false positive.
   Both need a **brand alias** (`bmbulab→bambu_lab`, `sparkx→creality`), not suffix work.
2. **Finding 1b — model-variant/accessory suffixes defeat dedupe.** `norm("i7 w/CFS")`=`i7wcfs` ≠ `i7`, so a bundled printer with an accessory/bundle suffix looks novel **even when the brand is known/inferable**. Pure example: **"Creality i7 w/CFS"** → `resolveBrand("Creality")`=creality known → model `"i7 w/CFS"` → `norm`→`i7wcfs` → dedupe `creality|i7wcfs` **misses** the bundled `creality|i7` → false `needs-research`.
   - *Note:* the 2026-06-14 **"Sparkx i7 w/CFS"** entry actually combined **both** gaps — it needed the `sparkx→creality` alias (1a) **and** the `w/CFS` strip (1b) to dedupe. That is why it survived to `needs-research` (the Assistant's catalog cross-check caught it downstream — the safety net held, but it should never have reached the assisted pass).
3. **Architectural gap — guardrails are hardcoded, not learnable.** The brand aliases (`:229-235`), resin keywords (`:190-194`), and non-FDM patterns (`:195-202`) are baked into the script. The owner — or **S4's learning loop** — cannot ratify a new alias/suffix/keyword without editing and code-reviewing the **executable script**. A learning loop needs a **data surface** to learn into.

## 2. Root cause

Matching is exact-after-`norm` with no alias/suffix layer, and the heuristic data lives **in code** — so improving triage means editing logic, not ratifying data.

## 3. Scope

**In:** (a) brand-alias resolution + model-suffix-strip in the Scout's resolve/dedupe path; (b) externalise the heuristic data into a **versioned, owner-ratified `scripts/printer-intake-guardrails.json`** the Scout reads at runtime (runtime stays deterministic); (c) a **schema + validator** (config safety + the precondition for S4 to propose diffs into it); (d) a one-line amendment to the Scout contract's Output Format for the new typo hint.

**Out:** the learning loop that *proposes* diffs (**S4**); the autonomy ladder (**S5**); any change to the FDM-scope *policy*; any engine/app/overlay change. **Forward-compat only (not S3 work):** wiring S2's not-yet-built Worker extractor to consume `brandTokens` — S3 only **defines** those tokens in the config (see §4.5).

## 4. Design

### 4.1 The learned-guardrails config (the architectural core)

A new committed file **`scripts/printer-intake-guardrails.json`** — under `scripts/`, which is **asset-ignored (`.assetsignore:13-14`)**, so it is **not served publicly** (the Scout reads it via `fs`; S2 — when it lands — imports it at bundle time, inlining the value, so neither consumer needs it served). This is a deliberate contrast with `catalog/ios-printer-overlay-v1.json`, which **is** intentionally public.

Schema `printer-intake-guardrails@1`:
```json
{
  "schema": "printer-intake-guardrails@1",
  "version": 1,
  "lastRatified": "2026-06-15",
  "brandAliases":   { "bambu": "bambu_lab", "bambulab": "bambu_lab", "prusaresearch": "prusa", "ankermake": "anker" },
  "brandTokens":    ["bambu", "bambulab", "creality", "prusa", "anycubic", "elegoo", "sovol", "qidi", "flashforge", "artillery", "anker", "ankermake", "voron", "voxelab"],
  "familyTokens":   ["ender", "kobra", "neptune", "mk", "sv", "x1", "p1", "a1", "mega"],
  "modelSuffixStrip": ["w/cfs", "with cfs", "+cfs", "(cfs)", "combo", "bundle", "w/ams", "w/ ams"],
  "resinKeywords":  ["photon", "saturn", "mars", "halot", "sonic", "phrozen", "formlabs", "..."],
  "nonFdmTech":     ["resin", "msla", "sla", "dlp", "sls", "mjf", "lcd printer"],
  "nonFdmNoteAcronyms": ["sls", "mjf", "msla", "dlp"],
  "_provenance": {}
}
```

- **The v1 default content is EXACTLY today's hardcoded values — no new aliases.** `brandAliases` ships as the current `BRAND_TOKEN_ALIASES` contents (**all 14 entries** — the JSON above is **abbreviated**; **copy the alias object verbatim from `scripts/printer-intake-scout.js:229-235` and assert `Object.keys(brandAliases).length === 14`** — don't transcribe against a count, or you drop one and silently fail the byte-identical gate); `resinKeywords`/`nonFdmTech`/`nonFdmNoteAcronyms` as the current module consts verbatim. This is what makes the externalisation commit **behaviour-preserving** (a fixture proves byte-identical outcomes — see §6). The Finding-1a typo seeds (`bmbulab→bambu_lab`, `sparkx→creality`) are **behaviour-changing** and are added in the *separate* alias-fix commit (§4.3), not in the externalisation. (This resolves the v1 review's CRITICAL contradiction.)
- **Runtime stays deterministic.** The config is static data the Scout reads; **no LLM at decision time.** "Learned" = owner-ratified accretion *between* runs (S4), never runtime reasoning.
- **Load point + threading (the externalisation is a real refactor, named precisely):**
  - `loadGuardrails(path)` is called in **`main()` before `loadCatalog()`** (`:716`), with a `--guardrails <path>` flag (default `scripts/printer-intake-guardrails.json`).
  - `loadCatalog(guardrails)` folds `guardrails.brandAliases` into the brand-resolution layer (replacing the inline `BRAND_TOKEN_ALIASES` at `:229`), so `resolveBrand(brandRaw, cat)` keeps its signature (reads `cat`).
  - `fdmDecline` **gains a parameter** — `fdmDecline(brand, model, notes, guardrails)` — reading `resinKeywords`/`nonFdmTech`/`nonFdmNoteAcronyms` from the config; it is threaded from `classify(entry, cat, guardrails)`.
  - `stripModelSuffixes(model, guardrails)` is likewise called inside `classify` (§4.4).
- **`familyTokens` is S2-consumed-only — the Scout does NOT read it.** The Scout derives families from the catalog at runtime (`familyToBrand`, computed `:238-246`). `familyTokens` exists in the config solely so S2's extractor has a single source of truth, with **S2's own `\b`-anchored matching semantics** (the Scout's `leadingToken` splits differently — e.g. "X1 Carbon"→`x`, not `x1`). The validator therefore treats `familyTokens` as a flat string array (no-dup/normalised check), **not** a `→brand` mapping (resolving the v1 review's type-incoherence).
- **Fallback (never break on a bad config):** missing/invalid file → bundled-default constant (= the v1 values) **+ an emitted run-error** (degradation is visible, never silent).
- **`_provenance`** records who/when/why each *non-default* entry was added — the audit trail S4 writes and the owner reviews. Ships empty at v1.

### 4.2 Validator

New `scripts/validate-guardrails.js`:
- **schema-check** (required keys/types; `version` is an int; `schema` matches);
- **referential check (one-directional, not circular):** every `brandAliases` **value** ∈ `data/printers.json` `brands[].id` (an alias can't point to a non-existent/renamed brand). The Scout reads the config at runtime; the validator checks it at gate-time — different processes, no runtime cycle.
- **flat-array checks** on `brandTokens`/`familyTokens`/`modelSuffixStrip`/resin/non-FDM: no dups, normalised.
Mirrors the overlay-validator + Curator-diff-validator pattern. Wired into the profile/data-change gate **when the config changes**, and run by S4 **before any proposed diff is applied**.

### 4.3 Brand-alias resolution (Finding 1a)

- `resolveBrand` consults **`cat.brandAliases[norm(brandRaw)]`** *after* the exact `brandByNorm` match and *before* the new-brand fallthrough (`:277-279`). Deterministic, config-driven.
- This commit **adds the typo seeds** `bmbulab→bambu_lab` and `sparkx→creality` (with `_provenance` lines) — so "Bmbulab X2D" → `bambu_lab|x2d` → **`duplicate`**, and "Sparkx i7" → `creality|i7` → **`duplicate`** (the cross-brand `brandKnown` gate now passes because the alias resolved to a known brand). These are behaviour-changing; the §6 fixtures update the expected counts accordingly.
- **Conservative fuzzy as a flagged hint, never auto-resolve.** When a brand is still unknown, compute **edit-distance ≤1** against known brand norms; emit `possibleBrandTypo: { got, didYouMean }` on the report item **only when there is a *single* unique edit-distance-1 match** (≥2 candidates → suppress, to stay deterministic and unambiguous). It does **not** auto-resolve — a genuine new brand must never be silently mis-mapped. The owner/Assistant + S4 decide whether to promote a hint into `brandAliases`.

### 4.4 Model-suffix-strip (Finding 1b)

- `stripModelSuffixes(model, guardrails)` computes a **dedupe-only** stripped model used for the `norm()` lookups in `classify` — the model-only global match (`:357`), the within-brand dedupe (`:380`), and the cross-brand match (`:400`). The **original `model` string is preserved** for any emitted candidate (a genuinely-new variant is never silently renamed).
- **Stripping is trailing-anchored at a token boundary** (strip a config suffix only when it appears at the **end** of the trimmed model, preceded by whitespace/`/`/`+`/`(`), **never** `indexOf`-style mid-string — so "Creality i7 w/CFS"→"i7" but a hypothetical "Ender Combo-3" is **not** truncated mid-name.
- **Only config-listed suffixes** are stripped — never a generic "drop the last token" (which would merge "Ender 3" and "Ender 3 V3").

### 4.5 Shared with S2 (forward-compatibility note — not S3 implementation work)

S2's Worker extractor does **not exist yet** (it is specced in S2, unbuilt). When S2 lands, its `functions/api/_lib/printer-mention.js` will consume `brandTokens`/`familyTokens` from this config — imported into the single `worker.js` entrypoint and **esbuild-bundled by Wrangler** (`wrangler.toml main = "worker.js"`; *not* a Pages-Functions auto-bundle — the v1 review corrected that rationale). Until then, **S2 ships its own minimal self-contained token list** (per S2 §8 risk 4). **S3 only *defines* the tokens in the config; it does not wire S2.** The single-source-of-truth reconciliation happens when S2 is refactored to import this file — that refactor is S2-follow-up, gated on S2 landing, and is therefore **not** an S3 success criterion.

## 5. Affected sites

| Surface | File | Change |
|---|---|---|
| Config | **new** `scripts/printer-intake-guardrails.json` | schema + v1 default content (= today's hardcoded values, **no** new seeds) |
| Validator | **new** `scripts/validate-guardrails.js` | schema + alias-value referential + flat-array checks |
| Scout — load | `scripts/printer-intake-scout.js` | `loadGuardrails()` (fallback + run-error); `--guardrails` flag in `parseArgs()` (`:60-99`) + `usage()` (`:107-124`); call in `main()` before `loadCatalog()` (`:716`) |
| Scout — resolve | same | `loadCatalog(guardrails)` folds `brandAliases` (replaces inline `:229`); `resolveBrand` alias layer (`:277-279`); the two typo seeds (1a) |
| Scout — dedupe | same | `stripModelSuffixes()` applied to dedupe lookups (`:357`,`:380`,`:400`); original model preserved |
| Scout — fdm | same | `fdmDecline(…, guardrails)` reads resin/non-FDM from config (`:203-216`); threaded via `classify(entry, cat, guardrails)` |
| Scout — report | same | **(commit 1)** guardrails-load run-error only (no shape change on a *valid* config, so the byte-identical gate holds); **(commit 2, with the alias work)** `possibleBrandTypo` field on `report.items[]` + **bump `report.version` 2 → 3** (`:749`) so consumers/tests see the schema change |
| Contract | `ai-operating-model/docs/agents/printer-intake-scout.md` | one line in Output Format documenting the `possibleBrandTypo` hint (keeps the contract describing the artifact) |
| Scout test | `scripts/printer-intake-scout.test.js` | spawn fixtures (see §6) |
| Validator test | **new** `scripts/validate-guardrails.test.js` | malformed rejected; alias→nonexistent-brand rejected; valid v1 passes |
| Runbook | `docs/runbooks/profile-data-change-test-protocol.md` | add `validate-guardrails` to the gate when the config changes |

## 6. Testing strategy

Spawn-based, matching the existing suite (**no `package.json`**; `node scripts/…test.js`; fixture queue via `--queue`; the suite is 28 cases / 91 assertions):

- **Externalisation behaviour-preservation (commit 1):** run the existing `printer-intake-sample.json` / `-adversarial.json` / `-robustness.json` fixtures with the **v1 default config (no new seeds)** → assert **byte-identical outcome counts** vs. the pre-refactor hardcoded path. This is a hard gate: the externalisation must change nothing.
- **Finding 1a (commit 2, behaviour-changing):** "Bmbulab X2D" → `duplicate`; "Sparkx i7" → `duplicate` (alias→creality, cross-brand gate now passes); an unknown near-miss brand → stays a new-brand candidate **and** emits `possibleBrandTypo` (single unique match) / **suppresses** the hint when two brands tie at edit-distance 1. Expected counts updated.
- **Finding 1b (commit 3, behaviour-changing):** "Creality i7 w/CFS" → `duplicate` (pure suffix, brand known); a model that merely *contains* a suffix word mid-name is **not** truncated (trailing-anchor proof); "Ender 3" vs "Ender 3 V3" stay distinct.
- **Fallback:** `--guardrails /nonexistent` → Scout still runs on bundled defaults + a run-error is present.
- **Validator tests:** malformed rejected; `brandAliases` value not in `brands[].id` rejected; valid v1 passes.
- **QA gate:** all green; `validate-guardrails` passes on v1; `node --check` clean.

## 7. Cross-platform impact (mandatory evaluation)

- **Engine / data-profile / overlay:** **none.** The guardrails config is **intake-pipeline data** — it never reaches `engine.js`, `resolveProfile`, the app UI, or the iOS overlay. The mandatory **data/logic-change evaluation** is explicitly **N/A for the web + iOS app surfaces**: triage robustness only, zero effect on profile output, UI, or delivery.
- **Web:** the config lives under `scripts/` (asset-ignored, not served). Only when S2 later imports the shared tokens does any byte reach the Worker bundle (data-only). No engine/app/UI change from S3.
- **iOS:** **none.** **iOS push gate:** **N/A.**

## 8. Risks / open questions

1. **Fuzzy false-mapping** → flag-not-resolve + single-unique-match tie-break (§4.3).
2. **Suffix over-strip** → trailing-anchored, token-boundary, config-list-only (§4.4).
3. **Config drift from `printers.json`** → the validator's one-directional referential check (alias value ∈ `brands[].id`) catches it in the gate.
4. **Behaviour-preservation is load-bearing** → the byte-identical-outcomes fixture is a hard gate; the seeds are deliberately split into a later commit so commit 1 stays a pure refactor.
5. **Config exposure** → resolved by location: `scripts/` is asset-ignored (`.assetsignore:13-14`, verified), so the config is **not** publicly served. It carries only curated token data + `_provenance` (no PII/secrets).
6. **S2 token reconciliation** → forward-compat only (§4.5); not an S3 deliverable, gated on S2 landing.

## 9. Relationship to the rest of the pipeline

S3 makes the Scout robust to the messier inputs **S2** introduces **and** creates the **config surface S4's learning loop proposes diffs into**. S3's config is the "defined guardrails (static contract)"; **S4** turns it into "learned guardrails (owner-ratified accretion)" via the Curator-style schema-validated propose-and-approve diff. **S5's** autonomy ladder is gated on this config's **maturity** (ratified entries + low owner-reject rate = more earned autonomy). S3 is independent of S1; most valuable after S2.

## 10. Success criteria

- **Finding 1a:** "Bmbulab X2D" → **`duplicate`**; "Sparkx i7" → **`duplicate`** (alias→creality); the combined "Sparkx i7 w/CFS" → **`duplicate`** (alias **and** suffix-strip).
- **Finding 1b:** "Creality i7 w/CFS" → **`duplicate`** (pure suffix); no mid-name truncation; "Ender 3"/"Ender 3 V3" stay distinct.
- The heuristic data lives in a **versioned, validated `scripts/printer-intake-guardrails.json`** the Scout reads at runtime; **runtime stays deterministic**.
- **Externalisation is behaviour-preserving** (v1 default reproduces today's outcomes — hard-gated fixture); the seeds are a separate, count-changing commit.
- A likely brand typo is **surfaced** (`possibleBrandTypo`, single-unique-match) without being **auto-mapped**.
- A malformed config **can't ship** (validator) and **can't break the Scout** (fallback + run-error).
- The config is **not** publicly served (under `scripts/`).
- No engine/data-profile/overlay/app change.
- **Commit decomposition:** (1) config (today's values only) + validator + **behaviour-preserving** externalisation; (2) brand-alias resolution + the `bmbulab`/`sparkx` seeds + `possibleBrandTypo` (Finding 1a); (3) model-suffix-strip (Finding 1b); (4) the contract Output-Format line. One finding = one commit.
  *(S4's single-source-of-truth wiring of S2's tokens is explicitly out of S3.)*
