# Session: 2026-04-20 — Cowork App Dev — 3rd-party review package

**Type:** Documentation / project-handoff.
**Scope:** Build a self-contained starter kit the user can hand to an external engineer for a thorough project + data + code review across both the web and iOS codebases. Bonus ask: also produce a fresh-session kickoff prompt so the next Cowork session can pick up cleanly regardless of whether the review has returned.

## What the user asked for

> "i want a 3rd party to do an extensive project, data and code review both on web and ios, especially also with all the new things we have changes to the achitecture and how we generate data now going from hardcoding to more futureproof style. i want you to create me project description (use existing md files if you can) and give me a complete starter kit i can dump to a 3rd party. when done, update the project, all md files and give me a prompt to start a fresh session."

Reviewed revisions:
- Web: `c4c5071` (IMPL-040 shipped, live on 3dprintassistant.com)
- iOS: `24aef66` (IMPL-040 sync + CI-enforced parity guards, TestFlight build `202604200952`)

## What was produced

**New folder:** `docs/3rd-party-review/`

| File | Purpose |
|------|---------|
| `README.md` | Entry point. Explains what the kit is, who it's for, how to use it, project-side don't-do reminders (don't push to main, don't touch secrets). |
| `REVIEW-BRIEF.md` | Scope + focus areas + non-goals + severity classification + timeline. The main briefing doc. Explicitly lists what 60% of review time should be spent on (IMPL-039/040 helpers + slicer_capabilities + guard tests). |
| `ARCHITECTURE-OVERVIEW.md` | Consolidated technical architecture. Directory trees for both repos, execution model (web and iOS), key design patterns (engine as shared library, data-driven > hardcoded, structured warnings, actor isolation, slicer-aware output), data schema quick reference. |
| `SETUP.md` | How to clone + run both platforms locally. Includes the byte-identity check for shared engine + data files — a quick diagnostic the reviewer can run first. |
| `DELIVERABLE-TEMPLATE.md` | Expected output format. One markdown file per severity, specific finding template, executive summary requirements, data-audit table format, longer-form recommendation format, invariant checklist to report on explicitly (byte-identity, actor isolation, IMPL-040 parity, no committed secrets, etc). |
| `REFERENCE-INDEX.md` | Pointers to existing internal docs worth reading (ROADMAP, IMPL-039/040 specs, prior release review, session logs, Bambu export research). Flags what's deprecated / archived so reviewer doesn't waste time. |

**New prompt:** `docs/prompts/fresh-session-kickoff-post-review.md` — pasteable kickoff for the next Cowork session. Covers: what to read first, how to pick work depending on whether the review has returned, standing workflow rules (progress bar, ROADMAP is truth, right-thing-not-easy-thing, session logs, iOS push policy), quick-facts table.

**Project-level updates:**
- Root `Projects/CLAUDE.md` (memory hot cache) — added a 3DPA line pointing at the review package.
- `3dprintassistant/docs/planning/ROADMAP.md` — new Completed phases entry, status line updated to note review is out.
- This session log.

## Approach notes

- Reused existing docs wherever possible (per user request). The architecture overview pulls from web + iOS CLAUDE.md + the RB-1 / IMPL-039 / IMPL-040 specs. Reference index explicitly links rather than duplicates. Total net new prose is ~1.4k lines but nothing that duplicates content already in the repo.
- **Explicitly tagged IMPL-039 + IMPL-040 as the highest-priority review areas** — they're the most recent and most architecturally-significant changes, and they set the pattern for how the engine generates state-dependent values going forward. If the reviewer finds structural issues there, everything else is downstream.
- **Severity classification is strict** — CRITICAL is ship-blocker only (damages printer, makes wrong safety call, leaks secrets). Kept HIGH for recommendation drift. MEDIUM for code smell + test coverage. Separates actionable from observational.
- **Invariant checklist in DELIVERABLE-TEMPLATE** forces the reviewer to make an explicit yes/no call on several structural properties (byte-identity between web/iOS, actor isolation, IMPL-040 parity, no committed secrets, etc). These can't be skipped without an explicit finding.
- **Fresh-session prompt is forked into two paths** — "if review is still out, do non-architecture work" vs. "if review has returned, triage in severity order". So the next session works regardless of timing.

## Not pushed to iOS

Web-only commit. iOS repo is untouched. No TestFlight rebuild triggered.

## Files changed

### Web
- `docs/3rd-party-review/README.md` **new**
- `docs/3rd-party-review/REVIEW-BRIEF.md` **new**
- `docs/3rd-party-review/ARCHITECTURE-OVERVIEW.md` **new**
- `docs/3rd-party-review/SETUP.md` **new**
- `docs/3rd-party-review/DELIVERABLE-TEMPLATE.md` **new**
- `docs/3rd-party-review/REFERENCE-INDEX.md` **new**
- `docs/prompts/fresh-session-kickoff-post-review.md` **new**
- `docs/planning/ROADMAP.md` — status line + Completed phases row
- `docs/sessions/2026-04-20-cowork-appdev-review-package.md` **new** (this file)
- Root `Projects/CLAUDE.md` — one-line pointer to the review package

## Next step (for Musti)

1. Share `docs/3rd-party-review/` with chosen reviewer. URL of web repo is already included so they can just clone.
2. Acknowledge / hand-off. Owner watches GitHub Issues on both repos for `review:` prefix questions.
3. When findings return → use `docs/prompts/fresh-session-kickoff-post-review.md` to start the implementation session.
