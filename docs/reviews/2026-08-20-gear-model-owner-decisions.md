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

**Owner scope ruling, same day, and it settles this more simply than the analysis below.**
On being shown the ruling, the owner stated plainly: *"i dont see zigbee, gmail in scope
for this inventory."* **Gmail order import and eWeLink/Zigbee humidity sensors are out of
scope for the product Inventory as a product decision** — not merely blocked by cost or
verification burden. The technical analysis that follows was derived before this and
reaches the same place, but it is corroboration; **this line is the authority.** Keep the
provenance separable: nothing downstream should cite the restricted-scope argument as the
reason those features are absent when the owner simply does not want them.

**The original framing also overstated the trade, which is why the answer is one-sided.**
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

---

## D19 — ANSWERED 2026-08-21: what Pro contains

**Owner ruling, verbatim:** *"Prisen fastsætter vi før golive. Pro indeholder cloud sync,
inventory og adgang til ai expert (kredit er ekstra)."*

**Pro contains three things:**

| | |
|---|---|
| **Cloud sync** | Already ratified as Pro (D15). Unchanged. |
| **Inventory** | **Now Pro.** This closes the question left open at the end of D18b. |
| **AI Expert — access** | Pro buys the *ability to use* it. **Credits are a separate purchase.** |

**Price is deliberately deferred to before go-live.** It is not blocked work: the Pro spec
can be written against this contents list, with the price as a single named value filled
in later. The App Store product itself cannot be created without it, so it gates
submission, not specification.

### This reverses SYN-01, deliberately

`SYN-01` ([merged decision set](../superpowers/specs/2026-07-12-my3dpa-merged-decision-set.md))
is tagged **OWNER-LOCKED** and reads *"Filament inventory is **free** and local-first."*
D19 supersedes that clause. The rest of SYN-01 — sync as the one-time Pro unlock,
never-data-hostage on lapse, no spool caps — is untouched. Recorded explicitly because a
later reader finding an OWNER-LOCKED line contradicted by a newer decision should see that
the reversal was intended rather than overlooked. Note that SYN-01's document is
`Status: DRAFT` pending MG0, so nothing binding was broken.

### It does NOT relax D18a, and that constraint now binds harder

D18a stands unchanged: **the App Store listing, the paywall and the purchase flow may sell
Pro only on what works the day it ships.** Inventory ships *after* 2.0, so on launch day
Pro is sold on **cloud sync + AI Expert**, and Inventory is announced to existing Pro
holders outside the store listing when it arrives.

What Pro *contains over its lifetime* and what the listing *may claim on day one* are two
different statements. D19 is the first; D18a governs the second. A listing that names
Inventory before it exists is the 2.1(a) / 2.3.1(a) rejection risk D18a was written to
avoid.

**Consequence for sequencing:** if the owner would rather sell Inventory as part of Pro at
launch, Inventory must move *into* 2.0 rather than after it. That is a scope decision, not
a marketing one, and it is not taken here.

### Open, and it is a product call

**Does Pro include a starter allowance of AI Expert credits, or zero?** "Access, credits
extra" read strictly means a buyer pays for Pro and still cannot ask the AI Expert
anything without paying again. Beyond how that reads to a buyer, guideline **3.1.2(a)**
requires a subscription to *"provide ongoing value"* — if Pro ends up as a subscription
rather than a one-time unlock, an entitlement that unlocks a feature the user cannot
actually use without a second purchase is worth pressure-testing before submission.
Bundling a starter allowance is the common shape. **Not decided here.**

---

## D20 — ANSWERED 2026-08-21: Pro is a one-time purchase and ships with free credits

**Owner ruling, verbatim:** *"Pro er engangskøb, og fx 10 gratis kreditter følger med..
dog skal jeg finde ud af hvad kredit betyder, hvad de kan bruges til og hvor meget osv
før vi fastsætter en kredit grænse."*

**Settled:** Pro is a **one-time purchase** — a non-consumable IAP, consistent with
`SYN-01`'s "one-time 3dpa Pro unlock". Credit packs are **consumables** on top. A starter
allowance **does** come with Pro; the number is pending.

**Pending, and correctly so:** the size of the allowance, which cannot be chosen before a
credit has a defined value.

### One-time purchase closes the 3.1.2(a) exposure

Guideline 3.1.2(a) — *"a subscription must provide ongoing value"* — governs
**subscriptions**. A non-consumable unlock is not one. The concern raised in D19 about
selling an entitlement to a feature the user cannot use without a second purchase does not
apply as a guideline risk. It remains a *product* judgement, and the starter allowance
answers it anyway.

### It activates a known App Store Connect trap

Credit packs are the app's **first consumable** IAPs. App Store Connect blocks a
standalone first-consumable submission: *"Your first consumable in-app purchase must be
submitted with a new app version."* The IAPs and the version must travel as one
submission, and **Add for Review on the version page is a dropdown** — picking the
existing draft merges them and clears the block; creating a new submission splits them and
the block survives, which reads like the fix failed. Learned the hard way on the Tip Jar
submission, 2026-07-25. Budget for it in the release plan rather than discovering it at
submission.

