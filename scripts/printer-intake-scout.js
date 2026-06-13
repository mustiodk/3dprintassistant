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
// queue file (same shape feedback.js writes), so it needs no KV / live infra.
//
// What it does per request:
//   - map the feedback fields (en + da labels) → brand / model / notes;
//   - FDM scope-check — auto-decline resin / non-FDM (Photon, Saturn, Mars, …);
//   - infer a brand from the catalog family token for model-only requests;
//   - dedupe against bundled data/printers.json (skip printers already present);
//   - in-queue dedupe — collapse repeat requests for the same printer w/ a count;
//   - triage everything that fails the promotion gate into buckets;
//   - emit `needs-research` (candidate stream) for brand + model + novel + FDM —
//     the spec-confirm step is deferred to the assisted pass;
//   - write a run-report JSON (always to stdout) + one candidate skeleton per
//     needs-research item (only when --out <dir> is given).
//
// It is read-only on printers.json and never commits or mutates source-of-truth.
//
// Usage:
//   node scripts/printer-intake-scout.js [--queue <path>] [--out <dir>] [--quiet]
//
// Defaults: --queue scripts/fixtures/printer-intake-sample.json
//
// Exit 0 = ran (including the empty-queue stop condition).
// Exit 2 = stop condition: queue unreadable / not valid JSON array.
//
// Contracts: ai-operating-model/docs/agents/printer-intake-scout.md (+ companion
// printer-addition-assistant.md). Operationalizes Phase 1 (taxonomy + FDM scope)
// of docs/runbooks/printer-addition-protocol.md.

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ─── Args ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {
    source: 'fixtures',                 // 'fixtures' | 'kv'
    queue: path.join(__dirname, 'fixtures', 'printer-intake-sample.json'),
    config: path.join(__dirname, '.printer-intake.local.json'),
    watermarkFile: path.join(__dirname, '.printer-intake.watermark.json'),
    useWatermark: true,
    resetWatermark: false,
    out: null,
    quiet: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--source') out.source = argv[++i];
    else if (a === '--queue') out.queue = argv[++i];
    else if (a === '--config') out.config = argv[++i];
    else if (a === '--watermark-file') out.watermarkFile = argv[++i];
    else if (a === '--no-watermark') out.useWatermark = false;
    else if (a === '--reset-watermark') out.resetWatermark = true;
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--quiet') out.quiet = true;
    else if (a === '-h' || a === '--help') { out.help = true; }
    else { out.unknown = a; }
  }
  return out;
}

// Known, non-secret Cloudflare resource ids (namespace id is also committed in
// wrangler.toml). Only the API token is secret — it comes from env / the
// gitignored config file. Override any of these via env or --config.
const DEFAULT_ACCOUNT_ID   = '038ac75563c82b3641d1626510938c1b';
const DEFAULT_NAMESPACE_ID = 'f3d89a4e70a34e3fab1c0f7676efebb5';

function usage() {
  console.error('Usage: node scripts/printer-intake-scout.js [options]');
  console.error('');
  console.error('  --source <fixtures|kv>   intake source (default: fixtures)');
  console.error('  --queue <path>           fixtures source: queue JSON file');
  console.error('  --config <path>          kv source: secret config (default: scripts/.printer-intake.local.json)');
  console.error('  --watermark-file <path>  kv source: persisted watermark state');
  console.error('  --no-watermark           kv source: do not read/advance the watermark');
  console.error('  --reset-watermark        kv source: ignore the existing watermark this run');
  console.error('  --out <dir>              also write run-report.json + candidate-*.json files');
  console.error('  --quiet                  print a one-line summary instead of the full report');
  console.error('');
  console.error('Triages teed missing-printer feedback into a run report + candidate skeletons.');
  console.error('Deterministic triage only — no research / LLM. Read-only on printers.json.');
  console.error('kv source reads the live PRINTER_INTAKE queue via the Cloudflare API; the');
  console.error('secret token comes from env CF_API_TOKEN or the gitignored --config file.');
}

