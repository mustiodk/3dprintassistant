# 2026-06-14 — Cowork (appdev): Printer-intake process patch + Voxelab Aries ship

## Durable context

- **`max_acceleration` is advisory-only in the engine.** Sole consumer is the
  HIGH-012 bedslinger warning copy (`engine.js:2415`, `"<printer> tops out at <X>
  mm/s²…"`); it never clamps an emitted acceleration (those come from
  `objective_profiles` tier maps with their own caps — verified empirically:
  Aries+PLA emits `outer_wall_acceleration=2500` while the cap is 5000). This is
  the load-bearing fact that makes a conservative app-cap *safe* — it can only
  make advice more cautious. It is the reason the app-cap exception is
  **acceleration-only**; no other profile/safety field has this property.
- **App-cap "separation" lives at the protocol/evidence layer, not in JSON.** The
  overlay validator (`validate-ios-printer-overlay.js`) rejects any printer key
  outside a fixed allowlist, so a structured `max_acceleration_provenance` key is
  impossible without a separate overlay-spec/validator arc. The sanctioned
  separation is therefore: the existing `max_acceleration` field + a required
  `notes[]` provenance line + a named `app-cap` confidence class + a reviewer
  trigger. No engine/validator/schema change, fully additive.
- **Data-only iOS XCTest waiver is sound because iOS = same engine.js bytes over
  same printers.json bytes + forgiving Codable.** Valid ONLY for value-only adds
  (no engine/Swift/schema/new-key change, byte-identical `diff -q`, web gates +
  overlay validator green). The Node overlay validator is the **non-waivable**
  proxy for the Swift `PrinterCatalogProvider` validate/merge/decode path (its
  enum allowlists are byte-identical to `PrinterCatalogProvider.swift:26-28` — a
  strict superset of the forgiving Swift decode). A new engine-branched enum value
  (`series`/`enclosure`/`extruder_type`) voids the waiver; a new free-string label
  (`series_group`, brand id) does not.
