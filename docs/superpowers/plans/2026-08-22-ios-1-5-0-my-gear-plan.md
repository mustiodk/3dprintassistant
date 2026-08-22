> **Where this sits:** the implementation plan for iOS **1.5.0 — My Gear**, the
> standalone release ratified in [D21](../../reviews/2026-08-20-gear-model-owner-decisions.md).
> Governed by the [gear model v2 spec](../specs/2026-08-20-gear-model-v2-spec.md)
> and bound by the [iOS storage contract](../specs/2026-08-22-ios-storage-contract.md).
> Pixels come from [`docs/design/`](../../design/). Not served publicly.

# iOS 1.5.0 — My Gear · implementation plan

**Created:** 2026-08-22. **Owner:** Musti. **Status:** revised after a
plan-gate NO-GO (`bridge --mode codex-only`, 2026-08-22). Four must-fix and five
should-fix findings applied; the review transcript is in
[`../../reviews/`](../../reviews/). **The three shape-changing decisions were
taken by the owner on 2026-08-22** (§5.1–5.3); eight smaller ones remain open and
none of them blocks Phase 0.5 from starting.

---

## 1. What 1.5.0 is

My Gear inside the shell that already exists. No tab bar, no Settings, no light
mode, no sync, no Pro.

The whole release is **one loop the user can complete**: configure a print the
way they do today → save that hardware as a gear → next launch, tap the gear on
Home and land on the intent step with steps 1–4 already answered. Anything that
does not serve that loop is cut in §4.

Alongside gear it carries the six commits already sitting on local `main`: two
`WorkshopStore` data-safety fixes that are genuinely user-visible, and four CI
commits that are invisible to users but activate a workflow **that has never
run**.

## 2. The sequencing principle

**Spike the riskiest structural assumption first, then port the frozen
contract, then touch a view.**

The plan-gate rejected an earlier ordering that put the whole port ahead of the
`AppState` change. The objection was right: Phase 2 is named the release-slip
risk *and* is a prerequisite for apply() and every view, so proving the hardest
structural assumption last is bad sequencing. `GearStore` is isolated; **release
viability is not.** The resolution is a thin spike (Phase 0.5) that answers
Phase 2's question before the port absorbs effort, while leaving the full
optionalization where its blast radius can be managed.

The gear logic is provably engine-free — zero `Engine.` references in either
`gear-store.js` or `gear-validate.js`, and iOS `engine.js` is byte-identical to
web. It is dependency-injected and covered by **241 JS assertions**, so it can
be ported and proven correct with no UI in the tree. It is also the largest body
of work and the one with the sharpest correctness bar: `3dpa_gear_v1` has been
frozen since the first production browser write on 2026-08-21.

Immediately after comes the one structural change the whole feature rests on and
that no scope could avoid — see §3, Phase 2.

## 3. Phases

A **gate** is something you run that can fail. **Release evidence** is
something a human produces and signs. The plan-gate caught an earlier draft
calling both "gates" — screenshots and owner sign-off are evidence, and labelling
them gates makes the phase look verified when it is only attested.

### Phase 0 — Freeze the boundary, establish ground truth
Nothing about the six held commits, the engine mirror, or the test baseline is
taken on faith.

- `claude-sync.sh hold "iOS 1.5.0 release train"`; release only after the
  version-bump commit lands in Phase 7.
- Confirm the held set is exactly `ffd64f4, 9050d28, 79fc8dc, e5cff55, b613d55,
  98cc9cb` and nothing else. The two `WorkshopStore` fixes are the reference
  implementation the storage contract was written from — a rebase that reorders
  or drops them removes the model this port mirrors.
- Verify the engine-mirror gate passes against **pushed** web `origin/main`, not
  the local ref.
- Re-read the storage contract in full before writing store code. Record that
  §1's forbidden pattern supersedes the 2.0 spec's word "Codable" for gear.
- Branch or worktree. Nothing touches `origin/main` until Phase 7.

**Gate:** hold ACTIVE · the six shas exactly · engine sha match against pushed
web · full suite green at **222**. If it is not 222, that is resolved before
anything else starts.

