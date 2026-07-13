# Intake Bridge Output + Candidate Recovery Design

**Date:** 2026-07-13

**Status:** owner-approved design; P0/P1 review amendments accepted; implementation gated on the reviewed plan

**Scope:** repair the autonomous intake runner's Bridge-output integration, then continue `centauri_carbon_2` from its preserved checkpoint without rerunning Scout or bypassing PD5.

## Problem

The 2026-07-13 intake run completed its candidate work correctly: Reviewer 1 returned structured `NO-GO`, Reviewer 2 returned structured `GO`, the candidate was parked as `review-split` / `decision-required`, custody was pushed, Discord was notified, the lock was released, and checkout returned to `main`.

The wrapper still exited `65` because the pinned PD5 command omitted `--out-dir`. Bridge therefore used its default output directory (the current Git worktree) and left `bridge-2026-07-13-100815-004699.md` untracked. The strict POSTRUN cleanliness gate correctly rejected that artifact. This is distinct from the already-fixed Codex-model mismatch: Bridge itself succeeded in this run.

## Goals

1. Route every PD5 Bridge report to a durable, git-ignored, absolute directory.
2. Preserve the strict POSTRUN gate; a root-level Bridge artifact remains a failure.
3. Test-lock both directory creation and the pinned command contract.
4. Preserve the current report and all earlier incident evidence byte-for-byte.
5. Continue `centauri_carbon_2` from branch/state checkpoints under an explicit owner instruction.
6. Require a fresh structured `{GO,GO}` before merge or live delivery.

## Non-goals and invariants

- Do not run Scout or repeat the full research/intake pipeline.
- Do not relax the `decision-required` taxonomy or its owner trigger.
- Do not treat the previous Reviewer 2 `GO` as reusable after evidence/base changes.
- Do not edit `engine.js`, `app.js`, or any iOS source. The only validator
  change allowed is the targeted evidence/parity rule in Design B; runtime
  profile behavior and general manufacturer-evidence policy remain unchanged.
- Do not push iOS; its six local commits remain behind the push gate.
- Do not delete `be49fea`, `8695583`, the parked sidecar, session logs, or Bridge reports.
- Do not allow Bridge report filenames as POSTRUN custody paths.

## Design A — Bridge output repair

The canonical output directory is:

`/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/scripts/.intake-runner-state/bridge-reviews`

It is already covered by the repository's `scripts/.intake-runner-state/` ignore rule.

The launch wrapper creates this directory before starting the headless runner. Both the web kickoff and the ai-operating-model runner contract pin the only PD5 Reviewer-2 form to:

```sh
bridge --mode codex-only "<concrete review prompt over main...intake/<printer-id>>" \
  --out-dir /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/scripts/.intake-runner-state/bridge-reviews
```

`bridge --health` remains the only pre-review probe. The direct fallback remains `codex exec -s read-only -m gpt-5.5`.

Tests first prove the current defect:

- the wrapper does not create the Bridge output directory;
- the kickoff lacks the absolute `--out-dir` contract.

The minimal implementation then creates the directory and updates the two contracts. Existing POSTRUN tests continue proving a root-level Bridge report yields `web-dirty`; a new positive case proves a report inside the ignored state directory does not dirty the worktree.

After GREEN verification, the current untracked report is moved into `bridge-reviews/` only after recording source and destination SHA-256 equality. No report content is changed.

## Design B — `centauri_carbon_2` checkpoint continuation

The preserved branch `intake/centauri_carbon_2` at `8695583` is the candidate checkpoint. The sidecar is permanently tainted and parked as `decision-required`, so a normal scheduled run must not retry it. This owner-approved design is the explicit `owner-instruction` edge allowed by the v2.1 taxonomy.

Continuation sequence:

1. Land the Bridge-output repair on web `main` and update the ai-operating-model contract.
2. Rebase the preserved candidate branch onto current web `main`; do not recreate the candidate from Scout.
3. Update the preserved evidence/review packet so `cool_plate` cites Elegoo's official Centauri Series accessory page, which explicitly describes a "Cool Plate Surface" for low-temperature PLA printing.
4. Record `open_door_threshold_bed_temp: 45` as an owner-approved 3dpa repository convention, not as a manufacturer claim:
   - current data audit: all 21 passive-enclosure printers use `45`;
   - add the field to the candidate packet with `source: null`,
     `confidence: "owner-approved"`, `evidenceType: "repo-convention"`, and a
     typed `ownerResolution` containing the exact policy id
     `passive-enclosure-open-door-threshold`, a parseable approval timestamp,
     and non-empty rationale;
   - do not label the value `manufacturer` and do not fabricate a manufacturer URL.
