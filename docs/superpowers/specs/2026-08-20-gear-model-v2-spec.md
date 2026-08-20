# 2026-08-20 — Gear model v2: specification

**Status:** **RATIFIED by the owner 2026-08-20** ("Nej jeg er enig"), after one
adversarial review round (§9). Supersedes §2 of
[`2026-08-17-next-gen-platform-design.md`](2026-08-17-next-gen-platform-design.md)
in full.

**Authority:** owner decisions D1–D17, recorded in
[`../../reviews/2026-08-20-gear-model-owner-decisions.md`](../../reviews/2026-08-20-gear-model-owner-decisions.md).
Where this spec and the 2026-08-17 spec disagree, this one wins. Where this spec and the
2.0 UI design disagree, **the owner decides** — the design is input, not requirements.

**Scope.** This spec covers **the gear model and its storage format**. It supersedes
§2 of the 2026-08-17 spec entirely, but it does not restate the UI decisions in the
record (D4, D8, D9, D11) or the commercial ones (D15) — those bind the *plan*, not the
schema, and live in the decision record. Where §2 of the old spec carried UI or
commercial content, treat it as withdrawn rather than replaced here.

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
`app-state.json`. The two decode to identical values; **byte-identical serialization is
not claimed** — neither `Codable` nor `JSON.stringify` guarantees key order or escaping,
so any parity test must compare decoded structures, not bytes.

The key is unchanged from the 2026-08-17 spec because **nothing was ever written to a real
user** — the branch that would have written it is parked and unmerged. `v1` therefore
still means "the first shape users see," which is what the forever promise attaches to.

**Forever promise, and its real boundary.** The envelope's extension point is `fields`,
an open map keyed by the engine's own filter keys. This is what makes the promise
affordable — but it is not unlimited, and the limit must be written down rather than
discovered later.

| Engine change | Migration needed? |
|---|---|
| a new filter key added | **no** |
| a key's options extended or renamed | **no** — unknown values become `stale` (§3.1) |
| a key becoming `multi` (or ceasing to be) | **no**, by the cardinality rule in §2.4 |
| a key removed | **no** — its value is preserved and ignored |
| a value's **type** changing — string/array → number, object, or structured id | **yes** |

Only the last row forces a migration. So the design buys freedom in *vocabulary and
cardinality*, and does not buy freedom in *value type*. If a future field genuinely needs
structured values (`colors` becoming a list of chosen filament ids, say), that is a v2
envelope and should be planned as one.

An earlier draft of this spec claimed the open map removed migrations outright. It does
not, and the adversarial gate was right to call that overstated.

### 2.2 Envelope

