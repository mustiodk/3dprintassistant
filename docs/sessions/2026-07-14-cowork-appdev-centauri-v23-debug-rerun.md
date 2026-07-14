# 2026-07-14 — Cowork (appdev): Centauri v2.3 debug + clean rerun

## Outcome

- Terminal result: `0 shipped · 1 parked · 0 errored`.
- Pipeline defects were reproduced, patched, regression-tested, merged, and
  pushed. The clean rerun reached both reviewers.
- R1 (`claude-opus-r1`) returned structured `GO`; R2 (`codex-r2`) returned
  structured `NO-GO` with objections on `multi_color_systems` and the
  Combo-only CANVAS note.
- `{GO,NO-GO}` correctly routed to `review-split → decision-required`.
  Candidate `intake/centauri_carbon_2@c4f5075` and packet SHA
  `0ada20324970ed0dba69f7fb7a3e60d563f7508be652570b26708b4ed8bf1ac1`
  remain preserved. No merge, overlay republish, live delivery, or iOS mirror
  occurred.
- iOS 1.0.7 and 1.0.8 were not started; the iOS repo was not pushed.

## Work completed

1. Reproduced the v2.2 packet overwrite: Scout rewrote the deterministic
   candidate path during parked re-entry, replacing the preserved filled
   packet before the evidence gate.
2. Implemented create-only Scout writes, explicit preserved-candidate
   reporting, and POSTRUN path/SHA/ref custody checks. Archived conflicting
   active runtime surfaces under `~/.local/share/3dpa-intake-quarantine/`
   while preserving the audit trail.
3. Root-caused R1 `structured-output-missing`: this mac-mini runs Claude Code
   2.1.175, and the full review schema contains constraints unsupported by that
   transport. A reduced transport schema succeeds; the full local validator
   still enforces the canonical contract after capture.
4. Added the compatible R1 transport boundary, removed the misleading visible
   StructuredOutput-tool wording, normalized terminal notifier counts/times,
   and tightened parked-ref identity verification.
5. Ran the clean owner-authorized wrapper. All mechanical and packet-evidence
   gates passed. R1 returned GO; R2 returned a valid NO-GO. The runner parked
   the split, pushed custody, notified Discord with normalized counts, released
   its lock, and finished `POSTRUN ok=true`.

## Commits

Web `main` (all pushed):

- `97a71eb` — preserve re-entry packet identity.
- `2032c4a` — transport R1-compatible review schema.
- `5bc3b88` — normalize terminal run reports.
- `a098cbc` — verify parked branch identity.
- `b69fe7e` — advance runner kickoff to v2.3.
- `a358e47` — custody the terminal review-split provenance.

Parent / ai-operating-model `main` (all pushed):

- `548b438` — codify intake v2.3 R1 boundary.
- `187ec62` — close the intake packet-custody finding.

## Verification evidence

- Scout suite: all green, including existing-packet preservation.
- R1 deterministic suite: `PASS=76 FAIL=0`.
- POSTRUN invariant suite: all green through exact parked-ref identity.
- Wrapper suite: all green.
- Notifier suite: `12/12` green.
- ai-operating-model runner-contract suite: `7/7` green.
- Real R1 boundary smoke: `R1REVIEW ok=true verdict=GO`.
- Live wrapper: `PREFLIGHT ok=true`; semantic report
  `auto-parked:review-split`; `POSTRUN ok=true`.
- Fresh custody verification: web `main == origin/main == a358e47`; preserved
  branch full SHA `c4f5075aa60d767ad79cd61e2ff46960a33409ec`; packet SHA matches sidecar;
  `validate-candidate-evidence` returns `ok=true` against the branch row.
- Runtime hygiene: run lock absent; autonomy freeze absent; Discord report says
  `posted=true shipped=0`.

## Data/logic-change evaluation

- These changes affect only intake automation and reporting. No printer or
  engine data landed, so web/iOS functional or UI changes are not needed.
- The rejected candidate remains off web `main` and the live remote overlay;
  therefore no iOS data mirror is appropriate.

## Open decision / exact next action

The owner must resolve both R2 objections before a later eligible run:

1. Whether Centauri Carbon 2 should declare `multi_color_systems: ["canvas"]`
   because the base printer is CANVAS-upgrade-ready even when CANVAS is sold
   separately.
2. Replace or explicitly defend the note claiming CANVAS is available only on
   the Combo variant.

Until that decision: do not edit the candidate, start a new reviewer turn,
delete its branch/packet/raw review evidence, or infer a ship from R1's GO.

## Md-hygiene / verify-before-mutate

- ROADMAP's stale v2.2 research-defect banner and intake queue row were updated
  to this terminal v2.3 review-split state.
- `NEXT-SESSION.md` was regenerated around the owner decision gate.
- No orphan redirect stubs or misplaced new markdown files were found.
- Verify-before-mutate hook summary (full output):

  ```text
  verify-before-mutate ledger: no entries this session
  ```
