# Prototype v2 — Design Spec
**File to update:** `3dprintassistant-ios-prototype.html` (in `/Projects/`)
**Source critique:** `UI-CRITIQUE.md`
**Date:** 2026-04-03

This spec covers all P0 (must-fix) and P1 (high-priority) changes from the design critique.
Implement each change exactly as described. Do not add features not listed here.

---

## Summary of changes

| # | Screen | Change | Priority |
|---|--------|--------|----------|
| C1 | Output | Add Filament Info card | P0 |
| C2 | Goals | Restructure — hide secondary controls behind "More options" | P0 |
| C3 | All | Unify section header style | P0 |
| C4 | All | Unify selection checkmark component | P0 |
| C5 | Printer | Add search field | P1 |
| C6 | Goals | Fix "Very cold" label | P1 |
| C7 | Nozzle | Add incompatibility reason text | P1 |
| C8 | Goals→Output | Add loading state transition | P1 |
| C9 | Output | Replace ⎘ export symbol | P1 |
| C10 | Goals | Increase chip touch targets | P1 |
| C11 | Material | Add prep hint line per material card | P1 |

---

## C1 — Add Filament Info card (Output screen) `P0`

**Where:** Output screen, between the temp card and the slicer badge row.

**What it shows:** A compact card with 4 rows of preparation context from `getFilamentProfile()`. In the prototype this is hardcoded per material.

**Layout:** 4 rows inside a surface card. Each row = left label + right value, separated by a thin border.

```
┌───────────────────────────────────────────┐
│  Build plate     Cool Plate               │
│  Drying          Not required             │  ← normal colour
│  Drying          Dry 65°C · 6h ⚠          │  ← orange if required
│  AMS             Compatible               │
│  Enclosure       Not required             │
│  Enclosure       Required ⚠               │  ← orange if required
└───────────────────────────────────────────┘
```

**Styling:**
- Card: same style as temp card (`background: var(--surface)`, `border-radius: 20px`, `margin: 0 20px 10px`, `padding: 0`)
- Each row: `padding: 11px 16px`, `display: flex`, `justify-content: space-between`, `border-bottom: 1px solid var(--border)`, last row no border
- Label: `font-size: 12px`, `font-weight: 700`, `color: var(--t30)`, uppercase, `letter-spacing: 0.06em`
- Value (normal): `font-size: 13px`, `font-weight: 600`, `color: var(--text)`
- Value (warning — drying required or enclosure required): `color: var(--warning)` + append ` ⚠`

**Per-material data to hardcode in JS:**

```js
const FILAMENT_PROFILES = {
  pla_basic: { buildPlate: 'Cool Plate',        ams: true,  drying: null,          enclosure: null },
  pla_matte: { buildPlate: 'Cool Plate',        ams: true,  drying: null,          enclosure: null },
  pla_silk:  { buildPlate: 'Cool Plate',        ams: true,  drying: '55°C · 8h',   enclosure: null },
  petg:      { buildPlate: 'Smooth PEI',        ams: true,  drying: '65°C · 6h',   enclosure: null },
  abs:       { buildPlate: 'Textured PEI',      ams: true,  drying: '80°C · 4h',   enclosure: 'Required' },
  asa:       { buildPlate: 'Textured PEI',      ams: true,  drying: '80°C · 4h',   enclosure: 'Required' },
  tpu_95a:   { buildPlate: 'Textured PEI',      ams: false, drying: '65°C · 6h',   enclosure: null },
  pa_cf:     { buildPlate: 'Engineering Plate', ams: false, drying: '80°C · 12h',  enclosure: 'Required' },
  pc:        { buildPlate: 'Engineering Plate', ams: false, drying: '80°C · 8h',   enclosure: 'Required' },
};
```

**Render logic (pseudocode):**
```
fp = FILAMENT_PROFILES[S.material] ?? FILAMENT_PROFILES['pla_basic']
row('Build plate', fp.buildPlate, false)
row('Drying',      fp.drying ?? 'Not required', fp.drying !== null)
row('AMS',         fp.ams ? 'Compatible' : 'Not compatible ⚠', !fp.ams)
row('Enclosure',   fp.enclosure ?? 'Not required', fp.enclosure !== null)
```

