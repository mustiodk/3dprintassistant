// Worker entrypoint for 3dprintassistant.com
//
// Purpose: Cloudflare's Workers platform (new unified build for Pages projects)
// requires an explicit `main` script to classify the deployment as
// "assets + worker" rather than "static assets only". Without it, env vars
// are locked and `functions/` is never routed. This entrypoint:
//   1) Dispatches `/api/feedback` to the existing Pages-Function-shaped
//      handler in `functions/api/feedback.js` — no code change to that file.
//   2) Delegates every other request to the static asset binding (ASSETS),
//      which serves the repo root the same way the old Pages platform did.
//
// If a new `/api/<route>` is added later, add another branch here; keep each
// route explicit rather than prefix-matching so we don't accidentally route
// static paths that happen to start with /api/ through the worker.

import {
  onRequestPost    as feedbackOnRequestPost,
  onRequestOptions as feedbackOnRequestOptions,
  onRequest        as feedbackOnRequestFallback,
} from "./functions/api/feedback.js";

import {
  onRequestPost    as analyticsOnRequestPost,
  onRequestOptions as analyticsOnRequestOptions,
  onRequest        as analyticsOnRequestFallback,
} from "./functions/api/analytics.js";

import {
  onRequestPost    as analyticsQueryOnRequestPost,
  onRequestOptions as analyticsQueryOnRequestOptions,
  onRequest        as analyticsQueryOnRequestFallback,
} from "./functions/api/analytics-query.js";

import {
  handlePushRequest,
  isPushAPIPath,
} from "./functions/api/push/index.js";
import { processQueueBatch } from "./functions/api/push/consumer.js";
import { runRetention } from "./functions/api/push/retention.js";

const PRIVATE_ASSET_ROOTS = [
  "/.assetsignore",
  "/.git",
  "/.gitignore",
  "/.claude",
  "/.wrangler",
  "/CLAUDE.md",
  "/wrangler.toml",
  "/worker.js",
  "/functions",
  "/migrations",
  "/package.json",
  "/package-lock.json",
  "/vitest.config.mjs",
];

export function isPrivateAssetPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return true;
  }

  const path = decoded.replace(/\/{2,}/g, "/");
  return PRIVATE_ASSET_ROOTS.some(
    (root) => path === root || path.startsWith(`${root}/`),
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (isPrivateAssetPath(url.pathname)) {
      return new Response(null, { status: 404 });
    }

    if (url.pathname === "/api/feedback") {
      // Re-create the Pages `context` object that the handler expects.
      const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) };

      if (request.method === "POST")    return feedbackOnRequestPost(context);
      if (request.method === "OPTIONS") return feedbackOnRequestOptions(context);
      // Catch-all inside the handler — returns 405 for any other method.
      return feedbackOnRequestFallback(context);
    }

    if (url.pathname === "/api/analytics") {
      const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) };

      if (request.method === "POST")    return analyticsOnRequestPost(context);
      if (request.method === "OPTIONS") return analyticsOnRequestOptions(context);
      return analyticsOnRequestFallback(context);
    }

    if (url.pathname === "/api/analytics-query") {
      const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) };

      if (request.method === "POST")    return analyticsQueryOnRequestPost(context);
      if (request.method === "OPTIONS") return analyticsQueryOnRequestOptions(context);
      return analyticsQueryOnRequestFallback(context);
    }

    if (isPushAPIPath(url.pathname)) {
      return handlePushRequest(request, env);
    }

    // Static fallback. ASSETS resolves the request against the public site
    // exactly like the old Pages runtime, including SPA-style 404 fallback
    // behavior if configured. Here we just let it return what it finds.
    return env.ASSETS.fetch(request);
  },

  async queue(batch, env, ctx) {
    await processQueueBatch(batch, env, ctx);
  },

  scheduled(_controller, env, ctx) {
    ctx.waitUntil(runRetention(env));
  },
};
