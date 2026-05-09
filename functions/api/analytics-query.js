// Cloudflare Worker route — POST /api/analytics-query
//
// Small owner-facing read API for the analytics dashboard. The browser sends a
// canned query id + options; this Worker turns that into SQL and calls
// Cloudflare's Analytics Engine SQL API server-side. Never expose the
// Cloudflare API token to the browser.

const ALLOWED_ORIGINS = new Set([
  "https://3dprintassistant.com",
  "https://www.3dprintassistant.com",
]);

const ALLOWED_ORIGIN_SUFFIXES = [
  ".3dprintassistant.pages.dev",
];

const DATASET = "3dpa_usage_v1";
const DATASET_TABLE = `"${DATASET}"`;
const MAX_REQUEST_BYTES = 2 * 1024;

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

function corsHeaders(origin) {
  if (!isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Analytics-Admin-Token",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
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

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function optionsFromPayload(payload) {
  return {
    days: clampInt(payload?.days, 1, 90, 7),
    limit: clampInt(payload?.limit, 5, 100, 25),
  };
}

function interval(days) {
  return `NOW() - INTERVAL '${days}' DAY`;
}

const QUERY_BUILDERS = {
  summary: ({ days }) => `
SELECT
  blob2 AS event,
  blob3 AS platform,
  SUM(_sample_interval * double1) AS events
FROM ${DATASET_TABLE}
WHERE timestamp > ${interval(days)}
GROUP BY event, platform
ORDER BY events DESC
LIMIT 100
FORMAT JSON`,

  overview: ({ days, limit }) => `
SELECT
  blob2 AS event,
  blob3 AS platform,
  blob4 AS channel,
  SUM(_sample_interval * double1) AS events
FROM ${DATASET_TABLE}
WHERE timestamp > ${interval(days)}
GROUP BY event, platform, channel
ORDER BY events DESC
LIMIT ${limit}
FORMAT JSON`,

  top_printers: ({ days, limit }) => `
SELECT
  blob3 AS platform,
  blob8 AS printer_brand,
  blob9 AS printer_model,
  SUM(_sample_interval * double1) AS profiles
FROM ${DATASET_TABLE}
WHERE timestamp > ${interval(days)}
  AND blob2 = 'profile_generated'
GROUP BY platform, printer_brand, printer_model
ORDER BY profiles DESC
LIMIT ${limit}
FORMAT JSON`,

  top_materials: ({ days, limit }) => `
SELECT
  blob3 AS platform,
  blob11 AS material,
  blob12 AS material_group,
  SUM(_sample_interval * double1) AS profiles
FROM ${DATASET_TABLE}
WHERE timestamp > ${interval(days)}
  AND blob2 = 'profile_generated'
GROUP BY platform, material, material_group
ORDER BY profiles DESC
LIMIT ${limit}
FORMAT JSON`,

  profile_details: ({ days, limit }) => `
SELECT
  blob3 AS platform,
  blob8 AS printer_brand,
  blob9 AS printer_model,
  blob11 AS material,
  blob12 AS material_group,
  blob20 AS output_mode,
  SUM(_sample_interval * double1) AS profiles
FROM ${DATASET_TABLE}
WHERE timestamp > ${interval(days)}
  AND blob2 = 'profile_generated'
GROUP BY platform, printer_brand, printer_model, material, material_group, output_mode
ORDER BY profiles DESC
LIMIT ${limit}
FORMAT JSON`,

  profile_mix: ({ days, limit }) => `
SELECT
  blob3 AS platform,
  blob13 AS nozzle,
  blob17 AS profile_mode,
  blob18 AS slicer,
  blob20 AS output_mode,
  SUM(_sample_interval * double1) AS profiles
FROM ${DATASET_TABLE}
WHERE timestamp > ${interval(days)}
  AND blob2 = 'profile_generated'
GROUP BY platform, nozzle, profile_mode, slicer, output_mode
ORDER BY profiles DESC
LIMIT ${limit}
FORMAT JSON`,

  environments: ({ days, limit }) => `
SELECT
  blob3 AS platform,
  blob14 AS environment,
  blob15 AS support,
  blob16 AS colors,
  SUM(_sample_interval * double1) AS profiles
FROM ${DATASET_TABLE}
WHERE timestamp > ${interval(days)}
  AND blob2 = 'profile_generated'
GROUP BY platform, environment, support, colors
ORDER BY profiles DESC
LIMIT ${limit}
FORMAT JSON`,

  feedback: ({ days, limit }) => `
SELECT
  blob3 AS platform,
  blob19 AS feedback_category,
  SUM(_sample_interval * double1) AS opens
FROM ${DATASET_TABLE}
WHERE timestamp > ${interval(days)}
  AND blob2 = 'feedback_opened'
GROUP BY platform, feedback_category
ORDER BY opens DESC
LIMIT ${limit}
FORMAT JSON`,

  versions: ({ days, limit }) => `
SELECT
  blob3 AS platform,
  blob4 AS channel,
  blob5 AS app_version,
  blob6 AS build_number,
  SUM(_sample_interval * double1) AS events
FROM ${DATASET_TABLE}
WHERE timestamp > ${interval(days)}
GROUP BY platform, channel, app_version, build_number
ORDER BY events DESC
LIMIT ${limit}
FORMAT JSON`,
};

function buildQuery(queryId, opts) {
  const builder = QUERY_BUILDERS[queryId];
  if (!builder) return null;
  return builder(opts).trim();
}

function readConfig(env) {
  return {
    accountId: env.CLOUDFLARE_ACCOUNT_ID || env.CF_ACCOUNT_ID || "",
    apiToken: env.CLOUDFLARE_ANALYTICS_READ_TOKEN || env.CF_ANALYTICS_READ_TOKEN || "",
    adminToken: env.ANALYTICS_ADMIN_TOKEN || "",
  };
}

async function runCloudflareQuery(sql, config) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/analytics_engine/sql`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiToken}`,
        "Content-Type": "text/plain",
      },
      body: sql,
    }
  );

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body: text.slice(0, 1200) };
  }

  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: true, data: { raw: text } };
  }
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

  if (!isAllowedOrigin(origin)) {
    return jsonResponse(403, { ok: false, error: "forbidden_origin" }, cors);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonResponse(413, { ok: false, error: "payload_too_large" }, cors);
  }

  const config = readConfig(env);
  if (!config.adminToken) {
    return jsonResponse(500, { ok: false, error: "admin_token_not_configured" }, cors);
  }

  const suppliedToken = request.headers.get("X-Analytics-Admin-Token") || "";
  if (suppliedToken !== config.adminToken) {
    return jsonResponse(401, { ok: false, error: "unauthorized" }, cors);
  }

  if (!config.accountId || !config.apiToken) {
    return jsonResponse(500, { ok: false, error: "cloudflare_query_not_configured" }, cors);
  }

  let payload;
  try {
    payload = JSON.parse(await request.text());
  } catch {
    return jsonResponse(400, { ok: false, error: "invalid_json" }, cors);
  }

  const queryId = typeof payload?.query === "string" ? payload.query : "";
  const opts = optionsFromPayload(payload);
  const sql = buildQuery(queryId, opts);
  if (!sql) {
    return jsonResponse(400, { ok: false, error: "invalid_query" }, cors);
  }

  const result = await runCloudflareQuery(sql, config);
  if (!result.ok) {
    console.log("analytics_query_failed", {
      query: queryId,
      status: result.status,
      body: result.body,
    });
    return jsonResponse(502, {
      ok: false,
      error: "cloudflare_query_failed",
      status: result.status,
      body: result.body,
    }, cors);
  }

  return jsonResponse(200, {
    ok: true,
    query: queryId,
    days: opts.days,
    limit: opts.limit,
    result: result.data,
  }, cors);
}

export async function onRequest({ request }) {
  const origin = request.headers.get("Origin");
  return jsonResponse(405, { ok: false, error: "method_not_allowed" }, corsHeaders(origin));
}

export const __test = {
  buildQuery,
  optionsFromPayload,
  corsHeaders,
};
