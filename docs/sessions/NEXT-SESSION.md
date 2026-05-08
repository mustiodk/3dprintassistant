# Next session — cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-08 late evening — refreshed after retiring the active AI Operating Model pilot workflow and shipping analytics. v1.0.3 batch is 3/5 shipped; items 2 / 5 pending.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — v1.0.3 follow-on

## Project at a glance

**3D Print Assistant** generates optimised slicer profiles based on **printer × material × nozzle × user goals × environment**. Two surfaces, one engine:

- **Web** (`3dprintassistant/`) — live at [3dprintassistant.com](https://3dprintassistant.com); Cloudflare Pages auto-deploys from `main`. Vanilla JS + JSON data.
- **iOS** (`3dprintassistant-ios/`) — v1.0.2 live worldwide on App Store. v1.0.3 in TestFlight via run `25572470387` as of 2026-05-08 evening. SwiftUI + JavaScriptCore (runs the same `engine.js` byte-identical to web). Dark mode only.

Web is master; iOS mirrors. Every engine/data change → `cp` byte-identical to iOS → `node scripts/walkthrough-harness.js` → iOS XCTest → commit both sides.

For full project context: READ FIRST → `docs/3dpa-context.md` (canonical evergreen — architecture, engine API, app state shape, slicer routing, standing rules).

## Current state (2026-05-08 late evening)

**v1.0.3 batch is 3/5 shipped.** Items 1 + 3 + 4 are in production / TestFlight. Items 2 / 5 still pending.

**Documentation cleanup just landed:**
- `docs/planning/ROADMAP.md` slimmed 773 → 224 lines (Active Release / Active Work Queue / Deferred / Backlog).
- `docs/3dpa-context.md` is now canonical owner of engine API + app state shape.
- Historical IR cycles + RB/BR + completed phases moved to `docs/planning/archive/` (4 files).
- `docs/ai-collab.md` is now lightweight AI tool-routing guidance, not a pilot / scorecard workflow.
- The active AI Operating Model pilot deadline and branch-reconciliation tasks are retired.
- Codex review packets and Gemini research artifacts are preserved as product history.

**Branch state:**
- Web `main` is the active branch for product and docs work.
- Web `ai/operating-model-pilot` is retired operationally. Its useful artifacts were promoted to `main`; do not start new work there.
- iOS `main` has v1.0.3 product code + analytics and was pushed; TestFlight run `25572470387` succeeded.

**iOS push gate:** still active for future builds. Push iOS `main` only when ready for the next TestFlight build.

## Files to read in order (per Trigger C 3dpa read order)

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — top-level rules (post-refactor: Trigger A is 5 phases × 12 steps; new "what goes where" subsection)
2. `3dprintassistant/CLAUDE.md` — 3dpa project rules (29 lines)
3. `3dprintassistant/docs/3dpa-context.md` — **canonical evergreen project context** (architecture, engine API, app state, standing rules, AI collaboration routing)
4. `3dprintassistant/docs/planning/ROADMAP.md` — slim live planning surface (Active Release: v1.0.3 / Active Work Queue / Deferred / Backlog)
5. `3dprintassistant/docs/sessions/INDEX.md` — top 5 entries
6. `3dprintassistant/docs/sessions/2026-05-08-cowork-appdev-roadmap-slim-and-lifecycle-refactor.md` — last session, full read
7. `3dprintassistant/docs/sessions/2026-05-08-cowork-appdev-v1.0.3-items-1-3-ship.md` — second-to-last (v1.0.3 product work)
8. `3dprintassistant/docs/sessions/2026-05-08-cowork-appdev-v1.0.3-batch-planning-and-handovers.md` — third-to-last (v1.0.3 planning)
9. `3dprintassistant/docs/research/gemini-environments-taxonomy-research.md` — item 2 handover (drafted, awaiting Gemini)
10. `3dprintassistant/docs/ai-collab.md` — only if deciding whether to involve Claude/Gemini/ChatGPT/Grok alongside Codex

**See also (historical lookup only — don't read in default cold start):** `3dprintassistant/docs/planning/archive/` for IR cycles, RB/BR pre-release polish, completed phases, legacy backlog `#001-#036`. `3dprintassistant/codex/roadmap-slim-and-lifecycle/` for the 5-packet refactor audit trail.

## First action

1. Read files above in order. Confirm understanding in 3–5 bullets.
2. Ask owner what to work on. Most likely options:
   - **(a)** Item 2 (environments): hand `gemini-environments-taxonomy-research.md` to Gemini; triage response per the per-finding pattern; draft Codex packet; implement.
   - **(b)** Item 5 (web output-panel UX): Codex direct, no Gemini by default.
   - **(c)** TestFlight QA on the v1.0.3 build (review prompt suppressed on TestFlight; Kobra X open-frame display; Centauri Carbon visible; analytics invisible but non-breaking).
   - **(d)** Any follow-up from analytics production observation.
3. Progress-bar anything 3+ steps.

## Standing rules (binding)

- Progress bar on every multi-step task (`[🟩🟩⬜⬜⬜ 40%]`) — owner explicit
- Direct recommendations, no options-lists
- ROADMAP is live planning truth (slim post-refactor); architecture lives in `docs/3dpa-context.md`; historical detail in `docs/planning/archive/`
- One finding = one commit per platform
- Web is master, iOS mirrors (`cp` byte-identical → walkthrough → XCTest after every change)
- iOS push gate: v1.0.3 currently in TestFlight; further iOS pushes accepted only when ship-ready
- No-guessing: read the actual file before claiming behaviour
- Source-or-null rule for research handovers
- Wiki-pages-as-primary-source workflow for Apple/manufacturer JS-SPA pages
- Multi-gate Codex review pattern is appropriate-once for cross-project blast-radius doc refactors — do NOT default to it for ordinary feature work
- Provenance everywhere on `resolveProfile` emissions
- Data/logic-change evaluation mandatory: every change mentions web + iOS UI implications
- Cross-AI review is optional and risk-based; use `docs/ai-collab.md` for tool routing.
- Trigger A is now 5 phases × 12 steps (md-hygiene at Phase 2 step 4 BEFORE log finalization); semantic destination labels `(5-vault) / (5-documented) / (5-sessions-dir) / (5-session-log) / (5-fallback)`; Trigger B keeps `(3a-vault)/(3a)/(3b)/(3c)/(3d)`.

## Open questions to surface to owner early

- **TestFlight QA** — verify v1.0.3 run `25572470387` on-device.
- **App Store privacy labels** — before public release, update App Store Connect for anonymous Product Interaction usage data.
- **AI Operating Model project** — kept in place as paused/reference; not an active deadline.
- **Local branch hygiene** — the old local `ai/operating-model-pilot` checkout has no remote and still has three modified session docs. Start new work from `main`; clean that branch only after deciding whether those local doc edits are superseded.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the new lifecycle protocol. A stale file between sessions is acceptable.
