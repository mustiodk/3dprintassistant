#!/usr/bin/env node
// ─── Intake answer normalizer ───────────────────────────────────────────────
//
// The owner-question loop failed its first live test five times running, every
// time on FORMAT and never on content. The parser has since been made tolerant,
// but an answer written purely as prose still cannot be read mechanically.
//
// This agent closes that gap by TRANSCRIBING: the owner's words in, a canonical
// block out, posted as a comment the 12:00 intake run reads as if hand-typed.
//
// The suite's centre of gravity is TC2. The agent is not trusted — its output is
// checked against the owner's raw text, so "may transcribe, never witness" is a
// mechanical property rather than a hopeful instruction in a prompt.
//
// Run: node scripts/intake-answer-normalizer.test.js

const assert = require('node:assert');
const {
  MARKER, needsNormalizing, validateTranscription, buildPrompt, normalizeIssue,
} = require('./intake-answer-normalizer.js');

let pass = 0; let fail = 0; const failures = [];
function t(name, fn) {
  try { fn(); pass += 1; console.log(`  ok  ${name}`); }
  catch (e) { fail += 1; failures.push(`${name}: ${e.message}`); console.log(`  FAIL ${name} — ${e.message}`); }
}

const OWNER = 'mustiodk';
const issue = (comments, body = 'template with no answers') => ({
  number: 26, body, author: { login: OWNER }, comments,
});
const c = (body, at, login = OWNER) => ({ body, createdAt: at, author: { login } });

// ── TC1 — when is normalizing needed ───────────────────────────────────────
console.log('\nTC1 — when is normalizing needed');

t('owner prose that the parser cannot read needs normalizing', () => {
  const r = needsNormalizing(issue([c('The Kobra 2 Neo is open-frame. https://a.example/1', '2026-08-06T09:00:00Z')]));
  assert.strictEqual(r.needed, true, r.reason);
});

t('an already-parseable answer does NOT need normalizing', () => {
  const r = needsNormalizing(issue([c([
    'answers:', '  enclosure:', '    value: none',
    '    source: https://a.example/1', '    claim: open frame',
  ].join('\n'), '2026-08-06T09:00:00Z')]));
  assert.strictEqual(r.needed, false);
});

t('an issue whose newest comment is our own marker is skipped', () => {
  const r = needsNormalizing(issue([
    c('The Kobra 2 Neo is open-frame. https://a.example/1', '2026-08-06T09:00:00Z'),
    c(`${MARKER}\nanswers:\n  enclosure:\n    value: none`, '2026-08-06T11:30:00Z'),
  ]));
  assert.strictEqual(r.needed, false, 'must not re-normalize its own output');
});

t('owner content AFTER our marker needs normalizing again', () => {
  const r = needsNormalizing(issue([
    c(`${MARKER}\nold block`, '2026-08-06T11:30:00Z'),
    c('Actually it is passive, see https://a.example/2', '2026-08-06T12:00:00Z'),
  ]));
  assert.strictEqual(r.needed, true, r.reason);
});

t('an issue with no owner comments at all is skipped', () => {
  assert.strictEqual(needsNormalizing(issue([])).needed, false);
});

t('a non-owner comment does not trigger normalizing', () => {
  const r = needsNormalizing(issue([c('open frame https://a.example/1', '2026-08-06T09:00:00Z', 'someone-else')]));
  assert.strictEqual(r.needed, false);
});

// ── TC2 — the agent may transcribe, never witness ──────────────────────────
// This is the safety core. Everything else is plumbing.
console.log('\nTC2 — the agent may transcribe, never witness');

const OWNER_TEXT = 'The Kobra 2 Neo is an open-frame printer, not enclosed. '
  + 'The enclosure is open. Source: https://3dpros.com/printers/anycubic-kobra-2-neo';
const block = (lines) => ['answers:', ...lines].join('\n');

t('a faithful transcription passes', () => {
  const r = validateTranscription(block([
    '  enclosure:', '    value: none',
    '    source: https://3dpros.com/printers/anycubic-kobra-2-neo',
    '    claim: "open-frame printer, not enclosed"',
  ]), OWNER_TEXT);
  assert.ok(r.ok, r.errors.join(' | '));
  assert.strictEqual(r.answers[0].value, 'none');
});

