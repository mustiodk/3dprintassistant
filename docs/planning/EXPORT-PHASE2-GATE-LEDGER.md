# Export Phase 2 — Gate Ledger

> Empty-first ledger: ticks are recorded as they happen, never pre-narrated.
> Plan: `docs/superpowers/plans/2026-07-09-export-phase2-bambu-hardening-plan.md`
> Review record: `docs/reviews/2026-07-09-export-phase2-plan-review.md` (2 rounds, 17 findings applied)

## Preamble (recorded 2026-07-09)

- **Baseline tag:** `export-phase2-baseline-20260709` (= main tip at branch time)
- **Branch:** `export-phase2-20260709` (pushed to origin)
- **Matrix-audit hash H0:** `3bd3da7c364d1d273ce4c2b53c9322667dd77224ae9dc6d8e31400fb5d8fed9e`
- **Baseline gate results (pre-edit, branch == main tip):**
  - validate-data: all files valid (pre-existing max_mvs soft warnings only)
  - walkthrough-harness: clean, 18 OK lines, no throw
  - export-audit: 0 FAIL / 1 warn (element-count — the T2 target) / 5 info
  - engine-golden-snapshot --check: NO DRIFT (39 states)
  - unit tests: all pass EXCEPT **documented baseline exception** below
- **Documented baseline exception (pre-existing, NOT introduced by this branch):**
  `scripts/validate-ios-printer-overlay.test.js` case (e) live-smoke FAILS —
  "missing iOS bundled catalog baseline for current MARKETING_VERSION 1.0.7".
  Known owner-side open item (blocks overlay republish, unrelated to export).
  Verified pre-existing: branch created at main tip with zero commits, failure
  present at baseline. Gate contract for this train: **no NEW unit failures**;
  this one failure is expected at every gate until the 1.0.7 baseline lands.

## Gates

### T1 — HIGH-2 retraction display honesty

### T2 — dual-extruder-variant arrays (7 process keys)

### T3 — BAMBU_PROCESS_INHERITS verification (CR1-L1)

**Verified 2026-07-09** against `resources/profiles/BBL.json` at BS 2.5 release tag **`v02.05.03.62`**
(newest `v02.05.*` from `git ls-remote --tags bambulab/BambuStudio`; registry key `process_list`, 259 presets total).

- **X1E: NO own process presets** → `x1e: null` kept, comment upgraded to VERIFIED (X1C parents; cross-printer inherits import-tested 2026-07-06).
- **P1S: NO own process presets** → `p1s: null` kept, comment upgraded to VERIFIED.
- **P2S / X2D / H2C / H2S: own presets EXIST** — suffix-free bases mapped verbatim: `0.08mm High Quality`, `0.12mm High Quality`, `0.16mm Standard` (+ `0.16mm High Quality` exists, not mapped), `0.20mm Standard`, `0.24mm Standard` `@BBL <ID>`.
- **H2D / H2DP (h2d_pro): own presets EXIST** — `0.08mm Extra Fine`, `0.12mm Fine`, `0.16mm Standard`, `0.20mm Standard`, `0.24mm Standard` `@BBL H2D` / `@BBL H2DP`. **BS suffix for H2D Pro is `H2DP`**, not "H2D Pro".
- **Instantiation check:** all 31 mapped preset files fetched at the tag — every one `instantiation=true` (registry `sub_path` → preset JSON).
- **Map keys `'0.28'`/`'0.30'`** point at `0.24mm Standard` (nearest suffix-free base; same idiom as x1c's `0.30→0.28mm Extra Draft`).
- **Nozzle-suffixed variants NOT mapped in v1** (deliberate): all six machines also ship `… @BBL <ID> 0.2/0.6/0.8 nozzle` presets (e.g. `0.10mm Standard @BBL P2S 0.2 nozzle`, `0.30mm Standard @BBL X2D 0.6 nozzle`, `0.40mm Standard @BBL H2S 0.8 nozzle`). Queued for a later `_findProcessParent` nozzle-awareness pass.
- Walkthrough case `[Export P2 inherits]` pins all 8 printers (6 own-preset parents @0.20 + x1e/p1s verified-null → X1C). RED demonstrated (`p2s got "0.20mm Standard @BBL X1C"`) before the map edit.
- Golden snapshot: NO diff (none of the 39 states use the six affected printers).

### T4 — import-hint UX

### T6 — Beta-badge removal

### T7 — iOS mirror train

### T8 — exit gate

## OWNER-VERIFY (Step 8.2 — owner import test, recorded verbatim)

_(pending)_

## Merge / rollback commands (from plan Task 8)

```bash
# merge (only after ALL Step 8.3 preconditions):
git checkout main && git merge --no-ff export-phase2-20260709 && git push

# rollback single task (on branch): git revert <sha>
# whole train pre-merge: abandon branch (main untouched; tag export-phase2-baseline-20260709)
# post-merge: git revert -m 1 <merge-sha>   (then mirror into pending iOS train per 8.4b)
# export-path emergency lever: USE_LEGACY_EXPORT=true (frozen WITH pre-P1 raw retraction + 1-element arrays)
```
