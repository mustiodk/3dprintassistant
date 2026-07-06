# 2026-07-06 — Cowork (appdev): Learns + Export — W3/W4 design + harvesting, IMPL-043 Phase 0+1 (ALL ON BRANCH)

> Fully autonomous gated run (Fable 5). **Everything lives on branch `learns-export-20260706` (pushed as remote backup); NOTHING merged to main, NOTHING deployed** — main @ `ad21aa1` (tag `learns-export-baseline-20260706`) stays the pristine fallback. The owner merges after the OWNER-VERIFY steps. Gate-by-gate record + resume protocol + OWNER-VERIFY block: `docs/planning/LEARNS-EXPORT-GATE-LEDGER.md`.

## Durable context

- **The engine now has a value-level golden snapshot** (`scripts/engine-golden-snapshot.js` → committed `scripts/fixtures/engine-golden.json`, 36 states × full output surface, `--check` mode). Every engine-touching commit this session regenerated it and enumerated the diff; every "app-layer only" commit proved an EMPTY diff. This net is reusable for all future engine work — regenerate + enumerate is the new default for engine commits.
- **Baseline-hash discipline:** matrix-audit embeds a `Generated:` timestamp; the stable comparator is `2>&1 | grep -v '^Generated:' | shasum -a 256` (= `3bd3da7c…` at this session's display-stable state). `exportProfile._meta.generated_at` is normalized inside the snapshot generator. Finding filed (`ai-operating-model/docs/findings/2026-07-06-harness-baseline-hashes-capture-volatile-lines.md`, N=2 family).
- **Export root-cause is structurally closed on the branch:** params carry canonical `_slicer_value` sidecars; `exportBambuStudioJSON` is passthrough; the April regex pipeline is preserved VERBATIM as `_exportBambuStudioJSONLegacy` behind `USE_LEGACY_EXPORT=false` — the one-line flip is the production fallback if the owner import test fails. Delete the legacy path only after that test passes.
- **Bambu Studio facts pinned from the owner's golden fixtures:** process schema 2.5.0.14 vs filament 2.5.0.18 (split constants); BS 2.5 writes 2-element per-extruder-variant arrays (`["v","v"]`, `print_extruder_variant`) — whether the app's 1-element form imports is THE open question for the import test; zig-zag IS capability-valid but the export now emits `rectilinear` (matches display + data canonical — deliberate, audit-pinned); cross-printer filament inherits are legit (the owner's own X1C preset inherits a P1S parent); BS user-preset booleans are string "0"/"1"; BS internal-solid has NO `monotonic` (IMPL-036's fine-surface value must route through mapForSlicer).
- **Workshop tuning ledger is op-log based:** every accept/revert is an op with a unique opId; cumulative `value` is derived+clamped; backup import merges by op-union (fork-lossless, idempotent, single atomic write). The `tuning` envelope section is additive — W1-era envelopes and iOS parse unchanged, but the iOS ordered emitter DROPS `tuning` on re-export (known narrow gap; MUST-fix scheduled in the W3 iOS train per the plan).
- **Accepted tuning offsets are consumed by NOTHING yet.** The Mine tier (engine injection) is designed + planned only; the W3 engine train is sequenced AFTER IMPL-043 P1 merges (retraction card-equals-output depends on the export passthrough).
- **W3/W4 design decisions that bind the future train:** Mine = Safe base + personal deltas (not Tuned); temp deltas join at env-adjustment points (upper caps reused positionally, LOWER bounds are NEW code); fan 0–100 bounds are NEW code on exactly 3 emissions; retraction delta applies post-`_scaleRetraction`; engine validates the injected `pairKey` against state at every resolve (stale-injection guard); rules-table magnitudes are TRANSITIONAL app-layer — migrate into troubleshooter.json `remedy` blocks on the engine train; custom filaments carry mandatory `templateId` with sender-side share-URL substitution.

## What happened / Actions

All commits on `learns-export-20260706`, branch pushed at every gate:

- **G0** `66b053e` — golden snapshot + ledger; baselines (validate-data + walkthrough identical to Phase-2 W0; iOS XCTest 125/125; Track A precondition PASS: Bambu+Prusa golden present, Orca deferred per versions.md).
- **Track B (configurator-that-learns):**
  - B1 `57148e2` — W3/W4 design spec (`docs/specs/IMPL-044-W3W4-mine-tier-and-custom-filaments.md`), dual-reviewed: `bridge --mode codex-only` (4 MUST + 7 SHOULD) + cold-read hostile sub-agent (4 HIGH + 6 MED + 4 LOW; TRUTH/PARENT-RULE clean) — convergent on TPU-retraction hazard, missing fan bounds, retraction-scaling location, merge losslessness; all dispositioned in `docs/reviews/2026-07-06-w3w4-spec-review.md`.
  - B2 `e1c2e51` — implementation plan (`docs/superpowers/plans/2026-07-06-impl-044-w3w4-plan.md`, writing-plans discipline); plan-gate bridge review (5 MUST + 5 SHOULD + 1 OPT) all applied — atomic import write, per-symptom anti-ride, nozzle-bucket dates, PETG fan row, honest rollback caveat.
  - B3 `bc79d3e`→`e659a50` (4 commits, all RED-first) — `workshop-tuning-rules.js` (60 checks; every sourceRef resolves to a real troubleshooter cause), store `tuning` section (op-log + atomic merge), `workshop-tuning.js` harvest (34 checks), Workshop suggestions UI + My tuning + 14 EN+DA keys. Preview-smoked both themes + DA (fire→accept→anti-ride→re-surface→deep-link→remove→dismiss→conflict). Golden diff EMPTY throughout — engine/data untouched, proven.
- **Track A (export activation):**
  - A-P0 `e19c6fd` — `scripts/export-audit.js` vs golden fixtures + resolved values; 3 FAIL documented live (filament version, HIGH-001 retraction 0.6-vs-0.4 on 0.2 nozzle, ironing_pattern absent); contested claims resolved empirically (IMPL-043 §1.4b, F1–F10).
  - A-P1 `75e67b1`, `e880574`, `a0f3dcf`, `fe8fb02`, `50fc57b`, `62f7a23` — canonical data fields (behavior-mirroring; display byte-identical by matrix-audit hash) → passthrough export (exactly ONE payload delta vs legacy: internal_solid zig-zag→rectilinear) → the 4 defect fixes, one commit each, each flipping its A-P0 audit FAIL to PASS. Ledger tick `4764cea`.
  - A-iOS — iOS LOCAL `c647982` (byte-identical mirror, XCTest 125/125, NOT pushed per gate).
  - A-review `7d5df7b` — bridge codex-only on the diff: rewrites verified behavior-identical, no missing sidecars; applied audit hardening (35-check generic sidecar drift guard, 4 support_style assertions, rectilinear pin). **export-audit final: 0 FAIL / 1 warn** (dual-extruder arrays = owner import test). Notes: `docs/reviews/2026-07-06-impl043-p1-export-review.md`.
  - OWNER-VERIFY — candidate exports staged at `scripts/fixtures/slicer-golden/_owner-verify/` (in `7d5df7b`); full block in the ledger.
- Not started (out of locked scope): IMPL-043 Phase 2/3/4, Beta-badge changes, W3/W4 engine implementation, S1 landing pages.

## Files touched

Web (branch): `engine.js`, `data/rules/objective_profiles.json`, `workshop-tuning.js` + `workshop-tuning-rules.js` (new), `workshop-store.js`, `app.js`, `index.html`, `style.css`, `locales/en.json`, `locales/da.json`, `scripts/engine-golden-snapshot.js` (new), `scripts/export-audit.js` (new), `scripts/workshop-tuning.test.js` + `scripts/workshop-tuning-rules.test.js` (new), `scripts/workshop-store.test.js`, `scripts/validate-data.js`, `scripts/fixtures/engine-golden.json` (new), `scripts/fixtures/slicer-golden/_owner-verify/*` (new), specs IMPL-043 (§1.4b) + IMPL-044-W3W4 (new), plan 2026-07-06-impl-044-w3w4, reviews ×2 (new), `docs/planning/LEARNS-EXPORT-GATE-LEDGER.md` (new), ROADMAP, sessions INDEX + this log.
iOS (local only): `3DPrintAssistant/Engine/engine.js`, `3DPrintAssistant/Data/rules/objective_profiles.json`.
ai-om: findings file + INDEX line.

## Commits

Branch `learns-export-20260706` (pushed): `66b053e` G0 · `57148e2` B1 · `e1c2e51` B2 · `bc79d3e`/`395bc54`/`69c1ebb`/`e659a50` B3 · `e19c6fd` A-P0 · `75e67b1` A-P1a+b · `e880574` A-P1c · `a0f3dcf`/`fe8fb02`/`50fc57b`/`62f7a23` A-P1d · `4764cea` ledger · `7d5df7b` A-review+OWNER-VERIFY · (wrap commit). iOS local: `c647982` (unpushed, 1 ahead).

## Open questions / Follow-up

- **OWNER (the only human steps — ledger OWNER-VERIFY block has full detail):** (1) Bambu Studio import test of the two `_owner-verify` files (checks: accepted; internal solid = Rectilinear; retraction 0.6; watch for the 1-vs-2-element array question); (2) branch review; (3) `git merge --no-ff learns-export-20260706` on main to deploy; (4) fallback = flip `USE_LEGACY_EXPORT=true` if the import fails.
- iOS is 1 local commit ahead (`c647982`) — rides the next TestFlight train after the web merge. (Plus the pre-existing I5-note items: TestFlight v1.0.6 dispatch + other machine's data-mirror commits.)
- W3 engine train (Mine tier) is fully planned, sequenced AFTER this branch merges; W3 iOS train MUST add envelope key-preservation (`tuning`/`userMaterials`) + regenerate the byte-compat fixture.
- IMPL-043 Phase 2 (Bambu hardening incl. the display-side ironing param split + possibly 2-element arrays), Phase 3 Orca (owner: Orca golden fixtures when reinstalled), Phase 4 Prusa — later passes.
- Md-hygiene: session-created docs scanned — no stray tags; findings INDEX parity kept; carried doc-drift note (3dpa-context state example `room_temp`) still open.
- Lesson-spotter (compact): 1 K3 filed (volatile baseline lines, N=2 family). Also self-caught in-session before any commit: the gate ledger was initially drafted with pre-narrated ticks/hashes — rewritten empty-first immediately; lesson = ledgers record the past, never the intended future (no file/commit ever contained the fabrication; noted here for honesty).
- Memory sweep: no durable memory to add (all facts are repo-documented in the ledger/specs). Vault sweep: nothing durable to propagate — checked strategic/shorthand/cross-project/hobby/consulting/external-source; the one cross-project lesson went to the ai-om findings ledger instead.
- verify-before-mutate summary: 0 flags (0 resolved-same-turn, 0 resolved-late, 0 unresolved), 0 destructive-core, 24 unclassified, 0 generated-write.

## Addendum — 2026-07-06 evening (owner-verify → merge → Orca capture)

Same session, continued after the wrap above. All on/into `main` now:

- **Bambu import test PASSED (owner-run).** `3DPA PLA Basic` selected in BS 2.5 → nozzle 225/220 (real values, distinct from stock 220/220). Then two **sentinel marker files** (`_owner-verify/zz-importtest-{filament,process}.json`, values encoded in the preset names) round-tripped exactly: `ZZ IMPORT-TEST FIL N199 R7.7` → 199/188, flow 0.88, bed 44, max-vol 12; `ZZ IMPORT-TEST PROC W9 I42` → brim 11. **1-element per-extruder arrays import fine** (Phase 0 F8 answered). PASS recorded in the gate ledger OWNER-VERIFY block; commit `fcb36f7`.
- **Merged + deployed.** `git checkout main && git merge --no-ff learns-export-20260706` → merge commit `9e7890d` (clean ort, 30 files), pushed → Cloudflare auto-deploy. `main == origin/main`. iOS `c647982` still local (push gate).
- **PrusaSlicer confusion resolved (owner):** owner tried to load the Bambu JSON into PrusaSlicer — can't (PrusaSlicer config-load whitelists `.ini`, not `.json`; and 3dpa has no Prusa export yet, Phase 4). Not a bug.
- **Orca golden fixtures CAPTURED (Phase 3 prep).** Owner installed Orca, created user presets. Stashed the source JSON at `scripts/fixtures/slicer-golden/orca-x1c-filament-ref.json` + `orca-x1c-process-ref.json`. **Key finding: OrcaSlicer is a Bambu Studio fork — identical key names + `inherits` system-preset names; version string `2.1.0.18`; writes 2-element per-extruder-variant arrays (`filament_extruder_variant: ["Direct Drive Standard","Direct Drive High Flow"]`); a few Orca-only keys (`supertack_plate_temp`).** ⇒ Phase 3 Orca export = a small delta on the Bambu passthrough, not a new serializer.
- **App/web accuracy finding mined from the audit (owner ask):** export-audit's engine-schema check flags `max_mvs` (max volumetric speed) missing the `0.8` nozzle key that `k_factor_matrix` has, across **17 materials** (`hips` also missing `0.2`) — verified directly in `data/materials.json`. 0.8mm-nozzle users get a fallback MVS instead of a material value. Added to ROADMAP Active Work Queue as a data-only DQ fix. Also added: W3 Mine-tier engine train as the locked NEXT entry, and Export Phase 2 (2-element arrays + ironing UI split + Beta-badge removal now gate-cleared).

## Next session

**Locked next entry point: W3 Mine-tier engine train** (IMPL-044 plan Part 2 — the "rest" of the learns work; now unblocked by the export merge). Other queued candidates: the `max_mvs` 0.8 data-gap fix (quick data-only accuracy win), Export Phase 2 (Bambu hardening + Beta-badge removal), Orca Phase 3 (fixtures now in place), S1 landing pages, or the iOS v1.0.6 TestFlight train bundling `c647982`. See ROADMAP Active Work Queue for the full list. Resume via `NEXT-SESSION.md`.
