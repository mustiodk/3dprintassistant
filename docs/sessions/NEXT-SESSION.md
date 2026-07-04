# NEXT-SESSION — 3dpa

**Purpose:** kickoff prompt for the next 3dpa session.

**Last updated:** 2026-07-04 (**Ender-3 V4 Combo shipped live via web + iOS overlay, but the run is contaminated as an autonomy proof**). Web serves `ender3_v4_combo`; remote overlay serves `content_version=2026070401` with matching payload hash. Codex manually performed the Assistant half after Scout staged the candidate, violating the intended observer-only test boundary. **Locked entry point:** postmortem the observer-boundary failure and define the next observer-only S5/autonomy test contract before making any claim that the intake machinery can run unattended.

---

>>> START >>>

Read in order:
1. `Projects/CLAUDE.md` (or `AGENTS.md`) — top-level rules.
2. `Projects/3dprintassistant/CLAUDE.md` + `docs/3dpa-context.md` — architecture + engine + standing rules.
3. `docs/planning/ROADMAP.md` — banner + Active Work Queue (the authoritative status).
4. `docs/sessions/INDEX.md` + the last 3 session logs (newest first: `2026-07-04-cowork-appdev-ender3-v4-combo-intake.md`, `2026-06-20-cowork-appdev-overlay-option2.md`, `2026-06-20-cowork-appdev-research-capable-screening.md`).
5. `docs/sessions/NEXT-SESSION.md` (this file).

Locked next task:

Postmortem the contaminated Ender-3 V4 Combo observer run and write/approve the next observer-only S5/autonomy test contract. The contract must explicitly say:
- Observer may read logs/status and report where the process is.
- Observer may not research, patch, commit, push, edit overlay/data, or manually progress a candidate.
- If the process stops, observer records the stop point and root cause; fixes only begin after explicit owner `go fix`.
- A successful future run must distinguish Scout success from Assistant success.

Current live delivery facts:
- Web commit `075583e` adds Creality Ender-3 V4 Combo to `data/printers.json`.
- Remote iOS overlay `content_version=2026070401` includes the same row and was live hash-verified.
- iOS bundled mirror commit `8129316` is local-only. `3dprintassistant-ios` is 3 commits ahead (`aedaac7`, `e304843`, `8129316`) under the iOS push gate; do not push iOS unless the owner explicitly opens a TestFlight-ready iOS ship path.

Open lanes after the locked postmortem:
- **S5 — Assistant autonomy ladder** (unblocked since S4 landed; QA-green spec + plan exist, owner-gated, not proven). Branch + review note + PR + owner go/no-go; consumes S4's calibration record. Specs/plans under `docs/superpowers/{specs,plans}/2026-06-15-s5*`.
- **v1.0.5 ASC acceptance** — v1.0.5 is on TestFlight (run 27569280416 = success); owner on-device S1 acceptance + ASC processing still pending.
- **Web-only quick wins** (decoupled, v1.0.x-safe): `[CRITICAL-001-followup]` route iOS feedback to its own Discord channel; `[LOW-011]` feedback email visibility/copy parity.
- **S2 Gate 3** (web nudge routing printer mentions into the Missing-Printer form) — deferred, owner-pick.

Scope / gating:
- One finding = one commit; web auto-deploys from `main`.
- iOS push gate unchanged: commit iOS locally; push only when TestFlight-ready + owner go.
- Any engine/data change → web+iOS impact eval + the profile-data-change gate (`docs/runbooks/profile-data-change-test-protocol.md`).
- Historically-buggy areas (overlay/collision, intake capture) → TDD + a different-model review before any live push.

Standing rules:
- ROADMAP is truth; read it before any status claim.
- Published != delivered: curl-verify live after any overlay/web push.
- Printer-intake delivery to current iOS users is remote overlay, not App Store/TestFlight.

<<< END <<<

## Maintenance Note

Regenerated on Trigger A / Trigger B / explicit owner ask only. Locked entry is the postmortem + observer-only autonomy-test contract, not more printer shipping.
