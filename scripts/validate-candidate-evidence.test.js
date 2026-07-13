const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCandidateEvidence } = require('./validate-candidate-evidence.js');

const SOURCE = 'https://creality.com/products/k2-se';

function confirmed(value) {
  return {
    value,
    source: SOURCE,
    confidence: 'confirmed',
    evidenceType: 'manufacturer',
  };
}

function absenceRationale(sourceClassesChecked = ['official-product-page']) {
  return {
    sourceClassesChecked,
    checkedSources: [
      {
        canonicalSource: 'creality.com/products/k2-se',
        retrievedAt: '2026-07-10T00:00:00Z',
      },
    ],
    normallyAdvertisedIfPresent: 'Creality advertises this feature when present.',
    omissionSafeBecause: 'False prevents the app from assuming an unavailable capability.',
  };
}

function confirmedAbsence() {
  return {
    value: false,
    source: null,
    confidence: 'confirmed',
    evidenceType: 'absence-rationale',
    absenceRationale: absenceRationale(),
  };
}

function baseCandidate(overrides = {}) {
  return {
    schema: 'printer-intake-candidate@1',
    printersJsonRow: {
      id: 'k2_se',
      name: 'K2 SE',
      manufacturer: 'creality',
      series: confirmed('K Series'),
      extruder_type: confirmed('direct_drive'),
      enclosure: confirmed('open'),
      max_nozzle_temp: confirmed(300),
      max_bed_temp: confirmed(100),
      max_speed: confirmed(500),
      max_acceleration: {
        value: 20000,
        source: null,
        confidence: 'app-cap',
        evidenceType: 'app-cap',
        absenceRationale: absenceRationale([
          'official-product-page',
          'manual',
          'support-wiki',
          'reseller',
          'community',
        ]),
      },
      available_nozzle_sizes: confirmed([0.4]),
      multi_color_systems: confirmed(['cfs']),
      available_plates: confirmed(['textured_pei']),
      active_chamber_heating: confirmedAbsence(),
      has_camera: confirmedAbsence(),
      has_lidar: confirmedAbsence(),
      notes: confirmed([
        `Manufacturer source: ${SOURCE}`,
        `max_acceleration 20000 mm/s² is a conservative app-side cap because no manufacturer maximum is published — ${SOURCE}`,
      ]),
    },
    ...overrides,
  };
}

function materializedRow(candidate) {
  return Object.fromEntries(
    Object.entries(candidate.printersJsonRow).map(([name, field]) => {
      if (['id', 'name', 'manufacturer'].includes(name)) return [name, field];
      if (field && typeof field === 'object'
          && Object.prototype.hasOwnProperty.call(field, 'value')) {
        return [name, field.value];
      }
      return [name, field];
    })
  );
}

function materializedCatalog(candidate, additionalRows = []) {
  return {
    brands: [],
    printers: [materializedRow(candidate), ...additionalRows],
  };
}

function repoConventionCandidate() {
  const candidate = baseCandidate();
  candidate.printersJsonRow.enclosure = confirmed('passive');
  candidate.printersJsonRow.open_door_threshold_bed_temp = {
    value: 45,
    source: null,
    confidence: 'owner-approved',
    evidenceType: 'repo-convention',
    ownerResolution: {
      policy: 'passive-enclosure-open-door-threshold',
      approvedAt: '2026-07-13T12:00:00Z',
      rationale: 'Owner approved the existing 3dpa passive-enclosure convention.',
    },
  };
  return candidate;
}

test('confirmed manufacturer evidence passes', () => {
  const result = validateCandidateEvidence(baseCandidate());
  assert.equal(result.ok, true);
  assert.equal(result.reviewRequests, 1);
});

test('missing source on max_speed parks as research-defect before review', () => {
  const candidate = baseCandidate();
  candidate.printersJsonRow.max_speed.source = null;
  const result = validateCandidateEvidence(candidate);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'research-defect');
  assert.equal(result.reviewRequests, 0);
});

test('non-manufacturer evidence cannot confirm a safety-critical field', () => {
  const candidate = baseCandidate();
  candidate.printersJsonRow.max_speed.evidenceType = 'reseller';
  const result = validateCandidateEvidence(candidate);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'research-defect');
  assert.equal(result.reviewRequests, 0);
});

test('absence rationale with silence parks', () => {
  const candidate = baseCandidate();
  delete candidate.printersJsonRow.has_lidar.absenceRationale;
  const result = validateCandidateEvidence(candidate);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'research-defect');
  assert.equal(result.reviewRequests, 0);
});

