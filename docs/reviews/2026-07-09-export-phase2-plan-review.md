# 2026-07-09 — Export Phase 2 plan review (plan-gate, hostile fresh-context sub-agent)

**Target:** `docs/superpowers/plans/2026-07-09-export-phase2-bambu-hardening-plan.md` (pre-patch state)
**Reviewer:** hostile fresh-context sub-agent (Fable 5), grounded in engine.js / harness / export-audit / golden fixtures / spec §4 / live BBL.json registry.
**Cross-model note:** `bridge --health` OK, but the Codex turn failed on tooling — the configured model `gpt-5.6-sol` requires a newer Codex CLI (`invalid_request_error` ×2, 2026-07-09). Direct `codex exec` shares the config → same failure. **Owner action: upgrade Codex CLI (`brew upgrade codex`), then optionally re-run a one-shot Codex pass on the patched plan.** Sub-agent review is the sanctioned fallback layer; residual risk = single-model review on this plan gate.

**Verdict: GO-WITH-PATCHES** — all patches applied to the plan same-session (one edit pass per finding, no code written).

## Findings + dispositions

| # | Sev | Finding | Disposition |
|---|---|---|---|
| 1 | MUST | Filament dual-array claim contradicted the golden — `nozzle_temperature` is `["225","nil"]`, not `["v","v"]`; spec §1.4b F8 quotes exactly this | APPLIED: T2 rescoped to the 7 process keys; filament temps stay 1-element; grounding facts, harness sketch, audit-guard contract, iOS mirror test all corrected |
| 2 | MUST | T3 registry command used the wrong key (`process` vs real `process_list`) → silent empty output inviting a false "no presets" conclusion; and `master` is 2.6-era | APPLIED: `process_list` + loud assert + pin to newest `v02.05.*` release tag |
| 3 | MUST | "Copy the x1c row, substitute suffix" builds nonexistent preset names (P2S/X2D use a different quality vocabulary + nozzle-suffixed variants) | APPLIED: rebuild rows name-by-name from registry output; suffixed variants ledgered for a later `_findProcessParent` pass |
| 4 | MUST | Dual arrays ship to single-variant machines (a1/p1p) with only an X1C import test; `print_extruder_variant` omission asserted, not proven | APPLIED: A1 file added to the Step 8.2 owner import test; fallback = printer allowlist; residual risk recorded in grounding facts |
| 5 | MUST | T5 RED unconstructible — data carries only `{'no ironing','top'}` × `{null,'monotonicline'}`; label seeds appear nowhere; H1 churn for zero gain | APPLIED: T5 DROPPED; re-queued as a data-triggered ROADMAP follow-up (trigger: second ironing vocabulary entering data/) |
| 6 | SHOULD | T1 sketch `setPersonalTuning` offsets shape wrong (bare number silently dropped → test (b) vacuous); no `acceptedAt` field exists | APPLIED: `{value, unit, date}` shape + `svM === '1'` vacuity guard |
| 7 | SHOULD | Emission line not unique — identical line at `:3398` inside frozen legacy fn | APPLIED: cite `:3533`; explicit do-not-touch note for `:3398` |
| 8 | SHOULD | Hint `<p>` inside flex `.panel-header` renders as squeezed same-row item | APPLIED: placed after `.panel-header`, before `#compareBanner`; `--text-secondary` non-existence noted; language re-render verified fine (render()-path) |
| 9 | SHOULD | 1-element sentinel `sparse_infill_density` is emitted scalar → vacuous guard | APPLIED: sentinel switched to `inner_wall_acceleration` |
| 10 | SHOULD | T2-revert fallback didn't coordinate the iOS local commits (stale engine + red XCTest) | APPLIED: Step 8.2 now re-syncs iOS byte-copy + drops the dual-variant XCTest commit on revert |
| 11 | OPT | Line-ref/typo nits (`USE_LEGacy_EXPORT`; filament temps `:3567-3568`) | APPLIED |

**Review-verified positives (no action):** golden snapshot DOES capture `text`/`exportRef`/`exportBambu` (T1/T2 golden-diff expectations sound); `x1c|pla_basic` pairKey format correct; `std_0.2` exists; `profile` in scope at both T1 patch sites; fallback format matches display; index.html/app.js line claims accurate; deployed engine.js unminified (curl-grep works); baseline audit output matches a real run.

**Open questions 1–4:** resolved as recorded in the plan's final section.
