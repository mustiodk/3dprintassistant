#!/usr/bin/env node
// ─── 3dpa Printer Intake Scout — deterministic core ──────────────────────────
//
// Unattended first half of the missing-printer pipeline. Reads structured
// missing-printer feedback (teed from the Cloudflare feedback Function into a KV
// queue) and turns it into a triaged run report + candidate skeletons that the
// in-session Printer Addition Assistant approves and ships.
//
// THIS SCRIPT IS THE DETERMINISTIC CORE ONLY. It does NO web/spec research and
// NO LLM calls — those belong to the assisted pass. It runs against a fixture
// queue file OR the live KV queue (read via the wrangler CLI).
//
// What it does per request:
//   - map the feedback fields (canonical id, else en/da label) → brand/model/notes;
//   - FDM scope-check (brand+model only) — auto-decline resin / non-FDM;
//   - resolve/infer brand; exact-match novel-vs-existing against data/printers.json;
//   - dedupe against the bundled catalog (+ in-queue, with a request count);
//   - triage everything that fails the promotion gate into buckets;
//   - emit `needs-research` (candidate stream, FDM **unconfirmed** — the assisted
//     pass must source-confirm FDM + specs before anything ships);
//   - surface parse / timestamp errors instead of silently dropping them;
//   - write a PII-safe run-report (always to stdout) + private candidate
//     skeletons (only with --out, to a gitignored staging path).
//
// PRIVACY: the run report never contains a raw email or raw note text (email is
// reduced to a short hash + the KV key for retrieval; notes are reduced to a
// presence/length flag). Raw requester notes appear only in candidate skeletons,
// which are written solely to a gitignored + asset-ignored staging dir.
//
// It is read-only on printers.json and never commits or mutates source-of-truth.
//
// Usage:
//   node scripts/printer-intake-scout.js [--source fixtures|kv] [--queue <path>]
//        [--out <dir>] [--config <path>] [--watermark-file <path>]
//        [--no-watermark] [--reset-watermark] [--use-config-token]
//        [--wrangler-bin <path>] [--quiet]
//
// Exit 0 = ran (including the empty-queue stop condition).
// Exit 2 = stop condition: queue unreadable / KV read failed / bad args.
//
// kv source auth: the wrangler CLI's own auth is used — your `wrangler login`
// OAuth session (current) or a CLOUDFLARE_API_TOKEN set in the environment (for
// scheduled runs). --use-config-token additionally injects a token from the
// gitignored config file as CLOUDFLARE_API_TOKEN. The token is never logged.
//
// Contracts: ai-operating-model/docs/agents/printer-intake-scout.md (+ companion
// printer-addition-assistant.md). Operationalizes Phase 1 (taxonomy + FDM scope)
// of docs/runbooks/printer-addition-protocol.md.

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
// Conventional gitignored + asset-ignored staging dir for --out artifacts.
const DEFAULT_STAGING = path.join(__dirname, '.printer-intake-out');

// ─── Args ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {
    source: 'fixtures',                 // 'fixtures' | 'kv'
    queue: path.join(__dirname, 'fixtures', 'printer-intake-sample.json'),
    config: path.join(__dirname, '.printer-intake.local.json'),
    watermarkFile: path.join(__dirname, '.printer-intake.watermark.json'),
    useWatermark: true,
    resetWatermark: false,
    useConfigToken: false,
    wranglerBin: null,
    out: null,
    quiet: false,
    unknown: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = (flag) => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) {
        console.error(`STOP: ${flag} needs a value`);
        process.exit(2);
      }
      i++; return v;
    };
    switch (a) {
      case '--source': out.source = val(a); break;
      case '--queue': out.queue = val(a); break;
      case '--config': out.config = val(a); break;
      case '--watermark-file': out.watermarkFile = val(a); break;
      case '--wrangler-bin': out.wranglerBin = val(a); break;
      case '--out': out.out = val(a); break;
      case '--no-watermark': out.useWatermark = false; break;
      case '--reset-watermark': out.resetWatermark = true; break;
      case '--use-config-token': out.useConfigToken = true; break;
      case '--quiet': out.quiet = true; break;
      case '-h': case '--help': out.help = true; break;
      default: out.unknown.push(a);
    }
  }
  return out;
}

// Known, non-secret Cloudflare resource ids (namespace id is also committed in
// wrangler.toml). Override via env or --config. No secret has a default.
const DEFAULT_ACCOUNT_ID   = '038ac75563c82b3641d1626510938c1b';
const DEFAULT_NAMESPACE_ID = 'f3d89a4e70a34e3fab1c0f7676efebb5';

