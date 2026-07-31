import assert from "node:assert/strict";
import test from "node:test";

import { normalizeFeedbackPayload } from "./feedback-contract.js";

const v2 = {
  schemaVersion: "feedback_v2",
  category: "bugReport",
  userContent: {
    whatHappened: "Export failed",
    expected: "A bundle",
    steps: "Tap export",
    email: "person@example.com",
  },
  diagnostics: {
    capturedAt: "2026-07-31T12:34:56Z",
    captureReason: "export_failed",
    entryPoint: "output.export_error",
    application: { platform: "web", releaseChannel: "production", appVersion: "web-abc", releaseId: "abc" },
    physicalPrinter: { kind: "supported", printerId: "bambu_p1s", match: "same" },
    configuration: { printer: "bambu_p1s", slicer: "orca", outputMode: "export" },
    catalog: { selectedPrinterResolved: true },
    runtime: { online: true, engineInitialized: true },
    failure: { code: "export_failed", subsystem: "export", operation: "orca_bundle", safeMessage: "Export failed" },
    breadcrumbs: [{ name: "export_failed", ageMs: 0, screen: "output", props: { operation: "orca_bundle" } }],
  },
};

test("normalizes a complete v2 report and canonical printer fields", () => {
  const result = normalizeFeedbackPayload(v2, "web");
  assert.equal(result.ok, true);
  assert.equal(result.report.summary.platform, "web");
  assert.deepEqual(result.report.canonicalFields, [{ id: "whatHappened", value: "Export failed" }]);
  assert.equal(result.report.breadcrumbs.length, 1);
});

test("rejects unknown keys and invalid platform/channel pairs", () => {
  assert.equal(normalizeFeedbackPayload({ ...v2, surprise: true }, "web").error, "unknown_key");
  const bad = structuredClone(v2);
  bad.diagnostics.application.releaseChannel = "appstore";
  assert.equal(normalizeFeedbackPayload(bad, "web").error, "invalid_release_channel");
});

test("rejects oversized and unallowlisted breadcrumb data", () => {
  const tooMany = structuredClone(v2);
  tooMany.diagnostics.breadcrumbs = Array.from({ length: 26 }, () => v2.diagnostics.breadcrumbs[0]);
  assert.equal(normalizeFeedbackPayload(tooMany, "web").error, "too_many_breadcrumbs");
  const unknownProp = structuredClone(v2);
  unknownProp.diagnostics.breadcrumbs[0].props.freeText = "no";
  assert.equal(normalizeFeedbackPayload(unknownProp, "web").error, "invalid_breadcrumb_property");
  const longText = structuredClone(v2);
  longText.userContent.whatHappened = "x".repeat(4001);
  assert.equal(normalizeFeedbackPayload(longText, "web").error, "field_too_long");
});

test("keeps custom printer text encrypted in userContent", () => {
  const custom = structuredClone(v2);
  custom.userContent.customPrinterBrand = "Acme";
  custom.userContent.customPrinterModel = "One";
  custom.diagnostics.physicalPrinter = { kind: "custom", match: "custom_not_in_catalog" };
  assert.equal(normalizeFeedbackPayload(custom, "web").ok, true);
  custom.diagnostics.physicalPrinter.customPrinterBrand = "Acme";
  assert.equal(normalizeFeedbackPayload(custom, "web").error, "unknown_key");
});

test("normalizes legacy web and iOS payloads without inventing diagnostics", () => {
  for (const source of ["web", "ios"]) {
    const result = normalizeFeedbackPayload({
      category: "missingPrinter",
      fields: [{ id: "brand", label: "Brand", value: "Creality" }, { id: "model", label: "Model", value: "K2" }],
      email: null,
      context: { appSource: source },
    }, source);
    assert.equal(result.ok, true);
    assert.equal(result.report.schemaVersion, "feedback_legacy_v1");
    assert.deepEqual(result.report.canonicalFields, [{ id: "brand", value: "Creality" }, { id: "model", value: "K2" }]);
    assert.deepEqual(result.report.diagnostics, {});
  }
});
