# 3dpa — Next Session Kickoff

**Purpose:** scope the next iOS release train around the user-gear
personalization feature (#32), and pick the roadmap items that belong in it.

**Last updated:** 2026-08-11, after the picker/personalization planning session.

The next session is a **planning and scoping session, not an implementation
session.** The output is a ratified scope for the next iOS train — which roadmap
items ship alongside #32, and which explicitly do not.

Copy everything between the markers into the fresh session.

>>> START >>>

Cold start 3dpa and 3dpa-ios.

**Read in order:**
1. `Projects/CLAUDE.md` (top-level protocol — routing + standing rules)
2. `3dprintassistant/CLAUDE.md` (project rules)
3. `3dprintassistant/docs/3dpa-context.md` (evergreen architecture, engine API, app state)
4. `3dprintassistant/docs/planning/ROADMAP.md` (live status + Active Work Queue + Deferred + Backlog — **all of it this time**, the scoping task needs the full surface)
5. `3dprintassistant/docs/sessions/INDEX.md`
6. The last 3 session logs in full
7. This file
8. GitHub issues #31, #32 in full — they carry the research this scoping builds on

**Repo health first — check the BRANCH, not just the health line.** Run
`git branch -vv` and confirm which branch you are on before trusting any local
ROADMAP or NEXT-SESSION; a checkout parked on a feature branch can be "current"
with its own upstream while `main` is dozens of commits behind. That exact
failure has bitten three cold starts.
`3dprintassistant-ios: N unpushed` is expected (push gate), not a problem.

---

## The task: scope the next iOS train

**Anchor feature:** [#32](https://github.com/mustiodk/3dprintassistant/issues/32)
— modular picker; user-selected printers + filaments with defaults, replacing
today's hardcoded curation (`primary` flag for brands, a hardcoded `featuredIds`
array for materials on iOS, nothing at all on web).

#32 is not yet specified. It has two open decisions that block design
(issue §"Open questions" Q1 and Q3):

1. **Storage shape** — a new `3dpa_gear_v1`-style store, or an additive section
   on the existing Workshop envelope? SYN-09 promises whatever is chosen is kept
   forever, so this is the load-bearing call.
2. **One printer or several?** "Your printer" vs "the 3 you own, default to one."

**Answer those two first.** Everything else in #32 hangs off them.

Then: which other roadmap items ship in the same train?

### Pre-built candidate inventory

Gathered 2026-08-11 so the session starts at analysis rather than collection.
Verify against the live ROADMAP before trusting it — this is a snapshot.

**Strong pairings with #32** (same surfaces, same code, same review):

| Candidate | Source | Why it pairs |
|---|---|---|
| **Light mode / system appearance (iOS)** | Backlog, marked `v1.1 candidate`, Large | The other big iOS UX debt. `ColorTheme.swift` is hardcoded dark; ~10–15 tokens need light variants and four `.preferredColorScheme(.dark)` calls removed. Touches the same views #32 touches — doing both at once means one contrast/polish sweep instead of two. |
| **PR-4 Navigation architecture refinement** | Deferred, `[iOS]` | #32 changes routing directly (`HomeView.swift:91` unconditional `.brandPicker` push, plus a skip path). If nav is getting deeper route state and restoration anyway, do it once. |
| **PR-5 Accessibility & visual polish** | Deferred, `[iOS]` | New pickers/settings need VoiceOver labels and Dynamic Type from birth, not retrofitted. |
| **PR-2 View models for pickers** | Deferred, `[iOS]` | `OutputViewModel` is already extracted; picker view models are the remaining gap, and #32 adds real state to exactly those screens. |

**Independent — cheap to include, no coupling:**

| Candidate | Source |
|---|---|
| #31 Elegoo primary brand (spec + plan written, see below) | Issue #31 |
| #2 Workshop loaded profile can be saved again | GitHub, open since 2026-07-09 |
| #4 Export backup does not show which profile it exports | GitHub, open since 2026-07-09 |
| #25 build-volume field to unblock native export for 7 printers | GitHub, open since 2026-07-25 |
| `max_mvs` 0.8mm-nozzle data gap (17 materials, `hips` also missing 0.2) | Active Work Queue — surfaced again by every golden-snapshot run |

**Deliberately consider excluding** (large, or gated on something else):

| Candidate | Why it may not belong |
|---|---|
| Feedback Diagnostics v2 | Design is cross-model reviewed, but gated on owner spec approval, and it is a Worker + D1 + privacy train of its own. |
| Android v1 (AG0) | Owner gate not given; a separate program, not an iOS train item. |
| My 3DPA account platform (MG0) | #32 is the free local-first slice; the *sync* half is explicitly Pro and a separate multi-milestone program. Do not let #32 drag it in. |
| #5, #12 analytics dashboard asks | Web/dashboard work, no iOS content. |
| The 4 selection events still 400ing | Web Worker fix; unrelated to the train. Worth doing, not here. |

### Framing questions for the scope decision

- What is the **user-visible headline** of this release? A train needs one
  sentence in the What's New; if it needs three, it is two trains.
- Does anything here need **web parity**, and does web ship first as usual?
- What is the **version number** — 1.2.0 if #32 lands (feature train), 1.1.5 if
  the scope collapses to fixes. Remember: version = release train, build number
  = iteration.
- Which items are **engine/data** (byte-mirror, walkthrough, golden snapshot)
  versus app-layer-only? #32 is app-layer by SYN-10; keep it that way.

---

## Carried over from 2026-08-11

**#31 Elegoo primary brand — spec and plan are WRITTEN, awaiting owner GO.**
- Design: `docs/superpowers/specs/2026-08-11-elegoo-primary-brand-design.md`
- Plan: `docs/superpowers/plans/2026-08-11-elegoo-primary-brand-plan.md`

Owner decisions still open (design §8): GO on the flag flip, and yes/no on the
overlay route. **The overlay route is not free** — verified by running the real
`validateOverlay()`: publishing an `elegoo` brand row at the current
`min_app_version: 1.0.3` **FAILS** the ship gate, because builds below 1.0.5
reject the *entire* overlay on a bundled-id collision. Taking that route means
raising `min_app_version` to `1.0.5` and permanently ending overlay delivery to
1.0.3/1.0.4 installs. Decide it with the `/analytics` version data, not by
assumption. If Elegoo instead rides the next binary train, it becomes a scope
item for the train being planned here.

Also open from that session: `republish-overlay.js` has **no mode** that can
publish or update a brand row on its own (`--add-brand` is a rider on
`--add-printer`). Needed only if the overlay route is taken; specced in the plan
as Phase 3 Task 5, TDD-first.

**Other still-open items** (unchanged, not blocked on code): the two intake owner
decisions [#28](https://github.com/mustiodk/3dprintassistant/issues/28) and
[#29](https://github.com/mustiodk/3dprintassistant/issues/29) — both now carry
researched answers and exact CLI commands in their comments, and both must be run
on the mac-mini, where the gitignored parked-sidecar state lives. The 68 bare
`[[ ]]` shell assertions and iOS CI's unpushed 4 commits are also untouched.

---

## Standing rules that bite on this project

- ROADMAP is truth. Read it fully before reporting status — and make sure you are
  reading `main`'s copy, not a feature branch's.
- No mutation on an unverified premise. Verify with a real tool call in the SAME
  turn and state the outcome inline; citing an earlier turn does not count.
  (2026-08-11: a validator was first called with the wrong argument shape and
  silently validated the on-disk file, returning a meaningless PASS. Check that
  the output describes what you actually passed it.)
- One finding = one commit.
- Web is master; iOS mirrors `engine.js` byte-identical. **`data/printers.json`
  is deliberately NOT identical** — web 81 printer rows, iOS bundled 78, the
  difference being overlay-delivered rows whose bundled mirror is deferred.
  Never blind-`cp` that file.
- iOS `main` stays push-gated. Web pushes freely.
- **A green local macOS run of the shell suites proves less than a green CI run.**
  bash 3.2 does not apply `set -e` to a failing `[[ ]]`.
- Shell suites mix `#!/usr/bin/env bash` and `#!/bin/zsh`. Invoke via `./"$f"`.
- Committed ≠ deployed. The intake pipeline runs from
  `~/.local/share/3dpa-intake/checkout/3dprintassistant`; verify there.
- **Environment check:** a remote Linux container can do web work, planning, and
  iOS reading/editing, but **cannot** run XCTest, a simulator, or anything
  needing Xcode, and does not have the mac-mini's intake state. Scope the
  session's commitments to the machine it is actually running on.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
This revision was an explicit owner ask (2026-08-11).
