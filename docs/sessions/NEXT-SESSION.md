# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-11 after v1.0.4 core planning wrap.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — v1.0.4 merged queue + App Review monitoring

## Read First, In This Order

Follow Trigger C from the canonical protocol. Read:

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
6. Last three session logs, in full:
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-11-cowork-appdev-v1.0.4-core-planning.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-11-cowork-appdev-config-impact-qa.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-10-cowork-appdev-v1.0.3-app-review-wrap.md`
7. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md`
8. Task-specific files:
   - QA handover: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/research/configuration-impact-qa-handover.md`
   - QA reports: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/reviews/2026-05-11-config-impact-qa/claude.md`
   - QA reports: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/reviews/2026-05-11-config-impact-qa/codex.md`

## Current State

Two workstreams are live. Priority order:

**Workstream A — v1.0.3 App Review monitoring**
- v1.0.3 build `202605101637` was submitted to App Review on 2026-05-10 after phone QA passed.
- Stale builds: `202605090842`, `202605101130`, `202605101544` — never submit.
- If Apple approves, manually release and monitor `/analytics`, Discord feedback, Sentry, and App Store reviews.
- If Apple rejects, triage the rejection notice verbatim before any v1.0.4 work.

**Workstream B — v1.0.4 config-impact implementation prep**
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

## Recommended First Lane

1. Check App Review status first. If Apple settled, handle release/rejection before v1.0.4.
2. If App Review is still pending, create `merged.md` from `claude.md`, `codex.md`, both cross-pass sections, and the locked planning decisions.
3. After `merged.md`, start v1.0.4 core implementation in this order:
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
- No iOS push/TestFlight dispatch without confirming owner intent.
- One finding = one commit per platform when practical.
- Do not guess behavior; read the actual file.
- For engine/data changes, evaluate web UI and iOS UI impact every time.
- For new or changed `resolveProfile` emissions, maintain provenance.
- For numeric material-value changes, use sourced research before formulas.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
