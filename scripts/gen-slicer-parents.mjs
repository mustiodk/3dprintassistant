#!/usr/bin/env node
// ─── Slicer parent-profile table generator ───────────────────────────────────
// Regenerates the ORCA_VERIFIED_PROFILES / PRUSA_VERIFIED_PROFILES tables that
// engine.js uses to pick a real vendor `inherits` parent for native export.
//
// The tables are DERIVED, never hand-written: every process/filament/machine
// name emitted here is copied verbatim out of the upstream slicer registries.
// A hand-typed parent name that does not exist upstream makes the exported
// preset unresolvable, and OrcaSlicer silently files it under a duplicate
// custom printer (see EXPORT-PHASE3-GATE-LEDGER.md, 2026-07-11 diagnostic).
//
// Inputs (both are read-only local checkouts — nothing is fetched here):
//
//   1. OrcaSlicer profiles. Cheap sparse clone:
//        git clone --filter=blob:none --no-checkout --depth 1 \
//          https://github.com/SoftFever/OrcaSlicer.git /tmp/OrcaSlicer
//        git -C /tmp/OrcaSlicer sparse-checkout set resources/profiles
//        git -C /tmp/OrcaSlicer checkout
//
//   2. PrusaSlicer vendor bundle (single file):
//        curl -L -o /tmp/PrusaResearch.ini \
//          https://raw.githubusercontent.com/prusa3d/PrusaSlicer/master/resources/profiles/PrusaResearch.ini
//
// Run:
//   node scripts/gen-slicer-parents.mjs \
//     --orca /tmp/OrcaSlicer/resources/profiles \
//     --prusa /tmp/PrusaResearch.ini > /tmp/slicer-parents.json
//
// Then diff the output against the tables embedded in engine.js. `--check`
// does that comparison directly and exits non-zero on drift.

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const ORCA_DIR   = flag('--orca');
const PRUSA_INI  = flag('--prusa');
const CHECK      = args.includes('--check');
const ROOT       = path.join(path.dirname(new URL(import.meta.url).pathname), '..');

// ── Shared ───────────────────────────────────────────────────────────────────

// 3dpa material groups (data/materials.json `group`), in emission order.
const GROUPS = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'PC', 'PA', 'PVA', 'HIPS', 'PET'];

// 3dpa manufacturer id → OrcaSlicer vendor directory. Manufacturers with no
// entry (or no exact machine match below) keep the text-copy fallback.
const ORCA_VENDOR_DIRS = {
  creality: 'Creality', anycubic: 'Anycubic', qidi: 'Qidi', elegoo: 'Elegoo',
  sovol: 'Sovol', flashforge: 'Flashforge', voron: 'Voron', snapmaker: 'Snapmaker',
  artillery: 'Artillery', anker: 'Anker', voxelab: 'Voxelab',
};

// Exact-name matching is the default because a wrong machine imports silently
// wrong. These four are the cases where the SAME machine is published under a
// different string, confirmed one at a time and approved by the owner
// (2026-07-25); everything else stays unmatched and recorded in the coverage
// ledger instead of guessed at.
//
// `vendor` is required because two of these live under 3dpa manufacturer `diy`,
// which has no single upstream vendor directory.
const ORCA_MACHINE_ALIASES = {
  // 3dpa display name is just "i7"; upstream publishes the same printer as
  // "Creality SPARKX i7". Our own printer id is already `sparkx_i7`.
  sparkx_i7:        { vendor: 'Creality',  machine: 'Creality SPARKX i7' },
  // 3dpa calls it "2.0 A350" (the Snapmaker 2.0 line); upstream drops the 2.0.
  snapmaker_2_a350: { vendor: 'Snapmaker', machine: 'Snapmaker A350' },
  // Upstream ships exactly one 330 and one 235, both AWD — the suffix names the
  // drive train, not a competing variant, so there is nothing to disambiguate.
  vzbot_330:        { vendor: 'Vzbot',     machine: 'Vzbot 330 AWD' },
  vzbot_235:        { vendor: 'Vzbot',     machine: 'Vzbot 235 AWD' },
};

