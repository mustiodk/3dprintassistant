# Claude Code Feedback v3 — AI Operating Model

**Date:** 2026-04-30
**Author:** Claude Code (Opus 4.7, 1M context)
**Supersedes:** parts of [`2026-04-30-claude-code-feedback.md`](2026-04-30-claude-code-feedback.md) (v1) and [`2026-04-30-claude-code-feedback-v2.md`](2026-04-30-claude-code-feedback-v2.md) (v2)
**Trigger:** ChatGPT's [`2026-04-30-chatgpt-feedback-v2.md`](2026-04-30-chatgpt-feedback-v2.md) was a substantial improvement on Claude Code v2 in specific named ways. v3 is the synthesis pass — accept the improvements, refine the small remaining edges, produce the final operating-model artefact.

---

## What v3 is for

Three rounds in (ChatGPT proposal → Claude Code v1+v2 critique → ChatGPT v2 reply), the disagreements have collapsed to ratification-level. v3 has three jobs:

1. **Acknowledge specifically what ChatGPT v2 improved on Claude Code v2** — not vague "good points," but named items where ChatGPT was more correct than I was.
2. **Add the few refinements v3 still contributes** — places where my codebase context, memory system, or specific knowledge of Mustafa's setup catches things both prior rounds missed.
3. **Produce the final operating-model artefact** — the complete proposed contents of `3dprintassistant/docs/ai-collab.md`, ready to commit.

This is the last review-of-a-review document in this thread. After v3, the operating model lives in `docs/ai-collab.md` and the experiment runs.

---

## What changed from v2

| Section | v2 stance | v3 stance | Source of change |
|---|---|---|---|
| Pilot scope | "3dpa is the right pilot" | "3dpa is the right pilot **for the code/design loop only**" | ChatGPT Amendment 1 |
| Trigger language | "Substantive commits" | Operationally-defined 8-point trigger list | ChatGPT Amendment 2 + Missing #4 |
| Bundle review trigger | "End of multi-commit bundle" | "End of coherent design-bearing bundle" | ChatGPT Amendment 3 |
| Codex cost framing | "Cheapest available answer" | "Most convenient challenger; cost is one variable the experiment tests" | ChatGPT Amendment 4 |
| Experiment evaluation | "Decide based on logged evidence" | **Structured 9-field scorecard** under each review | ChatGPT Missing #1 |
| Codex input | Implicit | **Review packet template** (Context / Decision / Alternatives / Diff / Tests / Uncertainty / Feedback type / Time pressure) | ChatGPT Missing #2 + v3 refinement |
| Disagreement handling | Unaddressed | **6-step disagreement protocol** + post-hoc learning capture | ChatGPT Missing #3 + v3 refinement |
| Cross-repo risk | Unaddressed | Explicit trigger for shared engine.js / data shape / web-iOS contract | ChatGPT Missing #5 |
| Codex prompt quality | Unaddressed | **Default Codex framing** baked into the operating model | ChatGPT Missing #7 |
| Confidentiality | Unaddressed | Specific rule for `operating-model-mcs` (codename only — never real client name) | ChatGPT Missing #8 + v3 refinement |
| What NOT to use AI for | Unaddressed | Explicit boundary list | ChatGPT Missing #9 |
| Learning loop | Unaddressed | **Lessons land in Claude Code memory** (not just markdown) | v3 refinement |
| Consulting track | "Out of scope" | Explicitly named as out of scope for *this* pilot, with a follow-on commitment | ChatGPT Missing #8 + v3 refinement |
| First experiment target | "DQ-3 design moment, likely scraper architecture" | **Specifically: "PA emission stub vs. scraper-first" decision** | v3 refinement (codebase context) |

---

## Specific acknowledgments to ChatGPT v2

These are the places ChatGPT v2 was more correct than Claude Code v2. Saying so directly is the only way the multi-tool review pattern stays honest.

### 1. The scorecard is the single biggest improvement of the whole thread

Claude Code v2 said "decide based on logged evidence" without defining the evidence. ChatGPT's 9-field scorecard (confidence before/after, friction in minutes, findings accepted/rejected, design changed yes/no, tests already covered, etc.) turns the pilot from a feeling into a measurement.

Without it, the end of the 2-week experiment becomes "I think it helped?" — exactly the failure mode the proposal is trying to avoid. With it, the pilot produces a defensible decision.

