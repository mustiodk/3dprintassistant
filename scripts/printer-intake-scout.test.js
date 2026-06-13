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
const MISSING = path.join(__dirname, 'fixtures', '__does_not_exist__.json');

function run(args) {
  const r = spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });
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

console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASS');
  process.exit(0);
} else {
  console.log(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