- **Voxelab does not publish an acceleration figure.** The official manual's full
  Equipment Parameters table has no acceleration row (confirmed every other field
  though, incl. bed 110°C which beats the reseller's 100°C). So `5000` is a
  genuine app-cap, justified as the lowest shipped bedslinger ceiling (Ender-3 V3
  SE / Mini+ / SV06 Plus / SV04). Manual URL in the Gate 4 commit body.
- **Process worked: per-gate subagent review caught two real defects pre-ship** —
  a fabricated "rule 9 — missing/extra decodes cleanly" citation (Gate 2 NO-GO;
  the real `3dpa-context.md` rule #9 is "null/missing… *because* additive") and an
  unhandled honesty gap (Gate 1; HIGH-012 shows the app-cap as "tops out at X").
  Both fixed before commit. This validates the owner's gated, plan-first,
  review-per-gate execution model for substantial work.

## What happened / Actions

- Owner redirected twice, both improving the outcome: (1) "check the manual first"
  — fetched the official Voxelab manual (`voxelab3dp.com`), which confirmed every
  field except acceleration and made the app-cap source-sweep airtight; (2)
  "create a plan first, gates per task, per-gate subagent review + QA, advance on
  green" — wrote and committed an 8-gate plan and executed it gate by gate.
- **Gates 1–3 (process patch):** added a sanctioned `app-cap` path for unpublished
  `max_acceleration` and a scoped data-only iOS XCTest waiver to the runbook +
  evidence-rules spec, and aligned both agent contracts. Gate 2 went
  NO-GO→patched (3 findings)→confirmation GO.
- **Gates 4–6 (Aries re-run):** manual-sourced web data + walkthrough combo +
  picker TC7 (RED→GREEN demoed); byte-identical iOS bundled mirror (waiver
  invoked, full Xcode unavailable, local commit only); overlay published
  `content_version=2026061301`.
- **Gate 7:** risk-triggered full review returned **GO**; visual-picker proof via
  preview server showed the "Voxelab › Aries" chip resolving correctly; owner
  confirmed.
- **Gate 8:** pushed web; updated planning surfaces; released hold.

## Files touched (Modified / Deleted / Untracked)

- Web (`3dprintassistant`): `docs/runbooks/printer-addition-protocol.md`,
  `docs/superpowers/specs/2026-06-13-printer-intake-evidence-rules-design.md`,
  `data/printers.json`, `scripts/picker-dry-run.test.js`,
  `scripts/walkthrough-harness.js`, `catalog/ios-printer-overlay-v1.json`,
  `docs/planning/ROADMAP.md`, `docs/sessions/INDEX.md`,
  `docs/sessions/NEXT-SESSION.md`; new `docs/superpowers/plans/2026-06-13-printer-intake-process-patch-and-aries-rerun.md`,
  new `docs/reviews/2026-06-13-profile-matrix-audit-voxelab-aries.md`, this log.
- ai-om (`ai-operating-model`): `docs/agents/printer-addition-assistant.md`,
  `docs/agents/printer-intake-scout.md`.
- iOS (`3dprintassistant-ios`): `3DPrintAssistant/Data/printers.json` (local only).

## Commits

Web (`3dprintassistant`, pushed `9760f2d..60b231a` + wrap commit):
- `ed3854d` docs: plan printer-intake process patch + Aries re-run
- `65dcac4` docs: protocol app-cap path for unpublished max_acceleration
- `30c3e31` docs: protocol data-only iOS XCTest waiver for printer adds
- `7d1e35a` data: add Voxelab Aries (Aries Series)
- `60b231a` data: publish Voxelab Aries iOS overlay (content_version=2026061301)
- (+ wrap commit: ROADMAP + session log + INDEX + NEXT-SESSION)

ai-om (parent `claude-projects`, pushed): `7b5356c` docs(agents): align printer-intake contracts.

iOS (`3dprintassistant-ios`, **local only — push gate**): `7cf5b73` data: sync printers.json — add Voxelab Aries (3 ahead of origin).

## Open questions / Follow-up

- **Next: seed the real Discord missing-printer backlog** into the `PRINTER_INTAKE`
  KV and run the Scout, then process the queue via the Assistant. Photon stays
  `declined-non-fdm`.
- **Findings sweep:** 1 K2/K4 — controller drafted a fabricated protocol-rule
  citation ("rule 9 — missing/extra decodes cleanly") from memory and inverted the
  real additivity rule; the Gate 2 subagent review overruled it (NO-GO). This is a
  recurrence of the assert-without-verify family — the gated second-eyes process
  caught it, which is the mitigation working as designed. No new finding file
  filed (family well-documented; vbm-v2 measures it); noted here. No K1, no K3.
- **md-hygiene:** the committed audit doc
  `docs/reviews/2026-06-13-profile-matrix-audit-voxelab-aries.md` prepends 17
  **pre-existing** `max_mvs missing keys present in k_factor_matrix` (0.8 nozzle)
  soft-warnings — unrelated to Aries, now captured in an Aries-named artifact.
  Non-blocking; worth a separate cleanup of the `max_mvs` 0.8-key gap. The prior
  no-go plan `docs/superpowers/plans/2026-06-13-voxelab-aries-printer-add.md` is
  kept as the historical NO-GO record (not an orphan). No `CLAUDE.md`/`AGENTS.md`
  edits this session → no protocol-file drift introduced.
- **iOS push gate:** iOS `main` is 3 commits ahead of origin (Aries add + the two
  prior net-revert commits). Stays local until the next TestFlight-ready push.

## Next session

Seed the real Discord missing-printer backlog into `PRINTER_INTAKE` KV, run
`scripts/printer-intake-scout.js`, and process surfaced candidates via the Printer
Addition Assistant + the (now patched) printer-addition protocol.
