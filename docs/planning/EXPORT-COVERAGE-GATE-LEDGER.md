# Export coverage fix — gate ledger (2026-07-25)

> Status: **SHIPPED.** Web `main` `5962bad` is production-live and verified on
> 3dprintassistant.com; iOS `main` `10fff47` (`MARKETING_VERSION` 1.1.2) is
> pushed and dispatched to TestFlight as run
> [`30155517579`](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/30155517579).
>
> **Owner decision 2026-07-25:** asked whether "unverified" should mean "no
> registry parent" or "not import-tested by a human", the owner chose
> **registry-derived is verified enough** — a name copied verbatim from the
> vendor's own registry counts as verified, and all 62 printers ship with
> export enabled and no Beta distinction. The pre-merge import test below was
> therefore **not** treated as a blocker; the sentinel bundles remain committed
> as a spot-check if a specific printer is ever suspected.

## What was reported

Owner, 2026-07-25, with device screenshots:

- **iOS:** export "only works for Bambu Lab". A Creality K1 (routes to
  OrcaSlicer) and a Prusa CORE One (PrusaSlicer) both showed an `Export for
  <slicer>` row that, when tapped, produced **"Export Failed — files could not
  be generated safely."**
- **Web:** export "is not visible at all" — the same printers showed only the
  `↓ Copy Profile` button with no download controls and no explanation.

## Root cause (one, two symptoms)

`engine.js` allowlisted native export to **17 of 78 printers**:

| Slicer | Covered before | Rule |
|---|---|---|
| Bambu Studio | 12 / 12 | all Bambu printers |
| OrcaSlicer | 4 / 60 | four hand-written Ender-3 V3 rows, 0.4 mm only |
| PrusaSlicer | 1 / 6 | `core_one_l` + `std_0.4` + PLA only |

`exportOrcaJSON` / `exportPrusaINI` return `null` outside that set. `k1` was
never in the Orca table; `core_one` (as distinct from CORE One **L**) was never
in the Prusa one.

The allowlist was narrow *on purpose* — an `inherits` name that does not exist
upstream makes OrcaSlicer file the import under a duplicate custom printer
rather than erroring (EXPORT-PHASE3-GATE-LEDGER.md, 2026-07-11) — but it was
hand-written, which is why it never grew past four printers.

The two surfaces then diverged on the same `null`:

- **Web** degraded correctly (hid the group, showed Copy) but **silently**, so
  it read as a missing feature.
- **iOS** never consulted availability at all: `exportAction(for: slicer)` was
  built from the slicer id, so the row was offered for all 78 printers and the
  61 with no parent fell into the same generic `catch` as a real disk failure.

## What shipped

| # | Commit | Change |
|---|---|---|
| 1 | web `4d463df` | Orca + Prusa parent tables **generated** from the upstream registries by `scripts/gen-slicer-parents.mjs`; `getNativeExportSupport(state)` added as the shared availability contract |
| 2 | web `fa7df33` | web keeps the export hint visible in the fallback branch (`exportHintCopyOnly`, EN + DA) and gates on `getNativeExportSupport` |
| 3 | web `def4988` | Codex P2 ×3: deterministic + in-nozzle process-parent selection, abstract-base exclusion, fatal parse errors, table-wide audit invariants |
| 4 | iOS `dcf5959` | availability-gated export row + `Share profile as text` fallback + distinct failure messages + engine mirror |
| 5 | iOS `6f4b526` | engine re-mirror after `def4988` |

Sources of truth for the generated tables:

- OrcaSlicer `resources/profiles` @ `d6cb667b894f71f68a180861b549f49258cf3a2a` (2026-07-24)
- PrusaSlicer `resources/profiles/PrusaResearch.ini` `config_version = 2.4.14`

### Coverage

| Slicer | Before | After |
|---|---|---|
| Bambu Studio | 12 | 12 |
| OrcaSlicer | 4 | **44** |
| PrusaSlicer | 1 | **6** |
| **Total** | **17 / 78** | **62 / 78** |

Per-nozzle coverage (0.2–0.8 mm) came with it; the old blanket "Orca is 0.4 mm
only" gate is gone.

The 16 that stay on the copy fallback are **not** an oversight:

- Registry machine names encode build volume with no unambiguous 3dpa
  counterpart: `voron_2_4`, `voron_trident`, `voron_0_2`, `ratrig_vcore4`,
  `vzbot_330`, `vzbot_235`.
