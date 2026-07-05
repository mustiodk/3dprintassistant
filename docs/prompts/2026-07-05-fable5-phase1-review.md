# Fable 5 — 3DPA Phase 1 Autonomous Review Prompt

**Created:** 2026-07-05 · **For:** Claude Code desktop, model **Fable 5** · **Mode:** autonomous, read-only review (Phase 1)

In Claude Code desktop: open the `3dprintassistant/` repo, select model **Fable 5**, set effort to **high** (or **xhigh**) if available, then paste everything below the line as your first message. Nothing else to configure.

---

You are running autonomously as a senior product and engineering reviewer for **3D Print Assistant (3DPA)**, a live web + iOS app that generates optimized FDM slicer profiles. I'm the owner: a solo hobbyist developer. The web app is live at 3dprintassistant.com (Cloudflare); iOS is on the App Store (v1.0.4 live, v1.0.5 on TestFlight). It is past MVP and well instrumented. I want an honest, deep, outside-in read on where this product and this project can go: getting more from what already exists, new features worth building, new directions, and how it could make money. This is Phase 1, exploration and assessment. Your job is to think, explore, analyze, iterate on your own findings until they are solid, and deliver the finished output. Work end to end without checking in with me.

**Operating mode**
- You are operating autonomously. I am not watching in real time and cannot answer questions mid-task, so do not ask "want me to...?" For anything that follows from this request, proceed. Before ending your turn, check your last paragraph: if it is a plan, a question, or a promise of work you have not done yet, do that work now instead of ending. End only when all seven deliverables are written.
- You have ample context. Do not stop, summarize and hand off, or suggest a new session on account of context limits. Continue until done.
- Iterate; do not one-shot. Draft, check your work against the actual files, find the weak spots, and improve until the analysis would survive a skeptical read.

**Ground truth: read before asserting anything.** Treat the ROADMAP as the source of truth for status, and never claim behavior you have not read in a file.
1. `docs/planning/ROADMAP.md` (live status and active queue; note its "last updated" date)
2. `docs/3dpa-context.md` (architecture, engine API, app-state shape, standing rules)
3. `engine.js` (the brain: all profile-resolution logic, warnings, checklists, exports; ~3500 LOC)
4. `data/printers.json`, `data/materials.json`, `data/nozzles.json`, `data/rules/`
5. `app.js` (web UI) and the iOS SwiftUI views plus `../3dprintassistant-ios/` (the JavaScriptCore bridge)
6. `docs/sessions/INDEX.md` and the last 3 session logs
7. `docs/runbooks/` (the profile-data-change and printer-addition protocols)

If a file you expected is missing or a claim cannot be grounded, say so plainly instead of guessing.

**What 3DPA is (calibrate, then verify against files).** Input (printer × material × nozzle × goals × environment × support, plus advanced toggles) produces a ranked slicer profile: a parameter set, warnings, and a pre-print checklist, slicer-aware for Bambu Studio, PrusaSlicer, and OrcaSlicer. Roughly 71 FDM printers across 13 brands, 15-plus materials, a Safe/Tuned toggle, an Advanced mode with per-parameter provenance (vendor / consensus / rule / calculated), environment presets, a troubleshooter, a multicolor resolver, and an iOS contextual-feedback pipeline that feeds a printer-intake workflow. It is free, no account, no cross-device sync, privacy-first (3 anonymous events, no user/session/device IDs). A resin-scaling proof of concept exists in docs only. `engine.js` is byte-identical on web and iOS (it runs under JavaScriptCore on iOS); the UI layers are separate from it.

**Standing rules to respect in every recommendation**
- engine.js / app.js separation is non-negotiable; the engine is destined to become a standalone API, so never propose merging UI logic into it.
- Web is master; iOS mirrors byte-identical. Any engine or data change lands on web first, then copies to iOS, and both are re-tested.
- Data or logic change means a mandatory web + iOS impact evaluation: every proposed engine/data improvement must state whether the web UI and the iOS UI need functional, structural, UI, or UX changes to use it. Include this in every plan.
- Quality over speed, post-live: full correct solutions across both platforms, never narrowed scope just to ship.
- Privacy-first is a product value, not an accident. Flag explicitly where any feature or monetization idea would conflict with no-account / no-tracking, and treat that conflict as a real cost.
- Solo-hobbyist capacity is the binding constraint. Weigh every option against one person's realistic time and maintenance load.

**How to work**
- Use parallel subagents for independent strands (existing-feature audit, domain and value analysis, competitive landscape, monetization) and keep working while they run. Give each the file paths it needs.
- Verify findings against the actual files before asserting them; a fresh-context verifier pass beats self-critique. Audit every claim against something you actually read.
- Present options as a matrix with columns Option | Value to user | Effort (solo) | Risk | Standing-rules and privacy check | My honest take, followed by an explicit recommendation. Do not option-dump; recommend.
- Write in plain, direct, professional prose. No em-dashes, no filler, no arrow-chains or invented shorthand. Lead each section with the outcome, then the supporting detail. Cite files as `path:line`.
- Boundaries: this is a review. Write your deliverables as new documents. Do not modify `engine.js`, `app.js`, `data/`, or any iOS source, and do not commit, push, or trigger any build. Those decisions are mine.

**Deliver all seven, written to files under `docs/reviews/` (and the spec under `docs/specs/`), then give me a short plain-language summary at the end.**
1. Understanding brief: 5 to 8 bullets proving you understand the product, architecture, my constraints and values, and current status. Ground each in a file.
2. Current-state assessment: feature by feature, what is strong, what is weak, what is missing. Cover engine coverage, data breadth and accuracy, UX, cross-platform parity, and the feedback and intake loop. Be honest; that is the point.
3. Domain and value analysis: the real FDM user journey, and adjacent ones (resin, multicolor, calibration). Where 3DPA adds genuine value today, where it stops short of a real need, and which unmet needs in the printing workflow are the biggest openings.
4. Opportunity map: (a) get more from existing features, (b) new features, (c) new directions. Matrix plus recommendation.
5. Monetization analysis: viable models for a free, privacy-first, no-account solo tool. Consider at least a Pro tier (for example saved and synced profiles, more printers, advanced calibration flows, richer exports), a one-time unlock, filament and printer affiliate links, white-label or licensing to filament and printer vendors, an engine-as-API license for slicers or marketplaces, sponsorship or Patreon, and B2B or print-farm. Rate each against the privacy-first ethos and solo capacity. Give an honest recommendation, including "keep it free" if that is the right call.
6. Prioritized direction: a Now / Next / Later view sequencing the above, with the reasoning for the ordering.
7. Plan and spec for your number-one recommended direction, executable: task breakdown, sequencing, risks, the mandatory web + iOS impact evaluation, the test gate it must pass (per the profile-data-change runbook if it touches engine or data), and standing-rule checks. Write the spec in the project's IMPL-NNN style (goal / non-goals / design / engine or data changes / UI changes for web and iOS / test plan / rollout). An implementer should be able to start from it without me in the room.

Start by reading the ground-truth files, then work straight through to all seven deliverables.

---

## Maintenance note

Reusable Phase-1 review kickoff. Regenerate when ROADMAP status, standing rules, or Fable 5 prompting guidance materially change. Reference: [Fable 5 prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5) · [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking) (both are always-on / automatic inside Claude Code, so nothing to configure).
