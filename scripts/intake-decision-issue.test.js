#!/usr/bin/env node
// Tests for the decision-required issue surface. Pure sidecar-reading and body
// construction — no `gh` calls, so the suite runs offline and in CI.
//
// Run: node scripts/intake-decision-issue.test.js

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  collectDecisionParks, buildBody, issueTitle, planSync, DECISION_LABEL,
} = require('./intake-decision-issue.js');

let pass = 0;
let fail = 0;
const failures = [];
function t(name, fn) {
  try { fn(); pass += 1; console.log(`  ok  ${name}`); }
  catch (e) { fail += 1; failures.push(`${name}: ${e.message}`); console.log(`  FAIL ${name} — ${e.message}`); }
}

function tmpStateDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'intake-decision-'));
}

function writePark(stateDir, candidateId, sidecar) {
  const dir = path.join(stateDir, 'parked', candidateId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'parked.json'), JSON.stringify({
    schema: 'intake-parked@2',
    candidateId,
    retries: 0,
    ...sidecar,
  }, null, 2));
  return dir;
}

const HI = {
  class: 'decision-required',
  reason: 'new-series-group',
  firstParkedAt: '2026-08-09T10:00:09.000Z',
  resolutionNote: 'Creality "Hi" confirmed FDM bed-slinger. Creality classifies this as the '
    + '"Hi Series"; no existing Creality sibling series_group matches. Owner taxonomy call.',
};

const ENDER = {
  class: 'decision-required',
  reason: 'needs-source-resolution',
  firstParkedAt: '2026-08-10T10:01:41.000Z',
  resolutionNote: 'max_speed is an unresolved manufacturer-vs-manufacturer conflict: '
    + 'the official manual states 150 mm/s while store.creality.com states 160mm/s.',
};

// ── TC1 — the sidecar store is the source of truth ──────────────────────────
console.log('\nTC1 — which parks need an issue');

t('only decision-required parks are collected', () => {
  const dir = tmpStateDir();
  writePark(dir, 'hi', HI);
  writePark(dir, 'kobra_2_neo', { class: 'availability-blocked', reason: 'review-unavailable' });
  writePark(dir, 'adventurer_3', { class: 'research-defect', reason: 'research-defect' });
  const parks = collectDecisionParks(dir);
  assert.deepStrictEqual(parks.map((p) => p.candidateId), ['hi']);
});

t('both current live parks are collected, sorted by candidate id', () => {
  const dir = tmpStateDir();
  writePark(dir, 'hi', HI);
  writePark(dir, 'ender3_s1_pro', ENDER);
  const parks = collectDecisionParks(dir);
  assert.deepStrictEqual(parks.map((p) => p.candidateId), ['ender3_s1_pro', 'hi']);
});

t('a park whose class was mislabelled but whose reason is decision-required still counts', () => {
  // Fail-open on notification: never let a taxonomy slip silence the owner.
  const dir = tmpStateDir();
  writePark(dir, 'x1', { reason: 'new-series-group' });
  assert.deepStrictEqual(collectDecisionParks(dir).map((p) => p.candidateId), ['x1']);
});

t('a missing or unreadable parked dir yields no parks rather than throwing', () => {
  assert.deepStrictEqual(collectDecisionParks(path.join(tmpStateDir(), 'nope')), []);
  const dir = tmpStateDir();
  fs.mkdirSync(path.join(dir, 'parked', 'broken'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'parked', 'broken', 'parked.json'), '{not json');
  assert.deepStrictEqual(collectDecisionParks(dir), []);
});

t('a candidate id that is not a safe token is refused, not shell-interpolated', () => {
  const dir = tmpStateDir();
  writePark(dir, 'ok_one', HI);
  const evil = path.join(dir, 'parked', 'a; rm -rf /');
  fs.mkdirSync(evil, { recursive: true });
  fs.writeFileSync(path.join(evil, 'parked.json'), JSON.stringify({ class: 'decision-required', reason: 'blocked' }));
  assert.deepStrictEqual(collectDecisionParks(dir).map((p) => p.candidateId), ['ok_one']);
});

// ── TC2 — the issue says what is stuck and how to unstick it ────────────────
console.log('\nTC2 — issue body');

t('title names the candidate and the decision', () => {
  assert.strictEqual(issueTitle({ candidateId: 'hi', reason: 'new-series-group' }),
    'intake: hi needs a decision — new-series-group');
});

t('body carries the candidate marker used to find the issue again', () => {
  const body = buildBody({ candidateId: 'hi', ...HI });
  assert.ok(body.includes('**hi**'), 'marker missing');
});

