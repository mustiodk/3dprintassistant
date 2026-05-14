# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-14 after v1.0.4 S8 close. **Phase 2.1 is CLOSED — iOS now mirrors web's Phase 1 + Phase 1.5 surface byte-identically.** Web `main` at the close-commit successor of `2994d3b`. iOS `main` local-only at `fc3ee6b` (2 commits ahead of `origin/main` = `eeb2915`). **S9 cold-starts on Phase 2.2 / Task 9: UI screenshot walkthrough + MARKETING_VERSION 1.0.3 → 1.0.4 bump + 5-point ship-ready handoff. After S9 passes the 5-point check, owner manually dispatches TestFlight.**

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — S9, v1.0.4 Phase 2.2 / Task 9 (UI walkthrough + ship)

## Required skills — invoke at cold-start

Phase 2.2 is the ship gate for the v1.0.4 arc. The surface is small (UI screenshot walkthrough + a 2-line `MARKETING_VERSION` bump + one more iOS local commit) but the gate is meaningful: the 5-point ship-ready check is what unblocks the owner-manual TestFlight dispatch. Per `superpowers:using-superpowers`, "invoke relevant skills BEFORE any response or action." Load:

1. **`superpowers:using-superpowers`** — meta-discipline.
2. **`superpowers:writing-plans`** — Phase 2.2 has discrete sub-steps (UITest run, version bump, xcodegen, commit, 5-point handoff) worth a brief plan slice.
3. **`superpowers:executing-plans`** — plan-checkpoint discipline.
4. **`superpowers:requesting-code-review`** — dispatch a code-review subagent on the final iOS local commit before declaring 5-point check passed. **Validated 4-for-4 across S7-2/S7-4/S7-3/S8** — caught real coverage gaps each session.
5. **`superpowers:systematic-debugging`** — fallback if UITest fails or version bump misbehaves.
6. **`superpowers:test-driven-development`** — for any new iOS test additions (notably the S8 carry-forward: extending `AdvancedFilamentSettings` Codable struct + re-extending T2a for fan).
7. **`superpowers:verification-before-completion`** — rigid; no completion claims without fresh evidence.

Load all seven via the `Skill` tool at the start of S9. Announce each as it loads.

## Read First, In This Order

Follow Trigger C from the canonical protocol. Show progress while reading (`[🟩...⬜ N%]` bar — feedback memory: `progress_bar_every_phase`). Confirm current state, locked next step, and risks before making changes. Read:

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/CLAUDE.md` (iOS project rules — pay attention to `ScreenCaptureUITests` workflow + simulator-build `CODE_SIGNING_ALLOWED=NO` context)
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
6. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
7. Last three session logs, in full (newest first):
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s8-ios-sync.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s7-3-medium-01.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s7-4-low-01.md`
8. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md` (this file)
9. Task-specific files (THIS IS THE WORK — Phase 2.2 ship gate):
   - **Canonical v1.0.4 plan Task 9:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-05-13-v1.0.4-config-impact.md` — Phase 2.2 / Task 9 section.
   - **S8 plan** (for context on what just shipped): `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-05-14-s8-phase-2-1-ios-sync.md`.
   - **iOS project.yml:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/project.yml` — locate `MARKETING_VERSION: 1.0.3`.
   - **iOS ScreenCaptureUITests:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistantUITests/` — verify pattern + outputs at `/tmp/ui-review/`.

## Current State

- **v1.0.3 is live worldwide on the App Store.** Remote overlay `content_version=2026051202` adds i7 under Creality / i Series.
- **v1.0.4 Phase 1 COMPLETE** (7/7 web tasks shipped; 11 cumulative walkthrough OK lines).
- **v1.0.4 Phase 1.5 CLOSED** (HIGH-01 ✅ + HIGH-02 ✅ + MEDIUM-01 ✅ + LOW-01 ✅).
- **v1.0.4 Phase 2.1 CLOSED.** iOS HEAD `fc3ee6b` (local-only) carries byte-identical engine + data from web HEAD `2994d3b`; 11 new `testV104_*` mirror tests in `EngineServiceTests.swift`; iOS XCTest 96 → 107 unit (108 incl. ScreenCaptureUITests); all green.
- **Web `main`** at the close-commit successor of `2994d3b` (run `git log --oneline -2` at session start to confirm exact HEAD — should be a docs-only commit titled `docs: wrap S8 ...`).
- **iOS `main` LOCAL** at `fc3ee6b` — 2 commits ahead of `origin/main` (`eeb2915`). Phase 2 gate: do not push until 5-point check passes.
- **Phase shape:** Phase 1 ✅ → Phase 1.5 CLOSED ✅ → Phase 2.1 CLOSED ✅ → **S9 Phase 2.2 / Task 9 (THIS SESSION)** → owner manually dispatches TestFlight.

