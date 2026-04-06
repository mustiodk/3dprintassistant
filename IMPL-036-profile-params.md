# IMPL-036 — Profile Parameter Data Architecture + Value Correctness

> **Status:** Planned | **Priority:** High | **Scope:** Medium-Large
> **Tracking:** BACKLOG.md #036

---

## Problem Statement

Several slicer parameter values in `engine.js` are hardcoded string literals instead of being driven by data files. This causes:
1. **Value drift** — display strings don't match actual slicer dropdown values (e.g. `"Enabled — Monotonic line"`, `"Auto (Rectilinear)"`, `"Aligned (or Back)"`)
2. **Export bugs** — `internal_solid_infill_pattern` exports as `"zig-zag"` (invalid BS value)
3. **Missing parameters** — `ironing_pattern` never exported separately
4. **Locked options** — support_style uses 2 of 5 BS options; no use-case awareness
5. **Architectural inconsistency** — some settings are data-driven, others are hardcoded; mixing concerns

---

## Architectural Principle (Post-Refactor)

> **Data files store BS-compatible values. Engine reads them and maps to display strings. Export passes values through — no regex heuristics.**

The old pattern (display string → export regex → BS value) is replaced with:
- `objective_profiles.json` → stores `"back"`, `"top"`, `"monotonic"` (BS JSON values)
- `engine.js` → reads data value, looks up human-readable label for UI display
- `exportBambuStudioJSON()` → passthrough, no transforms needed for these params

---

## Scope of Changes

### Files Modified
- `data/rules/objective_profiles.json` — extend surface_quality + strength_levels
- `engine.js` — resolveProfile(), exportBambuStudioJSON(), SLICER_TABS, SLICER_PARAM_LABELS, PARAM_MAP
- `locales/en.json` + `locales/da.json` — new display label keys

---

## Step 1 — Extend `objective_profiles.json`

### Surface Quality — New Fields

Replace `ironing` (boolean) and `seam_aligned` (boolean) with richer fields:

| Field | draft | standard | fine | very_fine | ultra | maximum |
|-------|-------|----------|------|-----------|-------|---------|
| `seam_position` | `"aligned"` | `"aligned"` | `"back"` | `"back"` | `"back"` | `"back"` |
| `only_one_wall_top` | `false` | `false` | `true` | `true` | `true` | `true` |
| `ironing_type` | `"no ironing"` | `"no ironing"` | `"top"` | `"top"` | `"top"` | `"solid"` |
| `ironing_pattern` | `null` | `null` | `"monotonicline"` | `"monotonicline"` | `"monotonicline"` | `"monotonicline"` |
| `internal_solid_infill_pattern` | `"rectilinear"` | `"rectilinear"` | `"monotonic"` | `"monotonic"` | `"monotonic"` | `"monotonic"` |

**BS JSON value reference:**
- `ironing_type`: `"no ironing"` / `"top"` (Top surfaces) / `"topmost"` (Topmost surface) / `"solid"` (All solid layer)
- `ironing_pattern`: `"monotonic"` / `"monotonicline"` / `"rectilinear"` / `"concentric"`
- `seam_position`: `"nearest"` / `"aligned"` / `"back"` / `"random"`
- `internal_solid_infill_pattern`: `"rectilinear"` / `"monotonic"` / `"monotonicline"` / `"concentric"` / `"alignedrectilinear"` / `"hilbertcurve"` / `"archimedeanchords"` / `"octagramspiral"`
- `only_one_wall_top`: `"0"` / `"1"` (boolean — BS 1.x/2.x compatible)

**Remove:** `ironing` (boolean), `seam_aligned` (boolean) — replaced by the above.

### Strength Levels — No New Fields Needed
`internal_solid_infill_pattern` is driven by surface quality (not strength). No changes needed.

### Speed Priority — No New Fields Needed
Infill pattern is per-strength-level. Anchor lengths are left at BS defaults (too advanced to surface).

---

## Step 2 — Update `engine.js` — resolveProfile()

### 2a. Seam position (replace hardcoded logic)

**Old:**
```javascript
const seamLabels = { aligned: 'Aligned', sharpest_corner: 'Sharpest corner', random: 'Random', back: 'Back' };
// ...
p.seam_position = S('Aligned (or Back)', 'description');
// or via state.seam override
p.seam_position = S(seamLabels[state.seam] || state.seam, 'description');
```

