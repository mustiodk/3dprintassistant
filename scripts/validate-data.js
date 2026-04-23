#!/usr/bin/env node
// ─── 3D Print Assistant — Data Validation Script ─────────────────────────────
// Validates all JSON files under data/ against their expected schema.
// Run: node scripts/validate-data.js
// Exit 0 = all valid. Exit 1 = errors found.

const fs   = require('fs');
const path = require('path');

const ROOT  = path.join(__dirname, '..');
const DATA  = path.join(ROOT, 'data');
const RULES = path.join(DATA, 'rules');

let errors = 0;

// ── Helpers ──────────────────────────────────────────────────────────────────

function load(filePath) {
  const rel = path.relative(ROOT, filePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    fail(rel, `Cannot parse JSON: ${e.message}`);
    return null;
  }
}

function fail(file, msg) {
  console.error(`  ✗ [${file}] ${msg}`);
  errors++;
}

function check(file, condition, msg) {
  if (!condition) fail(file, msg);
}

function isString(v)  { return typeof v === 'string' && v.length > 0; }
function isNumber(v)  { return typeof v === 'number' && isFinite(v); }
function isBoolean(v) { return typeof v === 'boolean'; }
function isArray(v)   { return Array.isArray(v); }
function isObject(v)  { return v !== null && typeof v === 'object' && !Array.isArray(v); }

// ── Validators ───────────────────────────────────────────────────────────────

function validatePrinters() {
  const file = 'data/printers.json';
  const d = load(path.join(DATA, 'printers.json'));
  if (!d) return;

  check(file, isArray(d.brands)   && d.brands.length > 0,   'brands must be a non-empty array');
  check(file, isArray(d.printers) && d.printers.length > 0, 'printers must be a non-empty array');

  const VALID_ENCLOSURES = ['none', 'passive', 'active_heated'];
  const VALID_SLICERS    = ['bambu_studio', 'orcaslicer', 'prusaslicer'];
  const brandIds         = new Set();

  (d.brands || []).forEach((b, i) => {
    const ctx = `brands[${i}] (id=${b.id})`;
    check(file, isString(b.id),           `${ctx}: id must be a non-empty string`);
    check(file, isString(b.name),         `${ctx}: name must be a non-empty string`);
    check(file, isNumber(b.sort_order),   `${ctx}: sort_order must be a number`);
    check(file, isBoolean(b.primary),     `${ctx}: primary must be a boolean`);
    check(file, VALID_SLICERS.includes(b.default_slicer), `${ctx}: default_slicer must be one of ${VALID_SLICERS.join(', ')}`);
    if (isString(b.id)) brandIds.add(b.id);
  });

  (d.printers || []).forEach((p, i) => {
    const ctx = `printers[${i}] (id=${p.id})`;
    check(file, isString(p.id),           `${ctx}: id must be a non-empty string`);
    check(file, isString(p.name),         `${ctx}: name must be a non-empty string`);
    check(file, isString(p.manufacturer), `${ctx}: manufacturer must be a non-empty string`);
    check(file, brandIds.has(p.manufacturer), `${ctx}: manufacturer '${p.manufacturer}' not found in brands`);
    check(file, VALID_ENCLOSURES.includes(p.enclosure), `${ctx}: enclosure must be one of ${VALID_ENCLOSURES.join(', ')}`);
    check(file, isNumber(p.max_nozzle_temp),  `${ctx}: max_nozzle_temp must be a number`);
    check(file, isNumber(p.max_bed_temp),     `${ctx}: max_bed_temp must be a number`);
    check(file, isNumber(p.max_speed),        `${ctx}: max_speed must be a number`);
    check(file, isArray(p.available_nozzle_sizes) && p.available_nozzle_sizes.length > 0, `${ctx}: available_nozzle_sizes must be a non-empty array`);
    check(file, isBoolean(p.has_lidar),       `${ctx}: has_lidar must be a boolean`);
    check(file, isBoolean(p.has_camera),      `${ctx}: has_camera must be a boolean`);
  });
}

