# My Gear (web) — QA report

**Date:** 2026-08-21 · **Build:** uncommitted working tree on `main` · **Run by:** Claude, in the
in-app browser against the local dev server · **Not pushed.**

## How this was tested

Two independent sources of test cases, deliberately kept apart:

1. **Spec-derived (black box).** A subagent read only
   [the ratified gear spec](../superpowers/specs/2026-08-20-gear-model-v2-spec.md) and
   [the owner decisions](2026-08-20-gear-model-owner-decisions.md) — **not** the implementation —
   and produced 105 acceptance cases plus 17 predictions of where a real implementation
   most likely deviates. Test cases written from the code inherit the code's blind spots;
   these do not.
2. **Change-derived.** My own cases for what was built today: the save chooser, the
   redesigned section, the `+ Add gear` flow, and the catalog-news line.

**95 checks executed in the browser.** Every check ran against real `localStorage`, not a
mock. The owner's own gear data was snapshotted to disk before the run and restored after;
the final state was verified byte-identical to the snapshot.

## Result

| | |
|---|---|
| Checks executed | 95 |
| Passed | 92 |
| **Defects found** | **3** (1 high, 2 medium) |
| Lower-severity observations | 2 |
| Defects in my own test code | 5 (all corrected and re-run) |

Automated suites, run alongside: `walkthrough-harness` green, every `*.test.js` green,
`vitest` 9 files / 62 tests green, `engine-golden-snapshot --check` NO DRIFT (39 states),
`git diff engine.js data/` empty, `grep Engine\. gear-store.js` empty.

---

## F-1 — A page load writes to storage and outranks a real edit · HIGH · introduced today

**What happens.** When the printer catalog has grown since your last visit, merely opening
the app — touching nothing — writes to `3dpa_gear_v1` and advances `settings.updated_at`.

Measured:

```
catalog_seen  {"printers":80}          -> {"printers":83}
updated_at    2026-08-20T00:00:00.000Z -> 2026-08-21T14:13:12.714Z
```

**Why it matters.** `settings.updated_at` is the field that will decide which device wins a
settings conflict once iCloud sync ships. So:

> You set a new default gear on your iPhone at 10:00. At 10:01 you open the web app on your
> Mac and touch nothing. The Mac's settings record is now newer, and it still holds the
> **old** default. Your deliberate choice on the iPhone loses to a page you merely looked at.

This is the exact rule the spec names as load-bearing — §2.3 *"Read-side repair never
writes… A write happens because the user did something, never because a file was read"* and
§4.2 *"Reading must never outrank writing."*

**Blast radius is bounded.** Verified that no gear record is touched — only `settings`. So it
cannot lose a gear; it can lose `active_gear` and `save_prompt_dismissed`.

**Cause.** Mine, in Task 9 today. `gearCatalogNews()` calls `markCatalogSeen()` during render.
The subagent predicted this precisely (its P12) and correctly identified it as a **spec gap**:
the spec defines `catalog_seen` and defines the news line, but never says *when* the counter
should advance.

**Recommended fix.** Advance `catalog_seen` on a user action rather than on render — the
natural moment is when the user opens the printer picker, since that is when they have
actually seen the catalog. The alternative — keep the write but suppress the
`settings.updated_at` bump for a `catalog_seen`-only change — needs a store change and makes
`catalog_seen` non-syncing, which is arguably correct anyway since it is a local
visibility hint. **Owner decision, because it is a spec gap, not just a bug.**

---

## F-2 — A malformed gear is retained in storage but reachable from nowhere · MEDIUM · pre-existing

**What happens.** A gear whose `fields` has no `printer` (hand-edited, written by an older or
buggy build, or produced by a partial sync merge) is flagged `invalid: true` and excluded
from **both** `list()` and `listArchived()`.

Measured, with one such row seeded:

