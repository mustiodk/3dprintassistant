# Phase 2.7a — Profile Export (Bambu Studio .json + Text + Copy)

## Context
3D Print Assistant — web app (`3dprintassistant/`) + iOS app (`3dprintassistant-ios/`).
- Web is the source of truth for `engine.js` and `data/*.json` — edit there, then sync to iOS.
- engine.js already has `exportProfile(state)` (line ~1501) that returns structured JSON with `_meta`, `filament`, and `process` sections.
- engine.js uses `S(value, why)` / `A(value, why)` helpers — each resolved param has `.value` and `.why`.
- Web app.js has an export button (`#exportBtn`) wired to a placeholder (lines 724–733, shows "Coming in hot" for 2s, does nothing).
- iOS has no export code. No share button in OutputView.
- Locale files: `locales/en.json` + `da.json` (web); `en.lproj/en.json` + `da.lproj/da.json` (iOS).
- iOS module name: `PrintAssistant`.

## Reference files (READ THESE FIRST)
- `3dprintassistant-ios/research/bambu-studio-export-spec-gemini.md` — **PRIMARY REFERENCE.** Complete Bambu Studio JSON schema analysis from actual exported files. Contains field mapping table, metadata requirements, value format rules, minimum viable export examples, and known gotchas.
- `3dprintassistant-ios/research/bambu-studio-json-schema.md` — Additional field reference from Bambu Studio GitHub source code.

## Goal
Three export tiers, in priority order:
1. **Export as Bambu Studio .json** — downloadable process + filament profile files that import directly into Bambu Studio (Bambu printers only)
2. **Copy full profile as formatted text** — clipboard (web) / share sheet (iOS), works for all printers
3. **Copy individual param values** — click/long-press a row to copy a single value

---

## CRITICAL: Bambu Studio Import Rules

These rules come from testing actual Bambu Studio imports. **Violating any of them will cause silent import failure.**

1. **ALL values must be strings** — no numbers, no booleans. `"0.2"` not `0.2`, `"1"` not `true`.
2. **`from` must be `"User"` (capital U)** — not `"user"`.
3. **`inherits` CANNOT be empty** — must reference an exact system profile name installed in Bambu Studio (e.g. `"0.20mm Standard @BBL X1C"` or `"Bambu PLA Basic @BBL P1S 0.4 nozzle"`).
4. **`print_settings_id` (process) is a String** matching the `name` field exactly.
5. **`filament_settings_id` (filament) is an ARRAY of Strings** — `["My Profile Name"]` not `"My Profile Name"`. This is a common trap.
6. **`version` field is required** — use `"2.5.0.14"` or current Bambu Studio version string.
7. **Do NOT include a `type` field** — Bambu infers type from the settings_id key.
8. **Do NOT include `compatible_printers`** — inherited from parent profile.
9. **Only include overridden fields** — leverage inheritance. The fewer fields, the safer the import.
10. **Speeds/accelerations are Arrays of Strings** — `["300"]` for single extruder.
11. **Temperatures are Arrays of Strings** — `["220"]`.
12. **Percentages keep the % sign** — `"15%"`, `"60%"`.
13. **Enums must be lowercase** — `"gyroid"` not `"Gyroid"`, `"aligned"` not `"Aligned"`.
14. **Bambu typo is intentional** — the field is `elefant_foot_compensation` (one L).

---

## Task 1: Bambu Studio profile name lookup tables in engine.js

The `inherits` field must exactly match a system profile name. Add two lookup tables:

### Process profile inheritance map
Maps `(printer_id, layer_height)` → Bambu Studio process profile name.

