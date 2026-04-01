# 3D Print Assistant — Feature Backlog

Ideas, improvements, and user suggestions captured for future development.
Managed by the `3dpa-backlog` skill — say "add to backlog: [idea]" to add an item.

## Status legend
- **Idea** — captured, not yet assessed
- **Planned** — approved for development
- **In Progress** — currently being built
- **Done** — shipped

---

<!-- New items are appended below this line -->

---

### #001 — AMS Purge Volume Calculator

**Status:** Planned
**Added:** 2026-04-01
**Scope:** Medium
**Source:** Previously shipped feature, removed from nav for site launch simplification

**Description:**
A dedicated calculator that shows recommended filament flush volumes (mm³) between AMS color slots. Users select how many slots are active (2–4), assign a brightness level to each slot (dark / medium / light), and the tool generates a flush volume matrix — one value per source→target transition. Volumes are adjusted by material multiplier (e.g. PETG flushes higher than PLA). Helps prevent color contamination in multi-color prints.

**Implementation Plan:**
- [ ] engine.js — restore purge translation strings (navPurge, purgeTitle, purgeSub, purgeSlots, etc.) and purge volume calculation logic
- [ ] app.js — restore `purgeState`, `renderPurgeCalculator()`, nav event listener, `setView('purge')` case, `applyLang` purge strings
- [ ] index.html — restore `#navPurge` button and `#viewPurge` container
- [ ] style.css — restore `.purge-*` component styles

**Raw idea:**
> remove the ams purge page from the site but add it to the backlog as a future feature we should implement.

---

### #002 — Match Bambu Studio Process Tab Structure

**Status:** Done
**Added:** 2026-04-01
**Updated:** 2026-04-02 (full audit from Bambu Studio screenshots)
**Scope:** Medium
**Source:** Existing implementation plan + Bambu Studio v1.10 screenshots

**Description:**
Restructure `PROFILE_TABS` sections in engine.js to exactly match Bambu Studio's Process tab layout. The sections concept is already implemented in code — the issue is that our section names and parameter groupings don't match the actual Bambu Studio UI. This makes it harder for users to find settings in their slicer.

**Bambu Studio Actual Structure (verified from screenshots 2026-04-02):**

Quality tab:
1. **Layer height** — Layer height, Initial layer height
2. **Line width** — Default, Initial layer, Outer wall, Inner wall, Top surface, Sparse infill, Internal solid infill, Support
3. **Seam** — Seam position, + scarf seam settings
4. **Precision** — Slice gap closing radius, Resolution, Arc fitting, X-Y hole compensation, X-Y contour compensation, Auto circle contour-hole compensation, Elephant foot compensation, Precise Z height
5. **Ironing** — Ironing Type (separate section, NOT in Others)
6. **Wall generator** — Wall generator (separate section, NOT in Precision)
7. **Advanced** — Order of walls, Print infill first, Bridge flow, Thick bridges, Only one wall on top surfaces, Only one wall on first layer, Smooth speed discontinuity area, Smooth coefficient, Avoid crossing wall, Smoothing wall speed along Z

Strength tab:
1. **Walls** — Wall loops, Embedding wall into infill, Detect thin wall
2. **Top/bottom shells** — Top/bottom surface patterns, densities, shell layers, thicknesses, paint penetration layers, Internal solid infill pattern
3. **Sparse infill** — Sparse infill density, Fill multiline, Sparse infill pattern, Anchor settings
4. **Advanced** — Infill/Wall overlap, Infill direction, Bridge direction, Min sparse infill threshold, Infill combination, Detect narrow internal solid infill, Ensure vertical shell thickness, Detect floating vertical shells

Speed tab:
1. **Initial layer speed** — Initial layer, Initial layer infill
2. **Other layers speed** — Outer wall, Inner wall, Small perimeters, Small perimeter threshold, Sparse infill, Internal solid infill, Vertical shell speed, Top surface, Slow down for overhangs, Overhang speed, Slow down by height, Bridge, Gap infill, Support, Support interface
3. **Travel speed** — Travel
4. **Acceleration** — Normal printing, Travel, Initial layer travel, Initial layer, Outer wall, Inner wall, Top surface, Sparse infill

Support tab:
1. **Support** — Enable support, Type, Style, Threshold angle, On build plate only, Remove small overhangs
2. **Raft** — Raft layers
3. **Filament for Supports** — Support/raft base, Support/raft interface
4. **Advanced** — Initial layer density, Initial layer expansion, Support wall loops, Top Z distance, Bottom Z distance, Base pattern, Base pattern spacing, Pattern angle, Top/Bottom interface layers, Interface pattern, Top interface spacing, Normal support expansion, Support/object xy distance, Z overrides X/Y, Support/object first layer gap, Don't support bridges, Independent support layer height

Others tab:
1. **Bed adhesion** — Skirt loops, Skirt height, Brim type, Brim width, Brim-object gap
2. **Prime tower** — Enable, Skip points, Internal ribs, Width, Max speed, Brim width, Infill gap, Rib wall, Extra rib length, Rib width, Fillet wall
3. **Purge options** — Purge into objects' infill, Purge into objects' support
4. **Special mode** — Slicing Mode, Print sequence, Spiral vase, Timelapse, Fuzzy Skin, Fuzzy skin point distance, Fuzzy skin thickness
5. **Advanced** — Use beam interlocking, Interlocking depth
6. **G-code output** — Reduce infill retraction
7. **Post-processing scripts** — (text area)
8. **Notes** — (text area)

**Bambu Studio Filament Tab Structure (verified from screenshots 2026-04-02):**

Filament sub-tab:
1. **Basic information** — Type, Vendor, Default color, Diameter, Flow ratio, Density, Shrinkage, Velocity Adaptation Factor, Price, Softening temperature, Filament prime volume, Filament ramming length, Travel time after ramming, Precooling target temperature, Recommended nozzle temperature (Min/Max)
2. **Print temperature** — Per-plate bed temps (Cool Plate SuperTack, Cool Plate, Engineering Plate, Smooth PEI/High Temp Plate, Textured PEI Plate) each with Initial layer + Other layers, Nozzle temp with Initial layer + Other layers
3. **Volumetric speed limitation** — Adaptive volumetric speed, Max volumetric speed, Ramming volumetric speed
4. **Filament scarf seam settings** — Scarf seam type, Scarf start height, Scarf slope gap, Scarf length

