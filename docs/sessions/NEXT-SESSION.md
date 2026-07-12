# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-12 (intake preflight recovered; Elegoo Centauri Carbon 2 parked fail-closed on Codex reviewer unavailability).

The immediate entry point is operational: restore the Codex review path and rerun the parked intake candidate through the autonomous pipeline. Nothing from `centauri_carbon_2` is shipped. After this retry reaches a terminal report, return to the 1.0.7 → 1.0.8 release sequence. My 3DPA stays planning-only and parked behind both trains.

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
   - `3dprintassistant/docs/sessions/2026-07-12-cowork-appdev-intake-preflight-recovery.md`
   - `3dprintassistant/docs/sessions/2026-07-12-remote-audit-merge-my3dpa.md`
   - `3dprintassistant/docs/sessions/2026-07-10-cowork-appdev-intake-autonomy-build.md`
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

Expected known warnings: `3dprintassistant-ios` may remain ahead locally under the iOS push gate; Android checkout may remain missing/health-only. Do not change either merely to clean health output.

Today's primary task: **repair Codex reviewer availability and rerun the parked `centauri_carbon_2` candidate through the same launchd path.**

Verified starting state from the 2026-07-12 run:

- Scheduled preflight failure was repaired by ff-only sync; full preflight passed.
- Run `2026-07-12T19:42:00Z` → `19:59:13Z` completed `exit 0`.
- Candidate evidence/validators/diff guards passed; hostile reviewer 1 returned GO.
- Reviewer 2 was unavailable: local Codex CLI `v0.139.0` could not use configured `gpt-5.6-sol`; both bridge and direct fallback exited 1.
- Candidate is parked as `review-unavailable`, retry class `availability-blocked`, retries `0/5`; custody commit `1e3aec5` is on `origin/main`. Nothing shipped.

Process:

1. Verify the actual Codex binary/install path and current version before changing it; do not guess the package manager.
2. Restore a real Codex request path for the configured review model, then prove it with `bridge --health` plus a bounded `bridge --mode codex-only` smoke.
3. Confirm web `main` is clean/current and the intake preflight is green.
4. Kickstart the installed job: `launchctl kickstart -k gui/$(id -u)/dk.mragile.3dpa-intake`.
5. Monitor to the final Discord/run report. Do not manually ship the printer around PD5; the parked retry must make the decision.
6. If the candidate reaches `{GO,GO}`, verify merge/push/live overlay/picker/iOS-local-mirror/custody evidence per the runner contract. If it parks again, preserve the exact reason and stop.

After this operational item closes: continue the reviewed iOS 1.0.7 issue-fix train, then the separate 1.0.8 tip-jar train.

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
