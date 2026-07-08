# iOS v2 Rebuild — Gated Master Implementation Plan

> **For agentic workers:** execute ONE GATE per session. At gate entry, author that gate's micro-plan at `superpowers:writing-plans` granularity (exact files, failing tests first, code, commands, commits) in `docs/superpowers/plans/ios-v2/gate-N-<name>.md`, then implement via `superpowers:executing-plans` / `superpowers:subagent-driven-development`. This master plan deliberately stays at gate granularity: code-level steps written today for gates weeks out would be stale and unreviewable — each gate's micro-plan is written against the branch as it actually exists, then hostile-reviewed before code.

**Goal:** Build 3dpa-ios v2.0.0 — an improved copy of the shipped iOS app: web feature parity (native Mine learns-loop, troubleshooter, journal, outbound share, estimators, DA), rebuilt architecture (EngineCore/EngineAPI split, @MainActor state, feature folders, uniform errors), and owner-bar UX (motion system, a11y, refined wizard) — replacing v1.0.x on the App Store.

**Architecture:** Per design spec D0–D7 + sub-decisions D1a/D5a/D5b/D5c (`docs/superpowers/specs/2026-07-08-ios-v2-rebuild-design.md`). Hybrid rebuild on branch `ios-v2` in the existing repo, same bundle id, engine/data byte-identical and untouched, learns layer via JSCore.

**Tech stack:** SwiftUI (iOS 17), JavaScriptCore, XcodeGen, XCTest, String Catalogs, fastlane/TestFlight (existing chain).

**Spec:** `docs/superpowers/specs/2026-07-08-ios-v2-rebuild-design.md` · **Audit:** `docs/reviews/2026-07-08-ios-v2-rebuild-audit.md` · **Review dispositions:** `docs/reviews/2026-07-08-ios-v2-rebuild-review.md`

---

## Standing execution protocol (every gate, every session)

1. **Cold start** per Trigger C (3dpa read order) + read this plan + the gate ledger `docs/planning/IOS-V2-GATE-LEDGER.md` (web repo — pushed, cross-machine visible).
2. **Machine prerequisites** (halt and surface if any fail): `Config.xcconfig` present (recreate from gitignored template — empty values OK for sim tests), Xcode + an iOS simulator available (`xcodebuild -showsdks`), `ios-v2` branch present locally (else `git fetch origin ios-v2` per D1a; if it exists nowhere, this is G1 or something is wrong — stop).
3. **Sync sweep (both drift directions), ledger-recorded:**
   a. **Web-master drift:** byte-diff bundled `engine.js`, `data/materials.json`, `data/nozzles.json`, `data/rules/`, and mirrored JS modules (`workshop-tuning.js`, `workshop-tuning-rules.js`, `state-codec.js` once mirrored) against web `main`. **`printers.json` is EXCLUDED — it differs by design** (iOS bundles a baseline; the remote overlay delivers newer printers): new web printers reach v2 users via the existing overlay path during the rebuild; a bundle graduation + overlay republish (Part-C-aware validator + runbook Phase 4b) is evaluated once at G8 entry. If any in-scope file drifted → mirror-sync as the gate's FIRST commit (web is master), re-run full suite, record the synced web SHA in the ledger.
   b. **iOS main hotfixes:** `git log <last-synced-main-sha>..main --oneline` (SHA column in ledger). Any hits → diff-driven re-application (cherry-pick will NOT apply post-G1 restructure), each verified by the relevant tests, ledger row updated.
