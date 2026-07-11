# Export-First Overall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use subagents only if the owner explicitly authorizes them in the fresh session.

**Goal:** Finish the remaining printer-export phases before the iOS 1.0.7 issue-fix train: recover and merge Export Phase 2 onto current `main`, then implement Phase 3 Orca, then Phase 4 Prusa; only then resume the already-reviewed iOS 1.0.7 plan.

**Architecture:** Web remains the master for `engine.js` and export behavior. Bambu Phase 2 work already exists on `origin/export-phase2-20260709`, but that branch is stale versus current `origin/main`; do not merge it directly. Recover its export-only changes onto a fresh current-main branch, verify web+iOS parity, merge that, then build Orca and Prusa from current main using the IMPL-043 passthrough pipeline.

**Tech Stack:** Vanilla JS engine (`engine.js`), web UI (`app.js`/`index.html`/locales/styles), Node harnesses (`scripts/export-audit.js`, `scripts/walkthrough-harness.js`, `scripts/engine-golden-snapshot.js`), iOS JSCore engine mirror + XCTest.

## Global Constraints

- Do not merge `origin/export-phase2-20260709` as-is; `git diff origin/main..origin/export-phase2-20260709` currently includes large deletions of newer intake/K2/analytics work.
- Native Orca and Prusa export are not live today. Current code exposes only `exportBambuStudioJSON`; `app.js` shows native export only when `Engine.getSlicerForPrinter(...) === 'bambu_studio'`.
- Web export phases require iOS impact evaluation every time. Engine/data changes must be mirrored byte-identically to `3dprintassistant-ios` and XCTest must be green before declaring the phase merge-ready.
- iOS pushes stay gated: do not push iOS `main` until a TestFlight-ready train is explicitly approved.
- One finding = one commit for implementation/review fixes.
- No TestFlight or App Store action is part of the export web merge unless a later owner command explicitly makes an iOS release train current.

---

## Task 1: Recover and merge Export Phase 2 onto current main

**Files:**
- Modify: `engine.js`
- Modify: `scripts/walkthrough-harness.js`
- Modify: `scripts/export-audit.js`
- Modify: `scripts/fixtures/engine-golden.json`
- Modify: `index.html`, `app.js`, `style.css`, `locales/en.json`, `locales/da.json`
- Create/modify: `docs/planning/EXPORT-PHASE2-GATE-LEDGER.md`
- Mirror later: `../3dprintassistant-ios/3DPrintAssistant/Engine/engine.js`, `../3dprintassistant-ios/3DPrintAssistantTests/EngineServiceTests.swift`

**Interfaces:**
- Consumes: IMPL-043 Phase 0+1 on current `main`; export-only commits from `origin/export-phase2-20260709` (`06b28c7`, `f0d05df`, `89a848d`, `4ebf2e4`, `886702c`, plus owner-verify docs/artifacts as evidence).
- Produces: current-main-safe Bambu hardening: HIGH-2 retraction honesty, 7 dual-variant process arrays, explicit Bambu inherits map, import hint, Bambu export Beta badge removed after preserved owner-verify evidence.

- [ ] **Step 1: Start from current main and create a recovery branch**

```bash
cd ~/dev/Claude/Projects/3dprintassistant
git fetch --all --prune
git checkout main
git pull --ff-only
git checkout -b codex/export-phase2-current-main
git status --short --branch
```

Expected: clean branch based on current `origin/main`.

- [ ] **Step 2: Inspect the stale branch before applying anything**

```bash
git log --oneline --reverse origin/main..origin/export-phase2-20260709
git diff --name-status origin/main..origin/export-phase2-20260709 | sed -n '1,140p'
```

Expected: confirm the branch contains valid export commits but is stale/noisy versus current main. If the diff still shows unrelated deletions, do not merge or cherry-pick the wrap commit wholesale.

- [ ] **Step 3: Reapply only the export Phase 2 code/docs, one finding per commit**

Do not use `git show` as the application step; it only prints patches. Apply the export implementation commits one at a time and commit each accepted finding separately:

```bash
for commit in \
  06b28c7 \
  f0d05df \
  89a848d \
  4ebf2e4 \
  886702c
do
  git cherry-pick --no-commit "$commit"
  git diff --name-only --cached
  git status --short
  git commit -C "$commit"
done
```

Expected: each cherry-pick touches only the export Phase 2 files named by its original commit. If any cherry-pick tries to delete or revert intake/K2/analytics files, abort that cherry-pick and manually apply only the export hunks:

```bash
git cherry-pick --abort
git show <commit> -- <exact export file paths> | git apply --3way
```

