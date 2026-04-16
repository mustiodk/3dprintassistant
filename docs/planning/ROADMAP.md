# 3D Print Assistant — Roadmap

**Single source of truth for all planning.** Replaces IMPLEMENTATION_PLAN.md, TASKS.md, and web BACKLOG.md.

**Last updated:** 2026-04-17 — **iOS v1.0 APPROVED, EU distribution blocked by Trader Status verification** (submitted, awaiting Apple 1–4 bd). App live in ~121 non-EU countries but announcement held until DK unlocks. **Web Tally→Discord feedback migration shipped** same day — web and iOS now use the same Discord-webhook-backed feedback flow (separate inbox channels).
**Owner:** Musti (solo dev)
**Priority:** iOS release first, then web enhancements.

> ⚠️ **Hard external deadline: April 28, 2026** — All release work must be complete before or on this date. CI runner already updated ✅

---

## Project status at a glance

| Area | Status |
|------|--------|
| **Web app** | Live at 3dprintassistant.com. 64 printers, 12 brands, 18 materials, 9 nozzles, 3 slicers. Feedback now flows to Discord `#web-app-feedback` via Cloudflare Worker at `/api/feedback` (Tally retired 2026-04-17). |
| **iOS app** | ✅ **APPROVED + released 2026-04-16**. Live in ~121 non-EU countries via generic `apps.apple.com/app/3d-print-assistant/id6761634761` link. 🚩 **EU distribution blocked** by EU DSA Trader Status — submitted as Business (CVR + home address public) 2026-04-16, awaiting Apple verification (1–4 business days). Announcement **held** until DK/EU unlocks so DK audience doesn't see "App Not Available." |
| **Engine** | Shared `engine.js` via JavaScriptCore on iOS. Web is master — edit there, copy to iOS. |
| **Export** | Engine + bridge done. iOS UI **hidden** (deferred post-release). Web UI **disabled** (Bambu Studio rejected .json). |

---

## Current priority: iOS App Store release

The iOS app is the top priority. Everything below is ordered to get to a public release as fast as possible without cutting corners on quality. The ChatGPT code/release review identified 21 items grouped into three tiers. These are merged below with the existing phase plan.

---

## Release blockers — Fix Now

