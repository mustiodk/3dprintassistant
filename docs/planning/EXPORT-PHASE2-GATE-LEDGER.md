# Export Phase 2 — Gate Ledger

> Empty-first ledger: ticks are recorded as they happen, never pre-narrated.
> Plan: `docs/superpowers/plans/2026-07-09-export-phase2-bambu-hardening-plan.md`
> Review record: `docs/reviews/2026-07-09-export-phase2-plan-review.md` (2 rounds, 17 findings applied)

## Preamble (recorded 2026-07-09)

- **Baseline tag:** `export-phase2-baseline-20260709` (= main tip at branch time)
- **Branch:** `export-phase2-20260709` (pushed to origin)
- **Matrix-audit hash H0:** `3bd3da7c364d1d273ce4c2b53c9322667dd77224ae9dc6d8e31400fb5d8fed9e`
- **Baseline gate results (pre-edit, branch == main tip):**
  - validate-data: all files valid (pre-existing max_mvs soft warnings only)
  - walkthrough-harness: clean, 18 OK lines, no throw
  - export-audit: 0 FAIL / 1 warn (element-count — the T2 target) / 5 info
  - engine-golden-snapshot --check: NO DRIFT (39 states)
  - unit tests: all pass EXCEPT **documented baseline exception** below
- **Documented baseline exception (pre-existing, NOT introduced by this branch):**
  `scripts/validate-ios-printer-overlay.test.js` case (e) live-smoke FAILS —
  "missing iOS bundled catalog baseline for current MARKETING_VERSION 1.0.7".
  Known owner-side open item (blocks overlay republish, unrelated to export).
  Verified pre-existing: branch created at main tip with zero commits, failure
  present at baseline. Gate contract for this train: **no NEW unit failures**;
  this one failure is expected at every gate until the 1.0.7 baseline lands.

## Gates

### T1 — HIGH-2 retraction display honesty

### T2 — dual-extruder-variant arrays (7 process keys)

### T3 — BAMBU_PROCESS_INHERITS verification (CR1-L1)

### T4 — import-hint UX

### T6 — Beta-badge removal

### T7 — iOS mirror train

### T8 — exit gate

## OWNER-VERIFY (Step 8.2 — owner import test, recorded verbatim)

_(pending)_

## Merge / rollback commands (from plan Task 8)

```bash
# merge (only after ALL Step 8.3 preconditions):
git checkout main && git merge --no-ff export-phase2-20260709 && git push

# rollback single task (on branch): git revert <sha>
# whole train pre-merge: abandon branch (main untouched; tag export-phase2-baseline-20260709)
# post-merge: git revert -m 1 <merge-sha>   (then mirror into pending iOS train per 8.4b)
# export-path emergency lever: USE_LEGACY_EXPORT=true (frozen WITH pre-P1 raw retraction + 1-element arrays)
```
