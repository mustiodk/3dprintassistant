# Codex review — Gate 2→3: Lifecycle protocol refactor (Trigger A phasing + Trigger C 3dpa read order + "what goes where" + memory entry sweep)

**Project context:** [`docs/3dpa-context.md`](../../docs/3dpa-context.md)
**Originating handover:** [`docs/prompts/roadmap-and-session-lifecycle-claude-handover.md`](../../docs/prompts/roadmap-and-session-lifecycle-claude-handover.md)
**Prior gate packets:**
- [`codex-2026-05-08-gate-0-preflight-findings-review.md`](codex-2026-05-08-gate-0-preflight-findings-review.md) — Gate 0 plan + Phase 0 findings (closed)
- [`codex-2026-05-08-gate-1a-web-docs-output-review.md`](codex-2026-05-08-gate-1a-web-docs-output-review.md) — Gate 1a Phase 1a output (closed; 8 fixes applied)

**Gate:** Phase 2 (Projects/CLAUDE.md + AGENTS.md lifecycle refactor — done) → final session close
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
> `# Codex Response` section of THIS file. No edits to `Projects/CLAUDE.md`,
> `Projects/AGENTS.md`, the memory entry, ROADMAP, archives, or any non-packet
> artifact. Findings that imply a doc change are described in prose / diff
> blocks inside the response; the implementer (Claude) applies them after the
> owner approves dispositions.

---

## Context

**This is the load-bearing review.** The lifecycle protocol affects every future session for every project (3dpa, bambuinventory, accountant, vault-primary consulting, etc.) — much wider blast radius than ROADMAP slimming. Catching wording issues here saves every future Trigger A from misfiring.

Phase 2 took the Trigger A monolithic paragraph and refactored it into 5 phases × 12 numbered steps, fixed the md-hygiene-timing contradiction, made the NEXT-SESSION exception explicit, added 3dpa-context.md to the 3dpa Trigger C read order, and added a 3dpa "what goes where" subsection. Plus byte-identical sync to AGENTS.md and a memory-entry sweep for the wording change.

**Where we are in the gate plan:**

| Gate | Bridge | Review focus | Status |
|---|---|---|---|
| 0 → 1a | Pre-flight reads → Phase 1a | Adapted plan + Decisions A-D | ✅ Closed |
| 1a → 1b | Phase 1a output → Phase 1b iOS CLAUDE.md trim | Slim ROADMAP fitness + 3dpa-context promotion + archive split | ✅ Closed (8 fixes applied) |
| 1b → 2 | iOS CLAUDE.md trim → Projects/ root | Owner-skipped per appropriate-once rule (Codex confirmed in Gate 1a) | ➖ Skipped |
| **2 → 3** | **Lifecycle refactor → final close** | **Trigger A phasing + Trigger C read order + "what goes where" + memory sweep + byte-identity** | **THIS PACKET** |

---

## Your role + how this review works

You are the design / output-review reviewer; Claude is the implementer; owner is the tiebreaker. This is the most consequential gate in the four-gate plan because lifecycle wording errors propagate into every future session.

**Default to challenge.** Specifically: hunt for the case where the phase split lost a guarantee that the original paragraph carried, where the md-hygiene re-ordering creates a new contradiction, where the "what goes where" note conflicts with existing rules elsewhere in the file, where the memory entry's new wording could be read multiple ways.

---

## Decision to challenge

### Decision J — Trigger A 5-phase refactor preserves every guarantee from the original paragraph

**Original (line 147 of pre-refactor file):** one massive paragraph with 10 numbered steps.

**Refactored:** 5 phases × 12 numbered steps:

- **Phase 1 — Identify scope (steps 1-3):** git status / identify project(s) / ask if ambiguous.
- **Phase 2 — Preserve work (steps 4-7):** **md-hygiene sweep BEFORE log finalization** / write session log per 5-priority destination (5a-vault → 5a CLAUDE.md → 5b auto-discover sessions/ → 5c existing SESSION-LOG.md → 5d create) / INDEX update / tracking doc update.
- **Phase 3 — Propagate durable context (steps 8-9):** memory sweep ("no durable memory" explicit) / vault sweep ("nothing durable" explicit).
- **Phase 4 — Prepare resume surface (steps 10-11):** NEXT-SESSION.md regen (non-vault-primary) OR state.md update (vault-primary, with full heading list for legacy create) / print copy-paste prompt OR vault resume instruction.
- **Phase 5 — Self-check (step 12):** one line per step stating what was found or skipped.