## Recommended First Lane — S9 Phase 2.2 / Task 9 (UI walkthrough + ship)

### What "Task 9" actually means

From the canonical v1.0.4 plan: run the iOS UI screenshot walkthrough (`ScreenCaptureUITests/testCaptureAllScreens`) to confirm no visible regression from the new engine + data, bump `MARKETING_VERSION` from `1.0.3` to `1.0.4`, regenerate the Xcode project file via `xcodegen`, land a second iOS local commit, run the 5-point ship-ready check, and hand off to the owner for manual TestFlight dispatch.

### Concrete surface

1. **(Optional but recommended) S8 carry-forward fan extension** — small additive Codable change at `3DPrintAssistant/Engine/EngineService.swift:70-78` to add `fan_min_speed` + `fan_max_speed` to `AdvancedFilamentSettings`, plus decoder. Then re-extend `testV104_T2a_EnvDataLayerCold` to assert fan reduction on the Advanced surface (closes the only iOS-side coverage gap in the v1.0.4 mirror). Owner decision: do this in S9 or defer to v1.0.5. If doing it in S9, land it BEFORE the version bump so the test suite is 100% mirrored before ship.

2. **UI screenshot walkthrough** — run the existing pattern from iOS CLAUDE.md:
   ```bash
   cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
     xcodebuild test-without-building -project 3DPrintAssistant.xcodeproj \
       -scheme 3DPrintAssistant \
       -destination 'platform=iOS Simulator,id=5F8312F5-B1C2-46C8-8DE3-E9355475DCAF' \
       -derivedDataPath build \
       -only-testing:3DPrintAssistantUITests/ScreenCaptureUITests/testCaptureAllScreens \
       CODE_SIGNING_ALLOWED=NO
   ```
   The id `5F8312F5-B1C2-46C8-8DE3-E9355475DCAF` is the iPhone 17 Pro simulator (verified in S8). Spot-check the resulting `/tmp/ui-review/pro/01-home.png` through `09-checklist.png` for any visible regression from the new engine + data (e.g., new warnings rendered weirdly, profile values displayed unexpectedly).

3. **Bump `MARKETING_VERSION` 1.0.3 → 1.0.4** in `project.yml`:
   ```bash
   sed -i.bak 's/MARKETING_VERSION: 1\.0\.3/MARKETING_VERSION: 1.0.4/g' project.yml && \
     rm project.yml.bak && \
     xcodegen generate && \
     grep -n 'MARKETING_VERSION' 3DPrintAssistant.xcodeproj/project.pbxproj | head -4
   ```
   Expected: `MARKETING_VERSION = 1.0.4;` lines present in `project.pbxproj`.

4. **Second iOS local commit** — covers `project.yml` + regenerated `3DPrintAssistant.xcodeproj/project.pbxproj` (+ optionally the AdvancedFilamentSettings + T2a re-extension if that was bundled). Subject: `chore: bump MARKETING_VERSION to 1.0.4 + UI walkthrough fixtures (S9)` or similar.

5. **Internal code-review subagent on the second commit** — same pattern as S8 (4-for-4 streak). SHA range = `fc3ee6b..<new HEAD>`. Tightening commit if reviewer surfaces Important findings.

6. **5-point ship-ready check:**
   - [ ] All planned changes for v1.0.4 are landed (Phase 1 + Phase 1.5 + Phase 2.1 + Phase 2.2 carry-forwards).
   - [ ] iOS XCTest green (107 unit + 1 UI = 108 minimum; possibly more if T2a is re-extended).
   - [ ] Web walkthrough harness green (11 cumulative v1.0.4 OK lines + curated + DQ-2 + matrix-audit + validate-data — same gate as Phase 1.5 sessions).
   - [ ] `MARKETING_VERSION` bumped to 1.0.4 + xcodegen regenerated `.pbxproj`.
   - [ ] Owner ready to dispatch TestFlight via `gh workflow run testflight.yml --ref main` from iOS repo.

7. **Trigger A close.** Session log → INDEX prepend (mark Phase 2.2 closed) → ROADMAP header/queue update → NEXT-SESSION regen for post-v1.0.4 lane (TestFlight monitoring; v1.0.4 → v1.0.5 planning) → memory sweep → vault sweep → self-check.

8. **Owner-manual TestFlight dispatch.** After the 5-point check passes and the owner confirms, owner runs `gh workflow run testflight.yml --ref main` from the iOS repo. iOS push to `origin/main` happens as part of the ship sequence (typically right before or right after the TestFlight dispatch, depending on owner preference — both `fc3ee6b` and the S9 commit need to be on `origin/main` before TestFlight builds against them).

### Stop conditions / blockers