```javascript
const BAMBU_PROCESS_INHERITS = {
  // X1 Carbon / X1 / P1S / X1E (CoreXY, share process profiles)
  'bambu_x1c':  { '0.08': '0.08mm Extra Fine @BBL X1C', '0.12': '0.12mm Fine @BBL X1C', '0.16': '0.16mm Optimal @BBL X1C', '0.20': '0.20mm Standard @BBL X1C', '0.24': '0.24mm Draft @BBL X1C', '0.28': '0.28mm Extra Draft @BBL X1C' },
  'bambu_x1':   { /* same as X1C or use X1 variants if they exist */ },
  'bambu_p1s':  { '0.08': '0.08mm Extra Fine @BBL X1C', '0.12': '0.12mm Fine @BBL X1C', '0.16': '0.16mm Optimal @BBL X1C', '0.20': '0.20mm Standard @BBL X1C', '0.24': '0.24mm Draft @BBL X1C', '0.28': '0.28mm Extra Draft @BBL X1C' },
  'bambu_x1e':  { /* same as X1C */ },
  // P1P
  'bambu_p1p':  { '0.08': '0.08mm Extra Fine @BBL P1P', '0.12': '0.12mm Fine @BBL P1P', '0.16': '0.16mm Optimal @BBL P1P', '0.20': '0.20mm Standard @BBL P1P', '0.24': '0.24mm Draft @BBL P1P', '0.28': '0.28mm Extra Draft @BBL P1P' },
  // A1
  'bambu_a1':   { '0.08': '0.08mm Extra Fine @BBL A1', '0.12': '0.12mm Fine @BBL A1', '0.16': '0.16mm Optimal @BBL A1', '0.20': '0.20mm Standard @BBL A1', '0.24': '0.24mm Draft @BBL A1', '0.28': '0.28mm Extra Draft @BBL A1' },
  // A1 mini
  'bambu_a1m':  { '0.08': '0.08mm Extra Fine @BBL A1M', '0.12': '0.12mm Fine @BBL A1M', '0.16': '0.16mm Optimal @BBL A1M', '0.20': '0.20mm Standard @BBL A1M', '0.24': '0.24mm Draft @BBL A1M', '0.28': '0.28mm Extra Draft @BBL A1M' },
};
```

**IMPORTANT:** These profile name strings must be EXACT. Verify against the Bambu Studio source code at `resources/profiles/BBL/process/` — the filenames (without .json) ARE the profile names. Cross-check with the file listing in `research/bambu-studio-json-schema.md`. Some profiles use `@BBL X1C` while some use `@BBL P1P` etc. P1S shares process profiles with X1C in Bambu Studio (they're listed in `compatible_printers` of the X1C profiles).

### Filament profile inheritance map
Maps `(material_id, printer_id, nozzle_size)` → Bambu Studio filament profile name.

```javascript
const BAMBU_FILAMENT_INHERITS = {
  // Format: "Bambu {Material} @BBL {Printer} {nozzle} nozzle"
  // or for generic: "Generic {Material} @BBL {Printer} {nozzle} nozzle"
  'pla':     { 'default': 'Bambu PLA Basic @BBL X1C' },
  'petg':    { 'default': 'Bambu PETG Basic @BBL X1C' },
  'abs':     { 'default': 'Bambu ABS @BBL X1C' },
  'asa':     { 'default': 'Bambu ASA @BBL X1C' },
  'tpu_95a': { 'default': 'Bambu TPU 95A @BBL X1C' },
  'pa':      { 'default': 'Generic PA @BBL X1C' },
  'pa_cf':   { 'default': 'Generic PA-CF @BBL X1C' },
  'pc':      { 'default': 'Generic PC @BBL X1C' },
  // ... etc for all 18 materials
};
```

**IMPORTANT:** These filament profile name strings ALSO must be exact. Check Bambu Studio source at `resources/profiles/BBL/filament/` for the actual names. Some materials may not have Bambu-branded profiles and need `Generic` prefix. Some may include nozzle-specific variants (e.g. `@BBL P1S 0.4 nozzle`). If exact filament+printer combo doesn't exist, fall back to the generic X1C variant.

**Implementation note:** The exact printer_id strings used in these maps must match whatever IDs `printers.json` uses for Bambu printers. Check that file to get the right keys. You may need to add a `bambu_export_id` field to each Bambu printer in `printers.json` if the current IDs don't map cleanly.

### Nozzle variant handling
Some Bambu profiles are nozzle-specific (e.g. `@BBL A1 0.2 nozzle`). For non-0.4mm nozzles, the lookup should try nozzle-specific names first, then fall back to the default 0.4mm variant. Example: `0.08mm Extra Fine @BBL A1 0.2 nozzle` exists for 0.2mm nozzle on A1.

### Layer height → surface quality mapping
Our app uses surface quality names (draft, standard, fine, etc.) not layer heights directly. The `resolveProfile()` output includes `layer_height` with a value like `"0.20 mm"`. Extract the numeric part to look up the correct `inherits` profile. Use the closest available if exact match doesn't exist (e.g. our `0.10mm` → Bambu's `0.08mm Extra Fine` or `0.12mm Fine`).

