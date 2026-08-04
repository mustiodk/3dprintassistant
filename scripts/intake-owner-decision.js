#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..');
const ID_RE = /^[A-Za-z0-9._-]+$/;

function shaBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function shaFile(filePath) {
  return shaBuffer(fs.readFileSync(filePath));
}

function assertId(value, label) {
  if (typeof value !== 'string' || !ID_RE.test(value) || value === '.' || value === '..') {
    throw new Error(`${label} must match [A-Za-z0-9._-]+ and cannot be . or ..`);
  }
}

function sameKey(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function transactionPath(candidateDir) {
  return path.join(candidateDir, '.owner-decision-transaction');
}

function writeDurable(filePath, bytes) {
  const descriptor = fs.openSync(filePath, 'wx');
  try {
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function replaceFromSnapshot(snapshotPath, destinationPath) {
  const tempPath = `${destinationPath}.recover-${process.pid}`;
  fs.copyFileSync(snapshotPath, tempPath, fs.constants.COPYFILE_EXCL);
  try {
    fs.renameSync(tempPath, destinationPath);
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
}

function recoverOwnerDecisionTransaction(candidateDir, candidateId) {
  const directory = transactionPath(candidateDir);
  if (!fs.existsSync(directory)) return { recovered: false };
  const manifestPath = path.join(directory, 'transaction.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`owner-decision transaction is incomplete for ${candidateId}; preserve ${directory}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.schema !== 'intake-owner-decision-transaction@1'
      || manifest.candidateId !== candidateId
      || typeof manifest.packetName !== 'string'
      || path.basename(manifest.packetName) !== manifest.packetName) {
    throw new Error(`owner-decision transaction identity is invalid for ${candidateId}`);
  }
  const packetPath = path.join(candidateDir, manifest.packetName);
  const sidecarPath = path.join(candidateDir, 'parked.json');
  const snapshots = {
    packetOld: path.join(directory, 'packet.old'),
    packetNew: path.join(directory, 'packet.new'),
    sidecarOld: path.join(directory, 'sidecar.old'),
    sidecarNew: path.join(directory, 'sidecar.new'),
  };
  for (const [name, snapshot] of Object.entries(snapshots)) {
    if (!fs.existsSync(snapshot) || shaFile(snapshot) !== manifest[`${name}Sha256`]) {
      throw new Error(`owner-decision transaction ${name} snapshot is invalid for ${candidateId}`);
    }
  }
  if (!fs.existsSync(packetPath) || !fs.existsSync(sidecarPath)) {
    throw new Error(`owner-decision transaction target is missing for ${candidateId}`);
  }
  const packetSha = shaFile(packetPath);
  const sidecarSha = shaFile(sidecarPath);
  const packetOld = packetSha === manifest.packetOldSha256;
  const packetNew = packetSha === manifest.packetNewSha256;
  const sidecarOld = sidecarSha === manifest.sidecarOldSha256;
  const sidecarNew = sidecarSha === manifest.sidecarNewSha256;

  if (packetOld && sidecarOld) {
    fs.rmSync(directory, { recursive: true });
    return { recovered: true, outcome: 'prepared-not-applied' };
  }
  if (packetNew && sidecarOld) {
    replaceFromSnapshot(snapshots.sidecarNew, sidecarPath);
  } else if (packetOld && sidecarNew) {
    replaceFromSnapshot(snapshots.packetNew, packetPath);
  } else if (!(packetNew && sidecarNew)) {
    throw new Error(`owner-decision transaction target hashes are ambiguous for ${candidateId}`);
  }

  if (shaFile(packetPath) !== manifest.packetNewSha256
      || shaFile(sidecarPath) !== manifest.sidecarNewSha256) {
    throw new Error(`owner-decision transaction recovery verification failed for ${candidateId}`);
  }
  fs.rmSync(directory, { recursive: true });
  return { recovered: true, outcome: 'committed' };
}

function defaults(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || DEFAULT_REPO_ROOT);
  return {
    repoRoot,
    parkedRoot: path.resolve(options.parkedRoot || path.join(repoRoot, 'scripts', '.intake-runner-state', 'parked')),
    resolvedRoot: path.resolve(options.resolvedRoot || path.join(repoRoot, 'scripts', '.intake-runner-state', 'resolved')),
    ledgerPath: path.resolve(options.ledgerPath || path.join(repoRoot, 'scripts', 'printer-intake-outcomes.jsonl')),
    printersPath: path.resolve(options.printersPath || path.join(repoRoot, 'data', 'printers.json')),
  };
}

function readContext(options) {
  const paths = defaults(options);
  const { candidateId } = options;
  assertId(candidateId, 'candidateId');
  const candidateDir = path.join(paths.parkedRoot, candidateId);
  recoverOwnerDecisionTransaction(candidateDir, candidateId);
  const sidecarPath = path.join(candidateDir, 'parked.json');
  if (!fs.existsSync(sidecarPath)) throw new Error(`active parked sidecar missing for ${candidateId}`);
  const sidecarBytes = fs.readFileSync(sidecarPath);
  const sidecar = JSON.parse(sidecarBytes);
  if (sidecar.candidateId !== candidateId) {
    throw new Error(`sidecar candidateId ${sidecar.candidateId} does not match ${candidateId}`);
  }
  if (!sidecar.candidateArtifact || typeof sidecar.candidateArtifact.path !== 'string') {
    throw new Error('sidecar candidateArtifact is missing');
  }
  const packetPath = path.resolve(paths.repoRoot, sidecar.candidateArtifact.path);
  const relativeToCandidate = path.relative(candidateDir, packetPath);
  if (relativeToCandidate.startsWith('..') || path.isAbsolute(relativeToCandidate)) {
    throw new Error('candidateArtifact path escapes the parked candidate directory');
  }
  if (!fs.existsSync(packetPath)) throw new Error(`candidate packet missing: ${packetPath}`);
  const packetBytes = fs.readFileSync(packetPath);
  const actualSha = shaBuffer(packetBytes);
  if (actualSha !== sidecar.candidateArtifact.sha256) {
    throw new Error(`candidate packet SHA mismatch: expected ${sidecar.candidateArtifact.sha256}, got ${actualSha}`);
  }
  const packet = JSON.parse(packetBytes);
  const packetId = packet?.proposedTaxonomy?.id || packet?.printersJsonRow?.id;
  if (packetId !== candidateId) throw new Error(`candidate packet id ${packetId} does not match ${candidateId}`);
  return {
    ...paths,
    candidateId,
    candidateDir,
    sidecarPath,
    sidecar,
    sidecarBytes,
    packetPath,
    packet,
    packetBytes,
    packetSha: actualSha,
  };
}

function readLedgerLines(ledgerPath) {
  return fs.readFileSync(ledgerPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`invalid ledger JSON at line ${index + 1}: ${error.message}`);
      }
    });
}

