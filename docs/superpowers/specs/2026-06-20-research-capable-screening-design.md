# Research-capable printer screening (design spec)

**Date:** 2026-06-20
**Status:** Draft **v2** — hostile sub-agent reviewed. **v1 verdict: BLOCK** — it rested on a false premise (that the Scout resolves brands from the guardrails `brandTokens`/`familyTokens` — it does **not**) and hand-waved the manufacturer-null `needs-research` path as a relabel when it is real classifier logic. **v2 corrects both:** Tier-1 is **Worker-only** (the Scout already handles a *present-but-uncatalogued* brand), and the brand-less path is specified as concrete new Scout + Assistant logic. **Owner decision (2026-06-20): the research step is autonomous/scheduled** (§4.3 + §8 risk 4). Implementation plan written + **Codex-reviewed (NO-GO → patched)**; spec aligned with the plan's patches (strict-digit Tier-2 predicate + expanded denylist). Not yet locked for build — owner go pending.
**Topic:** Follow-on to **S2** (intake capture completeness). Turns the missing-printer screening from "recognise only brands we hardcoded" into "capture any *plausible* printer request → research-resolve it (brand, existence, FDM, specs) → surface an actionable add candidate, including brand-new brands." Absorbs the deferred **S2 Gate 3** (web nudge) as a named recall backstop and the **Scout findings 1 & 2** residuals.
**Scope:** Worker capture (`functions/api/_lib/printer-mention.js` + `functions/api/feedback.js`), Scout routing (`scripts/printer-intake-scout.js`), and the **Printer Addition Assistant** research step (`ai-operating-model/docs/agents/printer-addition-assistant.md`). **No engine / data / overlay / iOS-binary change for the screening itself.** Actual adds follow `docs/runbooks/printer-addition-protocol.md`.
**Ship path:** Web — capture lib + tee auto-deploy from `main`; the Scout is a local/scheduled Node script.

**Motivating real misses (2026-06-20, both via iOS *general feedback*):**
- **"Snapmaker 2"** — a brand we don't carry → dropped (no brand token). Confirmed real FDM (3-in-1 modular; A150/A250/A350; 0.4 mm, nozzle 275 °C, bed 110/100/80 °C).
- **"Would love if you also had the Creator 5 pro"** — a real **FlashForge** model, but the brand wasn't written → dropped (no token, brand not inferable). Confirmed real FDM (4-toolhead enclosed multicolour).

**Ground truth corrected from v1 — how the Scout actually resolves a brand:** `printer-intake-scout.js` resolves via `brandByNorm` (built from `data/printers.json` brands), `brandAliases` (config; each value MUST be a real `brands[].id`, validator-enforced), and `familyToBrand` (catalog-derived). It does **not** read the config's `brandTokens`/`familyTokens` at decision time, and `validate-guardrails-diff.js` explicitly **forbids** those two keys as diff targets. So "mirror brand tokens into the Scout config" is a **no-op** and is dropped. But the Scout *does* already handle a brand that is **present in the structured input yet not in the catalog**: `resolveBrand` → `known:false` → the new-brand path emits `needs-research` with `isNewBrand:true` and `manufacturer = snake(brandRaw)`. The fix therefore splits cleanly by **whether the brand string is present**.

---

## 1. Problem

The capture detector fires only on a fixed **~14 brand / 8 family** token list (`printer-mention.js`), producing **two structurally different misses**:

1. **Brand recognisable-but-uncatalogued (Snapmaker):** a pure *capture* miss. If the Worker recognised "Snapmaker" as a brand token, the Scout's existing new-brand path already yields an actionable `needs-research`. **Worker-only fix.**
2. **Brand absent from the text (Creator 5 Pro → FlashForge):** a *resolution* miss. Even if captured, the Scout can't infer the manufacturer, so it lands on terminal `incomplete`. **Needs new Scout routing + Assistant brand-resolution.**

And underlying both: the **research step never runs**. The capability to resolve/confirm/source exists in the **Printer Addition Assistant** (allowed to web-research and to add brand-new brands with owner sign-off), but it is manual + owner-gated and was never run, so captured-but-unresolved candidates dead-end.

## 2. Root cause

Screening is gated on *"did the text contain a token we hardcoded,"* not *"is this plausibly a printer request."* And brand resolution is **structured-input-only**: a model named without its brand has no deterministic resolution path and dead-ends at `incomplete`. The detector already covers all 13 catalog brands, so expanding the list is whack-a-mole — the gap is FDM brands we *don't* carry, which is exactly what intake exists to surface.

