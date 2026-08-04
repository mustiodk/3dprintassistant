#!/usr/bin/env node
// ─── Owner-supplied external evidence re-entry (rd3-external-evidence) ──────
//
// The park taxonomy has always DECLARED two sanctioned re-entry edges for a
// tainted/owner-gated candidate — `owner-instruction` and
// `rd3-external-evidence` — and `intake-park-taxonomy.js` validates that both
// stay declared. But no writer ever existed to put a candidate ONTO either
// edge: `intake-owner-decision.js` could only express `duplicate` or
// `approve-series`, and `validateReentryDecision` hard-required
// `overrides.series_group`.
//
// Consequence: a candidate parked `needs-source-resolution` (the researcher
// could not reach a manufacturer domain) was a permanent dead end. Two real
// printers sat in exactly that state — kobra_2_neo and adventurer_3 — parked
// because Anycubic and FlashForge domains 403'd on the run day, with no way
// for the owner to say "here is the manufacturer source, try again".
//
// DESIGN CONSTRAINT (the thing this net mostly exists to protect):
// the writer must NOT fabricate field-level evidence. The owner points at
// sources; the researcher still has to read them and fill the packet, and
// `validate-candidate-evidence.js` still adjudicates every safety-critical
// field. Unblocking the ATTEMPT is an owner decision. Passing the evidence
// gate is not.
//
// Run: node scripts/intake-owner-evidence.test.js

const assert = require('node:assert');
const fs     = require('node:fs');
const os     = require('node:os');
const path   = require('node:path');
const crypto = require('node:crypto');

const {
  provideEvidence,
  approveSeries,
  validateReentryDecision,
} = require('./intake-owner-decision.js');

const { loadTaxonomy } = require('./intake-park-taxonomy.js');

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

function sha(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

// ─── Fixture: a realistic needs-source-resolution park ──────────────────────
function makeFixture(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'intake-evidence-'));
  const parkedRoot = path.join(root, 'scripts', '.intake-runner-state', 'parked');
  const candidateId = overrides.candidateId || 'adventurer_3';
  const candidateDir = path.join(parkedRoot, candidateId);
  fs.mkdirSync(candidateDir, { recursive: true });

  const packet = {
    proposedTaxonomy: { id: candidateId, series_group: 'Adventurer Series' },
    printersJsonRow: {
      id: candidateId,
      name: { value: 'Adventurer 3' },
      series_group: { value: 'Adventurer Series' },
      // Deliberately UNRESOLVED — the reason this candidate parked. The writer
      // must leave these exactly as they are.
      max_nozzle_temp: { value: 240, evidenceType: 'reseller' },
      extruder_type:   { value: 'direct', evidenceType: 'reseller' },
    },
    note: 'Parked needs-source-resolution: manufacturer domains unreachable this run.',
    nextStep: 'Owner must resolve sources.',
  };
  const packetText = `${JSON.stringify(packet, null, 2)}\n`;
  const packetName = 'candidate-packet.json';
  fs.writeFileSync(path.join(candidateDir, packetName), packetText);

  const sidecar = {
    schema: 'intake-parked@2',
    class: 'decision-required',
    reason: 'needs-source-resolution',
    candidateId,
    candidateKey: 'req:1785618440527:866098c7',
    firstParkedAt: '2026-08-02T10:10:00Z',
    retries: 0,
    runId: 'run-20260802T100301Z',
    requestKeys: ['req:1785618440527:866098c7'],
    candidateArtifact: {
      path: path.join('scripts', '.intake-runner-state', 'parked', candidateId, packetName),
      sha256: sha(Buffer.from(packetText)),
    },
    verdictRefs: [],
    tainted: false,
    summary: 'FlashForge Adventurer 3 — reseller-only on safety-critical fields.',
    ...overrides.sidecar,
  };
  fs.writeFileSync(path.join(candidateDir, 'parked.json'), `${JSON.stringify(sidecar, null, 2)}\n`);

  return {
    repoRoot: root,
    parkedRoot,
    candidateId,
    candidateDir,
    packetPath: path.join(candidateDir, packetName),
    sidecarPath: path.join(candidateDir, 'parked.json'),
    opts: { repoRoot: root, parkedRoot, candidateId },
  };
}

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const MANUFACTURER_SOURCE = 'https://en.fss.flashforge.com/10000/software/2ff1e48618315861cfee296866c0392a.pdf';

// ── TC1 — the edge the writer targets is the one the taxonomy sanctions ─────
console.log('\nTC1 — writer targets a taxonomy-sanctioned edge');
t('rd3-external-evidence is declared sanctioned in the taxonomy', () => {
  const taxonomy = loadTaxonomy();
  assert.ok((taxonomy.sanctionedTaintedReviewEdges || []).includes('rd3-external-evidence'));
});

