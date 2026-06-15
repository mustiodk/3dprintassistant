#!/usr/bin/env node
// ─── Owner-approved guardrails-diff APPLY path (S4) ──────────────────────────
//
// Run: node scripts/apply-guardrails-diff.js --file <diff.json> [--apply]
//        [--config <guardrails.json>] [--watermark-file <path>] [--watermark <runId>]
//        [--by <label>]
//
// Exit 0 = ran (dry-run preview, applied, or no-op). Exit 2 = stop (invalid diff,
// retire-value mismatch, bad args, unreadable config).
//
// DRY-RUN IS THE DEFAULT (propose only). Writing requires the explicit --apply
// flag — that flag IS the owner's ratification. The Intake Retrospective emits a
// candidate diff read-only; the owner reviews it; only then is this run with
// --apply. Nothing here puts an LLM in the Scout's decision path.
//
// What --apply does (only when there is an EFFECTIVE change and no errors):
//   - add/modify a brandAlias or array entry → written, with _provenance keyed by
//     the change's target identity (brandAliases.<key> or <list>::<value>) so a
//     re-add of the same target+value is detectable;
//   - retire → the entry is removed AND a _tombstones[id] record is written
//     (never a silent delete); a retire whose value does NOT match the current
//     mapping is REFUSED (reconcile needed), not force-applied;
//   - the config `version` (a content-revision counter, distinct from the schema
//     string) is bumped by 1 and `lastRatified` set to today;
//   - the retrospective watermark is advanced (only if --watermark is given).
//
// IDEMPOTENT: re-applying the same approved diff is a no-op — every change already
// matches, so nothing is effective, the file is left byte-identical (no version
// bump, no duplicate _provenance), and the watermark is not re-advanced.
//
// The diff is RE-VALIDATED here (validate-guardrails-diff.js, which itself chains
// S3's validate-guardrails.js on the projected config) before anything is applied
// — an invalid diff is never applied.

const fs   = require('fs');
const path = require('path');
const { validateDiff, parseTarget, changeIdentity } = require('./validate-guardrails-diff.js');

const DEFAULT_CONFIG    = path.join(__dirname, 'printer-intake-guardrails.json');
const DEFAULT_WATERMARK = path.join(__dirname, '.printer-intake-retrospective.watermark.json');

