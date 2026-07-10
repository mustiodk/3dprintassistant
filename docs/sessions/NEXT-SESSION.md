# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-10 (Trigger A close of the **independent-review** session. The v2.1 spec's Task-1 independent hostile leg ran in a **cloud** session and returned **NO-GO** with a novel CRITICAL both prior Codex passes missed. **The Codex cross-model leg is still owed and CANNOT run in cloud — start LOCAL.**)
**Locked next entry point:** **Run the Codex cross-model leg of Task 1 locally**, feeding it the two prior transcripts **and** the new independent review so it neither repeats settled points nor re-derives F1–F10 blind. Reconcile both legs' findings; only with the owner's go does a v5 (or a scope cut) get drafted, then a small-gate impl plan. **Do NOT apply the independent findings to the spec before the cross-model cross-check** — that is the exact K1 anti-pattern (a single reviewer's fix advice has repeatedly re-created the very defect).

---

## State of play (read before anything)

- **Why start local:** cross-model review is essential to this work and the cloud environment cannot do it — it has **no `bridge`/`codex` CLI and no `../ai-operating-model` sibling repo**. The cloud session did the half it could (independent hostile pass + in-tree claim verification). The Codex leg is the missing half of Task 1.
- **Task 1 is HALF done → verdict so far is NO-GO.** Independent hostile review: **NO-GO, 10 findings** — [`docs/reviews/2026-07-10-intake-autonomy-v2.1-independent-hostile-review.md`](../reviews/2026-07-10-intake-autonomy-v2.1-independent-hostile-review.md). Session log: [`2026-07-10-cowork-appdev-intake-v2.1-independent-review.md`](2026-07-10-cowork-appdev-intake-v2.1-independent-review.md).
  - **F1 (CRITICAL, novel — both Codex passes missed it):** the NO-GO-taint invariant guards the *retry* path but not the *fresh-intake* path. `loadCatalog` reads the dedupe/id set from `data/printers.json` **only** (`scripts/printer-intake-scout.js:308-309`), so a `review-no-go`'d-but-unshipped printer is absent from the catalog and **re-requesting it mints a fresh candidate straight to a review turn** — taint never consulted, ship path writes no sidecar, and the reachability test's nodes don't include a fresh candidate (it enters upstream at stage 3). Cheapest possible NO-GO laundering: just re-submit. Contradicts §8 criterion 1. **Fix direction:** key taint by **printer identity**, consult it before any review turn, extend the reachability test to the fresh-intake edge.
  - **F2 (HIGH):** the store taint deny-set enumerates 3 classes and omits `transient-pipeline` — a tainted candidate whose `main` advances flips into a timer-free ×2 review lane. Derive the deny-set from the invariant, not a hand list.
  - **F3 (MEDIUM):** `tainted` is claimed "derived from `verdictRefs`, never hand-set," but v1 sidecars have no `verdictRefs` → mechanical derivation returns `false` on K2 SE → a migrator would migrate it **untainted**, re-opening §13-must-fix-1. Derive migration taint from the v1 `reason`; test against the real K2 SE fixture.
  - **F4 (MEDIUM):** `unverified-model` (a known runbook outcome with a prior v2 policy) is unmapped in RD2 → rides the "unrecognised → decision-required" catch-all → falsifies criterion 4 and regresses v2 autonomy. Map it → `world-absent` or state the demotion deliberately.
  - **F5/F6 (MEDIUM):** RD3's offline novelty misses shorteners/archive/PDF-vs-HTML/second-real-page → add an excerpt content hash + host denylist. RD10's "exactly-recognised" custody pass is silent on subset-dirty, untracked-first-write, torn `.jsonl`, and owner hand-edits → define over the path *set*, handle untracked, re-parse committed content before the watermark advances.
  - **F7 (MEDIUM, SCOPE):** ~10 components for one N=1 defect. The live defect needs ~3 (RD1 + RD10 + reviewer structured-objections); D3 is already fixed by the shipped v1.1 contract patch. Fold `research-defect`/`world-absent` into `decision-required` until a real park demands the split — which shrinks the F1/F2 reachability surface too.
  - **F8/F9/F10 (LOW):** §9 risk row still says "second reviewer only on a NO-GO" (contradicts RD4 + §13#5); RD1's Scout build-item undercounts missing slots vs the runbook field set; the `allowedPrinterFields` justification is misattributed (gates the overlay, not `data/printers.json` — conclusion still right on RD10's stronger grounds).
- **Claim-verification state.** In-tree claims all held (RD1 slots, `allowedPrinterFields`, `.assetsignore`, preflight fail-closed). **Out-of-tree = UNVERIFIED in cloud:** runner contract `:234` / the "v1.1 patch" (sibling repo) and the K2 SE parked sidecar (gitignored). **FALSE in this tree:** the ROADMAP/spec claim that `docs/printer-provenance.json` was "added" — it is not git-tracked and not present. Re-verify all three the moment you are local.
- **The live pipeline is safe** (runner contract v1.1 — believed live but UNVERIFIED here; confirm locally). **K2 SE is parked, tainted, stationary**; tag `intake-k2se-first-run-evidence` (diff hash `b88ae6df048d75c6`). **Nothing has been built for v2.1.**
- **Owner's standing concern still stands:** treat every "verified"/"proven"/"impossible" in the spec as a hypothesis until a machine or a source confirms it. The independent pass added a fourth confirmed instance (criterion 3 is false).

Copy everything between the markers into a new **local** session.

>>> START >>>

3dpa cold start (LOCAL — cross-model review required).

Read in order: ~/dev/Claude/Projects/CLAUDE.md → 3dprintassistant/CLAUDE.md → 3dprintassistant/docs/3dpa-context.md → 3dprintassistant/docs/planning/ROADMAP.md (top two banners + Active Work Queue) → docs/sessions/INDEX.md → the last 3 session logs in full (2026-07-10-cowork-appdev-intake-v2.1-independent-review.md, then 2026-07-10-cowork-appdev-intake-v2.1-spec.md, then 2026-07-10-cowork-appdev-intake-autonomy-build.md) → **the independent review `docs/reviews/2026-07-10-intake-autonomy-v2.1-independent-hostile-review.md` IN FULL** → this file.

**First, re-verify the three claims the cloud session could not check** (you are now local): runner contract `intake-pipeline-runner.md:234` — is it really v1.1 (`review-no-go` event-only, `others → weekly ×4` deleted)? the K2 SE parked sidecar `scripts/.intake-runner-state/parked/k2_se/parked.json` — is `evidence[]` really empty / objections free-text? and is `docs/printer-provenance.json` actually absent (the ROADMAP claims it was "added")? Mark each verified/false with the artifact.

**Task 1 (the still-owed leg — do this before any drafting): the Codex cross-model hostile review of the v2.1 spec.**

Target: `docs/superpowers/specs/2026-07-10-intake-autonomy-v2.1-evidence-retry-retrospective-design.md` (v4).

Route it via `bridge --health` → `bridge --mode codex-only` with an **absolute** `--out-dir` (`.../3dprintassistant/codex/intake-autonomy-v2.1-review/`), and confirm a fresh `Wrote <path>` line before trusting the output. Feed the reviewer, so it neither repeats settled points nor re-derives blind: the two prior Codex transcripts (`bridge-2026-07-10-154723-685395.md`, `...-155809-076395.md`) **and the new independent review** (`docs/reviews/2026-07-10-intake-autonomy-v2.1-independent-hostile-review.md`).

The brief is **find the holes in the cheese — validate assumptions and claims. Do not approve.** Specifically require the reviewer to:
- **Adjudicate F1–F10 from the independent review** — for each, is it real? Overstated? Already-mitigated somewhere the independent pass missed? (Round-2 Codex refuted round-1's own advice once already; expect the same scrutiny of the independent pass's *fixes*.) F1 (fresh-intake bypass of the taint) is the load-bearing one — confirm or refute it against `printer-intake-scout.js` + the runner contract, and if real, that alone is a NO-GO.
- Take every load-bearing claim and mark it **verified (file:line / command output) / unverified / false.** The spec has a track record of false "verified"/"proven"/"impossible" assertions.
- Attack the **NO-GO taint invariant + the graph-reachability test**: enumerate EVERY entry edge to a review turn — retry lanes, **fresh intake (F1)**, `transient-pipeline` (F2), migration (F3), RD9 expiry, owner instruction, crash recovery — and prove none reaches review from a NO-GO except the two sanctioned edges.
- Attack **RD3's cheapest bypass now** (F5) and **RD10's custody pass** (F6) — is the relaxation exactly-recognised?
- Attack the **scope (F7)**: is v2.1 (~10 components) justified by one N=1 defect, or should it shrink to (a) record sources, (b) never re-roll a NO-GO?
- Verify the spec against the **live** contract v1.1 and the runbook, not against its own prose.

**Task 2 (only after BOTH review legs are reconciled AND with my go):** draft v5 (or the scope cut), then the small-gate impl plan. Requirements unchanged:
- **Small gates.** Each gate is one concern, independently revertible.
- **Every gate:** implement → hostile sub-agent review → patch → **QA approval (tests green, evidence captured)** → **cross-model check** → commit → gate-ledger row with evidence. No gate opens until the previous passed all four.
- **Gate R0 is already delivered** (runner contract v1.1 — record it, don't redo it). Confirm it's actually live first.
- Build order constrained: nothing that writes a v2.1 sidecar may land before the contract that reads it correctly.
- The plan itself gets a hostile review + a cross-model review before any code is written.

Standing rules: web is master; engine.js/app.js never merge; engine/data changes require web + iOS (+ Android-plan) impact evaluation; one finding = one commit; iOS push gate; Android prototype no-push until AG0 GO; quality > speed; progress bar every multi-step turn. **And for this work specifically: mark every load-bearing claim with its evidence or an explicit `UNVERIFIED:` — the controller's unmarked assertions have now been refuted six times across this arc (five prior + criterion 3).**

Context nuggets: the pipeline runs daily at 12:00 and is fail-closed — a dirty tree or `ahead != 0` blocks the run, so leave the tree clean at every stopping point. `bridge --out-dir` is cwd-relative (use absolute + confirm the `Wrote` line). The Scout test suite `rmSync`-wipes `scripts/.printer-intake-out/`; runner state lives in `scripts/.intake-runner-state/`. `data/printers.json` is hand-formatted — rows go in by string splice, guarded by `scripts/intake-diff-guards.js --base main`. Live overlay is `content_version=2026071004`.

>>> END <<<

Maintenance note: this file is regenerated on Trigger A / Trigger B / explicit owner ask only — a stale copy between sessions is expected and fine.
