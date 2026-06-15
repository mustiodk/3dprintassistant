# S2 — Intake capture completeness: implementation plan

**Date:** 2026-06-15
**Status:** Draft — pending sub-agent review → patch → QA gate
**Spec:** [`../specs/2026-06-15-s2-intake-capture-completeness-design.md`](../specs/2026-06-15-s2-intake-capture-completeness-design.md) (QA-green, v2 — the BLOCK was resolved by Worker-side extraction)
**Topic:** S2 of the feedback-pipeline evolution
**Scope:** web Worker + Scout script (+ optional web nudge). **No iOS binary, engine, data-profile, or overlay change.**
**Ship path:** **web, immediate** — the Worker auto-deploys from `main`; the Scout is a local/scheduled script.
**Commit decomposition:** **3 separate commits** (web ships incrementally; unlike S1, no compile-coupling forces one commit).

> **EXECUTION IS DEFERRED.** No code is written until an explicit owner command. This plan describes the gates for when execution is authorized.

---

## 0. Preconditions & grounded context

- **Spec is QA-green (v2).** The load-bearing fix is **Worker-side deterministic extraction** (`extractPrinterMention`) that tees **structured** `{id:'brand'/'model'/'notes'}` fields, which the Scout's `mapFields` id-first branch (`scripts/printer-intake-scout.js:164,169-175`) consumes — so captures become actionable, not `unactionable` (the v1 BLOCK).
- **Test tooling reality (review-confirmed):** there is **no `package.json`** in the web repo. (a) Pure ESM lib → tested with `node --test` on a `.test.mjs` file — **this is already the live pattern** in `functions/api/` (the analytics tests `*.test.mjs` import their source via `export`). (b) The Scout suite is **spawn-based** (`spawnSync('node', [SCRIPT, '--queue', fixture])` → parse stdout JSON), **28 cases / 91 assertions**.
- **Bundling reality (review-confirmed):** the deploy uses a **single `worker.js` entrypoint** (`wrangler.toml main = "worker.js"`) that already `import`s `./functions/api/*.js`; a new `functions/api/_lib/printer-mention.js` imported by `feedback.js` **bundles identically** — not a Pages auto-Functions setup, so the `_lib` import is safe. `scripts/**` + `.assetsignore` keep non-served paths off the public surface.
- **The `PRINTER_INTAKE` KV binding is live** (bound in `wrangler.toml`, verified writing in prod 2026-06-13). So Gate 1 ships **live capture** on deploy (the `env.PRINTER_INTAKE` guard is satisfied) — the extraction makes every captured item actionable, so there is no "PII-without-payoff" window.
- **iOS push gate / TestFlight: N/A** — S2 touches no iOS binary.

---

## 1. Gates

Each gate: **implement → sub-agent review → patch → gate QA (runs locally — these tests *do* run here, unlike S1) → commit.** Advance only on green.

### Gate 1 — Worker lib + extractor + widened tee (web commit 1)