function ownerRunId(now = new Date()) {
  return `owner-${now.toISOString().replace(/[-:.]/g, '')}`;
}

function resolveDuplicate(options) {
  assertId(options.duplicateOf, 'duplicateOf');
  const context = readContext(options);
  const printersData = JSON.parse(fs.readFileSync(context.printersPath, 'utf8'));
  const matches = (printersData.printers || []).filter((printer) => printer?.id === options.duplicateOf);
  if (matches.length !== 1) {
    throw new Error(`expected exactly one target printer ${options.duplicateOf}; found ${matches.length}`);
  }
  const ledgerLines = readLedgerLines(context.ledgerPath);
  const previous = ledgerLines.filter((line) => sameKey(line.candidateKey, context.sidecar.candidateKey)).at(-1);
  if (!previous || typeof previous.scoutOutcome !== 'string') {
    throw new Error('no prior ledger line found for the full candidateKey');
  }

  const resolutionPath = path.join(context.candidateDir, 'resolution.json');
  let resolution = null;
  if (fs.existsSync(resolutionPath)) {
    resolution = JSON.parse(fs.readFileSync(resolutionPath, 'utf8'));
    if (resolution.schema !== 'intake-owner-resolution@1'
        || resolution.action !== 'duplicate'
        || resolution.candidateId !== context.candidateId
        || !sameKey(resolution.candidateKey, context.sidecar.candidateKey)
        || resolution.duplicateOf !== options.duplicateOf
        || resolution.packetSha256 !== context.packetSha
        || typeof resolution.runId !== 'string'
        || Number.isNaN(Date.parse(resolution.resolvedAt || ''))) {
      throw new Error(`existing duplicate resolution is invalid for ${context.candidateId}`);
    }
  }
  const now = resolution ? new Date(resolution.resolvedAt) : (options.now || new Date());
  const runId = resolution?.runId || ownerRunId(now);
  const correction = {
    candidateKey: context.sidecar.candidateKey,
    runId,
    scoutOutcome: previous.scoutOutcome,
    ownerResolution: 'was-duplicate-missed',
    correctiveSignal: 'modelSuffixStrip:ios-punctuation-artifact',
    ledgeredAt: now.toISOString(),
    resolutionNote: `Owner confirmed ${context.candidateId} duplicates existing ${options.duplicateOf}; no catalog or overlay change.`,
  };
  const archivePath = path.join(context.resolvedRoot, context.candidateId, runId);
  const result = { changed: false, action: 'duplicate', target: matches[0], correction, archivePath };
  if (!options.apply) return result;
  if (fs.existsSync(archivePath)) throw new Error(`resolved archive already exists: ${archivePath}`);

  const ledgerBefore = fs.readFileSync(context.ledgerPath);
  const correctionExists = ledgerLines.some((line) => (
    line.runId === runId
      && line.ownerResolution === 'was-duplicate-missed'
      && sameKey(line.candidateKey, context.sidecar.candidateKey)
  ));
  let wroteResolution = false;
  try {
    if (!resolution) {
      fs.writeFileSync(resolutionPath, `${JSON.stringify({
        schema: 'intake-owner-resolution@1',
        action: 'duplicate',
        candidateId: context.candidateId,
        candidateKey: context.sidecar.candidateKey,
        duplicateOf: options.duplicateOf,
        packetSha256: context.packetSha,
        runId,
        resolvedAt: now.toISOString(),
      }, null, 2)}\n`);
      wroteResolution = true;
    }
    if (!correctionExists) {
      fs.appendFileSync(context.ledgerPath, `${JSON.stringify(correction)}\n`);
    }
    if (options._testCrashAfter === 'ledger-append') {
      const error = new Error('simulated crash after ledger append');
      error.simulatedCrash = true;
      throw error;
    }
    fs.mkdirSync(path.dirname(archivePath), { recursive: true });
    fs.renameSync(context.candidateDir, archivePath);
  } catch (error) {
    if (error.simulatedCrash) throw error;
    fs.writeFileSync(context.ledgerPath, ledgerBefore);
    if (wroteResolution && fs.existsSync(resolutionPath)) fs.rmSync(resolutionPath, { force: true });
    throw error;
  }
  return { ...result, changed: true };
}

