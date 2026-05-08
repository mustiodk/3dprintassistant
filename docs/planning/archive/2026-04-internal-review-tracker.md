# Internal review follow-up tracker (IR-* cycle)

> Historical archive extracted from `docs/planning/ROADMAP.md` during the 2026-05 ROADMAP slimming pass.
> Live planning now lives in [`../ROADMAP.md`](../ROADMAP.md); this file preserves completed detail and historical lookup context for the IR-* cycle.
>
> Canonical finding text continues to live in [`../../reviews/2026-04-20-internal/`](../../reviews/2026-04-20-internal/) — this archive is the action / status tracker, not the finding source.

## Scope

Internal review via `/code-reviewer` completed 2026-04-20 against web `c4c5071`, iOS `24aef66`. Deliverable at [`../../reviews/2026-04-20-internal/`](../../reviews/2026-04-20-internal/) (9 files). Phase 1 domain walkthrough (10 real combos through the live engine) ran 2026-04-20; harness at [`../../../scripts/walkthrough-harness.js`](../../../scripts/walkthrough-harness.js), raw output at [`../../reviews/2026-04-20-internal/domain-walkthrough.md`](../../reviews/2026-04-20-internal/domain-walkthrough.md).

**Export-path work was dropped from IR scope** per owner decision — export UI was disabled at the time; revisit before re-enabling. Findings tagged with `(export)` were deferred (see IR-deferred section below).

**Convention:** one finding = one commit per platform. Don't batch.

---

## IR-0 — Ship this week (ship-blockers + free wins)

**Target at the time:** 1–2 half-days of focused work.

### Correctness / domain (all surfaced by Phase 1 walkthrough)

- [x] **[CRITICAL-002]** Clamp `initial_layer_bed_temp` + `other_layers_bed_temp` to `min(material.bed_temp_max, printer.max_bed_temp)`. Structured `printer_max_bed_temp_clamped` warning + hard-incompat `printer_bed_temp_incompatible`. Combos 6 + 10 flipped ❌→✓ on walkthrough harness. New XCTest. **Shipped 2026-04-21.** `[Web+iOS]`
- [x] **[CRITICAL-003]** Validate `state.surface` / `state.strength` / `state.speed` against valid preset IDs in `resolveProfile`. Unknown → coerce + warn `invalid_preset`. Mirrored across `resolveProfile` + `getWarnings`. New XCTest `testInvalidPresetCoercedAndWarned`. **Shipped 2026-04-22** (web `6173839`, iOS `2cbf5c7`). `[Web+iOS]`
- [x] **[HIGH-012]** Fix "A1/A1 Mini have a 10,000 mm/s² acceleration limit…" why-text on `outer_wall_speed`. Template against `printer.name` + `printer.max_acceleration`. New XCTest. **Shipped 2026-04-22** (web `5797738`, iOS `6e9d2be`). Two more A1-hardcoded strings filed as IR-5 follow-ups (HIGH-012-followup A+B). `[Web+iOS]`
- [x] **[HIGH-014]** A1 mini `max_bed_temp` 100 → 80 per Bambu spec. **Shipped 2026-04-23 in IR-2a** (web `af3b24d`, iOS `cfe8a6c`). Original IR-0 line never ticked. `[You]`

### Security / infra (deferred to v1.0.2 — see IR-2a)

- [x] **[CRITICAL-001]** Route iOS feedback through `/api/feedback` Cloudflare Worker. Deferred from IR-0; **shipped 2026-04-23 in IR-2a** as the headline of v1.0.2 (web `76b8bfa`, iOS `af3b7b7`). `[iOS+Worker]`
- [x] **[LOW-001]** Rotate Sentry DSN. New DSN live in local `Config.xcconfig` + `SENTRY_DSN` GitHub secret; old DSN disabled on Sentry. **Shipped 2026-04-22.** `[iOS]`
- [x] **[HIGH-010]** Add IP-bucket rate limit + sanitisation to `/api/feedback`. **Shipped 2026-04-23 in IR-2a** — Part A sanitisation (web `76b8bfa`); Part B rate-limit rule deployed via Cloudflare dashboard (verified via 15-request curl flood). Original IR-0 line never ticked. `[Worker]`

### Data hygiene

