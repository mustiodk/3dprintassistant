# Orca Phase 3 Owner-Import Sentinels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add unmistakable OrcaSlicer owner-import sentinel artifacts without changing the production serializer or its canonical reference artifacts.

**Architecture:** Preserve the two canonical Ender-3 V3 SE JSON files as exact serializer-drift guards. Add two separate `zz-orca-p3-importtest-*` fixtures with owner-approved odd values, extend the existing export audit to pin their schema and sentinel contract, and retarget the Phase 3 owner gate to those files.

**Tech Stack:** JSON fixtures, Node.js audit harness, Markdown gate ledger, Git

## Global Constraints

- Work only in the existing isolated worktree `/private/tmp/3dpa-export-phase3-orca` on branch `codex/export-phase3-orca`.
- Do not modify `engine.js`, `app.js`, the iOS mirror, or either canonical `orca-ender3-v3-se-*` artifact.
- Keep exact Orca parent names, compatible-printer value, and version `2.1.0.18` from the canonical artifacts.
- Keep PR #11 draft until the owner records an OrcaSlicer import PASS.

---

### Task 1: Add and pin the Orca owner-import sentinels

**Files:**
- Create: `scripts/fixtures/slicer-golden/_owner-verify/zz-orca-p3-importtest-process.json`
- Create: `scripts/fixtures/slicer-golden/_owner-verify/zz-orca-p3-importtest-filament.json`
- Modify: `scripts/export-audit.js`
- Modify: `docs/planning/EXPORT-PHASE3-GATE-LEDGER.md`

**Interfaces:**
- Consumes: canonical Orca artifacts and `ownerVerifyDir` from the existing Orca audit block.
- Produces: two importable JSON presets whose names and values form the owner-visible sentinel contract.

- [ ] **Step 1: Add failing existence and sentinel-contract checks**

Insert after the canonical owner-artifact equality checks in the Orca audit block:

```js
    const sentinelProcessPath = path.join(ownerVerifyDir, 'zz-orca-p3-importtest-process.json');
    const sentinelFilamentPath = path.join(ownerVerifyDir, 'zz-orca-p3-importtest-filament.json');
    const hasSentinelProcess = fs.existsSync(sentinelProcessPath);
    const hasSentinelFilament = fs.existsSync(sentinelFilamentPath);
    checkFail('owner-verify Orca process sentinel exists', hasSentinelProcess);
    checkFail('owner-verify Orca filament sentinel exists', hasSentinelFilament);

    if (hasSentinelProcess && hasSentinelFilament) {
      const sentinelProcess = JSON.parse(fs.readFileSync(sentinelProcessPath, 'utf8'));
      const sentinelFilament = JSON.parse(fs.readFileSync(sentinelFilamentPath, 'utf8'));
      checkFail('Orca process sentinel name/id contract',
        sentinelProcess.name === 'ZZ ORCA P3 TEST LH019 W4 O83 I147 BR7'
          && sentinelProcess.print_settings_id === sentinelProcess.name);
      checkFail('Orca process sentinel odd values',
        sentinelProcess.layer_height === '0.19'
          && sentinelProcess.wall_loops === '4'
          && sentinelProcess.outer_wall_speed?.[0] === '83'
          && sentinelProcess.inner_wall_speed?.[0] === '147'
          && sentinelProcess.brim_width === '7');
      checkFail('Orca process sentinel keeps verified parent',
        sentinelProcess.inherits === '0.20mm Standard @Creality Ender3V3SE 0.4');
      checkFail('Orca filament sentinel name/id contract',
        sentinelFilament.name === 'ZZ ORCA P3 TEST N223-217 R073 F097'
          && sentinelFilament.filament_settings_id?.[0] === sentinelFilament.name);
      checkFail('Orca filament sentinel odd values',
        sentinelFilament.nozzle_temperature_initial_layer?.[0] === '223'
          && sentinelFilament.nozzle_temperature?.[0] === '217'
          && sentinelFilament.filament_retraction_length?.[0] === '0.73'
          && sentinelFilament.filament_flow_ratio?.[0] === '0.97'
          && sentinelFilament.hot_plate_temp_initial_layer?.[0] === '57'
          && sentinelFilament.hot_plate_temp?.[0] === '53'
          && sentinelFilament.textured_plate_temp_initial_layer?.[0] === '57'
          && sentinelFilament.textured_plate_temp?.[0] === '53');
      checkFail('Orca filament sentinel keeps verified parent and machine',
        sentinelFilament.inherits === 'Creality Generic PLA @Ender-3V3-all'
          && sentinelFilament.compatible_printers?.[0] === 'Creality Ender-3 V3 SE 0.4 nozzle');
    }
```

- [ ] **Step 2: Run the audit to demonstrate RED**

Run:

```bash
node scripts/export-audit.js
```

Expected: exit 1 with exactly the two new existence checks failing because the sentinel files do not exist; existing Orca and Bambu checks remain green.

- [ ] **Step 3: Create the process sentinel artifact**

