# 3D Print Assistant, Phase 1 Autonomous Review

**Date:** 2026-07-05 · **Reviewer:** Claude (Fable 5), autonomous, read-only · **Kickoff prompt:** `docs/prompts/2026-07-05-fable5-phase1-review.md`
**Method:** cold read of the repo spine (ROADMAP, 3dpa-context, engine, data, sessions), five parallel sub-agent strands (engine/data deep read, web UX surface, iOS parity, ecosystem and prior-review delta, market and monetization research), followed by first-hand verification of every claim that two strands disagreed on. Contested claims and their resolutions are listed in Appendix A so this review can be audited.
**Companion spec:** `docs/specs/IMPL-042-share-and-discover.md` (deliverable 7).
**Boundary respected:** no code, data, or iOS source touched; no commits, pushes, or builds. One pre-existing untracked file noted: the kickoff prompt itself.

---

## 1. Understanding brief

1. **What it is.** A free, no-account, privacy-first recommender: printer x material x nozzle x goals in, a slicer-ready parameter set plus warnings and a pre-print checklist out, formatted for Bambu Studio, PrusaSlicer, or OrcaSlicer depending on the printer's brand (`docs/3dpa-context.md:11`, `engine.js:831`).
2. **One engine, two surfaces.** All logic lives in `engine.js` (3,535 lines); the web UI (`app.js`, 1,428 lines) and the SwiftUI iOS app consume it. iOS runs the byte-identical engine under JavaScriptCore. The separation is a standing rule because the engine is meant to become a standalone API someday (`docs/3dpa-context.md:30-41`, `CLAUDE.md:13`).
3. **Current scale, verified against the data files:** 74 printers across 14 brands, 19 materials, 9 nozzles (`data/printers.json`, `data/materials.json`, `data/nozzles.json`, counted 2026-07-05). Note that public copy lags this: the App Store description says 68 printers and older web copy says 69; see section 2.7.
4. **Live status:** web live on Cloudflare Workers + Assets; iOS v1.0.4 live on the App Store, v1.0.5 on TestFlight pending owner acceptance; remote printer overlay `content_version=2026070401` verified live (`docs/planning/ROADMAP.md:22`).
5. **The project's most unusual asset is operational, not code:** a semi-automated printer-intake pipeline (feedback tee, deterministic Scout triage, human-gated Addition Assistant, dormant learning loop, owner-gated autonomy ladder) that has already shipped five printers to live users without any app release (`docs/planning/ROADMAP.md:101-165`).
6. **Verification culture is far above hobby grade:** walkthrough harness, 47,196-combination matrix audit, data validator, 112 iOS unit tests, per-change runbooks (`docs/runbooks/profile-data-change-test-protocol.md`, `scripts/walkthrough-harness.js`).
7. **Owner constraints that bind every recommendation:** solo hobbyist, quality over speed, privacy-first as a product value (3 anonymous events, no IDs), FDM-only today with resin parked behind an explicit decision tree (`docs/3dpa-context.md:213-224`, `docs/resin-scaling/problem-statement.md`).

---

## 2. Current-state assessment

### 2.1 Engine: strong, and roughly 20 percent of it is invisible

`resolveProfile` (`engine.js:2114`) emits ~60 parameters with printer-capability clamping (`engine.js:908-960`), slicer-aware labels and pattern mapping (`engine.js:1016`), per-parameter "why" strings, and provenance sidecars. `getWarnings` (`engine.js:1473`) covers 26+ conditions including honest post-clamp attribution copy (the v1.0.4 accuracy work). This is genuinely deeper than what stock slicer profiles explain.

But several finished engine capabilities have no UI anywhere:

