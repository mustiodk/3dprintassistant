# NEXT-SESSION — 3dpa

**Purpose:** kickoff prompt for the next 3dpa session.

**Last updated:** 2026-06-14 (mega-x-ship wrap). The **real Discord missing-printer backlog
run is COMPLETE** — 16 entries seeded + Scout-screened, **Anycubic Mega X shipped + verified
live** (overlay `content_version=2026061402`, `[aries,mega_x]`; iOS mirror local under the push
gate). That closes the printer-intake delivery arc. **The locked next entry is the two Scout
follow-up findings** surfaced by running the real backlog — both **P2, non-blocking** (the
Assistant's catalog cross-check was the safety net; nothing wrong shipped).

**Locked next entry point — two Scout findings (ROADMAP → Active Work Queue → Printer Intake Automation):**
1. **Scout dedupe robustness (clear fix — implement).** Brand typos (`Bmbulab`→`bambu_lab`) and
   model-variant suffixes (`i7 w/CFS`→`sparkx_i7`) defeat the Scout's dedupe, surfacing
   already-shipped printers as `needs-research` false positives. Fix in
   `scripts/printer-intake-scout.js`: a brand-alias / fuzzy-brand map + model suffix-stripping
   in the `norm()` / match path, plus tests in `scripts/printer-intake-scout.test.js`. This is a
   Scout-script-only change (no engine/data/UI) — gate with the test suite.
2. **General-feedback requests invisible (owner-pick BEFORE building).** Printer requests filed
   via the general-feedback form never reach the Scout (the tee at `functions/api/feedback.js`
   only tees `category==="missingPrinter"`) and screen as `unactionable`. Two fix options:
   (a) a form-UX nudge routing printer mentions into the Missing-Printer form; (b) widen the tee
   + a low-precision heuristic pass over general feedback for owner review. **Ask the owner which
   before implementing.**

**Also note (carried, non-blocking):**
- **md-hygiene doc fix (carried, still unfixed):** `3dprintassistant/CLAUDE.md:63` +
  `docs/3dpa-context.md` say "Cloudflare Pages"; it's actually Workers + Assets. Owner-decision
  one-liner.
- **Deferred (needs an iOS binary):** drop the all-or-nothing Swift disjoint guard in
  `PrinterCatalogProvider.validatePayload` (ROADMAP Deferred/Parked, P2).

---

>>> START >>>

Read in order:
1. `Projects/CLAUDE.md` (or `AGENTS.md`) — top-level rules.
2. `Projects/3dprintassistant/CLAUDE.md` + `docs/3dpa-context.md` — architecture + engine.
3. `docs/planning/ROADMAP.md` — live status (Active Work Queue → Printer Intake Automation has the two findings).
4. `docs/sessions/INDEX.md` + the last 3 session logs, especially:
   - `2026-06-14-cowork-appdev-printer-intake-real-backlog-mega-x.md` (this run — the findings)
   - `2026-06-14-cowork-appdev-ios-overlay-aries-collision-fix.md`
   - `2026-06-14-cowork-appdev-printer-intake-process-patch-aries-ship.md`
5. `scripts/printer-intake-scout.js` + `scripts/printer-intake-scout.test.js` (the dedupe/match path for finding 1).
6. `ai-operating-model/docs/agents/printer-intake-scout.md` (Scout contract — dedupe/triage rules).

Today's task:

Improve the Printer Intake Scout per the two findings from the real-backlog run.
- **Finding 1 (implement):** harden the Scout's dedupe against brand typos + model-variant
  suffixes so already-shipped printers stop surfacing as `needs-research` false positives.
- **Finding 2 (decide first):** ask the owner to pick (a) form-UX nudge vs (b) widen-tee +
  heuristic for general-feedback printer requests, then implement the chosen path.

Scope:

- Finding 1 is Scout-script-only (`scripts/printer-intake-scout.js` + its test suite) — no
  engine.js / data / app / overlay changes. Gate with `node scripts/printer-intake-scout.test.js`.
- Finding 2 touches the Worker tee (`functions/api/feedback.js`) and/or web form UX — confirm the
  approach with the owner before coding; it is NOT a printer-add.
- Neither is a printer add, so the printer-addition protocol's per-printer gates don't apply;
  use the standard data/logic change gate where relevant.

Process:

1. Read the Scout + its tests + the contract; reproduce the false-positive dedupe behavior
   (X2D under "Bmbulab", i7 under "Sparkx i7 w/CFS") as failing tests first (TDD-RED).
2. Implement the brand-alias/fuzzy + suffix-strip fix; make the tests green.
3. For finding 2, get the owner's pick, then implement + test.
4. Subagent code-review the change; one finding = one commit.

Standing rules:

- ROADMAP is truth; read it before status claims.
- Attachments don't reach this session — if the owner says "attached", ask for a plain-text paste
  (memory `feedback_attachments_dont_reach_session`).
- The Scout is a deterministic script; the Assistant is an in-session owner-gated contract (not a
  standalone bot).
- iOS push gate stays active (iOS `main` is 4 commits ahead, local-only).
- Live KV diagnostics/reads must use `wrangler kv ... --remote` (auth via the dedicated
  `printer-agent-token-v2`, not the bare OAuth session).

<<< END <<<

## Maintenance Note

Regenerated on Trigger A / Trigger B / explicit owner ask only. The locked item is the two Scout
follow-up findings (dedupe robustness + general-feedback invisibility); the Mega X real-backlog
run is a closed record in `2026-06-14-cowork-appdev-printer-intake-real-backlog-mega-x.md`.
