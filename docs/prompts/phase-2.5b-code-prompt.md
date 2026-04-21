# Phase 2.5b — Configurator Input Expansion
## Claude Code Prompt

---

## CONTEXT

You are working on **3D Print Assistant** — a web app (`3dprintassistant/`) and a native iOS companion app (`3dprintassistant-ios/`). The web app's `engine.js` and `data/*.json` are the single source of truth. iOS uses a JavaScriptCore bridge to run the same engine on-device.

**Rule:** Every change to data files or engine.js must also be reflected in the iOS app (AppState, UI, SlicerLayout as needed).

**Current state:** Phase 2.5 is complete. All 18 materials have Patch A + B data. 10 engine improvements are live. CI/CD running. TestFlight live.

---

## PHASE 2.5b GOAL

Add deeper configurator inputs so the engine can generate more targeted profiles. The simple/advanced toggle now gates **input visibility** (not just output depth). Simple = 5 core fields. Advanced = all fields including new ones.

---

## TASK 1 — nozzles.json (web project: `data/nozzles.json`)

Add 5 new nozzle entries. Existing entries use this shape — match it exactly:

```json
{
  "id": "standard_0.2",
  "label": "Standard 0.2mm",
  "diameter": 0.2,
  "type": "standard",
  "abrasion_resistant": false,
  "compatible_materials": ["pla", "pla_cf", "petg", "petg_hf", "tpu_85a", "tpu_90a", "pva"]
}
```

Add these 5 entries:

1. `standard_0.2` — Standard 0.2mm, diameter 0.2, type "standard", abrasion_resistant false, compatible_materials: ["pla", "pla_cf", "petg", "petg_hf", "tpu_85a", "tpu_90a", "pva"]

2. `standard_0.6` — Standard 0.6mm, diameter 0.6, type "standard", abrasion_resistant false, compatible_materials: ["pla", "pla_cf", "petg", "petg_hf", "abs", "asa", "tpu_85a", "tpu_90a", "hips", "pva", "pa", "pa_cf", "pet_cf"]

3. `standard_0.8` — Standard 0.8mm, diameter 0.8, type "standard", abrasion_resistant false, compatible_materials: ["pla", "petg", "abs", "asa", "tpu_85a", "tpu_90a", "hips", "pa"]

4. `hardened_0.2` — Hardened Steel 0.2mm, diameter 0.2, type "hardened", abrasion_resistant true, compatible_materials: ["pla", "pla_cf", "petg", "petg_hf", "pa_cf", "pet_cf"]

5. `hardened_0.8` — Hardened Steel 0.8mm, diameter 0.8, type "hardened", abrasion_resistant true, compatible_materials: ["pla", "pla_cf", "petg", "petg_hf", "abs", "asa", "pa", "pa_cf", "pet_cf", "pc", "hips"]

---

## TASK 2 — Option sets (web project: `data/rules/` or wherever getFilters() reads option data)

First, read the existing filter/option file(s) to understand the exact structure. Then add or update these option sets:

### 2a — Surface quality (UPDATE existing)
Add two new options to the existing surface quality options, keeping existing ones:
- `very_fine` — "Very fine (0.12mm)" — layer height 0.12mm
- `ultra` — "Ultra fine (0.08mm)" — layer height 0.08mm

### 2b — Support (UPDATE existing)
Fix Z gap values and rename options. Replace current support options with:
- `none` — "None"
- `easy` — "Easy removal" — support type: Tree, Z gap: 0.30mm
- `balanced` — "Balanced" — support type: Tree, Z gap: 0.20mm
- `best_underside` — "Best underside" — support type: Normal, Z gap: 0.10mm

Note: "Quality" was the old name for what is now "Best underside". Old Z gap of 0.20mm for easy removal was wrong — correct value is 0.30mm.

### 2c — Seam position (NEW)
Option set id: `seam`
Multi-select: false
Options:
- `aligned` — "Aligned" (default, predictable position)
- `sharpest_corner` — "Sharpest corner" (hide seam in geometry)
- `random` — "Random" (spread across surface)
- `back` — "Back" (always rear-facing)

