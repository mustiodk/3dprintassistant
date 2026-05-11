# 3D Print Assistant — Roadmap

**Purpose:** Live planning surface for 3dpa web + iOS. Active release tracking, current work queue, deferred and parked work, and pointers into archive + spec + session history.

**Last updated:** 2026-05-11 — Web-only fix `809549d` shipped: Advanced filament temps now always render explicit Initial + Other layer rows for nozzle and bed (parity with iOS `3a59cd1`). Configuration-impact QA handover drafted for parallel Claude + Codex review pass; engine-side environment-temp fix (dead `bed_first_layer_adj` field + material-blind cold compensation) parked behind that QA pass. v1.0.3 still in App Review with build `202605101637`; stale builds `202605090842`, `202605101130`, `202605101544` must not be submitted.

**Evergreen project context:** [`../3dpa-context.md`](../3dpa-context.md) (architecture, engine API, app state shape, slicer routing, standing rules).
**Session history:** [`../sessions/INDEX.md`](../sessions/INDEX.md) — reverse-chronological one-line entries; full logs in `../sessions/`.
**Archive:** [`archive/`](archive/) — completed IR cycle, release-readiness history, completed milestones, legacy backlog.

---

## Current Snapshot

| Area | Status |
|---|---|
| **Web app** | Live worldwide at [3dprintassistant.com](https://3dprintassistant.com). Cloudflare Workers/Assets deploys from `main`. Feedback → Discord `#web-app-feedback` via `/api/feedback`. Owner analytics dashboard live at `/analytics` (admin token required) with side-by-side/filterable Web vs iOS views. |
| **iOS app** | Live worldwide on App Store, dark mode only. v1.0.2 released 2026-04-24. v1.0.3 is submitted to App Review as of 2026-05-10 with replacement build `202605101637` after phone QA passed. Earlier builds `202605090842`, `202605101130`, and `202605101544` are stale. EU unblocked 2026-04-27. |
| **Engine** | Web is master — edit there, `cp` byte-identical to iOS. Walkthrough harness + iOS XCTest re-run after every engine/data edit. Latest profile-temperature audit added nozzle-cap clamps across simple output, advanced output, warnings, and export paths. |
| **Export** | Engine + bridge done. Web UI **disabled** (Bambu Studio rejected `.json`). iOS UI **hidden** (deferred post-release). Re-enabling tracked under Phase 2.7a in Deferred / Parked Work. |

---

## Active Release: v1.0.3

5-item v1.0.3 batch across web + iOS; **3/5 shipped into the submitted App Review build** (items 1 + 3 + 4 — see status table below). Owner pivoted from DQ-3 to this batch on 2026-05-08. Cross-AI collaboration remains available via [`../ai-collab.md`](../ai-collab.md), but research/review packets are optional and risk-based, not a mandatory pilot workflow. Submitted build `202605101637` also includes the remote printer catalog hardening pass, profile-temperature/nozzle-cap audit fixes, and the Advanced filament temperature UI fix. Items 2 + 5 are post-v1.0.3 work unless owner explicitly reopens scope after Apple review.

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
| Phase E — Ship cycle | 🟩 Submitted to App Review on 2026-05-10 with replacement build `202605101637` after phone QA passed. `High-speed` remains the Bambu picker label because it fits on iPhone SE and avoids brittle marketed speed numbers in picker chrome. Items 2 / 5 not yet built and parked post-v1.0.3. |

---

## Active Work Queue

> Live, actionable items. Pick the next one based on owner priority.

- **v1.0.3 batch items 2 / 5** — see Active Release section above.
- **v1.0.3 App Review monitoring** — owner submitted build `202605101637` on 2026-05-10. Wait for Apple. If approved, manually release and monitor `/analytics`, feedback, Sentry, and App Store reviews. If rejected, triage the rejection notice first; do not start post-v1.0.3 cleanup until the review path is stable.
- **Configuration-impact QA pass (Claude → Codex, sequential, independent)** — structured sweep across every configuration option to find correctness gaps of the same shape as the env-temps bugs (dead data fields, magnitudes drifting from community consensus, material-/printer-blind handling). Read-only research. Claude runs first, then Codex; Codex must not read Claude's deliverable (independence is enforced by the handover). Owner diffs after both land. Handover spec at [`../research/configuration-impact-qa-handover.md`](../research/configuration-impact-qa-handover.md). Deliverables land at `docs/reviews/2026-05-11-config-impact-qa/{claude,codex}.md`; merged report at `merged.md` in the same directory. Drives a v1.0.4 batch. Can run alongside App Review monitoring (independent workstream).
- **Profile/data change gate** — use [`../runbooks/profile-data-change-test-protocol.md`](../runbooks/profile-data-change-test-protocol.md) before future engine/data/warning/export pushes. Default gate: `validate-data`, profile matrix audit, iOS sync/tests when relevant, and a tiny UI smoke only for visible changes.
- **Remote printer catalog operations** — future missing-printer additions can ship by editing `catalog/ios-printer-overlay-v1.json`, bumping `content_version`, updating `payload_sha256`, running `node scripts/validate-ios-printer-overlay.js`, and deploying web. Keep remote payload data-only: brands/printers only, no engine/rules/materials/nozzles/UI.
- **Analytics dashboard observation** — after real traffic accumulates, read `/analytics` (admin token) using the Product lens: `All` for side-by-side Web/iOS comparison, `Web` or `iOS` for single-surface inspection. Watch generated profiles, app opens, feedback opens, release adoption, profile combinations, mode mix, printers/materials, and mobile diagnostics. Ignore setup rows with appVersion values like `setup-test`, `setup-test-2`, `setup-output-mode` from 2026-05-09 setup.
- **`[CRITICAL-001-followup]`** — Worker `/api/feedback` currently routes iOS + web to single `DISCORD_WEBHOOK_URL` → `#web-app-feedback`. Branch on `payload.context.appSource === "ios"` to a separate `DISCORD_WEBHOOK_URL_IOS` env var so iOS feedback lands in `#ios-app-feedback` as originally intended. Scope: ~15 LoC in `functions/api/feedback.js` + new Cloudflare secret + new iOS-channel webhook + redeploy. No iOS binary change. v1.0.3-safe. Filed 2026-04-23. `[Web/Worker]`
- **`[LOW-011]` Feedback email visibility** — (a) web copy parity helper text under email field matching iOS copy ("Leave it blank to stay anonymous. If provided, we may reply.") + new `fbEmailHelp` key in en/da; (b) Worker reorder of `Reply-to email` to top of Discord embed (currently `functions/api/feedback.js:259`). ~10 LoC web-only. Noticed 2026-04-27 after first iOS feedback received without email. `[Web]`
- **`[LOW-005]`** — `prc_0.2` keep + add siblings, or drop. Owner decision (product-taste).
- **`[MEDIUM-018]` Part B** — `nozzles.json` ID-vs-group convention. Owner decision.

---

## Deferred / Parked Work

> Real items, parked behind another decision or work item. Promote to Active Work Queue when the gating condition resolves.

### Environment-temp engine fixes (parked behind config-impact QA pass)

Surfaced 2026-05-11 cold-start. Hold until the parallel Claude + Codex QA pass merges, then bundle with whatever the QA finds into a v1.0.4 batch.

- [ ] **Wire `environment_options[].bed_first_layer_adj` into `getAdvancedFilamentSettings`.** Currently DEAD — defined in `data/rules/environment.json` but never read by `engine.js`. Cold env's intended +7°C first-layer bed bump silently disappears. ~5 LoC engine fix; iOS engine sync; new walkthrough assertion + iOS XCTest. `[Web+iOS]`
- [ ] **Material-aware environment compensation.** Current `nozzle_adj` / `bed_adj` are scalars applied uniformly across all materials; community guidance is material-group-specific (PLA needs less, PETG/ABS/ASA/PC need more). Engine extension shape: either `environment_options[].nozzle_adj` becomes a `by_group` map (`{PLA: 5, PETG: 10, ABS: 10, PC: 15, default: 5}`), or per-material `env_compensation` block in `materials.json`. Needs sourced research before values are picked — Gemini handover candidate, mirroring [`gemini-environments-taxonomy-research.md`](../research/gemini-environments-taxonomy-research.md). `[Web+iOS]`

### Post-v1.0.3 safe-follow-up todo list

These are Claude/Codex review findings explicitly classified as **not release blockers** for v1.0.3. Do not disturb the App Review submission for these unless Apple rejects the build for a related reason.

| Priority | Item | Scope |
|---|---|---|
| P1 | **CR3-M1:** fix `scripts/profile-matrix-audit.js` `DEFAULT_STATE.level` -> `userLevel` so beginner paths are actually covered. | Web/test |
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
