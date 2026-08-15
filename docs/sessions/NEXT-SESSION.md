# 3dpa — Next Session Kickoff

**Purpose:** run the `ender_3_s1_pro` re-entry on the mac-mini under the new
manufacturer-conflict ladder, and confirm the ladder actually changes the
outcome. The #32 iOS-train scoping block is preserved below.

**Last updated:** 2026-08-15, after closing #34 and adding the
manufacturer-vs-manufacturer resolution ladder.

---

# LOCKED NEXT — #28 / #36 re-entry, on the mac-mini

**This cannot run from the iMac.** The parked sidecars are gitignored
(`.gitignore:26`) and host-local. The runner host is the mac-mini, confirmed
from `scripts/launchd/dk.mragile.3dpa-intake.plist:34`
(`/Users/mustafaozturk-macmini/Library/Logs/`).

## First, sync the automation checkout

The fixes are on `origin/main` (`733e9fb`). The runner reads the automation
checkout, **not** the dev tree:

```bash
cd ~/.local/share/3dpa-intake/checkout/3dprintassistant && git fetch origin && git log --oneline -1 origin/main
```

If `INSTALL_ROOT` is not there, the authoritative value is `WorkingDirectory` in
the installed plist:

```bash
grep -A1 WorkingDirectory ~/Library/LaunchAgents/dk.mragile.3dpa-intake.plist
```

The bootstrap syncs this checkout at the start of each scheduled run, so on a
normal day you can simply let 12:00 do it. Verify rather than assume.

## Then record the decision

Same three leads as 2026-08-12 — nothing new is needed, because the ladder, not
the sources, is what changed. The manual is the one that now wins:

```bash
node ~/.local/share/3dpa-intake/checkout/3dprintassistant/scripts/intake-owner-decision.js provide-evidence --candidate ender_3_s1_pro \
  --repo-root ~/.local/share/3dpa-intake/checkout/3dprintassistant \
  --edge rd3-external-evidence \
  --source "https://www.creality.com/products/creality-ender-3-s1-pro-3d-printer" \
  --field max_speed --dry-run
```

Check `ok=true`, then rerun with `--apply` in place of `--dry-run`, then:

```bash
node ~/.local/share/3dpa-intake/checkout/3dprintassistant/scripts/intake-owner-decision.js verify-reentry --candidate ender_3_s1_pro --repo-root ~/.local/share/3dpa-intake/checkout/3dprintassistant
```

Only `OWNERDECISION ok=true action=verify-reentry` authorizes re-entry. Replace
the `--source` URL with the actual manual V1.4 PDF URL from #36's run note if you
have it to hand — the manual is the spec-grade source rung 1 turns on.

**Substitute the real absolute path** if `INSTALL_ROOT` differs from the default
above; `--repo-root` must point at the checkout the runner reads. A clone with a
**stale** state dir accepts the envelope, prints `ok=true`, and is never read —
that asymmetry is exactly what #34 was about.

## What to check on the next run

This is the point of the session, not a formality. The ladder is **policy read
by the research agent, not enforced code** — the validator structurally cannot
see a source conflict (see below). So the first real proof is behavioural:

- Does the run resolve `max_speed` to **150** citing the manual's spec table,
  rather than re-parking `needs-source-resolution` a third time?
- Does it carry a **risk flag** and dispatch **both** reviewers, as the ladder
  requires? A silent auto-ship would be a defect in the rule as written.
- If it re-parks anyway, read the resolution note before touching anything: the
  ladder may need a rung, or the researcher may not be reading the runbook
  section at all. That distinction is the whole finding.

## Why the owner cannot simply supply the number

Do not relitigate this. `OWNER_ATTESTABLE_FIELDS` is
`{enclosure, series, available_plates}` and
`scripts/validate-candidate-evidence.js:55` says *"Nothing numeric may ever be
added — a wrong temperature or speed damages hardware or ruins a print, and no
amount of owner confidence changes that."*
`validate-candidate-evidence-attested.test.js` TC3 asserts rejection per numeric
field, on purpose. The ladder exists because that door is correctly shut.

---

# THEN — #29 `hi` is UNBLOCKED (changed 2026-08-15)

**The 2026-08-12 resume surface said #29 was blocked on #35. That is no longer
true.** #35 closed 2026-08-13 and `epoxy_resin` exists at `engine.js:363` plus
the full compatibility matrix (`engine.js:386-392`).

So the Creality Hi taxonomy decision can proceed through the normal gate:

```bash
node ~/.local/share/3dpa-intake/checkout/3dprintassistant/scripts/intake-owner-decision.js approve-series --candidate hi \
  --repo-root ~/.local/share/3dpa-intake/checkout/3dprintassistant \
  --series-group "Hi Series" --apply
```

Before applying, confirm the parked candidate's plate value actually reflects
`epoxy_resin` — it was researched before the type existed:

```bash
cd ~/.local/share/3dpa-intake/checkout/3dprintassistant && ls scripts/.intake-runner-state/parked/hi/ && node -e 'const fs=require("fs");const d="scripts/.intake-runner-state/parked/hi";const f=fs.readdirSync(d).find(n=>n.startsWith("candidate-"));const p=JSON.parse(fs.readFileSync(d+"/"+f));console.log(JSON.stringify({file:f,series_group:p.printersJsonRow?.series_group,available_plates:p.printersJsonRow?.available_plates,riskFlags:p.riskFlags},null,2))'
```

