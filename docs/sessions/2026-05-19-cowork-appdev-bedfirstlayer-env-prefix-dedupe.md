# 2026-05-19 — Cowork (appdev): bed-first-layer env-name prefix dedupe — slid into v1.0.4 TestFlight pre-ASC

## Durable context

- **Cold-start pivoted off the 3 PoC paths within ~1 turn — owner found a real bug.** Screenshot showed two warning banners on the cold-garage scenario both leading with `Cold garage (5–15°C)`: a dedicated bed-first-layer banner (MEDIUM-01 attribution-honesty path) and the consolidated nozzle / first-layer-speed banner. Visual chrome duplication; not a functional bug. Resin PoC remains parked.
- **Fix shape locked via matrix-style brainstorm.** Three options surfaced (drop prefix from bed-first-layer / consolidate everything into one banner / drop prefix from consolidated). Recommended Option 1 (minimal, preserves MEDIUM-01's load-bearing 3-branch clamp-attribution copy); owner picked Option 1. Rule doing the work: "right thing not easy thing post-live" *favored* Option 1 in this specific case because Option 2 would dilute MEDIUM-01's attribution-honesty copy — folding the partial/full-clip branches into a comma-joined parts list makes them read as parenthetical soup inside an already-long sentence. If MEDIUM-01 weren't in the picture, Option 2 (full consolidation) would have won on UX cleanliness.
- **TDD applied cleanly with no tool overrule + no reviewer disagreement — findings sweep returned 0.** RED (new `v1.0.5 env-prefix-dedupe` block in walkthrough-harness.js — block name kept as-is for historical accuracy of when it was authored, even after the v1.0.4 ride-along decision below) → verified fail with full error string `MUST NOT start with env.name "Cold garage (5–15°C)"` → GREEN (strip `${env.name}` from engine.js:1684/1688/1692, three MEDIUM-01 attribution branches; v1.0.5 comment in full-apply branch only — kept lean per "no narrating comments" standing rule) → re-verified green + non-regression on MEDIUM-01 + visual DOM read confirms 2 banners with no prefix dupe. Mirror iOS XCTest `testV105_EnvPrefixDedupeOnBedFirstLayerWarning` pins same contract via JSCore bridge across all 3 branches + pair contract (consolidated env_*_0 still leads with env.name).
- **Mid-session pivot: fix slid into v1.0.4 TestFlight pre-ASC submission (not held for v1.0.5).** Initial commit `e2985f1` was made local-only per push gate, expecting v1.0.5 ride. Owner then asked whether the fix could ride into the v1.0.4 TestFlight build currently under test. **Safe because v1.0.4 was on TestFlight but not yet submitted to App Store review** (parked behind PoC + waiting for owner GO). iOS commit amended pre-push (`e2985f1` → `ed08507`) to reflect ride-along rationale; iOS pushed `c99a797..ed08507`; TestFlight dispatched [run 26125919796](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/26125919796) — same MARKETING_VERSION 1.0.4, workflow auto-increments build number. **Implication for v1.0.5 carry bundle:** reverts to all items pending (helper extraction, m2 test rename, Min-1/Min-2, FDM-only scope copy, magic constants, mobile-card warning text length check, smoke assertion for emit-vs-claim parity, shared RETIRED_IDS const, walkthrough hardcoded baseline, MEDIUM-02 packet-text accuracy). The v1.0.5 naming on the walkthrough block + XCTest method (`testV105_*`) is preserved as authoring history; the fix itself is now part of v1.0.4 in the App Store sense.
- **One-finding-one-commit-per-platform respected.** Web `46334e6` pushed (flushes 2 prior PoC wrap commits + this fix); iOS `ed08507` pushed (amended from `e2985f1` to update message). Both on origin. Wrap commit + the ride-along reclassification will land in the closing web commit.

## What happened / Actions

1. **3dpa cold-start (Trigger C):** read top-level `Projects/CLAUDE.md` (loaded via SessionStart) → `3dprintassistant/CLAUDE.md` (5 critical rules + IMPL-040 single-source-of-truth) → `docs/3dpa-context.md` (engine API, web-master/iOS-mirror, OBSERVATION-01 plate-API debt) → `docs/planning/ROADMAP.md` (last updated 2026-05-17 evening) → `docs/sessions/INDEX.md` (top 50 lines) → last 3 logs (bridge R2+R3+v4, resin PoC kickoff, printer-protocol trial) → `docs/sessions/NEXT-SESSION.md` (3 PoC paths offered). Self-check delivered.
2. **Owner pivoted off the 3 PoC paths** ("we do something else. i found a bug.") with screenshot showing the duplicate-prefix banners.
3. **Investigation (no guessing per standing rule):** read engine.js:1640-1730 (the env.warnings loop) + `data/rules/environment.json` cold env block. Confirmed two pushes per env compensation: bed_first_layer warning (line 1695) + consolidated warning (line 1707). Both leading with `${env.name}` is the root.
4. **Bug-shape clarification** via AskUserQuestion — owner picked "duplicate prefix" (vs "should be one consolidated banner" vs "wrong content"). Locks Option 1 as the right scope.
5. **Fix-shape recommendation** via matrix-style brainstorm (3 options + honest recommendation + rule-doing-the-work). Owner picked Option 1.
6. **TaskCreate** scaffolded 6 tasks tracking RED → GREEN → gates → iOS sync → commits.
7. **superpowers:test-driven-development** invoked.
8. **RED:** added new `v1.0.5 env-prefix-dedupe` block in `scripts/walkthrough-harness.js` right after the MEDIUM-01 block. 3 cases (fully-clipped / full-apply / partial-clip) × 2 assertions (bed warning MUST NOT start with env.name + consolidated MUST start with env.name, pair contract). Ran walkthrough → failed exactly as expected at fully-clipped case.
9. **GREEN:** stripped `${env.name}` from engine.js:1684/1688/1692 (three MEDIUM-01 attribution branches: full-apply / fully-clipped / partially-clipped). One v1.0.5 comment in the full-apply branch documenting why (consolidated env_*_0 warning carries env framing). Re-ran walkthrough → both v1.0.5 dedup block + MEDIUM-01 non-regression OK.
10. **All gates green:** validate-data 6/6 ✓, walkthrough clean ✓ (all OK lines + new `[v1.0.5 env-prefix-dedupe] OK` + `[v1.0.4 P1.5 MEDIUM-01] OK`), profile-matrix-audit 55/55 curated + 0 broad failures ✓.
11. **Visual verification:** started preview server `3dpa-web` on port 4200. Drove the UI (Bambu Lab → X1 Carbon → PLA Basic → Standard 0.4 mm → Cold garage). DOM-read of `.warning-item` elements returned exactly:
    - `⚠ PLA + enclosed printer: Open the front door...`
    - `⚠ First-layer bed compensation: +7°C applied...`
    - `⚠ Cold garage (5–15°C) compensation applied — nozzle +5°C, first-layer speed reduced 20%.`
    No duplicate prefix; second banner still carries env framing.
12. **iOS sync:** `cp 3dprintassistant/engine.js 3dprintassistant-ios/3DPrintAssistant/Engine/engine.js`. Verified byte-identical via `shasum` (matching `ec0370e1...`).
13. **iOS XCTest:** added `testV105_EnvPrefixDedupeOnBedFirstLayerWarning` right after `testV104_P1_5_MEDIUM01_BedClampAttribution`. Same 3 cases + pair contract via JSCore bridge. Ran targeted suite → both new test + MEDIUM-01 non-regression passed (0.097s total). Full suite run in background as final safety → 110/110 passed (was 109 + 1 new).
14. **Web commit + push:** `46334e6` (`fix(engine): strip env.name prefix from bed-first-layer warning`). Pushed `9bdc4fc..46334e6` (3 commits flushed — my fix + 2 prior PoC wrap commits that were waiting). Cloudflare auto-deploys.
15. **iOS commit (local-only per push gate):** `e2985f1` (same subject line; mentions iOS XCTest 110/110 + push-gate rationale).
16. **Trigger A wrap-up begun** — md-hygiene sweep (clean), findings sweep (nothing to capture), this log, INDEX prepend, ROADMAP touch, NEXT-SESSION regen.

## Files touched (Modified / Deleted / Untracked)

**Web (Modified):**
- `engine.js` — 3 attribution branches at :1684/:1688/:1692 lose the `${env.name}` prefix; v1.0.5 comment in full-apply branch documenting the dedup
- `scripts/walkthrough-harness.js` — new `v1.0.5 env-prefix-dedupe` block at :1268-1313 (45 added lines: 3 cases × 2 assertions + pair contract)
- `docs/planning/ROADMAP.md` — Last-updated paragraph + v1.0.5 progress bullet (this commit's wrap)
- `docs/sessions/INDEX.md` — one-bullet prepend (this commit's wrap)
- `docs/sessions/NEXT-SESSION.md` — regen (this commit's wrap)

**iOS (Modified):**
- `3DPrintAssistant/Engine/engine.js` — byte-identical sync with web
- `3DPrintAssistantTests/EngineServiceTests.swift` — new `testV105_EnvPrefixDedupeOnBedFirstLayerWarning` right after `testV104_P1_5_MEDIUM01_BedClampAttribution` (~50 added lines: 3 cases × 2 assertions + pair contract)

**Untracked at close (will be committed by wrap-up):**
- `docs/sessions/2026-05-19-cowork-appdev-bedfirstlayer-env-prefix-dedupe.md` — this log

**Deleted:** none.

## Commits

- **Web `46334e6`** — `fix(engine): strip env.name prefix from bed-first-layer warning` — pushed (`9bdc4fc..46334e6  main -> main`; Cloudflare auto-deploys).
- **iOS `e2985f1` → amended to `ed08507`** — same subject; commit message updated mid-session to reflect v1.0.4 ride-along instead of "v1.0.5 not yet ship-ready"; pushed `c99a797..ed08507`.
- **TestFlight dispatch:** [run 26125919796](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/26125919796) via `gh workflow run testflight.yml --ref main`. ~10 min on macos-26 runner.
- Wrap commit (this session-close on web): TBD at end of close — adds this session log + INDEX prepend + ROADMAP touch + NEXT-SESSION regen.

**iOS push gate:** owner-directed exception — slide into v1.0.4 TestFlight pre-ASC. Push gate rationale preserved: each push aligns `main` with TestFlight state; v1.0.4 is now mid-TestFlight-cycle + this fix is part of that cycle.

## Open questions / Follow-up

- **v1.0.5 carry bundle reverts to all items pending** (post-ride-along reclassification): helper extraction across 4 math-duplication sites, m2 test rename, Min-1 PLA+PETG+ABS slow_layer_time test coverage, Min-2 NSNumber decoder cleanup, magic constants, mobile-card warning text length check, smoke assertion for emit-vs-claim parity, shared RETIRED_IDS const, walkthrough hardcoded baseline, MEDIUM-02 packet-text accuracy, FDM-only scope copy on a user-facing surface. None shipped to iOS yet; gate posture unchanged for the rest of the bundle. (The walkthrough block name `v1.0.5 env-prefix-dedupe` + XCTest method `testV105_*` retain the v1.0.5 prefix as authoring history — they do NOT imply v1.0.5 has shipped.)
- **v1.0.4 TestFlight build acceptance:** watch [run 26125919796](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/26125919796) for green; then owner-test the new v1.0.4 build (same version label, higher build number) on device. If GO: submit v1.0.4 to App Store review via ASC. If regression: focused fix arc within v1.0.4.
- **PoC paths still parked:** v5 mechanical pass on `docs/resin-scaling/problem-statement.md` (MF-R3-1 `index.html:8` regression + 8 SHOULD-FIX + 3 OPTIONAL), Gate 1 desk research (`technical-differences.md`), bridge/CLAUDE.md cwd-scope standing rule preamble. NEXT-SESSION can re-surface these after this fix bundle's wrap.
- **Md-hygiene findings:** none. `diff -u Projects/CLAUDE.md Projects/AGENTS.md` clean; no root .md stubs; no untracked .md outside this session log; no secrets; no buried durable content (this log + the fix commit messages capture everything load-bearing).
- **Findings sweep:** zero K1/K2/K3/K4 captured. TDD skill applied cleanly (RED → GREEN → verify each step); no tool overrule (the matrix-style brainstorm worked as designed and owner picked the recommended option); no reviewer disagreement.
- **MCP wrap-up hook:** N/A — no MCP behavior tested or surfaced this session.

## Next session

Owner-pick at cold-start:

1. **PoC re-surface** (Path A v5 / Path B Gate 1 / Path C bridge cwd-scope preamble) per the previous NEXT-SESSION.md — those paths remain valid; this fix didn't disturb them.
2. **v1.0.5 hygiene continuation** — next carry-bundle item (helper extraction across 4 math-duplication sites is the biggest piece; FDM-only scope copy is the smallest).
3. **v1.0.4 → App Store review submission** — gated on owner's TestFlight verdict for [run 25892826819](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25892826819).
4. **New owner-found bug** if one surfaces between sessions.

NEXT-SESSION.md regenerated covering options 1 + 2.
