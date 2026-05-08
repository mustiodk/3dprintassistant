# 2026-05-08 — Cowork (appdev): ROADMAP slim + lifecycle protocol refactor under multi-gate Codex review

## Durable context

- **Multi-gate Codex review pattern (5 packets) is appropriate-once for cross-project blast-radius doc refactors, not normalized for ordinary work.** This session ran Gate 0 (plan) → Gate 1a (Phase 1a output) → Gate 2 (Phase 2 output) → Gate 2.5 (pre-execute fix-plan review) → Gate 2.6 (post-execute output review). Codex confirmed appropriate-once at Gate 2.5 + Gate 2.6 close. Future ordinary feature work should NOT default to this cadence — memory entry: `feedback_codex_review_process_plan_appropriate_once.md` (lives at `~/.claude/projects/-Users-mragile-io-Documents-Claude-Projects/memory/`). Owner explicitly asked for review-before-execute + review-after-execute on Gate 2 specifically because the lifecycle protocol affects every future session.
- **3dpa documentation now has a 3-tier ownership model:** `docs/3dpa-context.md` = canonical evergreen (architecture / engine API / app state / standing rules), `docs/planning/ROADMAP.md` = slim live planning surface (Active Release / Active Work Queue / Deferred / Backlog), `docs/planning/archive/` = historical detail (IR cycles + RB/BR pre-release polish + completed phases + legacy `#001-#036`). Top-level `Projects/CLAUDE.md` Trigger A's "what goes where" subsection enforces this routing during future session closes — prevents ROADMAP re-bloat. iOS `CLAUDE.md` was trimmed (184 → 47 lines) and now points to `docs/3dpa-context.md` as canonical owner of shared cross-platform reference. Authority loop (3dpa-context says "see iOS CLAUDE for full reference"; iOS CLAUDE says "see 3dpa-context for shared content") closed by removing the deferral pointers in 3dpa-context.md.
- **Trigger A in `Projects/CLAUDE.md` refactored from monolithic 10-step paragraph into 5-phase / 12-step structure** (Identify scope → Preserve work → Propagate durable context → Prepare resume surface → Self-check). Md-hygiene moved from old step 7 (after log) to new Phase 2 step 4 (BEFORE log finalization) so findings land in the log's Open questions / Follow-up section. NEXT-SESSION exception (Trigger A/B regenerate; Trigger C is read-only) made explicit. Trigger A destination labels renamed from `(5a-vault)/(5a)/(5b)/(5c)/(5d)` to semantic `(5-vault)/(5-documented)/(5-sessions-dir)/(5-session-log)/(5-fallback)` per Codex SF-1. Trigger B kept its `(3a-vault)/(3a)/(3b)/(3c)/(3d)` labels (not refactored). Trigger C 3dpa cold-start read order updated to include `docs/3dpa-context.md` between project CLAUDE.md and slim ROADMAP. THIS SESSION'S WRAP-UP WAS THE FIRST REAL-WORLD TEST OF THE NEW WORDING — and surfaced precision-of-claims gaps (see Open questions / Follow-up below) caught by a Codex pre-commit audit.
- **Auto-sync silently committed Projects/ root edits across the session.** `Projects/` is a git repo with auto-sync (commits roughly every 30-60min when changes detected). My Trigger A refactor + memory entry + NF-1/NF-3 follow-up edits landed across 3 auto-sync commits (4ae2c51 17:44, 4d70be1 18:02, 70bfc3f 18:08). 3dpa-web + 3dpa-iOS do NOT auto-sync — those repos require explicit commits. Implication for future Trigger A closes: Projects/ root tracking is "always-up-to-date" automatically; project repos need explicit commit shaping by owner.
- **MF-1 in Gate 2 caught a real problem I missed pre-execution: trimming iOS CLAUDE.md before fixing 3dpa-context.md's "selected/truncated" deferral pointers would have orphaned the canonical engine API + state shape.** This is the value the multi-gate Codex review unlocked — the Phase 1a→1b sequence I'd planned would have collapsed canonical authority. Fix: promote 3dpa-context.md to canonical owner BEFORE iOS CLAUDE.md trim. Resequenced Phase 1a to include the promotion. Without Codex Gate 0, this would have shipped as a silent regression.

## What happened / Actions

A long, ambitious session that took the 3dpa ROADMAP from 773 lines (mostly history) → 224 lines (slim live planning) and refactored the cross-project lifecycle protocol in `Projects/CLAUDE.md` + `Projects/AGENTS.md`, all under multi-gate Codex review per owner instruction "i need you to take this one seriously and i want another review before execute and after done."

