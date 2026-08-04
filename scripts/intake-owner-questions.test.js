#!/usr/bin/env node
// Tests for the owner-question issue loop. Everything here is pure parsing and
// body construction — no `gh` calls, so the suite runs offline and in CI.
//
// Run: node scripts/intake-owner-questions.test.js

const assert = require('node:assert');
const {
  parseAnswers, buildBody, attestableOnly,
} = require('./intake-owner-questions.js');

let pass = 0;
let fail = 0;
const failures = [];
function t(name, fn) {
  try { fn(); pass += 1; console.log(`  ok  ${name}`); }
  catch (e) { fail += 1; failures.push(`${name}: ${e.message}`); console.log(`  FAIL ${name} — ${e.message}`); }
}

const wrap = (yaml) => `preamble\n\n\`\`\`yaml\n${yaml}\n\`\`\`\n\ntrailer`;

// ── TC1 — we only ever ASK about answerable fields ──────────────────────────
console.log('\nTC1 — question scope');
t('non-attestable fields are refused, not asked', () => {
  const { allowed, refused } = attestableOnly('enclosure,max_bed_temp,series');
  assert.deepStrictEqual(allowed, ['enclosure', 'series']);
  assert.deepStrictEqual(refused, ['max_bed_temp']);
});

t('the generated body only contains the allowed fields', () => {
  const body = buildBody('kobra_2_neo', ['enclosure'], 'anycubic wiki 404');
  assert.ok(body.includes('**kobra_2_neo**'));
  assert.ok(body.includes('  enclosure:'));
  assert.ok(!body.includes('max_bed_temp'));
  assert.ok(body.includes('anycubic wiki 404'));
});

t('a freshly generated body parses to zero answers (template is not an answer)', () => {
  const { answers, errors } = parseAnswers(buildBody('kobra_2_neo', ['enclosure', 'series']));
  assert.deepStrictEqual(answers, []);
  assert.deepStrictEqual(errors, []);
});

// ── TC2 — a filled answer parses ────────────────────────────────────────────
console.log('\nTC2 — filled answers');
t('a complete answer is extracted', () => {
  const { answers, errors } = parseAnswers(wrap([
    'answers:',
    '  enclosure:',
    '    value: none',
    '    source: https://all3dp.com/kobra-2-neo',
    '    claim: product photo shows open gantry',
  ].join('\n')));
  assert.deepStrictEqual(errors, []);
  assert.strictEqual(answers.length, 1);
  assert.deepStrictEqual(answers[0], {
    field: 'enclosure', value: 'none',
    source: 'https://all3dp.com/kobra-2-neo', claim: 'product photo shows open gantry',
  });
});

t('the template comment hints are stripped from values', () => {
  const { answers } = parseAnswers(wrap([
    'answers:',
    '  enclosure:',
    '    value: none   # none | passive | active_heated',
    '    source: https://x.example/a  # a URL',
    '    claim: open gantry  # what it shows',
  ].join('\n')));
  assert.strictEqual(answers[0].value, 'none');
  assert.strictEqual(answers[0].source, 'https://x.example/a');
  assert.strictEqual(answers[0].claim, 'open gantry');
});

t('quoted values are unwrapped', () => {
  const { answers } = parseAnswers(wrap([
    'answers:',
    '  enclosure:',
    '    value: "none"',
    "    source: 'https://x.example/a'",
    '    claim: "open gantry"',
  ].join('\n')));
  assert.strictEqual(answers[0].value, 'none');
  assert.strictEqual(answers[0].source, 'https://x.example/a');
});

// ── TC3 — OWNER DECISION: partial answers across sittings ───────────────────
// "I can maybe add answers not at once but separately.. it should consider them
// all". One answered field alongside two untouched ones must yield exactly one
// consumable answer and NO errors — the blanks are future work, not failures.
console.log('\nTC3 — partial answers are normal, not errors');
t('one answered field among three blanks yields one answer and no errors', () => {
  const { answers, errors } = parseAnswers(wrap([
    'answers:',
    '  enclosure:',
    '    value: none',
    '    source: https://all3dp.com/x',
    '    claim: open gantry',
    '  series:',
    '    value:   # bedslinger | corexy',
    '    source:  # a URL',
    '    claim:   # what it shows',
    '  available_plates:',
    '    value:',
    '    source:',
    '    claim:',
  ].join('\n')));
  assert.deepStrictEqual(errors, []);
  assert.deepStrictEqual(answers.map((a) => a.field), ['enclosure']);
});

t('two fields answered in the same block both come through', () => {
  const { answers } = parseAnswers(wrap([
    'answers:',
    '  enclosure:',
    '    value: none',
    '    source: https://a.example/1',
    '    claim: open',
    '  series:',
    '    value: bedslinger',
    '    source: https://b.example/2',
    '    claim: bed moves front to back',
  ].join('\n')));
  assert.deepStrictEqual(answers.map((a) => a.field).sort(), ['enclosure', 'series']);
});

// ── TC4 — fail closed on a half-filled field ────────────────────────────────
console.log('\nTC4 — fail closed');
t('a field with a value but no source is NOT consumed', () => {
  const { answers, errors } = parseAnswers(wrap([
    'answers:', '  enclosure:', '    value: none', '    source:', '    claim:',
  ].join('\n')));
  assert.deepStrictEqual(answers, []);
  assert.ok(errors.some((e) => /partially filled/.test(e)), errors.join(' | '));
});

t('a non-http source is NOT consumed', () => {
  const { answers, errors } = parseAnswers(wrap([
    'answers:', '  enclosure:', '    value: none',
    '    source: ask me', '    claim: open',
  ].join('\n')));
  assert.deepStrictEqual(answers, []);
  assert.ok(errors.some((e) => /http/.test(e)));
});

t('a non-attestable field in the block is ignored with a note', () => {
  const { answers, errors } = parseAnswers(wrap([
    'answers:', '  max_bed_temp:', '    value: 110',
    '    source: https://a.example/1', '    claim: spec table',
  ].join('\n')));
  assert.deepStrictEqual(answers, [], 'a bed temp must never survive the parser');
  assert.ok(errors.some((e) => /not owner-attestable/.test(e)));
});

t('a body with no yaml block fails closed', () => {
  const { answers, errors } = parseAnswers('just some prose, no block');
  assert.deepStrictEqual(answers, []);
  assert.ok(errors.length > 0);
});

console.log(`\n[owner-questions] ${pass} passing, ${fail} failing`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
