# Intake Sync-First Isolated Runner Design

**Date:** 2026-07-17  
**Status:** Owner-approved for implementation planning  
**Scope:** mac-mini production printer-intake startup and the first controlled candidate resolutions after cutover

## Problem

The daily LaunchAgent currently runs `scripts/intake-run-wrapper.sh` from the
owner's normal web-development checkout. The wrapper calls the fail-closed
preflight before any synchronization. A clean checkout that is behind
`origin/main` stops as `web-out-of-sync`; unrelated local work stops as
`web-dirty`. Production history contains both failure modes, including the
closed-intake incident in which the parked `i7_i` artifact kept later runs from
starting.

Changing the order to pull first fixes only the clean-behind case. It cannot
safely make a shared dirty checkout clean: automatically stashing, resetting,
or cleaning owner work would violate repository custody and fail-closed intake
semantics.

## Decision

Run intake from a persistent, automation-owned web checkout and synchronize
that checkout before invoking the existing wrapper:

```text
launchd
  -> stable sync bootstrap
  -> automation-owned checkout fetch + safe fast-forward gate
  -> existing fail-closed preflight
  -> existing wrapper / headless runner / POSTRUN invariants
```

The owner's development checkout is no longer a production dependency. It may
be dirty or behind without blocking intake. The automation checkout remains
strict: unexpected dirt, divergence, an autonomy freeze, or a live intake lock
still stops the run and preserves evidence.

## Filesystem Layout

The mac-mini installation uses paths outside `Projects/` so operational state
does not dirty the parent repository:

- installation root: `~/.local/share/3dpa-intake/`
- automation checkout: `~/.local/share/3dpa-intake/checkout/3dprintassistant/`
- installed bootstrap: `~/.local/share/3dpa-intake/bin/intake-sync-bootstrap.sh`
- bootstrap lock: `~/.local/share/3dpa-intake/intake-sync.lock`
- canonical iOS checkout: `~/dev/Claude/Projects/3dprintassistant-ios/`

Runner-owned ignored state remains inside the persistent automation checkout.
The installer migrates the current state once and verifies file manifests and
hashes before the LaunchAgent is repointed. Git-tracked ledger and provenance
remain normal repository data.

## Sync Bootstrap Contract

The version-controlled source for the installed bootstrap lives under
`scripts/`. A deterministic installer deploys the exact source bytes and
verifies their checksum. Bootstrap changes require the installer to be rerun;
the rest of the runner code updates naturally when the automation checkout
fast-forwards.

At each launch the bootstrap:

1. Acquires an atomic lock outside the checkout. A second invocation exits as
   an expected skip.
2. Verifies that the configured automation checkout is a git worktree on
   `main`, has the expected `origin`, and contains the runner entrypoint.
3. Refuses any dirty path. The normal runner may repair narrow custody-only
   residue after preflight when current, but the sync stage never stashes,
   resets, cleans, rebases, or commits a dirty tree.
4. Fetches `origin main`.
5. Computes ahead and behind counts.
6. Continues when current; performs `git merge --ff-only origin/main` only when
   clean, zero-ahead, and behind; refuses divergence or any local-ahead state.
7. Re-verifies clean, `main`, and `HEAD == origin/main`.
8. Exports the canonical iOS path and executes the freshly synchronized
   checkout's wrapper.
9. Preserves the wrapper's exit code and releases the bootstrap lock on every
   trappable exit.

Every refusal emits a machine-readable reason and invokes the existing failure
notifier when available. Missing checkout or missing notifier still fails
loudly through the LaunchAgent stderr log.

This sync gate is intentionally stricter than the wrapper's custody-repair
allowance. Syncing across dirty custody files would require an automatic
stash/commit/rebase policy and could corrupt append-only evidence. Such a state
is an incident to inspect, not a reason to mutate blindly.

## Path Configuration

