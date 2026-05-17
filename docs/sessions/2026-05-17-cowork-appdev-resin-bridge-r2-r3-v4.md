# 2026-05-17 — Cowork (appdev): resin-scaling bridge rounds 2 + 3 + v4 problem-statement

> **Session 2 of 2 today** for the resin-scaling PoC. Session 1 (morning) shipped v3 + bridge round 1 + 2 findings + ROADMAP entry; this evening session ran the rest of the planned multi-round bridge work on v3/v4 and ended with v4 as the latest committed foundation document. See sibling log [`2026-05-17-cowork-appdev-resin-scaling-poc-kickoff.md`](2026-05-17-cowork-appdev-resin-scaling-poc-kickoff.md) for session 1.

## Durable context

- **v4 is the latest foundation document; v5 mechanical pass is queued (not blocking).** v3 → v4 integrated bridge round 2's 2 MUST-FIX + 6 SHOULD-FIX (most importantly: §7 restructured from non-orthogonal matrix to Option A decision tree with Gate 2 evaluated first; §5 gained a "Fires if" column making the conditional-cost framing visible; printer-count drift footnote rewritten with correct sources at app.js:101 + :107 + index.html:7,14,20,30 + app-store-metadata.md:40). Round 3 then caught 1 MUST-FIX in v4 (index.html line-ref regression — the line-8 fix went the wrong direction; should ADD `:7` back rather than REPLACE it) + 8 SHOULD-FIX + 3 OPTIONAL. Round 3 synthesis explicitly recommends a v5 mechanical pass but NO round 4 (mechanical fixes don't introduce new claims). **v4 is foundation-correct in shape; v5 is needed before any downstream artifact cites it without caveats.**
- **Bridge multi-round value trend: HIGH → MEDIUM-HIGH → MEDIUM.** Round 1 changed v2's whole foundation (4 MUST-FIX, gate reordering, decision-space expansion). Round 2 caught structural + mechanical defects in v3 (matrix orthogonality, citation errors, sizing math, conditionality framing). Round 3 caught only mechanical defects in v4 (1 line-ref regression + 8 wording/precision fixes). **G2 (bridge-as-multi-round-quality-amplifier) is materially answered:** 3 rounds adds value at 3 different intensities; past round 3, diminishing returns are likely. The honest verdict for the PoC is "multi-round adds non-zero value through at least round 3 on substantive foundation documents."
- **Bridge Claude turn 1 is unreliable as a single reviewer — operational ceiling for autonomy.** 3 of 3 bridge rounds in this arc had Claude-turn-1 misses that Codex turn 2 caught: K1-1 worker.js self-own (round 1), K1-2 sizing math + C3 + C14 (round 2), K1-3 C4 ref + §7-§5 contradiction + C5 F-speculation (round 3). Pattern: turn 1 does dense per-row checks but is weak at cross-section composition + arithmetic + cross-project verification. The adversarial layer (Codex turn 2) is load-bearing — without it, all 3 rounds' caught items would have shipped.
- **Sandbox-pattern revelation: bridge invocation cwd controls Claude-turn-1 read sandbox scope.** The "3 of 3 sandbox-denial" pattern noted in ai-om/CLAUDE.md was assumed structural for 2 prior rounds; round 3 broke it cleanly when the cwd happened to be `Projects/` (wider git repo) instead of `Projects/3dprintassistant/` (narrow project tree). Bridge Claude turn 1's read sandbox follows cwd. Standing rule candidate for `bridge/CLAUDE.md`: invoke from `Projects/` for cross-project verification; invoke from `Projects/<project>/` for narrow scope or confidentiality-sensitive work. K3 component of K1-3 finding documents this.
- **iOS untouched (`c99a797`).** All session work is in `3dprintassistant/docs/resin-scaling/` (v4 replacement) + `ai-operating-model/docs/autonomy-poc-2026-05-resin/` (bridge rounds, analyses, K1 findings, scorecard) + `ai-operating-model/docs/findings/` (3 K1 finding files + INDEX prepends). No engine / data / UI / iOS changes per PoC charter. v1.0.4 → App Store review submission lane remains parked behind PoC pivot; owner-gated.

## What happened / Actions

