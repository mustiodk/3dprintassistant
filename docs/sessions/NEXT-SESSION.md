# NEXT-SESSION — 3dpa

**Purpose:** kickoff prompt for the next 3dpa session.

**Last updated:** 2026-06-13 wrap (printer-intake Scout shipped). The Scout is
built, tested (28 tests), dual-hostile-reviewed, QA'd (38/43), and pushed. The KV
namespace + binding exist. **One blocker remains:** the deployed feedback tee does
NOT write missingPrinter requests to KV at runtime — handed to Codex with a full
brief. After that's fixed, the next effort is the **researcher rehearsal**.

**Two locked next entry points (in order):**
1. **Activate the live tee** — `codex/printer-intake-tee-handover/HANDOVER.md` is
   the complete brief. Likely a fast finish (the handover's step-1 probe pinpoints
   it). Can be done in Codex or here.
2. **Researcher rehearsal** (owner-agreed) — dry-run the Printer Addition Assistant
   (`../../../ai-operating-model/docs/agents/printer-addition-assistant.md`) on
   **Voxelab Aries** (real request, new brand) + 3 adversarial cases (resin
   mislabeled → must decline; non-existent printer → must decline, no fabrication;
   conflicting sources → low-confidence). Judge by review (it's an agent, not code):
   cited sources, correct taxonomy, FDM confirmed, gates respected, no fabrication.
   Then hostile-review the output.

---

>>> START >>>

Read in order:
1. `Projects/CLAUDE.md` (or `AGENTS.md`) — top-level rules.
2. `Projects/3dprintassistant/CLAUDE.md` + `docs/3dpa-context.md` — architecture.
3. `docs/planning/ROADMAP.md` — live status.
4. `docs/sessions/INDEX.md` + the last 2-3 session logs (esp.
   `2026-06-13-cowork-appdev-printer-intake-scout-ship.md`).
5. **For the tee blocker:** `codex/printer-intake-tee-handover/HANDOVER.md` (start here).
6. **For the researcher rehearsal:** `ai-operating-model/docs/agents/printer-addition-assistant.md`
   + `docs/runbooks/printer-addition-protocol.md`.

**Today's task:** EITHER (1) finish the tee activation per the handover — first
probe is POST-smoke to the workers.dev URL vs the custom domain, then `wrangler
tail` with the fail-open catch temporarily un-swallowed — OR (2) run the researcher
rehearsal. The two are independent.

**Standing rules:** verify runtime behavior with logs/`wrangler tail`, don't infer
root cause from an adjacent probe (two misdiagnoses last session); KV list is
eventually-consistent (don't false-negative on short polls); re-instate the
fail-open catch before any final commit; the Scout/researcher are web-side (no iOS
push). Account `038ac75563c82b3641d1626510938c1b`, namespace
`f3d89a4e70a34e3fab1c0f7676efebb5`.

<<< END <<<

## Maintenance Note

Regenerated on Trigger A / Trigger B / explicit owner ask only. The tee blocker is
the live item; the full diagnostic brief is in `codex/printer-intake-tee-handover/HANDOVER.md`.
