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
