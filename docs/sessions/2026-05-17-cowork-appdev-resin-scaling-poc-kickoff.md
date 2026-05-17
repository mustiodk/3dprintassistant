# 2026-05-17 — Cowork (appdev): resin-scaling discovery kickoff (PoC)

## Durable context

- **Resin-scaling work has formally started as a docs-only discovery exercise.** Owner pivoted from the v1.0.4 → ASC submission queue to a PoC vehicle that simultaneously kickstarts the resin sub-project, tests bridge as a multi-round quality amplifier, and probes how far autonomy can be pushed. Resin work lives in `docs/resin-scaling/`. The PoC's meta-track (autonomy scorecard, bridge round logs, owner-asks queue, findings) lives in `ai-operating-model/docs/autonomy-poc-2026-05-resin/`. Two homes by design: product artifacts here, process artifacts there.
- **Load-bearing reframe captured mid-session: the audience IS the owner.** v3 §2 makes this explicit. Resin work is hobby-build, not user-facing product expansion. Gate 1 (audience overlap) dissolved entirely; survey v1 parked. Public surfaces (runbook v4 "no plans" + v1.0.5 FDM-only scope copy) do NOT need to reopen — internal exploration doesn't contradict public posture. This reframe is the single most important durable fact for any future session resuming this work: read v3 §2 first.
- **v3 of problem-statement.md replaces v2 in-session.** v3 incorporates bridge round 1's 4 MUST-FIX + 6 SHOULD-FIX + 7 OPTIONAL findings, plus the owner audience reframe. Key shape: 2 gates (wizard-frame fit → owner-preference success target), expanded coupling table C1–C15 with t-shirt sizing, gate-result × outcome matrix in §7 including "park / evidence inconclusive" outcome. Brand enumeration dropped per MF4. R1 (worker.js was correct — bridge Claude turn 1 self-owned; Codex verified) folded back; v2's worker.js paragraph kept in v3.
- **No live engine / data / UI touches.** PoC charter forbids it; held throughout. Web HEAD untouched until this session's close commit (resin-scaling/ subdirectory + ROADMAP touch + this log). iOS untouched entirely (`c99a797`).
- **Backup before autonomous work:** `Claude/backups/claude-snapshot-2026-05-17.tar.gz` (747MB, all repos + vault) + `memory-snapshot-2026-05-17.tar.gz` (111KB) + `recovery-2026-05-17.md`. Rollback instructions verified.

## What happened / Actions

1. **3dpa cold start** completed normally; owner pivoted from the locked Lane A/B/C path (v1.0.4 TestFlight verdict) to "a different 3dpa task entirely" — resin expansion brainstormed via bridge.
2. **Verdict given on the prior bridge resin-brainstorm output** at `ai-operating-model/docs/ensemble-pilot/2026-05-17-resin-comparison/`. Honest read: brainstorm quality excellent; my own recommendation = don't pursue now, sibling product if ever, answer audience-overlap first. Owner accepted the audience-first framing but reframed it during execution (see audience reframe above) — `1.0.4 + brainstorming in parallel, not sequential`.
3. **PoC framing established.** Owner described 3 things being tested: (1) real resin sub-project start, (2) bridge as multi-round quality amplifier, (3) autonomy ceiling probe. Operating shape proposed + 3 load-bearing choices (project name `resin-scaling`, owner-asks-batching, scorecard transparency) answered. Owner requested backup before launch.
4. **Backup phase.** Created `claude-snapshot-2026-05-17.tar.gz` + `memory-snapshot-2026-05-17.tar.gz` + `recovery-2026-05-17.md` per existing `projects-snapshot-2026-04-29.tar.gz` convention. Integrity verified.
5. **PoC scaffolding:** wrote README in this directory and in `ai-operating-model/docs/autonomy-poc-2026-05-resin/`, charter (goals + scorecard dimensions + modes rubric + escalation rules + ensemble-experiment slot), initial scorecard tables, owner-asks queue.
6. **Problem-statement v2 drafted solo** (~35 min). 200 lines. Covered: factual state of 3dpa, prior brainstorm summary, 3 gates (audience overlap → wizard-frame fit → success-target), 8 hard couplings C1–C8, standing rules + active queue, success criterion, open questions for bridge round 1.
7. **Bridge round 1 invoked** against problem-statement v2 (cwd verified post-hoc: 3dprintassistant/; almost-slip captured in scorecard). Wall time 15m 5s.
8. **Audience-overlap-survey v1 drafted in parallel** while bridge ran (~25 min). ~130 lines. Pre-registered analysis plan, multi-level question, web + iOS delivery, sample size targets.
9. **Bridge round 1 output processed.** 4 MUST-FIX + 6 SHOULD-FIX + 7 OPTIONAL accepted; 2 retracted (R1 worker.js self-own caught by Codex, R2 share-link backlog); 1 softened (calcPrintTime). Round-1 analysis written to PoC dir.
10. **K1 finding filed** for the bridge Claude turn 1 worker.js self-own — first K1 of the PoC; validates the multi-round-bridge quality amplifier hypothesis.
11. **First owner-asks batch surfaced** (Asks 1/2/3): analytics traffic estimate, public-reopening posture before survey UI lands, v3 production timing.
12. **Owner replied dissolving Asks 1 + 2** (audience reframe: hobby project, not user-facing) and **picked option 1 on Ask 3** (v3 in this session).
13. **K4 finding filed** for the audience-as-users assumption — owner pushback overruled the controller's judgment baked into survey v1 + v2's framing. Bridge could NOT have caught this (it requires owner-intent knowledge); structurally outside multi-round bridge's reach. Headline autonomy-ceiling data point.
14. **Problem-statement v3 produced solo** (~40 min). Replaces v2 in place (git diff = audit trail). Material changes per round-1 + reframe.
15. **Survey v1 parked.** Header rewritten to explicit PARKED status with reasoning; pattern kept for future general-feedback reference.
16. **Trigger A close in progress** (this log, INDEX prepend, ROADMAP touch, NEXT-SESSION regen, ai-om wrap-up sequence in parallel).