| Engine capability | Web UI | iOS UI | Note |
|---|---|---|---|
| `calcPurgeVolumes` (`engine.js:3367`) | none | none | AMS flush matrix with material multipliers. Backlog #001 says "previously shipped on web, needs restore". Market research ranks purge waste a top-3 unmet need in the Bambu ecosystem (section 3). This is the cheapest high-value gap in the product. |
| `calcPrintTime` (`engine.js:3436`) | yes (`app.js:1074`) | none | Web-only. |
| Troubleshooter (`engine.js:3410-3431`, 9 symptoms) | yes (`app.js:83,714`) | none | iOS ships the data and engine functions but no screen. |
| `getCompatibleNozzlesForPrinter` (`engine.js:2729`) | not called | not called | Exported after v1.0.4 HIGH-01 work, then never consumed. Could dim nozzles the selected printer cannot mount. |
| `formatProfileAsText` (`engine.js:3184`) | yes (copy button) | not exposed | iOS export/share is hidden pending post-release decision. |

### 2.2 The Safe/Tuned toggle over-promises relative to its data

The `_tier` mechanism (`engine.js:77`) is fully built and tested, but the entire Tuned data layer is three sparse blocks in `data/rules/objective_profiles.json:94,129,154` (one infill density, two speed/accel sets) and zero entries in `materials.json`. A user flipping to Tuned changes at most a handful of numbers. DQ-3/4/5 (pressure advance, retraction deltas, cooling curves; `docs/specs/IMPL-041-data-quality-phase.md`) are exactly the fill plan and have been deferred since April. Either fill the layer or soften the toggle's copy; the current state is the one place the product's honesty standard slips.

### 2.3 Retention and shareability: the weakest product surface