### 2d — Brim (NEW)
Option set id: `brim`
Multi-select: false
Options:
- `auto` — "Auto" (engine decides based on material)
- `none` — "None"
- `small` — "Small (5mm)"
- `large` — "Large (10mm)"
- `mouse_ears` — "Mouse ears" (point adhesion only)

### 2e — Build plate surface (NEW)
Option set id: `build_plate`
Multi-select: false
Options:
- `smooth_pei` — "Smooth PEI"
- `textured_pei` — "Textured PEI"
- `cool_plate` — "Cool Plate"
- `engineering_plate` — "Engineering Plate"
- `glass` — "Glass"
- `garolite` — "Garolite / G10"

### 2f — Extruder type (NEW)
Option set id: `extruder_type`
Multi-select: false
Options:
- `direct_drive` — "Direct drive"
- `bowden` — "Bowden"

### 2g — Filament condition (NEW)
Option set id: `filament_condition`
Multi-select: false
Options:
- `freshly_dried` — "Freshly dried"
- `opened_recently` — "Opened recently (< 2 weeks)"
- `unknown` — "Unknown / not sure"

### 2h — Ironing (NEW, Advanced only)
Option set id: `ironing`
Multi-select: false
Options:
- `auto` — "Auto (Fine+ surfaces)"
- `on` — "On"
- `off` — "Off"

---

## TASK 3 — engine.js (web project: `engine.js`)

Read the current engine.js carefully before making changes. The engine already has 10 logic improvements from Phase 2.5. Add 7 new logic blocks:

### 3a — Build plate compatibility warnings
Add a `BUILD_PLATE_COMPAT` lookup table near the top of engine.js (before the main functions), then use it in `getWarnings()`:

```javascript
const BUILD_PLATE_COMPAT = {
  pla:      { smooth_pei: 'good',       textured_pei: 'good',       cool_plate: 'good',       engineering_plate: 'avoid',      glass: 'good',    garolite: 'avoid' },
  pla_cf:   { smooth_pei: 'good',       textured_pei: 'good',       cool_plate: 'good',       engineering_plate: 'avoid',      glass: 'ok',      garolite: 'avoid' },
  petg:     { smooth_pei: 'needs_prep', textured_pei: 'good',       cool_plate: 'avoid',      engineering_plate: 'good',       glass: 'ok',      garolite: 'avoid' },
  petg_hf:  { smooth_pei: 'needs_prep', textured_pei: 'good',       cool_plate: 'avoid',      engineering_plate: 'good',       glass: 'ok',      garolite: 'avoid' },
  abs:      { smooth_pei: 'ok',         textured_pei: 'good',       cool_plate: 'avoid',      engineering_plate: 'good',       glass: 'ok',      garolite: 'avoid' },
  asa:      { smooth_pei: 'ok',         textured_pei: 'good',       cool_plate: 'avoid',      engineering_plate: 'good',       glass: 'ok',      garolite: 'avoid' },
  tpu_85a:  { smooth_pei: 'needs_prep', textured_pei: 'needs_prep', cool_plate: 'ok',         engineering_plate: 'avoid',      glass: 'ok',      garolite: 'avoid' },
  tpu_90a:  { smooth_pei: 'needs_prep', textured_pei: 'needs_prep', cool_plate: 'ok',         engineering_plate: 'avoid',      glass: 'ok',      garolite: 'avoid' },
  pa:       { smooth_pei: 'ok',         textured_pei: 'good',       cool_plate: 'avoid',      engineering_plate: 'good',       glass: 'avoid',   garolite: 'good'  },
  pa_cf:    { smooth_pei: 'ok',         textured_pei: 'good',       cool_plate: 'avoid',      engineering_plate: 'good',       glass: 'avoid',   garolite: 'good'  },
  pet_cf:   { smooth_pei: 'ok',         textured_pei: 'good',       cool_plate: 'avoid',      engineering_plate: 'good',       glass: 'ok',      garolite: 'avoid' },
  pc:       { smooth_pei: 'ok',         textured_pei: 'ok',         cool_plate: 'avoid',      engineering_plate: 'good',       glass: 'avoid',   garolite: 'avoid' },
  hips:     { smooth_pei: 'ok',         textured_pei: 'good',       cool_plate: 'avoid',      engineering_plate: 'good',       glass: 'ok',      garolite: 'avoid' },
  pva:      { smooth_pei: 'good',       textured_pei: 'good',       cool_plate: 'ok',         engineering_plate: 'avoid',      glass: 'good',    garolite: 'avoid' },
  flex:     { smooth_pei: 'needs_prep', textured_pei: 'needs_prep', cool_plate: 'ok',         engineering_plate: 'avoid',      glass: 'ok',      garolite: 'avoid' }
};

const BUILD_PLATE_NOTES = {
  smooth_pei_petg:   'Apply a thin layer of glue stick as release agent — PETG can permanently bond to smooth PEI and rip the coating.',
  smooth_pei_tpu:    'Apply a thin layer of glue stick as release agent to prevent TPU from bonding too aggressively.',
  smooth_pei_flex:   'Apply a thin layer of glue stick as release agent.',
  engineering_plate_pla: 'Engineering plate runs too hot for PLA — use Cool Plate or PEI instead.',
  cool_plate_petg:   'PETG sticks too aggressively to Cool Plate and may damage it. Use Textured PEI instead.',
  cool_plate_abs:    'ABS/ASA requires a heated enclosure and a plate that holds temperature better than Cool Plate.',
  cool_plate_asa:    'ABS/ASA requires a heated enclosure and a plate that holds temperature better than Cool Plate.',
  cool_plate_hips:   'HIPS requires high bed temps — Cool Plate cannot reliably hold the required temperature.',
  cool_plate_pa:     'PA/Nylon requires high bed temperature and strong adhesion — Cool Plate is not recommended.',
  glass_pa:          'Glass provides poor adhesion for nylon — use Garolite/G10 or Engineering Plate instead.',
  glass_pc:          'PC can crack glass due to thermal shock during printing. Use Engineering Plate instead.',
  garolite_pa:       'Garolite (G10) is the best surface for Nylon — excellent adhesion without warping.',
  garolite_pa_cf:    'Garolite (G10) is excellent for PA-CF — strong adhesion, minimal warp.'
};
```