4. **Baselines:** full unit suite green on `ios-v2` before touching code — `xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant -destination "platform=iOS Simulator,name=<installed sim>" -skip-testing:3DPrintAssistantUITests CODE_SIGNING_ALLOWED=NO` (pin the exact sim name in the ledger at G1); web-side (run in the web repo): `node scripts/engine-golden-snapshot.js --check` clean + `node scripts/state-codec.test.js` + `node scripts/workshop-store.test.js` + `node scripts/workshop-tuning.test.js` + `node scripts/workshop-tuning-rules.test.js` all green (the non-engine contract harnesses; Codex M-2).
5. **Gate micro-plan** (writing-plans granularity) → hostile fresh-context sub-agent review → patch → then code.
6. **TDD RED-first** per repo convention (incl. TDD-RED breadcrumb rules for degenerate mirror-test REDs).
7. **Test-evolution rule (post-G1):** migrated tests may be rewritten only with equivalent-or-stronger assertions; every such change enumerated in the gate's ledger row.
8. **String rule (post-G6):** any gate adding UI strings adds EN+DA String Catalog entries and flags the DA copy in its screenshot packet.
9. **Gate exit:** full XCTest suite + byte-compat fixtures green → hostile fresh-context sub-agent review of the gate diff → patch (one finding = one commit) → QA green → tick the gate ledger → local commits → **push `ios-v2` to origin** (D1a default; skip only if owner overrode at G0, then record the accepted risk).
10. **UI gates additionally:** extend/repair `ScreenCaptureUITests` for the surfaces this gate touched (it generates the screenshot packet — a broken harness blocks the gate's own exit); produce the packet + a one-page "what changed" note for async owner review; owner feedback lands as patch commits at the next gate boundary (non-blocking).
11. **Cross-model review** (bridge --health → `bridge --mode codex-only`, direct `codex exec -s read-only` fallback): mandatory at G1 exit and G8 entry; optional elsewhere when a gate turns out riskier than expected.
12. Wrap each session per Trigger A; regenerate NEXT-SESSION with the current gate + next entry point.

## Gate map

| Gate | Scope | Owner needed? | Est. sessions |
|---|---|---|---|
| **G0** | Spec ratification (D0–D7, D1a/D5a/D5b/D5c) + ledger creation | **YES** (async read) | — |
| **G1** | Foundation: branch, restructure, EngineCore/EngineAPI, @MainActor AppState, design-system tokens, test migration (≥135 floor), v1→v2 upgrade fixture, perf baselines | no | 2 |
| **G2** | Configurator rebuild (wizard, pickers, goals, motion + a11y baked in) | screenshots async | 1–2 |
| **G3** | Output rebuild + print-time estimator + purge calculator + `export_clicked` parity | screenshots async | 1–2 |
| **G4** | D5a store spike → troubleshooter + journal (new surfaces) + `troubleshoot_used` parity | no | 1–2 |
| **G5** | Native Mine loop: JSCore harvest + suggestions UI + outbound share (D5c) | no | 1–2 |
| **G6** | i18n EN+DA (String Catalogs, engine lang sync) | DA copy async | 1 |
| **G7** | Polish pass: motion audit, haptics, Dynamic Type/VoiceOver/Reduce Motion sweep, perf vs G1 baseline | screenshots async | 1 |
| **G8** | Release train: 2.0.0, TestFlight from branch, acceptance, merge, App Store | **YES** (heavy) | 1 + owner time |

Sequencing is strict G1→G8 except G6 may move earlier only together with its string rule (protocol step 8). **Honest envelope: 10–15 sessions** (8–12 optimistic; drift events and G3/G5 discovery add unbudgeted work — ledger tracks slip).

## Gate details

### G0 — Owner ratification (the only pre-code human step)
Owner reads spec §2 and replies GO or overrides specific decisions (each independently overridable; D1a branch push and D5b rules-freeze are the two most consequential defaults). **Create `docs/planning/IOS-V2-GATE-LEDGER.md` now** (empty-first discipline) with the ratification row + columns: gate, entry date, synced-web-SHA, last-synced-main-SHA, suite count, exit review verdict, commits, notes. **Exit:** recorded GO (or amended decisions) in the ledger.

### G1 — Foundation (the architecture gate, 2 sessions budgeted)
- Create `ios-v2` branch from current `main`; tag `ios-v2-baseline`; record both SHAs in ledger; push branch (D1a).
- Restructure into feature folders (git-tracked renames), **updating `project.yml` source/resource/Info.plist paths + `xcodegen generate` after each move batch** (resource paths are hardcoded: `Engine/engine.js`, `Data/*.json`, `Resources/*.lproj`).
- `EngineBridge/`: `EngineCore.swift` (JSContext lifecycle, serial queue, ExceptionStore, polyfills, **continuation-based readiness** replacing sleep-polling) + `EngineAPI+Profile/Catalog/Troubleshooter/Tuning/Export/I18n.swift` typed facades.
- `DesignSystem/`: Color/Type/Spacing/Motion/Haptic tokens; components one-per-file (split SharedComponents).
- `@MainActor @Observable AppState` — with the isolation-adaptation work across services + tests budgeted per spec D4 blast-radius note; delete dead `SlicerLayout.swift`; replace the documented-safe `try!` (policy uniformity, not a defect); uniform error policy.
- Migrate ALL tests (suite count at fork, ≥135) — assertions preserved, isolation adaptations enumerated in ledger. Add bundled-data schema validation test (audit A6). **Add the v1→v2 upgrade fixture test (spec §3 invariant 1): write app-state/workshop files + UserDefaults keys exactly as v1.0.7 does, run v2 load paths, assert everything survives.**
- **Mirrored-JS groundwork (Codex M-1):** create the mirrored-JS resource home (e.g. `3DPrintAssistant/Engine/mirrored/`), add `project.yml` resource entries, byte-diff tests vs web `main`, and a JSContext smoke loader (load `workshop-tuning.js` / `workshop-tuning-rules.js` / `state-codec.js`, assert their factory functions exist) — landed at G1 so G4/G5 build on proven plumbing.
- **Capture perf baselines** (cold launch to interactive, engine-init duration, representative `resolveProfile` bridge-call time on a pinned simulator) → committed under `docs/planning/ios-v2/perf-baseline.md`; G7 regresses against this.
- Doc-sync: `CLAUDE.md:17` IMPL-040 test-file name (3dpa-context staleness — app-state example env ids, missing `mine`, "64 unit tests" — was fixed in the 2026-07-08 planning session; verify still current).
- **Exit:** suite green ≥ fork count, upgrade fixture green, golden/byte-compat fixtures green, hostile review, **Codex cross-model review of the architecture diff**, ledger tick, branch pushed.

### G2 — Configurator
Rebuild Brand/Printer/Material/Nozzle pickers + GoalsView as staged files (`GoalsSimpleStage/MoreStage/AdvancedStage` + container). Step indicator refined (dots + label — owner-priority element). Motion tokens: spring selection, stagger reveal on chip grids, Reduce Motion fallbacks. Dynamic Type + VoiceOver on every control as built. **Exit:** standard protocol + ScreenCaptureUITests maintenance + screenshot packet.

### G3 — Output + power tools
Rebuild OutputView into section files (header/mode toggle/filament tabs/print tabs/actions). New: print-time estimator (`calcPrintTime`), purge calculator (`calcPurgeVolumes`, multi-color states only), `export_clicked` analytics parity. (Share moved to G5 with the codec work; profile comparison cut from v2.0.0 — spec D3.) **Exit:** standard + ScreenCaptureUITests + screenshot packet. RED-first tests mirror web walkthrough invariants where applicable.

### G4 — Store spike, troubleshooter + journal
**Entry: the D5a spike (≤ half session, ledger-recorded decision):** fixture-verify web `workshop-store.js` persisted-bytes ↔ on-disk v1 envelope compatibility → lock architecture (a) JSCore store w/ persistent-storage polyfill, or fallback (c) Swift write-side op-log APIs, fixture-pinned. Then: `Features/Troubleshooter` (symptom grid → ranked causes; `getSymptoms`/`getTroubleshootingTips` with materialGroup context) + `troubleshoot_used` parity event + journal UI on Workshop profiles (worked/failed + symptom tags + note, 500-char cap, deep-link into troubleshooter — web W2 semantics), writes through the D5a-decided store path. **Exit:** standard + ScreenCaptureUITests for the new screens.

### G5 — Native Mine loop + share (the payoff gate)
Load `workshop-tuning.js` + `workshop-tuning-rules.js` (frozen per D5b) byte-identical into the JSContext on the D5a store; Suggestions UI in Workshop (evidence lines, accept/revert/dismiss-30d, anti-ride, conflict cards — web B3 semantics); `syncPersonalTuning` per render; Mine segment lights up from native journal data. **Share (D5c):** outbound share-sheet URL via `state-codec.js` `encodeForShare` in JSCore (mine→safe substitution stays web-defined). Fixture-pin harvest + share outputs against web-generated fixtures. **Exit:** standard + end-to-end XCTest mirroring the web OWNER-VERIFY walkthrough: journal 2 same-symptom failures → suggestion → accept → Mine changes `resolveProfile` output.

### G6 — i18n
String Catalog with EN+DA; migrate Strings.swift call sites; DA sourced from web `locales/da.json` where keys align, new UI strings translated in-line (DA copy flagged in the packet for owner taste review, non-blocking); engine lang set from system locale. **Exit:** standard + long-string/pseudo-locale smoke + DA screenshot packet. Activates protocol step 8 for all later gates.

### G7 — Polish + accessibility sweep
Motion audit against tokens; haptic vocabulary; full Dynamic Type XL pass (no clipping); VoiceOver labels/traits audit; Reduce Motion verified; perf vs the G1 baseline file (launch, engine-init, bridge-call). **Exit evidence is a committed per-screen checklist artifact** (`docs/planning/ios-v2/g7-a11y-polish-checklist.md`) + full screenshot packet across SE/Pro/ProMax (existing UITest matrix) — no adjective-only exits.

### G8 — Release train (owner-heavy)
Entry: **Codex cross-model review of the full fork→v2 diff**; triage CRITICAL→LOW, one finding = one commit. Then, in order honoring the push gate (`main` mirrors TestFlight state): (1) verify ledger shows all `main` hotfixes represented on `ios-v2` and web-sync current; (2) MARKETING_VERSION 2.0.0 on the branch; (3) **owner dispatches TestFlight from the branch** (`gh workflow run testflight.yml --ref ios-v2` — workflow_dispatch runs on any branch carrying the workflow); (4) **owner on-device acceptance** (incl. native Mine walkthrough + a v1→v2 update-in-place check on a device carrying v1 data); (5) only after acceptance: **true merge (no squash)** `ios-v2` → `main`, push; (6) owner: App Store 2.0.0 metadata/screenshots (v1.0.4 submit-doc pattern), submission, Manual Release. **Rollback:** pre-acceptance = nothing merged, `main` untouched; post-merge = revert-merge commit; App Store keeps v1.0.x live until owner releases.

## Risk register

| Risk | Mitigation |
|---|---|
| Parity regression during restructure | Test floor migrated FIRST (G1) with assertions preserved; fixtures green every gate |
| **v1 user data loss on update** | Spec §3 invariant 1: frozen paths/formats/keys + G1 upgrade fixture test + G8 on-device update-in-place check |
| Web-master engine/data drift during the window | Protocol step 3a: per-gate byte-diff + mirror-sync-first + ledger SHA |
| iOS main hotfixes vs restructured branch | Protocol step 3b: ledger SHA + diff-driven re-apply + tests (cherry-pick explicitly ruled out post-G1) |
| Branch loss / cross-machine invisibility | D1a: push at every gate exit (default ON); local-only requires explicit owner acceptance in ledger |
| D5a store integration surprises | Mandatory G4-entry spike with recorded fallback (c); option (b) pre-rejected |
| `workshop-tuning-rules.js` churn (transitional file) | D5b freeze until post-v2 (or owner orders the web migration pre-G5 at Gate 0) |
| Owner taste mismatch discovered late | Screenshot packets at G2/G3/G6/G7 (async, non-blocking, patch-in) |
| Scope creep | Spec §5 non-goals (incl. the deliberate comparison + deep-link cuts); additions = owner decision, new ledger row |
| Estimate slip | Honest envelope 10–15 sessions; ledger tracks per-gate slip |
| Apple-side surprises (agreements, signing) | Known failure mode (v1.0.7 incident, documented); owner-side, plan tolerates the delay |

## Autonomy summary (the owner's one-glance view)

- **Owner, blocking:** G0 ratification · G8 TestFlight dispatch + on-device acceptance + merge approval + App Store submission.
- **Owner, non-blocking:** screenshot taste reviews (G2/G3/G7, DA copy at G6) · decision overrides at G0 (esp. D1a branch push, D5b rules freeze).
- **Claude, autonomous:** everything else — per-gate micro-plans, all implementation, tests, hostile + cross-model reviews, screenshots, ledger, commits + branch pushes, session wrap-ups.
