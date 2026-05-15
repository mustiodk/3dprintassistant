# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-15 after the printer-addition-protocol session close. **The new protocol is locked at v3 and pushed.** Owner-stated goal for the next session: **test the new protocol end-to-end in a fresh chat** by walking a real (or rehearsed) printer addition through the runbook. Lane B (v1.0.4 monitoring) and Lane C (v1.0.5 hygiene cold-start) remain as fallbacks.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — Printer Addition Protocol trial (Lane A)

## Required skills — invoke at cold-start

Same remediation-arc skill set as the v1.0.4 arc, with `test-driven-development` and `verification-before-completion` carried forward as load-bearing because the protocol Phase 2 picker-dry-run script is a real executable gate.

1. `superpowers:using-superpowers`
2. `superpowers:writing-plans`
3. `superpowers:executing-plans`
4. `superpowers:test-driven-development`
5. `superpowers:verification-before-completion`
6. `superpowers:systematic-debugging` (if the trial surfaces a real bug in the protocol or script)
7. `superpowers:requesting-code-review` (only dispatched if a risk trigger fires; see Phase 5 of the runbook)

Load skills 1-5 at cold-start. Announce each.

## Read First, In This Order

Follow Trigger C. Show the `[🟩...⬜ N%]` progress bar at every phase. Confirm current state + locked next step + risks before any file edit.

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/CLAUDE.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md` — note standing rule 10 (the binding pointer to the runbook).
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
6. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
7. **The runbook itself** — `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/runbooks/printer-addition-protocol.md` (186 lines, locked at v3). Read in full.
8. Last three session logs (newest first):
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-15-cowork-appdev-printer-addition-protocol.md` (yesterday's authorship + Codex rounds)
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s9-bug-free-ship.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s8-7-codex-cleanup.md`
9. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md` (this file)
10. **Codex review trail** (optional but recommended for context on why the protocol looks the way it does):
    `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/printer-addition-protocol-review/codex-2026-05-15-printer-addition-protocol-packet.md`

## Current State (verify at session start)

- **Protocol v3 locked.** Web HEAD `9754c47` pushed to `origin/main` (run `git log --oneline -3` in `Projects/3dprintassistant/` to verify).
- **iOS HEAD `c99a797` pushed.** v1.0.4 shipped to TestFlight 2026-05-15 ([run 25892826819](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25892826819)).
- **Picker dry-run + tests:** run `node scripts/picker-dry-run.test.js` from `Projects/3dprintassistant/`. Expect `ALL 6 TESTS PASS`.
- **No work in flight.**

## Lane A — Printer Addition Protocol trial (owner-preferred for this session)

### Step 0 — Pick the trial printer

Ask owner which printer to add. Source options:
- A real community-requested printer with available manufacturer documentation (vault `50-Wiki/raw/3dpa/` is the canonical landing zone for source clippings).
- A rehearsal-mode "dry run" against an already-bundled printer (e.g., re-walking the SPARKX i7 add) to validate the protocol without touching real data.

If no candidate is ready, default to rehearsal mode: pick an existing printer, walk Phase 1 + Phase 2 against it, stop before Phase 3, then post-mortem the rehearsal.

### Step 1 — Run the trigger

Use the vault trigger as the kickoff prompt (under "3dpa Work Gates" in `Obsidian Vault/20-Areas/Development/ai-collaboration/trigger-cheatsheet.md`):

```text
Run the 3DPA printer addition protocol.

Follow docs/runbooks/printer-addition-protocol.md: Phase 1 taxonomy decision before any
file edit; Phase 2 picker dry-run (node scripts/picker-dry-run.js …); Phase 3 web →
iOS mirror → optional overlay commits with no mixed work; Phase 5 10-bullet self-check
gates Trigger A wrap-up; escalate to superpowers:requesting-code-review only when risk
triggers fire (new brand, new series_group, overlay publish, engine/app/validator/spec
touched, conflicting sources, deprecation, multi-printer session).
```

### Step 2 — Walk the protocol

Execute Phases 1 → 2 → 3 → (4 if applicable) → 5 in order. Treat each phase boundary as a checkpoint with the owner.

### Step 3 — Post-trial debrief

After the trial (whether it shipped a real printer or was a rehearsal), capture findings:
- Did Phase 1 (taxonomy decision) feel naturally early, or did Claude want to edit files first?
- Did Phase 2 (picker dry-run) catch anything? Or was it a no-op confirmation?
- Did any of the 10 self-check bullets feel ambiguous or subjective?
- Did any risk trigger fire? If so, was the reviewer dispatch worth it, or did it feel like overhead?
- Any taxonomy decisions Claude got wrong that the owner caught in-app?

These findings either reinforce v3 as locked, or seed a v4 / surgical edit.

## Lane B — v1.0.4 live monitoring (fallback)

1. Check TestFlight build status (`gh run view 25892826819 --repo mustiodk/3dprintassistant-ios`).
2. App Store Connect: review status + reviewer feedback.
3. `/analytics` dashboard (admin token) — Product lens (All / Web / iOS).
4. Discord `#web-app-feedback` (iOS feedback also lands here until `CRITICAL-001-followup` lands).
5. Sentry — new issues since 2026-05-15.

## Lane C — v1.0.5 hygiene pass cold-start (fallback)

See `docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s9-bug-free-ship.md` "Next session" for the carry-forward bundle (helper extraction, m2 test rename, Min-1 PLA+PETG+ABS slow_layer_time test coverage, Min-2 NSNumber decoder, magic constants, mobile-card warning text length, smoke assertion for emit-vs-claim parity, shared RETIRED_IDS const, walkthrough hardcoded baseline, MEDIUM-02 packet-text accuracy decision).

## Scope Rules

- **The protocol is the gate.** Do not skip Phase 1 or Phase 2. If the trial surfaces a real reason to skip, that's a finding to document, not a permission slip.
- **iOS push remains owner-authorized only.** v1.0.4 just shipped; no in-flight binary.
- **Internal code-review subagent** is risk-triggered only per the runbook's Phase 5. Trigger conditions are explicit; don't fire it preemptively.
- **Verification-before-completion is rigid** — especially for any executable snippet authored during the session.
- **Trigger A close runs at session end.**

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
