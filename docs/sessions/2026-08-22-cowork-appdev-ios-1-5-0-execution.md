# 2026-08-22 — Cowork (appdev): iOS 1.5.0 My Gear — autonomous execution

Execution log for the [1.5.0 plan](../superpowers/plans/2026-08-22-ios-1-5-0-my-gear-plan.md).
The owner handed over full autonomy this session: run the phases end to end,
take technical decisions with subagent + cross-model input, stop only for
something genuinely critical. Evidence is recorded per phase as it is produced,
not reconstructed at wrap-up.

## Durable context

- **The iOS repo is private; the web repo is public.** Actions minutes are
  therefore billed for iOS and free for web, and `macos-26` bills at 10x. This
  is what decides PR granularity — see the PR-strategy entry below. It is not
  written down anywhere else and it silently governs every CI decision on this
  train.
- **`ci.yml` does not exist on `origin` at all.** The remote knows exactly one
  workflow, `Deploy to TestFlight`; the four CI commits are part of the six held
  locally. So the workflow is not merely "never run" — GitHub has never seen it.
- **iOS locale JSONs live inside `en.lproj` / `da.lproj`**, beside
  `Localizable.strings`. That means the bundle resolves them per-locale for
  free, and it also means the app has three string mechanisms in the tree, not
  the two the plan named.
- **Test fixtures on iOS are inline `#"""` raw strings**, not bundle resources
  (`WorkshopStoreTests.swift:29`). Gear fixtures inherit that, which removes a
  whole class of XcodeGen resource plumbing from Phase 1.

## Phase 0 — freeze the boundary · GATE MET

| Gate item | Result |
|---|---|
| `claude-sync.sh hold` ACTIVE | set — "iOS 1.5.0 release train" |
| The six held shas, exactly | `ffd64f4 9050d28 79fc8dc e5cff55 b613d55 98cc9cb`, count 6, no drift |
| Engine mirror vs **pushed** web `origin/main` | `090b52ac31deabe7` both sides |
| Data tree mirror (not required by the gate, checked anyway) | all 7 JSONs identical |
| Full suite green at 222 | **222 executed, 0 failures**, `-testLanguage en -testRegion US` |
| Branch | `feat/ios-1-5-0-my-gear`, nothing touches `origin/main` until Phase 7 |

Storage contract re-read in full before any store code. Its §1 forbidden
pattern is now recorded as superseding the gear spec's word "Codable" —
amended in the spec itself (`1157ada`), because the ambiguity had to close in
the document a porter would actually read.

### Two risks closed early rather than at Phase 6

`testflight.yml` had no `timeout-minutes` (`5952909`). It inherited GitHub's
360-minute default on the 10x runner in a repo that has hit quota once; the
eight builds on record run 4m55s-7m17s, so it is now bounded at 30.

### PR strategy — decided on evidence, not habit

Pushing a feature branch does **not** trigger `ci.yml` (`push:` is
`branches: [main]`); opening a PR does. With iOS private and macOS at 10x,
eight phase-PRs would spend roughly 560 billed minutes before a single build.
Three PRs on coherent units — after Phase 1, Phase 3 and Phase 5 — plus the
release push give four CI runs and still put the workflow on the real runner
early, which is the point (`feedback_push_ci_to_the_real_runner_early`).

### Open decision 9 taken: the file is `gear.json`

`Application Support/3DPrintAssistant/` already holds `workshop.json` and
`app-state.json`, both with an injectable `fileURL` for tests. The spec says
"beside `app-state.json`" and never names it. `gear.json` is the only name
consistent with the two files already there.

## Phase 0.5 — the `AppState` spike · GATE MET

**Answer: optionalize the TYPE, keep the INIT defaults.** The spike separated two
changes the plan had treated as one, and only the first is needed.

### What was measured, not reasoned

Driven against the real `engine.js` (node, `vm`, the repo's own snapshot
harness), 10 hardware states x 7 engine surfaces + per-field isolation, 140
comparisons:

| Question | Measured answer |
|---|---|
| absent vs explicit `null` vs `undefined`, per field | **identical, 7/7**, on `resolveProfile` |
| which of the seven change `resolveProfile` when absent | **`surface`, `strength`, `speed` only** — measured against the current iOS defaults, which is a narrower claim than "these three are the only ones that matter" |
| `getFilters` / `getWarnings` / `getChecklist` / `getAdvancedFilamentSettings` with all seven absent | **byte-identical** — the wizard renders fine with nothing answered |
| params returned as answers arrive | **4 → 12 → 20 → 28** |

