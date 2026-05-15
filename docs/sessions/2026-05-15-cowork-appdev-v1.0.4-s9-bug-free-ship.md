# 2026-05-15 — Cowork (appdev): v1.0.4 S9 — bug-free ship + TestFlight dispatch

## Durable context

- **Scope was owner-pivoted from "S9 = ship gate" to "S9 = ship + all-known-bugs cleanup."** The original S9 plan (per S8.7's NEXT-SESSION) was Phase 2.2 / Task 9 ship-gate mechanics only. Owner's directive at session start changed it to: "fix all bugs found by codex and all known bugs found by you, already or the ones you find during this session. i want 1.0.4 to be (known) bug free" — pulling forward the v1.0.5 carry-forward items that codex itself flagged in the post-S8.7 audit. Same one-arc framing as S8.7 ("we fix everything found by codex before proceeding"), reapplied at the very last hop before ship.
- **Bug-vs-hygiene split was the load-bearing scope decision.** Codex post-S8.7 carry list (M1, m2, F2, Obs1, Obs2) + S7-N/S8/S8.5/S8.7 reviewer carry list (helper extraction, magic constants, mobile-card text length, retired-IDs const, walkthrough hardcoded baseline, TDD-RED retroactive) was triaged into 3 v1.0.4 items + everything-else-v1.0.5. **In:** M1 (engine fan_multiplier upper-bound at engine.js:1246+:2655 — real schema-vs-engine asymmetry), Obs1 (iOS Advanced cooling missing slow_layer_time row — cross-platform parity gap), OBS-01 (doc note — codex's accept-criterion was "acceptable if documented"). **Out:** m2 test rename (clarity only), F2 doc breadcrumb (codex called it "process evidence, not a product error"), MEDIUM-02 matrix-audit claim (codex itself said current report text is accurate), all reviewer hygiene (refactors only). The split was documented in the plan's Scope decision section so the reviewer (and v1.0.5) could enforce it.
- **TDD-RED inverted-first hit a test-design bug it caught itself.** S9 Obs1's initial test had `XCTAssertNotNil(Int(slow))` — asserted slowLayerTime is a parseable Int. But engine forwards materials.json's pre-formatted string `"10 s"` (not raw Int) — so the test failed at runtime with `slowLayerTime not parseable as Int: 10 s`. Discovered the contract was string-with-suffix, not raw int. Updated to regex `\d+\s*s$`. Decoder accepts both String and NSNumber paths defensively — NSNumber branch is dead under current data (all 19 materials use pre-formatted strings) but cheap to keep. This is the second time the inverted-first discipline has caught a real-world test-design assumption (first time was S8.5 with retired-ID neg-assertions). Convention is now self-validating.
- **Reviewer-pattern is 7-for-7.** S7-N + S8 + S8.5 + S8.7 + S9 internal reviewers all surfaced real findings. S9's findings (Min-1: PLA-only test coverage, Min-2: NSNumber decoder dead-code under current data) are explicitly v1.0.5 carries per the locked scope; reviewer verdict was GO with 0 Critical / 0 Important / 0 Medium. The reviewer also confirmed all six positive checks from its prompt: M1 symmetric at both engine sites + iOS engine.js byte-identical, slow_layer_time wiring coherent, OBS-01 line numbers accurate (engine.js:2726 + :3520), MARKETING_VERSION clean (2× 1.0.4 / 0× 1.0.3), TDD-RED breadcrumbs align with diffs.
- **v1.0.4 is now (known) bug-free per owner's bar.** All 4 Codex audit packets in this release (v1.0.4-audit + post-phase-1-audit + post-s8-5-audit + post-s8-7-audit) have been fully remediated or have their findings explicitly accepted per Codex's own accept-criteria. Web is live (Cloudflare auto-deploy from main). iOS pushed to `origin/main` (10 commits flushed: 7 from S7-N→S8.7 + 3 from S9). TestFlight dispatched via `gh workflow run testflight.yml --ref main` → [run 25892826819](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25892826819).

## What happened / Actions

1. **Cold-start (Trigger C).** Loaded the 7 remediation-arc skills (using-superpowers, writing-plans, executing-plans, requesting-code-review, systematic-debugging, TDD, verification-before-completion). Read top-level CLAUDE.md, project CLAUDE.md (web + iOS), Codex post-S8.7 audit response, ROADMAP, latest 3 session logs, NEXT-SESSION, prior Codex v1.0.4-audit response (to look up MEDIUM-02 + OBSERVATION-01 specifics). Verified git state: web HEAD `a1b96b2` (S8.7 close + audit packet), iOS HEAD `ad46fd3` (7 commits ahead of `origin/main` `eeb2915`).
2. **Owner directive arrived.** Reframed S9 from ship-gate-only to ship+bugs-cleanup. Triaged carry-forward list into 3 v1.0.4 items + everything-else-v1.0.5. Wrote plan at [`docs/superpowers/plans/2026-05-15-s9-v1.0.4-bug-free.md`](../superpowers/plans/2026-05-15-s9-v1.0.4-bug-free.md).
3. **Task 1 — S9 M1 (web).** Wrote external Node probe at `/tmp/fanmult-red.js` that loads engine.js via vm + polyfills (same pattern as walkthrough-harness). Mutated `data/rules/environment.json` humid.fan_multiplier 1.0 → 1.5. Pre-fix probe: `adv.fan_max_speed.value = "150"` → RED. Added `&& env.fan_multiplier <= 1` to both `engine.js:1246` (getAdvancedFilamentSettings) and `engine.js:2655` (resolveProfile fan_speed). Post-fix probe: `"100"` → GREEN. Restored fixture; full web gate green (validate-data 6/6, walkthrough 11 OK lines, matrix-audit 47196/0 broad + 55/55 curated). Commit `3335a30` with TDD-RED breadcrumb in body.
4. **Task 2 — engine.js sync to iOS.** `cp` web engine.js to `3DPrintAssistant/Engine/engine.js`; `diff -q` empty. iOS commit `2207f8f`.
5. **Task 3 — S9 Obs1 (iOS).** Wrote XCTest `testV104_S9_iOS_Obs1_AdvancedCoolingExposesSlowLayerTime` referencing `advanced.slowLayerTime`. Build error: `value of type 'AdvancedFilamentSettings' has no member 'slowLayerTime'` (RED captured at `EngineServiceTests.swift:1137:43`). Added `slowLayerTime: String?` field to struct; updated fallback constructor + decoder (String OR NSNumber); added `Strings.FilamentTab.slowLayer = "Slow below layer time"` (verbatim parity with web `locales/en.json:134`); rendered new `ParamRow` in `FilamentSettingsView.swift` after Overhang. Test runtime failed with `slowLayerTime not parseable as Int: 10 s` — engine forwards pre-formatted string. Updated assertion to regex `\d+\s*s$` → GREEN. Full XCTest suite 109/109. Commit `c82dac2`.
6. **Task 4 — OBS-01 doc note (web).** Added missing `getCompatibleNozzlesForPrinter` row to `docs/3dpa-context.md` API table (was public + exported but absent from the canonical table — surfaced while writing the doc note). Added "Known asymmetry" callout naming the absent `getCompatiblePlatesForPrinter` with YAGNI rationale. Commit `2f0ccb8`.
7. **Task 5 — Full QA gate.** Web: validate-data 6/6, walkthrough 11 v1.0.4 OK lines, matrix-audit 47196/0 broad + 55/55 curated. iOS XCTest: 109/109 unit (108 prior + 1 new S9 test).
8. **Task 6 — `MARKETING_VERSION` bump.** Initial sed missed because value is quoted (`"1.0.3"` not `1.0.3`); fixed pattern. `xcodegen generate` regenerated `project.pbxproj` — 2× `MARKETING_VERSION = 1.0.4`, 0× `1.0.3`. Commit `c99a797`.
9. **Task 7 — Internal code-review subagent.** Dispatched against web `a1b96b2..HEAD` + iOS `ad46fd3..HEAD`. Verdict GO. 2 Minor v1.0.5 carries (Min-1: PLA-only test coverage tightening; Min-2: NSNumber decoder path dead under current data — both Codex-not-originated, neither blocking). All 6 positive checks confirmed.
10. **Task 8 — Push + TestFlight dispatch (owner-authorized).** Owner's original directive included "push to testflight for live testing purposes" — explicit authorization for this hop. Web push: `d9e58fa..2f0ccb8` → mustiodk/3dprintassistant:main (auto-deploys via Cloudflare). iOS push: `eeb2915..c99a797` → mustiodk/3dprintassistant-ios:main (10 commits flushed; now 0 ahead). TestFlight dispatched: [run 25892826819](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25892826819).
11. **Trigger A close.** This file + md-hygiene + INDEX + ROADMAP + NEXT-SESSION + memory/vault sweeps.

## Files touched

**Web repo `3dprintassistant` main:**
- `engine.js` — Task 1 M1 guard (commit `3335a30`).
- `docs/3dpa-context.md` — Task 4 OBS-01 doc note + missing helper row (commit `2f0ccb8`).
- `docs/superpowers/plans/2026-05-15-s9-v1.0.4-bug-free.md` — new (staged in this close commit).
- `docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s9-bug-free-ship.md` — this log (this close commit).
- `docs/sessions/INDEX.md` — prepend entry (this close commit).
- `docs/planning/ROADMAP.md` — v1.0.4 SHIPPED status update + v1.0.5 carry-forward list (this close commit).
- `docs/sessions/NEXT-SESSION.md` — regenerated for v1.0.5 hygiene cold-start (this close commit).
- `codex/post-s8-7-audit/` — modified Codex response file + 6 untracked artifacts from S8.7 (md-hygiene to land in this close).

**iOS repo `3dprintassistant-ios` (pushed to `origin/main`):**
- `3DPrintAssistant/Engine/engine.js` — sync (commit `2207f8f`).
- `3DPrintAssistant/Engine/EngineService.swift` — slowLayerTime field + decoder (commit `c82dac2`).
- `3DPrintAssistant/Views/Output/FilamentSettingsView.swift` — new ParamRow (commit `c82dac2`).
- `3DPrintAssistant/Utils/Strings.swift` — slowLayer label (commit `c82dac2`).
- `3DPrintAssistantTests/EngineServiceTests.swift` — new S9 test (commit `c82dac2`).
- `project.yml` + `3DPrintAssistant.xcodeproj/project.pbxproj` — `MARKETING_VERSION` bump (commit `c99a797`).

## Commits

**Web `3dprintassistant` main (pushed):**
- `3335a30` — `fix: clamp fan_multiplier to (0, 1] in engine to mirror schema (S9 M1)`
- `2f0ccb8` — `docs: document v1.0.4 plate-API debt + add missing helper to API table (S9 OBS-01)`
- This session-close commit (plan + log + INDEX + ROADMAP + NEXT-SESSION + Codex artifacts md-hygiene).

**iOS `3dprintassistant-ios` main (pushed):**
- `2207f8f` — `chore: sync engine.js to web post-S9-M1 (fan_multiplier upper-bound clamp)`
- `c82dac2` — `fix: render slow_layer_time row in iOS Advanced cooling (S9 Obs1)`
- `c99a797` — `chore: bump MARKETING_VERSION 1.0.3 → 1.0.4 (S9 Phase 2.2 ship gate)`

## Open questions / Follow-up

**Md-hygiene findings from this session:**
- **Untracked-but-should-be-tracked (now landed in close).** Plan file `docs/superpowers/plans/2026-05-15-s9-v1.0.4-bug-free.md`; Codex post-S8.7 audit response file (modified — Codex's own deliverable) + 6 audit artifacts (`codex-2026-05-15-post-s8-7-profile-matrix-live.md`, `codex-2026-05-15-post-s8-7-walkthrough-live.md`, `ios-fd4761a..HEAD-live-log.txt`, `ios-fd4761a..HEAD-live-stat.txt`, `web-d9e58fa..HEAD-live-log.txt`, `web-d9e58fa..HEAD-live-stat.txt`). Convention is to track codex review packets — landing all in this close commit.
- **Protocol drift** — `diff -q Projects/CLAUDE.md Projects/AGENTS.md` exit 0 (byte-identical ✓).
- **No secrets in tree, no root-level orphan stubs, no buried content** in session logs.
- **No stale ROADMAP sections** — ROADMAP gets a v1.0.4-SHIPPED rewrite in this close.

**Reviewer-surfaced v1.0.5 carries (none Codex-originated, none ship-blocking):**
- **Min-1 — PLA-only S9 Obs1 test coverage.** Add a second material assertion (PETG `"12 s"`, ABS `"15 s"`) with hard-coded `XCTAssertEqual` to catch silent engine rescaling. ~5 LoC test-strength addition. v1.0.5 hygiene.
- **Min-2 — NSNumber decoder dead-code path.** `sync_getAdvancedFilamentSettings` slow_layer_time NSNumber branch is unreachable under current data (all 19 `slow_layer_time` entries in materials.json are pre-formatted strings; `engine.js:1272` is pass-through). Either delete the branch or refactor materials.json to raw Int + format in view. v1.0.5 cleanup decision.

**Prior v1.0.5 carry-forwards still pending (unchanged by this arc):**
- From S8.7 reviewer: M1 (now CLOSED — shipped in S9), m2 test rename, m1 awareness-only.
- From S8.5 reviewer: helper extraction (math duplication 4 sites), TDD-RED retroactive for F1/F2/F3, walkthrough hardcoded baseline.
- From S7-N reviewer: math duplication 3× (now 4× post-S8.5), `isPETG ? 5 : 0` magic constant, profile-matrix-audit env-axis blind spot (Codex MEDIUM-02 — but Codex said current report text is accurate), mobile-card warning text length check, smoke assertion for emit-vs-claim parity, shared `RETIRED_IDS` const array.
- Prior Codex MEDIUM-02 + OBSERVATION-01: OBSERVATION-01 now CLOSED via S9 doc note. MEDIUM-02 still carries as "rename release claim" or "expand sweep axes" — Codex said current text is accurate so this is hygiene only.

## Memory sweep

Two durable additions warranted, both reinforcing existing patterns:

1. **NEW MEMORY:** `feedback_tdd_red_catches_test_bugs.md` — the TDD-RED inverted-first discipline catches test-design bugs (not just implementation bugs). Hit twice in 24h: S8.5 retired-ID neg-assertions, S9 slow_layer_time string-vs-int contract. The convention is self-validating — if RED-then-GREEN-then-fail-on-different-error happens, the test had the wrong contract assumption. **Apply:** when the post-fix test fails on a different error than the pre-fix RED, fix the test (not the implementation) and capture both transitions in the breadcrumb.
2. **NO UPDATE NEEDED:** `feedback_skill_discipline_remediation_arcs.md` already names the 7 skills loaded at cold-start. Reviewer-pattern 7-for-7 is implicit — don't double-memorize.

Adding entry #1 now.

## Vault sweep

Nothing durable to propagate. Checked:
- **Strategic / rationale** — bug-vs-hygiene scope split was load-bearing for THIS session, but the framing ("codex-found = in scope, reviewer-found-hygiene = v1.0.5 carry") is already implicit in `feedback_no_relitigation.md` + `feedback_product_owner_posture.md`. No new vault entry needed.
- **Shorthand / new terms** — no new vocabulary. "S9" is a session label.
- **Cross-project pattern / tool routing** — none.
- **Hobby observation** — none (no print hardware action this session).
- **Consulting insight** — N/A.
- **External source** — N/A.

## Next session

**v1.0.4 is SHIPPED to TestFlight.** S10 (or whatever the next session is) becomes either:
- (a) **v1.0.4 live monitoring** — App Store review, TestFlight on-device feedback, analytics, Sentry.
- (b) **v1.0.5 hygiene pass cold-start** — bundle the carry-forwards (helper extraction, m2 test rename, MEDIUM-02 packet-text decision, mobile-card text length check, smoke assertion, RETIRED_IDS const, NSNumber decoder cleanup, Min-1 PLA+PETG+ABS test coverage) into a single hygiene arc.

NEXT-SESSION.md regenerated for v1.0.5 hygiene cold-start.
