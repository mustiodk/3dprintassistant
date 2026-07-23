# 3dpa — Next Session Kickoff

**Purpose:** resume iOS 1.1.0 **after App Review submission**. As of 2026-07-24,
1.1.0 is **submitted for review** (Manual Release). There is nothing to build or
push next — the remaining steps are owner-gated and event-driven.

**Last updated:** 2026-07-24 after Task 11 (compose) + Task 12 Steps 1–5 closed:
web provider deployed live-dark to production, iOS pushed (`main`==`origin/main`
@ `aa0c8a6`), one TestFlight build (`30035346767`), all nine owner acceptance
gates green, ASC App Privacy + revised copy entered, 1.1.0 submitted.

**Locked next steps (owner-gated, event-driven — do NOT pre-empt):**
1. **Apple approves** → owner clicks **Release This Version** (manual) →
   confirm the Danish storefront shows **1.1.0**. Then close release
   claims/issues (#2–#5) from exact-build evidence.
2. **First public notification (Task 12 Step 6) — separate deliberate decision.**
   Public send stays OFF until 1.1.0 is live AND the owner approves exact copy,
   topic, audience preview, and campaign id. Only then flip
   `PUSH_PUBLIC_SEND_ENABLED` to `"true"`, deploy, canary once more, send via the
   owner CLI, watch aggregates, then set it back to `"false"`. Runbook:
   `docs/runbooks/ios-push.md`.

If Apple **rejects** or a gate later fails: it returns to the owning task with a
TDD fix + a fresh reviewed build + a new single TestFlight dispatch (no second
dispatch without a real failure).

Copy everything between the markers into the fresh session.

>>> START >>>

Cold start 3dpa.

Context: iOS 1.1.0 was submitted for App Review on 2026-07-24 (Manual Release).
Web provider is live-dark in production (registration on, public send OFF); iOS
`main` == `origin/main` @ `aa0c8a6`; TestFlight build `30035346767`. All nine
owner acceptance gates passed. The only open work is owner-gated and
event-driven — do NOT build, push, or send anything without an explicit owner
instruction this session.

Read in order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md` (top banner = the 2026-07-24 submit state)
5. `3dprintassistant/docs/sessions/INDEX.md`
6. `3dprintassistant/docs/sessions/2026-07-24-cowork-appdev-ios-1.1.0-task11-task12-submit.md`
7. This `NEXT-SESSION.md`
8. `3dprintassistant/docs/planning/IOS-1.1.0-GATE-LEDGER.md` + `docs/runbooks/ios-push.md`

Then ask the owner which of the two locked steps applies:
- **(a) 1.1.0 approved → release:** owner clicks Release This Version, confirm DK
  storefront shows 1.1.0, then close #2–#5 + ROADMAP from exact-build evidence.
- **(b) first public notification:** ONLY after 1.1.0 is live + owner approves
  exact copy/topic/audience/campaign-id. Flip `PUSH_PUBLIC_SEND_ENABLED="true"`,
  deploy, canary, send once via `scripts/send-ios-push.mjs`, watch aggregates,
  set it back to `"false"`. Public send is APNs-accepted ≠ delivered — never
  claim device receipt.

Standing rules in force:
- No mutation on an unverified premise; verify before asserting.
- iOS push gate: `main` mirrors TestFlight state (already satisfied — pushed).
- Public send stays `"false"` until the deliberate owner-approved campaign.
- One finding = one commit; `claude-sync.sh hold` for any review-gated work.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