function validateMaterials() {
  const file = 'data/materials.json';
  const d = load(path.join(DATA, 'materials.json'));
  if (!d) return;

  check(file, isArray(d.materials) && d.materials.length > 0, 'materials must be a non-empty array');

  const VALID_DIFFICULTY = ['beginner', 'intermediate', 'advanced'];

  (d.materials || []).forEach((m, i) => {
    const ctx = `materials[${i}] (id=${m.id})`;
    check(file, isString(m.id),          `${ctx}: id must be a non-empty string`);
    check(file, isString(m.name),        `${ctx}: name must be a non-empty string`);
    check(file, isString(m.group),       `${ctx}: group must be a non-empty string`);
    check(file, VALID_DIFFICULTY.includes(m.difficulty), `${ctx}: difficulty must be one of ${VALID_DIFFICULTY.join(', ')}`);
    check(file, isBoolean(m.enclosure_required), `${ctx}: enclosure_required must be a boolean`);
    check(file, isObject(m.base_settings),       `${ctx}: base_settings must be an object`);

    if (isObject(m.base_settings)) {
      const bs  = m.base_settings;
      const bsc = `${ctx}.base_settings`;
      check(file, isNumber(bs.nozzle_temp_base), `${bsc}: nozzle_temp_base must be a number`);
      check(file, isNumber(bs.bed_temp_base),    `${bsc}: bed_temp_base must be a number`);
      check(file, isObject(bs.max_mvs),          `${bsc}: max_mvs must be an object`);
      check(file, isNumber(bs.pressure_advance), `${bsc}: pressure_advance must be a number`);
      check(file, isNumber(bs.flow_ratio),       `${bsc}: flow_ratio must be a number`);
    }
  });
}

function validateNozzles() {
  const file = 'data/nozzles.json';
  const d = load(path.join(DATA, 'nozzles.json'));
  if (!d) return;

  check(file, isArray(d.nozzles) && d.nozzles.length > 0, 'nozzles must be a non-empty array');

  (d.nozzles || []).forEach((n, i) => {
    const ctx = `nozzles[${i}] (id=${n.id})`;
    check(file, isString(n.id),       `${ctx}: id must be a non-empty string`);
    check(file, isString(n.name),     `${ctx}: name must be a non-empty string`);
    check(file, isNumber(n.size),     `${ctx}: size must be a number`);
    check(file, isBoolean(n.hardened),`${ctx}: hardened must be a boolean`);
    check(file, isNumber(n.temp_offset), `${ctx}: temp_offset must be a number`);
    check(file, isArray(n.suitable_for),    `${ctx}: suitable_for must be an array`);
    check(file, isArray(n.not_suitable_for),`${ctx}: not_suitable_for must be an array`);
  });
}

function validateEnvironment() {
  const file = 'data/rules/environment.json';
  const d = load(path.join(RULES, 'environment.json'));
  if (!d) return;

  check(file, isArray(d.environment_options) && d.environment_options.length > 0, 'environment_options must be a non-empty array');

  (d.environment_options || []).forEach((e, i) => {
    const ctx = `environment_options[${i}] (id=${e.id})`;
    check(file, isString(e.id),               `${ctx}: id must be a non-empty string`);
    check(file, isString(e.name),             `${ctx}: name must be a non-empty string`);
    check(file, isNumber(e.nozzle_adj),       `${ctx}: nozzle_adj must be a number`);
    check(file, isNumber(e.bed_adj),          `${ctx}: bed_adj must be a number`);
    check(file, isNumber(e.fan_multiplier),   `${ctx}: fan_multiplier must be a number`);
    check(file, isBoolean(e.humidity_warning),`${ctx}: humidity_warning must be a boolean`);
    check(file, isArray(e.warnings),          `${ctx}: warnings must be an array`);
  });
}

