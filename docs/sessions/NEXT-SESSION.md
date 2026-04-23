# Next session — cold-start prompt

**Last updated:** 2026-04-24 overnight — post DQ-1 (provenance infrastructure) end-to-end close. Regenerated on owner ask per the owner-triggered-only rule.

**Phase:** DQ-2 (Safe/Tuned objective toggle) is next. DQ-1 fully shipped + tested, 42/42 iOS XCTest + 10/10 walkthrough combos green. v1.0.2 **still awaiting Apple review** (no Claude-executable work there — owner releases when Apple approves).

A stale file between sessions is acceptable. Regenerate only on explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — Phase DQ, sub-phase DQ-2 (Safe / Tuned objective)

## Project at a glance

**3D Print Assistant** generates optimized 3D printing profiles based on printer + material + nozzle + user goals. Two apps, one shared engine:

- **Web app** (`3dprintassistant.com`, repo `3dprintassistant/`) — live, Cloudflare Pages, auto-deploys from `main`. 64 printers, 12 brands, 18 materials, 9 nozzles, 3 slicers.
- **iOS app** (repo `3dprintassistant-ios/`) — **v1.0 live** in ~121 non-EU countries since 2026-04-16. EU distribution still blocked by DSA Trader Status. Dark-only. **v1.0.2 submitted to App Review 2026-04-23** — still awaiting Apple decision at last check.
- **Engine** (`engine.js`) — single JS module, master in the web repo. Byte-identical to iOS via `cp` + committed on both sides after every engine edit. Runs on iOS through JavaScriptCore via `EngineService.swift`.
- **Owner:** Musti (solo hobbyist dev). MacBook Air, Claude Max plan, token-conscious. GitHub Actions on 2000 min/month (TestFlight workflow is manual-dispatch-only).

## State right now (2026-04-24)

