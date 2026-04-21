# MEDIUM findings

---

### [MEDIUM-001] `getPrinterLimits` nozzle-size lookup uses loose string-key comparison

**Platform:** both (engine)
**Files:** `engine.js:670-685`

`String(0.4)` → `"0.4"`. A `limits_override` JSON entry keyed `"0.40"` or `"0.4 "` silently fails to apply — user gets formula defaults with no warning that their override is dead. No data validation at `init()`.

**Recommendation:** iterate override keys and compare numerically: `Object.entries(override.nozzles || {}).find(([k]) => Number(k) === Number(nozzleSize))?.[1]`. Also add an init-time validation that every `limits_override.nozzles` key parses as finite. **Effort:** trivial.

---

### [MEDIUM-002] `resolveProfile` silently defaults nozzleSize to 0.4 when no nozzle selected

**Platform:** both (engine)
**Files:** `engine.js:1337, 1358, 1363`

Early-return guard only checks `!printer || !material`. Missing nozzle falls through with `nozzleSize = 0.4`, producing a full profile against a hypothetical 0.4mm nozzle. `exportBambuStudioJSON` correctly requires all three (line 2051) — the inconsistency is the worry.

**Recommendation:** add `if (!nozzle) return {};` to the top guard. **Effort:** trivial.

---

### [MEDIUM-003] `limits_override` merge is shallow — `null` override values collapse into formula

**Platform:** both (engine)
**Files:** `engine.js:670-685`

The `nzOverride.max_layer_height ?? formula` pattern treats explicit `null` as "unset". There's no way to express "unbounded max" in an override — a future data entry that writes `null` silently gets formula instead.

**Recommendation:** document the contract (`undefined/missing falls through; null is not a valid override value`) in a comment, or switch to `!== undefined` checks. **Effort:** trivial.

---

### [MEDIUM-004] Chip desc numeric formatting diverges from profile emission under float edge cases

**Platform:** both (engine)
**Files:** `engine.js:243-245` vs `engine.js:1380-1381`

Chip desc uses `toFixed(2).replace(/0+$/, '').replace(/\.$/, '')`; emission uses raw template-literal stringification. For unusual floats (`0.200000001`), chip strips to `"0.2"` while emission writes `"0.200000001 mm"`. The IMPL-040 tests use `parseFloat` on both sides so they don't catch visual drift. No current data triggers this — latent.

**Recommendation:** single shared `_fmtLayer(lh)` helper used at both sites. **Effort:** trivial.

---

### [MEDIUM-005] Strength-chip desc hardcodes `"Grid"` / `"Cross Hatch"` suppression — Prusa user sees "Grid" while export maps to "rectilinear"

**Platform:** web + iOS (engine)
**Files:** `engine.js:247-252`

Chip desc drops the pattern name only when it's `"Grid"` or `"Cross Hatch"`. This is both hardcoded-English and not slicer-aware. A Prusa user sees chip text say "3 walls · 20% Grid" while their exported preset emits `"rectilinear"`.

**Recommendation:** pipe the pattern through `mapForSlicer` in the chip desc too, or add a `hide_in_chip: true` flag in `objective_profiles.json` on default patterns. **Effort:** trivial.

---

### [MEDIUM-006] `exportBambuStudioJSON` `_extractValue` falls back to `lowercased().replace(/ /g,'')` for unrecognised inputs

**Platform:** both (engine)
**Files:** `engine.js:2027-2043`

When a value doesn't match enabled/disabled/percent/range/number regexes, it's passed through with whitespace stripped — no validation. Today no engine field produces this path, but a future localised string or em-dash fallback (`—`) becomes `"—mm"` in the Bambu JSON and silently fails schema validation on import.

**Recommendation:** change the tail to `return null` and have the caller skip null fields, forcing explicit handling of every value type. **Effort:** trivial.

---

### [MEDIUM-007] `printer.series === 'corexy'` string check is case-sensitive with no data-validation fallback

**Platform:** both (engine)
**Files:** `engine.js:1295, 1347`

A one-character typo in `printers.json` (e.g. `"CoreXY"`) silently reclassifies a printer as bedslinger, changing speed emission and firing a misleading "A1/A1 Mini" acceleration why-text on a Voron.

**Recommendation:** add init-time validation that every `printer.series` ∈ known set. Or use a case-insensitive `isCoreXY(printer)` helper. **Effort:** trivial.

---

### [MEDIUM-008] `exportBambuStudioJSON` duplicates pattern mapping that `slicer_capabilities.json` already owns

**Platform:** both (engine)
**Files:** `engine.js:2139-2167` (hardcoded `patMap`/`spMap`/`sipMap`) vs `data/rules/slicer_capabilities.json`