// 3dpa printer id → PrusaSlicer `printer_model` code.
const PRUSA_MODELS = {
  core_one: 'COREONE', core_one_l: 'COREONEL', mk4s: 'MK4S',
  mk4: 'MK4IS', mini_plus: 'MINIIS', xl: 'XLIS',
};

// Prusa does not ship per-model filament presets for every printer model —
// CORE One L reuses the CORE One filament line, which is exactly what the
// owner-verified 2026-07-11 Phase 4 export already emits. Models with no entry
// and no `Generic … @<model>` preset export process settings only.
const PRUSA_FILAMENT_MODELS = { COREONEL: 'COREONE' };

// Filament presets whose name carries a variant qualifier are never a safe
// default for a whole 3dpa material group (PLA Silk is not generic PLA).
const VARIANT_FILAMENT = /(silk|matte|wood|marble|glow|-cf|\bcf\b|\bgf\b|high speed|sparkle|metal|rainbow|luminous|transparent|aero|support|foam)/i;

// Lexicographic tuple compare — JS `<` on arrays stringifies, which silently
// mis-ranks ([1,9] < [1,10] is false as strings).
const rankLess = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const l = a[i] ?? 0, r = b[i] ?? 0;
    if (l !== r) return l < r;
  }
  return false;
};

// Preference order for competing Orca process presets at the same layer
// height. Lower is better; the trailing name/length terms make it total.
const PROCESS_STYLE_ORDER = [
  /support|soluble|interface|purge|calibrat/i,  // never a general-purpose base
  /standard/i,
  /optimal/i,
  /quality|fine|detail/i,
  /draft|fast|speed/i,
];
function processStyleRank(name, machine = '') {
  const special = PROCESS_STYLE_ORDER[0].test(name) ? 1 : 0;
  let style = PROCESS_STYLE_ORDER.length;
  for (let i = 1; i < PROCESS_STYLE_ORDER.length; i++) {
    if (PROCESS_STYLE_ORDER[i].test(name)) { style = i; break; }
  }
  // Prefer the preset scoped to this exact machine over a family-wide one
  // ("0.20mm Standard @Sovol SV08 0.4 nozzle" beats "… @Sovol SV08").
  const nozzleTag = (machine.match(/(\d\.\d)\s*(mm)?\s*nozzle/i) || [])[1];
  const specific = nozzleTag && name.includes(nozzleTag) ? 0 : 1;
  return [special, style, specific, name.length, name];
}

// Orca ships abstract bases ("fdm_process_…") that presets inherit from. They
// are not selectable system presets, so they can never be a valid `inherits`
// target for a user profile.
const ABSTRACT_PRESET = /^fdm_/i;

const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const stripNozzle = m => m.replace(/\s*\(?\s*\d\.\d\s*(mm)?\s*nozzle\s*\)?\s*$/i, '');
const nozzleOf = m => (m.match(/(\d\.\d)\s*(mm)?\s*nozzle/i) || [])[1] || null;
const lh2 = v => (Number.isFinite(Number(v)) ? Number(v).toFixed(2) : null);

function readPrinters() {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/printers.json'), 'utf8'));
  const brands = Object.fromEntries(d.brands.map(b => [b.id, b]));
  return d.printers.map(p => ({ ...p, slicer: brands[p.manufacturer]?.default_slicer }));
}

// ── OrcaSlicer ───────────────────────────────────────────────────────────────

// Traversal is sorted so the generated table depends only on the registry
// contents, never on filesystem enumeration order — otherwise `--check` would
// report phantom drift between machines, and a tie between two presets at the
// same layer height could resolve differently per checkout.
//
// A malformed profile is fatal rather than skipped: silently dropping it would
// shrink coverage invisibly, and `--check` re-reads the same bad input so it
// could not catch the loss.
function readJSONTree(dir) {
  const out = [];
  const walk = d => {
    if (!fs.existsSync(d)) return;
    const entries = fs.readdirSync(d, { withFileTypes: true })
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.json')) {
        try {
          out.push(JSON.parse(fs.readFileSync(full, 'utf8')));
        } catch (err) {
          throw new Error(`malformed profile ${full}: ${err.message} — refusing to generate a table with missing coverage`);
        }
      }
    }
  };
  walk(dir);
  return out;
}

