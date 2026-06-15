# NEXT-SESSION — 3dpa

**Purpose:** kickoff prompt for the next 3dpa session.

**Last updated:** 2026-06-15 (S1–S5 specs + plans all QA-green, autonomous wrap). All five feedback-pipeline
topics now have a **QA-green design spec AND a gated implementation plan**, each run write→sub-agent-review→
patch→QA. **Locked next = owner go/no-go on EXECUTION** — pick a topic and give the explicit command; **no code
until then.** The plans are creation artifacts; nothing has executed. Specs live in
`docs/superpowers/specs/2026-06-15-s*`, plans in `docs/superpowers/plans/2026-06-15-s*`.

**Execution readiness + gating (build order = dependency order):**
1. **S1** iOS contextual-feedback prefill fix — independently executable. iOS binary, **push-gated**, **single
   commit** (compile-coupled), **no local iOS test** (CommandLineTools only → CI/full-Xcode + on-device).
2. **S2** intake capture completeness — independently executable. Web, **immediate** (auto-deploy); 3 commits;
   local Node tests run here.
3. **S3** Scout robustness + learned-guardrails config — independently executable. Script + config; local Node
   tests; the **byte-identical-outcomes** gate is the load-bearing proof of the externalisation.
4. **S4** Intake Retrospective — **GATED on S3 landing** (needs the config + the v3 report + the validator +
   the outcomes ledger). No-op until then.
5. **S5** Assistant autonomy ladder — **GATED on S4 landing** (the maturity gates read S4's outcomes ledger +
   calibration). The Assistant stays at Rung 0 until S4 produces data.

---

>>> START >>>

Read in order:
1. `Projects/CLAUDE.md` (or `AGENTS.md`) — top-level rules.
2. `Projects/3dprintassistant/CLAUDE.md` + `docs/3dpa-context.md` — architecture + engine + standing rules.
3. `docs/planning/ROADMAP.md` — Active Work Queue → "Feedback-pipeline evolution (5 specs + 5 plans)".
4. `docs/sessions/INDEX.md` + the last 3 session logs, especially
   `2026-06-15-cowork-appdev-s1-s5-specs-plans.md` (this autonomous spec+plan run).
5. `docs/sessions/NEXT-SESSION.md` (this file).
6. **The spec + plan for the topic the owner picks to execute** — specs `docs/superpowers/specs/2026-06-15-s*`,
   plans `docs/superpowers/plans/2026-06-15-s*-impl-plan.md` (read both in full).
7. The source files that topic's plan names (re-confirm line numbers — they drift).

Today's task:

**Execute the owner-chosen topic per its gated plan.** Each plan gate = implement → sub-agent review → patch →
QA → commit; advance only on green. **Confirm which topic before writing any code.** (Or, if the owner prefers,
continue refining the specs/plans — but they are QA-green and execution-ready.)

Scope / gating:

- S1 / S2 / S3 are independent; **S4 needs S3 landed; S5 needs S4 landed.**
- Respect each plan's commit decomposition, verification gate, and cross-platform-impact evaluation.
- S1 is iOS, single-commit, push-gated, no-local-test (CI/full-Xcode + on-device). S2/S3 run their QA locally.

Standing rules:

- ROADMAP is truth; read it before status claims.
- iOS push gate stays active — S1 commits stay local until the version is TestFlight-ready.
- Develop review-gated work under a `claude-sync.sh hold`; release after the deliberate commit.
- One finding = one commit. Web auto-deploys from `main` (S2/S3 docs + config under `scripts/`/`docs/` are
  asset-ignored, not served).
- Attachments don't reach the session — if the owner says "attached", ask for a plain-text paste.

<<< END <<<

## Maintenance Note

Regenerated on Trigger A / Trigger B / explicit owner ask only. The locked item is **owner go/no-go on
executing the QA-green S1–S5 set** (5 specs + 5 plans, all `docs/superpowers/{specs,plans}/2026-06-15-s*`);
S1/S2/S3 independent, S4 needs S3, S5 needs S4. No code until an explicit owner command.
