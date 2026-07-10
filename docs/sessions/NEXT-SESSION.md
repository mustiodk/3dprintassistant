# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-10 (Trigger A close of the v2.1 spec session — spec written, hostile-reviewed, owner-ratified, then **NO-GO'd twice by Codex**; both applied. Live runner contract patched to v1.1. **Owner halted before the build, citing work quality.**)
**Locked next entry point:** **An independent, adversarial cross-model hostile review of the v2.1 spec — brief: find the holes, validate every assumption and claim. Not a confirmatory pass.** Only if it clears do we write the implementation plan, and it must be **small gates**, each gated by hostile sub-agent review + QA approval + cross-model check before the next gate opens.

---

## State of play (read before anything)

- **The live pipeline is safe.** Runner contract **v1.1** (ai-om `c99d1ed`): `review-no-go` is event-only, the `others → weekly ×4` catch-all is deleted, unrecognised reasons → `decision-required`. Daily 12:00 schedule runs; preflight is fail-closed.
- **K2 SE is parked, tainted, and stationary.** It will not be retried on any timer. Its branch is preserved as tag **`intake-k2se-first-run-evidence`** (diff hash `b88ae6df048d75c6`; stage 2b deleted the branch ref itself).
- **Nothing has been built for v2.1.** The spec is v4 and is *not* trusted. Three drafts reintroduced the same bug class three times; the last two rounds were Codex NO-GOs, one of which refuted its own prior advice (K1 finding: `ai-operating-model/docs/findings/2026-07-10-codex-round2-refuted-its-own-round1-fix-advice.md`).
- **Owner's standing concern:** the controller's design assertions were refuted five times this session. Assume the spec contains further unverified claims. Treat every "verified"/"proven"/"impossible" in it as a hypothesis.

Copy everything between the markers into a new session.

>>> START >>>

3dpa cold start.

Read in order: ~/dev/Claude/Projects/CLAUDE.md → 3dprintassistant/CLAUDE.md → 3dprintassistant/docs/3dpa-context.md → 3dprintassistant/docs/planning/ROADMAP.md (banner + Active Work Queue) → docs/sessions/INDEX.md → the last 2 session logs in full (2026-07-10-cowork-appdev-intake-v2.1-spec.md, then 2026-07-10-cowork-appdev-intake-autonomy-build.md) → this file.

**Task 1 (do this first, and do NOT skip to the plan): an adversarial cross-model hostile review of the v2.1 spec.**

Target: `docs/superpowers/specs/2026-07-10-intake-autonomy-v2.1-evidence-retry-retrospective-design.md` (v4).

Route it via `bridge --health` → `bridge --mode codex-only` with an **absolute** `--out-dir` (`.../3dprintassistant/codex/intake-autonomy-v2.1-review/`), and confirm a fresh `Wrote <path>` line before trusting the output. Also run an independent hostile sub-agent pass with a *different* brief so the two are not correlated.

The brief is **find the holes in the cheese — validate assumptions and claims. Do not approve.** Specifically require the reviewer to:
- Take every load-bearing claim in the spec and mark it **verified (with file:line or command output) / unverified / false**. The spec has a track record: the controller asserted "the reviewer was overcautious" (false), "re-rolling is structurally impossible" (false premise), "no free-text channel exists" (false — one is in the same document), "blocked candidates are rare" (asserted against a 100%-park sample), "v2.1 won't be ready by the 17th" (never checked).
- Attack the **NO-GO taint invariant** and its graph-reachability test: is there any path — including migration, expiry, owner instruction, crash recovery, or the `research-defect` repair pass — by which a NO-GO'd candidate reaches a review turn? Three prior drafts each had one.
- Attack **RD3** (presence + canonical novelty + excerpt/claim): what is the cheapest bypass now?
- Attack **RD10's custody commit + the preflight custody-state pass** — it is a deliberate, narrowly-scoped relaxation of a safety predicate. Is it exactly-recognised, or is there a foreign-dirt path through it?
- Attack the **scope**: is v2.1 (≈10 components) justified by the evidence (one live defect — now fixed — plus one recording discipline), or should it shrink to (a) record sources, (b) never re-roll a NO-GO?
- Verify the spec against the **live** contract v1.1 and the runbook, not against its own prose.

Read the two prior transcripts first so the reviewer does not repeat settled points: `codex/intake-autonomy-v2.1-review/bridge-2026-07-10-154723-685395.md` and `...-155809-076395.md`.

**Task 2 (only after Task 1 clears, and only with my go):** the implementation plan. Requirements I have set:
- **Small gates.** Each gate is one concern, independently revertible.
- **Every gate:** implement → hostile sub-agent review → patch → **QA approval (tests green, evidence captured)** → **cross-model check** → commit → gate-ledger row with evidence. **No gate opens until the previous one has passed all four.**
- **Gate R0 is already delivered** (runner contract v1.1 — record it as such, don't redo it).
- Build order is constrained: nothing that writes a v2.1 sidecar may land before the contract that reads it correctly.
- The plan itself gets a hostile review + a cross-model review before any code is written.

Standing rules: web is master; engine.js/app.js never merge; engine/data changes require web + iOS (+ Android-plan) impact evaluation; one finding = one commit; iOS push gate (3 local data-mirror commits ride v1.0.7); Android prototype no-push until AG0 GO; quality > speed; progress bar every multi-step turn. **And for this work specifically: mark every load-bearing claim with its evidence or an explicit `UNVERIFIED:` — the controller's unmarked assertions were refuted five times last session.**

Context nuggets: the pipeline runs daily at 12:00 and is fail-closed — a dirty tree or `ahead != 0` blocks the run, so leave the tree clean at every stopping point. `bridge --out-dir` is cwd-relative (use absolute + confirm the `Wrote` line). The Scout test suite `rmSync`-wipes `scripts/.printer-intake-out/`; runner state lives in `scripts/.intake-runner-state/`. `data/printers.json` is hand-formatted — rows go in by string splice, guarded by `scripts/intake-diff-guards.js --base main`. Live overlay is `content_version=2026071004`.

>>> END <<<

Maintenance note: this file is regenerated on Trigger A / Trigger B / explicit owner ask only — a stale copy between sessions is expected and fine.