In `getWarnings(state)`, after the existing warning checks, add:

```javascript
// Build plate compatibility check
if (state.build_plate && material) {
  const matId = state.material;
  const plate = state.build_plate;
  const compat = BUILD_PLATE_COMPAT[matId];
  if (compat) {
    const rating = compat[plate];
    const noteKey = `${plate}_${matId}`;
    const reverseKey = `${matId}_${plate}`;  // also check material_plate ordering
    const note = BUILD_PLATE_NOTES[noteKey] || BUILD_PLATE_NOTES[reverseKey] || null;

    if (rating === 'avoid') {
      warnings.push({
        level: 'error',
        message: `${material.label} is not recommended on ${plate.replace(/_/g, ' ')}`,
        detail: note || 'This combination is known to cause adhesion failures or surface damage.',
        fix: 'Switch to a compatible build plate surface for this material.'
      });
    } else if (rating === 'needs_prep') {
      warnings.push({
        level: 'warning',
        message: `${material.label} on ${plate.replace(/_/g, ' ')} requires preparation`,
        detail: note || 'This combination works but needs surface prep before printing.',
        fix: note ? null : 'Apply a release agent (glue stick) before printing.'
      });
    }
  }
}
```

### 3b — Seam position output
In `resolveProfile(state)`, add seam_position to the output object. Look for where params are being assembled and add:

```javascript
// Seam position
if (state.seam && state.seam !== 'aligned') {
  const seamLabels = { sharpest_corner: 'Sharpest corner', random: 'Random', back: 'Back', aligned: 'Aligned' };
  output.seam_position = {
    value: state.seam,
    label: seamLabels[state.seam] || state.seam,
    unit: null
  };
}
```

Also add `seam_position` to the appropriate slicer tab in the output (Quality or a new Placement tab if cleaner).

### 3c — Brim logic
In `resolveProfile(state)`, determine brim automatically in Simple mode, use explicit in Advanced:

