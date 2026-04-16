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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/feedback") {
      // Re-create the Pages `context` object that the handler expects.
      const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) };

      if (request.method === "POST")    return feedbackOnRequestPost(context);
      if (request.method === "OPTIONS") return feedbackOnRequestOptions(context);
      // Catch-all inside the handler — returns 405 for any other method.
      return feedbackOnRequestFallback(context);
    }

    // Static fallback. ASSETS resolves the request against the public site
    // exactly like the old Pages runtime, including SPA-style 404 fallback
    // behavior if configured. Here we just let it return what it finds.
    return env.ASSETS.fetch(request);
  },
};
