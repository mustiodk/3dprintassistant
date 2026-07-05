# IMPL-043: Slicer Export Activation (root cause fix + native export for all three slicers)

**Status:** PROPOSED (Phase 1 review V2 deliverable, 2026-07-05, Fable 5 autonomous review)
**Owner decision required before any implementation.**
**Companion docs:** `docs/reviews/2026-07-05-fable5-phase1-review.md` (V2 addendum), `docs/specs/IMPL-036-profile-params.md` (absorbed by this spec), ROADMAP Phase 2.7a and "IR-deferred export-path findings" (absorbed by this spec).

---

## 1. Why export has never been stable (root cause analysis)

The instability is not one bug. It is one architectural decision plus one missing process, and every individual bug since April is a symptom of those two.

### 1.1 The history, verified against git and session logs

1. **2026-04-05:** export built (web `31d7d6c`, iOS `68fed57`): Bambu Studio process + filament JSON download plus text copy. Bambu Studio rejected the files the same day with "0 configs imported"; export was disabled within hours (`ab7f0d8`).
2. **2026-04-06:** a 24-hour fix wave (`9465982`) corrected field names, array wrapping, filament `inherits`, `compatible_printers`, and re-enabled the web UI behind a Beta badge. **No successful import into Bambu Studio was ever recorded after this fix.** ROADMAP Phase 2.7a still lists "Import test: verify .json imports correctly in Bambu Studio" as an open checkbox.
3. **2026-04-07:** IMPL-036 correctly diagnosed the structural problem (display strings driving export through regex heuristics) and specified the fix. It was never implemented; Phase 2.7a has sat in Deferred ever since.
4. **2026-04-20:** the IR-0 review deferred four export findings (HIGH-001, MEDIUM-006, MEDIUM-008, LOW-007) because "export UI was disabled at the time." The UI was in fact live for Bambu printers; the findings never re-entered scope.
5. **2026-05-13:** the v1.0.4 env-data work discovered the export path had silently drifted (unscaled fan, missing draft_shield). One fix shipped (`eaf3f09`); the same audit's retraction finding (HIGH-001) remains unfixed today at `engine.js:3149-3152`.
6. **Today:** web export is live for Bambu-brand printers only (`app.js:994-1004`); every other brand gets text copy. iOS export code exists but is hidden (`4d0f985`) and frozen at the April state. ROADMAP's status row (`docs/planning/ROADMAP.md:24` area) still says "disabled," which is stale.

### 1.2 Root cause 1 (architectural): export re-parses display strings

`resolveProfile` emits human-readable display strings ("Enabled, Monotonic line", "5–8 mm", "Tree Hybrid"). `exportBambuStudioJSON` then reverse-engineers slicer values out of those strings with `_extractValue` (`engine.js:2952-2968`) and roughly ten per-key regex handlers (`engine.js:3016-3104`). Consequences:

- Any copy change anywhere in `resolveProfile` can silently corrupt an exported value. Nothing ties display copy to export output.
- The export path is a second, parallel emission pipeline. Every engine improvement (env scaling, clamps, new params) must be manually mirrored into it. Two misses are already on record (fan scaling, draft_shield); one is still live (retraction, HIGH-001).
- IMPL-039 built the correct machinery (`slicer_capabilities.json` valid-value sets plus `mapForSlicer`, `engine.js:1010` area) but export predates it and does not use it (MEDIUM-008 duplication).

### 1.3 Root cause 2 (process): no closed verification loop

Export correctness is defined by an external program's import behavior, and there has never been a repeatable way to check it:

- No golden-file fixtures captured from real Bambu Studio exports to diff against.
- No automated test asserting export values equal the resolved profile values.
- No recorded manual import test after the fix wave. The feature shipped on assumption twice (April 5 and April 6).
- The hardcoded coupling surface is wide and version-sensitive: exact system preset names in `BAMBU_PROCESS_INHERITS` (`engine.js:2846-2856`, with x1e/p2s/x2d/h2d_pro sharing X1C presets "until verified"), filament parent suffixes (`engine.js:2901-2918`), a pinned `version: '2.5.0.14'` (`engine.js:3012`, LOW-007), and plate-temp guesses (cool plate = bed minus 20, `engine.js:3141-3142`). Bambu Studio releases move; nothing here tracks them (CR1-L1).

### 1.4 Known open defects in the live path (verified in code 2026-07-05)

