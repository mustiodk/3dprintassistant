# Configuration impact QA handover — parallel Claude + Codex review

> **How this file works.** This is a shared procedural spec read by **both** Claude and Codex before each runs an independent QA pass. Each agent produces its own findings report at the path specified in **§ Deliverable**. The owner then diffs the two reports, collapses duplicates, and adjudicates disagreements. Do **not** modify this handover during the pass — propose edits in your final report's "Open questions" section instead.
>
> **Read-only constraint (MANDATORY).** During this QA pass, neither agent may modify project source files (`engine.js`, `data/**`, `app.js`, `locales/**`, iOS sources, scripts, walkthroughs, tests, runbooks, ROADMAP, specs, session logs, NEXT-SESSION). The only allowed write surface is **your own deliverable file** (path provided in your opening line). Findings that imply a code/data change are described in your report; the owner triages and the next session implements. The research/implementation boundary is intentional.
>
> **Peer-agent independence (MANDATORY).** This pass is run by two agents (Claude and Codex) sequentially. Each must produce findings *independently* — that is the entire point of running two passes. You MUST NOT read, list, grep for, or otherwise discover the peer agent's deliverable file, working notes, scratch scripts, or any artifact tagged with their name. Treat sibling files in your deliverable's parent directory as off-limits unless your opening line explicitly names them. Treat `git log` / `git status` entries that reference a peer pass as off-limits — do not open the diffs. The owner runs the comparison; bias from peer-reading defeats the purpose. If you accidentally surface peer content (e.g. a grep result includes it), stop, surface that to the owner, and do not incorporate it into your reasoning.
>
> **Project context (read first).** [`docs/3dpa-context.md`](../3dpa-context.md) — what 3dpa is, the engine architecture, the data model, the standing rules, and the AI Operating Model. The handover below assumes you've read it end-to-end.

---

## Why this pass exists

On 2026-05-11 the owner reported two correctness bugs surfaced by hands-on use:

1. Web Advanced filament temps weren't showing per-layer rows when initial == other (web parity gap with the iOS 2026-05-10 fix `3a59cd1`). **Already fixed in web `809549d` before this pass started.**
2. Environment options (`cold`, `vcold`, `humid`, `normal`) appeared to barely move the recommended nozzle / bed temperatures, contradicting community guidance that calls for +10°C nozzle and +5–10°C bed for engineering filaments in cold-garage conditions.

Investigation of bug #2 surfaced a *systemic* concern, not a one-off:

- **Dead data field:** `environment_options[].bed_first_layer_adj` is defined in `data/rules/environment.json` but never read by `engine.js`. Cold's intended +7°C first-layer bed bump never reaches output.
- **Magnitude conservatism:** `cold` env applies a flat +5°C nozzle / 0°C bed across all materials — community sources recommend +10/+5 (or more) for ABS/ASA/PETG/PC, and only ~+5/0 for PLA.
- **Material-blind handling:** the env adjustment is a single scalar applied to every material, even though community guidance is material-group-specific.

The owner's question to both agents: **what other configuration options have the same shape of bug?** Dead data fields, magnitudes that drift from community consensus, blind handling where it shouldn't be blind, silent interactions between options that produce wrong recommendations.

This pass is a **structured sweep** across all configuration options to surface the next batch of correctness fixes before a v1.0.4 ships.

---

## Goal

Each agent independently produces a findings report covering every configuration option in 3dpa, ranked by severity, with concrete reproduction paths. The two reports are then diffed by the owner.

**Success criterion:** the union of the two reports captures every real correctness gap in the engine + data layer that a thorough single-person QA pass could find. Disagreements (one agent flags HIGH, the other LOW) are explicit and adjudicable.

---

## Scope

### In scope — every value of every configuration option must be sampled

Configuration options (from canonical app-state shape in [`docs/3dpa-context.md`](../3dpa-context.md)):