After the five implementation commits, preserve the owner-verify evidence in one docs/artifacts commit:

```bash
git checkout origin/export-phase2-20260709 -- docs/planning/EXPORT-PHASE2-GATE-LEDGER.md scripts/fixtures/slicer-golden/_owner-verify
git add docs/planning/EXPORT-PHASE2-GATE-LEDGER.md scripts/fixtures/slicer-golden/_owner-verify
git commit -m "docs(export-p2): preserve owner-verify evidence on current main"
```

Expected final scope: only export Phase 2 files changed; no intake/K2/analytics files deleted or reverted.

- [ ] **Step 4: Run web verification**

```bash
node scripts/validate-data.js
node scripts/walkthrough-harness.js
node scripts/export-audit.js
node scripts/engine-golden-snapshot.js --check
git diff --check
```

Expected: data validation clean, walkthrough clean, export audit `0 FAIL / 0 warn`, golden snapshot no drift except intentionally regenerated and committed if the Phase 2 patch requires it.

- [ ] **Step 5: Mirror to iOS and run XCTest locally on mac-mini**

Air→mini transfer evidence (2026-07-11): `origin/codex/export-phase2-ios-sync-20260711` carries the three existing P2 mirror-test commits (`4210b3c` HIGH-2 retraction, `906e783` dual arrays, `04eec71` inherits). Treat that branch as the source for XCTest hunks and the pending RED breadcrumb, **not** as the final engine snapshot: recover Phase 2 onto current web main first, byte-copy that final engine, then reuse/cherry-pick only the test changes or recreate the assertions. Do not fast-forward iOS blindly if it would replace newer engine/data state.

```bash
cd ~/dev/Claude/Projects
cp 3dprintassistant/engine.js 3dprintassistant-ios/3DPrintAssistant/Engine/engine.js
diff -q 3dprintassistant/engine.js 3dprintassistant-ios/3DPrintAssistant/Engine/engine.js
cd 3dprintassistant-ios
xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant -destination "platform=iOS Simulator,name=iPhone 16 Pro" -derivedDataPath build -only-testing:3DPrintAssistantTests CODE_SIGNING_ALLOWED=NO
```

Expected: byte-identical engine and full unit test pass. If the three old P2 XCTest commits from the Air (`5fcc935`, `662c3c1`, `7221258`) are unavailable, recreate the mirror assertions from the branch/session log rather than pushing stale iOS state.

- [ ] **Step 6: PR, merge, and live-verify**

```bash
cd ~/dev/Claude/Projects/3dprintassistant
git push -u origin codex/export-phase2-current-main
PR_BODY=/tmp/export-phase2-current-main-pr.md
{
  echo "## Summary"
  echo "- Recovers Export Phase 2 onto current main without stale-branch deletions."
  echo "- Keeps Bambu owner-verify evidence."
  echo "- Mirrors engine to iOS locally; iOS push remains gated."
  echo ""
  echo "## Checks"
  echo "- node scripts/validate-data.js"
  echo "- node scripts/walkthrough-harness.js"
  echo "- node scripts/export-audit.js"
  echo "- node scripts/engine-golden-snapshot.js --check"
  echo "- xcodebuild unit tests on mac-mini"
} > "$PR_BODY"
gh pr create --title "Export Phase 2: recover Bambu hardening on current main" --body-file "$PR_BODY"
```

Merge only after checks are green and the PR diff is export-only. After merge:

```bash
git checkout main
git pull --ff-only
curl -s https://3dprintassistant.com/engine.js | grep -q 'BAMBU_DUAL_VARIANT_PROCESS_FIELDS'
```

Expected: production `engine.js` contains the Phase 2 dual-variant marker. The marker name was verified against `origin/export-phase2-20260709` on 2026-07-11 (`engine.js:3245`). Bambu export is stable and no longer marked Beta.

## Task 2: Phase 3 OrcaSlicer native export

**Files:**
- Modify: `engine.js`
- Modify: `app.js`, `index.html`, locales/styles if labels/hints change
- Modify: `scripts/export-audit.js`, `scripts/walkthrough-harness.js`, `scripts/fixtures/engine-golden.json`
- Use fixtures: `scripts/fixtures/slicer-golden/orca-x1c-process-ref.json`, `scripts/fixtures/slicer-golden/orca-x1c-filament-ref.json`
- Mirror later: iOS engine + XCTest

**Interfaces:**
- Consumes: Bambu passthrough pipeline and Orca golden fixtures captured 2026-07-06.
- Produces: `exportOrcaJSON(state)` public API and native JSON downloads for Orca-routed printers; copy-text remains fallback only where native export cannot be safely produced.

