# 2026-08-20 — Train 1 (built) vs. the 2.0 design: mismatch review

**Review target:** the ratified spec §2 + the Train 1 plan + the `train1-my-gear-setups`
branch (9 commits, unmerged), measured against the 2.0 design
(`3DPA 2.0 Redesign.dc.html`, 23 artboards).

**Mode:** Review · **Lane:** Full (cross-platform, permanent schema, architecture).

**Why now:** the branch's own reviews returned "Merge." They reviewed the code against
the plan. Nobody reviewed the plan against the design — the design landed after the
plan was ratified.

**Sources.** Authority runs to the spec; the design is input. See the premise correction
under *Assessment* — the design is not a requirements document.

1. The design's own `BRIEF` artboard — six numbered decisions, written by the designer.
2. The 13 flow artboards (`1a`–`1o`, `2a`, `3a`) and their motion/behaviour notes.
3. Ratified spec §2 (`2026-08-17-next-gen-platform-design.md:80-161`).
4. The Train 1 plan (`2026-08-17-train1-my-gear-setups-plan.md`).
5. The shipped code on both surfaces.

---

## The headline

The design and the build disagree about **what a gear is**.

The spec builds two layers on purpose:

> "Two layers, deliberately distinct because different features consume them:
> **Layer 1 — the pool ("what I own")** … **Layer 2 — Setups ("what I print with")**"
> — spec §2

The design has one. A **gear** is the atomic unit: printer + nozzle + material, named.

The vocabulary evidence — *pool*, *own*, *owned* appear **zero times across all 23
artboards** (verified by grep) — is suggestive but does not by itself prove anything; a
stored pool could be an implementation detail a gear-first UI never surfaces. **That
counter-argument was raised by the adversarial gate and it is correct.** The load-bearing
evidence is behavioural, not lexical:

1. `1j` derives brand ownership *by counting gears*:
   `YOUR GEAR` → **BAMBU LAB** — `7 GEARS · X1C · A1 MINI · P1S`. A projection over the
   gear list, expressed in gear units.
2. **No artboard offers a way to acquire a printer or a filament on its own.** Every
   acquisition path in the design (`2a`, `1l`, `1g`'s *New gear*) produces a whole gear.
   A stored pool would have no writer that isn't a side-effect of gear creation.

So the accurate statement is narrower than "the product has no pool": it is that **the
design gives the pool no independent writer and no independent reader**, which makes a
stored pool a derived cache. Storing a derivation as first-class state with its own
archive lifecycle creates a divergence surface — two records of the same fact that can
disagree, across two platforms, in a schema declared permanent.

Everything below follows from that one disagreement, or is independent of it.

---

## Findings

Severity is about **cost of being wrong after ship**, not about effort.

### M1 · CRITICAL — the pool is a stored layer the product does not have

| | |
|---|---|
| **Spec** | pool (`printers{}`, `filaments{}`) is Layer 1, stored, first-class |
| **Design** | no pool anywhere; ownership derived from `setups{}` |
| **Built** | `gear-store.js` stores `printers{}` + `filaments{}` as keyed maps with their own lifecycle, ordering and archive flags |

`3dpa_gear_v1` is declared permanent — spec §2: *"The v1 shape ships versioned and its
keys/format are kept forever"* — and iOS Task 6 is written to decode the identical JSON.
Shipping freezes two top-level maps that the 2.0 product model computes rather than stores.

**Second-order problem — weaker than first stated.** The spec justifies the pool's
`filaments{}` map by future consumption: *"Consumed by: picker filtering (this train),
inventory and AI grounding (later trains)."* The design gives filament ownership its own
home — the **Inventory tab, `4 SPOOLS`, a Pro feature** (`1a`, `1b`, `4a`).

The adversarial gate pushed back here and was right to: a gear's `PLA Basic` is a
**material class**, while an inventory spool is a **physical instance** with colour,
vendor, remaining weight and purchase date. Those are not the same record, so Inventory
does not obviously *replace* the pool's filament map.

What survives the pushback is narrower: after Train 2 there will be two stores that both
answer "which filaments does this user have," at different grain, and the picker has to
choose one. That is a reconciliation question to settle at design time, not proof the
pool is dead.

**Cost if shipped:** a v2 envelope migration on two surfaces, or a permanent vestigial
layer that every later writer has to maintain and reconcile.

---

### M2 · CRITICAL — the design's primary gear-birth path does not exist in the build

`BRIEF` decision 5, verbatim:

> **5 · Gears are born in two places.** Quick-save banner on the profile screen (`1l`)
> and a manage list behind "Edit" in the overlay (`1g`).

`1l` renders it:

> **Save this hardware as a gear?** / Next time it pre-fills steps 1–4. / `[Save gear]`

with the behavioural rule in the motion note:

> "Save-gear banner shows only after a **manually-configured** run (not when launched
> from a gear) — purple = 'adds to your setup', **dismiss remembers**."

