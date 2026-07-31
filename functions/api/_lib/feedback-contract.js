export const FEEDBACK_CATEGORIES = Object.freeze([
  "generalFeedback", "featureRequest", "missingPrinter", "missingFilament",
  "missingNozzle", "missingSlicer", "bugReport",
]);

export const FEEDBACK_DISPOSITIONS = Object.freeze([
  "new", "needs_info", "actionable", "fixed", "duplicate", "unsupported",
  "not_reproducible", "closed_other",
]);

export const BREADCRUMB_EVENTS = Object.freeze([
  "app_opened", "page_opened", "screen_opened", "printer_selected",
  "material_selected", "nozzle_selected", "profile_generated",
  "output_opened", "export_started", "export_succeeded", "export_failed",
  "copy_started", "copy_succeeded", "copy_failed", "catalog_initialized",
  "catalog_failed", "feedback_opened",
]);

export const FEEDBACK_CAPTURE_REASONS = Object.freeze([
  "manual", "form_opened", "export_failed", "copy_failed", "engine_failed", "catalog_failed",
]);

export const FEEDBACK_ENTRY_POINTS = Object.freeze([
  "feedback.card", "feedback.modal", "output.export_error", "output.copy_error",
  "app.engine_error", "app.catalog_error",
]);

const TOP_KEYS = ["schemaVersion", "category", "userContent", "diagnostics"];
const USER_KEYS = ["whatHappened", "expected", "steps", "message", "title", "email", "customPrinterBrand", "customPrinterModel"];
const DIAGNOSTIC_KEYS = ["capturedAt", "captureReason", "entryPoint", "application", "physicalPrinter", "configuration", "catalog", "runtime", "failure", "breadcrumbs"];
const APPLICATION_KEYS = ["platform", "releaseChannel", "appVersion", "buildNumber", "releaseId", "engineRevision", "osFamily", "osVersion", "browserFamily", "browserVersion", "deviceClass", "locale", "screenClass"];
const PHYSICAL_KEYS = ["kind", "printerId", "match"];
const PHYSICAL_KINDS = new Set(["supported", "custom", "unknown"]);
const PHYSICAL_MATCHES = new Set(["same", "different", "unknown", "custom_not_in_catalog"]);
const CONFIG_KEYS = ["brand", "printer", "nozzle", "material", "useCase", "surface", "strength", "speed", "environment", "support", "colors", "userLevel", "specialOptions", "seam", "brim", "buildPlate", "extruderType", "filamentCondition", "ironing", "profileMode", "outputMode", "slicer", "activeView", "activeTab", "exportType", "nativeExportAvailable", "fallbackReason"];
const CATALOG_KEYS = ["baselineRevision", "overlaySource", "contentVersion", "selectedPrinterResolved"];
const RUNTIME_KEYS = ["engineInitialized", "online", "requestStatusClass", "requestCode", "fallbackUsed"];
const FAILURE_KEYS = ["code", "subsystem", "operation", "safeMessage", "sentryEventId"];
const BREADCRUMB_KEYS = ["name", "ageMs", "screen", "props"];
const PROP_KEYS = ["printer", "material", "nozzle", "operation", "outputMode", "slicer", "status", "feature"];
const BREADCRUMB_FEATURES = new Set(["app", "configure", "troubleshoot", "workshop", "feedback", "output", "catalog", "unknown"]);
const BREADCRUMB_OPERATIONS = new Set(["process", "filament", "prusa_ini", "copy", "bundle", "orca_bundle", "prusa_bundle", "profile", "catalog", "feedback"]);
const BREADCRUMB_OUTPUT_MODES = new Set(["simple", "advanced", "text", "bambu", "orca", "prusa"]);
const BREADCRUMB_STATUSES = new Set(["started", "succeeded", "failed", "available", "unavailable"]);
const STABLE_ID = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const FIELD_LIMITS = { whatHappened: 4000, expected: 2000, steps: 3000, message: 4000, title: 200, email: 254, customPrinterBrand: 100, customPrinterModel: 160 };

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value, allowed) {
  return isRecord(value) && Object.keys(value).every((key) => allowed.includes(key));
}

