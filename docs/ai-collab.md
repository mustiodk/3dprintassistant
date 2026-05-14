# AI Collaboration — 3dpa

**Purpose:** lightweight guidance for using multiple AI tools on 3dpa without
turning the workflow itself into the project.

**Status:** practical reference. The 2026-04-30 to 2026-05-08 operating-model
pilot is retired as an active workflow. Useful artifacts remain in git history,
`ai-handoffs/`, `codex/`, and the session logs.

---

## Default Roles

| Role | Default tool | Use when |
|---|---|---|
| Primary builder | Codex | Repo work, implementation, tests, commits, release flow. |
| Secondary reviewer / collaborator | Claude | Independent critique, design review, wording, second-pass reasoning. |
| Research / large context | Gemini | Source-heavy synthesis, long docs, broad comparison, large scraped outputs. |
| Brainstorming / first drafts | ChatGPT or Grok | Early ideation, framing, alternatives, prompt drafts. |

These are defaults, not permissions. Swap tools when the actual job calls for it.

---

## When to Bring in Another AI

Use a second model when one or more of these is true:

1. A design decision creates a constraint future code will inherit.
2. The change touches security, auth, HMAC, privacy, analytics, schema,
   concurrency, source-of-truth data, or release mechanics.
3. The work crosses web + iOS boundaries or changes shared `engine.js` /
   `data/*.json` behavior.
4. Mustafa can state a concrete uncertainty or disagreement.
5. The decision is hard to reverse.
6. A large source set needs synthesis before implementation.

Skip second-model review for routine copy edits, narrow markdown hygiene,
mechanical refactors, and low-risk fixes already covered by tests or the
walkthrough harness.

---

## Review Packet

Use this when asking Claude, Codex, Gemini, ChatGPT, or Grok for a serious
review. Keep it short.

```md
## Context
What are we changing and why?

## Decision to challenge
What specific choice should be challenged?

## Alternatives considered
Option A:
Option B:
Current direction:

## Diff or artefact
Files, branch, PR, pasted diff, research note, or screenshots.

## Checks already run
Tests, walkthrough harness, dry runs, manual QA.

## What I am uncertain about
Concrete questions, not "is this good?"

## Feedback wanted
Design risk / hidden assumptions / simpler alternatives / edge cases /
privacy / maintainability / release risk.

## Time pressure
Exploratory / planned / ship-blocker.

## Reversibility
Easy / moderate / hard / one-way.
```

Default framing:

> Challenge this. Do not validate it by default. Name hidden assumptions,
> simpler alternatives, risks, and where the current design is genuinely good
> enough. Separate must-fix issues from optional improvements. End with a clear
> recommendation and confidence level.

---

## Decision Rules

- AI tools advise; Mustafa decides.
- A review verdict is evidence, not permission.
- If two tools disagree, inspect the repo/source directly for factual claims.
- For risk disagreements, prefer the simpler reversible option unless evidence
  supports the more complex one.
- Capture durable lessons in the relevant session log; avoid mandatory
  scorecards unless the scorecard itself is the task.

---

## Confidentiality

3dpa is a hobby/open-style project, so normal product context is safe to use
across AI tools.

Consulting/client work is different: use codenames only. Never paste real client
names, identifying details, or confidential material into external AI tools.

---

## 3dpa Standing Rules

- Web is master; iOS mirrors `engine.js` and `data/*.json` byte-identical.
- Run walkthrough + iOS XCTest after engine/data changes.
- One finding = one commit per platform when working through reviews.
- Data/logic changes must include web + iOS UI impact evaluation.
- iOS `main` stays push-gated until ready for TestFlight.
- Quality over speed.

---

## TDD-RED breadcrumb (recommended when natural RED is degenerate)

When mirroring an already-proven behavior — e.g., adding an iOS XCTest that
mirrors a green web walkthrough invariant — the natural RED phase is
degenerate: the test passes on first run because the engine already exhibits
the behavior. That makes the test functionally a tests-after-the-fact assertion
with no proof the assertion machinery would have caught a real regression.
The S8 internal reviewer + the 2026-05-14 Codex audit both flagged this as a
process gap.

To close it, apply ONE of these per test-batch commit:

1. **Inverted-first on one representative.** Author the first test in the batch
   with a deliberately-wrong assertion (e.g., `XCTAssertEqual(x, 999, ...)` when
   you expect `90`), run the test, observe the failure (proves machinery + engine
   response), then flip to correct. Leave a breadcrumb so the discipline is
   auditable from `git log` alone:
   - A `// RED demo verified YYYY-MM-DD: <one-line explanation>` comment on or
     near the flipped assertion, OR
   - A tiny pre-commit (1-line wrong assertion) reverted by a follow-up commit,
     so `git log -p` shows the RED in history.

2. **Skip with explicit commit-body note** for batches where the natural RED is
   "engine no longer emits this ID" (e.g., retired-ID negative assertions).
   Write into the commit body: "TDD-RED skipped: test-only, degenerate RED is
   expected; collective full-suite green is the proof." This is honest about the
   limit and surfaces it for review.

Either way: the commit body OR test code must surface the RED-discipline posture.
"Self-reported only" (mentioning the demo in the commit message without any
code or commit-history artifact) is the gap to avoid — it makes external review
prove a negative.

Applies to any cross-platform mirror commit on 3dpa (iOS mirroring web walkthrough,
or future cross-tool mirrors).