function usage() {
  console.error('Usage: node scripts/printer-intake-scout.js [options]');
  console.error('');
  console.error('  --source <fixtures|kv>   intake source (default: fixtures)');
  console.error('  --queue <path>           fixtures source: queue JSON file');
  console.error('  --out <dir>              also write run-report.json + private candidate-*.json');
  console.error('                           (must be a gitignored staging path or outside the repo)');
  console.error('  --config <path>          kv source: optional config (account/namespace overrides)');
  console.error('  --watermark-file <path>  kv source: persisted watermark state');
  console.error('  --no-watermark           kv source: do not read/advance the watermark');
  console.error('  --reset-watermark        kv source: ignore the existing watermark this run');
  console.error('  --use-config-token       kv source: inject config token as CLOUDFLARE_API_TOKEN');
  console.error('  --wrangler-bin <path>    kv source: override the wrangler invocation (testing)');
  console.error('  --quiet                  print a one-line summary instead of the full report');
  console.error('');
  console.error('Deterministic triage only — no research / LLM. Read-only on printers.json.');
  console.error('kv source reads the live PRINTER_INTAKE queue via the wrangler CLI (its own auth).');
}

// ─── Normalisation helpers ───────────────────────────────────────────────────
// Strip to lowercase alphanumerics — fuzzy model/brand equality so "X1 Carbon",
// "x1-carbon", and id "x1c" compare on equal footing where appropriate.
function norm(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '');
}
// snake_case id suggestion, e.g. "Ender-5 S1" → "ender_5_s1".
function snake(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
// Leading alpha token of a model name, e.g. "Ender-3 V3" → "ender".
function leadingToken(s) {
  const m = String(s == null ? '' : s).toLowerCase().match(/[a-z]+/);
  return m ? m[0] : '';
}
// Short, non-reversible identity hash for an email — lets the report dedupe and
// reference a requester WITHOUT disclosing the address.
function shortHash(s) {
  return s ? crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 12) : null;
}
function firstLine(s) {
  const t = String(s == null ? '' : s);
  return (t.split('\n').find(l => l.trim()) || t.slice(0, 200)).trim();
}

// ─── Field mapping (canonical id, else en/da label) ──────────────────────────
// feedback-form.js missingPrinter fields carry a stable `id` (brand/model/notes)
// plus a TRANSLATED `label`. Prefer the id (locale-proof); fall back to the label
// for legacy entries written before the id was added. Unmapped non-empty fields
// are folded into notes so nothing is silently lost.
const BRAND_LABEL = /\b(brand|m[æae]rke|manufacturer|make)\b/i;
const MODEL_LABEL = /\b(model|printer)\b/i;
const NOTES_LABEL = /\b(note|noter|notes)\b/i;

function mapFields(fields) {
  let brand = '', model = '', notes = '';
  const extra = [];
  for (const f of Array.isArray(fields) ? fields : []) {
    const id = (f && typeof f.id === 'string') ? f.id.trim().toLowerCase() : '';
    const label = (f && typeof f.label === 'string') ? f.label : '';
    const value = (f && typeof f.value === 'string') ? f.value.trim() : '';
    if (!value) continue;
    let slot = null;
    if (id === 'brand' || (!id && BRAND_LABEL.test(label))) slot = 'brand';
    else if (id === 'model' || (!id && MODEL_LABEL.test(label))) slot = 'model';
    else if (id === 'notes' || (!id && NOTES_LABEL.test(label))) slot = 'notes';

    if (slot === 'brand' && !brand) brand = value;
    else if (slot === 'model' && !model) model = value;
    else if (slot === 'notes') notes = notes ? `${notes}\n${value}` : value;
    else extra.push(`${label || id || 'field'}: ${value}`); // dup or unmapped → preserve
  }
  if (extra.length) notes = notes ? `${notes}\n${extra.join('\n')}` : extra.join('\n');
  return { brand, model, notes };
}

