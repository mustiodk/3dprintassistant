# 2026-05-08 — Cowork (appdev): v1.0.3 batch planning + Gemini research handovers

## Durable context

- **Phase A printer changes are LOCKED but HELD by owner choice.** Specs verified end-to-end against primary sources (Anycubic wiki + Elegoo product page, both pulled into `Obsidian Vault/50-Wiki/raw/3dpa/`). Final JSON queued in `docs/research/gemini-printer-specs-kobra-audit-and-centauri.md` § "Locked Phase A scope". **Do not ship without explicit owner go-ahead** — the hold is intentional pending Phase B research evaluation. The owner's hold trigger condition wasn't specified (after all Phase B? after Phase B+C? we don't know — ask before applying).
- **Handover #1 (Gemini, printer audit) FAILED quality bar — declined in full.** Zero source URLs cited, three phantom discrepancies (misread our supplied existing-entries table), direct contradiction with our existing Kobra X entry, audit collapsed Kobra 2 + 1st-gen Kobra into single rows, schema fabrications including admitted-guess `open_door_threshold_bed_temp: 60`. **Tool-fit lesson:** spec-table / hard-data lookups → wrong fit for Gemini (likely answers from training memory rather than live web sources). Synthesis tasks (taxonomy, comparisons, problem-space exploration) → Gemini fits well. Owner-manual procedure (with owner-added wiki pages as primary sources) replaced #1 successfully. Handover #3 (iOS review prompt) bakes in lessons: Task 0 starting-state self-check + explicit "source-or-null" Quality bar rule citing #1's failure.
- **Kobra X existing data was 6 fields wrong; Centauri Carbon is greenfield.** Anycubic FAQ explicitly says *"the Kobra X features an open gantry-style frame"* — definitive. Existing `series: corexy / enclosure: passive / series_group: Kobra S Series / max_bed_temp: 110 / available_nozzle_sizes: [0.4, 0.6] / open_door_threshold_bed_temp: 45` should be `bedslinger / none / Kobra Series / 100 / [0.4, 0.6, 0.8] / null`. Centauri Carbon: CoreXY passive enclosure, 320°C nozzle, 110°C bed, 500 mm/s peak, 32 mm³/s flow, 121-point auto-leveling. **CANVAS multi-color is "On the Roadmap" per Elegoo's own spec — ship `multi_color_systems: []` not `["canvas"]`.** Two IR-5 followups deferred as project-wide schema expansions: 0.25mm nozzle catalog entry + `pla_specific` plate identifier.
- **Owner workflow established for primary-source verification.** Owner pulls manufacturer wiki / product pages into `Obsidian Vault/50-Wiki/raw/3dpa/<brand>/` as markdown clippings. Claude reads from there. Worked smoothly — much higher signal than Gemini training-data answers. Establish as the standing pattern for future hard-data lookups (spec sheets, manufacturer guides, etc).
- **AI Operating Model pilot: 6 days remain (ends 2026-05-14).** Codex review skipped on Phase A per per-phase filter (0 of 7 triggers fire — pure data addition, schema-additive, fully reversible). Will fire on items 2/3/4 Codex packets where the filter genuinely triggers. DQ-3 (Pressure Advance) deferred to post-v1.0.3 ship — first queued Codex review of pilot now lands on items 2/3/4 instead. Pilot end-of-decision matrix in `docs/ai-collab.md` § Pilot.

## What happened / Actions

This was a planning + research-handover-drafting session. No code, no walkthrough harness, no XCTest runs. All work in `docs/`.

1. **Cold-start across 3dpa web + iOS** (treated as a single product per the project token table). Read top-level CLAUDE.md, ROADMAP.md, INDEX.md (top 5), last 3 session logs in full, NEXT-SESSION.md (then dated 2026-04-24, targeting DQ-3).
2. **Owner pivoted scope** from DQ-3 to a new v1.0.3 batch — 5 user-facing items: (1) missing printers, (2) expanded environments, (3) iOS App Store review prompt, (4) analytics, (5) web output-panel UX visibility. DQ-3 deferred to post-v1.0.3 ship.
3. **Workflow negotiated and locked:** Claude plans + codes, Gemini researches (handover docs in `docs/research/`), Codex reviews (packets in `codex/<feature>-review/`). Owner reviews handover output and signs off implementation calls.
4. **Created `docs/3dpa-context.md`** — compact, evergreen project-context reference linked from every Codex review packet and Gemini research handover so they don't re-derive what 3dpa is.
5. **Drafted handover #1 (printer audit)** — Gemini's response failed the source-or-null quality bar. Declined in full. Switched to owner-manual procedure with worksheet in the same file.
6. **Owner added wiki pages** to `Obsidian Vault/50-Wiki/raw/3dpa/anycubic/`: Anycubic Kobra X overview, Key Components, FAQ. Then added `Obsidian Vault/50-Wiki/raw/3dpa/elegoo/Elegoo Centauri Carbon Best High-Speed CoreXY 3D Printer.md`.
7. **Verified Kobra X is open-frame bedslinger** (Anycubic FAQ explicit: "without a fully enclosed chamber" / "open gantry-style frame"). FAQ surfaced 2 additional wrong fields beyond the initial audit (max_bed_temp 110→100, available_nozzle_sizes incomplete).
8. **Verified Centauri Carbon full spec** from Elegoo product page. Surprise finding: CANVAS multi-color is "On the Roadmap" — not shipping. `multi_color_systems: []` is the honest call.
9. **Locked Phase A scope** in the printer-audit handover file — final JSON for both printers + 3 implementation decisions + IR-5 followups + commit procedure. **Held by owner** to allow Phase B research to land first.
10. **Drafted handover #2 (environment taxonomy)** — Gemini researches the universe of climate/altitude/dust/ventilation challenges in FDM printing across regions, recommends a bounded taxonomy (6–9 environments), surfaces design tensions for the Codex packet. Owner/linter then tightened the brief mid-session: corrected `normal` description, added "Current engine-consumption reality" table mapping each env field to actual engine.js behaviour (some fields are data/reference-only, some are wired up — Codex packet needs visibility into that distinction).
11. **Drafted handover #3 (iOS App Store review prompt best practices)** — Gemini researches `SKStoreReviewController` + `RequestReviewAction` mechanics, the 3-prompts-per-365-days quota, "engaged recurring user" heuristics from real published case studies, anti-patterns with evidence, design tensions for the Codex packet. Lessons from #1's failure baked in: Task 0 starting-state self-check, Quality bar explicitly references the source-or-null rule + #1's decline.
12. **Verified iOS review-prompt code is greenfield** (grep confirmed zero `SKStoreReviewController` / `RequestReviewAction` / `UserDefaults` / launch-counter usage — both the engagement tracking layer AND the trigger heuristic must be designed from scratch).
13. **Gemini response on handover #3 landed during wrap-up.** All 6 blocks filled (Block 0 starting-state read-back correct, Block 1 API mechanics with Apple-docs URLs, Block 2 signals + 2 candidate heuristics, Block 3 anti-patterns, Block 4 design tensions, Block 5 cross-cutting incl. iOS 18 deprecation note + Danish localisation claim + TestFlight detection recipe). **Lessons-baked-in worked.** Source-or-null rule produced real URLs per row, not the empty-cell pattern from #1. Quick skim flags for Resolution (next session): one Tier 3 Reddit cite for "Custom UI Popups → Guideline 1.1.7" (should resolve to Apple's primary guideline doc); Recommendation 1's specific threshold values picked from a cited range without explaining the point-vs-range choice; Block 5 "Apple prompt automatically localises to Danish" claim has no inline source. Substantive Resolution deferred to next session.
14. **Wrap-up:** session log, INDEX update, NEXT-SESSION regenerated for v1.0.3 batch cold-start (first action updated from "hand #3 to Gemini" to "draft #3 Resolution + hand #2 to Gemini"), light ROADMAP touch (Last updated only — no checkbox changes since nothing shipped).

## Files touched

**Created (3dpa repo, all committed):**
- `docs/3dpa-context.md`
- `docs/research/gemini-printer-specs-kobra-audit-and-centauri.md`
- `docs/research/gemini-environments-taxonomy-research.md`
- `docs/research/gemini-ios-review-prompt-best-practices.md`
- `docs/sessions/2026-05-08-cowork-appdev-v1.0.3-batch-planning-and-handovers.md` (this file)

**Modified (3dpa repo, committed):**
- `docs/research/gemini-printer-specs-kobra-audit-and-centauri.md` — appended Resolution + owner-manual worksheet (a352612), then Locked Phase A scope (7eb9ebb)
- `docs/research/gemini-environments-taxonomy-research.md` — owner/linter tightening for engine-consumption reality table (51e61a7)
- `docs/sessions/INDEX.md` — prepended this session
- `docs/planning/ROADMAP.md` — Last updated header touch (no checkboxes ticked)
- `docs/sessions/NEXT-SESSION.md` — regenerated for v1.0.3 batch cold-start

**Created in Obsidian Vault by owner (not 3dpa repo, but consumed as primary sources):**
- `50-Wiki/raw/3dpa/anycubic/Anycubic Kobra X.md`
- `50-Wiki/raw/3dpa/anycubic/Kobra X - Introduction to Key Components.md`
- `50-Wiki/raw/3dpa/anycubic/Kobra X-FAQ.md`
- `50-Wiki/raw/3dpa/elegoo/Elegoo Centauri Carbon  Best High-Speed CoreXY 3D Printer.md`

**Untracked at session end:** none.

## Commits

On branch `ai/operating-model-pilot` (NOT `main` — pilot runs on branch by design; 12 commits ahead of `origin/ai/operating-model-pilot`, all local-only):

- `c79c261` — `docs: add 3dpa-context.md as compact reference for AI peers`
- `0917f1c` — `docs: add Gemini handover for printer audit (Anycubic Kobra + Elegoo Centauri Carbon)`
- `ac60e71` — `docs: add Gemini handover for environment-taxonomy expansion research`
- `a352612` — `docs: resolve printer-audit Gemini round (decline) + add owner-manual worksheet`
- `7eb9ebb` — `docs: lock Phase A printer-audit scope (held until Phase B/C complete)`
- `42a8999` — `docs: add Gemini handover for iOS App Store review-prompt best practices`
- `51e61a7` — `docs: tighten environment-taxonomy handover brief (engine-consumption reality + clarifications)`
- (this session log + INDEX + NEXT-SESSION + ROADMAP touch — to be committed at session-close)

No engine, data, or test changes. Walkthrough harness + iOS XCTest baselines unchanged from start of session: 10/10 + DQ-2 assertion 3/3 green; iOS 46/46 green.

## Open questions / owner asks

- **When does Phase A ship?** Owner held the printer changes pending Phase B evaluation but didn't specify the trigger condition. Possibilities: after all Phase B handovers complete; after Phase B+C complete; "ship anytime, just wanted to see Phase B briefs first." Ask before applying the printer changes.
- **Push `ai/operating-model-pilot` branch to GitHub `origin`?** 12 commits ahead local-only. End-of-pilot decision is 2026-05-14. Pushing now gives Codex / Gemini direct git access for review references; not pushing keeps things tidy until pilot decision lands. Owner call.
- **ACE GEN2 vs ACE multi-color identifier consistency** (project-wide) — flagged this session as a potential IR-5 candidate. Adding `["ace_gen_2"]` differentiation would require auditing every Anycubic entry's `multi_color_systems` value. Skipped for v1.0.3 per owner; revisit?
- **Lessons-for-pilot capture** — the "Gemini got Kobra X bedslinger right despite hallucinating the audit" insight was flagged as worth noting in pilot lessons-learned. Was the framework that "decline a wholesale-failed response" wrong, given it surfaced a real bug? Probably no (we still verified the bug independently with primary sources before fixing). But framework needs to verify each finding rather than accept-or-decline a response wholesale. Capture before 2026-05-14 pilot review.

## Vault sweep

Per the vault-sweep checklist:

- **Strategic decision worth propagating:** YES — *"Spec-table / hard-data lookups → not Gemini; synthesis tasks → Gemini OK"* is a durable tool-fit insight that fits `Obsidian Vault/20-Areas/Development/toolchain.md`. Pair with the existing toolchain note about Gemini for research. Propose adding.
- **New shorthand / term:** none new this session.
- **Cross-project pattern:** the *"manufacturer wiki pages → Obsidian Vault → Claude reads as primary source"* workflow is a generally-useful pattern. Likely applies to other projects (bambuinventory has manufacturer-data lookups too). Propose surfacing in `toolchain.md` alongside the Gemini tool-fit note.
- **Hobby observation:** none.
- **Consulting insight:** none.
- **External source to ingest:** the wiki pages owner added (Kobra X, Centauri Carbon) are already in the wiki — no new ingest needed.

Net: 1–2 toolchain.md updates worth proposing; nothing strictly required.

## Md-hygiene sweep

1. **Root-level stubs:** none introduced.
2. **Untracked but should-be-tracked:** all in-session creations were committed.
3. **Secrets in tree:** none.
4. **Content buried in session log:** the durable "Gemini for spec lookups = wrong fit" lesson is captured in Durable context above + handover #3 brief explicitly references it. Plus toolchain.md propagation proposed in vault sweep. Adequately surfaced.
5. **Stale ROADMAP sections:** ROADMAP "Last updated" touched to 2026-05-08; no checkboxes ticked (correctly — nothing shipped). Phase DQ section is intact (DQ-3 still listed; deferral noted in NEXT-SESSION rather than ROADMAP body since it's a planning-state-only deferral).
6. **Duplicate specs:** none introduced.
7. **Protocol-file drift:** Did not check `diff -u Projects/CLAUDE.md Projects/AGENTS.md` this session. Drift check on the next wrap-up.

No new findings.

## Next session

Most likely first action: **draft Resolution for handover #3 (Gemini iOS review-prompt response landed during wrap-up).** Substantive evaluation against the Quality bar — most checks should pass on a skim (Block 0 correct, sources populated per row), but verify:
- Each numeric threshold has a real (Tier 1 or 2) URL behind it.
- The Tier 3 Reddit cite for Guideline 1.1.7 is replaceable with Apple's primary doc.
- Block 5 "Apple prompt auto-localises to Danish" claim — chase a Tier 1 source or flag null.
- Recommendation 1 picked specific values (5 / 4 / 3) inside a cited range — Resolution should note this is a point-pick from a 3–10 range and the Codex packet will challenge it.

If Resolution is clean: that output feeds the Codex review packet for Item 3 (drafting the packet is next).

Concurrent: **hand handover #2 (environment taxonomy) to Gemini** — was drafted but not yet sent. The recently-tightened brief (engine-consumption reality table) makes it ready.

Then in sequence:
- Draft handover #4 (analytics platform comparison)
- Item 5 web output UX deep-dive (Claude direct, not Gemini)
- Phase C: 3–4 Codex review packets (items 2 / 3 / 4 / possibly 5)
- Phase A ship + Phase D parallel implementation
- Phase E: v1.0.3 ship cycle (MARKETING_VERSION bump, TestFlight dispatch, App Review submit)

Pilot decision deadline 2026-05-14 (6 days from now). v1.0.3 ship will likely land mid-pilot or just-post-pilot depending on cadence. End-of-pilot evaluation needs the Codex packets' scorecards as evidence.
