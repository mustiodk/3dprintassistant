# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-15 after v1.0.4 S9 ship close. **v1.0.4 is SHIPPED to TestFlight ([run 25892826819](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25892826819)).** Web pushed `d9e58fa..2f0ccb8` (Cloudflare auto-deploy). iOS pushed `eeb2915..c99a797` (10 commits flushed; 0 ahead of `origin/main`). Reviewer-pattern 7-for-7 across v1.0.4 arc. No audit gate remaining; no known bugs left to fix for v1.0.4 per owner's bar.

The next session has two flavours, owner-pick:
- **(a) v1.0.4 live monitoring** — TestFlight + App Store review + analytics + Sentry + feedback.
- **(b) v1.0.5 hygiene pass cold-start** — bundle the reviewer carry-forwards into a single arc.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — v1.0.5 hygiene pass (or v1.0.4 monitoring)

## Required skills — invoke at cold-start

Same 7 remediation-arc skills as the v1.0.4 arc.

1. `superpowers:using-superpowers`
2. `superpowers:writing-plans`
3. `superpowers:executing-plans`
4. `superpowers:requesting-code-review` — reviewer-pattern is **7-for-7**. Keep using.
5. `superpowers:systematic-debugging`
6. `superpowers:test-driven-development`
7. `superpowers:verification-before-completion`

Load all seven via the `Skill` tool. Announce each.

## Read First, In This Order

Follow Trigger C. Show the `[🟩...⬜ N%]` progress bar at every phase. Confirm current state + locked next step + risks before any changes.

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/CLAUDE.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md` — note the new OBS-01 "Known asymmetry" callout.
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
6. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
7. Last three session logs (newest first):
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s9-bug-free-ship.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s8-7-codex-cleanup.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s8-5-codex-findings.md`
8. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md` (this file)

## Current State (verify at session start)

- **v1.0.4 SHIPPED to TestFlight 2026-05-15** ([run 25892826819](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25892826819)).
- **Web HEAD** = S9 close commit (verify via `git log --oneline -2`; expect close commit + `2f0ccb8`).
- **iOS HEAD `c99a797`** pushed; `git rev-list --count origin/main..HEAD` = 0.
- **iOS XCTest:** 109/109 unit + 1 UI green.
- **Walkthrough harness:** 11 v1.0.4 OK lines all green. validate-data 6/6. matrix-audit 47196/0 broad + 55/55 curated.

## Lane A — v1.0.4 live monitoring

1. Check TestFlight build status (`gh run view <run-id> --repo mustiodk/3dprintassistant-ios`).
2. App Store Connect: review status + reviewer feedback.
3. `/analytics` dashboard (admin token) — Product lens (`All` / `Web` / `iOS`).
4. Discord `#web-app-feedback` (iOS feedback also lands here until `CRITICAL-001-followup` lands).
5. Sentry — new issues since 2026-05-15.

## Lane B — v1.0.5 hygiene pass

**Scope (carry-forward bundle):**

- **From S9 reviewer:**
  - **Min-1** PLA-only S9 Obs1 test coverage — add PETG `"12 s"` + ABS `"15 s"` assertions to `testV104_S9_iOS_Obs1_AdvancedCoolingExposesSlowLayerTime`.
  - **Min-2** NSNumber decoder dead-code path in `sync_getAdvancedFilamentSettings` slow_layer_time branch — either delete or refactor materials.json to raw Int + format in view.
- **From S8.7 reviewer:**
  - **m2** test name clarity — rename `testV104_S8_7_CoolingUI_AdvancedSourceIsEnvScaled` to `testV104_S8_7_CoolingAdvancedScaledLessThanRawForPlaCold` (asserts on bridge, not UI).
- **From S8.5 reviewer:**
  - Helper extraction (math duplication 4 sites — `_computeEnvScaledFan` + `_computeInitBedTarget`).
  - TDD-RED breadcrumb retroactive for F1/F2/F3 (optional artifact).
  - Walkthrough hardcoded baseline (`Math.round(100 * 0.9)` derivation from materials.json).
- **From S7-N reviewer:**
  - `isPETG ? 5 : 0` magic constant.
  - profile-matrix-audit env-axis blind spot (= Codex MEDIUM-02; Codex itself said the current report text is accurate — decide whether to rename release claim OR expand sweep axes).
  - mobile-card warning text length check.
  - smoke assertion for emit-vs-claim parity.
  - shared `RETIRED_IDS` const array.
- **From Codex post-S8.7:**
  - **F2** doc breadcrumb tightening at `docs/ai-collab.md:135-153` (Codex called it "process evidence, not a product error" — owner-optional).

**Scope rules:** none of these are bugs. They are refactors / test-strength / doc-clarity. One arc, one or two ship commits, mostly low-risk. Apply the same bug-vs-hygiene split discipline in reverse: this whole arc IS the v1.0.5 hygiene release.

**Ship-ready check for v1.0.5:** same 5-point pattern, MARKETING_VERSION 1.0.4 → 1.0.5, owner-authorized push + TestFlight dispatch.

## Scope Rules

- **iOS push is owner-authorized only** (gate stays active by default; S9 was owner-explicit "push to testflight").
- **TestFlight dispatch is always owner-manual** per the standing autonomy contract (S9 was explicit auth from session-start directive).
- **Internal code-review subagent between impl + tightening.** 7-for-7 pattern; keep using.
- **Verification-before-completion** rigid.
- **Trigger A close runs at session end.**

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
