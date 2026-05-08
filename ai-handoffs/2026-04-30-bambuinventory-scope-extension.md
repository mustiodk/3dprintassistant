# Bambuinventory scope extension to Phase 1 of the Pilot

**Date:** 2026-04-30
**Author:** Claude Code (Opus 4.7, 1M context)
**Trigger:** Owner asked, mid-afternoon, to run a Codex review on bambuinventory's printer-sync v1 (schema + api endpoints + planned daemon). Pilot was originally scoped to 3dpa only. Decision needed on whether to keep the work informal or formalize bambuinventory as a pilot subject.
**Pertinent commits:**
- `45b17e8` on `ai/operating-model-pilot` — `docs: extend ai-collab.md scope to bambuinventory (phase-1 pilot)`. Sits on the pilot branch, **not pushed** per pilot rule (branch stays local until end-of-pilot decision 2026-05-14).
**Status:** Decision landed and applied. Pilot now formally covers `3dprintassistant`, `3dprintassistant-ios`, AND `bambuinventory` in Phase 1.

---

## Why this doc exists

Per [`docs/ai-collab.md`](../docs/ai-collab.md) §Maintenance:

> Revise when a pilot, experiment, or accumulated evidence justifies a change. Use a dated handoff file (`../ai-handoffs/YYYY-MM-DD-*.md`) for the reasoning trail. This file gets updated; old versions live in git history.

The afternoon's `ai-collab.md` change (commit `45b17e8`) extended pilot scope to bambuinventory. That's a maintenance event under the spec's own rule. This doc captures the reasoning trail behind that decision so future-me (and end-of-pilot synthesis on 2026-05-14) understands *why* it happened, not just *that* it happened.

The doc was deferred twice — once at the afternoon Codex-review session log ("deferred to wrap-up"), once at the evening daemon-review session log ("deferred at this session"). Landing it now is the cleanup of that deferral.

---

## What changed

`ai-collab.md` §Scope (top of file):

**Before** (pre-`45b17e8`):
> **Scope:** This file governs AI-assisted work on the `3dprintassistant` (web) and `3dprintassistant-ios` repos.

**After** (post-`45b17e8`):
> **Scope:** This file governs AI-assisted work on the `3dprintassistant` (web), `3dprintassistant-ios`, and `bambuinventory` repos. Consulting work (`operating-model-mcs`, future engagements) follows a separate, vault-based operating model — see `Obsidian Vault/10-Projects/operating-model-mcs/`.
>
> **Bambuinventory added to phase 1 of the pilot 2026-04-30** — the general rules and scorecard apply; 3dpa-specific examples (`engine.js`, XCTest, iOS push gate, walkthrough harness) don't carry over.

Companion change: `ai-operating-model/CLAUDE.md` "Current state" table gained a new row for the bambuinventory pilot extension and flipped the "cross-project rules" row from ⏸️ deferred to 🟡 triggered (≥2 projects on the same model = the case opens).

---

## Three options that were considered

### Option A — Informal cross-project test (initial pick)

Run Codex on bambuinventory's printer-sync v1 as a one-off, without amending `ai-collab.md`. Treat the review as a guest-pass pilot test — interesting data point, not formal scope.

**Pro:**
- Zero spec changes; pilot stays clean at "3dpa only"
- One review's findings don't materially alter pilot evaluation
- If Codex review proves uninteresting, no commitment to roll back

**Con:**
- Scorecard data accumulates against a project not formally in scope — at end-of-pilot we'd have to decide whether to count it or not, retroactively
- `ai-collab.md` examples (engine.js, XCTest, iOS push gate) confuse Codex's role on a non-3dpa subject — Codex's first read is "does this rule apply here?"
- Sets a precedent that scope can be informal — erodes the operating model's small-and-clean discipline

### Option B — Formalize bambuinventory as a phase-1 subject (final pick)

Update `ai-collab.md` §Scope to cover bambuinventory explicitly. Acknowledge that 3dpa-specific examples don't carry over. Run all bambuinventory reviews under the formal scorecard going forward.

**Pro:**
- Apples-to-apples scorecard data for end-of-pilot evaluation
- Codex sees a coherent rule-set, not a "does this apply?" ambiguity
- Forces the spec to be honest about what's project-specific vs general — improves the model itself
- With ≥2 projects on the same model, the case for genuinely cross-project rules opens — that's a finding worth surfacing

