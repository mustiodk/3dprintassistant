# 2026-07-18 — Snapmaker U1 owner re-entry and live ship

## Durable context

- Snapmaker U1 is live through the normal additive intake path under
  `snapmaker / U Series / u1`; its supported nozzle sizes are
  `[0.2, 0.4, 0.6, 0.8]`, and the note now says the machine can build a small
  prime/wiping tower instead of claiming that no purge tower is required.
- The first U1 attempt produced `R1 GO / R2 NO-GO` and parked fail-closed. The
  owner approved the two corrections, and only a fresh production run with
  contract-valid `R1 GO / R2 GO` was allowed to ship.
- Run `run-20260718T112636Z` ended `1 shipped · 0 parked · 0 errored`; live
  overlay and picker verification passed, web custody closed, and the iOS data
  mirror remains local-only under the push gate.
- The isolated runner checkout initially lacked the gitignored notifier config.
  The shipped-and-unreported control correctly created a PD8 freeze. The
  existing protected config was restored and only the saved report was replayed
  successfully; no candidate rerun occurred and the freeze remains owner-gated.

## What happened / Actions

1. Re-verified official Snapmaker evidence for the four nozzle diameters and
   the U1 priming/wiping behavior.
2. Corrected the candidate's nozzle list and purge-tower wording, then entered
   it through the owner-decision re-entry command rather than editing live data.
3. Preserved the initial review split, applied the owner resolution, and ran a
   fresh review sequence. R1 and R2 both returned semantic `GO`.
4. Merged and pushed the web/overlay change, verified production delivery on
   overlay attempt 3 plus picker `GREEN`, created the local-only iOS mirror,
   and pushed custody.
5. Diagnosed the post-ship notification failure as missing protected config in
   the new isolated checkout. Copied the already-existing mode-600 config
   without printing its secret and replayed only the saved run report;
   notifier returned `posted=true`.
6. Left `scripts/.intake-autonomy-freeze` in the installed checkout because
   PD8 assigns deletion to the owner. The daily 12:00 job will stop fail-closed
   until the owner authorizes clearance.
7. Captured the repeated PD5 reviewer split as AI-OM K1 recurrence
   [`2026-07-18-pd5-reviewers-split-on-u1-evidence.md`](../../../ai-operating-model/docs/findings/2026-07-18-pd5-reviewers-split-on-u1-evidence.md).

## Files touched (Modified / Deleted / Untracked)

- Product commits changed the additive printer surfaces: `data/printers.json`,
  iOS overlay data/manifest, picker/walkthrough proof, provenance, and the
  append-only intake outcome ledger.
- The sibling iOS repo changed only its bundled `printers.json` mirror in local
  commit `cdf5906`; it was not pushed.
- Wrap changes: `docs/planning/ROADMAP.md`, `docs/sessions/INDEX.md`,
  `docs/sessions/NEXT-SESSION.md`, and this log.
- Runtime-only protected state in the isolated checkout: mode-600
  `scripts/.printer-intake.local.json` exists; the PD8 freeze marker remains.
- Deleted only after successful custody: U1 candidate branch, packet, and
  parked sidecar. No intake lock remains.

## Commits

- `11c7a82` — corrected owner-approved U1 candidate.
- `cc65622` — shipped U1 to web main and the remote iOS overlay.
- `732cbc8` — closed intake provenance/custody.
- `cdf5906` — local-only iOS bundled-data mirror; deliberately unpushed.
- AI-OM `0b94411` — K1 recurrence finding and status/index updates.
- Final wrap commit contains this log plus ROADMAP/INDEX/NEXT updates.

## Data/logic change evaluation

- Web needed the printer-data, picker, walkthrough, and remote-overlay changes
  to expose the corrected U1.
- iOS needed the remote overlay for existing users and a byte-matched local
  bundled-data mirror for the next authorized binary train. It did not need a
  TestFlight release now.
- Engine logic and wider UI structure did not need changes; the existing
  additive catalog path consumes the new row.

## Open questions / Follow-up

- Owner action is required before deleting the installed checkout's
  `scripts/.intake-autonomy-freeze`. Do not infer clearance from the successful
  report replay.
- TDD-harden `scripts/install-intake-runner.sh` so future isolated-checkout
  installs migrate or explicitly verify the protected notifier config, preserve
  mode 600, and never log the webhook.
- Md-hygiene: no root redirect stubs, untracked Markdown, secret-like tracked
  paths, INDEX/file drift, bare trailing `</content>` tag, or stale ROADMAP
  section was found. Existing historical docs were not broadened.
- Memory sweep proposal only: retain the reusable point that an isolated intake
  install must preserve protected notifier configuration and that a ship is not
  operationally complete until notification succeeds. No memory file was
  changed.
- Vault sweep: no cross-project knowledge needed propagation.
- Verify-before-mutate summary (verbatim):

```text
verify-before-mutate ledger: no entries this session
```

## Next session

Cold-start against live/runtime evidence. Confirm U1 still appears in the
production overlay and picker, confirm the installed notifier config exists
with mode 600 without exposing it, and show the owner the exact PD8 freeze.
Clear it only on explicit owner authorization. Do not rerun U1 or `i7_i`, and
do not start or push the iOS 1.0.7/1.0.8 trains.
