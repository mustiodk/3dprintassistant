# 2026-05-14 — Cowork (appdev): v1.0.4 S8 — Phase 2.1 iOS engine + data sync + 11 XCTest mirrors (Phase 2.1 closes)

## Durable context

- **Phase 2.1 closes; v1.0.4 is now mirrored byte-identically on iOS.** iOS HEAD `fc3ee6b` carries web HEAD `2994d3b`'s `engine.js` (174618 → 201074 bytes) + all data files. Two iOS local commits: `350d23f` initial sync + 11 XCTest mirrors; `fc3ee6b` tightening per internal-reviewer findings. **Phase 2 gate respected — zero pushes.** S9 Phase 2.2 (UI walkthrough + MARKETING_VERSION 1.0.3 → 1.0.4 bump + 5-point ship-ready handoff) opens next.
- **iOS `AdvancedFilamentSettings` Codable struct does not expose fan fields** (only the four temperature fields per `EngineService.swift:70-78`). The web walkthrough's HIGH-07/08 ENV block uses `advNormal.fan_max_speed.value` for the env-fan-multiplier check; iOS cannot mirror this directly. T2a was scoped to bed-delta + draft_shield + HIGH-05-banner only; fan env-scaling coverage is transitive via T12 (P1.5 HIGH-01 export), which asserts text export `Fan speed (min): 63` + Bambu Studio `fan_min_speed/fan_max_speed` arrays = 63/90 for PLA+cold. **S9 carry-forward:** extend `AdvancedFilamentSettings` with `fan_min_speed` / `fan_max_speed` so T2a can assert fan reduction directly on the iOS Advanced surface — small Codable additive change, would close the only iOS-side coverage gap in the v1.0.4 mirror.
- **The "internal code-review subagent between impl and tightening" pattern is now 4-for-4 on the v1.0.4 arc.** S7-2 caught PVA scope creep; S7-4 caught Creality empty-MCS mis-targeting; S7-3 caught partial-clip branch dead-untested; S8 caught **two** real coverage gaps the committer missed: T6 had no PLA chamber-cap branch at all (would let a regression that re-removed `safe_chamber_temp_max=50` from `pla_basic` slip through XCTest), and T2a had no HIGH-05 banner check (the warning-copy-honesty check that was the entire point of HIGH-05). Plus two loose-substring-matcher Important/Minor findings (T3, T4, T2b). Standing rule: for any multi-surface/multi-branch remediation, dispatch the reviewer between impl and tightening before push. The discipline keeps paying for itself.
- **Loose substring matchers are the dominant XCTest-mirror failure mode on iOS.** Pre-tightening, T2b/T3/T4/T7 all used `contains("X") && contains("Y")` style filters speculatively, before knowing the exact emitted warning ID. The reviewer's I-4 + M-1 + M-2 findings all attacked this same class. Lesson family: when mirroring a web walkthrough assertion that anchors on a warning ID (or any string emission), **grep the web source for the exact ID first**, then mirror with `==` or `.contains(exactId)`. Substring matches are appropriate only when web's own source uses a regex/substring — and even then, the iOS mirror should match the same pattern verbatim. The tightening commit replaced 4 loose matchers with exact-ID or exact-regex mirrors.
- **TDD-RED demo discipline left no artifact.** Per plan Task 5.2, T1 was authored with `XCTAssertEqual(strongOuter, 999, accuracy: 0.01, ...)` (deliberately inverted), then run (got the expected RED with `"90.0" is not equal to "999.0"`), then flipped to `, 90, ...`. This proves the test machinery + engine resolution worked, but the only record of it happening is the commit body for `350d23f`. Reviewer M-4: "process gap, not a correctness bug." **S9 carry-forward:** either leave a `// RED demo verified YYYY-MM-DD` comment in the test, or do the RED in a tiny separate commit before flipping (gives a real audit trail).
- **Pre-sync data file state matters less than expected.** Plan Task 3.1 surfaced that all 4 `data/rules/*.json` files were already byte-identical pre-cp. `printers.json` likewise — iOS had been updated for the 2026-05-12 SPARKX i7 hotfix (`eeb2915`) which happens to coincide with the version on web. So `git diff` only landed 4 files in `350d23f`: `engine.js`, `materials.json`, `nozzles.json`, `EngineServiceTests.swift`. `printers.json` + `rules/*.json` got `cp`'d but produced no git diff. **The byte-identity recheck (Task 16.2) is the load-bearing verification**, not git's modified-file count.

## What happened / Actions