Cooling sub-tab:
1. **Cooling for specific layer** — Special cooling settings (first N layers + fan speed)
2. **Part cooling fan** — Min/Max fan speed threshold (fan speed + layer time), Keep fan always on, Slow printing down for better layer cooling, Don't slow down outer walls, Min print speed, Force cooling for overhangs and bridges, Cooling overhang threshold, Overhang threshold for participating cooling, Fan speed for overhangs, Pre start fan time
3. **Auxiliary part cooling fan** — Fan speed

Setting Overrides sub-tab:
1. **Retraction** — Length, Z hop when retract, Z Hop Type, Retraction Speed, Deretraction Speed, Extra length on restart, Travel distance threshold, Retract when change layer, Wipe while retracting, Wipe Distance, Retract amount before wipe, Long retraction when cut, Retraction distance when cut
2. **Speed** — Override overhang speed

Advanced sub-tab:
1. **Filament start G-code** — (text area)
2. **Filament end G-code** — (text area)

**Changes needed (parameters we currently generate):**

Quality tab:
- Move `wall_generator` out of "Precision" → its own "Wall generator" section
- Move `order_of_walls`, `bridge_flow`, `avoid_crossing_walls`, `only_one_wall_top` out of "Others" → "Advanced" section
- Move `arc_fitting` from "Others" → "Precision"
- Move `ironing` from Others tab → Quality tab "Ironing" section
- Rename "Others" → "Advanced"

Strength tab:
- Rename "Infill" → "Sparse infill"
- Rename "Top / bottom" → "Top/bottom shells"
- Move `infill_combination` from "Sparse infill" → "Advanced" section (new)

Speed tab:
- Split "Speed" into "Initial layer speed" (initial_layer_speed) and "Other layers speed" (outer_wall_speed, inner_wall_speed, top_surface_speed, gap_fill_speed)

Support tab:
- Move `support_z_distance`, `support_interface_layers`, `support_interface_pattern` from "Support" → "Advanced" section (new)

Others tab:
- Split "Special" into: "Bed adhesion" (brim_width), "Prime tower" (prime_tower), "Purge options" (flush_into_infill), "Special mode" (slow_down_tall)

**Implementation Plan:**
- [ ] engine.js — restructure `PROFILE_TABS` sections to match the Bambu Studio layout documented above; move parameters to correct sections
- [ ] engine.js — in `resolveProfile()`, move `ironing` from Others tab output to Quality tab output
- [ ] Verify app.js rendering still works (sections concept already implemented, just names/grouping changes)
- [ ] Test all tabs render correctly with the new structure

**Raw idea:**
> Add sections concept to PROFILE_TABS so each tab renders with labeled sub-sections matching Bambu Studio's exact Process tab layout.

---

### #003 — Copy Individual Setting Value to Clipboard

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Small
**Source:** Brainstorm

**Description:**
When a user wants to transfer a single recommended value into Bambu Studio, they currently have to read it and type it manually. Adding a small copy-to-clipboard button (or making the value itself clickable) next to each parameter value in the results panel lets them copy one value instantly. A brief visual confirmation (e.g. the value briefly flashes or a tooltip shows "Copied!") closes the feedback loop. This is a low-effort, high-frequency UX improvement since users inevitably bounce between the tool and their slicer.

**Implementation Plan:**
- [ ] app.js — in `renderProfilePanel()`, wrap each parameter value in a `<span class="copy-value">` and attach a click listener that calls `navigator.clipboard.writeText(value)`; show a transient "Copied!" tooltip by toggling a `.copied` class for ~1.5 s
- [ ] style.css — add `.copy-value` cursor style (pointer), hover highlight, and `.copied` tooltip/animation styles

**Raw idea:**
> Click a value in the results panel to copy it to clipboard.

---

### #004 — Copy All Settings as Formatted Text

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Small
**Source:** Brainstorm

**Description:**
A "Copy all settings" button at the top of the results panel exports the complete recommended profile as a human-readable plain-text block (e.g. "Layer Height: 0.2 mm\nOuter Wall Speed: 120 mm/s\n…") suitable for pasting into a chat message, print log, or notes app. Unlike the existing JSON export this output is immediately readable by anyone, including people who have never used the tool. The formatted string is assembled from the same data already rendered in the panel, so no new engine logic is required.

**Implementation Plan:**
- [ ] app.js — add a "Copy all settings" button to the results panel header; on click, iterate the active tab's sections/params to build a `label: value` text block and call `navigator.clipboard.writeText()`; show a brief "Copied!" confirmation on the button
- [ ] style.css — style the copy-all button consistently with existing secondary button styles

**Raw idea:**
> Button to copy all recommended settings as human-readable text for pasting into notes or messages.

---

### #005 — Shareable Profile URL

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Small
**Source:** Brainstorm

**Description:**
When a user finds a great profile combination they want to share, they currently have no way to send a link that restores the exact same state. This feature encodes all active filter selections (printer, nozzle, material, use case, quality preset, etc.) as URL query parameters (e.g. `?printer=bambu-x1c&nozzle=0.4&material=petg&goal=quality`) so the URL can be copied from the address bar and shared. On page load, the app reads query params and pre-populates all selectors before running the engine, restoring the profile exactly. Falls back gracefully if any param value is unknown.

**Implementation Plan:**
- [ ] app.js — on `DOMContentLoaded`, read `URLSearchParams` and pre-populate `appState` fields before the first render; after each state change, call `history.replaceState()` with updated query params built from `appState`
- [ ] engine.js — no changes required; state serialization keys should map 1-to-1 with existing `appState` field names

**Raw idea:**
> Encode current filter selections into URL query params so a profile can be shared via link.

---

### #006 — Parameter Tooltip / Info Panel

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Medium
**Source:** Brainstorm

**Description:**
Each parameter in the results panel has an info icon (ⓘ) but currently it does nothing. Clicking it should open a modal or slide-in panel explaining: what the parameter controls, why the tool chose this particular value for the selected combination, and what happens if the user increases or decreases it. This transforms the tool from a settings generator into a learning resource — especially valuable for users who are still building their 3D printing knowledge. All explanation content lives in a new `data/param-info.json` file keyed by parameter ID, keeping it easy to author and translate independently of engine logic.

