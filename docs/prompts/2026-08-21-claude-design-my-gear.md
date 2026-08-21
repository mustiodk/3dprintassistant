# Claude Design brief — My Gear section (web)

Created 2026-08-21. Paste the block below into Claude Design. It has repo access, but
the design tokens are stated explicitly anyway: Claude Design **infers** design systems
from what it sees rather than reading token files, so left to itself it will produce
near-misses of the real palette.

>>> START >>>

I want you to redesign one section of an existing web app. The repo is
`mustiodk/3dprintassistant` — it is a single-page vanilla JS app, no framework, no
build step. The relevant files are `index.html`, `style.css` and `app.js`.

## What the app does

3D Print Assistant takes a few questions — which printer, which nozzle, which material,
what you are printing — and returns a tuned slicer profile. All the logic lives in
`engine.js`; `app.js` is presentation only.

## What I am asking you to redesign

The **My Gear** section. It sits at the top of the Configure view, directly above the
question filters, inside `<section class="gear-section" id="gearSection">` in
`index.html` (around line 98). It is rendered by `renderGearSection()` in `app.js`
(around line 1447). Its styles are the `.gear-*` rules in `style.css`.

**I do not like how it looks.** It reads as a row of generic boxes bolted above the real
content rather than as part of the page. I want a design proposal, not code.

## What a "gear" is — this is the concept you are designing for

A gear is a **shortcut, not an inventory**. It is the set of answers that do not change
between prints: your printer, your nozzle, your build plate, the material you keep
loaded. You save one after configuring a profile, and next time it re-fills those
answers in one tap so you only answer what actually varies.

It is deliberately **not** a printer manager, not a spool tracker, not a profile library.
The app has a separate "Workshop" for saved profiles; gear is only the hardware answers.

Most users will have one gear. Some will have three or four. Nobody will have twenty.

## Current structure

Section header:
- Title: "My gear"
- Button: "All gears (n)" — only appears past a threshold
- Button: "Reset" — clears the configurator and reopens the printer picker

Then a grid of cards. Each card has two separate tap targets:
- The **card body** opens a read-only detail overlay. It shows: the printer name, a
  headline summarising the gear, an optional user-typed nickname, and up to two badges
  ("Default", and a warning badge like "Items missing" or "Adjusted" when something the
  gear pinned is no longer in the catalog).
- A **"Generate profile"** button that runs the whole thing immediately.

Two states matter:
1. **Empty (first run).** Today the header is hidden entirely and a single line of prose
   appears: "A gear is a saved shortcut — the answers that don't change between prints.
   Finish a profile below and you can save your first one." **This state currently has
   no action in it at all**, which I think is a mistake — I am adding an "Add your gear"
   button, so the empty state needs to be able to hold it.
2. **Populated.** One to four cards, occasionally more.

## Design tokens — use these exact values, do not invent near-misses

Dark is the primary theme. A light theme exists but is secondary.

```
--bg            #0a0a0b        page background
--surface       #111114        panel background
--surface2      #1a1a1f        raised background
--border        rgba(255,255,255,0.07)
--border2       rgba(255,255,255,0.12)
--text          #eeeef3        primary text
--text2         #888898        dim text
--text3         #b8b8cc        mid text
--green         #00e5a0        primary accent
--green-dim     rgba(0,229,160,0.09)
--green-border  rgba(0,229,160,0.28)
--orange        #ff6b35        warning accent
--purple        #7b6ef6        secondary accent
--accent2       #4ed6ff
--r             10px           standard radius
--r-sm          7px
--shadow-lift   0 8px 24px rgba(0,0,0,0.35)
--glass         rgba(17,17,20,0.78)
```

The overall feel I am after is **smooth, minimal, functional** — clean over flashy.
Micro-detail and motion are welcome; decoration is not.

## Hard constraints — a proposal that breaks one of these is unusable

1. **No separate gear-builder page or screen.** Gears are created through the
   configurator itself. Do not propose a dedicated form with its own dropdowns.
2. **Cards are shortcuts, not editable objects.** No inline editing in the card.
   Rename / set default / archive live behind the detail overlay.
3. **The section lives above the configurator on the same page.** It is not its own
   route and there is no tab bar on web.
4. **Two tap targets per card must survive** — "look at this" and "run this" are
   different intents and both are used.
5. **Vanilla CSS only.** No framework, no component library, no build step.
6. Must work down to a 360px-wide viewport.

## What I want back

1. A visual direction for the section in both states — empty and populated.
2. A card design that makes the two tap targets obvious without looking like two
   buttons stuck together.
3. How the header actions ("Add your gear", "Reset", "All gears") should be arranged
   and weighted — right now they are three identical grey buttons and that is part of
   why it looks bad.
4. How the warning badges ("Items missing", "Adjusted") should read — they are
   uncommon but need to be noticeable without being alarming.
5. Where the section's visual weight should sit relative to the configurator below it.
   It must not compete with the primary flow for a user who has no gears yet.

<<< END <<<
