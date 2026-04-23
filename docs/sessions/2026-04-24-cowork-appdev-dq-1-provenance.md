# 2026-04-24 — Cowork (appdev): DQ-1 provenance infrastructure end-to-end

## Durable context

- **Phase DQ kickoff + DQ-1 both shipped in a single overnight session.** Owner started by brainstorming "how do we become relevant for pros, not just beginners" → we converged on 5 sub-phases (provenance → Safe/Tuned → PA/LA → retraction deltas → cooling curves), wrote the IMPL-041 spec, then shipped the first (provenance) end-to-end. DQ-2 is next.
- **Spec revision decided mid-execution.** Original IMPL-041 proposed a separate `_tag(value, source, ref)` helper + splitting `resolveProfile` return shape to `{params, provenance}`. Dropped both after scouting `engine.js:35` — the existing `S(value, why)` / `A(value, why)` helpers already wrap every emission in `{value, why, mode}`. Much cleaner to add an optional 3rd `prov` arg than to split the return shape (which would have broken 4 internal `resolveProfile` callers + the iOS `_ProfileParamWire` Codable). Updated spec to document the revision and why.
- **Pragmatic baseline tagging.** Spec says "100% of numeric emissions tagged." Researching real vendor provenance for every field is DQ-3/4/5 work, not DQ-1. So commit 3 lands baseline tags (`default`/`rule`/`calculated` with refs pointing at the code/data origin *as it exists today*) on all 28 numeric emissions. DQ-3/4/5 upgrade individual fields to `source: 'vendor'` as scraper data lands. `pressure_advance` + `retraction_speed` are already real slicer-preset data — they're tagged `default` for now and should flip to `vendor` in DQ-3.
- **Invariant-before-data pattern.** Commit 2 (harness invariant) landed BEFORE commit 3 (baseline fills) — the invariant was red on all 10 COMBOS by design, then commit 3 turned it green. This catches any future numeric emission added without provenance. Mirror XCTest lives in iOS (`testProvenanceOnAllNumericEmissions`).
- **Web UI treatment iteration.** Started with dotted underline on labels (option 3 from the 4-option mockup). Owner said "too subtle, can't see it." Swapped to explicit ⓘ icon (option 1). That's the current shipped treatment. The iteration itself was fast because the preview MCP let us see-modify-reload in one eval. Worth remembering that for future UX decisions: small visual tweaks are cheaper to iterate in-browser than to debate in text.
- **Comparison view + filament panel intentionally out of scope.** The Print Profile Settings panel shows prov now, but the Filament Settings panel doesn't — it reads from `getAdvancedFilamentSettings`/`getAdjustedTemps` which DQ-1 didn't touch. Filed as `[DQ-1-followup]` in IR-5. Same ⓘ treatment will apply once those engine functions emit prov. Comparison view same story — one finding, one commit discipline.
- **Bug spotted + filed, not fixed.** During DQ-1 commit 4 browser verification, owner's screenshot showed "Retraction length undefined" in the filament panel. `app.js:1187` reads `adv.retraction_length` which was renamed to `retraction_distance` in LOW-003 (2026-04-23). Filed as `[LOW-003-followup-label]` in IR-5 — 2-line fix, deliberately NOT bundled into DQ-1.
- **Preview MCP workflow note.** `preview_screenshot` seems to capture from scroll position 0 regardless of scrollIntoView calls. Not a blocker — we used `preview_eval` + `preview_inspect` for DOM-level verification and owner scrolled manually to check visually. Worth knowing for future UI iterations.

## What happened / Actions

1. Owner opened with "I want to focus on data quality and data logic, thinking about web scrapers for brand wikis." Pushed back on scraping-everything; converged on what pros actually need: traceability, tier separation, pro fields. Drafted Phase DQ plan (5 sub-phases).
2. Wrote `docs/specs/IMPL-041-data-quality-phase.md` master spec + inserted Phase DQ block into ROADMAP + updated "Last updated" — kickoff committed as `4cde0dd` (docs) on web.
3. Scouted `engine.js` — found the existing `S`/`A` helpers at line 35, discovered 38 `p.xxx =` emission sites in `resolveProfile`. Revised spec (inline prov via `S`/`A` extension, not separate helper). Extended `S`/`A` with optional `prov` arg. Byte-identical sync to iOS. Commits `34e92b0` (web) + `720d26a` (iOS). Walkthrough green.
4. Extended `walkthrough-harness.js` with check 0c — fails on any numeric emission with `prov === null`. Red on all 10 COMBOS as designed. Commit `38b36cb`.
5. Classified all 46 emissions in `resolveProfile` (28 numeric, 18 qualitative). Filled baseline prov on the 28 numeric: 7 `default`, 19 `calculated`, 2 `rule`. Walkthrough flipped to 10/10 green. Commits `a173f0c` (web) + `16dcb2a` (iOS).
6. Implemented web Advanced-view indicator — started with dotted underline (too subtle per owner), swapped to explicit ⓘ icon + native `title` tooltip. Verified via preview MCP — icon renders on numeric rows only, qualitative rows stay bare. Commit `7b76cc3` on web (`app.js` + `style.css`).
7. iOS side: added `Provenance` struct + `ProfileParam.prov` + `_ProvenanceWire` Codable decode (defensive — null/missing/malformed all → nil). Extended `ParamRow` with `prov`/`showProv` params → renders `info.circle` button + alert with humanized source label. Wired through `PrintProfileTabView`. Added 2 XCTests (`testProvenanceOnAllNumericEmissions`, `testProvenanceSpotChecksKnownFields`). 42/42 green. Commit `837ca10`.
8. Filed two IR-5 followups in ROADMAP: `[DQ-1-followup]` for filament panel coverage + `[LOW-003-followup-label]` for the `retraction_length undefined` bug. Ticked DQ-1 section. Commit `1941ec8` on web.

