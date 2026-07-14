#!/usr/bin/env node
// intake-notify.js — run-report notifier (Intake Autonomy v2, Gate B3; spec §3.7).
//
// Input: a run-report JSON (produced by the runner contract, or --failure for
// wrapper-level failures). Behavior:
//   - ALWAYS writes the markdown report to <state-dir>/last-run-report.md
//     (state dir default: scripts/.intake-runner-state/ — deliberately NOT the
//     Scout-test-wiped .printer-intake-out/; see gate ledger B1 row).
//   - POSTs to the Discord webhook from scripts/.printer-intake.local.json
//     key `discordWebhookUrl`. The URL is NEVER printed/logged — logs say
//     "webhook: set(len=N)" / "webhook: not-configured" only.
//   - Shipped-and-unreported freeze rule (PD8): if the report contains a
//     shipped candidate AND the webhook POST failed (or no webhook is
//     configured), create scripts/.intake-autonomy-freeze and exit non-zero.
//     Shipped-silently is the one state never allowed.
//   - Monthly digest (spec §8 risk 5): when the run date is the 1st, append a
//     digest of the outcomes ledger's `auto-shipped` rows since the last
//     digest (offset tracked in <state-dir>/digest-state.json; the ledger is
//     append-only, so a line offset is a stable cursor).
//
// CLI:
//   node scripts/intake-notify.js <report.json>
//   node scripts/intake-notify.js --failure "<stage>: <detail>"
// Machine-readable summary: "NOTIFY posted=… shipped=… frozen=… digest=…".

const fs = require('fs');
const path = require('path');

const DEFAULT_STATE_DIR = path.join(__dirname, '.intake-runner-state');
const DEFAULT_CONFIG = path.join(__dirname, '.printer-intake.local.json');
const DEFAULT_LEDGER = path.join(__dirname, 'printer-intake-outcomes.jsonl');
const DEFAULT_FREEZE = path.join(__dirname, '.intake-autonomy-freeze');
const DISCORD_CONTENT_CAP = 2000;

function readWebhookUrl(configPath) {
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (typeof cfg.discordWebhookUrl === 'string' && cfg.discordWebhookUrl.startsWith('https://')) {
      return cfg.discordWebhookUrl;
    }
  } catch (_) { /* not configured */ }
  return null;
}

// Outcome vocabulary pinned to the runner contract's ship outcomes — a regex
// here would false-positive on hypothetical park reasons containing "shipped".
const SHIP_OUTCOMES = new Set(['shipped', 'auto-shipped']);
const ERROR_OUTCOMES = new Set(['error', 'errored', 'failed']);

function normalizeTerminalReport(report, now = () => new Date()) {
  const candidates = Array.isArray(report.candidates) ? report.candidates : [];
  const normalized = { ...report, candidates };

  if (typeof normalized.finishedAt !== 'string'
      || Number.isNaN(Date.parse(normalized.finishedAt))) {
    normalized.finishedAt = now().toISOString();
  }

  // Per-candidate outcomes are the terminal source of truth. When present,
  // derive the headline counts instead of trusting LLM-authored aggregates;
  // wrapper-level failure reports intentionally have no candidates and retain
  // their explicit errored/shippedUnknown counters.
  if (candidates.length > 0) {
    normalized.shipped = candidates.filter((c) => SHIP_OUTCOMES.has(c.outcome)).length;
    normalized.parked = candidates.filter((c) => c.outcome === 'parked'
      || (typeof c.outcome === 'string' && c.outcome.startsWith('auto-parked:'))).length;
    normalized.errored = candidates.filter((c) => ERROR_OUTCOMES.has(c.outcome)).length;
  }

  return normalized;
}

function shippedCount(report) {
  if (Number.isInteger(report.shipped) && report.shipped > 0) return report.shipped;
  return (report.candidates || []).filter((c) => SHIP_OUTCOMES.has(c.outcome)).length;
}