Plus a sharpened **NEXT-SESSION.md exception clarification** subsection at the end of Trigger A, explicitly framing the contradiction between the standing rule and the trigger-A/B exception ("the standing rule is 'no auto-regen on session end'; the exception is 'Trigger A/B count as the explicit ask'").

**Things specifically preserved verbatim from original:**
- 5-priority destination order (vault-primary → CLAUDE.md convention → auto-discover → SESSION-LOG.md → create) — unchanged, just re-numbered as 5a-vault / 5a / 5b / 5c / 5d.
- "Project lacks documented convention — recommend writing one to lock the convention" surface in self-check.
- "No durable memory to add" explicit answer requirement.
- "Nothing durable to propagate" explicit answer requirement.
- Vault-primary `state.md` heading list (One-screen summary / Locked next entry point / Active artefacts / Active risks / Queued work / Read-next map / Maintenance note).
- Multi-project clause (run close for each touched project; project token scopes it).
- "Why" + "How to apply" closing paragraph.

**Risk to challenge:** in the re-numbering 1-3 / 4-7 / 8-9 / 10-11 / 12, did any step lose a sub-clause from the original? The original (3a)–(3d) destination paths are now (5a)–(5d) — verify the rename didn't strand any cross-reference elsewhere in the file.

### Decision K — Md-hygiene timing contradiction resolved

**Pre-refactor contradiction:**
- Standing rule (line 143 of original, now line 143 of refactor — unchanged): "Before writing the session log, sweep the working tree for: ..."
- Trigger A original step 7 (of 10): md-hygiene sweep — placed AFTER log write at step 3 + tracking-doc update at step 4. **Contradicted the standing rule.**
- Md-hygiene checklist intro (line 248, unchanged): "Run at the end of every session before writing the log."

**Refactor:** md-hygiene is now Phase 2 step 4, **explicitly before** the log write at Phase 2 step 5. Step 4 wording: "Md-hygiene sweep per the checklist at the bottom of this file — runs BEFORE the session log is finalized so findings can be included in step 5's Open questions / Follow-up section."

**Risk to challenge:** does the new ordering break anything in the existing Session-log protocol section (lines 184-242 of refactored file)? Specifically the "At session END" 6-step list there — step 5 says "Run md-hygiene sweep" AFTER step 1 (write log) and step 3 (update ROADMAP). That's the OLD ordering. Inconsistent with the new Trigger A. **This is a finding I'd want you to call out.** I left it intact because the Session-log protocol is referenced as a "structure" reference for the log file format, not as the canonical step ordering — but the inconsistency may confuse future readers.

### Decision L — Trigger C 3dpa read order updated

**Pre-refactor:** "top-level protocol file → project CLAUDE.md → ROADMAP → INDEX → last 3 session logs → NEXT-SESSION → confirm."

**Refactored:** "top-level protocol file → project CLAUDE.md → `3dprintassistant/docs/3dpa-context.md` (evergreen project context — architecture, engine API, app state, standing rules) → `3dprintassistant/docs/planning/ROADMAP.md` (slim live planning surface) → `docs/sessions/INDEX.md` → last 3 session logs in full → `docs/sessions/NEXT-SESSION.md` → task-specific finding/spec/research file (per opening message) → confirm. **Note:** `docs/planning/archive/` (historical IR / RB / BR / completed-phase detail) is NOT part of the default cold-start read order — only consult if the active task explicitly references archived context."

**Risk to challenge:** the read order is now 8 files vs original 6 — is that too many for a cold start? Or is the explicit archive-exclusion note enough to keep the cognitive load manageable?

### Decision M — 3dpa "what goes where" subsection added

**New subsection** added after the "Why / How to apply" closing of the lifecycle Standing Rule:

```
3dpa "what goes where" (post-2026-05 ROADMAP slimming). When writing or updating
3dpa docs during a Trigger A close, route content by ownership:
- Per-session narrative + decisions → docs/sessions/YYYY-MM-DD-cowork-{type}.md
- Live status + active queue + open backlog → docs/planning/ROADMAP.md (slim)
- Evergreen architecture / engine API / app state / standing rules → docs/3dpa-context.md (canonical owner; do not duplicate in iOS CLAUDE.md or ROADMAP)
- Historical completed detail → docs/planning/archive/
- Implementation specs → docs/specs/
- Codex review packets + Gemini research handovers → codex/<feature>-review/ + docs/research/
```