function validateSeriesGroup(value) {
  if (typeof value !== 'string') throw new Error('seriesGroup must be a string');
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length > 80) throw new Error('seriesGroup must be 1-80 characters');
  return normalized;
}

// The two re-entry edges the park taxonomy sanctions for an owner-gated (and
// possibly tainted) candidate. Kept in sync with intake-park-taxonomy.json ->
// sanctionedTaintedReviewEdges, which intake-park-taxonomy.js validates.
const SANCTIONED_REENTRY_EDGES = new Set(['owner-instruction', 'rd3-external-evidence']);
const REENTER_ACTIONS = new Set(['reenter', 'reenter-with-evidence']);

// Which park reasons each edge may re-enter. The edges are NOT interchangeable
// and an unconstrained evidence decision is a gate bypass: `rd3-external-evidence`
// answers "the researcher could not REACH a source", so it only applies where
// source availability was the blocker. A `review-no-go` is a reviewer judgment
// about the DATA — new URLs do not answer it, and letting them try would walk a
// tainted candidate straight past intake-retry-gate.js. `owner-instruction` is
// the general override and stays broad, but never silently skips that gate:
// validateReentryDecision reports requiresRetryGate for judgment-on-evidence so
// the runner must still clear it.
const EDGE_ALLOWED_REASONS = {
  'rd3-external-evidence': new Set(['needs-source-resolution']),
  'owner-instruction': null, // null = any reason, subject to requiresRetryGate
};
const RETRY_GATED_CLASSES = new Set(['judgment-on-evidence']);