The wrapper and preflight gain explicit `--ios-repo` test/production seams,
with the current sibling checkout as the interactive default. The bootstrap
passes the canonical iOS checkout explicitly. JavaScript validation and
republish tools consume the same configured path rather than assuming the iOS
repository is a sibling of the web checkout.

This keeps the iOS repository canonical and unchanged. Intake may create its
existing local mirror commits there only after a web ship reaches the current
post-merge mirror stage. It must never push iOS commits or dispatch a
TestFlight train; the standing iOS push gate remains authoritative.

## Installation and Cutover

The installer is idempotent and supports a verification-only mode. It:

1. Requires a clean/current source web repository and the expected remote.
2. Creates or validates the persistent automation checkout.
3. Copies ignored runner state from the former checkout only during an
   explicit migration, using a manifest plus SHA-256 verification and refusing
   destination conflicts.
4. Installs and checksum-verifies the bootstrap.
5. Renders/installs the LaunchAgent so `WorkingDirectory` and the entrypoint
   use the automation installation rather than the development checkout.
6. Leaves the old LaunchAgent load untouched until all verification checks are
   green; cutover uses `bootout`, atomic plist replacement, `bootstrap`, and
   `launchctl print` verification.

Rollback is operationally simple: boot out the new agent, restore the previous
plist, and bootstrap it. No repository reset or candidate mutation is part of
rollback.

## Verification Matrix

Automated tests use temporary git repositories and stubbed notifier/wrapper
commands. Required cases:

| Starting state | Expected result |
|---|---|
| automation checkout clean/current | wrapper runs once |
| clean/behind, zero ahead | fast-forward, then wrapper runs once |
| dirty (including custody dirt) | no fetch merge, no wrapper, failure reason |
| local ahead | no wrapper, failure reason |
| diverged | no wrapper, failure reason |
| wrong branch or wrong origin | no wrapper, failure reason |
| sync lock held | expected skip, no wrapper |
| development checkout dirty/behind while automation checkout is valid | wrapper still runs |
| iOS clean and eight commits ahead | preflight remains green |
| iOS dirty or behind | preflight remains fail-closed |
| autonomy freeze or live intake lock | existing skip semantics remain intact |

Cutover additionally requires a supervised LaunchAgent kickstart with zero
candidates, green sync/preflight/POSTRUN evidence, and unchanged iOS ahead
count. No parked candidate is rerun as part of infrastructure verification.

## Candidate Resolution After Cutover

Candidate work remains serial and owner-gated until the new launch path passes
the controlled zero-candidate run.

1. Resolve parked `i7_i` as a duplicate of the already-shipped Creality
   `sparkx_i7` (`i7`, `i Series`). Append the sanctioned owner-resolution
   outcome, preserve the parked artifact as evidence, and make no catalog,
   overlay, or iOS data change.
2. Re-enter Snapmaker U1 with owner-approved `series_group: "U Series"` through
   the normal intake pipeline. All existing research, dual-review, live
   verification, custody, notification, and POSTRUN gates apply.
3. Do not push the local iOS mirror commit and do not start or dispatch iOS
   1.0.7/1.0.8.

The two candidate actions are never combined into the infrastructure cutover
test and are not automatically rerun merely because the scheduler is healthy.

## Product Impact Evaluation

The sync/bootstrap change is operational infrastructure only. It changes no
dataset, engine logic, web UI, or iOS UI.

The i7 duplicate resolution also changes no product data. The later U1 intake
is an additive printer-data change and must run the existing web and iOS data
impact checks before shipping. No new UI/UX or engine behavior is anticipated;
that conclusion must be rechecked against the actual U1 packet and diff.

## Explicit Non-Goals

- No automatic stash, reset, clean, rebase, or recovery of arbitrary dirt.
- No ephemeral clone that discards parked branches or runner evidence.
- No weakening of preflight, freeze, lock, review, live-verify, POSTRUN, or
  notification gates.
- No automatic rerun of either parked candidate during installation/testing.
- No iOS push, TestFlight dispatch, or 1.0.7/1.0.8 train start.
