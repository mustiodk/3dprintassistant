import { FEEDBACK_DISPOSITIONS } from "./_lib/feedback-contract.js";
import { decryptUserContent } from "./_lib/feedback-crypto.js";
import { deleteFeedbackReport, listFeedbackReports, listFingerprintMatches, readFeedbackReport, setFeedbackDisposition } from "./_lib/feedback-store.js";

const ORIGINS = new Set(["https://3dprintassistant.com", "https://www.3dprintassistant.com"]);
const reportPattern = /^RPT-[A-Za-z0-9_-]{4,32}$/;

function allowed(origin) {
  if (ORIGINS.has(origin)) return true;
  try { return new URL(origin).host.endsWith(".3dprintassistant.pages.dev"); } catch { return false; }
}

function headers(origin) {
  return allowed(origin) ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, X-Analytics-Admin-Token", Vary: "Origin" } : {};
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers(origin) } });
}

async function tokenMatches(received, expected) {
  if (typeof received !== "string" || !received || typeof expected !== "string" || !expected) return false;
  const [left, right] = await Promise.all([received, expected].map((value) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
  const a = new Uint8Array(left); const b = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function onRequestOptions({ request }) {
  const origin = request.headers.get("Origin");
  return allowed(origin) ? new Response(null, { status: 204, headers: headers(origin) }) : new Response(null, { status: 403 });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (!allowed(origin)) return json(403, { ok: false, error: "forbidden_origin" }, origin);
  if (!await tokenMatches(request.headers.get("X-Analytics-Admin-Token"), env.ANALYTICS_ADMIN_TOKEN)) return json(401, { ok: false, error: "unauthorized" }, origin);
  if (!env.FEEDBACK_DB || !env.FEEDBACK_DATA_KEY) return json(503, { ok: false, error: "feedback_storage_not_configured" }, origin);
  let payload;
  try { payload = await request.json(); } catch { return json(400, { ok: false, error: "invalid_json" }, origin); }
  if (!payload || typeof payload !== "object" || !["list", "detail", "setDisposition", "delete"].includes(payload.action)) return json(400, { ok: false, error: "invalid_action" }, origin);

  if (payload.action === "list") {
    return json(200, { ok: true, reports: await listFeedbackReports(env.FEEDBACK_DB, payload.limit, payload.offset) }, origin);
  }
  if (!reportPattern.test(payload.reportId || "")) return json(400, { ok: false, error: "invalid_report_id" }, origin);
  if (payload.action === "setDisposition") {
    if (!FEEDBACK_DISPOSITIONS.includes(payload.disposition)) return json(400, { ok: false, error: "invalid_disposition" }, origin);
    return json(200, { ok: true, updated: await setFeedbackDisposition(env.FEEDBACK_DB, payload.reportId, payload.disposition) }, origin);
  }
  if (payload.action === "delete") {
    return json(200, { ok: true, deleted: await deleteFeedbackReport(env.FEEDBACK_DB, payload.reportId) }, origin);
  }
  const row = await readFeedbackReport(env.FEEDBACK_DB, payload.reportId);
  if (!row) return json(404, { ok: false, error: "not_found" }, origin);
  let userContent = null; let userContentError = null;
  try { userContent = await decryptUserContent(row.user_content_ciphertext, row.user_content_iv, env.FEEDBACK_DATA_KEY, row.report_id, row.schema_version); }
  catch { userContentError = "user_content_unavailable"; }
  const matches = await listFingerprintMatches(env.FEEDBACK_DB, row.issue_fingerprint, row.report_id);
  const { user_content_ciphertext: _ciphertext, user_content_iv: _iv, ...safeRow } = row;
  return json(200, { ok: true, report: { ...safeRow, userContent, userContentError, diagnostics: JSON.parse(row.diagnostics_json), breadcrumbs: JSON.parse(row.breadcrumbs_json) }, matches }, origin);
}

export async function onRequest({ request }) {
  return json(405, { ok: false, error: "method_not_allowed" }, request.headers.get("Origin"));
}
