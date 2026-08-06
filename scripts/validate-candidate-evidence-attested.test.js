#!/usr/bin/env node
// ─── Owner-attested fields ──────────────────────────────────────────────────
//
// Some facts about a printer are trivially observable by a human and simply
// never stated by the manufacturer. Anycubic Kobra 2 Neo confirmed every field
// from Anycubic's own JSON-LD except `enclosure` — a property visible in any
// photograph of the machine, absent from every Anycubic page.
//
// Two earlier attempts were rejected:
//   1. a "corroborated sources" tier — the researcher agent authors its own
//      citations, so it was a formatting check wearing an evidence costume;
//   2. `enclosure:"unknown"` with an engine fail-safe — the owner rejected
//      carrying unknowns for facts they can confirm in minutes.
//
// This is the third shape: the OWNER answers, and the record says so. It is
// deliberately NOT dressed up as manufacturer evidence — `evidenceType` and
// `confidence` both read `owner-attested`, and the ledger keeps who/when/why.
//
// The allowlist is the whole safety story. `series` is in it at the owner's
// explicit direction and is the sharpest edge: engine.js branches on
// `series === 'corexy'` to choose the acceleration tier, so unlike `enclosure`
// (warnings only) a wrong `series` changes emitted print settings. It is still
// visually obvious — does the bed move? — which is why it qualifies. Nothing
// numeric ever does, and TC3 exists to keep it that way.
//
// Run: node scripts/validate-candidate-evidence-attested.test.js

const assert = require('node:assert');
const {
  validateCandidateEvidence,
  OWNER_ATTESTABLE_FIELDS,
} = require('./validate-candidate-evidence.js');

let pass = 0;
let fail = 0;
const failures = [];

function t(name, fn) {
  try { fn(); pass += 1; console.log(`  ok  ${name}`); }
  catch (error) {
    fail += 1; failures.push(`${name}: ${error.message}`);
    console.log(`  FAIL ${name} — ${error.message}`);
  }
}

const M = 'https://www.anycubic.com/products/kobra-2-neo';
const MFG = (value) => ({ value, source: M, confidence: 'confirmed', evidenceType: 'manufacturer' });

const attested = (value, over = {}) => ({
  value,
  source: 'https://all3dp.com/anycubic-kobra-2-neo-review',
  confidence: 'owner-attested',
  evidenceType: 'owner-attested',
  claim: 'product photo shows an open gantry with no side or top panels',
  answeredBy: 'mustiodk',
  answeredAt: '2026-08-04T20:00:00Z',
  issueNumber: 42,
  ...over,
});

function baseRow(overrides = {}) {
  return {
    id: 'kobra_2_neo',
    name: MFG('Kobra 2 Neo'),
    series_group: MFG('Kobra Series'),
    series: MFG('bedslinger'),
    extruder_type: MFG('direct'),
    enclosure: MFG('none'),
    max_nozzle_temp: MFG(260),
    max_bed_temp: MFG(100),
    max_speed: MFG(250),
    max_acceleration: MFG(2500),
    available_nozzle_sizes: MFG([0.4]),
    multi_color_systems: MFG([]),
    available_plates: MFG(['textured_pei']),
    active_chamber_heating: MFG(false),
    has_camera: MFG(false),
    has_lidar: MFG(false),
    notes: MFG([`Open-frame bedslinger. Source: ${M}`]),
    ...overrides,
  };
}

const errorsFor = (row) => validateCandidateEvidence(
  { printersJsonRow: row }, { printersData: { printers: [] } },
).errors || [];
const mentions = (errors, field) => errors.some((e) => e.includes(field));

// ── TC1 — the allowlist is tiny, explicit, and excludes everything numeric ──
console.log('\nTC1 — allowlist shape');
t('OWNER_ATTESTABLE_FIELDS is exported and exactly the three agreed fields', () => {
  assert.ok(OWNER_ATTESTABLE_FIELDS instanceof Set);
  assert.deepStrictEqual([...OWNER_ATTESTABLE_FIELDS].sort(),
    ['available_plates', 'enclosure', 'series']);
});

