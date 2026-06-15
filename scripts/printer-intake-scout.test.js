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
const fs = require('fs');
const os = require('os');

const SCRIPT  = path.join(__dirname, 'printer-intake-scout.js');
const SAMPLE  = path.join(__dirname, 'fixtures', 'printer-intake-sample.json');
const EMPTY   = path.join(__dirname, 'fixtures', 'printer-intake-empty.json');
const ADV     = path.join(__dirname, 'fixtures', 'printer-intake-adversarial.json');
const ROBUST  = path.join(__dirname, 'fixtures', 'printer-intake-robustness.json');
const MISSING = path.join(__dirname, 'fixtures', '__does_not_exist__.json');
const FAKEWRANGLER = path.join(__dirname, 'fixtures', 'fake-wrangler.js');
const STAGING = path.join(__dirname, '.printer-intake-out'); // the approved (gitignored + asset-ignored) --out dir
try { fs.chmodSync(FAKEWRANGLER, 0o755); } catch (_) {} // ensure executable for execFileSync

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
  check('parse-error carries the bad key in a structured field', adv && (adv.errors || []).some(e => e.type === 'parse-error' && /corrupt/.test(String(e.key || ''))), `errors=${JSON.stringify(adv && adv.errors)}`);
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
  check('duplicate = 3', c.duplicate === 3, `got ${c.duplicate}`);
  check('parse_error = 1', c.parse_error === 1, `got ${c.parse_error}`);
}

{
  console.log('TC24 — wrong-brand: a real model under the wrong brand is caught as duplicate (not a spurious candidate)');
  const items = (adv && adv.items) || [];
  const wb = items.find(i => /ender.?3 ?v3/i.test(i.request && i.request.model || '') && /prusa/i.test(i.request && i.request.brand || ''));
  check('Prusa/Ender-3 V3 present', !!wb, 'missing');
  check('classified as duplicate (not needs-research)', wb && wb.outcome === 'duplicate', `got ${wb && wb.outcome}`);
  check('matched the real Creality printer ender3_v3', wb && wb.matchedPrinter && wb.matchedPrinter.id === 'ender3_v3', `got ${wb && JSON.stringify(wb.matchedPrinter)}`);
  check('brandMismatch flags requested vs actual', wb && wb.brandMismatch && wb.brandMismatch.requested === 'prusa' && wb.brandMismatch.actual === 'creality', `got ${wb && JSON.stringify(wb.brandMismatch)}`);
}

// ── KV-path tests via a fake wrangler (offline, no Cloudflare) ──
{
  console.log('TC17 — kv source via fake wrangler: list+get, parse-error + missing-receivedAt surfaced, PII-safe');
  const r = run(['--source', 'kv', '--reset-watermark', '--no-watermark', '--wrangler-bin', FAKEWRANGLER]);
  check('exit 0', r.code === 0, `got ${r.code}; stderr=${r.stderr}`);
  const rep = parse(r.stdout);
  check('parses', rep !== null, `stdout=${r.stdout.slice(0, 200)}`);
  check('totalKeys = 3', rep && rep.source && rep.source.totalKeys === 3, `got ${rep && rep.source && rep.source.totalKeys}`);
  check('needs_research = 2 (Ender-9000 + SV-Future)', rep && rep.counts.needs_research === 2, `got ${rep && rep.counts.needs_research}`);
  check('parse_error = 1 (req:bad)', rep && rep.counts.parse_error === 1, `got ${rep && rep.counts.parse_error}`);
  check('report.errors has a parse-error', rep && (rep.errors || []).some(e => e.type === 'parse-error'), `errors=${JSON.stringify(rep && rep.errors)}`);
  check('report.errors flags missing receivedAt', rep && (rep.errors || []).some(e => /receivedAt/i.test(e.type || '')), `errors=${JSON.stringify(rep && rep.errors)}`);
  check('no raw email leaked through KV path', !/requester@example\.com/.test(r.stdout), 'RAW EMAIL LEAKED');
}

