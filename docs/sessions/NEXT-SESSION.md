# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-20 after v1.0.4 was submitted for App Store review (Trigger A close). v1.0.4 is now **in review** (build `202605192119`, Manual Release) — owner will report approval/release. No active iOS work until the verdict lands. Three open lanes below; owner-pick at cold-start.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — v1.0.4 in review; three open lanes

## Required skills — invoke at cold-start

1. `superpowers:using-superpowers` (already loaded by SessionStart hook)
2. **For Lane W (web-only `[CRITICAL-001-followup]`):** `superpowers:test-driven-development` (Worker change; small but a behavior change).
3. **For Lane A (PoC continuation):** `superpowers:verification-before-completion` (v5 line-refs) / `superpowers:writing-plans` (Gate 1 desk research).
4. **For Lane B (v1.0.5 hygiene):** `superpowers:test-driven-development`.

## Read First, In This Order

Follow Trigger C. Show `[🟩...⬜ N%]` progress bar at every phase. Confirm current state + locked next step + risks before any file edit.

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — top-level rules.
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md` — project rules.
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md` — evergreen.
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md` — Active Work Queue.
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md` — top 4 bullets.
6. Last 3 session logs (newest first):
   - `docs/sessions/2026-05-20-cowork-appdev-v1.0.4-asc-submit.md`
   - `docs/sessions/2026-05-19-cowork-appdev-bedfirstlayer-env-prefix-dedupe.md`
   - `docs/sessions/2026-05-17-cowork-appdev-resin-bridge-r2-r3-v4.md`
7. **Lane-specific (load only the picked lane's docs):**
   - Lane W: `functions/api/feedback.js` (Worker) + ROADMAP `[CRITICAL-001-followup]` entry.
   - Lane A: `ai-operating-model/docs/autonomy-poc-2026-05-resin/` (charter, scorecard, round-3-analysis) + `docs/resin-scaling/problem-statement.md` (v4) + the two open K1 findings in `ai-operating-model/docs/findings/`.
   - Lane B: ROADMAP v1.0.5 carry bundle list.

## Current state (verify at session start)

- **iOS HEAD `ed08507`** — pushed. **v1.0.4 SUBMITTED for App Store review** (build `202605192119`, run [26125919796](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/26125919796), Manual Release). Awaiting Apple approval — owner will report. Submit doc: `3dprintassistant-ios/docs/app-store-v1.0.4-submit.md` (committed locally; push is owner's call).
- **Web HEAD** — run `git log --oneline -3` + `git status` to confirm; clean post-wrap.
- **No active iOS work** until the review verdict lands. If approved → owner reports; if rejected → focused fix arc inside v1.0.4 (no version bump unless blocked).

## Three lanes (owner-pick; mutually exclusive except Lane W which is parallel-safe)

### Lane W — web-only `[CRITICAL-001-followup]` (parallel-safe during review)
Route iOS feedback to a separate Discord channel: branch on `payload.context.appSource === "ios"` in `functions/api/feedback.js` → new `DISCORD_WEBHOOK_URL_IOS` env var. ~15 LoC + new Cloudflare secret + new webhook + redeploy. No iOS binary change. Zero risk to the in-review v1.0.4 binary. Also bundle `[LOW-011]` (web feedback email visibility) if doing a web pass.

### Lane A — Resin PoC continuation (docs-only)
Path A: v5 mechanical pass on `problem-statement.md` (1 MUST-FIX + 8 SHOULD-FIX + 3 OPTIONAL; no bridge R4 needed). Path B: Gate 1 desk research (`technical-differences.md`). Path C: `bridge/CLAUDE.md` cwd-scope standing-rule preamble (~10 min, pairs with A/B).

### Lane B — v1.0.5 hygiene continuation
Carry bundle: helper extraction (4 math-dup sites), m2 test rename, Min-1 slow_layer_time coverage, Min-2 NSNumber decoder cleanup, magic constants, mobile-card warning length check, emit-vs-claim smoke assertion, shared `RETIRED_IDS` const, walkthrough hardcoded baseline, MEDIUM-02 packet-text decision, FDM-only scope copy. Pick by impact-vs-effort. **No iOS push** for v1.0.5 items until v1.0.5 ship-ready (push gate).

## Scope Rules

- **No live engine/data/UI touches** if Lane A picked (PoC stays docs-only).
- **No iOS push** for v1.0.5 carry items until v1.0.5 declared ship-ready.
- **One finding = one commit per platform.**
- **Trigger A close runs at session end.**

<<< END <<<

---

**Maintenance note:** Regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