If it still says `epoxy_flexible` or `textured_pei`, the candidate needs
refreshing before the taxonomy decision — the correct canonical ID is
`epoxy_resin` per [#35](https://github.com/mustiodk/3dprintassistant/issues/35).

---

# Also open, not blocking

- **[#36](https://github.com/mustiodk/3dprintassistant/issues/36) still carries
  the pre-fix text.** `d2c39d3` fixed the generator, but `planSync` leaves an
  existing issue alone, so the sweep will not rewrite it. Close #36 to have the
  next sweep regenerate it correctly, or edit it by hand. Owner call.
- [#33](https://github.com/mustiodk/3dprintassistant/issues/33) — add `seturn` to
  `resinKeywords` + a Scout test. Owner-approved back in `run-20260729T100106Z`
  and never applied; guardrails untouched since 2026-06-15.

---

# AFTER THAT — scope the next iOS train (carried from 2026-08-11)

Unchanged and still valid. This is a **planning and scoping session, not an
implementation session.** The output is a ratified scope for the next iOS train
— which roadmap items ship alongside #32, and which explicitly do not.

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
failure has bitten **four** cold starts. K3
[`2026-08-12-sync-health-reports-current-on-a-stale-feature-branch`](../../../ai-operating-model/docs/findings/2026-08-12-sync-health-reports-current-on-a-stale-feature-branch.md)
proposes moving the mitigation into the `claude-sync` health line, which lives
outside every project repo.
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

**#31 Elegoo primary brand — WEB IS LIVE (`1170a2d` on `main`); iOS ships in the train you are scoping.**
- Design: `docs/superpowers/specs/2026-08-11-elegoo-primary-brand-design.md` (ACCEPTED)
- Plan: `docs/superpowers/plans/2026-08-11-elegoo-primary-brand-plan.md`

The owner declined the overlay route on 2026-08-11, so **Elegoo is a scope item
for this train** — Phase 2 of the plan (one `brands[]` field in the iOS bundled
catalog), and it belongs in the release notes rather than shipping as a silent
data change. It is small, done, and specified; treat it as a freebie in the
scope, not a work item to re-plan.

Why the overlay route was rejected, so it is not relitigated: publishing an
`elegoo` brand row at the current `min_app_version: 1.0.3` **FAILS** the ship
gate — verified by running the real `validateOverlay()` — because builds below
`FIRST_OVERRIDE_MERGE_VERSION` (1.0.5) reject the *entire* overlay on a
bundled-id collision. Taking it would have meant raising `min_app_version` and
permanently ending overlay delivery to 1.0.3/1.0.4 installs, for every future
printer. Not worth it for a cosmetic reorder when a train was being scoped
anyway.

Known limitation, recorded and deliberately unbuilt: `republish-overlay.js` has
**no mode** that can publish or update a brand row on its own (`--add-brand` is
only a rider on `--add-printer`). Real gap, but nothing depends on it under this
decision. Build it if and when a consumer appears.

**Still open:** whether the web-side flag flip ships immediately (project
convention — web is master, lands first) or is held so both surfaces move
together with the train. Does not block anything either way.

---

## Standing rules that bite on this project

- ROADMAP is truth. Read it fully before reporting status — and make sure you are
  reading `main`'s copy, not a feature branch's.
- No mutation on an unverified premise. Verify with a real tool call in the SAME
  turn and state the outcome inline; citing an earlier turn does not count.
- **Validate the fix LOCUS, not just the diagnosis.** New on 2026-08-15: a
  correct diagnosis carried a wrong implementation site into a status report, and
  the proposed rule would have been dead code in a file that structurally cannot
  observe the condition. Before naming an enforcement site, check that the code
  path can see what it is meant to enforce — one `grep` answered it. K3
  [`2026-08-15-recommended-fix-locus-would-have-been-dead-code`](../../../ai-operating-model/docs/findings/2026-08-15-recommended-fix-locus-would-have-been-dead-code.md).
- One finding = one commit.
- Web is master; iOS mirrors `engine.js` byte-identical. **`data/printers.json`
  is deliberately NOT identical** — web 81 printer rows, iOS bundled 78, the
  difference being overlay-delivered rows whose bundled mirror is deferred.
  Never blind-`cp` that file.
- iOS `main` stays push-gated. Web pushes freely.
- **A green local macOS run of the shell suites proves less than a green CI run.**
  bash 3.2 does not apply `set -e` to a failing `[[ ]]`.
- **Several node suites use `node:test`, whose tail line is `ℹ duration_ms`
  regardless of outcome.** Check exit codes, not the last line of output.
- Shell suites mix `#!/usr/bin/env bash` and `#!/bin/zsh`. Invoke via `./"$f"`.
- Committed ≠ deployed. The intake pipeline runs from
  `~/.local/share/3dpa-intake/checkout/3dprintassistant`; verify there.
- **Environment check:** a remote Linux container can do web work, planning, and
  iOS reading/editing, but **cannot** run XCTest, a simulator, or anything
  needing Xcode, and does not have the mac-mini's intake state. Scope the
  session's commitments to the machine it is actually running on.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
This revision was a Trigger A wrap-up (2026-08-15); the #32 scoping block below
the LOCKED NEXT section is preserved from the 2026-08-11 owner ask.
