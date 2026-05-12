# 2026-05-13 — Cowork (appdev): v1.0.4 setup — merged.md + implementation plan + CR3-M1

## Durable context

- **Multi-session autonomous arc locked.** v1.0.4 will execute across S1–S4+ with the per-finding checkpoint rule from the conversation (continue if next finding is bounded and context is light; wrap at clean commit boundary otherwise). Owner is explicitly out-of-loop during execution; autonomy authorization covers: autonomous web commits + push to `main`, autonomous Trigger A close per session, autonomous iOS *local* commits. **No autonomous push to iOS `main`. No autonomous TestFlight dispatch. No autonomous Codex peer review.**
- **`merged.md` is the source of truth for v1.0.4 scope.** Lock SHA snapshot `5bcd68b`. Adjudications on disputed severities (`special` flags MEDIUM, `decorative` MEDIUM, `userLevel=advanced` MEDIUM, `nozzle.not_suitable_for` MEDIUM) and two bundling decisions (MEDIUM-05 into Step 2, Claude HIGH-06 into Step 7) are tagged `[claude-adjudicated, owner-override-eligible]` — owner can flip any of them at S2 cold-start without rework.
- **The implementation plan is TDD-first per finding.** Every Phase 1 task: walkthrough assertion red → impl → green → full verification gate → commit. The plan documents exact assertion code (the testing contract is non-negotiable) and cites engine.js line ranges from the QA reports; the executing agent reads engine.js at execution time for surrounding context.
- **Per-finding checkpoint is the only emergent-session-size mechanism.** No pre-fixed batch size, no token budget. After each commit + green verification, decide to continue or wrap. Stop conditions (regression outside scope, byte-identity break, finding ballooning ≥3× expected, debug stuck after 3 honest attempts, mid-flow adjudication surfacing) trigger a Trigger B handoff instead of Trigger A close.
- **CR3-M1 audit-script fix is now real.** `scripts/profile-matrix-audit.js` `DEFAULT_STATE` previously had `level: 'intermediate'` which was a no-op (engine reads `state.userLevel`). 47k+ broad configs were never actually testing beginner paths. Renamed to `userLevel` — future v1.0.4 cases can add `userLevel: 'beginner'` patches with confidence.

## What happened / Actions

1. **Cold-start (Trigger C).** Followed literal Trigger C order: top-level CLAUDE.md → 3dpa CLAUDE.md → `docs/3dpa-context.md` → ROADMAP → INDEX → last 3 session logs (SPARKX i7 hotfix, v1.0.4 core planning, config-impact QA) → NEXT-SESSION. Confirmed v1.0.3 live on App Store, remote overlay `2026051202` adds i7 under Creality / i Series, v1.0.4 planning locked, `merged.md` is the next step.
2. **Multi-session autonomous-mode contract negotiated.** Owner directed that S1 starts with them at the screen and S2+ runs autonomously; per-finding checkpoint rule selected over pre-sized batches per "quality above everything"; Trigger A close between sessions; Trigger B reserved for aborted batches.
3. **`merged.md` design via `superpowers:brainstorming`.** Read both QA reports + cross-pass sections in full; proposed end-to-end design with my best-judgment adjudications flagged for owner override; owner approved with "yes"; wrote `merged.md`, self-reviewed, fixed one Step 7 ambiguity inline (drop nozzle-side arrays vs relabel — picked drop), committed as `05e85bd`.
4. **Phase 1 implementation plan via `superpowers:writing-plans`.** Read `walkthrough-harness.js` bootstrap + engine.js speed-tab path to ground Task 1 in real code; wrote a 1082-line plan covering 7 web tasks + 1 iOS sync task with full TDD assertion code per finding + key 5-15 line impl snippets + exact verification commands + commit-message templates. Plan saved at `docs/superpowers/plans/2026-05-13-v1.0.4-config-impact.md`; committed as `129d6a7`.
5. **CR3-M1 audit-script fix shipped.** `scripts/profile-matrix-audit.js` line 60: `level: 'intermediate'` → `userLevel: 'intermediate'`. Single-line surgical fix. Validation green (validate-data + walkthrough clean + profile-matrix-audit 55/55 curated + broad sweep clean). Committed as `8ff25eb` and pushed.
6. **Trigger A close (this).** ROADMAP updated (next-step line + active-queue entry + post-v1.0.3 safe-follow-up table marks CR3-M1 ✅ shipped). Session log + INDEX update + memory sweep + vault sweep + NEXT-SESSION regen + self-check.

## Files touched

**Web repo (`3dprintassistant`):**
- Created: `docs/reviews/2026-05-11-config-impact-qa/merged.md`
- Created: `docs/superpowers/plans/2026-05-13-v1.0.4-config-impact.md`
- Modified: `scripts/profile-matrix-audit.js` (one-line CR3-M1 fix)
- Modified: `docs/planning/ROADMAP.md` (header date + next-step line + active-queue entry + post-v1.0.3 safe-follow-up CR3-M1 strikethrough)
- Modified: `docs/sessions/INDEX.md` (prepended this session entry)
- Created: `docs/sessions/2026-05-13-cowork-appdev-v1.0.4-setup.md` (this log)
- Modified: `docs/sessions/NEXT-SESSION.md` (regenerated for S2 cold-start)

