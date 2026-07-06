# Learns + Export — Gate Ledger (IMPL-044 W3/W4 design + harvest · IMPL-043 Phase 0/1)

**Created:** 2026-07-06 · **Branch:** `learns-export-20260706` (off `main` @ `ad21aa1`, tag `learns-export-baseline-20260706`)
**Prompt:** `docs/prompts/2026-07-06-fable5-next-phase-learns-export.md` · **Specs:** IMPL-044 (W3/W4), IMPL-043 (Phase 0 + 1).
**Rule of the session:** NOTHING merges to main or deploys. Every gate commits on the branch and pushes the branch (backup only). The owner merges after final verification (see OWNER-VERIFY at the bottom when written).

## Resume protocol (any model, any session)

1. Read this ledger top to bottom; first unchecked gate = entry point.
2. `git status` — dirty tree means a gate stopped mid-way: stash, inspect, discard, re-run that gate.
3. Confirm you are ON the branch (`git branch --show-current` → `learns-export-20260706`), not main.
4. Regenerate the golden snapshot (`node scripts/engine-golden-snapshot.js --check`) — drift vs the committed file at a gate boundary means an unexplained engine change: STOP and investigate.
5. Execute exactly one gate, meet exit criteria, commit on the branch, tick the box + hash in the same commit, push the branch.

## Invariants (every gate)

- **Track B hard line:** the harvesting layer (B3) touches NO `engine.js`, NO `data/`. Proof: `engine-golden.json` regen diff EMPTY + validate-data/walkthrough/matrix-audit shasums unchanged from G0 baseline.
- **Track A:** engine/data changes allowed ONLY in A-P1 gates, one finding = one commit, each gate regenerates the golden snapshot and ENUMERATES every intentional delta in the commit message. `USE_LEGACY_EXPORT` module constant retained as instant fallback (default `false` = new passthrough active).
- TDD RED-first per repo convention; localStorage in try-catch; new copy gets EN+DA keys; PARAM_LABELS stay English.
- iOS: byte-identical mirror + full XCTest; LOCAL commits only (push gate).
- Budget exhaustion → stop at last clean boundary, this ledger + git log is the resume surface.

---

## G0 — Shared safety baseline

| Gate | Scope | Status | Commit |
|---|---|---|---|
| **G0** | Branch + tag; `scripts/engine-golden-snapshot.js` + committed `scripts/fixtures/engine-golden.json` (36 states: 15 walkthrough-mirror combos × safe/tuned + 6 env/support/multi variants; full surface: profile/warnings/checklist/temps/advanced/exportRef/text/exportBambu); harness baseline shasums; iOS XCTest baseline; Track A precondition check. | [x] | (this commit) |

---

## TRACK B — configurator-that-learns (IMPL-044 W3/W4)

| Gate | Scope | Exit criteria | Status | Commit |
|---|---|---|---|---|
| **B1** | Design spec for the Mine tier + custom filaments (new file `docs/specs/IMPL-044-W3W4-mine-tier-and-custom-filaments.md` — decision recorded in Notes). Harvest model (journal→aggregate→bounded offsets from troubleshooter remedy rules + offset-magnitude home decision), suggestion shape + accept/dismiss persistence, Mine-tier `_tier()` injection design, W4 `user_*` overlay design, web+iOS eval, test-gate outline, standing-rules check. Cold-read spec review + cross-model review (bridge codex-only / codex exec fallback); findings applied. | Spec + review notes committed on branch. | [x] | (this commit) |
| **B2** | Implementation plan `docs/superpowers/plans/2026-07-06-impl-044-w3w4-plan.md` — exact files/tests/commands/commit boundaries/rollback, web+iOS eval, no placeholders. Plan-gate cross-model review; revised. | Plan + review notes committed. | [x] | (this commit) |
| **B3** | Journal-harvesting layer ONLY (app-layer): `workshop-tuning.js` + Node tests — read Workshop journals, aggregate per printer+material, emit bounded offset suggestions per B1 model; accept/dismiss persistence in Workshop envelope. RED-first. NO engine/data touch. | Tests green; golden-diff EMPTY; harness shasums unchanged; EN+DA keys for new copy; committed + branch pushed. | [x] | `bc79d3e` rules · `395bc54` store · `69c1ebb` harvest · (this commit) UI |

## TRACK A — slicer export activation (IMPL-043 Phase 0 → 1)

