# NEXT-SESSION — 3dpa

**Purpose:** kickoff prompt for the next 3dpa session.

**Last updated:** 2026-06-20 (**overlay Option 2 SHIPPED + LIVE** — the queue's last *locked* item is done). The remote overlay now serves `content_version=2026062001` with Snapmaker 2.0 A350 + FlashForge Creator 5 Pro (plus aries/mega_x kept), the ship validator is Part-C-aware, and the runbook Phase 4b is reconciled. **There is no locked next task** — the next session is owner's-pick from the open lanes below.

---

>>> START >>>

Read in order:
1. `Projects/CLAUDE.md` (or `AGENTS.md`) — top-level rules.
2. `Projects/3dprintassistant/CLAUDE.md` + `docs/3dpa-context.md` — architecture + engine + standing rules.
3. `docs/planning/ROADMAP.md` — banner + Active Work Queue (the authoritative status).
4. `docs/sessions/INDEX.md` + the last 3 session logs (newest first: `2026-06-20-cowork-appdev-overlay-option2.md`, `2026-06-20-cowork-appdev-research-capable-screening.md`, `2026-06-16-cowork-appdev-s4-retrospective-s2-capture.md`).
5. `docs/sessions/NEXT-SESSION.md` (this file).

No locked task. Confirm understanding in 3–5 bullets, then **ask the owner which lane to pick** (don't assume). Open lanes:

- **S5 — Assistant autonomy ladder** (unblocked since S4 landed; QA-green spec + plan exist, **owner-gated**, not executed). Branch + review note + PR + owner go/no-go; consumes S4's calibration record. Specs/plans under `docs/superpowers/{specs,plans}/2026-06-15-s5*`.
- **v1.0.5 ASC acceptance** — v1.0.5 is on TestFlight (run 27569280416 = success); **owner on-device S1 acceptance + ASC processing still pending**. If accepted, it supersedes 1.0.4. Monitor / confirm, then the 2 local iOS mirror commits (`aedaac7`/`e304843`) can ride the next push.
- **Web-only quick wins** (decoupled, v1.0.x-safe): `[CRITICAL-001-followup]` route iOS feedback to its own Discord channel (~15 LoC `functions/api/feedback.js` + secret); `[LOW-011]` feedback email visibility/copy parity.
- **S2 Gate 3** (web nudge routing printer mentions into the Missing-Printer form) — deferred, owner-pick.
- **Open follow-ups (not locked):** the 2 autonomous-run findings from 2026-06-20 (`2026-06-20-autonomous-*`, both `open`); spawned task `task_cb32967a` (`functions/` not asset-ignored); v1.0.3-batch items 2 (environments taxonomy) / 5 (web output-panel UX); resin PoC (docs-only).

Scope / gating:
- One finding = one commit; web auto-deploys from `main`.
- iOS push gate unchanged: commit iOS locally; push only when TestFlight-ready + owner go.
- Any engine/data change → web+iOS impact eval + the profile-data-change gate (`docs/runbooks/profile-data-change-test-protocol.md`).
- Historically-buggy areas (overlay/collision, intake capture) → TDD + a different-model (Codex `bridge --mode codex-only`) review before any live push.

Standing rules:
- ROADMAP is truth; read it before any status claim.
- Published ≠ delivered: curl-verify live after any overlay/web push.
- Develop review-gated work under a `claude-sync.sh hold`; release after the deliberate commit.

<<< END <<<

## Maintenance Note

Regenerated on Trigger A / Trigger B / explicit owner ask only. No locked task as of 2026-06-20 — overlay Option 2 (the last locked item) shipped + verified live. Next session picks a lane from the START block above.
