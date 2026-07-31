import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { encryptUserContent } from "../_lib/feedback-crypto.js";
import { insertFeedbackReport } from "../_lib/feedback-store.js";
import { onRequestPost } from "../feedback-admin.js";

const key = "AwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM=";
const ownerEnv = { ...env, ANALYTICS_ADMIN_TOKEN: "owner-token", FEEDBACK_DATA_KEY: key };

async function seed(id = "RPT-test") {
  const encrypted = await encryptUserContent({ whatHappened: "Private text" }, key, id, "feedback_v2");
  await insertFeedbackReport(env.FEEDBACK_DB, {
    reportId: id, schemaVersion: "feedback_v2", category: "bugReport", source: "web",
    receivedAt: "2026-07-31T12:00:00Z", capturedAt: null, appVersion: "web-abc", buildNumber: null,
    releaseChannel: "production", physicalPrinter: "same", selectedPrinter: "p1s", errorCode: "E1",
    userContentCiphertext: encrypted.ciphertext, userContentIv: encrypted.iv,
    diagnosticsJson: JSON.stringify({ failure: { code: "E1" } }), breadcrumbsJson: "[]",
    issueFingerprint: "fingerprint", expiresAt: "2026-10-01T00:00:00Z", diagnosticCompleteness: "complete",
  });
}

function request(action, token = "owner-token") {
  return new Request("https://3dprintassistant.com/api/feedback-admin", { method: "POST", headers: { Origin: "https://3dprintassistant.com", "Content-Type": "application/json", "X-Analytics-Admin-Token": token }, body: JSON.stringify(action) });
}

beforeEach(async () => env.FEEDBACK_DB.prepare("DELETE FROM feedback_reports").run());

describe("feedback owner API", () => {
  it("rejects missing or mismatched tokens and unknown actions", async () => {
    expect((await onRequestPost({ request: request({ action: "list" }, ""), env: ownerEnv })).status).toBe(401);
    expect((await onRequestPost({ request: request({ action: "list" }, "wrong"), env: ownerEnv })).status).toBe(401);
    expect((await onRequestPost({ request: request({ action: "rawSql" }), env: ownerEnv })).status).toBe(400);
  });

  it("lists metadata and decrypts detail with matches on demand", async () => {
    await seed("RPT-one1"); await seed("RPT-two2");
    const list = await onRequestPost({ request: request({ action: "list", limit: 10 }), env: ownerEnv }).then((r) => r.json());
    expect(list.reports).toHaveLength(2);
    expect(JSON.stringify(list)).not.toContain("Private text");
    const detail = await onRequestPost({ request: request({ action: "detail", reportId: "RPT-one1" }), env: ownerEnv }).then((r) => r.json());
    expect(detail.report.userContent.whatHappened).toBe("Private text");
    expect(detail.matches).toHaveLength(1);
  });

  it("validates dispositions and deletes immediately", async () => {
    await seed();
    expect((await onRequestPost({ request: request({ action: "setDisposition", reportId: "RPT-test", disposition: "invalid" }), env: ownerEnv })).status).toBe(400);
    expect((await onRequestPost({ request: request({ action: "setDisposition", reportId: "RPT-test", disposition: "actionable" }), env: ownerEnv })).status).toBe(200);
    expect((await onRequestPost({ request: request({ action: "delete", reportId: "RPT-test" }), env: ownerEnv })).status).toBe(200);
  });
});