{
  console.log('TC18 — kv source: a corrupt persisted watermark is ignored (does not drop fresh entries)');
  const wmFile = path.join(os.tmpdir(), `pi-wm-${process.pid}.json`);
  fs.writeFileSync(wmFile, JSON.stringify({ lastReceivedAt: 'not-a-date' }));
  const r = run(['--source', 'kv', '--watermark-file', wmFile, '--wrangler-bin', FAKEWRANGLER]);
  const rep = parse(r.stdout);
  check('exit 0', r.code === 0, `got ${r.code}; stderr=${r.stderr}`);
  check('entries still processed (not silently dropped)', rep && rep.queueCount >= 2, `queueCount=${rep && rep.queueCount}`);
  check('invalid-watermark surfaced in errors', rep && (rep.errors || []).some(e => e.type === 'invalid-watermark'), `errors=${JSON.stringify(rep && rep.errors)}`);
  try { fs.unlinkSync(wmFile); } catch (_) {}
}

{
  console.log('TC19 — --out safety: a non-gitignored in-repo path is refused');
  const r = run(['--queue', SAMPLE, '--out', path.join(__dirname, '..', 'public-leak-dir')]);
  check('exit code 2', r.code === 2, `got ${r.code}`);
  check('error explains the refusal', /staging|refusing --out/i.test(r.stdout + r.stderr), `stderr=${r.stderr}`);
}

{
  console.log('TC20 — --out safety: the approved staging dir is ACCEPTED + writes PII-safe artifacts');
  try { fs.rmSync(STAGING, { recursive: true, force: true }); } catch (_) {}
  const r = run(['--queue', ADV, '--out', STAGING]); // ADV contains the PII entry
  check('exit 0 (staging path accepted)', r.code === 0, `got ${r.code}; stderr=${r.stderr}`);
  const reportPath = path.join(STAGING, 'run-report.json');
  check('run-report.json written', fs.existsSync(reportPath), 'missing');
  if (fs.existsSync(reportPath)) {
    const txt = fs.readFileSync(reportPath, 'utf8');
    check('run-report.json has NO raw email', !/leak@example\.com/.test(txt), 'RAW EMAIL in run-report.json');
    check('run-report.json has NO raw note text', !/123 Main Street/.test(txt), 'RAW NOTE in run-report.json');
  }
  const cands = fs.existsSync(STAGING) ? fs.readdirSync(STAGING).filter(f => f.startsWith('candidate-')) : [];
  check('candidate skeleton(s) written', cands.length >= 1, `got ${cands.length}`);
  if (cands.length >= 1) {
    const cand = JSON.parse(fs.readFileSync(path.join(STAGING, cands[0]), 'utf8'));
    const ep = cand.evidencePolicy || {};
    check('candidate skeleton carries evidencePolicy', !!cand.evidencePolicy,
      `got ${JSON.stringify(cand)}`);
    check('evidencePolicy says Scout cannot ship-ready',
      /cannot promote/i.test(ep.scoutLimitations || ''),
      `got ${JSON.stringify(ep)}`);
    check('evidencePolicy lists manufacturer authority first',
      Array.isArray(ep.sourceAuthority)
        && /Manufacturer authority/.test(ep.sourceAuthority[0] || ''),
      `got ${JSON.stringify(ep.sourceAuthority)}`);
    check('evidencePolicy lists assisted-only outcomes',
      Array.isArray(ep.assistedOnlyOutcomes)
        && ep.assistedOnlyOutcomes.includes('needs-source-resolution')
        && ep.assistedOnlyOutcomes.includes('ship-ready'),
      `got ${JSON.stringify(ep.assistedOnlyOutcomes)}`);
  }
  try { fs.rmSync(STAGING, { recursive: true, force: true }); } catch (_) {}
}

{
  console.log('TC21 — --out safety: gitignored-but-served path is refused (asset-ignore gap closed)');
  // "bambu configs/" is in .gitignore but NOT in .assetsignore — must still be refused.
  const r = run(['--queue', SAMPLE, '--out', path.join(__dirname, '..', 'bambu configs', 'printer-intake-out')]);
  check('exit code 2', r.code === 2, `got ${r.code}; stdout=${r.stdout}`);
  check('error explains the refusal', /staging|refusing --out/i.test(r.stdout + r.stderr), `stderr=${r.stderr}`);
}

