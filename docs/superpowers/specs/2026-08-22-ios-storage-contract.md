> **Where this sits:** the binding rule for how iOS reads and writes persisted
> data. Written before the first line of iOS gear code, because
> [`3dpa_gear_v1`](2026-08-20-gear-model-v2-spec.md) is frozen and the house
> pattern on iOS today would break it by default. Companion to
> [sync v1](2026-08-20-sync-v1-spec.md), whose §3 merge depends on every rule
> below. Not served publicly.

# iOS Storage Contract

**Created:** 2026-08-22. **Owner:** Musti. **Status:** ratified in force for
`WorkshopStore`; binding on all new stores.

---

## 1. The rule

> **The persisted row is the write authority. The typed Swift model is a
> read-only projection over it. A write patches the keys it touches and
> returns every other byte exactly as it found them.**

That is the whole contract. Everything below is consequence, evidence, or
enforcement.

The rule that must NOT be used — the pattern this document exists to forbid:

```swift
// FORBIDDEN for any shared or synced store.
let model = try JSONDecoder().decode(Thing.self, from: data)   // drops unknown keys
model.name = newName
try JSONEncoder().encode(model).write(to: url)                 // and now they are gone
```

Decoding to a typed model and re-encoding from it means the file can only ever
contain keys **this build** knows about. Every other writer — the web app, a
newer iOS build, a future sync peer — is silently overwritten by an older
reader. The loss is invisible: no error, no warning, and it fires on operations
the user would never associate with data loss, like renaming.

## 2. Why this is written down rather than assumed

Web already ratified this rule for gear. `gear-store.js` states it at the
mutator:

> *"Only the touched row is rewritten; every other row goes back exactly as it
> was… it must never launder bytes the user did not touch."*
> — `gear-store.js:441-453`

and `touch()` deliberately bypasses the normalizing `_mutate` path so that
moving `last_used_at` cannot reformat the rest of the row (`gear-store.js:646`).
Spec §2.4 pins it: unknown keys are preserved, never dropped. §2.5 adds
degrade-never-throw on read.

iOS did the opposite, and it cost twice:

| | What happened |
|---|---|
| **IMPL-044 W3** | The ordered emitter dropped unknown **envelope** keys, so a web backup round-tripped through iOS lost its entire `tuning` ledger. Fixed with `envelopeExtras()`. |
| **2026-08-22** | The same defect one level down. `Profile` modelled exactly 7 per-row keys on read *and* on write, so `archived_at` and `journal_updated` were destroyed on every iOS write — **a profile deleted on web came back to life** after an iOS round-trip. |

Two instances of one class, eighteen months apart, in the same file. The class
is what needs fixing, not the next instance. Hence a contract.

## 3. What the rule requires, concretely

1. **Read keeps the raw bytes.** Parse to a dictionary; project the typed
   fields from it. Never discard the parsed row.
2. **Write patches.** Emit the keys this build models, then every unmodelled key
   the row arrived with. Never rebuild the row from the typed model alone.
3. **Read normalization is in-memory only.** Interpreting a value for display or
   logic must not change the bytes on disk for a key the user did not touch.
4. **Degrade, never throw.** A value of an unexpected type reads as its safest
   interpretation and stays on disk untouched.
5. **Fail closed on ambiguity.** Where a misread would *destroy* user intent —
   a deletion marker being the case that matters — the unrecognised value takes
   the destructive-safe reading. A tombstone that cannot be parsed is still a
   tombstone; treating it as "live" resurrects a row the user deleted.
6. **Never write over what you cannot read.** A file whose envelope version this
   build does not understand must be left byte-untouched, and any operation that
   would produce a partial artifact from it must refuse visibly.

Rule 6 is not theoretical. Before 2026-08-22, saving a profile into a `v2`
envelope replaced the whole file with a `v1` one holding only the new profile —
every profile and every tombstone from the newer build, gone. Web closed the
same hole (D-5) *before* it started writing tombstones; iOS had not.

## 4. Census — every persisting surface on iOS

Verified against the repo on 2026-08-22. The write-path surface is exactly six
call sites, so this is closed, not sampled.

