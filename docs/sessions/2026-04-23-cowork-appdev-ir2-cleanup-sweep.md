# 2026-04-23 — Cowork (appdev): IR-2 / IR-5 cleanup sweep + CI quota fix

## Durable context

What a future session needs that ROADMAP doesn't capture:

- **TestFlight workflow is now `workflow_dispatch`-only.** Auto-run on push to `main` was removed mid-session after GitHub reported 100% of the 2000 free Actions-minutes used. Every iOS push was triggering a ~10-min macos-26 build (10× minute rate), and silent-correctness commits don't need TestFlight builds — they bundle into the next version bump. Future sequence: when you're ready to ship v1.0.2, bump `CFBundleShortVersionString`, `xcodegen generate`, push, then **manually trigger the workflow** via `gh workflow run testflight.yml --ref main` (or click Run workflow in the Actions tab). Added `concurrency: cancel-in-progress` so back-to-back dispatches don't stack two macOS runs.

- **R8 `_validateSchema()` is two-tiered.** Critical violations throw (unknown `printer.series`, non-numeric `limits_override.nozzles` key, missing required material fields `id`/`name`/`nozzle_temp_base`/`bed_temp_base`/`retraction_distance`). Soft violations `console.warn` (unknown `nozzle.not_suitable_for` refs, `max_mvs` key gaps vs `k_factor_matrix`). Classification reflects "does this silently change emission for real users" — throw only when the alternative is serving bad data. Idempotent via a module-scoped `_schemaValidated` flag — repeat `Engine.init()` calls (which the UI triggers on language switch etc.) don't re-emit. Subsumes the MEDIUM-007 inline check.