{
  console.log('TC22 — --out safety: a path OUTSIDE the repo is accepted + writes artifacts');
  const outDir = path.join(os.tmpdir(), `pi-out-${process.pid}`);
  try { fs.rmSync(outDir, { recursive: true, force: true }); } catch (_) {}
  const r = run(['--queue', ADV, '--out', outDir]);
  check('exit 0 (outside-repo accepted)', r.code === 0, `got ${r.code}; stderr=${r.stderr}`);
  check('run-report.json written outside repo', fs.existsSync(path.join(outDir, 'run-report.json')), 'missing');
  try { fs.rmSync(outDir, { recursive: true, force: true }); } catch (_) {}
}

{
  console.log('TC23 — --out safety: a symlink/aliased path resolving INTO the repo is refused (canonicalization)');
  // A symlink in /tmp pointing at the repo-served data/ dir must be refused —
  // proves realpathSync canonicalization (also covers the macOS case bypass path).
  const link = path.join(os.tmpdir(), `pi-link-${process.pid}`);
  try { fs.rmSync(link, { force: true }); } catch (_) {}
  let made = false;
  try { fs.symlinkSync(path.join(__dirname, '..', 'data'), link); made = true; } catch (_) {}
  if (made) {
    const r = run(['--queue', SAMPLE, '--out', path.join(link, 'leak')]);
    check('exit code 2 (symlink-into-repo refused)', r.code === 2, `got ${r.code}; stdout=${r.stdout}`);
    try { fs.rmSync(link, { force: true }); } catch (_) {}
  } else {
    check('symlink test skipped (could not create symlink)', true);
  }
}

// ── Input robustness (#6 brand-in-model, #7 non-FDM acronym in notes) ──
{
  console.log('TC25-28 — input robustness: brand-in-model + non-FDM acronym in notes');
  const r = run(['--queue', ROBUST]);
  const rep = parse(r.stdout);
  check('exit 0 + parses', r.code === 0 && rep !== null, `code=${r.code}`);
  const byKey = {};
  for (const it of (rep && rep.items) || []) for (const k of (it.requestKeys && it.requestKeys.length ? it.requestKeys : [it.request.key])) byKey[k] = it;

  // TC25 — "Prusa MK4S" in the model field → brand extracted → duplicate of mk4s
  const d = byKey['rb:brand-in-model-dup'];
  check('TC25 brand-in-model dup → duplicate', d && d.outcome === 'duplicate', `got ${d && d.outcome}`);
  check('TC25 matched mk4s', d && d.matchedPrinter && d.matchedPrinter.id === 'mk4s', `got ${d && JSON.stringify(d.matchedPrinter)}`);

  // TC26 — "Bambu Lab H2 Mini" in the model field → brand extracted → novel needs-research under bambu_lab
  const n = byKey['rb:brand-in-model-novel'];
  check('TC26 brand-in-model novel → needs-research', n && n.outcome === 'needs-research', `got ${n && n.outcome}`);
  check('TC26 manufacturer extracted = bambu_lab', n && n.resolved && n.resolved.manufacturer === 'bambu_lab', `got ${n && n.resolved && n.resolved.manufacturer}`);

  // TC27 — "SLS" acronym in notes → declined-non-fdm
  const s = byKey['rb:sls-in-notes'];
  check('TC27 SLS-in-notes → declined-non-fdm', s && s.outcome === 'declined-non-fdm', `got ${s && s.outcome}`);

  // TC28 — "not a resin printer" in notes must STILL not decline (regression guard for #7)
  const g = byKey['rb:resin-word-not-declined'];
  check('TC28 "not a resin printer" note NOT declined', g && g.outcome !== 'declined-non-fdm', `got ${g && g.outcome}`);
}

