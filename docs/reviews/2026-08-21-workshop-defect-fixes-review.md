# 2026-08-21 — Codex gate on the three shipped `workshop-store.js` defect fixes

**Target:** commits `a442f1f` (D-5), `1354bf9` (D-1), `fa305f4` (D-3) on web `main`.
**Reviewer:** Codex via `bridge --mode codex-only`. Preflight `bridge --health: ok`.
**Transcript:** [`bridge-2026-08-21-102720-968049.md`](bridge-2026-08-21-102720-968049.md).
**Lane:** Full — shipped code with real users, data-loss class.

Seven findings plus one observation. **Five accepted and fixed. Two deferred to an
owner call, both because they argue against a decision the ratified sync spec already
took.** Recorded here rather than silently implemented or silently dropped.

---

## Accepted and fixed

| # | Finding | Fix |
|---|---|---|
| MUST-FIX | `exportJSON()` under skew emitted a well-formed `{ v: 1, profiles: [] }` — a valid-looking but empty backup built from data we could not read | returns `null`; UI toasts (`c434d77`) |
| MUST-FIX | archived rows were mutable — `rename`/`addOutcome`/`removeOutcome` matched on id only, so a deleted profile became editable | all four mutators require `_isLive` (`d3b9488`) |
| SHOULD-FIX | a non-string `archived_at` was mapped to `null`, **resurrecting a deleted row** | fails closed — unknown truthy coerces to a tombstone (`d3b9488`) |
| SHOULD-FIX | `revertTuning` returned `not-found` under skew | reports `version-skew` (`d3b9488`) |
| SHOULD-FIX | the Workshop card date read `p.updated`, so D-3 silently stopped it moving when an outcome was logged | UI derives last-activity from all three stamps (`d559bee`) |
| OBSERVATION | four D-1/D-5 assertions passed under the reverted implementation | TC-R5 asserts the discriminating property — the stored row count does not shrink (`d3b9488`) |

The gate also confirmed: **no remaining localStorage persistence path over a skewed
envelope** through `_writeEnv`, `_write`, valid `importJSON`, `addTuningOp` or
`dismissSuggestion`. And it found no second millisecond-clock degenerate beyond the
one already caught and rewritten before the D-3 commit.

---

## Deferred — RECLASSIFIED 2026-08-21: these are mine to resolve, not the owner's

**Correction.** These were originally filed as "owner call required." That was wrong.
DEF-1 and DEF-2 are **technical** questions with answers discoverable from the code, the
specs and an adversarial review — high stakes raises the review bar, it does not transfer
the decision. DEF-3 is a wording clarification. The owner does not hold the technical
context to arbitrate any of them, and asking him to stalls the work.

**Correct handling, applied when sync is planned:** resolve each the way the array-order
question was resolved on the same day — an architect subagent plus a cross-model gate,
both instructed to attack the leading option, then decide and record the reasoning. They
block *planning sync*; they do not block web shipping gear, so they are queued rather than
escalated.

### DEF-1 · In-profile tombstones are not old-client compatible on envelope `v:1`

**The finding.** A pre-D1 client reading the same envelope does not know about
`archived_at`. It lists tombstoned profiles as live, shows them, and can write them
back. Codex proposes an **envelope-level tombstone ledger** instead: an old `_write()`
would preserve it untouched while old clients stop listing deleted rows.

**Why it is not implemented.** The ratified [sync v1 spec §5 D-1](../superpowers/specs/2026-08-20-sync-v1-spec.md)
chose in-profile tombstones explicitly — *"an `archived_at` field on the profile
record, exactly as gears use. **Additive and backward-safe**."* Overriding a ratified
decision on a reviewer's proposal is not the controller's call, and a reviewer's
proposed fix carries no authority on its own.

**Residual risk, assessed honestly — low today, and it does not grow quietly.**

- There is no cross-client sharing of this envelope at all right now. `localStorage` is
  per-browser; iOS Workshop is a separate store; **sync is specified but not built.**
- Web auto-deploys from `main` with no build step, so an "old web client" is a stale
  tab, not a population.
- The risk becomes real **the day sync ships**, which is exactly when the spec intends
  the merge rules to arrive anyway.

**The decision this needs, to be made by gated analysis rather than escalation.** Whether to keep in-profile tombstones (spec as
ratified, simpler, matches gears) or move to an envelope-level ledger (better old-client
behaviour, diverges from the gear model). **It must be settled before sync is planned**,
not before web ships gear.

### DEF-2 · Does an archived row belong in a user backup?

Follows from DEF-1. Exporting archived rows is what lets a tombstone travel between two
new clients — but it also puts a deleted profile's full content into a file the user
downloads, and an old client reading that file treats the row as live.

This is **sync spec §9.2, already listed as open**: *"a user importing an old backup
then sees archived rows return, which is arguably correct for a restore and arguably
surprising."* Unchanged here. Same treatment, same timing — gated analysis before sync is planned.

### DEF-3 · `journal_updated` fallback wording

The gate read spec §5 D-3 (*"old records without it default to the existing `updated`"*)
as contradicting the test asserting `journal_updated` is not fabricated on read.

**They are consistent, and the spec wording is the imprecise half.** The store does not
manufacture the field; the *consumer* — the sync merge — falls back to `updated` when it
is absent. Storage stays honest about what it knows. Worth a one-line spec clarification
when sync is planned; no code change.

---

## What this leaves for the sync plan

Three items, all clustered at the same gate: **DEF-1** (tombstone location), **DEF-2**
(backups carrying archived rows), **DEF-3** (spec wording). None blocks web shipping
gear. All three block *planning* sync.
