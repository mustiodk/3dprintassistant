# 2026-06-20 — Cowork (appdev): overlay Option 2 — Part-C-aware validator + republish

## Durable context

- **Overlay validator is now Part-C-aware, and the overlay carries 4 printers again.** The iOS runtime rejects the WHOLE overlay on any overlay-vs-bundled id collision for builds **< 1.0.5**, but builds **>= 1.0.5 override-merge by id** (Part C, iOS `af4bbe0`). So `collectBaselineUnion` now collides overlay ids only against baselines in `[min_app_version, FIRST_OVERRIDE_MERGE_VERSION="1.0.5")`. This is what lets the overlay KEEP aries/mega_x (graduated into the v1.0.5 bundle) while still delivering them to the v1.0.4 App-Store majority that doesn't bundle them. The named constant lives in `scripts/validate-ios-printer-overlay.js` and is the same boundary the runbook reasons about — protocol + gate now drift together or not at all.
- **Split collision-union from known-brand-union (Codex catch).** `brandUnion` previously did double duty: "ids that fatally collide" AND "known manufacturer ids." With the Part-C exclusion, a future overlay raising `min_app_version` to/past 1.0.5 would have an empty/partial collision union and could **falsely reject** a printer whose brand is bundled only at >= 1.0.5. New `collectKnownBrandIds` spans ALL baselines >= min for manufacturer resolution; collision stays pre-1.0.5. Not triggerable at today's `min_app_version=1.0.3`, but a real latent footgun in a historically-buggy file — fixed now.
- **Baseline is ground-truth, overlay rows are byte-identical to web.** The 1.0.5 baseline in `catalog/ios-bundled-catalog-baselines.json` is a programmatic snapshot of iOS `printers.json @ 518f781` (the v1.0.5 MARKETING_VERSION-bump commit): 13 brands, 71 printers, = 1.0.4 + {aries, mega_x} + {voxelab brand}, no removals. The snapmaker/creator overlay rows were copied directly from `data/printers.json` (verified `overlay==web`), so override-merge on 1.0.5 is a no-op-equivalent.
- **Why Phase 4b had to change.** The 2026-06-14 runbook rule ("always remove graduated printers from the overlay") predates Part C and, followed literally, would have dropped aries/mega_x for v1.0.4 users. Reconciled to the boundary: remove only if bundled in a *still-delivered pre-1.0.5* build (the sparkx_i7 case); otherwise keep. Finding: [`2026-06-20-runbook-rule-stale-after-runtime-behavior-change`](../../../ai-operating-model/docs/findings/2026-06-20-runbook-rule-stale-after-runtime-behavior-change.md).
- **Live-verified, not just published.** Live overlay `content_version=2026062001` with `payload_sha256=55095482…` — matches the committed hash, so it's actually serving (curl, after Cloudflare auto-deploy lag of ~2 polls).

## What happened / Actions

- Cold start (3dpa, overlay Option 2 = the locked next task). GitHub-first gate clean for the resume target; verified the premise against ground truth (iOS `518f781` bundles aries/mega_x but not snapmaker/creator) before mutating.
- Observed current RED: validator already failed (`MARKETING_VERSION=1.0.5`, no 1.0.5 baseline).
- TDD under a `claude-sync hold`: wrote Part-C tests → genuine RED → patched `collectBaselineUnion` (+ `FIRST_OVERRIDE_MERGE_VERSION`) → green.
- Backfilled the 1.0.5 baseline (ground-truth) + republished the overlay (snapmaker brand + snapmaker_2_a350 + creator_5_pro; kept aries/mega_x/voxelab; content_version 2026061402→2026062001; recomputed hash via the validator's own `stableStringify`+`sha256`).
- Reconciled runbook Phase 4b to the override-merge boundary.
- Codex cross-model review of the implemented diff (bridge `--mode codex-only`): **GO**, no must-fix/should-fix. Applied its 2 optional items (split-union footgun + accurate error text), locked with 2 new tests.
- Owner go → released hold → 3 commits → pushed → curl-verified live (matches committed sha256).

## Files touched (web `main`, deployed)

- `scripts/validate-ios-printer-overlay.js` — `FIRST_OVERRIDE_MERGE_VERSION`, Part-C collision exclusion, `collectKnownBrandIds` split-union, accurate error text.
- `scripts/validate-ios-printer-overlay.test.js` — cases (f)/(g)/(h): Part-C boundary, Option-2 scenario, over-loosen guard, split-union. 13/13 green.
- `catalog/ios-bundled-catalog-baselines.json` — added 1.0.5 baseline (from iOS `518f781`).
- `catalog/ios-printer-overlay-v1.json` — content_version 2026062001 + snapmaker brand + 2 printers.
- `docs/runbooks/printer-addition-protocol.md` — Phase 4b + Phase 5 self-check bullet + forbids-list reconciled.
- `codex/overlay-option2-review/bridge-2026-06-20-235440-395786.md` — Codex review transcript (GO).
- ai-om (parent): `docs/findings/2026-06-20-runbook-rule-stale-after-runtime-behavior-change.md` + INDEX.

## Commits

- web `main` (pushed `c3afd27..e6b6945`, auto-deployed):
  - `72343dd` feat(overlay-validator): Part-C-aware collision union + 1.0.5 baseline
  - `5afe1b4` feat(overlay): republish 2026062001 — Snapmaker 2.0 A350 + Creator 5 Pro
  - `e6b6945` docs(runbook): reconcile Phase 4b with the Part-C override-merge boundary
- iOS `main`: untouched (its 2 mirror commits `aedaac7`/`e304843` stay local per the push gate).
- ai-om (parent): finding + INDEX = this wrap's commit (auto-sync).

## Open questions / Follow-up

- **Findings:** [`2026-06-20-runbook-rule-stale-after-runtime-behavior-change`](../../../ai-operating-model/docs/findings/2026-06-20-runbook-rule-stale-after-runtime-behavior-change.md) (K3, `mitigated-immediately`). Reinforces `feedback_cross_model_review_final_gate` (Codex caught the split-union latent footgun that TDD + self-review passed clean).
- **Still open from 2026-06-20 (research-capable-screening), not this session:** the 2 autonomous-run findings (`open`); the `functions/` not-asset-ignored spawned task `task_cb32967a`.
- **Carried follow-ups:** S5 autonomy ladder (unblocked, owner-gated); Scout findings 1+2 absorbed by S3/S2; v1.0.5 owner on-device S1 acceptance still pending.
- **md-hygiene:** protocol files identical; no stray tags; tree clean. verify-before-mutate: 0 flags / 0 unresolved.

## Next session

See [`NEXT-SESSION.md`](NEXT-SESSION.md). No locked overlay work remains — the queue's last locked item (overlay Option 2) is done + live. Open lanes: S5 autonomy ladder (owner-gated), v1.0.5 ASC acceptance monitoring, or owner-pick from the Active Work Queue.
