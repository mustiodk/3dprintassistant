#!/usr/bin/env node
// Tests for validate-guardrails-diff.js (S4 Gate 2).
//
// Run: node scripts/validate-guardrails-diff.test.js
//
// Imports validateDiff and exercises it against the REAL base config
// (printer-intake-guardrails.json) + REAL validate-guardrails.js — the config
// CHAIN is the point, so these are integration tests. They only PROJECT in
// memory + validate a TEMP candidate; the real config is never mutated.

const { validateDiff, validateDiffShape, parseTarget } = require('./validate-guardrails-diff.js');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const DIFF_VALIDATOR = path.join(__dirname, 'validate-guardrails-diff.js');

let failed = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`  ok   ${name}`); }
  else { console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); failed++; }
}

const SCHEMA = 'printer-intake-guardrails-diff@1';
const mkDiff = (changes) => ({ schema: SCHEMA, changes });
const ev = () => [{ candidateKey: 'missingPrinter:test-1', runId: '2026-06-14T00:00:00.000Z' }];
const validAdd = () => ({ action: 'add', target: 'brandAliases.bmblab', value: 'bambu_lab', evidence: ev(), confidence: 'observed', rationale: 'typo of bambu lab, seen in 2 distinct requests' });

function reject(name, diff, needle) {
  const r = validateDiff(diff);
  check(`${name} → rejected`, !r.ok, `errors: ${JSON.stringify(r.errors)}`);
  if (needle) check(`${name} → error mentions "${needle}"`, r.errors.some(e => e.includes(needle)), `errors: ${JSON.stringify(r.errors)}`);
}
function accept(name, diff) {
  const r = validateDiff(diff);
  check(`${name} → accepted`, r.ok, `errors: ${JSON.stringify(r.errors)}`);
}

