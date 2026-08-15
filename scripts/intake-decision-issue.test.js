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
  repoRootForStateDir,
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

// ── TC2b — the command targets a root, it does not describe one (#34) ───────
// The old body said "Run it from the repo root". The parked sidecars are
// gitignored and host-local, so the only root that works is the automation
// checkout — and the failure is silent in the one case that matters: a dev tree
// carrying a STALE state dir writes the envelope, prints ok=true, and the runner
// never reads it. Naming the root in prose cannot fix that; binding the command
// to an absolute --repo-root can.
console.log('\nTC2b — the decision command is root-independent');

t('the generated command carries an absolute --repo-root', () => {
  const body = buildBody({ candidateId: 'ender_3_s1_pro', ...ENDER }, '/opt/checkout/3dprintassistant');
  assert.ok(body.includes('--repo-root /opt/checkout/3dprintassistant'),
    'command is not bound to a specific checkout');
});

t('every lane binds the root, not just the rd3 lane', () => {
  const series = buildBody({ candidateId: 'hi', ...HI }, '/opt/checkout/3dprintassistant');
  const generic = buildBody({ candidateId: 'z1', class: 'decision-required', reason: 'pd4-criteria-unmet', resolutionNote: 'n/a' },
    '/opt/checkout/3dprintassistant');
  assert.ok(series.includes('--repo-root /opt/checkout/3dprintassistant'), 'approve-series lane unbound');
  assert.ok(generic.includes('--repo-root /opt/checkout/3dprintassistant'), 'generic lane unbound');
});

t('the body no longer tells the owner to guess a root', () => {
  const body = buildBody({ candidateId: 'ender_3_s1_pro', ...ENDER }, '/opt/checkout/3dprintassistant');
  assert.ok(!/from the repo root/i.test(body), 'still instructs a relative, guessable root');
});

