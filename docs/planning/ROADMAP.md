# 3D Print Assistant — Roadmap

**Purpose:** Live planning surface for 3dpa web + iOS. Active release tracking, current work queue, deferred and parked work, and pointers into archive + spec + session history.

**Last updated:** 2026-05-19 — **Owner-reported bug fix: bed-first-layer env-name prefix dedupe (v1.0.5 carry — shipped to web).** Two warning banners on cold-garage scenario both led with `Cold garage (5–15°C)` (the dedicated MEDIUM-01 bed-first-layer banner + the consolidated nozzle/first-layer-speed banner). Matrix-style brainstorm → Option 1 (minimal — strip env.name from bed warning; preserves MEDIUM-01's 3-branch clamp-attribution copy intact). TDD clean: RED `v1.0.5 env-prefix-dedupe` walkthrough block (3 cases × 2 assertions incl. pair contract) → GREEN engine.js:1684/:1688/:1692. All gates green (validate-data 6/6, walkthrough clean, matrix-audit 55/55 curated + 0 broad). iOS engine.js byte-identical sync + mirror `testV105_EnvPrefixDedupeOnBedFirstLayerWarning` (XCTest 110/110 unit, was 109 + 1 new). Visual verification via preview server + DOM read confirmed dedup. Web `46334e6` pushed (`9bdc4fc..46334e6` — flushed 2 prior PoC wrap commits + this fix; Cloudflare auto-deploys); iOS `e2985f1` local-only per push gate (first v1.0.5 item shipped; rest of carry bundle still pending). PoC paths (v5 mechanical pass / Gate 1 desk research / bridge cwd-scope preamble) remain valid for next session. **Earlier 2026-05-17 (evening, session 2): Resin-scaling PoC bridge rounds 2 + 3 + v4 problem-statement shipped.** v4 now in place at `docs/resin-scaling/problem-statement.md`; replaces v3; integrates R2's 2 MUST-FIX + 6 SHOULD-FIX (most notably §7 restructured as Option A decision tree with Gate 2 evaluated first; §5 gained "Fires if" column; printer-count drift footnote rewritten with correct sources). R3 on v4 returned 1 MUST-FIX (`index.html:8` over-correction regression) + 8 SHOULD-FIX (3 Codex-surfaced Claude-turn-1 misses) + 3 OPTIONAL — **v5 mechanical pass queued but not blocking; no R4 needed**. 2 new K1 findings filed in `ai-operating-model/docs/findings/` (K1-2 + K1-3); K3 sub-component of K1-3 = bridge invocation cwd controls Claude-turn-1 read sandbox scope (operational not structural). G2 (bridge multi-round amplifier) materially answered: 3-round value trend HIGH → MEDIUM-HIGH → MEDIUM. G3 autonomy ceiling docs: K1 chain + K4-1 + K3. **No engine / data / UI touched. iOS untouched (`c99a797`). v1.0.4 → ASC submission still parked behind PoC.** Next session: owner-pick v5 mechanical pass + Gate 1 (`technical-differences.md`) desk research + `bridge/CLAUDE.md` cwd-scope standing rule preamble. **Earlier 2026-05-17 (morning):** PoC formally started as docs-only discovery — see kickoff session log + v3 (now superseded by v4) for full context. **Earlier 2026-05-15:** printer-addition protocol v3 → v4 + Photon Mono M7 Pro request declined (resin / MSLA, out of scope); single web doc commit `6314fda` pushed; iOS untouched; new v1.0.5 carry added (FDM-only scope copy on a user-facing surface). Earlier same day: **v1.0.4 SHIPPED to TestFlight ([run 25892826819](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25892826819)).** v1.0.3 still live on the App Store until v1.0.4 review acceptance; remote overlay `content_version=2026051202` ships i7 under Creality / i Series. **S9 closed the v1.0.4 arc as "(known) bug-free" per owner directive:** triaged the Codex post-S8.7 carry list + reviewer carry list into 3 v1.0.4 items remediated and the rest as explicit v1.0.5 carries. S9 commits: web `3335a30` (M1 engine fan_multiplier upper-bound clamp at engine.js:1246+:2655, schema/engine asymmetry closure) + `2f0ccb8` (OBS-01 plate-API debt note in docs/3dpa-context.md per Codex accept-criterion + missing getCompatibleNozzlesForPrinter helper row added to API table); iOS `2207f8f` (engine.js byte-identical sync), `c82dac2` (Obs1 slow_layer_time row in iOS Advanced cooling — closes parity gap with web app.js:1253; AdvancedFilamentSettings.slowLayerTime + decoder + FilamentSettingsView ParamRow + Strings.slowLayer verbatim parity with web locales/en.json:134 + new XCTest pinning regex `\d+\s*s$` contract), `c99a797` (MARKETING_VERSION 1.0.3 → 1.0.4 + xcodegen). Internal reviewer GO: 0 Critical / 0 Important / 0 Medium + 2 Minor v1.0.5 carries (PLA-only test coverage tightening + NSNumber decoder dead-code path). **Reviewer-pattern now 7-for-7 across v1.0.4 arc** (S7-N + S8 + S8.5 + S8.7 + S9 all surfaced real findings). All gates green at ship: validate-data 6/6, walkthrough 11 v1.0.4 OK lines, matrix-audit 47196/0 broad + 55/55 curated, iOS XCTest 109/109 unit (108 prior + 1 new S9 `testV104_S9_iOS_Obs1_AdvancedCoolingExposesSlowLayerTime`). **Web pushed `d9e58fa..2f0ccb8` (auto-deploys to Cloudflare). iOS pushed `eeb2915..c99a797` (10 commits flushed; 0 ahead).** Earlier same-day: Phase 1.5 + Phase 2.1 + S8.5 + S8.7 all CLOSED; Codex post-S8.5 audit returned **GO for S9** with 0 Critical / 0 Important; S8.7 shipped the optional 2 Medium + 2 Low findings before the S9 ship gate per owner directive. S8.7 commits: web `746244e` (Low #1 — TDD-RED breadcrumb convention split into posture-specific rules in docs/ai-collab.md) + `48304d3` (Medium #2 — validate-data env `fan_multiplier` range `> 0 && <= 1`, Path A locked over Path B engine-change); iOS `41c9956` (Medium #1 — FilamentSettingsView cooling tab Advanced mode now reads env-scaled `advancedSettings.fanMinSpeed` + `coolingFanOverhang` instead of raw filProfile, mirrors web app.js:1244-1253; new XCTest `testV104_S8_7_CoolingUI_AdvancedSourceIsEnvScaled` pins source-of-truth contract; inverted-first RED demo verified) + `ad46fd3` (Low #2 — T5 x1c AMS-like sub-case mirrors web walkthrough negative assertions for `ams_lite_material_incompat` + `mcs_empty_no_multicolor`; inverted-first RED demo verified). Internal code-review subagent VERDICT: GO. 1 Medium (M1 — engine.js has no upper-clamp on `fan_multiplier > 1`; schema is stricter than engine on upper bound) + 4 Minor — none Codex-originated, all carry to v1.0.5 cleanup pass. Reviewer-pattern stays 6-for-6. iOS XCTest 108 unit (was 107 + 1 new S8.7 test). Web pushed; iOS local-only **7 commits ahead** of `eeb2915` (Phase 2 gate active). **S9 cold-starts on Phase 2.2 / Task 9 ship gate directly — no audit gate remaining.** Codex audit response at `codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-response.md`; triage 0 CRITICAL / 2 HIGH / 2 MEDIUM / 1 LOW / 1 OBSERVATION. Owner-approved scope: HIGH-01 + HIGH-02 + MEDIUM-01 + LOW-01 in v1.0.4; MEDIUM-02 + OBSERVATION-01 deferred to v1.0.5. **S7-4 shipped Codex LOW-01 (test-contract hardening for retired warning IDs) in two test-only commits:** `d863635` (impl) + `bc9c655` (tightening after internal code-review subagent caught a real Creality empty-MCS pairing bug). Added negative regression guards for `nozzle_too_small`, `creality_no_multicolor`, `k2_plus_cfs` on their successor positive cases — across both `scripts/walkthrough-harness.js` (4 new assertions + 1 new Creality empty-MCS sub-case on ender3_v3_se for manufacturer-gated regression coverage) and `scripts/profile-matrix-audit.js` (2 new `noWarning('k2_plus_cfs')` additions). TDD-RED demo on `nozzle_too_small` (deliberately inverted assertion → verified machinery → flipped). 10 cumulative v1.0.4 OK lines (same count, guards fold into existing HIGH-12 + MCS blocks); matrix-audit 47196/0 + 0 curated; validate-data clean. iOS untouched (`eeb2915`, Phase 2 gated). Owner pivoted finding order — S7-3 MEDIUM-01 is the only remaining Phase 1.5 web finding. **Next step:** S7-3 cold-starts on MEDIUM-01 — first-layer bed-clamp attribution honesty (engine.js:1227 `env.bed_first_layer_adj` + :1624-1631 warning copy + :1706-1727 bed-clamp warning attribution discipline). After S7-3 ships, Phase 1.5 closes and S8 Phase 2.1 iOS sync opens.

**Evergreen project context:** [`../3dpa-context.md`](../3dpa-context.md) (architecture, engine API, app state shape, slicer routing, standing rules).
**Session history:** [`../sessions/INDEX.md`](../sessions/INDEX.md) — reverse-chronological one-line entries; full logs in `../sessions/`.
**Archive:** [`archive/`](archive/) — completed IR cycle, release-readiness history, completed milestones, legacy backlog.

---

## Current Snapshot

| Area | Status |
|---|---|
| **Web app** | Live worldwide at [3dprintassistant.com](https://3dprintassistant.com). Cloudflare Workers/Assets deploys from `main`. Feedback → Discord `#web-app-feedback` via `/api/feedback`. Owner analytics dashboard live at `/analytics` (admin token required) with side-by-side/filterable Web vs iOS views. |
| **iOS app** | Live worldwide on App Store, dark mode only. v1.0.3 is live since 2026-05-11 after submitted build `202605101637`; public App Store lookup showed version `1.0.3` released `2026-05-11T17:00:02Z`. Remote printer overlay `content_version=2026051202` is live and adds i7 under Creality / i Series for current 1.0.3 clients without a new binary. Earlier builds `202605090842`, `202605101130`, and `202605101544` are stale. EU unblocked 2026-04-27. |
| **Engine** | Web is master — edit there, `cp` byte-identical to iOS. Walkthrough harness + iOS XCTest re-run after every engine/data edit. Latest profile-temperature audit added nozzle-cap clamps across simple output, advanced output, warnings, and export paths. |
| **Export** | Engine + bridge done. Web UI **disabled** (Bambu Studio rejected `.json`). iOS UI **hidden** (deferred post-release). Re-enabling tracked under Phase 2.7a in Deferred / Parked Work. |

---

## Active Release: v1.0.3

5-item v1.0.3 batch across web + iOS; **3/5 shipped into the live App Store build** (items 1 + 3 + 4 — see status table below). Owner pivoted from DQ-3 to this batch on 2026-05-08. Cross-AI collaboration remains available via [`../ai-collab.md`](../ai-collab.md), but research/review packets are optional and risk-based, not a mandatory pilot workflow. Released build `202605101637` also includes the remote printer catalog hardening pass, profile-temperature/nozzle-cap audit fixes, and the Advanced filament temperature UI fix. Items 2 + 5 are post-v1.0.3 work unless owner explicitly reopens scope.

| # | Item | Platform | Status |
|---|---|---|---|
| 1 | Missing printers (Anycubic Kobra X correction + Elegoo Centauri Carbon) | Web + iOS | ✅ **SHIPPED 2026-05-08** — 4 commits per one-finding-one-commit-per-platform. Web auto-deployed; iOS picked up in TestFlight run [`25572470387`](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25572470387). Web `0f47b44` (Kobra X) + `8de9381` (Centauri Carbon); iOS `b0d1315` + `15930c1`. |
| 2 | Expanded environments taxonomy | Web + iOS | ⏳ Gemini handover #2 drafted at [`../research/gemini-environments-taxonomy-research.md`](../research/gemini-environments-taxonomy-research.md); not yet sent. Multi-day workstream. |
| 3 | iOS App Store review prompt | iOS | ✅ **SHIPPED 2026-05-08** — 6 Codex passes (1 design + 4 milestone + 1 post-implementation) + 1 Gemini pass. 5 caught-before-ship bugs. `ReviewPromptService` + `StoreKitDistributionDetector` + `ProfileKeyHasher` + 18 new XCTests (46 → 64). MARKETING_VERSION 1.0.3 + TestFlight dispatched (run [25557115706](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25557115706)). Design packet at [`../../codex/ios-review-prompt/codex-2026-05-08-ios-review-prompt-packet.md`](../../codex/ios-review-prompt/codex-2026-05-08-ios-review-prompt-packet.md); post-impl review at [`../../codex/ios-review-prompt/codex-2026-05-08-ios-review-prompt-implementation-review.md`](../../codex/ios-review-prompt/codex-2026-05-08-ios-review-prompt-implementation-review.md). |
| 4 | Analytics platform + event taxonomy | Web + iOS | ✅ **SHIPPED 2026-05-08/09** — privacy-preserving first-party analytics with exactly 3 events (`app_opened`, `profile_generated`, `feedback_opened`), no user/session/device IDs, no free text, no generated profile output. Web Worker + Analytics Engine binding shipped; iOS client + tests shipped as `303f571`; iOS output-mode parity shipped as `153adbc` and uploaded in TestFlight run [`25596797349`](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25596797349), build `202605090842`. Owner dashboard `/analytics` added 2026-05-09 and refined in commits `eb66b18` / `e9ed6b9` / `5c60549`: owner readout, Product lens (`All` / `Web` / `iOS`), iOS version-aware diagnostics, and mobile-friendly diagnostic rows. Spec: [`../specs/analytics-v1.md`](../specs/analytics-v1.md). |
| 5 | Web output-panel UX deep-dive | Web | ⏳ Not started. Claude direct (no Gemini per per-tool routing). |

### Phase status

| Phase | Status |
|---|---|
| Phase A — Printer changes | ✅ Shipped (item 1). Hold lifted 2026-05-08. |
| Phase B — Research handovers | 🟨 Partial (handover #2 drafted; #3 sent + responded; #4 intentionally implemented directly after privacy plan; item 5 doesn't need Gemini). |
| Phase C — Codex design packets | 🟨 Partial (item 3 design + post-impl complete; item 4 implemented with focused local tests; items 2 / 5 not started). |
| Phase D — Implementation | 🟨 Partial (items 1 + 3 + 4 implemented; items 2 / 5 not started). |
| Phase E — Ship cycle | 🟩 Released on the App Store 2026-05-11 after replacement build `202605101637` passed review. `High-speed` remains the Bambu picker label because it fits on iPhone SE and avoids brittle marketed speed numbers in picker chrome. Items 2 / 5 not yet built and parked post-v1.0.3. |

---

## Active Work Queue

> Live, actionable items. Pick the next one based on owner priority.

- **Resin-scaling discovery (PoC, docs-only)** — started 2026-05-17 as a multi-goal Proof of Concept: (1) substantive resin sub-project discovery producing decision-grade material, (2) testing bridge as a multi-round quality amplifier, (3) honest autonomy ceiling probe. Resin product artifacts live at `docs/resin-scaling/` (**v4 problem-statement.md current** + parked survey v1); PoC meta-track lives at `../../../ai-operating-model/docs/autonomy-poc-2026-05-resin/` (charter, scorecard, 3 bridge-rounds + 3 round-analyses, owner-asks). **Audience is the owner, not 3dpa users.** v4 §7 is an Option A decision tree with Gate 2 evaluated first (Step 1 owner pick → Step 2 5 branches → Step 3 park rules with 4-week charter clock → Step 4 success criterion); §5 has a "Fires if" column making conditional-cost framing visible. **3 bridge rounds complete:** R1 changed v2's foundation, R2 caught structural+mechanical in v3, R3 caught only mechanical in v4 (1 MUST-FIX + 8 SHOULD-FIX). **v5 mechanical pass queued** but no R4 needed (mechanical fixes don't introduce new claims). 3 K1 findings filed across the arc documenting the operational autonomy ceiling; 1 K3 finding (bridge cwd-scope contract). Off-limits during discovery: live engine / data / UI changes to FDM product. **Next: owner-pick v5 mechanical pass + Gate 1 (`technical-differences.md`) desk research + `bridge/CLAUDE.md` cwd-scope standing rule preamble.** `[Web docs only]`
- **v1.0.3 batch items 2 / 5** — see Active Release section above.
- **v1.0.3 live monitoring** — version `1.0.3` is live since 2026-05-11. Monitor `/analytics`, feedback, Sentry, App Store reviews, and any owner/user reports from the remote printer overlay path.
- **v1.0.4 — SHIPPED to TestFlight 2026-05-15.** All planned phases closed: Phase 1 + Phase 1.5 + Phase 2.1 + S8.5 + S8.7 + S9 (bug-free ship arc). Monitor [TestFlight run 25892826819](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25892826819) for build acceptance + on-device feedback. v1.0.5 hygiene pass cold-starts on the carry-forward bundle (helper extraction across 4 math-duplication sites, m2 test rename, Min-1 PLA+PETG+ABS slow_layer_time test coverage, Min-2 NSNumber decoder cleanup, magic constants, mobile-card warning text length check, smoke assertion for emit-vs-claim parity, shared RETIRED_IDS const, walkthrough hardcoded baseline, MEDIUM-02 packet-text accuracy decision, **FDM-only scope copy on a user-facing surface — owner-pick web About/footer/iOS Settings; phrase as "FDM (filament extrusion) only today; MSLA / resin out of scope (future implementation)" to preserve optionality vs. the runbook's harder operational "no plans" stance**).
- **v1.0.4 config-impact implementation — (CLOSED)** Phase 1 + Phase 1.5 + Phase 2.1 + S8.5 + S8.7 + S9 all done. S8.7 commits: web `746244e` (Low #1) + `48304d3` (Medium #2); iOS `41c9956` (Medium #1) + `ad46fd3` (Low #2). All 4 Codex post-S8.5 findings fixed: TDD-RED breadcrumb convention tightened in docs/ai-collab.md; validate-data range check `> 0 && <= 1` on env `fan_multiplier` (Path A locked — engine alignment); FilamentSettingsView cooling tab Advanced mode rewired to env-scaled `advancedSettings.fanMinSpeed` + `coolingFanOverhang` (mirrors web app.js:1244-1253); T5 x1c AMS-like sub-case mirrors web walkthrough negative assertions. Internal reviewer GO; 1 Medium (M1 engine upper-clamp asymmetry) + 4 Minor all carry to v1.0.5 — reviewer-pattern 6-for-6. Setup complete (S1, 2026-05-13): [`merged.md`](../reviews/2026-05-11-config-impact-qa/merged.md) is the owner-accepted queue (locked SHA `5bcd68b`); [`2026-05-13-v1.0.4-config-impact.md`](../superpowers/plans/2026-05-13-v1.0.4-config-impact.md) is the per-task implementation plan. Phase 1 commits: S2 Tasks 1/2/3 (web `133be38` → `b238a82`); S3 Task 4 (`bc070af` + `bf05586`); S4 Task 5 (`dc49c52` + `1695cba`); S5 Tasks 6/7 (`6f9e542` + `901153a`). **Phase 1.5:** S6 prepped audit packet (web `690519e`); owner ran Codex; response captured in S7-1 (`fe2964e`). Codex returned 0 CRITICAL / 2 HIGH / 2 MEDIUM / 1 LOW / 1 OBSERVATION. **Owner-triaged S7 scope (locked):** HIGH-01 + HIGH-02 + MEDIUM-01 + LOW-01 in v1.0.4; defer MEDIUM-02 + OBSERVATION-01 to v1.0.5. **S7-1 shipped Codex HIGH-01** (`eaf3f09`, fan/draft_shield export wiring). **S7-2 shipped Codex HIGH-02 (Option B)** in two commits: `a4b8873` impl + `f2aa84f` tightening after internal code-review subagent. Data: `safe_chamber_temp_max: 50` on all 5 PLA-family `enclosure_behavior` blocks. Engine: pla_heat_creep extended to all enclosed printers; getChecklist preheat-enclosure suppressed for PLA + enclosed; getWarnings env-verbatim filter for PLA + enclosed catches "Keep door closed" / "Preheat the enclosure" / "Extended preheat (...)" patterns. Tightening narrowed all three engine predicates to `material.group === 'PLA'` (preserves PVA's existing humidity posture); added vcold pin + PVA scope-guard harness assertions + validate-data range checks on `safe_chamber_temp_max` + `open_door_threshold_bed_temp`. 10 cumulative v1.0.4 walkthrough OK lines; matrix-audit + validate-data clean. **S7-4 shipped LOW-01** (`d863635` + `bc9c655` tightening) — test-only negative assertions for retired IDs + harness Creality empty-MCS sub-case. **S7-3 shipped MEDIUM-01** (`243be51` + `58d919b` tightening) — first-layer bed-clamp attribution honesty: env first-layer bed warning rewritten to compute effective post-clamp delta with three honest copy branches (full apply / fully clipped / partially clipped); paired `printer_max_bed_temp_clamped` initTarget now includes `bed_first_layer_adj` so cap-warnings fire when env pushes past printer cap (PETG + Kobra 3 Max + cold demonstrated the gap). Attribution discipline parity with MEDIUM-05. 11 cumulative v1.0.4 walkthrough OK lines. **Phase 2.1 closed:** iOS HEAD `fc3ee6b` carries byte-identical engine + data from web HEAD post-S8 (S8 commits `350d23f` initial sync + `fc3ee6b` tightening); iOS XCTest 107 unit + 1 UI. **S8.5 closed** the AdvancedFilamentSettings Codable extension (`fef685e` added `fanMinSpeed`/`fanMaxSpeed`/`coolingFanOverhang` for direct test access) alongside Codex post-Phase-1 audit remediation. **S9 (2026-05-15) closed the v1.0.4 arc as "(known) bug-free."** Owner pivoted from ship-gate-only to ship+all-known-bugs cleanup; triaged the Codex post-S8.7 carry list + reviewer carry list into 3 v1.0.4 items: **M1** web engine `fan_multiplier` upper-bound clamp at engine.js:1246+:2655 (`3335a30`, schema/engine asymmetry closure); **Obs1** iOS Advanced cooling missing slow_layer_time row — parity gap with web app.js:1253 (iOS `2207f8f` engine sync + `c82dac2` AdvancedFilamentSettings.slowLayerTime + decoder + FilamentSettingsView ParamRow + Strings.slowLayer + new XCTest with regex `\d+\s*s$` contract); **OBS-01** plate-API debt doc note at docs/3dpa-context.md (`2f0ccb8`, per Codex accept-criterion + missing `getCompatibleNozzlesForPrinter` row added to API table). MARKETING_VERSION 1.0.3 → 1.0.4 (iOS `c99a797`, xcodegen regenerated). Internal reviewer GO: 0 Critical / 0 Important / 0 Medium + 2 Minor v1.0.5 carries (Min-1 PLA-only test coverage tightening + Min-2 NSNumber decoder dead-code path). Reviewer-pattern **7-for-7** across the v1.0.4 arc. All gates green at ship: validate-data 6/6, walkthrough 11 v1.0.4 OK lines, matrix-audit 47196/0 broad + 55/55 curated, iOS XCTest 109/109 unit. **Web pushed `d9e58fa..2f0ccb8` (Cloudflare auto-deploy). iOS pushed `eeb2915..c99a797` (10 commits flushed; 0 ahead of `origin/main`).** TestFlight dispatched ([run 25892826819](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25892826819)). **Next step:** v1.0.4 live monitoring (TestFlight + App Store review + analytics + Sentry + feedback) OR v1.0.5 hygiene pass cold-start — see active-queue v1.0.4 SHIPPED entry above for the carry-forward bundle.
- **Profile/data change gate** — use [`../runbooks/profile-data-change-test-protocol.md`](../runbooks/profile-data-change-test-protocol.md) before future engine/data/warning/export pushes. Default gate: `validate-data`, profile matrix audit, iOS sync/tests when relevant, and a tiny UI smoke only for visible changes.
- **Remote printer catalog operations** — for any printer addition, republish, or deprecation, follow [`../runbooks/printer-addition-protocol.md`](../runbooks/printer-addition-protocol.md). Source of truth = bundled `data/printers.json`; overlay is an additive same-day patch, not an alternative path. Latest live overlay is `content_version=2026051202` (Creality i7 under existing Creality / i Series). Keep remote payload data-only: brands/printers only, no engine/rules/materials/nozzles/UI. Current iOS applies fetched overlays on the next launch. Protocol authored 2026-05-15 after the post-mortem of the X2D / H2D Pro overlay-only mishap (2026-05-10) and the SPARKX i7 → Creality i7 taxonomy fix (2026-05-12).
- **Analytics dashboard observation** — after real traffic accumulates, read `/analytics` (admin token) using the Product lens: `All` for side-by-side Web/iOS comparison, `Web` or `iOS` for single-surface inspection. Watch generated profiles, app opens, feedback opens, release adoption, profile combinations, mode mix, printers/materials, and mobile diagnostics. Ignore setup rows with appVersion values like `setup-test`, `setup-test-2`, `setup-output-mode` from 2026-05-09 setup.
- **`[CRITICAL-001-followup]`** — Worker `/api/feedback` currently routes iOS + web to single `DISCORD_WEBHOOK_URL` → `#web-app-feedback`. Branch on `payload.context.appSource === "ios"` to a separate `DISCORD_WEBHOOK_URL_IOS` env var so iOS feedback lands in `#ios-app-feedback` as originally intended. Scope: ~15 LoC in `functions/api/feedback.js` + new Cloudflare secret + new iOS-channel webhook + redeploy. No iOS binary change. v1.0.3-safe. Filed 2026-04-23. `[Web/Worker]`
- **`[LOW-011]` Feedback email visibility** — (a) web copy parity helper text under email field matching iOS copy ("Leave it blank to stay anonymous. If provided, we may reply.") + new `fbEmailHelp` key in en/da; (b) Worker reorder of `Reply-to email` to top of Discord embed (currently `functions/api/feedback.js:259`). ~10 LoC web-only. Noticed 2026-04-27 after first iOS feedback received without email. `[Web]`
- **`[LOW-005]`** — `prc_0.2` keep + add siblings, or drop. Owner decision (product-taste).
- **`[MEDIUM-018]` Part B** — `nozzles.json` ID-vs-group convention. Owner decision.

---

## Deferred / Parked Work

> Real items, parked behind another decision or work item. Promote to Active Work Queue when the gating condition resolves.

### v1.0.4 config-impact findings (parked behind `merged.md`)

Surfaced 2026-05-11 cold-start and configuration-impact QA. Both independent passes and both cross-pass reviews are complete. Hold implementation until `docs/reviews/2026-05-11-config-impact-qa/merged.md` is created as the owner-accepted queue.

- [ ] **Wire `environment_options[].bed_first_layer_adj` into `getAdvancedFilamentSettings`.** Currently DEAD — defined in `data/rules/environment.json` but never read by `engine.js`. Cold env's intended +7°C first-layer bed bump silently disappears. ~5 LoC engine fix; iOS engine sync; new walkthrough assertion + iOS XCTest. `[Web+iOS]`
- [ ] **Material-aware environment compensation.** Current `nozzle_adj` / `bed_adj` are scalars applied uniformly across all materials; community guidance is material-group-specific (PLA needs less, PETG/ABS/ASA/PC need more). Engine extension shape: either `environment_options[].nozzle_adj` becomes a `by_group` map (`{PLA: 5, PETG: 10, ABS: 10, PC: 15, default: 5}`), or per-material `env_compensation` block in `materials.json`. Needs sourced research before values are picked — Gemini handover candidate, mirroring [`gemini-environments-taxonomy-research.md`](../research/gemini-environments-taxonomy-research.md). `[Web+iOS]`
- [ ] **Core v1.0.4 must-fix set.** Strength `speed_multiplier`; environment `fan_multiplier` / `force_draft_shield` / warning-copy parity; printer nozzle and plate guards; AMS Lite and practical multicolor tiers; chamber safe-cap guard-only; nozzle min-diameter warning cleanup. `[Web+iOS]`
- [ ] **Rest backlog.** Advisory chip-copy lane (`decorative`, `special`, `advanced`, `miniature`, `filament_condition`), surface ironing data/runtime single source, material-value research lane (`shrinkage_factor`, moisture/storage humidity, plate `bed_temp_range`, cold-env magnitudes), and lower metadata fields. `[Web+iOS/docs]`

### Post-v1.0.3 safe-follow-up todo list

These are Claude/Codex review findings explicitly classified as **not release blockers** for v1.0.3. Do not disturb the live v1.0.3 binary solely for these; schedule them into v1.0.4 or later unless owner priority changes.

| Priority | Item | Scope |
|---|---|---|
| P1 | ~~**CR3-M1:** fix `scripts/profile-matrix-audit.js` `DEFAULT_STATE.level` -> `userLevel` so beginner paths are actually covered.~~ ✅ **Shipped 2026-05-13** (web `8ff25eb`) as part of S1 v1.0.4 setup. | Web/test |
| P1 | **CR3-L1 / CR3-O4:** add the overlay validator to the profile/data runbook when overlay files change, and remove stale hand-maintained test counts from runbook examples. | Docs |
| P1 | **O7:** replace drifting test-count claims in `docs/3dpa-context.md` and `3dprintassistant-ios/CLAUDE.md` with "see CI/current test run" style wording. | Docs |
| P1 | **O8:** schedule or consciously defer aging active-queue items `[CRITICAL-001-followup]` and `[LOW-011]` so the active queue stays live. | Planning |
| P2 | **CR-M2 / M-D:** add local logging or clearer error taxonomy for remote-catalog cache/app-version rejection paths. | iOS |
| P2 | **M-B:** decide equal-`content_version` overwrite policy before any non-empty production overlay is used. | iOS/spec |
| P2 | **M-C / M-E / CR-L3:** tighten launch-refresh concurrency docs/tests if a manual refresh/retry path is added. | iOS/tests/spec |
| P2 | **CR-M6 / L-C:** make the overlay validator less dependent on sibling iOS repo layout before adding it to CI. | Web/scripts |
| P3 | **M-A:** align pathological semver overflow behavior between Node validator and Swift runtime. | Web+iOS |
| P3 | **CR1-M1:** replace string-matched warning suppression with structured warning metadata before broader i18n/copy drift. | Web+iOS |
| P3 | **CR1-M4:** guard advanced bed-temp clamp against missing future `bed_temp_max` values. | Web+iOS |
| P3 | **CR3-M2:** isolate iOS catalog/cache tests from sandbox cache state. | iOS/tests |
| P3 | **L-A / L-B / L-D / L-E:** clean low-risk `PrinterCatalogProvider` performance/source-tag/test-name/cold-start polish if remote catalog grows. | iOS |
| P3 | **CR1-L1:** document or correct Bambu export inheritance placeholders before export UI is re-enabled. | Web+iOS/export |
| P3 | **O-A / CR1-L6-O-D / CR3-O2 / CR3-O3:** spec/audit/UI-order polish: `min_app_version` ops note, `expires_at` reserved note, H2D Pro ordering, and audit desc-builder duplication. | Docs/web |

### Phase DQ — Data Quality & Pro-Relevance (sub-phases 3-5)

**Master spec:** [`../specs/IMPL-041-data-quality-phase.md`](../specs/IMPL-041-data-quality-phase.md). Goal: every number traceable; Safe vs Tuned profiles; pro-tier fields (PA/LA, material-specific retraction, structured cooling) on both platforms.

**Progress:** 2/5 shipped (DQ-1 + DQ-2 — see [`archive/2026-04-release-readiness-history.md § DQ-1 / DQ-2`](archive/2026-04-release-readiness-history.md)). DQ-3/4/5 deferred to post-v1.0.3 ship.

#### DQ-3 — Pressure / Linear Advance per material
- [ ] `scripts/scrape/` — Node.js scraper for 6 sources (Bambu wiki, Prusa KB, Polymaker, Prusament, Overture, eSun). Owner runs locally. `[Code-once]`
- [ ] `docs/research/scraped/` — raw dumps committed for reproducibility. `[You to run]`
- [ ] Gemini cross-reference + propose values with confidence tiers. `[You, external tool]`
- [ ] `materials.json`: `pressure_advance` map per printer × nozzle, provenance-tagged. `[Web]`
- [ ] `engine.js`: emits `pressure_advance` (Bambu/Orca) / `linear_advance_factor` (Prusa). `[Web]`
- [ ] Walkthrough: ≥ 3 combos assert PA/LA presence + sanity range. `[Web]`
- [ ] Coverage floor: top 10 materials × 4 mainstream printer series; `_default` for all 18 materials. `[Web]`
- [ ] iOS sync + XCTest. `[iOS]`
- [ ] Folds in `[MEDIUM-019-followup]` (0.8mm `max_mvs` gaps for 16 mainstream materials + HIPS 0.2mm — same scraper pass produces both). `[Web+iOS]`

#### DQ-4 — Retraction deltas per material
- [ ] `materials.json`: optional `retraction` override (distance_multiplier, speed, provenance). `[Web]`
- [ ] `engine.js`: `_resolveRetraction(printer, nozzle, material)` rule. `[Web]`
- [ ] Safe tier keeps current model; Tuned applies override. `[Web]`
- [ ] Coverage floor: TPU 85A/90A, PETG, ASA, PC, PA, PLA-CF. `[Web]`
- [ ] iOS sync + new XCTest (`retraction(PETG) > retraction(PLA)` on same printer/nozzle). `[iOS]`

#### DQ-5 — Cooling curves
- [ ] `materials.json`: `cooling` block (fan min/max, slow_down_layer_time, overhang fan, close_fan_first_n_layers). `[Web]`
- [ ] `engine.js`: emits into slicer-specific fields via `SLICER_PARAM_LABELS`. `[Web]`
- [ ] `app.js` + iOS `PrintProfileTabView`: new "Cooling" section. `[Web+iOS]`
- [ ] Coverage floor: cooling block for all 18 materials; Safe/Tuned differentiation for PLA, PETG, ASA, TPU minimum. `[Web+iOS]`

### IR-3 — Failure-mode rehearsal

> "What happens when this breaks" work. Owner-deferred. ~1 session.

- [ ] Force `engine.init()` to throw on iOS (corrupt or remove a bundled data file locally). Verify error UI + Sentry event. `[iOS]`
- [ ] Force `/api/feedback` 500. Verify web modal error + iOS error. `[Web+iOS]`
- [ ] Simulate malformed `printers.json` deploy on a preview branch; verify site doesn't brick. `[Web]`
- [ ] Rollback rehearsal: web `git revert` + push → verify auto-deploy serves old; iOS TestFlight expire-build. Document in new runbook. `[Both]`
- [ ] Pull production Sentry + Cloudflare Analytics 14-day baselines. `[You]`
- [ ] Create `docs/runbooks/incident-response.md` with rollback procedures, Sentry + CF links, current baseline. `[Code]`

### IR-1 — Walkthrough harness second-pass coverage

> Add combos to `COMBOS[]` in [`scripts/walkthrough-harness.js`](../../scripts/walkthrough-harness.js) and re-run when needed.

- [ ] Environment presets (cold / hot / damp).
- [ ] Non-`none` support presets.
- [ ] Multi-color / AMS combos.
- [ ] `calcPrintTime` accuracy.
- [ ] `calcPurgeVolumes`.
- [ ] `getTroubleshootingTips` output.

### Phase 2.7a — Bambu Studio export re-enable

> Engine + bridge done; web UI disabled because Bambu Studio rejected the `.json`. Needs the #036 data architecture fix + field-by-field comparison with real BS exports. **Spec:** [`../specs/IMPL-036-profile-params.md`](../specs/IMPL-036-profile-params.md).

- [ ] `objective_profiles.json`: add 5 new fields (seam_position, only_one_wall_top, ironing_type, ironing_pattern, internal_solid_infill_pattern). `[Web]`
- [ ] `engine.js` resolveProfile(): replace hardcoded strings with data reads + display lookup tables. `[Web]`
- [ ] `engine.js` exportBambuStudioJSON(): fix zig-zag bug, add ironing_pattern, expand support_style (5 options). `[Web]`
- [ ] SLICER_TABS + SLICER_PARAM_LABELS: split ironing → ironing_type + ironing_pattern. `[Web]`
- [ ] Import test: verify .json imports correctly in Bambu Studio. `[Web]`
- [ ] Re-enable web export button. `[Web]`
- [ ] Sync updated engine + data to iOS. `[iOS]`

### IR-deferred export-path findings (re-activate when export UI re-enables)

- [ ] **[HIGH-001]** `exportBambuStudioJSON` writes unscaled retraction (reads `bs.retraction_length` instead of scaled value). Now unblocked since LOW-003 shipped.
- [ ] **[MEDIUM-006]** `_extractValue` lowercase-strip fallback.
- [ ] **[MEDIUM-008]** Export-path pattern map duplication — collapse via `mapForSlicer`.
- [ ] **[LOW-007]** Hoist Bambu preset `version: '2.5.0.14'` to module constant. (Same item appears in IR-5; tracked once here.)
- [ ] Live Bambu Studio import test (5 combos).
- [ ] **v1.0.4 env-data export propagation** — `exportBambuStudioJSON` reads `material.base_settings.cooling_fan_min` directly (engine.js:~2855) and lacks a `BAMBU_PROCESS_MAP` entry for `draft_shield` (engine.js:~2445-2487). When export is re-enabled, mirror Task 2's env-data wiring into the export path: scale fan emissions by `env.fan_multiplier`, add `draft_shield → enable_draft_shield` to `BAMBU_PROCESS_MAP` with `'Enabled' → 'enabled'` mapping. Surfaced 2026-05-13 in Task 2 code review (`f7b34f1` follow-up). `[Web]`

### Phase 2.7b — Web rendering of explanatory descriptions

> Engine + data complete (see [`archive/2026-04-release-readiness-history.md § Phase 2.7b`](archive/2026-04-release-readiness-history.md)); web UI rendering not yet wired.

- [ ] Render filter option `desc` as subtitle under chips/options. `[Web]`
- [ ] Add tab description text at top of each output tab. `[Web]`

---

## Backlog

> Unscheduled. Pick from here when current release work is done and the iOS app is stable.

### iOS post-release refactoring (PR-*)

| ID | Item | Notes |
|---|---|---|
| PR-1 | Stronger typing for AppState | Enums for environment, support, colors, user level, slicer IDs. `[iOS]` |
| PR-2 | View models for major screens | `OutputViewModel` already extracted (BR-6b). Remaining: `GoalsViewModel`, picker view models. `[iOS]` |
| PR-3 | `Codable` bridge decoding for remaining EngineService paths | Replace residual manual JSON parsing with `Codable`. (Was originally tied to RB-4; deferred — `ExceptionStore` solved the silent-failure problem without requiring Codable.) `[iOS]` |
| PR-4 | Navigation architecture refinement | Deeper route state, restoration support, coordinator pattern if needed. `[iOS]` |
| PR-5 | Accessibility & visual polish | Dynamic Type review, VoiceOver labels, contrast audit, tap targets. iPad layout optimization. Animation consistency pass. `[iOS]` |
| PR-6 | Design system separation | Split `SharedComponents.swift` into typography, feedback, settings, utility. `[iOS]` |
| PR-7 | UI prototype items | Advanced rows stagger reveal — cascade fade-in on mode switch. Consistent pill animation on native segmented controls. `[iOS]` |

### Future features

| # | Feature | Scope | Notes |
|---|---|---|---|
| **v1.1 candidate** | Light mode / system appearance support (iOS) | Large | Web already has both. iOS dark-only because `ColorTheme.swift` was hardcoded dark during MVP. Spec: add `light` variants for all 10–15 `ColorTheme` tokens; switch hardcoded `Color(hex:)` to environment-aware; remove the 4 `.preferredColorScheme(.dark)` calls; sweep contrast in light; decide system-follow (default) vs explicit toggle. |
| #001 | AMS Purge Volume Calculator | Medium | Previously shipped on web, needs restore. |
| #026 | Smart Simple/Advanced Configurator Mode | Medium | Input-side simple/advanced split. |
| #006 | Parameter Tooltip / Info Panel | Medium | `param-info.json` with increase/decrease effects. |
| #005 | Shareable Profile URL | Small | Encode state as URL params. |
| #010 | More Printer Support | Medium | A1 Combo, MK4, XL, Voron, K1 Max. |
| #011 | More Material Support | Medium | PLA+, Sparkle, PA12-CF, PPA-CF, ABS-GF. |
| #012 | Saved Presets (localStorage) | Medium | Name + save filter state. |
| #019 | Multi-Language Expansion | Medium | DE, NL, SV. |
| #029 | Source Attribution for Recommendations | Medium | Brand/community/calculated badges (effectively shipped via DQ-1 provenance — keep as nice-to-have for explicit display in non-Advanced views). |
| #037 | macOS App (WKWebView wrapper) | Medium | **Decided 2026-04-17: Path 3** — SwiftUI + WKWebView loading bundled offline assets via `loadFileURL`. Required mitigations: `sync-web-assets.sh` build phase; `feature-detect location.protocol === 'file:'` in `feedback-form.js` to submit to absolute `https://3dprintassistant.com/api/feedback` when running from bundle; document data-sync rule. New folder: `3dprintassistant-macos/`. Kickoff prompt: `docs/prompts/macos-app-kickoff.md`. |
| #016 | Troubleshooter Expansion (20+ symptoms) | Large | Expand from 8 to 20+. |
| #018 | Print Time Estimator Improvements | Large | Accel modeling, preset comparison. |
| #020 | Filament Database / Brand Profiles | Large | Brand-specific temp/speed overrides. |
| #015 | Community-Contributed Profiles | Large | GitHub PR-based. |
| #022 | User Profiles & Community Layer | Large | Accounts, sync, sharing. |
| #038 | Windows App | Large | Tauri (preferred over Electron — ~10MB vs ~200MB). Only after macOS port (#037) validates desktop demand. Deferred to post-v1.2. |

### Technical debt

| # | Item | Scope | Notes |
|---|---|---|---|
| #032 | JSDoc Typedefs for Engine | Small | Zero runtime cost, VS Code autocomplete. |
| #033 | Engine Modularization (ES Modules) | Medium | Only if engine keeps growing. |
| #034 | app.js Render/Event Refactor | Large | Deferred — high risk, low near-term reward. |
| #035 | CI Pipeline (web) | Small | ESLint + data validation. When 2nd contributor joins. |

---

## Standing Planning Rules

> Rules that affect planning decisions specifically. Engine / data behavior rules live in [`../3dpa-context.md`](../3dpa-context.md); session-lifecycle / project-organization rules live in `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`.

- **Web is master; iOS mirrors `engine.js` + `data/*.json` byte-identical.** Walkthrough harness + iOS XCTest re-run after every engine/data edit.
- **Data/logic-change evaluation (mandatory).** Every engine/data improvement must include an evaluation of whether web + iOS UI need changes to best use it.
- **One finding = one commit per platform.** Web + iOS commits with matching subject + tag. Don't bundle unrelated findings.
- **iOS push gate.** No iOS push to GitHub `main` until ship-ready for TestFlight (all planned changes landed, XCTest green, walkthrough green, MARKETING_VERSION bumped). Local commits between findings are fine.
- **ROADMAP is live planning truth.** Detailed history archive is `archive/`; spec docs are `../specs/`; per-session decisions are `../sessions/`.

---

## Archive Index

| Archive file | Covers |
|---|---|
| [`archive/README.md`](archive/README.md) | Archive entry point + conventions. |
| [`archive/2026-04-internal-review-tracker.md`](archive/2026-04-internal-review-tracker.md) | IR-0 through IR-5 + IR-deferred + IR tracking table from the 2026-04-20 internal review cycle. |
| [`archive/2026-04-release-readiness-history.md`](archive/2026-04-release-readiness-history.md) | Release blockers (RB-1…5), pre-release polish (BR-1…12), Phase 2.7b descriptions (engine done), DQ-1 + DQ-2 shipped narratives, PR-8 web retirement. |
| [`archive/completed-milestones-and-legacy-backlog.md`](archive/completed-milestones-and-legacy-backlog.md) | Completed phases table, Legacy backlog `#001–#036` ID index, Research & prompts index. |
| [`archive/2026-04-asc-upload-kickoff-prompt.md`](archive/2026-04-asc-upload-kickoff-prompt.md) | Pre-launch ASC upload kickoff prompt (2026-04-14/15). |

**Other canonical lookups:**
- Internal review findings (canonical text): [`../reviews/2026-04-20-internal/`](../reviews/2026-04-20-internal/)
- HIGH-003 external Codex review kit: [`../../../3dprintassistant-ios/docs/reviews/2026-04-23-high-003-codex/`](../../../3dprintassistant-ios/docs/reviews/2026-04-23-high-003-codex/)
- v1.0.3 batch Codex packets: [`../../codex/`](../../codex/)
- Implementation specs: [`../specs/`](../specs/) — IMPL-036, IMPL-039, IMPL-040, IMPL-041.
- Pre-ROADMAP `BACKLOG.md` (last real content 2026-04-03): [`../../../_archive/3dprintassistant-BACKLOG-legacy-2026-04-03.md`](../../../_archive/3dprintassistant-BACKLOG-legacy-2026-04-03.md).
