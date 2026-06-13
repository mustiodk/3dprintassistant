# Handover → Codex: activate the live printer-intake tee

**Date:** 2026-06-13 · **From:** Claude Code session · **Status:** RESOLVED by
Codex follow-up on 2026-06-13. The deployed Worker was writing remote KV; the
false negative came from Wrangler reads without `--remote`.

## Resolution

Root cause: the read/diagnostic path used `wrangler kv key list/get --namespace-id
...` without `--remote`. With Wrangler 4.100.0 that queried local/default KV and
returned an empty list, while the deployed Worker had successfully written to
remote KV.

Fix:

- `scripts/printer-intake-scout.js` now passes `--remote` for live KV `list` and
  `get`.
- `scripts/fixtures/fake-wrangler.js` now rejects KV reads unless `--remote` is
  present, giving a TDD regression guard.
- Temporary Worker logging was removed; cleaned Worker redeployed as version
  `a55212e9-7998-4d20-a902-108dcb3a021c`.
- Smoke keys were deleted; live remote queue verified empty.

Verification:

- `wrangler tail` on diagnostic version `167b9963-4ae8-4364-9023-b0b1f9517534`
  logged `hasPrinterIntake:true`, `printerIntakeType:"object"`, and `putOk:true`
  for key `req:1781353403790:2bd71120`.
- `npx wrangler kv key get --remote --namespace-id
  f3d89a4e70a34e3fab1c0f7676efebb5 req:1781353403790:2bd71120` returned the
  smoke payload.
- `node scripts/printer-intake-scout.js --source kv --no-watermark --quiet`
  first saw 7 smoke entries, then after cleanup saw `0 in`.
- `node scripts/printer-intake-scout.test.js` passed.

Do not re-run this handover unless the tee regresses. Future KV diagnostics must
use `--remote`.

## Original brief (superseded)

The section below is retained as historical context for the diagnostic path that
led to the fix.

## Confirmed facts (do NOT re-tread these)
- **Scout code is complete, tested (28 unit tests + 38/43 QA), reviewed (sub-agent
  + bridge), and pushed.** `origin/main` HEAD = `550ac92`. Local reads of the live
  KV queue work fine via the wrangler CLI (`node scripts/printer-intake-scout.js
  --source kv` and `--use-config-token`).
- **KV namespace** `PRINTER_INTAKE` exists, id `f3d89a4e70a34e3fab1c0f7676efebb5`,
  account `038ac75563c82b3641d1626510938c1b`. Writing/reading it **directly via
  wrangler CLI works** (verified many times this session).
- **Binding is configured AND in the deployed version.** Dashboard Bindings tab
  shows `KV namespace → PRINTER_INTAKE → PRINTER_INTAKE`. `npx wrangler deploy`
  output (run this session) listed `env.PRINTER_INTAKE (f3d89a4e…) KV Namespace`
  in the deployed bindings. Current Version ID from that manual deploy:
  `22043f87-0dc7-4195-ac01-0112d683c217`.
- **Routing is correct.** `worker.js` (entrypoint, `main = "worker.js"`) routes
  `POST /api/feedback` → `functions/api/feedback.js` `onRequestPost`, passing `env`
  through. The Discord post works (so `env` IS forwarded — `env.DISCORD_WEBHOOK_URL`
  is read successfully).
- **Tee code** lives at `functions/api/feedback.js` ~lines 254-272:
  ```js
  if (payload.category === "missingPrinter" && env.PRINTER_INTAKE) {
    try {
      const id = `req:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`;
      await env.PRINTER_INTAKE.put(id, JSON.stringify({ fields: rawFields, email, context, appSource, receivedAt }),
        { expirationTtl: 60 * 60 * 24 * 90 });
    } catch (_) { /* swallow — fail-open */ }
  }
  ```
- **Deploy model:** git-connected Worker (Build → Deploy command `npx wrangler
  deploy`, production branch `main`, **Build cache: ENABLED**). NOT Pages.
- **Workers Observability/Logs: DISABLED** (Settings → Observability all off).

## The symptom
`curl -X POST https://3dprintassistant.com/api/feedback` with
`{"category":"missingPrinter","fields":[{"id":"brand","label":"Brand","value":"DeploySmoke"},{"id":"model","label":"Model","value":"<sentinel>"}],"email":null,"context":{}}`
returns `{"ok":true}` every time, **but the sentinel never appears in the KV
namespace** — polled up to 3 minutes across (a) the git-build deploy and (b) the
manual cache-free `wrangler deploy`. (KV list IS eventually-consistent and lagged
60-120s in other tests, so polls were generous; 3 min with nothing is real.)

