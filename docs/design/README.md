# Design canvases

Claude Design canvases, exported 2026-08-22. Open either `.dc.html` directly in a
browser — they render standalone.

**Not served publicly.** `.assetsignore` excludes `docs/**`, which matters here:
these carry unreleased Pro surfaces and credit counts.

| File | What it is |
|---|---|
| `3DPA 2.0 Redesign.dc.html` | The 2.0 iOS redesign — "Quiet Instrument Panel". 27 artboards. |
| `My Gear Web.dc.html` | The web My Gear proposal. This is the design that **shipped** on 2026-08-21. |
| `support.js` | Canvas runtime. Generated (`dc-runtime`), do not edit. Both pages need it. |
| `logo-64.png` / `logo-128.png` | Copies of the repo-root logos, kept local so `My Gear Web` renders standalone. |

The written spec derived from the 2.0 canvas is
[`../superpowers/specs/2026-08-20-ios-2.0-quiet-instrument-panel-design.md`](../superpowers/specs/2026-08-20-ios-2.0-quiet-instrument-panel-design.md).
**The spec is authoritative for decisions; the canvas is authoritative for pixels.**
Where they disagree, the spec wins — and the disagreement is a bug in one of them.

## Artboard map — `3DPA 2.0 Redesign`

| ID | Screen |
|---|---|
| `brief` | Assumptions + the six decisions. **Read first.** |
| `1a` | Home · returning · 3 gears — **canonical** |
| `1b` | Home · 8 gears — top-3 + "all gears" row |
| `1c` | Home · one gear |
| `1d` | Home · first run · zero gear |
| `1e` | Home · loading (engine cold start) |
| `1f` | Home · error (engine failed) + retry |
| `1g` | Gear overlay · 8 gears grouped by printer |
| `1h` | Brand picker (a) · brand-identity |
| `1i` | Brand picker (b) · utility — **chosen** |
| `1j` | Brand picker · 2.0 state, your gear surfaces first |
| `1k` | Step 5 · intent only, hardware pre-filled from gear |
| `1l` | Profile result · star-to-Workshop + save-gear moment |
| `1m` | Workshop · empty |
| `1n` | Workshop · populated |
| `1o` | Tab bar as a system — states + wizard coexistence |
| `2a` | Gear builder · single page, printer mandatory |
| `3a` | Settings · cloud sync as the headline card |
| `4a` | Home · Daylight Workbench (light palette) |
| `4b` | Settings · light + Appearance switcher |
| `4c` | Token map dark ⇄ light, reconciled with the shipped web theme |
| `critique` | Self-critique — contrast, targets, SwiftUI friction |
| `tokens` | Design-token sheet, SwiftUI-ready |

## What was deliberately left out of the export

`uploads/` — ten reference screenshots the owner supplied as input. No artboard
references them, and they are 2.3 MB. They live in the canvas project itself.

`ios-frame.jsx` — a generic "omelette starter" device-frame scaffold, not
project output.

## Which parts survive the 1.5.0 split

My Gear ships ahead of 2.0 (see the 1.5.0 decision in
[`../reviews/2026-08-20-gear-model-owner-decisions.md`](../reviews/2026-08-20-gear-model-owner-decisions.md)).
The gear artboards — `1a`–`1c`, `1g`, `1j`, `1k`, `1l`, `2a` — apply as drawn.
`1o` (tab bar), `3a` (Settings), and the Expert/Inventory tiles inside `1a` are
2.0 and are **not** part of 1.5.0.