### Phase 0.5 — Spike: can `AppState` represent "unanswered"?
**New, on the plan-gate's objection.** Timeboxed, throwaway, on a scratch branch.

Answer one question before the port begins: can a partially-pinned gear leave
fields genuinely unset end to end — through `AppStateWebCodec`, through the
backgrounding snapshot, through the segmented controls, and through live JSCore?
Touch only what the answer needs; delete the branch afterwards.

**Gate:** a written answer in the session log, either *"optionalize — here is the
proof it survives all four"* or *"optionalize is blocked at X — take the
`answered: Set<String>` fallback."* The fallback is then an explicit owner
decision (§5.1), not something drifted into at Phase 2 under schedule pressure.

### Phase 1 — Port the frozen contract: `JSCompat` + `GearStore`
`gear-store.js` runs as Swift against fixtures generated by the real JS module,
with every JS/Swift divergence pinned by a test rather than found on a device.

- **`JSCompat`** — one file for every place Swift and JS disagree, so each
  divergence has one implementation and one test: `jsTrim` (JS strips U+FEFF,
  Swift does not), `jsTruthy`, `jsNumber` (incl. rejecting a JSON `true` that
  `as? Double` would accept as 1), `jsString` (lifted out of `WorkshopStore`),
  `utf8Compare` (Swift `String <` is canonical-equivalence, **not** bytewise —
  the frozen id tie-break depends on real bytes), a **structural** ISO validator
  (not `ISO8601DateFormatter`, which disagrees with `Date.parse` on year 0000
  and the `0000-00-00` sentinel), `newGearID` lowercased.
- Gear model as a **read-only projection** retaining `raw`, per the contract.
- Normalization and the total order — in-memory only, a read never writes.
- Read API, then the write chokepoint: `save`, `touch` (bypasses the normalizing
  path deliberately), `archive`, `restore`, and `update`'s one-basis pair
  algorithm.

**Gate:** `xcodegen generate` produces no unexpected pbxproj drift · the fixture
generator is idempotent · full suite green at 222 + new store tests ·
`WorkshopStoreTests` still green after the `jsStringCoercion` lift · **and the
contract §7.2 negative control runs live** — disable unknown-key preservation,
watch the round-trip go red, restore it, watch it go green.

### Phase 2 — Make "unanswered" representable in `AppState`
**This is the phase most likely to make the release slip.** See §6.

`AppState` today cannot represent "unanswered": `nozzle` defaults to
`"std_0.4"` and seven intent fields are non-optional `String` with concrete
defaults, while web's state object is `null` for every one of them. Spec §3.3
and D4 both require a gear pinning only printer and material to leave the rest
unset so the wizard asks.

**Gate:** full suite green at the Phase 1 count **with no test deleted to make
it pass** — a deletion must be replaced by an assertion of the new behaviour,
one commit each. Plus the real proof: build an `AppState` with only printer and
material set, run it through **live JSCore** `EngineService.resolveProfile`, and
assert a profile returns with no invalid-preset warning. That converts "engine.js
coerces, I read the source" into "JSCore returned a profile." Plus a
backgrounding round-trip preserving unset as unset for all eight fields.

**And, on the plan-gate:** `resolveProfile` returning is necessary but not
sufficient — engine defaults can make it pass while the UI semantics are still
wrong. Add route-level assertions: a partially-pinned gear must **land on the
first unanswered step**, and `AppStateWebCodec` must not re-materialize
synthetic defaults for absent fields on serialization. That codec is one of the
three things §6 names as able to silently undo this whole phase.

### Phase 3 — `GearValidate`, string plumbing, locale mirror
Resolved gear content applies onto the typed `AppState` with web's exact
ordering and failure modes.

The validation order is **load-bearing and must not be reordered**: unknown key
→ note and skip; membership over every member **before** any coercion;
cardinality coercion; conditionals **after** coercion, failing closed when no
predicate was injected; multi values re-ordered into engine item order.
`degraded` only when values were actually discarded; `stale` outranks `degraded`.

**Locale — measured, and the plan-gate changed the approach.** Web
`locales/en.json` and `da.json` are 368 lines / 365 keys each, **61 of them
gear keys**, at full en↔da parity. The iOS copies are **276 and 274 lines /
274 and 272 keys, with zero gear keys** — so iOS is 92 lines behind on English,
94 on Danish, and **not even internally consistent: its own en and da differ by
two keys.**

