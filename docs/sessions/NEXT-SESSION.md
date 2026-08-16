# 3dpa — Next Session Kickoff

**Purpose:** the two owner-decided printers reached the evidence gate for the
first time on 2026-08-16 and both parked. Each has **exactly one repair pass
left**. This file leads with that repair, because the window closes at the next
scheduled run; the #32 iOS-train scoping block follows it, unchanged.

**Last updated:** 2026-08-16, after the iMac cold start that read
`run-20260816T100246Z` and corrected its stated cause.

**MACHINE: this session must run on the mac-mini.** The parked sidecars are
gitignored and host-local; `intake/ender_3_s1_pro` and `intake/hi` are **not** on
origin, and `~/.local/share/3dpa-intake/` does not exist on the iMac. Verified
2026-08-16.

---

# THE SESSION — repair the two parked packets

## What actually happened on 2026-08-16

`run-20260816T100246Z` consumed both owner decisions from 2026-08-15. The
research half went **well**:

- **The manufacturer-conflict ladder passed its first real test.**
  `ender_3_s1_pro` resolved `max_speed = 150 mm/s` from the *same two sources
  already on file* — the manual's spec table over a store-page title, rung 1 as
  written. No new sources were needed, matching shipped sibling `ender_3_s1`.
- **`hi` self-corrected its plate taxonomy.** Fully re-researched against live
  Creality pages, it redrafted the non-catalog `epoxy_flexible` to `epoxy_resin`
  on its own. The vocabulary gate added in `50442b7` never had to fire.

Both then cleared every mechanical gate — `validate-data`, picker-dry-run,
walkthrough combo 22, profile-matrix-audit, `intake-diff-guards PASS` — and
**failed the final evidence gate**, `validate-candidate-evidence.js`, run once
against branch HEAD per contract. Both parked `auto-parked:research-defect` with
branch and packet preserved for one repair pass. No review turn was spent.

Fail-closed held end to end, verified on the iMac: the four ship commits
(`3b7b70a`, `47ad2ea`, `1fcbb24`, `d6551fc`) are **not** ancestors of `main`,
neither printer is in bundled `data/printers.json`, and production still serves
`content_version=2026080801` — the branches' `2026081601` never published.

## Correction: there was no 2026-08-15 schema tightening

**Do not repair on the run's stated premise.** Its resolution note says the
absence rationale *"predates the 2026-08-15 canonical-source-identity +
notes-metadata schema tightening."* That tightening does not exist:

| Claim | Ground truth (verified 2026-08-16) |
|---|---|
| canonical-source-identity rule tightened 08-15 | Introduced **2026-07-10** in `56d139a`, unchanged since |
| source normalizer tightened 08-15 | `scripts/lib/intake-source-normalizer.js` has **one commit in its entire history** — `56d139a`, 2026-07-10 |
| notes-metadata tightened 08-15 | No 08-15 commit touches notes metadata |
| the 08-15 commits changed the validator | Only `50442b7` touches it, and only to add **plate-id vocabulary**. `733e9fb`, `d2c39d3`, `a9a9392`, `7e1df57` touch it **zero** times |

**The likely real cause** (hypothesis — confirm against the packet, which is
mac-mini-local): the packet's absence rationales have been non-conforming since
they were authored, and nothing surfaced it because the candidate **always died
earlier**, on the unresolved `max_speed`. The gate is single-shot. Now that the
ladder unblocked `max_speed`, the packet reached a check it had never reached
before. Not a new defect — a newly *visible* one.

This is the [fix-locus family](../../../ai-operating-model/docs/findings/2026-08-15-recommended-fix-locus-would-have-been-dead-code.md)
again: a sourced *what* does not license the *where*.

## THE TRAP: fixing the reported error is not enough

`validate-candidate-evidence.js:362-368` errors on **any** field whose
`absenceRationale.checkedSources[].canonicalSource` is not already normalized,
then `continue`s — skipping the deeper check for that field. So canonicalising
the URLs **moves** the error rather than removing it.

Behind it, at line 370, `fieldPasses` runs. And:

```js
ABSENCE_BOOLEAN_FIELDS = { active_chamber_heating, has_camera, has_lidar }   // :36-40
CRITICAL_FIELDS        = [ ..., multi_color_systems, ... ]                    // :6-21
OWNER_ATTESTABLE_FIELDS = { enclosure, series, available_plates }             // :69
REPO_CONVENTION_FIELD   = open_door_threshold_bed_temp                        // :42
```

**`multi_color_systems` is CRITICAL but is not in `ABSENCE_BOOLEAN_FIELDS`.** It
is not owner-attestable and it is not the repo-convention field. So the
absence-rationale route **can never satisfy it**, no matter how canonical its
sources are. It must pass `hasValidManufacturerSource` (`:177-189`).