## Task 2: `exportBambuStudioJSON(state)` in engine.js

New function returns `{ process: {...}, filament: {...} }` — two minimal JSON objects ready for download.

**Architecture: ONLY include fields we override.** Leverage inheritance for everything else.

```javascript
function exportBambuStudioJSON(state) {
  const printer  = getPrinter(state.printer);
  const material = getMaterial(state.material);
  const nozzle   = getNozzle(state.nozzle);
  if (!printer || !material || !nozzle) return null;

  // Only Bambu printers
  const slicer = getSlicerForPrinter(state.printer);
  if (slicer !== 'bambu') return null;

  const profile = resolveProfile(state);
  const temps   = getAdjustedTemps(state.material, state.environment, state.nozzle, state.speed);
  const adv     = getAdvancedFilamentSettings(state);

  // --- Determine inheritance targets ---
  const layerHeight = extractNumeric(profile.layer_height?.value); // "0.20 mm" → "0.20"
  const printerId = state.printer; // e.g. "bambu_p1s"
  const processParent = findProcessParent(printerId, layerHeight);
  const filamentParent = findFilamentParent(state.material, printerId, nozzle.size);

  if (!processParent || !filamentParent) return null; // Can't export without valid parents

  // --- Build process profile (minimal overrides only) ---
  const profileName = `3DPA ${material.name} ${layerHeight}mm @${printer.name}`;

  const processJSON = {
    from: 'User',
    inherits: processParent,
    name: profileName,
    print_settings_id: profileName,
    version: '2.5.0.14',
  };

  // Only include fields our engine actually overrides from the Bambu default
  // Use the BAMBU_PROCESS_MAP for field name translation
  // Strip units, convert to correct format
  const overrideFields = [
    // Always include these core fields our engine calculates:
    'layer_height', 'wall_loops', 'top_shell_layers', 'bottom_shell_layers',
    'sparse_infill_density', 'sparse_infill_pattern', 'top_surface_pattern',
    'seam_position', 'wall_generator',
    // Speeds (array-wrapped)
    'outer_wall_speed', 'inner_wall_speed', 'sparse_infill_speed',
    'internal_solid_infill_speed', 'top_surface_speed', 'bridge_speed',
    'initial_layer_speed', 'travel_speed',
    // Accelerations (array-wrapped)
    'default_acceleration', 'outer_wall_acceleration', 'inner_wall_acceleration',
    'top_surface_acceleration', 'initial_layer_acceleration', 'travel_acceleration',
    // Support
    'enable_support', 'support_type', 'support_threshold_angle',
    // Others
    'brim_width', 'elephant_foot_compensation', 'bridge_flow',
    'ironing', 'xy_hole_compensation',
  ];

  for (const engineId of overrideFields) {
    const param = profile[engineId];
    if (!param || param.value === undefined) continue;

    const bambuField = BAMBU_PROCESS_MAP[engineId];
    if (!bambuField) continue;

    let val = stripUnits(String(param.value)); // "300 mm/s" → "300"

    // Lowercase enums
    if (['sparse_infill_pattern', 'top_surface_pattern', 'bottom_surface_pattern',
         'seam_position', 'wall_generator', 'support_type', 'support_style'].includes(engineId)) {
      val = val.toLowerCase();
    }

    // Map ironing: our boolean/enum → Bambu's enum
    if (engineId === 'ironing') {
      val = (val === 'on' || val === 'true' || val === '1') ? 'top' : 'no ironing';
    }

    // Map enable_support: boolean → "0"/"1"
    if (engineId === 'enable_support') {
      val = (val === 'true' || val === 'yes' || val === '1' || val === 'on') ? '1' : '0';
    }

    // Array-wrap speed/accel fields
    if (isArrayField(bambuField)) {
      processJSON[bambuField] = [val];
    } else {
      processJSON[bambuField] = val;
    }
  }

  // --- Build filament profile (minimal overrides only) ---
  const filamentName = `3DPA ${material.name}`;

  const filamentJSON = {
    from: 'User',
    inherits: filamentParent,
    name: filamentName,
    filament_settings_id: [filamentName],  // ARRAY of strings!
    version: '2.5.0.14',
  };

  // Temperatures
  if (temps) {
    if (temps.nozzle !== undefined) {
      filamentJSON.nozzle_temperature = [String(temps.nozzle)];
    }
    if (temps.nozzle_initial !== undefined) {
      filamentJSON.nozzle_temperature_initial_layer = [String(temps.nozzle_initial)];
    }
    const bedTemp = temps.bed !== undefined ? String(temps.bed) : null;
    const bedTempInit = temps.bed_initial !== undefined ? String(temps.bed_initial) : bedTemp;
    if (bedTemp) {
      // Set both plate types to be safe
      filamentJSON.hot_plate_temp = [bedTemp];
      filamentJSON.hot_plate_temp_initial_layer = [bedTempInit];
      filamentJSON.textured_plate_temp = [bedTemp];
      filamentJSON.textured_plate_temp_initial_layer = [bedTempInit];
    }
  }

  // Flow / retraction / PA from material base settings
  if (material.base_settings) {
    const bs = material.base_settings;
    if (bs.max_mvs) {
      const mvs = bs.max_mvs[String(nozzle.size)] || bs.max_mvs['0.4'];
      if (mvs) filamentJSON.filament_max_volumetric_speed = [String(mvs)];
    }
    if (bs.flow_ratio !== undefined) filamentJSON.filament_flow_ratio = [String(bs.flow_ratio)];
    if (bs.pressure_advance !== undefined) filamentJSON.pressure_advance = [String(bs.pressure_advance)];
    if (bs.retraction_length !== undefined) filamentJSON.filament_retraction_length = [String(bs.retraction_length)];
    if (bs.retraction_speed !== undefined) filamentJSON.filament_retraction_speed = [String(bs.retraction_speed)];
  }

  // Fan
  if (adv && adv.fan_speed !== undefined) {
    filamentJSON.fan_min_speed = [String(adv.fan_speed)];
    filamentJSON.fan_max_speed = [String(adv.fan_speed)];
  }

  return { process: processJSON, filament: filamentJSON };
}

// --- Helper functions ---

function stripUnits(val) {
  return val.replace(/\s*(mm\/s²|mm\/s|mm|°C)\s*$/i, '').trim();
}

function extractNumeric(val) {
  if (!val) return null;
  const match = String(val).match(/[\d.]+/);
  return match ? match[0] : null;
}

function isArrayField(bambuField) {
  return BAMBU_ARRAY_FIELDS.has(bambuField);
}

function findProcessParent(printerId, layerHeight) {
  const printerMap = BAMBU_PROCESS_INHERITS[printerId];
  if (!printerMap) return null;
  // Exact match first, then closest
  if (printerMap[layerHeight]) return printerMap[layerHeight];
  // Find closest available layer height
  const available = Object.keys(printerMap).map(Number).sort();
  const target = parseFloat(layerHeight);
  let closest = available[0];
  for (const h of available) {
    if (Math.abs(h - target) < Math.abs(closest - target)) closest = h;
  }
  return printerMap[String(closest)] || null;
}

function findFilamentParent(materialId, printerId, nozzleSize) {
  const matMap = BAMBU_FILAMENT_INHERITS[materialId];
  if (!matMap) return null;
  // Try printer+nozzle specific, then printer, then default
  const key = `${printerId}_${nozzleSize}`;
  return matMap[key] || matMap[printerId] || matMap['default'] || null;
}
```