// ── TC2 — happy path ────────────────────────────────────────────────────────
console.log('\nTC2 — owner supplies a manufacturer source and the candidate becomes re-enterable');
t('provideEvidence flips nextEligibleTrigger to owner-approved', () => {
  const f = makeFixture();
  provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], apply: true });
  const sidecar = readJSON(f.sidecarPath);
  assert.strictEqual(sidecar.nextEligibleTrigger, 'owner-approved');
  assert.strictEqual(sidecar.reviewEntryEdge, 'rd3-external-evidence');
});

t('verify-reentry accepts the evidence decision', () => {
  const f = makeFixture();
  provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], apply: true });
  const validation = validateReentryDecision({
    sidecar: readJSON(f.sidecarPath),
    packet: readJSON(f.packetPath),
    candidateId: f.candidateId,
  });
  assert.ok(validation.ok, `expected ok, got reason=${validation.reason}`);
});

t('the supplied source is recorded on both packet and decision', () => {
  const f = makeFixture();
  provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], apply: true });
  const packet = readJSON(f.packetPath);
  const sidecar = readJSON(f.sidecarPath);
  assert.deepStrictEqual(packet.ownerSuppliedSources.map((s) => s.url), [MANUFACTURER_SOURCE]);
  assert.deepStrictEqual(sidecar.ownerDecision.sources.map((s) => s.url), [MANUFACTURER_SOURCE]);
});

// ── TC3 — THE LOAD-BEARING ONE: no evidence fabrication ─────────────────────
console.log('\nTC3 — the writer must not forge field-level evidence');
t('unresolved field evidenceType is left untouched (no upgrade to manufacturer)', () => {
  const f = makeFixture();
  const before = readJSON(f.packetPath).printersJsonRow;
  provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], apply: true });
  const after = readJSON(f.packetPath).printersJsonRow;
  assert.strictEqual(after.max_nozzle_temp.evidenceType, before.max_nozzle_temp.evidenceType,
    'owner-supplied sources must never silently promote a field to manufacturer-class');
  assert.strictEqual(after.extruder_type.evidenceType, before.extruder_type.evidenceType);
  assert.deepStrictEqual(after.max_nozzle_temp.value, before.max_nozzle_temp.value);
});

// ── TC4 — input validation, fail closed ─────────────────────────────────────
console.log('\nTC4 — fail closed on bad input');
t('at least one source is required', () => {
  const f = makeFixture();
  assert.throws(() => provideEvidence({ ...f.opts, sources: [], apply: true }), /source/i);
});

t('non-http(s) sources are rejected', () => {
  const f = makeFixture();
  assert.throws(
    () => provideEvidence({ ...f.opts, sources: ['file:///etc/passwd'], apply: true }),
    /http/i,
  );
});

t('a non-sanctioned edge is rejected', () => {
  const f = makeFixture();
  assert.throws(
    () => provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], edge: 'weekly-retry', apply: true }),
    /sanction/i,
  );
});

t('owner-instruction is accepted as the other sanctioned edge', () => {
  const f = makeFixture();
  provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], edge: 'owner-instruction', apply: true });
  assert.strictEqual(readJSON(f.sidecarPath).reviewEntryEdge, 'owner-instruction');
});

// ── TC5 — identity + staleness binding ──────────────────────────────────────
console.log('\nTC5 — the decision is bound to the exact packet it was made against');
t('verify-reentry fails once the packet changes underneath the decision', () => {
  const f = makeFixture();
  provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], apply: true });
  // Simulate the packet being rewritten by a later research pass.
  const packet = readJSON(f.packetPath);
  packet.printersJsonRow.max_nozzle_temp.value = 265;
  fs.writeFileSync(f.packetPath, `${JSON.stringify(packet, null, 2)}\n`);
  const validation = validateReentryDecision({
    sidecar: readJSON(f.sidecarPath),
    packet,
    candidateId: f.candidateId,
    packetSha256: sha(fs.readFileSync(f.packetPath)),
  });
  assert.ok(!validation.ok, 'a decision must not survive the packet it was bound to changing');
});

t('a decision for a different candidate is rejected', () => {
  const f = makeFixture();
  provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], apply: true });
  const validation = validateReentryDecision({
    sidecar: readJSON(f.sidecarPath),
    packet: readJSON(f.packetPath),
    candidateId: 'some_other_printer',
  });
  assert.ok(!validation.ok);
});

