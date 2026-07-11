# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-11 (export-first pivot wrap).
**Locked next entry point:** **Printer export remaining phases first.** Start by recovering/finishing Export Phase 2 on current `main`; then Phase 3 Orca; then Phase 4 Prusa. The already-reviewed iOS 1.0.7 issue-fix plan comes immediately after the export sequence.

---

Copy everything between the markers into a new session.

>>> START >>>

3dpa cold start.

Read in order:

1. `~/dev/Claude/Projects/CLAUDE.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md`
5. `3dprintassistant/docs/specs/IMPL-043-slicer-export-activation.md`
6. `3dprintassistant/docs/superpowers/plans/2026-07-11-export-first-overall-plan.md`
7. `3dprintassistant/docs/sessions/INDEX.md`
8. Recent export logs:
   - `3dprintassistant/docs/sessions/2026-07-11-cowork-appdev-export-pivot-wrap.md`
   - Export Phase 2 branch-only log, read with:
     ```bash
     git -C 3dprintassistant show origin/export-phase2-20260709:docs/sessions/2026-07-09-cowork-appdev-export-phase2.md | sed -n '1,260p'
     ```
   - `3dprintassistant/docs/sessions/2026-07-06-cowork-appdev-learns-export.md`

Then verify local state:

```bash
cd ~/dev/Claude/Projects
~/.claude/claude-sync.sh verify-parents
~/.claude/claude-sync.sh push-children --dry
git -C 3dprintassistant fetch --all --prune
git -C 3dprintassistant status --short --branch
git -C 3dprintassistant-ios status --short --branch
```

Expected known warnings: `3dprintassistant` may be on a planning branch with no upstream until this wrap PR is merged; `3dprintassistant-ios` may be ahead locally under the iOS push gate; Android checkout may be missing/health-only.

Today's primary task:

1. **Recover and merge Export Phase 2 onto current `main`.**
   - Evidence verified 2026-07-11: `origin/export-phase2-20260709` contains completed Bambu Phase 2 work and owner-verify PASS, but it is stale versus current `origin/main`.
   - Do **not** merge `origin/export-phase2-20260709` directly. Its raw diff versus current `origin/main` includes unrelated deletions of newer intake/K2/analytics work.
   - Follow Task 1 in `docs/superpowers/plans/2026-07-11-export-first-overall-plan.md`.
   - Exit gate: current-main-safe PR diff is export-only; web gates green; iOS engine byte-identical + XCTest green on mac-mini; PR merged; production `engine.js` live-verified.

2. **Then Phase 3: OrcaSlicer native export.**
   - Current verified state: no `exportOrcaJSON` exists; `app.js` shows native export only for `bambu_studio`; Orca users get copy-text fallback.
   - Orca golden fixtures were captured 2026-07-06 at `scripts/fixtures/slicer-golden/orca-x1c-*-ref.json`.
   - Follow Task 2 in the export-first plan.

3. **Then Phase 4: PrusaSlicer `.ini` export.**
   - Current verified state: no `exportPrusaINI` exists; Prusa users get copy-text fallback.
   - Prusa fixture parsing/key inventory is documented in IMPL-043 §1.4b F10.
   - Follow Task 3 in the export-first plan.

4. **After export phases: resume iOS 1.0.7 issue-fix release.**
   - Existing artifacts remain valid but are now sequenced after export:
     - `docs/superpowers/specs/2026-07-11-ios-1.0.7-issue-fix-release-design.md`
     - `docs/superpowers/plans/2026-07-11-ios-1.0.7-issue-fix-release-plan.md`
     - `docs/reviews/2026-07-11-ios-1.0.7-plan-review.md`
   - Do not push iOS until the whole TestFlight-ready train is complete and owner-ready.
   - Finish with clean-state audit across every touched repo.

Rules for this work:

- Progress bar on multi-step turns.
- ROADMAP is truth; update it when phase state changes.
- Web is master; mirror engine/data byte-identically to iOS when touched.
- One finding = one commit.
- No direct merge of stale export branch.
- Native Orca/Prusa export is not live until the new implementation phases land and pass recorded import gates.
- iOS push gate remains active.

>>> END <<<

Maintenance note: this file is regenerated on Trigger A / Trigger B / explicit owner ask only.
