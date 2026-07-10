# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-10 (R8 close after Intake Autonomy v2.1 implementation + final review GO).
**Locked next entry point:** **Publish/PR Intake Autonomy v2.1 only if the owner explicitly authorizes push/PR/merge.** Do not restart R0–R8.

---

## State of play (read before anything)

- **v2.1 implementation is complete locally, not pushed/PR/merged.** Web branch: `codex/intake-v21-impl`; final web close commit is the R8 docs commit from the prior session. Cross-repo ai-om commits are local on `ai-operating-model/main`: `9bc6e0c` (v2.1 runner contract integration) + `a118bd5` (split-review routing fix).
- **R0–R8 are closed and reviewed.** R8 full local suite passed: all intake unit/shell tests, `validate-data`, `validate-ios-printer-overlay`, and `git diff --check`. Final direct cross-model review first returned NO-GO on split verdict routing, then GO after `a118bd5`.
- **No external state change was performed at R8 close.** No push, no PR, no merge. Keep that boundary unless the owner explicitly says to proceed with publishing.
- **K2 SE remains parked, tainted, and stationary.** No timer retry. No Scout rerun. No PD5 re-entry unless the owner explicitly instructs RD2 re-attempt or supplies new external evidence for supervised `judgment-on-evidence`.
- **Live v2 baseline remains safe.** The daily 12:00 schedule exists, but the v2.1 implementation is not live until the branch/contract commits are published and merged.

Copy everything between the markers into a new session.

>>> START >>>

3dpa cold start.

Read in order: `~/dev/Claude/Projects/CLAUDE.md` → `3dprintassistant/CLAUDE.md` → `3dprintassistant/docs/3dpa-context.md` → `3dprintassistant/docs/planning/ROADMAP.md` (banner + Active Work Queue) → `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md` (R8 row) → this file.

Then verify local state:

```bash
cd ~/dev/Claude/Projects/3dprintassistant
git status --short --branch
git log --oneline -5
git -C ../ai-operating-model status --short --branch
git -C ../ai-operating-model log --oneline -3
```

Expected: web branch `codex/intake-v21-impl` contains R0–R8, and ai-om `main` is ahead with the v2.1 contract commits.

If the owner explicitly authorizes push/PR/merge:

1. Re-run the R8 smoke set (`node scripts/validate-reviewer-output.test.js`, `node scripts/validate-data.js`, `node scripts/validate-ios-printer-overlay.js`, `git diff --check`; run the full R8 suite if anything changed).
2. Push the ai-om commits and the web branch.
3. Open the web PR using the v2.1 summary from `docs/superpowers/plans/2026-07-10-intake-autonomy-v2.1-small-gates-plan.md` Step 5, updated with the R8 final-review/fix evidence.
4. Watch checks. Merge only when checks are green and review status is clear.
5. After merge, fast-forward local `main`; do **not** reattempt K2 SE unless separately instructed.

Rules for this work:

- Do not restart R0–R8; they are already closed.
- One accepted review finding = one commit.
- No iOS push. Printer additions remain web data + remote overlay; TestFlight is not part of this workflow.
- K2 SE re-entry is owner-explicit only.
- If not authorized to publish, stop after reporting clean local readiness.

>>> END <<<

Maintenance note: this file is regenerated on Trigger A / Trigger B / explicit owner ask only.
