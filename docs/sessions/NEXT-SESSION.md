# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-10 (Trigger A close of the analytics-fix + intake-plan session — the analytics Worker 5-event fix is LIVE on prod; the Intake Autonomy v2 impl plan is dual-reviewed and committed; build is cleared to start).
**Locked next entry point:** **Intake Autonomy v2 build session 1 = Gate B0 (launchd environment probe), mac-mini only.** Android AG0 remains open in parallel; two owner decisions are queued (selection events; v1.0.7 on-device Mine acceptance).

---

Copy everything between the markers into a new session.

>>> START >>>

3dpa cold start.

Read in order: ~/dev/Claude/Projects/CLAUDE.md → 3dprintassistant/CLAUDE.md → 3dprintassistant/docs/3dpa-context.md → 3dprintassistant/docs/planning/ROADMAP.md (banner + Active Work Queue) → docs/sessions/INDEX.md → last 3 session logs in full (start with 2026-07-10-cowork-appdev-analytics-fix-intake-plan.md) → this file.

Today's task — pick by what I say:

A) **Intake Autonomy v2 build session 1 — Gate B0 (mac-mini ONLY):** the impl plan is dual-reviewed (hostile ×17 + Codex ×6, all applied) at `docs/superpowers/plans/2026-07-10-intake-autonomy-v2-impl-plan.md` — read it IN FULL plus the spec `docs/superpowers/specs/2026-07-09-intake-autonomy-v2-design.md` §3–§5. Gate B0 = the launchd environment probe (`intake-launchd-probe.sh` + probe plist): prove `claude -p` headless auth + `wrangler whoami` + `bridge --health` + a worktree-neutral git push probe all PASS under launchd BEFORE building anything else. `mkdir -p scripts/.printer-intake-out` first; per-probe guards, no bare `set -e` abort; commit script+plist+gate-ledger row (create `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md` empty-first). If claude-under-launchd fails structurally → STOP and surface PD1 alternatives to me. Per-gate pattern: implement → hostile sub-agent review → patch → QA → commit.

B) **Android AG0 (if I ratify):** spec §2+§4 GO/override + Play account + prototype-commit decision → AG1 QuickJS spike per docs/superpowers/plans/2026-07-08-android-v1-plan.md (mac-mini).

C) **Owner-decision rows (if I pick one):** (1) the 4 selection events (`printer_selected`/`nozzle_selected`/`material_selected`/`use_case_selected`) still 400 on every chip click — allowlist (needs shared-column design: `brand`/`group`/`use_case` have no blob columns; AE 20-blob cap) or delete the dead `track()` calls; (2) v1.0.7 on-device Mine acceptance (TestFlight; import a web Workshop backup to surface the Mine segment).

Standing rules: web is master; engine.js/app.js never merge; engine/data changes require web + iOS (+ Android-plan) impact evaluation; one finding = one commit; iOS push gate (3 local data-mirror commits ride on v1.0.7 — flush only with the next TestFlight train); Android prototype no-push until AG0 GO; quality > speed; progress bar every multi-step turn.

Context nuggets for A: the K2 SE candidate lives in KV `req:1783615951531:a03e6e7e` (staging file is machine-local — re-stage from KV); the outcomes ledger is git-tracked (ledger custody = own commit per candidate, plan-review C1); `picker-dry-run.js`'s fetch shim is local-file-only; `.assetsignore` excludes docs/scripts (deploy latency only observable via served assets); never use the semver-only `compareVersions` for `content_version`. Owner setup inputs during build: Discord webhook for run reports (hard B5 enablement gate) + schedule time (proposed 07:45).

>>> END <<<

Maintenance note: this file is regenerated on Trigger A / Trigger B / explicit owner ask only — a stale copy between sessions is expected and fine.