Two sources of truth for "what Bambu Studio accepts for X pattern field". They can drift. `sipMap` upgrades `rectilinear` → `rectilinear_interlaced` even though both are listed as valid in capabilities — the double-transform is harmless today but shows the overlap.

**Recommendation:** drive export mapping through `mapForSlicer(value, field, 'bambu_studio')` + a tiny casing/hyphen normaliser. **Effort:** small.

---

### [MEDIUM-009] `EngineService.resolveProfile` decode path uses `[String: [String: Any]]` cast + `"\(obj["value"])"` string interpolation

**Platform:** iOS
**Files:** `3DPrintAssistant/Engine/EngineService.swift:188-205`

Brittle cast: any top-level meta field added to `resolveProfile` output (e.g. `_version`) fails the whole cast. `"\(obj["value"])"` on `Any??` produces `"Optional(\"0.28\")"` if the value is already a string (vs a number) — escaped by sheer luck today.

**Recommendation:** define `struct ProfileParam: Codable { let value, why: String; let mode: String? }` and use `JSONDecoder`. Catch decode failures and log — don't silently drop unknown fields. **Effort:** small.

---

### [MEDIUM-010] `EngineService.shared` singleton not reset between test runs — hidden test-order coupling

**Platform:** iOS (tests)
**Files:** `3DPrintAssistantTests/EngineServiceTests.swift:8-11`

`initialize()` writes `isReady = true` at the bottom but never sets it false at the top. If a test's init throws midway, subsequent tests inherit stale `context` + `isReady=true` and call into a half-initialised bridge.

**Recommendation:** first line of `initialize()`: `isReady = false; context = nil; _exceptions.removeAll()`. **Effort:** trivial.

---

### [MEDIUM-011] IMPL-040 test asserts agreement but not correctness — IMPL-039 clamp regression invisible

**Platform:** iOS (tests)
**Files:** `3DPrintAssistantTests/EngineServiceTests.swift:201-206`

The test asserts `chipNum == emittedNum`. Both paths regressing in lockstep (e.g. engine.js drops a clamp everywhere) still passes. The `// Ultra 0.08 → clamps up to 0.12` comment is there but no assertion encodes it.

**Recommendation:** add a second test tier with hardcoded expected clamped values for 5-10 representative combos. Asserts `(a) chip == emission` AND `(b) both == expectedClamped`. **Effort:** small.

---

### [MEDIUM-012] `EngineService` string-interpolates IDs into JS with only `'` escaped

**Platform:** iOS
**Files:** `3DPrintAssistant/Engine/EngineService.swift:249, 256, 276, 291-292, 375`