5. Extend `validate-candidate-evidence.js` narrowly so this convention passes
   only for `open_door_threshold_bed_temp`, only at value `45`, only when the
   candidate enclosure is `passive`, only with the typed owner resolution, and
   only while every materialized passive-enclosure row in `data/printers.json`
   also carries `45`. No other field gains a repository-convention exception.
6. Make the evidence gate compare the complete candidate packet row against
   the materialized candidate in `data/printers.json`: metadata objects compare
   through their `value`, scalar identity fields compare directly, missing
   optional critical fields fail when present in the materialized row, and any
   mismatch parks before review. The runner invocation becomes
   `node scripts/validate-candidate-evidence.js <candidate-packet> --printers-json data/printers.json`.
   Update the materialized candidate notes to retain the packet's manufacturer
   citation rather than weakening the parity rule.
7. Rerun the candidate evidence gate, diff guards, data validation, picker dry-run, walkthrough harness, profile matrix audit, overlay validation, and `git diff --check`.
8. Run a fresh hostile Reviewer 1 and a fresh Bridge Reviewer 2 using the repaired absolute output directory. Validate both structured outputs.
9. Classify the new verdicts exactly as v2.1 requires:
   - `{GO,GO}`: recheck remote `main`, merge/push web, verify live overlay and picker, create the local-only byte-identical iOS mirror, then write `docs/printer-provenance.json` plus the outcomes ledger in the normal atomic custody commit on `main`, push it, and finish notify/cleanup;
   - any `NO-GO`: update the parked sidecar with the exact objections and stop;
   - reviewer unavailable/malformed: park fail-closed and stop.

The earlier split verdict stays in history. It is never overwritten or reinterpreted.

Candidate review evidence and owner resolution stay in the ignored candidate
packet/parked sidecar before PD5. `docs/printer-provenance.json` is not edited on
the candidate branch: it is a shipped-state custody artifact and is written only
after fresh `{GO,GO}`, merge/push, live verification, and the local-only iOS
mirror succeed. A parked or failed candidate therefore cannot appear in the
committed shipped-printer provenance document.

## Error handling

- Missing/unwritable Bridge output directory fails before a paid review turn.
- Any root-level Bridge report still makes POSTRUN return `65`.
- A changed remote `main` forces rebase, full validator rerun, and two fresh reviews.
- The candidate never ships from owner approval alone; owner approval authorizes re-entry, not merge.
- No provenance or outcomes custody line is committed for a candidate that
  parks, fails review, or fails live verification.
- If the repaired review path fails, preserve its transcript/session report before any further attempt.

## Acceptance criteria

- RED is observed for the missing directory/contract behavior before implementation.
- The focused wrapper, POSTRUN, preflight, and reviewer-contract shell/Node suites are GREEN on macOS.
- The evidence-gate suite proves packet/materialized-row parity, rejects an
  omitted or mismatched optional field, accepts the typed 45-degree passive
  enclosure convention, and rejects that convention for every other field,
  value, or enclosure class.
- The full existing intake shell suites remain GREEN.
- The pinned Bridge command includes the absolute ignored output directory in both governing documents.
- The preserved 2026-07-13 Bridge report has identical source/destination SHA-256 after relocation.
- Web `main` is clean and synchronized before any candidate continuation.
- No full LaunchAgent rerun is used for this candidate.
- `centauri_carbon_2` ships only after fresh validated `{GO,GO}` plus live verification; otherwise it remains parked with a precise terminal reason.

## Implementation surfaces

Web repository:

- `scripts/intake-run-wrapper.sh`
- `scripts/intake-run-wrapper.test.sh`
- `scripts/intake-post-run-invariants.test.sh`
- `scripts/intake-run-kickoff.md`
- `scripts/validate-candidate-evidence.js`
- `scripts/validate-candidate-evidence.test.js`
- `scripts/validate-reviewer-output.test.js`
- `docs/printer-provenance.json` and
  `scripts/printer-intake-outcomes.jsonl` only in the post-live custody commit on
  `main`
- ignored `.intake-runner-state/` evidence and candidate packet

AI operating model repository:

- `docs/agents/intake-pipeline-runner.md`

The candidate's existing data/overlay/walkthrough diff is changed only if a fresh reviewer or validator identifies a concrete defect.
