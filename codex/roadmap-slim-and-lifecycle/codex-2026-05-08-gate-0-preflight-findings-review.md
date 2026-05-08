# Codex review — Gate 0→1a: Pre-flight findings + adapted Batch 1 plan

**Project context:** [`docs/3dpa-context.md`](../../docs/3dpa-context.md)
**Originating handover:** [`docs/prompts/roadmap-and-session-lifecycle-claude-handover.md`](../../docs/prompts/roadmap-and-session-lifecycle-claude-handover.md)
**Gate:** Phase 0 (read-only pre-flight) → Phase 1a (web docs edits)
**Prepared:** 2026-05-08
**Prepared by:** Claude
**Reviewer:** Codex
**Owner:** Musti

---

> **How this file works.** Claude writes everything above the `# Codex Response`
> marker — Context + Decision to challenge + Alternatives + Diff/artefact +
> Tests + Uncertainty + Feedback wanted + Time pressure + Reversibility + final
> challenge paragraph. Codex appends findings into the `# Codex Response`
> section at the bottom. Claude then appends `# Resolution` with per-finding
> accept/modify/decline. The file is the single artifact for this review — no
> parallel session log, no copy-paste blocks.
>
> **Read-only constraint (MANDATORY).** During this review, Codex MUST NOT
> modify any project source files. Codex's only allowed write surface is the
> `# Codex Response` section of THIS file. No edits to code, config, schema,
> tests, scripts, ROADMAP.md, CLAUDE.md, AGENTS.md, or any non-packet artifact.
> Findings that imply a doc change are described in prose / diff blocks inside
> the response; the implementer (Claude) applies them after the owner approves
> dispositions. The review/implementation boundary is intentional — keep it
> clean.

---

## Context

This packet sits at **Gate 0 → Gate 1a** in the four-gate execution plan for the ROADMAP-slim + session-lifecycle refactor that you (Codex) audited and recommended in [`docs/prompts/roadmap-and-session-lifecycle-claude-handover.md`](../../docs/prompts/roadmap-and-session-lifecycle-claude-handover.md).

**The four gates** (each gets its own review packet):

| Gate | Bridge | Review focus |
|---|---|---|
| 0 → 1a | After pre-flight reads, before web docs edits | **This packet** — adapted Batch 1 plan + Phase 0 findings |
| 1a → 1b | After slim ROADMAP + 3 archive files committed (web repo) | Slim ROADMAP fitness + archive split fidelity |
| 1b → 2 | After iOS CLAUDE.md pointer refresh committed (iOS repo) | iOS CLAUDE.md trim/refresh judgment call |
| 2 → 3 | After Trigger A/B/C refactor committed (Projects/ root) | Lifecycle protocol clarity + byte-identical CLAUDE.md ↔ AGENTS.md |

The owner adopted your original audit + recommendations, with Claude's adaptations (pre-flight read phase, link-validity check, cold-read self-test, three-repo commit reality, ≤200-line as target not gate).

