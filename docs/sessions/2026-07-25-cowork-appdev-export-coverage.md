# 2026-07-25 — Cowork (appdev): export coverage + honest availability on both surfaces

## Durable context

- **The export allowlist was never a bug in the UI — it was 17 of 78 printers.**
  Every future "export doesn't work for my printer" report should start by
  running `Engine.getNativeExportSupport(state)` for that printer, not by
  reading UI code. The slicer id tells you nothing about whether an export is
  producible.
- **Vendor parent names must be derived, never typed.** Both registries are
  machine-readable and cheap to fetch (`git clone --filter=blob:none --sparse`
  for OrcaSlicer, one `curl` for `PrusaResearch.ini`), and the generator
  reproduces the previously human-verified Ender-3 V3 SE and CORE One L values
  exactly — which is the strongest evidence available that the method is sound.
  The 2026-07-11 hand-written table stayed at four printers for four months
  because hand-writing is the bottleneck, not the risk.
- **Upstream registry data is internally inconsistent and must be defended
  against.** `0.32mm Standard @FF C5 0.8 nozzle` lists the Creator 5 Pro *0.6*
  machines in its own `compatible_printers`. Trusting either the name or the
  compatibility list alone gives a wrong parent; requiring them to agree is the
  invariant, now asserted in `export-audit`.
- **Codex caught two live wrong picks that every automated gate passed.** The
  audit, walkthrough, golden snapshot and 196 XCTests were all green on a table
  where `u1` 0.4 inherited a *support-material* preset. Green gates prove no
  regression against what you already assert; they say nothing about a newly
  generated dataset. This is the fourth entry in the cross-model-review-as-
  final-gate family.
- **Held the merge deliberately.** The one thing no local gate can prove is
  whether a preset resolves inside the real slicer, and Phase 3's own diagnostic
  is that an unresolvable parent imports *silently wrong*. Sentinel bundles for
  K1 and CORE One are committed for a two-minute owner check.

## What happened / Actions

1. Cold start (Trigger C): sync health green for both 3dpa repos
   (`3dprintassistant-android: missing` surfaced, out of scope).
2. Reproduced from code + engine, not from the screenshots: probed all 78
   printers through the real engine → Orca 4 OK / 56 null, Prusa 1 OK / 5 null.
   `k1` and `core_one` both null. Confirmed web's Copy fallback was working as
   designed and iOS's row was gated on the slicer id alone.
3. Confirmed both vendor registries are reachable and machine-readable; sparse-
   cloned OrcaSlicer profiles and fetched `PrusaResearch.ini`.
4. Wrote `scripts/gen-slicer-parents.mjs`, validated the method against the two
   already-human-verified rows, then embedded the generated tables.
5. Rewrote `exportOrcaJSON` / `exportPrusaINI` around them; added
   `getNativeExportSupport(state)`.
6. Web: `render()` now gates on the engine contract and explains the fallback
   (`exportHintCopyOnly`, EN + DA). Verified in the browser for K1, CORE One and
   Voron 2.4.
7. iOS: mirrored the engine, bridged availability, made the export row require
   it, added a `Share profile as text` fallback, split the two failure messages.
   Verified on the iPhone 17 Pro simulator.
8. Rewrote the six export-audit assertions that encoded the old narrow
   allowlist, and added the availability-contract section.
9. `bridge --mode codex-only` review → GO, 3 P2 → all fixed, plus table-wide
   invariants in the audit.
10. Generated owner-import sentinel bundles; wrote the gate ledger; updated
    ROADMAP.

## Files touched

**Modified (web):** `engine.js`, `app.js`, `locales/en.json`, `locales/da.json`,
`scripts/export-audit.js`, `docs/planning/ROADMAP.md`
**Created (web):** `scripts/gen-slicer-parents.mjs`,
`docs/planning/EXPORT-COVERAGE-GATE-LEDGER.md`, this log,
`scripts/fixtures/slicer-golden/_owner-verify/zz-orca-k1-importtest-{process,filament}.json`,
`scripts/fixtures/slicer-golden/_owner-verify/zz-prusa-coreone-importtest.ini`
**Untracked, deliberately (gitignored):** `.claude/launch.json` (dev-server
config for the browser preview)

**Modified (iOS):** `3DPrintAssistant/Engine/engine.js` (byte mirror),
`Engine/EngineService.swift`, `Utils/Strings.swift`,
`Views/Output/OutputView.swift`, `Views/Output/OutputViewModel.swift`,
`3DPrintAssistantTests/OutputViewModelTests.swift`

