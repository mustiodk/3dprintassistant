# 2026-05-08 — Cowork (appdev): AI operating-model cleanup

## Durable context

- Owner decided not to archive `Projects/ai-operating-model/`; it stays as a paused/reference project for cross-AI collaboration lessons.
- The active 3dpa AI Operating Model pilot workflow is retired. No 2026-05-14 end-of-pilot ceremony, no mandatory scorecards, no pilot branch workflow.
- `docs/ai-collab.md` now survives as lightweight tool-routing guidance: Codex primary builder, Claude secondary reviewer/collaborator, Gemini research/large-context, ChatGPT/Grok brainstorming.
- Useful pilot artifacts were promoted to `main` as product history: AI handoffs, Codex packets, Gemini research, slim ROADMAP/archive structure, and `docs/3dpa-context.md`.
- Analytics v1 is shipped and reflected in ROADMAP: web `1171583`, iOS `303f571`, TestFlight run `25572470387` succeeded.

## What happened / Actions

1. Shipped analytics v1 before cleanup:
   - Web `main` received `1171583 feat: add privacy-preserving usage analytics`.
   - iOS `main` received `303f571 feat: add privacy-preserving usage analytics`.
   - TestFlight workflow run `25572470387` completed successfully.
2. Reassessed the AI Operating Model footprint after owner said the meta-project may be cancelled.
3. Owner chose the middle path: keep `ai-operating-model/`, but retire the active pilot mechanics.
4. Promoted useful docs from `ai/operating-model-pilot` into web `main`:
   - `docs/3dpa-context.md`
   - `docs/ai-collab.md`
   - `ai-handoffs/`
   - `codex/`
   - relevant Gemini research handovers
   - planning archive + slim ROADMAP structure
5. Rewrote `docs/ai-collab.md` from an operating-model pilot spec into concise AI collaboration/tool-routing guidance.
6. Updated ROADMAP and NEXT-SESSION to remove active pilot deadline, branch reconciliation, and mandatory research/review flow.
7. Deleted remote branch `origin/ai/operating-model-pilot` after its useful artifacts were preserved on `main`.

## Files touched (Modified / Deleted / Untracked)

Modified / added on 3dpa `main`:
- `docs/planning/ROADMAP.md`
- `docs/sessions/NEXT-SESSION.md`
- `docs/sessions/INDEX.md`
- `docs/3dpa-context.md`
- `docs/ai-collab.md`
- `docs/planning/archive/*`
- `ai-handoffs/*`
- `codex/*`
- `docs/research/gemini-*.md`
- `docs/sessions/2026-04-30-cowork-appdev-ai-collab-pilot.md`
- `docs/sessions/2026-05-08-cowork-appdev-*.md`

Md-hygiene finding:
- Local checkout remains on `ai/operating-model-pilot`, whose remote branch is now gone, with three modified session-doc files. Do not keep working there. Next session should switch/clean deliberately after confirming whether those three local doc edits are superseded by `main`.

## Commits

- Web `main`: `1171583 feat: add privacy-preserving usage analytics`
- iOS `main`: `303f571 feat: add privacy-preserving usage analytics`
- Web `main`: `9530411 docs: retire AI operating model pilot workflow`
- Projects root `main`: `9666e48 docs: mark AI operating model as paused reference`

## Open questions / Follow-up

- TestFlight QA for run `25572470387`: review prompt should be suppressed; Kobra X / Centauri Carbon visible; analytics invisible and non-breaking.
- App Store Connect privacy labels must be updated before public release: Usage Data -> Product Interaction, not linked, not tracking.
- Local stale branch cleanup: decide whether to discard or salvage the three modified session docs on local `ai/operating-model-pilot`, then switch back to `main`.
- Vault sweep proposal: update the development/toolchain note to reflect the new practical tool routing: Codex primary, Claude secondary reviewer, Gemini research/large context.

## Next session

Start from web `main`, not `ai/operating-model-pilot`. Read `docs/sessions/NEXT-SESSION.md`; likely next choices are v1.0.3 TestFlight QA, item 2 environments, item 5 web output-panel UX, or analytics follow-up.
