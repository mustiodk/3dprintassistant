# 3dpa — Next Session Kickoff

**Purpose:** resume the iOS 1.1.0 train at the blocked independent-review gate.

**Last updated:** 2026-07-19 after Tasks 0–8 and Task 9 Step 1 completed. G0
was not reached because both authorized Claude review transports returned empty
at their 900-second bounds.

Copy everything between the markers into the fresh session.

>>> START >>>

Cold start 3dpa.

Resume the owner-ratified iOS 1.1.0 notification release plan at Task 9 Step 2
only. Do not repeat Tasks 0–8. Obtain the required independent hostile Claude
implementation review, fix every accepted P0/P1/P2 one per commit, rerun
focused and full gates if anything changes, and seek final `GO`. Stop at G0;
do not begin Task 10.

Read in order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md` in full
5. `3dprintassistant/docs/sessions/INDEX.md`
6. `3dprintassistant/docs/sessions/2026-07-19-cowork-appdev-ios-1.1.0-tasks-0-9-blocked-review.md`
7. This `NEXT-SESSION.md`
8. Task sources:
   - `3dprintassistant/docs/superpowers/specs/2026-07-18-ios-1.1.0-notification-release-design.md`
   - `3dprintassistant/docs/superpowers/plans/2026-07-18-ios-1.1.0-notification-release-plan.md`
   - `3dprintassistant/docs/planning/IOS-1.1.0-GATE-LEDGER.md`
   - `3dprintassistant/docs/reviews/2026-07-18-ios-1.1.0-notification-release/implementation/implementation-review-prompt.md`
   - both `*-invalid-2026-07-19.md` evidence files in that implementation directory

Before mutation, verify rather than change:

```bash
cd ~/dev/Claude/Projects
~/.claude/claude-sync.sh health
~/.claude/claude-sync.sh verify-parents
~/.claude/claude-sync.sh push-children --dry
git -C 3dprintassistant fetch origin --prune
git -C 3dprintassistant status --short --branch
git -C 3dprintassistant log --oneline --decorate a0a8060..codex/ios-1.1.0-provider
git -C 3dprintassistant-ios fetch origin --prune
git -C 3dprintassistant-ios status --short --branch
git -C 3dprintassistant-ios log --oneline origin/main..codex/ios-1.1.0-release
```

Expected state to verify:

- Web `main` and `origin/main` contain Task 1 only at `df9aa8e`; provider/docs
  work remains local on `codex/ios-1.1.0-provider`.
- iOS `main` remains the original nine commits ahead of `origin/main`; the
  implementation branch adds ten more local commits through `b20be21`. Nothing
  in iOS was pushed, squashed, or replayed.
- Full local gate is already green: provider 56, Worker 33, XCTest 175,
  XCUITest 4, validators/audits/Wrangler/diff/engine-data identity.
- Bridge claude-only and the one direct read-only fallback were both invalid:
  empty at 900 seconds. Neither is a verdict.
- Task 9 Step 2 and Step 3 remain unchecked. G0 was not reached.

Review boundary:

- Run a fresh canonical independent Claude review from the common parent. On
  this locked mac-mini, source `~/.config/claude-code/oauth.env` only inside the
  review subprocess. Never print, inspect, copy, commit, or paste its token.
- The review target is stable: web `a0a8060..codex/ios-1.1.0-provider`; iOS
  `origin/main..codex/ios-1.1.0-release` plus the focused baseline-tag diff.
- A valid result requires exit 0 and non-empty Claude output. Preserve invalid
  attempts as invalid evidence; do not interpret silence as approval.
- If findings land, use TDD and one finding per commit, then rerun focused and
  all Task 9 Step 1 gates before asking for final review confirmation.
- `GO` with no open P0/P1/P2 is evidence to finish Task 9 Step 2, not permission
  to provision or ship.

Hard stop:

- Do not create Apple capabilities/APNs keys or Cloudflare resources/secrets.
- Do not push iOS, dispatch TestFlight, submit App Review, or send a public
  notification.
- Only after valid review `GO`, mark Task 9 Step 2/3 complete, update the gate
  ledger and ROADMAP, stop at G0, and report only the exact non-secret owner
  prerequisites listed in Task 9 Step 3.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
