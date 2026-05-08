# 2026-04-30 — Cowork (appdev): AI collaboration pilot v1 shipped

## Durable context

- **`docs/ai-collab.md` is the v1 operating model for AI-assisted work on this repo.** Single file, ~280 lines, no new directories. Authoritative for "when do we escalate to Codex," "what's the review packet," "how do disagreements resolve," "what's the scorecard." Read this before any Codex review on 3dpa.
- **Pilot lives on branch `ai/operating-model-pilot`.** Already 2 commits ahead of `main` after this session (`dece4a2` review trail + `b453098` ai-collab.md). Mustafa created the branch in advance — the pilot runs on the branch by design. **Do not merge to `main` until end-of-pilot decision (2026-05-14).** End-of-pilot decision matrix is in ai-collab.md § Pilot.
- **First Codex review queued: DQ-3 scraper architecture decision** ("PA emission stub vs. scraper-first" at [`NEXT-SESSION.md`](NEXT-SESSION.md) line 84). Real two-option design moment. Use the review packet template from ai-collab.md. Log scorecard back into the relevant session log under a `## Codex review scorecard` block.
- **Meta-track lives at `Projects/ai-operating-model/`.** That project doesn't replicate the rules — they stay here in 3dpa. The meta-track is for evolution, end-of-pilot decisions, future cross-project rules. New project tokens: `ai-om` / `ai-operating-model` / `aiom`.
- **The 4-round multi-tool review pattern itself is the proof case.** ChatGPT proposed → Claude Code v1 (cold) → Claude Code v2 (with discovery context) → ChatGPT v2 (concession + 10 missed items) → Claude Code v3 (synthesis) → ChatGPT v3 (adoption). Each round materially improved the previous. The review trail under `ai-handoffs/` is preserved as evidence for the end-of-pilot evaluation.

## What happened / Actions

This was a meta-work session, not a code-work session. No `engine.js` or `data/*.json` changes; no walkthrough harness or XCTest runs.

1. **Cold start across 5 contexts** (3dpa web + iOS, Accountant, File Manager Assistant, vault). Confirmed Phase DQ 2/5; v1.0.2 live worldwide; next planned target was DQ-3.
2. **Read ChatGPT operating-model proposal** at `ai-handoffs/2026-04-30-chatgpt-ai-operating-model-discovery-summary.md` (already committed as `5b70291` before session start).
3. **Wrote Claude Code v1 feedback** — cold review without discovery transcript.
4. **Mustafa supplied original ChatGPT discovery transcript.** Wrote v2 with three reversals (insecurity factor underweighted, 3dpa is right pilot for verifiability, NotebookLM has more value). Held 4 other points.
5. **Drafted ChatGPT review prompt.** Mustafa came back with ChatGPT v2 reply — substantial concession + 10 missed items + 4 amendments.
6. **Wrote Claude Code v3** — synthesis with 8 explicit acknowledgments to ChatGPT v2, 10 v3 refinements (named first experiment target as DQ-3 scraper-vs-stub at NEXT-SESSION.md:84, scorecard control variables, memory integration, time-pressure + reversibility on review packet, specific confidentiality rule, tool/role overlap, pilot tiebreaker, named consulting follow-on, friction guardrail, operating-model-becomes-the-work failure mode). Embedded full proposed `docs/ai-collab.md` (~150 lines).
7. **ChatGPT v3 response = convergence.** 4 small operational amendments (validate paths, scorecard lightweight, single branch bundle in week 2, memory entries only generalizable). All baked into final file. Plus implementation prompt: create `docs/ai-collab.md`, validate paths, commit.
8. **Validated paths** in v3's content vs. actual repo structure. Found 4 corrections needed (Obsidian vault path needed `../../../`, ai-handoffs needed `../`, NEXT-SESSION line ref handled as prose, top-level CLAUDE.md target made explicit).
9. **Created `docs/ai-collab.md`** with corrected paths and ChatGPT amendments absorbed inline.
10. **Committed in two passes:**
    - `dece4a2` — `docs: add AI operating-model review trail (v1 → v2 → ChatGPT v2 → v3 → adoption)` (6 files: full reasoning trail)
    - `b453098` — `docs: add lightweight AI collaboration pilot` (1 file: `docs/ai-collab.md`)
11. **Established meta-track project** at `Projects/ai-operating-model/` per Mustafa's ask. CLAUDE.md with cold-start + fresh-session + wrap-up procedures, README, seeded INDEX, today's session log there too.
12. **Updated top-level `Projects/CLAUDE.md`** + memory index for the new project token.

## Files touched

**Created (this repo, committed):**
- `docs/ai-collab.md` — operating model v1 (commit `b453098`)