**Expose `exportBambuStudioJSON` in the public API.**

**CRITICAL: Populate the lookup tables with EXACT Bambu Studio profile names.** Cross-reference with:
1. The Bambu Studio source code at `github.com/bambulab/BambuStudio/tree/master/resources/profiles/BBL/process/` (filenames without .json = profile names)
2. The filament profiles at `github.com/bambulab/BambuStudio/tree/master/resources/profiles/BBL/filament/`
3. The reference files in `research/`

If you can't determine the exact profile name for a printer/material combo, **skip that combo in the map and return null** from the export function. Better to not export than to export a broken file.

## Task 3: `formatProfileAsText(state)` in engine.js

Text export for all printers (non-Bambu fallback + general sharing). Add near `exportProfile()`.

The function should:
1. Call `resolveProfile()`, `getAdjustedTemps()`, `getWarnings()`, `getChecklist()`, `getAdvancedFilamentSettings()`
2. Format as human-readable text with sections:
   - Header: printer, nozzle, material
   - Goals summary (surface, speed, strength, environment)
   - One section per slicer tab with param label + value (use `SLICER_PARAM_LABELS[slicer][paramId]`)
   - Filament settings (temps, fan, MVS, retraction)
   - Warnings (text + fix)
   - Critical checklist items
   - Footer: "Generated by 3dprintassistant.com"
