# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-10 (Trigger A close after v2.1 cross-model review + patched small-gate plan PR).
**Locked next entry point:** **Execute Intake Autonomy v2.1 plan R-1/R0 first.** Do not redesign the plan unless fresh evidence shows a blocker.

---

## State of play (read before anything)

- **The live pipeline is safe.** Runner contract **v1.1** (ai-om `c99d1ed`): `review-no-go` is event-only, the `others → weekly ×4` catch-all is deleted, unrecognised reasons → `decision-required`. Daily 12:00 schedule runs; preflight is fail-closed.
- **K2 SE is parked, tainted, and stationary.** It will not be retried on any timer. Its branch is preserved as tag **`intake-k2se-first-run-evidence`** (diff hash `b88ae6df048d75c6`; stage 2b deleted the branch ref itself). Any re-attempt requires explicit owner instruction.
- **v2.1 spec is patched to v5.** Spec path: `docs/superpowers/specs/2026-07-10-intake-autonomy-v2.1-evidence-retry-retrospective-design.md`. Review trail: Codex NO-GO #1, Codex NO-GO #2, Claude hostile review; all findings applied.
- **v2.1 plan is ready.** Plan path: `docs/superpowers/plans/2026-07-10-intake-autonomy-v2.1-small-gates-plan.md`. It is R-1/R0–R8, and its own hostile plan review found 5 must-fix + 8 should-fix + 3 optional; all patched.
- **Nothing has been built for v2.1 yet.** The next session starts execution, not implementation catch-up.

Copy everything between the markers into a new session.

>>> START >>>

3dpa cold start.

Read in order: `~/dev/Claude/Projects/CLAUDE.md` → `3dprintassistant/CLAUDE.md` → `3dprintassistant/docs/3dpa-context.md` → `3dprintassistant/docs/planning/ROADMAP.md` (banner + Active Work Queue) → `docs/sessions/INDEX.md` → the last 2 relevant session logs (`2026-07-10-cowork-appdev-intake-v2.1-spec.md`, `2026-07-10-cowork-appdev-intake-autonomy-build.md`) → this file.

Then execute the plan:

`docs/superpowers/plans/2026-07-10-intake-autonomy-v2.1-small-gates-plan.md`

Start at **Task R-1: Execution Branch Setup**, then **Task R0: Taxonomy Config And NO-GO Taint Graph**. Stop after R0 unless the gate is fully green and reviewed.

Rules for this work:

- Follow the plan's gates exactly.
- Set `BRIDGE_MODE` correctly for the executor: `claude-only` when Codex is driving, `codex-only` when Claude is driving.
- Every gate: implement → hostile review → patch → QA evidence → cross-model check → commit → gate-ledger row.
- One accepted review finding = one commit.
- No v2.1 sidecar writer before R0 taxonomy config + validator is green.
- K2 SE migration proves `decision-required`; do **not** re-attempt K2 SE unless the owner explicitly instructs it.
- Engine/app/data profile semantics are untouched until a real printer ships; if a future printer ships, run the web+iOS impact evaluation and keep iOS push gate in force.
- Leave the tree clean at every stopping point; dirty/ahead web repo blocks the live runner.

>>> END <<<

Maintenance note: this file is regenerated on Trigger A / Trigger B / explicit owner ask only.
