#!/usr/bin/env node
// ─── Tests for printer-intake-scout.js ───────────────────────────────────────
//
// Run: node scripts/printer-intake-scout.test.js
//
// Exit 0 on all-green, 1 on any failure.
//
// Mirrors the style of scripts/picker-dry-run.test.js: spawn the script as a
// subprocess, assert exit code + parse its stdout run-report JSON.

const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPT  = path.join(__dirname, 'printer-intake-scout.js');
const SAMPLE  = path.join(__dirname, 'fixtures', 'printer-intake-sample.json');
const EMPTY   = path.join(__dirname, 'fixtures', 'printer-intake-empty.json');
const ADV     = path.join(__dirname, 'fixtures', 'printer-intake-adversarial.json');
const MISSING = path.join(__dirname, 'fixtures', '__does_not_exist__.json');

function run(args, env) {
  const r = spawnSync('node', [SCRIPT, ...args], {
    encoding: 'utf8',
    env: env ? Object.assign({}, process.env, env) : process.env,
  });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function parse(stdout) {
  try { return JSON.parse(stdout); } catch (_) { return null; }
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log(`  ok   ${name}`);
  } else {
    console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`);
    failures++;
  }
}

console.log('# printer-intake-scout.js tests\n');

// ── TC1 — GREEN: runs against the sample fixture, stdout is a valid report ──
let report;
{
  console.log('TC1 — GREEN: scout runs against sample fixture, emits JSON report');
  const r = run(['--queue', SAMPLE]);
  check('exit code 0', r.code === 0, `got ${r.code}; stderr=${r.stderr}`);
  report = parse(r.stdout);
  check('stdout parses as JSON', report !== null, `stdout=${r.stdout.slice(0, 200)}`);
  check('queueCount is 7', report && report.queueCount === 7, `got ${report && report.queueCount}`);
}

// ── TC2 — outcome counts match the curated fixture mix ──
{
  console.log('TC2 — counts: 2 needs-research / 1 duplicate / 1 declined / 1 incomplete / 1 unactionable');
  const c = (report && report.counts) || {};
  check('needs_research = 2', c.needs_research === 2, `got ${c.needs_research}`);
  check('duplicate = 1', c.duplicate === 1, `got ${c.duplicate}`);
  check('declined_non_fdm = 1', c.declined_non_fdm === 1, `got ${c.declined_non_fdm}`);
  check('incomplete = 1', c.incomplete === 1, `got ${c.incomplete}`);
  check('unactionable = 1', c.unactionable === 1, `got ${c.unactionable}`);
  // unverified_model is reserved for the assisted/research pass; the deterministic
  // core never emits it (no spec research happens here).
  check('unverified_model = 0', c.unverified_model === 0, `got ${c.unverified_model}`);
}

// ── TC3 — the Photon Mono M7 Pro is auto-declined as non-FDM ──
{
  console.log('TC3 — FDM scope: Anycubic Photon Mono M7 Pro → declined-non-fdm');
  const items = (report && report.items) || [];
  const photon = items.find(i => /photon/i.test(i.request && i.request.model || ''));
  check('photon item present', !!photon, 'no item matched /photon/');
  check('photon outcome is declined-non-fdm', photon && photon.outcome === 'declined-non-fdm',
    `got ${photon && photon.outcome}`);
}

// ── TC4 — the X1 Carbon is deduped against the bundled catalog ──
{
  console.log('TC4 — dedupe: Bambu Lab X1 Carbon → duplicate, matched bundled printer x1c');
  const items = (report && report.items) || [];
  const dup = items.find(i => i.outcome === 'duplicate');
  check('a duplicate exists', !!dup, 'no duplicate item');
  check('matched printer id is x1c', dup && dup.matchedPrinter && dup.matchedPrinter.id === 'x1c',
    `got ${dup && JSON.stringify(dup.matchedPrinter)}`);
}

// ── TC5 — in-queue dedupe collapses the two Ender-5 S1 requests ──
{
  console.log('TC5 — in-queue dedupe: two Ender-5 S1 requests collapse to one item, requestCount 2');
  const items = (report && report.items) || [];
  const ender5 = items.filter(i => /ender.?5 ?s1/i.test(i.request && i.request.model || ''));
  check('exactly one Ender-5 S1 item', ender5.length === 1, `got ${ender5.length}`);
  check('its requestCount is 2', ender5[0] && ender5[0].requestCount === 2,
    `got ${ender5[0] && ender5[0].requestCount}`);
  check('it is needs-research', ender5[0] && ender5[0].outcome === 'needs-research',
    `got ${ender5[0] && ender5[0].outcome}`);
}

// ── TC6 — model-only request infers the brand from the catalog family token ──
{
  console.log('TC6 — brand inference: model-only "Ender-7" → needs-research, manufacturer inferred creality');
  const items = (report && report.items) || [];
  const ender7 = items.find(i => /ender.?7/i.test(i.request && i.request.model || ''));
  check('ender-7 item present', !!ender7, 'no item matched /ender.?7/');
  check('outcome needs-research', ender7 && ender7.outcome === 'needs-research', `got ${ender7 && ender7.outcome}`);
  check('manufacturer resolved to creality', ender7 && ender7.resolved && ender7.resolved.manufacturer === 'creality',
    `got ${ender7 && ender7.resolved && ender7.resolved.manufacturer}`);
  check('manufacturerInferred is true', ender7 && ender7.resolved && ender7.resolved.manufacturerInferred === true,
    `got ${ender7 && ender7.resolved && ender7.resolved.manufacturerInferred}`);
}

// ── TC7 — empty queue → empty report, all counts zero, exit 0 ──
{
  console.log('TC7 — stop condition: empty queue → empty report, exit 0');
  const r = run(['--queue', EMPTY]);
  check('exit code 0', r.code === 0, `got ${r.code}; stderr=${r.stderr}`);
  const rep = parse(r.stdout);
  check('queueCount 0', rep && rep.queueCount === 0, `got ${rep && rep.queueCount}`);
  check('no items', rep && Array.isArray(rep.items) && rep.items.length === 0,
    `got ${rep && rep.items && rep.items.length}`);
}

// ── TC8 — missing queue file → stop condition, non-zero exit, error reported ──
{
  console.log('TC8 — stop condition: missing queue file → exit 2, error message');
  const r = run(['--queue', MISSING]);
  check('exit code 2', r.code === 2, `got ${r.code}`);
  check('error mentions the queue', /queue|not found|ENOENT|read/i.test(r.stdout + r.stderr),
    `stdout=${r.stdout}; stderr=${r.stderr}`);
}

// ── TC9 — kv source, failing wrangler → stop condition, exit 2 (no silent empty) ──
{
  console.log('TC9 — kv source, failing wrangler (/bin/false) → exit 2, no watermark advance');
  const r = run(['--source', 'kv', '--no-watermark', '--reset-watermark', '--wrangler-bin', '/bin/false']);
  check('exit code 2', r.code === 2, `got ${r.code}; stdout=${r.stdout}`);
  check('error mentions wrangler/kv list', /wrangler|kv key list|failed/i.test(r.stdout + r.stderr), `stderr=${r.stderr}`);
}

// ── TC10 — unknown --source → stop condition, exit 2 ──
{
  console.log('TC10 — unknown --source value → exit 2');
  const r = run(['--source', 'banana']);
  check('exit code 2', r.code === 2, `got ${r.code}`);
  check('error mentions source', /source/i.test(r.stdout + r.stderr), `stderr=${r.stderr}`);
}

// ── Adversarial fixture (covers the hostile-review findings) ──
let adv, advRaw;
{
  console.log('TC11 — adversarial: model-only "X1 Carbon" deduped against catalog (ambiguous family token)');
  const r = run(['--queue', ADV]);
  advRaw = r.stdout;
  adv = parse(r.stdout);
  check('exit 0 + parses', r.code === 0 && adv !== null, `code=${r.code}`);
  const x1 = (adv && adv.items || []).find(i => /x1 carbon/i.test(i.request && i.request.model || '') && !i.request.brand);
  check('model-only X1 Carbon is a duplicate', x1 && x1.outcome === 'duplicate', `got ${x1 && x1.outcome}`);
  check('matched bundled printer x1c', x1 && x1.matchedPrinter && x1.matchedPrinter.id === 'x1c', `got ${x1 && JSON.stringify(x1.matchedPrinter)}`);
}

{
  console.log('TC12 — adversarial: "not a resin printer" in NOTES must NOT trigger an FDM decline');
  const e5 = (adv && adv.items || []).find(i => /ender.?5 ?s1/i.test(i.request && i.request.model || ''));
  check('Ender-5 S1 present', !!e5, 'missing');
  check('NOT declined-non-fdm', e5 && e5.outcome !== 'declined-non-fdm', `got ${e5 && e5.outcome}`);
  check('is needs-research', e5 && e5.outcome === 'needs-research', `got ${e5 && e5.outcome}`);
  check('fdmStatus is unconfirmed (honest)', e5 && e5.fdmStatus === 'unconfirmed', `got ${e5 && e5.fdmStatus}`);
}

{
  console.log('TC13 — adversarial: unparseable KV value is surfaced, not swallowed');
  const pe = (adv && adv.items || []).find(i => i.outcome === 'parse-error');
  check('a parse-error item exists', !!pe, 'none');
  check('counts.parse_error >= 1', adv && adv.counts && adv.counts.parse_error >= 1, `got ${adv && adv.counts && adv.counts.parse_error}`);
  check('report.errors is non-empty', adv && Array.isArray(adv.errors) && adv.errors.length >= 1, `got ${adv && adv.errors && adv.errors.length}`);
  check('an error references the bad key', adv && (adv.errors || []).some(e => /corrupt/.test(JSON.stringify(e))), `errors=${JSON.stringify(adv && adv.errors)}`);
}

{
  console.log('TC14 — adversarial: PII (raw email + note text) never appears in the report');
  check('no raw email in stdout', !/leak@example\.com/.test(advRaw), 'RAW EMAIL LEAKED');
  check('no raw note text in stdout', !/123 Main Street/.test(advRaw), 'RAW NOTE LEAKED');
  const p1 = (adv && adv.items || []).find(i => /p1s/i.test(i.request && i.request.model || ''));
  check('email reduced to a hash', p1 && p1.request.hasEmail === true && typeof p1.request.emailHash === 'string' && p1.request.emailHash.length > 0, `got ${p1 && JSON.stringify(p1.request)}`);
  check('notes reduced to presence/length', p1 && p1.request.hasNotes === true && p1.request.notesLength > 0 && p1.request.notes === undefined, `got ${p1 && JSON.stringify(p1.request)}`);
}

{
  console.log('TC15 — adversarial: global id collision ("M5" vs AnkerMake m5) is prefixed + flagged');
  const m5 = (adv && adv.items || []).find(i => /newco/i.test(i.request && i.request.brand || ''));
  check('NewCo M5 is needs-research', m5 && m5.outcome === 'needs-research', `got ${m5 && m5.outcome}`);
  check('flagged as new brand', m5 && m5.isNewBrand === true, `got ${m5 && m5.isNewBrand}`);
  check('suggestedId is NOT bare "m5"', m5 && m5.resolved && m5.resolved.suggestedId !== 'm5', `got ${m5 && m5.resolved && m5.resolved.suggestedId}`);
  check('idCollision flagged', m5 && m5.idCollision === true, `got ${m5 && m5.idCollision}`);
}

{
  console.log('TC16 — adversarial counts');
  const c = (adv && adv.counts) || {};
  check('needs_research = 2', c.needs_research === 2, `got ${c.needs_research}`);
  check('duplicate = 2', c.duplicate === 2, `got ${c.duplicate}`);
  check('parse_error = 1', c.parse_error === 1, `got ${c.parse_error}`);
}

console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASS');
  process.exit(0);
} else {
  console.log(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
