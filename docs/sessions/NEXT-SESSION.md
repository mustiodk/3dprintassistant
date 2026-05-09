# Next session — cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-09 after analytics dashboard UX/platform-lens work. v1.0.3 batch is still 3/5 shipped; submitted build includes PLA Metal + iOS output-mode analytics parity; items 2 / 5 pending.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — v1.0.3 follow-on

## Project at a glance

**3D Print Assistant** generates optimised slicer profiles based on **printer x material x nozzle x user goals x environment**. Two surfaces, one engine:

- **Web** (`3dprintassistant/`) — live at [3dprintassistant.com](https://3dprintassistant.com). Cloudflare Workers/Assets deploys from `main`; Worker routes `/api/feedback`, `/api/analytics`, and `/api/analytics-query`.
- **iOS** (`3dprintassistant-ios/`) — v1.0.2 live worldwide on App Store. v1.0.3 was submitted to App Review on 2026-05-09; submitted build is run [`25596797349`](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25596797349), build `202605090842`, including PLA Metal + iOS output-mode analytics parity.

Web is master; iOS mirrors. Every engine/data change -> copy byte-identical to iOS -> `node scripts/walkthrough-harness.js` -> iOS XCTest -> commit both sides.

For full project context: READ FIRST -> `docs/3dpa-context.md` (canonical evergreen — architecture, engine API, app state shape, slicer routing, standing rules).

## Current state (2026-05-09)

**v1.0.3 batch is 3/5 shipped.** Items 1 + 3 + 4 are in production / App Review. Items 2 / 5 still pending.

**Additional shipped work since the batch snapshot:**
- **PLA Metal** added to web + iOS as additive v1.0.3 build. Evidence came from Bambu vault sources (`50-Wiki/raw/3dpa/bambu/filament/`). Treat Bambu PLA Metal as AMS-compatible PLA, not hardened-nozzle metal-filled composite.
- **Analytics dashboard** live at `/analytics`, admin-token protected, querying Cloudflare Workers Analytics Engine dataset `3dpa_usage_v1`.
- **Profile analytics expanded** with `outputMode` (`simple` / `advanced`) on web + iOS.
- **Analytics dashboard UX refined**: `/analytics` is now an owner dashboard with KPI strip, Owner Readout, Release Health, Usage Journey, product signals, diagnostics, and Product lens (`All` / `Web` / `iOS`). `All` shows Web and iOS side by side; `Web` and `iOS` filter the whole dashboard. Diagnostics show iOS app version in the platform label (for example `iOS 1.0.3`) and are mobile-friendly.
- **App Store submission source is archived** in `../3dprintassistant-ios/docs/app-store-v1.0.3-submit.md`: final What's New text, Promotional Text, App Privacy Product Interaction answers, review notes, and submitted-for-review status.
- **Workers Assets hygiene fixed:** `/.git`, `/.claude`, and `/.wrangler` hard-blocked; `.assetsignore` excludes internal paths. Live `/.git/config` verified `404`.

**Branch state:**
- Web `main` is active and clean after commits `eb66b18`, `e9ed6b9`, `5c60549`, plus close-docs commit if present.
- Web `ai/operating-model-pilot` is retired operationally. Its useful artifacts were promoted to `main`; do not start new work there.
- iOS `main` has v1.0.3 product code + analytics + PLA Metal + output-mode analytics parity and was pushed.

**iOS push gate:** still active for future builds. Before future TestFlight dispatches, explicitly decide whether the change is a same-marketing-version build or requires `MARKETING_VERSION` bump + `xcodegen generate`.

## Files to read in order (per Trigger C 3dpa read order)

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — top-level lifecycle rules.
2. `3dprintassistant/CLAUDE.md` — 3dpa project rules.
3. `3dprintassistant/docs/3dpa-context.md` — canonical evergreen project context.
4. `3dprintassistant/docs/planning/ROADMAP.md` — live planning surface.
5. `3dprintassistant/docs/sessions/INDEX.md` — top 5 entries.
6. `3dprintassistant/docs/sessions/2026-05-09-cowork-appdev-analytics-dashboard-ux.md` — latest analytics dashboard UX session, full read.
7. `3dprintassistant/docs/sessions/2026-05-09-cowork-appdev-ios-analytics-app-store-submit.md` — App Store / iOS analytics session, full read.
8. `3dprintassistant/docs/sessions/2026-05-09-cowork-appdev-pla-metal-and-analytics-dashboard.md` — PLA Metal + first analytics dashboard session, full read.
9. If choosing environments: `3dprintassistant/docs/research/gemini-environments-taxonomy-research.md`.
10. If choosing tool-routing / review support: `3dprintassistant/docs/ai-collab.md`.

**Historical lookup only — don't read by default:** `3dprintassistant/docs/planning/archive/`; `3dprintassistant/codex/roadmap-slim-and-lifecycle/`; older v1.0.3 planning/session logs unless the active task asks for them.

## First action

1. Read files above in order. Confirm understanding in 3-5 bullets.
2. Recommend the next lane. Current best first lane: **v1.0.3 App Store follow-through**, because the submitted build is waiting on App Review.
3. If owner wants product work instead, likely choices:
   - **v1.0.3 App Store follow-through:** monitor review status for build `202605090842`; release manually when approved.
   - **Item 5 — web output-panel UX:** start with a quick UX audit/scope note; do not implement blindly from the vague roadmap phrase.
   - **Item 2 — environments taxonomy:** hand `gemini-environments-taxonomy-research.md` to Gemini; triage response; implement web+iOS.
   - **Analytics observation:** open `/analytics` after traffic accumulates; use Product lens to inspect Web and iOS independently; ignore setup-test rows from 2026-05-09.
4. Progress-bar anything 3+ steps.

## Standing rules (binding)

- Progress bar on every multi-step task (`[🟩🟩⬜⬜⬜ 40%]`) — owner explicit.
- Direct recommendations, no options-list sprawl.
- ROADMAP is live planning truth; architecture lives in `docs/3dpa-context.md`; historical detail in `docs/planning/archive/`.
- One finding = one commit per platform.
- Web is master, iOS mirrors (`cp` byte-identical -> walkthrough -> XCTest after every engine/data change).
- iOS push gate: no iOS push/TestFlight dispatch without reconciling all gate conditions and same-version vs version-bump intent.
- No-guessing: read the actual file before claiming behaviour.
- Source-or-null rule for research handovers.
- Wiki-pages-as-primary-source workflow for Apple/manufacturer JS-SPA pages.
- Provenance everywhere on `resolveProfile` emissions.
- Data/logic-change evaluation mandatory: every change mentions web + iOS UI implications.
- Cross-AI review is optional and risk-based; use `docs/ai-collab.md` for tool routing.
- Cloudflare Workers Assets hygiene: never deploy internal directories; verify `/.git/config` stays `404` after Worker/Assets deploy changes.

## Open questions to surface to owner early

- **App Store release status** — v1.0.3 was submitted to App Review on 2026-05-09; monitor review and release manually when approved.
- **TestFlight QA** — latest run `25596797349`, build `202605090842`: PLA Metal visible + sane; review prompt suppressed; Kobra X / Centauri visible; analytics invisible; iOS generated-profile analytics includes output mode after Simple/Advanced toggles.
- **v1.0.3 remaining items** — item 2 environments taxonomy and item 5 web output-panel UX remain.
- **Analytics test rows** — early dashboard includes setup rows from 2026-05-09; use Product lens when interpreting Web vs iOS signals.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol. A stale file between sessions is acceptable.