t('a field the owner never mentioned is REJECTED', () => {
  const r = validateTranscription(block([
    '  enclosure:', '    value: none',
    '    source: https://3dpros.com/printers/anycubic-kobra-2-neo',
    '    claim: "open frame"',
    '  series:', '    value: bedslinger',
    '    source: https://3dpros.com/printers/anycubic-kobra-2-neo',
    '    claim: "i3 style"',
  ]), OWNER_TEXT);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /series/.test(e) && /did not mention/i.test(e)), r.errors.join(' | '));
});

t('a source the owner never wrote is REJECTED', () => {
  const r = validateTranscription(block([
    '  enclosure:', '    value: none',
    '    source: https://all3dp.com/invented-by-the-agent',
    '    claim: "open frame"',
  ]), OWNER_TEXT);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /source/.test(e) && /not written by the owner/i.test(e)), r.errors.join(' | '));
});

t('a non-attestable field is REJECTED even if the owner mentioned it', () => {
  const r = validateTranscription(block([
    '  max_bed_temp:', '    value: 110',
    '    source: https://3dpros.com/printers/anycubic-kobra-2-neo',
    '    claim: "spec table"',
  ]), `${OWNER_TEXT} max_bed_temp is 110`);
  assert.ok(!r.ok);
  assert.deepStrictEqual(r.answers, []);
});

t('an unparseable agent block is REJECTED', () => {
  const r = validateTranscription('I think the printer is open-frame.', OWNER_TEXT);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /no answers/i.test(e)), r.errors.join(' | '));
});

t('a URL differing only by trailing punctuation still matches', () => {
  const r = validateTranscription(block([
    '  enclosure:', '    value: none',
    '    source: https://3dpros.com/printers/anycubic-kobra-2-neo',
    '    claim: "open frame"',
  ]), 'The enclosure is open. See https://3dpros.com/printers/anycubic-kobra-2-neo.');
  assert.ok(r.ok, r.errors.join(' | '));
});

// ── TC3 — the prompt states the boundary ───────────────────────────────────
console.log('\nTC3 — the prompt states the boundary');

t('the prompt names the candidate, the fields, and the owner text', () => {
  const p = buildPrompt('kobra_2_neo', ['enclosure'], 'it is open frame https://a.example/1');
  assert.ok(p.includes('kobra_2_neo'));
  assert.ok(p.includes('enclosure'));
  assert.ok(p.includes('https://a.example/1'));
});

t('the prompt forbids research and invention', () => {
  const p = buildPrompt('kobra_2_neo', ['enclosure'], 'text');
  assert.ok(/do not research/i.test(p));
  assert.ok(/did not state|never invent/i.test(p));
});

t('the prompt offers only the attestable fields', () => {
  const p = buildPrompt('adventurer_3', ['series', 'available_plates'], 'text');
  assert.ok(p.includes('series'));
  assert.ok(p.includes('available_plates'));
  assert.ok(!/max_bed_temp/.test(p), 'must not advertise a non-attestable field');
});

// ── TC4 — orchestration ────────────────────────────────────────────────────
console.log('\nTC4 — orchestration');

const proseIssue = () => ({
  number: 26,
  body: 'The intake pipeline researched **kobra_2_neo** and needs: enclosure',
  author: { login: OWNER },
  comments: [c('The enclosure is open-frame. https://3dpros.com/x', '2026-08-06T09:00:00Z')],
});

t('a good transcription is posted', () => {
  const posted = [];
  const r = normalizeIssue(proseIssue(), {
    fields: ['enclosure'],
    agent: () => 'answers:\n  enclosure:\n    value: none\n    source: https://3dpros.com/x\n    claim: "open-frame"',
    post: (n, body) => posted.push({ n, body }),
    apply: true,
  });
  assert.strictEqual(r.posted, true, r.reason);
  assert.strictEqual(posted.length, 1);
  assert.ok(posted[0].body.includes(MARKER), 'must carry the idempotence marker');
});