## Strongest hypotheses (in order)
1. **Custom-domain serves a different/stale version than the manual deploy.** The
   manual `wrangler deploy` created version `22043f87` (binding present) and printed
   the **workers.dev** URL `https://3dprintassistant.mustiodk.workers.dev`. The
   **custom domain** `3dprintassistant.com` may still be served by the
   git-integration's deployment (Build cache ENABLED → possibly a stale config
   *without* the active binding). **DECISIVE TEST (do this first):** POST the same
   smoke to the **workers.dev URL** and to the **custom domain**, and compare which
   one writes to KV. If workers.dev writes but the custom domain doesn't → it's a
   version/domain-routing split; fix by clearing the build cache + redeploying via
   git (or repoint the domain to the current version).
2. **`env.PRINTER_INTAKE` is falsy at runtime** despite deploy config → the `&&
   env.PRINTER_INTAKE` short-circuits, tee silently skips (no error, ok:true). Add
   a temporary `console.error("tee:", typeof env.PRINTER_INTAKE, payload.category)`
   just before the `if`, deploy, and `wrangler tail` while POSTing.
3. **The `.put()` throws and the fail-open `catch(_){}` hides it** (e.g.
   `crypto.randomUUID` under `nodejs_compat`, or an `expirationTtl`/value issue).
   Temporarily change the catch to `catch (e) { console.error("PRINTER_INTAKE put
   failed:", e?.message, e?.stack); }`, deploy, `wrangler tail`, POST, read the
   exception.

## Decisive next steps for Codex
1. **Run hypothesis-1 test** (workers.dev vs custom domain) — 60 seconds, pinpoints
   domain/version vs code.
2. If inconclusive, **`npx wrangler tail 3dprintassistant`** in one terminal while
   POSTing the smoke in another → see runtime logs. (Catch currently swallows, so
   first un-swallow it per hypothesis 3, deploy, then tail.)
3. Once the cause is known: fix, push to `main` (git auto-deploys via `npx wrangler
   deploy`; **clear the build cache** if the manual-vs-git version split was the
   issue), then re-verify with the smoke recipe below.
4. **Re-instate the fail-open `catch(_){}`** (remove any temporary logging) before
   the final commit — the swallow is intentional (feedback delivery must never be
   blocked by a KV error), it just made this hard to debug.

## Smoke recipe (verification)
```bash
ACC=038ac75563c82b3641d1626510938c1b; NS=f3d89a4e70a34e3fab1c0f7676efebb5; S="TEE-$(date +%s)"
curl -s -X POST https://3dprintassistant.com/api/feedback -H "Content-Type: application/json" \
  -H "Origin: https://3dprintassistant.com" \
  -d "{\"category\":\"missingPrinter\",\"fields\":[{\"id\":\"brand\",\"label\":\"Brand\",\"value\":\"DeploySmoke\"},{\"id\":\"model\",\"label\":\"Model\",\"value\":\"$S\"}],\"email\":null,\"context\":{}}"
# then poll (KV list is eventually-consistent — wait up to ~2 min):
CLOUDFLARE_ACCOUNT_ID=$ACC npx wrangler kv key list --remote --namespace-id $NS
# get each key and look for $S; delete the smoke entry when done.
```
Note: `Date.now()`/`date +%s` is fine here (this is a shell/handover, not a Workflow script).

## Token note (Gate B — non-blocking)
`scripts/.printer-intake.local.json` (gitignored) holds `printer-agent-token-v2`.
It works via **wrangler** (`CLOUDFLARE_API_TOKEN` env / `--use-config-token`).
NOTE: the **raw REST `/keys`** endpoint returns 0 for this token (and the old one)
even when keys exist — that's a REST-endpoint/consistency quirk, NOT a token-scope
problem; the Scout uses wrangler, so it's a non-issue. Don't chase it.

## What's NOT this task (separate, already planned)
- The **researcher rehearsal** (Printer Addition Assistant dry-run on Voxelab Aries
  + adversarial cases) — owner-agreed as the next effort, independent of this tee.
- Clearing the **Discord backlog** (Voxelab Aries, Anycubic Photon Mono M7 Pro) into
  the queue — do after the tee writes; seed via `wrangler kv key put` to avoid
  duplicate Discord posts.

## Two honest cautions from this session (both were my misdiagnoses — verify, don't trust)
- I twice concluded a root cause from the **wrong probe**: (1) "token can't list keys"
  (was the REST endpoint, not the token); (2) "binding missing" (it was present —
  likely a stale-version/cache issue). **Use `wrangler tail` / real logs to see the
  actual runtime behavior before concluding.** Observe, don't infer.
