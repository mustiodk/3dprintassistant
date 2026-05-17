# Problem statement — resin scaling (v4)

> **Purpose.** Foundation document that downstream artifacts in this directory cite — technical-differences mappings, decision frameworks, eventual implementation plans (if any). Not a brainstorm prompt; not a design spec; not advocacy for or against expansion. Just the factual state-of-the-world plus the questions that must be answered before architecture choice.
>
> **Status:** v4 draft, post-bridge-round-2 + owner-picks (Ask 5 Option A decision-tree restructure; Ask 6 Option 2 in-session production).
> **Version history:** v1 was the original brainstorm prompt at `../../../ai-operating-model/docs/ensemble-pilot/2026-05-17-resin-comparison/prompt.md`. v2 (2026-05-17) added three gates + hard-coupling inventory but assumed user-facing audience implicitly and was missing 7 couplings. v3 (2026-05-17) integrated bridge round 1 catches (MF1–MF4 + SF1–SF7) AND a load-bearing owner-side audience reframe (the audience is the owner, not 3dpa's users). v4 (this file, 2026-05-17 session 2) integrates bridge round 2 catches: MF-R2-1 §5/C13+C14 citation corrections + new printer-count-drift footnote enumerating the full surface; MF-R2-2 §7 restructured as a decision tree (Gate 2 evaluated first; Gate 1 only when Gate 2 ∈ {A,B,C,D,E}); SF-R2-1 park-outcome 4-week charter clock; SF-R2-2 §5 table extended with a "Fires if" column (5 L rows now visibly conditional on Gate 2 picks); SF-R2-3 §5 sizing math fix; SF-R2-4 C6 line-ref fix; SF-R2-5 §6 "dormant" wording; OPT-R2-2 §3 unknown #4 substantiation flag with 3 primary-source URLs.
> **Project context (mandatory read for downstream consumers):** [`../3dpa-context.md`](../3dpa-context.md).

---

## 1. What 3dpa is today (factual)

[3dprintassistant.com](https://3dprintassistant.com) is a free, no-account 3D-printing **slicer-profile recommender**. The user picks a printer + material + nozzle + goals + environment + support + colors, and the engine emits a recommended profile (numbers + warnings + checklist) organized into the tabs of the user's slicer. Same engine runs in a SwiftUI iOS app via JavaScriptCore.

**Scope today is exclusively FDM (filament extrusion).** Twelve printer brands per `data/printers.json` (canonical list — see file for the current set). Slicer routing fans out to Bambu Studio / PrusaSlicer / OrcaSlicer depending on the printer's brand. iOS app is dark-mode only, live on the App Store; web is auto-deployed from `main` to Cloudflare Pages.

**Architecture** (one-paragraph version; full canonical reference in [`../3dpa-context.md`](../3dpa-context.md)):
- `engine.js` = all business logic; zero DOM dependencies; pure(-ish) functions taking app-state and returning derived data. Runs identically in the browser (web) and JavaScriptCore (iOS).
- `app.js` = web UI orchestration only. No business logic. The engine ↔ UI separation is a load-bearing standing rule.
- `worker.js` = Cloudflare Worker entry point that routes `/api/feedback`, `/api/analytics`, `/api/analytics-query`, then delegates remaining requests to static-asset serving via the `ASSETS` binding (`worker.js:46`, `wrangler.toml:10`). *Not* a Web Worker; *not* compute offload.
- `data/{printers,materials,nozzles}.json` + `data/rules/` = catalog (FDM-only fields).
- iOS Swift layer marshals state in/out of JSCore via `Codable` structs.

**v1.0.4 just shipped to TestFlight 2026-05-15.** v1.0.5 hygiene-pass carry queued. DQ-3/4/5 (pressure-advance per material, retraction deltas per material, cooling curves) explicitly deferred to post-v1.0.4 — the FDM data-credibility arc is mid-execution.

---

## 2. Audience reframe (load-bearing — read before §3)

**The audience for any resin work in 3dpa is the owner himself**, not 3dpa's users. This is a hobby-build expansion, not a public product expansion.

Practical implications that change v2's framing materially:

1. **No user-facing survey work is in scope** for resin discovery. Audience-overlap data among 3dpa users is irrelevant; the relevant audience question is whether the owner personally wants to use a resin printer enough to justify building for it.
2. **Public surfaces do not need to reopen the resin question.** The 2026-05-15 runbook's "no plans" posture for users continues to hold. v1.0.5 FDM-only-scope-copy carry continues as planned. Discovery work happens internally.
3. **Gate 1 collapses** to a single owner-preference question, not a data-collection exercise.
4. **The success-target spectrum becomes owner-preference-driven**, not market-driven. What constitutes "enough" is whatever the owner finds personally useful.
5. **The iteration loop is owner-driven, not user-driven.** Build → owner tries on his own printer → iterate. No A/B testing, no usage analytics required for the resin features themselves.
6. **The off-axis product space (per bridge round 1 MF3) becomes more relevant**, not less: "resin troubleshooter for my own use" or "exposure-time lookup for my own resin bottle" are now plausible minimum-viable shapes the owner can build for himself without needing audience validation.

The survey-design artifact at [`audience-overlap-survey.md`](audience-overlap-survey.md) is parked accordingly — kept for its survey-pattern value for future general-feedback features, not used for this work.

---

## 3. What the prior brainstorm settled

The 2026-05-17 bridge-driven brainstorm (`../../../ai-operating-model/docs/ensemble-pilot/2026-05-17-resin-comparison/bridge/bridge-2026-05-17-014912-440756.md`) produced three engine-architecture directions and ten unknowns. Summarized here so v4 doesn't repeat that work:

### Three engine-architecture directions surfaced

| ID | Shape | Trade-offs (Codex-corrected) |
|---|---|---|
| **D1** | Single engine, internal `state.technology` branch | Lowest refactor cost. But eats the hard structural couplings (see §5 below) inside the live engine. Entanglement risk rises every year resin code lives next to FDM code. |
| **D2** | Two engines + thin router (`engine_fdm.js` + `engine_sla.js`) | Clean isolation; zero risk to live FDM line. Cost: duplication of shared concerns and inevitable drift between the two engines as fixes go to one but not the other. |
| **D3** | Kernel + tech adapters (refactor engine into generic kernel with pluggable FDM/SLA adapters) | Highest upfront cost. Strongest alignment with the "engine as standalone API" standing rule. Pays off only if a third tech ever materializes — speculative. |

### The 10 unknowns the brainstorm flagged (still relevant, partially reframed)

1. ~~**Audience overlap.**~~ **Resolved by §2 reframe.** Audience is the owner; no user-side data collection.
2. **Sibling product** (`resinprintassistant.com`). Still real — and the audience reframe makes it cleaner: a sibling product can be a personal hobby site without competing with 3dpa's public identity. Or it can simply not happen, and resin lives only in a private/internal build.
3. **Success-target spectrum.** Now owner-preference-driven (see §4).
4. **Resin-slicer landscape.** Chitubox, Lychee, Prusa SL1, manufacturer-bundled tools. Do any share a parameter contract? Almost certainly not — but the answer shapes whether `getSlicerForPrinter()` can extend or must fork. **Substantiation owed:** primary-source evidence will land in `technical-differences.md`. Initial sources to consult (round-2 Codex external-source check):
   - [CHITUBOX print-settings docs](https://docs.chitubox.com/en-US/chitubox/latest/configure-print-settings) — documents exposure/rest/lift/retract/PWM/grayscale controls.
   - [Lychee Slicer resin-settings guide](https://lychee.mango3d.io/whats-new/the-best-resin-settings-for-your-printer-lychee-slicer-guide) — distinguishes Chitu vs Anycubic setting systems.
   - [Prusa SL1 resin calibration](https://help.prusa3d.com/article/resin-calibration-sl1-sl1s_112182) — exposure-preset / calibration framing.
   Treat the "no shared contract" assertion as a hypothesis until `technical-differences.md` confirms or refutes.
5. **Wizard-frame fit.** Now Gate 1 (see §4). Conditionally relevant — Gate 2 picks determine whether Gate 1's answer matters (see §7's decision tree).
6. **Standalone-API alignment.** Engine.js carries a standing rule that it's designed to become a standalone API. Does D3 (kernel + adapters) materially serve that rule, or is the alignment incidental?
7. **Platform-divergence risk.** A web-only resin pilot violates the standing web+iOS evaluation rule. For internal hobby use, the rule can be relaxed; for any public surface, it binds.
8. **Data migration risk** if sibling product later integrates. URL/share-link stability, App Store identity split, branding split — relevant only if a public sibling product ever ships.
9. **bambuinventory shape.** Filament inventory is Bambu-filament-order-specific (Gmail parsing, `tray_uuid`/AMS/RFID). Resin inventory needs new units, item types, vendor parsers, photoinitiator/exposure metadata, likely a separate schema lane. For owner-personal use, scope can be minimal.
10. **Roadmap blast radius.** v1.0.4 just shipped; v1.0.5 is queued; DQ-3/4/5 is the active FDM data-credibility arc. Any resin work must coexist without delaying FDM polish — or be explicitly chosen over it.

---

## 4. The two gates that must be answered before architecture choice

**v3 collapsed v2's three gates to two.** v4 keeps the two-gate structure but clarifies that **Gate 2 is evaluated first** in §7's decision tree — Gate 1 is conditional on which Gate 2 option owner picks.

### Gate 1 — Wizard-frame fit (desk-researchable; only relevant for Gate 2 ∈ {A, B, C, D, E})

**Question:** Does 3dpa's `printer → material → goals → outcome` wizard frame meaningfully advise on resin printing's *actual* tuning surface?

**Why this is *conditionally* primary:** When Gate 2 = C (full profile advisor) or B (per-printer cheat-sheet) or A (single-resin exposure lookup) or D (troubleshooter) or E (geometry helper), the wizard-frame-fit question shapes how much of the existing 3dpa scaffolding ports cleanly. When Gate 2 = F (safety checklist) or G (slicer-workflow guide), wizard-frame fit is irrelevant — those products don't depend on the wizard shape at all.

Resin printing's hard problems are STL-geometry-dependent: orientation (45° vs flat vs side-on), supports (auto-generated by the slicer with manual touch-up), hollowing (drain holes, wall thickness), and layer exposure (vendor-tuned per resin). The settings-advice 3dpa is shaped for is "given printer + material + goals, here are slicer numbers" — that's most of FDM's tuning surface but only the *layer-exposure* corner of resin's tuning surface. If 80%+ of resin advice is geometry-driven, settings-advice is the wrong product shape for resin even for an owner-only use case where Gate 2 = C.

**Method:** technical-differences mapping. Cite primary sources (manufacturer docs, Chitubox docs, prominent resin-printing communities — see §3 unknown #4 for initial source list). Quantify which fraction of "what a resin user wants to tune" is settings-only (advisable by the existing 3dpa wizard shape) vs geometry-dependent (not advisable without STL ingestion or a fundamentally different UX).

**Status:** mapping not yet drafted. Next artifact: [`technical-differences.md`](technical-differences.md).

**Cheap because:** owner-side desk research + primary sources. No traffic, no UI, no public surface, no Codex packets. Estimated wall-time: 1–2 sessions.

### Gate 2 — Owner-preference success target (primary in §7's decision tree)

**Question:** Where on the spectrum of plausible owner-personal resin products does the owner want to land?

v3 expanded v2's three-point spectrum into a wider option space, per bridge round 1 MF3 (off-axis products were missing). v4 retains the 7-option spectrum:

| ID | Shape | Scope | Gate 1 relevance |
|---|---|---|---|
| **A** | Single-resin-bottle exposure lookup (3-5 fields per resin × printer combo) | Tiny. Spreadsheet-grade. | Low — data-only |
| **B** | Per-printer settings cheat-sheet for ~5 personally-relevant printers | Small. Reuse FDM wizard frame; no engine work, just data. | Medium — wizard reuse |
| **C** | Full resin profile advisor (printer × resin × goals → numbers + warnings) | Medium. New data lane in `materials.json` shape; engine fork or kernel refactor. | **High — Gate 1 is decisive here** |
| **D** | Resin troubleshooter only (no profile advice) — symptoms × resin × printer | Small-medium. Parallel data lane in `data/rules/`. | Low — parallel structure |
| **E** | Geometry/orientation/supports helper (no profile advice) — coupled to STL | Medium-large. New UX surface; STL ingestion is novel scope. | Low — different problem shape |
| **F** | Safety/readiness checklist (PPE, ventilation, FEP integrity, vat condition) | Tiny. Static checklist, no engine. | **N/A — bypasses Gate 1** |
| **G** | Slicer/workflow guide for owner's chosen resin slicer | Small. Documentation, not engine work. | **N/A — bypasses Gate 1** |

**Why this is the primary gate (per §7):** A, B, C, D, E, F, G have radically different scope and feasibility. Some are pure data, some need new engine paths, some need new UX. They're not "the same product with different content depth" — they're different products entirely. The owner picks Gate 2 first; Gate 1's wizard-frame-fit % then either feeds the decision (A–E) or is bypassed (F, G).

**Method:** owner pick. Can happen any time. For Gate 2 = C specifically, owner-pick is best informed *after* Gate 1's wizard-frame-fit mapping lands (it determines whether C is feasibly small or structurally large).

**Status:** open. Pickable any time.

---

## 5. Hard structural couplings (mandatory work for ANY integrated path)

These are independent of which engine-architecture direction (D1/D2/D3) wins — every integrated path must address them. **v3 expanded v2's C1–C8 to C1–C15** per bridge round 1 MF1 + Codex's additional miss. **v4 adds a "Fires if" column** per round-2 SF-R2-2 so the conditional-cost framing is visible at the table level (not asymmetrically split between paragraph hedges and unconditional sizes). T-shirt sizes preserved; lines re-verified 2026-05-17 by Codex round 2.

| # | Coupling | Current location | Resin requirement | Size | Fires if |
|---|---|---|---|---|---|
| C1 | Schema validator hard-requires FDM fields | `engine.js:196` — every material must have `base_settings.nozzle_temp_base`, `bed_temp_base`, `retraction_distance` | Resin materials don't have nozzle temp, bed temp, or retraction. Validator must be tech-aware (or schema must fork). | M | Integrated path; any Gate 2 with resin material data ({A,B,C,D}) |
| C2 | `calcPrintTime` formula body is FDM-specific | `engine.js:3433` (`calcPrintTime`) — formula uses perimeter, infill lines, nozzle diameter, extrusion speed. Concept of "time = layer_count × per-layer-cost" generalizes; the specific cost terms don't. | Resin time estimation needs `(layer_count × exposure_time) + lift cycles + cure overhead`. Entirely different formula body. | M | Gate 2 ∈ {C}; print-time estimation is a profile-advisor feature |
| C3 | Slicer routing assumes parameter parity | `engine.js:533` (`SLICER_TABS` comment: "parameter keys are identical across slicers — only presentation changes") | Chitubox/Lychee/Prusa-SL1 don't share parameter keys with Bambu/Prusa/Orca. Routing must accept divergent schemas. | L | Gate 2 ∈ {C}; slicer-specific output is a profile-advisor feature |
| C4 | iOS bridge is FDM-typed at Swift level | `EngineService.swift:68` — `FilamentProfile`, nozzle temp, MVS-by-nozzle, cooling fan, advanced filament settings | Swift bridge types are filament-specific. JSCore can carry resin logic, but Swift consumption needs new types and SwiftUI surfaces. | L | iOS in scope; any Gate 2 that surfaces in iOS app |
| C5 | Warnings layer is filament/FDM-heavy | `engine.js:1473` (`getWarnings`) — enclosure, nozzle, AMS, drying, plate adhesion, MVS, heat creep, retraction-adjacent | Resin warnings (cure failure, FEP punch-through, vat leak, build-plate-resin incompat, ventilation/PPE) are entirely new categories. | M | Integrated path with warnings (Gate 2 ∈ {C,D}); F could reuse the warnings surface for safety |
| C6 | Analytics envelope has no `technology` discriminator | `app.js:1037` (`track('profile_generated', ...)` emission point; dedup-key block opens at `:1013`) + `functions/api/analytics.js:29` (`EVENT_KEYS` allowlist — 3 events, no `technology` key) | Mixing FDM + resin events into the same envelope pollutes the dashboard. Discriminator needs to land before any resin event fires. **Deferrable for owner-only use** if no analytics emitted. | S–M | Any Gate 2 that emits analytics events (deferrable) |
| C7 | Troubleshooter symptoms are FDM-coupled | `data/rules/` symptom data is filament/nozzle/bed-focused | Resin troubleshooter (warping during cure, support marks, partial cures, FEP delamination) is a parallel data lane, not an extension. | M | Gate 2 ∈ {D} (troubleshooter) or {C} with troubleshooter sub-feature |
| C8 | bambuinventory schema is filament-specific | `bambuinventory/setup.php` — `spools` table with `format ENUM('spool','refill')`, `weight_kg`, `color_code`, `tray_uuid`; `sync_emails.py` Bambu-order-parsing | Resin inventory needs units (mL/L/kg), item types (resin bottle / FEP film / vat / build plate consumables), vendor parsers (Bambu doesn't sell resin), photoinitiator/storage metadata. Realistically a separate schema lane. | L | Only if owner extends bambuinventory to resin; otherwise out-of-scope entirely |
| C9 | Input wizard / `getFilters` state shape is FDM-shaped | `engine.js:370` (`getFilters` function), `AppState.swift:7` (Swift app-state) — nozzle, filament, AMS/colors, build plate, extruder type, brim, ironing are baked in across both web + iOS state | Resin needs orientation, supports, hollowing inputs at the state-shape level. Not just a Gate 1 theory question — a concrete implementation coupling on both surfaces. | L | Gate 2 ∈ {C}; also {E} if geometry needs state-level input |
| C10 | Bambu Studio JSON export is FDM-only | `engine.js:2969` (`exportBambuStudioJSON`) — outputs Bambu's `{ process, filament }` JSON shape; FDM-specific keys | Resin export to Chitubox/Lychee/Prusa-SL1 needs new export function(s) per target slicer. Each slicer's JSON/CTB/SL1 file format is its own surface. | L | Gate 2 ∈ {C}; only if export to a resin slicer is in scope |
| C11 | Locales / i18n strings are FDM-vocabulary | `locales/en.json:15` (filter strings: "Printer", "Nozzle", "Material" — neutral; but deeper strings reference filament/nozzle concepts) + `locales/da.json` | Resin UI needs distinct vocabulary ("resin", "exposure", "FEP", "vat") in both languages. Manageable but non-trivial copy work. | S–M | Any Gate 2 with UI strings (all except A as raw data) |
| C12 | Analytics schema is event-allowlisted | `functions/api/analytics.js:29` — `EVENT_KEYS` is a hard allowlist of 3 events (`app_opened`, `profile_generated`, `feedback_opened`); dashboard queries are baked at `/api/analytics-query` | If any resin event ever fires, schema + handlers + dashboard panel need explicit changes. **Deferrable for owner-only use.** | S | Any Gate 2 with analytics; deferrable for owner-only |
| C13 | SEO / public copy claims FDM-only-by-default | Visible printer-count copy: `app.js:101` (English "supports 69 printers across 12 brands") + `app.js:107` (Danish "understøtter 68 printere fra 12 mærker"). SEO claims: `index.html:8` (meta description), `index.html:14` + `:20` + `:30` (Open Graph / Twitter / JSON-LD "60+" claims). Drift across the surface is already real (see footnote below). | If resin ever ships publicly, every count claim + descriptor copy needs deliberate update across web visible + web SEO. For owner-only use: no change, no public signal. | S–M | Any public-facing resin surface; skip for owner-internal |
| C14 | App Store metadata | `3dprintassistant-ios/docs/app-store-metadata.md:40` ("68 printers" claim) + screenshots + What's New strings | If resin ever ships in iOS: metadata, screenshots, What's New all need updates. For owner-only use: no change. | S–M | iOS public surface with resin; skip for owner-internal |
| C15 | iOS remote printer catalog overlay system | `3dprintassistant-ios/3DPrintAssistant/Services/PrinterCatalogProvider.swift:254` (`sanitizePrinter` validator) + the overlay-version contract documented in `docs/runbooks/printer-addition-protocol.md` | The overlay sanitizer hard-validates FDM printer fields. Resin printers would either fail sanitization or require a parallel overlay lane. | M | iOS in scope + integrated path that ships resin printers via overlay |

**Latent (not currently live, surface only if/when promoted):**
- **Share-link / state encoding** — backlog item #005 (encode app-state into URL for share links). Not live today. Becomes a hard coupling only if/when shipped — resin state would need to encode resin-specific fields in any share-link scheme.

**Costs sum, but visibly conditional.** A "minimal" integrated path (D1 with smallest scope) carries roughly C1, C2, C5, plus C9 (the wizard shape) as mandatory work — that's **1 L + 3 M-class items** (C9 L; C1, C2, C5 each M). Owner-personal use can defer C6, C12, C13, C14 (analytics + public surfaces); the "Fires if" column above makes the conditional structure visible — 5 of the 15 couplings (C3, C4, C8, C9, C10) collapse to "doesn't fire" under common Gate 2 picks (F/G in particular fire only C1, C5, C7, C11 with deferrals).

**Evidence the public-copy surfaces matter** (per bridge round 1 SF6, with round-2 location corrections): the printer-count claim is inconsistent today across at least three surfaces — **web English at [`app.js:101`](../../app.js:101) says 69; web Danish at [`app.js:107`](../../app.js:107) says 68; web SEO at [`index.html:8`](../../index.html:8), `:14`, `:20`, `:30` uses "60+" as the SEO claim (rounded down from 69); iOS App Store metadata at [`app-store-metadata.md:40`](../../../3dprintassistant-ios/docs/app-store-metadata.md:40) says 68 printers; ground-truth `data/printers.json` enumerates 69 printers across 12 brands.** This drift across visible web + SEO web + iOS App Store is direct evidence that copy/metadata IS a coupled surface in practice; it gets stale when changes don't propagate. Adding resin would compound the surface count.

---

## 6. Standing rules + active queue context

What's off-limits and what's currently in flight on the FDM product. Resin work must respect these to avoid colliding with mid-stream FDM polish.

**Off-limits during discovery (per PoC charter):** no live engine / data / UI changes to the FDM product. Discovery is docs-only.

**Standing rules that survive into any eventual implementation** (from [`../3dpa-context.md`](../3dpa-context.md) §Standing rules):
- One finding = one commit per platform. Web + iOS land separately.
- Web is master; iOS mirrors `engine.js` + `data/*.json` byte-identical.
- No silent assumptions — read the actual file before claiming behavior.
- **Data/logic-change evaluation is mandatory** — every engine/data improvement must include a "does this need UI changes on web + iOS" assessment. (Notably applies to any resin work integrating into the live engine.)
- iOS push gate — no push to `main` until ship-ready for TestFlight.
- Quality > speed. Web + iOS are live; fixes are full-correct on both platforms.
- Provenance everywhere — any new emission must carry `prov: { source, ref }`.

**Currently in flight on FDM (do not block):**
- v1.0.4 awaiting App Store review submission (owner-gated).
- v1.0.5 hygiene-pass carry queued (helper extraction, Min-1/Min-2 test work, FDM-only-scope-copy on a user-facing surface — owner-pick web About / footer / iOS Settings; the carry's existence reflects v2's awareness this discovery was coming).
- DQ-3/4/5 deferred but real (pressure-advance per material, retraction deltas, cooling curves) — the FDM data-credibility arc.

**Institutional context (dormant under owner-only constraint per §2 reframe; reactivates on any public signal):**
- 2026-05-15 printer-addition-protocol v4 declines resin at Phase 1 step 0 (`docs/runbooks/printer-addition-protocol.md` — FDM-only scope check, disqualifies MSLA / LCD / SLA / DLP / SLS / MJF). **For users, this remains correct.** Owner-internal exploration of resin doesn't reopen the user-facing scope.
- v1.0.5 carry includes "FDM-only scope copy on a user-facing surface" with phrasing chosen to preserve optionality. **For internal/owner use, no public copy change is needed.** The optionality language stays.
- The runbook hardline + scope-copy softline tension v2 worried about is **dormant unless/until any public surface ships.** The §2 audience reframe resolves the scope-copy half of the tension (owner-internal exploration ≠ public reopening). The runbook half — whether owner-personal docs need a separate institutional update flow distinct from user-facing runbooks — is **deferred to post-PoC.** If discovery later produces something owner wants to ship publicly (sibling site or 3dpa surface), both halves of the tension reactivate simultaneously and need re-evaluation.

---

## 7. Decision tree — Gate 2 first, Gate 1 conditional

**Restructured in v4** per bridge round 2 MF-R2-2 + owner Ask 5 Option A. v3's matrix mixed a flowchart with a truth table and left ~half of (Gate 1 × Gate 2) cells undefined. v4 collapses to a decision tree: **Gate 2 is evaluated first**; Gate 1 only enters the decision when Gate 2's chosen shape actually depends on wizard-frame fit.

### Step 1 — Owner picks Gate 2

Owner reviews §4 Gate 2's spectrum (A–G) and either:
- (a) picks one option (proceed to Step 2);
- (b) declines all of them and picks the **no-go** outcome (retire this directory; update v1.0.5 scope-copy from "out of scope (future implementation)" to "out of scope (decided 2026-MM-DD)");
- (c) opts to **park** the decision (proceed to the park rules in Step 3).

### Step 2 — Branch by Gate 2 pick

**If Gate 2 ∈ {F, G}** (safety/readiness checklist or slicer-workflow guide):
- Gate 1 is **bypassed entirely.** F and G aren't wizard-output-shaped — wizard-frame fit doesn't apply.
- **Outcome:** *owner-personal-minimal, no engine work.* Static content or markdown documentation. Couplings that fire (per §5): C1 (only if any resin data is stored; possibly skip for pure static content), C5 (if F uses the warnings surface for safety; otherwise skip), C11 (vocabulary; manageable), nothing else. Estimated scope: **half-day to 1 week.** No D1/D2/D3 decision needed.

**If Gate 2 ∈ {A, B}** (single-resin exposure lookup or per-printer cheat-sheet):
- Gate 1 is **informative but not decisive.** Wizard-frame fit affects how much existing scaffolding ports, not whether the chosen shape is feasible.
- **Outcome:** *owner-personal-minimal, data-only or data-mostly build.* Couplings that fire (per §5): C1 (schema must allow resin material entries), C11 (vocabulary), possibly C13 if any web surface is shared (skip for owner-internal). Estimated scope: **1–3 days for A; 1 week for B.** No D1/D2/D3 decision needed.

**If Gate 2 ∈ {D}** (resin troubleshooter only, no profile advice):
- Gate 1 is **partially relevant.** Troubleshooter is parallel to the profile advisor — wizard-frame fit affects whether the troubleshooter UI can reuse 3dpa's screens or needs a new surface.
- **Outcome:** *integrated path needed if reusing 3dpa UI; standalone if not.* Couplings that fire: C1, C5, C7 (the troubleshooter data lane), C11. Estimated scope: **1–3 weeks.** D1/D2/D3 decision applies only if reusing 3dpa engine; standalone build is its own thing.

**If Gate 2 ∈ {E}** (geometry/orientation/supports helper):
- Gate 1 is **largely irrelevant.** E is a fundamentally different product shape from the settings-advisor frame.
- **Outcome:** *integrated path is awkward; sibling product is cleaner.* Couplings that fire: C1, C9 (state-level input shapes), C11, plus novel STL ingestion (out-of-scope of §5 because no existing coupling exists for it). Estimated scope: **multi-month.** Recommend sibling product over integration for E specifically.

**If Gate 2 ∈ {C}** (full resin profile advisor — printer × resin × goals → numbers + warnings):
- Gate 1 is **decisive.** Wizard-frame-fit % determines whether the integrated path is viable.
- **Outcome depends on Gate 1's wizard-frame-fit answer:**
  - **Gate 1 result <25% settings-only** (wizard frame doesn't fit): **Pivot.** C is structurally wrong-shaped for resin even with owner-personal use. Recommend owner re-pick Gate 2 from {A, B, D, F, G}, or no-go.
  - **Gate 1 result 25–60%** (partial fit): **Integrated path needed, D1 or D2 favored.** Wizard ports partially; full kernel-refactor (D3) overkill. Couplings that fire: C1, C2, C3, C5, C9, C10, C11 (most of §5). Estimated scope: **1–3 months.** D1 simpler; D2 cleaner isolation.
  - **Gate 1 result >60%** (good fit): **Integrated path strongly justified, D3 attractive.** Wizard frame transfers cleanly; long-term API alignment favors kernel refactor. Couplings that fire: same as 25–60% plus the kernel refactor itself (out-of-scope of §5). Estimated scope: **3–6 months.**

### Step 3 — Park rules (when Gate 2 is too hard to pick or Gate 1 stays inconclusive)

The park outcome is real and honest — but it has a clock. **Per PoC charter §"Stop conditions" line 98**, the PoC ends after 4 weeks without convergence toward a decision (drift detection).

**Park rule:** if Gate 2 picked at Step 1 is "park" — or if Gate 2 = C and Gate 1's wizard-frame-fit mapping comes back as "inconclusive after one cycle" of `technical-differences.md` — then the **4-week charter clock starts.**

- **At week-4 expiry without convergence:** park collapses to **explicit no-go for now**, with a written "revisit triggers" list documenting under what conditions the discovery work can reopen. Initial revisit-trigger candidates (owner to refine):
  1. New evidence X — e.g., owner buys a resin printer and accumulates personal-use data.
  2. Owner-motivation pivot Y — e.g., the FDM credibility arc (DQ-3/4/5) ships and owner has bandwidth for a sibling.
  3. External signal Z — e.g., a 3dpa user explicitly requests resin (note: this contradicts the §2 audience reframe, so requires re-evaluation of whether audience is still owner-only).
- **No third extension without explicit re-charter.** If owner wants to extend past week 4, that's a new PoC charter, not a continuation. Forces a conscious "is this still worth doing?" question.

### Step 4 — Success criterion

The discovery work in this directory **succeeds** when the owner can credibly make one of the outcomes above — pick a Gate 2 + (if Gate 2 = C) interpret Gate 1's result + commit to an architecture or sibling-product or no-go. **Not when any specific outcome is reached.** Park-then-no-go-at-week-4 also counts as a credible decision; indefinite drift does not.

---

## 8. What this document is NOT

- Not a brainstorm prompt. The brainstorm happened on 2026-05-17 (link in §3).
- Not a design spec. No engine code is being proposed.
- Not advocacy for or against resin expansion. The document deliberately frames the decision as open.
- Not a complete reference. Specifics on architecture trade-offs live in the brainstorm artifacts; specifics on FDM internals live in `../3dpa-context.md`; per-decision evidence will accumulate in sibling files in this directory.
- Not a user-facing product spec — per §2, the audience is the owner. No user analytics, no user survey, no user-side validation in scope.
- Not stable across versions. v5+ (post-bridge-round-on-v4, if undertaken) would land here as a replacement, not a delta — the git history is the audit trail.

---

## 9. Open questions (carried into bridge round 3 if invoked on v4)

Things v4 is uncertain about, that bridge round 3 should pressure-test if it runs:

1. Does the §7 decision tree restructure (v4) actually resolve the orthogonality issue, or does it introduce its own non-trivial gaps? Hot spots to check:
   - Are the per-branch outcomes in Step 2 mutually exclusive and exhaustive within each branch?
   - Does the Gate 2 ∈ {D} branch handle "standalone" vs "reuse 3dpa UI" cleanly, or is the conditionality there as muddy as v3's matrix was?
   - Does the Gate 2 ∈ {E} branch's "sibling product" recommendation conflict with the §2 reframe (sibling implies public-ish surface)?
2. Are the §5 "Fires if" entries defensible per-row? Some judgments are borderline — e.g., C6 (analytics) for Gate 2 ∈ {A, B} is plausibly "deferrable" or plausibly "fires if data lookup is logged for owner-personal review."
3. Is the §5 footnote's printer-count drift surface enumeration complete, or are there other surfaces (e.g., the data validator's `60+` SEO claim in `index.html` Open Graph vs Twitter Card vs JSON-LD — three separate places that all need to update together; ROADMAP.md printer-count mentions; runbook copy)?
4. Is the 4-week park clock the right duration? Charter sets it at 4 weeks; §7 inherits without questioning. For desk-research-driven work that may need real resin printer purchase + use to advance, 4 weeks might be too tight.
5. Does §3 unknown #4's "substantiation owed" framing actually shift the load to `technical-differences.md`, or does v4 still implicitly treat the "no shared contract" claim as settled in §5 C3's costing?
6. Has anything in the live codebase shifted since v3 (now ~hours old) that would invalidate the §5 line refs?
7. Does the §6 "dormant unless/until any public surface ships" wording adequately frame the runbook-side deferral, or does it still understate the work that reactivates if public reopening happens?

---

## 10. Bibliography (sources this v4 cites)

- Bridge round 1 output: `../../../ai-operating-model/docs/autonomy-poc-2026-05-resin/bridge-rounds/bridge-2026-05-17-140610-702575.md`
- Bridge round 1 analysis + actions: `../../../ai-operating-model/docs/autonomy-poc-2026-05-resin/bridge-rounds/round-1-analysis.md`
- Bridge round 2 output: `../../../ai-operating-model/docs/autonomy-poc-2026-05-resin/bridge-rounds/bridge-2026-05-17-191217-933177.md`
- Bridge round 2 analysis + actions: `../../../ai-operating-model/docs/autonomy-poc-2026-05-resin/bridge-rounds/round-2-analysis.md`
- Brainstorm bridge output (the prior, settled work): `../../../ai-operating-model/docs/ensemble-pilot/2026-05-17-resin-comparison/bridge/bridge-2026-05-17-014912-440756.md`
- Brainstorm comparison: `../../../ai-operating-model/docs/ensemble-pilot/2026-05-17-resin-comparison/COMPARISON.md`
- PoC charter (4-week stop condition cited in §7): `../../../ai-operating-model/docs/autonomy-poc-2026-05-resin/charter.md`
- Project context: [`../3dpa-context.md`](../3dpa-context.md)
- ROADMAP (including the v1.0.5 FDM-only-scope-copy carry — proves the optionality language was deliberate): [`../planning/ROADMAP.md`](../planning/ROADMAP.md)
- Printer-addition protocol (v4 declining resin for users): [`../runbooks/printer-addition-protocol.md`](../runbooks/printer-addition-protocol.md)
- Photon Mono M7 Pro trial session log: [`../sessions/2026-05-15-cowork-appdev-printer-addition-protocol-trial.md`](../sessions/2026-05-15-cowork-appdev-printer-addition-protocol-trial.md)
- Engine source: `../../engine.js` (lines cited in §5)
- iOS engine bridge: `../../../3dprintassistant-ios/3DPrintAssistant/Engine/EngineService.swift`
- iOS printer catalog overlay: `../../../3dprintassistant-ios/3DPrintAssistant/Services/PrinterCatalogProvider.swift`
- iOS App Store metadata: `../../../3dprintassistant-ios/docs/app-store-metadata.md`
- bambuinventory schema: `../../../bambuinventory/setup.php`
- Worker / API routing: `../../worker.js` + `../../wrangler.toml`
- Analytics handler / event allowlist: `../../functions/api/analytics.js`
- Web printer-count drift sources (cited in §5 footnote): `../../app.js:101`, `../../app.js:107`, `../../index.html:8,14,20,30`
- Resin-slicer primary sources (§3 unknown #4 substantiation owed; for downstream `technical-differences.md`): [CHITUBOX print-settings docs](https://docs.chitubox.com/en-US/chitubox/latest/configure-print-settings), [Lychee Slicer resin-settings guide](https://lychee.mango3d.io/whats-new/the-best-resin-settings-for-your-printer-lychee-slicer-guide), [Prusa SL1 resin calibration](https://help.prusa3d.com/article/resin-calibration-sl1-sl1s_112182)
- Parked survey design (kept for general-feedback-pattern value, not for this work): [`audience-overlap-survey.md`](audience-overlap-survey.md)