// ── TC29 — guardrails fallback: a missing config file falls back to bundled
//          defaults AND surfaces a run-error (the Scout never silently breaks) ──
{
  console.log('TC29 — guardrails fallback: missing --guardrails file → defaults + run-error, still classifies');
  const r = run(['--queue', SAMPLE, '--guardrails', path.join(__dirname, 'fixtures', '__no_such_guardrails__.json')]);
  check('exit 0 (still runs on bundled defaults)', r.code === 0, `got ${r.code}; stderr=${r.stderr}`);
  const rep = parse(r.stdout);
  check('parses', rep !== null, `stdout=${r.stdout.slice(0, 200)}`);
  // Photon still declined → proves the resin keywords loaded from the fallback defaults.
  const photon = ((rep && rep.items) || []).find(i => /photon/i.test(i.request && i.request.model || ''));
  check('photon still declined-non-fdm via fallback defaults', photon && photon.outcome === 'declined-non-fdm', `got ${photon && photon.outcome}`);
  check('a guardrails-load-failed run-error is surfaced', rep && (rep.errors || []).some(e => e.type === 'guardrails-load-failed'), `errors=${JSON.stringify(rep && rep.errors)}`);
}

// ── TC30 — drift guard: the in-script GUARDRAILS_DEFAULTS fallback must stay
//          equal to the committed printer-intake-guardrails.json (ignoring
//          lastRatified). Fixture-independent data-level compare — catches a
//          future gate editing the JSON but not the constant (or vice-versa). ──
{
  console.log('TC30 — GUARDRAILS_DEFAULTS ≡ printer-intake-guardrails.json (drift guard)');
  const scout = require(SCRIPT); // module export via the require.main guard; does NOT run main()
  const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'printer-intake-guardrails.json'), 'utf8'));
  // order-insensitive for object keys, order-SENSITIVE for arrays (match order matters).
  const canon = (v) => Array.isArray(v) ? v.map(canon)
    : (v && typeof v === 'object') ? Object.keys(v).sort().reduce((o, k) => (o[k] = canon(v[k]), o), {})
    : v;
  check('GUARDRAILS_DEFAULTS is exported', !!(scout && scout.GUARDRAILS_DEFAULTS), 'not exported');
  for (const f of ['schema', 'version', 'brandAliases', 'brandTokens', 'familyTokens',
                   'modelSuffixStrip', 'resinKeywords', 'nonFdmTech', 'nonFdmNoteAcronyms']) {
    const d = scout && scout.GUARDRAILS_DEFAULTS ? scout.GUARDRAILS_DEFAULTS[f] : undefined;
    check(`defaults.${f} === json.${f}`, JSON.stringify(canon(d)) === JSON.stringify(canon(json[f])),
      `defaults=${JSON.stringify(d)} json=${JSON.stringify(json[f])}`);
  }
}

// ── TC31 — schema-valid-but-partial config (missing resinKeywords) FALLS BACK
//          wholesale + run-error; FDM declines are NOT silently disabled
//          (locks the review MEDIUM fix). ──
{
  console.log('TC31 — partial config (missing resinKeywords) → fallback + run-error, Photon still declined');
  const partial = JSON.parse(fs.readFileSync(path.join(__dirname, 'printer-intake-guardrails.json'), 'utf8'));
  delete partial.resinKeywords;
  const pf = path.join(os.tmpdir(), `pi-partial-${process.pid}.json`);
  fs.writeFileSync(pf, JSON.stringify(partial));
  const r = run(['--queue', SAMPLE, '--guardrails', pf]);
  const rep = parse(r.stdout);
  check('exit 0', r.code === 0, `got ${r.code}; stderr=${r.stderr}`);
  const photon = ((rep && rep.items) || []).find(i => /photon/i.test(i.request && i.request.model || ''));
  check('photon STILL declined-non-fdm (no silent degradation)', photon && photon.outcome === 'declined-non-fdm', `got ${photon && photon.outcome}`);
  check('guardrails-load-failed run-error surfaced', rep && (rep.errors || []).some(e => e.type === 'guardrails-load-failed'), `errors=${JSON.stringify(rep && rep.errors)}`);
  try { fs.unlinkSync(pf); } catch (_) {}
}

console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASS');
  process.exit(0);
} else {
  console.log(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
