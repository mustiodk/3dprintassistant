# Golden slicer fixtures — owner export checklist (IMPL-043 Phase 0)

**Why this exists:** profile export has never had a verification loop against the real
slicers, which is why it broke silently three times (IMPL-043 §1.3). These are ground-truth
files exported from *your* installed slicers. The `scripts/export-audit.js` harness (built in
the session) diffs the app's generated export against them to catch drift forever after.

**This is the only step that needs your machines.** ~20 minutes. Everything after is headless.

---

## What to produce — 6 files, dropped in this folder

| Slicer | Files | Suggested name |
|---|---|---|
| Bambu Studio | 1 process/print preset + 1 filament preset (JSON) | `bambu-<printer>-process.json`, `bambu-<printer>-filament.json` |
| OrcaSlicer | 1 process/print preset + 1 filament preset (JSON) | `orca-<printer>-process.json`, `orca-<printer>-filament.json` |
| PrusaSlicer | 1 exported config bundle (INI, contains both `[print:…]` and `[filament:…]`) | `prusa-<printer>-config.ini` |

Replace `<printer>` with the model you pick (see below). Keep them exactly as the slicer wrote
them — **do not reformat or pretty-print**; the raw bytes are the point.

## Which printer + filament to pick
- **Bambu Studio:** the **Bambu Lab X1 Carbon** if you have it configured (it's the base preset
  the app's export inherits from), with a **Generic PLA** filament. Any real Bambu printer +
  filament you already have set up is fine — just tell the session which.
- **OrcaSlicer:** any printer from our catalog that Orca has a vendor profile for (a **Creality
  Ender-3 V3 SE** or similar common bedslinger is ideal), with a **Generic PLA**.
- **PrusaSlicer:** a **Prusa MK4** (or MK3S+) with a **Generic/Prusament PLA**.

One real, currently-selected preset per slicer is all that's needed. Don't hand-edit values.

---

## How to export each one

### Bambu Studio
1. **File → Export → Export Preset Bundle** opens a dialog with radio options.
2. In the printer list, tick your **X1 Carbon 0.4 nozzle** entry. Choose **"Process presets(.zip)"**
   → OK → save. Reopen and do the same with **"Filament presets(.zip)"**. **Use the `.zip` options,
   not `.bbscfg`/`.bbsflmt`** — the zips are the raw per-preset `.json` files (real field names,
   `inherits` parent, `version` string); the bundles just wrap the same data.
3. **Unzip both.** Take the X1 Carbon 0.4 process `.json` → rename `bambu-x1c-process.json`; take a
   PLA filament `.json` → rename `bambu-x1c-filament.json`. Drop both here. (A user preset stores
   `inherits` + your overrides rather than every field — that's fine and ideal; the `inherits`
   name and `version` are exactly what Phase 0 must pin.)
4. **Fallback (skip the dialog):** copy the JSON straight from
   `~/Library/Application Support/BambuStudio/` under `user/<id>/process/*.json` and
   `.../filament/*.json`.

### OrcaSlicer
1. OrcaSlicer is a Bambu fork with the **same Export Preset Bundle dialog** (File → Export →
   Export Preset Bundle): tick your chosen printer, export **Process presets(.zip)** and
   **Filament presets(.zip)**, unzip, pick one process + one filament `.json`, rename per the table.
2. **Fallback:** `~/Library/Application Support/OrcaSlicer/user/default/process/*.json` and
   `.../filament/*.json`.

### PrusaSlicer
1. Menu **File → Export → Export Config Bundle…** (NOT "With Physical Printers") → save one
   `.ini` here. The bundle uses the named-section format `[print:name]` / `[filament:name]` that
   the app's Prusa export targets, and one file covers both. Rename to `prusa-<printer>-config.ini`.
2. Because the bundle holds ALL your presets, note in `versions.md` which **print preset + filament
   preset** is the reference pair to audit against.
3. Fallback config dir: `~/Library/Application Support/PrusaSlicer/`.

---

## Also record (the harness needs it)
Create a tiny `versions.md` in this folder noting, for each slicer:
- exact **app version** (Help → About), and
- the **printer + filament preset name** you exported.

The export-audit harness resolves the correct `version` string and inherits-parent names from
these files empirically (IMPL-043 Phase 0 step 3), so accurate versions matter.

## One import test per slicer (IMPL-043 Phase 0 step 4)
After the session rebuilds the export pipeline, it will hand you a generated file per slicer to
**import back into that slicer once**, and you note whether it's accepted / rejected / values
wrong. That recorded round-trip is what finally closes the loop April 2026 never closed — a
slicer's export does not lose its Beta badge without it.

---

*Once the 6 files (+ `versions.md`) are here, run the kickoff prompt at
`docs/prompts/2026-07-06-fable5-next-phase-learns-export.md`. Track A will detect them and run
Phase 0; if they're missing it runs Track B only and leaves you this list.*
