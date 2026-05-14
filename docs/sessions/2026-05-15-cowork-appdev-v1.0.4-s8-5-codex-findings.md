# 2026-05-15 — Cowork (appdev): v1.0.4 S8.5 — Codex post-Phase-1 audit remediation (4 findings + 1 reviewer catch)

## Durable context

- **S8.5 fully remediates the 2026-05-14 Codex post-Phase-1 audit** (`codex/post-phase-1-audit/codex-2026-05-14-post-phase-1-audit-response.md`): F1 cooling_fan_overhang env-scaled across 3 surfaces (Important #1); F2 iOS AdvancedFilamentSettings Codable struct extended with fan fields + T2a/T12 direct assertions (Important #2); F3 testV104_T5_PracticalMCSTiers extended with 6 new MCS sub-cases (Medium #1); F4 TDD-RED breadcrumb convention codified in ai-collab.md (Low #1). PLUS one tightening commit per platform after the internal-reviewer subagent caught a 5th env-scaling surface that both the S8.5 committer AND Codex's prior audit missed: `resolveProfile`'s `p.fan_speed` at `engine.js:2641-2667` was emitting raw `'100%'/'50%'/'25%'/'0%'` from `fanMap[material.fan_policy]` without env-scaling. Same intent as F1, different surface — the "Fan speed" column rendered in every slicer tab. Internal-reviewer pattern is now **5-for-5** across the v1.0.4 arc (S7-2 PVA scope creep / S7-4 Creality empty-MCS / S7-3 partial-clip branch / S8 PLA chamber-cap + HIGH-05 banner / S8.5 p.fan_speed). Standing rule confirmed: for any multi-surface remediation, dispatch the reviewer BEFORE the Codex packet — Codex would have caught the missed surface as Important #1 redux, which would feel like the remediation didn't take.
- **The float-tolerant `fanMultIsIdentity` pattern (`Math.abs(fanMult - 1.0) < 1e-9`) was applied to all 6 fan-prov + fan-why sites in `engine.js`** (reviewer M-3). Defends against floating-point drift if future env composition arithmetic produces 0.9999999 or 1.0000001 — strict `!== 1.0` would mis-classify both. Cheap hardening, single hoisted const reused at 6 emission sites. Set as the standing pattern for any future scaling-vs-identity comparisons in engine.js.
- **The bed-temp duplication carry-forward from S7-3 reviewer (Important #1 + #2)** is now **actively painful** post-S8.5 — the env-scaled fan recipe duplicates the same `Math.round(raw * fanMult)` pattern across 4 sites (fanMaxScaled, fanMinScaled, overhangScaled, and now fan_speed scaledPct). The helper-extraction (`_computeEnvScaledFan` plus the prior `_computeInitBedTarget`) should land early in v1.0.5 before any next fan-related touch — internal-reviewer M-2 explicitly nudged its priority up. Still not a v1.0.4 ship blocker; bundling helper extractions into v1.0.5 alongside the broader engine.js hygiene pass (math duplication + isPETG magic + matrix env-axis sweep + RETIRED_IDS const + mobile-card text-length + smoke assertion for emit-vs-claim parity) keeps v1.0.4 shippable.
- **`getFilamentProfile.cooling_overhang` at `engine.js:1122` intentionally stays raw** because it's the state-less material-reference panel display (no `env` access). Reviewer accepted the scope. The 4 env-adjustable surfaces (Advanced filament panel via getAdvancedFilamentSettings, BS export filament, text export, profile output via resolveProfile.fan_speed) are now all env-scaled consistently. If a future refactor adds `state` to `getFilamentProfile` to support env-aware filament-reference rendering, this exclusion would need re-evaluation. Track as an invariant note.
- **iOS Codable extension is test-only — no UI surfacing.** `AdvancedFilamentSettings.fanMinSpeed / fanMaxSpeed / coolingFanOverhang` are populated by the decoder at `EngineService.swift:684-708` but not consumed by any view yet (`FilamentSettingsView.swift`/`OutputViewModel.swift` don't read them). This is exactly the scope Codex's Important #2 asked for ("expose via Codable for direct testing"). UI surfacing is a separate v1.0.5+ work item if the Advanced filament panel needs fan-row rendering parity with the web app. Surfaced in the new Codex packet so the next pass doesn't re-flag it as "fields exist but never rendered."
- **TDD-RED breadcrumb convention now lives in `docs/ai-collab.md`** as a binding 3dpa pattern for any cross-platform mirror commit (iOS mirroring web walkthrough, future cross-tool mirrors). Two acceptable patterns: (1) inverted-first on one representative + code comment OR pre-commit reverted in follow-up; (2) skip with explicit commit-body note for degenerate-RED test-only batches. F1's commit body documents the inverted-first demo but predates the convention so no code breadcrumb was retrofitted (reviewer M-1 — informational, not blocking). Going forward, every new mirror commit applies the convention.

## What happened / Actions

1. **Cold-start carry-over from S8 + Codex audit response.** Read the Codex post-Phase-1 audit response in full at session open; verdict was NO-GO for iOS push / TestFlight until 2 Important findings tightened. Owner decision: fix ALL 4 findings, plan + execute via /using-superpowers discipline, prep a new Codex packet so the next pass starts fresh.
2. **Skill discipline (7/7) carried over** from S8 cold-start. All 7 remediation-arc skills already in scope; per using-superpowers "Don't invoke a skill already running" — no re-load.
3. **Wrote S8.5 implementation plan** at `docs/superpowers/plans/2026-05-15-s8-5-codex-findings-remediation.md`. Self-review pass: spec coverage of all 4 Codex findings; no placeholders; iOS API surfaces verified; identified that the canonical plan miscounted overhang emission sites (4 vs actual 3 — `engine.js:1122` is in `getFilamentProfile`, state-less material reference, NOT `resolveProfile`).
4. **Pre-flight clean.** Web HEAD `9603d37`; iOS HEAD `fc3ee6b`. Both clean modulo expected untracked.
5. **F1 web — env-scale `cooling_fan_overhang` across 3 surfaces.** TDD-RED: walkthrough P1.5 HIGH-01-export block extended with 3 new assertions (text export `Overhang fan speed: 90`, BS export `overhang_fan_speed[0]=90`, Advanced surface `advCold.cooling_fan_overhang=90`). Ran harness — threw `text export Overhang fan speed=100 should match env-scaled 90`, proving machinery + bug. Engine fix: hoisted `overhangScaled = round(bs.cooling_fan_overhang × fanMult)` at line 1252 alongside fanMaxScaled / fanMinScaled; routed `getAdvancedFilamentSettings.cooling_fan_overhang` through it; flipped `_prov.cooling_fan_overhang.source` to `'rule'` when scaling applies; switched BS export to read `adv.cooling_fan_overhang` (auto-scaled). Text export already read from `adv.*` (no edit needed). Harness GREEN. Web `b3111cf` pushed.
6. **F2 iOS — re-cp engine.js + extend AdvancedFilamentSettings Codable.** Engine re-sync byte-identical (174618→201957 bytes). Swift struct at `EngineService.swift:70-86` extended with `fanMinSpeed`/`fanMaxSpeed`/`coolingFanOverhang` (Optional<String>). Decoder at lines 669-708 reads S-wrapped `.value` for fan_min/max + permissive String/NSNumber cast for cooling_fan_overhang. T2a extended with direct Advanced-surface assertions (drops the obsolete scope-note); T12 extended with overhang assertions on text + BS export. New `parseFan()` helper. iOS XCTest 108/108. iOS `fef685e` — no push.
7. **F3 iOS — T5 MCS coverage extension.** Read web walkthrough MCS block (`scripts/walkthrough-harness.js:803-915`); grepped exact warning IDs. Appended 6 sub-cases to T5: ams_lite material gate, ams_lite compat negative, CFS positive, CFS-Lite (sparkx_i7), generic_non_ams (mk4), multi_5 empty-MCS suppression. Hit one build error on first run — `warnsCfs` redeclared (reused variable name; refactored to use existing `idsCfs` from the earlier `cfs` state block) + 2 keypath-inference issues on `.map(\.id).contains(...)` chained calls (normalized to intermediate `let ids = ...` pattern matching the existing T5 style). T5 + full suite GREEN at 108/108. iOS `6970c86` — no push.
8. **F4 web — TDD-RED breadcrumb convention in `docs/ai-collab.md`.** Appended subsection after "3dpa Standing Rules" with two acceptable patterns + the anti-pattern note. Web `be5c4e8` pushed.
9. **F5 internal code-review subagent dispatched** on cumulative S8.5 surface (web `9603d37..be5c4e8` + iOS `fc3ee6b..6970c86`). Reviewer returned 0 Critical / 1 Important / 7 Minor / Strengths / NO-GO verdict. **Important I-1:** `engine.js:2641-2650` `resolveProfile.p.fan_speed` unscaled by env.fan_multiplier — same class as F1, missed by S8.5 + by prior Codex audit. Reviewer's verdict was: shipping the Codex packet as-is would invite Codex to re-flag this under the same Important #1 banner, which would feel like the remediation didn't take. **Minors:** M-1 RED breadcrumb retroactive (informational); M-2 math duplication now actively painful (carry-forward priority bump); M-3 floating-point `fanMult !== 1.0` strict equality fragility (cheap hardening); M-4 iOS Codable fields are test-only no UI (informational); M-5 walkthrough hardcoded baseline durable but fragile (defer); M-6 F3 sub-case (b) narrow but durable (no action); M-7 plan-vs-execution drift in the F1 emission-site inventory (the I-1 site was never inventoried — root cause of the miss). Triage: fix I-1 + M-3 in tightening commit; the rest defer to S9 carry-forward or v1.0.5.
10. **Tightening web — `engine.js:2641-2667` + M-3 hardening.** Verified I-1: read engine.js:2641-2650 confirmed `fanMap[material.fan_policy]` emits raw `'100%' / '50%' / '25%' / '0%'`. Verified env scope: `const env = getEnv(state.environment)` at line 2132 — in scope for the B1 fan policy block. Fix: converted `fanMap` from string-with-% to integer; computed local `fanMultProfile + fanMultIsIdentity` (mirrors the new M-3 pattern from getAdvancedFilamentSettings); `p.fan_speed` emits `${scaledPct}%` with why-string appending "Reduced to N% of recommendation for cold environment." when scaling applies; prov.source flips `'default' → 'rule'`; prov.ref becomes `'env.fan_multiplier × materials.json#fan_policy'`. M-3: hoisted `fanMultIsIdentity` in getAdvancedFilamentSettings + replaced all 5 sites of strict `fanMult !== 1.0` with `!fanMultIsIdentity`. Walkthrough P1.5 HIGH-01-export block extended with 4th assertion: PLA+cold `profCold.fan_speed.value === '90%'` + `profCold.fan_speed.prov.source === 'rule'`. Harness GREEN — last OK line now also mentions `profile fan_speed=90%`. Validate-data 6/6 + matrix-audit 47196/0 + 55/55 curated. Web `6e06404` pushed.
11. **Tightening iOS — re-cp engine.js post-tightening.** Engine re-sync byte-identical (201957→203404 bytes). Full XCTest suite re-run: 108/108 green — existing T2a / T12 / T5 + 4 helpers decode the new `fan_speed` shape without any Swift-side changes (the value is still a string with `%`, just env-scaled). iOS `fd4761a` — no push.
12. **F6 Codex re-audit packet prep.** Created `codex/post-s8-5-audit/` with the audit packet (`codex-2026-05-15-post-s8-5-audit-packet.md`) and a 612-line web+iOS combined diff snapshot (`v1.0.4-since-post-phase-1-codex.diff`). Packet covers all 5 fixes (F1-F4 + tightening), live verification evidence, per-finding remediation anchors, specific challenges grouped by category (env-scaling exhaustiveness, F1 correctness, tightening correctness, F2 + iOS Codable, F3 MCS, F4 convention, cross-cutting), output format, carry-forward notes for prior-audit deferred items.
13. **Trigger A close (this).**

## Files touched

**Web repo (`3dprintassistant`):**

- Modified `engine.js` across `b3111cf` (F1 overhang) + `6e06404` (tightening fan_speed + M-3). Net: +71/-8 lines.
- Modified `scripts/walkthrough-harness.js` across same commits. Net: +47/-2.
- Created `docs/ai-collab.md` TDD-RED subsection in `be5c4e8`. +38 lines.
- (this close) Created `docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s8-5-codex-findings.md`.
- (this close) Modified `docs/sessions/INDEX.md` — S8.5 entry prepended.
- (this close) Modified `docs/planning/ROADMAP.md` — header date + active-queue pointer.
- (this close) Modified `docs/sessions/NEXT-SESSION.md` — regenerated for S9 (post-Codex-clean-pass).
- (this close) Created `docs/superpowers/plans/2026-05-15-s8-5-codex-findings-remediation.md` (already committed in F1 timeline — but file lands here in close commit too if untracked).
- (this close) Created `codex/post-s8-5-audit/codex-2026-05-15-post-s8-5-audit-packet.md` + `v1.0.4-since-post-phase-1-codex.diff`.

**iOS repo (`3dprintassistant-ios`):**

- Modified `3DPrintAssistant/Engine/engine.js` across `fef685e` + `fd4761a` (byte-identical re-cp from web).
- Modified `3DPrintAssistant/Engine/EngineService.swift` in `fef685e` (Codable extension + decoder).
- Modified `3DPrintAssistantTests/EngineServiceTests.swift` across `fef685e` + `6970c86`.

## Commits

**Web `3dprintassistant` `main`** (in order on top of `9603d37`):

- `b3111cf` — `fix: env-scale cooling_fan_overhang across all surfaces (S8.5 Codex Important #1)` — 2 files, +44/-6. Pushed.
- `be5c4e8` — `docs: TDD-RED breadcrumb convention in ai-collab.md (S8.5 Codex Low)` — 1 file, +38/0. Pushed.
- `6e06404` — `fix: tighten S8.5 — env-scale resolveProfile p.fan_speed (reviewer I-1) + float-tolerant fanMult identity check (reviewer M-3)` — 2 files, +58/-17. Pushed.

Plus this close commit (session log + INDEX + ROADMAP + NEXT-SESSION + S8.5 plan + Codex packet).

**iOS `3dprintassistant-ios` `main`** (in order on top of `fc3ee6b`, local-only, NOT pushed):

- `fef685e` — `chore: sync engine post-F1 + extend AdvancedFilamentSettings Codable for fan (S8.5 Codex Important #1 + #2)` — 3 files, +101/-15.
- `6970c86` — `test: extend testV104_T5_PracticalMCSTiers MCS coverage breadth (S8.5 Codex Medium)` — 1 file, +72/0.
- `fd4761a` — `chore: sync engine post-S8.5-tightening (web 6e06404 — p.fan_speed env-scaling)` — 1 file, +38/-16.

**iOS local-only** at HEAD `fd4761a`, 4 commits ahead of `origin/main` (`eeb2915`). Phase 2 gate active until S9's 5-point ship-ready check passes.

## Open questions / Follow-up

Md-hygiene sweep findings (one-liner per check):

- **Root-level stubs:** only `CLAUDE.md` at repo root; real doc. Clean.
- **Untracked files:** S8.5 plan + new Codex packet directory + `codex/post-phase-1-audit/` (from prior wrap) untracked; all land in this close commit.
- **Secrets in tree:** `grep -lE 'ghp_|sk-[A-Za-z0-9]{20,}|xoxb-|BEGIN [A-Z]+ KEY'` across touched files → no matches.
- **Protocol drift:** `diff -q Projects/CLAUDE.md Projects/AGENTS.md` → byte-identical.
- **Stale ROADMAP:** addressed inline — header date + active-queue pointer.
- **Duplicate specs:** none introduced.
- **Content-routing:** durable patterns live in this log's Durable context.

S9 carry-forwards (NEW + carried):

- **NEW: Codex re-audit dispatch.** Owner runs `codex/post-s8-5-audit/codex-2026-05-15-post-s8-5-audit-packet.md` BEFORE any S9 work. If Codex returns clean (no Critical / Important), proceed to S9 mechanics. If anything Important+, tightening cycle first.
- **NEW: AdvancedFilamentSettings UI surfacing** (reviewer M-4). iOS Codable fields are populated but not rendered. Separate v1.0.5+ work item if Advanced filament panel needs fan-row parity with web.
- **NEW: helper extraction priority bumped** (reviewer M-2). `_computeEnvScaledFan` + `_computeInitBedTarget` should land early in v1.0.5 before next fan or bed-temp touch — math duplication now 4 sites.
- **Carried: S9 Phase 2.2 mechanics** — ScreenCaptureUITests → MARKETING_VERSION 1.0.3 → 1.0.4 in project.yml → xcodegen generate → second iOS local commit → 5-point ship-ready handoff → owner manual TestFlight dispatch.
- **Carried: prior carry-forwards from S7-3 + S7-4** — math duplication 3× (now 4×), isPETG magic, profile-matrix-audit env-axis blind spot, RETIRED_IDS const, mobile-card text-length, smoke assertion for emit-vs-claim parity. All deferred to v1.0.5.
- **Carried: prior Codex deferred** — MEDIUM-02 + OBSERVATION-01 from `codex/v1.0.4-audit/` remain v1.0.5.

## Memory sweep

**Candidates considered:**

- **"Internal-reviewer pattern is 5-for-5 across v1.0.4 arc"** — calibration evidence cumulating; already implicit in `feedback_skill_discipline_remediation_arcs.md`'s `requesting-code-review` mandate. The 5-for-5 streak is notable but the durable lesson ("dispatch reviewer between impl and tightening before push") is already a binding skill. No new memory.
- **"Env-scaling exhaustiveness requires enumerating ALL emission surfaces, not just the obvious ones — Codex caught 3, S8.5 added a 4th"** — concrete narrative but narrow to engine.js fan-scaling; carry in this log's Durable context.
- **"Float-tolerant identity checks for scaling multipliers"** — generally applicable beyond 3dpa (any project comparing scaling-vs-identity). Could be a new memory entry. **Proposing as candidate.**

**Proposing 1 new memory:** "Float-tolerant identity checks for scaling multipliers in engine code — strict `multiplier !== 1.0` is fragile; use `Math.abs(m - 1.0) < 1e-9` or pre-round to 2dp."

## Vault sweep

**Surfaces considered (per `Projects/CLAUDE.md` Trigger A vault-sweep checklist):**

- **Strategic decision / rationale** → `Obsidian Vault/10-Projects/3dpa.md`: no strategic shift; S8.5 is Codex-audit remediation.
- **New shorthand / term** → `memory/glossary.md`: no new shorthand.
- **Cross-project pattern / routing change** → `Obsidian Vault/20-Areas/Development/toolchain.md`: the float-tolerant identity pattern could land here as a JS-side standing technique, but it's narrow to engine.js code paths. Skip; live in memory if saved.
- **Hobby observation that feeds product intuition** → N/A.
- **Consulting / external source:** N/A.

**Result: nothing durable to propagate to vault.**

## Next session

**S9 — Phase 2.2 / Task 9 (UI walkthrough + ship)** cold-starts AFTER owner dispatches the new Codex packet and confirms a clean pass (no Critical / Important). Concrete entry point: read `codex/post-s8-5-audit/codex-2026-05-15-post-s8-5-audit-response.md` first (owner-placed); if clean, run `ScreenCaptureUITests/testCaptureAllScreens` on iPhone 17 Pro simulator + spot-check `/tmp/ui-review/pro/*.png`; bump `project.yml` `MARKETING_VERSION: 1.0.3 → 1.0.4`; run `xcodegen generate`; commit as second iOS local commit; internal-reviewer dispatch; tightening if needed; run 5-point ship-ready check; surface "ready for owner TestFlight dispatch" with the 5-point checklist. **If Codex returns ANY Important+:** S8.6 tightening cycle first; do not jump to S9 mechanics.

## Self-check (Trigger A Phase 5)

- **Phase 1 step 1** (`git status`): clean on web post-this-commit; iOS clean post-tightening (`fd4761a` HEAD).
- **Phase 1 step 2** (project scope): 3dpa-web + 3dpa-ios both touched. Single product token "3dpa" per disambiguation table.
- **Phase 1 step 3** (disambiguation): not needed — opening message named S8.5 scope explicitly.
- **Phase 2 step 4** (md-hygiene): 7 checks ran; all clean. Findings under Open questions.
- **Phase 2 step 5** (session log): written at `docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s8-5-codex-findings.md`. Destination label **(5-documented)**.
- **Phase 2 step 6** (INDEX): S8.5 entry prepended.
- **Phase 2 step 7** (ROADMAP): header date 2026-05-15; active-queue v1.0.4 pointer updated to "S8.5 closed; S9 pending Codex re-audit dispatch + clean pass".
- **Phase 3 step 8** (memory): 3 candidates considered; 1 proposed (`feedback_float_tolerant_identity_checks.md`).
- **Phase 3 step 9** (vault): 5 surfaces considered; 0 to propose.
- **Phase 4 step 10** (NEXT-SESSION regen): regenerated for S9 with Codex re-audit gate as the explicit prerequisite.
- **Phase 4 step 11** (copy-paste prompt): surfaced in NEXT-SESSION between `>>> START >>>` / `<<< END <<<` markers.
- **Phase 5 step 12** (self-check): this section.