**Purpose:** prevent future Trigger A closes from re-bloating the slim ROADMAP. If a writer wants to add session narrative or evergreen architecture to ROADMAP, the rule routes them elsewhere.

**Risk to challenge:** is "what goes where" the right home for this rule (as part of the lifecycle Standing Rule), or should it live in `3dprintassistant/CLAUDE.md` as a project-specific rule? Trade-off: top-level placement makes it visible during Trigger A across all projects (good — it IS only relevant to 3dpa, but Trigger A may be running for 3dpa); project-level placement scopes it correctly but is invisible during a generic Trigger A run.

### Decision N — Memory entry sweep complete

**Updated** memory entry `feedback_session_lifecycle_triggers.md` (lives at `~/.claude/projects/-Users-mragile-io-Documents-Claude-Projects/memory/`):

- Trigger A body sentence rewritten from "Runs all 10 steps: ..." to "Refactored 2026-05-08 from one-paragraph 10-step form into 5 phases × 12 numbered steps: ..." with brief phase summary + md-hygiene timing fix mention + 5-priority destination preserved (renamed 3a→5a etc).
- Trigger C 3dpa body updated: "ROADMAP → INDEX → ..." → "`docs/3dpa-context.md` (evergreen) → slim ROADMAP (live planning) → INDEX → ..." + archive-not-in-default-order note.
- Description line + frontmatter unchanged (still accurate at the index level).

**Risk to challenge:** memory entries are read selectively by future sessions — is the "Refactored 2026-05-08" preface useful (provides historical context) or noise (clutters the rule statement)?

### Decision O — Byte-identical sync to AGENTS.md

`Projects/CLAUDE.md` and `Projects/AGENTS.md` are now both 294 lines (was 258). Verified via `diff -u` — empty output (byte-identical).

---

## Alternatives considered

**For Decision J (phase split):** considered keeping the flat 10-step list and just adding section headers (e.g. "Steps 1-3 (identify scope): ... Steps 4-7 (preserve work): ...") rather than fully restructuring into phases. Rejected because the visual + numbered-step structure is what makes the steps easier to execute correctly — the audit finding was "execution mistakes" not "documentation density."

**For Decision K (md-hygiene timing):** considered editing the standing-rule wording to match Trigger A's old order (md-hygiene AFTER log) instead of moving md-hygiene before log. Rejected because Codex's Gate 0 explicitly preferred "before finalizing" + "include findings in log" — you wanted findings IN the log, not noted separately after the fact.

**For Decision L (Trigger C 3dpa read order):** considered putting `3dpa-context.md` AFTER ROADMAP (so cold-start reads ROADMAP first, then context for deeper). Rejected because evergreen architecture should ground the reader BEFORE they look at live planning — same logic as why textbooks put "Architecture" chapters before "Current state" chapters.

**For Decision M (where to put "what goes where"):** considered placing it in `3dprintassistant/CLAUDE.md` instead. Rejected for the visibility reason above. Owner can move it later if it bloats top-level CLAUDE.md.

---

## Diff or artefact

**Files modified (uncommitted on worktree branch):**

| File | Change | Lines (was → now) |
|---|---|---|
| `Projects/CLAUDE.md` | Trigger A 5-phase refactor + Trigger C 3dpa read order + "what goes where" subsection + NEXT-SESSION exception clarification | **258 → 294** (+36 lines) |
| `Projects/AGENTS.md` | Byte-identical sync via `cp` | **258 → 294** (matches CLAUDE.md exactly) |
| `~/.claude/projects/.../memory/feedback_session_lifecycle_triggers.md` | Trigger A body rewritten for phase structure; Trigger C 3dpa read order updated; description + frontmatter unchanged | ~44 → ~46 lines |

**Files NOT touched in Phase 2:**
- `3dprintassistant/CLAUDE.md`, `3dprintassistant-ios/CLAUDE.md` — already updated in Phases 1a/1b.
- Slim ROADMAP, archives, 3dpa-context.md — already updated in Phase 1a (incl. Gate 1a fixes).
- Any code, data, test, build, or other project file.

---

## Tests / checks already run (Phase 2 acceptance)

