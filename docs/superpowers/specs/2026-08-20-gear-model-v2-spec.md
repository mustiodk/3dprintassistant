# 2026-08-20 — Gear model v2: specification

**Status:** draft for review. Supersedes §2 of
[`2026-08-17-next-gen-platform-design.md`](2026-08-17-next-gen-platform-design.md)
in full.

**Authority:** owner decisions D1–D17, recorded in
[`../../reviews/2026-08-20-gear-model-owner-decisions.md`](../../reviews/2026-08-20-gear-model-owner-decisions.md).
Where this spec and the 2026-08-17 spec disagree, this one wins. Where this spec and the
2.0 UI design disagree, **the owner decides** — the design is input, not requirements.

**Why v2 exists.** The 2026-08-17 model was ratified, planned, built on a branch, reviewed
clean, and then found to describe a different product than the owner's. The
[mismatch review](../../reviews/2026-08-20-train1-vs-2-0-design-mismatch-review.md) records
the 14 findings; this spec is the replacement. Nothing from the parked branch has reached a
user, so the storage format is still free — that freedom is the reason this document
exists before any further code.

---

## 1. The model

**A gear is a shortcut.** It is a named, partial snapshot of the configurator that lets a
returning user skip the questions whose answers do not change between prints. It is *not*
an inventory of what the user owns.

> "det skal ses som en genvej til at springe led over.. min gear er ikke bare et udstyr og
> de filamenter brugeren har.. den er en genvej" — owner, D1

Three consequences follow, and they define the whole design:

1. **There is no ownership layer.** No stored pool of printers, nozzles or filaments.
   Where the app needs to know what a user has — to lead the pickers with their own
   brands (D10) — it derives that from their gears.
2. **The split is stable vs. per-print**, not hardware vs. intent. Anything that does not
   change from print to print may live in a gear (D2).
3. **A gear may pin any configurator field**, not a fixed set (D3). The seven defaults are
   an offer, not a schema.

Most users own one printer and keep several gears for it, differentiated by nozzle and
filament (D1). Printer name is therefore not a gear's distinguishing feature, which
governs how gears are rendered and named.

### 1.1 Default fields

When the app offers to save a gear it pre-selects seven fields (D2):

`printer` · `nozzle` · `material` · `build_plate` · `environment` · `profileMode` ·
`extruder_type`

Everything else is asked per print by default: `useCase`, `surface`, `strength`, `speed`,
`support`, `colors`, `special`, `ironing`, `brim`, `seam`, `filament_condition`,
`userLevel`. Any of them may be pinned by the user (D3).

`environment` and `profileMode` living in a gear is a **deliberate reversal** of the
2026-08-17 spec, which listed environment among the per-print fields "a setup never pins."

### 1.2 Lifecycle

- **Birth:** only by saving after a completed configurator run (D6). There is no
  build-a-gear form. A checkbox dialog appears with the seven defaults pre-checked and
  every other answered field available to tick (D5).
- **Name:** pre-filled from hardware — `X1C · 0.4 · PLA Basic` — and overwritable (D7).
- **Use:** Home shows three cards — the active gear and the two most recently used — with
  an "all gears" row at four or more (D8). Tapping a card opens a review overlay; a
  generate control on the card runs straight through (D4).
- **Death:** archived, never hard-deleted (carried forward from the 2026-08-17 lifecycle
  rule, which was sound).

### 1.3 Explicitly out

- Any stored ownership pool (D1).
- A build-a-gear page (D6).
- AMS as a stored field — it is derived from the printer's catalog entry
  (`engine.js:1053-1080`); the user-facing question is `colors`, a per-print field.
- Referral (D17).

---

## 2. Storage

### 2.1 Key and versioning

Web: `localStorage` under **`3dpa_gear_v1`**. iOS: a Codable JSON file beside
`app-state.json`, byte-compatible with the web envelope.

The key is unchanged from the 2026-08-17 spec because **nothing was ever written to a real
user** — the branch that would have written it is parked and unmerged. `v1` therefore
still means "the first shape users see," which is what the forever promise attaches to.

**Forever promise, restated with the mechanism that makes it affordable.** The envelope's
extension point is `fields`, an open map keyed by the engine's own filter keys. New engine
fields become pinnable with no envelope change and no migration. This is the structural
answer to the problem that made the v1 model expensive to get wrong.

### 2.2 Envelope

