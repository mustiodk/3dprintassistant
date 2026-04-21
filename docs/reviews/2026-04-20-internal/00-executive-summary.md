# Executive summary

**Reviewed:** web `c4c5071`, iOS `24aef66`. **Reviewer:** Claude (internal review via `/code-reviewer`, against the starter kit in `docs/3rd-party-review/`). **Dates:** initial review 2026-04-20; Phase 1 domain walkthrough added same day.

## Overall health: 🟡 yellow — production-sound with three ship-blocker items and a handful of drift gaps

The product is well-engineered for a solo dev on a 2-month ramp. Engine/UI/data separation holds on web; iOS has meaningful UI-layer leakage but no business-logic duplication. IMPL-039 and IMPL-040 are the right direction and should ship as-is with small hardenings (below). Three findings are ship-blockers; several HIGH findings should be addressed before the next feature wave.

## Top 3 findings to act on first

1. **[CRITICAL-002]** Emitted bed temperatures exceed `printer.max_bed_temp` silently. K1 Max + PC emits 110°C / 115°C initial against a 100°C-max bed; A1 + ABS emits 105°C initial. Users load the preset, bed never reaches temp, print fails with warping — no warning explains why. Engine clamps nozzle temp but not bed temp. **Fix: mirror the nozzle-temp clamp + add `printer_max_bed_temp_clamped` warning.** (see [01-critical.md](01-critical.md))
2. **[CRITICAL-001]** iOS app POSTs feedback directly to the Discord webhook — URL is extractable from the shipped binary. Anyone who runs `strings` on the IPA can DOS the channel or spoof `@everyone` feedback. **Fix: route iOS through the same `/api/feedback` Cloudflare Worker the web uses.** (see [01-critical.md](01-critical.md))
3. **[CRITICAL-003]** Unknown preset IDs (e.g. `state.speed = "nonsense"`) silently emit `undefined` for simple-mode params, zero warnings. Corrupted localStorage or a future shareable-profile URL format change produces broken output with no signal. **Fix: validate preset IDs in `resolveProfile` + warn `invalid_preset`.** (see [01-critical.md](01-critical.md))

## IMPL-039 + IMPL-040 verdict

**Both patterns are structurally sound and should stay.** The universal formula (`nozzle × 0.70` max, `× 0.25` min) covers all 64 printers in data (no `limits_override` is currently set) and matches vendor reality. IMPL-040's single-source-of-truth invariant is a genuine structural improvement. Weaknesses are at the edges, not the core: test coverage is too loose, the export path bypasses the clamping, and numeric formatting goes through two paths that could diverge under float edge cases. None require a redesign.

## Data correctness

**No CRITICAL/dangerous values found.** All material temp/bed ranges are within industry-safe norms. One spec question worth re-checking: Bambu A1 mini `max_bed_temp: 100` — Bambu's product page lists 80°C. Two capability-map entries are worth fixing in `slicer_capabilities.json`: PrusaSlicer **does** support lightning infill (currently falls back to rectilinear); Adaptive Cubic is missing from Bambu and Orca sparse-infill lists.

## What's solid (don't work on these)

- Engine/UI separation on the web (`app.js` is a pure renderer; no business-logic leakage).
- localStorage usage (3 keys, all try/catch-wrapped, no PII, no feedback drafts).
- Sentry privacy config (`sendDefaultPii=false`, `attachScreenshot=false`, `attachViewHierarchy=false`).
- Engine has zero runtime network calls outside `init()` — clean for future API extraction.
- All 11 cross-platform files (engine.js + 8 data + 2 locales) are byte-identical between web and iOS. Sync discipline holds.
- Warnings contract (`{id, text, detail, fix}`) is consistent across emission sites.

## What I did NOT cover

- SwiftUI view-model separation beyond `OutputViewModel` / `OutputView` / `GoalsView`.
- Accessibility + dynamic-type review of iOS views.
- End-to-end import of `exportBambuStudioJSON` output into an actual Bambu Studio install (reviewed by schema comparison only, not by running the slicer).
- Fastlane / CI-workflow security beyond what's visible statically.
- Full Prusa/Orca spec check against vendor source code.
- Danish localisation quality.

## Invariant checklist (reviewed commits)

- ✅ `engine.js` byte-identical across web/iOS (sha256 `aaacbf12…70ddd7`, verified via `shasum`).
- ✅ All 8 shared data files (`printers`, `materials`, `nozzles`, `rules/*`) byte-identical (verified via `diff -q`).
- ✅ `en.json` and `da.json` byte-identical (verified via `diff -q`).
- ⚠️ No business logic in `app.js` (web) — **clean**. SwiftUI leakage on iOS — see [02-high.md#HIGH-006..008](02-high.md).
- ✅ `EngineService` declared `actor`; all JSContext calls go through actor-isolated methods — **but see [HIGH-003](02-high.md) on thread-affinity**.
- ➖ `exportBambuStudioJSON` schema vs vendor presets — did not import into live Bambu Studio; spot-checked against `docs/research/bambu-studio-*.md` schema references.
- ⚠️ IMPL-040 invariant holds under test — but tests are weaker than they should be (see [HIGH-002](02-high.md)).
- ✅ 20/20 unit tests pass per CI (not re-run locally — see [08-review-log.md](08-review-log.md)).
- ⚠️ Sentry DSN leaked in commit `e707df4` git history. Public-by-design but recommend rotation — see [LOW-001](04-low.md).

## Word count: ~500.
