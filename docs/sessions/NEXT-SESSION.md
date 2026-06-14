# NEXT-SESSION — 3dpa

**Purpose:** kickoff prompt for the next 3dpa session.

**Last updated:** 2026-06-14 (overlay-fix wrap). The **iOS overlay Aries-collision is
fixed and live** — Aries is now actually delivered to v1.0.4 (overlay
`content_version=2026061401`, aries-only; the prior `2026061301` carried `sparkx_i7` which
collided with v1.0.4's bundled catalog and made the iOS runtime drop the whole overlay).
The ship validator is hardened (collide vs the union of all baselines ≥ min_app_version +
require a MARKETING_VERSION baseline + self-test) and the runbook has a Phase 4b
overlay→bundled graduation rule. That closes the debug detour; the locked next entry returns
to the **pre-empted real Discord missing-printer backlog seeding**.

**Locked next entry point:**
1. **Seed the real Discord missing-printer backlog** into the `PRINTER_INTAKE` KV namespace
   (remote — `wrangler kv ... --remote`), then run `scripts/printer-intake-scout.js` to
   triage it.
2. **Process surfaced candidates** via the Printer Addition Assistant against the patched
   `docs/runbooks/printer-addition-protocol.md` (app-cap path for unpublished
   `max_acceleration`; data-only iOS XCTest waiver for value-only adds; **Phase 4b** — drop a
   graduated printer from the overlay + add its baseline when a binary bakes it in). Photon
   stays `declined-non-fdm`.
3. One printer = one focused commit per repo; iOS push gate stays active.

**Optional follow-ups (not blocking):**
- **Doc fix:** `3dprintassistant/CLAUDE.md:63` + `docs/3dpa-context.md` say "Cloudflare
  Pages" — it's actually Workers + Assets (`wrangler.toml`: `main="worker.js"`, no
  `pages_build_output_dir`). Correct both.
- **Deferred (needs an iOS binary):** drop the all-or-nothing Swift disjoint guard in
  `PrinterCatalogProvider.validatePayload` so a colliding overlay entry is skipped instead of
  dropping the whole overlay; add XCTest. ROADMAP Deferred/Parked (P2); spec Part C in
  `docs/superpowers/specs/2026-06-14-ios-overlay-aries-collision-fix-design.md`.

---

>>> START >>>

Read in order:
1. `Projects/CLAUDE.md` (or `AGENTS.md`) — top-level rules.
2. `Projects/3dprintassistant/CLAUDE.md` + `docs/3dpa-context.md` — architecture.
3. `docs/planning/ROADMAP.md` — live status.
4. `docs/sessions/INDEX.md` + the last 3 session logs, especially:
   - `2026-06-14-cowork-appdev-ios-overlay-aries-collision-fix.md` (this fix)
   - `2026-06-14-cowork-appdev-printer-intake-process-patch-aries-ship.md`
   - `2026-06-13-cowork-appdev-printer-intake-scout-ship.md`
5. `docs/runbooks/printer-addition-protocol.md` (app-cap path + data-only XCTest waiver +
   Phase 4b overlay→bundled graduation).
6. `ai-operating-model/docs/agents/printer-intake-scout.md`
   + `ai-operating-model/docs/agents/printer-addition-assistant.md`
7. `codex/printer-intake-tee-handover/HANDOVER.md` (KV tee context) if KV details are needed.

Today's task:

Seed the real Discord missing-printer backlog into the `PRINTER_INTAKE` KV namespace, run
the deterministic Scout to triage it, then process surfaced candidates through the Printer
Addition Assistant + the patched printer-addition protocol.

Scope:

- This is the real backlog run — the process is already patched and Aries already shipped
  (and is now actually delivered to v1.0.4 via overlay `2026061401`); do not re-do the
  process patch or the overlay fix.
- Web data + additive iOS overlay is the ship-path; no TestFlight/app-version step for
  current users. Do not push iOS; the push gate remains active.
- Use the `app-cap` path only when its four conditions hold (documented null-source sweep;
  value ≤ lowest sibling bedslinger ceiling; required `notes[]` provenance line; reviewer GO).
- When a printer is bundled into a future binary, apply Phase 4b: drop it from the overlay +
  add its baseline (this is the rule whose absence hid Aries).
- FDM-only Phase 1.0 governs (resin auto-declined).

Process:

1. Seed + verify the KV backlog (`--remote`).
2. Run the Scout; review its triage + `needs-research` skeletons.
3. Per candidate: Assistant assisted-research → recommendation → owner approval → protocol
   Phase 3–5 (commit, verify, overlay, risk review when triggered).
4. Confirm any live overlay `content_version` after web push (published ≠ delivered — verify
   the overlay validates against the real bundled baseline, not just that it's served).

Standing rules:

- ROADMAP is truth; read it before status claims.
- Web is master; iOS mirrors bundled data byte-identical when bundled data changes.
- Data/logic changes require explicit web + iOS impact evaluation.
- One accepted review finding = one commit per platform unless owner overrides.
- Live KV diagnostics/reads/writes must use `wrangler kv ... --remote`.
- Published/served ≠ delivered: an overlay delivery claim needs consumer-acceptance evidence.

<<< END <<<

## Maintenance Note

Regenerated on Trigger A / Trigger B / explicit owner ask only. The locked item is
real-backlog seeding; the overlay-collision-fix arc is a closed record in
`2026-06-14-cowork-appdev-ios-overlay-aries-collision-fix.md` + the plan
`docs/superpowers/plans/2026-06-14-ios-overlay-aries-collision-fix.md`.