An earlier draft said "mirror the JSONs and add a loader." The plan-gate rejected
it, correctly: iOS **already has two** language mechanisms — a process-locale
`usesDanish` check in `Strings.swift` and bundle-resolved `NSLocalizedString` —
and they resolve differently, which is how a screen ends up half in each
language. A JSON loader would be a **third**.

**The rule instead: every Home and Gear string resolves through ONE mechanism,
keyed the same way the test-language pin keys it.** Mirroring the web JSONs is
still how the Danish text arrives — it is owner-ratified and re-mirroring closes
drift that is required work regardless — but it feeds the single chosen
mechanism rather than standing beside it. The Danish feature name is **"Mit
grej"**, already ratified.

**Plus the owner's 2026-08-22 decision: clean up Home's localization.** Scoped
explicitly so it cannot creep — `Strings.Home`'s **nine** English-only constants
become bilingual **on the single mechanism above**. That is what makes the
decision worth more than nine translations: Home becomes the first screen where
one mechanism owns every string, and the gear block inherits it rather than
adding an island. Today the app is 31/153 bilingual (**20%**), and a Danish user
sees a half-translated Home in production: Danish `Støt 3DPA` and
`Produktopdateringer` beside English *"Smart profiles for every printer,
material, and goal."*, `Configure Print`, `My Workshop`, `Send Feedback`. The
other 113 English-only strings across `Feedback`, `FilamentTab`, `Output`,
`Picker`, `Nav`, `Goals` and `Checklist` are **not** in this release.

**Gate:** V1–V20 mirrored and green · a test proving a nil `mineAvailable`
predicate fails closed · locale parity green in all three directions ·
`diff` between web and iOS locale JSONs empty · `Strings.Home` fully bilingual ·
full suite green.

### Phase 4 — The gear surfaces on Home
Home leads with My Gear in all six states the canvas draws (`1a` 3 gears, `1b`
8 gears, `1c` one gear, `1d` first run, `1e` loading, `1f` engine error), inside
today's `NavigationStack`.

**The vertical budget, measured two ways and in agreement.** Today's hero — the
144×144 logo tile, 32pt padding, the 40pt two-line Syne title, the tagline —
occupies **~336pt measured on a rendered iPhone 16e screenshot** and **~320pt
computed from the layout code**. The CTA does not start until ~424pt. Canvas
brief decision 4 replaces that hero on returning launches with a compact
wordmark + engine-status row (~50pt), freeing **~285pt**. Three gear rows at the
canvas's own 56pt tap target, plus spacing and a section header, need **~212pt**.
It fits with roughly 70pt to spare.

**Gate:** all previews render without a crash or clipped view · height
assertions green at both gear counts · full suite green · plus a manual
screenshot pass of all six states in **both languages** attached to the session
log. Previews are not a test; the height assertion is the gate.

### Phase 5 — Creation, navigation, and the flow's voice
One creation path, one deep-entry mechanism, one place transient messages appear,
one boot rule that cannot overwrite a restored session.

**Gate:** router tests green (there are none today — see §6) · full suite green
in English **and** an explicit Danish pass (`-testLanguage da -testRegion DK`) ·
plus a scripted manual walkthrough in both languages covering save, run, rename,
archive, restore, make-active, relaunch boot notice, and forcing the degraded and
stale states by editing `gear.json` in the simulator container. **The Danish pass
is not optional:** the pinned en/US command structurally cannot see a missing
Danish key.

### Phase 6 — Adversarial review and owner acceptance **before any build is cut**
This is the phase the 1.1.4 train did not have.

**Gate:** bridge returns no CONFIRMED critical or high finding still open ·
every finding is a commit or a written decline · the CI workflow changes are
committed · required screenshots exist on disk · **and the owner has signed off
on a locally-installed build in both languages, recorded in the session log.**
No dispatch before that line exists.

### Phase 7 — Version, push, build, submit
One push, one TestFlight build, one submission.

