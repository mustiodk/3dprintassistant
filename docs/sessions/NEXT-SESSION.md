# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-12 after SPARKX i7 remote-overlay hotfix wrap.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — v1.0.4 merged queue + live i7 sanity check

## Read First, In This Order

Follow Trigger C from the canonical protocol. Show progress while reading, then confirm current state, locked next step, and risks before making changes. Read:

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
6. Last three session logs, in full:
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-12-cowork-appdev-sparkx-i7-overlay-hotfix.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-11-cowork-appdev-v1.0.4-core-planning.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-11-cowork-appdev-config-impact-qa.md`
7. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md`
8. Task-specific files:
   - QA handover: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/research/configuration-impact-qa-handover.md`
   - QA reports: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/reviews/2026-05-11-config-impact-qa/claude.md`
   - QA reports: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/reviews/2026-05-11-config-impact-qa/codex.md`
   - Remote catalog spec if i7/overlay comes up: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/specs/ios-remote-printer-catalog.md`
   - SPARKX/i7 execution plan if i7/overlay comes up: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-05-12-sparkx-i7-ios-overlay.md`

## Current State

Two workstreams matter. Priority is owner-dependent:

**Workstream A — v1.0.4 config-impact implementation prep**
- Both independent QA reports and both cross-pass reviews are complete:
  - Claude: `docs/reviews/2026-05-11-config-impact-qa/claude.md`
  - Codex: `docs/reviews/2026-05-11-config-impact-qa/codex.md`
- No `merged.md` exists yet. Create `docs/reviews/2026-05-11-config-impact-qa/merged.md` first as the owner-accepted source of truth for findings, severities, owner decisions, implementation order, and deferred/rest backlog.
- Owner-locked v1.0.4 defaults:
  - Ship core first.
  - Chips are advisory-first unless explicitly designed otherwise.
  - Multicolor scope is practical tiers: `none`, `ams_lite`, full AMS-like, `cfs`, and generic non-AMS labels.
  - Chamber work is guard-only; do not add a new numeric chamber profile field.
  - Nozzle/material runtime authority stays material-side via `nozzle_requirements`.
  - Numeric material formulas require sourced research; ask owner for manual sources if research quality is weak.

**Workstream B — i7 remote-overlay follow-up if needed**
- v1.0.3 is live on the App Store; public lookup showed version `1.0.3` released `2026-05-11T17:00:02Z`.
- Live remote overlay `content_version=2026051202` adds `sparkx_i7` under Creality / i Series, with no standalone SPARKX brand.
- Current iOS applies a fetched overlay on the next app launch. If a user still sees stale placement, first verify the live overlay and app cache behavior before changing data.
- iOS `main` contains the future bundled catalog correction, but no TestFlight/App Store build was dispatched for this hotfix.

## Recommended First Lane

1. Run `git status` in web and iOS and confirm there are no surprise local changes.
2. If the owner is asking about i7 placement, verify live overlay `2026051202`, then test or reason through the iOS fetch/apply-on-next-launch path before editing.
3. Otherwise create `merged.md` from `claude.md`, `codex.md`, both cross-pass sections, and the locked planning decisions.
4. After `merged.md`, start v1.0.4 core implementation in this order:
   - Strength `speed_multiplier`.
   - Environment data layer/copy.
   - Runtime physical nozzle/plate guards, then UI filters.
   - Practical multicolor tiers.
   - Chamber safe-cap guard.
   - Nozzle min-diameter warning cleanup.

## Scope Rules

- Use the visible progress tracker for multi-step work.
- Web is source-of-truth; iOS mirrors `engine.js` + `data/*.json` byte-identically.
- Keep process lightweight, but do not skip correctness checks.
- No iOS push/TestFlight/App Store action without confirming owner intent.
- Remote-only printer hotfixes should normally ship by web overlay; push iOS only if owner wants the future bundled mirror updated now.
- One finding = one commit per platform when practical.
- Do not guess behavior; read the actual file.
- For engine/data changes, evaluate web UI and iOS UI impact every time.
- For new or changed `resolveProfile` emissions, maintain provenance.
- For numeric material-value changes, use sourced research before formulas.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
