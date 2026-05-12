# 2026-05-12 — Cowork (appdev): SPARKX i7 overlay hotfix

## Durable context

- The i7 missing-printer request was shipped to current iOS users by remote printer overlay, not by a new App Store binary.
- Correct taxonomy after owner correction: internal printer id `sparkx_i7`, display name `i7`, manufacturer `creality`, section/group `i Series`. It must appear under **Creality -> i Series -> i7**, with no standalone `sparkx` brand.
- Source facts came only from owner-provided vault clippings:
  - `/Users/mragile.io/Documents/Claude/Obsidian Vault/Clippings/Introduction to i7.md`
  - `/Users/mragile.io/Documents/Claude/Obsidian Vault/Clippings/SPARKX i7 FAQ.md`
  - `/Users/mragile.io/Documents/Claude/Obsidian Vault/Clippings/SparkX i7 3D Printer – 500mms High-Speed AI 3D Printer.md`
- The iOS overlay validator now checks bundled-ID collisions against shipped iOS catalog baselines in `catalog/ios-bundled-catalog-baselines.json`, not against the current web `data/printers.json`. That lets web add a printer while iOS 1.0.3 receives it remotely.
- Live overlay `content_version=2026051202` publishes no new brand rows and one printer payload for `sparkx_i7` under `creality` / `i Series`.
- iOS `main` also contains the future bundled data correction, but no TestFlight or App Store build was dispatched from this hotfix path.

## What happened

Started with an owner request to add user-requested printer SPARKX i7 to web and iOS using only the provided clippings. Initial implementation mistakenly modeled `sparkx` as a new brand. Owner caught that in-app: the printer should be a new printer under Creality.

Corrected the web catalog, iOS bundled catalog, and live iOS remote overlay so the printer is under Creality. Kept the stable internal id `sparkx_i7` because it was already the shipped overlay identifier and the user-facing placement comes from `manufacturer` + `series_group`.

Also fixed an operational issue in the overlay validator: because it compared overlay IDs against the current web catalog, it would reject exactly the kind of same-day web + remote-iOS printer addition this architecture is supposed to support. The validator now uses the shipped bundled catalog baseline for the target app version.

## Changes

- Web data: added `sparkx_i7` to `data/printers.json`, then corrected `manufacturer` to `creality` and `series_group` to `i Series`; removed the accidental standalone `sparkx` brand.
- iOS remote overlay: updated `catalog/ios-printer-overlay-v1.json` to `content_version=2026051202`, `payload.brands=[]`, and printer payload under `creality` / `i Series`.
- Web validation: added `catalog/ios-bundled-catalog-baselines.json`; updated `scripts/validate-ios-printer-overlay.js`; documented the baseline rule in `docs/specs/ios-remote-printer-catalog.md`.
- Walkthrough coverage: updated the new combo label to `Creality i7 / SPARKX + 0.4 hardened + PLA-CF + Standard/Balanced`.
- iOS bundled catalog: mirrored the corrected printer entry into `3DPrintAssistant/Data/printers.json` for the future 1.0.4 binary.
- Planning: added execution plan `docs/superpowers/plans/2026-05-12-sparkx-i7-ios-overlay.md`, then corrected it to say existing Creality brand / i Series.

## Commits

Web:

- `d21e452` — data: add SPARKX i7 printer
- `f9a91f1` — fix: validate iOS overlay against shipped catalog
- `0a4cc2f` — data: publish SPARKX i7 iOS overlay
- `6e9270e` — docs: clarify iOS overlay validation baseline
- `2284207` — fix: place i7 under Creality catalog

iOS:

- `c8cbf97` — data: add SPARKX i7 printer
- `eeb2915` — fix: place i7 under Creality catalog

Both repos were pushed to `origin/main`.

## Verification

- RED taxonomy check before the correction confirmed the bug: standalone `sparkx` brand existed in web + overlay, and `sparkx_i7.manufacturer` was `sparkx`.
- GREEN taxonomy check after correction: `sparkx_i7 is under Creality / i Series in web and overlay`.
- Picker simulation: after `Engine.init()`, `Engine.getPrintersByBrand('creality')` includes group `i Series` with `{id:"sparkx_i7", name:"i7", desc:"Open"}`; no `sparkx` brand exists.
- `node scripts/validate-data.js` passed.
- `node scripts/validate-ios-printer-overlay.js` passed with `0 brands, 1 printers`.
- `node scripts/walkthrough-harness.js` passed; combo 11 clean.
- `node scripts/profile-matrix-audit.js` passed: 55/55 curated, 47,196 broad configs, 0 failures.
- iOS `xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant -destination 'platform=iOS Simulator,name=iPhone 17 Pro' CODE_SIGNING_ALLOWED=NO` passed: 96 unit tests + 1 UI test, 0 failures.
- Live overlay check returned `content_version=2026051202`, `hash_ok=true`, `brands=[]`, and printer `sparkx_i7` under `creality` / `i Series`.

## Md-hygiene findings

- Dirty tree: both web and iOS were clean before wrap-up docs edits.
- Root-level markdown stubs: none needing action; only canonical top-level project docs were present.
- Untracked docs/specs/research: none in web or iOS before wrap-up docs edits.
- Secrets: no secret files found; strict token scan only hit protocol example text in `Projects/CLAUDE.md` / `Projects/AGENTS.md`.
- Protocol drift: `Projects/CLAUDE.md` and `Projects/AGENTS.md` are byte-identical.
- Duplicate specs/plans: no exact duplicate; `docs/specs/ios-remote-printer-catalog.md` remains canonical, and the SPARKX/i7 file is an execution plan.
- Stale roadmap live status found: ROADMAP still said v1.0.3 was in App Review. This close updates it to v1.0.3 live and notes the i7 overlay hotfix.

## Risks / follow-up

- Current iOS users may need one online launch to fetch overlay `2026051202`, then a relaunch for it to become active because the catalog provider applies remote updates on next launch.
- iOS `main` was pushed with the bundled catalog correction, but no iOS build was uploaded. Future remote-only printer hotfixes should be explicit about whether the iOS repo needs a pushed data mirror before the next planned binary.
- Locked next step remains v1.0.4 config-impact prep: create `docs/reviews/2026-05-11-config-impact-qa/merged.md`, unless the owner first asks to verify in-app i7 placement again.