test('absence rationale cannot stand in for a non-boolean critical value', () => {
  const candidate = baseCandidate();
  candidate.printersJsonRow.max_nozzle_temp = {
    value: false,
    source: null,
    confidence: 'confirmed',
    evidenceType: 'absence-rationale',
    absenceRationale: absenceRationale(),
  };
  const result = validateCandidateEvidence(candidate);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'research-defect');
  assert.equal(result.reviewRequests, 0);
});

test('complete source sweep can classify absence as world-absent', () => {
  const candidate = baseCandidate();
  candidate.printersJsonRow.max_speed = {
    value: null,
    source: null,
    confidence: 'low-confidence',
    evidenceType: 'absence-rationale',
    absenceRationale: absenceRationale([
      'official-product-page',
      'manual',
      'support-wiki',
    ]),
  };
  const result = validateCandidateEvidence(candidate);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'world-absent');
  assert.equal(result.worldAbsentFields.includes('max_speed'), true);
  assert.equal(result.reviewRequests, 0);
});

test('researcher cannot self-select world-absent without a complete sweep', () => {
  const candidate = baseCandidate({ reason: 'world-absent' });
  candidate.printersJsonRow.max_speed = {
    value: null,
    source: null,
    confidence: 'low-confidence',
    evidenceType: 'absence-rationale',
    absenceRationale: absenceRationale(['official-product-page']),
  };
  const result = validateCandidateEvidence(candidate);
  assert.equal(result.reason, 'research-defect');
  assert.equal(result.reviewRequests, 0);
});

test('notes must contain a manufacturer citation that survives into the row', () => {
  const candidate = baseCandidate();
  candidate.printersJsonRow.notes.value = ['CFS multicolor up to 16 colors'];
  const result = validateCandidateEvidence(candidate);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /notes.*citation/i);
  assert.equal(result.reviewRequests, 0);
});

test('notes with missing evidence metadata report metadata rather than citation text', () => {
  const candidate = baseCandidate();
  candidate.printersJsonRow.notes.source = null;
  const result = validateCandidateEvidence(candidate);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /notes.*metadata/i);
  assert.equal(result.reviewRequests, 0);
});

test('notes citation must match the recorded manufacturer source', () => {
  const candidate = baseCandidate();
  candidate.printersJsonRow.notes.value = ['Manufacturer source: https://example.com/specs'];
  const result = validateCandidateEvidence(candidate);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /notes.*citation/i);
  assert.equal(result.reviewRequests, 0);
});

test('notes citation tolerates trailing prose punctuation', () => {
  const candidate = baseCandidate();
  candidate.printersJsonRow.notes.value = [
    `Manufacturer source: ${SOURCE}.`,
    `max_acceleration 20000 mm/s² is a conservative app-side cap because no manufacturer maximum is published — ${SOURCE}.`,
  ];
  const result = validateCandidateEvidence(candidate);
  assert.equal(result.ok, true);
});

test('app-cap requires its value and unpublished-source rationale in notes', () => {
  const candidate = baseCandidate();
  candidate.printersJsonRow.notes.value = [`Manufacturer source: ${SOURCE}`];
  const result = validateCandidateEvidence(candidate);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /app-cap.*notes/i);
  assert.equal(result.reviewRequests, 0);
});

test('app-cap notes accept equivalent manufacturer-not-published wording', () => {
  const candidate = baseCandidate();
  candidate.printersJsonRow.notes.value = [
    `Manufacturer source: ${SOURCE}`,
    `Manufacturer has not published a maximum; max_acceleration 20000 mm/s² uses a conservative app-side cap — ${SOURCE}`,
  ];
  const result = validateCandidateEvidence(candidate);
  assert.equal(result.ok, true);
});

test('optional critical fields are validated when proposed', () => {
  const candidate = baseCandidate();
  candidate.printersJsonRow.max_chamber_temp = {
    value: 60,
    source: null,
    confidence: 'low-confidence',
    evidenceType: null,
  };
  const result = validateCandidateEvidence(candidate);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /max_chamber_temp/);
  assert.equal(result.reviewRequests, 0);
});

test('absence rationale checked sources must already be canonical', () => {
  const candidate = baseCandidate();
  candidate.printersJsonRow.has_camera.absenceRationale.checkedSources[0].canonicalSource =
    'WWW.CREALITY.COM/products/k2-se?utm_source=x';
  const result = validateCandidateEvidence(candidate);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /canonical/i);
  assert.equal(result.reviewRequests, 0);
});