## Commits

Web branch `fix/export-coverage-20260725` (not merged, not pushed):

- `4d463df` — registry-derived parents, 17→62 printers, + `getNativeExportSupport`
- `fa7df33` — web explains the copy fallback instead of hiding export
- `def4988` — Codex P2 ×3: deterministic + in-nozzle parent selection, abstract
  bases excluded, fatal parse errors, table-wide audit invariants

iOS `main`, local only under the push gate:

- `dcf5959` — availability-gated export row + text fallback + distinct messages
- `6f4b526` — engine re-mirror after `def4988`

## Open questions / Follow-up

- ~~iOS partial exports are not labelled.~~ **Done same session** — web
  `3f1acae` (live), iOS `c202255` (local, ships with the next train).
- **`-uitest` is a no-op.** Every UITest passes the flag; no app code acts on
  it, so `testWorkshopTransferActionsStayVisibleWhenEmpty` depends on a clean
  container and fails after any manual use of the simulator. Either honour the
  flag (reset Workshop/persistence on launch) or make the test seed and clear
  its own state.
- Owner import spot-check of the two sentinel bundles is now optional, not a
  gate (owner decision, this session).
- **Tip Jar IAPs are `MISSING_METADATA`** — one App Review screenshot per
  product in ASC unblocks tip purchases on TestFlight. Consider making the CI
  product check warn loudly (or gate) instead of just logging the state.
- **`plus4` / `max4` / `ender3_v4_combo` remain alias-candidates.** Resolving
  them needs either a build-volume field in `data/printers.json` or a human
  identity call; the same field would unlock Voron / RatRig / VzBot-class
  disambiguation generally.
- 16 printers still have no native export. Voron / RatRig / VzBot need a 3dpa
  build-volume field to disambiguate; the rest are absent upstream. `--check`
  will surface them automatically on a registry refresh.
- iOS `Strings.Output` is English-only, so the new row + note aren't localised
  while the web equivalents are. Consistent with the rest of that screen.
- `getNativeExportSupport` runs a full export per render (same cost web already
  paid). Memoise on a state fingerprint if the Output screen ever gets slow.
- **md-hygiene sweep:** protocol-file drift check
  (`diff -u Projects/CLAUDE.md Projects/AGENTS.md`) clean; no root-level stubs
  added; no secrets in the tree; no stray `</content>` artifacts in the files
  created this session; new docs are tracked and linked from ROADMAP.
- **Findings sweep (K1/K3/K4):** one K1 catch worth recording — a reviewer
  disagreement that was *correct*: Codex's three P2s were all real, and two
  named live defects that the full local gate battery had passed. Consistent
  with the existing `feedback_cross_model_review_final_gate` memory; no new
  finding file, this is the fourth confirming instance rather than a new
  pattern. No K3 (no skill produced a surprising outcome) and no K4 (no tool
  overruled a controller call).

## Addendum — same session, owner directive: ship it

Owner asked for a TestFlight build to verify on device and for web to go live,
plus "disable export for printers that have not been verified".

Asked which meaning of *verified* should gate export — human import evidence, a
Beta label on registry-derived rows, or registry-derived being sufficient. Owner
chose **registry-derived is verified enough**, so all 62 printers ship with
export enabled and no Beta distinction, and the pre-merge import test became an
optional spot-check rather than a blocker.

Shipped:

- Web: ff-merged `fix/export-coverage-20260725` → `main` `5962bad`, pushed.
  Cloudflare deploy confirmed by polling `engine.js` for
  `getNativeExportSupport`, then verified in the browser **against production**:
  K1 shows `↓ Orca Process` + `↓ Orca Filament` and inherits
  `0.20mm Standard @Creality K1 (0.4 nozzle)`.
- iOS: `MARKETING_VERSION` 1.1.2 (`10fff47`), pushed to `main`, TestFlight run
  [`30155517579`](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/30155517579)
  dispatched on that exact HEAD.

**iOS gate battery, clean container:** 196/196 unit, 6/6 ScreenCaptureUITests,
engine + all seven data files byte-identical to live web `main`.

`testWorkshopTransferActionsStayVisibleWhenEmpty` failed on the first full run.
Root-caused before assuming a regression: it asserts the Workshop *backup*
export button is disabled when empty, and my manual K1 walkthrough had left a
profile in the store. `-uitest` is passed by every UITest but **no app code
reads it**, so nothing resets state — the test silently depends on a clean
container. Passes after `simctl uninstall`. Real fragility, filed below.

