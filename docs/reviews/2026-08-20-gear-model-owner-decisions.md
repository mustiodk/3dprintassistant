# 2026-08-20 — Gear model: owner decisions

Running record of owner rulings from the Train 1 vs. 2.0 mismatch review
([findings](2026-08-20-train1-vs-2-0-design-mismatch-review.md)). Each entry is a
decision, not a proposal. These supersede the ratified spec §2 where they conflict —
spec §2 must be re-ratified against this record before Train 1 is re-planned.

**Standing frame (owner, 2026-08-20):** the 2.0 UI design is a *design document* showing
how a feature could look and how the owner imagines it — **not requirements**. Mismatches
are questions for the owner, never verdicts against the build.

---

## D1 — A gear is a shortcut, not an inventory

> "mit gear betyder faktisk hvad for en printer har jeg, hvad er den primære nozzle,
> filament, build plate, environment etc jeg vil vælge som predefined … det skal ses som
> en genvej til at springe led over … min gear er ikke bare et udstyr og de filamenter
> brugeren har.. den er en genvej"

**Ruling.** There is **no stored "what I own" pool**. `printers{}` and `filaments{}` leave
the envelope. A gear is a named preset whose purpose is skipping configurator steps.

Several gears routinely share one printer — most users own one printer and differentiate
by nozzle and filament. Printer name is therefore *not* the distinguishing feature of a
gear, which independently corroborates the design's `1g` grouping choice.

**Resolves:** M1 (CRITICAL). **Consequence:** spec §2's two-layer model is withdrawn.

---

## D2 — The rule is "stable vs. per-print", not "hardware vs. intent"

Spec §2 said *"hardware is a setup, intent is per print."* Too narrow. The owner's rule:
**whatever does not change from print to print belongs to the gear.**

Default gear fields (7), agreed:

| In the gear | Asked per print |
|---|---|
| `printer` · `nozzle` · `material` | `useCase` · `surface` · `strength` · `speed` |
| `build_plate` · `environment` | `support` · `colors` · `special` |
| `profileMode` · `extruder_type` | `ironing` · `brim` |

`environment` and `profileMode` moving into the gear is a **direct reversal** of spec §2,
which explicitly listed environment as per-print state "a setup never pins."

---

## D3 — A gear is an open partial-state preset, not a fixed field list

> "hvis en bruger gerne vil tilføje nogle af de andre ting skal det også være muligt"

**Ruling.** D2's seven fields are the *default* offered up front. The user may pin **any**
of the remaining configurator fields to a gear.

**Schema consequence — this is the important one.** The gear stores an open map of
"fields this gear has set", keyed by the engine's own filter keys
(`engine.js:529-610`, 19 keys today), not fixed columns. New engine fields then work
without an envelope migration — which materially de-risks the "kept forever" promise that
made freezing the old schema expensive.

The three fields left open at decision time (`userLevel`, `seam`, `filament_condition`)
are absorbed by this ruling: none are default, all are pinnable. `userLevel` still merits
a separate question — it is arguably a property of the *user*, not of a gear, and would
then live once in settings rather than being repeated on every gear.

---

## D4 — Gear card: two tap targets

> "trykker man på hele kortet, åbner et overlay der viser alt der er valgt.. trykker man
> på generere profil springer den alt over"

**Ruling.** Tapping the card opens an overlay listing everything the gear has set —
review and edit. A **Generate profile** control on the card skips straight through.

This replaces spec §2's hard over-collapse guard with a softer one: nothing is hidden,
but the shortcut costs one tap. When a gear has *not* pinned every field, the control
cannot skip everything — it lands the user on the first unanswered step. (Controller
call, not owner-stated; flag if wrong.)

**Resolves:** the guard question raised by M5/M8.

---

## D5 — Saving from a run shows a small checkbox dialog

