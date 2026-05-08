# Completed milestones, legacy backlog ID index, and research/prompts index

> Historical archive extracted from `docs/planning/ROADMAP.md` during the 2026-05 ROADMAP slimming pass.
> Live planning now lives in [`../ROADMAP.md`](../ROADMAP.md); this file preserves completed-phase narrative, legacy backlog ID traceability, and the historical research/prompts lookup table.

---

## Completed phases (chronological)

| Phase | What | When |
|-------|------|------|
| Phase 0 | Foundation — Xcode, engine bridge, models, tests | 2026-04-03 |
| Phase 1a | Data layer + engine extensions | 2026-04-03 |
| Phase 1b | All UI screens | 2026-04-03 |
| Phase 1 wrap | Merged to main | 2026-04-03 |
| Phase 2 | Output enrichment — warnings, checklist, simple/advanced, filament info | 2026-04-03 |
| Phase 3 SoT | Source-of-truth fixes — dynamic options, label/casing fixes | 2026-04-03 |
| Phase 2.5 | 18 materials, 10 engine improvements, speed-temp coupling | 2026-04-04 |
| Phase 2.5b | 5 nozzles, 6 advanced filters, 7 engine logic, simple/advanced input | 2026-04-05 |
| Phase 2.7a | Export functions (engine + iOS + web) — web UI disabled pending BS fix | 2026-04-05 |
| Infra | App icon, auto build number, TestFlight, CI/CD, Sentry, Discord, GitHub Issues | 2026-04-04 |
| Web | iOS Beta signup wording updated, about/SEO updates | 2026-04-04…08 |
| Phase 1 release blockers (RB-1…6) | Structured warnings, actor bridge, Sentry DSN, error handling, 18 tests, OutputView split | 2026-04-08 |
| Pre-release polish (BR-1…7) | Strings, export filenames, dark mode, retry UX, AppConstants, OutputView split, privacy | 2026-04-08 |
| App Store prep | CI fixed (SENTRY_DSN secret), export UI hidden, 9 screenshots taken, metadata finalized, /support + /privacy pages live | 2026-04-08 |
| Web bug fixes | Printer picker stays collapsed on mode switch | 2026-04-08 |
| CI cleanup | macos-26 runner, checkout@v5, Config.xcconfig.template, Xcode Cloud deleted | 2026-04-10 |
| Branding | App icon (clay Benchy), logo on web header + iOS home + all nav bars, website link on iOS home, OutputView nav bar cleanup | 2026-04-13 |
| BR-10 Cross-device UI review | UITest target + 33 screenshots across SE/17 Pro/17 Pro Max, 4 P0/P1 fixes (segmented control wrap, nav bar truncation, sticky checklist footer), App Store screenshots retaken. iOS commit `cbf0947`, web commit `bccfca4` | 2026-04-14 |
| BR-11 Feedback system | Native SwiftUI feedback sheet → Discord webhook (#3dpa-ios-feedback). 7 categories, 8 entry points, auto-attached device metadata, 9 new tests. iOS commits `5a5624a` → `ddb1416` (incl. SF symbol picker fix, alert visibility fix). Manual: `DISCORD_FEEDBACK_WEBHOOK` added to GitHub secrets | 2026-04-15 |
| BR-12 Empty-output hardening | OutputViewModel guard + scoped per-screen tap-1 reset. Final iteration after 2 over-corrections. iOS commits `a81281c` → `15c49da`. 5 new tests | 2026-04-15 |
| Pre-submission polish | Print Profile tab description double-render fix (`1a96f83`); BrandPicker default un-preselected (`f87b095`); Printer/Nozzle picker tap-1 now clears local `selectedId` checkmark (`f87b095`) | 2026-04-15 |
| App Store screenshots refresh | Recaptured on iPhone 17 Pro Max (1320×2868) post-BR-11 to show new feedback UI. Old set in `_backup-apr14/`. Web commit `02edd2f` | 2026-04-15 |
| App Store Connect submission setup | App Information + categories + age 4+ + content rights + pricing (Free, all 175 countries) + privacy nutrition (Diagnostics only) + v1.0 metadata + 9 iPhone 6.9" screenshots uploaded + build `202604151712` attached. Pending at the time: iPad screenshots from real device + Add for Review | 2026-04-15 |
| 🚀 **App Store submission** | Build `f87b095` attached, fresh iPhone + iPad screenshots uploaded, App Review Information + Notes filled, Manual release selected, **submitted to App Review**. Status: "Waiting for Review". 13 days ahead of April 28 deadline | 2026-04-15 |
| ✅ **App Store APPROVED + released** | App approved same-day after ~24h review. Hit Release. Live in ~121 non-EU countries. EU blocked by DSA Trader Status — submitted as Business (CVR) same day. Generic link: `apps.apple.com/app/3d-print-assistant/id6761634761` | 2026-04-16 |
| **Discord server restructure** | Added `#announcements` (read-only), private `📥 owner inbox` category with `#ios-app-feedback` (renamed from `#3dpa-ios-feedback`) + new `#web-app-feedback`. iOS feedback webhook URL preserved through rename (Discord webhooks are channel-id-bound). Channel descriptions written for all 11 channels. Beta category deleted post-release. | 2026-04-16 |
| **Web feedback Tally→Discord migration** | Replaced Tally (obdMK1 form) with native `<dialog>` modal + Cloudflare Worker at `/api/feedback` forwarding to Discord `#web-app-feedback`. Mirrors iOS 7-category taxonomy + embed shape exactly. Secret `DISCORD_WEBHOOK_URL` stored in Cloudflare Pages env vars (not in bundle). Required adding `wrangler.toml` + `worker.js` because project had been migrated to Workers Builds (static-assets-only → assets+worker). 3 commits: `331124b` (dormant stack), `36f9131` (Worker entrypoint), `3856440` (card swap). Verified end-to-end via curl. | 2026-04-17 |
| **Web warnings bugfix — RB-1 engine completion** | Production rendered "undefined" for every warning card. Root cause: `app.js` `renderWarnings()` was updated during RB-1 to expect structured objects `{ id, text, detail, fix }`, but the matching `engine.js` conversion (114-line diff, all 33 `warnings.push(...)` sites wrapped in the `w(id, text, detail, fix)` helper) was only saved locally and never committed — so live `engine.js` kept returning HTML strings. Committed the pre-existing uncommitted diff. `82e10ac`. Verified: zero remaining old-shape string pushes on production. | 2026-04-19 |
| **Draft layer height 0.30 → 0.28** | Bambu Studio rejected imported profiles on 0.4mm nozzle ("Layer height exceeds limit"). Bambu's printer-level max for 0.4mm = 0.28mm, not 0.30mm (confirmed in vendor preset JSONs: `max_layer_height: ["0.28"]`). Changed Draft `layer_height` in `objective_profiles.json` from 0.30 → 0.28, tightened C3 warning threshold 75% → 70% (with floating-point epsilon so `0.4*0.70` doesn't trip on its own output), updated troubleshooter fix text. Surfaced backlog #039 (printer-capability clamping). | 2026-04-19 |
| **IMPL-039 shipped — printer-capability clamping + slicer-aware values** | Full engine refactor per [IMPL-039 spec](../../specs/IMPL-039-preset-clamping.md). New engine helpers (`getPrinterLimits`, `_clampNum`, `mapForSlicer`, `patternFor`); new data file `data/rules/slicer_capabilities.json`. Fixes 2 HIGH bugs (`support_interface_pattern` now emits Bambu's canonical `rectilinear_interlaced`; `initial_layer_height` scales with nozzle). Retraction nozzle-scaled and auto-bowden for MINI+/other bowden printers. 32/32 iOS tests pass. Bambu export byte-matches vendor preset format across all 5 canonical combos. | 2026-04-20 |
| **3rd-party code + data review dispatched** | Self-contained starter kit at `docs/3rd-party-review/` (6 docs). Reviewed revisions: web `c4c5071`, iOS `24aef66`. | 2026-04-20 |
| **IMPL-040 shipped — chip desc / resolveProfile single source of truth** | Spec: [IMPL-040](../../specs/IMPL-040-chip-desc-parity.md). Stripped numeric prefixes from surface + strength descs; extended `Engine.getFilters(state?)` to generate numeric prefixes from same clamping/data sources `resolveProfile` uses; unified support Z-gap into module-scoped `_SUPPORT_GEOMETRY`. Two new XCTests; 20/20 pass. | 2026-04-20 |
| **iOS v1.0.2 ship** (IR-2a) | See [`2026-04-internal-review-tracker.md § IR-2a`](2026-04-internal-review-tracker.md). Released 2026-04-24, ~121 non-EU countries. | 2026-04-24 |
| **DQ-1 + DQ-2 shipped** | Provenance infrastructure + Safe/Tuned `profileMode` toggle. See [`2026-04-release-readiness-history.md § DQ-1 / DQ-2`](2026-04-release-readiness-history.md). Phase DQ 0/5 → 2/5. | 2026-04-24 |
| **EU unblock** | DSA Trader Status approved; App Store now live worldwide. | 2026-04-27 |
| **PR-8 — iOS Beta signup card retired** | See [`2026-04-release-readiness-history.md § PR-8`](2026-04-release-readiness-history.md). | 2026-04-27 |
| **AI Operating Model pilot v1 shipped** | 4-round multi-tool review produced `docs/ai-collab.md` (operating-model v1). Branch `ai/operating-model-pilot`. End-of-pilot decision target 2026-05-14. | 2026-04-30 |
| **v1.0.3 batch items 1 + 3 shipped** | Item 1: Kobra X correction + Centauri Carbon. Item 3: iOS App Store review prompt (6 Codex passes + 1 Gemini pass). MARKETING_VERSION 1.0.2 → 1.0.3 + TestFlight dispatched. iOS 64/64 XCTest. | 2026-05-08 |

---

## Legacy backlog ID index (`#001–#036`)

Preserved for traceability of historical references. The pre-ROADMAP `BACKLOG.md` (last real content: web commit `103ab84`, 2026-04-03, 309 lines) is archived at [`../../../../_archive/3dprintassistant-BACKLOG-legacy-2026-04-03.md`](../../../../_archive/3dprintassistant-BACKLOG-legacy-2026-04-03.md). Every ID is either shipped, active in the live ROADMAP, or explicitly dropped.

### Shipped

| # | What | Shipped |
|---|---|---|
| #002 | Match Bambu Studio process-tab structure | 2026-04-02 |
| #008 | Expanded warning explanations (now structured `{id, text, detail, fix}` — shipped as RB-1) | 2026-04-08 |
| #009 | Orca slicer layout support | 2026-04-03 |
| #013 | Pre-print checklist panel | 2026-04-03 |
| #014 | Mobile layout improvements | 2026-04-03 |
| #023 | Analytics — Cloudflare Web Analytics | 2026-04-01 |
| #024 | SEO optimization | 2026-04-01 |
| #025 | Roadmap modal in footer | 2026-04-01 |
| #027 | Slicer-aware tab structure (Bambu + Prusa) | 2026-04-02 |
| #028 | TPU 85A / 90A print + support guidance | 2026-04-02 |
| #030 | i18n locale extraction to `locales/*.json` | 2026-04-03 |
| #031 | JSON schema validation script | 2026-04-03 |
| #017 | Profile export to Bambu Studio `.json` — engine done; UI hidden pending BS import fix. Tracked under Phase 2.7a in slim ROADMAP Deferred. |
| #039 | Printer-capability clamping + slicer-aware values — IMPL-039 shipped 2026-04-20. |

### Active in live ROADMAP

`#001, #005, #006, #010, #011, #012, #015, #016, #018, #019, #020, #022, #026, #029, #032, #033, #034, #035, #036, #037, #038` — see [`../ROADMAP.md`](../ROADMAP.md) Active Work Queue / Deferred / Backlog.

### Dropped / superseded

- `#003` Copy individual setting value — superseded by full profile share/export flow.
- `#004` Copy all settings as formatted text — superseded by `formatProfileAsText` + iOS share sheet.
- `#007` Auto dark mode — superseded by the existing web theme toggle (`☀`) + the iOS v1.1 light-mode backlog item.
- `#021` HTML print sheet — superseded by `formatProfileAsText` + share/export flow on both platforms.

---

## Research & prompts index (historical)

All research, spec, and prompt docs live under `3dprintassistant/docs/`. Subfolders: `research/`, `prompts/`, `specs/`, `planning/`. Recent docs (Gemini handovers, Codex review packets, IMPL-041, etc.) are not duplicated here — discover them via the directory listing or via the live ROADMAP / session logs.

| File | What | Location |
|------|------|----------|
| Bambu Studio export spec (Gemini analysis) | Primary BS JSON reference | `docs/research/bambu-studio-export-spec-gemini.md` |
| Bambu Studio JSON schema | Field reference from GitHub source | `docs/research/bambu-studio-json-schema.md` |
| Gemini analysis prompt | Prompt used to analyze BS exports | `docs/research/gemini-bambu-analysis-prompt.md` |
| ChatGPT code/release review | 21-item iOS review (all items resolved before v1.0 ship) | `docs/research/3dprintassistant_ios_master_release_review.md` |
| UI critique | Design review findings | `docs/research/UI-CRITIQUE.md` |
| #036 implementation spec | Data architecture + value correctness | `docs/specs/IMPL-036-profile-params.md` |
| UI v2 spec | Prototype v2 design spec | `docs/specs/UI-V2-SPEC.md` |
| Phase 2.7a export prompt | Claude Code prompt (needs rewrite after #036) | `docs/prompts/phase-2.7a-export-prompt.md` |
| Phase 2.7b descriptions prompt | Claude Code prompt (completed) | `docs/prompts/phase-2.7b-descriptions-prompt.md` |
| Phase 2.5b prompt | Claude Code prompt (completed) | `docs/prompts/phase-2.5b-code-prompt.md` |