function validateObjectiveProfiles() {
  const file = 'data/rules/objective_profiles.json';
  const d = load(path.join(RULES, 'objective_profiles.json'));
  if (!d) return;

  check(file, isArray(d.surface_quality)  && d.surface_quality.length > 0,  'surface_quality must be a non-empty array');
  check(file, isArray(d.strength_levels)  && d.strength_levels.length > 0,  'strength_levels must be a non-empty array');
  check(file, isArray(d.speed_priority)   && d.speed_priority.length > 0,   'speed_priority must be a non-empty array');

  (d.surface_quality || []).forEach((s, i) => {
    const ctx = `surface_quality[${i}] (id=${s.id})`;
    check(file, isString(s.id),         `${ctx}: id must be a non-empty string`);
    check(file, isString(s.name),       `${ctx}: name must be a non-empty string`);
    check(file, isNumber(s.layer_height) && s.layer_height > 0, `${ctx}: layer_height must be a positive number`);
    check(file, isBoolean(s.ironing),   `${ctx}: ironing must be a boolean`);
  });

  (d.strength_levels || []).forEach((s, i) => {
    const ctx = `strength_levels[${i}] (id=${s.id})`;
    check(file, isString(s.id),              `${ctx}: id must be a non-empty string`);
    check(file, isString(s.name),            `${ctx}: name must be a non-empty string`);
    check(file, isNumber(s.wall_loops),      `${ctx}: wall_loops must be a number`);
    check(file, isNumber(s.infill_density),  `${ctx}: infill_density must be a number`);
    check(file, isNumber(s.speed_multiplier),`${ctx}: speed_multiplier must be a number`);
  });

  (d.speed_priority || []).forEach((s, i) => {
    const ctx = `speed_priority[${i}] (id=${s.id})`;
    check(file, isString(s.id),             `${ctx}: id must be a non-empty string`);
    check(file, isString(s.name),           `${ctx}: name must be a non-empty string`);
    check(file, isNumber(s.outer_corexy),   `${ctx}: outer_corexy must be a number`);
    check(file, isNumber(s.initial_layer),  `${ctx}: initial_layer must be a number`);
  });
}

function validateWarnings() {
  const file = 'data/rules/warnings.json';
  const d = load(path.join(RULES, 'warnings.json'));
  if (!d) return;

  check(file, isObject(d.material_warnings),  'material_warnings must be an object');
}

function validateTroubleshooter() {
  const file = 'data/rules/troubleshooter.json';
  const d = load(path.join(RULES, 'troubleshooter.json'));
  if (!d) return;

  check(file, isArray(d.symptoms) && d.symptoms.length > 0, 'symptoms must be a non-empty array');

  (d.symptoms || []).forEach((s, i) => {
    const ctx = `symptoms[${i}] (id=${s.id})`;
    check(file, isString(s.id),   `${ctx}: id must be a non-empty string`);
    check(file, isString(s.name), `${ctx}: name must be a non-empty string`);
    check(file, isArray(s.causes) && s.causes.length > 0, `${ctx}: causes must be a non-empty array`);

    (s.causes || []).forEach((c, j) => {
      const cctx = `${ctx}.causes[${j}]`;
      check(file, isNumber(c.rank),  `${cctx}: rank must be a number`);
      check(file, isString(c.title), `${cctx}: title must be a non-empty string`);
      check(file, isString(c.fix),   `${cctx}: fix must be a non-empty string`);
    });
  });
}

// ── Run all validators ────────────────────────────────────────────────────────

const validators = [
  ['printers.json',                  validatePrinters],
  ['materials.json',                 validateMaterials],
  ['nozzles.json',                   validateNozzles],
  ['rules/environment.json',         validateEnvironment],
  ['rules/objective_profiles.json',  validateObjectiveProfiles],
  ['rules/warnings.json',            validateWarnings],
  ['rules/troubleshooter.json',      validateTroubleshooter],
];

console.log('Validating data files...\n');
for (const [label, fn] of validators) {
  const before = errors;
  fn();
  const after = errors;
  if (after === before) {
    console.log(`  ✓ ${label}`);
  }
}

console.log('');
if (errors === 0) {
  console.log(`All data files valid.`);
  process.exit(0);
} else {
  console.log(`Found ${errors} error${errors === 1 ? '' : 's'}. Fix before deploying.`);
  process.exit(1);
}