The offer to save appears after a manually-configured run. It opens a short dialog with
the D2 default seven **pre-checked**; every other field the user just answered can be
ticked to pin it as well.

Rejected: silent one-tap save of the seven (loses the fields the user wanted), and saving
everything (locks `useCase`/`strength`/`speed` that few users mean to fix).

**Resolves:** M2 — the finding the owner raised in his own words, and the only finding in
this review that was never design-sourced.

---

## D6 — There is no "build a gear" page

Gears are born **only** by saving after a configurator run. "My Gear" is a list: edit, set
default, delete. No empty form, no separate acquisition screen.

Rationale: a new printer has to be configured once anyway, so a gear arises naturally from
work the user was already doing. This is a **deliberate departure from the design**, whose
`2a` artboard is a dedicated single-page builder — recorded because it is the kind of gap
a later reader would otherwise read as an oversight.

**Resolves:** M3, and removes the three-tab panel entirely.

---

## D7 — The name field pre-fills from hardware

Suggests `X1C · 0.4 · PLA Basic`, overwritable. Chosen over an intent-derived suggestion
("Everyday PLA") because most users own one printer and differentiate by nozzle and
filament — a hardware name stays unambiguous in a list where an intent name may not.

**Resolves:** M5. The design's self-contradiction (auto-name from intent, while intent is
never stored) dissolves under D5 — at save time the intent *has* been answered — but the
hardware form was chosen anyway.

---

## M4 — dissolved, no decision needed

AMS is not user input. `engine.js:1053-1080` classifies the feed system from the
**printer's** `multi_color_systems` catalog field; the user-facing question is `colors`
(single / 2–4 / 5+), already a per-print field under D2. The design's `AMS` chip was
display of a catalog fact. Nothing to store, and the original M4 question is void.

---

## D8 — Home shows three gear cards, with a door at four

Active gear plus the two most recently used. At four or more gears an "all gears" row
opens the full list. Home's height is bounded regardless of how many gears exist.

The `⚙` header switcher built on the parked branch is withdrawn — D4's cards replace it.

**Resolves:** M6.

---

## D9 — The primary Home CTA starts a fresh run

Reads "New setup" (DA: *Ny opsætning*) and always begins at brand selection. The gear
cards own the shortcut role via D4's generate control; the CTA owns "something different
this time."

This reframes M7 rather than answering it as filed. The original question was wording
(`Configure print` vs `Continue with [gear]`); D4 removed the CTA's shortcut role
entirely, so the question became what the button is *for*.

**Resolves:** M7.

---

## D10 — Pickers surface the user's own brands and printers first

On a fresh run, a "Yours" group leads the brand and printer pickers, with the full catalog
beneath. Derived from the user's gears — **not** from a stored pool, which D1 removed.

The engine's compatibility dimming is untouched and must stay visually distinct from this
grouping (spec §2 constraint 1 survives intact).

**Resolves:** M8's remaining half. The jump-target half — the design's two different
targets, step 3 from the picker and step 5 from Home — is void under D4: a gear fills what
it has pinned and lands the user on the first unanswered step, so there are no fixed step
numbers to reconcile.

---

## D11 — The catalog-news line lives on Home

A short line beneath the gear cards — *"3 new printers since last time · 214 in the
catalog"*. It exists because D10 puts the user's own things first, which would otherwise
make new catalog entries invisible to anyone with gears (spec §2 constraint 2).

It moves off the My Gear panel, which D6 reduced to a list.

**Resolves:** M10.

---

## D12 — iOS waits for the new shell; 2.0 ships as one release

> "3dpa 2.0 skal bygges samlet og releases på en gang.. jeg vil gerne have at brugerne får
> en wow oplevelse … udover små bug fixes så er den næste release 2.0"

**Ruling.** iOS does not receive gear inside today's `NavigationStack`. The tab shell is
built first, and **all of 2.0 lands in a single App Store release**. Between now and then,
iOS ships only small bug fixes.

