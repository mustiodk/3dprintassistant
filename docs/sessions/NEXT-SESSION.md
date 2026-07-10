# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-10 (Trigger A close of the Intake Autonomy v2 FULL BUILD session — B0→B5 built + verified in one autonomous run; real prod rollback drill green; the daily plist is NOT loaded).
**Locked next entry point:** **OWNER supplies the Discord webhook → test POST → load the plist → first live run (daily 12:00) ships the staged K2 SE as the real e2e test.** Everything else is green and pushed.

---

## Owner go-live steps (no session needed — 5 minutes)

1. Create a Discord webhook (suggested channel: `#3dpa-intake-runs`).
2. Add it to `scripts/.printer-intake.local.json` (gitignored): `"discordWebhookUrl": "https://discord.com/api/webhooks/…"`.
3. Optional but recommended: one-time PD7 marker migration (runbook `docs/runbooks/printer-addition-protocol.md` → Execution modes → last waiver bullet).
4. Tell the next session "webhook is set — enable the pipeline" (it will run the test POST + bootstrap the plist), OR do it yourself per `scripts/launchd/README.md`.

Copy everything between the markers into a new session.

>>> START >>>

3dpa cold start.

Read in order: ~/dev/Claude/Projects/CLAUDE.md → 3dprintassistant/CLAUDE.md → 3dprintassistant/docs/3dpa-context.md → 3dprintassistant/docs/planning/ROADMAP.md (banner + Active Work Queue) → docs/sessions/INDEX.md → last 3 session logs in full (start with 2026-07-10-cowork-appdev-intake-autonomy-build.md) → docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md (B5 row) → this file.

Today's task — pick by what I say:

A) **Intake Autonomy go-live (mac-mini ONLY; requires my webhook already in `scripts/.printer-intake.local.json`):** B5.4 enablement — verify the webhook with one test POST via `node scripts/intake-notify.js` on a dummy report (nothing shipped → no freeze risk), then `mkdir -p scripts/.printer-intake-out && cp scripts/launchd/dk.mragile.3dpa-intake.plist ~/Library/LaunchAgents/ && launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/dk.mragile.3dpa-intake.plist` (per scripts/launchd/README.md), confirm `launchctl print` shows it loaded, flip the gate ledger B5 row to ✅ with evidence, and update ROADMAP. The first scheduled run (12:00) processes the staged Creality K2 SE (KV `req:1783615951531:a03e6e7e`) end-to-end — I read the Discord run report afterwards. If I want it to run TODAY without waiting for 12:00: `launchctl kickstart -k gui/$(id -u)/dk.mragile.3dpa-intake` (supervised first run is fine — it's the same pipeline).

B) **Post-first-run review:** read `scripts/.intake-runner-state/last-run-report.md` + the Discord report + the ledger line + live overlay state; flip B5.4 evidence; triage any parked candidates; file findings.

C) **Other queue items:** Android AG0 (owner ratification) → AG1 QuickJS spike; the 4 selection-events decision (allowlist vs delete); v1.0.7 on-device Mine acceptance (TestFlight).

Standing rules: web is master; engine.js/app.js never merge; engine/data changes require web + iOS (+ Android-plan) impact evaluation; one finding = one commit; iOS push gate (3 local data-mirror commits ride v1.0.7); Android prototype no-push until AG0 GO; quality > speed; progress bar every multi-step turn.

Context nuggets: headless `claude -p` auth on the mac-mini = `~/.config/claude-code/oauth.env` (keychain is 401-stale; memory `mac-mini-headless-claude-auth-oauth-env`); the Scout test suite WIPES `scripts/.printer-intake-out/` — runner durable state lives in `scripts/.intake-runner-state/`; `data/printers.json` is hand-formatted — rows are added by string splice, guarded by `scripts/intake-diff-guards.js --base main`; live overlay is at `content_version=2026071004` (post-drill, payload unchanged); runner contract = `ai-operating-model/docs/agents/intake-pipeline-runner.md` v1; missed-run semantics: powered-off at 12:00 = no run + no report (see scripts/launchd/README.md).

>>> END <<<

Maintenance note: this file is regenerated on Trigger A / Trigger B / explicit owner ask only — a stale copy between sessions is expected and fine.
