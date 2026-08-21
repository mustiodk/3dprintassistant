# 3D Print Assistant — 2.0 Roadmap

**Last updated:** 2026-08-21

<!--
PARSE CONTRACT — read before editing.

`roadmap.html` reads THIS FILE in the browser and renders it. There is no build
step and no second copy: edit the markdown, never the HTML.

It depends on exactly these constructs. Break one and that part stops rendering:

  ## N. Title              A numbered H2 starts a phase. Anything before the
                           first numbered H2 is ignored.
  **Status:** <word>       First word decides the badge:
                           active | next | planned | blocked | done
  **Why:** <one line>      Optional. One sentence, shown under the title.
  ### Heading              Optional group inside a phase.
  - [ ] / - [x]            The unit of progress. Counted for the bar.
  **Last updated:** DATE   Header meta, shown top-right.

  ## Decisions             A phase whose title is exactly "Decisions" renders as
                           the amber "waiting on you" block instead of a phase.

THIS PAGE IS PUBLIC. It is served at 3dprintassistant.com/roadmap so it can be read
from a phone. Keep unreleased pricing, and the specifics of defects that are live in a
shipped app, OUT of it — both drifted in on 2026-08-21 and were removed the same day.
Full detail lives in docs/planning/2-0-PROGRAM-PLAN.md and
docs/reviews/2026-08-20-gear-model-owner-decisions.md, neither of which is served.

RULES THAT KEEP THE NUMBERS HONEST:
  - Only tick a box when the work is genuinely done AND verified.
  - Never tick a box for "in progress" — that is what Status is for.
  - Day-to-day tracking lives in GitHub Issues. This file is the overview:
    why a phase exists, what it contains, and what is blocked.
-->

## Decisions

**Status:** active
**Why:** The big ones are answered. What's left waits until closer to launch.

- [x] **What 3DPA Pro is, and what it includes** — settled.
- [ ] **Pricing** — decided closer to launch. Nothing waits on it.

## 1. Web — My Gear

**Status:** active
**Why:** Ships on its own, ahead of iOS. The cheapest way to find out whether the gear idea actually works before iOS commits to a design around it.

### Done

- [x] Storage format — frozen and reviewed
- [x] Validation and apply logic
- [x] Eight fixes to how saved profiles are stored, found while building this
- [x] Save-as-gear dialog after a run
- [x] Gear cards on the configurator page — redesigned to the Claude Design 1a direction
- [x] Manage gears — rename, set default, archive
- [x] Pickers lead with your own brands and printers
- [x] Catalog-news line — "3 new printers since last time" — so new printers stay visible once your own are on top
- [x] One Save button with two explained options, replacing two adjacent "Save" buttons

### Remaining

- [ ] Final checks and ship

## 2. Groundwork for 2.0

**Status:** next
**Why:** Small, cheap, and everything on iOS is stuck behind them.

- [ ] **Align the iOS saved-profiles store with the web one** before cloud sync. The two disagree about how a record is written, and sync needs them to agree.
- [ ] **Write the iOS storage contract before any iOS gear code**, so the two platforms cannot drift apart on the shared format.
- [ ] Bundle the app's real fonts on iOS — about an hour, fixes 17 places rendering the wrong font since launch
- [ ] Light mode — design is done; iOS needs 6 dark locks unpicked and ~49 hardcoded colours replaced
- [ ] Improve two accent colours in the light theme for better contrast
- [ ] Nozzle picker: only offer sizes that fit the chosen printer

## 3. Write the missing specs

**Status:** planned
**Why:** 2.0 ships as one release, so an unwritten spec on any one feature stalls all of it. Four of the seven pieces have nothing written.

- [ ] **Pro tier** — what's bought, price, entitlement, what happens if it lapses. Everything commercial depends on it.
- [ ] **AI Expert** — draft exists, needs sign-off. The long pole: the only part that needs a backend.
- [ ] **Tab bar, Settings and light mode** — one spec, they're the same surface
- [ ] **Cloud sync implementation plan** — spec is ratified; three technical questions to answer first

## 4. Build 2.0

**Status:** planned
**Why:** Ships as one release. Pro has to feel worth its price on launch day, so nothing is drip-fed.

- [ ] Tab bar and Settings screen
- [ ] My Gear on iOS — its own design, informed by the web build
- [ ] Cloud sync — follows you across your Apple devices, no login, rides your own iCloud
- [ ] AI Expert — knows your printers and saved profiles, answers in the app's voice
- [ ] Pro — cloud sync and AI Expert are what you buy
- [ ] Ship

## 5. After 2.0

**Status:** planned
**Why:** Free additions for people who already bought Pro. Deliberately not announced at the point of purchase.

- [ ] **Filament Inventory** — track your spools, what's left, what needs drying. Stores on device, syncs via iCloud, no accounts.
- [ ] **Printer Link** — read your printer's live state over your home network. iPhone only; a browser can't reach a printer on the LAN.

## 6. Ideas, not committed

**Status:** planned
**Why:** Carried over from the old backlog. Still open, still wanted, no date.

- [ ] More materials — PLA+, PETG Transparent, PPA-CF, ABS-GF
- [ ] Troubleshooter beyond today's 9 symptoms — nozzle clog, layer shifting, z-banding, wet filament
- [ ] Per-parameter explanations — what a setting controls, and what happens if you raise or lower it
- [ ] Show the fix step next to each warning (the engine already works it out; the screen never shows it)
- [ ] Print-time estimator: real acceleration model, support volume, Draft/Standard/Fine comparison
- [ ] Auto dark mode following the system setting
- [ ] More languages — currently English and Danish, and the switcher is hardcoded to two
- [ ] Filament brand profiles
- [ ] Export as a printable sheet
- [ ] Restore the AMS purge calculator — engine, styling and text are all there; only the screen is missing
- [ ] Two small internal tidy-ups noted during My Gear testing
