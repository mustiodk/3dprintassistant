# 2026-07-13 — Cowork (appdev): Centauri intake terminal park + recovery

## Durable context

- `centauri_carbon_2` is **not shipped**. It is owner-parked
  `review-unavailable` / `availability-blocked`; `nextEligibleTrigger` is
  `owner`. No further intake work is authorized.
- The preserved candidate is
  `intake/centauri_carbon_2@1694af2f4acbd26fa965326e7f58d4fc29f57725`.
  Archive ref `archive/intake-centauri_carbon_2-review-unavailable-20260713-2113`
  points to the same commit. Checkpoint tags still peel to `be49fea` and
  `8695583`.
- All deterministic candidate gates passed. The one authorized R1 turn ran
  through the merged inline-schema boundary and failed closed with exit `65`,
  `R1REVIEW ok=false reason=structured-output-missing`. Claude's prose `GO`
  was not treated as a verdict. R2, merge, live delivery, iOS mirror, and ship
  did not run.
- The runner then violated the preservation/terminal contract: it deleted the
  candidate branch and ignored packet and omitted a fresh report/notification.
  The wrapper caught `POSTRUN report-stale`. Manual repair restored the exact
  branch/packet, wrote the accurate report, notified Discord, and reran
  semantic POSTRUN to `ok=true` without rerunning intake or review.
- Next product sequence is iOS 1.0.7 issue-fix, then the separate iOS 1.0.8
  tip-jar train. Printer intake stays parked until explicit owner command.

## What happened / Actions

1. Synced the workspace and verified clean web `main`, intact parked state,
   absent lock/freeze, loaded idle LaunchAgent, green Opus wrapper test, and
   preserved checkpoint tags.
2. Rebased/rebuilt the candidate on current `main`. Bounded evidence repair
   added canonical full-HTTPS official sources; candidate commit `1694af2`.
3. Passed the evidence gate once with `--printers-json`, diff guards,
   `validate-data`, picker dry-run, walkthrough, matrix audit, overlay
   validator, and `git diff --check`.
4. Spent the single authorized R1 through
   `scripts/intake-r1-structured-review.sh`. Claude CLI exited `0` with prose
   and no `structured_output`; the boundary returned exit `65` and parked
   `review-unavailable`. No R2 was spent.
5. Restored preservation-marked evidence after the runner's cleanup mistake;
   committed/pushed custody `a985950`; wrote the fresh report; posted the
   accurate Discord notification; and proved terminal `POSTRUN ok=true`.
6. Confirmed remote web `main` does not contain the printer and the live
   overlay remains `content_version=2026071005` without
   `centauri_carbon_2`.
7. Wrapped the incident into two ai-om findings: a K4 structured-output
   recurrence and a K3 runner terminal-cleanup contract gap.

## Files touched

- Web code/custody during the incident:
  `scripts/intake-pipeline-runner.sh`,
  `scripts/intake-r1-structured-review.sh` boundary wiring, and the tracked
  intake custody ledger.
- Ignored preserved evidence:
  `scripts/.intake-runner-state/parked/centauri_carbon_2/parked.json`, exact R1
  prompt/envelope/metadata/stderr, terminal report, and candidate packet.
- Wrap surfaces: this log, `docs/sessions/INDEX.md`,
  `docs/sessions/NEXT-SESSION.md`, and `docs/planning/ROADMAP.md`.
- ai-om: two findings, findings INDEX/status, session/index/NEXT, and lesson
  spotter calibration.

## Commits

- Web `088fcc1` — force runner R1 through the structured boundary.
- Web `ef2ac73` — park immediately on evidence-gate failure.
- Candidate `1694af2` — unchanged intended Centauri data candidate after the
  bounded evidence repair.
- Web `a985950` — atomic custody record; current remote `main` before wrap.
- Parent `697eb2a` — ai-om runner-contract/wrap touch from the incident.
- Final wrap commits are recorded by the closing session.

## Open questions / Follow-up

- Exact reason the live inline-schema R1 invocation omitted
  `structured_output` remains unknown. Do not spend another review turn to
  investigate it; the owner has parked intake.
- The accurate Discord notification returned `posted=true`; independent
  owner-visible channel receipt was not established during terminal recovery.
- Before any later owner-authorized intake, fix/test the runner park path so a
  success cannot remove preservation-marked evidence or precede fresh report,
  notification, and semantic POSTRUN success.
- Md-hygiene fixed the stale active sequence and remote overlay snapshot in
  ROADMAP. No untracked should-be-tracked markdown, tracked secret pattern,
  root stub, INDEX parity gap, or stray `</content>` tag was found.
- Verify-before-mutate ledger: no entries this session.
- Memory sweep: no durable memory addition proposed; the reusable lessons live
  in the ai-om findings ledger. No memory file was edited.
- Vault sweep: no strategic context requires propagation; this is project and
  tool-contract evidence.

## Next session

Use the regenerated `NEXT-SESSION.md`: cold-start the reviewed iOS 1.0.7
issue-fix train, reconcile the six local iOS commits under the push gate, and
execute only that plan. Keep Centauri and all printer-intake automation parked.
