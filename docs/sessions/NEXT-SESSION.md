# NEXT-SESSION — 3dpa

**Purpose:** kickoff prompt for the next 3dpa session.

**Last updated:** 2026-06-15 (feedback-pipeline brainstorm + S1 spec wrap). Three owner feedback
items were brainstormed into a **5-spec plan** (S1→S5) with a fixed per-topic process. **S1's spec
is written, sub-agent-reviewed (10 findings, `patch-then-proceed`), patched, and QA-green.** The
**locked next entry is to write the S1 implementation plan** and run it through the same
review→patch→QA loop, then check in before S2. **No execution until explicit owner command** —
this is still spec/plan creation only.

**The 5-spec plan (build order = dependency order):**
1. **S1 — iOS contextual-feedback prefill fix.** `.sheet(item:)` migration across 8 sites/6 screens;
   iOS, push-gated. Spec QA-green. **← impl plan is the next deliverable.**
2. **S2 — intake capture completeness.** Widen the `/api/feedback` tee beyond `missingPrinter` +
   a misroute catch-all over general feedback → triage. Web, ships immediately. Absorbs Scout finding 2.
3. **S3 — Scout dedupe/triage robustness + learned-guardrails config.** Brand-alias/fuzzy +
   suffix-strip (absorbs Scout finding 1) + a versioned config the deterministic Scout reads. Web/script.
4. **S4 — Intake Retrospective (learning loop, Approach A).** Reflective propose-and-approve pass
   (reuses lesson-spotter + Curator patterns) that proposes guardrail diffs into S3's config. Depends on S3.
5. **S5 — Assistant autonomy ladder.** Branch + review note + PR + owner go/no-go, autonomy earned by
   guardrail maturity. Depends on S4.

**Process for every topic (owner-defined, mandatory):** write spec → sub-agent review → patch →
QA gate → (if green) write impl plan → sub-agent review → patch → QA gate → **check in with owner
before the next topic.** The impl plan splits execution into gates, each carrying its own
review/patch/QA — but **none of it executes until explicit owner command.**

---

>>> START >>>

Read in order:
1. `Projects/CLAUDE.md` (or `AGENTS.md`) — top-level rules.
2. `Projects/3dprintassistant/CLAUDE.md` + `docs/3dpa-context.md` — architecture + engine + standing rules.
3. `docs/planning/ROADMAP.md` — live status (Active Work Queue → "Feedback-pipeline evolution (5 specs)").
4. `docs/sessions/INDEX.md` + the last 3 session logs, especially
   `2026-06-15-cowork-appdev-feedback-pipeline-brainstorm-s1-spec.md` (the brainstorm + S1 spec wrap).
5. `docs/sessions/NEXT-SESSION.md` (this file).
6. **The S1 spec — `docs/superpowers/specs/2026-06-15-ios-feedback-prefill-fix-design.md` (QA-green; read in full).**
7. The S1-affected iOS files, to ground the plan's exact edits:
   `3dprintassistant-ios/3DPrintAssistant/Views/Feedback/FeedbackView.swift` + `FeedbackViewModel.swift`;
   `Views/Configurator/{Printer,Brand,Material,Nozzle}PickerView.swift`; `Views/Home/HomeView.swift`;
   `Views/Output/OutputView.swift`; `3DPrintAssistantTests/FeedbackTests.swift`.

Today's task:

**Write the S1 implementation plan** for the QA-green spec (use the writing-plans skill), then run it
through **sub-agent review → patch → QA gate**. The plan must split execution into gates, each with its
own review/patch/QA step. **Stop and check in with the owner once the S1 plan is done (do NOT start S2,
and do NOT execute any code).**

Scope:

- S1 is iOS-only (`.sheet(item:)` migration + `FeedbackPrefill: Identifiable` + init-based prefill apply +
  the two nil→`.generalFeedback` sites). Single commit when eventually executed (intermediate splits won't
  compile). No engine/data/web/overlay change.
- The plan must encode the **no-local-iOS-test reality**: CommandLineTools only (no full Xcode), data-only
  XCTest waiver is void (Swift change) → all test verification is CI/TestFlight or a full-Xcode Mac +
  manual on-device. Gate definitions must route verification accordingly.
- The plan must re-grep for any `FeedbackView(` / `.sheet(isPresented:` feedback presenter not in the
  spec's 8-site table, and prove the UITest's category assertion (on the rendered category-specific
  `TextField`s, not the `Picker(.menu)` value) is actually XCUITest-queryable.

Process steps:

1. Read everything above; confirm the spec's design is still the basis (don't re-litigate the QA-green spec).
2. writing-plans → gated implementation plan.
3. Sub-agent hostile/cold-read review of the plan → patch findings → QA gate (green/red, reported).
4. Check in with the owner; await go for S2 and, separately, for any execution.

Standing rules:

- ROADMAP is truth; read it before status claims.
- iOS push gate stays active; S1 commits stay local until the version is TestFlight-ready.
- Develop review-gated planning artifacts under a `claude-sync.sh hold`; release after the deliberate commit.
- One finding = one commit (S1 itself = one logical commit per the spec).
- Attachments don't reach the session — if the owner says "attached", ask for a plain-text paste.

<<< END <<<

## Maintenance Note

Regenerated on Trigger A / Trigger B / explicit owner ask only. The locked item is the **S1 implementation
plan** (spec is QA-green at `docs/superpowers/specs/2026-06-15-ios-feedback-prefill-fix-design.md`); the
broader arc is the 5-spec feedback-pipeline plan (S1→S5), one topic per spec+plan cycle, execution deferred.