// Orca presets inherit fields through a single-parent `inherits` chain.
function chainReader(items) {
  const by = new Map(items.filter(i => i?.name).map(i => [i.name, i]));
  const get = (name, field, seen = new Set()) => {
    if (!name || seen.has(name) || !by.has(name)) return null;
    seen.add(name);
    const node = by.get(name);
    if (node[field] != null && node[field] !== '') return node[field];
    return node.inherits ? get(node.inherits, field, seen) : null;
  };
  return get;
}

function buildOrca(profilesDir, printers) {
  const table = {};
  const skipped = [];
  const vendorCache = new Map();

  const vendorIndex = dir => {
    if (vendorCache.has(dir)) return vendorCache.get(dir);
    const vj = path.join(profilesDir, `${dir}.json`);
    if (!fs.existsSync(vj) || !fs.existsSync(path.join(profilesDir, dir))) {
      vendorCache.set(dir, null);
      return null;
    }
    const meta = JSON.parse(fs.readFileSync(vj, 'utf8'));
    const process = readJSONTree(path.join(profilesDir, dir, 'process'));
    const filament = readJSONTree(path.join(profilesDir, dir, 'filament'));
    const idx = {
      machines: (meta.machine_list || []).map(m => m.name),
      process, filament,
      processField: chainReader(process),
      filamentField: chainReader(filament),
    };
    vendorCache.set(dir, idx);
    return idx;
  };

  for (const printer of printers) {
    if (printer.slicer !== 'orcaslicer') continue;
    const alias = ORCA_MACHINE_ALIASES[printer.id];
    const dir = alias ? alias.vendor : ORCA_VENDOR_DIRS[printer.manufacturer];
    const idx = dir ? vendorIndex(dir) : null;
    if (!idx) { skipped.push([printer.id, dir ? 'no-vendor-dir' : 'no-vendor-mapping']); continue; }

    // Exact model match only: "K1" must resolve to "Creality K1 (0.4 nozzle)",
    // never to "Creality K1 Max". Registries that encode build volume in the
    // machine name (Voron 2.4 250 / RatRig V-Core 4 300) have no unambiguous
    // 3dpa counterpart and are deliberately left unmatched.
    // An alias matches on the upstream machine string instead of our display
    // name; both sides still go through the same normalisation and the same
    // nozzle-tag and process-parent checks below.
    const wanted = norm(alias ? alias.machine : printer.name);
    const vendorPrefix = norm(dir);
    const machines = {};
    for (const m of idx.machines) {
      let base = norm(stripNozzle(m));
      if (!alias && base.startsWith(vendorPrefix)) base = base.slice(vendorPrefix.length);
      const nz = nozzleOf(m);
      if (base === wanted && nz && !machines[nz]) machines[nz] = m;
    }
    if (!Object.keys(machines).length) { skipped.push([printer.id, 'no-machine']); continue; }

    const entry = { printerName: stripNozzle(Object.values(machines)[0]), nozzles: {} };
    for (const nz of Object.keys(machines).sort()) {
      const machine = machines[nz];

      const processParents = {};
      for (const p of idx.process) {
        if (!p?.name) continue;
        const compatible = idx.processField(p.name, 'compatible_printers');
        if (!Array.isArray(compatible) || !compatible.includes(machine)) continue;
        if (ABSTRACT_PRESET.test(p.name)) continue;
        // Upstream naming is not always consistent with upstream compatibility:
        // "0.32mm Standard @FF C5 0.8 nozzle" lists the Creator 5 Pro *0.6*
        // machines as compatible. Inheriting a preset tuned for a different
        // nozzle is worse than having no parent at that layer height, so a
        // name that carries a nozzle tag must agree with the machine we picked.
        const taggedNozzle = (p.name.match(/(\d\.\d)\s*(mm)?\s*nozzle/i) || [])[1];
        if (taggedNozzle && taggedNozzle !== nz) continue;
        const height = lh2(idx.processField(p.name, 'layer_height'))
                    || lh2((p.name.match(/^(\d\.\d+)mm/) || [])[1]);
        if (!height) continue;
        // Explicit, total ordering so two presets at the same layer height
        // always resolve the same way. 3dpa decides quality-vs-speed itself and
        // overrides the mapped fields, so the most neutral preset is the right
        // base; special-purpose ones are hard-demoted. Relying on name length
        // alone had silently picked "0.20 Bambu Support W @Snapmaker U1" as the
        // general 0.20 parent.
        const previous = processParents[height];
        if (!previous || rankLess(processStyleRank(p.name, machine), processStyleRank(previous, machine))) {
          processParents[height] = p.name;
        }
      }

      const filamentParents = {};
      for (const group of GROUPS) {
        let best = null;
        for (const f of idx.filament) {
          if (!f?.name) continue;
          const compatible = idx.filamentField(f.name, 'compatible_printers');
          if (!Array.isArray(compatible) || !compatible.includes(machine)) continue;
          let type = idx.filamentField(f.name, 'filament_type');
          if (Array.isArray(type)) type = type[0];
          if (String(type || '').toUpperCase() !== group) continue;
          if (VARIANT_FILAMENT.test(f.name.split(group).join(''))) continue;
          // Prefer a Generic preset, then the printer-family-scoped variant
          // ("... @K1-all") over the vendor-wide one, then the shorter name.
          const rank = [/generic/i.test(f.name) ? 0 : 1, f.name.includes('@') ? 0 : 1, f.name.length];
          if (!best || rankLess(rank, best.rank)) best = { rank, name: f.name };
        }
        if (best) filamentParents[group] = best.name;
      }

      if (Object.keys(processParents).length) {
        entry.nozzles[nz] = { compatiblePrinter: machine, processParents, filamentParents };
      }
    }
    if (Object.keys(entry.nozzles).length) table[printer.id] = entry;
    else skipped.push([printer.id, 'no-process']);
  }
  return { table, skipped };
}

