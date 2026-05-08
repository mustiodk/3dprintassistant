# Claude handover - ROADMAP slimming + session lifecycle rules

**Prepared:** 2026-05-08  
**Prepared by:** Codex audit pass  
**Target implementer:** Claude / Claude Code  
**Recommended execution:** one handover, two implementation batches  
**Scope:** documentation and protocol restructure only. No engine, app, data, locale, build, workflow, or deployment behavior changes.

---

## Executive recommendation

Use **one review/proposal handover** for context, but implement it in **two separate batches**:

1. **Batch 1 - Project docs + ROADMAP slimming**
   - Slim `docs/planning/ROADMAP.md`.
   - Move historical roadmap detail into a small planning archive.
   - Refresh pointers in `docs/3dpa-context.md`, `docs/sessions/NEXT-SESSION.md`, and `3dprintassistant-ios/CLAUDE.md`.

2. **Batch 2 - Session lifecycle rules refinement**
   - Refactor Trigger A / Trigger B / Trigger C wording in top-level `Projects/CLAUDE.md` and `Projects/AGENTS.md`.
   - Preserve the original intent: wrap-up must remain an atomic close, not a lightweight summary.
   - Clarify ordering, `NEXT-SESSION.md` exceptions, and what goes where after ROADMAP slimming.

Why not two separate handovers? Because ROADMAP slimming changes what cold starts and wrap-ups should read/update. Claude should see both parts together to avoid designing one side against stale assumptions.

Why not one giant implementation commit? Because editing project docs and editing top-level lifecycle protocol have different blast radii. Keep the implementation batches separable and easy to review.

---

## Core intent to preserve

Do not optimize away the reason these rules exist.

The current system was built to prevent real failure modes:

- Half-closed sessions.
- Dirty trees hidden from the next assistant.
- Memory not captured.
- Vault-worthy context lost in chat.
- ROADMAP/session log drift.
- Stale `NEXT-SESSION.md` causing bad cold starts.
- Ambiguous project closes when several projects were touched.
- Vault-primary projects being treated like repo-primary projects.

The goal is **lower cognitive load without weaker closure**.

---

## Current audit findings

### ROADMAP findings

`3dprintassistant/docs/planning/ROADMAP.md` has become too large for fresh-session use.

Current observed shape:

- 756 lines.
- 268 checklist items.
- 197 done.
- 68 open.
- 3 partial.

It currently does five jobs:

1. Live roadmap / active work queue.
2. Historical changelog.
3. Internal review tracker.
4. Release-readiness archive.
5. Architecture and cold-start briefing.

That made sense during the intense release/review phase, but it is now creating friction. The live roadmap should stay authoritative, but completed history should move behind links.

Key stale/confusing areas:

- The huge `Last updated` paragraph is doing session-log work.
- `Current priority` still points at IR-0, while current work is the v1.0.3 batch.
- The April 28 release deadline appears as an active warning even though it is historical.
- v1.0.3 current work exists mostly in the latest session log and `NEXT-SESSION.md`, not as a clean live roadmap section.
- Architecture/context is duplicated despite `docs/3dpa-context.md` now existing.

### Session lifecycle findings

Trigger A is conceptually strong and should remain mandatory. Its issue is execution ergonomics, not intent.

What is good:

- `git status` first.
- Project identification before writing logs.
- Session log + tracking docs + memory/vault/md-hygiene close stack.
- `NEXT-SESSION.md` regeneration on explicit wrap-up.
- Vault-primary `state.md` path.
- Substance-based self-check.

What needs improvement:

- Trigger A is packed into one very long paragraph, which increases assistant execution mistakes.
- The timing of md-hygiene is slightly ambiguous:
  - Standing rule says md-hygiene happens before writing the session log.
  - Trigger A/session-end steps place md-hygiene after log/tracking-doc updates.
  - Better wording: run md-hygiene **before finalizing** the session log, and include findings in the log.
- `NEXT-SESSION.md` owner-triggered-only rule has an explicit Trigger A/B exception, but it is easy to miss.
- After ROADMAP slimming, Trigger A should clarify that ROADMAP receives live-state changes only, not session narrative.

---

## Documentation ownership model

Use this ownership model when implementing Batch 1.