**Gate:** `git log origin/main..HEAD` empty after the push · both CI jobs green
on that commit · exactly **one** TestFlight build for 1.5.0, its headSha
matching the reviewed HEAD · all three tip products read APPROVED in ASC ·
submission queued with Manual Release · `verify-parents` current with the hold
released.

## 4. Cut from 1.5.0 — named so they cannot walk back in

| Cut | Why |
|---|---|
| **Tab bar and shell** | Two of its four tabs are 2.0 features. A 1.5.0 tab bar ships half-empty, then gets rebuilt. |
| **Settings · light mode · sync · AI Expert · Inventory · Pro** | Unchanged from D18. |
| **The standalone gear builder (artboard `2a`)** | **The single largest scope-creep vector in this release.** On iOS the wizard *is* the builder — you walk brand → printer → nozzle → material, then save. A separate builder is four picker surfaces duplicating screens the wizard already owns, and buys a shortcut only for users who already have gears. 2.0. |
| **The arming flow** (`maybeOfferArmedGearSave`) | Web's second creation entry point. One creation path in 1.5.0. Strings arrive with the mirror and go unused. |
| **Bundling Syne and DM Mono** | No `.ttf`/`.otf` exists anywhere in the repo and `Info.plist` has no `UIAppFonts` — the type system is **inert app-wide today**. Bundling re-typesets every screen, invalidates nine of ten App Store screenshots on a train whose capture harness already fails 4/6, invalidates this plan's vertical budget, and expands acceptance from "the gear flow" to "the whole app". Gear ships on the system fallback — consistent with the app that is actually live. |
| **App-wide `textSecondary`/`textTertiary` contrast fix** | Real defects, but they change every screen. Gear gets correct new tokens; the app-wide correction goes with 2.0. |
| **D10 — gear-owned brands leading the picker** | → 1.5.1. Largely redundant with the core feature: the payoff is tapping the gear card and never reaching the brand picker. |
| **The catalog-news line** | Ported (it is part of the frozen envelope) but never called. **Knowingly accepted:** `catalog_seen` never advances on iOS in 1.5.0, so web shows stale news counts for an iOS-only user. Behaviour gap, not corruption — **and it is only safe while nothing reads it. Sync reads settings, so 2.0 must either wire the counter or define its merge before sync ships.** Recorded as a blocking follow-up on the sync plan, not a loose end. |
| **A synthesized four-screen back stack** on deep entry | Would build four views whose `.task` blocks call into JSCore, to fabricate a history the user never walked. Single push instead. |
| **A byte-identical emitter for `gear.json`** | Spec §2.1 explicitly disclaims byte-identity and says parity compares decoded structures. `workshop.json` pays for byte-identity because it **is** the user-facing backup format; `gear.json` has no export path in 1.5.0. |
| **Gear export/import** | Its absence is what makes the previous cut safe. The two move together — **adding an export later means revisiting the emitter decision, not bolting a button on.** When 2.0 adds import/export/sync, parity is compared on **decoded structures plus retention**, never on bytes. |
| **Rename/archive controls on the Home card** | Four tap targets in a 56pt row means none clears 44pt horizontally. Swipe + context menu instead. |
| **`_sameMap` / `_sameValue`** | Verified dead on web — `_sameValue` is called only from `_sameMap`, which is never called. Not ported. Worth a web-side cleanup note. |
| **A second What's New paragraph about the tombstone fix** | Both store fixes ship as one "your saved profiles are safer" line. Two paragraphs about storage internals would bury the feature the release is named after. |

## 4b. Migration, rollback, and the users who already exist

**The plan-gate found these missing entirely.** None is large; all three are the
kind of thing whose absence is only noticed after shipping.

**Existing users have saved profiles but no gears.** Every current 1.1.4 user
lands on the zero-gear Home (`1d`) with a Workshop that may already hold six
profiles. The first-run hero is written for someone new to the app, which they
are not. **1.5.0 needs a bridge state**: a returning user with profiles but no
gears is offered the gear idea from something they already have, not taught the
app from scratch. This is a Phase 4 state, drawn nowhere in the canvas because
the canvas assumes 2.0.

