# Review brief

## Context

3D Print Assistant (3DPA) is a configurator that converts a printer + nozzle + material + goals selection into a complete print profile (layer height, wall count, infill pattern, speed, temperature, retraction, support settings, etc.) for Bambu Studio, PrusaSlicer, and OrcaSlicer. Web app has been live since Feb 2026; iOS app has been live since April 2026 with 1.0.0 released and 1.0.1 now in TestFlight.

The project has just gone through two major architectural refactors in the past 48 hours:

- **IMPL-039** — introduced printer-capability clamping + slicer-aware pattern substitution. Every emitted value is now clamped to the target printer's real capabilities for that nozzle, and every pattern name (infill, support interface, wall generator, seam position) is mapped to a form the target slicer will actually accept on import.
- **IMPL-040** — introduced a single-source-of-truth invariant between the UI chip descriptions and the values `resolveProfile()` emits. Numbers shown to users in chip text are now computed at render time from the same functions that produce the profile — impossible for the chip label to lie about what the engine will output. CI-enforced via XCTest.

Before IMPL-039/040, the engine emitted a number of hardcoded values that could mismatch slicer-accepted ranges (the 0.30 → 0.28mm Draft layer-height bug was the loudest symptom). The refactors are what I want the most thorough review of — they change how the engine generates data, and they set the pattern for every future similar concern.

## What I want reviewed

### Architecture and code quality (web + iOS)

1. **Is the engine / app / data separation clean?** `engine.js` is shared between web and iOS, and is supposed to hold 100% of business logic; `app.js` (web) and the SwiftUI views (iOS) should be pure renderers. Check for leakage — places where business logic crept into the UI layer.

2. **Is the JavaScriptCore bridge correct?** iOS runs the same `engine.js` in a `JSContext` via JavaScriptCore, with a Swift-side `fetch()` polyfill that reads bundled JSON files. Look at `3DPrintAssistant/Engine/EngineService.swift` — is exception handling sound? Are there threading pitfalls? `EngineService` is declared as an `actor` — verify the actor isolation holds for all call sites.

3. **Are the new IMPL-039 / IMPL-040 patterns the right long-term direction?**
   - IMPL-039: `getPrinterLimits(printer, nozzle)` uses a universal formula (nozzle × 0.70 for max layer height, etc.) with an optional `printer.limits_override` escape hatch. Is this the right tradeoff vs. explicit per-printer-nozzle blocks in data?
   - IMPL-040: chip desc numbers are regenerated at render time from the same code path as emission. The guard tests assert parity for 45 combinations on iOS CI. Is this structurally sound or can it be gamed?

4. **Data schema health.** Look at `data/printers.json` (64 printers), `data/materials.json` (18 materials), `data/nozzles.json` (9), `data/rules/*.json` (environment, objective_profiles, warnings, troubleshooter, slicer_capabilities). Is the shape consistent? Are field names self-documenting? Are there redundant fields? Any JSON that should be a typed Swift struct / a TypeScript interface for safety?

5. **Slicer export correctness.** `engine.js` `exportBambuStudioJSON(state)` produces a Bambu Studio process preset. Vendor sample presets live in `bambu configs/` at the web repo root for comparison. Does our output import cleanly? Are any required fields missing? Any fields emitted with wrong types (string vs. array vs. number)?

6. **Domain correctness.** The underlying recommendations — layer heights, temperatures, speeds, retraction, nozzle compatibility — are made by a solo developer using his own printing experience, community norms, and vendor preset data. An experienced reviewer who prints regularly should spot-check: are any recommendations dangerous or obviously wrong? (High-severity examples to look for: emits a value that would ruin a print or damage a printer.)

7. **iOS UI correctness.** SwiftUI views in `3DPrintAssistant/Views/`. Specifically: view-model separation, `@Observable` + `@State` discipline, accessibility, dynamic type handling, navigation state. The code already went through a cross-device (SE / 17 Pro / 17 Pro Max) UI review in April.

### Data integrity

1. **Printers.json** — verify `manufacturer`, `max_speed`, `max_acceleration`, `max_nozzle_temp`, `max_bed_temp`, `enclosure`, `extruder_type`, `available_nozzle_sizes` are accurate against vendor spec sheets for at least the Bambu + Prusa + Creality + Voron printers. 64 entries is a lot; a spot-check of the top-10 most-sold printers is enough.

2. **Materials.json** — verify `base_settings` (nozzle_temp_base / min / max, bed_temp_base, speed, MVS) are within reasonable ranges for each filament group. Especially flag anything that would encourage users to print at a temp that could cause clogs, delamination, or toxic offgassing.