| Gate | Scope | Exit criteria | Status | Commit |
|---|---|---|---|---|
| **A-P0** | `scripts/export-audit.js` diffing generated exports vs golden fixtures (Bambu + Prusa; Orca pending) and vs resolved-profile values; resolve contested claims programmatically (zig-zag, BS version, inherits parents, only_one_wall_top). Findings table appended to IMPL-043 §1.4. NO product code. | Harness + findings committed. | [ ] | |
| **A-P1a** | Data: 5 canonical fields in `objective_profiles.json` (seam_position, only_one_wall_top, ironing_type, ironing_pattern, internal_solid_infill_pattern). | validate-data extended + green; golden deltas enumerated. | [ ] | |
| **A-P1b** | Engine: resolveProfile attaches `_slicer_value` sidecars + derives display labels from canonical values. | Walkthrough + matrix-audit green (label deltas enumerated); golden regen enumerated. | [ ] | |
| **A-P1c** | Engine: export passthrough via `_slicer_value`/`mapForSlicer`; `USE_LEGACY_EXPORT` constant (default false) keeps old regex path as instant fallback; drift-guard assertions (exported == resolved) per param. | export-audit green; drift guards green. | [ ] | |
| **A-P1d** | Defect fixes, one commit each: HIGH-001 scaled retraction (RED first), ironing type/pattern split, support_style 5-option map, version→module constant (per A-P0 findings). | Each RED→GREEN; all harnesses green. | [ ] | |
| **A-iOS** | `cp` engine.js + changed data byte-identical to iOS; regen iOS fixtures if needed; full XCTest green. LOCAL commits only. Hidden iOS export UI untouched. | XCTest green; committed locally. | [ ] | |
| **A-review** | Cross-model review of the engine+export diff; one finding = one commit; re-run all gates. | Review notes + fix commits. | [ ] | |

## WRAP + OWNER-VERIFY

| Gate | Scope | Status |
|---|---|---|
| **OWNER-VERIFY** | Generate candidate export files under `scripts/fixtures/slicer-golden/_owner-verify/`; write OWNER-VERIFY block (import tests, branch review commands, merge command, fallback reminder) into this ledger + final summary. | [ ] |
| **WRAP** | Session log + INDEX + ROADMAP tick (+ stale export-status row check); findings/memory/vault sweeps; final summary with every hash + remaining owner actions. | [ ] |

---

## Notes / running log

(Each gate appends: measured baselines, decisions, deferrals, blockers. Facts only — nothing goes here before it actually happened.)

- 2026-07-06 **G0 in progress**: branch `learns-export-20260706` created off `main` @ `ad21aa1`; tag `learns-export-baseline-20260706` set. Golden snapshot script written; needed one determinism fix (normalize `exportProfile._meta.generated_at` — engine.js:3343 stamps wall-clock; normalized in the snapshot script, NOT in the engine). `engine-golden.json` sha256 `2eef9865ab2a9fed116dc6b27f52beb1b564d97d55bc6c15180b3b701ad9e3bd` (728K, 36 states, `--check` rerun clean).
- G0 harness baselines (`node scripts/<s>.js 2>&1 | shasum -a 256`):
  - validate-data `c766befd6976db69dc965c933eb56681cef8576a3807d0cccaa046f9922ccf11` (identical to Phase-2 W0 baseline)
  - walkthrough `c80e437af75dc0fd14a3725ecbf3a6b6636713a3d497b74625073dcc916bbb7c` (identical to Phase-2 W0 baseline)
  - matrix-audit `e0b72fd5fa67a3ecdfa9f38db5e7df5475c3854301775c614f8067c8de7ec0d6` — **CORRECTION (B3):** the audit embeds a `Generated: <ISO timestamp>` line, so the raw-output hash is NOT a stable comparator (false drift alarm at B3 task 4; stash-isolated diff proved the only delta was the timestamp). Canonical comparator from B3 on: `node scripts/profile-matrix-audit.js 2>&1 | grep -v '^Generated:' | shasum -a 256` = `3bd3da7c364d1d273ce4c2b53c9322667dd77224ae9dc6d8e31400fb5d8fed9e` (verified equal on clean-main tree and B3 working tree).