1. **3dpa cold start** per Trigger C: read top-level CLAUDE.md (already loaded) → project CLAUDE.md → 3dpa-context.md → ROADMAP → sessions INDEX → last 3 logs (resin kickoff in full) → NEXT-SESSION (Path A locked) → PoC meta artifacts (charter, scorecard, round-1-analysis, owner-asks-queue) → problem-statement v3 in full. Self-check delivered.
2. **Owner direction confirmed at cold-start:** Path A only (bridge round 2 on v3). Cwd verified `Projects/3dprintassistant/` per scorecard auto-mitigation.
3. **Bridge round 2 launched in background** with detailed task prompt (in-scope/out-of-scope split, v3 §9 questions enumerated, Codex line-ref verification list, additional substantiation checks). Background process completed in 7 minutes (notably faster than round 1's 15m).
4. **Round 2 results processed.** 2 MUST-FIX + 6 SHOULD-FIX + 4 OPTIONAL accepted into round-2-analysis.md. Codex caught 3 things Claude turn 1 missed: C3 as 5th L row (sample-vs-enumerate failure), §5 sizing math "2 L + 2 M" → "1 L + 3 M" (arithmetic skipped), C14 line+count errors (Claude self-flagged unverified due to sandbox; Codex covered the gap).
5. **K1-2 filed** to ai-om/docs/findings/ with related-link to K1-1. INDEX prepended.
6. **PoC scorecard updated:** per-artifact row for round 2; per-bridge-round row for round 2; cumulative tallies; session-2 running notes (sandbox limitation 3rd occurrence; bridge wall-time variance; cwd discipline held; K1-2 filing pattern note).
7. **Owner-asks batched (Asks 5 + 6):** §7 matrix restructure shape (Option A decision tree / Option B expanded matrix / Option C other) + v4 timing (greenlight now full / partial / defer / pivot). Owner picked **Option A (decision tree) + Option 2 (full v4, this session)**.
8. **v4 problem-statement.md produced** in place at the same path (git diff = audit trail per §8 convention). Integrates:
   - MF-R2-1: §5 footnote rewritten with correct drift sources (web visible app.js:101/:107 + SEO index.html:8,14,20,30 + iOS app-store-metadata.md:40 + ground truth data/printers.json). C13 + C14 rows repointed.
   - MF-R2-2: §7 fully restructured as Option A decision tree — Step 1 (owner picks Gate 2) → Step 2 (5 branches: F/G bypass, A/B partial, D mixed-standalone-or-integrate, E sibling-favored, C decisive-on-Gate-1 with 3 sub-outcomes) → Step 3 (park rules + 4-week clock + 3 revisit-trigger candidates + no-3rd-extension rule) → Step 4 (success criterion).
   - SF-R2-1 → SF-R2-6: charter clock invocation, §5 "Fires if" column (15 rows backfilled), sum corrected to "1 L + 3 M", C6 → app.js:1037, §6 "dormant unless/until any public surface ships," C13 line-8 fold.
   - OPT-R2-2: §3 unknown #4 substantiation flag with 3 primary-source URLs.
9. **Asks 5 + 6 marked RESOLVED** in owner-asks-queue.md.
10. **Owner direction Q surfaced:** what's next this session? Owner picked **bridge round 3 on v4, then wrap.**
11. **Bridge round 3 launched in background.** Task prompt extended with (a) faithfulness-check of round-2 catch integration, (b) v4's own §9 open questions, (c) Codex-primary live-codebase verification, (d) additional pressure tests on Gate 1 relevance column + Step 3 revisit triggers + Step 2 estimates. Explicit anti-K1 instruction: "ENUMERATE FULL INVENTORIES when relevant (don't just sample) — round 2's K1 was that turn 1 missed C3 in a 4-row sample of L-rows." Background completed in 28 minutes.
12. **Round 3 results processed.** 1 MUST-FIX (`index.html:8` regression — v4 over-corrected v3) + 8 SHOULD-FIX (3 from Codex Claude missed: C4 ref `:68` is comment / struct at `:108`; §7 A/B "no engine work" vs §5 C1 "{A,B,C,D}" internal contradiction; C5 F-speculation in fires-if) + 3 OPTIONAL. 2 Claude-turn-1 catches downgraded by Codex (C6 borderline → OPT, broad-enumeration → narrowed/collapsed into MF1).
13. **Sandbox-pattern revelation surfaced inside round 3.** Bridge Claude turn 1 plan file explicitly noted cross-project iOS reads succeeded this round, contradicting the "3 of 3 denial" prior pattern. Inferred cause: cwd at bridge launch was `Projects/` (wider) instead of `Projects/3dprintassistant/` (narrower). Operational not structural.
14. **K1-3 filed** as combined K1 (3 more Claude-turn-1 misses) + K3 (sandbox-cwd revelation) finding. INDEX prepended. Scorecard updated with round-3 row + cumulative tallies.
15. **Trigger A wrap-up Phase 1 + 2 begun** in parallel: md-hygiene sweep, git status, findings sweep, this log, ai-om sibling log, INDEX prepends, ROADMAP touch, NEXT-SESSION regen.

## Files touched