- [x] **[MEDIUM-015]** Add `"lightning"` to `prusaslicer.sparse_infill_patterns`; remove the `lightning → rectilinear` Prusa fallback. **Shipped 2026-04-22** (web `e58d0ed`, iOS `aca26f1`). `[Web+iOS]`
- [x] **[MEDIUM-016]** Add `"adaptivecubic"` to Bambu + Orca `sparse_infill_patterns`. **Shipped 2026-04-22** (web `2ddff99`, iOS `34fba25`). Latent-gap fix. `[Web+iOS]`
- [x] **[LOW-002]** Rewrite HIPS `enclosure_behavior.reason` (was ABS copy-paste). **Shipped 2026-04-23 in IR-2a** (web `822a2d0`, iOS `1d58991`). Original IR-0 line never ticked. `[You]` for text, `[Code]` to apply.

### Test quality

- [x] **[HIGH-002]** Tighten IMPL-040 surface-parity test: `expectedCount = 7×6 = 42`, replace silent `continue`s with `XCTFail`. **Shipped 2026-04-22** (iOS `cb0b73d`). `[iOS]`
- [x] Run XCTest suite locally; record baseline runtime. Recorded 2026-04-22: 0.62s for 37 tests; 2m06s wall time including simulator scaffolding. `[iOS]`

---

## IR-1 — Data suggestion logic verification ✅ 2026-04-20

- [x] Harness built at [`../../../scripts/walkthrough-harness.js`](../../../scripts/walkthrough-harness.js) — reusable, Node-based, loads `engine.js` via `vm` with `fetch` + `localStorage` polyfills.
- [x] 10 representative combos run; raw output at [`../../reviews/2026-04-20-internal/domain-walkthrough.md`](../../reviews/2026-04-20-internal/domain-walkthrough.md); analysis integrated into [`01-critical.md`](../../reviews/2026-04-20-internal/01-critical.md) + [`02-high.md`](../../reviews/2026-04-20-internal/02-high.md).
- [x] Surfaced 5 new findings: CRITICAL-002, CRITICAL-003, HIGH-012, HIGH-013, HIGH-014.
- [x] Confirmed positives: IMPL-040 chip-desc parity holds on all combos; abrasive/flex/enclosure warnings fire correctly; layer-height + speed clamping narrates correctly; checklists are material-aware.

**Second-pass coverage** (open — when needed, add combos to `COMBOS[]` and re-run): environment presets, non-`none` support presets, multi-color / AMS combos, `calcPrintTime` accuracy, `calcPurgeVolumes`, `getTroubleshootingTips` output. → **Tracked in slim ROADMAP** under Deferred / Parked Work.

---

## IR-2 — Engine correctness hardening ✅ 2026-04-23

All IR-2 items shipped via IR-2a + the 2026-04-23 cleanup sweep.

- [x] **[HIGH-008]** Extend C6 warning loop to cover every `patternFor` field (top/bottom/internal/seam). **Shipped IR-2a 2026-04-23** (web `4f35b3b`, iOS `e7ef228`). Surfaced one real silent substitution: Prusa fine-quality `"Monotonic line"` → `"monotonic"`.
- [x] **[HIGH-009]** `_clampNum` non-finite fallback returns a finite bound. **Shipped IR-2a** (web `62d7ae9`, iOS `250f187`).
- [x] **[MEDIUM-001]** Numeric-compare `limits_override.nozzles` keys. **Shipped IR-2a** (web `d211d89`, iOS `677e623`).
- [x] **[MEDIUM-002]** `resolveProfile` `!nozzle` early-return guard. **Shipped IR-2a** (web `c2479db`, iOS `9fe5127`).
- [x] **[MEDIUM-007]** Init-time `printer.series` enum validation. **Shipped IR-2a** (web `1b0c4aa`, iOS `6296ec4`); subsumed by R8 `_validateSchema` later.
- [~] **[MEDIUM-018]** Part A (orphan refs) shipped IR-2a. **Part B (ID-vs-group convention) remains an owner decision.** → **Tracked in slim ROADMAP** under Active Work Queue (owner decision).

---

## IR-2a — iOS v1.0.2 ship pass ✅ RELEASED 2026-04-24

**Goal:** ship iOS v1.0.2 with CRITICAL-001 (feedback privacy via Worker) as the headline + a bundle of engine-correctness fixes that landed since v1.0.1.

### Headline feature

