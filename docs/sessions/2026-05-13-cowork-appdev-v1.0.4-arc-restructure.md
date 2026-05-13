# 2026-05-13 — Cowork (appdev): v1.0.4 arc restructure (Phase 1.5 audit-gate insertion + Phase 2 split)

## Durable context

- **Meta-session, not an impl session.** This session interrupted the S4→S5 sequence to restructure the v1.0.4 plan itself. No engine/data/harness changes; no Phase 1 tasks shipped. The S5 designation is reserved for the next session that actually executes Task 6. Counted in the implementation plan's Execution Handoff section as a "session between S4 and S5" — not numbered, named `v1.0.4-arc-restructure` to distinguish from impl sessions.
- **Two structural changes locked in one commit.** (a) Phase 2 split into Phase 2.1 (engine + data sync + iOS XCTest as one iOS local commit) + Phase 2.2 (UI walkthrough + MARKETING_VERSION bump as second iOS local commit + 5-point ship-ready handoff). (b) New Phase 1.5 audit gate inserted between Phase 1 and Phase 2.1, owner-gated dispatch per Option B (low-touch): S6 prepares packet + ready-to-run Codex command + empty response file; owner runs Codex manually; S7 cold-starts on the response and remediates web-only. Stop conditions: ≥1 CRITICAL or ≥5 HIGH → owner pause; 1-4 HIGH → autonomous remediation; MEDIUM/LOW → owner-triaged.
- **Plan → review → confirm → execute discipline applied + validated.** Per `feedback_review_before_implement.md`, drafted plan + dispatched to Plan agent (foreground, read-only review) + reported findings honestly + waited for explicit owner go-ahead before execution. Plan agent returned 2 BLOCKERs (Self-Review accuracy + Task 7.5 numbering convention) + 5 SHOULD-FIX (stop-condition threshold mis-calibration, owner-gate location, autonomy-contract drift, sub-commit boundary explicitness, packet template stress-test gaps) + 4 NICE. All addressed in the executed commit. The reviewer's calibration on stop-condition threshold was the most material catch — original ≥3 HIGH = pause would have made the green path the rare path given IR-0/IR-2a historical HIGH counts; raised to ≥5 HIGH.
- **iCloud sync race at cold-start is real and the protocol's `git status` guard caught it correctly.** Two-machine workflow: iMac runs Task 5 (S4 commits + close), iCloud syncs `.git/refs` quickly + bulky source files (`engine.js`, `walkthrough-harness.js`) lazily. MacBook cold-starts before file-byte sync completes → `git diff HEAD` shows phantom drift on the two large files while small files (`profile-matrix-audit.js`) had already landed. Drift resolved silently during investigation as iCloud caught up. Reflog `commit:` entries (not `pull:`/`fetch:`) confirm same `.git/` directory shared between machines via iCloud Drive's Documents-folder bind-mount. The cold-start protocol's "run `git status` before any work" guard fired exactly as designed — no protocol gap to patch. Tactic for future: if drift appears at cold-start, wait 30s and re-run before acting; check file mtimes against expected commit times to confirm.
- **Owner-gate vs auto-dispatch distinction in Codex review packets needs explicit framing in ai-collab.md.** Plan agent flagged S2 ("owner-gate location") because the failure mode of pure owner-dispatch (AFK + packet sits) is real. Three actual options surface: (A) pure owner-gate (S6 stops, owner reads packet + dispatches), (B) low-touch owner-dispatch (S6 prepares packet + ready-to-run command, owner runs one command, current choice), (C) Claude-invokes-Codex via Bash (violates standing "No autonomous Codex peer review" rule). ai-collab.md doesn't currently distinguish these explicitly. Worth documenting in a future ai-collab.md polish pass — not v1.0.4 scope.

## What happened / Actions

