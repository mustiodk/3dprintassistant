# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-08 (iOS v2 rebuild planning bundle complete — triple-reviewed, awaiting owner Gate 0).
**Locked next entry point:** **OWNER Gate 0 — ratify the iOS v2 rebuild decisions** (read `docs/superpowers/specs/2026-07-08-ios-v2-rebuild-design.md` §2, reply GO or override individual decisions — the consequential defaults are D1a branch-push-ON, D5a Swift write-side store APIs, D5b rules-migration freeze, and the profile-comparison cut). Also still open from 2026-07-07: **owner on-device Mine acceptance of iOS v1.0.7 on TestFlight** (import a web Workshop backup with accepted tuning; confirm the Mine segment appears and moves the value). No code work is gated on either — the queue below stays open.

---

Copy everything between the markers into a new session.

>>> START >>>
You are working on the 3D Print Assistant (3dpa) — web + iOS slicer-profile configurator, live at 3dprintassistant.com. Read fully before acting:

1. ~/dev/Claude/Projects/CLAUDE.md and 3dprintassistant/CLAUDE.md
2. 3dprintassistant/docs/3dpa-context.md (evergreen project context)
3. 3dprintassistant/docs/planning/ROADMAP.md (source of truth — read fully before any status claim)
4. docs/sessions/INDEX.md + the last 3 session logs in full (start with 2026-07-08-cowork-appdev-ios-v2-audit-plan.md)
5. If today is iOS v2 work: the FULL planning bundle — docs/reviews/2026-07-08-ios-v2-rebuild-audit.md, docs/superpowers/specs/2026-07-08-ios-v2-rebuild-design.md, docs/superpowers/plans/2026-07-08-ios-v2-rebuild-plan.md, docs/reviews/2026-07-08-ios-v2-rebuild-review.md

Current state in one line: web is live with the full learns loop (Mine tier merged `6a828c2`); iOS v1.0.7 is on TestFlight awaiting owner on-device Mine acceptance; the iOS v2 rebuild (G0–G8 gated plan, 2.0.0) is fully planned and triple-reviewed, awaiting owner Gate 0 ratification.

Today's task: [PICK ONE]
(a) **iOS v2 — G1 Foundation** (ONLY if the owner has ratified Gate 0 in this or a prior message): follow the master plan's standing protocol — create the gate ledger `docs/planning/IOS-V2-GATE-LEDGER.md` with the G0 ratification row (empty-first discipline), then author the G1 micro-plan at writing-plans granularity in docs/superpowers/plans/ios-v2/gate-1-foundation.md, hostile-review it, then execute. Budget: 2 sessions; this session = micro-plan + as much of the restructure as fits.
(b) max_mvs 0.8-nozzle data gap — quick data-only accuracy win (17 materials; ROADMAP recipe).
(c) Export Phase 2 — Bambu hardening (2-element arrays), Beta-badge removal (gate-cleared), deferred Codex HIGH-2 export-retraction display fix.
(d) Orca Phase 3 — golden fixtures captured; Orca = Bambu Studio fork, small serializer delta.
(e) W4 custom filaments (IMPL-044 plan Part 3) or S1 landing pages (spec ready, whole-or-nothing).

Process (standing): capture stable comparator baselines first (validate-data / walkthrough / matrix-audit 2>&1 | grep -v '^Generated:' | shasum -a 256); node scripts/engine-golden-snapshot.js --check clean before starting; every engine commit regenerates the golden snapshot and enumerates the diff; engine/data changes byte-mirror to iOS + XCTest; one finding = one commit per platform; TDD RED-first with the repo's RED-evidence convention; cross-model review (bridge --health, then bridge --mode codex-only) before hard-to-reverse steps; preview-smoke UI on TRUE user paths (finding 2026-07-07-smoke-test-masked-url-restore-bug).

Standing rules: engine.js/app.js never merge; PARAM_LABELS English; localStorage try-catch; new copy EN+DA; iOS push gate on `main` (v2 note: the `ios-v2` BRANCH pushes at every gate exit per spec D1a once ratified); data/logic change → mandatory web+iOS impact eval; ROADMAP is truth.
<<< END <<<

**Maintenance note:** regenerated on Trigger A / Trigger B / explicit owner ask only — a stale NEXT-SESSION between sessions is fine (see `CLAUDE.md → Session-log protocol`).
