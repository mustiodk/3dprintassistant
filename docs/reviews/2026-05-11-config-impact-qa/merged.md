# v1.0.4 config-impact merged queue

- **Locked on:** 2026-05-13
- **Web SHA at lock:** `5bcd68bce83735dd5896a065ee523207604812b6`
- **Source reports:** [`claude.md`](claude.md) + [`codex.md`](codex.md). Both include their original pass + a `Cross-pass review` section.
- **Status:** Owner-accepted v1.0.4 queue. Source of truth for what ships in v1.0.4. The detailed implementation plan is generated from this file via the `writing-plans` skill — not stored here.

This file is the **what + why + order**. It does not contain per-line implementation steps, test plans, acceptance criteria, or verification commands — those belong to the implementation plan that consumes this queue.

---

## Owner-locked planning defaults

Reproduced verbatim from the 2026-05-11 v1.0.4 core planning session. These defaults adjudicate every cross-pass open question; nothing in v1.0.4 can violate them.

1. **Core-first release.** Ship the must-fix core; rest backlog stays parked.
2. **Advisory-first chip contract.** Chips advise unless explicitly designed otherwise.
3. **Practical multicolor tiers (not exhaustive):** `none`, `ams_lite`, full AMS-like, `cfs`, generic non-AMS.
4. **Chamber = guard-only.** No new numeric chamber profile field.
5. **Material-side nozzle authority** via `material.nozzle_requirements`. Nozzle-side `suitable_for` / `not_suitable_for` is not authoritative.
6. **Research before numeric material formulas.** Owner-supplied manual sources if automated research is weak.

---

## v1.0.4 core batch (in-scope)

Implementation order matches the owner-locked sequencing. Each step ships as **one finding = one commit per platform** (web first, iOS sync at Phase 2). Severities below are the **adjudicated** final tier (see the Adjudication audit section for disputed-tier history).

| Step | Finding(s) | Source | Severity | In scope | Explicitly out of scope | Adjudication tag |
|---|---|---|---|---|---|---|
| 1 | Strength `speed_multiplier` is DEAD | Claude HIGH-09 / Codex HIGH-04 | HIGH | Wire `strength_levels[*].speed_multiplier` into the speed-calculation path after the base speed preset is chosen and before printer/material clamps. Preserve existing material caps and MVS clamps as the final safety gates. | No new strength-tier values. No retuning of existing multipliers. | — |
| 2 | Env data layer + copy + clamp attribution | Claude HIGH-07 + HIGH-08 + MEDIUM-05 / Codex HIGH-05 (incl. cold-warning-text drift) + handover-known `bed_first_layer_adj` | HIGH | Wire `fan_multiplier` into cooling fan emissions; wire `force_draft_shield` into a `draft_shield` profile emission; wire `bed_first_layer_adj` into `getAdvancedFilamentSettings` first-layer bed. Generate cold-env warning copy from the actually applied adjustment values so it cannot claim a compensation that is not emitted. When env compensation triggers a material-cap clamp, attribute correctly (env-driven, not material-driven). | Material-aware env compensation magnitudes (per-material `nozzle_adj` / `bed_adj` deltas) — Phase 3 research lane. No new env entries. | `[claude-adjudicated]` MEDIUM-05 bundled here because it is env-related and the same touch. |
| 3 | Physical printer × nozzle guard | Claude HIGH-01 / Codex HIGH-01 | HIGH | Thread the selected printer into nozzle filtering. Engine refuses (or warns + does not emit unsafe values) when `nozzle.size` is not in `printer.available_nozzle_sizes`. UI filter follows engine refusal, not the other way around. | Nozzle-side `suitable_for` positive list (separate Step 7 cleanup). | — |
| 4 | Physical printer × plate guard + material plate range | Claude HIGH-02 / Codex HIGH-03 | HIGH | Use `printer.available_plates` to filter/warn impossible plate selections. Use material-specific `compatible_plates[*].plate_id` + `bed_temp_range` where present before falling back to the generic `BUILD_PLATE_COMPAT` group map. UI filter follows engine. | Full removal of `BUILD_PLATE_COMPAT` static map (refactor — Phase 3). | — |
| 5 | Practical multicolor tiers | Mutual HIGH (`ams_lite_compatible` Claude HIGH-04 / Codex HIGH-02) + Claude HIGH-03 (system-type) + Codex MEDIUM-01 (empty-MCS) | HIGH | Replace the binary `colors !== 'single'` signal with a 5-tier resolver: `none`, `ams_lite`, full AMS-like, `cfs`, generic non-AMS (per owner default 3). Empty `multi_color_systems: []` suppresses or warns before `prime_tower` and AMS checklist output. AMS Lite materials gated via `material.ams_lite_compatible`. Generalize the existing Creality-only no-system warning (`engine.js:1491-1498`) to any printer with empty MCS. | Per-system numeric tuning (MMU3 / ACE / IDEX / Toolchanger / Filament Hub / AMS HT specifics) — Phase 3. Generic non-AMS guidance copy uses the tier label, not per-system text. | — |
| 6 | Chamber safe-cap guard (warning-only) | Claude HIGH-05 | HIGH | Read `material.safe_chamber_temp_max` on active-chamber printers. Emit a warning when chamber-temp-related output (warning copy or checklist) would exceed the material's safe ceiling. | Any **numeric** chamber-temp profile-field emission. This is a precondition for any future chamber-temp emission, not the emission itself. | — |
| 7 | Nozzle min-diameter warning cleanup + nozzle authority cleanup | Claude HIGH-12 (`cf_small_nozzle`) + Claude HIGH-06 (`not_suitable_for` schema-only) | MEDIUM | Rename `cf_small_nozzle` warning id to `nozzle_below_min_diameter`. Replace the hardcoded `"0.2mm nozzle will clog immediately"` message body with the actual selected nozzle size + the material's required min_diameter. Dedup vs the existing `nozzle_too_small` warning (`engine.js:1586`). Drop nozzle-side `suitable_for` and `not_suitable_for` arrays from `data/nozzles.json` per owner default 5 (material-side authoritative). Remove the `_validateSchema` ref-check that consumes them at `engine.js:201-209`. | Chip-promise rewrites (`special`, `decorative`, `miniature` — all advisory chip lane). | `[claude-adjudicated]` HIGH-06 bundled here because dropping nozzle-side authority IS the implementation of owner default 5. |

