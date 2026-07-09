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

### T1 — HIGH-2 retraction display honesty ✅ (commit `06b28c7`)

- RED demonstrated: `P2 HIGH-2(a): text export retraction=0.6 must equal resolved 0.4 (raw base 0.6)`.
- GREEN: both surfaces (`formatProfileAsText` + `exportProfile`) read `_slicer_value`; mine-mode vacuity guard passed (`svM='1'`).
- Gates: walkthrough OK line; matrix hash == H0; audit 0 FAIL / 1 warn (unchanged at this point); golden diff = 11 states, text+exportRef retraction lines only, exportBambu untouched (enumerated in commit body).

### T2 — dual-extruder-variant arrays (7 process keys) ✅ (commit `f0d05df`)

- RED demonstrated: `process.outer_wall_speed must be ["v","v"]; got ["100"]`.
- GREEN: passthrough emission at the (post-edit) `engine.js` dual-ternary; legacy line untouched (verified both sites by grep before/after).
- Audit guard upgraded warn→checkFail + 3 explicit dual-variant contract checkFails; **audit now 0 FAIL / 0 warn**.
- Gates: matrix == H0; golden diff = 19 states, exportBambu ONLY, keys = exactly the 7-key allowlist.

### T3 — BAMBU_PROCESS_INHERITS verification (CR1-L1) ✅ (commit `89a848d`)

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

### T4 — import-hint UX ✅ (commit `4ebf2e4`)

- Hint under `.panel-header` (finding 8 respected), `var(--text2)` (the real secondary var).
- Preview smoke: visible EN+DA on x1c (DA re-translated via render()), hidden on aries (orca-routed), no horizontal overflow @390px, dark `#888898` / light `#606075`.

### T6 — Beta-badge removal ✅ (commit `886702c`)

- `#exportGroup` badge deleted; site-header badge untouched (1 `.beta-badge` remains in DOM, verified in preview). Real gate = this branch's merge boundary (Step 8.3).

### T7 — iOS mirror train ⏳ UNVERIFIED (3 LOCAL commits, push gate intact)

- Per-delta commits (plan Step 7.4): `5fcc935` (engine@web-T1 + retraction test), `662c3c1` (engine@web-T2 + dual-variant test), `7221258` (engine@web-T3 + inherits test).
- Final `diff -q` web branch tip ↔ iOS engine.js: **byte-identical** ✓.
- **`UNVERIFIED: XCTest pending mac-mini run`** — the MacBook Air has NO Xcode (verified 2026-07-09: `xcode-select` = CommandLineTools, no Xcode.app in /Applications or Spotlight; the earlier "Air is iOS-build-capable" memory is stale). TDD-RED demo on the retraction test also pending that run. **This blocks Step 8.3 (merge) per plan.**

### T8 — exit gate ⏳ (artifacts staged; owner steps pending)

- Step 8.1 ✅ (rev. 2026-07-09, owner ask): artifacts retargeted to the owner's **P1S** with sentinel names/values (zz-importtest precedent) — `_owner-verify/p2-p1s-process.json` + `p2-p1s-filament.json`. The earlier `p2-x1c-*`/`p2-a1-*` files were removed. **Class coverage note:** P1S is a single-variant machine, i.e. exactly the residual-risk class from review finding 4 (A1 was its stand-in); the X1C dual-variant class is anchored by BS's own golden (`["v","v"]` written by BS 2.5 itself), so a P1S PASS covers the open class question.
- **Sentinels (encoded in preset names):** process `ZZ P2 TEST PROC OWS123 BRIM8` — the 7 dual keys carry spottable pairs: outer wall speed **123**, inner wall **124**, top surface **122**, gap infill **125**, initial layer **21**, outer wall accel **1260**, initial layer accel **1270**; brim width **8**. Filament `ZZ P2 TEST FIL N201 R0.77` — nozzle **201**, first-layer **202**, retraction **0.77**. Process inherits `0.20mm Standard @BBL X1C` (P1S is verified-null → cross-printer parent, the form the owner's own preset already proved).
- Step 8.2 ⏳ OWNER: import both files in Bambu Studio 2.5 on the P1S; PASS = both accepted, and each sentinel shows as ONE sane value (outer wall 123 — not doubled/garbled), nozzle 201/202, retraction 0.77. Record verbatim below.
- Step 8.3 blocked until: OWNER-VERIFY PASS + iOS XCTest green on mac-mini + byte-identical diff (already ✓) + web gates green on tip (✓ as of `89a848d`+UI commits).

## OWNER-VERIFY (Step 8.2 — owner import test, recorded verbatim)

**2026-07-09 — PASS (screenshot evidence, Bambu Studio on the owner's P1S).** Owner imported both
`ZZ P2 TEST …` files and posted 4 screenshots:

- Both presets accepted and selectable on `Bambu Lab P1S` (process `ZZ P2 TEST PROC OWS123 BRIM8 @…`, filament `ZZ P2 TEST FIL N201 R0.77`).
- **Dual-array sentinels display as ONE sane value each** (the Phase 2 class question, answered): Outer wall **123**, Inner wall **124**, Initial layer **21** (Speed tab).
- Brim width **8** (Others tab; greyed under Brim type=Auto, value intact).
- Filament nozzle temps: Initial layer **202** / Other layers **201** (Filament tab) — 1-element temps accepted; BS renders its Direct Drive Standard/High Flow variant tabs without complaint.
- Filament retraction **0.77 mm CONFIRMED** (5th screenshot, Setting Overrides → Length = 0.77 mm, Retraction Speed 45) — the full sentinel set is now green.
- Not separately inspected (same emission mechanism as the verified keys, not treated as blocking): top surface 122, gap infill 125, accels 1260/1270.

**Step 8.3 remaining blocker: iOS XCTest on the mac-mini (T7 UNVERIFIED).**

## Merge / rollback commands (from plan Task 8)

```bash
# merge (only after ALL Step 8.3 preconditions):
git checkout main && git merge --no-ff export-phase2-20260709 && git push

# rollback single task (on branch): git revert <sha>
# whole train pre-merge: abandon branch (main untouched; tag export-phase2-baseline-20260709)
# post-merge: git revert -m 1 <merge-sha>   (then mirror into pending iOS train per 8.4b)
# export-path emergency lever: USE_LEGACY_EXPORT=true (frozen WITH pre-P1 raw retraction + 1-element arrays)
```