**Modified:**
- `docs/resin-scaling/problem-statement.md` — v3 → v4 in-place rewrite (~750 lines)
- `docs/planning/ROADMAP.md` — Active Work Queue resin entry update (pending in this close)
- `docs/sessions/INDEX.md` — prepend bullet for this session (pending in this close)
- `docs/sessions/NEXT-SESSION.md` — regen per Trigger A (pending in this close)

**Untracked at close (will be committed by wrap-up):**
- `docs/sessions/2026-05-17-cowork-appdev-resin-bridge-r2-r3-v4.md` — this log

**ai-om side (parallel close — see sibling ai-om session log for full detail):**
- 3 new files in `ai-operating-model/docs/autonomy-poc-2026-05-resin/bridge-rounds/` (bridge-2026-05-17-191217-933177.md, round-2-analysis.md, bridge-2026-05-17-194011-562041.md, round-3-analysis.md — 4 total)
- 2 new files in `ai-operating-model/docs/findings/` (K1-2 + K1-3)
- Modified: scorecard.md (3 update passes), findings/INDEX.md (2 prepends), owner-asks-queue.md (Asks 5+6 + their resolutions)

**Deleted:** none.

**iOS:** untouched (`c99a797`).

## Commits

- Pending Trigger A wrap commit (this session-close) on 3dpa: v4 problem-statement.md + this log + INDEX prepend + ROADMAP touch + NEXT-SESSION regen. Single commit.
- Parallel ai-om wrap commit: 4 bridge-rounds files + 2 findings + scorecard + INDEX + owner-asks-queue + ai-om session log + ai-om INDEX prepend. Single commit.
- Auto-sync may have made intermediate commits during the session — those are fine and the wrap commit will be additive.

**iOS push gate:** untouched; held (v1.0.4 still parked behind PoC).

## Open questions / Follow-up

- **Open finding: K1-3 mitigation pending owner direction.** Charter says "mitigate on recurrence at N=2" — N=2 reached on the broader K1 pattern (Claude turn 1 unreliable as single reviewer). Two mitigation philosophies: (a) heavy — patch bridge.py's Claude-turn-1 prompt to require cross-section composition + arithmetic + enumeration discipline; (b) light — accept the gap, depend on Codex turn 2 + controller follow-up (what the bridge shape is designed for). Controller leans (b); owner decides at next session.
- **Open finding: K1-3 K3 component — sandbox-cwd contract.** Mitigation candidate is a standing rule in `bridge/CLAUDE.md` (10-min edit). Worth landing before next bridge invocation so cross-project scope is deliberate rather than accidental.
- **v5 mechanical pass queued.** 1 MUST-FIX + 8 SHOULD-FIX + 3 OPTIONAL. Estimated ~30 min editing; no bridge round 4 needed per round-3 synthesis (mechanical fixes don't introduce new claims).
- **Gate 1 work (`technical-differences.md`) is the substantive next PoC step** after v5 (or after MF-R3-1 is logged as known caveat if owner skips v5).
- **Codex-vs-Codex disagreement on C4 line ref** between rounds 2 + 3 (round 2 Codex confirmed `EngineService.swift:68` as EXACT; round 3 Codex flagged `:68` as just a comment, struct at `:108`). Minor data point but worth noting — "Codex confirmed EXACT" should read as "at this time, with this precision standard," not "definitively correct across all future passes."
- **Md-hygiene findings:** none surfaced this session. Protocol-file drift check `diff -u CLAUDE.md AGENTS.md` returned no output (no drift). No root .md stubs, no untracked .md beyond intentional new bridge-rounds + findings + session logs, no secrets, no buried durable content (this log + v4 §2 + round-3-analysis capture the load-bearing reframes + ceiling findings).
- **v1.0.4 → App Store review submission** remains parked behind PoC; owner-gated whenever PoC reaches a natural pause.

## Next session

**Two viable openers — owner-pick at cold-start.** Per the K3 component of K1-3, would also be worth landing the `bridge/CLAUDE.md` cwd-scope standing rule first (~10 min mechanical edit; reduces risk of accidental narrow-scope on next bridge invocation).

1. **v5 mechanical pass on problem-statement.md** (~30 min) — addresses MF-R3-1 + 8 SHOULD-FIX from round 3. No bridge round 4 needed per synthesis.
2. **Skip v5, start Gate 1 (`technical-differences.md`) desk research** — log MF-R3-1 as known caveat; downstream artifact accepts inheriting the citation error.
3. **Optional preamble:** update `bridge/CLAUDE.md` with the cwd-scope standing rule from K1-3's K3 component (~10 min) — locks in the operational learning before next bridge invocation.

NEXT-SESSION.md regenerated with the above three options + supporting context.
