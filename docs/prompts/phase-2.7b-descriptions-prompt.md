# Phase 2.7b — Explanatory Descriptions

## Context
3D Print Assistant — web app (`3dprintassistant/`) + iOS app (`3dprintassistant-ios/`).
- Web is the source of truth for `engine.js` and `data/*.json` — edit there, then sync to iOS.
- engine.js uses `S(value, why)` and `A(value, why)` helpers (line ~35) to tag every param with a value, explanation, and mode. Currently ~30% of params have empty `why` strings.
- `getFilters()` in engine.js returns `FilterGroup` arrays where each item has `{ id, name, desc }`. The `desc` field exists but is often `null` or a bare measurement like `"0.20 mm"` instead of an explanation.
- `getFilamentProfile()` returns a `notes` field but it's `null` for most materials.
- iOS `OutputView.swift` line ~256 has `note: isAdvanced ? param.why : nil` — only shows `why` in Advanced mode.
- iOS `GoalsView.swift` line ~14 drops `FilterItem.desc` entirely: `filterGroups[key]?.items.map { (id: $0.id, label: $0.name) }`.
- iOS `OutputView.swift` never displays `FilamentProfile.notes`.
- `SLICER_TABS` in engine.js defines tab structure but has no `desc` field per tab.
- Data files: `data/rules/objective_profiles.json`, `data/rules/environment.json`, and filter options defined inline in engine.js `getFilters()`.
- Locale files: `locales/en.json` and `locales/da.json` (web), `en.lproj/en.json` and `da.lproj/da.json` (iOS).

## Goal
Every setting, option, and category explains itself. Users never see a value without understanding why it was chosen.

---

## Task 1: Fill all empty `why` strings in `resolveProfile()` (engine.js)

Audit every `S()` and `A()` call inside `resolveProfile()`. Any call with an empty `why` (`''`) must get a meaningful one-liner explanation.

**Rules for writing `why` text:**
- Max ~80 characters — concise, not a paragraph
- Explain WHY this value was chosen, not WHAT the setting does
- Reference the user's configuration when relevant ("Reduced for TPU", "Matches your Quality goal", "A1 Mini bed limits acceleration")
- Use plain language — no jargon without context
- Conditional `why` is good — different explanations for different material/printer/goal combos (many params already do this well, follow that pattern)

**Examples of good `why` text already in the engine:**
- `'Fine layer height produces sharper detail — slower print, higher surface quality.'`
- `'Very low acceleration for TPU — prevents filament stretching and under-extrusion.'`
- `'Lower acceleration on A1/A1 Mini prevents ringing from the moving print bed mass.'`
- `'Essential for ABS/ASA — these materials warp severely at corners without a brim.'`

**Examples of params that likely need `why` filled in (verify by searching for `S(` and `A(` with empty second arg):**
- Wall loops
- Top/bottom shell layers
- Infill density
- Infill pattern
- Travel speed
- Any param where the second arg to `S()` or `A()` is `''` or missing

**Target: 100% of params have a non-empty `why`.** Count before and after to verify.

## Task 2: Add `desc` to all filter options (engine.js + data/rules/)

The filter system serves option groups via `getFilters()`. Each option should have a meaningful `desc` that explains what choosing it means for the print.

### 2a: `objective_profiles.json` — surface quality options
Current `desc` values are just measurements like `"0.20 mm"`. Replace with explanatory descriptions that INCLUDE the measurement:

| id | Current desc | New desc |
|----|-------------|----------|
| draft | "0.30 mm" | "0.30mm layers — fast prints, visible layer lines. Good for prototypes." |
| standard | "0.20 mm" | "0.20mm layers — balanced speed and quality for everyday prints." |
| fine | "0.16 mm" | "0.16mm layers — smooth surfaces, noticeably slower." |
| maximum | (check) | "0.12mm layers — near-invisible layers, significantly slower." |
| very_fine | (check) | "0.10mm layers — extremely fine detail for display pieces." |
| ultra | (check) | "0.08mm layers — maximum resolution, very slow. Miniatures and precision parts." |

### 2b: Strength options
| id | New desc |
|----|----------|
| minimal | "Thin walls, low infill — lightweight, fast, not load-bearing." |
| standard | "3 walls, 15% infill — good for most prints." |
| strong | "4 walls, 25% Gyroid — handles moderate loads and stress." |
| maximum | "5+ walls, 40%+ infill — maximum durability, heavy and slow." |