// ─── FDM scope check ─────────────────────────────────────────────────────────
// Decline resin (MSLA/LCD/SLA/DLP), powder-bed (SLS/MJF), and other non-FDM.
// Matched against brand + model ONLY (never free-text notes — a note like "this
// is NOT a resin printer" must not trigger a decline). This is a NON-EXHAUSTIVE
// heuristic pre-filter: a request that survives is NOT confirmed FDM — the
// assisted pass MUST source-confirm FDM before any add (printer-addition-protocol
// Phase 1 step 0). New resin lines not listed here will slip through to
// needs-research with fdmStatus:"unconfirmed" and be caught downstream.
const RESIN_MODEL_KEYWORDS = [
  'photon', 'saturn', 'mars', 'halot', 'sonic', 'phrozen', 'formlabs',
  'jupiter', 'mighty', 'proxima', 'shuffle', 'nova3d', 'peopoly',
  'form 1', 'form 2', 'form 3', 'form 4', 'mono x',
];
const NON_FDM_TECH_PATTERNS = [
  /\bresin\b/, /\bmsla\b/, /\bsla\b/, /\bdlp\b/, /\bsls\b/, /\bmjf\b/, /\blcd printer\b/,
];
function fdmDecline(brand, model) {
  const hay = `${brand} ${model}`.toLowerCase();
  for (const kw of RESIN_MODEL_KEYWORDS) {
    if (hay.includes(kw)) return `non-FDM model keyword "${kw}" (resin/MSLA out of scope)`;
  }
  for (const re of NON_FDM_TECH_PATTERNS) {
    if (re.test(hay)) return `non-FDM technology keyword /${re.source}/`;
  }
  return null;
}

// ─── Catalog index ───────────────────────────────────────────────────────────
function loadCatalog() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'printers.json'), 'utf8'));
  const brands = data.brands || [];
  const printers = data.printers || [];

  const brandByNorm = new Map();   // norm(name)/norm(id) → brand id
  for (const b of brands) {
    brandByNorm.set(norm(b.id), b.id);
    brandByNorm.set(norm(b.name), b.id);
  }
  const BRAND_TOKEN_ALIASES = {
    bambu: 'bambu_lab', bambulab: 'bambu_lab',
    creality: 'creality', prusa: 'prusa', prusaresearch: 'prusa',
    anycubic: 'anycubic', qidi: 'qidi', elegoo: 'elegoo', sovol: 'sovol',
    flashforge: 'flashforge', artillery: 'artillery',
    anker: 'anker', ankermake: 'anker', voron: 'voron',
  };

  // family token → manufacturer, only when unambiguous (single brand).
  const familyCount = new Map();
  for (const p of printers) {
    const tok = leadingToken(p.name);
    if (!tok) continue;
    if (!familyCount.has(tok)) familyCount.set(tok, new Set());
    familyCount.get(tok).add(p.manufacturer);
  }
  const familyToBrand = new Map();
  for (const [tok, set] of familyCount) if (set.size === 1) familyToBrand.set(tok, [...set][0]);

  // per-manufacturer dedupe index + a GLOBAL model index (norm(model) →
  // [printers]) so a model-only request can be matched even when the brand
  // can't be inferred (e.g. ambiguous family token "x" for "X1 Carbon").
  const printerByKey = new Map();      // `${mfr}|${normModel}` → rec
  const globalModelIndex = new Map();  // normModel → [rec]
  const idSet = new Set();             // every existing printer id (collision check)
  for (const p of printers) {
    const rec = { id: p.id, name: p.name, manufacturer: p.manufacturer };
    idSet.add(p.id);
    for (const key of [norm(p.name), norm(p.id)]) {
      printerByKey.set(`${p.manufacturer}|${key}`, rec);
      if (!globalModelIndex.has(key)) globalModelIndex.set(key, []);
      const arr = globalModelIndex.get(key);
      if (!arr.some(r => r.id === rec.id)) arr.push(rec);
    }
  }

  return { brands, brandByNorm, BRAND_TOKEN_ALIASES, familyToBrand, printerByKey, globalModelIndex, idSet };
}

// resolve a free-text brand string → {id, known}. EXACT normalized match only
// (brand id, brand name, or a known alias). No sub-word / substring matching:
// "Anker-clone" must NOT become AnkerMake — it falls through to an unknown,
// owner-reviewed new-brand candidate. A legit multi-word brand we don't yet know
// (e.g. "Creality 3D") is likewise surfaced as a new-brand candidate rather than
// silently misattributed.
function resolveBrand(brandRaw, cat) {
  const n = norm(brandRaw);
  if (!n) return null;
  if (cat.brandByNorm.has(n)) return { id: cat.brandByNorm.get(n), known: true };
  if (cat.BRAND_TOKEN_ALIASES[n]) return { id: cat.BRAND_TOKEN_ALIASES[n], known: true };
  return { id: snake(brandRaw), known: false }; // unknown brand → new-brand candidate
}

