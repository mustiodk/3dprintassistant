# Architecture overview

## One-line summary

Two apps, one engine. `engine.js` is the source of all business logic. The web app runs it in the browser; the iOS app runs the exact same file inside a `JSContext` via JavaScriptCore with a Swift-side `fetch()` polyfill. Data lives in versioned JSON files that both platforms read through the same code path.

## Repos

| Repo | URL | Role |
|------|-----|------|
| `3dprintassistant` | https://github.com/mustiodk/3dprintassistant | Web app (live at [3dprintassistant.com](https://3dprintassistant.com)). Source of truth for `engine.js` + data files. Mirrors to iOS by manual copy. |
| `3dprintassistant-ios` | https://github.com/mustiodk/3dprintassistant-ios | Native iOS app (App Store, live in ~121 countries). Bundles a byte-identical copy of web's `engine.js` + data files as app resources. |

## Directory layout (what matters for review)

### Web (`3dprintassistant/`)

```
3dprintassistant/
├── engine.js                          ← ALL business logic. ~2500 lines.
├── app.js                             ← UI only. Renders filters, chips,
│                                        warnings, checklist, output panels.
│                                        NO business logic.
├── index.html                         ← Shell. Interactive elements generated
│                                        by JS.
├── style.css                          ← Design tokens + responsive layout.
├── feedback-form.js                   ← Native <dialog> modal. Posts to
│                                        /api/feedback Cloudflare Worker.
├── worker.js                          ← Cloudflare Worker entrypoint.
│                                        Routes /api/feedback to the handler,
│                                        delegates everything else to env.ASSETS.
├── wrangler.toml                      ← Cloudflare config.
├── functions/
│   └── api/
│       └── feedback.js                ← The Discord-webhook forwarder.
├── data/
│   ├── printers.json                  ← 64 printers, 12 brands.
│   ├── materials.json                 ← 18 filament types.
│   ├── nozzles.json                   ← 9 nozzle variants.
│   └── rules/
│       ├── environment.json           ← Environmental adjustments.
│       ├── objective_profiles.json    ← Surface / strength / speed presets.
│       ├── warnings.json              ← Shared warning strings.
│       ├── troubleshooter.json        ← Symptom → cause → fix data.
│       └── slicer_capabilities.json   ← Per-slicer valid pattern sets + fallbacks.
├── locales/
│   ├── en.json                        ← EN strings used by engine.js t().
│   └── da.json                        ← Danish translations.
└── docs/
    ├── planning/ROADMAP.md            ← Single source of truth for all planning.
    ├── specs/                         ← IMPL-036 (profile params), IMPL-039
    │                                    (clamping), IMPL-040 (SSOT chip descs),
    │                                    UI-V2-SPEC.
    ├── sessions/                      ← One log per cowork session.
    └── research/                      ← Prior release review, UI critique,
                                         Bambu spec extraction.
```

### iOS (`3dprintassistant-ios/`)

```
3dprintassistant-ios/
├── 3DPrintAssistant/
│   ├── App/
│   │   ├── 3DPrintAssistantApp.swift  ← @main entry. Sentry init, engine load.
│   │   ├── Info.plist                 ← Build metadata.
│   │   └── Assets.xcassets            ← Icon + colors.
│   ├── Engine/
│   │   ├── engine.js                  ← Byte-identical copy of web engine.js.
│   │   └── EngineService.swift        ← actor. Wraps JSContext. fetch()
│   │                                    polyfill reads bundled JSON files.
│   │                                    Exception capture + rethrow.
│   ├── Data/
│   │   ├── printers.json              ← Copy of web data/printers.json.
│   │   ├── materials.json             ← Copy.
│   │   ├── nozzles.json               ← Copy.
│   │   └── rules/
│   │       ├── environment.json
│   │       ├── objective_profiles.json
│   │       ├── warnings.json
│   │       ├── troubleshooter.json
│   │       └── slicer_capabilities.json
│   ├── Models/
│   │   ├── AppState.swift             ← @Observable class. Mirrors the JS
│   │   │                                state shape for resolveProfile.
│   │   ├── FilterGroup.swift          ← Struct for Engine.getFilters output.
│   │   ├── FeedbackCategory.swift     ← 7 feedback categories.
│   │   └── … (many more)
│   ├── Views/
│   │   ├── Home/                      ← Landing screen.
│   │   ├── Configurator/              ← Brand → Printer → Material →
│   │   │   ├── BrandPickerView.swift    Nozzle → Goals flow.
│   │   │   ├── PrinterPickerView.swift
│   │   │   ├── MaterialPickerView.swift
│   │   │   ├── NozzlePickerView.swift
│   │   │   └── GoalsView.swift        ← The chip-based goals picker.
│   │   │                                Consumes Engine.getFilters(state).
│   │   ├── Output/                    ← Profile results + tabs.
│   │   │   ├── OutputView.swift
│   │   │   ├── OutputViewModel.swift
│   │   │   ├── PrintProfileTabView.swift
│   │   │   ├── FilamentSettingsView.swift
│   │   │   └── WarningsBannerView.swift
│   │   ├── Feedback/                  ← Native feedback sheet.
│   │   └── Shared/                    ← Chips, segmented controls.
│   ├── Services/
│   │   └── FeedbackService.swift      ← actor. POSTs to Discord webhook.
│   ├── Utils/
│   │   ├── Strings.swift              ← Centralized UI strings (enables future DK).
│   │   └── ColorTheme.swift           ← Dark-mode tokens.
│   └── Resources/
│       ├── en.lproj/en.json           ← Copy of web locales/en.json.
│       └── da.lproj/da.json           ← Copy.
├── 3DPrintAssistantTests/             ← 20 unit tests, including 2 IMPL-040
│   │                                    parity guards.
│   ├── EngineServiceTests.swift
│   ├── FeedbackTests.swift
│   └── OutputViewModelTests.swift
├── 3DPrintAssistantUITests/           ← XCUITest — cross-device screen capture.
├── project.yml                        ← XcodeGen config. Source of truth
│                                        for pbxproj.
├── fastlane/Fastfile                  ← TestFlight deploy lane.
├── .github/workflows/testflight.yml   ← CI.
├── Config.xcconfig.template           ← Secrets template. Real file gitignored.
└── docs/                              ← Duplicated / outdated — the web
                                         repo's `docs/` is the canonical
                                         source. Flag anything here as
                                         "archived" unless clearly newer.
```