3. Return a single string

**Expose in public API.**

## Task 4: Download handler in app.js (web project)

Replace the placeholder export button handler:

```javascript
document.getElementById('exportBtn').addEventListener('click', () => {
  if (!state.printer || !state.nozzle || !state.material) return;

  track('export_clicked', { printer: state.printer, nozzle: state.nozzle, material: state.material });

  const slicer = Engine.getSlicerForPrinter(state.printer);

  if (slicer === 'bambu') {
    const result = Engine.exportBambuStudioJSON(state);
    if (result) {
      // Download process profile
      downloadJSON(result.process, `3DPA_process_${state.material}.json`);
      // Small delay so browser doesn't block second download
      setTimeout(() => downloadJSON(result.filament, `3DPA_filament_${state.material}.json`), 300);
      flashButton('exportBtn', T('exportDownloaded'), 'var(--green)', 2000);
      return;
    }
  }

  // Fallback: copy as text (non-Bambu printers, or if Bambu export fails)
  const text = Engine.formatProfileAsText(state);
  if (text) {
    navigator.clipboard.writeText(text).then(() => {
      flashButton('exportBtn', T('exportCopied'), 'var(--green)', 2000);
    });
  }
});

function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 4)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function flashButton(id, text, color, ms) {
  const btn = document.getElementById(id);
  const orig = btn.textContent;
  const origColor = btn.style.color;
  btn.textContent = text;
  btn.style.color = color;
  setTimeout(() => { btn.textContent = orig; btn.style.color = origColor; }, ms);
}
```

**UX:** Update export button label dynamically when printer changes:
- Bambu printer selected: "Export to Bambu Studio"
- Non-Bambu printer: "Copy Profile"

## Task 5: Click-to-copy on individual param rows (web project)

In app.js, add click handler on `.setting-row` elements:
- Click copies `"Label: Value"` to clipboard
- Brief green flash (`.copied-flash` class, 600ms)
- Cursor pointer + subtle hover state

```css
.setting-row { cursor: pointer; transition: background-color 0.3s; }
.setting-row:hover { background-color: rgba(0, 229, 160, 0.05); }
.copied-flash { background-color: rgba(0, 229, 160, 0.15) !important; }
```

## Task 6: Locale strings (web project)

`locales/en.json`:
```json
"exportDownloaded": "Downloaded!",
"exportCopied": "Copied to clipboard!",
"exportCopiedSingle": "Copied!",
"exportBambuBtn": "Export to Bambu Studio",
"exportCopyBtn": "Copy Profile"
```

