# 2026-07-08 — Cowork (appdev): iOS v2 rebuild — audit + design spec + gated master plan (planning only, no code)

> Fully autonomous run (Fable 5, Claude Code desktop). Owner ask: understand both 3dpa codebases, then plan an "improved copy of 3dpa-ios" — gated, reviewable, autonomy-explicit; execution in later fresh sessions. **No code, engine, data, or iOS-repo file touched** (except web docs). Cold start caught real staleness: local repos were 107 (web) / 17 (iOS) commits behind — pulled before reading any local state per the GitHub-first gate.

## Durable context

- **The iOS v2 program now exists as a triple-reviewed planning bundle awaiting owner Gate 0:** audit `docs/reviews/2026-07-08-ios-v2-rebuild-audit.md` → spec `docs/superpowers/specs/2026-07-08-ios-v2-rebuild-design.md` (decisions D0–D7 + D1a/D5a/D5b/D5c) → master plan `docs/superpowers/plans/2026-07-08-ios-v2-rebuild-plan.md` (G0–G8, one gate per session, per-gate micro-plans at writing-plans granularity authored at gate entry). Review dispositions: `docs/reviews/2026-07-08-ios-v2-rebuild-review.md`.
- **Key design calls (owner can override any at G0):** hybrid rebuild on branch `ios-v2` in the existing repo, same bundle id, ships as 2.0.0 replacing v1.0.x; branch pushed at every gate exit (D1a — two-machine reality beats local-only); learns/harvest layer runs byte-identical JS in JSCore (D5) with **Swift write-side op-log store APIs as the D5a default** (web store persists COMPACT JSON, iOS disk file is PRETTY + frozen — Codex caught this with bytes); `workshop-tuning-rules.js` migration frozen until post-v2 (D5b, consciously deferring the W3-T7 trigger); share = outbound-only via `state-codec.js` in JSCore (D5c); profile comparison CUT from 2.0.0.
- **The worst-outcome guard is spec §3 invariant 1:** v1 user data (app-state.json, workshop file with tuning+journal, UserDefaults keys) must survive the in-place 2.0.0 update — G1 upgrade fixture test + G8 on-device update check. This was the design review's CRITICAL and existed in no draft before it.
- **Review pattern held 3-for-3 with non-overlapping catches:** design sub-agent (CRITICAL v1-data migration, share-premise correction), plan sub-agent (web-master drift protocol, cross-machine branch reality, hotfix/merge mechanics post-restructure), Codex (printers.json false-drift, D5a byte contradiction, stale 3dpa-context routing). All GO-WITH-PATCHES; every patch applied same-session.
- **Ground-truth corrections that outlive this session:** iOS has NO URL codec (earlier audit drafts claimed decode-side existed); web analytics has 5 events (`troubleshoot_used`, `export_clicked` beyond the documented 3) — iOS parity gap; `printers.json` web↔iOS difference is by-design (71-baseline + overlay vs 74) and must be EXCLUDED from any byte-drift check that other files are subject to.
- **Estimates:** 10–15 autonomous sessions honest envelope (8–12 optimistic). Owner-blocking points: G0 ratification, G8 TestFlight dispatch (from `--ref ios-v2` BEFORE the main merge) + on-device acceptance + merge approval + ASC submission.

## What happened / Actions