t('the script itself is invoked by absolute path, so cwd cannot matter', () => {
  const body = buildBody({ candidateId: 'ender_3_s1_pro', ...ENDER }, '/opt/checkout/3dprintassistant');
  assert.ok(body.includes('node /opt/checkout/3dprintassistant/scripts/intake-owner-decision.js'),
    'a relative script path still makes the command cwd-dependent');
  assert.ok(!/node scripts\//.test(body), 'relative invocation still present');
});

t('the root is derived from the state dir that actually held the sidecar', () => {
  assert.strictEqual(
    repoRootForStateDir('/opt/checkout/3dprintassistant/scripts/.intake-runner-state'),
    '/opt/checkout/3dprintassistant',
  );
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

// ── TC4 — the receipt POSTRUN check 7 reads ─────────────────────────────────
console.log('\nTC4 — sweep receipt');

const { writeReceipt, receiptPath } = require('./intake-decision-issue.js');

t('a receipt records what the sweep decided, not just that it ran', () => {
  const dir = tmpStateDir();
  writeReceipt(dir, { action: 'sync', opened: [{ candidateId: 'hi', issue: 29 }], closed: [], existing: [28] });
  const receipt = JSON.parse(fs.readFileSync(receiptPath(dir), 'utf8'));
  assert.strictEqual(receipt.schema, 'intake-decision-sync@1');
  assert.deepStrictEqual(receipt.opened, [{ candidateId: 'hi', issue: 29 }]);
  assert.deepStrictEqual(receipt.existing, [28]);
  assert.ok(!Number.isNaN(Date.parse(receipt.syncedAt)), 'no timestamp');
});

t('a zero-change sweep still writes a receipt — silence must be provable', () => {
  const dir = tmpStateDir();
  writeReceipt(dir, { action: 'sync', opened: [], closed: [], existing: [] });
  assert.ok(fs.existsSync(receiptPath(dir)));
});

t('the receipt is rewritten, not appended, so its mtime means "this run"', () => {
  const dir = tmpStateDir();
  writeReceipt(dir, { action: 'sync', opened: [], closed: [], existing: [1] });
  writeReceipt(dir, { action: 'sync', opened: [], closed: [], existing: [2] });
  const receipt = JSON.parse(fs.readFileSync(receiptPath(dir), 'utf8'));
  assert.deepStrictEqual(receipt.existing, [2]);
});

t('a missing state dir does not stop the sweep from leaving its receipt', () => {
  const dir = path.join(tmpStateDir(), 'not', 'created', 'yet');
  writeReceipt(dir, { action: 'sync', opened: [], closed: [], existing: [] });
  assert.ok(fs.existsSync(receiptPath(dir)));
});

// ── TC8 — an existing issue whose body has drifted is refreshed ─────────────
//
// planSync classified every already-open issue as `existing` and never looked at
// it again, so a fix to buildBody only reached issues opened AFTER the fix. That
// is how #36 and #29 both kept telling the owner to "run it from the repo root"
// for two days after d2c39d3 corrected exactly that sentence — the generator was
// right and every open issue was still wrong (2026-08-15; both had to be
// regenerated by hand).
//
// Refreshing the body is safe because the body is entirely machine-generated:
// the issue text itself directs owner notes to COMMENTS, which are untouched.
console.log('\nTC8 — drifted issue bodies are refreshed');

const REFRESH_ROOT = '/opt/checkout/3dprintassistant';
const currentBodyFor = (candidateId, park) =>
  buildBody({ candidateId, ...park }, REFRESH_ROOT);

t('an issue whose body matches the generator is NOT refreshed', () => {
  const park = { candidateId: 'hi', ...HI };
  const plan = planSync([park], [{ number: 31, body: currentBodyFor('hi', HI) }], REFRESH_ROOT);
  assert.deepStrictEqual(plan.toRefresh, []);
  assert.deepStrictEqual(plan.existing.map((e) => e.number), [31]);
});

t('an issue whose body has drifted IS planned for refresh', () => {
  const plan = planSync(
    [{ candidateId: 'hi', ...HI }],
    [{ number: 31, body: 'stale text **hi** telling you to run it from the repo root' }],
    REFRESH_ROOT,
  );
  assert.deepStrictEqual(plan.toRefresh.map((r) => r.issue.number), [31]);
  assert.strictEqual(plan.toRefresh[0].body, currentBodyFor('hi', HI));
  // still reported as existing — refresh is not a new lifecycle state
  assert.deepStrictEqual(plan.existing.map((e) => e.number), [31]);
  assert.deepStrictEqual(plan.toOpen, []);
  assert.deepStrictEqual(plan.toClose, []);
});

t('refresh is a fixpoint — replanning against the refreshed body plans nothing', () => {
  const parks = [{ candidateId: 'hi', ...HI }];
  const first = planSync(parks, [{ number: 31, body: 'drifted **hi**' }], REFRESH_ROOT);
  assert.strictEqual(first.toRefresh.length, 1);
  const second = planSync(parks, [{ number: 31, body: first.toRefresh[0].body }], REFRESH_ROOT);
  assert.strictEqual(second.toRefresh.length, 0);
});

t('without a repoRoot no refresh is planned — callers that cannot render opt out', () => {
  const plan = planSync([{ candidateId: 'hi', ...HI }], [{ number: 31, body: 'drifted **hi**' }]);
  assert.deepStrictEqual(plan.toRefresh, []);
});

t('refresh only touches the drifted issue, not its healthy sibling', () => {
  const plan = planSync(
    [{ candidateId: 'hi', ...HI }, { candidateId: 'ender3_s1_pro', ...ENDER }],
    [
      { number: 31, body: currentBodyFor('hi', HI) },
      { number: 36, body: 'stale **ender3_s1_pro** body' },
    ],
    REFRESH_ROOT,
  );
  assert.deepStrictEqual(plan.toRefresh.map((r) => r.issue.number), [36]);
});

t('the receipt records refreshed issues so a sweep can prove what it rewrote', () => {
  const dir = tmpStateDir();
  writeReceipt(dir, { action: 'sync', opened: [], closed: [], existing: [31], refreshed: [36] });
  const receipt = JSON.parse(fs.readFileSync(receiptPath(dir), 'utf8'));
  assert.deepStrictEqual(receipt.refreshed, [36]);
});

console.log(`\n${pass} passed, ${fail} failed`);
for (const f of failures) console.log(`  - ${f}`);
process.exit(fail === 0 ? 0 : 1);
