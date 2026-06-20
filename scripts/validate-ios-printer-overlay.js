#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const root = path.resolve(__dirname, '..');
const defaultOverlayPath = path.join(root, 'catalog', 'ios-printer-overlay-v1.json');
const defaultBaselinesPath = path.join(root, 'catalog', 'ios-bundled-catalog-baselines.json');
const defaultProjectPath = path.resolve(root, '..', '3dprintassistant-ios', 'project.yml');

// YYYYMMDDXX scheme, capped at 2099-12-31-99 to match the iOS poisoned-cache guard.
const maximumReasonableContentVersion = 2_099_123_199;
const allowedSlicers = new Set(['bambu_studio', 'orcaslicer', 'prusaslicer']);
const allowedSeries = new Set(['corexy', 'bedslinger']);
const allowedEnclosures = new Set(['none', 'passive', 'active_heated']);
const allowedExtruders = new Set(['direct_drive', 'bowden']);
const allowedBrandFields = new Set(['id', 'name', 'sort_order', 'primary', 'default_slicer']);
const allowedPrinterFields = new Set([
  'id',
  'name',
  'manufacturer',
  'series',
  'series_group',
  'enclosure',
  'active_chamber_heating',
  'max_chamber_temp',
  'extruder_type',
  'max_nozzle_temp',
  'max_bed_temp',
  'max_speed',
  'max_acceleration',
  'has_lidar',
  'has_camera',
  'multi_color_systems',
  'available_plates',
  'available_nozzle_sizes',
  'open_door_threshold_bed_temp',
  'notes',
]);

const VERSION_RE = /^\d+\.\d+\.\d+$/;

// The first iOS build whose runtime override-MERGES the overlay by id instead of rejecting the
// WHOLE overlay on any bundled-id collision (Part C — iOS af4bbe0, shipped in v1.0.5). Builds at
// or above this version absorb a colliding overlay id harmlessly (the overlay row overrides the
// bundled one), so the ship gate only needs to collide overlay ids against PRE-Part-C baselines
// in [min_app_version, FIRST_OVERRIDE_MERGE_VERSION). Without this boundary, backfilling the 1.0.5
// baseline (which graduated aries/mega_x into the bundle) would force dropping them from the
// overlay → a v1.0.4 regression. See docs/runbooks/printer-addition-protocol.md Phase 4b.
const FIRST_OVERRIDE_MERGE_VERSION = '1.0.5';

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// Validation failures throw; the CLI wrapper (bottom of file) turns them into a
// non-zero exit. Returning a typed error keeps the validator unit-testable.
function fail(message) {
  throw new Error(message);
}

function parseVersion(value, label) {
  if (typeof value !== 'string' || !VERSION_RE.test(value)) {
    fail(`${label} must use MAJOR.MINOR.PATCH numeric format`);
  }
  return value.split('.').map((part) => Number(part));
}

function compareVersions(a, b) {
  const left = parseVersion(a, 'left version');
  const right = parseVersion(b, 'right version');
  for (let i = 0; i < 3; i += 1) {
    if (left[i] < right[i]) return -1;
    if (left[i] > right[i]) return 1;
  }
  return 0;
}

function readIOSMarketingVersion(projectPath) {
  let project;
  try {
    project = fs.readFileSync(projectPath, 'utf8');
  } catch {
    fail(`unable to read iOS project file: ${projectPath}`);
  }

  const match = project.match(/\bMARKETING_VERSION:\s*["']?(\d+\.\d+\.\d+)["']?/);
  if (!match) fail(`unable to read MARKETING_VERSION from ${projectPath}`);
  return match[1];
}

function requireString(obj, key) {
  if (typeof obj[key] !== 'string' || obj[key].length === 0) fail(`missing/invalid string: ${key}`);
  return obj[key];
}

function requireNumber(obj, key, min, max) {
  if (typeof obj[key] !== 'number' || obj[key] < min || obj[key] > max) {
    fail(`missing/out-of-range number: ${key}`);
  }
  return obj[key];
}

function requireInteger(obj, key, min, max) {
  const value = requireNumber(obj, key, min, max);
  if (!Number.isInteger(value)) fail(`field must be integer: ${key}`);
  return value;
}

function assertAllowedFields(obj, allowed, label) {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) fail(`${label} ${obj.id || '<unknown>'} has unsupported field: ${key}`);
  }
}