### Coverage measured across the full matrix

3401 printer × nozzle × material combinations: **1970 export both files, 747
export process settings only** (upstream ships no generic filament preset for
that material on that printer), **684 unavailable** (fallback).

The 747 are the remaining honesty gap in the same family as the reported bug:
web disables the Filament button with a tooltip, but **iOS still labels the row
"Export for <slicer>" and silently delivers one file instead of two**. Not
changed in 1.1.2 — a TestFlight build was already in flight for owner
verification and each build costs ~10 min at the 10× macOS runner rate.

## Addendum 2 — partial exports labelled on both surfaces

Owner: "lets do it" on the 747 process-only combos flagged above.

- **Web `3f1acae` (live):** the reason moved out of the `title` tooltip and into
  the export hint (EN + DA), for both the JSON and INI paths. A tooltip is not
  reachable on touch, so on a phone the greyed Filament button just looked
  broken.
- **iOS `c202255` (local, next train):** `exportRowNote` now owns the subtitle
  for both states the row can be in — no preset at all, and no *filament*
  preset. The download is unchanged; a process-only export is still a real,
  importable export. 19 tests in OutputViewModelTests (+3), including an
  engine-backed check that Ender-3 V3 SE + PC reports process-only.

Verified on both surfaces with that exact selection (Ender-3 V3 SE + PC + 0.4)
and confirmed a complete export (K1 + PLA + 0.4) still carries no note.

Deliberately not cut as a new TestFlight build: 1.1.2 (`202607251102`) is
already distributed for owner verification of the actual reported bug, and
swapping the build mid-verification would only muddy which one was tested.

## Addendum 3 — coverage can no longer go silent; four aliases mapped

**Owner question: "how do we make sure export works on printers added by the
printer intake process?"** Traced it: the intake pipeline writes
`data/printers.json`, the walkthrough combos and the iOS overlay, and **never
`engine.js`**, where the parent tables live. So an intaked printer is uncovered
by construction — and the graceful fallback shipped this morning makes that
invisible. The four printers intake has shipped (K2 SE, Centauri Carbon 2,
SV06 ACE, U1) are covered only because the tables were generated after they
landed. `export-audit.js` was also not in the intake gate chain, and the web
repo has no CI, so nothing checked coverage anywhere.

**Mechanism (`6155125`):** every printer either exports natively or has an entry
in `scripts/fixtures/export-coverage-ledger.json`. `export-audit` fails on an
unrecorded gap, on a stale entry (printer has since gained coverage), on an
entry for a printer that no longer exists, and on a reason outside the closed
vocabulary. `export-coverage.js --add` is idempotent and non-blocking — wired
into the intake kickoff contract's mechanical-ship stage and both runbook gate
checklists. Proven by simulating an intake add (FAIL → `--add` → green →
reverted clean). The runbook now also documents the re-derivation path, since
upstream publishes on its own schedule.

**Finding from seeding the ledger:** the 16 gaps were not all "upstream doesn't
have it". Six were alias candidates the exact-name matcher missed. Owner
approved the four confirmable ones (`2ca0311`): `sparkx_i7` →
"Creality SPARKX i7", `snapmaker_2_a350` → "Snapmaker A350", `vzbot_330/235` →
"Vzbot 330/235 AWD" (the VzBots also needed an explicit vendor, since 3dpa files
them under manufacturer `diy`). **Coverage 62 → 66 of 78; ledger 16 → 12.**
`plus4`/`max4` were deliberately left unmapped — upstream "Qidi X-Plus 4" /
"X-Max 4" may not be the same machines and **3dpa stores no build-volume field**
to confirm identity mechanically. That missing field is also the root reason
Voron / RatRig can never be auto-resolved.

A scare worth recording: the first alias diff reported all 44 pre-existing
entries as changed. They were **key-order only** — the shipped table is
key-sorted, the generator emits insertion order, and `--check` compares
order-insensitively. Zero semantic drift. Checked before splicing rather than
after.

**iOS 1.1.3** (`2be10a4`, run
[`30158308791`](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/30158308791))
bundles the alias engine mirror and the process-only labelling. 199/199 unit +
6/6 UI on a clean container.

### Tip Jar "unavailable" on TestFlight — diagnosed, not a bug