```json
{
  "v": 1,
  "gears": {
    "6f1e…": {
      "id": "6f1e…",
      "name": "X1C · 0.4 · PLA Basic",
      "fields": {
        "printer": "x1c",
        "nozzle": "std_0.4",
        "material": "pla_basic",
        "build_plate": "textured_pei",
        "environment": "normal",
        "profileMode": "safe",
        "extruder_type": "direct"
      },
      "labels": {
        "printer": "X1 Carbon",
        "nozzle": "0.4 Standard",
        "material": "PLA Basic"
      },
      "created_at":  "2026-08-20T19:00:00.000Z",
      "updated_at":  "2026-08-20T19:00:00.000Z",
      "last_used_at": "2026-08-20T19:05:00.000Z",
      "archived_at": null
    }
  },
  "settings": {
    "active_gear": "6f1e…",
    "catalog_seen": { "printers": 0, "materials": 0 },
    "save_prompt_dismissed": false,
    "updated_at": "2026-08-20T19:05:00.000Z"
  }
}
```

### 2.3 Why this shape

**No `order` array.** The 2026-08-17 build carried both a `setups` map and an `order`
array — two sources of truth for "which gears exist" — and the adversarial gate found the
bug that follows from it: a numeric `order` entry against a string key returns the same
gear twice (S1). Ordering is now **derived**, so the class of bug cannot occur:

> sort by `last_used_at` descending, nulls last → then `created_at` descending →
> then `id` ascending

The final tie-break exists so two devices always compute the same order from the same
data. No manual reordering is offered; the owner has not asked for it, and adding it later
means adding one optional field, not restructuring.

**`settings` is a separate object** so that a sync conflict on `active_gear` can never
touch the gears themselves (§4).

**`labels` is a rendering fallback, not data.** It holds the resolved display names
captured at save time and is used *only* when an id no longer resolves against the current
catalog. It is not the gear's title — `name` is, and the user owns that (D7). This
replaces the 2026-08-17 single denormalized `label` string, which fused printer, nozzle and
material into one line and so forced printer-first rendering (M9) onto a product where the
nozzle and material are what distinguish gears.

**`last_used_at` is on the record**, not in a side map, so it syncs with the gear.

### 2.4 Field rules

| Rule | Detail |
|---|---|
| **Keys** | Engine filter keys (`engine.js:529-610`; 19 today). |
| **Values** | Strings, except `useCase` and `special` — the only two `multi: true` keys — which are arrays of strings. |
| **Required** | `printer` must be present and non-empty. A gear without it is rejected at write time. |
| **Unknown keys** | **Preserved, never dropped.** Ignored when applying. |
| **Catalog validation** | Not performed by the store. |

The last two rules are load-bearing and easy to get backwards.

*Unknown keys are preserved* because the two platforms will run different engine versions.
An iOS build that has not yet learned a key must round-trip a gear without silently
deleting the user's pinned value. Dropping unknowns would make every version skew lossy.

*Catalog validation stays out of the store* because the store must not import the engine —
that separation is what keeps the golden-snapshot proof meaningful. Callers inject the
catalogs; the store validates *shape*, and a separate pure function validates *content*
(§3). What the store does enforce is required fields, which the parked build did not: it
accepted `saveSetup({})` and returned success (S2).

---

## 3. Validation and applying

### 3.1 States

A gear is inspected against injected catalogs, yielding one of:

| State | Meaning | Behaviour |
|---|---|---|
| `ok` | every pinned field resolves | applies fully |
| `degraded` | a *conditionally* valid value is currently unavailable | applies with the documented fallback, user informed |
| `stale` | one or more ids are absent from the catalog | renders from `labels`; unknown fields are left unset so the wizard asks, and the user is offered repair |

The 2026-08-17 model's `missing_pool_ref` state is gone with the pool.

### 3.2 The `profileMode: 'mine'` case

`profileMode` accepts `safe`, `tuned`, and — **conditionally** — `mine`, which
`engine.js:570-572` offers only when the user has personal Workshop tuning for that exact
printer + material pair. `app.js:884` already downgrades `'mine'` to `'safe'` when the
tuning is absent.

A gear pinning `'mine'` is therefore valid on the day it is saved and can stop being valid
later — if the user deletes that tuning, or opens the gear on a device whose Workshop does
not hold it. This is the concrete case `degraded` exists for: **apply `'safe'`, and say
so.** A silent downgrade inside a saved shortcut is exactly the kind of quiet wrong answer
the app should not give.

