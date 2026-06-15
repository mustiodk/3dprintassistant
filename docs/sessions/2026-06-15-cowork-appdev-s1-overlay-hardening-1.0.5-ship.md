# 2026-06-15 — Cowork (appdev): S1 prefill fix + overlay-collision hardening → v1.0.5 on TestFlight

## Durable context

- **v1.0.5 is on TestFlight** (build run [27569280416](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/27569280416), conclusion **success**, ~4m21s). It carries **S1** (iOS contextual-feedback prefill fix) + **Part C** (overlay disjoint-guard hardening) + the `MARKETING_VERSION` bump, on top of the 4 already-local Aries/Mega-X bundled-data commits. iOS `origin/main` = `518f781`. **Pending App Store Connect processing** before it's installable; **on-device S1 acceptance is still owner-side and outstanding** — committed/built/uploaded ≠ accepted.
- **This mac-mini is now a full iOS build/test machine.** Installed **Xcode 26.5** (was CommandLineTools-only) + the **iOS 26.5 simulator**, and created **`Config.xcconfig`** from the gitignored template (`Config.xcconfig.template`; empty SENTRY_DSN/webhook/HMAC are fine for tests). Consequence: **local XCTest runs here now** — the "no full Xcode on this Mac" premise behind the data-only XCTest waiver no longer holds on the mac-mini. Future iOS data/engine changes can and should run real XCTest locally (`xcodebuild test -scheme 3DPrintAssistant -destination 'platform=iOS Simulator,name=iPhone 17' CODE_SIGNING_ALLOWED=NO`).
- **S1 root cause + fix (verified):** every contextual entry point used `.sheet(isPresented: $bool)` whose closure read a *separate* `@State FeedbackPrefill?` → SwiftUI captured the sheet content before the prefill write was observed → the sheet always opened on General. Fix = migrate all 8 sites/6 screens to `.sheet(item:)` + `FeedbackPrefill: Identifiable` (fresh per-instance `UUID`) + `FeedbackViewModel.init(prefill:)` (applies at construction → kills the first-frame flash; `onAppear` keeps analytics/review-prompt, now reading the correct category) + the 2 general buttons pass explicit `.generalFeedback`. **Reusable SwiftUI lesson: data-carrying sheets use `.sheet(item:)`, never `.sheet(isPresented:)` + a separate optional.**
- **Part C (overlay hardening) is the recurrence fix, NOT the live Aries fix.** Dropped both all-or-nothing `isDisjoint` guards in `PrinterCatalogProvider.validatePayload`; `mergedArray` already overrides-by-id, so a colliding overlay entry replaces its bundled twin and non-colliding entries still merge — instead of the whole overlay being dropped. This de-risks the 1.0.5 graduation (1.0.5 bundles Aries+Mega-X while the live overlay still carries them). Aries already reached v1.0.4 users via the Part A overlay republish (`2026061401`, verified live 2026-06-14); Part C only affects 1.0.5+. Safety boundary preserved: an override still passes the HTTPS first-party fetch + `payload_sha256` + `min_app_version` + per-entry `sanitizePrinter`/`sanitizeBrand`, so it can only be well-formed-in-range.
- **Verification was real, not asserted.** Full Xcode run (iPhone 17 / iOS 26.5): **112 unit + 2 UITest, 0 failures**, including S1's genuine RED→GREEN (`testViewModelInitAppliesPrefill` + the UITest) and Part C's override-merge + whole-entry tests. Two non-defect detours: (1) a first full-suite run falsely printed "exit 0" because a trailing `echo` masked the `| tee` pipe exit, while the log said `** TEST FAILED **` on a missing `Config.xcconfig` — caught by reading the result signal, not the exit code; (2) a later run hit a transient sim-launch flake ("Busy / Application failed preflight checks") affecting BOTH UITests incl. the pre-existing `testCaptureAllScreens` — `simctl shutdown all` + re-run cleared it.

## What happened / Actions

- Cold start (3dpa); owner picked **S1** from the QA-green S1–S5 set. Implemented per its gated plan: Gate 0 re-ground (6 presenters / 6 `FeedbackView(` / exactly 2 nil-sites — exact, zero line drift) → Gates A–E → grep proofs (0 `showFeedback`, 6 `.sheet(item:)`) → hostile sub-agent review **GO** → commit `ae03510` (local-only, push-gated).
- Owner asked what the machine needs to test on device → diagnosed CommandLineTools-only → owner installed Xcode 26.5 + iOS 26.5 sim → I created `Config.xcconfig` from the template → ran S1's real gate green (112 unit + 2 UITest).
- Owner asked whether S2–S5 could ride in 1.0.5 → confirmed **from the specs** that none are iOS-binary (S2 web Worker, S3 script+config, S4 automation, S5 process); the one iOS-binary 1.0.5 candidate was the **overlay-collision hardening** (spec Part C). Owner chose **1.0.5 = S1 + Part C** and invoked **work protocol**.
- Work protocol **Full lane** (release-gated iOS safety logic). Part C via TDD: rewrote the 2 reject-on-collision tests to assert override-merge (genuine RED = `duplicateIds` thrown → GREEN), dropped both disjoint guards + the orphaned `knownPrinterIds` helper / `bundledPrinterIds`+`remotePrinterIds` locals; hostile review **GO-WITH-NITS** → strengthened the printer test with a whole-entry `max_speed` assertion → commit `af4bbe0`. Version bump 1.0.4→1.0.5 hand-edited (`project.yml` + both pbxproj configs, no xcodegen-regen — CI builds the committed `.xcodeproj` and a newer xcodegen could churn it pre-release) → commit `518f781`.
- Owner "go" → pushed 7 commits `a2c1bc3..518f781` → dispatched TestFlight (run 27569280416) → watched to **success**.