## Execution model

### Web

```
browser
  → loads index.html
  → loads engine.js, app.js (order matters, engine first)
  → engine.init() fetches all data/*.json + locales
  → app.js calls Engine.getFilters(state), Engine.resolveProfile(state),
     Engine.getWarnings(state), etc. on every user interaction
  → renders into DOM
```

No framework. No build step. Just vanilla JS and static files served by Cloudflare.

### iOS

```
3DPrintAssistantApp (@main)
  → EngineService.shared.initialize()
      ↓
  EngineService (actor)
      ↓
  JSContext
      - loads engine.js as source text
      - polyfills fetch() to read bundled Data/ JSON files
      - exposes window, console, setTimeout (no-op)
      - captures exceptions into ExceptionStore
  → Engine.init() runs inside JSContext; loads all data files
  → Swift calls EngineService.resolveProfile(appState) which:
      1. Serializes AppState → JSON dict
      2. JSContext.evaluateScript("Engine.resolveProfile({...})")
      3. Deserializes result back into Swift structs
  → SwiftUI view reads the Swift structs and renders
```

## Key design patterns

### 1. Engine as a shared library

`engine.js` is designed to be completely UI-agnostic. It exports functions that take `state` (a plain object matching `AppState`) and return pure data. No DOM calls. No Swift calls. No side effects except reading bundled JSON once at init.

This is what makes the iOS port cheap — no re-implementation of business logic. Adding a future Mac companion app or a Windows app would reuse this same engine.

### 2. Data-driven over hardcoded

The recent IMPL-039 and IMPL-040 refactors are the strongest expression of this value:

- **IMPL-039** — emit values are clamped to each printer's real capability via `getPrinterLimits(printer, nozzle)`. Formula-based (e.g. `max_layer_height = nozzle × 0.70`) with a `printer.limits_override` escape hatch for printers whose firmware is tighter than the formula. New `data/rules/slicer_capabilities.json` lists per-slicer valid pattern sets with an explicit cross-slicer fallback map. `mapForSlicer(value, field, slicer)` substitutes values at emission time so Prusa users don't see Bambu-only pattern names.
- **IMPL-040** — chip desc numbers are regenerated at render time from the same function that produces the profile. Data file descs are qualitative only ("Fast prints, visible layer lines.") — no embedded numbers. `Engine.getFilters(state)` prepends a computed numeric prefix ("0.14 mm layers — ...") using the exact same clamping path `resolveProfile` uses. Invariant is CI-enforced via XCTest.

### 3. Structured warnings contract

`Engine.getWarnings(state)` returns `[{ id, text, detail, fix }]` — structured objects, stable IDs, not HTML strings. This was a late-April refactor (RB-1). Both platforms consume the same shape. Warnings fire from labeled sections in the engine (C1 filament-condition, C3 layer-height, C5 clamping notices, C6 pattern substitution, etc.).

### 4. Actor isolation on iOS

