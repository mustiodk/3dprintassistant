// POST /api/feedback — Cloudflare Workers + Assets handler (worker.js wires this
// `onRequest*` export; the deploy is Workers, not Pages, despite the Pages-style signature)
//
// Receives feedback form submissions from the web browser OR the iOS app,
// validates + sanitises them, and forwards a Discord embed to the webhook
// stored in env.DISCORD_WEBHOOK_URL. The webhook URL never reaches the client.
//
// Authentication:
//   - Web: Origin header must be in the allow-list (browser enforces).
//   - iOS: `X-App-Source: ios` header + HMAC-SHA256 signature over the raw
//          request body (see verifyIOSSignature below). Shared secret lives
//          in env.FEEDBACK_HMAC_SECRET. [CRITICAL-001]
//
// Sanitisation [HIGH-010 part A]:
//   Every user-supplied field value is routed through stripDiscordMentions()
//   which neutralises @everyone / @here / role+user mentions / markdown link
//   syntax before the embed is forwarded. Prevents relayed pings and phishing
//   links in the Discord channel.
//
// Payload shape (client → function):
// {
//   category: "generalFeedback" | ... (see CATEGORY_META),
//   fields:   [ { label: string, value: string }, ... ],
//   email:    string | null,
//   context:  { appSource: "web" | "ios",
//               // web:
//               appVersion, browser, browserVersion, os, locale, screen, honeypot
//               // ios:
//               appVersion, buildNumber, systemName, systemVersion, deviceModel, locale
//             },
// }
//
// Returns { ok: true } on success, { ok: false, error: "..." } on failure.

import { extractPrinterMention } from "./_lib/printer-mention.js";
import { normalizeFeedbackPayload } from "./_lib/feedback-contract.js";
import { createReportId, encryptUserContent, fingerprintReport } from "./_lib/feedback-crypto.js";
import { persistFeedbackReport } from "./_lib/feedback-store.js";

const ALLOWED_ORIGINS = new Set([
  "https://3dprintassistant.com",
  "https://www.3dprintassistant.com",
  // Cloudflare Pages preview deploys land on *.pages.dev — allow same-project preview
  // via suffix check below in isAllowedOrigin().
]);

const ALLOWED_ORIGIN_SUFFIXES = [
  ".3dprintassistant.pages.dev",
];

// Category → { displayName, emoji, color } — must match iOS FeedbackCategory.swift.
const CATEGORY_META = {
  generalFeedback: { displayName: "General feedback", emoji: "\u{1F4AC}",           color: 9807270 },
  featureRequest:  { displayName: "Feature request",  emoji: "\u{1F4A1}",           color: 3447003 },
  missingPrinter:  { displayName: "Missing printer",  emoji: "\u{1F5A8}\u{FE0F}",   color: 5763719 },
  missingFilament: { displayName: "Missing filament", emoji: "\u{1F9F5}",           color: 5763719 },
  missingNozzle:   { displayName: "Missing nozzle",   emoji: "\u{1F529}",           color: 5763719 },
  missingSlicer:   { displayName: "Missing slicer",   emoji: "\u{2699}\u{FE0F}",    color: 5763719 },
  bugReport:       { displayName: "Bug report",       emoji: "\u{1F41B}",           color: 15548997 },
};

const MAX_FIELD_VALUE = 1000;     // Discord embed field value limit
const MAX_TOTAL_BYTES = 6000;     // safety margin under Discord's 6000-char embed total
const MAX_REQUEST_BYTES = 32 * 1024;

// HMAC replay-protection window — reject signatures more than this many seconds
// away from server time. Keeps the window tight enough that a stolen signature
// becomes stale quickly.
const HMAC_MAX_SKEW_SECONDS = 5 * 60;

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

