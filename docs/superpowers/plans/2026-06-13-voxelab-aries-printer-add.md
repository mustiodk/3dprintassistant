# Voxelab Aries Printer Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Voxelab Aries as a supported FDM printer in web bundled data, the iOS bundled mirror, and the additive iOS remote printer overlay.

**Architecture:** Web `data/printers.json` remains the source of truth. iOS receives a byte-identical bundled data copy, and current App Store users receive the same new brand/printer through `catalog/ios-printer-overlay-v1.json`. No `engine.js`, UI, validator, material, nozzle, or marketing changes are allowed in this arc.

**Tech Stack:** JSON data catalog, Node.js validation scripts, web walkthrough/profile audit harnesses, Swift/iOS XCTest for bundled data mirror.

---

## Scope And Decisions

**Owner approvals already received:**

- Voxelab is approved as a new brand row.
- Aries uses the existing `bedslinger` engine bucket as a conservative tuning bucket, even though mechanically it is an Ender-5-style Cartesian cube rather than a literal moving-bed Y slinger.

**Source hierarchy to apply:**

- Manufacturer data overrides reseller data when the model/revision clearly matches.
- Manufacturer manual confirms FDM scope, build volume, 1.75 mm filament, 0.4 mm nozzle, PLA/ABS/PETG support, 250 C nozzle max, 110 C bed max, 180 mm/s max speed, glass build plate, and single-nozzle operation.
- Reseller 100 C bed value conflicts with the manual's 110 C value. Use 110 C and record the conflict.
- Reviews and photos support the open-frame/no-enclosure decision and Bowden-style extruder layout.
- Booleans absent from the manual/reviews (`has_lidar`, `has_camera`, `multi_color_systems`) use a recorded absence rationale: these are marketed features when present, and the manual/reviews list no camera, lidar, or multi-material system.

**Only unresolved profile field:**

- `max_acceleration` has no manufacturer-published value found in the sources. The planned value is `5000`, explicitly treated as a conservative 3dpa app-side cap, not a claimed manufacturer maximum. This is allowed to ship only if the risk-triggered reviewer accepts the exception. If the reviewer rejects it, the candidate remains `needs-source-resolution` and the data/catalog commits must not be pushed.

**Final proposed printer object:**

```json
{
  "id": "aries",
  "name": "Aries",
  "manufacturer": "voxelab",
  "series": "bedslinger",
  "series_group": "Aries Series",
  "enclosure": "none",
  "active_chamber_heating": false,
  "extruder_type": "bowden",
  "max_nozzle_temp": 250,
  "max_bed_temp": 110,
  "max_speed": 180,
  "max_acceleration": 5000,
  "has_lidar": false,
  "has_camera": false,
  "multi_color_systems": [],
  "available_plates": ["smooth_glass"],
  "available_nozzle_sizes": [0.4],
  "open_door_threshold_bed_temp": null,
  "notes": [
    "Open-frame Ender-5-style Cartesian cube mapped to the conservative bedslinger tuning bucket",
    "Official manual lists FDM, 200x200x200mm build volume, 250 C nozzle, 110 C bed and 180 mm/s max speed",
    "Manual lists 0.4mm standard nozzle and glass build plate; other nozzle sizes not confirmed",
    "Conservative 5000 mm/s^2 app acceleration cap used because manufacturer max acceleration was not published"
  ]
}
```

**Final proposed brand row:**

```json
{ "id": "voxelab", "name": "Voxelab", "sort_order": 12, "primary": false, "default_slicer": "orcaslicer" }
```

Move `diy` from `sort_order: 12` to `sort_order: 13` so real brands stay above DIY / Other.

## Files

- Create: `docs/superpowers/plans/2026-06-13-voxelab-aries-printer-add.md`
- Modify: `scripts/picker-dry-run.test.js`
- Modify: `data/printers.json`
- Modify: `scripts/walkthrough-harness.js`
- Modify: `catalog/ios-printer-overlay-v1.json`
- Modify: `../3dprintassistant-ios/3DPrintAssistant/Data/printers.json`
- Potential modify after completion: `docs/planning/ROADMAP.md`
- Generate verification artifact: `docs/reviews/2026-06-13-profile-matrix-audit-voxelab-aries.md`

## Task 1: Commit This Plan

**Files:**
- Create: `docs/superpowers/plans/2026-06-13-voxelab-aries-printer-add.md`

- [ ] **Step 1: Verify workspace is clean enough to plan**

Run:

```bash
git -C /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant status --short --branch
git -C /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant-ios status --short --branch
```

Expected: both repos on `main...origin/main`, no tracked changes before plan creation.

- [ ] **Step 2: Commit the plan**

Run:

```bash
cd /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant
git add docs/superpowers/plans/2026-06-13-voxelab-aries-printer-add.md
git commit -m "docs: plan Voxelab Aries printer add"
```

Expected: one docs-only commit.

## Task 2: Add Failing Picker Regression

**Files:**
- Modify: `scripts/picker-dry-run.test.js`

- [ ] **Step 1: Run the current picker tests as baseline**

Run:

