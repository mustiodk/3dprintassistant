# 2026-05-13 — Cowork (appdev): v1.0.4 S2 — Tasks 1, 2, 3 shipped under subagent-driven-development

## Durable context

- **Execution shape: `superpowers:subagent-driven-development`.** Each of the three tasks ran fresh implementer subagent → spec-compliance reviewer subagent → code-quality reviewer subagent → per-finding follow-up commit applying the review fixes → spec/quality re-review. This worked well: implementer + reviewer subagents absorbed the depth (engine.js paths, harness assertion shapes, ID conventions) while the controller stayed in coordination/decision mode. Recommend the same pattern for S3+ until Phase 2 (iOS sync), which is a different kind of session.
- **Code-quality review flagged Important issues on all 3 tasks, all with the same shape.** Harness assertions used inequalities (Task 1: `bedCold > bedNormal`) or loose regex (Task 3: `/nozzle_not_on_printer|printer_nozzle/i.test(id)`), and the fix in every case was tightening to exact values / exact-ID `.includes()`. This is the standing recommendation for Task 4+: write exact-value / exact-ID asserts from the start, skip the review round-trip. The looseness was avoidable, not a deep design issue.
- **Bambu Studio JSON export path is OUT OF DATE for env-data fixes from Task 2.** `exportBambuStudioJSON` reads `material.base_settings.cooling_fan_min` directly and lacks a `BAMBU_PROCESS_MAP` entry for `draft_shield`. Filed as a deferred finding in ROADMAP "IR-deferred export-path findings" with TODO comments at the engine.js export sites (~line 2493, ~line 2863). Will bundle with the Phase 2.7a re-enable; not v1.0.4 scope per the autonomy contract's no-mid-flow-adjudication rule.
- **Reviewer-scope-expansion adjudication pattern is consistent.** Task 1 reviewer raised "always-emit prov suffix with numeric value" and "apply multiplier after clamps too"; Task 2 raised "wire export path"; Task 3 raised "data-audit script for missing `available_nozzle_sizes`". The consistent call was defer per `feedback_no_relitigation.md` + the autonomy contract — real ones get filed as ROADMAP backlog (Task 2 export gap); UX-taste calls stay implicit. Use this lens for S3+ reviewer feedback too: real gap → file; scope creep → defer; only the owner can override at a session boundary.
- **The cumulative test contract is composable.** 4 v1.0.4 OK lines in the walkthrough harness (HIGH-09, ENV, MEDIUM-05, HIGH-01), each task adds 1–2 blocks, no interaction between them. Profile-matrix-audit's broad sweep (47196 configs) covers the negative space. The walkthrough is a sound regression contract for the rest of the arc; don't add bespoke test scaffolding.

## What happened / Actions

1. **Task 1 — strength `speed_multiplier` (HIGH-09 / HIGH-04).** Implementer wrote the failing assertion on a strong vs standard vs maximum profile (X1C+PLA, balanced strategy) at the walkthrough; implemented the multiplier in `engine.js` SPEED TAB section between the base `outerSpeed`/`innerSpeed` lines and the TPU/ABS/PC/PA/MVS/printer-clamp blocks; updated provenance refs at `p.outer_wall_speed` + `p.inner_wall_speed`; harness green; full verification gate green. Code-quality reviewer flagged the loose inequality assertion; follow-up commit tightened to exact-value asserts + a NaN-safe guard. Spec-compliance + quality re-reviews green. Web commits `133be38` (impl) + `246171d` (test).
2. **Task 2 — env data layer + cold-warning copy + clamp attribution (HIGH-07 / HIGH-08 / HIGH-05 + MEDIUM-05).** Implementer wired the env data layer through `rules/environment.json`-driven adjustments, fixed cold-environment warning copy to match emitted deltas, and added env-attributed clamp attribution (warning id `env_compensation_capped_by_material`); harness extended with cold-env assertion block. Code-quality reviewer flagged loose harness assertions + raised the Bambu export-path gap (`exportBambuStudioJSON` reads raw `material.base_settings.cooling_fan_min`, no `BAMBU_PROCESS_MAP` entry for `draft_shield`). Follow-up commit tightened harness to exact values, added TODO comments at engine.js export sites (~2493, ~2863), and filed the export-path gap as a deferred finding in `docs/planning/ROADMAP.md` under "IR-deferred export-path findings". Web commits `f7b34f1` (impl) + `d959537` (test+docs).
3. **Task 3 — physical printer × nozzle guard (HIGH-01).** Implementer added a warning emit when the selected nozzle isn't on the physical printer (ender3_v3_se does not stock std_0.8); harness extended with a fires-for-X / silent-for-Y assertion pair (ender3_v3_se+std_0.8 fires, centauri_carbon+std_0.4 silent). Code-quality reviewer flagged loose regex on the warning id and a coupled flag for orthogonal state. Follow-up commit tightened to exact-ID `.includes()` and split the flag into an orthogonal boolean. Web commits `1724f86` (impl) + `b238a82` (test+refactor).
4. **Md-hygiene sweep.** Run before this log was finalized; findings carried into the Open questions section below.
5. **Trigger A close (this).** Session log + INDEX prepend + ROADMAP header/queue update + NEXT-SESSION regen for S3 + verification rerun + commit + push + self-check.

