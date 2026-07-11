# Orca Phase 3 Owner-Import Sentinels — Design

**Date:** 2026-07-11  
**Status:** Owner-approved design  
**Scope:** Owner-verification artifacts only; no production serializer changes

## Goal

Make the OrcaSlicer owner import test unmistakable. The imported presets must
have distinctive names and deliberately odd, schema-valid values that are easy
to recognize in OrcaSlicer.

## Artifact layout

Keep the canonical serializer artifacts unchanged:

- `_owner-verify/orca-ender3-v3-se-process.json`
- `_owner-verify/orca-ender3-v3-se-filament.json`

Add two dedicated sentinel artifacts alongside the existing owner-input files:

- `_owner-verify/zz-orca-p3-importtest-process.json`
- `_owner-verify/zz-orca-p3-importtest-filament.json`

The `zz-` prefix groups them with the existing import-test artifacts and makes
them visually distinct from canonical output.

## Sentinel contract

The process preset name and `print_settings_id` will be:

`ZZ ORCA P3 TEST LH019 W4 O83 I147 BR7`

Its deliberate spot-check values are:

- layer height `0.19`
- wall loops `4`
- outer wall speed `83`
- inner wall speed `147`
- brim width `7`

The filament preset name and sole `filament_settings_id` value will be:

`ZZ ORCA P3 TEST N223-217 R073 F097`

Its deliberate spot-check values are:

- first/other-layer nozzle temperature `223/217`
- retraction length `0.73`
- flow ratio `0.97`
- first/other-layer hot/textured plate temperature `57/53`

All Orca parent names, compatible-printer values, version fields, and unrelated
schema fields remain copied from the canonical Ender-3 V3 SE artifacts.

## Verification and documentation

- Extend `scripts/export-audit.js` to assert the sentinel files' exact names,
  values, parent names, and compatible-printer entry.
- Update `EXPORT-PHASE3-GATE-LEDGER.md` so the owner imports the two `zz-` files
  and checks the sentinel values above.
- Keep the canonical-artifact equality checks unchanged, preserving the direct
  serializer-drift guard.
- Run the export audit, JSON/data validation, golden snapshot check, and
  `git diff --check` before committing.

## Stop rule

The Phase 3 PR remains draft and must not merge until the owner reports whether
both sentinel artifacts import successfully in OrcaSlicer. On failure, record
the exact Orca error and retain Copy fallback.