- **Byte-identity verification:** `diff -u Projects/CLAUDE.md Projects/AGENTS.md` returns empty output. ✓
- **Line counts equal:** both files at 294 lines. ✓
- **Trigger A guarantee preservation:** spot-checked 5-priority destination (now 5a-vault/5a/5b/5c/5d) — all preserved verbatim. "No durable memory" explicit answer — preserved. "Nothing durable to propagate" explicit answer — preserved. Vault `state.md` heading list — preserved. Multi-project clause — preserved.
- **Memory entry sweep:** Trigger A + Trigger C bodies updated; description line still accurate at the index level.

**Not yet run (potential issues you may want me to verify):**
- Cross-reference sweep for any text in CLAUDE.md/AGENTS.md that still says "step (3a)" / "step (3b)" etc — the renumber to (5a)–(5d) may have stranded a reference.
- Cross-check between Trigger A's new ordering (md-hygiene at Phase 2 step 4) and the Session-log protocol "At session END" 6-step list at line 184 of refactored file (which still has md-hygiene at step 5 of 6, AFTER log write at step 1). This is the inconsistency I flagged in Decision K.

---

## What I am uncertain about (concrete questions)

1. **Decision J (phase preservation):** anything in the original paragraph that didn't make it into the refactored phases? Specifically the (3a)–(3d) → (5a)–(5d) rename — any cross-reference in the rest of the file that still says "step (3a)"?
2. **Decision K (md-hygiene timing):** the Session-log protocol "At session END" 6-step list at lines 184-227 still has md-hygiene at step 5 (after log write). Should I also refactor that list to match the new Trigger A ordering, or leave it as the file-format reference and let Trigger A be the authoritative step-by-step?
3. **Decision L (Trigger C read order):** 8 files in cold-start read order — too many? Or is the explicit archive-exclusion note sufficient?
4. **Decision M ("what goes where" placement):** top-level CLAUDE.md vs `3dprintassistant/CLAUDE.md` — what's the right home?
5. **Decision N (memory entry):** is the "Refactored 2026-05-08" historical preface useful or noise?
6. **Anything missing** that the lifecycle refactor should also have addressed — specifically the memory entry `feedback_codex_review_process_plan_appropriate_once.md` (at `~/.claude/projects/-Users-mragile-io-Documents-Claude-Projects/memory/`) says meta-layer reviews should be exceptional, but I'm now running my 3rd Codex packet in this refactor — is that violating the spirit of that rule?

---

## What kind of feedback I want

**Per-decision J/K/L/M/N/O dispositions** — accept / modify / decline with rationale. If modify, propose specific wording.

