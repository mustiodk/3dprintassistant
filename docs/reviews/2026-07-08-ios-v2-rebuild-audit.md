# 2026-07-08 — iOS v2 rebuild audit (web + iOS complete review)

> **Purpose:** ground-truth audit of both 3dpa codebases as the "understand" step for the iOS v2 rebuild ("improved copy of 3dpa-ios"). Produced by two parallel deep-read agents + controller verification of every load-bearing claim. Feeds `docs/superpowers/specs/2026-07-08-ios-v2-rebuild-design.md` and `docs/superpowers/plans/2026-07-08-ios-v2-rebuild-plan.md`.
> **Baselines audited:** web `main` @ post-`6a828c2` (W3 Mine-tier merged + live), iOS `main` @ `51356de` (v1.0.7 on TestFlight).

## 1. Verified ground truth (controller-checked, not agent-asserted)

- Web data: **74 printers / 14 brands / 19 materials / 9 nozzles**; iOS bundles **71 printers / 13 brands** (v1.0.5-era baseline; remote overlay `content_version=2026070401` delivers the delta — by design, not drift).
- `engine.js`, `materials.json`, `nozzles.json`: **byte-identical** web↔iOS at audit time. `printers.json` differs (expected, overlay model).
- Locales: EN 289 keys = DA 289 keys (parity held).
- Web **profile comparison** (lock A / compare B) exists (`comparisonProfile` state at `app.js:85`; `compareLockBtn` wiring at `app.js:326`/`:1434`) — absent on iOS.
- Environment ids are `normal / cold / vcold / humid` (an agent report said "cold/normal/hot" — wrong; also note `3dpa-context.md:91` still shows stale `room_temp`, a known doc-drift item).
- iOS test suite: **135 XCTests** green at v1.0.7 (54 EngineService, 25 PrinterCatalogProvider, 11 WorkshopStore, 13 ReviewPrompt, 6 AppStatePersistence, 11 Feedback, 7+4 OutputViewModel/Integration, 4 Analytics) + ScreenCapture UITest.
- iOS app: **~7.6k Swift LOC** app + **~3.8k LOC** tests, iOS 17.0 target, Swift 5.9, `@Observable`, XcodeGen, bundle id `dk.mragile.3DPrintAssistant`, module `PrintAssistant`, Sentry optional, TestFlight via manual-dispatch `testflight.yml` + fastlane.

## 2. iOS architecture as-is (what a rebuild inherits or replaces)

**Sound and worth carrying forward (verbatim or light refactor):**
- **Serial-queue JSCore bridge** concept (`EngineService`): dedicated `DispatchQueue`, exception capture via `ExceptionStore`, fetch/localStorage/console polyfills, engine-ready polling. Battle-tested by 54 tests.
- **PrinterCatalogProvider** (568 L): offline-first bundled catalog + validated remote overlay with override-merge (Part-C-aware since v1.0.5), `NSLock`-guarded, 25 tests.
- **ReviewPromptService** (248 L): DI-injectable, novelty-vs-eligibility separation (memory `feedback_novelty_vs_eligibility_separation`), 13 tests.
- **AnalyticsService** (actor): privacy-first (no IDs/free-text), HMAC-signed. **FeedbackService**: HMAC → Worker (CRITICAL-001 fix), Discord fallback, contextual prefill via `.sheet(item:)` (S1 fix).
- **WorkshopStore** (382 L): byte-compatible envelope emitter (ordered, 2-space), op-union tuning merge, `acceptedFor(printer:material:)` — pinned by fixture generated from real web module.
- **AppStateWebCodec / AppStatePersistence**: web-verbatim field keys, unknown-id degradation.
- Build/release chain: XcodeGen `project.yml`, `Config.xcconfig` secrets template, fastlane build-number stamping, ASC API key CI.

