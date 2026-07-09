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

---

## Round 2 — Codex second opinion (same day, after CLI fix)

**Tooling fix:** Codex CLI upgraded `0.140.0 → 0.144.0` via `npm install -g @openai/codex@latest` (it was an npm global, NOT a brew cask — the earlier `brew upgrade codex` suggestion was wrong). `gpt-5.6-sol` verified working (`codex exec` MODEL-OK). Review ran via `bridge --mode codex-only`; transcript: `codex/export-phase2-review/bridge-2026-07-09-205935-870276.md`.

**Verdict: GO-WITH-PATCHES** — 6 findings, ALL non-overlapping with round 1 (reviewer-pattern holds: second model caught what sub-agent + author both missed). All applied same-session.

| # | Sev | Finding | Disposition |
|---|---|---|---|
| C1 | MUST | T5 drop only partially applied — Goal + evaluation section still listed ironing; ROADMAP:81(b) still active | APPLIED: Goal + evaluation fixed; ROADMAP item rewritten, ironing split out as a data-triggered deferred bullet |
| C2 | MUST | `h2c`/`h2d`/`h2s` are recognized export targets but entirely ABSENT from `BAMBU_PROCESS_INHERITS` → silent X1C-parent fallback (`engine.js:3185`); Task 3 never covered them | APPLIED: added to the registry query, ledger evidence, explicit map-or-null rows + RED-first assertions |
| C3 | MUST | Gate commands could false-green: `node \| grep \| shasum` masks node's exit code; `\|\| echo FAIL` converts test failure to success | APPLIED: two-step `&&` form + `\|\| exit 1` everywhere (0.2, 1.4, gate matrix) |
| C4 | MUST | Task 8 didn't converge every fallback to one tested web+iOS state (UNVERIFIED XCTest could merge; bundled iOS commits blocked partial revert; fallback skipped import re-test; 8.4 grep target wrong after full revert; post-merge rollback web-only) | APPLIED: per-delta iOS commits (7.4); UNVERIFIED blocks 8.3; explicit merge preconditions; fallback loop re-stages + re-imports + re-syncs iOS; 8.4 strategy-dependent expectations; new 8.4b post-merge mirror rule |
| C5 | SHOULD | Step 2.6 audit note premise false — the element-count loop iterates process keys only, never filament | APPLIED: rewritten as 3 explicit checkFails (7-key set equality both directions; filament temps 1-element + golden 2nd `"nil"` self-check; variant keys absent) |
| C6 | OPT | `print_extruder_id` is `["1","1"]` (ids), not variant names | APPLIED: grounding fact corrected |

**Codex round-2 also confirmed:** no remaining BS-2.5 blocker in `[val,val]` itself behind the X1C+A1 import gate; filament-1-element + variant-name omission judged reasonable.
