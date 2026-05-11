# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-11 after config-impact QA pass + cross-pass review wrap.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — config-impact QA merge cycle + v1.0.3 monitoring

## Read First, In This Order

Follow Trigger C from the canonical protocol. Read:

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
6. Last three session logs, in full:
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-11-cowork-appdev-config-impact-qa.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-10-cowork-appdev-v1.0.3-app-review-wrap.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-10-cowork-appdev-multi-surface-wrap-protocol.md`
7. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md`
8. Task-specific files as needed:
   - QA handover spec: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/research/configuration-impact-qa-handover.md`
   - QA pass deliverables: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/reviews/2026-05-11-config-impact-qa/{claude,codex}.md`
   - Codex cross-pass prompt: in 2026-05-11 session log under "Open questions / Follow-up"

## Current State

Two parallel workstreams live, run them in priority order:

**Workstream A — v1.0.3 App Review monitoring (priority 1 if Apple settles):**
- v1.0.3 build `202605101637` was submitted to App Review on 2026-05-10.
- Phone QA passed before submission.
- Stale builds: `202605090842`, `202605101130`, `202605101544` — never submit.
- If Apple approves → manually release + monitor `/analytics`, Discord feedback, Sentry, App Store reviews.
- If Apple rejects → triage the rejection notice verbatim before any other work.

**Workstream B — Config-impact QA merge cycle (priority 2 if v1.0.3 still pending):**
- Both independent QA pass deliverables landed:
  - Claude: 29 findings (12 HIGH / 6 MEDIUM / 6 LOW / 5 OBSERVATION) at `docs/reviews/2026-05-11-config-impact-qa/claude.md`. Includes a "Cross-pass review — Claude reviews Codex" section near the end.
  - Codex: 10 findings (5 HIGH / 2 MEDIUM / 3 LOW/OBS) at `docs/reviews/2026-05-11-config-impact-qa/codex.md`.
- 5 mutual HIGH findings form the safe core of the future v1.0.4 batch (per Claude's adjudicated section).
- **Next step: Codex cross-pass review of Claude.** Prompt prepared (find it in the 2026-05-11 session log under Open questions / Follow-up). Owner-triggered. Codex appends a cross-pass section to its own `codex.md`.
- After Codex's cross-pass section lands, owner produces `merged.md` in the same directory and the v1.0.4 implementation cycle begins.

## Recommended First Lane

If Apple has settled v1.0.3 review (check ASC first), do that workstream — release manually + monitor, OR triage the rejection.

If v1.0.3 is still pending: trigger the Codex cross-pass review session per the prompt in the 2026-05-11 session log. This conversation does not start that work directly — it's a separate Codex invocation.

If both Codex's cross-pass section AND the merge are done by the time this cold-start runs: pick the highest-priority item from Claude's adjudicated v1.0.4 merge-batch order in `claude.md` and start implementation. The 5 mutual HIGHs are the safest first commits.

## Scope Rules

- Use the visible progress tracker for multi-step work.
- Web is source-of-truth; iOS mirrors `engine.js` + `data/*.json` byte-identical.
- Keep process lightweight: this is a single-person hobby project.
- Push back when quality would suffer, a requested push would ship failed checks, or a TestFlight build would add little value.
- No iOS push/TestFlight dispatch without confirming same-version vs version-bump intent.
- One finding = one commit per platform when practical.
- Do not guess behavior; read the actual file.
- If a session touches multiple projects/surfaces, run wrap-up for each in sequence and produce one combined handoff prompt.
- For QA-batch implementation: the standing rules in `docs/3dpa-context.md` apply (provenance everywhere; data/logic-change evaluation mandatory; iOS push gate stands).

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