- **UI walkthrough surfaces a visible regression** — read the regressing screen's view + recent engine/data changes; diagnose before fixing. The 11 XCTest mirrors won't catch a visual issue (e.g., warning copy length blowing out the card on iPhone SE).
- **`xcodegen generate` fails** or `project.pbxproj` doesn't show `MARKETING_VERSION = 1.0.4;` after — `xcodegen` is finicky about `project.yml` indentation; check the diff first.
- **Reviewer surfaces Critical or 3+ Important findings** — pause; this likely means the v1.0.4 surface has structural issues that warrant owner adjudication, not autonomous remediation.
- **5-point check item fails** (e.g., a regression test goes red on web after `git pull`) — pause; do not hand off to owner with a known-broken state.

### Procedure

1. **`git status` in web + iOS.** Confirm clean state. Web HEAD = S8 close commit; iOS HEAD `fc3ee6b`, local ahead of origin/main by 2.
2. **Read project.yml + iOS CLAUDE.md UITest pattern** in full.
3. **(Optional) S8 fan-coverage carry-forward:** decide with owner whether to land in S9 or defer.
4. **Run ScreenCaptureUITests** + spot-check generated PNGs.
5. **Bump MARKETING_VERSION via sed + xcodegen generate.** Verify `.pbxproj` shows 1.0.4.
6. **Stage + commit** as second iOS local commit.
7. **Dispatch internal code-review subagent** on `fc3ee6b..HEAD` SHA range; triage findings.
8. **Optional tightening commit** if Important findings.
9. **Run the 5-point ship-ready check** explicitly — produce a checklist with current state for each item.
10. **Surface "ready for owner TestFlight dispatch"** to owner with the 5-point checklist visible.
11. **NO autonomous push.** Owner authorizes push + TestFlight dispatch.
12. **Trigger A close** after owner confirms ship-ready (or after the iOS push lands, whichever comes first).

## Scope Rules

- **iOS push is owner-authorized only.** Phase 2 gate stays active through the 5-point check; owner decides whether the autonomy contract permits autonomous push after the check passes, or whether the push is owner-manual.
- **TestFlight dispatch is always owner-manual** per the standing-rule autonomy contract.
- **Byte-identity holds** — no further engine.js / data edits in S9 unless the carry-forward fan-Codable extension is bundled.
- **Internal code review subagent between impl and tightening.** Pattern is 4-for-4; keep using it.
- **TDD-first** for the fan-Codable carry-forward if bundled.
- **Verification before completion.** No "ready for ship" claims without fresh evidence of each 5-point item.
- **Trigger A close runs at session end** — Phase 2.2 closure + post-v1.0.4 lane regen.

## S8 carry-forward (relevant for S9)

- **AdvancedFilamentSettings fan-Codable extension (PRIMARY S9 OPTION).** `3DPrintAssistant/Engine/EngineService.swift:70-78` — add `fan_min_speed` + `fan_max_speed` (both String, matching the existing temperature-field pattern). Decoder at `EngineService.swift:357+` needs the new keys in the `_ProfileParamWire` decode or equivalent path. Then re-extend `testV104_T2a_EnvDataLayerCold` (line ~991 in EngineServiceTests.swift) to assert fan reduction directly via `advCold.fan_max_speed`. Small, additive, low-risk; closes the only iOS-side v1.0.4 mirror gap. **Bundle in S9 unless owner defers.**
- **TDD-RED breadcrumb pattern** (reviewer M-4 from S8). Either leave a `// RED demo verified YYYY-MM-DD` comment in tests where the demo ran, OR do the RED in a tiny separate commit before flipping. Closes the "self-reported only" gap.
- **Exact-IDs-over-substring-matchers discipline** (now codified as a feedback memory after S8). Apply when adding any new iOS test that mirrors a web warning-ID assertion — grep web source for the exact ID first, mirror with `==` or `.contains(exactId)`, not speculative substring filters.

## After S9

- **TestFlight monitoring.** Once the v1.0.4 TestFlight build is dispatched and the binary lands, monitor for Apple review acceptance + on-device behavior.
- **v1.0.4 → v1.0.5 transition.** Deferred v1.0.4 findings (Codex MEDIUM-02 + OBSERVATION-01 per Phase 1.5 triage) move into v1.0.5 scope. The deferred IR backlog + DQ-3/4/5 also remain candidates depending on owner priority.
- **S7-3 carry-forwards still pending** (math duplication 3× in engine.js, profile-matrix-audit env-axis blind spot, smoke assertion for emitted-vs-claimed bed parity, mobile-card warning text length check). Land before any next bed-formula touch or as a v1.0.5 hygiene pass.
- **Shared `RETIRED_IDS` const array** (S7-4 carry-forward). Multi-arc audit; still deferred.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
