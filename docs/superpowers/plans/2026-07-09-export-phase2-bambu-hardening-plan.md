# Export Phase 2 — Bambu Studio Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close IMPL-043 Phase 2 — harden the live Bambu Studio export (2-element per-extruder-variant arrays, retraction display honesty [mine-tier Codex HIGH-2], inherits-placeholder verification, import-hint UX, ironing display de-hardcode) and remove the export Beta badge behind a re-run recorded import test.

**Architecture:** All changes ride the existing IMPL-043 passthrough pipeline (`_slicer_value` sidecars → `exportBambuStudioJSON`); no new mapping architecture. Display surfaces that still read raw material base switch to the resolved sidecar (single source, IMPL-040 discipline). Everything lands on a branch; the exit gate is an owner-run Bambu Studio import re-test on the rebuilt output, then `merge --no-ff` → auto-deploy.

**Tech Stack:** Vanilla JS engine (web-master), Node harness scripts (`walkthrough-harness.js`, `export-audit.js`, `engine-golden-snapshot.js`), iOS byte-identical mirror + XCTest.

**Spec:** `docs/specs/IMPL-043-slicer-export-activation.md` §4 "Phase 2" + ROADMAP queue item "[Export Phase 2 — Bambu hardening] (2026-07-06)" + deferred mine-tier finding HIGH-2 (`docs/planning/MINE-TIER-GATE-LEDGER.md` disposition; repro: one document carrying 0.6 raw vs 1.0 resolved retraction in mine mode).

---

## Grounding facts (verified 2026-07-09 against working tree)

