#!/usr/bin/env node
// ─── Retry gate: making it satisfiable ──────────────────────────────────────
//
// The 2026-08-05 scheduled run found canRetryJudgment() structurally
// unsatisfiable: it reads `sidecar.diffSha`, `sidecar.evidence[]` and
// `sidecar.objections[]`, and NO writer in the pipeline has ever persisted any
// of them onto a judgment-on-evidence sidecar. So no review-no-go candidate
// could ever re-enter, no matter what the owner did.
//
// Two separate problems, fixed here:
//
// 1. The data was never missing — R1's structured output carries the
//    objections, the sidecar references that file in `verdictRefs[].ref`, and
//    the branch tip lives in `preservedRef`. The gate just never looked. It now
//    RESOLVES from those rather than requiring duplicated copies, which also
//    means existing parked candidates work without being re-parked.
//
// 2. The gate modelled only ONE way to answer an objection: a novel external
//    source. Ender-3 S1's objection was "engine.js never clamps emitted
//    acceleration to printer.max_acceleration — should the owner add a clamp?"
//    That was answered by shipping the clamp (cc2ea76), not by finding a
//    document. A code-change resolution is now a first-class shape, held to its
//    own standard: a real commit that is actually merged.
//
// What must NOT change: every objection still has to be answered individually,
// evidence resolutions still require a NOVEL source, and a candidate whose
// diff never moved still cannot retry.
//
// Run: node scripts/intake-retry-gate-resolution.test.js

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { canRetryJudgment } = require('./intake-retry-gate.js');

let pass = 0; let fail = 0; const failures = [];
function t(name, fn) {
  try { fn(); pass += 1; console.log(`  ok  ${name}`); }
  catch (e) { fail += 1; failures.push(`${name}: ${e.message}`); console.log(`  FAIL ${name} — ${e.message}`); }
}

const OBJECTION = {
  reviewer: 'claude-opus-r1',
  field: 'max_acceleration',
  question: 'engine.js never clamps emitted acceleration to printer.max_acceleration — add a clamp?',
  raisedAt: '2026-08-03T12:00:00Z',
};

// A sidecar in the exact shape the pipeline actually writes today: objections
// live only in the referenced R1 file, the branch tip only in preservedRef.
function realWorldSidecar(root) {
  const refRel = path.join('scripts', '.intake-runner-state', 'bridge-reviews', 'r1-structured.json');
  fs.mkdirSync(path.dirname(path.join(root, refRel)), { recursive: true });
  fs.writeFileSync(path.join(root, refRel), `${JSON.stringify({
    reviewer: 'claude-opus-r1', verdict: 'NO-GO', objections: [OBJECTION],
  }, null, 2)}\n`);
  return {
    class: 'judgment-on-evidence',
    reason: 'review-no-go',
    preservedRef: 'e624cb0d4be12d742aaf18d298b74a9e3de1e6c4',
    verdictRefs: [{ reviewer: 'claude-opus-r1', verdict: 'NO-GO', ref: refRel }],
  };
}

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'retrygate-'));

// ── TC1 — the reported defect: a real sidecar could never pass ──────────────
console.log('\nTC1 — the 2026-08-05 defect');
t('a real-world sidecar + code-change resolution now clears the gate', () => {
  const root = tmp();
  const result = canRetryJudgment(realWorldSidecar(root), {
    diffSha: 'f8933f26e3201f4e8321b64999ae16d2677d7704',
    objections: [{
      ...OBJECTION,
      resolvedBy: {
        kind: 'code-change',
        commit: 'cc2ea767aedabf13f82cbe9aa2cd182e476650a4',
        claim: 'engine.js now clamps outer/inner/initial acceleration to printer.max_acceleration',
        resolvedAt: '2026-08-04T18:00:00Z',
      },
    }],
  }, { repoRoot: root, commitExists: () => true });
  assert.ok(result.ok, `gate still unsatisfiable: ${result.errors.join(' | ')}`);
  assert.strictEqual(result.reviewRequests, 1);
});

