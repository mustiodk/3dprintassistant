# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-06 (after the learns-export merge + Bambu import-test PASS + Orca fixture capture).
**Locked next entry point:** **W3 Mine-tier engine train** — IMPL-044 plan Part 2 (the "rest" of the configurator-that-learns work; now unblocked because IMPL-043 P1 export is merged + live).

Copy everything between the markers into a new session.

>>> START >>>
3dpa cold start.

Read in order before doing anything:
1. `~/dev/Claude/Projects/CLAUDE.md` (top-level protocol)
2. `3dprintassistant/CLAUDE.md` (project)
3. `3dprintassistant/docs/3dpa-context.md` (evergreen architecture, engine API, app state, standing rules)
4. `3dprintassistant/docs/planning/ROADMAP.md` (live status + Active Work Queue — TRUTH; read fully)
5. `3dprintassistant/docs/sessions/INDEX.md` then the last 3 session logs in full (start with `2026-07-06-cowork-appdev-learns-export.md` incl. its evening Addendum)
6. This `NEXT-SESSION.md`
7. Task source: `3dprintassistant/docs/superpowers/plans/2026-07-06-impl-044-w3w4-plan.md` (Part 2 = Mine-tier engine train) + `docs/specs/IMPL-044-W3W4-mine-tier-and-custom-filaments.md`

**Today's task:** implement the **W3 Mine-tier engine train** — the engine-side layer that actually CONSUMES the Workshop tuning offsets that shipped (app-layer) on 2026-07-06.
Scope (from plan Part 2 — re-ground exact line numbers at execution, they drift):
- Mine tier = **Safe base + personal deltas** (NOT Tuned). Inject accepted tuning offsets:
  - temp deltas at the existing env-adjustment points (upper caps reused positionally; **LOWER-bound temp floors are NEW code**),
  - fan 0–100 bounds are **NEW code on exactly 3 emissions**,
  - retraction delta applies **post-`_scaleRetraction`**,
  - engine validates the injected `pairKey` against current state at every resolve (stale-injection guard),
  - provenance tag `personal`.
- Custom-filament overlay: mandatory `templateId`, sender-side share-URL substitution.
- The rules table is TRANSITIONAL app-layer — the plan notes migrating magnitudes into `troubleshooter.json` `remedy` blocks on this train; confirm scope with owner before doing the migration vs deferring.

**Process (Full lane — this is an engine change):**
- TDD RED-first. Use the value-level golden snapshot as the safety net: `node scripts/engine-golden-snapshot.js --check` must be clean before you start; regenerate + **enumerate every diff** at each engine commit (an "app-layer-only" step must show an EMPTY diff).
- Baseline comparators before touching engine: `node scripts/validate-data.js 2>&1 | shasum -a256`, `node scripts/walkthrough-harness.js 2>&1 | shasum -a256`, matrix-audit stable hash = `node scripts/profile-matrix-audit.js 2>&1 | grep -v '^Generated:' | shasum -a256`.
- **Mandatory web + iOS impact eval** (engine/data rule). Mirror `engine.js` + any `data/` change byte-identical to iOS; run iOS XCTest. **iOS `WorkshopStore` ordered emitter DROPS unknown envelope keys — the iOS train MUST add key-preservation for `tuning`/`userMaterials` and regenerate the byte-compat fixture.** (iOS `c647982` is already 1 local commit ahead from the export mirror; stays local under the push gate.)
- One accepted finding = one commit per platform. Cross-model review (`bridge --health` then `bridge --mode codex-only`) before any hard-to-reverse step.

**Do NOT:** push iOS to `main` or dispatch TestFlight (push gate); remove the `USE_LEGACY_EXPORT` fallback; start Export Phase 2/3/4 or the `max_mvs` fix unless the owner re-prioritizes (they're queued in ROADMAP, not today's task).

**Standing rules:** ROADMAP is truth (read before any status claim). engine.js/app.js never merge. PARAM_LABELS stay English. localStorage in try-catch. EN+DA locale parity for any new copy. Commit≠deploy — verify live before asserting prod state. Web auto-deploys from `main`; iOS is push-gated.

Confirm understanding in 3–5 bullets + the locked entry point in one sentence, then ask whether to proceed on the Mine-tier train or pivot to one of the queued items (max_mvs 0.8 data fix / Export Phase 2 / Orca Phase 3).
<<< END <<<

## Also queued (owner-pick, not today's default)
- **`max_mvs` 0.8mm-nozzle data gap** — quick data-only accuracy win; `data/materials.json` missing `0.8` `max_mvs` keys (17 materials; `hips` also `0.2`). See ROADMAP Active Work Queue.
- **Export Phase 2** — 2-element per-extruder arrays + ironing UI split + Beta-badge removal (gate-cleared by the passed import test).
- **Export Phase 3 (Orca)** — fixtures captured at `scripts/fixtures/slicer-golden/orca-x1c-*-ref.json`; Orca is a BS fork so it's a small delta on the Bambu passthrough.
- **iOS v1.0.6 TestFlight train** — bundles `c647982`; check `PHASE2-GATE-LEDGER.md` I5 note (other machine's data-mirror commits) first.

## Maintenance Note
Regenerated on Trigger A / Trigger B / explicit owner ask only. Locked entry = W3 Mine-tier engine train (IMPL-044 plan Part 2), not export phases.
