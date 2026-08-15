# 3dpa — Next Session Kickoff

**Purpose:** the intake queue is no longer the blocker — both owner decisions
were executed on 2026-08-15 and the next scheduled run owns the processing. This
file now leads with the **#32 iOS-train scoping** block, preceded by a two-minute
check of the run that consumed those decisions.

**Last updated:** 2026-08-15, after executing #28/#36 and #29 and closing three
guard gaps.

---

# FIRST — two minutes on the run that processed the decisions

Not a session's worth of work, but do it before anything else, because it is the
**first real proof of the manufacturer-conflict ladder** and the evidence is
perishable (raw run logs are mac-mini-local and get overwritten).

Both candidates were armed on 2026-08-15 and report
`OWNERDECISION ok=true action=verify-reentry`:

- `ender_3_s1_pro` (#28/#36) — `rd3-external-evidence`, field `max_speed`
- `hi` (#29) — `approve-series "Hi Series"`

## What to look for on `ender_3_s1_pro`

The ladder (`733e9fb`) is **policy the research agent reads in
`docs/runbooks/printer-addition-protocol.md`, not enforced code** — the validator
structurally cannot see a source conflict. So behaviour is the only evidence:

- Did it resolve `max_speed` to **150**, citing the manual V1.4 page-12 spec
  table over the store page title? (Rung 1: specification-grade outranks
  marketing copy. 150 also matches shipped sibling `ender_3_s1`.)
- Did it carry a **risk flag** and dispatch **both** reviewers? A silent
  auto-ship would be a defect in the rule as written.
- If it re-parked a third time, **read the resolution note before touching
  anything.** "The ladder needs a rung" and "the researcher never read that
  runbook section" are different findings and the note distinguishes them.

## What to look for on `hi`

Its packet still carries `available_plates: ["epoxy_flexible"]` — an id that
exists nowhere in `engine.js` or `data/`, researched before `epoxy_resin` landed
(#35). Re-entry re-runs research, so it should be redrafted to `epoxy_resin`.

If it was not, the run should have parked it `research-defect` rather than
shipping it: `validate-candidate-evidence.js` now checks researcher-drafted plate
ids against the shared vocabulary (`50442b7`). **Either outcome is informative** —
a correct redraft says the agent tracks taxonomy changes; a park says the new
gate earned its keep on its first day.

Read it from the run report and custody commits; `~/.local/share/3dpa-intake/`
exists only on the mac-mini.

---

# THE SESSION — scope the next iOS train

Carried from 2026-08-11 and still the strongest candidate. This is a **planning
and scoping session, not an implementation session.** The output is a ratified
scope: which roadmap items ship alongside #32, and which explicitly do not.

Copy everything between the markers into the fresh session.

>>> START >>>

Cold start 3dpa and 3dpa-ios.

**Read in order:**
1. `Projects/CLAUDE.md` (top-level protocol — routing + standing rules)
2. `3dprintassistant/CLAUDE.md` (project rules)
3. `3dprintassistant/docs/3dpa-context.md` (evergreen architecture, engine API, app state)
4. `3dprintassistant/docs/planning/ROADMAP.md` — **all of it this time**; the scoping task needs the full Active Work Queue + Deferred + Backlog surface
5. `3dprintassistant/docs/sessions/INDEX.md`
6. The last 3 session logs in full
7. This file
8. GitHub issues #31, #32 in full — they carry the research this scoping builds on

**Repo health first — check the BRANCH, not just the health line.** Run
`git branch -vv` and confirm which branch you are on before trusting any local
ROADMAP or NEXT-SESSION; a checkout parked on a feature branch can read
"current" against its own upstream while `main` is dozens of commits ahead. That
exact failure has bitten **four** cold starts. K3
[`2026-08-12-sync-health-reports-current-on-a-stale-feature-branch`](../../../ai-operating-model/docs/findings/2026-08-12-sync-health-reports-current-on-a-stale-feature-branch.md).
`3dprintassistant-ios: N unpushed` is expected (push gate), not a problem.

---

## The task: scope the next iOS train

**Anchor feature:** [#32](https://github.com/mustiodk/3dprintassistant/issues/32)
— modular picker; user-selected printers + filaments with defaults, replacing
today's hardcoded curation (`primary` for brands, `_CORE_MATERIALS`/
`_CORE_NOZZLES`/`_CORE_SURFACE` at `engine.js:418-420`, and iOS's own
`featuredIds` array).

#32 is not yet specified. Two open decisions block design (issue §"Open
questions" Q1 and Q3) — **answer these first, everything else hangs off them:**

1. **Storage shape** — a new `3dpa_gear_v1`-style store, or an additive section
   on the existing Workshop envelope (which is also the backup format)? SYN-09
   promises whatever is chosen keeps its keys and format forever, so this is the
   load-bearing call.
2. **One printer or several?** "Your printer" vs "the 3 you own, default to one."

Then: which other roadmap items ship in the same train?

### Pre-built candidate inventory

Gathered 2026-08-11. Verify against the live ROADMAP before trusting it.

**Strong pairings with #32** (same surfaces, same code, same review):

| Candidate | Source | Why it pairs |
|---|---|---|
| **Light mode / system appearance (iOS)** | Backlog, `v1.1 candidate`, Large | The other big iOS UX debt. `ColorTheme.swift` is hardcoded dark; ~10–15 tokens need light variants and four `.preferredColorScheme(.dark)` calls removed. Same views #32 touches — one contrast sweep instead of two. |
| **PR-4 Navigation architecture refinement** | Deferred, `[iOS]` | #32 changes routing directly (`HomeView.swift:91` unconditional `.brandPicker` push, plus a skip path). If nav is getting deeper route state anyway, do it once. |
| **PR-5 Accessibility & visual polish** | Deferred, `[iOS]` | New pickers/settings need VoiceOver labels and Dynamic Type from birth, not retrofitted. |
| **PR-2 View models for pickers** | Deferred, `[iOS]` | `OutputViewModel` is extracted already; picker view models are the gap, and #32 adds real state to exactly those screens. |

**Independent — cheap to include, no coupling:**

| Candidate | Source |
|---|---|
| #31 Elegoo primary brand — iOS half (web is live) | Issue #31 |
| #2 Workshop loaded profile can be saved again | GitHub, open since 2026-07-09 |
| #4 Export backup does not show which profile it exports | GitHub, open since 2026-07-09 |
| #25 build-volume field to unblock native export for 7 printers | GitHub, open since 2026-07-25 |
| `max_mvs` 0.8mm-nozzle data gap (17 materials, `hips` also missing 0.2) | Active Work Queue |

**Deliberately consider excluding:**

| Candidate | Why it may not belong |
|---|---|
| Feedback Diagnostics v2 | Cross-model reviewed, but gated on owner spec approval, and it is a Worker + D1 + privacy train of its own. |
| Android v1 (AG0) | Owner gate not given; a separate program. |
| My 3DPA account platform (MG0) | #32 is the free local-first slice; *sync* is explicitly Pro and a separate multi-milestone program. Do not let #32 drag it in. |
| #5, #12 analytics dashboard asks | Web/dashboard work, no iOS content. |
| The 4 selection events still 400ing | Web Worker fix, and it needs an owner decision of its own (allowlist vs delete the dead `track()` calls). Worth doing, not here. |

### Framing questions for the scope decision

- What is the **user-visible headline**? A train needs one sentence in the
  What's New; if it needs three, it is two trains.
- Does anything need **web parity**, and does web ship first as usual?
- **Version:** 1.2.0 if #32 lands (feature train), 1.1.5 if scope collapses to
  fixes. Version = release train, build number = iteration.
- Which items are **engine/data** (byte-mirror, walkthrough, golden snapshot)
  versus app-layer-only? #32 is app-layer by SYN-10; keep it that way.

**Note the current release state:** 1.1.3 is public, and **1.1.4 is
implementation-complete locally and gated on owner authorization** (iOS push,
TestFlight dispatch, device acceptance, authenticated explicit-zero dashboard
check). The train being scoped here comes *after* 1.1.4 ships.

### Carried over: #31 Elegoo

**Web is live (`1170a2d`); iOS ships in the train being scoped** — Phase 2 of
the plan, one `brands[]` field in the bundled catalog, and it belongs in the
release notes because a user asked for it. Small, done, specified: treat it as a
freebie in the scope, not a work item to re-plan.

Why the overlay route was rejected, so it is not relitigated: publishing an
`elegoo` brand row at the current `min_app_version: 1.0.3` **FAILS** the ship
gate — verified by running the real `validateOverlay()` — because builds below
`FIRST_OVERRIDE_MERGE_VERSION` (1.0.5) reject the *entire* overlay on a
bundled-id collision. Taking it would have permanently ended overlay delivery to
1.0.3/1.0.4 installs, for every future printer.

Also measured: a hard ceiling of **7 primary brands at 320px**; an 8th is
silently clipped, not wrapped.

---

## Standing rules that bite on this project

- ROADMAP is truth. Read it fully before reporting status — and make sure you
  are reading `main`'s copy, not a feature branch's.
- No mutation on an unverified premise. Verify with a real tool call in the SAME
  turn and state the outcome inline; citing an earlier turn does not count.
- **Validate the fix LOCUS, not just the diagnosis.** Before naming an
  enforcement site, check the code path can observe what it is meant to enforce.
  K3 [`2026-08-15-recommended-fix-locus-would-have-been-dead-code`](../../../ai-operating-model/docs/findings/2026-08-15-recommended-fix-locus-would-have-been-dead-code.md).
- **Look for the applier before hand-editing generated or ratified state.** A
  file carrying `version` / `_provenance` / `lastRatified` has a writer; a hand
  edit passes tests while skipping the bookkeeping that writer exists for
  (2026-08-15, the `seturn` guardrail).
- **When a field has an allowlist, enumerate every writer that can set it.** A
  guard on the supervised path and absent from the unsupervised one is worse
  than none, because it reads as coverage. K3
  [`2026-08-15-allowlist-guarded-the-owner-path-not-the-machine-path`](../../../ai-operating-model/docs/findings/2026-08-15-allowlist-guarded-the-owner-path-not-the-machine-path.md).
- One finding = one commit.
- Web is master; iOS mirrors `engine.js` byte-identical. **`data/printers.json`
  is deliberately NOT identical** — web has more printer rows than iOS bundled,
  the difference being overlay-delivered rows whose bundled mirror is deferred.
  Never blind-`cp` that file.
- iOS `main` stays push-gated. Web pushes freely.
- **A green local macOS run of the shell suites proves less than a green CI run.**
  bash 3.2 does not apply `set -e` to a failing `[[ ]]`.
- **Several node suites use `node:test`, whose tail line is `ℹ duration_ms`
  regardless of outcome.** Check exit codes, not the last line of output.
- Committed ≠ deployed, and a fixed generator ≠ fixed published artifacts. The
  intake pipeline runs from `~/.local/share/3dpa-intake/checkout/3dprintassistant`;
  verify there, and check that checkout's own HEAD — it is a separate clone.
- **Environment check:** a remote Linux container can do web work, planning, and
  iOS reading/editing, but **cannot** run XCTest, a simulator, or anything
  needing Xcode, and does not have the mac-mini's intake state. Scope the
  session's commitments to the machine it is actually running on.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
This revision was a Trigger A wrap-up (2026-08-15, mac-mini). The intake LOCKED
NEXT was retired because both decisions executed this session; the #32 scoping
block is preserved from the 2026-08-11 owner ask.
