# Next session — cold-start prompt

**Last updated:** 2026-04-24 PM — regenerated on explicit owner ask after DQ-2 close. Covers DQ-3 (Pressure / Linear Advance per material).

**Phase:** DQ-3 (scraper-assisted PA/LA data collection + engine emission) is next. DQ-1 fully shipped + DQ-1-followup (filament panel) + DQ-2 (Safe/Tuned toggle) all landed 2026-04-24 PM. Phase DQ 2/5. **v1.0.2 RELEASED 2026-04-24** (approved + manually released by owner, same ~121 non-EU countries). iOS 46/46 XCTest + walkthrough 10/10 + DQ-2 assertion 3/3 all green.

A stale file between sessions is acceptable. Regenerate only on explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — Phase DQ, sub-phase DQ-3 (Pressure / Linear Advance per material)

## Project at a glance

**3D Print Assistant** generates optimized 3D printing profiles based on printer + material + nozzle + user goals. Two apps, one shared engine:

- **Web app** (`3dprintassistant.com`, repo `3dprintassistant/`) — live, Cloudflare Pages, auto-deploys from `main`. 64 printers, 12 brands, 18 materials, 9 nozzles, 3 slicers.
- **iOS app** (repo `3dprintassistant-ios/`) — **v1.0.2 live** in ~121 non-EU countries since 2026-04-24. EU distribution still blocked by DSA Trader Status. Dark-only.
- **Engine** (`engine.js`) — single JS module, master in the web repo. Byte-identical to iOS via `cp` + committed on both sides after every engine edit. Runs on iOS through JavaScriptCore via `EngineService.swift`.
- **Owner:** Musti (solo hobbyist dev). MacBook Air, Claude Max plan, token-conscious. GitHub Actions on 2000 min/month (TestFlight workflow is manual-dispatch-only).

## State right now (2026-04-24 PM)