| Finding | Location | State |
|---|---|---|
| HIGH-001 unscaled retraction (exports raw `bs.retraction_distance`, not the engine's scaled value) | `engine.js:3149-3152` | Open, acknowledged in a code comment |
| internal_solid_infill_pattern exports "zig-zag" on the default path | `engine.js:3077` | **Contested.** IMPL-036 calls it invalid; the newer IMPL-039 audit lists "zig-zag" as valid for Bambu Studio (`data/rules/slicer_capabilities.json`). Resolve empirically in Phase 0, not by picking a document. |
| Ironing regex heuristic, no ironing_pattern export | `engine.js:3024-3027` | Open (IMPL-036 3a/3b) |
| support_style maps 2 of 5 options | `engine.js:3081-3084` | Open (IMPL-036 3d) |
| `_extractValue` fallback gaps | `engine.js:2952-2968` | Open (MEDIUM-006) |
| Hardcoded version string | `engine.js:3012` | Open (LOW-007) |
| iOS export frozen at April state, hidden | iOS repo, `4d0f985` | Open |

## 2. Goal

Native, verified, low-drift profile export for all three routed slicers:

1. **Bambu Studio** (4 of 14 brands route here): stabilized JSON export, verified by golden-file tests and a recorded import test.
2. **OrcaSlicer** (10 of 14 brands route here, the default majority): native JSON preset export.
3. **PrusaSlicer** (Prusa brand routes here): native `.ini` config bundle export.

And structurally: one emission pipeline, so the export path can never silently drift from what the UI shows again.

## 3. Non-goals

- No `.3mf` project export, no printer (machine) profile export; process + filament only, same as today's Bambu scope.
- No per-slicer UI redesign beyond the export button group; the existing process/filament/copy pattern (`index.html:127-132`) extends to the new slicers.
- No new analytics beyond the existing `export_clicked` event (`app.js:819`).
- No custom/user filament export (that arrives with IMPL-044 and rides on this plumbing).
- iOS export UI un-hiding is a follow-up train, gated on web being proven (section 8).

## 4. Design

### Phase 0: truth first (no product code changes)

The April failure repeated because fixes shipped without a verification loop. Build the loop before touching the pipeline.

1. **Golden fixtures.** Owner exports real presets from current Bambu Studio, OrcaSlicer, and PrusaSlicer (one process/print profile and one filament profile each, for one known printer per slicer). Commit them under `scripts/fixtures/slicer-golden/`. These are ground truth for field names, types, wrapping, and version strings. This is the only step needing the owner's machines; everything after runs headless.
2. **Export test harness.** `scripts/export-audit.js` (walkthrough-harness loading pattern, `scripts/walkthrough-harness.js:1`): for a matrix of states, run `exportBambuStudioJSON` and diff every emitted key against (a) the golden fixture's key set and value formats and (b) the resolved profile's values for shared params. Report unknown keys, type mismatches, and value disagreements.
3. **Resolve the contested claims empirically:** zig-zag validity, current BS `version` string, whether inherits parents still match installed preset names, whether `only_one_wall_top` boolean form still imports. Output: a short findings table appended to this spec before Phase 1 starts.
4. **Manual import test, recorded.** Import the current live export into Bambu Studio once, note exact behavior (accepted, rejected, values wrong) in the session log. This closes the loop the April work never closed, and it tells us how broken the live Beta actually is for users today.

### Phase 1: one pipeline (execute IMPL-036, modernized)

Adopt IMPL-036's principle with IMPL-039's machinery: **params carry canonical slicer values; display strings are derived; export is passthrough.**

1. Data: add the five IMPL-036 fields to `objective_profiles.json` surface entries (seam_position, only_one_wall_top, ironing_type, ironing_pattern, internal_solid_infill_pattern) storing canonical values, per IMPL-036 Step 1.
2. Engine `resolveProfile`: read canonical values, derive display labels via lookup tables, and attach the canonical value to each param as a `_slicer_value` sidecar (same pattern as the `_prov` provenance sidecar), so export never parses display text.
3. Engine export: replace the regex handler chain (`engine.js:3016-3104`) with: take `_slicer_value` when present, else the numeric value, then pass through `mapForSlicer` against `slicer_capabilities.json` for pattern-class fields. Delete `_extractValue` heuristics that become dead.
4. Fix the accumulated defects in the same pass, each as its own commit: HIGH-001 scaled retraction (read the resolved profile's scaled value), ironing type/pattern split, support_style 5-option map, version string hoisted to a module constant set from Phase 0 findings.
5. Every param exported must have a harness assertion that the exported value equals the resolved value (drift guard). This is the structural guarantee that root cause 1 never returns.

### Phase 2: Bambu Studio hardening

1. Reconcile `BAMBU_PROCESS_INHERITS` and filament overrides against Phase 0 findings; document each placeholder (x1e, p2s, x2d, h2d_pro) as verified or corrected (closes CR1-L1).
2. Failure-tolerant import UX: a short "How to import" hint under the export buttons (slicer version note, where the file lands in BS). Cheap, and it converts silent failures into understood ones.
3. Re-run the recorded manual import test on the rebuilt output. Green import is the exit gate for calling Bambu export stable and removing the Beta badge.

### Phase 3: OrcaSlicer export (the majority path)

Orca is a Bambu Studio fork and its user presets are the same JSON shape with vendor-profile inherits. 10 of 14 brands route to Orca, so this is the highest-value new surface in the spec.

1. `exportOrcaJSON(state)` in the engine: shares the Phase 1 passthrough pipeline; differences are the inherits strategy and a small key delta discovered from the Orca golden fixtures, not a new mapping architecture.
2. Inherits strategy for non-Bambu machines: target the Orca vendor profile for the selected printer where one exists (Orca ships vendor profiles for most of our 14 brands); fall back to a standalone profile with no inherits if the fixture work shows Orca accepts that (validate in Phase 0, do not assume).
3. Web UI: the export button group appears for Orca-routed printers; text copy remains as the fallback path it is today (`app.js:1005-1006`).

### Phase 4: PrusaSlicer export

PrusaSlicer imports `.ini` config bundles (`[print:name]` and `[filament:name]` sections, flat key=value). Different serializer, same pipeline input.

1. `exportPrusaINI(state)`: emit a config bundle from the same canonical values through a Prusa key map. The format is text and forgiving; unknown keys warn rather than hard-fail, which lowers risk relative to Bambu JSON.
2. Validate against the Prusa golden fixture; record one manual import test.
3. Web UI: export button for Prusa-routed printers, downloading `.ini`.

## 5. Engine and data changes

Yes, substantial and deliberate (unlike IMPL-042 this is an engine-heavy spec): `objective_profiles.json` gains the five IMPL-036 fields; `resolveProfile` gains canonical-value sidecars; export functions rebuilt on passthrough; two new export functions. Public API additions: `exportOrcaJSON`, `exportPrusaINI`. **The mandatory data/logic-change evaluation is section 6.**

## 6. UI changes: web and iOS (mandatory evaluation)

- **Web (functional):** export group shown for all three slicers, not just Bambu (`app.js:988-1010` branch rewritten); per-slicer button labels and file extensions; "How to import" hint; Beta badge removal only after each slicer's recorded import test passes.
- **Web (none needed):** results rendering, chips, advanced view; canonical-value sidecars are invisible to existing UI.
- **iOS (engine sync, mandatory):** engine.js and data changes copy byte-identical to iOS per the standing rule, walkthrough parity assertions mirrored in XCTest. This happens in the same train as each web phase; the iOS *UI* remains hidden.
- **iOS (UI, follow-up train):** un-hide the export share sheet only after web Phase 2 exit gate is green, as its own version with the push gate respected. Universal-link/share interplay is IMPL-042's concern, not this spec's.

## 7. Test plan / gate

This touches engine and data, so the full profile-data-change gate applies (`docs/runbooks/profile-data-change-test-protocol.md`):

- `node scripts/validate-data.js` extended with range/enum checks for the five new objective_profiles fields.
- `node scripts/walkthrough-harness.js` extended with: per-slicer export drift assertions (exported value equals resolved value for every shared param), the existing HIGH-01 env-fan assertions kept green, retraction-scaling assertion (RED first against the current bug, proving HIGH-001, then green after the fix).
- `node scripts/profile-matrix-audit.js` stays green (proves resolveProfile display output unchanged where intended).
- New `scripts/export-audit.js` fixture diffs for all three slicers run in CI alongside the harness.
- iOS: byte-identical sync plus full XCTest per train.
- Manual, recorded: one import test per slicer per phase exit (Bambu Phase 2, Orca Phase 3, Prusa Phase 4). A slicer's export does not lose its Beta badge without one.

## 8. Rollout and sequencing

1. Phase 0 first, alone. Its findings can rescope Phases 1-4 cheaply (that is the point). Owner involvement: exporting 6 golden files and 3 import tests, roughly an hour total across the whole spec.
2. Phase 1 next, one finding per commit. This is the highest-risk phase (engine surgery) and it is fully covered by the harness before any new slicer ships.
3. Phase 2 before 3 before 4: harden the existing surface before widening it; Orca before Prusa because it serves 10 brands versus 1.
4. Each phase is independently shippable and revertible; web deploys per push, iOS rides scheduled trains.
5. On completion, retire IMPL-036 (absorbed), close ROADMAP Phase 2.7a and the IR-deferred export findings block, and fix the stale ROADMAP status row.

## 9. Risks

- **Slicer format drift is permanent.** Golden fixtures pin a version, then age. Mitigation: fixtures are dated, the export-audit harness makes refreshing them a 10-minute owner task, and the import hint sets user expectations. Accept: this surface will always need occasional maintenance; the harness turns "silently broken" into "cheaply detected."
- **Orca vendor-profile inherits may be inconsistent across our 14 brands.** Mitigation: Phase 0 validates the standalone-profile fallback before Phase 3 commits to a strategy.
- **Phase 1 touches resolveProfile display output.** Mitigation: matrix audit diff must be empty except where IMPL-036 intentionally changes labels; those diffs are enumerated in the commit message.
- **Scope creep into machine profiles or 3mf.** Explicitly out (section 3); revisit only after all three slicers are stable.

## 10. Standing-rules check

- engine/app separation: respected; all export logic stays in the engine, app.js only wires buttons.
- Web is master, iOS mirrors byte-identical: every engine/data phase syncs to iOS with tests in the same train (section 6).
- Mandatory web + iOS evaluation: section 6.
- One finding = one commit: defect fixes in Phase 1 are individually committed.
- iOS push gate: respected; iOS pushes only on TestFlight-ready trains.
- Privacy: no new data collection; `export_clicked` event already exists and carries no new dimensions.
- Quality over speed: Phase 0 exists precisely because this feature shipped on assumption twice; no slicer loses its Beta badge without a recorded real import test.
