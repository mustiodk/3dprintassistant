# 2026-06-14 — Cowork (appdev): iOS overlay Aries-collision fix

## Durable context

- **The iOS remote overlay is all-or-nothing.** `PrinterCatalogProvider.validatePayload`
  requires the *entire* remote printer/brand set to be disjoint from the running app's
  bundled catalog; on **any** collision it throws `duplicateIds`, the catch in
  `fetchValidatedRemoteOverlay` swallows it, and the **whole overlay is dropped** (falls back
  to bundled). A single stale id silently hides every other printer the overlay carries.
- **Root cause of Aries-invisible-on-iOS:** the overlay still carried `sparkx_i7`, which
  v1.0.4 bundles. So on every v1.0.4 device the i7 collision dropped the whole overlay,
  taking `aries` with it. Latent since v1.0.4 went live 2026-06-04 (the old i7-only overlay
  collided too, but harmlessly — i7 was bundled anyway).
- **Published ≠ delivered.** The prior wrap verified the overlay was *served* live
  (`curl` → `2026061301`) and called Aries shipped — but never verified consumer
  acceptance. The CDN-liveness layer is above the layer that actually decides delivery (the
  iOS validator). Finding `2026-06-14-overlay-published-live-not-delivered` (extends
  `feedback_committed_is_not_deployed`).
- **The ship validator was blind to it** because it only collided overlay ids against the
  single `min_app_version` (1.0.3) baseline, which predates i7-as-bundled. Now it collides
  against the **union of all baselines ≥ min_app_version** and **requires a baseline for the
  current MARKETING_VERSION**, so it can't go stale when a binary bakes in a printer.
- **Deploy model (verified `wrangler.toml`):** Workers + Assets, git-connected (`main =
  "worker.js"`, `[assets] directory="."`), **not** Cloudflare Pages. Push to `main`
  auto-deploys; CDN propagation ~15-30s (curl flipped on the 2nd poll). `CLAUDE.md:63` +
  `docs/3dpa-context.md` still say "Pages" — stale (md-hygiene item below).
- **Overlay applies on the *next* launch** after the one that re-caches it (≥1 relaunch;
  the refresh is a fire-and-forget `.utility` task with a 2s timeout, so a slow launch can
  defer it). v1.0.4 users see Aries after relaunching.

## What happened / Actions

- Owner reported "Aries on web but not visible on iOS." Diagnosed by **observing runtime
  first** (curl the live overlay, read the Swift validator, check the shipped v1.0.4 bundled
  catalog on `origin/main`) — not inferring from an adjacent surface.
- Ran the owner-requested rigorous process: **spec → sub-agent review (GO) → patch → impl
  plan → sub-agent review (NO-GO, caught a real HIGH) → patch → 5 gates**, each gate
  execute → sub-agent review → patch → QA-green → advance. Owner cadence: auto Gates 1–4,
  hard stop before the Gate 5 ship.