| Store | File / key | Retention | Shared? | Required posture |
|---|---|---|---|---|
| **WorkshopStore** | `workshop.json` | **Lossless** as of 2026-08-22 — keys *and* value types, at every level | **YES** — the web backup format, and the sync target | **Contract-bound.** Any regression here is data loss. |
| **AppStatePersistence** | `app-state.json` | **Lossy** — rebuilds from `AppStateWebCodec.webDict`'s 19 declared keys on every backgrounding | No — device-local | **Should be contract-bound before sync.** See §6.1. |
| **NotificationTokenStore** | `notification-state.json` | **Lossy** — `JSONDecoder`/`JSONEncoder` on a 4-field `Codable` | No — device-local, never exported | Acceptable as-is. Re-evaluate if push prefs ever go cross-device. |
| **PrinterCatalogProvider** | `ios-printer-overlay-v1.json` | **Lossless on disk**, allowlisted on read | One-way download, never written back | Correct by design — loss is on *read*, so a future binary recovers the keys from the same unchanged file. Do not "simplify" it. |
| **ReviewPromptService** | 5 `UserDefaults` keys | Lossless (no container to re-render) | No | Fine. |
| **NotificationService** | `notification.selectedTopics.v1` | Lossy at element level — unknown topic raw values dropped | No | Fine while device-local. |
| **NotificationCoordinator** | `notification.launchPreparationSamples.v1` | Lossless; bounded by retention policy (last 20) | No | Fine. |

There is no Keychain, Core Data, SwiftData, App Group, or iCloud KVS anywhere in
the app. **Exactly one surface is shared with another writer: `workshop.json`.**
That is why it carries the whole burden today — and why gear will double it.

### 4.1 A distinction the codec makes easy to get wrong

`AppStatePersistence` and `WorkshopStore` share one codec (`AppStateWebCodec`)
but sit on opposite sides of this line. `WorkshopStore` deliberately routes
**around** `webDict` on the read path, keeping `profile.state` as a raw
dictionary. `AppStatePersistence` routes **through** it on both paths, which is
where its loss comes from.

So: **the codec defines canonical key ORDER and validation. It does not define
what is RETAINED.** A contract that said "the codec is the state contract" would
be true for one store and false for the other.

## 5. Rules for a new store

Before adding any persisting type, answer these in its header comment:

1. **Is this file ever read or written by anything other than this build?** Web,
   a newer iOS build, a sync peer, a user-editable export. If yes → the contract
   binds, no exceptions.
2. **What is the envelope version, and what happens on a version this build does
   not recognise?** The only acceptable answer is "refuse to write, refuse to
   emit a partial artifact." Write the test.
3. **Where do unmodelled keys go?** Name the mechanism (a raw dict, an extras
   bag) and where they are re-emitted.
4. **What is the emit order?** State it, and state which shape it was pinned
   against if more than one is possible (see §6.2).
5. **State the retention position explicitly.** Six of the seven stores above
   have no written position on unknown keys, so their behaviour is *incidental
   rather than contracted* — the census cannot tell "lossy on purpose" from
   "lossy by default." Do not add a seventh.

Gear specifically: `3dpa_gear_v1` is frozen — the first production browser write
happened on 2026-08-21, so every future change to that envelope is a
compatibility problem, not an edit. iOS gear code inherits §2.4 (unknown keys
preserved), §2.5 (degrade never throw), §4.2 (`touch()` is not an edit) and
§4.3 (`active_gear` is a hint) from the web spec. It does not get to reinterpret
them.

## 6. Known gaps — stated, not fixed

These are live and unscheduled. They are recorded here so they are contracted
gaps rather than surprises.

### 6.1 `AppStatePersistence` has the D-5 hole that `WorkshopStore` just closed
Restore bails on a version mismatch, but save has no matching guard
(`AppStatePersistence.swift:56` vs `:30-46`), so an older binary clobbers a
newer binary's file wholesale on the next backgrounding. Device-local today, so
it is not currently reachable — it becomes reachable the moment anything syncs
this file, and it fires on every app-switch.

