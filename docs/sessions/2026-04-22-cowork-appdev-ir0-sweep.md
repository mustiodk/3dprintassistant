# 2026-04-22 — Cowork (appdev): IR-0 overnight sweep (5 findings shipped)

## Durable context

What a future session needs to know that ROADMAP doesn't capture:

- **Partner-reviewer hook installed at the start of this session.** User-level `~/.claude/settings.json` now has a PostToolUse agent hook on `Edit|Write|MultiEdit`: scoped to `3dprintassistant/` + `3dprintassistant-ios/` (excluding `docs/**`), invokes the `simplify` skill on the changed file, surfaces findings back via `hookSpecificOutput.additionalContext`. Non-blocking, advisory-only. Timeout 90s, Haiku. This was the user's explicit ask before the overnight sweep began ("a partner that did an assessment of your work on the fly"). Session-end note: hook did not produce any `additionalContext` payloads that I observed in transcript during this session — either (a) findings returned empty for every edit, (b) the watcher hadn't picked up the new settings file (requires `/hooks` menu or restart after the settings change; was set up fresh this session), or (c) the `simplify` skill invocation path from an agent hook doesn't populate back up through `hookSpecificOutput`. Worth verifying with a deliberate trigger next session before trusting the partner-reviewer loop.

- **Autonomous-execution authorization was session-scoped blanket.** Owner said "execute on all of them ... I will check on you in the morning ... review, verify, and if you feel good, push." Standing process rule from `NEXT-SESSION.md` (propose diff + wait for sign-off) was explicitly overridden for this session only. Default for next session reverts to propose-then-wait per the one-finding-one-commit rule.

- **The five items shipped are mechanically independent but share one invariant.** CRITICAL-003 (preset validation), HIGH-012 (why-text templating), and MEDIUM-015/016 (slicer_capabilities.json) all touch the `resolveProfile → getWarnings` path. No ordering dependency between them in this session (I did them in CRITICAL→HIGH→MEDIUM order), but all four code-path commits needed to land before the walkthrough harness could be re-run as a single regression check — so I ran the harness once after each. Total Node walkthrough runs this session: 5. Total iOS XCTest runs: 3 (one full at start establishing 35/35 baseline, one targeted per new assertion, one full at end confirming 37/37). Wall time dominated by simulator-spin-up, not test execution.

- **CRITICAL-003's `invalid_preset` warning duplicates the validation across `resolveProfile` + `getWarnings`.** Same trade-off as CRITICAL-002 bed-temp (documented in its session log). The alternative was threading an output-carrying helper or breaking the purity invariant. 3 lines of duplication is cheaper than either. Documented inline in the code so future simplification passes won't "refactor" it without reading the rationale.

- **HIGH-012 surfaces two more hardcoded A1/A1 Mini strings that this commit did NOT fix.** `p.outer_wall_acceleration.why` (line ~1702) and `p.slow_down_tall.why` (line ~1771). Same bug class — the why-text names a specific printer model when it should template. Not batched into the HIGH-012 commit per the "one finding = one commit" rule (the review only names `outer_wall_speed`). Filed as `[HIGH-012-followup]` in IR-5 backlog. **If someone is already in the vicinity of those lines for any reason, just fix them** — they'll cost <5 minutes and they're the same lie as the one we just fixed.

- **MEDIUM-015's valid-set half was already done before this session.** `lightning` was already listed in `prusaslicer.sparse_infill_patterns` in `slicer_capabilities.json` — the review may have been written against an earlier snapshot or the author forgot. The actual silent-downgrade vector was the fallback entry, which this commit dropped. Kept the finding ID for traceability; future reviewers will see `[MEDIUM-015]` in the commit + ROADMAP and match against the finding even though the description reads like both halves were undone.

- **Four IR-0 items explicitly deferred.** HIGH-014 (owner spec check), LOW-002 (owner text), CRITICAL-001 (iOS v1.0.2 release + Worker HMAC + secret gen + coordinated deploy — too entangled with EU DSA verification for overnight execution), HIGH-010 (production Worker rate-limit deploy — misconfigure locks out real users, prefer supervised). All four are now primary scope for IR-2a v1.0.2 ship pass (new phase added to ROADMAP this session).

- **iOS XCTest baseline recorded.** Cold first-run of the session, iPhone 17 Pro Max simulator, whole test bundle: **0.62s execution / 2m06s wall** (2m04s of that is simulator spin-up + Swift compilation, not tests). Subsequent runs in the same session drop to ~15s wall if the simulator stays warm. Record for future regression comparisons; a sudden 10× test-execution time likely means the engine bridge fell off a fast path.

