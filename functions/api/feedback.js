// Cloudflare Pages Function — POST /api/feedback
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
  const cors = isIOS ? {} : corsHeaders(origin);

  // Body size guard (applies to both paths)
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonResponse(413, { ok: false, error: "payload_too_large" }, cors);
  }

  // Read raw body once — iOS HMAC verification needs the exact bytes, and we
  // still JSON-parse from the same string afterwards.
  const rawBody = await request.text();

  // [CRITICAL-001] Authentication branch
  if (isIOS) {
    const secret = env.FEEDBACK_HMAC_SECRET;
    if (!secret || typeof secret !== "string") {
      // Secret not yet configured — reject iOS submissions so an accidental
      // deploy without secret can't fail open.
      return jsonResponse(500, { ok: false, error: "hmac_not_configured" });
    }
    const verdict = await verifyIOSSignature(request, rawBody, secret);
    if (!verdict.ok) {
      return jsonResponse(401, { ok: false, error: verdict.error });
    }
  } else {
    // Web path — existing origin check.
    if (!isAllowedOrigin(origin)) {
      return jsonResponse(403, { ok: false, error: "forbidden_origin" });
    }
  }

  // Parse JSON from the raw body (already read)
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { ok: false, error: "invalid_json" }, cors);
  }

  // Honeypot check (web-only; iOS doesn't send one) — bots that fill every
  // field will fail here. Return 200 so the bot thinks it succeeded.
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

  // Build embed fields — strip empties, cap value length, sanitise mentions,
  // rebuild server-side (never forward a client-constructed embed directly)
  const embedFields = [];
  let totalChars = 0;
  for (const f of rawFields) {
    const label = typeof f?.label === "string" ? f.label.trim() : "";
    const rawValue = typeof f?.value === "string" ? f.value.trim() : "";
    if (!label || !rawValue) continue;
    const cappedLabel = stripDiscordMentions(label).slice(0, 256);
    const cappedValue = stripDiscordMentions(rawValue).slice(0, MAX_FIELD_VALUE);
    totalChars += cappedLabel.length + cappedValue.length;
    if (totalChars > MAX_TOTAL_BYTES) break;
    embedFields.push({ name: cappedLabel, value: cappedValue, inline: false });
  }
  if (embedFields.length === 0) {
    return jsonResponse(400, { ok: false, error: "no_field_values" }, cors);
  }

  // Optional reply-to email (sanitised same as other values)
  const email = typeof payload.email === "string"
    ? stripDiscordMentions(payload.email.trim())
    : "";
  if (email) {
    embedFields.push({ name: "Reply-to email", value: email.slice(0, 254), inline: true });
  }

  // Footer — device/browser context. Shape differs between web + iOS.
  const ctx = payload.context || {};
  let footerParts;
  if (isIOS) {
    footerParts = [
      `3DPA iOS ${sanitize(ctx.appVersion, 16) || "?"}${ctx.buildNumber ? ` (${sanitize(ctx.buildNumber, 16)})` : ""}`,
      `${sanitize(ctx.systemName, 16) || "iOS"} ${sanitize(ctx.systemVersion, 16) || ""}`.trim(),
      sanitize(ctx.deviceModel, 32),
      sanitize(ctx.locale, 16),
    ].filter(Boolean);
  } else {
    footerParts = [
      `3DPA Web ${sanitize(ctx.appVersion, 16) || "?"}`,
      `${sanitize(ctx.browser, 32) || "?"} ${sanitize(ctx.browserVersion, 16) || ""}`.trim(),
      sanitize(ctx.os, 48),
      sanitize(ctx.locale, 16),
      sanitize(ctx.screen, 24),
    ].filter(Boolean);
  }

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
