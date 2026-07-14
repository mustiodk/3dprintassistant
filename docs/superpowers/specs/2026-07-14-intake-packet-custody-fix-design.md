# Intake Packet Custody Fix Design

**Date:** 2026-07-14
**Scope:** Deterministic Scout and POSTRUN behavior for parked-candidate re-entry.

## Problem

Stage 0b re-enters a preserved filled candidate packet before stage 2 runs
Scout. Scout currently writes a fresh skeleton to the same deterministic
candidate filename, overwriting the evidence-bearing packet. The later
evidence gate then evaluates the skeleton and parks a false research defect.
POSTRUN only checks that some candidate file exists, so it accepts the wrong
bytes as preserved evidence.

An isolated fixture reproduction proves the overwrite: the SHA-256 of a
pre-seeded candidate file changes after Scout runs with the same candidate.

## Design

1. Scout treats an existing candidate file as crash/re-entry state and never
   overwrites it. New candidates still receive a skeleton. The run report
   records which candidate filenames were preserved.
2. POSTRUN uses `candidateArtifact.path` and `candidateArtifact.sha256` when
   both are present in a fresh parked sidecar. The exact artifact must exist
   under the repository and match the declared hash. Legacy sidecars without
   those fields retain the current existence fallback.
3. Before the authorized clean rerun, archive the invalid 2026-07-14 active
   runtime surfaces, restore the last valid pre-failure sidecar state, and
   stage a previously preserved filled packet only after validating it against
   the preserved candidate branch.
4. Historical branches, tags, raw reviewer output, known-good snapshots, and
   append-only outcome/provenance records remain untouched.

## Alternatives rejected

- Moving every parked packet into a new custody store is stronger isolation
  but requires a broader sidecar migration and more LLM-runner contract logic.
- Snapshotting and restoring staging around Scout masks the overwrite instead
  of fixing its source.

## App impact

This changes only intake tooling and terminal evidence verification. The web
and iOS apps, engine behavior, data schema, UI, and UX need no changes.

## Verification

- A Scout regression test pre-seeds a filled packet and requires byte-for-byte
  preservation plus report visibility.
- POSTRUN tests require a declared matching hash to pass and a mismatch to
  fail closed.
- The full Scout, POSTRUN, and wrapper suites must pass before the live rerun.
- The live rerun must end in the pipeline's real terminal state; no ship is
  inferred from prose or wrapper exit status.
