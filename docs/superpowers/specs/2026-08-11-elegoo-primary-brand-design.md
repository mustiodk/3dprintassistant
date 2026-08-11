# Elegoo in the primary brand row — Cross-Platform Design

**Status:** DRAFT — awaiting owner GO.
**Date:** 2026-08-11.
**Issue:** [#31](https://github.com/mustiodk/3dprintassistant/issues/31).
**Release scope:** web production immediately; iOS delivery route is an owner
decision (§4).

## 1. Product intent

A user requested Elegoo visibility alongside a positive App Store review. This
change is a deliberate act of goodwill toward that user, and toward anyone else
who owns an Elegoo printer and currently has to expand "show more" to find it.

The justification is editorial, not statistical, and that is intentional. Ranking
the picker by measured usage would be self-confirming — position drives
visibility, visibility drives usage — and would have made this change impossible
to arrive at, since a brand hidden behind "show more" can never out-measure the
five brands above it. Reserving the primary set as an owner-editorial decision is
what makes a gesture like this possible at all. See the open question in #31.

## 2. The change

One boolean, in one file:

```diff
-{ "id": "elegoo", "name": "Elegoo", "sort_order": 6, "primary": false, "default_slicer": "orcaslicer" }
+{ "id": "elegoo", "name": "Elegoo", "sort_order": 6, "primary": true,  "default_slicer": "orcaslicer" }
```

Elegoo is **already `sort_order` 6**, so the primary row becomes exactly the top
6 by sort order with no reordering of anything else. Both surfaces already
consume the flag:

- web — `app.js:472`, `const visible = pickerShowMore ? brands : brands.filter(b => b.primary);`
- iOS — `BrandPickerView.swift:7-8`, `filter(\.primary)` / `filter { !$0.primary }`

No engine logic, no UI code, no CSS, no locale strings. `primary` feeds no
profile emission, so the golden snapshot must report **NO DRIFT**; if it moves,
something reads this flag that should not.

## 3. Correction to an earlier claim

An earlier statement in the 2026-08-11 session — that this reaches existing iOS
users purely through an overlay republish, with no App Store release — was
**incomplete**. The merge mechanism is real, but the ship gate blocks the publish
at the current `min_app_version`. §4 is the corrected picture.

## 4. Delivery routes

### R1 — Web (no constraint)

Flip the flag, push, Cloudflare auto-deploys from `main`. Immediate, reversible,
no gate beyond the normal ones.

### R2 — iOS bundled (next binary train)

Same one-field edit in the iOS bundled `printers.json`, shipped whenever the
next train goes out. Zero risk, but reaches nobody until that release.

**Do not `cp` the whole file.** Web `printers[]` is 81 rows, iOS bundled is 78 —
`ender_3_s1`, `kobra_2_neo`, `adventurer_3` are overlay-delivered with their
bundled mirror deliberately deferred. A blind copy silently lands three
printers this change never intended to ship. Edit the one `brands[]` field.

### R3 — iOS overlay (reaches existing installs — but not for free)

The remote overlay already carries brand rows, and `PrinterCatalogProvider`
merges them **replace-by-id** (`:309-326`), so an `elegoo` row with
`primary: true` would override the bundled `primary: false` on any install that
fetches it.

**The ship validator refuses to publish it at the current `min_app_version`.**
Verified 2026-08-11 by running the real `validateOverlay()` against two candidate
overlay files:

| `min_app_version` | Result |
|---|---|
| `1.0.3` (current) | **FAIL** — `overlay brand elegoo already exists in a bundled baseline in [1.0.3, 1.0.5) (pre-override-merge builds reject the whole overlay on collision)` |
| `1.0.5` (raised) | **PASS** — `ok: 3 brands, 12 printers (collision-checked vs baselines: none)` |

The guard is correct and load-bearing. `FIRST_OVERRIDE_MERGE_VERSION` is `1.0.5`
(`validate-ios-printer-overlay.js:53`): builds **below** 1.0.5 do not
override-merge, they **reject the entire overlay** on any collision with their
bundled catalog. `elegoo` is present in the `1.0.3` and `1.0.4` baselines
(verified against `catalog/ios-bundled-catalog-baselines.json`). So publishing an
`elegoo` brand row at `min_app_version: 1.0.3` would not merely fail to help
those users — it would **strip all 12 overlay printers** from them, including
`k2_se`, `centauri_carbon_2`, `sv06_ace` and `u1`.

Taking R3 therefore means raising `min_app_version` `1.0.3 → 1.0.5`, which
**permanently ends overlay delivery to 1.0.3 and 1.0.4 installs** — not just for
this change, but for every future printer.

### Recommendation

**R1 + R2 by default. R3 only if the version data says it is free.**

Trading remote printer delivery for old-build users against a cosmetic brand
reorder is a bad exchange on its face. But it may cost nothing: 1.0.5 shipped in
June and 1.1.4 is current, so the 1.0.3/1.0.4 population may well be zero.

That is **measurable before deciding** — `blob5` carries `app_version` on every
event, and `/analytics` already has release-health and version diagnostics. If
combined 1.0.3 + 1.0.4 activity over 90 days is zero, raising `min_app_version`
is free, R3 becomes available, and the raise is defensible hygiene independent of
this change. If it is non-zero, R2 is the honest answer and Elegoo rides the next
train.

Note the requester is an App Store reviewer, i.e. an iOS user — so R1 alone does
not reach the person this is for. That is an argument for resolving the version
question now, not for accepting the R3 trade blindly.

## 5. Tooling gap — `republish-overlay.js` cannot express this change

Every mode is printer-centric: `--add-printer`, `--rollback-to`, `--set-enabled`,
`--snapshot`, `--bump-version`. `--add-brand` exists only as a **rider on
`--add-printer`** (`:144-151`) and only appends a brand absent from the payload;
there is no way to publish or update a brand row on its own.

So R3 cannot be executed with the sanctioned tool as it stands. The options are a
hand-edited overlay — exactly the hand-hash gap the script was written to close
(`:4-7`) — or a new mode. **A new mode, TDD-first, is the only acceptable
route**; it reuses `nextVersion`, `freshEnvelope` and `writeValidated`, so the
version rules and the ship validator still gate the publish.

This is the same shape as the `decision-required` finding from 2026-08-10: a
mechanism that is complete for the case it was built for, with the new case
falling in the gap between its modes.

## 6. Non-goals

- **Not** changing `sort_order` for any brand.
- **Not** making picker order usage-derived (#31 open question; see §1).
- **Not** touching the iOS hardcoded `featuredIds` material list — that is #32's
  territory.
- **Not** landing the three deferred bundled printers (§4 R2).
- **Not** promoting Sovol or FlashForge. If the primary set deserves a wider
  review, that is a separate decision, taken once, not per-brand.

## 7. Risks

| Risk | Assessment |
|---|---|
| Web layout — a 6th chip clipped by `.printer-brands { max-height: 200px; overflow: hidden }` | Low. `.chips` is `display:flex; flex-wrap:wrap`, so chips reflow; 6 chips fit inside 200px at desktop widths. **Must be eyeballed at 320px**, where wrapping is worst and headroom is thinnest. |
| iOS layout | None. `BrandPickerView` uses a 2-column `LazyVGrid` inside a `ScrollView`; 6 brands is 3 rows. |
| Test coverage | **Nothing guards the live primary set.** Every `primary` occurrence in web and iOS tests is a fixture. This change cannot break a test — and equally, nothing would catch an accidental future flip. Consider a cheap assertion as part of the work. |
| Golden snapshot drift | Expected NO DRIFT. Any drift means something reads `primary` that should not — stop and investigate rather than re-baseline. |

## 8. Owner decisions required

1. **GO on the flag flip** (R1 + R2).
2. **R3 yes/no**, after reading 1.0.3 + 1.0.4 activity on `/analytics`.
3. If R3 is yes: confirm raising `min_app_version` to `1.0.5` as a standing
   change, not a one-off.