**Implementation Plan:**
- [ ] data/param-info.json — create file with entries keyed by param ID; each entry contains `description`, `whyThisValue`, `increaseEffect`, `decreaseEffect` strings in EN and DA
- [ ] engine.js — no logic changes; ensure every param object has a stable `id` field that matches the JSON keys
- [ ] app.js — attach click handler to existing ⓘ icons; on click, look up the param ID in the loaded `param-info` data and render a `<dialog>` modal with the four content fields
- [ ] style.css — style the info modal (backdrop, card, close button, section headings)

**Raw idea:**
> Clicking the info icon next to a parameter name opens a modal explaining what it does, why this value was recommended, and what changing it does.

---

### #007 — Auto Dark Mode

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Small
**Source:** Brainstorm

**Description:**
The app currently defaults to dark mode for all users regardless of their OS preference. Users who prefer light mode must manually toggle the theme on every visit. This feature detects `prefers-color-scheme: dark` via a media query on first load and applies the matching theme automatically, so the app feels native to both light-mode and dark-mode OS environments. Once the user manually toggles the theme, their explicit preference is stored in `localStorage` and takes priority over the OS setting on subsequent visits.

**Implementation Plan:**
- [ ] app.js — on init, check `localStorage.getItem('theme')`; if absent, use `window.matchMedia('(prefers-color-scheme: dark)').matches` to determine initial theme; store explicit user choice to `localStorage` on toggle; add a `matchMedia` listener to update theme reactively if OS setting changes while the page is open and no explicit preference is stored

**Raw idea:**
> Detect prefers-color-scheme: dark on first visit and apply theme automatically instead of always defaulting to dark.

---

### #008 — Expanded Warning Explanations

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Small
**Source:** Brainstorm

**Description:**
Warnings in the warnings bar are currently single-line messages. Users who trigger a warning often don't know why it fired or what to do next, leading them to ignore it or leave the tool confused. Making each warning expandable — clicking it reveals a detail panel with the root cause, severity context, and one or two concrete remediation steps — turns warnings into actionable guidance. This reuses the existing 16-rule warning engine output without requiring any new rule logic; only the presentation layer changes.

**Implementation Plan:**
- [ ] engine.js — ensure each warning object returned by the rule engine includes an `id` or `key` field that maps to an explanation entry; add `detail` and `fix` fields to each warning rule definition (or store them in a separate `data/warning-info.json` keyed by warning ID)
- [ ] app.js — update `renderWarnings()` so each warning chip is clickable and toggles an `.expanded` class showing a `<div class="warning-detail">` containing `detail` and `fix` text
- [ ] style.css — add `.warning-detail` expand/collapse styles and transition animation

**Raw idea:**
> Each warning in the warnings bar can be expanded to show a detailed explanation of why it was triggered and what to do about it.

---

### #009 — Orca Slicer Layout Support

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Medium
**Source:** Brainstorm

**Description:**
The tool currently presents all profile parameters using Bambu Studio's Process tab structure and parameter naming conventions. Orca Slicer — a popular open-source fork of Bambu Studio — has a different tab layout and uses different names for several parameters. Adding a slicer selector (Bambu Studio / Orca Slicer) changes which tab structure and parameter labels are displayed, so Orca Slicer users get output they can directly navigate in their slicer. The underlying recommended values remain the same; only the presentation mapping differs.

**Implementation Plan:**
- [ ] engine.js — add an `ORCA_PROFILE_TABS` constant mirroring `PROFILE_TABS` but with Orca Slicer's tab names, section names, and parameter labels; add a `slicer` field to `appState` (`'bambu' | 'orca'`) and pass it through the profile generation pipeline to select the correct tab definition
- [ ] app.js — add a slicer toggle (radio buttons or a segmented control) to the filter bar; bind it to `appState.slicer` and re-render the profile panel on change
- [ ] style.css — minor styling for the slicer toggle control

**Raw idea:**
> Add a slicer selector (Bambu Studio / Orca Slicer) that changes which Process tab structure and parameter names are shown.

---

### #010 — More Printer Support

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Medium
**Source:** Brainstorm

**Description:**
The tool currently supports 10 printers. Adding Bambu Lab A1 Combo, Prusa MK4, Prusa XL, Voron 2.4, and Creality K1 Max would meaningfully broaden the audience. Each new printer may have different maximum speeds, bed sizes, extruder types (direct drive vs. Bowden), and enclosure status — all of which influence the recommended settings and warning rules. Prusa and Voron machines in particular have different baseline assumptions than Bambu hardware and should be added thoughtfully with printer-specific rule overrides.

**Implementation Plan:**
- [ ] data/printers.json — add JSON entries for each new printer with fields: `id`, `name`, `brand`, `buildVolume`, `maxSpeed`, `hasEnclosure`, `extruderType`, `bedType`, `maxNozzleTemp`, `notes`
- [ ] engine.js — review all 16 warning rules and speed/temp calculation logic for any Bambu-specific assumptions that need branching or overriding for Prusa/Voron hardware; add printer-specific rule conditions where needed

**Raw idea:**
> Add Bambu Lab A1 Combo, Prusa MK4, Prusa XL, Voron 2.4, and Creality K1 Max printer support.

---

### #011 — More Material Support

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Medium
**Source:** Brainstorm

**Description:**
Adding six new materials — PLA+ (generic), PLA Sparkle, PETG Transparent, PA12-CF, PPA-CF, and ABS-GF — covers popular filament types that users frequently ask about. PLA+ is a minor tweak on PLA but with slightly higher temp range; PLA Sparkle requires slower outer wall speeds to avoid grinding; PETG Transparent needs lower layer heights for clarity; the engineering materials (PA12-CF, PPA-CF, ABS-GF) require enclosure warnings, high-temp nozzle checks, and drying reminders. Each material must include warning rule coverage in addition to the data entry.

