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
