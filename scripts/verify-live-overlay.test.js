#!/usr/bin/env node
// Tests for verify-live-overlay.js (Intake Autonomy v2, Gate B2).
// All fetches mocked via the injected fetchImpl; sleep injected (no real
// waits). Run: node --test scripts/verify-live-overlay.test.js

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { verifyLiveOverlay } = require('./verify-live-overlay.js');
const { stableStringify, sha256 } = require('./validate-ios-printer-overlay.js');

// Synthetic representative overlay — deliberately NOT the real catalog file:
// PD8 legitimately flips the committed file to enabled:false, and this suite
// must stay green during exactly that emergency (review finding 5).
const basePayload = {
  brands: [{ id: 'fix_brand', name: 'Fixture Brand', sort_order: 1, primary: false, default_slicer: 'orcaslicer' }],
  printers: [{ id: 'fix_printer', name: 'Fixture Printer', manufacturer: 'fix_brand', series: 'corexy', series_group: 'Fixture Series', enclosure: 'none', extruder_type: 'direct_drive', max_nozzle_temp: 300, max_bed_temp: 100, max_speed: 500, max_acceleration: 10000, available_nozzle_sizes: [0.4] }],
};
const liveOverlay = {
  schema_version: 1,
  content_version: 2026071005,
  enabled: true,
  generated_at: '2026-07-10T00:00:00.000Z',
  min_app_version: '1.0.3',
  payload: basePayload,
  payload_sha256: sha256(stableStringify(basePayload)),
};

function writeFixtureOverlay(overlay) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-overlay-'));
  const p = path.join(dir, 'overlay.json');
  fs.writeFileSync(p, `${JSON.stringify(overlay, null, 2)}\n`);
  return p;
}

function fetchReturning(bodies) {
  // bodies: array of {status, json} consumed per call; last repeats.
  let calls = 0;
  const impl = async () => {
    const body = bodies[Math.min(calls, bodies.length - 1)];
    calls += 1;
    if (body.throw) throw new Error('network down');
    return {
      ok: body.status === 200,
      status: body.status,
      json: async () => body.json,
      text: async () => JSON.stringify(body.json),
    };
  };
  impl.calls = () => calls;
  return impl;
}

const noSleep = async () => {};