- **R8 currently fires 16 soft warnings documenting the MEDIUM-019-followup gap.** Every mainstream material has `max_mvs["0.8"]` missing but `k_factor_matrix["0.8"]` present; HIPS additionally lacks `max_mvs["0.2"]`. These need domain-sourced volumetric numbers (40+ mm³/s for PLA Basic 0.8 is plausible via nozzle-area scaling but I'm not inventing numbers). Filed as IR-5 `[MEDIUM-019-followup]`. Zero critical violations in current data.

- **MEDIUM-019 is intentionally partial.** Engine contract: `max_mvs[size] === null` → emits `nozzle_not_supported` warning + dims the nozzle chip as incompatible. Inventing "unknown" as `null` would wrongly flag e.g. 0.8mm+PLA-Basic as incompatible. So the inline fix only added explicit `null` where the combo is genuinely incompatible: `petg_cf`/`pa`/`pc`/`pa_cf`/`pet_cf` × `0.2mm` (already carry `min_diameter=0.4` elsewhere, now aligned via max_mvs too). HIPS has `min_diameter=0.2` so 0.2 IS compatible — not patched. 0.8mm for mainstream materials left missing (current behavior: `if (mvsStr)` falsy skip → uncapped formula speeds, reasonable).

- **LOW-010 unifies `_SUPPORT_TYPES` + `_SUPPORT_GEOMETRY` and removes the `|| '0.10'` silent fallback.** A new support id added to `_SUPPORT_TYPES` without geometry now throws at emission time (`undefined.z_gap`) instead of silently emitting wrong support output. `none` is the only entry with `type/z_gap = null` — gated by `support.id !== 'none'` at every read site.

- **OBS-006 console polyfill defuses a latent MEDIUM-007 ReferenceError on iOS.** Yesterday's MEDIUM-007 added `console.warn(...)` at engine init — dormant today because all 64 bundled printers validate, but without the polyfill any future typo would raise `ReferenceError: Can't find variable: console` inside JSContext. The exception handler would have caught it and surfaced it as a generic bridge error, masking the actual printer.series issue. Polyfill is no-op stubs for `log`/`warn`/`error`/`info`/`debug`.

- **MEDIUM-004 `_fmtLayer` scope: chip desc + `layer_height` emission only.** `initial_layer_height` keeps its own `toFixed(2)` because its display convention is intentionally 2-decimal ("0.20 mm") and it has no chip-desc counterpart. Don't unify unless a chip-desc partner ships.

- **MEDIUM-017 deletion revealed `material_warnings` is also dead data.** Engine reads `warnings.json` into `_warnings` but never references `_warnings.*` after init. Kept `material_warnings` in the file for now (would be a second dead-data commit); filed as an observation — retire in a future IR-5 pass when nearby code changes.

- **MEDIUM-022 escapes five innerHTML sites in app.js.** Warnings bar (`m.text`/`m.detail`), filament notes (`n`), compare banner (`comparisonProfile.label`), and profile-panel rows (`aVal`/`bVal`/`item.value`/`item.why`). `PARAM_LABELS` + `T(...)` translations stay raw — they're bundled English/DA constants, never user input. The highest-risk site is `comparisonProfile.label` per review — a shareable-profile-URL feature would make it user-writable.

## Context

Owner-authorised session-scoped autonomous sweep (same pattern as 2026-04-22 / 2026-04-23 overnight runs). Target: pull another 10 IR-2 / IR-5 findings into v1.0.2 before shipping. Owner pre-approved 3 decision forks (MEDIUM-017 delete, LOW-010 unify, R8 fix-inline-when-obvious-file-otherwise) so the sweep could run without mid-run stops.

Mid-session: owner pasted a GitHub Actions quota alert (100% used). Pulled out of sweep, diagnosed the TestFlight workflow as the cause (every iOS push = ~10-min macos-26 build), proposed + shipped `workflow_dispatch`-only + `concurrency: cancel-in-progress` with one commit. Resumed sweep.

## What happened / Actions

Order: MEDIUM-017 → MEDIUM-010 → LOW-009 → OBS-006 → MEDIUM-022 → LOW-008 → MEDIUM-004 → LOW-010 → CI fix → MEDIUM-019 → R8.

Every engine change: edit web → `cp` to iOS byte-identical → `node scripts/walkthrough-harness.js` → targeted iOS XCTest → commit web → commit iOS → push both.

**10 findings + 1 CI change landed. 21 commits.**

## Files touched

### Web (`3dprintassistant`)

**Modified (committed):**
- `engine.js` — OBS-006-sibling (console polyfill on iOS side), LOW-008, MEDIUM-004, LOW-010, R8 (cumulative)
- `app.js` — MEDIUM-022 (5 escHtml call sites)
- `data/rules/warnings.json` — MEDIUM-017 (delete condition_warnings)
- `data/materials.json` — MEDIUM-019 partial (5 materials gain explicit max_mvs["0.2"]: null)
- `scripts/validate-data.js` — MEDIUM-017 (drop condition_warnings validation)

**Untracked (this session — committed as "docs: session close"):**
- `docs/sessions/2026-04-23-cowork-appdev-ir2-cleanup-sweep.md` (this log).
- `docs/sessions/INDEX.md` — prepended bullet.
- `docs/sessions/NEXT-SESSION.md` — refreshed with CI-dispatch change + IR-5 followups.
- `docs/planning/ROADMAP.md` — IR-2 ticks + IR-5 backlog additions.

### iOS (`3dprintassistant-ios`)

**Modified (committed):**
- `3DPrintAssistant/Engine/EngineService.swift` — MEDIUM-010, OBS-006
- `3DPrintAssistant/Engine/engine.js` — byte-identical syncs (× 5)
- `3DPrintAssistant/Data/materials.json` — MEDIUM-019 sync
- `3DPrintAssistant/Data/rules/warnings.json` — MEDIUM-017 sync
- `3DPrintAssistantTests/EngineServiceTests.swift` — LOW-009
- `.github/workflows/testflight.yml` — CI fix (dispatch-only + concurrency)

## Commits

**Web (`3dprintassistant`) — 10 commits this session, all pushed to `main`:**
- `358591d` — `data: remove dead condition_warnings block from warnings.json [MEDIUM-017]`
- `1eb9ffa` — `web: escape engine-sourced values before innerHTML interpolation [MEDIUM-022]`
- `250d456` — `engine: soft-fail non-critical init files with documented defaults [LOW-008]`
- `a1b187a` — `engine: shared _fmtLayer helper for chip + emission parity [MEDIUM-004]`
- `d91bb6a` — `engine: unify _SUPPORT_TYPES + _SUPPORT_GEOMETRY [LOW-010]`
- `f6d11f6` — `data: mark max_mvs 0.2 as explicitly incompatible for CF/PA/PC materials [MEDIUM-019]`
- `7601c72` — `engine: schema validation at init [R8]`

**iOS (`3dprintassistant-ios`) — 11 commits this session, all pushed to `main`:**
- `a797f2f` — MEDIUM-017 sync
- `65899ef` — `iOS: reset isReady + context at top of initialize() [MEDIUM-010]`
- `63c3a5d` — `iOS: require da.json in bundled-resource presence test [LOW-009]`
- `c2fa85c` — `iOS: add minimal console polyfill to JSContext [OBS-006]`
- `dea0eab` — LOW-008 sync
- `fcb56f1` — MEDIUM-004 sync
- `228a600` — LOW-010 sync
- `065a585` — `ci: switch TestFlight deploy to manual-dispatch only`
- `ad655ed` — MEDIUM-019 sync
- `88047ec` — R8 sync

**21 commits total. 37/37 iOS XCTest green after every one. Walkthrough harness 9/9 clean + Combo 3 pre-existing warn (unchanged since IR-0) after every one.**

## Data/logic change evaluation (standing rule)

- **MEDIUM-017 / LOW-008 / R8:** defensive engine hardening. No UI surface change. R8 will surface validator output in dev console — no prod-user impact (prod users don't open devtools).
- **MEDIUM-010:** iOS-only test-infra reliability. No UI change.
- **LOW-009:** test-only. No UI change.
- **OBS-006:** iOS-only JSContext polyfill. No UI change.
- **MEDIUM-022:** web-only security hardening. Zero visible difference today (no bundled string contains HTML-special chars); closes latent XSS path. No UI change.
- **MEDIUM-004 / LOW-010:** engine formatter + table consolidation. No UI change (all outputs byte-identical for current data; changes are about future drift resistance).
- **MEDIUM-019:** data change. User-visible effect: selecting a 0.2mm nozzle with petg_cf/pa/pc/pa_cf/pet_cf now fires the existing `nozzle_not_supported` warning + dims the nozzle chip as incompatible. This is correct — these materials need ≥0.4mm nozzles. Web + iOS both consume via the same engine paths; no UI code changes needed.
- **CI workflow change:** infra only. User-facing iOS app unchanged. Owner ship workflow changes: must `gh workflow run testflight.yml --ref main` after version bump.

## Walkthrough harness result

**10/10 combos, 9 clean + 1 pre-existing warn (Combo 3: X1C + 0.8 std + PLA Basic + Draft/Fast — unchanged from prior sessions).** R8 now emits 16 soft validator warnings at init — not a regression, they document the MEDIUM-019-followup gap (max_mvs["0.8"] missing on all 16 materials that have 0.8 in k_factor_matrix; HIPS additionally lacks 0.2).

## iOS XCTest result

**37/37 passing.** No new tests added this session. The engine fixes are defensive hardening without new observable surfaces. LOW-009 tightened an existing test to assert one more bundled resource.

## Md-hygiene sweep

1. **Root stubs:** none — no orphan root-level `.md` files added.
2. **Untracked-but-should-be-tracked:** 3 session-protocol files (this log, INDEX update, NEXT-SESSION) + ROADMAP update — all promoted in session-close commit. One pre-existing untracked asset in root (`mockup_e_nøglekort.png`) is unrelated to this session.
3. **Secrets in tree:** clean — no `.p8` / `.mobileprovision` / `.certSigningRequest` / PAT-in-URL / plaintext secret strings added.
4. **Content buried in session log:** R8 classification rationale, CI-dispatch owner-action note, and MEDIUM-019 scope rationale promoted to Durable context.
5. **Stale ROADMAP sections:** IR-2 section had items ticked that were already covered by IR-2a. Audit confirms IR-2 "HIGH-008/009, MEDIUM-001/002/007/018" are all `[x]` in IR-2a above — the IR-2 subsection is effectively empty after this sweep (MEDIUM-004 + MEDIUM-017 + MEDIUM-019 + LOW-008 + LOW-009 + LOW-010 + OBS-006 + MEDIUM-022 + R8 + MEDIUM-010 land into IR-2 as shipped). Will restructure in ROADMAP update.
6. **Duplicate specs:** none added.

**Dead-data observation (not actioned):** `material_warnings` in `warnings.json` is never read by engine (same class as condition_warnings). Left in place for this session; retire in a future IR-5 pass when nearby.

## Open questions / owner asks

**Unchanged from yesterday's session (still blocking v1.0.2 ship):**
- `[HIGH-014]` — A1 mini `max_bed_temp`: 80°C (Bambu spec) or 100°C (current data)?
- `[LOW-002]` — HIPS `enclosure_behavior.reason` text (currently copy-pasted from ABS).
- `[MEDIUM-018-B]` — unify `nozzles.not_suitable_for` via material IDs or groups?

**CRITICAL-001 activation (secret config):**
- Generate HMAC secret → set in 3 places (CF Worker env, GitHub repo secret, local Config.xcconfig). `openssl rand -hex 32`.
- `[HIGH-010 part B]` — Cloudflare Rate Limiting rule on `/api/feedback` (10/min/IP, 100/min global).

**New owner ask (after this session):**
- `[MEDIUM-019-followup]` (filed IR-5) — volumetric capacity numbers for 0.8mm on mainstream materials + HIPS 0.2mm. Needs domain-sourced data, not invented via nozzle-area extrapolation.
- `[material_warnings cleanup]` (unfiled observation) — retire `material_warnings` block in `warnings.json` similar to MEDIUM-017. Not urgent; nearby work would trigger.

**Owner ship tasks (unchanged + 1 addition):**
- Tone pass on `docs/app-store-whats-new-v1.0.2.md`.
- Bump `CFBundleShortVersionString` → `1.0.2` in `project.yml`, run `xcodegen generate`, commit + push.
- **NEW:** `gh workflow run testflight.yml --ref main` to trigger the build (no longer auto-runs on push).
- TestFlight internal test: submit feedback, confirm lands in Discord via Worker.
- Rotate old Discord webhook URL in Cloudflare env.
- Submit v1.0.2 to App Review, manual release toggle.

## Next session

Full comprehensive kickoff prompt in [`NEXT-SESSION.md`](NEXT-SESSION.md) — rewritten with the CI-dispatch change, the 10 findings shipped tonight, and the refreshed remaining-ship-work checklist.