## Context

Overnight autonomous session — first time the owner asked me to self-execute a multi-commit queue without per-item sign-off. Scope was IR-0 from the 2026-04-20 internal review + Phase 1 walkthrough. Goal: ship all IR-0 that's safely shippable without production-infra risk, then plan iOS v1.0.2 phase for a clean fresh-session handoff.

## What happened / Actions

Set up partner-reviewer hook (user-level `settings.json`, PostToolUse agent on `Edit|Write|MultiEdit`, scoped to the two project repos) before starting code work. Opened chapter marker. Shipped 5 findings one at a time — each: plan → edit web engine/data → sync iOS byte-identical → run walkthrough harness → run targeted iOS XCTest → 1 commit per platform → push both. No batching, no "refactors while in the neighborhood" beyond explicit observation-filing.

## Files touched

**Modified (web `3dprintassistant`):**
- `engine.js` — CRITICAL-003 validation block in `resolveProfile` + mirrored warning emission in `getWarnings`; HIGH-012 template substitution on `p.outer_wall_speed.why` bedslinger branch.
- `data/rules/slicer_capabilities.json` — MEDIUM-015 dropped `lightning → rectilinear` Prusa fallback; MEDIUM-016 added `adaptivecubic` to Bambu + Orca `sparse_infill_patterns`.
- `docs/planning/ROADMAP.md` — IR-0 ticks on 5 shipped items (CRITICAL-003, HIGH-002, HIGH-012, MEDIUM-015, MEDIUM-016); header refreshed to 2026-04-22; new **IR-2a iOS v1.0.2 ship pass** section inserted; tracking table restructured; HIGH-012-followup filed in IR-5 backlog; Last updated refreshed.
- `docs/sessions/INDEX.md` — new top-of-file bullet for this session.
- `docs/sessions/NEXT-SESSION.md` — regenerated for the IR-2a kickoff (full rewrite, see "Next session" below).

**Modified (iOS `3dprintassistant-ios`):**
- `3DPrintAssistant/Engine/engine.js` — byte-identical sync of web engine.js (twice — post-CRITICAL-003, post-HIGH-012).
- `3DPrintAssistant/Data/rules/slicer_capabilities.json` — byte-identical sync (twice — post-MEDIUM-015, post-MEDIUM-016).
- `3DPrintAssistantTests/EngineServiceTests.swift` — new `testInvalidPresetCoercedAndWarned` (4 scenarios), new `testOuterWallWhyTextNamesActualPrinter` (MK4 negation + A1 preservation), tightened `testSurfaceChipDescsMatchResolveProfileEmission` (now asserts 42-cell coverage, no silent skips).

**Modified (user-level Claude Code):**
- `~/.claude/settings.json` — added PostToolUse `agent` hook scoped to the two project repos; preserved existing Stop hook (claude-sync).

## Commits

**Web (`3dprintassistant`) — pushed to `main`:**
- `6173839` — `engine: validate preset IDs + emit invalid_preset warning [CRITICAL-003]`
- `5797738` — `engine: template outer_wall_speed why-text per printer [HIGH-012]`
- `e58d0ed` — `data: drop lightning→rectilinear Prusa fallback [MEDIUM-015]`
- `2ddff99` — `data: add adaptivecubic to Bambu + Orca sparse_infill_patterns [MEDIUM-016]`

**iOS (`3dprintassistant-ios`) — pushed to `main`:**
- `2cbf5c7` — `engine: validate preset IDs + emit invalid_preset warning [CRITICAL-003]`
- `cb0b73d` — `tests: tighten IMPL-040 surface-parity coverage assertion [HIGH-002]`
- `6e9d2be` — `engine: template outer_wall_speed why-text per printer [HIGH-012]`
- `aca26f1` — `data: drop lightning→rectilinear Prusa fallback [MEDIUM-015]`
- `34fba25` — `data: add adaptivecubic to Bambu + Orca sparse_infill_patterns [MEDIUM-016]`

9 commits total. CI triggered on all iOS pushes — expect green test runs, no TestFlight upload since there's no version bump (iOS build ID auto-bumps only on explicit version-string change; engine-sync commits inherit `v1.0.1` CFBundleShortVersionString). v1.0.2 version bump is first action in IR-2a.

## Data/logic change evaluation (standing rule)

