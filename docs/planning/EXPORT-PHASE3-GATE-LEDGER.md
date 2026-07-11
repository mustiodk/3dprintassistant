# Export Phase 3 — OrcaSlicer Gate Ledger

> Status: **OWNER-VERIFY PASS 2026-07-11; PR merge/live verification pending**.

## Scope and source truth

- Native Orca JSON is allowlisted to the verified Creality Ender-3 V3 family
  (`ender3_v3`, `ender3_v3_ke`, `ender3_v3_plus`, `ender3_v3_se`) with the
  0.4 mm nozzle. Other Orca-routed printers/nozzles retain Copy fallback.
- Exact process, filament, and compatible-printer parent names were verified
  against `OrcaSlicer/OrcaSlicer` commit
  `4b7182b048a979a3aca40782d9d1685a99f632c4` on 2026-07-11.
- Owner X1C fixtures establish the Orca schema/version. The Ender allowlist is
  deliberately narrower because the fixture set does not prove other vendor
  parent names or standalone fallback behavior.

## Automated evidence

- Web: validate-data green; walkthrough green; export-audit **0 FAIL / 0 warn**;
  39-state golden snapshot has no drift; `git diff --check` green.
- Browser: Ender-3 V3 SE 0.4 shows native Orca Process + Filament downloads;
  K2 SE remains on Copy fallback; download click reaches the Done state.
- iOS local mirror: engine bytes equal the web branch and the full suite passes
  **139 tests / 0 failures** on iPhone 17 Pro simulator. iOS UI remains hidden.

## OWNER-VERIFY — PASS 2026-07-11

Import both files using **OrcaSlicer → File → Import → Import Configs**:

1. `scripts/fixtures/slicer-golden/_owner-verify/zz-orca-p3-importtest-process.json`
2. `scripts/fixtures/slicer-golden/_owner-verify/zz-orca-p3-importtest-filament.json`

**PASS recorded from the owner:** both presets are visible under OrcaSlicer's
official **Creality Ender-3 V3 SE 0.4 nozzle** profile and every sentinel value
matches:

- Process `ZZ ORCA P3 TEST LH019 W4 O83 I147 BR7`: layer height **0.19**,
  wall loops **4**, outer/inner wall speed **83/147**, brim width **7**.
- Filament `ZZ ORCA P3 TEST N223-217 R073 F097`: first/other-layer nozzle
  **223/217**, retraction **0.73**, flow ratio **0.97**, and first/other-layer
  hot/textured plate **57/53**.

Diagnostic note: Orca initially hid both presets under a custom duplicate
`Creality Creality Ender-3 V3 SE 0.4 nozzle` profile. Its log showed the process
parent could not be resolved. Selecting Orca's official single-`Creality`
profile loaded both user presets; the full value check then passed.
