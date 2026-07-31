import assert from "node:assert/strict";
import test from "node:test";

Object.defineProperty(globalThis, "location", { configurable: true, value: { hostname: "localhost" } });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { language: "en-US", onLine: true, userAgent: "Test" } });
Object.defineProperty(globalThis, "localStorage", { configurable: true, writable: true, value: { getItem() { return null; }, setItem() {} } });
globalThis.__3DPA_RELEASE__ = { appVersion: "web-test", releaseId: "release-test" };
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
