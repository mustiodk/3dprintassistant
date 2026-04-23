# 2026-04-23 — Cowork (appdev): IR-4 + IR-5 bundle into v1.0.2 (incl. HIGH-003 actor→class refactor)

## Durable context

What a future session needs that ROADMAP doesn't capture:

- **HIGH-003 review protocol was 3 Codex passes.** Pass 1 (description-only — Codex reported the compare URL wasn't reachable from its environment) raised 4 Tier-1 concerns. Pass 2 (code-level) verdict: "mostly sound, one Tier-1 caveat" — that caveat was asking us to document our interpretation of JSCore's thread-affinity contract, which I did in a class header comment. Pass 3 (code-level) verdict: **merge**. The doc-comment interpretation: JSCore requires **mutual exclusion** ("must not be used concurrently from multiple threads"), **not strict same-thread affinity**. A serial `DispatchQueue` satisfies this — items never execute concurrently even when GCD hops the worker thread between them. Apple's WebKit sample code uses the same pattern. **This interpretation is now encoded in the HIGH-003 squash commit's class header. Don't second-guess it without reading that comment first.**

- **`assertOnEngineQueue()` is the canonical way to defend the queue-pinning invariant.** Every `sync_*` method runs through `run<T>(_:)` → dispatched onto `queue`, but `sync_initialize` and `evaluate` also call `assertOnEngineQueue()` directly — defence in depth. If a future refactor accidentally calls a `sync_*` method off-queue, this traps in debug before any JSContext state is touched. Any new `sync_*` method should add the same assertion at its top.

- **`ExceptionStore.last = msg` is queue-pinned because `ctx.exceptionHandler` fires synchronously inside `evaluateScript`**, which is called only from queue-pinned code. Comment in the code spells this out explicitly. **If someone ever evaluates JS off-queue**, this invariant breaks and `ExceptionStore` needs its own lock. Flag it loudly if that ever changes.

- **`Thread.sleep` in `sync_initialize` is intentional, not a bug.** It blocks the queue's current thread for up to 500 ms once per app launch during the JS promise poll loop. Codex Pass 2 asked about it; verdict: acceptable because the queue is dedicated, nothing else is enqueued during init, and worst-case is bounded. **Do not** add code paths elsewhere that synchronously wait on this queue — that would deadlock the init sleep path. The existing comment inside `sync_initialize` warns about this.

- **Call-site change from HIGH-003: `PrinterPickerView.loadPrinters()` became `async`.** Previously called an actor method without explicit `await` — Swift's actor isolation implicit-await made that work. The class-based methods are explicitly `async throws` and require explicit `await`. If you add new call sites, use `await`. All existing other call sites (OutputViewModel, ChecklistSheet, GoalsView, PrintAssistantApp) already used it.

- **Review kit at `3dprintassistant-ios/docs/reviews/2026-04-23-high-003-codex/` is preserved in-repo** for audit history. 6 files: prompt, before snapshot, after snapshot, diff.patch, test output tail, branch info, and `06-single-paste.md` (the consolidated ~75KB paste-into-Codex version that worked after file-attachment failed). If HIGH-003 ever needs to be re-reviewed or reverted, the handover package is there.

- **LOW-003 retraction collapse was non-trivial.** Every material had BOTH `retraction_length` AND `retraction_distance` with DIVERGING values — this was drift already present. Picked `retraction_distance` as canonical per R5 because that's the field `resolveProfile` already feeds through `_scaleRetraction`. Advanced Filament Settings panel now shows the pre-scale `retraction_distance` value (which matches what the profile emits after scaling) instead of the separately-tuned `retraction_length`. User-visible behaviour change: the "Retraction length" row shifts to the new values. This is the accepted behaviour per the collapse. **Unblocks HIGH-001 (export path's unscaled retraction bug) when export UI is re-enabled.** HIGH-001 remains IR-deferred.

- **HIGH-006 (SlicerLayout bridge) surfaced a pre-existing Prusa data gap.** Prusa's Strength tab doesn't expose `wall_loops` in any section, despite the Prusa param-label dict having "Perimeters" mapped to it. Snapshot test explicitly excludes `wall_loops` from its mustContain set for Prusa and notes the gap. **Filed as IR-5 follow-up** — Prusa users currently can't see the wall count in the strength tab. Low priority but tracked.

- **HIGH-011 `value` field is surface + support only.** Other filter groups (strength, speed, env, colors, userLevel, special) don't have a primary numeric and leave `value` as `nil`. Future chips with numeric content should populate it. The iOS `FilterItem` decode path accepts both `Double` and `NSNumber` (JSONSerialization sometimes boxes numerics as NSNumber), so no further codec work needed.

- **MEDIUM-009 Codable decode is per-param only, not whole-profile.** `resolveProfile` returns `[String: ProfileParam]`; the refactor decodes each entry via a private `_ProfileParamWire: Decodable` adapter. Unknown top-level meta fields (e.g. a future `_version` key on the profile dict) would fail the outer dictionary decode. **If we add meta fields at that level**, we'll need to wrap the response in `{ version, params }` on the JS side — tracked as part of R7 (which remains deferred).

