import { env } from "cloudflare:workers";
import { beforeEach, expect, it } from "vitest";

import { insertFeedbackReport } from "../_lib/feedback-store.js";
import { runFeedbackRetention } from "../_lib/feedback-retention.js";

beforeEach(async () => env.FEEDBACK_DB.prepare("DELETE FROM feedback_reports").run());

it("deletes expired feedback and no-ops without a binding", async () => {
  const base = { schemaVersion: "feedback_v2", category: "bugReport", source: "web", receivedAt: "2026-01-01", capturedAt: null, appVersion: null, buildNumber: null, releaseChannel: null, physicalPrinter: null, selectedPrinter: null, errorCode: null, userContentCiphertext: "c", userContentIv: "i", diagnosticsJson: "{}", breadcrumbsJson: "[]", issueFingerprint: "f" };
  await insertFeedbackReport(env.FEEDBACK_DB, { ...base, reportId: "RPT-old", expiresAt: "2026-07-01T00:00:00Z" });
  await insertFeedbackReport(env.FEEDBACK_DB, { ...base, reportId: "RPT-new", expiresAt: "2026-09-01T00:00:00Z" });
  await expect(runFeedbackRetention({ FEEDBACK_DB: env.FEEDBACK_DB }, new Date("2026-07-31T00:00:00Z"))).resolves.toEqual({ feedbackRemoved: 1 });
  await expect(runFeedbackRetention({}, new Date())).resolves.toEqual({ feedbackRemoved: 0 });
});