1. **Cold-start S5** per Trigger C. Read top-level protocol, project CLAUDE.md, `docs/3dpa-context.md`, ROADMAP, INDEX, last 3 session logs (S4/S3/S2), NEXT-SESSION. Surfaced locked entry point (S5, Task 6, chamber safe-cap guard).
2. **Cold-start surfaced an unexpected working-tree drift** — `engine.js` and `walkthrough-harness.js` showed as modified vs HEAD with content matching `dc49c52` (Task 5 impl pre-fixup) instead of `1695cba` (Task 5 post-fixup). `profile-matrix-audit.js` correctly matched HEAD. Did NOT proceed with Task 6; surfaced the drift to owner.
3. **Investigated drift root cause** at owner request. Findings:
   - Task 5 commits (`dc49c52` + `1695cba`) are clean and contain the substantive work the S4 log claimed.
   - S4 wrap-up follows Trigger A protocol — all 12 steps accounted for in the log.
   - The drift was NOT introduced by Task 5 execution or the wrap-up.
   - Drift evaporated mid-investigation as iCloud completed file-byte sync. Owner confirmed: Task 5 ran on iMac before owner left for work; MacBook cold-started before full iCloud sync caught up.
   - Reflog `commit:` entries (not `pull:`) confirmed both machines share the same `.git/` directory via iCloud Drive's Documents-folder bind-mount. mtimes preserved verbatim from iMac (09:11–09:12 local time) survived cross-machine sync.
4. **Restructure request from owner.** "Split Phase 2 into 2.1 (sync + XCTest) and 2.2 (walkthrough + version bump + ship). Insert a Codex audit between Phase 1 and Phase 2 because v1.0.4 changes are comprehensive." Owner explicitly invoked `/using-superpowers` for skill discipline; no auto-loaded skill directly fit (no `brainstorming` skill in available list) so proceeded with structured analysis.
5. **Drafted restructure plan.** 3 target files (implementation plan, ROADMAP, NEXT-SESSION). Recommended Phase 1.5 BEFORE Phase 2.1 (not between 2.1 and 2.2) — engine fixes from Codex remediate web-only, no rework after iOS sync.
6. **Dispatched Plan agent (foreground, read-only) for stress-test review per `feedback_review_before_implement.md`.** Briefed agent with full plan content + 10 specific stress-test asks (cross-file consistency, stop-condition realism, sub-commit mechanics, packet self-sufficiency, owner-gate location, session-numbering sanity, information loss, protocol-drift risk, hidden references, reversibility). Agent returned 2 BLOCKERs + 5 SHOULD-FIX + 4 NICE under HIGH confidence (read all 8 files end-to-end + grep sweep for hidden references).
7. **Reported review findings honestly to owner; got explicit go-ahead** (`yes execute`). Single sub-question on Codex dispatch model resolved to Option B (low-touch owner-dispatch).
8. **Executed restructure edits** as one local commit `12fd33c`:
   - `docs/superpowers/plans/2026-05-13-v1.0.4-config-impact.md` — inserted Phase 1.5 section (5 steps; packet template with 9 stress-test asks; stop conditions; green-path collapse; cancellation policy) + renamed Phase 2 → 2.1 + updated Task 8 title and Files list + new Phase 2.2 + new Task 9 + Self-Review rewrite + Execution Handoff with S1-S9 session map. (+202/-26)
   - `docs/planning/ROADMAP.md` — header `Last updated` block gained 4-phase shape note + Active Work Queue v1.0.4 bullet's parenthetical updated to `7 web tasks + 1 Codex audit gate + 2 iOS phases` + trailing "transitions to Phase 2" replaced with full 4-phase shape. (+3/-3)
   - `docs/sessions/NEXT-SESSION.md` — Current State gained Phase shape bullet; Scope Rules autonomy-contract kept blanket "No autonomous Codex peer review" rule + additive Phase 1.5 narrow carve-out (packet prep only, owner runs Codex); "What you'll do across S5…S∞" tail replaced with full S5-S9 session map + green-path collapse note. (+19/-2)
9. **Push failed** — MacBook git lacks HTTPS credential helper for `https://github.com`. Identity also recorded with MacBook hostname (`mragile.io@MacBook-Air.local`) instead of usual GitHub noreply email. Surfaced both to owner; owner chose to leave commit local and handle push + identity manually.
10. **Md-hygiene sweep run.** Findings carried into "Open questions / Follow-up" below.
11. **This Trigger A close** — session log + INDEX prepend + ROADMAP header re-stamp + NEXT-SESSION Last-updated re-stamp + close commit.

