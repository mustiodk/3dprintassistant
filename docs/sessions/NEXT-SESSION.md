# 3dpa — Next Session Kickoff

**Purpose:** start the iOS 1.1.0 Task 10 execution session after the owner
gives G0.

**Last updated:** 2026-07-23 after Tasks 0–9 closed with a confirmation-reviewed
`GO` and the 1.1.0 App Store submit package was prepared. **Locked entry point:
Task 10 (owner G0, dark provider deployment, device canary, opt-out proof).**
Do NOT re-run Tasks 0–9.

**Owner G0 prerequisites (complete before or at the start of that session):**

1. Apple: enable Push Notifications on the `dk.mragile.3DPrintAssistant`
   App ID.
2. Apple: create a dedicated APNs Auth Key; have Key ID + Team ID + `.p8`
   ready for secure secret entry (never paste key text into chat or a file).
3. Cloudflare: approve provisioning the EU D1 database, the
   `3dpa-push-production` + `3dpa-push-dlq` queues, the registration
   rate-limit binding, and the six Worker secrets via `wrangler secret put`.
4. App Store Connect: confirm the physical canary Device ID and that App
   Privacy may be updated for push-token processing (prepared answers:
   `3dprintassistant-ios/docs/app-store-v1.1.0-submit.md`).

Copy everything between the markers into the fresh session.

>>> START >>>

Cold start 3dpa.

Owner G0 is given. Execute the owner-ratified iOS 1.1.0 notification release
plan at Task 10 only (owner G0, dark provider deployment, device canary,
opt-out proof). Tasks 0–9 are complete with a confirmation-reviewed GO — do
not re-run them. Stop after Task 10's owner authorization decision; Tasks 11
and 12 have their own explicit owner gates.

Read in order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md` in full
5. `3dprintassistant/docs/sessions/INDEX.md`
6. `3dprintassistant/docs/sessions/2026-07-23-cowork-appdev-ios-1.1.0-task9-review-g0.md`
7. This `NEXT-SESSION.md`
8. Task sources:
   - `3dprintassistant/docs/superpowers/plans/2026-07-18-ios-1.1.0-notification-release-plan.md` (Task 10)
   - `3dprintassistant/docs/planning/IOS-1.1.0-GATE-LEDGER.md`
   - `3dprintassistant/docs/reviews/2026-07-18-ios-1.1.0-notification-release/implementation/implementation-review-disposition.md`
   - `3dprintassistant/docs/runbooks/ios-push.md`
   - `3dprintassistant-ios/docs/app-store-v1.1.0-submit.md` (prepared release copy)

Before mutation, verify rather than assume:

```bash
cd ~/dev/Claude/Projects
~/.claude/claude-sync.sh health
~/.claude/claude-sync.sh verify-parents
~/.claude/claude-sync.sh push-children --dry
git -C 3dprintassistant fetch origin --prune
git -C 3dprintassistant status --short --branch
git -C 3dprintassistant log --oneline --decorate a0a8060..codex/ios-1.1.0-provider
git -C 3dprintassistant rev-list --left-right --count main...origin/main
git -C 3dprintassistant-ios fetch origin --prune
git -C 3dprintassistant-ios status --short --branch
git -C 3dprintassistant-ios log --oneline origin/main..codex/ios-1.1.0-release
git -C 3dprintassistant-ios rev-list --left-right --count main...origin/main
```

Expected state to verify:

- Web `main` == `origin/main`; the provider branch `codex/ios-1.1.0-provider`
  is local-only and ends at `66e641f` (12 commits above baseline `a0a8060`:
  5 original + 5 review fixes + 2 docs).
- iOS `main` is exactly nine commits ahead of `origin/main`, unpushed; the
  implementation branch `codex/ios-1.1.0-release` ends at the release-copy
  docs commit (12 commits above `main`: 10 original + `3f886bf` P1-A fix +
  docs). Nothing was pushed, squashed, or replayed.
- Gate ledger shows Tasks 0–9 PASS, confirmation review `GO`
  (`bridge-2026-07-23-142532-902585.md`), G0 owner prerequisites listed.
- `MARKETING_VERSION` is still `1.0.7` (the 1.1.0 bump is Task 11 Step 1).
- Both send flags in `wrangler.toml` are `"false"`; no D1 `database_id` or
  secrets exist yet.

Task 10 boundary:

- Provision ONLY what Task 10 lists, after confirming the owner's Apple-side
  configuration: EU D1 (apply `migrations/0001_push.sql`), the two queues,
  the rate-limit binding (account-wide `namespace_id` collision check first),
  and the six secrets entered without printing (`wrangler secret put`).
- Deploy dark: `PUSH_REGISTRATION_ENABLED`/`PUSH_PUBLIC_SEND_ENABLED` stay
  `"false"` until the plan's exact flip points. Re-probe production source
  denial (non-200 for `/wrangler.toml`, `/worker.js`,
  `/functions/api/feedback.js`, `/migrations/0001_push.sql`) after deploy.
- Device canary on the owner-confirmed physical device (development +
  production paths per plan), including the opt-out proof.
- On the mac-mini, source the protected mode-600
  `~/.config/claude-code/oauth.env` only inside any review subprocess; never
  print, inspect, copy, commit, or paste its token.
- The iOS push gate stays closed: no iOS push, no TestFlight dispatch, no App
  Review, no public notification send. Task 12 owns those behind their own
  owner gates.
- One finding = one commit; run `~/.claude/claude-sync.sh hold` for
  review-gated work and release it after the deliberate commits land.

Prepared release copy (do not rewrite): the ratified What's New, promotional
text, review notes, WHAT'S INCLUDED block, and the Identifiers → Device ID
privacy answers are already locked in
`3dprintassistant-ios/docs/app-store-v1.1.0-submit.md` (+ metadata and
privacy-labels updates). Task 11 consumes them; recount catalog totals from
the exact archive if data changed.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