```
diagnostics().gearCount : 4      <- the store knows about it
list()                  : 2      <- not here
listArchived()           : 0      <- nor here
get('orphan_no_printer') : works, inspects as "stale"
```

**Why it matters.** The spec is explicit — §2.5: *"A gear failing required-field validation on
read is **retained, not deleted**, and reported as `stale`. Deleting a user's data because we
could not parse it is the worst available outcome."* The row is retained, but "reported" does
not happen: from the user's seat it is indistinguishable from deleted, and there is no way to
repair it.

Today this needs a malformed envelope, so it is unlikely. **Under sync it stops being
unlikely** — any iOS build or merge that produces a printer-less row makes it silently vanish
on web while still occupying storage.

Note the correct half also holds: the same gear is properly **rejected at write** with
`error: "required-printer"`. Rejected on write, retained on read — the subagent flagged that
implementations usually pick one behaviour for both. This one gets both right; it just never
shows the retained row.

**Recommended fix.** Surface invalid rows in the gear list marked `stale`, using the existing
warning-dot vocabulary, so the user can see and repair them.

---

## F-3 — Archived gears become unreachable below four gears · MEDIUM · pre-existing

**What happens.** `All gears (n)` is the only route to the archived list and its Restore
action, and it only appears at **4 or more** live gears (`GEAR_ALL_THRESHOLD = 4`).

Measured, with everything archived:

```
live gears                 : 0
archived rows in storage   : 3
"All gears" button visible : false
any UI route to archived   : []      <- none, anywhere on the page
```

**Why it matters.** Archive is the app's only delete. Someone with one or two gears who
archives one has no way to get it back. Archive everything and the section shows its
first-run empty state as though the gears never existed — while three rows sit in storage
forever.

**Recommended fix.** Show `All gears (n)` whenever any archived row exists, regardless of the
live-gear threshold. One condition.

---

## Lower-severity observations

**O-1 — "Default" does not mean default.** The badge says `DEFAULT` and the overlay offers
`Set as default`, which reads as a sticky preference. But running any other gear silently
reassigns it. Checked against the spec: the stored field is `active_gear` and D8 says
*"Active gear plus the two most recently used"* — so **the behaviour is correct and the label
is wrong.** Suggest `ACTIVE` / `Make active`, which also matches what iOS will need.

**O-2 — Duplicate gears are accepted silently.** Saving the same printer + nozzle + material
twice produces two identical-looking cards with no warning. Not a spec violation (§2.3 makes
the id the identity and D7 gives the user the name), but confusing. Suggest a "you already
have a gear with these answers" note at save time.

---

## What was verified working

**Storage invariants** — the class that silently loses data. Running a gear moves
`last_used_at` and leaves `updated_at` byte-identical; renaming moves `updated_at` and leaves
`created_at` and `last_used_at` alone; opening the detail overlay writes nothing at all; a
plain page load is byte-identical when the catalog has not grown. Envelope shape is exactly
`v` / `gears` / `settings`, rows carry exactly the seven persisted keys, no `id` inside the
row, settings carry exactly four keys.

**Hostile input** — a gear name of `<img src=x onerror=…>` renders as literal text in both the
card and the overlay, and the handler never fires. A stored `id` field does not beat the map
key. `[]` survives as "pinned as none" and is not collapsed into "ask me".

**Apply semantics** — applying a gear clears the answers an abandoned previous run left
behind rather than inheriting them, while still applying its own fields. A gear pinning a
printer the catalog no longer has stays visible, shows an orange dot, keeps its saved label
readable, leaves the missing field unset rather than guessing, and still applies the parts
that did resolve. The RUN rail is never blocked by a warning.

**Failure handling** — a simulated quota exhaustion returns `{ok:false, error:"quota"}`,
does not throw, and produces no phantom gear.

