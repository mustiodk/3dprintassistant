# SPARKX i7 iOS Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make SPARKX i7 available to already-shipped iOS v1.0.3 users through the remote printer overlay, without creating or submitting a new iOS binary.

**Architecture:** Keep web using the bundled `data/printers.json` entry that is already on `main`, and publish the same printer as an additive iOS remote overlay. Fix the web-side overlay validator so it checks collisions against the shipped iOS v1.0.3 catalog baseline, not the current web catalog, because web can add a printer before the iOS binary bundles it.

**Tech Stack:** Static JSON overlay on Cloudflare Pages, Node validator scripts, existing iOS `PrinterCatalogProvider` remote catalog runtime.

---

## File Structure

- Modify: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/scripts/validate-ios-printer-overlay.js`
  - Responsibility: validate the static overlay before web deploy; after this plan it validates bundled-ID collisions against a frozen public iOS baseline.
- Create: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/catalog/ios-bundled-catalog-baselines.json`
  - Responsibility: store the shipped iOS catalog ID set used by overlay validation.
- Modify: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/catalog/ios-printer-overlay-v1.json`
  - Responsibility: publish SPARKX brand and i7 printer as data-only remote content for current iOS clients.
- Modify: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/specs/ios-remote-printer-catalog.md`
  - Responsibility: document that deploy validation uses the shipped iOS baseline, not current web catalog data.