### 2c: Speed options
| id | New desc |
|----|----------|
| fast | "Prioritizes print speed — may sacrifice surface quality." |
| balanced | "Good balance of speed and quality for everyday use." |
| quality | "Slower speeds for better surfaces and dimensional accuracy." |

### 2d: Support options
| id | New desc |
|----|----------|
| easy | "Z gap 0.30mm — supports snap off easily, rougher underside." |
| balanced | "Z gap 0.20mm — reasonable removal with decent underside." |
| best_underside | "Z gap 0.10mm — smooth underside, supports harder to remove." |

### 2e: Environment options (`environment.json`)
| id | New desc |
|----|----------|
| normal | "Standard room, 18–25°C, no significant drafts." |
| cold | "Cool room below 18°C or near windows — may affect adhesion." |
| vcold | "Below 0°C — garage or outdoor printing, significant warping risk." |
| humid | "Above 60% humidity — moisture-sensitive materials need drying." |

### 2f: Use case options (if they exist)
Check what use case options `getFilters()` returns and add `desc` to each. These may be in engine.js inline rather than in JSON files.

### 2g: New 2.5b filter groups
Add `desc` to every option in: seam, brim, build_plate, extruder_type, filament_condition, ironing.

**Seam:**
| id | desc |
|----|------|
| aligned | "Seams line up vertically — visible seam line but predictable placement." |
| sharpest_corner | "Hides seams at sharp corners — best for geometric models." |
| random | "Seams scattered randomly — no visible line but subtle surface texture." |
| back | "Seams placed at the back of the model — hidden from front view." |

**Brim:**
| id | desc |
|----|------|
| auto | "Engine decides based on material shrink risk and part geometry." |
| none | "No brim — clean edges, relies on bed adhesion alone." |
| small | "5mm brim — light adhesion boost, easy to remove." |
| large | "10mm brim — strong adhesion for warp-prone materials." |
| mouse_ears | "Brim only at corners — prevents lifting with minimal cleanup." |

**Build plate:**
| id | desc |
|----|------|
| smooth_pei | "Smooth PEI — glossy bottom finish. Use glue as release agent for PETG." |
| textured_pei | "Textured PEI — matte finish, great adhesion, easy release for most materials." |
| cool_plate | "Cool plate — for PLA and TPU. Limited to lower bed temperatures." |
| engineering_plate | "Engineering plate — for high-temp materials (PC, PA). Heat resistant." |
| glass | "Glass bed — smooth finish, needs glue stick for adhesion." |

**Extruder type:**
| id | desc |
|----|------|
| direct_drive | "Short filament path — better retraction, handles flexibles well." |
| bowden | "Long PTFE tube — higher retraction needed, struggles with soft TPU." |

**Filament condition:**
| id | desc |
|----|------|
| freshly_dried | "Dried within 24h — optimal for moisture-sensitive materials." |
| opened_recently | "Opened within a week — probably fine for PLA, risky for PA/TPU." |
| unknown | "Unknown — engine adds drying warning for hygroscopic materials." |

**Ironing:**
| id | desc |
|----|------|
| auto | "Engine decides based on surface quality level (on at Fine+)." |
| on | "Iron top surfaces — smooths visible layers, adds print time." |
| off | "No ironing — faster, acceptable for non-visible surfaces." |

**Implementation:** These descriptions may need to be added in `engine.js` where the filter options are constructed (inside `getFilters()`), or in the JSON data files, depending on where each group is defined. Check both locations. The key is that `getFilters()` returns items with non-empty `desc` fields.

## Task 3: Add tab descriptions (engine.js)

Add a `desc` field to each tab in `SLICER_TABS`, or create a new `getTabDescriptions(slicer)` function.

**Preferred approach:** Add `desc` directly to each tab object in `SLICER_TABS`:

```javascript
// Example for Bambu Studio slicer tabs:
{ id: 'quality', label: 'Quality', desc: 'Layer height, line width, wall precision, seam placement, and surface finish.', params: [...] },
{ id: 'strength', label: 'Strength', desc: 'Wall count, infill pattern and density, top/bottom shell thickness.', params: [...] },
{ id: 'speed', label: 'Speed & Acceleration', desc: 'Print move speeds, acceleration limits, and travel settings.', params: [...] },
{ id: 'support', label: 'Support', desc: 'Support type, pattern, interface quality, and removal settings.', params: [...] },
{ id: 'others', label: 'Others', desc: 'Brim, prime tower, fuzzy skin, spiral vase, and special modes.', params: [...] },
```