**The changes made today** — exactly one header button begins with "Save"; the chooser opens
with both options fully described and no dismiss control; the section header carries only
`+ Add gear` and `All gears`; `+ Add gear` clears the configurator, opens the picker, shows
the hint, and opens the save dialog by itself once the three required answers are in, without
reopening after dismissal; the news line is hidden on first run so it never claims 83
arrivals, survives repainting, and never goes negative; both languages relabel cleanly with no
raw keys leaking.

**Persistence** — gears, the active gear, the last configuration, theme and language all
survive a reload. Console is clean (the only 404s are `/api/analytics`, which has no local
Worker in dev).

---

## A note on the test code

Five checks failed on their first run because **my assertion was wrong**, not the app:
a length threshold that rejected the 9-character string "Your gear"; conflating "pre-checked"
with "required"; calling `save()` with three positional arguments instead of one object; a
case-sensitive regex against text the CSS uppercases; and a sequencing error that left
`state.printer` null so the Save button was inert.

Worth recording, because four of the five would have read as product defects if I had not
checked them. The store rejecting my malformed `save()` call with `required-printer` rather
than writing a bad row is itself evidence the write contract works.

---

## Recommendation

**Do not ship until F-1 is decided.** It is a one-line behavioural change once you pick the
moment, but the decision is yours because the spec does not cover it and it changes what
syncs.

F-2 and F-3 are both small and both worth doing before this format is written to in
production, since F-2 becomes materially more likely the moment sync ships.

---

# Round 2 — patches, adversarial review, and what was deliberately left

The three findings above were patched, then the patch set was handed to an **adversarial
reviewer that had not written it**, with instructions to find defects rather than approve.
It returned **NO-GO** with nine findings. Two were serious, and one of those was a
regression the patches themselves introduced. Recording them here because the lesson is
the point: a review of a draft is not a review of the applied fixes.

## R-1 — F-1's fix was incomplete, on the path that matters most for sync · HIGH

The first patch removed the render-time write for the *stale-counter* case but kept it for
**first run**, reasoning that a baseline "costs the user nothing". Measured on a pure
render, touching nothing:

```
settings.updated_at  2026-08-21T10:00:00.000Z -> 2026-08-21T14:40:59.955Z
```

Two things the original reasoning missed. The `settings` unchanged-guard compares
`catalog_seen` maps, and an **absent** counter is not "unchanged" — it is a new key — so
the guard cannot suppress the baseline write. And `catalog_seen` is a web-only news
counter that **iOS has no reason to ever write**, so every settings record arriving from
iOS leaves it absent and re-arms the first-run branch. It would not have fired once per
device; it would have fired on every sync, and each time the next web *render* would
re-win the settings conflict while still carrying iOS's stale `active_gear`.

Fixed by removing the exception rather than bounding it: **no render writes, ever.** First
run still shows no line, and the baseline is recorded by the same user action that spends
any other news. The spec amendment written earlier the same day had ratified the exception
and has been corrected too — leaving it would have frozen the defect into the contract.

**Why round 1's tests missed it:** every F-1 test seeded `catalog_seen: {printers: 80}` —
stale. None seeded it *absent*, which is the different branch.

## R-2 — surfacing invalid gears gave them a destructive action · MEDIUM-HIGH · regression

F-2 made a printer-less gear visible, and the card came with a live RUN rail. Tapping it
called `resetFields()`, wiped a fully configured session, produced an empty configurator,
made the broken row active, and reported **"Loaded"**. Before F-2 the card did not exist,
so the patch created this path.

The QA recommendation was to surface invalid rows "so the user can see and repair them".
Showing the row is the right half; offering an action that cannot succeed is not. Fixed:
an invalid gear renders a dead rail reading "unavailable", and the detail overlay's
Generate button is disabled, both explaining that the printer is missing. Details, Rename
and Archive stay available.

## R-3 — an invalid gear could become the active gear, and broke boot-from-gear · MEDIUM

