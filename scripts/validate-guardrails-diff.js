#!/usr/bin/env node
// ─── Validator for a guardrails DIFF (S4) ────────────────────────────────────
//
// Run: node scripts/validate-guardrails-diff.js --file <diff.json>
//        [--config <guardrails.json>] [--validator <validate-guardrails.js>]
//
// Exit 0 = valid; exit 2 = invalid (matches the Scout / validate-guardrails
// stop-condition convention).
//
// What a "diff" is: the structured changeset the S4 Intake Retrospective EMITS
// (read-only) proposing owner-ratifiable edits to the learned-guardrails config
// (scripts/printer-intake-guardrails.json). This validator is the gate a diff
// must pass before it is shown or applied. It does NOT apply anything — see
// apply-guardrails-diff.js (S4 Gate 3) for the owner-approved apply path.
//
// Two layers of validation:
//   1. DIFF SHAPE (inline here — diff-specific; the config validator can't know
//      about it): wrapper schema id; `changes` is an array (EMPTY IS VALID — a
//      clean no-op diff for the bootstrapping / no-learning case, per spec §4.2);
//      each change has action/target/value/evidence/confidence/rationale; action
//      ∈ {add,modify,retire}; confidence ∈ {stated,observed}; target is a real
//      learnable key (brandAliases.<key> or one of the v1 array targets) and is
//      NOT brandTokens/familyTokens (the Scout never reads those — spec §4.2);
//      evidence is ≥1 citation (candidateKey + runId); `modify` only applies to a
//      brandAliases.<key> (an array entry has no sub-identity to modify).
//   2. CONFIG CHAIN: project the diff onto the CURRENT config in memory, then run
//      S3's validate-guardrails.js on the result. This REUSES S3's validator
//      wholesale (no rule duplication / drift) so e.g. an `add brandAliases.<k>`
//      whose value isn't a real brands[].id is rejected by S3's own referential
//      check, and any structural regression a diff could introduce is caught.
//
// v1 target enum excludes brandTokens / familyTokens: the deterministic Scout
// never reads them (they are S2-consumed only), so no Scout outcome could ever
// evidence a change to them. They become learnable once S2 lands + emits its own
// outcomes (spec §4.2 step 6).

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const DIFF_SCHEMA_ID = 'printer-intake-guardrails-diff@1';
const ACTIONS        = ['add', 'modify', 'retire'];
const CONFIDENCE     = ['stated', 'observed'];
// The only config keys the DETERMINISTIC Scout actually reads → the only v1
// learnable diff targets. brandAliases is dotted (brandAliases.<key>).
const ARRAY_TARGETS  = ['modelSuffixStrip', 'resinKeywords', 'nonFdmTech', 'nonFdmNoteAcronyms'];
// Present in the config but Scout-unread (S2-consumed) → not learnable in v1.
const FORBIDDEN_TARGETS = ['brandTokens', 'familyTokens'];

const DEFAULT_CONFIG    = path.join(__dirname, 'printer-intake-guardrails.json');
const DEFAULT_VALIDATOR = path.join(__dirname, 'validate-guardrails.js');

// The embedded schema descriptor IS the schema (single source of truth, no
// separate file to drift) — mirrors how validate-guardrails.js keeps the config
// checks inline rather than loading an external JSON-schema document.
const DIFF_SCHEMA = {
  id: DIFF_SCHEMA_ID,
  wrapper: { schema: DIFF_SCHEMA_ID, changes: '[] of change — EMPTY IS VALID' },
  change: {
    action: ACTIONS,
    target: `brandAliases.<key> | ${ARRAY_TARGETS.join(' | ')}`,
    value: 'string (the brand id for brandAliases, else the list entry)',
    evidence: '[≥1] { candidateKey: string|string[], runId: string }',
    confidence: CONFIDENCE,
    rationale: 'string (one line)',
  },
};

const isStr   = (v) => typeof v === 'string';
const nonEmpty = (v) => isStr(v) && v.trim().length > 0;

// Classify a target string. Returns one of:
//   { kind: 'brandAlias', key }  |  { kind: 'array', name }  |  { kind: 'invalid', reason }
function parseTarget(target) {
  if (!isStr(target) || target.length === 0) return { kind: 'invalid', reason: 'target must be a non-empty string' };
  if (target.startsWith('brandAliases.')) {
    const key = target.slice('brandAliases.'.length);
    if (!key) return { kind: 'invalid', reason: 'brandAliases target needs a key (brandAliases.<key>)' };
    return { kind: 'brandAlias', key };
  }
  if (ARRAY_TARGETS.includes(target)) return { kind: 'array', name: target };
  // Specific, helpful error for the deliberately-excluded v1 dead targets.
  const forbiddenHit = FORBIDDEN_TARGETS.find(f => target === f || target.startsWith(f + '.'));
  if (forbiddenHit) {
    return { kind: 'invalid', reason: `target ${JSON.stringify(target)} (${forbiddenHit}) is not learnable in v1 — the deterministic Scout does not read it (S2-consumed only)` };
  }
  return { kind: 'invalid', reason: `unknown target ${JSON.stringify(target)} (expected brandAliases.<key> or one of: ${ARRAY_TARGETS.join(', ')})` };
}