## Context

This session continued the v1.0.2 ship-bundle work. Scope expanded per owner decision to fold IR-4 + remaining IR-5 items in, rather than deferring them to v1.1. HIGH-003 (actor → class) was the single biggest risk; owner requested an external-review gate before merge via Codex.

First Codex-review attempt used GitHub raw URLs; Codex reported it couldn't reach them and reasoned from the prompt alone. Second + third passes used the 75KB single-paste `.md` variant that inlines both source files in code blocks — Codex could actually read the code. Third pass returned a clean GO.

## What happened / Actions

Order: MEDIUM-021 → HIGH-007 → MEDIUM-020 → LOW-004 → LOW-006 → HIGH-006 → LOW-003 → HIGH-011 → MEDIUM-009 → CHECKPOINT → HIGH-003 (branch + 3 Codex passes + squash-merge).

Every engine change: edit web → `cp` to iOS byte-identical → `node scripts/walkthrough-harness.js` → iOS XCTest → commit web → commit iOS → push both.

HIGH-003 was done on branch `ir4-high-003-actor-to-class`, three Codex review cycles, squash-merged to `main` as a single commit after Pass 3 verdict. Branch deleted (local + remote) post-merge.

**10 findings shipped. 23 commits (including the Codex review iterations + squash-merge). Test count 37 → 40.**

## Files touched

### Web (`3dprintassistant`)

**Modified (committed):**
- `engine.js` — MEDIUM-021 `getSlicerDisplayName`, HIGH-007 `getNozzleSize`, MEDIUM-020 `getFilamentTabs`, HIGH-006 `getSlicerTabs` + `getSlicerParamLabels`, LOW-003 `retraction_distance` reads, HIGH-011 `value` fields on surface + support chips
- `data/materials.json` — LOW-004 TPU display alignment, LOW-006 `properties.flexible` dedup, LOW-003 `retraction_length` removal from all 18 materials

**Untracked (this session — promoted at session close):**
- `docs/sessions/2026-04-23-cowork-appdev-ir4-ir5-bundle.md` (this log)
- `docs/sessions/INDEX.md` — prepended bullet
- `docs/planning/ROADMAP.md` — IR-4 + IR-5 ticks

### iOS (`3dprintassistant-ios`)

**Modified (committed, most via the HIGH-003 squash):**
- `3DPrintAssistant/Engine/engine.js` — byte-identical syncs (× 7)
- `3DPrintAssistant/Engine/EngineService.swift` — full actor→class refactor + all bridge additions (MEDIUM-021, HIGH-007, MEDIUM-020, HIGH-006 getSlicerTabs/getSlicerParamLabels bridges, MEDIUM-009 Codable decode)
- `3DPrintAssistant/Data/materials.json` — LOW-004, LOW-006, LOW-003 syncs
- `3DPrintAssistant/Models/SlicerLayout.swift` — 270+ lines of static data DELETED (HIGH-006); kept `SlicerTab` + `SlicerSection` structs
- `3DPrintAssistant/Models/FilterGroup.swift` — HIGH-011 `value: Double?` on `FilterItem`
- `3DPrintAssistant/Views/Output/OutputViewModel.swift` — bridge-backed stored vars: `slicerName`, `nozzleSizeKey`, `filamentTabs`, `slicerTabs`, `slicerParamLabels`
- `3DPrintAssistant/Views/Output/OutputView.swift` — MEDIUM-020 + HIGH-006 + HIGH-007 consumer updates
- `3DPrintAssistant/Views/Output/PrintProfileTabView.swift` — HIGH-006 `paramLabels` prop replaces `SlicerLayout.label` site
- `3DPrintAssistant/Views/Configurator/PrinterPickerView.swift` — HIGH-003 `loadPrinters` → async
- `3DPrintAssistantTests/EngineServiceTests.swift` — new `testSlicerLayoutSnapshot` + `testChipValueFieldMatchesEmission`; `FilterItem` construction updated

**Review kit (new, tracked on main via HIGH-003 squash):**
- `docs/reviews/2026-04-23-high-003-codex/00-review-prompt.md`
- `docs/reviews/2026-04-23-high-003-codex/01-before-EngineService.swift`
- `docs/reviews/2026-04-23-high-003-codex/02-after-EngineService.swift`
- `docs/reviews/2026-04-23-high-003-codex/03-diff.patch`
- `docs/reviews/2026-04-23-high-003-codex/04-test-output.txt`
- `docs/reviews/2026-04-23-high-003-codex/05-branch-info.md`
- `docs/reviews/2026-04-23-high-003-codex/06-single-paste.md`

## Commits