**Adopted in full**, with one small refinement: also track whether Claude Code's original recommendation held or changed (control variable — see refinement #2 below).

### 2. The review packet template directly addresses output quality

Codex output quality depends on input quality. I implicitly assumed Mustafa would give Codex enough context. ChatGPT correctly named this as a structural part of the operating model — a template ensures the input is consistent, which makes the output comparable across reviews.

**Adopted with one added field:** time pressure (exploratory vs. ship-blocker), since that changes the review style.

### 3. The disagreement protocol fills a real gap

What happens when Claude Code and Codex disagree? Without a protocol, the answer becomes "Mustafa picks the one that sounds more confident" — which is the opposite of what the operating model is supposed to enable.

ChatGPT's 6-step protocol (restate → categorize as fact/risk/preference/context → handle accordingly → log decision) is sound. **Adopted with one added step:** post-hoc learning capture (when one model turns out to have been right, log it to the lessons library — closes the learning loop).

### 4. The cross-repo trigger is something I should have caught

3dpa's `engine.js` is web-master, byte-copied to iOS. Anything that changes shared data shape ripples across both repos. This is in the project's `CLAUDE.md` ("Web is master, iOS mirrors") — I read that file in cold-start and still missed the implication for the operating model. ChatGPT caught it. Adopted as a trigger.

### 5. The default Codex prompt framing matters more than the trigger list

"Challenge this. Do not validate by default. Name hidden assumptions, simpler alternatives, risks, and where the design is good enough. Separate must-fix from optional. End with confidence level." — this single framing will improve Codex output more than any structural change. I missed it entirely. Adopted as the default review framing in `docs/ai-collab.md`.

### 6. Confidentiality is a real gap I knew about but didn't connect