- [x] **[CRITICAL-001]** Worker `/api/feedback` route + HMAC. Shipped 2026-04-23. Worker `76b8bfa` (web) accepts `X-App-Source: ios` + HMAC-SHA256 over `${timestamp}\n${rawBody}`; ±5 min replay window. iOS `af3b7b7` POSTs with `FEEDBACK_HMAC_SECRET` from `Config.xcconfig`; falls back to direct-Discord when secret empty (local dev). `[iOS+Worker]`
- [x] **[HIGH-010]** IP rate limit + sanitisation. Part A shipped 2026-04-23 (web `76b8bfa`) — sanitises `@everyone`/`@here`/role+user mention tags/markdown link syntax. Part B (Cloudflare native rate-limit rule) deployed via dashboard 2026-04-23 — `feedback-per-ip` rule, free plan: 2 req / 10 sec per IP, Block 10s. Verified via 15-request curl flood. `[Worker]`

### Engine correctness (silent-fail fixes)

- [x] **[HIGH-008]** Pattern-substitution warnings on every `patternFor` field. Web `4f35b3b`, iOS `e7ef228`.
- [x] **[HIGH-009]** `_clampNum` finite fallback. Web `62d7ae9`, iOS `250f187`.
- [x] **[MEDIUM-001]** Numeric `limits_override.nozzles` keys. Web `d211d89`, iOS `677e623`.
- [x] **[MEDIUM-002]** `!nozzle` early-return. Web `c2479db`, iOS `9fe5127`.
- [x] **[MEDIUM-007]** `printer.series` enum validation. Web `1b0c4aa`, iOS `6296ec4`. (Subsumed by R8 `_validateSchema`.)

### iOS reliability (bridge error path)

- [x] **[HIGH-004]** Re-read `_engineError` in post-loop block. iOS `83edae6`.
- [x] **[HIGH-005]** Structured `{set, value}` sentinel replaces null string-compare. iOS `d2957da`.

### Data hygiene (Phase 0 closed 2026-04-23)

- [x] **[HIGH-014]** A1 Mini `max_bed_temp` 100 → 80. Web `af3b24d`, iOS `cfe8a6c`. CRITICAL-002 bed-clamp warning now fires correctly on A1 Mini + PETG.
- [x] **[LOW-002]** HIPS `enclosure_behavior.reason` rewritten. Web `822a2d0`, iOS `1d58991`.
- [x] **[MEDIUM-018]** Part A — `nozzles.json.not_suitable_for` + `suitable_for` normalised to material IDs. Web `597499b`, iOS `5a360dc`. Part B (large hardened nozzles list pa/pc/pet_cf explicitly): web `bc76345`, iOS `f27591e`.

### Infrastructure activation (Phase 0 closed 2026-04-23)

- [x] HMAC secret deployed to 3 places — local `Config.xcconfig`, GitHub repo secret `FEEDBACK_HMAC_SECRET`, Cloudflare Worker env (Secret type). Round-trip verified: signed curl POST → 200 OK; negative tests (no sig / bad sig / skew) all return 401.
- [x] **[HIGH-010 part B]** Cloudflare rate-limit rule `feedback-per-ip` deployed.

### IR-5 follow-ups that landed in this phase

- [x] **[HIGH-012-followup A]** `outer_wall_acceleration.why` printer-name template. Web `e1ca1a0`, iOS `543a51c`.
- [x] **[HIGH-012-followup B]** `slow_down_tall.why` printer-name template. Web `4efc122`, iOS `cf98878`.

### Release mechanics (owner execution — all done 2026-04-23)

- [x] Bump `MARKETING_VERSION` to `1.0.2` in `project.yml` + xcodegen. iOS `11b9c8d`.
- [x] **Mid-session scope add:** Home-screen version-display footer. iOS `15c1002`. 40/40 XCTest.
- [x] TestFlight build dispatched via `gh workflow run testflight.yml --ref main` (run [24848532846](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/24848532846), SUCCESS).
- [x] "What's New" tone-pass (final casual English) at [`../../app-store-whats-new-v1.0.2.md`](../../app-store-whats-new-v1.0.2.md).
- [x] On-device smoke tests 4a–4e all green.
- [x] Old `#ios-app-feedback` webhook deleted (attack surface from v1.0.0/v1.0.1 binaries closed).
- [x] Submitted to App Review with **Manual release toggle** + Promotional Text "Generate optimized 3D print profiles for 64 printers across 12 brands. Bambu, Prusa, Creality, and more." Screenshots reused from v1.0.0.