**Web (`3dprintassistant`) — 8 commits this session, all pushed to `main`:**
- `f6dd64b` — `engine: expose getSlicerDisplayName + use internally [MEDIUM-021]`
- `5cbcd72` — `engine: add getNozzleSize(id) bridge function [HIGH-007]`
- `c3ba127` — `engine: expose getFilamentTabs registry [MEDIUM-020]`
- `14f82e0` — `data: align TPU drying display with heatbed_temp numeric [LOW-004]`
- `2e87e1b` — `data: drop properties.flexible (was duplicate of top-level flexible) [LOW-006]`
- `73ad161` — `engine: expose getSlicerTabs + getSlicerParamLabels [HIGH-006]`
- `b58b8e2` — `data+engine: collapse retraction_length into retraction_distance [LOW-003]`
- `9aa164e` — `engine: structured numeric per chip (value field) [HIGH-011]`

**iOS (`3dprintassistant-ios`) — 10 commits this session, all pushed to `main`:**
- `9093b24` — MEDIUM-021 bridge + OutputViewModel
- `546fcfa` — HIGH-007 bridge + OutputView
- `2436844` — MEDIUM-020 bridge + OutputView
- `a5be620` — LOW-004 sync
- `101618a` — LOW-006 sync
- `5132d94` — HIGH-006 bridge + SlicerLayout deletion + snapshot test
- `d853ffb` — LOW-003 sync
- `98f372f` — HIGH-011 FilterItem.value + new test
- `05e6bfa` — `iOS: typed Codable decode for resolveProfile output [MEDIUM-009]`
- `2579fe8` — **squash-merge of HIGH-003 branch** (consolidates 6 branch commits into one: actor→class refactor + review kit + polish)

**23 commits total (counting the 5 branch commits that got squashed into the final 1). 40/40 iOS XCTest green at every step. Walkthrough harness 9/9 + Combo 3 pre-existing after every commit.**

## Data/logic change evaluation (standing rule)

- **MEDIUM-021 / HIGH-007 / MEDIUM-020 / HIGH-006 / MEDIUM-021:** iOS-only structural refactors (bridge engine-owned data instead of duplicating in Swift). Zero UI change. Engine side unchanged except for new exports.
- **MEDIUM-009:** iOS-only typed decode. No UI change.
- **HIGH-003:** iOS-only isolation-model swap. Zero user-visible change. Runtime guards catch future misuse.
- **LOW-004:** Data text change. TPU drying panel shows slightly different string. No code change.
- **LOW-006:** Data shape cleanup. Zero runtime change (dead key was never read).
- **LOW-003:** Behaviour change. "Retraction length" row in Advanced Filament Settings now shows different values (the canonical `retraction_distance` that feeds the scaled emission, not the separately-tuned `retraction_length`). Web + iOS both consume via the same engine output field name — no UI code change needed, just a data-sourced text shift.
- **HIGH-011:** Engine output shape extension (additive). Chips carry a new `value: Number` field where applicable. iOS decodes it; older iOS builds would ignore the unknown field. Zero UI change today, enables cleaner tests + future desc-independent display.

## Walkthrough harness result

**10/10 combos, 9 clean + 1 pre-existing warn (Combo 3).** No new warnings or structural check failures across any finding.

## iOS XCTest result

**40/40 passing.** Test count rose from 37:
- +1 (session start ROADMAP snapshot had 37)
- +1 `testChipValueFieldMatchesEmission` (HIGH-011, desc-independent assertions)
- +1 `testSlicerLayoutSnapshot` (HIGH-006, locks 3 slicers × 5 tab ids + param-label dict size + unknown-slicer fallback)

## Md-hygiene sweep

1. **Root stubs:** none.
2. **Untracked-but-should-be-tracked:** session log + INDEX update + ROADMAP update — all promoted in session-close commit.
3. **Secrets in tree:** clean.
4. **Content buried in session log:** promoted HIGH-003 review protocol + `assertOnEngineQueue` pattern + ExceptionStore thread-safety reasoning + Thread.sleep justification to Durable context (future sessions need these before touching the engine bridge).
5. **Stale ROADMAP sections:** IR-4 was still showing unchecked `[ ]` boxes despite the scope change commit — fully ticked in this session-close pass. IR-tracking table shows IR-4 ✅ and IR-2a "All code shipped."
6. **Duplicate specs:** none added.

## Open questions / owner asks

**All Phase 0 ship-blockers are closed.** Remaining work to actually ship v1.0.2:
- Tone-pass on `docs/app-store-whats-new-v1.0.2.md` (owner's voice).
- Bump `CFBundleShortVersionString` → `1.0.2` in `project.yml`, `xcodegen generate`, commit + push.
- Ask Claude to trigger the TestFlight build (`gh workflow run testflight.yml --ref main`).
- TestFlight internal test + rotate Discord webhook + submit to App Review (manual release).

**Deferred from this session:**
- `[LOW-005]` prc_0.2 siblings — owner product-taste decision.
- `[MEDIUM-019-followup]` — domain-sourced volumetric numbers for 0.8mm + HIPS 0.2mm.
- `[MEDIUM-014]` — covered by CRITICAL-002.
- Prusa `wall_loops` tab gap — filed as IR-5 follow-up, not urgent.
- IR-3 — failure-mode rehearsal (deferred per owner).

## Next session

NEXT-SESSION.md was **not** regenerated this session per the 2026-04-23 owner preference (owner-triggered only). When you want it refreshed for a cold start, ask.