| Option | Data source | Values to sample |
|---|---|---|
| `printer` | `data/printers.json` | At least one printer per brand × per enclosure-type (open / enclosed / active-heated). H2D/H2D Pro/X1E/A1/A1 Mini/P2S/P1S/Ender-3 V3/Kobra X/Centauri Carbon/MK4S/Core One at minimum. |
| `material` | `data/materials.json` | All 18 materials (do not skip). PLA family / PETG / ABS / ASA / TPU 85A+95A / PA / PA-CF / PC / PVA / HIPS / PLA Metal / etc. |
| `nozzle` | `data/nozzles.json` | std_0.4, hardened_0.4, hardened_0.6, prc_0.2, std_0.6, std_0.8 minimum. |
| `useCase` | enum (functional / cosmetic / mechanical / fast / draft / etc.) | Each value at least once. |
| `surface` | enum (standard / smooth / fine) | Each value. |
| `strength` | enum (light / standard / strong) | Each value. |
| `speed` | enum (silent / balanced / fast) | Each value. |
| `environment` | `data/rules/environment.json` | normal / cold / vcold / humid (already known-bad — see § Known starting facts; **do not re-derive** the bug-2 findings, but DO check whether the same shape appears in unrelated env interactions). |
| `support` | enum (none / light / standard / aggressive / etc.) | Each value. |
| `colors` | enum (single / multi / ams) | Each value. |
| `userLevel` | enum (beginner / intermediate / advanced) | Each value (especially: does it actually change *anything*? Quick spot check). |
| `special` | multi-select array | Each individual flag at least once. |
| `profileMode` | enum (safe / tuned) | Both values; verify Safe baseline byte-equality invariant from DQ-2 still holds. |

Rule files also in scope:
- `data/rules/objective_profiles.json`
- `data/rules/slicer_capabilities.json`
- `data/rules/troubleshooter.json` (only for: are the symptoms it references still emitted by `getWarnings`?)

### Out of scope (do not waste budget here)

- Slicer-tab routing (audited under IMPL-039 — assumed correct unless a regression is observed during sampling).
- IMPL-040 chip-desc / resolveProfile parity (audited; tests cover it).
- Phase DQ-3 / DQ-4 / DQ-5 features (PA/LA per material, retraction deltas, cooling curves) — these are *additive new features* tracked in ROADMAP, not "is the existing thing wrong" questions. Do **not** propose adding DQ-3+ scope here; flag if you find evidence the existing partial coverage is *wrong*, but the deferred-feature decision is owner-locked.
- Cosmetic copy / wording / locale work (separate hygiene pass).
- iOS-specific UI bugs. Web is the canonical engine surface; iOS issues live in the iOS repo. **However:** any engine.js bug found here is automatically an iOS bug too once the file is synced — note that explicitly in the finding.
- Backward-compatibility, archive cleanup, doc drift — out of scope.

---

## Methodology — same for both agents, in this order

### Phase 0 — pre-flight

1. Read `docs/3dpa-context.md` end-to-end.
2. Read this handover end-to-end.
3. Confirm baseline tooling runs clean against current `main`:
   ```
   node scripts/validate-data.js
   node scripts/walkthrough-harness.js
   node scripts/profile-matrix-audit.js
   ```
   Capture the version-of-record git SHA at start (`git rev-parse HEAD`) — it goes in your report header. If any baseline is red on a clean main, **stop and surface in your report** rather than working around it.
4. State your deliverable path in your first sentence (see § Deliverable).

### Phase 1 — data-file consumption audit (per option)

For each configuration option in § Scope, list every leaf field in the option's data file (or the enum values if it isn't data-backed). For each field, run:

```
git grep -n "<field_name>" engine.js
git grep -n "<field_name>" app.js   # only to confirm UI-side consumption when relevant
```

Mark each field as one of:
- **CONSUMED** — at least one engine.js path reads it and uses it in an emitted output.
- **DEAD** — defined in data, not read anywhere in engine.js (or read but discarded). **DEAD = HIGH severity by default** unless the field is an obvious documentation/metadata-only key (e.g. `name`, `desc`, `id`).
- **PARTIAL** — read but only on a subset of expected paths (e.g. consumed by `getAdjustedTemps` but not by `getAdvancedFilamentSettings`, or vice versa). PARTIAL = HIGH if it causes silent inconsistency between simple/advanced/export paths; MEDIUM otherwise.

Report each field's status in a table per option. If the option is enum-based (no data file), enumerate the engine.js code paths that branch on it — flag any value that has zero handlers as DEAD.

### Phase 2 — per-option output behaviour sample