Roughly 5 phases, 5 Codex review packets/gates, 2 owner-side gates.

### Phase 0 — Pre-flight reads + adapted plan

1. Owner asked to do an honest review of the Codex-prepared handover prompt at [`docs/prompts/roadmap-and-session-lifecycle-claude-handover.md`](../prompts/roadmap-and-session-lifecycle-claude-handover.md), compare with my own analysis, and propose a plan.
2. Verified Codex's audit numbers exactly (773 lines, 268 / 197 / 68 / 3 checkboxes). Agreed with the diagnosis but pushed back on 3 things: synthesis effort undercounted, line-count target should be soft, multi-repo commit reality (Codex framed it as one commit; actually 3 commits across 3 repos).
3. Owner adopted my honest self-review ("does it apply quality first, no cutting corners?") which surfaced incomplete pre-flight reading + missing acceptance gates. Re-scoped to: Phase 0 read-only pre-flight → multi-gate Codex review → execute per gate dispositions.
4. Phase 0 pre-flight reads: 9 files (top-level CLAUDE.md / 3dpa-context.md / full ROADMAP / both May 8 session logs / iOS CLAUDE.md / sessions INDEX / NEXT-SESSION / next-session-asc-upload / 2 memory entries) + verified protocol byte-identity.

### Gate 0 (Codex packet 1) — Plan + Phase 0 findings review

5. Drafted [`codex-2026-05-08-gate-0-preflight-findings-review.md`](../../codex/roadmap-slim-and-lifecycle/codex-2026-05-08-gate-0-preflight-findings-review.md) with Decisions A-D (slim ROADMAP scope, iOS CLAUDE.md trim, ASC-upload disposition, effort estimate revision).
6. Codex returned 2 Must-Fix + 3 Should-Fix + 3 Optional. **MF-1 caught the authority-loop risk** (3dpa-context.md still pointed to iOS CLAUDE.md for full engine API + state shape; trimming iOS would orphan canonical content). MF-2 demanded discoverability hard criterion: every `[ ]`/`[~]` from original ROADMAP must surface in slim or be explicitly retired with sign-off.
7. Resolution applied per MF-1 + MF-2 + 3 SFs + 3 Os. Sequencing changed: Phase 1a now includes 3dpa-context.md canonical promotion BEFORE Phase 1b touches iOS CLAUDE.md.

### Phase 1a — Web docs slim + 4 archive files + 3dpa-context.md promotion

