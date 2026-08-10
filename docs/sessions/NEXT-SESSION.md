# 3dpa — Next Session Kickoff

**Purpose:** start the next independent 3dpa session from the closed
intake decision-issue state.

**Last updated:** 2026-08-10 after the decision-required notification wrap.

No implementation task is locked, and nothing is blocked on code. The intake
notification gap is closed, deployed, and self-maintaining: `intake-decision-issue.js
sync --apply` runs as a stage before notify, POSTRUN check 7 fails the run if it
did not, and the sweep is a fixpoint that backfills anything missed. The next
scheduled 12:00 run needs nothing from you.

Two items are genuinely waiting, both listed in the prompt below.

Copy everything between the markers into the fresh session.

>>> START >>>

Cold start 3dpa.

**Read in order:**
1. `Projects/CLAUDE.md` (top-level protocol — routing + standing rules)
2. `3dprintassistant/CLAUDE.md` (project rules)
3. `3dprintassistant/docs/3dpa-context.md` (evergreen architecture, engine API, app state)
4. `3dprintassistant/docs/planning/ROADMAP.md` (live status + Active Work Queue)
5. `3dprintassistant/docs/sessions/INDEX.md`
6. The last 3 session logs in full — newest is
   `docs/sessions/2026-08-10-cowork-appdev-intake-decision-issues.md`
7. This file
8. Task-specific source, per the choice below

**Repo health first.** Trigger C's GitHub-first gate is not optional here — the
last two cold starts both opened with `3dprintassistant` behind origin. Resolve
any `behind:`/`diverged:` before reading local state as truth. Note that
`3dprintassistant-ios: N unpushed` is expected (iOS push gate), not a problem.

**Then pick one of these three. Ask the owner which; do not assume.**

**(a) The two open owner decisions** — these are the only things actually blocking
printers from shipping. Neither is a coding task; both need the owner's call, and
the issue body carries the exact command:
  - [#29](https://github.com/mustiodk/3dprintassistant/issues/29) `hi` (Creality Hi) — Creality's own blog calls it the "Hi
    Series"; no existing catalog sibling (K / Ender / i Series) matches, and PD2
    auto-ship requires an exact match. Establishing a new `series_group` label is
    a taxonomy decision. Resolve with `intake-owner-decision.js approve-series`.
  - [#28](https://github.com/mustiodk/3dprintassistant/issues/28) `ender3_s1_pro` (Ender-3 S1 Pro) — everything confirmed except
    `max_speed`: the official manual says 150 mm/s (matching the shipped
    `ender_3_s1` sibling exactly), Creality's own storefront says 160 mm/s.
    Resolve with `intake-owner-decision.js provide-evidence --edge
    rd3-external-evidence`. Owner URLs are treated as LEADS — research re-runs
    against them and anything unsubstantiated still parks.

**(b) The CI item — recommended if the owner has no strong preference.** ROADMAP
Active Work Queue, "Repo capability gap — 223 tests + a purpose-built drift gate,
and NO CI". It picked up N=2 evidence on 2026-08-10 and is now the highest-value
process work in the queue: `intake-run-wrapper.test.sh` was red from birth for six
days (assertion and the marker it asserts landed mismatched in the same commit,
`6d12c14`), and four more suites — `workshop-store`, `workshop-tuning`,
`workshop-tuning-rules`, `state-codec` — are red on `main` right now, verified at
clean HEAD. Five guards nobody is getting. Scope is ~2h and already written out in
the ROADMAP entry: `.github/workflows/ci.yml` running the JS suites plus
`node scripts/engine-golden-snapshot.js --check`, and a cross-repo `engine.js`
checksum step. **Start by triaging the four red suites** — shipping CI that is red
on day one is the one way to guarantee it gets ignored.

**(c) Anything else the owner names** from the live ROADMAP.

**Standing rules that bite on this project:**
- ROADMAP is truth. Read it fully before reporting status; never trust session
  notes or memory for what is done.
- No mutation on an unverified premise. Verify with a real tool call in the SAME
  turn and state the outcome inline — citing a check from an earlier turn does
  not count and will be ledgered as unresolved.
- One finding = one commit.
- Web is master; iOS mirrors `engine.js` and the full `data/` tree byte-identical.
  Any engine/data change requires an explicit web + iOS impact evaluation.
- iOS `main` stays push-gated until ready for TestFlight. Web pushes freely.
- Shell test suites are a mix of `#!/usr/bin/env bash` and `#!/bin/zsh`. Run each
  with its own shebang — a bash suite run under zsh fails with zero output and
  exit 1, which looks exactly like a real failure.
- Committed ≠ deployed. The intake pipeline runs from
  `~/.local/share/3dpa-intake/checkout/3dprintassistant`, which fast-forwards from
  origin at run start; verify there, not in the dev tree (whose
  `.intake-runner-state` is stale since July).

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
