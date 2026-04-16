// Cloudflare Pages Function — POST /api/feedback
//
// Receives feedback form submissions from the browser, validates them,
// and forwards a Discord embed to the webhook stored in env.DISCORD_WEBHOOK_URL.
// The webhook URL never reaches the client bundle.
//
// Payload shape (client → function):
// {
//   category: "generalFeedback" | "featureRequest" | "missingPrinter" |
//             "missingFilament" | "missingNozzle" | "missingSlicer" | "bugReport",
//   fields:   [ { label: string, value: string }, ... ],
//   email:    string | null,
//   context:  { appVersion, browser, browserVersion, os, locale, screen, honeypot },
// }
//
// Returns { ok: true } on success, { ok: false, error: "..." } on failure.

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
const MAX_REQUEST_BYTES = 8 * 1024;

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
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
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
  const cors = corsHeaders(origin);

  // Reject cross-origin POSTs early
  if (!isAllowedOrigin(origin)) {
    return jsonResponse(403, { ok: false, error: "forbidden_origin" });
  }

  // Body size guard
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonResponse(413, { ok: false, error: "payload_too_large" }, cors);
  }

  // Parse JSON
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: "invalid_json" }, cors);
  }

  // Honeypot check — bots that fill every field will fail here. Return 200
  // so the bot thinks it succeeded; we just don't forward.
  if (payload?.context?.honeypot) {
    return jsonResponse(200, { ok: true }, cors);
  }

  // Validate category
  const meta = CATEGORY_META[payload?.category];
  if (!meta) {
    return jsonResponse(400, { ok: false, error: "invalid_category" }, cors);
  }

  // Validate fields array
  const rawFields = Array.isArray(payload.fields) ? payload.fields : [];
  if (rawFields.length === 0) {
    return jsonResponse(400, { ok: false, error: "no_fields" }, cors);
  }

  // Build embed fields — strip empties, cap value length, rebuild server-side
  // (never forward a client-constructed embed directly)
  const embedFields = [];
  let totalChars = 0;
  for (const f of rawFields) {
    const label = typeof f?.label === "string" ? f.label.trim() : "";
    const value = typeof f?.value === "string" ? f.value.trim() : "";
    if (!label || !value) continue;
    const cappedLabel = label.slice(0, 256);
    const cappedValue = value.slice(0, MAX_FIELD_VALUE);
    totalChars += cappedLabel.length + cappedValue.length;
    if (totalChars > MAX_TOTAL_BYTES) break;
    embedFields.push({ name: cappedLabel, value: cappedValue, inline: false });
  }
  if (embedFields.length === 0) {
    return jsonResponse(400, { ok: false, error: "no_field_values" }, cors);
  }

  // Optional reply-to email
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  if (email) {
    embedFields.push({ name: "Reply-to email", value: email.slice(0, 254), inline: true });
  }

  // Footer — device/browser context
  const ctx = payload.context || {};
  const footerParts = [
    `3DPA Web ${sanitize(ctx.appVersion, 16) || "?"}`,
    `${sanitize(ctx.browser, 32) || "?"} ${sanitize(ctx.browserVersion, 16) || ""}`.trim(),
    sanitize(ctx.os, 48),
    sanitize(ctx.locale, 16),
    sanitize(ctx.screen, 24),
  ].filter(Boolean);

  const embed = {
    title: `${meta.emoji} ${meta.displayName}`,
    color: meta.color,
    fields: embedFields,
    footer: { text: footerParts.join(" \u2022 ").slice(0, 2048) },
    timestamp: new Date().toISOString(),
  };

  // Check webhook configured
  const webhook = env.DISCORD_WEBHOOK_URL;
  if (!webhook || typeof webhook !== "string" || !/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(webhook)) {
    return jsonResponse(500, { ok: false, error: "webhook_not_configured" }, cors);
  }

  // Forward to Discord
  let discordRes;
  try {
    discordRes = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (err) {
    return jsonResponse(502, { ok: false, error: "discord_unreachable" }, cors);
  }

  if (!discordRes.ok) {
    return jsonResponse(502, { ok: false, error: `discord_${discordRes.status}` }, cors);
  }

  return jsonResponse(200, { ok: true }, cors);
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
