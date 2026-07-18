# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for a fresh iOS 1.1.0 execution session
on the mac-mini.

**Last updated:** 2026-07-18 after owner ratification, hostile plan review, and
selection of Tasks 0–9. Implementation has not started.

Copy everything between the markers into the fresh session.

>>> START >>>

Cold start 3dpa.

Execute the owner-ratified, hostile-reviewed iOS 1.1.0 notification release
plan through Tasks 0–9, then stop at G0. Work as autonomously as possible inside
that boundary. Do not ask me to repeat the Claude login/CAPTCHA flow; the
protected headless auth path is already available for the required independent
Claude review.

Read in order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md` in full
5. `3dprintassistant/docs/sessions/INDEX.md`
6. These latest three session logs in full:
   - `3dprintassistant/docs/sessions/2026-07-18-cowork-appdev-ios-1.1.0-plan-ratification.md`
   - `3dprintassistant/docs/sessions/2026-07-18-cowork-appdev-u1-owner-reentry-ship.md`
   - `3dprintassistant/docs/sessions/2026-07-16-cowork-appdev-intake-parked-path-root-cause.md`
7. This `NEXT-SESSION.md`
8. Task-specific sources:
   - `3dprintassistant/docs/superpowers/specs/2026-07-18-ios-1.1.0-notification-release-design.md`
   - `3dprintassistant/docs/superpowers/plans/2026-07-18-ios-1.1.0-notification-release-plan.md`
   - `3dprintassistant/docs/reviews/2026-07-18-ios-1.1.0-notification-release/plan-review-disposition.md`
   - `3dprintassistant/docs/reviews/2026-07-18-ios-1.1.0-notification-release/bridge-2026-07-18-221251-462143.md`

Before any mutation, run the cold-start sync gate and the complete Task 0
baseline/custody checks from the plan. At minimum:

```bash
cd ~/dev/Claude/Projects
~/.claude/claude-sync.sh health
~/.claude/claude-sync.sh verify-parents
~/.claude/claude-sync.sh push-children --dry
git -C 3dprintassistant fetch origin --prune
git -C 3dprintassistant status --short --branch
git -C 3dprintassistant rev-list --left-right --count main...origin/main
git -C 3dprintassistant-ios fetch origin --prune
git -C 3dprintassistant-ios status --short --branch
git -C 3dprintassistant-ios rev-list --left-right --count main...origin/main
git -C 3dprintassistant-ios log --oneline origin/main..main
```

Expected history to verify, not assume:

- The wrap began with web clean and 38 commits ahead of `origin/main`; Trigger A
  is required to push the final wrap commit too. Confirm the actual post-wrap
  SHA/current state before editing.
- iOS is clean and nine commits ahead locally. Preserve all nine in order; do
  not squash, replay, or push them.
- No notification/provider/iOS implementation, Apple/Cloudflare provisioning,
  TestFlight dispatch, App Store submission, or public notification send has
  started.
- The plan has 13 tasks. This session is authorized for Tasks 0–9 only.

Execution boundary:

- Use the plan exactly and track its checkboxes. Use
  `superpowers:executing-plans`, TDD for behavior changes, and
  `superpowers:verification-before-completion`. Do not use subagents unless I
  explicitly change that boundary.
- Task 1 is an isolated production security gate: TDD the assets exclusions and
  Worker defense-in-depth denies, push/deploy that web fix alone, wait for the
  exact commit, and prove the protected paths return non-200. Production was
  same-session verified returning 200 for `/wrangler.toml`, `/worker.js`, and
  `/functions/api/feedback.js`; do not add D1/Queue ids before this closes.
- Tasks 2–8 build the local provider and iOS train in the reviewed commit
  sequence. Keep one owner/review finding per commit and keep iOS local.
- Task 9 runs every listed web/provider, overlay, walkthrough, export,
  byte-identity, XCTest/XCUITest, dry-run, and diff check. Then run the hostile
  independent Claude implementation review and close all P0/P1/P2 findings one
  per commit.
- For headless Claude/Bridge on this locked mac-mini, source
  `~/.config/claude-code/oauth.env` only inside the review subprocess. Never
  print, inspect, copy, commit, or paste its token. Preserve any invalid/empty
  attempt as invalid evidence and use the plan's bounded fallback.
- Stop at G0. Do not create Apple capabilities/APNs keys, Cloudflare D1/Queues/
  secrets, push iOS, dispatch TestFlight, submit App Review, or send a public
  notification. Report only the exact non-secret owner prerequisites listed in
  Task 9 Step 3.

Standing rules:

- Show the progress tracker on multi-step work.
- ROADMAP is truth; read it fully before status claims.
- Treat web + iOS as twin repos; web owns engine/data and both must stay
  byte-identical where required.
- Every data/logic change needs explicit web + iOS functional/UI/UX impact
  evaluation.
- Preserve unrelated work, the iOS push gate, and one-finding-one-commit.
- A green review is evidence, not permission to provision or ship.
- Do not mark the release ready until the exact plan gates prove it.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
