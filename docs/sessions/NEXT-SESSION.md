# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-09 (explicit owner ask — wrap of the cold-start issues session; owner wants a fresh session to do the iOS work).
**Locked next entry point:** **iOS mirror of GitHub issues #2/#3/#4 + a TestFlight build for the owner to test.** The web halves are done on branch `claude/cold-start-3dpa-issues-ihs5du` (pushed, unmerged); the iOS app still has all three bugs. Secondary/parked (do NOT start over this): web-branch merge decision (owner), Android AG0, iOS v1.0.7 on-device Mine acceptance, the mined web findings in the ROADMAP queue.

---

Copy everything between the markers into a new session.

>>> START >>>

3dpa cold start — iOS issue-fix + TestFlight train.

Read in order: ~/dev/Claude/Projects/CLAUDE.md → 3dprintassistant/CLAUDE.md → 3dprintassistant/docs/3dpa-context.md → 3dprintassistant/docs/planning/ROADMAP.md (banner + Active Work Queue) → docs/sessions/INDEX.md → docs/sessions/2026-07-09-cowork-appdev-cold-start-issues.md IN FULL → this file.

**Task: mirror the four cold-start issue fixes into the iOS app and get a TestFlight build up for the owner.** The web fixes are done on branch `claude/cold-start-3dpa-issues-ihs5du` (issues #2/#3/#4/#5) — READ that branch's 5 commits (`4ed7fad`, `fcfbfa8`, `2e7e216`, `db53f75`, `64a1bcb`) as the reference behavior before touching iOS. The owner confirmed #2/#3/#4 are primarily iOS bugs.

Preconditions / setup (do first):
1. **Add the iOS repo:** `mustiodk/3dprintassistant-ios` (owner-confirmed name) via `add_repo` — needs the owner's approval popup. Clone, then register the repo root so its CLAUDE.md/skills load.
2. **Verify the TestFlight dispatch path (owner said GitHub Actions — CHECK it):** read `.github/workflows/` in the iOS repo. Confirm whether a macOS-runner workflow builds + uploads to TestFlight on a tag or `workflow_dispatch`. If yes → I can dispatch after the code is ready. If it's Xcode Cloud / manual → I prep code + bump build number and hand the owner the exact dispatch step. State which it is before promising a build.
3. Respect the iOS push gate + the byte-identical engine/data mirror rule: engine.js and data/ on iOS must match web exactly; app-layer Swift is where these UI fixes live.

The three iOS fixes to mirror (one finding = one commit; run XCTest after each):
- **#3 Discord link:** update the iOS Discord URL (likely `AppConstants.swift`) from the dead `discord.gg/UVPGaXcy` to `discord.gg/4KmcHrPkcS`.
- **#2 re-save guard:** a loaded/unchanged Workshop profile must not be saveable again (Save disabled / "Saved" state until the config actually changes vs the loaded/just-saved snapshot). Mirror the web logic in `4ed7fad`.
- **#4 export clarity + discoverability:** (a) name the target slicer in the iOS export UI ("for Bambu Studio" / "Copy for OrcaSlicer/PrusaSlicer") per web `64a1bcb`; (b) **the ··· overflow menu on the iOS Workshop screen hides export/import — surface it as a visible action** (owner's "3 dots hide the functionality"); (c) add an export shortcut on the profile page (owner said YES); (d) mirror the Workshop backup picker (all / single profile) from `fcfbfa8` if the iOS store supports it. Confirm iOS `WorkshopStore` export/import + tuning key-preservation still round-trips (the W3 iOS ordered emitter had a known `tuning` drop gap — check it's fixed).
- **#5 analytics:** iOS emits the new events only once instrumented; low priority — note it, don't block the build on it.

Then: bump the iOS build number, dispatch (or hand off) the TestFlight build, and tell the owner it's up. Wrap with a session log + INDEX line + regenerate this file.

Parallel owner decision (not my code step): **merge the web branch `claude/cold-start-3dpa-issues-ihs5du` to `main`** to deploy the web fixes — #5's analytics data only flows after merge + Cloudflare deploy. Also reconcile #5 with the Android-session's queued "analytics EVENT_KEYS full-schema + android HMAC" finding (this branch is a superset for events; confirm the `android` auth branch is still owed).

Still open, do NOT restart over this task: Android AG0 (owner ratify spec §2+§4 + Play account + prototype push); iOS v1.0.7 on-device Mine acceptance; ROADMAP mined findings (overlay validator RED blocks overlay republish; feedback Worker android auth); Orca export Phase 3 (fixtures ready, the real "differentiate between slicers" answer, 10/14 brands) + Prusa Phase 4; max_mvs 0.8 data gap; S1 landing pages.

Standing rules: web is master; engine.js/app.js never merge; engine/data changes require web + iOS impact evaluation; one finding = one commit; iOS push gate; cross-platform mirror tests need the TDD-RED breadcrumb (CLAUDE.md); quality > speed; progress bar every multi-step turn.

>>> END <<<

Maintenance note: this file is regenerated on Trigger A / Trigger B / explicit owner ask only — a stale copy between sessions is expected and fine.