**Weak points (the rebuild's architecture targets):**
- **5 god files**: `EngineService.swift` 1,046 L (JSContext lifecycle + ~30 API methods + marshaling in one file), `PrinterCatalogProvider` 568 L, `SharedComponents.swift` 492 L (9 components), `GoalsView.swift` 487 L, `OutputView.swift` 440 L.
- **`AppState` is `@Observable` without `@MainActor`** — read/written from async contexts; latent thread-safety gap.
- **Engine init uses `Thread.sleep` polling** (up to 500 ms, 10 ms steps) instead of a continuation-based readiness signal (known IR-5 note).
- One `try!` (`EngineService.swift:942` `jsonString()`), dead `SlicerLayout.swift` (superseded by HIGH-006 engine-provided tabs), inconsistent error strategy (throwing vs silent) across services, manual JS string interpolation (`jsonLit()`) fragile to API growth.
- **Views have zero unit tests** (~2.1k LOC of view code covered only by screenshot UITests); no bundled-data schema validation at build time (overlay is validated, bundle is not).
- **Accessibility ~absent**: no Dynamic Type scaling (fixed font sizes), ~10 `accessibilityLabel`s, no reduced-motion handling. **iPad**: `horizontalSizeClass` read but unused — single-column everywhere.
- **i18n**: `Strings.swift` hardcoded English ("swap for NSLocalizedString later"); DA exists only web-side.

## 3. Feature parity matrix (web = master, verified)

| Feature | Web | iOS v1.0.7 |
|---|---|---|
| Configurator (printer/material/nozzle/goals, advanced filters) | ✅ | ✅ (5-step wizard w/ step progress) |
| Simple/Advanced output modes | ✅ | ✅ |
| Safe/Tuned/Mine profileMode | ✅ | ✅ (Mine segment; consumes imported tuning only) |
| Provenance ⓘ (Advanced) | ✅ | ✅ |
| Warnings + checklist | ✅ | ✅ (banner + sheets) |
| Slicer-organized tabs (BS/Prusa/Orca) | ✅ | ✅ (engine-provided since HIGH-006) |
| Export: Bambu Studio JSON (passthrough `_slicer_value`, Beta) | ✅ | ✅ (ActivityView; engine byte-identical) |
| Export: text | ✅ | ✅ |
| Workshop: save/load/rename/delete + JSON backup | ✅ | ✅ (byte-compat) |
| **Print journal (worked/failed + symptoms + note)** | ✅ | ❌ (storage passes through; no UI) |
| **Troubleshooter (10 symptoms × ranked causes)** | ✅ | ❌ (data bundled; no surface) |
| **Tuning Suggestions + "My tuning" accept/revert (harvest)** | ✅ | ❌ (Mine works only via imported web backup) |
| **Profile comparison (lock A vs B)** | ✅ | ❌ |
| **Print-time estimator** (`calcPrintTime`) | ✅ | ❌ |
| **Purge/flush calculator** (`calcPurgeVolumes`) | ✅ | ❌ |
| **Share URLs** (codec `encodeForShare`, mine→safe) | ✅ | ❌ (NO URL codec in Swift at all — `AppStateWebCodec` maps dictionaries only; corrected by design review HIGH-5) |
| Session persistence | ✅ (`3dpa_state_v1`) | ✅ (Application Support snapshot) |
| **i18n EN+DA** | ✅ (289/289) | ❌ (EN hardcoded) |
| **Light theme** | ✅ | ❌ (forced `.dark` — owner pref is dark-primary, so LOW priority) |
| Feedback (contextual prefill) → Worker → Discord | ✅ | ✅ |
| Analytics (privacy-first) | ✅ (5 events incl. `troubleshoot_used`, `export_clicked`) | ✅ (3 events — no troubleshooter/export events wired) |
| App Store review prompt | n/a | ✅ (iOS-only) |
| Remote printer overlay | n/a (publisher) | ✅ (iOS-only consumer) |
| Landing pages (IMPL-042 Phase C / S1) | ❌ not built | n/a |

**The single biggest product gap:** the journal → harvest → suggestion → accept → **Mine** learns-loop is web-only. iOS users cannot generate tuning natively; the v1.0.7 Mine segment only lights up after importing a web Workshop backup. A rebuild that adds journal + troubleshooter + harvest UI closes the loop and is already anticipated by ROADMAP ("iOS journal/harvest train", W3-T7 trigger).

## 4. Cross-platform contracts a rebuild MUST honor (pinned by tests/fixtures)

1. **Byte-identical mirror**: `engine.js` + `data/*.json` (printers via baseline+overlay model). Never re-implement engine logic in Swift.
2. **State codec FIELDS** (19 fields, `state-codec.js:23–43` ↔ `AppStateWebCodec.swift`): `p m n uc sq st sp e su c u pm x se b bp et fc i` — round-trip + unknown-id degradation pinned both sides.
3. **Workshop envelope v1**: `{v:1, profiles:[{id,name,state,notes,created,updated,journal[]}], tuning:{...op-log...}, userMaterials:{...}}` — iOS ordered emitter must stay byte-identical to web `JSON.stringify(env,null,2)` (fixture-pinned; key-preservation for future additive sections shipped in W3).
4. **Tuning op-log semantics**: ops with unique `opId`, cumulative value derived+clamped, import = op-union (fork-lossless, idempotent), single atomic write; `Engine.setPersonalTuning` payload + `pairKey` guard.
5. **Remote overlay payload**: `content_version` (YYYYMMDDXX), `min_app_version`, `payload_sha256`, additive brands/printers, override-merge-by-id ≥1.0.5.
6. **Analytics payload shape** (no user/session/device ids, no free text) + event names; HMAC pattern shared with the Worker.
7. **Engine public API** (~35 exported functions, `engine.js:3908–3957`) — the full surface a v2 bridge wraps; typed against `getFilters`/`resolveProfile`/`getWarnings`/`getChecklist`/temps/filament/troubleshooter/purge/time/export/tuning/i18n groups.
8. **Verification harnesses**: web walkthrough-harness + validate-data + matrix-audit + engine-golden-snapshot (39 states) + codec/workshop/tuning Node tests; iOS XCTest mirrors. Any v2 must keep all of these green and keep the walkthrough-mirror convention.

## 5. Improvement opportunities (ranked synthesis)

**Product (close the loop):** P1 journal UI + troubleshooter surface + harvest/suggestions ("My tuning") on iOS → native Mine. P2 share (iOS share-sheet URL via `encodeForShare` parity incl. mine→safe). P3 print-time estimator + purge calculator (engine functions ready). P4 profile comparison. P5 DA localization. P6 analytics parity (troubleshoot/export events).

**Architecture:** A1 split EngineService → `EngineCore` (JSContext lifecycle, continuation-based init, exception store) + typed `EngineAPI` facades per domain. A2 `@MainActor` AppState. A3 components folder (one file per component); decompose Goals/Output views into stage/section files. A4 uniform error strategy (typed throws at bridge; explicit best-effort documented elsewhere). A5 delete dead `SlicerLayout.swift`, remove `try!`. A6 bundled-data schema validation in CI. A7 run `workshop-tuning.js` + `workshop-tuning-rules.js` in JSCore byte-identical (extends the no-Swift-reimplementation rule to the harvest layer — kills a whole drift class before it exists).

**UX (owner prefs: smooth, minimal, functional; spring-feel; stagger reveals; clear step progress):** U1 keep + refine the wizard step indicator. U2 systematic motion language (springs already pervasive — codify response/damping tokens; add stagger reveals on chip grids; respect Reduce Motion). U3 Dynamic Type + VoiceOver coverage as a build-time norm, not a retrofit. U4 iPad adaptive layout (currently dead code). U5 haptics on selection/accept. U6 dark-primary stays; light theme optional/deferred.

## 6. Risks a rebuild must manage

- **Parity regression** — mitigated by carrying all 135 XCTests as the floor + byte-compat fixtures + golden mirrors before any new feature lands.
- **App Store continuity** — same bundle id or existing users are orphaned; CI/signing/secrets already work in this repo (rebuilding them in a fresh repo is owner-cost + risk).
- **Long-running branch drift vs live iOS fixes** — the rebuild window must define how hotfixes to v1.0.x interleave (plan handles this).
- **iOS push gate + TestFlight manual dispatch** — all release steps are owner-gated by standing rules.
- **Backup discipline** — weeks of local-only commits on one machine is a real loss risk; branch-backup push is an owner decision to make explicitly (push gate governs `main`; precedent: web trains pushed branches as backup).