`locales/da.json`:
```json
"exportDownloaded": "Downloadet!",
"exportCopied": "Kopieret til udklipsholder!",
"exportCopiedSingle": "Kopieret!",
"exportBambuBtn": "Eksportér til Bambu Studio",
"exportCopyBtn": "Kopiér profil"
```

## Task 7: iOS — EngineService bridge

Add two methods to `EngineService.swift`:
```swift
func exportBambuStudioJSON(_ state: [String: Any]) -> (process: [String: Any], filament: [String: Any])?
func formatProfileAsText(_ state: [String: Any]) -> String?
```
Follow the same pattern used by `resolveProfile()` for state passing and result parsing.

## Task 8: iOS — Export UI in OutputView

Toolbar menu with contextual options:
```swift
.toolbar {
    ToolbarItem(placement: .topBarTrailing) {
        Menu {
            if isBambuPrinter {
                Button(action: exportBambuJSON) {
                    Label("Export to Bambu Studio", systemImage: "arrow.down.doc")
                }
            }
            ShareLink(item: profileText) {
                Label("Share as Text", systemImage: "doc.on.doc")
            }
        } label: {
            Image(systemName: "square.and.arrow.up")
        }
    }
}
```

For Bambu .json: write both JSON objects to temp files → present via share sheet so user can AirDrop/save to Files.

## Task 9: iOS — Long-press copy on ParamRow

Add `.onLongPressGesture` to ParamRow in SharedComponents.swift:
- Copy `"Label: Value"` to pasteboard
- Light haptic (`UIImpactFeedbackGenerator(style: .light)`)
- Brief green flash

## Task 10: Sync to iOS

1. Copy `engine.js` from `3dprintassistant/` to `3dprintassistant-ios/3DPrintAssistant/Engine/`
2. Copy locale files
3. Run `xcodegen generate`
4. Run tests — 6/6 passing

## Task 11: Test scenarios

### Bambu .json export (highest priority)
1. **P1S + PLA + 0.4mm + Standard surface:** Export → open process .json → verify: `from: "User"`, `inherits` points to exact Bambu profile name, `print_settings_id` matches `name`, `version` present, all values are strings, speeds in arrays
2. **Verify filament .json:** `filament_settings_id` is ARRAY, inherits exact Bambu filament profile, temps in arrays
3. **Import into Bambu Studio:** File > Import Configs > select both .json files → verify they appear in process/filament lists without errors
4. **Values check:** Open imported profile in Bambu Studio → verify layer height, speeds, temps match what app recommended
5. **A1 mini + PETG:** Different printer → verify correct inheritance target
6. **Non-0.4mm nozzle:** 0.6mm nozzle → verify nozzle-specific profile if available

### Fallback and text
7. **Prusa MK4 (non-Bambu):** Export → verify text copied to clipboard
8. **Bambu printer but unknown material:** If no filament parent found → verify graceful fallback to text

### Individual copy
9. **Web click-to-copy:** Click param row → verify clipboard
10. **iOS long-press:** Long-press → verify haptic + clipboard

## Execution order
1 (lookup tables) → 2 (export function) → 3 (text export) → 4 + 5 + 6 (web UI) → commit web → 10 (sync) → 7 + 8 + 9 (iOS) → commit iOS → 11 (test)

## Known gotchas (from Gemini analysis — pass to developer)
1. `print_settings_id` is a **String**, but `filament_settings_id` is an **Array of Strings**. Legacy quirk — getting it wrong kills import.
2. Ensure ZERO floats or integers in the JSON output. Slic3r parsers throw silent errors.
3. `inherits` must target an existing system profile. If the string doesn't match an installed profile exactly, import fails silently.
4. All enum values must be lowercase: `"gyroid"` not `"Gyroid"`, `"aligned"` not `"Aligned"`.
5. While Bambu exports sometimes use `["20", "nil"]`, generating `["20"]` is safer.
6. Bambu's field is `elefant_foot_compensation` (one L) — this is their actual typo, match it exactly.