The branch has no such banner, and the plan never mentions one. This is precisely the
flow the owner described: *"i'm on start page, i select brand, printer, nozzle, filament
and get a 'add to your gear option'."*

**Schema consequence, stated carefully:** "dismiss remembers" is persisted state that
does not exist today. Whether it belongs in `3dpa_gear_v1` or in ordinary UI preferences
is an open call — the adversarial gate flagged that the review originally assumed the
former. Either way it is new state the plan never accounted for.

---

### M3 · HIGH — acquisition shape: one page with defaults vs. three tabs and two steps

| | |
|---|---|
| **Design `2a`** | *"Build a gear · single page — printer mandatory, everything else defaults"*. One surface, no steps. Nozzle defaults to `0.4 STD`, filament to the brand's basic PLA — *"a user can tap one printer cell and go."* Two CTAs: **Save & configure print** (→ lands on `1k`) and **Save gear only** (→ Home). |
| **Built (Task 3)** | a `.gear-panel` with three tabs — *Printers · Filaments · Setups* — where the user first assembles a pool, then composes a setup from it. |

Two-step acquisition against a design that spent its note explaining why it is one step.
This is the "extra work" the owner named.

---

### M4 · MEDIUM — one real missing gear field, one that the catalog already owns

`1a`'s active gear spec line reads **`X1 Carbon · PLA Basic · AMS`**. `2a` offers a
`SETUP OPTIONAL` row: **AMS · Enclosed · Textured plate**. The envelope has `build_plate`
and nothing else.

Checked against the catalog rather than assumed — `data/printers.json` carries both:

| Design chip | Catalog reality | Verdict |
|---|---|---|
| **Enclosed** | `enclosure` is a field on **83** printer records | **Not a gear field.** Derivable from the `printer` id already stored. Storing it would duplicate the catalog and let the two disagree. |
| **AMS** | `multi_color_systems` lists `ams` (9), `ams_ht` (6), `ams_lite` (2) — i.e. what the printer *supports* | **A real gap.** The catalog knows the printer is AMS-*capable*; only the user knows whether they own the unit. `1a` renders it as gear identity, so it needs a field. |
| **Textured plate** | `available_plates` per printer; `build_plate` already in the envelope | Already covered. |

So M4 is one field (`ams` / multi-material-unit owned), not a category of missing state —
and the "Enclosed" chip in `2a` should be read back to the designer as a display of a
catalog fact, not an input.

Today `ams` and `enclosure` also surface as *material* properties for display
(`app.js:2732-2734`, `filament.ams` / `filament.enclosure`) — a third meaning of the same
word. Whatever is chosen, the three senses need distinct names.

---

### M5 · HIGH — names are auto-composed, and the design's own rule is self-contradictory

`2a`: *"Name auto-composes from filament + **intent** (editable — AUTO chip flips off on
first keystroke)."* The gear names shown across `1a`/`1g` are intent words: *Everyday PLA,
Engineering, Fine detail, Quick drafts, Flexibles, Workhorse, Carbon parts*.

The build has the user type a free name — which is why the branch's review found stored
XSS and added escaping.

**But the design contradicts itself here, and this needs an owner ruling before either
surface implements it.** Intent is explicitly *never* stored on a gear:

- spec §2 — *"hardware is a setup, intent is per print"*
- `BRIEF` decision 2 — *"it continues with hardware, it never says Generate. Intent is per print."*
- `1k` — the whole artboard exists as *"the over-collapse guard"*

So an auto-name cannot draw on intent at gear-creation time; there is no intent yet.
Either the name composes from hardware only (`X1C · 0.4 · PLA`), or the first
configure-run's intent back-fills it (`1l`'s banner has intent in hand — that path works),
or intent quietly becomes a stored gear field, which reopens the guard.

