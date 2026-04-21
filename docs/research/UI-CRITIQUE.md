# UI/UX Design Critique — 3D Print Assistant iOS
**Prototype:** `3dprintassistant-ios-prototype.html`
**Date:** 2026-04-03
**Stage:** Concept prototype — pre-implementation review
**Scope:** All 7 screens (Home → Brand → Printer → Material → Nozzle → Goals → Output)

---

## Overall Impression

The prototype has a strong foundation: the dark theme is premium, the brand colours translate well to mobile, and the step-by-step wizard structure is exactly right for this type of configurator. The biggest opportunity is the **output screen** — it currently feels like a data dump rather than a recommendation. The **Goals screen** is the single highest-friction step and needs to be restructured. And the **Filament Info panel** is entirely missing, which is a meaningful gap in utility.

---

## Usability

| # | Finding | Screen | Severity | Recommendation |
|---|---------|--------|----------|----------------|
| U1 | **Filament info completely absent** — `getFilamentProfile()` data (drying, build plate, AMS compat, enclosure) never surfaces anywhere. Users get temperatures but none of the prep context they actually need. | Output | 🔴 Critical | Add a **Filament card** on the output screen between the temp card and the tabs. Show: build plate, drying (if required), AMS compat, enclosure requirement. |
| U2 | **Goals screen cognitive overload** — 5 segmented controls + a chip group is the heaviest single step in the entire flow. Environment and Experience are secondary concerns for most users. | Goals | 🔴 Critical | Show only: Use Case chips + Surface + Strength + Speed (3 controls). Move Environment + Experience into a collapsible **"More options"** row. |
| U3 | **No printer search** — 64 printers across 12 brands, some brands have long lists. Users who know their printer name (the majority) have to scan/scroll. | Printer | 🟡 Moderate | Add a search field at the top of the printer list. Simple substring filter on `printers.name`. |
| U4 | **"Very cold" segment option truncates** — the string is too long for a 4-option segmented control. It will either clip or wrap at 393pt width. | Goals | 🟡 Moderate | Shorten to **"< 0°C"** or **"Freezing"**. All four env options need to fit comfortably. |
| U5 | **Nozzle incompatibility unexplained** — "Not compatible" badge appears but gives no reason. A beginner won't know why Precision 0.2mm is blocked for PA-CF. | Nozzle | 🟡 Moderate | Add a one-line incompatibility reason inside the dimmed card: *"PA-CF is abrasive — requires hardened steel."* |
| U6 | **No loading state on output** — the engine takes a moment to resolve a profile; transitioning instantly creates a jarring jump and no sense of calculation happening. | Goals → Output | 🟡 Moderate | Add a brief animated loading state (0.5–1.5s) before output renders. A pulsing skeleton or a single spinner with "Calculating profile…" text. |
| U7 | **Export button "⎘" is cryptic** — developer-notation symbol. Not recognisable as a share/export action to most users. | Output | 🟡 Moderate | Replace with SF Symbol `square.and.arrow.up` (share sheet icon) and add an "Export" label or a proper icon button treatment. |
| U8 | **Goals: no required field signal** — Use Case chips are optional in the engine, but leaving them empty produces a weaker profile. Users don't know they should pick at least one. | Goals | 🟢 Minor | Add a faint helper text: *"Select what you're printing for a better profile"* below the chip group. |
| U9 | **Material: no info-on-tap** — tapping a material commits the selection immediately with no way to see details first (drying requirements, enclosure needs, etc.). Beginners may pick ABS without knowing it requires an enclosure. | Material | 🟢 Minor | Add a brief info line as a third row inside each material card: *"Requires enclosure"* or *"Dry before printing"* as a small badge or sub-line. For Phase 1, this can be a static hint. |
| U10 | **Output: Simple mode shows only 3 params in Quality tab** — layer_height, initial_layer_height, seam_position. This feels thin and users may question if the tool did anything. | Output | 🟢 Minor | Review which params are `mode: "simple"` in `engine.js`. Simple mode should show ~5–8 params per tab, not 3. |

---

## Visual Hierarchy

**What draws the eye first (per screen):**

- **Home**: App icon → title → CTA → stats. ✅ Correct order.
- **Brand**: Grid of cards. ✅ Correct. But the "Popular" section header is barely visible at 30% opacity — it's doing no work.
- **Printer**: Series group label → list rows. ✅ Correct.
- **Material**: Colour dots → material names. ✅ Colour coding is effective and helps scan at a glance.
- **Nozzle**: Nozzle names → descriptions. ✅ Fine.
- **Goals**: Nothing dominates — all 5 controls compete equally. ⚠️ The "What are you printing?" chips should feel like the primary input, but they don't stand out at all.
- **Output**: Temp card numbers → tab bar → params. ✅ Correct priority, but the zone between the temp card and the first param row is too tall (slicer badge + mode toggle + tabs = ~90pt of non-content).

