# Gemini research handover — Environment taxonomy expansion

> **How this file works.** Claude (the implementing assistant) writes everything above the `# Gemini Response` marker — Goal, Context, Tasks, Output format, Sources, Quality bar, Schema reference, Open questions. Gemini fills in findings into the `# Gemini Response` section at the bottom. Claude then appends `# Resolution` with what's accepted / modified / declined and which findings get carried into the Codex design-review packet for this item. The file is the single artifact for this research — no parallel chat handoff, no copy-paste blocks.
>
> **Read-only constraint (MANDATORY).** During this research, Gemini MUST NOT modify any project source files. Gemini's only allowed write surface is the `# Gemini Response` section of THIS file. No edits to `data/rules/environment.json`, `engine.js`, `locales/*.json`, iOS `EngineService.swift`, tests, scripts, or any non-packet artifact. Findings that imply a code/data change are described in JSON / prose blocks inside the response; Claude applies the change after the owner approves dispositions in the `# Resolution` section. The research/implementation boundary is intentional — keep it clean.
>
> **Project context (read first).** [`docs/3dpa-context.md`](../3dpa-context.md) — what 3dpa is, the engine architecture, the data model, the standing rules, and the AI Operating Model under which this research is run. The file below assumes you've read that.

---

## Goal

Produce three things, written into `# Gemini Response` below:

