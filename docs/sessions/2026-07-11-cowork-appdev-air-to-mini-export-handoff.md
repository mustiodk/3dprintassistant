# 2026-07-11 — Cowork (appdev): Air → mac-mini Export Phase 2 handoff

## Durable context

- **Use current `main`, not the old Phase 2 branch.** The session began on `export-phase2-20260709`, which matched its own upstream but was later proven `11` commits unique / `117` commits behind `origin/main`. Local web `main` was fast-forwarded to current `origin/main` (`bb2409d`). The existing current-main recovery plan remains authoritative; direct merge of the stale branch is unsafe.
- **The three Export P2 iOS mirror tests are now transferable through GitHub.** The Air's three existing local commits were rebased onto the then-current iOS `origin/main` and pushed as `codex/export-phase2-ios-sync-20260711`: `4210b3c` (HIGH-2 retraction), `906e783` (dual arrays), `04eec71` (inherits). Local iOS `main` remains 3 commits ahead under the push gate.
- **Treat that iOS branch as test/reference material, not a final engine snapshot.** Recover Phase 2 onto current web main first, then byte-copy the recovered web engine. Reuse/cherry-pick only the XCTest hunks or recreate the assertions; do not fast-forward iOS blindly from the transfer branch if it would replace newer current-main engine/data state.
- **MacBook Air still cannot provide the release gate:** `/Applications/Xcode.app` is absent and `xcode-select -p` points to CommandLineTools. The mac-mini must run the RED breadcrumb and full XCTest. Expected count remains 135 prior + 3 P2 tests = 138, but record the actual count.

## What happened / Actions

1. Trigger C health initially ran late (after the first local NEXT-SESSION read), then correctly halted on iOS `diverged:3:3`; no product mutation happened before reconciliation.
2. Rebased the three local iOS P2 commits over the three remote data commits and pushed `codex/export-phase2-ios-sync-20260711` without pushing iOS `main`.
3. Re-ran the old Phase 2 branch's web gates: validate-data clean; walkthrough clean; matrix hash `3bd3da7c364d1d273ce4c2b53c9322667dd77224ae9dc6d8e31400fb5d8fed9e` (H0); export audit `0 FAIL / 0 warn`; golden snapshot `NO DRIFT (39 states)`; unit suite had only the branch's documented 1.0.7 overlay-baseline failure. **These prove the source branch, not the current-main recovery; Task 1 must rerun all gates after reapplication.**
4. Wrap-up compared the branch to canonical main, discovered the 117-commit staleness, read the newer export-first wrap/plan, switched web to `main`, and fast-forwarded to `bb2409d`.
5. Preserved the three owner-created `xy-p2-*` backup fixtures in `stash@{0}` named `owner xy-p2 backups preserved before 2026-07-11 wrap`; nothing was deleted.

## Files touched

- Web docs: this log, session INDEX, ROADMAP export recovery row, export-first plan Task 1 Step 5, and NEXT-SESSION.
- AI operating model: one K3 recurrence finding + prior-family N=3 update + findings INDEX + lesson-spotter calibration row.
- iOS code: no new content authored; three existing commits rebased to new SHAs and published on the transfer branch.

## Commits

- iOS transfer branch `codex/export-phase2-ios-sync-20260711`: `4210b3c`, `906e783`, `04eec71` (pushed; iOS `main` not pushed).
- Web wrap documentation lands as one scoped docs commit on current `main`; no product code is included.

## Open questions / Follow-up

- **K3 recurrence:** [`2026-07-11-github-first-health-blind-to-main-stale-feature-branch`](../../../ai-operating-model/docs/findings/2026-07-11-github-first-health-blind-to-main-stale-feature-branch.md) — branch-upstream health masked canonical-main staleness; related family is now N=3. Protocol mitigation remains owner-pending.
- **Md-hygiene:** no root stub, untracked markdown, secret-file, protocol-drift, duplicate-plan, or stray `</content>` issue. The session-index “orphan” warning for the Mine-tier log was a regex false positive; the log is correctly linked at INDEX line 14. The three owner backup JSON files were preserved in a named stash rather than deleted.
- **Lesson/finding sweep:** escalated checkpoint returned 1 candidate, accepted as the K3 recurrence above; no K4 and no K1 safety-net catch.
- **MCP:** not in scope; no MCP ledger update.
- **Memory sweep:** no durable memory to add; the reusable issue is protocol/tool behavior and is captured in the finding.
- **Vault sweep:** nothing durable to propagate after checking strategy, shorthand, cross-project routing, hobby, consulting, and external-source categories.
- **verify-before-mutate summary (verbatim):** `verify-before-mutate ledger: no entries this session`.

## Next session

On the **mac-mini**, cold-start from `docs/sessions/NEXT-SESSION.md` on current web `main`. Execute Task 1 of `docs/superpowers/plans/2026-07-11-export-first-overall-plan.md`: create `codex/export-phase2-current-main`, reapply the five export-only commits, preserve owner-verify evidence, then copy the recovered engine to iOS. Use `origin/codex/export-phase2-ios-sync-20260711` only as the source for the three XCTest assertions/RED breadcrumb. Run full XCTest, then proceed through PR/merge/live verification only when every current-main gate is green.
