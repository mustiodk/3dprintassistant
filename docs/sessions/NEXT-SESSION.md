# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-14 after v1.0.4 S7-3 close. **Phase 1.5 is CLOSED — all 4 owner-triaged web findings shipped** (HIGH-01 ✅ + HIGH-02 ✅ + MEDIUM-01 ✅ + LOW-01 ✅). Web `main` at the close-commit successor of `58d919b`. iOS `main` still at `eeb2915` (untouched since 2026-04-27 era — Phase 2 gate stays active until S9 wraps). **S8 cold-starts on Phase 2.1 / Task 8: byte-identical engine + data sync to iOS + XCTest mirroring + one iOS local commit (no push).**

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — S8, v1.0.4 Phase 2.1 / Task 8 (iOS engine + data sync)

## Required skills — invoke at cold-start

The Phase 2.1 surface is mechanical sync (byte-identical `cp`) but **not pure copy** — XCTest assertions need to be mirrored / added for the v1.0.4 surface, and the engine.js + data files must be confirmed byte-identical post-sync via `diff`. Per `superpowers:using-superpowers`, the rule is "invoke relevant skills BEFORE any response or action." Load:

1. **`superpowers:using-superpowers`** — meta-discipline.
2. **`superpowers:writing-plans`** — Phase 2.1 has more surface than a single-finding remediation (engine + data + XCTest); a brief plan slice is worthwhile.
3. **`superpowers:executing-plans`** — plan-checkpoint discipline.
4. **`superpowers:requesting-code-review`** — dispatch a code-review subagent on the iOS local commit before declaring Phase 2.1 done. Validated across S7-2 / S7-4 / S7-3 — caught real Important findings each time. Don't skip.
5. **`superpowers:systematic-debugging`** — XCTest failures during sync are likely; this is the fallback when GREEN doesn't land cleanly.
6. **`superpowers:test-driven-development`** — for any new XCTest assertions that need to mirror walkthrough behaviors.
7. **`superpowers:verification-before-completion`** — rigid; no completion claims without fresh evidence.

Load all seven via the `Skill` tool at the start of S8. Announce each as it loads.

## Read First, In This Order

Follow Trigger C from the canonical protocol. Show progress while reading. Confirm current state, locked next step, and risks before making changes. Read:

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/CLAUDE.md` (iOS project rules; check the cross-device UITest workflow + simulator-build context)
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
6. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
7. Last three session logs, in full (newest first — all three are S7-N Phase 1.5 commits):
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s7-3-medium-01.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s7-4-low-01.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s7-2-high-02.md`
8. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md` (this file)
9. Task-specific files (THIS IS THE WORK — Phase 2.1 iOS sync):
   - **Canonical v1.0.4 plan Task 8:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-05-13-v1.0.4-config-impact.md` — Phase 2.1 / Task 8 section (engine + data byte-identical sync + iOS XCTest).
   - **iOS XCTest target current state:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistantTests/` — current count was 64 tests (per S7-1 log; verify before adding). Identify which tests mirror engine behaviors that v1.0.4 changed (env compensation, MCS tiers, nozzle min-diameter, chamber safe-cap, PLA heat-creep / cold-chamber safety, bed-clamp attribution).
   - **Codex audit response (reference for what behaviors landed):** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-response.md` — all 4 Phase 1.5 findings.

## Current State

- **v1.0.3 is live worldwide on the App Store.** Remote overlay `content_version=2026051202` ships i7 under Creality / i Series.
- **v1.0.4 Phase 1 COMPLETE (7/7 web tasks).** 11 cumulative v1.0.4 walkthrough OK lines.
- **v1.0.4 Phase 1.5 CLOSED:** HIGH-01 ✅ (S7-1, `eaf3f09`) + HIGH-02 ✅ (S7-2, `a4b8873` + `f2aa84f`) + LOW-01 ✅ (S7-4, `d863635` + `bc9c655`) + MEDIUM-01 ✅ (S7-3, `243be51` + `58d919b`).
- **Web `main`** at the close-commit successor of `58d919b` (run `git log --oneline -2` at session start to confirm exact HEAD).
- **iOS `main` at `eeb2915`** (untouched since 2026-04-27 era — about 18 days of web changes to sync). Phase 2 gate active.
- **Phase shape:** Phase 1 ✅ → Phase 1.5 CLOSED ✅ → **S8 Phase 2.1 / Task 8 (THIS SESSION)** → S9 Phase 2.2 / Task 9 → owner manually dispatches TestFlight.

