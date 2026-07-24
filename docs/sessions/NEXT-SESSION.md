# 3dpa — Next Session Kickoff

**Purpose:** resume from the visible tip jar release after web production deploy
and iOS 1.1.1 TestFlight distribution.

**Last updated:** 2026-07-25. Web support is live at the owner-provided Ko-fi
page; iOS `main` == `origin/main` @ `a0f70c1`. GitHub Actions run
`30133756519` processed and distributed **1.1.1 build `202607242327`** to
internal TestFlight testers.

**Locked next step:** owner physical-device acceptance of the exact 1.1.1 build.
Do not change or reship 1.1.0; the owner confirmed it live and closed further
work on that version.

Copy everything between the markers into the fresh session.

>>> START >>>

Cold start 3dpa.

Context: visible Tip Jar is shipped. Web `Support 3DPA ♥` is live after
`iOS App ↗` and links to `https://ko-fi.com/3dprintassistant`. iOS native
StoreKit tips are on Home + Output. Run `30133756519` successfully configured
the three consumables, processed **1.1.1 build `202607242327`**, and distributed
it to internal TestFlight testers. iOS `main` == `origin/main` @ `a0f70c1`.
The owner confirmed 1.1.0 live and explicitly closed further work on it.

Read in order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md`
5. `3dprintassistant/docs/sessions/INDEX.md`
6. `3dprintassistant/docs/sessions/2026-07-25-cowork-appdev-visible-tip-jar-1.1.1.md`
7. This `NEXT-SESSION.md`
8. `3dprintassistant/docs/superpowers/specs/2026-07-25-visible-tip-jar-design.md`
9. `3dprintassistant/docs/superpowers/plans/2026-07-25-ios-visible-tip-jar-1.1.1-plan.md`

Then handle only the owner-reported state:

- If testing is pending, ask the owner to verify Home + Output presentation and
  Small / Nice / Filament Spool purchases on TestFlight 1.1.1.
- If a defect is reported, reproduce it against build `202607242327`, fix it
  TDD-first, independently review the applied diff, rerun release gates, and
  ship one fresh reviewed build.
- If owner acceptance is green and App Store submission is requested, first
  capture/attach the required review screenshot for each of the three IAPs.

Standing rules:

- ROADMAP is truth; verify remote/runtime state before trusting carried claims.
- Do not work on 1.1.0 without a new explicit owner instruction.
- iOS push gate remains active; `main` must mirror TestFlight-ready state.
- One finding = one commit; use `claude-sync.sh hold` for review-gated edits.
- Never finish an unverified transaction; pending completion comes only through
  verified `Transaction.updates`.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