---

## Implementation order

Sequence is fixed; bundles within a step ship together as one logical finding (one commit per platform).

1. **Step 1** — Strength `speed_multiplier`.
2. **Step 2** — Env data layer + copy (bundle: `fan_multiplier` + `force_draft_shield` + `bed_first_layer_adj` + cold-warning-text fix + clamp-attribution fix).
3. **Step 3** — Physical nozzle guard.
4. **Step 4** — Physical plate guard + material plate range.
5. **Step 5** — MCS practical tiers (bundle: `ams_lite_compatible` + system-type tiers + empty-MCS).
6. **Step 6** — Chamber safe-cap guard.
7. **Step 7** — Nozzle min-diameter warning cleanup + nozzle authority cleanup.

After Step 7 (Phase 1 complete on web), Phase 2 = iOS byte-identical engine + data sync, full XCTest, UI screenshot walkthrough, `MARKETING_VERSION` bump to 1.0.4. iOS push gate enforced — no push to iOS `main` until ship-ready for TestFlight.

---

## Deferred to Phase 3 / rest backlog

All entries below are `[claude-adjudicated, owner-override-eligible]`.

### Phase 3 — research-gated material numeric lane

- **Claude MEDIUM-01** `materials.json:moisture_resistant` + `storage_max_humidity_pct` DEAD — humidity warnings not material-aware. Needs sourced research on per-material humidity thresholds before formula.
- **Claude MEDIUM-02** `materials.json:shrinkage_factor` DEAD — XY hole compensation + elephant foot are emitted material-blind. Needs sourced research on per-material shrinkage magnitudes (PA-CF examples in claude.md are not verified).
- **Material-aware env compensation magnitudes** — per-material `nozzle_adj` / `bed_adj` deltas. Needs sourced research; mirror the `gemini-environments-taxonomy-research.md` template.
- **`materials.json:safe_chamber_temp_max` numeric chamber emission path** — only if owner decides v1.1+ adds a numeric chamber profile field. Step 6 ships the guard only.

### Phase 3 — advisory chip lane

Per owner default 2 (advisory-first chip contract), the following stay advisory (copy-only changes) unless explicitly redesigned:

- **Codex LOW-02** `filament_condition` no-op values (`freshly_dried`, `opened_recently`).
- **Claude MEDIUM-06** `useCase=miniature` does not recommend a fine-detail nozzle. Chip-promise vs engine-behaviour gap.
- **`special` flags chip-promise** (`metallic`, `waterproof`, `glossy`) — engine emits only warnings, not promised profile changes. Severity adjudicated MEDIUM.
- **`useCase=decorative`** — produces same output as `prototype` despite chip promise. Severity adjudicated MEDIUM.
- **`userLevel=advanced`** — no-op vs `intermediate`. Severity adjudicated MEDIUM.

### Phase 3 — cleanup batch

- **Codex LOW-01** surface ironing data/runtime drift — `surface_quality[*].ironing` data field disagrees with engine auto-ironing rule. Single-source-of-truth cleanup.
- **Claude MEDIUM-03** `environment.json:humidity_warning` DEAD — schema brittleness; bundle with the deferred environment-taxonomy expansion already in ROADMAP.
- **OBS-01** engine env-ID hardcodes (`engine.js:1287` / `:1296` / `:1621`) — schema brittleness; bundle with env-taxonomy expansion.

### Rest backlog (lower priority, not Phase 3 critical)