## Files touched (Modified / Deleted / Untracked)

**New (in `docs/resin-scaling/`):**
- `README.md` — sub-project entry point + decision the artifacts inform + standing rules
- `problem-statement.md` — v3 (drafted as v2 + revised in-session; git history shows the delta)
- `audience-overlap-survey.md` — PARKED status

**Modified (root):**
- `docs/planning/ROADMAP.md` — Active Work Queue entry for resin-scaling discovery + "Last updated" line touch
- `docs/sessions/INDEX.md` — one-bullet prepend

**Untracked at close:** the resin-scaling/ subdirectory will commit with this session's wrap commit.

**Deleted:** none.

**iOS:** untouched (`c99a797`).

## Commits

- Trigger A wrap commit — TBD at end of close (3dpa side; adds resin-scaling/ subdirectory + ROADMAP + INDEX + this log + NEXT-SESSION regen).
- Parallel ai-om side wrap commit (parent repo) — TBD; adds autonomy-poc-2026-05-resin/ + findings/{worker-js-self-own, audience-reframe-not-bridge-catchable} + ai-om INDEX prepend + ai-om CLAUDE.md state-table update.

iOS push gate: untouched; held.

## Open questions / Follow-up

- **Bridge round 2 on v3 is REQUIRED** by PoC charter ("no new claim escapes a bridge round") before downstream artifacts (technical-differences.md) cite v3. Deferred to next session. Estimated 15 min wall-time + 30 min processing.
- **Md-hygiene findings:** none surfaced this session. `Projects/CLAUDE.md` vs `Projects/AGENTS.md` not edited. No root .md stubs, no untracked .md beyond the intentional new subdirectory, no secrets, no buried durable content (this log + v3 §2 capture the load-bearing reframes).
- **v3 §9 open questions** (carried forward for bridge round 2): audience-reframe consistency through §4 Gate 2 spectrum, t-shirt sizing defensibility on C9–C15, gate-result × outcome matrix orthogonality, "park" outcome too-easy criterion risk, line-ref freshness check, residual institutional-context tension, off-axis spectrum completeness.
- **Off-axis spectrum** in v3 §4 Gate 2 (options A–G) is owner-pickable any time but most useful after Gate 1 (wizard-frame fit) has data.
- **Next session opener:** bridge round 2 on v3 + technical-differences.md drafting (Gate 1 wizard-frame-fit desk research).

## Next session

**Bridge round 2 on problem-statement v3** is the gating step. Then technical-differences.md (Gate 1) drafting.

See `docs/sessions/NEXT-SESSION.md` for the resume prompt.
