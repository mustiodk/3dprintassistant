#!/usr/bin/env node
// Tests for the Intake Retrospective deterministic parts (S4 Gate 3):
//   - intake-retrospective-gather.js  (gather / cluster / dedup, golden-file)
//   - apply-guardrails-diff.js        (apply: provenance, tombstone, retire-value
//                                      match, version bump, idempotency)
//
// Run: node scripts/intake-retrospective.test.js
//
// The judgment half (which candidates to propose) is owner-calibrated, not
// unit-tested. These cover the deterministic backbone + the apply path. The CLI
// apply tests operate on a TEMP copy of the config — the real config is never
// mutated.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { gather, parseCorrectiveSignal, readLedger } = require('./intake-retrospective-gather.js');
const { applyDiff } = require('./apply-guardrails-diff.js');
const { validateDiff } = require('./validate-guardrails-diff.js');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); failed++; }
}

const REAL_CONFIG = path.join(__dirname, 'printer-intake-guardrails.json');
const FIXTURE = path.join(__dirname, 'fixtures', 'printer-intake-outcomes-sample.jsonl');
const GATHER = path.join(__dirname, 'intake-retrospective-gather.js');
const SCHEMA = 'printer-intake-guardrails-diff@1';

try {
  // ── gather / cluster / dedup (golden-file) ──
  const { entries } = readLedger(FIXTURE);
  check('readLedger: skips _schema marker + reads 7 entries', entries.length === 7, `got ${entries.length}`);

  const full = gather(entries, null);
  check('gather (no watermark): LOUD full rebuild', full.fullRebuild === true);
  check('gather (no watermark): 4 candidate changes', full.diff.changes.length === 4, `got ${full.diff.changes.length}`);
  check('gather: clusters sorted by signal', JSON.stringify(full.clusters.map(c => c.correctiveSignal)) === JSON.stringify([
    'brandAliases:banbu->bambu_lab', 'brandAliases:crelity->creality', 'modelSuffixStrip:w/box', 'resinKeywords:-mars',
  ]));
  const banbu = full.clusters.find(c => c.correctiveSignal === 'brandAliases:banbu->bambu_lab');
  check('gather: banbu corroboration = 2 (duplicate candidateKey k2 deduped)', banbu.corroboration === 2, `got ${banbu.corroboration}`);
  check('gather: banbu corroborated (>=2)', banbu.corroborated === true);
  check('gather: banbu EVIDENCE deduped to 2 (not 3 despite the duplicate k2 row)', banbu.evidence.length === 2, `got ${banbu.evidence.length}`);
  check('gather: banbu parsed as add brandAliases.banbu', banbu.target === 'brandAliases.banbu' && banbu.action === 'add' && banbu.value === 'bambu_lab');
  const mars = full.clusters.find(c => c.correctiveSignal === 'resinKeywords:-mars');
  check('gather: mars parsed as RETIRE on resinKeywords', mars.action === 'retire' && mars.target === 'resinKeywords' && mars.value === 'mars');
  check('gather: every candidate confidence = stated', full.diff.changes.every(c => c.confidence === 'stated'));
  check('gather: candidate diff passes the diff validator (shape + S3 chain)', validateDiff(full.diff).ok, JSON.stringify(validateDiff(full.diff).errors));

  // watermark gating
  const gated = gather(entries, '2026-06-05T00:00:00.000Z');
  check('gather (watermark): 3 candidates (old crelity excluded)', gated.diff.changes.length === 3, `got ${gated.diff.changes.length}`);
  check('gather (watermark): not a full rebuild', gated.fullRebuild === false);
  check('gather (watermark): crelity (pre-watermark) excluded', !gated.clusters.some(c => c.correctiveSignal.includes('crelity')));

  // stale watermark → LOUD full rebuild + error (never silent unbounded re-read)
  const stale = gather(entries, 'not-a-timestamp');
  check('gather (stale watermark): LOUD full rebuild', stale.fullRebuild === true);
  check('gather (stale watermark): emits an error', stale.errors.length >= 1);

  // target collision: two distinct signals resolving to the SAME target are
  // surfaced as a loud error AND excluded from the candidate diff (which stays
  // validator-clean) — the owner reconciles which wins.
  const conflictEntries = [
    { candidateKey: 'c1', runId: '2026-06-12T00:00:00.000Z', ownerResolution: 'was-brand-typo', correctiveSignal: 'brandAliases:x->creality' },
    { candidateKey: 'c2', runId: '2026-06-12T01:00:00.000Z', ownerResolution: 'was-brand-typo', correctiveSignal: 'brandAliases:x->prusa' },
    { candidateKey: 'c3', runId: '2026-06-12T02:00:00.000Z', ownerResolution: 'was-suffix-variant', correctiveSignal: 'modelSuffixStrip:w/case' },
  ];
  const cf = gather(conflictEntries, null);
  check('gather conflict: brandAliases.x collision surfaced in errors', cf.errors.some(e => e.includes('target conflict on brandAliases.x')));
  check('gather conflict: colliding signals excluded; only w/case remains', cf.diff.changes.length === 1 && cf.diff.changes[0].target === 'modelSuffixStrip');
  check('gather conflict: emitted diff still passes the validator', validateDiff(cf.diff).ok, JSON.stringify(validateDiff(cf.diff).errors));

  // parseCorrectiveSignal units
  check('parse: brandAliases:x->creality', JSON.stringify(parseCorrectiveSignal('brandAliases:x->creality')) === JSON.stringify({ target: 'brandAliases.x', action: 'add', value: 'creality' }));
  check('parse: list:+foo → add', JSON.stringify(parseCorrectiveSignal('resinKeywords:+foo')) === JSON.stringify({ target: 'resinKeywords', action: 'add', value: 'foo' }));
  check('parse: list:-mars → retire', JSON.stringify(parseCorrectiveSignal('resinKeywords:-mars')) === JSON.stringify({ target: 'resinKeywords', action: 'retire', value: 'mars' }));
  check('parse: list:bare → add', JSON.stringify(parseCorrectiveSignal('modelSuffixStrip:w/box')) === JSON.stringify({ target: 'modelSuffixStrip', action: 'add', value: 'w/box' }));
  check('parse: none → null', parseCorrectiveSignal('none') === null);
  check('parse: unknown head → null', parseCorrectiveSignal('somethingElse:foo') === null);

  // ── apply path (function-level) ──
  const baseCfg = JSON.parse(fs.readFileSync(REAL_CONFIG, 'utf8'));
  check('precondition: real config is version 1', baseCfg.version === 1);
  const ev = (k) => [{ candidateKey: k, runId: '2026-06-12T00:00:00.000Z' }];
  const diff = { schema: SCHEMA, changes: [
    { action: 'add', target: 'brandAliases.banbu', value: 'bambu_lab', evidence: ev('k1'), confidence: 'stated', rationale: 'typo of bambu lab' },
    { action: 'add', target: 'modelSuffixStrip', value: 'w/box', evidence: ev('k3'), confidence: 'stated', rationale: 'packaging suffix' },
    { action: 'retire', target: 'resinKeywords', value: 'mars', evidence: ev('k4'), confidence: 'stated', rationale: 'mis-declined FDM' },
  ]};

  const a1 = applyDiff(baseCfg, diff, { by: 'test', date: '2026-06-16' });
  check('apply: 3 effective changes', a1.effective.length === 3, JSON.stringify(a1.effective));
  check('apply: version bumped 1 -> 2', a1.cfg.version === 2);
  check('apply: lastRatified set', a1.cfg.lastRatified === '2026-06-16');
  check('apply: banbu alias added', a1.cfg.brandAliases.banbu === 'bambu_lab');
  check('apply: w/box added to modelSuffixStrip', a1.cfg.modelSuffixStrip.includes('w/box'));
  check('apply: mars removed from resinKeywords', !a1.cfg.resinKeywords.includes('mars'));
  check('apply: _provenance keyed by target for banbu', !!a1.cfg._provenance['brandAliases.banbu'] && a1.cfg._provenance['brandAliases.banbu'].added === '2026-06-16');
  check('apply: _provenance keyed by name::value for w/box', !!a1.cfg._provenance['modelSuffixStrip::w/box']);
  check('apply: _tombstone written for retired mars', !!a1.cfg._tombstones['resinKeywords::mars'] && a1.cfg._tombstones['resinKeywords::mars'].value === 'mars');
  check('apply: input config not mutated (still version 1)', baseCfg.version === 1);

  // idempotency (function-level): re-apply onto the result → nothing effective
  const a2 = applyDiff(a1.cfg, diff, { by: 'test', date: '2026-06-17' });
  check('apply idempotent: 0 effective on re-apply', a2.effective.length === 0);
  check('apply idempotent: version stays 2 (no bump)', a2.cfg.version === 2);
  check('apply idempotent: lastRatified unchanged', a2.cfg.lastRatified === '2026-06-16');

  // retire-value mismatch → refuse (the deferred Gate 2 MEDIUM, handled here)
  const badRetire = { schema: SCHEMA, changes: [
    { action: 'retire', target: 'brandAliases.sparkx', value: 'wrongbrand', evidence: ev('k'), confidence: 'stated', rationale: 'wrong value' },
  ]};
  const a3 = applyDiff(baseCfg, badRetire, { by: 'test', date: '2026-06-16' });
  check('apply: wrong-value retire → error', a3.errors.length >= 1, JSON.stringify(a3.errors));
  check('apply: wrong-value retire → sparkx untouched', a3.cfg.brandAliases.sparkx === 'creality');
  check('apply: wrong-value retire → nothing effective', a3.effective.length === 0);

  // correct-value retire → effective + tombstone
  const goodRetire = { schema: SCHEMA, changes: [
    { action: 'retire', target: 'brandAliases.sparkx', value: 'creality', evidence: ev('k'), confidence: 'stated', rationale: 'owner-stated removal' },
  ]};
  const a4 = applyDiff(baseCfg, goodRetire, { by: 'test', date: '2026-06-16' });
  check('apply: correct-value retire effective', a4.effective.length === 1);
  check('apply: sparkx removed', a4.cfg.brandAliases.sparkx === undefined);
  check('apply: sparkx tombstone written', !!a4.cfg._tombstones['brandAliases.sparkx']);

  // ── apply path (CLI: dry-run, byte-identical idempotency, watermark) ──
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-test-'));
  try {
    const cfgPath = path.join(tmp, 'guardrails.json');
    const wmPath = path.join(tmp, 'wm.json');
    const diffPath = path.join(tmp, 'diff.json');
    fs.copyFileSync(REAL_CONFIG, cfgPath);
    fs.writeFileSync(diffPath, JSON.stringify(diff) + '\n');
    const APPLY = path.join(__dirname, 'apply-guardrails-diff.js');
    const run = (args) => execFileSync(process.execPath, [APPLY, ...args], { stdio: 'pipe' });

    const before = fs.readFileSync(cfgPath, 'utf8');
    run(['--file', diffPath, '--config', cfgPath, '--watermark-file', wmPath]);              // dry-run (no --apply)
    check('CLI dry-run: config NOT written', fs.readFileSync(cfgPath, 'utf8') === before);
    check('CLI dry-run: watermark NOT written', !fs.existsSync(wmPath));

    run(['--file', diffPath, '--config', cfgPath, '--apply', '--watermark-file', wmPath, '--watermark', '2026-06-13T10:00:00.000Z']);
    const after1 = fs.readFileSync(cfgPath, 'utf8');
    check('CLI apply: version bumped to 2', JSON.parse(after1).version === 2);
    check('CLI apply: watermark advanced', JSON.parse(fs.readFileSync(wmPath, 'utf8')).lastRunId === '2026-06-13T10:00:00.000Z');

    run(['--file', diffPath, '--config', cfgPath, '--apply', '--watermark-file', wmPath]);   // re-apply
    const after2 = fs.readFileSync(cfgPath, 'utf8');
    check('CLI apply idempotent: config byte-identical on re-apply', after1 === after2);

    // gather CLI exit-code contract: unreadable ledger FILE is a stop condition.
    let missExit = null;
    try { execFileSync(process.execPath, [GATHER, '--ledger', path.join(tmp, 'no-such-ledger.jsonl')], { stdio: 'pipe' }); missExit = 0; }
    catch (e) { missExit = e.status; }
    check('gather CLI: unreadable ledger → exit 2', missExit === 2, `got ${missExit}`);
    let okExit = null;
    try { execFileSync(process.execPath, [GATHER, '--ledger', FIXTURE, '--quiet'], { stdio: 'pipe' }); okExit = 0; }
    catch (e) { okExit = e.status; }
    check('gather CLI: readable ledger → exit 0', okExit === 0, `got ${okExit}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failed) { console.error(`\n${failed} CHECK(S) FAILED`); process.exit(1); }
  console.log('\nALL TESTS PASS');
} catch (e) {
  console.error(`\nTEST ERROR: ${e && e.stack ? e.stack : e}`);
  process.exit(1);
}