**Implementation Plan:**
- [ ] data/materials.json — add entries for each material with fields: `id`, `name`, `group`, `baseTempHotend`, `baseTempBed`, `speedMultiplier`, `requiresEnclosure`, `requiresHardenedNozzle`, `dryingRequired`, `notes`
- [ ] engine.js — extend warning rules to handle new material-specific conditions (e.g. CF/GF materials trigger hardened nozzle warning, high-temp materials trigger enclosure check, PLA Sparkle triggers reduced outer wall speed note)

**Raw idea:**
> Add PLA+, PLA Sparkle, PETG Transparent, PA12-CF, PPA-CF, and ABS-GF material support.

---

### #012 — Saved Presets (Local Storage)

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Medium
**Source:** Brainstorm

**Description:**
Power users who frequently switch between a handful of known printer/material/goal combinations spend time re-selecting the same options on every visit. A preset system lets users name and save their current filter state as a named preset stored in `localStorage`, then reload it from a dropdown or chip list in one click. No backend, no login required. Users can also delete presets. Preset names are free-text and stored alongside the full `appState` snapshot. Handles migration gracefully if a saved preset references a printer or material that no longer exists.

**Implementation Plan:**
- [ ] app.js — add "Save preset" button to the filter bar that prompts for a name and writes `{ name, state }` to a `presets` array in `localStorage`; add a preset picker (dropdown or collapsible chip list) that on selection calls `loadState(preset.state)` and re-renders; add a delete control per saved preset; validate preset state keys against current data on load and warn if stale
- [ ] style.css — style the preset picker and save button controls

**Raw idea:**
> Allow users to name and save their current filter combination as a preset in localStorage, then reload it from a preset picker.

---

### #013 — Print Checklist / Pre-flight

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Small
**Source:** Brainstorm

**Description:**
After a profile is generated, a "Pre-flight checklist" section at the bottom of the results panel shows a short list of recommended steps to take before starting the print. Examples: "Run auto bed leveling", "Verify nozzle temperature matches filament spec", "Check filament is dry (especially PA/TPU)", "Confirm enclosure is closed for ABS/ASA". Checklist items are driven by the active engine rules and printer/material combination — so an open-frame PLA print gets a short list while a PA12-CF print on a new printer gets a long one. Users can check items off; state is ephemeral (not saved).

**Implementation Plan:**
- [ ] engine.js — add a `getChecklist(state)` function that returns an array of checklist item objects `{ id, text, condition }` filtered by the active printer/material/goal combination; reuse existing rule condition logic where possible
- [ ] app.js — render the checklist below the profile tabs using `<ul>` with `<input type="checkbox">` per item; no persistence required
- [ ] style.css — style the checklist section with a subtle top border separator and checkbox styling

**Raw idea:**
> After a profile is generated, show a printable checklist of recommended pre-print steps driven by engine rules.

---

### #014 — Mobile Layout Improvements

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Medium
**Source:** Brainstorm

**Description:**
The current layout is functional on desktop but has several known pain points on mobile: the filter section is cramped, material/printer chips overflow their container horizontally, and the results panel stacks awkwardly. A dedicated mobile pass should make the tool genuinely usable on a phone — useful when a user is standing at their printer. Key changes: filter groups collapse by default on mobile (expand on tap), chip groups get horizontal scroll instead of wrapping, and the results panel uses a single-column layout with full-width tabs. These are CSS and minor DOM changes; no engine logic changes needed.

**Implementation Plan:**
- [ ] style.css — add `@media (max-width: 600px)` rules for: collapsible filter groups (toggle via `.collapsed` class), `overflow-x: auto` on chip containers, single-column results grid, larger tap targets for all interactive elements
- [ ] app.js — add toggle logic for collapsible filter group headers on mobile (add/remove `.collapsed` class on header click); default to collapsed on initial render when `window.innerWidth < 600`

**Raw idea:**
> Dedicated mobile pass: collapsible filter groups default to collapsed, horizontal scroll for chips, single-column results.

---

### #015 — Community-Contributed Profiles

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Large
**Source:** Brainstorm

**Description:**
A read-only community data layer allows experienced users to submit real-world tested profiles for specific printer/material combinations. Each community profile includes a contributor name, the printer and material it was tested on, an optional star rating, and free-text notes (e.g. "Works great with 0.6mm nozzle on X1C, reduced outer wall speed to 100"). Community profiles are shown alongside the generated profile as a "Community verified" panel with a badge, giving users a sanity check against real-world results. Submissions flow via GitHub PR to a `data/community-profiles.json` file, keeping the system entirely static and reviewer-controlled.

**Implementation Plan:**
- [ ] data/community-profiles.json — create file with an array of profile objects: `{ id, contributor, printer, nozzle, material, goal, settings{}, rating, notes, dateAdded }`
- [ ] engine.js — add `getCommunityProfiles(state)` that filters community profiles matching the active printer/material/nozzle combination and returns them sorted by rating
- [ ] app.js — render a "Community profiles" section in the results panel showing matched community entries as cards with contributor, rating, notes, and a diff-style highlight of settings that differ from the generated profile
- [ ] style.css — style community profile cards and the "Community verified" badge
- [ ] Contributing guide — add a short `CONTRIBUTING.md` section explaining how to submit a community profile via PR

**Raw idea:**
> A read-only data layer where community members can submit tested profiles via GitHub PR. Shown alongside generated profile as "Community verified" badge.

---

### #016 — Troubleshooter Expansion

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Large
**Source:** Brainstorm

**Description:**
The current troubleshooter covers approximately 8 symptoms. Expanding to 20+ symptoms would cover the most common real-world print failures users encounter. New symptoms to add include: nozzle clog, layer shifting, warping, z-banding, stringing, overextrusion, underextrusion, wet filament signs, poor overhang quality, and bridging failure. Each symptom should have 3–5 possible causes ranked by likelihood, each with a specific diagnostic step and a settings change recommendation where applicable. The expanded troubleshooter becomes a genuine first-line diagnostic tool that reduces the need to search forums.

