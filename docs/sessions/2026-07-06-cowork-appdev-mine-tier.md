# 2026-07-06 — Cowork (appdev): W3 Mine-tier engine train (ON BRANCH — owner verifies then merges)

> Fully autonomous run (Fable 5), started 2026-07-06 evening, wrapped 2026-07-07 early. **Everything lives on branch `mine-tier-20260706` (pushed as remote backup); NOTHING merged to main, NOTHING deployed** — main @ `6c9d4a0` (tag `mine-tier-baseline-20260706`) is the pristine fallback. iOS: 5 LOCAL commits (push gate intact). Gate-by-gate record + OWNER-VERIFY + merge/rollback commands: `docs/planning/MINE-TIER-GATE-LEDGER.md`.

## Durable context

- **The Mine tier is live end-to-end on the branch:** accepted Workshop tuning finally changes `resolveProfile`/temps/advanced/export output — but ONLY in `profileMode:'mine'` AND only when the engine-injected `pairKey` matches the resolving state (`setPersonalTuning` + `_personalFor` are the single injection/read pair; malformed payloads clear fail-safe; values re-clamped engine-side to the closed §3.4 vocabulary bounds).
- **Mine = Safe base + deltas, never Tuned** (spec §5.2). `_tier` gained a 4th `personalOv` arg; speed deltas materialize as absolute outer-wall overrides against the Safe base; accel deliberately stays Safe (no journal evidence ties to accel — decision recorded in the T1 commit).
- **New bounds that didn't exist pre-W3:** temp floors (nozzle ≥ `nozzle_temp_min`, bed ≥ `max(0, base−10)`, personal-path-gated so non-mine bytes can't move) and fan 0–100 bounds on exactly `fan_min_speed`/`fan_max_speed`/`cooling_fan_overhang` (unconditional — provably identity for non-mine, golden-pinned). Retraction delta applies post-`_scaleRetraction`, pre-`retraction_max` cap.
- **Provenance honesty got sharpened by review:** `personal` prov requires the delta to SURVIVE the caps (counterfactual safe-base twin rides the same cap statements — Codex MEDIUM-3; x1c+abs 60↔60 was the repro). The pre-existing `_tuned` ref-suffix marker still has the consulted≠effective looseness (it's a ref suffix, not a source claim) — possible later honesty pass.
- **Share vs persistence split (Codex HIGH-1, the review's best catch):** `encodeToParams` must keep `pm=mine` because the live address bar feeds URL-restore which WINS over localStorage on refresh — mapping there silently reverted Mine to Safe on every reload. The mine→safe substitution lives ONLY in the new `StateCodec.encodeForShare` (share button path). Lesson: a "the address bar is the share URL" convenience and a restore-priority rule can interact into a silent state-loss bug; smoke tests that strip the query string mask it.
- **The iOS ordered emitter no longer drops unknown envelope keys** — `tuning`/`userMaterials` (and future additive sections) survive every write path; import does true op-union merge (web parity, fork-lossless + idempotent); `acceptedFor(printer:material:)` is the Swift injection source. Byte-compat fixture regenerated from the REAL web module with a populated tuning section.
- **Golden discipline held:** 36→39 states (3 mine states added T1); every engine commit regenerated + enumerated; non-mine bytes provably unmoved across all 8 web commits; validate-data + matrix-audit hashes baseline-identical throughout (zero `data/` changes — which is also why the T7 remedy-migration deferral is sound: the spec's "that train opens data/ anyway" premise turned out false).

## What happened / Actions

Web commits on `mine-tier-20260706` (RED-first every task; per-commit golden enumeration):
- `4119625` T1 mode plumbing (setPersonalTuning, pairKey guard, `_tier` mine layer, +3 golden mine states)
- `5c4b94a` T2 temp deltas + NEW floors (both temp surfaces; optional 6th getAdjustedTemps arg)
- `24ce5b8` T3 fan delta + NEW 0–100 bounds (closed 3-emission set; `fan_speed` chip pinned outside)
- `9708f1a` T4 retraction delta post-scale pre-cap (`_slicer_value` carries it — card==output==export)
- `b5aac53` T5 provenance `personal` (spec ref format; per-offset precision; safe never leaks)
- `5538f2e` T6 web UI (conditional `getFilters` mine item + pmMine EN+DA; `syncPersonalTuning` per render + degrade guard; `setView('configure')` rebuild; preview-smoked end-to-end incl. crafted-URL recipient degradation, DA, both themes)
- `cae683d` review HIGH-1 fix (encodeForShare split; browser-verified on the true bug path)
- `55beff8` review MEDIUM-3 fix (counterfactual prov honesty)

iOS LOCAL commits (push gate): `80040e6` engine byte-sync (125/125 green pre-Swift-wiring) · `4d5f2fc` WorkshopStore key-preservation + op-union + acceptedFor + regenerated tuning fixture (stash-run RED evidence) · `76e01f2` EngineService bridge + 5 W3 XCTest mirrors (inverted-first RED `81 != 90` breadcrumb) · `a7b160e` Mine third segment + per-render injection + validProfileMode+mine + locale keys · `2009d84` MEDIUM-3 byte-sync + prov-honesty mirror. Final suite **135/135**.

Verification beyond self: **fresh-context subagent re-ran every gate independently → 9/9 ALL-VERIFIED**; **Codex `bridge --mode codex-only` → NO-GO (2 HIGH, 1 MEDIUM, 1 OBS)** → HIGH-1 + MEDIUM-3 confirmed/reproduced then fixed one-per-commit; HIGH-2 deferred with recorded rationale (export-path session boundary + non-mine golden bytes; queued with HIGH-001 family); OBS-4 already tracked. Post-fix: all gates green both platforms. Scope decision T7 (rules-table→remedy migration) explicitly DEFERRED to the iOS journal/harvest train — trigger ("second consumer") hasn't fired; Codex challenged and agreed it's defensible.

## Files touched

Web (branch): `engine.js`, `app.js`, `state-codec.js`, `workshop-tuning.js`, `locales/en.json`, `locales/da.json`, `scripts/walkthrough-harness.js` (6 W3 blocks), `scripts/engine-golden-snapshot.js` (MINE states + personal-aware capture), `scripts/fixtures/engine-golden.json` (39 states), `scripts/state-codec.test.js`, `scripts/workshop-tuning.test.js`, `docs/planning/MINE-TIER-GATE-LEDGER.md` (new), `docs/planning/ROADMAP.md`, `codex/mine-tier-review/bridge-2026-07-07-000644-951128.md` (new), sessions INDEX + this log, `docs/sessions/NEXT-SESSION.md`.
iOS (local only): `3DPrintAssistant/Engine/engine.js`, `Services/WorkshopStore.swift`, `Engine/EngineService.swift`, `Views/Configurator/GoalsView.swift`, `Views/Output/OutputViewModel.swift`, `Models/AppState.swift`, `Models/AppStateWebCodec.swift`, `Resources/en.lproj/en.json`, `Resources/da.lproj/da.json`, `3DPrintAssistantTests/WorkshopStoreTests.swift`, `3DPrintAssistantTests/EngineServiceTests.swift`.

## Commits

Web `mine-tier-20260706` (pushed as backup): `4119625` → `55beff8` (8) + wrap docs commit. iOS local `main`: `80040e6` → `2009d84` (5 new; 6 total unpushed incl. pre-existing `c647982`).

## Open questions / Follow-up

- **OWNER (the only human steps):** (1) run the OWNER-VERIFY walkthrough in `docs/planning/MINE-TIER-GATE-LEDGER.md` (5-minute local proof: 2 failed stringing prints → Accept → Mine segment → retraction 0.6→0.8 mm with `personal` provenance); (2) review the branch (`git diff mine-tier-baseline-20260706..mine-tier-20260706`); (3) merge (`git checkout main && git merge --no-ff mine-tier-20260706 && git push` — web auto-deploys); (4) rollback = untouched main / revert -m 1 post-merge.
- Deferred, queued in ROADMAP: rules-table→remedy migration (W3-T7 → iOS journal/harvest train) + export retraction display honesty (Codex HIGH-2 → Export Phase 2 / HIGH-001 family).
- Md-hygiene sweep: protocol-file drift NONE; no stray `</content>` tags; no secrets in diff; no orphan root stubs introduced; INDEX parity kept (this log + INDEX line added same commit). One observation: `docs/planning/` now holds three gate ledgers (PHASE2 / LEARNS-EXPORT / MINE-TIER) — fine for now, consider an archive sweep when the mine ledger closes.
- Lesson/findings sweep (compact mode — one owner-relevant candidate): **K3 candidate captured as a finding**: `ai-operating-model/docs/findings/2026-07-07-smoke-test-masked-url-restore-bug.md` — a preview smoke that navigates to a stripped path can't catch URL-restore-priority bugs; cross-model review caught what the smoke missed (reviewer-pattern continues). No K4 (no tool overruled a controller call); no K1 safety-net catches (the one reviewer disagreement — HIGH-2 severity — was dispositioned explicitly in the ledger, not lost).
- verify-before-mutate summary: **0 flags (0 resolved-same-turn, 0 resolved-late, 0 unresolved), 0 destructive-core, 17 unclassified, 0 generated-write.**
- Memory sweep: no durable memory to add — every fact is repo-documented (ledger/spec/commits); the smoke-test lesson went to the ai-om findings ledger where the family lives.
- Vault sweep: nothing durable to propagate — checked strategic / shorthand / cross-project / hobby / consulting / external-source; the cross-project lesson is the finding above (ai-om ledger, not vault).

## Next session

**Locked next entry point: owner OWNER-VERIFY + merge of `mine-tier-20260706`** (ledger has everything). After merge, queued candidates: iOS v1.0.6/v1.0.7 TestFlight train (now carries 6 local commits incl. the full W3 iOS mirror — decide version), `max_mvs` 0.8 data gap (quick data-only win), Export Phase 2 (Bambu hardening + Beta-badge removal + the deferred HIGH-2 display fix), Orca Phase 3, W4 custom filaments (plan Part 3), S1 landing pages. Resume via `NEXT-SESSION.md`.
