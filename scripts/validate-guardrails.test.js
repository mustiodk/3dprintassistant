#!/usr/bin/env node
// ─── Tests for validate-guardrails.js (S3 Gate 1) ────────────────────────────
//
// Run: node scripts/validate-guardrails.test.js
// Exit 0 on all-green, 1 on any failure.
//
// Spawn-based, mirroring printer-intake-scout.test.js: run the validator as a
// subprocess against the real v1 config (default path) and against mutated temp
// copies, asserting exit code + message.

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const VALIDATOR = path.join(__dirname, 'validate-guardrails.js');
const V1 = path.join(__dirname, 'printer-intake-guardrails.json');

function run(args) {
  const r = spawnSync('node', [VALIDATOR, ...args], { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`  ok   ${name}`); }
  else { console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); failures++; }
}

const tmpFiles = [];
function tmp(obj) {
  const p = path.join(os.tmpdir(), `vg-${process.pid}-${tmpFiles.length}.json`);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  tmpFiles.push(p);
  return p;
}
function baseValid() { return JSON.parse(fs.readFileSync(V1, 'utf8')); }

console.log('# validate-guardrails.js tests\n');

// ── TC1 — the real v1 config passes (default path) ──
{
  console.log('TC1 — v1 config valid (default path)');
  const r = run([]);
  check('exit 0', r.code === 0, `got ${r.code}; ${r.out}`);
  check('reports OK', /guardrails OK/.test(r.out), r.out);
}

// ── TC2 — bad schema rejected ──
{
  console.log('TC2 — bad schema → exit 2');
  const c = baseValid(); c.schema = 'wrong@9';
  const r = run(['--file', tmp(c)]);
  check('exit 2', r.code === 2, `got ${r.code}`);
  check('mentions schema', /schema/i.test(r.out), r.out);
}

// ── TC3 — an alias value not present as a brands[].id is rejected (referential) ──
{
  console.log('TC3 — brandAliases value not in printers.json brands → exit 2');
  const c = baseValid(); c.brandAliases = Object.assign({}, c.brandAliases, { foo: 'not_a_brand' });
  const r = run(['--file', tmp(c)]);
  check('exit 2', r.code === 2, `got ${r.code}`);
  check('names the bad alias target', /not_a_brand|brands\[\]\.id/i.test(r.out), r.out);
}

// ── TC4 — a duplicate flat-array entry is rejected ──
{
  console.log('TC4 — duplicate flat-array entry → exit 2');
  const c = baseValid(); c.nonFdmTech = c.nonFdmTech.concat([c.nonFdmTech[0]]);
  const r = run(['--file', tmp(c)]);
  check('exit 2', r.code === 2, `got ${r.code}`);
  check('mentions duplicate', /duplicate/i.test(r.out), r.out);
}

// ── TC5 — a non-normalised (uppercase) flat-array entry is rejected ──
{
  console.log('TC5 — non-normalised flat-array entry → exit 2');
  const c = baseValid(); c.resinKeywords = c.resinKeywords.concat(['UPPER']);
  const r = run(['--file', tmp(c)]);
  check('exit 2', r.code === 2, `got ${r.code}`);
  check('mentions normalised', /normalis|normaliz/i.test(r.out), r.out);
}

// ── TC6 — v1 ships EXACTLY the 14 verbatim alias keys (copy-correctness;
//         Gate 2 updates this to the 16 incl. bmbulab + sparkx seeds) ──
{
  console.log('TC6 — config has the expected 16 alias keys (14 base + Gate-2 seeds bmbulab/sparkx)');
  const keys = Object.keys(baseValid().brandAliases).sort();
  const expected = ['anker', 'ankermake', 'anycubic', 'artillery', 'bambu', 'bambulab',
    'bmbulab', 'creality', 'elegoo', 'flashforge', 'prusa', 'prusaresearch', 'qidi',
    'sovol', 'sparkx', 'voron'];
  check('exactly 16 aliases', keys.length === 16, `got ${keys.length}`);
  check('alias key set matches the expected base+seeds set',
    JSON.stringify(keys) === JSON.stringify(expected), `got ${JSON.stringify(keys)}`);
}

for (const p of tmpFiles) { try { fs.unlinkSync(p); } catch (_) {} }

console.log('');
if (failures === 0) { console.log('ALL TESTS PASS'); process.exit(0); }
else { console.log(`${failures} TEST(S) FAILED`); process.exit(1); }