**New:**
```javascript
const SEAM_DISPLAY = { nearest: 'Nearest', aligned: 'Aligned', back: 'Back', random: 'Random' };
const seamDefault = surface?.seam_position || 'aligned';
const seamValue   = (state.seam && SEAM_DISPLAY[state.seam]) ? state.seam : seamDefault;
p.seam_position = S(SEAM_DISPLAY[seamValue] || seamValue, 'Seam placement description...');
```

### 2b. Only one wall on top (replace hardcoded)

**Old:**
```javascript
if (isFineOrBetter) {
  p.only_one_wall_top = A('Enabled', 'description');
}
```

**New:**
```javascript
if (surface?.only_one_wall_top) {
  p.only_one_wall_top = A('Enabled', 'description');
}
```

### 2c. Ironing (split into type + pattern, data-driven)

**Old:**
```javascript
const ironingEnabled = ironingState === 'on' ||
  (ironingState === 'auto' && surface && ['fine', 'maximum', 'very_fine', 'ultra'].includes(surface.id));
if (ironingEnabled) {
  p.ironing = S('Enabled — Monotonic line', 'description');
}
```

**New:**
```javascript
const IRONING_DISPLAY = {
  'no ironing': 'No ironing',
  'top':        'Top surfaces',
  'topmost':    'Topmost surface',
  'solid':      'All solid layers',
};
const IRONING_PATTERN_DISPLAY = {
  'monotonic':     'Monotonic',
  'monotonicline': 'Monotonic line',
  'rectilinear':   'Rectilinear',
  'concentric':    'Concentric',
};

// Resolve ironing type: state override > surface default
let ironingType = surface?.ironing_type || 'no ironing';
if (ironingState === 'off') ironingType = 'no ironing';
if (ironingState === 'on' && ironingType === 'no ironing') ironingType = 'top'; // force-on for surfaces that default off

if (ironingType !== 'no ironing') {
  const patternKey = surface?.ironing_pattern || null;
  const patternLabel = patternKey ? IRONING_PATTERN_DISPLAY[patternKey] : null;
  const displayLabel = patternLabel
    ? `${IRONING_DISPLAY[ironingType]} — ${patternLabel}`
    : IRONING_DISPLAY[ironingType];
  p.ironing_type    = S(displayLabel, 'Ironing smooths the top surface by running a hot nozzle pass...');
  p.ironing_pattern = patternKey; // raw BS value, passed through to export
}
```

### 2d. Internal solid infill pattern (data-driven)

**Old:**
```javascript
p.internal_solid_infill_pattern = A('Auto (Rectilinear)', 'description');
```

**New:**
```javascript
const INTERNAL_INFILL_DISPLAY = {
  'rectilinear':       'Rectilinear',
  'monotonic':         'Monotonic',
  'monotonicline':     'Monotonic line',
  'concentric':        'Concentric',
  'alignedrectilinear':'Aligned Rectilinear',
};
const internalPattern = surface?.internal_solid_infill_pattern || 'rectilinear';
p.internal_solid_infill_pattern = A(
  INTERNAL_INFILL_DISPLAY[internalPattern] || internalPattern,
  internalPattern === 'monotonic'
    ? 'Monotonic avoids direction changes for a more uniform top surface appearance.'
    : 'Rectilinear is the fastest solid infill pattern — ideal for internal layers.'
);
```

### 2e. Support style (expand from 2 → 5 options, use-case aware)

**Old:**
```javascript
p.support_style = S(isTree ? 'Tree Hybrid' : 'Default', 'description');
```

**New:**
```javascript
const SUPPORT_STYLE_DISPLAY = {
  'default':     'Default',
  'tree_slim':   'Tree Slim',
  'tree_strong': 'Tree Strong',
  'tree_hybrid': 'Tree Hybrid',
  'tree_organic':'Tree Organic',
};
const supportStyle = !isTree ? 'default'
  : (isDecorative || isMiniature) ? 'tree_slim'
  : isFunctional                  ? 'tree_strong'
  : 'tree_hybrid';

p.support_style = S(SUPPORT_STYLE_DISPLAY[supportStyle], 'Support style description...');
// Store raw BS value on a hidden field for export
p._support_style_key = supportStyle;
```