// ─── Normalisation helpers ───────────────────────────────────────────────────
// Strip to lowercase alphanumerics — used for fuzzy model/brand equality so that
// "X1 Carbon" / "x1-carbon" / "X1C"(by id) all compare on equal footing.
function norm(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '');
}
// snake_case id suggestion, e.g. "Ender-5 S1" → "ender_5_s1".
function snake(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
// Leading alpha token of a model name, e.g. "Ender-3 V3" → "ender", "K1 Max" → "k".
// Used to derive the catalog family→brand map for model-only brand inference.
function leadingToken(s) {
  const m = String(s == null ? '' : s).toLowerCase().match(/[a-z]+/);
  return m ? m[0] : '';
}

// ─── Field mapping (en + da labels) ──────────────────────────────────────────
// feedback-form.js missingPrinter fields: Brand / Model / Notes, sent as the
// TRANSLATED label text. en: "Brand" / "Model" / "Notes (optional)";
// da: "Mærke" / "Model" / "Noter (valgfri)".
const BRAND_LABEL = /\b(brand|m[æae]rke|manufacturer|make)\b/i;
const MODEL_LABEL = /\b(model|printer)\b/i;
const NOTES_LABEL = /\b(note|noter|notes)\b/i;

function mapFields(fields) {
  let brand = '', model = '', notes = '';
  for (const f of Array.isArray(fields) ? fields : []) {
    const label = (f && typeof f.label === 'string') ? f.label : '';
    const value = (f && typeof f.value === 'string') ? f.value.trim() : '';
    if (!value) continue;
    if (BRAND_LABEL.test(label) && !brand) brand = value;
    else if (MODEL_LABEL.test(label) && !model) model = value;
    else if (NOTES_LABEL.test(label)) notes = notes ? `${notes}\n${value}` : value;
  }
  return { brand, model, notes };
}

// ─── FDM scope check ─────────────────────────────────────────────────────────
// Decline resin (MSLA/LCD/SLA/DLP), powder-bed (SLS/MJF), and other non-FDM.
// Matched against the brand+model+notes text. Model-line keywords are the strong
// signal (a brand alone is never decisive — Anycubic & Elegoo make FDM too).
// See printer-addition-protocol.md Phase 1 step 0.
const RESIN_MODEL_KEYWORDS = [
  'photon', 'saturn', 'mars', 'halot', 'sonic', 'phrozen', 'formlabs',
  'form 2', 'form 3', 'form 4', 'mono x',
];
const NON_FDM_TECH_KEYWORDS = [
  'resin', 'msla', '\\bsla\\b', '\\bdlp\\b', '\\bsls\\b', '\\bmjf\\b',
];
function fdmDecline(brand, model, notes) {
  const hay = `${brand} ${model} ${notes}`.toLowerCase();
  for (const kw of RESIN_MODEL_KEYWORDS) {
    if (hay.includes(kw)) return `non-FDM keyword "${kw}" (resin/MSLA out of scope)`;
  }
  for (const kw of NON_FDM_TECH_KEYWORDS) {
    if (new RegExp(kw).test(hay)) return `non-FDM technology keyword /${kw}/`;
  }
  return null;
}

// ─── Catalog index ───────────────────────────────────────────────────────────
function loadCatalog() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'printers.json'), 'utf8'));
  const brands = data.brands || [];
  const printers = data.printers || [];

  const brandIds = new Set(brands.map(b => b.id));
  // brand resolution: id, full name, and primary-token lookups.
  const brandByNorm = new Map(); // norm(name) → id, norm(id) → id
  for (const b of brands) {
    brandByNorm.set(norm(b.id), b.id);
    brandByNorm.set(norm(b.name), b.id);
  }
  // primary token aliases (e.g. "bambu" → bambu_lab, "ankermake" → anker)
  const BRAND_TOKEN_ALIASES = {
    bambu: 'bambu_lab', bambulab: 'bambu_lab',
    creality: 'creality', prusa: 'prusa', prusaresearch: 'prusa',
    anycubic: 'anycubic', qidi: 'qidi', elegoo: 'elegoo', sovol: 'sovol',
    flashforge: 'flashforge', artillery: 'artillery',
    anker: 'anker', ankermake: 'anker', voron: 'voron',
  };

  // family token (leading alpha token of each model name) → manufacturer, only
  // when that token maps to a single brand unambiguously. Powers model-only
  // brand inference ("Ender-7" → ender → creality).
  const familyCount = new Map(); // token → Set(manufacturer)
  for (const p of printers) {
    const tok = leadingToken(p.name);
    if (!tok) continue;
    if (!familyCount.has(tok)) familyCount.set(tok, new Set());
    familyCount.get(tok).add(p.manufacturer);
  }
  const familyToBrand = new Map();
  for (const [tok, set] of familyCount) {
    if (set.size === 1) familyToBrand.set(tok, [...set][0]);
  }

  // dedupe index: norm(name) and norm(id) → printer, per manufacturer.
  const printerByKey = new Map(); // `${manufacturer}|${normModel}` → {id,name,manufacturer}
  for (const p of printers) {
    const rec = { id: p.id, name: p.name, manufacturer: p.manufacturer };
    printerByKey.set(`${p.manufacturer}|${norm(p.name)}`, rec);
    printerByKey.set(`${p.manufacturer}|${norm(p.id)}`, rec);
  }

  return { brands, printers, brandIds, brandByNorm, BRAND_TOKEN_ALIASES, familyToBrand, printerByKey };
}