// [HIGH-010 part A] Neutralise Discord formatting that could be used for
// spam / phishing in the relayed embed. Applied to every user-supplied
// field value before it reaches the embed fields list. Zero-width space
// breaks up @-mentions so they render as plain text. Markdown-link syntax
// is stripped in favour of showing the raw URL (so phishing anchor text
// can't hide the destination).
function stripDiscordMentions(value) {
  if (typeof value !== "string") return "";
  return value
    // @everyone / @here — split the @ from the keyword so Discord renders literal
    .replace(/@(everyone|here)/gi, "@\u200B$1")
    // Role + user + channel mentions: <@123>, <@!123>, <@&123>, <#123>
    .replace(/<(@[!&]?|#)(\d+)>/g, "<$1\u200B$2>")
    // Markdown links [visible](hidden) → "visible (hidden)" — hidden destination
    // becomes visible, no clickable anchor
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
}

// Verify HMAC-SHA256 signature for iOS requests.
//   Signed payload: `${timestamp}\n${rawBody}`
//   Signature:      base64(HMAC-SHA256(secret, payload))
//   Client sends:   X-Timestamp: <unix seconds>
//                   X-Signature: <base64 signature>
// Returns { ok: true } on success, { ok: false, error } on failure.
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
    // atob returns a binary string; convert to Uint8Array
    const binary = atob(signature);
    sigBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) sigBytes[i] = binary.charCodeAt(i);
  } catch {
    return { ok: false, error: "invalid_signature_encoding" };
  }

  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payload));
  if (!valid) return { ok: false, error: "signature_mismatch" };

  return { ok: true };
}

