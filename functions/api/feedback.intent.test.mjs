// node --test functions/api/feedback.intent.test.mjs
// Integration test (research-capable screening, Gate 1): the /api/feedback tee
// threads `intent` into the KV record for a brand-less printer mention, does not
// tee non-printer feedback, and keeps the form lane intent-free. We capture
// env.PRINTER_INTAKE.put; the tee runs BEFORE the Discord webhook check, so no
// webhook/fetch mock is needed (the handler 500s afterwards — we assert on the tee).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from './feedback.js';

function mkEnv() {
  const captured = [];
  return {
    captured,
    env: {
      PRINTER_INTAKE: { put: async (k, v) => { captured.push({ k, v: JSON.parse(v) }); } },
      // no DISCORD_WEBHOOK_URL on purpose — handler errors AFTER the tee has run.
    },
  };
}
function mkReq(payload) {
  return new Request('https://3dprintassistant.com/api/feedback', {
    method: 'POST',
    headers: { Origin: 'https://3dprintassistant.com', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

test('tee threads intent for a brand-less printer mention (general feedback)', async () => {
  const { captured, env } = mkEnv();
  await onRequestPost({ request: mkReq({
    category: 'generalFeedback',
    fields: [{ label: 'Feedback', value: 'would love if you also had the Creator 5 pro' }],
    context: { appSource: 'web' },
  }), env });
  assert.equal(captured.length, 1, 'should tee exactly one record');
  const rec = captured[0].v;
  assert.equal(rec.lane, 'heuristic');
  assert.equal(rec.intent, 'unresolved-brand');
  assert.ok(rec.fields.some((f) => f.id === 'model' && /Creator 5/.test(f.value)), 'model field present');
  assert.ok(!rec.fields.some((f) => f.id === 'brand'), 'no brand field for a brand-less capture');
});

test('non-printer general feedback is NOT teed', async () => {
  const { captured, env } = mkEnv();
  await onRequestPost({ request: mkReq({
    category: 'generalFeedback',
    fields: [{ label: 'Feedback', value: 'love this app, please add dark mode' }],
    context: { appSource: 'web' },
  }), env });
  assert.equal(captured.length, 0, 'no tee for non-printer feedback');
});

test('missingPrinter form tees lane:form with no intent', async () => {
  const { captured, env } = mkEnv();
  await onRequestPost({ request: mkReq({
    category: 'missingPrinter',
    fields: [{ id: 'brand', label: 'Brand', value: 'Snapmaker' }, { id: 'model', label: 'Model', value: '2' }],
    context: { appSource: 'web' },
  }), env });
  assert.equal(captured.length, 1);
  assert.equal(captured[0].v.lane, 'form');
  assert.equal(captured[0].v.intent, undefined);
});
