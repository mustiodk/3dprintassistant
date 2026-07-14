#!/usr/bin/env node
// Tests for intake-notify.js (Intake Autonomy v2, Gate B3).
// Webhook fully mocked; state/report dirs are per-test temp roots.
// Run: node --test scripts/intake-notify.test.js

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { notify } = require('./intake-notify.js');

function makeEnv({ webhook = 'https://discord.test/webhook/abc123' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notify-'));
  const stateDir = path.join(dir, 'state');
  const configPath = path.join(dir, 'local.json');
  const ledgerPath = path.join(dir, 'ledger.jsonl');
  const freezePath = path.join(dir, 'freeze');
  if (webhook !== null) fs.writeFileSync(configPath, JSON.stringify({ discordWebhookUrl: webhook }));
  fs.writeFileSync(ledgerPath, '');
  return { dir, stateDir, configPath, ledgerPath, freezePath };
}

function report(overrides = {}) {
  return {
    runId: 'run-2026-07-15',
    startedAt: '2026-07-15T12:00:00Z',
    finishedAt: '2026-07-15T12:20:00Z',
    shipped: 0,
    parked: 0,
    errored: 0,
    candidates: [],
    notes: [],
    ...overrides,
  };
}

function okFetch() {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 204, text: async () => '' };
  };
  impl.calls = calls;
  return impl;
}

function failFetch() {
  return async () => { throw new Error('webhook unreachable'); };
}

test('always writes the local report file, posts to the webhook, never prints the URL', async () => {
  const env = makeEnv();
  const fetchImpl = okFetch();
  const logged = [];
  const result = await notify(report({ shipped: 1, candidates: [{ id: 'k2_se', outcome: 'auto-shipped' }] }), {
    ...env, fetchImpl, log: (l) => logged.push(l),
  });
  assert.strictEqual(result.posted, true);
  assert.strictEqual(result.frozen, false);
  const reportFile = path.join(env.stateDir, 'last-run-report.md');
  assert.ok(fs.existsSync(reportFile));
  assert.match(fs.readFileSync(reportFile, 'utf8'), /k2_se/);
  assert.strictEqual(fetchImpl.calls.length, 1);
  assert.strictEqual(fetchImpl.calls[0].url, 'https://discord.test/webhook/abc123');
  const allLogs = logged.join('\n');
  assert.ok(!allLogs.includes('discord.test'), 'webhook URL must never be logged');
  assert.match(allLogs, /webhook: set\(len=\d+\)/);
});

test('shipped-and-unreported: failed POST with a shipped candidate creates the freeze flag + non-zero', async () => {
  const env = makeEnv();
  const result = await notify(report({ shipped: 1, candidates: [{ id: 'k2_se', outcome: 'auto-shipped' }] }), {
    ...env, fetchImpl: failFetch(), log: () => {},
  });
  assert.strictEqual(result.posted, false);
  assert.strictEqual(result.frozen, true);
  assert.strictEqual(result.exitCode !== 0, true);
  assert.ok(fs.existsSync(env.freezePath), 'freeze flag must exist');
  assert.match(fs.readFileSync(env.freezePath, 'utf8'), /shipped-and-unreported/);
  assert.ok(fs.existsSync(path.join(env.stateDir, 'last-run-report.md')), 'report file still written');
});

test('failed POST with NOTHING shipped: no freeze, non-fatal', async () => {
  const env = makeEnv();
  const result = await notify(report({ parked: 1 }), { ...env, fetchImpl: failFetch(), log: () => {} });
  assert.strictEqual(result.posted, false);
  assert.strictEqual(result.frozen, false);
  assert.strictEqual(result.exitCode, 0);
  assert.ok(!fs.existsSync(env.freezePath));
});

test('no webhook configured behaves as failed-POST for the freeze rule…', async () => {
  const env = makeEnv({ webhook: null });
  const result = await notify(report({ shipped: 1, candidates: [{ id: 'x', outcome: 'auto-shipped' }] }), {
    ...env, fetchImpl: okFetch(), log: () => {},
  });
  assert.strictEqual(result.posted, false);
  assert.strictEqual(result.frozen, true);
  assert.ok(fs.existsSync(env.freezePath));
});

test('…but succeeds when nothing shipped', async () => {
  const env = makeEnv({ webhook: null });
  const result = await notify(report(), { ...env, fetchImpl: okFetch(), log: () => {} });
  assert.strictEqual(result.posted, false);
  assert.strictEqual(result.frozen, false);
  assert.strictEqual(result.exitCode, 0);
});

test('shippedUnknown (crashed runner session) + failed POST -> freeze, fail-closed', async () => {
  const env = makeEnv();
  const result = await notify(report({ shipped: 0, shippedUnknown: true, failed: true }), {
    ...env, fetchImpl: failFetch(), log: () => {},
  });
  assert.strictEqual(result.frozen, true, 'ship state unknown must freeze when unreported (PD8 fail-closed)');
  assert.match(fs.readFileSync(env.freezePath, 'utf8'), /unknown/);
});

test('shippedUnknown + successful POST -> no freeze (the failure WAS reported)', async () => {
  const env = makeEnv();
  const result = await notify(report({ shipped: 0, shippedUnknown: true, failed: true }), {
    ...env, fetchImpl: okFetch(), log: () => {},
  });
  assert.strictEqual(result.frozen, false);
});