**Typography reading order issues:**
- The progress bar label ("Step 1 of 5") is at 60% opacity and 11px. It's present but barely there. For a feature you specifically want foregrounded, it needs more presence — consider 13px at 80% opacity.
- Section headers across the app use 3 different visual styles (`.section-h`, `.goal-label`, `.list-group-label`) that serve the same purpose. This fragments the reading experience.

---

## Consistency

| Element | Issue | Recommendation |
|---------|-------|----------------|
| **Section headers** | 3 different styles used: uppercase t30 11px (brands/materials), 13px t60 700 (goals), uppercase t30 11px with different padding (printer groups) | Standardise to one token: uppercase, 11px, 700 weight, t40 opacity, 8em letter-spacing |
| **Selection checkmarks** | 4 implementations: brand cards (top-right bubble), material/nozzle cards (right-side bubble), list rows (right-side bubble inside row-check div). Minor differences in size and placement. | Unify to one `SelectedCheck` component: 22×22 bubble, `✓` at 12px, animated with spring. |
| **Card border-radius** | Brand cards: 18px. Material/nozzle cards: 16px. List group container: 16px. | Pick one radius for all selection cards (16px recommended — matches the surface radius) |
| **Spacing inside cards** | Brand cards: 18px top/16px bottom. Material cards: 14px all sides. Nozzle cards: 14px all sides. | Standardise card padding to 14px 16px |
| **"Next →" button copy** | Final Goals screen says "Generate Profile →" which is great. Intermediate screens say "Next →". Consider making each CTA slightly more specific: "Select Printer →", "Choose Material →". | Low priority, but improves forward momentum feel. |

---

## Accessibility