Owner asked whether the Tip Jar showing *"Tip options are unavailable right now"*
is normal on a TestFlight build. It is not a TestFlight quirk and not a code
defect. The 1.1.2 CI log states the cause directly:

```
Verified dk.mragile.3DPrintAssistant.tip.small (MISSING_METADATA; App Review screenshot still pending)
Verified dk.mragile.3DPrintAssistant.tip.nice  (MISSING_METADATA; App Review screenshot still pending)
Verified dk.mragile.3DPrintAssistant.tip.spool (MISSING_METADATA; App Review screenshot still pending)
```

`scripts/configure_tip_products.rb:163` deliberately allows `MISSING_METADATA`
for a TestFlight upload (the review screenshot is a manual ASC step that should
not block a build). StoreKit does not return products in that state, so
`loadProducts()` comes back empty and `TipJarStore` sets `phase = .unavailable`
— the app degrading correctly. This is the open item carried since the 1.1.1
session ("IAP review screenshots are still required"). Uploading one App Review
screenshot per product moves them to `READY_TO_SUBMIT`, after which they load in
the TestFlight sandbox.

Observation (not changed): a build whose IAPs are all `MISSING_METADATA` will
show every tester a broken tip jar, and CI knows it at build time. Worth turning
that log line into a loud warning — or a hard gate once the screenshots exist.

## verify-before-mutate ledger (v2 M3 — owner reads this, not my self-assessment)

`python3 ~/.claude/hooks/verify_before_mutate.py summary`:

```
verify-before-mutate ledger: 3 flags (0 resolved_same_turn, 0 resolved_late,
3 unresolved_by_session_end), 1 destructive-core, 35 unclassified, 0 generated-write
  - [unresolved_by_session_end] Bash  …/3dprintassistant/OrcaSlicer (delete)
  - [unresolved_by_session_end] Edit  …/3dprintassistant/scripts/export-audit.js (edit)
  - [unresolved_by_session_end] Edit  …/3dprintassistant-ios/3DPrintAssistant/Utils/Strings.swift (edit)
```

All three were verified inline in the same turn; the ledger did not register the
resolutions, so it reports them unresolved. Verbatim, for the owner's own
false-flag read:

1. **`3dprintassistant/OrcaSlicer` (delete)** — **false flag.** The command was
   `cd <scratchpad> && rm -rf OrcaSlicer && git clone …`; the hook resolved the
   relative path against the session cwd. Verified: `ls -d
   .../3dprintassistant/OrcaSlicer` → *No such file or directory*, and web
   `git status` was clean. Nothing in the repo was touched.
2. **`scripts/export-audit.js` (edit)** — **correct premise, wrong evidence
   channel.** The premise (six assertions encode the old narrow allowlist) had
   been verified before the edit by `sed -n '246,270p;300,410p'` on the file
   plus the audit run printing those six as FAILs. The flag fired because the
   read was a Bash `sed` rather than the Read tool.
3. **`Strings.swift` (edit)** — same shape. `sed -n '160,180p'` had shown the
   exact three lines being replaced.

Calibration note: 3 flags, 0 true catches, 2 of 3 attributable to Bash-based
reads not counting as `direct_file_read`, 1 to relative-path resolution against
session cwd rather than the command's own `cd`.

## Addendum 4 — version discipline corrected, then 1.1.3 submitted to App Review

Two things happened after the coverage work shipped, and the first caused the
second.

**The version-per-build mistake.** I bumped `MARKETING_VERSION` 1.1.1 → 1.1.2 →
1.1.3 across three verification builds in a single day. The owner asked why:
*"Why are you increasing the version number for each patch instead of keeping it
and just creating a new build?"* He was right and I had no defence. Fastlane
stamps the build number as `Time.now.strftime("%Y%m%d%H%M")`
([`fastlane/Fastfile:20`](../../../3dprintassistant-ios/fastlane/Fastfile:20)),
so every upload is already unique — the version string contributes nothing to
TestFlight's uniqueness requirement. Only 1.1.0 had ever reached the App Store,
so users would have jumped 1.1.0 → 1.1.3 past two versions that never existed
for them, each carrying its own ASC version entity and "What's New" field.

Root cause was the iOS push gate in `Projects/CLAUDE.md`, which listed
"`MARKETING_VERSION` is bumped" as a precondition for pushing iOS. That was
written for shipping a release and I applied it mechanically to a verification
build. Reworded in both `CLAUDE.md` and `AGENTS.md`: **version = release train,
build number = iteration.** Owner chose to keep 1.1.3 rather than roll back —
rolling back is cosmetic history and costs a ~10-min runner build. Memory:
`feedback_version_per_release_train_not_per_build`.

