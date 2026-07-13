#!/usr/bin/env node
const fs = require('fs');
const { isDeepStrictEqual } = require('node:util');
const { canonicalSource } = require('./lib/intake-source-normalizer.js');

const CRITICAL_FIELDS = [
  'series',
  'extruder_type',
  'enclosure',
  'max_nozzle_temp',
  'max_bed_temp',
  'max_speed',
  'max_acceleration',
  'available_nozzle_sizes',
  'multi_color_systems',
  'available_plates',
  'active_chamber_heating',
  'has_camera',
  'has_lidar',
  'notes',
];

const OPTIONAL_CRITICAL_FIELDS = [
  'max_chamber_temp',
  'open_door_threshold_bed_temp',
];

const MANUFACTURER_SOURCE_CLASSES = new Set([
  'official-product-page',
  'manual',
  'support-wiki',
  'manufacturer-spec-sheet',
  'manufacturer-firmware-profile',
]);

const ABSENCE_BOOLEAN_FIELDS = new Set([
  'active_chamber_heating',
  'has_camera',
  'has_lidar',
]);

const REPO_CONVENTION_FIELD = 'open_door_threshold_bed_temp';
const REPO_CONVENTION_POLICY = 'passive-enclosure-open-door-threshold';

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isCanonicalSourceIdentity(value) {
  if (!nonEmptyString(value)) return false;
  try {
    const input = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
    return canonicalSource(input) === value;
  } catch (_) {
    return false;
  }
}

function hasAbsenceRationale(field) {
  const rationale = field && field.absenceRationale;
  if (!rationale || typeof rationale !== 'object') return false;

  const classes = rationale.sourceClassesChecked;
  if (!Array.isArray(classes) || classes.length === 0
      || !classes.every(nonEmptyString)
      || !classes.some((entry) => MANUFACTURER_SOURCE_CLASSES.has(entry))) {
    return false;
  }

  const checked = rationale.checkedSources;
  if (!Array.isArray(checked) || checked.length === 0) return false;
  if (!checked.every((entry) => entry
      && isCanonicalSourceIdentity(entry.canonicalSource)
      && !Number.isNaN(Date.parse(entry.retrievedAt || '')))) {
    return false;
  }

  return nonEmptyString(rationale.normallyAdvertisedIfPresent)
    && nonEmptyString(rationale.omissionSafeBecause);
}

function checkedClasses(field) {
  return new Set((field && field.absenceRationale
    && field.absenceRationale.sourceClassesChecked) || []);
}

function hasCompleteSourceSweep(field) {
  if (!hasAbsenceRationale(field)) return false;
  const classes = checkedClasses(field);
  return classes.has('official-product-page')
    && classes.has('manual')
    && classes.has('support-wiki');
}

function hasAppCapSweep(field) {
  if (!hasCompleteSourceSweep(field)) return false;
  const classes = checkedClasses(field);
  return classes.has('reseller') && classes.has('community');
}

function hasValidManufacturerSource(field) {
  if (!field || field.confidence !== 'confirmed'
      || field.evidenceType !== 'manufacturer'
      || !nonEmptyString(field.source)) {
    return false;
  }
  try {
    canonicalSource(field.source);
    return true;
  } catch (_) {
    return false;
  }
}

function unwrapPacketValue(value) {
  if (value && typeof value === 'object'
      && Object.prototype.hasOwnProperty.call(value, 'value')) {
    return value.value;
  }
  return value;
}

function hasRepoConvention(name, field, row, printersData) {
  if (name !== REPO_CONVENTION_FIELD
      || !field
      || field.value !== 45
      || field.source !== null
      || field.confidence !== 'owner-approved'
      || field.evidenceType !== 'repo-convention'
      || unwrapPacketValue(row.enclosure) !== 'passive') {
    return false;
  }

  const resolution = field.ownerResolution;
  if (!resolution
      || resolution.policy !== REPO_CONVENTION_POLICY
      || !nonEmptyString(resolution.approvedAt)
      || Number.isNaN(Date.parse(resolution.approvedAt))
      || !nonEmptyString(resolution.rationale)) {
    return false;
  }

  if (!printersData || !Array.isArray(printersData.printers)) return false;
  return printersData.printers
    .filter((printer) => printer && printer.enclosure === 'passive')
    .every((printer) => printer.open_door_threshold_bed_temp === 45);
}

