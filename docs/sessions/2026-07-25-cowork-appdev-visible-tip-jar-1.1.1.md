# 2026-07-25 — Cowork (appdev): Visible tip jar + iOS 1.1.1

## Durable context

- The owner explicitly wants monetization to be visible and matter-of-fact: web navigation carries `Support 3DPA ♥` immediately after `iOS App ↗`, while iOS shows a native StoreKit support card on both Home and Output.
- Web uses the owner-provided Ko-fi page. iOS deliberately uses three native consumable in-app purchases instead of an external payment link; there is no entitlement, restore flow, account, backend, or analytics dependency.
- StoreKit pending purchases are completed by a long-lived `Transaction.updates` listener. Only verified transactions are finished; unverified transactions fail closed.
- App Store Connect product configuration is idempotent and release-gated. The first live CI attempts exposed two API contracts that are now regression-tested: inline included resources use `${prices-id}`, and localized IAP descriptions are at most 55 characters.
- App Review screenshots are still missing for the three IAPs. That does not block TestFlight/sandbox testing, but each product needs its review screenshot before a later App Store submission.

## What happened / Actions

- Approved a revised visible-tip-jar design and separate web/iOS implementation plans.
- Added the visible web support link, EN/DA localization, keyboard focus styling, mobile overflow coverage, and exact DOM contract tests.
- Built the native iOS tip jar for Home + Output with three DKK consumables (15 / 45 / 95), purchase-state UI, cancellation/pending/error handling, verified transaction finishing, app-lifetime pending completion, and focused unit/UI coverage.
- Added an App Store Connect API script to create and verify product IDs, exact EN/DA metadata, Danish base pricing, all current/future territories, and a TestFlight-compatible product-state whitelist.
- Independent implementation review first returned NO-GO on missing `Transaction.updates` handling and insufficient existing-product verification. Both findings were fixed separately and the re-review returned GO.
- Two fail-closed CI attempts stopped before archive/upload on App Store Connect contract errors. Each was root-caused, reproduced with a failing test, fixed narrowly, independently re-reviewed, and committed separately.
- Web `main` was pushed and production HTML was curl-verified with the exact Ko-fi URL.
- iOS `main` was pushed only after all local release gates were green. GitHub Actions run [30133756519](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/30133756519) configured/verified all products, archived, uploaded, processed, and distributed iOS **1.1.1 build `202607242327`** to internal TestFlight testers.

## Files touched

### Web

- `index.html`, `app.js`, `styles.css`, `locales/en.json`, `locales/da.json`
- web DOM/locale tests
- visible-tip-jar design + web/iOS plans

### iOS

- `Services/TipJarStore.swift`, `Services/StoreKitTipPurchaser.swift`
- `Views/Support/SupportCard.swift`, `Views/Support/TipJarSheet.swift`
- Home, Output, ContentView, strings, unit tests, UI tests, project config
- `.github/workflows/testflight.yml`, `fastlane/Fastfile`
- `scripts/configure_tip_products.rb` + focused tests

## Commits

### Web

- `204c3a9` — docs: approve visible tip jar release plan
- `622bf38` — feat: add visible Ko-fi support link

### iOS

- `2571f5e` — chore: ignore local worktrees
- `a9c43a7` — feat: add native tip jar for iOS 1.1.1
- `3776505` — fix: finish approved pending tip transactions
- `e720134` — fix: fail closed on tip product configuration drift
- `b148d24` — fix: use local price schedule resource id
- `a0f70c1` — fix: enforce App Store metadata length

## Open questions / Follow-up

- Owner acceptance: install TestFlight 1.1.1 and test Small / Nice / Filament Spool purchase behavior plus Home/Output presentation on a physical device.
- Before App Store submission, capture and attach the required review screenshot for each IAP, then rerun the exact release gates.
- Md-hygiene: the stale ROADMAP “tip jar parked / 1.2.0 recommended” row was promoted to the verified 1.1.1 TestFlight state. No root stubs, untracked docs, tracked credential files, duplicate active plans, protocol drift, session-index orphans, or stray `</content>` artifacts required owner action.
- Lesson spotter (compact): one candidate — the two first-live App Store Connect contract discoveries. No new finding accepted: the fail-closed gate behaved as designed, both contracts are now product-local regression tests, and no K1/K2/K3/K4 or MCP mismatch occurred.
- Verify-before-mutate summary (verbatim): `verify-before-mutate ledger: no entries this session`
- Memory sweep: no durable personal/cross-session memory proposed; the product rationale and release evidence live in the design, ROADMAP, and this log.
- Vault sweep: nothing durable to propagate.

## Next session

Start from owner testing of TestFlight **1.1.1 build `202607242327`**. Do not change or reship 1.1.0. If the owner reports a defect, reproduce it against this exact build, fix TDD-first, obtain fresh review, and ship a new reviewed build. If owner acceptance is green and App Store release is requested, collect the three IAP review screenshots before submission.
