# Problem statement — resin scaling (v3)

> **Purpose.** Foundation document that downstream artifacts in this directory cite — technical-differences mappings, decision frameworks, eventual implementation plans (if any). Not a brainstorm prompt; not a design spec; not advocacy for or against expansion. Just the factual state-of-the-world plus the questions that must be answered before architecture choice.
>
> **Status:** v3 draft, post-bridge-round-1 + audience reframe.
> **Version history:** v1 was the original brainstorm prompt at `../../../ai-operating-model/docs/ensemble-pilot/2026-05-17-resin-comparison/prompt.md`. v2 (2026-05-17) added three gates + hard-coupling inventory but assumed user-facing audience implicitly and was missing 7 couplings. v3 (this file, same day) integrates bridge round 1 catches (MF1–MF4 + SF1–SF7) AND a load-bearing owner-side reframe: **the audience for this work is the owner himself, not 3dpa's users.**
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

The 2026-05-17 bridge-driven brainstorm (`../../../ai-operating-model/docs/ensemble-pilot/2026-05-17-resin-comparison/bridge/bridge-2026-05-17-014912-440756.md`) produced three engine-architecture directions and ten unknowns. Summarized here so v3 doesn't repeat that work:

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
4. **Resin-slicer landscape.** Chitubox, Lychee, Prusa SL1, manufacturer-bundled tools. Do any share a parameter contract? Almost certainly not — but the answer shapes whether `getSlicerForPrinter()` can extend or must fork.
5. **Wizard-frame fit.** Now Gate 1 (see §4). Primary blocker.
6. **Standalone-API alignment.** Engine.js carries a standing rule that it's designed to become a standalone API. Does D3 (kernel + adapters) materially serve that rule, or is the alignment incidental?
7. **Platform-divergence risk.** A web-only resin pilot violates the standing web+iOS evaluation rule. For internal hobby use, the rule can be relaxed; for any public surface, it binds.
8. **Data migration risk** if sibling product later integrates. URL/share-link stability, App Store identity split, branding split — relevant only if a public sibling product ever ships.
9. **bambuinventory shape.** Filament inventory is Bambu-filament-order-specific (Gmail parsing, `tray_uuid`/AMS/RFID). Resin inventory needs new units, item types, vendor parsers, photoinitiator/exposure metadata, likely a separate schema lane. For owner-personal use, scope can be minimal.
10. **Roadmap blast radius.** v1.0.4 just shipped; v1.0.5 is queued; DQ-3/4/5 is the active FDM data-credibility arc. Any resin work must coexist without delaying FDM polish — or be explicitly chosen over it.

---

## 4. The two gates that must be answered before architecture choice

**v3 collapses v2's three gates to two**, ordered by cost-to-answer rather than by mental priority. v2's ordering put audience first; bridge round 1 caught that this was wrong on cost economics (audience needed weeks of survey traffic; wizard-frame fit is desk research). With the §2 reframe collapsing the audience question entirely, the new order is structural: cheap-to-answer first.

### Gate 1 — Wizard-frame fit (primary, desk-researchable)

**Question:** Does 3dpa's `printer → material → goals → outcome` wizard frame meaningfully advise on resin printing's *actual* tuning surface?

**Why this is the primary gate:** Resin printing's hard problems are STL-geometry-dependent: orientation (45° vs flat vs side-on), supports (auto-generated by the slicer with manual touch-up), hollowing (drain holes, wall thickness), and layer exposure (vendor-tuned per resin). The settings-advice 3dpa is shaped for is "given printer + material + goals, here are slicer numbers" — that's most of FDM's tuning surface but only the *layer-exposure* corner of resin's tuning surface. If 80%+ of resin advice is geometry-driven, settings-advice is the wrong product shape for resin even for an owner-only use case.

**Method:** technical-differences mapping. Cite primary sources (manufacturer docs, Chitubox docs, prominent resin-printing communities). Quantify which fraction of "what a resin user wants to tune" is settings-only (advisable by the existing 3dpa wizard shape) vs geometry-dependent (not advisable without STL ingestion or a fundamentally different UX).

**Status:** mapping not yet drafted. Next artifact: [`technical-differences.md`](technical-differences.md).

**Cheap because:** owner-side desk research + primary sources. No traffic, no UI, no public surface, no Codex packets. Estimated wall-time: 1–2 sessions.

### Gate 2 — Owner-preference success target (secondary, owner-pick)

**Question:** Where on the spectrum of plausible owner-personal resin products does the owner want to land?

v3 expands v2's three-point spectrum into a wider option space, per bridge round 1 MF3 (off-axis products were missing):