Verified: web persists only theme, language, and a do-not-track flag (`app.js:8,169-188`). The configured state is lost on refresh. There is no shareable URL (backlog #005), no saved presets (#012), no deep links. iOS is the same: `AppState` has no persistence, so every launch starts blank. For a tool whose whole job is producing a configuration, losing that configuration on every visit is the single most user-hostile behavior in the product, and it also blocks organic growth (nobody can link a result into a forum answer).

### 2.4 Export favors the minority brand path

Verified in `app.js:989-1010`: Bambu-brand printers get JSON export (Process + Filament, marked Beta at `index.html:128`); every other brand gets copy-as-text only. OrcaSlicer is the default slicer for 10 of 14 brands (`data/printers.json` brands table), so the majority path ends in manual transcription. The engine's slicer abstraction (`SLICER_PARAM_LABELS`, `mapForSlicer`) already does the hard mapping work; Orca and Prusa export writers are a bounded extension (Orca's JSON is a near-relative of Bambu's; PrusaSlicer uses ini). Also note the ROADMAP Current Snapshot row still says web export is disabled (`docs/planning/ROADMAP.md:24`); that is stale, see 2.7.

### 2.5 Cross-platform parity, honestly stated

iOS is a faithful port of the configurator core (wizard, output tabs, warnings, checklist, feedback, Safe/Tuned, provenance) plus three iOS-only strengths: the validated remote printer overlay, the respectful review-prompt gating, and contextual feedback prefill (v1.0.5). The gaps, all verified: no troubleshooter, no print-time estimator, no purge UI, export hidden, dark-mode only (ROADMAP v1.1 candidate), no iPad layout (PR-5), no state persistence. None are release blockers; together they make iOS the "second screen" rather than an equal. A single parity batch (troubleshooter + persistence + light mode) would close most of the felt difference.

### 2.6 Localization is shallower than it looks

The locale files cover UI chrome (242 keys en, 240 da; the two missing Danish keys are `secNozzleTemp_prusaslicer` and `secBedTemp_prusaslicer`). But all warning, checklist, and "why" copy is emitted as inline English strings from the engine (zero `warn`/`chk` keys in `locales/en.json`; `getWarnings` never calls `t()`). A Danish user gets Danish menus and English safety guidance. Any future language expansion (#019) is therefore much bigger than translating 242 keys, and should be costed honestly.

### 2.7 Documentation and copy drift (md-hygiene findings)

- `docs/planning/ROADMAP.md:24` Current Snapshot says web export UI is disabled; it has been live for Bambu printers (Beta) per `app.js:994-1004`.
- Printer-count drift across public copy: data has 74; App Store description says 68; the resin problem statement documented the same class of drift in May. Counts in copy will always rot; prefer "70+" style copy or generate the number.
- The 2026-05-10 comprehensive review left 8 of 15 findings open (verified sample: string-matched warning suppression at `engine.js:1390`, unguarded bed-temp clamp at `engine.js:1206`). They remain valid v1.0.5+ carries, none urgent.

### 2.8 Feedback and intake loop: excellent, with one contaminated claim

The loop (form, Discord, KV tee, Scout, Assistant, overlay) is the strongest process asset. S1 fixed the iOS prefill bug upstream of it; S2 widened capture to general feedback with PII scrubbing; S3/S4 made triage configurable and learnable. The 2026-07-04 Ender-3 V4 Combo run shipped correctly but is contaminated as an autonomy proof (Codex manually ran the Assistant half), so the honest status is: Scout autonomy proven, Assistant autonomy unproven, S5 pending a clean observer-only run (`docs/sessions/2026-07-04-cowork-appdev-ender3-v4-combo-intake.md`).

### 2.9 Analytics: privacy-correct, and blind where it matters for this review

Three events with rich dimensions on `profile_generated` (`docs/specs/analytics-v1.md`). You can answer "which printers/materials/modes are used" but not funnels, retention, or feedback conversion, by design. This review could not read live traffic (admin token not available to the reviewer), so no claim in this document depends on traffic volume; where scale matters I say so.

---

## 3. Domain and value analysis

### 3.1 Where 3DPA sits in the real FDM journey

The journey: buy printer, first prints on vendor defaults, buy third-party filament, hit problems (adhesion, stringing, warping), search for numbers, tune or give up, repeat per new material and new printer. 3DPA's genuine value today is the moment "I have this printer, this spool, this goal, give me a sane starting point and tell me what to watch out for", with explanations and provenance no slicer preset gives. The pre-print checklist and environment compensation (cold garage, humid room) are honest differentiators; nothing mainstream models the environment at all.

### 3.2 Where it stops short of the real need

1. **It opens the loop but does not close it.** After the first print, the user's question becomes "it stringed, what do I change?" The 9-symptom troubleshooter is a start; there is no guided calibration or adjust-retry flow. OrcaSlicer owns measurement (temp/flow/PA towers) but not interpretation; interpretation is unclaimed ground.
2. **Generic materials in a brand-specific world.** "PLA" spans a 15C temperature spread across brands. The #1 unmet need found in market research is settings for third-party filament on Bambu machines (community-built databases exist because vendors will not cover competitors' spools: forum.bambulab.com/t/3rd-party-filament-database/75269). 3DPA's `materials.json` is generic-only; backlog #020 is exactly this and is currently "Large / unscheduled".
3. **Multi-color waste.** Purge/flush tuning is a top complaint class for AMS users (default flush volumes are conservative; tuned per-pair volumes cut waste 60-70 percent per stldenise3d.com and the Bambu wiki). The engine already computes purge matrices; no UI shows them (2.1).
4. **Drying and moisture.** The data layer already carries per-material drying temp/duration; it surfaces only inside warnings and the checklist. The filament-dryer market is growing ~8.6 percent CAGR, a proxy for how mainstream this pain is.

### 3.3 Competitive reality (evidence in the market appendix of this section)

- **Commoditization pressure is real and concentrated exactly where users are.** Bambu is ~37 percent of entry-level shipments and its preset+RFID story removes the settings problem for its own filament. The defensible gaps are third-party filament, cross-brand knowledge, goal tradeoffs, and environment.
- **A direct competitor exists:** Minimal3DP's "Settings Assistant" (Nov 2025) is a free, no-account, browser, goal-slider settings recommender with a materials-science data story and a YouTube channel behind it (minimal3dp.com/blog/orcaslicer-expert-assistant-launch). It is slicer-generic where 3DPA is printer x nozzle specific, and it has no iOS app. Its existence validates the category and raises the stakes on distribution.
- **AI chat is the rising substitute.** Today it is unreliably wrong for settings (documented user frustration on the Prusa forum), but it improves. 3DPA's durable counter is deterministic, printer-specific, provenance-backed output; that argument should be made explicitly in the product's own copy.
- **The distribution gap is the real gap.** 3DPA has no content surface, a 3-URL sitemap, and lives on word of mouth; its strongest competitor-class (Obico's blog, Minimal3DP's channel) wins on distribution, not product depth. In solo-dev tools, distribution beats product.

### 3.4 Biggest openings, ranked

1. Be findable and linkable at all (share URLs + indexable pages generated from the engine's own output).
2. Surface the purge calculator (built, validated need, zero data work).
3. Native export for the OrcaSlicer/Prusa majority.
4. Third-party filament brand data, seeded by ingesting manufacturer preset repos (Polymaker publishes theirs on GitHub) rather than hand-curation.
5. Calibration interpretation companion (measure in Orca, understand in 3DPA).

---

## 4. Opportunity map

Columns per the review brief. Effort is calibrated to one careful person working evenings with the project's full test gate, not to a team.

### 4a. Get more from what exists

| Option | Value to user | Effort (solo) | Risk | Standing-rules and privacy check | My honest take |
|---|---|---|---|---|---|
| A1. Session persistence + shareable profile URLs (backlog #005/#012) | High: resume where you left off; paste a working config into any forum answer | Low (days; app.js only) | Low | Clean. No engine change, no PII in URLs, user-initiated sharing | Do this first. Smallest change with compound returns; foundation for landing pages. |
| A2. Restore purge calculator UI (web), backlog #001 | High for AMS/CFS users; validated top-3 unmet need | Low-medium (UI card; engine done at `engine.js:3367`) | Low | Clean; no data change | The cheapest real feature in the backlog. Ship soon after A1. |
| A3. OrcaSlicer + PrusaSlicer native export | High: ends manual transcription for 10 of 14 brands | Medium (per-format writers + import testing against real slicers) | Medium: format drift across slicer versions; needs the full engine test gate | Engine change, so full runbook gate + iOS sync + mandatory UI evaluation | Highest pure-product win. Schedule as its own arc with real import tests, like the Bambu Beta was done. |
| A4. Fill the Tuned layer (DQ-3/4/5, IMPL-041) | High for the pro audience; makes the toggle honest | High (sourcing pipeline + data entry + validation, multi-week) | Medium: unsourced numbers damage trust; maintenance treadmill | Provenance rule makes this heavy by design, which is correct | Worth doing, but after distribution. Ingest vendor preset repos to cut the manual cost. Meanwhile soften Tuned copy honestly. |
| A5. iOS parity batch (persistence, troubleshooter, light mode) | Medium: makes iOS feel first-class | Medium (one release train, v1.0.6) | Low | iOS push gate applies; no engine change | Bundle into one planned release rather than three. Not urgent; iOS users are not complaining yet (feedback volume low). |
| A6. Surface nozzle-per-printer compatibility (`getCompatibleNozzlesForPrinter`) | Small but real: stops invalid nozzle picks | Low | Low | Clean | Nice ride-along in any web UI session. Not a headline. |

### 4b. New features

| Option | Value to user | Effort (solo) | Risk | Standing-rules and privacy check | My honest take |
|---|---|---|---|---|---|
| B1. Static printer x material landing pages generated from the engine | High indirectly: this is how new users find the tool; each page is also a linkable answer | Medium (generator + template + sitemap; content is computed, not written) | Medium: SEO payoff uncertain and slow; staleness risk managed by runbook step | Clean. Static pages, no tracking. Generator reads engine read-only like the walkthrough harness | The growth move. Uniquely cheap for 3DPA because the "content" already exists as engine output. Pairs with A1. |
| B2. Filament brand database (#020), seeded from manufacturer preset repos | High: the #1 validated unmet need | High (schema + ingestion + upkeep across brands) | High: data treadmill; conflicts with generic-material simplicity | Additive schema per locked-schema rule; provenance mandatory | The right big bet eventually. Start narrow: one brand (Polymaker, public preset repo), PLA/PETG only, prove the ingestion path before widening. |
| B3. Calibration companion (guided test order + interpretation, Orca-aware) | High for tinkerers; differentiates against both slicers and AI chat | High (content-heavy, new UX surface) | Medium | Clean | Genuinely differentiated, but it is a content product as much as a code product. Later, and only if the appetite is real. |
| B4. Troubleshooter expansion 9 to 20+ symptoms (#016) | Medium | Medium | Low | Warning copy is English-only today; expansion deepens the i18n debt | Fine backlog item; not a lever. |
| B5. "My printers / my filaments" local-only profile (+ optional bambuinventory bridge) | Medium: repeat users skip re-picking | Low-medium (localStorage/AppSupport; no accounts) | Low | Privacy-clean if strictly local; bambuinventory bridge is personal-only, not a product feature | Do the local part as part of A1's persistence work. Keep the bambuinventory link a personal toy. |
| B6. Print cost estimator | Small-medium; popular ask class | Low | Low | Clean | Cheap goodwill feature; good "new contributor energy" task someday. |

### 4c. New directions

| Option | Value to user | Effort (solo) | Risk | Standing-rules and privacy check | My honest take |
|---|---|---|---|---|---|
| C1. Resin module | New audience | Very high (parallel parameter space; 15 documented couplings) | High | The parked decision tree exists precisely to prevent drift into this | Keep parked. Nothing in this review changes the calculus; FDM focus is winning. |
| C2. Engine-as-API / embeddable widget licensing | None directly; optionality | Medium to productize; near-zero to keep possible | Low if deferred | The engine/app separation rule is what keeps this option alive | Do not build. Keep the separation pristine; revisit only if an actual buyer appears. |
| C3. macOS app (#037) | Small | Medium | Low | Clean | Skip until desktop demand is evidenced. Web already serves desktop. |
| C4. Community-contributed profiles (#015/#022) | Medium | High (moderation, quality control) | High: trust dilution, accounts pressure | Accounts conflict with the core stance | Decline in current form. The intake pipeline is already the community channel, with quality control. |
| C5. B2B / print-farm tooling | None for current users | Very high | High | Different product, different values | Decline. |

### Recommendation

**Do A1 + B1 as one direction ("Share & Discover", specced as IMPL-042), with A2 (purge UI) as the first feature beneficiary, then A3 (Orca/Prusa export) as the next product arc.** The product depth already outruns its distribution by a wide margin; every competitor analysis point says distribution is the binding constraint, and A1/B1 is the only distribution move that is simultaneously cheap, privacy-clean, engine-untouched, and compounding. A4 (Tuned fill) and B2 (brand data) are the right deep-work bets after there is an audience to justify the treadmill.

---

## 5. Monetization analysis

The honest headline first: **at plausible traffic for this category, every stance-compatible channel combined yields roughly EUR 20-150 per month.** Nothing in this analysis funds the project; only distribution changes the ceiling. Evidence: tip averages of $3-5 and the observation that even top 3D-printing Patreon creators (with weekly content output) earn $1-4K/month while mid-tier sits far lower (graphtreon.com/top-patreon-earners/3d-printing); OrcaSlicer itself, the category's dominant free tool, is corporate-sponsored rather than donation-funded.

| Model | Fit with free / no-account / privacy-first | Realistic range | Verdict |
|---|---|---|---|
| Ko-fi / BuyMeACoffee link (web) + iOS tip-jar IAP | Perfect; zero data implications | EUR 0-30/mo | **Do now.** Near-zero effort, captures existing goodwill. Three tip sizes outperform one. |
| Disclosed contextual affiliate links (dryers on drying advice, filament on material pages, ideally on B1 landing pages) | Good if disclosed and contextual; retailer tracks the click, 3DPA tracks nothing | EUR 5-100/mo, scales with traffic | **Do with B1.** The only channel that compounds. Amazon rates in this category are ~3 percent; specialist retailers pay more. |
| Filament-brand relationship (product-for-data-validation, "verified against manufacturer presets") | Compatible if labeled; sponsorship cash would strain perceived neutrality | EUR 0 now; product value later | **Pitch once, low effort.** Polymaker has the most public program and a preset repo worth ingesting anyway (B2 synergy). |
| One-time Pro unlock (saved setups, export packs) | Compatible only if the free core stays whole | EUR 10-150/mo at meaningful iOS MAU | **Defer.** Revisit only after distribution work moves usage; a paywall on today's audience taxes the few users the project has. |
| Subscription Pro tier with sync | Conflicts: sync implies accounts implies identity | n/a | **Reject.** Contradicts the stance that is also the differentiator. |
| Ads | Conflicts: consent tooling, UX damage, ~EUR 10-30/mo at niche scale | n/a | **Reject permanently.** |
| Engine/data API licensing (B2B) | Compatible; no user data involved | EUR 0 near-term; only path with a real ceiling, speculative | **Keep the option, build nothing.** The engine separation rule already preserves it. |

**Recommendation: keep it free, and be explicit that this is a portfolio and craft project with beer-money monetization.** Ship the tip jar and, together with the landing pages, disclosed affiliate links. Treat any filament-brand contact as a data-quality play first, money second. Re-evaluate a Pro unlock only if analytics show sustained growth after the Share & Discover work.

---

## 6. Prioritized direction: Now / Next / Later

**Now (next few sessions, web-only, no release trains):**
1. IMPL-042 Phases A+B: session persistence, shareable URLs, Share button (spec ready; smallest high-leverage change in the repo).
2. Ko-fi/BMAC link on web (footer + support page).
3. Hygiene ride-alongs: the 2 missing Danish keys; fix the stale ROADMAP export row; align public printer-count copy (or de-number it).

**Next (1-2 months):**
4. IMPL-042 Phase C: landing-page generator, curated ~220 pages, sitemap, Search Console; decide affiliate links at the same time (owner call).
5. A2: purge calculator web UI (engine ready; market-validated).
6. A3: OrcaSlicer export first (10 of 14 brands), PrusaSlicer second, each with real import tests; full engine test gate.
7. iOS v1.0.6 parity train: state persistence (IMPL-042 section 6), tip-jar IAP, troubleshooter screen; light mode if capacity allows. One planned release, push gate respected.

**Later (quarter-plus, in order of preference):**
8. A4/DQ-3/4/5 Tuned-layer fill, seeded by ingesting manufacturer preset repos rather than hand-scraping.
9. B2 filament brand database, one brand pilot (Polymaker), narrow material set, additive schema.
10. B3 calibration companion, only with real appetite; B4 troubleshooter expansion as filler work.
11. Resin stays parked per its decision tree; S5 autonomy ladder proceeds on the process track after a clean observer-only run; engine-as-API remains an option, not a project.

Reasoning for the ordering: everything in Now is reversible, engine-untouched, and multiplies the value of later work; everything in Next either rides on Now (landing pages need URL state) or is a bounded product win (export, purge); everything in Later is a data or content treadmill that only pays off in front of an audience, which Now/Next exist to create.

---

## 7. Executable plan for the number-one pick

The full spec is `docs/specs/IMPL-042-share-and-discover.md` (goal, non-goals, design, phased tasks, web + iOS impact evaluation, test gate, rollout, risks, standing-rules check). Execution summary:

1. **Phase A (persistence):** state codec + localStorage restore, TDD-first with Node tests in the `picker-dry-run.test.js` style. One commit.
2. **Phase B (share URLs):** URL param encode/decode with id validation and graceful degradation, Share button, replaceState. Two commits (codec+tests, UI).
3. **Phase C (landing pages):** `scripts/generate-landing-pages.js` reading the engine via `vm` exactly like the walkthrough harness, curated 74 x 3 page set, regenerated sitemap, runbook regeneration step added to the printer-addition and profile-data-change protocols. Three commits (generator+tests, template+pages, runbooks).
4. **iOS impact (mandatory evaluation, done in spec section 6):** no engine/data delta, so no mirror work; iOS state persistence scheduled for the v1.0.6 train; universal links explicitly deferred.
5. **Test gate:** validate-data and walkthrough harness must stay green (proving engine/data untouched); new codec and generator tests; UI smoke both themes; post-deploy curl checks on two generated pages and one param URL (published is not delivered).
6. **Risks accepted:** SEO payoff uncertain and slow (mitigated: pages double as shareable answers regardless); staleness (mitigated: runbook step + dated generation line); thin-content (mitigated: curated set first).

---

## Appendix A: contested claims and how they were resolved

Sub-agent strands disagreed or erred on these points; each was resolved by reading the file first-hand on 2026-07-05:

| Claim | Resolution |
|---|---|
| Printer count "88" (web strand) vs "74" | 74 printers, 14 brands, counted from `data/printers.json`. |
| "Web export is disabled" (ROADMAP) vs "live Beta" | Live for Bambu-brand printers only (`app.js:994-1004`, `index.html:128`); ROADMAP row stale. |
| "Print time estimator not surfaced" (engine strand) | Surfaced on web at `app.js:1074`; absent on iOS (no Swift references). |
| "Web has a purge calculator UI" (iOS strand) | False; `calcPurgeVolumes` is called from no UI on either platform. Backlog #001 confirms it needs restoring. |
| "Warnings are fully translated" (web strand) | False; zero warning/checklist keys in locales, `getWarnings` emits inline English (`engine.js:1483` onward). |
| "Provenance not surfaced" (engine strand) | Surfaced on web Advanced via `_prov` sidecars (`app.js:1209-1246`) and on iOS per `docs/3dpa-context.md:115-121`. |
| "Prusa SL1S resin printer present in data" (engine strand) | False; no such id in `data/printers.json`. |
| Troubleshooter symptom count (8 vs 9 vs 12+) | 9, counted from `data/rules/troubleshooter.json`. |
| Danish locale completeness | 240 of 242 keys; missing `secNozzleTemp_prusaslicer`, `secBedTemp_prusaslicer`. |

Claims from the market strand rest on the cited external sources and are labeled as estimates where the underlying agent labeled them so; traffic-dependent revenue figures are order-of-magnitude, not forecasts.

---

# Version 2 addendum (2026-07-05, same session): export root cause + the Workshop direction

The owner reviewed V1 and redirected on two points: dig up why profile export has never been stable and plan its activation for all three slicers, and think bigger about a profile section that saves what worked, holds custom filaments, and lets the configurator learn. This addendum delivers both and revises the prioritized direction. V1 sections above are unchanged; where this addendum conflicts with them, the addendum wins.

## V2.1 Export: what actually happened, and the root cause

Full analysis and plan: `docs/specs/IMPL-043-slicer-export-activation.md` section 1. The compressed truth, verified against git history, session logs, and the live code:

- Export was built 2026-04-05 (`31d7d6c`), rejected by Bambu Studio the same day ("0 configs imported"), disabled (`ab7f0d8`), spot-fixed and re-enabled within 24 hours (`9465982`). **No successful import into Bambu Studio was ever recorded after the fix.** The Phase 2.7a import-test checkbox is still open today.
- The structural diagnosis was made three months ago: IMPL-036 (2026-04-07) correctly identified that export reverse-engineers slicer values out of human display strings through regex heuristics (`engine.js:2952-2968`, `engine.js:3016-3104`), so any copy change can silently corrupt exports. IMPL-036 was never implemented.
- Because export is a second, parallel emission pipeline, it drifts: the v1.0.4 audit caught unscaled fan and missing draft_shield (one fixed, `eaf3f09`); the unscaled-retraction finding HIGH-001 is still live in the code today with an acknowledging comment (`engine.js:3149-3152`).
- Root cause, stated plainly: **an architecture that parses display text instead of passing canonical values, combined with the absence of any verification loop against the real slicers.** Every individual bug is a symptom of those two. The feature shipped on assumption twice; nothing since has been able to prove it works or catch it drifting.
- Two corrections to the record while digging: the ROADMAP status row saying "web UI disabled" is stale (export is live for Bambu-brand printers behind a Beta badge, `app.js:994-1004`), and IMPL-036's "zig-zag is invalid" claim is contradicted by the newer IMPL-039 capability audit (`data/rules/slicer_capabilities.json` lists it as valid). IMPL-043 Phase 0 resolves that empirically instead of picking a document to believe.

The plan (IMPL-043) is verification-first: Phase 0 builds golden fixtures from real slicer exports and an export-audit harness before touching anything; Phase 1 executes the IMPL-036 principle with IMPL-039's existing `mapForSlicer` machinery so export becomes passthrough and can never drift silently again; Phase 2 hardens and actually validates Bambu; Phase 3 adds OrcaSlicer (the default slicer for 10 of 14 brands, so the majority of users get native export for the first time); Phase 4 adds PrusaSlicer `.ini` bundles. Each phase independently shippable, full engine test gate, iOS synced per train with its UI un-hidden only after web is proven.

## V2.2 The Workshop: profiles, custom filaments, a configurator that learns

Full spec: `docs/specs/IMPL-044-profiles-workshop.md`. The idea in one paragraph: the app is a brilliant calculator with amnesia, and the Workshop gives it memory without giving up the no-account privacy stance. Five phases: **W1** saved named profiles (pure app-layer, built on IMPL-042's codec); **W2** a print journal (worked/failed with troubleshooter-vocabulary tags); **W3** personal tuning, where accumulated outcomes generate explicit, accept-or-dismiss offset suggestions that become a third tier, Safe / Tuned / **Mine**, riding the existing `_tier()` override machinery (`engine.js:77`) with `personal` provenance; **W4** custom filaments as validated user-material overlays (backlog #020 approached from the private side, users encode their own spools); **W5**, the horizon, an opt-in community loop where shared tuned profiles flow through the existing intake moderation pipeline and fill the global Tuned tier with `community` provenance.

Why this matters strategically: it converts the review's two most awkward findings into each other's solution. The Tuned tier is nearly empty (V1 section 2) and the product has no retention surface (V1 section 2). The Workshop gives every user a reason to return, and W3/W5 fill the tuned layer from real outcomes instead of hand-curation. It also compounds with everything else: saved profiles are what you share (IMPL-042) and what you export (IMPL-043).

## V2.3 Revised Now / Next / Later (supersedes V1 section 6)

**Now (web-only, no release trains):**
1. IMPL-042 Phases A+B (persistence + share URLs). Unchanged from V1, and now doubly justified: the codec is also the Workshop's storage format.
2. IMPL-043 Phase 0 (golden fixtures + export-audit harness + the recorded import test that April never got). Roughly an hour of owner time, and it de-risks the whole export arc before any code changes.
3. Tip jar + the V1 hygiene ride-alongs (Danish keys, stale ROADMAP export row, printer-count copy).

**Next (1-2 months):**
4. IMPL-043 Phases 1-2: one-pipeline refactor + Bambu hardening, Beta badge earned off with a real import test.
5. IMPL-044 W1+W2: profile shelf + print journal (app-layer only, no engine risk, immediate retention value).
6. IMPL-042 Phase C: landing pages, now with "save this profile" as the CTA loop-closer.
7. iOS v1.0.6 train: state persistence parity + whatever of the above has proven itself on web.

**Later (quarter-plus):**
8. IMPL-043 Phases 3-4: Orca export (the big one, 10 of 14 brands), then Prusa.
9. IMPL-044 W3+W4: Mine tier + custom filaments (engine-touching, full gates, own trains). A2 purge calculator UI slots wherever a small win is needed between these arcs.
10. IMPL-044 W5 community loop: own spec, own owner decision, only once W2/W3 data exists. DQ-3/4/5 Tuned-layer fill continues to matter but W5 may end up being how it actually gets filled.

Ordering logic: Now is still reversible-and-multiplying; export truth-finding (Phase 0) moved into Now because it is cheap, blocks nothing, and everything export-related downstream depends on what it finds. The Workshop's app-layer phases jump ahead of Orca export because retention compounds earlier than reach widens; the engine-touching phases stay behind the export refactor so the engine is disturbed in one deliberate arc, not two interleaved ones.

## V2.4 What V2 changes about the honest assessment

V1 said distribution is the binding constraint, and that stands. V2 adds: the product has been carrying an unverified export surface for three months, and the fastest trust win available is making export provably work, then making it work for the Orca majority. Together the three specs form one coherent story: **IMPL-042 gets people in, IMPL-043 makes the answer usable in their slicer, IMPL-044 makes them come back.** That is the version-2 shape of the product.