**There is no migration, and that is the point.** `gear.json` is a new file;
nothing is rewritten, nothing is converted. `app-state.json` is the one that
changes shape under optionalization — write the compatibility direction down
before Phase 2, not after.

**Rollback is a real question, not a formality.** If 1.5.0 has to be pulled, an
existing 1.1.4 build meets a `gear.json` it has never heard of (harmless — it
never reads it) and an `app-state.json` whose intent fields may now be absent
where 1.1.4 expects concrete strings. **That second one is the risk**, and it is
`AppStateWebCodec`'s defaulting behaviour that decides whether it is benign. Test
the downgrade path explicitly: write state with 1.5.0, read it with the 1.1.4
codec, assert no crash and no silent data change. Cheap now, unavailable later.

**Analytics.** The release exists to find out whether the gear model works on
iOS. `AnalyticsService` already tracks Workshop saves and exports. Gear needs the
equivalent — created, applied, archived — or 1.5.0 answers its own question with
opinion instead of data. Decide the event set in Phase 5, before the surfaces are
final.

## 5. Open — yours to decide

Three of these change the shape of the release. Each carries a recommendation.

1. ~~**`AppState`: optionalize, or add an `answered: Set<String>` companion?**~~
   **DEFERRED TO EVIDENCE — owner, 2026-08-22:** Phase 0.5's spike decides it.
   The recommendation going in is *optionalize* (a returned Set dies at the call
   site, survives neither the router push nor the backgrounding snapshot, and
   denies the save sheet the per-field test web uses — so iOS- and web-created
   gears for the same hardware would never compare equal). But the owner declined
   to pre-commit, which is the right call for the one decision whose failure mode
   is silent: **the spike reports, then the choice is made.** If it comes back
   blocked, the `answered` companion is the fallback and forking the state shape
   from web is the accepted price.
2. ~~**Ship the standalone gear builder?**~~ **DECIDED — owner, 2026-08-22:
   no. Save-path only.** The shipped web design names "no separate builder" as
   its constraint 1; the ratified canvas draws a full one. Both were authoritative
   about the same feature, and this was the two-day swing in the release. Now
   closed, and listed in §4 so it cannot return mid-execution.
3. ~~**Bundle Syne and DM Mono?**~~ **DECIDED — owner, 2026-08-22: no, defer to
   2.0.** See §4 for the reasoning that made this more than a taste question:
   the type system is inert app-wide today, so bundling re-typesets every screen
   on a train whose screenshot harness already fails 4/6.
4. **Locale route: mirror web's JSONs, or generate `Localizable.strings`?** →
   **Mirror.** The iOS copies are already 92 lines behind with nothing guarding
   them, so re-mirroring is required work regardless.
5. **1.5.0 or 1.2.0?** → **1.5.0**, as D21 ruled. Verified nothing parses the
   string. Cost is a permanent visible gap at 1.2–1.4.
6. **Does App Store Connect carry a Danish localization at all?** → **Add it.**
   Otherwise the DK storefront shows English release notes for a feature whose
   Danish name is already ratified.
7. **Save-gear affordance: web's chooser, or the canvas's inline banner?** →
   **Both** — the chooser is how it works, the banner is how it is discovered.
   **And re-ink the banner off `#7B6EF6`:** the brief assigns purple the single
   job *Pro/paid*, and teaching purple-means-gear on the first surface where a
   user meets gear undercuts the argument that shipping it early does not dilute
   Pro.
8. **"Change" on the gear summary row: unwind, or an in-place sheet?** →
   **Unwind.** The sheet is builder-sized work under a different name, on the
   same release where the builder was cut.
9. **Confirm the filename `gear.json`.** The spec fixes the directory but never
   names the file. Low stakes — but frozen the moment the first device writes it.
