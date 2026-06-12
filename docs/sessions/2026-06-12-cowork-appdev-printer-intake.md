# 2026-06-12 — Cowork (appdev): Printer Intake Automation (design + Phase 1 tee)

## Durable context

- **New automation designed: turn missing-printer Discord feedback into a
  reviewed, shippable printer addition** — driven via the ai-om Agent Factory.
  Full design + contracts live in
  `ai-operating-model/docs/agents/printer-intake-scout.md` +
  `printer-addition-assistant.md`. This 3dpa log covers the product-side build.
- **Ship path is web-only.** A printer reaches current iOS users through the
  **remote overlay** (`catalog/ios-printer-overlay-v1.json`, a Cloudflare deploy),
  not a new binary. No app version bump, no TestFlight. The iOS bundled-mirror
  commit is local bookkeeping for the *next* binary. Sequence:
  `data/printers.json` + overlay → push web → auto-deploy → live on web + current
  iOS. (Corrected an early over-weighting of the iOS push gate.)
- **Phase 1 shipped as code, not deployed.** `functions/api/feedback.js` now tees
  `missingPrinter` submissions to a `PRINTER_INTAKE` KV namespace — **fail-open**
  (a KV error never blocks the Discord post or the 200), and **dormant** until the
  KV binding is added to `wrangler.toml`. `missingPrinter` is already its own
  category and `payload.fields` is already structured, so Option B (tee structured
  data at source) beat Discord scraping. Commit `2995ece`, **local only —
  intentionally unpushed (owner: no deploy yet).**
- **Scout host = a Node script in this repo** (`scripts/printer-intake-scout.js`,
  not yet written), co-located with `picker-dry-run.js` / `validate-data.js` /
  `validate-ios-printer-overlay.js` — the validators it must call. NOT hosted in
  agent-ops (that's a dashboard card-report engine, wrong contract). Scheduled
  later via agent-ops's launchd *pattern* only.
- **Garbage-input handling is explicit:** the Scout classifies and never
  fabricates a printer/specs. Only brand+model+source-confirmed novel FDM →
  candidate. Empty / brand-only / misspelled-model / resin / duplicate → triage
  list for owner awareness. The protocol's FDM-only Phase 1.0 still governs (the
  example request, Anycubic Photon Mono M7 Pro, is resin → auto-decline).

## What happened / Actions

- Agent Factory intake → two-part shape (unattended Scout + gated Assistant).
- Read `printer-addition-protocol.md`, `ios-remote-printer-catalog.md`,
  `feedback.js`, `wrangler.toml`, the existing `scripts/`.
- Wrote + committed the fail-open feedback tee (Phase 1 code), held unpushed.
- Specified owner infra steps + the Phase 2 Scout build.

## Files touched (Modified / Deleted / Untracked)

- **Modified:** `functions/api/feedback.js` (tee block after the `no_field_values`
  guard).
- **Untracked:** this session log.
- **Deleted:** none.

## Commits

- `2995ece` feat(feedback): tee missing-printer requests to PRINTER_INTAKE queue
  — **local only, NOT pushed** (owner directed no deploy this session).

## Open questions / Follow-up

- **Owner infra (when ready to go live):** (1) `npx wrangler kv namespace create
  PRINTER_INTAKE` → paste the id back to bind in `wrangler.toml`; (2) mint a
  scoped Cloudflare API token (Account · Workers KV Storage · Edit) for the Scout;
  (3) push web to deploy.
- **Md-hygiene:** the tee commit is local/unpushed by design — `main` is ahead 1.
  Record kept here + in NEXT-SESSION so it isn't mistaken for drift.
- **Next:** build `scripts/printer-intake-scout.js` against fixtures.

## Next session

Build the Scout (`scripts/printer-intake-scout.js`) deterministic core against
fixtures — see `docs/sessions/NEXT-SESSION.md`. The ai-om contracts are the spec.