**Created (this repo, committed in earlier session today as `5b70291`, then 6 more in this session as `dece4a2`):**
- `ai-handoffs/2026-04-30-chatgpt-ai-operating-model-discovery-summary.md` (`5b70291`, pre-session)
- `ai-handoffs/2026-04-30-claude-code-feedback.md` (v1)
- `ai-handoffs/2026-04-30-claude-code-feedback-v2.md` (v2)
- `ai-handoffs/2026-04-30-chatgpt-feedback-v2.md`
- `ai-handoffs/2026-04-30-claude-code-feedback-v3.md` (v3)
- `ai-handoffs/2026-04-30-chatgpt-response-to-claude-code-v3.md`
- `ai-handoffs/2026-04-30-claude-code-implementation-prompt.md`

**Created (other locations):**
- `Projects/ai-operating-model/CLAUDE.md`
- `Projects/ai-operating-model/README.md`
- `Projects/ai-operating-model/docs/sessions/INDEX.md`
- `Projects/ai-operating-model/docs/sessions/2026-04-30-project-established-pilot-v1.md`

**Modified (top-level):**
- `Projects/CLAUDE.md` — Active Projects table + project token table
- `~/.claude/projects/.../memory/MEMORY.md` — index entry
- `~/.claude/projects/.../memory/project_ai_operating_model.md` — new

**Untracked (3dpa repo) at session end:** none.

## Commits

On branch `ai/operating-model-pilot` (NOT `main` — pilot runs on branch by design):
- `dece4a2` — `docs: add AI operating-model review trail (v1 → v2 → ChatGPT v2 → v3 → adoption)`
- `b453098` — `docs: add lightweight AI collaboration pilot`

Both commits are local-only; remote `origin/ai/operating-model-pilot` is at the pre-session state.

## Open questions / owner asks

- **Push branch to remote?** Local-only currently. Web push is ungated. Confirm if you want them pushed now.
- **Merge strategy at pilot end (2026-05-14):** keep branch, fast-forward merge, squash-merge, or PR-and-merge? The decision itself is part of the pilot evaluation (does the branch workflow add enough confidence to justify retention?).
- **First Codex review timing:** scope locked (DQ-3 scraper-vs-stub at NEXT-SESSION.md:84). Confirm when to run — today, next session, or coordinated with actually starting DQ-3 implementation.
- **Stray PNG files at repo root** (`enoglekort_logo.png`, `mockup_e_nøglekort.png`) — flagged on 2026-04-27 as belonging to a different project (e-nøglekort). Still untracked in repo root. Owner action still open: delete / move / commit?
- **NEXT-SESSION.md is owner-triggered.** Not regenerated this session. The current content (DQ-3 cold-start prompt) is still valid as the next-real-work target.

## Vault sweep

Per the vault-sweep checklist:

- **Strategic decision worth propagating:** YES — the multi-tool 4-round review pattern is a durable working-method insight that fits `Obsidian Vault/20-Areas/Development/toolchain.md`. Same proposal lands in the `ai-operating-model/` session log (single propagation, two cross-references).
- **New shorthand / term:** YES — `ai-om` / `ai-operating-model` / `aiom` as new project tokens. Already in top-level CLAUDE.md token table + memory. No additional vault action needed.
- **Cross-project pattern:** the "operating-model rules live with each project, meta-track at `ai-operating-model/`" architecture is itself a cross-project decision. Same toolchain.md propagation.
- **Hobby observation:** none.
- **Consulting insight:** consulting-track operating model will be opened post-pilot (after 2026-05-14). Vault-primary destination TBD when it lands. Pre-flag at `Obsidian Vault/20-Areas/Consulting/` only if Mustafa wants the forward pointer.
- **External source to ingest:** none.

Net: one toolchain.md note worth proposing; nothing strictly required.

## Md-hygiene sweep

1. **Root-level stubs:** none introduced.
2. **Untracked but should-be-tracked:** all in-session creations were committed. Stray `enoglekort_logo.png` + `mockup_e_nøglekort.png` still untracked at 3dpa root from prior session — not new finding.
3. **Secrets in tree:** none.
4. **Content buried in session log:** the v3 + ChatGPT v3 docs are dense, but their durable distillation is `docs/ai-collab.md` itself. No further promotion needed.
5. **Stale ROADMAP sections:** ROADMAP not touched. Operating model is operational, not feature work — no stale risk introduced.
6. **Duplicate specs:** none. Rules live in exactly one place (`docs/ai-collab.md`); cross-references from meta-track and CLAUDE.md are pointers.

No new findings.

## Next session

- **If first Codex review on DQ-3:** use the review packet template + default framing from `docs/ai-collab.md`. Log scorecard in the session log under a `## Codex review scorecard` block. Cross-link back to `ai-operating-model/docs/sessions/` if the review surfaces a generalizable lesson.
- **DQ-3 work itself** continues per `NEXT-SESSION.md` (still valid). The Codex review happens *before* implementation, on the design choice itself.
- **End-of-pilot decision (2026-05-14)** lands at `ai-operating-model/docs/sessions/2026-05-14-pilot-decision.md`, with branch merge decision as part of it.