- G0 iOS pre-checks: `main` @ `791d78b` = origin, MARKETING_VERSION 1.0.6, engine.js byte-identical to web (`diff -q` clean). XCTest baseline: **125 unit tests, 0 failures** (`-only-testing:3DPrintAssistantTests`, iPhone 17 Pro sim, CODE_SIGNING_ALLOWED=NO) — matches the Phase-2 I4 count.
- 2026-07-06 **B1 done**: spec written as a NEW file (decision: IMPL-044 stays the evergreen umbrella; W3/W4 detail gets its own topic spec, same pattern as S1–S5). Two reviews ran: (1) `bridge --health` OK on this machine → `bridge --mode codex-only` (119.8s Codex turn) returned 4 MUST + 7 SHOULD + 1 OPT; (2) cold-read hostile sub-agent returned 4 HIGH + 6 MED + 4 LOW with TRUTH/PARENT-RULE dimensions verified clean. Convergent core: TPU-retraction hazard, missing fan 0–100 bounds, retraction scaling lives in resolveProfile not the advanced surface, merge losslessness. Complementary uniques applied: op-id-based accept/revert log + op-union import merge (Codex), NEW lower-bound temp floors + accept anti-ride gate + dismiss date-keying + sourceRef-resolves-to-cause test (cold-read). warping→fan row dropped (no troubleshooter cause — verified). first_layer + TPU-stringing become advice cards (no offset). Rules table declared TRANSITIONAL (migrates into troubleshooter.json `remedy` blocks on the W3 engine train). All dispositions in `docs/reviews/2026-07-06-w3w4-spec-review.md`.
- 2026-07-06 **B2 done**: plan written under the writing-plans discipline (Part 1 = B3 harvesting fully bite-sized with real code/tests; Parts 2–3 = future engine trains with exact interfaces + RED cases, line numbers re-ground at execution; sequencing dependency recorded: W3 engine train AFTER IMPL-043 P1). Plan-gate `bridge --mode codex-only` returned 5 MUST + 5 SHOULD + 1 OPT — all applied (atomic single-write import; per-symptom anti-ride; firing-nozzle-bucket dates; PETG stringing fan row restored; honest rollback caveat — revert forfeits tuning data; dismissible advice/conflict cards; clamps on suggestion objects; secondaries[]; mandatory mechanical-causes line; store clamp-reject + computed revert). Dispositions appended to `docs/reviews/2026-07-06-w3w4-spec-review.md`.
- 2026-07-06 **B3 done** (4 commits, plan Part 1 executed task-by-task, all RED-first): `workshop-tuning-rules.js` (60 checks — every sourceRef resolves to a real troubleshooter cause + material scopes verified) · `workshop-store.js` tuning section (op-log accepts, clamp-defense reject, computed revert, dismissals, ATOMIC single-write import merge — quota-failure test-pinned; W1-era envelopes unchanged) · `workshop-tuning.js` harvest (34 checks: same-nozzle threshold, pair-wide lock-out, DATE-keyed dismiss incl. other-nozzle non-resurface, per-symptom anti-ride, clamp stop, TPU/first_layer advice cards, dismissible conflict cards, unknown-id skip, acceptedFor/revert) · Workshop UI (suggestions section + My tuning + 14 EN+DA keys). **Preview smoke (both themes + DA):** 2-failure card fires with evidence + mandatory mechanical deep-link + secondary hint; accept → My tuning + anti-ride; newer failure → next step (cumulative 0.4); deep-link lands on troubleshooter with symptom chip active; remove → op-count grows, value 0; dismiss works; under/over-extrusion conflict card renders; console = pre-existing warnings only. **Gates:** golden `--check` NO DRIFT; validate-data + walkthrough shasums == G0; matrix-audit timestamp-stripped hash == clean-main (see CORRECTION above); engine/data untouched by construction. Accepted offsets are consumed by NOTHING yet (Mine tier = future engine train, per spec).
- G0 **Track A precondition: PASS (partial set).** `scripts/fixtures/slicer-golden/` holds `bambu-x1c-process.json` (user preset inherits `0.20mm Standard @BBL X1C`, schema version 2.5.0.14) + `bambu-x1c-filament.json` (inherits `Bambu PLA Basic @BBL P1S 0.4 nozzle`, schema version **2.5.0.18** — differs from process, per owner's versions.md note) + `prusa-coreone-config.ini` (PrusaSlicer 2.9.4, 365 settings). **Orca DEFERRED** per `versions.md` (owner reinstalling; native Orca export is Phase 3, later pass). Phase 0 runs Bambu + Prusa.
