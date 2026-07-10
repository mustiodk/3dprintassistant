#!/usr/bin/env node
// ─── Intake Retrospective — deterministic gather + cluster (S4) ───────────────
//
// Run: node scripts/intake-retrospective-gather.js
//        [--ledger <outcomes.jsonl>] [--watermark-file <path>] [--quiet]
//
// Exit 0 = ran. Exit 2 = stop (bad args / unreadable ledger).
//
// THE DETERMINISTIC PRE-JUDGMENT BACKBONE of the Intake Retrospective. It does NO
// LLM reasoning: it reads the committed outcomes ledger (the durable supervision
// signal the Printer Addition Assistant appends to — raw Scout run reports are
// overwritten + gitignored, so they are NOT a history source), gates it by a
// watermark, clusters owner-tagged corrective signals, dedupes corroboration by
// distinct candidateKey, and emits a CANDIDATE DIFF in the
// printer-intake-guardrails-diff@1 schema.
//
// The JUDGMENT half — deciding which candidates to actually propose, reconciling
// against a deliberate prior config entry, and pruning — is the Intake
// Retrospective AGENT's job (ai-operating-model/docs/agents/intake-retrospective.md).
// This script only surfaces the deterministic candidate set so the agent + owner
// review structured evidence, not raw text. Nothing here edits the config; the
// owner-approved apply path is apply-guardrails-diff.js.
//
// Confidence model: every ledger correctiveSignal is an OWNER-TAGGED correction
// (the owner set ownerResolution + correctiveSignal), so candidates are
// `confidence: stated` and a single stated correction suffices (spec §4.2 step 3).
// Corroboration (distinct candidateKeys) is still reported — repetition by one
// requester is not extra confirmation. The ≥2-corroboration bar is the gate for
// OBSERVED, agent-inferred candidates (not produced here).

const fs   = require('fs');
const path = require('path');

const DEFAULT_LEDGER    = path.join(__dirname, 'printer-intake-outcomes.jsonl');
const DEFAULT_WATERMARK = path.join(__dirname, '.printer-intake-retrospective.watermark.json');
const DIFF_SCHEMA_ID    = 'printer-intake-guardrails-diff@1';

const ARRAY_TARGETS    = ['modelSuffixStrip', 'resinKeywords', 'nonFdmTech', 'nonFdmNoteAcronyms'];
// Owner resolutions that signal a Scout MISS a guardrail could prevent.
// Autonomous-mode values (PD7, additive): 'auto-shipped' and 'auto-parked:<reason>'
// are NON-miss outcomes — deliberately absent here, so runner-written lines never
// enter miss clusters. Owner retro-tags stay appended correction lines.
const MISS_RESOLUTIONS = ['was-duplicate-missed', 'was-brand-typo', 'was-suffix-variant', 'was-mis-declined', 'was-noise'];

// PD7 candidate identity: string candidateKey and array candidateKey (collapsed
// candidates) must resolve to the same identity, order-insensitively — a
// correction written as ["req:a"] supersedes an original written as "req:a".
function normalizeCandidateKey(candidateKey) {
  const keys = Array.isArray(candidateKey)
    ? candidateKey.map(String)
    : (candidateKey != null ? [String(candidateKey)] : []);
  return keys.length ? keys.slice().sort().join('\u0000') : null;
}

function validTs(v) { return typeof v === 'string' && !Number.isNaN(Date.parse(v)); }

// Parse a ledger correctiveSignal → { target, action, value } or null.
//   brandAliases:<key>-><value>         → brandAliases.<key>, add, <value>
//   <list>:+<value>  | <list>:<value>   → <list>, add, <value>
//   <list>:-<value>                     → <list>, retire, <value>
//   "none" / unparseable / unknown list → null (no learning signal)
function parseCorrectiveSignal(sig) {
  if (typeof sig !== 'string') return null;
  const s = sig.trim();
  if (!s || s.toLowerCase() === 'none') return null;
  const ci = s.indexOf(':');
  if (ci < 0) return null;
  const head = s.slice(0, ci).trim();
  let rest = s.slice(ci + 1).trim();
  if (!rest) return null;
  if (head === 'brandAliases') {
    const arrow = rest.indexOf('->');
    if (arrow < 0) return null;
    const key = rest.slice(0, arrow).trim();
    const value = rest.slice(arrow + 2).trim();
    if (!key || !value) return null;
    return { target: `brandAliases.${key}`, action: 'add', value };
  }
  if (ARRAY_TARGETS.includes(head)) {
    let action = 'add';
    if (rest[0] === '+') rest = rest.slice(1).trim();
    else if (rest[0] === '-') { action = 'retire'; rest = rest.slice(1).trim(); }
    if (!rest) return null;
    return { target: head, action, value: rest };
  }
  return null;
}