**iOS repo (`3dprintassistant-ios`):** none. Working tree at `origin/main`.

**Other:** none.

## Commits

**Web `3dprintassistant` `main`:**
- `05e85bd` — `docs: lock v1.0.4 config-impact merged queue`
- `129d6a7` — `docs: add v1.0.4 config-impact implementation plan`
- `8ff25eb` — `fix: profile-matrix-audit DEFAULT_STATE uses userLevel not level`
- This session-close commit — `docs: wrap S1 v1.0.4 setup` (will land after this log + INDEX + ROADMAP + NEXT-SESSION).

**iOS `3dprintassistant-ios` `main`:** none.

## Open questions / Follow-up

- **`[claude-adjudicated]` calls in `merged.md` are eligible for owner override** at S2 cold-start. The four severity calls (`special` flags MEDIUM, `decorative` MEDIUM, `userLevel=advanced` MEDIUM, `nozzle.not_suitable_for` MEDIUM) and two bundling decisions (MEDIUM-05 into Step 2, Claude HIGH-06 into Step 7) can be flipped without rework — adjust `merged.md`, re-snapshot the lock SHA, proceed.
- **Task 6 chamber safe-cap test material is provisional.** The walkthrough assertion in the plan uses X1E + PLA Basic, but PLA Basic may not have `safe_chamber_temp_max` populated in data; if so the test skips and the executing agent should pick a material that does carry the field (e.g., PETG / ASA — verify in `data/materials.json` at execution time).
- **Phase 2 iOS sync timing.** Phase 2 will ship local iOS commits but not push. Owner triggers `git push origin main` + `gh workflow run testflight.yml --ref main` after the 5-point ship-ready handoff. This intentionally batches the i7 bundled-catalog correction (already on iOS `main`) into the v1.0.4 TestFlight build — surface this in the v1.0.4 release notes.
- **Md-hygiene findings:** (1) ROADMAP "Next step" line was stale per CLAUDE.md md-hygiene checklist item 5 — fixed inline this close. (2) No root-level stubs, no untracked specs, no secret files. (3) Protocol drift check: `diff -u Projects/CLAUDE.md Projects/AGENTS.md` produces no output — byte-identical. (4) Active-queue items `[CRITICAL-001-followup]` and `[LOW-011]` remain on the list — they are intentionally orthogonal to v1.0.4 (Web Worker work, not engine) and will not be bundled.

## Memory sweep

Proposing one durable feedback memory:

- **Autonomous multi-session arc pattern (per-finding checkpoint + Trigger A between sessions).** Reusable pattern for other large multi-finding refactors: owner steps away, agent ships TDD-per-finding, decides continue/wrap at each commit boundary, Trigger A close at clean break, NEXT-SESSION regenerated for cold-start of next session. Worth saving because (a) the autonomy authorization scope (web push OK, iOS push gated, TestFlight gated) is non-trivial and reusable across future v1.0.5+ arcs, and (b) the "per-finding checkpoint over pre-sized batches" decision rule is a useful default for unpredictable-scope multi-finding work.

No other durable memory candidates. Specifically considered + rejected:
- Per-finding TDD discipline — already encoded in the standing rules + IMPL-040 + 3dpa-context.md.
- merged.md / adjudication shape — already in the file itself; not a reusable pattern outside this workstream.
- Implementation-plan size estimate (1000+ lines for 7+1 tasks) — too narrow to be useful memory.

## Vault sweep

Nothing durable to propagate. Specifically considered:
- The autonomous-arc pattern (above) is a 3dpa-internal workflow; the vault already has `Obsidian Vault/20-Areas/Development/ai-collaboration/` for cross-project patterns, but this one is specific to single-project multi-finding refactors. If the same pattern repeats on another project (e.g., bambuinventory), promote then.
- `merged.md` adjudication style — internal to this workstream.
- Implementation plan structure — internal to 3dpa.
- No new shorthand, no cross-project routing, no consulting-adjacent insight, no hobby observation, no external source to ingest.

Vault sweep: nothing durable to propagate.

## Next session

S2 cold-starts and executes Task 1 of the implementation plan. The plan documents the exact TDD assertion to write, the engine.js touch points, the verification gate, and the commit message. If context is light after Task 1 lands green, continue to Task 2; otherwise Trigger A close at the Task 1 commit boundary.

The autonomy contract carries over: web commits + pushes free; iOS local commits only; no TestFlight; no Codex peer review without owner trigger. Stop conditions remain active (regression outside scope, byte-identity break, finding ballooning ≥3×, debug stuck, mid-flow adjudication).