```javascript
// Brim selection
let brimValue = state.brim || 'auto';
if (brimValue === 'auto') {
  // Auto-select based on material shrink risk
  const shrinkRisk = material.shrink_risk || 'low';
  if (shrinkRisk === 'high') brimValue = 'large';      // ABS, ASA, PA, PC
  else if (shrinkRisk === 'medium') brimValue = 'small'; // PETG, HIPS, PA-CF
  else brimValue = 'none';                               // PLA, TPU etc.
}
const brimOutput = { none: 'None', small: '5mm brim', large: '10mm brim', mouse_ears: 'Mouse ears' };
if (brimValue !== 'none') {
  output.brim = { value: brimValue, label: brimOutput[brimValue] || brimValue, unit: null };
}
```

### 3d — Extruder type retraction adjustment
In `resolveProfile(state)`, find the existing retraction output block (added in Phase 2.5) and extend it:

```javascript
// Extruder type retraction modifier (add after existing retraction calculation)
if (state.extruder_type === 'bowden') {
  // Bowden drives require significantly more retraction
  const bowdenMultiplier = material.flexible ? 1.5 : 3.5;
  retractionDistance = Math.min(retractionDistance * bowdenMultiplier, material.retraction_max || 8.0);
  warnings.push({
    level: 'info',
    message: 'Bowden retraction values are estimates — tune carefully',
    detail: 'Bowden extruders vary significantly by tube length and quality. These values are starting points.',
    fix: 'Run a retraction tower test to dial in the exact value for your setup.'
  });
}
```

Note: add this in `resolveProfile()`, not `getWarnings()` — retraction is a profile output. The warning can be pushed to a local warnings array that gets merged if the engine already has that pattern, or just include it in `getWarnings()` with a check for `state.extruder_type === 'bowden'`.

### 3e — Filament condition escalation
In `getWarnings(state)`, add after the existing hygroscopic check:

```javascript
// Filament condition escalation
if (state.filament_condition === 'unknown' && material.hygroscopic && material.hygroscopic !== 'none') {
  const hygLevel = material.hygroscopic; // 'low', 'medium', 'high', 'extreme'
  const dryingTemps = { pla: '45°C', petg: '65°C', abs: '80°C', asa: '80°C', pa: '80°C', pa_cf: '80°C', pc: '120°C', hips: '65°C', tpu_85a: '50°C', tpu_90a: '50°C', pva: '45°C', pet_cf: '70°C' };
  const dryTemp = dryingTemps[state.material] || '65°C';
  warnings.push({
    level: hygLevel === 'extreme' || hygLevel === 'high' ? 'error' : 'warning',
    message: `${material.label} is moisture-sensitive — drying recommended`,
    detail: `This material absorbs moisture from air quickly. Unknown storage conditions mean your spool may already be wet, which causes bubbles, stringing, and weak layer adhesion.`,
    fix: `Dry at ${dryTemp} for 4–8 hours in a food dehydrator or filament dryer before printing.`
  });
}
```

### 3f — Ironing logic
In `resolveProfile(state)`, decouple ironing from surface quality. Currently ironing is part of surface quality logic — make it a separate flag:

```javascript
// Ironing — separate from surface quality
let ironingEnabled = false;
if (state.ironing === 'on') {
  ironingEnabled = true;
} else if (state.ironing === 'off') {
  ironingEnabled = false;
} else {
  // Auto: enable ironing at fine or better surface quality in Advanced mode, or always in Simple at fine+
  const fineQualityLevels = ['fine', 'very_fine', 'ultra'];
  ironingEnabled = fineQualityLevels.includes(state.surface || '');
}
if (ironingEnabled) {
  output.ironing = { value: true, label: 'Enabled', unit: null };
}
```

Remove any existing hardcoded ironing=true logic tied to surface quality level.

### 3g — Layer height constraint
In `resolveProfile(state)` or as a validation function called before profile generation:

```javascript
// Layer height constraint — suppress options exceeding 75% of nozzle diameter
function validateLayerHeight(surfaceId, nozzleDiameter) {
  const layerHeights = { draft: 0.28, standard: 0.20, fine: 0.15, very_fine: 0.12, ultra: 0.08 };
  const maxAllowedLayer = nozzleDiameter * 0.75;
  const selectedHeight = layerHeights[surfaceId];
  if (selectedHeight && selectedHeight > maxAllowedLayer) {
    return {
      valid: false,
      message: `${surfaceId.replace('_', ' ')} (${selectedHeight}mm) exceeds 75% of your ${nozzleDiameter}mm nozzle diameter (max: ${(maxAllowedLayer).toFixed(2)}mm).`,
      fix: `Use a larger nozzle or choose a lower quality level.`
    };
  }
  return { valid: true };
}
```

