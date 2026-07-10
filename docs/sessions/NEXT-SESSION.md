# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-10 (go-live COMPLETE: webhook set, plist loaded, first live run finished 12:02–12:17 CEST — K2 SE `auto-parked:review-no-go`; gate ledger B5.4 is ✅ FINAL).
**Locked next entry point:** **Owner decision on the parked K2 SE candidate** (see below — the pipeline itself needs nothing further; this is a judgment call, not a blocker).

---

## Status: LIVE, first run complete (2026-07-10)

The pipeline is enabled and ran for real. Webhook set (private `#3dpa-intake-runs`), daily plist loaded (12:00). **First run outcome: K2 SE parked, not shipped** — the hostile reviewer NO-GO'd on CFS-support and 500mm/s-speed concerns that a same-session controller cross-check against Creality's own K2 SE page suggests were false alarms (not overridden — parks are the owner's call). Branch `intake/k2_se` preserved; retry weekly ×4. **Still owner-optional, one-time:** the PD7 marker migration (runbook `docs/runbooks/printer-addition-protocol.md` → Execution modes → last waiver bullet — one line-1 edit + commit).

Copy everything between the markers into a new session.

>>> START >>>

3dpa cold start.

Read in order: ~/dev/Claude/Projects/CLAUDE.md → 3dprintassistant/CLAUDE.md → 3dprintassistant/docs/3dpa-context.md → 3dprintassistant/docs/planning/ROADMAP.md (banner + Active Work Queue) → docs/sessions/INDEX.md → last 3 session logs in full (start with 2026-07-10-cowork-appdev-intake-autonomy-build.md) → docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md (B5 row) → this file.

Today's task — pick by what I say:

A) **K2 SE parked-candidate decision:** read `scripts/.intake-runner-state/parked/k2_se/parked.json` + the run report + the Discord message. The reviewer NO-GO'd on (1) `multi_color_systems:["cfs"]` and (2) `max_speed:500` vs K-series siblings at 600. A same-session cross-check against creality.com/products/k2-se suggests both are real manufacturer-stated values for THIS specific (cheaper) model, not errors — but that was a controller read-only assessment, never acted on. Options: (a) accept as parked, let the weekly ×4 auto-retry run against unchanged evidence (will likely re-park identically each time — the retry policy re-runs the SAME research+review, not a fresh look); (b) manually re-stage from KV `req:1783615951531:a03e6e7e` and walk through the protocol supervised, feeding the manufacturer-page URLs directly to short-circuit the ambiguity; (c) do nothing — it's genuinely not urgent, one request in a low-volume queue.

B) **Steady-state observation:** let the 12:00 schedule keep running; skim daily reports in `#3dpa-intake-runs`; only intervene on a freeze (`scripts/.intake-autonomy-freeze` present → read the reason, fix, `rm` the flag).

C) **Other queue items:** Android AG0 (owner ratification) → AG1 QuickJS spike; the 4 selection-events decision (allowlist vs delete); v1.0.7 on-device Mine acceptance (TestFlight).

Standing rules: web is master; engine.js/app.js never merge; engine/data changes require web + iOS (+ Android-plan) impact evaluation; one finding = one commit; iOS push gate (3 local data-mirror commits ride v1.0.7); Android prototype no-push until AG0 GO; quality > speed; progress bar every multi-step turn.

Context nuggets: headless `claude -p` auth on the mac-mini = `~/.config/claude-code/oauth.env` (keychain is 401-stale; memory `mac-mini-headless-claude-auth-oauth-env`); the Scout test suite WIPES `scripts/.printer-intake-out/` — runner durable state lives in `scripts/.intake-runner-state/`; `data/printers.json` is hand-formatted — rows are added by string splice, guarded by `scripts/intake-diff-guards.js --base main`; live overlay is at `content_version=2026071004` (post-drill, payload unchanged); runner contract = `ai-operating-model/docs/agents/intake-pipeline-runner.md` v1; missed-run semantics: powered-off at 12:00 = no run + no report (see scripts/launchd/README.md).

>>> END <<<

Maintenance note: this file is regenerated on Trigger A / Trigger B / explicit owner ask only — a stale copy between sessions is expected and fine.
