# Next session — cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-10 after profile temperature audit, nozzle clamp fix, and TestFlight build `202605101130`.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — TestFlight verification follow-through

## Project at a glance

**3D Print Assistant** generates optimized slicer profiles based on **printer x material x nozzle x user goals x environment**. Two surfaces, one engine:

- **Web** (`3dprintassistant/`) — live at [3dprintassistant.com](https://3dprintassistant.com). Web is source-of-truth for engine/data.
- **iOS** (`3dprintassistant-ios/`) — embeds the same `engine.js` and bundled data. Engine/data changes must be mirrored byte-identically.

For full project context: read `docs/3dpa-context.md`.

## Current state

Latest pushed work:

- Web commit `39a8d0e` — `fix: clamp nozzle temps across profile outputs`.
- iOS commit `6bd1210` — `fix: sync nozzle temp clamp engine`.
- TestFlight workflow [`25627557344`](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25627557344) succeeded.
- Uploaded TestFlight build: version `1.0.3`, build `202605101130`.
- Owner had cancelled the previous v1.0.3 review and wanted a new build for testing.

What changed:

- Nozzle temps now clamp to `min(material.nozzle_temp_max, printer.max_nozzle_temp)` in simple display and advanced filament settings.
- Legacy export and Bambu export now inherit clamped temps.
- New warnings explain printer nozzle cap clamps and material max clamps.
- Enclosed printers no longer show the generic open-frame PC warning.
- Active chamber warning includes printer max chamber capability.
- Printer picker shows `High-speed` instead of raw marketed `700/800/1000 mm/s`.
- Creality CFS warning applies to all CFS printers, not only K2 Plus.
- Lightweight future protocol added at `docs/runbooks/profile-data-change-test-protocol.md`.

Verification already done:

- `node scripts/validate-data.js` — PASS.
- Main audit: `55/55` curated scenarios, `0/46,512` broad failures.
- Independent post-fix audit: `15/15` PASS.
- `node scripts/walkthrough-harness.js` — PASS.
- Web UI smoke — PASS.
- iOS `engine.js` byte-identical to web `engine.js`.
- iOS unit tests: `85/85` PASS.
- Both repos were clean after release pushes before session-close docs.

## Files to read in order

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/sessions/INDEX.md` — top 5 entries
5. `3dprintassistant/docs/sessions/2026-05-10-cowork-appdev-profile-temperature-audit-testflight.md`
6. `3dprintassistant/docs/runbooks/profile-data-change-test-protocol.md`
7. If doing remote catalog work: `3dprintassistant/docs/specs/ios-remote-printer-catalog.md`

## Recommended first lane

**TestFlight phone verification for build `202605101130`.**

Phone test cases:

1. **X1E chamber copy:** Bambu Lab -> X1E, PC, Standard 0.4. Expected: no generic open-frame PC warning; active chamber detail says X1E supports up to `60°C`.
2. **P2S PC bed boundary:** P2S + PC. Expected: bed clamps to `110°C`; clamp warning, not hard incompatible.
3. **A1 Mini HIPS bed clamp:** A1 Mini + HIPS. Expected: bed clamps to `80°C`; no hard bed-incompatible warning.
4. **Ender-3 V3 PETG fast nozzle cap:** Ender-3 V3 + PETG Basic + Fast. Expected: nozzle clamps to `260°C`; nozzle cap warning appears.
5. **H2D picker metadata:** Bambu printer list. Expected: H2D/H2D Pro/X2D show `High-speed`, not raw `1000 mm/s`.

If phone QA is green, decide whether to submit build `202605101130` to App Review.

## Standing rules

- Use the visible progress plan for multi-step work. Owner explicitly asked for it as a standing rule.
- Web is source-of-truth; iOS mirrors engine/data byte-identically.
- Keep process lightweight: this is a single-person hobby project. Use the standard gate by default; add extra audits only for risky data/engine changes.
- Push back when quality would suffer, a requested push would ship failed checks, or a TestFlight build would add little value.
- No iOS push/TestFlight dispatch without confirming same-version vs version-bump intent.
- One finding = one commit per platform when practical.
- Do not guess behavior; read the actual file.

## Open notes

- TestFlight build `202605101130` may need Apple processing time before visible.
- Non-blocking future polish: PC still has a generic `Bed temperature 110°C+` material warning even on capable printers. Consider making it printer-aware later if it feels noisy.
- Remaining product lanes only if owner asks: environments taxonomy; web output-panel UX.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