// suggest a printers.json id; if it collides with an existing id under a
// DIFFERENT manufacturer, prefix with the manufacturer and flag it for the owner.
function suggestId(manufacturer, model, cat) {
  const base = snake(model);
  if (!cat.idSet.has(base)) return { id: base, collision: false };
  const prefixed = `${snake(manufacturer)}_${base}`;
  return { id: cat.idSet.has(prefixed) ? `${prefixed}_new` : prefixed, collision: true };
}

// ─── Classification ──────────────────────────────────────────────────────────
function classify(entry, cat) {
  // KV value that could not be parsed → explicit error outcome (never swallowed).
  if (entry && entry._parseError) {
    return {
      outcome: 'parse-error',
      reason: `KV value is not valid JSON${entry._key ? ` (key ${entry._key})` : ''}`,
      request: { brand: null, model: null, appSource: null, receivedAt: null,
        hasNotes: false, notesLength: 0, hasEmail: false, emailHash: null, key: entry._key || null },
      _private: { notes: null, email: null },
    };
  }

  const { brand, model, notes } = mapFields(entry && entry.fields);
  const rawEmail = (entry && typeof entry.email === 'string' && entry.email.trim()) ? entry.email.trim() : null;
  const request = {
    brand: brand || null,
    model: model || null,
    appSource: (entry && entry.appSource) || null,
    receivedAt: (entry && entry.receivedAt) || null,
    hasNotes: !!notes,
    notesLength: notes ? notes.length : 0,
    hasEmail: !!rawEmail,
    emailHash: shortHash(rawEmail),       // hashed identity, never the address
    key: (entry && entry._key) || null,   // KV key — owner retrieves raw email from KV
  };
  const base = { request, _private: { notes: notes || null, email: rawEmail } };

  // (a) nothing actionable
  if (!brand && !model) {
    return Object.assign({ outcome: 'unactionable', reason: 'no brand and no model in submission' }, base);
  }

  // (b) FDM scope — decline before anything else (brand+model only).
  const declineReason = fdmDecline(brand, model);
  if (declineReason) {
    return Object.assign({ outcome: 'declined-non-fdm', reason: declineReason }, base);
  }

  // (c) resolve brand; for model-only, try an exact global catalog match FIRST,
  //     then family-token inference.
  let resolvedBrandId = null, brandKnown = false, inferred = false;
  if (brand) {
    const rb = resolveBrand(brand, cat);
    resolvedBrandId = rb.id; brandKnown = rb.known;
  } else {
    const exact = cat.globalModelIndex.get(norm(model)) || [];
    if (exact.length === 1) {
      // unambiguous existing printer → dedupe path picks it up below
      resolvedBrandId = exact[0].manufacturer; brandKnown = true; inferred = true;
    } else if (exact.length > 1) {
      return Object.assign({ outcome: 'incomplete',
        reason: `model matches multiple catalog printers (${exact.map(r => r.id).join(', ')}); brand needed to disambiguate` }, base);
    } else {
      const tok = leadingToken(model);
      if (tok && cat.familyToBrand.has(tok)) { resolvedBrandId = cat.familyToBrand.get(tok); brandKnown = true; inferred = true; }
    }
  }

  // (d) incomplete
  if (brand && !model) {
    return Object.assign({ outcome: 'incomplete', reason: 'brand given but no model' }, base);
  }
  if (!brand && !resolvedBrandId) {
    return Object.assign({ outcome: 'incomplete', reason: 'model given but brand could not be inferred' }, base);
  }

  // (e) dedupe against bundled catalog (within resolved brand)
  const dupRec = cat.printerByKey.get(`${resolvedBrandId}|${norm(model)}`);
  if (dupRec) {
    return Object.assign({
      outcome: 'duplicate',
      reason: `already in bundled printers.json as '${dupRec.id}'`,
      resolved: { manufacturer: resolvedBrandId, manufacturerInferred: inferred, model },
      matchedPrinter: { id: dupRec.id, name: dupRec.name },
    }, base);
  }

  // (f) novel → candidate stream (needs-research). FDM is NOT confirmed here.
  const sug = suggestId(resolvedBrandId, model, cat);
  return Object.assign({
    outcome: 'needs-research',
    reason: 'novel printer (FDM not yet confirmed); assisted pass must verify FDM + research specs before adding',
    resolved: {
      manufacturer: resolvedBrandId,
      manufacturerInferred: inferred,
      model,
      suggestedId: sug.id,
    },
    isNewBrand: !brandKnown,
    fdmStatus: 'unconfirmed',
    idCollision: sug.collision,
  }, base);
}

