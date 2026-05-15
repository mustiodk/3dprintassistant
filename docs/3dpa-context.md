# 3D Print Assistant — Project context

> **Purpose of this file.** A compact, stable reference that Codex review packets, Gemini research handovers, and any other AI peer (or new human contributor) can link to so they don't have to reverse-engineer what 3dpa is from scratch. Every handover/packet adds a single line: `Project context: docs/3dpa-context.md` (with the appropriate relative path for the consuming file's location) — readers consult it once.
>
> **Stability promise.** Updated only when something in here genuinely changes (new platform, new engine pattern, new collaboration rule). Day-to-day status (which phase, which findings shipped, which version is live) belongs in `docs/planning/ROADMAP.md` and `docs/sessions/INDEX.md`, **not here**. Drift risk is real — keep this evergreen.

---

## At a glance

**3D Print Assistant** ([3dprintassistant.com](https://3dprintassistant.com)) generates optimised 3D-printer slicer profiles based on the user's selections. Input: **printer × material × nozzle × goals × environment × support × etc.** Output: a recommended profile (numbers + warnings + checklist) plus the slicer-organised tabs the user pastes into their slicer of choice.

It is a free, no-account, no-tracking-by-default tool aimed at hobbyists and pros who own one or more printers and want a sane starting profile per material/printer combination instead of either Googling or trial-and-error. Owner is **Musti** — solo hobbyist developer; this is a side project, not a company.

Two surfaces, one engine:

| Surface | Repo | Stack | Live status (live state in ROADMAP) |
|---|---|---|---|
| **Web app** | `3dprintassistant/` | Vanilla JS + HTML + CSS, Cloudflare Pages, Cloudflare Worker for `/api/feedback` | Live worldwide |
| **iOS app** | `3dprintassistant-ios/` | SwiftUI, JavaScriptCore (runs the same `engine.js`) | Live on App Store, dark mode only |

Both surfaces consume the same data files and the same engine logic. Web is the master; iOS receives byte-identical copies of `engine.js` and `data/*.json`.

---

## Two surfaces, one engine

### Engine — `engine.js` is the brain

`engine.js` (in the web repo at `3dprintassistant/engine.js`) is a single JavaScript module that contains **all business logic**. It exposes a public API of pure(-ish) functions that take an app-state object and return profile data, warnings, checklists, troubleshooting tips, and other derived values. It has zero DOM dependencies — UI is entirely separate (see below).

Same `engine.js` runs in both surfaces:

- **Web:** loaded directly by `app.js` in the browser.
- **iOS:** loaded into JavaScriptCore (`JSContext`) from `EngineService.swift`. The Swift layer marshals state in/out via Codable structs.

This shared-engine architecture is intentional. **Behaviour parity** between web and iOS is enforced by the file being identical bytes on both sides — never re-implement engine logic in Swift.

### UI — `app.js` (web) and SwiftUI views (iOS)

UI code is strictly separate from engine code. The rule is: `engine.js` produces structured outputs, and the UI consumes them. The `engine.js` ↔ `app.js` separation rule is treated as load-bearing — it's what makes API extraction or future platform additions feasible.

### Data — `data/*.json`

Three primary data files plus a `rules/` subdirectory:

| File | Contents |
|---|---|
| `data/printers.json` | All supported printers + their capabilities (max speeds, accelerations, bed/nozzle temp limits, enclosure type, multi-material systems, plates, nozzle sizes, etc.) plus a `brands` table |
| `data/materials.json` | All supported materials (PLA, PETG, ABS, ASA, TPU, PA, PA-CF, PC, PVA, etc.) with base settings, drying, build-plate compatibility |
| `data/nozzles.json` | Nozzle catalogue (standard 0.4, hardened 0.4, hardened 0.6, precision 0.2, etc.) with material compatibility and temp offsets |
| `data/rules/` | Cross-cutting rules (objective profiles, slicer capabilities, etc.) |

When a printer/material/nozzle is added, both `engine.js` (if a new code path is needed) and the corresponding `data/*.json` files are edited on **web first**, then `cp`'d byte-identical to iOS, then the walkthrough harness re-runs and iOS XCTest re-runs.

### Internationalisation

Web supports English + Danish. Strings live at `locales/en.json` and `locales/da.json`. iOS reuses the same keys via `Localizable.strings` (format-converted at build time).

---

## Engine public API (canonical reference)

| Function | Returns | One-line purpose |
|---|---|---|
| `resolveProfile(state)` | `{ paramId: { value, why, mode, prov? } }` | The core output — slicer params (layer height, walls, infill, retraction, etc.). **Not temperatures** — temps come from `getAdjustedTemps()`. Per-param value + explanation + simple/advanced flag + provenance sidecar. |
| `getWarnings(state)` | `[{ id, text, detail, fix }]` | Context-sensitive warnings (e.g. material × printer × nozzle incompatibilities) |
| `getChecklist(state)` | `[{ text, detail, critical }]` | Pre-print checklist (e.g. "Dry filament for 4h at 60°C") |
| `getAdjustedTemps(materialId, envId, nozzleId)` | `{ nozzle, bed }` | Environment- and nozzle-adjusted temp values |
| `getAdvancedFilamentSettings(state)` | split temps + extrusion params | Advanced-mode filament panel |
| `getFilamentProfile(materialId)` | display data for material panel | Notes, drying, build-plate compat |
| `getCompatibleNozzles(materialId)` | `[{ id, name, compatible }]` | Dims incompatible nozzles |
| `getCompatibleNozzlesForPrinter(materialId, printerId)` | `[{ id, name, compatible }]` | Material × printer-aware filtering on top of `getCompatibleNozzles` |
| `getSymptoms()` / `getTroubleshootingTips(symptomId, state)` | symptom list + ranked causes/fixes | Troubleshooter |
| `calcPurgeVolumes(slots, materialGroup)` | `{ matrix, mult, tip }` | AMS flush volume calculator |
| `calcPrintTime({ height_mm, ... }, state)` | `{ low, mid, high }` | Print time estimate |
| `getBrands()` / `getPrintersByBrand(brandId)` / `searchPrinters(query)` | various | Printer picker |
| `getSlicerForPrinter(printerId)` | `'bambu_studio'` \| `'prusaslicer'` \| `'orcaslicer'` | Slicer routing |
| `getFilamentTabs(mode)` / `getSlicerTabs(slicerId)` / `getSlicerDisplayName(id)` | tab structures + display names | Slicer-aware UI |
| `exportProfile(state, profile)` | JSON string | Reference export — currently disabled in UI |

**Known asymmetry (v1.0.4 OBSERVATION-01).** `getCompatibleNozzlesForPrinter` is a public exported helper (`engine.js:2726` exported at `engine.js:3520`). The parallel `getCompatiblePlatesForPrinter` is intentionally **absent** — plate-printer compatibility is enforced exclusively via the warning-time guard inside `getWarnings(state)`. This is acceptable for v1.0.4 because no web/iOS surface has a plate picker that would consume a list. Promote to a public helper only when such a picker is built; expanding the API preemptively is YAGNI. Source: Codex 2026-05-13 v1.0.4 audit OBSERVATION-01 accept-criterion.

**App state shape** (canonical):

```js
{
  printer: "x1c", nozzle: "std_0.4", material: "pla_basic",
  useCase: ["functional"], surface: "standard", strength: "standard",
  speed: "balanced", environment: "room_temp", support: "none",
  colors: "single", userLevel: "intermediate", special: [],
  profileMode: "safe"   // "safe" | "tuned" — DQ-2 toggle
}
```

---

## Slicer-aware output

Different printer brands use different slicer software. The engine routes output tabs and parameter labels accordingly:

| Brand | Default slicer | Tabs come from |
|---|---|---|
| Bambu Lab | `bambu_studio` | Bambu Studio tab structure |
| Prusa | `prusaslicer` | PrusaSlicer tab structure |
| Creality / Anycubic / QIDI / Elegoo / Sovol / FlashForge / Voron / DIY / etc. | `orcaslicer` | OrcaSlicer tab structure |

`PARAM_LABELS` always stay in English so users can find settings in the slicer's UI exactly as labelled.

---

## Simple / Advanced mode + Provenance

- **Simple** mode shows only the most critical output params.
- **Advanced** mode shows all params including split temperatures, fan curves, extrusion settings, and a per-param **provenance** indicator (an ⓘ icon) — tap/hover for source: vendor preset / community consensus / calculated from a rule.

The mode flag is per-param on `resolveProfile` output. UI filters on it.

Provenance was added in **DQ-1** (2026-04-24); every numeric emission carries `{source, ref}` data identifying where it originated. The intent is honesty and verifiability — pros want to know if a recommended speed is from Bambu's wiki or from a heuristic.

`profileMode` ("safe" vs "tuned") was added in **DQ-2** (2026-04-24): "safe" returns vendor-published baselines; "tuned" returns the same fields with community-consensus overrides where they exist (sparse `_tuned` block in the data). Web exposes this as a segmented control; iOS uses `SlidingSegmentedControl` on `GoalsView`.

---

## Tech stack & deployment

### Web

- **Hosting:** Cloudflare Pages, auto-deploys from `main` branch (no build step — vanilla JS).
- **Backend:** one Cloudflare Worker at `/api/feedback` (in `3dprintassistant/functions/api/feedback.js`) that receives feedback POSTs, sanitises, and forwards to a Discord webhook.
- **Asset versioning:** Cloudflare Pages serves `index.html` + `app.js` + `engine.js` + `style.css` directly — cache strategy is governed by CF Pages defaults + any cache-control headers configured in the project (verify in-repo before changes). The PHP `_v($f)` filemtime cache-busting pattern used on Simply.com sister projects does NOT apply here.
- **Live URL:** [3dprintassistant.com](https://3dprintassistant.com).

### iOS

- **Stack:** SwiftUI, JavaScriptCore for engine, dark-mode only.
- **Deploy:** GitHub Actions workflow `testflight.yml` (manual-dispatch only via `gh workflow run testflight.yml --ref main`) builds on `macos-26` runners and uploads to TestFlight.
- **Distribution:** App Store, live worldwide. EU was blocked on DSA Trader Status until 2026-04-27; resolved.
- **Tests:**
  - **`EngineServiceTests`** (XCTest) — currently 64 unit tests covering engine.js bridge correctness.
  - **`ScreenCaptureUITests`** (UITest target) — generates UI screenshots across simulator devices for cross-device review.

### Shared

- **Walkthrough harness** at `3dprintassistant/scripts/walkthrough-harness.js` — Node-based regression suite that loads `engine.js` via `vm` with `fetch`/`localStorage` polyfills and runs ~10 representative printer × material × nozzle combos through the engine. Run after every engine or data edit.

---

## Project history (compressed)

In rough order, post-MVP:

| Phase / Era | What landed |
|---|---|
| **MVP → 1a** | Initial site, web-only, vanilla JS + JSON data files |
| **1b** | UI screens — printer picker, material picker, goals, output, troubleshooter |
| **iOS MVP → v1.0** | iOS port via JavaScriptCore; SwiftUI surface; App Store release 2026-04-16 |
| **IMPL-039** | Printer-capability clamping + slicer-aware values refactor — `getPrinterLimits`, `_clampNum`, `mapForSlicer`, `slicer_capabilities.json` replaced scattered `Math.min` and hardcoded patterns |
| **IMPL-040** | `chip-desc` / resolveProfile single source of truth — every UI number now computed by the same function that emits it |
| **3rd-party review (2026-04-20)** | 21-item code review pass; all items resolved before v1.0 ship |
| **Internal review (2026-04-20)** | Phase 0 / IR-0…IR-5 follow-up cycle; 59 findings triaged via `/code-reviewer` + Phase 1 domain walkthrough; the IR series mostly shipped between 2026-04-21 → 2026-04-23 |
| **iOS v1.0.2 ship** | 2026-04-23 → released 2026-04-24; bundled IR-2a (CRITICAL-001 feedback-privacy via Worker + HMAC), IR-4 drift-prevention bridges, plus 10 silent-correctness fixes |
| **EU unblock** | 2026-04-27 — DSA Trader Status approved; App Store now live worldwide |
| **Phase DQ — Data Quality & Pro-Relevance** | 5-sub-phase data-credibility track |
| **DQ-1** | Provenance infrastructure on `resolveProfile` (web + iOS, ⓘ icon on Advanced) |
| **DQ-1-followup** | Provenance extended to filament panel via `_prov` sidecar |
| **DQ-2** | Safe / Tuned `profileMode` toggle + sparse `_tuned` override convention |
| **DQ-3 → DQ-5** | Pressure-Advance / Linear-Advance per material; retraction deltas; cooling curves — **deferred to post-v1.0.3** |

For day-to-day phase status, read `docs/planning/ROADMAP.md`. For specific session decisions, read `docs/sessions/INDEX.md` + the most-recent few session logs in full.

---

## Standing rules that affect review and research

These rules are binding for any AI peer working on 3dpa — Codex, Gemini, or future. They exist because past mistakes hurt:

1. **One finding = one commit per platform.** Web + iOS commits with matching subject + tag. Don't bundle unrelated findings.
2. **Web is master, iOS mirrors.** Every engine or data change lands on web first; iOS gets byte-identical `cp`. Walkthrough harness + iOS XCTest re-run after every edit.
3. **No silent assumptions.** Read the actual file before claiming how a system behaves. No speculation presented as fact.
4. **Data/logic-change evaluation (mandatory).** Every engine/data improvement must include an evaluation of whether web + iOS UI need changes to best use it.
5. **iOS push gate.** No iOS push to GitHub `main` until ship-ready for TestFlight (all planned changes landed, XCTest green, walkthrough green, MARKETING_VERSION bumped). Local commits between findings are fine.
6. **Quality > speed, post-live.** Web + iOS are live. Apply full correct fixes across both platforms; never narrow scope to ship faster.
7. **Provenance everywhere.** Any new emission from `resolveProfile` (or sister functions) must carry a `prov: { source, ref }` sidecar — vendor / default / rule / calculated.
8. **TestFlight is manual-dispatch only.** Don't dispatch autonomously; owner gates each TestFlight build.
9. **Locked schema additivity.** When adding fields to data files (printers/materials/nozzles), make additions additive — existing entries must keep working without the new field. The iOS Codable layer is forgiving (null/missing decodes cleanly), but only because we keep changes additive.
10. **Printer additions follow `docs/runbooks/printer-addition-protocol.md`.** Bundled `data/printers.json` is the source of truth; the iOS overlay is an additive same-day patch.

---

## AI collaboration context

The retired AI Operating Model pilot left one useful lightweight reference:
`docs/ai-collab.md`. Treat it as tool-routing guidance, not a mandatory process.

- **Codex** is the primary builder for repo work, implementation, tests,
  commits, and release flow.
- **Claude** is useful as a secondary reviewer / collaborator when an
  independent critique is wanted.
- **Gemini** handles research, large-context synthesis, and source-heavy
  comparison work.
- **ChatGPT / Grok** are useful for brainstorming, framing, and first drafts.

Second-model review is optional and risk-based. Use it for design constraints,
privacy/security/auth/schema changes, cross-platform engine/data behavior, or
hard-to-reverse choices. Skip it for routine copy edits, narrow markdown hygiene,
and low-risk fixes already covered by tests.

---

## What's intentionally NOT in scope (so reviewers don't propose it)

- **Backwards-compatibility shims for retired data / removed code.** Web + iOS are versioned in lockstep; if engine.js drops a field, both sides drop it the same commit.
- **Android.** No plans.
- **Slicer plugins / direct slicer integration.** Out of scope; the value prop is a recommendation tool, not a slicer wrapper.
- **User accounts.** No login, no account, no cross-device sync. Privacy by default.
- **Cloud-side profile generation.** Engine runs on-device (browser or iOS JSCore). No server-side compute. The only Cloudflare Worker is for the feedback proxy.
- **Identity-linked telemetry.** Anonymous product analytics are live for
  `app_opened`, `profile_generated`, and `feedback_opened`, but there are no
  user/session/device identifiers, no free text, and no generated profile
  output in analytics payloads.

---

## Pointers for deeper context

If a reviewer or researcher needs more than what's here:

- **Day-to-day status:** `docs/planning/ROADMAP.md` — slim live planning surface (current state, active release, active work queue, deferred queue, backlog). Historical IR cycles + completed phases + legacy backlog ID index live under `docs/planning/archive/`.
- **Recent decisions:** `docs/sessions/INDEX.md` + last 3 session logs in full.
- **Implementation specs:** `docs/specs/` (e.g. `IMPL-041-data-quality-phase.md` for Phase DQ).
- **Prior reviews:** `docs/reviews/2026-04-20-internal/` (the 59-finding internal review) and `3dprintassistant-ios/docs/reviews/2026-04-23-high-003-codex/` (a 3-pass external Codex review).
- **AI collaboration rules in full:** `docs/ai-collab.md`.
- **iOS-specific operational context:** `3dprintassistant-ios/CLAUDE.md` — cross-device UITest workflow, simulator-build `CODE_SIGNING_ALLOWED=NO` rationale, planning pointers. **Engine API + app-state shape are owned by THIS file (`docs/3dpa-context.md`)** — iOS CLAUDE.md does NOT duplicate them.

---

## Owner profile (relevant for any peer review)

- **Solo hobbyist developer.** No team, no PM, no QA. Decisions are owner-direct.
- **MacBook Air primary; token-conscious.** Codex is now the primary coding /
  release tool; Claude is a secondary reviewer/collaborator; Gemini remains the
  large-context research tool. Token efficiency matters when scoping handovers —
  skim-friendly tables beat verbose narrative.
- **Quality > speed by default.** "Quality is key. No cutting corners." is the standing instruction. If a review packet or research handover seems too thin, push back rather than accept it.
- **Direct communication preferred.** Recommendations beat options-lists. Honest reassessments beat polite confirmation.