```json
{
  "v": 1,
  "gears": {
    "6f1e…": {
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
        "material": "PLA Basic",
        "build_plate": "Textured PEI"
      },
      "created_at":   "2026-08-20T19:00:00.000Z",
      "updated_at":   "2026-08-20T19:00:00.000Z",
      "last_used_at": "2026-08-20T19:05:00.000Z",
      "archived_at":  null
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

**The map key is the gear id, and the record carries no `id` field.** An earlier draft
stored both, which gave identity two sources of truth: an envelope like
`{"gears": {"a": {"id": "b"}}}` is ambiguous, and JS and Swift decoders could reasonably
disagree about which wins. There is now nothing to disagree about. Decoders synthesize the
id from the key in memory; any transport that carries a single record carries its id in
that transport's own envelope (in CloudKit, the record name).

**No `order` array.** The parked build carried both a `setups` map and an `order` array —
two sources of truth for which gears exist — and the adversarial gate found the bug that
follows: a numeric `order` entry against a string key returns the same gear twice (S1).
Ordering is now derived, so the class cannot occur:

> `last_used_at` descending, nulls last → `created_at` descending → `id` ascending

**Total-order requirements, which are load-bearing for sync.** Two devices must compute
the same order from the same data, so:

- timestamps are ISO-8601 UTC with milliseconds, compared as strings;
- the `id` tie-break is a **bytewise** comparison of the UTF-8 key, not a locale collation
  (`localeCompare` is explicitly forbidden — it is locale-dependent and would order
  differently on a Danish and an English device);
- a record with a missing or unparseable `created_at` sorts **last** using a fixed
  sentinel. It is **not** rewritten to "now" — the parked build did that, and a read-side
  rewrite both diverges across devices and manufactures a spurious sync write.

**Read-side repair never writes.** Any normalization the decoder performs is in memory
only. A write happens because the user did something, never because a file was read. This
is a general rule and the `created_at` case above is one instance of it.

**`settings` is a separate object** so a conflict over `active_gear` can never touch the
gears (§4).

**`labels` is a rendering fallback, restricted to catalog-backed fields.** It holds
resolved display names captured at save time, and is used *only* when an id no longer
resolves against the current catalog. It covers exactly the four fields whose values are
catalog ids that can disappear: `printer`, `nozzle`, `material`, `build_plate`. Every
other field holds an engine enum value (`surface: "fine"`), which is localized at render
time and needs no snapshot — if such a value disappears the field is simply `stale` and is
dropped with an explanation.

`labels` **mirrors the shape of the value it labels**: a string for a single-valued field,
a parallel array for a multi-valued one. A flat string could not represent a `special`
array where one entry is live and one is stale, which the gate correctly identified.

`labels` is not the gear's title — `name` is, and the user owns that (D7). This replaces
the parked build's single fused `label` string, which forced printer-first rendering (M9)
onto a product where nozzle and material are what distinguish gears.

**`last_used_at` is on the record** so it syncs with the gear — but it is deliberately
*not* part of conflict resolution (§4.2).

### 2.4 Field rules

| Rule | Detail |
|---|---|
| **Keys** | Engine filter keys (`engine.js:529-610`; 19 today). |
| **Values** | A string, or an array of strings. **Cardinality is not fixed by the schema.** |
| **Required** | `printer` must be present and non-empty. A gear without it is rejected at write time. |
| **Empty array** | `[]` means *pinned as none* — "I have no special requirements, do not ask." Distinct from the key being absent, which means *ask me*. |
| **Array hygiene** | Duplicates removed; order normalized to the engine's own item order at write time, so two devices that pin the same set produce the same value. |
| **Unknown keys** | **Preserved, never dropped.** Ignored when applying. |
| **Catalog validation** | Not performed by the store. |

**Cardinality lives in the engine, not the schema.** Today `useCase` and `special` are the
only `multi: true` keys, but the schema does not encode that: a value is a string or an
array of strings, and whether a given key *should* be one or the other is checked at apply
time against the engine's current `multi` flag. A mismatch coerces (single→array takes the
one value; array→single takes the first and marks the gear `degraded`). This is what keeps
a future cardinality change out of the migration column in §2.1.

**Unknown keys are preserved** because the two platforms will run different engine
versions. An iOS build that has not learned a key must round-trip a gear without deleting
the user's pinned value. Dropping unknowns would make every version skew lossy.

**Catalog validation stays out of the store** so the store never imports the engine — that
separation is what keeps the golden-snapshot proof meaningful. Callers inject catalogs; the
store validates *shape*, a separate pure function validates *content* (§3). What the store
does enforce is required fields, which the parked build did not: it accepted
`saveSetup({})` and returned success (S2).

### 2.5 Hostile-envelope rules

The envelope is hand-editable, synced, and written by two independent implementations, so
a decoder must assume it is adversarial.

- **Every map is null-prototype** (`Object.create(null)` in JS) — `gears`, `settings`,
  `fields`, and `labels` alike. The parked build closed this for its top-level maps only;
  `fields` is a map too, and a `__proto__` key inside it is the same trap. Swift
  dictionaries have no equivalent hazard, but the JS side must not be the weak one.
- **Reserved keys** (`__proto__`, `constructor`, `prototype`) appearing as a gear id or a
  field key are dropped, and the drop is counted so it can be surfaced rather than being
  silent data loss.
- **Type mismatches degrade, never throw.** A row that is not an object, a `fields` that is
  not a map, a timestamp that is not a string — each is skipped at its own level, leaving
  the rest of the envelope readable.
- **A gear failing required-field validation on read is retained, not deleted**, and
  reported as `stale`. Deleting a user's data because we could not parse it is the worst
  available outcome.

---

## 3. Validation and applying

### 3.1 States

A gear is inspected against injected catalogs, yielding one of:

| State | Meaning | Behaviour |
|---|---|---|
| `ok` | every pinned field resolves | applies fully |
| `degraded` | a value is *conditionally* valid and currently unavailable, or a cardinality coercion lost information (§2.4) | applies with the documented fallback, user informed |
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
pairing code, later. The schema must not change between them.

### 4.1 Two representations, one format

An earlier draft said "gears sync as individual records" while §2 defined a single
envelope, which is a contradiction the gate caught: one file synced as one file is blob
sync no matter what the prose says. The two representations and the mapping between them
are therefore explicit.

| | Local | Sync |
|---|---|---|
| **Web** | the whole envelope under one `localStorage` key | none in v1 |
| **iOS** | the same envelope as a local file — a **materialized view** for reading | **one record per gear**, plus one record for `settings` |

The local file is a cache the app reads from, never the unit of synchronization. Writing a
gear means writing that gear's record and re-materializing the file; it never means
uploading the file. When v2 brings web in through a pairing code, web adopts the same
record-per-gear transport — the envelope stays the on-disk shape on both sides.

Record identity is the gear id (§2.3), so a record and its map entry can never disagree.

### 4.2 Merge rules

**`updated_at` changes only on a content edit** — name, `fields`, `labels`, or
`archived_at`. It does **not** change when a gear is merely used.

This is the single most important rule here. The gate found the failure it prevents: if
using a gear bumped `updated_at`, then opening a gear on the iPad would win
last-write-wins against a rename made moments earlier on the iPhone, and silently discard
it. Reading must never outrank writing.

| Situation | Rule |
|---|---|
| same gear, content edited on two devices | later `updated_at` wins the whole record |
| `last_used_at` differs | **max wins, merged independently** — never a conflict, never a reason to overwrite content |
| archived on one device, edited on the other | **the archive wins, regardless of timestamps** |
| gear exists on one device only | it is created on the other; absence is never treated as a delete |
| `settings` conflict | later `settings.updated_at` wins; it is its own record and cannot touch gears |

**Tombstone precedence is deliberate.** With plain last-write-wins, a device that had a
gear open could resurrect something the user deliberately archived, and a resurrected
delete is far more alarming to a user than a lost edit. Archived rows sync — a tombstone
that does not travel is a delete that undoes itself on the next sync.

**Losing an edit is still possible** — same gear, same field, two devices, concurrent.
That is accepted: the loser is one edit to one gear. What is *not* accepted is losing a
whole gear, resurrecting a deletion, or a read overwriting a write, and each of those is
closed above.

### 4.3 Dangling references

`settings.active_gear` may point at a gear that has not synced yet, has been archived, or
only ever existed on another device. It is a **hint, not a guarantee**:

> if `active_gear` does not resolve to a live gear, fall back to the most recently used
> non-archived gear; if there is none, there is no active gear and Home shows its
> first-run state.

The pointer is not repaired on read (§2.3 — read-side repair never writes); it resolves
again on its own once the missing record arrives.

### 4.4 Clock skew

`updated_at` is device time. A device with a badly wrong clock can win conflicts it should
lose, and a device offline for a month returns with old timestamps and correctly loses to
newer edits — which is the desired behaviour, but only because the timestamps are honest.

This is good enough for this data and is **not** presented as a guarantee. If it ever
needs to be one, the fix is a per-record counter incremented on write, compared before the
timestamp. That is an additive field and needs no migration, which is why it is safe to
defer.

### 4.5 Inventory is a sibling store

Inventory (Train 2) belongs in its own store, `3dpa_inventory_v1`, not as a section of
this one. A gear's `material` is a *class* ("PLA Basic"); an inventory spool is a
*physical instance* with colour, vendor and remaining weight. The adversarial gate on the
mismatch review was right that these are different records.

Reusing this store's record conventions and sync treatment is a **recommendation**, not an
owner decision — recorded as such so a later reader does not mistake it for one.

## 5. Defects this spec closes

Found by the Codex gate on the mismatch review and reproduced independently before being
accepted. Each is closed by design here, not left as a bug to remember.

| | Defect in the parked build | Closed by |
|---|---|---|
| **S1** | `order` accepted a non-string id and returned the same gear twice | `order` removed; ordering derived (§2.3) |
| **S2** | `saveSetup({})` succeeded, persisting an unusable row | `printer` required at write time (§2.4) |
| **S3** | a `__proto__` key silently dropped a row | every map is null-prototype, incl. `fields` and `labels` (§2.5) |
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

1. ~~**`userLevel`** — should it also have a home in settings?~~ **Closed: no.** Pinnable
   like any other field, and nothing more.
2. **Repair UX for `stale`** — the state is defined; the interaction is not. Still open,
   and it is a plan-time question rather than a schema one. Confirmed worth having: catalog
   ids **do** get removed (`aa0826e` reverted the Voxelab Aries; `2284207` deleted the
   `sparkx` brand), and version skew between web and iOS makes the state common.
3. **Does web get Inventory?** Owner intent is yes — reachable on web, or unlocked if
   bought through the App Store. **Blocked on D18b**: the existing inventory is a
   single-user PHP/MySQL server app, and opening it needs the accounts D16 removed.
   Cross-platform entitlement without accounts is unresolved alongside it.
4. ~~**Migration from the parked branch's format.**~~ **Closed: not a real question.**
   Nothing shipped; any preview-server test data is the controller's problem to clear.

---

## 8. Review requirements before implementation

1. ✅ Adversarial review of this spec (§9).
2. ✅ Owner ratification of §1 and §2 — given 2026-08-20.
3. ⬜ **A sync spec, before web ships.** §4 designs this schema *for* sync, but that is
   analysis, not a reviewed specification. Web is the first surface and therefore
   **freezes the format** (D14) — if a sync spec later needs a different record model, the
   format is already in users' browsers. The sync spec must therefore land before a web
   write reaches a real user. It need not block planning or building.
4. ⬜ A re-plan against this spec — the 2026-08-17 Train 1 plan is void, not amendable.


---

## 9. Review provenance

Draft written 2026-08-20 from owner decisions D1–D17, then reviewed adversarially by
Codex (`bridge --mode codex-only`) — transcript at
[`../../reviews/bridge-2026-08-20-222717-504656.md`](../../reviews/bridge-2026-08-20-222717-504656.md).

The gate raised six must-fix findings against the draft. All six are corrected above
rather than defended:

1. **§4 claimed per-gear sync while §2 defined one blob.** Rewritten as two explicit
   representations with the mapping between them (§4.1).
2. **`last_used_at` could overwrite a real edit** through shared `updated_at`. Split:
   `updated_at` moves only on content edits, `last_used_at` merges by max (§4.2). This was
   the most serious finding — it would have let opening a gear on one device silently
   discard a rename made on another.
3. **Gear identity had two sources of truth** (map key and inner `id`). The `id` field is
   gone; the key is authoritative (§2.3).
4. **`labels` could not represent multi-valued fields.** It now mirrors the value's shape
   and is restricted to the four catalog-backed fields (§2.3).
5. **The forever claim was overstated.** Bounded with an explicit table of what does and
   does not force a migration (§2.1).
6. **`__proto__` inside `fields` was still open.** Null-prototype and reserved-key rules
   now apply to every map (§2.5).

Its should-fix findings are also incorporated: multi-array semantics including the meaning
of `[]` (§2.4), total-order requirements with the bytewise tie-break and the no-rewrite
rule for a missing `created_at` (§2.3), the `active_gear` dangling fallback (§4.3), the
`userLevel` contradiction (§7), and the decision-fidelity gap — D9 and D15 are UI and
commercial decisions and the spec is now explicitly scoped to model and storage, with the
inventory conventions marked as a recommendation rather than an owner decision (§4.5).

Verified independently rather than assumed: the 19 filter keys and their `multi` flags
(`engine.js:529-610`), the conditional `profileMode: 'mine'` option
(`engine.js:570-572`) and its silent downgrade (`app.js:884`), and the AMS derivation
(`engine.js:1053-1080`).
