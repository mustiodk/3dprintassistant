# 2026-06-15 — Cowork (appdev): Feedback-pipeline brainstorm + S1 spec

## Durable context

- **The driving insight:** the iOS contextual-feedback prefill bug (item 3) is a *mechanical cause* of "printer requests we never see" (item 1). On iOS, "Printer missing?" opens the feedback sheet defaulted to **General feedback**, which the web tee does not forward to the Scout — so those requests are invisible. Fixing the form (S1) repairs the funnel; capturing the residual (users still misroute) is S2. The two are independent and ship on different paths (S1 = iOS/TestFlight; S2 = web/immediate).
- **Learning-loop direction = Approach A (locked):** both agents "evolve" via a reflective, propose-and-approve pass *between runs* (the "Intake Retrospective", reusing the **lesson-spotter** read-only-candidate pattern + the **Curator** propose-and-approve structured-diff mechanism), which proposes diffs to a **versioned learned-guardrails config** the deterministic Scout reads. **Runtime stays deterministic and auditable — no LLM-in-the-loop at decision time.** "Defined guardrails" = static contract; "learned guardrails" = owner-ratified config accretion. Autonomy (S5) is *earned* by guardrail maturity — so S4 (learning loop) and S5 (#2 more-automation) are the same project: the loop is the evidence engine that justifies more autonomy. Approach B (runtime reasoning) was explicitly rejected; C (selective B later) only if A's evidence demands it.
- **Owner-defined process for all 5 specs (S1→S5), one topic per cycle:** write spec → sub-agent review → patch → QA gate → (if green) write impl plan → sub-agent review → patch → QA gate → **check in with owner before the next topic**. The impl plan itself is split into gates, each carrying its own review/patch/QA — but **execution is deferred to explicit owner command.** This session is spec/plan creation only; no code.
- **S1 is iOS-test-blocked locally:** the current Mac has CommandLineTools only (no full Xcode), so *no* iOS test (unit or UI) runs here, and the data-only XCTest waiver is **void** for S1 (it changes Swift). All S1 verification happens in CI/TestFlight or on a full-Xcode Mac + manual on-device. This shapes the S1 plan's gate definitions.
- **Cross-machine:** this MacBook was **49 commits behind** origin at cold start (all the mac-mini printer-intake + Mega X work). Fast-forward-pulled to current before any work — the GitHub-first health gate did its job. Don't trust local state without it.

## What happened / Actions

- **Cold start (3dpa).** Health gate flagged `3dprintassistant: behind:49` → hard stop → `git pull --ff-only` (clean tree) → current. Read the full cold-start spine + both printer-intake agent contracts + the lesson-spotter contract.
- **Brainstorm (3 owner items)** → decomposed into a **5-spec plan**: S1 iOS prefill fix · S2 intake capture completeness (tee widen + misroute catch-all) · S3 Scout dedupe/triage robustness + learned-guardrails config · S4 Intake Retrospective (learning loop, Approach A) · S5 Assistant autonomy ladder (branch + review note + PR + go/no-go, gated on guardrail maturity). Owner confirmed the breakdown (S2+S3 kept separate) + Approach A + the process.
- **S1 spec cycle:** wrote the spec → hostile sub-agent review (verdict `patch-then-proceed`, 10 findings; it re-grepped and found the true site count = 8 actions/6 screens, flagged the `Picker(.menu)` UITest as likely infeasible, found `feedback-form.js` confirming web immunity, and confirmed no local Xcode) → patched all 10 (full rewrite) → **QA gate GREEN.**
- Owner stopped before the S1 impl plan and requested wrap-up.

## Files touched (Untracked → committed)

Web (`3dprintassistant`):
- New: `docs/superpowers/specs/2026-06-15-ios-feedback-prefill-fix-design.md` (the S1 spec, QA-green).
- New: this session log + `docs/sessions/INDEX.md` entry.
- Modified: `docs/planning/ROADMAP.md` (banner + Active Work Queue feedback-pipeline entry), `docs/sessions/NEXT-SESSION.md` (regenerated → locked on S1 impl plan).

Parent repo (`ai-operating-model`):
- Modified: `docs/agents/lesson-spotter-calibration.md` (one row appended).

No code/engine/data/iOS-binary touched. iOS files were **read-only** (root-cause grounding). A `claude-sync` hold was set for the review-gated spec and released at this wrap after the deliberate commit.

## Commits

- `3dprintassistant`: S1 spec commit + session-wrap commit (log/INDEX/ROADMAP/NEXT-SESSION). See wrap push.
- `ai-operating-model` (parent): calibration-row commit.

## Open questions / Follow-up

- **Locked next entry = write the S1 implementation plan** (writing-plans skill) for the QA-green spec, then run it through review → patch → QA, then check in before S2. See NEXT-SESSION.
- **md-hygiene (carried, still unfixed):** `3dprintassistant/CLAUDE.md:63` + `docs/3dpa-context.md` say "Cloudflare Pages"; it's actually Workers + Assets. Owner-decision one-liner; not auto-edited.
- **Vault sweep proposal (not auto-edited):** the "learn between runs (propose-and-approve), deterministic at runtime; autonomy earned by guardrail maturity" principle is a cross-project working-method pattern (it also bears on the agent-ops "learning agents anchored on a backbone" direction) — candidate for `Obsidian Vault/20-Areas/Development/toolchain.md`. Owner to decide.
- **Memory:** no durable memory added — the iOS `.sheet(isPresented:)`+separate-optional → stale-prefill gotcha (use `.sheet(item:)`) is a genuine reusable iOS lesson, but it is **unverified until S1 ships**, so it's a candidate to memorialize *after* S1 lands, not now. Project-state lives in ROADMAP + NEXT-SESSION.
- **Lesson/finding sweep:** lesson-spotter compact → 1 candidate, **0 accepted** (no new finding). The controller's first-draft S1 spec undercounted sites (6→8) and proposed an infeasible `Picker(.menu)` UITest; the hostile review caught both — this **confirms `feedback_spec_reviewer_cold_read`** (spec-correct-but-incomplete is what the cold-read pass exists to catch), within the no-guessing family. No K1 (single reviewer, all 10 findings accepted), no K3 (process worked as expected), no K4 (review functioned as designed, not a surprising overrule). Calibration row appended.
- **verify-before-mutate summary (Trigger A):** `1 flags (1 resolved, 0 ignored), 0 destructive-core, 0 unclassified, 0 generated-write` — the single flag was the spec Write, verified inline (parent dir exists; file is new/untracked, no clobber).
- **MCP:** none in scope (no MCP/connector used; pipeline grounding used grep/Read + git only).

## Next session

**Locked: write the S1 implementation plan.** The S1 spec ([2026-06-15-ios-feedback-prefill-fix-design.md](../superpowers/specs/2026-06-15-ios-feedback-prefill-fix-design.md)) is QA-green. Run writing-plans → sub-agent review → patch → QA gate, with the plan split into gates (each gate carrying review/patch/QA), then **check in before starting S2.** No execution until explicit owner command. The full pipeline is S1→S5 in order; S2 and S3 are independent web work, S4 depends on S3's config surface, S5 depends on S4.
