# Fable 5 — 3DPA Phase 2 Implementation Prompt (Share + Persist + Workshop, web + iOS v1.0.6)

**Created:** 2026-07-05 · **For:** Claude Code desktop, model **Fable 5** (resumable by any model) · **Mode:** autonomous, gated implementation
**Source plan:** `docs/reviews/2026-07-05-fable5-phase1-review.md` (V2 addendum) + `docs/specs/IMPL-042-share-and-discover.md` + `docs/specs/IMPL-044-profiles-workshop.md`
**Gate ledger (source of truth for progress):** `docs/planning/PHASE2-GATE-LEDGER.md`

In Claude Code desktop: open `~/dev/Claude/Projects/`, select model **Fable 5**, paste everything below the line as your first message. The same prompt can be pasted into a fresh session with **any** model to resume if a previous run stopped.

---

You are running autonomously as the senior implementer for **3D Print Assistant (3DPA)**. I'm the owner: a solo hobbyist developer. Web is live at 3dprintassistant.com (Cloudflare Workers + Assets, auto-deploys from GitHub `main`); iOS is on the App Store (v1.0.4 live, v1.0.5 on TestFlight). On 2026-07-05 a Phase-1 review produced an approved plan. This session implements its high-value, app-layer slice — web Share & Persist plus the Workshop (saved profiles + print journal), and a TestFlight-ready iOS v1.0.6 — **as a series of atomic gates**, so the work survives being stopped and resumed.

**This is gated, token-budget-aware work.** My Fable token budget is limited and this session may stop before finishing. That is expected and safe: the work is divided into gates that each end at a clean committed (web: pushed) boundary. The gate ledger at `docs/planning/PHASE2-GATE-LEDGER.md` is the single source of truth for what is done. Never depend on conversation history to know where you are; depend on the ledger and `git log`.

**GATE 0 — orient and resume (always first)**
1. Read `docs/planning/PHASE2-GATE-LEDGER.md` fully. Follow its "Resume protocol" section exactly.
2. Run `git status`. If the tree is dirty, a previous gate did not finish: `git stash`, inspect, then discard the stash and re-run that gate from the clean boundary. Do not build on partial work.
3. The first gate with an unchecked box is your entry point. If W0/I0 are unchecked, start there (baseline). If mid-way, resume at the first unchecked gate.
4. You may be Fable or a different model resuming a stopped run. Either way, the ledger + specs + repo are self-sufficient; proceed without me.

**Operating mode**
- Autonomous. I am not watching and cannot answer mid-task, so do not ask "want me to...?" Proceed on anything that follows from the ledger and specs. Before ending a turn, if your last paragraph is a plan/question/promise, do that work instead of ending — unless you are stopping at a clean gate boundary because you judge the budget is running low, which is allowed and correct.
- Work one gate at a time to completion. Finishing a gate = meeting its exit criteria + committing (web: + pushing) + ticking its ledger box and writing the commit hash **in that same final commit**, so the tick and the code are atomic. This is the property that makes stopping safe.
- Be economical: the budget is finite. Don't re-read files you've read this session, don't over-explain, let the gates and commits be the record. Use subagents for genuinely independent strands (e.g. web codec tests while reading iOS AppState).
- Show the progress bar (`[🟩🟩⬜⬜⬜ 40%] step`) on every multi-step turn.

**Ground truth — read at Gate W0 (web) and Gate I0 (iOS), in order**
1. `3dprintassistant/CLAUDE.md` (engine/app separation, localStorage try-catch, staging discipline, TDD-RED convention)
2. `3dprintassistant/docs/3dpa-context.md` (architecture, engine API, app-state shape, standing rules)
3. `3dprintassistant/docs/specs/IMPL-042-share-and-discover.md` (Phases A+B) and `docs/specs/IMPL-044-profiles-workshop.md` (W1+W2 only)
4. `3dprintassistant/docs/planning/ROADMAP.md` + `docs/sessions/INDEX.md` + the last 3 session logs
5. iOS (at I0): `3dprintassistant-ios/` docs, `Models/AppState.swift`, the Views tree, the XCTest layout