So an iOS dictionary that OMITS a key is exactly what web sends as `null`. No new
engine behaviour is introduced by the change.

### The two facts that settled it

**Web's state is null for all seven** (`app.js:66-78`) and its codec's
`defaultState()` sets every single-valued field to `null`
(`state-codec.js`). iOS's concrete defaults are the anomaly.

**A 4-param profile is shipped web behaviour, not a broken screen.** Web gates
output on `hasMin = printer && nozzle && material` (`app.js:2691`) — hardware
only. A live web user who picks only hardware already sees exactly that profile,
with 1 warning and a 5-item checklist. Unanswered is progressive disclosure.

I had initially written that a partially-pinned gear reaching Output would be a
**correctness failure**. It is not, and measuring web is what corrected it.

### Why the type changes but the default does not

- **the TYPE** (`String?`) makes the compiler enumerate the 31 sites that must
  consider unanswered. `ProfileKeyHasher.swift:28-33` is the one that would
  otherwise corrupt silently — `"surface=\(state.surface)"` compiles against an
  optional and yields `Optional("fine")`, with no test covering it.
- **the INIT default** stays concrete, so `AppState()` behaves exactly as today.
  **120 test constructions keep working**, and a fresh wizard run is unchanged
  for every existing user. Nilling the defaults would quietly change the default
  experience of a release that is supposed to be about gear — scope the plan's
  §1 rule cuts.
- `pick` → `pickOptional` for the seven is **still required**, or a user who
  backgrounds the app with surface unanswered gets "standard" re-materialized on
  restore. That is the §6 risk whose failure mode is silent.

