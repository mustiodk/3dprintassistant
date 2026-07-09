# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-10 (Trigger A close of the intake-autonomy session — Intake Autonomy v2 is RATIFIED incl. the no-babysitting amendment; overlay validator green again; K2 SE staged as the pipeline's first candidate).
**Locked next entry point:** two owner-declared tracks — (A) the analytics Worker `EVENT_KEYS` fix (owner: "I want to do 1") and (B) the Intake Autonomy v2 impl plan → build (mac-mini-pinned). Android AG0 remains open in parallel.

---

Copy everything between the markers into a new session.

>>> START >>>

3dpa cold start.

Read in order: ~/dev/Claude/Projects/CLAUDE.md → 3dprintassistant/CLAUDE.md → 3dprintassistant/docs/3dpa-context.md → 3dprintassistant/docs/planning/ROADMAP.md (banner + Active Work Queue) → docs/sessions/INDEX.md → last 3 session logs in full (start with 2026-07-09-cowork-appdev-intake-autonomy.md) → this file.

Today's task — pick by what I say:

A) **Analytics Worker fix (my declared "do 1"):** `functions/api/analytics.js` `EVENT_KEYS` allowlists only 3 events — web's own `troubleshoot_used`/`export_clicked` are silently dropped for EVERY platform today. Fix = FULL schema patch (per-event allowed keys + `BLOB_FIELDS`/query columns for `symptom`/`type` + real-payload tests), then a SEPARATE commit extending the auth branch to accept `android` as an HMAC-verified source. One finding = one commit, TDD RED-first, hostile review, curl-verify live after push. (The sibling feedback-Worker `android` auth row in the queue is a natural follow-on.)

B) **Intake Autonomy v2 — impl plan then build (mac-mini only):** the design is RATIFIED (PD0–PD8 + my amendment: no shadow phase, no manual merges — full autonomy from run 1). Read the spec `docs/superpowers/specs/2026-07-09-intake-autonomy-v2-design.md` + audit `docs/reviews/2026-07-09-printer-intake-autonomy-audit.md` IN FULL first. Next artifact = the gated impl plan (writing-plans granularity, hostile sub-agent review + **Codex cross-model review — mandatory before any build**), then build session 1 whose FIRST deliverable is the launchd environment probe (headless `claude -p` + wrangler + bridge + git push under launchd is unproven). Build inventory is spec §4; PD6's rollback version-ordering rule (max(bad,snapshot)+1) is CRITICAL — never lose it. First real candidate: the staged Creality K2 SE (`candidate-creality-k2_se.json`, KV `req:1783615951531:a03e6e7e`).

C) **If I have ratified Android AG0:** per the Android bundle (spec §2+§4, plan AG0–AG8, ledger PENDING-GO) — QuickJS spike first, mac-mini, per docs/superpowers/plans/2026-07-08-android-v1-plan.md.

Standing rules: web is master; engine.js/app.js never merge; engine/data changes require web + iOS (+ Android-plan) impact evaluation; one finding = one commit; iOS push gate (3 local data-mirror commits ride on v1.0.7 — flush only with the next TestFlight train); Android prototype no-push until AG0 GO; quality > speed; progress bar every multi-step turn.

>>> END <<<

Maintenance note: this file is regenerated on Trigger A / Trigger B / explicit owner ask only — a stale copy between sessions is expected and fine.