## Files touched

iOS (`3dprintassistant-ios`, pushed `a2c1bc3..518f781`):
- `ae03510` (S1): `FeedbackViewModel.swift`, `FeedbackView.swift`, `Configurator/{Printer,Brand,Material,Nozzle}PickerView.swift`, `Home/HomeView.swift`, `Output/OutputView.swift`, `FeedbackTests.swift`, `ScreenCaptureUITests.swift` (10 files).
- `af4bbe0` (Part C): `Services/PrinterCatalogProvider.swift`, `PrinterCatalogProviderTests.swift`.
- `518f781` (bump): `project.yml`, `3DPrintAssistant.xcodeproj/project.pbxproj`.
- Local-only, gitignored: `Config.xcconfig` (created from template — local dev/test only).

Web (`3dprintassistant`, this wrap): this session log + `docs/sessions/INDEX.md` + `docs/planning/ROADMAP.md` + `docs/sessions/NEXT-SESSION.md` + Part C status flip in `docs/superpowers/specs/2026-06-14-ios-overlay-aries-collision-fix-design.md`.

Parent: `ai-operating-model/docs/agents/lesson-spotter-calibration.md` row; memory entries.

## Commits

- iOS: `ae03510` (S1) · `af4bbe0` (Part C) · `518f781` (1.0.5 bump) — all pushed to `origin/main`.
- Web + parent: this wrap's doc/calibration/memory commits.

## Open questions / Follow-up

- **[owner] On-device S1 acceptance** once TestFlight processes — all 8 entry points (4 missing-X → their category; 2 bug CTAs carry their contextNote; 2 general → general), no first-frame flash, and the Output export-alert→sheet path. This is the real S1 gate; built+uploaded ≠ accepted.
- **[follow-up, web] Overlay graduation (Phase 4b):** republish `catalog/ios-printer-overlay-v1.json` **without** Aries/Mega-X now they're bundled in 1.0.5, and add a `1.0.5` baseline to `catalog/ios-bundled-catalog-baselines.json`. Part C makes a missed graduation non-fatal, but it's the clean step — do after 1.0.5 is accepted.
- **md-hygiene: the carried "Cloudflare Pages" finding is STALE/resolved** — verified `CLAUDE.md:63` + `docs/3dpa-context.md:129` already say "Workers + Assets (not Cloudflare Pages…)"; the only occurrence is inside that correction. Stop carrying it forward.
- **Lesson/findings sweep:** lesson-spotter compact → **2 accepted → memory** (`.sheet(item:)` data-carrying-sheet pattern, now verified; mac-mini full-Xcode capability). **No K1** (both hostile reviews agreed GO/GO-WITH-NITS), **no K3** (work-protocol/TDD/verification skills behaved as expected), **no K4** (no tool overruled the controller — the sim red was environmental and correctly diagnosed). Process notes (not formal findings): a trailing `echo` masked a `| tee` pipe exit → verify the *result signal* (`TEST SUCCEEDED`/counts), not the exit code; rapid back-to-back `xcodebuild test` runs can wedge the sim → `simctl shutdown all` + re-run. Calibration row appended.
- **verify-before-mutate summary (Trigger A):** `0 flags (0 resolved, 0 ignored), 0 destructive-core, 8 unclassified, 2 generated-write` — no evidence-gap flags; the 2 generated-writes were `/tmp` commit-message files.
- **MCP:** none in scope (xcodebuild / gh / git / brew / sub-agents only).
- **S2–S5** remain QA-green specs+plans, unexecuted — S1 was the only iOS topic; S2/S3 are independent web/script work, S4 needs S3, S5 needs S4.

## Next session

See [`NEXT-SESSION.md`](NEXT-SESSION.md). Locked entry = **owner's on-device S1 acceptance verdict** (GO → 1.0.5 to App Store review; regression → focused fix). Open work in parallel: the **overlay Phase-4b graduation** (web) and the **S2/S3 pipeline topics**.