- [ ] **Step 1: Write failing export-audit coverage for Orca**

Add checks that prove `Engine.exportOrcaJSON` exists, emits process+filament JSON, uses Orca version/inherits facts from fixtures, keeps `_slicer_value` passthrough, and does not call the Bambu-specific inherits table for non-Bambu printers.

Run: `node scripts/export-audit.js`

Expected: fails because `exportOrcaJSON` does not exist.

- [ ] **Step 2: Implement the smallest shared serializer delta**

Add `exportOrcaJSON(state)` by reusing the Phase 1/2 Bambu passthrough machinery. Keep the delta explicit: Orca version string, Orca fixture key differences, and inherits strategy. Do not create a second mapping pipeline.

- [ ] **Step 3: Wire web UI for Orca-routed printers**

Update `app.js` so Orca-routed printers show native export buttons with Orca labels/extensions. Preserve text-copy fallback if a selected printer has no verified Orca strategy.

- [ ] **Step 4: Verify and record owner import gate**

Run:

```bash
node scripts/validate-data.js
node scripts/walkthrough-harness.js
node scripts/export-audit.js
node scripts/engine-golden-snapshot.js --check
git diff --check
```

Then stage owner-verify Orca sentinel exports. Do not mark Phase 3 stable until an Orca import test is recorded.

- [ ] **Step 5: Mirror iOS engine and test**

Byte-copy `engine.js` to iOS and run XCTest. iOS UI remains hidden unless a separate release train says otherwise.

## Task 3: Phase 4 PrusaSlicer `.ini` export

**Files:**
- Modify: `engine.js`
- Modify: `app.js`, `index.html`, locales/styles if labels/hints change
- Modify: `scripts/export-audit.js`, `scripts/walkthrough-harness.js`, `scripts/fixtures/engine-golden.json`
- Use fixtures: Prusa golden files under `scripts/fixtures/slicer-golden/`
- Mirror later: iOS engine + XCTest

**Interfaces:**
- Consumes: canonical `_slicer_value` pipeline and Prusa fixture key inventory.
- Produces: `exportPrusaINI(state)` public API and `.ini` download for Prusa-routed printers.

- [ ] **Step 1: Write failing Prusa `.ini` audit**

Add checks that prove `Engine.exportPrusaINI` exists, emits `[print:...]` and `[filament:...]` sections, maps shared params to Prusa keys such as `retract_length`, `temperature`, and `first_layer_temperature`, and warns/omits unknowns without failing the whole export.

Run: `node scripts/export-audit.js`

Expected: fails because `exportPrusaINI` does not exist.

- [ ] **Step 2: Implement Prusa `.ini` serializer**

Use the same canonical values as Bambu/Orca. Keep the file format-specific code isolated to `.ini` section/key rendering.

- [ ] **Step 3: Wire web UI for Prusa-routed printers**

Show a Prusa `.ini` download for Prusa printers. Keep text copy as fallback when a required field cannot be mapped.

- [ ] **Step 4: Verify and record owner import gate**

Run the full web gate, stage Prusa sentinel exports, and record a real PrusaSlicer import test before calling Phase 4 stable.

- [ ] **Step 5: Mirror iOS engine and test**

Byte-copy `engine.js` to iOS and run XCTest. iOS UI remains hidden unless a separate release train says otherwise.

## Task 4: Resume iOS 1.0.7 issue-fix release plan

**Files:**
- Existing design: `docs/superpowers/specs/2026-07-11-ios-1.0.7-issue-fix-release-design.md`
- Existing plan: `docs/superpowers/plans/2026-07-11-ios-1.0.7-issue-fix-release-plan.md`
- Existing review: `docs/reviews/2026-07-11-ios-1.0.7-plan-review.md`

**Interfaces:**
- Consumes: the reviewed iOS 1.0.7 issue plan.
- Produces: one new TestFlight build only after planned iOS/web issue-fix work is complete, tests are green, and clean-state audit passes.

- [ ] **Step 1: Rebase the plan context against completed export work**

Before coding, re-read the three iOS plan artifacts and confirm no Export Phase 2/3/4 changes altered the narrow `#4` Output-action scope. Native Orca/Prusa serializers remain separate from iOS 1.0.7 unless explicitly merged into a later iOS release train.

- [ ] **Step 2: Execute the reviewed issue-fix tasks**

Follow the existing plan exactly: GitHub #2, #3, #4, #5, narrow web Worker/dashboard contract, full tests, version/build handling, TestFlight upload only when ready.

- [ ] **Step 3: Finish with a clean-state audit**

Run fresh `git status --short --branch` for every touched repo. No uncommitted dirty state may remain anywhere.