| ID | Shape | Scope |
|---|---|---|
| **A** | Single-resin-bottle exposure lookup (3-5 fields per resin × printer combo) | Tiny. Spreadsheet-grade. |
| **B** | Per-printer settings cheat-sheet for ~5 personally-relevant printers | Small. Reuse FDM wizard frame; no engine work, just data. |
| **C** | Full resin profile advisor (printer × resin × goals → numbers + warnings) | Medium. New data lane in `materials.json` shape; engine fork or kernel refactor. |
| **D** | Resin troubleshooter only (no profile advice) — symptoms × resin × printer | Small-medium. Parallel data lane in `data/rules/`. |
| **E** | Geometry/orientation/supports helper (no profile advice) — coupled to STL | Medium-large. New UX surface; STL ingestion is novel scope. |
| **F** | Safety/readiness checklist (PPE, ventilation, FEP integrity, vat condition) | Tiny. Static checklist, no engine. |
| **G** | Slicer/workflow guide for owner's chosen resin slicer | Small. Documentation, not engine work. |

**Why this is a gate:** A, B, C, D, E, F, G have radically different scope and feasibility. Some are pure data, some need new engine paths, some need new UX. They're not "the same product with different content depth" — they're different products entirely. The owner picks based on Gate 1's answer and personal-use priority.

**Method:** owner pick, informed by Gate 1.

**Status:** open. Pickable after Gate 1 lands.

---

## 5. Hard structural couplings (mandatory work for ANY integrated path)

These are independent of which engine-architecture direction (D1/D2/D3) wins — every integrated path must address them. **v3 expands v2's C1–C8 to C1–C15** per bridge round 1 MF1 + Codex's additional miss. T-shirt sizes added per SF4. C2 wording softened per SF5. Lines verified 2026-05-17 against current `main` HEAD.