### Most of "what a credit means" is already specified — check before re-deciding

The [AI Expert draft](../superpowers/specs/2026-08-17-ai-buddy-design.md) already fixes the
mechanics. Re-opening them is not required:

| Already specified | Where |
|---|---|
| A credit is spent **per message**, not per session or per token | §3 (credit display), §8 |
| **Text and photo messages are priced differently**, and the price is shown **before** sending | §3 |
| A failed send **never** burns a credit — two-phase reserve/settle over an append-only ledger | §3, §8 |
| Balance lives in the chat header; "insufficient credits" is a typed state that deep-links the pack sheet | §3 |
| One image per message, downscaled ≤1568px / ≤1MB, oversized rejected **before** any reserve | §5 |
| Balance is the **only** server-side user state; history stays on-device | §3 |
| A free taster independent of Pro: 5 text questions/device/30 days, attested, $10/day pool cap, kill switch | §8 |

**What is genuinely missing is one thing: the exchange rate**, and the spec already names
what produces it — *"credit prices are set from **D2's worst-case rows**, not the p50."*
D2 is dated cost modelling for the chosen model: what one text turn and one photo turn
actually cost at the ~5–8K input budget in §5, priced with the provider's dated units.

**So the sequence is:** D2 (dated cost model) → the exchange rate (1 message = 1 credit?
does a photo cost 3?) → the starter allowance → the pack prices. The owner's instinct to
define the unit before the limit is right; D2 is the piece that defines it, and it is
research, not a decision.

---

## D21 — ANSWERED 2026-08-22: My Gear ships on iOS as a standalone 1.5.0, ahead of 2.0

**Owner ruling.** *"vi har jo shipped my gear på web.. synes vi skal udnytte vores momentum
nu"* — and, on being shown the analysis: *"gør my gear scope/plan klar til 1.5.0 og de ikke
committed ændringer vil også komme med den version."*

**This reverses D12 and narrows D18. That is deliberate, and it is recorded here so a later
reader does not mistake it for an oversight** — the same reason D19 recorded its reversal of
`SYN-01`.

### What changes

| | Before (D12 / D18) | Now (D21) |
|---|---|---|
| iOS gear | inside 2.0, after the tab shell | **standalone 1.5.0, before the shell** |
| iOS releases before 2.0 | "only small bug fixes" | **one feature release** |
| 2.0 contents | My Gear + shell + light mode + Settings + sync + AI Expert | the same, **minus My Gear** |

### Why the earlier ruling did not survive

D18's reasoning is commercial and remains correct: *"Pro must feel worth its price on launch
day."* **It does not cover My Gear, because My Gear is free.** D19 defines Pro as cloud sync
+ Inventory + AI Expert access. Shipping a free feature early cannot dilute what Pro sells —
it can only shrink the 2.0 *moment*, which is a weaker claim than the one D18 protects.

D12's reasoning was the "wow oplevelse" of a single big release, plus an assumption that
gear could not live in today's `NavigationStack`. Two findings undercut the second half:

1. **Gear is architecturally independent of the tab bar.** Every gear surface the canvas
   draws — the Home gear section (`1a`–`1c`), the overlay (`1g`), the builder (`2a`), the
   picker's "your gear first" state (`1j`), step-5 pre-fill (`1k`) and the save-gear moment
   (`1l`) — works in today's navigation. The tab bar is genuinely 2.0: two of its four tabs
   (Expert, Inventory) are 2.0 features, so a 1.5.0 tab bar would have two tabs.
2. **The Home space already exists**, and the canvas's own brief supplies it — decision 4:
   *"The two-line Syne title survives only on the first-run hero … returning Home gets the
   compact wordmark + a live engine-status readout."* Today's Home opens with a 144×144 logo
   tile, a 40pt two-line title, a tagline and a `Spacer()` — roughly 300pt that the same swap
   frees on iOS. Three gear cards need about 200pt.

An earlier controller assessment called the Home-crowding objection near-decisive. It was
based on the 2026-08-19 count of twelve stacked elements, which **included the hero** that
this swap removes. The assessment was corrected once the canvas was readable.

### What 1.5.0 contains

My Gear, plus six commits already on local `main` and held by the push gate: the
saved-profile tombstone fix, the version-skew guard, and four CI workflow commits.

### What it explicitly does NOT contain

Tab bar · Settings · light mode · cloud sync · AI Expert · Inventory · Pro. All 2.0.

### The cost, stated plainly

2.0's reveal gets smaller by one feature, and the four unwritten specs (Pro, AI Expert,
Settings/shell/light, sync plan) are delayed by whatever 1.5.0 consumes. The owner accepted
both. The gear *component* is built once — only Home's composition differs between 1.5.0 and
2.0, and that difference is removing two tiles and adding a tab bar.

**Supersedes:** D12 in full; D18's inclusion of My Gear in 2.0. D18's release-as-one-unit
ruling stands for everything Pro sells.
