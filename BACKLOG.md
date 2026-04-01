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

**Status:** Planned
**Added:** 2026-04-01
**Scope:** Medium
**Source:** Existing implementation plan

**Description:**
The results panel currently renders profile parameters in a flat list per tab. This item restructures `PROFILE_TABS` in engine.js to include a `sections` concept so that each tab (Quality, Strength, Speed, etc.) renders with labeled sub-sections that exactly mirror Bambu Studio's Process tab layout — for example the Quality tab gets sections like "Layer height", "Line width", "Seam", "Precision", and "Others". This makes it dramatically easier for users to locate a setting in Bambu Studio after reading the recommendation, eliminating the need to hunt through menus.

**Implementation Plan:**
- [ ] engine.js — restructure `PROFILE_TABS` (around line 490) so each tab entry contains a `sections` array of `{ label, params[] }` objects instead of a flat `params` array; update the `PROFILE_TABS` getter to flatten sections into a plain params list for any callers that rely on backward-compatible flat access
- [ ] app.js — update `renderProfilePanel()` to iterate sections and render a `.section-header` `<h4>` element before each section's parameter rows
- [ ] style.css — add `.section-header` styles (subtle divider line, small caps label, reduced top margin) to visually separate sub-sections without overwhelming the layout

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
