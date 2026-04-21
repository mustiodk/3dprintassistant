# Next session — copy-paste prompt

**Last updated:** 2026-04-21 (end of [`2026-04-21-cowork-appdev.md`](2026-04-21-cowork-appdev.md)).

Copy everything between the `>>> START >>>` and `<<< END <<<` markers below into a fresh Cowork session to kick off the next one.

---

>>> START >>>

Start a new appdev session.

Read, in order:
1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — standing rules (always).
2. `3dprintassistant/docs/planning/ROADMAP.md` — check "Last updated" and the IR-* section near the top.
3. `3dprintassistant/docs/sessions/INDEX.md` — skim the top 5 entries.
4. The last 3 session logs (from INDEX.md — open each in full, not just the summary line).
5. `3dprintassistant/docs/reviews/2026-04-20-internal/01-critical.md` — CRITICAL-003 is today's target. Glance at CRITICAL-001 so you know what's after it.

Today: continue IR-0 triage with **[CRITICAL-003]** — unknown preset-ID silent fallback in `resolveProfile`.

Scope (from 01-critical.md):
- In `engine.js` `resolveProfile`, validate `state.surface` / `state.strength` / `state.speed` against their valid preset sets at function entry.
- Unknown value → coerce to the default preset AND emit a structured warning `invalid_preset` with the offending key + value in the detail text.
- Add matching XCTest in `EngineServiceTests` — pass a bogus `state.speed` and assert the warning fires.
- Apply across web + iOS (engine.js stays byte-identical; sync after editing web).
- Keep iOS test count at 22/22 (was 21/21 after CRITICAL-002).

Process:
1. Propose the fix in plain English with the exact engine.js diff. Include the warning text + which default is used for each preset class.
2. Wait for my sign-off before editing either repo.
3. Implement. One commit = this one finding. Don't batch.
4. Re-run walkthrough harness + iOS tests. Show the result.
5. Update ROADMAP IR-0 (tick the CRITICAL-003 box). Write session log + update INDEX.md + write the next NEXT-SESSION.md.
6. Stop and ask before moving to the next IR-0 item.

Standing rules (don't drift):
- Progress bar on every multi-step task: `[🟩🟩⬜⬜⬜⬜ 40%] step`.
- ROADMAP is truth — read it before reporting status.
- Right thing not easy thing. Full correct fix, web + iOS, no band-aids.
- Don't push iOS main without explicit sign-off (triggers TestFlight).
- Session log at `docs/sessions/2026-04-22-cowork-appdev.md` with a **Durable context** section at the top.
- INDEX.md gets a new bullet at the top.
- NEXT-SESSION.md gets rewritten at session end.
- One finding = one commit. Don't batch review findings.

<<< END <<<

---

## How to maintain this file

- **Every session end**, I rewrite this file with the prompt for the next session — populated from the "Next session" / "Open questions" sections of the session log I just wrote.
- **No other file** serves this role. If this file is stale (last-updated > 7 days), ask me to regenerate from the most recent session log.
- **Owner action**: just copy-paste the block between the markers. Nothing else to do.