## Files touched

**Web repo (`3dprintassistant`):**
- Modified: `engine.js` — 6 commits across the three tasks (Task 1 strength multiplier; Task 2 env data layer + warning copy + clamp attribution + export-path TODOs; Task 3 printer × nozzle guard) and their follow-up review fixes.
- Modified: `scripts/walkthrough-harness.js` — 4 commits (assertions added for Task 1 / Task 2 / Task 3 and the per-task tightening fixups; Task 2 impl commit was data/comment only on the harness side).
- Modified: `docs/planning/ROADMAP.md` — Task 2 fixup added the deferred Bambu export-path finding; this close updates the header date line + Active Work Queue v1.0.4 bullet's next-step pointer.
- Created: `docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s2-impl.md` (this log).
- Modified: `docs/sessions/INDEX.md` (prepended S2 entry).
- Modified: `docs/sessions/NEXT-SESSION.md` (regenerated for S3 cold-start).

**iOS repo (`3dprintassistant-ios`):** none. HEAD `eeb2915` untouched per Phase 2 gate.

## Commits

**Web `3dprintassistant` `main` (in order, parent `684e42a` from S1 close):**
- `133be38` — `fix: wire strength speed_multiplier into wall speeds`
- `246171d` — `test: tighten Task 1 contract — exact-value asserts + NaN-safe guard`
- `f7b34f1` — `fix: wire env data layer and fix cold-warning copy + clamp attribution`
- `d959537` — `test+docs: tighten Task 2 contract; defer env export propagation`
- `1724f86` — `fix: warn when selected nozzle isn't on the printer`
- `b238a82` — `test+refactor: tighten Task 3 contract — exact ID match + orthogonal flag`

Plus the close commit produced by this session, which adds session log + INDEX + ROADMAP header + NEXT-SESSION regen.

**iOS:** no commits. HEAD `eeb2915`.

## Open questions / Follow-up

Md-hygiene sweep findings (one-liner per item):
- Root-level stubs: none added this session.
- Untracked files: none — working tree clean at every commit boundary.
- Secrets in tree: none — no `.p8` / `ghp_*` / `sk-*` / `xoxb-*` matches anywhere in the diff.
- Protocol drift: `diff -u Projects/CLAUDE.md Projects/AGENTS.md` is empty — files byte-identical.
- Stale ROADMAP: addressed inline — Task 2 fixup already added the deferred export-path bullet under "IR-deferred export-path findings"; this close updates the header date + Active Work Queue v1.0.4 next-step pointer.
- Duplicate specs: none introduced this session.
- Content-routing check: nothing buried in this log belongs elsewhere — durable patterns either (a) already covered by existing memory entries (no-relitigation, autonomous-multisession-arc), or (b) are arc-specific test-pattern observations that belong in the log itself.

Carry-forward to S3:
- Bambu export path TODOs at `engine.js` ~2493 and ~2863 are bundled under Phase 2.7a re-enable; do not address in v1.0.4.
- Write exact-value / exact-ID assertions from the start in Task 4+. The fixup-cycle was avoidable.

## Memory sweep

**No durable memory candidates this session.** Three candidates considered and rejected:
- "Tighten harness assertions proactively for v1.0.4 Task 4+" — narrow tactical note tied to the active arc; lives in this log + NEXT-SESSION instead. Not durable past v1.0.4.
- "Subagent-driven-development is the right execution shape for v1.0.4 tasks" — pattern is documented in the `superpowers:subagent-driven-development` skill itself; a memory pointing to it adds nothing.
- "Decline scope-expansion adjudications per autonomy contract" — already covered by existing `feedback_no_relitigation.md` and `feedback_autonomous_multisession_arc.md` memories; no new entry needed.

## Vault sweep

**Nothing durable to propagate.** Surfaces specifically considered:
- Strategic decision / rationale → `Obsidian Vault/10-Projects/3dpa.md`: nothing beyond what `merged.md` + ROADMAP already capture.
- Cross-project pattern / routing → `Obsidian Vault/20-Areas/Development/toolchain.md`: subagent-driven-development worked across all 3 tasks, but it's a documented superpowers skill — not a 3dpa-specific routing change.
- AI collaboration guideline → `Obsidian Vault/20-Areas/AI-collaboration/`: trigger-cheatsheet already covers cold-start; subagent-driven-development is invoked from inside a task, not at a session boundary. No addition.
- Hobby observation → `Obsidian Vault/20-Areas/Hobbies/3d-printing.md`: nothing new about 3D printing surfaced — env-data DEAD findings are tooling, not domain insight.
- Consulting method: N/A.
- External source: N/A.

## Next session

S3 cold-starts and executes **Task 4** of the implementation plan (physical printer × plate guard + material plate range — HIGH-02 / HIGH-03). Same autonomy contract (autonomous web commits + push, iOS local-only, no TestFlight, no Codex peer review). Per-finding checkpoint rule applies: continue to Task 5 if bounded, wrap at clean commit boundary otherwise; Tasks 5 (MCS practical tiers) and 6 (chamber safe-cap) are larger so expect to wrap mid-Task-5 or after Task 4 alone. New guidance: write exact-value / exact-ID assertions in the harness from the start — the fixup-cycle on every S2 task was avoidable.
