# Intake Answer Normalizer — design

**Date:** 2026-08-06
**Status:** approved (owner, 2026-08-06)
**Scope:** a scheduled agent that reads owner answers on `intake-needs-data`
GitHub issues and posts a canonical answer block, so the daily intake run's
deterministic parser consumes them cleanly.

---

## Why

The owner-question loop shipped 2026-08-04 and failed its first live test five
times in a row. Every failure was on FORMAT, never on content:

| # | What happened | Cause |
|---|---|---|
| 1 | Answered in a comment | Parser read only the issue body |
| 2 | Answered without a ``` fence | Parser required one — and GitHub's copy button strips it |
| 3 | Wrote `None` | Enum matched case-sensitively |
| 4 | Couldn't parse the follow-up question | It was written in field names, not English |
| 5 | `--source` never reached the writer | Repeatable CLI flag landed in an array |

Each was a real answer with a real source, discarded. The owner's summary was
exact: *"this parser can't be so delicate.. I'm not a robot."*

The parser has since been made tolerant (19 shapes, from 5). This design closes
the remaining gap: an answer that is perfectly clear to a human but matches no
mechanical shape at all — pure prose, an answer split across sentences, a value
described rather than named.

## The line this design must not cross

An earlier attempt at the same problem was killed in review for letting an LLM
supply provenance. The distinction is sharp and everything here depends on it:

- **Transcribing** — the owner wrote "it's open"; the agent writes
  `enclosure: none`. The agent is a translator. The owner remains the source of
  truth. **Permitted.**
- **Witnessing** — the agent concludes the printer is open. That is fabricated
  provenance. **Forbidden.**

## Architecture

A new scheduled job, `intake-answer-normalizer`, runs at **11:30** — thirty
minutes before the 12:00 intake run.

```
11:30  normalizer   reads open intake-needs-data issues
                    → posts a canonical block as a comment
12:00  intake run   existing parser reads that block, as if hand-typed
```

**The intake pipeline does not change.** No new code path in the lane that
deploys to production, no new failure mode in the shipping gate. The normalizer
is purely additive: its entire output is a GitHub comment.

This is the load-bearing structural decision. It means the worst case for a
broken normalizer is "the intake run behaves exactly as it does today".

### Why a separate job rather than a step inside the run

Considered and rejected: teaching the intake runner to interpret directly. The
runner's context is already very large and interpretation would compete with
research, review and shipping. It would also put a probabilistic step inside the
deterministic shipping lane, and leave no isolated surface to test "did it read
the owner correctly?"

Also rejected: an hourly watcher, and a GitHub Actions `issue_comment` trigger.
The Actions route is the most responsive but the repo has no `.github/`
directory today and it would require Claude credentials as a repo secret. The
owner chose one pass shortly before the run; the cost is that an answer written
after 11:30 waits a day, which is consistent with a daily pipeline.

## The agent's contract

**May:**
- read the issue body and every comment
- map what the owner wrote to catalog tokens
- extract the source URL from the owner's own text
- use the owner's own words as the `claim`
- post exactly one canonical block per issue

**May not:**
- research anything, or visit any URL
- assert a fact the owner did not state
- fill a field the owner did not write about
- touch any field outside `enclosure`, `series`, `available_plates`
- supply a source the owner did not provide

The output faces the identical deterministic gauntlet as a hand-typed block:
`OWNER_ATTESTABLE_FIELDS`, `ATTESTED_ENUMS` / `KNOWN_PLATE_IDS`, an http(s)
source, a non-empty claim, then the evidence gate, both PD5 reviewers, live
verify and custody. **The agent cannot widen what is possible; it can only help
the owner reach it.**

## Ambiguity

The agent does not guess. When it cannot resolve an answer it posts a comment
naming the specific problem and leaves the field alone:

- contradictory values across comments → *"enclosure is given as both `none`
  and `passive` — which one?"*
- no catalog token matches → *"no token matches 'flexible'; closest are
  `textured_pei`, `smooth_pei`"*
- a field mentioned but not answered → left untouched, no comment

The owner answers whenever; the next day's pass picks it up.

## Idempotence

The agent marks its own comments with a fixed HTML-comment marker. It skips any
issue whose newest comment carries that marker, so it never re-normalizes its
own output or loops.

## Testing

An LLM's output is not byte-stable, so asserting on its exact text would be
flaky and prove little. The assertion runs one layer down:

> feed a fixture comment through the normalizer, feed its output through the
> REAL parser, and assert on the parsed result

`field=enclosure, value=none, source=<the URL the owner wrote>` is stable
regardless of how the agent phrases the block.

**Corpus** — starts from the owner's three real comments on issues #26 and #27,
including the pure-prose one that failed, plus:

- contradictory answers across two comments
- a value with no catalog match ("the flexible one")
- a field mentioned but not answered
- an attempt at a bed temperature
- an answer with no URL anywhere

**Two properties pinned hardest**, because they are the ones that would cause
real harm:

1. **It never invents a field.** Given a comment mentioning only `enclosure`,
   the output contains nothing else.
2. **It never invents a source.** Given a comment with no URL, it parks rather
   than producing one.

## Failure modes

| Condition | Behaviour |
|---|---|
| Normalizer never runs (launchd down, auth stale) | 12:00 intake behaves exactly as today — non-blocking by construction |
| Posts a wrong block | Visible in the issue; the value must still be a catalog token, so it can only be the wrong one of seven, never nonsense |
| Runs twice | Idempotence marker; skips issues whose newest comment is its own |
| Auth fails mid-run | Exits non-zero, logs, posts nothing — no half-written block |
| Agent output fails the parser | Nothing is consumed; the field stays parked exactly as before |

### Residual risk, accepted

A plausible-but-wrong transcription the owner does not notice, because they will
not re-read the issue after writing it. Mitigations are partial: the intake
run's closing comment names what was applied, and the ledger records the value
against the owner's name with the issue number. Neither forces a second look.

This is the accepted cost of the owner's explicit choice to have the agent act
directly rather than wait for confirmation (2026-08-06). Recorded here so the
trade-off is visible rather than discovered later.

## Out of scope

- Researching or verifying anything the owner wrote
- Any field outside the three-field allowlist
- Changing the intake runner, the evidence gate, or the review lane
- Auto-closing issues — the intake run already does that on consumption
