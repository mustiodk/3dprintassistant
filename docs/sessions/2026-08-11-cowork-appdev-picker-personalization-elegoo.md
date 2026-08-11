# 2026-08-11 — Cowork (appdev): picker curation — one goodwill flip shipped, three issues opened, two published claims corrected

## Durable context

- **The pickers were already curated in four separate places, and nobody had
  counted them.** Brands via `primary` in `data/printers.json`; materials,
  nozzles and surface quality via three hardcoded `Set`s in **`engine.js:418-420`**
  (`_CORE_MATERIALS`, `_CORE_NOZZLES`, `_CORE_SURFACE`), tagged onto items by
  `getFilters` (`:499`) and collapsed behind `+N more` by `app.js:746`. The
  question was never "should we hide things" — it was "whose answer decides".
- **Web and iOS feature different materials, and no one chose that.** Web
  `_CORE_MATERIALS` = `pla_basic, pla_matte, petg_basic, abs, tpu_95a`; iOS
  `MaterialPickerView.swift:13-14` `featuredIds` = `pla_basic, pla_matte,
  pla_silk, petg_basic, petg_hf, tpu_95a`. Web features ABS, iOS does not; iOS
  features PLA Silk and PETG HF, web does not. **`_CORE_MATERIALS` lives in
  `engine.js`, the byte-mirrored file — so iOS receives the engine's core set on
  every launch and ignores it.** One decision, implemented twice, two answers, in
  the one file whose entire purpose is that both surfaces agree.
- **The iOS overlay cannot carry a brand row for an already-bundled brand.**
  `validate-ios-printer-overlay.js:262` fails the publish when the brand id is in
  the collision union, because builds below `FIRST_OVERRIDE_MERGE_VERSION`
  (`1.0.5`, `:53`) reject the **whole overlay** on a bundled-id collision rather
  than override-merging it. Verified by running the real `validateOverlay()`
  against two candidate overlays: `min_app_version 1.0.3` FAILS on the guard,
  `1.0.5` PASSES with `collision-checked vs baselines: none`. So "ship a brand
  change remotely" costs raising `min_app_version` and permanently ending overlay
  delivery to 1.0.3/1.0.4 installs — for every future printer, not just the one
  change. Owner declined; Elegoo rides the next binary train.
- **`republish-overlay.js` has no mode that can publish or update a brand row on
  its own.** `--add-brand` exists only as a rider on `--add-printer` (`:144-151`)
  and only appends a brand absent from the payload. Same shape as the 2026-08-10
  `decision-required` finding: a mechanism complete for the case it was built
  for, with the new case falling between its modes. Recorded, deliberately
  unbuilt — nothing depends on it under the owner's decision.
- **The primary-brand row has a hard ceiling of 7 at 320px.** Measured, not
  estimated, by intercepting the `printers.json` response in Chromium and
  re-rendering: 6 → 162px, 7 → 162px, **8 → 218px against a 200px budget**.
  `.printer-brands` is `max-height: 200px; overflow: hidden`, so an 8th brand
  does not wrap or scroll — it is **silently cut off** on small screens with no
  visual cue. Sovol could be promoted free; an 8th needs that `max-height`
  touched first.
- **Printer usage data exists and is already surfaced** — `profile_generated`
  carries `printerBrand`/`printerModel`/`printerSeries` (`analytics.js:37-40`,
  blob8/9/10), with a `top_printers` canned query (`analytics-query.js:99`) and a
  "Most common printers" dashboard card (`analytics.html:791`). **But ordering the
  picker by it would be self-confirming:** position drives visibility drives
  usage, so a brand behind "show more" can never out-measure the five above it —
  the rule would have made this session's change impossible to arrive at. It also
  counts events, not people; there is no session/device id to dedupe on by
  privacy design. Keep `sort_order`/`primary` editorially owned.
- **`validateOverlay()` takes file *paths*, not objects.** Called with objects it
  silently reads the on-disk overlay and returns a meaningless PASS. The first
  attempt this session did exactly that and looked like good news; it was caught
  only because the summary said "2 brands" when three had been passed. **Check
  that a tool's output describes what you actually gave it.**

## What happened / Actions

1. **Cold start (both repos).** Web was current with `origin/main` at `02ccf00`
   on a feature branch that shared main's commit. `3dprintassistant-ios` was not
   in the container — added via `add_repo` and cloned to
   `/home/user/3dprintassistant-ios` at `4a03c9d` (1.1.4). Verified `engine.js`
   byte-identical both sides (md5 `bb99e9e7…`, matching the ROADMAP's recorded
   production hash), `materials`/`nozzles`/`rules` identical, and the printer
   delta exactly the three documented overlay-delivered rows.
2. **Owner asked for two feature issues**; research turned both into something
   more specific than the brief.
3. **#30 default printer** — found the state is *already* persisted on both
   surfaces, and the gap is one unconditional `router.push(.brandPicker)` at
   `HomeView.swift:91`. Later superseded and closed.
4. **#31 Elegoo → primary** — found the one-boolean mechanism, then the overlay
   collision guard that blocks the fast delivery route.