If you canonicalise all four fields and re-run, `multi_color_systems` will fail
with `missing or insufficient manufacturer evidence` and the repair pass is
gone. **Fix both layers in the same edit.**

## The two source formats are NOT the same shape

This asymmetry is the thing to get right. From `intake-source-normalizer.js`,
`canonicalSource()` strips the scheme, lowercases the host, drops a leading
`www.`, drops the hash, deletes `utm_*`/`ref`, sorts the query, and trims
trailing slashes. And `isCanonicalSourceIdentity(v)` is true only when
`canonicalSource(v) === v` — the value must **already be** in that form.

| Where | Required form | Example |
|---|---|---|
| `field.source` (manufacturer route) | **full URL**, must parse as http/https | `https://www.creality.com/products/ender-3-s1-pro` |
| `absenceRationale.checkedSources[].canonicalSource` | **normalized**, no scheme, no `www.`, no trailing slash | `creality.com/products/ender-3-s1-pro` |

Same page, two different strings, in the same packet. Getting this backwards is
the single easiest way to burn the pass.

## Target shapes

`multi_color_systems` — manufacturer route, **not** absence. Shipped sibling
`ender_3_s1` carries `[]`, and all 81 catalog rows have the key, so an empty
array is correct and expected, not a gap:

```json
"multi_color_systems": {
  "value": [],
  "confidence": "confirmed",
  "evidenceType": "manufacturer",
  "source": "https://www.creality.com/products/ender-3-s1-pro"
}
```

`active_chamber_heating` / `has_camera` / `has_lidar` — absence route. Every
element below is required by `hasAbsenceRationale` (`:135-156`); a missing
`omissionSafeBecause` fails as hard as a bad URL. At least one entry in
`sourceClassesChecked` must be in `MANUFACTURER_SOURCE_CLASSES` (`:28-34`), and
`hasCompleteSourceSweep` wants `official-product-page` + `manual` +
`support-wiki`:

```json
"has_camera": {
  "value": false,
  "evidenceType": "absence-rationale",
  "absenceRationale": {
    "sourceClassesChecked": ["official-product-page", "manual", "support-wiki"],
    "checkedSources": [
      { "canonicalSource": "creality.com/products/ender-3-s1-pro",
        "retrievedAt": "2026-08-16T10:02:46Z" }
    ],
    "normallyAdvertisedIfPresent": "...",
    "omissionSafeBecause": "..."
  }
}
```

## `hi` is a different failure — parity, not evidence

`hi`'s error is `validateMaterializedParity` (`:246`): the packet's
`printersJsonRow.notes` array does not match the materialized `data/printers.json`
row. That is a straight diff-and-align job, not an evidence problem. Diff the two
arrays first; do not assume which side is right — the packet was re-researched
this run, so the packet may well be the correct side.

## Order of work

1. **Do not run the intake pipeline yet.** The repair pass is consumed by the
   next run, so every check below happens first.
2. Read both parked packets under `~/.local/share/3dpa-intake/`. Confirm or kill
   the hypothesis above against what is actually written.
3. Fix `ender_3_s1_pro` **both layers at once**: canonicalise every
   `checkedSources[].canonicalSource`, and move `multi_color_systems` onto the
   manufacturer route.
4. Fix `hi`: diff packet notes vs the catalog row, align, decide which side is
   authoritative and say why.
5. **Verify locally before the run touches it** — this is the whole point:
   ```bash
   node scripts/validate-candidate-evidence.js <packet> --printers-json data/printers.json
   ```
   Iterate here as many times as you like. The single-shot contract applies to
   the *pipeline*, not to your own invocation.
6. Only when both return `ok=true`, let the scheduled run take them — or trigger
   deliberately if the owner prefers.
7. Check that checkout's own HEAD first: `~/.local/share/3dpa-intake/checkout/3dprintassistant`
   was found **three commits behind** on 2026-08-15. It self-syncs at run start,
   but your hand-edits happen before that.

---

# AFTER THE REPAIR — scope the next iOS train

Carried unchanged from 2026-08-11/08-15. **Planning and scoping, not
implementation.** Output is a ratified scope: which roadmap items ship alongside
#32 and which explicitly do not.

