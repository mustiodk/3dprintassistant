# Fable 5 — 3DPA Phase 2 Implementation Prompt (Share + Persist + Workshop, web + iOS v1.0.6)

**Created:** 2026-07-05 · **For:** Claude Code desktop, model **Fable 5** · **Mode:** autonomous implementation
**Source plan:** `docs/reviews/2026-07-05-fable5-phase1-review.md` (V2 addendum) + `docs/specs/IMPL-042-share-and-discover.md` + `docs/specs/IMPL-044-profiles-workshop.md`

In Claude Code desktop: open `~/dev/Claude/Projects/`, select model **Fable 5**, paste everything below the line as your first message.

---

You are running autonomously as the senior implementer for **3D Print Assistant (3DPA)**. I'm the owner: a solo hobbyist developer. Web is live at 3dprintassistant.com (Cloudflare Workers + Assets, auto-deploys from GitHub `main`); iOS is on the App Store (v1.0.4 live, v1.0.5 on TestFlight). On 2026-07-05 a Phase-1 review produced an approved plan; this session implements its high-value, app-layer slice: **web Share & Persist plus the Workshop (saved profiles + print journal), and a TestFlight-ready iOS v1.0.6 carrying the same capabilities.** The specs are written; an implementer should not need me in the room. Work end to end without checking in with me.

**Operating mode**
- You are operating autonomously. I am not watching in real time and cannot answer questions mid-task, so do not ask "want me to...?" For anything that follows from this prompt and the specs, proceed. Before ending your turn, check your last paragraph: if it is a plan, a question, or a promise of work you have not done yet, do that work now instead of ending.
- You have ample context. Do not stop, summarize and hand off, or suggest a new session on account of context limits. Continue until the ship sequence and wrap-up are complete.
- Iterate: implement, run the gates, fix what fails, re-run until green. Use subagents for independent strands (for example web codec tests while reading iOS AppState) but keep engine-adjacent decisions in your own context.
- Show the progress bar (`[🟩🟩⬜⬜⬜ 40%] step`) on every multi-step turn and keep it updated.

**Ground truth: read before writing any code, in this order**
1. `3dprintassistant/CLAUDE.md` (critical rules: engine/app separation, localStorage try-catch, staging discipline, TDD-RED breadcrumb convention)
2. `3dprintassistant/docs/3dpa-context.md` (architecture, engine API, app-state shape, standing rules)
3. `3dprintassistant/docs/specs/IMPL-042-share-and-discover.md` — Phases A+B are core scope; Phase C is stretch
4. `3dprintassistant/docs/specs/IMPL-044-profiles-workshop.md` — W1+W2 are core scope; W3/W4/W5 are OUT
5. `3dprintassistant/docs/reviews/2026-07-05-fable5-phase1-review.md` — read the V2 addendum for the why
6. `3dprintassistant/docs/planning/ROADMAP.md` + `docs/sessions/INDEX.md` + the last 3 session logs
7. iOS: `3dprintassistant-ios/` project docs and `Models/AppState.swift`, the Views tree, and the XCTest layout before touching Swift

**Scope: web (in this order, each item its own commit or commit series)**
1. **IMPL-042 Phase A** — state codec + localStorage session persistence (`3dpa_state_v1`), restore-on-init with unknown-id degradation, "Start over" affordance. TDD-first: codec round-trip test RED before the codec exists, per the repo's TDD-RED convention.
2. **IMPL-042 Phase B** — shareable profile URLs (query params, ids verbatim, `history.replaceState`), Share button next to Compare, copy-with-toast. URL params take precedence over localStorage; invalid ids degrade per Phase A.
3. **IMPL-044 W1** — Workshop view (nav pattern like Troubleshooter): save current configuration under a name into `3dpa_workshop_v1`, list/restore/rename/delete, per-profile Share (Phase B URL) , "Export my Workshop" / "Import" JSON backup file. Reuses the Phase A codec; one codec for URL, persistence, and profiles.
4. **IMPL-044 W2** — print journal: per-saved-profile outcome records (worked / failed with failure tags reusing `data/rules/troubleshooter.json` symptom ids), optional note, deep-link from a failed outcome into the troubleshooter with the symptom preselected.
5. **Hygiene ride-alongs** (each one commit): add the 2 missing Danish keys (`secNozzleTemp_prusaslicer`, `secBedTemp_prusaslicer`); fix the stale ROADMAP export status row (export is live for Bambu behind Beta, not disabled); align public printer-count copy with the actual count computed from `data/printers.json`.
6. **STRETCH, only if 1-5 are green with time to spare:** IMPL-042 Phase C landing-page generator + curated page set + sitemap + runbook regeneration step, exactly per the spec. If you start it, finish it or revert it clean; no half-landed generator.

