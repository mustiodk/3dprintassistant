# Cloudflare Pages → Workers migration blocking `functions/` deployment

**Date:** 2026-04-17
**Project:** 3dprintassistant (Cloudflare-hosted static site at 3dprintassistant.com)
**Role seeking feedback:** please diagnose and recommend the simplest fix.

---

## What I'm trying to do

Replace a Tally feedback form with a Discord-webhook-backed one. Keep the webhook URL server-side (off the client bundle) by running a tiny Cloudflare Pages Function that forwards submissions to Discord.

Architecture intended:

```
Browser modal  ──POST──▶  /api/feedback  ──POST──▶  Discord webhook
                          (Pages Function,
                           reads env.DISCORD_WEBHOOK_URL)
```

This is the standard Cloudflare Pages Function pattern.

---

## What I did

1. Created `functions/api/feedback.js` at the project root. It exports `onRequestPost`, `onRequestOptions`, `onRequest` (catch-all 405). Reads `env.DISCORD_WEBHOOK_URL`, validates, forwards to Discord.
2. Committed it alongside the frontend modal + CSS + locale changes:
   - `commit 331124b` "Add Discord-backed feedback stack (dormant)"
3. Pushed to `main`.
4. Waited ~2 minutes, then polled `https://3dprintassistant.com/api/feedback` 8 times → all **HTTP 404**.

---

## What Cloudflare's dashboard shows

### Workers & Pages → 3dprintassistant → Overview
- Project is listed under "Workers & Pages"
- Breadcrumb says `Workers > 3dprintassistant > production`
- Main URL header says: `3dprintassistant` followed by `Workers` (small tag)
- Note: I believe this project was originally a **Cloudflare Pages** project that Cloudflare has since migrated to the new unified **"Workers Builds"** platform

### Deployments tab shows two new versions after my push:
| Version | Message | Author | Active? |
|---|---|---|---|
| `b5733a67` | "Add Cloudflare Workers configuration" | **cloudflare-workers-autoconfig[bot]** | **YES, 100% traffic** |
| `44232ee0` | "Add Discord-backed feedback stack (dormant)" | me | no |

So Cloudflare's autoconfig bot **reacted** to my push and produced its own version, which is now the Active one. My version is inactive.

(The autoconfig commit does not exist in my git history on `origin/main` — it's purely internal to Cloudflare's Workers config layer.)

### Settings tab — the problematic part

**Variables and Secrets** section says literally:

> "Variables cannot be added to a Worker that only has static assets. Learn more"

There is **no Add button**, no way to add env vars through the UI.

The same restriction appears for:
- Trigger Events: "Triggers cannot be added to a Worker that only has static assets."
- Observability → Logpush: "Logpush cannot be added to a Worker that only has static assets."
- Observability → Tail Workers: "Tail Workers cannot be added to a Worker that only has static assets."

Runtime section shows:
- Compatibility date: Apr 15, 2026
- Compatibility flags: `nodejs_compat`

### The live endpoint
- `GET https://3dprintassistant.com/api/feedback` → **404**
- The `functions/api/feedback.js` is clearly not being wired as a route

---

## The contradiction

Cloudflare **noticed** my `functions/` directory (its autoconfig bot fired), but the Worker is still classified "static assets only" which blocks env vars AND is (seemingly) not serving the function on `/api/*`.

On the classic Pages platform, putting a file at `functions/api/feedback.js` automatically routes `/api/feedback` to that handler — no config needed. On the Workers-Builds-migrated version of a Pages project, this seems to not be the default behavior.

---

## Project context that might matter

- **No `wrangler.toml` in the repo.** This was a Pages project configured entirely via the dashboard.
- **No build step.** It's a static site — GitHub `main` push → Cloudflare deploys. No `package.json`, no framework.
- **Custom domain:** `3dprintassistant.com` + `www.3dprintassistant.com`
- **workers.dev URL:** `3dprintassistant.mustiodk.workers.dev`
- The `functions/` directory I just added is the only server-side code in the repo.
- Account is on Cloudflare's **free plan** (as far as I know)

---

## What I need from you

1. **Why is Cloudflare treating this as "static assets only"** after I added `functions/api/feedback.js`? The autoconfig bot should have upgraded the Worker type to "static assets + functions" — why didn't it?

2. **What's the cleanest fix?** Options I'm considering:
   - (a) Manually add a `wrangler.toml` at repo root that explicitly declares the Worker has both static assets AND functions (if yes, what minimal config?)
   - (b) Cloudflare dashboard has a setting I haven't found that toggles Functions on for this Worker
   - (c) The project needs to be migrated back to a real Pages project (seems drastic, maybe impossible)
   - (d) Give up on Pages Functions and use a different server (e.g. separate Cloudflare Worker project, or my existing simply.com PHP/Node hosting)

3. **Is the autoconfig commit `b5733a67` hiding something I need to see?** The fact that it's Active with 100% traffic instead of my own push version looks wrong — what is the autoconfig bot actually doing, and is there a way to view its config?

4. **If the fix is `wrangler.toml`, give me the exact minimal content** to declare:
   - Static assets at repo root (with `index.html` as the fallback)
   - Functions loaded from `functions/` directory
   - Both bound to the same Worker so `/api/*` hits the function and everything else serves static files

---

## My preferred outcome

Stay on Cloudflare (same infra as rest of site), keep the webhook server-side (not in client bundle), minimum config changes. Willing to add `wrangler.toml` if that unblocks it.

## What I'm trying to avoid

Spending another hour clicking through the Cloudflare dashboard. I need either (a) a config file to add, or (b) a specific dashboard setting path to toggle, or (c) clear evidence that this platform state is a dead end and I should pivot.

---

## Files relevant to the answer

- `functions/api/feedback.js` — the Pages Function. If needed I can paste its contents.
- `index.html` — static site entry; currently untouched re Tally.
- No `wrangler.toml` exists yet.