## Files touched

**Modified (web):**
- `docs/specs/IMPL-041-data-quality-phase.md` (new)
- `docs/planning/ROADMAP.md`
- `engine.js`
- `app.js`
- `style.css`
- `scripts/walkthrough-harness.js`

**Modified (iOS):**
- `3DPrintAssistant/Engine/engine.js` (byte-identical sync from web)
- `3DPrintAssistant/Engine/EngineService.swift`
- `3DPrintAssistant/Views/Components/SharedComponents.swift`
- `3DPrintAssistant/Views/Output/PrintProfileTabView.swift`
- `3DPrintAssistantTests/EngineServiceTests.swift`

**Untracked, unrelated (not committed):**
- `mockup_enøglekort.png` (web root) — pre-existing
- `docs/reviews/2026-04-23-high-003-codex/06-single-paste.pdf` (iOS) — pre-existing

## Commits

**Web:**
- `4cde0dd` — docs: phase DQ kickoff — data quality & pro-relevance spec [IMPL-041]
- `34e92b0` — engine: extend S/A helpers with optional provenance arg [IMPL-041 / DQ-1 commit 1]
- `38b36cb` — engine: walkthrough harness provenance invariant [IMPL-041 / DQ-1 commit 2]
- `a173f0c` — engine: fill baseline provenance on all numeric resolveProfile emissions [IMPL-041 / DQ-1 commit 3]
- `7b76cc3` — web: Advanced-view provenance icon on profile panel [IMPL-041 / DQ-1 commit 4]
- `1941ec8` — docs: ROADMAP — DQ-1 shipped + two IR-5 followups filed

**iOS:**
- `720d26a` — iOS: sync engine.js — S/A provenance plumbing [IMPL-041 / DQ-1 commit 1]
- `16dcb2a` — iOS: sync engine.js — baseline provenance fills [IMPL-041 / DQ-1 commit 3]
- `837ca10` — iOS: decode + render provenance on profile rows [IMPL-041 / DQ-1 commit 5]

## Open questions / owner asks

- **Apple v1.0.2 review** — still awaiting approval at session close. Release + day-1 monitoring remain owner-gated.
- **DQ-1-followup (filament panel prov)** — when to pick this up? Options: bundle into DQ-2 session since it's the same UI pattern, or leave for later. My recommendation: bundle into DQ-2 so filament + profile panels both get the feature in one user-visible pass.
- **LOW-003-followup-label** — 2-line fix. Can land any time. Suggest picking up at start of next session before diving into DQ-2.

## Next session

Target: **DQ-2 — Safe vs Tuned objective toggle**.

Acceptance criteria from spec:
- Toggle live on Goals step on both platforms, default `"safe"`.
- With `profileMode` unset or `"safe"`: every combo's emission byte-equal to pre-DQ-2 (walkthrough regression test).
- With `profileMode: "tuned"`: differentiated numbers where data exists; falls back to safe where not.
- Provenance (from DQ-1) reflects which tier a value came from.

Optional warm-up: LOW-003-followup-label (2-line fix) and/or DQ-1-followup (filament panel prov extension, ~2h).

See `docs/sessions/NEXT-SESSION.md` for the cold-start prompt.

## Autonomous-sweep decisions (owner was asleep)

The owner gave session-scoped autonomous authorization to execute DQ-1 close + session wrap. Decisions I made without asking:

1. **Split the kickoff commit from the S/A plumbing commit.** Owner verbally OK'd "2 commits" (engine + iOS sync) but the ROADMAP + spec edits from earlier in the session were also sitting uncommitted. Split into 3 commits (docs kickoff / engine plumbing / iOS sync) per one-finding-one-commit discipline.
2. **Spec revision (inline prov via S/A, not separate `_tag` helper) — committed without asking again.** Owner said "OK" to all 3 questions I asked; the revision was one of them. Updated IMPL-041 to reflect.
3. **iOS ⓘ treatment → tap-to-alert, not hover-tooltip.** iOS has no hover on phones. Tap `info.circle` → SwiftUI alert with humanized source label ("Calculated" / "Curated default" / "Engine rule" / "Vendor spec") + ref pointer. Felt native; no tooltip-on-phone anti-pattern.
4. **Filed `LOW-003-followup-label` in IR-5 instead of fixing inline.** 2-line fix but owner-stated scope was DQ-1 only. File, don't bundle.
5. **Did NOT extend DQ-1 to cover `getAdvancedFilamentSettings` / `getAdjustedTemps`.** That's 3+ more engine functions. Filed as `[DQ-1-followup]`; DQ-1 closes with resolveProfile covered fully.
6. **Chose `info.circle` SF symbol over custom ⓘ text.** Native iOS affordance, accessibility-friendly.
7. **Stopped short of regenerating NEXT-SESSION.md until this log was done** — owner asked for it explicitly in the wrap, so it's in scope; doing it after this log so the prompt can link to this session.