// ── TC6 — idempotence + no conflicting overwrite ────────────────────────────
console.log('\nTC6 — idempotent, and refuses to silently overwrite a conflicting decision');
t('re-applying the identical decision is a no-op', () => {
  const f = makeFixture();
  provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], apply: true });
  const first = fs.readFileSync(f.sidecarPath, 'utf8');
  const result = provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], apply: true });
  assert.strictEqual(result.changed, false);
  assert.strictEqual(fs.readFileSync(f.sidecarPath, 'utf8'), first);
});

// Codex hostile review P2-1: comparing source URLs alone made a changed --field
// a silent no-op that reported changed:false, losing the owner's new hint.
t('same sources but a different --field set is a conflict, not a no-op', () => {
  const f = makeFixture();
  provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], fields: ['extruder_type'], apply: true });
  assert.throws(
    () => provideEvidence({
      ...f.opts, sources: [MANUFACTURER_SOURCE], fields: ['extruder_type', 'max_bed_temp'], apply: true,
    }),
    /conflict/i,
  );
});

t('same sources with an unchanged --field set is still idempotent', () => {
  const f = makeFixture();
  provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], fields: ['extruder_type'], apply: true });
  const result = provideEvidence({
    ...f.opts, sources: [MANUFACTURER_SOURCE], fields: ['extruder_type'], apply: true,
  });
  assert.strictEqual(result.changed, false);
});

t('a source note change is detected rather than silently ignored', () => {
  const f = makeFixture();
  provideEvidence({ ...f.opts, sources: [{ url: MANUFACTURER_SOURCE, note: 'p12 spec table' }], apply: true });
  assert.throws(
    () => provideEvidence({
      ...f.opts, sources: [{ url: MANUFACTURER_SOURCE, note: 'p31 nozzle table' }], apply: true,
    }),
    /conflict/i,
  );
});

// Codex confirmation review P2: sameKey() is raw JSON.stringify and therefore
// key-order sensitive. A decision persisted with {note,url} ordering must not
// false-conflict against the same decision expressed as {url,note}.
t('source comparison is insensitive to object key order', () => {
  const f = makeFixture();
  provideEvidence({ ...f.opts, sources: [{ url: MANUFACTURER_SOURCE, note: 'p12' }], apply: true });
  // Rewrite the persisted decision + packet with the keys in the opposite order,
  // exactly as a differently-serialized sidecar would arrive.
  const sidecar = readJSON(f.sidecarPath);
  const packet = readJSON(f.packetPath);
  const flipped = [{ note: 'p12', url: MANUFACTURER_SOURCE }];
  sidecar.ownerDecision.sources = flipped;
  packet.ownerSuppliedSources = flipped;
  fs.writeFileSync(f.sidecarPath, `${JSON.stringify(sidecar, null, 2)}\n`);
  fs.writeFileSync(f.packetPath, `${JSON.stringify(packet, null, 2)}\n`);
  // Materialization check inside validateReentryDecision must still match...
  const validation = validateReentryDecision({
    sidecar, packet, candidateId: f.candidateId,
  });
  assert.ok(validation.ok, `key order must not break validation: ${validation.reason}`);
});

t('a different source set on an already-decided candidate throws', () => {
  const f = makeFixture();
  provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], apply: true });
  assert.throws(
    () => provideEvidence({ ...f.opts, sources: ['https://wiki.anycubic.com/other'], apply: true }),
    /conflict/i,
  );
});

// ── TC8 — edge/lane binding (Codex hostile review P0-1) ─────────────────────
// The two sanctioned edges are NOT interchangeable. rd3-external-evidence
// answers "the researcher could not REACH a source". A review-no-go is a
// reviewer judgment about the DATA — new URLs do not answer it, and an
// unconstrained evidence decision would walk a tainted candidate straight past
// intake-retry-gate.js. Caught by cross-model review; the original
// implementation returned ok=true for exactly this case.
console.log('\nTC8 — an edge may only re-enter the park lane it actually answers');
function reviewNoGoFixture() {
  return makeFixture({
    candidateId: 'ender_3_s1',
    sidecar: { class: 'judgment-on-evidence', reason: 'review-no-go', tainted: true },
  });
}

t('rd3-external-evidence is refused on a review-no-go park at write time', () => {
  const f = reviewNoGoFixture();
  assert.throws(
    () => provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], apply: true }),
    /cannot re-enter a review-no-go park/i,
  );
});