Create `scripts/fixtures/slicer-golden/_owner-verify/zz-orca-p3-importtest-process.json`:

```json
{
  "from": "User",
  "inherits": "0.20mm Standard @Creality Ender3V3SE 0.4",
  "name": "ZZ ORCA P3 TEST LH019 W4 O83 I147 BR7",
  "print_settings_id": "ZZ ORCA P3 TEST LH019 W4 O83 I147 BR7",
  "version": "2.1.0.18",
  "layer_height": "0.19",
  "initial_layer_print_height": "0.20",
  "wall_generator": "classic",
  "wall_infill_order": "inner wall/outer wall/infill",
  "xy_hole_compensation": "0.05",
  "elefant_foot_compensation": "0.15",
  "outer_wall_line_width": "0.42",
  "inner_wall_line_width": "0.44",
  "top_surface_line_width": "0.42",
  "enable_arc_fitting": "1",
  "reduce_crossing_wall": "1",
  "wall_loops": "4",
  "top_shell_layers": "5",
  "bottom_shell_layers": "4",
  "sparse_infill_pattern": "grid",
  "sparse_infill_density": "15%",
  "top_surface_pattern": "monotonic",
  "bottom_surface_pattern": "monotonic",
  "internal_solid_infill_pattern": "rectilinear",
  "outer_wall_speed": ["83"],
  "inner_wall_speed": ["147"],
  "initial_layer_speed": ["25"],
  "top_surface_speed": ["50"],
  "gap_infill_speed": ["70"],
  "outer_wall_acceleration": ["2500"],
  "inner_wall_acceleration": ["3000"],
  "initial_layer_acceleration": ["500"],
  "brim_width": "7"
}
```

- [ ] **Step 4: Create the filament sentinel artifact**

Create `scripts/fixtures/slicer-golden/_owner-verify/zz-orca-p3-importtest-filament.json`:

```json
{
  "from": "User",
  "inherits": "Creality Generic PLA @Ender-3V3-all",
  "name": "ZZ ORCA P3 TEST N223-217 R073 F097",
  "filament_settings_id": ["ZZ ORCA P3 TEST N223-217 R073 F097"],
  "filament_type": ["PLA"],
  "version": "2.1.0.18",
  "compatible_printers": ["Creality Ender-3 V3 SE 0.4 nozzle"],
  "nozzle_temperature": ["217"],
  "nozzle_temperature_initial_layer": ["223"],
  "hot_plate_temp": ["53"],
  "hot_plate_temp_initial_layer": ["57"],
  "textured_plate_temp": ["53"],
  "textured_plate_temp_initial_layer": ["57"],
  "cool_plate_temp": ["35"],
  "cool_plate_temp_initial_layer": ["35"],
  "filament_flow_ratio": ["0.97"],
  "pressure_advance": ["0.04"],
  "filament_retraction_length": ["0.73"],
  "filament_retraction_speed": ["45"],
  "filament_max_volumetric_speed": ["21"],
  "fan_min_speed": ["70"],
  "fan_max_speed": ["100"],
  "overhang_fan_speed": ["100"],
  "slow_down_layer_time": ["10"]
}
```

- [ ] **Step 5: Retarget the owner gate**

In `docs/planning/EXPORT-PHASE3-GATE-LEDGER.md`, replace the two import filenames with the new `zz-orca-p3-importtest-*` filenames. Replace the PASS spot checks with:

```markdown
- Process preset `ZZ ORCA P3 TEST LH019 W4 O83 I147 BR7`: layer height
  **0.19**, wall loops **4**, outer wall speed **83**, inner wall speed **147**,
  brim width **7**.
- Filament preset `ZZ ORCA P3 TEST N223-217 R073 F097`: first/other-layer
  nozzle **223/217**, retraction **0.73**, flow ratio **0.97**, and
  first/other-layer hot/textured plate **57/53**.
```

- [ ] **Step 6: Run focused and full verification**

Run:

```bash
node scripts/export-audit.js
node scripts/validate-data.js
node scripts/engine-golden-snapshot.js --check
git diff --check
git diff --exit-code HEAD -- engine.js app.js \
  scripts/fixtures/slicer-golden/_owner-verify/orca-ender3-v3-se-process.json \
  scripts/fixtures/slicer-golden/_owner-verify/orca-ender3-v3-se-filament.json
```

Expected: export audit `0 FAIL / 0 warn`; validation passes; golden snapshot reports `NO DRIFT (39 states)`; both diff checks exit 0, proving production code and canonical artifacts are unchanged.

- [ ] **Step 7: Commit and push**

```bash
git add scripts/export-audit.js \
  scripts/fixtures/slicer-golden/_owner-verify/zz-orca-p3-importtest-process.json \
  scripts/fixtures/slicer-golden/_owner-verify/zz-orca-p3-importtest-filament.json \
  docs/planning/EXPORT-PHASE3-GATE-LEDGER.md
git commit -m "test(export-p3): add Orca owner import sentinels"
git push
```
