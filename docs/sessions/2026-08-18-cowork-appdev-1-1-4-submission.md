# 2026-08-18 — Cowork (appdev): 1.1.4 submitted to App Review

*Session ran 2026-08-18 evening into 2026-08-19 ~00:30. Second session of 08-18 —
the earlier one is `2026-08-18-cowork-appdev-intake-hi-ship-and-correction.md`.*

## Durable context

- **iOS 1.1.4 is `Waiting for Review`** — build `202608182214`, commit `991deba`,
  **Manual Release** selected. Nothing auto-ships; releasing is a deliberate owner
  action after approval. Live before this was 1.1.3 (released 2026-07-31).
- **Three TestFlight builds were burned in one evening, all on version `1.1.4`.** No
  MARKETING_VERSION bump — Fastlane's `%Y%m%d%H%M` build number already makes each
  upload unique, per the 2026-07-25 release-train rule. `202608182137` and
  `202608182151` are dead; only `202608182214` was submitted.
- **The nozzle-picker bug is pre-existing and still live in 1.1.3.**
  `NozzlePickerView` called `getCompatibleNozzles(material)`, never the printer-aware
  `getCompatibleNozzlesForPrinter`, so *every* printer offered all nine nozzles. The
  engine has been correct since v1.0.4 and the web walkthrough harness has asserted on
  it the whole time — no UI consumer called it. **The web app has the identical gap at
  `app.js:1536` and was deliberately left unfixed** (owner chose iOS-only); a task chip
  was filed. Anyone touching web nozzle UI should read finding
  `2026-08-18-green-suite-never-touched-the-screens.md` first.
- **Both defects were found by the owner's thumb, not by 213 passing tests.** The suite
  had no test that drove a screen and asked "does this scroll?" or "is this row
  selectable?". Four such tests now exist (218 total). The structural gap — proving a UI
  consumer calls the right engine function — is narrowed, not closed.
- **Gesture changes on these screens are high-risk.** The brand-scroll bug was caused by
  `.simultaneousGesture(DragGesture(minimumDistance: 0))` starving the ScrollView. The
  edge-swipe-back feature was therefore built with a UIKit
  `UIViewControllerRepresentable` that hands the delegate back to
  `interactivePopGestureRecognizer`, **not** a SwiftUI gesture. Do not "simplify" it into
  a `DragGesture` — that reintroduces the exact defect.
- **The prepared submit doc was not sufficient at submission time.** Two claims outside
  its governed blocks had gone false: the Description's "66 of the 78 supported printers"
  (actual: 66 of 83) and inherited App Review Notes claiming this version submits three
  IAPs for the first time (it submits none — ASC auto-carries notes from the previous
  version). Read the live ASC field values before pasting, always.

## What happened / Actions

1. Cold start; health flagged `3dprintassistant-ios: 3 unpushed` — data commits made
   after the 08-13 build, so not in it.
2. Recounted public claims against the exact build: 81 printers / 14 brands / 19
   filaments / 9 nozzles. Diffed the catalog against the 1.1.3 shipping commit
   `2be10a40`: **five** printers added since live (78 → 83), not the three the prepared
   What's New listed — `ender_3_s1_pro` and `hi` were both missing. Corrected.
3. Owner asked for a fresh build including the unpushed work → gate run (213/213,
   Release build, parity clean), pushed, dispatched build `202608182137`.
4. **NO-GO 1:** brand grid would not scroll when the swipe started on a card. Root cause
   `BrandCard`'s zero-distance `DragGesture`. RED test (`0.0pt` moved) → `BrandCardButtonStyle`
   using `configuration.isPressed` → GREEN. Build `202608182151`.
5. **NO-GO 2:** Creality Hi offered a 0.8 mm nozzle. Root cause: picker called the
   material-only engine function. Verified empirically in node that the printer-aware
   variant returns the right answer and that the output still warns
   (`nozzle_not_on_printer`) — so this was a picker UX gap, not a bad-profile hole.
   Owner chose "fix iOS now". Fixed + row copy corrected to name the printer as the
   reason. Owner then asked for edge-swipe-back; premise verified RED first. Build
   `202608182214`.
6. Owner tested clean, authorised submission, went to bed. Drove ASC end-to-end:
   created version 1.1.4, corrected the two stale copy claims, pasted texts, attached
   the build, set Manual Release, verified App Privacy, submitted. **1 Item Submitted.**

## Files touched

**Modified (iOS):** `NozzlePickerView.swift`, `BrandPickerView.swift`, `EngineService.swift`,
`PrinterPickerView.swift`, `MaterialPickerView.swift`, `GoalsView.swift`, `OutputView.swift`,
`EngineServiceTests.swift`, `ScreenCaptureUITests.swift`, `project.pbxproj`,
`docs/app-store-v1.1.4-submit.md`
**Added (iOS):** `3DPrintAssistant/Views/Components/EdgeSwipeBack.swift`
**Added (ai-om):** two findings + `findings/INDEX.md`

## Commits

iOS `ddb23f6..1e3de11` — 12 commits, all pushed. Fixes: `5065ca5` (brand scroll),
`7c695d9` (nozzle filtering), `e9a60a9` (edge-swipe back).
Parent: `a7f0a34`, `ce4b52b` (findings).

## Open questions / Follow-up

- **Web nozzle picker still has the bug** (`app.js:1536`). Task chip filed. Owner's call
  when to take it; leaving it means web and iOS behave differently.
- **`promotionalText` is empty** on both 1.1.3 and 1.1.4, though
  `docs/app-store-v1.1.0-submit.md` records a ratified 114-char promotional text as
  locked for 1.1.0. Either never applied or later cleared. Left empty (plan said
  "unchanged") — owner should decide whether to author one; it needs no new build.
- **The approved `WHAT'S INCLUDED` block partly duplicates the Description's existing
  `EXPORT STRAIGHT TO YOUR SLICER` section** (both describe native export). The block was
  drafted in the 1.1.0 era against a different Description. Cosmetic, shipped as
  approved; worth tidying next release.
- **Findings:** [`2026-08-18-green-suite-never-touched-the-screens.md`](../../../ai-operating-model/docs/findings/2026-08-18-green-suite-never-touched-the-screens.md)
  and [`2026-08-18-prepared-submission-doc-went-stale-against-live-copy.md`](../../../ai-operating-model/docs/findings/2026-08-18-prepared-submission-doc-went-stale-against-live-copy.md).
- **md-hygiene:** clean — no stray `</content>` tags, no untracked docs, no
  `CLAUDE.md`/`AGENTS.md` drift, findings INDEX parity OK.

## Next session

Watch for the App Review outcome (email; up to 48h). On approval, **the release is a
manual action** — Manual Release was deliberately selected. After releasing, verify the
Danish storefront reports 1.1.4 before closing any release claims.