**Inject into `buildOutput()`** — update the filament card content every time the output screen is built.

---

## C2 — Restructure Goals screen `P0`

**Problem:** 5 segmented controls + chip group on one screen is too heavy.

**Solution:** Show 3 primary controls. Hide 2 secondary controls (Environment, Experience) plus Support and Colors behind a tappable "More options" row.

**Primary controls (always visible):**
1. "What are you printing?" — chip group (use case)
2. Surface quality — segmented control (draft / standard / fine / max)
3. Strength — segmented control (minimal / standard / strong / max)
4. Print speed — segmented control (fast / balanced / quality)

**"More options" row:**
- A tappable row at the bottom of the scroll area
- Default: collapsed, shows "More options  ›" in `var(--t60)` at 14px, with a subtle chevron
- When tapped: toggles open to reveal the secondary controls with a smooth max-height CSS transition (300ms ease)
- Arrow rotates 90° when expanded

**Secondary controls (inside "More options"):**
- Environment — segmented control: Normal / Cold / Below 0° / Humid
- Experience — segmented control: Beginner / Intermediate / Advanced

**HTML structure for "More options":**
```html
<div class="more-opts-toggle" onclick="toggleMoreOpts()">
  <span>More options</span>
  <span class="more-opts-chevron" id="more-chevron">›</span>
</div>
<div class="more-opts-content" id="more-opts">
  <!-- environment + experience seg controls here -->
</div>
```

**CSS for collapse/expand:**
```css
.more-opts-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}
.more-opts-content.open {
  max-height: 300px;
}
.more-opts-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  cursor: pointer;
  color: var(--t60);
  font-size: 14px;
  font-weight: 600;
  border-top: 1px solid var(--border);
  margin-top: 8px;
  user-select: none;
}
.more-opts-chevron {
  transition: transform 0.3s ease;
  font-size: 18px;
}
.more-opts-chevron.open {
  transform: rotate(90deg);
}
```

**JS:**
```js
function toggleMoreOpts() {
  const content = document.getElementById('more-opts');
  const chevron = document.getElementById('more-chevron');
  content.classList.toggle('open');
  chevron.classList.toggle('open');
}
```

---

## C3 — Unified section header style `P0`

**Problem:** 3 different section header styles currently used (`.section-h`, `.goal-label`, `.list-group-label`).

**Solution:** One CSS class `.sec-h` used everywhere a section header appears.

**Spec:**
```css
.sec-h {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.40);   /* t40 — up from t30 for accessibility */
  margin: 18px 0 9px;
}
.sec-h:first-child { margin-top: 4px; }
```

**Replace all uses of:**
- `.section-h` → `.sec-h`
- `.goal-label` → `.sec-h` (remove extra top margin override, use standard)
- `.list-group-label` → use `.sec-h` inside `.list-group`, padding adjusted: `padding: 10px 16px 4px` rather than margin

---

## C4 — Unified selection checkmark `P0`

**Problem:** Brand cards use one checkmark style, material/nozzle cards use another. Minor size and placement differences.

**Solution:** One consistent CSS class `.sel-check` used for all selection indicators.

**Spec:**
```css
.sel-check {
  width: 22px;
  height: 22px;
  border-radius: 11px;
  background: var(--primary);
  color: #000;
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0);
  flex-shrink: 0;
  transition: opacity 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
              transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}
/* For brand cards — positioned absolute top-right */
.sel-check.corner {
  position: absolute;
  top: 10px;
  right: 10px;
}
/* Triggered by .sel class on parent */
.brand-card.sel .sel-check,
.mat-card.sel .sel-check,
.nozzle-card.sel .sel-check,
.list-row.sel .sel-check {
  opacity: 1;
  transform: scale(1);
}
```

Replace all existing `.brand-check`, `.row-check` with `.sel-check` (add `.corner` for brand cards only).

---