1. **A candidate environment taxonomy** for 3dpa — the recommended set of environment options users should see, expanding beyond the current four (cold-focused) options to cover the global range of conditions hobbyists actually print in. Bound the recommendation: avoid taxonomy bloat (don't propose 15 environments).
2. **Per-environment effect research** — for each candidate environment, enumerate the real failure modes it causes across material categories (PLA family / engineering plastics / flexibles / nylon family / composites), the print-setting deltas that compensate, and the warnings worth surfacing to the user. Cite sources.
3. **Anomaly + design surface flags** — questions or design tensions Claude should know about before drafting the Codex review packet for this item.

This handover **researches** the problem space. It does **not** decide schema changes or final IDs — those are Codex packet (Item 2) decisions. Gemini's output feeds into that packet's "Decision to challenge" section.

---

## Context

### What's there now (`data/rules/environment.json`)

Four environment options:

| id | name | description | bias |
|---|---|---|---|
| `normal` | Normal room | 15–30°C in data, displayed as standard room conditions | baseline (no deltas) |
| `cold` | Cold garage (5–15°C) | Cool room below 18°C or near windows | nozzle +5°C, first-layer bed +7°C, fan ×0.9, first-layer speed ×0.8, force draft shield, 15-min preheat |
| `vcold` | Very cold (<5°C) | Below 5°C — garage or outdoor | nozzle +10°C, bed +5°C, first-layer bed +10°C, fan ×0.8, first-layer speed ×0.7, force draft shield, 20-min preheat |
| `humid` | High humidity | Above 60% RH — moisture-sensitive materials need drying | no print-setting deltas; humidity risk warning currently keyed to the `humid` id |

**Owner's diagnosis:** *"I'm living in a cold environment, so my environment selections mostly cover cold weather and humidity. Different regions have different challenges. We should add more options."*

This is correct. The current taxonomy reflects northern-European-winter bias. Real users print in:
- Hot summers across most of the world (PLA bed-stick failure, fan inadequacy, bridging quality drop)
- Year-round hot+humid (Singapore, Florida, Indian monsoon, coastal Brazil — moisture compounds with high ambient)
- Hot+dry (Arizona, central Australia, Mediterranean summer — different failure profile from hot+humid)
- Dusty workshops (PMS air contamination, bearing fouling, surface particulate)
- High altitude (>2000 m — boiling point of moisture changes, fan effectiveness drops, bed-warp behaviour shifts)
- Sealed rooms / poor ventilation (VOC accumulation from ABS/ASA/PA — health risk surfaces here, not a print-quality concern)

We are missing the hot half of the temperature axis entirely, the dry half of the humidity axis, plus three orthogonal dimensions (dust, altitude, ventilation).

### Schema reference (current — read carefully before proposing)

```json
{
  "id": "vcold",                            // snake_case, short, stable
  "name": "Very cold (<5°C)",               // display name
  "desc": "Below 5°C — garage or outdoor.", // subtitle, ≤80 chars
  "ambient_temp_range": [-20, 5],           // [low, high] in °C
  "nozzle_adj": 10,                         // °C delta added to material's nozzle_temp_base
  "bed_adj": 5,                             // °C delta added to material's bed_temp_base
  "bed_first_layer_adj": 10,                // °C delta on first layer ONLY (additive on top of bed_adj)
  "fan_multiplier": 0.8,                    // multiplier on fan speed (0.8 = reduce 20%)
  "first_layer_speed_multiplier": 0.7,      // multiplier on first layer speed
  "preheat_minutes": 20,                    // recommended enclosure preheat
  "force_draft_shield": true,               // bool — intended draft-shield signal; data/reference only today
  "humidity_warning": false,                // bool — intended humidity signal; data/reference only today
  "warnings": [                             // user-facing strings (one warning per array element)
    "Very cold environment — nozzle +10°C, bed +5°C, first layer speed reduced 30%.",
    "Extended preheat (20 min) strongly recommended. Monitor first layer adhesion closely.",
    "Cold environments often have high humidity — check and dry filament before printing."
  ]
}
```

**Important schema property:** all numeric deltas are **global** — they apply identically to every material. There is no per-material override mechanism in the current schema. This is a real design tension because hot environments affect, e.g., PLA much more than ABS (PLA softens on a 60°C bed at 35°C ambient; ABS doesn't). Whether to extend the schema for per-material deltas is a Codex packet decision; Gemini's job is to surface where the global-delta approach breaks down so Claude can frame that decision crisply.

**Current engine-consumption reality:** not every field in `environment.json` currently has the same behavioral weight. Gemini should research what the model *should* express, but should flag when a recommendation needs engine work rather than assuming a JSON-only edit is enough.

| Field | Current behavior in `engine.js` |
|---|---|
| `name`, `desc` | Shown in web + iOS option lists through `Engine.getFilters(state)` |
| `nozzle_adj`, `bed_adj` | Consumed by temperature outputs and bed-cap warnings |
| `first_layer_speed_multiplier` | Consumed by `resolveProfile` initial-layer speed |
| `preheat_minutes` | Used in checklist only when current hard-coded cold-env logic applies (`cold` / `vcold`) |
| `warnings` | Emitted as generic environment warnings |
| `ambient_temp_range` | Data/reference only today |
| `bed_first_layer_adj` | Data/reference only today; not currently applied to emitted first-layer bed temp |
| `force_draft_shield` | Data/reference only today; not currently emitted into slicer settings |
| `humidity_warning` | Data/reference only today; humid material warning is currently keyed to `state.environment === "humid"` |

If a recommended environment depends on a data-reference-only field becoming functional, put that in Block 4 / Block 5 as an implementation-impact flag.

---

## Tasks

### Task 1 — Catalogue candidate environment categories

Build a list of every environment category that meaningfully affects 3D printing for FDM hobbyists. Don't filter for "what 3dpa should ship" yet — produce the full list, then in Task 3 you'll recommend a bound.

For each candidate, note:
- **Category name** (proposed, snake_case-friendly)
- **Real-world description** (e.g. "tropical / hot+humid year-round; ambient 26–35°C, RH > 70%")
- **Geographic / situational examples** (real places or scenarios)
- **Primary axis** (temperature / humidity / particulate / pressure / ventilation)

Aim for 8–14 candidates initially; the taxonomy bound (Task 3) will prune. Keep Task 1 broad but compact: one row per candidate, no long narrative.

### Task 2 — Per-environment effects research

For **each candidate** from Task 1, produce:

#### 2a. Failure modes by material category

A short table:

| Material category | Primary failure mode in this environment | Severity (low/med/high) | Source |
|---|---|---|---|
| PLA family | …  | … | URL |
| Engineering (PETG, ABS, ASA) | … | … | URL |
| Flexibles (TPU 85/90/95A) | … | … | URL |
| Nylon family (PA, PA-CF, PA12) | … | … | URL |
| Composites (CF/GF reinforced) | … | … | URL |

Material categories above are the rollup we use in 3dpa. If a finding only applies to one material (e.g. "PA is hygroscopic so hot+humid affects PA worst"), say so.

#### 2b. Recommended print-setting deltas

Compensation that the slicer profile should apply when the user selects this environment. Keep the field set to the existing schema's vocabulary — i.e. propose values for:

- `nozzle_adj` (°C delta vs material baseline)
- `bed_adj` (°C delta)
- `bed_first_layer_adj` (°C delta on first layer)
- `fan_multiplier`
- `first_layer_speed_multiplier`
- `preheat_minutes`
- `force_draft_shield` (bool)
- `humidity_warning` (bool)
- Plus: any **new capability** the current schema cannot express. If a candidate environment exposes a need for behavior that doesn't exist (e.g. supplemental cooling, opening the enclosure for PLA in hot rooms, dust filtration), propose it explicitly in a "provisional capability labels" sub-block per environment so Codex can adjudicate. Don't silently extend the schema or invent final field names.

For each delta value, include an **evidence grade** and source:

| Evidence grade | Meaning |
|---|---|
| `manufacturer` | Direct manufacturer or material-vendor guidance supports the value |
| `slicer-doc` | Slicer documentation supports the behavior / setting |
| `community-consensus` | Multiple credible community / expert sources converge, but no manufacturer number exists |
| `research-inference` | Derived from material behavior or academic / engineering evidence; useful but not ship-ready without Codex/owner review |
| `unsourced-no-auto-delta` | Effect may be real, but no sourced delta should be emitted; warning-only or defer |

Single-source values are acceptable when the grade is explicit. Prefer ranges over false precision when sources disagree.

#### 2c. Warning candidates

1–4 user-facing warning strings per environment, in the same plain-English style as the existing `warnings` array. Keep each warning to one sentence, action-oriented, no jargon.

### Task 3 — Recommend a bounded taxonomy

After Tasks 1 + 2, recommend the taxonomy 3dpa should actually ship. Bound: prefer 6–9 total environments (current 4 + 2–5 new) over 12–15. Justify the bound with reasoning: where the marginal environment stops adding distinct print-setting deltas, where two environments collapse into one with a single warning difference, etc.

Output: a recommended environment list with:
- Final proposed `id` + `name` + one-line description
- Whether it's **new** or **modify-existing** (for example, you might recommend `humid` becomes `humid_warm` to make room for a new `humid_cold`, or that `vcold` collapses into `cold` with stronger warnings)
- One-sentence rationale per inclusion

### Task 4 — Surface design tensions for the Codex packet

Things Claude needs to know before drafting the Codex review packet for Item 2 (Environment expansion). Examples:

- "Global deltas can't capture material-sensitivity differences in hot environments — propose per-material override schema or accept that hot envs use only warnings (no automatic deltas)."
- "RH and ambient temp are independent axes; the current taxonomy mixes them inconsistently (`humid` is humidity-only, `cold` is temperature-only). Decision: stay as-is, or move to a 2-D taxonomy?"
- "Altitude affects fan-cooling effectiveness measurably above ~2000m. Should we add an `altitude` field to the schema or keep it as a separate environment with deltas baked in?"

Three to seven such tensions, each one paragraph max. Don't propose final answers — surface the question crisply so Codex can challenge.

When proposing fields or concepts that do not exist today, use **provisional capability labels**, not final schema names. Example: write "capability: open enclosure for PLA in hot rooms" rather than deciding a final field such as `enclosure_door_open_recommended`. Codex handles final schema design.

---

## Required output format

Five blocks under `# Gemini Response`:

### Block 1 — Candidate environment catalogue (Task 1)

A markdown table with the columns from Task 1.

### Block 2 — Per-environment research (Task 2)

For each candidate from Block 1, a sub-section. Use full depth for candidates that plausibly belong in the shipped 6–9 option taxonomy; for edge / rejected candidates, keep the section short and mark it `lightweight` with only the decisive evidence and rejection reason.

```
### <candidate name>

#### Failure modes by material
(table from 2a)

#### Recommended deltas
(table using the current schema fields, evidence grade, source URL, and confidence; plus provisional capability labels for any behavior the current schema cannot express)

#### Warning candidates
- Warning string 1
- Warning string 2
- ...

#### Sources
- URL 1 — what it confirmed
- URL 2 — what it confirmed
```

### Block 3 — Recommended taxonomy (Task 3)

A short table:

| Final id | Name | New / modify-existing / keep | One-sentence rationale |
|---|---|---|---|

Plus a closing paragraph (~3–6 sentences) on the bound — why this number of environments is right, what the next environment to add would be if scope grew, and which environments you considered but rejected.

### Block 4 — Design tensions (Task 4)

Bulleted list, one tension per bullet, ≤4 sentences each.

### Block 5 — Anomalies / cross-cutting flags

Anything else surfaced during research worth knowing — e.g. "Bambu's published drying guide was updated 2026 and our `humid` warning text predates it" or "PA-CF has a much higher hygroscopic rate than PA — current schema's single `humidity_warning` flag may be too coarse to express this." Free-form, short.

Include an **Implementation impact flags** subsection:

- Does the recommendation require engine behavior beyond editing `data/rules/environment.json`?
- Does it rely on a current data-reference-only field becoming functional (`bed_first_layer_adj`, `force_draft_shield`, `humidity_warning`, or `ambient_temp_range`)?
- Does it require changing the hard-coded humid warning behavior keyed to `state.environment === "humid"`?
- Does the final taxonomy risk overcrowding the web/iOS environment picker, especially the iOS segmented control?
- Do existing tests or iOS comments that assume `normal` / `cold` / `vcold` / `humid` need follow-up?
- Does the wording introduce locale / translation risk for `en.json`, `da.json`, or iOS resources?

---

## Sources to consult (preference order)

**Tier 1 — primary, authoritative:**
1. **Material manufacturer drying / storage / printing guides** — Bambu, Polymaker, Prusament, Overture, eSun, Fillamentum. Often have humidity + temperature guidance per material.
2. **Slicer documentation** — Bambu Studio user guide, PrusaSlicer wiki, OrcaSlicer wiki. Look for "ambient", "enclosure", "draft shield", "fan" sections.
3. **Printer-manufacturer environmental specs** — Prusa, Bambu, Anycubic published "operating environment" sections in user manuals.
4. **Voron / Klipper community wikis** — these communities print in extreme conditions (active chamber heating, summer in Texas, winter in Canada) and document settings empirically.

**Tier 2 — cross-verification + nuance:**
5. **Established outlets** — All3DP, Print3D, 3D Printing Industry, Hackaday — for synthesis pieces that compare across materials.
6. **Academic papers** — material-properties research on FDM polymers under temperature/humidity stress. Use sparingly; flag as academic.

**Tier 3 — last resort:**
7. **Reddit r/3Dprinting + r/FixMyPrint, Klipper Discord, Reprap forums** — only for edge-case sanity checks. If you cite Tier 3 as the only source for a delta value, flag it explicitly.

**Avoid entirely:** AI-generated content farms (low-quality SEO sites that scrape AskHN/Reddit); Aliexpress listings; YouTube transcripts as primary source.

---

## Quality bar

- **No invented effects.** If you can't find a source for "ABS warps more in dry environments," don't include it.
- **Evidence-grade every delta.** A delta without an evidence grade is not actionable. Use `unsourced-no-auto-delta` when the effect may be real but should not become an automatic setting change.
- **Range over precision for deltas.** Better to write "nozzle_adj: +5 to +10°C (`community-consensus`)" than "nozzle_adj: 8" with false specificity.
- **Distinguish print-quality effects from health/safety effects.** "Sealed room with ABS" is a health concern (VOC); we may surface it as a warning but it doesn't translate to print-setting deltas.
- **Avoid Eurocentric / Northern-European bias.** The current taxonomy has it; this audit is correcting it. Cite sources from authors writing about hot-climate printing (Singapore, Australia, Brazil, Texas) where possible.
- **Concise output.** Skim-friendly tables and bullets beat narrative. Claude reads this back into a token-limited context.
- **Source-mark every numeric delta.** A delta without a source is a guess, and we don't ship guesses. If no source exists, use `unsourced-no-auto-delta` and recommend warning-only or defer.

---

## What kind of feedback I want

- **Comprehensive Task 1, judicious Task 3.** Don't pre-filter the catalogue; do filter the recommended taxonomy.
- **Honest uncertainty.** "I couldn't find consensus deltas for high-altitude printing" is a useful answer.
- **Structural critique welcome.** If during research you conclude "the current schema is the wrong abstraction; environments should be a 2-D temperature × humidity matrix instead," say so in Block 4 (design tensions). That's exactly the kind of input the Codex packet needs. Keep this at the capability / tension level, not final field names or migration steps.
- **Surface tangentials.** If during research you notice that an existing material's drying spec in `data/materials.json` is stale (e.g. our PA drying time is 4h at 80°C but the manufacturer now says 6h at 90°C), flag in Block 5. We'll triage separately.

---

## What this is NOT

- **Not a schema-design exercise.** Don't propose final field names, default values, or migration paths. Codex's review packet handles design. Provisional capability labels are OK when a real-world effect cannot fit the current schema.
- **Not an i18n / locale exercise.** Don't write Danish (`da.json`) translations. Locale work happens after Codex resolution.
- **Not a UI exercise.** Don't propose how the picker should look. Do flag UI/UX risks caused by taxonomy size, option wording, or mobile segmented-control density.
- **Not a deep-dive on individual materials' physics.** Cover the print-relevant deltas at the category level.

---

## Time pressure

Soft target: research turnaround ≈ 1 owner-driven Gemini session. This research feeds into the Codex packet for Item 2 of the v1.0.3 batch. There's no hard external deadline; quality > speed. v1.0.3 ships when ready.

---

## Reversibility

Adding environments is **moderately reversible.** Each new env id becomes a stable identifier referenced from multiple places (web UI, iOS Codable, locales en+da, possibly persisted in user-state localStorage on web). Removing an env later means coordinated cleanup across all those surfaces. Modifying delta values for an existing env is fully reversible (one JSON edit + cp + commit).

This is why the taxonomy bound matters — picking the right 6–9 environments now saves a "we shipped 14 envs and 4 are dead weight" cleanup later.

---

[Final paragraph for Gemini: Catalogue every environmental challenge that meaningfully affects FDM hobbyist printing. Research per-environment failure modes by material category, recommended setting deltas with sources, and warning candidates. Recommend a bounded taxonomy (6–9 environments) with rationale. Surface design tensions for the Codex review packet. Cite every source. Flag every uncertainty. Do not invent effects, do not propose final schema, do not write locale strings.]

**Append your response in the `# Gemini Response` section below.** Don't reply in chat — write directly into this file so the research is self-contained.

---

# Gemini Response

*(Gemini appends here)*

## Block 1 — Candidate environment catalogue

## Block 2 — Per-environment research

## Block 3 — Recommended taxonomy

## Block 4 — Design tensions for the Codex packet

## Block 5 — Anomalies / cross-cutting flags

---

# Resolution

*(Claude appends here after Gemini's response is in. Per-finding accept / modify / decline with rationale, then a "Net delta" table summarising what feeds into the Codex review packet for Item 2 and what's deferred or rejected.)*