| Check | Status | Detail |
|-------|--------|--------|
| Primary text contrast (#fff on #0a0a0b) | ✅ Pass | ~21:1 — excellent |
| Secondary text (t60 ≈ #999 on #000) | ✅ Pass | ~5.7:1 — AA pass |
| Tertiary text (t30 ≈ #4d4d4d on #000) | ⚠️ Borderline | ~3.1:1 — fails AA for 11px body text; passes for large/bold. Section headers at 11px uppercase bold are borderline. Raise to t40. |
| Primary on dark (green #00e5a0 on #0a0a0b) | ✅ Pass | ~10.4:1 — excellent |
| Warning (#ff6b35 on warn-dim bg) | ✅ Pass | Sufficient for the use case |
| CTA button (black on #00e5a0) | ✅ Pass | ~17:1 |
| List row touch targets (~42px) | ⚠️ Borderline | iOS minimum is 44pt. Add 1px more top/bottom padding to list rows. |
| Chip touch targets (~37px height) | ⚠️ Fail | Below 44pt minimum. Increase chip vertical padding from 9px to 12px. |
| Export "⎘" button | 🔴 Fail | Single-character tap target, no defined touch area. Needs a proper 44×44 touch zone. |
| Progress dots (6px) | ✅ OK | Non-interactive indicators, no tap target needed. |

---

## Missing: Filament Info Panel

This is the most substantive gap. `getFilamentProfile(materialId)` returns rich preparation context that is completely absent from the current prototype:

```
nozzleTempBase   → base reference temp (before env/nozzle adjustment)
bedTempBase      → base bed temp
buildPlate       → "Cool Plate", "Engineering Plate", "Smooth PEI", etc.
amsCompatible    → true/false — critical for Bambu AMS users
drying           → "65 °C for 6h" or null
enclosure        → "required" / "recommended" / null
notes            → free-text material notes
```

**Where it should live — recommendation:**

Add a **Filament card** on the output screen, positioned between the temp card and the slicer badge row. It should be compact and scannable:

```
┌─────────────────────────────────────────────────┐
│  🖨  Build plate      Cool Plate                 │
│  ♻️  AMS              Compatible                 │
│  💧  Drying           Not required               │
│  🏠  Enclosure        Not required               │
└─────────────────────────────────────────────────┘
```

For materials that require drying or an enclosure, those rows should be highlighted orange (use `--warning` colour) to draw immediate attention.

**Why this matters:** A user who gets a profile for ABS and doesn't know to use a textured PEI plate and fully enclosed printer will waste a print. This is exactly the kind of context that differentiates a smart assistant from a settings calculator.

---

## What Works Well

1. **Dark theme execution** — The colour palette (#0a0a0b / #111114 / brand colours) is premium and consistent. Feels native to the space.
2. **Step-by-step wizard pattern** — Correct for this complexity level. One decision per screen reduces anxiety.
3. **Progress indicator micro-detail** — The expanding dot pill for the active step is a genuinely nice detail. Keep it.
4. **Material difficulty grouping** — Beginner / Intermediate / Advanced is exactly the right UX model for a mixed-experience audience.
5. **Colour dots on material cards** — Instant visual differentiator. Helps scanning without reading.
6. **Nozzle incompatibility handling** — Dimming instead of hiding incompatible options is the right call. It teaches users about constraints rather than silently removing them.
7. **Temp card at top of output** — Correct priority. The two numbers users need most are the first thing they see.
8. **Simple/Advanced toggle** — Well-positioned and well-labelled. Right tension between power-user and beginner needs.
9. **Warning card for ABS/ASA** — Orange contextual alert is immediately scannable. Good pattern to extend.
10. **Back button labelling** — Shows the name of the previous screen ("‹ Brand", "‹ Printer"), which is correct iOS convention and reduces disorientation.

---

## Priority Implementation Plan

### P0 — Must fix before SwiftUI implementation

These are design decisions that would require rework if addressed after code is written.

| # | Change | Effort | Why now |
|---|--------|--------|---------|
| P0-1 | **Add Filament Info card** to output screen (between temp card and slicer badge) | M | Affects output screen layout and data requirements |
| P0-2 | **Restructure Goals screen** — hide Environment + Experience behind "More options" | S | Affects which engine params are primary vs secondary |
| P0-3 | **Standardise section header token** (one style across all screens) | S | Defines a design system rule before code is written |
| P0-4 | **Standardise selection card pattern** (one `SelectedCheck` component) | S | Becomes a reusable SwiftUI component |

### P1 — High priority (build correctly from start)

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| P1-1 | **Add search to printer list** | M | High — 64 printers is a lot to scroll |
| P1-2 | **Fix "Very cold" → "< 0°C"** in environment segment | XS | Prevents truncation crash |
| P1-3 | **Add nozzle incompatibility reason text** inside dimmed cards | S | Teaches users, reduces confusion |
| P1-4 | **Add loading state** on output screen transition | S | Prevents jarring instant-snap feel |
| P1-5 | **Replace ⎘ export symbol** with proper share icon + touch area | XS | Accessibility + discoverability |
| P1-6 | **Increase chip touch targets** from ~37px to 44px (add padding-top/bottom: 12px) | XS | Accessibility — currently fails |
| P1-7 | **Add material prep hints** to material cards (one-liner: "Dry before printing" etc.) | S | Prevents beginner mistakes before they reach output |
| P1-8 | **Review Simple mode param count** — should show ~6–8 per tab, not 3 | M | Requires aligning with engine.js `mode` field |

### P2 — Polish (can be addressed in Phase 4)

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| P2-1 | Add "More options" expanding section on Goals (Environment, Experience, Support, Colors) | M | Reduces cognitive load for casual users |
| P2-2 | Tighten output header zone (slicer badge + mode toggle — can they merge?) | S | More content visible above fold |
| P2-3 | Add a "material info tap" — brief sheet on material card long-press or info button | M | Nice for Phase 2 alongside filament profile |
| P2-4 | Replace placeholder emoji brand icons with consistent icon treatment | M | Visual polish |
| P2-5 | Add "Recently configured" shortcut on home screen for returning users | M | Retention UX |
| P2-6 | Raise t30 section header opacity to t40 for accessibility | XS | Marginal contrast improvement |
| P2-7 | Make CTA copy screen-specific ("Select Printer →" vs generic "Next →") | XS | Small momentum improvement |
| P2-8 | Fix thousands separator on speed/accel values (5,000 not 5 000) | XS | Detail |

---

## Recommended Prototype v2 Changes

Before handing to Claude Code for SwiftUI implementation, update the prototype with P0 + P1 items:

1. Add the Filament Info card (this alone changes the output screen layout significantly)
2. Restructure Goals to show 3 primary + "More options" toggle
3. Standardise section headers and selection checkmarks visually
4. Fix chip touch targets, "Very cold" label, export symbol

Once the revised prototype looks right, generate a **design handoff doc** (`/design:design-handoff`) for Claude Code to use as the implementation spec.

---

*Generated by design-critique skill · 2026-04-03*
