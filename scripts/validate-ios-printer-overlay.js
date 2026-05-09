#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const root = path.resolve(__dirname, '..');
const overlayPath = path.join(root, 'catalog', 'ios-printer-overlay-v1.json');
const printersPath = path.join(root, 'data', 'printers.json');

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

function fail(message) {
  console.error(`[ios-printer-overlay] ${message}`);
  process.exit(1);
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

const overlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
const bundled = JSON.parse(fs.readFileSync(printersPath, 'utf8'));

if (overlay.schema_version !== 1) fail('schema_version must be 1');
if (!Number.isInteger(overlay.content_version) || overlay.content_version < 1) fail('content_version must be a positive integer');
if (typeof overlay.enabled !== 'boolean') fail('enabled must be boolean');
if (typeof overlay.min_app_version !== 'string') fail('min_app_version must be string');
if (!overlay.payload || typeof overlay.payload !== 'object') fail('payload must be object');
if (!Array.isArray(overlay.payload.brands)) fail('payload.brands must be array');
if (!Array.isArray(overlay.payload.printers)) fail('payload.printers must be array');

const actualHash = sha256(stableStringify(overlay.payload));
if (actualHash !== overlay.payload_sha256) {
  fail(`payload_sha256 mismatch: expected ${overlay.payload_sha256}, got ${actualHash}`);
}

assertUnique(overlay.payload.brands, 'brand');
assertUnique(overlay.payload.printers, 'printer');

const brandIds = new Set(bundled.brands.map((brand) => brand.id));
for (const brand of overlay.payload.brands) {
  assertAllowedFields(brand, allowedBrandFields, 'brand');
  requireString(brand, 'name');
  requireInteger(brand, 'sort_order', 1, 10_000);
  if (typeof brand.primary !== 'boolean') fail(`brand ${brand.id} primary must be boolean`);
  if (!allowedSlicers.has(requireString(brand, 'default_slicer'))) fail(`brand ${brand.id} has unsupported default_slicer`);
  brandIds.add(brand.id);
}

for (const printer of overlay.payload.printers) {
  assertAllowedFields(printer, allowedPrinterFields, 'printer');
  const id = requireString(printer, 'id');
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

console.log(`[ios-printer-overlay] ok: ${overlay.payload.brands.length} brands, ${overlay.payload.printers.length} printers`);