**Con:**
- Mid-pilot scope change is a structural risk; it expands the experiment's surface area
- More token spend (review density goes up)
- Sets a precedent that scope can be expanded mid-pilot — makes "we're piloting X" less crisp

### Option C — Replace 3dpa as pilot target

Abandon DQ-3 (the original first-target review on 3dpa) in favor of bambuinventory printer-sync. Same pilot, different subject.

**Pro:**
- Tightest scope; one project, one review thread
- Bambuinventory has a clean, real design moment available immediately

**Con:**
- Gives up data on the original pilot subject
- 3dpa has more downstream pilot work planned (DQ-3 + scraper + branch-experiment in Week 2); bambuinventory is more bounded (this one daemon)
- Throws away the framing work already done in `ai-handoffs/` (4 rounds of multi-tool review)

---

## Why we picked B

Three reasons, in priority order:

1. **End-of-pilot evaluation needs comparable data.** The pilot's success metric is the scorecard pattern. If bambuinventory reviews feed scorecards under one rule set (formal phase-1 inclusion) and 3dpa reviews feed scorecards under another, the comparison gets noisy. Option A's "informal test" would have created two regimes.

2. **The cross-project rules question opens at ≥2 projects on the same model.** That's a finding the pilot exists to produce. Keeping bambuinventory informal would have postponed it; formalizing accelerates a useful decision-point at end-of-pilot.

3. **The scope-expansion precedent is acceptable when the new subject is a peer in scale and risk.** Bambuinventory printer-sync involves real schema, real concurrency, real 24/7 reliability — same risk class as 3dpa work. Adding a hobby Twitter button mid-pilot would be different (low-risk, no design decisions). The peer-scale criterion limits the precedent's reach.

The minor counter-argument that survived: this expansion does dilute the "3dpa is the pilot" framing slightly. The fix is to be explicit: bambuinventory is in phase 1 *alongside* 3dpa, not instead of it. The DQ-3 review remains queued. Both pilot subjects feed the same end-of-pilot decision.

---

## What this commits us to

- **All bambuinventory reviews going forward use the same scorecard format** as 3dpa reviews (per `ai-collab.md` §Scorecard).
- **3dpa-specific examples in `ai-collab.md` (`engine.js`, XCTest, iOS push gate, walkthrough harness) do NOT apply to bambuinventory.** The general rules and triggers do. The scope clause makes this explicit.
- **End-of-pilot synthesis (2026-05-14) considers data from both subjects.** Decision matrix in `ai-collab.md` §"End-of-pilot decision" applies to the combined evidence base.
- **Cross-project rules row in `ai-operating-model/CLAUDE.md` is now 🟡 triggered.** A genuinely cross-project rule needs ≥2 projects on the same model; we now have that. Decision deferred until end-of-pilot, but the precondition is met.

## What this does NOT commit us to

- **Adding more projects to the pilot.** Bambuinventory is the second; that's the cap unless evidence supports another expansion. Resist the pull toward "let's also pilot Accountant."
- **Pilot extension beyond 2026-05-14.** The end date is fixed.
- **Cross-project rule writing.** That decision lives in the end-of-pilot evaluation, not in this scope-extension act.

---

## Cross-references

- Live operating-model spec: [`../docs/ai-collab.md`](../docs/ai-collab.md)
- Operating-model project (meta-track): [`../../ai-operating-model/CLAUDE.md`](../../ai-operating-model/CLAUDE.md)
- The afternoon Codex review that prompted this extension: [`../../ai-operating-model/docs/sessions/2026-04-30-bambuinventory-printer-sync-codex-test.md`](../../ai-operating-model/docs/sessions/2026-04-30-bambuinventory-printer-sync-codex-test.md)
- The evening Codex review on the daemon (running under the now-extended scope): [`../../ai-operating-model/docs/sessions/2026-04-30-bambuinventory-daemon-codex-review.md`](../../ai-operating-model/docs/sessions/2026-04-30-bambuinventory-daemon-codex-review.md)
- The third (in-flight) Codex review on the ship-readiness plan: [`../../ai-operating-model/docs/sessions/2026-04-30-ship-readiness-plan-codex-review.md`](../../ai-operating-model/docs/sessions/2026-04-30-ship-readiness-plan-codex-review.md)
- Pilot branch: `ai/operating-model-pilot` in this repo (4 commits ahead of `origin`, unpushed per pilot rules until 2026-05-14)