function fail(error) { return { ok: false, error }; }

function boundedStrings(value, keys, limits = {}, defaultLimit = 160) {
  if (!hasOnlyKeys(value, keys)) return "unknown_key";
  for (const [key, item] of Object.entries(value)) {
    if (item === null || typeof item === "boolean" || typeof item === "number") continue;
    if (Array.isArray(item)) {
      if (item.some((part) => typeof part !== "string" || part.length > defaultLimit)) return "invalid_field";
      continue;
    }
    if (typeof item !== "string") return "invalid_field";
    if (item.length > (limits[key] || defaultLimit)) return "field_too_long";
  }
  return null;
}

function validateBreadcrumbs(items) {
  if (!Array.isArray(items)) return "invalid_breadcrumbs";
  if (items.length > 25) return "too_many_breadcrumbs";
  for (const item of items) {
    if (!hasOnlyKeys(item, BREADCRUMB_KEYS)) return "unknown_key";
    if (!BREADCRUMB_EVENTS.includes(item.name)) return "invalid_breadcrumb_event";
    if (!Number.isInteger(item.ageMs) || item.ageMs < 0) return "invalid_breadcrumb_age";
    if (!BREADCRUMB_FEATURES.has(item.screen)) return "invalid_breadcrumb_screen";
    if (!hasOnlyKeys(item.props || {}, PROP_KEYS)) return "invalid_breadcrumb_property";
    for (const [key, value] of Object.entries(item.props || {})) {
      if (typeof value !== "string") return "invalid_breadcrumb_property";
      if (["printer", "material", "nozzle", "slicer"].includes(key) && !STABLE_ID.test(value)) return "invalid_breadcrumb_property";
      if (key === "feature" && !BREADCRUMB_FEATURES.has(value)) return "invalid_breadcrumb_property";
      if (key === "operation" && !BREADCRUMB_OPERATIONS.has(value)) return "invalid_breadcrumb_property";
      if (key === "outputMode" && !BREADCRUMB_OUTPUT_MODES.has(value)) return "invalid_breadcrumb_property";
      if (key === "status" && !BREADCRUMB_STATUSES.has(value)) return "invalid_breadcrumb_property";
    }
  }
  return null;
}

// A canonical printer id is the only thing that makes "supported" meaningful, so the
// two must travel together. Anything else is an unresolved printer, not a supported one.
function validatePhysicalPrinter(value) {
  if (!isRecord(value) || value.kind === undefined) return null;
  if (!PHYSICAL_KINDS.has(value.kind)) return "invalid_physical_printer";
  if (value.match !== undefined && !PHYSICAL_MATCHES.has(value.match)) return "invalid_physical_printer";
  if (value.kind === "supported") {
    if (typeof value.printerId !== "string" || !STABLE_ID.test(value.printerId)) return "invalid_physical_printer";
  } else if (value.printerId !== undefined) {
    return "invalid_physical_printer";
  }
  return null;
}

function normalizeLegacy(payload, source) {
  if (!hasOnlyKeys(payload, ["category", "fields", "email", "context"])) return fail("unknown_key");
  if (!FEEDBACK_CATEGORIES.includes(payload.category)) return fail("invalid_category");
  if (!Array.isArray(payload.fields) || payload.fields.length === 0 || payload.fields.length > 12) return fail("invalid_fields");
  const canonicalFields = [];
  const userContent = {};
  for (const field of payload.fields) {
    if (!hasOnlyKeys(field, ["id", "label", "value"])) return fail("unknown_key");
    if (typeof field.value !== "string" || field.value.length > 4000) return fail("field_too_long");
    const id = typeof field.id === "string" && field.id ? field.id : "message";
    canonicalFields.push({ id, value: field.value.trim() });
  }
  userContent.fields = canonicalFields;
  if (typeof payload.email === "string" && payload.email.trim()) userContent.email = payload.email.trim().slice(0, 254);
  return { ok: true, report: { schemaVersion: "feedback_legacy_v1", category: payload.category, source, userContent, canonicalFields, diagnostics: {}, breadcrumbs: [], summary: { platform: source, diagnosticCompleteness: "partial" } } };
}