A `""` sentinel would need no type change at all and the wire format would be
identical — rejected because the type system is the mitigation here, not the
cost, and `""` is already overloaded (on `nozzle` it means "cleared as
incompatible").

### Cross-model challenge — `bridge --mode codex-only`

It returned **Refuted**, and four of its findings were correct on verification.
Two were things I had missed outright:

1. **Export paths deliberately fill defaults before resolving** — three sites,
   `state.surface || 'standard'` (`engine.js:3333`, `:3545`, `:7314`, Bambu
   legacy / Bambu-Orca / Prusa). So a partially-answered state does **not**
   export a 4-param file; it exports a **complete default profile**. Verified.
   iOS inherits this automatically — its `engine.js` is byte-identical and
   carries the same three sites — so the platforms agree, but the behaviour is
   silent and is now recorded rather than discovered later.
2. **Analytics would report unanswered fields as explicit choices**
   (`AnalyticsService.swift:136-138`). For a release whose entire purpose is to
   find out whether the gear model works, that corrupts the answer. The type
   change turns it into a compile error rather than a silent one — but the
   semantic call still has to be made deliberately: report unanswered as
   unanswered, never as the default.
3. **"D4 is implemented by null" overreached.** Null makes fields unanswered; it
   does not make anything ask. On iOS the five-step wizard structure does the
   asking, and route-level enforcement is the mechanism — not a nicety.
4. **`engine.js:2301` already separates unanswered from invalid**: empty or
   undefined passes through untouched, truthy-but-unknown coerces to the
   documented default. Combined with the codec degrading unknown ids to `null`,
   the composition is coherent and it is what iOS should mirror.

Its proposed cheaper option — an `answeredKeys` set carried by gear apply —
addresses the pre-amendment draft it was given; keeping the init defaults is
cheaper still and touches no test.

## A finding that reframes Phase 3: iOS ships a complete Danish locale nobody can see

Measured, not inferred:

| | keys | of which genuinely translated |
|---|---|---|
| iOS `da.lproj/da.json` | 272 | **250** (only 22 match English, and those are words like "Printer" that are the same in Danish) |
| web `locales/da.json` | 365 | 345 |
| web gear keys | 61 | 60 translated |

**`_lang` never becomes `'da'`.** Verified in the source rather than inferred:

- `engine.js:18` hardcodes `let _lang = 'en'`.
- `setLang` is exported (`engine.js:7769`) and called from **zero** Swift call
  sites — grep across the whole tree.
- `engine.js:158` restores the preference from
  `localStorage.getItem('3dpa_lang')`, but iOS's `localStorage` is a stub whose
  backing is `var store = {}` recreated per `JSContext`
  (`EngineService.swift:272-283`), so that read returns `null` on every launch.

So `da.json` is loaded, hard-fail-validated as `_critical`, held in memory as
`_T.da` — and never read. Every engine-derived label in the app is English on a
Danish device: the filter group titles, the chip labels, the use-case names.

This is not a Phase 3 nicety, it is a prerequisite. The Danish feature name
**"Mit grej"** is already ratified, and gear's strings arrive through the same
`t()` that is pinned to English. Wiring `setLang` after `init()` — it guards on
`_T[lang]` being populated, so ordering matters — is roughly three lines and
lights up 250 strings that are already written, reviewed and shipped in the
bundle.

It is also the single largest user-visible change in the release, on a train
that is not about localization, and those 250 strings have never been seen in a
running app. The plan's Phase 5 gate already requires an explicit Danish
walkthrough (`-testLanguage da -testRegion DK`), which is where that risk gets
paid down rather than discovered.

**Recast of the Phase 3 locale work:** the headline is not "add nine Home
translations". It is "the app already has the translations and cannot reach
them." The nine `Strings.Home` constants are the small half.

## Phases 1-3 · what landed and what it cost

| Phase | Gate | Result |
|---|---|---|
| **1** | `JSCompat` + `GearStore`, fixtures from the real module, negative control live | **met** — 297 green |
| **2** | Full suite green with no test deleted, live JSCore proof, backgrounding round-trip | **met** — 309 green |
| **3** (locale half) | Locale parity in three directions, `diff` empty, `Strings.Home` bilingual | **met** — 316 green in **all three** modes |

### The `en/US` test pin is retired

The storage contract said local runs need `-testLanguage en -testRegion US` or a
Danish simulator gives false reds. That was true, and the workaround had a cost
the plan named: a suite pinned to `en/US` **structurally cannot see a missing
Danish key**.

Three tests were the whole problem. They now assert against the constants
production resolves, or branch on language explicitly. The suite is green under
`en/US`, under `da/DK`, and unpinned — **the first green Danish run this repo
has had** — so the Phase 5 Danish gate is a real gate rather than "green except
the two we know about".

### Two UNVERIFIED questions settled by experiment

**`-testLanguage da` does reach an app-hosted unit-test bundle's
`Bundle.main.preferredLocalizations`.** The plan flagged this as needing a
runtime probe, and the whole Danish gate rested on it. Proved by removing the
`setLang` call and re-running under Danish: it fails with `("en") is not equal
to ("da")`. A green run alone would have proved nothing.

**The engine-language test cannot fail under `en/US`** — bundle English and
engine default English agree whether or not anything calls `setLang`, which is
exactly how the defect survived. That limitation is now written into the test
rather than left as a trap for the next reader.

### `ci.yml` has now run

[PR #4](https://github.com/mustiodk/3dprintassistant-ios/pull/4) triggered the
workflow's **first execution in its existence** — both jobs green, including the
new locale gate. The risk that its debut would be the release push is closed.

### Cross-model review of the port found three real defects

All three were verified against the real runtime before being fixed, none
accepted on the reviewer's word:

1. **The key-collapse guard covered only gear ids.** Nested keys collapse the
   same way — verified: two `fields` keys differing only by normalization parse
   into ONE key holding the SECOND value, so the first is gone before any Swift
   runs. Any write then drops data it never touched. Now write-locked anywhere
   in the tree, with non-ASCII still allowed where it is unambiguous.
2. **Numeric re-serialization laundered untouched bytes.** Swift and JS agree on
   the digits and disagree on presentation in four ways (`1e-6`, `1e-7`,
   large integrals, `-0`). Replaced with the spec's own `s`/`k`/`n`
   decomposition, differentially tested against `JSON.stringify` on 29 values.
   That also removed an `Int64(d)` conversion that would have **trapped** past
   9e18 — a laundering fix took a crash out with it.
3. **Objects inside an array shared one key-order path**, so the second was
   re-emitted in the first's order.

### Corrections I made to my own work

- I claimed `"Epoxy Resin"` was a proper noun identical in both locale tables.
  It is `"Epoxyharpiks"`. The test caught it.
- My first `JSCompat` draft had three number-formatting errors that node
  contradicted, and an `Int64` conversion that would have trapped.

## Phase 4 — Home leads with My Gear · GATE MET

**407 tests, green in both languages.** Height is the gate and it fires: each
figure is asserted twice — from the constants the view lays out with, and from
the rendered view through `UIHostingController.sizeThatFits` — because either
alone drifts from the other. Inflating the row height to 72 turns five gate
tests red.

| | budget |
|---|---|
| hero (computed; the ~336pt screenshot agrees within 5%, smaller used) | 321.6 |
| compact header on returning launches | −50 |
| **freed** | **271.6** |
| 1 gear / 3 gears / 8 gears + door | 84 / 212 / 262 |

A fourth row is asserted **not** to fit, so the three-row cap has a reason in CI
rather than in a comment.

### Seven states, not the canvas's six

The extra one is the **bridge**: a returning user with saved Workshop profiles
and no gears. Every existing 1.1.4 user lands there on upgrade. The canvas does
not draw it because the canvas assumes 2.0, and showing those users the
first-run hero would teach the app to someone who has been using it for months.

### The plan's §4 interaction cut was wrong, and measuring said so

It called for swipe + context menus on the gear card. `.swipeActions`,
`.contextMenu`, `.onDelete`, `EditButton` and `List` have **zero** usages
tree-wide; every list here is a hand-rolled `VStack` of `Button`s. The app's
universal destructive idiom is two-tap arm-then-confirm
(`WorkshopView.deleteTapped:234-246` plus all five pickers), and that is what a
gear row got.

### What a screenshot caught that 407 tests could not

After the locale work landed, Home rendered fully in Danish **except one English
button** — "My Workshop" — between "Støt 3DPA" and "Produktopdateringer".

The plan scoped Home's localization **by namespace** and excluded Workshop. That
boundary is wrong for a goal stated as "one screen, one language":
`Strings.Workshop.homeButton` is rendered by `HomeView`. It is now
`Strings.Home.workshopButton` / **"Mit værksted"**, which pairs with "Mit grej"
rather than reading as two unrelated decisions. One string — the other 113
excluded strings stay excluded.

**This is the argument for looking at the thing you built.** No test could have
seen it, because every test was correct.

### One judgement call, checked rather than asserted

The gear section must render during engine loading and after engine failure,
where `Engine.t` is by definition unreachable — an engine-only path would print
raw key names in exactly the two states where a user is already confused. So
`Localization.engineText` reads the **same** `{lang}.lproj/{lang}.json` the
engine is handed, through the same selector `setLang` receives, reproducing
`engine.js:25`'s fallback chain. One table, two readers — and a test boots the
engine and compares all 61 gear keys against `Engine.t` to keep it that way.

### CI is green on the real runner

Both jobs, all 367 tests at the time of the Phase 3 push, plus the engine mirror
and the new locale gate.

---

## Phase 5 — creation and navigation

Delegated to a subagent, then verified independently: I re-ran both language
modes against my own build and reproduced two of its thirteen negative controls
rather than accepting the counts on its word.

**460 tests, 0 failures, green in both `-testLanguage en -testRegion US` and
`-testLanguage da -testRegion DK` from ONE build** — so the two languages are
genuinely being compared and not two separately-compiled things.

Negative controls I re-ran myself: back label back to a compile-time constant →
**10 red**; wizard order swapped → **1 red**, in
`test_withBothHardwareGapsOpenMaterialIsAskedBeforeNozzle`. Both matched what the
agent reported.

### The defect the phase exposed

`NavigationPath` is type-erased. It reports a count and nothing else, so it
cannot answer "what is behind me" — which is the only question a labelled back
button has. Every screen answered at compile time with a hardcoded string, and
every one is wrong off the walked path: `WorkshopView.load` resets the stack and
pushes Output, whose back button then reads "‹ Print Details" while going Home.
**That is live in 1.1.4.** Deep entry makes it reachable from the feature this
release is named after.

Every route in this app is one `AppRoute` case, so the erasure bought nothing and
cost the answer. The stack is now `[AppRoute]`.

Navigation had **zero** test coverage before this phase — no test file referenced
`AppRouter` at all — which is the whole explanation for how a mislabeled back
button shipped and stayed.

### The test that passed vacuously

The agent's first wizard-ordering test opened only one hardware gap at a time, so
either branch order gave the same answer and the negative control stayed green.
A printer-only gear arrives with both material and nozzle open, which is the live
case. Rewritten until it discriminates. The order is **printer → material →
nozzle**, which is not the obvious one.

### Recorded, not hidden

`EngineService` binds neither `setActiveSlicer` nor `getActiveSlicer` — iOS
derives the slicer per render from the printer — so **spec V10 is unmirrorable on
iOS**. A test asserts those two deps are nil and says why, so wiring one later
turns a passing assertion red rather than sliding in.

### Web companion change (committed to web `main`, deployed)

iOS emits `gear_created` / `gear_applied` / `gear_archived`. **None of the three
was in the Worker's `EVENT_KEYS` map**, so every one would have been rejected as
`invalid_event` before a property was examined — and the client swallows that
rejection. Shipping the app without this loses the data silently on both sides.

`gear_applied` carries `type` = `ok` / `degraded` / `stale`: a gear is a pin
taken against a catalog that keeps moving, so "are saved gears still resolving
cleanly a month later" is the question the feature has to answer, and a bare
count of applies cannot tell a healthy install base from one quietly degrading.
The pinned hardware is deliberately NOT carried — on a per-gear event it would
turn an aggregate counter into a per-user hardware fingerprint.

Note for the record: the agent named the constant `EVENT_PROPERTY_ALLOWLIST`.
There is no such symbol; it is `EVENT_KEYS`. The substance was right, the
pointer was not, and a comment pointing at a grep that returns nothing is worse
than no comment.

## Phase 6 — adversarial review

`bridge --mode codex-only`, full-feature hostile review. Transcript:
`3dprintassistant-ios/codex/gear-1-5-0-review/bridge-2026-08-22-214407-867173.md`.

Three findings. **Every one verified empirically before anything was edited** —
the reviewer's account of a defect is a claim like any other.

**HIGH — `GearContext.itemNames` was a canonically-collapsing dictionary.**
Confirmed against real Swift: two inserts whose keys differ only by Unicode
normalization leave `count == 1`, and the *composed* id reads back the
*decomposed* entry's value. Worse than a lookup miss, because it answers
confidently and wrongly, and `GearSaveModel` feeds those names into the gear's
`labels` — a field of the frozen shared envelope. iOS would have persisted a
label web never wrote. `GearCatalogs`, built from the same snapshot and sitting
in the same struct, already used `Set<[UInt8]>` for exactly this reason. Fixed
with `ByteKeyedMap` at both levels. Commit `b371aba`.

While verifying it I measured something adjacent and worth writing down:
**`JSONSerialization` also collapses canonically-equivalent object keys where JS
keeps both** (1 key vs 2, checked against node). That does not reach the store,
because `RawShape` flags exactly this case as `ambiguousKeyPaths` and refuses the
write — and it works *because* Swift collapses. The existing design was already
correct here; now it is measured rather than assumed.

**MEDIUM — three Gear screens rendered half Danish.** The release that made
"whole screens, or nothing" the rule shipped a save sheet reading "Gem som gear"
with an English "Cancel". All three borrowed from `Strings.Workshop`, whose
members are English-only constants — correct for Workshop, wrong the instant a
fully-Danish screen borrows one. Both replacements (`gearArmCancel`,
`nameModalSaveBtn`) are ratified keys already on web. Commit `b5486d2`.

No value assertion could have caught this: every string was correct for the
namespace it came from. The defect was in the wiring, so the new test reads the
wiring — nothing under `Views/Gear/` may reference `Strings.Workshop` or
`Strings.Nav`.

**LOW — declined, with the reason.** A same-byte duplicate key scans clean and a
write drops the shadowed value. This matches JS last-wins parsing exactly, so
"fixing" it would *create* the divergence it appears to remove. The gap is
already documented in `GearStoreTests`. Recorded as a written decline rather than
a silent one.

**464 tests, 0 failures, green in both languages.** Each fix's test was confirmed
to go red when the fix is reverted.

## What Phase 6 still needs, and it is not mine to do

- A **manual screenshot pass** of all six Home states in both languages.
- **Owner sign-off on a locally-installed build in both languages**, recorded
  here. The plan's gate is explicit: *no dispatch before that line exists.*

Phase 7 (version bump, push to `main`, one TestFlight build, ASC submission) is
blocked on that signature, and the sync hold stays ACTIVE until the Phase 7
commit lands.