```bash
cd /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant
node scripts/picker-dry-run.test.js
```

Expected before edits: `ALL 6 TESTS PASS`.

- [ ] **Step 2: Add TC7 before the final summary block**

Add:

```js
// -- TC7 - GREEN: Voxelab Aries taxonomy path --
//   This starts RED before data is added, then guards the new brand ->
//   series_group -> printer path after the catalog change.
{
  console.log('TC7 - GREEN: voxelab / "Aries Series" / aries');
  const r = run(['voxelab', 'Aries Series', 'aries']);
  check('exit code 0', r.code === 0, `got ${r.code}; stdout=${r.stdout}; stderr=${r.stderr}`);
  check('stdout contains GREEN', /GREEN/.test(r.stdout), `stdout=${r.stdout}`);
}
```

Change the final success line from:

```js
console.log(`ALL ${6} TESTS PASS`);
```

to:

```js
console.log(`ALL ${7} TESTS PASS`);
```

- [ ] **Step 3: Verify RED**

Run:

```bash
node scripts/picker-dry-run.test.js
```

Expected: exit code `1`, TC7 fails because `voxelab` / `aries` is not in `data/printers.json` yet.

Do not commit this test alone; keep it staged for the web data commit.

## Task 3: Add Web Printer Data And Walkthrough Coverage

**Files:**
- Modify: `data/printers.json`
- Modify: `scripts/walkthrough-harness.js`
- Modify: `scripts/picker-dry-run.test.js`
- Generate: `docs/reviews/2026-06-13-profile-matrix-audit-voxelab-aries.md`

- [ ] **Step 1: Add the Voxelab brand row**

In `data/printers.json`, insert Voxelab after Voron and before DIY:

```json
{ "id": "voxelab", "name": "Voxelab", "sort_order": 12, "primary": false, "default_slicer": "orcaslicer" },
{ "id": "diy", "name": "DIY / Other", "sort_order": 13, "primary": false, "default_slicer": "orcaslicer" }
```

- [ ] **Step 2: Add the Aries printer row**

Insert the printer object from "Final proposed printer object" after the Voron printers and before the DIY community-build printers.

- [ ] **Step 3: Add walkthrough combo 12**

In `scripts/walkthrough-harness.js`, append:

```js
  { id: 12, label: 'Voxelab Aries + 0.4 std + ABS + Standard/Balanced (legacy Bowden open-frame cube)',
    state: stateDefault({ printer: 'aries', nozzle: 'std_0.4', material: 'abs' }) },
```

Expected behavior: combo exercises an open-frame high-temp material on the new conservative bedslinger/Bowden bucket.

- [ ] **Step 4: Verify GREEN picker regression**

Run:

```bash
node scripts/picker-dry-run.test.js
node scripts/picker-dry-run.js voxelab "Aries Series" aries
```

Expected: first command exits `0` with `ALL 7 TESTS PASS`; second command exits `0` and prints `GREEN`.

- [ ] **Step 5: Run web data gates**

Run:

```bash
node scripts/validate-data.js
node scripts/walkthrough-harness.js > /tmp/voxelab-aries-walkthrough.md
node scripts/profile-matrix-audit.js > docs/reviews/2026-06-13-profile-matrix-audit-voxelab-aries.md
```

Expected:

- `validate-data` exits `0`.
- walkthrough exits `0`.
- profile matrix audit exits `0`, with no broad invariant failures and no curated core failures in the generated report.

- [ ] **Step 6: Commit the web data change**

Run:

```bash
git add data/printers.json scripts/picker-dry-run.test.js scripts/walkthrough-harness.js docs/reviews/2026-06-13-profile-matrix-audit-voxelab-aries.md
git commit -m "data: add Voxelab Aries (Aries Series)"
```

Commit body must cite the source URLs and note:

- Voxelab new brand owner approval.
- `bedslinger` is a conservative tuning bucket for an Ender-5-style Cartesian cube.
- Manual 110 C bed overrides reseller 100 C conflict.
- `max_acceleration=5000` is a conservative 3dpa app cap, not a sourced manufacturer maximum, pending reviewer acceptance.

## Task 4: Publish Additive iOS Overlay

**Files:**
- Modify: `catalog/ios-printer-overlay-v1.json`

- [ ] **Step 1: Update overlay payload**

Set:

```json
"content_version": 2026061301,
"generated_at": "2026-06-13T14:58:46Z"
```

Append the Voxelab brand row to `payload.brands`, and append the Aries printer row to `payload.printers` while preserving the existing `sparkx_i7` entry.

- [ ] **Step 2: Recompute payload hash**

Use the same stable key-order algorithm as `scripts/validate-ios-printer-overlay.js`:

```bash
node - <<'NODE'
const fs = require('fs');
const crypto = require('crypto');
const file = 'catalog/ios-printer-overlay-v1.json';
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
const overlay = JSON.parse(fs.readFileSync(file, 'utf8'));
overlay.payload_sha256 = crypto.createHash('sha256').update(stableStringify(overlay.payload)).digest('hex');
fs.writeFileSync(file, `${JSON.stringify(overlay, null, 2)}\n`);
NODE
```