// ── TC2 — an attested field passes ─────────────────────────────────────────
console.log('\nTC2 — the owner can answer an allowlisted field');
for (const [field, value] of [['enclosure', 'none'], ['series', 'bedslinger'],
  ['available_plates', ['textured_pei']]]) {
  t(`${field} passes when owner-attested`, () => {
    const errors = errorsFor(baseRow({ [field]: attested(value) }));
    assert.ok(!mentions(errors, field), `unexpected: ${errors.join(' | ')}`);
  });
}

// ── TC3 — THE LOAD-BEARING ONE: nothing numeric is ever attestable ──────────
// This is the allowlist-creep guard. If a future edit adds a numeric field to
// OWNER_ATTESTABLE_FIELDS, these fail loudly and on purpose.
console.log('\nTC3 — safety numerics can never be attested');
for (const [field, value] of [['max_bed_temp', 110], ['max_nozzle_temp', 300],
  ['max_speed', 500], ['max_acceleration', 20000], ['available_nozzle_sizes', [0.4, 0.6]],
  ['extruder_type', 'direct'], ['multi_color_systems', ['ams']]]) {
  t(`${field} is REJECTED even with a perfect attestation envelope`, () => {
    const errors = errorsFor(baseRow({ [field]: attested(value) }));
    assert.ok(mentions(errors, field),
      `${field} must never be answerable by attestation`);
  });
}

// ── TC4 — the envelope must be complete ────────────────────────────────────
console.log('\nTC4 — an attestation must carry its own provenance');
t('missing claim is rejected', () => {
  const row = baseRow({ enclosure: attested('none', { claim: undefined }) });
  assert.ok(mentions(errorsFor(row), 'enclosure'));
});

t('missing answeredBy is rejected', () => {
  const row = baseRow({ enclosure: attested('none', { answeredBy: undefined }) });
  assert.ok(mentions(errorsFor(row), 'enclosure'));
});

t('missing or non-http source is rejected', () => {
  assert.ok(mentions(errorsFor(baseRow({ enclosure: attested('none', { source: null }) })), 'enclosure'));
  assert.ok(mentions(errorsFor(baseRow({ enclosure: attested('none', { source: 'not-a-url' }) })), 'enclosure'));
});

t('an unparseable answeredAt is rejected', () => {
  const row = baseRow({ enclosure: attested('none', { answeredAt: 'sometime last week' }) });
  assert.ok(mentions(errorsFor(row), 'enclosure'));
});

t('a null value is rejected even with a full envelope', () => {
  const row = baseRow({ enclosure: attested(null) });
  assert.ok(mentions(errorsFor(row), 'enclosure'));
});

// ── TC5 — attestation must not masquerade as manufacturer evidence ─────────
console.log('\nTC5 — the record stays honest');
t('confidence:"confirmed" with evidenceType:"owner-attested" is rejected', () => {
  // Prevents laundering an attestation into something a reader would mistake
  // for a manufacturer-confirmed fact.
  const row = baseRow({ enclosure: attested('none', { confidence: 'confirmed' }) });
  assert.ok(mentions(errorsFor(row), 'enclosure'));
});

t('evidenceType:"manufacturer" with an attestation envelope still needs a real source', () => {
  const row = baseRow({
    enclosure: { value: 'none', source: null, confidence: 'confirmed', evidenceType: 'manufacturer' },
  });
  assert.ok(mentions(errorsFor(row), 'enclosure'));
});

// ── TC6 — regression: the manufacturer path is untouched ───────────────────
console.log('\nTC6 — regression');
t('a fully manufacturer-sourced row still has no field errors', () => {
  const fieldErrors = errorsFor(baseRow()).filter((e) => e.includes('evidence for'));
  assert.deepStrictEqual(fieldErrors, []);
});