### Release (owner, post-approval)

- [x] **2026-04-24 — Apple approved + owner manually released v1.0.2** to the same ~121 non-EU countries as v1.0.0. EU still blocked at the time by DSA Trader Status. `[You]`
- [x] **Day-1 monitoring** of v1.0.2 release. No incidents reported in subsequent session logs; assumed silently complete given 2-week post-release window with no escalation. (Original line was open in IR-2a; retired during 2026-05 ROADMAP slim per MF-2 sign-off.)

### Acceptance (met)

- iOS v1.0.2 live in Apple's "Ready for Sale" state.
- Old Discord webhook URL rotated; iOS binary no longer contains it.
- Rate limit live; curl-flood test confirms 429 at threshold.
- Full iOS XCTest suite green + 3 new regression tests.

### Bundled into v1.0.2 on 2026-04-23 (revised scope — owner chose to fold IR-4 + IR-5 remainder into this release)

- `[HIGH-003]` actor → final class refactor (IR-4)
- `[HIGH-006]` bridge SLICER_TABS / SLICER_PARAM_LABELS (IR-4)
- `[HIGH-007]` bridge getNozzleSize (IR-4)
- `[HIGH-011]` structured numeric per chip (IR-4)
- `[MEDIUM-009]` Codable decode for `resolveProfile` output (IR-5)
- `[MEDIUM-020]` bridge getFilamentTabs (IR-4)
- `[MEDIUM-021]` bridge getSlicerDisplayName (IR-4)
- `[LOW-003]` consolidate `retraction_length` vs `retraction_distance` (IR-5; unblocks export re-enable)
- `[LOW-004]` TPU drying alignment (IR-5)
- `[LOW-006]` flexible dedup (IR-5)

### Out of scope for v1.0.2

- `[LOW-005]` `prc_0.2` — product-taste decision; filed as IR-5 follow-up. → **Tracked in slim ROADMAP.**
- `[LOW-007]` Bambu preset version hoist — export-deferred. → **Tracked in slim ROADMAP.**
- Light mode — v1.1 candidate. → **Tracked in slim ROADMAP backlog.**
- IR-deferred export-path items — see section below. → **Tracked in slim ROADMAP.**

---

## IR-3 — Failure-mode rehearsal (live-product readiness) — DEFERRED

**Target:** 1 session. "What happens when this breaks" work. **Owner-deferred; tracked live in slim ROADMAP under Deferred / Parked Work.**

- [ ] Force `engine.init()` to throw on iOS (corrupt or remove a bundled data file locally). Verify error UI + Sentry event. `[iOS]`
- [ ] Force `/api/feedback` 500. Verify web modal error, iOS error. `[Web+iOS]`
- [ ] Simulate malformed `printers.json` deploy on a preview branch; verify site doesn't brick. Ties into [LOW-008]. `[Web]`
- [ ] Rollback rehearsal: web `git revert` + push → verify auto-deploy serves old; iOS TestFlight expire-build. Document in new runbook. `[Both]`
- [ ] Pull production Sentry + Cloudflare Analytics 14-day baselines. `[You]`
- [ ] Create `docs/runbooks/incident-response.md` with rollback procedures, Sentry + CF links, current baseline. `[Code]`

---

## IR-4 — Drift prevention (structural) ✅ 2026-04-23 (bundled into v1.0.2)

All items shipped. HIGH-003 was the riskiest — ran through 3 Codex external-review passes before merging; final verdict `merge`. Review kit preserved at [`../../../../3dprintassistant-ios/docs/reviews/2026-04-23-high-003-codex/`](../../../../3dprintassistant-ios/docs/reviews/2026-04-23-high-003-codex/).

