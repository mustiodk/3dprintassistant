# 3dpa — Next Session Kickoff

**Purpose:** start the iOS 1.1.0 **Task 11** (compose 1.1.0) execution session.
The owner authorized Task 11 at the end of the 2026-07-23 Task 10 session.

**Last updated:** 2026-07-23 (evening) after Task 10 closed: G0 executed, dark
provider live (registration `"true"`, public send `"false"`), physical-device
canary passed all proofs, two canary-caught iOS fixes landed (`0a8759a`,
`76aca9e`), owner authorization recorded (`fe654b5`). **Locked entry point:
Task 11 — compose 1.1.0, refresh copy/privacy, pass the final ship gate.**
Do NOT re-run Tasks 0–10. Task 12 (iOS push, TestFlight, App Review, public
send) keeps its own explicit owner gates.

Copy everything between the markers into the fresh session.

>>> START >>>

Cold start 3dpa.

Task 11 is owner-authorized (recorded in the gate ledger, `fe654b5`). Execute
the owner-ratified iOS 1.1.0 notification release plan at Task 11 only —
compose 1.1.0: bump MARKETING_VERSION, refresh copy/privacy from the prepared
submit package, and pass the final full ship gate. Tasks 0–10 are complete —
do not re-run them (the provider is already live-dark in production). Stop
after Task 11's final gate report; Task 12 (single iOS push, TestFlight, App
Review, first send) has its own explicit owner gates.

Read in order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md` in full
5. `3dprintassistant/docs/sessions/INDEX.md`
6. `3dprintassistant/docs/sessions/2026-07-23-cowork-appdev-ios-1.1.0-task10-canary.md`
7. This `NEXT-SESSION.md`
8. Task sources:
   - `3dprintassistant/docs/superpowers/plans/2026-07-18-ios-1.1.0-notification-release-plan.md` (Task 11)
   - `3dprintassistant/docs/planning/IOS-1.1.0-GATE-LEDGER.md`
   - `3dprintassistant-ios/docs/app-store-v1.1.0-submit.md` (prepared release copy — consume, do not rewrite)
   - `3dprintassistant-ios/docs/app-store-metadata.md` + `app-store-privacy-labels.md`
   - `3dprintassistant/docs/runbooks/ios-push.md`

Before mutation, verify rather than assume:

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
git -C 3dprintassistant-ios log --oneline origin/main..codex/ios-1.1.0-release | head -20
git -C 3dprintassistant-ios rev-list --left-right --count main...origin/main
```

Expected state to verify:

- Web `main` == `origin/main`; provider branch `codex/ios-1.1.0-provider`
  local-only, ending at the ledger state-paragraph repair `57ca3a5`
  (session commits: `0174d2c` D1 binding → `bb49ccf` assetsignore →
  `c420e7e` evidence → `8a8f6ce` registration flag → `413e7c9` Task 10
  evidence → `fe654b5` owner authorization → `57ca3a5`, plus this wrap's
  docs commit).
- iOS `main` exactly nine commits ahead of `origin/main`, unpushed; branch
  `codex/ios-1.1.0-release` is 14 commits above `main`, ending
  `0a8759a` → `76aca9e` (the two canary fixes). Nothing pushed, squashed, or
  replayed. `MARKETING_VERSION` still `1.0.7` (the bump is Task 11 Step 1).
- Gate ledger: Tasks 0–10 PASS + owner Task 11 authorization recorded.
- Live worker: `PUSH_REGISTRATION_ENABLED = "true"`,
  `PUSH_PUBLIC_SEND_ENABLED = "false"` in `wrangler.toml`; EU D1 + queues +
  six secrets exist (do NOT re-provision).

Task 11 boundary:

- iOS work happens on `codex/ios-1.1.0-release`. Bump `MARKETING_VERSION` to
  `1.1.0` (leave `CURRENT_PROJECT_VERSION` Fastlane-owned), run
  `xcodegen generate`, commit per plan Step 1.
- Consume the prepared, ratified release copy verbatim from
  `app-store-v1.1.0-submit.md` (+ metadata/privacy-labels docs); recount
  catalog totals from the exact archive only if data changed since the
  78 printers / 14 brands count.
- Update web `privacy.html` per the plan; web is otherwise frozen for this
  task.
- Final ship gate: rerun the full Task 9-scale battery (provider suite,
  Worker analytics, data/overlay validators, walkthrough, export audit,
  Wrangler dry-run, engine/data byte identity, full XCTest/XCUITest) plus a
  Release archive; inspect the signed archive entitlements
  (`aps-environment`) per plan.
- One finding = one commit; `~/.claude/claude-sync.sh hold` for review-gated
  work, release after deliberate commits land.
- The iOS push gate stays closed: no push to `main`, no TestFlight dispatch,
  no App Review, no public send — Task 12 owns those behind their own owner
  gates. `PUSH_PUBLIC_SEND_ENABLED` stays `"false"`.
- Known open owner item (non-blocking): decide whether tracked
  `prototype/printer-picker.html` should stay publicly served or join
  `.assetsignore`.

Device facts if a device step arises: owner iPhone 17 Pro Max UDID
`26E44024-2A8A-591F-9D6F-2E6738269624`; `devicectl ... launch` app args need a
`--` separator; the canary device is currently opted out of notifications
(re-enable in-app if needed).

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
