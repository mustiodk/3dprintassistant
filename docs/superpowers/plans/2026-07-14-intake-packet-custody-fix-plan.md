# Intake Packet Custody Fix Implementation Plan

> **For Codex:** Execute each task in order with test-first verification and stop fail-closed on any unexplained result.

**Goal:** Prevent Scout from destroying preserved re-entry evidence and make POSTRUN verify artifact identity before rerunning Centauri Carbon 2.

**Architecture:** Keep the existing shared staging layout, but make candidate creation create-only. Strengthen the terminal gate to validate an artifact path and SHA declared by fresh v2 sidecars, with the old existence check only for legacy sidecars.

**Tech Stack:** Node.js scripts/tests, zsh invariant script/tests, git, existing intake wrapper.

---

### Task 1: Lock the Scout overwrite regression

**Files:**
- Modify: `scripts/printer-intake-scout.test.js`

1. Add a test that seeds an existing candidate with sentinel bytes.
2. Run the Scout suite and confirm the new assertion fails because the bytes change.
3. Record the preserved filename expectation for the run report.

### Task 2: Make Scout candidate writes create-only

**Files:**
- Modify: `scripts/printer-intake-scout.js`
- Test: `scripts/printer-intake-scout.test.js`

1. Detect existing candidate paths before writing skeletons.
2. Preserve existing bytes and add `preservedExistingCandidates` to the report.
3. Run the Scout suite and confirm it passes.

### Task 3: Lock artifact-identity POSTRUN behavior

**Files:**
- Modify: `scripts/intake-post-run-invariants.test.sh`

1. Add a matching-SHA pass case for a fresh sidecar.
2. Add a mismatching-SHA fail-closed case expecting `park-packet-mismatch`.
3. Run the POSTRUN suite and confirm the mismatch case fails before production code changes.

### Task 4: Enforce sidecar artifact identity

**Files:**
- Modify: `scripts/intake-post-run-invariants.sh`
- Test: `scripts/intake-post-run-invariants.test.sh`

1. Parse `candidateArtifact.path` and `candidateArtifact.sha256` from JSON.
2. Reject unsafe/out-of-repository paths, missing exact artifacts, and hash mismatches.
3. Preserve the current existence fallback for sidecars without full identity metadata.
4. Run POSTRUN, wrapper, and Scout suites.

### Task 5: Review and publish the tooling fix

**Files:**
- Verify all files changed on `fix/intake-packet-custody`.

1. Run diff checks and the required three intake suites.
2. Commit the regression and implementation as one focused fix.
3. Merge to web `main`, push, and verify remote ancestry.

### Task 6: Restore clean Centauri re-entry state

**Files:** Runtime-only ignored state under `scripts/.intake-runner-state/` and `scripts/.printer-intake-out/`.

1. Validate a preserved filled packet against `intake/centauri_carbon_2`.
2. Archive conflicting active run/report/sidecar/staging surfaces into a timestamped quarantine directory.
3. Restore the valid review-unavailable sidecar state and validated packet.
4. Run wrapper preflight and confirm the live branch/state premises.

### Task 7: Execute and handle the live rerun

1. Invoke the authorized wrapper exactly once per evidence-based repair cycle.
2. Inspect the structured terminal report, POSTRUN result, branch/ledger/overlay state, and live overlay.
3. For a new actionable defect, add a failing test, patch minimally, rerun full verification, and retry; stop only on a genuine repeated no-progress loop or owner-only gate.
4. Report GO/GO, NO-GO, split, review-unavailable, or other terminal state faithfully; never force shipping.

### Task 8: Wrap

1. Run required repository/session hygiene and verification-before-completion.
2. Update live docs/findings with the actual terminal outcome.
3. Commit/push web and parent documentation as allowed; never push iOS.
4. Release the sync hold.