Do this for all 3 slicer layouts (Bambu Studio, PrusaSlicer, OrcaSlicer). The descriptions should reflect what's actually in each tab for that slicer.

**Also expose in the API** so iOS can access them. If using the `SLICER_TABS` approach, `getSlicerTabs(slicer)` or similar should return the full tab objects including `desc`.

## Task 4: Filament profile notes (engine.js + materials.json)

Ensure `getFilamentProfile(materialId)` returns a useful `notes` string for all 18 materials. These should be practical one-liner tips.

**Examples:**
| Material | notes |
|----------|-------|
| pla | "Clean PEI with IPA between prints. Store in sealed bag to prevent brittleness." |
| petg | "Use glue stick as release agent on smooth PEI to prevent surface damage." |
| abs | "Requires enclosure. Ensure ventilation — ABS produces fumes during printing." |
| asa | "UV-resistant alternative to ABS. Still needs enclosure and ventilation." |
| tpu_95a | "Print slow, reduce retraction. Loosen extruder tension if filament jams." |
| tpu_90a | "Very slow speeds required. Disable retraction on Bowden setups." |
| tpu_85a | "Advanced material — manual feed only, no AMS. Dry before every session." |
| pa | "Extremely hygroscopic — dry before every print. Use enclosed, stable temp." |
| pa_cf | "Requires hardened steel nozzle. Dry 8+ hours before printing." |
| pet_cf | "Hardened nozzle required. Less warping than PA-CF but still needs drying." |
| pc | "Highest temp material — needs engineering plate and full enclosure." |
| petg_hf | "High-flow variant — faster prints at same quality. Same PEI caution as PETG." |
| hips | "Often used as soluble support (limonene). Can also be a standalone material." |
| pla_cf | "Hardened nozzle required. Stiffer than PLA but more brittle." |
| petg_cf | "Hardened nozzle required. Stronger and stiffer than plain PETG." |
| pva | "Water-soluble support material. Extremely hygroscopic — keep sealed until use." |
| pla_silk | "Decorative finish — lower layer adhesion than standard PLA. Avoid structural use." |
| abs_gf | "Glass-fiber reinforced — hardened nozzle required. Low warp, good stiffness." |

**Implementation:** If `notes` is stored in `materials.json`, add/update it there. If it's computed in `getFilamentProfile()`, add it there. Check where the current (mostly null) `notes` value comes from and update at the source.

## Task 5: Web — render filter option descriptions (app.js + style.css)

Wherever filter options/chips are rendered in the web UI (the configurator step for goals/options), display the `desc` text below the option label.

**HTML structure:**
```html
<div class="chip" data-id="fine">
  <span class="chip-label">Fine</span>
  <span class="chip-desc">0.16mm layers — smooth surfaces, noticeably slower.</span>
</div>
```

**CSS:**
```css
.chip-desc {
  display: block;
  font-size: 11px;
  color: var(--text-secondary, rgba(255,255,255,0.5));
  margin-top: 2px;
  line-height: 1.3;
}
```

**Note:** This may require changes to how chips are built. Check the rendering functions in app.js that create the option chips. The `desc` should come from the `getFilters()` response.

For segmented controls or smaller UI elements where desc doesn't fit, skip the desc display — only show on chips/cards that have enough space.

## Task 6: Web — tab descriptions in output (app.js + style.css)

At the top of each tab section in the output view, render the tab's `desc` as a muted one-liner:

```html
<div class="tab-content">
  <p class="tab-desc">Layer height, line width, wall precision, seam placement, and surface finish.</p>
  <!-- param rows -->
</div>
```

```css
.tab-desc {
  font-size: 12px;
  color: var(--text-secondary, rgba(255,255,255,0.45));
  margin: 0 0 12px 0;
  padding: 0;
  line-height: 1.4;
}
```

Access the tab description from the `SLICER_TABS` structure (after Task 3 adds the `desc` field).

## Task 7: iOS — Show `why` in Simple mode (OutputView.swift)

This is the single most impactful change. In `OutputView.swift`, find the line that gates `why` to Advanced only:

```swift
note: isAdvanced ? param.why : nil
```

Change to:
```swift
note: param.why.isEmpty ? nil : param.why
```

This shows the explanation in both Simple and Advanced modes. Users in Simple mode now understand why each value was recommended.

