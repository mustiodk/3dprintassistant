# NEXT-SESSION — 3dpa

**Purpose:** kickoff prompt for the next 3dpa session.

**Last updated:** 2026-06-13 Codex follow-up (printer-intake evidence rules
hardened). The Scout is built, tested, reviewed, pushed, and reads live KV via
`wrangler kv ... --remote`. The researcher rehearsal is complete. The
printer-addition protocol now codifies source hierarchy, conflict handling,
field confidence, outcome ownership, taxonomy edge cases, and extra review
triggers; the Scout/Assistant contracts are aligned with deterministic-vs-assisted
responsibilities; private Scout skeletons carry the evidence policy.

**Locked next entry point:**
1. **Real queue rehearsal** — seed/process the Discord backlog now that evidence
   rules are hardened. Expected outcomes: Voxelab Aries → assisted
   `needs-source-resolution` / `needs-owner-taxonomy` packet; Anycubic Photon
   Mono M7 Pro → `declined-non-fdm`. Do not edit live catalog/overlay/iOS until
   the Assistant presents a packet and owner approval is explicit.

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
6. **For the hardened intake flow:** `ai-operating-model/docs/agents/printer-intake-scout.md`
   + `ai-operating-model/docs/agents/printer-addition-assistant.md`
   + `docs/runbooks/printer-addition-protocol.md`
   + `docs/superpowers/specs/2026-06-13-printer-intake-evidence-rules-design.md`.

**Today's task:** seed/process the real Discord backlog through the Scout. The
live tee is active; any future KV diagnostics must use
`wrangler kv ... --remote`.

**Standing rules:** verify runtime behavior with logs/`wrangler tail`, don't infer
root cause from an adjacent probe (two misdiagnoses last session); KV list is
eventually-consistent (don't false-negative on short polls); use `--remote` for
Wrangler KV reads; the Scout/researcher are web-side (no iOS push). Account
`038ac75563c82b3641d1626510938c1b`, namespace
`f3d89a4e70a34e3fab1c0f7676efebb5`.

<<< END <<<

## Maintenance Note

Regenerated on Trigger A / Trigger B / explicit owner ask only. The live item is
the real queue rehearsal; the tee diagnostic brief is retained as a resolved
record in `codex/printer-intake-tee-handover/HANDOVER.md`.