t('a fabricated source is NOT posted', () => {
  const posted = [];
  const r = normalizeIssue(proseIssue(), {
    fields: ['enclosure'],
    agent: () => 'answers:\n  enclosure:\n    value: none\n    source: https://invented.example/y\n    claim: "open"',
    post: (n, body) => posted.push({ n, body }),
    apply: true,
  });
  assert.strictEqual(r.posted, false);
  assert.strictEqual(posted.length, 0, 'nothing may be posted when validation fails');
});

t('an agent crash is non-blocking', () => {
  const r = normalizeIssue(proseIssue(), {
    fields: ['enclosure'],
    agent: () => { throw new Error('transport blew up'); },
    post: () => { throw new Error('must not be called'); },
    apply: true,
  });
  assert.strictEqual(r.posted, false);
  assert.ok(/transport blew up/.test(r.reason), r.reason);
});

t('dry-run posts nothing but reports the block', () => {
  const r = normalizeIssue(proseIssue(), {
    fields: ['enclosure'],
    agent: () => 'answers:\n  enclosure:\n    value: none\n    source: https://3dpros.com/x\n    claim: "open-frame"',
    post: () => { throw new Error('must not be called'); },
    apply: false,
  });
  assert.strictEqual(r.posted, false);
  assert.ok(r.block.includes('enclosure'));
});

t('the posted block is itself parseable by the intake parser', () => {
  const { parseAnswers } = require('./intake-owner-questions.js');
  const posted = [];
  normalizeIssue(proseIssue(), {
    fields: ['enclosure'],
    agent: () => 'answers:\n  enclosure:\n    value: none\n    source: https://3dpros.com/x\n    claim: "open-frame"',
    post: (n, body) => posted.push(body),
    apply: true,
  });
  const parsed = parseAnswers(posted[0]);
  assert.strictEqual(parsed.answers.length, 1, 'the whole point is that the run can read it');
  assert.strictEqual(parsed.answers[0].field, 'enclosure');
  assert.strictEqual(parsed.answers[0].value, 'none');
});

// ── TC5 — correction vs uncertainty ────────────────────────────────────────
// Verified against the REAL agent 2026-08-06: it omits on genuine uncertainty
// ("might be open, or possibly passive — not sure") and takes the corrected
// value on an explicit correction ("Actually no, correction: it is passive").
// The spec said to omit on any contradiction; the implemented behaviour is
// better and is pinned here via stub agents so the distinction is a contract,
// not an accident of one model run.
console.log('\nTC5 — correction vs uncertainty');

const contradictoryIssue = (text) => ({
  number: 26,
  body: 'The intake pipeline researched **kobra_2_neo** and needs: enclosure',
  author: { login: OWNER },
  comments: [c(text, '2026-08-06T09:00:00Z')],
});

t('an omitted field (uncertainty) posts nothing', () => {
  const r = normalizeIssue(
    contradictoryIssue('The enclosure might be open, or possibly passive. https://3dpros.com/x'),
    {
      fields: ['enclosure'],
      agent: () => 'The owner gives two conflicting values with no way to choose.',
      post: () => { throw new Error('must not post'); },
      apply: true,
    },
  );
  assert.strictEqual(r.posted, false);
  assert.ok(/no answers/i.test(r.reason), r.reason);
});

t('a corrected value is accepted when the owner explicitly corrected themselves', () => {
  const posted = [];
  const r = normalizeIssue(
    contradictoryIssue('The enclosure is open. Actually no, correction: it is passive. https://3dpros.com/x'),
    {
      fields: ['enclosure'],
      agent: () => 'answers:\n  enclosure:\n    value: passive\n    source: https://3dpros.com/x\n    claim: "Actually no, correction: it is passive"',
      post: (n, body) => posted.push(body),
      apply: true,
    },
  );
  assert.strictEqual(r.posted, true, r.reason);
  // The claim carries the owner's correction verbatim, so the choice is auditable.
  assert.ok(posted[0].includes('Actually no, correction'), 'the owner must be able to see why');
});

console.log(`\n[answer-normalizer] ${pass} passing, ${fail} failing`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
