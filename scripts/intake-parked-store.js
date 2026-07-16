#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const { classifyParkReason } = require('./intake-park-taxonomy.js');

const TAINTED_CLASSES = new Set(['judgment-on-evidence', 'decision-required']);
const DEFAULT_PARKED_ROOT = path.join(__dirname, '.intake-runner-state', 'parked');

function assertParkedFilePath(filePath) {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
    throw new Error('parked sidecar path must be absolute');
  }
  if (path.basename(filePath) !== 'parked.json') {
    throw new Error('parked sidecar path must end with parked.json; a candidate id is not a file path');
  }
}

function parkedSidecarPath(candidateId, parkedRoot = DEFAULT_PARKED_ROOT) {
  if (typeof candidateId !== 'string'
    || !/^[A-Za-z0-9._-]+$/.test(candidateId)
    || candidateId === '.'
    || candidateId === '..') {
    throw new Error('candidateId must match [A-Za-z0-9._-]+ and cannot be . or ..');
  }
  return path.join(parkedRoot, candidateId, 'parked.json');
}

function parseRepairAttempts(value) {
  if (value === undefined) return { valid: true, value: 0 };
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return { valid: true, value };
  }
  return { valid: false, value: 1 };
}

function isTainted(sidecar = {}) {
  return sidecar.tainted === true
    || (Array.isArray(sidecar.verdictRefs)
      && sidecar.verdictRefs.some((verdict) => verdict && verdict.verdict === 'NO-GO'))
    || sidecar.reason === 'review-no-go';
}

function assertWritableClass(sidecar = {}) {
  if (isTainted(sidecar) && !TAINTED_CLASSES.has(sidecar.class)) {
    throw new Error(`tainted candidate cannot enter ${sidecar.class || 'an unclassified park'}`);
  }
}

function migrateParkedV1(v1 = {}) {
  const legacyReviewNoGo = v1.reason === 'review-no-go';
  const verdictRefs = Array.isArray(v1.verdictRefs)
    ? v1.verdictRefs
    : (legacyReviewNoGo ? [{
      reviewer: 'unknown',
      verdict: 'NO-GO',
      at: v1.lastAttemptAt || v1.firstParkedAt || null,
      ref: 'v1-migration',
    }] : []);
  const tainted = isTainted({ ...v1, verdictRefs });
  const classified = classifyParkReason(v1.reason, { tainted });
  const repairCounter = parseRepairAttempts(v1.repairAttempts);
  const malformedResearchCounter = classified.className === 'research-defect' && !repairCounter.valid;
  const migrated = {
    schema: 'intake-parked@2',
    ...v1,
    class: legacyReviewNoGo || malformedResearchCounter
      ? 'decision-required'
      : classified.className,
    repairAttempts: repairCounter.value,
    verdictRefs,
    tainted,
    evidence: Array.isArray(v1.evidence) ? v1.evidence : [],
    ...(malformedResearchCounter ? { nextEligibleTrigger: 'owner' } : {}),
  };

  assertWritableClass(migrated);
  return migrated;
}

function enterResearchRepair(sidecar) {
  assertWritableClass(sidecar);
  if (sidecar.class !== 'research-defect') return sidecar;

  const repairCounter = parseRepairAttempts(sidecar.repairAttempts);
  if (!repairCounter.valid || repairCounter.value >= 1) {
    return {
      ...sidecar,
      class: 'decision-required',
      nextEligibleTrigger: 'owner',
      repairAttempts: repairCounter.value,
    };
  }
  return { ...sidecar, repairAttempts: repairCounter.value + 1 };
}

function normalizeParkedV2(sidecar) {
  const normalized = { ...sidecar, tainted: isTainted(sidecar) };
  assertWritableClass(normalized);
  return normalized;
}

function readParked(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return raw.schema === 'intake-parked@2' ? normalizeParkedV2(raw) : migrateParkedV1(raw);
}

function writeParked(filePath, sidecar) {
  assertParkedFilePath(filePath);
  const previous = fs.existsSync(filePath) ? readParked(filePath) : null;
  const verdictRefs = [];
  const seenVerdicts = new Set();
  for (const verdict of [
    ...(Array.isArray(previous?.verdictRefs) ? previous.verdictRefs : []),
    ...(Array.isArray(sidecar.verdictRefs) ? sidecar.verdictRefs : []),
  ]) {
    const identity = JSON.stringify(verdict);
    if (!seenVerdicts.has(identity)) {
      seenVerdicts.add(identity);
      verdictRefs.push(verdict);
    }
  }

  const normalized = normalizeParkedV2({
    ...sidecar,
    schema: 'intake-parked@2',
    verdictRefs,
    tainted: isTainted(previous || {}) || isTainted(sidecar),
  });
  fs.writeFileSync(filePath, `${JSON.stringify(normalized, null, 2)}\n`);
}

function writeParkedForCandidate(candidateId, sidecar, { parkedRoot = DEFAULT_PARKED_ROOT } = {}) {
  if (sidecar?.candidateId !== undefined && sidecar.candidateId !== candidateId) {
    throw new Error(`sidecar candidateId ${sidecar.candidateId} does not match ${candidateId}`);
  }

  const filePath = parkedSidecarPath(candidateId, parkedRoot);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  writeParked(filePath, { ...sidecar, candidateId });
  return filePath;
}

module.exports = {
  isTainted,
  assertWritableClass,
  migrateParkedV1,
  enterResearchRepair,
  readParked,
  writeParked,
  writeParkedForCandidate,
};
