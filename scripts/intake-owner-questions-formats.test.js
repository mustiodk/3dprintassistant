#!/usr/bin/env node
// ─── The owner is not a robot ───────────────────────────────────────────────
//
// The first live test failed three times in a row on FORMAT, never on content:
//   2026-08-05  answered in a comment; the parser read only the body
//   2026-08-05  answered without a ``` fence; the parser required one
//   2026-08-06  wrote `None`; the enum matched case-sensitively
//
// Every one of those was a real answer with a real source, thrown away by an
// input parser pretending to be a safety mechanism. It isn't. The safety
// properties live downstream and are untouched by anything in this file:
//   - OWNER_ATTESTABLE_FIELDS  — only three fields can ever be answered
//   - ATTESTED_ENUMS / KNOWN_PLATE_IDS — values must be catalog tokens
//   - buildAttestation — source must be http(s), claim required
//   - the evidence gate, both PD5 reviewers, live verify, custody
//
// So the parser's job is to UNDERSTAND, not to police. Be liberal here; stay
// strict there. This suite pins the formats a person might reasonably write.
//
// Run: node scripts/intake-owner-questions-formats.test.js

const assert = require('node:assert');
const { parseAnswers } = require('./intake-owner-questions.js');

let pass = 0; let fail = 0; const failures = [];
function t(name, fn) {
  try { fn(); pass += 1; console.log(`  ok  ${name}`); }
  catch (e) { fail += 1; failures.push(`${name}: ${e.message}`); console.log(`  FAIL ${name} — ${e.message}`); }
}

const URL1 = 'https://3dpros.com/printers/anycubic-kobra-2-neo';
const one = (text, field = 'enclosure') => {
  const { answers, errors } = parseAnswers(text);
  const hit = answers.find((a) => a.field === field);
  assert.ok(hit, `no ${field} answer parsed — errors: ${errors.join(' | ') || 'none'}`);
  return hit;
};

// ── The canonical template, and the shapes it degrades into ────────────────
console.log('\nTC1 — the template, fenced and bare');
t('fenced block', () => {
  const a = one(['```yaml', 'answers:', '  enclosure:', '    value: none',
    `    source: ${URL1}`, '    claim: open frame', '```'].join('\n'));
  assert.strictEqual(a.value, 'none');
});

t('bare block (GitHub copy button drops the fence)', () => {
  const a = one(['answers:', '  enclosure:', '    value: none',
    `    source: ${URL1}`, '    claim: open frame'].join('\n'));
  assert.strictEqual(a.value, 'none');
});

t('no answers: header at all', () => {
  const a = one(['enclosure:', '  value: none', `  source: ${URL1}`, '  claim: open frame'].join('\n'));
  assert.strictEqual(a.value, 'none');
});

t('flat, no nesting', () => {
  const a = one(['enclosure: none', `source: ${URL1}`, 'claim: open frame'].join('\n'));
  assert.strictEqual(a.value, 'none');
});

// ── Case ───────────────────────────────────────────────────────────────────
console.log('\nTC2 — case is not a mistake');
t('capitalised value', () => assert.strictEqual(one(`enclosure: None\nsource: ${URL1}\nclaim: open`).value, 'None'));
t('capitalised keys', () => {
  const a = one(['Enclosure:', '  Value: none', `  Source: ${URL1}`, '  Claim: open frame'].join('\n'));
  assert.strictEqual(a.value, 'none');
});
t('uppercase field name', () => assert.strictEqual(one(`ENCLOSURE: none\nsource: ${URL1}\nclaim: open`).value, 'none'));

// ── Markdown, because this is a GitHub comment ─────────────────────────────
console.log('\nTC3 — markdown decoration');
t('bold keys', () => {
  const a = one(['**enclosure:**', '  **value:** none', `  **source:** ${URL1}`, '  **claim:** open frame'].join('\n'));
  assert.strictEqual(a.value, 'none');
});

t('bullet list', () => {
  const a = one(['- enclosure:', '  - value: none', `  - source: ${URL1}`, '  - claim: open frame'].join('\n'));
  assert.strictEqual(a.value, 'none');
});

t('equals instead of colon', () => {
  const a = one(['enclosure = none', `source = ${URL1}`, 'claim = open frame'].join('\n'));
  assert.strictEqual(a.value, 'none');
});

// ── A URL is a URL wherever it appears ─────────────────────────────────────
console.log('\nTC4 — sources found in prose');
t('bare url on its own line becomes the source', () => {
  const a = one(['enclosure: none', 'claim: the product photo shows an open frame', URL1].join('\n'));
  assert.strictEqual(a.source, URL1);
});

t('url inside a sentence', () => {
  const a = one(['enclosure: none', `claim: open frame, see ${URL1} for the photo`].join('\n'));
  assert.strictEqual(a.source, URL1);
});

t('markdown link', () => {
  const a = one(['enclosure: none', `source: [3D Printer Database](${URL1})`, 'claim: open frame'].join('\n'));
  assert.strictEqual(a.source, URL1);
});

// ── Multiple fields, mixed shapes ──────────────────────────────────────────
console.log('\nTC5 — several fields at once');
t('two fields, blank line between, quoted claims', () => {
  const text = [
    'answers:',
    '  series:',
    '    value: bedslinger',
    '    source: https://en.fss.flashforge.com/x.pdf',
    '    claim: "manual Move controls show the plate moving front/back"',
    '',
    '  available_plates:',
    '    value: smooth_glass',
    '    source: https://www.flashforge.dk/item/glass-build-plate',
    '    claim: "FlashForge sells a glass plate kit"',
  ].join('\n');
  const { answers } = parseAnswers(text);
  assert.deepStrictEqual(answers.map((a) => a.field).sort(), ['available_plates', 'series']);
});

t('two fields written flat', () => {
  const { answers } = parseAnswers([
    'series: bedslinger', 'source: https://a.example/1', 'claim: bed moves',
    '', 'available_plates: smooth_glass', 'source: https://b.example/2', 'claim: glass kit',
  ].join('\n'));
  assert.deepStrictEqual(answers.map((a) => a.field).sort(), ['available_plates', 'series']);
  assert.strictEqual(answers.find((a) => a.field === 'series').source, 'https://a.example/1');
});

// ── Still deterministic where it matters ───────────────────────────────────
console.log('\nTC6 — tolerance is not permissiveness');
t('pure prose with no field name yields nothing', () => {
  const { answers } = parseAnswers('The Kobra 2 Neo is a nice printer. I like it.');
  assert.deepStrictEqual(answers, []);
});

t('a non-attestable field is still refused', () => {
  const { answers, errors } = parseAnswers(`max_bed_temp: 110\nsource: ${URL1}\nclaim: spec table`);
  assert.deepStrictEqual(answers, []);
  assert.ok(errors.some((e) => /not owner-attestable/.test(e)), errors.join(' | '));
});

t('a field with no source is reported, not consumed', () => {
  const { answers, errors } = parseAnswers('enclosure: none\nclaim: open frame');
  assert.deepStrictEqual(answers, []);
  assert.ok(errors.length > 0, 'must say why it was not consumed');
});

t('a field mentioned with no value is not invented', () => {
  const { answers } = parseAnswers(`enclosure:\nsource: ${URL1}`);
  assert.deepStrictEqual(answers, []);
});

console.log(`\n[owner-questions-formats] ${pass} passing, ${fail} failing`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