// resolve a free-text brand string → {id, known}. Unknown but non-empty brands
// are slugged and flagged as new brands (escalate review), never dropped.
function resolveBrand(brandRaw, cat) {
  const n = norm(brandRaw);
  if (!n) return null;
  if (cat.brandByNorm.has(n)) return { id: cat.brandByNorm.get(n), known: true };
  if (cat.BRAND_TOKEN_ALIASES[n]) return { id: cat.BRAND_TOKEN_ALIASES[n], known: true };
  // token-contains: any known brand primary token appearing in the input
  for (const [tok, id] of Object.entries(cat.BRAND_TOKEN_ALIASES)) {
    if (n.includes(tok)) return { id, known: true };
  }
  return { id: snake(brandRaw), known: false };
}

// ─── Classification ──────────────────────────────────────────────────────────
function classify(entry, cat) {
  const fields = entry && entry.fields;
  const { brand, model, notes } = mapFields(fields);
  const request = {
    brand: brand || null,
    model: model || null,
    notes: notes || null,
    email: (entry && typeof entry.email === 'string') ? entry.email : null,
    appSource: (entry && entry.appSource) || null,
    receivedAt: (entry && entry.receivedAt) || null,
  };

  // (a) nothing actionable
  if (!brand && !model) {
    return { outcome: 'unactionable', reason: 'no brand and no model in submission', request };
  }

  // (b) FDM scope — decline before anything else; resin requests never dedupe or
  //     become candidates.
  const declineReason = fdmDecline(brand, model, notes);
  if (declineReason) {
    return { outcome: 'declined-non-fdm', reason: declineReason, request };
  }

  // (c) brand inference for model-only requests
  let resolvedBrandId = null, brandKnown = false, inferred = false;
  if (brand) {
    const rb = resolveBrand(brand, cat);
    resolvedBrandId = rb.id; brandKnown = rb.known;
  } else {
    // model only — try family-token inference
    const tok = leadingToken(model);
    if (tok && cat.familyToBrand.has(tok)) {
      resolvedBrandId = cat.familyToBrand.get(tok); brandKnown = true; inferred = true;
    }
  }

  // (d) incomplete: brand-only, or model-only that couldn't resolve a brand
  if (brand && !model) {
    return { outcome: 'incomplete', reason: 'brand given but no model', request };
  }
  if (!brand && !resolvedBrandId) {
    return { outcome: 'incomplete', reason: 'model given but brand could not be inferred', request };
  }

  // (e) dedupe against bundled catalog
  const dupRec = cat.printerByKey.get(`${resolvedBrandId}|${norm(model)}`);
  if (dupRec) {
    return {
      outcome: 'duplicate',
      reason: `already in bundled printers.json as '${dupRec.id}'`,
      request,
      resolved: { manufacturer: resolvedBrandId, manufacturerInferred: inferred, model },
      matchedPrinter: { id: dupRec.id, name: dupRec.name },
    };
  }

  // (f) brand + model + novel + FDM → candidate stream (needs-research)
  return {
    outcome: 'needs-research',
    reason: 'novel FDM printer; specs need research before a candidate can ship',
    request,
    resolved: {
      manufacturer: resolvedBrandId,
      manufacturerInferred: inferred,
      model,
      suggestedId: snake(model),
    },
    isNewBrand: !brandKnown,
  };
}