---

### M6 · HIGH — Home information architecture

| | |
|---|---|
| **Design `1a`/`1b`/`1g`** | gears live **on Home** as cards. Top-3 = active + 2 most-recently-used. `+ ADD A GEAR` and `MANAGE` sit in the section header. An **"All gears"** row appears *only at 4+ gears* (dashed border — *"it is a door, not a gear"*) and opens overlay `1g`, which groups by printer with pinned headers and a `New gear` button. |
| **Built** | a ⚙ switcher chip in the header plus a separate panel behind a nav entry. |

Different IA, not a different skin. The `1b` rule *"Support card yields its slot at 8
gears; it rotates back on next launch"* has no analogue in the plan at all.

---

### M7 · MEDIUM — CTA wording and shape (iOS, unbuilt)

`BRIEF` decision 2 and `1a`: the CTA reads **`Configure print`** with a separate sub-label
**`USING EVERYDAY PLA`** beneath it. Plan Task 7 specifies
`Strings.Gear.continueWith(setupName)` — one interpolated string, different words.
Cheap to fix because Tasks 7–10 are unbuilt.

---

### M8 · MEDIUM — two different jump targets, one implemented behaviour

- `1k`: choosing a gear from Home/overlay pre-fills steps 1–4 → user lands on **step 5**.
- `1j`: choosing a "Your gear" brand row in the picker pre-fills brand + printer →
  *"jumping to **step 3**."*

The build has one behaviour: `applySetupToState` merges all four hardware keys and
collapses the picker. Task 4/9's "Your gear" grouping is a **filter**, not the
jump-to-step-3 shortcut `1j` specifies.

---

### M9 · MEDIUM — the label string encodes the wrong hierarchy

`BRIEF` decision 3: *"The **nozzle badge** (size + type) is the visual key and material is
co-primary; **printer name is secondary**."* `1g` is stricter: *"Printer name lives in the
header only — duplicates read purely by nozzle + material chips."*

The stored denormalized label is `"${printerName} · ${nozzleName} · ${materialName}"` —
printer first, one flat string. It renders the inverse hierarchy and cannot be
re-composed into `1g`'s layout without being split.

Mitigating: the parts are recoverable from the `printer`/`nozzle`/`material` ids while
they remain in the catalog; `label` is only the fallback for archived/departed ids. So
this is a *rendering* defect with a schema smell, not a data-loss defect.

---

### M10 · MEDIUM — catalog-news affordance: right requirement, wrong surface

Spec §2 constraint 2 requires the affordance exist, so this is not a spec violation.
But `1a` puts it on **Home** as a row — *"3 new printers this week"* beside
**`CATALOG 214`** — while the build shows it inside the My Gear panel on open, worded
*"{n} new since your last visit"* / *"{n} nye siden sidst"*, with no total count.

Three deltas: surface, window (*this week* vs *since your last visit*), and the missing
catalog total.

---

### M11 · MEDIUM — the design assumes an app shell that does not exist

`BRIEF` decision 1: *"Four tabs, not five. Home · Expert · Inventory · Workshop."*
`1o` specifies wizard-inside-Home-tab coexistence and tab-state preservation.

The shipped iOS app has **no tab bar at all**: `ContentView.swift:59-74` is a single
`NavigationStack` with a push flow. So "four, not five" is measured against a proposal,
not against the app. Adopting the design means building a tab shell first — and two of
its four tabs (**Expert**, **Inventory**) are Trains 3 and 2, unbuilt.

Plan Tasks 7–9 modify `HomeView` / `BrandPickerView` *inside the current NavigationStack*.
They assume the shell the design replaces.

---

### M12 · MEDIUM — light mode is designed; the plan forbids it

`4a`/`4b`/`4c` deliver a full light palette and an Appearance switcher row in Settings.
Plan Task 8 step 4 says, verbatim: *"dark-mode-only styling per `ColorTheme`."*
The shipped app hard-locks it — `ContentView.swift:79`, `.preferredColorScheme(.dark)` —
over roughly 49 hardcoded colour sites (see the design spec §8.4).

---

### M13 · LOW — Settings is designed as a screen with scope the program has not ratified