- Do not modify for this hot update: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/**`
  - Current iOS users get this via the remote overlay. Do not create a TestFlight build or App Store submission for this task.

## Task 1: Add Shipped iOS Baseline Validation

**Files:**
- Create: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/catalog/ios-bundled-catalog-baselines.json`
- Modify: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/scripts/validate-ios-printer-overlay.js`

- [ ] **Step 1: Generate the v1.0.3 bundled baseline from the last shipped iOS catalog**

Run from `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant`:

```bash
node - <<'NODE'
const fs = require('fs');
const { execFileSync } = require('child_process');

const iosRepo = '/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios';
const shippedCommit = 'a7dbea9';
const raw = execFileSync('git', ['show', `${shippedCommit}:3DPrintAssistant/Data/printers.json`], {
  cwd: iosRepo,
  encoding: 'utf8',
});
const catalog = JSON.parse(raw);
const baselines = {
  '1.0.3': {
    source: '3dprintassistant-ios a7dbea9 / App Store v1.0.3 bundled printers.json',
    brand_ids: catalog.brands.map((brand) => brand.id),
    printer_ids: catalog.printers.map((printer) => printer.id),
  },
};
fs.writeFileSync('catalog/ios-bundled-catalog-baselines.json', `${JSON.stringify(baselines, null, 2)}\n`);
console.log(`brands=${baselines['1.0.3'].brand_ids.length} printers=${baselines['1.0.3'].printer_ids.length}`);
console.log(`has sparkx brand=${baselines['1.0.3'].brand_ids.includes('sparkx')}`);
console.log(`has sparkx_i7 printer=${baselines['1.0.3'].printer_ids.includes('sparkx_i7')}`);
NODE
```

Expected output:

```text
brands=12 printers=68
has sparkx brand=false
has sparkx_i7 printer=false
```

- [ ] **Step 2: Change the overlay validator to read that baseline**

In `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/scripts/validate-ios-printer-overlay.js`, replace:

```js
const printersPath = path.join(root, 'data', 'printers.json');
```

with:

```js
const iosBaselinesPath = path.join(root, 'catalog', 'ios-bundled-catalog-baselines.json');
```

Replace:

```js
const bundled = JSON.parse(fs.readFileSync(printersPath, 'utf8'));
```

with:

```js
const iosBaselines = JSON.parse(fs.readFileSync(iosBaselinesPath, 'utf8'));
```

After the `min_app_version` compatibility check, add:

```js
const iosBaseline = iosBaselines[overlay.min_app_version];
if (!iosBaseline || !Array.isArray(iosBaseline.brand_ids) || !Array.isArray(iosBaseline.printer_ids)) {
  fail(`missing iOS bundled catalog baseline for min_app_version ${overlay.min_app_version}`);
}
```

Replace:

```js
const bundledBrandIds = new Set(bundled.brands.map((brand) => brand.id));
const brandIds = new Set(bundledBrandIds);
const bundledPrinterIds = new Set(bundled.printers.map((printer) => printer.id));
```

with:

```js
const bundledBrandIds = new Set(iosBaseline.brand_ids);
const brandIds = new Set(bundledBrandIds);
const bundledPrinterIds = new Set(iosBaseline.printer_ids);
```

- [ ] **Step 3: Run the validator against the current empty overlay**

Run:

```bash
node scripts/validate-ios-printer-overlay.js
```

Expected output:

```text
[ios-printer-overlay] ok: 0 brands, 0 printers
```

- [ ] **Step 4: Commit the validator baseline change**

Run:

```bash
git add catalog/ios-bundled-catalog-baselines.json scripts/validate-ios-printer-overlay.js
git commit -m "fix: validate iOS overlay against shipped catalog"
```

## Task 2: Publish SPARKX i7 In The iOS Overlay

**Files:**
- Modify: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/catalog/ios-printer-overlay-v1.json`

- [ ] **Step 1: Update the overlay payload and hash**

Run from `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant`:

```bash
node - <<'NODE'
const fs = require('fs');
const crypto = require('crypto');

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

const overlayPath = 'catalog/ios-printer-overlay-v1.json';
const overlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));

overlay.content_version = 2026051201;
overlay.generated_at = new Date().toISOString();
overlay.min_app_version = '1.0.3';
overlay.enabled = true;
overlay.payload = {
  brands: [
    { id: 'sparkx', name: 'SPARKX', sort_order: 13, primary: false, default_slicer: 'orcaslicer' },
  ],
  printers: [
    {
      id: 'sparkx_i7',
      name: 'i7',
      manufacturer: 'sparkx',
      series: 'bedslinger',
      series_group: 'i Series',
      enclosure: 'none',
      active_chamber_heating: false,
      extruder_type: 'direct_drive',
      max_nozzle_temp: 300,
      max_bed_temp: 100,
      max_speed: 500,
      max_acceleration: 10000,
      has_lidar: false,
      has_camera: true,
      multi_color_systems: ['cfs_lite'],
      available_plates: ['textured_pei'],
      available_nozzle_sizes: [0.2, 0.4, 0.6, 0.8],
      open_door_threshold_bed_temp: null,
      notes: [
        'Open-frame Cartesian bed-slinger — 260×260×255mm build volume',
        'CFS Lite supports up to 4-color printing; CFS Mini is automatic refill only',
        'Quick-swap hardened hotend — 0.4mm installed, 0.2/0.6/0.8 available',
        'ABS, ASA, PC, PA and other high-temperature filaments are not recommended on the open frame',
      ],
    },
  ],
};
overlay.payload_sha256 = sha256(stableStringify(overlay.payload));

fs.writeFileSync(overlayPath, `${JSON.stringify(overlay, null, 2)}\n`);
console.log(overlay.payload_sha256);
NODE
```

- [ ] **Step 2: Validate the non-empty overlay**

Run:

```bash
node scripts/validate-ios-printer-overlay.js
```

Expected output:

```text
[ios-printer-overlay] ok: 1 brands, 1 printers
```

- [ ] **Step 3: Confirm web data still contains the same printer ID**

Run:

```bash
node - <<'NODE'
const web = require('./data/printers.json');
const overlay = require('./catalog/ios-printer-overlay-v1.json');
const webPrinter = web.printers.find((printer) => printer.id === 'sparkx_i7');
const overlayPrinter = overlay.payload.printers.find((printer) => printer.id === 'sparkx_i7');
if (!webPrinter || !overlayPrinter) throw new Error('missing sparkx_i7 in web data or overlay');
console.log(`web=${webPrinter.manufacturer}/${webPrinter.name}`);
console.log(`overlay=${overlayPrinter.manufacturer}/${overlayPrinter.name}`);
NODE
```

Expected output:

```text
web=sparkx/i7
overlay=sparkx/i7
```

- [ ] **Step 4: Commit the overlay payload**

Run:

```bash
git add catalog/ios-printer-overlay-v1.json
git commit -m "data: publish SPARKX i7 iOS overlay"
```

## Task 3: Document The Correct Operations Path

**Files:**
- Modify: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/specs/ios-remote-printer-catalog.md`

- [ ] **Step 1: Update the validation wording**

In `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/specs/ios-remote-printer-catalog.md`, under **Validation**, add this paragraph after the rejection bullet list:

```markdown
Deploy validation checks bundled-ID collisions against the shipped iOS catalog baseline for `min_app_version`, not against the current web `data/printers.json`. This allows web to bundle a printer immediately while iOS v1.0.3 receives the same printer through the additive remote overlay.
```

- [ ] **Step 2: Update future promotion wording**

In the **Promotion From Overlay To Bundled** section, append:

```markdown
If a printer is already in the iOS development branch but not in the public App Store binary, keep it in the remote overlay until the binary that bundles it is actually released. Before adding additional overlay-only printers after that release, publish a higher `content_version` overlay that removes any IDs now bundled by the public binary, or the newer app will reject the whole overlay due to bundled-ID collision.
```

- [ ] **Step 3: Commit the docs update**

Run:

```bash
git add docs/specs/ios-remote-printer-catalog.md
git commit -m "docs: clarify iOS overlay validation baseline"
```

## Task 4: Verify And Deploy Web Only

**Files:**
- No new file edits.

- [ ] **Step 1: Run the full web-side gates**

Run:

```bash
node scripts/validate-data.js
node scripts/validate-ios-printer-overlay.js
node scripts/walkthrough-harness.js > /tmp/3dpa-walkthrough-sparkx-overlay.md
node scripts/profile-matrix-audit.js
```

Expected:

```text
All data files valid.
[ios-printer-overlay] ok: 1 brands, 1 printers
```

For the walkthrough report, run:

```bash
if rg -n '^- ❌' /tmp/3dpa-walkthrough-sparkx-overlay.md; then exit 1; else echo 'no walkthrough failure rows'; fi
```

Expected:

```text
no walkthrough failure rows
```

For the profile matrix audit, expected summary:

```text
Curated scenarios failed core expectations/invariants: 0
Broad invariant sweep failed configurations: 0
```

- [ ] **Step 2: Push only the web repo**

Run:

```bash
git status --short --branch
git push origin main
```

Expected:

```text
## main...origin/main
```

after the push completes.

- [ ] **Step 3: Verify the live overlay after deploy**

After Cloudflare Pages finishes deploying, run:

```bash
curl -fsSL https://3dprintassistant.com/catalog/ios-printer-overlay-v1.json -o /tmp/ios-printer-overlay-live.json
node - <<'NODE'
const fs = require('fs');
const crypto = require('crypto');

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const overlay = JSON.parse(fs.readFileSync('/tmp/ios-printer-overlay-live.json', 'utf8'));
const hash = crypto.createHash('sha256').update(stableStringify(overlay.payload)).digest('hex');
console.log(`content_version=${overlay.content_version}`);
console.log(`hash_ok=${hash === overlay.payload_sha256}`);
console.log(`brands=${overlay.payload.brands.map((brand) => brand.id).join(',')}`);
console.log(`printers=${overlay.payload.printers.map((printer) => printer.id).join(',')}`);
NODE
```

Expected output:

```text
content_version=2026051201
hash_ok=true
brands=sparkx
printers=sparkx_i7
```

## Task 5: iOS Release Hygiene

**Files:**
- No file edits required for the hot update.

- [ ] **Step 1: Do not create an iOS build**

Do not run Fastlane, do not archive, do not upload TestFlight, and do not submit App Store review for this task.

- [ ] **Step 2: Record the 1.0.4 follow-up decision**

Before shipping iOS v1.0.4, choose one of these two options:

```text
Option A, recommended if SPARKX should remain overlay-only for now:
Revert iOS commit c8cbf97 before building v1.0.4.

Option B, recommended if SPARKX should become bundled in v1.0.4:
Ship v1.0.4 with SPARKX bundled, then keep the SPARKX overlay row until normal auto-update uptake is acceptable. Before adding more remote-only rows for v1.0.4+ clients, publish a higher content_version overlay without sparkx/sparkx_i7.
```

## Self-Review

- Spec coverage: The plan adds SPARKX i7 to current iOS users through the existing remote overlay, fixes the validator mismatch that blocked this, keeps web data intact, and explicitly avoids iOS build/submission steps.
- Placeholder scan: No task contains TBD/TODO/later language. Each code or command step has concrete content and expected output.
- Type consistency: Overlay fields match `PrinterCatalogProvider` and `validate-ios-printer-overlay.js` allowlists: brand fields, printer fields, enum values, integer temp/speed/acceleration fields, and `available_nozzle_sizes`.