// ── TC7 — the WRITER: attestField end-to-end on a real parked fixture ──────
console.log('\nTC7 — attestField writes a packet the gate then accepts');
{
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const crypto = require('node:crypto');
  const { attestField } = require('./intake-owner-decision.js');

  const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

  function fixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'attest-'));
    const parkedRoot = path.join(root, 'scripts', '.intake-runner-state', 'parked');
    const dir = path.join(parkedRoot, 'adventurer_3');
    fs.mkdirSync(dir, { recursive: true });
    const packet = {
      proposedTaxonomy: { id: 'adventurer_3', series: null },
      printersJsonRow: { id: 'adventurer_3', series: null, available_plates: null },
    };
    const text = `${JSON.stringify(packet, null, 2)}\n`;
    fs.writeFileSync(path.join(dir, 'candidate-packet.json'), text);
    fs.writeFileSync(path.join(dir, 'parked.json'), `${JSON.stringify({
      schema: 'intake-parked@2', class: 'decision-required', reason: 'needs-source-resolution',
      candidateId: 'adventurer_3', candidateKey: 'req:1', tainted: false,
      candidateArtifact: {
        path: path.join('scripts', '.intake-runner-state', 'parked', 'adventurer_3', 'candidate-packet.json'),
        sha256: sha(Buffer.from(text)),
      },
    }, null, 2)}\n`);
    return {
      packetPath: path.join(dir, 'candidate-packet.json'),
      sidecarPath: path.join(dir, 'parked.json'),
      opts: { repoRoot: root, parkedRoot, candidateId: 'adventurer_3' },
    };
  }
  const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
  const answer = (field, value) => ({
    field, value, source: 'https://au.flashforge.com/adventurer-3',
    claim: 'official product page image + spec table', answeredBy: 'mustiodk',
    answeredAt: '2026-08-04T20:00:00Z', issueNumber: 7,
  });

  t('a written attestation satisfies the evidence gate for that field', () => {
    const f = fixture();
    attestField({ ...f.opts, ...answer('series', 'bedslinger'), apply: true });
    const row = read(f.packetPath).printersJsonRow;
    assert.strictEqual(row.series.evidenceType, 'owner-attested');
    assert.strictEqual(row.series.confidence, 'owner-attested');
    assert.ok(!mentions(errorsFor({ ...baseRow(), series: row.series }), 'series'));
  });

  // Owner decision 2026-08-04: answers arrive across separate sittings and the
  // system must consider them all. A second attestation must not wipe the first.
  t('answers accumulate across separate sittings', () => {
    const f = fixture();
    attestField({ ...f.opts, ...answer('series', 'bedslinger'), apply: true });
    attestField({ ...f.opts, ...answer('available_plates', 'textured_pei'), apply: true });
    const packet = read(f.packetPath);
    assert.deepStrictEqual(packet.ownerAttestations.map((a) => a.field).sort(),
      ['available_plates', 'series']);
    assert.strictEqual(packet.printersJsonRow.series.value, 'bedslinger');
    assert.deepStrictEqual(packet.printersJsonRow.available_plates.value, ['textured_pei']);
    assert.deepStrictEqual(read(f.sidecarPath).ownerDecision.attestedFields,
      ['available_plates', 'series']);
  });

  t('re-answering one field replaces only that field', () => {
    const f = fixture();
    attestField({ ...f.opts, ...answer('series', 'bedslinger'), apply: true });
    attestField({ ...f.opts, ...answer('available_plates', 'textured_pei'), apply: true });
    attestField({ ...f.opts, ...answer('series', 'corexy'), apply: true });
    const packet = read(f.packetPath);
    assert.strictEqual(packet.printersJsonRow.series.value, 'corexy');
    assert.deepStrictEqual(packet.printersJsonRow.available_plates.value, ['textured_pei']);
    assert.strictEqual(packet.ownerAttestations.filter((a) => a.field === 'series').length, 1);
  });

  // Cross-model review MUST-FIX-1: attestField wrote an ownerDecision whose
  // sources were not materialized onto the packet, so verify-reentry — the
  // boundary the runner MUST call — rejected it. The feature was unconsumable.
  t('an attestation passes the verify-reentry boundary the runner uses', () => {
    const { validateReentryDecision } = require('./intake-owner-decision.js');
    const f = fixture();
    attestField({ ...f.opts, ...answer('series', 'bedslinger'), apply: true });
    const v = validateReentryDecision({
      sidecar: read(f.sidecarPath), packet: read(f.packetPath), candidateId: 'adventurer_3',
    });
    assert.ok(v.ok, `runner boundary would reject this attestation: ${v.reason}`);
  });

  t('accumulated attestations all stay consumable', () => {
    const { validateReentryDecision } = require('./intake-owner-decision.js');
    const f = fixture();
    attestField({ ...f.opts, ...answer('series', 'bedslinger'), apply: true });
    attestField({ ...f.opts, ...answer('available_plates', 'textured_pei'), apply: true });
    const packet = read(f.packetPath);
    const v = validateReentryDecision({
      sidecar: read(f.sidecarPath), packet, candidateId: 'adventurer_3',
    });
    assert.ok(v.ok, `reason=${v.reason}`);
    assert.strictEqual(packet.ownerSuppliedSources.length, 2,
      'each attested field contributes exactly one source, no duplicates');
  });

  t('the writer refuses a non-allowlisted field', () => {
    const f = fixture();
    assert.throws(() => attestField({ ...f.opts, ...answer('max_bed_temp', 110), apply: true }),
      /not owner-attestable/i);
  });

  // Cross-model review SHOULD-FIX-2: available_plates was any comma-split text,
  // and it reaches engine.js's plate_not_on_printer warning.
  t('the writer refuses unknown plate ids', () => {
    const f = fixture();
    assert.throws(
      () => attestField({ ...f.opts, ...answer('available_plates', 'textured_pei,glass_thing'), apply: true }),
      /unknown plate id/i,
    );
  });

  t('a YAML list of plates is accepted and de-duplicated', () => {
    const f = fixture();
    attestField({
      ...f.opts,
      ...answer('available_plates', ['textured_pei', 'smooth_pei', 'textured_pei']),
      apply: true,
    });
    assert.deepStrictEqual(read(f.packetPath).printersJsonRow.available_plates.value,
      ['textured_pei', 'smooth_pei']);
  });

  t('empty / quote-fragment plate input is refused', () => {
    const f = fixture();
    assert.throws(() => attestField({ ...f.opts, ...answer('available_plates', ' , , '), apply: true }),
      /at least one plate id/i);
  });

  t('enclosure is constrained to the real enum', () => {
    const f = fixture();
    assert.throws(() => attestField({ ...f.opts, ...answer('enclosure', 'open'), apply: true }),
      /must be one of/i);
    // and the correct token works
    attestField({ ...f.opts, ...answer('enclosure', 'none'), apply: true });
    assert.strictEqual(read(f.packetPath).printersJsonRow.enclosure.value, 'none');
  });

  // The owner wrote `None` where the catalog token is `none`. A capital letter
  // is not a wrong answer; normalize rather than reject.
  t('enclosure value is matched case-insensitively and normalized', () => {
    const f = fixture();
    attestField({ ...f.opts, ...answer('enclosure', 'None'), apply: true });
    assert.strictEqual(read(f.packetPath).printersJsonRow.enclosure.value, 'none');
  });

  t('plate ids are matched case-insensitively and normalized', () => {
    const f = fixture();
    attestField({ ...f.opts, ...answer('available_plates', 'Smooth_Glass'), apply: true });
    assert.deepStrictEqual(read(f.packetPath).printersJsonRow.available_plates.value, ['smooth_glass']);
  });

  t('a genuinely wrong enum value is still refused', () => {
    const f = fixture();
    assert.throws(() => attestField({ ...f.opts, ...answer('enclosure', 'open'), apply: true }),
      /must be one of/i);
  });

  t('the writer refuses an incomplete envelope', () => {
    const f = fixture();
    assert.throws(() => attestField({ ...f.opts, ...answer('series', 'bedslinger'), claim: '', apply: true }),
      /claim/i);
    assert.throws(() => attestField({ ...f.opts, ...answer('series', 'bedslinger'), source: 'nope', apply: true }),
      /source/i);
  });
}

console.log(`\n[evidence-attested] ${pass} passing, ${fail} failing`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
