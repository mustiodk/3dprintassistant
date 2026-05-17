# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-17 (evening, session 2) after bridge rounds 2 + 3 closed and v4 problem-statement.md shipped. Three viable next-session openers — owner-pick at cold-start (one option is a ~10 min preamble that pairs naturally with the others). v1.0.4 → ASC submission lane remains parked behind PoC; owner-gated whenever PoC reaches a natural pause.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — resin-scaling PoC continuation (v5 / Gate 1 / preamble)

## Required skills — invoke at cold-start

1. `superpowers:using-superpowers` (already loaded by SessionStart hook)
2. **For path A (v5 mechanical pass):** `superpowers:verification-before-completion` — round 3 caught a v4 over-correction; v5's MUST-FIX risks a similar regression unless line-refs are verified against source on the way in.
3. **For path B (Gate 1 desk research):** `superpowers:writing-plans` — `technical-differences.md` is plan-shaped (primary-source-driven mapping with sections).
4. **For path C preamble (bridge/CLAUDE.md edit):** none required — ~10 min mechanical edit.

Skip TDD / debugging — no code in this session.

## Read First, In This Order

Follow Trigger C. Show `[🟩...⬜ N%]` progress bar at every phase. Confirm current state + locked next step + risks before any file edit.

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — top-level rules.
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md` — project rules.
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md` — evergreen.
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md` — Active Work Queue resin entry reflects v4 + R3 + v5 queued.
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md` — last 4 bullets in particular (session 1 morning + session 2 evening + 2 prior 2026-05-15 entries).
6. **PoC meta-track (load-bearing for any resin path):**
   - `/Users/mragile.io/Documents/Claude/Projects/ai-operating-model/CLAUDE.md` — Current state row for autonomy-PoC + findings ledger count
   - `/Users/mragile.io/Documents/Claude/Projects/ai-operating-model/docs/autonomy-poc-2026-05-resin/charter.md`
   - `/Users/mragile.io/Documents/Claude/Projects/ai-operating-model/docs/autonomy-poc-2026-05-resin/scorecard.md` — 3 rounds + cumulative tallies + session 2 running notes (sandbox-pattern revelation)
   - `/Users/mragile.io/Documents/Claude/Projects/ai-operating-model/docs/autonomy-poc-2026-05-resin/bridge-rounds/round-3-analysis.md` — the most material recent input (1 MUST-FIX + 8 SHOULD-FIX + 3 OPTIONAL + sandbox-cwd revelation)