**Implementation Plan:**
- [ ] data/troubleshooter.json (or engine.js TROUBLESHOOT_DATA) — add entries for each new symptom; each entry: `{ id, symptom, causes: [{ likelihood, cause, diagnosis, fix, settingChange? }] }`
- [ ] engine.js — extend `getTroubleshootResults(symptomId, state)` to filter and rank causes by the active printer/material context where relevant (e.g. warping causes differ for open-frame vs. enclosed printers)
- [ ] app.js — no structural changes needed; existing `renderTroubleshooter()` should handle additional symptom entries automatically; verify symptom picker scrolls correctly with 20+ items

**Raw idea:**
> Expand troubleshooter from ~8 symptoms to 20+ including nozzle clog, layer shifting, warping, z-banding, stringing, over/underextrusion, wet filament, poor overhangs, bridging failure.

---

### #017 — Profile Export to Bambu Studio .json

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Large
**Source:** Brainstorm

**Description:**
The current JSON export outputs the tool's internal data structure, which cannot be imported into Bambu Studio. This feature generates a valid Bambu Studio process profile `.json` file — with Bambu Studio's exact field names, data types, and file structure — that users can import directly via Bambu Studio's profile import dialog. This eliminates the manual transcription step entirely and is the highest-value export format for Bambu Lab users. Requires reverse-engineering Bambu Studio's process profile schema from exported files and maintaining a field mapping layer in engine.js.

**Implementation Plan:**
- [ ] engine.js — add `exportToBambuStudio(profileData)` function that maps internal parameter IDs to Bambu Studio JSON field names; include required boilerplate fields (version, type, name, etc.) and omit internal-only fields; validate output structure against known Bambu Studio schema
- [ ] data/bambu-field-map.json — create a mapping file from internal param IDs to Bambu Studio JSON keys, including any value transformations (e.g. unit conversions, enum mappings)
- [ ] app.js — add "Export for Bambu Studio" button that calls `exportToBambuStudio()` and triggers a `.json` file download with a generated filename (e.g. `3dpa-x1c-petg-quality.json`)

**Raw idea:**
> Generate a valid Bambu Studio process profile .json that can be imported directly into Bambu Studio, matching exact field names and file structure.

---

### #018 — Print Time Estimator Improvements

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Large
**Source:** Brainstorm

**Description:**
The current print time estimator uses simple mm/s math against a user-provided model volume, producing rough estimates that can be 30–50% off for complex prints. Improving it with acceleration/deceleration modeling, support volume estimation, layer count calculation from height/layer-height inputs, and a side-by-side comparison of estimated print time across quality presets (Draft / Standard / Fine) would give users a much more reliable planning tool. The comparison view is particularly valuable: seeing "Draft saves 2h 15min vs. Fine" makes the trade-off concrete.

**Implementation Plan:**
- [ ] engine.js — extend `estimatePrintTime(params)` to accept `{ modelVolume, modelHeight, supportDensity, layerHeight, speeds }` and apply acceleration correction factors per printer profile; add `estimateAllPresets(params)` that runs the estimator for Draft/Standard/Fine and returns a comparison array
- [ ] app.js — update the estimator UI to add inputs for model height and support density; render a comparison table showing estimated time, material usage, and quality trade-offs across presets
- [ ] style.css — style the comparison table

**Raw idea:**
> Improve print time estimator with acceleration/deceleration modeling, support volume estimation, layer count calculation, and comparison across speed presets.

---

### #019 — Multi-Language Expansion

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Medium
**Source:** Brainstorm

**Description:**
The tool currently supports English (EN) and Danish (DA). Adding German (DE), Dutch (NL), and Swedish (SV) would cover a large share of the European 3D printing community, which is well-represented among Bambu Lab and Prusa users. Translation strings already live in a structured object in engine.js, making it straightforward to add new language keys. The main effort is writing accurate translations — especially for technical parameter names — and adding language buttons to the header toggle. Community contributors could be invited to verify translations.

**Implementation Plan:**
- [ ] engine.js — add `de`, `nl`, and `sv` keys to the `TRANSLATIONS` object, covering all existing EN/DA string keys; use consistent technical terminology aligned with how Bambu Studio and Prusa Slicer localise these terms in each language
- [ ] app.js — update the language toggle in the header to render buttons for all active languages dynamically from the `TRANSLATIONS` keys rather than hardcoding EN/DA
- [ ] style.css — ensure the language toggle button group reflows correctly when more than two options are present

**Raw idea:**
> Add German (DE), Dutch (NL), and Swedish (SV) language support alongside existing EN/DA. Language buttons in header toggle.

---

### #020 — Filament Database / Brand Profiles

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Large
**Source:** Brainstorm

**Description:**
Generic material types (PLA, PETG, etc.) are a useful starting point but real-world performance varies significantly between brands. Adding a brand profile layer lets users select a specific filament brand after choosing a material type — for example "Bambu Lab PLA Basic", "Polymaker PolyTerra PLA", or "Prusament PETG" — and receive temperature and speed overrides tuned to that brand's published specifications and community-verified settings. Brand profiles are stored in a new `data/brands.json` file and override only the fields that differ from the generic material baseline, keeping the data model lean. Users who don't pick a brand continue to receive generic recommendations.

**Implementation Plan:**
- [ ] data/brands.json — create file with brand entries keyed by `{ materialId, brandId }`; each entry contains only the override fields: `tempHotendOverride?`, `tempBedOverride?`, `speedMultiplierOverride?`, `notes`, `source` (URL to datasheet or community thread)
- [ ] engine.js — after resolving base material settings, check if a `brandId` is set in `appState` and apply brand overrides; extend warning rules to use brand-specific temp limits where present
- [ ] app.js — after a material is selected, render a secondary "Brand (optional)" selector populated from brands matching the selected `materialId`; default to "Generic" which applies no overrides; pass selected `brandId` into `appState`
- [ ] style.css — style the brand selector as a secondary/subordinate control beneath the material chips

**Raw idea:**
> Extend material data with specific brand profiles (e.g. Bambu Lab PLA Basic, Polymaker PolyTerra, Prusament PETG). Brand profile overrides base temps and speeds. User selects brand after material type.

---

### #021 — Export as HTML Print Sheet

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Small
**Source:** User request