- **Claude LOW-01** `materials.json:difficulty` DEAD.
- **Claude LOW-02** `materials.json:food_safe_possible` DEAD.
- **Claude LOW-03** `materials.json:heatbed_temp` + `heatbed_duration_hours` DEAD.
- **Claude LOW-04** `materials.json:outdoor_suitable` DEAD.
- **Claude LOW-05** `nozzles.json:suitable_for` DEAD (collapsed with nozzle authority cleanup in Step 7 — if Step 7 drops nozzle-side metadata entirely, this is closed there).
- **Claude LOW-06** `environment.json:ambient_temp_range` DEAD.
- **Codex OBSERVATION-01** environment × support has no direct interaction. No fix recommended.
- **Codex OBSERVATION-02** positive interaction controls behaved as expected. Guardrail note, not a finding.
- **Claude OBS-02 / OBS-03 / OBS-04 / OBS-05** — informational only.

---

## Open questions resolved against owner-locked defaults

Both passes ended with explicit owner-decision items. Each is mapped to the locked default that resolves it.

| Open question (from Claude.md + cross-pass) | Resolution |
|---|---|
| Chamber semantics — wire `safe_chamber_temp_max` before any numeric chamber emission, or after? | **Before.** Default 4 (chamber = guard-only). Step 6 ships the guard with no numeric emission. |
| Shrinkage compensation — source magnitudes from where? | **Deferred.** Default 6 (research before numeric material formulas). Phase 3 research lane. |
| Multicolor system scope — differentiate just AMS vs AMS Lite, or all 8 MCS types? | **Practical 5-tier model.** Default 3 (`none`, `ams_lite`, full AMS-like, `cfs`, generic non-AMS). Step 5. |
| Chip contract — promises of slicer-profile mutation or mostly advisory? | **Advisory-first.** Default 2. All chip-promise findings → Phase 3 advisory chip lane. |
| Nozzle authority — material-side, nozzle-side, or both? | **Material-side authoritative.** Default 5. Step 7 drops nozzle-side authority. |
| `useCase=decorative` design intent — what should it do? | **Deferred.** Advisory chip lane (default 2). Severity adjudicated MEDIUM. |
| `userLevel=advanced` scope — meaningful behaviour or collapse to 2 levels? | **Deferred.** Advisory chip lane (default 2). Severity adjudicated MEDIUM. |
| `OBS-01` env-ID hardcodes — fix during v1.0.4 env batch or later? | **Later.** Bundle with deferred env-taxonomy expansion (already in ROADMAP). Step 2 fixes only the dead fields, not the schema brittleness. |
| `MEDIUM-06` miniature nozzle suggestion strength | **Deferred.** Advisory chip lane (default 2). |

---

## Adjudication audit

Disputed-severity calls and bundling decisions made during this merge. All tagged `[claude-adjudicated, owner-override-eligible]` — flip at the S2 cold-start if you disagree.

| Item | Claude orig | Codex orig | Final | Reason |
|---|---|---|---|---|
| `special` flags chip-promise | HIGH | MEDIUM | **MEDIUM** | Codex right — emits advisory warning, not damaging slicer value. Per Codex cross-pass at `codex.md:378-379`. |
| `useCase=decorative` | HIGH | LOW (bundled under enum no-ops) | **MEDIUM** | Worse than DEAD vs chip text (matches `prototype` against quality promise) but not damaging. Codex cross-pass agreed at `codex.md:380`. |
| `userLevel=advanced` no-op | MEDIUM | LOW (bundled under enum no-ops) | **MEDIUM** | UX claim that doesn't deliver. Claude cross-pass call at `claude.md:560`. Codex disagreed at `codex.md:381` (kept LOW); Claude's adjudication retained because chip presents 3 options of which only 1 is functional. |
| `nozzle.not_suitable_for` runtime-DEAD | HIGH | LOW | **MEDIUM** | Per Codex cross-pass at `codex.md:381`. Bundled into Step 7 cleanup because dropping nozzle-side authority IS the implementation of owner default 5. |
| **Bundle MEDIUM-05 into Step 2 (env batch)** | n/a | n/a | **Bundled** | Env-clamp misattribution is env-related and same touch. |
| **Bundle Claude HIGH-06 into Step 7** | n/a | n/a | **Bundled** | Dropping nozzle-side authority IS the implementation of owner default 5; cleaner as one cleanup commit per platform. |

---

## Maintenance note

Update `merged.md` when:

- Owner overrides a `[claude-adjudicated]` call at an S* cold-start. Flip the call in the table; re-lock the SHA snapshot at the time of the change.
- A finding moves between v1.0.4 core and Phase 3 / rest backlog.
- A new finding is surfaced during implementation that needs to ship in v1.0.4.

The implementation plan (per-line steps, test plans, acceptance criteria) lives in the writing-plans output, not here. Keep merged.md as the **what + why + order**.