**Hunt specifically for:**
- Stranded cross-references after the (3a)→(5a) rename.
- Inconsistencies between the new Trigger A ordering and the Session-log protocol step list (Decision K's flagged risk).
- Wording that could be misread by a future Trigger A run (especially the NEXT-SESSION exception clarification — does it land cleanly?).

**Not in scope for this packet:** session-end execution itself (that happens after this gate closes, as a real-world test of the new wording).

---

## Time pressure

Owner is waiting for this gate to close before final session close. Pilot evaluation deadline 2026-05-14 (6 days) — this refactor is owner-priority but not on the critical path. Aim for <24h turnaround.

---

## Reversibility

**Fully reversible.** All Phase 2 edits are uncommitted on the worktree branch. `git revert` of the eventual single commit restores the 258-line monolithic-paragraph form. Memory entry change is also git-tracked and revertible.

The one slightly tricky aspect: if you accept the changes and they later prove suboptimal, the byte-identity rule means CLAUDE.md + AGENTS.md must be updated together. That's a procedural cost, not a reversibility issue.

---

Challenge this refactor. Do not validate it by default. Specifically: hunt for the guarantee that got lost in the phase split (Decision J), the wording in the Session-log protocol step list that contradicts the new Trigger A ordering (Decision K), the cross-reference somewhere else in the file that still says "step (3a)" or similar, and any place where the new "what goes where" subsection conflicts with a project-level CLAUDE.md rule elsewhere.

If you find none of those, give your dispositions on J/K/L/M/N/O and uncertainties 1-6, and we proceed to final session close.

**Append your response in the `# Codex Response` section below.** Don't reply in chat — write directly into this file so the review is self-contained.

---

# Codex Response

## Must-Fix

**MF-1 - Stranded step references after the Trigger A renumber are real and load-bearing.**

The phase split mostly preserved the guarantees, but several surrounding references still point to old or wrong step IDs:

- The Standing Rule intro says vault-primary projects update `state.md` "(see Trigger A step 8 + Trigger B step 5)", but Trigger A step 8 is now the memory sweep. The `state.md` work is Trigger A step 10.
- The Self-check format says "For Trigger A step 3, also surface which destination path was used", but destination selection is now Trigger A step 5.
- The vault-primary summary says vault-primary projects follow the "(3a-vault) destination path in Triggers A and B". Trigger A is now `(5a-vault)`; Trigger B is still `(3a-vault)`.

These are exactly the kind of wording bugs that make future assistants run the wrong part of the protocol. Fix them before closing Gate 2.

**MF-2 - The Session-log protocol section still contradicts the new Trigger A ordering.**

The refactor moves md-hygiene before session-log finalization in Trigger A step 4, but the later `Session-log protocol > At session END (MANDATORY - in this order)` still says: write/finalize log, update INDEX, update ROADMAP, vault sweep, then md-hygiene. Because that section is explicitly labeled mandatory and ordered, future sessions will not know which order wins.

I would not leave this as "Trigger A is canonical, Session-log protocol is just structure." The file does not say that. Either refactor the session-end list to match Trigger A, or retitle/scope it as the 3dpa log-format + owner-ask NEXT-SESSION structure reference. Current wording is a direct contradiction.

**MF-3 - The same Session-log protocol still has the old 3dpa start / NEXT-SESSION read stack.**

Two related stale clauses remain:

- `At session START` still says 3dpa reads top-level protocol -> ROADMAP -> INDEX -> last 3 logs -> task file, omitting project `CLAUDE.md`, `docs/3dpa-context.md`, and `NEXT-SESSION.md`.
- The `NEXT-SESSION.md` prompt structure still says files to read are top-level protocol -> ROADMAP -> INDEX -> last 3 session logs -> task-specific file. That will regenerate prompts that omit the new canonical context owner.

Trigger C has the right 3dpa order. The older session-start / NEXT-SESSION wording should be updated to defer to Trigger C for cold starts and include `docs/3dpa-context.md` when describing 3dpa prompt structure.

**MF-4 - The root hot-cache 3dpa planning summary conflicts with the new "what goes where" model.**

Earlier in `Projects/CLAUDE.md`, the 3dpa planning memory still says ROADMAP is the single source for "all phases, tasks, backlog, architecture reference" and that historical `#001-#036` IDs are preserved in ROADMAP. After Phase 1a, architecture lives in `docs/3dpa-context.md`, historical IDs live in `docs/planning/archive/`, and ROADMAP is the slim live planning surface.

This conflicts directly with the new 3dpa "what goes where" subsection. Since this top-level file is read at cold start, the stale hot-cache wording can re-bloat ROADMAP or send future assistants to the wrong file before they reach the corrected lifecycle rule.

**MF-5 - The memory entry preserves old vault-primary behavior and must be corrected.**

`feedback_session_lifecycle_triggers.md` is no longer safe as a hot-cache summary:

- Trigger C says vault-primary cold start reads vault README -> `plan.md` / last 3 `log.md` entries -> `next-session-prompt.md`, but the authoritative protocol now says README -> `state.md`, then follow or pivot via the `state.md` read-next map; `plan.md` / logs / prompt are only the legacy fallback when `state.md` is missing.
- The memory sentence "Triggers B and C regenerate NEXT-SESSION.md (and Trigger A always does...)" is wrong: Trigger C does not regenerate `NEXT-SESSION.md`; it reads startup context. Triggers A/B regenerate `NEXT-SESSION.md` only for non-vault-primary projects, while vault-primary projects update `state.md`.
- Trigger B's memory summary says regenerate NEXT-SESSION without carrying the vault-primary `state.md` exception.

Because memory entries are selectively surfaced, this one can override the more precise file text. Update it before relying on the refactor.

## Should-Fix

**SF-1 - Use distinct destination labels for Trigger A if possible.**

The current Trigger A labels are `(5a-vault)` and `(5a)`, followed by `(5b)` / `(5c)` / `(5d)`. It works, but the duplicated "5a" family is part of why the later references drifted. Consider renaming to `(5a-vault)` / `(5b)` / `(5c)` / `(5d)` / `(5e)` or using non-step labels like `(vault)` / `(documented)` / `(sessions-dir)` / `(session-log)` / `(fallback)`.

**SF-2 - The memory token table is stale.**

The root protocol recognizes `ai-om` / `ai-operating-model` / `aiom` and `knowledge-hub` / `kh` / `khub`; the memory entry does not. It also omits Trigger D entirely. Since project disambiguation is one of the highest-friction failure modes, the memory summary should either include the full token table or explicitly say the table is abbreviated and the authoritative token list lives in `Projects/CLAUDE.md`.

**SF-3 - The deployment hot-cache line for 3dpa-ios is stale.**

The root Deployment table still says `3dpa-ios | App Store (planned) | TestFlight first`, while the same file's Active Projects table says the app is approved and released worldwide. This is not part of the lifecycle rule, but it is in the same top-level hot cache and can mislead cold starts.

**SF-4 - "Before writing the log" should probably become "before finalizing the log."**

The new Trigger A wording already says md-hygiene runs before the log is finalized. The standing md-hygiene rule and checklist still say "before writing the session log" / "before writing the log." "Before finalizing" better preserves the original intent: draft or inspect enough to know what happened, run hygiene, then include findings in Open questions / Follow-up.

## Optional

**O-1 - The "Refactored 2026-05-08" note in memory is useful for now.**

It explains why the step counts changed and helps future debugging if an older assistant remembers the 10-step form. Once the protocol has been stable for a while, it can be compressed away.

**O-2 - The 3dpa "what goes where" rule is acceptable at top-level.**

It is project-specific, but Trigger A runs from the top-level protocol and this rule exists to stop ROADMAP re-bloat during closes. Keeping it here is reasonable as long as the older 3dpa hot-cache summary is updated too.

**O-3 - The multiple Codex packets do not violate the appropriate-once review spirit.**

This is a meta-layer protocol refactor with cross-project blast radius, and the owner explicitly requested the audit. The staged gates are justified here. I would not generalize this into a default for ordinary feature work.

## Genuinely good enough

**Decision J - Trigger A phase structure:** accept after MF-1. The phase grouping itself is better and keeps memory/vault/md-hygiene mandatory rather than optional.

**Decision K - Md-hygiene timing:** accept the intended timing, but MF-2/SF-4 need the rest of the file to agree with it.

**Decision L - Trigger C 3dpa read order:** accept. The extra `3dpa-context.md` read is worth it, and archive exclusion keeps the cold-start burden sane.

**Decision M - 3dpa "what goes where":** accept, with MF-4 so earlier hot-cache text does not contradict it.

**Decision N - Memory sweep:** modify per MF-5 and SF-2. Direction is right; current memory text is not safe yet.

**Decision O - Byte-identical sync:** accept. `diff -u Projects/CLAUDE.md Projects/AGENTS.md` returned empty output in my review.

## Recommendation

Do not proceed to final close until the Must-Fix items are resolved. The Trigger A refactor is directionally strong, but the remaining contradictions are exactly in the places future sessions will skim first: step references, mandatory session-end order, hot-cache project summary, and memory. After fixes, run these checks before closing:

- `diff -u /Users/mragile.io/Documents/Claude/Projects/CLAUDE.md /Users/mragile.io/Documents/Claude/Projects/AGENTS.md` must still be empty.
- `rg "step 8|step 3|3a-vault|plan.md|next-session-prompt|architecture reference|Legacy backlog ID index|App Store \\(planned\\)|TestFlight first" Projects/CLAUDE.md Projects/AGENTS.md ~/.claude/projects/-Users-mragile-io-Documents-Claude-Projects/memory/feedback_session_lifecycle_triggers.md` should return only intentional historical/fallback references.
- Re-read the final `Session-lifecycle triggers`, `Session-log protocol`, and memory entry as a cold assistant and verify there is one clear order for Trigger A.

---

# Resolution

**Author:** Claude
**Date:** 2026-05-08
**Status:** **PLAN — NOT YET APPLIED.** Per owner instruction ("I want another review before execute and after done"), this Resolution describes the planned fix set; actual file edits are gated on a Gate 2.5 Codex pre-execution review packet (separate file). Gate 2.6 post-execution review will verify the applied result.

## Per-finding dispositions (all PLANNED, not applied)

### Must-Fix

| ID | Finding | Disposition | Planned fix |
|---|---|---|---|
| **MF-1** | Stranded step references after Trigger A renumber (3 specific places) | **Accept** | (a) Standing-Rule-intro line: `(see Trigger A step 8 + Trigger B step 5)` → `(see Trigger A step 10 + Trigger B step 5)`. (b) Self-check format line: `For Trigger A step 3, also surface which destination path was used` → `For Trigger A step 5, also surface which destination path was used`. (c) Vault-primary summary line: `(3a-vault) destination path in Triggers A and B` → `(5a-vault) for Trigger A and (3a-vault) for Trigger B`. **Note:** Trigger B's destination labels stay (3a)–(3d) because Trigger B was NOT renumbered (still 6 flat steps). |
| **MF-2** | Session-log protocol "At session END (MANDATORY — in this order)" 6-step list contradicts new Trigger A ordering | **Accept — refactor the session-end list to match Trigger A** | Rewrite `Session-log protocol → At session END` to defer authoritative ordering to Trigger A and only document log-file structure + INDEX format requirements. New wording: "Authoritative step order lives in `Session-lifecycle triggers → Trigger A`. This subsection documents only the **log-file structure** required by Trigger A step 5 and the **INDEX format** required by Trigger A step 6." Then keep the markdown structure block (Durable context / What happened / Files touched / etc.) and INDEX prepend format, drop the 6-step ordering. |
| **MF-3** | "At session START" + "NEXT-SESSION.md prompt structure" subsections still have stale 3dpa read order missing project CLAUDE.md + 3dpa-context.md + NEXT-SESSION | **Accept — defer to Trigger C for cold starts** | Rewrite `Session-log protocol → At session START` to: "Authoritative cold-start protocol lives in `Session-lifecycle triggers → Trigger C` (see 3dpa-specific read order there). This subsection is preserved as a one-line backstop: never start work without first reading the top-level protocol file + project context file + last 3 session logs." Update NEXT-SESSION prompt-structure bullet to: "files to read in order — match Trigger C 3dpa read order (top-level → project CLAUDE.md → 3dpa-context.md → slim ROADMAP → INDEX → last 3 session logs → NEXT-SESSION → task-specific finding/spec)." |
| **MF-4** | Root hot-cache `## 3DPA Planning` section conflicts with new "what goes where" model | **Accept** | Rewrite the 3DPA Planning section's first bullet from "Single source of truth: ROADMAP.md — all phases, tasks, backlog, architecture reference" → "Live planning surface: `3dprintassistant/docs/planning/ROADMAP.md` (slim — Active Release / Active Work Queue / Deferred / Backlog). **Evergreen architecture / engine API / app state / standing rules:** `3dprintassistant/docs/3dpa-context.md` (canonical owner). **Historical detail (IR cycles, RB/BR pre-release polish, completed phases, legacy `#001-#036` IDs):** `3dprintassistant/docs/planning/archive/`." Drop the legacy `#001–#036` reference being preserved in ROADMAP — that moved to archive. |
| **MF-5** | Memory entry `feedback_session_lifecycle_triggers.md` (at `~/.claude/projects/-Users-mragile-io-Documents-Claude-Projects/memory/`) has 3 sub-issues: (a) Trigger C vault-primary cold start references `plan.md`/`log.md`/`next-session-prompt.md` as primary not legacy fallback; (b) "Triggers B and C regenerate NEXT-SESSION.md" — wrong, Trigger C reads not regenerates; (c) Trigger B summary missing vault-primary state.md exception | **Accept all 3** | (a) Update Trigger C vault-primary section to: "vault-primary projects: top-level `Projects/CLAUDE.md` → vault README → `state.md` → confirm + report locked entry point (legacy fallback when state.md missing: `plan.md` / last 3 `log.md` / `next-session-prompt.md`)." (b) Replace "Triggers B and C regenerate NEXT-SESSION.md (and Trigger A always does as part of the close)" → "Triggers A and B regenerate `NEXT-SESSION.md` for non-vault-primary projects (vault-primary projects update `state.md` instead — see `Projects/CLAUDE.md` Trigger A step 10). Trigger C is read-only — does NOT regenerate NEXT-SESSION." (c) Update Trigger B body to add: "**For non-vault-primary:** regenerate NEXT-SESSION.md. **For vault-primary:** update `state.md`'s 'Locked next entry point' + 'Changed since last update' line instead." |

### Should-Fix

| ID | Finding | Disposition | Planned fix |
|---|---|---|---|
| **SF-1** | (5a-vault) + (5a) duplication confusing | **Accept — rename to semantic labels** | Rename Trigger A destinations from (5a-vault)/(5a)/(5b)/(5c)/(5d) → (5-vault)/(5-documented)/(5-sessions-dir)/(5-session-log)/(5-fallback). Update all cross-references in self-check + memory entry. **Trigger B keeps the 3-letter scheme** (3a-vault)/(3a)/(3b)/(3c)/(3d) since it wasn't renumbered, OR rename consistently — TBD per owner taste. **Default plan: rename Trigger A only; leave Trigger B alone.** |
| **SF-2** | Memory token table stale (missing ai-om / aiom / knowledge-hub / Trigger D) | **Accept — partial** | Add a note at the top of the memory token table: "Abbreviated — authoritative full table (including `ai-om`/`ai-operating-model`/`aiom`, `knowledge-hub`/`kh`/`khub`, and Trigger D vault catch-up) lives in `Projects/CLAUDE.md`." Don't duplicate the full table in memory (that's the drift surface). |
| **SF-3** | 3dpa-ios Deployment hot-cache says "App Store (planned) / TestFlight first" — stale | **Accept** | Update Deployment table line: `3dpa-ios | App Store (planned) | TestFlight first` → `3dpa-ios | App Store (live worldwide since 2026-04-27) | TestFlight via gh workflow run testflight.yml --ref main (manual-dispatch; iOS push gate active)`. |
| **SF-4** | Standing md-hygiene rule + checklist say "before writing the log" — should be "before finalizing the log" | **Accept** | Two-line edit: (a) Standing rule "Md-hygiene evaluation (MANDATORY, end of every session)": `Before writing the session log, sweep the working tree for:` → `Before finalizing the session log (per Trigger A step 4 — md-hygiene runs before log finalization so findings can be included in the log's Open questions / Follow-up section), sweep the working tree for:`. (b) Md-hygiene checklist intro: `Run at the end of every session before writing the log.` → `Run at the end of every session before finalizing the session log.` |

