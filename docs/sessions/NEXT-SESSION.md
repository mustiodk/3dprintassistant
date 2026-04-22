# Next session — copy-paste prompt

**Last updated:** 2026-04-22 (end of [`2026-04-22-cowork-appdev-housekeeping.md`](2026-04-22-cowork-appdev-housekeeping.md), after the security rotation + md-hygiene pass).

Copy everything between the `>>> START >>>` and `<<< END <<<` markers below into a fresh Cowork session to kick off the next one.

**Queue note:** IR-0 `[CRITICAL-003]` is now first in the queue — it was deferred by one session so the security + cleanup pass could land first. Remaining IR-0 after CRITICAL-003: `[CRITICAL-001]` (iOS feedback through Worker), `[HIGH-012]` (A1 why-text on wrong printers), `[HIGH-014]` (A1 mini bed-temp data verification), then the MEDIUM-015/016/018 + LOW-002 data-hygiene wins.

---

>>> START >>>

Start a new appdev-IR0 session. Resume the IR-0 ship-blocker queue.

Read, in order:
1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — standing rules (always). Pay attention to the Session-log protocol and the Md-hygiene evaluation standing rule.
2. `3dprintassistant/docs/planning/ROADMAP.md` — check "Last updated" and the IR-0 section. Confirm `[CRITICAL-003]` is still the first unchecked CRITICAL item.
3. `3dprintassistant/docs/sessions/INDEX.md` — skim the top 5 entries.
4. The last 3 session logs (in full — not just the INDEX one-liner). Newest first:
   - `docs/sessions/2026-04-22-cowork-appdev-housekeeping.md` — yesterday's security rotations. Open questions at the bottom may still need owner answers; if so, knock them out before code work.
   - `docs/sessions/2026-04-21-cowork-appdev.md` — CRITICAL-002 fix. The "Next session" section at the bottom has the CRITICAL-003 handoff specifics — reuse it.
   - `docs/sessions/2026-04-21-cowork-appdev-consolidation.md`
5. The CRITICAL-003 finding entry in `3dprintassistant/docs/reviews/2026-04-20-internal/01-critical.md` (search for `CRITICAL-003`).

Today's task: ship IR-0 `[CRITICAL-003]` — preset-ID validation in `resolveProfile`.

**Plain English:** today `resolveProfile(state)` silently coerces unknown `state.surface` / `state.strength` / `state.speed` values by falling back to defaults without telling anyone. The Phase 1 domain walkthrough flagged this as a CRITICAL — if the iOS app state ever drifts (new enum value, typo, stale localStorage), the profile output is wrong and the user never knows. Fix: validate against the known preset ID set per field, coerce unknowns to the documented default, and emit a structured warning `invalid_preset` with the offending field + received value. Mirror assertion in iOS XCTest.

Scope bullets:
- Engine: add a validation block at the top of `resolveProfile` for the 3 preset fields. Use the existing preset lookup tables (`SURFACE_PRESETS`, `STRENGTH_PRESETS`, `SPEED_PRESETS` — confirm exact names from engine.js) as the canonical sets. If `state.<field>` isn't in the set, coerce to the documented default (same defaults used when the field is empty/undefined) and push an `invalid_preset` warning with `{ field, received, coerced_to }`.
- Engine: confirm the `getWarnings` block emits the same warning when `resolveProfile` was called with an invalid preset, so the UI warning panel shows it. If `getWarnings` is pure of `resolveProfile` state (same pattern as CRITICAL-002), replicate the minimal validation there. Document the duplication in the session log's Durable context (same rationale as CRITICAL-002).
- Data: none. This is a code-only fix.
- iOS sync: `engine.js` byte-identical copy to `3DPrintAssistant/Engine/engine.js`.
- Tests: XCTest `testInvalidPresetCoercedAndWarned` — 3 assertions, one per field. Bridge calls `resolveProfile` with a bogus preset, asserts the output uses the documented default and the `invalid_preset` warning fires with the right `field` value.
- Walkthrough harness: no new combos needed; existing combos all use valid presets, so they should continue to pass unchanged. Run it as a regression check at the end.

Process:
1. Propose the full diff in plain English before touching files. Wait for owner sign-off.
2. Edit web engine.js → sync to iOS → add XCTest → run XCTest suite locally → run walkthrough harness. All must pass before committing.
3. One commit per platform (web, iOS), matching commit message `engine: validate preset IDs + emit invalid_preset warning [CRITICAL-003]`.
4. Push both.
5. Tick `[CRITICAL-003]` in ROADMAP IR-0.
6. Standard session-log + INDEX + NEXT-SESSION regeneration at end.

Standing rules (don't drift):
- Progress bar on every multi-step task: `[🟩🟩⬜⬜⬜⬜ 40%] step`.
- Md-hygiene sweep at session end.
- ROADMAP is truth. Tick `[CRITICAL-003]` when it lands.
- Right thing not easy thing. Don't batch CRITICAL-003 with another IR-0 item — one finding = one commit.
- Don't push iOS main without confirming the test suite is green.

<<< END <<<

---

## How to maintain this file

- **Every session end**, I rewrite this file with the prompt for the next session — populated from the "Next session" / "Open questions" sections of the session log I just wrote, plus any md-hygiene findings surfaced in that session.
- **No other file** serves this role. If this file is stale (last-updated > 7 days), ask me to regenerate from the most recent session log.
- **Owner action**: just copy-paste the block between the markers. Nothing else to do.
- **Queue pointer** at the top ("Queue note") tracks what's being deferred so nothing falls off.