**Phase DQ (Data Quality & Pro-Relevance):**
- Master spec: [`docs/specs/IMPL-041-data-quality-phase.md`](../specs/IMPL-041-data-quality-phase.md). Five sub-phases, strict sequence.
- **DQ-1 ✅ shipped 2026-04-24** (overnight session). Provenance now threads through every numeric emission from `resolveProfile`. Web shows ⓘ tooltip in Advanced view; iOS shows `info.circle` button → alert.
- **DQ-2 next** (this session's target).

**iOS v1.0.2 in review:** submitted 2026-04-23 with Manual release toggle. Owner handles approval + release + day-1 monitoring. Not Claude-blocking.

**Open IR-5 items relevant to DQ work:**
- `[DQ-1-followup]` — extend provenance to filament panel (needs `getAdvancedFilamentSettings` + `getAdjustedTemps` prov emission + `renderFilamentPanel` / `FilamentSettingsView` render wiring). ~2h. Natural fit to bundle with DQ-2 since both are UI changes on the same panels.
- `[LOW-003-followup-label]` — `app.js:1187` reads deleted `adv.retraction_length` → user sees "Retraction length undefined" in the Filament Settings SETTING OVERRIDES section. 2-line fix (rename to `adv.retraction_distance` + locale label if needed). Can be a warm-up before DQ-2.

## DQ-2 — Safe vs Tuned objective

**Goal:** introduce a mode toggle that lets pros get aggressive community-validated numbers while keeping beginners on the current (conservative published-spec) profile.

**Design (from IMPL-041):**

- New state field `profileMode: "safe" | "tuned"`. Default `"safe"`.
- `data/rules/objective_profiles.json` + relevant rules carry **both tiers** where they differ. Where they don't differ, one value serves both.
- Engine accepts `profileMode` in state; emission resolves to the correct tier.
- UI toggle on the Goals step (web + iOS) with one-line explainer ("Safe (published spec)" / "Tuned (community-validated)").
- Migration: missing / unset `profileMode` reads as `"safe"` → **existing users see zero behavior change**.
- Provenance (from DQ-1) reflects which tier the value came from — `prov.source` stays as-is but `prov.ref` should be extended to show which tier was resolved.

**Acceptance:**

- Toggle live on both platforms.
- `profileMode` unset or `"safe"` → every existing walkthrough combo's emission byte-equal to pre-DQ-2 (regression test).
- `profileMode: "tuned"` → differentiated numbers where data exists; falls back to safe where not.
- Provenance reflects the resolved tier in `ref` or a new `tier` sub-field.

**Scope decisions to make early in the session:**

1. **Which fields differ Safe vs Tuned in DQ-2 itself?** Infinity of options; MVP should pick 3–5 high-leverage fields (e.g. `outer_wall_speed` aggressive cap, `sparse_infill_density`, `outer_wall_acceleration`). Rest stay tier-agnostic and upgrade as DQ-3/4/5 land real data.
2. **Where does the UI toggle live?** Goals step is the spec answer. On iOS this is `GoalsView`; on web it's the filter block. Probably a new `[data-filter="profile_mode"]` or a top-level segmented control near the Simple/Advanced toggle.
3. **Bundle `[DQ-1-followup]` (filament panel prov) into this session?** My recommendation: yes. Same UI territory, same feature story ("pros can see everything"). ~2h extra + keeps one-feature-one-ship.

## Repo layout (paths you'll need)

```
/Users/mragile.io/Documents/Claude/Projects/
├── 3dprintassistant/                          ← WEB REPO (master)
│   ├── engine.js                              ← ALL business logic; `S`/`A` helpers at line 35 (prov plumbing here)
│   ├── app.js                                 ← UI; renderProfilePanel at 1207; renderFilamentPanel nearby
│   ├── data/rules/objective_profiles.json     ← where Safe/Tuned tiers will live
│   ├── scripts/walkthrough-harness.js         ← regression harness (extend for DQ-2 tier coverage)
│   ├── style.css                              ← .prov-icon rule already there from DQ-1 commit 4
│   └── docs/
│       ├── planning/ROADMAP.md                ← single source of truth
│       ├── specs/IMPL-041-data-quality-phase.md  ← Phase DQ master spec
│       ├── sessions/                          ← this file + logs + INDEX
│       └── runbooks/incident-response.md
│
├── 3dprintassistant-ios/                      ← iOS REPO
│   ├── 3DPrintAssistant/
│   │   ├── Engine/EngineService.swift         ← `Provenance` struct + `_ProfileParamWire` decode from DQ-1
│   │   ├── Models/AppState.swift              ← add `profileMode` field here
│   │   ├── Views/Goals/                       ← GoalsView — toggle lives here
│   │   ├── Views/Components/SharedComponents.swift  ← ParamRow with prov support
│   │   └── Views/Output/PrintProfileTabView.swift
│   ├── 3DPrintAssistantTests/EngineServiceTests.swift  ← 42 tests; +2 from DQ-1
│   └── docs/reviews/2026-04-23-high-003-codex/
│
└── CLAUDE.md                                  ← top-level rules — read this first
```

## Architecture notes you'll actually need

- **engine.js `S(value, why, prov?)` / `A(value, why, prov?)`** — DQ-1 added optional `prov`. `prov` shape: `null` OR `{ source: 'vendor'|'rule'|'default'|'calculated', ref? }`.
- **Web is master, iOS mirrors.** Edit `engine.js` or `data/*.json` on web first, `cp` to iOS (byte-identical), run walkthrough harness, run iOS XCTest, commit both sides with matching finding IDs in the subject.
- **iOS EngineService isolation model:** `final class EngineService: @unchecked Sendable` + serial `DispatchQueue(label: "engine.js")`. Every public `async throws` wraps a private `sync_*`. Don't reintroduce actor isolation.
- **IMPL-040 single-source-of-truth:** UI chip numbers must be computed at render time from the same source `resolveProfile` reads. DQ-2 must not violate this — if a Safe/Tuned choice changes an emitted number, the chip desc must reflect it via `getFilters(state)`.
- **TestFlight is manual-dispatch only.** `gh workflow run testflight.yml --ref main`. Don't trigger autonomously.
- **Provenance pattern (new, from DQ-1):**
  - `engine.js`: tag every numeric emission via 3rd arg to `S`/`A`.
  - `walkthrough-harness.js`: check 0c asserts 100% coverage. Fails hard on untagged numeric emissions.
  - Web UI: `.prov-icon` span + native `title` attribute, only rendered in Advanced mode.
  - iOS: `Provenance` struct + `_ProvenanceWire` Codable + `ParamRow.prov`/`showProv` + alert with humanized source label.
  - XCTest: `testProvenanceOnAllNumericEmissions` mirrors the harness.

## Standing rules (from CLAUDE.md — binding every session)

1. **Progress bar on every multi-step task:** `[🟩🟩⬜⬜⬜⬜ 40%] Step`. Owner wants this visible.
2. **Direct recommendations** — no endless options lists.
3. **ROADMAP is truth** — read it in full before reporting any project status.
4. **One finding = one commit per platform.** Web + iOS, matching subject.
5. **Propose diff in plain English before each edit. Wait for owner sign-off per finding** — unless the owner explicitly authorises a session-scoped autonomous sweep.
6. **Chain mechanical tool calls.** For doc-close / sync-then-commit loops, fire 5–10 tool calls in a single message then summarise.
7. **Test after every engine or data edit:** `cp` to iOS byte-identical → `node scripts/walkthrough-harness.js` → iOS XCTest.
8. **Never push iOS `main` if XCTest is red.** Free to push otherwise — TestFlight is manual-dispatch only.
9. **Commit format:** `engine: …` / `iOS: …` / `data: …` / `worker: …` with `[IMPL-041 / DQ-2 …]` tag. Trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. Never skip hooks.
10. **Data/logic change evaluation (MANDATORY):** every change must mention whether web + iOS UI need updates to best use the improvement.
11. **Md-hygiene sweep at session end** — checklist at bottom of CLAUDE.md.
12. **Right thing, not easy thing, post-live** — apply fixes to web + iOS both, never narrowed scope.
13. **NEXT-SESSION.md is owner-triggered only.**
14. **Give Musti step-by-step guides for anything he needs to do manually.**

## Files to read in order before answering

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — top-level rules.
2. `3dprintassistant/docs/planning/ROADMAP.md` — **full file.** Pay special attention to Phase DQ section + IR-5 followups.
3. `3dprintassistant/docs/specs/IMPL-041-data-quality-phase.md` — **full file.** DQ-2 design lives there.
4. `3dprintassistant/docs/sessions/INDEX.md` — skim top 5.
5. `3dprintassistant/docs/sessions/2026-04-24-cowork-appdev-dq-1-provenance.md` — most recent session (DQ-1 close).
6. `3dprintassistant/docs/sessions/2026-04-23-cowork-appdev-ship-v1.0.2.md` — two sessions ago.
7. `3dprintassistant/docs/sessions/2026-04-23-cowork-appdev-ir4-ir5-bundle.md` — three sessions ago.

## First action in the next session

1. Read the files above, in order.
2. Confirm with owner: start with `[LOW-003-followup-label]` 2-line warm-up fix? Then DQ-2?
3. Confirm scope on the two DQ-2 decisions (which fields differ Safe vs Tuned, bundle `[DQ-1-followup]` or not).
4. Progress-bar anything with 3+ steps.

## Session process (don't drift)

- Propose diff in plain English before each edit. Wait for owner sign-off.
- One finding = one commit per platform.
- After every web `engine.js` or `data/*.json` edit: `cp` to iOS → `node scripts/walkthrough-harness.js` → iOS XCTest (`xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant -destination "platform=iOS Simulator,id=59B628C6-C142-42ED-8CFC-E671FCB4C077" -only-testing:3DPrintAssistantTests CODE_SIGNING_ALLOWED=NO`).
- Commit trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. Never skip hooks.

## Acceptance for DQ-2 phase close

- `profileMode` state field exists on both platforms.
- Toggle visible on Goals step on both platforms.
- Safe default preserves pre-DQ-2 walkthrough output byte-for-byte.
- Tuned mode emits differentiated numbers on ≥ 3 fields with provenance reflecting the tier.
- XCTest + walkthrough harness both assert the Safe baseline + Tuned delta.
- ROADMAP DQ-2 section fully ticked; Phase DQ table shows 2/5.

<<< END <<<

---

## How to maintain this file

- **This file is owner-triggered, not session-end-triggered.** Regenerate only when the owner explicitly asks (e.g. "update NEXT-SESSION", "refresh the kickoff", "I'm starting cold tomorrow").
- **The copy-paste block between the markers is the prompt to start the next session** — includes project overview, architecture, repo layout, standing rules, and task-specific context.
- **Owner action:** paste the block between markers into a new Cowork session. That's it.