// A change's resolved target IDENTITY, for intra-diff duplicate detection.
// brandAliases is keyed by the alias key (two writes to one key are ambiguous,
// regardless of action/value); arrays are keyed by name::value (distinct values
// on the same array are independent changes). Returns null for an invalid/absent
// target (already flagged per-change). The apply path operates AFTER projection,
// where a within-diff duplicate has already collapsed — so the diff validator is
// the natural owner of this check.
function changeIdentity(change) {
  const t = parseTarget(change && change.target);
  if (t.kind === 'brandAlias') return `brandAliases.${t.key}`;
  if (t.kind === 'array') return `${t.name}::${change && change.value}`;
  return null;
}

// One citation = { candidateKey: string | string[] (≥1 non-empty), runId: string }.
function validateCitation(c, where) {
  const errs = [];
  if (c == null || typeof c !== 'object' || Array.isArray(c)) { errs.push(`${where}: citation must be an object`); return errs; }
  const ck = c.candidateKey;
  const ckOk = nonEmpty(ck) || (Array.isArray(ck) && ck.length > 0 && ck.every(nonEmpty));
  if (!ckOk) errs.push(`${where}: candidateKey must be a non-empty string or a non-empty array of non-empty strings`);
  if (!nonEmpty(c.runId)) errs.push(`${where}: runId must be a non-empty string`);
  return errs;
}

// Pure DIFF-SHAPE validation of one change. No I/O.
function validateChange(change, i) {
  const at = `changes[${i}]`;
  const errs = [];
  if (change == null || typeof change !== 'object' || Array.isArray(change)) { errs.push(`${at}: must be an object`); return errs; }

  for (const f of ['action', 'target', 'value', 'evidence', 'confidence', 'rationale']) {
    if (!(f in change)) errs.push(`${at}: missing required field "${f}"`);
  }
  if (!ACTIONS.includes(change.action)) errs.push(`${at}: action must be one of ${ACTIONS.join('|')} (got ${JSON.stringify(change.action)})`);
  if (!CONFIDENCE.includes(change.confidence)) errs.push(`${at}: confidence must be one of ${CONFIDENCE.join('|')} (got ${JSON.stringify(change.confidence)})`);
  if (!nonEmpty(change.value)) errs.push(`${at}: value must be a non-empty string`);
  if (!nonEmpty(change.rationale)) errs.push(`${at}: rationale must be a non-empty string (one line)`);

  if (!Array.isArray(change.evidence) || change.evidence.length === 0) {
    errs.push(`${at}: evidence must be a non-empty array of citations (no evidence → not proposable)`);
  } else {
    change.evidence.forEach((c, j) => errs.push(...validateCitation(c, `${at}.evidence[${j}]`)));
  }

  const t = parseTarget(change.target);
  if (t.kind === 'invalid') {
    errs.push(`${at}: ${t.reason}`);
  } else if (change.action === 'modify' && t.kind !== 'brandAlias') {
    // An array entry is an atomic string with no sub-identity to "modify" — add/retire it.
    errs.push(`${at}: action "modify" is only valid for a brandAliases.<key> target (array entries: use add/retire)`);
  }
  return errs;
}

// Pure DIFF-SHAPE validation of the whole wrapper. No I/O. Empty changes[] is VALID.
function validateDiffShape(diff) {
  const errs = [];
  if (diff == null || typeof diff !== 'object' || Array.isArray(diff)) return ['diff must be an object'];
  if (diff.schema !== DIFF_SCHEMA_ID) errs.push(`schema must be "${DIFF_SCHEMA_ID}" (got ${JSON.stringify(diff.schema)})`);
  if (!Array.isArray(diff.changes)) { errs.push('changes must be an array (use [] for a no-op diff)'); return errs; }
  diff.changes.forEach((c, i) => errs.push(...validateChange(c, i)));

  // Intra-diff coherence: a single diff must touch each resolved target at most
  // once. Two writes to the same brandAliases.<key>, or the same array
  // name::value (e.g. an add+retire of the same entry), are contradictory and
  // would silently collapse last-write-wins in projection — reject here.
  const seenTarget = new Map();
  diff.changes.forEach((c, i) => {
    const id = changeIdentity(c);
    if (id == null) return; // invalid/absent target already flagged per-change
    if (seenTarget.has(id)) {
      errs.push(`changes[${i}]: duplicate/contradictory change — target ${JSON.stringify(id)} is already modified by changes[${seenTarget.get(id)}]; a single diff must touch each target at most once`);
    } else {
      seenTarget.set(id, i);
    }
  });
  return errs;
}

