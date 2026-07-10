#!/usr/bin/env node
// verify-live-overlay.js — PD3/PD6 read-side live overlay verification
// (Intake Autonomy v2, Gate B2).
//
// Fetches the LIVE deployed overlay and asserts the FULL envelope equals the
// committed file: schema_version, content_version, enabled, min_app_version,
// payload_sha256, AND a payload hash RECOMPUTED from the fetched body — the
// stored hash covers payload only, so version+hash alone would pass a live
// overlay flipped to enabled:false or a wrong min_app_version (Codex MF-1;
// iOS treats enabled:false as bundled-only, PrinterCatalogProvider.swift:122).
//
// Ship-path mode requires enabled:true (in the committed file too — verifying
// a disabled overlay on the ship path is a usage error). The PD8 emergency-stop
// verification is the explicit --expect-disabled mode.
//
// CLI:
//   node scripts/verify-live-overlay.js [--measure] [--expect-disabled]
//        [--retries N] [--interval SECONDS] [--url U] [--overlay PATH]
// NOTE: --retries N = N TOTAL ATTEMPTS (including the first), not N re-tries.
// Exit codes: 0 match / 2 mismatch observed / 3 never fetched successfully / 1 usage.
// Classification is deterministic, not last-attempt-wins: if ANY successful
// fetch observed a mismatch, the result is 2 (with the mismatch evidence) even
// when a later attempt hit a transient network blip — the PD6 rollback branch
// must never lose a real mismatch to a blip on the final poll.
//
// --measure polls until the live values equal the committed ones and prints a
// machine-readable line: "MEASURE elapsed_seconds=N attempts=K version=V"
// (B5 deploy-latency measurement consumes this).

const fs = require('fs');
const path = require('path');
const { stableStringify, sha256 } = require('./validate-ios-printer-overlay.js');

const root = path.resolve(__dirname, '..');
const DEFAULT_URL = 'https://3dprintassistant.com/catalog/ios-printer-overlay-v1.json';
const DEFAULT_OVERLAY = path.join(root, 'catalog', 'ios-printer-overlay-v1.json');
const CONFIG_PATH = path.join(__dirname, 'intake-runner.config.json');

// Conservative until B5's measured calibration lands in the config.
const FALLBACK = { retries: 10, intervalSeconds: 30 };

function resolveRetryDefaults(configPath = CONFIG_PATH) {
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const lv = cfg.liveVerify || {};
    if (Number.isInteger(lv.retries) && lv.retries > 0
      && Number.isFinite(lv.intervalSeconds) && lv.intervalSeconds >= 0) {
      return { retries: lv.retries, intervalSeconds: lv.intervalSeconds };
    }
  } catch (_) { /* missing/unreadable config -> fallback */ }
  return { ...FALLBACK };
}

function compareEnvelope(committed, live) {
  const mismatches = [];
  for (const key of ['schema_version', 'content_version', 'enabled', 'min_app_version', 'payload_sha256']) {
    if (live[key] !== committed[key]) {
      mismatches.push(`${key}: live=${JSON.stringify(live[key])} committed=${JSON.stringify(committed[key])}`);
    }
  }
  const recomputed = live.payload === undefined ? '(no payload)' : sha256(stableStringify(live.payload));
  if (recomputed !== committed.payload_sha256) {
    mismatches.push(`payload hash recomputed from fetched body=${recomputed} != committed payload_sha256=${committed.payload_sha256}`);
  }
  return mismatches;
}