| Surface | Owns | Notes |
|---|---|---|
| `docs/planning/ROADMAP.md` | Current state, active release, active backlog, deferred queue, live planning decisions | Slim live control surface. |
| `docs/planning/archive/` | Historical roadmap chunks and completed trackers | Archive, not a second active tracker. |
| `docs/3dpa-context.md` | Evergreen project context, architecture, data model, AI-peer context | Do not duplicate architecture in ROADMAP. |
| `docs/sessions/INDEX.md` | Reverse-chronological session table of contents | Session discovery surface. |
| `docs/sessions/YYYY-MM-DD-*.md` | Narrative history, durable context, commit trail, session decisions | Do not migrate all detail into ROADMAP. |
| `docs/sessions/NEXT-SESSION.md` | Owner-triggered cold-start prompt | Should point to slim roadmap after Batch 1. |
| `docs/specs/` | Implementation specs and design decisions for specific features | Link from ROADMAP; do not inline. |
| `docs/research/` | Research handovers, Gemini responses, source-gathering | Link from current work only. |
| `docs/reviews/` | Review findings and audit deliverables | ROADMAP tracks active/open actions only. |
| `docs/prompts/` | Claude/Claude Code handoff prompts | This file lives here. |
| `docs/runbooks/` | Operational procedures | Link from active/deferred work only. |
| `docs/ai-collab.md` | AI operating model, Codex/Gemini escalation rules | Do not duplicate in ROADMAP. |
| `3dprintassistant/CLAUDE.md` | Web repo coding rules | Keep short. |
| `3dprintassistant-ios/CLAUDE.md` | iOS repo rules, sync expectations, UI review workflow | Refresh planning/context pointers. |
| `Projects/CLAUDE.md` and `Projects/AGENTS.md` | Cross-project protocol, lifecycle triggers, memory hot cache | Must stay byte-identical. |

Non-canonical surfaces:

- `.claude/worktrees/*` contains worktree copies. Do not treat as canonical.
- `research md/` and `bambu configs/md files/` are old/personal research inputs. Do not promote unless current work explicitly needs them.
- `ai-handoffs/` is an audit trail for the AI Operating Model pilot. Do not merge it into ROADMAP.
- `docs/3rd-party-review/` is a mostly frozen starter kit. Update only if a link/description becomes actively misleading.

---

## Batch 1 - ROADMAP slimming proposal

### Target structure

Create a small archive area:

```text
docs/
|-- 3dpa-context.md
|-- ai-collab.md
|-- planning/
|   |-- ROADMAP.md
|   `-- archive/
|       |-- README.md
|       |-- 2026-04-internal-review-tracker.md
|       |-- 2026-04-release-readiness-history.md
|       `-- completed-milestones-and-legacy-backlog.md
|-- sessions/
|   |-- INDEX.md
|   `-- NEXT-SESSION.md
|-- specs/
|-- research/
|-- reviews/
|-- prompts/
`-- runbooks/
```

Do not create many tiny roadmap files. The split should be:

- One live roadmap.
- A few archive files for historical roadmap chunks.
- Existing specs/reviews/sessions remain where they are.

### Target shape for slim `ROADMAP.md`

Use this outline:

```markdown
# 3D Print Assistant - Roadmap

**Purpose:** Live planning surface for 3dpa web + iOS.
**Last updated:** 2026-05-08 - v1.0.3 batch planning in flight.
**Evergreen context:** ../3dpa-context.md
**Session history:** ../sessions/INDEX.md

## Current Snapshot

## Active Release: v1.0.3

## Active Work Queue

## Deferred / Parked Work

## Backlog

## Standing Planning Rules

## Archive Index
```

### Current Snapshot

Keep a compact table:

- Web app live.
- iOS app live worldwide, v1.0.2 current.
- Shared engine rule: web is master, iOS mirrors.
- Export state: engine exists, UI disabled/hidden pending Bambu import fix.
- Current branch state only if verified during implementation.

### Active Release: v1.0.3

Promote the v1.0.3 batch from `docs/sessions/NEXT-SESSION.md` and the 2026-05-08 session log:

1. Missing printers: Kobra X correction + Centauri Carbon.
2. Expanded environment taxonomy.
3. iOS App Store review prompt.
4. Analytics platform + event taxonomy.
5. Web output-panel UX visibility.

Include phase status:

