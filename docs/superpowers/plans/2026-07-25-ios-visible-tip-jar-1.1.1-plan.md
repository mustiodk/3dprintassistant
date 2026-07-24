# iOS Visible Tip Jar 1.1.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver iOS 1.1.1 to TestFlight with native consumable StoreKit tips exposed visibly on Home and Output.

**Architecture:** A testable `TipJarStore` owns UI state and depends on a small `TipPurchasing` protocol. `StoreKitTipPurchaser` is the only StoreKit adapter; reusable SwiftUI `SupportCard` and `TipJarSheet` views consume the domain state. One store is injected by `ContentView` and shared by both entry points.

**Tech Stack:** Swift 5.9, SwiftUI, Observation, StoreKit 2, XCTest, XcodeGen, Fastlane/GitHub Actions.

## Global Constraints

- Marketing version is exactly `1.1.1`.
- Deployment target remains iOS 17.0.
- Product IDs are `dk.mragile.3DPrintAssistant.tip.small`, `.tip.nice`, and `.tip.spool`.
- Purchases are consumable, optional, and unlock nothing.
- No Ko-fi/external purchase link, subscription, restore action, account, backend, receipt upload, or tip analytics.
- English and Danish copy must match `2026-07-25-visible-tip-jar-design.md`.
- No `engine.js` or `Data/` change; twin engine/data parity must remain intact.
- The iOS push gate stays closed until all code, tests, review, project generation, release metadata, and App Store Connect product checks are green.

---

### Task 1: Build the tip-jar state machine with TDD

**Files:**
- Create: `3DPrintAssistant/Services/TipJarStore.swift`
- Create: `3DPrintAssistantTests/TipJarStoreTests.swift`

**Interfaces:**
- Produces: `TipProduct`, `TipPurchaseOutcome`, `TipPurchasing`, and `@MainActor @Observable final class TipJarStore`.
- `TipJarStore` API: `products`, `phase`, `purchasingProductID`, `load() async`, `purchase(_:) async`, `resetAcknowledgement()`.

- [ ] **Step 1: Write failing product-load tests**

Use a specific fake purchaser and hand-authored product values. Prove that
`load()` exposes products in stable small/nice/spool order and that load errors
produce the unavailable state.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
xcodegen generate
xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  -only-testing:3DPrintAssistantTests/TipJarStoreTests
```

Expected: compile/test failure because `TipJarStore` does not exist.

- [ ] **Step 3: Implement the minimal loading domain**

Define:

```swift
struct TipProduct: Identifiable, Equatable, Sendable {
    let id: String
    let displayName: String
    let displayPrice: String
    let sortOrder: Int
}

enum TipPurchaseOutcome: Equatable, Sendable {
    case success
    case pending
    case cancelled
}