**What changed during Phase 0 (this packet's input):**
- Claude read all 9 files from your pre-flight list + the memory entry that needs a sweep at Gate 2.
- Several material findings emerged that warrant adjustment to the Batch 1 plan before edits start.
- Effort estimate revised down for the v1.0.3 synthesis step (the existing ROADMAP table is richer than initially read — lift+restructure, not invent).

**Why review at this gate:** the Batch 1 plan now has decisions that weren't in your original audit (iOS CLAUDE.md trim, ASC-upload archival, retiring duplicate sections). Catching disagreements here is cheaper than catching them after the slim ROADMAP is committed.

---

## Your role + how this review works

Per the memory entry `feedback_codex_review_file_workflow.md` (lives at `~/.claude/projects/-Users-mragile-io-Documents-Claude-Projects/memory/`): you are the design-review reviewer; Claude is the implementer; owner is the tiebreaker. Per `feedback_codex_review_process_plan_appropriate_once.md`: meta-layer / process-plan reviews are appropriate-once, not normalized — this entire effort IS a process refactor, so the exception applies. You should NOT review Gate 0 or Gate 1b unless they introduce new judgment calls; Gate 1a (output review) and Gate 2 (lifecycle wording) are the load-bearing gates.

**Default to challenge.** If Claude's adaptation softens or changes the substance of your original audit (rather than just executing it), call that out. Don't validate by inertia.

---

## Decision to challenge

The four discrete decisions below are what Claude proposes to do in Batch 1a + 1b. They go beyond your original audit. Each needs an explicit accept / modify / decline from you, then owner sign-off.

### Decision A — Slim ROADMAP scope: retire duplicates, not just shipped checkboxes

**Proposal:** the slim ROADMAP retires not only the IR-* / RB-* / BR-* / Phase 2.7b shipped sections (your original recommendation) but ALSO:

- **Lines 723-755 "Architecture reference"** (Stack, Data sync, Key context for Claude Code sessions). 100% duplicated in [`docs/3dpa-context.md`](../../docs/3dpa-context.md) (sections "Engine — engine.js is the brain" + "Data — data/*.json" + "Tech stack & deployment" + "App state shape"). The slim ROADMAP keeps a one-line pointer to 3dpa-context.md and nothing more.
- **Lines 758-774 "Research & prompts index"** (table of historical research/prompt files). Move to archive as a lookup table; remove from live ROADMAP.

**Rationale:** these sections were authoritative when 3dpa-context.md didn't exist. Now they're a drift surface. Eliminating them is what makes the slim ROADMAP under ~200 lines without forced compression.

**Risk if accepted:** if anyone (including a future Claude session) reads the slim ROADMAP looking for architecture without following the pointer, they'll fail to find it. Mitigation: the new "Current Snapshot" section opens with one line — `Architecture / engine API / data model: see docs/3dpa-context.md (evergreen).`

**Risk if declined:** slim ROADMAP carries ~50 lines of duplicate content — it shrinks but doesn't get clean.

### Decision B — iOS `3dprintassistant-ios/CLAUDE.md` trim

**Current state:** 184 lines. Lines 7-8 already point at `../3dprintassistant/docs/planning/ROADMAP.md` for planning + `docs/sessions/` for session logs. **But lines 34-184 (data model + engine API + state shape + slicer routing + simple/advanced + i18n + features list + what-not-to-build) are now duplicated in `docs/3dpa-context.md`.**

**Proposal — Option B1 (trim):** rewrite iOS CLAUDE.md to:
- Lines 1-32 of current file (intro + planning pointers + Cross-device UI review workflow + sister-project pointer) — keep, refresh planning pointer to mention 3dpa-context.md.
- Lines 34-184 — replace with a single section: "For data model, engine API, app-state shape, slicer routing, simple/advanced semantics, i18n, and what-NOT-to-build: read `../3dprintassistant/docs/3dpa-context.md` (evergreen)."
- Final length ~50 lines.

**Proposal — Option B2 (leave full, refresh only the planning pointer line):** add `3dpa-context.md` to the planning pointers list; do not touch the duplicated sections. Final length still ~184 lines, drift risk preserved.

**Recommendation:** B1. A defensive duplicate is only valuable if it's maintained — and it isn't (the file describes 4 nozzle types when the engine has 9; it's already drifted). Trim and trust the pointer.

**Risk of B1:** an Apple reviewer or a future repo browser opening the iOS repo standalone won't see the engine API inline. Mitigation: the pointer is explicit and the path is one directory up.

**Risk of B2:** iOS CLAUDE.md continues to drift. The next time someone reads it for engine-API details, they may get stale info.

### Decision C — `docs/planning/next-session-asc-upload.md` disposition

Read in full. It is a one-off cold-start prompt for the **App Store Connect upload session that happened 2026-04-14/15** — references the April 28 deadline, pre-launch upload steps, and commit hashes from that period (`cbf0947`, `bccfca4`). The work is shipped; the file is dead.

**Proposal:** move to `docs/planning/archive/2026-04-asc-upload-kickoff-prompt.md` with a one-line stale note at the top: `> Historical: kickoff prompt for the 2026-04-14/15 App Store Connect upload session. App Store live worldwide since 2026-04-27.`

**Alternative:** delete outright. Safer-leaning option (archive) avoids breaking any old session-log reference; cost is one extra file in the archive.

**Recommendation:** archive, not delete.

### Decision D — Effort estimate revision for "Active Release: v1.0.3" synthesis

**Original estimate (Claude, before Phase 0 reads):** 30-60 min net-new authoring.

**Revised estimate:** 15-25 min, lift+restructure. The existing ROADMAP § "v1.0.3 batch" (lines 244-256) is already a 5-row table with item 3's full detail. The synthesis work is:
1. Promote the table from a single section to "Active Release: v1.0.3" (rename + reframe).
2. Add Phase A/B/C/D/E status block (per your original outline) — pull from `NEXT-SESSION.md` lines 28-43.
3. Add Phase A hold warning (per your original outline) — already in line 250.
4. Compress item 3's status cell from a single 1500-char paragraph into 4-5 bullets with commit links.

**Confirm:** does this revision look right to you, or are you flagging something I'm missing in the synthesis cost?

---

## Alternatives considered

**For Decision A (slim scope):**
- Alt 1: keep architecture/research-index in slim ROADMAP for "self-contained" readability — rejected because it defeats the purpose of having `3dpa-context.md` as the evergreen.
- Alt 2: also retire DQ-1 + DQ-2 (shipped) sections — rejected because Phase DQ is a cross-batch program, the deferred DQ-3/4/5 still belong in active queue, and splitting completed sub-phases away from deferred ones makes the program harder to read.

**For Decision B (iOS CLAUDE.md):**
- Alt 1: split iOS CLAUDE.md into iOS-CLAUDE.md (operational) + iOS-DATA-MODEL.md (engine API duplicate) — rejected as more sprawl.
- Alt 2: delete iOS CLAUDE.md entirely, rely on 3dpa-context.md — rejected because the cross-device UITest workflow is iOS-only and belongs in the iOS repo.

**For Decision C (asc-upload):**
- Considered: leave file in place with a stale-note. Rejected because keeping stale planning docs alongside live planning docs is the exact rot pattern this whole exercise is fixing.

**For Decision D (estimate):** no alternative — this is a calibration update.

---

## Diff or artefact

**Files Claude has read in Phase 0** (full reads unless noted):

| File | Lines | Status |
|---|---|---|
| `Projects/CLAUDE.md` | (loaded by harness) | full read |
| `Projects/AGENTS.md` | — | byte-identical to CLAUDE.md (verified via diff, empty output) |
| `3dprintassistant/CLAUDE.md` | 29 | full read |
| `3dprintassistant-ios/CLAUDE.md` | 184 | full read |
| `3dprintassistant/docs/3dpa-context.md` | 232 | full read |
| `3dprintassistant/docs/planning/ROADMAP.md` | 773 | full read (chunked) |
| `3dprintassistant/docs/planning/next-session-asc-upload.md` | 61 | full read |
| `3dprintassistant/docs/sessions/INDEX.md` | 35 | full read |
| `3dprintassistant/docs/sessions/NEXT-SESSION.md` | 97 | full read |
| `3dprintassistant/docs/sessions/2026-05-08-cowork-appdev-v1.0.3-items-1-3-ship.md` | 144 | full read |
| `3dprintassistant/docs/sessions/2026-05-08-cowork-appdev-v1.0.3-batch-planning-and-handovers.md` | 120 | full read |
| `memory/feedback_session_lifecycle_triggers.md` | 44 | full read (8 days old per system reminder) |
| `memory/feedback_codex_review_file_workflow.md` | 105 | full read |

**Verified counts** (confirming your original audit):
- ROADMAP checkboxes: 268 total / 197 done / 68 open / 3 partial — matches your audit exactly.
- ROADMAP line count: 773 (was 756 when you audited; +17 from v1.0.3 work that landed since).
- `Projects/CLAUDE.md` ↔ `AGENTS.md`: byte-identical (empty diff).

**Adapted Batch 1a step list** (incorporating Decisions A-D above):

1. Create `3dprintassistant/docs/planning/archive/` with `README.md`.
2. Extract IR-0 / IR-1 / IR-2 / IR-2a / IR-3 / IR-4 / IR-5 + IR-deferred + IR tracking table → `archive/2026-04-internal-review-tracker.md`.
3. Extract Release blockers RB-1…5 + Before release BR-1…12 + Phase 2.7b + App Store readiness narrative → `archive/2026-04-release-readiness-history.md`.
4. Extract Completed phases table + Legacy backlog #001-#036 + (per Decision A) Research & prompts index → `archive/completed-milestones-and-legacy-backlog.md`.
5. Author "Active Release: v1.0.3" section per Decision D synthesis (15-25 min).
6. Author "Current Snapshot" + "Active Work Queue" + "Deferred / Parked Work" + "Backlog (open only)" + "Standing Planning Rules" + "Archive Index" sections per your original outline.
7. Replace giant Last-updated paragraph with one-line: `**Last updated:** 2026-05-08 — v1.0.3 batch 2/5 shipped (items 1 + 3). See INDEX for session detail.`
8. Drop "Architecture reference" + "Research & prompts index" sections per Decision A.
9. Refresh `docs/3dpa-context.md` pointers (likely no change — it already points to ROADMAP correctly; verify).
10. Refresh `docs/sessions/NEXT-SESSION.md` "Files to read in order" — line 49 currently says `docs/planning/ROADMAP.md` — full file. Post-slim, change description to `(slim live planning surface)`.
11. Per Decision C, move `next-session-asc-upload.md` → `archive/2026-04-asc-upload-kickoff-prompt.md` with stale note.
12. Verification: `wc -l docs/planning/ROADMAP.md` (target ≤200, soft); `rg` sweep for stale-phrase hits (`IR-0|April 28|Current priority|single source of truth`) in active docs; **link-validity check** — extract every `[label](path)` from slim ROADMAP + 3 archive files, confirm path resolves.
13. **Cold-read self-test** — re-read slim ROADMAP top-to-bottom; write a 3-sentence "what's current" summary; verify it's coherent without referencing anything else.
14. Commit `3dprintassistant/`: `docs: slim roadmap and archive historical planning detail`.

**Adapted Batch 1b step list:**

1. Per Decision B-recommendation (B1), trim `3dprintassistant-ios/CLAUDE.md` to iOS-only operational content (~50 lines), pointing to `docs/3dpa-context.md` for shared content.
2. Commit locally; **do not push** (iOS push gate active — v1.0.3 in TestFlight).
3. Subject: `docs: trim iOS CLAUDE.md duplicates; point to 3dpa-context.md`.

---

## Tests / checks already run

- `git status` on web + iOS + Projects/ root (clean tree on worktree branch).
- `diff -u Projects/CLAUDE.md Projects/AGENTS.md` (empty output — no protocol drift).
- ROADMAP checkbox count via `awk` (matches your audit exactly).
- File size verification on all Phase 0 read targets.
- Codex folder layout verified (`3dprintassistant/codex/ios-review-prompt/` exists, sibling `roadmap-slim-and-lifecycle/` created for this packet series).

**Not yet run:**
- Link-validity check (Step 12 of Batch 1a — runs after the slim authoring).
- Cold-read self-test (Step 13 of Batch 1a — runs after the slim authoring).

---

## What I am uncertain about (concrete questions)

1. **Decision B (iOS CLAUDE.md trim).** B1 is my recommendation but the trade-off is real. Codex — your call: do you back B1 (trim hard, trust the pointer) or B2 (leave full, drift risk)?
2. **Decision A — Architecture reference retirement.** The `Key context for Claude Code sessions` block at lines 745-754 contains 6 lines that ARE iOS-bridge-specific (module name, valid env values, valid surface values, etc.) and may not be in 3dpa-context.md. Should those 6 lines move to iOS CLAUDE.md instead of being lost in archive? Or are they redundant too?
3. **Phase DQ section split.** Phase DQ has DQ-1+DQ-2 shipped (lines 270-301) + DQ-3/4/5 deferred (lines 302-345). Slim ROADMAP keeps DQ-3/4/5 as deferred-queue items. Question: do DQ-1 + DQ-2 shipped narratives go to `2026-04-release-readiness-history.md` (Codex's original "release-readiness" file) or to `completed-milestones-and-legacy-backlog.md`? They're not "release-readiness" in the tightest sense, but they are completed phases. Lean: completed-milestones, since release-readiness implies pre-launch.
4. **Phase 2.7a (Bambu export).** Lines 551-565. Open items but stalled (export UI disabled). In slim ROADMAP these go to "Deferred / Parked Work" — is that right, or do they belong in the IR-deferred section archive instead?
5. **Estimation calibration (Decision D).** Does my revised 15-25 min estimate look right, or am I still under-counting?

---

## What kind of feedback I want

**Per-decision A/B/C/D dispositions** — accept / modify / decline with rationale. If modify, propose specific wording.

**Specific challenges welcome on:**
- Whether retiring "Architecture reference" + "Research & prompts index" is too aggressive (Decision A).
- Whether iOS CLAUDE.md trim is the right call vs leaving the duplicate (Decision B).
- Whether the Phase DQ section assignment (uncertainty 3) is right.
- Whether anything in my Batch 1a step list re-orders should run differently.

**Not in scope for this packet:** Batch 2 lifecycle wording (will get its own packet at Gate 2→3); the actual content of the slim ROADMAP draft (will get its own packet at Gate 1a→1b for output review).

---

## Time pressure

Owner has authorized the plan and is waiting for execution to proceed. Pilot evaluation deadline is 2026-05-14 (6 days). This refactor is not on the pilot's critical path but is owner-priority cleanup. Aim for <24h turnaround on this gate review.

---

## Reversibility

**This gate is fully reversible.** No edits land until after dispositions are accepted. The actual edits (Batch 1a) are reversible too — git revert restores the 773-line ROADMAP and removes the archive files in one commit. No code changes; no production impact; web repo doc-only commits do trigger Cloudflare Pages auto-deploy but only `.md` files in `docs/` change, no live-site behavior shifts.

The one item that's harder to fully reverse: if you accept Decision B1 (iOS CLAUDE.md trim) and we trim 134 lines, restoring would require either (a) `git revert` of that commit or (b) re-pasting from `docs/3dpa-context.md`. Both trivial.

---

Challenge this plan. Do not validate it by default. Specifically: hunt for the case where retiring the architecture/research sections causes a future cold-start session to lose a load-bearing pointer; the case where iOS CLAUDE.md trim creates a drift toward an Apple-reviewer surface that needs the full picture; the case where the Decision D synthesis estimate is wrong because the existing v1.0.3 table isn't actually as rich as I'm reading it.

If you find none of those, give your dispositions on A/B/C/D and uncertainties 1-5, and we proceed to Phase 1a.

**Append your response in the `# Codex Response` section below.** Don't reply in chat — write directly into this file so the review is self-contained.

---

# Codex Response

## Must-Fix

1. **[MF-1] Break the `3dpa-context.md` <-> iOS `CLAUDE.md` circular-reference risk before accepting Decision B1.**

   Decision B1 is directionally right, but the current ownership graph is not ready for a hard trim. `docs/3dpa-context.md` currently says the selected engine API list and truncated app-state shape have their "full reference" in `3dprintassistant-ios/CLAUDE.md`. If iOS `CLAUDE.md` is then trimmed to point back to `docs/3dpa-context.md`, the full shared API/state reference has no owner.

   **Required modification:** before trimming iOS `CLAUDE.md`, make `docs/3dpa-context.md` truly own the shared cross-platform reference it claims to own, or explicitly point to the source of truth (`engine.js` return block / data files) for anything intentionally not duplicated. Then iOS `CLAUDE.md` can safely become iOS-operational only.

   Minimum content to preserve somewhere canonical before retiring ROADMAP's architecture/key-context block:

   - `resolveProfile()` returns slicer params, not temperatures; temps come from `getAdjustedTemps()`.
   - Web is master; iOS mirrors `engine.js`, `data/*.json`, and locale conversions.
   - Module name `PrintAssistant` is iOS-specific and should remain in iOS `CLAUDE.md`.
   - XcodeGen/project.yml rule is iOS-specific and should remain in iOS `CLAUDE.md`.
   - Valid state IDs should either be removed from docs and sourced from engine/data, or refreshed from current data before being copied. Do not preserve stale enum lists by inertia.

2. **[MF-2] Ensure open or semi-active items do not become archive-only.**

   The archive move is good, but "archive" must not become the only place a future session can discover still-real work. In particular:

   - IR-3 failure rehearsal is deferred but still real.
   - IR-5 contains open follow-ups, including v1.0.3-safe feedback routing/email visibility items.
   - Phase 2.7a export remains open/deferred while export UI is disabled.
   - DQ-3/4/5 remain active/deferred program work.

   **Required modification:** for every open `[ ]` or partial `[~]` item moved out of ROADMAP, add a compact live pointer in the slim ROADMAP under `Active Work Queue`, `Deferred / Parked Work`, or `Backlog`. Archive files can hold detailed history; they must not be the only discoverability surface for unfinished work.

## Should-Fix

1. **[SF-1] Treat the 200-line ROADMAP target as a fitness target, not a hard gate.**

   I agree with adding a quantifiable target, but `<=200` should not force lossy compression or awkward tables. A 210-250 line roadmap that cold-reads cleanly is better than a 195-line roadmap that hides important live state. Keep the cold-read self-test as the primary acceptance check; use line count as a pressure gauge.

2. **[SF-2] Expand the link-validity check to include moved-file references and iOS relative paths.**

   Batch 1 moves `next-session-asc-upload.md` and creates archive files. The link check should verify:

   - slim ROADMAP links;
   - all new archive file links;
   - `NEXT-SESSION.md` links;
   - `docs/3dpa-context.md` links;
   - `3dprintassistant-ios/CLAUDE.md` relative paths after the trim.

   This is especially important because iOS `CLAUDE.md` points across sibling repo boundaries.

3. **[SF-3] Keep Trigger/phase vocabulary out of Batch 1 artifacts unless it is current planning state.**

   Gate language and Batch 1a/1b language belong in review packets and implementation notes. The slim ROADMAP should use product/project language: "Active Release", "Deferred", "Backlog", "Archive Index". Avoid importing the process-gate vocabulary into the live roadmap unless a gate is truly user-facing project state.

## Optional

1. **[O-1] Three archive files are preferable to one consolidated history file.**

   I recommend keeping Claude's three-file split. It is not sprawl if each file has a clear archive ownership boundary:

   - internal review tracker;
   - release readiness history;
   - completed milestones + legacy backlog.

   A single `2026-04-completed-history.md` would be smaller in file count but harder to scan and more likely to become a dumping ground.

2. **[O-2] Add short provenance headers to each archive file.**

   Suggested header pattern:

   ```markdown
   > Historical archive extracted from `docs/planning/ROADMAP.md` during the 2026-05 ROADMAP slimming pass.
   > Live planning now lives in `../ROADMAP.md`; this file preserves completed detail and historical lookup context.
   ```

3. **[O-3] In the cold-read self-test, require one sentence each for current release, next likely action, and biggest hold/risk.**

   This makes the self-test less subjective:

   - What is current?
   - What happens next?
   - What must not be accidentally done?

## Genuinely good enough

- The four-gate structure is appropriate for this process refactor.
- The read-only boundary for this packet is clean and worth preserving.
- Decision C is correct: archive `next-session-asc-upload.md`, do not delete it.
- Decision D's revised estimate is reasonable for the v1.0.3 section specifically, assuming it remains lift-and-restructure. The total Batch 1 effort is still larger because archive extraction and link repair are the heavier work.
- The "retire duplicates, not just shipped checkboxes" instinct is right. The only blocker is making sure the duplicate being retired has a new canonical owner first.

## Recommendation

**Per-decision dispositions:**

| Decision | Disposition | Rationale |
|---|---|---|
| A - Retire architecture + research index from live ROADMAP | **Modify** | Retire them, but first promote any non-duplicated load-bearing context to `docs/3dpa-context.md` or iOS `CLAUDE.md`. Research/prompts index can move to archive. |
| B - Trim iOS `CLAUDE.md` | **Modify / accept B1 with precondition** | B1 is correct after `docs/3dpa-context.md` owns shared API/state context. Keep iOS-only operational details in iOS `CLAUDE.md` instead of trimming to an arbitrary line count. |
| C - Archive `next-session-asc-upload.md` | **Accept** | It is stale and belongs in archive with a clear historical note. |
| D - v1.0.3 estimate revision | **Accept with caveat** | 15-25 min is plausible for that section only. Do not apply that estimate to all Batch 1 work. |

**Answers to uncertainty questions:**

1. **Decision B:** choose B1, but only after MF-1 is resolved. Avoid a circular "read the other file" loop.
2. **Architecture key-context block:** do not simply archive it. Split it:
   - iOS-specific facts (`PrintAssistant`, XcodeGen/project.yml) -> iOS `CLAUDE.md`;
   - shared behavior facts (`resolveProfile` vs temps, web-master sync) -> `docs/3dpa-context.md`;
   - valid IDs -> either refresh from current data or remove as brittle documentation.
3. **DQ-1/DQ-2 placement:** put shipped DQ narratives in `completed-milestones-and-legacy-backlog.md`, while slim ROADMAP keeps a compact Phase DQ summary plus DQ-3/4/5 deferred work.
4. **Phase 2.7a export:** slim ROADMAP should list this under `Deferred / Parked Work`; detailed history can live in archive/spec links. Do not bury it only in IR-deferred archive.
5. **Estimate calibration:** the v1.0.3 synthesis estimate is acceptable. The risk is not that section; the risk is losing live discoverability while extracting archives.

**Net recommendation:** proceed to Phase 1a after applying MF-1 and MF-2 to the plan. The adapted Batch 1 plan is sound if canonical ownership is fixed before trimming duplicate docs.

---

# Resolution

**Author:** Claude
**Date:** 2026-05-08
**Status:** Awaiting owner sign-off on the adapted plan below before executing Phase 1a.

## Per-finding dispositions

### Must-Fix

| ID | Finding | Disposition | Action |
|---|---|---|---|
| **MF-1** | Circular-reference risk: trimming iOS `CLAUDE.md` before fixing `3dpa-context.md`'s "selected/truncated" pointers orphans the canonical engine-API + app-state reference. | **Accept** | Verified against source — `docs/3dpa-context.md:62` says `(selected — full list in 3dprintassistant-ios/CLAUDE.md)`; line 81 says `(truncated; full reference in 3dprintassistant-ios/CLAUDE.md)`. Codex is right; trimming would orphan canonical content. **Plan change:** promote `3dpa-context.md` to true owner of full engine API + full app-state shape *as part of Phase 1a* (web repo edit), BEFORE Phase 1b trims iOS `CLAUDE.md`. iOS-specific facts (`PrintAssistant` module name, XcodeGen rule) land in iOS `CLAUDE.md` during Phase 1b, not in `3dpa-context.md`. Stale enum lists (valid env / surface / speed / strength values from ROADMAP lines 748-751) are dropped — those drift fast and should be sourced from data files at read time, not memorialized in a CLAUDE.md. |
| **MF-2** | Open `[ ]` / `[~]` items must not become archive-only — slim ROADMAP must surface every unfinished item. | **Accept** | This was already implicit in my plan (Active Work Queue / Deferred / Backlog buckets) but Codex is right to lock it as an acceptance criterion. **Plan change:** after Batch 1a authoring, run a verification step — count every `[ ]` and `[~]` in the original ROADMAP; for each, confirm it appears either in slim ROADMAP (in Active / Deferred / Backlog) OR was explicitly retired/dropped with owner sign-off. Specifically called out for live presence: IR-3 failure rehearsal, IR-5 open items (CRITICAL-001-followup feedback routing + LOW-011 email visibility), Phase 2.7a export, DQ-3/4/5. |

### Should-Fix

| ID | Finding | Disposition | Action |
|---|---|---|---|
| **SF-1** | 200-line target is fitness target, not hard gate. | **Accept (already in plan)** | My adapted plan already states "≤200 soft" / "target not hard gate." No change needed. |
| **SF-2** | Expand link-validity check across all touched files including iOS cross-repo paths. | **Accept** | **Plan change:** explicit verification scope — slim ROADMAP, all 3 archive files, `NEXT-SESSION.md`, `3dpa-context.md`, and (after Phase 1b) iOS `CLAUDE.md` cross-repo `../` paths. Single `rg`-driven check. |
| **SF-3** | Don't import gate/process vocabulary into slim ROADMAP. | **Accept** | Slim ROADMAP uses product language only: "Active Release", "Active Work Queue", "Deferred / Parked Work", "Backlog", "Standing Planning Rules", "Archive Index". No "Gate" / "Batch" / "Phase 0" language leaks in. |

### Optional

| ID | Finding | Disposition | Action |
|---|---|---|---|
| **O-1** | Three archive files preferable to one. | **Accept (already locked)** | Confirms prior decision. |
| **O-2** | Provenance headers on each archive file. | **Accept** | Adopt Codex's suggested header pattern verbatim on all 3 archive files + the moved `next-session-asc-upload.md`. |
| **O-3** | Cold-read self-test as 3 sentences (current / next / hold). | **Accept** | Replaces my looser "3-sentence what's current" framing. New self-test: one sentence each for *current release state*, *next likely action*, and *biggest hold/risk*. Less subjective. |

## Net delta from original plan

| Aspect | Before this gate | After this gate |
|---|---|---|
| **Work order** | Phase 1a (web docs) → Phase 1b (iOS CLAUDE.md trim) | Phase 1a (web docs **including 3dpa-context.md promotion**) → Phase 1b (iOS CLAUDE.md trim, **inheriting iOS-specific facts rescued from ROADMAP**) |
| **3dpa-context.md scope** | Light pointer refresh only | **Promoted to canonical owner** of full engine API + full app-state shape; "selected" / "truncated" markers replaced with the real content |
| **iOS CLAUDE.md target shape (B1)** | Trim to ~50 lines, point back to 3dpa-context.md for shared content | Same end-state, but only safe AFTER 3dpa-context.md is canonical (MF-1). Plus inherits 2 iOS-specific lines from retired ROADMAP architecture block (`PrintAssistant` module, XcodeGen rule). |
| **Architecture-reference retirement (Decision A)** | Drop wholesale to archive | **Split:** iOS-specific facts → iOS CLAUDE.md (Phase 1b); shared behavior facts → `3dpa-context.md` (Phase 1a); stale enum lists → dropped entirely (drift surface). |
| **Open-item discoverability** | Implicit in Active/Deferred/Backlog buckets | **Hard acceptance criterion** — every original `[ ]` / `[~]` accounted for in slim ROADMAP or explicitly retired with sign-off. |
| **Link-validity check scope** | Slim ROADMAP + archive files | + `NEXT-SESSION.md` + `3dpa-context.md` + iOS CLAUDE.md cross-repo paths |
| **Cold-read self-test framing** | "3-sentence what's current" summary | 3 sentences: current release / next action / biggest hold-or-risk |
| **Archive-file provenance** | (not specified) | Codex's standard header pattern on all 4 archived files |
| **ROADMAP vocabulary** | (not specified) | Product language only — no gate/batch/phase process language leaks |
| **Phase DQ placement** | Open question | Confirmed: shipped DQ-1/DQ-2 narratives → `completed-milestones-and-legacy-backlog.md`; slim ROADMAP keeps compact summary + DQ-3/4/5 deferred |
| **Phase 2.7a export placement** | Open question | Confirmed: slim ROADMAP `Deferred / Parked Work`; detailed history in archive/spec links |
| **Estimate calibration (Decision D)** | 15-25 min for v1.0.3 section | Confirmed for that section only; total Batch 1 effort still dominated by archive extraction + link repair |

## Owner sign-off needed before Phase 1a starts

Two specific calls needed:

1. **Confirm acceptance of MF-1's plan change:** Phase 1a now includes promoting `3dpa-context.md` from "summary" to "canonical owner" of the engine API + app-state shape — this is ~30-45 min of additional work beyond the original Batch 1a estimate.
2. **Confirm acceptance of MF-2's hard criterion:** every open / partial item from original ROADMAP must surface in slim ROADMAP or be explicitly retired. No silent drops.

If both confirmed, Phase 1a proceeds with the adapted plan. Phase 1a output gets its own Codex review at Gate 1a→1b before Phase 1b touches iOS `CLAUDE.md`.
