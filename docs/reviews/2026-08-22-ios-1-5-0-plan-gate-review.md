# Bridge session — 2026-08-22-182628-640458

## Task

PLAN-GATE review of docs/superpowers/plans/2026-08-22-ios-1-5-0-my-gear-plan.md in this repo. Read it in full, plus the specs it cites when you need to check a claim:
- docs/superpowers/specs/2026-08-22-ios-storage-contract.md (binds the port)
- docs/superpowers/specs/2026-08-20-gear-model-v2-spec.md (the frozen format)
- docs/reviews/2026-08-20-gear-model-owner-decisions.md (D21 is the reversal being planned)
- gear-store.js and gear-validate.js (what is being ported)

CONTEXT: iOS ships My Gear as a standalone 1.5.0 ahead of the 2.0 release. The iOS repo is a SIBLING directory at ../3dprintassistant-ios (readable). Current iOS version 1.1.4, 222 tests green, six commits held unpushed by a deliberate push gate.

This is a PLAN review, not a code review. Attack the plan's REASONING and its GAPS, not its prose.

ATTACK THESE SPECIFICALLY:

1. SEQUENCING. The plan puts the logic port (Phase 1) before the AppState change (Phase 2) before any UI (Phase 4). Is that right? Phase 2 is named as the most likely thing to make the release slip AND it is a hard prerequisite for Phase 3's apply() and Phase 4's UI. Should the riskiest structural change go FIRST, before sinking effort into a port that may need reshaping? Argue the opposite ordering and say which wins.

2. GATES. Each phase has a gate. Find any gate that (a) cannot actually fail, (b) is checked by a human believing something rather than running something, or (c) would pass while the phase's stated goal is unmet. Phase 4's gate leans on 'manual screenshot pass' and Phase 6's on owner sign-off — are those real gates or wishes?

3. THE CUTS. Twelve things are cut. Which cut is WRONG — i.e. which one will force rework in 2.0 that costs more than doing it now? Look hardest at: no byte-identical emitter for gear.json, no export/import, catalog-news ported-but-never-called, and the NFC/NFD gear-id collapse being accepted as a documented gap rather than fixed.

4. THE NFC/NFD DECISION. The plan accepts silent loss of a whole gear as a documented gap because avoiding it means a custom JSON parser. The storage contract it cites says data loss is the one outcome that is NOT accepted. Is that a contradiction the plan papers over? Is there a cheaper mitigation than a custom parser (detection-and-refuse, a normalization pass at write time, id charset restriction)?

5. MISSING PHASES. What is not in this plan that a release needs? Migration? A first-run path for users who already have saved profiles but no gears? Rollback if 1.5.0 ships broken? Analytics?

6. THE DANISH/LOCALE PLAN. It mirrors web's locale JSONs byte-for-byte into the bundle and adds a loader, while Strings.swift keeps a separate process-locale usesDanish mechanism. Two mechanisms for one job. Does the plan actually resolve that, or does it add a third?

7. SCOPE HONESTY. The plan claims the gear component is built once and only Home's composition differs between 1.5.0 and 2.0. Is that true given 1.5.0 has no tab bar and 2.0's Home hosts Expert/Inventory tiles? What is the real rework cost?

8. Anything asserted in the plan that is FALSE against the repo. Check the numbers: 241 JS assertions, 62 gear locale keys, iOS locale files 276/274 lines, 92 lines of drift, 31/153 bilingual strings, ~336pt hero, 222 test baseline.

Be specific: quote the plan line, say what is wrong, and what it should say instead. Do not summarize the plan back to me.

## Codex (review)

**PLAN-GATE: NO-GO**

**Must-Fix**
1. [Plan line 242](</Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-08-22-ios-1-5-0-my-gear-plan.md:242>): “NFC/NFD gear-id collapse … Pin and document.”  
   This contradicts the storage contract and gear spec. The spec explicitly says losing a whole gear is not accepted: [gear spec](</Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/superpowers/specs/2026-08-20-gear-model-v2-spec.md:460>). The storage contract says unreadable/partial artifacts must visibly refuse: [storage contract](</Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/superpowers/specs/2026-08-22-ios-storage-contract.md:77>).  
   Should say: “If gear ids are ambiguous under Swift/Foundation key equality, the file is unreadable for writes. Refuse visibly and leave bytes untouched.” Cheaper than a full custom parser: restrict iOS-written ids to ASCII UUID/lowercase, and add a raw preflight scanner for `gears` keys that rejects non-ASCII, escaped Unicode, or normalization-duplicate ids before `JSONSerialization` can collapse them.

