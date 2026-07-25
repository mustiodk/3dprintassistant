#!/usr/bin/env node
// ─── Native-export coverage ledger ───────────────────────────────────────────
// Every printer in data/printers.json either produces an importable slicer
// export, or is recorded here with a reason. There is no third state.
//
// Why this exists: the export fallback is deliberately graceful — a printer
// with no verified vendor parent shows "copy as text" instead of an error
// (2026-07-25). That is right for users and terrible for operations, because a
// printer can now ship with no export and nothing anywhere says so. The intake
// pipeline adds printers autonomously and only touches data/printers.json, the
// walkthrough combos and the iOS overlay — never engine.js — so a newly
// intaked printer is uncovered by construction.
//
// This ledger turns that silence into a failing gate.
//
// CLI:
//   node scripts/export-coverage.js --check          report + exit 1 on drift
//   node scripts/export-coverage.js --add <printerId> --reason <reason>
//                                                    record a known gap
//
// `--add` is what the intake runner calls in its mechanical-ship stage. It is
// deliberately non-blocking: a printer must still be allowed to ship on the day
// its slicer has no profile for it. What must not happen is shipping it
// *silently*.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEDGER = path.join(ROOT, 'scripts', 'fixtures', 'export-coverage-ledger.json');

// Reason vocabulary — closed set so entries stay comparable and greppable.
const REASONS = {
  'ambiguous-variant':
    'Upstream splits this model by build volume or drive variant and 3dpa has no field to disambiguate, so any pick would be a guess.',
  'absent-upstream':
    'No machine profile for this printer at the pinned registry commit.',
  'alias-candidate':
    'A machine that plausibly IS this printer exists upstream under a different name; needs a human to confirm identity before it is mapped.',
  'awaiting-registry':
    'Added to the catalogue (usually by intake) before its slicer published a profile. Re-checked on every coverage refresh.',
};

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readLedger() {
  if (!fs.existsSync(LEDGER)) return { entries: {} };
  return readJSON(LEDGER);
}

function writeLedger(ledger) {
  const sorted = {};
  for (const id of Object.keys(ledger.entries).sort()) sorted[id] = ledger.entries[id];
  ledger.entries = sorted;
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
}

/** Pull a strict-JSON const block out of engine.js without executing it. */
function engineTable(marker, source) {
  const at = source.indexOf(`const ${marker} = `);
  if (at < 0) throw new Error(`${marker} not found in engine.js`);
  const open = source.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return JSON.parse(source.slice(open, i + 1));
  }
  throw new Error(`${marker} block not closed`);
}

/**
 * Which printers have a native export, which do not, and which slicer each
 * routes to. Reads the shipped engine tables — not a re-derivation — so the
 * ledger tracks what users actually get.
 */
function coverage() {
  const engineSrc = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  const orca = engineTable('ORCA_VERIFIED_PROFILES', engineSrc);
  const prusa = engineTable('PRUSA_VERIFIED_PROFILES', engineSrc);
  const data = readJSON(path.join(ROOT, 'data', 'printers.json'));
  const slicerOf = Object.fromEntries(data.brands.map(b => [b.id, b.default_slicer]));

  const covered = [];
  const uncovered = [];
  for (const printer of data.printers) {
    const slicer = slicerOf[printer.manufacturer];
    // Bambu Studio export is universal for Bambu printers — no per-model table.
    if (slicer === 'bambu_studio') { covered.push(printer.id); continue; }
    const table = slicer === 'prusaslicer' ? prusa : orca;
    (table[printer.id] ? covered : uncovered).push(printer.id);
  }
  return { covered, uncovered, known: data.printers.map(p => p.id) };
}

function check() {
  const { covered, uncovered, known } = coverage();
  const ledger = readLedger();
  const entries = ledger.entries || {};
  const problems = [];

  // 1. An uncovered printer with no ledger entry is the failure this whole
  //    mechanism exists to catch.
  for (const id of uncovered) {
    if (!entries[id]) {
      problems.push({
        kind: 'unrecorded-gap',
        id,
        detail: `${id} has no native export and no ledger entry — record why with: node scripts/export-coverage.js --add ${id} --reason <${Object.keys(REASONS).join('|')}>`,
      });
    }
  }
  // 2. A ledger entry for a printer that now exports is stale and must go, or
  //    the ledger slowly becomes a list of lies.
  for (const id of Object.keys(entries)) {
    if (covered.includes(id)) {
      problems.push({ kind: 'stale-entry', id, detail: `${id} now has a native export — remove its ledger entry` });
    } else if (!known.includes(id)) {
      problems.push({ kind: 'unknown-printer', id, detail: `${id} is in the ledger but not in data/printers.json` });
    }
  }
  // 3. Reasons must come from the closed vocabulary.
  for (const [id, entry] of Object.entries(entries)) {
    if (!REASONS[entry.reason]) {
      problems.push({ kind: 'bad-reason', id, detail: `${id} has reason "${entry.reason}" — must be one of ${Object.keys(REASONS).join(', ')}` });
    }
  }
  return { problems, covered, uncovered, entries };
}

function add(id, reason, note) {
  if (!REASONS[reason]) {
    console.error(`unknown reason "${reason}" — must be one of: ${Object.keys(REASONS).join(', ')}`);
    process.exit(2);
  }
  const { uncovered, known } = coverage();
  if (!known.includes(id)) {
    console.error(`unknown printer "${id}" — not in data/printers.json`);
    process.exit(2);
  }
  if (!uncovered.includes(id)) {
    console.log(`EXPORTCOVERAGE ok=true action=add id=${id} result=already-covered (no entry needed)`);
    return;
  }
  const ledger = readLedger();
  ledger.entries = ledger.entries || {};
  if (ledger.entries[id]) {
    console.log(`EXPORTCOVERAGE ok=true action=add id=${id} result=already-recorded reason=${ledger.entries[id].reason}`);
    return;
  }
  ledger.entries[id] = { reason, ...(note ? { note } : {}) };
  writeLedger(ledger);
  console.log(`EXPORTCOVERAGE ok=true action=add id=${id} reason=${reason}`);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const flag = name => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
  };

  if (args.includes('--add')) {
    add(flag('--add'), flag('--reason'), flag('--note'));
  } else {
    const { problems, covered, uncovered } = check();
    console.log(`export coverage: ${covered.length} covered, ${uncovered.length} recorded gaps of ${covered.length + uncovered.length} printers`);
    problems.forEach(p => console.log(`  FAIL [${p.kind}] ${p.detail}`));
    if (problems.length) {
      console.log(`\n${problems.length} coverage problem(s) — a printer must either export or be recorded.`);
      process.exit(1);
    }
    console.log('every printer either exports natively or has a recorded reason.');
  }
}

module.exports = { check, coverage, REASONS };