// ─── In-queue dedupe ─────────────────────────────────────────────────────────
function collapse(items) {
  const out = [];
  const index = new Map();
  for (const it of items) {
    let key = null;
    if (it.outcome === 'needs-research' && it.resolved) key = `nr:${it.resolved.manufacturer}|${norm(it.resolved.model)}`;
    else if (it.outcome === 'duplicate' && it.matchedPrinter) key = `dup:${it.matchedPrinter.id}`;

    if (key && index.has(key)) {
      const tgt = out[index.get(key)];
      tgt.requestCount += 1;
      if (it.request.receivedAt) tgt.requestedAt.push(it.request.receivedAt);
      if (it.request.key) tgt.requestKeys.push(it.request.key);
      if (it.request.emailHash && !tgt.emailHashes.includes(it.request.emailHash)) tgt.emailHashes.push(it.request.emailHash);
      continue;
    }
    const rec = Object.assign({}, it, {
      requestCount: 1,
      requestedAt: it.request.receivedAt ? [it.request.receivedAt] : [],
      requestKeys: it.request.key ? [it.request.key] : [],
      emailHashes: it.request.emailHash ? [it.request.emailHash] : [],
    });
    if (key) index.set(key, out.length);
    out.push(rec);
  }
  return out;
}

// ─── Candidate skeleton (written to gitignored staging only) ─────────────────
function candidateSkeleton(item) {
  const r = item.resolved;
  const riskFlags = [];
  if (item.isNewBrand) riskFlags.push('new brand — requires explicit owner sign-off');
  if (item.idCollision) riskFlags.push(`suggested id collides with an existing printer id — owner must confirm/rename`);
  riskFlags.push('FDM NOT confirmed — verify the printer is FDM (not resin/other) before any add');
  riskFlags.push('series_group not yet decided — reuse a sibling label, never invent');
  riskFlags.push('overlay publish reaches current iOS users — taxonomy must be confirmed');

  const FIELD = () => ({ value: null, source: null, confidence: 'low-confidence' });
  return {
    schema: 'printer-intake-candidate@1',
    _private: true, // contains requester note text — keep out of git / served assets
    verdict: 'needs-research',
    fdmStatus: 'unconfirmed',
    note: 'Deterministic Scout output. FDM + specs UNVERIFIED — the Printer '
        + 'Addition Assistant must confirm the printer is FDM and research every '
        + 'field from authoritative sources before this can ship.',
    request: item.request,                 // PII-safe (hashed email, no raw email)
    requesterNote: item._private.notes,    // research context; private staging only
    contact: {
      emailHash: item.request.emailHash,
      kvKeys: item.requestKeys,
      note: 'raw reply-to email is in the KV entry under kvKeys — retrieve it there to contact the requester',
    },
    requestCount: item.requestCount,
    requestedAt: item.requestedAt,
    proposedTaxonomy: {
      manufacturer: r.manufacturer,
      manufacturerInferred: r.manufacturerInferred,
      isNewBrand: !!item.isNewBrand,
      series_group: null,
      id: r.suggestedId,
      idCollision: !!item.idCollision,
      name: r.model,
    },
    printersJsonRow: {
      id: r.suggestedId, name: r.model, manufacturer: r.manufacturer,
      series: FIELD(), series_group: FIELD(), enclosure: FIELD(),
      max_nozzle_temp: FIELD(), max_bed_temp: FIELD(), max_speed: FIELD(),
      available_nozzle_sizes: FIELD(), multi_color_systems: FIELD(), available_plates: FIELD(),
    },
    overlayPayloadEntry: {
      note: 'additive overlay entry — fill only fields the overlay validator accepts '
          + '(see docs/specs/ios-remote-printer-catalog.md allowlist)',
      id: r.suggestedId, name: r.model, manufacturer: r.manufacturer,
    },
    validatorDryRun: { ran: false, reason: 'deferred to the assisted pass — no researched spec data yet' },
    riskFlags,
    nextStep: 'Hand to the Printer Addition Assistant: confirm FDM, research specs, '
            + 'fill the row + overlay entry, run validate-data / picker-dry-run / '
            + 'overlay validator, then owner-approve + ship.',
  };
}