// Project a (shape-valid) diff onto a config IN MEMORY and return the candidate
// config. Pure — never writes the real config. Tombstone / provenance / version
// bump / idempotency are the APPLY path's concern (Gate 3), not validation's.
function projectDiff(cfg, changes) {
  const out = JSON.parse(JSON.stringify(cfg || {}));
  if (!out.brandAliases || typeof out.brandAliases !== 'object') out.brandAliases = {};
  for (const ch of (changes || [])) {
    const t = parseTarget(ch.target);
    if (t.kind === 'brandAlias') {
      if (ch.action === 'retire') delete out.brandAliases[t.key];
      else out.brandAliases[t.key] = ch.value;            // add | modify
    } else if (t.kind === 'array') {
      if (!Array.isArray(out[t.name])) out[t.name] = [];
      if (ch.action === 'retire') out[t.name] = out[t.name].filter(v => v !== ch.value);
      else if (!out[t.name].includes(ch.value)) out[t.name].push(ch.value);   // add (idempotent)
    }
  }
  return out;
}

// Full validation: shape, then CHAIN S3's config validator on the projected
// config. Returns { ok, errors }. Reads the current config + spawns the real
// validate-guardrails.js (its documented exit-0/2 contract) so the rules stay
// single-sourced in S3.
function validateDiff(diff, opts = {}) {
  const configPath    = opts.configPath    || DEFAULT_CONFIG;
  const validatorPath = opts.validatorPath || DEFAULT_VALIDATOR;

  const errors = validateDiffShape(diff);
  if (errors.length) return { ok: false, errors };
  if (diff.changes.length === 0) return { ok: true, errors: [] }; // no-op diff: nothing to chain

  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(configPath, 'utf8')); }
  catch (e) { return { ok: false, errors: [`cannot read base config ${configPath}: ${e.message}`] }; }

  const candidate = projectDiff(cfg, diff.changes);

  let tmpDir = null;
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gdiff-'));
    const tmpFile = path.join(tmpDir, 'candidate-guardrails.json');
    fs.writeFileSync(tmpFile, JSON.stringify(candidate, null, 2) + '\n');
    try {
      execFileSync(process.execPath, [validatorPath, '--file', tmpFile], { encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
      const detail = (e.stderr || e.stdout || e.message || '').toString().trim();
      errors.push(`projected config fails S3 config validator (validate-guardrails.js): ${detail || `exit ${e.status}`}`);
    }
  } catch (e) {
    errors.push(`config-chain validation could not run: ${e.message}`);
  } finally {
    if (tmpDir) { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) { /* best-effort */ } }
  }

  return { ok: errors.length === 0, errors };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
function main() {
  const argv = process.argv.slice(2);
  let file = null, configPath = DEFAULT_CONFIG, validatorPath = DEFAULT_VALIDATOR;
  for (let i = 0; i < argv.length; i++) {
    const need = (flag) => { const v = argv[i + 1]; if (v === undefined || v.startsWith('--')) { console.error(`STOP: ${flag} needs a value`); process.exit(2); } i++; return v; };
    switch (argv[i]) {
      case '--file': file = need('--file'); break;
      case '--config': configPath = need('--config'); break;
      case '--validator': validatorPath = need('--validator'); break;
      case '-h': case '--help':
        console.error('Usage: node scripts/validate-guardrails-diff.js --file <diff.json> [--config <guardrails.json>] [--validator <validate-guardrails.js>]');
        process.exit(0);
      default: console.error(`STOP: unknown argument: ${argv[i]}`); process.exit(2);
    }
  }
  if (!file) { console.error('STOP: --file <diff.json> is required'); process.exit(2); }

  let diff;
  try { diff = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.error(`GUARDRAILS DIFF INVALID:\n  - cannot read/parse ${file}: ${e.message}`); process.exit(2); }

  const { ok, errors } = validateDiff(diff, { configPath, validatorPath });
  if (!ok) {
    console.error('GUARDRAILS DIFF INVALID:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(2);
  }
  const n = diff.changes.length;
  console.log(`guardrails diff OK: ${path.basename(file)} (schema ${DIFF_SCHEMA_ID}, ${n} change${n === 1 ? '' : 's'}${n === 0 ? ' — no-op' : ''})`);
  process.exit(0);
}

if (require.main === module) {
  main();
} else {
  module.exports = { validateDiff, validateDiffShape, validateChange, projectDiff, parseTarget, changeIdentity, DIFF_SCHEMA, DIFF_SCHEMA_ID, ACTIONS, CONFIDENCE, ARRAY_TARGETS, FORBIDDEN_TARGETS };
}