3. **Slicer capabilities** — `data/rules/slicer_capabilities.json` is new. It claims which patterns/generators each of Bambu / Prusa / Orca supports. Verify against the actual slicer source repos for accuracy. The fallback map (e.g. "Cross Hatch" → Prusa "Rectilinear") should be reviewed for semantic fidelity.

### Security + privacy

1. **Feedback flow.** Both platforms submit feedback via Discord webhooks. Web uses a Cloudflare Worker at `/api/feedback`; iOS posts directly to a webhook whose URL is in `Config.xcconfig` (gitignored) injected into `Info.plist`. Check: any way an attacker could exfiltrate the webhook URL from the iOS binary? Any way the web `/api/feedback` could be abused as an open relay?

2. **Sentry + privacy.** `sendDefaultPii = false`, `attachScreenshot = false`, `attachViewHierarchy = false`. Verify iOS code honors these. Privacy policy at `https://3dprintassistant.com/privacy`.

3. **localStorage on web.** Used for language + theme persistence. All reads are wrapped in try/catch for private browsing. Verify nothing sensitive is stored.

4. **No telemetry on the engine itself** — the engine does not call out to the network. Confirm via source inspection.

### Release + ops

1. **iOS CI pipeline.** `.github/workflows/testflight.yml` + `fastlane/Fastfile`. Looks for obvious issues: secret handling, Keychain lifetime, version bump logic (uses timestamp for `CFBundleVersion`). The `MARKETING_VERSION` must be bumped manually per release (1.0.0 → 1.0.1 happened yesterday when the pre-release train closed).

2. **Web deployment.** Cloudflare Workers Builds (not legacy Pages). `wrangler.toml` + `worker.js` split static assets from `/api/*`. Review for completeness.

3. **Rollback paths.** How do we roll back a bad web deploy? (git revert + push, auto-deploys.) A bad iOS TestFlight build? (ASC "expire build" on the TestFlight console — blocks testers; doesn't reach App Store.) Any gaps?

## Focus intensity (where to spend the most time)

**High priority (please spend 60%+ of your time here):**
- `engine.js` lines 600–2200 — `getPrinterLimits`, `_clampNum`, `mapForSlicer`, `patternFor`, `getFilters(state)`, `resolveProfile`, `getWarnings`, `exportBambuStudioJSON`.
- IMPL-039 spec ([docs/specs/IMPL-039-preset-clamping.md](../specs/IMPL-039-preset-clamping.md)) and IMPL-040 spec ([docs/specs/IMPL-040-chip-desc-parity.md](../specs/IMPL-040-chip-desc-parity.md)) — are the patterns sound?
- `data/rules/slicer_capabilities.json` — is the value set accurate?
- `data/rules/objective_profiles.json` — is the stripped-to-qualitative desc approach clean?
- iOS `3DPrintAssistantTests/EngineServiceTests.swift` — are the guard tests meaningful? Do they cover the right surface area?

**Medium priority:**
- SwiftUI view tree under `3DPrintAssistant/Views/`.
- `data/printers.json`, `data/materials.json` — spec accuracy spot-check.
- Slicer export correctness (`exportBambuStudioJSON`).
- Feedback flow security.

**Low priority (skim, flag if obvious issues):**
- CI/build scripts.
- `style.css` (design review was done separately).
- Test infrastructure beyond the engine tests.

## Non-goals (please skip)

- **Don't propose new features.** Product scope is managed in [ROADMAP.md](../planning/ROADMAP.md).
- **Don't redesign the UI.** Cross-device UI review was completed 2026-04-14.
- **Don't rewrite `engine.js` in TypeScript** (unless you think it's critical — in which case flag as a separate recommendation, don't do it).
- **Don't touch data entry for the backlog of printers not yet added.** That's community/data work, not code review.
- **Don't propose a macOS port** — that's scheduled separately (backlog #037).
- **Don't evaluate the Danish localization work** — separately tracked.

## Severity classification

Please tag every finding with exactly one of:

- **CRITICAL** — will damage user's printer, cause failed prints the engine should have prevented, corrupt their export, or leak a secret. Ship-blocker.
- **HIGH** — degrades user experience noticeably, makes a recommendation that experienced users would recognize as wrong, introduces maintenance landmines, or creates silent drift between two sources of truth.
- **MEDIUM** — code smell, performance concern, accessibility gap, missing test coverage on a risky code path, inconsistent naming that would slow down future engineers.
- **LOW** — nit, style, docstring gap, small cleanup.
- **OBSERVATION** — not a problem but worth knowing. Pattern the reviewer noticed that could apply elsewhere.

## Timeline

No hard deadline. Aim for 1–2 weeks of deep review. The product is live and not under active feature pressure — the owner would rather have a thorough report than a fast one.

## Deliverable

See [DELIVERABLE-TEMPLATE.md](DELIVERABLE-TEMPLATE.md).