For each option × each representative value, take a representative state and inspect the engine outputs:

```js
// Pattern (run via node -e or a scratch script — do not commit the script):
const eng = require('./engine.js');
await eng.init();   // exact init wiring lives in walkthrough-harness.js — copy that polyfill scaffold
const state = { /* pin all other fields, vary only the option under test */ };
const profile  = eng.resolveProfile(state);
const adj      = eng.getAdjustedTemps(state.material, state.environment, state.nozzle, state.speed, state.printer);
const adv      = eng.getAdvancedFilamentSettings(state);
const warnings = eng.getWarnings(state);
const checks   = eng.getChecklist(state);
```

For each option, fix all other fields to a sane baseline (recommend: A1 + PLA Basic + std_0.4 + functional + standard surface + standard strength + balanced speed + normal env + none support + single colors + intermediate userLevel + [] special + safe profileMode) and vary **only the option under test** through every value.

Record a **one-line delta** per value: what changed in the output vs the baseline value. If the answer is "nothing meaningfully changed and you'd expect it to" → finding.

If the option doesn't make sense to test at the suggested baseline (e.g. `colors: multi` requires AMS-capable printer), pick a sensible alternative baseline and note it in the finding.

### Phase 3 — magnitude reality check (only where Phase 2 surfaced a suspicious value)

For each suspicious value in Phase 2, cross-reference:

**Tier-1 sources** (cite when used):
- Bambu Studio bundled presets (read from your local Bambu Studio installation if you have one, or via the Bambu wiki / GitHub `Bambu-Studio` repo presets).
- PrusaSlicer bundled presets (same — Prusa GitHub `PrusaSlicer` repo `resources/profiles/`).
- OrcaSlicer bundled presets.

**Tier-2 sources** (cite when used):
- Material vendor technical data sheets (Polymaker, Prusament, Overture, eSun, Bambu filament product pages).

**Tier-3 sources** (cite when used, treat as supporting not authoritative):
- Community wikis, well-trafficked forum posts, established YouTube reference videos. Cite the source URL, not "the community says."

**Bar:** if 3dpa's emitted value differs from the median tier-1 source value by more than the magnitudes below, file a finding:
- Nozzle temperature: ±10°C
- Bed temperature: ±5°C
- Outer wall speed: ±20%
- Layer height (default): any difference (expected to match exactly)
- Retraction distance: ±0.3 mm
- Retraction speed: ±10 mm/s
- Cooling fan: ±10 percentage points
- Pressure advance: ±20% (where data exists)

If you can't find a tier-1 source for a value, say so in the finding (`Sources: tier-1 not located; tier-2 [Polymaker PETG TDS] = 235°C; emitted = 220°C`). Don't invent numbers.

**Do NOT propose specific replacement values in your report.** The QA pass identifies *that* a value is wrong; the *what to replace it with* requires sourced research and is decided in the implementation session that follows. Findings should say "value X looks wrong vs source Y", not "change to Z".

### Phase 4 — cross-option interaction sanity

For each pair of options that plausibly interact, sample 2-3 combinations and verify the output makes physical sense:

- printer × material (e.g. open-frame + PC → should warn or downgrade)
- printer × nozzle (e.g. non-hardened + abrasive material → warning expected)
- material × environment (e.g. PETG + cold → bed bump bigger than PLA + cold)
- material × speed (e.g. TPU + fast → speed should clamp down)
- nozzle × material (e.g. 0.2 nozzle + PA-CF → should warn, possibly disable)
- environment × support (e.g. cold + tree support quality drops?)
- profileMode safe vs tuned × every other option (does Tuned actually differentiate where it should? Does Safe regress vs absent profileMode? — DQ-2 invariant)
- special flags × everything (each flag should produce a visible delta or be flagged as dead)

Report each combo as a one-line entry: `combo → expected behaviour → observed behaviour → match?`. File a finding for each mismatch.

### Phase 5 — synthesis

Roll all findings up into the report at your deliverable path. Apply severity tiers (§ Severity). Order within each severity tier by impact-to-fix-ratio (highest first).

---

## Tooling

All commands run from `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/` against the SHA captured in Phase 0.