8. Created `docs/planning/archive/` with README + 3 historical files: `2026-04-internal-review-tracker.md` (239 lines covering IR-0…IR-5 + IR-2a + IR-deferred + tracking table), `2026-04-release-readiness-history.md` (232 lines covering RB-1…5 + BR-1…12 + Phase 2.7b + DQ-1+DQ-2 shipped narratives + PR-8), `completed-milestones-and-legacy-backlog.md` (104 lines covering completed phases + #001-#036 + research/prompts index).
9. `git mv`'d `docs/planning/next-session-asc-upload.md` → `docs/planning/archive/2026-04-asc-upload-kickoff-prompt.md` with stale-note header (Decision C from Gate 0).
10. Promoted `docs/3dpa-context.md` to canonical owner — replaced "(selected — full list in 3dprintassistant-ios/CLAUDE.md)" + "(truncated; full reference in 3dprintassistant-ios/CLAUDE.md)" qualifiers with "(canonical reference)" + "(canonical)". Added inline note on `resolveProfile` row: "Not temperatures — temps come from `getAdjustedTemps()`" preserving the load-bearing distinction from retired ROADMAP architecture block.
11. Rewrote `docs/planning/ROADMAP.md` from 773 lines to 224 lines — Active Release: v1.0.3 / Active Work Queue / Deferred / Parked Work / Backlog / Standing Planning Rules / Archive Index. Lifted+restructured the existing v1.0.3 batch table; promoted Phase A/B/C/D/E status block; collapsed PR-1…7 into a Backlog table.
12. Refreshed `docs/sessions/NEXT-SESSION.md` read-order to include `3dpa-context.md` and pointer to slim ROADMAP.
13. Phase 1a md-hygiene + cold-read self-test + scoped link check passed at that point (1 fix: iOS review-kit cross-repo path was off by one `../`). Later wrap-up artifacts needed their own link/claim verification and were corrected before commit.

### Gate 1a (Codex packet 2) — Phase 1a output review

14. Drafted [`codex-2026-05-08-gate-1a-web-docs-output-review.md`](../../codex/roadmap-slim-and-lifecycle/codex-2026-05-08-gate-1a-web-docs-output-review.md) with Decisions E-I.
15. Codex returned 2 Must-Fix + 4 Should-Fix + 3 Optional. MF-1 (slim ROADMAP active-release opener said "5 user-facing items shipped" — contradicts 2/5 table state). MF-2 (3dpa-context.md still had 4 stale authority signals: PHP/filemtime self-correcting note, iOS test count 46 vs 64, ROADMAP pointer description, iOS CLAUDE.md pointer description).
16. All 8 fixes applied (2 MF + 4 SF + 2 housekeeping). Slim ROADMAP grew to 224 lines (target was ≤200 soft per SF-1).

### Phase 1b — iOS CLAUDE.md trim

17. Trimmed `3dprintassistant-ios/CLAUDE.md` from 184 lines → 47 lines. Kept intro + planning pointers (now references 3dpa-context.md FIRST + ROADMAP SECOND) + Cross-device UITest workflow + sister-project pointer + iOS-specific notes (PrintAssistant module name, XcodeGen rule, 64-test baseline, manual-dispatch CI note). Removed: full engine API duplicate, app-state shape, slicer routing, Simple/Advanced semantics, i18n details, stale 4-nozzle list, features list, what-NOT-to-build list — all now sourced from canonical 3dpa-context.md.
18. Uncommitted local docs change only — NOT pushed per iOS push gate (v1.0.3 in TestFlight).
19. Codex review skipped per appropriate-once rule (Codex confirmed at Gate 1a: "no second full Codex gate before trimming iOS CLAUDE.md needed").

### Phase 2 — Cross-project lifecycle protocol refactor

20. Refactored Trigger A in `Projects/CLAUDE.md` from one massive paragraph (10 flat steps) into 5 phases × 12 numbered steps. Md-hygiene moved to Phase 2 step 4 BEFORE log finalization. NEXT-SESSION exception clarification subsection added. Trigger C 3dpa read order updated to include `docs/3dpa-context.md`. New "what goes where" subsection added (3dpa post-slim routing rule).
21. Synced byte-identical to `Projects/AGENTS.md` via `cp`. Updated memory entry `feedback_session_lifecycle_triggers.md` (lives at `~/.claude/projects/-Users-mragile-io-Documents-Claude-Projects/memory/`) for the phase structure + Trigger C 3dpa read order.

### Gate 2 (Codex packet 3) — Phase 2 output review

22. Drafted [`codex-2026-05-08-gate-2-lifecycle-protocol-review.md`](../../codex/roadmap-slim-and-lifecycle/codex-2026-05-08-gate-2-lifecycle-protocol-review.md) with Decisions J-O.
23. Codex returned **5 Must-Fix + 4 Should-Fix + 3 Optional** — biggest finding count of the session. MF-1 stranded step refs after renumber (3 specific places). MF-2 Session-log protocol "At session END" 6-step list contradicted new Trigger A. MF-3 "At session START" + NEXT-SESSION prompt structure stale. MF-4 hot-cache `## 3DPA Planning` conflicted with new "what goes where". MF-5 memory entry vault-primary fallback wrongly stated as primary.

### Owner instruction — review-before-execute + review-after-execute for Gate 2

24. Owner explicitly asked: "i need you to take this one seriously and i want another review before execute and after done." Wider blast radius (lifecycle affects every future session) justified the extra rigor.

### Gate 2.5 (Codex packet 4) — Pre-execution fix-plan review

25. Wrote Gate 2 Resolution as PLAN (not applied). Drafted [`codex-2026-05-08-gate-2.5-fix-plan-pre-execution-review.md`](../../codex/roadmap-slim-and-lifecycle/codex-2026-05-08-gate-2.5-fix-plan-pre-execution-review.md) asking Codex to review the planned fix wording before any file edits.
26. Codex approved with 5 modifications: (1) MF-2 must preserve vault-sweep checklist as non-ordering reference block; (2) MF-1 + SF-1 conflicted (mixed `(5a-vault)` + `(5-vault)` plans) — use semantic labels everywhere; (3) MF-4 sweep whole hot-cache, not just first bullet; (4) MF-5 lead with explicit "Legacy fallback only when state.md is missing"; (5) verification expansion (2 new rg checks).

### Execute Gate 2 fixes per Gate 2.5-approved plan

27. Applied 9 fixes to `Projects/CLAUDE.md` + AGENTS.md byte-identical sync + memory entry. Verification: byte-identity ✓, vault-sweep checklist preserved at line 255, no old MANDATORY headings, expanded stale-ref sweep clean (only intentional historical mention in memory's renamed-2026-05-08 explanatory parenthetical), no leftover `(5a)/(5b)/(5c)/(5d)` Trigger A labels. Cold-read self-test: ONE clear order for Trigger A confirmed.

### Gate 2.6 (Codex packet 5) — Post-execution output review

28. Drafted [`codex-2026-05-08-gate-2.6-fix-execution-output-review.md`](../../codex/roadmap-slim-and-lifecycle/codex-2026-05-08-gate-2.6-fix-execution-output-review.md) with 12 final text snippets (per Codex's Decision R answer) + full verification check output + cold-read self-test.
29. Codex returned 3 Needs-Fix follow-ups. NF-1 hot-cache bullet falsely placed Codex review packets under `3dprintassistant/docs/codex/` (actual: `3dprintassistant/codex/`) — split into 2 bullets to fix. NF-2 verification check used relative path `memory/...` that doesn't exist + missed `Trigger C.*regenerate` pattern — re-ran with absolute paths, clean. NF-3 (optional) two residual "single source of truth" / "single planning doc" labels outside edited section — cleaned both.
30. Codex closed Gate 2 without requiring another full packet: *"this gate can close without another full Codex packet unless the owner wants one... I am comfortable with final session close using the new Trigger A wording."* Lifecycle refactor done.

### Phase 5 — Final session close (THIS SESSION)

31. First real-world test of the new Trigger A 5-phase / 12-step procedure. Phase 1 surfaced auto-sync state in Projects/ root (lifecycle edits already in 3 auto-sync commits) — adapted to that reality. Phase 2 step 4 md-hygiene found 10 untracked files all tied to this session's work, which grew as the session log and later Codex handover were created. Codex post-commit audit later caught that the handoff surfaces still described pre-commit state; this log and `NEXT-SESSION.md` were amended before push.

## Files touched

**Projects/ root (auto-synced — 3 commits across the session):**
- `CLAUDE.md` — Trigger A 5-phase refactor + Trigger C 3dpa read order + "what goes where" subsection + NEXT-SESSION exception clarification + 3DPA Planning hot-cache rewrite + Deployment table update + md-hygiene timing alignment + Structure tree label + Terms table label. 258 → 303 lines (+45).
- `AGENTS.md` — byte-identical sync to CLAUDE.md.

**Memory:**
- `feedback_session_lifecycle_triggers.md` — Trigger A body rewritten for phase structure + semantic labels; Trigger B vault-primary state.md exception; Trigger C vault-primary "Legacy fallback only when state.md is missing" wording; regen rule corrected (Triggers A/B regenerate, C is read-only); SF-2 token table abbreviation note. 44 lines.

**3dpa-web on branch `ai/operating-model-pilot` (committed locally; branch ahead of origin by 1):**
- Committed contents: `docs/3dpa-context.md` (canonical promotion + stale-pointer fixes + template-link de-clickified), `docs/planning/ROADMAP.md` (773 → 224 lines slim), `docs/planning/next-session-asc-upload.md` → `docs/planning/archive/2026-04-asc-upload-kickoff-prompt.md` (`git mv` + stale-note header), `docs/sessions/NEXT-SESSION.md` (read-order + post-commit branch-state correction), `docs/sessions/INDEX.md` (this session prepended), 4 archive files, 5 Codex gate packets, 1 Codex pre-commit fix handover, the originating handover prompt, and this session log.

**3dpa-iOS on branch `main` (committed locally; branch ahead of origin by 1, push gate active):**
- Committed contents: `CLAUDE.md` — trimmed 184 → 47 lines, points to canonical 3dpa-context.md.
- Still untracked/excluded: `docs/reviews/2026-04-23-high-003-codex/06-single-paste.pdf` — owner-pre-existing (Apr 23, 118KB, 8-page PDF — not introduced by this session, predates the lifecycle refactor work). Owner decision: exclude from this lifecycle-refactor work unless explicitly approved later.

## Commits

**Projects/ root (auto-sync — 3 commits):**
- `4ae2c51` (17:44) — initial Phase 2 Trigger A 5-phase refactor + memory entry
- `4d70be1` (18:02) — Gate 2 fix execution (9 fixes per Codex Gate 2.5 sign-off)
- `70bfc3f` (18:08) — NF-1 hot-cache codex/ path fix + NF-3 "single source" wording cleanup

**3dpa-web (`ai/operating-model-pilot` branch):** committed locally as `docs: slim roadmap and archive lifecycle refactor audit`; amended after Codex post-commit audit so handoff surfaces reflect post-commit reality. Not pushed at time of this log.

**3dpa-iOS (`main` branch):** `2de3540` — `docs: point iOS protocol to shared 3dpa context`. Not pushed; iOS push gate active for v1.0.3.

## Open questions / Follow-up

> Md-hygiene findings from Phase 2 step 4 + open owner-decision items.

- **Md-hygiene finding (3dpa-web files):** 12 previously untracked files were all tied to this session — 5 Codex packets + 1 Codex pre-commit fix handover in `codex/roadmap-slim-and-lifecycle/`, 4 archive files in `docs/planning/archive/`, the originating handover prompt at `docs/prompts/roadmap-and-session-lifecycle-claude-handover.md`, and this session log. They were committed in the local web docs commit.
- **Md-hygiene finding (iOS repo):** `CLAUDE.md` trim (184→47) was committed locally. The owner-pre-existing PDF (`docs/reviews/2026-04-23-high-003-codex/06-single-paste.pdf`) remains untracked and excluded. Push gate active per v1.0.3 in TestFlight; no push until next ship-ready cycle unless owner explicitly clears it.
- **Auto-sync surprise during wrap-up Phase 1:** Projects/ root auto-syncs roughly every 30-60min, so my lifecycle edits landed in 3 commits across the session rather than as one explicit "lifecycle refactor" commit. Owner-decided whether to leave as-is (commit history is preserved either way) or `git rebase -i` to squash the 3 auto-syncs into one labelled commit. Recommendation: leave as-is — the auto-sync commits are honest tracking and a squash would lose the session timeline.
- **Web `ai/operating-model-pilot` branch reconciliation:** still divergent from web `main` (per session 2026-05-08-items-1-3-ship Open questions). Independent of this refactor; carries forward as before.
- **End-of-pilot evaluation (2026-05-14, 6 days):** AI Operating Model pilot decision deadline. Item 3's 6-pass Codex review (from prior session) + this session's 5-pass Codex review on a meta-layer refactor are both marquee evidence for adopt/reject decision. Worth quantifying: tokens / time / owner attention vs bugs caught + load-bearing protocol issues prevented.
- **First real-world test feedback:** the new Trigger A wording handled the *mechanics* of multi-repo + auto-sync session cleanly. One friction point: the (5-documented) destination rule (3dpa pattern) doesn't have an explicit "use multi-day-disambiguator suffix" sub-rule for sessions sharing a date. Tracked here as a future Trigger A refinement candidate; not blocking.
- **Codex pre-commit audit (post-Trigger-A) caught 5 precision-of-claims errors in wrap-up artifacts** — corrected before the first local commit. **Codex post-commit audit caught one more class of issue:** handoff surfaces still described the pre-commit state after Claude created the commits. This log and `NEXT-SESSION.md` were amended before push. **Root cause:** wrap-up trusted context-window summary over fresh `git status` / link-validity checks, and post-commit state was not re-propagated into the cold-start surfaces. **Future Trigger A refinement candidate:** add a Phase 5 sub-step that re-runs the Phase 0-style fresh-evidence checks (git status from each touched repo, link validity on every file in to-commit set, count assertions) BEFORE printing the self-check table, and require a post-commit handoff refresh when commits happen after the session log is written.

## Next session

Most likely first action depends on owner priority — see also the regenerated `NEXT-SESSION.md`:

- **(a)** Continue v1.0.3 batch — items 2 (environments) / 4 (analytics) / 5 (web output-panel UX).
- **(b)** End-of-pilot evaluation prep (2026-05-14 deadline).
- **(c)** TestFlight QA on in-flight v1.0.3 build (verify Kobra X / Centauri Carbon visible if binary picked them up).
- **(d)** Branch reconciliation strategy (`ai/operating-model-pilot` vs `main`).
- **(e)** Push/release decision for local docs commits — web can be pushed when owner wants; iOS remains push-gated until ship-ready.

The slim ROADMAP / 3dpa-context.md / archive structure is now the canonical surface — future sessions read 3dpa-context.md FIRST, then slim ROADMAP, then session logs (per Trigger C's updated 3dpa read order).