protocol TipPurchasing: Sendable {
    func loadProducts() async throws -> [TipProduct]
    func purchase(productID: String) async throws -> TipPurchaseOutcome
}
```

Add a minimal observable store with `idle`, `loading`, `ready`, `unavailable`,
`pending`, and `thankYou` phases.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: all load tests pass.

- [ ] **Step 5: Write failing purchase-transition tests**

Cover verified success → thank-you, pending → pending, cancellation → ready
without error, failure → unavailable/error with retry, and concurrent purchase
suppression.

- [ ] **Step 6: Run focused tests and verify RED**

Expected: failures identify missing purchase transitions.

- [ ] **Step 7: Implement minimal purchase transitions**

`purchase(_:)` sets `purchasingProductID`, maps each outcome, clears in-flight
state on every path, preserves loaded products for retry, and ignores a second
tap while a purchase is active.

- [ ] **Step 8: Run focused tests and verify GREEN**

Expected: all `TipJarStoreTests` pass with zero failures.

### Task 2: Add the live StoreKit 2 adapter with TDD

**Files:**
- Create: `3DPrintAssistant/Services/StoreKitTipPurchaser.swift`
- Create: `3DPrintAssistantTests/StoreKitTipPurchaserTests.swift`

**Interfaces:**
- Consumes: Task 1 domain types.
- Produces: `StoreKitTipPurchaser` plus pure mapping/order helpers testable
  without performing a real purchase.

- [ ] **Step 1: Write failing identifier and ordering tests**

Prove that unknown products are excluded and known identifiers map to sort
orders 0, 1, and 2 independent of StoreKit return order.

- [ ] **Step 2: Run focused tests and verify RED**

Run the Task 1 command with
`-only-testing:3DPrintAssistantTests/StoreKitTipPurchaserTests`.
Expected: compile/test failure because the adapter does not exist.

- [ ] **Step 3: Implement product loading**

Call `Product.products(for:)` with the three stable identifiers, map StoreKit
`displayName` and `displayPrice` into `TipProduct`, exclude unknown IDs, and
sort by the stable order.

- [ ] **Step 4: Implement verified purchase handling**

Look up the selected loaded product, call `purchase()`, verify the transaction,
finish only verified successful transactions, map pending and cancellation,
and throw for missing products, unverified transactions, and unknown results.

- [ ] **Step 5: Run adapter and store tests**

Expected: both focused test classes pass.

### Task 3: Build the shared support UI

**Files:**
- Create: `3DPrintAssistant/Views/Support/SupportCard.swift`
- Create: `3DPrintAssistant/Views/Support/TipJarSheet.swift`
- Modify: `3DPrintAssistant/Utils/Strings.swift`
- Modify: `3DPrintAssistant/App/ContentView.swift`
- Test: `3DPrintAssistantTests/TipJarStoreTests.swift`

**Interfaces:**
- Consumes: the shared environment `TipJarStore`.
- Produces: reusable support card and native sheet.

- [ ] **Step 1: Add localized support strings**

Add a `Strings.Support` namespace with every English/Danish string from the
design spec. Keep StoreKit product names and prices out of local constants.

- [ ] **Step 2: Implement `SupportCard`**

Build one accessible button with `heart.fill`, title, message, chevron,
primary-dim surface, visible primary border, and an injected action.

- [ ] **Step 3: Implement `TipJarSheet`**

Use a navigation-style sheet that loads products in `.task`, renders each
product as a full-width purchase button, and displays deterministic loading,
unavailable/retry, pending, and thank-you states. Cancellation returns to the
product list silently. Add accessibility identifiers for the sheet, product
buttons, retry, and done controls.

- [ ] **Step 4: Inject one shared store**

Construct `TipJarStore(purchaser: StoreKitTipPurchaser())` once in
`ContentView.init()` and attach it with `.environment(tipJarStore)`.

- [ ] **Step 5: Build**

Run:

```bash
xcodegen generate
xcodebuild build -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro'
```

Expected: `BUILD SUCCEEDED`.

### Task 4: Add the visible Home and Output entry points

**Files:**
- Modify: `3DPrintAssistant/Views/Home/HomeView.swift`
- Modify: `3DPrintAssistant/Views/Output/OutputView.swift`

**Interfaces:**
- Consumes: Task 3 `SupportCard`, `TipJarSheet`, and environment store.
- Produces: `support.home.card` and `support.output.card` entry points.

- [ ] **Step 1: Add Home card and adaptive scrolling**

Place the support card directly below `Configure Print`. Wrap the Home content
in a geometry-backed vertical `ScrollView` whose inner stack has
`minHeight` equal to the viewport, preserving current spacing on tall devices
and allowing small devices to scroll.

- [ ] **Step 2: Add Output card**

Place the Output support card after `PrintProfileTabView` and before the
scroll stack's bottom padding.

- [ ] **Step 3: Attach the shared sheet**

Each view owns only an `isPresented` Boolean. Both sheets pass the environment
store to the same `TipJarSheet`; neither view owns purchase logic.

- [ ] **Step 4: Run focused simulator checks**

Verify Home on a small and current simulator, valid Output, sheet opening from
both cards, Dynamic Type, product loading/unavailable state, and dismissal.

### Task 5: Configure App Store Connect consumables

**Files:**
- No repository changes unless release documentation records IDs/status.

**Interfaces:**
- Consumes: App Store Connect app `dk.mragile.3DPrintAssistant`.
- Produces: three consumable IAP records matching the locked identifiers.

- [ ] **Step 1: Verify commercial agreements**

In App Store Connect, confirm Paid Applications, banking, and tax agreements
permit creating and testing consumable products. Do not claim tax treatment or
change legal settings.

- [ ] **Step 2: Create or verify the products**

Create the three identifiers as consumables if absent. Add English and Danish
display names/descriptions matching the small/nice/spool tiers, choose price
points nearest DKK 15/45/95, and leave them ready for submission with 1.1.1.

- [ ] **Step 3: Verify TestFlight product visibility**

After the binary is processed, confirm StoreKit returns all three localized
products in TestFlight. A zero-product response blocks acceptance.

### Task 6: Final verification, review, and 1.1.1 release

**Files:**
- Modify: `project.yml`
- Regenerate: `3DPrintAssistant.xcodeproj/project.pbxproj`
- Update: release/session documents required by the wrap protocol

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: reviewed `main`, successful TestFlight workflow, and processed
  1.1.1 build evidence.

- [ ] **Step 1: Bump and regenerate**

Set `MARKETING_VERSION: "1.1.1"` in `project.yml`, run `xcodegen generate`,
and verify both source and generated project contain 1.1.1.

- [ ] **Step 2: Run the full release suite**

Run unit/UI tests and the project's walkthrough/parity gates. Verify
`engine.js` and all mirrored data files remain byte-identical to web.

- [ ] **Step 3: Review the complete iOS diff**

Compare against the design and this plan. Fix every Critical or Important
finding and rerun the full release suite.

- [ ] **Step 4: Commit locally**

Stage only the approved iOS source, tests, generated project, and release
metadata. Commit with:

```bash
git commit -m "feat: add native tip jar for iOS 1.1.1"
```

- [ ] **Step 5: Open the iOS push gate**

Confirm all planned 1.1.1 work is landed, XCTest is green, walkthrough and
parity checks are green, version is bumped, App Store Connect products exist,
and the owner has already authorized this TestFlight dispatch.

- [ ] **Step 6: Push and dispatch**

```bash
git push origin main
gh workflow run testflight.yml --ref main
```

- [ ] **Step 7: Verify TestFlight**

Watch the exact workflow to a successful terminal conclusion. Then verify the
1.1.1 build is processed and visible in App Store Connect/TestFlight before
declaring the release train in goal.

