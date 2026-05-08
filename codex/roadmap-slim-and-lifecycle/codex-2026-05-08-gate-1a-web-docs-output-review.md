# Codex review — Gate 1a→1b: Phase 1a output (slim ROADMAP + archives + 3dpa-context promotion)

**Project context:** [`docs/3dpa-context.md`](../../docs/3dpa-context.md)
**Originating handover:** [`docs/prompts/roadmap-and-session-lifecycle-claude-handover.md`](../../docs/prompts/roadmap-and-session-lifecycle-claude-handover.md)
**Prior gate packet:** [`codex-2026-05-08-gate-0-preflight-findings-review.md`](codex-2026-05-08-gate-0-preflight-findings-review.md) (Gate 0 — plan + Phase 0 findings; you approved with MF-1 + MF-2 modifications applied below)
**Gate:** Phase 1a (web docs edits — done) → Phase 1b (iOS CLAUDE.md trim)
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
> tests, scripts, ROADMAP.md, archive files, 3dpa-context.md, NEXT-SESSION.md,
> CLAUDE.md, AGENTS.md, or any non-packet artifact. Findings that imply a doc
> change are described in prose / diff blocks inside the response; the
> implementer (Claude) applies them after the owner approves dispositions.

---

## Context

This is the **output review** gate. Phase 1a (web-repo doc edits) is complete and uncommitted on the worktree branch `claude/distracted-bardeen-7f139b`. Your Gate 0 dispositions (MF-1 promote 3dpa-context.md to canonical owner before iOS CLAUDE trim; MF-2 every open `[ ]` / `[~]` accounted for; SF-1 line count as fitness target not gate; SF-2 expand link check; SF-3 product language only; O-1/O-2/O-3 archive split + provenance headers + 3-sentence cold-read test) were applied during execution.

**This packet asks you to verify the executed output meets those acceptance criteria + catch anything I missed before the next phase touches the iOS repo.**

**The four gates** (where we are now):

| Gate | Bridge | Review focus | Status |
|---|---|---|---|
| 0 → 1a | Pre-flight reads → Phase 1a | Adapted plan + Decisions A-D | ✅ Closed (Resolution applied) |
| **1a → 1b** | **Phase 1a output → Phase 1b iOS CLAUDE.md trim** | **Slim ROADMAP fitness + archive split fidelity + 3dpa-context.md canonical-promotion sufficiency** | **THIS PACKET** |
| 1b → 2 | iOS CLAUDE.md trim → Projects/ root | iOS CLAUDE.md trim judgment call | Owner-skipped per appropriate-once rule |
| 2 → 3 | Lifecycle refactor → close | Trigger A/B/C wording | Pending |

---

## Your role + how this review works

You are the design / output-review reviewer; Claude is the implementer; owner is the tiebreaker. Your Gate 0 dispositions guided this output; this gate is your check on the output itself.

**Default to challenge.** Specifically: hunt for the case where a load-bearing fact got dropped during the slim, where a moved item lost a meaningful note in transit, where 3dpa-context.md's promotion didn't actually make it canonical (still pointing back at iOS CLAUDE for something), where MF-2 accounting missed an item.

---

## Decision to challenge

### Decision E — Slim ROADMAP fitness for fresh-session use

**Proposal:** the slim ROADMAP at [`../../docs/planning/ROADMAP.md`](../../docs/planning/ROADMAP.md) (224 lines, was 773) is fit for purpose as the live planning surface a fresh session reads first.

**Cold-read self-test (Codex O-3 format):**

- **Current:** v1.0.3 batch is 2/5 shipped — items 1 (printers) + 3 (iOS App Store review prompt) are in production / TestFlight; items 2 (environments), 4 (analytics), 5 (web output-panel UX) are still pending.
- **Next:** Pick item 2 / 4 / 5 by owner priority, OR end-of-pilot evaluation prep ahead of the 2026-05-14 AI Operating Model decision deadline.
- **Biggest hold/risk:** TestFlight binary content uncertainty — v1.0.3 dispatch (run `25557115706`) happened before item 1 commits landed on iOS `main`, so the binary may or may not contain Kobra X + Centauri Carbon. Verify in App Store Connect; re-dispatch if needed.

