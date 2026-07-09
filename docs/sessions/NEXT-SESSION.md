# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-09 (Trigger A close of the Export Phase 2 execution session — Bambu hardening is implemented on branch `export-phase2-20260709`, owner-verify PASSED; the ONE thing left before merge is the iOS XCTest, and the owner said the next session is on the mac-mini to run it).
**Locked next entry point:** **mac-mini** — run the iOS XCTest for Export Phase 2, record T7 in the gate ledger, then merge the web branch. (Secondary, if not that: Android AG0 is still owner-pending; web queue findings; iOS v1.0.7 on-device Mine acceptance.)

---

Copy everything between the markers into a new session.

>>> START >>>

3dpa cold start.

Read in order: ~/dev/Claude/Projects/CLAUDE.md → 3dprintassistant/CLAUDE.md → 3dprintassistant/docs/3dpa-context.md → 3dprintassistant/docs/planning/ROADMAP.md (banner + Export snapshot + Active Work Queue) → docs/sessions/INDEX.md → last 3 session logs in full (start with 2026-07-09-cowork-appdev-export-phase2.md) → this file → 3dprintassistant/docs/planning/EXPORT-PHASE2-GATE-LEDGER.md → docs/superpowers/plans/2026-07-09-export-phase2-bambu-hardening-plan.md (Task 7 + Task 8).

Today's task — pick by what's true:

A) **PRIMARY — finish Export Phase 2 on the mac-mini.** The web branch `export-phase2-20260709` is implemented + pushed, owner-verify PASSED; the only remaining merge blocker is iOS XCTest (T7 is UNVERIFIED because the MacBook Air has no Xcode — the mac-mini does). Steps:
  1. **Sync the 3 iOS commits.** They are LOCAL on the Air's `3dprintassistant-ios/main`: `5fcc935` (HIGH-2 retraction test), `662c3c1` (dual-variant test), `7221258` (inherits test), each = engine.js byte-sync + its mirror test. Get them onto the mac-mini (push from the Air if it's reachable, or cherry-pick/re-apply). Confirm `diff -q 3dprintassistant/engine.js 3dprintassistant-ios/3DPrintAssistant/Engine/engine.js` is byte-identical to the web branch tip (`89a848d`).
  2. **Run the full XCTest suite** (mac-mini has Xcode 26.5): `xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant -destination "platform=iOS Simulator,id=<UDID>" -derivedDataPath build -only-testing:3DPrintAssistantTests CODE_SIGNING_ALLOWED=NO`. Expect 135 prior + 3 new P2 tests = **138 green** (`testP2_TextExportRetractionReadsResolvedSlicerValue`, `testP2_BambuExportEmitsDualVariantArrays`, `testP2_InheritsExplicitParents`). Do the TDD-RED demo on the retraction test (invert one assertion, observe fail, flip back) — the plan/CLAUDE.md require the RED artifact for cross-platform mirror commits; amend it into `5fcc935` or leave a `// RED demo verified` breadcrumb.
  3. **Record T7 in `docs/planning/EXPORT-PHASE2-GATE-LEDGER.md`** with the real pass count (flip UNVERIFIED → verified). If XCTest FAILS, do NOT merge — follow plan Step 8.2 fallback loop.
  4. **Merge + deploy** (all Step 8.3 preconditions now met — owner-verify PASS ✓, byte-identical ✓, web gates green ✓): `cd 3dprintassistant && git checkout main && git merge --no-ff export-phase2-20260709 && git push`. Then verify live per plan Step 8.4 (`curl -s https://3dprintassistant.com/engine.js | grep -c BAMBU_DUAL_VARIANT_PROCESS_FIELDS` ≥1; golden --check NO DRIFT; audit 0 FAIL/0 warn). Close the books per Step 8.5 (ROADMAP Export row → Bambu stable + badge removed; ledger final). Wrap per Trigger A.

B) **If Android AG0 has been ratified instead:** run AG1 foundation per docs/superpowers/plans/2026-07-08-android-v1-plan.md (QuickJS spike first; mac-mini; flip AG0 ledger row + commit the top-level CLAUDE.md + AGENTS.md 3dpa-android row; no-push boundary relaxes per ratified AD1). One gate/session.

C) **If web work instead:** queue findings, most urgent first — (1) iOS overlay validator RED (add the 1.0.7 bundled-catalog baseline from iOS `51356de` — any overlay republish fails today; this same failure shows as the documented baseline exception in the export gate ledger); (2) analytics Worker full-schema `EVENT_KEYS` fix (+ `android` HMAC auth, separate commit); (3) feedback Worker `android` auth branch. Each: one finding = one commit, TDD RED-first, curl-verify live.

Standing rules: web is master; engine.js/app.js never merge; engine/data changes require web + iOS (+ Android-plan) impact evaluation; one finding = one commit; iOS push gate (push only when TestFlight-ready); **Android prototype no-push boundary ACTIVE until explicit AG0 GO**; quality > speed; progress bar every multi-step turn.

>>> END <<<

Maintenance note: this file is regenerated on Trigger A / Trigger B / explicit owner ask only — a stale copy between sessions is expected and fine.
