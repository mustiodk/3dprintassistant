# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for a fresh session on the mac-mini.

**Last updated:** 2026-07-13 after the terminal Centauri Carbon 2 continuation.
The intake is parked `review-unavailable`, nothing shipped, and the owner has
explicitly closed the intake lane until a later command. The next product lane
is the reviewed iOS 1.0.7 issue-fix train; the separate iOS 1.0.8 tip-jar train
comes after it.

Copy everything between the markers into the fresh session.

>>> START >>>

3dpa cold start on the mac-mini. Start the reviewed iOS 1.0.7 issue-fix
release plan. Do not restart or diagnose printer intake, and do not start the
1.0.8 tip-jar train in this session.

Read in order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md` (top lock banner + active queue)
5. `3dprintassistant/docs/sessions/INDEX.md`
6. These session logs in full:
   - `3dprintassistant/docs/sessions/2026-07-13-cowork-appdev-centauri-intake-terminal.md`
   - `3dprintassistant/docs/sessions/2026-07-13-cowork-appdev-r1-boundary-rootcause.md`
   - `3dprintassistant/docs/sessions/2026-07-13-cowork-appdev-centauri-pd5-handover.md`
7. This `NEXT-SESSION.md`
8. The reviewed 1.0.7 packet:
   - `3dprintassistant/docs/superpowers/specs/2026-07-11-ios-1.0.7-issue-fix-release-design.md`
   - `3dprintassistant/docs/superpowers/plans/2026-07-11-ios-1.0.7-issue-fix-release-plan.md`
   - `3dprintassistant/docs/reviews/2026-07-11-ios-1.0.7-plan-review.md`

Before any mutation:

```bash
cd ~/dev/Claude/Projects
~/.claude/claude-sync.sh health
~/.claude/claude-sync.sh verify-parents
~/.claude/claude-sync.sh push-children --dry
git -C 3dprintassistant fetch origin --prune
git -C 3dprintassistant status --short --branch
git -C 3dprintassistant rev-parse HEAD origin/main
git -C 3dprintassistant-ios fetch origin --prune
git -C 3dprintassistant-ios status --short --branch
git -C 3dprintassistant-ios rev-list --left-right --count main...origin/main
git -C 3dprintassistant-ios log --oneline --decorate -10
```

Expected state to verify, not assume:

- Web clean `main`, equal to `origin/main`, at or beyond the terminal wrap
  commit.
- iOS clean `main`, six commits ahead at wrap: K2 SE bundled mirror plus the
  verified Export Phases 2–4 mirrors. The push gate remains active. Reconcile
  the exact commits and current-main plan assumptions before implementation.
- `centauri_carbon_2` remains owner-parked at candidate `1694af2`; archive ref
  and checkpoint tags remain preserved. Nothing from it is on remote `main` or
  the live overlay.
- Android may be absent on this machine; it is out of scope.

Execute the reviewed iOS 1.0.7 plan task-by-task using its required
`superpowers:executing-plans` workflow and checkpoints. Important boundaries:

1. Run Task 0 current-state reconciliation before relying on the 2026-07-11
   starting-state counts. The iOS ahead count moved from one to six because
   Export Phases 2–4 are now locally mirrored and verified.
2. Implement only issues #2–#5 plus the plan's narrow current-main-compatible
   web analytics prerequisite. Do not wholesale merge or cherry-pick the stale
   Claude reference branch.
3. Keep `MARKETING_VERSION=1.0.7`; Fastlane owns the fresh build number.
4. Preserve web as master for shared engine/data. No unrelated engine/data,
   printer-intake, Android, accounts, or 1.0.8 work.
5. Keep every iOS commit local until the complete 1.0.7 scope is implemented,
   reviewed, all required web/iOS tests are green, shared files are verified,
   the repos are clean, and the exact train is TestFlight-ready. Do not push
   iOS early.
6. Owner acceptance of the exact TestFlight build gates App Store submission.
7. Stop after the 1.0.7 terminal report. The next separate train is iOS 1.0.8
   tip jar; do not start it without a fresh owner command.

Printer-intake hard stop:

- Do not run the LaunchAgent, wrapper, R1 boundary, Bridge review, Scout, or
  any Centauri validator/retry.
- Do not delete or rewrite its parked sidecar, candidate branch, archive ref,
  checkpoint tags, ignored packet, or raw R1 evidence.
- The latest authorized turn passed all deterministic gates but R1 returned
  prose without `structured_output`; the boundary parked exit 65. R2, merge,
  live verify, iOS mirror, and ship did not run. Another turn requires a new
  explicit owner command.

Standing rules:

- Show the progress tracker on multi-step work.
- ROADMAP is truth; read it fully before status claims.
- One finding = one commit.
- Preserve the iOS push gate and clean-state release gate.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
