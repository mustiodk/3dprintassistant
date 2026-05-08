# Release readiness history — RB / BR / Phase 2.7b / DQ-1 + DQ-2 / PR-8

> Historical archive extracted from `docs/planning/ROADMAP.md` during the 2026-05 ROADMAP slimming pass.
> Live planning now lives in [`../ROADMAP.md`](../ROADMAP.md); this file preserves the pre-launch and post-launch release-readiness narrative.

Covers the 2026-04-08 → 2026-04-27 release readiness arc: original ChatGPT-review release blockers (RB-1…5), pre-release polish (BR-1…12), Phase 2.7b explanatory descriptions, the shipped DQ-1 + DQ-2 phases, and the PR-8 web retirement of the iOS Beta surface.

---

## RB — Release blockers ✅ 2026-04-08

> Architectural / safety issues that had to be fixed before any public release. Original derivation: ChatGPT code review #1–#5.

**Recommended implementation order at the time:** RB-3 first (isolated, ~20 min) → RB-1 (architectural, sets contract) → RB-2 (off-main-actor) → RB-4 + PR-3 together → RB-5 (tests against the corrected bridge). RB-6 (OutputView split) was moved to BR-6b — maintainability concern, not stability blocker.

### RB-1: Structured warning contract ✅ 2026-04-08
- [x] Engine: `getWarnings()` returns structured objects `{ id, text, detail, fix }` instead of HTML strings `[Web]`
- [x] iOS: rewrite warning parsing in `EngineService.swift` to consume structured data `[iOS]`
- [x] iOS: `WarningCard` already used the right struct shape — no UI changes needed `[iOS]`
- [x] Tests: 4 new warning-contract tests, 10/10 passing `[iOS]`

### RB-2: Move engine bridge off main actor ✅ 2026-04-08
- [x] iOS: `actor EngineService` — all JSCore work off main thread `[iOS]`
- [x] iOS: 6 call-site files updated with `await` (OutputView, GoalsView, ChecklistSheet, NozzlePickerView, tests) `[iOS]`

### RB-3: Sentry DSN out of source code ✅ 2026-04-08
- [x] iOS: DSN moved to `Config.xcconfig` (gitignored) → `Info.plist` `$(SENTRY_DSN)` → read at runtime `[iOS]`

### RB-4: Bridge error handling — no silent failures ✅ 2026-04-08
- [x] iOS: `ExceptionStore` captures JS exceptions from `evaluateScript` closures `[iOS]`
- [x] iOS: `evaluate(_:fn:)` helper — clears/checks exceptions on every bridge call, logs to Sentry + throws `EngineError.jsFailed` `[iOS]`
- [x] iOS: all bridge functions route through `evaluate()` `[iOS]`
- [ ] iOS: replace manual JSON parsing with `Codable` decoding in `EngineService` (deferred — exception handling solved the silent-failure problem without requiring Codable). → **Tracked in slim ROADMAP** Backlog under PR-3.

### RB-5: Expand bridge test coverage ✅ 2026-04-08
- [x] Tests: `getChecklist`, `getFilters`, `getCompatibleNozzles`, `getFilamentProfile`, `getAdjustedTemps`, `exportBambuStudioJSON`, `formatProfileAsText` `[iOS]`
- [x] Tests: bundled-resource presence validation `[iOS]`
- [x] **18/18 tests passing** (was 10) — baseline at the time

---

## BR — Before-release polish ✅ 2026-04-08…2026-04-15

> Originally derived from ChatGPT review #7–#14. Recommended order: BR-3 (quick decision) → BR-5 (isolated) → BR-2 (filenames) → BR-4 (failure UX) → BR-6b (OutputView split, after RB-5) → BR-1 (localization) → BR-7 (privacy) → BR-8 (device QA) → BR-6 (App Store pass).

### BR-1: Localize all hardcoded strings ✅ 2026-04-08
- [x] iOS: `Strings.swift` — all user-facing UI strings centralized in one enum `[iOS]`
- [x] iOS: HomeView, GoalsView, OutputView, ChecklistSheet, FilamentSettingsView updated `[iOS]`
- [x] iOS: nav titles, buttons, empty states, filament tab labels, checklist strings all use `Strings.*` `[iOS]`
- Enables Danish localization: swap `Strings.*` for `NSLocalizedString` calls without touching view files.

### BR-2: Export UX improvements ✅ 2026-04-08
- [x] iOS: descriptive export filenames — `3DPA_process_{printer}_{nozzle}_{material}.json` `[iOS]`

