# iOS v2 rebuild — design spec ("improved copy of 3dpa-ios")

**Date:** 2026-07-08 · **Status:** hostile-reviewed (design gate GO-WITH-PATCHES, all blocking patches applied — see `docs/reviews/2026-07-08-ios-v2-rebuild-review.md`) → owner Gate 0
**Inputs:** `docs/reviews/2026-07-08-ios-v2-rebuild-audit.md` (ground-truth audit) · owner ask 2026-07-08
**Output consumer:** `docs/superpowers/plans/2026-07-08-ios-v2-rebuild-plan.md`

## 1. Owner intent (restated + patched)

> Audience/scope block per `feedback_owner_intent_explicit_in_foundation_docs`.

The owner asked (2026-07-08, autonomous session): *analyze 3dpa web + iOS, run a complete audit/review, and plan an improved copy of 3dpa-ios; plan must be gated, reviewable, and explicit about what runs autonomously vs. where the owner is needed; execution happens in later fresh sessions.*

**Patched interpretation (holes filled — owner ratifies at Gate 0):**
- "Improved copy" = a **v2 of the shipped iOS app** that (a) reaches feature parity with web where it makes sense natively, (b) fixes the audited architecture debt, (c) raises UX polish to the owner's bar (smooth/minimal/functional, spring motion, stagger reveals, clear wizard progress), and (d) **replaces** the current app on the App Store as version 2.0.0 — not a second app listing.
- "Copy" does NOT mean rewrite-every-line: audited-healthy services are carried forward; audited-weak layers are rebuilt. Copy the good, rebuild the weak.
- All cross-platform contracts (audit §4) are invariants, not improvement targets. **So is v1 user data (§3 first invariant).**

## 2. Decisions (D0–D7) — defaults chosen for autonomy; owner can override any at Gate 0

**D0 — Rebuild vs incremental.** *Honest alternative surfaced:* the codebase is healthy (clean, 135 tests, no TODO debt); pure feature-parity could ship incrementally for less risk. **Default: hybrid rebuild** per §1 — the owner explicitly asked for an improved copy, and the wins that motivate v2 (bridge decomposition, @MainActor state, view rearchitecture, a11y/i18n as norms, motion system) are structural, not incremental patches.

**D1 — Where v2 lives.** **Default: same repo (`3dprintassistant-ios`), long-lived branch `ios-v2`, same Xcode project via XcodeGen, same bundle id `dk.mragile.3DPrintAssistant`, deployment target stays iOS 17.0.** Sources restructured in place on the branch (true git merge at G8, never squash — history preserved). Rationale: App Store continuity requires the bundle id; CI/signing/fastlane/secrets are proven in this repo. Rejected: new repo/folder (owner cost, orphaned users if bundle id changed), in-place-on-main (violates push gate hygiene mid-rebuild).

**D1a — Branch backup push: ON by default.** `ios-v2` is pushed to origin at every gate exit. The iOS push gate governs `main` (its rationale — main mirrors TestFlight state, no dispatch temptation — is untouched by a feature-branch push); pushed-branch precedent exists in this repo (`origin/phase/1-configurator`) and in the web trains (mine-tier, learns-export). The owner works from two machines and `3dprintassistant-ios` is excluded from claude-sync push-children — a local-only rebuild branch would be invisible cross-machine and a single-disk loss exposure across 8–15 sessions. Owner may override to local-only at Gate 0 (then the single-machine pin + loss risk is recorded as owner-accepted in the ledger).

**D2 — Version + release strategy.** v2 ships as **2.0.0** through the existing TestFlight workflow. `main` stays the v1.0.x line for hotfixes until v2 merge. Two drift protocols (both ledger-recorded, see plan standing protocol): (a) **iOS main hotfixes** → detected at gate entry via `git log <last-synced-main-sha>..main`, re-applied diff-driven (cherry-pick will not survive the G1 restructure), verified by the relevant tests; (b) **web-master engine/data movement** → at every gate entry, byte-diff bundled `engine.js` + `data/` + mirrored JS modules against web `main`; if drifted, mirror-sync as the gate's first commit and re-run the full suite (web-is-master standing rule applies to `ios-v2` exactly as to `main`).

**D3 — Feature scope of v2.0.0.** In: journal UI, troubleshooter surface, tuning suggestions/"My tuning" (native Mine loop), share URLs (**outbound-only**, D5c), print-time estimator, purge calculator, DA localization, analytics parity (`troubleshoot_used`, `export_clicked`) — plus all architecture (A1–A7) and UX (U1–U5) items from the audit. Out (explicit non-goals): **profile comparison** (cut by design review MEDIUM-8 — lowest product value of the parity set, highest native-interaction-design uncertainty; post-v2 candidate), inbound deep links / universal links (needs web-side AASA + entitlements; post-v2), light theme, iPad multi-column (a11y + size-class correctness yes, custom iPad layout no), user accounts/cloud sync/watch/widgets, Android, any engine.js behavior change (v2 is app-layer only; engine/data stay byte-identical to web master).