This case is called out because it is the only conditional value in the vocabulary today,
and nothing in the parked build or the 2026-08-17 spec accounted for it.

### 3.3 Applying

Applying a gear merges its resolved `fields` into app state, then performs the bookkeeping
the configurator needs. That bookkeeping was found the hard way on the parked branch — it
was the Critical finding of its final review — and is carried forward intact:

1. merge resolved fields (`state` is a `const`; use `Object.assign`)
2. re-route the slicer for the new printer (`Engine.setActiveSlicer`)
3. set the picker's expanded brand from the printer's `manufacturer` (not `brand`)
4. collapse the picker when a printer is set

Fields that are unknown, unresolvable, or absent are **left unset**, so the wizard asks
them. This is what makes D4's rule work without special cases: a gear that pinned
everything leaves nothing to ask and the generate control runs through; a gear that pinned
seven fields lands the user on the first unanswered step.

A restored session always wins over auto-applying the active gear on boot. The 2026-08-17
plan established this to protect IMPL-042 share links, and it still holds.

---

## 4. Designed for sync (D16)

Sync v1 is **Apple devices via iCloud, with no app-level login**. v2 adds web through a
pairing code, later. The schema must not need changing between them.

**Gears sync as individual records.** Two devices editing *different* gears must both
keep their edit. An envelope synced as one blob gives last-write-wins over the whole
collection, so the slower device's new gear disappears — a silent data loss that would be
very hard to attribute after the fact.

- **Per gear:** last-write-wins on `updated_at`. Acceptable — the loser is one edit to one
  gear, not a lost gear.
- **`settings`:** its own record, so a conflict over `active_gear` cannot clobber gears.
- **Archived rows sync too.** A tombstone must travel, or a delete on one device is
  resurrected by another.
- **Clock skew:** `updated_at` is device time. Good enough for this data; noted so it is
  not later mistaken for a guarantee.

**Inventory (Train 2) is a sibling store, not a section of this one** — `3dpa_inventory_v1`,
same record conventions, same sync treatment. A gear's `material` is a *class* ("PLA
Basic"); an inventory spool is a *physical instance* with colour, vendor and remaining
weight. The adversarial gate was right that these are different records; keeping them in
separate stores is what lets both exist without one pretending to be the other.

---

## 5. Defects this spec closes

Found by the Codex gate on the mismatch review and reproduced independently before being
accepted. Each is closed by design here, not left as a bug to remember.

| | Defect in the parked build | Closed by |
|---|---|---|
| **S1** | `order` accepted a non-string id and returned the same gear twice | `order` removed; ordering derived (§2.3) |
| **S2** | `saveSetup({})` succeeded, persisting an unusable row | `printer` required at write time (§2.4) |
| **S3** | a `__proto__` key silently dropped a row | keyed maps use null-prototype objects |
| **S4** | pool ordering not stable across archive | no pool; gear order is a total order (§2.3) |

---

## 6. What carries over from the parked branch

The branch is not merged and its model is withdrawn, but its mechanics were reviewed
hard and are worth reusing rather than rediscovering:

- `archived_at` soft-delete throughout
- row normalizers that make a corrupt or hand-edited envelope safe to read
- the `{ ok, error }` write contract, including the `quota` distinction — a write that
  fails must not be reported as a save
- the apply-time bookkeeping in §3.3, and the boot rule that a restored session wins
- name escaping on render — user-typed names are untrusted (the branch shipped a stored
  XSS before its review caught it)

`gear-store.js` is rewritten against this spec; its test file is the starting point for
the new one.

---

## 7. Open questions

1. **`userLevel`** — a property of the *user*, not of a gear. Repeating it on every gear
   is odd. Should it live once in settings instead of being pinnable?
2. **Repair UX for `stale`** — the state is defined; the interaction is not.
3. **Does web get Inventory?** Inventory is Pro (D15), and Pro is bought through the App
   Store. A web user has no purchase path today.
4. **Migration from the parked branch's format** — believed unnecessary (nothing shipped),
   but the owner's own browser may hold test data from the preview server. Confirm before
   assuming zero installed base.

---

## 8. Review requirements before implementation

1. Adversarial review of this spec, with the schema and the sync section as the focus.
2. Owner ratification of §1 and §2, since they supersede a previously ratified spec.
3. A re-plan against this spec — the 2026-08-17 Train 1 plan is void, not amendable.
4. Web is the first surface and therefore **freezes the format** (D14). No web write
   reaches a real user until §2 has passed 1–3.