### BR-3: Dark mode strategy ✅ 2026-04-08 — revised 2026-04-15
- [x] Decision for v1.0: **dark-only** to ship faster `[iOS]`
- `.preferredColorScheme(.dark)` enforced in ContentView, WarningsSheet, ChecklistSheet, FeedbackView.
- **Revised 2026-04-15:** original "matches web app, no light mode color system exists" comment was inaccurate. Web has had full light mode + theme toggle since initial release (`html[data-theme="light"]` in style.css with 19 light tokens, `☀` toggle in header). Actual reason for iOS dark-only: `ColorTheme.swift` was hardcoded dark during MVP build. Light mode promoted to v1.1 candidate.

### BR-4: Failure states and recovery UX ✅ 2026-04-08
- [x] iOS: engine load failure shows retry button + "Report issue" link `[iOS]`
- [x] iOS: `engineRetry` environment key + `task(id: retryCount)` in PrintAssistantApp `[iOS]`
- [x] iOS: export failures surface as alert with message + "Report Issue" action `[iOS]`

### BR-5: Centralize external links and config ✅ 2026-04-08
- [x] iOS: `AppConstants.swift` — Discord URL, Tally feedback URL, website URL `[iOS]`
- [x] iOS: HomeView and OutputView use `AppConstants.*` `[iOS]`

### BR-6b: Split OutputView (moved from RB-6) ✅ 2026-04-08
- [x] iOS: `OutputViewModel` (`@Observable`) — engine state + async bridge calls extracted `[iOS]`
- [x] iOS: `WarningsBannerView`, `FilamentSettingsView`, `PrintProfileTabView` extracted `[iOS]`
- [x] `OutputView.swift` down to ~170 lines (was ~410) `[iOS]`

### BR-6: App Store readiness pass ✅ 2026-04-15