## 3. Goal

A request that is *plausibly a printer* — even for a brand we've never heard of, even with no brand named — is **captured**, **researched** (brand resolved, existence + FDM confirmed, specs sourced), and surfaced as an actionable add candidate (including new-brand), with the owner approving the final add. **Precision is preserved by making the research step + owner approval the filter, not the capture gate.**

## 4. Design (three parts)

### 4.1 Generous capture — Worker, deterministic

- **Tier 1 — brand/family token (Worker-only expansion).** Expand the **Worker** `BRAND_TOKENS` to cover common real FDM brands beyond the catalog (curated, **verified** build-time list — e.g. Snapmaker, Kingroon, Tronxy, Two Trees, Sunlu, Longer, Raise3D, Ultimaker, Weedo). Family-token additions are **enumerated explicitly** and each checked against the prose-collision rule (the lib deliberately drops "mega" as an intensifier; do not re-add common words). When a brand token is present, the Worker tees `{ brand, model }`. **No Scout config change, no token mirror** — the Scout's existing new-brand path handles it. **Solves "Snapmaker 2" end-to-end with zero Scout edits.**
- **Tier 2 — intent-pattern, brand-less (new).** When no brand/family token matches, fire **only** on `intent trigger + strict digit-bearing model token`. The model predicate is a **strict `/[0-9]/` check on a model token — NOT `isStrongModelToken`**, which also accepts variant words (`pro`/`max`/`plus`…) and would let a bare "Pro"/"Max" fire. **Intent triggers (closed list):** add / support / missing / want / "would love" / "please add" **plus** the common not-in-catalog phrasings — "not listed", "isn't listed", "can't find", "do you have". Capture `{ model, brand: unknown, intent: "unresolved-brand" }`, `lane:"heuristic"`, bounded span. **Precision denylist (reject even with a digit):** app features ("dark mode", "export", "account"), **languages** ("Czech", "German"), **materials/accessories** ("PETG", "PETG CF", "PLA", "nozzle", "AMS", "filament", "bed", "plate"), **platforms** ("iPhone", "iPad", "Apple Watch", "Android", "Windows"), **auth** ("2FA", "MFA") — plus the existing resin/non-FDM stop-words. The strict-digit predicate + the expanded denylist are what keep "would love a Night Mode" / "please add Czech support" / "please support iPhone 16 Pro" / "add AMS 2 Pro" / "please add 2FA support" out. **Solves "Creator 5 Pro"** (digit-bearing).
- **Accepted residual false-negative (explicit).** A **brand-less + digit-less** model name (e.g. FlashForge "Adventurer", "Guider") is not deterministically capturable — the strong predicate misses it, and the weak predicate would flood noise. The optional **web nudge (S2 Gate 3)** is the named recall backstop for these; deterministic capture does not attempt them.

### 4.2 Scout routing — deterministic; concrete new logic (not a relabel)

