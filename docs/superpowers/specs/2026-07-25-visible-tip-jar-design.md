# Visible Tip Jar — Cross-Platform Design

**Status:** APPROVED by owner 2026-07-25.
**Release scope:** web production + iOS 1.1.1 TestFlight.
**Supersedes:** the Phase 1 entry-point and release details in
`docs/superpowers/plans/2026-07-11-monetization-phase1-tip-jar-plan.md`.

## 1. Product intent

3D Print Assistant is a polished product that is free to use. Asking users to
support its continued development is legitimate and should be visible,
confident, and transparent.

The tip jar is optional support, not a paywall:

- everything currently shipped stays free;
- tipping unlocks no features or status;
- no subscription, account, backend, entitlement, or recurring prompt is
  introduced;
- copy leads with the product remaining free and avoids guilt, urgency, or
  apology.

## 2. Locked entry points

### 2.1 Web navigation

Add `Support 3DPA ♥` directly to the right of `iOS App ↗` in the top
navigation. It opens `https://ko-fi.com/3dprintassistant` in a new tab with
`noopener noreferrer`.

The link uses a distinct support treatment based on the existing brand green.
It remains part of the horizontally scrollable navigation on narrow screens.
There is no footer-only fallback and no delayed prompt.

### 2.2 iOS Home

Add a full-width support card directly below the primary `Configure Print`
button and before `My Workshop` and `Product updates`.

English:

- title: `Support 3DPA`
- message: `3DPA is free — and stays free. A tip helps fund its continued development.`

Danish:

- title: `Støt 3DPA`
- message: `3DPA er gratis — og bliver ved med at være det. Et tip hjælper med at finansiere den videre udvikling.`

The card uses `heart.fill`, the existing primary green, a visible border, and a
chevron. It opens the native tip sheet. The Home layout must remain usable on
small iPhones by allowing vertical scrolling while preserving the current
centered composition on taller devices.

### 2.3 iOS Output

Add a full-width support card after all generated profile content, inside the
existing result scroll view.

English:

- title: `Was this profile helpful?`
- message: `Support the continued development of 3DPA with an optional tip.`

Danish:

- title: `Var profilen nyttig?`
- message: `Støt den videre udvikling af 3DPA med et valgfrit tip.`

It opens the same native tip sheet as Home. It is present on every valid result
but never opens automatically.

## 3. iOS tip sheet

The sheet is native SwiftUI and backed by StoreKit 2 consumable purchases.

### 3.1 Products

The stable App Store Connect product identifiers are:

- `dk.mragile.3DPrintAssistant.tip.small`
- `dk.mragile.3DPrintAssistant.tip.nice`
- `dk.mragile.3DPrintAssistant.tip.spool`

Product order is small, nice, spool. App Store Connect owns product display
names, localized descriptions, and prices. The UI must display StoreKit's
localized `displayName` and `displayPrice` instead of hard-coded currency.
Target Danish price points are approximately DKK 15, 45, and 95.

### 3.2 Sheet copy

English:

- title: `Support 3DPA`
- message: `Everything in 3DPA is free. If the app has helped you, you can support its continued development with a one-time tip.`
- loading: `Loading tip options…`
- unavailable: `Tip options are unavailable right now. Please try again.`
- retry: `Try Again`
- pending: `Your tip is pending approval.`
- success: `Thank you for supporting 3DPA!`
- done: `Done`

Danish:

- title: `Støt 3DPA`
- message: `Alt i 3DPA er gratis. Hvis appen har hjulpet dig, kan du støtte den videre udvikling med et engangstip.`
- loading: `Indlæser tipmuligheder…`
- unavailable: `Tipmulighederne er ikke tilgængelige lige nu. Prøv igen.`
- retry: `Prøv igen`
- pending: `Dit tip afventer godkendelse.`
- success: `Tak, fordi du støtter 3DPA!`
- done: `Færdig`

### 3.3 Purchase behavior

- Products load when the sheet appears, with idempotent reload behavior.
- Selecting a product disables the other purchase buttons until StoreKit
  returns.
- Verified purchases finish the transaction and show the success state.
- Unverified purchases fail closed and show a recoverable error.
- Pending purchases show the pending state without claiming payment.
- User cancellation returns to the options without an error alert.
- Other StoreKit errors show a concise recoverable error.
- Consumable tips do not expose a Restore Purchases action.

## 4. Architecture

`TipJarStore` is the testable observable UI state machine. It depends on a
`TipPurchasing` protocol.

`StoreKitTipPurchaser` is the production adapter. It loads products and maps
StoreKit results to domain outcomes:

- `success`
- `pending`
- `cancelled`

`TipProduct` is a small Sendable domain value containing identifier, localized
display name, localized price, and stable sort order. Views do not depend on
StoreKit's `Product` type.

`SupportCard` is a reusable view configured with title, message, accessibility
identifier, and action. `TipJarSheet` consumes the shared `TipJarStore`.

`ContentView` creates one `TipJarStore` per app launch and injects it into the
SwiftUI environment so Home and Output use the same product cache and
purchase state.

## 5. Accessibility and visual behavior

- Every support card is one button with an explicit accessibility label and
  identifier.
- Product buttons expose the localized product name and price.
- Progress, pending, success, and failure states have text equivalents and do
  not rely on color alone.
- The card uses existing typography, color tokens, corner radii, and spring
  press behavior; no new design system is introduced.
- Dynamic Type and small-device layouts must not clip purchase content or the
  Home entry point.

## 6. Privacy, analytics, and platform boundaries

- No tip analytics are added in this slice.
- No purchase receipt or user identifier leaves the device.
- The web uses Ko-fi only.
- The iOS app contains no Ko-fi or other external purchase link.
- No `engine.js` or `data/` change is allowed. Web and iOS engine/data mirrors
  must remain byte-identical.
- Android is out of scope and remains gated.

## 7. Release and acceptance

### Web

- Link is visible immediately after `iOS App ↗` in English and Danish.
- Destination is exactly `https://ko-fi.com/3dprintassistant`.
- Keyboard navigation, hover/focus, desktop, and narrow-screen behavior work.
- Existing web tests and walkthrough harness remain green.
- `engine.js` and `data/` are unchanged.
- The commit is pushed to `main`, Cloudflare Pages deploys it, and the live DOM
  and link are verified.

### iOS 1.1.1

- Unit tests prove product ordering, loading, success, pending, cancellation,
  unverified/failure behavior, and retry.
- Home and Output expose the shared sheet.
- XCTest and the relevant walkthrough/simulator checks are green.
- `MARKETING_VERSION` is exactly `1.1.1` in generated and source project files.
- The three matching consumable IAP records exist in App Store Connect with
  English and Danish localizations before TestFlight acceptance testing.
- The iOS push gate remains closed until code, tests, project generation,
  review, and release metadata are complete.
- Once green, push `main`, dispatch `testflight.yml`, and verify the workflow
  succeeds and the build appears in TestFlight/App Store Connect.

## 8. Rollback

- Web: revert the isolated navigation commit.
- iOS UI: ship a follow-up binary with the support cards removed.
- iOS products: remove the consumables from sale in App Store Connect without
  changing existing app functionality.

