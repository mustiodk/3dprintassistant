#!/usr/bin/env node
// Tests for verify-live-picker.js (Intake Autonomy v2, Gate B2).
// The engine vm-loads once per process, so CLI scenarios spawn fresh node
// processes against a local HTTP server serving fixture roots — the full
// download→bootstrap→assert path, no live network.
// Run: node --test scripts/verify-live-picker.test.js

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFile } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const SCRIPT = path.join(__dirname, 'verify-live-picker.js');
const { REQUIRED_FILES, downloadSiteFiles } = require('./verify-live-picker.js');

const SERVED = [
  'engine.js',
  'data/printers.json',
  'data/materials.json',
  'data/nozzles.json',
  'data/rules/environment.json',
  'data/rules/objective_profiles.json',
  'data/rules/troubleshooter.json',
  'data/rules/slicer_capabilities.json',
  'locales/en.json',
  'locales/da.json',
];

function makeSiteRoot({ mutatePrinters } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-picker-site-'));
  for (const rel of SERVED) {
    const dest = path.join(dir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, rel), dest);
  }
  if (mutatePrinters) {
    const p = path.join(dir, 'data', 'printers.json');
    const printers = JSON.parse(fs.readFileSync(p, 'utf8'));
    mutatePrinters(printers);
    fs.writeFileSync(p, JSON.stringify(printers, null, 2));
  }
  return dir;
}

function serve(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.replace(/^\//, ''));
      const file = path.join(rootDir, rel);
      if (!file.startsWith(rootDir) || !fs.existsSync(file)) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      res.end(fs.readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

function runCli(args) {
  return new Promise((resolve) => {
    execFile(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' }, (error, stdout, stderr) => {
      resolve({ status: error ? error.code : 0, stdout, stderr });
    });
  });
}

test('REQUIRED_FILES matches every file Engine.init() fetches', () => {
  const engineSrc = fs.readFileSync(path.join(repoRoot, 'engine.js'), 'utf8');
  const fetched = [...engineSrc.matchAll(/fetch\((?:base \+ '([^']+)'|'\.\/([^']+)')\)/g)]
    .map((m) => (m[1] ? `data/${m[1]}` : m[2]))
    .filter((rel) => !rel.includes('...')); // comment examples, not fetch sites
  assert.ok(fetched.length >= 9, `expected >=9 fetch sites in engine.js init, found ${fetched.length}`);
  // Set EQUALITY, both directions: a missing entry means the live probe runs
  // on stale data; a stale extra entry means a 404 -> false exit-3 FAIL and
  // an unnecessary auto-rollback of a good deploy.
  assert.deepStrictEqual(
    [...new Set([...fetched, 'engine.js'])].sort(),
    [...REQUIRED_FILES].sort(),
  );
});

test('garbage-200 engine.js (HTML error page) exits 3, not a crash into exit 1', async () => {
  const site = makeSiteRoot();
  fs.writeFileSync(path.join(site, 'engine.js'), '<!doctype html><html><body>error page</body></html>');
  const { server, baseUrl } = await serve(site);
  try {
    const r = await runCli(['creality', 'i Series', 'sparkx_i7', '--base-url', baseUrl]);
    assert.strictEqual(r.status, 3, `stdout=${r.stdout} stderr=${r.stderr}`);
    assert.match(r.stdout + r.stderr, /INIT-ERROR/);
  } finally {
    server.close();
  }
});

test('unknown --flag is rejected (never silently consumed as the wrong-brand positional)', async () => {
  const r = await runCli(['creality', 'i Series', 'sparkx_i7', '--keeptemp']);
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout + r.stderr, /unknown argument/);
});

test('GREEN: existing printer resolves against served production-shaped data', async () => {
  const site = makeSiteRoot();
  const { server, baseUrl } = await serve(site);
  try {
    const r = await runCli(['creality', 'i Series', 'sparkx_i7', 'sparkx', '--base-url', baseUrl]);
    assert.strictEqual(r.status, 0, `stdout=${r.stdout} stderr=${r.stderr}`);
    assert.match(r.stdout, /GREEN/);
    assert.match(r.stdout, /sparkx_i7/);
  } finally {
    server.close();
  }
});

test('RED: missing printer id exits 2 with diagnostics', async () => {
  const site = makeSiteRoot();
  const { server, baseUrl } = await serve(site);
  try {
    const r = await runCli(['creality', 'i Series', 'no_such_printer_xyz', '--base-url', baseUrl]);
    assert.strictEqual(r.status, 2, `stdout=${r.stdout} stderr=${r.stderr}`);
    assert.match(r.stdout + r.stderr, /no_such_printer_xyz/);
  } finally {
    server.close();
  }
});

test('RED: spurious wrong-brand present in served data exits 2', async () => {
  const site = makeSiteRoot({
    mutatePrinters: (printers) => {
      printers.brands.push({ id: 'sparkx', name: 'SPARKX', sort_order: 999, primary: false, default_slicer: 'orcaslicer' });
    },
  });
  const { server, baseUrl } = await serve(site);
  try {
    const r = await runCli(['creality', 'i Series', 'sparkx_i7', 'sparkx', '--base-url', baseUrl]);
    assert.strictEqual(r.status, 2, `stdout=${r.stdout} stderr=${r.stderr}`);
    assert.match(r.stdout + r.stderr, /spurious/);
  } finally {
    server.close();
  }
});

test('fetch-error: a 404 on any required file exits 3 and names the file', async () => {
  const site = makeSiteRoot();
  fs.rmSync(path.join(site, 'data', 'materials.json'));
  const { server, baseUrl } = await serve(site);
  try {
    const r = await runCli(['creality', 'i Series', 'sparkx_i7', '--base-url', baseUrl]);
    assert.strictEqual(r.status, 3, `stdout=${r.stdout} stderr=${r.stderr}`);
    assert.match(r.stdout + r.stderr, /materials\.json/);
  } finally {
    server.close();
  }
});

test('usage error exits 1', async () => {
  const r = await runCli([]);
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout + r.stderr, /Usage/i);
});

test('downloadSiteFiles: writes every required file into the temp root (unit, mocked fetch)', async () => {
  const fetchImpl = async (url) => ({
    ok: true,
    status: 200,
    text: async () => `content-of ${url}`,
  });
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'live-picker-dl-'));
  await downloadSiteFiles('https://example.test', dest, fetchImpl);
  for (const rel of REQUIRED_FILES) {
    const p = path.join(dest, rel);
    assert.ok(fs.existsSync(p), `missing ${rel}`);
    assert.match(fs.readFileSync(p, 'utf8'), /content-of https:\/\/example\.test\//);
  }
});

test('downloadSiteFiles: non-200 throws naming the file', async () => {
  const fetchImpl = async (url) => ({ ok: !url.includes('nozzles'), status: url.includes('nozzles') ? 404 : 200, text: async () => '{}' });
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'live-picker-dl2-'));
  await assert.rejects(() => downloadSiteFiles('https://example.test', dest, fetchImpl), /nozzles\.json.*404|404.*nozzles\.json/);
});