- **Brand present (Tier-1):** **no change** — already → `needs-research isNewBrand:true` with manufacturer set.
- **Brand-less (Tier-2 `intent:"unresolved-brand"` ONLY):** introduce a **manufacturer-null `needs-research`** carrying `researchReason:"resolve-brand"` (an ordinary model-only / no-inferable-brand entry **without** that intent stays `incomplete` — no behaviour change), specified concretely:
  - `classify` threads the new `entry.intent` into the decision (today it threads only `lane`/`originalCategory`; `intent` would otherwise be silently dropped).
  - the candidate skeleton allows `manufacturer:null`; **`suggestId` is deferred to the Assistant** (no id minted from a null brand);
  - `collapse()` dedupe key falls back to `nr:?|<norm(model)>` when manufacturer is null (today's `nr:${mfr}|${model}` would otherwise key on `undefined`);
  - tests cover the null-manufacturer collapse + skeleton paths.
  - The Scout still only **labels** — no LLM, no research. **Invariant preserved.**

### 4.3 Assistant research-resolution — real contract delta (not just wording)

The Assistant contract today begins from `needs-research` skeletons that already carry a resolved manufacturer; "resolve an unknown brand from a bare model" is a **new responsibility**. Add:

- a Mission step + input shape: accept a `needs-research` skeleton with `manufacturer:null` / `researchReason:"resolve-brand"`;
- behaviour: resolve the brand via web research + name-convention attempts (Creator 5 Pro → FlashForge), confirm existence + FDM (runbook FDM-only gate), source specs (manufacturer-first) with per-field confidence;
- a new **stop condition:** brand unresolvable by any authoritative source → classify `unverified-model`; never guess;
- existing gates unchanged: new-brand owner sign-off; profile/safety-field confidence blocks; reviewer dispatch; runbook Phases 3–5 (web → iOS mirror local-only → overlay).

This is the correct home for "try name conventions, resolve a missing brand" — the agent *allowed* to use research/judgment. The Scout stays deterministic.

**Autonomy (owner decision 2026-06-20: more autonomous).** The research step runs as a **scheduled, unattended pass** — it picks up new `needs-research`/`unresolved-brand` candidates as they arrive, performs the research (brand resolve, FDM confirm, manufacturer-sourced specs), and **stages a ready-to-review batch** of candidate packets so the work is done before the owner sits down. **It never ships autonomously** — no commit/push/overlay-bump of a printer without explicit per-candidate owner approval; the autonomy is in *research + staging*, not in *shipping*. This is an **S5-shaped capability** and reuses S5's guardrail-maturity gating; it is staged *after* the foundational capture + routing gates (it depends on them) and is the heaviest part of this work.

## 5. Worked traces (corrected)

- **"Snapmaker 2":** Tier-1 adds "snapmaker" to the **Worker** brand tokens → tees `{ brand:"Snapmaker", model:"2" }` → Scout `resolveBrand` `known:false` → **`needs-research isNewBrand:true`, manufacturer="snapmaker"** (existing path, **no Scout edit**) → Assistant confirms FDM 3-in-1 + sources A150/A250/A350 specs → new-brand sign-off → add. **Captured + resolved.**
- **"Would love … the Creator 5 pro":** no brand/family token → Tier-2 fires (verb "would love" + digit-bearing "Creator 5 Pro") → tees `{ model:"Creator 5 Pro", brand:unknown, intent:"unresolved-brand" }` → Scout **(new §4.2 logic)** → `needs-research researchReason:"resolve-brand"`, manufacturer:null → Assistant resolves brand=FlashForge, confirms FDM, sources specs → add under existing brand. **Captured + resolved — conditional on §4.2 + §4.3 landing (called out, not assumed).**

## 6. Affected sites

| Surface | File | Change |
|---|---|---|
| capture lib | `functions/api/_lib/printer-mention.js` | expand Worker `BRAND_TOKENS` (enumerated, verified); add Tier-2 strong-intent recall + denylist (features/languages/materials) + guards; emit `intent` |
| worker tee | `functions/api/feedback.js` | thread `intent` into the KV record (already lane-aware from S2) |
| lib test | `functions/api/_lib/printer-mention.test.mjs` | recall: Snapmaker 2, Creator 5 Pro, novel-brand-present; **precision (must be null):** "would love a Night Mode", "please add Czech support", "add Multi Color printing", "would love PETG CF support", "I service my printer", "error 500", **"please add 2FA support", "please support iPhone 16 Pro", "add AMS 2 Pro", "please add 0.6 nozzle support"** |
| Scout | `scripts/printer-intake-scout.js` | thread `entry.intent` in `classify`; manufacturer-null `needs-research` + `researchReason`; `collapse()` null-manufacturer key fallback; `suggestId` deferred |
| Scout test | `scripts/printer-intake-scout.test.js` | fixtures: brand-present-unknown → `needs-research` new-brand (manufacturer set); brand-less intent → `needs-research researchReason` (manufacturer null) + correct collapse |
| ~~Scout config~~ | — | **removed** — Tier-1 is Worker-only; the Scout never reads `brandTokens`/`familyTokens`, and the S3 diff-validator forbids them as targets |
| Assistant contract | `ai-operating-model/docs/agents/printer-addition-assistant.md` | add Mission step + input shape (manufacturer-null / resolve-brand) + brand-resolution behaviour + `unverified-model` stop condition |

## 7. Cross-platform impact (mandatory evaluation)

- **Engine / data / overlay:** none for the **screening**. **Downstream caveat:** the screening is inert, but its *success* increases new-brand add throughput — each resolved add still hits `data/printers.json` + the overlay + the local iOS mirror and bumps the overlay `content_version` that reaches iOS users (via the normal runbook). So the *consequence* of this change does touch data/overlay, even though the screening code does not.
- **Web:** capture lib + tee auto-deploy from `main`.
- **iOS:** capture is **server-side** → also catches iOS general-feedback mentions; **no binary change** for screening. The iOS push gate applies only to the eventual add's local-only mirror.
- **Analytics:** unchanged.

## 8. Risks / open questions

1. **Tier-2 recall vs noise.** Mitigated by the **strict digit-bearing predicate** (a `/[0-9]/` model token, NOT `isStrongModelToken`) + intent trigger + the **expanded denylist (features / languages / materials / platforms / accessories / auth)** + separate `heuristicCandidates` grouping + the research/owner filter; S4 tunes over time. Trade accepted per owner priority.
2. **Deterministic-Scout invariant.** Preserved — research/judgment lives in the Assistant; the Scout only labels.
3. **Residual false-negative:** brand-less + digit-less model names aren't deterministically capturable; the web nudge (S2 Gate 3) is the backstop; accepted.
4. **[DECIDED 2026-06-20 — more autonomous] Research autonomy.** The research step runs as a **scheduled, unattended pass** that stages a ready-to-review batch (see §4.3), still owner-gated before any add ships. Open sub-decisions the plan must resolve: **(a) where the schedule runs** — web research needs network, and the standing rule routes scheduled external-API pipelines away from Cowork toward Codex scheduled automation / Mac `launchd` (or a Claude Code scheduled Routine); **(b) S5 overlap** — this is an S5-shaped autonomy rung and should reuse S5's guardrail-maturity gating rather than invent a parallel one; **(c) the staging surface** the owner reviews. This raises scope vs. the owner-initiated default; the plan stages it last, after foundational gates.
5. **Wrong brand resolution by research** (e.g. the wrong "Creator"). Mitigated by manufacturer-source confirmation + per-field confidence blocks + reviewer dispatch + the new `unverified-model` stop.
6. **New-brand proliferation.** Existing new-brand sign-off gate holds.
7. **Manufacturer-null `needs-research` is a new shape.** Must not break S4's outcomes-ledger schema (keys/hashes only; null manufacturer is fine) or S2/S3 lane handling — covered by tests.

## 9. Success criteria

- A brand-**present**-but-uncatalogued request ("please add the `<NewBrand> <Model>`") reaches `needs-research` (new-brand, manufacturer set) **with no Scout edit**; a **brand-less** request reaches `needs-research researchReason:"resolve-brand"` (manufacturer null) via the new §4.2 logic; both are then resolved by the Assistant.
- "Snapmaker 2" and "Creator 5 Pro" via general feedback are both captured (not dropped) and end up as actionable add candidates.
- Precision negatives (features / languages / materials / prose) are **not** captured.
- The Scout stays deterministic; the Scout **config is unchanged** (no token mirror); the owner still approves every add; a new brand still needs sign-off.
- **Commit decomposition (one finding = one commit):** (1) Worker capture (lib + tee + tests); (2) Scout routing (intent thread + manufacturer-null `needs-research` + collapse/skeleton + tests); (3) Assistant-contract research-resolution + `unverified-model` stop.

## 10. Build sequence (after approval)

1. **Spec approval** (this doc).
2. **Worker capture recall** — Tier-1 enumerated + Tier-2 strong-intent → TDD on the `.mjs`, hostile review, QA, commit. (Live Worker → under a `claude-sync.sh hold`.)
3. **Scout routing — do BEFORE the first real run** — intent threading + manufacturer-null `needs-research` + collapse/skeleton → TDD, review, QA, commit. (Until this lands, Tier-2 brand-less captures sit as `incomplete` — fail-safe, 30-day TTL.)
4. **Assistant-contract update** — Mission step + brand-resolution + `unverified-model` stop.
5. **First real run (manual / owner-initiated)** — Snapmaker 2 + FlashForge Creator 5 Pro through the upgraded screening → research → owner-approved adds (web → iOS mirror → overlay per runbook). Must follow step 3. Proves the pipeline end-to-end *before* automating it.
6. **Autonomous research routine ("more autonomous")** — the scheduled, unattended research pass + the owner-review staging surface, reusing S5's guardrail-maturity gating. **Heaviest gate; depends on steps 2–4 and a green manual run (5).** Resolve the §8-risk-4 sub-decisions (schedule host, S5 reuse, staging surface) at the top of this gate; it may warrant its own spec/plan iteration before build.