Call this in `getWarnings(state)`:
```javascript
if (state.surface && state.nozzle) {
  const nozzle = nozzles.find(n => n.id === state.nozzle);
  if (nozzle) {
    const layerCheck = validateLayerHeight(state.surface, nozzle.diameter);
    if (!layerCheck.valid) {
      warnings.push({ level: 'warning', message: layerCheck.message, detail: null, fix: layerCheck.fix });
    }
  }
}
```

---

## TASK 4 — AppState.swift (iOS: `Models/AppState.swift`)

Read the current file. Add 5 new optional fields to the AppState struct/class:

```swift
var seam: String?           // "aligned" | "sharpest_corner" | "random" | "back"
var brim: String?           // "auto" | "none" | "small" | "large" | "mouse_ears"
var buildPlate: String?     // "smooth_pei" | "textured_pei" | "cool_plate" | "engineering_plate" | "glass" | "garolite"
var extruderType: String?   // "direct_drive" | "bowden"
var filamentCondition: String? // "freshly_dried" | "opened_recently" | "unknown"
var ironing: String?        // "auto" | "on" | "off"
```

Update `surface` valid values list in any comments/documentation to include: `"very_fine"`, `"ultra"`

Update the AppState → JS dictionary mapping in EngineService.swift (wherever state is serialized to pass to the JS engine) to include all 6 new fields:
- `seam` → `state.seam`
- `brim` → `state.brim`
- `build_plate` → `state.buildPlate` (note: snake_case for JS, camelCase for Swift)
- `extruder_type` → `state.extruderType`
- `filament_condition` → `state.filamentCondition`
- `ironing` → `state.ironing`

---

## TASK 5 — GoalsView.swift (iOS: `Views/GoalsView.swift`)

Read the current file first. The view currently uses `getFilters()` to load all option sets dynamically. Add new sections for the new option sets.

**Simple/Advanced input split:**

The `userLevel` toggle currently exists on the Output screen. For Phase 2.5b, the same concept needs to apply to inputs — fields marked as Advanced-only should be hidden in Simple mode. Do NOT change the output behavior, only input visibility.

Add a local `@State var showAdvanced: Bool = false` (or check `appState.userLevel`) toggle at the top of GoalsView. When `showAdvanced` is false, hide the following sections:
- Seam position
- Brim
- Build plate surface
- Extruder type
- Ironing toggle
- Filament condition

When `showAdvanced` is true, show all sections.

The toggle should appear as a clean row at the top or bottom of the goals list — label "Advanced options" with a toggle/chevron.

**New sections to add (Advanced only):**
1. **Build plate** — chips, single-select, loaded from `getFilters()` for key `build_plate`
2. **Extruder type** — chips, single-select, loaded from `getFilters()` for key `extruder_type`
3. **Filament condition** — chips, single-select, loaded from `getFilters()` for key `filament_condition`
4. **Seam position** — chips, single-select, loaded from `getFilters()` for key `seam`
5. **Brim** — chips, single-select, loaded from `getFilters()` for key `brim`
6. **Ironing** — chips or segmented control, single-select, loaded from `getFilters()` for key `ironing`

Also update existing sections:
- **Surface quality** — will automatically pick up `very_fine` and `ultra` from `getFilters()`
- **Support** — will automatically pick up the corrected options from `getFilters()` (no code change needed if dynamic)

---

## TASK 6 — NozzlePickerView.swift (iOS: `Views/NozzlePickerView.swift`)

Read the current file. Currently shows all compatible nozzles.

Update behavior:
- **Simple mode** (when `appState.userLevel != "advanced"` or when `showAdvanced == false`): Show only 4 core nozzles: `standard_0.4`, `hardened_0.4`, `standard_0.6`, `standard_0.2`. Keep incompatible nozzles dimmed as before.
- **Advanced mode**: Show full nozzle list including all new entries (standard_0.2, 0.6, 0.8, hardened_0.2, 0.8).

Check how `appState.userLevel` is currently used in the app to determine the right flag to read.

---

## TASK 7 — Web app option updates (`3dprintassistant/`)

