# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-13 after S4 v1.0.4 impl close (Task 5 shipped; web HEAD at the S4-close commit on top of `1695cba`; iOS HEAD `eeb2915` untouched).

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — S5, v1.0.4 Phase 1 Task 6 (chamber safe-cap guard, warning-only)

## Read First, In This Order

Follow Trigger C from the canonical protocol. Show progress while reading. Confirm current state, locked next step, and risks before making changes. Read:

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
6. Last three session logs, in full (newest first):
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s4-impl.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s3-impl.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s2-impl.md`
7. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md`
8. Task-specific files (THIS IS THE WORK):
   - **Source of truth for scope:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/reviews/2026-05-11-config-impact-qa/merged.md`
   - **Per-task implementation plan (TDD-first), Task 6 section ~line 661-750:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-05-13-v1.0.4-config-impact.md`
   - **Walkthrough harness pattern:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/scripts/walkthrough-harness.js`
   - **Profile matrix audit:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/scripts/profile-matrix-audit.js`

## Current State

- **v1.0.3 is live worldwide on the App Store.** Remote overlay `content_version=2026051202` adds `sparkx_i7` under Creality / i Series for current 1.0.3 clients.
- **v1.0.4 S4 (impl) is complete.** S4 shipped Task 5 of 7 Phase 1 web tasks: practical multicolor 5-tier resolver (mutual HIGH `ams_lite_compatible` + Claude HIGH-03 system-type + Codex MEDIUM-01 empty-MCS), web `dc49c52` (impl) + `1695cba` (fixup with positive-tier coverage + sysLabel polish + audit ID drift). Cumulatively, S2 + S3 + S4 have shipped 5 of 7 Phase 1 web tasks.
- **Walkthrough harness has 6 cumulative v1.0.4 OK lines** (HIGH-09, ENV, MEDIUM-05, HIGH-01, HIGH-02/HIGH-03, MCS — 9 sub-assertions in the MCS block alone). Profile-matrix-audit clean across 55/55 curated + 47196/0 broad configs at every commit.
- **Web `main` is at the S4-close commit on top of `1695cba`. iOS `main` is at `eeb2915` (untouched).**
- **Carry-forwards still open:** asymmetric helper API surface (`getCompatibleNozzlesForPrinter` exists but `getCompatiblePlatesForPrinter` does not — S3-flagged, controller-deferred); `_mcsTier` Engine-surface exposure (S4-flagged for future Phase 3 / UI work); Bambu export-path gap from Task 2 deferred under ROADMAP "IR-deferred export-path findings" (NOT v1.0.4 scope).
- **Phase shape locked at 4 phases** (locked 2026-05-13 mid-S5 setup): Phase 1 (web Tasks 1-7) → **Phase 1.5 (Codex audit, owner-gated dispatch, NEW)** → Phase 2.1 (iOS engine/data sync + XCTest) → Phase 2.2 (UI walkthrough + MARKETING_VERSION bump + ship). Phase 1.5 inserts a single Codex review packet before iOS sync to catch cross-task interactions, asymmetric helper-API drift, warning-ID taxonomy issues, retired-ID matrix-audit sweep gaps, and data-file consistency. S6 prepares the packet (+ ready-to-run dispatch command + empty response file); owner runs Codex manually; S7 cold-starts on the response and remediates web-only. Stop conditions: ≥1 CRITICAL or ≥5 HIGH pauses for owner; 1-4 HIGH remediates autonomously; MEDIUM/LOW owner-triaged. Green-path collapse: if Codex returns 0 findings, S7 compresses into a confirmation note at the start of S8.

## Recommended First Lane

This is S5 of the multi-session autonomous arc. Owner is out of the screen during execution; per-finding checkpoint rule applies.

1. **Run `git status` in web and iOS** to confirm clean state. If not clean, surface diff before any work.
2. **Execute Task 6** of the implementation plan (chamber safe-cap guard, warning-only — HIGH-05). Single engine site; warning emission only (no profile field per owner default 4). Smaller scope than Task 5.
   - Write the failing walkthrough assertion block at `scripts/walkthrough-harness.js`. **Use exact-value / exact-ID assertions from the start** (S2-learned).
   - Run the harness to confirm it fails red.
   - Implement per the plan's Task 6 section, reading engine.js at execution time for surrounding context.
   - **When replicating engine logic in warning-side checks, MIRROR THE FULL RECIPE** (S3-learned).
   - Run the harness to confirm green.
   - Run the full verification gate: `validate-data` + walkthrough (no `❌` rows) + `profile-matrix-audit` (0 curated + 0 broad failures).
   - Commit (one finding = one commit) + push to `origin/main`.
3. **Per-finding checkpoint** after Task 6 commit. Task 6 is bounded (single engine site, warning-only) — if context is light, continue to Task 7 (nozzle min-diameter cleanup + nozzle authority cleanup — bundles HIGH-12 + Claude HIGH-06, touches engine.js + data/nozzles.json — LAST Phase 1 web commit). Task 7 explicitly renames `cf_small_nozzle` → `nozzle_below_min_diameter` per `merged.md` Step 7 — direct application of S4-learned test-contract sweep.
4. **Continue per-finding** until either: a stop condition fires (Trigger B handoff with diagnostic state), or the per-finding checkpoint says wrap (Trigger A close).

## Scope Rules

