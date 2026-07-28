# Intake freeze auto-recovery design

**Date:** 2026-07-28
**Status:** Owner-approved for autonomous implementation
**Mode / lane:** Work Protocol Code / Full

## 1. Scope

Fix the existing unattended printer-intake automation so a
`shipped-and-unreported` runtime freeze can recover safely after notification
transport is restored. The fix must preserve the fail-closed safety posture,
must not manually process the queued request, and must not clear any freeze
unless the exact shipped run has just been reported successfully.

The current queued request and runtime freeze remain untouched during
development. No intake run is kickstarted as part of implementation.

## 2. Verified failure chain

The daily LaunchAgent is running on schedule, but the wrapper exits in
preflight with `rc=78` because the isolated automation checkout contains a
`shipped-and-unreported` freeze from U1 run
`run-20260718T112636Z`.

That freeze was created correctly: U1 shipped, but the isolated checkout did
not have the gitignored notifier config, so Discord delivery failed. The
config was later restored and the saved report was replayed successfully, but
PD8 has no automatic recovery contract. The freeze therefore remained and has
blocked every later scheduled run before Scout or assisted research could
start.

The typo in `Elegoo seturn 4 ultra 16k` is not the infrastructure failure. The
request was correctly classified as `needs-research`; assisted research should
resolve it to Elegoo Saturn 4 Ultra 16K and the normal non-FDM terminal path
should decline it. This change does not manually advance that candidate.

## 3. Recovery ownership and sequence

Recovery is split across two existing boundaries:

1. `intake-run-wrapper.sh` owns sequencing. Before normal preflight, it invokes
   notifier recovery once.
2. `intake-notify.js` owns notification evidence and freeze mutation. It
   validates the frozen run, reposts the exact saved report, and removes the
   freeze only after a successful Discord response.
3. Normal preflight then runs unchanged. If recovery is not applicable or
   fails, the freeze remains and preflight still exits `78`.

This keeps preflight a read-only predicate checker and prevents shell code from
reimplementing report/freeze semantics.

## 4. Structured freeze contract

Newly created `shipped-and-unreported` freezes include:

```json
{
  "reason": "shipped-and-unreported",
  "runId": "run-...",
  "shipState": "known",
  "shipped": 1,
  "detail": "...",
  "at": "..."
}
```

`shipState` is either:

- `known`: the terminal report proves a positive shipped count.
- `unknown`: a wrapper-level failure occurred after the runner started and may
  have shipped.

An unknown ship state remains permanently fail-closed for automatic recovery.
It needs owner investigation because there is no exact terminal report to
replay safely.

## 5. Exact-run recovery gate

The recovery mode reads:

- `scripts/.intake-autonomy-freeze`
- `scripts/.intake-runner-state/last-run-report.json`
- the protected notifier config

It may delete the freeze only when every condition is true:

1. Freeze JSON is valid.
2. `reason` is exactly `shipped-and-unreported`.
3. Ship state is known.
4. Freeze `runId` is non-empty.
5. Saved report JSON is valid.
6. Saved report `runId` exactly equals freeze `runId`.
7. The normalized saved report proves `shipped > 0`.
8. Discord POST succeeds.

Missing files, malformed JSON, a mismatched run ID, zero shipped candidates,
unknown ship state, absent webhook configuration, or failed HTTP delivery all
leave the freeze byte-for-byte in place and return a non-zero recovery result.
Logs never print the webhook URL or config contents.

The recovery operation is idempotent from the scheduler's perspective:

- no freeze means a no-op success;
- a recovered freeze is deleted only after the POST succeeds;
- a failed recovery remains frozen;
- after recovery, the same wrapper invocation proceeds to normal preflight
  exactly once.

Discord does not provide an idempotency key or historical delivery receipt, so
a process crash between successful POST and freeze deletion can duplicate the
message. That is safer than silently clearing without delivery proof.

## 6. Legacy live-freeze migration

The live U1 freeze predates the structured fields and contains the exact run ID
and known shipped count only in its deterministic `detail` string.

Recovery may parse a legacy freeze only when its detail matches this strict
shape:

```text
run <run-id> shipped <positive-integer> candidate(s) but the Discord run report could not be delivered
```

The parsed run ID must still exactly match
`last-run-report.json`, whose normalized contents must independently prove a
positive shipped count. Free-form legacy text and unknown-shipment wording are
never accepted.

There is no persisted delivery receipt for the earlier manual replay. The
owner explicitly accepts one possible duplicate U1 Discord report so the
scheduled recovery can establish fresh delivery proof and clear the legacy
freeze safely.

## 7. Protected notifier-config installation

`install-intake-runner.sh` must migrate and verify
`scripts/.printer-intake.local.json` along with runtime state:

- source is the explicitly supplied migration checkout;
- destination must be byte-identical if already present;
- unequal source/destination fails without overwrite;
- missing source fails because notification delivery is an enablement
  requirement for this installed runner;
- destination mode must be exactly `0600`;
- verify-only checks presence, byte equality against the migration source, and
  mode without printing secret bytes.

The secret file is not added to the state manifest, whose contents describe
mutable runner state. It receives a separate protected-config verification.

## 8. Tests and proof

TDD must cover:

1. Freeze creation stores structured run ID and known ship state.
2. `shippedUnknown` stores unknown ship state.
3. Exact known run + successful POST clears the freeze.
4. Run-ID mismatch does not POST or clear.
5. Unknown ship state does not POST or clear.
6. Missing or malformed saved report does not clear.
7. Failed POST does not clear.
8. Strict legacy known-shipment freeze recovers.
9. Legacy unknown/free-form freeze does not recover.
10. Wrapper invokes recovery before preflight and continues exactly once after
    success.
11. Wrapper leaves normal freeze/lock skip behavior intact when recovery fails.
12. Installer migrates config byte-identically with mode `0600`.
13. Installer missing-source and unequal-destination cases fail without
    printing or overwriting the secret.
14. Verify-only detects config drift and wrong mode.

Full proof includes the notifier, wrapper, preflight, installer, bootstrap, and
relevant contract tests plus an independent adversarial review. Runtime state
is inspected read-only after deployment; the intake job is not manually run.

## 9. Documentation and platform impact

Update the web runbook, intake gate ledger/ROADMAP, and the AI operating-model
runner contract so PD8 describes verified automatic recovery instead of
permanent manual deletion.

This is automation-control code only:

- `engine.js` and `data/` are unchanged.
- Web UI behavior is unchanged.
- iOS code, data, TestFlight, and the iOS push gate are untouched.
- No web/iOS functional or UX change is needed to consume the fix.

## 10. Release

After tests and review are green:

1. Merge the reviewed web branch to web `main` and push.
2. Merge the aligned AI operating-model contract change in its own repository
   without touching unrelated parent/sibling work.
3. Update the isolated installed checkout through the installer/verify path so
   protected config is proven present and mode `0600`.
4. Do not kickstart the LaunchAgent.
5. The next scheduled 12:00 invocation syncs the new code, replays the exact U1
   report once, clears the legacy freeze only on successful delivery, passes
   normal preflight, and then lets the existing automated intake process handle
   the queued request.

Any failed recovery leaves the freeze in place and is a critical operational
finding, not permission for manual intake.