- [ ] **Step 3: Validate overlay**

Run:

```bash
node scripts/validate-ios-printer-overlay.js
```

Expected: exits `0` and reports `ok: 1 brands, 2 printers`.

- [ ] **Step 4: Commit overlay**

Run:

```bash
git add catalog/ios-printer-overlay-v1.json
git commit -m "data: publish Voxelab Aries iOS overlay (content_version=2026061301)"
```

## Task 5: Sync iOS Bundled Data

**Files:**
- Modify: `../3dprintassistant-ios/3DPrintAssistant/Data/printers.json`

- [ ] **Step 1: Copy the web source of truth to iOS**

Run:

```bash
cp /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/data/printers.json /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Data/printers.json
diff -q /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/data/printers.json /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Data/printers.json
```

Expected: `diff -q` prints nothing and exits `0`.

- [ ] **Step 2: Run iOS unit verification**

Run:

```bash
cd /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant-ios
xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant -destination 'platform=iOS Simulator,name=iPhone 17,OS=latest' -only-testing:3DPrintAssistantTests CODE_SIGNING_ALLOWED=NO
```

Expected: test action exits `0`. If the named simulator is unavailable, run `xcrun simctl list devices available` and retry with an available iPhone simulator. If no simulator is available, report the exact blocker and do not claim iOS tests passed.

- [ ] **Step 3: Commit iOS mirror locally**

Run:

```bash
git add 3DPrintAssistant/Data/printers.json
git commit -m "data: sync printers.json - add Voxelab Aries"
```

Do not push iOS `main`; the iOS push gate still applies.

## Task 6: Risk Review, Final Verification, And Web Push

**Files:**
- Review current web and iOS commits.
- Potential modify: files from Tasks 3-5 if reviewer finds issues.
- Potential modify: `docs/planning/ROADMAP.md` after completion.

- [ ] **Step 1: Run risk-triggered review**

Risk triggers fired:

- New `brands[]` row.
- New `series_group`.
- Overlay publish.
- Manufacturer/reseller bed-temperature conflict.
- Non-obvious `bedslinger` mapping.
- Inferred/absence-rationale booleans.
- Unsourced `max_acceleration` app-cap exception.

Review question:

```text
Review the Voxelab Aries printer-add commits against docs/runbooks/printer-addition-protocol.md.
Pay special attention to whether max_acceleration=5000 is acceptable as an explicitly documented conservative 3dpa app cap, or whether that must block shipping as needs-source-resolution.
Return GO only if the web data, overlay, iOS mirror, source/conflict handling, and tests are sufficient for production web push. Otherwise return NO-GO with concrete fixes.
```

- [ ] **Step 2: Patch any valid findings**

If review returns Critical or Important findings, patch them before continuing. If review returns NO-GO on the acceleration exception, stop and leave the candidate as `needs-source-resolution`.

- [ ] **Step 3: Re-run final web verification**

Run:

```bash
cd /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant
node scripts/validate-data.js
node scripts/picker-dry-run.test.js
node scripts/picker-dry-run.js voxelab "Aries Series" aries
node scripts/walkthrough-harness.js > /tmp/voxelab-aries-walkthrough-final.md
node scripts/profile-matrix-audit.js > docs/reviews/2026-06-13-profile-matrix-audit-voxelab-aries.md
node scripts/validate-ios-printer-overlay.js
```

Expected: all commands exit `0`.

- [ ] **Step 4: Re-run final iOS mirror verification**

Run:

```bash
diff -q /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/data/printers.json /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Data/printers.json
```

Expected: no output, exit `0`.

Also include the latest iOS XCTest result from Task 5.

- [ ] **Step 5: Data/logic-change evaluation**

Record this in the final note and ROADMAP update if applicable:

- Web UI: no structural UI change needed; the existing brand -> series -> printer picker consumes the new brand/printer automatically.
- iOS UI: no binary UI change needed for current users; the remote overlay merges the new brand/printer into the existing picker on next launch. Bundled mirror prepares the next binary.
- Engine: no change; existing `bedslinger` conservative path is intentionally reused.

- [ ] **Step 6: Update ROADMAP**

Update `docs/planning/ROADMAP.md` so the Printer Intake Automation item no longer says Aries is blocked only on owner sign-off/taxonomy after this run. It should describe the actual outcome:

- If shipped: Voxelab Aries added through bundled web data + additive iOS overlay; Photon remains declined-non-FDM.
- If blocked: Voxelab Aries remains `needs-source-resolution` because review rejected the acceleration exception.

- [ ] **Step 7: Push web only if GO**

Run:

```bash
git -C /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant push
```

Do not push `3dprintassistant-ios`.

- [ ] **Step 8: Confirm live overlay after Cloudflare deploy**

Run:

```bash
curl -s https://3dprintassistant.com/catalog/ios-printer-overlay-v1.json | jq '{content_version, brands: .payload.brands|map(.id), printers: .payload.printers|map(.id)}'
```

Expected after deploy: `content_version` is `2026061301`, brands include `voxelab`, printers include `sparkx_i7` and `aries`.
