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

## Next session

Owner runs the two imports. On PASS: ff-merge the web branch to `main`, push,
verify live, and fold the iOS commits into the next TestFlight train. On FAIL:
the slicer's log names the unresolved parent, which points at the generator rule
to correct — and that correction applies to the whole vendor family at once.
