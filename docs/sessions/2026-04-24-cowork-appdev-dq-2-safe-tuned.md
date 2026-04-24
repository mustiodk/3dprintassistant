# 2026-04-24 — Cowork (appdev): DQ-2 Safe/Tuned + DQ-1-followup + LOW-003-followup-label

## Durable context

What a future session needs that ROADMAP doesn't capture:

- **Pattern for extending filament-surface engine functions with provenance.** `getAdvancedFilamentSettings` / `getAdjustedTemps` / `getFilamentProfile` don't use the `{value, why, mode, prov}` shape — they return flat strings. Rather than refactor the return shape (would break 3 internal `resolveProfile` callers + iOS decode), the follow-up adds a **`_prov` sidecar**: an object on the same return, keyed by field name, holding `{source, ref?}`. Consumers opt in by reading `ret._prov[fieldName]` when rendering. The walkthrough harness gained a one-line filter to skip underscore-prefixed keys in its markdown dump. If a future engine function needs provenance, use this pattern, not the inline `S`/`A` path.

- **DQ-2 dual-tier data convention.** `objective_profiles.json` preserves top-level fields as the **Safe** tier (unchanged from pre-DQ-2). Tuned overrides live in an optional `_tuned: { field: value }` block on the same preset — **sparse**: only the fields that differ need to appear. `_tier(preset, field, mode)` in `engine.js` reads `preset._tuned[field]` when `mode === 'tuned'` AND present, else the top-level Safe value. Non-differentiated fields fall through transparently, so adding more tiered fields in DQ-3/4/5 is one-line-per-field (add the key to `_tuned`). Avoid the alternative "two parallel structures" or "tier-nested preset" shapes — both require migrating every existing reader.

- **Tuned values are clamped by the same downstream pipeline.** `outer_wall_speed` Tuned base is 200 mm/s on CoreXY + Fast, but the MVS/material/printer-limit clamps can bring that down to 149 in practice (X1C + 0.4 + PLA). This is **correct behaviour** — the tier affects the *base*, not a post-clamp override. Prov ref still reports `(base from _tuned)` so pros see the tier chose the starting number even when physics caps the emission. When picking future DQ-2 fields, prefer ones where the clamp pipeline doesn't swallow the delta (acceleration is less clamped than speed; infill density isn't clamped at all).

- **iOS AppState.profileMode defaults to `nil`, not `"safe"`.** The `toJSDictionary()` only includes the key when set, so an untouched state sends no `profileMode` to engine.js, which coerces missing/unknown → `"safe"`. This is **load-bearing**: pre-DQ-2 TestFlight / App Store users' persisted state has no `profileMode` field and must read as Safe. `resetGoals()` also nils it rather than setting `"safe"` — same invariant. If that coercion logic in `engine.js` ever changes, the iOS default needs to match.

- **Tuned values sourced from community consensus.** The 5 MVP Tuned values are not scraper-sourced (DQ-3 territory). They're owner-level defaults informed by what A1/X1C owners routinely run after Input Shaper + flow calibration: outer_corexy 150→200 (Bambu X1C community consensus), outer_bedslinger 100→130 (A1 bedslinger), outer_accel 6000/3000→10000/6000 (IS-tuned defaults), infill_density strong 35→25 (Gyroid efficiency). DQ-3 will upgrade these to `source: 'vendor'` with real refs once the scraper pass lands on Bambu wiki + Prusa KB.

- **v1.0.2 was approved + released overnight** (owner confirmed at session start). NEXT-SESSION lines 5 / 20 / 31 + ROADMAP IR-2a row were stale by the time this session ran; I synced ROADMAP in the session-close pass. NEXT-SESSION stays stale per owner-triggered-only rule — regenerate on next cold-start ask.

- **Preview server test quirk.** `getFilamentProfile(state)` takes a material ID (string), not the state object. Hit this during DQ-1-followup verification when manual harness calls initially passed `state` and got `null` back. Not a bug — spec matches. Noted here so the next session doesn't re-debug.

## What happened / Actions

Order of execution (owner gave session-scoped autonomous authorization after confirming plan + two go/no-go decisions: do the 2-line LOW-003 warm-up first, and bundle DQ-1-followup into the DQ-2 session):

