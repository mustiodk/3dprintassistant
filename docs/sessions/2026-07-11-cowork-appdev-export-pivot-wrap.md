# 2026-07-11 — Cowork (appdev): Export-first pivot wrap

## Durable context

- Owner pivoted before starting the iOS 1.0.7 issue-fix implementation: printer export remaining phases now come first, and the already-reviewed iOS 1.0.7 plan comes immediately after.
- Verified current code state on `codex/ios-1.0.7-issues-plan`: native export is Bambu-only. `engine.js` exposes `exportBambuStudioJSON`, `exportProfile`, and `formatProfileAsText`; there is no `exportOrcaJSON` or `exportPrusaINI`. `app.js` shows the native export button group only for `Engine.getSlicerForPrinter(...) === 'bambu_studio'`; non-Bambu slicers still get copy-text fallback.
- Verified Git/session state: IMPL-043 Phase 0+1 is merged/live on web (`9e7890d`, 2026-07-06). Export Phase 2 was implemented on `origin/export-phase2-20260709` with owner-verify PASS, but that branch is not contained in current `origin/main`.
- Important branch safety finding: `git diff origin/main..origin/export-phase2-20260709` includes large unrelated deletions of newer intake/K2/analytics work. Therefore the next session must not merge that branch directly. It must recover/reapply the export-only Phase 2 changes onto a fresh current-main branch.

## What changed in this wrap

- Created the overall handoff plan: `docs/superpowers/plans/2026-07-11-export-first-overall-plan.md`.
- Regenerated `docs/sessions/NEXT-SESSION.md` so the fresh session starts with:
  1. Export Phase 2 recovery/merge on current `main`.
  2. Export Phase 3 Orca native JSON export.
  3. Export Phase 4 Prusa `.ini` export.
  4. iOS 1.0.7 issue-fix release plan.
- Updated ROADMAP to make the export-first priority explicit and to preserve the iOS 1.0.7 plan as the next train after export.
- Ran Claude-only bridge review of the docs diff: `docs/reviews/bridge-2026-07-11-115050-528638.md`. Findings patched before commit:
  - made the Phase 2 recovery step apply changes (`git cherry-pick --no-commit` / `git apply --3way`) instead of only printing `git show` diffs;
  - added an explicit `git show origin/export-phase2-20260709:...` command for the branch-only Phase 2 session log;
  - preserved one-finding-one-commit shape for the recovered implementation commits;
  - made the production live-check use a verified Phase 2 marker;
  - fixed stale W3 wording that still implied owner verify/merge was next.

## Validation evidence

- `git log --oneline --reverse origin/main..origin/export-phase2-20260709` shows the completed P2 commits: ledger/baselines, HIGH-2 retraction honesty, dual arrays, inherits verification, import hint, Beta badge removal, owner-verify artifacts/PASS, and wrap.
- `git branch --all --contains 9152b8b` shows the P2 wrap commit is only on `origin/export-phase2-20260709`, not current `main`.
- `rg -n "exportOrca|exportPrusa|exportBambuStudioJSON" engine.js app.js index.html scripts/export-audit.js` shows only Bambu native export is wired today.
- `app.js` lines around the export UI branch confirm non-Bambu slicers hide `#exportGroup` and show `#exportCopyBtn`.

## Next session

Start from `docs/sessions/NEXT-SESSION.md`. The short version:

1. Do the normal 3dpa cold start and sync checks.
2. Recover Export Phase 2 onto current `main`; no direct stale-branch merge.
3. Verify web gates and iOS XCTest, PR, merge, and live-check.
4. Then implement Orca Phase 3 and Prusa Phase 4.
5. Then resume the reviewed iOS 1.0.7 issue-fix plan.

## Clean-state target

This wrap is docs-only. After merge, the fresh session should start from clean `main`, with no dirty state in any touched repo.
