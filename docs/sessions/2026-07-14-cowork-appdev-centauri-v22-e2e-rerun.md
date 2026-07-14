# 2026-07-14 — Cowork (appdev): Centauri v2.2 e2e rerun

## Durable context

- The owner-authorized mac-mini rerun completed terminally through the v2.2
  wrapper: `POSTRUN ok=true`, wrapper exit `0`, and **0 shipped · 1 parked ·
  0 errored**.
- `centauri_carbon_2` is **not shipped**. It parked fail-closed as
  `research-defect` before either reviewer ran. No merge, live delivery, iOS
  mirror, or iOS binary work occurred.
- The preserved candidate branch is now
  `intake/centauri_carbon_2@1bc4f8f32cf650579fb53112f1bdc2b2f0024bb0`
  after a clean rebase from `1694af2` onto web `main` `c554bc2`. Custody commit
  `5c0879c` is pushed on web `main`.
- All post-rebase mechanical gates passed: `validate-data`, picker dry run,
  walkthrough (0 failures), profile matrix (0 failures), and diff guards
  (`+25/-0`). The evidence gate then found that the current packet's
  `printersJsonRow` fields were `null` while the materialized candidate row was
  populated.
- The sidecar still records `repairAttempts: 1`; the next stage-0b research
  re-entry would escalate to `decision-required`. Do not rerun intake without
  a new owner decision and a rebuilt evidence-annotated packet.
- The next product lane returns to the reviewed iOS 1.0.7 issue-fix train.
  iOS 1.0.8 remains a separate later train and neither was started here.

## What happened / Actions

1. Ran the mac-mini cold-start sync gate. Web was four commits behind; pulled
   cleanly to `c554bc2`, verified commits `f989af6`, `4d034ad`, and `1c744ba`,
   and read the complete prescribed project/runner/session context.
2. Verified candidate branch, archive ref, checkpoint tags, packet, parked
   sidecar, absent freeze/lock, clean web `main`, and untouched iOS `main`
   (six commits ahead under the push gate).
3. Ran all three prescribed preflight suites:
   `intake-r1-structured-review.test.sh` (`PASS=73 FAIL=0`),
   `intake-post-run-invariants.test.sh` (all pass), and
   `intake-run-wrapper.test.sh` (all pass).
4. Performed the no-turn diagnostic diff. The preserved failed prompt contained
   “emit this FIRST, before any prose” and a prose JSON result shape. The v2.2
   effective prompt removed those instructions and appended the canonical
   `STRUCTURED OUTPUT CONTRACT`, requiring the CLI structured-output channel
   and forbidding prose JSON. The diagnostic used `/usr/bin/true`, intentionally
   returned `empty-envelope`, and spent no review turn.
5. Changed only the ignored sidecar's authorized re-entry trigger from
   `owner` to `next-run`, preserving taint/verdict/evidence history, then ran
   `zsh scripts/intake-run-wrapper.sh` from the web root.
6. The runner rebased the candidate, passed every mechanical validator, then
   parked `research-defect` at the evidence gate. R1 and R2 were not spent.
   The wrapper completed `PREFLIGHT ok=true`, `POSTRUN ok=true`, exit `0`.
7. Verified remote `main` and the live overlay still exclude Centauri Carbon 2.
   The live overlay remains `content_version=2026071005`. Discord transport
   reported `NOTIFY posted=true`; owner-visible receipt was not independently
   verified.

## Evidence-custody observation

- Before the run, the parked sidecar recorded the preserved packet SHA-256
  `ae8e7238…`. After the run, the packet at the same path hashes
  `9d954fde…` and is a fresh deterministic Scout packet with null research
  fields. Its timestamp matches Scout's fresh `run-report.json`.
- The prior filled packet is independently visible in the quarantine evidence
  set and contains the populated, sourced `printersJsonRow` shape. The current
  sidecar still points at the old preserved hash.
- This is consistent with v2.2 stage ordering: parked-candidate re-entry occurs
  before Scout, while Scout writes to the shared `.printer-intake-out` path.
  The POSTRUN preservation check proves packet existence, not sidecar-hash
  identity, so it passed despite the content replacement.
- Captured as ai-om K3
  `2026-07-14-intake-reentry-scout-overwrote-preserved-packet`. No pipeline or
  candidate repair was attempted in this outcome-confirmation session.

## Files touched

- Tracked intake custody ledger on web `main` (runner-created commit
  `5c0879c`).
- Ignored runtime evidence under `scripts/.intake-runner-state/` and
  `scripts/.printer-intake-out/`.
- Wrap surfaces: this log, `docs/sessions/INDEX.md`,
  `docs/sessions/NEXT-SESSION.md`, and `docs/planning/ROADMAP.md`.
- ai-om: one K3 finding, findings INDEX/status, the prior K4 validation note,
  session/index/NEXT, and lesson-spotter calibration.

## Commits

- Web `5c0879c` — `chore(intake): custody centauri_carbon_2 provenance`
  (pushed during the terminal run).
- Final web and parent wrap commits are recorded by the closing session.

## Open questions / Follow-up

- Owner decision required before another intake run: rebuild the packet with
  evidence-annotated values matching the preserved candidate row, and harden
  re-entry/Scout custody so a preserved packet cannot be silently replaced.
- The v2.2 structured-output mitigation was **not exercised live**: this run
  stopped before R1. The no-turn effective-prompt diff passed, but there is no
  new live R1 verdict to count as confirmation.
- Data/logic impact evaluation: no dataset or engine change reached web
  `main`, the live overlay, or iOS. No functional, structural, UI, or UX change
  is warranted from this failed candidate run; any later utilization decision
  belongs after a valid packet and successful ship path.
- Md-hygiene: the top-level protocol pair is byte-identical; the four allowed
  root markdown files are the only root markdown; no zero-byte redirect stub,
  untracked should-be-tracked markdown, tracked secret, or actual stray
  `</content>` tag was found. ROADMAP's stale intake banner/queue row and both
  touched session indexes were updated in this wrap. Historical session-index
  coverage was not silently rewritten.
- Verify-before-mutate ledger: no entries this session.
- Memory sweep: no memory update proposed; the reusable outcome belongs in the
  product log and ai-om finding. No memory file was edited.
- Vault sweep: nothing strategic requires propagation.

## Next session

Use the regenerated `NEXT-SESSION.md`: start the reviewed iOS 1.0.7 issue-fix
plan only. Keep the Centauri intake parked and preserve its branch, packet,
sidecar, archive ref, tags, and review evidence. Do not start iOS 1.0.8 in the
same session.