## Files touched

**Web repo (`3dprintassistant`):**
- Modified: `docs/superpowers/plans/2026-05-13-v1.0.4-config-impact.md` (+202/-26)
- Modified: `docs/planning/ROADMAP.md` (+3/-3 in restructure commit; +1/-1 in this close for Last-updated re-stamp)
- Modified: `docs/sessions/NEXT-SESSION.md` (+19/-2 in restructure commit; Last-updated re-stamp in this close)
- Created: `docs/sessions/2026-05-13-cowork-appdev-v1.0.4-arc-restructure.md` (this log)
- Modified: `docs/sessions/INDEX.md` (prepended one entry)

**iOS repo (`3dprintassistant-ios`):** none modified; HEAD `eeb2915` untouched. One untracked file `.claude/settings.local.json` (md-hygiene finding below).

## Commits

**Web `3dprintassistant` `main`:**
- `12fd33c` — `docs: split v1.0.4 Phase 2 into 2.1/2.2 + insert Phase 1.5 Codex audit gate` — **NOT PUSHED** (MacBook lacks GitHub HTTPS credential helper; identity recorded with MacBook hostname).

Plus the close commit produced by this session (session log + INDEX + ROADMAP header re-stamp + NEXT-SESSION re-stamp). Will also be unpushed until owner runs `gh auth login` + `git push`.

**iOS:** no commits. HEAD `eeb2915`.

## Open questions / Follow-up

Md-hygiene sweep findings (one-liner per item):

- **Root-level stubs (web):** none new this session. Only `CLAUDE.md` at root, which is legitimate.
- **Untracked but should-be-tracked (web):** none — working tree clean post-commit.
- **Untracked in iOS repo:** `.claude/settings.local.json` is untracked AND iOS `.gitignore` does NOT exclude `.claude/`. This is a per-machine Claude Code config that should be gitignored at the iOS repo level (web repo presumably already handles this — would be worth a parallel sweep). **Filed as new mini-finding for future iOS housekeeping session:** add `.claude/` to iOS `.gitignore`.
- **Secrets in tree:** none — commit `12fd33c` scanned, no `.p8` / `ghp_*` / `sk-*` / `xoxb-*` / `BEGIN.+PRIVATE KEY` matches.
- **Protocol drift (`Projects/CLAUDE.md` vs `AGENTS.md`):** byte-identical ✓.
- **Stale ROADMAP:** addressed inline — Last-updated block gained 4-phase shape note + Active Work Queue bullet gained Codex audit gate mention.
- **Duplicate specs:** none introduced.
- **Content-routing check:** durable content from this session lives in the implementation plan (the structural change itself), in NEXT-SESSION (autonomy contract update + session map), and in this session log (durable context + lessons). Nothing buried that belongs elsewhere.

**Push + identity blockers (owner-deferred):**
- Commit `12fd33c` + this close commit are unpushed. Owner will run `gh auth login` + `git push origin main` when convenient. Until pushed, the structural restructure exists only on this MacBook; the iMac will not see it until next sync. The Phase 1 work currently in flight (Task 6 + Task 7) can still proceed locally on either machine without the restructure, but planning surfaces (NEXT-SESSION + ROADMAP) won't match across machines until push lands.
- Identity on `12fd33c` recorded as `mragile.io@MacBook-Air.local`; owner declined to amend pre-push or to update global git config on MacBook.

**Carry-forward to S5/S6:**
- Task 6 (chamber safe-cap guard, warning-only, HIGH-05) is the locked entry point — same as it was before this session. Per-finding checkpoint allows S5 to continue into Task 7 if context is light.
- After Task 7 lands, S6 prepares Phase 1.5 packet per the new section in the implementation plan. **Reminder for Task 7:** explicit warning-ID rename `cf_small_nozzle` → `nozzle_below_min_diameter` triggers the S4-learned test-contract sweep — search BOTH `walkthrough-harness.js` AND `profile-matrix-audit.js` before commit.
- ai-collab.md polish lane: distinguish A/B/C dispatch options explicitly. Not v1.0.4 scope; file under a docs/ housekeeping backlog.