## Task 8: iOS — Wire FilterItem.desc into GoalsView (GoalsView.swift)

The `options()` helper currently drops desc:
```swift
private func options(for key: String) -> [(id: String, label: String)] {
    filterGroups[key]?.items.map { (id: $0.id, label: $0.name) } ?? []
}
```

Change the return type to include desc:
```swift
private func options(for key: String) -> [(id: String, label: String, desc: String?)] {
    filterGroups[key]?.items.map { (id: $0.id, label: $0.name, desc: $0.desc) } ?? []
}
```

Then update the chip/option rendering to show `desc` as a subtitle:
```swift
VStack(alignment: .leading, spacing: 2) {
    Text(option.label)
        .font(.system(size: 14, weight: .medium))
    if let desc = option.desc, !desc.isEmpty {
        Text(desc)
            .font(.system(size: 11))
            .foregroundStyle(ColorTheme.textSecondary)
    }
}
```

**Note:** This will make chips taller. For single-select segmented controls where space is tight, consider showing desc only on the selected option or in a separate line below the control rather than inside each segment.

**Design decision:** For chip-style selectors (like use case, seam, brim), show desc inside the chip. For segmented controls (like speed, surface quality), show the desc of the currently selected option below the control as a single line of helper text. This avoids bloating the segmented control.

## Task 9: iOS — Display FilamentProfile.notes (OutputView.swift)

In the filament info section of OutputView (where nozzle temp, bed temp, build plate, AMS compat, etc. are shown), add the `notes` field at the bottom:

```swift
if let notes = filamentProfile?.notes, !notes.isEmpty {
    HStack(alignment: .top, spacing: 8) {
        Image(systemName: "lightbulb")
            .font(.system(size: 12))
            .foregroundStyle(ColorTheme.accentGreen)
        Text(notes)
            .font(.system(size: 12))
            .foregroundStyle(ColorTheme.textSecondary)
    }
    .padding(.top, 8)
}
```

## Task 10: iOS — Tab descriptions in OutputView

When rendering each tab's content, add the tab description at the top:

```swift
// Access tab desc from the slicer tabs data
if let tabDesc = tabDescription {
    Text(tabDesc)
        .font(.system(size: 12))
        .foregroundStyle(ColorTheme.textTertiary)
        .padding(.bottom, 8)
}
```

**Implementation note:** The tab descriptions come from `SLICER_TABS` in engine.js (added in Task 3). You'll need to either:
- Add a new `EngineService` method that returns tab descriptions, or
- Update `SlicerLayout.swift` to include descriptions (would require manual sync), or
- Parse the `desc` from the existing `getSlicerTabs()` bridge if it returns full tab objects

The cleanest approach is extending the engine bridge to return tab objects with `desc` included.

## Task 11: Sync engine.js + data to iOS

After completing web changes:
1. Copy `engine.js` from `3dprintassistant/` to `3dprintassistant-ios/3DPrintAssistant/Engine/`
2. Copy `data/rules/objective_profiles.json` and `data/rules/environment.json`
3. Copy `data/materials.json` (if notes were added there)
4. Copy locale files if changed
5. Run `xcodegen generate`
6. Run tests — expect 6/6 passing
7. Build and verify descriptions appear

## Task 12: Verification

1. **Count `why` coverage:** Before starting Task 1, grep for `S(` and `A(` calls with empty second arg. After, verify count is 0.
2. **Web — filter descriptions:** Open configurator, verify every chip/option shows a desc subtitle.
3. **Web — tab descriptions:** Open output, verify each tab has a one-line description at the top.
4. **iOS — Simple mode why:** Select any config → output in Simple mode → verify every param shows its explanation.
5. **iOS — GoalsView descriptions:** Open Goals step → verify chips show desc subtitles.
6. **iOS — Filament notes:** Select PETG → output → filament panel → verify notes shown ("Use glue stick...").
7. **iOS — Tab descriptions:** Output view → switch tabs → verify each has a description line.
8. **Both — Advanced mode:** Switch to Advanced → verify all new advanced params also have `why` text.
9. **Danish locale:** Switch to DA → verify descriptions still display (they'll be in English — that's fine for now, i18n of descriptions is Phase 4).

## Execution order
1 → 2 → 3 → 4 (engine + data changes) → 5 → 6 (web UI) → commit web → 11 (sync) → 7 → 8 → 9 → 10 (iOS UI) → commit iOS → 12 (verify)
