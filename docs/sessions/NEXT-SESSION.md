# NEXT-SESSION — 3dpa

**Purpose:** kickoff prompt for the next 3dpa session.

**Last updated:** 2026-06-14 wrap-up. The printer-intake **process is patched**
(sanctioned `app-cap` path for unpublished `max_acceleration` + scoped data-only
iOS XCTest waiver, in the runbook + both agent contracts) and **Voxelab Aries
shipped** green end-to-end (web data + live overlay `content_version=2026061301`;
iOS bundled mirror local-only). The gating condition is cleared, so the locked
next entry is now **seeding and processing the real Discord missing-printer
backlog**.

**Locked next entry point:**
1. **Seed the real Discord missing-printer backlog** into the `PRINTER_INTAKE` KV
   namespace (remote), then run `scripts/printer-intake-scout.js` to triage it.
   Remember live KV reads/writes use `wrangler kv ... --remote`.
2. **Process surfaced candidates** via the Printer Addition Assistant against the
   now-patched `docs/runbooks/printer-addition-protocol.md` — including the
   `app-cap` path for any old printer with no published `max_acceleration`, and
   the data-only iOS XCTest waiver for value-only adds. Photon stays
   `declined-non-fdm`.
3. One printer = one focused commit per repo; iOS push gate stays active.

---

>>> START >>>

Read in order:
1. `Projects/CLAUDE.md` (or `AGENTS.md`) — top-level rules.
2. `Projects/3dprintassistant/CLAUDE.md` + `docs/3dpa-context.md` — architecture.
3. `docs/planning/ROADMAP.md` — live status.
4. `docs/sessions/INDEX.md` + the last 3 session logs, especially:
   - `2026-06-14-cowork-appdev-printer-intake-process-patch-aries-ship.md`
   - `2026-06-13-cowork-appdev-voxelab-aries-no-go-wrap.md`
   - `2026-06-13-cowork-appdev-printer-intake-scout-ship.md`
5. `docs/runbooks/printer-addition-protocol.md` (now carries the `app-cap` path +
   the data-only iOS XCTest waiver).
6. `ai-operating-model/docs/agents/printer-intake-scout.md`
   + `ai-operating-model/docs/agents/printer-addition-assistant.md`
7. `codex/printer-intake-tee-handover/HANDOVER.md` (KV tee context) if KV details
   are needed.

Today's task:

Seed the real Discord missing-printer backlog into the `PRINTER_INTAKE` KV
namespace, run the deterministic Scout to triage it, then process surfaced
candidates through the Printer Addition Assistant + the patched
printer-addition protocol.

Scope:

- This is the real backlog run — the process is already patched and Aries already
  shipped; do not re-do the process patch.
- Web data + additive iOS overlay is the ship-path; no TestFlight/app-version step
  for current users. Do not push iOS; the push gate remains active.
- Use the `app-cap` path only when its four conditions hold (documented
  null-source sweep; value ≤ lowest sibling bedslinger ceiling; required `notes[]`
  provenance line; reviewer GO). Every other unpublished profile/safety field
  stays low-confidence and blocks.
- FDM-only Phase 1.0 governs (resin auto-declined).

Process:

1. Seed + verify the KV backlog (`--remote`).
2. Run the Scout; review its triage + `needs-research` skeletons.
3. Per candidate: Assistant assisted-research → recommendation → owner approval →
   protocol Phase 3–5 (commit, verify, overlay, risk review when triggered).
4. Confirm any live overlay `content_version` after web push (committed ≠ deployed).

Standing rules:

- ROADMAP is truth; read it before status claims.
- Web is master; iOS mirrors bundled data byte-identical when bundled data changes.
- Data/logic changes require explicit web + iOS impact evaluation.
- One accepted review finding = one commit per platform unless owner overrides.
- Live KV diagnostics/reads/writes must use `wrangler kv ... --remote`.

<<< END <<<

## Maintenance Note

Regenerated on Trigger A / Trigger B / explicit owner ask only. The locked item is
real-backlog seeding; the process-patch + Aries-ship arc is a closed record in
`2026-06-14-cowork-appdev-printer-intake-process-patch-aries-ship.md` and the plan
`docs/superpowers/plans/2026-06-13-printer-intake-process-patch-and-aries-rerun.md`.
