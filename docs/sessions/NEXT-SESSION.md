# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-13 after S3 v1.0.4 impl close (Task 4 shipped; web HEAD at the S3-close commit on top of `bf05586`; iOS HEAD `eeb2915` untouched).

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — S4, v1.0.4 Phase 1 Task 5 (practical multicolor tiers — 5-tier MCS resolver)

## Read First, In This Order

Follow Trigger C from the canonical protocol. Show progress while reading. Confirm current state, locked next step, and risks before making changes. Read:

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
6. Last three session logs, in full:
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s3-impl.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s2-impl.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-setup.md`
7. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md`
8. Task-specific files (THIS IS THE WORK):
   - **Source of truth for scope:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/reviews/2026-05-11-config-impact-qa/merged.md`
   - **Per-task implementation plan (TDD-first), Task 5 section ~line 540-650:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-05-13-v1.0.4-config-impact.md`
   - **Walkthrough harness pattern:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/scripts/walkthrough-harness.js`
   - **Profile matrix audit:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/scripts/profile-matrix-audit.js`

## Current State

- **v1.0.3 is live worldwide on the App Store.** Remote overlay `content_version=2026051202` adds `sparkx_i7` under Creality / i Series for current 1.0.3 clients.
- **v1.0.4 S3 (impl) is complete.** S3 shipped Task 4 of 7 Phase 1 web tasks: physical printer × plate guard + material plate range bundle (HIGH-02 + HIGH-03 material half), web `bc070af` (impl) + `bf05586` (fixup with full bed-temp recipe). Cumulatively, S2 + S3 have shipped 4 of 7 Phase 1 web tasks.
- **Walkthrough harness has 5 cumulative v1.0.4 OK lines** (HIGH-09, ENV, MEDIUM-05, HIGH-01, HIGH-02/HIGH-03). Profile-matrix-audit clean across 55/55 curated + 47196/0 broad configs at every commit.
- **Web `main` is at the S3-close commit on top of `bf05586`. iOS `main` is at `eeb2915` (untouched).**
- **Bambu export-path gap from Task 2 is deferred** under ROADMAP "IR-deferred export-path findings" with TODOs at `engine.js` ~2493 and ~2863. Bundle with Phase 2.7a re-enable; NOT v1.0.4 scope.
- **Asymmetric helper API surface** (`getCompatibleNozzlesForPrinter` exists but `getCompatiblePlatesForPrinter` does not) flagged in S3, controller-deferred. Worth resolving in a late-v1.0.4 task or v1.0.5 cleanup if app.js ever consumes either helper.

## Recommended First Lane

This is S4 of the multi-session autonomous arc. Owner is out of the screen during execution; per-finding checkpoint rule applies.

1. **Run `git status` in web and iOS** to confirm clean state. If not clean, surface diff before any work.
2. **Execute Task 5** of the implementation plan (practical multicolor tiers — 5-tier MCS resolver). Touches 4 engine sites (engine.js:1431, 1469-1505, 2170-2179, 1310-1317) and bundles 3 sub-findings (mutual HIGH `ams_lite_compatible` + Claude HIGH-03 system-type + Codex MEDIUM-01 empty-MCS):
   - Write the failing walkthrough assertion block at `scripts/walkthrough-harness.js`. **Use exact-value / exact-ID assertions from the start** (S2-learned). **Use the new exact warning IDs** (`mcs_empty_no_multicolor`, `ams_lite_material_incompat`, etc.) rather than reusing existing IDs that may confuse the test contract.
   - Run the harness to confirm it fails red.
   - Implement per the plan's Task 5 section, reading engine.js at execution time for surrounding context at all 4 sites.
   - **When replicating engine logic in warning-side checks, MIRROR THE FULL RECIPE** (S3-learned) — don't use simplified subsets. The S3 Task 4 fixup surfaced 3 silent-regression PETG combos this exact mistake would have missed; initial-layer cases (and tier-boundary cases for MCS) are precisely where warnings need to fire most.
   - Run the harness to confirm green.
   - Run the full verification gate: `validate-data` + walkthrough (no `❌` rows) + `profile-matrix-audit` (0 curated + 0 broad failures).
   - Commit (one finding = one commit) + push to `origin/main`.