**D4 — Architecture shape.**
- `EngineCore` (JSContext lifecycle, serial queue, exception store, polyfills, continuation-based readiness — no sleep-polling) + domain-typed `EngineAPI` facades (Profile, Catalog, Troubleshooter, Tuning, Export, I18n). Same proven threading model (serial queue, not actor — HIGH-003 rationale carries).
- `@MainActor @Observable` AppState; ViewModels own bridge calls; views stay dumb. **Blast-radius note (review MEDIUM-9):** the current bridge explicitly documents a non-MainActor assumption and 53/54 EngineServiceTests are async — A2 forces isolation adaptations across service signatures and test arrange/act code, not just path renames. Assertions are preserved; isolation plumbing is expected work, budgeted in G1.
- Feature-folder structure (`Features/Configurator`, `Features/Output`, `Features/Workshop`, `Features/Troubleshooter`, `Features/Feedback`, `DesignSystem/`, `EngineBridge/`, `Services/`), one component per file.
- Uniform error policy: bridge throws typed errors; persistence is documented best-effort; no `try!` (the existing one at `EngineService.swift:942` is documented-safe — removed for policy uniformity, not as a defect).
- Carried near-verbatim: ReviewPromptService (+ its UserDefaults keys frozen), AnalyticsService (+2 parity events), FeedbackService, **Sentry integration**, PrinterCatalogProvider (split into Validation/Merge/Cache internally, behavior-pinned by its 25 tests), WorkshopStore emitter (byte-compat is sacred), AppStateWebCodec, **AppStatePersistence (file path + envelope frozen — §3 invariant 1)**.

**D5 — Learns/harvest layer runs in JSCore, byte-identical (web stays master).** `workshop-tuning.js` + `workshop-tuning-rules.js` load into the same JSContext (like engine.js) instead of a Swift port — the single most drift-killing choice available; extends the no-reimplementation rule to the learns logic.

- **D5a — Store topology (the load-bearing joint; review HIGH-2/plan HIGH-3; default corrected by Codex HIGH-2).** `createWorkshopTuning(store, rules, engineFacts)` requires a store with write-side APIs (`addTuningOp`, `dismissSuggestion`, `revertTuning`, journal reads) that the Swift `WorkshopStore` does not have. **Byte evidence (Codex, verified):** web `workshop-store.js` persists COMPACT `JSON.stringify(env)` to storage (`workshop-store.js:54`); the iOS on-disk file is PRETTY 2-space via the byte-compat ordered emitter (`WorkshopStore.swift:5,:90`) and is frozen as §3 invariant 1 — so "back the JS store's storage with the disk file" does not work without a translation layer. **Default architecture (c):** Swift `WorkshopStore` gains write-side op-log APIs (`addTuningOp` / `dismissSuggestion` / `revertTuning` / `addOutcome`), fixture-pinned against web-generated op-log fixtures; a thin Swift-backed adapter object (pure file/memory ops, no re-entry into the JSContext) is exposed to `createWorkshopTuning` — the harvest/suggestion LOGIC stays byte-identical JS (the drift-killing part); only store CRUD is Swift, contract-pinned. Alternative (a) — JS store authoritative with every disk write re-rendered through the Swift emitter — is acceptable only if the G4 spike shows the adapter is simpler than the write-API port. **Mandatory G4-entry spike (≤ half session, ledger-recorded decision before any journal-write code):** pin the adapter surface + fixtures, confirm op-log semantics (opId union, clamp derivation) byte-match web-generated fixtures.
- **D5b — `workshop-tuning-rules.js` is self-declared TRANSITIONAL** (the W3-T7 rules→`troubleshooter.json` remedy migration is queued web-side, trigger = "second consumer" = exactly this iOS train). **Default: freeze the migration until post-v2** — v2 mirrors the rules file byte-identical as-is; running the web migration mid-rebuild would churn the mirrored surface and fixtures. This consciously defers the recorded W3-T7 trigger; post-v2 the migration updates both platforms in one train. Owner may instead order the web migration BEFORE G5 at Gate 0 (adds ~1 web session before the iOS gate).
- **D5c — Share encoding through `state-codec.js` in JSCore.** iOS today has **no** URL codec (verified: `AppStateWebCodec` maps dictionaries only; no `encodeToParams`/`decodeFromParams` in Swift). Rather than porting the short-key table + the mine→safe substitution rule (the exact rule whose placement already produced a web HIGH-1 bug), v2 calls web `state-codec.js` `encodeForShare` in JSCore. Share is **outbound-only** in 2.0.0.