t('a hand-forged out-of-lane evidence decision fails verify-reentry', () => {
  const f = reviewNoGoFixture();
  // Bypass the writer entirely — an envelope planted by any other means must
  // still be rejected by the boundary the runner actually calls.
  const sidecar = readJSON(f.sidecarPath);
  const packet = readJSON(f.packetPath);
  sidecar.nextEligibleTrigger = 'owner-approved';
  sidecar.reviewEntryEdge = 'rd3-external-evidence';
  sidecar.ownerDecision = {
    schema: 'intake-owner-decision@1',
    action: 'reenter-with-evidence',
    candidateId: f.candidateId,
    candidateKey: sidecar.candidateKey,
    decidedAt: '2026-08-04T00:00:00Z',
    priorCandidateSha256: sidecar.candidateArtifact.sha256,
    edge: 'rd3-external-evidence',
    sources: [{ url: MANUFACTURER_SOURCE }],
  };
  packet.ownerSuppliedSources = [{ url: MANUFACTURER_SOURCE }];
  const validation = validateReentryDecision({ sidecar, packet, candidateId: f.candidateId });
  assert.ok(!validation.ok, 'out-of-lane evidence decision must not validate');
  assert.strictEqual(validation.reason, 'owner-decision-edge-wrong-lane');
});

t('owner-instruction may override a reviewer judgment but flags the retry gate', () => {
  const f = reviewNoGoFixture();
  provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], edge: 'owner-instruction', apply: true });
  const validation = validateReentryDecision({
    sidecar: readJSON(f.sidecarPath),
    packet: readJSON(f.packetPath),
    candidateId: f.candidateId,
  });
  assert.ok(validation.ok, `owner-instruction should be allowed here: ${validation.reason}`);
  assert.strictEqual(validation.requiresRetryGate, true,
    'a judgment-on-evidence candidate must still be marked for intake-retry-gate.js');
});

t('a needs-source-resolution park does not require the retry gate', () => {
  const f = makeFixture();
  provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], apply: true });
  const validation = validateReentryDecision({
    sidecar: readJSON(f.sidecarPath),
    packet: readJSON(f.packetPath),
    candidateId: f.candidateId,
  });
  assert.strictEqual(validation.requiresRetryGate, false);
});

// ── TC7 — regression: the existing series_group path still works ────────────
console.log('\nTC7 — approve-series is not weakened by the new edge');
t('approve-series still produces a valid re-entry decision', () => {
  const f = makeFixture();
  approveSeries({ ...f.opts, seriesGroup: 'Adventurer Series', apply: true });
  const validation = validateReentryDecision({
    sidecar: readJSON(f.sidecarPath),
    packet: readJSON(f.packetPath),
    candidateId: f.candidateId,
  });
  assert.ok(validation.ok, `series path regressed: ${validation.reason}`);
  assert.strictEqual(validation.seriesGroup, 'Adventurer Series');
});

t('an evidence decision cannot masquerade as a series override', () => {
  const f = makeFixture();
  provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], apply: true });
  const sidecar = readJSON(f.sidecarPath);
  assert.strictEqual(sidecar.ownerDecision.overrides?.series_group, undefined,
    'the evidence path must not silently write a series_group override');
});

// ── TC9 — the retry-gate signal must reach the RUNNER, not just callers ─────
// Codex confirmation review: requiresRetryGate was computed but never printed,
// and the runner consumes the CLI line rather than the returned object. An
// advisory boolean invisible to its only enforcer is not a control.
console.log('\nTC9 — verify-reentry CLI surfaces the retry-gate signal');
{
  const { execFileSync } = require('node:child_process');
  const cli = path.join(__dirname, 'intake-owner-decision.js');
  const run = (f) => execFileSync(process.execPath, [
    cli, 'verify-reentry', '--candidate', f.candidateId,
    '--repo-root', f.repoRoot, '--parked-root', f.parkedRoot,
  ], { encoding: 'utf8' }).trim();

  t('owner-instruction on judgment-on-evidence prints requiresRetryGate=true', () => {
    const f = makeFixture({
      candidateId: 'ender_3_s1',
      sidecar: { class: 'judgment-on-evidence', reason: 'review-no-go', tainted: true },
    });
    provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], edge: 'owner-instruction', apply: true });
    const line = run(f);
    assert.match(line, /ok=true/);
    assert.match(line, /requiresRetryGate=true/,
      `runner-visible line must carry the gate signal. Got: ${line}`);
    assert.match(line, /edge=owner-instruction/);
  });

  t('needs-source-resolution prints requiresRetryGate=false', () => {
    const f = makeFixture();
    provideEvidence({ ...f.opts, sources: [MANUFACTURER_SOURCE], apply: true });
    assert.match(run(f), /requiresRetryGate=false/);
  });

  t('the series_group path prints no retry-gate token (shape unchanged)', () => {
    const f = makeFixture();
    approveSeries({ ...f.opts, seriesGroup: 'Adventurer Series', apply: true });
    const line = run(f);
    assert.match(line, /ok=true/);
    assert.ok(!/requiresRetryGate/.test(line), `series path must stay as-was. Got: ${line}`);
  });
}

console.log(`\n[intake-owner-evidence] ${pass} passing, ${fail} failing`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
