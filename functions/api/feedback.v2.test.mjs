import assert from "node:assert/strict";
import test from "node:test";

import { onRequestPost } from "./feedback.js";

const dataKey = Buffer.alloc(32, 3).toString("base64");
const payload = {
  schemaVersion: "feedback_v2", category: "bugReport",
  userContent: { whatHappened: "My private description", email: "private@example.com" },
  diagnostics: {
    capturedAt: "2026-07-31T12:00:00Z", captureReason: "export_failed", entryPoint: "output.export_error",
    application: { platform: "web", releaseChannel: "production", appVersion: "web-abc", releaseId: "abc" },
    physicalPrinter: { kind: "supported", printerId: "bambu_p1s", match: "same" },
    configuration: { printer: "bambu_p1s", slicer: "orca", exportType: "bundle" },
    catalog: { selectedPrinterResolved: true }, runtime: { online: true },
    failure: { code: "export_failed", subsystem: "export", operation: "bundle", safeMessage: "Export failed" },
    breadcrumbs: [{ name: "export_failed", ageMs: 0, screen: "output", props: { operation: "bundle" } }],
  },
};

function harness(overrides = {}) {
  const inserts = [];
  const db = { prepare(sql) { return { bind(...values) { return { async run() { inserts.push({ sql, values }); return { meta: { changes: 1 } }; } }; } }; } };
  return { inserts, env: {
    FEEDBACK_DB: db, FEEDBACK_DATA_KEY: dataKey,
    FEEDBACK_RATE_LIMITER: { async limit() { return { success: true }; } },
    DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/1/token",
    ...overrides,
  } };
}

function request(body, headers = {}) {
  return new Request("https://3dprintassistant.com/api/feedback", { method: "POST", headers: { Origin: "https://3dprintassistant.com", "Content-Type": "application/json", ...headers }, body });
}

test("stores encrypted v2 content before sending a minimized Discord alert", async () => {
  const originalFetch = globalThis.fetch;
  const posts = [];
  globalThis.fetch = async (_url, init) => { posts.push(JSON.parse(init.body)); return new Response(null, { status: 204 }); };
  try {
    const { env, inserts } = harness();
    const response = await onRequestPost({ request: request(JSON.stringify(payload)), env });
    const json = await response.json();
    assert.equal(response.status, 200);
    assert.match(json.reportId, /^RPT-/);
    assert.equal(json.notified, true);
    assert.equal(inserts.length, 1);
    const stored = JSON.stringify(inserts[0].values);
    assert.doesNotMatch(stored, /private@example|private description/);
    const alert = JSON.stringify(posts[0]);
    assert.match(alert, new RegExp(json.reportId));
    assert.doesNotMatch(alert, /private@example|private description|breadcrumbs|sentry/i);
  } finally { globalThis.fetch = originalFetch; }
});

test("enforces actual 32 KiB, rate limits before reading, and fails closed without storage", async () => {
  const large = JSON.stringify({ ...payload, userContent: { whatHappened: "x".repeat(33 * 1024) } });
  assert.equal((await onRequestPost({ request: request(large, { "Content-Length": "1" }), env: harness().env })).status, 413);
  const limited = harness({ FEEDBACK_RATE_LIMITER: { async limit() { return { success: false }; } } });
  assert.equal((await onRequestPost({ request: request(JSON.stringify(payload)), env: limited.env })).status, 429);
  const noDb = harness(); delete noDb.env.FEEDBACK_DB;
  assert.equal((await onRequestPost({ request: request(JSON.stringify(payload)), env: noDb.env })).status, 503);
});

test("keeps a stored report when Discord fails", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 500 });
  try {
    const { env, inserts } = harness();
    const response = await onRequestPost({ request: request(JSON.stringify(payload)), env });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json().then(({ ok, notified }) => ({ ok, notified })), { ok: true, notified: false });
    assert.equal(inserts.length, 1);
  } finally { globalThis.fetch = originalFetch; }
});