1. **Cold-start (Trigger C 3dpa read order)** at session open. Top-level CLAUDE.md → 3dpa CLAUDE.md → docs/3dpa-context.md → ROADMAP → INDEX → last 3 session logs (S7-3 / S7-4 / S7-2) in full → NEXT-SESSION → iOS CLAUDE.md (since S8 pivots to iOS). State snapshot: web HEAD `2994d3b` clean (plus the S8 plan file untracked); iOS HEAD `eeb2915` clean.
2. **Skill discipline (7/7)** loaded per `feedback_skill_discipline_remediation_arcs.md`: using-superpowers, writing-plans, executing-plans, requesting-code-review, systematic-debugging, test-driven-development, verification-before-completion. All loaded at cold-start, not lazily.
3. **Wrote per-session implementation plan** at `docs/superpowers/plans/2026-05-14-s8-phase-2-1-ios-sync.md`. Self-review pass before execution: spec coverage confirmed (Task 8 + Phase 1.5 extensions); no placeholders; iOS API surface verified (AppState properties, EngineService method signatures); spotted that the canonical plan's example `AppStateBuilder` doesn't exist in the iOS repo — plan uses actual `AppState()` mutation pattern.
4. **Pre-flight (Plan Task 0).** Web log oneline confirmed `2994d3b` HEAD; both worktrees clean (modulo the untracked plan file); iOS HEAD `eeb2915` confirmed.
5. **Byte-identical sync (Plan Tasks 1-3).**
   - `engine.js` `cp` + `diff -q` → byte-identical (174618 → 201074 bytes).
   - `data/{printers,materials,nozzles}.json` `cp` + `diff -q` → all byte-identical.
   - `data/rules/*.json`: pre-sync `diff -q` showed all 4 already identical; `cp` still ran for completeness; post-cp `diff -q` re-confirmed.
6. **Decode smoke test (Plan Task 4).** Ran full existing iOS XCTest suite WITHOUT any new tests yet. Result: 96 unit tests + 1 UI test = 97 passed, 0 failed. **Forgiving-Codable rule held** — all v1.0.4 additive data shape changes decode cleanly through `EngineService.swift`'s Codable layer with no Swift-side changes required. This was the critical gate before adding mirror tests.
7. **TDD-RED demo on T1 (Plan Task 5.2).** Authored T1 with `XCTAssertEqual(strongOuter, 999, accuracy: 0.01, ...)`. Ran `-only-testing:` → `Test Failed`: `("90.0") is not equal to ("999.0")`. Proved: (a) test discovery works, (b) `numeric()` helper correctly extracts 90.0 from "90 mm/s", (c) engine.js on iOS emits `outer_wall_speed=90` for `strength=strong` matching web. Flipped to `, 90, ...`. Per S7-4 pattern, the remaining 10 mirror tests were trusted by symmetry — full-suite run is the GREEN proof.
8. **Authored remaining 10 mirror tests + 4 helpers (Plan Tasks 6-14)** in one batch edit. Two helpers up-front (`numeric`, `parseTemp`) + two more later (`toIntString`, `firstFromBSArray`). MARK divider for `// MARK: - v1.0.4 Phase 1` and `// MARK: - v1.0.4 Phase 1.5`.
9. **First full-suite run (Plan Task 15).** 4 failures emerged — all assertion-level, not build-level. Triage via systematic-debugging Phase 1 (root cause investigation):
   - **F1 (T2a):** `AdvancedFilamentSettings` Codable struct doesn't expose `fan_max_speed` — Swift compile fail, then runtime nil after I tried `resolveProfile["fan_max_speed"]` which also turned out absent. **Stop condition #2 from the plan applies** — iOS-side struct extension is out of S8 scope. Re-scoped T2a to drop direct fan check; documented as S9 carry-forward; relied on T12 (P1.5 HIGH-01 export) for fan coverage via text + BS export.
   - **F2 (T4):** Actual emission is `plate_not_on_printer` (not the speculative `printer_plate_incompatible`); substring filter `contains("not_supported")||contains("incompat")` didn't match it. Tightened to exact ID.
   - **F3 (T7):** Wrong material — plan used `pla_cf` which fires CF hardness warnings (`cf_soft_nozzle`, `abrasive_soft_nozzle`) not diameter warnings. Web walkthrough uses `tpu_85a` (min_nozzle_diameter=0.6mm) + std_0.4. Corrected.
   - **F4 (T12):** Bambu Studio filament fields are JSON arrays (`bs.filament.fan_min_speed[0]`), not scalars; my `toIntString` cast to String/Int/Double returned nil. Added `firstFromBSArray()` helper that casts `NSArray` first.
