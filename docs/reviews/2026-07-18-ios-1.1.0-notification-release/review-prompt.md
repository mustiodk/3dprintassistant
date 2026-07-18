# Hostile cross-model review prompt — iOS 1.1.0 notification release

## Context

You are the independent hostile reviewer. Codex drafted a pre-implementation,
owner-facing release design for a solo hobbyist's live iOS app and first-party
Cloudflare Worker. The owner explicitly wants honest feedback, not agreement.

The app is live worldwide at iOS 1.0.4. The iOS repo is clean but nine commits
ahead of its remote under a strict no-push-until-TestFlight-ready gate. The web
repo auto-deploys its Worker/static assets from `main`. No notification code or
infrastructure exists yet, and this review authorizes none.

## Decision to challenge

One iOS 1.1.0 train will contain:

- explicit opt-in APNs notifications for new printers and meaningful app updates;
- a first-party Cloudflare provider using EU D1 + Queue/DLQ;
- open issues #2–#5;
- visible native Bambu/Orca/Prusa exports already implemented below the iOS UI;
- the nine clean local printer/export commits;
- privacy labels/policy and complete App Store copy.

The design replaces the unstarted 1.0.7/1.0.8 sequence. Tip jar remains separate
and receives a later version. Accounts/My 3DPA remains parked and must be
re-sequenced when resumed.

## Primary artifact

Read every line of:

`docs/superpowers/specs/2026-07-18-ios-1.1.0-notification-release-design.md`

Then inspect current code/docs where a claim affects your verdict:

- `worker.js`, `wrangler.toml`, `.assetsignore`
- `functions/api/analytics.js`, `functions/api/feedback.js`
- `docs/superpowers/specs/2026-07-11-ios-1.0.7-issue-fix-release-design.md`
- `docs/planning/ROADMAP.md`
- `../3dprintassistant-ios/project.yml`
- `../3dprintassistant-ios/3DPrintAssistant/App/PrintAssistantApp.swift`
- `../3dprintassistant-ios/3DPrintAssistant/App/ContentView.swift`
- `../3dprintassistant-ios/3DPrintAssistant/Services/PrinterCatalogProvider.swift`
- `../3dprintassistant-ios/3DPrintAssistant/Views/Output/OutputViewModel.swift`
- `../3dprintassistant-ios/3DPrintAssistant/Views/Output/OutputView.swift`
- `../3dprintassistant-ios/docs/app-store-privacy-labels.md`
- `../3dprintassistant-ios/docs/app-store-metadata.md`

## Checks already run

- web current/clean before the draft; iOS current worktree clean and nine ahead;
- exact iOS engine bridges and hidden UI boundary inspected;
- Apple primary docs checked for permission, registration, provider JWT,
  marketing opt-in/opt-out, and App Privacy;
- Cloudflare primary docs checked for EU D1 jurisdiction, Queue retry/DLQ, and
  Workers WebCrypto;
- local Markdown relative links, placeholder scan, release-copy character count,
  and staged `git diff --check` passed;
- pre-review docs commit: `aae423b`.

## Concrete uncertainty

Try to break the design, especially:

1. APNs authorization/token rotation, development-vs-production, cold/warm tap
   routing, launch/catalog refresh races, and SwiftUI lifecycle feasibility.
2. Opt-in/opt-out correctness under network failure, uninstall, externally
   revoked permission, stale tokens, duplicate registration, and queued work.
3. Whether encrypted token storage, truncated Notification ID, retention, App
   Privacy Device ID declaration, and no-open-tracking promise are coherent.
4. D1 schema keys, migration/deploy order, Worker auto-deploy/static-asset
   exposure, rate-limit assumptions, AES/JWT feasibility, Queue idempotency,
   APNs error classification, cadence bypass, kill switches, and DLQ recovery.
5. Whether Queue/D1 is proportionate for a small app or has complexity without
   a reliability payoff; propose a simpler design only if it still gives a safe
   end-to-end owner flow.
6. Whether canary identification/send confirmation can accidentally target the
   wrong device or expose identifiers/secrets.
7. Release-train sequencing: local version bump, gated push, TestFlight creation,
   exact-build production APNs QA, App Review, and rollback.
8. Internal consistency with the old #2–#5 design, current native exporters,
   ROADMAP version reservations, privacy docs, and App Store claims.
9. Missing owner gates, tests, operational proof, or compliance details that
   would make an implementation plan unsafe or non-executable.

## Alternatives considered

- OneSignal/Firebase SDK: rejected for third-party/privacy/vendor surface.
- Local or in-app notifications: rejected because they cannot notify an inactive
  app about server-side additions.
- Direct fan-out in an admin request: rejected for latency/partial-retry risk.
- APNs broadcast channels: rejected as unnecessary channel machinery for this
  explicit per-install consent model.

## Feedback wanted

Be adversarial and concise. Report only actionable findings at the altitude of a
pre-implementation design spec. Do not invent style work or generic best
practices that an implementation plan can decide safely.

For every finding provide:

1. severity `P0`, `P1`, or `P2`;
2. exact spec section/claim;
3. concrete failure scenario;
4. smallest durable correction.

Separate false claims/contradictions from discretionary improvements. Finish
with exactly one verdict: `GO`, `GO-WITH-PATCHES`, or `NO-GO`, and one sentence
explaining why. Zero findings is valid; do not manufacture criticism to appear
hostile.

## Constraints

- Read-only review: do not edit files, commit, push, deploy, provision, send a
  notification, dispatch TestFlight, or access secrets.
- No secret values may appear in the response.
- Quality over speed, but stay at design altitude.
- A reviewer verdict is evidence, not owner permission.