test('freeze rule counts auto-shipped candidates even when report.shipped is 0 (vocab pinned, no regex)', async () => {
  const env = makeEnv();
  const result = await notify(report({ shipped: 0, candidates: [{ id: 'x', outcome: 'auto-shipped' }] }), {
    ...env, fetchImpl: failFetch(), log: () => {},
  });
  assert.strictEqual(result.frozen, true);
  const noFp = await notify(report({ shipped: 0, candidates: [{ id: 'y', outcome: 'auto-parked:shipped-lookalike' }] }), {
    ...makeEnv(), fetchImpl: failFetch(), log: () => {},
  });
  assert.strictEqual(noFp.frozen, false, 'park reasons containing "shipped" must not count as ships');
});

test('terminal report normalizes missing finish time and candidate-derived counts before local/Discord output', async () => {
  const env = makeEnv();
  const fetchImpl = okFetch();
  await notify(report({
    finishedAt: null,
    shipped: 9,
    parked: 0,
    errored: 4,
    candidates: [{ id: 'centauri_carbon_2', outcome: 'auto-parked:review-unavailable' }],
  }), {
    ...env,
    fetchImpl,
    now: () => new Date('2026-07-14T08:00:00Z'),
    log: () => {},
  });

  const local = fs.readFileSync(path.join(env.stateDir, 'last-run-report.md'), 'utf8');
  assert.match(local, /finished: 2026-07-14T08:00:00\.000Z/);
  assert.match(local, /shipped: 0 · parked: 1 · errored: 0/);
  const discord = JSON.parse(fetchImpl.calls[0].init.body).content;
  assert.match(discord, /finished: 2026-07-14T08:00:00\.000Z/);
  assert.match(discord, /shipped: 0 · parked: 1 · errored: 0/);
  assert.ok(!fs.existsSync(env.freezePath), 'false shipped count must not create a freeze');
});

test('digest cursor does NOT advance on a failed POST (rows re-digest next month)', async () => {
  const env = makeEnv();
  fs.writeFileSync(env.ledgerPath, `${JSON.stringify({ candidateKey: 'row_a', scoutOutcome: 'needs-research', ownerResolution: 'auto-shipped' })}\n`);
  const failed = await notify(report({ finishedAt: '2026-08-01T12:20:00Z' }), { ...env, fetchImpl: failFetch(), log: () => {} });
  assert.strictEqual(failed.digest, true);
  // Same 1st, webhook recovers: the row must still be there.
  const retry = await notify(report({ finishedAt: '2026-08-01T18:00:00Z' }), { ...env, fetchImpl: okFetch(), log: () => {} });
  assert.strictEqual(retry.digest, true);
  const body = fs.readFileSync(path.join(env.stateDir, 'last-run-report.md'), 'utf8');
  assert.match(body, /row_a/, 'row must re-digest until a digest actually reaches Discord');
});

test('monthly digest: appears when the run date is the 1st, covers auto-shipped ledger rows since last digest', async () => {
  const env = makeEnv();
  fs.writeFileSync(env.ledgerPath, [
    JSON.stringify({ candidateKey: 'old_one', scoutOutcome: 'needs-research', ownerResolution: 'auto-shipped' }),
    JSON.stringify({ candidateKey: 'newer_one', scoutOutcome: 'needs-research', ownerResolution: 'auto-shipped' }),
    JSON.stringify({ candidateKey: 'parked_one', scoutOutcome: 'needs-research', ownerResolution: 'auto-parked:unverified-model' }),
  ].join('\n') + '\n');

  // First digest on Aug 1 covers everything auto-shipped so far.
  const first = await notify(report({ finishedAt: '2026-08-01T12:20:00Z' }), { ...env, fetchImpl: okFetch(), log: () => {} });
  assert.strictEqual(first.digest, true);
  let body = fs.readFileSync(path.join(env.stateDir, 'last-run-report.md'), 'utf8');
  assert.match(body, /Monthly digest/);
  assert.match(body, /old_one/);
  assert.match(body, /newer_one/);
  assert.ok(!body.includes('parked_one'), 'digest lists auto-shipped only');

  // A later non-1st run: no digest.
  const mid = await notify(report({ finishedAt: '2026-08-15T12:20:00Z' }), { ...env, fetchImpl: okFetch(), log: () => {} });
  assert.strictEqual(mid.digest, false);
  body = fs.readFileSync(path.join(env.stateDir, 'last-run-report.md'), 'utf8');
  assert.ok(!body.includes('Monthly digest'));

  // Next 1st: only rows appended since the previous digest.
  fs.appendFileSync(env.ledgerPath, `${JSON.stringify({ candidateKey: 'sept_row', scoutOutcome: 'needs-research', ownerResolution: 'auto-shipped' })}\n`);
  const second = await notify(report({ finishedAt: '2026-09-01T12:20:00Z' }), { ...env, fetchImpl: okFetch(), log: () => {} });
  assert.strictEqual(second.digest, true);
  body = fs.readFileSync(path.join(env.stateDir, 'last-run-report.md'), 'utf8');
  assert.match(body, /sept_row/);
  assert.ok(!body.includes('old_one'), 'already-digested rows must not repeat');
});

test('discord payload truncated to the 2000-char content cap with a truncation note', async () => {
  const env = makeEnv();
  const fetchImpl = okFetch();
  const noisy = report({
    shipped: 1,
    candidates: Array.from({ length: 80 }, (_, i) => ({ id: `printer_${i}`, outcome: 'auto-shipped', detail: 'x'.repeat(60) })),
  });
  await notify(noisy, { ...env, fetchImpl, log: () => {} });
  const sent = JSON.parse(fetchImpl.calls[0].init.body);
  assert.ok(sent.content.length <= 2000, `content length ${sent.content.length} exceeds Discord cap`);
  assert.match(sent.content, /truncated/);
});