**Resolves:** M11 — and supersedes the framing of the question as filed, which offered
gear-into-today's-app as the recommended path.

---

## D13 — What 2.0 contains

Established across this session, from the design's Settings artboards (`3a`/`4b`) and the
owner's scope statement:

| Component | Status today |
|---|---|
| My Gear | designed here (D1–D11); web build parked |
| Cloud sync — Apple ID sign-in, E2E encryption, device list | no accounts, no backend |
| AI Expert + credit economy | not built |
| Inventory (Pro) | not built |
| Printer Link — LAN/MQTT for Bambu, Prusa Link, Moonraker, live telemetry surfaced in three places | not built |
| Four-tab shell | app has **no tab bar at all** today |
| Light mode — Dark / Light / Auto | `preferredColorScheme(.dark)` is hard-locked; ~49 hardcoded colours |
| Settings screen as designed | does not exist in this form |
| Pro tier + credit purchase | tip-jar consumables exist; a Pro tier does not |
| Referral (+25 CR) | not built |

Four of these need infrastructure that does not exist: a server with accounts, an AI
backend with credit accounting, three printer protocols, and a paid tier beyond the
current consumables. **Recorded so the size is not rediscovered later** — the owner has
made the call, and it is a legitimate one.

**Absorbs:** M12 (light mode) and M13 (Printer Link / referrals) — both are in scope, so
neither remains a question. M14 (first-run vocabulary) is void under D6 and D9: a first
run has no gears, so Home is simply the CTA.

---

## D14 — Web ships gear when it is complete; it is not held for 2.0

