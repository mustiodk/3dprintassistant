# 3dpa — Next Session Kickoff

**Purpose:** resume after the export-coverage release and the App Review
submission of iOS 1.1.3 plus the three Tip Jar consumables.

**Last updated:** 2026-07-25 (evening). Web is live with registry-derived export
coverage (66 of 78 printers) and both surfaces are honest about what they cannot
export. iOS **1.1.3 / build `202607251240`** and the three consumables
(`tip.spool`, `tip.nice`, `tip.small`) were submitted to App Review as one
submission — verified in ASC as *Waiting for Review* / *In Review (3)*. Release
is set to **automatically release after approval**, phased release off.

**Locked next step:** none — the queue is waiting on Apple. The next real event
is an approval or a rejection notice. Do not start speculative work on 1.1.3;
its metadata is locked while in review.

Copy everything between the markers into the fresh session.

>>> START >>>

Cold start 3dpa.

Context: the export defect reported on 2026-07-25 is fixed and shipped. Native
export was allowlisted to 17 of 78 printers; both slicer parent tables are now
generated from the upstream registries (`scripts/gen-slicer-parents.mjs`) and
coverage is 66 of 78, with the remaining 12 recorded in
`scripts/fixtures/export-coverage-ledger.json` behind a blocking `export-audit`
gate. `Engine.getNativeExportSupport(state)` is the single availability contract
both surfaces gate on. Web is live and production-verified. iOS 1.1.3
(`202607251240`) is in App Review together with the three Tip Jar IAPs, set to
release automatically on approval — so approval both publishes the version and
switches the tip jar on, with no second owner step.

Read in order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md`
5. `3dprintassistant/docs/sessions/INDEX.md`
6. `3dprintassistant/docs/sessions/2026-07-25-cowork-appdev-export-coverage.md`
   (read Addendum 4 in full — it holds the ASC submission mechanics)
7. This `NEXT-SESSION.md`
8. `3dprintassistant/docs/planning/EXPORT-COVERAGE-GATE-LEDGER.md` — only if the
   task touches export coverage

Then branch on what the owner reports:

- **Approved and live** → confirm the tip jar actually resolves on a physical
  device. That path has never worked end-to-end outside code review: the IAPs
  were `MISSING_METADATA` for every TestFlight build, so the tip sheet has only
  ever shown *"Tip options are unavailable"* on a real phone.
- **Rejected** → read Apple's exact message before theorising. The two live
  risks going in were the tips being unreachable/broken to a reviewer and the
  App Review Notes contradiction (now rewritten to name the tips explicitly).
- **Neither yet** → pick from the carried follow-ups below; none are blocking.

Carried follow-ups (none urgent):

- `plus4`, `max4`, `ender3_v4_combo` remain alias-candidates. Each needs a
  build-volume field in `data/printers.json` or a human identity call to
  disambiguate against the registry. The audit gate keeps them visible.
- `-uitest` is a no-op — every UITest passes it, no app code reads it, so
  `testWorkshopTransferActionsStayVisibleWhenEmpty` depends on a clean
  simulator container. Either honour the flag or drop it.
- `scripts/configure_tip_products.rb:163` allows `MISSING_METADATA` for
  TestFlight uploads. Correct, but such a build shows every tester a broken tip
  jar — worth a loud warning now that the screenshots exist.

Standing rules:

- ROADMAP is truth; verify remote/runtime state before trusting carried claims.
- **Version = release train, build number = iteration.** Do not bump
  `MARKETING_VERSION` to cut a verification build — Fastlane's `%Y%m%d%H%M`
  build number already makes every upload unique.
- iOS push gate remains active; `main` must mirror TestFlight-ready state.
- One finding = one commit; use `claude-sync.sh hold` for review-gated edits.
- Engine/data changes require an explicit web + iOS impact evaluation.
- Never finish an unverified transaction; pending completion comes only through
  verified `Transaction.updates`.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
