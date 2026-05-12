# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-13 after S1 v1.0.4 setup (merged.md + implementation plan + CR3-M1 fix).

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — S2, v1.0.4 Phase 1 Task 1 (strength `speed_multiplier`)

## Read First, In This Order

Follow Trigger C from the canonical protocol. Show progress while reading. Confirm current state, locked next step, and risks before making changes. Read:

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
6. Last three session logs, in full:
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-setup.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-12-cowork-appdev-sparkx-i7-overlay-hotfix.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-11-cowork-appdev-v1.0.4-core-planning.md`
7. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md`
8. Task-specific files (THIS IS THE WORK):
   - **Source of truth for scope:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/reviews/2026-05-11-config-impact-qa/merged.md`
   - **Per-task implementation plan (TDD-first):** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-05-13-v1.0.4-config-impact.md`
   - **Walkthrough harness pattern:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/scripts/walkthrough-harness.js`
   - **Profile matrix audit:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/scripts/profile-matrix-audit.js`

## Current State

- **v1.0.3 is live worldwide on the App Store.** Remote overlay `content_version=2026051202` adds `sparkx_i7` under Creality / i Series for current 1.0.3 clients.
- **v1.0.4 setup is complete (S1, 2026-05-13).** `merged.md` is the owner-accepted queue (locked SHA `5bcd68b`). The implementation plan documents 7 web tasks + 1 iOS sync task with TDD assertions, impl directives, and verification commands. CR3-M1 audit-script fix is shipped (`8ff25eb`).
- **Web `main` is at `8ff25eb`. iOS `main` is at `origin/main` clean.**
- **The owner-locked planning defaults are reproduced verbatim in `merged.md`.** Adjudications on disputed severities + bundling decisions are tagged `[claude-adjudicated, owner-override-eligible]` — they can be flipped at this cold-start without rework.

## Recommended First Lane

This is S2 of the multi-session autonomous arc. Owner is out of the screen during execution; per-finding checkpoint rule applies.

1. **Run `git status` in web and iOS** to confirm clean state. If not clean, surface diff before any work.
2. **Execute Task 1** of the implementation plan (strength `speed_multiplier` wired into wall speeds):
   - Write the failing walkthrough assertion at `scripts/walkthrough-harness.js` (assertion code is in the plan, Task 1 Step 1).
   - Run the harness to confirm it fails red.
   - Implement the multiplier in `engine.js` SPEED TAB section (~line 1975-2065), inserted after `let outerSpeed = ...; let innerSpeed = ...;` and before TPU / ABS / PC / PA / MVS / printer-clamp blocks.
   - Update provenance refs at `p.outer_wall_speed` + `p.inner_wall_speed` emission sites.
   - Run the harness to confirm green.
   - Run the full verification gate: `validate-data` + walkthrough (no `❌` rows) + `profile-matrix-audit` (0 curated + 0 broad failures).
   - Commit (one finding = one commit) + push to `origin/main`.
3. **Per-finding checkpoint** after Task 1 commit. If context is light and Task 2 (env data layer + cold-warning fix + clamp attribution) looks bounded, continue to Task 2. Otherwise Trigger A close at the Task 1 commit boundary.
4. **Continue per-finding** until either: a stop condition fires (Trigger B handoff with diagnostic state), or the per-finding checkpoint says wrap (Trigger A close).

## Scope Rules

- **Autonomy authorization (confirmed S1):** autonomous web commits + push to `main` OK; autonomous Trigger A close at session end OK; autonomous iOS *local* commits OK. **No autonomous push to iOS `main`. No autonomous TestFlight dispatch. No autonomous Codex peer review.**
- **TDD discipline non-negotiable.** Assertion lands red before impl. Walkthrough is the testing contract.
- **One finding = one commit per platform.** Don't bundle unrelated findings.
- **Provenance on every new `resolveProfile` emission.** Source: `vendor` / `default` / `rule` / `calculated`.
- **IMPL-040 chip parity** for any new chip text (prefix generator + iOS XCTest assertion).
- **Verification gate per finding** is mandatory: validate-data → walkthrough (no `❌`) → profile-matrix-audit (0/0 failures) → UI smoke if visible.
- **Stop conditions** that trigger abort + Trigger B: regression outside scope; byte-identity break vs iOS; finding balloons ≥3× expected; `systematic-debugging` doesn't root-cause failure in 3 honest attempts; mid-flow adjudication needed.
- **iOS push gate** is the 5-point ship-ready check (all Phase 1 landed + green; engine + data byte-identical; iOS XCTest green; UI screenshot walkthrough green; `MARKETING_VERSION` 1.0.4). Only owner pushes iOS + dispatches TestFlight.
- **`[claude-adjudicated]` calls eligible for owner override** before S2 work starts. If owner flips any at the cold-start: edit `merged.md`, re-snapshot the lock SHA, proceed.

## What you'll do across S2…S∞ (skim)

The plan documents 7 web tasks + 1 iOS sync task. Each web task is one commit per platform. Phase 2 (iOS sync) is a single session triggered after Phase 1 commits all land. Multi-session arc; expected 3–5 sessions.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