**Scope: iOS (new version, target v1.0.6 — verify the current MARKETING_VERSION first and bump to the next patch/minor per its actual value)**
1. State persistence: persist the app-state as JSON in Application Support, restore on launch with the same unknown-id degradation rules as web (IMPL-042 section 6). No engine work: there is no engine or data delta in this entire session.
2. Workshop W1 in SwiftUI: saved profiles shelf, same JSON backup document format as web (that file is the cross-device story; make the formats byte-compatible and test that).
3. Workshop W2 (journal) if it lands cleanly in the same design language; if it threatens the timeline or quality, defer it explicitly and say so in the wrap-up.
4. Localized strings for everything new (English + Danish), matching web copy.
5. `MARKETING_VERSION` bump + xcodegen regeneration if the project uses it; full XCTest suite green via `xcodebuild`; UI smoke of the new surfaces in the simulator if the harness supports it.

**Hard boundaries**
- **Zero changes to `engine.js` or `data/` on either platform.** Everything in scope is app-layer by design; `node scripts/validate-data.js` and `node scripts/walkthrough-harness.js` passing unchanged is the proof, run them before your first commit and after your last. If any in-scope item genuinely seems to need an engine change, do not make it: document the conflict in the session log, skip that sub-item, continue with the rest.
- **No IMPL-043 export work.** Its Phase 0 needs golden fixture files exported from my real slicers, which only I can produce. Do not touch the export paths.
- **No IMPL-044 W3/W4/W5**, no tip jar, no universal links, no analytics changes beyond nothing.
- **Do not dispatch the TestFlight workflow.** Prepare everything; the dispatch is mine.

**Standing rules that bind every commit**
- engine.js / app.js separation is non-negotiable; codec, Workshop storage, and journal live in the app layer.
- TDD-first with the repo's RED-evidence convention (`3dprintassistant/CLAUDE.md`); new Node tests in the `scripts/picker-dry-run.test.js` style; new XCTests follow the existing patterns.
- One logical change = one commit; stage every touched file including index.html/style.css when structure changes.
- localStorage access always in try-catch; locale keys for all user-facing copy, English and Danish both; PARAM_LABELS stay English.
- Quality over speed: no narrowed scope to ship faster; if something must be cut, cut it whole and say so.

**Test gates (nothing ships without them)**
- Web: `node scripts/validate-data.js` and `node scripts/walkthrough-harness.js` green and byte-unchanged output vs. pre-session (engine untouched proof); all new codec/storage/Workshop tests green; UI smoke in light and dark themes via `npx serve -l 4200 .`.
- iOS: full XCTest suite green; build succeeds for the TestFlight configuration.
- Post-deploy (web): after pushing, `curl` the live site and one `?p=...&m=...` share URL, confirm 200 and that the page loads the app shell. Published is not delivered.

**Ship sequence**
- **Web:** push to `main` when the core scope (items 1-5) is green — auto-deploy handles the rest; then run the post-deploy checks. Stretch Phase C, if done, pushes separately after its own gate.
- **iOS:** commit locally throughout. Push to `origin main` ONLY when the full TestFlight-ready condition holds: all planned v1.0.6 changes landed, XCTest green, MARKETING_VERSION bumped. That push is the iOS push gate's "ready to ship" condition being met, per the standing rule. Then print the exact dispatch command for me (`gh workflow run testflight.yml --ref main` from the iOS repo) and STOP there; do not run it.

**Wrap-up (do all of it, then finish)**
- Session log at `3dprintassistant/docs/sessions/` per the documented convention (cowork-appdev type), INDEX prepend, ROADMAP updated (tick what shipped, note the W2-iOS decision either way, fix the stale export row as part of ride-along item 5).
- Final plain-language summary: what shipped on web (with live verification evidence), what the iOS v1.0.6 build contains, every commit hash, and my exact remaining manual actions (TestFlight dispatch command; IMPL-043 Phase 0 golden-file homework list if you want to hand it to me; Search Console submission only if Phase C ran).

Start by reading the ground-truth files in order, then implement straight through: web A, B, W1, W2, hygiene, then iOS, then ship sequence, then wrap-up.

---

## Maintenance note

One-shot implementation kickoff for the 2026-07-05 Phase-2 slice. Superseded once the session runs; if re-run after partial completion, prepend a "state check first" instruction to diff actual repo state against the scope list before implementing.
