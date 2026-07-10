# Direct Codex review — R2 reviewer-output contract

**Date:** 2026-07-10

**Mode:** `codex exec --ignore-user-config -m gpt-5.4 -s read-only`

**Session:** `019f4d2c-9db2-7f93-a19f-fb1c1dba94f1`

## Why direct review was used

Claude's monthly spend limit was already confirmed before R2. The canonical
read-only direct fallback was therefore used for the gate review.

## Verdict

`NO-GO`

## Findings

1. ISO-looking impossible dates such as `2026-02-30T00:00:00Z` passed because
   JavaScript normalised them.
2. Reviewer ids accepted case drift (`codex` / `Codex` / `CODEX`), weakening
   their stable identity across verdict references.
3. The kickoff and runbook still said "any NO-GO parks," contradicting RD4's
   `{GO, NO-GO} -> review-split -> decision-required` rule.

All three findings were accepted for one-finding-per-commit remediation before
R2 re-review.

## Final re-review

**Session:** `019f4d33-83af-7890-b379-08ea2f0f6054`

The focused read-only re-review reran the 12-test contract suite, verified the
calendar-date round trip, lowercase reviewer ids, and explicit RD4 multiset
routing in both operational docs, then returned `GO`.
