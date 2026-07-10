#!/usr/bin/env node
// intake-diff-guards.js — deterministic branch-diff shape guards for the
// autonomous mechanical-ship stage (Intake Autonomy v2, Gate B4; Codex MF-2 +
// B4 review findings 1 & 9).
//
// Two guards, both run against `git diff <base>...HEAD` (three-dot: the
// branch's own changes since it diverged — the base is PINNED, never the
// index/worktree, which would be vacuously empty after the branch commit):
//
//   1. walkthrough-combos guard: every hunk touching
//      scripts/walkthrough-harness.js must fall INSIDE the current COMBOS[]
//      array line range (computed from the NEW file side — hunk +line numbers
//      are new-file coordinates). `git diff --stat` is file-level and cannot
//      prove this.
//   2. printers-splice guard: the data/printers.json diff must be a minimal
//      string-splice — additions bounded (default ≤ 60 lines: a printer row +
//      optionally a brand row), ZERO deletions. A whole-file reserialize of
//      the hand-formatted file (the B4.6 dry-run produced a 1342-line diff for
//      a 1-row add) fails this loudly.
//
// CLI: node scripts/intake-diff-guards.js --base <ref> [--max-added N]
// Exit 0 = both guards pass · 1 = violation (park the candidate) · 2 = usage.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function gitDiff(base, file, cwd = root) {
  return execFileSync('git', ['diff', '--unified=0', `${base}...HEAD`, '--', file], { cwd, encoding: 'utf8' });
}

function newFileHunks(diffText) {
  // @@ -a,b +c,d @@ — c,d are NEW-file coordinates (d omitted = 1).
  return [...diffText.matchAll(/@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/g)]
    .map((m) => ({ from: Number(m[1]), count: m[2] === undefined ? 1 : Number(m[2]) }));
}

/** Locate the COMBOS[] block in the CURRENT (new-side) walkthrough source. */
function combosRange(harnessSource) {
  const lines = harnessSource.split('\n');
  const start = lines.findIndex((l) => l.includes('const COMBOS = ['));
  if (start < 0) throw new Error('COMBOS[] array not found in walkthrough-harness.js');
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '];') return { start: start + 1, end: i + 1 }; // 1-indexed inclusive
  }
  throw new Error('COMBOS[] closing bracket not found');
}

function checkWalkthroughGuard({ base, cwd = root, diffText, harnessSource }) {
  const diff = diffText !== undefined ? diffText : gitDiff(base, 'scripts/walkthrough-harness.js', cwd);
  if (!diff.trim()) return { ok: true, detail: 'walkthrough-harness.js untouched' };
  const src = harnessSource !== undefined
    ? harnessSource
    : fs.readFileSync(path.join(cwd, 'scripts', 'walkthrough-harness.js'), 'utf8');
  const range = combosRange(src);
  const violations = [];
  for (const h of newFileHunks(diff)) {
    // Pure deletions report the line BEFORE the removal on the new side; a
    // count-0 hunk at range boundaries is still suspicious — flag any hunk
    // whose span leaves the block.
    const last = h.count === 0 ? h.from : h.from + h.count - 1;
    if (h.from < range.start || last > range.end) {
      violations.push(`hunk +${h.from},${h.count} outside COMBOS[] lines ${range.start}-${range.end}`);
    }
  }
  return violations.length
    ? { ok: false, detail: violations.join('; ') }
    : { ok: true, detail: `all hunks inside COMBOS[] lines ${range.start}-${range.end}` };
}

function checkPrintersSpliceGuard({ base, cwd = root, numstat, maxAdded = 60 }) {
  const out = numstat !== undefined
    ? numstat
    : execFileSync('git', ['diff', '--numstat', `${base}...HEAD`, '--', 'data/printers.json'], { cwd, encoding: 'utf8' });
  if (!out.trim()) return { ok: true, detail: 'data/printers.json untouched' };
  const [added, deleted] = out.trim().split(/\s+/).map(Number);
  if (!Number.isFinite(added) || !Number.isFinite(deleted)) {
    return { ok: false, detail: `unparseable numstat: ${out.trim()} (binary diff? printers.json must stay text)` };
  }
  if (deleted !== 0) {
    return { ok: false, detail: `printers.json diff deletes ${deleted} line(s) — an ADD must be a pure splice (a reserialize rewrites the hand-formatted file)` };
  }
  if (added > maxAdded) {
    return { ok: false, detail: `printers.json diff adds ${added} lines (> ${maxAdded}) — not a minimal row splice` };
  }
  return { ok: true, detail: `+${added}/-0 within the splice bound (${maxAdded})` };
}

module.exports = { checkWalkthroughGuard, checkPrintersSpliceGuard, combosRange, newFileHunks };

if (require.main === module) {
  const args = process.argv.slice(2);
  let base = null;
  let maxAdded = 60;
  try {
    for (let i = 0; i < args.length; i += 1) {
      if (args[i] === '--base') { i += 1; base = args[i]; }
      else if (args[i] === '--max-added') { i += 1; maxAdded = Number(args[i]); }
      else throw new Error(`unknown argument: ${args[i]}`);
    }
    if (!base) throw new Error('--base <ref> is required (e.g. --base main)');
    if (!Number.isInteger(maxAdded) || maxAdded < 1) throw new Error('--max-added must be a positive integer');
  } catch (error) {
    console.error(`[intake-diff-guards] ${error.message}`);
    process.exit(2);
  }

  const w = checkWalkthroughGuard({ base });
  const p = checkPrintersSpliceGuard({ base, maxAdded });
  console.log(`[intake-diff-guards] walkthrough: ${w.ok ? 'PASS' : 'FAIL'} — ${w.detail}`);
  console.log(`[intake-diff-guards] printers-splice: ${p.ok ? 'PASS' : 'FAIL'} — ${p.detail}`);
  console.log(`[intake-diff-guards] GUARDS ok=${w.ok && p.ok}`);
  process.exit(w.ok && p.ok ? 0 : 1);
}
