# NEXT-SESSION — 3dpa

**Purpose:** kickoff prompt for the next 3dpa session.

**Last updated:** 2026-06-20 (research-capable screening shipped + LIVE; first autonomous printer-add succeeded; **overlay Option 2 deferred = the locked next task**). The screening pipeline now captures printer requests for uncatalogued/brand-less brands and routes the brand-less ones to `needs-research(resolve-brand)`. An autonomous Printer Addition Assistant run added **Snapmaker 2.0 A350** (new brand) + **FlashForge Creator 5 Pro** — both **LIVE on web** + iOS mirror committed local (push gate). The ONLY thing deferred (owner: no risk at session-end) is the iOS overlay fast-path, which needs a careful collision-validator change.

**Locked next = the overlay Option 2 fix** (deferred from 2026-06-20 specifically to get a fresh, full-discipline session). Runtime already verified safe; only the validator code change + republish remain.

---

>>> START >>>

Read in order:
1. `Projects/CLAUDE.md` (or `AGENTS.md`) — top-level rules.
2. `Projects/3dprintassistant/CLAUDE.md` + `docs/3dpa-context.md` — architecture + engine + standing rules.
3. `docs/planning/ROADMAP.md` — banner + Active Work Queue.
4. `docs/sessions/INDEX.md` + the last 3 session logs, especially `2026-06-20-cowork-appdev-research-capable-screening.md` (this work + the overlay analysis).
5. `docs/sessions/NEXT-SESSION.md` (this file).
6. Task source: `scripts/validate-ios-printer-overlay.js` (the collision-checker) + `catalog/ios-printer-overlay-v1.json` + `catalog/ios-bundled-catalog-baselines.json` + the runbook `docs/runbooks/printer-addition-protocol.md` (Phase 4b) + finding `ai-operating-model/docs/findings/2026-06-14-overlay-published-live-not-delivered.md`.

Today's task — **overlay Option 2 (make it Part-C-aware, then republish for the 2 new printers):**

- **Why:** `aries`+`mega_x` are now bundled in iOS v1.0.5 but delivered to the v1.0.4 App-Store majority via the overlay; backfilling the `1.0.5` baseline makes the union-collision validator reject them → a v1.0.4 regression if dropped. v1.0.5+ override-merge (Part C), so the validator is over-strict.
- **Do (TDD + sub-agent/Codex review + owner go before the live push):**
  1. Change `collectBaselineUnion` (validate-ios-printer-overlay.js) to collide overlay ids only against baselines in `[min_app_version, 1.0.5)` (versions WITHOUT Part C override-merge); add a named `FIRST_OVERRIDE_MERGE_VERSION = "1.0.5"` constant + tests (the validator is unit-tested — `validateOverlay` is pure/injectable).
  2. Add the `1.0.5` bundled-catalog baseline to `ios-bundled-catalog-baselines.json` (snapshot = iOS printers.json @ commit `518f781` — the v1.0.5 build, which has aries/mega_x but NOT snapmaker/creator).
  3. Update `ios-printer-overlay-v1.json`: keep aries/mega_x/voxelab, ADD `snapmaker` brand + `snapmaker_2_a350` + `creator_5_pro` (copy the rows from `data/printers.json`), bump `content_version` (YYYYMMDDXX), recompute `payload_sha256` (`node -e` with the validator's `stableStringify`+`sha256`).
  4. `node scripts/validate-ios-printer-overlay.js` GREEN → owner go → push web → curl-verify the live overlay `content_version` (committed≠delivered).
- **Runtime safety is already verified:** v1.0.3/1.0.4 bundles contain NONE of aries/mega_x/snapmaker/creator/voxelab (so v1.0.4 accepts the overlay without collision); v1.0.5 bundles aries/mega_x and override-merges.

Scope / gating:
- This is the historically-buggy overlay/collision area — full TDD + a different-model review before the live push. No rushing.
- iOS push gate unchanged (the iOS data mirror is already local on iOS `main`, 2 commits; the overlay is the web-served delivery path, not a binary).
- One finding = one commit; web auto-deploys from `main`.

Standing rules:
- ROADMAP is truth; read it before status claims.
- Published ≠ delivered: curl-verify the live overlay after push.
- Develop the validator change under a `claude-sync.sh hold`; release after the deliberate commit.

<<< END <<<

## Maintenance Note

Regenerated on Trigger A / Trigger B / explicit owner ask only. Locked item = **overlay Option 2** (validator Part-C-aware + republish snapmaker_2_a350/creator_5_pro for existing iOS users). Both new printers are already live on web + iOS-mirror-local; the overlay is the optional faster iOS path.