// ─── In-queue dedupe ─────────────────────────────────────────────────────────
// Collapse items that resolve to the same printer (by manufacturer|model or, for
// duplicates, by matched bundled id). Keeps the first occurrence, sums a
// requestCount, and gathers the collapsed receivedAt / email values.
function collapse(items) {
  const out = [];
  const index = new Map(); // key → out[] index

  for (const it of items) {
    let key = null;
    if (it.outcome === 'needs-research' && it.resolved) {
      key = `nr:${it.resolved.manufacturer}|${norm(it.resolved.model)}`;
    } else if (it.outcome === 'duplicate' && it.matchedPrinter) {
      key = `dup:${it.matchedPrinter.id}`;
    }
    // unactionable / incomplete / declined entries are not collapsed — each is
    // its own triage line (no reliable key, and the volume matters less).

    if (key && index.has(key)) {
      const tgt = out[index.get(key)];
      tgt.requestCount += 1;
      if (it.request.receivedAt) tgt.requestedAt.push(it.request.receivedAt);
      if (it.request.email && !tgt.emails.includes(it.request.email)) tgt.emails.push(it.request.email);
      continue;
    }

    const rec = Object.assign({}, it, {
      requestCount: 1,
      requestedAt: it.request.receivedAt ? [it.request.receivedAt] : [],
      emails: it.request.email ? [it.request.email] : [],
    });
    if (key) index.set(key, out.length);
    out.push(rec);
  }
  return out;
}

// ─── Candidate skeleton ──────────────────────────────────────────────────────
// One per needs-research item. Drafts the taxonomy + empty printers.json row +
// overlay payload entry, all marked low-confidence: the assisted pass fills the
// specs from researched sources. Validators are NOT run here (no real spec data
// yet); that is part of the assisted/research pass.
function candidateSkeleton(item) {
  const r = item.resolved;
  const riskFlags = [];
  if (item.isNewBrand) riskFlags.push('new brand — requires explicit owner sign-off');
  riskFlags.push('series_group not yet decided — reuse a sibling label, never invent');
  riskFlags.push('overlay publish reaches current iOS users — taxonomy must be confirmed');

  const FIELD = () => ({ value: null, source: null, confidence: 'low-confidence' });

  return {
    schema: 'printer-intake-candidate@1',
    verdict: 'needs-research',
    note: 'Deterministic Scout output. Specs unverified — the Printer Addition '
        + 'Assistant must research + confirm every field from authoritative '
        + 'sources before this can ship.',
    request: item.request,
    requestCount: item.requestCount,
    requestedAt: item.requestedAt,
    emails: item.emails,
    proposedTaxonomy: {
      manufacturer: r.manufacturer,
      manufacturerInferred: r.manufacturerInferred,
      isNewBrand: !!item.isNewBrand,
      series_group: null,
      id: r.suggestedId,
      name: r.model,
    },
    printersJsonRow: {
      id: r.suggestedId,
      name: r.model,
      manufacturer: r.manufacturer,
      series: FIELD(),
      series_group: FIELD(),
      enclosure: FIELD(),
      max_nozzle_temp: FIELD(),
      max_bed_temp: FIELD(),
      max_speed: FIELD(),
      available_nozzle_sizes: FIELD(),
      multi_color_systems: FIELD(),
      available_plates: FIELD(),
    },
    overlayPayloadEntry: {
      note: 'additive overlay entry — fill only fields the overlay validator '
          + 'accepts (see docs/specs/ios-remote-printer-catalog.md allowlist)',
      id: r.suggestedId,
      name: r.model,
      manufacturer: r.manufacturer,
    },
    validatorDryRun: {
      ran: false,
      reason: 'deferred to the assisted pass — no researched spec data yet',
    },
    riskFlags,
    nextStep: 'Hand to the Printer Addition Assistant: research specs, fill the '
            + 'row + overlay entry, run validate-data / picker-dry-run / overlay '
            + 'validator, then owner-approve + ship.',
  };
}