`3a` makes cloud sync the headline card and adds **Printer Link** (LAN/MQTT per printer,
live telemetry strip), a device list, and a **+25 CR referral**. Spec §5 places accounts
and backend in a later phase; Printer Link and referrals are not in the spec at all.

Not a Train 1 conflict. It matters because Task 8 plans a "Settings row entry" into a
screen the design has since given a very different job.

---

### M14 · LOW — first-run vocabulary

`1d`: *"No support card, no news, **no gear vocabulary yet**."* CTA is
**`Set up your first print`** — `5 STEPS · ABOUT A MINUTE · NO ACCOUNT`.
The build renders the My Gear nav entry unconditionally (Task 3 step 1), so gear
vocabulary is present before any gear exists.

---

## Schema defects found by the adversarial gate

These came from the Codex gate on this review and were then **reproduced independently**
with direct probes against `gear-store.js` (probe script and raw output in the session
log). They are not model disagreements — they are defects in the envelope the branch
would have frozen. Listed here because the re-model has to carry them as requirements.

### S1 · MUST-FIX — `order` accepts non-string ids and duplicates the row

`_read()` filters `env.order` by *presence* (`base.setups[id]`, which coerces `1` → `"1"`)
but never by *type*; orphan recovery then compares strictly and appends the string form as
well.

```
env.order = [1]   with   setups = { "1": {...} }
→ listSetups() returns 2 rows, ids [1, "1"]   ← one setup, two entries
```

No writer in `gear-store.js` can produce this — but the envelope's whole point is that
**iOS becomes a second writer**, and that is exactly the guard the existing orphan-recovery
comment says it exists for. The fix is one line: coerce/filter `order` to strings before
dedupe.

### S2 · SHOULD-FIX — `saveSetup` accepts a setup with no hardware at all

```
saveSetup({})  →  { ok: true, id: "c626f5ef-…" }
saveSetup({ name:'x', printer:'NOT_A_PRINTER', … })  →  { ok: true, … }
```

Not validating ids against the catalog is deliberate and correct (the store must stay
Engine-independent — that is why catalogs are injected). Accepting a row with **no
printer, no nozzle and no material** is a different thing: it writes a permanently
unusable record. Required-field rejection belongs in the store even when catalog
validation does not.

### S3 · LOW — a `__proto__` key silently loses the row

```
printers = { "__proto__": {...}, "x1c": {...} }  →  pool ids: ["x1c"]
```

No pollution and no crash — assignment to `__proto__` on a plain object is swallowed — but
one row disappears without a trace. `Object.create(null)` for the keyed maps closes it.

### S4 · KNOWN — pool ordering is not stable across archive

```
add aaa, bbb, ccc → archive aaa → ["bbb", "ccc", "aaa"]
```

Spec §2 promises *"Ordering is stable and explicit."* The code documents the deviation
itself (`gear-store.js:95-99`) and argues it is a read-side fix needing no envelope
change, since every row carries `added_at`. That reasoning holds — recorded so it is not
rediscovered as a surprise.

---

## What survives, regardless of how the model is resolved

Stated plainly so the branch's value is not written off with its model:

- **All of `gear-store.js`'s mechanics** — `archived_at` soft-delete, row normalizers that
  make corrupt storage safe, the `{ok, error}` write contract, stable `order` with orphan
  reconciliation, id generation. Model-independent.
- **`setups{}` is already the design's gear map**, missing only the AMS-owned field
  (per M4, `enclosure` should *not* be added — it is a catalog fact).
- **`applySetupToState` and the Critical fix** (slicer re-routing, `pickerBrand`,
  `pickerCollapsed`) — this is exactly what `1k` requires.
- **`catalog_seen` + `catalogNews`** — survives; only the surface and copy move (M10).
- **`missing_catalog_ref` validation** — survives. `missing_pool_ref` dies with the pool.
- **The pool-first picker idea** (`1j`) — survives; its *source* changes from a stored
  pool to a projection over gears.
- Five plan defects and two production bugs found along the way, all recorded.

---

## Assessment

Five of the fourteen findings are CRITICAL or HIGH (2 CRITICAL · 3 HIGH · 7 MEDIUM ·
2 LOW), and the two CRITICALs are not independent — M1 and M2 are the same disagreement seen from the storage side and the
flow side.