try {
  // ── accepted ──
  accept('valid add (brandAliases → real brand)', mkDiff([validAdd()]));
  accept('empty wrapper (no-op diff)', mkDiff([]));
  accept('array add (modelSuffixStrip, normalised, novel)', mkDiff([
    { action: 'add', target: 'modelSuffixStrip', value: 'w/box', evidence: ev(), confidence: 'stated', rationale: 'owner-stated packaging suffix' },
  ]));
  accept('retire an existing brandAlias (sparkx)', mkDiff([
    { action: 'retire', target: 'brandAliases.sparkx', value: 'creality', evidence: ev(), confidence: 'stated', rationale: 'owner-stated removal for audit' },
  ]));
  accept('array entry already present (idempotent add)', mkDiff([
    { action: 'add', target: 'modelSuffixStrip', value: 'combo', evidence: ev(), confidence: 'observed', rationale: 're-proposal of an existing entry projects to a no-op' },
  ]));
  accept('two distinct values on the same array (independent changes)', mkDiff([
    { action: 'add', target: 'resinKeywords', value: 'newresina', evidence: ev(), confidence: 'observed', rationale: 'distinct resin model a' },
    { action: 'add', target: 'resinKeywords', value: 'newresinb', evidence: ev(), confidence: 'observed', rationale: 'distinct resin model b' },
  ]));
  accept('two distinct brandAlias keys', mkDiff([
    { action: 'add', target: 'brandAliases.bmblab', value: 'bambu_lab', evidence: ev(), confidence: 'observed', rationale: 'typo a' },
    { action: 'add', target: 'brandAliases.creality3d', value: 'creality', evidence: ev(), confidence: 'observed', rationale: 'alias b' },
  ]));

  // ── shape rejections (inline, no chain needed) ──
  reject('wrong schema id', { schema: 'nope@9', changes: [] }, 'schema must be');
  reject('changes not an array', { schema: SCHEMA, changes: {} }, 'changes must be an array');
  reject('missing field (no rationale)', mkDiff([{ action: 'add', target: 'brandAliases.bmblab', value: 'bambu_lab', evidence: ev(), confidence: 'observed' }]), 'missing required field "rationale"');
  reject('invalid action', mkDiff([{ ...validAdd(), action: 'delete' }]), 'action must be one of');
  reject('invalid confidence', mkDiff([{ ...validAdd(), confidence: 'guessed' }]), 'confidence must be one of');
  reject('empty value', mkDiff([{ ...validAdd(), value: '' }]), 'value must be a non-empty string');
  reject('no evidence (empty array)', mkDiff([{ ...validAdd(), evidence: [] }]), 'evidence must be a non-empty array');
  reject('evidence citation missing runId', mkDiff([{ ...validAdd(), evidence: [{ candidateKey: 'k' }] }]), 'runId must be a non-empty string');
  reject('invalid target (familyTokens)', mkDiff([{ ...validAdd(), target: 'familyTokens' }]), 'not learnable in v1');
  reject('invalid target (brandTokens)', mkDiff([{ ...validAdd(), target: 'brandTokens' }]), 'not learnable in v1');
  reject('unknown target', mkDiff([{ ...validAdd(), target: 'somethingElse' }]), 'unknown target');
  reject('modify on an array target', mkDiff([{ action: 'modify', target: 'modelSuffixStrip', value: 'combo', evidence: ev(), confidence: 'observed', rationale: 'arrays have no sub-identity' }]), 'only valid for a brandAliases');
  reject('brandAliases target with no key', mkDiff([{ ...validAdd(), target: 'brandAliases.' }]), 'needs a key');
  reject('duplicate brandAlias key in one diff', mkDiff([
    { action: 'add', target: 'brandAliases.bmblab', value: 'bambu_lab', evidence: ev(), confidence: 'observed', rationale: 'first write' },
    { action: 'add', target: 'brandAliases.bmblab', value: 'creality', evidence: ev(), confidence: 'observed', rationale: 'contradictory second write to same key' },
  ]), 'duplicate/contradictory change');
  reject('add + retire of the same array entry in one diff', mkDiff([
    { action: 'add', target: 'resinKeywords', value: 'flipflop', evidence: ev(), confidence: 'observed', rationale: 'add' },
    { action: 'retire', target: 'resinKeywords', value: 'flipflop', evidence: ev(), confidence: 'observed', rationale: 'and immediately retire — contradictory' },
  ]), 'duplicate/contradictory change');

  // ── config-CHAIN rejections (S3 validate-guardrails.js on the projected config) ──
  reject('alias → nonexistent brand (S3 referential check)', mkDiff([
    { action: 'add', target: 'brandAliases.foo', value: 'notabrand', evidence: ev(), confidence: 'observed', rationale: 'value is not a real brands[].id' },
  ]), 'S3 config validator');
  reject('brandAliases key not norm()-form (S3 chain)', mkDiff([
    { action: 'add', target: 'brandAliases.BadKey', value: 'bambu_lab', evidence: ev(), confidence: 'observed', rationale: 'mixed-case key can never match the runtime norm() lookup' },
  ]), 'S3 config validator');
  reject('array entry not normalised (S3 chain)', mkDiff([
    { action: 'add', target: 'resinKeywords', value: 'UPPER', evidence: ev(), confidence: 'observed', rationale: 'not lowercase/trimmed' },
  ]), 'S3 config validator');

  // ── pure-shape unit sanity ──
  check('validateDiffShape: empty changes ok', validateDiffShape(mkDiff([])).length === 0);
  check('parseTarget: brandAliases.x → brandAlias', parseTarget('brandAliases.x').kind === 'brandAlias');
  check('parseTarget: resinKeywords → array', parseTarget('resinKeywords').kind === 'array');
  check('parseTarget: familyTokens → invalid', parseTarget('familyTokens').kind === 'invalid');

  // ── CLI contract (exit 0 valid / exit 2 invalid) — locks the contract the
  //    apply path + any CI gate depend on ──
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gdiff-test-'));
  try {
    const validFile = path.join(tmp, 'valid.json');
    const invalidFile = path.join(tmp, 'invalid.json');
    fs.writeFileSync(validFile, JSON.stringify(mkDiff([])) + '\n');                       // empty = valid no-op
    fs.writeFileSync(invalidFile, JSON.stringify({ schema: 'nope@9', changes: [] }) + '\n');
    let validExit = null, invalidExit = null;
    try { execFileSync(process.execPath, [DIFF_VALIDATOR, '--file', validFile], { stdio: 'pipe' }); validExit = 0; }
    catch (e) { validExit = e.status; }
    try { execFileSync(process.execPath, [DIFF_VALIDATOR, '--file', invalidFile], { stdio: 'pipe' }); invalidExit = 0; }
    catch (e) { invalidExit = e.status; }
    check('CLI: valid diff → exit 0', validExit === 0, `got ${validExit}`);
    check('CLI: invalid diff → exit 2', invalidExit === 2, `got ${invalidExit}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failed) { console.error(`\n${failed} CHECK(S) FAILED`); process.exit(1); }
  console.log('\nALL TESTS PASS');
} catch (e) {
  console.error(`\nTEST ERROR: ${e && e.stack ? e.stack : e}`);
  process.exit(1);
}
