# NEXT-SESSION — 3dpa

**Purpose:** kickoff prompt for the next 3dpa session.

**Last updated:** 2026-06-13 Codex follow-up (printer-intake tee activation
resolved). The Scout is built, tested (28 tests), dual-hostile-reviewed, QA'd
(38/43), and pushed. The KV namespace + binding exist, and the deployed feedback
tee writes to remote KV. The apparent blocker was a read-side bug: Wrangler KV
reads lacked `--remote`, so diagnostics and the Scout queried local/default KV
and saw an empty queue. `scripts/printer-intake-scout.js` now passes `--remote`
for live KV list/get; smoke entries were deleted; live queue verified empty.

**Locked next entry point:**
1. **Researcher rehearsal** (owner-agreed) — dry-run the Printer Addition Assistant
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
5. **For tee-resolution context only:** `codex/printer-intake-tee-handover/HANDOVER.md`
   (now marked resolved; do not re-run unless the tee regresses).
6. **For the researcher rehearsal:** `ai-operating-model/docs/agents/printer-addition-assistant.md`
   + `docs/runbooks/printer-addition-protocol.md`.

**Today's task:** run the researcher rehearsal. The live tee is active; any future
KV diagnostics must use `wrangler kv ... --remote`.

**Standing rules:** verify runtime behavior with logs/`wrangler tail`, don't infer
root cause from an adjacent probe (two misdiagnoses last session); KV list is
eventually-consistent (don't false-negative on short polls); use `--remote` for
Wrangler KV reads; the Scout/researcher are web-side (no iOS push). Account
`038ac75563c82b3641d1626510938c1b`, namespace
`f3d89a4e70a34e3fab1c0f7676efebb5`.

<<< END <<<

## Maintenance Note

Regenerated on Trigger A / Trigger B / explicit owner ask only. The live item is
the researcher rehearsal; the tee diagnostic brief is retained as a resolved
record in `codex/printer-intake-tee-handover/HANDOVER.md`.