test('match: identical live envelope returns ok on first attempt', async () => {
  const overlayPath = writeFixtureOverlay(liveOverlay);
  const result = await verifyLiveOverlay({
    overlayPath,
    fetchImpl: fetchReturning([{ status: 200, json: liveOverlay }]),
    sleep: noSleep,
    retries: 3,
    intervalSeconds: 0,
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.attempts, 1);
});

test('FULL envelope: live enabled:false fails ship-path verify even with matching version+hash (Codex MF-1)', async () => {
  const overlayPath = writeFixtureOverlay(liveOverlay);
  const disabledLive = { ...liveOverlay, enabled: false };
  const result = await verifyLiveOverlay({
    overlayPath,
    fetchImpl: fetchReturning([{ status: 200, json: disabledLive }]),
    sleep: noSleep,
    retries: 2,
    intervalSeconds: 0,
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.exitCode, 2);
  assert.ok(result.mismatches.some((m) => m.includes('enabled')), result.mismatches.join('; '));
});

test('FULL envelope: wrong live min_app_version fails', async () => {
  const overlayPath = writeFixtureOverlay(liveOverlay);
  const wrong = { ...liveOverlay, min_app_version: '9.9.9' };
  const result = await verifyLiveOverlay({
    overlayPath,
    fetchImpl: fetchReturning([{ status: 200, json: wrong }]),
    sleep: noSleep,
    retries: 1,
    intervalSeconds: 0,
  });
  assert.strictEqual(result.ok, false);
  assert.ok(result.mismatches.some((m) => m.includes('min_app_version')));
});

test('payload hash is RECOMPUTED from the fetched body, not trusted from the declared field', async () => {
  const overlayPath = writeFixtureOverlay(liveOverlay);
  // Live lies: declared hash matches committed, but the actual payload differs.
  const tampered = JSON.parse(JSON.stringify(liveOverlay));
  tampered.payload.printers[0].name = 'Tampered Fixture Printer';
  // keep declared payload_sha256 identical to the committed one
  const result = await verifyLiveOverlay({
    overlayPath,
    fetchImpl: fetchReturning([{ status: 200, json: tampered }]),
    sleep: noSleep,
    retries: 1,
    intervalSeconds: 0,
  });
  assert.strictEqual(result.ok, false);
  assert.ok(result.mismatches.some((m) => m.includes('recomputed')), result.mismatches.join('; '));
});

test('ship-path refuses to verify against a committed enabled:false file without --expect-disabled', async () => {
  const disabledCommitted = { ...liveOverlay, enabled: false };
  const overlayPath = writeFixtureOverlay(disabledCommitted);
  await assert.rejects(
    () => verifyLiveOverlay({
      overlayPath,
      fetchImpl: fetchReturning([{ status: 200, json: disabledCommitted }]),
      sleep: noSleep,
      retries: 1,
      intervalSeconds: 0,
    }),
    /expect-disabled/,
  );
});

test('--expect-disabled: PD8 emergency-stop verification passes on enabled:false', async () => {
  const disabled = { ...liveOverlay, enabled: false };
  const overlayPath = writeFixtureOverlay(disabled);
  const result = await verifyLiveOverlay({
    overlayPath,
    expectDisabled: true,
    fetchImpl: fetchReturning([{ status: 200, json: disabled }]),
    sleep: noSleep,
    retries: 1,
    intervalSeconds: 0,
  });
  assert.strictEqual(result.ok, true);
});

test('--expect-disabled with an enabled committed file is a usage error', async () => {
  const overlayPath = writeFixtureOverlay(liveOverlay);
  await assert.rejects(
    () => verifyLiveOverlay({
      overlayPath,
      expectDisabled: true,
      fetchImpl: fetchReturning([{ status: 200, json: liveOverlay }]),
      sleep: noSleep,
      retries: 1,
      intervalSeconds: 0,
    }),
    /enabled/,
  );
});

test('measure mode: polls until the live values flip, reports elapsed + attempts', async () => {
  const overlayPath = writeFixtureOverlay(liveOverlay);
  const stale = { ...liveOverlay, content_version: liveOverlay.content_version - 1 };
  const fetchImpl = fetchReturning([
    { status: 200, json: stale },
    { status: 200, json: stale },
    { status: 200, json: liveOverlay },
  ]);
  const result = await verifyLiveOverlay({
    overlayPath,
    measure: true,
    fetchImpl,
    sleep: noSleep,
    retries: 10,
    intervalSeconds: 1,
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.attempts, 3);
  assert.ok(typeof result.elapsedSeconds === 'number');
  assert.match(result.measureLine, /MEASURE elapsed_seconds=\d+(\.\d+)? attempts=3 version=\d+/);
});

test('mismatch persists through the whole retry budget -> exit 2, attempts == retries', async () => {
  const overlayPath = writeFixtureOverlay(liveOverlay);
  const stale = { ...liveOverlay, content_version: liveOverlay.content_version - 1 };
  const fetchImpl = fetchReturning([{ status: 200, json: stale }]);
  const result = await verifyLiveOverlay({
    overlayPath,
    fetchImpl,
    sleep: noSleep,
    retries: 4,
    intervalSeconds: 0,
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.exitCode, 2);
  assert.strictEqual(fetchImpl.calls(), 4, 'retry budget must be bounded');
});

test('exit 3 is reserved for "never fetched successfully"', async () => {
  const overlayPath = writeFixtureOverlay(liveOverlay);
  const result = await verifyLiveOverlay({
    overlayPath,
    fetchImpl: fetchReturning([{ throw: true }]),
    sleep: noSleep,
    retries: 3,
    intervalSeconds: 0,
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.exitCode, 3);
});

test('observed mismatch + trailing fetch blip -> exit 2 with mismatch evidence (never 3)', async () => {
  const overlayPath = writeFixtureOverlay(liveOverlay);
  const stale = { ...liveOverlay, content_version: liveOverlay.content_version - 1 };
  const result = await verifyLiveOverlay({
    overlayPath,
    fetchImpl: fetchReturning([{ status: 200, json: stale }, { throw: true }]),
    sleep: noSleep,
    retries: 2,
    intervalSeconds: 0,
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.exitCode, 2, 'a real mismatch must never be masked by a trailing network blip');
  assert.ok(result.mismatches.length > 0, 'mismatch evidence must be preserved');
});

test('internally inconsistent committed file (hand-edited payload) is a usage error, never a false PASS', async () => {
  const broken = JSON.parse(JSON.stringify(liveOverlay));
  broken.payload.printers[0].max_speed = 501; // payload edited, hash not recomputed
  const overlayPath = writeFixtureOverlay(broken);
  await assert.rejects(
    () => verifyLiveOverlay({
      overlayPath,
      fetchImpl: fetchReturning([{ status: 200, json: liveOverlay }]),
      sleep: noSleep,
      retries: 1,
      intervalSeconds: 0,
    }),
    /internally inconsistent/,
  );
});

test('live body null (valid JSON, not an object) classifies as fetch-side, not a crash', async () => {
  const overlayPath = writeFixtureOverlay(liveOverlay);
  const result = await verifyLiveOverlay({
    overlayPath,
    fetchImpl: fetchReturning([{ status: 200, json: null }]),
    sleep: noSleep,
    retries: 2,
    intervalSeconds: 0,
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.exitCode, 3);
});

test('transient fetch error then a match -> ok (bounded retry rides out blips)', async () => {
  const overlayPath = writeFixtureOverlay(liveOverlay);
  const result = await verifyLiveOverlay({
    overlayPath,
    fetchImpl: fetchReturning([{ throw: true }, { status: 200, json: liveOverlay }]),
    sleep: noSleep,
    retries: 3,
    intervalSeconds: 0,
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.attempts, 2);
});

test('defaults: retries/interval read from intake-runner.config.json when present, else 10x30', () => {
  const { resolveRetryDefaults } = require('./verify-live-overlay.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-cfg-'));
  const cfgPath = path.join(dir, 'cfg.json');
  fs.writeFileSync(cfgPath, JSON.stringify({ liveVerify: { retries: 7, intervalSeconds: 5, calibrated: true } }));
  assert.deepStrictEqual(resolveRetryDefaults(cfgPath), { retries: 7, intervalSeconds: 5 });
  assert.deepStrictEqual(resolveRetryDefaults(path.join(dir, 'missing.json')), { retries: 10, intervalSeconds: 30 });
});
