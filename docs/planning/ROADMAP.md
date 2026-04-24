# 3D Print Assistant — Roadmap

**Single source of truth for all planning.** Replaces IMPLEMENTATION_PLAN.md, TASKS.md, and web BACKLOG.md.

**Last updated:** 2026-04-24 afternoon session — **DQ-2 (Safe/Tuned profile tier) SHIPPED end-to-end + DQ-1-followup (filament panel provenance) + `[LOW-003-followup-label]` all landed in one autonomous session.** 15 commits across both repos. Phase DQ 1/5 → 2/5. `_tier(preset, field, mode)` helper + sparse `_tuned` override data convention + profileMode filter group on web + SlidingSegmentedControl on iOS GoalsView + walkthrough harness DQ-2 assertion block + 4 new XCTests (46/46, was 42). **v1.0.2 APPROVED + RELEASED overnight** (owner manually released after Apple approval, same ~121 non-EU countries reach as v1.0.0). IR-2a closed. Earlier in the day: **DQ-1 (provenance infrastructure) SHIPPED end-to-end.** 6 commits across both repos: kickoff docs, S/A plumbing, harness invariant, baseline prov fills on 28 numeric resolveProfile emissions, web ⓘ icon + tooltip on Advanced view, iOS `Provenance` struct + Codable decode + `ParamRow` ⓘ alert + 2 new XCTests (42/42 green, was 40). Walkthrough harness invariant 10/10 green. Zero behavior change for existing users. v1.0.2 still awaiting Apple review — DQ work landed in parallel. Two IR-5 followups filed: DQ-1-followup (extend prov to filament panel — needs `getAdvancedFilamentSettings`/`getAdjustedTemps` upgrades) + `retraction_length` label bug in `renderFilamentPanel` (reads stale key post-LOW-003). Next: **DQ-2 — Safe/Tuned objective toggle.** Full ship-sequence executed in a single session: tone-pass What's New, MARKETING_VERSION 1.0.1 → 1.0.2 + xcodegen + push (web iOS `11b9c8d`), mid-session scope expansion added Home-screen version-display footer (iOS `15c1002`), TestFlight dispatched via `gh workflow run testflight.yml --ref main` (run [24848532846](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/24848532846), SUCCESS), on-device smoke tests 4a–4e all green, old `#ios-app-feedback` webhook deleted (attack surface from v1.0.0/v1.0.1 binaries closed), v1.0.2 submitted to App Review with **Manual release toggle** + Promotional Text "Generate optimized 3D print profiles for 64 printers across 12 brands. Bambu, Prusa, Creality, and more." Casual-tone What's New at `docs/app-store-whats-new-v1.0.2.md` (final). **Routing finding surfaced mid-step-5:** Worker `/api/feedback` routes all iOS + web feedback to single `DISCORD_WEBHOOK_URL` → `#web-app-feedback` (intended split into `#ios-app-feedback` never landed); filed as `[CRITICAL-001-followup]` in IR-5 backlog for v1.0.3 (~15 LoC + new CF secret, no iOS binary change). Now awaiting Apple review (24–48h typical). **Earlier today: IR-4 bundle + IR-5 remainder shipped into v1.0.2.** 10 findings + HIGH-003 actor→class refactor (3-pass external Codex review, VERDICT: merge). Test count 37 → 40. Bundle: MEDIUM-021 slicer-display-name bridge, HIGH-007 getNozzleSize bridge, MEDIUM-020 getFilamentTabs bridge, LOW-004 TPU drying alignment, LOW-006 flexible dedup, HIGH-006 SLICER_TABS bridge + 270 lines of SlicerLayout.swift static data deleted + snapshot test, LOW-003 retraction naming collapse (unblocks export re-enable), HIGH-011 structured numeric per chip + desc-independent assertion test, MEDIUM-009 Codable decode for resolveProfile, HIGH-003 actor → final class + serial DispatchQueue. External review: 3 Codex passes — Pass 1 flagged 4 Tier-1 concerns (description-only), Pass 2 "mostly sound, 1 Tier-1 caveat" resolved by doc-comment, Pass 3 VERDICT: merge. Review kit preserved at `3dprintassistant-ios/docs/reviews/2026-04-23-high-003-codex/`. Earlier today (IR-5 backlog sweep II): 10 findings shipped this session (21 commits across both repos): `[MEDIUM-017]` delete dead condition_warnings, `[MEDIUM-010]` reset isReady at EngineService init entry, `[LOW-009]` require da.json in presence test, `[OBS-006]` console polyfill on iOS JSContext, `[MEDIUM-022]` escHtml on 5 innerHTML sites in app.js, `[LOW-008]` soft-fail non-critical init files, `[MEDIUM-004]` shared `_fmtLayer` helper, `[LOW-010]` unify `_SUPPORT_TYPES`+`_SUPPORT_GEOMETRY` (drop `|| '0.10'` silent fallback), `[MEDIUM-019]` partial (explicit null for CF/PA/PC ×0.2 incompat; 0.8 gaps filed IR-5 followup), `[R8]` two-tier `_validateSchema()` at init (critical→throw / soft→warn, idempotent). Mid-session **TestFlight workflow switched to `workflow_dispatch`-only + concurrency cancel** after GitHub quota hit 100% — owner ship workflow now requires `gh workflow run testflight.yml --ref main` after version bump. Earlier today: `[HIGH-009]`, `[MEDIUM-001/002/007]`, `[HIGH-012-followup A+B]`, `[HIGH-008]`, `[HIGH-004/005]`, `[CRITICAL-001]` code (awaits secret config), `[HIGH-010 part A]`, `[MEDIUM-018 part A]`. 37/37 iOS tests + walkthrough clean after every commit. **Remaining for v1.0.2 ship: owner dashboard + secret config + version bump + manual CI dispatch + App Review submit** (see IR-2a section). External review kit still out. Full internal deliverable at [`docs/reviews/2026-04-20-internal/`](../reviews/2026-04-20-internal/) — **59 findings: 3 CRITICAL / 14 HIGH / 22 MEDIUM / 10 LOW / 10 OBS.** Reviewed revisions: web `c4c5071`, iOS `24aef66`.

**Earlier status:** **IMPL-039 shipped.** Full printer-capability clamping + slicer-aware values refactor landed on web + iOS in one pass. Engine helpers (`getPrinterLimits`, `_clampNum`, `mapForSlicer`, `patternFor`) plus new `data/rules/slicer_capabilities.json` replace every scattered `Math.min` and hardcoded pattern name. 2 HIGH bugs fixed (`support_interface_pattern` now emits Bambu's canonical `rectilinear_interlaced`; `initial_layer_height` scales with nozzle so 0.2mm setups don't emit illegal 0.20mm). Retraction now nozzle-scaled and auto-bowden for MINI+/other bowden printers. 32/32 iOS tests pass. Bambu export byte-matches vendor preset format across all 5 canonical combos. iOS EU distribution still blocked on DSA Trader Status verification.
**Owner:** Musti (solo dev)
**Priority:** iOS release first, then web enhancements.

> ⚠️ **Hard external deadline: April 28, 2026** — All release work must be complete before or on this date. CI runner already updated ✅

---

## Project status at a glance

| Area | Status |
|------|--------|
| **Web app** | Live at 3dprintassistant.com. 64 printers, 12 brands, 18 materials, 9 nozzles, 3 slicers. Feedback now flows to Discord `#web-app-feedback` via Cloudflare Worker at `/api/feedback` (Tally retired 2026-04-17). |
| **iOS app** | ✅ **v1.0.2 APPROVED + released 2026-04-24** (same ~121 non-EU countries as v1.0.0). Live at `apps.apple.com/app/3d-print-assistant/id6761634761`. v1.0.2 headline: CRITICAL-001 feedback privacy via Cloudflare Worker + 10 engine-correctness fixes bundled from IR-4/IR-5. 🚩 **EU distribution still blocked** by EU DSA Trader Status — submitted as Business (CVR + home address public) 2026-04-16, awaiting Apple verification. Announcement **held** until DK/EU unlocks. |
| **Engine** | Shared `engine.js` via JavaScriptCore on iOS. Web is master — edit there, copy to iOS. |
| **Export** | Engine + bridge done. iOS UI **hidden** (deferred post-release). Web UI **disabled** (Bambu Studio rejected .json). |

---

## Current priority: Internal review follow-up (Phase 0 / IR-0)

The iOS App Store release is behind us (shipped 2026-04-16, live in ~121 countries). Current priority is the ship-blocker items surfaced by the 2026-04-20 internal review + Phase 1 domain walkthrough. IR-0 ships this week; IR-2–IR-4 over the following weeks. External 3rd-party review is still out.

---

## Internal review follow-up (IR-*)

Internal review via `/code-reviewer` completed 2026-04-20 against web `c4c5071`, iOS `24aef66`. Deliverable at [`docs/reviews/2026-04-20-internal/`](../reviews/2026-04-20-internal/) (9 files). Phase 1 domain walkthrough (10 real combos through the live engine) ran 2026-04-20; harness at [`scripts/walkthrough-harness.js`](../../scripts/walkthrough-harness.js), raw output at [`docs/reviews/2026-04-20-internal/domain-walkthrough.md`](../reviews/2026-04-20-internal/domain-walkthrough.md).

**Export-path work is dropped from IR scope** per owner decision — export UI is currently disabled; revisit before re-enabling. Findings tagged with `(export)` below are deferred.

Each actionable item links to its finding in the review. One finding = one commit. Don't batch.

### IR-0 — Ship this week (ship-blockers + free wins)

Target: 1–2 half-days of focused work.

**Correctness / domain (all surfaced by Phase 1 walkthrough):**
- [x] **[CRITICAL-002]** Clamp `initial_layer_bed_temp` + `other_layers_bed_temp` to `min(material.bed_temp_max, printer.max_bed_temp)`. Structured `printer_max_bed_temp_clamped` warning with printer-specific text + hard-incompat `printer_bed_temp_incompatible` when `printer.max_bed_temp < material.bed_temp_min`. Combos 6 + 10 flipped ❌→✓ on walkthrough harness. New XCTest `testBedTempClampedWhenPrinterBedTooLow` (21/21 EngineServiceTests pass, 35/35 total). Shipped 2026-04-21. `[Web+iOS]`
- [x] **[CRITICAL-003]** Validate `state.surface` / `state.strength` / `state.speed` against valid preset IDs in `resolveProfile`. Unknown → coerce to default + warn `invalid_preset`. Matching assertion in iOS tests. `[Web+iOS]` — Shipped 2026-04-22. Web `6173839`, iOS `2cbf5c7`. New XCTest `testInvalidPresetCoercedAndWarned` (36/36 pass). Validation mirrored across `resolveProfile` + `getWarnings` (same purity pattern as `_clampNum` / CRITICAL-002 — documented in code).
- [x] **[HIGH-012]** Fix "A1/A1 Mini have a 10,000 mm/s² acceleration limit…" why-text on `outer_wall_speed` — currently fires for every bedslinger with `max_accel ≤ 10000` (MK4, MK4S, Ender-3 V3, Kobra, Mini+, etc.). Template against `printer.name` + `printer.max_acceleration`. `[Web+iOS]` — Shipped 2026-04-22. Web `5797738`, iOS `6e9d2be`. New XCTest `testOuterWallWhyTextNamesActualPrinter`. **Observation (filed as IR-5 backlog):** two more A1-hardcoded strings remain on `outer_wall_acceleration.why` and `slow_down_tall.why` — same bug class, separate code paths.
- [ ] **[HIGH-014]** Owner: verify A1 mini real `max_bed_temp` vs Bambu spec page (data says 100, Bambu says 80). If 80, update `data/printers.json`. `[You]`