Web stays continuous-deploy. Gear goes live on web once it is finished against this
decision record — finished, not partial (the owner's original park ruling stands).

**The consequence that matters most, stated plainly:** web shipping first means **web
freezes the schema**. Once a real user's browser holds a gear, 2.0's cloud sync must read
that exact format. Therefore the envelope must be designed for *all* of D13 — gear,
inventory, sync-as-wire-format — **before** web ships, not for gear alone.

This is the one ordering that avoids a migration, and it raises the bar on the re-model
above what the parked branch was ever asked to meet.

---

## D15 — Monetization model

Pro unlocks **cloud sync + Inventory + access to AI Expert**. AI usage is then bought as
**credits on top**, so usage stays margin-positive.

Pricing is settled outside this review against an agreed high-level business case and is
explicitly not reopened here.

---

## Status

All 14 findings from the mismatch review are resolved, absorbed or void.
Remaining engineering inputs: **S1–S3** (envelope defects found by the adversarial gate)
carry into the re-model as requirements, per the review's recommendation 5.

---

## D16 — Cloud sync ships in two versions, and v1 needs no login

> "Version 1 kun apple enheder, version 2 web med paringskode"

**v1 — Apple devices via iCloud.** iPhone ↔ iPad ↔ Mac sync with **no app-level login**:
the device's existing iCloud account is the identity, and Apple handles storage,
encryption and conflict transport. Web keeps storing locally, as today.

**v2 — web via a pairing code, later.** The app shows a code, the user enters it on web,
the two share data. Still no password and no account — but it does need a small server,
and losing every device loses the data.

**This removes the account system and the backend from 2.0** — two of the four
infrastructure gaps D13 listed. Remaining gaps: the AI backend with credit accounting,
and the three printer protocols.

**Note the design departure:** `3a` shows *"SIGNED IN · APPLE ID"* with a named user. v1
has no such row. Recorded so it is not read later as something forgotten.

**Engineering input for the re-model (not an owner decision):** syncing the envelope as a
single blob gives last-write-wins, so two devices editing different gears can lose one.
Per-gear records sync cleanly. This is a real constraint on the schema and belongs in the
re-model alongside S1–S3.

---

## D17 — Referral is deferred

The +25 CR referral in `3a` is not important now and moves to a future update. Out of 2.0.

---

## Revised 2.0 scope after D16 and D17

| Component | Infrastructure needed |
|---|---|
| My Gear | none — designed here |
| Cloud sync v1 (Apple devices, iCloud) | **none** — no accounts, no server |
| AI Expert + credits | **AI backend + credit accounting** |
| Inventory (Pro) | none beyond local storage |
| Printer Link (Bambu / Prusa Link / Moonraker) | **three vendor protocols** |
| Four-tab shell · light mode · Settings screen | none |
| Pro tier + credit purchase | StoreKit, extending the existing consumables work |
| ~~Accounts + backend~~ | removed by D16 |
| ~~Referral~~ | deferred by D17 |

---

## D18 — 2.0 ships as one release; Pro delivers cloud sync + AI Expert

The owner rejected splitting the release. The reasoning is commercial, not technical, and
it is correct: Pro must feel worth its price **on launch day**, and drip-feeding the Pro
features means the first buyers pay for a fraction.

> "ideen er at brugerne skal føle at den store opdatering er de 99 kr værd.. den effekt får
> vi ikke hvis cloud sync, inventory, ai, printer link alle kommer step by step"

**Ruling.** 2.0 contains My Gear, the tab shell, light mode, Settings, **cloud sync** and
**AI Expert**. **Inventory** and **Printer Link** follow afterwards for Pro holders.

An earlier controller recommendation proposed shipping Inventory and AI in different
releases; it applied engineering sequencing logic to a pricing question and is withdrawn.

### D18a — the "coming soon" framing must not reach the App Store

The owner's phrasing was that Inventory and Printer Link arrive "som kommer snart .. til
dem som køber pro". **Marketing them that way at the point of purchase is a rejection
risk**, verified against the current guidelines rather than assumed:

- **2.1(a) App Completeness** — *"placeholder text, empty websites, and other temporary
  content should be scrubbed before submission."* Over 40% of rejections are 2.1.
- **2.3.1(a) Accurate Metadata** — features must be described specifically and
  **accessible for review**.
- **3.1.2(a)** — a subscription must *"provide ongoing value to the customer."*

**Resolution — framing only, the plan is unchanged.** Pro is sold on what works on the
day: **cloud sync + AI Expert**. Inventory and Printer Link ship later as **free additions
for existing Pro holders**, announced outside the store listing (Discord, site, in-app
after purchase). No "coming soon" in the App Store description, the paywall, or the
purchase flow.

This is also commercially stronger than a promise: a buyer who receives something new
without paying again feels rewarded, and it produces the second wow moment the owner
wanted — without it reading as a split of something already paid for.

### D18b — ANSWERED 2026-08-21: Inventory is local-first and iCloud-synced

**Ruling.** Inventory stores locally on the device and syncs through the mechanism
ratified in the [sync v1 spec](../superpowers/specs/2026-08-20-sync-v1-spec.md). No
server, no accounts, no running costs. **`Projects/bambuinventory/` stays the owner's
private tool** and is not opened to other users; its only reuse boundary is as a
read-only local exporter.

**Login does not return.** This was the decision's main risk and it is closed.

**The original framing overstated the trade, and that is why the answer is one-sided.**
The 2026-08-20 wording said local-first costs "no Gmail order import and no humidity
sensors in the user-facing version." Verified against the code on 2026-08-21, none of the
three server-side features is shippable to other users at all:

| Feature | Why it does not generalize (verified) |
|---|---|
| Gmail order import | The query is hardcoded to `from:noreply@bambulab.com subject:"order" "confirmed"` (`sync_emails.py:86`) — Bambu buyers only. And `gmail.readonly` is a Google **restricted scope**: shipping it requires OAuth verification plus a paid third-party security assessment with **annual revalidation** (verified against Google's scope documentation; published cost figures vary widely across sources and are not relied on here). This blocks it regardless of whether a server exists. |
| eWeLink humidity sensors | Requires the user to own eWeLink Zigbee probes and surrender their eWeLink credentials; the device registry (`zigbee_sensors.json`) enumerates the owner's specific hardware. |
| Printer / AMS link | Already settled in D18c as **iOS-only and LAN-local**. A browser cannot reach a printer on the LAN, so the most valuable inventory feature must run on-device — a server adds nothing to it. |

**The server option also costs more than "accounts and running costs."** The existing app
has **no multi-user foundation whatsoever** — no users table, no auth, no sessions, no
`.htaccess` protection. Its entire multi-tenancy story is a hardcoded literal,
`WHERE user_id = 1` (`api.php:44`). Opening it means building accounts, authentication,
per-user isolation, GDPR deletion and export, and hosting from zero — reversing D16 three
days after it was taken, and dragging the unresolved web-Pro-entitlement problem
(sync spec §4.2) back in. It would also contradict `docs/3dpa-context.md`, which lists
user accounts and cloud-side compute under what is deliberately out of scope.

**Prior corroboration, stated with its real status.** `SYN-01` in
[`../superpowers/specs/2026-07-12-my3dpa-merged-decision-set.md`](../superpowers/specs/2026-07-12-my3dpa-merged-decision-set.md)
reads *"Filament inventory is **free and local-first**"* and is tagged OWNER-LOCKED;
`SYN-10` draws the boundary as *"read-only local exporter; no PHP/MySQL/Gmail/MQTT
reuse."* That document is **`Status: DRAFT`, pending MG0 ratification**, so it is not
binding on its own — but an independent synthesis with the same facts reached the same
answer.

**What Inventory therefore gets, at no new infrastructure cost:** manual spool
add/edit/remaining, auto-decrement from the AMS via Printer Link on iOS, low-stock
warnings, configurator integration (app-layer only), cross-device sync for free via the
ratified spec, and camera barcode/RFID scanning on iOS as the generic intake path that
Gmail parsing could never be.

**What is genuinely given up:** no automatic order import for any user; Inventory does not
reach a browser on a non-Apple device until sync v2's pairing code (the same limit cloud
sync already carries); and data lives on the user's devices.

**Open, and deliberately not decided here — a pricing question, not an architecture one.**
`SYN-01` (owner-locked, July) says Inventory is **free**; D18 says it follows *"for Pro
holders"* and D18a phrases it as *"free additions for existing Pro holders."* Read against
D15's *"only sync was ever Pro,"* free-for-everyone is the consistent reading, but it is an
inference. **Settle it before Inventory is planned.**

### D18c — Printer Link is further along than the review assumed

`bambuinventory/printer_sync.py` already subscribes to the Bambu P1S local MQTT broker and
normalizes partial reports, with AMS slot tracking and RFID metadata. The hard part —
Bambu's undocumented protocol — is solved and running. Porting it into iOS is a port, not
an invention.

Two limits stand: it is **iOS-only** (a browser cannot reach a printer on the LAN), and
Bambu's protocol is unofficial and breaks with firmware updates, so it carries permanent
maintenance.

---

## Answers to the spec's open questions (§7)

1. **`userLevel`** — **No** separate home in settings. Pinnable like any other field, and
   that is all.
2. **Do catalog ids disappear?** — **Yes, verified in history**, twice: `aa0826e` reverted
   the Voxelab Aries, removing printer `aries` and brand `voxelab`; `2284207` moved the
   SPARKX i7 to Creality and deleted the `sparkx` brand. Rare, but real — and the more
   frequent case is version skew, where iOS ships an older catalog than web. The `stale`
   state in spec §3.1 earns its place.
3. **Does web get Inventory?** — Yes in intent: reachable from web, or unlocked if bought
   through the App Store. **Blocked on D18b**, and cross-platform entitlement without
   accounts is itself unresolved.
4. **Test data in the owner's browser** — not a real question; withdrawn.
