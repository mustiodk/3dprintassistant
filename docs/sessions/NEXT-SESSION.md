# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-07 (at the W3 Mine-tier engine train wrap — Trigger A).
**Locked next entry point:** **OWNER: OWNER-VERIFY + merge of branch `mine-tier-20260706`** — the 5-minute walkthrough proving accepted tuning moves the generated profile, plus the merge/rollback commands, live in [`../planning/MINE-TIER-GATE-LEDGER.md`](../planning/MINE-TIER-GATE-LEDGER.md). Nothing else should touch engine/app until that decision lands.

---

Copy everything between the markers into a new session.

>>> START >>>
You are working on the 3D Print Assistant (3dpa) — web + iOS slicer-profile configurator, live at 3dprintassistant.com. Read fully before acting:

1. ~/dev/Claude/Projects/CLAUDE.md and 3dprintassistant/CLAUDE.md
2. 3dprintassistant/docs/3dpa-context.md (evergreen project context)
3. 3dprintassistant/docs/planning/ROADMAP.md (source of truth — read fully before any status claim)
4. docs/sessions/INDEX.md + the last 3 session logs in full (start with 2026-07-06-cowork-appdev-mine-tier.md)
5. docs/planning/MINE-TIER-GATE-LEDGER.md (branch state, per-task gate record, Codex review dispositions, OWNER-VERIFY block)

Current state in one line: the W3 Mine-tier engine train (accepted Workshop tuning → Mine profile tier) is COMPLETE on branch `mine-tier-20260706` (pushed as backup, NOT merged; main `6c9d4a0` untouched, tag `mine-tier-baseline-20260706`); iOS main is 6 local push-gated commits ahead (135/135 XCTests).

Today's task: [PICK ONE — rough priority]
(a) If the mine-tier branch is NOT yet merged: assist the owner's OWNER-VERIFY + merge (ledger has everything).
(b) iOS TestFlight train: bundle the 6 local iOS commits into the next TestFlight version (decide v1.0.6 re-dispatch vs v1.0.7; MARKETING_VERSION bump; owner dispatches). Gate: merge web mine-tier first so both platforms ship the same engine.
(c) max_mvs 0.8-nozzle data gap — quick data-only accuracy win (17 materials; ROADMAP recipe: source + add the 0.8 and hips 0.2 entries, re-run gates, byte-mirror iOS).
(d) Export Phase 2 — Bambu hardening (2-element per-extruder arrays), Beta-badge removal (gate-cleared), and the deferred Codex HIGH-2 export-retraction display fix (make exportProfile/formatProfileAsText filament retraction read the resolved _slicer_value).
(e) W4 custom filaments (IMPL-044 plan Part 3 — its own engine train, after the mine merge).

Process (standing): capture stable comparator baselines first (validate-data / walkthrough / matrix-audit 2>&1 | grep -v '^Generated:' | shasum -a 256); node scripts/engine-golden-snapshot.js --check clean before starting; every engine commit regenerates the golden snapshot and enumerates the diff in the commit body; engine/data changes byte-mirror to iOS + XCTest; one finding = one commit per platform; TDD RED-first with the repo's RED-evidence convention; cross-model review (bridge --health, then bridge --mode codex-only) before hard-to-reverse steps; preview-smoke UI changes on the TRUE user paths — for anything touching persistence, reload WITH the address bar as the app last wrote it (finding 2026-07-07-smoke-test-masked-url-restore-bug).

Standing rules: engine.js/app.js never merge; PARAM_LABELS English; localStorage try-catch; new copy EN+DA; iOS push gate until TestFlight-ready; data/logic change → mandatory web+iOS impact eval; ROADMAP is truth.
<<< END <<<

**Maintenance note:** regenerated on Trigger A / Trigger B / explicit owner ask only — a stale NEXT-SESSION between sessions is fine (see `CLAUDE.md → Session-log protocol`).