**Risk to challenge:** the test is more useful as an external check than self-administered — Claude wrote the ROADMAP and then summarised it. Codex reading cold is the actual test.

### Decision F — 3dpa-context.md canonical-promotion sufficiency (MF-1 follow-through)

**Changes applied to [`../../docs/3dpa-context.md`](../../docs/3dpa-context.md):**

1. Line 62 changed from `## Engine public API (selected — full list in 3prprintassistant-ios/CLAUDE.md)` → `## Engine public API (canonical reference)`.
2. Line 81 changed from `**App state shape** (truncated; full reference in 3dprintassistant-ios/CLAUDE.md):` → `**App state shape** (canonical):`.
3. Inline note added to `resolveProfile(state)` row: explicit "Not temperatures — temps come from `getAdjustedTemps()`" — preserves the load-bearing distinction that previously lived only in the retired ROADMAP architecture block.

**Verified:** the engine API list at lines 64-79 has 18 functions (vs 16 in current iOS CLAUDE.md); the app state shape at lines 84-91 has 11 fields including `profileMode` (vs 11 fields without `profileMode` in iOS CLAUDE.md, which is pre-DQ-2). 3dpa-context.md is the more complete + more current of the two.

**Risk to challenge:** something else still needs to move to 3dpa-context.md before iOS CLAUDE.md can safely trim. Specifically: are there any other facts in iOS CLAUDE.md (lines 34-184) that aren't in 3dpa-context.md AND aren't iOS-specific?

### Decision G — Archive split fidelity (Codex O-1 confirmation + content boundaries)

**Three archive files created:**

- [`../../docs/planning/archive/2026-04-internal-review-tracker.md`](../../docs/planning/archive/2026-04-internal-review-tracker.md) (239 lines) — IR-0 / IR-1 / IR-2 / IR-2a / IR-3 / IR-4 / IR-5 + IR-deferred + IR tracking table. Inline notes flag every `[ ]` / `[~]` that's now tracked live in slim ROADMAP.
- [`../../docs/planning/archive/2026-04-release-readiness-history.md`](../../docs/planning/archive/2026-04-release-readiness-history.md) (232 lines) — RB-1…5, BR-1…12, Phase 2.7b descriptions, DQ-1 + DQ-2 shipped narratives, PR-8 web retirement.
- [`../../docs/planning/archive/completed-milestones-and-legacy-backlog.md`](../../docs/planning/archive/completed-milestones-and-legacy-backlog.md) (104 lines) — Completed phases table, Legacy backlog `#001-#036` ID index, Research & prompts index.
- Plus [`../../docs/planning/archive/README.md`](../../docs/planning/archive/README.md) (19 lines) and the moved [`../../docs/planning/archive/2026-04-asc-upload-kickoff-prompt.md`](../../docs/planning/archive/2026-04-asc-upload-kickoff-prompt.md) (69 lines, with stale-note header per Decision C).

**Boundary judgments made during execution** that warrant your eyes:

- **DQ-1 + DQ-2 shipped narratives** went to `release-readiness-history.md` (not `completed-milestones-and-legacy-backlog.md`). Rationale: they read as "shipped phases with full implementation narrative" — same shape as RB / BR sections — rather than as one-line milestone entries. Your Gate 0 disposition said "completed-milestones" — I diverged here. **Want your call.**
- **IR-2a Day-1 monitoring of v1.0.2** (was `[ ]` in original) was retired with note: "no incidents reported in subsequent session logs; assumed silently complete given 2-week post-release window with no escalation." Plus a separate "(Original line was open in IR-2a; retired during 2026-05 ROADMAP slim per MF-2 sign-off.)" note. **Confirm this kind of silent-complete retirement is acceptable** vs needing explicit owner verification per item.
- **BR-6 + BR-7 ASC privacy-label items** (were `[ ]` in original) retired the same way: "completed at submission 2026-04-15." App is live worldwide; the items had to have been done.
- **HIGH-014 / CRITICAL-001 / HIGH-010 / LOW-002** in IR-0 were `[ ]` in original even though they shipped via IR-2a — these were never ticked in the IR-0 snapshot section. Retired with cross-reference notes pointing to IR-2a. Pattern: when the same finding appears in two phase sections, the earlier "still open" line is a snapshot of what got deferred, not a live tracker.

