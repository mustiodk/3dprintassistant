#!/usr/bin/env node
const fs = require('fs');
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

function fieldPasses(name, field) {
  if (!field || field.value === null || field.value === undefined) return false;
  if (hasValidManufacturerSource(field)) return true;
  if (name === 'max_acceleration'
      && field.evidenceType === 'app-cap'
      && ['app-cap', 'inferred'].includes(field.confidence)
      && hasAppCapSweep(field)) {
    return true;
  }
  return field.evidenceType === 'absence-rationale'
    && field.value === false
    && hasAbsenceRationale(field);
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

function validateCandidateEvidence(candidate) {
  const row = candidate && candidate.printersJsonRow ? candidate.printersJsonRow : {};
  const fields = CRITICAL_FIELDS.concat(
    OPTIONAL_CRITICAL_FIELDS.filter((name) => Object.prototype.hasOwnProperty.call(row, name))
  );
  const errors = [];
  const worldAbsentFields = [];

  for (const name of fields) {
    const field = row[name];
    if (name === 'notes') {
      if (!notesCarryManufacturerCitation(field)) {
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
    if (!fieldPasses(name, field)) {
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

if (require.main === module) {
  const candidate = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const result = validateCandidateEvidence(candidate);
  for (const error of result.errors) {
    console.error(`[validate-candidate-evidence] ${error}`);
  }
  console.log(`[validate-candidate-evidence] ok=${result.ok} reason=${result.reason || 'none'}`);
  process.exit(result.ok ? 0 : 1);
}

module.exports = {
  CRITICAL_FIELDS,
  OPTIONAL_CRITICAL_FIELDS,
  hasAbsenceRationale,
  hasCompleteSourceSweep,
  validateCandidateEvidence,
};