### Optional

| ID | Finding | Disposition | Action |
|---|---|---|---|
| **O-1** | "Refactored 2026-05-08" preface in memory useful for now | **Acknowledged** | Keep; revisit when protocol stable for ~3 months. |
| **O-2** | 3dpa "what goes where" placement at top-level OK | **Acknowledged** | No change. (MF-4 fixes the related conflict.) |
| **O-3** | Multiple Codex packets don't violate appropriate-once spirit | **Acknowledged** | Confirms my earlier hunch. Don't generalize this cadence to ordinary work; this is a meta-layer protocol refactor with cross-project blast radius. |

## Net delta plan (PLANNED, not applied)

| File | Edit count (planned) | Nature |
|---|---|---|
| `Projects/CLAUDE.md` | ~7 surgical edits | MF-1 (a)+(b)+(c) + MF-2 (Session-log END refactor) + MF-3 (Session-log START refactor + NEXT-SESSION prompt structure) + MF-4 (3DPA Planning hot-cache rewrite) + SF-3 (Deployment table line) + SF-4 (md-hygiene timing in 2 places) + SF-1 (Trigger A destination labels) |
| `Projects/AGENTS.md` | byte-identical sync | `cp` after CLAUDE.md edits land |
| `~/.claude/projects/.../memory/feedback_session_lifecycle_triggers.md` | ~3 edits | MF-5 (a)+(b)+(c) + SF-2 (token table abbreviation note) |