- [x] **[HIGH-003]** `actor EngineService` → `final class @unchecked Sendable` + dedicated serial `DispatchQueue(label: "engine.js", qos: .userInitiated)`. Shipped via squash-merge (iOS `2579fe8`). 3 external Codex review passes; review kit preserved.
- [x] **[HIGH-006]** Bridge `Engine.SLICER_TABS` + `Engine.SLICER_PARAM_LABELS`. Web `73ad161`, iOS `5132d94`. Deleted 270+ lines of static data from `SlicerLayout.swift`.
- [x] **[HIGH-007]** Bridge `Engine.getNozzleSize(id)`. Web `5cbcd72`, iOS `546fcfa`.
- [x] **[HIGH-004]** Re-read `_engineError` in post-loop block. iOS `83edae6`.
- [x] **[HIGH-005]** Structured `_engineError` sentinel. iOS `d2957da`.
- [x] **[HIGH-011]** Structured numeric per chip (`value` field). Web `9aa164e`, iOS `98f372f`.
- [x] **[MEDIUM-020]** Bridge `getFilamentTabs(mode)`. Web `c3ba127`, iOS `2436844`.
- [x] **[MEDIUM-021]** Bridge `getSlicerDisplayName(id)`. Web `f6dd64b`, iOS `9093b24`.
- [x] **[R8]** `_validateSchema()` at engine init. Web `7601c72`, iOS `88047ec`. Two-tiered (critical→throw / soft→warn), idempotent. Subsumes the MEDIUM-007 inline check.

---

## IR-5 — Backlog (touch when nearby)

Not session-scheduled. Tick off as nearby edits touch the files. Items marked → **Tracked in slim ROADMAP** carry forward as live work.

- [x] **[HIGH-012-followup A+B]** A1 why-text templating. **Shipped IR-2a** (web `e1ca1a0` + `4efc122`).
- [x] **[LOW-003]** Consolidate `retraction_length` + `retraction_distance` in materials.json. **Shipped IR-4 bundle** (web `b58b8e2`, iOS `d853ffb`). Picked `retraction_distance` as canonical. Unblocks HIGH-001 export fix when export UI is re-enabled.
- [x] **[LOW-004]** TPU drying display vs numeric mismatch. **Shipped IR-5 sweep II 2026-04-23** (web `14f82e0`, iOS `a5be620`).
- [ ] **[LOW-005]** `prc_0.2` — keep + add siblings, or drop. Owner decision (product-taste). → **Tracked in slim ROADMAP** Active Work Queue (owner decision).
- [x] **[LOW-006]** `flexible` field duplication. **Shipped IR-4 bundle** (web `2e87e1b`, iOS `101618a`).
- [ ] **[LOW-007]** Hoist Bambu preset `version: '2.5.0.14'` to module constant. Lower priority; export disabled. → **Tracked in slim ROADMAP** Deferred (export).
- [ ] **[CRITICAL-001-followup]** Worker `/api/feedback` routes iOS + web to a single `DISCORD_WEBHOOK_URL` — currently all lands in `#web-app-feedback`. Branch on `payload.context.appSource === "ios"` to a separate `DISCORD_WEBHOOK_URL_IOS` env var. Scope: ~15 LoC + new CF secret + new iOS-channel webhook + redeploy. v1.0.3-safe. → **Tracked in slim ROADMAP** Active Work Queue.
- [ ] **[LOW-011]** Feedback email visibility — (a) web copy parity helper text, (b) Worker reorder of `Reply-to email` to top of embed. ~10 LoC web-only. → **Tracked in slim ROADMAP** Active Work Queue.
- [x] **[LOW-008]** Wrap per-file `init()` `.json()` in `.catch()` for non-critical files. Shipped 2026-04-23 (web `250d456`, iOS `dea0eab`).
- [x] **[LOW-009]** Add `da.json` to `testAllBundledResourcesPresent`. Shipped 2026-04-23 (iOS `63c3a5d`).
- [x] **[LOW-010]** Unify `_SUPPORT_TYPES` + `_SUPPORT_GEOMETRY`. Shipped 2026-04-23 (web `d91bb6a`, iOS `228a600`).
- [x] **[MEDIUM-003]** Document `limits_override` null vs undefined contract. Shipped 2026-04-23 (web `cc2dc9d`, iOS `d7f12f0`).
- [x] **[MEDIUM-004]** Single `_fmtLayer(lh)` helper. Shipped 2026-04-23 (web `a1b187a`, iOS `fcb56f1`).
- [x] **[MEDIUM-005]** Strength-chip pattern through `mapForSlicer`. Shipped 2026-04-23 (web `b0bd201`, iOS `1e6f175`).
- [x] **[MEDIUM-009]** Typed `Codable` decode for `resolveProfile` output. Shipped 2026-04-23 IR-4 bundle (iOS `05e6bfa`).
- [x] **[MEDIUM-010]** Reset `isReady = false` at top of `EngineService.initialize()`. Shipped 2026-04-23 (iOS `65899ef`).
- [x] **[MEDIUM-011]** Correctness-tier test (8 combos). Shipped 2026-04-23 (iOS `4300400`). Regenerable via [`../../../scripts/extract-correctness-tuples.js`](../../../scripts/extract-correctness-tuples.js).
- [x] **[MEDIUM-012]** `JSON.stringify`-style escaping for ID embeds. Shipped 2026-04-23 (iOS `6d93380`). New `jsonLit()` helper.
- [x] **[MEDIUM-013]** Throw/log on `getFilters(state:)` serialisation failure. Shipped 2026-04-23 (iOS `d806a09`).
- [x] **[MEDIUM-014]** Pointer to CRITICAL-002 — covered there. Closed.
- [x] **[MEDIUM-017]** Deleted dead `condition_warnings` block + `material_warnings` retirement. Shipped 2026-04-23 (web `358591d` + `481049d`, iOS `a797f2f` + `19ee59b`).
- [~] **[MEDIUM-019]** Align `max_mvs` key coverage with `k_factor_matrix`. Part A shipped 2026-04-23 (web `f6d11f6`, iOS `ad655ed`). **`[MEDIUM-019-followup]`** — 0.8mm entries for 16 mainstream materials + HIPS 0.2mm still need domain-sourced volumetric numbers; folds into DQ-3 scraper pass. → **Tracked in slim ROADMAP** Deferred (DQ-3).
- [x] **[MEDIUM-022]** Route `innerHTML` call sites through `escHtml`. Shipped 2026-04-23 (web `1eb9ffa`).
- [x] **[OBS-006]** Minimal `console` polyfill to iOS JSContext. Shipped 2026-04-23 (iOS `c2fa85c`).
- [x] **[DQ-1-followup]** Provenance extended to filament panel. Shipped 2026-04-24 PM (web `c5b6ea2…be75b68`, iOS `7a913f3…f9c966e`). 2 new XCTests.
- [x] **[LOW-003-followup-label]** `adv.retraction_length` → `adv.retraction_distance` at `app.js:1187` (web-only, 2-line). Shipped 2026-04-24 PM (web `2441b18`).

