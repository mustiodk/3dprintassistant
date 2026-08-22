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
