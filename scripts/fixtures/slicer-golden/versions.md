# Golden fixture provenance

Recorded 2026-07-06. The export-audit harness (IMPL-043 Phase 0) resolves the correct
`version` string and inherits-parent names from these files, so keep this current when refreshed.

## Bambu Studio — PRESENT
- `bambu-x1c-process.json` — user preset `0.20mm Standard @BBL X1C - Copy`, inherits
  `0.20mm Standard @BBL X1C`, schema `version` **2.5.0.14**.
- `bambu-x1c-filament.json` — user preset `Bambu PLA Basic 230 55`, inherits
  `Bambu PLA Basic @BBL P1S 0.4 nozzle`, schema `version` **2.5.0.18**.
- Note for Phase 0: process schema (2.5.0.14) and filament schema (2.5.0.18) differ; the app
  currently hardcodes a single `version: '2.5.0.14'` (IMPL-043 LOW-007) — resolve empirically.
- App version: (owner to confirm from Help ▸ About if the schema strings need cross-checking.)

## PrusaSlicer — PRESENT
- `prusa-coreone-config.ini` — `File ▸ Export ▸ Export Config` full current config, 365 settings,
  from **PrusaSlicer 2.9.4**.
- Reference presets in this config:
  - print: `0.20mm SPEED @COREONEL HF0.4`
  - filament: `Generic ABS @COREONE HF0.4`
  - printer: `Prusa CORE One L HF0.4 nozzle`

## OrcaSlicer — DEFERRED
- Export was failing on the installed build; owner reinstalling (v2.4.1 in Downloads).
- Orca native export is IMPL-043 **Phase 3** (later), so Phase 0 proceeds on Bambu + Prusa now.
- To add later: File ▸ Export ▸ Export Preset Bundle → Process presets(.zip) + Filament
  presets(.zip), unzip, drop `orca-<printer>-process.json` + `orca-<printer>-filament.json` here,
  and add an OrcaSlicer section above.
