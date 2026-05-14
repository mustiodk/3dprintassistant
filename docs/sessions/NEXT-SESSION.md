# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-15 after v1.0.4 S8.5 close. **S8.5 fully remediated all 4 findings from the 2026-05-14 Codex post-Phase-1 audit + 1 reviewer catch.** A new Codex audit packet is ready at `codex/post-s8-5-audit/`. **Owner dispatches the new Codex packet BEFORE S9 cold-start.** If Codex returns clean (no Critical / Important), S9 mechanics open. If anything Important+ → S8.6 tightening cycle first.

iOS local HEAD `fd4761a`, 4 commits ahead of `origin/main` (`eeb2915`). Web HEAD post-S8.5-close.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — S9 (post-Codex-clean-pass), v1.0.4 Phase 2.2 / Task 9

## PREREQUISITE: Codex re-audit response is already present — read it first

**Codex response file landed 2026-05-15 at:**
`codex/post-s8-5-audit/codex-2026-05-15-post-s8-5-audit-response.md` (committed as untouched-by-Claude — owner wanted fresh eyes next session). Codex also dropped diff/log/stat helpers in the same dir.

**READ THE RESPONSE IN FULL FIRST.** Decide:
- **Clean pass** (0 Critical, 0 Important): proceed to S9 below.
- **Important+:** STOP. Branch to S8.6 tightening cycle — fix the new findings, prepare another audit packet, re-dispatch. Do NOT jump to S9 mechanics with unresolved Important findings.
- **Medium / Low only:** evaluate per-finding; default to "fix if cheap, defer with explicit note otherwise."

## Required skills — invoke at cold-start

Same 7 remediation-arc skills as S7-N / S8 / S8.5. Phase 2.2 is the ship gate — the 5-point ship-ready check unblocks the owner-manual TestFlight dispatch.

1. `superpowers:using-superpowers`
2. `superpowers:writing-plans`
3. `superpowers:executing-plans`
4. `superpowers:requesting-code-review` — internal reviewer pattern is now **5-for-5** across the v1.0.4 arc. Keep using it.
5. `superpowers:systematic-debugging`
6. `superpowers:test-driven-development`
7. `superpowers:verification-before-completion`

Load all seven via the `Skill` tool. Announce each.

## Read First, In This Order

Follow Trigger C. Show the `[🟩...⬜ N%]` progress bar at every step. Confirm current state + locked next step + risks before any changes.

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/CLAUDE.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
6. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
7. **Codex re-audit response** (PREREQUISITE — see above): `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/post-s8-5-audit/codex-2026-05-15-post-s8-5-audit-response.md`
8. Last three session logs (newest first):
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s8-5-codex-findings.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s8-ios-sync.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s7-3-medium-01.md`
9. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md` (this file)
10. Task-specific files (THIS IS THE WORK — Phase 2.2 ship gate):
    - **Canonical v1.0.4 plan Task 9:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-05-13-v1.0.4-config-impact.md` (Phase 2.2 / Task 9 section).
    - **S8.5 plan:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-05-15-s8-5-codex-findings-remediation.md`.
    - **iOS `project.yml`:** locate `MARKETING_VERSION: 1.0.3`.

## Current State (verify at session start)

- **v1.0.3 live worldwide on the App Store.** Remote overlay `content_version=2026051202`.
- **v1.0.4 Phase 1 + Phase 1.5 + Phase 2.1 + S8.5 all CLOSED.** All 4 Codex post-Phase-1 audit findings remediated + 1 reviewer catch (overhang fan → 3 surfaces + `p.fan_speed` in resolveProfile).
- **Web HEAD** = S8.5 close commit (verify via `git log --oneline -2`).
- **iOS HEAD `fd4761a`** local-only, 4 commits ahead of `origin/main` (`eeb2915`). Phase 2 gate active.
- **iOS XCTest:** 108/108 green (107 unit + 1 UI).
- **Walkthrough harness:** 11 cumulative v1.0.4 OK lines, all green. validate-data 6/6. matrix-audit 47196/0 + 55/55 curated.

