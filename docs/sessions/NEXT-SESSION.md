# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-12 (owner comparison gate CLOSED — candidates merged into the My 3DPA merged plan, parked as a locked entry point; the release sequence continues unchanged).

The account work remains planning-only. Nothing is deployed or live from any account proposal. The two candidates are merged into one canonical decision set + plan (see ROADMAP banner/queue row); implementation is gated on **MG0 owner ratification + the SYN-17 Codex cross-model round**, sequenced AFTER the 1.0.7 and 1.0.8 trains.

---

Copy everything between the markers into a new session.

>>> START >>>

3dpa cold start.

Read in order:

1. `~/dev/Claude/Projects/CLAUDE.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md`
5. `3dprintassistant/docs/sessions/INDEX.md`
6. Last three relevant session logs:
   - `3dprintassistant/docs/sessions/2026-07-12-remote-audit-merge-my3dpa.md`
   - `3dprintassistant/docs/sessions/2026-07-12-cowork-appdev-independent-accounts-platform.md`
   - `3dprintassistant/docs/sessions/2026-07-12-cowork-appdev-accounts-platform.md`
7. This `NEXT-SESSION.md`.

Then verify local state:

```bash
cd ~/dev/Claude/Projects
~/.claude/claude-sync.sh verify-parents
~/.claude/claude-sync.sh push-children --dry
git -C 3dprintassistant fetch --all --prune
git -C 3dprintassistant status --short --branch
git -C 3dprintassistant-ios status --short --branch
```

Expected known warning: `3dprintassistant-ios` may remain ahead locally under the iOS push gate. Do not push it merely to clean health output.

Today's primary task: **continue the locked release sequence** — the reviewed iOS 1.0.7 issue-fix train, then the 1.0.8 tip-jar train (ROADMAP is truth for exact state).

Parked locked entry point (do NOT open without explicit owner command): **My 3DPA merged platform plan.**

- Decision set: `3dprintassistant/docs/superpowers/specs/2026-07-12-my3dpa-merged-decision-set.md` (SYN-00–SYN-17; owner pre-locked: sync = Pro, Firebase Auth, ~15–20 gates, full scope with V0–V5 milestones).
- Plan: `3dprintassistant/docs/superpowers/plans/2026-07-12-my3dpa-merged-plan.md` (MG0–MG19).
- Review ledger: `3dprintassistant/docs/reviews/2026-07-12-my3dpa-merged-plan-review.md` (3 internal rounds, converged, all patched).
- Comparison audit: `3dprintassistant/docs/reviews/2026-07-12-account-candidates-comparison-audit.md`.
- When the owner opens it: run the **SYN-17 Codex cross-model round** on decision set + plan via the local bridge (patch until zero P0–P2, append rounds to the ledger), collect **MG0 ratification** (SYN decisions + registrations with lead time: Firebase projects incl. multiple-accounts-per-email, Apple Services ID/.p8 + SiwA capability, ASC Paid Applications + Pro IAP product + ASSN URLs, Workers-plan record). Only then does MG1 start. Both 2026-07-11/12 source candidates stay parked as evidence — do not implement from them.

Standing rules:

- Progress bar on multi-step work.
- ROADMAP is truth; read it fully before status claims.
- Web is master for engine/data; mirror byte-identically when touched.
- One finding = one commit.
- Data/logic changes require web+iOS/Android/macOS UI/UX evaluation.
- iOS push gate remains active; no push before the complete TestFlight-ready train and owner GO.
- No account implementation or production provisioning before MG0 ratification + SYN-17 zero P0–P2.

>>> END <<<

Maintenance note: this file is regenerated on Trigger A / Trigger B / explicit owner ask only.