function validateReentryDecision({ sidecar, packet, candidateId, packetSha256 }) {
  const decision = sidecar?.ownerDecision;
  if (!decision || decision.schema !== 'intake-owner-decision@1') {
    return { ok: false, reason: 'owner-decision-missing-or-invalid' };
  }
  if (sidecar.nextEligibleTrigger !== 'owner-approved') {
    return { ok: false, reason: 'owner-decision-trigger-invalid' };
  }
  if (!REENTER_ACTIONS.has(decision.action) || decision.candidateId !== candidateId
      || sidecar.candidateId !== candidateId || !sameKey(decision.candidateKey, sidecar.candidateKey)) {
    return { ok: false, reason: 'owner-decision-identity-invalid' };
  }
  if (!/^[a-f0-9]{64}$/.test(decision.priorCandidateSha256 || '')) {
    return { ok: false, reason: 'owner-decision-prior-sha-invalid' };
  }
  // Staleness binding. readContext() already refuses a packet whose bytes drifted
  // from candidateArtifact.sha256, so the CLI path cannot reach here stale; this
  // makes the same guarantee available to direct callers that pass the observed
  // packet hash, so a decision can never outlive the packet it was made against.
  if (packetSha256 !== undefined && packetSha256 !== sidecar?.candidateArtifact?.sha256) {
    return { ok: false, reason: 'owner-decision-packet-stale' };
  }

  // rd3-external-evidence / owner-instruction: the owner unblocks the ATTEMPT and
  // points at sources. It deliberately carries no field overrides — the
  // researcher still has to read those sources and fill the packet, and
  // validate-candidate-evidence.js still adjudicates every safety-critical
  // field. Unblocking is an owner decision; passing the evidence gate is not.
  if (decision.action === 'reenter-with-evidence') {
    if (!SANCTIONED_REENTRY_EDGES.has(decision.edge)) {
      return { ok: false, reason: 'owner-decision-edge-not-sanctioned' };
    }
    if (sidecar.reviewEntryEdge !== decision.edge) {
      return { ok: false, reason: 'owner-decision-edge-mismatch' };
    }
    const sources = decision.sources;
    if (!Array.isArray(sources) || sources.length === 0
        || !sources.every((s) => typeof s?.url === 'string' && /^https?:\/\//i.test(s.url))) {
      return { ok: false, reason: 'owner-decision-sources-invalid' };
    }
    const onPacket = packet?.ownerSuppliedSources;
    if (!Array.isArray(onPacket)
        || !sameKey(onPacket.map((s) => s.url), sources.map((s) => s.url))) {
      return { ok: false, reason: 'owner-decision-sources-not-materialized' };
    }
    if (decision.overrides !== undefined) {
      return { ok: false, reason: 'owner-decision-evidence-must-not-override' };
    }
    const allowedReasons = EDGE_ALLOWED_REASONS[decision.edge];
    if (allowedReasons && !allowedReasons.has(sidecar.reason)) {
      return { ok: false, reason: 'owner-decision-edge-wrong-lane' };
    }
    return {
      ok: true,
      reason: 'none',
      edge: decision.edge,
      sources,
      // The runner MUST still clear intake-retry-gate.js when this is true. An
      // owner override unblocks the attempt; it does not retire the gate that
      // bounds how often a judgment-on-evidence candidate may be re-reviewed.
      requiresRetryGate: RETRY_GATED_CLASSES.has(sidecar.class),
    };
  }

  const seriesGroup = decision.overrides?.series_group;
  if (typeof seriesGroup !== 'string'
      || packet?.proposedTaxonomy?.series_group !== seriesGroup
      || packet?.printersJsonRow?.series_group?.value !== seriesGroup) {
    return { ok: false, reason: 'owner-decision-override-invalid' };
  }
  return { ok: true, reason: 'none', seriesGroup };
}

function approveSeries(options) {
  const seriesGroup = validateSeriesGroup(options.seriesGroup);
  const context = readContext(options);
  const existing = context.sidecar.ownerDecision;
  if (existing) {
    const validation = validateReentryDecision({
      sidecar: context.sidecar,
      packet: context.packet,
      candidateId: context.candidateId,
    });
    if (validation.ok && validation.seriesGroup === seriesGroup) {
      return { changed: false, action: 'approve-series', seriesGroup, validation };
    }
    throw new Error(`conflicting owner decision already exists for ${context.candidateId}`);
  }

  const now = options.now || new Date();
  const packet = structuredClone(context.packet);
  packet.proposedTaxonomy = { ...packet.proposedTaxonomy, series_group: seriesGroup };
  const previousSeries = packet.printersJsonRow?.series_group;
  packet.printersJsonRow = {
    ...packet.printersJsonRow,
    series_group: previousSeries && typeof previousSeries === 'object'
      ? { ...previousSeries, value: seriesGroup }
      : seriesGroup,
  };
  const notesField = packet.printersJsonRow.notes;
  if (notesField && typeof notesField === 'object' && Array.isArray(notesField.value)) {
    packet.printersJsonRow.notes = {
      ...notesField,
      value: notesField.value.map((line) => (
        typeof line === 'string' && /(?:series_group\s+BLOCKED|new-series-group)/i.test(line)
          ? `Series_group owner-approved as "${seriesGroup}"; candidate may re-enter the normal intake gates.`
          : line
      )),
    };
  }
  if (typeof packet.note === 'string' && /(?:new-series-group|owner must decide|owner must introduce)/i.test(packet.note)) {
    packet.note = `Owner approved series_group "${seriesGroup}" for re-entry. Prior parked context remains in the sidecar.`;
  }
  packet.nextStep = `Owner-approved series_group "${seriesGroup}"; re-enter through the normal evidence, review, live, custody, and POSTRUN gates.`;
  if (Array.isArray(packet.riskFlags)) {
    packet.riskFlags = packet.riskFlags.filter((flag) => !/^new-series-group:/i.test(flag));
  }
  const packetText = `${JSON.stringify(packet, null, 2)}\n`;
  const nextPacketSha = shaBuffer(Buffer.from(packetText));
  const ownerDecision = {
    schema: 'intake-owner-decision@1',
    action: 'reenter',
    candidateId: context.candidateId,
    candidateKey: context.sidecar.candidateKey,
    decidedAt: now.toISOString(),
    priorCandidateSha256: context.packetSha,
    overrides: { series_group: seriesGroup },
  };
  const sidecar = {
    ...context.sidecar,
    nextEligibleTrigger: 'owner-approved',
    ownerDecision,
    candidateArtifact: { ...context.sidecar.candidateArtifact, sha256: nextPacketSha },
    riskFlags: Array.isArray(context.sidecar.riskFlags)
      ? context.sidecar.riskFlags.filter((flag) => !/^new-series-group:/i.test(flag))
      : context.sidecar.riskFlags,
    resolutionNote: `Owner approved series_group "${seriesGroup}" for normal gated re-entry; prior park reason remains historical evidence.`,
  };
  const sidecarText = `${JSON.stringify(sidecar, null, 2)}\n`;
  const validation = validateReentryDecision({ sidecar, packet, candidateId: context.candidateId });
  if (!validation.ok) throw new Error(`generated owner decision is invalid: ${validation.reason}`);

  const result = { changed: false, action: 'approve-series', seriesGroup, validation };
  if (!options.apply) return result;
  commitDecisionTransaction(context, { packetText, nextPacketSha, sidecarText, now, options });
  return { ...result, changed: true };
}

// Crash-safe two-file apply shared by every owner-decision writer. Snapshots
// both old and new bytes plus a hash manifest before touching either target, so
// recoverOwnerDecisionTransaction() can always tell prepared-not-applied from
// half-applied from committed. Extracted when the evidence writer landed —
// duplicating it would have given the two decision paths divergent crash
// semantics, which is exactly the class of drift this pipeline fails closed on.
function commitDecisionTransaction(context, { packetText, nextPacketSha, sidecarText, now, options = {} }) {
  const transactionDir = transactionPath(context.candidateDir);
  if (fs.existsSync(transactionDir)) {
    throw new Error(`owner-decision transaction already exists for ${context.candidateId}`);
  }
  try {
    fs.mkdirSync(transactionDir);
    writeDurable(path.join(transactionDir, 'packet.old'), context.packetBytes);
    writeDurable(path.join(transactionDir, 'packet.new'), packetText);
    writeDurable(path.join(transactionDir, 'sidecar.old'), context.sidecarBytes);
    writeDurable(path.join(transactionDir, 'sidecar.new'), sidecarText);
    writeDurable(path.join(transactionDir, 'transaction.json'), `${JSON.stringify({
      schema: 'intake-owner-decision-transaction@1',
      candidateId: context.candidateId,
      packetName: path.basename(context.packetPath),
      packetOldSha256: context.packetSha,
      packetNewSha256: nextPacketSha,
      sidecarOldSha256: shaBuffer(context.sidecarBytes),
      sidecarNewSha256: shaBuffer(Buffer.from(sidecarText)),
      preparedAt: now.toISOString(),
    }, null, 2)}\n`);
  } catch (error) {
    fs.rmSync(transactionDir, { recursive: true, force: true });
    throw error;
  }

  replaceFromSnapshot(path.join(transactionDir, 'packet.new'), context.packetPath);
  if (options._testCrashAfter === 'packet-rename') {
    throw new Error('simulated crash after packet rename');
  }
  replaceFromSnapshot(path.join(transactionDir, 'sidecar.new'), context.sidecarPath);
  if (options._testCrashAfter === 'sidecar-rename') {
    throw new Error('simulated crash after sidecar rename');
  }
  fs.rmSync(transactionDir, { recursive: true });
}

function normalizeSources(rawSources) {
  const list = Array.isArray(rawSources) ? rawSources : [];
  if (list.length === 0) {
    throw new Error('at least one --source URL is required for an evidence decision');
  }
  return list.map((entry) => {
    const url = typeof entry === 'string' ? entry : entry?.url;
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      throw new Error(`source must be an http(s) URL: ${String(url).slice(0, 80)}`);
    }
    if (url.length > 500) throw new Error('source URL exceeds 500 characters');
    const note = typeof entry === 'string' ? undefined : entry?.note;
    return note ? { url, note: String(note).slice(0, 300) } : { url };
  });
}