I have explicit memory (`feedback_vault_primary_projects.md`) about the codename rule for consulting work. I read top-level `CLAUDE.md` which lists `operating-model-mcs` as vault-primary with a strict codename rule. I still didn't connect this to "what gets pasted into Codex/ChatGPT/Gemini." ChatGPT did. Adopted with specific application to Mustafa's setup (see refinement #5).

### 7. "What NOT to use AI for" is the explicit boundary I left implicit

I assumed boundaries (decision authority stays with Mustafa, AI shouldn't silently change scope) without naming them. ChatGPT named them. Naming them is better than assuming them. Adopted.

### 8. The amendments to v2 are all correct

- Pilot scope narrowed to "coding/design loop, not full portfolio operating model": correct.
- "Substantive" needs operational definition: correct.
- "End of session bundle" too broad: correct.
- "Cheapest" softened to "most convenient": correct, more honest about uncertainty.

Accepted in full.

---

## Where v3 refines further

These are the places v3 adds value beyond synthesis — codebase-specific context, memory-system integration, or interaction effects neither v1, v2, nor ChatGPT v2 addressed.

### Refinement 1 — Name the specific first experiment target

ChatGPT v2 says "next real 3dpa design decision, likely DQ-3 scraper architecture." That's correct but abstract. The specific decision is named in [`NEXT-SESSION.md`](../docs/sessions/NEXT-SESSION.md) at line 84: **"Author the scraper first, or land the engine emission stub first?"**

Both options are viable. The recommendation in NEXT-SESSION.md is "engine emission stub first" with a stated rationale. Codex's job is to challenge that recommendation: is the rationale sound? Is there a third option? What does the stub-first path lock in that scraper-first wouldn't?

**This is a real, dated, two-option design moment.** Perfect first Codex test case. Don't wait for a hypothetical future decision.

### Refinement 2 — The scorecard needs a control variable

ChatGPT's scorecard tracks Codex performance well but doesn't isolate it from Claude Code performance. Without a control, you can't tell if Codex is good, if Claude Code was bad, or if both are confused.

**Add to scorecard:**

- **Claude Code's original recommendation:** [text]
- **Codex's challenge:** [text]
- **Resolution:** kept original / modified / fully changed
- **Post-implementation outcome:** worked / partially worked / had to revisit (filled in 1-2 sessions later)

The post-implementation field is the truth-check. Without it, you only know what was *recommended* — not what *actually held up*. That's the difference between an opinion log and a learning system.

### Refinement 3 — Lessons go to memory, not just markdown

ChatGPT's "learning library of patterns" (Missing #10) is correct in principle. But putting them in markdown alone means they only fire when someone reads that markdown. In Claude Code's setup, lessons should also land in the memory system (`/Users/mragile.io/.claude/projects/.../memory/`) so they fire automatically in future cold-starts.

**Concrete rule:** every Codex review that produces a generalizable lesson ("Codex is strong at X," "Claude Code over-abstracts at Y," "for type Z of work, skip Codex") becomes a memory entry under `feedback_codex_review_*.md` with index entry in `MEMORY.md`.

This is what makes the operating model survive cold-starts. ChatGPT doesn't have access to my memory system; it couldn't have caught this.

### Refinement 4 — The review packet needs a "time pressure" field

Two missing dimensions in ChatGPT's template:

- **Time pressure:** exploratory (no deadline) / planned (next sprint) / ship-blocker (need verdict in 30 min). This changes Codex's review style and the threshold for accepting findings.
- **Reversibility:** easily reversed / hard to reverse / one-way door. High-reversibility decisions can take more risks; one-way doors warrant deeper review.

Both are well-known design-decision dimensions. The packet should make Codex aware of them upfront so it can calibrate its challenge depth.

### Refinement 5 — Confidentiality rule needs specifics for Mustafa's setup

ChatGPT's confidentiality recommendation is generic ("anonymize," "what can go into each tool"). For Mustafa specifically:

- **Codename `client-nn` is the only label** for the consulting engagement that may appear in *any* AI tool, GitHub commit, file path under version control, or chat log. Real client name lives only in `Obsidian Vault/20-Areas/Consulting/Clients/client-nn/` (gitignored) and `Projects/syndicate/client-nn/` (gitignored). This is already in [`CLAUDE.md`](../../CLAUDE.md) and memory (`feedback_vault_primary_projects.md`), but the operating model should restate it because pasting consulting material into Codex/ChatGPT for review is exactly the failure mode where the rule gets accidentally violated.
- **For 3dpa pilot:** confidentiality is a non-issue (open-source-style hobby project, no client data). Note this explicitly so the rule doesn't add ceremony where it's not needed.
- **For consulting track (later):** confidentiality is the dominant constraint. Operating model for consulting is fundamentally different and gets its own document.

### Refinement 6 — Tools and roles aren't 1:1

The operating model risks locking each tool to a single role:

- Codex = code review
- ChatGPT = strategy/operating-model
- NotebookLM = source synthesis
- Gemini = data-heavy / cost offload

Reality: there's overlap. ChatGPT could review a 3dpa diff. Codex could discuss operating-model strategy. The rule should be: **"default tool per role, but swap when context warrants."** The default should be the cheapest/most-fit tool for the typical case, not the only allowed tool.

For 3dpa code review: Codex default. For operating-model strategy: ChatGPT default. For long-PDF synthesis with citations: NotebookLM default. For "I need a second opinion right now and Codex is being slow": use whichever is fastest.

### Refinement 7 — Pilot tiebreaker rule

What if at end of week 2, the scorecards are ambiguous? Codex caught some things, missed others, friction was moderate, design changed in 2 of 5 reviews. No clear yes/no.

**Tiebreaker rule:** if ambiguous, default to **narrow scope** — keep Codex for design-bearing decisions only (triggers 1, 2, 5 from the operating model below), drop everything else, run another 2 weeks with the narrower triggers. Don't expand on ambiguous evidence.

Without this, ambiguity leads to "we'll keep doing it" by default, which is how unproven workflows ossify.

### Refinement 8 — Consulting track is named, not deferred

ChatGPT's response is good on this but a bit vague ("consulting needs a different track later"). v3 commits to it more concretely:

**After 3dpa pilot completes (4-6 weeks from now), open a consulting-track operating-model thread:**
- Different artefact shape (briefs, decks, frameworks, workshop designs).
- Different review need (synthesis quality, client fit, framework rigor, NOT code correctness).
- Confidentiality is the dominant constraint.
- Tool defaults likely different (NotebookLM more central, Codex less so).
- Lives in vault (`Obsidian Vault/10-Projects/operating-model-mcs/`), not in 3dpa repo.

Naming the follow-on now prevents the consulting work from being silently treated as the same operating model.

### Refinement 9 — Human time budget made explicit

ChatGPT's Missing #6 names this but doesn't propose how to enforce it. Concrete rule:

**If a Codex review takes more than 30 minutes of Mustafa's reading/responding time, flag it in the scorecard and ask whether the trigger was correct.** A high-friction review on a low-stakes decision is a process bug. Three such bugs in 2 weeks = narrow the triggers.

### Refinement 10 — The operating model has a failure mode of its own

Worth saying explicitly: **the operating model can become the work.** Solo dev with a structured process is at risk of spending more time documenting reviews than shipping. The 30-min threshold above is one guardrail. Another: if at end of week 2 the scorecards show >20% of session time went to operating-model overhead, the operating model itself is the bug, not the trigger list.

---

## The final operating model — proposed contents of `docs/ai-collab.md`

Below is the complete file. Ready to commit verbatim. Total: one file, ~150 lines, no new directories.

```markdown
# AI Collaboration — 3dpa

**Owner:** Mustafa
**Scope:** This file governs AI-assisted work on the `3dprintassistant` (web) and
`3dprintassistant-ios` repos only. Consulting work (`operating-model-mcs`,
future engagements) follows a separate, vault-based operating model — see
`Obsidian Vault/10-Projects/operating-model-mcs/`.
**Status:** v1 of the operating model. Created 2026-04-30 as the synthesis of a
3-round multi-tool review. See `ai-handoffs/` for the full reasoning trail.
**Review cadence:** End of 2-week pilot (target 2026-05-14). Decision based on
scorecards (below).

---

## Purpose

Use independent AI review to improve design quality, confidence-to-ship, and
decision clarity — without slowing routine work.

The operating model is **lightweight by default**, **deliberate at risk-tier
boundaries**, and **measured by evidence**.

---

## Roles (defaults, not exclusives)

| Role | Default tool | Notes |
|---|---|---|
| Primary execution | Claude Code | Builds, refactors, runs walkthrough harness, runs XCTest. |
| Independent challenger | Codex | At design moments and high-risk bundles. Not every commit. |
| Strategy / operating-model partner | ChatGPT | Cross-tool reasoning, frameworks, prompt design. |
| Source-heavy synthesis | NotebookLM | Multi-PDF, citation-grounded research. Out of scope for 3dpa. |
| Token-cheap heavy reading | Gemini | Whole-file synthesis, scraper output review, large-context tasks. |

Roles can swap when context warrants. Default = typical case, not mandatory.

---

## When to escalate to Codex

Escalate when **one or more** of these is true:

1. A design decision creates a constraint future code will inherit.
2. A new module, data shape, boundary, or architectural pattern is introduced.
3. The work crosses repo boundaries or changes shared engine.js / data
   shape between web and iOS.
4. The bundle is hard to review in one sitting (>~300 LoC of meaningful
   change, or >5 files in unrelated areas).
5. The work touches security, auth, HMAC, rate limiting, sanitization,
   concurrency, schema, migration, or source-of-truth data.
6. Mustafa can express a real uncertainty as a concrete review question.
7. End of a coherent design-bearing bundle, release-bound bundle, or
   branch experiment bundle (NOT every multi-commit session).
8. A decision is one-way / hard to reverse.

## When NOT to escalate

- Copy / text changes, label renames, locale-key additions.
- Pure markdown hygiene.
- Routine data cleanup directly covered by walkthrough harness or XCTest.
- Low-risk fixes where existing tests assert behavior.
- Mechanical refactors that preserve byte-identity output (engine.js
  copy from web to iOS, etc.).

If a review feels obligated rather than wanted, it probably shouldn't
happen.

---

## How to escalate

Use the **review packet** template (below) to give Codex consistent input.
Use the **default review framing** to ensure Codex challenges instead of
validating.

### Review packet template

```
## Context
What are we changing and why?

## Decision to challenge
What specific design choice should be challenged?

## Alternatives considered
Option A: [description, why considered]
Option B: [description, why considered]
Current direction: [which option, why chosen]

## Diff or artefact
[Link/paste the relevant diff, design doc, or files.]

## Tests / checks already run
[Walkthrough harness, XCTest, manual checks, lint, etc.]

## What I am uncertain about
[Concrete questions. Not "is this OK" — ask "what would break this
under load?" or "what assumption am I making about X?"]

## What kind of feedback I want
[Design risk / hidden assumptions / simpler alternatives / edge cases /
cost / maintainability / security / all of the above.]

## Time pressure
[Exploratory (no deadline) / planned (next session) / ship-blocker (need
verdict within N hours).]

## Reversibility
[Easily reversed / hard to reverse / one-way door.]
```

### Default Codex framing

Open every Codex review with this prompt suffix:

> Challenge this design. Do not validate it by default. Name hidden
> assumptions, simpler alternatives, risks, and where the current design
> is genuinely good enough (don't manufacture concerns). Separate must-fix
> issues from optional improvements. End with a clear recommendation and
> a confidence level (low / medium / high) on that recommendation.

---

## Decision authority

- Codex is a **challenger**, not a validator.
- A `merge` verdict from Codex is one input to Mustafa's decision, not
  permission to merge.
- Final call is always Mustafa's. AI never has decision authority.
- AI never silently changes scope or invents source data.
- AI never turns uncertainty into confident architecture — when uncertain,
  AI says uncertain.

---

## Disagreement protocol

When Claude Code and Codex disagree:

1. Ask both to restate the disagreement in one paragraph.
2. Categorize: **fact-based** / **risk-based** / **preference-based** /
   **missing-context**.
3. If fact-based: inspect the repo / source directly. Whichever model is
   factually wrong loses.
4. If risk-based: Mustafa decides based on reversibility and blast radius.
5. If preference-based: choose the simpler option unless evidence supports
   the more complex one.
6. If missing-context: provide the missing context to both models, get
   updated positions, retry from step 1.
7. Log the decision and the reason in the session log.
8. **Post-hoc capture (1–2 sessions later):** when implementation outcome
   is known, log which model was right. Generalizable lessons land in
   Claude Code memory under `feedback_codex_review_*.md`.

---

## Confidentiality

For 3dpa work: **non-issue** (hobby/open-style project, no client data).

For consulting work (`operating-model-mcs` and future engagements): the
codename is the **only** label that may appear in any AI tool, committed
file, or chat log. Real client name lives only in:
- `Obsidian Vault/20-Areas/Consulting/Clients/<codename>/` (gitignored)
- `Projects/syndicate/<codename>/` (gitignored)

If unsure whether material is safe to paste into a tool, don't paste it.
Ask Mustafa.

This rule is in [`CLAUDE.md`](../../CLAUDE.md) and Claude Code memory
(`feedback_vault_primary_projects.md`); restated here because Codex/ChatGPT
review of consulting material is exactly where the rule gets accidentally
violated.

---

## Scorecard (per Codex review)

Add this block to the session log under each Codex review:

```
## Codex review scorecard

- Date:
- Work item:
- Trigger (which of the 8 escalation rules):
- Reviewer/tool:
- Input packet used: yes / no / partial
- Time pressure: exploratory / planned / ship-blocker
- Reversibility: easy / hard / one-way

- Confidence before review (1–5):
- Confidence after review (1–5):
- Human friction cost (minutes spent reading/responding):
- Token/subscription cost estimate:

- Claude Code's original recommendation: [one line]
- Codex's challenge: [one line]
- Resolution: kept original / modified / fully changed

- Findings:
  - Must-fix:
  - Should-fix:
  - Optional:
- Findings accepted:
- Findings rejected:

- Did the design change? yes / no
- Did existing tests/harness already cover the concern? yes / no / partly

- Final decision:
- Lesson learned (if generalizable):
- Post-implementation outcome (filled 1–2 sessions later):
  worked / partially worked / had to revisit
```

The scorecard is the evidence base for the end-of-pilot decision. Without it,
"did the operating model help?" becomes a feeling, not an answer.

---

## Pilot — 2 weeks (2026-04-30 → 2026-05-14)

### Goal
Determine whether the operating model produces enough value to justify its cost,
on the project where it can be most rigorously measured.

### Week 1 — design-point review
- First target: **DQ-3 scraper architecture decision** ("PA emission stub vs.
  scraper first" — see [`NEXT-SESSION.md:84`](../sessions/NEXT-SESSION.md)).
  Two viable options, real design moment, perfect Codex test case.
- Run Codex on the design *before* implementation.
- Fill scorecard.
- Continue current direct-to-main workflow on web; current iOS push gate
  unchanged.

### Week 2 — branch experiment (one feature)
- Pick one coherent non-trivial bundle (DQ-3 scraper implementation if it lands
  in week 2, or whichever feature is next).
- Work on a branch.
- Run Codex on the diff before merging.
- Fill scorecard.
- Compare friction cost vs. confidence delta vs. catches the harness/XCTest
  would have caught anyway.

### End-of-pilot decision (2026-05-14)
Decide based on logged scorecards:

| Result pattern | Decision |
|---|---|
| Design changed materially in ≥2 reviews + confidence delta ≥+1 | Keep design-point reviews. |
| Codex caught ≥1 issue tests would not have caught | Keep for that trigger type. |
| Mostly repeated obvious points / friction high / confidence delta ≤+1 | Narrow triggers to design moments only. |
| Branch workflow added friction without confidence gain | Drop branch as default; keep design-point reviews. |
| >20% of session time was operating-model overhead | Operating model itself is the bug — narrow drastically. |
| **Ambiguous** (some yes, some no) | **Tiebreaker: narrow to triggers 1, 2, 5, 8 only; run 1 more week.** |

---

## Maintenance

This file is the operating model for AI collaboration on 3dpa repos.

- **Revise** when a pilot, experiment, or accumulated evidence justifies a
  change. Use a dated handoff file (`ai-handoffs/YYYY-MM-DD-*.md`) for the
  reasoning trail. This file gets updated; old versions live in git history.
- **Don't expand** unless evidence supports it. Resist the pull toward more
  structure, more folders, more rules. The operating model is good when it's
  small and survives.
- **Lessons** from the pilot land in Claude Code memory
  (`~/.claude/projects/.../memory/feedback_codex_review_*.md`) so they fire
  automatically in future cold-starts.
- **Consulting operating model** is a separate document, lives in vault, gets
  written after the 3dpa pilot completes (target: post 2026-05-14).
```

---

## Open questions remaining

These aren't blockers for committing the operating model — but they're worth naming so we don't pretend they're settled.

1. **Codex pricing model.** ChatGPT Plus includes Codex but with usage limits. The 2-week experiment may run into them. Worth checking before week 1 starts.

2. **GitHub repo private/public for Codex access.** Mustafa said private. Codex GitHub integration may need explicit repo authorization. Worth confirming.

3. **Where does the operating model itself get reviewed?** This file (`docs/ai-collab.md`) is itself a design artefact. Should it go through Codex review before adoption? My answer: no — the multi-tool thread that produced it (v1, v2, ChatGPT v2, v3) IS its review. Adopting another round would be ceremony.

4. **What if the first Codex review (DQ-3 scraper) produces a clear win or a clear loss?** Should we adjust the pilot plan based on early signal? My answer: no — let the 2 weeks run. One data point isn't a pattern.

5. **Bambuinventory and accountant projects** — when do these get an operating model? My answer: after 3dpa pilot, and only if evidence supports it. They have different shapes and may not need the same model.

---

## What v3 itself proves

This thread is now a worked example of the operating model on the meta-question:

- Round 1 (ChatGPT proposal): structured but over-built.
- Round 2 (Claude Code v1 + v2): specific critique, partial revision with new context.
- Round 3 (ChatGPT v2 reply): substantial concession, named what was missed by both.
- Round 4 (Claude Code v3): synthesis, refinements, final artefact.

Total cost: 4 markdown files, 4 cross-tool prompts, ~3 hours of Mustafa's wall-clock spread over a day.

Result: an operating model neither tool alone would have produced. Each round materially improved the previous one. No round was wasted (v3 is the smallest delta but adds the codebase-specific context and memory integration neither prior round could).

**This is the operating model working in practice on a hard meta-question.** The 2-week pilot will test whether it works on routine code/design questions — which is where the actual day-to-day value (or lack of value) lives.

---

## Concrete next action

1. **Read this file fully.** Push back on anything that feels wrong before committing.
2. **Commit `docs/ai-collab.md`** with the contents above. One file. No new directories.
3. **First Codex review:** queue the DQ-3 scraper architecture decision ("emission stub first vs. scraper first"). Use the review packet template. Use the default Codex framing.
4. **Log outcome in session log** using the scorecard format.
5. **Run for 2 weeks.** End-of-pilot decision on 2026-05-14.
6. **Memory entries** for any generalizable lessons, indexed in `MEMORY.md`.
7. **After pilot:** open the consulting-track operating-model thread, vault-based.

---

## Maintenance

v1, v2, ChatGPT v2, and v3 are one-shot review artefacts. Preserved in `ai-handoffs/` as the reasoning trail. None gets regenerated.

Future revisions to the operating model itself happen in `docs/ai-collab.md` directly, with a new dated handoff file for the reasoning trail.

This is the last document in the design-the-operating-model phase. Next document in this thread will be the first end-of-week scorecard or the end-of-pilot decision document.
