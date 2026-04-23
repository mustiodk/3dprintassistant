# IMPL-041 — Data Quality & Pro-Relevance (Phase DQ)

**Status:** draft — pending owner sign-off on spec.
**Owner:** Musti.
**Created:** 2026-04-23.
**Scope:** multi-sub-phase. Supersedes ad-hoc data work. Target 3–5 Cowork sessions across the phase.

---

## Goal

Move 3D Print Assistant from "beginner-friendly profile generator" to "pro-credible tuning reference" without losing the approachability that beginners need.

Three levers drive credibility with pros:
1. **Traceability** — every number has a source they can audit.
2. **Tier separation** — a "Safe" profile (vendor-published, published-spec conservative) and a "Tuned" profile (community-validated aggressive) live side-by-side.
3. **Pro-tier fields** — Pressure/Linear Advance, material-specific retraction, and structured cooling curves land in the output.

## Principles (binding across the phase)

- **Web is master; iOS mirrors byte-identical.** No exceptions.
- **Engine single-source-of-truth (IMPL-040 rule) extends to this phase.** Any numeric field exposed in UI *and* in emitted profile must be computed by the same engine function.
- **Zero surprise for existing users.** Default behavior after DQ-2 lands must equal behavior before. Tuned is opt-in.
- **Scrape once, trust nothing, tag everything.** Scraper output is raw data, not truth. Every derived value is human-reviewed and gets a provenance tag.
- **One finding = one commit per platform.** Same IDs across web + iOS commits.
- **Walkthrough harness is the guard.** Extend before data lands, not after.

---

## DQ-1 — Provenance infrastructure

**Problem.** Today `resolveProfile` emits numbers with no way to say "this came from Bambu's vendor preset" vs "this is our heuristic clamp." Pros distrust black boxes; beginners would benefit from "this is conservative/vendor-published" reassurance.

**Design (revised 2026-04-23 after scouting `engine.js`).**

Original spec proposed a separate `_tag(value, source, ref)` helper + splitting `resolveProfile`'s return shape to `{params, provenance}`. **Dropped** in favor of extending existing `S`/`A` helpers, because:

- `engine.js:35–36` already defines `S(value, why)` / `A(value, why)` wrapping every emission as `{value, why, mode}`. That plumbing is perfect for one more optional field.
- No return-shape split means zero breakage at the 4 internal `resolveProfile` call sites (export, format, tabs, chip-desc) + iOS `_ProfileParamWire` Codable.
- Provenance sits inline on each emitted param, which is also what the UI wants to render.

**Revised shape:**

```js
// before
const S = (value, why = '') => ({ value, why, mode: 'simple' });
const A = (value, why = '') => ({ value, why, mode: 'advanced' });

// after
const S = (value, why = '', prov = null) => ({ value, why, mode: 'simple', prov });
const A = (value, why = '', prov = null) => ({ value, why, mode: 'advanced', prov });
```

Where `prov` is `null` (qualitative / string-only field, no provenance expected) or an object:

```js
{
  source: 'vendor' | 'rule' | 'default' | 'calculated',
  ref?:   string   // free-form pointer (e.g. 'bambu-wiki-a1', 'rule:_clampNum', 'objective_profiles.json#draft')
}
```

**Source taxonomy:**

- `vendor` — pulled from vendor spec / TDS / wiki (scraper-sourced in DQ-3/4/5).
- `rule` — derived via engine rule (e.g. `patternFor`, slicer-mapped substitution).
- `default` — generic curated default from `data/*.json` where no better attribution exists yet.
- `calculated` — computed from other values (nozzle-scaled retraction, clamped layer height).

**Pragmatic baseline (DQ-1 scope reduction).**

Researching real provenance for every field is DQ-3/4/5 work, not DQ-1. For DQ-1 we land:

- The infra (extended `S`/`A`).
- A **baseline tag on every numeric emission** — `default` or `rule` or `calculated` + a ref pointing at the code/data origin *as it exists today*.
- DQ-3/4/5 later upgrade individual fields to `source: 'vendor'` with real refs as scraper data lands.

