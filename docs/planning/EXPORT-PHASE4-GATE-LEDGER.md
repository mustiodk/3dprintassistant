# Export Phase 4 — PrusaSlicer Gate Ledger

> Status: **OWNER-VERIFY PASS (2026-07-11)**. The owner imported the staged
> `.ini` bundle and confirmed that both sentinel profiles and their odd values
> are visible in PrusaSlicer.

## Verified scope

- Native `.ini` export is allowlisted to **Prusa CORE One L + standard 0.4 mm
  nozzle + PLA**. Every other Prusa-routed combination retains Copy fallback.
- Config-bundle shape is `[print:...]` + `[filament:...]`; import path is
  **File → Import → Import Config Bundle**.
- Exact PrusaSlicer 2.9.4 parents were verified at official tag commit
  `398a8de69d57d36d8dc6ae5564bbcfe6ad118384`:
  - print: `0.20mm SPEED @COREONEL 0.4`
  - filament: `Generic PLA @COREONE`
- Compatibility is pinned to `COREONEL|COREONELMMU3`, nozzle diameter `0.4`,
  and non-high-flow nozzle. The captured golden is HF0.4, so it supplies the
  key inventory only; it is not used as the standard-nozzle parent.

## Automated evidence

- TDD RED: audit failed because `exportPrusaINI` did not exist; after the
  serializer it passes.
- Export audit: **0 FAIL / 0 warn** across Bambu, Orca, and Prusa.
- Browser: CORE One L standard 0.4 + PLA shows only `↓ Prusa .ini`; the click
  reaches `↓ Done`. MK4S remains on Copy fallback.
- The serializer maps canonical `_slicer_value`/resolved values and omits
  unsupported settings with an explicit comment rather than guessing.
- iOS local mirror: engine bytes equal the web branch; targeted bridge test
  passed after a compile-time RED, and the full suite passes **140/140** on the
  iPhone 17 Pro simulator. iOS UI remains hidden and the push gate remains active.

## OWNER-VERIFY — PASS (owner-run 2026-07-11)

Import:

`scripts/fixtures/slicer-golden/_owner-verify/zz-prusa-p4-importtest.ini`

Use PrusaSlicer's official **CORE One L, standard 0.4 mm** printer profile —
not an HF0.4 profile — then confirm both user presets appear:

- Print `ZZ PRUSA P4 TEST LH019 W4 O83 I147 BR7`: layer height **0.19**,
  perimeters **4**, external/perimeter speed **83/147**, brim **7**.
- Filament `ZZ PRUSA P4 TEST N223-217 R073 F097`: first/other-layer nozzle
  **223/217**, retraction **0.73**, extrusion multiplier **0.97**, and
  first/other-layer bed **57/53**.

Result: **PASS** for both profiles. The owner confirmed that the print preset
and filament preset import successfully and expose the deliberately odd values.
This closes the manual Phase 4 round-trip gate.