function fieldPasses(name, field, context = {}) {
  if (!field || field.value === null || field.value === undefined) return false;
  if (hasValidManufacturerSource(field)) return true;
  if (name === 'max_acceleration'
      && field.evidenceType === 'app-cap'
      && ['app-cap', 'inferred'].includes(field.confidence)
      && hasAppCapSweep(field)) {
    return true;
  }
  if (hasRepoConvention(name, field, context.row || {}, context.printersData)) {
    return true;
  }
  return ABSENCE_BOOLEAN_FIELDS.has(name)
    && field.evidenceType === 'absence-rationale'
    && field.value === false
    && hasAbsenceRationale(field);
}

function validateMaterializedParity(candidate, printersData) {
  const errors = [];
  const row = candidate && candidate.printersJsonRow;
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return {
      ok: false,
      errors: ['candidate printersJsonRow must be an object'],
    };
  }
  if (!printersData || !Array.isArray(printersData.printers)) {
    return {
      ok: false,
      errors: ['materialized printer catalog must contain a printers array'],
    };
  }

  const proposedId = candidate.proposedTaxonomy && candidate.proposedTaxonomy.id;
  const rowId = row.id;
  const candidateId = nonEmptyString(proposedId)
    ? proposedId
    : (nonEmptyString(rowId) ? rowId : null);
  if (!candidateId) {
    return {
      ok: false,
      errors: ['candidate packet must identify the printer in proposedTaxonomy.id or printersJsonRow.id'],
    };
  }

  const matches = printersData.printers.filter((printer) => (
    printer && printer.id === candidateId
  ));
  if (matches.length !== 1) {
    return {
      ok: false,
      errors: [`expected exactly one materialized catalog row for ${candidateId}; found ${matches.length}`],
    };
  }

  const materialized = matches[0];
  for (const [name, packetValue] of Object.entries(row)) {
    if (!Object.prototype.hasOwnProperty.call(materialized, name)) {
      errors.push(`materialized catalog row is missing packet field ${name}`);
      continue;
    }
    if (!isDeepStrictEqual(unwrapPacketValue(packetValue), materialized[name])) {
      errors.push(`packet field ${name} does not match the materialized catalog row`);
    }
  }

  for (const name of OPTIONAL_CRITICAL_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(materialized, name)
        && !Object.prototype.hasOwnProperty.call(row, name)) {
      errors.push(`materialized optional critical field ${name} is missing from the candidate packet`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function notesCarryManufacturerCitation(field) {
  if (!fieldPasses('notes', field) || !Array.isArray(field.value)) return false;
  let recordedSource;
  try {
    recordedSource = canonicalSource(field.source);
  } catch (_) {
    return false;
  }
  return field.value.some((line) => {
    if (!nonEmptyString(line)) return false;
    const urls = line.match(/https?:\/\/[^\s)\]}>,]+/gi) || [];
    return urls.some((url) => {
      try {
        const withoutProsePunctuation = url.replace(/[.,;:!?]+$/, '');
        return canonicalSource(withoutProsePunctuation) === recordedSource;
      } catch (_) {
        return false;
      }
    });
  });
}

function notesCarryAppCapProvenance(acceleration, notes) {
  if (!acceleration || acceleration.evidenceType !== 'app-cap') return true;
  if (!notes || !Array.isArray(notes.value)) return false;
  const value = String(acceleration.value);
  return notes.value.some((line) => {
    if (!nonEmptyString(line)) return false;
    const statesManufacturerDidNotPublish =
      /(?:no|without)\s+manufacturer[^.!;]{0,80}publish/i.test(line)
      || /manufacturer[^.!;]{0,80}(?:not|never)\s+publish/i.test(line)
      || /unpublished[^.!;]{0,40}manufacturer/i.test(line);
    return /app-side cap/i.test(line)
      && statesManufacturerDidNotPublish
      && line.includes(value);
  });
}