- Phase A: locked + held by owner.
- Phase B: research handovers partial.
- Phase C: Codex packets not started.
- Phase D: implementation not started.
- Phase E: ship cycle not started.

Keep the Phase A hold warning clear. Do not ship Kobra X / Centauri Carbon changes unless the owner explicitly releases the hold.

### Active Work Queue

Keep open actionable items only. Suggested buckets:

- v1.0.3 batch.
- Phase DQ remaining: DQ-3, DQ-4, DQ-5.
- IR-3 failure-mode rehearsal.
- Export re-enable path.
- iOS post-release polish that is still live.

Avoid listing every completed IR/RB/BR item inline.

### Deferred / Parked Work

Keep real but non-current work:

- DQ-3 deferred until post-v1.0.3.
- macOS app (#037), Windows app (#038).
- Light mode iOS v1.1 candidate.
- Export path items while export UI is disabled.
- AI Operating Model pilot reference: link to `docs/ai-collab.md`, do not track the pilot inside ROADMAP unless it affects current 3dpa work.

### Backlog

Keep a compact open backlog table. Drop shipped rows or move them to archive.

Suggested columns:

| ID | Item | Platform | Status | Notes |

### Standing Planning Rules

Only keep rules that affect planning decisions:

- Web is master; iOS mirrors engine/data.
- Any data/logic change must evaluate web + iOS UI/UX impact.
- One finding = one commit.
- iOS push gate.
- ROADMAP is live planning truth, not the detailed history archive.

Everything else belongs in top-level protocol files or `docs/3dpa-context.md`.

### Archive Index

Link to:

- Internal review tracker archive.
- Release-readiness history archive.
- Completed milestones + legacy backlog index.
- `docs/reviews/2026-04-20-internal/`.
- `docs/specs/IMPL-039-preset-clamping.md`.
- `docs/specs/IMPL-040-chip-desc-parity.md`.
- `docs/specs/IMPL-041-data-quality-phase.md`.
- `docs/sessions/INDEX.md`.

### Archive file content plan

#### `docs/planning/archive/README.md`

Purpose:

- Explain archive files preserve historical roadmap content.
- State that `../ROADMAP.md` is the live planning surface.
- Explain that session logs remain the source for narrative detail.

#### `docs/planning/archive/2026-04-internal-review-tracker.md`

Move from current ROADMAP:

- `Internal review follow-up (IR-*)`.
- IR-0 through IR-deferred.
- IR tracking table.

Compress completed items where possible but preserve IDs, status, and links.

Important: canonical finding detail remains in `docs/reviews/2026-04-20-internal/`. This archive is the shipped/action tracker, not the finding source.

#### `docs/planning/archive/2026-04-release-readiness-history.md`

Move from current ROADMAP:

- `Release blockers - Fix Now`.
- `Before release - Polish & compliance`.
- `Phase 2.7b - Explanatory Descriptions`.
- Completed PR-8 detail if it reads as release history.
- App Store readiness / v1.0 and v1.0.2 historical narrative.

Compress aggressively but preserve non-obvious decisions:

- iOS dark-only rationale.
- Feedback/security routing decisions.
- Export UI disabled/hidden state.
- TestFlight workflow manual-dispatch decision if not already covered elsewhere.

#### `docs/planning/archive/completed-milestones-and-legacy-backlog.md`

Move from current ROADMAP:

- `Completed phases`.
- `Legacy backlog ID index (#001-#036)`.
- Shipped future-feature rows.

Keep it useful as a lookup, not a full changelog. Link to session logs for details.

### Batch 1 files likely needing updates

Must update:

1. `docs/planning/ROADMAP.md`
2. `docs/planning/archive/*`
3. `docs/sessions/NEXT-SESSION.md`
4. `docs/3dpa-context.md`
5. `3dprintassistant-ios/CLAUDE.md`

Probably update:

6. `docs/3rd-party-review/REFERENCE-INDEX.md`
7. `docs/prompts/fresh-session-kickoff-post-review.md`
8. `docs/planning/next-session-asc-upload.md`

Do not update unless necessary:

- Individual session logs.
- Review finding files under `docs/reviews/2026-04-20-internal/`.
- Research handovers under `docs/research/`.
- Old `research md/` and `bambu configs/md files/`.
- `.claude/worktrees/*`.

---

## Batch 2 - Session lifecycle rules proposal

### Design principle

Do not make Trigger A lighter. Make it clearer.

Trigger A is a deliberate full close. It should remain heavier than Trigger B, because it is responsible for durable context, live tracking, memory/vault evaluation, hygiene findings, and the next-session resume surface.

### Recommended Trigger A shape

Refactor Trigger A into phases:

```markdown
Trigger A - Full Close

Intent:
Atomic end-of-session close. Preserve durable context, update live tracking, prepare next-session entry point, surface hygiene findings.

Phase 1 - Identify Scope
1. Git status for each relevant repo.
2. Identify active project(s), using token if provided.
3. If ambiguous, ask before proceeding.

Phase 2 - Preserve Work
4. Write/update project session log.
5. Update session INDEX if the project uses one.
6. Update live tracking doc only for confirmed changes.

Phase 3 - Propagate Durable Context
7. Memory sweep.
8. Vault sweep.
9. Md-hygiene sweep before finalizing the session log; include findings in the log/open questions.

Phase 4 - Prepare Resume Surface
10. Non-vault-primary: regenerate NEXT-SESSION.md.
11. Vault-primary: update state.md instead.
12. Print resume prompt/instruction.

Phase 5 - Self-check
13. One line per step, stating what happened or why skipped.
```

### Preserve these Trigger A details

Do not remove:

- Destination priority order for session logs.
- Vault-primary `state.md` behavior.
- Requirement to surface missing project convention.
- Memory sweep, including "no durable memory to add".
- Vault sweep, including "nothing durable to propagate".
- Md-hygiene checklist.
- `NEXT-SESSION.md` regeneration for non-vault-primary Trigger A.
- Visible copy-paste prompt/resume instruction.
- Substance-based self-check.

### Clarify md-hygiene timing

Recommended wording:

> Run md-hygiene before finalizing the session log. If findings exist, include them in the session log's Open questions / Follow-up section. If the sweep itself causes planned edits, apply only owner-approved actions and re-check the affected docs.

This resolves the current tension between:

- "Before writing the session log" in the standing md-hygiene rule.
- Later Trigger A/session-end steps that currently place md-hygiene after logging/tracking.

### Clarify `NEXT-SESSION.md` exception

Recommended wording:

> Routine session-end does not regenerate `NEXT-SESSION.md`. Trigger A and Trigger B are exceptions because the trigger phrase is the explicit owner ask to prepare a resume surface.

This preserves the 2026-04-23 owner preference while explaining why Trigger A/B differ.

### Add a 3dpa "what goes where" note after ROADMAP slimming

Recommended wording:

```markdown
For 3dpa after ROADMAP slimming:
- Session narrative -> `docs/sessions/YYYY-MM-DD-...md`
- Live status/open queue -> `docs/planning/ROADMAP.md`
- Evergreen architecture/context -> `docs/3dpa-context.md`
- Historical completed detail -> `docs/planning/archive/`, `docs/reviews/`, `docs/specs/`, and session logs
```

This keeps future wrap-ups from re-bloating ROADMAP.

### Cold-start protocol adjustment

After Batch 1, update the 3dpa Trigger C read order:

Current:

- top-level protocol
- project `CLAUDE.md`
- ROADMAP
- INDEX
- last 3 session logs
- NEXT-SESSION

Recommended:

- top-level protocol
- project `CLAUDE.md`
- `docs/3dpa-context.md`
- slim ROADMAP
- INDEX
- last 3 session logs
- NEXT-SESSION
- task-specific finding/spec/research file

Reason: `docs/3dpa-context.md` now owns evergreen architecture/context, while ROADMAP owns live state.

### Preserve Trigger B distinction

Trigger B should stay lighter:

- Git status.
- Identify project.
- Append handoff note.
- Light tracking touch only for confirmed shipped items.
- Regenerate resume surface / update vault `state.md`.
- Self-check saying memory + vault skipped.

Do not add full memory/vault/md-hygiene to Trigger B. That would collapse the useful distinction between "handoff" and "wrap-up".

---

## Implementation sequence

### Pre-flight

Run:

```bash
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant status --short --branch
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios status --short --branch
diff -u /Users/mragile.io/Documents/Claude/Projects/CLAUDE.md /Users/mragile.io/Documents/Claude/Projects/AGENTS.md
```

If the `diff` outputs anything, stop and surface protocol drift before editing lifecycle rules.

Read:

- `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
- `/Users/mragile.io/Documents/Claude/Projects/AGENTS.md`
- `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
- `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
- `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
- `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md`
- `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
- `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-08-cowork-appdev-v1.0.3-batch-planning-and-handovers.md`
- `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/CLAUDE.md`

### Batch 1 steps

1. Create `docs/planning/archive/`.
2. Extract historical ROADMAP sections into the archive files.
3. Rewrite `docs/planning/ROADMAP.md` to the slim live structure.
4. Update `docs/3dpa-context.md` pointers if needed.
5. Update `docs/sessions/NEXT-SESSION.md` read order.
6. Update `3dprintassistant-ios/CLAUDE.md` planning/context wording.
7. Decide how to handle `docs/planning/next-session-asc-upload.md`:
   - preferred: move to archive;
   - acceptable: add stale/historical note.
8. Verify links and line count.

### Batch 2 steps

1. Refactor Trigger A/B/C lifecycle section in `Projects/CLAUDE.md`.
2. Apply byte-identical update to `Projects/AGENTS.md`.
3. Preserve token table and vault-primary behavior.
4. Clarify md-hygiene timing.
5. Clarify Trigger A/B `NEXT-SESSION.md` exception.
6. Add 3dpa "what goes where" note.
7. Re-run `diff -u Projects/CLAUDE.md Projects/AGENTS.md`; it must output nothing.

### Verification

Run:

```bash
rg -n "ROADMAP\\.md|docs/planning/ROADMAP|single source of truth|architecture reference|recent completed work|IR-0|April 28|Current priority" \
  /Users/mragile.io/Documents/Claude/Projects/3dprintassistant \
  /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios \
  --glob '*.md' --glob '!**/.git/**' --glob '!**/build/**' --glob '!**/.claude/worktrees/**'

wc -l /Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md

diff -u /Users/mragile.io/Documents/Claude/Projects/CLAUDE.md /Users/mragile.io/Documents/Claude/Projects/AGENTS.md
```

The `rg` command may still find historical references, but active docs should no longer imply stale IR-0 / April 28 / giant-roadmap assumptions are current.

---

## Acceptance criteria

### Batch 1

- `docs/planning/ROADMAP.md` is readable as a fresh-session planning entry point in under a few minutes.
- Active v1.0.3 batch is clearly represented.
- Historical IR/RB/BR detail is preserved in archives or existing review/session docs.
- No active planning context is lost.
- No second active roadmap/tracker is introduced.
- `docs/3dpa-context.md` remains evergreen.
- iOS `CLAUDE.md` points to correct owners for planning vs architecture.
- `NEXT-SESSION.md` still works as a cold-start prompt.
- No code/data/app behavior changes.

### Batch 2

- Trigger A remains a full atomic close.
- Trigger B remains a lighter handoff.
- Trigger C includes `docs/3dpa-context.md` for 3dpa cold starts.
- Md-hygiene timing is unambiguous.
- `NEXT-SESSION.md` owner-triggered rule and Trigger A/B exception no longer look contradictory.
- `Projects/CLAUDE.md` and `Projects/AGENTS.md` are byte-identical after edits.
- Self-check remains substantive, not checkbox theater.

---

## Important constraints

- Do not touch engine/data/source files.
- Do not push anything unless owner explicitly asks.
- Do not rewrite session logs.
- Do not delete historical docs unless explicitly moved/archived.
- Do not treat `.claude/worktrees/*` as canonical.
- Do not treat dependency Markdown under iOS `build/SourcePackages` as project docs.
- If unsure whether a doc is current or historical, add an archive/stale note rather than deleting it.
- Keep new files few. The goal is less sprawl, not prettier sprawl.
- Preserve the "soul" of wrap-up: durable context, clean next entry point, and no silent skipped steps.

---

## Suggested commit shape

If committing, prefer two commits:

```text
docs: slim roadmap and archive historical planning detail
docs: clarify session lifecycle close and cold-start rules
```

If only Batch 1 is implemented in the first pass, stop there and leave Batch 2 for a separate review. That is safer than half-editing top-level lifecycle protocol.