function renderMarkdown(report, digestRows) {
  const lines = [];
  lines.push(`# 3dpa intake run — ${report.runId || 'unknown run'}`);
  lines.push('');
  if (report.failed) {
    lines.push(`**RUN FAILED** at stage: ${report.stage || 'unknown'}`);
    lines.push(`Detail: ${report.detail || '(none)'}`);
  }
  lines.push(`- started: ${report.startedAt || '?'} · finished: ${report.finishedAt || '?'}`);
  lines.push(`- shipped: ${report.shipped || 0} · parked: ${report.parked || 0} · errored: ${report.errored || 0}`);
  if (report.liveVerify) lines.push(`- live verify: ${report.liveVerify}`);
  lines.push('');
  for (const c of report.candidates || []) {
    lines.push(`- **${c.id}** → ${c.outcome}${c.detail ? ` — ${c.detail}` : ''}${c.commits ? ` (${c.commits})` : ''}`);
  }
  for (const n of report.notes || []) lines.push(`- note: ${n}`);
  if (digestRows) {
    lines.push('');
    lines.push('## Monthly digest — auto-shipped since last digest');
    if (digestRows.length === 0) lines.push('- (none)');
    for (const row of digestRows) {
      const key = Array.isArray(row.candidateKey) ? row.candidateKey.join(', ') : row.candidateKey;
      lines.push(`- ${key} (run ${row.runId || '?'})`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function collectDigest(ledgerPath, stateDir, runDateIso) {
  const day = new Date(runDateIso || Date.now()).getUTCDate();
  if (day !== 1) return { digestRows: null, commit: () => {} };

  let lines = [];
  try {
    lines = fs.readFileSync(ledgerPath, 'utf8').split('\n').filter((l) => l.trim().length > 0);
  } catch (_) { /* no ledger yet */ }

  const statePath = path.join(stateDir, 'digest-state.json');
  let offset = 0;
  try { offset = JSON.parse(fs.readFileSync(statePath, 'utf8')).ledgerLineOffset || 0; } catch (_) { /* first digest */ }

  const digestRows = [];
  for (const line of lines.slice(offset)) {
    let entry;
    try { entry = JSON.parse(line); } catch (_) { continue; }
    if (entry && !entry._schema && entry.ownerResolution === 'auto-shipped') digestRows.push(entry);
  }
  const commit = () => {
    fs.writeFileSync(statePath, `${JSON.stringify({ ledgerLineOffset: lines.length, at: new Date().toISOString() }, null, 2)}\n`);
  };
  return { digestRows, commit };
}

/**
 * @returns {Promise<{posted: boolean, frozen: boolean, digest: boolean, exitCode: number}>}
 */
async function notify(report, opts = {}) {
  const {
    stateDir = DEFAULT_STATE_DIR,
    configPath = DEFAULT_CONFIG,
    ledgerPath = DEFAULT_LEDGER,
    freezePath = DEFAULT_FREEZE,
    fetchImpl = global.fetch,
    now = () => new Date(),
    log = (line) => console.log(`[intake-notify] ${line}`),
  } = opts;

  fs.mkdirSync(stateDir, { recursive: true });

  const terminalReport = normalizeTerminalReport(report, now);
  const { digestRows, commit: commitDigest } = collectDigest(ledgerPath, stateDir, terminalReport.finishedAt);
  const markdown = renderMarkdown(terminalReport, digestRows);

  // The local report file is unconditional — the one place a run's outcome
  // can always be read, webhook or not.
  fs.writeFileSync(path.join(stateDir, 'last-run-report.md'), markdown);

  const webhookUrl = readWebhookUrl(configPath);
  log(webhookUrl ? `webhook: set(len=${webhookUrl.length})` : 'webhook: not-configured');

  let posted = false;
  if (webhookUrl) {
    let content = markdown;
    if (content.length > DISCORD_CONTENT_CAP) {
      const suffix = '\n… (truncated — full report in last-run-report.md)';
      let head = content.slice(0, DISCORD_CONTENT_CAP - suffix.length);
      // Never split a surrogate pair at the cap boundary.
      const lastCode = head.charCodeAt(head.length - 1);
      if (lastCode >= 0xD800 && lastCode <= 0xDBFF) head = head.slice(0, -1);
      content = head + suffix;
    }
    try {
      const res = await fetchImpl(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // allowed_mentions: candidate ids/details originate in requester
        // input — an "@everyone" in a request must never ping the channel.
        body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
      });
      if (!res.ok) throw new Error(`webhook HTTP ${res.status}`);
      posted = true;
    } catch (error) {
      log(`webhook POST failed: ${error.message}`);
    }
  }

  // shippedUnknown (wrapper --shipped-unknown): a crashed runner session MAY
  // have shipped before dying — fail-closed, treat as shipped for the freeze
  // rule (over-freeze beats a PD8 bypass).
  const shipped = shippedCount(terminalReport);
  const mayHaveShipped = shipped > 0 || terminalReport.shippedUnknown === true;
  let frozen = false;
  if (mayHaveShipped && !posted) {
    // Shipped-and-unreported is the one silent state never allowed (PD8).
    fs.writeFileSync(freezePath, `${JSON.stringify({
      reason: 'shipped-and-unreported',
      detail: terminalReport.shippedUnknown
        ? `run ${terminalReport.runId || '?'} FAILED mid-session (ship state unknown) and the run report could not be delivered`
        : `run ${terminalReport.runId || '?'} shipped ${shipped} candidate(s) but the Discord run report could not be delivered`,
      at: new Date().toISOString(),
    }, null, 2)}\n`);
    frozen = true;
    log('FREEZE created: shipped-and-unreported');
  }

  // Advance the digest cursor only when the digest actually reached Discord —
  // a failed-post 1st-of-month re-digests next month (idempotent, no rows lost).
  if (digestRows !== null && posted) commitDigest();

  const digest = digestRows !== null;
  const exitCode = frozen ? 4 : 0;
  log(`NOTIFY posted=${posted} shipped=${shipped} frozen=${frozen} digest=${digest}`);
  return { posted, frozen, digest, exitCode };
}

module.exports = { notify, renderMarkdown, normalizeTerminalReport };

if (require.main === module) {
  const args = process.argv.slice(2);
  let report;
  try {
    if (args[0] === '--failure') {
      const detail = args[1] || 'unknown failure';
      const shippedUnknown = args.includes('--shipped-unknown');
      const [stage, ...rest] = detail.split(':');
      report = {
        runId: `failure-${new Date().toISOString()}`,
        failed: true,
        stage: stage.trim(),
        detail: rest.join(':').trim(),
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        shipped: 0,
        shippedUnknown,
        parked: 0,
        errored: 1,
        candidates: [],
        notes: [shippedUnknown
          ? 'wrapper-level failure AFTER the runner session started — ship state unknown, freeze rule fail-closed'
          : 'wrapper-level failure — no runner report was produced'],
      };
    } else if (args[0] && !args[0].startsWith('--')) {
      report = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    } else {
      throw new Error('usage: intake-notify.js <report.json> | --failure "<stage>: <detail>"');
    }
  } catch (error) {
    console.error(`[intake-notify] ${error.message}`);
    process.exit(1);
  }

  notify(report)
    .then((result) => process.exit(result.exitCode))
    .catch((error) => {
      console.error(`[intake-notify] ${error.message}`);
      process.exit(1);
    });
}
