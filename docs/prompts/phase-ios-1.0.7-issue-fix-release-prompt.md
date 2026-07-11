# iOS 1.0.7 Issue-Fix Release — Execution Prompt

## Read first

1. `~/dev/Claude/Projects/CLAUDE.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md`
5. `3dprintassistant/docs/superpowers/specs/2026-07-11-ios-1.0.7-issue-fix-release-design.md`
6. `3dprintassistant/docs/superpowers/plans/2026-07-11-ios-1.0.7-issue-fix-release-plan.md`
7. `3dprintassistant-ios/CLAUDE.md`

## Goal

Execute the reviewed plan end to end through a new **1.0.7 TestFlight build**.
Stop before App Store submission until the owner accepts the exact TestFlight
build.

## Verified starting state

- Public App Store: 1.0.4.
- iOS project marketing version: 1.0.7.
- Earlier 1.0.7 TestFlight run `28830781702`: successful.
- iOS local `main`: one committed-but-unpushed data mirror,
  `bfc9a2b` (K2 SE).
- K2 SE is already live through overlay `2026071005`; the local commit only
  bundles it for offline/next-binary use.
- With that commit, shared engine/data files are byte-identical.
- Issues #2–#5 are open in `mustiodk/3dprintassistant`.
- `origin/claude/cold-start-3dpa-issues-ihs5du` is a web-only reference branch.
  It has useful #2–#5 web commits and a handoff that says iOS is still open. Read
  and reconcile it against current `origin/main`; do not merge/cherry-pick it
  wholesale or treat it as evidence that iOS is fixed.
- Web `main` already accepts `export_clicked`/`troubleshoot_used`, uses detail
  property `type`, supports iOS/Android HMAC, and has the fixed 20-blob schema.
- Export is not currently exposed in public 1.0.4 or the earlier 1.0.7
  TestFlight build. The private `exportMenu` is unreferenced; do not describe
  Orca/Prusa sharing as live before the new visible action is implemented and
  verified.

## Required workflow

1. Use Work Protocol Full lane and `superpowers:executing-plans`.
2. Set/retain the claude-sync commit hold.
3. Execute the plan strictly task by task with TDD RED→GREEN.
4. Keep one owner finding or accepted review finding per commit.
5. Before Task 1, inspect the Claude web branch and skip/adapt any web delta
   already superseded by current `origin/main`.
6. Do not push iOS until every fix, review patch, full test, shared-file identity
   check, and release note is complete.
7. Use `bridge --health`, then `bridge --mode claude-only` for the final
   independent review because Codex is the controller.
8. Push/deploy the narrow web analytics contract before relying on the new iOS
   Workshop events.
9. Push iOS `main` once, dispatch one TestFlight workflow, and monitor it.
10. Stop at owner TestFlight QA. App Store submission requires explicit owner
   authorization after acceptance.
11. After public release, perform Task 10 last. Verify public binary identity
    and independently exercise Orca and Prusa on the App Store build before
    making any live claim.
12. Manual Release is an action, not a passive status: after approval, the owner
    must wait for **Pending Developer Release**, choose **Release This Version**,
    and wait for **Ready for Distribution** plus public lookup 1.0.7 before Task
    10 begins.
13. Completion is not allowed with dirty state: every touched repo must have
    clean `git status --short` output after intended commits/pushes, or the
    remaining state must be explicitly blocked by the owner.

## Product requirements

### #2 Saved-state guard

- Loaded or just-saved profiles remain Saved/disabled while normalized state is
  unchanged.
- Any meaningful change re-enables Save; reverting disables it again.
- Deleting the active saved profile clears the guard.
- Use store-owned normalized state, not a timer.

### #3 Discord

- Public iOS invite is `https://discord.gg/4KmcHrPkcS` and test-pinned.

### #4 Workshop and Output export UX

- Workshop Export/Import are visible without the ellipsis menu.
- Multiple profiles offer All versus one named profile.
- Full backup preserves the entire envelope/tuning.
- Single-profile backup contains only the chosen profile and no unrelated global
  extras.
- Output has a visible labelled action:
  - Bambu Studio → existing native JSON bundle;
  - OrcaSlicer/PrusaSlicer → existing formatted-text share, labelled honestly.
- Do not add native Orca/Prusa serializers in this train.
- Final wording must distinguish **formatted-text sharing live** from **native
  Orca/Prusa preset export not live**.

### #5 Analytics

- Web adds `workshop_saved`, `workshop_loaded`, `workshop_exported`, and
  `workshop_imported` to the current schema.
- `workshop_exported` uses `type=all|single`; existing Output export uses
  `type=bambu_bundle|text_share`.
- Dashboard adds combined Feature Usage using blob19/eventDetail.
- Blob count/order and privacy boundary do not change.
- iOS emits only successful Workshop operations and Output action invocation;
  no profile names, ids, settings, content, or identity.

## Release requirements

- Keep `MARKETING_VERSION=1.0.7`.
- Let Fastlane generate the timestamp build number.
- Include `bfc9a2b` without claiming it makes K2 SE live.
- Run all commands and acceptance gates in the implementation plan.
- If any baseline, shared-file, test, review, deployment, or owner-QA gate fails,
  stop and diagnose; do not widen scope or submit.
