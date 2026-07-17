#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const {
  resolveDuplicate,
  approveSeries,
  validateReentryDecision,
} = require('./intake-owner-decision.js');

function sha(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function fixture(candidateId = 'u1') {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'intake-owner-decision-'));
  const parkedRoot = path.join(repoRoot, 'scripts', '.intake-runner-state', 'parked');
  const resolvedRoot = path.join(repoRoot, 'scripts', '.intake-runner-state', 'resolved');
  const candidateDir = path.join(parkedRoot, candidateId);
  const packetName = candidateId === 'u1' ? 'candidate-snapmaker-u1.json' : 'candidate-creality-i7_i.json';
  const packetPath = path.join(candidateDir, packetName);
  const sidecarPath = path.join(candidateDir, 'parked.json');
  const ledgerPath = path.join(repoRoot, 'scripts', 'printer-intake-outcomes.jsonl');
  const printersPath = path.join(repoRoot, 'data', 'printers.json');
  const candidateKey = candidateId === 'u1'
    ? 'req:1784209551230:694d0fe6'
    : 'req:1784066465914:09c2c6b0';

  fs.mkdirSync(candidateDir, { recursive: true });
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.mkdirSync(path.dirname(printersPath), { recursive: true });

  const packet = {
    schema: 'printer-intake-candidate@1',
    proposedTaxonomy: {
      id: candidateId,
      manufacturer: candidateId === 'u1' ? 'snapmaker' : 'creality',
      series_group: null,
    },
    printersJsonRow: {
      id: candidateId,
      name: candidateId === 'u1' ? 'U1' : 'i7! I',
      manufacturer: candidateId === 'u1' ? 'snapmaker' : 'creality',
      series: { value: 'corexy', source: 'https://example.invalid/specs', confidence: 'confirmed' },
      series_group: { value: null, source: null, confidence: 'low-confidence' },
      max_speed: { value: 500, source: 'https://example.invalid/specs', confidence: 'confirmed' },
      notes: {
        value: [
          'Series_group BLOCKED: owner must introduce U Series before ship.',
          'Unrelated manufacturer evidence remains unchanged.',
        ],
        source: 'https://example.invalid/specs',
        confidence: 'confirmed',
      },
    },
    nextStep: 'Owner: decide the series_group label before re-entry.',
    riskFlags: ['new-series-group: owner decision required', 'available_plates: verify'],
  };
  fs.writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`);

  const sidecar = {
    schema: 'intake-parked@2',
    reason: candidateId === 'u1' ? 'new-series-group' : 'unverified-model',
    class: 'decision-required',
    nextEligibleTrigger: 'owner',
    candidateId,
    candidateKey,
    candidateArtifact: {
      path: path.relative(repoRoot, packetPath),
      sha256: sha(packetPath),
    },
    riskFlags: [...packet.riskFlags],
  };
  fs.writeFileSync(sidecarPath, `${JSON.stringify(sidecar, null, 2)}\n`);

  const marker = { _schema: 'printer-intake-outcomes@1' };
  const parked = {
    candidateKey,
    runId: 'prior-run',
    scoutOutcome: 'needs-research',
    ownerResolution: `auto-parked:${sidecar.reason}`,
    correctiveSignal: 'none',
  };
  fs.writeFileSync(ledgerPath, `${JSON.stringify(marker)}\n${JSON.stringify(parked)}\n`);
  fs.writeFileSync(printersPath, `${JSON.stringify({
    brands: [{ id: 'creality' }, { id: 'snapmaker' }],
    printers: [{ id: 'sparkx_i7', name: 'i7', manufacturer: 'creality', series_group: 'i Series' }],
  }, null, 2)}\n`);

  return {
    repoRoot,
    parkedRoot,
    resolvedRoot,
    packetPath,
    sidecarPath,
    ledgerPath,
    printersPath,
    candidateKey,
  };
}

function opts(f) {
  return {
    repoRoot: f.repoRoot,
    parkedRoot: f.parkedRoot,
    resolvedRoot: f.resolvedRoot,
    ledgerPath: f.ledgerPath,
    printersPath: f.printersPath,
  };
}

test('duplicate dry-run verifies target and changes zero bytes', () => {
  const f = fixture('i7_i');
  const before = {
    ledger: fs.readFileSync(f.ledgerPath),
    packet: fs.readFileSync(f.packetPath),
    sidecar: fs.readFileSync(f.sidecarPath),
  };
  const result = resolveDuplicate({ ...opts(f), candidateId: 'i7_i', duplicateOf: 'sparkx_i7', apply: false });
  assert.equal(result.changed, false);
  assert.equal(result.target.name, 'i7');
  assert.equal(result.target.series_group, 'i Series');
  assert.deepEqual(fs.readFileSync(f.ledgerPath), before.ledger);
  assert.deepEqual(fs.readFileSync(f.packetPath), before.packet);
  assert.deepEqual(fs.readFileSync(f.sidecarPath), before.sidecar);
});

test('duplicate apply appends full-key correction and archives evidence', () => {
  const f = fixture('i7_i');
  const packetSha = sha(f.packetPath);
  const result = resolveDuplicate({ ...opts(f), candidateId: 'i7_i', duplicateOf: 'sparkx_i7', apply: true });
  assert.equal(result.changed, true);
  assert.equal(fs.existsSync(f.sidecarPath), false);
  assert.equal(sha(path.join(result.archivePath, path.basename(f.packetPath))), packetSha);
  const lines = fs.readFileSync(f.ledgerPath, 'utf8').trim().split('\n').map(JSON.parse);
  const correction = lines.at(-1);
  assert.equal(correction.candidateKey, f.candidateKey);
  assert.notEqual(correction.runId, 'prior-run');
  assert.equal(correction.scoutOutcome, 'needs-research');
  assert.equal(correction.ownerResolution, 'was-duplicate-missed');
  assert.equal(correction.correctiveSignal, 'modelSuffixStrip:ios-punctuation-artifact');
  assert.match(correction.ledgeredAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('duplicate rejects invalid ids, missing targets, and packet SHA mismatch', () => {
  const invalid = fixture('i7_i');
  assert.throws(() => resolveDuplicate({ ...opts(invalid), candidateId: '../i7', duplicateOf: 'sparkx_i7' }), /candidateId/);
  assert.throws(() => resolveDuplicate({ ...opts(invalid), candidateId: 'i7_i', duplicateOf: 'missing' }), /exactly one target/);
  fs.appendFileSync(invalid.packetPath, 'tamper');
  assert.throws(() => resolveDuplicate({ ...opts(invalid), candidateId: 'i7_i', duplicateOf: 'sparkx_i7' }), /SHA/);
});

test('series approval records a bound owner decision and preserves unrelated evidence', () => {
  const f = fixture('u1');
  const before = JSON.parse(fs.readFileSync(f.packetPath, 'utf8'));
  const priorSha = sha(f.packetPath);
  const dry = approveSeries({ ...opts(f), candidateId: 'u1', seriesGroup: 'U Series', apply: false });
  assert.equal(dry.changed, false);
  assert.equal(sha(f.packetPath), priorSha);

  const applied = approveSeries({ ...opts(f), candidateId: 'u1', seriesGroup: 'U Series', apply: true });
  assert.equal(applied.changed, true);
  const packet = JSON.parse(fs.readFileSync(f.packetPath, 'utf8'));
  const sidecar = JSON.parse(fs.readFileSync(f.sidecarPath, 'utf8'));
  assert.equal(packet.proposedTaxonomy.series_group, 'U Series');
  assert.equal(packet.printersJsonRow.series_group.value, 'U Series');
  assert.deepEqual(packet.printersJsonRow.max_speed, before.printersJsonRow.max_speed);
  assert.equal(packet.printersJsonRow.notes.value.some((line) => /BLOCKED|must introduce/i.test(line)), false);
  assert.match(packet.printersJsonRow.notes.value[0], /owner-approved.*U Series/i);
  assert.equal(packet.printersJsonRow.notes.value[1], before.printersJsonRow.notes.value[1]);
  assert.match(packet.nextStep, /owner-approved.*U Series/i);
  assert.deepEqual(packet.riskFlags, ['available_plates: verify']);
  assert.equal(sidecar.nextEligibleTrigger, 'owner-approved');
  assert.equal(sidecar.ownerDecision.schema, 'intake-owner-decision@1');
  assert.equal(sidecar.ownerDecision.action, 'reenter');
  assert.equal(sidecar.ownerDecision.candidateId, 'u1');
  assert.equal(sidecar.ownerDecision.candidateKey, f.candidateKey);
  assert.equal(sidecar.ownerDecision.priorCandidateSha256, priorSha);
  assert.equal(sidecar.ownerDecision.overrides.series_group, 'U Series');
  assert.equal(sidecar.candidateArtifact.sha256, sha(f.packetPath));
  assert.equal(validateReentryDecision({ sidecar, packet, candidateId: 'u1' }).ok, true);
});

test('identical series approval is idempotent and a conflicting label fails closed', () => {
  const f = fixture('u1');
  approveSeries({ ...opts(f), candidateId: 'u1', seriesGroup: 'U Series', apply: true });
  const packetBefore = fs.readFileSync(f.packetPath);
  const sidecarBefore = fs.readFileSync(f.sidecarPath);
  const second = approveSeries({ ...opts(f), candidateId: 'u1', seriesGroup: 'U Series', apply: true });
  assert.equal(second.changed, false);
  assert.deepEqual(fs.readFileSync(f.packetPath), packetBefore);
  assert.deepEqual(fs.readFileSync(f.sidecarPath), sidecarBefore);
  assert.throws(
    () => approveSeries({ ...opts(f), candidateId: 'u1', seriesGroup: 'U1 Series', apply: true }),
    /conflicting owner decision/,
  );
});

test('arbitrary sidecar text cannot act as a reentry decision', () => {
  const f = fixture('u1');
  const sidecar = JSON.parse(fs.readFileSync(f.sidecarPath, 'utf8'));
  const packet = JSON.parse(fs.readFileSync(f.packetPath, 'utf8'));
  sidecar.nextEligibleTrigger = 'owner-approved';
  sidecar.resolutionNote = 'owner said yes';
  const result = validateReentryDecision({ sidecar, packet, candidateId: 'u1' });
  assert.equal(result.ok, false);
  assert.match(result.reason, /owner-decision/);
});
