# macOS companion assessment — 3D Print Assistant on the Mac (second priority, sequenced AFTER Android)

**Date:** 2026-07-08 · **Status:** assessment + phased recommendation (deliberately light — per owner scoping, this must not bloat the Android work) · **Owner decision point:** phase M2 only; M0/M1 are near-free
**Inputs:** platform research 2026-07-08 (WWDC 2025/2026 signals, distribution + entitlement facts verified) · [`2026-07-08-android-v1-design.md`](2026-07-08-android-v1-design.md) (sequencing) · parked iOS v2 bundle (architecture leverage)

## 1. Honest framing

The web app already serves every Mac user fully at 3dprintassistant.com. A macOS app earns its keep only through: offline use, dock/Spotlight presence, drag-out profile exports, and App Store discoverability ("also on Mac"). Real but modest for a configurator tool — which is why this stays light and sequenced last.

## 2. Route assessment (facts verified mid-2026)

| Route | Verdict | Why |
|---|---|---|
| **"Designed for iPad"** (iOS app on Apple-silicon Macs) | **DO NOW — likely already on** | iOS apps are available on Apple-silicon Macs **by default** unless "Mac Availability" was unchecked in App Store Connect → Pricing & Availability. 3dpa iOS may be installable on M-series Macs today. Limitations: iPad-shaped window, "Not verified for macOS" badge, no Intel. Zero effort; credible stopgap, not a "Mac app". |
| **Native macOS SwiftUI target** (multiplatform target sharing iOS sources) | **The eventual real answer — ride the iOS v2 un-park** | JavaScriptCore is a native macOS framework (engine.js runs unchanged); `@Observable` works macOS 14+. Effort is days-to-weeks of platform conditionals *if the shared code was architected for it* — which is exactly what the parked iOS v2 architecture (feature folders, dumb views, isolated navigation) provides and the current v1.0.7 god-file architecture does not. Building macOS off v1.0.7 sources would triple-fork the debt iOS v2 exists to fix. |
| Mac Catalyst | Skip | Not deprecated (verified: no WWDC 2025/2026 deprecation), but it exists to port UIKit apps; a SwiftUI app gains nothing over a real macOS target. |
| Web wrapper (Electron/WKWebView shell) | Skip | Adds maintenance, no capability over the live web app. (Same verdict as the Android WebView prototype.) |

**Distribution:** Mac App Store (existing $99/yr membership covers it — no extra fee; App Sandbox required; note **`com.apple.security.cs.allow-jit` entitlement** for JavaScriptCore under hardened runtime). Developer ID + notarization + Sparkle is more infra for no store presence — wrong trade for a free, sandbox-friendly app. **Default: Mac App Store.**

## 3. Phased recommendation

- **M0 (owner, ~5 minutes, anytime):** check App Store Connect → 3D Print Assistant → Pricing & Availability → **Mac Availability**. If on (the default), the iOS app is already installable on Apple-silicon Macs — verify it launches and the JSCore engine runs on one of the owner's Macs; that IS the interim macOS presence. If it was unchecked, decide whether to enable (recommended: yes — free reach, clearly badged as iPad-designed).
- **M1 (standing constraint on future iOS work, zero sessions now):** when the iOS v2 program un-parks, its architecture gates carry a "keep views platform-agnostic, isolate navigation idioms" note — the single choice that makes M2 a short project instead of a port. (The parked iOS v2 spec's D4 feature-folder + dumb-views shape already satisfies this; this doc just pins the *why*.)
- **M2 (the actual macOS app — owner decision AFTER Android v1.0.0 is live):** add a native macOS destination to the iOS v2 multiplatform target; adapt navigation (split-view/sheets over push), window sizing (`defaultSize` + minimums), hover states, Settings scene; ship via Mac App Store. Scope it as its own short spec+plan then (a ~2–4 session program IF it rides the iOS v2 architecture; do not start it from v1.0.7 sources).

**Sequencing is explicit:** nothing here blocks or feeds Android AG0–AG8. M0 is a 5-minute owner check that can happen whenever; M2 is not planned further until Android ships and iOS v2's fate (un-park or fold its content into maintenance) is decided — planning M2's details today would be planning against a codebase that doesn't exist yet.

## 4. What this assessment deliberately does NOT do

No gate map, no session estimates beyond the M2 order-of-magnitude, no design decisions beyond route + distribution defaults — those belong to a future M2 spec written against the then-real iOS codebase. This document exists so the macOS question has a recorded, evidence-based answer and a parking place that doesn't leak scope into the Android program.
