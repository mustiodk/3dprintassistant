# S2 — Intake capture completeness (design spec)

**Date:** 2026-06-15
**Status:** Draft v2 — sub-agent reviewed (v1 verdict **BLOCK**: the Worker tee produced records the Scout classified `unactionable`, so captures were re-stored then dropped — the pipe wasn't connected). v2 connects it via Worker-side deterministic extraction. Pending re-review → QA gate.
**Topic:** S2 of the feedback-pipeline evolution (S1 iOS prefill fix · **S2 intake capture completeness** · S3 Scout robustness + learned-guardrails config · S4 Intake Retrospective · S5 Assistant autonomy ladder)
**Scope:** Web Worker (`functions/api/feedback.js` + a new shared lib) + the Scout (`scripts/printer-intake-scout.js`), plus an optional web form-UX companion. **No iOS binary, engine, data, or overlay change.**
**Ship path:** **Web — immediate.** The Worker auto-deploys from `main` (Cloudflare Workers/Assets); the Scout is a local/scheduled Node script. No app version, no TestFlight.

> Absorbs **Scout finding 2** (general-feedback printer requests invisible). Independent of S1, different ship path (S1 = iOS binary/TestFlight; S2 = web/immediate).

---

## 1. Problem

The Printer Intake tee fires for one exact category. In `functions/api/feedback.js:259`:

```js
if (payload.category === "missingPrinter" && env.PRINTER_INTAKE) { … tee … }
```

So **a printer request filed through any other form is invisible to the Scout** and silently dropped if it names a printer not in the catalog. Two residual leaks remain even after S1:

1. **Wrong-form misroute (both platforms).** "please add the Sovol SV08" typed into *General feedback* / *Feature request* / *Bug report* reaches Discord but never reaches intake.
2. **Web has no per-picker "missing X" buttons at all.** Web's only printer-request surface is the general feedback cards (`index.html:161-171`); there is no contextual "Printer missing?" button like iOS. So on web a printer mention inside general feedback is the **primary** intake path, and today it is invisible.

**Evidence (2026-06-14 real-backlog run, Scout finding 2):** "Kobra 3 Max", "kobra X", "voxelab Aries" arrived via general feedback. All three were already in the catalog that run (no loss), but a **novel** printer so-filed would have been **silently dropped** — losing both the request and the demand signal.

## 2. Root cause

Intake is gated on **"which form was used"** (a single category-equality check), not on **"is this a printer request."** And even if it were teed, **the Scout cannot consume free-text feedback**: `mapFields()` only routes a field to `brand`/`model` when the field's `id` is `brand`/`model` or its label matches `/\b(brand|model|printer|…)\b/` (`scripts/printer-intake-scout.js:156-180`). General/feature/bug fields carry none of those (web general feedback sends `{id:'message',…}`; iOS sends label-only tuples like `("Feedback", …)`, `("What happened", …)`). So a raw free-text tee would map to **`brand:'' model:''` → `classify()` → `unactionable`** (`:334-335`). **The capture layer therefore needs a structuring step, or it captures nothing actionable.** That structuring step is the heart of v2.

## 3. Scope

**In scope:** capture printer requests filed through the wrong form, **structured** so the Scout can actually act on them, into a triage lane the owner reviews — without polluting the high-precision form lane, without hoarding all feedback, and without making the Scout do free-text judgment its contract forbids.

**Out of scope:** the Scout's *matching* robustness — brand typos (`Bmbulab`→`bambu_lab`), model-variant suffixes (`i7 w/CFS`→`sparkx_i7`) — and externalising shared signal/alias data into a config: that is **S3**. The learning loop that tunes the heuristic: **S4**. Any change to feedback categories, fields, the Discord payload, or analytics. Any iOS binary change.

## 4. Design

Three parts: a **Worker-side deterministic extractor** (the load-bearing fix — turns a free-text printer mention into structured `brand`/`model`), **Scout provenance awareness** (deterministic; adds lane tags, never free-text judgment), and an **optional web nudge**.

### 4.1 Worker-side deterministic printer-mention extraction (load-bearing)

A new **shared ESM module** `functions/api/_lib/printer-mention.js` exports two pure functions; `feedback.js` imports them and the tee gains a second branch:

```js
// the gate + the structuring, both deterministic, no catalog/LLM:
const mention = extractPrinterMention(rawFields);   // → { brand?, model, span } | null
if (payload.category === "missingPrinter") {
   // unchanged form lane, now tagged
   tee({ fields: rawFields, lane: "form", … });
} else if (mention && env.PRINTER_INTAKE) {
   tee({
     fields: [
       ...(mention.brand ? [{ id: "brand", value: mention.brand }] : []),
       { id: "model", value: mention.model },           // structured → Scout's mapFields picks it up
       { id: "notes", value: mention.span },            // BOUNDED context span, not the full message
     ],
     lane: "heuristic", originalCategory: payload.category, …
   });
}
```

**`extractPrinterMention(fields)` — deterministic, recall-biased-but-bounded (this is the gate AND the structurer):**
- Concatenate the field *values*; scan for a **known FDM brand token** (`bambu`/`bambulab`, `creality`, `prusa`, `anycubic`, `elegoo`, `sovol`, `qidi`, `flashforge`, `artillery`, `anker`/`ankermake`, `voron`, `voxelab`, …) **or** a **known printer-family token** (`ender`, `kobra`, `mk`, `x1`, `p1`, `a1`, `sv`, `mega`, `neptune`, …).
- **Fire only on a brand token or a known-family token** — never on a bare `\w+\d+` shape alone (this kills "Error 500", "version 2", "top 10"), and never on `printer`+`please` alone (kills "please fix the printer export"). A generic number-shape only *corroborates* an adjacent brand/family hit, it never fires by itself.
- **Matching is `\b`-anchored whole-token**, never substring (`sv` must not hit "service", `mk` must not hit "remark"); the **ultra-short 2-char family tokens** (`mk`/`sv`/`x1`/`p1`/`a1`) fire **only with an adjacent model token** (a digit/variant) — the same corroboration rule as the number-shape.
- On a hit, extract a **tight mention span**: the brand/family token plus the following 1–3 model tokens (letters/digits/`-`/`+`) — **stop at descriptive prose** (a trailing adjective like "sonic-fast" must **not** enter the span, or it could feed a resin keyword into `fdmDecline` — §8 risk 8). Put the brand token (if it was a brand, not just a family) into `brand`; put the brand-stripped remainder (or the family+model) into `model`. The Scout's existing `extractLeadingBrand()` + `globalModelIndex` + `familyToBrand` then resolve/dedupe it like a normal request.
- Return `null` (→ **don't tee**) when no brand/family token is present. The extraction *is* the precision gate: if we can't structure it, it wasn't confidently a printer request.

**Why Worker-side, not Scout-side (contract compliance):** the Scout's contract is **deterministic, no-LLM, no-speculation** and its outcome classes are fixed. Having the *Scout* decide "which token in a free-text blob is the model" is the judgment its contract forbids. Doing a **deterministic token extraction in the Worker** keeps the Scout receiving only structured `brand`/`model` — the Scout stays fully within contract and just adds provenance (§4.2). This mirrors the Scout's own existing deterministic `extractLeadingBrand` split.

**Privacy + cost (content-class aware):**
- Only **extraction-positive** submissions are stored (not every "love this app").
- **Store the bounded `span`, not the full message.** Free-text general/bug/feature prose carries materially more PII than a structured `missingPrinter` add, and iOS bug/printer prefills can seed diagnostic `contextNote` into the text. So the teed `notes` is the **matched span ± a small window (cap ~160 chars)**, not `fields: rawFields` verbatim — the owner gets enough to verify, KV-at-rest exposure is minimised.
- **30-day TTL for the heuristic lane** (vs. 90 for the form lane) — lower confidence + higher PII both argue for the shorter window; locked here, not deferred.
- Same **fail-open, best-effort** contract: a KV error is swallowed; it never blocks the Discord post or `{ok:true}` (the new branch inherits the existing `try/catch`).
- **Categories the heuristic runs on: `generalFeedback`, `featureRequest`, `bugReport` only.** The structured `missing*` forms are **excluded** — they have their own intended lanes, and running the extractor over a "Missing filament" whose brand is "Anycubic" (a brand that also makes printers) would mint a spurious printer candidate.

### 4.2 Scout provenance awareness (deterministic; no new judgment)

`scripts/printer-intake-scout.js` changes are **provenance + reporting only** — the classifier is untouched, so the Scout stays within its outcome classes (`needs-research`/`duplicate`/`declined-non-fdm`/`incomplete`/`unactionable`/`parse-error`):

- thread `entry.lane` / `entry.originalCategory` (top-level on the KV entry — survives into `classify(entry, cat)` which already receives the whole entry) into `items[]`, the report, and `candidateSkeleton()` as `sourceLane` + `originalCategory`;
- heuristic-lane items get an extra **risk flag**: `"heuristic-sourced from category '<originalCategory>' — confirm this is genuinely a printer request before researching"`;
- the run report lists heuristic-lane candidates in a **separate `heuristicCandidates` grouping** so they don't read as explicit form requests;
- **`collapse()` lane fix (§8 risk 5):** today the in-queue dedupe key is `nr:${mfr}|${norm(model)}` (`:436`), no lane — so a form-lane and heuristic-lane request for the *same* printer collapse and the **first-seen** item sets the surviving `sourceLane`/`riskFlags`, letting a heuristic item masquerade as form-sourced (or vice versa). Fix: keep the single collapsed entry (don't split demand count) but track a per-lane breakdown `lanes: { form: n, heuristic: m }` and set the surviving `sourceLane` to the **highest-confidence** contributing lane (**form wins**), dropping the heuristic risk flag once a form-lane request corroborates the same printer.

The Scout **never auto-promotes** a heuristic item — same owner + Assistant gates as any `needs-research`.

### 4.3 Worked traces (the v1 gap — prove the pipe connects)

- **Recall, brand present:** a known brand + a not-yet-catalogued model (e.g. `"please add the Sovol <new-model>"`) → `extractPrinterMention` hits brand `sovol`, tight span `"Sovol <new-model>"` → teed `fields:[{id:brand,Sovol},{id:model,<new-model>},{id:notes,<bounded span>}] lane:heuristic` → Scout `mapFields` → `{brand:'Sovol',model:'<new-model>'}` → `resolveBrand('Sovol')`=sovol known → dedupe **miss** → **`needs-research`** + `sourceLane:'heuristic'` + risk flag. **Surfaced, not dropped.** (The *same path* with an already-catalogued model — e.g. the real Sovol SV08 — lands on **`duplicate`**: still actionable, still surfaced, never `unactionable`.)
- **Family token, no explicit brand:** a `"…Ender 3 V3 <variant> missing"` mention in a bug report → family token `ender` hits → tight span → `{model:'Ender 3 V3 <variant>'}` → Scout `extractLeadingBrand` finds no leading *brand* word, falls to `familyToBrand['ender']`=creality (existing path) → resolve + dedupe → **`duplicate`** if catalogued (e.g. the real Ender 3 V3 KE), **`needs-research`** if a novel ender-family model — both reviewable, neither `unactionable`.
- **Brand only, no model:** `"my Prusa is missing"` → brand `prusa`, no model token → `{brand:'Prusa'}` → Scout → **`incomplete`** ("brand given but no model") — a legitimate owner-review bucket, **not `unactionable`**.
- **Negative (must not tee):** `"the export button is broken"` / `"please add dark mode"` / `"love this app"` → no brand/family token → `extractPrinterMention` returns `null` → **not teed**.

## 5. Affected sites

| Surface | File | Change |
|---|---|---|
| Worker lib | **new** `functions/api/_lib/printer-mention.js` | pure ESM `extractPrinterMention(fields)` (+ token lists) |
| Worker tee | `functions/api/feedback.js` | `import` the lib; widen the tee (`:259-272`) into form-lane + heuristic-lane branches; bounded-span notes; `lane`/`originalCategory`; 30-day TTL on heuristic lane |
| Lib test | **new** `functions/api/_lib/printer-mention.test.mjs` | ESM `node --test` recall/precision unit tests |
| Scout | `scripts/printer-intake-scout.js` | thread `lane`/`originalCategory` (`classify` `:306-330`, report `:748-772`, `candidateSkeleton` `:460-532`); `collapse()` lane fix (`:431-457`); `heuristicCandidates` report grouping |
| Scout test | `scripts/printer-intake-scout.test.js` | add spawn-based fixtures: a `lane:"heuristic"` queue entry → assert `sourceLane`/risk flag/`heuristicCandidates`; a form+heuristic same-printer collapse → assert form wins |
| *(optional)* web nudge | `feedback-form.js` + `locales/*.json` | inline "looks like a printer request — use the Missing printer form" copy + trigger |

## 6. Testing strategy

**Ground truth (corrected from v1):** there is **no `package.json` in the web repo** — no `npm test`; the Scout's suite is run by hand (`node scripts/printer-intake-scout.test.js`) and is **spawn-based** (`spawnSync('node', [SCRIPT, …args])` → parse stdout JSON), **28 test cases / 91 assertions**. It does **not** `require()` Scout internals. So the two new test bodies use the two styles that actually work here:

- **`extractPrinterMention` (pure) → ESM import test.** The lib is ESM (`export function`) because `feedback.js` is an ESM Function; test it with a Node-native ESM file `printer-mention.test.mjs` (`node --test printer-mention.test.mjs` — no `package.json`, no new tooling, `.mjs` makes Node treat it as ESM). Fixtures:
  - **Recall (must extract):** "can you add the Sovol SV08", "please support Kobra 3 Max", "Ender 3 V3 KE is missing", "add Voxelab Aries", "my Prusa MK4S isn't in the list".
  - **Precision (must return null):** "love this app", "the export button is broken", "please add a dark mode toggle", "great filament database", "Error 500 on export", "version 2 feedback", **"I service my printer regularly"** (the 2-char `sv` family token must NOT hit "service" — `\b`-anchored + adjacent-model rule).
  - **Span-tightness (must stay actionable, must NOT auto-decline):** "the Sovol SV08 is great, prints sonic-fast" → extracts the tight span `Sovol SV08` (not "…sonic…") → `needs-research`/`duplicate`, **not** `declined-non-fdm` (guards §8 risk 8).
  - Bar: **high recall, low false-positive** — because the gate is brand/family-token presence (not a bare number shape), the precision set should reliably return `null`.
- **Scout lane handling → spawn-based fixtures** (match the existing 28-case style): a fixture queue with a `lane:"heuristic"` entry (carrying extracted `brand`/`model`) → assert the run-report item has `sourceLane:"heuristic"` + the risk flag and appears under `heuristicCandidates`; a fixture with a form-lane + heuristic-lane entry for the same printer → assert they collapse to one with `lanes:{form:1,heuristic:1}` and surviving `sourceLane:"form"`.
- **Fail-open regression:** a KV `put` throw still returns `{ok:true}` and still posts to Discord (heuristic branch inside the existing swallow).
- **QA gate:** lib recall/precision green; Scout lane fixtures green; fail-open verified; `node --check` clean on `feedback.js` + the lib + the Scout.

## 7. Cross-platform impact (mandatory evaluation)

- **Engine / data / overlay:** **none.**
- **Web:** the lib + tee + (optional) nudge are web; the Worker auto-deploys from `main`.
- **iOS:** **no binary change.** The tee is **server-side**, so the widened capture **also catches iOS** general-feedback printer mentions. **S1 (iOS funnel repair) + S2 (residual capture, both platforms)** together close finding-1's root *and* finding-2's residual — no iOS release for S2.
- **iOS push gate:** **N/A.**
- **Analytics:** **unchanged** — no new events; the tee is invisible to `feedback_opened`; no identity-linked telemetry.

## 8. Risks / open questions

1. **False positives inflate the triage lane.** Mitigated by the brand/family-token gate (no bare number-shape, no `printer`+`please`) and the separate `heuristicCandidates` grouping; **S4** tunes the token set over time without ever auto-shipping.
2. **False negatives still drop a request.** Mitigated by the optional web nudge (§4.3) + S1; residual loss accepted (the form lane stays the high-precision path).
3. **PII content-class delta** — heuristic-lane stores riskier free prose than a structured add. Mitigated by storing **only the bounded matched span** (not the full message), the **30-day TTL**, and the unchanged PII-safe run report (hashed email, notes-as-length).
4. **Token-list duplication** between the Worker lib and the Scout. Until **S3** externalises shared signal/alias data into the learned-guardrails config, the Worker lib keeps a **minimal self-contained** token list; the dedupe debt is explicitly handed to S3.
5. **`collapse()` cross-lane provenance** — addressed by the lane-breakdown + form-wins fix in §4.2 (don't ship the Scout change without it, or a form request can inherit a heuristic risk flag).
6. **Edge cost** — a cheap regex/token scan per POST; negligible.
7. **Resin keyword inside an over-wide span** — if extraction over-extends into descriptive prose, a trailing word containing a `RESIN_MODEL_KEYWORDS` token (`mars`/`sonic`/`mighty`, `scripts/printer-intake-scout.js:204-207`) could trip `fdmDecline` into a false `declined-non-fdm`. Mitigated by the **tight-span rule (§4.1)** + the span-tightness fixture (§6); fail-safe direction (a real printer lands in the owner-reviewed decline bucket, never a phantom ship).
8. **Open (owner):** keep the optional web nudge (§4.3) in S2 or defer it? It is recall-improving but not load-bearing.

## 9. Relationship to the rest of the pipeline

S2 **captures + structures** the residual S1 can't (wrong-form misroutes on both platforms; web's missing contextual buttons), turning a free-text mention into a Scout-actionable request. **S3** then makes the Scout's *matching* robust (brand typos, model-variant suffixes — far more likely in a free-text misroute than in the structured form) and externalises the shared token/alias data into a versioned config — so the boundary is clean: **S2 = capture + deterministic extraction to structured fields; S3 = robust matching + config externalisation.** **S4** learns which heuristic tokens actually convert to real adds and proposes tuning diffs into S3's config. S2 is independent of S1 and ships first if the owner sequences by ship-speed.

## 10. Success criteria

- A printer request typed into general/feature/bug feedback (**web or iOS**) is captured into `PRINTER_INTAKE` with `lane:"heuristic"` + `originalCategory` **and structured `brand`/`model`**, so the Scout produces an **actionable** outcome (`needs-research`/`duplicate`/`incomplete`) — **never silently `unactionable`** (the v1 BLOCK).
- Non-printer feedback returns `null` from the extractor and is **not** teed.
- The `missingPrinter` form lane is unchanged in behaviour, tagged `lane:"form"`.
- The Scout reports heuristic-lane items **separately**, flagged, never auto-promoted; a form-lane corroboration of the same printer **wins** the surviving `sourceLane`.
- **Fail-open preserved.**
- No engine/data/overlay/iOS-binary change; the Worker auto-deploys.
- **Commit decomposition** (re-ordered so no commit writes PII-without-payoff): (1) the Worker lib + extractor + widened tee (behind the existing `env.PRINTER_INTAKE` guard, so dormant until proven) + the lib test; (2) the Scout provenance + `collapse()` lane fix + Scout fixtures; (3) the optional web nudge. One finding = one commit.
