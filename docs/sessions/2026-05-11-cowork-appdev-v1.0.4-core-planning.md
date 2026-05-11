# 2026-05-11 — Cowork (appdev): v1.0.4 core planning

## Durable context

- **Codex cross-pass is complete.** `docs/reviews/2026-05-11-config-impact-qa/codex.md` now includes `## Cross-pass review - Codex reviews Claude`, appended after the owner lifted the peer-read constraint for the merge exercise.
- **No `merged.md` exists yet.** The accepted queue still needs to be collapsed into `docs/reviews/2026-05-11-config-impact-qa/merged.md`; that should become the source of truth for accepted findings, final severities, owner decisions, and implementation order.
- **v1.0.4 planning decisions are locked.** Owner chose: core-first release; advisory-first chip contract; practical multicolor tiers; chamber guard-only; material-side nozzle authority; research before numeric material formulas, with owner manual-source help if research quality is weak.
- **A reviewer agent checked the plan twice.** A fresh spawn hit the local agent thread limit, so existing agent `Einstein` was reused read-only. It agreed on the must-fix core and added useful constraints: runtime guards before UI filters, explicit export/provenance checks, iOS picker impact check, and `merged.md`/ROADMAP/NEXT-SESSION hygiene.
- **No source implementation happened.** This was a planning and wrap-up session only. Web and iOS worktrees were clean before the Trigger A close.

## What happened / Actions

1. User asked for a complete plan for the v1.0.4 must-fix core plus the rest backlog so nothing gets forgotten.
2. Read and checked the committed QA artifacts, ROADMAP, NEXT-SESSION, session index/logs, handover, and relevant source touchpoints in `engine.js` / `app.js`.
3. Reused existing reviewer agent `Einstein` because new agent spawn failed due local thread limit. Reviewer independently confirmed the core shape and flagged stale planning surfaces plus missing `merged.md`.
4. Asked owner to lock the product/implementation choices that materially affect the plan.
5. Produced a decision-complete v1.0.4 plan in chat:
   - Phase 0: create `merged.md` and update planning truth.
   - Phase 1 core: strength `speed_multiplier`; environment fields/copy; physical nozzle/plate guards and UI filters; practical multicolor tiers; chamber safe-cap guard-only; nozzle min-diameter/warning cleanup.
   - Phase 2 iOS sync: byte-identical engine/data sync plus iOS UI impact check.
   - Phase 3 rest backlog: advisory chip lane, research-gated material numeric lane, surface-ironing/metadata cleanup.
6. Owner noticed the earlier wrap-up attempt was still in Plan Mode; after Default mode returned, Trigger A was rerun as execution.
7. Trigger A close updated this log, INDEX, ROADMAP, and NEXT-SESSION.

## Files touched (Modified / Deleted / Untracked)

**Modified:**
- `docs/planning/ROADMAP.md` — marks Codex cross-pass and planning complete; moves next step to `merged.md` + v1.0.4 core implementation.
- `docs/sessions/INDEX.md` — prepends this planning/wrap session.
- `docs/sessions/NEXT-SESSION.md` — regenerated with the new locked entry point.

**Added:**
- `docs/sessions/2026-05-11-cowork-appdev-v1.0.4-core-planning.md` — this session log.

**Deleted:** none.

**Untracked at start:** none.

## Commits

Docs-only close commit:

- `docs: wrap v1.0.4 core planning`

No source code shipped. No web tests, iOS tests, or profile audits were needed for this docs-only planning/wrap-up.

## Open questions / Follow-up

- **Create `merged.md` before implementation.** Collapse `claude.md`, `codex.md`, both cross-pass sections, and the locked plan into `docs/reviews/2026-05-11-config-impact-qa/merged.md`. This file should be the final owner-accepted queue.
- **v1.0.3 App Review remains priority if Apple settles first.** Build `202605101637` is still the submitted replacement build unless owner has newer ASC status.
- **Material numeric changes need research.** Cold-env magnitudes, `shrinkage_factor`, moisture/storage thresholds, and plate `bed_temp_range` formulas require sourced research before implementation. Ask owner for manual sources if automated research is not good enough.
- **Md-hygiene finding:** before this close, ROADMAP and NEXT-SESSION still said Codex cross-pass was pending; this close updates them. `merged.md` is still intentionally missing and now tracked as the next work item.

## Next session

Recommended first lane:

1. Check v1.0.3 App Review status. If Apple approved or rejected, handle that before v1.0.4 work.
2. If App Review is still pending, create `docs/reviews/2026-05-11-config-impact-qa/merged.md` as the owner-accepted v1.0.4 queue.
3. Then start v1.0.4 core implementation, beginning with the smallest deterministic engine fix: `strength_levels[].speed_multiplier`.
