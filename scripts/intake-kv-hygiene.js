#!/usr/bin/env node
// intake-kv-hygiene.js — runner-owned PRINTER_INTAKE KV cleanup
// (Intake Autonomy v2, Gate B3; spec §3.7 class policy).
//
// The Scout is contractually read-only against KV, so deletion is the
// RUNNER's job, via this script. Class policy (keyed on the LAST outcomes-
// ledger line per KV key — corrections win):
//   duplicate / declined-non-fdm  -> delete AFTER a 7-day contact window
//                                    (the raw KV record is the only requester
//                                    reply-to path; a dupe reply is exactly
//                                    the case that needs it)
//   unactionable                  -> delete immediately
//   parse-error                   -> delete once ledgered
//   incomplete                    -> left to its KV TTL
//   needs-research / staged / parked / shipped / unledgered -> NEVER deleted
// Key age comes from the `req:<epoch-ms>:` key name; malformed timestamps are
// kept conservatively. Non-`req:` keys are never touched.
//
// AUTH NOTE (B3 review #14): the preflight's KV delete-scope probe proves the
// AMBIENT wrangler credential — run --apply with ambient auth (no
// --use-config-token) so the proven credential is the acting one.
//
// CLI (DRY-RUN by default; --apply deletes via wrangler):
//   node scripts/intake-kv-hygiene.js [--apply] [--use-config-token]
//        [--keys-file keys.json] [--ledger path] [--now ms] [--wrangler-bin p]
// --keys-file (fixture input) is mutually exclusive with --apply.
// Machine-readable summary: "HYGIENE deletes=N kept=M applied=true|false".

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULT_LEDGER = path.join(__dirname, 'printer-intake-outcomes.jsonl');
const DEFAULT_CONFIG = path.join(__dirname, '.printer-intake.local.json');
// Mirrors printer-intake-scout.js:106-107 (not exported there).
const DEFAULT_ACCOUNT_ID = '038ac75563c82b3641d1626510938c1b';
const DEFAULT_NAMESPACE_ID = 'f3d89a4e70a34e3fab1c0f7676efebb5';

const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;

const NEVER_DELETE_OUTCOMES = new Set(['needs-research', 'incomplete']);
const CONTACT_WINDOW_OUTCOMES = new Set(['duplicate', 'declined-non-fdm']);
const IMMEDIATE_OUTCOMES = new Set(['unactionable', 'parse-error']);

// ownerResolution values that flag a Scout MISS on a REAL request — the
// correction line keeps the original (wrong) scoutOutcome, so classifying by
// scoutOutcome alone would delete exactly the requester record the owner
// flagged as mis-handled. was-noise / was-duplicate-missed CONFIRM the record
// is deletable and are deliberately absent here.
const CORRECTION_KEEP_RESOLUTIONS = new Set(['was-mis-declined', 'was-brand-typo', 'was-suffix-variant']);

function normalizeKeys(candidateKey) {
  if (Array.isArray(candidateKey)) return candidateKey.filter((k) => typeof k === 'string');
  if (typeof candidateKey === 'string') return [candidateKey];
  return [];
}

function readLedgerLines(ledgerPath) {
  let raw;
  try { raw = fs.readFileSync(ledgerPath, 'utf8'); } catch (_) { return []; }
  return raw.split('\n').filter((l) => l.trim().length > 0);
}

/**
 * Pure class-policy evaluation. Later ledger lines override earlier ones for
 * the same KV key (owner corrections are appended lines — PD7).
 * @returns {{deletes: [{key, reason}], kept: [{key, reason}]}}
 */
function computeDeleteSet({ keys, ledgerLines, nowMs }) {
  const outcomeByKey = new Map();
  for (const line of ledgerLines) {
    let entry;
    try { entry = JSON.parse(line); } catch (_) { continue; }
    if (!entry || entry._schema) continue; // marker lines
    for (const k of normalizeKeys(entry.candidateKey)) {
      outcomeByKey.set(k, entry); // last line wins
    }
  }

  const deletes = [];
  const kept = [];
  for (const key of keys) {
    if (!key.startsWith('req:')) continue; // never touch non-request keys

    const entry = outcomeByKey.get(key);
    if (!entry) {
      kept.push({ key, reason: 'unledgered — pending work, not hygiene’s to delete' });
      continue;
    }

    if (CORRECTION_KEEP_RESOLUTIONS.has(entry.ownerResolution)) {
      kept.push({ key, reason: `owner correction (${entry.ownerResolution}) — kept for reprocessing/contact` });
      continue;
    }

    // Shipped candidates (scoutOutcome usually needs-research) get the same
    // 7-day contact window, then delete — otherwise the watermark-less Scout
    // re-stages the shipped request daily until the 90-day TTL (B4 review #14).
    if (entry.ownerResolution === 'shipped' || entry.ownerResolution === 'auto-shipped') {
      const tsPart = key.split(':')[1];
      let ts = /^\d+$/.test(tsPart || '') ? Number(tsPart) : NaN;
      if (!Number.isFinite(ts)) {
        kept.push({ key, reason: 'unparseable key timestamp — kept conservatively' });
        continue;
      }
      const ledgeredAt = Date.parse(entry.ledgeredAt || '');
      if (Number.isFinite(ledgeredAt)) ts = Math.max(ts, ledgeredAt);
      if (nowMs - ts > SEVEN_DAYS_MS) {
        deletes.push({ key, reason: `${entry.ownerResolution}, contact window (7d) elapsed` });
      } else {
        kept.push({ key, reason: `${entry.ownerResolution}, inside 7-day contact window` });
      }
      continue;
    }

    const outcome = entry.scoutOutcome;
    if (NEVER_DELETE_OUTCOMES.has(outcome)) {
      kept.push({ key, reason: outcome === 'incomplete' ? 'incomplete — left to KV TTL' : `${outcome} — staged/parked/shipped lane, never deleted by hygiene` });
      continue;
    }
    if (IMMEDIATE_OUTCOMES.has(outcome)) {
      deletes.push({ key, reason: outcome === 'parse-error' ? 'parse-error, ledgered once' : 'unactionable' });
      continue;
    }
    if (CONTACT_WINDOW_OUTCOMES.has(outcome)) {
      const tsPart = key.split(':')[1];
      let ts = /^\d+$/.test(tsPart || '') ? Number(tsPart) : NaN;
      if (!Number.isFinite(ts)) {
        kept.push({ key, reason: 'unparseable key timestamp — kept conservatively' });
        continue;
      }
      // Window base = max(key creation, ledger time when present): a backlog
      // ledgered late (e.g. after a freeze) still gets its full 7-day contact
      // window. B4's runner writes ledgeredAt; older lines lack it.
      const ledgeredAt = Date.parse(entry.ledgeredAt || '');
      if (Number.isFinite(ledgeredAt)) ts = Math.max(ts, ledgeredAt);
      if (nowMs - ts > SEVEN_DAYS_MS) {
        deletes.push({ key, reason: `${outcome}, contact window (7d) elapsed` });
      } else {
        kept.push({ key, reason: `${outcome}, inside 7-day contact window` });
      }
      continue;
    }
    // Unknown outcome vocabulary: conservative keep.
    kept.push({ key, reason: `unknown scoutOutcome '${outcome}' — kept conservatively` });
  }

  return { deletes, kept };
}