**Total estimated effort:** ~30-40 min for fixes + Gate 2.5 pre-review packet + Gate 2.6 post-review packet.

## Verification (planned, will run after applying fixes)

Per Codex's recommendation:

1. `diff -u /Users/mragile.io/Documents/Claude/Projects/CLAUDE.md /Users/mragile.io/Documents/Claude/Projects/AGENTS.md` must return empty.
2. `rg "step 8|step 3|3a-vault|plan.md|next-session-prompt|architecture reference|Legacy backlog ID index|App Store \(planned\)|TestFlight first" Projects/CLAUDE.md Projects/AGENTS.md memory/feedback_session_lifecycle_triggers.md` should return only intentional historical/fallback references.
3. **Cold-read self-test on the lifecycle section** (Codex's framing): re-read `Session-lifecycle triggers` + `Session-log protocol` + memory entry as if a cold assistant — verify there is ONE clear order for Trigger A.

## Gate 2.5 + Gate 2.6 plan

Per owner instruction "another review before execute and after done":

- **Gate 2.5 — pre-execution review** (next packet): Codex reviews this Resolution's planned fix set BEFORE Claude touches any files. Catches plan errors before they land.
- **Gate 2.6 — post-execution review** (after fixes applied): Codex verifies the executed result against the planned fixes + runs the verification checks above.

This adds ~2 hours of total cycle time but keeps the lifecycle protocol — which affects every future session — under explicit two-sided Codex sign-off.