5. **Investigated usage-based ordering** at the owner's request; recommended
   against it on feedback-loop grounds and recorded why.
6. **#32 modular picker** — owner reframed default-printer into "my gear"
   (printers *and* filaments). Found the ratified prior art (SYN-10 / SYN-13 /
   SYN-09) that makes it free, local-first, and app-layer by owner-locked
   decision. #30 closed as superseded.
7. **Spec + plan written for #31**, owner declined the overlay route, decision
   recorded across all three docs.
8. **Shipped the web flip** through the plan's Phase 1, including a real Chromium
   layout gate, then merged to `main` on owner instruction.
9. **Corrected two published claims** — the overlay-is-free claim (#31) and the
   web-has-no-featured-materials claim (#32), the latter caught from an owner
   screenshot of the live site.

## Files touched

**Added**
- `docs/superpowers/specs/2026-08-11-elegoo-primary-brand-design.md`
- `docs/superpowers/plans/2026-08-11-elegoo-primary-brand-plan.md`
- `docs/sessions/2026-08-11-cowork-appdev-picker-personalization-elegoo.md` (this file)

**Modified**
- `data/printers.json` — one field, `elegoo.primary` `false → true`
- `docs/sessions/NEXT-SESSION.md` — regenerated on explicit owner ask
- `docs/planning/ROADMAP.md`, `docs/sessions/INDEX.md`

## Commits

| sha | what |
|---|---|
| [`882d87d`](https://github.com/mustiodk/3dprintassistant/commit/882d87d) | `docs(picker): spec + plan for Elegoo in the primary brand row` |
| [`8e0b495`](https://github.com/mustiodk/3dprintassistant/commit/8e0b495) | `docs(picker): record owner decision — Elegoo rides the next iOS train` |
| [`1170a2d`](https://github.com/mustiodk/3dprintassistant/commit/1170a2d) | `feat(data): show Elegoo in the primary brand row` |

Merged to `main` and pushed `02ccf00..1170a2d`.

**GitHub issues:** [#30](https://github.com/mustiodk/3dprintassistant/issues/30)
(created, closed as superseded), [#31](https://github.com/mustiodk/3dprintassistant/issues/31)
(created, spec/plan/decision recorded), [#32](https://github.com/mustiodk/3dprintassistant/issues/32)
(created, body corrected).

## Verification

- `validate-data.js` pass · `walkthrough-harness.js` exit 0, 21/21, 0 failures ·
  `engine-golden-snapshot.js --check` **NO DRIFT (39 states)** — as predicted,
  `primary` feeds no emission.
- Primary set proven **contiguous** `1:bambu_lab … 6:elegoo`, not merely
  count-6 — contiguity is the assertion that proves it is still "top N by
  `sort_order`" rather than an arbitrary subset.
- **Real Chromium layout gate** at 1280px (46px used of 200px) and 320px (162px
  of 200px), zero clipped chips; screenshots captured.
- **Ceiling measured** at 320px by response interception: 6 ✅, 7 ✅, 8 ❌ clipped.
- Overlay claim proven by executing `validateOverlay()` on two candidate files
  (see Durable context), after the first attempt's argument-shape error was
  caught and redone.
- **Not verified — honest limits.** Production `curl` is blocked by this
  container's network policy (`CONNECT tunnel failed, 403`), so the deploy of
  `1170a2d` was **not** confirmed live from here; owner verifies with a hard
  refresh. iOS XCTest and simulator checks were not run — no macOS in a Linux
  container. Plan Phase 2 (iOS bundled) is therefore untouched, as designed.

## Open questions / Follow-up

- **iOS bundled Elegoo mirror** — plan Phase 2, one `brands[]` field, next
  release train. Belongs in the **release notes**: a user asked for it.
- **Primary-set ceiling is 7.** Promoting Sovol is free; an 8th brand requires
  changing `.printer-brands` `max-height` first, or it silently truncates on
  small screens.
- **Nothing guards the live primary set** — every `primary` in web and iOS tests
  is a fixture. Plan Task 2 specs a contiguity assertion; not done.
- **Web vs iOS featured-material divergence** — standalone fix, or let #32 make
  it moot? Recorded as #32 Q8.
- **`--upsert-brand` republish mode** — real gap, deliberately unbuilt, no
  consumer under the owner's decision.
- **#32 is blocked on two owner decisions** before design can start: storage
  shape (new store vs additive Workshop section) and one-printer-vs-several.
- **Unchanged from the previous session:** intake decisions #28/#29 (researched,
  mac-mini-only to execute), 68 bare `[[ ]]` shell assertions, iOS CI's 4
  unpushed commits.
- **VBM ledger:** the verify-before-mutate tooling is not present in this remote
  container, so no ledger was produced. Not a clean run — an absent instrument.
  The one verification miss worth recording without it is the
  `validateOverlay()` argument-shape error above, which was caught in-session and
  redone before any claim rested on it.

## Next session

Scope the next iOS train around #32. `NEXT-SESSION.md` carries the task, the two
blocking decisions, and a pre-built candidate inventory from the full roadmap so
that session starts at analysis rather than collection. Elegoo is carried in as a
settled scope item, not a work item to re-plan.