> **Note on `_support_style_key`**: Alternatively, store the BS-compatible value directly as the param value and add a display lookup in the export path. See Step 3 for how export reads it.

### 2f. Support type display (minor cleanup)

**Old:** `p.support_type = S('Tree' / 'Normal', ...)`
**New:** `p.support_type = S('Tree (auto)' / 'Normal (auto)', ...)`

Export transform already maps these correctly.

### 2g. Order of walls (minor cleanup)

**Old:** `p.order_of_walls = S('Inner / Outer', ...)`
**New:** `p.order_of_walls = S('Inner / Outer (infill last)', ...)`

Export transform already correctly maps to `"inner wall/outer wall/infill"`.

---

## Step 3 — Update `engine.js` — exportBambuStudioJSON()

### 3a. Add `ironing_pattern` to BAMBU_PROCESS_MAP
```javascript
ironing_type:    'ironing_type',     // was: ironing → ironing_type
ironing_pattern: 'ironing_pattern',  // NEW
```

### 3b. Update ironing transform (simplified — data provides BS values)
```javascript
// OLD (regex heuristic):
if (engineKey === 'ironing') {
  process[bsKey] = /enabled/i.test(String(raw)) ? 'top' : 'no ironing';
  return;
}

// NEW (passthrough — value from data file is already a valid BS value):
// ironing_type: 'top', 'topmost', 'solid', 'no ironing' → pass through
// ironing_pattern: 'monotonicline', 'monotonic' etc → pass through
// No special handler needed for these two params.
```

### 3c. Fix `internal_solid_infill_pattern` export
```javascript
// OLD (BUG — "zig-zag" is not a valid BS value):
if (engineKey === 'internal_solid_infill_pattern') {
  process[bsKey] = /rectilinear|auto/i.test(String(raw)) ? 'zig-zag' : String(raw).toLowerCase();
  return;
}

// NEW (passthrough — display label → BS JSON value lookup):
if (engineKey === 'internal_solid_infill_pattern') {
  const INTERNAL_PATTERN_MAP = {
    'rectilinear':        'rectilinear',
    'monotonic':          'monotonic',
    'monotonic line':     'monotonicline',
    'aligned rectilinear':'alignedrectilinear',
    'hilbert curve':      'hilbertcurve',
    'archimedean chords': 'archimedeanchords',
    'octagram spiral':    'octagramspiral',
    'concentric':         'concentric',
  };
  process[bsKey] = INTERNAL_PATTERN_MAP[String(raw).toLowerCase()] || 'rectilinear';
  return;
}
```

### 3d. Expand `support_style` transform
```javascript
// OLD (only handles 2 of 5):
if (engineKey === 'support_style') {
  process[bsKey] = /tree hybrid/i.test(String(raw)) ? 'tree_hybrid' : 'default';
  return;
}

// NEW (all 5 options):
if (engineKey === 'support_style') {
  const STYLE_MAP = {
    'tree slim':    'tree_slim',
    'tree strong':  'tree_strong',
    'tree hybrid':  'tree_hybrid',
    'tree organic': 'tree_organic',
    'default':      'default',
  };
  process[bsKey] = STYLE_MAP[String(raw).toLowerCase()] || 'default';
  return;
}
```

### 3e. Seam position — keep existing transform (already correct)
No change needed.

### 3f. `only_one_wall_top` — keep boolean export ("0"/"1")
No change needed. The boolean form works in BS 1.x/2.x.

### 3g. Update SLICER_TABS for ironing split

**Old (Quality tab):**
```javascript
{ label: 'Ironing', params: ['ironing'] },
```

**New:**
```javascript
{ label: 'Ironing', params: ['ironing_type', 'ironing_pattern'] },
```

Update for all three slicers (bambu_studio, prusaslicer, orcaslicer).

### 3h. Update SLICER_PARAM_LABELS

Add labels for new params across all three slicers:
```javascript
// bambu_studio
ironing_type:                   'Ironing type',
ironing_pattern:                'Ironing pattern',

// prusaslicer
ironing_type:                   'Enable ironing',
ironing_pattern:                'Ironing pattern',

// orcaslicer
ironing_type:                   'Ironing type',
ironing_pattern:                'Ironing pattern',
```

---

## Step 4 — Update locales