// Read the JSONL ledger. Skips _schema marker lines + blanks; a malformed line is
// recorded as an error (never silently dropped), not fatal.
function readLedger(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); }
  catch (e) { return { entries: [], errors: [`cannot read ledger ${file}: ${e.message}`] }; }
  const entries = [], errors = [];
  raw.split('\n').forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    let obj;
    try { obj = JSON.parse(t); }
    catch (e) { errors.push(`ledger line ${i + 1} is not valid JSON: ${e.message}`); return; }
    if (obj && obj._schema) return;   // self-describing marker — skip
    entries.push(obj);
  });
  return { entries, errors };
}

function readWatermark(file) {
  try { const w = JSON.parse(fs.readFileSync(file, 'utf8')); return (w && typeof w.lastRunId === 'string') ? w.lastRunId : null; }
  catch (_) { return null; }
}

// Deterministic gather + cluster. Pure (no I/O). Returns
//   { diff:{schema,changes}, clusters:[…], gathered, watermarkUsed, fullRebuild, errors }
function gather(entries, watermark) {
  const errors = [];
  let wm = watermark;
  // Curator gotcha: a missing OR stale/invalid watermark must trigger a LOUD full
  // rebuild — process everything, announced — never a silent unbounded re-read.
  if (wm != null && !validTs(wm)) { errors.push(`watermark ${JSON.stringify(wm)} is not a valid timestamp — ignored (LOUD full rebuild this run)`); wm = null; }
  const fullRebuild = wm == null;

  // PD7 last-line-wins: reduce the FULL entries list (file order — the ledger
  // is append-only) to each candidate's NEWEST line before any watermark
  // gating. Correction resolution must read the whole ledger, not the
  // watermark-gated slice: a correction appended after the original line was
  // consumed by a prior incremental gather would otherwise arrive alone —
  // either silently no-opping (a flip to non-miss) or clustering next to a
  // stale superseded line (plan-review M7). Keyless lines have no identity to
  // supersede and pass through unchanged.
  const lastByKey = new Map();
  const currentEntries = [];
  for (const e of (Array.isArray(entries) ? entries : [])) {
    const nk = normalizeCandidateKey(e && e.candidateKey);
    if (nk == null) { currentEntries.push(e); continue; }
    lastByKey.set(nk, e); // later lines overwrite — last line wins
  }
  for (const e of lastByKey.values()) currentEntries.push(e);

  // Watermark gate — applied to each candidate's WINNING line: keep lines
  // strictly newer than the watermark. Lines with a missing/invalid runId are
  // ALWAYS kept (never silently dropped) — they re-surface until fixed,
  // mirroring the Scout's no-silent-drop discipline.
  const gathered = currentEntries.filter(e => {
    const r = e && e.runId;
    if (!validTs(r)) return true;
    return wm == null ? true : Date.parse(r) > Date.parse(wm);
  });

  // Cluster by correctiveSignal among MISS resolutions with a parseable signal.
  const clusters = new Map();
  for (const e of gathered) {
    if (!e || !MISS_RESOLUTIONS.includes(e.ownerResolution)) continue;
    const parsed = parseCorrectiveSignal(e.correctiveSignal);
    if (!parsed) continue;
    const sig = e.correctiveSignal.trim();
    if (!clusters.has(sig)) clusters.set(sig, { signal: sig, parsed, keys: new Set(), evidence: [], evidenceSeen: new Set(), resolutions: new Set() });
    const c = clusters.get(sig);
    // candidateKey may be a string OR an array (collapsed candidate) → flatten for dedup.
    const keys = Array.isArray(e.candidateKey) ? e.candidateKey : (e.candidateKey != null ? [e.candidateKey] : []);
    for (const k of keys) c.keys.add(String(k));
    // Dedupe the EVIDENCE array too — not just the corroboration count. A repeated
    // (candidateKey, runId) row must not be written twice into the committed config
    // _provenance/_tombstone on apply.
    const evKey = JSON.stringify([e.candidateKey, e.runId || null]);
    if (!c.evidenceSeen.has(evKey)) { c.evidenceSeen.add(evKey); c.evidence.push({ candidateKey: e.candidateKey, runId: e.runId || null }); }
    if (e.ownerResolution) c.resolutions.add(e.ownerResolution);
  }

  // Resolved target identity (matches the diff validator's dedupe): a brandAlias
  // is its dotted key; an array entry is name::value.
  const identityOf = (target, value) => target.startsWith('brandAliases.') ? target : `${target}::${value}`;

  // Two DISTINCT corrective signals can resolve to the SAME target (e.g.
  // brandAliases:x->creality and brandAliases:x->prusa both → brandAliases.x). The
  // diff validator dedupes by identity and would reject the WHOLE diff, so surface
  // the conflict LOUDLY here and EXCLUDE the colliding signals from the candidate
  // diff (keeping it validator-clean) — the owner reconciles which wins.
  const byIdentity = new Map();
  for (const c of clusters.values()) {
    const idn = identityOf(c.parsed.target, c.parsed.value);
    if (!byIdentity.has(idn)) byIdentity.set(idn, []);
    byIdentity.get(idn).push(c.signal);
  }
  const conflictIdentities = new Set();
  for (const [idn, sigs] of byIdentity) {
    if (sigs.length > 1) {
      conflictIdentities.add(idn);
      errors.push(`target conflict on ${idn}: signals [${sigs.slice().sort().join(', ')}] resolve to the same target — excluded from the candidate diff; owner must reconcile which wins`);
    }
  }

  const clusterList = [...clusters.values()].map(c => ({
    correctiveSignal: c.signal,
    target: c.parsed.target,
    action: c.parsed.action,
    value: c.parsed.value,
    corroboration: c.keys.size,                 // DISTINCT candidateKeys (repetition by one ≠ confirmation)
    corroborated: c.keys.size >= 2,             // the ≥2 bar (informational for stated; required for observed)
    conflict: conflictIdentities.has(identityOf(c.parsed.target, c.parsed.value)),
    resolutions: [...c.resolutions].sort(),
    evidence: c.evidence,
  })).sort((a, b) => (a.correctiveSignal < b.correctiveSignal ? -1 : a.correctiveSignal > b.correctiveSignal ? 1 : 0));

  // Candidate diff: only NON-conflicting clusters. Ledger signals are owner-tagged
  // → confidence 'stated', single suffices. The agent + validator + owner gate it.
  const changes = clusterList.filter(c => !c.conflict).map(c => ({
    action: c.action,
    target: c.target,
    value: c.value,
    evidence: c.evidence,
    confidence: 'stated',
    rationale: `owner-tagged correction from ${c.corroboration} distinct request(s) [${c.resolutions.join(', ')}]; guardrail ${c.correctiveSignal}`,
  }));

  return {
    diff: { schema: DIFF_SCHEMA_ID, changes },
    clusters: clusterList,
    gathered: gathered.length,
    watermarkUsed: wm,
    fullRebuild,
    errors,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
function main() {
  const argv = process.argv.slice(2);
  let ledger = DEFAULT_LEDGER, watermarkFile = DEFAULT_WATERMARK, quiet = false;
  for (let i = 0; i < argv.length; i++) {
    const need = (flag) => { const v = argv[i + 1]; if (v === undefined || v.startsWith('--')) { console.error(`STOP: ${flag} needs a value`); process.exit(2); } i++; return v; };
    switch (argv[i]) {
      case '--ledger': ledger = need('--ledger'); break;
      case '--watermark-file': watermarkFile = need('--watermark-file'); break;
      case '--quiet': quiet = true; break;
      case '-h': case '--help':
        console.error('Usage: node scripts/intake-retrospective-gather.js [--ledger <outcomes.jsonl>] [--watermark-file <path>] [--quiet]');
        process.exit(0);
      default: console.error(`STOP: unknown argument: ${argv[i]}`); process.exit(2);
    }
  }

  const { entries, errors: readErr } = readLedger(ledger);
  const wm = readWatermark(watermarkFile);
  const r = gather(entries, wm);
  const errors = [...readErr, ...r.errors];
  // A wholly unreadable ledger FILE is a stop condition (exit 2) — a scheduled
  // wrapper must distinguish "no learning this cycle" from "couldn't read the
  // history at all". Per-LINE parse errors stay non-fatal (recorded, exit 0).
  const fileUnreadable = readErr.some(e => e.startsWith('cannot read ledger'));

  if (quiet) {
    console.log(`retrospective gather: ${r.gathered} entries${r.fullRebuild ? ' (LOUD full rebuild — no/stale watermark)' : ` since ${r.watermarkUsed}`} → ${r.diff.changes.length} candidate change(s)${errors.length ? ` (${errors.length} error(s))` : ''}`);
    for (const e of errors) console.error(`  ! ${e}`);   // surface WHAT failed, even in quiet mode
  } else {
    console.log(JSON.stringify({ ...r, errors }, null, 2));
  }
  process.exit(fileUnreadable ? 2 : 0);
}

if (require.main === module) {
  main();
} else {
  // normalizeCandidateKey is exported so the pipeline runner's startup ledger
  // reconciliation (Codex MF-3) uses the SAME candidate identity as gather.
  module.exports = { gather, parseCorrectiveSignal, readLedger, readWatermark, normalizeCandidateKey, ARRAY_TARGETS, MISS_RESOLUTIONS, DIFF_SCHEMA_ID };
}
