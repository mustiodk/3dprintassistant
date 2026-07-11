# 2026-07-11 — Monetization: strategy decision + Phase 1 tip-jar plan

**Status:** APPROVED by owner 2026-07-11 (brainstorm session, matrix + recommendation accepted).
**Scope:** decision record + Phase 1 executable outline. No code in this session. Phase 1 iOS work is its own release train (1.0.8) AFTER the locked export sequence + iOS 1.0.7 issue-fix release. Web track is independent and can ship anytime.

---

## 1. Strategy decision (owner-ratified)

**Model: A + B phased — tip jar now, Pro unlock when filament inventory lands.**

- **MD0 — Everything currently shipped stays free, forever.** Configurator, Workshop, export (Bambu/Orca/Prusa as they land), troubleshooter. Never retro-paywall a shipped feature — community-trust asset, say it loudly in any monetization copy ("3dpa is free and stays free").
- **MD1 — Phase 1 = tip jar** (this plan): iOS IAP consumable tips + web Ko-fi link. Goal is cost-cover + willingness-to-pay signal, NOT side income. Zero backlash budget.
- **MD2 — Phase 2 = "3dpa Pro" one-time unlock**, anchored on the filament-inventory feature when it lands (bambuinventory's evolution into 3dpa). Candidates: inventory, custom filaments (W4), future cloud sync, multi-printer fleet views. One-time non-consumable IAP, ~49–99 kr. NOT a subscription (community subscription-fatigue; no per-user service cost to justify it). Deferred — no spec yet by design.
- **MD3 — No accounts / no backend.** StoreKit 2 on-device entitlements (iOS), Play Billing later (Android). Web stays free-tier; web-Pro/license keys is an explicitly deferred decision.
- **MD4 — Rejected options:** subscription (C) and retro-paywalling Workshop/Export (D) — see session log for the matrix.

### Platform/legal constraints the decision is built on

- Apple 3.1.1: developer donations + feature unlocks in-app MUST be IAP. No Ko-fi/PayPal/MobilePay links inside the iOS app. Ko-fi is web-only surface.
- Small Business Program → 15% commission (owner enrolls; well under $1M/yr).
- Apple = merchant of record for IAP → Apple handles consumer VAT worldwide; owner declares payouts as income.
- Denmark (flag, verify with Skattestyrelsen before first payout year-end): tips + IAP payouts = taxable income (hobbyvirksomhed / B-indkomst path; deduct Apple dev fee, domain, infra). Moms registration threshold DKK 50k/12mo; **open question: whether Apple EU-B2B payouts require moms registration for reverse-charge/EU-sales reporting even below the threshold.** Ko-fi donations = plain personal income, no VAT scope.
- Skip MobilePay (personal = not for commercial donations; MyShop needs CVR; audience is global anyway). Ko-fi covers DK donors.

## 2. Phase 1 spec (approved shape)

**Tip tiers (iOS IAP, consumable ×3):** Small tip 15 kr · Nice tip 45 kr · Big spool 95 kr (Apple price points; ≈ $2/$6/$13 worldwide). Spool-themed copy ("buy me a spool"), not coffee-generic.

**Entry points (both platforms, zero recurring prompts):**
- iOS: one "Support 3dpa" row in Settings + a line in About.
- Web: footer "Support 3dpa ☕" link + About section link → Ko-fi.
- **One lifetime contextual card** after the user's **10th generated profile** (local state only — both platforms already persist app state; no backend). Copy: value-anchored, no-pressure, "free and stays free". Dismiss ⇒ never shown again (flag in local state / `3dpa_state_v1`-adjacent). One impression per install lifetime.
- Explicitly NOT: toolbar/nav heart icon, post-generation purchase prompts, any nag loop.
- After tipping (iOS): simple thank-you state + optional small ❤️ on the Settings row. No feature differences (that's Phase 2).

**Standing-rule evaluation (data/logic change):** Phase 1 touches NO engine.js and NO data/ — app-layer UI + StoreKit only. The 10th-profile counter must be derived app-side (web `app.js` local state; iOS app state), not engine state. Web/iOS impact evaluated: web gets footer/About/card; iOS gets Settings/About/card/StoreKit. No byte-mirror implications.

## 3. Tracks + sequencing

### Track W — web Ko-fi (independent, anytime; ~half a day)
1. **Owner prerequisite: create Ko-fi account** (free tier, 0% platform fee, PayPal or Stripe payout — both DK-fine). Provide the ko-fi.com/URL.
2. Footer + About link (EN+DA locale strings), 10th-profile lifetime card in `app.js` (local-state flag), style.css addition. No engine/data diff (prove with golden/walkthrough as usual).
3. Normal web gates: walkthrough harness green, no engine diff, auto-deploy, live-verify.

### Track I — iOS tip jar = release train 1.0.8 (AFTER 1.0.7 ships; ~1–2 days on the mac-mini)
1. **Owner prerequisites (start now — days of lead time, gate everything):**
   - Sign **Paid Applications agreement** in App Store Connect (Business).
   - Complete **ASC banking + tax forms** (payout account, tax residency, US tax form).
   - Enroll in the **Small Business Program** (15%).
2. Create 3 consumable IAP products in ASC (ids e.g. `tip.small` / `tip.nice` / `tip.spool`).
3. Implement: StoreKit 2 tip store service + Settings "Support 3dpa" row + About line + 10th-profile lifetime card + thank-you state. XCTest for tier loading/purchase-flow state machine (mocked) + card show-once logic. TDD RED-first per project rules.
4. Full release gates: XCTest green, walkthrough parity where applicable, `MARKETING_VERSION=1.0.8`, TestFlight dispatch, owner on-device acceptance (incl. sandbox purchase), App Store submission. **iOS push gate applies as always.**
5. App Review note: tip jar is a known-clean pattern; ensure restore-purchases isn't required (consumables don't restore) and the card is demonstrably one-time.

### Phase 2 seeds (record only — no action now)
- Android v1 (gated on AG0): when AG-work starts, leave architectural room for a Play Billing entitlement check. Do NOT touch the gated planning bundle for this; this line is the seed.
- Pro unlock spec happens when filament inventory is scoped for 3dpa.

## 4. Acceptance / exit gates for Phase 1

- Web: Ko-fi link live + card ships with zero engine/data diff (golden proof) — live-verified.
- iOS: 1.0.8 on the App Store with 3 working tip products (sandbox-verified + owner live acceptance).
- Copy in EN + DA on both platforms.
- ROADMAP updated when each track ships; first-payout tax question resolved before first year-end with revenue.

## 5. Rollback

- Web: revert commit (footer/card are isolated app-layer changes).
- iOS: IAP products can be removed from sale in ASC without a binary; card/row removal = normal release train.