`gearActiveId` fell back to `gears[0]`, which after F-2 can be an unusable row: the Active
badge lands on it, and `applyBootGear` picks it, finds no printer, returns false, and does
**not** fall through to a working gear — so a user who used to boot straight into their
gear now boots to first-run state. §4.3's fallback exists so the pointer *resolves*; an
unresolvable one defeats it. Fixed by skipping invalid rows in both the hint check and the
fallback.

## R-4 — the duplicate warning could be spent on a different gear · MEDIUM

The armed flag survived a change to the ticked fields. With gears A = `{printer, nozzle,
material}` and B = `{printer, nozzle}`: get warned against A, untick Material, and the set
is now an exact duplicate of **B** — saved with no warning, under a button still reading
"Save anyway" for a set that was never challenged. Fixed by re-arming on any change to the
field checkboxes.

## R-5 — the news was spent by the click that would have revealed the catalog · MEDIUM-LOW

The spend listener covered the whole picker section. A returning user with a saved printer
sees a *collapsed* picker, reads "3 new printers since last time", and clicks the summary
bar to expand it — and that click spent the news. The line names a count but never names
which printers, so it was consumed by the gesture that would have let them look, and was
gone next load. D11 exists solely to counterweight D10's reordering; this discharged it
before it did any work. Narrowed to the catalog surface itself — brand chips, the model
panel, the search box and its results — plus typing a search, which is looking just as
much as clicking is.

## R-6 / R-7 — the count and the rescue label · LOW, fixed because they were one-liners

"N saved" counted rows that cannot be used, which could also push the total across the
all-gears threshold and open that door on a lie; it now counts usable gears. And the
button that *rescues* archived gears read **"All gears (0)"** in exactly the scenario F-3
was filed for; it now counts what the user is actually looking for.

## Deliberately not fixed

**R-8 — `_sameFieldSet` does not deduplicate before comparing.** A value array carrying a
repeat would compare as different and skip the duplicate warning. `handleChipClick` cannot
produce a repeated value, so this is reachable only by hand-editing a share URL, and the
outcome is one un-warned duplicate gear — not data loss. Recorded in a comment at the
comparator. The reviewer's second point on the same finding *was* fixed: the comment cited
§3.1, and the set-equality rule is in §2.4.

**A pre-existing listener leak.** `buildPrinterPicker` adds a `document`-level click
listener on every call and never removes it, so each `buildFilters()` — every language
switch, every gear apply — leaks one. Not introduced by this work, no user-visible effect
at realistic session lengths. Its own commit, later.

## Confirmed correct by the reviewer, no action

The one-shot listener is not orphaned — `buildFilters` clears the container and
`buildPrinterPicker` rebuilds it, so every rebuild re-attaches to the live node, and repeat
marks are absorbed by the unchanged-guard. The news memo is language-safe: it caches only
numbers, and the strings are re-resolved on every paint. F-2 does not affect the "Yours"
brand grouping, and cannot affect duplicate detection. O-1 is clean in both locales with no
consumer hardcoding the old word.

## Cross-platform: what this means for iOS

A parallel read-only survey of the iOS repo found **no gear code and no CloudKit
scaffolding of any kind**, so nothing there is broken today. It did surface one live
defect and one structural obstacle, both recorded rather than fixed here (iOS is gated
behind its own push rule):

- **`WorkshopStore.swift` strips the tombstones web just added.** Its `Profile` type has no
  `archived_at` and no `journal_updated`, and every write re-renders the whole file from
  typed DTOs — so any iOS write silently removes them from every row. This already bites
  through backup export/import: a profile deleted on web returns after an iOS round-trip.
  It is the fourth appearance of the recurrence family the memory note tells us to grep
  adjacent stores for, and the adjacent store was not grepped when the web fixes landed.
- **The iOS persistence idiom cannot satisfy §2.4's "unknown keys are preserved".** Every
  existing iOS store decodes to a typed DTO and rebuilds the file from it, dropping what it
  does not know. `gear-store.js` closes this deliberately, twice. This needs writing down
  as a Swift store contract *before* the first line of iOS gear code, or the house pattern
  will be copied and the rule broken by default.

