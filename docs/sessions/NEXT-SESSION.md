# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-06-04 after v1.0.4 was confirmed **live on the App Store** (Trigger A close). The "no active iOS work until the review verdict lands" hold is **lifted** — all lanes below are open (Lane B v1.0.5 hygiene included). Owner-pick at cold-start.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — v1.0.4 live; lanes open

## Required skills — invoke at cold-start

1. `superpowers:using-superpowers` (already loaded by SessionStart hook)
2. **For Lane W (web-only `[CRITICAL-001-followup]`):** `superpowers:test-driven-development` (Worker behavior change).
3. **For Lane A (PoC continuation):** `superpowers:verification-before-completion` (v5 line-refs) / `superpowers:writing-plans` (Gate 1 desk research).
4. **For Lane B (v1.0.5 hygiene):** `superpowers:test-driven-development`.
5. **For Hygiene (memory consolidation):** `anthropic-skills:consolidate-memory`.

## Read First, In This Order

Follow Trigger C. Show `[🟩...⬜ N%]` progress bar at every phase. Confirm current state + locked next step + risks before any file edit.

1. `/Users/mragile.io/dev/Claude/Projects/CLAUDE.md` — top-level rules.
2. `/Users/mragile.io/dev/Claude/Projects/3dprintassistant/CLAUDE.md` — project rules.
3. `/Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/3dpa-context.md` — evergreen.
4. `/Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md` — Active Work Queue.
5. `/Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md` — top 4 bullets.
6. Last 3 session logs (newest first):
   - `docs/sessions/2026-06-04-cowork-appdev-v1.0.4-live-and-pr1-cleanup.md`
   - `docs/sessions/2026-05-20-cowork-appdev-v1.0.4-asc-submit.md`
   - `docs/sessions/2026-05-19-cowork-appdev-bedfirstlayer-env-prefix-dedupe.md`
7. **Lane-specific (load only the picked lane's docs):**
   - Lane W: `functions/api/feedback.js` (Worker) + ROADMAP `[CRITICAL-001-followup]` entry.
   - Lane A: `ai-operating-model/docs/autonomy-poc-2026-05-resin/` (charter, scorecard, round-3-analysis) + `docs/resin-scaling/problem-statement.md` (v4) + the two open K1 findings.
   - Lane B: ROADMAP v1.0.5 carry bundle list.
   - Hygiene: `memory/project_3dprintassistant.md` + `memory/MEMORY.md` index.

## Current state (verify at session start)

- **v1.0.4 is LIVE on the App Store** (owner-confirmed 2026-06-04; submitted 2026-05-20, build `202605192119`, no App Privacy change). Supersedes 1.0.3. iOS HEAD `a2c1bc3` (docs-only migration commits on top of the v1.0.4 ship commit `ed08507`).
- **Web HEAD** — run `git log --oneline -3` + `git status` to confirm; clean post-wrap.
- **iOS work is open again** — push gate still applies (no iOS push to `main` until the next version is ship-ready for TestFlight).
- **0 open PRs / 0 open issues** on the web repo (stale Cloudflare autoconfig PR #1 closed 2026-06-04). If a new autoconfig PR appears, just close it — no clean Cloudflare toggle exists.

## Lanes (owner-pick; Lane W parallel-safe with anything)

### Lane W — web-only `[CRITICAL-001-followup]`
Route iOS feedback to a separate Discord channel: branch on `payload.context.appSource === "ios"` in `functions/api/feedback.js` → new `DISCORD_WEBHOOK_URL_IOS` env var. ~15 LoC + new Cloudflare secret + new webhook + redeploy. No iOS binary change. Bundle `[LOW-011]` (web feedback email visibility) if doing a web pass.

### Lane A — Resin PoC continuation (docs-only)
Path A: v5 mechanical pass on `problem-statement.md` (1 MUST-FIX + 8 SHOULD-FIX + 3 OPTIONAL; no bridge R4 needed). Path B: Gate 1 desk research (`technical-differences.md`). Path C: `bridge/CLAUDE.md` cwd-scope standing-rule preamble (~10 min, pairs with A/B).

### Lane B — v1.0.5 hygiene continuation
Carry bundle: helper extraction (4 math-dup sites), m2 test rename, Min-1 slow_layer_time coverage, Min-2 NSNumber decoder cleanup, magic constants, mobile-card warning length check, emit-vs-claim smoke assertion, shared `RETIRED_IDS` const, walkthrough hardcoded baseline, MEDIUM-02 packet-text decision, FDM-only scope copy. Pick by impact-vs-effort. **No iOS push** until v1.0.5 ship-ready (push gate).

### Hygiene — memory consolidation (small, high-value)
`memory/project_3dprintassistant.md` is a stale 2026-04-03 snapshot (flagged inline with a status header 2026-06-04). Run `anthropic-skills:consolidate-memory` or a manual pass to bring it (and any sibling staleness) current.

## Scope Rules

- **No live engine/data/UI touches** if Lane A picked (PoC stays docs-only).
- **No iOS push** for v1.0.5 carry items until v1.0.5 declared ship-ready.
- **One finding = one commit per platform.**
- **Trigger A close runs at session end.**

<<< END <<<

---

**Maintenance note:** Regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