Read the web app's configurator HTML/JS to understand how options are rendered (likely reads from `getFilters()` or has its own option rendering). Make the same updates:

1. Surface quality options — `very_fine` and `ultra` should appear in the surface quality selector
2. Support options — update Z gap values and add Balanced option
3. Add new sections (if using `getFilters()` dynamically these may auto-populate):
   - Seam position
   - Brim
   - Build plate surface
   - Extruder type
   - Filament condition
   - Ironing toggle

If the web app renders options from `getFilters()`, most of this will be automatic. If it has hardcoded option arrays in the HTML/JS, update them to match the new filter data.

Also implement the **Simple/Advanced input split** on the web app: the "Advanced" toggle should now hide the new advanced-only input fields in Simple mode, not just change output depth.

---

## TASK 8 — Sync data files to iOS

After all web project changes are done:
1. Copy `data/nozzles.json` → iOS project `Data/nozzles.json`
2. Copy `data/materials.json` → iOS project `Data/materials.json` (if changed)
3. Copy `engine.js` → iOS project `Engine/engine.js`
4. Copy any new/updated rule files → iOS project `Data/rules/`
5. Run `xcodegen generate` in the iOS project root
6. Run the test suite — ensure 5/5 tests still pass

---

## TASK 9 — Verify engine output

After implementation, test these scenarios manually in the engine (or write unit test cases):

1. PETG + smooth_pei → should produce a `needs_prep` warning about glue stick
2. PA + garolite → should produce no warnings (good combination)
3. ABS + cool_plate → should produce an `avoid` error warning
4. 0.4mm nozzle + ultra surface (0.08mm) → should produce a layer height warning (0.08 > 0.75 * 0.4 = 0.30mm — actually 0.08 < 0.30 so this is fine, skip this test)
5. 0.2mm nozzle + standard surface (0.20mm) → should produce a layer height warning (0.20 = 100% of 0.2mm nozzle, > 75% limit of 0.15mm)
6. Bowden extruder + any material → retraction values should be significantly higher than direct drive
7. Hygroscopic material (PA, PC, PETG) + filament_condition "unknown" → should produce drying warning
8. Brim "auto" + ABS (shrink_risk: high) → brim output should be "large"
9. Ironing "auto" + surface "fine" → ironing should be enabled in output
10. Seam "sharpest_corner" → seam_position should appear in output

---

## EXECUTION ORDER

Run tasks in this order:
1. Task 1 (nozzles.json)
2. Task 2 (option sets / filters)
3. Task 3 (engine.js — all 7 logic changes)
4. Task 8 partial — sync engine.js + nozzles.json + rules to iOS
5. Task 4 (AppState.swift + EngineService.swift)
6. Task 5 (GoalsView.swift)
7. Task 6 (NozzlePickerView.swift)
8. Task 7 (web app options)
9. Task 8 final — re-sync any remaining files, run xcodegen, run tests
10. Task 9 — verification

Commit after each logical group (data, engine, iOS, web). Suggested commit messages:
- `feat: add 5 new nozzle entries (standard/hardened 0.2/0.6/0.8mm)`
- `feat: add phase 2.5b option sets (seam, brim, build_plate, extruder_type, filament_condition, ironing)`
- `feat(engine): add build plate warnings, brim logic, seam output, extruder retraction, filament condition, ironing, layer height constraint`
- `feat(ios): add phase 2.5b AppState fields + GoalsView sections + NozzlePickerView advanced filter`
- `feat(web): phase 2.5b option updates + simple/advanced input split`

---

## IMPORTANT NOTES

- **Do NOT edit engine.js in the iOS project** — always edit the web project's engine.js and copy over
- **Do NOT add data to materials.json in the iOS project** — always edit the web project and copy
- **Module name is `PrintAssistant`** — not `3DPrintAssistant` (Swift can't start module names with digits)
- **Run `xcodegen generate`** after any project.yml changes
- **Valid environment values**: "normal", "cold", "vcold", "humid" — do not add others
- **getFilters() is the single source of truth for all option arrays in iOS** — do not hardcode option lists in Swift views
- The `userLevel` field in AppState currently drives Simple/Advanced output toggle. Reuse this same field to drive input visibility — `userLevel == "advanced"` shows all inputs.