7. **The resin foundation document (v4):**
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/resin-scaling/problem-statement.md` — v4 currently shipped; read §5 + §7 carefully (those are the changed sections from v3 and the targets for v5)
8. **Findings ledger entries to read (cross-project verification per Trigger C standing rule):**
   - `/Users/mragile.io/Documents/Claude/Projects/ai-operating-model/docs/findings/2026-05-17-bridge-r3-claude-turn-1-content-misses-plus-sandbox-pattern.md` — K1-3 (combined K1 + K3, sandbox-cwd revelation). Status: `open`. Mitigation candidates pending owner direction.
   - `/Users/mragile.io/Documents/Claude/Projects/ai-operating-model/docs/findings/2026-05-17-bridge-r2-claude-turn-1-content-misses.md` — K1-2. Status: `open`.
9. Last 3 session logs (newest first):
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-17-cowork-appdev-resin-bridge-r2-r3-v4.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-17-cowork-appdev-resin-scaling-poc-kickoff.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-15-cowork-appdev-printer-addition-protocol-trial.md`
10. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md` (this file)

## Current state (verify at session start)

- **Web HEAD** — last close commit on `main`; resin-scaling v4 + new session log + ROADMAP touch + INDEX prepend + this NEXT-SESSION committed. Run `git log --oneline -5` to confirm. Working tree should be clean.
- **iOS HEAD** `c99a797` (untouched). v1.0.4 on TestFlight ([run 25892826819](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25892826819)). v1.0.4 → App Store review submission remains parked — owner pivot to PoC has it on hold.
- **PoC findings to date:** **3 K1 + 1 K4 + K3 sub-component of K1-3** — K1-1 worker.js (R1), K1-2 round-2 misses (R2), K1-3 round-3 misses + sandbox-cwd revelation (R3), K4-1 audience-as-users assumption (session 1). All `open`; mitigation candidates surfaced but not landed.
- **v4 status:** foundation-correct in shape; needs v5 mechanical pass (1 MUST-FIX `index.html:8` regression + 8 SHOULD-FIX) before any downstream artifact cites without caveats.
- **Bridge round count:** **3 completed** (R1 + R2 + R3). No R4 needed per R3 synthesis (mechanical fixes don't introduce new claims).
- **Survey v1 still PARKED.** Untouched since session 1.
- **Backup pre-launch (session 1):** `Claude/backups/claude-snapshot-2026-05-17.tar.gz` + `memory-snapshot-2026-05-17.tar.gz` + `recovery-2026-05-17.md`.

## Three viable paths for this session (owner-pick at start; paths combinable)

### Path A — v5 mechanical pass on problem-statement.md (~30 min)

Addresses round 3's catches in a single editing pass; lands v5 as foundation-ready.

**Targets** (per [round-3-analysis.md](../../../ai-operating-model/docs/autonomy-poc-2026-05-resin/bridge-rounds/round-3-analysis.md) classification):
- **MF-R3-1:** §5 footnote — replace `index.html:8,14,20,30` with `index.html:7,14,20,30` (line 8 is meta description, not a count surface; "60+" lives at the title line 7). Also fix the C13 row narrative if it references `:8` for the count.
- **SF-R3-1:** §3↔§5 alignment — soften §5 C3 to echo §3 unknown #4's hypothesis framing.
- **SF-R3-2:** §7 Step 2 D branch — add criteria for "reuse 3dpa UI" vs "standalone."
- **SF-R3-3:** §7 Step 2 E branch — reword "sibling product is cleaner" to echo §3 unknown #2's "personal hobby site" framing.
- **SF-R3-4:** §5 C1 "Fires if" — reconcile with §7 F/G branch wording (pick which is true).
- **SF-R3-5:** §5 C4 ref `:68` → `:108`.
- **SF-R3-6:** §7 A/B "no engine work" — resolve contradiction with §5 C1 "{A,B,C,D}" fires-if.
- **SF-R3-7:** §5 C5 fires-if — tighten "F could reuse" to "F only if deliberately implemented through the existing warning surface."
- **SF-R3-8:** §7 Step 2 estimates — add hedge wrapper line.
- Optionally: OPT-R3-1 (C11 A-as-raw-data assumption), OPT-R3-2 (`worker.js:46` precision), OPT-R3-3 (C6 wording).

**Verification at the end:** before committing v5, spot-check each new line ref against source. Round-3 had a Codex-vs-Codex disagreement on C4 (R2 said EXACT, R3 said wrong) — round 4 controller pass should be stricter.

### Path B — Gate 1 desk research (`technical-differences.md`)

Skips v5 (or runs after Path A); starts the substantive Gate 1 work. Per v4 §7, Gate 1 is conditional on Gate 2 ∈ {A, B, C, D, E} (F/G bypass), but the wizard-frame-fit % is decisive for Gate 2 = C and informative for {A,B,D,E}.

**Scope:** quantify what % of "what a resin user wants to tune" is settings-only (advisable by 3dpa wizard) vs geometry-dependent (not advisable without STL ingestion). Primary sources to consult (already cited in v4 §3 + §10):
- [CHITUBOX print-settings docs](https://docs.chitubox.com/en-US/chitubox/latest/configure-print-settings)
- [Lychee Slicer resin-settings guide](https://lychee.mango3d.io/whats-new/the-best-resin-settings-for-your-printer-lychee-slicer-guide)
- [Prusa SL1 resin calibration](https://help.prusa3d.com/article/resin-calibration-sl1-sl1s_112182)
- Owner-side primary sources (any resin reference material owner already has)

**Deliverable:** `docs/resin-scaling/technical-differences.md` with primary-source citations + rough % settings-only vs geometry-dependent split.

**Caveat:** if v5 is skipped, the v4 MUST-FIX-1 (citation error) inherits into `technical-differences.md`'s citations — log as known caveat.

### Path C — bridge/CLAUDE.md cwd-scope standing rule preamble (~10 min)

Locks in the operational learning from K1-3's K3 sub-component before next bridge invocation. Mechanical edit; pairs naturally with Paths A or B (which may invoke bridge for verification down the line).

**Action:** edit `Projects/bridge/CLAUDE.md` to add a standing-rule section about cwd-scope → Claude-turn-1 sandbox-scope. Text candidate is in K1-3's "Action" section. Self-contained edit; no downstream changes required.

## Scope Rules

- **No live engine / data / UI touches.** PoC discovery is docs-only. Hard stop.
- **No iOS push** (iOS untouched anyway; v1.0.4 push gate still holds for the parked submission).
- **Bridge cwd discipline:** Path A + B don't need bridge invocation; Path C explicitly captures the cwd-scope rule. If any bridge invocation does happen, follow the rule before it lands as a standing-rule edit.
- **Findings + scorecard update in real time** per charter — still applies if any K1/K2 surfaces during Path A or B work.
- **Owner-asks queue: surface in batches, not inline.**
- **One finding = one commit per platform** when work eventually lands implementation-side (not relevant to docs-only paths A/B/C).
- **Trigger A close runs at session end.**

## Possible vault propagation (proposed last session; pending owner decision)

`Obsidian Vault/20-Areas/Development/toolchain.md` candidate: bridge cwd-scope contract (cross-project working-method decision). Doesn't autoedit — owner-pick whether to land this session.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