function validateCandidateEvidence(candidate, options = {}) {
  const row = candidate && candidate.printersJsonRow ? candidate.printersJsonRow : {};
  const printersData = options.printersData;
  const fields = CRITICAL_FIELDS.concat(
    OPTIONAL_CRITICAL_FIELDS.filter((name) => Object.prototype.hasOwnProperty.call(row, name))
  );
  const errors = [];
  const worldAbsentFields = [];

  for (const name of fields) {
    const field = row[name];
    if (name === 'notes') {
      if (!fieldPasses('notes', field, { row, printersData })) {
        errors.push('notes require confirmed manufacturer evidence metadata');
      } else if (!notesCarryManufacturerCitation(field)) {
        errors.push('notes must include a manufacturer citation URL');
      }
      continue;
    }
    const checkedSources = field && field.absenceRationale
      && field.absenceRationale.checkedSources;
    if (Array.isArray(checkedSources)
        && checkedSources.some((entry) => !entry
          || !isCanonicalSourceIdentity(entry.canonicalSource))) {
      errors.push(`absence rationale for ${name} must use canonical source identities`);
      continue;
    }
    if (!fieldPasses(name, field, { row, printersData })) {
      errors.push(`missing or insufficient manufacturer evidence for ${name}`);
      if (field && field.evidenceType === 'absence-rationale'
          && hasCompleteSourceSweep(field)) {
        worldAbsentFields.push(name);
      }
    }
  }

  if (!notesCarryAppCapProvenance(row.max_acceleration, row.notes)) {
    errors.push('app-cap max_acceleration requires value and unpublished-source rationale in notes');
  }

  if (Object.prototype.hasOwnProperty.call(options, 'printersData')) {
    const parity = validateMaterializedParity(candidate, printersData);
    errors.push(...parity.errors);
  }

  const ok = errors.length === 0;
  const reason = ok
    ? null
    : (worldAbsentFields.length === errors.length ? 'world-absent' : 'research-defect');
  return {
    ok,
    reason,
    errors,
    worldAbsentFields,
    reviewRequests: ok ? 1 : 0,
  };
}

function parseCliArgs(args) {
  const optionIndexes = args
    .map((arg, index) => (arg === '--printers-json' ? index : -1))
    .filter((index) => index !== -1);
  if (optionIndexes.length !== 1) {
    throw new Error('usage: validate-candidate-evidence.js <candidate-packet> --printers-json <catalog>');
  }
  const optionIndex = optionIndexes[0];
  const catalogPath = args[optionIndex + 1];
  const remaining = args.filter((_, index) => index !== optionIndex && index !== optionIndex + 1);
  if (!catalogPath || catalogPath.startsWith('--') || remaining.length !== 1
      || remaining[0].startsWith('--')) {
    throw new Error('usage: validate-candidate-evidence.js <candidate-packet> --printers-json <catalog>');
  }
  return { candidatePath: remaining[0], catalogPath };
}

function readJsonFile(filePath, label) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`unable to read ${label} ${filePath}: ${error.message}`);
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`invalid JSON in ${label} ${filePath}: ${error.message}`);
  }
}

function assertCatalogShape(printersData) {
  if (!printersData || typeof printersData !== 'object' || Array.isArray(printersData)
      || !Array.isArray(printersData.brands) || !Array.isArray(printersData.printers)
      || !printersData.printers.every((row) => row && typeof row === 'object'
        && !Array.isArray(row) && nonEmptyString(row.id))) {
    throw new Error('invalid printer catalog shape: expected { brands: [], printers: [{ id, ... }] }');
  }
}

if (require.main === module) {
  try {
    const { candidatePath, catalogPath } = parseCliArgs(process.argv.slice(2));
    const candidate = readJsonFile(candidatePath, 'candidate packet');
    const printersData = readJsonFile(catalogPath, 'printer catalog');
    assertCatalogShape(printersData);
    const result = validateCandidateEvidence(candidate, { printersData });
    for (const error of result.errors) {
      console.error(`[validate-candidate-evidence] ${error}`);
    }
    console.log(`[validate-candidate-evidence] ok=${result.ok} reason=${result.reason || 'none'}`);
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    console.error(`[validate-candidate-evidence] ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  CRITICAL_FIELDS,
  OPTIONAL_CRITICAL_FIELDS,
  hasAbsenceRationale,
  hasCompleteSourceSweep,
  validateMaterializedParity,
  validateCandidateEvidence,
};