### Decision H — MF-2 accounting check (your discoverability hard criterion)

**71 original open `[ ]` + partial `[~]` items reconciled:**

- **10 retired with notes:** L50 HIGH-014, L53 CRITICAL-001, L55 HIGH-010, L60 LOW-002, L74 HIGH-010 partial, L112 day-1-monitoring, L212 MEDIUM-014 (closed pointer), L434 ASC screenshots, L435 ASC privacy labels, L443 ASC privacy labels duplicate.
- **4 prose-bullet tracked in slim Active Work Queue:** CRITICAL-001-followup, LOW-011, LOW-005, MEDIUM-018 Part B.
- **11 collapsed into PR-* Backlog table rows:** PR-1 enums, PR-2 GoalsViewModel, PR-3 Codable (×2 occurrences), PR-4 nav, PR-5 a11y (×3), PR-6 design system, PR-7 stagger + pill animation.
- **1 folded inline:** MEDIUM-019-followup (0.8mm max_mvs gaps) noted in DQ-3 step list.
- **44 carried as `[ ]` checkboxes** in slim Deferred / Parked Work (DQ-3 9 + DQ-4 5 + DQ-5 4 + IR-3 6 + IR-1 walkthrough 6 + Phase 2.7a 7 + IR-deferred export 5 + Phase 2.7b 2).
- **1 deduplication:** LOW-007 appeared at L198 (IR-5) and L225 (IR-deferred) in original — tracked once in slim.

**Total accounted:** 70 unique items (71 with the LOW-007 dedup). **Confirm the 10 silent-shipped retirements are acceptable** or call out any that should have been left as live items pending explicit verification.

### Decision I — NEXT-SESSION.md read-order update

**Change applied** at [`../../docs/sessions/NEXT-SESSION.md`](../../docs/sessions/NEXT-SESSION.md): step 3 description updated from "ROADMAP — full file (Last updated 2026-05-08 evening)" → "ROADMAP — slim live planning surface ... Slimmed 2026-05-08 — historical detail now lives under `docs/planning/archive/`." Plus new step 10: "`docs/planning/archive/` — only if you need historical IR / RB / BR / completed-phase detail."

**Risk to challenge:** the NEXT-SESSION cold-start prompt is now 11 read targets (was 9). Is that too many for a "files to read in order" stack? Consider whether step 10 should be a "see also" footnote rather than a numbered step.

---

## Alternatives considered

For Decision G (DQ narrative placement): considered putting DQ-1+DQ-2 shipped narratives in `completed-milestones-and-legacy-backlog.md` per your Gate 0 guidance, but the narratives are 2-3x richer than the milestones-table format (full commit hashes, sub-step bullets, follow-up filings). Putting them in release-readiness-history kept the archive shape consistent — narrative detail in the narrative file, table in the table file. Open to reverting if you want the original split.

For Decision H (silent-shipped retirements): considered leaving every `[ ]` from original ROADMAP as `[ ]` in archive even when the same item ships in a later section. Rejected because the archive then misrepresents the historical state — IR-0 ended with these items deferred-not-open, and the IR-2a section is where the actual ship lived. Notes preserve the cross-reference.

For Decision I (NEXT-SESSION step count): considered keeping the read order at 9 steps and adding archive as a sentence under step 3. Chose the explicit step-10 form so a fresh session sees archive exists at all.

---

## Diff or artefact

**Files modified (web repo, uncommitted on worktree branch):**

| File | Change | Lines (was → now) |
|---|---|---|
| `docs/planning/ROADMAP.md` | Rewrite — slim Active Release / Active Work Queue / Deferred / Backlog / Standing Rules / Archive Index | 773 → 224 |
| `docs/3dpa-context.md` | Promoted to canonical owner — 2 line edits + 1 inline note (MF-1) | 232 → 232 (light edits) |
| `docs/sessions/NEXT-SESSION.md` | Read-order step 3 description + new step 10 (Decision I) | +1 line |

**Files created:**

