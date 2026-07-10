#!/usr/bin/env node
// Tests for intake-kv-hygiene.js (Intake Autonomy v2, Gate B3).
// Pure class-policy tests over fixture keylists + ledger lines; the CLI is
// exercised in dry-run mode with --keys-file (no wrangler, no live KV).
// Run: node --test scripts/intake-kv-hygiene.test.js

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, 'intake-kv-hygiene.js');
const { computeDeleteSet, SEVEN_DAYS_MS } = require('./intake-kv-hygiene.js');

const NOW = Date.parse('2026-07-10T12:00:00Z');
const fresh = NOW - 1 * 24 * 3600 * 1000; // 1 day old
const old = NOW - 8 * 24 * 3600 * 1000; // 8 days old

function key(ts, suffix = 'aa11bb22') {
  return `req:${ts}:${suffix}`;
}

function ledgerLine(candidateKey, scoutOutcome, ownerResolution = 'declined-correct') {
  return JSON.stringify({ candidateKey, scoutOutcome, ownerResolution, runId: 'test', correctiveSignal: 'none' });
}

test('unactionable: deleted immediately regardless of age', () => {
  const k = key(fresh);
  const { deletes } = computeDeleteSet({
    keys: [k],
    ledgerLines: [ledgerLine([k], 'unactionable', 'was-noise')],
    nowMs: NOW,
  });
  assert.deepStrictEqual(deletes.map((d) => d.key), [k]);
});

test('duplicate/declined: kept inside the 7-day contact window, deleted after', () => {
  const freshDup = key(fresh, 'dup1');
  const oldDup = key(old, 'dup2');
  const oldDecline = key(old, 'dec1');
  const { deletes, kept } = computeDeleteSet({
    keys: [freshDup, oldDup, oldDecline],
    ledgerLines: [
      ledgerLine([freshDup], 'duplicate'),
      ledgerLine([oldDup], 'duplicate'),
      ledgerLine([oldDecline], 'declined-non-fdm'),
    ],
    nowMs: NOW,
  });
  assert.deepStrictEqual(deletes.map((d) => d.key).sort(), [oldDecline, oldDup].sort());
  assert.ok(kept.some((e) => e.key === freshDup && /contact/.test(e.reason)));
});

test('7-day boundary: exactly 7 days is still inside the window', () => {
  const boundary = key(NOW - SEVEN_DAYS_MS);
  const { deletes, kept } = computeDeleteSet({
    keys: [boundary],
    ledgerLines: [ledgerLine([boundary], 'duplicate')],
    nowMs: NOW,
  });
  assert.strictEqual(deletes.length, 0);
  assert.strictEqual(kept.length, 1);
});

test('parse-error: deleted once ledgered', () => {
  const k = key(old, 'pe1');
  const { deletes } = computeDeleteSet({
    keys: [k],
    ledgerLines: [ledgerLine([k], 'parse-error', 'was-noise')],
    nowMs: NOW,
  });
  assert.deepStrictEqual(deletes.map((d) => d.key), [k]);
});

test('incomplete: left to TTL, never deleted', () => {
  const k = key(old, 'inc');
  const { deletes, kept } = computeDeleteSet({
    keys: [k],
    ledgerLines: [ledgerLine([k], 'incomplete')],
    nowMs: NOW,
  });
  assert.strictEqual(deletes.length, 0);
  assert.strictEqual(kept[0].key, k);
});

test('needs-research / staged / parked keys are NEVER deleted', () => {
  const staged = key(old, 'stag');
  const parked = key(old, 'park');
  const { deletes } = computeDeleteSet({
    keys: [staged, parked],
    ledgerLines: [
      ledgerLine([staged], 'needs-research', 'auto-parked:review-unavailable'),
      ledgerLine([parked], 'needs-research', 'auto-parked:unverified-model'),
    ],
    nowMs: NOW,
  });
  assert.strictEqual(deletes.length, 0);
});

test('shipped keys: kept inside the 7-day contact window, deleted after (B4 #14 — stops daily re-staging)', () => {
  const freshShip = key(fresh, 'shf');
  const oldShip = key(old, 'sho');
  const { deletes, kept } = computeDeleteSet({
    keys: [freshShip, oldShip],
    ledgerLines: [
      ledgerLine([freshShip], 'needs-research', 'auto-shipped'),
      ledgerLine([oldShip], 'needs-research', 'auto-shipped'),
    ],
    nowMs: NOW,
  });
  assert.deepStrictEqual(deletes.map((d) => d.key), [oldShip]);
  assert.ok(kept.some((e) => e.key === freshShip && /contact window/.test(e.reason)));
});

