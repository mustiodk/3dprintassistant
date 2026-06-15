// node --test functions/api/_lib/printer-mention.test.mjs
// ESM unit tests for the deterministic printer-mention extractor (S2 Gate 1).
// Matches the live functions/api/*.test.mjs pattern (no package.json, .mjs = ESM).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPrinterMention } from './printer-mention.js';

const f = (text) => [{ label: 'Message', value: text }];

test('recall: brand + model (Sovol SV08)', () => {
  const m = extractPrinterMention(f('can you add the Sovol SV08'));
  assert.ok(m, 'should extract');
  assert.equal(m.brand, 'Sovol');
  assert.equal(m.model, 'SV08');
  assert.equal(m.span, 'Sovol SV08');
});

test('recall: family token, no explicit brand (Kobra 3 Max)', () => {
  const m = extractPrinterMention(f('please support Kobra 3 Max'));
  assert.ok(m);
  assert.equal(m.brand, undefined);            // family, not brand
  assert.equal(m.model, 'Kobra 3 Max');
});

test('recall: family with multiple model tokens (Ender 3 V3 KE)', () => {
  const m = extractPrinterMention(f('Ender 3 V3 KE is missing'));
  assert.ok(m);
  assert.equal(m.model, 'Ender 3 V3 KE');      // 3 model tokens, stops before "is"
});

test('recall: pure-alpha model name (Voxelab Aries)', () => {
  const m = extractPrinterMention(f('add Voxelab Aries'));
  assert.ok(m);
  assert.equal(m.brand, 'Voxelab');
  assert.equal(m.model, 'Aries');
});

test('recall: brand + model with trailing prose (Prusa MK4S)', () => {
  const m = extractPrinterMention(f("my Prusa MK4S isn't in the list"));
  assert.ok(m);
  assert.equal(m.brand, 'Prusa');
  assert.equal(m.model, 'MK4S');
});

test('recall: brand only, no model → model empty (Scout → incomplete)', () => {
  const m = extractPrinterMention(f('my Prusa is missing'));
  assert.ok(m);
  assert.equal(m.brand, 'Prusa');
  assert.equal(m.model, '');
  assert.equal(m.span, 'Prusa');
});

// ── precision: must return null (no brand/family token) ──
for (const neg of [
  'love this app',
  'the export button is broken',
  'please add a dark mode toggle',
  'great filament database',
  'Error 500 on export',
  'version 2 feedback',
  'I service my printer regularly',   // 2-char family "sv" must NOT hit "service"
]) {
  test(`precision: null for ${JSON.stringify(neg)}`, () => {
    assert.equal(extractPrinterMention(f(neg)), null);
  });
}

// ── span-tightness: must extract the tight span, never let a resin word in ──
test('span-tightness: stops before descriptive/resin prose', () => {
  const m = extractPrinterMention(f('the Sovol SV08 is great, prints sonic-fast'));
  assert.ok(m);
  assert.equal(m.model, 'SV08');
  assert.equal(m.span, 'Sovol SV08');
  assert.ok(!/sonic/i.test(m.span), 'resin keyword must not enter the span');
});

test('span-tightness: a resin word adjacent to the model is excluded', () => {
  // "Anycubic Photon" — Photon is resin; the span must not carry it into fdmDecline.
  const m = extractPrinterMention(f('Anycubic Photon Mono is missing'));
  assert.ok(m);
  assert.equal(m.brand, 'Anycubic');
  assert.ok(!/photon|mono/i.test(m.span), `resin words must be excluded, got span ${JSON.stringify(m.span)}`);
});

// ── PII: contact info adjacent to a brand must NOT enter the stored span ──
test('PII: an email token adjacent to a brand is excluded from the span', () => {
  const m = extractPrinterMention(f('add Sovol SV08 contact bob2@gmail.com'));
  assert.ok(m);
  assert.ok(!/@/.test(m.span), `span must not carry an email, got ${JSON.stringify(m.span)}`);
  assert.equal(m.span, 'Sovol SV08');
});
test('PII: a long phone-like number adjacent to a brand is excluded', () => {
  const m = extractPrinterMention(f('please add Prusa 5551234567 call me'));
  assert.ok(m);
  assert.equal(m.brand, 'Prusa');
  assert.ok(!/\d{5,}/.test(m.span), `span must not carry a phone number, got ${JSON.stringify(m.span)}`);
});

// ── precision: ambiguous tokens must not false-fire ──
test('precision: bare "mega" intensifier does not fire (not a family token)', () => {
  assert.equal(extractPrinterMention(f('this is a mega useful feature')), null);
});
test('precision: SHORT_FAMILY needs a strong (digit/variant) adjacent token', () => {
  assert.equal(extractPrinterMention(f('the MK Ultra theory')), null);
  assert.equal(extractPrinterMention(f('A1 Sauce recipe please')), null);
  assert.equal(extractPrinterMention(f('the X1 Export is broken')), null);
  assert.equal(extractPrinterMention(f('P1 Dashboard crash')), null);
});

// ── recall: SHORT_FAMILY still fires on a real variant/digit; mega via brand ──
test('recall: SHORT_FAMILY fires with a variant or digit token', () => {
  assert.equal(extractPrinterMention(f('the X1 Carbon is missing')).model, 'X1 Carbon');
  assert.equal(extractPrinterMention(f('add A1 mini please')).model, 'A1 mini');
  assert.equal(extractPrinterMention(f('the MK 4 is missing')).model, 'MK 4');
});
test('recall: Anycubic Mega resolves via the brand token', () => {
  const m = extractPrinterMention(f('please add Anycubic Mega X'));
  assert.ok(m);
  assert.equal(m.brand, 'Anycubic');
  assert.equal(m.model, 'Mega X');
});

// ── resin keyword fused with a digit (Mars3/Saturn4) must still be excluded ──
test('span-tightness: a digit-fused resin word (Mars3) is excluded from the span', () => {
  const m = extractPrinterMention(f('Elegoo Mars3 Pro is missing'));
  assert.ok(m);
  assert.equal(m.brand, 'Elegoo');
  assert.ok(!/mars/i.test(m.span), `digit-fused resin word must not enter the span, got ${JSON.stringify(m.span)}`);
});

// ── shape / fail-open ──
test('fail-open: null/empty/garbage input → null', () => {
  assert.equal(extractPrinterMention(null), null);
  assert.equal(extractPrinterMention([]), null);
  assert.equal(extractPrinterMention([{ label: 'x' }]), null);        // no value
  assert.equal(extractPrinterMention([{ value: 42 }]), null);          // non-string value
});

test('per-field scan: a mention in any field value is found', () => {
  const m = extractPrinterMention([
    { label: 'Feedback', value: 'this is great' },
    { label: 'Details', value: 'oh and add the Creality Ender 5' },
  ]);
  assert.ok(m);
  assert.equal(m.brand, 'Creality');
  assert.equal(m.model, 'Ender 5');
});

test('2-char family requires an adjacent model token', () => {
  assert.equal(extractPrinterMention(f('the mk is great')), null);     // "mk" alone → no fire
  const m = extractPrinterMention(f('the MK 4 is missing'));           // "MK 4" → fires
  assert.ok(m);
  assert.equal(m.model, 'MK 4');
});