- **CRITICAL-003 (validation + new warning):** web + iOS both benefit automatically — UI warning panels already render `{id, text, detail, fix}` structured warnings (RB-1 contract). `WarningCard` on iOS renders `invalid_preset` with no code change. No functional regression on valid happy-path inputs; one new warning ID to filter in analytics if relevant (`invalid_preset`).
- **HIGH-012 (why-text template):** strictly improves truth-telling in the rationale surface. No UI surface change; `why` strings are rendered verbatim on both platforms.
- **MEDIUM-015/016 (slicer_capabilities.json):** data-only. Engine reads these via existing `mapForSlicer` / pattern validation paths. Zero runtime behavior change today (no preset emits "adaptive cubic" yet; "lightning" was already emitted and now no longer silently falls back on Prusa). Future preset additions gain correct capability coverage.
- **HIGH-002 (test tightening):** test-only, no shipping code affected. Improves regression coverage.

## Walkthrough harness result

After all 5 changes stacked: **9/10 combos clean, 1 pre-existing warn (Combo 3: X1C + 0.8 std + PLA Basic + Draft/Fast — "⚠ 1 warn"). Same warn existed pre-sweep** — not introduced by any of tonight's commits. Leave as observation; investigate if it becomes actionable later.

## iOS XCTest result

**37/37 passing** (was 35/35 before this session). +1 `testInvalidPresetCoercedAndWarned` (CRITICAL-003), +1 `testOuterWallWhyTextNamesActualPrinter` (HIGH-012). `testSurfaceChipDescsMatchResolveProfileEmission` now asserts on 42 cells (up from ≤42 with silent skips).

## Md-hygiene sweep

1. **Root stubs:** none new; two untracked iOS root stubs already handled in prior session.
2. **Untracked-but-should-be-tracked:** none — only tracked changes this session.
3. **Secrets in the tree:** clean — no `.p8`/`.mobileprovision`/`.certSigningRequest`/PAT-in-URL found in either repo post-commit.
4. **Content buried in session logs:** HIGH-012-followup observation promoted to IR-5 backlog in ROADMAP (not left sitting in this log); partner-reviewer hook caveats captured in Durable context for next session to verify.
5. **Stale ROADMAP sections:** header refreshed 2026-04-22 with session outcome summary; IR-0 ticks applied; IR-2a added; tracking table restructured.
6. **Duplicate specs/plans:** no duplication introduced.

## Open questions / owner asks

- **Partner-reviewer hook — verify it's actually firing next session.** The hook was installed fresh this session, which means Claude Code's settings-watcher may not have picked it up without a `/hooks` menu open or a fresh session. No `additionalContext` payloads from the hook were observed in transcript during this run. First Edit next session should either surface `simplify` output, or silent-return means the hook isn't live. If the latter, opening `/hooks` once (or restarting) reloads config.
- **`[HIGH-014]` A1 mini `max_bed_temp`** — still needs owner's Bambu spec-page check (data says 100, review suggests 80). IR-2a is ready to fold the data update in the same session it lands.
- **`[LOW-002]` HIPS reason text** — still needs owner copy. IR-2a will apply whatever text the owner provides.
- **`[MEDIUM-018]` nozzles.json orphan cleanup** — owner decides: unify via IDs or groups. IR-2a scope.
- **v1.0.2 "What's New" copy** — IR-2a will draft; owner-tone review before App Store submit.
- **EU DSA status** — unchanged this session. If Apple's verification still hasn't cleared when v1.0.2 is ready to submit, v1.0.2 ships to the same ~121 non-EU countries. No action required this session.

## Next session

**IR-2a iOS v1.0.2 ship pass kickoff.** Fresh session because context pressure — this session already covers 5 ship-worthy findings + ROADMAP rewrites + hook install, and IR-2a will touch both repos + a Worker + a TestFlight round. See [`NEXT-SESSION.md`](NEXT-SESSION.md) for the copy-paste kickoff prompt. Structure:

1. Confirm partner-reviewer hook is live (first Edit should show hook output).
2. Start with the three open-ask data items (HIGH-014, LOW-002, MEDIUM-018) — minutes each if owner has the answers ready. Ship each as its own commit.
3. Engine correctness pass: HIGH-008, HIGH-009, MEDIUM-001, MEDIUM-002, MEDIUM-007 — one finding one commit, five commits, code-only, no infra coordination. Walkthrough harness + XCTest after each.
4. iOS reliability pass: HIGH-004, HIGH-005 — iOS-only, bridge error path.
5. **CRITICAL-001 + HIGH-010 as the session's headline** — Worker enhancement + iOS URL swap + HMAC secret gen + old webhook rotation. Ship as v1.0.2.
6. Version bump, "What's New", TestFlight round, App Review submit.