export function normalizeFeedbackPayload(payload, source) {
  if (!isRecord(payload)) return fail("invalid_payload");
  if (payload.schemaVersion !== "feedback_v2") return normalizeLegacy(payload, source);
  if (!hasOnlyKeys(payload, TOP_KEYS)) return fail("unknown_key");
  if (!FEEDBACK_CATEGORIES.includes(payload.category)) return fail("invalid_category");
  const userError = boundedStrings(payload.userContent, USER_KEYS, FIELD_LIMITS, 4000);
  if (userError) return fail(userError);
  if (payload.category === "bugReport" && !payload.userContent.whatHappened?.trim()) return fail("missing_what_happened");
  if (!hasOnlyKeys(payload.diagnostics, DIAGNOSTIC_KEYS)) return fail("unknown_key");
  const { capturedAt, captureReason, entryPoint } = payload.diagnostics;
  if (typeof capturedAt !== "string" || capturedAt.length > 40 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(capturedAt) || !Number.isFinite(Date.parse(capturedAt))) return fail("invalid_captured_at");
  if (!FEEDBACK_CAPTURE_REASONS.includes(captureReason)) return fail("invalid_capture_reason");
  if (!FEEDBACK_ENTRY_POINTS.includes(entryPoint)) return fail("invalid_entry_point");

  const sections = [
    [payload.diagnostics.application, APPLICATION_KEYS],
    [payload.diagnostics.physicalPrinter || {}, PHYSICAL_KEYS],
    [payload.diagnostics.configuration || {}, CONFIG_KEYS],
    [payload.diagnostics.catalog || {}, CATALOG_KEYS],
    [payload.diagnostics.runtime || {}, RUNTIME_KEYS],
    [payload.diagnostics.failure || {}, FAILURE_KEYS],
  ];
  for (const [section, keys] of sections) {
    const error = boundedStrings(section, keys);
    if (error) return fail(error);
  }
  const physicalError = validatePhysicalPrinter(payload.diagnostics.physicalPrinter);
  if (physicalError) return fail(physicalError);
  const application = payload.diagnostics.application;
  if (!application || application.platform !== source) return fail("invalid_platform");
  const channels = source === "web" ? ["production", "preview", "local"] : ["debug", "sandbox_or_testflight", "appstore"];
  if (!channels.includes(application.releaseChannel)) return fail("invalid_release_channel");
  const breadcrumbError = validateBreadcrumbs(payload.diagnostics.breadcrumbs || []);
  if (breadcrumbError) return fail(breadcrumbError);

  const canonicalFields = [];
  for (const key of ["whatHappened", "message", "title"]) {
    if (payload.userContent[key]?.trim()) canonicalFields.push({ id: key, value: payload.userContent[key].trim() });
  }
  if (payload.category === "missingPrinter") {
    if (payload.userContent.customPrinterBrand) canonicalFields.push({ id: "brand", value: payload.userContent.customPrinterBrand.trim() });
    if (payload.userContent.customPrinterModel) canonicalFields.push({ id: "model", value: payload.userContent.customPrinterModel.trim() });
  }
  return {
    ok: true,
    report: {
      schemaVersion: "feedback_v2",
      category: payload.category,
      source,
      userContent: structuredClone(payload.userContent),
      canonicalFields,
      diagnostics: structuredClone({ ...payload.diagnostics, breadcrumbs: undefined }),
      breadcrumbs: structuredClone(payload.diagnostics.breadcrumbs || []),
      summary: {
        platform: application.platform,
        releaseChannel: application.releaseChannel,
        appVersion: application.appVersion || null,
        buildNumber: application.buildNumber || null,
        selectedPrinter: payload.diagnostics.configuration?.printer || null,
        physicalPrinter: payload.diagnostics.physicalPrinter?.printerId || payload.diagnostics.physicalPrinter?.match || null,
        errorCode: payload.diagnostics.failure?.code || null,
        diagnosticCompleteness: "complete",
      },
    },
  };
}