**The gates** — full detail, exit criteria, and status live in `docs/planning/PHASE2-GATE-LEDGER.md`. Summary of the sequence:
- **W0** baseline (capture validate-data + walkthrough output; confirm clean, pushed).
- **W1** IMPL-042 Phase A: persistence codec + tests + restore + start-over.
- **W2** IMPL-042 Phase B: share URLs + Share button + precedence.
- **W3** IMPL-044 W1: Workshop shelf (save/list/restore/rename/delete) + JSON backup export/import.
- **W4** IMPL-044 W2: print journal + troubleshooter deep-link.
- **W5** hygiene ride-alongs (Danish keys; stale ROADMAP export row; printer-count copy) — one commit each.
- **W6** web ship verification (curl live site + one share URL).
- **I0** iOS baseline. **I1** persistence. **I2** Workshop shelf (byte-compatible backup). **I3** journal (conditional; defer cleanly if it risks quality). **I4** localize + version bump + full XCTest + TestFlight-config build. **I5** iOS ship: push `main`, print dispatch command, stop.
- **S1** (stretch) IMPL-042 Phase C landing pages — only if all above green with budget left; whole or reverted clean.
- **WRAP** session log, INDEX, ROADMAP, memory/vault sweep, final summary.

Web gates commit **and push** at each boundary (auto-deploy is fine; these are docs- and app-layer). iOS gates commit **locally only** through I4; the single iOS push is I5, which is the push-gate "ready for TestFlight" condition being met.

**Hard boundaries**
- Zero changes to `engine.js` or `data/` on either platform. Everything in scope is app-layer. If an item seems to need an engine change, do not make it: record it in the ledger Notes, skip that sub-item, continue.
- No IMPL-043 export work (its Phase 0 needs golden files only I can produce). Do not touch the export paths.
- No IMPL-044 W3/W4/W5, no tip jar, no universal links, no analytics changes.
- Do not dispatch the TestFlight workflow. Prepare it; the dispatch is mine.

**Standing rules that bind every commit**
- engine.js / app.js separation is non-negotiable; codec, Workshop storage, journal all live in the app layer.
- TDD-first with the repo's RED-evidence convention; new Node tests in the `scripts/picker-dry-run.test.js` style; new XCTests follow existing patterns.
- One logical change = one commit; stage every touched file including index.html/style.css.
- localStorage in try-catch; new copy gets English + Danish keys; PARAM_LABELS stay English.
- Quality over speed: never narrow scope to ship faster; if something must be cut, cut it whole and record it in the ledger.

**Test gates (a gate is not "done" until these pass for its scope)**
- Web: `node scripts/validate-data.js` and `node scripts/walkthrough-harness.js` green and output unchanged vs. W0 baseline (engine-untouched proof); all new codec/storage/Workshop tests green; UI smoke in light and dark themes via `npx serve -l 4200 .`.
- iOS: full XCTest green; build succeeds for the TestFlight configuration.
- Post-deploy (web, Gate W6): after pushing, `curl` the live site and one `?p=...&m=...` share URL; confirm 200 and the app shell loads. Published is not delivered.

**Wrap-up (Gate WRAP — run before finishing, even a partial session)**
- Update the ledger Notes with where you stopped and anything a resuming model needs.
- Session log at `docs/sessions/` (cowork-appdev), INDEX prepend, ROADMAP tick + confirm the stale export row is fixed.
- Final plain-language summary: what shipped on web (with live verification evidence), what iOS v1.0.6 contains, every commit hash, and my exact remaining manual actions (TestFlight dispatch command; IMPL-043 Phase 0 golden-file homework list; Search Console submission only if S1 ran).

Start at Gate 0: read the ledger, determine your entry point, then execute gates in order to completion, stopping only at a clean gate boundary.

---

## Maintenance note

Gated, resumable implementation kickoff for the 2026-07-05 Phase-2 slice. Progress is tracked in `docs/planning/PHASE2-GATE-LEDGER.md` (the durable resume surface); this prompt is stable across resumes and can be re-pasted into any model's session. Superseded when all gates including WRAP are checked.
