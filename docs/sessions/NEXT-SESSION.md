# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-09 (Trigger A close of the Android v1 planning session — the pivot's planning work is DONE: triple-reviewed Android bundle + light macOS companion committed; program gated on **owner AG0**).
**Locked next entry point:** owner AG0 (ratify/override spec §2 + §4, create Play account, resolve prototype-repo remote state) → then AG1 on the mac-mini. Also still open: owner on-device Mine acceptance of iOS v1.0.7 on TestFlight; 3 mined web findings in the ROADMAP queue (**overlay validator RED blocks any overlay republish today**).

---

Copy everything between the markers into a new session.

>>> START >>>

3dpa cold start.

Read in order: ~/dev/Claude/Projects/CLAUDE.md → 3dprintassistant/CLAUDE.md → 3dprintassistant/docs/3dpa-context.md → 3dprintassistant/docs/planning/ROADMAP.md (banner + Active Work Queue) → docs/sessions/INDEX.md → last 3 session logs in full (start with 2026-07-08-cowork-appdev-android-v1-planning.md) → this file.

Today's task — pick by what's true:

A) **If I have ratified Android AG0** (replied GO / overrides to spec §2 + §4 of docs/superpowers/specs/2026-07-08-android-v1-design.md): run **AG1 foundation** per docs/superpowers/plans/2026-07-08-android-v1-plan.md. HARD PRECONDITIONS: execution session on the **mac-mini** (Java 17 + Android cmdline tools + API-36 emulator; also verify `node --version` — unverified there); flip the AG0 row in docs/planning/ANDROID-V1-GATE-LEDGER.md to GO (quote my message + date) and commit the top-level CLAUDE.md + byte-identical AGENTS.md 3dpa-android row update (no-push boundary relaxed per ratified AD1); prototype-repo remote state resolved (I push from the mini or write it off). AG1 entry = the **QuickJS spike** (≤ half session, ledger-recorded GO — incl. which QuickJS the wrapper embeds) BEFORE anything else; then author the gate micro-plan at writing-plans granularity in docs/superpowers/plans/android-v1/gate-1-foundation.md, hostile-review it, then execute. One gate per session; wrap per Trigger A.

B) **If AG0 is still pending and the session is web work:** the queue's mined findings, most urgent first — (1) **iOS overlay validator RED** (add the 1.0.7 bundled-catalog baseline, ground-truth from iOS `51356de` — any overlay republish fails today); (2) analytics Worker: full-schema `EVENT_KEYS` fix (per-event allowed keys + `BLOB_FIELDS`/query columns for `symptom`/`type` + real-payload tests), and — separate commit — the `android` HMAC auth branch; (3) feedback Worker `android` auth branch + first-class source rendering. Each: one finding = one commit, TDD RED-first, hostile review per Work Protocol lane, curl-verify live after push.

C) **Otherwise:** other queue items per ROADMAP (v1.0.7 on-device Mine acceptance is owner-side; max_mvs 0.8 data gap; Export Phase 2; Orca Phase 3; W4 custom filaments; S1 landing pages). macOS is deliberately parked behind Android (companion doc: docs/superpowers/specs/2026-07-08-macos-companion-assessment.md; my 5-min M0 check: ASC "Mac Availability" checkbox).

Standing rules: web is master; engine.js/app.js never merge; engine/data changes require web + iOS (+ Android-plan) impact evaluation; one finding = one commit; iOS push gate; **Android prototype no-push boundary ACTIVE until my explicit AG0 GO**; quality > speed; progress bar every multi-step turn.

>>> END <<<

Maintenance note: this file is regenerated on Trigger A / Trigger B / explicit owner ask only — a stale copy between sessions is expected and fine.
