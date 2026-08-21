# 3D Print Assistant 2.0 — Program Plan

**Purpose.** One place that answers: what is 2.0, what does it contain, what is actually
ready, and what has to be written before anything else gets built. This is the
**high-level** surface. Every feature below points at its own spec and plan; this file
does not duplicate them.

**Created:** 2026-08-21. **Owner:** Musti. **Status:** draft for owner review — the
readiness table is verified, the sequencing is proposed.

---

## 1. What 2.0 is, in plain English

Today the app is a configurator: answer a set of questions, get a slicer profile. 2.0 turns
it into something you **return to** rather than something you visit.

Four ideas, and they build on each other:

1. **My Gear** — stop re-answering the questions that never change. Save your printer +
   nozzle + material combinations as shortcuts.
2. **Cloud sync** — your gears and saved profiles follow you between your iPhone, iPad and
   Mac. No login; it rides your own iCloud.
3. **AI Expert** — a chat assistant that knows your printers and your saved profiles, and
   answers in the app's voice rather than sending you to Reddit.
4. **Pro** — the first real paid tier. Cloud sync and AI Expert are what you buy.

Plus the surfaces those need: a **tab shell** to hold them, **light mode**, and a
**Settings screen**.

**Two more features come after 2.0 ships**, free, for people who already bought Pro:
**Filament Inventory** and **Printer Link** (reading your printer's state over the local
network).

---

## 2. The binding decisions already taken

These are settled and should not be re-litigated. Source:
[`../reviews/2026-08-20-gear-model-owner-decisions.md`](../reviews/2026-08-20-gear-model-owner-decisions.md).

| # | Decision |
|---|---|
| **D18** | **2.0 ships as ONE release.** Splitting it was proposed and rejected on commercial grounds: Pro has to feel worth its price on launch day. |
| **D18a** | Inventory and Printer Link must **not** be marketed as "coming soon" at the point of purchase — App Store rejection risk (2.1(a), 2.3.1(a), 3.1.2(a), verified). Pro sells what works on the day; the rest arrives later as free additions announced outside the store listing. |
| **D16** | **Cloud sync needs no login** — it uses the device's own iCloud account. This removed accounts *and* the backend from 2.0 entirely. |
| **D15** | Sync is the Pro feature. |
| **D14** | **Web ships gear when it is complete**, not held for the 2.0 release. Web and iOS are decoupled here. |
| **D1–D13, D17** | The gear model itself: a gear is a shortcut, not an inventory. |
| **D18b** | **Inventory is local-first and iCloud-synced.** No server, no accounts. `bambuinventory` stays your private tool. |
| **D19** | **Pro contains cloud sync, Inventory, and access to AI Expert** (credits sold separately). Price set before go-live. Reverses `SYN-01`'s "Inventory is free". **D18a still governs the launch listing:** Inventory ships after 2.0, so day-one Pro is sold on sync + AI Expert only. |
| **D20** | **Pro is a one-time purchase** and **ships with free starter credits**; the number waits on what a credit is worth. Closes the 3.1.2(a) exposure — that guideline governs subscriptions. Credit packs are the app's first **consumables**, which ASC requires to ship in the same submission as an app version. |

**The standing frame:** the 2.0 UI design is a *design document*, not requirements. Every
build-vs-design mismatch is a question for you.

---

## 3. Readiness — what actually exists today

Verified against the repo on 2026-08-21. **This is the important table.**

