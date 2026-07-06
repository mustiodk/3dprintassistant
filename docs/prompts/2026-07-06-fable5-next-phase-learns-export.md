# Fable 5 — Next Phase Kickoff: Configurator-that-Learns + Export Activation

**Created:** 2026-07-06 · **Author:** Fable 5 (approved) · **How to run:** paste the fenced
block below into a fresh Claude Code session, from the `3dprintassistant/` working tree.

**Owner precondition (Track A only):** export the 6 golden slicer files first, per
[`scripts/fixtures/slicer-golden/README.md`](../../scripts/fixtures/slicer-golden/README.md).
Track B needs no homework and runs regardless.

**Source plan:** `docs/reviews/2026-07-05-fable5-phase1-review.md` (V2 addendum) +
`docs/specs/IMPL-044-profiles-workshop.md` (W3/W4) + `docs/specs/IMPL-043-slicer-export-activation.md`.
**Progress source of truth (created at G0):** `docs/planning/LEARNS-EXPORT-GATE-LEDGER.md`.

---

```markdown
# Fable 5 — 3DPA Next Phase: Configurator-that-Learns + Export Activation — Fresh Session

You are Fable 5 (Claude Code) resuming 3D Print Assistant in a fresh session. This session
covers TWO independent, gated tracks. Engine changes are the highest-risk surface in the
repo (engine.js mirrors byte-identical to iOS; a subtle bug corrupts every profile on both
platforms). We work behind a value-level golden snapshot + per-track verification, one gate
at a time, to clean committed boundaries. A single session may only finish Track B — that is
expected and fine; stop at any clean boundary when budget runs low.

## Two tracks (recommended order)
- **Track B first — the configurator-that-learns (IMPL-044 W3/W4).** Fully unblocked.
  Deliverables: (1) a design SPEC for the Mine tier + custom filaments, (2) an implementation
  PLAN for it, (3) IMPLEMENT the journal-data-harvesting layer only (app-layer, no engine
  surgery). The Mine-tier `_tier()` injection and the custom-filament overlay are DESIGNED
  and PLANNED this session, NOT built.
- **Track A second — slicer export activation (IMPL-043), Phase 0 → Phase 1.** GATED on
  owner golden files (below). Do this only if the files are present and budget remains.

## Owner precondition for Track A (check at G0)
Track A Phase 0 needs owner-exported golden files in scripts/fixtures/slicer-golden/ (6 real
preset exports: process + filament for Bambu Studio, OrcaSlicer, PrusaSlicer). See that
directory's README.md for the exact list + naming.
- Present → run Track A after Track B if budget allows.
- Absent → build the export-audit harness scaffold + write the exact owner export/import
  instructions into the ledger, then SKIP the rest of Track A. Do not fabricate fixtures.

## Cold start — read in this order
1. Projects/CLAUDE.md  2. 3dprintassistant/CLAUDE.md  3. docs/3dpa-context.md
4. docs/planning/ROADMAP.md (fully)  5. docs/reviews/2026-07-05-fable5-phase1-review.md (V2 addendum)
6. docs/specs/IMPL-044-profiles-workshop.md  7. docs/specs/IMPL-043-slicer-export-activation.md
8. docs/planning/PHASE2-GATE-LEDGER.md (what W1+W2 already shipped)
9. docs/sessions/INDEX.md + last 3 session logs.
Then confirm understanding in 3–5 bullets and state both tracks' locked scope in one sentence each.

## Operating mode
- Fully autonomous, no questions. ONE gate at a time to a clean committed (web: pushed)
  boundary. Track progress in docs/planning/LEARNS-EXPORT-GATE-LEDGER.md (create at G0): one
  row per gate, tick box + commit hash in that gate's final commit. Ledger + git log is the
  resume surface — never rely on conversation context.
- Full lane (engine + specs + cross-platform). Progress bar every step.

## G0 — Shared safety baseline (no behavior change)
- Work on a branch. Tag the known-good commit: `git tag learns-export-baseline-<YYYYMMDD>`.
- Write scripts/engine-golden-snapshot.js: dump FULL engine output (resolved profile + warnings
  + checklist + current export payloads) across the matrix to a deterministic, committed
  scripts/fixtures/engine-golden.json — the value-level regression net.
- Capture baseline shasums of validate-data, walkthrough-harness, profile-matrix-audit
  (`2>&1 | shasum -a 256`); run iOS XCTest; record pass count + MARKETING_VERSION.
- Run the Track A precondition check. Commit snapshot script + golden file + ledger.

## TRACK B — configurator-that-learns (IMPL-044 W3/W4)

**B1 — Design spec (creation artifact, NO code).**
Write docs/specs/IMPL-044-W3W4-mine-tier-and-custom-filaments.md (or extend IMPL-044 in place —
pick one, state which). It must nail:
- The journal→suggestion HARVEST model: how journal outcomes (the W2 `{result, symptoms[],
  date}` records) aggregate per printer+material pair; the threshold rules (e.g. N failures of
  a symptom); how each aggregate maps to a BOUNDED offset drawn from the troubleshooter's own
  remedy rules (data/rules/troubleshooter.json) — and where the offset magnitudes live
  (structured in troubleshooter data vs a new small mapping table; decide and justify).
- The suggestion data shape + accept/dismiss/persistence model (never silently applied).
- The Mine-tier design: injecting a `personal`-provenance overrides object through the existing
  `_tier()` path (engine.js:77), structurally identical to `_tuned` blocks; clamp precedence
  (Mine never overrides safety clamps); `_prov` sidecar rendering.
- The W4 custom-filament design: `user_*`-namespaced user-materials overlay merged at engine
  init, IMPL-039 clamping, cannot silence warnings, share-URL inline-vs-exclude decision.
- Mandatory web + iOS impact evaluation; test-gate outline; standing-rules check.
Then run a cold-read spec review (repo spec-reviewer convention) + one cross-model review
(ai-collab.md routing: bridge --mode codex-only after `bridge --health`, or codex exec fallback);
apply findings. Commit spec + review notes.

**B2 — Implementation plan (creation artifact, NO code).**
Write docs/superpowers/plans/2026-07-XX-impl-044-w3w4-plan.md using the writing-plans discipline:
exact files, tasks, tests, commands, expected outputs, commit boundaries (one logical change
each), review gates, rollback notes, no placeholders. Include the mandatory data/logic-change
web+iOS evaluation. Plan-gate review (cross-model); revise. Commit plan + review notes.

**B3 — Implement the journal-harvesting layer ONLY (app-layer, TDD-first).**
- New app-layer module (e.g. workshop-tuning.js) + Node tests in the picker-dry-run.test.js
  style: reads the Workshop journals, aggregates per printer+material, emits bounded offset
  SUGGESTION candidates per the B1 model, plus accept/dismiss persistence in the Workshop
  envelope. Genuine RED first.
- HARD LINE: this touches NO engine.js resolveProfile / `_tier()` path and NO data/ files. If
  it appears to need an engine change, that is the signal it belongs in the B1 spec + B2 plan,
  not here — stop and record it, don't build it.
- Regenerate scripts/fixtures/engine-golden.json → diff MUST be empty (proves engine untouched).
  validate-data + walkthrough + matrix-audit green & unchanged. New EN+DA locale keys for any
  new copy. Web commit + push. (iOS Workshop is its own future train — no iOS work here.)

## TRACK A — slicer export activation (IMPL-043) — only if golden files present + budget remains
Run Phase 0 then Phase 1 exactly per docs/specs/IMPL-043-slicer-export-activation.md:
- **A-P0:** scripts/export-audit.js (walkthrough loading pattern) diffing each export vs the
  owner golden fixtures and vs resolved-profile values; resolve the contested claims empirically
  (zig-zag validity, BS version string, inherits parents, only_one_wall_top form); append a
  findings table to IMPL-043 §1.4; record the owner's manual import-test result. NO product code.
- **A-P1 (one finding = one commit):** add the 5 canonical fields to objective_profiles.json;
  resolveProfile attaches `_slicer_value` sidecars + derives display labels; export becomes
  passthrough via mapForSlicer (delete _extractValue regex heuristics); fix HIGH-001 scaled
  retraction (RED-first proving the current bug), ironing type/pattern split, support_style
  5-option map, version→module constant. After EVERY gate: regenerate the golden snapshot and
  enumerate each intentional delta; add the drift-guard assertion (exported value == resolved
  value) per param; matrix-audit diff empty except enumerated IMPL-036 label changes; all
  harnesses + export-audit green; mandatory web+iOS eval each gate. Web commit + push.
- **A-iOS mirror:** cp engine.js + changed data byte-identical to iOS; regenerate iOS
  golden/fixtures; full XCTest green. LOCAL commits only. Do not touch the hidden iOS export UI.
- **A-review:** cross-model review of the engine+export diff; one finding = one commit; re-run gates.
Do NOT start IMPL-043 Phase 2/3/4 (Bambu hardening / Orca / Prusa) or remove any Beta badge.

## WRAP — always, even partial
Session log + INDEX + ROADMAP tick (+ the stale export-status-row fix if still present).
Findings + memory + vault sweep (explicit "nothing to add" if so). Final plain-language summary:
what shipped (Track B harvesting + which specs/plans landed), Track A status (Phase 0 findings or
"blocked on golden files"), golden-diff summary, every commit hash, gate status, and my exact
remaining owner actions.

## Hard boundaries (both tracks)
- Track B: harvesting is app-layer only — NO engine.js / _tier / data change. Mine tier + custom
  filaments are SPEC + PLAN only this session; do not implement them.
- Track A: no fabricated fixtures; if golden files absent, scaffold + stop. No Phase 2/3/4; no
  Beta-badge removal without a recorded import test.
- Do NOT push iOS or dispatch TestFlight — mine. Web is master; no iOS-only engine edits.
- If any golden-snapshot delta can't be explained, or any harness/XCTest goes red and can't be
  made green cleanly, STOP at the last clean boundary and report. No papering over.
- No scope creep beyond the two locked tracks. Log stray ideas, don't build them.

## Standing rules (bind every commit)
- engine.js (logic) / app.js (UI) never merge. PARAM_LABELS stay English. localStorage in
  try-catch. New web copy gets EN+DA keys. One logical change = one commit, all touched files
  staged. Quality over speed — cut whole scope, never narrow a change to dodge a gate.
```

---

## Maintenance note

Regenerated only on explicit owner ask. If IMPL-043 or IMPL-044 change materially before this
runs, refresh the relevant track. The gate ledger (`docs/planning/LEARNS-EXPORT-GATE-LEDGER.md`)
is the live progress surface once the session starts; this file is the frozen kickoff.