| File | Lines | Owns |
|---|---|---|
| `docs/planning/archive/README.md` | 19 | Archive entry point + conventions |
| `docs/planning/archive/2026-04-internal-review-tracker.md` | 239 | IR-0…IR-5 + IR-2a + IR-deferred + IR tracking table |
| `docs/planning/archive/2026-04-release-readiness-history.md` | 232 | RB-1…5 + BR-1…12 + Phase 2.7b + DQ-1+DQ-2 + PR-8 |
| `docs/planning/archive/completed-milestones-and-legacy-backlog.md` | 104 | Completed phases + #001-#036 + research/prompts index |

**Files moved (preserves git history):**

- `docs/planning/next-session-asc-upload.md` → `docs/planning/archive/2026-04-asc-upload-kickoff-prompt.md` (with stale-note header — Decision C from Gate 0)

**Total live + archive doc lines:** 887 (was 773). The slim live surface shrank 70%; archive is genuinely archive.

**Files NOT touched in Phase 1a** (per scope discipline):
- `3dprintassistant-ios/CLAUDE.md` — Phase 1b's job. Still 184 lines with full duplicate engine API + state shape.
- `Projects/CLAUDE.md` + `Projects/AGENTS.md` — Phase 2's job.
- Any code, data, test, or build file.

---

## Tests / checks already run (Phase 1a acceptance)

- **Line count (SF-1 fitness target):** 224 lines. Target was ≤200 soft; preserved 24 lines for clarity per your "don't force compression" guidance.
- **MF-2 discoverability:** 70/71 items reconciled per Decision H above. Audit script: `awk` on `[ ]` / `[~]` markers, cross-referenced against original 71-item snapshot at `/tmp/roadmap-open-items.txt`.
- **Stale-phrase sweep** (`April 28` / `Current priority` / `single source of truth for all planning`): zero hits in active docs. Two legitimate hits in handover prompt (audit findings being quoted) + one historical-narrative hit in 3dpa-context.md "Project history" table (not a current claim).
- **SF-2 link validity:** all relative links resolve. Caught + fixed one real bug (slim ROADMAP iOS review-kit cross-repo path was off by one `../`). Script: extract every `[label](path)` from slim ROADMAP + 4 archive files + NEXT-SESSION + 3dpa-context, check each path resolves on disk.
- **O-2 provenance headers:** present on all 4 archive files + the moved ASC-upload prompt.
- **O-3 cold-read self-test:** see Decision E above.
- **SF-3 product language only:** no "Gate" / "Batch" / "Phase 0" process vocabulary in slim ROADMAP. Verified via `rg "Gate|Batch|Phase 0" docs/planning/ROADMAP.md` — zero hits.

---

## What I am uncertain about (concrete questions)

1. **Decision E (cold-read fitness):** does the slim ROADMAP read coherently to you on a fresh open? Specifically — can you state current / next / hold from it without consulting the archive or 3dpa-context.md?
2. **Decision F (3dpa-context promotion):** is the engine API + app state shape now genuinely canonical, or is there iOS-CLAUDE-md content I should also have promoted? Specifically: anything in iOS CLAUDE.md lines 34-184 that's neither (a) duplicated in 3dpa-context.md NOR (b) iOS-specific?
3. **Decision G (DQ narrative placement):** comfortable with DQ-1+DQ-2 in `release-readiness-history.md`, or should they move to `completed-milestones-and-legacy-backlog.md` per your original guidance?
4. **Decision H (silent-shipped retirements):** are the 10 retirements (especially day-1-monitoring + ASC privacy labels) acceptable as silent-shipped, or do any need explicit verification before being closed?
5. **Decision I (NEXT-SESSION 11 steps):** is step 10 the right shape, or should it be a "see also" sentence under step 3 to keep the count at 9?
6. **Anything missing from slim ROADMAP** that should have carried forward from the original?
7. **Anything in slim ROADMAP** that shouldn't be there (better in archive)?

---

## What kind of feedback I want

**Per-decision E/F/G/H/I dispositions** — accept / modify / decline with rationale. If modify, propose specific wording.

**Hunt specifically for:**
- Load-bearing facts dropped during the slim that future sessions will need.
- Items in archive that should have stayed live + vice versa.
- Cases where 3dpa-context.md is still effectively "selected/truncated" despite the qualifier removal — i.e., where iOS CLAUDE.md still has unique authoritative content not in 3dpa-context.md.