// ── TC2 — objections resolve from the referenced R1 file ───────────────────
console.log('\nTC2 — resolution from verdictRefs');
t('inline objections still win when present', () => {
  const root = tmp();
  const sidecar = { ...realWorldSidecar(root), objections: [OBJECTION], diffSha: 'aaa' };
  const r = canRetryJudgment(sidecar, {
    diffSha: 'bbb',
    objections: [{ ...OBJECTION, resolvedBy: { kind: 'code-change', commit: 'c'.repeat(40), claim: 'x', resolvedAt: '2026-08-04T18:00:00Z' } }],
  }, { repoRoot: root, commitExists: () => true });
  assert.ok(r.ok, r.errors.join(' | '));
});

t('a sidecar with neither inline objections nor a readable ref still fails', () => {
  const r = canRetryJudgment(
    { class: 'judgment-on-evidence', preservedRef: 'aaa', verdictRefs: [] },
    { diffSha: 'bbb', objections: [] },
    { repoRoot: tmp(), commitExists: () => true },
  );
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /objections are required/.test(e)), r.errors.join(' | '));
});

// ── TC3 — a code-change resolution is held to a real standard ──────────────
console.log('\nTC3 — code-change resolutions must be real');
t('a commit that does not exist is rejected', () => {
  const root = tmp();
  const r = canRetryJudgment(realWorldSidecar(root), {
    diffSha: 'f8933f2',
    objections: [{ ...OBJECTION, resolvedBy: { kind: 'code-change', commit: 'deadbeef'.repeat(5), claim: 'x', resolvedAt: '2026-08-04T18:00:00Z' } }],
  }, { repoRoot: root, commitExists: () => false });
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /not merged|does not exist/i.test(e)), r.errors.join(' | '));
});

t('a code-change resolution without a claim is rejected', () => {
  const root = tmp();
  const r = canRetryJudgment(realWorldSidecar(root), {
    diffSha: 'f8933f2',
    objections: [{ ...OBJECTION, resolvedBy: { kind: 'code-change', commit: 'c'.repeat(40), resolvedAt: '2026-08-04T18:00:00Z' } }],
  }, { repoRoot: root, commitExists: () => true });
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /claim/.test(e)), r.errors.join(' | '));
});

// ── TC4 — REGRESSION: none of the original strictness may be lost ──────────
console.log('\nTC4 — the evidence path keeps every original guard');
const evidenceSidecar = () => ({
  class: 'judgment-on-evidence',
  diffSha: 'aaa',
  objections: [OBJECTION],
  evidence: [{ canonicalSource: 'example.com/known' }],
});

t('an unchanged diff still cannot retry', () => {
  const r = canRetryJudgment(evidenceSidecar(), {
    diffSha: 'aaa',
    objections: [{ ...OBJECTION, resolvedBy: { source: 'https://new.example/x', excerpt: 'e', claim: 'c', resolvedAt: '2026-08-04T18:00:00Z' } }],
  });
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /diffSha unchanged/.test(e)));
});

t('a re-used (non-novel) source is still rejected', () => {
  const r = canRetryJudgment(evidenceSidecar(), {
    diffSha: 'bbb',
    objections: [{ ...OBJECTION, resolvedBy: { source: 'https://example.com/known', excerpt: 'e', claim: 'c', resolvedAt: '2026-08-04T18:00:00Z' } }],
  });
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /not novel/.test(e)), r.errors.join(' | '));
});

t('an objection with no resolvedBy is still rejected', () => {
  const r = canRetryJudgment(evidenceSidecar(), { diffSha: 'bbb', objections: [{ ...OBJECTION }] });
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /no resolvedBy/.test(e)));
});

t('a changed objection identity is still rejected', () => {
  const r = canRetryJudgment(evidenceSidecar(), {
    diffSha: 'bbb',
    objections: [{ ...OBJECTION, field: 'max_bed_temp', resolvedBy: { source: 'https://n.example/x', excerpt: 'e', claim: 'c', resolvedAt: '2026-08-04T18:00:00Z' } }],
  });
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /identity or order changed/.test(e)));
});

t('a non-judgment-on-evidence class is still rejected', () => {
  const r = canRetryJudgment({ ...evidenceSidecar(), class: 'decision-required' }, {
    diffSha: 'bbb',
    objections: [{ ...OBJECTION, resolvedBy: { source: 'https://n.example/x', excerpt: 'e', claim: 'c', resolvedAt: '2026-08-04T18:00:00Z' } }],
  });
  assert.ok(!r.ok);
});