test('unledgered keys are kept (pending work), non-req keys are ignored entirely', () => {
  const pending = key(old, 'pend');
  const { deletes, kept } = computeDeleteSet({
    keys: [pending, 'probe:preflight:123', 'some-other-key'],
    ledgerLines: [],
    nowMs: NOW,
  });
  assert.strictEqual(deletes.length, 0);
  assert.deepStrictEqual(kept.map((e) => e.key), [pending]);
});

test('malformed key timestamp: kept, conservatively', () => {
  const weird = 'req:notatimestamp:zz';
  const { deletes, kept } = computeDeleteSet({
    keys: [weird],
    ledgerLines: [ledgerLine([weird], 'duplicate')],
    nowMs: NOW,
  });
  assert.strictEqual(deletes.length, 0);
  assert.ok(kept.some((e) => e.key === weird && /timestamp/.test(e.reason)));
});

test('LAST ledger line wins for the same key (correction flips class)', () => {
  const k = key(old, 'corr');
  const { deletes } = computeDeleteSet({
    keys: [k],
    ledgerLines: [
      ledgerLine([k], 'unactionable', 'was-noise'),
      ledgerLine([k], 'needs-research', 'was-mis-declined'), // owner correction
    ],
    nowMs: NOW,
  });
  assert.strictEqual(deletes.length, 0, 'corrected-to-needs-research must not be deleted');
});

test('owner correction preserving the original scoutOutcome still protects the record', () => {
  // PD7 correction lines mutate ownerResolution, NOT scoutOutcome — the
  // wrongly-declined requester record must survive (review B3 HIGH-3).
  const k = key(old, 'misd');
  const { deletes, kept } = computeDeleteSet({
    keys: [k],
    ledgerLines: [
      ledgerLine([k], 'declined-non-fdm', 'declined-correct'),
      ledgerLine([k], 'declined-non-fdm', 'was-mis-declined'), // correction, scoutOutcome unchanged
    ],
    nowMs: NOW,
  });
  assert.strictEqual(deletes.length, 0);
  assert.ok(kept.some((e) => e.key === k && /correction/.test(e.reason)));
});

test('contact window runs from ledgeredAt when later than key creation (post-freeze backlog)', () => {
  const k = key(NOW - 30 * 24 * 3600 * 1000, 'late'); // key created 30d ago
  const ledgeredRecently = JSON.stringify({
    candidateKey: [k], scoutOutcome: 'duplicate', ownerResolution: 'declined-correct',
    runId: 'test', correctiveSignal: 'none', ledgeredAt: new Date(NOW - 2 * 24 * 3600 * 1000).toISOString(),
  });
  const { deletes, kept } = computeDeleteSet({ keys: [k], ledgerLines: [ledgeredRecently], nowMs: NOW });
  assert.strictEqual(deletes.length, 0, 'ledgered 2 days ago — window must restart from ledgering');
  assert.ok(kept.some((e) => e.key === k));
});

test('string candidateKey matches the same KV key as an array one', () => {
  const k = key(old, 'str');
  const { deletes } = computeDeleteSet({
    keys: [k],
    ledgerLines: [ledgerLine(k, 'duplicate')], // string form
    nowMs: NOW,
  });
  assert.deepStrictEqual(deletes.map((d) => d.key), [k]);
});

test('CLI dry-run: reports the delete set without deleting, machine-readable summary', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kv-hyg-'));
  const keysFile = path.join(dir, 'keys.json');
  const ledgerFile = path.join(dir, 'ledger.jsonl');
  const oldDup = key(old, 'clid');
  fs.writeFileSync(keysFile, JSON.stringify([oldDup, key(fresh, 'clfr')]));
  fs.writeFileSync(ledgerFile, `${ledgerLine([oldDup], 'duplicate')}\n${ledgerLine([key(fresh, 'clfr')], 'duplicate')}\n`);
  const out = execFileSync(process.execPath, [SCRIPT, '--keys-file', keysFile, '--ledger', ledgerFile, '--now', String(NOW)], { encoding: 'utf8' });
  assert.match(out, /HYGIENE deletes=1 kept=1 applied=false/);
  assert.match(out, new RegExp(oldDup.replace(/[:]/g, '\\:')));
});

test('CLI refuses --apply together with --keys-file (fixture input must stay dry)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kv-hyg2-'));
  const keysFile = path.join(dir, 'keys.json');
  fs.writeFileSync(keysFile, JSON.stringify([]));
  let failed = false;
  try {
    execFileSync(process.execPath, [SCRIPT, '--keys-file', keysFile, '--apply'], { encoding: 'utf8' });
  } catch (error) {
    failed = true;
    assert.match(`${error.stdout}${error.stderr}`, /--apply.*--keys-file|--keys-file.*--apply/);
  }
  assert.ok(failed);
});
