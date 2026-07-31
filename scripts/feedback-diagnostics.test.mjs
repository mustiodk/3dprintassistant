import assert from "node:assert/strict";
import test from "node:test";

Object.defineProperty(globalThis, "location", { configurable: true, value: { hostname: "localhost" } });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { language: "en-US", onLine: true, userAgent: "Test" } });
Object.defineProperty(globalThis, "localStorage", { configurable: true, writable: true, value: { getItem() { return null; }, setItem() {} } });
globalThis.__3DPA_RELEASE__ = { appVersion: "web-test", releaseId: "release-test", catalogRevision: "catalog-test" };
await import("../feedback-diagnostics.js");

test("keeps only the newest 25 allowlisted breadcrumbs", () => {
  const recorder = globalThis.FeedbackDiagnostics.createRecorder({ now: (() => { let n = 0; return () => ++n; })() });
  for (let index = 0; index < 26; index += 1) recorder.record("screen_opened", { feature: "configure", printer: `printer_${index}` });
  recorder.record("unknown_event", { feature: "bad" });
  recorder.record("screen_opened", { freeText: "bad" });
  const snapshot = recorder.snapshot("manual", "feedback.card");
  assert.equal(snapshot.breadcrumbs.length, 25);
  assert.equal(snapshot.breadcrumbs[0].props.printer, "printer_2");
  assert.equal(snapshot.breadcrumbs.at(-1).props.freeText, undefined);
  recorder.record("screen_opened", { feature: "person@example.com free text" });
  assert.equal(recorder.snapshot("manual", "feedback.card").breadcrumbs.at(-1).props.feature, undefined);
});

test("freezes the failure snapshot against later navigation", () => {
  let screen = "output";
  const recorder = globalThis.FeedbackDiagnostics.createRecorder({ now: () => 100 });
  recorder.setSnapshotProvider(() => ({ configuration: { activeView: screen } }));
  recorder.freezeFailure({ code: "E1", subsystem: "export", operation: "bundle", safeMessage: "Export failed" }, "export_failed", "output.export_error");
  screen = "home";
  assert.equal(recorder.snapshot("manual", "feedback.card", true).configuration.activeView, "output");
});

test("local printer preference failures degrade to unknown", () => {
  const old = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.deepEqual(globalThis.FeedbackDiagnostics.physicalPrinterPreference(), { kind: "unknown", match: "unknown" });
  assert.equal(globalThis.FeedbackDiagnostics.savePhysicalPrinterPreference({ kind: "supported", printerId: "p1s" }), false);
  globalThis.localStorage = old;
});

test("custom printer text stays in userContent", () => {
  const submission = globalThis.FeedbackDiagnostics.buildSubmission("bugReport", { whatHappened: "Failed", customPrinterBrand: "Acme", customPrinterModel: "One" }, { physicalPrinter: { kind: "custom", match: "custom_not_in_catalog" } });
  assert.equal(submission.userContent.customPrinterBrand, "Acme");
  assert.equal(submission.diagnostics.physicalPrinter.customPrinterBrand, undefined);
  assert.equal(submission.diagnostics.application.releaseChannel, "local");
});

test("a different physical printer is not classified as supported", () => {
  const old = globalThis.localStorage;
  globalThis.localStorage = { getItem() { return JSON.stringify({ kind: "different" }); }, setItem() {} };
  const preference = globalThis.FeedbackDiagnostics.physicalPrinterPreference();
  assert.equal(preference.match, "different");
  assert.notEqual(preference.kind, "supported");
  assert.equal("printerId" in preference, false);
  globalThis.localStorage = old;
});

test("snapshots real catalog provenance instead of leaving it blank", () => {
  const recorder = globalThis.FeedbackDiagnostics.createRecorder({ now: () => 1 });
  recorder.setSnapshotProvider(() => ({ catalog: { selectedPrinterResolved: true } }));
  const { catalog } = recorder.snapshot("manual", "feedback.card");
  assert.equal(catalog.selectedPrinterResolved, true);
  assert.equal(catalog.overlaySource, "bundled");
  assert.equal(catalog.baselineRevision, "catalog-test");
});