1. **Step 1 — `[LOW-003-followup-label]`** (2-line fix, web-only). Swapped `adv.retraction_length` → `adv.retraction_distance` at `app.js:1187`. Preview confirmed row now reads "Retraction length 0.6 mm" (was "undefined"). Label key stays `rowRetractLen` per Bambu Studio convention. Web `2441b18`.

2. **Step 2 — DQ-1-followup engine.** Extended `getAdjustedTemps`, `getAdvancedFilamentSettings`, `getFilamentProfile` with `_prov` sidecars. 2 calculated + 17 default + 0 vendor/rule prov entries across the three functions. Walkthrough harness skip-underscore filter added. Byte-identical iOS sync. 10/10 harness + 42/42 XCTest green. Web `c5b6ea2`, iOS `7a913f3`.

3. **Step 3 — DQ-1-followup UI.** Web: extended `row()` helper with optional 4th `prov` arg, wired 12 numeric filament rows to their prov sidecar. Preview confirmed 12 ⓘ icons render in Advanced mode, 0 in Simple. Qualitative rows (build plate, AMS, drying, enclosure) stay bare. iOS: `AdjustedTemps` + `FilamentProfile` gain `prov: [String: Provenance]`, `_decodeProvSidecar` helper, `FilamentSettingsView` takes `isAdvanced` + passes prov/showProv into `ParamRow`, OutputView wires it through, `OutputViewModel` default placeholders get empty prov dict. Two new XCTests. Web `be75b68`, iOS `f9c966e`. 44/44 (was 42).

4. **Step 4 — DQ-2 commit 1 (engine plumbing).** Added module-level `_tier(preset, field, mode)` helper next to `S`/`A`. `resolveProfile` reads `state.profileMode` (missing/unknown → `'safe'`) and wires 5 MVP tiered reads (outer_corexy, outer_bedslinger, outer_accel_corexy, outer_accel_bedslinger, infill_density). Prov refs on the 3 emissions extended with `(_tuned)` / `(base from _tuned)` suffix when tier-triggered. Zero behavior change yet — no data carries `_tuned` at this commit. Web `d4c9288`, iOS `b02aead`.

