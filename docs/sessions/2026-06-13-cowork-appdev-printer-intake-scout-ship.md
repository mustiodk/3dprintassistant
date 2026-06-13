# 2026-06-13 — Cowork (appdev): Printer Intake Scout build, hostile review, ship

## Durable context

- **Printer Intake Scout (Phase 2) is built, reviewed, and pushed** —
  `scripts/printer-intake-scout.js` (deterministic core) + fixtures + 28-test
  suite. It triages teed missing-printer feedback into buckets
  (needs-research / duplicate / declined-non-fdm / incomplete / unactionable /
  parse-error) and emits a PII-safe run report + private candidate skeletons.
  Reads fixtures OR the live KV queue **via the wrangler CLI** (not raw REST).
- **The live KV tee is the one open item.** The Worker is deployed, the
  `PRINTER_INTAKE` KV binding is configured AND present in the deployed version
  (confirmed in `wrangler deploy` output), the tee code runs and `env` is
  forwarded — but the deployed worker does **not** write missingPrinter requests
  to KV at runtime. Root cause not isolated. **Handed to Codex:**
  [`codex/printer-intake-tee-handover/HANDOVER.md`](../../codex/printer-intake-tee-handover/HANDOVER.md).
- **Two probe-the-wrong-layer misdiagnoses this session** (both corrected, both
  filed as findings): (1) "the API token can't list keys / is mis-scoped" — it
  was the raw REST `/keys` endpoint quirk, not the token; the token works via
  wrangler. (2) "the KV binding is missing from prod" — it was present; the real
  issue is a runtime non-write (likely stale-version / build-cache or runtime
  binding falsy), still open. **Lesson: observe runtime (wrangler tail / logs),
  don't infer root cause from an adjacent probe.**
- **Deploy model clarified:** `3dprintassistant` is a **git-connected Worker**
  (not Pages), `main = "worker.js"` routes `/api/feedback` →
  `functions/api/feedback.js`, deploy command `npx wrangler deploy`, **Build cache
  ENABLED**, Workers logs DISABLED. Custom domain `3dprintassistant.com` may serve
  a different version than a manual `wrangler deploy` (key hypothesis for Codex).
- **Token (Gate B):** `printer-agent-token-v2` stored gitignored at
  `scripts/.printer-intake.local.json`; works via wrangler / `--use-config-token`.
  (Recreating the original token turned out unnecessary — see misdiagnosis #1.)

## What happened / Actions

- Built the Scout deterministic core (TDD: real RED before the script existed).
- Gate A: created KV namespace `PRINTER_INTAKE`
  (`f3d89a4e70a34e3fab1c0f7676efebb5`), wired binding in `wrangler.toml`.
- Added live-KV read (wrangler CLI) + watermark; switched off the brittle
  REST+token path.
- **Two-stage hostile review** (sub-agent + bridge→Codex), 4 patch rounds:
  PII redaction (no raw email/notes in reports; gitignored+assetignored staging),
  parse/timestamp error surfacing, FDM scope on brand+model (+ hard acronyms in
  notes), cross-brand dedupe, `--out` path canonicalization (macOS case + symlink),
  brand-in-model extraction, id-collision flagging, KV page-cap guard.
- **Expanded QA** via a QA sub-agent: 43-scenario matrix → 38/43 match, 0 safety
  issues, adversarial/injection inputs safe.
- Pushed (13 commits), released the commit-boundary hold.
- Deploy verification ("committed ≠ deployed") caught the live tee not writing →
  diagnosed deploy model → one bounded redeploy (`wrangler deploy`) → still not
  writing → handover + wrap per owner directive.

## Files touched (Modified / Untracked)

- **Added:** `scripts/printer-intake-scout.js`, `scripts/printer-intake-scout.test.js`,
  `scripts/fixtures/printer-intake-sample.json` / `-empty.json` / `-adversarial.json`
  / `-robustness.json` / `fake-wrangler.js`,
  `codex/printer-intake-tee-handover/HANDOVER.md`, this log.
- **Modified:** `functions/api/feedback.js` (tee — pushed earlier), `wrangler.toml`
  (KV binding), `feedback-form.js` (canonical field id), `.gitignore`, `.assetsignore`.

## Commits

`2995ece` tee · `5385ebc` wrap · `b9acaa8` Scout core · `b2daf03` KV binding ·
`6901296` live-KV+watermark · `62f729d` gitignore/assetsignore · `cd9975a` harden
(dual review) · `76fb90f` canonical field id · `64da6a8` Codex re-review fixes ·
`336814f` --out guard · `73adc03` --out canonicalize · `b4c6317` cross-brand dedupe ·
`550ac92` input robustness · + handover/assetsignore commit. (All pushed; manual
`wrangler deploy` version `22043f87`.)

## Open questions / Follow-up

- **[BLOCKER for live capture]** Activate the deployed tee — see
  `codex/printer-intake-tee-handover/HANDOVER.md`. First probe: POST smoke to the
  workers.dev URL vs the custom domain; then `wrangler tail` with the catch
  un-swallowed.
- **Findings filed:** `ai-operating-model/docs/findings/` — probe-the-wrong-layer
  (REST-vs-wrangler) + config-vs-running-version (committed≠deployed for Worker
  bindings).
- **Md-hygiene:** `.assetsignore` now excludes `scripts/`, `docs/`, `codex/`
  (internal markdown was publicly served under `directory="."`).
- **Researcher rehearsal** (Printer Addition Assistant dry-run on Voxelab Aries +
  adversarial cases) — owner-agreed next effort, independent of the tee.
- **Discord backlog** (Voxelab Aries, Anycubic Photon Mono M7 Pro) — seed into the
  queue once the tee writes (Photon → auto-declined resin; Aries → needs-research,
  new brand).

## Next session

Finish the tee activation per the handover (or in Codex), then run the researcher
rehearsal. See `docs/sessions/NEXT-SESSION.md`.