export async function onRequestOptions({ request }) {
  const origin = request.headers.get("Origin");
  // iOS doesn't preflight (no CORS for native requests). Web does; enforce here.
  if (!isAllowedOrigin(origin)) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  const appSource = (request.headers.get("X-App-Source") || "").toLowerCase();
  const isIOS = appSource === "ios";
  const source = isIOS ? "ios" : "web";
  const cors = isIOS ? {} : corsHeaders(origin);

  if (!env.FEEDBACK_RATE_LIMITER || !env.FEEDBACK_DB || !env.FEEDBACK_DATA_KEY) {
    return jsonResponse(503, { ok: false, error: "feedback_storage_not_configured" }, cors);
  }
  const rateLimit = await env.FEEDBACK_RATE_LIMITER.limit({
    key: request.headers.get("CF-Connecting-IP") || "unknown",
  });
  if (!rateLimit?.success) {
    return jsonResponse(429, { ok: false, error: "rate_limited" }, cors);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonResponse(413, { ok: false, error: "payload_too_large" }, cors);
  }
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    return jsonResponse(413, { ok: false, error: "payload_too_large" }, cors);
  }

  if (isIOS) {
    const secret = env.FEEDBACK_HMAC_SECRET;
    if (!secret || typeof secret !== "string") {
      return jsonResponse(500, { ok: false, error: "hmac_not_configured" });
    }
    const verdict = await verifyIOSSignature(request, rawBody, secret);
    if (!verdict.ok) {
      return jsonResponse(401, { ok: false, error: verdict.error });
    }
  } else {
    if (!isAllowedOrigin(origin)) {
      return jsonResponse(403, { ok: false, error: "forbidden_origin" });
    }
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { ok: false, error: "invalid_json" }, cors);
  }

  if (payload?.context?.honeypot) {
    return jsonResponse(200, { ok: true }, cors);
  }
  const normalized = normalizeFeedbackPayload(payload, source);
  if (!normalized.ok) return jsonResponse(400, { ok: false, error: normalized.error }, cors);
  const report = normalized.report;

  if (env.PRINTER_INTAKE) {
    try {
      const HEURISTIC_CATEGORIES = new Set(["generalFeedback", "featureRequest", "bugReport"]);
      let tee = null;
      if (report.category === "missingPrinter") {
        tee = { fields: report.canonicalFields, lane: "form", ttl: 60 * 60 * 24 * 90 };
      } else if (HEURISTIC_CATEGORIES.has(report.category)) {
        const mention = extractPrinterMention(report.canonicalFields);
        if (mention) {
          tee = {
            fields: [
              ...(mention.brand ? [{ id: "brand", value: mention.brand }] : []),
              ...(mention.model ? [{ id: "model", value: mention.model }] : []),
              { id: "notes", value: mention.span },          // bounded matched span ONLY — never the full message
            ],
            lane: "heuristic",
            originalCategory: report.category,
            intent: mention.intent || null,
            ttl: 60 * 60 * 24 * 30,
          };
        }
      }
      if (tee) {
        const id = `req:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`;
        const record = {
          fields: tee.fields,
          email: typeof report.userContent.email === "string" ? report.userContent.email : null,
          context: {},
          appSource: source,
          receivedAt: new Date().toISOString(),
          lane: tee.lane,
        };
        if (tee.originalCategory) record.originalCategory = tee.originalCategory;
        if (tee.intent) record.intent = tee.intent;
        await env.PRINTER_INTAKE.put(id, JSON.stringify(record), { expirationTtl: tee.ttl });
      }
    } catch (_) {
      // Printer intake remains best-effort; D1 feedback storage is authoritative.
    }
  }

  const receivedAt = new Date().toISOString();
  const issueFingerprint = await fingerprintReport(report);
  let reportId;
  try {
    reportId = await persistFeedbackReport(env.FEEDBACK_DB, async (candidateId) => {
      const encrypted = await encryptUserContent(report.userContent, env.FEEDBACK_DATA_KEY, candidateId, report.schemaVersion);
      return {
        reportId: candidateId, schemaVersion: report.schemaVersion, category: report.category, source,
        receivedAt, capturedAt: report.diagnostics.capturedAt || null,
        appVersion: report.summary.appVersion, buildNumber: report.summary.buildNumber,
        releaseChannel: report.summary.releaseChannel || null,
        physicalPrinter: report.summary.physicalPrinter, selectedPrinter: report.summary.selectedPrinter,
        errorCode: report.summary.errorCode,
        diagnosticCompleteness: report.summary.diagnosticCompleteness,
        userContentCiphertext: encrypted.ciphertext,
        userContentIv: encrypted.iv, diagnosticsJson: JSON.stringify(report.diagnostics),
        breadcrumbsJson: JSON.stringify(report.breadcrumbs), issueFingerprint,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }, createReportId);
  } catch (error) {
    const code = error?.message === "report_id_unavailable" ? "report_id_unavailable" : "feedback_storage_failed";
    return jsonResponse(503, { ok: false, error: code }, cors);
  }

  let notified = false;
  const webhook = env.DISCORD_WEBHOOK_URL;
  if (typeof webhook === "string" && /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(webhook)) {
    const meta = CATEGORY_META[report.category];
    const fields = [
      ["Report", reportId], ["Source", `${source} ${report.summary.appVersion || "?"}`],
      ["Channel", report.summary.releaseChannel || "unknown"],
      ["Printer", `${report.summary.physicalPrinter || "unknown"} / ${report.summary.selectedPrinter || "unknown"}`],
      ["Failure", `${report.diagnostics.failure?.operation || "none"} / ${report.summary.errorCode || "none"}`],
      ["Fingerprint", issueFingerprint],
    ].map(([name, value]) => ({ name, value, inline: false }));
    try {
      const response = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ embeds: [{ title: `${meta.emoji} ${meta.displayName}`, color: meta.color, fields, timestamp: receivedAt }] }) });
      notified = response.ok;
    } catch {
      notified = false;
    }
  }
  return jsonResponse(200, { ok: true, reportId, notified }, cors);
}

// Reject other methods
export async function onRequest({ request }) {
  const origin = request.headers.get("Origin");
  return jsonResponse(405, { ok: false, error: "method_not_allowed" }, corsHeaders(origin));
}

function sanitize(value, maxLen) {
  if (typeof value !== "string") return "";
  // Strip control chars + cap length; Discord footer shouldn't have newlines
  return value.replace(/[\x00-\x1F\x7F]/g, "").slice(0, maxLen).trim();
}