// ─── wrangler plumbing (mirrors printer-intake-scout.js loadConfig/runWrangler) ─
function loadConfig(configPath = DEFAULT_CONFIG) {
  let fileCfg = {};
  try { fileCfg = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (_) { /* optional */ }
  return {
    token: process.env.CF_API_TOKEN || fileCfg.cfApiToken || fileCfg.token || null,
    accountId: process.env.CF_ACCOUNT_ID || fileCfg.accountId || DEFAULT_ACCOUNT_ID,
    namespaceId: process.env.CF_KV_NAMESPACE_ID || fileCfg.namespaceId || DEFAULT_NAMESPACE_ID,
  };
}

function runWrangler(args, cfg, opts = {}) {
  const env = Object.assign({}, process.env, { CLOUDFLARE_ACCOUNT_ID: cfg.accountId });
  if (opts.useConfigToken && cfg.token) env.CLOUDFLARE_API_TOKEN = cfg.token;
  if (opts.wranglerBin) return execFileSync(opts.wranglerBin, args, { env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return execFileSync('npx', ['wrangler', ...args], { env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function listLiveKeys(cfg, opts) {
  const out = runWrangler(['kv', 'key', 'list', '--remote', '--namespace-id', cfg.namespaceId], cfg, opts);
  return JSON.parse(out).map((k) => k.name);
}

function deleteLiveKey(key, cfg, opts) {
  runWrangler(['kv', 'key', 'delete', '--remote', '--namespace-id', cfg.namespaceId, key], cfg, opts);
}

module.exports = { computeDeleteSet, SEVEN_DAYS_MS, loadConfig };

if (require.main === module) {
  const args = process.argv.slice(2);
  const opts = { apply: false };
  try {
    for (let i = 0; i < args.length; i += 1) {
      const take = () => {
        i += 1;
        if (i >= args.length) throw new Error(`missing value for ${args[i - 1]}`);
        return args[i];
      };
      switch (args[i]) {
        case '--apply': opts.apply = true; break;
        case '--use-config-token': opts.useConfigToken = true; break;
        case '--keys-file': opts.keysFile = take(); break;
        case '--ledger': opts.ledger = take(); break;
        case '--now': opts.now = Number(take()); break;
        case '--wrangler-bin': opts.wranglerBin = take(); break;
        case '--config': opts.config = take(); break;
        default: throw new Error(`unknown argument: ${args[i]}`);
      }
    }
    if (opts.apply && opts.keysFile) {
      throw new Error('--apply is not allowed with --keys-file (fixture input must stay a dry-run)');
    }
    if (opts.now !== undefined && !Number.isFinite(opts.now)) throw new Error('--now must be epoch millis');
  } catch (error) {
    console.error(`[intake-kv-hygiene] ${error.message}`);
    process.exit(1);
  }

  (async () => {
    const cfg = loadConfig(opts.config);
    let keys;
    if (opts.keysFile) {
      keys = JSON.parse(fs.readFileSync(opts.keysFile, 'utf8'));
    } else {
      keys = listLiveKeys(cfg, opts);
    }
    const ledgerLines = readLedgerLines(opts.ledger || DEFAULT_LEDGER);
    const nowMs = opts.now !== undefined ? opts.now : Date.now();

    const { deletes, kept } = computeDeleteSet({ keys, ledgerLines, nowMs });

    for (const d of deletes) console.log(`[intake-kv-hygiene] DELETE ${d.key} — ${d.reason}${opts.apply ? '' : ' (dry-run)'}`);
    for (const k of kept) console.log(`[intake-kv-hygiene] keep   ${k.key} — ${k.reason}`);

    if (opts.apply) {
      for (const d of deletes) deleteLiveKey(d.key, cfg, opts);
    }
    console.log(`[intake-kv-hygiene] HYGIENE deletes=${deletes.length} kept=${kept.length} applied=${opts.apply}`);
  })().catch((error) => {
    console.error(`[intake-kv-hygiene] ${error.message}`);
    process.exit(2);
  });
}
