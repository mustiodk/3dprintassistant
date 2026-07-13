// intake-r1-structured-review-parse.js — post-CLI half of the R1 structured
// review boundary (see intake-r1-structured-review.sh for the incident WHY).
//
// Owns EVERYTHING after the `claude -p` envelope lands: envelope parsing,
// fail-closed shape checks, structured-object extraction, contract validation
// through validate-reviewer-output.js, and metadata evidence — all in one
// process so no shell substitution can swallow an exit code, word-split a
// field, or interpolate envelope bytes into evidence JSON (2026-07-13 hostile
// review findings 1/2/4/5/6).
//
// Usage:
//   node intake-r1-structured-review-parse.js \
//     <envelopePath> <structuredOutPath> <metadataOutPath> \
//     <validatorPath> <requiredReviewer-or-empty> <label> <cliExitCode>
//
// stdout: exactly one line.
//   ok:    "PARSE ok=true verdict=GO|NO-GO"
//   fail:  "PARSE ok=false reason=<slug> detail=<sanitized>"
// Exit codes (shell maps nonzero to its 65 fail-closed path):
//   0 ok · 10 envelope-not-json · 11 envelope-subtype · 12 envelope-is-error ·
//   13 structured-output-missing · 14 validator-error · 15 contract-invalid ·
//   16 evidence-write-failed · 2 bad usage
'use strict';

const fs = require('fs');

function sanitizeDetail(text) {
  // Machine-line hygiene: the detail may carry CLI/model-influenced bytes.
  // Strip everything outside a safe charset — notably `=` and quotes — so a
  // key=value scanner on the runner side can never mis-parse injected tokens.
  return String(text).replace(/[^A-Za-z0-9 ._:,/-]/g, '').slice(0, 160);
}

function main() {
  const [envelopePath, structuredOut, metadataOut, validatorPath,
    requiredReviewer, label, cliExitCodeText] = process.argv.slice(2);
  if (!envelopePath || !structuredOut || !metadataOut || !validatorPath
    || label === undefined || cliExitCodeText === undefined) {
    process.stdout.write('PARSE ok=false reason=bad-args detail=usage\n');
    return 2;
  }
  const cliExitCode = Number(cliExitCodeText);

  const metadata = {
    label,
    structuredOutputPresent: false,
    contractValid: false,
    sessionId: null,
    cliExitCode: Number.isFinite(cliExitCode) ? cliExitCode : null,
    failReason: null,
  };

  let failCode = 0;
  let failSlug = null;
  let failDetail = '';
  let verdict = null;

  const finish = () => {
    metadata.failReason = failSlug;
    try {
      fs.writeFileSync(metadataOut, JSON.stringify(metadata, null, 2) + '\n');
    } catch (err) {
      process.stdout.write(
        `PARSE ok=false reason=evidence-write-failed detail=${sanitizeDetail(err.message)}\n`);
      return 16;
    }
    if (failCode === 0) {
      process.stdout.write(`PARSE ok=true verdict=${verdict}\n`);
      return 0;
    }
    process.stdout.write(
      `PARSE ok=false reason=${failSlug} detail=${sanitizeDetail(failDetail)}\n`);
    return failCode;
  };

  let envelope;
  try {
    envelope = JSON.parse(fs.readFileSync(envelopePath, 'utf8'));
  } catch (err) {
    failCode = 10; failSlug = 'envelope-not-json'; failDetail = err.message;
    return finish();
  }

  if (envelope && typeof envelope.session_id === 'string' && envelope.session_id) {
    metadata.sessionId = envelope.session_id;
  }

  if (!envelope || typeof envelope !== 'object' || envelope.subtype !== 'success') {
    failCode = 11; failSlug = 'envelope-subtype';
    failDetail = `subtype:${envelope && envelope.subtype}`;
    return finish();
  }

  // An envelope that self-declares error is never a trusted verdict, even if
  // it carries a well-formed structured_output (hostile review finding 2).
  if (envelope.is_error !== false) {
    failCode = 12; failSlug = 'envelope-is-error';
    failDetail = `is_error:${envelope.is_error}`;
    return finish();
  }

  // The incident signature: the schema never bound, so no structured_output.
  // Prose in `result` is NEVER parsed for a verdict.
  if (!Object.prototype.hasOwnProperty.call(envelope, 'structured_output')
    || envelope.structured_output === null || envelope.structured_output === undefined) {
    failCode = 13; failSlug = 'structured-output-missing';
    failDetail = 'envelope has no structured_output';
    return finish();
  }

  metadata.structuredOutputPresent = true;

  try {
    fs.writeFileSync(structuredOut,
      JSON.stringify(envelope.structured_output, null, 2) + '\n');
  } catch (err) {
    failCode = 16; failSlug = 'evidence-write-failed'; failDetail = err.message;
    return finish();
  }

  // Harness faults (validator missing/crashing) must be distinguishable from
  // reviewer-output faults: they park as review-unavailable either way, but
  // the evidence must blame the right layer (finding 6).
  let validateReviewerOutput;
  try {
    ({ validateReviewerOutput } = require(validatorPath));
    if (typeof validateReviewerOutput !== 'function') {
      throw new Error('validateReviewerOutput export missing');
    }
  } catch (err) {
    failCode = 14; failSlug = 'validator-error'; failDetail = err.message;
    return finish();
  }

  let result;
  try {
    result = validateReviewerOutput(envelope.structured_output);
  } catch (err) {
    failCode = 14; failSlug = 'validator-error'; failDetail = err.message;
    return finish();
  }

  if (result.ok && requiredReviewer
    && envelope.structured_output.reviewer !== requiredReviewer) {
    result = {
      ok: false,
      errors: [`reviewer must be ${requiredReviewer}, got ${envelope.structured_output.reviewer}`],
    };
  }

  if (!result.ok) {
    failCode = 15; failSlug = 'contract-invalid';
    failDetail = result.errors.join('; ');
    return finish();
  }

  metadata.contractValid = true;
  verdict = envelope.structured_output.verdict;
  return finish();
}

process.exit(main());
