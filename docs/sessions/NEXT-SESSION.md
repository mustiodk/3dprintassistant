# NEXT-SESSION — 3dpa

**Purpose:** kickoff prompt for the next 3dpa session.

**Last updated:** 2026-06-13 wrap-up after the Voxelab Aries delivery rehearsal.
The printer-intake tee and Scout are live, but real backlog seeding is paused
until the process handles old printers with missing manufacturer acceleration
data and defines the iOS test/waiver gate for data-only printer adds.

**Locked next entry point:**
1. **Patch the printer-addition process before backlog seeding.** Decide and
   document the rule for profile/safety-critical fields when manufacturer data
   is absent, especially `max_acceleration`. Manufacturer data beats reseller
   data; reseller/community data may support non-critical metadata, but a
   profile-critical value needs manufacturer evidence or an explicitly named
   app-side conservative cap with provenance and review approval.
2. **Close the iOS verification gap.** Either establish a local/CI XCTest path
   for data-only printer additions or document a narrow overlay-only waiver rule.
3. Re-run Voxelab Aries through the updated protocol before processing the real
   Discord backlog. Do not re-add Aries to catalog/overlay until those gates are
   green.

---

>>> START >>>

Read in order:
1. `Projects/CLAUDE.md` (or `AGENTS.md`) — top-level rules.
2. `Projects/3dprintassistant/CLAUDE.md` + `docs/3dpa-context.md` — architecture.
3. `docs/planning/ROADMAP.md` — live status.
4. `docs/sessions/INDEX.md` + the last 3 session logs, especially:
   - `2026-06-13-cowork-appdev-voxelab-aries-no-go-wrap.md`
   - `2026-06-13-cowork-appdev-printer-intake-scout-ship.md`
   - `2026-06-12-cowork-appdev-printer-intake.md`
5. `docs/superpowers/plans/2026-06-13-voxelab-aries-printer-add.md`
6. `docs/runbooks/printer-addition-protocol.md`
7. `docs/superpowers/specs/2026-06-13-printer-intake-evidence-rules-design.md`
8. `ai-operating-model/docs/agents/printer-intake-scout.md`
   + `ai-operating-model/docs/agents/printer-addition-assistant.md`

Today's task:

Patch the printer-addition process for missing manufacturer acceleration data
and the iOS verification gap, then re-run Voxelab Aries through the updated
flow. Only after that is green should the real Discord backlog be seeded.

Scope:

- Web data/overlay process only unless the chosen rule requires app/schema work.
- Do not ship or republish Aries until `max_acceleration` is resolved under the
  updated rule.
- Do not push iOS; the iOS push gate remains active. Local commits are allowed
  only if the chosen verification path requires them.
- If producer/manufacturer data conflicts with reseller data, producer data
  wins. If producer data is absent for a profile-critical field, mark the field
  blocked or use an explicitly named app-side cap; never silently present a cap
  as manufacturer truth.

Process:

1. Write the small spec/rule update first.
2. Run a review gate.
3. Patch the protocol/scripts/data model as needed.
4. Verify web gates and the selected iOS gate/waiver.
5. Re-run Aries through the Assistant flow.
6. If green, then seed/process the real Discord backlog.

Standing rules:

- ROADMAP is truth; read it before status claims.
- Web is master; iOS mirrors bundled data byte-identical when bundled data
  changes.
- Data/logic changes require explicit web + iOS impact evaluation.
- One accepted review finding = one commit per platform unless owner overrides.
- Live KV diagnostics must use `wrangler kv ... --remote`.

<<< END <<<

## Maintenance Note

Regenerated on Trigger A / Trigger B / explicit owner ask only. The locked item
is process hardening before backlog seeding; the tee diagnostic brief remains a
resolved record in `codex/printer-intake-tee-handover/HANDOVER.md`.
