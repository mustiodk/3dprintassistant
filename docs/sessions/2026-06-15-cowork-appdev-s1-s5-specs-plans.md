# 2026-06-15 — Cowork (appdev): S1–S5 feedback-pipeline specs + impl plans (autonomous)

## Durable context

- **Deliverable complete:** all 5 feedback-pipeline topics (S1→S5) now have a **QA-green design spec AND a gated implementation plan**. 9 new artifacts this session (the S1 spec pre-existed from the 2026-06-15 morning; this session added the **S1 plan + S2–S5 spec+plan**). Each ran write→sub-agent-hostile-review→patch→QA. **Execution deferred to explicit owner command — no engine/data/web/iOS code touched.**
- **Owner waived the per-topic check-in.** The standing process pauses for owner approval between topics; this session's directive ("go autonomous… only stop if anything critical… stop when done with all specs and implementation plans") waived that pause. The review→patch→QA *quality* loop was kept on every artifact; only the owner-pause-between-topics was dropped.
- **The hostile reviews earned their keep — every first draft carried a real defect the cold-read caught:**
  - **S2 v1 = BLOCK:** the Worker teed free-text general/feature/bug feedback to KV, but the Scout's `mapFields` only routes `id:'brand'/'model'` fields → everything classified `unactionable` → captured-then-dropped (pipe disconnected). Fixed by moving deterministic **`extractPrinterMention`** into the Worker so it tees *structured* `{id:brand/model/notes}` and the Scout stays in-contract (no free-text judgment).
  - **S3 = CRITICAL + a verify-before-mutate miss:** "Sparkx i7 w/CFS" was mis-attributed to suffix-strip — but "Sparkx" isn't a brand; it's `creality`'s `sparkx_i7`, so it needs a `sparkx→creality` **alias**, not a suffix. Separately, I asserted the config was "not leaked" without checking `.assetsignore`; `catalog/` **is** publicly served, so the config moved to `scripts/` (asset-ignored — **verified**).
  - **S4:** the design assumed a "run-history corpus since a watermark" that doesn't exist (run reports are overwritten + gitignored) → the **committed, PII-safe outcomes ledger** is the durable spine; and the Assistant's `project-writer` contract **forbade** the ledger write → needs an explicit permission-scope amendment (not just a mission step).
  - **S5:** the headline maturity gate consumed the **wrong S4 signal** (retrospective reject-rate measures the *learning loop*, not the *Assistant* → use the outcomes-ledger `was-*` rate); the Rung-2 branch+PR was **cross-repo-incoherent** (web/iOS are separate repos → web-PR-only, iOS mirror local); and the iOS Forbidden Action only forbade push "to main" → an **iOS-branch-push hole** Rung 2 would open (tighten to "branch or main").
- **Key durable design decisions:** S2 keeps the Scout deterministic by doing free-text→structured extraction in the *Worker*; S3 externalises the brand-alias/suffix/keyword data into a versioned `scripts/printer-intake-guardrails.json` (off the served path) so it's *learnable* — this is the hinge S4 proposes diffs into; S4 is **Approach A** (learn between runs, deterministic at runtime — reuses lesson-spotter read-only-candidate + Curator schema-diff/watermark/mechanical-judgment-split/tombstone/>30%-reject-halt); S5 is **earned/reversible** autonomy with rung-invariant safety gates + the iOS push gate preserved at every rung. **Dependency order:** S1/S2/S3 independent; S4 gated on S3; S5 gated on S4.

## What happened / Actions

- **Cold start (3dpa):** GitHub-first gate flagged `3dprintassistant: behind:2` → `git pull --ff-only` (clean tree) → current. Read the cold-start spine; grounded all 5 topics (an Explore agent for the iOS S1 files; direct reads of the web tee + Scout script; a synthesis agent for the Scout/Assistant/lesson-spotter contracts + the Curator backbone design).
- Set a `claude-sync hold` for the review-gated artifacts; **released at this wrap** after the deliberate commits.
- **11 hostile sub-agent reviews + 2 grounding agents.** Verdicts: S1 plan **GO**; S2 spec v1 **BLOCK** → v2 **GO**; S2 plan **GO**; S3 spec v1 **PATCH (CRITICAL)** → v2 **GO**; **S3 plan PATCH** (the *belatedly-run* review — see Open questions); S4 spec **PATCH**; S4 plan **PATCH**; S5 spec **PATCH**; S5 plan **PATCH**. All findings patched to QA-green.
- Committed the 9 artifacts as 5 per-topic commits + an S3-plan-review-patch follow-up.