---

## IR-deferred — export path (re-activate when export is re-enabled)

→ **All tracked in slim ROADMAP** under Deferred / Parked Work.

- [ ] **[HIGH-001]** `exportBambuStudioJSON` writes unscaled retraction (reads `bs.retraction_length` instead of scaled value). Depends on [LOW-003 / HIGH-013] collapse first. (LOW-003 now shipped; HIGH-001 unblocked when export UI re-enables.)
- [ ] **[MEDIUM-006]** `_extractValue` lowercase-strip fallback.
- [ ] **[MEDIUM-008]** Export-path pattern map duplication — collapse via `mapForSlicer`.
- [ ] **[LOW-007]** Bambu preset `version` string hardcoded. (Same item as IR-5 LOW-007.)
- [ ] Live Bambu Studio import test (5 combos).

---

## IR tracking (final state at slim time, 2026-05-08)

| Phase | Status | Note |
|---|---|---|
| IR-0 — Ship this week | ✅ Closed — 5/10 shipped directly + remaining 4 folded into IR-2a + HIGH-014 also shipped via IR-2a | — |
| IR-1 — Data logic verification | ✅ 2026-04-20 | Second-pass coverage tracked in slim ROADMAP |
| IR-2 — Engine correctness | ✅ 2026-04-23 | Bundled into IR-2a |
| IR-2a — iOS v1.0.2 ship pass | ✅ **RELEASED 2026-04-24** | Day-1 monitoring retired silently (2-week post-release window, no escalation) |
| IR-3 — Failure rehearsal | ⏳ Deferred | Tracked live in slim ROADMAP |
| IR-4 — Drift prevention | ✅ 2026-04-23 | Bundled into v1.0.2 |
| IR-5 — Backlog | Closed except for 4 items: `[LOW-005]`, `[LOW-007]`, `[CRITICAL-001-followup]`, `[LOW-011]` | All 4 tracked live in slim ROADMAP |
| IR-deferred — export | ⏳ Deferred until export UI re-enabled | Tracked live in slim ROADMAP Deferred |
