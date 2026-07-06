# MINE-TIER GATE LEDGER — W3 engine train (IMPL-044 plan Part 2)

**Session:** 2026-07-06 (autonomous, Fable 5) · **Branch:** `mine-tier-20260706` off `main` `6c9d4a0` (tag `mine-tier-baseline-20260706`)
**Contract:** `docs/superpowers/plans/2026-07-06-impl-044-w3w4-plan.md` Part 2 · spec `docs/specs/IMPL-044-W3W4-mine-tier-and-custom-filaments.md` §5
**Hard boundaries:** nothing merges to main; nothing deploys; iOS local commits only (push gate intact); `USE_LEGACY_EXPORT` + export path untouched; no Export Phase 2/3/4; no max_mvs fix.

> Ledger discipline: rows are ticked ONLY after the command ran and the output was observed. No pre-narration.

## G0 — Baseline (recorded 2026-07-06, all observed)

| Gate | Result |
|---|---|
| `git status` web | clean; `main == origin/main == 6c9d4a0` |
| iOS repo | `c647982` (1 ahead local — pre-existing, push-gated) |
| `engine-golden-snapshot --check` | **NO DRIFT (36 states)** (17 soft max_mvs schema warnings = known queued data gap, out of scope) |
| `validate-data` shasum | `c766befd6976db69dc965c933eb56681cef8576a3807d0cccaa046f9922ccf11` (tail: "All data files valid.") |
| `walkthrough-harness` shasum | `901cc4d220e11a00a5b5cb8ae6f79e3b82c1b72ddd584c1b6cfe1b9c6175a4dc` |
| `profile-matrix-audit` (Generated-stripped) shasum | `3bd3da7c364d1d273ce4c2b53c9322667dd77224ae9dc6d8e31400fb5d8fed9e` (matches prior session's display-stable hash) |

## Task gates (plan Part 2)

| # | Task | RED evidence | GREEN | Golden regen (deltas enumerated in commit) | Commit |
|---|---|---|---|---|---|
| 1 | Mode plumbing (`profileMode:'mine'`, `_tier` third layer, `setPersonalTuning`, pairKey guard) | — | — | — | — |
| 2 | Temp deltas + NEW lower-bound floors | — | — | — | — |
| 3 | Fan deltas + NEW 0–100 bounds (3 emissions) | — | — | — | — |
| 4 | Retraction delta post-`_scaleRetraction` | — | — | — | — |
| 5 | Provenance `personal` | — | — | — | — |
| 6 | Web UI: Mine segment + injection + share mine→safe | — | — | — | — |
| 7 | Rules-table → troubleshooter.json remedy migration | **DECISION PENDING** (in-scope vs follow-up — recorded here when made) | — | — | — |
| 8 | iOS train: byte sync, XCTest mirrors, third segment, emitter key-preservation + fixture regen | — | — | — | — |

## Cross-model review

| Step | Result |
|---|---|
| `bridge --health` | — |
| `bridge --mode codex-only` (pre-merge review of the branch diff) | — |

## OWNER-VERIFY

*(written at wrap — real steps only)*