10. **Build fixes applied**, suite re-run. 107 unit tests now compiled + executed. **1 remaining failure (T12)** — text export uses `Fan speed (min): 63%` and `Part cooling fan: 100%` (not `Fan speed (max):`). Web walkthrough only asserts fan_min via text — my iOS test over-asserted by also pinning fan_max via text. Aligned to web's exact coverage shape (fan_max coverage stays in BS export check).
11. **Suite re-run (Plan Task 15.1 final).** 108/108 passed (107 unit + 1 UI screenshot test), 0 failed. xcresult JSON confirmed.
12. **Pre-commit sanity (Plan Task 16).** `git status` showed 4 modified files (engine.js, materials.json, nozzles.json, EngineServiceTests.swift). `printers.json` + `rules/*.json` got `cp`'d but produced no git diff (content was already identical pre-sync). Final byte-identity recheck across all 8 sync targets vs web → `ALL byte-identical`.
13. **ONE iOS local commit `350d23f` (Plan Task 17).** Subject: `chore: sync v1.0.4 engine + data; add Phase 1 + Phase 1.5 XCTest mirrors`. 4 files changed, 909 insertions / 235 deletions. **No push** — Phase 2 gate.
14. **Internal code-review subagent dispatched (Plan Task 18).** SHA range `eeb2915..350d23f`. Prompt covered 12 specific challenge points (byte-identity, walkthrough 1-for-1 alignment, substring-matcher looseness, RED-DEMO discipline, LOW-01 skip justification, T2a fan-coverage drop, helper safety, etc.). Reviewer returned structured report: 0 Critical / 4 Important / 5 Minor. **GO with conditions.** Important findings: I-1 T6 missing PLA chamber-cap positive branch entirely (would let a regression that re-removed `safe_chamber_temp_max` from PLA-family slip through); I-2 T2a missing HIGH-05 banner (warning-copy-honesty check); I-3 T6 missing guard-text 50°C content check (original HIGH-05 bug class); I-4 T3 substring matcher loose (should be exact `nozzle_not_on_printer`). Minor must-fixes M-1 + M-2 also tightening substring matchers (T4 plate-temp-range, T2b env_capped).
15. **Tightening commit (Plan Task 18.4).** All 4 Important + 2 Minor findings landed in one commit `fc3ee6b` (1 file changed, 112 insertions / 36 deletions). Specifics:
    - T6 extended: PLA branch (X1E+PLA fires + X1C+PLA silent) + guard-text "50" content check on both PETG and PLA paths.
    - T2a extended: regex-extract `+N°C` from warning text, assert N == bedCold - bedNormal delta.
    - T3 tightened: exact ID `nozzle_not_on_printer` + new non-regression case (x1c+std_0.6 silent).
    - T4 tightened: exact ID `plate_bed_temp_range` + non-regression (PLA on textured_pei silent).
    - T2b tightened: regex `/env_compensation_capped|env.*clamp|cold.*clamp/i` mirroring web.
16. **Suite re-run post-tightening.** 108/108 still green. Tightening shipped clean.
17. **Trigger A close (this).**

## Files touched

**iOS repo (`3dprintassistant-ios`):**

- Modified across `350d23f` (sync + initial mirrors):
  - `3DPrintAssistant/Engine/engine.js` — byte-identical from web.
  - `3DPrintAssistant/Data/materials.json` — byte-identical (added `safe_chamber_temp_max: 50` on 5 PLA-family materials + multiple v1.0.4 Phase 1 fields).
  - `3DPrintAssistant/Data/nozzles.json` — byte-identical (nozzle-side authority drop per HIGH-06).
  - `3DPrintAssistantTests/EngineServiceTests.swift` — 11 new `testV104_*` tests + 4 helpers (`numeric`, `parseTemp`, `toIntString`, `firstFromBSArray`).
- Modified across `fc3ee6b` (tightening):
  - `3DPrintAssistantTests/EngineServiceTests.swift` — addresses I-1/I-2/I-3/I-4/M-1/M-2 per reviewer.
- **Cp'd but no git diff** (content was already identical pre-sync):
  - `3DPrintAssistant/Data/printers.json`
  - `3DPrintAssistant/Data/rules/{environment,objective_profiles,slicer_capabilities,troubleshooter}.json`

**Web repo (`3dprintassistant`):**