10. ~~**NFC/NFD gear-id collapse: pin as a documented gap?**~~ **Closed by the
    plan-gate — it is not a gap, it is a contract violation.** Swift `Dictionary`
    keys compare by canonical equivalence, so an envelope with two ids differing
    only by normalization collapses to one row in Swift while JS keeps two —
    **silent loss of a whole gear**. An earlier draft accepted this as documented,
    which contradicts both the gear spec (losing a gear is the one outcome not
    accepted) and the storage contract §6 (refuse visibly rather than produce a
    partial artifact). **The resolution is cheaper than the custom parser that
    made it look unavoidable:** restrict iOS-written ids to lowercase ASCII UUID,
    and add a raw preflight scan of the `gears` keys that rejects non-ASCII,
    escaped-Unicode, or normalization-duplicate ids **before** `JSONSerialization`
    can collapse them. Ambiguous file → unreadable for writes → refuse, leave
    bytes untouched. Now a Phase 1 task, not an open question.
11. **Adopt: a non-blocking defect found at TestFlight goes to 1.5.1 and does not
    respin 1.5.0?** → **Yes.** 1.1.4 burned three builds in one evening, all
    respins of non-blocking UI defects.
12. **Rewrite Promotional Text to lead with My Gear?** → **Yes.** 170 chars,
    per-locale, changeable **without a new build** — the cheapest signalling
    lever in the release. It is currently locked to ratified 1.1.0 text, so
    changing it retires that ratification.

## 6. Risks

**The one most likely to make this slip: `AppState` optionalization.** It is the
only task whose blast radius is the whole app and whose failure mode is silent.
Three things can each quietly undo it — `AppStateWebCodec.pick(_:in:default:)`
re-materializing defaults on restore, the segmented control having no
no-selection rendering, and six reset call sites clearing to `"standard"` rather
than to unset. Any one leaves D4 looking implemented while a partially-pinned
gear silently answers seven questions the user never answered, and **nothing in
the 222-test baseline sees it.** Documented fallback: the `answered: Set<String>`
companion — cheaper, forks the state shape from web, and must be an explicit
owner decision rather than something drifted into.

Also live:

- **`ci.yml` has never executed.** Because the push gate means `main` only
  receives commits at ship time, its first ever run is the 1.5.0 release push.
- **`testflight.yml` carries no `timeout-minutes`** and inherits GitHub's
  360-minute default on a `macos-26` runner billed at 10×, in a repo that has
  already hit 100% of its Actions quota once. Commit `79fc8dc` named this gap and
  deliberately left it open; **this train is what dispatches that workflow.**
- **The screenshot harness is broken** — `ScreenCaptureUITests` fails 4/6 on a
  clean checkout, which is why CI excludes it.
- **A consumable IAP can pass the TestFlight gate while unfit for submission.**
  No submission doc has ever recorded the three tip products' ASC state.
- **Navigation has zero test coverage.** None of the 18 test files reference
  `AppRouter`, which is why the mislabeled-back defect already ships on the
  Workshop-load path. Every navigation change here lands on the one path — a
  five-step wizard that can now start at step 5 — where regressions are silent.
- **Danish cannot be seen by the standard test run**, which pins en/US because a
  Danish simulator gives false reds. Worse, `Strings.swift` mixes bundle-resolved
  `NSLocalizedString` with a process-locale `usesDanish` check; the two resolve
  differently and can produce a screen half in each language.
- **Edge-swipe becomes a silent flow-exit** under single-push deep entry.
  `enablesEdgeSwipeBack` only blocks at the stack root, so one swipe leaves the
  configurator and discards the intent answers just entered.
- **`EngineService.getFilters` is async and actor-isolated** while `inspectGear`
  is synchronous, opening a staleness window where the unit test passes and
  production is wrong. The call site must refetch per inspected gear.
- **iOS has no active-slicer state**, so two of the four apply-bookkeeping steps
  in spec §3.3 have no counterpart and the V10 assertion cannot be mirrored.
  Recorded as a known coverage hole rather than letting a missing test read as a
  passing one.

## 7. Test-count arithmetic

The JS suites execute **241 assertions** (157 store + 84 validate) from **229
call sites** — the gap is two loops, one over five malformed values and one over
five reserved-key names. Both numbers are correct and they measure different
things; the plan-gate and an earlier count in this session disagreed only because
each was counting one of them. Roughly **225** mirror as real checks, **~16**
cannot be mirrored at all, and **~10** mirror but become vacuous in Swift. Those
last two groups get listed where they occur rather than quietly dropped — a test
that cannot fail is not a test.

---

# 8. Execution addendum — 2026-08-22