// ─── Config + live KV read (via wrangler CLI) ────────────────────────────────
function loadConfig(configPath) {
  let fileCfg = {};
  try { fileCfg = JSON.parse(fs.readFileSync(configPath, 'utf8')); }
  catch (_) { /* optional */ }
  return {
    token: process.env.CF_API_TOKEN || fileCfg.cfApiToken || fileCfg.token || null,
    accountId: process.env.CF_ACCOUNT_ID || fileCfg.accountId || DEFAULT_ACCOUNT_ID,
    namespaceId: process.env.CF_KV_NAMESPACE_ID || fileCfg.namespaceId || DEFAULT_NAMESPACE_ID,
  };
}

function runWrangler(args, cfg, opts) {
  const env = Object.assign({}, process.env, { CLOUDFLARE_ACCOUNT_ID: cfg.accountId });
  if (opts.useConfigToken && cfg.token) env.CLOUDFLARE_API_TOKEN = cfg.token;
  if (opts.wranglerBin) return execFileSync(opts.wranglerBin, args, { env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return execFileSync('npx', ['wrangler', ...args], { env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

// Returns { entries, errors }. Throws (→ exit 2) only if the key LIST fails, so
// the watermark never advances on an unreadable queue. A single bad value GET is
// recorded as an error, not fatal.
function kvFetchViaWrangler(cfg, opts) {
  let listOut;
  try {
    listOut = runWrangler(['kv', 'key', 'list', '--namespace-id', cfg.namespaceId], cfg, opts);
  } catch (e) {
    throw new Error(`wrangler kv key list failed (auth / namespace?): ${firstLine(e.stderr || e.message)}`);
  }
  let keys;
  try { keys = JSON.parse(listOut).map(k => k.name); }
  catch (e) { throw new Error(`could not parse wrangler key list output: ${e.message}`); }

  const entries = [], errors = [];
  // The wrangler CLI auto-paginates `kv key list`, but guard against a future
  // change (or a per-page cap) silently truncating a large queue: surface it.
  if (keys.length >= 1000) {
    errors.push({ type: 'kv-list-page-cap', count: keys.length,
      note: 'wrangler returned >=1000 keys — if the CLI ever stops auto-paginating, '
          + 'entries beyond the first page would be missed. Verify coverage.' });
  }
  for (const name of keys) {
    let valOut;
    try { valOut = runWrangler(['kv', 'key', 'get', '--namespace-id', cfg.namespaceId, name], cfg, opts); }
    catch (e) { errors.push({ type: 'kv-get-failed', key: name, reason: firstLine(e.stderr || e.message) }); continue; }
    try { const entry = JSON.parse(valOut); entry._key = name; entries.push(entry); }
    catch (_) { entries.push({ _key: name, _parseError: true, fields: [] }); }
  }
  return { entries, errors };
}

// ─── Watermark ───────────────────────────────────────────────────────────────
function readWatermark(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (_) { return { lastReceivedAt: null }; }
}
function writeWatermark(file, lastReceivedAt) {
  fs.writeFileSync(file, JSON.stringify({ lastReceivedAt, updatedAt: new Date().toISOString() }, null, 2) + '\n');
}
function validTs(v) { return typeof v === 'string' && !Number.isNaN(Date.parse(v)); }
// Numeric (Date.parse) ordering — never lexical, so a parse-valid non-ISO stamp
// can't sort wrong. Returns the original string with the newest instant.
function maxReceivedAt(entries) {
  let max = null, maxN = -Infinity;
  for (const e of entries) {
    const r = e && e.receivedAt;
    if (validTs(r)) { const n = Date.parse(r); if (n > maxN) { maxN = n; max = r; } }
  }
  return max;
}
function newerThan(a, b) { return Date.parse(a) > Date.parse(b); } // a, b must be validTs

// ─── --out safety ────────────────────────────────────────────────────────────
// Candidate skeletons carry raw requester notes, and the repo root is served as
// Cloudflare assets, so PII-bearing output must never land somewhere committable
// OR servable. Two safe cases only:
//   - any path OUTSIDE the repo (not committed, not served), or
//   - the single approved in-repo staging dir, which is BOTH gitignored AND
//     asset-ignored (scripts/.printer-intake-out/, covered by `scripts/**`).
// Anything else inside the repo is refused. A whitelist is used rather than a
// `git check-ignore` probe because (a) git's dir-only rules don't match the bare
// resolved dir path — that false-refused the documented staging dir — and (b)
// gitignore coverage alone does NOT imply asset-ignore coverage (e.g.
// `bambu configs/` is gitignored but still served).
// Canonicalize a path even if its leaf doesn't exist yet: realpath the nearest
// existing ancestor (resolving symlinks AND the true on-disk casing on a
// case-insensitive FS), then re-append the missing tail. This closes the macOS
// case-insensitive bypass (`/repo/../3DPrintAssistant/data`) and the symlink
// bypass — both would otherwise read as "outside the repo".
function realCanon(p) {
  let cur = path.resolve(p);
  const tail = [];
  for (;;) {
    try {
      const real = fs.realpathSync.native(cur);
      return tail.length ? path.join(real, ...tail) : real;
    } catch (_) {
      const parent = path.dirname(cur);
      if (parent === cur) return path.resolve(p); // reached FS root; nothing resolved
      tail.unshift(path.basename(cur));
      cur = parent;
    }
  }
}

function assertSafeOutDir(outDir) {
  const abs = realCanon(outDir);
  const root = realCanon(ROOT);
  const insideRepo = abs === root || abs.startsWith(root + path.sep);
  if (!insideRepo) return;                          // genuinely outside repo: safe
  if (abs === realCanon(DEFAULT_STAGING)) return;   // approved staging dir: safe
  console.error(`STOP: refusing --out '${outDir}' — it resolves inside the repo (served as assets); `
    + `only the approved staging dir (${path.relative(ROOT, DEFAULT_STAGING)}/, which is gitignored AND `
    + `asset-ignored) may receive in-repo output. Use that, or a path outside the repo. Candidate `
    + `skeletons can contain requester notes.`);
  process.exit(2);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); process.exit(0); }
  if (args.unknown.length) { console.error(`STOP: unknown argument(s): ${args.unknown.join(', ')}`); usage(); process.exit(2); }
  if (args.out) assertSafeOutDir(args.out);

  let entries = [];
  const sourceMeta = { source: args.source };
  const runErrors = [];
  let watermarkToAdvance = null;

  if (args.source === 'fixtures') {
    let raw;
    try { raw = fs.readFileSync(args.queue, 'utf8'); }
    catch (e) { console.error(`STOP: cannot read intake queue '${args.queue}': ${e.code || e.message}`); process.exit(2); }
    let queue;
    try { queue = JSON.parse(raw); }
    catch (e) { console.error(`STOP: intake queue '${args.queue}' is not valid JSON: ${e.message}`); process.exit(2); }
    if (!Array.isArray(queue)) { console.error(`STOP: intake queue '${args.queue}' is not a JSON array`); process.exit(2); }
    sourceMeta.queue = args.queue;
    entries = queue;
  } else if (args.source === 'kv') {
    const cfg = loadConfig(args.config);
    let wm = (args.useWatermark && !args.resetWatermark) ? readWatermark(args.watermarkFile) : { lastReceivedAt: null };
    // A corrupt persisted watermark must NOT silently gate out fresh entries.
    if (wm.lastReceivedAt && !validTs(wm.lastReceivedAt)) {
      runErrors.push({ type: 'invalid-watermark', value: wm.lastReceivedAt,
        note: 'persisted watermark is not a valid timestamp — ignored this run (treated as no watermark)' });
      wm = { lastReceivedAt: null };
    }
    let fetched;
    try {
      const r = kvFetchViaWrangler(cfg, { wranglerBin: args.wranglerBin, useConfigToken: args.useConfigToken });
      fetched = r.entries; runErrors.push(...r.errors);
    } catch (e) { console.error(`STOP: ${e.message}`); process.exit(2); }

    // Partition by timestamp validity. Entries with a valid receivedAt are
    // watermark-gated; entries WITHOUT one (incl. parse errors) are ALWAYS
    // processed so they can never be silently dropped — and they never advance
    // the watermark, so they re-surface until fixed or removed.
    const valid = [], noTs = [];
    for (const e of fetched) (validTs(e && e.receivedAt) ? valid : noTs).push(e);
    for (const e of noTs) {
      if (!e._parseError) runErrors.push({ type: 'missing-or-invalid-receivedAt', key: e._key || null,
        note: 'processed this run; re-surfaces until it has a valid receivedAt or is removed' });
    }
    const freshValid = wm.lastReceivedAt ? valid.filter(e => newerThan(e.receivedAt, wm.lastReceivedAt)) : valid;
    entries = [...freshValid, ...noTs];

    sourceMeta.namespaceId = cfg.namespaceId;
    sourceMeta.totalKeys = fetched.length;
    sourceMeta.processed = entries.length;
    sourceMeta.watermarkIn = wm.lastReceivedAt;
    if (args.useWatermark) {
      // advance only past valid timestamps actually fetched this run
      const maxValid = maxReceivedAt(valid);
      watermarkToAdvance = (maxValid && (!wm.lastReceivedAt || newerThan(maxValid, wm.lastReceivedAt))) ? maxValid : wm.lastReceivedAt;
    }
  } else {
    console.error(`STOP: unknown --source '${args.source}' (expected 'fixtures' or 'kv')`);
    process.exit(2);
  }

  const cat = loadCatalog();
  const items = collapse(entries.map(e => classify(e, cat)));

  // surface parse errors that came through classification
  for (const it of items) {
    if (it.outcome === 'parse-error') runErrors.push({ type: 'parse-error', key: it.request.key, reason: it.reason });
  }

  const counts = { needs_research: 0, duplicate: 0, declined_non_fdm: 0, incomplete: 0,
    unverified_model: 0, parse_error: 0, unactionable: 0 };
  const keyFor = { 'needs-research': 'needs_research', 'duplicate': 'duplicate',
    'declined-non-fdm': 'declined_non_fdm', 'incomplete': 'incomplete',
    'parse-error': 'parse_error', 'unactionable': 'unactionable' };
  for (const it of items) { const k = keyFor[it.outcome]; if (k) counts[k] += 1; }

  const inQueueCollapses = items.filter(it => it.requestCount > 1).map(it => ({
    key: it.resolved ? `${it.resolved.manufacturer}|${norm(it.resolved.model)}` : (it.matchedPrinter ? it.matchedPrinter.id : null),
    name: it.resolved ? it.resolved.model : (it.matchedPrinter ? it.matchedPrinter.name : null),
    outcome: it.outcome, requestCount: it.requestCount,
  }));

  // candidate skeletons (needs-research), written only with --out
  const candItems = items.filter(it => it.outcome === 'needs-research');
  const candidateFiles = [];
  const usedNames = new Set();
  const nameFor = (it) => {
    let n = `candidate-${snake(it.resolved.manufacturer)}-${snake(it.resolved.model)}.json`;
    let i = 2; while (usedNames.has(n)) n = `candidate-${snake(it.resolved.manufacturer)}-${snake(it.resolved.model)}-${i++}.json`;
    usedNames.add(n); return n;
  };
  for (const it of candItems) { it.candidate = nameFor(it); candidateFiles.push(it.candidate); }

  const report = {
    tool: 'printer-intake-scout', version: 2,
    source: sourceMeta,
    queueCount: entries.length,
    counts,
    inQueueCollapses,
    candidates: candidateFiles,
    items: items.map(it => ({
      outcome: it.outcome,
      reason: it.reason,
      request: it.request,                 // PII-safe
      resolved: it.resolved || null,
      matchedPrinter: it.matchedPrinter || null,
      isNewBrand: !!it.isNewBrand,
      fdmStatus: it.fdmStatus || null,
      idCollision: !!it.idCollision,
      requestCount: it.requestCount,
      requestedAt: it.requestedAt,
      requestKeys: it.requestKeys,
      emailHashes: it.emailHashes,
      candidate: it.candidate || null,
    })),
    errors: runErrors,
  };

  // Write artifacts AFTER the watermark is finalised so run-report.json records
  // the advanced watermark.
  if (args.source === 'kv' && args.useWatermark && watermarkToAdvance !== null) {
    report.source.watermarkOut = watermarkToAdvance;
  }
  if (args.out) {
    fs.mkdirSync(args.out, { recursive: true });
    for (const it of candItems) {
      fs.writeFileSync(path.join(args.out, it.candidate), JSON.stringify(candidateSkeleton(it), null, 2) + '\n');
    }
    fs.writeFileSync(path.join(args.out, 'run-report.json'), JSON.stringify(report, null, 2) + '\n');
  }
  if (args.source === 'kv' && args.useWatermark && watermarkToAdvance !== null) {
    writeWatermark(args.watermarkFile, watermarkToAdvance);
  }

  if (args.quiet) {
    const c = counts;
    console.log(`scout: ${entries.length} in → ${c.needs_research} needs-research, ${c.duplicate} dup, `
      + `${c.declined_non_fdm} declined, ${c.incomplete} incomplete, ${c.parse_error} parse-error, `
      + `${c.unactionable} unactionable${runErrors.length ? ` (${runErrors.length} error(s))` : ''}`);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
  process.exit(0);
}

main().catch(e => {
  console.error(`STOP: unexpected error: ${e && e.message ? e.message : e}`);
  process.exit(2);
});