### en.json — new keys (none required)
All display mapping is done via in-engine lookup tables (SEAM_DISPLAY, IRONING_DISPLAY, etc.), not i18n keys. This is correct — these are slicer dropdown label names that must stay in English per CLAUDE.md (`PARAM_LABELS stay in English`).

---

## Complete Before/After: Display & Export Values

| Param | Old display | Old BS export | New display | New BS export |
|-------|-------------|---------------|-------------|---------------|
| `seam_position` (fine) | "Aligned (or Back)" | "aligned" | "Back" | "back" |
| `seam_position` (override) | "Sharpest corner" | "nearest" | "Nearest" | "nearest" |
| `ironing_type` | "Enabled — Monotonic line" | "top" | "Top surfaces — Monotonic line" | "top" |
| `ironing_pattern` | *(missing)* | *(not exported)* | "Monotonic line" | "monotonicline" |
| `internal_solid_infill_pattern` | "Auto (Rectilinear)" | **"zig-zag" ❌** | "Rectilinear" / "Monotonic" | "rectilinear" / "monotonic" ✅ |
| `only_one_wall_top` | "Enabled" | "1" | "Enabled" | "1" |
| `support_type` | "Tree" | "tree(auto)" | "Tree (auto)" | "tree(auto)" |
| `support_style` (decorative) | "Tree Hybrid" | "tree_hybrid" | "Tree Slim" | "tree_slim" |
| `support_style` (functional) | "Tree Hybrid" | "tree_hybrid" | "Tree Strong" | "tree_strong" |
| `order_of_walls` | "Inner / Outer" | "inner wall/outer wall/infill" | "Inner / Outer (infill last)" | "inner wall/outer wall/infill" |

---

## Implementation Checklist

### Phase A — Data (objective_profiles.json)
- [ ] Add `seam_position` to all 6 surface_quality entries (remove `seam_aligned`)
- [ ] Add `only_one_wall_top` (boolean) to all 6 entries (remove old boolean `ironing`)
- [ ] Add `ironing_type` to all 6 entries
- [ ] Add `ironing_pattern` (null or string) to all 6 entries
- [ ] Add `internal_solid_infill_pattern` to all 6 entries

### Phase B — Engine resolveProfile()
- [ ] Replace seam logic with data read + SEAM_DISPLAY lookup
- [ ] Replace only_one_wall_top condition with `surface.only_one_wall_top`
- [ ] Replace ironing block with ironing_type + ironing_pattern (two separate params)
- [ ] Replace internal_solid_infill_pattern hardcode with data read + INTERNAL_INFILL_DISPLAY
- [ ] Expand support_style logic (use case awareness: slim/strong/hybrid/organic)
- [ ] Update support_type display: "Tree" → "Tree (auto)", "Normal" → "Normal (auto)"

### Phase C — Engine exportBambuStudioJSON()
- [ ] Add `ironing_type` + `ironing_pattern` to BAMBU_PROCESS_MAP
- [ ] Remove old `ironing` entry from PARAM_MAP
- [ ] Remove ironing special-case handler (passthrough now)
- [ ] Fix `internal_solid_infill_pattern` transform: "zig-zag" → proper BS value map
- [ ] Expand `support_style` transform: 5 options, not 2
- [ ] Update SLICER_TABS: `['ironing']` → `['ironing_type', 'ironing_pattern']` (all 3 slicers)
- [ ] Add `ironing_type` + `ironing_pattern` to SLICER_PARAM_LABELS (all 3 slicers)

### Phase D — Verify
- [ ] Run test-export.html: check ironing_type + ironing_pattern in filament/process JSON
- [ ] Check internal_solid_infill_pattern value in exported JSON (must not be "zig-zag")
- [ ] Import process profile into Bambu Studio — confirm ironing, solid infill, support style load correctly
- [ ] Verify seam_position "back" displays correctly in BS for fine/very_fine/ultra/maximum
- [ ] Verify support_style "tree_slim" and "tree_strong" work in BS import

---

## Out of Scope (Follow-up Backlog Items)

- Anchor lengths (`sparse_infill_anchor`, `sparse_infill_anchor_max`) — too advanced for current scope
- Infill pattern variation by speed (Lightning for fast+minimal) — separate backlog item #037
- `only_one_wall_top` enum upgrade ("top_surfaces"/"topmost_surface") — defer until BS version confirmed
- PrusaSlicer-specific seam options (Sharpest corner is valid there) — scope to PS slicer context in follow-up