This means DQ-1 is one-session scope, not two-weeks-of-research scope. Invariant still holds: zero numeric emissions without provenance.

**UI surface.**

- Small muted indicator per field, reveal-on-demand in **Advanced view**. Beginners never see it unless they opt in.
- No indicator in beginner/Simple view.
- Badge renders from `p.<field>.prov` directly — no separate lookup needed.

**Sub-phase acceptance.**

- `walkthrough-harness.js` asserts **100%** of emitted numeric (or numeric-derived formatted) params in `resolveProfile` carry a non-null `prov` (fails hard on untagged). String-only qualitative fields (pattern names, generator type) are exempt.
- `EngineServiceTests.swift` has matching parity test.
- Advanced view on web + iOS renders provenance badge on hover / long-press for every numeric field.
- No visible change in Simple view.
- Zero behavior change for existing consumers (4 internal `resolveProfile` callers + iOS decode path).

**Files touched (revised).**

- `engine.js` — `S`/`A` extended with optional `prov` arg; 38 numeric emission sites gain baseline prov tags.
- `app.js` + `index.html` — Advanced view renders provenance badge from inline `p.<field>.prov`.
- iOS `Models` — optional `prov: ProvenanceWire?` on existing param model.
- iOS `EngineService.swift` — decode path already shape-tolerant; adds `prov` field to Codable wire.
- iOS `PrintProfileTabView.swift` — render provenance badge when Advanced view is on.
- `scripts/walkthrough-harness.js` — new invariant assertion.
- iOS `EngineServiceTests.swift` — new parity test.

**Commit sequence for DQ-1 (5 commits):**

1. Extend `S`/`A` with optional `prov` arg (plumbing only — zero emission-site changes; prov=null everywhere). Byte-identical iOS sync.
2. Extend `walkthrough-harness.js` with provenance invariant (will fail initially — expected; invariant arrives before the data that satisfies it, per phase principle).
3. Fill baseline `prov` on all 38 numeric emissions in `resolveProfile`. Invariant now green.
4. Web Advanced-view provenance badge.
5. iOS: decode `prov` in `EngineService`, render in `PrintProfileTabView`, new XCTest.

---

## DQ-2 — Safe vs Tuned objective

**Problem.** Single-output model forces a trade-off. Conservative defaults frustrate pros; aggressive defaults risk failed prints for beginners.

**Design.**

- New state field `profileMode: "safe" | "tuned"` (default `"safe"`).
- `objective_profiles.json` + relevant rule files carry both tiers where they differ. Where a tier doesn't differ, one value serves both.
- Engine accepts `profileMode` in state; resolves to the correct tier during emission.
- UI: toggle on Goals step.
  - Label: "Profile Mode"
  - Options: "Safe (published spec)" / "Tuned (community-validated)"
  - Short help text explaining the difference, one line.
- Migration: existing user state reads `profileMode` missing → treat as `"safe"`. No migration required for localStorage.
- Applies to surface, speed, strength, and eventually cooling.

**Sub-phase acceptance.**

- Toggle live on both platforms.
- With `profileMode` unset or `"safe"`: every emitted param byte-equal to pre-DQ-2 emission. (Regression test via walkthrough harness — existing combos must not change values.)
- With `profileMode: "tuned"`: emits differentiated numbers where data exists; falls back to safe where not.
- Provenance tags (from DQ-1) reflect which tier the value came from.
- Feature flag not needed — toggle IS the flag.

**Key decisions locked.**

- Default `"safe"` for existing users (zero-surprise).
- No auto-detect of pro / beginner (too magic, rejected).
- No separate "print it both ways and show delta" UX (out of scope — revisit later).

---

## DQ-3 — Pressure / Linear Advance per material

**Problem.** PA/LA is the single highest-demand tuning number for pros. 3dpa currently emits nothing.

**Design.**

- Extend `materials.json`:
  ```
  pressure_advance: {
    "bambu_a1": { "0.2": 0.020, "0.4": 0.035, "0.6": 0.040, "0.8": 0.045 },
    "bambu_x1c": { ... },
    "prusa_mk4": { ... },
    "_default": { "0.2": 0.020, "0.4": 0.035, ... }
  }
  ```
