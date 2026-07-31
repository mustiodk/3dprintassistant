import assert from "node:assert/strict";
import test from "node:test";

globalThis.window = globalThis;
await import("../../feedback-owner.js");
const ui = globalThis.FeedbackOwner;

test("builds authenticated requests without persisting the token", () => {
  const request = ui.buildRequest("owner-token", { action: "list", limit: 25 });
  assert.equal(request.url, "/api/feedback-admin");
  assert.equal(request.init.headers["X-Analytics-Admin-Token"], "owner-token");
  assert.deepEqual(JSON.parse(request.init.body), { action: "list", limit: 25 });
});

test("escapes list and detail user content", () => {
  const list = ui.renderList([{ report_id: "RPT-one1", received_at: "2026-07-31", source: "web", app_version: "web-a", category: "bugReport", disposition: "new", error_code: "<script>" }]);
  assert.doesNotMatch(list, /<script>/);
  assert.match(list, /&lt;script&gt;/);
  const detail = ui.renderDetail({ report_id: "RPT-one1", userContent: { whatHappened: '<img src=x onerror="bad">' }, diagnostics: { failure: { code: "E1" } }, breadcrumbs: [], disposition: "new" }, [{ report_id: "RPT-two2", disposition: "duplicate" }]);
  assert.doesNotMatch(detail, /<img/);
  assert.match(detail, /&lt;img/);
  assert.match(detail, /RPT-two2/);
});

test("exposes only closed disposition actions", () => {
  assert.deepEqual(ui.dispositions, ["new", "needs_info", "actionable", "fixed", "duplicate", "unsupported", "not_reproducible", "closed_other"]);
});
