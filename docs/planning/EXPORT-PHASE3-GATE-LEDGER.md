# Export Phase 3 — OrcaSlicer Gate Ledger

> Status: **OWNER-VERIFY PENDING**. The implementation is intentionally not
> marked stable or live until OrcaSlicer accepts the staged process and
> filament files.

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

## OWNER-VERIFY — required Orca import test

Import both files using **OrcaSlicer → File → Import → Import Configs**:

1. `scripts/fixtures/slicer-golden/_owner-verify/orca-ender3-v3-se-process.json`
2. `scripts/fixtures/slicer-golden/_owner-verify/orca-ender3-v3-se-filament.json`

PASS requires both files to be accepted for **Creality Ender-3 V3 SE 0.4** and
the imported presets to show these spot checks:

- Process: layer height **0.2**, wall loops **3**, outer wall speed **80**,
  inner wall speed **150**.
- Filament: first/other-layer nozzle **225/220**, retraction **0.6**.

Record PASS/FAIL plus the exact Orca error if either file is rejected. A FAIL
keeps Copy fallback as the shipping behavior while the parent/schema mismatch
is corrected and re-tested.