// ── PrusaSlicer ──────────────────────────────────────────────────────────────

function parsePrusaIni(file) {
  const sections = new Map();
  let current = null;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (line.startsWith('[') && line.endsWith(']')) {
      current = {};
      sections.set(line.slice(1, -1), current);
      continue;
    }
    if (!current || !line || line.startsWith('#') || !line.includes('=')) continue;
    const at = line.indexOf('=');
    current[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return sections;
}

// Prusa presets can inherit from several parents at once ("A; *B*; *C*").
// Later entries win, so resolve right-to-left.
function prusaResolver(sections) {
  const get = (kind, name, field, seen = new Set()) => {
    const key = `${kind}:${name}`;
    if (seen.has(key) || !sections.has(key)) return null;
    seen.add(key);
    const body = sections.get(key);
    if (body[field]) return body[field];
    const inherits = body.inherits;
    if (!inherits) return null;
    const parents = inherits.split(';').map(s => s.trim()).filter(Boolean).reverse();
    for (const parent of parents) {
      const found = get(kind, parent, field, seen);
      if (found) return found;
    }
    return null;
  };
  return get;
}

function buildPrusa(iniFile) {
  const sections = parsePrusaIni(iniFile);
  const resolve = prusaResolver(sections);
  const printNames = [...sections.keys()].filter(k => k.startsWith('print:')).map(k => k.slice(6));
  const filamentNames = new Set([...sections.keys()].filter(k => k.startsWith('filament:')).map(k => k.slice(9)));
  // Prusa ships several styles per layer height (SPEED / STRUCTURAL / QUALITY /
  // DETAIL). 3dpa already decides speed-vs-quality itself and overrides the
  // affected fields, so pin the balanced SPEED variant when it exists.
  const styleRank = name => (/ SPEED /.test(name) ? 0 : / STRUCTURAL /.test(name) ? 1 : 2);
  const table = {};

  for (const [printerId, model] of Object.entries(PRUSA_MODELS)) {
    const entry = { model, nozzles: {} };
    for (const nz of ['0.25', '0.3', '0.4', '0.5', '0.6', '0.8']) {
      const candidates = printNames.filter(n => n.endsWith(`@${model} ${nz}`));
      if (!candidates.length) continue;

      const printParents = {};
      for (const name of candidates) {
        const height = lh2((name.match(/^(\d\.\d+)mm /) || [])[1]);
        if (!height) continue;
        const previous = printParents[height];
        if (previous && !rankLess([styleRank(name), name.length], [styleRank(previous.name), previous.name.length])) continue;
        // Each parent carries its own compatibility condition (MMU, high-flow
        // and standard variants differ) — copy the parent's own, never a
        // sibling's.
        const condition = resolve('print', name, 'compatible_printers_condition');
        if (condition) printParents[height] = { name, condition };
      }

      const filamentModel = PRUSA_FILAMENT_MODELS[model] || model;
      const filamentParents = {};
      for (const group of GROUPS) {
        const prusaType = group === 'TPU' ? 'FLEX' : group;
        const scoped = `Generic ${prusaType} @${filamentModel} ${nz}`;
        const generic = `Generic ${prusaType} @${filamentModel}`;
        if (filamentNames.has(scoped)) filamentParents[group] = scoped;
        else if (filamentNames.has(generic)) filamentParents[group] = generic;
      }

      if (Object.keys(printParents).length) entry.nozzles[nz] = { printParents, filamentParents };
    }
    if (Object.keys(entry.nozzles).length) table[printerId] = entry;
  }
  return table;
}

// ── Main ─────────────────────────────────────────────────────────────────────

if (!ORCA_DIR || !PRUSA_INI) {
  console.error('usage: gen-slicer-parents.mjs --orca <OrcaSlicer/resources/profiles> --prusa <PrusaResearch.ini> [--check]');
  process.exit(2);
}

const printers = readPrinters();
const { table: orca, skipped } = buildOrca(ORCA_DIR, printers);
const prusa = buildPrusa(PRUSA_INI);
const generated = { orca, prusa };

if (!CHECK) {
  console.log(JSON.stringify(generated, null, 1));
  console.error(`orca printers: ${Object.keys(orca).length}, prusa printers: ${Object.keys(prusa).length}`);
  for (const [id, why] of skipped) console.error(`skipped ${id}: ${why}`);
  process.exit(0);
}

// --check: compare against what engine.js actually ships.
const engineSrc = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
const grab = marker => {
  const at = engineSrc.indexOf(`const ${marker} = `);
  if (at < 0) throw new Error(`${marker} not found in engine.js`);
  // The embedded tables are strict JSON on purpose so this check never has to
  // guess at JS literal syntax.
  const open = engineSrc.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < engineSrc.length; i++) {
    if (engineSrc[i] === '{') depth++;
    else if (engineSrc[i] === '}' && --depth === 0) return JSON.parse(engineSrc.slice(open, i + 1));
  }
  throw new Error(`${marker} block not closed`);
};

let failures = 0;
for (const [marker, expected] of [['ORCA_VERIFIED_PROFILES', orca], ['PRUSA_VERIFIED_PROFILES', prusa]]) {
  const shipped = grab(marker);
  const same = JSON.stringify(sortDeep(shipped)) === JSON.stringify(sortDeep(expected));
  console.log(`${same ? 'PASS' : 'FAIL'} ${marker} (${Object.keys(shipped).length} shipped vs ${Object.keys(expected).length} generated)`);
  if (!same) {
    failures++;
    for (const id of new Set([...Object.keys(shipped), ...Object.keys(expected)])) {
      const l = JSON.stringify(sortDeep(shipped[id]));
      const r = JSON.stringify(sortDeep(expected[id]));
      if (l !== r) console.log(`  drift: ${id}`);
    }
  }
}
process.exit(failures ? 1 : 0);

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, sortDeep(value[k])]));
  }
  return value;
}
