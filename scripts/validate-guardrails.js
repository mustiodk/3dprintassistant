#!/usr/bin/env node
// ─── Validator for scripts/printer-intake-guardrails.json (S3) ───────────────
//
// Run: node scripts/validate-guardrails.js [--file <path>]
//
// Exit 0 = valid; exit 2 = invalid (matches the Scout's stop-condition convention).
//
// Checks:
//   - schema/version/required-key shape;
//   - REFERENTIAL (one-directional): every brandAliases VALUE ∈ data/printers.json
//     brands[].id — an alias can't point to a non-existent/renamed brand;
//   - brandAliases KEYS are norm()-form (lowercase alphanumerics) so the Scout's
//     runtime `cat.brandAliases[norm(brandRaw)]` lookup can ever match them;
//   - flat-array checks on the token/suffix/keyword lists: strings only, each
//     already lowercase+trimmed ("normalised"), no duplicates.
//
// Deliberately NO hardcoded alias COUNT: the config is designed to ACCRETE
// owner-ratified aliases over time (S4's learning loop), so a count assertion
// would fight the design. Copy-correctness of the v1 verbatim set is asserted in
// the test (validate-guardrails.test.js TC6), not here.
//
// Wired into the profile/data-change gate when the config changes, and run by S4
// before any proposed diff is applied. Mirrors the validate-ios-printer-overlay.js
// + validate-data.js pattern.

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Same normalisation the Scout uses for brand/model equality (lowercase alnum).
function norm(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function fail(errs) {
  console.error('GUARDRAILS INVALID:');
  for (const e of errs) console.error(`  - ${e}`);
  process.exit(2);
}

function main() {
  const argv = process.argv.slice(2);
  let file = path.join(__dirname, 'printer-intake-guardrails.json');
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--file') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) { console.error('STOP: --file needs a value'); process.exit(2); }
      file = v; i++;
    } else if (argv[i] === '-h' || argv[i] === '--help') {
      console.error('Usage: node scripts/validate-guardrails.js [--file <path>]');
      process.exit(0);
    } else {
      console.error(`STOP: unknown argument: ${argv[i]}`); process.exit(2);
    }
  }

  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { fail([`cannot read/parse ${file}: ${e.message}`]); }

  const errs = [];

  // ── schema / required shape ──
  if (cfg.schema !== 'printer-intake-guardrails@1') {
    errs.push(`schema must be "printer-intake-guardrails@1" (got ${JSON.stringify(cfg.schema)})`);
  }
  if (!Number.isInteger(cfg.version)) {
    errs.push(`version must be an integer (got ${JSON.stringify(cfg.version)})`);
  }
  if (typeof cfg.lastRatified !== 'string') {
    errs.push('lastRatified must be a string');
  }
  const isPlainObject = (o) => o != null && typeof o === 'object' && !Array.isArray(o);
  if (!isPlainObject(cfg.brandAliases)) errs.push('brandAliases must be an object');
  if (!isPlainObject(cfg._provenance)) errs.push('_provenance must be an object');

  // ── flat-array checks: strings, lowercase+trimmed, no dups ──
  const flatArrays = ['brandTokens', 'familyTokens', 'modelSuffixStrip',
                      'resinKeywords', 'nonFdmTech', 'nonFdmNoteAcronyms'];
  for (const key of flatArrays) {
    const arr = cfg[key];
    if (!Array.isArray(arr)) { errs.push(`${key} must be an array`); continue; }
    const seen = new Set();
    for (const v of arr) {
      if (typeof v !== 'string') { errs.push(`${key} entries must be strings (got ${JSON.stringify(v)})`); continue; }
      if (v !== v.toLowerCase().trim()) errs.push(`${key} entry not normalised (must be lowercase + trimmed): ${JSON.stringify(v)}`);
      if (seen.has(v)) errs.push(`${key} has a duplicate entry: ${JSON.stringify(v)}`);
      seen.add(v);
    }
  }

  // ── referential: every brandAliases value ∈ printers.json brands[].id ──
  if (isPlainObject(cfg.brandAliases)) {
    let brandIds = new Set();
    try {
      const printers = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'printers.json'), 'utf8'));
      brandIds = new Set((printers.brands || []).map(b => b.id));
    } catch (e) {
      errs.push(`cannot read data/printers.json for the referential check: ${e.message}`);
    }
    for (const [k, v] of Object.entries(cfg.brandAliases)) {
      if (k !== norm(k)) errs.push(`brandAliases key ${JSON.stringify(k)} is not norm()-form (lowercase alphanumerics) — the runtime lookup could never match it`);
      if (typeof v !== 'string') { errs.push(`brandAliases[${JSON.stringify(k)}] value must be a string`); continue; }
      if (brandIds.size && !brandIds.has(v)) {
        errs.push(`brandAliases[${JSON.stringify(k)}] → ${JSON.stringify(v)} is not a brands[].id in data/printers.json`);
      }
    }
  }

  if (errs.length) fail(errs);

  const aliasCount = isPlainObject(cfg.brandAliases) ? Object.keys(cfg.brandAliases).length : 0;
  console.log(`guardrails OK: ${path.relative(ROOT, file) || file} (schema ${cfg.schema}, v${cfg.version}, ${aliasCount} aliases)`);
  process.exit(0);
}

main();