async function verifyLiveOverlay(opts = {}) {
  const defaults = resolveRetryDefaults(opts.configPath);
  const {
    url = DEFAULT_URL,
    overlayPath = DEFAULT_OVERLAY,
    retries = defaults.retries,
    intervalSeconds = defaults.intervalSeconds,
    expectDisabled = false,
    measure = false,
    fetchImpl = global.fetch,
    sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); }),
    log = () => {},
  } = opts;

  const committed = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));

  // The committed file must be internally consistent, or the compare below
  // degrades to declared-hash-vs-declared-hash and a stale live server can
  // false-PASS against a hand-edited committed payload. Usage error: retrying
  // can't fix a bad committed file.
  const committedRecomputed = sha256(stableStringify(committed.payload));
  if (committedRecomputed !== committed.payload_sha256) {
    throw new Error(`committed overlay is internally inconsistent: payload_sha256=${committed.payload_sha256} but recomputed=${committedRecomputed} — fix the committed file first`);
  }

  // Mode/enabled coherence is a USAGE error, not a live mismatch: the caller
  // is verifying the wrong thing, retrying will never fix it.
  if (!expectDisabled && committed.enabled !== true) {
    throw new Error('committed overlay has enabled:false — ship-path verify requires enabled:true (use --expect-disabled for the PD8 emergency-stop check)');
  }
  if (expectDisabled && committed.enabled !== false) {
    throw new Error('--expect-disabled given but the committed overlay has enabled:true — nothing to verify');
  }

  const startedAt = Date.now();
  let lastMismatches = [];
  let lastFetchError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    if (attempt > 1) await sleep(intervalSeconds * 1000);
    let live;
    try {
      const res = await fetchImpl(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      live = await res.json();
      if (live === null || typeof live !== 'object') {
        throw new Error(`live body is not a JSON object (${JSON.stringify(live)})`);
      }
      lastFetchError = null;
    } catch (error) {
      lastFetchError = error;
      log(`attempt ${attempt}/${retries}: fetch error: ${error.message}`);
      continue;
    }

    const mismatches = compareEnvelope(committed, live);
    if (mismatches.length === 0) {
      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      const measureLine = `MEASURE elapsed_seconds=${elapsedSeconds} attempts=${attempt} version=${committed.content_version}`;
      if (measure) log(measureLine);
      return { ok: true, attempts: attempt, elapsedSeconds, measureLine, exitCode: 0 };
    }
    lastMismatches = mismatches;
    log(`attempt ${attempt}/${retries}: ${mismatches.length} mismatch(es): ${mismatches.join('; ')}`);
  }

  // Deterministic classification: any observed mismatch wins over a trailing
  // transient fetch error; 3 is reserved for "no attempt ever fetched".
  if (lastMismatches.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      attempts: retries,
      mismatches: lastMismatches,
      fetchError: lastFetchError ? lastFetchError.message : undefined,
    };
  }
  return { ok: false, exitCode: 3, attempts: retries, mismatches: [], fetchError: lastFetchError.message };
}

module.exports = { verifyLiveOverlay, resolveRetryDefaults, compareEnvelope };

if (require.main === module) {
  const args = process.argv.slice(2);
  const opts = { log: (line) => console.log(`[verify-live-overlay] ${line}`) };
  try {
    for (let i = 0; i < args.length; i += 1) {
      const take = () => {
        i += 1;
        if (i >= args.length) throw new Error(`missing value for ${args[i - 1]}`);
        return args[i];
      };
      switch (args[i]) {
        case '--measure': opts.measure = true; break;
        case '--expect-disabled': opts.expectDisabled = true; break;
        case '--retries': opts.retries = Number(take()); break;
        case '--interval': opts.intervalSeconds = Number(take()); break;
        case '--url': opts.url = take(); break;
        case '--overlay': opts.overlayPath = take(); break;
        default: throw new Error(`unknown argument: ${args[i]}`);
      }
    }
    if (opts.retries !== undefined && (!Number.isInteger(opts.retries) || opts.retries < 1)) {
      throw new Error('--retries must be a positive integer');
    }
    if (opts.intervalSeconds !== undefined && (!Number.isFinite(opts.intervalSeconds) || opts.intervalSeconds < 0)) {
      throw new Error('--interval must be a non-negative number of seconds');
    }
  } catch (error) {
    console.error(`[verify-live-overlay] ${error.message}`);
    process.exit(1);
  }

  verifyLiveOverlay(opts)
    .then((result) => {
      if (result.ok) {
        console.log(`[verify-live-overlay] OK: live matches committed (attempts=${result.attempts}, elapsed=${result.elapsedSeconds}s)`);
        process.exit(0);
      }
      if (result.exitCode === 3) {
        console.error(`[verify-live-overlay] FETCH-ERROR after ${result.attempts} attempts: ${result.fetchError}`);
      } else {
        console.error(`[verify-live-overlay] MISMATCH after ${result.attempts} attempts: ${result.mismatches.join('; ')}`);
      }
      process.exit(result.exitCode);
    })
    .catch((error) => {
      console.error(`[verify-live-overlay] ${error.message}`);
      process.exit(1);
    });
}