function optionalInteger(obj, key, min, max, label) {
  if (obj[key] === undefined || obj[key] === null) return;
  if (typeof obj[key] !== 'number' || !Number.isInteger(obj[key]) || obj[key] < min || obj[key] > max) {
    fail(`${label} ${obj.id} has invalid ${key}`);
  }
}

function optionalBoolean(obj, key, label) {
  if (obj[key] === undefined) return;
  if (typeof obj[key] !== 'boolean') fail(`${label} ${obj.id} has invalid ${key}`);
}

function optionalStringArray(obj, key, label) {
  if (obj[key] === undefined) return;
  if (!Array.isArray(obj[key]) || obj[key].some((value) => typeof value !== 'string')) {
    fail(`${label} ${obj.id} has invalid ${key}`);
  }
}

function assertUnique(items, label) {
  const seen = new Set();
  for (const item of items) {
    const id = requireString(item, 'id');
    if (seen.has(id)) fail(`duplicate ${label} id: ${id}`);
    seen.add(id);
  }
}

// The overlay is delivered to EVERY shipped build with version >= min_app_version. Builds BELOW
// FIRST_OVERRIDE_MERGE_VERSION (Part C) reject the WHOLE overlay on any collision with the running
// app's bundled catalog, so the ship gate must check overlay ids against the union of those
// pre-Part-C bundled baselines in [min_app_version, FIRST_OVERRIDE_MERGE_VERSION) — not just
// min_app_version's baseline. (A single-baseline check is exactly what let the i7+aries overlay
// pass the gate yet be rejected on v1.0.4, where i7 is bundled. See
// docs/superpowers/specs/2026-06-14-ios-overlay-aries-collision-fix-design.md.) Builds >=
// FIRST_OVERRIDE_MERGE_VERSION override-merge by id (the overlay row replaces the bundled one), so
// their baselines are deliberately EXCLUDED from the collision union — that is what lets the
// overlay keep aries/mega_x (now bundled at 1.0.5) while still adding new printers. The
// MARKETING_VERSION baseline is still REQUIRED to exist (anti-staleness, in validateOverlay); it is
// just not collided against once it is at/after the override-merge boundary.
function collectBaselineUnion(iosBaselines, minAppVersion, firstOverrideMergeVersion = FIRST_OVERRIDE_MERGE_VERSION) {
  const brandUnion = new Set();
  const printerUnion = new Set();
  const includedVersions = [];
  for (const key of Object.keys(iosBaselines)) {
    if (!VERSION_RE.test(key)) continue; // skip non-version top-level keys (e.g. a future _comment)
    if (compareVersions(key, minAppVersion) < 0) continue; // only baselines >= min_app_version
    if (compareVersions(key, firstOverrideMergeVersion) >= 0) continue; // builds >= boundary override-merge — no collision
    const base = iosBaselines[key];
    if (!base || !Array.isArray(base.brand_ids) || !Array.isArray(base.printer_ids)) {
      fail(`baseline ${key} is malformed (brand_ids and printer_ids must be arrays)`);
    }
    base.brand_ids.forEach((id) => brandUnion.add(id));
    base.printer_ids.forEach((id) => printerUnion.add(id));
    includedVersions.push(key);
  }
  return { brandUnion, printerUnion, includedVersions };
}