| Feature | Decided | Spec | Plan | Built | Gap |
|---|---|---|---|---|---|
| **My Gear** | ✅ D1–D13 | ✅ [gear model v2](../superpowers/specs/2026-08-20-gear-model-v2-spec.md) **RATIFIED** | ✅ [web plan](../superpowers/plans/2026-08-21-train1-web-gear-plan.md), gated | 🟡 **web storage + logic done**; no UI | Web UI (Tasks 6–9); **iOS: nothing** |
| **Cloud sync** | ✅ D15, D16 | ✅ [sync v1](../superpowers/specs/2026-08-20-sync-v1-spec.md) **RATIFIED** | ❌ none | ❌ | **Implementation plan.** 3 open items must be answered first (§5) |
| **AI Expert** | ✅ shape + credit model agreed (D19, D20) | 🟡 [ai-buddy](../superpowers/specs/2026-08-17-ai-buddy-design.md) **DRAFT**, not ratified | ❌ none | ❌ | Ratify the spec, then a plan. **Needs a backend + credit accounting** — the one remaining infrastructure gap. Credit *mechanics* are specified; only the exchange rate is open, pending D2 (O6) |
| **Pro tier** | ✅ D15, D18, **D19 (contents)** | ❌ **none** | ❌ none | 🟡 StoreKit exists from the Tip Jar | **Spec needed** — now unblocked: contents are settled, price is a named value filled in before go-live. Still to define: purchase flow, entitlement, lapse behaviour |
| **Tab shell** | 🟡 iOS only | 🟡 in [2.0 design](../superpowers/specs/2026-08-20-ios-2.0-quiet-instrument-panel-design.md) | ❌ none | ❌ | **Web has no equivalent decision.** Web has 4 views and no Home |
| **Light mode** | ✅ design done | 🟡 tokens in the 2.0 design spec | ❌ none | ❌ | iOS: 6 dark locks + ~49 hardcoded colour sites. **Web light theme fails WCAG AA today** (§6) |
| **Settings screen** | 🟡 in the design | 🟡 artboard only | ❌ none | ❌ | **Spec needed**: what it contains |
| **Font bundling (iOS)** | ✅ decided | — | ❌ none | ❌ | ~1h. Retroactively fixes 17 call sites silently rendering San Francisco since launch |
| **Inventory** | ✅ D18b | 🟡 [platform §3](../superpowers/specs/2026-08-17-next-gen-platform-design.md) draft | ❌ none | ❌ | **After 2.0.** Free-vs-Pro unresolved (§5) |
| **Printer Link** | ✅ D18c | ❌ none | ❌ none | ❌ | **After 2.0.** iOS-only by nature; `bambuinventory/printer_sync.py` is a working reference |

**Read the table this way:** of the seven things in the 2.0 release, **two have ratified
specs, one has a draft, and four have nothing.** Only one has an implementation plan.

---

## 4. What was built today, and where it leaves us

**Shipped to production (bug fixes, unrelated to 2.0 features):** eight defects in
`workshop-store.js`. Deleting a saved profile left no record of the deletion; logging a
print outcome overwrote edits you made deliberately; a version mismatch could wipe saved
data; the Backup button could produce a valid-looking empty file. These were real and are
live.

**Built but invisible (My Gear, web):** `gear-store.js` (the storage format, **frozen and
cleared** after five review rounds) and `gear-validate.js` (checking and applying a saved
gear). **Nothing in the app looks different.** The UI — Tasks 6–9 — is not started.

**This is a clean stopping point.** The irreversible part (the storage format) is done and
correct. Everything remaining is reversible.

---

## 5. Open decisions

Three of the original four are answered. What is left does not block writing specs.

| # | Question | Blocks | Type |
|---|---|---|---|
| ~~**O1**~~ | ~~Is Inventory free or Pro?~~ **ANSWERED 2026-08-21: Pro.** Deliberately reverses `SYN-01`'s "free" clause — see [D19](../reviews/2026-08-20-gear-model-owner-decisions.md). | — | resolved |
| ~~**O2a**~~ | ~~What does Pro contain?~~ **ANSWERED 2026-08-21: cloud sync, Inventory, and access to AI Expert — credits sold separately.** | — | resolved |
| **O2b** | **What does Pro cost?** Deferred by the owner to before go-live. **Shape is settled: one-time purchase** (D20), so the Pro spec is unblocked; only the number waits, and it gates App Store product creation rather than specification. | App Store setup | **Yours** — pricing |
| ~~**O5**~~ | ~~Does Pro include a starter allowance of AI Expert credits?~~ **ANSWERED 2026-08-21: yes** (D20). The number is pending O6. | — | resolved |
| **O6** | **What is one credit worth?** The mechanics are already specified — per message, text and photo priced differently, price shown before sending, failed sends never charge. What is missing is the exchange rate, and the AI Expert spec already names its source: **D2, dated cost modelling for the chosen model**. Research, not a decision. | Credit limit, pack prices, starter allowance | **Mine** — I can run D2 |
| ~~**O3**~~ | ~~Does web get a tab shell?~~ **ANSWERED 2026-08-21: no, and web does not wait for iOS.** Web My Gear is a **standalone deliverable** in the existing Configure view. iOS will be its own thing and may reuse ideas, not code. Consistent with D14. | — | resolved |
| **O4** | Three technical items deferred from the sync gate: tombstone location, whether archived rows belong in backups, and a spec-wording fix. | Sync plan | **Mine** — I resolve these with a gated analysis |

