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
- Phase 4 standard-nozzle allowlist verified 2026-07-11 against official tag
  `version_2.9.4` commit `398a8de69d57d36d8dc6ae5564bbcfe6ad118384`:
  `0.20mm SPEED @COREONEL 0.4` + `Generic PLA @COREONE`, with compatibility
  `COREONEL|COREONELMMU3`, diameter 0.4, and `! nozzle_high_flow[0]`.

## OrcaSlicer — PRESENT, with a deliberate coverage boundary
- Owner fixtures captured 2026-07-06: `orca-x1c-process-ref.json` +
  `orca-x1c-filament-ref.json`. Both use schema `version` **2.1.0.18**; process inherits
  `0.20mm Strength @BBL X1C`, filament inherits `Bambu PLA Basic @BBL X1C`.
- Limitation discovered at Phase 3 cold start: these are X1C fixtures, although this file's
  checklist requested a non-Bambu Orca printer. They prove the JSON schema/version, but not
  non-Bambu vendor parents or a standalone/no-inherits fallback. Standalone export therefore
  remains disabled; unknown printer/nozzle combinations keep the web Copy fallback.
- Initial non-Bambu allowlist verified 2026-07-11 against the official
  `OrcaSlicer/OrcaSlicer` profile registry at commit
  [`4b7182b048a979a3aca40782d9d1685a99f632c4`](https://github.com/OrcaSlicer/OrcaSlicer/commit/4b7182b048a979a3aca40782d9d1685a99f632c4):
  Ender-3 V3, V3 KE, V3 Plus, and V3 SE with a 0.4 mm nozzle. Exact process names come from
  `resources/profiles/Creality/process/0.{12,16,20,24}mm ...`; the PLA filament parent is
  `resources/profiles/Creality/filament/Creality Generic PLA @Ender-3V3-all.json`.
- Phase 3 owner import passed and PR #11 merged/live on 2026-07-11.
