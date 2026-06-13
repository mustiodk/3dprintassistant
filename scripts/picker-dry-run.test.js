#!/usr/bin/env node
// ─── Tests for picker-dry-run.js ─────────────────────────────────────────────
//
// Run: node scripts/picker-dry-run.test.js
//
// Exit 0 on all-green, 1 on any failure.

const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, 'picker-dry-run.js');

function run(args) {
  const r = spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
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

console.log('# picker-dry-run.js tests\n');

// ── TC1 — GREEN happy path: current state has sparkx_i7 under creality / i Series ──
{
  console.log('TC1 — GREEN: creality / "i Series" / sparkx_i7');
  const r = run(['creality', 'i Series', 'sparkx_i7']);
  check('exit code 0', r.code === 0, `got ${r.code}; stdout=${r.stdout}; stderr=${r.stderr}`);
  check('stdout contains GREEN', /GREEN/.test(r.stdout), `stdout=${r.stdout}`);
}

// ── TC2 — RED: missing printer id ──
{
  console.log('TC2 — RED: printer id does not exist');
  const r = run(['creality', 'i Series', 'definitely_not_a_printer_xyz']);
  check('exit code 1', r.code === 1, `got ${r.code}; stdout=${r.stdout}`);
  check('diagnostic mentions printer id',
    /definitely_not_a_printer_xyz/.test(r.stdout + r.stderr),
    `stdout=${r.stdout}; stderr=${r.stderr}`);
}

// ── TC3 — RED: wrong series_group ──
{
  console.log('TC3 — RED: series_group does not exist under brand');
  const r = run(['creality', 'Nonexistent Series', 'sparkx_i7']);
  check('exit code 1', r.code === 1, `got ${r.code}; stdout=${r.stdout}`);
  check('diagnostic mentions series_group',
    /Nonexistent Series/.test(r.stdout + r.stderr),
    `stdout=${r.stdout}; stderr=${r.stderr}`);
}

// ── TC4 — GREEN: optional wrong_brand_id check passes when that brand absent ──
//   This is the negative-assertion path that would have caught the SPARKX
//   regression if it ever returned. Currently sparkx brand does not exist, so
//   this should pass cleanly.
{
  console.log('TC4 — GREEN: wrong_brand_id="sparkx" is absent from getBrands()');
  const r = run(['creality', 'i Series', 'sparkx_i7', 'sparkx']);
  check('exit code 0', r.code === 0, `got ${r.code}; stdout=${r.stdout}; stderr=${r.stderr}`);
  check('stdout contains GREEN', /GREEN/.test(r.stdout), `stdout=${r.stdout}`);
}

// ── TC5 — usage error: insufficient args ──
{
  console.log('TC5 — usage: missing args prints usage and exits non-zero');
  const r = run([]);
  check('exit code 1', r.code === 1, `got ${r.code}`);
  check('usage text shown', /Usage/i.test(r.stdout + r.stderr), `stdout=${r.stdout}; stderr=${r.stderr}`);
}

// ── TC6 — RED-path: wrong_brand_id points to an EXISTING brand ──
//   This is the test that would have caught the SPARKX bug if SPARKX brand had
//   been added. TC4 proves absence; TC6 proves the script actually REJECTS
//   when the spurious brand is real. Without this test, the spurious-brand
//   code path is only verified on the negative case.
{
  console.log('TC6 — RED: wrong_brand_id="bambu_lab" is registered → spurious brand');
  const r = run(['creality', 'i Series', 'sparkx_i7', 'bambu_lab']);
  check('exit code 1', r.code === 1, `got ${r.code}; stdout=${r.stdout}`);
  check('diagnostic mentions spurious brand',
    /spurious brand 'bambu_lab'/.test(r.stdout + r.stderr),
    `stdout=${r.stdout}; stderr=${r.stderr}`);
}

// ── TC7 — GREEN: Voxelab Aries taxonomy path ──
//   This starts RED before data is added, then guards the new brand →
//   series_group → printer path after the catalog change.
{
  console.log('TC7 — GREEN: voxelab / "Aries Series" / aries');
  const r = run(['voxelab', 'Aries Series', 'aries']);
  check('exit code 0', r.code === 0, `got ${r.code}; stdout=${r.stdout}; stderr=${r.stderr}`);
  check('stdout contains GREEN', /GREEN/.test(r.stdout), `stdout=${r.stdout}`);
}

console.log('');
if (failures === 0) {
  console.log(`ALL ${7} TESTS PASS`);
  process.exit(0);
} else {
  console.log(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