// Apply a (validated) diff to a config object IN MEMORY. Pure — never writes.
// Returns { cfg, effective:[{id,action}], errors:[] }. The version bump +
// lastRatified happen here too (so the returned cfg is ready to serialise), but
// ONLY when ≥1 change is effective and there are no errors.
function applyDiff(cfg, diff, opts = {}) {
  const by = opts.by || 'intake-retrospective';
  const date = opts.date;                              // 'YYYY-MM-DD'
  const out = JSON.parse(JSON.stringify(cfg || {}));
  if (!out.brandAliases || typeof out.brandAliases !== 'object' || Array.isArray(out.brandAliases)) out.brandAliases = {};
  const effective = [], errors = [];

  const ensureProv = () => { if (!out._provenance || typeof out._provenance !== 'object' || Array.isArray(out._provenance)) out._provenance = {}; };
  const ensureTomb = () => { if (!out._tombstones || typeof out._tombstones !== 'object' || Array.isArray(out._tombstones)) out._tombstones = {}; };
  const clearTomb  = (id) => { if (out._tombstones && id in out._tombstones) delete out._tombstones[id]; };
  const clearProv  = (id) => { if (out._provenance && id in out._provenance) delete out._provenance[id]; };

  for (const ch of (diff.changes || [])) {
    const t = parseTarget(ch.target);
    const id = changeIdentity(ch);
    if (t.kind === 'brandAlias') {
      if (ch.action === 'retire') {
        const cur = out.brandAliases[t.key];
        if (cur === undefined) continue;                                    // already gone → no-op (idempotent)
        if (cur !== ch.value) { errors.push(`retire ${id}: value ${JSON.stringify(ch.value)} does not match current mapping ${JSON.stringify(cur)} — refusing (reconcile needed)`); continue; }
        delete out.brandAliases[t.key];
        clearProv(id);
        ensureTomb(); out._tombstones[id] = { retired: date, by, value: ch.value, rationale: ch.rationale, evidence: ch.evidence };
        effective.push({ id, action: 'retire' });
      } else {                                                              // add | modify
        if (out.brandAliases[t.key] === ch.value) continue;                // already matches → no-op
        out.brandAliases[t.key] = ch.value;
        ensureProv(); out._provenance[id] = { [ch.action === 'add' ? 'added' : 'updated']: date, by, value: ch.value, confidence: ch.confidence, rationale: ch.rationale, evidence: ch.evidence };
        clearTomb(id);                                                      // resurrected → drop any tombstone
        effective.push({ id, action: ch.action });
      }
    } else if (t.kind === 'array') {
      if (!Array.isArray(out[t.name])) out[t.name] = [];
      if (ch.action === 'retire') {
        if (!out[t.name].includes(ch.value)) continue;                     // already gone → no-op
        out[t.name] = out[t.name].filter(v => v !== ch.value);
        clearProv(id);
        ensureTomb(); out._tombstones[id] = { retired: date, by, value: ch.value, rationale: ch.rationale, evidence: ch.evidence };
        effective.push({ id, action: 'retire' });
      } else {                                                              // add (modify-on-array is rejected by the validator)
        if (out[t.name].includes(ch.value)) continue;                      // already present → no-op
        out[t.name].push(ch.value);
        ensureProv(); out._provenance[id] = { added: date, by, value: ch.value, confidence: ch.confidence, rationale: ch.rationale, evidence: ch.evidence };
        clearTomb(id);
        effective.push({ id, action: ch.action });
      }
    }
  }

  if (effective.length && !errors.length) {
    out.version = (Number.isInteger(out.version) ? out.version : 0) + 1;
    out.lastRatified = date;
  }
  return { cfg: out, effective, errors };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
function main() {
  const argv = process.argv.slice(2);
  let file = null, configPath = DEFAULT_CONFIG, watermarkFile = DEFAULT_WATERMARK, watermark = null, by = 'intake-retrospective', doApply = false;
  for (let i = 0; i < argv.length; i++) {
    const need = (flag) => { const v = argv[i + 1]; if (v === undefined || v.startsWith('--')) { console.error(`STOP: ${flag} needs a value`); process.exit(2); } i++; return v; };
    switch (argv[i]) {
      case '--file': file = need('--file'); break;
      case '--config': configPath = need('--config'); break;
      case '--watermark-file': watermarkFile = need('--watermark-file'); break;
      case '--watermark': watermark = need('--watermark'); break;
      case '--by': by = need('--by'); break;
      case '--apply': doApply = true; break;
      case '-h': case '--help':
        console.error('Usage: node scripts/apply-guardrails-diff.js --file <diff.json> [--apply] [--config <path>] [--watermark-file <path>] [--watermark <runId>] [--by <label>]');
        process.exit(0);
      default: console.error(`STOP: unknown argument: ${argv[i]}`); process.exit(2);
    }
  }
  if (!file) { console.error('STOP: --file <diff.json> is required'); process.exit(2); }

  let diff;
  try { diff = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.error(`STOP: cannot read/parse diff ${file}: ${e.message}`); process.exit(2); }

  // Never apply an unvalidated diff (this chains S3's config validator too).
  const v = validateDiff(diff, { configPath });
  if (!v.ok) { console.error('STOP: diff failed validation — refusing to apply:'); for (const e of v.errors) console.error(`  - ${e}`); process.exit(2); }

  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(configPath, 'utf8')); }
  catch (e) { console.error(`STOP: cannot read config ${configPath}: ${e.message}`); process.exit(2); }

  // Local calendar date (YYYY-MM-DD) for the audit stamp — UTC would drift a day
  // behind after local midnight, silently mis-dating the provenance/tombstone
  // record S5's autonomy is gated on.
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const fromVersion = Number.isInteger(cfg.version) ? cfg.version : 0;
  const { cfg: next, effective, errors } = applyDiff(cfg, diff, { by, date });

  if (errors.length) { console.error('STOP: diff cannot be applied:'); for (const e of errors) console.error(`  - ${e}`); process.exit(2); }

  if (effective.length === 0) { console.log('no-op: every change already matches the current config (nothing applied, version unchanged)'); process.exit(0); }

  const summary = effective.map(e => `${e.action} ${e.id}`).join(', ');
  if (!doApply) {
    console.log(`DRY-RUN — would apply ${effective.length} change(s): ${summary}`);
    console.log(`  version ${fromVersion} -> ${next.version}, lastRatified -> ${date}${watermark ? `, watermark -> ${watermark}` : ''}`);
    console.log('  rerun with --apply to write (that flag is the owner ratification).');
    process.exit(0);
  }

  fs.writeFileSync(configPath, JSON.stringify(next, null, 2) + '\n');
  if (watermark != null) fs.writeFileSync(watermarkFile, JSON.stringify({ lastRunId: watermark, updatedAt: new Date().toISOString() }, null, 2) + '\n');
  console.log(`applied ${effective.length} change(s): ${summary}`);
  console.log(`  version ${fromVersion} -> ${next.version}, lastRatified -> ${date}${watermark != null ? `, watermark -> ${watermark}` : ''}`);
  process.exit(0);
}

if (require.main === module) {
  main();
} else {
  module.exports = { applyDiff };
}