## Memory sweep

**One durable memory candidate proposed:**

- `feedback_icloud_sync_race_at_cold_start.md` — Multi-machine setups using iCloud Drive's Documents-folder bind-mount share the same `.git/` directory, but iCloud syncs files individually rather than transactionally. Small `.git/refs` files sync fast; bulky source files sync slowly. Cold-starting on machine B after machine A finishes a session can show phantom drift (real disk content lags behind the synced HEAD pointer). File mtimes are preserved verbatim across machines, which is the diagnostic tell (mtimes match the originating machine's edit time, not the destination machine's sync time). Tactic: cold-start `git status` is the line of defense (already in protocol); if drift appears, wait 30 sec and re-run before acting. Reflog entries showing `commit:` (not `pull:`/`fetch:`) confirm shared `.git/` directory across machines. Validated 2026-05-13 on the 3dpa S5 cold-start.

**One candidate considered and rejected:**
- "Plan-agent stress-test ≥5 HIGH threshold for audit-gate pause" — calibration insight is specific to Codex review packets in 3dpa's IR-style triage system; not durable across other projects or other AI-collaboration patterns. Lives in this log + in the implementation plan's Phase 1.5 stop conditions.

## Vault sweep

**Two surfaces with proposed entries:**

- **`Obsidian Vault/20-Areas/Development/toolchain.md`** — iCloud-sync-race-at-cold-start as a cross-project routing/environment note. The pattern applies to any of Musti's two-machine workflows (3dpa, knowledge-hub, etc.) where the `Projects/` parent dir is iCloud-synced. Same content as the memory entry above; vault home is for the cross-project flavor, memory is for the in-session tactic.
- **`Obsidian Vault/20-Areas/AI-collaboration/`** — owner-dispatch vs auto-dispatch vs Claude-invokes-Codex three-way distinction for Codex review packets. Currently ai-collab.md (in the 3dpa repo) implies but doesn't explicitly enumerate these three options. Worth a vault note (cross-project — knowledge-hub will face the same choice) that points back to ai-collab.md for the 3dpa-specific framing. Could later promote to ai-collab.md as a polish item.

**Surfaces explicitly considered and rejected:**
- Strategic decision → `10-Projects/3dpa.md`: the Phase 1.5 insertion is tactical (this v1.0.4 arc only), not a strategic shift in how 3dpa releases work. Skip.
- Glossary → `memory/glossary.md`: "Phase 1.5" / "audit gate" are 3dpa-internal shorthand; not durable beyond v1.0.4. Skip.
- Hobby observation → `20-Areas/Hobbies/3d-printing.md`: N/A.
- Consulting → `20-Areas/Consulting/`: N/A.
- External source → `50-Wiki/`: N/A.

## Next session

S5 cold-starts and executes **Task 6** of the (newly-restructured) implementation plan — chamber safe-cap guard, warning-only, HIGH-05. Single engine site; no profile field per owner default 4. Same Phase 1 autonomy contract: autonomous web commits + push (if push works — owner needs to run `gh auth login` on MacBook first OR session continues on iMac where push already works). Per-finding checkpoint allows continuation into Task 7 if context is light.

After Task 7 lands, S6 prepares the Phase 1.5 Codex audit packet per the new section in `docs/superpowers/plans/2026-05-13-v1.0.4-config-impact.md`. Owner-gated dispatch (Option B — low-touch). The full S5-S9 session map is in NEXT-SESSION.md's "What you'll do across S5…S∞" section.

Carry-forwards: exact-value / exact-ID assertions from the start (S2-learned); mirror the full engine recipe in warning-side checks (S3-learned); sweep ALL test contracts when retiring or renaming warning IDs — Task 7 explicitly renames `cf_small_nozzle` → `nozzle_below_min_diameter` and is the immediate application target (S4-learned).