// ─── rd3-external-evidence / owner-instruction re-entry ─────────────────────
// The taxonomy has always sanctioned these two edges; until now nothing could
// put a candidate onto either, so a `needs-source-resolution` park (researcher
// could not reach a manufacturer domain that day) was a permanent dead end.
//
// This writer deliberately does NOT touch printersJsonRow field evidence. The
// owner points at sources; the researcher must still read them and fill the
// packet, and validate-candidate-evidence.js still adjudicates every
// safety-critical field. Promoting a field to manufacturer-class on the
// owner's say-so would forge exactly the provenance the gate exists to check.
function provideEvidence(options) {
  const edge = options.edge || 'rd3-external-evidence';
  if (!SANCTIONED_REENTRY_EDGES.has(edge)) {
    throw new Error(`edge ${edge} is not sanctioned for owner re-entry`);
  }
  const sources = normalizeSources(options.sources);
  const unresolvedFields = Array.isArray(options.fields) ? options.fields.map(String) : [];
  const context = readContext(options);

  // Refuse out-of-lane at WRITE time, not only at verify time. A sidecar that
  // parked on a reviewer's judgment is not unblocked by new URLs, and writing
  // the decision anyway would leave an envelope that verify-reentry then
  // rejects — a confusing half-state on a fail-closed pipeline.
  const allowedReasons = EDGE_ALLOWED_REASONS[edge];
  if (allowedReasons && !allowedReasons.has(context.sidecar.reason)) {
    throw new Error(
      `edge ${edge} cannot re-enter a ${context.sidecar.reason} park `
      + `(allowed: ${[...allowedReasons].join(', ')}); use --edge owner-instruction if the owner is overriding a reviewer judgment`,
    );
  }

  const existing = context.sidecar.ownerDecision;
  if (existing) {
    // Compare the FULL decision shape, not just source URLs. Comparing urls
    // alone made `--source X --field max_bed_temp` a silent no-op against an
    // existing `--source X` decision: the owner's new field hint vanished and
    // the call reported changed:false, so neither the idempotent path nor the
    // conflict path was actually correct.
    const sameShape = existing.action === 'reenter-with-evidence'
      && existing.edge === edge
      && sameKey(existing.sources || [], sources)
      && sameKey(existing.unresolvedFields || [], unresolvedFields);
    if (sameShape) {
      return {
        changed: false,
        action: 'provide-evidence',
        edge,
        sources,
        validation: validateReentryDecision({
          sidecar: context.sidecar, packet: context.packet, candidateId: context.candidateId,
        }),
      };
    }
    throw new Error(`conflicting owner decision already exists for ${context.candidateId}`);
  }

  const now = options.now || new Date();
  const packet = structuredClone(context.packet);
  packet.ownerSuppliedSources = sources;
  packet.nextStep = `Owner supplied ${sources.length} external source(s) via the ${edge} edge. Re-run research against them, then pass every normal evidence, review, live, custody, and POSTRUN gate. Owner-supplied sources are leads, not pre-approved evidence: each field still needs its own confirmed citation.`;
  if (typeof packet.note === 'string') {
    packet.note = `${packet.note} Owner re-entry (${edge}) on ${now.toISOString()}; prior park reason remains historical evidence.`;
  }
  const packetText = `${JSON.stringify(packet, null, 2)}\n`;
  const nextPacketSha = shaBuffer(Buffer.from(packetText));

  const ownerDecision = {
    schema: 'intake-owner-decision@1',
    action: 'reenter-with-evidence',
    candidateId: context.candidateId,
    candidateKey: context.sidecar.candidateKey,
    decidedAt: now.toISOString(),
    priorCandidateSha256: context.packetSha,
    edge,
    sources,
    ...(unresolvedFields.length ? { unresolvedFields } : {}),
  };
  const sidecar = {
    ...context.sidecar,
    nextEligibleTrigger: 'owner-approved',
    reviewEntryEdge: edge,
    ownerDecision,
    candidateArtifact: { ...context.sidecar.candidateArtifact, sha256: nextPacketSha },
    resolutionNote: `Owner supplied external sources for gated re-entry via ${edge}; field-level evidence is unchanged and still subject to the evidence gate.`,
  };
  const sidecarText = `${JSON.stringify(sidecar, null, 2)}\n`;
  const validation = validateReentryDecision({ sidecar, packet, candidateId: context.candidateId });
  if (!validation.ok) throw new Error(`generated owner decision is invalid: ${validation.reason}`);

  const result = { changed: false, action: 'provide-evidence', edge, sources, validation };
  if (!options.apply) return result;
  commitDecisionTransaction(context, { packetText, nextPacketSha, sidecarText, now, options });
  return { ...result, changed: true };
}