2. [Plan line 31](</Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-08-22-ios-1-5-0-my-gear-plan.md:31>): “Port the frozen contract first, break the state model second.”  
   Wrong order. Phase 2 is named the release-slip risk at [line 258](</Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-08-22-ios-1-5-0-my-gear-plan.md:258>) and is prerequisite for apply/UI. The opposite ordering wins: after Phase 0, do AppState optionalization first, or a thin AppState spike before the full store port. GearStore itself is isolated, but the release viability is not. Proving the hardest structural assumption late is bad sequencing.

3. [Plan line 46](</Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-08-22-ios-1-5-0-my-gear-plan.md:46>): “Every gate is something you run.”  
   False. Phase 4’s “manual screenshot pass” [line 156](</Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-08-22-ios-1-5-0-my-gear-plan.md:156>), Phase 5’s “scripted manual walkthrough” [line 166](</Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-08-22-ios-1-5-0-my-gear-plan.md:166>), and Phase 6 owner sign-off [line 177](</Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-08-22-ios-1-5-0-my-gear-plan.md:177>) are acceptance rituals, not failing gates.  
   Should say: automated height/snapshot/UI assertions are gates; screenshots and owner sign-off are release evidence.

4. [Plan line 119](</Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-08-22-ios-1-5-0-my-gear-plan.md:119>): “Mirror both files byte-for-byte and add a small loader.”  
   This adds a third localization path. Current iOS already has `usesDanish` in `Strings.swift` [line 6](</Users/mragile.io/dev/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Utils/Strings.swift:6>) and `NSLocalizedString` for Output [line 156](</Users/mragile.io/dev/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Utils/Strings.swift:156>). Mirrored locale JSON plus a loader does not resolve the split.  
   Should say: “All Home/Gear strings use one language source keyed by the same Bundle/test language mechanism.”

**Should-Fix**
5. [Plan line 101](</Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-08-22-ios-1-5-0-my-gear-plan.md:101>): Phase 2 gate proves `resolveProfile` returns, not that the wizard asks unanswered fields. Engine defaults can make this pass while UI semantics are wrong. Add route-level assertions: partially pinned gear must land on first unanswered step and must not serialize synthetic defaults through `AppStateWebCodec`, which currently defaults absent fields at [lines 95-109](</Users/mragile.io/dev/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Models/AppStateWebCodec.swift:95>).

6. [Plan line 201](</Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-08-22-ios-1-5-0-my-gear-plan.md:201>): “catalog_seen never advances on iOS … Behaviour gap, not corruption.”  
   Acceptable only if sync is not reading it before 2.0. Add an explicit 2.0 migration/follow-up gate. “Ported but never called” is dead code surface with sync semantics.

7. [Plan line 203](</Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-08-22-ios-1-5-0-my-gear-plan.md:203>): cutting byte-identical `gear.json` is fine; cutting export/import [line 204](</Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-08-22-ios-1-5-0-my-gear-plan.md:204>) is also fine for 1.5.0. The wrong cut is NFC/NFD. But the plan should still name the future 2.0 compatibility work: import/export/sync must compare decoded structures plus retention, not bytes.

8. Missing release phases: no AppState migration plan, no rollback plan, no analytics. Existing users may have saved Workshop profiles but no gears; the plan has no first-run/empty-gear bridge for them. Rollback needs to state what 1.1.4 does after 1.5.0 writes `gear.json` and optionalized `app-state.json`.

9. [D21 line 612](</Users/mragile.io/dev/Claude/Projects/3dprintassistant/docs/reviews/2026-08-20-gear-model-owner-decisions.md:612>): “gear component is built once — only Home’s composition differs.”  
   Too optimistic. Store/validate/card row can be reused. Home integration and navigation will be reworked: current Home has Support, Workshop, Product Updates, links, and hero layout [HomeView](</Users/mragile.io/dev/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Views/Home/HomeView.swift:108>); 2.0 adds tab shell plus Expert/Inventory/Pro composition. Real cost is not zero.

**Optional / Factual Checks**
- JS assertions: plan’s 241 is correct: 157 store + 84 validate.
- iOS test baseline: 222 `func test…` methods present.
- Engine mirror: web and iOS `engine.js` SHA match.
- Locale line counts: web 368/368, iOS 276/274 are correct. But “92 lines of drift” is imprecise: English is 92 shorter, Danish is 94 shorter; actual diffs are 177/186 lines.
- 31 bilingual strings reconciles if excluding the `usesDanish` helper itself.
- `_sameMap` / `_sameValue` cut is okay: `_sameValue` is only used by `_sameMap`, and `_sameMap` is not called.

Verification run: JS gear tests passed; iOS XCTest was not rerun because the workspace is read-only and Xcode/Swift need writable caches.