// The client is the only producer of breadcrumbs, so its output must be accepted by
// the server validator for every allowlisted event — including at the value bounds.
// This is the boundary test the 120-vs-80 screen-length finding was missing.
test("client breadcrumbs always satisfy the server contract", async () => {
  const { normalizeFeedbackPayload, BREADCRUMB_EVENTS } = await import("../functions/api/_lib/feedback-contract.js");
  // Fractional clock: ageMs must still reach the server as an integer.
  let tick = 0.5;
  const recorder = globalThis.FeedbackDiagnostics.createRecorder({ now: () => (tick += 1.25) });
  recorder.setSnapshotProvider(() => ({}));

  for (const name of BREADCRUMB_EVENTS) {
    recorder.record(name, {
      feature: "output", operation: "orca_bundle", outputMode: "text", status: "failed",
      printer: "bambu_p1s", material: "pla_basic", nozzle: "std_0.4", slicer: "orca",
    });
  }
  // Over-long and out-of-vocabulary values must be dropped, never truncated into the payload.
  recorder.record("screen_opened", { feature: "z".repeat(200), printer: "p".repeat(200) });

  const snapshot = recorder.snapshot("manual", "feedback.modal");
  for (const crumb of snapshot.breadcrumbs) {
    assert.ok(Number.isInteger(crumb.ageMs), `ageMs must be an integer, got ${crumb.ageMs}`);
    // RED demo verified 2026-08-01: restoring the pre-1dab6d0 `.slice(0, 120)` prop
    // truncation fails this line with "screen exceeds the server bound: 120".
    assert.ok(crumb.screen.length <= 80, `screen exceeds the server bound: ${crumb.screen.length}`);
  }

  const body = globalThis.FeedbackDiagnostics.buildSubmission("bugReport", { whatHappened: "Export failed" }, snapshot);
  const result = normalizeFeedbackPayload(body, "web");
  assert.equal(result.error, undefined);
  assert.equal(result.ok, true);
});

test("capture metadata is constrained to the closed vocabulary on the client", async () => {
  const { normalizeFeedbackPayload, FEEDBACK_CAPTURE_REASONS, FEEDBACK_ENTRY_POINTS } =
    await import("../functions/api/_lib/feedback-contract.js");
  const recorder = globalThis.FeedbackDiagnostics.createRecorder({ now: () => 1 });
  recorder.setSnapshotProvider(() => ({}));

  const accepts = (snapshot) => normalizeFeedbackPayload(
    globalThis.FeedbackDiagnostics.buildSubmission("bugReport", { whatHappened: "x" }, snapshot), "web");

  // Defaults must themselves be in vocabulary — "feedback" never was.
  const fallback = recorder.snapshot();
  assert.ok(FEEDBACK_CAPTURE_REASONS.includes(fallback.captureReason));
  assert.ok(FEEDBACK_ENTRY_POINTS.includes(fallback.entryPoint));
  assert.equal(accepts(fallback).ok, true);

  // An off-vocabulary call site must degrade to a safe value, not a server 400.
  const bogus = recorder.snapshot("totally_bogus", "also.bogus");
  assert.ok(FEEDBACK_CAPTURE_REASONS.includes(bogus.captureReason));
  assert.ok(FEEDBACK_ENTRY_POINTS.includes(bogus.entryPoint));
  assert.equal(accepts(bogus).ok, true);

  // Valid values pass through untouched.
  const valid = recorder.snapshot("export_failed", "output.export_error");
  assert.equal(valid.captureReason, "export_failed");
  assert.equal(valid.entryPoint, "output.export_error");
  assert.equal(accepts(valid).ok, true);
});
