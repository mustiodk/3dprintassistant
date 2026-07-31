import assert from "node:assert/strict";
import test from "node:test";

import { createReportId, decryptUserContent, encryptUserContent, fingerprintReport } from "./feedback-crypto.js";

const key = Buffer.alloc(32, 7).toString("base64");

test("report ids contain 80 bits of base64url entropy", () => {
  const id = createReportId();
  assert.match(id, /^RPT-[A-Za-z0-9_-]{14}$/);
  assert.equal(Buffer.from(id.slice(4), "base64url").length, 10);
});

test("fingerprints use stable failure facts and exclude identity/release", async () => {
  const base = { source: "web", summary: { selectedPrinter: "p1s", appVersion: "1" }, diagnostics: { failure: { code: "E1", subsystem: "export", operation: "bundle" }, configuration: { slicer: "orca", exportType: "bundle" } } };
  const first = await fingerprintReport(base);
  assert.equal(first, await fingerprintReport({ ...base, reportId: "other", receivedAt: "later", summary: { ...base.summary, appVersion: "2" } }));
  assert.notEqual(first, await fingerprintReport({ ...base, diagnostics: { ...base.diagnostics, failure: { ...base.diagnostics.failure, code: "E2" } } }));
});

test("AES-GCM round trips and binds report id plus schema", async () => {
  const encrypted = await encryptUserContent({ email: "a@example.com" }, key, "RPT-a", "feedback_v2");
  assert.deepEqual(await decryptUserContent(encrypted.ciphertext, encrypted.iv, key, "RPT-a", "feedback_v2"), { email: "a@example.com" });
  await assert.rejects(decryptUserContent(encrypted.ciphertext, encrypted.iv, key, "RPT-b", "feedback_v2"));
  await assert.rejects(decryptUserContent(encrypted.ciphertext, encrypted.iv, Buffer.alloc(32, 8).toString("base64"), "RPT-a", "feedback_v2"));
});
