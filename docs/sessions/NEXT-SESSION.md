# NEXT-SESSION — 3dpa

**Purpose:** kickoff prompt for the next 3dpa session.

**Last updated:** 2026-06-12 wrap (printer-intake). The active concrete task is the **Printer Intake Scout build** (Phase 2 of the missing-printer automation). Phase 1 (the feedback tee) is committed local-only and intentionally unpushed (owner: no deploy yet). The Scout's spec is the two ai-om agent contracts.

**Other open lanes (not locked — see ROADMAP for the full picture):** resin-scaling PoC v5 mechanical pass; v1.0.5 hygiene carries; web output-panel UX deep-dive. Owner-pick if not continuing the Scout.

**One-line summary:** Build `scripts/printer-intake-scout.js` — the deterministic core of the missing-printer Scout — against fixtures. No live infra needed to start.

---

>>> START >>>

Read in order before coding:
1. `Projects/CLAUDE.md` (or `AGENTS.md`) — top-level rules.
2. `Projects/3dprintassistant/CLAUDE.md` — 3dpa architecture (engine/app separation, data flow).
3. `Projects/3dprintassistant/docs/3dpa-context.md` — evergreen context.
4. `Projects/3dprintassistant/docs/runbooks/printer-addition-protocol.md` — the manual process the Scout half-automates (Phase 1 taxonomy + FDM scope, Phase 2 picker dry-run).
5. `Projects/3dprintassistant/docs/specs/ios-remote-printer-catalog.md` — overlay mechanics (the ship path).
6. **The spec:** `Projects/ai-operating-model/docs/agents/printer-intake-scout.md` + `printer-addition-assistant.md` — the two contracts.
7. This session's log: `Projects/3dprintassistant/docs/sessions/2026-06-12-cowork-appdev-printer-intake.md`.

**Today's task:** Write `Projects/3dprintassistant/scripts/printer-intake-scout.js` — the Scout's **deterministic core**, runnable against a fixture queue (no KV, no live infra). It must:
- read intake entries from a fixture JSON file (same shape the `feedback.js` tee writes: `{fields:[{label,value}], email, context, appSource, receivedAt}`);
- map fields → brand/model;
- **dedupe** against `data/printers.json` (69 printers / 12 brands);
- **FDM scope-check** — decline known resin/non-FDM (blocklist of resin brands + model-line keywords: Photon, Saturn, Mars, Form, Sonic, Halot, …); the Anycubic Photon Mono M7 Pro example must land in `declined-non-fdm`;
- **triage** everything that fails the promotion gate (brand+model+confirmed novel FDM) into buckets: `unactionable` / `incomplete` / `unverified-model` / `declined-non-fdm` / `duplicate`. Note: `unverified-model` confirmation needs research (in-session), so the unattended core emits `needs-research` for brand+model+novel+non-resin, leaving the confirm step to the assisted pass;
- **in-queue dedupe** (collapse repeat requests for the same printer, with a count);
- write a **run report JSON** (counts per outcome + the triage list) and one **candidate skeleton** per `needs-research` item.

Add a fixture (`scripts/fixtures/printer-intake-sample.json`) with a mix: a valid novel FDM printer, a duplicate, a resin (Photon), a brand-only, an empty. Add a small test (match the style of `scripts/picker-dry-run.test.js`). Keep `engine.js`/`app.js` untouched.

**Scope guardrails:**
- Deterministic only — NO spec research / LLM calls in the script (that's the in-session Assistant step).
- Read-only on `printers.json`; the Scout never commits or mutates source-of-truth.
- Do not touch the feedback tee (already committed) or `wrangler.toml` (owner infra step, pending).

**Process:** progress bar on multi-step work; one-finding-one-commit; run the test green before declaring done; this is a new local script — committing is fine, web push stays gated on owner go (the deploy is a later infra step).

**Standing rules:** verify real paths before mutating; match tool weight to task (this is a focused script, not a framework); the iOS push gate is irrelevant here (no iOS binary touched).

<<< END <<<

## Maintenance Note

Regenerated on Trigger A / Trigger B / explicit owner ask only. A stale NEXT-SESSION between sessions is acceptable. **Phase 1 tee commit `2995ece` is intentionally unpushed** — not drift.