**Phase DQ (Data Quality & Pro-Relevance):**
- Master spec: [`docs/specs/IMPL-041-data-quality-phase.md`](../specs/IMPL-041-data-quality-phase.md). Five sub-phases, strict sequence.
- **DQ-1 ✅ 2026-04-24 AM** (provenance infrastructure on resolveProfile).
- **DQ-1-followup ✅ 2026-04-24 PM** (filament panel provenance via `_prov` sidecar on getAdjustedTemps / getAdvancedFilamentSettings / getFilamentProfile).
- **DQ-2 ✅ 2026-04-24 PM** (Safe/Tuned `profileMode` toggle + `_tier()` helper + sparse `_tuned` override data convention + 5 MVP tiered fields + web/iOS UI + walkthrough + 2 XCTest mirrors).
- **DQ-3 next** (this session's target).

**v1.0.2 live:** released 2026-04-24 to same ~121 non-EU countries as v1.0.0. Day-1 monitoring is owner-gated; DQ work continues in parallel.

**Open IR-5 items still parked:**
- `[LOW-005]` prc_0.2 siblings — product-taste decision, owner.
- `[LOW-007]` Bambu preset version hoist — export-deferred.
- `[CRITICAL-001-followup]` Worker routing split `#ios-app-feedback` vs `#web-app-feedback` — v1.0.3 scope.
- `[MEDIUM-019-followup]` 0.8mm max_mvs gaps — **folds into DQ-3's scraper pass** (single scrape, two outputs).
- Prusa `wall_loops` tab gap — low priority.

## DQ-3 — Pressure / Linear Advance per material

**Goal:** the single highest-demand tuning number for pros. 3dpa currently emits nothing for PA (Bambu/Orca) or LA (Prusa).

**Design (from IMPL-041 §DQ-3):**

- Extend `data/materials.json` with per-material `pressure_advance` map: `{ "bambu_a1": { "0.2": 0.020, "0.4": 0.035, ... }, ..., "_default": { ... } }`.
- Engine emits: `pressure_advance` (Bambu/Orca) or `linear_advance_factor` (Prusa) in resolveProfile.
- Lookup order: exact printer-id → printer-series → `_default`.
- Every PA/LA emission provenance-tagged per DQ-1 (`vendor` source + real ref).
- Safe tier: vendor-published where available. Tuned tier: community consensus (pair with DQ-2 `_tuned` pattern on the PA map — sparse override per printer/nozzle).

**Scraper-assisted data collection (per IMPL-041 §Scraper strategy):**

1. **Claude Code authors** a Node.js scraper in `scripts/scrape/` (one-time, throwaway).
2. **Owner runs locally** on MacBook — zero Claude-token cost for the HTML fetching + parsing.
3. **Output** to `docs/research/scraped/YYYY-MM-DD-{source}/*.json` (committed).
4. **Gemini pass** (owner-run, free 2M context) — cross-references sources, proposes PA values with `high` / `medium` / `low` confidence.
5. **Claude Code lands** `high`-confidence values one material per commit into `materials.json`. `medium` → filed for owner review. `low` → dropped.

**Source list (locked in IMPL-041):**

| # | Source | What we get |
|---|---|---|
| 1 | Bambu Lab Wiki (`wiki.bambulab.com`) | A1/P1/X1 PA values, Bambu filament TDS |
| 2 | Prusa Knowledge Base (`help.prusa3d.com`) | Prusa LA values, Prusament TDS |
| 3 | Polymaker (`polymaker.com`) | PA-CF, PC, PETG Pro, ASA TDS PDFs |
| 4 | Prusament (`prusament.com`) | High-quality reference filament TDS |
| 5 | Overture (`overture3d.com`) | Mainstream-budget TDS |
| 6 | eSun (`esun3d.com`) | Budget-tier TDS |

**Acceptance:**

- PA/LA populated for **top 10 materials × 4 mainstream printer series** minimum (Bambu A1 / P1 / X1, Prusa MK4).
- `_default` fallback for all 18 materials.
- Walkthrough harness: ≥ 3 combos assert PA/LA presence + sanity range (0.01 < PA < 0.10).
- iOS XCTest asserts PA/LA decoding + range.
- Bambu Studio export round-trip test passes (the new field doesn't break JSON import).
- `[MEDIUM-019-followup]` max_mvs 0.8mm gap filled in same pass (one scraper pass, two outputs per IMPL-041 §DQ-3).

**Scope decisions to make early in the session:**

1. **Author the scraper first, or land the engine emission stub first?** My recommendation: engine emission stub first with `_default` PA values pulled from what slicer-preset data we already have (Bambu vendor preset JSONs ship with PA numbers we can reverse-engineer from public presets). Then scraper augments with confidence-tagged real values. This way the feature is useful immediately, even before scraping.
2. **Bambu PA vs Prusa LA — emit both or just one?** Spec says both. They're the same concept with different names per slicer family. Engine should branch on `getSlicerForPrinter(state.printer)` and emit the appropriate param.
3. **Fold `[MEDIUM-019-followup]` (0.8mm max_mvs gaps) into this session, or defer?** My recommendation: fold. Scraper touches the same files; single pass produces both deltas.

## Repo layout (paths you'll need)

```
/Users/mragile.io/Documents/Claude/Projects/
├── 3dprintassistant/                          ← WEB REPO (master)
│   ├── engine.js                              ← ALL business logic; _tier at line ~56, S/A at 54-55
│   ├── app.js                                 ← UI; renderProfilePanel ~1207; renderFilamentPanel ~1121
│   ├── data/materials.json                    ← PA/LA map lands here
│   ├── data/rules/objective_profiles.json     ← _tuned override pattern lives here (DQ-2)
│   ├── scripts/walkthrough-harness.js         ← regression harness (extend for DQ-3 PA coverage)
│   ├── scripts/scrape/                        ← NEW — DQ-3 scrapers land here
│   ├── docs/
│   │   ├── planning/ROADMAP.md                ← single source of truth
│   │   ├── specs/IMPL-041-data-quality-phase.md  ← Phase DQ master spec
│   │   ├── research/scraped/                  ← scraper raw outputs land here
│   │   ├── sessions/                          ← this file + logs + INDEX
│   │   └── runbooks/incident-response.md
│
├── 3dprintassistant-ios/                      ← iOS REPO
│   ├── 3DPrintAssistant/
│   │   ├── Engine/EngineService.swift         ← Provenance + _ProfileParamWire (DQ-1); AdjustedTemps + FilamentProfile prov dict (DQ-1-followup)
│   │   ├── Models/AppState.swift              ← profileMode: String? (DQ-2)
│   │   ├── Views/Configurator/GoalsView.swift ← Safe/Tuned segmented control (DQ-2)
│   │   └── Data/materials.json                ← byte-identical sync from web
│   └── 3DPrintAssistantTests/EngineServiceTests.swift  ← 46 tests
│
└── CLAUDE.md                                  ← top-level rules — read first
```

## Architecture notes you'll actually need

- **`_tier(preset, field, mode)` pattern from DQ-2** — sparse `_tuned` override block is the right home for Tuned PA values too. Both Safe and Tuned PA maps can coexist in `materials.json`.
- **Provenance from DQ-1** — every PA emission MUST carry `{source, ref}`. Sourced from Bambu wiki → `source: 'vendor', ref: 'bambu-wiki-pla-basic'`. Sourced from community consensus → `source: 'default'` + note in ref.
- **Web is master, iOS mirrors.** Edit `engine.js` or `data/*.json` on web first, `cp` to iOS (byte-identical), run walkthrough harness, run iOS XCTest, commit both sides with matching finding IDs in the subject.
- **Do NOT use Claude Code as the scraper.** Author the scraper in Node, owner runs it locally. HTML-reading burns tokens with poor yield.
- **TestFlight is manual-dispatch only.** `gh workflow run testflight.yml --ref main`. Don't trigger autonomously.
- **iOS 46/46 XCTest baseline** after DQ-2. Any test count change should be reflected in the session log.

## Standing rules (from CLAUDE.md — binding every session)

1. **Progress bar on every multi-step task:** `[🟩🟩⬜⬜⬜⬜ 40%] Step`. Owner wants this visible.
2. **Direct recommendations** — no endless options lists.
3. **ROADMAP is truth** — read it in full before reporting any project status.
4. **One finding = one commit per platform.** Web + iOS, matching subject + `[IMPL-041 / DQ-3 …]` tag.
5. **Propose diff in plain English before each edit. Wait for owner sign-off per finding** — unless the owner explicitly authorises a session-scoped autonomous sweep.
6. **Chain mechanical tool calls.** For doc-close / sync-then-commit loops, fire 5–10 tool calls in a single message then summarise.
7. **Test after every engine or data edit:** `cp` to iOS byte-identical → `node scripts/walkthrough-harness.js` → iOS XCTest.
8. **iOS push gate (per top-level CLAUDE.md):** do not push iOS commits to `main` until the version is fully ready for TestFlight (all planned changes landed, XCTest green, walkthrough green, `MARKETING_VERSION` bumped, owner ready to dispatch). Local commits between findings are fine; remote push is gated on ship-readiness. TestFlight is manual-dispatch only.
9. **Commit format:** `engine: …` / `iOS: …` / `data: …` / `scripts: …` with `[IMPL-041 / DQ-3 …]` tag. Trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. Never skip hooks.
10. **Data/logic change evaluation (MANDATORY):** every change must mention whether web + iOS UI need updates to best use the improvement.
11. **Md-hygiene sweep at session end** — checklist at bottom of CLAUDE.md.
12. **Right thing, not easy thing, post-live** — apply fixes to web + iOS both, never narrowed scope.
13. **NEXT-SESSION.md is owner-triggered only.**
14. **Give Musti step-by-step guides for anything he needs to do manually** (in this case: running the scraper locally, running Gemini cross-reference pass).

## Files to read in order before answering

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — top-level rules.
2. `3dprintassistant/docs/planning/ROADMAP.md` — **full file.** Pay special attention to Phase DQ section + IR-5 parked items.
3. `3dprintassistant/docs/specs/IMPL-041-data-quality-phase.md` — **full file.** DQ-3 design lives there + scraper strategy section.
4. `3dprintassistant/docs/sessions/INDEX.md` — skim top 5.
5. `3dprintassistant/docs/sessions/2026-04-24-cowork-appdev-dq-2-safe-tuned.md` — most recent session (DQ-2 + DQ-1-followup close).
6. `3dprintassistant/docs/sessions/2026-04-24-cowork-appdev-dq-1-provenance.md` — two sessions ago (DQ-1).
7. `3dprintassistant/docs/sessions/2026-04-23-cowork-appdev-ship-v1.0.2.md` — three sessions ago (v1.0.2 submit).

## First action in the next session

1. Read the files above, in order.
2. Confirm with owner: emission stub first (from reverse-engineered Bambu vendor-preset values) or scraper first?
3. Confirm scope on the 3 DQ-3 decisions above (scraper timing, Bambu PA + Prusa LA coverage, folding `[MEDIUM-019-followup]`).
4. Progress-bar anything with 3+ steps.

## Session process (don't drift)

- Propose diff in plain English before each edit. Wait for owner sign-off (unless autonomous sweep is authorised).
- One finding = one commit per platform.
- After every web `engine.js` or `data/*.json` edit: `cp` to iOS → `node scripts/walkthrough-harness.js` → iOS XCTest (`xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant -destination "platform=iOS Simulator,id=59B628C6-C142-42ED-8CFC-E671FCB4C077" -only-testing:3DPrintAssistantTests CODE_SIGNING_ALLOWED=NO`).
- For the scraper: author → hand owner a 1-line run command → owner runs locally → owner commits raw output → Claude Code lands values.
- Commit trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. Never skip hooks.

## Acceptance for DQ-3 phase close

- PA/LA live for top 10 materials × 4 printer series minimum (Bambu A1/P1/X1, Prusa MK4).
- `_default` fallback covers all 18 materials.
- Every PA/LA emission provenance-tagged (`vendor` where scraped, `default` where community-sourced).
- Safe/Tuned differentiation on PA for ≥ 3 materials where data supports it.
- Walkthrough harness: ≥ 3 combos assert PA presence + sanity range; Bambu Studio export round-trip test passes.
- iOS XCTest: `testPressureAdvanceEmitsForTopMaterials` + `testLinearAdvanceForPrusaPath` land; count 46 → 48 minimum.
- `[MEDIUM-019-followup]` max_mvs 0.8mm gaps filled (R8 soft-warning count at init drops from 16 → ~0).
- ROADMAP DQ-3 section fully ticked; Phase DQ table shows 3/5.

<<< END <<<

---

## How to maintain this file

- **This file is owner-triggered, not session-end-triggered.** Regenerate only when the owner explicitly asks (e.g. "update NEXT-SESSION", "refresh the kickoff", "I'm starting cold tomorrow").
- **The copy-paste block between the markers is the prompt to start the next session** — includes project overview, architecture, repo layout, standing rules, and task-specific context.
- **Owner action:** paste the block between markers into a new Cowork session. That's it.