- **Autonomy authorization (active from S1 onward):** autonomous web commits + push to `main` OK; autonomous Trigger A close at session end OK; autonomous iOS *local* commits OK. **No autonomous push to iOS `main`. No autonomous TestFlight dispatch. No autonomous Codex peer review.** Phase 1.5 carve-out (additive, narrow): S6 may autonomously *prepare* the Codex audit packet + diff snapshot + empty response file under `codex/v1.0.4-audit/` and surface a copy-paste-ready dispatch command in the Trigger A close note; owner still runs Codex manually. The blanket "No autonomous Codex peer review" rule remains in force outside this scoped Phase 1.5 carve-out.
- **TDD discipline non-negotiable.** Assertion lands red before impl. Walkthrough is the testing contract.
- **One finding = one commit per platform.** Don't bundle unrelated findings.
- **Provenance on every new `resolveProfile` emission.** Source: `vendor` / `default` / `rule` / `calculated`.
- **IMPL-040 chip parity** for any new chip text (prefix generator + iOS XCTest assertion).
- **Verification gate per finding** is mandatory: validate-data → walkthrough (no `❌`) → profile-matrix-audit (0/0 failures) → UI smoke if visible.
- **Stop conditions** that trigger abort + Trigger B: regression outside scope; byte-identity break vs iOS; finding balloons ≥3× expected; `systematic-debugging` doesn't root-cause failure in 3 honest attempts; mid-flow adjudication needed.
- **iOS push gate** is the 5-point ship-ready check (all Phase 1 landed + green; engine + data byte-identical; iOS XCTest green; UI screenshot walkthrough green; `MARKETING_VERSION` 1.0.4). Only owner pushes iOS + dispatches TestFlight.
- **`[claude-adjudicated]` calls eligible for owner override** at any cold-start. If owner flips any at this cold-start: edit `merged.md`, re-snapshot the lock SHA, proceed.

## S4-learned addition

**When retiring or renaming a warning ID, sweep ALL test contracts before commit.** S4's Task 5 retired `k2_plus_cfs` and the impl pass shipped DONE_WITH_CONCERNS because `scripts/profile-matrix-audit.js` was still asserting the old ID — the implementer correctly left it out of original scope, but the controller had to bundle the audit fix into the follow-up commit. For Task 7 specifically, which renames `cf_small_nozzle` → `nozzle_below_min_diameter` per `merged.md` Step 7: search BOTH `walkthrough-harness.js` AND `profile-matrix-audit.js` (plus any other test/audit files under `scripts/`) BEFORE committing. Renamed/retired warning IDs leave invisible test-contract drift if not swept globally.

## S3-learned reminder

**When replicating engine logic in warning-side checks, MIRROR THE FULL RECIPE — don't use simplified subsets.** S3's Task 4 first-pass missed 3 silent-regression PETG-on-plate combos because the warning-side bed-temp check used a steady-state-only recipe. Initial-layer / tier-boundary cases are precisely where warnings need to fire most.

## S2-learned reminder

**Write exact-value / exact-ID assertions in the harness from the start.** Use exact-value `===` asserts on emitted numbers and exact-ID `.includes('warning_id_exact')` on warning lists from the first commit. S3 + S4 confirmed this pattern reduces but doesn't eliminate review round-trips — different reviewer flag categories (missing coverage, recipe drift, audit-ID drift) still surface — but it consistently removes the test-tightness round-trip.

## What you'll do across S5…S∞ (skim)

Plan documents 7 web tasks (Phase 1) + 1 Codex audit gate (Phase 1.5, owner-gated dispatch) + 2 iOS phases (Phase 2.1 sync + XCTest; Phase 2.2 UI walkthrough + version bump + ship). 5 of 7 Phase 1 tasks shipped through S4 (Tasks 1, 2, 3, 4, 5).

**Remaining Phase 1:**
- **Task 6** (this session's target) — chamber safe-cap guard, warning-only — HIGH-05. Single engine site.
- **Task 7** — nozzle min-diameter cleanup + nozzle authority cleanup. Bundles HIGH-12 + Claude HIGH-06. Touches `engine.js` + `data/nozzles.json`. Includes the warning-ID rename `cf_small_nozzle` → `nozzle_below_min_diameter` — S4-learned test-contract sweep applies (search BOTH `walkthrough-harness.js` AND `profile-matrix-audit.js` before commit). Last Phase 1 web commit.

**After Task 7 lands:**
- **S6** (or S5/S6-continuation if context allows) — Phase 1.5 packet prep. Snapshot Phase 1 commit-range diff to `codex/v1.0.4-audit/v1.0.4-commit-range.diff`; author packet at `codex/v1.0.4-audit/codex-<DATESTAMP>-v1.0.4-audit-packet.md` per `docs/ai-collab.md` Review Packet template; pre-create empty response file; surface dispatch command to owner in Trigger A close note. **Owner-gated:** S6 ends after packet prep; owner runs Codex manually.
- **S7** — Phase 1.5 remediation. Cold-start on owner-pasted response file. Triage per IR rubric. Stop conditions: ≥1 CRITICAL or ≥5 HIGH → pause for owner; 1-4 HIGH → autonomous web-only one-finding-one-commit remediation; MEDIUM/LOW → owner-triaged. **Green-path collapse:** if Codex returns 0 findings, S7 compresses into a confirmation note at the start of S8.
- **S8** — Phase 2.1 / Task 8. Byte-identical engine + data copy to iOS; add 7 new XCTests mirroring Phase 1 walkthrough assertions; iOS XCTest green; one iOS local commit (engine + data + tests). **No push.**
- **S9** — Phase 2.2 / Task 9. UI screenshot walkthrough; MARKETING_VERSION bump 1.0.3 → 1.0.4 via `sed` + `xcodegen`; second iOS local commit (project.yml + .pbxproj); 5-point ship-ready handoff. **Owner manually dispatches TestFlight.**

Each web task is one commit per platform. iOS commits stay local until the 5-point ship-ready check passes at the end of S9.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
