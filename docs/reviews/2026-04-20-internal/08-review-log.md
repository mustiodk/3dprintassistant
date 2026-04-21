# Review log

## Meta

**Reviewer:** Claude (internal, via `/code-reviewer` skill). Main-session orchestrator + four parallel focus agents.
**Date:** 2026-04-20.
**Commit references:**
- Web: `c4c5071` ("IMPL-040: single source of truth…"). Current `main` is `eba1bdd` ("docs: 3rd-party code + data review starter kit") — a docs-only commit on top. Code state matches the reviewed commit.
- iOS: `24aef66` ("IMPL-040: sync from web + CI-enforced chip desc parity guards"). Exact match to HEAD.

## Approach

Given the scope the review brief suggests (1-2 weeks of deep human review), this internal pass is intentionally breadth-first on the items flagged as high-priority in [REVIEW-BRIEF.md](../../3rd-party-review/REVIEW-BRIEF.md) and shallow-or-skipped elsewhere. Four parallel focused agents covered:

| Focus | Files read |
|---|---|
| Engine.js core (IMPL-039/040 helpers, clamping, mapForSlicer, getFilters, resolveProfile, exportBambuStudioJSON, getWarnings) | `engine.js` (full 2594 lines), `docs/specs/IMPL-039*.md`, `docs/specs/IMPL-040*.md`, `data/rules/slicer_capabilities.json` |
| iOS JSCore bridge + tests | `EngineService.swift`, `EngineServiceTests.swift`, `OutputViewModelTests.swift`, `PrintAssistantApp.swift`, `ContentView.swift`, `HomeView.swift`, `OutputViewModel.swift`, `AppState.swift`, `GoalsView.swift` |
| Data audit | `printers.json` (64), `materials.json` (18), `nozzles.json` (9), all 5 `rules/*.json`, the architecture-overview schema reference |
| Security + UI-layer leakage | `functions/api/feedback.js`, `worker.js`, `wrangler.toml`, `feedback-form.js`, `FeedbackService.swift`, `AppConstants.swift`, `PrintAssistantApp.swift`, `Info.plist`, `app.js`, `Views/**/*.swift`, `OutputViewModel.swift`, `SlicerLayout.swift` |

The orchestrator verified:
- Cross-platform byte-identity on 11 shared files (engine.js sha256 + `diff -q` on 10 others).
- The [CRITICAL-001] iOS direct-webhook claim against `FeedbackService.swift` source.
- The [LOW-001] Sentry DSN leak against `git log -p -S"ingest.de.sentry.io"` history (confirmed at commit `e707df4`).

## What I covered

- ✅ Full read of `engine.js` (via agent), with review focus on IMPL-039/040 helpers + exportBambuStudioJSON + getWarnings.
- ✅ Full read of `EngineService.swift` + `EngineServiceTests.swift`.
- ✅ All 8 shared data files read and cross-referenced against the documented schema in `ARCHITECTURE-OVERVIEW.md`.
- ✅ Security surface of the feedback flow (both platforms), Sentry init, localStorage usage, engine network calls.
- ✅ `app.js` (web UI) and key SwiftUI views for business-logic leakage.
- ✅ Byte-identical invariants between web and iOS (all 11 applicable files).

## What I did NOT cover

**Intentional skips (per REVIEW-BRIEF.md non-goals):**
- UI redesign / visual critique (done in April 2026 separately).
- Danish localisation completeness.
- macOS port feasibility.
- Data entry for printers not yet in `printers.json`.

**Skipped-due-to-scope (honest):**
- Full SwiftUI view tree review (only `Output*`, `Goals*`, `Home*`, `ContentView`, `PrintAssistantApp`). Did not systematically review `Configurator/Brand*/Printer*/Material*/Nozzle*` pickers, `Feedback/*` sheet, or `Shared/*`.
- Accessibility + dynamic-type checks.
- End-to-end import of `exportBambuStudioJSON` output into an actual Bambu Studio install — reviewed by schema comparison against `docs/research/bambu-studio-*.md` only.
- Full Prusa/Orca source verification for `slicer_capabilities.json` (spot-checked known patterns only).
- Bambu A1 mini `max_bed_temp` final confirmation (flagged as `?` rather than committed finding).
- Creality K-series available nozzle sizes against Creality's official SKU list.
- Fastlane / GitHub Actions / CI workflow security beyond static inspection.
- Running the XCTest suite — trusted the "20/20 passing" claim from recent CI.
- `exportBambuStudioJSON` output byte-level compare against vendor `bambu configs/` samples — relied on agent review only.
- Every material's drying temperature against vendor PDFs.

**Things I would want a human reviewer to double-check:**
- [CRITICAL-001] mitigation architecture — I recommend one concrete path; a security-minded eye should sanity-check the HMAC shared-secret approach vs. full OAuth.
- [HIGH-003] JSCore thread-affinity — this is a well-documented hazard but its production impact at iOS 18+ is conditional on runtime-scheduler behaviour I can't empirically test from this review.
- All domain-correctness flags in [06-data-audit.md](06-data-audit.md) — these are based on publicly-known specs and industry norms; the owner's hands-on printing experience should override any of them if they conflict.

## Findings tally

| Severity | Count | Notes |
|---|---|---|
| CRITICAL | 3 | +2 from Phase 1 walkthrough (CRITICAL-002, CRITICAL-003) |
| HIGH | 14 | +3 from Phase 1 walkthrough (HIGH-012, HIGH-013, HIGH-014) |
| MEDIUM | 22 | |
| LOW | 10 | |
| OBSERVATION | 10 | |
| **Total** | **59** | |

No findings were speculative — every one cites a specific file + line range, and the three most severe were manually re-verified before inclusion. Phase 1 added 5 findings from running 10 real printer × nozzle × material × goals combinations through the live engine ([domain-walkthrough.md](domain-walkthrough.md)).

## Time

This review was performed in a single session; not representative of the 1-2 week depth the brief targets. It should be read as a fast internal pass that raises the highest-signal items, not as a substitute for the planned external review.

## Note on severities

The review brief's severity rubric was followed literally:
- CRITICAL: damage printer / cause prevented failed print / corrupt export / leak secret.
- HIGH: wrong-but-not-dangerous recommendation / maintenance landmine / silent drift between two sources of truth.
- MEDIUM: code smell / perf / accessibility gap / missing coverage on risky path / inconsistent naming.
- LOW: nit.
- OBSERVATION: pattern worth knowing, not a problem.

One judgement call worth flagging: **[HIGH-001] retraction unscale in export** sits on the CRITICAL/HIGH boundary. It's called HIGH because the export file is still valid and imports cleanly — the defect is semantic (wrong value, correct shape). If "corrupt export" is read strictly (wrong value ≠ still valid), it'd qualify as CRITICAL. I left it HIGH because it doesn't damage hardware or prevent printing, only produces a sub-optimal retraction. Override my classification if the silent cross-platform drift (a specific class IMPL-039 was built to eliminate) matters more.
