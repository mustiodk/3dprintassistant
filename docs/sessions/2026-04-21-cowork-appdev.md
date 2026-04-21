# 2026-04-21 — Cowork (appdev): IR-0 [CRITICAL-002] bed-temp clamp

## Durable context

What a future session needs to know that ROADMAP doesn't capture:

- **Engine bed-temp clamp pattern (decision)**: clamping happens in `getAdvancedFilamentSettings`; warning emission happens in `getWarnings`. The two functions re-compute the same `initTarget / otherTarget / highestTarget` expression (~3 duplicated lines). This was deliberate, not missed — matches the existing `_clampNum` contract that keeps `getWarnings` pure of state and lets `resolveProfile` / `getAdvancedFilamentSettings` remain pure of each other. If a future session wants to DRY this up, they'll need to break the invariant or introduce an output-carrying helper. Don't "refactor" the duplication without reading this first.
- **Hard-incompat warning ID (decision)**: `printer_bed_temp_incompatible` is a separate ID from `enclosure_required`, not a reuse. Review language said "same severity class" — I read that as styling, not identity. If analytics / UI / filters ever want to treat them as one class, group by a `severity: 'incompat'` tag rather than by ID.
- **iOS test strategy for `getAdvancedFilamentSettings` (alternative considered)**: the existing bridge does not expose `getAdvancedFilamentSettings`. The new `testBedTempClampedWhenPrinterBedTooLow` asserts via `getWarnings` (warning text contains the cap value). If MEDIUM-011 expands to cover 5–10 combos with hardcoded clamped values, add a minimal `getAdvancedFilamentSettings` bridge to `EngineService.swift` rather than parsing warning text.
- **Working-tree was dirty before this session**: the repo had accumulated unrelated drift (stubs, untracked specs, personal artefacts). Cleanup pass was split into two tracks — `[CRITICAL-002]` landed clean via surgical staging; the broader doc-hygiene work is tracked separately and partially completed in the same session (BACKLOG.md retired, IMPL-036 promoted, Legacy ID index added to ROADMAP). Remaining drift flagged in this log's "Follow-up" section below.
- **GitHub PAT leak (infrastructure note)**: the `claude-projects` (Projects root) repo has a GitHub personal access token embedded in its `git remote` URL — visible via `git remote -v`. Rotate + reconfigure to use `gh auth` or a credential helper. Not a committed-content leak, but a filesystem-readable one.

## Context

First triage session post-consolidation (see [2026-04-21-cowork-appdev-consolidation.md](2026-04-21-cowork-appdev-consolidation.md)). Goal: walk IR-0 ship-blockers in CRITICAL → HIGH order, one finding = one commit. First item: **[CRITICAL-002]** bed-temperature clamp + printer-specific warning.

## Summary

Two confirmed walkthrough regressions were flipping ❌ on the bed-temp check:

- Combo 6 (A1 + ABS): emitted `initial_layer_bed_temp = 105°C` on a 100°C-cap bed.
- Combo 10 (K1 Max + PC): emitted `initial = 115°C / other = 110°C` on a 100°C-cap bed.

Engine was clamping nozzle speed and catching nozzle-temp overshoots, but the symmetric bed-temp check was missing. Added today.

## What changed

### `engine.js` — two edits, one fix

1. **`getAdvancedFilamentSettings`** — now reads `state.printer`, computes `bedCap = min(material.bed_temp_max, printer.max_bed_temp)`, and clamps both `initial_layer_bed_temp` and `other_layers_bed_temp` to that cap before formatting. Mirrors the `_clampNum` invariant — clamp emits safe values, warnings live in `getWarnings`.
2. **`getWarnings`** — new block `14b` right after the nozzle-temp check (the symmetric twin). Two branches:
   - **Hard incompat** `printer_bed_temp_incompatible` — `printer.max_bed_temp < material.bed_temp_min`. Same severity class as `enclosure_required`, but distinct ID so it's findable in analytics. (No current printer/material combo trips this; latent guard for future additions.)
   - **Soft clamp** `printer_max_bed_temp_clamped` — recommended target overshoots printer cap. Printer-specific text, includes the nominal + initial-layer targets when they differ.

The warning block re-computes the same `initTarget / otherTarget` that `getAdvancedFilamentSettings` uses (three lines duplicated). The alternative was adding an output parameter or a shared helper — not worth the plumbing; the two functions stay pure of each other, same as the existing `_clampNum` pattern.

### iOS sync

`engine.js` copied to `3DPrintAssistant/Engine/engine.js` — byte-identical. No Swift code changes; `WarningCard` already renders new structured warning IDs automatically (RB-1 contract).

### Test (folds in [MEDIUM-011] early)

New `testBedTempClampedWhenPrinterBedTooLow` in `EngineServiceTests.swift`. Three assertions:
- A1 + ABS → `printer_max_bed_temp_clamped` fires, text cites "100°C" and "A1".
- K1 Max + PC → same warning fires, cites "100°C" and "K1 Max".
- X1C + ABS (120°C bed headroom) → no clamp warning and no hard-incompat warning.

## Regression result

Walkthrough harness (`node scripts/walkthrough-harness.js`) — **Combos 6 + 10 flipped from ❌ to ✓.** Eight other combos unchanged. New warnings visible in output:

```
- [printer_max_bed_temp_clamped] A1 bed temperature capped at 100°C.
  — ABS typically prints best at 100°C nominal (105°C on the initial layer)…

- [printer_max_bed_temp_clamped] K1 Max bed temperature capped at 100°C.
  — PC (Polycarbonate) typically prints best at 110°C nominal…
```

iOS XCTest suite: **35/35** passing (was 34/34 before today; EngineServiceTests went from 20 → 21).

## Files touched

**Modified:**
- `3dprintassistant/engine.js` — two blocks, ~35 added lines.
- `3dprintassistant-ios/3DPrintAssistant/Engine/engine.js` — byte-identical sync.
- `3dprintassistant-ios/3DPrintAssistantTests/EngineServiceTests.swift` — +1 test (~40 lines).
- `3dprintassistant/docs/planning/ROADMAP.md` — ticked `[CRITICAL-002]` in IR-0.

**Commits:**
- Web `…` — `engine: clamp bed temp to printer.max_bed_temp + emit warnings [CRITICAL-002]`
- iOS `…` — same message, + test.

Both pushed to `main`. iOS triggers TestFlight build per CI.

## Data/logic change evaluation (standing rule)

- Web UI: no changes needed — the structured warning panel renders new IDs automatically.
- iOS UI: no changes needed — `WarningCard` renders structured warnings by ID/text/detail.
- UX: both platforms gain two printer-aware safety warnings with zero owner action.
- Export path: `exportBambuStudioJSON` reads clamped values from `adv?.initial_layer_bed_temp`, so exported filament presets automatically respect printer ceilings. No change needed there.

## Next session

Continue IR-0 triage. Remaining items in CRITICAL/HIGH order:

1. **[CRITICAL-003]** — preset-ID validation in `resolveProfile` (unknown surface/strength/speed → coerce + `invalid_preset` warning). iOS test mirror.
2. **[CRITICAL-001]** — route iOS feedback through `/api/feedback` Worker (v1.0.2 release).
3. **[HIGH-012]** — fix A1-specific why-text on `outer_wall_speed` firing for every bedslinger.
4. **[HIGH-014]** — owner verifies A1 mini `max_bed_temp` against Bambu's product page.

One finding = one commit. Stop and confirm before starting each.
