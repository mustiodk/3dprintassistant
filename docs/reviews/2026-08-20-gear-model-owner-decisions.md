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