**Security / infra (deferred to v1.0.2 — see IR-2a):**
- [ ] **[CRITICAL-001]** Route iOS feedback through `/api/feedback` Cloudflare Worker (currently posts direct to Discord webhook, URL extractable from binary). Ship as v1.0.2. Auth via `X-App-Source: ios` + HMAC/shared-secret. Worker sanitises `@everyone`/`@here` + rebuilds embed. Rotate old webhook after cutover. `[iOS+Worker]` — **Deferred from IR-0 overnight sweep** (needs coordinated Worker + iOS v1.0.2 build + secret gen + supervised production deploy). Primary feature of IR-2a ship pass.
- [x] **[LOW-001]** Rotate Sentry DSN (hardcoded in commit `e707df4` history). Sentry dashboard → revoke + create new → update `Config.xcconfig` → ship next build. `[iOS]` — Shipped 2026-04-22. New DSN live in local Config.xcconfig + `SENTRY_DSN` GitHub secret; old DSN (hash `0aa31ac865f8…`) disabled on Sentry.
- [ ] **[HIGH-010]** Add IP-bucket rate limit to `/api/feedback` (Cloudflare Rate Limiting or Workers KV). 10 req/min per IP, 100 req/min global. Strip `@everyone`/`@here` + markdown link syntax before building embed. `[Worker]` — **Deferred from IR-0** (production Worker config; prefer owner-supervised). Carried into IR-2a.