- Passthrough export lives at `engine.js:3481` (`exportBambuStudioJSON`); legacy fallback `USE_LEGACY_EXPORT=false` at `engine.js:3220`; version constants `BAMBU_PROCESS_VERSION='2.5.0.14'` / `BAMBU_FILAMENT_VERSION='2.5.0.18'` at `engine.js:3226-3227`.
- **2-element gap (empirical, this session; corrected at plan review):** golden `bambu-x1c-process.json` has 2-element `["v","v"]` arrays on exactly these keys the app also emits (app emits 1-element): `outer_wall_speed, inner_wall_speed, initial_layer_speed, top_surface_speed, gap_infill_speed, outer_wall_acceleration, initial_layer_acceleration` (7). Golden **filament** `nozzle_temperature`/`nozzle_temperature_initial_layer` are `["225","nil"]` / `["230","nil"]` — the second variant is **nil**, NOT a duplicated value (spec §1.4b F8 quotes this too), so the filament keys are OUT of the dual-emission scope (T2 covers the 7 process keys only, matching the ROADMAP queue item's wording). Golden also carries `print_extruder_id`/`print_extruder_variant`/`filament_extruder_variant` with machine-specific variant NAMES (`["Direct Drive Standard","Direct Drive High Flow"]`) — the app does NOT emit these and this plan deliberately keeps it that way (identical duplicated values make position mapping irrelevant; copying X1C variant names onto other printers would be actively wrong). `scripts/export-audit.js:111` currently WARNs on the element-count delta. **Residual risk (review finding 4):** single-variant machines (a1/a1mini/p1p) get dual arrays without an X1C-style golden proving it — mitigated by adding an A1 file to the Task 8 owner import test; fallback = allowlist emission to import-tested printers only.
- **HIGH-2 raw-base reads (the two in-scope surfaces):** `engine.js:3704` (`formatProfileAsText` filament section reads `adv.retraction_distance` = raw `${bs.retraction_distance} mm` from `getAdvancedFilamentSettings` at `engine.js:1426`) and `engine.js:3777` (`exportProfile().filament.retraction_length` reads `material.base_settings.retraction_distance`). The resolved param `profile.retraction_distance` already carries the scaled+personal-delta'd `_slicer_value` (set at `engine.js:2896`, HIGH-001 comment at `:2895`). `exportBambuStudioJSON` already reads the sidecar (fixed in P1) — only the text/reference surfaces lag.
- **Inherits placeholders (`CR1-L1`):** `BAMBU_PROCESS_INHERITS` at `engine.js:3109` has `x1e/p1s/p2s/x2d/h2d_pro: null // shares with X1C`. The owner's own golden proved cross-printer inherits are legit (their X1C preset inherits a P1S parent), so this is verify-and-document, not necessarily behavior change.
- **Beta badge:** `index.html:131` `<span class="beta-badge">Beta</span>` inside `#exportGroup`. (`index.html:59` has a separate site-header beta badge — OUT of scope.)
- **Export UI wiring:** `app.js:1559-1575` shows/hides `#exportGroup` by slicer; buttons at `app.js:1369-1403`.
- **Ironing hardcode:** `engine.js:2789` `p.ironing = S('Enabled — Monotonic line', …)` — display string hardcodes the pattern while canonical type/pattern live in sidecars (`sv(p.ironing, …)` at `:2794`, `_slicer_pattern` at `:2795`).
- Harness idiom: throw-based blocks + one `console.log('[…] OK …')` line (see `scripts/walkthrough-harness.js:638-700` HIGH-01 export block and `:1548-1580` W3 T4 retraction block).
- Import test precedent: 2026-07-06 owner import test PASSED on 1-element output (recorded in `docs/planning/LEARNS-EXPORT-GATE-LEDGER.md` OWNER-VERIFY). Phase 2 exit re-runs it on the rebuilt (2-element) output per spec §4 Phase 2 item 3.

## Non-goals (explicit)

- No Orca (Phase 3) or Prusa (Phase 4) work.
- No iOS export UI un-hide (spec §6: separate follow-up train, push-gated).
- No analytics Worker `EVENT_KEYS` fix (separate queued web finding; blocks GitHub issue #5, not this plan).
- No `USE_LEGACY_EXPORT` deletion (it stays as the instant fallback until Phase 2 exit-gate import test passes; delete in a later hygiene pass — reviewer may challenge, rationale: one more owner-verified release cycle of soak).
- No change to `getAdvancedFilamentSettings().retraction_distance` (`engine.js:1426`): the Advanced filament panel row is labeled/positioned as *material* settings and feeds web + iOS panels; changing its semantics is a separate owner decision. HIGH-2's scope is the two export surfaces. **Open question for plan review: confirm or challenge this boundary.**

## Mandatory data/logic-change evaluation (web + iOS)

- **Engine changes:** T1 (two display-surface reads), T2 (array emission), T5 (ironing display string). No `data/` changes anywhere in this plan.
- **Web UI:** T4 adds an import-hint line under the export buttons; T6 removes the Beta badge. No other UI change (sidecars invisible to existing UI).
- **iOS:** engine.js byte-identical sync + XCTest mirrors (T7). No iOS UI change (export UI remains hidden on iOS). `formatProfileAsText` IS reachable on iOS via JSCore (Copy-as-text parity surfaces), so the T1 mirror test is mandatory, not optional.
- **Android (planned):** exportBambuStudioJSON contract changes (array lengths) are engine-internal; the Android plan consumes the same engine.js byte-identical — no plan-doc update needed beyond this file.

## File structure

- Modify: `engine.js` (T1 two lines; T2 const + one emission site at `:3533`; T3 comments/possible map rows)
- Modify: `scripts/walkthrough-harness.js` (new blocks T1, T2; T3 case only if maps change)
- Modify: `scripts/export-audit.js` (T2: element-count checkWarn → checkFail)
- Modify: `index.html` (T4 hint element; T6 badge removal), `app.js` (T4 hint wiring), `style.css` (T4 `.export-hint`), `locales/en.json` + `locales/da.json` (T4 keys)
- Regenerate per engine commit: `scripts/fixtures/engine-golden.json` (+ enumerate diff in commit body)
- Create: `docs/planning/EXPORT-PHASE2-GATE-LEDGER.md` (empty-first; ticks recorded as they happen — never pre-narrated)
- iOS mirror: `3dprintassistant-ios/3DPrintAssistant/Engine/engine.js` (byte-copy), `3DPrintAssistantTests/EngineServiceTests.swift` (mirror tests)

---

## Task 0: Branch, baselines, ledger

**Files:** Create: `docs/planning/EXPORT-PHASE2-GATE-LEDGER.md`

- [ ] **Step 0.1: Branch + safety tag**

```bash
cd ~/dev/Claude/Projects/3dprintassistant
git checkout main && git pull --ff-only
git tag export-phase2-baseline-20260709
git checkout -b export-phase2-20260709
git push -u origin export-phase2-20260709
```

- [ ] **Step 0.2: Record baselines (all must be green/known before any edit)**

```bash
node scripts/validate-data.js                      # expect: 6/6 clean (17 max_mvs soft warnings are pre-existing, queued separately)
node scripts/walkthrough-harness.js > /tmp/wt-base.txt && tail -3 /tmp/wt-base.txt   # expect: clean, no throw
node scripts/profile-matrix-audit.js 2>&1 | grep -v '^Generated:' | shasum -a 256    # record hash H0
node scripts/export-audit.js                       # expect: 0 FAIL / 1 warn (element-count) / 5 info
node scripts/engine-golden-snapshot.js --check     # expect: NO DRIFT (39 states)
for t in scripts/*.test.js; do node "$t" || echo "FAIL $t"; done   # expect: all pass
```

- [ ] **Step 0.3: Create the gate ledger** with headings only (Gates T1–T8, OWNER-VERIFY block placeholder, merge/rollback commands from this plan's Task 8) and this preamble: baseline tag, branch name, matrix-audit hash H0. Commit:

```bash
git add docs/planning/EXPORT-PHASE2-GATE-LEDGER.md
git commit -m "chore(export-p2): open gate ledger + record baselines (tag export-phase2-baseline-20260709)"
```

## Task 1: HIGH-2 — retraction display honesty (text + reference export)

**Files:** Modify: `engine.js:3704`, `engine.js:3777`; Test: `scripts/walkthrough-harness.js` (new block after the W3 T4 retraction block ~`:1580`)

- [ ] **Step 1.1: Write the failing walkthrough block (RED)**

```js
  // ─── Export P2 — HIGH-2: text/reference export retraction honesty ─────────
  // formatProfileAsText filament "Retraction length" + exportProfile().filament
  // .retraction_length must equal the resolved _slicer_value (scaled + personal
  // delta), never the raw material base. Repro family: mine-tier Codex HIGH-2.
  {
    // (a) Scaled-differs-from-base combo: 0.2mm nozzle scales retraction down.
    const st02 = { printer: 'x1c', material: 'pla_basic', nozzle: 'std_0.2',
      useCase: ['functional'], surface: 'standard', strength: 'standard',
      speed: 'balanced', environment: 'normal', support: 'none',
      colors: 'single', userLevel: 'intermediate', special: [] };
    const prof02 = Engine.resolveProfile(st02);
    const sv02 = prof02.retraction_distance?._slicer_value;
    const raw02 = Engine.getMaterial('pla_basic').base_settings.retraction_distance;
    if (sv02 == null) throw new Error('P2 HIGH-2(a): missing retraction _slicer_value on x1c+pla+0.2');
    if (String(sv02) === String(raw02)) throw new Error(`P2 HIGH-2(a): combo no longer differs (sv=${sv02} raw=${raw02}) — pick another combo`);
    const txt02 = Engine.formatProfileAsText(st02);
    const line02 = txt02.match(/Retraction length:\s*([\d.]+)/);
    if (!line02) throw new Error('P2 HIGH-2(a): text export missing "Retraction length:" line');
    if (parseFloat(line02[1]) !== parseFloat(sv02)) {
      throw new Error(`P2 HIGH-2(a): text export retraction=${line02[1]} must equal resolved ${sv02} (raw base ${raw02})`);
    }
    const ref02 = Engine.exportProfile(st02);
    if (parseFloat(ref02.filament.retraction_length) !== parseFloat(sv02)) {
      throw new Error(`P2 HIGH-2(a): exportProfile retraction_length=${ref02.filament.retraction_length} must equal resolved ${sv02}`);
    }
    // (b) Mine-mode delta must surface too (the original Codex HIGH-2 repro shape).
    // Payload shape per engine.js:122-141 + harness W3 T4 (:1553-1556): offsets
    // are {value, unit, date} objects — a bare number is SILENTLY DROPPED
    // (fail-safe), which would make this test pass vacuously. Hence the svM
    // absolute-value assertion below (pla scaled 0.6 + 0.4 delta → '1').
    Engine.setPersonalTuning({ pairKey: 'x1c|pla_basic',
      offsets: { retraction_distance_delta: { value: 0.4, unit: 'mm', date: '2026-07-09' } } });
    const stM = Object.assign({}, st02, { nozzle: 'std_0.4', profileMode: 'mine' });
    const profM = Engine.resolveProfile(stM);
    const svM = profM.retraction_distance?._slicer_value;
    if (svM !== '1') throw new Error(`P2 HIGH-2(b): delta must actually apply (expected _slicer_value '1' = 0.6+0.4); got ${svM} — vacuity guard`);
    const txtM = Engine.formatProfileAsText(stM);
    const lineM = txtM.match(/Retraction length:\s*([\d.]+)/);
    if (!lineM || parseFloat(lineM[1]) !== parseFloat(svM)) {
      throw new Error(`P2 HIGH-2(b): mine-mode text retraction=${lineM && lineM[1]} must equal resolved ${svM}`);
    }
    Engine.setPersonalTuning(null);
    console.log(`[Export P2 HIGH-2] OK retraction honesty: text + reference export read resolved _slicer_value (0.2-nozzle ${sv02} ≠ raw ${raw02}; mine-mode ${svM})`);
  }
```

Note: the exact `setPersonalTuning` envelope (top-level fields around `pairKey`/`offsets`) MUST be re-checked against the W3 T4 harness block (`scripts/walkthrough-harness.js:1548-1580`) at implementation time — the harness block wins on any mismatch. `Engine.setPersonalTuning(null)` as the clear idiom is verified correct (plan review).

- [ ] **Step 1.2: Run to verify RED**

Run: `node scripts/walkthrough-harness.js`
Expected: throw `P2 HIGH-2(a): text export retraction=0.8 must equal resolved 0.6 …` (exact numbers = whatever the engine's scaled value is; the point is text ≠ resolved).

- [ ] **Step 1.3: Fix the two surfaces (GREEN)**

`engine.js:3704` — replace:
```js
      lines.push(`    Retraction length:       ${adv.retraction_distance}`);
```
with:
```js
      // HIGH-2 (Export P2): text export reads the resolved scaled/personal value.
      const _retSv = profile.retraction_distance && profile.retraction_distance._slicer_value;
      lines.push(`    Retraction length:       ${_retSv != null ? `${_retSv} mm` : adv.retraction_distance}`);
```

`engine.js:3777` — replace:
```js
        retraction_length:               `${material.base_settings.retraction_distance} mm`,
```
with:
```js
        retraction_length:               `${(profile.retraction_distance && profile.retraction_distance._slicer_value) ?? material.base_settings.retraction_distance} mm`,
```

- [ ] **Step 1.4: Verify GREEN + full gate**

```bash
node scripts/walkthrough-harness.js            # clean, new OK line present
node scripts/validate-data.js                  # unchanged
node scripts/profile-matrix-audit.js 2>&1 | grep -v '^Generated:' | shasum -a 256   # MUST equal H0 (display params untouched)
node scripts/export-audit.js                   # 0 FAIL (warn count unchanged)
node scripts/engine-golden-snapshot.js         # regenerate; diff MUST touch ONLY formatProfileAsText/exportProfile retraction lines on scaled combos — enumerate in commit body
```

- [ ] **Step 1.5: Commit (one finding = one commit)**

```bash
git add engine.js scripts/walkthrough-harness.js scripts/fixtures/engine-golden.json
git commit -m "fix(export): HIGH-2 — text + reference export read resolved retraction _slicer_value, not raw base

Golden diff: <N> states, retraction display lines only (enumerated below).
<paste enumeration>"
```

## Task 2: 2-element per-extruder-variant arrays (7 PROCESS keys only)

**Files:** Modify: `engine.js` (near `:3226` consts; process emission at `:3533` — **NOT the byte-identical line at `:3398`, which is inside the frozen `_exportBambuStudioJSONLegacy`**); `scripts/export-audit.js:111`; Test: `scripts/walkthrough-harness.js`

Scope corrected at plan review: filament `nozzle_temperature`/`nozzle_temperature_initial_layer` stay 1-element — the golden's second element there is `"nil"`, not a duplicated value, so duplicating a real temp would assert a value BS itself left empty.

- [ ] **Step 2.1: Failing walkthrough block (RED)** — after the HIGH-2 block:

```js
  // ─── Export P2 — dual-extruder-variant arrays ──────────────────────────────
  // BS 2.5 writes 2-element per-extruder-variant arrays for these keys (golden
  // X1C: ["v","v"]). We duplicate the value into both positions; identical
  // values make variant mapping irrelevant. print_extruder_variant itself is
  // deliberately NOT emitted (machine-inferred).
  {
    const stX = { printer: 'x1c', material: 'pla_basic', nozzle: 'std_0.4',
      useCase: ['functional'], surface: 'standard', strength: 'standard',
      speed: 'balanced', environment: 'normal', support: 'none',
      colors: 'single', userLevel: 'intermediate', special: [] };
    const ex = Engine.exportBambuStudioJSON(stX);
    const DUAL_PROC = ['outer_wall_speed','inner_wall_speed','initial_layer_speed',
      'top_surface_speed','gap_infill_speed','outer_wall_acceleration','initial_layer_acceleration'];
    DUAL_PROC.forEach(k => {
      const v = ex.process[k];
      if (!Array.isArray(v) || v.length !== 2 || v[0] !== v[1]) {
        throw new Error(`P2 dual-variant: process.${k} must be ["v","v"]; got ${JSON.stringify(v)}`);
      }
    });
    // Filament temps stay 1-element (golden second element is "nil", not a value).
    ['nozzle_temperature','nozzle_temperature_initial_layer'].forEach(k => {
      const v = ex.filament[k];
      if (!Array.isArray(v) || v.length !== 1) {
        throw new Error(`P2 dual-variant: filament.${k} must stay 1-element (golden 2nd elem is "nil"); got ${JSON.stringify(v)}`);
      }
    });
    if ('print_extruder_variant' in ex.process || 'filament_extruder_variant' in ex.filament) {
      throw new Error('P2 dual-variant: variant-name keys must NOT be emitted');
    }
    // Single-element keys stay single (guard against blanket duplication).
    // inner_wall_acceleration is in BAMBU_PROCESS_MAP + BAMBU_ARRAY_FIELDS but
    // NOT in the golden dual set (review finding 9: sparse_infill_density is
    // emitted scalar, so it would be a vacuous sentinel).
    const iwa = ex.process.inner_wall_acceleration;
    if (!Array.isArray(iwa) || iwa.length !== 1) {
      throw new Error(`P2 dual-variant: inner_wall_acceleration must stay 1-element; got ${JSON.stringify(iwa)}`);
    }
    console.log('[Export P2 dual-variant] OK 7 process keys emit ["v","v"]; filament temps + inner_wall_acceleration stay 1-element; variant-name keys absent');
  }
```

- [ ] **Step 2.2: Run to verify RED** — expect throw on `process.outer_wall_speed`.

- [ ] **Step 2.3: Implement (GREEN)**

Next to the version constants (`engine.js:~3228`):

```js
  // BS 2.5 dual-extruder-variant schema: these keys are written as 2-element
  // per-variant arrays by BS 2.5 itself (golden X1C fixtures). We duplicate the
  // single resolved value into both positions — identical values make variant
  // position irrelevant, and the golden proved 1-element also imports, so this
  // is robustness for future multi-variant machines (H2D), not a bug fix.
  const BAMBU_DUAL_VARIANT_PROCESS_FIELDS = new Set([
    'outer_wall_speed', 'inner_wall_speed', 'initial_layer_speed',
    'top_surface_speed', 'gap_infill_speed',
    'outer_wall_acceleration', 'initial_layer_acceleration',
  ]);
```

In the process emission loop (`engine.js:3533` — the passthrough one; do NOT touch the byte-identical legacy line at `:3398`), replace:
```js
      process[bsKey] = BAMBU_ARRAY_FIELDS.has(bsKey) ? [val] : val;
```
with:
```js
      process[bsKey] = BAMBU_DUAL_VARIANT_PROCESS_FIELDS.has(bsKey) ? [val, val]
                     : BAMBU_ARRAY_FIELDS.has(bsKey)                ? [val]
                     :                                                val;
```

The filament block (`engine.js:3567-3568` nozzle temps) is NOT changed (see task preamble: golden carries `["225","nil"]`; duplicating a real temp into the nil slot is out of scope).

- [ ] **Step 2.4: Lock the audit guard** — `scripts/export-audit.js:111`: change `checkWarn(` to `checkFail(` for the element-count check and update the detail string to say the app now emits the dual form. Run `node scripts/export-audit.js` — expect the former warn now `ok`, summary `0 FAIL / 0 warn`.

- [ ] **Step 2.5: Full gate + golden enumeration** — same commands as Step 1.4. Matrix-audit hash MUST equal H0. Golden diff: bambu export arrays only.

- [ ] **Step 2.6: Commit**

```bash
git add engine.js scripts/walkthrough-harness.js scripts/export-audit.js scripts/fixtures/engine-golden.json
git commit -m "feat(export): emit BS 2.5 dual-extruder-variant arrays (7 process keys)

Values duplicated per variant; filament temps stay 1-element (golden 2nd elem
is 'nil'); variant-name keys deliberately not emitted. Audit element-count
guard upgraded warn→FAIL. Golden diff enumerated below.
<paste enumeration>"
```

Note for Step 2.4: after this scope correction the audit's element-count check will still see the 2 filament keys as length-mismatched vs golden (app 1 vs golden 2) — adjust the check to compare **process keys for equality** and **accept app-1-vs-golden-2 on the two filament temp keys** (golden's 2nd elem is "nil"), with a comment citing this plan. The upgraded checkFail must encode exactly that contract, not blanket length-equality.

## Task 3: BAMBU_PROCESS_INHERITS placeholder verification (CR1-L1)

**Files:** Modify: `engine.js:3109-3120` (comments, possibly map rows); `docs/planning/EXPORT-PHASE2-GATE-LEDGER.md` (evidence)

- [ ] **Step 3.1: Desk-verify against Bambu Studio's own profile registry — at a BS 2.5 release tag, not master.** (Review finding 2: `master` is 2.6-era; preset existence there doesn't prove 2.5 availability. Review finding 2 also verified the registry's top-level key is `process_list`, NOT `process` — the naive key silently returns empty and invites a false "no presets" conclusion.) For each of `x1e, p1s, p2s, x2d, h2d_pro`:

```bash
# 1) find the newest BS 2.5 release tag
git ls-remote --tags https://github.com/bambulab/BambuStudio.git | grep -io 'v02\.05[0-9.]*' | sort -V | tail -1
# 2) fetch the registry AT THAT TAG and list matching process presets — fail loudly on a missing key
curl -sf https://raw.githubusercontent.com/bambulab/BambuStudio/<TAG>/resources/profiles/BBL.json \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
pl=d.get('process_list')
assert pl is not None, 'process_list key missing — registry schema changed, STOP and inspect'
names=[p.get('name','') for p in pl]
hits=[n for n in names if any(m in n for m in ('X1E','P1S','P2S','X2D','H2D'))]
print('\n'.join(hits) or 'NO MATCHES (verified against %d presets)' % len(names))"
```

If the sandbox proxy blocks raw.githubusercontent.com (probe first: `curl -s -o /dev/null -w '%{http_code}\n' --max-time 5 https://raw.githubusercontent.com`), fall back to WebFetch on the same tagged path via github.com, and if that also fails, record the check as an owner 5-minute BS-UI task in the ledger (`Preset dropdown → process presets, filter "X1E"`), and leave the maps untouched.

- [ ] **Step 3.2: Apply the outcome.**
  - Presets EXIST for a model → **rebuild the map row name-by-name from the registry output, per layer height — NEVER string-substitute from the x1c row** (review finding 3: P2S/X2D presets use a different quality vocabulary and layer-height set, e.g. `0.08mm High Quality @BBL P2S`, plus nozzle-suffixed variants like `0.10mm Standard @BBL P2S 0.2 nozzle`; a substituted x1c name would be a nonexistent preset). Nozzle-suffixed variants: map only the suffix-free base presets in v1 of the row; record the suffixed set in the ledger for a later `_findProcessParent` nozzle-awareness pass. Add a RED-first walkthrough case asserting `exportBambuStudioJSON({printer:'<id>',…}).process.inherits` equals the new parent name.
  - Presets DON'T exist → change the comment to record verification, e.g. `x1e: null,  // VERIFIED 2026-07-09 vs BBL.json @<commit-ish>: no @BBL X1E process presets in BS 2.5; X1C parents (cross-printer inherits import-tested 2026-07-06)`.
  - Either way, paste the verification evidence (command + output excerpt) into the ledger. **No mutation on an unverified premise — if verification is impossible this session, comments say `UNVERIFIED`, not `verified`.**

- [ ] **Step 3.3: Gate + commit** (walkthrough/audit/golden as in 1.4; golden moves only if map rows changed):

```bash
git add engine.js docs/planning/EXPORT-PHASE2-GATE-LEDGER.md [scripts/walkthrough-harness.js scripts/fixtures/engine-golden.json]
git commit -m "chore(export): verify BAMBU_PROCESS_INHERITS placeholders vs BS profile registry (CR1-L1)"
```

## Task 4: Import-hint UX

**Files:** Modify: `index.html` (~:130), `app.js` (~:1567), `style.css`, `locales/en.json`, `locales/da.json`

- [ ] **Step 4.1: Locale keys** — add to `locales/en.json` (mirror position in `da.json`):

```json
"exportHintBambu": "Import in Bambu Studio 2.5+: File → Import → Import Configs… — the presets appear under your User presets for this printer/nozzle."
```

```json
"exportHintBambu": "Importér i Bambu Studio 2.5+: File → Import → Import Configs… — profilerne dukker op under dine User-presets for denne printer/dyse."
```

- [ ] **Step 4.2: Markup + wiring.** `index.html`: add **after the `.panel-header` div closes, immediately before `<div id="compareBanner">`** — NOT inside `.panel-header` (review finding 8: `.panel-header` is `display:flex` row per `style.css:553`, so a `<p>` inside it becomes a squeezed same-row flex item instead of a line under the buttons):

```html
<p class="export-hint" id="exportHint" style="display:none"></p>
```

`app.js` in the slicer branch at `:1565-1567` (where `exportGroup.style.display='flex'` is set):

```js
      const exportHint = document.getElementById('exportHint');
      exportHint.textContent = T('exportHintBambu');
      exportHint.style.display = '';
```

and in every branch that hides `exportGroup`, also `document.getElementById('exportHint').style.display = 'none';` (locate ALL display toggles of `exportGroup` in this function and mirror them — grep `exportGroup.style.display` before editing).

- [ ] **Step 4.3: CSS** — `style.css`, next to `.export-btn` rules:

```css
.export-hint { font-size: 0.78rem; color: var(--text-secondary, #9aa0a6); margin: 4px 0 0; }
```

(Review-verified: `--text-secondary` does NOT exist in `style.css` — find the actual secondary-text variable used by neighboring muted text (grep the vars block at the top of `style.css`) and use that; the fallback literal above is only a safety net. Language re-render needs no extra wiring: the toggle lives in `render()` at `app.js:1546` and `applyLang()` calls `render()`, so `T('exportHintBambu')` re-translates on switch — review-verified.)

- [ ] **Step 4.4: Preview smoke** — `npx serve -l 4200 .`; verify: Bambu printer → hint visible under buttons, EN + DA, both themes; Orca/Prusa-routed printer → hint hidden; no layout shift on iPhone-width viewport (390px).

- [ ] **Step 4.5: Commit**

```bash
git add index.html app.js style.css locales/en.json locales/da.json
git commit -m "feat(export): import-hint line under Bambu export buttons (EN+DA)"
```

## Task 5: Ironing display de-hardcode — **DROPPED at plan review (do not execute)**

Review finding 5 (verified against data): `data/rules/objective_profiles.json` carries only `ironing_type ∈ {'no ironing','top'}` and `ironing_pattern ∈ {null,'monotonicline'}`, and `slicer_capabilities.json` bambu_studio has NO ironing keys — so (a) the RED test ("a combo with a non-default type/pattern") is unconstructible with current data, (b) the seed label vocabularies appear nowhere in data, and (c) the derivation would change every ironing display line (H0→H1 matrix churn + golden text diffs + a user-visible copy change) for zero information gain today. The hardcode becomes a real bug only when a second ironing vocabulary enters `data/` — **re-queue this as a data-triggered follow-up in ROADMAP** (trigger: any new `ironing_type`/`ironing_pattern` value in `objective_profiles.json`), same pattern as the W3-T7 remedy-migration deferral. Task numbering below is kept to avoid renumbering ripples.

## Task 6: Beta-badge removal

**Files:** Modify: `index.html:131`

- [ ] **Step 6.1:** Delete the line `<span class="beta-badge">Beta</span>` inside `#exportGroup` ONLY (the header badge at `index.html:59` stays). Preview-smoke the panel header.
- [ ] **Step 6.2:** Commit: `feat(export): remove Bambu export Beta badge (gate: 2026-07-06 import test + Phase 2 exit re-test)`. **This commit still merges only behind Task 8's owner re-test — the branch boundary is the badge's real gate.**

## Task 7: iOS mirror train (LOCAL commits, push gate intact)

**Files:** `3dprintassistant-ios/3DPrintAssistant/Engine/engine.js`, `3DPrintAssistantTests/EngineServiceTests.swift`

- [ ] **Step 7.1: Byte-copy + verify**

```bash
cp ~/dev/Claude/Projects/3dprintassistant/engine.js ~/dev/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Engine/engine.js
diff -q ~/dev/Claude/Projects/3dprintassistant/engine.js ~/dev/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Engine/engine.js   # expect: no output
```

- [ ] **Step 7.2: Mirror tests** (follow the existing `testV104_*`/W3 export-test idioms in `EngineServiceTests.swift`; TDD-RED breadcrumb per `3dprintassistant/CLAUDE.md` — inverted-first on the retraction test, `// RED demo verified 2026-07-09` comment):
  - `testP2_TextExportRetractionReadsResolvedSlicerValue` — x1c+pla_basic+std_0.2: parse `Retraction length:` from `formatProfileAsText`, assert equals `resolveProfile` sidecar, not raw base.
  - `testP2_BambuExportEmitsDualVariantArrays` — assert `outer_wall_speed` count==2 && [0]==[1]; `nozzle_temperature` count==**1** (filament temps stay single — golden 2nd elem is "nil"); `print_extruder_variant` absent.
- [ ] **Step 7.3: Full XCTest** — expect 135 existing + 2 new = **137/137** (rerun count from the actual suite; 135 is the last recorded total). NOTE: this machine is the MacBook Air — if Xcode is unavailable here, the iOS mirror commits are prepared but the XCTest run moves to the mac-mini and the ledger records `UNVERIFIED: XCTest pending mac-mini run` (do NOT claim green).
- [ ] **Step 7.4: Commit locally (NO push — iOS push gate)** — one commit for byte-sync, one for tests.

## Task 8: Exit gate — owner import re-test → merge → live verification

- [ ] **Step 8.1: Stage owner-verify artifacts** — regenerate export files from the branch (same recipe as `scripts/fixtures/slicer-golden/_owner-verify/` in the learns-export session): `_owner-verify/p2-x1c-process.json` + `p2-x1c-filament.json` **+ `p2-a1-process.json`** (review finding 4: a1/a1mini/p1p are single-variant machines with no golden proving the dual schema — one A1-class import validates the whole class before it ships to production); commit.
- [ ] **Step 8.2: OWNER (human):** Import all three into Bambu Studio 2.5. Checks: imports accepted (X1C **and A1**); the 7 dual-array keys display sane single values; nozzle temps correct; retraction shows the scaled value. Record PASS/FAIL verbatim in the ledger OWNER-VERIFY block.
  - **FAIL on arrays (either machine) → fallback:** revert Task 2's web commit alone (`git revert <sha>`), re-run gates, re-stage, re-test (1-element form is proven) — OR, if only the A1-class fails, gate `BAMBU_DUAL_VARIANT_PROCESS_FIELDS` emission to an import-tested printer allowlist instead of reverting. **Coordinate iOS on any T2 revert (review finding 10):** re-run the Step 7.1 byte-copy from the reverted web engine and drop/revert the `testP2_BambuExportEmitsDualVariantArrays` commit — the iOS local commits must never hold an engine the web train abandoned. `USE_LEGACY_EXPORT=true` remains the nuclear fallback for the whole passthrough (note: the legacy path is frozen WITH the pre-P1 raw-retraction display and 1-element arrays — flipping it is a known-regression emergency lever, not a clean rollback).
- [ ] **Step 8.3: Merge + deploy**

```bash
git checkout main && git merge --no-ff export-phase2-20260709 && git push
```

- [ ] **Step 8.4: Verify live (commit ≠ deploy)**

```bash
sleep 45 && curl -s https://3dprintassistant.com/engine.js | grep -c "BAMBU_DUAL_VARIANT_PROCESS_FIELDS"   # expect ≥1
node scripts/engine-golden-snapshot.js --check   # on main post-merge: NO DRIFT
```

- [ ] **Step 8.5: Close the books** — ROADMAP: flip the Export row (Bambu stable, badge removed; Phase 3/4 remain), tick the queue items (Phase 2 + HIGH-2 follow-up); ledger final state; wrap per Trigger A. IMPL-036 retirement + Phase 2.7a archive-close happen at full-spec completion (Phase 4), not now.

---

## Verification gate matrix (every engine-touching commit)

| Gate | Command | Expected |
|---|---|---|
| Data | `node scripts/validate-data.js` | 6/6 clean (pre-existing max_mvs warns only) |
| Behavior | `node scripts/walkthrough-harness.js` | clean + new OK lines cumulative |
| Display | `matrix-audit \| grep -v '^Generated:' \| shasum` | H0 throughout (T5 dropped — no display change in this plan) |
| Export | `node scripts/export-audit.js` | 0 FAIL; 0 warn after Task 2 |
| Golden | `engine-golden-snapshot.js` regenerate | diff enumerated per commit; empty for non-engine commits |
| Unit | `for t in scripts/*.test.js; do node $t; done` | all pass |
| iOS | XCTest full suite | all green (count recorded; mac-mini if Air lacks Xcode) |

## Rollback

- Any single task: `git revert <sha>` on the branch (tasks are independent commits).
- Whole train pre-merge: abandon branch; `main` untouched (tag `export-phase2-baseline-20260709`).
- Post-merge: `git revert -m 1 <merge-sha>`; or `USE_LEGACY_EXPORT=true` one-line flip for export-path-only emergencies.

## Open questions — RESOLVED at plan review (hostile fresh-context sub-agent, 2026-07-09; Codex unavailable: CLI too old for configured model `gpt-5.6-sol` — see review record in `docs/reviews/2026-07-09-export-phase2-plan-review.md`)

1. **Dual-variant strategy:** right for the 7 process keys only. Filament temps are `["v","nil"]` in the golden → kept 1-element (T2 rescoped). `print_extruder_variant` stays un-emitted — its golden values are machine-specific variant NAMES; copying X1C's onto other printers would be actively wrong. Residual single-variant-machine risk covered by the A1 file in the Step 8.2 import test.
2. **HIGH-2 boundary confirmed:** the Advanced-panel row is a material-settings surface consumed by web + iOS panels; changing its semantics is a separate owner decision. The two export surfaces are the fix.
3. **T5 dropped** (data carries exactly one enabled ironing vocabulary; RED unconstructible; H1 churn for zero gain). Re-queued as a data-triggered ROADMAP follow-up.
4. **`USE_LEGACY_EXPORT` retained one soak cycle**, with the ledger recording that the legacy path is frozen WITH HIGH-001 raw retraction + 1-element arrays (emergency lever, not clean rollback); delete in the next hygiene pass.