// ─── Secret config (kv source) ───────────────────────────────────────────────
// Resolution order per field: env var → gitignored config file → known default.
// Only the API token is secret; it has no default and must be supplied.
function loadConfig(configPath) {
  let fileCfg = {};
  try {
    fileCfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (_) { /* file optional — env may supply everything */ }
  const token = process.env.CF_API_TOKEN || fileCfg.cfApiToken || fileCfg.token || null;
  const accountId = process.env.CF_ACCOUNT_ID || fileCfg.accountId || DEFAULT_ACCOUNT_ID;
  const namespaceId = process.env.CF_KV_NAMESPACE_ID || fileCfg.namespaceId || DEFAULT_NAMESPACE_ID;
  return { token, accountId, namespaceId };
}

// ─── Live KV read (Cloudflare KV REST API) ───────────────────────────────────
// List all keys (cursor-paginated), GET each value, parse the stored entry JSON.
// Throws on any API/HTTP failure so main can stop without advancing the watermark.
async function kvFetchEntries(cfg) {
  const base = `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/storage/kv/namespaces/${cfg.namespaceId}`;
  const headers = { Authorization: `Bearer ${cfg.token}` };

  // 1) list keys (paginate via cursor)
  const keys = [];
  let cursor = '';
  do {
    const url = `${base}/keys?limit=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`KV keys list failed: HTTP ${res.status} ${res.statusText}`);
    const body = await res.json();
    if (!body.success) throw new Error(`KV keys list error: ${JSON.stringify(body.errors)}`);
    for (const k of body.result || []) keys.push(k.name);
    cursor = (body.result_info && body.result_info.cursor) || '';
  } while (cursor);

  // 2) fetch each value, parse the stored entry
  const entries = [];
  for (const name of keys) {
    const res = await fetch(`${base}/values/${encodeURIComponent(name)}`, { headers });
    if (!res.ok) throw new Error(`KV value get failed for '${name}': HTTP ${res.status}`);
    const text = await res.text();
    try {
      const entry = JSON.parse(text);
      entry._key = name;
      entries.push(entry);
    } catch (_) {
      // a value we cannot parse is surfaced as an unactionable-shaped entry so
      // it still appears in triage instead of being silently dropped.
      entries.push({ _key: name, fields: [], _parseError: true });
    }
  }
  return entries;
}

// ─── Watermark ───────────────────────────────────────────────────────────────
function readWatermark(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (_) { return { lastReceivedAt: null }; }
}
function writeWatermark(file, lastReceivedAt) {
  fs.writeFileSync(file, JSON.stringify({ lastReceivedAt, updatedAt: null }, null, 2) + '\n');
}
function maxReceivedAt(entries) {
  let max = null;
  for (const e of entries) {
    const r = e && e.receivedAt;
    if (typeof r === 'string' && (max === null || r > max)) max = r;
  }
  return max;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); process.exit(0); }

  let entries = [];
  const sourceMeta = { source: args.source };
  let watermarkToAdvance = null; // set on a successful kv run when watermark enabled

  if (args.source === 'fixtures') {
    // Read the queue file (stop condition: unreadable / not a JSON array → exit 2).
    let raw;
    try {
      raw = fs.readFileSync(args.queue, 'utf8');
    } catch (e) {
      console.error(`STOP: cannot read intake queue '${args.queue}': ${e.code || e.message}`);
      process.exit(2);
    }
    let queue;
    try {
      queue = JSON.parse(raw);
    } catch (e) {
      console.error(`STOP: intake queue '${args.queue}' is not valid JSON: ${e.message}`);
      process.exit(2);
    }
    if (!Array.isArray(queue)) {
      console.error(`STOP: intake queue '${args.queue}' is not a JSON array`);
      process.exit(2);
    }
    sourceMeta.queue = args.queue;
    entries = queue;
  } else if (args.source === 'kv') {
    const cfg = loadConfig(args.config);
    if (!cfg.token) {
      console.error('STOP: kv source needs an API token. Set env CF_API_TOKEN or put '
        + `{ "cfApiToken": "..." } in ${args.config} (gitignored).`);
      process.exit(2);
    }
    const wm = (args.useWatermark && !args.resetWatermark)
      ? readWatermark(args.watermarkFile) : { lastReceivedAt: null };
    let fetched;
    try {
      fetched = await kvFetchEntries(cfg);
    } catch (e) {
      console.error(`STOP: ${e.message}`); // do not advance the watermark on failure
      process.exit(2);
    }
    // process only entries newer than the watermark
    entries = wm.lastReceivedAt
      ? fetched.filter(e => typeof e.receivedAt === 'string' && e.receivedAt > wm.lastReceivedAt)
      : fetched;
    sourceMeta.namespaceId = cfg.namespaceId;
    sourceMeta.totalKeys = fetched.length;
    sourceMeta.newSinceWatermark = entries.length;
    sourceMeta.watermarkIn = wm.lastReceivedAt;
    if (args.useWatermark) {
      const newMax = maxReceivedAt(fetched);
      watermarkToAdvance = (newMax && (!wm.lastReceivedAt || newMax > wm.lastReceivedAt))
        ? newMax : wm.lastReceivedAt;
    }
  } else {
    console.error(`STOP: unknown --source '${args.source}' (expected 'fixtures' or 'kv')`);
    process.exit(2);
  }

  const cat = loadCatalog();

  const classified = entries.map(e => classify(e, cat));
  const items = collapse(classified);

  const counts = {
    needs_research: 0,
    duplicate: 0,
    declined_non_fdm: 0,
    incomplete: 0,
    unverified_model: 0, // reserved for the assisted/research pass; never set here
    unactionable: 0,
  };
  const keyFor = { 'needs-research': 'needs_research', 'duplicate': 'duplicate',
    'declined-non-fdm': 'declined_non_fdm', 'incomplete': 'incomplete',
    'unactionable': 'unactionable' };
  for (const it of items) {
    const k = keyFor[it.outcome];
    if (k) counts[k] += 1;
  }

  const inQueueCollapses = items
    .filter(it => it.requestCount > 1)
    .map(it => ({
      key: it.resolved ? `${it.resolved.manufacturer}|${norm(it.resolved.model)}`
                       : (it.matchedPrinter ? it.matchedPrinter.id : null),
      name: it.resolved ? it.resolved.model : (it.matchedPrinter ? it.matchedPrinter.name : null),
      outcome: it.outcome,
      requestCount: it.requestCount,
    }));

  // Candidate skeletons for needs-research items.
  const candItems = items.filter(it => it.outcome === 'needs-research');
  const candidateFiles = [];
  if (args.out) {
    fs.mkdirSync(args.out, { recursive: true });
    for (const it of candItems) {
      const fname = `candidate-${snake(it.resolved.manufacturer)}-${snake(it.resolved.model)}.json`;
      fs.writeFileSync(path.join(args.out, fname), JSON.stringify(candidateSkeleton(it), null, 2) + '\n');
      candidateFiles.push(fname);
      it.candidate = fname;
    }
  } else {
    for (const it of candItems) {
      it.candidate = `candidate-${snake(it.resolved.manufacturer)}-${snake(it.resolved.model)}.json`;
      candidateFiles.push(it.candidate);
    }
  }

  const report = {
    tool: 'printer-intake-scout',
    version: 1,
    source: sourceMeta,
    queueCount: entries.length,
    counts,
    inQueueCollapses,
    candidates: candidateFiles,
    items: items.map(it => ({
      outcome: it.outcome,
      reason: it.reason,
      request: it.request,
      resolved: it.resolved || null,
      matchedPrinter: it.matchedPrinter || null,
      isNewBrand: !!it.isNewBrand,
      requestCount: it.requestCount,
      requestedAt: it.requestedAt,
      emails: it.emails,
      candidate: it.candidate || null,
    })),
    errors: [],
  };

  if (args.out) {
    fs.writeFileSync(path.join(args.out, 'run-report.json'), JSON.stringify(report, null, 2) + '\n');
  }

  // Advance the watermark only after a successful kv run (never on a failed
  // fetch — that path exits 2 above before reaching here).
  if (args.source === 'kv' && args.useWatermark && watermarkToAdvance !== null) {
    writeWatermark(args.watermarkFile, watermarkToAdvance);
    report.source.watermarkOut = watermarkToAdvance;
  }

  if (args.quiet) {
    const c = counts;
    console.log(`scout: ${entries.length} in → ${c.needs_research} needs-research, `
      + `${c.duplicate} dup, ${c.declined_non_fdm} declined, ${c.incomplete} incomplete, `
      + `${c.unactionable} unactionable`);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
  process.exit(0);
}

main().catch(e => {
  console.error(`STOP: unexpected error: ${e && e.message ? e.message : e}`);
  process.exit(2);
});
