import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { deleteExpiredFeedbackReports, deleteFeedbackReport, insertFeedbackReport, listFeedbackReports, persistFeedbackReport, readFeedbackReport, setFeedbackDisposition } from "../_lib/feedback-store.js";

const row = (id, receivedAt = "2026-07-31T12:00:00.000Z") => ({
  reportId: id, schemaVersion: "feedback_v2", category: "bugReport", source: "web",
  receivedAt, capturedAt: receivedAt, appVersion: "web-abc", buildNumber: null,
  releaseChannel: "production", physicalPrinter: "bambu_p1s", selectedPrinter: "bambu_p1s",
  errorCode: "export_failed", userContentCiphertext: "cipher", userContentIv: "iv",
  diagnosticsJson: "{}", breadcrumbsJson: "[]", issueFingerprint: "fingerprint",
  expiresAt: "2026-10-29T12:00:00.000Z",
});

beforeEach(async () => env.FEEDBACK_DB.prepare("DELETE FROM feedback_reports").run());

describe("feedback D1 store", () => {
  it("writes, reads and lists newest first", async () => {
    await insertFeedbackReport(env.FEEDBACK_DB, row("RPT-old", "2026-07-30T12:00:00.000Z"));
    await insertFeedbackReport(env.FEEDBACK_DB, row("RPT-new"));
    expect((await readFeedbackReport(env.FEEDBACK_DB, "RPT-new")).category).toBe("bugReport");
    expect((await listFeedbackReports(env.FEEDBACK_DB, 10)).map((item) => item.report_id)).toEqual(["RPT-new", "RPT-old"]);
  });

  it("updates disposition, expires and deletes", async () => {
    await insertFeedbackReport(env.FEEDBACK_DB, { ...row("RPT-expired"), expiresAt: "2026-07-01T00:00:00.000Z" });
    await insertFeedbackReport(env.FEEDBACK_DB, row("RPT-live"));
    expect(await setFeedbackDisposition(env.FEEDBACK_DB, "RPT-live", "actionable")).toBe(true);
    expect((await readFeedbackReport(env.FEEDBACK_DB, "RPT-live")).disposition).toBe("actionable");
    expect(await deleteExpiredFeedbackReports(env.FEEDBACK_DB, "2026-07-31T00:00:00.000Z")).toBe(1);
    expect(await deleteFeedbackReport(env.FEEDBACK_DB, "RPT-live")).toBe(true);
  });

  it("retries only report-id collisions and stops after three", async () => {
    await insertFeedbackReport(env.FEEDBACK_DB, row("RPT-taken"));
    const ids = ["RPT-taken", "RPT-fresh"];
    await expect(persistFeedbackReport(env.FEEDBACK_DB, async (id) => row(id), () => ids.shift())).resolves.toBe("RPT-fresh");
    await expect(persistFeedbackReport(env.FEEDBACK_DB, async (id) => row(id), () => "RPT-taken")).rejects.toThrow("report_id_unavailable");
    await expect(persistFeedbackReport({ prepare() { throw new Error("database offline"); } }, async (id) => row(id), () => "RPT-any")).rejects.toThrow("database offline");
  });
});
