const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  migrateParkedV1,
  enterResearchRepair,
  assertWritableClass,
  readParked,
  writeParked,
} = require('./intake-parked-store.js');

const K2_FIXTURE = path.join(__dirname, 'fixtures', 'k2-se-parked-v1.json');

test('K2 SE v1 review-no-go migrates to decision-required and tainted', () => {
  const migrated = migrateParkedV1(JSON.parse(fs.readFileSync(K2_FIXTURE, 'utf8')));

  assert.equal(migrated.schema, 'intake-parked@2');
  assert.equal(migrated.class, 'decision-required');
  assert.equal(migrated.tainted, true);
  assert.equal(migrated.repairAttempts, 0);
  assert.deepEqual(migrated.evidence, []);
  assert.deepEqual(migrated.verdictRefs, [{
    reviewer: 'unknown',
    verdict: 'NO-GO',
    at: '2026-07-10T10:16:47Z',
    ref: 'v1-migration',
  }]);
});

for (const className of ['research-defect', 'world-absent', 'availability-blocked']) {
  test(`NO-GO verdict cannot be written to ${className}`, () => {
    assert.throws(() => assertWritableClass({
      tainted: false,
      class: className,
      verdictRefs: [{ reviewer: 'hostile', verdict: 'NO-GO' }],
    }), /tainted/i);
  });
}

test('research-defect gets one repair attempt only', () => {
  const original = { class: 'research-defect', tainted: false, repairAttempts: 0 };
  const first = enterResearchRepair(original);

  assert.equal(first.repairAttempts, 1);
  assert.equal(first.class, 'research-defect');
  assert.equal(original.repairAttempts, 0);

  const second = enterResearchRepair(first);
  assert.equal(second.class, 'decision-required');
  assert.equal(second.nextEligibleTrigger, 'owner');
  assert.equal(second.repairAttempts, 1);
});

for (const malformed of ['banana', -1, 1.5]) {
  test(`malformed repair counter ${JSON.stringify(malformed)} fails closed`, () => {
    const result = enterResearchRepair({
      class: 'research-defect',
      tainted: false,
      repairAttempts: malformed,
    });

    assert.equal(result.class, 'decision-required');
    assert.equal(result.nextEligibleTrigger, 'owner');
    assert.equal(result.repairAttempts, 1);
  });
}

test('migration cannot turn a malformed repair counter into a fresh repair pass', () => {
  const migrated = migrateParkedV1({
    reason: 'research-defect',
    repairAttempts: 'banana',
  });

  assert.equal(migrated.class, 'decision-required');
  assert.equal(migrated.nextEligibleTrigger, 'owner');
  assert.equal(migrated.repairAttempts, 1);
});

test('tainted research-defect cannot enter the repair lane', () => {
  assert.throws(() => enterResearchRepair({
    class: 'research-defect',
    repairAttempts: 0,
    verdictRefs: [{ reviewer: 'codex', verdict: 'NO-GO' }],
  }), /tainted/i);
});

test('readParked migrates the real-like K2 SE fixture without mutating it', () => {
  const before = fs.readFileSync(K2_FIXTURE, 'utf8');
  const migrated = readParked(K2_FIXTURE);

  assert.equal(migrated.class, 'decision-required');
  assert.equal(migrated.tainted, true);
  assert.equal(fs.readFileSync(K2_FIXTURE, 'utf8'), before);
});

test('writeParked derives taint from verdictRefs in the persisted v2 sidecar', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'intake-parked-store-'));
  const filePath = path.join(tempDir, 'parked.json');

  try {
    writeParked(filePath, {
      schema: 'intake-parked@2',
      class: 'judgment-on-evidence',
      tainted: false,
      verdictRefs: [{ reviewer: 'hostile', verdict: 'NO-GO' }],
    });

    const persisted = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.equal(persisted.tainted, true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('writeParked cannot launder taint already persisted on disk', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'intake-parked-store-'));
  const filePath = path.join(tempDir, 'parked.json');

  try {
    writeParked(filePath, {
      schema: 'intake-parked@2',
      class: 'judgment-on-evidence',
      verdictRefs: [{ reviewer: 'hostile', verdict: 'NO-GO', ref: 'review-1' }],
    });
    const before = fs.readFileSync(filePath, 'utf8');

    assert.throws(() => writeParked(filePath, {
      schema: 'intake-parked@2',
      class: 'research-defect',
      tainted: false,
      verdictRefs: [],
    }), /tainted/i);
    assert.equal(fs.readFileSync(filePath, 'utf8'), before);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('allowed updates preserve persisted NO-GO verdict references', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'intake-parked-store-'));
  const filePath = path.join(tempDir, 'parked.json');

  try {
    const noGo = { reviewer: 'hostile', verdict: 'NO-GO', ref: 'review-1' };
    writeParked(filePath, {
      schema: 'intake-parked@2',
      class: 'judgment-on-evidence',
      verdictRefs: [noGo],
    });
    writeParked(filePath, {
      schema: 'intake-parked@2',
      class: 'decision-required',
      tainted: false,
      verdictRefs: [],
    });

    const persisted = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.equal(persisted.tainted, true);
    assert.deepEqual(persisted.verdictRefs, [noGo]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