**Data hygiene (fixes take minutes):**
- [x] **[MEDIUM-015]** Add `"lightning"` to `prusaslicer.sparse_infill_patterns` in `slicer_capabilities.json`. Remove the `lightning → rectilinear` Prusa fallback entry. `[Web+iOS]` — Shipped 2026-04-22. Web `e58d0ed`, iOS `aca26f1`. "lightning" was already in the valid set; the fallback entry was the actual silent downgrade vector. Walkthrough unchanged.
- [x] **[MEDIUM-016]** Add `"adaptivecubic"` to Bambu + Orca `sparse_infill_patterns`. `[Web+iOS]` — Shipped 2026-04-22. Web `2ddff99`, iOS `34fba25`. Latent-gap fix (no current code path emits "adaptive cubic" — future preset additions won't silently fail validation).
- [ ] **[LOW-002]** Rewrite HIPS `enclosure_behavior.reason` (currently copy-pasted from ABS). `[You]` for text, `[Code]` to apply.

**Test quality:**
- [x] **[HIGH-002]** Tighten IMPL-040 surface-parity test: compute `expectedCount = 7×6 = 42`, replace silent `continue`s with `XCTFail`, end with `XCTAssertEqual(checked, expectedCount)`. `[iOS]` — Shipped 2026-04-22. iOS `cb0b73d`. All 42 cells asserted; test still green.
- [x] Run XCTest suite locally; record baseline runtime. `[iOS]` — Recorded 2026-04-22. Test-execution-only: **0.62s** for 37 tests. Total wall time including simulator scaffolding: **2m06s** (iPhone 17 Pro Max simulator, cold first-run of the session).

### IR-2a — iOS v1.0.2 ship pass ✅ RELEASED 2026-04-24

Target: 1–2 sessions. Goal: ship **iOS v1.0.2** to the App Store with CRITICAL-001 (feedback privacy) as the headline user-visible change and a bundle of engine-correctness fixes that already landed since v1.0.1. Version bump + TestFlight → Review → Manual release.

**Sequencing rationale:** CRITICAL-001 is the only true user-visible change in the queue — everything else is silent-correctness. Shipping them together under one version number keeps App Review narrative clean ("improved privacy and reliability") and means one TestFlight cycle instead of two.

**Headline feature:**
- [x] **[CRITICAL-001]** Route iOS feedback through `/api/feedback` Cloudflare Worker. Shipped 2026-04-23. Worker `76b8bfa` (web) accepts `X-App-Source: ios` + HMAC-SHA256 signature over `${timestamp}\n${rawBody}`; ±5 min replay window. iOS `af3b8b7` POSTs to the Worker with `FEEDBACK_HMAC_SECRET` from `Config.xcconfig`; falls back to direct-Discord when secret empty (local dev). Footer formatting branches on `context.appSource`. **Activation pending:** owner sets `FEEDBACK_HMAC_SECRET` in 3 places (Cloudflare Worker env, GitHub repo secret, local Config.xcconfig — `openssl rand -hex 32`), then rotates Discord webhook after TestFlight verifies the new path. `[iOS+Worker]`
- [~] **[HIGH-010]** IP rate limit + sanitisation on `/api/feedback`. **Part A shipped 2026-04-23** (web `76b8bfa`) — sanitises `@everyone`/`@here`/role+user mention tags/markdown link syntax before building the Discord embed. **Part B deferred to owner:** create Cloudflare native Rate Limiting rule on `/api/feedback` (Security → WAF → Rate Limiting Rules) — 10 req/min per IP, 100 req/min global. Dashboard action, ~5 min. Code-based KV rate-limiter skipped because KV binding also needs dashboard config; native rule is reversible one-click. `[Worker]`

**Engine correctness (silent-fail fixes):**
- [x] **[HIGH-008]** Extend C6 warning loop to cover every `patternFor` field (top/bottom/internal/seam). Shipped 2026-04-23. Web `4f35b3b`, iOS `e7ef228`. Surfaced one real previously-silent substitution: Prusa fine-quality `"Monotonic line"` → `"monotonic"`. Seam_position only checked when `state.seam` explicitly set (default display string would fire noisy warning). `[Web+iOS]`
- [x] **[HIGH-009]** `_clampNum` non-finite fallback returns a finite bound (min → max → 0). Shipped 2026-04-23. Web `62d7ae9`, iOS `250f187`. `[Web+iOS]`
- [x] **[MEDIUM-001]** Numeric-compare `limits_override.nozzles` keys. Shipped 2026-04-23. Web `d211d89`, iOS `677e623`. `[Web+iOS]`
- [x] **[MEDIUM-002]** `resolveProfile` `!nozzle` early-return guard. Shipped 2026-04-23. Web `c2479db`, iOS `9fe5127`. `[Web+iOS]`
- [x] **[MEDIUM-007]** Init-time `printer.series` enum validation — loud `console.warn` on typo'd values. Shipped 2026-04-23. Web `1b0c4aa`, iOS `6296ec4`. All 64 bundled printers pass. `[Web+iOS]`

**iOS reliability (bridge error path — real errors stop masking as timeouts):**
- [x] **[HIGH-004]** Re-read `_engineError` in post-loop block before throwing timeout. Shipped 2026-04-23. iOS `83edae6`. `[iOS]`
- [x] **[HIGH-005]** Structured `{set, value}` sentinel replaces null string-compare. Shipped 2026-04-23. iOS `d2957da`. Uses `_engineError.set` / `.value`. `[iOS]`

**Data hygiene (Phase 0 closed 2026-04-23):**
- [x] **[HIGH-014]** A1 Mini `max_bed_temp` 100 → 80 per Bambu spec. Shipped 2026-04-23. Web `af3b24d`, iOS `cfe8a6c`. CRITICAL-002 bed-clamp warning now fires correctly on A1 Mini + PETG (85°C initial-layer clamps to 80).
- [x] **[LOW-002]** HIPS `enclosure_behavior.reason` rewritten (no longer ABS copy-paste). Shipped 2026-04-23. Web `822a2d0`, iOS `1d58991`.
- [x] **[MEDIUM-018]** `nozzles.json.not_suitable_for` + `suitable_for` both normalized to material IDs. Part A shipped 2026-04-23 (web `597499b`, iOS `5a360dc` — orphan refs cleanup). Part B shipped 2026-04-23 (web `bc76345`, iOS `f27591e` — suitable_for normalized, large hardened nozzles now list pa/pc/pet_cf explicitly).

**Infrastructure activation (Phase 0 closed 2026-04-23):**
- [x] **HMAC secret deployed to 3 places** — local `Config.xcconfig`, GitHub repo secret `FEEDBACK_HMAC_SECRET` (stamped `2026-04-23T10:43:13Z`), Cloudflare Worker env (Secret type). Round-trip verified: signed curl POST → 200 OK; negative tests (no sig / bad sig / skew) all return 401. CRITICAL-001 activation now complete.
- [x] **[HIGH-010 part B]** Cloudflare rate-limit rule `feedback-per-ip` deployed 2026-04-23. Free plan: 2 requests / 10 seconds per IP (≈12 req/min), Block 10s. Verified via 15-request curl flood — 429s fire at request 3+.

**IR-5 followups that landed this phase:**
- [x] **[HIGH-012-followup A]** `outer_wall_acceleration.why` printer-name template. Shipped 2026-04-23. Web `e1ca1a0`, iOS `543a51c`.
- [x] **[HIGH-012-followup B]** `slow_down_tall.why` printer-name template. Shipped 2026-04-23. Web `4efc122`, iOS `cf98878`.

**Release mechanics (owner execution — all done 2026-04-23):**
- [x] Bump CFBundleShortVersionString to `1.0.2` in `project.yml` + run `xcodegen generate`. Shipped 2026-04-23 as iOS `11b9c8d`. `MARKETING_VERSION` drives `CFBundleShortVersionString` via `$(MARKETING_VERSION)` Info.plist reference.
- [x] **Mid-session scope add (2026-04-23):** Home-screen version-display footer — small muted `v1.0.2 (<build>)` line at bottom of HomeView. Motivated by TestFlight testers needing to tell builds apart at a glance. `AppConstants.appVersion` + `appBuildNumber` read from `CFBundleShortVersionString` + `CFBundleVersion`. iOS `15c1002`. 40/40 XCTest still green.
- [x] TestFlight build dispatched 2026-04-23 via `gh workflow run testflight.yml --ref main` (run [24848532846](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/24848532846), SUCCESS).
- [x] "What's New" tone-pass done 2026-04-23 (final casual English version) at [`docs/app-store-whats-new-v1.0.2.md`](../app-store-whats-new-v1.0.2.md). Pasted into App Store Connect.
- [x] TestFlight internal test round 2026-04-23. All 4 smoke tests green: home-screen shows `v1.0.2 (<build>)`, feedback via Worker path (Cloudflare Logs confirm POST /api/feedback 200), no engine-init crash warm or cold, MK4 acceleration why-text names MK4 (not A1). `invalid_preset` not synthetically triggered (engine init + restore-from-state pass; accepted as indirect signal).
- [x] Rotated old Discord webhook URL 2026-04-23 — **deleted** the old `#ios-app-feedback` channel webhook that was hardcoded in v1.0.0/v1.0.1 iOS binaries. Worker's `DISCORD_WEBHOOK_URL` env var untouched (never exposed in any binary). From this moment, v1.0.0/v1.0.1 users' in-app feedback silently 404s until they update to v1.0.2.
- [x] Submitted to App Review 2026-04-23 with **Manual release toggle** + Promotional Text updated to "Generate optimized 3D print profiles for 64 printers across 12 brands. Bambu, Prusa, Creality, and more." Screenshots reused from v1.0.0. Awaiting Apple (24–48h typical).
- [x] Screenshots: reuse v1.0.0 set — no UI changes in this release.

**Release (owner, post-approval):**
- [x] 2026-04-24 — Apple approved + owner manually released v1.0.2 to the same ~121 non-EU countries as v1.0.0. EU distribution remained blocked by DSA Trader Status (still awaiting Apple verification as of release). `[You]`
- [ ] Day-1 monitoring: Sentry Issues tab + Discord `#web-app-feedback` channel for first 24h post-release. Rate-limit rule + HMAC sanitisation should keep noise down. `[You]`

**Acceptance:**
- iOS v1.0.2 live in Apple's "Ready for Sale" state (same reach as v1.0.0).
- Old Discord webhook URL rotated; iOS binary no longer contains it.
- Rate limit live on `/api/feedback` Worker — curl-flood test confirms 429 at threshold.
- Full iOS XCTest suite green + 3 new regression tests: worker round-trip (mocked), HIGH-008 pattern coverage, HIGH-009 fallback sanity.

**Bundled into v1.0.2 on 2026-04-23** (revised scope — owner chose to fold IR-4 + remaining IR-5 into this release rather than defer):
- `[HIGH-003]` actor → final class refactor (IR-4)
- `[HIGH-006]` bridge SLICER_TABS / SLICER_PARAM_LABELS (IR-4)
- `[HIGH-007]` bridge getNozzleSize (IR-4)
- `[HIGH-011]` structured numeric per chip (IR-4)
- `[MEDIUM-009]` Codable decode for resolveProfile output (IR-5)
- `[MEDIUM-020]` bridge getFilamentTabs (IR-4)
- `[MEDIUM-021]` bridge getSlicerDisplayName (IR-4)
- `[LOW-003]` consolidate retraction_length vs retraction_distance (IR-5 — unblocks export re-enable)
- `[LOW-004]` TPU drying display vs numeric mismatch (IR-5)
- `[LOW-006]` flexible field duplication (IR-5)

**Still out of scope for v1.0.2:**
- `[LOW-005]` prc_0.2 siblings — product-taste decision, filed as IR-5 followup.
- `[LOW-007]` Bambu preset version hoist — export-deferred (export UI still disabled).
- Light mode — v1.1 candidate.
- IR-deferred export path items — wait until export is re-enabled.

### IR-1 — Data suggestion logic verification ✅ 2026-04-20

- [x] Harness built at [`scripts/walkthrough-harness.js`](../../scripts/walkthrough-harness.js) — reusable, Node-based, loads `engine.js` via `vm` with `fetch` + `localStorage` polyfills.
- [x] 10 representative combos run; raw output at [`domain-walkthrough.md`](../reviews/2026-04-20-internal/domain-walkthrough.md); analysis integrated into [`01-critical.md`](../reviews/2026-04-20-internal/01-critical.md) + [`02-high.md`](../reviews/2026-04-20-internal/02-high.md).
- [x] Surfaced 5 new findings: CRITICAL-002, CRITICAL-003, HIGH-012, HIGH-013, HIGH-014.
- [x] Confirmed positives: IMPL-040 chip-desc parity holds on all combos; abrasive/flex/enclosure warnings fire correctly; layer-height + speed clamping narrates correctly via `_clamped` warnings; checklists are material-aware.

Second-pass coverage (when needed — add combos to `COMBOS[]` and re-run):
- [ ] Environment presets (cold / hot / damp).
- [ ] Non-`none` support presets.
- [ ] Multi-color / AMS combos.
- [ ] `calcPrintTime` accuracy.
- [ ] `calcPurgeVolumes`.
- [ ] `getTroubleshootingTips` output.

### IR-2 — Engine correctness hardening ✅ 2026-04-23

All IR-2 items shipped via IR-2a + the 2026-04-23 cleanup sweep. Kept here for traceability; see IR-2a + IR-5 sections for commit references.

- [x] **[HIGH-008]** Extend C6 warning loop to cover every `patternFor` field — shipped IR-2a.
- [x] **[HIGH-009]** `_clampNum` non-finite fallback returns a finite bound — shipped IR-2a.
- [x] **[MEDIUM-001]** Numeric-compare `limits_override.nozzles` keys — shipped IR-2a.
- [x] **[MEDIUM-002]** `resolveProfile` `!nozzle` early-return guard — shipped IR-2a.
- [x] **[MEDIUM-007]** Init-time validation of `printer.series` enum — shipped IR-2a (subsumed by R8 `_validateSchema` on 2026-04-23).
- [~] **[MEDIUM-018]** Part A (orphan refs) shipped IR-2a. Part B (ID-vs-group convention) remains an owner decision.

### IR-3 — Failure-mode rehearsal (live-product readiness)

Target: 1 session. "What happens when this breaks" work.

- [ ] Force `engine.init()` to throw on iOS (corrupt or remove a bundled data file locally). Verify error UI + Sentry event. `[iOS]`
- [ ] Force `/api/feedback` 500. Verify web modal error, iOS error (after IR-0 CRITICAL-001 lands). `[Web+iOS]`
- [ ] Simulate malformed `printers.json` deploy on a preview branch; verify site doesn't brick. Ties into [LOW-008] — wrap non-critical `.json()` reads in `.catch()` with documented defaults. `[Web]`
- [ ] Rollback rehearsal: web `git revert` + push → verify auto-deploy serves old; iOS TestFlight expire-build → verify testers blocked. Document in new runbook. `[Both]`
- [ ] Pull production Sentry + Cloudflare Analytics 14-day baselines (event rate, error types, region distribution, feedback volume, any 429s). `[You]`
- [ ] Create `docs/runbooks/incident-response.md` with rollback procedures, Sentry + CF links, current baseline. `[Code]`

### IR-4 — Drift prevention (structural) ✅ 2026-04-23 (bundled into v1.0.2)

All items shipped. HIGH-003 was the riskiest — ran through 3 Codex external-review passes before merging; final verdict `merge`. Review kit preserved at `3dprintassistant-ios/docs/reviews/2026-04-23-high-003-codex/`.

- [x] **[HIGH-003]** `actor EngineService` → `final class @unchecked Sendable` + dedicated serial `DispatchQueue(label: "engine.js", qos: .userInitiated)` — shipped 2026-04-23 via squash-merge (iOS `2579fe8`). `run<T>(_:)` helper dispatches via `withCheckedThrowingContinuation`; every public async method wraps a private `sync_*` counterpart. `assertOnEngineQueue()` debug guard in `sync_initialize` + `evaluate`. JSCore contract is mutual exclusion, not strict thread pinning — serial queue satisfies it. 3 external-review passes (Codex, description→code→code). 40/40 XCTest.
- [x] **[HIGH-006]** Bridge `Engine.SLICER_TABS` + `Engine.SLICER_PARAM_LABELS` — shipped 2026-04-23. Web `73ad161`, iOS `5132d94`. Deleted 270+ lines of static data from `SlicerLayout.swift`; added `testSlicerLayoutSnapshot` locking 3 slicers × 5 tab ids × must-contain params. Surfaced pre-existing Prusa `wall_loops` gap as IR-5 followup.
- [x] **[HIGH-007]** Bridge `Engine.getNozzleSize(id)` — shipped 2026-04-23. Web `5cbcd72`, iOS `546fcfa`. Dropped `OutputView.nozzleSizeKey` string-split; now cached on `OutputViewModel` from engine.
- [x] **[HIGH-004]** Re-read `_engineError` in post-loop block — shipped 2026-04-23 (IR-2a). iOS `83edae6`.
- [x] **[HIGH-005]** Structured `_engineError` sentinel — shipped 2026-04-23 (IR-2a). iOS `d2957da`.
- [x] **[HIGH-011]** Structured numeric per chip (`value` field) — shipped 2026-04-23. Web `9aa164e`, iOS `98f372f`. Surface chips carry `value: <effective layer_height>`, support chips carry `value: <z_gap>`. New `testChipValueFieldMatchesEmission` asserts parity WITHOUT regex-parsing desc.
- [x] **[MEDIUM-020]** Bridge `getFilamentTabs(mode)` — shipped 2026-04-23. Web `c3ba127`, iOS `2436844`. Per-tab mode flag ("simple" / "advanced"); UI filters client-side.
- [x] **[MEDIUM-021]** Bridge `getSlicerDisplayName(id)` — shipped 2026-04-23. Web `f6dd64b`, iOS `9093b24`. Dropped hardcoded switch in OutputViewModel.
- [x] **[R8]** `_validateSchema()` at engine init — shipped 2026-04-23. Web `7601c72`, iOS `88047ec`. Two-tiered (critical→throw / soft→warn), idempotent via `_schemaValidated` flag. Current data: 0 critical, 16 soft warnings documenting `[MEDIUM-019-followup]` (max_mvs 0.8 gaps). Subsumes the MEDIUM-007 inline check.

### IR-5 — Backlog (touch when nearby)

Not session-scheduled. Tick off as nearby edits touch the files.

- [x] **[HIGH-012-followup A+B]** A1 why-text templating on `outer_wall_acceleration.why` + `slow_down_tall.why` — shipped 2026-04-23 (IR-2a).
- [x] [LOW-003] Consolidate `retraction_length` + `retraction_distance` in materials.json — shipped 2026-04-23 (IR-4 bundle). Web `b58b8e2`, iOS `d853ffb`. Picked `retraction_distance` as canonical (R5 recommendation); deleted `retraction_length` from all 18 materials + 5 engine read sites. Unblocks HIGH-001 export fix when export UI is re-enabled.
- [x] [LOW-004] TPU drying `display` vs numeric `heatbed_temp` mismatch — shipped 2026-04-23 (IR-5 sweep II). Web `14f82e0`, iOS `a5be620`. Aligned TPU 85A + 90A display strings with numeric 80°C value.
- [ ] [LOW-005] `prc_0.2` — keep + add siblings, or drop. Owner decision (product-taste).
- [x] [LOW-006] `flexible` field duplication — shipped 2026-04-23 (IR-4 bundle). Web `2e87e1b`, iOS `101618a`. Dropped `properties.flexible` (never read by engine); top-level `flexible` is canonical.
- [ ] [LOW-007] Hoist Bambu preset `version: '2.5.0.14'` to module constant. (Lower priority; export disabled.)
- [ ] **[CRITICAL-001-followup]** Worker `/api/feedback` routes iOS + web to a single `DISCORD_WEBHOOK_URL` — currently all lands in `#web-app-feedback`. Branch on `payload.context.appSource === "ios"` to a separate `DISCORD_WEBHOOK_URL_IOS` env var so iOS feedback lands in `#ios-app-feedback` as originally intended. Noticed 2026-04-23 during v1.0.2 ship sequence; Option 1 chosen (pool in `#web-app-feedback` for v1.0.2, fix in v1.0.3). Scope: ~15 LoC in `functions/api/feedback.js` + new Cloudflare secret + new iOS-channel webhook + redeploy. No iOS binary change, no App Review re-submit. v1.0.3-safe.
- [x] [LOW-008] Wrap per-file `init()` `.json()` in `.catch()` for non-critical files — shipped 2026-04-23. Web `250d456`, iOS `dea0eab`. Critical files (printers/materials/nozzles/env/obj/warnings/locales) still hard-fail; troubleshooter + slicer_capabilities soft-fail with documented defaults.
- [x] [LOW-009] Add `da.json` to `testAllBundledResourcesPresent` — shipped 2026-04-23. iOS `63c3a5d`.
- [x] [LOW-010] Unify `_SUPPORT_TYPES` + `_SUPPORT_GEOMETRY` — shipped 2026-04-23. Web `d91bb6a`, iOS `228a600`. Merged table; `|| '0.10'` silent fallback deleted (new support ids without geometry now throw at emission).
- [x] [MEDIUM-003] Document `limits_override` null vs undefined contract — shipped 2026-04-23. Web `cc2dc9d`, iOS `d7f12f0`. Comment-only on `getPrinterLimits`.
- [x] [MEDIUM-004] Single `_fmtLayer(lh)` helper shared by chip desc + profile emit — shipped 2026-04-23. Web `a1b187a`, iOS `fcb56f1`. Scope: `layer_height` only; `initial_layer_height` keeps its own toFixed(2) (different display convention).
- [x] [MEDIUM-005] Route strength-chip pattern through `mapForSlicer` — shipped 2026-04-23. Web `b0bd201`, iOS `1e6f175`. Added `filtersSlicer` local in `getFilters`; suppression check uses slicer-mapped lowercase canonical set.
- [x] [MEDIUM-009] Typed `Codable` decode for `resolveProfile` output — shipped 2026-04-23 (IR-4 bundle). iOS `05e6bfa`. Private `_ProfileParamWire: Decodable` struct with multi-type `value` handling; Sentry-captures decode failures.
- [x] [MEDIUM-010] Reset `isReady = false` at top of `EngineService.initialize()` — shipped 2026-04-23. iOS `65899ef`.
- [x] [MEDIUM-011] Correctness-tier test — shipped 2026-04-23. iOS `4300400`. 8 combos spanning clamp-up/-down, tight-firmware, CoreXY, bedslinger, large/small nozzle. Expected values regenerable via `scripts/extract-correctness-tuples.js` (web `dc7ee95`). 38/38 XCTest (was 37).
- [x] [MEDIUM-012] `JSON.stringify`-style escaping for ID embeds — shipped 2026-04-23. iOS `6d93380`. New `jsonLit()` helper, 5 sites migrated + closed zero-escape gap on `getAdjustedTemps` materialId/environmentId.
- [x] [MEDIUM-013] Throw/log on `getFilters(state:)` serialisation failure — shipped 2026-04-23. iOS `d806a09`. `try? → nil → stateless fallback` replaced with `do/catch` that Sentry-captures + throws `EngineError.serializationFailed`.
- [ ] [MEDIUM-014] See CRITICAL-002 — partial finding now covered there.
- [x] [MEDIUM-017] Deleted dead `condition_warnings` block + validate-data.js schema support — shipped 2026-04-23. Web `358591d`, iOS `a797f2f`. **Follow-up shipped same day:** `material_warnings` was also dead — full retirement of `warnings.json` (file deleted, fetch line + `_warnings` var dropped, iOS buildFetchData + presence test + project.yml entries removed, xcodeproj regenerated). Web `481049d`, iOS `19ee59b`.
- [~] [MEDIUM-019] Align `max_mvs` key coverage with `k_factor_matrix`. **Part A shipped 2026-04-23** — explicit `null` for CF/PA/PC/pa_cf/pet_cf ×0.2 (already incompatible via `min_diameter=0.4`). Web `f6d11f6`, iOS `ad655ed`. **`[MEDIUM-019-followup]`** — 0.8mm entries for 16 mainstream materials + HIPS 0.2mm still need domain-sourced volumetric numbers; R8 surfaces these as 16 soft warnings at init.
- [x] [MEDIUM-022] Route `innerHTML` call sites through `escHtml` — shipped 2026-04-23. Web `1eb9ffa`. 5 sites: warnings bar (m.text/m.detail), filament notes, compare banner (comparisonProfile.label), profile-panel rows.
- [x] [OBS-006] Minimal `console` polyfill to iOS JSContext — shipped 2026-04-23. iOS `c2fa85c`. Defuses latent ReferenceError from MEDIUM-007 inline `console.warn`.
- [x] **[DQ-1-followup]** ✅ Shipped 2026-04-24 PM. `_prov` sidecar on `getAdjustedTemps` / `getAdvancedFilamentSettings` / `getFilamentProfile` (additive, doesn't break callers); web `row()` helper extended with optional 4th prov arg + 12 numeric rows wired; iOS `AdjustedTemps` + `FilamentProfile` gain `prov: [String: Provenance]` + `_decodeProvSidecar` helper; `FilamentSettingsView` + `ParamRow` render ⓘ + alert in Advanced mode. 2 new XCTests. Web `c5b6ea2…be75b68`, iOS `7a913f3…f9c966e`. `[Both]`
- [x] **[LOW-003-followup-label]** ✅ Shipped 2026-04-24 PM (web-only, 2-line). Swapped `adv.retraction_length` → `adv.retraction_distance` at `app.js:1187`. Preview confirmed "Retraction length 0.6 mm" on A1 + PLA + 0.4mm (was "undefined"). Display label `rowRetractLen` kept — matches Bambu Studio UI convention. Web `2441b18`. `[Web]`

### IR-deferred — export path (re-activate when export is re-enabled)

- [ ] [HIGH-001] `exportBambuStudioJSON` writes unscaled retraction (reads `bs.retraction_length` instead of scaled value). Depends on [LOW-003 / HIGH-013] collapse first.
- [ ] [MEDIUM-006] `_extractValue` lowercase-strip fallback.
- [ ] [MEDIUM-008] Export-path pattern map duplication — collapse via `mapForSlicer`.
- [ ] [LOW-007] Bambu preset `version` string hardcoded.
- [ ] Live Bambu Studio import test (5 combos).

### IR tracking

| Phase | Status | Owner-time | Code-time |
|---|---|---|---|
| IR-0 — Ship this week | 🟩 5/10 shipped; 4 deferred to IR-2a, 1 pending owner (HIGH-014) | — | — |
| IR-1 — Data logic verification | ✅ 2026-04-20 | — | — |
| IR-2a — iOS v1.0.2 ship pass | ✅ **RELEASED 2026-04-24** (same reach as v1.0.0; EU still DSA-blocked). Remaining: day-1 monitoring (owner) | — | — |
| IR-2 — Engine correctness | ✅ 2026-04-23 | — | — |
| IR-3 — Failure rehearsal | ⏳ deferred per owner | 30 min | 2 h |
| IR-4 — Drift prevention | ✅ 2026-04-23 (bundled into v1.0.2) | — | — |
| IR-5 — Backlog | ongoing | — | — |
| **Phase DQ — Data quality & pro-relevance** | 🟩 **2/5 shipped** — DQ-1 (provenance) ✅ 2026-04-24 AM + DQ-1-followup (filament panel) ✅ 2026-04-24 PM; DQ-2 (Safe/Tuned) ✅ 2026-04-24 PM; DQ-3 next | — | 2–3 sessions |

---

## Phase DQ — Data Quality & Pro-Relevance

**Master spec:** [`IMPL-041-data-quality-phase.md`](../specs/IMPL-041-data-quality-phase.md) — full design, acceptance criteria, scraper strategy.

**Goal:** move from beginner-friendly to pro-credible. Every number has a traceable source; profiles split into **Safe** (published spec) vs **Tuned** (community-validated); pro-tier fields (PA/LA, material-specific retraction, structured cooling) land on both platforms.

**Sequence is strict.** DQ-1 is load-bearing; retrofitting provenance later = rework every commit. DQ-2's Safe/Tuned shape decides where DQ-3/4/5 data lands.

**Progress:** `[🟩🟩⬜⬜⬜ 40%]` — **DQ-1 + DQ-2 shipped 2026-04-24**. 3 sub-phases remaining.

### DQ-1 — Provenance infrastructure ✅ 2026-04-24

Every numeric emission now carries a `{source, ref?}` tag. Advanced view on both web + iOS reveals per-field provenance on demand; beginners never see it.

**Shipped** (6 commits across both repos + 1 kickoff-docs commit):
- [x] `engine.js`: `S`/`A` helpers extended with optional `prov` arg (revised spec — no separate `_tag` helper, no return-shape split; inline on each emission keeps iOS Codable + 4 internal callers unchanged). Web `34e92b0`, iOS `720d26a`. `[Both]`
- [x] `engine.js`: all 28 numeric emissions in `resolveProfile` tagged with baseline prov (7 `default`, 19 `calculated`, 2 `rule`). 18 qualitative emissions (pattern names, generator, Enabled flags) stay `prov=null` per spec. Web `a173f0c`, iOS `16dcb2a`. `[Both]`
- [x] `scripts/walkthrough-harness.js`: new check 0c — fails on any numeric emission with `prov=null` + malformed-shape check. Web `38b36cb`. Shipped before the prov fills so the invariant arrives before the data that satisfies it. 10/10 combos green. `[Web]`
- [x] `app.js` + `style.css`: Advanced-view ⓘ icon after param label with native `title="Source: X — ref"` tooltip. 11px, muted 0.55 opacity, hover → 1.0 + info color. Web `7b76cc3`. Scope: `renderProfilePanel` non-comparison view only (comparison view + filament panel deferred to follow-up). `[Web]`
- [x] iOS: `Provenance` struct + `ProfileParam.prov: Provenance?` + `_ProfileParamWire._ProvenanceWire` Codable decode. Null/missing/malformed prov all collapse to nil — pre-DQ-1 payloads still decode. `ParamRow` gains `prov`/`showProv` params: renders `info.circle` button + alert ("Where this number comes from — Calculated / rule:..."). `PrintProfileTabView` wires `isAdvanced` through. iOS `837ca10`. `[iOS]`
- [x] iOS: `EngineServiceTests` +2 tests — `testProvenanceOnAllNumericEmissions` mirrors harness check 0c; `testProvenanceSpotChecksKnownFields` asserts `layer_height.prov.source == "calculated"` and `wall_generator.prov == nil`. 42/42 green (was 40). `[iOS]`
- [x] Byte-identical engine + data sync web → iOS verified after every engine commit. `[Both]`

**Pragmatic baseline caveat:** `pressure_advance` + `retraction_speed` are tagged `default` today but the values are already real slicer-preset data. DQ-3 upgrades those to `source: 'vendor'` once the scraper confirms/replaces the numbers.

**Follow-ups filed to IR-5:**
- `[DQ-1-followup]` — extend provenance to filament panel (requires `getAdvancedFilamentSettings` + `getAdjustedTemps` to emit prov; then same ⓘ treatment in `renderFilamentPanel` + `FilamentSettingsView`). ~2h.
- `[LOW-003-followup-label]` — `renderFilamentPanel` (`app.js:1187`) reads deleted `adv.retraction_length` → displays "undefined". LOW-003 renamed the key to `retraction_distance` but this call site was missed. 2-line fix.

### DQ-2 — Safe vs Tuned objective ✅ 2026-04-24

Shipped end-to-end in a single session (2026-04-24 PM). 8 commits across both repos. Phase DQ 1/5 → 2/5.

MVP scope: 5 tiered fields across 3 presets (speed_priority.fast + speed_priority.balanced + strength_levels.strong). Sparse `_tuned` override pattern — only fields that differ Safe → Tuned appear in the override block; everything else falls through to the Safe (top-level) value via `_tier()` helper.

- [x] `engine.js`: `_tier(preset, field, mode)` helper + `state.profileMode` coercion (missing/unknown → `'safe'`); 5 MVP reads wired; prov refs on the 3 emissions gain `(_tuned)` / `(base from _tuned)` tier marker. Web `d4c9288`, iOS `b02aead`. `[Both]`
- [x] `data/rules/objective_profiles.json`: sparse `_tuned` blocks on fast/balanced/strong. Values: outer_corexy 150→200 / 100→130, outer_bedslinger 100→130 / 80→100, outer_accel_corexy 6000→10000 / 5000→8000, outer_accel_bedslinger 3000→6000, infill_density strong 35→25. Web `8eccfed`, iOS `182833f`. `[Both]`
- [x] `app.js` + `engine.js` filter registry: `profileMode` filter group rendered via existing chip system — no new plumbing. `state.profileMode = null` explicit field. Locale keys `filterProfileMode` / `pmSafe` / `pmSafeDesc` / `pmTuned` / `pmTunedDesc` in en + da. Web `f9384dc` + `5a97ed8` iOS engine re-sync. `[Web]`
- [x] Walkthrough harness DQ-2 assertion: Safe baseline byte-equal (profileMode absent === explicit 'safe') + Tuned differentiation ≥3/5 on A1+strong+fast + prov refs tier-tagged. All 3 checks ✓. Web `270d17b`. `[Web]`
- [x] iOS: `AppState.profileMode: String?` (nil = Safe default); `resetGoals` clears it; `toJSDictionary` includes it when set. `GoalsView` renders `SlidingSegmentedControl` for profileMode inside "More options" disclosure after Experience Level, gated on `!options(for: "profileMode").isEmpty` for incremental rollout. Locale sync for en + da. iOS `0380910`. `[iOS]`
- [x] iOS: new XCTests `testSafeBaselineByteEqualToDefault` + `testTunedEmissionDiffersOnTieredFieldsAndTagsProvenance`. 46/46 XCTest green (was 44). iOS `949f95b`. `[iOS]`

### DQ-3 — Pressure / Linear Advance per material

Biggest single pro-credibility lever. Scraper-assisted data collection.

- [ ] `scripts/scrape/` — Node.js scraper for 6 sources (Bambu wiki, Prusa KB, Polymaker, Prusament, Overture, eSun). Owner runs locally. `[Code-once]`
- [ ] `docs/research/scraped/` — raw dumps committed for reproducibility. `[You to run]`
- [ ] Gemini pass — cross-reference + propose values with confidence tiers. `[You, external tool]`
- [ ] `materials.json`: `pressure_advance` map per printer × nozzle, provenance-tagged. `[Web]`
- [ ] `engine.js`: emits `pressure_advance` (Bambu/Orca) / `linear_advance_factor` (Prusa). `[Web]`
- [ ] Walkthrough: ≥ 3 combos assert PA/LA presence + sanity range. `[Web]`
- [ ] Coverage floor: top 10 materials × 4 mainstream printer series; `_default` for all 18 materials. `[Web]`
- [ ] iOS sync + XCTest. `[iOS]`
- [ ] Folds in `[MEDIUM-019-followup]` (0.8mm max_mvs gaps) — same scraper pass produces both. `[Web+iOS]`

### DQ-4 — Retraction deltas per material

Material-aware retraction. Current model is nozzle + bowden only.

- [ ] `materials.json`: optional `retraction` override (distance_multiplier, speed, provenance). `[Web]`
- [ ] `engine.js`: `_resolveRetraction(printer, nozzle, material)` rule. `[Web]`
- [ ] Safe tier keeps current model; Tuned applies override. `[Web]`
- [ ] Coverage floor: TPU 85A/90A, PETG, ASA, PC, PA, PLA-CF. `[Web]`
- [ ] iOS sync + new XCTest (`retraction(PETG) > retraction(PLA)` on same printer/nozzle). `[iOS]`

### DQ-5 — Cooling curves

Replace flat fan% with structured cooling block.

- [ ] `materials.json`: `cooling` block (fan min/max, slow_down_layer_time, overhang fan, close_fan_first_n_layers). `[Web]`
- [ ] `engine.js`: emits into slicer-specific fields via `SLICER_PARAM_LABELS`. `[Web]`
- [ ] `app.js` + iOS `PrintProfileTabView`: new "Cooling" section. `[Web+iOS]`
- [ ] Coverage floor: cooling block for all 18 materials; Safe/Tuned differentiation for PLA, PETG, ASA, TPU minimum. `[Web+iOS]`

### Phase DQ acceptance (close criteria)

- 100% of emitted numeric params carry provenance tag; walkthrough + XCTest assert this.
- Safe/Tuned toggle live on both platforms; `safe` default; pre-DQ behavior unchanged.
- PA/LA live for top 10 materials × 4 printer series minimum.
- Per-material retraction overrides live for 6+ named materials.
- Cooling block live for all 18 materials; rendered on both platforms.
- Walkthrough harness + iOS XCTest counts bumped for DQ invariants.
- ROADMAP DQ section fully ticked.

---

## Release blockers — Fix Now

> These must be done before any public release. They are architectural/safety issues.
>
> **Recommended implementation order for Claude Code sessions:**
> 1. **RB-3** first — isolated, 20 min, zero risk of breaking anything. Get it out of the way.
> 2. **RB-1** — the most critical architectural fix. Sets the contract everything else builds on.
> 3. **RB-2** — move bridge off main actor. Required before RB-4 can be done cleanly.
> 4. **RB-4 + PR-3 together** — bridge error hardening + Codable decoding. Same files, same pass. Do not split these across sessions.
> 5. **RB-5** — write tests against the now-correct and now-typed bridge.
>
> *(RB-6/OutputView split has been moved to "Before Release" — it's a maintainability concern, not a stability blocker. Run it after RB-5 so tests can verify nothing broke during the split.)*

### RB-1: Structured warning contract (was: ChatGPT review #1) ✅ 2026-04-08
- [x] Engine: make `getWarnings()` return structured objects `{ id, text, detail, fix }` instead of HTML strings `[Web]`
- [x] iOS: rewrite warning parsing in `EngineService.swift` to consume structured data `[iOS]`
- [x] iOS: `WarningCard` already used the right struct shape — no UI changes needed `[iOS]`
- [x] Tests: add warning contract tests (4 new tests, 10/10 passing) `[iOS]`

### RB-2: Move engine bridge off main actor (was: review #2) ✅ 2026-04-08
- [x] iOS: `actor EngineService` — all JSCore work off main thread, automatic isolation `[iOS]`
- [x] iOS: 6 call-site files updated with `await` (OutputView, GoalsView, ChecklistSheet, NozzlePickerView, tests) `[iOS]`

### RB-3: Sentry DSN out of source code (was: review #3) ✅ 2026-04-08
- [x] iOS: DSN moved to `Config.xcconfig` (gitignored) → `Info.plist` `$(SENTRY_DSN)` → read at runtime via `Bundle.main.infoDictionary` `[iOS]`

### RB-4: Bridge error handling — no silent failures (was: review #4) ✅ 2026-04-08
- [x] iOS: `ExceptionStore` captures JS exceptions from evaluateScript closures `[iOS]`
- [x] iOS: `evaluate(_:fn:)` helper — clears/checks exceptions on every bridge call, logs to Sentry + throws `EngineError.jsFailed` `[iOS]`
- [x] iOS: all bridge functions route through `evaluate()` — JS exceptions observable, not silent `[iOS]`
- [ ] iOS: replace manual JSON parsing with `Codable` decoding in `EngineService` (deferred to post-release PR-3)

### RB-5: Expand bridge test coverage (was: review #5) ✅ 2026-04-08
- [x] Tests: `getChecklist`, `getFilters`, `getCompatibleNozzles`, `getFilamentProfile`, `getAdjustedTemps`, `exportBambuStudioJSON`, `formatProfileAsText` `[iOS]`
- [x] Tests: bundled-resource presence validation `[iOS]`
- [x] **18/18 tests passing** (was 10)

---

## Before release — Polish & compliance

> Complete after release blockers, before App Store submission.
>
> **Recommended order:** BR-3 (quick decision) → BR-5 (isolated) → BR-2 (filenames) → BR-4 (failure UX) → BR-6b (OutputView split, after RB-5 tests) → BR-1 (localization) → BR-7 (privacy) → BR-8 (device QA) → BR-6 (App Store pass)

### BR-1: Localize all hardcoded strings (was: review #7) ✅ 2026-04-08
- [x] iOS: `Strings.swift` — all user-facing UI strings centralized in one enum `[iOS]`
- [x] iOS: HomeView, GoalsView, OutputView, ChecklistSheet, FilamentSettingsView updated `[iOS]`
- [x] iOS: nav titles, buttons, empty states, filament tab labels, checklist strings all use `Strings.*` `[iOS]`
- Enables Danish localization: swap `Strings.*` for `NSLocalizedString` calls without touching view files

### BR-2: Export UX improvements (was: review #8) ✅ 2026-04-08
- [x] iOS: descriptive export filenames — `3DPA_process_{printer}_{nozzle}_{material}.json` `[iOS]`

### BR-3: Dark mode strategy (was: review #9) ✅ 2026-04-08 — **revised 2026-04-15**
- [x] Decision for v1.0: **dark-only** to ship faster `[iOS]`
- `.preferredColorScheme(.dark)` enforced in ContentView, WarningsSheet, ChecklistSheet, FeedbackView
- **Revised 2026-04-15**: Original "matches web app, no light mode color system exists" comment was inaccurate. Web has had full light mode + theme toggle since initial release (`html[data-theme="light"]` in style.css with 19 light tokens, `☀` toggle in header). The actual reason for iOS dark-only: `ColorTheme.swift` was hardcoded dark during MVP build, and adding light variants is real work (see backlog item below). Keep dark-only for v1.0; promote light mode to v1.1.

### BR-4: Failure states and recovery UX (was: review #10) ✅ 2026-04-08
- [x] iOS: engine load failure shows retry button + "Report issue" link (Tally form) `[iOS]`
- [x] iOS: `engineRetry` environment key + `task(id: retryCount)` in PrintAssistantApp `[iOS]`
- [x] iOS: export failures surface as alert with message + "Report Issue" action `[iOS]`

### BR-5: Centralize external links and config (was: review #11) ✅ 2026-04-08
- [x] iOS: `AppConstants.swift` — Discord URL, Tally feedback URL, website URL `[iOS]`
- [x] iOS: HomeView and OutputView use `AppConstants.*` — no more hardcoded URLs `[iOS]`

### BR-6b: Split OutputView (moved from RB-6) ✅ 2026-04-08
- [x] iOS: `OutputViewModel` (`@Observable`) — engine state + async bridge calls extracted `[iOS]`
- [x] iOS: `WarningsBannerView`, `FilamentSettingsView`, `PrintProfileTabView` extracted `[iOS]`
- [x] `OutputView.swift` down to ~170 lines (was ~410) `[iOS]`

### BR-6: App Store readiness pass (was: review #12) — pending app icon + upload
- [x] iOS: orientation — all 4 orientations supported (intentional) `[iOS]`
- [x] iOS: launch screen — solid black matches dark theme, no change needed `[iOS]`
- [x] iOS: no beta wording found in UI code `[iOS]`
- [x] iOS: 9 App Store screenshots taken at 1320×2868 (6.9") — saved to `docs/screenshots/` `[iOS]`
- [x] iOS: App Store metadata finalized — see `docs/app-store-metadata.md` (subtitle, description, keywords, URLs) `[iOS]`
- [x] Web: `/support` page live at `3dprintassistant.com/support` (App Store support URL) `[Web]`
- [x] iOS: App icon — clay-style Benchy, 1024×1024 PNG, added to asset catalog (2026-04-13) `[iOS]`
- [x] iOS: Benchy logo added to HomeView (144px) + all 6 nav bars (24px) `[iOS]`
- [x] iOS: Website link (3dprintassistant.com) added to home screen below Discord `[iOS]`
- [x] iOS: OutputView nav bar decluttered — logo removed from principal, text Reset→icon, hidden export removed `[iOS]`
- [x] Web: Benchy logo replaces SVG in header (44px, retina srcset) `[Web]`
- [x] iOS: Cross-device UI fixes applied (BR-10) — 4 P0/P1 issues resolved 2026-04-14 `[iOS]`
- [x] iOS: App Store screenshots retaken at 1320×2868 on iPhone 17 Pro Max (2026-04-14) `[iOS]`
- [ ] iOS: Upload screenshots + metadata to App Store Connect — **manual** `[iOS]`
- [ ] iOS: Privacy nutrition labels — Diagnostics only (Crash Data, Performance Data, Other Diagnostic Data) — NOT "Data Not Collected" `[iOS]`
- [x] iOS: Xcode 26 / iOS 26 SDK — updated CI runner `macos-15` → `macos-26` (2026-04-09) `[iOS]`

### BR-7: Privacy review (was: review #13) ✅ 2026-04-08
- [x] iOS: Sentry `sendDefaultPii = false` — no device name or user identifiers sent `[iOS]`
- [x] iOS: `attachScreenshot = false`, `attachViewHierarchy = false` — no visual data in crash reports `[iOS]`
- [x] iOS: Sentry environment changed from `"beta"` to `"production"` `[iOS]`
- [x] Privacy policy page — live at `https://3dprintassistant.com/privacy` `[Web]`
- [ ] App Store privacy nutrition labels — **manual, done in App Store Connect**

### BR-8: Device QA sweep (was: review #14) ✅ 2026-04-09
- [x] QA: first launch on slow devices `[iOS]`
- [x] QA: app background/foreground during engine init `[iOS]`
- [x] QA: export/share + clipboard/long-press flows `[iOS]`
- [x] QA: rotation behavior, empty results, warning-heavy configs `[iOS]`
- [x] QA: incompatible nozzle flows, non-Bambu export `[iOS]`

### BR-11: In-app feedback system (iOS) ✅ 2026-04-15
> Native SwiftUI sheet with 7 categories, conditional fields per category, auto-attached device/app metadata. Backend: Discord webhook (#3dpa-ios-feedback) — zero third-party deps, instant pings to the dev's Discord server. Tally / proper backend deferred to phase 2 when the web form is updated simultaneously.
- [x] `Models/FeedbackCategory.swift` — 7 categories (generalFeedback, featureRequest, missingPrinter, missingFilament, missingNozzle, missingSlicer, bugReport) with emoji + Discord embed colors `[iOS]`
- [x] `Services/FeedbackService.swift` — actor, async Discord webhook POST, typed `FeedbackError` for UI `[iOS]`
- [x] `Views/Feedback/FeedbackView.swift` — native sheet, dark theme, Menu-based category picker, conditional fields `[iOS]`
- [x] `Views/Feedback/FeedbackViewModel.swift` — form state, per-category validation, submission coordinator `[iOS]`
- [x] `Views/Feedback/MissingSomethingButton.swift` — shared footer link for the 4 picker screens `[iOS]`
- [x] Auto-attach: app version, build number, iOS version, device model (`utsname` identifier), locale, optional reply-to email `[iOS]`
- [x] Entry point 1: Home screen footer — "Send Feedback" (replaces previous Tally link) `[iOS]`
- [x] Entry point 2: Home engine-failure — "Report this issue" → bug pre-filled with engine error `[iOS]`
- [x] Entry point 3: OutputView nav bar — `bubble.left` icon, general feedback `[iOS]`
- [x] Entry point 4: OutputView export-failure alert — "Report Issue" → bug + error context `[iOS]`
- [x] Entry point 5: BrandPicker footer — `missingPrinter` category with "whole brand missing" note `[iOS]`
- [x] Entry point 6: PrinterPicker footer — `missingPrinter` category with current brand as context `[iOS]`
- [x] Entry point 7: MaterialPicker footer — `missingFilament` category `[iOS]`
- [x] Entry point 8: NozzlePicker footer — `missingNozzle` category `[iOS]`
- [x] Secret handling: `DISCORD_FEEDBACK_WEBHOOK` in Config.xcconfig (gitignored), injected via `$(DISCORD_FEEDBACK_WEBHOOK)` in Info.plist. `//` escaped as `/${}/` because xcconfig treats `//` as a comment delim. CI workflow updated to populate from GitHub secret. `[iOS]`
- [x] `Strings.Home.sendFeedback` + `Strings.Feedback.*` — centralized copy `[iOS]`
- [x] 9 new `FeedbackTests` — payload shape, empty-field stripping, email optionality, validation per category, whitespace handling, prefill seeding + non-overwrite. **32/32 passing** (was 23) `[iOS]`
- Commit: `5a5624a`.
- **Manual follow-up**: add `DISCORD_FEEDBACK_WEBHOOK` secret to GitHub repo settings (raw URL, no escaping needed — workflow handles that). If unset, CI still succeeds but the built app's submit throws `FeedbackError.webhookNotConfigured` with a "reach out via Discord" fallback message.

### BR-12: Empty-output hardening ✅ 2026-04-15
> User reproduced on TestFlight: tap Reset on Print Details (Goals) → tap Generate Profile → empty OutputView. Root cause: the two-tap Reset pattern called `appState.reset()` on BOTH taps across all 6 screens, silently clearing fields (printer/material/nozzle) not visible on the current screen. User taps Reset on Goals → printer/material cleared invisibly → taps Generate → OutputView loads with empty state → engine calls silently return empty (`try?` swallows throw) → blank output.
- [x] iOS: Defensive guard in `OutputViewModel.loadProfile` — fail fast to `invalidSelection` state when printer or material is empty `[iOS]`
- [x] iOS: New `invalidSelectionView` in OutputView — icon + message + "Back to start" CTA matching the HomeView engine-error pattern `[iOS]`
- [x] iOS: Fixed `OutputView.handleReset` — first tap only arms, second tap resets state + router together atomically `[iOS]`
- [x] iOS: Scoped tap-1 reset on **all 5 pre-Output screens** — each screen clears only its own fields on tap 1 (visible feedback preserved), full `appState.reset()` + `router.reset()` only on tap 2. Removes the cross-field silent-clear bug without regressing UX. `[iOS]`
  - BrandPicker tap 1 → `brand = "bambu_lab"`
  - PrinterPicker tap 1 → `printer = ""`
  - MaterialPicker tap 1 → `material = "", selectedId = nil`
  - NozzlePicker tap 1 → `nozzle = "std_0.4"`
  - GoalsView tap 1 → `resetGoals()` (new helper on AppState — clears all goal fields, leaves printer/material/nozzle)
- [x] iOS: `Strings.Output.invalidTitle/invalidMessage/invalidCta` added `[iOS]`
- [x] Tests: 5 new `OutputViewModelTests` — empty printer, empty material, both empty, valid state, valid-after-invalid reload. **23/23 passing** (was 18) `[iOS]`
- Commits: `a81281c` (guard + OutputView Reset), `57611d3` (arm-only on 5 screens — too aggressive, regressed visible feedback), `15c49da` (scoped per-screen tap 1 — final).
- Belt-and-suspenders: scoped reset eliminates the main path; guard catches anything else.

### BR-10: Cross-device UI review ✅ 2026-04-14
- [x] Added `3DPrintAssistantUITests` target + `ScreenCaptureUITests.swift` — programmatic screen capture across device sizes `[iOS]`
- [x] Captured 11 screens × 3 devices = 33 screenshots (iPhone SE 3rd gen / 17 Pro / 17 Pro Max) `[iOS]`
- [x] Code-review pass on all SwiftUI views for cross-device layout issues `[iOS]`
- [x] **Fix #1 P0** — `SlidingSegmentedControl` added `.lineLimit(1).minimumScaleFactor(0.7)` + `.padding(.horizontal, 2)`. Fixes "Standard"/"Maximum" wrapping on SE & 17 Pro `[iOS]`
- [x] **Fix #1 P0** — Same fix applied to `SliderTabBar` (filament + print profile tabs) `[iOS]`
- [x] **Fix #2 P0** — `OutputView` nav bar principal: added `.lineLimit(1).minimumScaleFactor()` to printer name + brand/slicer subtitle, capped `maxWidth: 220`. Fixes truncation on SE & 17 Pro `[iOS]`
- [x] **Fix #3 P1** — Filament "Setup" tab verified visible on SE (earlier concern was a contrast issue, not a layout bug) `[iOS]`
- [x] **Fix #4 P1** — `ChecklistSheet` refactored to `ZStack(alignment: .bottom)` — progress bar now sticky at bottom (was scrolling off on SE) `[iOS]`
- [x] Re-captured 33 screenshots post-fix — all 4 issues resolved on all 3 device sizes `[iOS]`
- [x] App Store screenshots in `docs/screenshots/` replaced with fresh Pro Max captures (1320×2868). Old Apr 8 set moved to `_backup-apr8/` `[iOS]`
- [x] 18/18 unit tests still passing — no regressions `[iOS]`
- Rollback tag: `pre-ui-review-2026-04-14` on both repos

### BR-9: UI polish pass ✅ 2026-04-09
- [x] iOS: `SlidingSegmentedControl` active state → green tint + border (was grey `surface2`) — affects all goal pickers + Simple/Advanced toggle `[iOS]`
- [x] iOS: "Goals" renamed to "Print Details" throughout (nav title, step label, back button) `[iOS]`
- [x] iOS: 2-click Reset button added to all 6 screens — tap 1: clears selections, tap 2 within 3s: back to HomeView `[iOS]`
- [x] iOS: "More brands" + "More options" buttons → `ColorTheme.info` (purple) — matches "Show all nozzles" + "Advanced options" `[iOS]`
- [x] iOS: Material picker redesigned — flat list, no difficulty groups; PLA Basic/Matte/Silk, PETG/HF, TPU95A shown by default; rest behind "+N more" `[iOS]`
- [x] iOS: Checklist button shows "Before you print" label on iPad/landscape (`horizontalSizeClass == .regular`) `[iOS]`
- [x] iOS: All expand/collapse buttons standardized — `HStack(spacing: 6)`, size 14 bold, left-aligned, no `Spacer()` `[iOS]`

---

## Phase 2.7b — Explanatory Descriptions ✅ 2026-04-09

**Goal:** Every setting, option, and category explains itself. 100% `why` coverage.

### Engine + Data — already complete (no changes needed)
- [x] All 47+ `resolveProfile()` params have filled `why` strings `[Web]`
- [x] All 16 filter groups have `desc` on every item in `getFilters()` `[Web]`
- [x] All 15 slicer tabs have `desc` in `SLICER_TABS` `[Web]`
- [x] All 18 materials return `notes` via `getFilamentProfile()` `[Web]`
- [x] `objective_profiles.json`, `environment.json` — all options have `desc` `[Web]`

### Web — deferred (engine data is there, web UI rendering not yet wired)
- [ ] Render filter option `desc` as subtitle under chips/options `[Web]`
- [ ] Add tab description text at top of each output tab `[Web]`

### iOS ✅ 2026-04-09
- [x] `PrintProfileTabView`: show `why` in Simple mode (removed `isAdvanced` gate) `[iOS]`
- [x] `ChipView`: added `subtitle` support; all chip groups in GoalsView wire `desc` `[iOS]`
- [x] Segmented controls in GoalsView: show selected option's `desc` below each control `[iOS]`
- [x] `EngineService`: fixed notes parsing from `[String]` array (was parsed as `String?`) `[iOS]`
- [x] `FilamentSettingsView`: Setup tab shows material tips with lightbulb icons `[iOS]`
- [x] `SlicerTab` model: added `desc` field, populated all 15 tabs from engine.js `[iOS]`
- [x] `PrintProfileTabView`: shows tab desc at top of each slicer tab `[iOS]`
- [x] `OutputView`: shows tab desc below both filament and print profile tab bars `[iOS]`
- [x] `Strings.swift`: added `FilamentTab.tips`, `TabDesc.filament` descriptions `[iOS]`

### 2.7b follow-up: Info toggle redesign + material descriptions ✅ 2026-04-09
- [x] Reverted chip subtitles — chips stay compact and uniform (subtitles caused uneven sizing) `[iOS]`
- [x] Added info toggle (ℹ️) on Print Details page — off by default for clean layout `[iOS]`
- [x] When toggle on: shows selected option description below every section (segmented controls + chip groups) `[iOS]`
- [x] Multi-select chip groups (useCase, special) join all selected descs with " · " `[iOS]`
- [x] Material picker: each filament row now shows short description beside temperature (18 materials covered) `[iOS]`
- [x] Material badges (Enclosure, Dry first) moved to own line for clarity `[iOS]`

---

## Phase 2.7a — Fix Bambu Studio Export

> Engine functions exist but Bambu Studio rejects the .json. Needs the #036 data architecture fix + field-by-field comparison with real BS exports.

### #036 — Profile Parameter Data Architecture + Value Correctness
- [ ] `objective_profiles.json`: add 5 new fields (seam_position, only_one_wall_top, ironing_type, ironing_pattern, internal_solid_infill_pattern) `[Web]`
- [ ] `engine.js` resolveProfile(): replace hardcoded strings with data reads + display lookup tables `[Web]`
- [ ] `engine.js` exportBambuStudioJSON(): fix zig-zag bug, add ironing_pattern, expand support_style (5 options) `[Web]`
- [ ] SLICER_TABS + SLICER_PARAM_LABELS: split ironing → ironing_type + ironing_pattern `[Web]`
- [ ] Import test: verify .json imports correctly in Bambu Studio `[Web]`
- [ ] Re-enable web export button `[Web]`
- [ ] Sync updated engine + data to iOS `[iOS]`

**Spec:** `docs/specs/IMPL-036-profile-params.md`
**Claude Code prompt:** `docs/prompts/phase-2.7a-export-prompt.md` (needs rewrite after #036)

---

## Post-release — Refactoring & polish

> From ChatGPT review items #16–21. Do after App Store launch.

### PR-1: Stronger typing for AppState
- [ ] Introduce enums for environment, support, colors, user level, slicer IDs `[iOS]`

### PR-2: View models for major screens
- [x] `OutputViewModel` extracted (done in BR-6b) `[iOS]`
- [ ] `GoalsViewModel`, picker view models `[iOS]`

### PR-3: Codable bridge decoding
> Was planned to be pulled into RB-4 but deferred — exception handling via `ExceptionStore` solved the silent-failure problem without requiring Codable. Revisit post-release.
- [ ] Replace manual JSON parsing with `Codable` decoding in EngineService `[iOS]`

### PR-4: Navigation architecture refinement
- [ ] Deeper route state, restoration support, coordinator pattern if needed `[iOS]`

### PR-5: Accessibility & visual polish
- [ ] Dynamic Type review, VoiceOver labels, contrast audit, tap targets `[iOS]`
- [ ] iPad layout optimization `[iOS]`
- [ ] Animation consistency pass `[iOS]`

### PR-6: Design system separation
- [ ] Split `SharedComponents.swift` into typography, feedback, settings, utility `[iOS]`

### PR-7: UI prototype items (from old TASKS.md)
- [ ] Advanced rows stagger reveal — cascade fade-in on mode switch `[iOS]`
- [ ] Consistent pill animation on native segmented controls `[iOS]`

### PR-8: Retire iOS Beta signup card (web)
- [ ] Web: remove iOS Beta card + `viewBeta` in `index.html` — app is live, signup form is deprecated `[Web]`
- [ ] Web: remove remaining Tally embed reference (q4Wgvd form) and any leftover beta-related locale strings `[Web]`
- [ ] Web: remove `navBeta` and `setView('beta')` from `app.js` if no longer needed `[Web]`

---

## Legacy backlog ID index (`#001–#036`)

Preserved for traceability of historical references. The pre-ROADMAP `BACKLOG.md` (last real content: web commit `103ab84`, 2026-04-03, 309 lines) is archived at [`_archive/3dprintassistant-BACKLOG-legacy-2026-04-03.md`](../../../_archive/3dprintassistant-BACKLOG-legacy-2026-04-03.md). Every ID is either shipped, active in this ROADMAP, or explicitly dropped.

**Shipped (see Completed phases for phase-level context):**
| # | What | Shipped |
|---|---|---|
| #002 | Match Bambu Studio process-tab structure | 2026-04-02 |
| #008 | Expanded warning explanations (now structured `{id, text, detail, fix}` — shipped as RB-1) | 2026-04-08 |
| #009 | Orca slicer layout support | 2026-04-03 |
| #013 | Pre-print checklist panel | 2026-04-03 |
| #014 | Mobile layout improvements | 2026-04-03 |
| #023 | Analytics — Cloudflare Web Analytics | 2026-04-01 |
| #024 | SEO optimization | 2026-04-01 |
| #025 | Roadmap modal in footer | 2026-04-01 |
| #027 | Slicer-aware tab structure (Bambu + Prusa) | 2026-04-02 |
| #028 | TPU 85A / 90A print + support guidance | 2026-04-02 |
| #030 | i18n locale extraction to `locales/*.json` | 2026-04-03 |
| #031 | JSON schema validation script | 2026-04-03 |
| #017 | Profile export to Bambu Studio `.json` — tracked under **Phase 2.7a** above (engine done; UI hidden pending BS import fix). |

**Active in this ROADMAP:** `#001, #005, #006, #010, #011, #012, #015, #016, #018, #019, #020, #022, #026, #029, #032, #033, #034, #035, #036, #037, #038, #039` — see "Future features — Backlog" + "Post-release — Refactoring & polish" sections below.

**Dropped / superseded:**
- `#003` Copy individual setting value — superseded by full profile share/export flow.
- `#004` Copy all settings as formatted text — superseded by `formatProfileAsText` + iOS share sheet.
- `#007` Auto dark mode — superseded by the existing web theme toggle (`☀`) + the iOS v1.1 light-mode backlog item below.
- `#021` HTML print sheet — superseded by `formatProfileAsText` + share/export flow on both platforms.

---

## Future features — Backlog

> Not scheduled. Pick from here when the release is done and the iOS app is stable.

### High value
| # | Feature | Scope | Notes |
|---|---------|-------|-------|
| **v1.1 candidate** | Light mode / system appearance support (iOS — close the gap with web) | Large (~half day to full day) | **Web already has both** (`html[data-theme="light"]` since initial release + `☀` toggle in header). iOS is dark-only because `ColorTheme.swift` was hardcoded dark during MVP. Spec: (1) add `light` variants for all 10–15 `ColorTheme` tokens, (2) switch hardcoded `Color(hex:)` to environment-aware (`Color(light:dark:)` or asset catalog), (3) remove the 4 `.preferredColorScheme(.dark)` calls (ContentView, WarningsSheet, ChecklistSheet, FeedbackView), (4) sweep all screens for contrast + readability in light, (5) decide UX — system-follow (default) vs explicit toggle (would need a Settings screen). Test on iPhone + iPad in dynamic switching. |
| ~~#039~~ | ~~Printer-capability clamping + slicer-aware values~~ | **✅ Shipped 2026-04-20** — web `2852cc2` (live on 3dprintassistant.com), iOS `851143f` + version bump `433411f` (v1.0.1 pre-release train on TestFlight). Full details in Completed phases. |
|---|---------|-------|-------|
| #001 | AMS Purge Volume Calculator | Medium | Previously shipped on web, needs restore |
| #026 | Smart Simple/Advanced Configurator Mode | Medium | Input-side simple/advanced split |
| #006 | Parameter Tooltip / Info Panel | Medium | `param-info.json` with increase/decrease effects |
| #005 | Shareable Profile URL | Small | Encode state as URL params |

### Medium value
| # | Feature | Scope | Notes |
|---|---------|-------|-------|
| #010 | More Printer Support | Medium | A1 Combo, MK4, XL, Voron, K1 Max |
| #011 | More Material Support | Medium | PLA+, Sparkle, PA12-CF, PPA-CF, ABS-GF |
| #012 | Saved Presets (localStorage) | Medium | Name + save filter state |
| #019 | Multi-Language Expansion | Medium | DE, NL, SV |
| #029 | Source Attribution for Recommendations | Medium | Brand/community/calculated badges |
| #037 | macOS App (WKWebView wrapper) | Medium | **Decided 2026-04-17: Path 3 — SwiftUI + WKWebView loading bundled offline assets via `loadFileURL`.** Same pattern as iOS, simpler (no JSCore bridge). Matches "free, offline, no tracking" product ethos. ~100 lines of Swift. DMG or Mac App Store. New folder: `3dprintassistant-macos/`. **Required mitigations** (don't skip): (1) `sync-web-assets.sh` script or Xcode Build Phase copies `index.html`, `app.js`, `engine.js`, `style.css`, `feedback-form.js`, `data/`, `locales/` from web repo into `Resources/web/` at build time — zero manual sync load; (2) feature-detect `location.protocol === 'file:'` in `feedback-form.js` and submit to absolute `https://3dprintassistant.com/api/feedback` when running from bundle, so Discord feedback works offline-by-default-URL, online-only-when-submitting; (3) document the data-sync rule alongside the iOS one (CLAUDE.md). Rejected: Path 2 (live URL — breaks offline, weaker App Store story); Path 2.5 (hybrid bundle+fetch — marginal benefit for extra plumbing). Kickoff prompt: `docs/prompts/macos-app-kickoff.md`. |

### Larger vision
| # | Feature | Scope | Notes |
|---|---------|-------|-------|
| #016 | Troubleshooter Expansion (20+ symptoms) | Large | Expand from 8 to 20+ |
| #018 | Print Time Estimator Improvements | Large | Accel modeling, preset comparison |
| #020 | Filament Database / Brand Profiles | Large | Brand-specific temp/speed overrides |
| #015 | Community-Contributed Profiles | Large | GitHub PR-based community profiles |
| #022 | User Profiles & Community Layer | Large | Accounts, sync, sharing |
| #038 | Windows App | Large | Cross-platform wrapper via Tauri (preferred over Electron — ~10MB vs ~200MB, native-feel, Rust-backed, uses OS webview). Only pursue after macOS port (#037) validates desktop demand. Deferred to post-v1.2. |

### Technical debt
| # | Feature | Scope | Notes |
|---|---------|-------|-------|
| #032 | JSDoc Typedefs for Engine | Small | Zero runtime cost, VS Code autocomplete |
| #033 | Engine Modularization (ES Modules) | Medium | Only if engine keeps growing |
| #034 | app.js Render/Event Refactor | Large | Deferred — high risk, low near-term reward |
| #035 | CI Pipeline (web) | Small | ESLint + data validation. When 2nd contributor joins |

---

## Completed phases

| Phase | What | When |
|-------|------|------|
| Phase 0 | Foundation — Xcode, engine bridge, models, tests | 2026-04-03 |
| Phase 1a | Data layer + engine extensions | 2026-04-03 |
| Phase 1b | All UI screens | 2026-04-03 |
| Phase 1 wrap | Merged to main | 2026-04-03 |
| Phase 2 | Output enrichment — warnings, checklist, simple/advanced, filament info | 2026-04-03 |
| Phase 3 SoT | Source-of-truth fixes — dynamic options, label/casing fixes | 2026-04-03 |
| Phase 2.5 | 18 materials, 10 engine improvements, speed-temp coupling | 2026-04-04 |
| Phase 2.5b | 5 nozzles, 6 advanced filters, 7 engine logic, simple/advanced input | 2026-04-05 |
| Phase 2.7a | Export functions (engine + iOS + web) — web UI disabled pending BS fix | 2026-04-05 |
| Phase 1 release blockers (RB-1–6) | Structured warnings, actor bridge, Sentry DSN, error handling, 18 tests, OutputView split | 2026-04-08 |
| Pre-release polish (BR-1–7) | Strings, export filenames, dark mode, retry UX, AppConstants, OutputView split, privacy | 2026-04-08 |
| App Store prep | CI fixed (SENTRY_DSN secret), export UI hidden, 9 screenshots taken, metadata finalized, /support + /privacy pages live | 2026-04-08 |
| CI cleanup | macos-26 runner, checkout@v5, Config.xcconfig.template, Xcode Cloud deleted | 2026-04-10 |
| Web bug fixes | Printer picker stays collapsed on mode switch | 2026-04-08 |
| Infra | App icon, auto build number, TestFlight, CI/CD, Sentry, Discord, GitHub Issues | 2026-04-04 |
| Web | iOS Beta signup wording updated, about/SEO updates | 2026-04-04–08 |
| Branding | App icon (clay Benchy), logo on web header + iOS home + all nav bars, website link on iOS home, OutputView nav bar cleanup | 2026-04-13 |
| BR-10 Cross-device UI review | UITest target + 33 screenshots across SE/17 Pro/17 Pro Max, 4 P0/P1 fixes (segmented control wrap, nav bar truncation, sticky checklist footer), App Store screenshots retaken. iOS commit `cbf0947`, web commit `bccfca4` | 2026-04-14 |
| BR-11 Feedback system | Native SwiftUI feedback sheet → Discord webhook (#3dpa-ios-feedback). 7 categories, 8 entry points, auto-attached device metadata, 9 new tests. iOS commits `5a5624a` → `ddb1416` (incl. SF symbol picker fix, alert visibility fix). Manual: `DISCORD_FEEDBACK_WEBHOOK` added to GitHub secrets | 2026-04-15 |
| BR-12 Empty-output hardening | OutputViewModel guard + scoped per-screen tap-1 reset. Final iteration after 2 over-corrections. iOS commits `a81281c` → `15c49da`. 5 new tests | 2026-04-15 |
| Pre-submission polish | Print Profile tab description double-render fix (`1a96f83`); BrandPicker default un-preselected (`f87b095`); Printer/Nozzle picker tap-1 now clears local `selectedId` checkmark (`f87b095`) | 2026-04-15 |
| App Store screenshots refresh | Recaptured on iPhone 17 Pro Max (1320×2868) post-BR-11 to show new feedback UI. Old set in `_backup-apr14/`. Web commit `02edd2f` | 2026-04-15 |
| App Store Connect submission setup | App Information + categories + age 4+ + content rights + pricing (Free, all 175 countries) + privacy nutrition (Diagnostics only) + v1.0 metadata + 9 iPhone 6.9" screenshots uploaded + build `202604151712` attached. Pending: iPad screenshots from real device + Add for Review | 2026-04-15 |
| 🚀 **App Store submission** | Build `f87b095` attached, fresh iPhone + iPad screenshots uploaded, App Review Information + Notes filled, Manual release selected, **submitted to App Review**. Status: "Waiting for Review". 13 days ahead of April 28 deadline | 2026-04-15 |
| ✅ **App Store APPROVED + released** | App approved same-day after ~24h review. Hit Release. Live in ~121 non-EU countries. EU blocked by DSA Trader Status — submitted as Business (CVR) same day. Generic link: `apps.apple.com/app/3d-print-assistant/id6761634761` | 2026-04-16 |
| **Discord server restructure** | Added `#announcements` (read-only), private `📥 owner inbox` category with `#ios-app-feedback` (renamed from `#3dpa-ios-feedback`) + new `#web-app-feedback`. iOS feedback webhook URL preserved through rename (Discord webhooks are channel-id-bound). Channel descriptions written for all 11 channels. Beta category deleted post-release. | 2026-04-16 |
| **Web feedback Tally→Discord migration** | Replaced Tally (obdMK1 form) with native `<dialog>` modal + Cloudflare Worker at `/api/feedback` forwarding to Discord `#web-app-feedback`. Mirrors iOS 7-category taxonomy + embed shape exactly. Secret `DISCORD_WEBHOOK_URL` stored in Cloudflare Pages env vars (not in bundle). Required adding `wrangler.toml` + `worker.js` because project had been migrated to Workers Builds (static-assets-only → assets+worker). 3 commits: `331124b` (dormant stack), `36f9131` (Worker entrypoint), `3856440` (card swap). Verified end-to-end via curl. iOS Beta signup Tally form left intact (deprecated — app is live, card to be retired). | 2026-04-17 |
| **Web warnings bugfix — RB-1 engine completion** | Production rendered "undefined" for every warning card. Root cause: `app.js` `renderWarnings()` was updated during RB-1 to expect structured objects `{ id, text, detail, fix }`, but the matching `engine.js` conversion (114-line diff, all 33 `warnings.push(...)` sites wrapped in the `w(id, text, detail, fix)` helper) was only saved locally and never committed — so live `engine.js` kept returning HTML strings. Committed the pre-existing uncommitted diff. `82e10ac`. Verified: zero remaining old-shape string pushes on production. | 2026-04-19 |
| **Draft layer height 0.30 → 0.28** | Bambu Studio rejected imported profiles on 0.4mm nozzle ("Layer height exceeds limit"). Bambu's printer-level max for 0.4mm = 0.28mm, not 0.30mm (confirmed in vendor preset JSONs: `max_layer_height: ["0.28"]`). Changed Draft `layer_height` in `objective_profiles.json` from 0.30 → 0.28, tightened C3 warning threshold 75% → 70% (with floating-point epsilon so `0.4*0.70` doesn't trip on its own output), updated troubleshooter fix text. Verified across 0.2/0.4/0.6/0.8mm nozzle cases — warning fires only when it should. Surfaced a broader gap: engine emits lots of hardcoded values that don't check against each printer's real preset limits — filed as backlog #039 (printer-capability clamping). | 2026-04-19 |
| **IMPL-039 shipped — printer-capability clamping + slicer-aware values** | Full engine refactor per [IMPL-039 spec](../specs/IMPL-039-preset-clamping.md), executed overnight with user sign-off to push both platforms. **New engine helpers:** `getPrinterLimits(printer, nozzle)` (formula-based, `printer.limits_override` escape hatch), `_clampNum(value, min, max)`, `mapForSlicer(value, field, slicer)` + `patternFor()` wrapper. **New data file:** `data/rules/slicer_capabilities.json` — per-slicer valid sets for patterns/generators + explicit cross-slicer fallback map. **Fixes:** H1 `support_interface_pattern` now emits `rectilinear_interlaced` (matches Bambu vendor preset format exactly); H2 `initial_layer_height` now scales with nozzle (`max(0.12, min(nozzle × 0.5, 0.32))`) then clamped against printer max; C3 "layer height too tall" warning replaced by C5 clamp notice (more accurate — tells user the clamp already happened rather than asking them to re-select). **Retraction system upgrade:** nozzle-scaled via `sqrt(nozzleSize/0.4)`, bowden multiplier auto-detected from `printer.extruder_type` (MINI+ etc. now auto-get 2.0mm retraction without user toggle), clamped to `material.retraction_max`. **Bambu export parity:** verified byte-matching vendor preset format for 7 key fields (`layer_height`, `sparse_infill_pattern`, `internal_solid_infill_pattern`, `support_interface_pattern`, `seam_position`, `top_surface_pattern`, `wall_generator`). **Slicer-aware warnings:** new `pattern_substituted_*` warnings tell Prusa users when "Cross Hatch" → "Rectilinear" substitution fired. **iOS sync:** `engine.js` byte-identical; `slicer_capabilities.json` added to `Data/rules/`; `EngineService.buildFetchData()` registers it; `project.yml` + regenerated `pbxproj` via `xcodegen`. Build verified, 32/32 iOS tests pass. Session log: [`docs/sessions/2026-04-20-cowork-appdev-impl039.md`](../sessions/2026-04-20-cowork-appdev-impl039.md). | 2026-04-20 |
| **3rd-party code + data review dispatched** | Prepared a self-contained starter kit for an outside engineer to audit the project: `docs/3rd-party-review/` with 6 docs — README (entry point), REVIEW-BRIEF (scope + focus areas + severity classification + non-goals), ARCHITECTURE-OVERVIEW (both codebases consolidated), SETUP (how to run web + iOS locally, byte-identity check for shared engine + data), DELIVERABLE-TEMPLATE (expected output format, finding shape, invariant checklist), REFERENCE-INDEX (pointers into ROADMAP + specs + session logs). Reviewed revisions: web `c4c5071`, iOS `24aef66`. Reviewer is asked to pay particular attention to IMPL-039 (printer-capability clamping) and IMPL-040 (chip desc / emission single-source-of-truth) since those are the most recent architecture changes and set the pattern for all future similar work. Fresh-session kickoff prompt for post-review triage lives at `docs/prompts/fresh-session-kickoff-post-review.md`. | 2026-04-20 |
| **IMPL-040 shipped — chip desc / resolveProfile single source of truth** | Spec: [IMPL-040](../specs/IMPL-040-chip-desc-parity.md). Follow-up after IMPL-039 when the user noticed surface-quality chips still displayed hardcoded `0.28mm layers` even when the emitted layer height would be clamped lower on small nozzles (e.g. 0.2mm). **Principle:** any number in UI that depends on state must be computed by the same function that emits it to the profile. Never store state-dependent numbers in static text. **Executed:** stripped all numeric prefixes from surface + strength descs in `objective_profiles.json` (qualitative only); extended `Engine.getFilters(state?)` to accept state and generate numeric prefixes from the same clamping / data sources that `resolveProfile` uses; unified support Z-gap into a module-scoped `_SUPPORT_GEOMETRY` map shared by both the chip desc and the emission path; wired `app.js` to pass state into `getFilters` and added `updateDynamicChipDescs()` that patches chip desc text on render (preserves selection + focus); wired iOS `GoalsView` to pass `appState.toJSDictionary()` and refresh on `.onChange(appState.nozzle/printer)`. **Guards:** one-shot preview-eval matrix of 118 combos (90 surface + 16 strength + 12 support) — 0 mismatches. Two new `EngineServiceTests` XCTests run on every iOS CI build: `testSurfaceChipDescsMatchResolveProfileEmission` (42 assertions) + `testSupportChipDescsMatchResolveProfileEmission` (3 assertions). **20/20 tests pass.** Session log: [`docs/sessions/2026-04-20-cowork-appdev-impl040.md`](../sessions/2026-04-20-cowork-appdev-impl040.md). | 2026-04-20 |

---

## Architecture reference

### Stack
| Layer | Choice |
|-------|--------|
| UI | SwiftUI (iOS 17+) |
| Engine | JavaScriptCore + engine.js |
| Data | Bundled JSON (offline-first) |
| State | `@Observable` / `@State` |
| Navigation | NavigationStack |
| i18n | `.strings` (from `locales/en.json` + `da.json`) |
| Git | `mustiodk/3dprintassistant` (web), `mustiodk/3dprintassistant-ios` (iOS) |

### Data sync
| File | Rule |
|------|------|
| `engine.js` | Edit in web project → copy to iOS |
| `data/*.json` | Edit in web project → copy to iOS |
| `locales/*.json` | Edit in web project → convert to `.strings` for iOS |

**Rule:** Never edit engine.js or data/*.json in the iOS project.

### Key context for Claude Code sessions
- Module name: `PrintAssistant` (not `3DPrintAssistant`)
- `resolveProfile()` returns slicer params — NOT temperatures. Temps from `getAdjustedTemps()`.
- Valid environment values: `"normal"`, `"cold"`, `"vcold"`, `"humid"`
- Valid surface values: `"draft"`, `"standard"`, `"fine"`, `"maximum"`, `"very_fine"`, `"ultra"`
- Valid speed values: `"fast"`, `"balanced"`, `"quality"`
- Valid strength values: `"minimal"`, `"standard"`, `"strong"`, `"maximum"`
- XcodeGen: run `xcodegen generate` after changing project.yml
- CI: push to main → GitHub Actions → Fastlane → TestFlight
- 18/18 tests passing

---

## Research & prompts index

All docs live in `3dprintassistant/docs/`. Subfolders: `research/`, `prompts/`, `specs/`, `planning/`.

| File | What | Location |
|------|------|----------|
| Bambu Studio export spec (Gemini analysis) | Primary BS JSON reference | `docs/research/bambu-studio-export-spec-gemini.md` |
| Bambu Studio JSON schema | Field reference from GitHub source | `docs/research/bambu-studio-json-schema.md` |
| Gemini analysis prompt | Prompt used to analyze BS exports | `docs/research/gemini-bambu-analysis-prompt.md` |
| ChatGPT code/release review | 21-item iOS review | `docs/research/3dprintassistant_ios_master_release_review.md` |
| UI critique | Design review findings | `docs/research/UI-CRITIQUE.md` |
| #036 implementation spec | Data architecture + value correctness | `docs/specs/IMPL-036-profile-params.md` |
| UI v2 spec | Prototype v2 design spec | `docs/specs/UI-V2-SPEC.md` |
| Phase 2.7a export prompt | Claude Code prompt (needs rewrite) | `docs/prompts/phase-2.7a-export-prompt.md` |
| Phase 2.7b descriptions prompt | Claude Code prompt (ready) | `docs/prompts/phase-2.7b-descriptions-prompt.md` |
| Phase 2.5b prompt | Claude Code prompt (completed) | `docs/prompts/phase-2.5b-code-prompt.md` |