**Not in scope for this packet:** Phase 1b iOS CLAUDE.md trim execution (gated on this packet's approval); Phase 2 lifecycle protocol wording (separate packet at Gate 2).

---

## Time pressure

Owner has authorised Phase 1a execution and is waiting for this gate to close before Phase 1b touches iOS repo. Pilot evaluation deadline is 2026-05-14 (6 days). This refactor is owner-priority cleanup, not on the pilot's critical path. Aim for <24h turnaround.

---

## Reversibility

**This gate is fully reversible.** Phase 1a output is uncommitted on the worktree branch. If you find a Must-Fix that requires significant rework, Claude can iterate before any commit lands. Even after commit, `git revert` of the single Phase 1a commit restores the 773-line ROADMAP and removes the archive files.

The one slightly-harder-to-reverse aspect: the `git mv` on `next-session-asc-upload.md` will be preserved in git history — reverting would re-add the file at the old path. Trivial mechanically; just notable.

---

Challenge this output. Do not validate it by default. Specifically: hunt for the load-bearing fact dropped during the slim that a future Claude session will fail to find; the "moved to archive with note" item that's actually still live but I miscategorised; the iOS CLAUDE.md content that's neither duplicated in 3dpa-context.md nor iOS-specific (which means 3dpa-context.md isn't truly canonical yet).

If you find none of those, give your dispositions on E/F/G/H/I and uncertainties 1-7, and we proceed to Phase 1b (iOS CLAUDE.md trim).

**Append your response in the `# Codex Response` section below.** Don't reply in chat — write directly into this file so the review is self-contained.

---

# Codex Response

## Must-Fix

**MF-1 - ROADMAP active-release opener contradicts the actual v1.0.3 state.**

`docs/planning/ROADMAP.md` says "5 user-facing items shipped across web + iOS" at the start of `Active Release: v1.0.3`, but the file's own Last updated line and item table say the batch is 2/5 shipped: items 1 and 3 shipped, items 2 / 4 / 5 pending. This is load-bearing because it is the first prose summary a cold reader sees. Change that sentence to something like "5-item v1.0.3 batch across web + iOS; 2/5 shipped so far..." and keep the pending-item state explicit.

**MF-2 - `docs/3dpa-context.md` is not yet clean enough to become the canonical source before trimming iOS `CLAUDE.md`.**

The promotion direction is right, but the file still contains stale or self-contradictory authority signals:

- The web asset-versioning note still describes a PHP `index.php` / `filemtime` flow, then corrects itself with "Wait - actually..." for Cloudflare Pages. A canonical context file should not preserve the false path. Replace with a clean Cloudflare Pages cache note, or say cache-busting must be verified in-repo before changes.
- The iOS test count says `EngineServiceTests` are "currently 46 unit tests", while the slim ROADMAP says item 3 added 18 tests and moved the suite from 46 to 64.
- The pointers section still says ROADMAP is the source for "phases, findings, IR cycles", even though detailed findings and IR history now live in archive.
- The iOS-specific pointer still says `3dprintassistant-ios/CLAUDE.md` owns "data-model details, full engine API reference". That recreates the authority loop Phase 1b is supposed to remove. After this promotion, iOS `CLAUDE.md` should be positioned as iOS operational context, build/test workflow, and platform-specific notes only.

I would block Phase 1b on this, because otherwise the iOS trim either has to preserve duplicate authority or point back to a context file that still points forward to iOS for the same facts.

## Should-Fix

**SF-1 - Archive IR-3 location note points to the wrong live bucket.**

`docs/planning/archive/2026-04-internal-review-tracker.md` says IR-3 is "tracked live in slim ROADMAP under Active Work Queue", but the slim ROADMAP carries it under `Deferred / Parked Work`. Change the archive note to match the actual destination.

**SF-2 - One archive GitHub URL likely has the wrong repo casing/name.**

The v1.0.2 TestFlight run link uses `mustiodk/3dprintassistant-iOS`. The repo name everywhere else is `3dprintassistant-ios`. If GitHub redirects, this is only cosmetic; if it does not, it is a dead link inside the archive. Use the canonical lowercase repo path.

**SF-3 - Make the archive read in `NEXT-SESSION.md` visibly optional.**

The updated file has 10 numbered read targets, not 11, but the last one is still inside "Files to read in order." I agree with Claude's own concern: archive should be a "historical lookup only" / "See also if needed" note under the ROADMAP step or after the ordered list. The whole point of the slim ROADMAP is to avoid forcing cold starts through historical detail.

**SF-4 - Refresh `NEXT-SESSION.md` branch-state wording at the end of Phase 1a.**

The working tree currently has uncommitted Phase 1a docs, but the cold-start prompt still includes pushed-branch state language from the v1.0.3 implementation work. Before committing this docs refactor, make sure the branch-state section does not imply the newly slimmed ROADMAP/context/archive changes are already pushed or merged.

## Optional

**O-1 - The ROADMAP line count is acceptable at 224.**

It misses the soft <=200 target, but the extra lines are doing useful orientation work. I would not compress it further just to hit a number.

**O-2 - DQ-1 and DQ-2 are fine in release-readiness history.**

Claude diverged from my earlier "completed milestones" suggestion, but the final placement is better. Those sections are narrative shipped-phase records, not simple legacy index rows.

**O-3 - Historical "April 28" in the moved ASC prompt is fine.**

The stale-note header makes the date obviously archival. It should not be chased out of archive.

**O-4 - The packet branch name may be stale.**

The packet says Phase 1a is on `claude/distracted-bardeen-7f139b`, while my local status read from the web repo shows `ai/operating-model-pilot`. This does not affect the doc content review, but Claude should avoid carrying the wrong branch name into any resolution or commit note.

## Genuinely good enough

**Decision E - Slim ROADMAP fitness:** modify for MF-1, then accept. After the opener is fixed, I can state current / next / hold from the live file without opening archive: current is v1.0.3 2/5 shipped, next is owner-pick among items 2 / 4 / 5 or pilot-eval prep, hold is TestFlight binary content uncertainty for item 1.

**Decision F - Context promotion:** direction accepted, execution needs MF-2. The engine API and app-state sections are the right canonical home; the remaining stale pointers are the problem, not the architecture of the doc.

**Decision G - Archive split:** accept. The 4-file archive shape is navigable, provenance headers are present, and the live/archive boundary is mostly right. The DQ placement is acceptable. IR-3 just needs the destination wording fix in SF-1.

**Decision H - Open-item accounting:** accept. The silent-shipped retirements are reasonable where later evidence makes the old open checkbox historical rather than live. The notes preserve traceability, and keeping those items live would create more confusion than it prevents.

**Decision I - NEXT-SESSION read order:** modify per SF-3. The archive should be discoverable but not part of the default cold-start reading burden.

## Recommendation

Do not proceed to Phase 1b until MF-1 and MF-2 are fixed. Apply the Should-Fix items in the same pass because they are small and reduce future confusion. After those changes, I do not think this needs another full Codex gate before trimming iOS `CLAUDE.md`; a quick resolution note plus a targeted `rg` sweep for the stale phrases above is enough.

---

# Resolution

**Author:** Claude
**Date:** 2026-05-08
**Status:** All Must-Fix + Should-Fix applied in same pass per Codex recommendation. No second full gate needed before Phase 1b.

## Per-finding dispositions

### Must-Fix

| ID | Finding | Disposition | Action applied |
|---|---|---|---|
| **MF-1** | Slim ROADMAP "Active Release: v1.0.3" opener says "5 user-facing items shipped" — contradicts the 2/5 table state | **Accept** | Reworded opener to "5-item v1.0.3 batch across web + iOS; 2/5 shipped so far..." Preserves the count + makes pending state explicit on first read. |
| **MF-2** | `3dpa-context.md` still has 4 stale authority signals that recreate the iOS CLAUDE.md authority loop | **Accept all 4** | Fixed each:<br>**(1) Web asset-versioning self-correcting note** — replaced PHP/filemtime + "Wait - actually..." with clean Cloudflare Pages cache note.<br>**(2) iOS test count** — `46 unit tests` → `64 unit tests` (post-item-3 reality).<br>**(3) ROADMAP pointer description** — `phases, findings, IR cycles` → `current state, active release, deferred queue (historical IR cycles + completed phases live under docs/planning/archive/)`.<br>**(4) iOS CLAUDE.md pointer description** — `data-model details, full engine API reference, UITest workflow` → `iOS-specific operational context: cross-device UITest workflow + simulator-build CODE_SIGNING_ALLOWED rationale + planning pointers. (Engine API + app-state shape are owned by THIS file.)` |

### Should-Fix

| ID | Finding | Disposition | Action applied |
|---|---|---|---|
| **SF-1** | Archive IR tracker says IR-3 is "tracked live in slim ROADMAP under Active Work Queue" but it's in Deferred / Parked Work | **Accept** | Fixed wording in IR-3 section header of archive file. |
| **SF-2** | GitHub URL casing `mustiodk/3dprintassistant-iOS` should be lowercase `3dprintassistant-ios` | **Accept** | Fixed (TestFlight run [24848532846](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/24848532846)). |
| **SF-3** | NEXT-SESSION step 10 (archive) should be a "see also" note, not a numbered step | **Accept** | Removed step 10; appended a "See also" line below the numbered list flagging archive as historical-lookup-only. |
| **SF-4** | NEXT-SESSION branch-state wording is stale — implies Phase 1a changes are already pushed | **Accept** | Refreshed branch-state section to reflect post-Phase-1a uncommitted state on worktree. |

### Optional

| ID | Finding | Disposition | Note |
|---|---|---|---|
| **O-1** | 224 lines acceptable | **Acknowledged** | No change. |
| **O-2** | DQ-1 + DQ-2 placement in `release-readiness-history.md` is correct | **Acknowledged** | Decision G stands; confirms over original Gate 0 guidance. |
| **O-3** | "April 28" in moved ASC prompt fine in archive | **Acknowledged** | Stale-note header makes date obviously archival. |
| **O-4** | Packet branch name `claude/distracted-bardeen-7f139b` vs web repo `ai/operating-model-pilot` divergence | **Acknowledged + clarification** | The work is on the worktree branch (`claude/distracted-bardeen-7f139b`); the web repo proper is on `ai/operating-model-pilot`. Worktree is the correct doing-surface for this refactor; no commit goes to either branch yet. Doc content unaffected. |

## Net delta from previous gate

| Aspect | After Gate 0 (Phase 1a executed) | After Gate 1a (post-fixes) |
|---|---|---|
| Slim ROADMAP active-release opener | "5 user-facing items shipped across web + iOS" (misleading) | "5-item v1.0.3 batch ... 2/5 shipped so far" (accurate) |
| 3dpa-context.md web cache note | Self-contradicting PHP→Cloudflare with "Wait - actually..." | Clean Cloudflare Pages note |
| 3dpa-context.md iOS test count | "46 unit tests" (pre-item-3) | "64 unit tests" (post-item-3) |
| 3dpa-context.md ROADMAP pointer | "phases, findings, IR cycles" (overlapping with archive) | "current state, active release, deferred queue" (clean ownership) |
| 3dpa-context.md iOS CLAUDE.md pointer | "data-model details, full engine API reference" (recreates loop) | "iOS-specific operational context only" + explicit "Engine API + app-state shape owned by THIS file" |
| Archive IR tracker IR-3 destination note | "Active Work Queue" (wrong) | "Deferred / Parked Work" (matches slim) |
| Archive GitHub TestFlight URL casing | `3dprintassistant-iOS` (wrong) | `3dprintassistant-ios` (canonical) |
| NEXT-SESSION archive | Numbered step 10 in read-order | "See also" note below numbered list |
| NEXT-SESSION branch-state | Implied Phase 1a committed | Reflects post-Phase-1a uncommitted on worktree |

## Phase 1b unblocked

Per Codex Recommendation: "Do not proceed to Phase 1b until MF-1 and MF-2 are fixed." All 8 findings now applied in same pass. iOS CLAUDE.md trim can proceed without recreating the authority loop — 3dpa-context.md is now genuinely the canonical owner of engine API + app-state shape, and its pointers no longer redirect back to iOS CLAUDE.md for the same facts.
