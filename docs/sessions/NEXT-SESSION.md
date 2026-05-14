# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-15 after v1.0.4 S8.7 close. **S8.7 shipped all 4 findings from the 2026-05-15 Codex post-S8.5 re-audit (2 Medium + 2 Low). Codex's verdict on S8.5 was GO for S9; S8.7 cleared the optional cleanup. No audit gate remains.** S9 cold-starts directly on Phase 2.2 / Task 9 ship gate mechanics.

iOS local HEAD `ad46fd3`, **7 commits ahead** of `origin/main` (`eeb2915`). Web HEAD post-S8.7-close. iOS XCTest 108 unit (107 prior + 1 new S8.7 test).

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — S9 v1.0.4 Phase 2.2 / Task 9 ship gate

## Required skills — invoke at cold-start

Same 7 remediation-arc skills as S7-N / S8 / S8.5 / S8.7. Phase 2.2 is the ship gate — the 5-point ship-ready check unblocks the owner-manual TestFlight dispatch.

1. `superpowers:using-superpowers`
2. `superpowers:writing-plans`
3. `superpowers:executing-plans`
4. `superpowers:requesting-code-review` — internal reviewer pattern is **6-for-6** across the v1.0.4 arc. Keep using.
5. `superpowers:systematic-debugging`
6. `superpowers:test-driven-development`
7. `superpowers:verification-before-completion`

Load all seven via the `Skill` tool. Announce each.

## Read First, In This Order