### 6.2 `archived_at` key order cannot match web in both shapes
Web's per-row order is provenance-dependent, verified by running the real module:

- a **legacy** row read back emits `… updated, journal, archived_at` — `_read()`
  appends it via `Object.assign` (`workshop-store.js:48`)
- a row web **creates** after the tombstone ship emits
  `… updated, archived_at, journal, journal_updated` — its create literal
  (`workshop-store.js:196-204`)

One static emitter cannot be byte-identical to both. iOS pins the **legacy**
order, because that is the shape every real backup carries today and what the
byte-pinned fixtures are. The consequence is cosmetic — no key and no value is
lost, and web re-persists either order without complaint — and it is pinned by
`test_webRowCreatedAfterTombstones_roundTripsWithoutLoss` so it stays visible.
The real fix is order-preserving parsing, which Foundation does not provide; it
is a layer heavier than the defect warrants. Revisit if web normalizes its own
order first.

### 6.3 The emitter is TOCTOU, and iOS has no file coordination
`hasVersionSkew()` is checked before the write, not atomically with it. A sync
peer replacing the file in between can still take the D-5 loss. Same-version
concurrent writes could already lose profiles — every mutator is
read-all → mutate → write-all, with no coordination anywhere in the app.

A version check cannot close this; it needs `NSFileCoordinator` or an
equivalent. **This is an architectural prerequisite for sync, not a bug in the
skew guard**, and it should be settled in the sync implementation plan rather
than patched here.

### 6.4 `importJSON` is asymmetric with `exportJSON` on envelope extras
Export carries every local extra. Import seeds extras from the **local** file and
merges only `tuning` from the incoming root
(`WorkshopStore.swift:259-265`), so an imported web backup's `userMaterials`
section is silently discarded. The byte-identity round-trip test does not catch
it because its fixture has no non-`tuning` extra.

### 6.5 Unknown-key sort is not UTF-8 bytewise
Extras are appended with Swift's `String.sorted()`, which diverges from
bytewise ordering for non-ASCII keys — the same divergence the gear spec notes
at §2.3. Every key in play today is ASCII, so it is unobservable. Worth a
synthetic non-ASCII pin when gear lands on iOS.

## 7. How compliance is verified

A store claiming compliance must carry tests that:

1. **Round-trip an unmodelled key** through a write triggered by an *unrelated*
   operation. `test_unknownPerRowKeys_surviveAWrite` is the model: import a row
   carrying `journal_updated`, rename a **different** profile, assert the key
   survived.
2. **Prove the check can fail.** Disable the preservation path and confirm the
   test goes red. A test written after the fix passes on first run and proves
   nothing on its own — see
   [a check that cannot fail is not a check](../../../../ai-operating-model/docs/findings/2026-08-21-a-check-that-cannot-fail-is-not-a-check.md).
3. **Pin the bytes against the OTHER writer's real output**, not against
   hand-written JSON. Generate fixtures by running the actual web module:
   ```bash
   node -e '
   const {loadBrowserScript}=require("./scripts/load-browser-script.js");
   const {createWorkshopStore}=loadBrowserScript("workshop-store.js",["createWorkshopStore"]);
   /* … drive it, then print exportJSON() … */'
   ```
   The 2026-08-22 fixtures had been "verbatim web output" since 2026-07-06 and
   were stale the day web shipped tombstones. A hand-written fixture pins what
   the author believed, which is exactly the thing under test.
4. **Assert the version-skew refusal**, including that an absent or corrupt file
   is *not* treated as skew — an empty shelf must still be recoverable.

~~Local runs need `-testLanguage en -testRegion US`. Without it a Danish
simulator fails localized assertions that are green on CI, which reads as a
code defect and is not one.~~

**Superseded 2026-08-22.** That was a workaround for tests that hardcoded
English strings, and the workaround had a cost: pinning en/US means the suite
structurally cannot see a missing Danish key. The three offenders now assert
against the constants production resolves, or branch on the language
explicitly, so the suite is language-independent — **green under `en/US`,
under `da/DK`, and unpinned.** The pin is still fine to use; it is no longer
required, and a Danish run is now a usable gate rather than a known-red one.