- Created (in S8 setup): `docs/superpowers/plans/2026-05-14-s8-phase-2-1-ios-sync.md` — the S8 implementation plan.
- (this close) Created: `docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s8-ios-sync.md`.
- (this close) Modified: `docs/sessions/INDEX.md` — S8 entry prepended.
- (this close) Modified: `docs/planning/ROADMAP.md` — header date + active-queue v1.0.4 pointer flipped from "Phase 1.5 closed; S8 Phase 2.1 opens" to "Phase 2.1 closed; S9 Phase 2.2 opens".
- (this close) Modified: `docs/sessions/NEXT-SESSION.md` — regenerated for S9.

## Commits

**iOS `3dprintassistant-ios` `main` (in order on top of `eeb2915`):**

- `350d23f` — `chore: sync v1.0.4 engine + data; add Phase 1 + Phase 1.5 XCTest mirrors` — 4 files, +909/-235. Initial sync + 11 mirror tests + 4 helpers.
- `fc3ee6b` — `chore: tighten S8 XCTest mirrors per internal code-review subagent` — 1 file, +112/-36. Tightening per reviewer.

**iOS NOT pushed.** `origin/main` still at `eeb2915`; local ahead by 2 commits. Phase 2 gate active until S9 5-point check.

**Web `3dprintassistant` `main`:**

- The S8 plan file lands in this close commit alongside the session log + INDEX + ROADMAP + NEXT-SESSION updates.

## Open questions / Follow-up

Md-hygiene sweep findings (one-liner per check):

- **Root-level stubs:** only `CLAUDE.md` at repo root; real doc, not a redirect stub. Clean.
- **Untracked but should-be-tracked:** the S8 plan file was untracked when this close began; lands in this close commit. Clean post-commit.
- **Secrets in tree:** `grep -lE 'ghp_|sk-[A-Za-z0-9]{20,}|xoxb-|BEGIN [A-Z]+ KEY'` across new test code → no matches.
- **Protocol drift:** `diff -q Projects/CLAUDE.md Projects/AGENTS.md` → byte-identical.
- **Stale ROADMAP:** addressed inline — header date + active-queue v1.0.4 pointer updated to Phase 2.1 closed; S9 opens.
- **Duplicate specs:** none introduced; the S8 plan is a per-session operationalization of the canonical v1.0.4 plan, not a duplicate.
- **Content-routing:** durable patterns are arc-internal and live in this log's Durable context.

S9 carry-forwards (concrete, actionable):

- **Extend `AdvancedFilamentSettings` Codable struct to expose `fan_min_speed` + `fan_max_speed`.** Single additive Swift change at `3DPrintAssistant/Engine/EngineService.swift:70-78` + matching decoder. Lets T2a assert fan reduction on the Advanced surface directly instead of via transitive text/BS coverage in T12. Closes the only iOS-side coverage gap in the v1.0.4 mirror. Small, low-risk; pair with T2a re-extension in the same commit.
- **TDD-RED breadcrumb pattern.** Either leave a `// RED demo verified YYYY-MM-DD` comment in tests where the demo ran, or do the RED in a tiny separate commit before the flip. Closes reviewer M-4 ("self-reported only"). Worth documenting in the testing pattern under `docs/3dpa-context.md` if it becomes a standing discipline.
- **S7-3 carry-forwards still pending** (math duplication 3× in engine.js, profile-matrix-audit env-axis blind spot, smoke assertion for emitted-vs-claimed bed parity, mobile-card warning text length check). Land before any next bed-formula touch, or as a hygiene pass post-v1.0.4 ship.
- **Shared `RETIRED_IDS` const array** (S7-4 carry-forward, multi-arc audit). Still deferred.

S9 entry-point specifics:

- **iOS HEAD `fc3ee6b`** post-tightening; web HEAD will be the S8 close commit (set after Task 20).
- **S9 mechanics (Phase 2.2 / Task 9):** UI screenshot walkthrough via `ScreenCaptureUITests/testCaptureAllScreens` on iPhone 17 Pro simulator → bump `project.yml` `MARKETING_VERSION: 1.0.3 → 1.0.4` → `xcodegen generate` → second iOS local commit → 5-point ship-ready handoff to owner.
- **5-point ship-ready check:** (1) all planned changes landed; (2) XCTest green at 108; (3) walkthrough harness green on web; (4) MARKETING_VERSION bumped; (5) owner ready to dispatch TestFlight. After 5/5: owner runs `gh workflow run testflight.yml --ref main` from iOS repo manually.
- **iOS push gate stays active through S9** — owner pushes (or authorizes push) only after the 5-point check passes.

## Memory sweep

**Candidates considered:**