test('materialized candidate must exist in the catalog before review', () => {
  const candidate = baseCandidate();
  const result = validateCandidateEvidence(candidate, {
    printersData: { brands: [], printers: [] },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'research-defect');
  assert.equal(result.reviewRequests, 0);
});

test('packet fields must equal the materialized catalog row before review', () => {
  const candidate = baseCandidate();
  const printersData = materializedCatalog(candidate);
  printersData.printers[0].max_speed = 499;
  const result = validateCandidateEvidence(candidate, { printersData });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'research-defect');
  assert.equal(result.reviewRequests, 0);
});

test('materialized optional critical fields must be present in the packet', () => {
  const candidate = baseCandidate();
  const printersData = materializedCatalog(candidate);
  printersData.printers[0].open_door_threshold_bed_temp = 45;
  const result = validateCandidateEvidence(candidate, { printersData });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'research-defect');
  assert.equal(result.reviewRequests, 0);
});

test('packet notes citation must survive into the materialized row', () => {
  const candidate = baseCandidate();
  const printersData = materializedCatalog(candidate);
  printersData.printers[0].notes = ['K2 SE'];
  const result = validateCandidateEvidence(candidate, { printersData });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'research-defect');
  assert.equal(result.reviewRequests, 0);
});

test('exact passive-enclosure open-door repository convention passes', () => {
  const candidate = repoConventionCandidate();
  const printersData = materializedCatalog(candidate, [{
    id: 'another_passive_printer',
    enclosure: 'passive',
    open_door_threshold_bed_temp: 45,
  }]);
  const result = validateCandidateEvidence(candidate, { printersData });
  assert.equal(result.ok, true);
  assert.equal(result.reviewRequests, 1);
});

test('repository convention requires a complete owner resolution', () => {
  const variants = [
    (field) => { delete field.ownerResolution; },
    (field) => { field.ownerResolution.policy = 'different-policy'; },
    (field) => { field.ownerResolution.approvedAt = 'not-a-date'; },
    (field) => { field.ownerResolution.rationale = ' '; },
  ];

  for (const mutate of variants) {
    const candidate = repoConventionCandidate();
    mutate(candidate.printersJsonRow.open_door_threshold_bed_temp);
    const result = validateCandidateEvidence(candidate, {
      printersData: materializedCatalog(candidate),
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'research-defect');
    assert.equal(result.reviewRequests, 0);
  }
});

test('repository convention requires the numeric value 45', () => {
  const candidate = repoConventionCandidate();
  candidate.printersJsonRow.open_door_threshold_bed_temp.value = 46;
  const result = validateCandidateEvidence(candidate, {
    printersData: materializedCatalog(candidate),
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'research-defect');
  assert.equal(result.reviewRequests, 0);
});

test('repository convention is restricted to passive enclosures', () => {
  const candidate = repoConventionCandidate();
  candidate.printersJsonRow.enclosure = confirmed('open');
  const result = validateCandidateEvidence(candidate, {
    printersData: materializedCatalog(candidate),
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'research-defect');
  assert.equal(result.reviewRequests, 0);
});

test('repository convention is restricted to the open-door threshold field', () => {
  const candidate = repoConventionCandidate();
  candidate.printersJsonRow.max_bed_temp = {
    ...candidate.printersJsonRow.open_door_threshold_bed_temp,
    ownerResolution: {
      ...candidate.printersJsonRow.open_door_threshold_bed_temp.ownerResolution,
    },
  };
  const result = validateCandidateEvidence(candidate, {
    printersData: materializedCatalog(candidate),
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'research-defect');
  assert.equal(result.reviewRequests, 0);
});

test('repository convention requires every passive catalog row to carry the threshold', () => {
  const candidate = repoConventionCandidate();
  const printersData = materializedCatalog(candidate, [{
    id: 'passive_without_threshold',
    enclosure: 'passive',
  }]);
  const result = validateCandidateEvidence(candidate, { printersData });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'research-defect');
  assert.equal(result.reviewRequests, 0);
});

test('repository convention requires every passive catalog threshold to be numeric 45', () => {
  for (const invalidThreshold of [46, '45']) {
    const candidate = repoConventionCandidate();
    const printersData = materializedCatalog(candidate, [{
      id: 'passive_with_invalid_threshold',
      enclosure: 'passive',
      open_door_threshold_bed_temp: invalidThreshold,
    }]);
    const result = validateCandidateEvidence(candidate, { printersData });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'research-defect');
    assert.equal(result.reviewRequests, 0);
  }
});
