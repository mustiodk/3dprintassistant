# 2026-04-21 — Cowork (appdev): review consolidation + fresh-session prep

## What happened

Consolidation session. The prior session (2026-04-20) ran the full internal `/code-reviewer` pass and Phase 1 domain walkthrough, producing an 8-file review deliverable + `PLAN.md` + `domain-findings.md` + `domain-walkthrough.md`. That's 12 files in the reviews folder, plus planning content duplicated across `PLAN.md` and `ROADMAP.md`. The owner flagged the doc sprawl and asked to merge.

## Actions

1. **Merged `domain-findings.md` into the structured review files**:
   - CRITICAL-002 (bed-temp overflow) + CRITICAL-003 (silent preset fallback) appended to [`01-critical.md`](../reviews/2026-04-20-internal/01-critical.md).
   - HIGH-012 (wrong-printer why-text) + HIGH-013 (retraction dual-field) + HIGH-014 (A1 mini bed-temp data) appended to [`02-high.md`](../reviews/2026-04-20-internal/02-high.md).
   - [`00-executive-summary.md`](../reviews/2026-04-20-internal/00-executive-summary.md): rewrote "Top 3" around the new CRITICALs, bumped the overall-health framing from "one critical" to "three ship-blockers".
   - [`08-review-log.md`](../reviews/2026-04-20-internal/08-review-log.md): tally updated to **59 total (3 CRITICAL / 14 HIGH / 22 MEDIUM / 10 LOW / 10 OBS)**.

2. **Merged `PLAN.md` into `ROADMAP.md`** as a new **Internal review follow-up (IR-\*)** section placed above the existing RB/BR/PR structure. Six sub-phases:
   - **IR-0** — Ship this week (CRITICAL + HIGH + free wins, ~11 items)
   - **IR-1** — Data suggestion logic verification ✅ completed 2026-04-20
   - **IR-2** — Engine correctness hardening
   - **IR-3** — Failure-mode rehearsal (live-product readiness)
   - **IR-4** — Drift prevention (structural)
   - **IR-5** — Backlog hygiene (touch when nearby)
   - **IR-deferred** — Export-path items (re-activate when export re-enables)
   Every actionable item links back to the specific review finding and carries its severity code.

3. **Deleted redundant files**: `docs/reviews/2026-04-20-internal/PLAN.md` and `docs/reviews/2026-04-20-internal/domain-findings.md` removed. Reviews folder now contains only the 9-file deliverable + the regeneratable `domain-walkthrough.md`.

4. **Updated `docs/prompts/fresh-session-kickoff-post-review.md`**: reflects new state (internal review done, external still out, IR-0 is the priority queue). Added default behavior for "external review returned" path. Added explicit "no doc sprawl" workflow rule. Updated quick facts with findings tally.

5. **Updated `ROADMAP.md` header**: "Last updated: 2026-04-21" with a one-line summary pointing at the IR-\* section and the 59-finding total.

## Files touched

**Modified:**
- `docs/planning/ROADMAP.md` — added IR-\* section (~150 lines), updated header.
- `docs/reviews/2026-04-20-internal/00-executive-summary.md` — rewrote Top 3.
- `docs/reviews/2026-04-20-internal/01-critical.md` — added CRITICAL-002, CRITICAL-003.
- `docs/reviews/2026-04-20-internal/02-high.md` — added HIGH-012, HIGH-013, HIGH-014.
- `docs/reviews/2026-04-20-internal/08-review-log.md` — tally update.
- `docs/prompts/fresh-session-kickoff-post-review.md` — full rewrite for new state.

**Deleted:**
- `docs/reviews/2026-04-20-internal/PLAN.md`
- `docs/reviews/2026-04-20-internal/domain-findings.md`

**Unchanged** (from 2026-04-20 session):
- The 8 review files (00-08) + `domain-walkthrough.md` (now 10 files in the reviews folder, was 12).
- `scripts/walkthrough-harness.js` — reusable Node harness, kept as-is.

## No code shipped

This session was entirely doc consolidation. No commits to web or iOS `main`. Working-tree diff is docs only; ready to commit when the owner approves.

## Next session (triage starts)

Default action for the next Cowork session is **IR-0 triage** — walk the ship-blockers in CRITICAL → HIGH order, one finding = one commit, sign-off per fix, **do not batch**. Prompt at [`docs/prompts/fresh-session-kickoff-post-review.md`](../prompts/fresh-session-kickoff-post-review.md).

First item in the queue: **[CRITICAL-002]** bed-temp clamp to `printer.max_bed_temp` with a `printer_max_bed_temp_clamped` warning. Touches both web + iOS because the fix is in `engine.js`. Regression test: re-run `scripts/walkthrough-harness.js` after — Combos 6 (A1 + ABS) and 10 (K1 Max + PC) must flip from ❌ to ✓.

If the owner prefers a different first item — **[CRITICAL-001]** (iOS webhook through Worker, ships v1.0.2) is the alternative — choose whichever has a clearer block of time (CRITICAL-001 is iOS+Worker so more moving parts).

## Open owner asks

- **[HIGH-014]** Verify A1 mini real `max_bed_temp` vs Bambu's product page. If 80°C, data update is trivial and [CRITICAL-002] fix covers the downstream symptoms automatically.
- **[MEDIUM-017]** Decide: wire engine to `warnings.json.condition_warnings` or delete the dead data.
- **[MEDIUM-018]** Decide: `nozzles.json.not_suitable_for` — use material IDs or group names? (Currently mixed.)
- **[LOW-002]** Provide HIPS-specific `enclosure_behavior.reason` text (currently copy-pasted from ABS).