// The set of brand ids a printer's `manufacturer` may reference. This is DISTINCT from the
// collision union: it spans ALL bundled baselines >= min_app_version, including override-merge
// (>= FIRST_OVERRIDE_MERGE_VERSION) builds. A brand bundled only in a >= 1.0.5 build (e.g.
// `voxelab`) is a legitimate manufacturer even though it is deliberately absent from the collision
// union — so resolving manufacturer refs against the collision union alone would falsely reject a
// valid printer once a future overlay raises min_app_version past the boundary. (Codex review,
// 2026-06-20: "split collision union from known-brand union.")
function collectKnownBrandIds(iosBaselines, minAppVersion) {
  const known = new Set();
  for (const key of Object.keys(iosBaselines)) {
    if (!VERSION_RE.test(key)) continue;
    if (compareVersions(key, minAppVersion) < 0) continue;
    const base = iosBaselines[key];
    if (base && Array.isArray(base.brand_ids)) base.brand_ids.forEach((id) => known.add(id));
  }
  return known;
}

/**
 * Validate the iOS printer overlay against the bundled-catalog baselines.
 * Pure + injectable so it is unit-testable; throws Error on any validation failure.
 * @returns {{ ok: true, summary: string }}
 */
function validateOverlay({
  overlayPath = defaultOverlayPath,
  baselinesPath = defaultBaselinesPath,
  projectPath = defaultProjectPath,
} = {}) {
  const overlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
  const iosBaselines = JSON.parse(fs.readFileSync(baselinesPath, 'utf8'));
  const iosMarketingVersion = readIOSMarketingVersion(projectPath);

  if (overlay.schema_version !== 1) fail('schema_version must be 1');
  if (!Number.isInteger(overlay.content_version) || overlay.content_version < 1) fail('content_version must be a positive integer');
  if (overlay.content_version > maximumReasonableContentVersion) {
    fail(`content_version must be <= ${maximumReasonableContentVersion}`);
  }
  if (typeof overlay.enabled !== 'boolean') fail('enabled must be boolean');
  parseVersion(overlay.min_app_version, 'min_app_version');
  if (compareVersions(overlay.min_app_version, iosMarketingVersion) > 0) {
    fail(`min_app_version ${overlay.min_app_version} is newer than iOS MARKETING_VERSION ${iosMarketingVersion}`);
  }

  // Require a baseline for min_app_version AND for the current MARKETING_VERSION, so the
  // baselines file cannot silently go stale the next time a binary bakes in a printer.
  const minBaseline = iosBaselines[overlay.min_app_version];
  if (!minBaseline || !Array.isArray(minBaseline.brand_ids) || !Array.isArray(minBaseline.printer_ids)) {
    fail(`missing iOS bundled catalog baseline for min_app_version ${overlay.min_app_version}`);
  }
  const marketingBaseline = iosBaselines[iosMarketingVersion];
  if (!marketingBaseline || !Array.isArray(marketingBaseline.brand_ids) || !Array.isArray(marketingBaseline.printer_ids)) {
    fail(`missing iOS bundled catalog baseline for current MARKETING_VERSION ${iosMarketingVersion} — add a bundled-catalog baseline for ${iosMarketingVersion}`);
  }

  if (!overlay.payload || typeof overlay.payload !== 'object') fail('payload must be object');
  if (!Array.isArray(overlay.payload.brands)) fail('payload.brands must be array');
  if (!Array.isArray(overlay.payload.printers)) fail('payload.printers must be array');

  const actualHash = sha256(stableStringify(overlay.payload));
  if (actualHash !== overlay.payload_sha256) {
    fail(`payload_sha256 mismatch: expected ${overlay.payload_sha256}, got ${actualHash}`);
  }

  assertUnique(overlay.payload.brands, 'brand');
  assertUnique(overlay.payload.printers, 'printer');

  const { brandUnion, printerUnion, includedVersions } = collectBaselineUnion(iosBaselines, overlay.min_app_version);
  // Collision is checked against `brandUnion`/`printerUnion` (pre-override baselines only);
  // manufacturer references resolve against the wider known-brand set (all baselines >= min).
  const brandIds = collectKnownBrandIds(iosBaselines, overlay.min_app_version);

  for (const brand of overlay.payload.brands) {
    assertAllowedFields(brand, allowedBrandFields, 'brand');
    const id = requireString(brand, 'id');
    if (brandUnion.has(id)) fail(`overlay brand ${id} already exists in a bundled baseline in [${overlay.min_app_version}, ${FIRST_OVERRIDE_MERGE_VERSION}) (pre-override-merge builds reject the whole overlay on collision)`);
    requireString(brand, 'name');
    requireInteger(brand, 'sort_order', 1, 10_000);
    if (typeof brand.primary !== 'boolean') fail(`brand ${id} primary must be boolean`);
    if (!allowedSlicers.has(requireString(brand, 'default_slicer'))) fail(`brand ${id} has unsupported default_slicer`);
    brandIds.add(id);
  }

  for (const printer of overlay.payload.printers) {
    assertAllowedFields(printer, allowedPrinterFields, 'printer');
    const id = requireString(printer, 'id');
    if (printerUnion.has(id)) fail(`overlay printer ${id} already exists in a bundled baseline in [${overlay.min_app_version}, ${FIRST_OVERRIDE_MERGE_VERSION}) (pre-override-merge builds reject the whole overlay on collision)`);
    requireString(printer, 'name');
    const manufacturer = requireString(printer, 'manufacturer');
    if (!brandIds.has(manufacturer)) fail(`printer ${id} references unknown manufacturer ${manufacturer}`);
    if (!allowedSeries.has(requireString(printer, 'series'))) fail(`printer ${id} has unsupported series`);
    requireString(printer, 'series_group');
    if (!allowedEnclosures.has(requireString(printer, 'enclosure'))) fail(`printer ${id} has unsupported enclosure`);
    if (!allowedExtruders.has(requireString(printer, 'extruder_type'))) fail(`printer ${id} has unsupported extruder_type`);
    requireInteger(printer, 'max_nozzle_temp', 150, 450);
    requireInteger(printer, 'max_bed_temp', 0, 200);
    requireInteger(printer, 'max_speed', 1, 1_500);
    requireInteger(printer, 'max_acceleration', 1, 100_000);
    optionalInteger(printer, 'max_chamber_temp', 0, 120, 'printer');
    optionalInteger(printer, 'open_door_threshold_bed_temp', 0, 120, 'printer');
    optionalBoolean(printer, 'active_chamber_heating', 'printer');
    optionalBoolean(printer, 'has_lidar', 'printer');
    optionalBoolean(printer, 'has_camera', 'printer');
    optionalStringArray(printer, 'multi_color_systems', 'printer');
    optionalStringArray(printer, 'available_plates', 'printer');
    optionalStringArray(printer, 'notes', 'printer');
    if (!Array.isArray(printer.available_nozzle_sizes) || printer.available_nozzle_sizes.length === 0) {
      fail(`printer ${id} available_nozzle_sizes must be a non-empty array`);
    }
    for (const size of printer.available_nozzle_sizes) {
      if (typeof size !== 'number' || size < 0.1 || size > 2.0) fail(`printer ${id} has invalid nozzle size ${size}`);
    }
  }

  return {
    ok: true,
    summary: `ok: ${overlay.payload.brands.length} brands, ${overlay.payload.printers.length} printers (collision-checked vs baselines: ${includedVersions.join(', ') || 'none'})`,
  };
}

module.exports = { validateOverlay, collectBaselineUnion, collectKnownBrandIds, compareVersions, stableStringify, sha256, FIRST_OVERRIDE_MERGE_VERSION };

if (require.main === module) {
  try {
    const result = validateOverlay();
    console.log(`[ios-printer-overlay] ${result.summary}`);
  } catch (error) {
    console.error(`[ios-printer-overlay] ${error.message}`);
    process.exit(1);
  }
}
