# Intake Autonomy v2 impl plan — review dispositions (2026-07-10)

**Target:** [`../superpowers/plans/2026-07-10-intake-autonomy-v2-impl-plan.md`](../superpowers/plans/2026-07-10-intake-autonomy-v2-impl-plan.md)
**Gates:** hostile sub-agent plan review → patch → Codex cross-model review (`bridge --mode codex-only`; transcript [`../../codex/intake-autonomy-v2-review/bridge-2026-07-10-013631-926039.md`](../../codex/intake-autonomy-v2-review/bridge-2026-07-10-013631-926039.md)) → patch. Both **GO-WITH-PATCHES**; every finding applied same-session. Non-overlapping catches again (review-pattern holds).

## Round 1 — hostile sub-agent (GO-WITH-PATCHES, 17 findings, all applied)

| # | Sev | Finding (condensed) | Disposition |
|---|---|---|---|
| C1 | CRITICAL | `printer-intake-outcomes.jsonl` is git-tracked; runner ledger appends leave the tree dirty → next run's fail-closed preflight deadlocks the pipeline at run 2 | Applied: ledger line = own commit on `main` + push per candidate BEFORE watermark advance; B4.6 clean-tree assertion; B5.3 re-runs preflight after the drill |
| H1 | HIGH | add-printer version formula garbled — could republish at an unchanged `content_version` (poisoned-cache class) | Applied: `next = max(current + 1, <today>01)` + same-day test case |
| H2 | HIGH | per-candidate snapshot custody (spec §3.6/review #5) missing from the contract encode list | Applied: snapshot at run start + refresh after each verified candidate + full PD6 escalation tail |
| H3 | HIGH | B4.6 "no-merge" dry-run mutated real state (ledger, watermark, hygiene, webhook, branch) | Applied: full isolation sentence + branch cleanup + clean-tree assert |
| H4 | HIGH | latency measurement via docs commits observes nothing (`.assetsignore` excludes docs/scripts) | Applied: measure via `--bump-version` served-asset publishes feeding the drill |
| M1–M9 | MEDIUM | drill tool missing (`--bump-version`), B0 push-probe git incoherent, lock never acquired/released, runner config + kickoff prompt unnamed, app-cap lane undefined, monthly digest dropped, PD7 cross-watermark no-op + array-key identity, staging dir/K2-SE file absent on this machine, webhook-unset day-one freeze | All applied (see plan inline "plan-review M*" tags) |
| L1–L3 | LOW | gitignored probe artifacts uncommittable; `engine-bootstrap.js` missing from file list; `set -e` vs never-abort contradiction | All applied |

## Round 2 — Codex cross-model (GO-WITH-PATCHES, all applied)

| # | Sev | Finding | Disposition |
|---|---|---|---|
| MF-1 | must-fix | live verify compared only version+hash; hash covers payload ONLY → an `enabled:false` / wrong `min_app_version` live overlay passes while silently disabling delivery (`PrinterCatalogProvider.swift:122`) | Applied: full-envelope compare + recomputed payload hash + ship-path requires `enabled:true` + explicit `--expect-disabled` emergency mode |
| MF-2 | must-fix | `git diff --stat` walkthrough guard unimplementable (file-level only) | Applied: `--unified=0` hunk-range guard vs computed `COMBOS[]` range + mutation test |
| MF-3 | must-fix | crash window after ledger commit but before watermark/KV cleanup → Scout (`--no-watermark`) re-stages a shipped candidate | Applied: startup ledger reconciliation by normalized `candidateKey`, no re-ship / no duplicate line |
| SF-1 | should-fix | lock acquired by preflight but nothing guarantees release if `claude -p` never launches | Applied: lock custody moved to `scripts/intake-run-wrapper.sh` with `trap` release + failure notify |
| SF-2 | should-fix | drill snapshot never explicitly taken | Applied: B5.0 explicit snapshot to a named path |
| SF-3 | should-fix | owner-accepted report-file-only mode weakens "every run notifies" | Applied: webhook test-POST green is a HARD enablement gate at B5.3/B5.4 |
| OPT | optional | exported `compareVersions` is semver-only — misuse risk for `content_version` | Applied: plan forbids reusing it; plain numeric compare |

**Residual risks accepted:** none new beyond the spec's §8 register. The plan is cleared for build session 1 (Gate B0, mac-mini).
