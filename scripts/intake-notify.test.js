#!/usr/bin/env node
// Tests for intake-notify.js (Intake Autonomy v2, Gate B3).
// Webhook fully mocked; state/report dirs are per-test temp roots.
// Run: node --test scripts/intake-notify.test.js

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { notify, recoverFreeze } = require('./intake-notify.js');

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

test('structured live-verify and commit summaries render their evidence instead of [object Object]', async () => {
  const env = makeEnv();
  const fetchImpl = okFetch();
  await notify(report({
    shipped: 1,
    liveVerify: {
      overlay: { ok: true, attempts: 3, elapsedSeconds: 30.2 },
      picker: { ok: true, printer: 'centauri_carbon_2' },
    },
    candidates: [{
      id: 'centauri_carbon_2',
      outcome: 'auto-shipped',
      commits: { web_merge: '954cfa3', custody: '88816bd', ios_mirror_local: 'f9a810c' },
    }],
  }), {
    ...env, fetchImpl, log: () => {},
  });

  const local = fs.readFileSync(path.join(env.stateDir, 'last-run-report.md'), 'utf8');
  assert.ok(!local.includes('[object Object]'));
  assert.match(local, /overlay\.ok=true/);
  assert.match(local, /overlay\.attempts=3/);
  assert.match(local, /picker\.printer=centauri_carbon_2/);
  assert.match(local, /web_merge=954cfa3/);
  assert.match(local, /custody=88816bd/);
  assert.match(local, /ios_mirror_local=f9a810c/);
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

test('webhook errors that embed the URL are never logged verbatim', async () => {
  const env = makeEnv();
  const logged = [];
  const fetchImpl = async (url) => { throw new Error(`connect ECONNREFUSED for ${url}`); };
  await notify(report({ parked: 1 }), { ...env, fetchImpl, log: (l) => logged.push(l) });
  const allLogs = logged.join('\n');
  assert.ok(!allLogs.includes('discord.test'), 'transport error text must not reach the logs');
  assert.match(allLogs, /webhook POST failed/);
});

// --- Freeze auto-recovery (PD8 exact-run recovery; design 2026-07-28) -------

function writeSavedReport(env, reportObj) {
  fs.mkdirSync(env.stateDir, { recursive: true });
  fs.writeFileSync(path.join(env.stateDir, 'last-run-report.json'), `${JSON.stringify(reportObj, null, 2)}\n`);
}

function writeFreeze(env, freeze) {
  const body = typeof freeze === 'string' ? freeze : `${JSON.stringify(freeze, null, 2)}\n`;
  fs.writeFileSync(env.freezePath, body);
  return body;
}

function knownFreeze(overrides = {}) {
  return {
    reason: 'shipped-and-unreported',
    runId: 'run-2026-07-15',
    shipState: 'known',
    shipped: 1,
    detail: 'run run-2026-07-15 shipped 1 candidate(s) but the Discord run report could not be delivered',
    at: '2026-07-15T12:21:00Z',
    ...overrides,
  };
}

function shippedReport(overrides = {}) {
  return report({ shipped: 1, candidates: [{ id: 'k2_se', outcome: 'auto-shipped' }], ...overrides });
}

test('recovery API exists', () => {
  assert.strictEqual(typeof recoverFreeze, 'function', 'intake-notify.js must export recoverFreeze');
});

test('new shipped-and-unreported freeze records structured runId, known shipState, and shipped count', async () => {
  const env = makeEnv();
  await notify(shippedReport(), { ...env, fetchImpl: failFetch(), log: () => {} });
  const frozen = JSON.parse(fs.readFileSync(env.freezePath, 'utf8'));
  assert.strictEqual(frozen.reason, 'shipped-and-unreported');
  assert.strictEqual(frozen.runId, 'run-2026-07-15');
  assert.strictEqual(frozen.shipState, 'known');
  assert.strictEqual(frozen.shipped, 1);
});

test('new shippedUnknown freeze records structured runId and unknown shipState', async () => {
  const env = makeEnv();
  await notify(report({ runId: 'run-crash', shipped: 0, shippedUnknown: true, failed: true }), {
    ...env, fetchImpl: failFetch(), log: () => {},
  });
  const frozen = JSON.parse(fs.readFileSync(env.freezePath, 'utf8'));
  assert.strictEqual(frozen.runId, 'run-crash');
  assert.strictEqual(frozen.shipState, 'unknown');
});

test('recovery: exact known run + matching saved report + successful POST clears the freeze once', async () => {
  const env = makeEnv();
  writeFreeze(env, knownFreeze());
  writeSavedReport(env, shippedReport());
  const fetchImpl = okFetch();
  const logged = [];
  const result = await recoverFreeze({ ...env, fetchImpl, log: (l) => logged.push(l) });
  assert.strictEqual(result.recovered, true);
  assert.strictEqual(result.applicable, true);
  assert.strictEqual(result.exitCode, 0);
  assert.ok(!fs.existsSync(env.freezePath), 'freeze must be deleted after successful delivery');
  assert.strictEqual(fetchImpl.calls.length, 1);
  const allLogs = logged.join('\n');
  assert.match(allLogs, /RECOVERY recovered=true applicable=true/);
  assert.ok(!allLogs.includes('discord.test'), 'webhook URL must never be logged');
});

test('recovery: no freeze is a no-op success', async () => {
  const env = makeEnv();
  const fetchImpl = okFetch();
  const result = await recoverFreeze({ ...env, fetchImpl, log: () => {} });
  assert.strictEqual(result.recovered, false);
  assert.strictEqual(result.applicable, false);
  assert.strictEqual(result.exitCode, 0);
  assert.strictEqual(fetchImpl.calls.length, 0, 'nothing to recover must not POST');
});

test('recovery: run-ID mismatch does not POST and preserves the freeze bytes', async () => {
  const env = makeEnv();
  const bytes = writeFreeze(env, knownFreeze({ runId: 'run-a' }));
  writeSavedReport(env, shippedReport({ runId: 'run-b' }));
  const fetchImpl = okFetch();
  const result = await recoverFreeze({ ...env, fetchImpl, log: () => {} });
  assert.strictEqual(result.recovered, false);
  assert.notStrictEqual(result.exitCode, 0);
  assert.strictEqual(fetchImpl.calls.length, 0, 'mismatched evidence must not POST');
  assert.strictEqual(fs.readFileSync(env.freezePath, 'utf8'), bytes, 'freeze must stay byte-identical');
});

test('recovery: unknown shipState stays permanently fail-closed', async () => {
  const env = makeEnv();
  const bytes = writeFreeze(env, knownFreeze({ shipState: 'unknown' }));
  writeSavedReport(env, shippedReport());
  const fetchImpl = okFetch();
  const result = await recoverFreeze({ ...env, fetchImpl, log: () => {} });
  assert.strictEqual(result.recovered, false);
  assert.notStrictEqual(result.exitCode, 0);
  assert.strictEqual(fetchImpl.calls.length, 0);
  assert.strictEqual(fs.readFileSync(env.freezePath, 'utf8'), bytes);
});

test('recovery: zero-shipped, missing, and malformed saved reports preserve the freeze', async () => {
  for (const setup of [
    (env) => writeSavedReport(env, report({ shipped: 0, candidates: [] })),
    () => { /* missing report */ },
    (env) => { fs.mkdirSync(env.stateDir, { recursive: true }); fs.writeFileSync(path.join(env.stateDir, 'last-run-report.json'), 'not-json{{{'); },
  ]) {
    const env = makeEnv();
    const bytes = writeFreeze(env, knownFreeze());
    setup(env);
    const fetchImpl = okFetch();
    const result = await recoverFreeze({ ...env, fetchImpl, log: () => {} });
    assert.strictEqual(result.recovered, false);
    assert.notStrictEqual(result.exitCode, 0);
    assert.strictEqual(fetchImpl.calls.length, 0, 'invalid evidence must not POST');
    assert.strictEqual(fs.readFileSync(env.freezePath, 'utf8'), bytes);
  }
});

test('recovery: malformed freeze JSON stays frozen without a POST', async () => {
  const env = makeEnv();
  const bytes = writeFreeze(env, 'not-json{{{');
  writeSavedReport(env, shippedReport());
  const fetchImpl = okFetch();
  const result = await recoverFreeze({ ...env, fetchImpl, log: () => {} });
  assert.strictEqual(result.recovered, false);
  assert.notStrictEqual(result.exitCode, 0);
  assert.strictEqual(fetchImpl.calls.length, 0);
  assert.strictEqual(fs.readFileSync(env.freezePath, 'utf8'), bytes);
});

test('recovery: failed POST preserves the freeze bytes', async () => {
  const env = makeEnv();
  const bytes = writeFreeze(env, knownFreeze());
  writeSavedReport(env, shippedReport());
  const result = await recoverFreeze({ ...env, fetchImpl: failFetch(), log: () => {} });
  assert.strictEqual(result.recovered, false);
  assert.notStrictEqual(result.exitCode, 0);
  assert.strictEqual(fs.readFileSync(env.freezePath, 'utf8'), bytes, 'no delivery proof means no deletion');
});

test('recovery: absent webhook configuration stays frozen', async () => {
  const env = makeEnv({ webhook: null });
  const bytes = writeFreeze(env, knownFreeze());
  writeSavedReport(env, shippedReport());
  const result = await recoverFreeze({ ...env, fetchImpl: okFetch(), log: () => {} });
  assert.strictEqual(result.recovered, false);
  assert.notStrictEqual(result.exitCode, 0);
  assert.strictEqual(fs.readFileSync(env.freezePath, 'utf8'), bytes);
});

test('recovery: strict legacy known-shipment freeze recovers against the matching saved report', async () => {
  const env = makeEnv();
  // Exact legacy shape written by the pre-recovery notifier: no runId/shipState fields.
  writeFreeze(env, {
    reason: 'shipped-and-unreported',
    detail: 'run run-20260718T112636Z shipped 1 candidate(s) but the Discord run report could not be delivered',
    at: '2026-07-18T11:30:00Z',
  });
  writeSavedReport(env, shippedReport({ runId: 'run-20260718T112636Z' }));
  const fetchImpl = okFetch();
  const result = await recoverFreeze({ ...env, fetchImpl, log: () => {} });
  assert.strictEqual(result.recovered, true);
  assert.strictEqual(result.exitCode, 0);
  assert.ok(!fs.existsSync(env.freezePath));
  assert.strictEqual(fetchImpl.calls.length, 1);
});

test('recovery: legacy unknown-shipment and free-form freezes never recover', async () => {
  for (const { detail, savedRunId } of [
    { detail: 'run run-x FAILED mid-session (ship state unknown) and the run report could not be delivered' },
    { detail: 'manually frozen by owner pending investigation' },
    { detail: 'run run-20260718T112636Z shipped 0 candidate(s) but the Discord run report could not be delivered' },
    // Placeholder / non-run tokens must not count as exact-run proof even
    // when the saved report echoes the exact same token (review P2: \S+
    // overreach — only the historical run-YYYYMMDDTHHMMSSZ shape may parse).
    { detail: 'run ? shipped 1 candidate(s) but the Discord run report could not be delivered', savedRunId: '?' },
    { detail: 'run foo/bar shipped 1 candidate(s) but the Discord run report could not be delivered', savedRunId: 'foo/bar' },
  ]) {
    const env = makeEnv();
    const bytes = writeFreeze(env, { reason: 'shipped-and-unreported', detail, at: '2026-07-18T11:30:00Z' });
    writeSavedReport(env, shippedReport({ runId: savedRunId || 'run-20260718T112636Z' }));
    const fetchImpl = okFetch();
    const result = await recoverFreeze({ ...env, fetchImpl, log: () => {} });
    assert.strictEqual(result.recovered, false, `must not recover legacy detail: ${detail}`);
    assert.notStrictEqual(result.exitCode, 0);
    assert.strictEqual(fetchImpl.calls.length, 0);
    assert.strictEqual(fs.readFileSync(env.freezePath, 'utf8'), bytes);
  }
});

test('recovery: a wrong reason field never recovers even with matching evidence', async () => {
  const env = makeEnv();
  const bytes = writeFreeze(env, knownFreeze({ reason: 'owner-hold' }));
  writeSavedReport(env, shippedReport());
  const fetchImpl = okFetch();
  const result = await recoverFreeze({ ...env, fetchImpl, log: () => {} });
  assert.strictEqual(result.recovered, false);
  assert.notStrictEqual(result.exitCode, 0);
  assert.strictEqual(fetchImpl.calls.length, 0);
  assert.strictEqual(fs.readFileSync(env.freezePath, 'utf8'), bytes);
});

test('recovery: never advances the monthly digest cursor even on a 1st-of-month report', async () => {
  const env = makeEnv();
  fs.writeFileSync(env.ledgerPath, `${JSON.stringify({ candidateKey: 'row_a', ownerResolution: 'auto-shipped' })}\n`);
  writeFreeze(env, knownFreeze({ runId: 'run-aug1' }));
  writeSavedReport(env, shippedReport({ runId: 'run-aug1', finishedAt: '2026-08-01T12:20:00Z' }));
  const result = await recoverFreeze({ ...env, fetchImpl: okFetch(), log: () => {} });
  assert.strictEqual(result.recovered, true);
  assert.ok(!fs.existsSync(path.join(env.stateDir, 'digest-state.json')),
    'recovery must not advance the digest cursor');
});

test('recovery: a structured freeze with missing or invalid schema fields never recovers', async () => {
  for (const mutate of [
    (f) => { delete f.shipped; },
    (f) => { f.shipped = 0; },
    (f) => { f.shipped = '1'; },
    (f) => { delete f.detail; },
    (f) => { delete f.at; },
  ]) {
    const env = makeEnv();
    const freeze = knownFreeze();
    mutate(freeze);
    const bytes = writeFreeze(env, freeze);
    writeSavedReport(env, shippedReport());
    const fetchImpl = okFetch();
    const result = await recoverFreeze({ ...env, fetchImpl, log: () => {} });
    assert.strictEqual(result.recovered, false, `must not recover freeze mutated by: ${mutate}`);
    assert.notStrictEqual(result.exitCode, 0);
    assert.strictEqual(fetchImpl.calls.length, 0);
    assert.strictEqual(fs.readFileSync(env.freezePath, 'utf8'), bytes);
  }
});

test('recovery: a freeze replaced during the POST is never deleted (TOCTOU guard)', async () => {
  const env = makeEnv();
  writeFreeze(env, knownFreeze());
  writeSavedReport(env, shippedReport());
  // Recovery runs before the wrapper lock, so a concurrent process can swap
  // the freeze mid-POST; the stale recovery must not delete the newcomer.
  const fetchImpl = async () => {
    writeFreeze(env, knownFreeze({ runId: 'run-newer', shipState: 'unknown' }));
    return { ok: true, status: 204, text: async () => '' };
  };
  const result = await recoverFreeze({ ...env, fetchImpl, log: () => {} });
  assert.strictEqual(result.recovered, false);
  assert.notStrictEqual(result.exitCode, 0);
  const survivor = JSON.parse(fs.readFileSync(env.freezePath, 'utf8'));
  assert.strictEqual(survivor.runId, 'run-newer', 'replacement freeze must survive a stale recovery');
});

test('recovery: does not create a new freeze while recovering', async () => {
  const env = makeEnv();
  writeFreeze(env, knownFreeze());
  writeSavedReport(env, shippedReport());
  await recoverFreeze({ ...env, fetchImpl: failFetch(), log: () => {} });
  const frozen = JSON.parse(fs.readFileSync(env.freezePath, 'utf8'));
  assert.strictEqual(frozen.runId, 'run-2026-07-15', 'original freeze must survive, not be replaced');
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
