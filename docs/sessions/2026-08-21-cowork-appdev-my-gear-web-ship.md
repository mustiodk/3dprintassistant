# 2026-08-21 — Cowork (appdev): My Gear ships on web

## Durable context

- **`3dpa_gear_v1` is now frozen for real.** The first production browser write has
  happened. Every future change to that envelope is a compatibility problem, not an edit.
- **Three review rounds each found the same defect on a surface the previous round had not
  touched** — card grid, detail overlay, All-gears overlay. The fix that ended it was not
  the third patch but moving the guard to the sink (`applyGear` refuses an invalid gear),
  so a fourth surface cannot reintroduce it. When a class recurs, patching the next site is
  the wrong move.
- **The in-app browser pane cannot scroll and cannot run animations.** Several checks
  passed because the pane could not produce a failure. Real Chrome found a defect the pane
  had cleared. Filed as [a check that cannot fail is not a check](../../../ai-operating-model/docs/findings/2026-08-21-a-check-that-cannot-fail-is-not-a-check.md).
- **`catalog_seen`'s write trigger was a genuine spec gap**, not just a bug — the spec
  defined the counter and D11 defined the line it feeds, but nothing said when it advances.
  Closed in spec §2.3. The first draft of that amendment ratified the defect (a first-run
  render write) and had to be corrected the same day.
- **iOS can undo web's deletions today.** `WorkshopStore.swift` has no `archived_at` and
  rebuilds its whole file from typed objects on every write, so any iOS write strips the
  tombstones web started writing this morning. Live now via backup export/import, not only
  under sync.
- **D19/D20 settle Pro**: one-time purchase, contains cloud sync + Inventory + AI Expert
  access, ships with free starter credits. Price and credit count deferred — the credit
  number waits on issue #38's D2 gate, which itself waits on D1 (model choice).

## What happened / Actions

**Shipped to production (six commits, all pushed and deploy-verified):**

1. `c52fcf4` — gear-store lists gears that fail validation instead of hiding them
2. `8abe6eb` — My Gear on the web app
3. `82486cf` — QA report, the `catalog_seen` spec gap, two iOS findings
4. `c9a11d2` — a gear is a shortcut, not a finished answer (owner acceptance round)
5. `ee1856e` — D19: what Pro contains
6. `83f5e34` — D20: Pro is a one-time purchase with free credits

**Earlier the same day, before this log's window:** eight data-loss defects in
`workshop-store.js` that were live in production — deletions leaving no record, a version
mismatch that could wipe saved data, a Backup button that could produce a valid-looking
empty file.

**Built:** gear storage (frozen format), validation, the whole web UI to the Claude Design
1a direction, one Save button with two explained options replacing two that both began with
"Save", the catalog-news line, the add-gear strip, rename and remove on the card, and a
FLIP slide when the active gear changes.

**Three review rounds after the build passed its own gates:**

- Round 1 (spec-derived test agent + my own QA): 3 defects, 95 browser checks.
- Round 2 (adversarial review of the patches): **NO-GO**, 9 findings — including that F-1's
  fix was incomplete on exactly the path that matters for sync, and that surfacing invalid
  gears had given them a one-tap destructive action.
- Round 3 (review of the applied fixes): **NO-GO**, 3 blocking — all the same defect on
  surfaces round 2 had not touched.

**Then owner acceptance testing**, which found what none of the reviews did: `+ Add gear`
threw away answers you had already given, the rail promised a finished profile it did not
deliver, and the scroll landed somewhere different every time.

## Files touched

**Modified:** `app.js`, `index.html`, `style.css`, `locales/en.json`, `locales/da.json`,
`gear-store.js`, `scripts/gear-store.test.js`, `roadmap.md`,
`docs/superpowers/specs/2026-08-20-gear-model-v2-spec.md`,
`docs/planning/2-0-PROGRAM-PLAN.md`, `docs/reviews/2026-08-20-gear-model-owner-decisions.md`

**Created:** `docs/reviews/2026-08-21-my-gear-web-qa-report.md`,
`docs/prompts/2026-08-21-claude-design-my-gear.md`,
`ai-operating-model/docs/findings/2026-08-21-a-check-that-cannot-fail-is-not-a-check.md`

**Untouched, deliberately:** `engine.js` and `data/` — verified empty diff at every gate.

## Commits

Six, listed above. All on `origin/main`. Deploy verified against the live site rather than
inferred from a successful push: `app.js` carries all six gear markers, `locales/en.json`
serves 365 keys, `/` serves 17,433 bytes matching local byte-for-byte, and a fresh visit to
3dprintassistant.com renders the empty state with no console errors.

## Open questions / Follow-up

**Blocking nothing, but real:**

- **iOS `WorkshopStore.swift` strips web's tombstones.** Top of Groundwork in the roadmap.
  Live today; gates sync.
- **The iOS storage contract must be written before the first line of Swift gear code.**
  Every existing iOS store rebuilds its file from typed DTOs, dropping unknown keys; the
  gear format requires the opposite.
- **O2b** — what Pro costs. Owner deferred to before go-live; gates App Store product
  creation, not specification.
- **O6** — what one credit is worth. Needs issue #38's D2 (business case + SKU table),
  which needs D1 (provider eval). Both scheduled in Train 2.

**Deliberately not fixed, recorded in the backlog:** `_sameFieldSet` does not deduplicate
before comparing (reachable only by hand-editing a share URL; costs one un-warned duplicate
gear, not data loss), and `buildPrinterPicker` leaks one document-level listener per rebuild.

**Findings filed:**
[a check that cannot fail is not a check](../../../ai-operating-model/docs/findings/2026-08-21-a-check-that-cannot-fail-is-not-a-check.md)
(K1, new — names the invariant behind two instances in two days), and a recurrence appended
to [the VBM shell-vars finding](../../../ai-operating-model/docs/findings/2026-08-20-vbm-flags-shell-vars-before-expansion.md)
(K4 — second session where inline verification did not reach the resolution mechanism).

**Verify-before-mutate ledger, verbatim** — the owner's read of this list is the false-flag
measurement, per the v2 spec's M3:

```
verify-before-mutate ledger: 4 flags (0 resolved_same_turn, 1 resolved_late,
3 unresolved_by_session_end), 2 destructive-core, 89 unclassified, 16 generated-write
  - [resolved_late]              Edit  scripts/browser-globals.test.js (edit)
  - [unresolved_by_session_end]  Bash  /private/tmp/gv-after.js (delete)
  - [unresolved_by_session_end]  Bash  3dprintassistant (repo_destructive)
  - [unresolved_by_session_end]  Bash  3dprintassistant (repo_destructive)
```

One of the two `repo_destructive` flags was earned. I ran `git checkout -- locales/` to
undo a formatting mistake and destroyed **48 uncommitted locale keys** in both languages —
work that had never been committed. I recovered every string verbatim from the app still
running in the browser pane, which had both dictionaries in memory. Nothing was lost, but
the premise ("this only reverts my formatting") was never verified against what else was
uncommitted in that directory.

## Next session

Web My Gear is shipped. The next 2.0 piece is **writing the Pro spec**, which D19/D20
unblocked: contents are settled and the price is a single named value filled in before
go-live. After that, the AI Expert spec — but note its credit section cannot close until
#38's D2, and D2 waits on D1.

Cheaper and independently valuable: the two iOS items at the top of Groundwork, either of
which can be done without touching 2.0's critical path.