function parseCli(argv) {
  const [command, ...rest] = argv;
  if (!['duplicate', 'approve-series', 'provide-evidence', 'verify-reentry'].includes(command)) {
    throw new Error('command must be duplicate, approve-series, provide-evidence, or verify-reentry');
  }
  const options = { apply: false };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--dry-run') options.apply = false;
    else {
      const value = rest[++i];
      if (!value) throw new Error(`${arg} requires a value`);
      // Repeatable flags accumulate instead of last-one-wins: an owner citing
      // three manufacturer pages must not silently ship only the third.
      if (arg === '--source') { (options.sources ||= []).push(value); continue; }
      if (arg === '--field')  { (options.fields  ||= []).push(value); continue; }
      const key = {
        '--candidate': 'candidateId',
        '--duplicate-of': 'duplicateOf',
        '--series-group': 'seriesGroup',
        '--edge': 'edge',
        '--repo-root': 'repoRoot',
        '--parked-root': 'parkedRoot',
        '--resolved-root': 'resolvedRoot',
        '--ledger': 'ledgerPath',
        '--printers': 'printersPath',
      }[arg];
      if (!key) throw new Error(`unknown argument ${arg}`);
      options[key] = value;
    }
  }
  return { command, options };
}

module.exports = {
  resolveDuplicate,
  approveSeries,
  provideEvidence,
  validateReentryDecision,
  recoverOwnerDecisionTransaction,
  SANCTIONED_REENTRY_EDGES,
};

if (require.main === module) {
  try {
    const { command, options } = parseCli(process.argv.slice(2));
    let result;
    if (command === 'duplicate') result = resolveDuplicate(options);
    else if (command === 'approve-series') result = approveSeries(options);
    else if (command === 'provide-evidence') result = provideEvidence(options);
    else {
      const context = readContext(options);
      const validation = validateReentryDecision({
        sidecar: context.sidecar,
        packet: context.packet,
        candidateId: context.candidateId,
      });
      if (!validation.ok) throw new Error(validation.reason);
      result = { changed: false, action: 'verify-reentry', validation };
    }
    console.log(`OWNERDECISION ok=true action=${result.action} candidate=${options.candidateId} changed=${result.changed}`);
  } catch (error) {
    console.error(`OWNERDECISION ok=false reason=${error.message}`);
    process.exit(1);
  }
}
