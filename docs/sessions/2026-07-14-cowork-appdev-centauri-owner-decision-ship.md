# 2026-07-14 — Cowork (appdev): Centauri owner decision → GO/GO ship

## Outcome

- **Elegoo Centauri Carbon 2 shipped through the fixed v2.3 intake pipeline.**
- The owner approved both prior split decisions:
  `multi_color_systems: ["canvas"]`, and a corrected note stating that CANVAS
  is sold separately for the base printer and included with the Combo.
- A fresh candidate HEAD passed the mechanical gates and the evidence gate
  exactly once. Fresh R1 and R2 both returned structured `GO` with no
  objections.
- The runner merged and pushed the candidate, verified the live overlay and
  production picker, created the local-only iOS data mirror, wrote and pushed
  custody, notified, released its lock, and ended `POSTRUN ok=true`.
- A new notifier presentation defect (`[object Object]`) was then reproduced,
  fixed TDD-first, pushed, and proven through a second clean wrapper run.
- iOS 1.0.7 and 1.0.8 were not started. The iOS repo was not pushed.

## Owner resolution and candidate repair

The official Elegoo product page describes the base printer as multicolor
upgrade-ready with CANVAS sold separately and presents the Combo separately.
The preserved candidate was therefore repaired to:

- `multi_color_systems: ["canvas"]`
- `CANVAS 4-color multi-material system is sold separately for the base
  printer and included with the Combo variant`

TDD caught an initial overly broad edit that touched K1C; that unrelated row
was restored before the candidate GREEN gate. The final diff contains only the
Centauri row plus the generated additive overlay change.

## Authoritative ship run

- Run: `run-20260714T085459Z`
- Candidate HEAD: `48f48a2342c22ac907e09b0a2127e546c57bd376`
- Evidence packet SHA:
  `8b06a1cca45676afdaf38479ce394c593afbdb21d45c9587aa83998b921fa837`
- R1: `claude-opus-r1` → `GO`, `objections=[]`, contract valid.
- R2: `codex-r2` → `GO`, `objections=[]`, contract valid.
- Semantic result: `1 shipped · 0 parked · 0 errored`.
- Merge: `954cfa3` pushed to web `main`.
- Live overlay: `content_version=2026071401`, payload SHA
  `05d490d885865bc19b8b94e4afd57e513a71706b60dd91e66827e9b0da2e2b53`;
  live on attempt 3/14 after 30.2 seconds.
- Production picker: `centauri_carbon_2` present under
  `elegoo / Centauri Series`.
- iOS local-only mirror: `f9a810c`; data-only waiver applied; no iOS push.
- Custody: `88816bd` pushed.
- Wrapper: `PREFLIGHT ok=true`; `POSTRUN ok=true`.
- Candidate branch, packet, and parked sidecar were deleted only after the
  successful GO/GO ship path completed.

## New report defect and patch

The shipped data and JSON report were correct, but `intake-notify.js` rendered
the structured `liveVerify` and `commits` objects through implicit string
coercion. This produced `[object Object]` in the Markdown/Discord report.

The fix recursively flattens structured summary values into readable dotted
key/value evidence such as `overlay.ok=true` and `web_merge=954cfa3`.

- RED: the new real-shape regression test failed only on
  `[object Object]`.
- GREEN: notifier `13/13`; wrapper suite green; post-run invariant suite green.
- Patch: `2ae4ddc` pushed to web `main`.

## Clean post-patch control run

- Prior active report surfaces were moved, not deleted, to:
  `~/.local/share/3dpa-intake-quarantine/post-ship-report-bug-preclean-20260714T091122Z/`.
- Run: `run-20260714T091308Z`.
- Result: `0 shipped · 0 parked · 0 errored`.
- Scout saw five KV keys: three incomplete and two duplicates. Centauri Carbon
  2 was correctly recognized as already shipped; there were zero actionable
  candidates and no review turn.
- The patched local report contains no `[object Object]` and has normalized
  terminal counts/times.
- Wrapper: `PREFLIGHT ok=true`; `POSTRUN ok=true`.
- No intake lock or autonomy freeze remained.

## Final verification evidence

- Fresh `verify-live-overlay.js`: live matches committed on attempt 1.
- Fresh `verify-live-picker.js`: GREEN for
  `elegoo / Centauri Series / centauri_carbon_2`.
- Fresh production fetch confirmed overlay `2026071401`, the committed payload
  SHA, `multi_color_systems:["canvas"]`, and the corrected CANVAS note.
- Web `main == origin/main` before this documentation wrap.
- iOS is clean, seven commits ahead locally, newest `f9a810c`; no push.
- No Centauri candidate branch, packet, or parked sidecar remains.

## Data/logic-change evaluation

- Web/data: the bundled printer row is live and the existing picker consumes it
  without UI or engine changes.
- iOS/data: the remote overlay immediately delivers the additive row; the
  bundled mirror is local-only for the next authorized binary train.
- `multi_color_systems:["canvas"]` uses an existing sanctioned vocabulary and
  existing UI behavior, so no new functional, structural, UI, or UX work is
  required.
- Automation/reporting: the notifier patch changes presentation only; it does
  not alter intake classification, evidence, review, merge, or ship semantics.

## Exact next action

Centauri recovery is closed and must not be restarted. On the next cold start,
verify the closed state and hand lane selection to the owner. The documented
product sequence remains iOS 1.0.7 followed by the separate iOS 1.0.8 tip-jar
train, but neither was started in this session.

## Md-hygiene / verify-before-mutate

- ROADMAP's terminal banner, intake row, and live-overlay inventory were
  updated from parked/review-split to shipped/live.
- `NEXT-SESSION.md` was regenerated around the closed ship state and next owner
  lane selection.
- Session index updated with this terminal ship record.
- No orphan redirect stubs or misplaced untracked Markdown files were found.
- Verify-before-mutate hook summary (full output):

  ```text
  verify-before-mutate ledger: no entries this session
  ```
