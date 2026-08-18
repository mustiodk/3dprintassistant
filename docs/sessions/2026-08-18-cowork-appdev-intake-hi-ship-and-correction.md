# 2026-08-18 — Cowork (appdev): hi shipped, then got corrected an hour later

**Machine:** mac-mini. **Product code changed:** none (data + overlay + one runbook paragraph). **Intake:** the 12:00 run consumed the `hi` decision and shipped it.

## Durable context

- **An objection can be fully satisfied while the claim behind it stays false.**
  R1's 2026-08-17 objection on `hi` asked whether the nozzle-kit citation was a
  Hi source. It genuinely is — the page title reads `Compatible with K2/K2
  Plus/Creality Hi`. Answering that truthfully discharged the whole field, and
  `[0.4, 0.6, 0.8]` shipped at `confidence:"confirmed"` even though **0.8mm
  appears on neither cited page**. Both reviewers passed it. The retry gate
  verifies the *objection*, never the *field*. K3 filed; corrected within the
  hour. Fifth member of the dead-code-reads-as-safety-control family and the
  first with a live production instance.
- **`provide-evidence` cannot carry a value, and that cuts both ways.** The
  owner decision supplies URLs as *leads*; research redrafts. So verifying the
  sources by hand and knowing the right answer (`[0.4, 0.6]`) did not — and
  structurally could not — put that answer into the pipeline. The sources
  instead became the justification for keeping the wrong value.
- **The manufacturer-conflict ladder already covers same-manufacturer,
  different-era spec tables — via rung 3, not a new rung.** The proposed
  addition was killed by reading the ladder in full: rung 3 ("take the lower
  value" for fields with a safe direction) resolves all three contested
  `ender_3_pro` fields to 250 / 100 / 100. Only rung 2's *entry condition* was
  underspecified, and that one-paragraph guard is what shipped (`307d72e`).
- **Creality's V.2.0 Ender-3 Pro manual is the period-correct source** and reads
  `Nozzle Temp. ≤250℃`, `Bed Temp. ≤100℃`, `Printing Speed ≤180mm/s，Normal
  30-60mm/s`. An undated store comparison page restates the same fields as
  260/110/100. Gemini took the comparison table; both ChatGPT runs found the
  manual. The comparison table could not be retrieved on **four** attempts
  across two URL variants — all three tools quoted it confidently and none of
  those quotes are verifiable.
- **Pushing to `main` during an intake run is not free.** `307d72e` landed
  mid-run; the runner correctly fast-forwarded, rebased, re-ran every validator
  and re-entered PD5 — consuming **1 of 2 allowed re-entries**.

## What happened / Actions

1. Cold start; sync gate clean (iOS `ahead:1` expected under the push gate;
   `3dprintassistant-android: missing` on this Mac — surfaced, out of scope).
2. Found two parked printers. `ender_3_pro` had issue #39; **`hi` had none and
   the sweep provably could not make one** — its class `judgment-on-evidence`
   is matched by neither `isDecisionPark`'s class test nor `DECISION_REASONS`
   (which has `review-split`, not `review-no-go`). Sweep dry-run confirmed
   `opened=0 existing=1`.
3. Verified both `hi` sources by hand, wrote the `owner-instruction` re-entry
   (the `rd3-external-evidence` edge refuses `review-no-go`).
4. Researched `ender_3_pro` via Gemini + ChatGPT ×2; diffed all three against
   primary sources; extracted the manual PDF directly.
5. Committed the rung-2 guard (`307d72e`, CI green).
6. The 12:00 run shipped `hi` — both reviewers GO. Caught the unsourced 0.8 on
   a fresh uncached fetch; corrected and republished.
7. Wrote the `ender_3_pro` decision with the manual + PrusaSlicer + comparison
   table as leads.

## Files touched

**Web:** `docs/runbooks/printer-addition-protocol.md` · `data/printers.json` ·
`catalog/ios-printer-overlay-v1.json` · this log · INDEX · NEXT-SESSION · ROADMAP.
**iOS:** `3DPrintAssistant/Data/printers.json` (local).
**ai-om:** two findings + INDEX + calibration row.

## Commits

Web `main` (pushed, CI green on both): `307d72e` rung-2 guard · `67bfb60` hi
nozzle correction · `037b722` overlay republish `2026081802`.
Intake's own (not this session's authorship): `53a96b1` / `f95798b` / `06872d8`.
iOS (local, push-gated, now ahead 3): `2169dd3`.
Parent: `20206f2` K3 finding; K4 + wrap-up commits follow.

## Open questions / Follow-up

- **`hi` has no owner-notification path** and still doesn't — the sweep covers
  `decision-required` only. Adding `review-no-go`/`review-no-go-unresolved` to
  `DECISION_REASONS` is a one-line change, but whether `judgment-on-evidence`
  parks *should* raise issues is a design call. Locus-validate first.
- **K3** [objection satisfied while its claim stayed false](../../../ai-operating-model/docs/findings/2026-08-18-objection-satisfied-while-its-claim-stayed-false.md) — `open`, three mitigations recorded, none built.
- **K4** [scope-check rule does not cover closing recommendations](../../../ai-operating-model/docs/findings/2026-08-18-scope-check-rule-does-not-cover-closing-recommendations.md) — `recurrence-seen` after mitigation.
- **`ender_3_pro`** decision written; tomorrow's run is the test. Expect rung 3
  → 250 / 100 / 100, `inferred`, review dispatched.
- **iOS 1.1.4** untouched, still owner-gated.
- **Md-hygiene:** protocol files identical; no untracked `.md` in touched
  projects; findings INDEX parity holds; `</content>` hits (10) and the secrets
  hit (`xoxb-`) verified as prose/pattern-string false positives — fourth
  recurrence of that known FP.
- **Parent tree dirty, not mine:** two untracked `syndicate/client-nn/docs/artifacts/estimation-guide-*.md`
  timestamped 13:06/13:07 today, not authored by this session. Left alone.
- **Lesson spotter (compact):** 3 candidates, 2 accepted (the K3 + K4), 1
  declined (the runbook addition shrinking on locus-validation — that is the
  rule working, not a gap). No K1 — both reviewers agreed. No MCP in scope.
- **VBM summary, verbatim:** `verify-before-mutate ledger: 0 flags (0 resolved_same_turn, 0 resolved_late, 0 unresolved_by_session_end), 0 destructive-core, 31 unclassified, 0 generated-write`

## Next session

Train 1 (My Gear + Setups) execution remains the locked entry point — unchanged
by today. Check tomorrow's run for `ender_3_pro`.