t('a new-series-group park is told to run approve-series with the real candidate id', () => {
  const body = buildBody({ candidateId: 'hi', ...HI });
  assert.ok(body.includes('approve-series'), 'no approve-series command');
  assert.ok(body.includes('--candidate hi'), 'command not bound to the candidate');
  assert.ok(body.includes('--series-group'), 'no series-group flag');
  assert.ok(!body.includes('provide-evidence'), 'offered the wrong lane');
});

t('a needs-source-resolution park is told to run provide-evidence on the rd3 lane', () => {
  const body = buildBody({ candidateId: 'ender3_s1_pro', ...ENDER });
  assert.ok(body.includes('provide-evidence'), 'no provide-evidence command');
  assert.ok(body.includes('--candidate ender3_s1_pro'));
  assert.ok(body.includes('rd3-external-evidence'), 'wrong or missing edge');
  assert.ok(!body.includes('approve-series'), 'offered the wrong lane');
});

t('an unmapped decision reason still produces an issue with the generic instruction', () => {
  const body = buildBody({ candidateId: 'z1', class: 'decision-required', reason: 'pd4-criteria-unmet', resolutionNote: 'n/a' });
  assert.ok(body.includes('**z1**'));
  assert.ok(body.includes('pd4-criteria-unmet'));
  assert.ok(body.length > 200, 'body too thin to act on');
});

t('the runner\'s own park note is quoted so the owner can decide without opening a shell', () => {
  const body = buildBody({ candidateId: 'ender3_s1_pro', ...ENDER });
  assert.ok(body.includes('150 mm/s'), 'the actual conflict is not in the issue');
});

t('the body never presents itself as an answer channel that bypasses verify-reentry', () => {
  const body = buildBody({ candidateId: 'hi', ...HI });
  assert.ok(/verify-reentry/.test(body), 'the gate is not named');
  assert.ok(!/```ya?ml/i.test(body), 'a yaml answers block would collide with the attestation parser');
});

// ── TC3 — sync is idempotent and closes what is no longer parked ────────────
console.log('\nTC3 — sync planning');

const openIssue = (n, candidateId) => ({ number: n, body: `stuff **${candidateId}** stuff` });

t('a park with no issue is planned for open', () => {
  const plan = planSync([{ candidateId: 'hi', ...HI }], []);
  assert.deepStrictEqual(plan.toOpen.map((p) => p.candidateId), ['hi']);
  assert.deepStrictEqual(plan.toClose, []);
});

t('a park that already has an open issue is left alone — no duplicate', () => {
  const plan = planSync([{ candidateId: 'hi', ...HI }], [openIssue(31, 'hi')]);
  assert.deepStrictEqual(plan.toOpen, []);
  assert.deepStrictEqual(plan.toClose, []);
  assert.deepStrictEqual(plan.existing.map((e) => e.number), [31]);
});

t('an issue whose candidate is no longer parked is planned for close', () => {
  const plan = planSync([], [openIssue(31, 'hi')]);
  assert.deepStrictEqual(plan.toOpen, []);
  assert.deepStrictEqual(plan.toClose.map((i) => i.number), [31]);
});

t('mixed state resolves each candidate independently', () => {
  const plan = planSync(
    [{ candidateId: 'hi', ...HI }, { candidateId: 'ender3_s1_pro', ...ENDER }],
    [openIssue(31, 'hi'), openIssue(30, 'gone_away')],
  );
  assert.deepStrictEqual(plan.toOpen.map((p) => p.candidateId), ['ender3_s1_pro']);
  assert.deepStrictEqual(plan.toClose.map((i) => i.number), [30]);
  assert.deepStrictEqual(plan.existing.map((e) => e.number), [31]);
});

t('sync is a fixpoint — replanning after a successful open changes nothing', () => {
  const parks = [{ candidateId: 'hi', ...HI }];
  const first = planSync(parks, []);
  assert.strictEqual(first.toOpen.length, 1);
  const second = planSync(parks, [openIssue(99, 'hi')]);
  assert.strictEqual(second.toOpen.length, 0);
  assert.strictEqual(second.toClose.length, 0);
});

t('the label is distinct from the owner-question label so answer parsing never sees these', () => {
  const { LABEL: questionLabel } = require('./intake-owner-questions.js');
  assert.notStrictEqual(DECISION_LABEL, questionLabel);
});

console.log(`\n${pass} passed, ${fail} failed`);
for (const f of failures) console.log(`  - ${f}`);
process.exit(fail === 0 ? 0 : 1);