1. Trigger C cold start (3dpa token) — GitHub-first gate flagged `behind:107/17`; ff-pulled both repos; read protocol → project CLAUDE.md → 3dpa-context → ROADMAP → INDEX → last 3 logs → NEXT-SESSION; proceeded on the owner's pivot task (not the locked v1.0.7-acceptance entry, which remains open).
2. Work Protocol: Full lane (user-facing app, cross-platform, architecture, release-adjacent). Review mode → Plan mode; brainstorm-mode owner Q&A replaced by written Gate 0 decision set (owner absent by design).
3. Two parallel deep-audit agents (web feature surface + engine consumption; iOS architecture/UX/debt); controller-verified every load-bearing/conflicting claim (counts, byte-identity, comparison feature, locales) before writing.
4. Wrote audit → spec → master plan; two parallel hostile sub-agent reviews (design gate + plan gate) → both GO-WITH-PATCHES → all patches applied (incl. scope cut: comparison out, share moved to G5, envelope widened).
5. Codex cross-model round (`bridge --health` ok → `bridge --mode codex-only`, 167s) → GO-WITH-PATCHES (3 HIGH / 2 MEDIUM / 1 LOW, none overlapping the sub-agents) → all applied, incl. fixing stale `3dpa-context.md` in-session (env ids, mine tier, test count — also closes the carried 2026-07-05 doc-drift finding).
6. Commits (one concern each): `250f37a` planning bundle + codex packet · `4c17f96` 3dpa-context staleness fix · (wrap commit follows: ROADMAP, this log, INDEX, NEXT-SESSION).

## Files touched

Web repo only: 4 new docs (audit, spec, plan, review dispositions) + `codex/ios-v2-rebuild-review/bridge-2026-07-08-232153-554173.md` (new) + `docs/3dpa-context.md` (staleness fix) + ROADMAP + sessions INDEX + this log + NEXT-SESSION. iOS repo: untouched (0 ahead / 0 behind). Engine/data: untouched.

## Commits

Web `main`: `250f37a` (planning bundle) · `4c17f96` (3dpa-context fix) · wrap-docs commit. Pushed at wrap (web push is free; docs-only).

## Open questions / Follow-up

- **OWNER Gate 0 (the locked next step for the v2 program):** read spec §2, reply GO or override decisions — especially D1a (branch push ON), D5b (rules-migration freeze), the comparison cut. Also still open from before this session: **v1.0.7 on-device Mine acceptance** (TestFlight, import a web Workshop backup).
- Md-hygiene: protocol drift NONE; no stray tags; no secrets; INDEX parity kept (this log + line, same commit). Carried observation now stronger: `docs/planning/` holds 3 gate ledgers and G0 adds a 4th — archive sweep when convenient.
- Lesson-spotter (compact): 1 candidate — spec's D5a first draft defaulted an architecture on an unverified byte-format premise; cross-model review refuted it with bytes pre-commit. Disposition: **no new finding file** (assert-without-verify family already ledgered; the review layer performed exactly as designed) — calibration row appended to `ai-operating-model/docs/agents/lesson-spotter-calibration.md`. No K3 (skills behaved), no K4, no K1 safety-net catches (all reviewer disagreements dispositioned in the review doc).
- verify-before-mutate summary: **4 flags (3 resolved, 1 ignored), 0 destructive-core, 3 unclassified, 0 generated-write.** The "ignored" flag (review-dispositions Write) was in fact verified same-turn (`ls` + `git status`, novel file in established dir) — ledger matcher false-negative, stated here for the owner's read.
- Memory sweep: no durable memory to add — the program, decisions, and contracts are all repo-documented (spec/plan/review); nothing crosses the repo boundary. (Pre-existing note stands: `memory/project_3dprintassistant.md` flagged stale since 2026-06-04, separate consolidation pass.)
- Vault sweep: nothing durable to propagate — checked strategic / shorthand / cross-project / hobby / consulting / external-source; the one cross-cutting lesson (reviews catch draft-level unverified premises) is already the ledgered family.
- Out-of-scope health surfaced at cold start: `claude-sync behind:155+dirty`, `personal-dashboard behind:6`, `3dprintassistant-android`/`ensemble` missing on this machine — not 3dpa; owner/next relevant session.

## Next session

**If owner has ratified Gate 0:** start G1 per the master plan (create ledger row happens at G0 ratification itself). **If not:** any queue item stands — v1.0.7 on-device acceptance (owner), `max_mvs` 0.8 data gap, Export Phase 2, Orca Phase 3, W4 custom filaments, S1 landing pages. Resume via `NEXT-SESSION.md`.