**D6 — i18n.** String Catalogs (`.xcstrings`) with EN + DA, keys aligned to web `locales/*.json` naming where 1:1. Language follows **system locale** (iOS convention) — no in-app toggle in v2.0.0. PARAM_LABELS stay English everywhere (standing rule). Engine-provided strings (warnings, checklist, tips) localize via `Engine.setLang` from system locale (locales already ride the iOS fetch polyfill — verified). **Post-G6 standing rule:** every later gate that adds UI strings adds EN+DA catalog entries and flags the DA copy in its screenshot packet (prevents silent DA regression; review M-3).

**D7 — Design system.** Keep brand identity (dark bg #0a0a0b, primary green #00e5a0, Syne + DM Mono) — v2 is a refinement, not a rebrand. Codify: spacing/radius/typography tokens with Dynamic Type ramps, motion tokens (spring response/damping presets, stagger interval, Reduce Motion fallbacks), haptic vocabulary (selection tick, accept success, destructive arm). Wizard step indicator (progress dots + step label) stays a first-class element per owner pref.

## 3. Quality bar + verification invariants

1. **v1 user data survives the 2.0.0 update (CRITICAL invariant).** Frozen: `Application Support/app-state.json` path + envelope, the workshop file path + v1 envelope (profiles/journal/tuning/userMaterials), ReviewPrompt + analytics UserDefaults key names. **G1 exit includes a v1→v2 upgrade fixture test:** write the files exactly as v1.0.7 writes them, boot v2 code paths, assert profiles/journal/tuning/state load unchanged. Silent loss of a user's accepted tuning is the worst possible v2 outcome.
2. All migrated XCTests pass on v2 (**suite count at fork, ≥135**) before any new feature gate opens — assertions preserved; isolation adaptations per D4 are enumerated in the ledger row. Post-G1, migrated tests may be rewritten only with equivalent-or-stronger assertions, changes enumerated per gate.
3. Byte-compat fixtures (workshop envelope, codec round-trip, engine golden mirrors) stay green at every gate; bundled `engine.js` + `data/` + mirrored JS modules byte-diff clean against web `main` at the ledger-recorded synced SHA.
4. New features get TDD RED-first tests per repo convention (incl. TDD-RED breadcrumb rules for mirror tests).
5. Every gate ends: full XCTest suite + hostile fresh-context sub-agent review → patch → QA green → local commits + branch backup push (D1a), one concern = one commit.
6. Cross-model (Codex) review at the architecture gate (G1 exit) and pre-release gate (G8 entry) minimum; bridge `--health` then `--mode codex-only` per RUNBOOK.
7. Accessibility acceptance per screen: Dynamic Type XL renders without clipping; VoiceOver labels on all interactive elements; Reduce Motion honored. Evidence at G7 = a committed per-screen checklist artifact, not adjectives.
8. Screenshot evidence (ScreenCaptureUITests — maintained by each UI gate for the surfaces it touched) at each UI gate for async owner review — owner taste feedback is queued, not blocking, and lands as patch commits.

## 4. Owner-dependency map (what Claude cannot do alone)

| Point | What's needed | Blocking? |
|---|---|---|
| Gate 0 | Ratify/override D0–D7 incl. D1a/D5a/D5b/D5c (async read of this spec) | Yes — before G1 |
| UI taste checkpoints | Async screenshot review after G2/G3/G7 (+ DA copy at G6) | No — non-blocking, feedback becomes patches |
| On-device verify | TestFlight install + native Mine-loop walkthrough on real device | Yes — G8 |
| TestFlight dispatch | `gh workflow run testflight.yml` (manual-dispatch standing rule; G8 dispatches from `ios-v2` for acceptance BEFORE the main merge) | Yes — G8 |
| App Store | 2.0.0 metadata, screenshots upload, submission, release | Yes — G8 |
| Apple account | Any agreement/signing surprises (cf. v1.0.7 agreement incident) | If they occur |

Everything else — audit, spec, plans, scaffolding, implementation, tests, reviews, simulator screenshots, ledger, local commits + branch pushes — runs autonomously. **Machine prerequisites checked at every session start** (plan standing protocol): `Config.xcconfig` present, Xcode + simulators available, `ios-v2` present locally (halt and surface if not — fetch from origin per D1a).

## 5. Non-goals (so reviewers don't propose them)

Engine/data changes of any kind · profile comparison (v2.0.0) · inbound deep links / universal links · light theme · iPad-specific layout · accounts/sync · push notifications · widgets/watch · Android · slicer integrations · new analytics events beyond web parity · rebrand.

## 6. Artifact + logging homes

Spec/plan/reviews/ledger live in the **web repo** (`3dprintassistant/docs/…`, pushed = cross-machine visible): ledger at `docs/planning/IOS-V2-GATE-LEDGER.md` (created at **G0** with the ratification row, empty-first discipline). Session logs stay in `3dprintassistant/docs/sessions/` per existing convention (iOS session history lives there). Doc-sync at G1: `3dprintassistant/CLAUDE.md:17` (IMPL-040 rule) names `EngineServiceTests.swift` explicitly — update when the file is renamed; `3dpa-context.md:140` "64 unit tests" is stale (pre-existing) — correct in the same pass.
