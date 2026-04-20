# Deliverable template

## Format

One markdown document per top-level section. Everything under version control in a git repo or a tarball — no PDFs, no Google Docs (we want findings diffable + searchable).

Prefer **specific, reproducible findings** over vague impressions. "I noticed…" / "This feels…" / "The vibe is…" are not actionable and should not appear in the final report.

## Output structure

```
review/
├── 00-executive-summary.md     ← ≤500 words. For the owner who may not read
│                                 every finding in detail.
├── 01-critical.md              ← All CRITICAL findings.
├── 02-high.md                  ← All HIGH findings.
├── 03-medium.md                ← All MEDIUM findings.
├── 04-low.md                   ← All LOW findings.
├── 05-observations.md          ← OBSERVATION-tagged notes.
├── 06-data-audit.md            ← Results of the printer / material / slicer
│                                 capability data review.
├── 07-recommendations.md       ← Longer-form architectural suggestions.
│                                 One per recommendation, titled + scoped.
└── 08-review-log.md            ← Meta: your time spent, what you reviewed,
                                  what you skipped, what you couldn't verify.
```

## Finding template

Every finding (regardless of severity) uses this exact shape:

````markdown
### [SEVERITY-NNN] Short title (≤70 chars)

**Platform:** web | iOS | both | data | docs | infra
**Files:** `path/to/file.ext:LINE-LINE`, `other/file.ext:LINE`
**Commit:** c4c5071 (web) or 24aef66 (iOS)

**Summary**
One paragraph describing what's wrong. Be specific. Include a code or config
snippet if the issue is structural.

**Evidence**
```js
// The problematic code, with line numbers if possible.
```

**Impact**
- What breaks, for whom, under what conditions.
- If correctness — what's the wrong output?
- If security — what's the attack vector?
- If maintainability — what future change is now harder?

**Recommendation**
How to fix it. Ideally concrete enough that the owner can implement without
back-and-forth. If a fix requires tradeoffs, list them.

**Effort estimate:** trivial | small (< 1 day) | medium (1–3 days) | large
````

Number findings sequentially within each severity (CRITICAL-001, CRITICAL-002, etc).

## Executive summary requirements

The owner will read the executive summary first. Cover:

1. **Overall health** — one-sentence verdict. Green / yellow / red. Be honest.
2. **Top 3 CRITICAL or HIGH findings** — the ones that most warrant immediate action.
3. **The IMPL-039 + IMPL-040 refactors** — are the patterns the right direction? Would you ship them?
4. **Data correctness** — was the spot-check of printer / material / slicer specs clean? Any dangerous recommendations in the engine's output?
5. **What's NOT a concern** — areas that looked solid and don't need work. (This is valuable signal — tells the owner where they're already doing well.)
6. **What you didn't cover** — honesty about scope limits.

No more than 500 words. Bullet-heavy. Link to the full findings for detail.

## Data audit table format

In `06-data-audit.md`, use a table per data file. Example:

```markdown
## data/printers.json spot-check

| Printer | Field | Current value | Authoritative source | Accurate? | Notes |
|---------|-------|---------------|----------------------|-----------|-------|
| X1 Carbon | max_speed | 500 | Bambu Lab spec sheet | ✓ | |
| Prusa MK4 | max_acceleration | 4000 | Prusa wiki | ✗ Should be 5000 | Firmware 5.0+ raised limit |
| K1 Max | max_nozzle_temp | 300 | Creality spec | ⚠ Listed 280 elsewhere | Conflicting sources |
```

Focus on the top-10 most-sold / most-used printers. Full 64-printer audit is appreciated but not required.

## Recommendation format

`07-recommendations.md` is for larger suggestions — refactors, new abstractions, test strategy shifts — that don't fit the finding-level template.

Each recommendation:
- **Title** (action-oriented): "Extract material × printer-class speed cap table"
- **Motivation**: what problem this solves
- **Proposed shape**: enough detail that the owner can evaluate feasibility
- **Tradeoffs**: what gets harder / slower in exchange for what gets better
- **Alternatives considered**: what else was on the table, why this won
- **Effort estimate**: rough range

## Invariants to report on explicitly

Please include a short statement on whether each of these holds at the reviewed commit:

- [ ] `engine.js` (web) is byte-identical to `3DPrintAssistant/Engine/engine.js` (iOS)
- [ ] All 8 shared data files in `data/` + `data/rules/` are byte-identical between web and iOS
- [ ] Both locale files (`en.json` / `da.json`) are byte-identical between web and iOS
- [ ] No business logic leaks into `app.js` (web) or into SwiftUI views (iOS) — engine is the only place it lives
- [ ] iOS `EngineService` is an `actor` and all calls into `JSContext` go through it
- [ ] For the 5 canonical combos in IMPL-039 spec, `exportBambuStudioJSON` produces valid JSON that matches the vendor preset schema (per the samples in `bambu configs/`)
- [ ] The IMPL-040 invariant holds for every (printer × nozzle × surface preset) combo — chip desc number equals emitted number
- [ ] iOS `EngineServiceTests` pass (20/20, including the two IMPL-040 guards)
- [ ] No secret is committed to either repo's history (scan for DSN, webhook URL, API keys)

For each ✓: one-line confirmation + how you verified.
For each ✗: link to a finding.

## Submission

Preferred:
1. Fork of the web repo with a `docs/reviews/2026-04-YY/` folder containing the deliverable.
2. PR to `main` tagged as `review:` in the title. Owner will merge after reading.

Alternative: tarball emailed directly, or a private gist. Either works.

## Questions during the review

Open a GitHub Issue on the relevant repo with `review:` prefix in the title. The owner responds within 24 hours typically. For urgent / security issues, contact by private channel first.