"Fix it" is therefore not a missing button. Adding the `1l` quick-save banner (M2) on top
of the current model would give the app **three** ways to acquire gear — the banner, the
pool tabs, and the setup editor — where the design has one page and one banner. That is
more half-finished, not less.

**Premise correction (owner ruling, 2026-08-20).** An earlier revision of this document
asserted that the 2.0 design is *binding*. That is wrong and the owner corrected it:

> "ui design is just a design document about how it can look like.. it maybe shows how i
> imagine some features and you should always ask me to verify if there is a mismatch but
> dont take the ui design as requirements as in the spec"

So the design is **input, not authority**. Spec §2 remains the ratified contract. Every
finding below is a **question for the owner**, not a defect proven against a requirement.
Where this document says the build "should" match the design, read it as "the design
differs here — rule on it."

This weakens the design-sourced findings and leaves one untouched: **M2 is owner-sourced.**
The owner described the missing flow in his own words — *"i'm on start page, i select
brand, printer, nozzle, filament and get a 'add to your gear option'"* — before this
review read the design brief. The design agreeing with him is corroboration, not the
source.

The merge-as-is case therefore deserves fair statement:

> The branch implements exactly what spec §2 ratified. The design is out-of-repo,
> unratified, and internally contradictory in at least one place (M5). A stored pool can
> sit behind a gear-first UI. Inventory is plausibly a sibling store, not a replacement.
> The branch carries tested mechanics and a near-zero blast radius — no user has gear
> today, so the feature is additive by construction.

What defeats it is not the design's authority. It is (a) the owner's own product ruling
that a half-finished feature does not ship, with M2 naming what is missing, and (b) the
fact that merging freezes a permanent envelope that the adversarial gate has just shown
carries three real defects (S1–S3).

**The park decision therefore still holds**, on the owner's product judgement (M2) plus
the envelope defects (S1–S3) — not on the design's authority, which it does not have.

## Recommendation

1. **Keep the branch unmerged and unpushed** as the reference implementation. Nothing to
   revert; nothing shipped.
2. **Treat the envelope as unfrozen.** No writer has reached a real user's browser, so
   `3dpa_gear_v1` is still free. That freedom ends at the first production write.
3. **Resolve M1 before anything else** — one layer or two. Every other finding is
   downstream, and it decides whether the pool maps exist at all.
4. **Get an owner ruling on M5's contradiction** (intent in the auto-name vs. intent
   staying per-print). It is small, it is cheap now, and it is in the design itself.
5. **Carry S1–S3 into the re-model as requirements**, not as a bug backlog. They are cheap
   now and permanent later.
6. **Re-ratify spec §2**, then re-plan Train 1 against the design. Tasks 1–5 get reshaped;
   Tasks 6–10 were never built and should be written against the tab shell (M11), not the
   current `NavigationStack`.

## Open questions for the owner

- **M1:** does a stored "what I own" pool earn its place once Inventory (Train 2) owns
  filaments and gears imply printers? If not, it should not ship.
- **M4:** confirmed — `Enclosed` is a catalog fact (`enclosure`, 83 records), not an
  input. Remaining question: is "I own the AMS unit" a gear field or a printer-level
  user fact that several gears on the same printer would share?
- **M5:** hardware-only auto-name, or intent back-filled from the first run via `1l`?
- **M11:** does 2.0 build the four-tab shell before Train 1's iOS half, or does Train 1
  land inside the current NavigationStack and get moved later?
- **M13:** are Printer Link and referral credits in the program, or designer speculation
  to park?


---

## Review provenance

- Findings M1–M14 and the "what survives" list: this session, from the design artboards,
  spec §2, the plan, and the branch code.
- Adversarial gate: `bridge --mode codex-only`, transcript at
  [`bridge-2026-08-20-211010-705733.md`](bridge-2026-08-20-211010-705733.md). It refuted
  the original M1 framing, the original Inventory argument, the M2 schema assumption, and
  an M4 self-contradiction — all four are corrected above rather than defended. It also
  surfaced S1–S3, which were then reproduced independently before being accepted.
- Catalog claims in M4 verified against `data/printers.json` (`enclosure` on 83 records;
  `multi_color_systems` values `ams`/`ams_ht`/`ams_lite`).
- Severity counts verified programmatically, not by eye.
