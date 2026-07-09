# 2026-07-09 — Cowork (appdev): Export Phase 2 — Bambu Studio hardening (executed)

## Durable context

- **Export Phase 2 is IMPLEMENTED on branch `export-phase2-20260709` (web, pushed) — NOT merged.** Two blockers remain before `main`: (1) iOS XCTest green on the **mac-mini** (T7 is `UNVERIFIED` — the MacBook Air has NO Xcode as of today, see below); (2) `merge --no-ff` after that. OWNER-VERIFY (the Bambu import test) already PASSED. Safety tag `export-phase2-baseline-20260709` = pre-branch `main` tip.
- **The "MacBook Air is iOS-build-capable" memory was STALE.** Ground truth 2026-07-09: `xcode-select -p` = CommandLineTools, no `Xcode.app`, no `xcodegen`. The Air had Xcode on 2026-07-06 but not now — the toolchain is intermittent. Memory `reference_macbook_air_ios_build_capable` rewritten to "verify `xcode-select -p` before relying." **iOS XCTest for this train must run on the mac-mini.**
- **The dual-variant design is the load-bearing new fact:** BS 2.5 writes 2-element per-extruder-variant arrays `["v","v"]` on exactly **7 process keys** (outer/inner_wall_speed, initial_layer_speed, top_surface_speed, gap_infill_speed, outer_wall/initial_layer_acceleration). We duplicate the single resolved value into both slots. **Filament temps stay 1-element** — the golden's 2nd element there is `"nil"`, not a duplicated value; duplicating a real temp would assert a value BS left empty. `print_extruder_variant`/`_id` are never emitted (machine-inferred). New const `BAMBU_DUAL_VARIANT_PROCESS_FIELDS` at engine.js ~:3234; emission at the passthrough site only (the byte-identical legacy line inside `_exportBambuStudioJSONLegacy` was deliberately left untouched).
- **Inherits (CR1-L1) verified against ground truth:** `resources/profiles/BBL.json` @ BS release tag **`v02.05.03.62`** (registry key is `process_list`, 259 presets). X1E/P1S have NO own process presets → `null` kept, comment upgraded to `VERIFIED` (X1C parents). **P2S/X2D/H2C/H2D/H2DP/H2S DO have own instantiated presets** → explicit map rows added, names copied verbatim from the registry (never string-substituted). **BS's suffix for H2D Pro is `H2DP`, not "H2D Pro".** h2c/h2d/h2s were previously absent from the map entirely and rode a silent X1C fallback — now every recognized Bambu export target has an explicit evidence-backed row. Nozzle-suffixed variants (`… 0.2 nozzle`) exist for all six but are deliberately unmapped in v1 (ledgered for a later `_findProcessParent` nozzle-awareness pass).
- **OWNER-VERIFY method that worked well:** sentinel values encoded in the preset NAME (`ZZ P2 TEST PROC OWS123 BRIM8` / `ZZ P2 TEST FIL N201 R0.77`) so the owner reads the facit off the name — outer wall 123, inner 124, initial layer 21, brim 8, nozzle 201/202, retraction 0.77. All confirmed via screenshots on the owner's P1S. `ZZ` prefix sorts them to the bottom of BS's preset list. Same precedent as the 2026-07-06 `zz-importtest-*` files.
- **P1S (single-variant) was the right import target:** it's the residual-risk class from plan review finding 4 (single-head machine getting dual arrays with no golden to prove it). A1 was the original stand-in; owner asked to switch to P1S — better, because it's the same class AND the owner physically has it. X1C dual class is anchored by BS's own golden.
- **Audit guard flipped warn→FAIL + 3 explicit dual-variant checkFails** (allowlist set-equality both directions; filament-temp 1-element + golden-`"nil"` self-check; variant-key absence). Export audit now **0 FAIL / 0 warn** (was 1 warn). The old element-count warn was the T2 target.

## What happened / Actions