| Command | Purpose |
|---|---|
| `node scripts/validate-data.js` | Schema sanity baseline. Must be green at start. |
| `node scripts/walkthrough-harness.js` | Engine regression baseline. Must be green at start. |
| `node scripts/profile-matrix-audit.js` | Curated 55-case + broad-sweep audit. Must be green at start. Re-read source to know what it covers — do not duplicate its checks. |
| `git grep -n "<field>" engine.js` | Consumption check for Phase 1. |
| `node -e "..." ` (scratch) | Phase 2 / 4 sampling. Do **not** commit ad-hoc scratch scripts; copy in-place into your report as a reproducible fenced block. |
| `git log --oneline -- <path>` | Provenance of suspicious values (when did this number land, was it justified at the time?). |

You may read iOS XCTest assertions in `3dprintassistant-ios/3DPrintAssistantTests/EngineServiceTests.swift` as a *secondary* signal of what the engine is supposed to emit. Disagreements between iOS XCTests and your sampled output are themselves findings (a test asserting a wrong value is also a bug).

---

## Severity tiers

Pick exactly one tier per finding.

- **CRITICAL** — emits a value that risks printer or material damage (no clamp where one is required, wildly wrong temp/speed for a known-fragile combo). Or: a configuration option is silently ignored where ignoring it produces a damaging recommendation.
- **HIGH** — dead data field (DEAD per Phase 1). Large magnitude gap vs tier-1 source on engineering filaments. Logic ignores the option entirely. Silent inconsistency between simple/advanced/export paths.
- **MEDIUM** — material- or printer-blind handling where variance across materials/printers is meaningful (>20% spread between best and worst case). Magnitude conservative but not damaging. Cross-option interaction produces wrong recommendation but not damaging.
- **LOW** — minor polish, edge case, niche material/printer combo. Conservative magnitude on a non-critical parameter.
- **OBSERVATION** — not a bug; noted because owner should know (e.g. an option only ever changes one downstream value where you'd reasonably expect it to change three; an apparent gap that is actually deliberate per `docs/3dpa-context.md`).

If you can't decide between two adjacent tiers, pick the lower one and explain in the finding why it's borderline.

---

## Finding format (use exactly this)

```markdown
### [SEVERITY-NN] One-line title

- **Surface:** which file(s), and the engine path or option in question.
- **What's wrong (one paragraph):** plain-English description, no jargon.
- **Evidence:** `path:line` references + one reproducible code block (the exact `node -e` you ran, the exact `git grep` output, the exact emitted value vs the source value).
- **Suggested fix shape (1–3 sentences):** describe the *shape* of the fix, not specific values. E.g. "make the env adjustment material-group-aware via a `by_group` map keyed off `material.group`," not "set PETG cold to +10°C."
- **Sources (if magnitude finding):** tier-1 / tier-2 / tier-3 with URLs or filepaths.
- **Risk if not fixed:** one sentence — what does the user actually experience?
- **Touches iOS?:** yes / no — if engine.js or data/**/*.json change is implied, then yes.
```

Number findings within each severity tier (`CRITICAL-01`, `CRITICAL-02`, `HIGH-01`, …). Do not renumber across the two reports — collisions are expected and the owner will collapse during the diff.

---

## Comparison protocol (owner-run, after both reports land)

1. Owner runs `diff` between the two reports, then a manual triage.
2. Findings the two agents agree on → straight into a v1.0.4 follow-up batch.
3. Findings unique to one agent → owner spot-check; either accept or note "checked, false positive".
4. Disagreements (different severity for the same finding) → owner adjudicates; document the call in the merged finding.
5. Merged report lands at `docs/reviews/2026-05-11-config-impact-qa/merged.md` (date in directory; merged file at the same level as the two pass files).
6. Each accepted finding becomes a one-finding-one-commit entry in the next implementation session.

**Sequencing note (owner-set 2026-05-11):** Claude runs first, then Codex. Codex must not read Claude's deliverable; the independence constraint at the top of this handover is the binding rule. Claude does not read Codex's deliverable until the merge step is owner-triggered.

---

## Standing rules (from `Projects/CLAUDE.md` and `docs/3dpa-context.md`)

- Don't guess behaviour; read the actual file. Every claim in your report must be backed by a `path:line` or a reproducible code block.
- Web is master; iOS mirrors. Engine bugs are platform-cross by definition.
- Read-only during this pass (see top-of-file constraint).
- One finding = one commit per platform when fixing (don't bundle in your report's "fix shape").
- The walkthrough harness + iOS XCTest are the regression bar for the implementation session; cite them where relevant.

---

## Known starting facts (do not re-derive — cite if relevant)

These were already established before this pass started; they bound the scope:

1. **`environment_options[].bed_first_layer_adj` is DEAD.** Defined in `data/rules/environment.json:11` (and analogous lines for `cold` / `vcold`); zero hits in `git grep "bed_first_layer_adj" engine.js`. Cold env's intended +7°C first-layer bed bump never reaches output. **Severity already triaged: HIGH.** You do not need to file this; you may reference it as an example of the bug shape this pass is hunting.
2. **Cold env `nozzle_adj=+5` is conservative vs community guidance** for engineering filaments (PETG/ABS/ASA/PC). PLA's +5 is roughly correct. Confirms material-blind handling is a real concern. **Severity already triaged: MEDIUM** (would be HIGH if it caused damage; conservative recommendations are safe but unhelpful).
3. **Web Advanced filament temps were missing per-layer rows when initial == other.** Fixed in web `809549d` on 2026-05-11. iOS was fixed earlier in `3a59cd1` (2026-05-10). You do not need to verify this; it is cited so you don't re-flag it.
4. **`nozzle_adj`, `bed_adj`, `preheat_minutes`, `first_layer_speed_multiplier` ARE consumed by engine.js.** `fan_multiplier`, `force_draft_shield`, `bed_first_layer_adj` are NOT (last two confirmed dead; `fan_multiplier` worth re-checking — might be partial-consumed).
5. **DQ-2 Safe baseline byte-equality invariant** is enforced by walkthrough-harness.js DQ-2 assertion block + iOS `testSafeBaselineByteEqualToDefault`. Any finding that would break this invariant must explicitly call it out.

---

## Deliverable

**Each agent writes ONE markdown file. Do not write multiple files. Do not commit. Your exact deliverable path is given in your opening line — do not write anywhere else, do not infer or search for the peer agent's path.**

Both agents' deliverables land under `docs/reviews/2026-05-11-config-impact-qa/` (one file per agent, named per the opening line). The peer agent's file is off-limits per the independence constraint at the top of this handover. Treat the existence and contents of the peer file as unknown.

### Required report header

```markdown
# Configuration impact QA — {agent name}

- **Pass run on:** YYYY-MM-DD
- **Web SHA at start:** {git rev-parse HEAD output}
- **iOS SHA at start (read-only reference):** {git rev-parse HEAD in 3dprintassistant-ios}
- **Baseline tooling status:** validate-data {green/red}, walkthrough {green/red}, profile-matrix-audit {green/red}
- **Time spent (rough):** {hours}
- **Coverage achieved:** {options fully sampled / partially sampled / skipped — explain skips}
- **Methodology deviations from handover:** {list, or "none"}
```

### Required report sections

1. Header (above)
2. Executive summary (≤10 lines): top-3 highest-impact findings, in plain English.
3. Findings by severity (CRITICAL → OBSERVATION) using the § Finding format.
4. Phase 1 consumption tables (one per configuration option).
5. Phase 4 interaction matrix (table of pair-checks done + result).
6. Open questions for the owner (anything you want clarified before the implementation session picks this up).
7. Methodology actually followed (vs the handover spec) — explicit list of what you did and didn't do.

---

## Pre-flight self-check (state in your first response before starting)

Confirm in one bullet each:
- ☐ Read `docs/3dpa-context.md` end-to-end.
- ☐ Read this handover end-to-end.
- ☐ Captured baseline tool runs (paste output of validate-data + walkthrough + profile-matrix-audit summaries).
- ☐ Captured starting SHAs for both repos.
- ☐ Committed to deliverable path (the one given in the opening line — verify it matches the path you will write to).
- ☐ Acknowledged read-only constraint — will not touch source files.
- ☐ Acknowledged peer-agent independence — will not list, grep, or open the peer's deliverable or sibling files in the same directory.

If any baseline is red on clean main, stop and surface that before doing anything else.