| # | Coupling | Current location | Resin requirement | Size |
|---|---|---|---|---|
| C1 | Schema validator hard-requires FDM fields | `engine.js` ~line 196 — every material must have `base_settings.nozzle_temp_base`, `bed_temp_base`, `retraction_distance` | Resin materials don't have nozzle temp, bed temp, or retraction. Validator must be tech-aware (or schema must fork). | M |
| C2 | `calcPrintTime` formula body is FDM-specific | `engine.js` `function calcPrintTime` around line 3433 — formula uses perimeter, infill lines, nozzle diameter, extrusion speed. (Concept of "time = layer_count × per-layer-cost" generalizes; the specific cost terms don't.) | Resin time estimation needs `(layer_count × exposure_time) + lift cycles + cure overhead`. Entirely different formula body. | M |
| C3 | Slicer routing assumes parameter parity | `engine.js` ~line 533 (`SLICER_TABS` comment: "parameter keys are identical across slicers — only presentation changes") | Chitubox/Lychee/Prusa-SL1 don't share parameter keys with Bambu/Prusa/Orca. Routing must accept divergent schemas. | L |
| C4 | iOS bridge is FDM-typed at Swift level | `EngineService.swift` ~line 68 — `FilamentProfile`, nozzle temp, MVS-by-nozzle, cooling fan, advanced filament settings | Swift bridge types are filament-specific. JSCore can carry resin logic, but Swift consumption needs new types and SwiftUI surfaces. | L |
| C5 | Warnings layer is filament/FDM-heavy | `engine.js` `getWarnings` around line 1473 — enclosure, nozzle, AMS, drying, plate adhesion, MVS, heat creep, retraction-adjacent | Resin warnings (cure failure, FEP punch-through, vat leak, build-plate-resin incompat, ventilation/PPE) are entirely new categories. | M |
| C6 | Analytics envelope has no `technology` discriminator | `app.js` ~line 46 + ~line 1013 (event emission) + `functions/api/analytics.js:29` (`EVENT_KEYS` allowlist — 3 events, no `technology` key) | Mixing FDM + resin events into the same envelope pollutes the dashboard. Discriminator needs to land before any resin event fires. **For owner-only use, may be deferrable** if no analytics emitted. | S–M |
| C7 | Troubleshooter symptoms are FDM-coupled | `data/rules/` symptom data is filament/nozzle/bed-focused | Resin troubleshooter (warping during cure, support marks, partial cures, FEP delamination) is a parallel data lane, not an extension. | M |
| C8 | bambuinventory schema is filament-specific | `bambuinventory/setup.php` — `spools` table with `format ENUM('spool','refill')`, `weight_kg`, `color_code`, `tray_uuid`; `sync_emails.py` Bambu-order-parsing | Resin inventory needs units (mL/L/kg), item types (resin bottle / FEP film / vat / build plate consumables), vendor parsers (Bambu doesn't sell resin), photoinitiator/storage metadata. Realistically a separate schema lane. | L |
| **C9** | **Input wizard / `getFilters` state shape is FDM-shaped** | `engine.js:370` (`getFilters` function), `AppState.swift:7` (Swift app-state) — nozzle, filament, AMS/colors, build plate, extruder type, brim, ironing are baked in across both web + iOS state | Resin needs orientation, supports, hollowing inputs at the state-shape level. Not just a Gate 1 theory question — a concrete implementation coupling on both surfaces. | L |
| **C10** | **Bambu Studio JSON export is FDM-only** | `engine.js:2969` (`exportBambuStudioJSON`) — outputs Bambu's `{ process, filament }` JSON shape; FDM-specific keys | Resin export to Chitubox/Lychee/Prusa-SL1 needs new export function(s) per target slicer. Each slicer's JSON/CTB/SL1 file format is its own surface. | L |
| **C11** | **Locales / i18n strings are FDM-vocabulary** | `locales/en.json:15` (filter strings: "Printer", "Nozzle", "Material" — neutral; but deeper strings reference filament/nozzle concepts) + `locales/da.json` | Resin UI needs distinct vocabulary ("resin", "exposure", "FEP", "vat") in both languages. Manageable but non-trivial copy work. | S–M |
| **C12** | **Analytics schema is event-allowlisted** | `functions/api/analytics.js:29` — `EVENT_KEYS` is a hard allowlist of 3 events (`app_opened`, `profile_generated`, `feedback_opened`); dashboard queries are baked at `/api/analytics-query` | If any resin event ever fires, schema + handlers + dashboard panel need explicit changes. **For owner-only use, may be deferrable.** | S |
| **C13** | **SEO / public copy claims FDM-only-by-default** | `index.html:7` (meta description) + web/iOS UI copy ("69 printers" claim drifts between en.json's `69`, da.json's `68`, App Store metadata's `68` — see SF6 below) | If resin ever ships publicly, copy/SEO needs deliberate update. For owner-only use: no change, no public signal. | S–M |
| **C14** | **App Store metadata** | `3dprintassistant-ios/docs/app-store-metadata.md:39` ("69 FDM printers" claim) + screenshots + What's New strings | If resin ever ships in iOS: metadata, screenshots, What's New all need updates. For owner-only use: no change. | S–M |
| **C15** | **iOS remote printer catalog overlay system** | `3dprintassistant-ios/3DPrintAssistant/Services/PrinterCatalogProvider.swift:254` (`sanitizePrinter` validator) + the overlay-version contract documented in `docs/runbooks/printer-addition-protocol.md` | The overlay sanitizer hard-validates FDM printer fields. Resin printers would either fail sanitization or require a parallel overlay lane. | M |

**Latent (not currently live, surface only if/when promoted):**
- **Share-link / state encoding** — backlog item #005 (encode app-state into URL for share links). Not live today. Becomes a hard coupling only if/when shipped — resin state would need to encode resin-specific fields in any share-link scheme.

**Costs add up.** Even a "minimal" integrated path (D1 with smallest scope) carries roughly C1, C2, C5, plus C9 (the wizard shape) as mandatory work — that's already 2 L + 2 M-class items. Owner-personal use can defer C6, C7, C12, C13, C14 (analytics + public surfaces), shrinking the integrated-path cost meaningfully.

**Evidence the public-copy surfaces matter** (per bridge round 1 SF6): the printer-count claim is already inconsistent today — web English says `69`, web Danish says `68`, App Store metadata says `68`. This drift is direct evidence that copy/metadata IS a coupled surface in practice; it gets stale when changes don't propagate.

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

**Institutional context (softened per the §2 reframe):**
- 2026-05-15 printer-addition-protocol v4 declines resin at Phase 1 step 0 (`docs/runbooks/printer-addition-protocol.md` — FDM-only scope check, disqualifies MSLA / LCD / SLA / DLP / SLS / MJF). **For users, this remains correct.** Owner-internal exploration of resin doesn't reopen the user-facing scope.
- v1.0.5 carry includes "FDM-only scope copy on a user-facing surface" with phrasing chosen to preserve optionality. **For internal/owner use, no public copy change is needed.** The optionality language stays.
- The runbook hardline + scope-copy softline tension v2 worried about is **largely resolved** by the §2 reframe: there is no public signal to manage if the discovery work stays internal.

---

## 7. Success criteria — orthogonalized

v2's §6 outcomes were not cleanly orthogonal to its gates (per bridge round 1 SF7), and were missing "evidence inconclusive" (per MF3). v3 reorganizes outcomes as a **function of gate answers**:

| Gate 1 result (wizard-frame fit) | Gate 2 result (owner-pick) | Outcome |
|---|---|---|
| **<25% of resin advice is settings-only** (wizard frame doesn't fit) | — | **Pivot:** off-axis product only (D/E/F/G from §4 Gate 2). The FDM-style settings-advisor shape isn't right for resin. Owner picks among non-profile shapes. |
| **25–60%** (partial fit) | A or B (lookup / cheat-sheet) | **Owner-personal minimal:** data-only build, no engine work. Solo session, ~1 day. |
| **25–60%** | C (full profile advisor) | **Integrated path needed:** pick D1/D2/D3 from §3. Substantial work; weigh against the §5 cost mapping. |
| **>60%** (good fit) | C (full profile advisor) | **Integrated path strongly justified:** the wizard frame transfers well; the settings-advice value-prop ports cleanly. D3 (kernel + adapters) becomes more attractive given long-term API alignment. |
| **Either gate inconclusive after one cycle** | — | **Park:** "evidence inconclusive / defer until after FDM credibility arc (DQ-3/4/5)." This is **the most likely actual outcome** given owner-only desk research + finite time. Park is not failure; it's honest acknowledgment that more data or more motivation will help. |
| **Owner decides at any gate not to pursue** | — | **No-go:** retire this directory; update v1.0.5 scope-copy from "out of scope (future implementation)" to "out of scope (decided 2026-MM-DD)." |

The discovery work in this directory **succeeds** when the owner can credibly make one of these calls — not when any specific outcome is reached.

---

## 8. What this document is NOT

- Not a brainstorm prompt. The brainstorm happened on 2026-05-17 (link in §3).
- Not a design spec. No engine code is being proposed.
- Not advocacy for or against resin expansion. The document deliberately frames the decision as open.
- Not a complete reference. Specifics on architecture trade-offs live in the brainstorm artifacts; specifics on FDM internals live in `../3dpa-context.md`; per-decision evidence will accumulate in sibling files in this directory.
- Not a user-facing product spec — per §2, the audience is the owner. No user analytics, no user survey, no user-side validation in scope.
- Not stable across versions. v4+ (post-bridge-round-on-v3, if undertaken) would land here as a replacement, not a delta — the git history is the audit trail.

---

## 9. Open questions (carried into bridge round 2 if invoked on v3)

Things v3 is uncertain about, that bridge round 2 should pressure-test if it runs:

1. Is §2's audience reframe applied **consistently** through the rest of the document, or are there residual user-facing assumptions baked into §4 Gate 2 (e.g., is option G's "slicer/workflow guide" still implicitly written for users)?
2. Is the §5 coupling table's t-shirt sizing defensible? Codex's prior verification covered the line refs; the sizing is my judgment without verification — could be off by one tier in either direction.
3. Is the §7 gate-result × outcome matrix actually orthogonal, or are there hidden interactions (e.g., does owner choice at Gate 2 feed back into Gate 1's interpretation)?
4. Is the "park" outcome in §7 too easy to land in? Does it need a sharper criterion to prevent indefinite drift?
5. Has anything in the live codebase shifted since v2 (now ~hours old) that would invalidate the §5 line refs?
6. Does §6 still under-weight the institutional context, or does the §2 reframe correctly resolve it?
7. Is the off-axis spectrum in §4 Gate 2 (A–G) the right partitioning, or are there shapes I missed that bridge round 1 also missed?

---

## 10. Bibliography (sources this v3 cites)

- Bridge round 1 output: `../../../ai-operating-model/docs/autonomy-poc-2026-05-resin/bridge-rounds/bridge-2026-05-17-140610-702575.md`
- Bridge round 1 analysis + actions: `../../../ai-operating-model/docs/autonomy-poc-2026-05-resin/bridge-rounds/round-1-analysis.md`
- Brainstorm bridge output (the prior, settled work): `../../../ai-operating-model/docs/ensemble-pilot/2026-05-17-resin-comparison/bridge/bridge-2026-05-17-014912-440756.md`
- Brainstorm comparison: `../../../ai-operating-model/docs/ensemble-pilot/2026-05-17-resin-comparison/COMPARISON.md`
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
- Parked survey design (kept for general-feedback-pattern value, not for this work): [`audience-overlap-survey.md`](audience-overlap-survey.md)
