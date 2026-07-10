#!/usr/bin/env node
const { canonicalSource } = require('./lib/intake-source-normalizer.js');
const { isIso8601Timestamp } = require('./validate-reviewer-output.js');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function canRetryJudgment(sidecar, regenerated) {
  const errors = [];
  const parked = sidecar && typeof sidecar === 'object' ? sidecar : {};
  const attempt = regenerated && typeof regenerated === 'object' ? regenerated : {};

  if (parked.class !== 'judgment-on-evidence') {
    errors.push('parked class must be judgment-on-evidence');
  }
  if (!isNonEmptyString(parked.diffSha) || !isNonEmptyString(attempt.diffSha)) {
    errors.push('both parked and regenerated diffSha are required');
  } else if (attempt.diffSha === parked.diffSha) {
    errors.push('diffSha unchanged');
  }

  const known = new Set(
    (Array.isArray(parked.evidence) ? parked.evidence : [])
      .map((evidence) => evidence && evidence.canonicalSource)
      .filter(isNonEmptyString)
  );
  const objections = Array.isArray(parked.objections) ? parked.objections : [];
  const resolved = Array.isArray(attempt.objections) ? attempt.objections : [];
  if (objections.length === 0) errors.push('parked objections are required');
  if (resolved.length !== objections.length) {
    errors.push('regenerated objection count must match parked objection count');
  }

  for (let i = 0; i < objections.length; i += 1) {
    const regeneratedObjection = resolved[i];
    const identityFields = ['reviewer', 'field', 'question', 'raisedAt'];
    if (!regeneratedObjection || identityFields.some(
      (field) => regeneratedObjection[field] !== objections[i]?.[field]
    )) {
      errors.push(`objection ${i} identity or order changed`);
    }

    const resolution = regeneratedObjection && regeneratedObjection.resolvedBy;
    if (!resolution || typeof resolution !== 'object') {
      errors.push(`objection ${i} has no resolvedBy`);
      continue;
    }

    for (const field of ['source', 'excerpt', 'claim', 'resolvedAt']) {
      if (!isNonEmptyString(resolution[field])) {
        errors.push(`objection ${i} lacks ${field}`);
      }
    }
    if (isNonEmptyString(resolution.resolvedAt)
      && !isIso8601Timestamp(resolution.resolvedAt)) {
      errors.push(`objection ${i} resolvedAt must be ISO-8601`);
    }

    if (isNonEmptyString(resolution.source)) {
      try {
        const canonical = canonicalSource(resolution.source);
        if (known.has(canonical)) {
          errors.push(`objection ${i} source is not novel: ${canonical}`);
        }
      } catch (error) {
        errors.push(`objection ${i} source is invalid: ${error.message}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    reason: errors.length ? 'review-no-go-unresolved' : null,
    errors,
    reviewRequests: errors.length ? 0 : 1,
  };
}

module.exports = { canRetryJudgment };