## C5 — Printer search `P1`

**Where:** Top of the printer list scroll area, before the first group.

**What:** A text input that filters `PRINTERS[S.brand]` items by name in real time.

**Styling:**
```css
.search-bar {
  background: var(--surface);
  border: 1.5px solid var(--border2);
  border-radius: 13px;
  padding: 11px 14px 11px 36px;  /* left pad for icon */
  font-size: 15px;
  font-family: 'Syne', sans-serif;
  color: var(--text);
  width: 100%;
  margin-bottom: 14px;
  outline: none;
  position: relative;
}
.search-bar::placeholder { color: var(--t30); }
.search-bar:focus { border-color: var(--primary); }
.search-wrap {
  position: relative;
  margin-bottom: 14px;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--t30);
  pointer-events: none;
}
```

**HTML (inject at top of `#printer-list` inside `buildPrinters()`):**
```html
<div class="search-wrap">
  <span class="search-icon">🔍</span>
  <input class="search-bar" type="text" placeholder="Search printers…"
         oninput="filterPrinters(this.value)" id="printer-search">
</div>
```

**JS filter logic:**
```js
function filterPrinters(query) {
  const q = query.toLowerCase().trim();
  const groups = PRINTERS[S.brand] || [];
  const filtered = groups.map(g => ({
    ...g,
    items: g.items.filter(p => p.name.toLowerCase().includes(q))
  })).filter(g => g.items.length > 0);
  // Re-render only the list-group divs (not the search bar)
  const listEl = document.getElementById('printer-list');
  const groupsHTML = filtered.length > 0
    ? renderPrinterGroups(filtered)
    : '<p style="color:var(--t30);text-align:center;padding:24px 0;font-size:14px;">No printers found</p>';
  // Replace everything after the search bar
  const searchWrap = listEl.querySelector('.search-wrap');
  listEl.innerHTML = '';
  listEl.appendChild(searchWrap);
  listEl.insertAdjacentHTML('beforeend', groupsHTML);
}
```

Extract the group rendering into a helper `renderPrinterGroups(groups)` so both `buildPrinters()` and `filterPrinters()` can call it.

---

## C6 — Fix "Very cold" environment label `P1`

**Where:** Goals screen, Environment segmented control.

**Change:** Replace "Very cold" with "Below 0°" (fits within a 4-option seg control at 393pt width).

```html
<!-- before -->
<div class="seg-opt" onclick="setSeg('environment','vcold',this)">Very cold</div>
<!-- after -->
<div class="seg-opt" onclick="setSeg('environment','vcold',this)">Below 0°</div>
```

---

## C7 — Nozzle incompatibility reason `P1`

**Where:** Nozzle screen — the greyed-out incompatible nozzle cards.

**What:** Add a one-line reason inside the dimmed card, below the description text.

**Per-nozzle incompatibility reasons (hardcode in JS):**

```js
const INCOMPAT_REASONS = {
  'std_0.4':  'Standard steel wears quickly with abrasive or carbon-fibre materials.',
  'prec_0.2': 'Precision nozzles are for soft materials only — too fine for abrasive or high-temp filaments.',
};
```

**HTML change inside `buildNozzles()`:** If `ic === true`, append after `.nozzle-desc`:
```html
<div class="incompat-reason">⚠ [reason text]</div>
```

**CSS:**
```css
.incompat-reason {
  font-size: 11px;
  font-weight: 600;
  color: var(--warning);
  margin-top: 7px;
  opacity: 0.8;
}
```

---

## C8 — Loading state transition `P1`

**Where:** Between Goals screen (tapping "Generate Profile →") and Output screen.

**What:** A brief 900ms loading state before the output renders. Gives the impression of calculation happening.

**Implementation:** Don't add a new screen. Instead, on the Output screen itself, add a loading overlay div that covers the content. Show it, wait 900ms, then hide it with a fade-out.