**Description:**
When a user finishes configuring a profile, they should be able to export a self-contained HTML file that acts as a permanent, offline-readable record of their print setup. The file shows all selections made (printer, nozzle, material, environment, surface quality, strength mode) and the full list of recommended settings across all tabs — filament settings and all process tabs — including advanced parameters. Designed for archiving: no external fonts, no CDN scripts, no dependencies — everything inlined so the file works completely offline and can be saved alongside the print file. Minimal, clean visual design matching the site aesthetic. This is a human-readable reference, not a Bambu Studio import file (that is covered by #017).

**Implementation Plan:**
- [ ] engine.js — add a `generateHTMLSheet(state, profile)` function that builds a full HTML string with inlined CSS; include a header block (printer, nozzle, material, date), a selections summary section, and a settings section grouped by tab (Filament, Quality, Strength, Speed, Support, Others); include all params regardless of simple/advanced mode so the sheet is complete
- [ ] app.js — on export button click, call `generateHTMLSheet()` and trigger a download via a temporary `<a>` with `href="data:text/html;..."` and a filename like `3dpa_p1s_pla-matte_2026-04-01.html`
- [ ] style.css — no changes needed; styles are inlined in the generated HTML

**Raw idea:**
> Export a self-contained HTML file showing all selections and recommended settings — a permanent offline reference for recalling what was used for a specific print.

---

### #022 — User Profiles & Community Layer

**Status:** Idea
**Added:** 2026-04-01
**Scope:** Large
**Source:** User request

**Description:**
Introduce optional user accounts to transform 3D Print Assistant from a stateless tool into a platform users return to. A profile gives users persistent storage for their saved presets (#012), print history, and personal notes — synced across devices. The community layer builds on top: users can publish a profile configuration as a "community profile" with a rating, let others upvote or save it, and browse profiles shared by others filtered by printer/material. This creates a feedback loop that drives return visits and organic growth. Authentication should use a social/passwordless provider (Google, GitHub) to minimise friction — no password management. Backend can start minimal (Cloudflare Workers + D1 or Supabase free tier) to stay within zero-cost hosting.

**Implementation Plan:**
- [ ] Auth — integrate a passwordless/social auth provider (e.g. Supabase Auth with Google/GitHub OAuth or Cloudflare Access); add login/logout button in header; store JWT in `localStorage`; keep the entire tool fully functional without login (auth is additive, never a gate)
- [ ] Profile storage — on login, sync `localStorage` presets and print history to a user record in the backend (Supabase or D1); on subsequent visits, load from backend if logged in, fall back to `localStorage` if not
- [ ] Print history — automatically save each generated profile snapshot (printer, material, selections, full resolved settings, timestamp) to the user's history; add a "History" view listing past prints with one-click restore
- [ ] Community profiles — add a "Share this profile" button that publishes the current configuration as a public community entry with a title and optional note; add a "Community" browse view filterable by printer and material; show upvote count and a "Use this" button that loads the shared config
- [ ] app.js / index.html — add auth UI (avatar + dropdown in header when logged in, "Sign in" button when not); add History and Community nav items; gate community write actions (share, upvote) behind login with a prompt
- [ ] style.css — style auth controls, history list, community browse grid, and profile cards

**Phases:**
1. Auth + cloud preset sync (replaces localStorage-only #012)
2. Print history
3. Community profile sharing + browse

**Raw idea:**
> User accounts with saved presets, print history, and community-shared profiles. Drives return visits and loyalty. Passwordless/social auth, no gates on the core tool.

---

### #023 — Analytics with Cloudflare Web Analytics

**Status:** Done
**Added:** 2026-04-01
**Scope:** Small
**Source:** Site launch

**Description:**
Now that the site is publicly launched, we need visitor analytics to understand traffic patterns, popular pages, and referral sources. Cloudflare Web Analytics is the ideal choice: it's free, privacy-friendly (no cookies, no personal data collection), GDPR-compliant out of the box, and integrates natively with our Cloudflare Pages hosting. Setup requires adding a single JS beacon script tag to index.html and enabling Web Analytics in the Cloudflare dashboard.

**Implementation Plan:**
- [ ] Enable Web Analytics in Cloudflare dashboard for 3dprintassistant.com and copy the JS beacon snippet
- [ ] index.html — add the Cloudflare Web Analytics beacon script tag before `</body>`

**Raw idea:**
> Track site statistics after public launch. Cloudflare Web Analytics chosen for zero-cookie, privacy-first, free analytics on existing Cloudflare Pages hosting.

---

### #024 — SEO Optimization

**Status:** Done
**Added:** 2026-04-01
**Scope:** Small
**Source:** Site launch

**Description:**
The site needs proper SEO foundations so search engines can discover and rank it. This includes meta tags (title, description, Open Graph, Twitter Card), a canonical URL, structured data (JSON-LD), a sitemap.xml, a robots.txt, semantic HTML improvements, and proper heading hierarchy. These are one-time foundational additions that significantly improve discoverability for searches like "3D print settings calculator", "Bambu Studio profile generator", etc.

**Implementation Plan:**
- [ ] index.html — add `<meta name="description">`, Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`), Twitter Card tags, canonical URL, `<link rel="icon">`, and JSON-LD structured data (WebApplication schema)
- [ ] sitemap.xml — create with the single page URL and lastmod date
- [ ] robots.txt — create allowing all crawlers, pointing to sitemap
- [ ] index.html — review heading hierarchy (single `<h1>`, logical `<h2>`/`<h3>` structure), add `lang="en"` to `<html>`, add meaningful `alt` attributes to any images

**Raw idea:**
> Optimize site for search engines after public launch — meta tags, Open Graph, structured data, sitemap, robots.txt, semantic HTML.

---

### #025 — Community Requested Features List

**Status:** Done
**Added:** 2026-04-01
**Scope:** Small
**Source:** User request

**Description:**
A "Roadmap" link in the footer opens a modal listing features requested by the community. Shows a curated list of planned features with icons, translated to EN/DA. Encourages users to vote via the feedback page. Keeps the community informed about what's coming and builds engagement.

**Implementation Plan:**
- [x] engine.js — add `roadmapLink` translation strings for EN and DA
- [x] app.js — add `ROADMAP_FEATURES` data array and render as a styled list inside the existing modal system; add roadmap link to footer
- [x] style.css — add `.roadmap-list`, `.roadmap-item`, `.roadmap-icon` styles

**Raw idea:**
> A small window to show a list of features requested from the community.

---

### #026 — Smart Simple/Advanced Configurator Mode

**Status:** Planned
**Added:** 2026-04-01
**Scope:** Medium
**Source:** User idea

**Description:**
The Simple/Advanced toggle currently only controls which output parameters are shown in the results panel. This feature extends the toggle to also control the configurator input — in Simple mode, fewer filters are shown with only the most common options and sensible defaults pre-applied; in Advanced mode, all filters and all options are available as today. This makes the tool much less overwhelming for beginners while preserving full power for experienced users.

**Simple mode** shows: Printer (all), Nozzle (std 0.4 + hrd 0.4), Material (common only: PLA Basic, PLA Matte, PETG HF, ABS, ASA, TPU), Surface Quality (Draft/Standard/Fine), Strength (Standard/Strong), Support (None/Easy Removal). Hidden filters auto-default: Speed → balanced, Environment → normal, Use Case → none, Colors → single, User Level → intermediate, Special → none.

**Advanced mode** shows: all 12 filters, all options, no defaults — unchanged from today.

Switching Simple → Advanced carries selections over and reveals hidden filters with defaults. Switching Advanced → Simple resets hidden filters to defaults and downgrades advanced-only options (e.g. Maximum surface → Fine).

**⚠ Pre-implementation note:** Before building, double-check the full engine logic (`resolveProfile`) to verify that the proposed default values and hidden filter assumptions don't produce unexpected profile output. The printer selection currently only impacts speed/acceleration (CoreXY vs bedslinger) and warnings (enclosure type) — confirm this is still true at implementation time. Validate that the "simple" subset of materials, nozzles, and options covers real user needs.

**Implementation Plan:**
- [ ] **Audit first** — re-read `resolveProfile()` and all filter interactions end-to-end to confirm assumptions still hold
- [ ] engine.js — add `simpleVisible` flag and `simpleOptions` array to each filter definition in `getFilters()`; add `SIMPLE_DEFAULTS` constant with default values for hidden filters
- [ ] app.js — update `buildFilters()` to read `currentMode` and skip hidden filters / filter out advanced-only options; update `setMode()` to apply `SIMPLE_DEFAULTS` for hidden filters when entering simple mode, and to reset advanced-only option selections to closest simple equivalent
- [ ] style.css — optional transition for filters appearing/disappearing on mode switch

**Raw idea:**
> Use the Simple/Advanced toggle to also control which filters and options are shown in the configurator, not just the output parameters. Simple = fewer filters, common options, sensible defaults. Advanced = full control. Double-check engine logic before implementing.

---

### #027 — Slicer-Aware Tab Structure Based on Printer Brand

**Status:** Done (Phase 1: Bambu Studio + PrusaSlicer)
**Added:** 2026-04-02
**Scope:** Medium–Large
**Source:** User idea (extends #002 and #009)

**Description:**
When a user selects a printer, the results panel should display section names, parameter groupings, and parameter labels that match the slicer software associated with that printer brand. Currently all printers use Bambu Studio's structure (#002). This feature maps each printer brand to its default slicer and swaps the presentation layer accordingly — the recommended values and engine logic stay identical, only the UI labels and section grouping change.

**Brand → Slicer mapping:**
- Bambu Lab → Bambu Studio (done, current default)
- Prusa → PrusaSlicer
- Creality → Creality Print (or OrcaSlicer — TBD)
- Voron, Anycubic, QIDI, Elegoo, Sovol, FlashForge, Artillery, AnkerMake → OrcaSlicer
- DIY/Other → OrcaSlicer

**Architecture changes:**
- `PROFILE_TABS` constant → `getProfileTabs(slicerId)` function that returns the correct tab/section structure per slicer
- `PARAM_LABELS` constant → `getParamLabels(slicerId)` function (e.g. "Sparse infill density" in BS vs "Fill density" in PrusaSlicer)
- New `default_slicer` field on each brand in `printers.json` (e.g. `"default_slicer": "bambu_studio"`)
- Filament panel section names also need per-slicer variants
- app.js reads the active slicer from the selected printer's brand and passes it through

**Recommended rollout order:**
1. Bambu Studio — done ✅
2. OrcaSlicer — covers ~50% of non-Bambu users (Voron, Anycubic, QIDI, Elegoo, etc.)
3. PrusaSlicer — covers Prusa users
4. Creality Print — if needed (many Creality users use OrcaSlicer anyway)

**PrusaSlicer Print Settings Structure (verified from screenshots 2026-04-02):**

Note: PrusaSlicer uses sidebar pages instead of tabs. Key terminology differences: "Perimeters" = Walls, "External perimeters" = Outer wall, "Fill density" = Sparse infill density, "Fill pattern" = Sparse infill pattern, "Wipe tower" = Prime tower.

Layers and perimeters page:
1. **Layer height** — Layer height, First layer height
2. *(Perimeters)* — Perimeters (count)
3. **Horizontal shells** — Solid layers (Top/Bottom), Minimum shell thickness (Top/Bottom)
4. **Quality (slower slicing)** — Extra perimeters if needed, Extra perimeters on overhangs, Ensure vertical shell thickness, Avoid crossing curled overhangs, Avoid crossing perimeters, Max detour length, Detect thin walls, Thick bridges, Detect bridging perimeters
5. **Advanced** — Seam position, Seam gap distance, Staggered inner seams, Scarf joint settings, External perimeters first, Fill gaps, Perimeter generator
6. **Fuzzy skin (experimental)** — Fuzzy Skin, thickness, point distance
7. **Only one perimeter** — Single perimeter on top surfaces, Only one perimeter on first layer

Infill page:
1. **Infill** — Fill density, Fill pattern, Infill anchor lengths, Top fill pattern, Bottom fill pattern
2. **Ironing** — Enable ironing, Ironing Type, Flow rate, Spacing between passes
3. **Reducing printing time** — Automatic infill combination, Max layer height, Combine infill every
4. **Advanced** — Solid infill every, Fill angle, Solid infill threshold area, Bridging angle, Only retract when crossing perimeters, Infill before perimeters

Skirt and brim page:
1. **Skirt** — Loops, Distance from brim/object, Skirt height, Draft shield, Minimal filament extrusion length
2. **Brim** — Brim type, Brim width, Brim separation gap

Support material page:
1. **Support material** — Generate support material, Auto generated supports, Overhang threshold, Enforce support for first N layers, First layer density, First layer expansion
2. **Raft** — Raft layers, Raft contact Z distance, Raft expansion
3. **Options for support material and raft** — Style, Top/Bottom contact Z distance, Pattern, Sheath, Pattern spacing, Pattern angle, Closing radius, Top/Bottom interface layers, Interface pattern, Interface pattern spacing, Interface loops, Build plate only, XY separation, Don't support bridges, Synchronize with object layers
4. **Organic supports** — Max/Preferred Branch Angle, Branch Diameter, Diameter Angle, Double walls, Tip Diameter, Branch Distance, Branch Density

Speed page:
1. **Speed for print moves** — Perimeters, Small perimeters, External perimeters, Infill, Solid infill, Top solid infill, Support material, Support material interface, Bridges, Over bridges, Gap fill, Ironing
2. **Dynamic overhang speed** — Enable, speed for 0%/25%/50%/75% overlap
3. **Speed for non-print moves** — Travel, Z travel
4. **Modifiers** — First layer speed, First layer solid infill speed, Speed over raft interface
5. **Acceleration control (advanced)** — External perimeters, Perimeters, Top solid infill, Solid infill, Infill, Bridge, First layer, First object over raft, Wipe tower, Travel, Travel short distance, Default
6. **Autospeed (advanced)** — Max print speed, Max volumetric speed
7. **Pressure equalizer (experimental)** — Max volumetric slope positive/negative

Multiple Extruders page:
1. **Extruders** — Perimeter/Infill/Solid infill/Support/Interface/Wipe tower extruder assignments, Bed temp by extruder
2. **Ooze prevention** — Enable, Temperature variation
3. **Wipe tower** — Enable, Width, Brim width, Max bridging distance, Stabilization cone, Purge lines spacing, Extra flow, No sparse layers, Prime all extruders
4. **Advanced** — Interface shells, Segmented region settings, Beam interlocking settings

Advanced page:
1. **Extrusion width** — Default, First layer, Perimeters, External perimeters, Infill, Solid infill, Top solid infill, Support material, Automatic calculation
2. **Overlap** — Infill/perimeters overlap
3. **Flow** — Bridge flow ratio
4. **Slicing** — Slice gap closing radius, Slicing Mode, Slice/G-code resolution, Arc fitting, XY Size Compensation, Elephant foot compensation
5. **Arachne perimeter generator** — Transitioning threshold/filter/length, Distribution count, Min perimeter width, Min feature size
6. **Custom parameters**

Output options page:
1. **Sequential printing** — Complete individual objects
2. **Output file** — Verbose G-code, Label objects, Output filename format
3. **Other** — G-code substitutions
4. **Post-processing scripts**

Notes page: (text area)

**PrusaSlicer Filament Settings Structure (verified from screenshots 2026-04-02):**

Note: PrusaSlicer uses sidebar pages. Key terminology differences: "Extrusion multiplier" = Flow ratio, "Wipe tower" = Prime tower.

Filament page:
1. **Filament** — Color, Diameter, Extrusion multiplier, Density, Cost, Spool weight
2. **Temperature** — Idle temperature, Nozzle (First layer / Other layers), Bed (First layer / Other layers), Chamber (Nominal / Minimal)

Cooling page:
1. **Enable** — Keep fan always on, Enable auto cooling, Cooling slowdown logic, Perimeter transition distance
2. **Fan settings** — Fan speed (Min/Max), Bridges fan speed, Disable fan for first N layers, Full fan speed at layer
3. **Dynamic fan speeds** — Enable, speed for 0%/25%/50%/75% overlap
4. **Cooling thresholds** — Enable fan if layer print time below, Slow down if layer print time below, Min print speed

Advanced page:
1. **Filament properties** — Filament type, Soluble material, Abrasive material
2. **Print speed override** — Max volumetric speed, Max non-crossing infill speed, Max crossing infill speed
3. **Shrinkage compensation** — XY, Z
4. **Wipe tower parameters** — Minimal purge on wipe tower
5. **Toolchange parameters with single extruder MM printers** — Loading/Unloading speeds, Filament load/unload time, Delay after unloading, Cooling moves, Stamping settings, Purge volume multiplier, Ramming parameters
6. **Toolchange parameters with multi extruder MM printers** — Enable ramming for multitool, Multitool ramming volume/flow

Filament Overrides page:
1. **Travel lift** — Lift height, Use ramping lift, Maximum ramping lift, Ramping slope angle, Steeper ramp before obstacles, Only lift Z above/below
2. **Retraction** — Retraction length, Retraction Speed, Deretraction Speed, Deretraction extra length, Minimum travel after retraction, Retract on layer change, Wipe while retracting, Retract amount before wipe
3. **Retraction when tool is disabled** — Length, Extra length on restart
4. **Seams** — Seam gap distance

Custom G-code page:
1. **Start G-code** — (text area)
2. **End G-code** — (text area)
3. **Custom parameters** — (text area)

Notes page: (text area)

Dependencies page:
1. **Profile dependencies** — Compatible printers, Compatible printers condition, Compatible print profiles, Compatible print profiles condition

**Implementation Plan:**
- [ ] Document PrusaSlicer tab structure from screenshots (sections, param names, groupings)
- [ ] Document OrcaSlicer tab structure from screenshots
- [ ] data/printers.json — add `default_slicer` field to each brand entry
- [ ] engine.js — refactor `PROFILE_TABS` into `SLICER_TABS` map keyed by slicer ID; add `getProfileTabs(slicerId)` and `getParamLabels(slicerId)` functions
- [ ] engine.js — refactor filament section label strings to be per-slicer
- [ ] app.js — resolve slicer ID from selected printer's brand; pass to tab rendering
- [ ] Test with Bambu, Prusa, and generic printer selections to verify correct structure per slicer

**Raw idea:**
> If they choose a Bambu printer, suggestions should use Bambu Studio structure. If they choose Prusa, it should be PrusaSlicer structure and naming. Slicer-aware presentation based on chosen printer brand.