- Engine emits:
  - Bambu/Orca: `pressure_advance` param.
  - Prusa: `linear_advance_factor` param.
- Lookup order: exact printer-id match → printer-series match → `_default`.
- Every emitted PA/LA value provenance-tagged per DQ-1.
- Safe tier: vendor-published where available. Tuned tier: community consensus.

**Scraper-assisted data collection.**

- Scraper (DQ-phase-level, shared across DQ-3/4/5) targets sources listed in "Scraper strategy" below.
- Output: `docs/research/scraped/YYYY-MM-DD-{source}/*.json` (committed for reproducibility).
- Gemini pass cross-references sources, proposes per-material values with confidence (`high` / `medium` / `low`).
- Claude Code lands values into `materials.json` one-material-per-commit; only `high` confidence values land, `medium` gets filed as owner-review-needed, `low` dropped.

**Sub-phase acceptance.**

- PA/LA populated for **top 10 materials × 4 mainstream printer series minimum** (Bambu A1/P1/X1, Prusa MK4).
- `_default` fallback for all 18 materials.
- Walkthrough harness includes 3+ combos asserting PA/LA presence + reasonable range (0.01 < PA < 0.10 sanity).
- Bambu Studio export round-trip test still passes (new field doesn't break JSON import).

---

## DQ-4 — Retraction deltas per material

**Problem.** Current retraction model is nozzle-scaled + bowden-adjusted, material-agnostic. In reality TPU ≪ PLA ≪ PETG, and ASA/ABS differ from PLA.

**Design.**

- Add optional `retraction` override per material in `materials.json`:
  ```
  retraction: {
    "distance_multiplier": 0.8,   // vs default nozzle-scaled
    "speed_mm_s": 40,              // absolute override, optional
    "_provenance": "vendor"
  }
  ```
- New engine rule `_resolveRetraction(printer, nozzle, material)`:
  1. Compute base (current nozzle-scaled + bowden logic).
  2. Apply material distance_multiplier if present.
  3. Clamp to `material.retraction_max`.
- Safe vs Tuned: Tuned applies the override; Safe keeps current printer-only model.

**Sub-phase acceptance.**

- Overrides populated for materials where data supports it (TPU 85A/90A, PETG, ASA, PC, PA, PLA-CF at minimum).
- New XCTest asserts retraction for PETG > PLA on same printer/nozzle.
- Provenance tag per DQ-1.

---

## DQ-5 — Cooling curves

**Problem.** Fan% is emitted as a single number today. Real cooling depends on layer time, overhang, and material.

**Design.**

- Extend material data with structured `cooling` block:
  ```
  cooling: {
    fan_min_speed: 30,
    fan_max_speed: 100,
    slow_down_layer_time: 8,        // seconds
    overhang_fan_threshold: 60,     // degrees
    overhang_fan_speed: 100,
    close_fan_first_n_layers: 1
  }
  ```
- Engine emits into correct slicer-specific fields (mapped via `SLICER_PARAM_LABELS`).
- UI: new "Cooling" section in PrintProfile tab output on both platforms.

**Sub-phase acceptance.**

- Cooling block live for all 18 materials.
- Cooling section renders on web + iOS.
- At least 4 materials (PLA, PETG, ASA, TPU) have per-tier Safe vs Tuned cooling differences.

---

## Scraper strategy

**Do not use Claude Code to scrape.** Wrong tool — HTML reading burns tokens with poor yield.

**Pattern:**

1. **Write** `scripts/scrape/` Node.js scraper (one-time, Claude Code authors it).
2. **Run locally** on owner's machine. Zero ongoing token cost.
3. **Output** to `docs/research/scraped/YYYY-MM-DD-{source}/` — raw JSON, one file per URL, committed.
4. **Analyze** via Gemini (free 2M context) — cross-references sources, flags conflicts, proposes values with confidence tiers.
5. **Apply** via Claude Code — one material per commit into `materials.json`.

**Sources (my picks — balanced coverage):**

| # | Source | What we get |
|---|---|---|
| 1 | Bambu Lab Wiki (`wiki.bambulab.com`) | Printer specs, Bambu filament TDS, A1/P1/X1 PA values |
| 2 | Prusa Knowledge Base (`help.prusa3d.com`) | Prusa printer specs, Linear Advance values, Prusament TDS |
| 3 | Polymaker (`polymaker.com`) | Polymaker PA-CF, PC, PETG Pro, ASA TDS PDFs |
| 4 | Prusament (`prusament.com`) | High-quality reference filament TDS |
| 5 | Overture (`overture3d.com`) | Mainstream-budget TDS |
| 6 | eSun (`esun3d.com`) | Budget-tier TDS, completes spread |

**Anti-goals:**

- Don't scrape forums / Reddit / Discord (low signal, high maintenance).
- Don't scrape competitors' profile generators.
- Don't build a live-updating scraper — this is a one-shot research pass; we re-run manually if sources change materially.

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Vendor pages reformat, breaking scraper | Scraper is throwaway; re-run + re-apply is cheap if needed. Data lives in our `materials.json` not re-fetched. |
| Bad PA value causes failed prints for users | Every value provenance-tagged. Safe tier always conservative. Tuned is opt-in + shows provenance on inspection. |
| Safe vs Tuned toggle confuses beginners | Default `safe`; toggle lives in Advanced-view-adjacent area; one-line help text. |
| Bambu Studio rejects exported JSON with new fields | Export path still disabled (IR-deferred). When re-enabled, round-trip test in DQ-3 covers this. |
| Provenance UI clutters Advanced view | Muted icon, reveal-on-hover/tap only — zero inline visual weight when not inspected. |

---

## Acceptance (phase close)

Phase DQ is closed when:

- [ ] DQ-1: 100% of emitted numeric params carry provenance; walkthrough + XCTest assert this.
- [ ] DQ-2: Safe/Tuned toggle live on both platforms; `safe` default; existing behavior unchanged.
- [ ] DQ-3: PA/LA live for top 10 materials × 4 printer series minimum; `_default` covers all 18 materials.
- [ ] DQ-4: Per-material retraction overrides live for TPU, PETG, ASA, PC, PA, PLA-CF minimum.
- [ ] DQ-5: Cooling block live for all 18 materials; rendered on both platforms.
- [ ] Walkthrough harness extended with DQ invariants; iOS XCTest count reflects new parity tests.
- [ ] ROADMAP DQ section fully ticked.

---

## Execution sequence

Strict order (each sub-phase depends on the previous):

1. **DQ-1 first** — provenance infra is load-bearing for everything else. Retrofitting = rework every commit.
2. **DQ-2 second** — Safe/Tuned shape decides where DQ-3/4/5 data lands.
3. **DQ-3 / DQ-4 / DQ-5** — can parallelize within a session if time allows, but default to sequential one-sub-phase-per-session.

**Scraper** ships alongside DQ-3 (first sub-phase that needs external data). DQ-1 and DQ-2 are pure infra — no scraping.

---

## Open decisions (all resolved 2026-04-23)

- [x] **DQ-1 UI surface:** Advanced-view reveal (not debug-only, not hidden). Rationale: provenance is the pro-credibility feature — burying it defeats the purpose; beginners are already opted in/out of Advanced view so no clutter risk.
- [x] **DQ-2 default:** `safe` default, opt-in `tuned`. Zero-surprise path. Auto-detect rejected as too magic.
- [x] **Scraper sources:** owner delegated; picks locked (6 sources above).
- [x] **Timing:** proceed in parallel with Apple v1.0.2 review wait (no release-blocker conflict; DQ work is additive).
- [x] **Scope cap:** 3–5 Cowork sessions accepted.

---

## Related

- IMPL-039 (printer-capability clamping) — provenance model builds on clamp rules.
- IMPL-040 (chip desc parity) — same single-source-of-truth principle, extended to provenance.
- IR-5 `[MEDIUM-019-followup]` — max_mvs 0.8mm gaps are folded into DQ-3's data-collection pass (single scraper, two outputs).