5. **Step 5 — DQ-2 commit 2 (data).** `_tuned` override blocks on 3 presets (speed_priority.fast, speed_priority.balanced, strength_levels.strong). Differentiation verified on 4 representative combos: X1C strong+fast (2 fields), A1 strong+fast (3 fields), X1C standard+balanced (2 fields), A1 standard+balanced (1 field). Walkthrough 10/10 still green (combos don't opt into tuned). Web `8eccfed`, iOS `182833f`.

6. **Step 6 — DQ-2 commit 3 (UI).** Web: added `profileMode` filter group to `Engine.getFilters()` with i18n-backed labels + descs; locale keys added to en.json + da.json; `state.profileMode = null` in app.js. Preview confirmed Profile Mode section renders with Safe/Tuned chips and differentiates emission. iOS: `AppState.profileMode: String?`, `toJSDictionary` includes it when set, `resetGoals` clears it, `GoalsView` renders a `SlidingSegmentedControl` inside "More options" disclosure right after Experience Level, gated on `!options(for: "profileMode").isEmpty` for incremental rollout safety. Web `f9384dc`, iOS `0380910` + `5a97ed8` (engine re-sync for the filter registry addition — was a separate web commit).

7. **Step 7 — DQ-2 commit 4 (regression tests).** Walkthrough harness gained a top-level "DQ-2 Safe vs Tuned assertion" block with 3 checks: Safe baseline byte-equality, Tuned differentiation ≥3/5, prov `_tuned` tier tagging. Mirror iOS XCTests `testSafeBaselineByteEqualToDefault` + `testTunedEmissionDiffersOnTieredFieldsAndTagsProvenance`. 46/46 XCTest (was 44). Web `270d17b`, iOS `949f95b`.

8. **Step 8 — Session close.** This log, INDEX, ROADMAP DQ section fully ticked + v1.0.2 status synced to "released overnight" + IR-5 backlog `[DQ-1-followup]` and `[LOW-003-followup-label]` checked off + Phase DQ progress 1/5 → 2/5 + IR-tracking row updated. Md-hygiene sweep surfaced items (see Open questions). NEXT-SESSION **not** regenerated per owner-triggered-only rule.

## Files touched

### Web (`3dprintassistant`)

**Modified (committed):**
- `app.js` — `row()` helper prov arg + renderFilamentPanel wiring + profileMode filter group readership + `state.profileMode`
- `engine.js` — `_tier` helper, profileMode coercion, 5 tiered reads, prov tier marker, filter group, filament `_prov` sidecars, harness-sanity
- `data/rules/objective_profiles.json` — 3 `_tuned` blocks
- `locales/en.json` + `locales/da.json` — `filterProfileMode` / `pmSafe` / `pmSafeDesc` / `pmTuned` / `pmTunedDesc`
- `scripts/walkthrough-harness.js` — underscore-meta filter + DQ-2 assertion block

**Untracked, unrelated:**
- `mockup_e_nøglekort.png` (web root) — pre-existing, not 3dpa

### iOS (`3dprintassistant-ios`)

**Modified (committed):**
- `3DPrintAssistant/Engine/engine.js` — byte-identical sync (4 discrete commits across the session)
- `3DPrintAssistant/Engine/EngineService.swift` — `AdjustedTemps`/`FilamentProfile` prov dict + `_decodeProvSidecar`
- `3DPrintAssistant/Models/AppState.swift` — `profileMode: String?` + reset + dict
- `3DPrintAssistant/Data/rules/objective_profiles.json` — byte-identical data sync
- `3DPrintAssistant/Resources/en.lproj/en.json` + `3DPrintAssistant/Resources/da.lproj/da.json` — locale sync
- `3DPrintAssistant/Views/Output/FilamentSettingsView.swift` — isAdvanced + prov wiring
- `3DPrintAssistant/Views/Output/OutputView.swift` — isAdvanced pass-through
- `3DPrintAssistant/Views/Output/OutputViewModel.swift` — empty prov on placeholders
- `3DPrintAssistant/Views/Configurator/GoalsView.swift` — SlidingSegmentedControl for profileMode
- `3DPrintAssistantTests/EngineServiceTests.swift` — 4 new XCTests (2 DQ-1-followup + 2 DQ-2)

**Untracked at session end:**
- `docs/reviews/2026-04-23-high-003-codex/06-single-paste.pdf` — still pending owner decision from 2026-04-23 ship session

## Commits

**Web (`3dprintassistant`) — 8 commits, all pushed to `main`:**
- `2441b18` — `web: fix undefined retraction length in Advanced Filament panel [LOW-003-followup-label]`
- `c5b6ea2` — `engine: extend filament settings with provenance sidecar [IMPL-041 / DQ-1-followup commit 1]`
- `be75b68` — `web: render ⓘ provenance icon on Filament panel Advanced view [IMPL-041 / DQ-1-followup commit 2]`
- `d4c9288` — `engine: Safe/Tuned profileMode plumbing + _tier helper [IMPL-041 / DQ-2 commit 1]`
- `8eccfed` — `data: Tuned tier overrides on 5 MVP fields [IMPL-041 / DQ-2 commit 2]`
- `f9384dc` — `web: Safe/Tuned toggle on configurator [IMPL-041 / DQ-2 commit 3]`
- `270d17b` — `engine: walkthrough harness DQ-2 Safe/Tuned assertion [IMPL-041 / DQ-2 commit 4]`
- *(session-close commit: this log + INDEX + ROADMAP pending)*

**iOS (`3dprintassistant-ios`) — 7 commits, all pushed to `main`:**
- `7a913f3` — `iOS: sync engine.js — filament _prov sidecars [IMPL-041 / DQ-1-followup commit 1]`
- `f9c966e` — `iOS: decode + render filament provenance on Advanced view [IMPL-041 / DQ-1-followup commit 3]`
- `b02aead` — `iOS: sync engine.js — Safe/Tuned profileMode plumbing [IMPL-041 / DQ-2 commit 1]`
- `182833f` — `iOS: sync objective_profiles.json — _tuned overrides on 5 MVP fields [IMPL-041 / DQ-2 commit 2]`
- `0380910` — `iOS: Safe/Tuned segmented control on Print Details [IMPL-041 / DQ-2 commit 3]`
- `5a97ed8` — `iOS: sync engine.js — profileMode filter group registry [IMPL-041 / DQ-2 commit 3]`
- `949f95b` — `iOS: DQ-2 Safe baseline + Tuned differentiation XCTests [IMPL-041 / DQ-2 commit 4]`

**15 commits total. Walkthrough 10/10 + DQ-2 assertion 3/3 green after every relevant commit. iOS XCTest 42 → 44 → 46 across the session.**

## Data/logic change evaluation (standing rule)

- **LOW-003-followup-label:** web UI, 2-line. No iOS counterpart (iOS bridges `getAdjustedTemps` not `getAdvancedFilamentSettings`). Zero engine change.
- **DQ-1-followup:** engine emits new `_prov` sidecars on 3 filament functions (additive, sidecar keys ignored by existing consumers); web + iOS UI render ⓘ alongside existing row layouts in Advanced view only. Zero behavior change for Simple users. Qualitative rows stay unsourced per DQ-1 rule.
- **DQ-2:** engine adds `_tier()` + `profileMode` coercion; data adds sparse `_tuned` blocks on 3 presets; UI adds a 2-option chip group (web) + segmented control (iOS) under "More options" / optional filter. Safe default preserves pre-DQ-2 output byte-for-byte (regression test proves it). Tuned is opt-in, requires a selection — no user ever sees differentiated numbers unless they pick Tuned. v1.0.2 (just released) is unaffected; next iOS release (v1.0.3 or v1.1) picks up the DQ work.

## Walkthrough harness / XCTest result

- **Walkthrough:** 10/10 domain combos green + DQ-2 assertion 3/3 green (Safe baseline byte-equal, Tuned differentiation 3/5 fields on A1+strong+fast, prov tier-tagged).
- **iOS XCTest:** 46/46. Test count: 42 (session start) → 44 (after DQ-1-followup commit 3) → 46 (after DQ-2 commit 4). New tests: `testAdjustedTempsCarryProvenance`, `testFilamentProfileCarriesProvenanceOnNumericFields`, `testSafeBaselineByteEqualToDefault`, `testTunedEmissionDiffersOnTieredFieldsAndTagsProvenance`.

## Md-hygiene sweep

1. **Root stubs:** none new. `mockup_e_nøglekort.png` at web root still untracked, still not ours — flag again next session.
2. **Untracked-but-should-be-tracked:** this session log + INDEX update + ROADMAP update promoted in session-close commit.
3. **Secrets in tree:** clean.
4. **Content buried in session log:** promoted the `_prov` sidecar pattern decision, the `_tuned` sparse override convention, the Tuned-clamped-to-physics caveat, the iOS AppState default-nil invariant, and the Tuned-values-are-community-sourced note to Durable context above.
5. **Stale ROADMAP sections:** IR-2a status was "SUBMITTED TO APP REVIEW" — owner confirmed **released overnight**. Fixed in session-close pass: IR-2a row flipped to ✅ + v1.0.2 live note + last-updated header refreshed. Phase DQ progress 1/5 → 2/5 + IR-tracking row updated.
6. **Duplicate specs:** none added.
7. **iOS untracked artefact:** `docs/reviews/2026-04-23-high-003-codex/06-single-paste.pdf` still pending owner decision (commit preserves exact Codex input, or gitignore + delete). Same state as 2026-04-23 ship-session log flagged.

## Open questions / owner asks

- **Unresolved: `docs/reviews/2026-04-23-high-003-codex/06-single-paste.pdf`.** Same question as 2026-04-23: commit (audit preservation) or gitignore PDFs in `docs/reviews/`? Flag-only, no action taken.
- **Unresolved: `mockup_e_nøglekort.png` at web repo root.** Still looks like a stray design asset from an adjacent project. Delete, move, or confirm it belongs.
- **v1.0.2 post-release monitoring.** Owner released last night. Day-1 Sentry + Discord `#web-app-feedback` monitoring was the only post-ship item; assuming that's either complete or in progress outside this session.
- **DQ-3 scope decision coming up.** PA/LA per material — the biggest single lever. Spec says scraper-assisted; owner runs the scraper locally (token-conserving). When starting DQ-3: confirm the 6 source list from IMPL-041 is still right, and confirm the "land `high` confidence values only, file `medium` for review, drop `low`" discipline.
- **Follow-up candidate for DQ-2:** the 5 MVP fields cover speed_priority (4) + strength_levels (1). `surface_quality.layer_height` could be a DQ-2.1 follow-up if owner wants Tuned to also allow thinner layers on capable nozzles (e.g. 0.28 Draft → 0.32 on 0.4mm where capability permits). Not in current scope; file if ever revisited.

## Next session

Target: **DQ-3 — Pressure / Linear Advance per material.**

Acceptance from spec (IMPL-041 §DQ-3):
- `scripts/scrape/` Node.js scraper authored by Claude Code, run locally by owner.
- `docs/research/scraped/YYYY-MM-DD-{source}/*.json` committed for reproducibility.
- Gemini cross-reference pass (owner-run) produces high/medium/low confidence proposals.
- `materials.json` gains `pressure_advance` map per printer×nozzle; engine emits `pressure_advance` (Bambu/Orca) or `linear_advance_factor` (Prusa).
- Coverage floor: top 10 materials × 4 mainstream printer series + `_default` for all 18 materials.
- Walkthrough + iOS XCTest assert PA/LA presence + sanity range.
- Folds in `[MEDIUM-019-followup]` — 0.8mm max_mvs gaps — same scraper pass produces both.

Optional bundle candidates:
- `[MEDIUM-019-followup]` itself (data-gap; max_mvs 0.8mm for 16 materials + HIPS 0.2mm).
- Any post-release v1.0.2 feedback that surfaces.

NEXT-SESSION.md is stale (dated 2026-04-24 pre-DQ-2). Regenerate on explicit ask.

## Autonomous-sweep decisions (owner was asleep)

Owner gave session-scoped autonomous authorization after confirming the plan + 2 go/no-go decisions at session start. Decisions I made without asking:

1. **Kept LOW-003-followup-label label as "Retraction length" (not "Retraction distance").** The web engine's Bambu/Orca PARAM_LABELS still use "Retraction length" to match slicer UI; only Prusa uses "Retraction distance". Matching slicer conventions beats internal-data-model consistency for a user-facing label.

2. **DQ-1-followup used `_prov` sidecar, not return-shape refactor.** Existing `getAdvancedFilamentSettings`/`getAdjustedTemps` return flat strings, not the `{value, why, mode}` shape. Sidecar keeps all 3 internal callers + iOS decode untouched; refactor would have been 5x the diff for zero user benefit.

3. **DQ-2 used sparse `_tuned` override block, not a flattened `{safe, tuned}` per-field shape or a tier-nested preset.** Sparse override = minimum diff when adding more tiered fields in DQ-3/4/5. Alternatives would have forced migrating every existing reader.

4. **DQ-2 MVP picked 5 fields, 3 presets.** Speed-priority outer_* (2 fields × 2 presets) + outer_accel_* (2 fields × 2 presets, 3 if you count balanced+fast) + strength strong.infill_density. Covers the "pros pay for speed they can audit" narrative + gives the walkthrough assertion 3+ visible deltas.

5. **Tuned values sourced from community consensus, not vendor.** DQ-3 scraper will replace these with vendor-tagged values; for DQ-2 MVP, source:'default' with an inline `(_tuned)` marker in the ref is the right "we chose these, we'll upgrade provenance later" signal.

6. **Committed engine re-sync as a separate iOS commit (`5a97ed8`).** The web engine change landed in DQ-2 commit 3 (f9384dc) but the iOS engine sync was still on disk + un-committed when I shipped `0380910`. Trailing re-sync commit is clean rather than amending.

7. **Harness + XCTest regression tests land as DQ-2 commit 4 (final), not spread across every commit.** Cleaner narrative: all data + all engine + all UI, then one "verify" commit. Spec allows either shape.

8. **Stopped short of regenerating NEXT-SESSION.md** per owner-triggered-only rule (Apr 23). This log flags it as stale.

9. **Did NOT tackle `[LOW-005]` prc_0.2 siblings.** Explicitly out of session scope. Still owner product-taste decision.

10. **Did NOT touch v1.0.2 post-release monitoring.** Owner released overnight; day-1 monitoring is owner-gated.