## Recommended First Lane — S8 Phase 2.1 / Task 8 (iOS engine + data sync)

### What "Task 8" actually means

From the canonical v1.0.4 plan: **byte-identical sync of `engine.js` + `data/*.json` from web → iOS**, plus XCTest target updates so the iOS test suite continues to assert the same behaviors the web walkthrough harness asserts. The sync itself is mechanical `cp`; the XCTest layer requires deliberate updates because XCTest assertions don't auto-mirror the walkthrough.

### Concrete surface

1. **`cp` the source files:**
   - `engine.js` → `3dprintassistant-ios/3DPrintAssistant/Resources/Engine/engine.js` (verify exact destination via existing iOS structure).
   - `data/*.json` → `3dprintassistant-ios/3DPrintAssistant/Resources/Data/*.json` (or equivalent — check actual path in iOS bundle structure).
   - **Verify byte-identity** via `diff` post-cp. The "byte-identical" rule is load-bearing for behavior parity.

2. **XCTest update inventory.** Walk through what's NEW in v1.0.4 (Phase 1 + Phase 1.5) that didn't exist at iOS HEAD `eeb2915`:
   - Strength `speed_multiplier` wiring (S2 Task 1, HIGH-09 / HIGH-04).
   - Env data layer + cold-warning copy fix + env clamp attribution (S2 Task 2, HIGH-07/08 + MEDIUM-05).
   - Physical printer × nozzle guard (S2 Task 3, HIGH-01).
   - Physical printer × plate guard + material plate range (S3 Task 4, HIGH-02 / HIGH-03).
   - 5-tier MCS resolver (S4 Task 5).
   - Chamber safe-cap guard (S5 Task 6, HIGH-05) — extended to PLA in S7-2.
   - Nozzle min-diameter cleanup + nozzle-side authority drop (S5 Task 7, HIGH-12 / HIGH-06).
   - Phase 1.5 HIGH-01: env-fan / draft_shield wired through live export surfaces.
   - Phase 1.5 HIGH-02: PLA cold/chamber safety (safe_chamber_temp_max on PLA-family + pla_heat_creep extended to active enclosures + getChecklist + env-warning material-aware filter).
   - Phase 1.5 LOW-01: retired-warning-ID negative assertions (test-only — no engine surface change).
   - Phase 1.5 MEDIUM-01: bed-clamp attribution honesty (env first-layer bed warning rewrite + printer_max_bed_temp_clamped initTarget includes bed_first_layer_adj).

   For each, decide: (a) does an existing XCTest cover it (post-`cp`)?; (b) does it need a new test mirroring a walkthrough harness assertion?; (c) is it pure-web (export-surface stuff Codex caught) that has no iOS analog and stays uncovered?

3. **Run iOS XCTest** post-sync + post-new-tests. Expect: 64 tests → some N >= 64 (depends on additions). Must be all green. Use whichever local Xcode / xcodebuild command is documented in iOS CLAUDE.md.

4. **ONE iOS local commit.** Subject line should follow the existing convention (check `git log --oneline` on iOS HEAD for examples). Body: list the sync + each XCTest addition. **No push.** Phase 2 gate remains until S9's 5-point ship-ready check passes.

### Stop conditions / blockers