## Recommended First Lane — S9 Phase 2.2 / Task 9

### Concrete surface

1. **`git status` in web + iOS.** Confirm clean. Web HEAD = S8.5 close; iOS HEAD `fd4761a`.
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
   Spot-check `/tmp/ui-review/pro/01-home.png` through `09-checklist.png` for any visible regression from the v1.0.4 engine + data changes. Pay attention to:
   - Output panel fan rows (now showing env-scaled values for cold/vcold)
   - Warning copy for chamber-cap PLA on X1E
   - First-layer bed warning copy for fully-clipped / partially-clipped cases
4. **Bump `MARKETING_VERSION` 1.0.3 → 1.0.4:**
   ```bash
   sed -i.bak 's/MARKETING_VERSION: 1\.0\.3/MARKETING_VERSION: 1.0.4/g' project.yml && \
     rm project.yml.bak && \
     xcodegen generate && \
     grep -n 'MARKETING_VERSION' 3DPrintAssistant.xcodeproj/project.pbxproj | head -4
   ```
5. **Second iOS local commit** — `project.yml` + regenerated `3DPrintAssistant.xcodeproj/project.pbxproj`. Subject e.g. `chore: bump MARKETING_VERSION 1.0.3 → 1.0.4 (S9 Phase 2.2)`.
6. **Internal code-review subagent** on the final commit. SHA range = `fd4761a..HEAD`. Same prompt template as S8.5 + S8 reviewers. **Pattern is 5-for-5 across v1.0.4 arc — keep using it.**
7. **Tightening commit if reviewer surfaces Important findings.**
8. **5-point ship-ready check** — produce a checklist with current state for each:
   - [ ] All planned changes for v1.0.4 landed (Phase 1 + Phase 1.5 + Phase 2.1 + S8.5).
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
- **No additional engine.js or data/*.json changes** in S9 unless a Codex re-audit finding requires it.
- **Internal code-review subagent between impl + tightening.** 5-for-5 pattern; keep using.
- **Verification-before-completion** rigid. No "ready for ship" claims without fresh evidence per the 5-point check.
- **Trigger A close runs at session end.**

## S8.5 carry-forwards (relevant for S9 / v1.0.5)

- **iOS Advanced filament panel UI surfacing** (reviewer M-4 from S8.5). `AdvancedFilamentSettings` Codable fields `fanMinSpeed` / `fanMaxSpeed` / `coolingFanOverhang` are populated but not rendered in `FilamentSettingsView.swift`. Separate work item for v1.0.5+ if Advanced filament panel needs fan-row parity with web.
- **Helper extraction priority bumped** (reviewer M-2 from S8.5). Math duplication now 4 sites (fanMax, fanMin, overhang, fan_speed). `_computeEnvScaledFan` + `_computeInitBedTarget` should land early v1.0.5.
- **TDD-RED breadcrumb retroactive for F1/F2/F3** (reviewer M-1, informational). F4 codifies the convention; F1's commit body documents the demo but no code breadcrumb. Optional retroactive comment near `scripts/walkthrough-harness.js:670` if a future maintainer wants the visible artifact.
- **Walkthrough hardcoded baseline** (reviewer M-5). `Math.round(100 * 0.9)` durable only as long as PLA's `cooling_fan_overhang` stays at `100%`. Cheap follow-up: derive from materials.json.

## Prior carry-forwards (still deferred to v1.0.5)

- S7-3 math duplication 3× (now 4× post-S8.5).
- S7-3 `isPETG ? 5 : 0` magic constant.
- S7-3 profile-matrix-audit env-axis blind spot (`DEFAULT_STATE.environment = 'normal'`).
- S7-3 mobile-card warning text length check.
- S7-3 smoke assertion for emit-vs-claim parity.
- S7-4 shared `RETIRED_IDS` const array.
- Prior Codex MEDIUM-02 + OBSERVATION-01.

## After S9 closes (TestFlight monitoring)

- Monitor App Store / TestFlight for review acceptance + on-device behavior.
- v1.0.4 → v1.0.5 transition. Bundle deferred items above into a v1.0.5 hygiene pass.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