---

# Round 3 — reviewing the applied fixes, and finding the invariant

The round-2 fixes were handed to a second reviewer, again with no stake in them. It returned
**NO-GO** on three findings, all user-reachable, all costing the user something they had
chosen. All three were the *same defect* on surfaces round 2 had not touched.

## RR-1 — the All-gears overlay still ran unusable gears · BLOCKING

Round 2 gave an invalid gear a dead rail on the card grid and a disabled Generate in the
detail overlay. It missed the third surface. `openGearAll()` rendered a live Generate for
every row and wired all of them. Measured:

```
before   printer=x1c  build_plate=textured_pei  environment=normal
         active_gear = 62757e28…   updated_at = 13:56:21.380Z
click "Generate profile" on the invalid row
after    printer=null build_plate=null          environment=null
         active_gear = qa_orphan   updated_at = 14:52:48.742Z
         toast: "Loaded — some pinned items are gone from the catalog…"
```

The whole configuration destroyed, the chosen default replaced with an id that can never
resolve, reported as "Loaded".

## RR-2 — "Make active" silently replaced the chosen default · BLOCKING

A consequence of RR-3's own fix. `isDefault` is derived from `gearActiveId`, which now skips
invalid rows — so on an invalid gear `isDefault` is *always* false and the button was always
enabled. Clicking it wrote an unresolvable pointer over the user's deliberate choice, toasted
"Active gear updated", and left the badge on a different gear: storage and UI disagreeing,
with no way to set it back.

## RR-3 — the count fix hid the only route to a working gear · BLOCKING

Round 2 moved the all-gears threshold to *usable* gears while the card grid still sliced the
full list. Three usable gears plus one invalid row rendered `[u1, bad, u2]`, showed "3 saved",
and hid the door — leaving `u3` reachable from nowhere. That is F-3's failure mode, reintroduced
by F-3's own neighbouring fix.

Fixed twice over: unusable rows no longer take a card slot from a working gear, and the door
opens on total rows rather than usable ones, so anything pushed off the grid stays reachable.

## The invariant, instead of a fourth patch

Three review rounds, three surfaces, one defect: *an unusable gear was offered an action that
cannot succeed.* `applyGearToState` calls `resetFields()` unconditionally and only then
discovers there is no printer — so every route into it destroys the configuration before
failing.

Patching the fourth surface when it appears is not a fix. The guard now lives at the **sink**:
`applyGear` refuses an invalid gear before touching anything. Verified by calling it directly,
bypassing every UI guard — the configuration survives, `active_gear` is untouched, storage is
byte-identical, and the message explains the missing printer instead of claiming success.

The surfaces still refuse to *offer* the action, because an affordance that cannot work should
not be drawn. But correctness no longer depends on remembering that.

## Accepted without action

The reviewer confirmed findings 1, 3, 4, 9 properly closed, and raised two non-blockers left
as they are: clicking a **brand** chip does not spend the catalog news, because the handler
replaces the chip's DOM synchronously and the click never reaches the delegated listener — the
model panel and the search box both spend correctly, so the effect is one extra load of a line
that is already correct. And with an invalid row present, "2 saved" sits next to "All gears (4)";
both numbers are true of different things and neither misleads about anything actionable.

## Final state

95+ browser checks across three rounds. Every automated suite green: all `*.test.js`, the
walkthrough harness, `vitest` 9 files / 62 tests, `engine-golden-snapshot --check` NO DRIFT
across 39 states, `engine.js` and `data/` untouched, `gear-store.js` free of engine references,
locale parity 358/358 with no key used-but-missing.

The owner's gear data was snapshotted to disk before each round and restored after — final
state verified byte-identical: 2 gears, 0 archived, settings unchanged.