- iOS XCTest fails on a behavior that web walkthrough asserts is correct → likely a data-shape decode issue (iOS Codable layer); diagnose carefully before patching. The "forgiving Codable layer" standing rule (3dpa-context.md #9) usually handles additive fields without changes, but breaking data-shape changes might need iOS adjustment.
- A web behavior has no clean iOS-side test surface (e.g., harness directly tests `formatProfileAsText` which iOS might not expose) → surface to owner before working around it.
- iOS XCTest target / project structure changed materially since iOS HEAD `eeb2915` (unlikely but possible if a forgotten WIP commit landed) → confirm clean state first.

### Procedure

1. **`git status` in web + iOS.** Confirm clean state. Web HEAD post-S7-3 close-commit; iOS HEAD `eeb2915`.
2. **Read iOS CLAUDE.md + tests target structure.** Understand the test naming convention + the engine bridge.
3. **`cp` web engine.js + data/*.json → iOS** in one batch.
4. **`diff -q` byte-identity check** post-cp.
5. **XCTest update pass.** For each new v1.0.4 behavior in the inventory above: locate the existing test (if any), add new assertions if needed. TDD-RED first when adding genuinely new tests.
6. **Run iOS XCTest.** Expect all green. Use the documented local command from iOS CLAUDE.md.
7. **Internal code review subagent on the resulting iOS local commit.** SHA range will be iOS HEAD pre-commit → iOS HEAD after. Stress: byte-identity correctness, XCTest coverage gaps, any web-only behaviors that should have iOS analogs.
8. **Tightening commit if reviewer surfaces Important findings** (matches S7-2 / S7-4 / S7-3 pattern).
9. **NO push.** Phase 2 gate.
10. **Trigger A close.** Session log → INDEX prepend → ROADMAP header/queue update → NEXT-SESSION regen for S9 (Phase 2.2 / Task 9 UI walkthrough + MARKETING_VERSION bump + 5-point ship-ready handoff) → memory sweep → vault sweep → self-check.

## Scope Rules

- **iOS local commits only.** Phase 2 gate active. `git push` is blocked until S9 + 5-point ship-ready check.
- **Byte-identical web → iOS.** The "web is master, iOS mirrors" rule is the architectural foundation. Verify post-cp via `diff -q`.
- **Internal code review subagent between impl and tightening.** Pattern is now 3-for-3 on Phase 1.5; keep using it.
- **TDD-first for new XCTest assertions.** Rigid where applicable.
- **Verification before completion.** No completion claims without fresh evidence (iOS XCTest output, byte-identity diff output).
- **Trigger A close runs at session end** — Phase 1.5 closed; S8 wrap regenerates NEXT-SESSION for S9.
- **Stop conditions that abort + Trigger B:** dirty working tree before commit; iOS XCTest fails after sync and the root cause isn't trivial; iOS project structure has unexpectedly drifted.

## S7-3 carry-forward (relevant for S8 and beyond)

- **Math duplication in engine.js (3×) — Reviewer Important #1 + #2 from S7-3.** When the iOS sync lands the new bed-clamp logic, the duplication risk transitions from "web-only" to "web + iOS both copies have it." Filed as MEDIUM follow-up before any next bed-formula touch. Lift the `_computeInitBedTarget(state)` helper + data-drive `(isPETG ? 5 : 0)` at the same time.
- **profile-matrix-audit env-axis blind spot — Reviewer Minor #6 from S7-3.** The 47196-config sweep only runs `environment: 'normal'`. The new MEDIUM-01 surfaces (env first-layer bed warning copy branches, printer_max_bed_temp_clamped on cold/vcold) are entirely outside that sweep. Backlog hygiene; would catch future regressions cheaply.
- **Smoke assertion: emitted `bed_temperature_initial_layer` equals env-warning's claimed effective bed value — Reviewer Hidden assumption #1.** Single combo would pin the duplication-drift between getAdvancedFilamentSettings and the env warning. Land alongside the helper extraction.
- **Visual mobile-card check on warning text length — Reviewer Minor #7.** Partial-clip wording (~140 chars) is the longest new copy in the v1.0.4 arc. Visual smoke before next release; specifically the smallest mobile breakpoint where chip/warning cards live.
- **Shared `RETIRED_IDS` const array (S7-4 follow-up).** Multi-arc audit beyond v1.0.4 scope; still deferred.
- **Internal code-review subagent caught a substantive Important finding for the THIRD consecutive Phase 1.5 session.** S7-2 → PVA scope creep; S7-4 → Creality empty-MCS mis-targeting; S7-3 → partial-clip branch dead-untested. Three-for-three pattern reinforces the standing-rule: for any multi-branch / multi-surface remediation, dispatch the reviewer between impl and tightening commits BEFORE push.

## After S8

- **S9 — Phase 2.2 / Task 9.** UI screenshot walkthrough on iOS Simulator; `sed`/`xcodegen` MARKETING_VERSION bump 1.0.3 → 1.0.4; second iOS local commit (project.yml + .pbxproj + UI-walkthrough fixtures if any); 5-point ship-ready handoff. After S9 closes and the 5-point check passes, **owner manually dispatches TestFlight** via `gh workflow run testflight.yml --ref main`.
- **Owner-manual TestFlight gate.** No autonomous TestFlight per the autonomy contract.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