- Gate 1: refactored `validate-ios-printer-overlay.js` into a testable pure fn; union +
  MARKETING_VERSION baseline guard; added the 1.0.4 baseline (delta = `sparkx_i7` only);
  6-case self-test. Gate 2: republished aries-only overlay `2026061401` (hash recomputed,
  Node↔Swift parity confirmed — independently matched the spec-reviewer's pre-computed hash).
  Gate 3: Swift-parity sim vs the real v1.0.4 catalog + full regression sanity (all green).
  Gate 4: runbook Phase 4b overlay→bundled graduation rule + Phase 5 checkbox.
- Gate 5 (owner-approved): pushed web, **verified live** (`curl` → `2026061401`, `[aries]`),
  corrected the stale "Aries SHIPPED" ROADMAP truth, filed the deferred Swift item, released
  the commit-boundary hold.
- Two reviewer findings I **rejected after verification**: the spec-reviewer's "prior overlay
  was 2026051201" (git `2284207` proved it was `2026051202`); the plan-reviewer's "deploy is
  Pages" (`wrangler.toml` proved Workers+Assets). Verify-before-mutate prevented "fixing"
  correct values.

## Files touched (Modified / Untracked)

Web (`3dprintassistant`):
- Modified: `scripts/validate-ios-printer-overlay.js`, `catalog/ios-bundled-catalog-baselines.json`, `catalog/ios-printer-overlay-v1.json`, `docs/runbooks/printer-addition-protocol.md`, `docs/planning/ROADMAP.md`.
- Untracked → committed: `scripts/validate-ios-printer-overlay.test.js`, `docs/superpowers/specs/2026-06-14-ios-overlay-aries-collision-fix-design.md`, `docs/superpowers/plans/2026-06-14-ios-overlay-aries-collision-fix.md`, this log + INDEX.

ai-om (parent `claude-projects`): new finding `docs/findings/2026-06-14-overlay-published-live-not-delivered.md` + INDEX; calibration row in `docs/agents/lesson-spotter-calibration.md`.

iOS (`3dprintassistant-ios`): **untouched** — this fix is web-only (overlay delivery). The 3 unpushed iOS commits + push gate are unchanged.

## Commits (web `3dprintassistant`, pushed `e611cc9..c50ae7c`)

- `85f1e3f` docs: spec + plan
- `4505491` fix(overlay-validator): union-of-baselines + 1.0.4 baseline + self-test
- `053837c` fix(overlay): drop sparkx_i7, aries-only `content_version=2026061401`
- `3a1c4a5` docs(runbook): Phase 4b overlay→bundled graduation rule
- `c50ae7c` docs(roadmap): correct Aries delivery truth + file follow-up
- (wrap commit for this log + INDEX to follow)

## Open questions / Follow-up

- **Finding (K4):** `2026-06-14-overlay-published-live-not-delivered` — published/served ≠
  delivered/accepted; delivery claims for overlays/remote-config need consumer-acceptance
  evidence, not just artifact liveness. `mitigated`.
- **2nd lesson (not re-filed):** the impl plan I authored was blind to the validator's
  test-harness feasibility (no `module.exports`, hardcoded paths) — the plan sub-agent review
  caught it (NO-GO → added Gate 1 step 0 refactor). Recurrence of
  `ai-operating-model/docs/findings/2026-05-16-writing-plans-self-review-blind-to-state`;
  the gated plan-review is the working mitigation.
- **md-hygiene:** `3dprintassistant/CLAUDE.md:63` and `docs/3dpa-context.md` describe hosting
  as "Cloudflare Pages"; it is actually Workers + Assets (`wrangler.toml`: `main="worker.js"`,
  no `pages_build_output_dir`). Proposed fix: correct both to "Cloudflare Workers + Assets
  (git-connected, auto-deploys from `main`)". **Owner decision — not auto-edited.**
- **md-hygiene:** CLAUDE.md↔AGENTS.md byte-identical; no untracked stray .md; no secrets;
  findings INDEX parity restored (new finding linked).
- **Deferred (needs iOS binary):** drop the all-or-nothing Swift disjoint guard so a colliding
  overlay entry is skipped (via `mergedArray` override-by-id) instead of dropping the whole
  overlay; add XCTest. Filed under ROADMAP Deferred/Parked (P2). Spec Part C.
- **verify-before-mutate summary (Trigger A):** `3 flags (3 resolved, 0 ignored), 0
  destructive-core, 69 unclassified`. All three were net-new file Writes (spec, plan, test),
  each verified inline as false positives (new untracked files; nothing clobbered):
  - [resolved] Write `docs/superpowers/specs/2026-06-14-ios-overlay-aries-collision-fix-design.md`
  - [resolved] Write `docs/superpowers/plans/2026-06-14-ios-overlay-aries-collision-fix.md`
  - [resolved] Write `scripts/validate-ios-printer-overlay.test.js`
- **Lesson/finding sweep:** lesson-spotter compact, 2 candidates (1 accepted → K4 finding,
  1 noted as recurrence); 1 K4 captured; no K1/K3. Calibration row added.
- **MCP:** none in scope this session (the fix uses the Cloudflare deploy path + curl, no MCP).

## Next session

The locked entry returns to the **pre-empted real-Discord-backlog seeding** (this debug
interrupted it): seed the real missing-printer backlog into `PRINTER_INTAKE` KV (`--remote`),
run the Scout, process candidates via the Printer Addition Assistant + the patched protocol.
Aries is now actually delivered to v1.0.4 (overlay `2026061401`, verified live). Optional:
the deferred Swift disjoint-guard hardening (next iOS binary) + the Pages→Workers doc fix.