---

## 6. Known live defects, unrelated to 2.0

Worth fixing regardless of what 2.0 does. Neither is scheduled.

- **Web nozzle picker offers all nine sizes on every printer.** `app.js:1546` calls the
  material-only function. Creality Hi (0.4/0.6 only) lists 0.8 mm as mountable. iOS was
  fixed 2026-08-18; web was deliberately left. **One line.**
- **Web light theme fails WCAG AA.** Green `#009a6a` measures 3.60:1 and link `#0b7fc4`
  measures 4.33:1 on white. The 2.0 design spec already contains corrected values that
  pass, and adopting them would make web and iOS agree for the first time.

---

## 7. Proposed sequence

The principle: **write the specs that are missing before building anything else**, because
D18 says 2.0 ships as one release — so a feature that turns out to need a backend, or a
decision you have not made, stalls the whole train.

### Phase A — close the decisions
O1, O2a and O3 are **answered**. What remains: **O2b** (price and one-time-vs-subscription,
which you have deferred to before go-live) and **O5** (whether Pro includes any AI Expert
credits). Neither blocks writing the Pro spec. O4 I resolve myself.

### Phase B — write the missing specs (~3–4 sessions)
In this order, because each constrains the next:

1. **Pro tier** — what is bought, price, entitlement, lapse behaviour. Everything
   commercial depends on it.
2. **AI Expert ratification** — the draft exists; it needs your review and the backend
   question answered. **This is the long pole**: it is the only remaining piece needing
   infrastructure.
3. **Settings + tab shell + light mode** — one spec covering the 2.0 shell, since they are
   the same surface.
4. **Sync implementation plan** — spec is ratified; needs O4 answered first.

### Phase C — build (order deliberate)
0. **Finish My Gear on web** (Tasks 6–9) — **IN PROGRESS, runs in parallel with Phase A/B.**
   Standalone per D14 and the 2026-08-21 O3 answer. It is the cheapest test of whether the
   gear model survives contact with real use, before iOS commits to it.
2. **iOS prerequisites** — font bundling, light-mode migration. Cheap, unblocks all iOS UI.
3. **The 2.0 iOS release** — shell, My Gear, sync, AI Expert, Pro, as one shipment.

### After 2.0
Inventory, then Printer Link. Free additions for Pro holders, announced outside the App
Store listing (D18a).

---

## 8. What I recommend you do next

**Write the Pro spec.** It is unblocked as of 2026-08-21: D19 settles what Pro contains,
and the price is a single named value you fill in before go-live rather than a
prerequisite for specifying anything.

One question does still reach into the AI Expert spec: **O5** — whether Pro includes a
starter allowance of credits or none at all. That decides whether the AI Expert spec
opens with "you have N questions" or "buy credits to begin", which is a different feature.

**Train 1's web UI is unblocked and is being built now** (owner, 2026-08-21). O3 is
answered: web My Gear is a standalone deliverable that does not wait for the iOS shell
decision, and iOS 2.0 will be its own design that may reuse ideas rather than code. The
web build doubles as the cheapest possible experiment in whether the gear model is right
before it is committed to on iOS — which is exactly what D14 anticipated.

---

## Maintenance

Update this file when a spec is ratified, a plan is written, or a decision in §5 is taken.
It is the entry point for 2.0; the per-feature specs remain authoritative for their own
content.