`EngineService` is declared as an `actor` in Swift, so every call into the JSContext is automatically serialized on a dedicated executor. This prevents a common JavaScriptCore pitfall where concurrent calls from different threads can corrupt the interpreter state.

### 5. Slicer-aware output

Each printer has a default slicer (Bambu / Prusa / Orca). `SLICER_TABS` in `engine.js` defines per-slicer process-tab structure. `SLICER_PARAM_LABELS` defines per-slicer parameter name mappings. The UI switches tab layout based on selected printer.

For Bambu specifically, `exportBambuStudioJSON(state)` generates a fully-formed process preset JSON that matches vendor preset format byte-for-byte (verified against samples in `bambu configs/`). Users can import it directly.

## Data schema quick reference

### Printer (`data/printers.json`)

```js
{
  "id": "x1c",
  "name": "X1 Carbon",
  "manufacturer": "bambu_lab",
  "series": "corexy",             // or "bedslinger"
  "enclosure": "passive",         // "none" | "passive" | "active_heated"
  "extruder_type": "direct_drive",// or "bowden" (auto-detected by retraction code)
  "max_nozzle_temp": 300,
  "max_bed_temp": 120,
  "max_speed": 500,                // Firmware max (mm/s)
  "max_acceleration": 20000,
  "available_nozzle_sizes": [0.2, 0.4, 0.6, 0.8],
  "multi_color_systems": ["ams", "ams_lite", "ams_2_pro"],
  "available_plates": ["cool_plate", "textured_pei", …],
  "active_chamber_heating": false,
  "has_lidar": true,
  "open_door_threshold_bed_temp": 45,   // PLA safety warning threshold
  "notes": ["…"],
  // Optional (IMPL-039):
  "limits_override": { "nozzles": { "0.4": { "max_layer_height": 0.28 } }, "motion": {…} }
}
```

### Material (`data/materials.json`)

```js
{
  "id": "petg_basic",
  "name": "PETG Basic",
  "group": "PETG",
  "difficulty": "intermediate",     // "beginner" | "intermediate" | "advanced"
  "base_settings": {
    "nozzle_temp_base": 260, "nozzle_temp_min": 230, "nozzle_temp_max": 270,
    "bed_temp_base": 75, "bed_temp_min": 60, "bed_temp_max": 85,
    "retraction_distance": 0.8, "retraction_speed": 40,
    "max_mvs": { "0.2": 6, "0.4": 20, "0.6": 22, "0.8": 24 },
    "max_volumetric_speed": 24, "hygroscopic": "medium",
    "pressure_advance": 0.02, "k_factor_matrix": { "0.2": 0.024, "0.4": 0.02, … }
  },
  "properties": { "heat_resistance_celsius": 69, "uv_resistant": false, "flexible": false },
  "shrinkage_factor": 0.004,
  "ventilation_required": false,
  "warnings": ["Long print cooldowns reduce warping."],
  "notes": ["Use glue stick on smooth PEI…"],
  "enclosure_required": false,
  "enclosure_behavior": { "enclosure_strongly_recommended": true },
  "nozzle_requirements": { "material": "steel" },    // or "hardened", "brass"
  "ams_compatible": true,
  "shrink_risk": "medium",
  "flexible": false,
  "abrasive": false,
  "adhesion_risk_pei": "high",
  "fan_policy": "moderate",
  "retraction_max": 1.5,
  "drying": { "oven_temp": 65, "oven_duration_hours": 4 }
}
```

### Objective profiles (`data/rules/objective_profiles.json`)

Surface / strength / speed tier presets. Descs are **qualitative only** since IMPL-040; numeric values live in dedicated fields.

## Where the review needs particular attention

Full list in [REVIEW-BRIEF.md](REVIEW-BRIEF.md), but architecture-wise the high-signal areas are:

1. `getPrinterLimits` + `_clampNum` + `mapForSlicer` helpers near engine.js line 620.
2. `getFilters(state)` near engine.js line 210.
3. `resolveProfile(state)` near engine.js line 1260.
4. `exportBambuStudioJSON(state)` near engine.js line 1870.
5. `EngineService.swift` full file.
6. `EngineServiceTests.swift` — especially the two IMPL-040 parity tests.
7. `GoalsView.swift` — the chip consumer + .onChange refresh logic.

## Known limitations (already tracked — don't re-file)

- EU distribution blocked on DSA Trader Status verification (not a code issue).
- macOS companion app planned but deferred (spec: IMPL-037 / backlog).
- Material-level speed caps (ABS 60, PC 40, PA 50) don't yet scale with `printer.max_speed`. Acknowledged gap; would need a material × printer-class table to fix properly. Consider out of scope for this review unless you see a correctness issue.
- Danish localization is partial — iOS uses hardcoded English strings via `Strings.swift`; `locales/*.json` (engine-t) are fully localized.
