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

// value/source keep stripping silently — the natural way to answer is to type
// the value and leave the template hint in place. `claim` is free prose where a
// `#` may be content, so there ambiguity is refused instead (see TC4).
t('template hints are stripped from value and source', () => {
  const { answers, errors } = parseAnswers(wrap([
    'answers:',
    '  enclosure:',
    '    value: none   # none | passive | active_heated',
    '    source: https://x.example/a  # a URL',
    '    claim: open gantry',
  ].join('\n')));
  assert.deepStrictEqual(errors, []);
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

// Cross-model review SHOULD-FIX-1: the comment stripper ate '#' inside a
// legitimate quoted claim, truncating provenance text with no error.
t('a # inside a QUOTED claim survives', () => {
  const { answers } = parseAnswers(wrap([
    'answers:', '  enclosure:', '    value: none',
    '    source: https://a.example/1',
    '    claim: "photo caption says #3 is open-frame"',
  ].join('\n')));
  assert.strictEqual(answers[0].claim, 'photo caption says #3 is open-frame');
});

t('a quoted value with a trailing comment still strips the comment', () => {
  const { answers } = parseAnswers(wrap([
    'answers:', '  enclosure:', '    value: "none"   # the hint',
    '    source: https://a.example/1', '    claim: "open"',
  ].join('\n')));
  assert.strictEqual(answers[0].value, 'none');
});

t('an UNQUOTED trailing comment is still stripped from value', () => {
  const { answers } = parseAnswers(wrap([
    'answers:', '  enclosure:', '    value: none # open frame',
    '    source: https://a.example/1', '    claim: open',
  ].join('\n')));
  assert.strictEqual(answers[0].value, 'none');
});

// The reviewer's final case: unquoted '#' in free prose silently truncated the
// claim and still consumed it. Refused now, with the fix named in the message.
t('an unquoted # in a CLAIM is refused rather than truncated', () => {
  const { answers, errors } = parseAnswers(wrap([
    'answers:', '  enclosure:', '    value: none',
    '    source: https://a.example/1',
    '    claim: photo caption says #3 is open-frame',
  ].join('\n')));
  assert.deepStrictEqual(answers, [], 'a truncated claim must not be consumed');
  assert.ok(errors.some((e) => /wrap the claim in quotes/.test(e)), errors.join(' | '));
});

// Cross-model confirmation review: malformed answers were silently mangled
// (an unterminated quote parsed to '"photo'; a YAML block scalar parsed to '|')
// and still satisfied the non-empty check downstream. Fail closed instead.
t('an unterminated quote is refused, not half-parsed', () => {
  const { answers, errors } = parseAnswers(wrap([
    'answers:', '  enclosure:', '    value: none',
    '    source: https://a.example/1',
    '    claim: "photo #3 shows open',
  ].join('\n')));
  assert.deepStrictEqual(answers, [], 'a mangled claim must never be consumed');
  assert.ok(errors.some((e) => /unterminated quote/.test(e)), errors.join(' | '));
});

// Every block-scalar header form, including the comment and indentation-
// indicator variants a first attempt at this check missed.
for (const header of ['|', '>', '|-', '|+', '|2-', '>2+', '| # explain below', '>- # note']) {
  t(`a YAML block scalar header ${JSON.stringify(header)} is refused`, () => {
    const { answers, errors } = parseAnswers(wrap([
      'answers:', '  enclosure:', '    value: none',
      '    source: https://a.example/1', `    claim: ${header}`,
    ].join('\n')));
    assert.deepStrictEqual(answers, [], `${header} must not be consumed`);
    assert.ok(errors.some((e) => /multi-line/.test(e)), errors.join(' | '));
  });
}

t('a quote INSIDE an unquoted value is left alone', () => {
  const { answers } = parseAnswers(wrap([
    'answers:', '  enclosure:', '    value: none',
    '    source: https://a.example/1',
    "    claim: the maker's own photo shows an open frame",
  ].join('\n')));
  assert.strictEqual(answers[0].claim, "the maker's own photo shows an open frame");
});

t('a body with no yaml block fails closed', () => {
  const { answers, errors } = parseAnswers('just some prose, no block');
  assert.deepStrictEqual(answers, []);
  assert.ok(errors.length > 0);
});

// ── TC5 — answers in COMMENTS (the 2026-08-05 live-test failure) ───────────
// The owner replied in a comment; the parser only read the body, so the run
// reported answered=0 and did nothing. Everything below exercises readAnswers'
// multi-source collection through a stubbed issue rather than gh.
console.log('\nTC5 — answers may live in body or comments');
{
  const qs = require('./intake-owner-questions.js');
  const block = (field, value) => ['```yaml', 'answers:', `  ${field}:`,
    `    value: ${value}`, '    source: https://a.example/1', '    claim: seen it',
    '```'].join('\n');

  // readAnswers() calls gh; swap findIssue's transport by driving the exported
  // collector + parser directly, which is the logic the defect lived in.
  const readFrom = (issue) => {
    const sources = qs.collectAnswerSources(issue);
    const byField = new Map();
    for (const src of sources) {
      for (const a of qs.parseAnswers(src.body).answers) byField.set(a.field, { ...a, answeredBy: src.by });
    }
    return [...byField.values()];
  };

  t('an answer in a comment is found', () => {
    const answers = readFrom({
      body: 'blank template, nothing filled',
      author: { login: 'runner' },
      comments: [{ body: block('enclosure', 'none'), author: { login: 'mustiodk' }, createdAt: '2026-08-05T09:00:00Z' }],
    });
    assert.deepStrictEqual(answers.map((a) => a.field), ['enclosure']);
    assert.strictEqual(answers[0].answeredBy, 'mustiodk');
  });

  t('answers spread across two comments are merged', () => {
    const answers = readFrom({
      body: 'template',
      comments: [
        { body: block('enclosure', 'none'), author: { login: 'mustiodk' }, createdAt: '2026-08-05T09:00:00Z' },
        { body: block('series', 'bedslinger'), author: { login: 'mustiodk' }, createdAt: '2026-08-06T09:00:00Z' },
      ],
    });
    assert.deepStrictEqual(answers.map((a) => a.field).sort(), ['enclosure', 'series']);
  });

  t('a later comment supersedes an earlier answer for the same field', () => {
    const answers = readFrom({
      body: 'template',
      comments: [
        { body: block('enclosure', 'passive'), author: { login: 'mustiodk' }, createdAt: '2026-08-05T09:00:00Z' },
        { body: block('enclosure', 'none'), author: { login: 'mustiodk' }, createdAt: '2026-08-06T09:00:00Z' },
      ],
    });
    assert.strictEqual(answers.length, 1);
    assert.strictEqual(answers[0].value, 'none');
  });

  t('a prose-only comment contributes nothing and breaks nothing', () => {
    const answers = readFrom({
      body: 'template',
      comments: [
        { body: 'The Kobra 2 Neo is an open-frame printer. Source: https://x.example/a', author: { login: 'mustiodk' }, createdAt: '2026-08-05T09:00:00Z' },
        { body: block('enclosure', 'none'), author: { login: 'mustiodk' }, createdAt: '2026-08-05T10:00:00Z' },
      ],
    });
    assert.deepStrictEqual(answers.map((a) => a.field), ['enclosure']);
  });
}

// ── TC6 — prompts speak the catalog's vocabulary ───────────────────────────
console.log('\nTC6 — prompts ask what the field actually means');
t('the series prompt says FRAME TYPE and disclaims product line', () => {
  const body = buildBody('adventurer_3', ['series']);
  assert.ok(/FRAME TYPE/.test(body), 'series must not read as product line');
  assert.ok(/series_group/.test(body), 'must point at where the product line already lives');
  assert.ok(/bedslinger \| corexy/.test(body));
});

t('the plates prompt enumerates the accepted ids', () => {
  const body = buildBody('adventurer_3', ['available_plates']);
  for (const id of ['cool_plate', 'smooth_glass', 'textured_pei']) {
    assert.ok(body.includes(id), `${id} must be offered as a choice`);
  }
});

t('the template tells the owner to reply', () => {
  assert.ok(/Reply to this issue/i.test(buildBody('x', ['enclosure'])));
});

console.log(`\n[owner-questions] ${pass} passing, ${fail} failing`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