Follow Trigger C. Show the `[🟩...⬜ N%]` progress bar at every phase. Confirm current state + locked next step + risks before any changes.

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/CLAUDE.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
6. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
7. Last three session logs (newest first):
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s8-7-codex-cleanup.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s8-5-codex-findings.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s8-ios-sync.md`
8. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md` (this file)
9. Task-specific files (THIS IS THE WORK — Phase 2.2 ship gate):
   - **Canonical v1.0.4 plan Task 9:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-05-13-v1.0.4-config-impact.md` (Phase 2.2 / Task 9 section).
   - **iOS `project.yml`:** locate `MARKETING_VERSION: 1.0.3`.

## Current State (verify at session start)

- **v1.0.3 live worldwide on the App Store.** Remote overlay `content_version=2026051202`.
- **v1.0.4 Phase 1 + Phase 1.5 + Phase 2.1 + S8.5 + S8.7 all CLOSED.** All 4 Codex post-S8.5 audit findings remediated in S8.7. No further audit gate.
- **Web HEAD** = S8.7 close commit (verify via `git log --oneline -2`; expect the S8.7 close docs commit + `48304d3` validate-data range check just before it).
- **iOS HEAD `ad46fd3`** local-only, **7 commits ahead** of `origin/main` (`eeb2915`). Phase 2 gate active.
- **iOS XCTest:** 108/108 green (107 unit + 1 UI). One new test added in S8.7: `testV104_S8_7_CoolingUI_AdvancedSourceIsEnvScaled`.
- **Walkthrough harness:** 11 cumulative v1.0.4 OK lines, all green. validate-data 6/6. matrix-audit 47196/0 + 55/55 curated.

## Recommended First Lane — S9 Phase 2.2 / Task 9

### Concrete surface

1. **`git status` in web + iOS.** Confirm clean. Web HEAD = S8.7 close; iOS HEAD `ad46fd3`.
2. **Read iOS project.yml + iOS CLAUDE.md UITest pattern.**
3. **Run ScreenCaptureUITests** for visual regression check:
   ```bash
   cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
     xcodebuild test-without-building -project 3DPrintAssistant.xcodeproj \
       -scheme 3DPrintAssistant \
       -destination 'platform=iOS Simulator,id=5F8312F5-B1C2-46C8-8DE3-E9355475DCAF' \
       -derivedDataPath build \
       -only-testing:3DPrintAssistantUITests/ScreenCaptureUITests/testCaptureAllScreens \
       CODE_SIGNING_ALLOWED=NO
   ```
   Spot-check `/tmp/ui-review/pro/01-home.png` through `09-checklist.png` for visible regressions from v1.0.4 engine + data changes + the S8.7 cooling-UI rewrite. Pay attention to:
   - **Cooling tab Advanced mode** — should now show 3 rows (Cooling fan + Min fan speed + Overhang fan) with env-scaled values for cold/vcold (was 2 rows pre-S8.7 with raw min only).
   - Output panel fan rows (env-scaled per S8.5).
   - Warning copy for chamber-cap PLA on X1E.
   - First-layer bed warning copy for fully-clipped / partially-clipped cases.
4. **Bump `MARKETING_VERSION` 1.0.3 → 1.0.4:**
   ```bash
   sed -i.bak 's/MARKETING_VERSION: 1\.0\.3/MARKETING_VERSION: 1.0.4/g' project.yml && \
     rm project.yml.bak && \
     xcodegen generate && \
     grep -n 'MARKETING_VERSION' 3DPrintAssistant.xcodeproj/project.pbxproj | head -4
   ```
5. **Second iOS local commit** — `project.yml` + regenerated `3DPrintAssistant.xcodeproj/project.pbxproj`. Subject e.g. `chore: bump MARKETING_VERSION 1.0.3 → 1.0.4 (S9 Phase 2.2)`. iOS would be 8 commits ahead of `eeb2915` after this.
6. **Internal code-review subagent** on the final commit. SHA range = `ad46fd3..HEAD`. Same prompt template as S8.7 + S8.5 reviewers. **Pattern is 6-for-6 across v1.0.4 arc — keep using.**
7. **Tightening commit if reviewer surfaces Important findings.**
8. **5-point ship-ready check** — produce a checklist with current state for each:
   - [ ] All planned changes for v1.0.4 landed (Phase 1 + Phase 1.5 + Phase 2.1 + S8.5 + S8.7).
   - [ ] iOS XCTest green at 108 (or more if S9 added tests).
   - [ ] Web walkthrough + validate-data + profile-matrix-audit all green.
   - [ ] `MARKETING_VERSION` bumped to 1.0.4 + xcodegen regenerated.
   - [ ] Owner ready to dispatch TestFlight via `gh workflow run testflight.yml --ref main`.
9. **Surface "ready for owner TestFlight dispatch"** with the 5-point checklist visible.
10. **OWNER AUTHORIZES iOS push + TestFlight dispatch.** No autonomous push.
11. **Trigger A close** after owner confirms ship-ready.

## Scope Rules

- **iOS push is owner-authorized only.** Phase 2 gate stays active through the 5-point check.
- **TestFlight dispatch is always owner-manual** per the standing autonomy contract.
- **No additional engine.js or data/*.json changes** in S9 unless visual regression in step 3 surfaces a real bug.
- **Internal code-review subagent between impl + tightening.** 6-for-6 pattern; keep using.
- **Verification-before-completion** rigid. No "ready for ship" claims without fresh evidence per the 5-point check.
- **Trigger A close runs at session end.**

## S8.7 carry-forwards (v1.0.5)

- **Reviewer M1 — engine upper-clamp asymmetry.** Schema now rejects `fan_multiplier > 1` but `engine.js:1246` + `engine.js:2655` accept it (no upper guard). Current data spans `[0.8, 1.0]` so harmless today. 2-line v1.0.5 fix: add `&& v <= 1.0` to both engine guards.
- **Reviewer m2 — test naming clarity.** `testV104_S8_7_CoolingUI_AdvancedSourceIsEnvScaled` is framed as UI coverage but asserts on bridge values. Optional v1.0.5 rename.
- **Slow-layer-time row in iOS Advanced cooling.** Web shows 3 Advanced rows; iOS now shows 2 (Min + Overhang). Adding Slow layer time requires another `AdvancedFilamentSettings` Codable extension.

## Prior carry-forwards (still deferred to v1.0.5)

From S8.5: helper extraction (math duplication 4 sites), TDD-RED retroactive for F1/F2/F3, walkthrough hardcoded baseline.

From S7-N: math duplication 3× (now 4× post-S8.5), `isPETG ? 5 : 0` magic constant, profile-matrix-audit env-axis blind spot, mobile-card warning text length check, smoke assertion for emit-vs-claim parity, shared `RETIRED_IDS` const array. Prior Codex MEDIUM-02 + OBSERVATION-01.

## After S9 closes (TestFlight monitoring)

- Monitor App Store / TestFlight for review acceptance + on-device behavior.
- v1.0.4 → v1.0.5 transition. Bundle deferred items above into a v1.0.5 hygiene pass.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