## Files touched (Untracked → committed)

- New specs: `docs/superpowers/specs/2026-06-15-s2…`, `…-s3…`, `…-s4…`, `…-s5…-design.md`.
- New plans: `docs/superpowers/plans/2026-06-15-s1…`, `…-s2…`, `…-s3…`, `…-s4…`, `…-s5…-impl-plan.md`.
- Tracking: this session log + `docs/sessions/INDEX.md` + `docs/planning/ROADMAP.md` + `docs/sessions/NEXT-SESSION.md`.
- No engine/data/web/iOS-binary touched. iOS + web source files were **read-only** (grounding).

## Commits

- `6ed8858` S1 plan · `007ed26` S2 spec+plan · `d85250c` S3 spec+plan · `eddcf48` S4 spec+plan · `60885f6` S5 spec+plan · S3-plan-review patch follow-up · this wrap commit.

## Open questions / Follow-up

- **Process finding (FILED):** the **S3 plan was committed (in `d85250c`) before its hostile review** — I jumped from writing it to launching the S4 spec review and skipped the S3 plan's loop, caught only at wrap by self-auditing the review trail. The belated review then surfaced **2 HIGH** issues (alias count is **14 not 13**; the byte-identical gate had **no defined comparison mechanism**), patched in a follow-up commit. Finding: [`ai-operating-model/docs/findings/2026-06-15-committed-s3-plan-before-its-review.md`](../../../ai-operating-model/docs/findings/2026-06-15-committed-s3-plan-before-its-review.md). **Lesson:** in autonomous multi-artifact pipelining, track which artifacts have *completed* their review loop before committing — parallel reviews can mask a skipped one.
- **verify-before-mutate confirmation:** the S3 review's config-"no leak"-without-checking-`.assetsignore` catch is a `feedback_verify_before_mutate` confirmation — caught by the review (second-eyes worked) + fixed (config → `scripts/`, verified asset-ignored).
- **md-hygiene (carried, still unfixed):** `3dprintassistant/CLAUDE.md:63` + `docs/3dpa-context.md` say "Cloudflare Pages"; it is Workers + Assets. Owner-decision one-liner; not auto-edited.
- **verify-before-mutate summary (Trigger A):** `9 flags (9 resolved, 0 ignored), 0 destructive-core, 1 unclassified, 0 generated-write` — all 9 Write flags verified inline this session.
- **Lesson/finding sweep:** lesson-spotter (compact) → 1 accepted candidate (the committed-before-review process finding). The 5-topic "every first draft had a real defect the cold-read caught" strongly **confirms `feedback_spec_reviewer_cold_read`** (confirmation, not a new finding). No K1 (single reviewer per artifact, all findings accepted); no surprising K3/K4. Calibration row appended to `lesson-spotter-calibration.md`.
- **MCP:** none in scope (grep/Read + git + sub-agents only).
- **Memory:** no durable memory added — the reusable iOS `.sheet(item:)`→`.sheet(isPresented:)`-stale-capture lesson stays *unverified-until-S1-ships* (per the morning session's note); the "Worker-side deterministic extraction keeps the consumer agent deterministic" pattern is a candidate but *unverified-until-S2-ships*. Memorialize after the relevant topic executes.
- **Vault:** the "learn-between-runs (propose-and-approve), deterministic-at-runtime; autonomy earned by guardrail maturity" principle (S4+S5) is a cross-project working-method pattern (also bears on agent-ops) — carried candidate for `Obsidian Vault/20-Areas/Development/toolchain.md`. Owner to decide.

## Next session

**Locked: owner go/no-go on EXECUTION.** All 5 specs + plans are QA-green and ready. Gating: S1/S2/S3 are independently executable; **S4 needs S3 landed; S5 needs S4 landed.** No code until the owner picks a topic and gives the explicit command. See [`NEXT-SESSION.md`](NEXT-SESSION.md).