> These must be done before any public release. They are architectural/safety issues.
>
> **Recommended implementation order for Claude Code sessions:**
> 1. **RB-3** first — isolated, 20 min, zero risk of breaking anything. Get it out of the way.
> 2. **RB-1** — the most critical architectural fix. Sets the contract everything else builds on.
> 3. **RB-2** — move bridge off main actor. Required before RB-4 can be done cleanly.
> 4. **RB-4 + PR-3 together** — bridge error hardening + Codable decoding. Same files, same pass. Do not split these across sessions.
> 5. **RB-5** — write tests against the now-correct and now-typed bridge.
>
> *(RB-6/OutputView split has been moved to "Before Release" — it's a maintainability concern, not a stability blocker. Run it after RB-5 so tests can verify nothing broke during the split.)*

### RB-1: Structured warning contract (was: ChatGPT review #1) ✅ 2026-04-08
- [x] Engine: make `getWarnings()` return structured objects `{ id, text, detail, fix }` instead of HTML strings `[Web]`
- [x] iOS: rewrite warning parsing in `EngineService.swift` to consume structured data `[iOS]`
- [x] iOS: `WarningCard` already used the right struct shape — no UI changes needed `[iOS]`
- [x] Tests: add warning contract tests (4 new tests, 10/10 passing) `[iOS]`

### RB-2: Move engine bridge off main actor (was: review #2) ✅ 2026-04-08
- [x] iOS: `actor EngineService` — all JSCore work off main thread, automatic isolation `[iOS]`
- [x] iOS: 6 call-site files updated with `await` (OutputView, GoalsView, ChecklistSheet, NozzlePickerView, tests) `[iOS]`

### RB-3: Sentry DSN out of source code (was: review #3) ✅ 2026-04-08
- [x] iOS: DSN moved to `Config.xcconfig` (gitignored) → `Info.plist` `$(SENTRY_DSN)` → read at runtime via `Bundle.main.infoDictionary` `[iOS]`

### RB-4: Bridge error handling — no silent failures (was: review #4) ✅ 2026-04-08
- [x] iOS: `ExceptionStore` captures JS exceptions from evaluateScript closures `[iOS]`
- [x] iOS: `evaluate(_:fn:)` helper — clears/checks exceptions on every bridge call, logs to Sentry + throws `EngineError.jsFailed` `[iOS]`
- [x] iOS: all bridge functions route through `evaluate()` — JS exceptions observable, not silent `[iOS]`
- [ ] iOS: replace manual JSON parsing with `Codable` decoding in `EngineService` (deferred to post-release PR-3)

### RB-5: Expand bridge test coverage (was: review #5) ✅ 2026-04-08
- [x] Tests: `getChecklist`, `getFilters`, `getCompatibleNozzles`, `getFilamentProfile`, `getAdjustedTemps`, `exportBambuStudioJSON`, `formatProfileAsText` `[iOS]`
- [x] Tests: bundled-resource presence validation `[iOS]`
- [x] **18/18 tests passing** (was 10)

---

## Before release — Polish & compliance

> Complete after release blockers, before App Store submission.
>
> **Recommended order:** BR-3 (quick decision) → BR-5 (isolated) → BR-2 (filenames) → BR-4 (failure UX) → BR-6b (OutputView split, after RB-5 tests) → BR-1 (localization) → BR-7 (privacy) → BR-8 (device QA) → BR-6 (App Store pass)

### BR-1: Localize all hardcoded strings (was: review #7) ✅ 2026-04-08
- [x] iOS: `Strings.swift` — all user-facing UI strings centralized in one enum `[iOS]`
- [x] iOS: HomeView, GoalsView, OutputView, ChecklistSheet, FilamentSettingsView updated `[iOS]`
- [x] iOS: nav titles, buttons, empty states, filament tab labels, checklist strings all use `Strings.*` `[iOS]`
- Enables Danish localization: swap `Strings.*` for `NSLocalizedString` calls without touching view files

### BR-2: Export UX improvements (was: review #8) ✅ 2026-04-08
- [x] iOS: descriptive export filenames — `3DPA_process_{printer}_{nozzle}_{material}.json` `[iOS]`

### BR-3: Dark mode strategy (was: review #9) ✅ 2026-04-08 — **revised 2026-04-15**
- [x] Decision for v1.0: **dark-only** to ship faster `[iOS]`
- `.preferredColorScheme(.dark)` enforced in ContentView, WarningsSheet, ChecklistSheet, FeedbackView
- **Revised 2026-04-15**: Original "matches web app, no light mode color system exists" comment was inaccurate. Web has had full light mode + theme toggle since initial release (`html[data-theme="light"]` in style.css with 19 light tokens, `☀` toggle in header). The actual reason for iOS dark-only: `ColorTheme.swift` was hardcoded dark during MVP build, and adding light variants is real work (see backlog item below). Keep dark-only for v1.0; promote light mode to v1.1.

### BR-4: Failure states and recovery UX (was: review #10) ✅ 2026-04-08
- [x] iOS: engine load failure shows retry button + "Report issue" link (Tally form) `[iOS]`
- [x] iOS: `engineRetry` environment key + `task(id: retryCount)` in PrintAssistantApp `[iOS]`
- [x] iOS: export failures surface as alert with message + "Report Issue" action `[iOS]`

### BR-5: Centralize external links and config (was: review #11) ✅ 2026-04-08
- [x] iOS: `AppConstants.swift` — Discord URL, Tally feedback URL, website URL `[iOS]`
- [x] iOS: HomeView and OutputView use `AppConstants.*` — no more hardcoded URLs `[iOS]`

### BR-6b: Split OutputView (moved from RB-6) ✅ 2026-04-08
- [x] iOS: `OutputViewModel` (`@Observable`) — engine state + async bridge calls extracted `[iOS]`
- [x] iOS: `WarningsBannerView`, `FilamentSettingsView`, `PrintProfileTabView` extracted `[iOS]`
- [x] `OutputView.swift` down to ~170 lines (was ~410) `[iOS]`

### BR-6: App Store readiness pass (was: review #12) — pending app icon + upload
- [x] iOS: orientation — all 4 orientations supported (intentional) `[iOS]`
- [x] iOS: launch screen — solid black matches dark theme, no change needed `[iOS]`
- [x] iOS: no beta wording found in UI code `[iOS]`
- [x] iOS: 9 App Store screenshots taken at 1320×2868 (6.9") — saved to `docs/screenshots/` `[iOS]`
- [x] iOS: App Store metadata finalized — see `docs/app-store-metadata.md` (subtitle, description, keywords, URLs) `[iOS]`
- [x] Web: `/support` page live at `3dprintassistant.com/support` (App Store support URL) `[Web]`
- [x] iOS: App icon — clay-style Benchy, 1024×1024 PNG, added to asset catalog (2026-04-13) `[iOS]`
- [x] iOS: Benchy logo added to HomeView (144px) + all 6 nav bars (24px) `[iOS]`
- [x] iOS: Website link (3dprintassistant.com) added to home screen below Discord `[iOS]`
- [x] iOS: OutputView nav bar decluttered — logo removed from principal, text Reset→icon, hidden export removed `[iOS]`
- [x] Web: Benchy logo replaces SVG in header (44px, retina srcset) `[Web]`
- [x] iOS: Cross-device UI fixes applied (BR-10) — 4 P0/P1 issues resolved 2026-04-14 `[iOS]`
- [x] iOS: App Store screenshots retaken at 1320×2868 on iPhone 17 Pro Max (2026-04-14) `[iOS]`
- [ ] iOS: Upload screenshots + metadata to App Store Connect — **manual** `[iOS]`
- [ ] iOS: Privacy nutrition labels — Diagnostics only (Crash Data, Performance Data, Other Diagnostic Data) — NOT "Data Not Collected" `[iOS]`
- [x] iOS: Xcode 26 / iOS 26 SDK — updated CI runner `macos-15` → `macos-26` (2026-04-09) `[iOS]`

### BR-7: Privacy review (was: review #13) ✅ 2026-04-08
- [x] iOS: Sentry `sendDefaultPii = false` — no device name or user identifiers sent `[iOS]`
- [x] iOS: `attachScreenshot = false`, `attachViewHierarchy = false` — no visual data in crash reports `[iOS]`
- [x] iOS: Sentry environment changed from `"beta"` to `"production"` `[iOS]`
- [x] Privacy policy page — live at `https://3dprintassistant.com/privacy` `[Web]`
- [ ] App Store privacy nutrition labels — **manual, done in App Store Connect**

### BR-8: Device QA sweep (was: review #14) ✅ 2026-04-09
- [x] QA: first launch on slow devices `[iOS]`
- [x] QA: app background/foreground during engine init `[iOS]`
- [x] QA: export/share + clipboard/long-press flows `[iOS]`
- [x] QA: rotation behavior, empty results, warning-heavy configs `[iOS]`
- [x] QA: incompatible nozzle flows, non-Bambu export `[iOS]`

### BR-11: In-app feedback system (iOS) ✅ 2026-04-15
> Native SwiftUI sheet with 7 categories, conditional fields per category, auto-attached device/app metadata. Backend: Discord webhook (#3dpa-ios-feedback) — zero third-party deps, instant pings to the dev's Discord server. Tally / proper backend deferred to phase 2 when the web form is updated simultaneously.
- [x] `Models/FeedbackCategory.swift` — 7 categories (generalFeedback, featureRequest, missingPrinter, missingFilament, missingNozzle, missingSlicer, bugReport) with emoji + Discord embed colors `[iOS]`
- [x] `Services/FeedbackService.swift` — actor, async Discord webhook POST, typed `FeedbackError` for UI `[iOS]`
- [x] `Views/Feedback/FeedbackView.swift` — native sheet, dark theme, Menu-based category picker, conditional fields `[iOS]`
- [x] `Views/Feedback/FeedbackViewModel.swift` — form state, per-category validation, submission coordinator `[iOS]`
- [x] `Views/Feedback/MissingSomethingButton.swift` — shared footer link for the 4 picker screens `[iOS]`
- [x] Auto-attach: app version, build number, iOS version, device model (`utsname` identifier), locale, optional reply-to email `[iOS]`
- [x] Entry point 1: Home screen footer — "Send Feedback" (replaces previous Tally link) `[iOS]`
- [x] Entry point 2: Home engine-failure — "Report this issue" → bug pre-filled with engine error `[iOS]`
- [x] Entry point 3: OutputView nav bar — `bubble.left` icon, general feedback `[iOS]`
- [x] Entry point 4: OutputView export-failure alert — "Report Issue" → bug + error context `[iOS]`
- [x] Entry point 5: BrandPicker footer — `missingPrinter` category with "whole brand missing" note `[iOS]`
- [x] Entry point 6: PrinterPicker footer — `missingPrinter` category with current brand as context `[iOS]`
- [x] Entry point 7: MaterialPicker footer — `missingFilament` category `[iOS]`
- [x] Entry point 8: NozzlePicker footer — `missingNozzle` category `[iOS]`
- [x] Secret handling: `DISCORD_FEEDBACK_WEBHOOK` in Config.xcconfig (gitignored), injected via `$(DISCORD_FEEDBACK_WEBHOOK)` in Info.plist. `//` escaped as `/${}/` because xcconfig treats `//` as a comment delim. CI workflow updated to populate from GitHub secret. `[iOS]`
- [x] `Strings.Home.sendFeedback` + `Strings.Feedback.*` — centralized copy `[iOS]`
- [x] 9 new `FeedbackTests` — payload shape, empty-field stripping, email optionality, validation per category, whitespace handling, prefill seeding + non-overwrite. **32/32 passing** (was 23) `[iOS]`
- Commit: `5a5624a`.
- **Manual follow-up**: add `DISCORD_FEEDBACK_WEBHOOK` secret to GitHub repo settings (raw URL, no escaping needed — workflow handles that). If unset, CI still succeeds but the built app's submit throws `FeedbackError.webhookNotConfigured` with a "reach out via Discord" fallback message.

### BR-12: Empty-output hardening ✅ 2026-04-15
> User reproduced on TestFlight: tap Reset on Print Details (Goals) → tap Generate Profile → empty OutputView. Root cause: the two-tap Reset pattern called `appState.reset()` on BOTH taps across all 6 screens, silently clearing fields (printer/material/nozzle) not visible on the current screen. User taps Reset on Goals → printer/material cleared invisibly → taps Generate → OutputView loads with empty state → engine calls silently return empty (`try?` swallows throw) → blank output.
- [x] iOS: Defensive guard in `OutputViewModel.loadProfile` — fail fast to `invalidSelection` state when printer or material is empty `[iOS]`
- [x] iOS: New `invalidSelectionView` in OutputView — icon + message + "Back to start" CTA matching the HomeView engine-error pattern `[iOS]`
- [x] iOS: Fixed `OutputView.handleReset` — first tap only arms, second tap resets state + router together atomically `[iOS]`
- [x] iOS: Scoped tap-1 reset on **all 5 pre-Output screens** — each screen clears only its own fields on tap 1 (visible feedback preserved), full `appState.reset()` + `router.reset()` only on tap 2. Removes the cross-field silent-clear bug without regressing UX. `[iOS]`
  - BrandPicker tap 1 → `brand = "bambu_lab"`
  - PrinterPicker tap 1 → `printer = ""`
  - MaterialPicker tap 1 → `material = "", selectedId = nil`
  - NozzlePicker tap 1 → `nozzle = "std_0.4"`
  - GoalsView tap 1 → `resetGoals()` (new helper on AppState — clears all goal fields, leaves printer/material/nozzle)
- [x] iOS: `Strings.Output.invalidTitle/invalidMessage/invalidCta` added `[iOS]`
- [x] Tests: 5 new `OutputViewModelTests` — empty printer, empty material, both empty, valid state, valid-after-invalid reload. **23/23 passing** (was 18) `[iOS]`
- Commits: `a81281c` (guard + OutputView Reset), `57611d3` (arm-only on 5 screens — too aggressive, regressed visible feedback), `15c49da` (scoped per-screen tap 1 — final).
- Belt-and-suspenders: scoped reset eliminates the main path; guard catches anything else.

### BR-10: Cross-device UI review ✅ 2026-04-14
- [x] Added `3DPrintAssistantUITests` target + `ScreenCaptureUITests.swift` — programmatic screen capture across device sizes `[iOS]`
- [x] Captured 11 screens × 3 devices = 33 screenshots (iPhone SE 3rd gen / 17 Pro / 17 Pro Max) `[iOS]`
- [x] Code-review pass on all SwiftUI views for cross-device layout issues `[iOS]`
- [x] **Fix #1 P0** — `SlidingSegmentedControl` added `.lineLimit(1).minimumScaleFactor(0.7)` + `.padding(.horizontal, 2)`. Fixes "Standard"/"Maximum" wrapping on SE & 17 Pro `[iOS]`
- [x] **Fix #1 P0** — Same fix applied to `SliderTabBar` (filament + print profile tabs) `[iOS]`
- [x] **Fix #2 P0** — `OutputView` nav bar principal: added `.lineLimit(1).minimumScaleFactor()` to printer name + brand/slicer subtitle, capped `maxWidth: 220`. Fixes truncation on SE & 17 Pro `[iOS]`
- [x] **Fix #3 P1** — Filament "Setup" tab verified visible on SE (earlier concern was a contrast issue, not a layout bug) `[iOS]`
- [x] **Fix #4 P1** — `ChecklistSheet` refactored to `ZStack(alignment: .bottom)` — progress bar now sticky at bottom (was scrolling off on SE) `[iOS]`
- [x] Re-captured 33 screenshots post-fix — all 4 issues resolved on all 3 device sizes `[iOS]`
- [x] App Store screenshots in `docs/screenshots/` replaced with fresh Pro Max captures (1320×2868). Old Apr 8 set moved to `_backup-apr8/` `[iOS]`
- [x] 18/18 unit tests still passing — no regressions `[iOS]`
- Rollback tag: `pre-ui-review-2026-04-14` on both repos

### BR-9: UI polish pass ✅ 2026-04-09
- [x] iOS: `SlidingSegmentedControl` active state → green tint + border (was grey `surface2`) — affects all goal pickers + Simple/Advanced toggle `[iOS]`
- [x] iOS: "Goals" renamed to "Print Details" throughout (nav title, step label, back button) `[iOS]`
- [x] iOS: 2-click Reset button added to all 6 screens — tap 1: clears selections, tap 2 within 3s: back to HomeView `[iOS]`
- [x] iOS: "More brands" + "More options" buttons → `ColorTheme.info` (purple) — matches "Show all nozzles" + "Advanced options" `[iOS]`
- [x] iOS: Material picker redesigned — flat list, no difficulty groups; PLA Basic/Matte/Silk, PETG/HF, TPU95A shown by default; rest behind "+N more" `[iOS]`
- [x] iOS: Checklist button shows "Before you print" label on iPad/landscape (`horizontalSizeClass == .regular`) `[iOS]`
- [x] iOS: All expand/collapse buttons standardized — `HStack(spacing: 6)`, size 14 bold, left-aligned, no `Spacer()` `[iOS]`

---

## Phase 2.7b — Explanatory Descriptions ✅ 2026-04-09

**Goal:** Every setting, option, and category explains itself. 100% `why` coverage.

### Engine + Data — already complete (no changes needed)
- [x] All 47+ `resolveProfile()` params have filled `why` strings `[Web]`
- [x] All 16 filter groups have `desc` on every item in `getFilters()` `[Web]`
- [x] All 15 slicer tabs have `desc` in `SLICER_TABS` `[Web]`
- [x] All 18 materials return `notes` via `getFilamentProfile()` `[Web]`
- [x] `objective_profiles.json`, `environment.json` — all options have `desc` `[Web]`

### Web — deferred (engine data is there, web UI rendering not yet wired)
- [ ] Render filter option `desc` as subtitle under chips/options `[Web]`
- [ ] Add tab description text at top of each output tab `[Web]`

### iOS ✅ 2026-04-09
- [x] `PrintProfileTabView`: show `why` in Simple mode (removed `isAdvanced` gate) `[iOS]`
- [x] `ChipView`: added `subtitle` support; all chip groups in GoalsView wire `desc` `[iOS]`
- [x] Segmented controls in GoalsView: show selected option's `desc` below each control `[iOS]`
- [x] `EngineService`: fixed notes parsing from `[String]` array (was parsed as `String?`) `[iOS]`
- [x] `FilamentSettingsView`: Setup tab shows material tips with lightbulb icons `[iOS]`
- [x] `SlicerTab` model: added `desc` field, populated all 15 tabs from engine.js `[iOS]`
- [x] `PrintProfileTabView`: shows tab desc at top of each slicer tab `[iOS]`
- [x] `OutputView`: shows tab desc below both filament and print profile tab bars `[iOS]`
- [x] `Strings.swift`: added `FilamentTab.tips`, `TabDesc.filament` descriptions `[iOS]`

### 2.7b follow-up: Info toggle redesign + material descriptions ✅ 2026-04-09
- [x] Reverted chip subtitles — chips stay compact and uniform (subtitles caused uneven sizing) `[iOS]`
- [x] Added info toggle (ℹ️) on Print Details page — off by default for clean layout `[iOS]`
- [x] When toggle on: shows selected option description below every section (segmented controls + chip groups) `[iOS]`
- [x] Multi-select chip groups (useCase, special) join all selected descs with " · " `[iOS]`
- [x] Material picker: each filament row now shows short description beside temperature (18 materials covered) `[iOS]`
- [x] Material badges (Enclosure, Dry first) moved to own line for clarity `[iOS]`

---

## Phase 2.7a — Fix Bambu Studio Export

> Engine functions exist but Bambu Studio rejects the .json. Needs the #036 data architecture fix + field-by-field comparison with real BS exports.

### #036 — Profile Parameter Data Architecture + Value Correctness
- [ ] `objective_profiles.json`: add 5 new fields (seam_position, only_one_wall_top, ironing_type, ironing_pattern, internal_solid_infill_pattern) `[Web]`
- [ ] `engine.js` resolveProfile(): replace hardcoded strings with data reads + display lookup tables `[Web]`
- [ ] `engine.js` exportBambuStudioJSON(): fix zig-zag bug, add ironing_pattern, expand support_style (5 options) `[Web]`
- [ ] SLICER_TABS + SLICER_PARAM_LABELS: split ironing → ironing_type + ironing_pattern `[Web]`
- [ ] Import test: verify .json imports correctly in Bambu Studio `[Web]`
- [ ] Re-enable web export button `[Web]`
- [ ] Sync updated engine + data to iOS `[iOS]`

**Spec:** `docs/specs/IMPL-036-profile-params.md`
**Claude Code prompt:** `docs/prompts/phase-2.7a-export-prompt.md` (needs rewrite after #036)

---

## Post-release — Refactoring & polish

> From ChatGPT review items #16–21. Do after App Store launch.

### PR-1: Stronger typing for AppState
- [ ] Introduce enums for environment, support, colors, user level, slicer IDs `[iOS]`

### PR-2: View models for major screens
- [x] `OutputViewModel` extracted (done in BR-6b) `[iOS]`
- [ ] `GoalsViewModel`, picker view models `[iOS]`

### PR-3: Codable bridge decoding
> Was planned to be pulled into RB-4 but deferred — exception handling via `ExceptionStore` solved the silent-failure problem without requiring Codable. Revisit post-release.
- [ ] Replace manual JSON parsing with `Codable` decoding in EngineService `[iOS]`

### PR-4: Navigation architecture refinement
- [ ] Deeper route state, restoration support, coordinator pattern if needed `[iOS]`

### PR-5: Accessibility & visual polish
- [ ] Dynamic Type review, VoiceOver labels, contrast audit, tap targets `[iOS]`
- [ ] iPad layout optimization `[iOS]`
- [ ] Animation consistency pass `[iOS]`

### PR-6: Design system separation
- [ ] Split `SharedComponents.swift` into typography, feedback, settings, utility `[iOS]`

### PR-7: UI prototype items (from old TASKS.md)
- [ ] Advanced rows stagger reveal — cascade fade-in on mode switch `[iOS]`
- [ ] Consistent pill animation on native segmented controls `[iOS]`

### PR-8: Retire iOS Beta signup card (web)
- [ ] Web: remove iOS Beta card + `viewBeta` in `index.html` — app is live, signup form is deprecated `[Web]`
- [ ] Web: remove remaining Tally embed reference (q4Wgvd form) and any leftover beta-related locale strings `[Web]`
- [ ] Web: remove `navBeta` and `setView('beta')` from `app.js` if no longer needed `[Web]`

---

## Future features — Backlog

> Not scheduled. Pick from here when the release is done and the iOS app is stable.

### High value
| # | Feature | Scope | Notes |
|---|---------|-------|-------|
| **v1.1 candidate** | Light mode / system appearance support (iOS — close the gap with web) | Large (~half day to full day) | **Web already has both** (`html[data-theme="light"]` since initial release + `☀` toggle in header). iOS is dark-only because `ColorTheme.swift` was hardcoded dark during MVP. Spec: (1) add `light` variants for all 10–15 `ColorTheme` tokens, (2) switch hardcoded `Color(hex:)` to environment-aware (`Color(light:dark:)` or asset catalog), (3) remove the 4 `.preferredColorScheme(.dark)` calls (ContentView, WarningsSheet, ChecklistSheet, FeedbackView), (4) sweep all screens for contrast + readability in light, (5) decide UX — system-follow (default) vs explicit toggle (would need a Settings screen). Test on iPhone + iPad in dynamic switching. |
|---|---------|-------|-------|
| #001 | AMS Purge Volume Calculator | Medium | Previously shipped on web, needs restore |
| #026 | Smart Simple/Advanced Configurator Mode | Medium | Input-side simple/advanced split |
| #006 | Parameter Tooltip / Info Panel | Medium | `param-info.json` with increase/decrease effects |
| #005 | Shareable Profile URL | Small | Encode state as URL params |

### Medium value
| # | Feature | Scope | Notes |
|---|---------|-------|-------|
| #010 | More Printer Support | Medium | A1 Combo, MK4, XL, Voron, K1 Max |
| #011 | More Material Support | Medium | PLA+, Sparkle, PA12-CF, PPA-CF, ABS-GF |
| #012 | Saved Presets (localStorage) | Medium | Name + save filter state |
| #019 | Multi-Language Expansion | Medium | DE, NL, SV |
| #029 | Source Attribution for Recommendations | Medium | Brand/community/calculated badges |
| #037 | macOS App (WKWebView wrapper) | Medium | **Decided 2026-04-17: Path 3 — SwiftUI + WKWebView loading bundled offline assets via `loadFileURL`.** Same pattern as iOS, simpler (no JSCore bridge). Matches "free, offline, no tracking" product ethos. ~100 lines of Swift. DMG or Mac App Store. New folder: `3dprintassistant-macos/`. **Required mitigations** (don't skip): (1) `sync-web-assets.sh` script or Xcode Build Phase copies `index.html`, `app.js`, `engine.js`, `style.css`, `feedback-form.js`, `data/`, `locales/` from web repo into `Resources/web/` at build time — zero manual sync load; (2) feature-detect `location.protocol === 'file:'` in `feedback-form.js` and submit to absolute `https://3dprintassistant.com/api/feedback` when running from bundle, so Discord feedback works offline-by-default-URL, online-only-when-submitting; (3) document the data-sync rule alongside the iOS one (CLAUDE.md). Rejected: Path 2 (live URL — breaks offline, weaker App Store story); Path 2.5 (hybrid bundle+fetch — marginal benefit for extra plumbing). Kickoff prompt: `docs/prompts/macos-app-kickoff.md`. |

### Larger vision
| # | Feature | Scope | Notes |
|---|---------|-------|-------|
| #016 | Troubleshooter Expansion (20+ symptoms) | Large | Expand from 8 to 20+ |
| #018 | Print Time Estimator Improvements | Large | Accel modeling, preset comparison |
| #020 | Filament Database / Brand Profiles | Large | Brand-specific temp/speed overrides |
| #015 | Community-Contributed Profiles | Large | GitHub PR-based community profiles |
| #022 | User Profiles & Community Layer | Large | Accounts, sync, sharing |
| #038 | Windows App | Large | Cross-platform wrapper via Tauri (preferred over Electron — ~10MB vs ~200MB, native-feel, Rust-backed, uses OS webview). Only pursue after macOS port (#037) validates desktop demand. Deferred to post-v1.2. |

### Technical debt
| # | Feature | Scope | Notes |
|---|---------|-------|-------|
| #032 | JSDoc Typedefs for Engine | Small | Zero runtime cost, VS Code autocomplete |
| #033 | Engine Modularization (ES Modules) | Medium | Only if engine keeps growing |
| #034 | app.js Render/Event Refactor | Large | Deferred — high risk, low near-term reward |
| #035 | CI Pipeline (web) | Small | ESLint + data validation. When 2nd contributor joins |

---

## Completed phases

| Phase | What | When |
|-------|------|------|
| Phase 0 | Foundation — Xcode, engine bridge, models, tests | 2026-04-03 |
| Phase 1a | Data layer + engine extensions | 2026-04-03 |
| Phase 1b | All UI screens | 2026-04-03 |
| Phase 1 wrap | Merged to main | 2026-04-03 |
| Phase 2 | Output enrichment — warnings, checklist, simple/advanced, filament info | 2026-04-03 |
| Phase 3 SoT | Source-of-truth fixes — dynamic options, label/casing fixes | 2026-04-03 |
| Phase 2.5 | 18 materials, 10 engine improvements, speed-temp coupling | 2026-04-04 |
| Phase 2.5b | 5 nozzles, 6 advanced filters, 7 engine logic, simple/advanced input | 2026-04-05 |
| Phase 2.7a | Export functions (engine + iOS + web) — web UI disabled pending BS fix | 2026-04-05 |
| Phase 1 release blockers (RB-1–6) | Structured warnings, actor bridge, Sentry DSN, error handling, 18 tests, OutputView split | 2026-04-08 |
| Pre-release polish (BR-1–7) | Strings, export filenames, dark mode, retry UX, AppConstants, OutputView split, privacy | 2026-04-08 |
| App Store prep | CI fixed (SENTRY_DSN secret), export UI hidden, 9 screenshots taken, metadata finalized, /support + /privacy pages live | 2026-04-08 |
| CI cleanup | macos-26 runner, checkout@v5, Config.xcconfig.template, Xcode Cloud deleted | 2026-04-10 |
| Web bug fixes | Printer picker stays collapsed on mode switch | 2026-04-08 |
| Infra | App icon, auto build number, TestFlight, CI/CD, Sentry, Discord, GitHub Issues | 2026-04-04 |
| Web | iOS Beta signup wording updated, about/SEO updates | 2026-04-04–08 |
| Branding | App icon (clay Benchy), logo on web header + iOS home + all nav bars, website link on iOS home, OutputView nav bar cleanup | 2026-04-13 |
| BR-10 Cross-device UI review | UITest target + 33 screenshots across SE/17 Pro/17 Pro Max, 4 P0/P1 fixes (segmented control wrap, nav bar truncation, sticky checklist footer), App Store screenshots retaken. iOS commit `cbf0947`, web commit `bccfca4` | 2026-04-14 |
| BR-11 Feedback system | Native SwiftUI feedback sheet → Discord webhook (#3dpa-ios-feedback). 7 categories, 8 entry points, auto-attached device metadata, 9 new tests. iOS commits `5a5624a` → `ddb1416` (incl. SF symbol picker fix, alert visibility fix). Manual: `DISCORD_FEEDBACK_WEBHOOK` added to GitHub secrets | 2026-04-15 |
| BR-12 Empty-output hardening | OutputViewModel guard + scoped per-screen tap-1 reset. Final iteration after 2 over-corrections. iOS commits `a81281c` → `15c49da`. 5 new tests | 2026-04-15 |
| Pre-submission polish | Print Profile tab description double-render fix (`1a96f83`); BrandPicker default un-preselected (`f87b095`); Printer/Nozzle picker tap-1 now clears local `selectedId` checkmark (`f87b095`) | 2026-04-15 |
| App Store screenshots refresh | Recaptured on iPhone 17 Pro Max (1320×2868) post-BR-11 to show new feedback UI. Old set in `_backup-apr14/`. Web commit `02edd2f` | 2026-04-15 |
| App Store Connect submission setup | App Information + categories + age 4+ + content rights + pricing (Free, all 175 countries) + privacy nutrition (Diagnostics only) + v1.0 metadata + 9 iPhone 6.9" screenshots uploaded + build `202604151712` attached. Pending: iPad screenshots from real device + Add for Review | 2026-04-15 |
| 🚀 **App Store submission** | Build `f87b095` attached, fresh iPhone + iPad screenshots uploaded, App Review Information + Notes filled, Manual release selected, **submitted to App Review**. Status: "Waiting for Review". 13 days ahead of April 28 deadline | 2026-04-15 |
| ✅ **App Store APPROVED + released** | App approved same-day after ~24h review. Hit Release. Live in ~121 non-EU countries. EU blocked by DSA Trader Status — submitted as Business (CVR) same day. Generic link: `apps.apple.com/app/3d-print-assistant/id6761634761` | 2026-04-16 |
| **Discord server restructure** | Added `#announcements` (read-only), private `📥 owner inbox` category with `#ios-app-feedback` (renamed from `#3dpa-ios-feedback`) + new `#web-app-feedback`. iOS feedback webhook URL preserved through rename (Discord webhooks are channel-id-bound). Channel descriptions written for all 11 channels. Beta category deleted post-release. | 2026-04-16 |
| **Web feedback Tally→Discord migration** | Replaced Tally (obdMK1 form) with native `<dialog>` modal + Cloudflare Worker at `/api/feedback` forwarding to Discord `#web-app-feedback`. Mirrors iOS 7-category taxonomy + embed shape exactly. Secret `DISCORD_WEBHOOK_URL` stored in Cloudflare Pages env vars (not in bundle). Required adding `wrangler.toml` + `worker.js` because project had been migrated to Workers Builds (static-assets-only → assets+worker). 3 commits: `331124b` (dormant stack), `36f9131` (Worker entrypoint), `3856440` (card swap). Verified end-to-end via curl. iOS Beta signup Tally form left intact (deprecated — app is live, card to be retired). | 2026-04-17 |

---

## Architecture reference

### Stack
| Layer | Choice |
|-------|--------|
| UI | SwiftUI (iOS 17+) |
| Engine | JavaScriptCore + engine.js |
| Data | Bundled JSON (offline-first) |
| State | `@Observable` / `@State` |
| Navigation | NavigationStack |
| i18n | `.strings` (from `locales/en.json` + `da.json`) |
| Git | `mustiodk/3dprintassistant` (web), `mustiodk/3dprintassistant-ios` (iOS) |

### Data sync
| File | Rule |
|------|------|
| `engine.js` | Edit in web project → copy to iOS |
| `data/*.json` | Edit in web project → copy to iOS |
| `locales/*.json` | Edit in web project → convert to `.strings` for iOS |

**Rule:** Never edit engine.js or data/*.json in the iOS project.

### Key context for Claude Code sessions
- Module name: `PrintAssistant` (not `3DPrintAssistant`)
- `resolveProfile()` returns slicer params — NOT temperatures. Temps from `getAdjustedTemps()`.
- Valid environment values: `"normal"`, `"cold"`, `"vcold"`, `"humid"`
- Valid surface values: `"draft"`, `"standard"`, `"fine"`, `"maximum"`, `"very_fine"`, `"ultra"`
- Valid speed values: `"fast"`, `"balanced"`, `"quality"`
- Valid strength values: `"minimal"`, `"standard"`, `"strong"`, `"maximum"`
- XcodeGen: run `xcodegen generate` after changing project.yml
- CI: push to main → GitHub Actions → Fastlane → TestFlight
- 18/18 tests passing

---

## Research & prompts index

All docs live in `3dprintassistant/docs/`. Subfolders: `research/`, `prompts/`, `specs/`, `planning/`.

| File | What | Location |
|------|------|----------|
| Bambu Studio export spec (Gemini analysis) | Primary BS JSON reference | `docs/research/bambu-studio-export-spec-gemini.md` |
| Bambu Studio JSON schema | Field reference from GitHub source | `docs/research/bambu-studio-json-schema.md` |
| Gemini analysis prompt | Prompt used to analyze BS exports | `docs/research/gemini-bambu-analysis-prompt.md` |
| ChatGPT code/release review | 21-item iOS review | `docs/research/3dprintassistant_ios_master_release_review.md` |
| UI critique | Design review findings | `docs/research/UI-CRITIQUE.md` |
| #036 implementation spec | Data architecture + value correctness | `docs/specs/IMPL-036-profile-params.md` |
| UI v2 spec | Prototype v2 design spec | `docs/specs/UI-V2-SPEC.md` |
| Phase 2.7a export prompt | Claude Code prompt (needs rewrite) | `docs/prompts/phase-2.7a-export-prompt.md` |
| Phase 2.7b descriptions prompt | Claude Code prompt (ready) | `docs/prompts/phase-2.7b-descriptions-prompt.md` |
| Phase 2.5b prompt | Claude Code prompt (completed) | `docs/prompts/phase-2.5b-code-prompt.md` |