**A StoreKit test configuration was attempted and abandoned.** Goal was a
simulator screenshot of the tip sheet with real prices, for the IAP review
screenshots. Three distinct failures: the `.storekit` file landed in the app's
Resources build phase (would have shipped in the binary); XcodeGen 2.46 emits
`storeKitConfiguration` only on the Run action, not Test; and a hand-injected
TestAction reference plus `fileGroups` registration still returned no products.
Per the 3-failure rule I stopped and reverted all of it rather than attempt a
fourth. Tree left clean — this is why the IAP review screenshot ended up being
the Home-screen entry point rather than the price list.

### App Store submission (ASC, browser-driven)

Submitted **1.1.3 / build `202607251240`** together with the three consumables.
ASC requires a first consumable to ship with a new app version, so they had to
go as one submission — the tips alone stayed blocked with *"Unable to Submit for
Review"* until the version joined the same draft.

The non-obvious step: **Add for Review on the version page is a dropdown**, and
it offers "add to existing draft submission" vs "create new submission". Picking
the existing draft is what merges the version with the three tips; creating a
new one would have kept them separate and kept the block in place.

Metadata corrections caught while filling it in — both were live inaccuracies,
not polish:

- **Review Notes claimed "There is no account, login, or in-app purchase."**
  False as of this submission. A reviewer reading that and then seeing three
  consumables has a contradiction to resolve; that is a realistic Guideline 2.1
  round trip. Rewritten to state the tips explicitly, name the entry point
  ("Support 3DPA" card on Home), and pre-explain that the tip sheet shows
  *"tip options are unavailable"* until the products are approved.
- **Description said "64 printers across 12 brands", "18 filament types".**
  Counted against the data files: **78 printers, 14 brands, 19 filament
  profiles**, 9 nozzle types (the only accurate number). Rewritten, and an
  EXPORT STRAIGHT TO YOUR SLICER section added — the description still described
  the pre-export copy-paste workflow and never mentioned the feature this whole
  session was about.

The IAP review screenshot was rejected once for dimensions: the simulator
capture is **1206 × 2622** (iPhone 16 Pro native), which is not on ASC's
accepted list for IAP review screenshots. Resampled to **1242 × 2688** (6.5"
display) — 0.4% aspect difference, not visible — and it took.

Per-product review notes were written to all three tips via the browser. Worth
recording the mechanism: ASC's fields are React-controlled, so `value`
assignment from JS does not stick. What works is click the field, then
`focus()` + `setSelectionRange(0, len)` from JS, then synthetic typing — and the
textarea will still display the *old* value after Save; only a reload proves
what was actually persisted.

**Final state, verified in ASC:** iOS App 1.1.3 *Waiting for Review*; In-App
Purchases *In Review (3)* — `tip.spool`, `tip.nice`, `tip.small`. Release is set
to **automatically release after approval**, phased release off. Approval
therefore both publishes 1.1.3 and switches the tip jar on for everyone, with no
second step from the owner.

## Next session

Nothing is blocked. 1.1.3 and the three tips are in Apple's queue with automatic
release, so the next real event is an approval or a rejection notice.

Carried follow-ups, none urgent:

- **Three alias-candidates remain unmapped** — `plus4`, `max4`,
  `ender3_v4_combo`. Each needs either a build-volume field in
  `data/printers.json` or a human identity call to disambiguate against the
  upstream registry. They are recorded in
  `scripts/fixtures/export-coverage-ledger.json`, so the audit gate will keep
  failing loudly if anyone adds a printer without resolving its coverage.
- **`-uitest` is a no-op.** Every UI test passes the flag and no app code reads
  it, so `testWorkshopTransferActionsStayVisibleWhenEmpty` depends on a clean
  simulator container. It failed once this session purely from state left by a
  manual walkthrough. Either honour the flag with a reset, or drop it.
- **CI knows about broken IAPs and says so quietly.**
  `scripts/configure_tip_products.rb:163` allows `MISSING_METADATA` for
  TestFlight uploads, which is correct, but a build in that state shows every
  tester a broken tip jar. Worth a loud warning now that the screenshots exist.

If approval lands: confirm the tip jar resolves on a real device, since that path
has never once worked end-to-end outside of code review.