3. **Per-finding checkpoint** after Task 5 commit. Task 5 alone may saturate S4 given the 4 engine-site footprint and 3 bundled sub-findings — OK to wrap after Task 5 alone via Trigger A close. If context is light and Task 6 (chamber safe-cap, guard-only) looks bounded, continue.
4. **Continue per-finding** until either: a stop condition fires (Trigger B handoff with diagnostic state), or the per-finding checkpoint says wrap (Trigger A close).

## Scope Rules

- **Autonomy authorization (active from S1 onward):** autonomous web commits + push to `main` OK; autonomous Trigger A close at session end OK; autonomous iOS *local* commits OK. **No autonomous push to iOS `main`. No autonomous TestFlight dispatch. No autonomous Codex peer review.**
- **TDD discipline non-negotiable.** Assertion lands red before impl. Walkthrough is the testing contract.
- **One finding = one commit per platform.** Don't bundle unrelated findings. (Task 5 itself is a bundle of 3 sub-findings per the plan; that bundling is the plan's scope, not a violation.)
- **Provenance on every new `resolveProfile` emission.** Source: `vendor` / `default` / `rule` / `calculated`.
- **IMPL-040 chip parity** for any new chip text (prefix generator + iOS XCTest assertion).
- **Verification gate per finding** is mandatory: validate-data → walkthrough (no `❌`) → profile-matrix-audit (0/0 failures) → UI smoke if visible.
- **Stop conditions** that trigger abort + Trigger B: regression outside scope; byte-identity break vs iOS; finding balloons ≥3× expected; `systematic-debugging` doesn't root-cause failure in 3 honest attempts; mid-flow adjudication needed.
- **iOS push gate** is the 5-point ship-ready check (all Phase 1 landed + green; engine + data byte-identical; iOS XCTest green; UI screenshot walkthrough green; `MARKETING_VERSION` 1.0.4). Only owner pushes iOS + dispatches TestFlight.
- **`[claude-adjudicated]` calls eligible for owner override** at any cold-start. If owner flips any at this cold-start: edit `merged.md`, re-snapshot the lock SHA, proceed.

## S3-learned addition

**When replicating engine logic in warning-side checks, MIRROR THE FULL RECIPE — don't use simplified subsets.** S3's Task 4 first-pass used a steady-state-only bed-temp recipe (`bs.bed_temp_base + bedAdj`), but the real recipe adds `initial_layer_bed_offset`, a PETG `+5` bump, `env.bed_first_layer_adj`, and a printer/material clamp. Three PETG-on-plate combos were silently regressing pre-fix because the warning-side simplification missed the initial-layer-only out-of-range case (steady-state 75°C in [60, 80]; initial-layer 85°C exceeds plate max 80°C). Initial-layer cases are precisely where warnings need to fire most. Same principle applies to MCS tier resolution in Task 5: mirror the full tier-boundary logic from the engine, not a simplified version.

## S2-learned reminder

**Write exact-value / exact-ID assertions in the harness from the start.** Use exact-value `===` asserts on emitted numbers and exact-ID `.includes('warning_id_exact')` on warning lists from the first commit. S3 confirmed this pattern reduces but doesn't eliminate review round-trips — different reviewer flag categories (missing coverage, recipe drift) still surface — but it consistently removes the test-tightness round-trip.

## What you'll do across S4…S∞ (skim)

Plan documents 7 web tasks + 1 iOS sync task. 4 of 7 shipped through S3 (Tasks 1, 2, 3, 4). Remaining: Task 5 (MCS practical tiers — this session's target), Task 6 (chamber safe-cap, guard-only), Task 7 (bundled HIGH-06 + Claude HIGH-06). Phase 2 (iOS sync) is a single session triggered after Phase 1 commits all land. Each web task is one commit per platform.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