`printerId.replacingOccurrences(of: "'", with: "\\'")` protects against quotes but not `\`, newlines, or `</script>`. Bundled data is clean today, but a future feature accepting user-supplied IDs inherits the gap.

**Recommendation:** always embed via `JSON.stringify`: helper `jsonLit(_ s: String) -> String` returns the full-quoted JSON literal; call as `"Engine.getSlicerForPrinter(\(jsonLit(printerId)))"`. **Effort:** trivial.

---

### [MEDIUM-013] `getFilters(state:)` silently falls back to no-state variant on JSONSerialization failure

**Platform:** iOS
**Files:** `3DPrintAssistant/Engine/EngineService.swift:311-318`

`try? JSONSerialization.data(...)` collapses any error into `nil`, then the else-branch calls the stateless variant. Chip descs silently become generic — no signal anywhere.

**Recommendation:** `throw` on serialisation failure (state should always be JSON-compatible by construction), or `SentrySDK.capture(error)`. **Effort:** trivial.

---

### [MEDIUM-014] Missing `printer_max_bed_temp` warning — K1 user selecting PC gets bed_temp > max_bed_temp with no warning

**Platform:** data + engine
**Files:** `data/materials.json` (PC `bed_temp_base: 110`), `data/printers.json` (K1 series `max_bed_temp: 100`), `engine.js` getWarnings

The engine fires a `printer_max_nozzle_temp` warning when material nozzle temp exceeds printer capability but has no symmetric `printer_max_bed_temp` check. A Creality K1 + PC selection produces `bed_temperature = 110` silently; the printer tops out at 100.

**Recommendation:** add the symmetric warning in `getWarnings` + clamp `bed_temp_base` in `resolveProfile` through `_clampNum(base, mat_min, min(mat_max, printer.max_bed_temp))`. **Effort:** small.

---

### [MEDIUM-015] `data/rules/slicer_capabilities.json`: PrusaSlicer missing `"lightning"` in sparse_infill_patterns

**Platform:** data
**Files:** `data/rules/slicer_capabilities.json` (prusaslicer.sparse_infill_patterns)

PrusaSlicer has supported Lightning infill since 2.6. Current capability list doesn't include it, and the fallback map routes `lightning → rectilinear`. Prusa users silently get rectilinear where they'd get lightning on a slicer that supports it.

**Recommendation:** add `"lightning"` to the PrusaSlicer sparse_infill list and remove the fallback entry. **Effort:** trivial.

---

### [MEDIUM-016] `data/rules/slicer_capabilities.json`: Adaptive Cubic missing from Bambu and Orca sparse_infill_patterns

**Platform:** data
**Files:** `data/rules/slicer_capabilities.json`

Both Bambu Studio and OrcaSlicer support Adaptive Cubic; it's not listed. Today nothing emits "Adaptive Cubic" so no runtime effect — but capability map is incomplete, and a future surface preset using it would silently fail validation.

**Recommendation:** add `"adaptivecubic"` to both slicers. **Effort:** trivial.

---

### [MEDIUM-017] `data/rules/warnings.json` `condition_warnings` is dead data — engine hardcodes warnings inline

**Platform:** data
**Files:** `data/rules/warnings.json` (condition_warnings block), `engine.js:1040, 1047, 1076, 1081`

`condition_warnings` uses a `{id, message}` shape with embedded `<strong>` HTML, but the engine builds warnings inline via the `w()` helper with `{id, text, detail, fix}` shape. Nothing reads the file's `condition_warnings` array.

**Recommendation:** either wire the engine to read from data (preferable — removes hardcoded strings) or delete the `condition_warnings` block and its support schema. **Effort:** small.

---

### [MEDIUM-018] `data/nozzles.json` `not_suitable_for` references undefined materials (`abs_cf`, `pla_wood`, `pla_glow`)

**Platform:** data
**Files:** `data/nozzles.json` (std_0.4 and siblings), `data/materials.json`

These strings reference material IDs that don't exist in `materials.json`. Also mixes material-IDs (`pla_cf`) with material-group strings (`pla`) — inconsistent semantics.

**Recommendation:** decide on ID-or-group convention (IDs are more specific). Remove orphan references. Add init-time validation that every reference resolves. **Effort:** trivial.

---

### [MEDIUM-019] `data/materials.json` `max_mvs` key coverage inconsistent (missing `0.8` on most materials, missing `0.2` on CF/PA/PC)

**Platform:** data
**Files:** `data/materials.json`

Where `k_factor_matrix` has all four nozzle keys, `max_mvs` has a subset. Users on a 0.8 nozzle get `undefined` back from `max_mvs["0.8"]` on PLA/PETG/ABS materials — silent.

**Recommendation:** align `max_mvs` key coverage with `k_factor_matrix`. Use explicit `null` for incompatible pairs (as the TPU entries already do). **Effort:** small (data-entry).

---

### [MEDIUM-020] `OutputView.filamentTabs` hardcodes simple/advanced tab policy

**Platform:** iOS
**Files:** `3DPrintAssistant/Views/Output/OutputView.swift:36-44`

Hardcoded: `temps` always, `cooling`/`speed` in advanced, `setup` always. The engine already annotates params with `mode: "simple"|"advanced"` — the tab set is a rendering of that, and should be derived.

**Recommendation:** expose `getFilamentTabs(mode:)` from engine, filter UI on result. **Effort:** small.

---

### [MEDIUM-021] `OutputViewModel.slicerName` duplicates engine knowledge

**Platform:** iOS
**Files:** `3DPrintAssistant/Views/Output/OutputViewModel.swift:24-32`

Hardcoded switch on `bambu_studio`/`prusaslicer`/else → "OrcaSlicer". A fourth slicer would be silently mislabelled.

**Recommendation:** `EngineService.getSlicerDisplayName(id:)` via JSCore. **Effort:** trivial.

---

### [MEDIUM-022] Web `app.js` uses `innerHTML` with template literals — no XSS today but `escHtml` is defined and never called

**Platform:** web
**Files:** `app.js:727-732, 1075-1081, 1186, 1208-1215, 1239-1243`

All current rendered values come from bundled data or engine output so exploitability is nil, but defence-in-depth is absent. A future "shareable profile URL" feature (already on roadmap at `app.js:75`) or an imported preset name restoring user text would make one of these sites live XSS.

**Recommendation:** switch risky sites to `textContent` / DOM nodes, or run values through the existing `escHtml`. Highest-risk sites: warnings bar, compare banner (`comparisonProfile.label`). **Effort:** small.
