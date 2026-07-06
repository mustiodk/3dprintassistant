# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-07 (W3 Mine-tier: merged + LIVE on web, iOS v1.0.7 on TestFlight).
**Locked next entry point:** **owner on-device acceptance of iOS v1.0.7 on TestFlight** — import a web Workshop backup with accepted tuning, confirm the **Mine** segment appears and moves the value. Web Mine tier is already merged + live at 3dprintassistant.com (OWNER-VERIFY passed 2026-07-07). No code work is gated on this — the queue below is open.

---

Copy everything between the markers into a new session.

>>> START >>>
You are working on the 3D Print Assistant (3dpa) — web + iOS slicer-profile configurator, live at 3dprintassistant.com. Read fully before acting:

1. ~/dev/Claude/Projects/CLAUDE.md and 3dprintassistant/CLAUDE.md
2. 3dprintassistant/docs/3dpa-context.md (evergreen project context)
3. 3dprintassistant/docs/planning/ROADMAP.md (source of truth — read fully before any status claim)
4. docs/sessions/INDEX.md + the last 3 session logs in full (start with 2026-07-06-cowork-appdev-mine-tier.md)
5. docs/planning/MINE-TIER-GATE-LEDGER.md (branch state, per-task gate record, Codex review dispositions, OWNER-VERIFY block)

Current state in one line: the W3 Mine-tier engine train is MERGED to `main` (`6a828c2`) + LIVE on web (curl-verified) and iOS v1.0.7 is UPLOADED to TestFlight (run 28830781702; awaiting ASC processing + owner on-device acceptance). Web OWNER-VERIFY passed 2026-07-07.

Today's task: [PICK ONE — rough priority]
(a) max_mvs 0.8-nozzle data gap — quick data-only accuracy win (17 materials; ROADMAP recipe: source + add the 0.8 and hips 0.2 entries, re-run gates, byte-mirror iOS).
(b) Export Phase 2 — Bambu hardening (2-element per-extruder arrays), Beta-badge removal (gate-cleared), and the deferred Codex HIGH-2 export-retraction display fix (make exportProfile/formatProfileAsText filament retraction read the resolved _slicer_value — the on-screen/text retraction gap the Mine demo surfaced).
(c) Orca Phase 3 — golden fixtures already captured (`scripts/fixtures/slicer-golden/orca-x1c-*-ref.json`); Orca = Bambu Studio fork, small serializer delta.
(d) W4 custom filaments (IMPL-044 plan Part 3 — its own engine train).
(e) S1 — IMPL-042 Phase C landing pages (spec ready, whole-or-nothing).

Process (standing): capture stable comparator baselines first (validate-data / walkthrough / matrix-audit 2>&1 | grep -v '^Generated:' | shasum -a 256); node scripts/engine-golden-snapshot.js --check clean before starting; every engine commit regenerates the golden snapshot and enumerates the diff in the commit body; engine/data changes byte-mirror to iOS + XCTest; one finding = one commit per platform; TDD RED-first with the repo's RED-evidence convention; cross-model review (bridge --health, then bridge --mode codex-only) before hard-to-reverse steps; preview-smoke UI changes on the TRUE user paths — for anything touching persistence, reload WITH the address bar as the app last wrote it (finding 2026-07-07-smoke-test-masked-url-restore-bug).

Standing rules: engine.js/app.js never merge; PARAM_LABELS English; localStorage try-catch; new copy EN+DA; iOS push gate until TestFlight-ready; data/logic change → mandatory web+iOS impact eval; ROADMAP is truth.
<<< END <<<

**Maintenance note:** regenerated on Trigger A / Trigger B / explicit owner ask only — a stale NEXT-SESSION between sessions is fine (see `CLAUDE.md → Session-log protocol`).
