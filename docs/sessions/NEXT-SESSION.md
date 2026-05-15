# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-15 after the printer-addition-protocol trial close (Photon Mono M7 Pro declined; runbook v4 shipped; new v1.0.5 carry added). **Owner-stated next action:** Musti will test v1.0.4 on-device via TestFlight and report back whether v1.0.4 is ready to submit for App Store review. The next session is therefore **gated on Musti's TestFlight verdict** — Lane A only fires if v1.0.4 is GO; Lane B if a regression surfaces; Lane C is the v1.0.5 hygiene cold-start fallback.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — v1.0.4 review-readiness decision

## Required skills — invoke at cold-start

1. `superpowers:using-superpowers`
2. `superpowers:writing-plans`
3. `superpowers:executing-plans`
4. `superpowers:test-driven-development`
5. `superpowers:verification-before-completion`
6. `superpowers:systematic-debugging` (only if Lane B fires — i.e., owner found a regression)
7. `superpowers:requesting-code-review` (only if Lane B's fix touches engine / data / shared infra)

Load skills 1-5 at cold-start. Announce each.

## Read First, In This Order

Follow Trigger C. Show the `[🟩...⬜ N%]` progress bar at every phase. Confirm current state + locked next step + risks before any file edit.

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/CLAUDE.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
6. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
7. Last three session logs (newest first):
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-15-cowork-appdev-printer-addition-protocol-trial.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-15-cowork-appdev-printer-addition-protocol.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s9-bug-free-ship.md`
8. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md` (this file)
9. **If Lane A fires (v1.0.4 GO):** the iOS push gate + App Store submission flow notes in `Projects/CLAUDE.md` Standing Rules.
10. **If Lane B fires (regression):** the relevant area's spec or session log per Musti's report.

## Current State (verify at session start)

- **Web HEAD `6314fda` pushed.** Runbook v4 live. `git log --oneline -3` should show `6314fda` → `8339a2a` → `9754c47` on `origin/main`.
- **iOS HEAD `c99a797` pushed.** v1.0.4 on TestFlight ([run 25892826819](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25892826819)).
- **Working tree clean** in both repos.
- **No work in flight.**
- **Photon Mono M7 Pro request closed** — decline note in trial session log; v4 protocol blocks future resin asks at Phase 1 step 0.

## Lane A — v1.0.4 → App Store review submission (fires only if Musti returns GO)

### Step 0 — Confirm GO

Musti must explicitly say "v1.0.4 is ready to submit for review" (or equivalent). If verdict is unclear, ask before proceeding.

### Step 1 — Pre-submission verification

From `Projects/3dprintassistant-ios/`:

```bash
git log --oneline origin/main..HEAD   # must be empty (no unpushed commits)
git status                            # must be clean
xcodebuild -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant -showBuildSettings | grep MARKETING_VERSION
# must show 1.0.4
```

From `Projects/3dprintassistant/`:

```bash
git log --oneline origin/main..HEAD   # must be empty
git status                            # must be clean
```

### Step 2 — App Store Connect submission

This is a **manual ASC workflow**, not a CLI step in this repo. Musti drives it.

Suggested checklist to walk through with Musti:
- Open App Store Connect → 3D Print Assistant → "iOS App" → "1.0.4 Prepare for Submission."
- Confirm build `1.0.4` selected from TestFlight processed builds.
- Update "What's New in This Version" (see "Suggested release notes" below).
- Confirm screenshots / metadata require no changes (no new UI surfaces in v1.0.4).
- Confirm encryption export compliance unchanged.
- Submit for review.

### Step 3 — Suggested release notes (Musti edits to taste)

```
- Improved cold/warm environment compensation accuracy.
- More honest first-layer bed temperature warnings.
- Cooling settings now follow environment scaling in Advanced mode.
- Quality + behind-the-scenes reliability improvements.
```

### Step 4 — Post-submission

- Update ROADMAP "Active Release" header to v1.0.4 "Submitted for review YYYY-MM-DD."
- Light-touch session log; this is a hand-off step, not a code arc.

## Lane B — Regression fix arc (fires only if Musti returns NO-GO)

### Step 0 — Capture the regression

Treat Musti's report as a bug report. Ask for:
- Specific reproduction steps.
- Device / iOS version.
- Whether the regression existed in v1.0.3 (to know if it's new or pre-existing).
- Screenshots / video if visible.

### Step 1 — Triage

- If the regression is in shared engine / data: web fix first, then iOS sync (per standing rule 2 in `docs/3dpa-context.md`).
- If the regression is iOS-only (UI / Codable / view-model): iOS-only commit.

### Step 2 — Fix arc

Follow `superpowers:systematic-debugging` + `test-driven-development`. One finding = one commit per platform. Bump iOS to `1.0.5` if a binary refresh is needed, or stay on `1.0.4` only if the fix is safe to slip into the same TestFlight build before submission (rare).

### Step 3 — Re-verify

Full gate: validate-data + walkthrough + matrix-audit + iOS XCTest. Re-dispatch TestFlight if iOS rebuild.

## Lane C — v1.0.5 hygiene pass cold-start (fallback if Lane A and Lane B both park)

See `docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s9-bug-free-ship.md` "Next session" for the carry-forward bundle. The bundle now includes:

- Helper extraction across 4 math-duplication sites
- m2 test rename
- Min-1 PLA + PETG + ABS slow_layer_time test coverage
- Min-2 NSNumber decoder cleanup
- Magic constants
- Mobile-card warning text length check
- Smoke assertion for emit-vs-claim parity
- Shared `RETIRED_IDS` const
- Walkthrough hardcoded baseline
- MEDIUM-02 packet-text accuracy decision
- **NEW: FDM-only scope copy on a user-facing surface** — owner-pick web About / footer / iOS Settings; phrase as "FDM (filament extrusion) only today; MSLA / resin out of scope (future implementation)" to preserve optionality vs. the runbook's harder operational "no plans" stance.

Cold-starting v1.0.5 should treat the bundle as a triage exercise first (pick 3-5 to ship, defer the rest) — not a flat 11-item plan.

## Scope Rules

- **Wait for Musti's verdict before firing any lane.** Don't preemptively run xcodebuild or open ASC in this cold-start; ask first.
- **iOS push gate stays.** v1.0.4 is on TestFlight + about to be submitted for review; do not push any new iOS commit until v1.0.5 ship-readiness.
- **One finding = one commit per platform** (Lane B).
- **Verification-before-completion is rigid.** Any "v1.0.4 is GO" claim needs evidence (Musti's words count; xcodebuild output for build settings counts; "I think it's fine" does not).
- **Trigger A close runs at session end.**

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
