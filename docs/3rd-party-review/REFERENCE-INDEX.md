# Reference index — existing internal docs worth reading

The starter-kit files in this folder are self-contained, but several internal documents go deeper and are worth reading once you've absorbed the brief + architecture overview.

## Must-read

| Doc | What's in it |
|-----|---------------|
| [`CLAUDE.md`](../../CLAUDE.md) (web repo root) | Project rules — engine / app / data separation, PARAM_LABELS convention, IMPL-040 SSOT rule |
| [`3dprintassistant-ios/CLAUDE.md`](https://github.com/mustiodk/3dprintassistant-ios/blob/main/CLAUDE.md) | iOS rules — build commands, cross-device UI review workflow, data sync rule |
| [`docs/planning/ROADMAP.md`](../planning/ROADMAP.md) | **Single source of truth for all planning.** Status, phases, backlog, architecture reference, recent completed work. Replaces deprecated BACKLOG.md / IMPLEMENTATION_PLAN.md / TASKS.md. |
| [`docs/specs/IMPL-039-preset-clamping.md`](../specs/IMPL-039-preset-clamping.md) | Full spec for the printer-capability clamping + slicer-aware values refactor. Explains every design decision. |
| [`docs/specs/IMPL-040-chip-desc-parity.md`](../specs/IMPL-040-chip-desc-parity.md) | Full spec for the chip-desc / resolveProfile single-source-of-truth invariant. |

## High-value if you have time

| Doc | What's in it |
|-----|---------------|
| [`docs/research/3dprintassistant_ios_master_release_review.md`](../research/3dprintassistant_ios_master_release_review.md) | Prior 21-item ChatGPT code + release review from April 2026. All 21 items were resolved before v1.0 shipped. Useful to see what class of concerns have already been addressed vs. not. |
| [`docs/sessions/2026-04-16-cowork-appdev.md`](../sessions/2026-04-16-cowork-appdev.md) | Day-of-release log: iOS v1.0 approval, EU DSA trader status block diagnosis, web Tally → Discord feedback migration. Context for what the owner was dealing with just before the recent refactors. |
| [`docs/sessions/2026-04-17-cloudflare-functions-blocker.md`](../sessions/2026-04-17-cloudflare-functions-blocker.md) | How the Cloudflare Workers Builds migration broke the new `/api/feedback` Pages Function, and the minimal-config fix. Relevant if reviewing the deployment layer. |
| [`docs/sessions/2026-04-19-cowork-appdev.md`](../sessions/2026-04-19-cowork-appdev.md) | The session that discovered the "undefined" warnings bug (RB-1 engine-side code was never committed). Also the 0.30 → 0.28mm Draft bug discovery that seeded IMPL-039. |
| [`docs/sessions/2026-04-20-cowork-appdev-impl039.md`](../sessions/2026-04-20-cowork-appdev-impl039.md) | IMPL-039 execution log. Every design decision with rationale. |
| [`docs/sessions/2026-04-20-cowork-appdev-impl040.md`](../sessions/2026-04-20-cowork-appdev-impl040.md) | IMPL-040 execution log. |
| [`docs/research/UI-CRITIQUE.md`](../research/UI-CRITIQUE.md) | Standalone UI critique + design decisions. |
| [`docs/research/bambu-studio-export-spec-gemini.md`](../research/bambu-studio-export-spec-gemini.md) | Gemini-produced reference spec for Bambu Studio process preset JSON. Used when building `exportBambuStudioJSON`. |
| [`docs/research/bambu-studio-json-schema.md`](../research/bambu-studio-json-schema.md) | Field reference extracted directly from Bambu's Slic3r fork source. |

## Archived / lower-value

| Doc | Why skip |
|-----|----------|
| `BACKLOG.md` (web repo root) | Deprecated stub — says "merged into ROADMAP." |
| `IMPLEMENTATION_PLAN.md` (iOS repo root) | Deprecated stub. |
| `TASKS.md` (iOS repo root) | Deprecated stub. |
| `docs/prompts/*` | Claude Code session kickoff prompts — internal workflow, not useful for review. |
| `_archive/*` (web repo root) | Predecessor project (bambuguide). Not related. |

## Commits worth reading in context

Recent architecturally-significant commits on web `main`:

| SHA | Title | Why it matters |
|-----|-------|----------------|
| `c4c5071` | IMPL-040: single source of truth — chip desc == resolveProfile emission | Reviewed revision (web). |
| `2852cc2` | IMPL-039: printer-capability clamping + slicer-aware values | The big one before c4c5071. |
| `e734d0d` | Fix Draft layer height: 0.30 → 0.28 to match Bambu's printer-level limit | The bug that motivated IMPL-039. |
| `82e10ac` | Fix undefined warnings on web: return structured objects from getWarnings() | RB-1 completion — bridges back to old structured-warning contract. |
| `3856440` | Switch web feedback from Tally to Discord-backed modal | Recent feedback-flow rewrite. |
| `36f9131` | Unblock Cloudflare Functions: add Worker entrypoint | Deployment architecture change. |

On iOS `main`:

| SHA | Title |
|-----|-------|
| `24aef66` | IMPL-040: sync from web + CI-enforced chip desc parity guards ← reviewed revision |
| `851143f` | IMPL-039: sync from web + register slicer_capabilities.json |
| `433411f` | Bump MARKETING_VERSION 1.0.0 → 1.0.1 for TestFlight |
| `ad5c7da` | Sync from web: Draft layer height + full drift reconciliation |
| `f87b095` | Two pre-launch fixes: brand pre-selection + reset checkmark stickiness |

`git log --oneline` on each repo will show the full history.

## What doesn't exist (yet)

If you expect these and can't find them, it's because they haven't been written:

- Formal API docs for the engine public API (functions exported by `Engine`). Best reference is the `return { … }` block at the bottom of `engine.js`.
- A typed interface (TypeScript / JSDoc typedefs) for the engine. Filed as backlog #032 but deferred. Flag if you think it's critical.
- End-to-end integration tests that drive the UI and verify output. The test suite is unit-level only.
- Any SwiftUI snapshot tests — the cross-device UI review was done via `ScreenCaptureUITests.swift` which captures images but doesn't compare them.
