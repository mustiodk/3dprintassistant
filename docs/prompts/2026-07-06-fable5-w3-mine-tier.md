# Fable 5 — 3DPA W3 Mine-Tier Engine Train (autonomous)

**For:** a fresh Claude Fable 5 session (model `claude-fable-5`).
**Recommended effort:** `high` default; bump to `xhigh` for the engine-injection core and the cross-model reviews; `medium` is fine for the wrap-up. Adaptive thinking is on; do not ask the model to echo/transcribe its reasoning in responses.
**Saved copy of this prompt:** `docs/prompts/2026-07-06-fable5-w3-mine-tier.md`. Companion resume surface: `docs/sessions/NEXT-SESSION.md`.

Copy everything between the markers into the new session.

>>> START >>>
You are working autonomously on the 3D Print Assistant (3dpa) — a web + iOS slicer-profile configurator that Musti (solo hobbyist dev) ships to real users at 3dprintassistant.com. The user is not watching in real time and cannot answer questions mid-task.

**Why this task matters (the intent):** across the last few sessions we built a "configurator that learns" — a Workshop where users log print outcomes, and the app harvests accepted tuning offsets (temp/fan/retraction deltas). That harvesting layer shipped and is live, but **nothing consumes those offsets yet.** This task is the payoff: the engine-side **Mine tier** that finally makes a user's accepted tunings change the generated profile. Getting this right is what turns the "learns" story from UI into real output.

## The task: implement the W3 Mine-tier engine train

Authoritative sources — read fully before acting:
1. `~/dev/Claude/Projects/CLAUDE.md` (top-level protocol) and `3dprintassistant/CLAUDE.md` (project rules)
2. `3dprintassistant/docs/3dpa-context.md` (architecture, engine API, app-state shape, standing rules)
3. `3dprintassistant/docs/planning/ROADMAP.md` — **this is the source of truth for status; read it before any status claim**
4. `3dprintassistant/docs/sessions/INDEX.md` + the last 3 session logs in full (start with `2026-07-06-cowork-appdev-learns-export.md`, including its evening Addendum)
5. **The plan you are executing:** `docs/superpowers/plans/2026-07-06-impl-044-w3w4-plan.md` Part 2, plus the spec `docs/specs/IMPL-044-W3W4-mine-tier-and-custom-filaments.md`

Scope (from plan Part 2 — treat its interfaces + RED cases as the contract; re-ground exact line numbers at execution since they drift):
- **Mine tier = Safe base + personal deltas** (NOT the Tuned tier). Inject accepted tuning offsets into `resolveProfile`:
  - temperature deltas join at the existing env-adjustment points (reuse the upper caps positionally; **lower-bound temperature floors are NEW code**),
  - fan bounds 0–100 are **NEW code on exactly the 3 fan emissions**,
  - retraction delta applies **after `_scaleRetraction`**,
  - the engine validates the injected `pairKey` against current state on every resolve (stale-injection guard),
  - provenance tag `personal`.
- **Custom-filament overlay:** mandatory `templateId` with sender-side share-URL substitution.
- The app-layer rules table is TRANSITIONAL; the plan notes migrating its magnitudes into `troubleshooter.json` `remedy` blocks on this train. Decide whether that migration is in-scope now or a follow-up, and record the decision — don't silently expand scope to include it.

## Boundaries (hard — do not cross)
- **Nothing merges to `main`. Nothing deploys.** Work on a branch `mine-tier-YYYYMMDD` off current `main`; tag the baseline. Push the branch as backup only. The user merges after verification.
- **iOS: local commits only.** Do not push iOS to `main`; do not dispatch TestFlight. (iOS `c647982` is already 1 local commit ahead from the export mirror — leave the push gate intact.)
- **Do not remove the `USE_LEGACY_EXPORT` fallback** or touch the export path — that work merged already and is out of scope here.
- **Do not start** Export Phase 2/3/4 or the queued `max_mvs` fix — they're in the ROADMAP queue, not this task.
- `engine.js` (logic) and `app.js` (UI) never merge. `PARAM_LABELS` stay English. `localStorage` access stays wrapped in try-catch. Any new user-facing copy gets EN + DA parity.
- Scope discipline: do the simplest thing that satisfies the spec. Don't add features, abstractions, refactors, or error handling for cases that can't happen beyond what the plan calls for. If you find yourself wanting to build more than the plan's Part 2, stop and note it as a follow-up instead.

