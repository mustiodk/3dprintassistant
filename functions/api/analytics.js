// Cloudflare Worker route — POST /api/analytics
//
// Receives aggregate, first-party product-usage events from the web app and
// iOS app, validates an allowlisted schema, and writes one data point to
// Workers Analytics Engine. No user id, session id, IP, user-agent, email,
// free-text feedback, or generated profile output is accepted.

const ALLOWED_ORIGINS = new Set([
  "https://3dprintassistant.com",
  "https://www.3dprintassistant.com",
]);

const ALLOWED_ORIGIN_SUFFIXES = [
  ".3dprintassistant.pages.dev",
];

const MAX_REQUEST_BYTES = 4 * 1024;
const HMAC_MAX_SKEW_SECONDS = 5 * 60;
const SCHEMA_VERSION = "analytics_v1";

const COMMON_KEYS = new Set([
  "platform",
  "channel",
  "appVersion",
  "buildNumber",
  "locale",
]);

const EVENT_KEYS = {
  app_opened: new Set([
    ...COMMON_KEYS,
  ]),
  profile_generated: new Set([
    ...COMMON_KEYS,
    "printerBrand",
    "printerModel",
    "printerSeries",
    "material",
    "materialGroup",
    "nozzle",
    "environment",
    "support",
    "colors",
    "profileMode",
    "outputMode",
    "slicer",
  ]),
  feedback_opened: new Set([
    ...COMMON_KEYS,
    "feedbackCategory",
  ]),
  // v1.1 — features shipped after the dashboard (slicer export, Workshop,
  // troubleshooter). Their one event-specific dimension lands in the shared
  // `detail` blob (blob19); see docs/specs/analytics-v1.md.
  export_clicked: new Set([
    ...COMMON_KEYS,
    "exportType",
    "printerModel",
    "material",
    "nozzle",
  ]),
  workshop_saved: new Set([
    ...COMMON_KEYS,
  ]),
  workshop_loaded: new Set([
    ...COMMON_KEYS,
  ]),
  workshop_exported: new Set([
    ...COMMON_KEYS,
    "exportScope",
  ]),
  workshop_imported: new Set([
    ...COMMON_KEYS,
  ]),
  troubleshoot_used: new Set([
    ...COMMON_KEYS,
    "symptom",
  ]),
};

const BLOB_FIELDS = [
  "schemaVersion",
  "event",
  "platform",
  "channel",
  "appVersion",
  "buildNumber",
  "locale",
  "printerBrand",
  "printerModel",
  "printerSeries",
  "material",
  "materialGroup",
  "nozzle",
  "environment",
  "support",
  "colors",
  "profileMode",
  "slicer",
  "detail",
  "outputMode",
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const host = new URL(origin).host;
    return ALLOWED_ORIGIN_SUFFIXES.some(s => host.endsWith(s));
  } catch {
    return false;
  }
}

function jsonResponse(status, body, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(extraHeaders || {}),
    },
  });
}

function corsHeaders(origin) {
  if (!isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-App-Source, X-Timestamp, X-Signature",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

async function verifyIOSSignature(request, rawBody, secret) {
  const timestamp = request.headers.get("X-Timestamp");
  const signature = request.headers.get("X-Signature");

  if (!timestamp || !signature) {
    return { ok: false, error: "missing_signature" };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, error: "invalid_timestamp" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > HMAC_MAX_SKEW_SECONDS) {
    return { ok: false, error: "timestamp_skew" };
  }

  const payload = `${timestamp}\n${rawBody}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  let sigBytes;
  try {
    const binary = atob(signature);
    sigBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) sigBytes[i] = binary.charCodeAt(i);
  } catch {
    return { ok: false, error: "invalid_signature_encoding" };
  }

  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payload));
  return valid ? { ok: true } : { ok: false, error: "signature_mismatch" };
}

function sanitizeProp(value, maxLen = 80) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim()
    .slice(0, maxLen);
}

function validatePayload(payload) {
  const event = sanitizeProp(payload?.event, 48);
  const allowedKeys = EVENT_KEYS[event];
  if (!allowedKeys) {
    return { ok: false, error: "invalid_event" };
  }

  if (!payload || typeof payload.properties !== "object" || Array.isArray(payload.properties)) {
    return { ok: false, error: "invalid_properties" };
  }

  const props = {};
  for (const [key, rawValue] of Object.entries(payload.properties)) {
    if (!allowedKeys.has(key)) {
      return { ok: false, error: `invalid_property_${key}` };
    }
    const value = sanitizeProp(rawValue);
    if (value) props[key] = value;
  }

  if (!props.platform) {
    return { ok: false, error: "missing_platform" };
  }

  return { ok: true, event, props };
}

function toDataPoint(event, props) {
  const row = {
    schemaVersion: SCHEMA_VERSION,
    event,
    platform: props.platform || "",
    channel: props.channel || "",
    appVersion: props.appVersion || "",
    buildNumber: props.buildNumber || "",
    locale: props.locale || "",
    printerBrand: props.printerBrand || "",
    printerModel: props.printerModel || "",
    printerSeries: props.printerSeries || "",
    material: props.material || "",
    materialGroup: props.materialGroup || "",
    nozzle: props.nozzle || "",
    environment: props.environment || "",
    support: props.support || "",
    colors: props.colors || "",
    profileMode: props.profileMode || "",
    slicer: props.slicer || "",
    // blob19 is the per-event detail dimension: feedback category, export
    // type/scope, or troubleshooter symptom — never more than one per event.
    detail: props.feedbackCategory || props.exportType || props.exportScope || props.symptom || "",
    outputMode: props.outputMode || "",
  };

  return {
    blobs: BLOB_FIELDS.map(field => row[field]),
    doubles: [1],
    indexes: [`${event}:${props.platform || "unknown"}`],
  };
}

export async function onRequestOptions({ request }) {
  const origin = request.headers.get("Origin");
  if (!isAllowedOrigin(origin)) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  const appSource = (request.headers.get("X-App-Source") || "").toLowerCase();
  const isIOS = appSource === "ios";
  const cors = isIOS ? {} : corsHeaders(origin);

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonResponse(413, { ok: false, error: "payload_too_large" }, cors);
  }

  const rawBody = await request.text();

  if (isIOS) {
    const secret = env.FEEDBACK_HMAC_SECRET;
    if (!secret || typeof secret !== "string") {
      return jsonResponse(500, { ok: false, error: "hmac_not_configured" });
    }
    const verdict = await verifyIOSSignature(request, rawBody, secret);
    if (!verdict.ok) {
      return jsonResponse(401, { ok: false, error: verdict.error });
    }
  } else if (!isAllowedOrigin(origin)) {
    return jsonResponse(403, { ok: false, error: "forbidden_origin" }, cors);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { ok: false, error: "invalid_json" }, cors);
  }

  const validated = validatePayload(payload);
  if (!validated.ok) {
    return jsonResponse(400, { ok: false, error: validated.error }, cors);
  }

  const dataPoint = toDataPoint(validated.event, validated.props);
  if (!env.ANALYTICS || typeof env.ANALYTICS.writeDataPoint !== "function") {
    return jsonResponse(202, { ok: true, stored: false, error: "analytics_not_configured" }, cors);
  }

  env.ANALYTICS.writeDataPoint(dataPoint);
  return jsonResponse(200, { ok: true, stored: true }, cors);
}

export async function onRequest({ request }) {
  const origin = request.headers.get("Origin");
  return jsonResponse(405, { ok: false, error: "method_not_allowed" }, corsHeaders(origin));
}

export const __test = {
  validatePayload,
  toDataPoint,
  corsHeaders,
};
