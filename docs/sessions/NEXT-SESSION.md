# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-10 after multi-surface wrap-up, ROADMAP repair, vault AI collaboration guide, and TestFlight build `202605101130`.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant - TestFlight verification + protocol-aware handoff

## Read First, In This Order

Follow Trigger C from the canonical protocol. Read:

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
6. Last three session logs, in full:
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-10-cowork-appdev-multi-surface-wrap-protocol.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-10-cowork-appdev-profile-temperature-audit-testflight.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-10-cowork-appdev-ios-remote-printer-catalog.md`
7. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md`
8. Task-specific files:
   - profile/data work: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/runbooks/profile-data-change-test-protocol.md`
   - remote catalog work: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/specs/ios-remote-printer-catalog.md`
   - protocol/process work: `/Users/mragile.io/Documents/Claude/Obsidian Vault/20-Areas/Development/ai-collaboration/README.md`, `working-guidelines.md`, and `trigger-cheatsheet.md`

## Current State

3DPA latest candidate:

- Web/source commit `39a8d0e` - `fix: clamp nozzle temps across profile outputs`.
- iOS commit `6bd1210` - `fix: sync nozzle temp clamp engine`.
- TestFlight workflow [`25627557344`](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25627557344) succeeded.
- Uploaded TestFlight build: version `1.0.3`, build `202605101130`.
- Owner cancelled the previous v1.0.3 review for build `202605090842`.
- ROADMAP has been repaired and now points at `202605101130`.

What changed in the latest 3DPA build:

- Nozzle temps clamp to `min(material.nozzle_temp_max, printer.max_nozzle_temp)` in simple display and advanced filament settings.
- Legacy export and Bambu export inherit clamped temps.
- New warnings explain printer nozzle cap clamps and material max clamps.
- Enclosed printers no longer show generic open-frame PC warning.
- Active chamber warning includes printer max chamber capability.
- Printer picker shows `High-speed` instead of raw marketed `700/800/1000 mm/s`.
- Creality CFS warning applies to all CFS printers, not only K2 Plus.
- Lightweight future protocol exists at `docs/runbooks/profile-data-change-test-protocol.md`.

Protocol/vault changes from the latest wrap:

- New vault AI collaboration area: `/Users/mragile.io/Documents/Claude/Obsidian Vault/20-Areas/Development/ai-collaboration/`.
- Trigger cheat sheet now includes cold start, wrap-up, handoff, vault catch-up, protocol repair, profile/data gate, TestFlight gate, web+iOS sync, agent review, phone tests, wiki source review, and multi-surface wrap-up prompts.
- Working guidelines now explicitly require protocol literalism, visible progress, quality-first pushback, hobby-project-sized process, no silent status drift, and multi-surface wrap-ups.
- Vault `CLAUDE.md` now distinguishes content curation from git autosync.

## Recommended First Lane

TestFlight phone verification for build `202605101130`.

Phone test cases:

1. **X1E chamber copy:** Bambu Lab -> X1E, PC, Standard 0.4. Expected: no generic open-frame PC warning; active chamber detail says X1E supports up to `60°C`.
2. **P2S PC bed boundary:** P2S + PC. Expected: bed clamps to `110°C`; clamp warning, not hard incompatible.
3. **A1 Mini HIPS bed clamp:** A1 Mini + HIPS. Expected: bed clamps to `80°C`; no hard bed-incompatible warning.
4. **Ender-3 V3 PETG fast nozzle cap:** Ender-3 V3 + PETG Basic + Fast. Expected: nozzle clamps to `260°C`; nozzle cap warning appears.
5. **H2D picker metadata:** Bambu printer list. Expected: H2D/H2D Pro/X2D show `High-speed`, not raw `1000 mm/s`.

If phone QA is green, decide whether to submit build `202605101130` to App Review.

## Scope Rules

- Use the visible progress tracker for multi-step work.
- Web is source-of-truth; iOS mirrors engine/data byte-identically.
- Keep process lightweight: this is a single-person hobby project.
- Push back when quality would suffer, a requested push would ship failed checks, or a TestFlight build would add little value.
- No iOS push/TestFlight dispatch without confirming same-version vs version-bump intent.
- One finding = one commit per platform when practical.
- Do not guess behavior; read the actual file.
- If a session touches multiple projects/surfaces, run wrap-up for each in sequence and produce one combined handoff prompt.
- Vault currently has unrelated Bambu raw-source changes. Do not mix them into protocol/3DPA commits unless explicitly asked.

## Open Notes

- Remaining product lanes only if owner asks: environments taxonomy; web output-panel UX.
- Non-blocking future polish: PC still has a generic `Bed temperature 110°C+` material warning even on capable printers. Consider making it printer-aware later if it feels noisy.
- Vault Bambu raw-source changes should be handled as a separate source-ingest/data-review task.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