## Process and gates
- **TDD, RED-first.** Write the failing test, see it fail, implement minimally, see it pass, commit. One logical change = one commit **per platform**. For cross-platform mirror tests where the natural RED is degenerate, leave the auditable breadcrumb the project CLAUDE.md requires.
- **Engine safety net (mandatory).** The value-level golden snapshot is your regression proof: `node scripts/engine-golden-snapshot.js --check` must be clean before you start. At every engine-touching commit, regenerate it and **enumerate every diff in the commit body** — an intended behavior change shows exactly the deltas you expect; a step you believe is app-layer-only must show an EMPTY diff. Before touching the engine, capture the stable comparators: `node scripts/validate-data.js 2>&1 | shasum -a256`, `node scripts/walkthrough-harness.js 2>&1 | shasum -a256`, and the matrix-audit `node scripts/profile-matrix-audit.js 2>&1 | grep -v '^Generated:' | shasum -a256`.
- **Web + iOS impact eval is mandatory on every engine/data change.** Mirror `engine.js` and any `data/` change byte-identical to iOS and run iOS XCTest. **The iOS `WorkshopStore` ordered emitter currently DROPS unknown envelope keys — this train MUST add key-preservation for `tuning`/`userMaterials` and regenerate the byte-compatibility fixture**, or a user's tunings are silently lost on iOS re-export.
- **Self-verify with fresh-context subagents at intervals**, not just self-critique. After each meaningful engine change, dispatch a subagent to verify the change against the plan/spec and against the golden diff. Delegate independent work (e.g. a hostile cold-read of the injection logic, a spec-coverage check) to parallel subagents and keep working while they run; intervene if one goes off track.
- **Cross-model review before any hard-to-reverse step:** run `bridge --health`, then `bridge --mode codex-only` on the diff. Apply findings as one-finding-one-commit.

## Operating rules for an autonomous run
- **When you have enough information to act, act.** Don't re-derive established facts, re-litigate settled decisions, or survey options you won't take. For reversible actions that follow from this task, proceed without asking.
- **Pause only when genuinely blocked:** a destructive/irreversible action, a real scope change, or input only the user can provide (e.g. sourcing a real material value). If you hit one, ask and end the turn — don't end on a promise. Otherwise, before ending a turn, check your last paragraph: if it's a plan, a question, or an "I'll now…", do that work now with tool calls instead.
- **Ground every progress claim against a tool result from this session.** Report only work you can point to evidence for; if something isn't verified yet, say so. Commit ≠ deploy — never assert prod/live/verified state without the command and its output. If tests fail, say so with the output; if you skip a step, say that.
- **You have ample context.** Do not stop, summarize, or suggest a new session on account of context limits — continue until the task is complete or you're blocked on user-only input.
- **Show a progress bar** on multi-step stretches (`[🟩🟩⬜⬜⬜ 40%] step`) and keep it updated — this is a standing project rule for user-facing updates.
- **Use the memory + findings systems.** Reference `~/.claude/.../memory/` and the ai-om findings ledger; during wrap, capture any reviewer/skill/tool mismatch (K1–K4 sweep) as a one-line finding. Record lessons; update existing notes rather than duplicating.

## When the implementation is done
1. **OWNER-VERIFY block:** produce a short, copy-pasteable section stating exactly what the user should check to confirm the Mine tier works (e.g. a Workshop scenario: accept a tuning → generate a profile → the affected value moves by the expected delta and stays within the new bounds), plus the branch review + merge commands and the rollback path. Keep a gate ledger (`docs/planning/MINE-TIER-GATE-LEDGER.md`) as the resume surface — record real results only, never pre-narrate.
2. **WRAP (Trigger A):** update the session log, INDEX, and ROADMAP; run the md-hygiene + findings + memory + vault sweeps; regenerate `NEXT-SESSION.md`; push the branch (backup only). 
3. **Final summary:** write it as a re-grounding for someone who didn't watch the run — outcome first (what now works), then the one or two things you need from the user, each explained plainly. Drop working shorthand; give each file/commit/flag its own plain clause.

Start by reading the sources above, then confirm in 3–5 bullets what the Mine tier must do and state the single locked entry point, and begin the first RED test. Proceed end to end.
<<< END <<<

## Notes for the human (not part of the prompt)
- This prompt applies the Fable-5 guide (act-don't-overplan, boundary statements, ground-claims-against-tool-results, stop-only-when-blocked, subagent self-verification, memory use, give-the-why, re-grounding summary) on top of the project's hard gates.
- It deliberately keeps the load-bearing safety gates explicit (golden snapshot, web+iOS mirror, push gate, nothing-merges) while trusting Fable's instruction-following for the rest — the guide warns that over-prescriptive prompts can degrade Fable output, so the softer discipline items are stated once, not enumerated.
- Effort: run at `high`; the injection core + cross-model review benefit from `xhigh`.