- **"When mirroring web walkthrough assertions on iOS, find EXACT warning IDs in the web source first; don't use loose substring matchers speculatively."** Reviewer caught 4 instances of this in S8 (T2b, T3, T4 + M-1). This is a remediation-arc-specific tactical lesson that generalizes to any cross-platform behavior mirror. Worth saving — proposing as a new feedback entry.
- "Internal code-review subagent pattern is 4-for-4 across Phase 1.5 + S8." Already implicit in `feedback_skill_discipline_remediation_arcs.md`'s `requesting-code-review` mandate. The 4-for-4 streak is calibration evidence in this log; not durable as a new memory.
- "Codable forgiving-decode rule held on additive data shape changes (PLA `safe_chamber_temp_max`, strength `speed_multiplier`, env field additions)." 3dpa-internal standing rule #9; already documented in `3dpa-context.md`. Not durable as memory.

**Result: 1 new memory candidate** — propose for save: "iOS XCTest mirrors: exact warning IDs before substring matchers."

## Vault sweep

**Surfaces considered (per the canonical 6 in `Projects/CLAUDE.md` Trigger A vault-sweep checklist):**

- **Strategic decision / rationale** → `Obsidian Vault/10-Projects/3dpa.md`: Phase 2.1 closure is a phase milestone, captured in ROADMAP + INDEX. No strategic-level write-up needed.
- **New shorthand / term** → `memory/glossary.md`: no new shorthand introduced.
- **Cross-project pattern / routing change** → `Obsidian Vault/20-Areas/Development/toolchain.md`: the "exact IDs over substring matchers" lesson is project-internal testing discipline, not a tool-routing rule.
- **Hobby observation that feeds product intuition** → `Obsidian Vault/20-Areas/Hobbies/3d-printing.md`: N/A — S8 is mechanical iOS sync, no hobby insight surfaced.
- **Consulting / external source:** N/A.

**Result: nothing durable to propagate.**

## Next session

**S9 — Phase 2.2 / Task 9** cold-starts on iOS UI walkthrough + MARKETING_VERSION bump + 5-point ship-ready handoff. Concrete entry point: run `ScreenCaptureUITests/testCaptureAllScreens` on iPhone 17 Pro simulator (matches existing pattern from iOS CLAUDE.md), spot-check the generated `/tmp/ui-review/pro/*.png` screenshots for any visible regression from the new engine + data; bump `project.yml` `MARKETING_VERSION: 1.0.3 → 1.0.4`; run `xcodegen generate` (regenerates `.pbxproj`); commit as second iOS local commit; run the 5-point ship-ready check; surface "ready for owner TestFlight dispatch" to owner. Pattern: same internal-code-review-subagent discipline (4-for-4 now); push only AFTER 5-point check passes and owner authorizes.

Also worth front-loading early in S9: extend `AdvancedFilamentSettings` Codable struct to expose fan, then re-extend T2a (closes the last v1.0.4 iOS coverage gap before ship).

## Self-check (Trigger A Phase 5)

- **Phase 1 step 1** (`git status`): clean on web post-this-commit; iOS clean post-tightening (`fc3ee6b` HEAD, working tree clean).
- **Phase 1 step 2** (project scope): 3dpa-web + 3dpa-ios both touched this session; not multi-project per the disambiguation table (3dpa is the single product token).
- **Phase 1 step 3** (disambiguation): not needed — opening message explicitly said "3dpa cold start" + "lets do s8".
- **Phase 2 step 4** (md-hygiene): 7 checks ran; all clean. Findings under Open questions above.
- **Phase 2 step 5** (session log): written at `docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s8-ios-sync.md`. Destination label **(5-documented)** — 3dpa CLAUDE.md documents the session-log convention.
- **Phase 2 step 6** (INDEX): S8 entry prepended; Phase 2.1 marked closed.
- **Phase 2 step 7** (ROADMAP): header date + active-queue v1.0.4 pointer updated to "Phase 2.1 closed; S9 Phase 2.2 opens".
- **Phase 3 step 8** (memory): 3 candidates considered, 1 proposed (`feedback_ios_xctest_exact_ids.md` — exact IDs over substring matchers).
- **Phase 3 step 9** (vault): 5 surfaces considered, 0 to propose.
- **Phase 4 step 10** (NEXT-SESSION regen): regenerated for S9 Phase 2.2 / Task 9 — major surface change since this is the first ship-side session in the v1.0.4 arc.
- **Phase 4 step 11** (copy-paste prompt): surfaced between `>>> START >>>` / `<<< END <<<` markers in NEXT-SESSION.
- **Phase 5 step 12** (self-check): this section.
