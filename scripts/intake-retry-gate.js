#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { canonicalSource } = require('./lib/intake-source-normalizer.js');
const { isIso8601Timestamp } = require('./validate-reviewer-output.js');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// The gate used to read `sidecar.objections` / `sidecar.evidence` / `diffSha`
// directly, and NO writer in the pipeline has ever persisted any of them onto a
// judgment-on-evidence sidecar — so no review-no-go candidate could ever retry,
// found live by run-20260805T100014Z. The data was never actually missing: R1's
// structured output carries the objections and the sidecar SHA-references it in
// `verdictRefs[].ref`, while the branch tip lives in `preservedRef`. Resolve
// from those rather than demanding duplicated copies — which also means already
// parked candidates work without being re-parked, and there is one source of
// truth instead of two that can drift.
function resolveParkedObjections(parked, repoRoot) {
  if (Array.isArray(parked.objections) && parked.objections.length) return parked.objections;
  const refs = Array.isArray(parked.verdictRefs) ? parked.verdictRefs : [];
  for (const entry of refs) {
    if (!entry || !isNonEmptyString(entry.ref)) continue;
    try {
      const resolvedPath = path.resolve(repoRoot || process.cwd(), entry.ref);
      const parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      if (Array.isArray(parsed.objections) && parsed.objections.length) return parsed.objections;
    } catch (_) { /* unreadable ref is not an objection source; fall through */ }
  }
  return [];
}

function defaultCommitExists(commit, repoRoot) {
  try {
    // Merged-to-main is the bar, not merely "the object exists" — a resolution
    // pointing at an unmerged local commit proves nothing about shipped behavior.
    execFileSync('git', ['merge-base', '--is-ancestor', commit, 'origin/main'],
      { cwd: repoRoot || process.cwd(), stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

function canRetryJudgment(sidecar, regenerated, options = {}) {
  const errors = [];
  const parked = sidecar && typeof sidecar === 'object' ? sidecar : {};
  const attempt = regenerated && typeof regenerated === 'object' ? regenerated : {};
  const repoRoot = options.repoRoot;
  const commitExists = options.commitExists
    || ((commit) => defaultCommitExists(commit, repoRoot));

  if (parked.class !== 'judgment-on-evidence') {
    errors.push('parked class must be judgment-on-evidence');
  }
  // `preservedRef` is the parked branch tip and is what the pipeline actually
  // writes; it serves the same "has the diff moved since the NO-GO" purpose.
  const parkedDiff = isNonEmptyString(parked.diffSha) ? parked.diffSha : parked.preservedRef;
  if (!isNonEmptyString(parkedDiff) || !isNonEmptyString(attempt.diffSha)) {
    errors.push('both parked and regenerated diffSha are required');
  } else if (attempt.diffSha === parkedDiff) {
    errors.push('diffSha unchanged');
  }

  const known = new Set(
    (Array.isArray(parked.evidence) ? parked.evidence : [])
      .map((evidence) => evidence && evidence.canonicalSource)
      .filter(isNonEmptyString)
  );
  const objections = resolveParkedObjections(parked, repoRoot);
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

    // An objection can be answered two ways, and the gate previously modelled
    // only the first:
    //   evidence     — a NOVEL external source settles a factual question
    //   code-change  — the objection was about app BEHAVIOUR and the behaviour
    //                  changed, so no document exists or could exist
    // Ender-3 S1 is the second kind: R1 objected that engine.js never clamped
    // emitted acceleration to printer.max_acceleration and asked whether the
    // owner would add a clamp. cc2ea76 added it. No source answers that.
    // Held to its own standard rather than a weaker one: the commit must be a
    // real 40-char SHA that is actually merged to origin/main, plus a claim
    // saying what changed — an unmerged commit proves nothing about behaviour.
    if (resolution.kind === 'code-change') {
      if (!isNonEmptyString(resolution.claim)) {
        errors.push(`objection ${i} code-change resolution lacks claim`);
      }
      if (!isNonEmptyString(resolution.resolvedAt) || !isIso8601Timestamp(resolution.resolvedAt)) {
        errors.push(`objection ${i} code-change resolution needs an ISO-8601 resolvedAt`);
      }
      if (!/^[0-9a-f]{40}$/i.test(String(resolution.commit || ''))) {
        errors.push(`objection ${i} code-change resolution needs a full 40-character commit sha`);
      } else if (!commitExists(resolution.commit)) {
        errors.push(`objection ${i} commit ${String(resolution.commit).slice(0, 12)} is not merged to origin/main (does not exist there)`);
      }
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