- No upstream machine at this registry commit: `ender3_v4_combo`, `sparkx_i7`,
  `kobra_3_v2`, `mega_x`, `plus4`, `max4`, `sv04`, `guider_3`,
  `snapmaker_2_a350`, `aries`.

Guessing a parent name for any of these is the exact failure mode the table
exists to prevent. They now show *why* on both surfaces.

## Automated evidence (all green)

- `node scripts/gen-slicer-parents.mjs … --check` → PASS both tables (44 / 6)
- `node scripts/export-audit.js` → **0 FAIL / 0 warn / 5 info**
- `node scripts/validate-data.js` → all data files valid
- `node scripts/walkthrough-harness.js` → exit 0
- `node scripts/engine-golden-snapshot.js --check` → **NO DRIFT (39 states)**
- iOS `xcodebuild test` → **196 / 196**, 0 failures (+4 new)
- `cmp` web `engine.js` ↔ iOS bundled `engine.js` → byte-identical

### Method validation

The generator independently reproduces, byte for byte, values a human already
verified in the real slicers:

- all four owner-verified Ender-3 V3 SE Orca parents + `Creality Generic PLA
  @Ender-3V3-all` (owner-verify PASS 2026-07-11)
- CORE One L's `0.20mm SPEED @COREONEL 0.4` **and** its
  `… and ! nozzle_high_flow[0]` condition (Phase 4)

### Behaviour verified on the surfaces

- Web (localhost): K1 → `↓ Orca Process` + `↓ Orca Filament`; CORE One → `.ini`
  control with the COREONE parents; Voron 2.4 → Copy + explanation. No console
  errors.
- iOS (iPhone 17 Pro sim): K1 + PLA + 0.4 → share sheet with **2 Documents**
  (was the Export Failed alert). K1 + 0.2 (no upstream machine) → `Share profile
  as text` row with the explanatory subtitle, no alert.

## Independent review

`bridge --mode codex-only`, 403 s, on the full cross-repo diff:
**GO, no P0/P1**, three P2 should-fix. All three were confirmed real and fixed
in `def4988`; two of them exposed live wrong picks (`creator_5_pro` 0.6
inheriting a 0.8-nozzle preset, `u1` 0.4 inheriting a support-material preset)
that the automated gates had passed.

Transcript is a scratchpad artefact, not committed; findings and dispositions
are recorded above and in `def4988`.

## OWNER-VERIFY — OPTIONAL SPOT-CHECK (owner ruled it non-blocking)

Kept because it is still the only check that proves a preset resolves inside a
real slicer, and Phase 3's diagnostic is that an unresolvable parent imports
*silently wrong* rather than failing. Run it if a specific printer is ever
suspected.

**1. OrcaSlicer → File → Import → Import Configs…**

- `scripts/fixtures/slicer-golden/_owner-verify/zz-orca-k1-importtest-process.json`
- `scripts/fixtures/slicer-golden/_owner-verify/zz-orca-k1-importtest-filament.json`

PASS = both presets appear under OrcaSlicer's official **Creality K1 (0.4
nozzle)** profile — *not* under a duplicate custom printer — with
`ZZ ORCA K1 TEST` inheriting `0.20mm Standard @Creality K1 (0.4 nozzle)` and
`ZZ ORCA K1 FIL TEST` inheriting `Creality Generic PLA`.

**2. PrusaSlicer → File → Import → Import Config Bundle…**

- `scripts/fixtures/slicer-golden/_owner-verify/zz-prusa-coreone-importtest.ini`

PASS = `ZZ PRUSA COREONE TEST` + `ZZ PRUSA COREONE FIL TEST` appear for
**CORE One** with a standard 0.4 mm nozzle.

Both surfaces already shipped, so a FAIL here is a bug report rather than a
merge gate. On FAIL: capture what OrcaSlicer/PrusaSlicer logged about the unresolved parent
— that names the exact generator rule to correct, and the fix applies to the
whole vendor family at once, not just that printer.

## Follow-ups (not blocking)

- The 16 uncovered printers need either a 3dpa-side build-volume field (Voron /
  RatRig / VzBot) or an upstream registry that has them. Revisit on a registry
  refresh; `--check` will surface new coverage automatically.
- iOS `Strings.Output` is English-only, so the new export row and its note are
  not localised to Danish while the web strings are. Consistent with the rest of
  the Output screen; worth a sweep if the screen is localised.
- `getNativeExportSupport` runs a full export per render/profile load on both
  surfaces (same cost the web already paid). If the Output screen ever gets
  slow on older devices, memoise on the state fingerprint.