t('a partially-answered objection set is still rejected', () => {
  const two = [OBJECTION, { ...OBJECTION, field: 'max_speed' }];
  const r = canRetryJudgment({ ...evidenceSidecar(), objections: two }, {
    diffSha: 'bbb',
    objections: [{ ...OBJECTION, resolvedBy: { source: 'https://n.example/x', excerpt: 'e', claim: 'c', resolvedAt: '2026-08-04T18:00:00Z' } }],
  });
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /count must match/.test(e)));
});

// ── TC5 — code-change must be BOUND to the objection (review RG-001) ───────
// "any merged commit + a claim" was trivially satisfiable, which defeats the
// gate's anti-reroll purpose even though a fresh R1/R2 still follows.
console.log('\nTC5 — a code-change commit must plausibly answer the objection');
const codeChangeAttempt = (over = {}) => ({
  diffSha: 'f8933f26e3201f4e8321b64999ae16d2677d7704',
  objections: [{
    ...OBJECTION,
    resolvedBy: {
      kind: 'code-change',
      commit: 'cc2ea767aedabf13f82cbe9aa2cd182e476650a4',
      claim: 'engine.js now clamps emitted acceleration',
      resolvedAt: '2026-08-04T18:00:00Z',
      ...over,
    },
  }],
});

t('a commit that PREDATES the objection is rejected', () => {
  const root = tmp();
  const r = canRetryJudgment(realWorldSidecar(root), codeChangeAttempt(), {
    repoRoot: root,
    inspectCommit: () => ({ merged: true, committedAt: '2026-07-01T00:00:00Z', touchesCode: true }),
  });
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /predates the objection/.test(e)), r.errors.join(' | '));
});

t('a docs-only commit is rejected', () => {
  const root = tmp();
  const r = canRetryJudgment(realWorldSidecar(root), codeChangeAttempt(), {
    repoRoot: root,
    inspectCommit: () => ({ merged: true, committedAt: '2026-08-04T18:00:00Z', touchesCode: false }),
  });
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /only docs/.test(e)), r.errors.join(' | '));
});

t('a commit newer than the objection that touches code is accepted', () => {
  const root = tmp();
  const r = canRetryJudgment(realWorldSidecar(root), codeChangeAttempt(), {
    repoRoot: root,
    inspectCommit: () => ({ merged: true, committedAt: '2026-08-04T18:00:00Z', touchesCode: true }),
  });
  assert.ok(r.ok, r.errors.join(' | '));
});

t('a ref expression is never handed to git', () => {
  const root = tmp();
  let sawCommit = null;
  const r = canRetryJudgment(realWorldSidecar(root), codeChangeAttempt({ commit: '--help' }), {
    repoRoot: root,
    inspectCommit: (c) => { sawCommit = c; return { merged: true, committedAt: null, touchesCode: true }; },
  });
  assert.ok(!r.ok);
  assert.strictEqual(sawCommit, null, 'the 40-hex test must run before any git call');
  assert.ok(r.errors.some((e) => /40-character commit sha/.test(e)));
});

// ── TC6 — ref containment (review RG-003) ──────────────────────────────────
console.log('\nTC6 — verdictRefs cannot point outside the runner state dir');
t('a ref escaping the bridge-reviews dir is ignored', () => {
  const root = tmp();
  const outside = path.join(root, 'evil.json');
  fs.writeFileSync(outside, `${JSON.stringify({ objections: [OBJECTION] })}\n`);
  const r = canRetryJudgment(
    { class: 'judgment-on-evidence', preservedRef: 'aaa', verdictRefs: [{ ref: '../evil.json' }] },
    { diffSha: 'bbb', objections: [] },
    { repoRoot: root, inspectCommit: () => ({ merged: true, touchesCode: true }) },
  );
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /objections are required/.test(e)),
    'an out-of-tree ref must not supply objections');
});

console.log(`\n[retry-gate-resolution] ${pass} passing, ${fail} failing`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