**HTML (inside `#s-output`, as first child after `.top-pad`):**
```html
<div id="output-loader" style="
  position: absolute; inset: 0; z-index: 50;
  background: var(--bg);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 16px;
">
  <div class="loader-ring"></div>
  <div style="font-size:13px; font-weight:700; color:var(--t60); letter-spacing:0.04em;">
    Calculating profile…
  </div>
</div>
```

**CSS for spinner:**
```css
.loader-ring {
  width: 36px; height: 36px;
  border: 2.5px solid var(--border2);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

**JS change in `go('output')`:**
```js
// After screen transition, show loader, then build output after delay
function go(id) {
  // ... existing navigation logic ...
  if (id === 'output') {
    const loader = document.getElementById('output-loader');
    loader.style.display = 'flex';
    loader.style.opacity = '1';
    setTimeout(() => {
      buildOutput();
      loader.style.transition = 'opacity 0.3s ease';
      loader.style.opacity = '0';
      setTimeout(() => { loader.style.display = 'none'; }, 300);
    }, 900);
  }
}
```

---

## C9 — Replace ⎘ export symbol `P1`

**Where:** Output screen nav bar, right side.

**Change:** Replace the `⎘` character with a proper share label and a touch-safe button.

```html
<!-- before -->
<div class="nav-action" title="Export">⎘</div>

<!-- after -->
<div class="nav-action" onclick="alert('Export coming in Phase 4')"
     style="font-size:13px; font-weight:700; padding: 8px 0 8px 12px; min-width:44px; text-align:right;">
  Share
</div>
```

The `alert()` placeholder makes it clear the feature is not yet wired — swap for real share logic in Phase 4.

---

## C10 — Increase chip touch targets `P1`

**Where:** Goals screen chip group.

**Change:** Increase vertical padding on `.chip` from `9px` to `12px` so the touch target reaches the iOS 44pt minimum.

```css
/* before */
.chip { padding: 9px 16px; }

/* after */
.chip { padding: 12px 16px; }
```

---

## C11 — Material prep hints `P1`

**Where:** Material screen — inside each material card.

**What:** A third line inside each material card showing a one-liner prep warning where relevant. Only show for materials that have meaningful prep requirements. Don't show for simple materials (PLA Basic, PLA Matte).

**Hardcode per material (add to the HTML material cards directly):**

| Material | Hint |
|----------|------|
| PLA Silk | "Dry recommended · Decorative use" |
| PETG | "Dry 6h at 65°C for best results" |
| ABS | "Enclosure required · Dry before printing" |
| ASA | "Enclosure required · UV stable outdoors" |
| TPU 95A | "Direct drive preferred · AMS not supported" |
| PA-CF | "Hardened nozzle required · Dry 12h at 80°C" |
| PC | "Hardened nozzle recommended · Dry before printing" |

**HTML structure per card (only for materials that have hints):**
```html
<div class="mat-card" onclick="pickMaterial('abs',this)">
  <div class="mat-dot" style="..."></div>
  <div class="mat-info">
    <div class="mat-name">ABS</div>
    <div class="mat-sub">Heat resistant · Enclosure required</div>
    <div class="mat-hint">Enclosure required · Dry before printing</div>
  </div>
  <div class="sel-check">✓</div>
</div>
```

**CSS:**
```css
.mat-hint {
  font-size: 11px;
  font-weight: 600;
  color: var(--warning);
  margin-top: 3px;
  opacity: 0.85;
}
```

---

## Notes for Claude Code

- The prototype is a **single self-contained HTML file** — all CSS, HTML, and JS in one file.
- It uses **Google Fonts** (Syne + DM Mono) via CDN link in `<head>`.
- CSS variables are defined in `:root` at the top.
- No build step, no npm, no dependencies — just open in a browser.
- After changes, do a quick sanity check: open the file, click through the full flow (Home → Bambu Lab → X1 Carbon → ABS → Hardened 0.4mm → Goals → Output) and verify:
  - Filament card appears on output with orange "Required" values
  - Loading spinner appears for ~900ms before output renders
  - Goals shows 3 seg controls + "More options" toggle
  - Search filters printers in real time
  - Chips are taller (44pt)
  - "Share" button visible instead of ⎘
