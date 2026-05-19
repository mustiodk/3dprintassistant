# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-19 after env-prefix-dedupe bug fix wrap (Trigger A) + mid-session ride-along into v1.0.4 TestFlight. Three viable lanes — owner-pick at cold-start. PoC paths still valid; v1.0.5 carry bundle reverts to all items pending (the dedupe fix shipped under v1.0.4, not v1.0.5); v1.0.4 → ASC submission lane is now nearer-term — pending [TestFlight run 26125919796](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/26125919796) acceptance + owner on-device test.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — three lanes available

## Required skills — invoke at cold-start

1. `superpowers:using-superpowers` (already loaded by SessionStart hook)
2. **For Lane A (PoC continuation):**
   - Path A v5 mechanical pass: `superpowers:verification-before-completion` (round 3 caught a v4 over-correction; v5's MUST-FIX risks similar regression unless line-refs are verified against source on the way in).
   - Path B Gate 1 desk research: `superpowers:writing-plans` (`technical-differences.md` is plan-shaped).
   - Path C bridge/CLAUDE.md cwd-scope edit: none required (~10 min mechanical edit).
3. **For Lane B (v1.0.5 hygiene continuation):** `superpowers:test-driven-development` (bug fixes + refactors need TDD per standing rule).
4. **For Lane C (ASC submission):** none required — manual ASC workflow + monitoring.

## Read First, In This Order

Follow Trigger C. Show `[🟩...⬜ N%]` progress bar at every phase. Confirm current state + locked next step + risks before any file edit.

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — top-level rules.
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md` — project rules.
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md` — evergreen.
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md` — Active Work Queue.
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md` — top 4 bullets (2026-05-19 env-prefix-dedupe + 2× 2026-05-17 resin sessions + 2026-05-15 printer-protocol trial).
6. Last 3 session logs (newest first):
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-19-cowork-appdev-bedfirstlayer-env-prefix-dedupe.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-17-cowork-appdev-resin-bridge-r2-r3-v4.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-17-cowork-appdev-resin-scaling-poc-kickoff.md`
7. **PoC meta-track (load-bearing only if Lane A picked):**
   - `/Users/mragile.io/Documents/Claude/Projects/ai-operating-model/CLAUDE.md` — current state row for autonomy-PoC + findings ledger count.
   - `/Users/mragile.io/Documents/Claude/Projects/ai-operating-model/docs/autonomy-poc-2026-05-resin/charter.md`
   - `/Users/mragile.io/Documents/Claude/Projects/ai-operating-model/docs/autonomy-poc-2026-05-resin/scorecard.md`
   - `/Users/mragile.io/Documents/Claude/Projects/ai-operating-model/docs/autonomy-poc-2026-05-resin/bridge-rounds/round-3-analysis.md` (most material recent input — 1 MUST-FIX + 8 SHOULD-FIX + 3 OPTIONAL + sandbox-cwd revelation).
8. **Resin foundation document (load-bearing only if Lane A picked):**
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/resin-scaling/problem-statement.md` — v4 currently shipped; v5 mechanical pass queued.
9. **Findings ledger entries (load-bearing only if Lane A picked, per Trigger C cross-project verification rule):**
   - `/Users/mragile.io/Documents/Claude/Projects/ai-operating-model/docs/findings/2026-05-17-bridge-r3-claude-turn-1-content-misses-plus-sandbox-pattern.md` — K1-3 (combined K1 + K3, sandbox-cwd revelation). Status: `open`.
   - `/Users/mragile.io/Documents/Claude/Projects/ai-operating-model/docs/findings/2026-05-17-bridge-r2-claude-turn-1-content-misses.md` — K1-2. Status: `open`.

## Current state (verify at session start)

- **Web HEAD** `46334e6` (pushed; Cloudflare auto-deploys). Run `git log --oneline -3` + `git status` to confirm. Working tree should be clean post-wrap.
- **iOS HEAD** `ed08507` — pushed to `origin/main` (amended from `e2985f1` pre-push to reflect v1.0.4 ride-along). v1.0.4 has a NEW TestFlight build pending acceptance: [run 26125919796](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/26125919796) (env-prefix-dedupe included). Prior v1.0.4 build was [run 25892826819](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25892826819). v1.0.5 carry bundle all-items-pending.
- **PoC state (unchanged from 2026-05-17 evening):** 3 K1 + 1 K4 + K3 sub-component of K1-3 (all `open`, mitigation candidates pending owner direction). v4 problem-statement is foundation-correct in shape; v5 mechanical pass queued (1 MUST-FIX + 8 SHOULD-FIX + 3 OPTIONAL).
- **Bug-fix state (just shipped):** bed-first-layer warning no longer leads with `${env.name}` across all 3 MEDIUM-01 attribution branches; consolidated env_*_0 warning retains env framing as canonical surface. Walkthrough new `v1.0.5 env-prefix-dedupe` block + MEDIUM-01 non-regression both OK; iOS XCTest 110/110 with new mirror test.

## Three lanes for this session (owner-pick at start; lanes are mutually exclusive)

### Lane A — Resin PoC continuation (3 sub-paths; A+C combinable)

Per the prior NEXT-SESSION's 3-path framing — unchanged by today's bug fix:

- **Path A** — v5 mechanical pass on problem-statement.md (~30 min). MF-R3-1 + 8 SHOULD-FIX + 3 OPTIONAL. No bridge round 4 needed per synthesis.
- **Path B** — Gate 1 desk research (`technical-differences.md`). Primary sources: CHITUBOX / Lychee / Prusa SL1. Substantive Gate 1 work; multi-session candidate.
- **Path C** — bridge/CLAUDE.md cwd-scope standing rule preamble (~10 min). Locks in K1-3 K3 component before next bridge invocation. Pairs with A or B.

See prior NEXT-SESSION wording (2026-05-17 evening) for full path details — that content is preserved in this session's log + the prior log.

### Lane B — v1.0.5 hygiene continuation

env-prefix-dedupe shipped to web; iOS local-only. Carry bundle still has:

- Helper extraction across 4 math-duplication sites
- m2 test rename
- Min-1 PLA+PETG+ABS slow_layer_time test coverage tightening
- Min-2 NSNumber decoder dead-code path
- Magic constants pass
- Mobile-card warning text length check
- Smoke assertion for emit-vs-claim parity
- Shared `RETIRED_IDS` const array
- Walkthrough hardcoded baseline cleanup
- MEDIUM-02 packet-text accuracy decision
- FDM-only scope copy on a user-facing surface (web About/footer/iOS Settings)

Pick next item by impact-vs-effort. Helper extraction is the biggest piece; FDM-only scope copy is the smallest.

### Lane C — v1.0.4 → App Store review submission (nearer-term post-ride-along)

Gated on owner's TestFlight verdict for [run 26125919796](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/26125919796) (the NEW v1.0.4 build with env-prefix-dedupe included; supersedes [25892826819](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25892826819) for testing purposes — both at MARKETING_VERSION 1.0.4, newer build number wins). If build accepted + on-device test GO: manual ASC submission workflow. If regression: focused fix arc inside v1.0.4 (no version bump unless ship is blocked).

## Scope Rules

- **No live engine / data / UI touches** if Lane A picked (PoC discovery remains docs-only).
- **No iOS push** for any v1.0.5 carry item unless v1.0.5 declared ship-ready (env-prefix-dedupe rode into v1.0.4 as an owner-directed exception; the rest of the carry bundle stays gated per the standing iOS push gate).
- **Bridge cwd discipline** still applies if any bridge invocation happens (Path C captures the rule; if landed before bridge, scope is deliberate).
- **Findings + scorecard update in real time** per charter (Lane A only).
- **One finding = one commit per platform.**
- **Trigger A close runs at session end.**

## Possible vault propagation (none from 2026-05-19 session; pending owner decision from prior session)

`Obsidian Vault/20-Areas/Development/toolchain.md` candidate: bridge cwd-scope contract (cross-project working-method decision). Doesn't autoedit — owner-pick whether to land this session.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