**Anchor:** [#32](https://github.com/mustiodk/3dprintassistant/issues/32) —
modular picker; user-selected printers + filaments, replacing today's hardcoded
curation (`primary` for brands, `_CORE_MATERIALS`/`_CORE_NOZZLES`/`_CORE_SURFACE`
at `engine.js:418-420`, and iOS's own `featuredIds`).

Two owner decisions block design (issue §Open questions Q1, Q3) — **answer these
first:**

1. **Storage shape** — a new `3dpa_gear_v1`-style store, or an additive section
   on the existing Workshop envelope (which is also the backup format)? SYN-09
   freezes whatever is chosen forever, so this is the load-bearing call.
2. **One printer or several?** "Your printer" vs "the 3 you own, default to one."

**Strong pairings** (same surfaces, same code, same review): iOS light mode /
system appearance · PR-4 navigation architecture · PR-5 accessibility & visual
polish · PR-2 view models for pickers.

**Cheap independents:** #31 Elegoo iOS half (web live) · #2 Workshop re-save ·
#4 export backup provenance · #25 build-volume field · `max_mvs` 0.8mm gap.

**Deliberately exclude:** Feedback Diagnostics v2 (own train, owner-gated) ·
Android AG0 (separate program) · My 3DPA / MG0 (#32 is the *free local-first*
slice; do not let it drag sync in) · #5/#12 dashboard asks · the 4 selection
events still 400ing (needs its own owner decision).

**Version:** 1.2.0 if #32 lands, 1.1.5 if scope collapses to fixes. Version =
release train, build number = iteration.

**Release state:** 1.1.3 is public. **1.1.4 is implementation-complete locally
and gated on owner authorization** — iOS push, TestFlight dispatch, device
acceptance, authenticated explicit-zero dashboard check. The train scoped here
comes *after* 1.1.4 ships.

---

# Cold start

>>> START >>>

Cold start 3dpa.

**Read in order:**
1. `Projects/CLAUDE.md` (top-level protocol — routing + standing rules)
2. `3dprintassistant/CLAUDE.md` (project rules)
3. `3dprintassistant/docs/3dpa-context.md` (evergreen architecture, engine API, app state)
4. `3dprintassistant/docs/planning/ROADMAP.md`
5. `3dprintassistant/docs/sessions/INDEX.md`
6. The last 3 session logs in full
7. This file

**Repo health first — check the BRANCH, not just the health line.** Run
`git branch -vv` and confirm which branch you are on before trusting any local
ROADMAP or NEXT-SESSION; a checkout parked on a feature branch reads "current"
against its own upstream while `main` is dozens of commits ahead. That exact
failure has bitten **four** cold starts. K3
[`2026-08-12-sync-health-reports-current-on-a-stale-feature-branch`](../../../ai-operating-model/docs/findings/2026-08-12-sync-health-reports-current-on-a-stale-feature-branch.md).
`3dprintassistant-ios: N unpushed` is expected (push gate), not a problem.

**Also expect a wedge, not just drift.** On 2026-08-16 `~/.claude` sat 18 commits
behind for ~4 days because an autostash-pop conflict left an orphaned `UU` with
no `MERGE_HEAD`, which health reports as plain `dirty` — non-blocking under SF-2.
Three per-machine files were untracked to fix it (`4aceea6e` in `~/.claude`). If
health says `dirty`, run `git ls-files -u` before trusting it.

## Standing rules that bite on this project

- ROADMAP is truth. Read it fully before reporting status — from `main`, not a
  feature branch.
- No mutation on an unverified premise. Verify with a real tool call in the SAME
  turn and state the outcome inline; citing an earlier turn does not count.
- **Validate the fix LOCUS, not just the diagnosis.** Before naming an
  enforcement site, check the code path can observe what it is meant to enforce.
- **A tool's own account of why it failed is a claim, not evidence.** The
  2026-08-16 run named a schema tightening that never happened; two `git log`
  calls disproved it. Check the commit before repairing on its premise.
- **Look for the applier before hand-editing generated or ratified state.** A
  file carrying `version` / `_provenance` / `lastRatified` has a writer.
- **When a field has an allowlist, enumerate every writer that can set it.**
- One finding = one commit.
- Web is master; iOS mirrors `engine.js` byte-identical. **`data/printers.json`
  is deliberately NOT identical** — never blind-`cp` it.
- iOS `main` stays push-gated. Web pushes freely.
- **A green local macOS run of the shell suites proves less than a green CI run.**
  bash 3.2 does not apply `set -e` to a failing `[[ ]]`.
- **Several node suites use `node:test`, whose tail line is `ℹ duration_ms`
  regardless of outcome.** Check exit codes, not the last line.
- Committed ≠ deployed, and a fixed generator ≠ fixed published artifacts. The
  intake pipeline runs from `~/.local/share/3dpa-intake/checkout/3dprintassistant`;
  verify there, and check that checkout's own HEAD — it is a separate clone.
- **Environment check:** this session needs the **mac-mini**. Intake state is
  host-local; the iMac and any Linux container cannot see the packets, and
  neither can run XCTest or a simulator.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
This revision was a Trigger A wrap-up (2026-08-16, iMac). The locked entry point
changed from #32 scoping to the two-packet repair because the repair window
closes at the next scheduled run; #32 scoping is preserved below it, unchanged.
