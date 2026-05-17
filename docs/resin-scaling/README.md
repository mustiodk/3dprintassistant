# Resin-scaling sub-project

> **Status:** Discovery. No commitment to ship. The job here is to produce decision-grade material — does 3dpa expand into resin (and how), become a sibling product, or stay FDM-only.

**Started:** 2026-05-17. **Triggered by:** owner's pivot from the locked v1.0.4 → ASC submission queue to a PoC vehicle that simultaneously (a) actually starts resin discovery, (b) tests bridge as a multi-round quality amplifier, (c) probes how far autonomy can be pushed in this workflow.

## Decision the artifacts here exist to inform

1. **Should 3dpa expand to resin printers?** Yes / no / yes-but-as-sibling-product.
2. **If yes (integrated), which engine architecture?** D1 single engine internal branch / D2 two engines + thin router / D3 kernel + tech adapters.
3. **If yes (sibling), what's the minimum viable sibling product shape?**

These three are deliberately ordered. (1) must be answered first; (2)/(3) only fire conditionally.

## What lives here vs. elsewhere

- **Here (`3dprintassistant/docs/resin-scaling/`)** — the resin product artifacts: problem statement, audience-overlap survey, technical-differences mapping, decision frameworks, eventual implementation plans if it ever comes to that.
- **`ai-operating-model/docs/autonomy-poc-2026-05-resin/`** — the PoC meta-track: charter, autonomy scorecard, bridge-round logs, owner-asks queue. The "how we worked" artifacts, not the "what we decided" artifacts.

Both directories are docs-only. Live engine/data/UI are untouched for the duration of the discovery work.

## Inputs (read before contributing to these artifacts)

- `../3dpa-context.md` — evergreen product context. Mandatory.
- `../planning/ROADMAP.md` — what's in flight on the FDM product (so resin discovery doesn't block live work).
- `../../../ai-operating-model/docs/ensemble-pilot/2026-05-17-resin-comparison/` — the original brainstorm (bridge + ensemble + COMPARISON.md). This is the starting point that the v2 problem statement is meant to improve on.

## Artifact index

| Artifact | Status | Path |
|---|---|---|
| Problem statement | drafting v2 | `problem-statement.md` |
| Audience-overlap survey design | pending | `audience-overlap-survey.md` |
| Technical-differences mapping (FDM vs resin) | pending | `technical-differences.md` |
| Decision framework | pending | `decision-framework.md` |

## Standing rules for work inside this directory

- **No live-product touches.** Engine, data, app UI, iOS UI, bambuinventory schema — all off-limits during discovery. Discovery is a docs-only exercise.
- **Each substantive artifact gets at least one bridge round.** Scaffolding files (this README, the artifact index) are solo. Real proposals are not.
- **Findings on AI-tool mismatches** land in `ai-operating-model/docs/findings/` per the existing ledger protocol — not in this directory.
- **Autonomy/process metadata** (escalations, time/tokens, owner-input batches) lands in `ai-operating-model/docs/autonomy-poc-2026-05-resin/scorecard.md` — not in this directory.
