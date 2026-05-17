# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-17 after the resin-scaling discovery kickoff close. The PoC charter ("no new claim escapes a bridge round") requires bridge round 2 on `problem-statement.md` v3 before any downstream artifact cites it. Owner has been informed that v1.0.4 TestFlight submission is unblocked but parked behind the PoC pivot — pick it back up whenever owner directs.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — resin-scaling PoC continuation (bridge round 2 + Gate 1 drafting)

## Required skills — invoke at cold-start

1. `superpowers:using-superpowers` (already loaded by SessionStart hook)
2. `superpowers:writing-plans` — Gate 1 desk research is plan-shaped
3. `superpowers:verification-before-completion` — any claim about resin slicer behavior needs primary-source verification

Skip TDD / debugging — no code in this session.

## Read First, In This Order

Follow Trigger C. Show the `[🟩...⬜ N%]` progress bar at every phase. Confirm current state + locked next step + risks before any file edit.

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — top-level rules.
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md` — project rules.
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md` — evergreen.
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md` — note: Active Work Queue now includes "Resin-scaling discovery (PoC, docs-only)" as the active item.
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md` — last 3 bullets in particular.
6. **PoC meta-track (load-bearing for this session):**
   - `/Users/mragile.io/Documents/Claude/Projects/ai-operating-model/docs/autonomy-poc-2026-05-resin/charter.md`
   - `/Users/mragile.io/Documents/Claude/Projects/ai-operating-model/docs/autonomy-poc-2026-05-resin/scorecard.md`
   - `/Users/mragile.io/Documents/Claude/Projects/ai-operating-model/docs/autonomy-poc-2026-05-resin/bridge-rounds/round-1-analysis.md`
7. **The resin foundation document (v3):**
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/resin-scaling/problem-statement.md` — **read §2 first (audience reframe is load-bearing)**, then the rest in order
8. Last 3 session logs (newest first):
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-17-cowork-appdev-resin-scaling-poc-kickoff.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-15-cowork-appdev-printer-addition-protocol-trial.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-15-cowork-appdev-printer-addition-protocol.md`
9. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md` (this file)

## Current state (verify at session start)

- **Web HEAD** — last close commit on `main`; resin-scaling work is in `docs/resin-scaling/` (committed). Run `git log --oneline -5` to confirm. Working tree should be clean.
- **iOS HEAD** `c99a797` (untouched). v1.0.4 on TestFlight ([run 25892826819](https://github.com/mustiodk3dprintassistant-ios/actions/runs/25892826819)). v1.0.4 → App Store review submission remains parked — owner pivot to PoC has it on hold.
- **PoC findings to date:** K1-1 (worker.js self-own) + K4-1 (audience-as-users) — both `open`, both filed at `ai-operating-model/docs/findings/`. Don't re-litigate; they're load-bearing for the autonomy ceiling answer.
- **Survey v1 PARKED** — kept for general-feedback-pattern reference, NOT used for resin discovery. v3 §2 audience reframe is why.
- **Backup pre-launch:** `Claude/backups/claude-snapshot-2026-05-17.tar.gz` + `memory-snapshot-2026-05-17.tar.gz` + `recovery-2026-05-17.md`.

## Two paths for this session (pick one or sequence both)

### Path A — Bridge round 2 on v3 (REQUIRED before path B)

Per PoC charter: no new claim escapes a bridge round. v3 has substantial new claims:
- 7 new couplings (C9–C15) with t-shirt sizing
- Reframed gates (2 gates, ordered by cost-to-answer)
- Expanded success-target spectrum (A–G, 7 options)
- Gate-result × outcome matrix in §7 (4 named outcomes including "park")
- Load-bearing §2 audience reframe

**Action:** invoke `bridge` from `Projects/3dprintassistant/` (verify cwd explicitly per scorecard note) with a task prompt that:
- Names v3 as the artifact under review
- Pressure-tests v3's own §9 open questions (audience-reframe consistency through §4 Gate 2 spectrum, t-shirt sizing defensibility, gate-matrix orthogonality, "park" outcome too-easy criterion, line-ref freshness, residual institutional-context tension, off-axis spectrum completeness)
- Asks Codex specifically to verify the §5 line refs (since some are post-bridge-round-1 additions: C9 engine.js:370, C10 engine.js:2969, C11 locales/en.json:15, C12 functions/api/analytics.js:29, C13 index.html:7, C14 app-store-metadata.md:39, C15 PrinterCatalogProvider.swift:254)
- Does NOT re-litigate D1/D2/D3 (settled)

Expected wall-time: ~13–15 min. Output: `ai-operating-model/docs/autonomy-poc-2026-05-resin/bridge-rounds/bridge-2026-MM-DD-...md`. Write a `round-2-analysis.md` after.

### Path B — Draft technical-differences.md (Gate 1 desk research)

Only after Path A clears v3 to be cited. Gate 1 (wizard-frame fit) is desk-researchable; primary sources include:
- Chitubox / Lychee / Prusa SL1 slicer documentation (parameter surfaces)
- Anycubic Photon Workshop / Elegoo Voxeldance Tango (manufacturer-bundled tools)
- Resin-printing community wisdom (FacFox, AmeraLabs, Siraya Tech docs)
- Owner-side primary sources: any resin-printing reference material the owner already has

The artifact `docs/resin-scaling/technical-differences.md` should quantify (rough fractions, not precise): what % of "what a resin user wants to tune" is settings-only (advisable by 3dpa's existing wizard) vs geometry-driven (not advisable without STL ingestion). Gate 1's answer feeds Gate 2.

**Note:** owner reframe means primary sources are for the *owner's* learning + tuning needs, not for serving 3dpa's user base.

## Scope Rules

- **No live engine / data / UI touches.** PoC discovery is docs-only. Hard stop.
- **No iOS push** (iOS untouched anyway; v1.0.4 push gate still holds for the parked submission).
- **Findings + scorecard update in real time** per charter.
- **Owner-asks queue: surface in batches, not inline.**
- **One finding = one commit per platform** when work eventually lands.
- **Trigger A close runs at session end.**

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