- [x] iOS: orientation — all 4 orientations supported (intentional) `[iOS]`
- [x] iOS: launch screen — solid black matches dark theme `[iOS]`
- [x] iOS: no beta wording in UI code `[iOS]`
- [x] iOS: 9 App Store screenshots taken at 1320×2868 (6.9") — saved to `docs/screenshots/` `[iOS]`
- [x] iOS: App Store metadata finalized — see `docs/app-store-metadata.md` `[iOS]`
- [x] Web: `/support` page live at `3dprintassistant.com/support` `[Web]`
- [x] iOS: App icon — clay-style Benchy, 1024×1024 PNG, added to asset catalog (2026-04-13) `[iOS]`
- [x] iOS: Benchy logo on HomeView (144px) + all 6 nav bars (24px) `[iOS]`
- [x] iOS: Website link added to home screen `[iOS]`
- [x] iOS: OutputView nav bar decluttered `[iOS]`
- [x] Web: Benchy logo replaces SVG in header (44px, retina srcset) `[Web]`
- [x] iOS: Cross-device UI fixes applied (BR-10) `[iOS]`
- [x] iOS: App Store screenshots retaken at 1320×2868 on iPhone 17 Pro Max (2026-04-14) `[iOS]`
- [x] iOS: Upload screenshots + metadata to App Store Connect — completed at submission 2026-04-15. (Original line never ticked; retired during 2026-05 ROADMAP slim per MF-2.)
- [x] iOS: Privacy nutrition labels — Diagnostics only (Crash Data, Performance Data, Other Diagnostic Data). Completed at submission 2026-04-15. (Original line never ticked; retired during 2026-05 ROADMAP slim per MF-2.)
- [x] iOS: Xcode 26 / iOS 26 SDK — updated CI runner `macos-15` → `macos-26` (2026-04-09) `[iOS]`

### BR-7: Privacy review ✅ 2026-04-08
- [x] iOS: Sentry `sendDefaultPii = false` — no device name or user identifiers sent `[iOS]`
- [x] iOS: `attachScreenshot = false`, `attachViewHierarchy = false` `[iOS]`
- [x] iOS: Sentry environment changed from `"beta"` to `"production"` `[iOS]`
- [x] Privacy policy page — live at `https://3dprintassistant.com/privacy` `[Web]`
- [x] App Store privacy nutrition labels — completed at submission 2026-04-15 (same as BR-6 entry above; original line never ticked; retired during 2026-05 ROADMAP slim per MF-2).

### BR-8: Device QA sweep ✅ 2026-04-09
- [x] First launch on slow devices, app background/foreground during engine init, export/share + clipboard/long-press flows, rotation behaviour, empty results, warning-heavy configs, incompatible nozzle flows, non-Bambu export. `[iOS]`

### BR-9: UI polish pass ✅ 2026-04-09
- [x] iOS: `SlidingSegmentedControl` active state → green tint + border `[iOS]`
- [x] iOS: "Goals" renamed to "Print Details" throughout `[iOS]`
- [x] iOS: 2-click Reset button added to all 6 screens `[iOS]`
- [x] iOS: "More brands" + "More options" buttons → `ColorTheme.info` (purple) `[iOS]`
- [x] iOS: Material picker redesigned — flat list, no difficulty groups `[iOS]`
- [x] iOS: Checklist button shows "Before you print" label on iPad/landscape `[iOS]`
- [x] iOS: All expand/collapse buttons standardized `[iOS]`

### BR-10: Cross-device UI review ✅ 2026-04-14
- [x] Added `3DPrintAssistantUITests` target + `ScreenCaptureUITests.swift` `[iOS]`
- [x] Captured 11 screens × 3 devices = 33 screenshots (iPhone SE 3rd gen / 17 Pro / 17 Pro Max) `[iOS]`
- [x] Code-review pass on all SwiftUI views for cross-device layout issues `[iOS]`
- [x] **Fix #1 P0** — `SlidingSegmentedControl` + `SliderTabBar` `.lineLimit(1).minimumScaleFactor(0.7)` + `.padding(.horizontal, 2)` `[iOS]`
- [x] **Fix #2 P0** — `OutputView` nav bar principal: `.lineLimit(1).minimumScaleFactor()` + `maxWidth: 220` `[iOS]`
- [x] **Fix #3 P1** — Filament "Setup" tab visible on SE (was contrast issue, not layout bug) `[iOS]`
- [x] **Fix #4 P1** — `ChecklistSheet` refactored to `ZStack(alignment: .bottom)` — sticky progress bar `[iOS]`
- [x] Re-captured 33 screenshots post-fix `[iOS]`
- [x] App Store screenshots in `docs/screenshots/` replaced with fresh Pro Max captures (1320×2868) `[iOS]`
- [x] 18/18 unit tests still passing — no regressions `[iOS]`
- Rollback tag: `pre-ui-review-2026-04-14` on both repos.

### BR-11: In-app feedback system (iOS) ✅ 2026-04-15
> Native SwiftUI sheet with 7 categories, conditional fields per category, auto-attached device/app metadata. Backend at the time: Discord webhook (#3dpa-ios-feedback). Tally / proper backend deferred to phase 2 — eventually superseded by CRITICAL-001 Worker route in IR-2a.

- [x] `Models/FeedbackCategory.swift` — 7 categories with emoji + Discord embed colors `[iOS]`
- [x] `Services/FeedbackService.swift` — actor, async Discord webhook POST, typed `FeedbackError` `[iOS]`
- [x] `Views/Feedback/FeedbackView.swift` — native sheet, dark theme, Menu-based category picker, conditional fields `[iOS]`
- [x] `Views/Feedback/FeedbackViewModel.swift` — form state, per-category validation, submission coordinator `[iOS]`
- [x] `Views/Feedback/MissingSomethingButton.swift` — shared footer link `[iOS]`
- [x] Auto-attach: app version, build number, iOS version, device model (`utsname` identifier), locale, optional reply-to email `[iOS]`
- [x] 8 entry points: Home footer, Home engine-failure, OutputView nav bar, OutputView export-failure alert, BrandPicker, PrinterPicker, MaterialPicker, NozzlePicker `[iOS]`
- [x] Secret handling: `DISCORD_FEEDBACK_WEBHOOK` in Config.xcconfig (gitignored) `[iOS]`
- [x] `Strings.Home.sendFeedback` + `Strings.Feedback.*` — centralized copy `[iOS]`
- [x] 9 new `FeedbackTests` — 32/32 passing (was 23) `[iOS]`
- Commit: `5a5624a`.

### BR-12: Empty-output hardening ✅ 2026-04-15
> User reproduced on TestFlight: tap Reset on Print Details (Goals) → Generate Profile → empty OutputView. Root cause: two-tap Reset called `appState.reset()` on BOTH taps across all 6 screens, silently clearing fields not visible on the current screen.

- [x] iOS: Defensive guard in `OutputViewModel.loadProfile` — fail fast to `invalidSelection` state `[iOS]`
- [x] iOS: New `invalidSelectionView` in OutputView — icon + message + "Back to start" CTA `[iOS]`
- [x] iOS: Fixed `OutputView.handleReset` — first tap arms only `[iOS]`
- [x] iOS: Scoped tap-1 reset on all 5 pre-Output screens — each clears only its own fields `[iOS]`
  - BrandPicker tap 1 → `brand = "bambu_lab"`; PrinterPicker tap 1 → `printer = ""`; MaterialPicker tap 1 → `material = "", selectedId = nil`; NozzlePicker tap 1 → `nozzle = "std_0.4"`; GoalsView tap 1 → `resetGoals()`.
- [x] iOS: `Strings.Output.invalidTitle/invalidMessage/invalidCta` added `[iOS]`
- [x] Tests: 5 new `OutputViewModelTests` — 23/23 passing (was 18) `[iOS]`
- Commits: `a81281c`, `57611d3` (over-corrected, regressed feedback), `15c49da` (final scoped per-screen tap 1).

---

## Phase 2.7b — Explanatory Descriptions ✅ 2026-04-09

**Goal:** every setting, option, and category explains itself. 100% `why` coverage.

### Engine + Data — already complete (no changes needed)
- [x] All 47+ `resolveProfile()` params have filled `why` strings `[Web]`
- [x] All 16 filter groups have `desc` on every item in `getFilters()` `[Web]`
- [x] All 15 slicer tabs have `desc` in `SLICER_TABS` `[Web]`
- [x] All 18 materials return `notes` via `getFilamentProfile()` `[Web]`
- [x] `objective_profiles.json`, `environment.json` — all options have `desc` `[Web]`

### Web — deferred (engine data is there, web UI rendering not yet wired)
- [ ] Render filter option `desc` as subtitle under chips/options `[Web]`
- [ ] Add tab description text at top of each output tab `[Web]`

→ **Both web items tracked in slim ROADMAP** under Deferred / Parked Work.

### iOS ✅ 2026-04-09
- [x] `PrintProfileTabView`: show `why` in Simple mode `[iOS]`
- [x] `ChipView`: added `subtitle` support; all chip groups in GoalsView wire `desc` `[iOS]`
- [x] Segmented controls in GoalsView: show selected option's `desc` below each control `[iOS]`
- [x] `EngineService`: fixed notes parsing from `[String]` array (was parsed as `String?`) `[iOS]`
- [x] `FilamentSettingsView`: Setup tab shows material tips with lightbulb icons `[iOS]`
- [x] `SlicerTab` model: added `desc` field, populated all 15 tabs from engine.js `[iOS]`
- [x] `PrintProfileTabView`: shows tab desc at top of each slicer tab `[iOS]`
- [x] `OutputView`: shows tab desc below both filament and print profile tab bars `[iOS]`
- [x] `Strings.swift`: added `FilamentTab.tips`, `TabDesc.filament` descriptions `[iOS]`

### 2.7b follow-up: Info toggle redesign + material descriptions ✅ 2026-04-09
- [x] Reverted chip subtitles — chips stay compact and uniform `[iOS]`
- [x] Added info toggle (ℹ️) on Print Details page — off by default `[iOS]`
- [x] When toggle on: shows selected option description below every section `[iOS]`
- [x] Multi-select chip groups (useCase, special) join all selected descs with " · " `[iOS]`
- [x] Material picker: each filament row shows short description beside temperature (18 materials) `[iOS]`
- [x] Material badges (Enclosure, Dry first) moved to own line `[iOS]`

---

## DQ-1 — Provenance infrastructure ✅ 2026-04-24

Phase DQ kickoff + DQ-1 shipped in a single overnight session (6 commits web + 3 iOS). Owner opened brainstorming pro-credibility data work, converged on 5-sub-phase plan (provenance → Safe/Tuned → PA/LA → retraction deltas → cooling curves), wrote IMPL-041 master spec, shipped DQ-1 end-to-end. Spec revised mid-execution: inline `prov` via `S`/`A` extension instead of separate `_tag` helper + return-shape split.

**Shipped** (6 commits across both repos + 1 kickoff-docs commit):
- [x] `engine.js`: `S`/`A` helpers extended with optional `prov` arg. Web `34e92b0`, iOS `720d26a`. `[Both]`
- [x] `engine.js`: all 28 numeric emissions in `resolveProfile` tagged with baseline prov (7 `default`, 19 `calculated`, 2 `rule`). 18 qualitative emissions stay `prov=null`. Web `a173f0c`, iOS `16dcb2a`. `[Both]`
- [x] `scripts/walkthrough-harness.js`: new check 0c — fails on any numeric emission with `prov=null` + malformed-shape check. Web `38b36cb`. 10/10 combos green. `[Web]`
- [x] `app.js` + `style.css`: Advanced-view ⓘ icon after param label with native `title="Source: X — ref"` tooltip. Web `7b76cc3`. `[Web]`
- [x] iOS: `Provenance` struct + `ProfileParam.prov: Provenance?` + `_ProfileParamWire._ProvenanceWire` Codable decode. iOS `837ca10`. `[iOS]`
- [x] iOS: `EngineServiceTests` +2 tests. 42/42 green (was 40). `[iOS]`
- [x] Byte-identical engine + data sync web → iOS verified after every engine commit. `[Both]`

**Pragmatic baseline caveat:** `pressure_advance` + `retraction_speed` are tagged `default` today but the values are already real slicer-preset data. DQ-3 upgrades those to `source: 'vendor'` once the scraper confirms/replaces the numbers.

**Follow-ups filed to IR-5:** `[DQ-1-followup]` (provenance for filament panel — shipped same day), `[LOW-003-followup-label]` (`adv.retraction_length` undefined bug at `app.js:1187` — shipped same day).

---

## DQ-2 — Safe vs Tuned objective ✅ 2026-04-24

Shipped end-to-end in a single session (2026-04-24 PM). 8 commits across both repos. Phase DQ 1/5 → 2/5.

MVP scope: 5 tiered fields across 3 presets (`speed_priority.fast` + `speed_priority.balanced` + `strength_levels.strong`). Sparse `_tuned` override pattern — only fields that differ Safe → Tuned appear in the override block; everything else falls through to the Safe (top-level) value via `_tier()` helper.

- [x] `engine.js`: `_tier(preset, field, mode)` helper + `state.profileMode` coercion (missing/unknown → `'safe'`); 5 MVP reads wired; prov refs gain `(_tuned)` / `(base from _tuned)` tier marker. Web `d4c9288`, iOS `b02aead`. `[Both]`
- [x] `data/rules/objective_profiles.json`: sparse `_tuned` blocks. Values: outer_corexy 150→200 / 100→130, outer_bedslinger 100→130 / 80→100, outer_accel_corexy 6000→10000 / 5000→8000, outer_accel_bedslinger 3000→6000, infill_density strong 35→25. Web `8eccfed`, iOS `182833f`. `[Both]`
- [x] `app.js` + `engine.js` filter registry: `profileMode` filter group via existing chip system. Locale keys `filterProfileMode` / `pmSafe` / `pmSafeDesc` / `pmTuned` / `pmTunedDesc` in en + da. Web `f9384dc` + `5a97ed8`. `[Web]`
- [x] Walkthrough harness DQ-2 assertion: Safe baseline byte-equal + Tuned differentiation ≥3/5 + prov tier-tagged. Web `270d17b`. `[Web]`
- [x] iOS: `AppState.profileMode: String?` (nil = Safe default); `resetGoals` clears it; `toJSDictionary` includes it when set. `GoalsView` renders `SlidingSegmentedControl` for profileMode inside "More options" disclosure. iOS `0380910`. `[iOS]`
- [x] iOS: new XCTests `testSafeBaselineByteEqualToDefault` + `testTunedEmissionDiffersOnTieredFieldsAndTagsProvenance`. 46/46 XCTest green (was 44). iOS `949f95b`. `[iOS]`

---

## PR-8 — Retire iOS Beta signup card (web) ✅ 2026-04-27

- [x] Web: remove iOS Beta card + `viewBeta` in `index.html` — replaced with live App Store link.
- [x] Web: remove Tally embed reference (q4Wgvd form) and beta-related locale strings (`navBeta`, `betaHeroTitle`, `betaHeroSub`, `betaCardTitle`, `betaCardDesc`).
- [x] Web: remove `navBeta` handler + `setView('beta')` from `app.js`; nav button is now an `<a>` linking to App Store.

**Shipped 2026-04-27.** EU DSA Trader Status approved → App Store link now live worldwide. Two link points added: nav button (`iOS App ↗` → App Store in new tab) + small phone-glyph icon in header right. Storefront-less URL `https://apps.apple.com/app/id6761634761` per Apple Marketing Guidelines. New locale key `navIOS` (EN "iOS App", DA "iOS-app"). Generic SVG glyph (no Apple branding) — Apple-compliant.
