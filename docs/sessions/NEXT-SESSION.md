# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-13 after S2 v1.0.4 impl close (Tasks 1, 2, 3 shipped; web HEAD at the S2-close commit on top of `b238a82`; iOS HEAD `eeb2915` untouched).

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — S3, v1.0.4 Phase 1 Task 4 (physical printer × plate guard + material plate range)

## Read First, In This Order

Follow Trigger C from the canonical protocol. Show progress while reading. Confirm current state, locked next step, and risks before making changes. Read:

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
6. Last three session logs, in full:
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s2-impl.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-setup.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-12-cowork-appdev-sparkx-i7-overlay-hotfix.md`
7. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md`
8. Task-specific files (THIS IS THE WORK):
   - **Source of truth for scope:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/reviews/2026-05-11-config-impact-qa/merged.md`
   - **Per-task implementation plan (TDD-first), Task 4 section:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-05-13-v1.0.4-config-impact.md`
   - **Walkthrough harness pattern:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/scripts/walkthrough-harness.js`
   - **Profile matrix audit:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/scripts/profile-matrix-audit.js`

## Current State

- **v1.0.3 is live worldwide on the App Store.** Remote overlay `content_version=2026051202` adds `sparkx_i7` under Creality / i Series for current 1.0.3 clients.
- **v1.0.4 S2 (impl) is complete.** S2 shipped 3 of 7 Phase 1 web tasks: Task 1 (strength `speed_multiplier`, web `133be38` + `246171d`), Task 2 (env data layer + cold-warning copy + env clamp attribution, web `f7b34f1` + `d959537`), Task 3 (physical printer × nozzle guard, web `1724f86` + `b238a82`).
- **Walkthrough harness has 4 cumulative v1.0.4 OK lines** (HIGH-09, ENV, MEDIUM-05, HIGH-01). Profile-matrix-audit clean across 55/55 curated + 47196/0 broad configs at every commit.
- **Web `main` is at the S2-close commit on top of `b238a82`. iOS `main` is at `eeb2915` (untouched).**
- **Bambu export-path gap from Task 2 is deferred** under ROADMAP "IR-deferred export-path findings" with TODOs at `engine.js` ~2493 and ~2863. Bundle with Phase 2.7a re-enable; NOT v1.0.4 scope.

## Recommended First Lane

This is S3 of the multi-session autonomous arc. Owner is out of the screen during execution; per-finding checkpoint rule applies.

1. **Run `git status` in web and iOS** to confirm clean state. If not clean, surface diff before any work.
2. **Execute Task 4** of the implementation plan (physical printer × plate guard + material plate range — HIGH-02 / HIGH-03):
   - Write the failing walkthrough assertion at `scripts/walkthrough-harness.js`. **Use exact-value / exact-ID assertions from the start** (see S2-learned addition below).
   - Run the harness to confirm it fails red.
   - Implement per the plan's Task 4 section, reading engine.js at execution time for surrounding context.
   - Run the harness to confirm green.
   - Run the full verification gate: `validate-data` + walkthrough (no `❌` rows) + `profile-matrix-audit` (0 curated + 0 broad failures).
   - Commit (one finding = one commit) + push to `origin/main`.
3. **Per-finding checkpoint** after Task 4 commit. If context is light and Task 5 (MCS practical tiers) looks bounded, continue to Task 5. Tasks 5 and 6 (chamber safe-cap) are larger than Tasks 1–3 — expect to wrap mid-Task-5 or after Task 4 alone via Trigger A close.
4. **Continue per-finding** until either: a stop condition fires (Trigger B handoff with diagnostic state), or the per-finding checkpoint says wrap (Trigger A close).

## Scope Rules

- **Autonomy authorization (active from S1 onward):** autonomous web commits + push to `main` OK; autonomous Trigger A close at session end OK; autonomous iOS *local* commits OK. **No autonomous push to iOS `main`. No autonomous TestFlight dispatch. No autonomous Codex peer review.**
- **TDD discipline non-negotiable.** Assertion lands red before impl. Walkthrough is the testing contract.
- **One finding = one commit per platform.** Don't bundle unrelated findings.
- **Provenance on every new `resolveProfile` emission.** Source: `vendor` / `default` / `rule` / `calculated`.
- **IMPL-040 chip parity** for any new chip text (prefix generator + iOS XCTest assertion).
- **Verification gate per finding** is mandatory: validate-data → walkthrough (no `❌`) → profile-matrix-audit (0/0 failures) → UI smoke if visible.
- **Stop conditions** that trigger abort + Trigger B: regression outside scope; byte-identity break vs iOS; finding balloons ≥3× expected; `systematic-debugging` doesn't root-cause failure in 3 honest attempts; mid-flow adjudication needed.
- **iOS push gate** is the 5-point ship-ready check (all Phase 1 landed + green; engine + data byte-identical; iOS XCTest green; UI screenshot walkthrough green; `MARKETING_VERSION` 1.0.4). Only owner pushes iOS + dispatches TestFlight.
- **`[claude-adjudicated]` calls eligible for owner override** at any cold-start. If owner flips any at this cold-start: edit `merged.md`, re-snapshot the lock SHA, proceed.

## S2-learned addition

**Write exact-value / exact-ID assertions in the harness from the start.** S2's code-quality reviewer flagged loose inequalities (Task 1: `bedCold > bedNormal`) and loose regex (Task 3: `/nozzle_not_on_printer|printer_nozzle/i.test(id)`) on every task, and the fix in every case was tightening to exact numeric values / exact-ID `.includes()`. The fixup-cycle was avoidable. Use exact-value `===` asserts on emitted numbers and exact-ID `.includes('warning_id_exact')` on warning lists from the first commit.

## What you'll do across S3…S∞ (skim)

Plan documents 7 web tasks + 1 iOS sync task. 3 of 7 shipped in S2. Remaining: Task 4 (plate guard + material plate range), Task 5 (MCS practical tiers), Task 6 (chamber safe-cap), Task 7 (bundled HIGH-06 + Claude HIGH-06). Phase 2 (iOS sync) is a single session triggered after Phase 1 commits all land. Each web task is one commit per platform.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