**Files:**
- **new** `functions/api/_lib/printer-mention.js` — pure ESM. `export function extractPrinterMention(fields)`:
  - concatenate field *values*; `\b`-anchored whole-token scan for a known **brand token** or **family token** (minimal self-contained lists until S3 externalises them — note the dedupe debt to S3 in a code comment);
  - **fire only** on a brand/family token; a bare `\w+\d+` only *corroborates*; 2-char family tokens (`mk`/`sv`/`x1`/`p1`/`a1`) require an adjacent model token;
  - extract a **tight span** (brand/family token + 1–3 model tokens; stop at descriptive prose so a trailing resin-ish adjective never enters the span);
  - return `{ brand?, model, span } | null` (`null` ⇒ not a printer request ⇒ don't tee).
- `functions/api/feedback.js` — `import { extractPrinterMention }`; widen the tee (`:259-272`):
  - `missingPrinter` → tee as today, add `lane:"form"` (90-day TTL unchanged);
  - else, **only for `generalFeedback`/`featureRequest`/`bugReport`** (exclude the structured `missing*` forms), if `extractPrinterMention(rawFields)` is non-null **and** `env.PRINTER_INTAKE` → tee `{ fields:[{id:brand},{id:model},{id:notes:<bounded span ≤160 chars>}], lane:"heuristic", originalCategory, … }` with a **30-day TTL**;
  - the new branch lives **inside the existing `try/catch` swallow** (fail-open preserved — a KV error never blocks Discord or `{ok:true}`).
- **new** `functions/api/_lib/printer-mention.test.mjs` — `node --test`: recall fixtures (Sovol/Kobra/Ender/Voxelab/Prusa MK4S extract), precision fixtures (love-this-app / export-broken / dark-mode / Error-500 / "I service my printer" → null), span-tightness fixture ("Sovol SV08 … sonic-fast" → tight `Sovol SV08`, no resin word in span).
- **Gate 1 QA (runs locally):** `node --test functions/api/_lib/printer-mention.test.mjs` green; `node --check functions/api/feedback.js` + the lib; a manual trace that the heuristic branch is inside the swallow and only fires for the 3 categories.
- **Commit 1:** `feat(web): tee wrong-form printer requests via deterministic extraction (S2)`.

### Gate 2 — Scout provenance + collapse lane fix (script commit 2)

**Files:**
- `scripts/printer-intake-scout.js`:
  - thread `entry.lane` / `entry.originalCategory` into `classify()` output (`:306-330` already receives the whole `entry`), the report `items[]` projection (`:755-770`), and `candidateSkeleton()` (`:460-532`) as `sourceLane` + `originalCategory`;
  - **add a NEW `riskFlags`/`sourceLane` field to the report `items[]` projection (`:755-770`)** — today `riskFlags` exists **only** inside `candidateSkeleton()` (`:462-467`), which writes to `--out` staging and fires **only** for `needs-research`. The heuristic risk flag must therefore be surfaced on the report **item** for **every** heuristic-lane outcome — `needs-research`, **`duplicate`, and `incomplete`** (spec §4.3 traces produce heuristic-lane `duplicate`/`incomplete` too) — not just on the staged skeleton; also add the `heuristicCandidates` grouping/count in the report (`:748-772`);
  - **`collapse()` lane fix (`:431-457`):** the merge block (`:439-446`) is **shared** by both the `nr:${mfr}|${model}` key (`:436`, novel) and the `dup:${matchedPrinter.id}` key (`:437`, duplicate) — so one fix covers both paths: add a per-lane breakdown `lanes:{form,heuristic}` to the merged record; surviving `sourceLane` = highest-confidence contributing lane (**form wins**); drop the heuristic risk flag once a form-lane request corroborates the same printer.
- `scripts/printer-intake-scout.test.js` — spawn fixtures: a `lane:"heuristic"` entry (extracted `brand`/`model`) → assert `sourceLane:"heuristic"` + risk flag **on the report item** + appears under `heuristicCandidates`; a heuristic-lane entry that resolves to a **`duplicate`** → assert the risk flag is **still surfaced on the item** (not lost for being non-`needs-research`); a form+heuristic same-printer collapse on **both** the novel (`nr:`) and duplicate (`dup:`) paths → assert `lanes:{form:1,heuristic:1}` + surviving `sourceLane:"form"`; **form-lane behaviour unchanged** (regression).
- **Gate 2 QA (runs locally):** `node scripts/printer-intake-scout.test.js` green (28 existing + new pass); the existing sample queue's outcome counts unchanged for the form lane; `node --check`.
- **Commit 2:** `feat(scout): heuristic-lane provenance + collapse lane breakdown (S2)`.

### Gate 3 — (optional) web form-UX nudge (web commit 3)

**Files:** `feedback-form.js` + `locales/*.json` — when a printer-ish string is typed into a non-`missingPrinter` form, show a dismissible inline nudge linking to the Missing-printer form. Additive, web-only.
- **Gate 3 QA:** web preview smoke — the nudge appears on a printer-ish input in general feedback and is dismissible; no regression to the existing form. (This is the only gate needing a browser preview.)
- **Commit 3:** `feat(web): nudge wrong-form printer requests toward the Missing-printer form (S2)` — **owner-pick** (spec §8 risk 8 open question); may be deferred.

---

## 2. Verification gate

- **Gates 1 + 2 QA run locally** (Node tests — the win over S1). Required green: lib recall/precision/span-tightness, Scout lane fixtures, form-lane regression, fail-open.
- **Post-deploy (web auto-deploys on push):** a smoke POST of a printer-ish general-feedback submission lands a `lane:"heuristic"` KV entry; a non-printer submission does not; `{ok:true}` returned either way. (Owner or a guarded smoke; respects the no-hoard rule.)
- **Scout dry-run** against the live KV (`--source kv`) shows the heuristic item under `heuristicCandidates`, flagged, not auto-promoted.

---

## 3. Cross-platform impact (mandatory evaluation)

- **Engine / data-profile / overlay:** **none.**
- **Web:** the lib + tee + optional nudge; Worker auto-deploys from `main`.
- **iOS:** **no binary change** — the server-side tee also catches iOS general-feedback printer mentions (S1 + S2 close both finding-1 root and finding-2 residual).
- **iOS push gate:** **N/A.**
- **Analytics:** unchanged; no new events; no identity-linked telemetry.

---

## 4. Risks & fallbacks (from spec §8)

| Risk | Plan handling |
|---|---|
| Heuristic false positives | brand/family-token gate + separate `heuristicCandidates` grouping; S4 tunes later |
| Heuristic false negatives | optional nudge (Gate 3) + S1 reduce reliance; residual accepted |
| PII content-class delta | bounded span (≤160) not full message; 30-day heuristic TTL; PII-safe report unchanged |
| Resin keyword in an over-wide span | tight-span rule + span-tightness fixture; fail-safe (owner-reviewed decline) |
| Token-list duplication with the Scout | minimal self-contained list now; S3 externalises to the shared config |
| `collapse()` cross-lane masquerade | the lane-breakdown + form-wins fix is **in Gate 2** — don't ship Scout changes without it |

---

## 5. Ship sequence (when executed)

1. Land Gate 1 → push web → auto-deploy → smoke the live tee.
2. Land Gate 2 → push (script; affects the next scheduled/local Scout run).
3. Gate 3 only if the owner takes the nudge.
- Web push is allowed (auto-deploy); **no iOS, no overlay, no TestFlight.** Each gate is its own commit (one finding = one commit).

---

## 6. Done criteria (plan-level)

- [ ] Gate 1: lib + tee + lib test green locally; committed.
- [ ] Gate 2: Scout provenance + collapse lane fix + fixtures green locally; form-lane regression clean; committed.
- [ ] Gate 3: nudge (if owner takes it) preview-verified; committed.
- [ ] Post-deploy smoke: printer-ish general feedback → `lane:"heuristic"` KV entry, actionable in the Scout; non-printer → not teed; fail-open holds.
- [ ] No engine/data/overlay/iOS-binary change.

---

## 7. What this plan deliberately does NOT do

- It does **not** execute (no code until owner go).
- It does **not** externalise the token lists into a shared config — that is **S3** (the lib keeps a minimal self-contained list, with a comment pointing at the S3 debt).
- It does **not** add the learning loop — that is **S4**.
- It does **not** touch iOS, the engine, data profiles, or the overlay.