Appended during autonomous execution rather than edited into the text above, so
the plan-gate-reviewed version stays legible. Each entry either closes an open
decision from §5 or corrects something §3/§6 got wrong.

## 8.1 Decisions closed on evidence

| § | Decision | Closed as | On what |
|---|---|---|---|
| 5.1 | `AppState`: optionalize? | **Optionalize the TYPE, keep the INIT defaults** | Phase 0.5 spike + cross-model refutation. See the session log. |
| 5.4 | Locale route | **Mirror** — done | The iOS tables were 92 lines behind, internally inconsistent by 2 keys, and carried 29 dead keys. Now byte-identical with web and gated in CI. |
| 5.9 | Confirm the filename | **`gear.json`** | `Application Support/3DPrintAssistant/` already holds `workshop.json` and `app-state.json`, both with an injectable `fileURL`. The spec says "beside `app-state.json`" and never names it. |

## 8.2 Corrections to this plan

**§3 Phase 2 / §6 — "unanswered" is not a cliff.** The engine returns 4 params
with nothing answered, 12 with `surface`, 20 with `+strength`, 28 with
`+speed` — and web renders exactly that today, gating output on hardware alone
(`app.js:2691`). Progressive disclosure, not a broken screen. Route-level
enforcement remains right, as UX rather than as a correctness backstop.

**§3 Phase 3 — the locale work was mis-scoped, and not in the direction
expected.** The nine `Strings.Home` constants are the small half. The dominant
fact is that iOS ships **250 genuinely-translated Danish strings that no user
can reach**: `_lang` is hardcoded to `'en'` (`engine.js:18`), Swift calls
`setLang` at zero sites, and the `localStorage` stub that would restore the
preference is a per-`JSContext` dictionary (`EngineService.swift:272-283`) that
always returns null. Wiring `setLang` is a prerequisite for shipping the
ratified Danish feature name, not a nicety.

**§3 Phase 4 / §4 — the swipe + context-menu cut is wrong for this app.**
`.swipeActions`, `.contextMenu`, `.onDelete`, `EditButton` and `List` have
**zero** occurrences in the entire tree; every list is a hand-rolled
`VStack`/`LazyVStack` of `Button`s. The app's universal destructive idiom is
two-tap arm-then-confirm — `WorkshopView.deleteTapped:234-246` plus the
identical shape in all five pickers. A gear row should use that, not introduce
an interaction idiom that exists nowhere else.

**§6 — add: the export paths deliberately answer for the user.**
`exportBambuStudioJSON`, the Bambu/Orca shared path and the Prusa path each
build an `exportState` filling `surface`/`strength`/`speed`/`environment` with
defaults before resolving (`engine.js:3333`, `:3545`, `:7314`). So a
partially-answered state exports a **complete default profile**, not a partial
one. iOS inherits this automatically — the engine is byte-identical — so the
platforms agree, but nothing surfaces it to the user.

**§6 — add: analytics would report unanswered fields as explicit choices.**
`AnalyticsService.profileProperties` sends `environment`/`support`/`colors`
straight through (`AnalyticsService.swift:136-138`). This release exists to find
out whether the gear model works; reporting a default the user never chose
answers that question with fiction. The type change makes it a compile error
rather than a silent one, but the semantic call still has to be made.

## 8.3 Terminology — no conflict after all

The Danish tables use **"gear"** as a loanword in 23 of the 61 gear strings
("Alle gear", "dit gear", "Aktivt gear"), and "grej" in exactly one:
`gearSectionTitle` = **"Mit grej"**. So the *section* is named in Danish and the
*object* keeps its English name. That is deliberate and idiomatic; iOS inherits
it from the mirror with nothing to decide.

## 8.4 PR strategy — three, not eight

The iOS repo is **private**, so `macos-26` minutes bill at 10x against quota;
the web repo is public and free. Pushing a branch does not trigger `ci.yml`
(`push:` is `branches: [main]`) — only a PR does. Eight phase-PRs would spend
roughly 560 billed minutes before a single build, so: PRs after Phase 1,
Phase 3 and Phase 5, plus the release push. Four CI runs, and the workflow still
reaches the real runner early.
