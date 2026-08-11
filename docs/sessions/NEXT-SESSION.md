# 3dpa — Next Session Kickoff

**Purpose:** start the next 3dpa session from a repo that now has working CI.

**Last updated:** 2026-08-10, after CI shipped green on `main` (`657d9f5`).

No implementation task is locked. CI exists, runs all 55 tracked test files plus
the engine drift gate on every push, and is green. Nothing is blocked on code.

Two things are genuinely waiting, and both are in the prompt below: the two owner
decisions that have been blocking printers since 2026-08-09, and the iOS CI half
that is committed but unpushed under the push gate.

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
   `docs/sessions/2026-08-10-cowork-appdev-ci-workflows.md`
7. This file
8. Task-specific source, per the choice below

**Repo health first — and check the BRANCH, not just the health line.** Trigger
C's GitHub-first gate is not optional here; three consecutive cold starts have
now opened behind origin. Note the failure mode that bit on 2026-08-10: the
health line reported `3dprintassistant: current` while local `main` was **63
commits behind**, because the checkout was parked on a feature branch that was
current with *its own* upstream. Run `git branch -vv` and confirm which branch
you are on before trusting any local ROADMAP or NEXT-SESSION.
`3dprintassistant-ios: N unpushed` is expected (push gate), not a problem.

**Then pick one of these. Ask the owner; do not assume.**

**(a) The two open owner decisions** — still the only things blocking printers
from shipping. Neither is a coding task; each issue body carries the exact command:
  - [#29](https://github.com/mustiodk/3dprintassistant/issues/29) `hi` (Creality Hi) — establishing a new `series_group` is a
    taxonomy call. `intake-owner-decision.js approve-series`.
  - [#28](https://github.com/mustiodk/3dprintassistant/issues/28) `ender3_s1_pro` — the official manual says 150 mm/s (matching
    the shipped `ender_3_s1` sibling exactly), Creality's storefront says 160.
    `intake-owner-decision.js provide-evidence --edge rd3-external-evidence`.
    Owner URLs are treated as LEADS — research re-runs against them and anything
    unsubstantiated still parks.

**(b) Push the iOS CI half.** `3dprintassistant-ios` `main` is **ahead 4** with an
ubuntu `engine.js` mirror gate and a cost-bounded macos-26 unit job. It has
**never run on a runner** and cannot until iOS pushes, so it is verified by
inspection only. The push gate normally waits for a ship-ready train; the owner
may reasonably decide a workflow-only push is worth an exception, since a mirror
gate is most valuable *before* a release rather than after. Owner's call — do not
push iOS without it.

**(c) Chase what CI can now find.** Highest-value follow-ups, in order:
  - **68 remaining bare `[[ ]]` assertions** across the seven shell suites. macOS
    bash 3.2 never enforced them; Linux does now. Any that are quietly false will
    surface as a CI failure with no local equivalent — one already did. Decide
    between converting them to an enforcing form and adopting "CI is the source
    of truth for shell suites" as the standing rule.
  - **`testflight.yml` has no `timeout-minutes`** — the same gap just closed in
    iOS `ci.yml`, on the same 10× runner. One line.
  - **`ScreenCaptureUITests` fails 4/6** on a clean checkout and is excluded from
    iOS CI for that reason. Fixing it lets the UI suite back into the gate.

**(d) Anything else the owner names** from the live ROADMAP.

**Standing rules that bite on this project:**
- ROADMAP is truth. Read it fully before reporting status — and make sure you are
  reading `main`'s copy, not a feature branch's.
- No mutation on an unverified premise. Verify with a real tool call in the SAME
  turn and state the outcome inline; citing an earlier turn does not count.
- One finding = one commit.
- Web is master; iOS mirrors `engine.js` byte-identical. Now machine-enforced by
  the iOS `engine-mirror` job — but only once that workflow is pushed. `data/` is
  deliberately NOT byte-compared: bundled iOS carries 92 printers to web's 95 by
  overlay design, so such a gate would be red on day one.
- iOS `main` stays push-gated. Web pushes freely.
- **A green local macOS run of the shell suites proves less than a green CI run.**
  bash 3.2 does not apply `set -e` to a failing `[[ ]]`; do not treat a local pass
  as verification for those files.
- Shell suites mix `#!/usr/bin/env bash` and `#!/bin/zsh`. Invoke via `./"$f"` so
  each file's own shebang applies — a bash suite run under zsh fails with zero
  output and exit 1, which looks exactly like a real failure.
- Committed ≠ deployed. The intake pipeline runs from
  `~/.local/share/3dpa-intake/checkout/3dprintassistant`, which fast-forwards from
  origin at run start; verify there, not in the dev tree. The 2026-08-10 `stat`
  portability fix reaches that checkout at the next 12:00 run — verified a no-op
  on Darwin, but it is a live-pipeline change.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
