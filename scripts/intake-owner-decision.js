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

  const now = options.now || new Date();
  const runId = ownerRunId(now);
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
  const resolutionPath = path.join(context.candidateDir, 'resolution.json');
  try {
    fs.writeFileSync(resolutionPath, `${JSON.stringify({
      schema: 'intake-owner-resolution@1',
      action: 'duplicate',
      candidateId: context.candidateId,
      candidateKey: context.sidecar.candidateKey,
      duplicateOf: options.duplicateOf,
      packetSha256: context.packetSha,
      resolvedAt: now.toISOString(),
    }, null, 2)}\n`);
    fs.appendFileSync(context.ledgerPath, `${JSON.stringify(correction)}\n`);
    fs.mkdirSync(path.dirname(archivePath), { recursive: true });
    fs.renameSync(context.candidateDir, archivePath);
  } catch (error) {
    fs.writeFileSync(context.ledgerPath, ledgerBefore);
    if (fs.existsSync(resolutionPath)) fs.rmSync(resolutionPath, { force: true });
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

function validateReentryDecision({ sidecar, packet, candidateId }) {
  const decision = sidecar?.ownerDecision;
  if (!decision || decision.schema !== 'intake-owner-decision@1') {
    return { ok: false, reason: 'owner-decision-missing-or-invalid' };
  }
  if (sidecar.nextEligibleTrigger !== 'owner-approved') {
    return { ok: false, reason: 'owner-decision-trigger-invalid' };
  }
  if (decision.action !== 'reenter' || decision.candidateId !== candidateId
      || sidecar.candidateId !== candidateId || !sameKey(decision.candidateKey, sidecar.candidateKey)) {
    return { ok: false, reason: 'owner-decision-identity-invalid' };
  }
  if (!/^[a-f0-9]{64}$/.test(decision.priorCandidateSha256 || '')) {
    return { ok: false, reason: 'owner-decision-prior-sha-invalid' };
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

  const packetTemp = `${context.packetPath}.owner-decision-${process.pid}`;
  const sidecarTemp = `${context.sidecarPath}.owner-decision-${process.pid}`;
  try {
    fs.writeFileSync(packetTemp, packetText, { flag: 'wx' });
    fs.writeFileSync(sidecarTemp, sidecarText, { flag: 'wx' });
    fs.renameSync(packetTemp, context.packetPath);
    try {
      fs.renameSync(sidecarTemp, context.sidecarPath);
    } catch (error) {
      fs.writeFileSync(context.packetPath, context.packetBytes);
      throw error;
    }
  } finally {
    fs.rmSync(packetTemp, { force: true });
    fs.rmSync(sidecarTemp, { force: true });
  }
  return { ...result, changed: true };
}

function parseCli(argv) {
  const [command, ...rest] = argv;
  if (!['duplicate', 'approve-series', 'verify-reentry'].includes(command)) {
    throw new Error('command must be duplicate, approve-series, or verify-reentry');
  }
  const options = { apply: false };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--dry-run') options.apply = false;
    else {
      const value = rest[++i];
      if (!value) throw new Error(`${arg} requires a value`);
      const key = {
        '--candidate': 'candidateId',
        '--duplicate-of': 'duplicateOf',
        '--series-group': 'seriesGroup',
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
  validateReentryDecision,
};

if (require.main === module) {
  try {
    const { command, options } = parseCli(process.argv.slice(2));
    let result;
    if (command === 'duplicate') result = resolveDuplicate(options);
    else if (command === 'approve-series') result = approveSeries(options);
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