- Executed the dual-reviewed plan `docs/superpowers/plans/2026-07-09-export-phase2-bambu-hardening-plan.md` task-by-task under executing-plans skill. Tasks 0–8 (T5 ironing was dropped at plan review).
- T1 HIGH-2 (retraction display honesty), T2 dual arrays, T3 inherits verification, T4 import-hint UX, T6 Beta-badge removal — each RED-first, one finding = one commit, all web gates green per commit (matrix hash held at H0 throughout; golden diffs enumerated per commit).
- T7 iOS mirror: 3 per-delta LOCAL commits (engine byte-sync + its mirror test each), engine.js byte-identical to web branch tip. XCTest `UNVERIFIED` (no Xcode on Air).
- T8: generated owner-verify artifacts, switched them to P1S sentinels per owner ask, owner ran the BS import test → PASS (screenshots), recorded verbatim in the ledger.
- Preview-verified T4 hint (EN+DA, hidden on non-Bambu, no overflow @390px, dark/light) and T6 badge removal via the preview server.

## Files touched

- **Modified (web, on branch):** `engine.js` (T1 two display reads, T2 const+emission, T3 inherits map rows), `scripts/walkthrough-harness.js` (3 new P2 blocks), `scripts/export-audit.js` (warn→3 checkFails), `scripts/fixtures/engine-golden.json` (regenerated T1+T2), `index.html` (hint <p> + badge removal), `app.js` (hint wiring), `style.css` (`.export-hint`), `locales/en.json` + `locales/da.json` (`exportHintBambu`).
- **Created (web):** `docs/planning/EXPORT-PHASE2-GATE-LEDGER.md`, `scripts/fixtures/slicer-golden/_owner-verify/p2-p1s-process.json` + `p2-p1s-filament.json`.
- **Modified (iOS, LOCAL only):** `3DPrintAssistant/Engine/engine.js` (byte-sync), `3DPrintAssistantTests/EngineServiceTests.swift` (3 new P2 tests).
- **Memory:** rewrote `reference_macbook_air_ios_build_capable.md` (intermittent-toolchain warning) + MEMORY.md index line.

## Commits (web branch `export-phase2-20260709`)

`b9279e9` ledger+baselines · `06b28c7` T1 HIGH-2 · `f0d05df` T2 dual arrays · `89a848d` T3 inherits · `4ebf2e4` T4 hint · `886702c` T6 badge · `5eb753c` owner-verify artifacts · `efb8727` retarget to P1S · `b81140a` OWNER-VERIFY PASS · `85ba538` retraction 0.77 confirmed. iOS (local, `main`): `5fcc935` / `662c3c1` / `7221258`.

## Open questions / Follow-up

- **Md-hygiene:** three untracked files in `3dprintassistant/scripts/fixtures/slicer-golden/_owner-verify/` — `xy-p2-a1-process.json`, `xy-p2-x1c-filament.json`, `xy-p2-x1c-process.json` — are identical copies of the removed x1c/a1 artifacts (owner-made `xy-` backups, timestamp 21:45). Left in place (not mine to delete); recommend the owner `rm` them once the P1S test is fully closed since they duplicate superseded content.
- **Lesson/findings sweep:** no K3 (skill-vs-outcome), no K4 (tool-overruled-controller), no K1 (reviewer disagreement) surfaced. The stale-Air-Xcode discovery is captured as a memory correction, not a findings-ledger entry (it's an environment fact, not a process/skill mismatch). lesson-spotter compact: 1 candidate (the sentinel-in-preset-name import-test technique) — already durable in this log + the learns-export ledger precedent; no new finding file.
- **verify-before-mutate:** 1 flag this session (the plan Write), resolved same-turn; 0 unresolved.
- **iOS overlay validator (e) baseline exception:** the pre-existing `validate-ios-printer-overlay.test.js` case (e) live-smoke FAIL (missing 1.0.7 bundled-catalog baseline) is present at branch baseline and unrelated to export — documented in the gate ledger; not introduced here.

## Next session

**mac-mini:** run the iOS XCTest for Export Phase 2. The 3 iOS commits are LOCAL on the Air (`5fcc935`/`662c3c1`/`7221258`) — sync them to the mac-mini first (they're on `3dprintassistant-ios/main` local; the Air needs to push or the mac-mini needs the commits). Run the full suite; expect 135 prior + 3 new = 138. If green → record in `docs/planning/EXPORT-PHASE2-GATE-LEDGER.md` T7, then `git checkout main && git merge --no-ff export-phase2-20260709 && git push` (web auto-deploys), verify live per plan Step 8.4, and close the books per plan Step 8.5 (ROADMAP flip + ledger final). If XCTest fails, follow plan Step 8.2 fallback loop.
