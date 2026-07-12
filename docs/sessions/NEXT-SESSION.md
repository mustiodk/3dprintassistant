# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-12 (remote session merged the intake-runner post-run fail-closed gate; `centauri_carbon_2` still parked, nothing shipped).

The immediate entry point is operational: sync the mac-mini launchd checkout to merged `main`, verify the Codex/Bridge review path, then rerun the parked intake candidate through the autonomous pipeline and verify the result **semantically** — wrapper exit 0 alone was never proof, and the new post-run gate now enforces that deterministically. After this retry reaches a terminal report, return to the 1.0.7 → 1.0.8 release sequence. My 3DPA stays planning-only and parked behind both trains.

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
   - `3dprintassistant/docs/sessions/2026-07-12-remote-intake-runner-postrun-gate.md`
   - `3dprintassistant/docs/sessions/2026-07-12-cowork-appdev-intake-preflight-recovery.md`
   - `3dprintassistant/docs/sessions/2026-07-10-cowork-appdev-intake-autonomy-build.md`
7. This `NEXT-SESSION.md`.
8. The runner contract: `ai-operating-model/docs/agents/intake-pipeline-runner.md`.

Then verify local state:

```bash
cd ~/dev/Claude/Projects
~/.claude/claude-sync.sh verify-parents
~/.claude/claude-sync.sh push-children --dry
git -C 3dprintassistant fetch --all --prune
git -C 3dprintassistant status --short --branch
git -C 3dprintassistant-ios status --short --branch
```

Expected known warnings: `3dprintassistant-ios` may remain ahead locally under the iOS push gate (do not touch or push iOS); Android checkout may remain missing/health-only. The web checkout may sit on the local debugging branch `intake/centauri_carbon_2` with local commit `be49fea` — that branch, commit, the state files, and the untracked `bridge-2026-07-12-222924-350261.md` are preserved incident evidence. Move the checkout back to `main` (`git checkout main && git pull --ff-only`) WITHOUT deleting the intake branch or the untracked transcript.

Today's primary task: **rerun the parked `centauri_carbon_2` candidate through the patched launchd path and verify the run semantically to a terminal state.**

Verified starting state after the 2026-07-12 remote fix session:

- The 22:20 rerun failed silently: the runner session exited 0 after candidate commit `be49fea` with no PD5 review, no merge/park, no new report, no notify, no cleanup; a full-mode Bridge review was burned on the non-existent `bridge config`. Remote `main` stayed `92c49a2`; nothing shipped.
- The deterministic fix is MERGED to `main`: `scripts/intake-post-run-invariants.sh` + wrapper gating (violation → `--shipped-unknown` failure notify + exit 65) + kickoff pinned to the only allowed bridge forms. Tests: `intake-post-run-invariants.test.sh`, `intake-run-wrapper.test.sh`, preflight suite, all 22 JS suites — green.
- Bridge itself was already patched and pushed earlier (`5f3a459` + `c72f877`: all Codex review turns and fallback hints pinned to `gpt-5.5`; 69 Bridge tests green; real smoke exit 0). The intake contract's direct fallback is `codex exec -s read-only -m gpt-5.5`. No global Codex model change or CLI upgrade is needed.
- Candidate is parked as `review-unavailable`, retry class `availability-blocked`, retries 0/5; reviewer 1 GO recorded, Codex verdict null; custody `1e3aec5` on `origin/main`.

Process:

1. Sync the launchd checkout: `git checkout main && git pull --ff-only` (preflight fail-closes `web-out-of-sync` until this is done). Preserve the local `intake/centauri_carbon_2` branch and the untracked bridge transcript as evidence.
2. Verify the runner contract's PD5 reviewer-2 section matches the pinned form: `bridge --mode codex-only "<concrete review of main...intake/<id> diff>"`, fallback `codex exec -s read-only -m gpt-5.5`.
3. Prove the review path: `bridge --health`, then a bounded real `bridge --mode codex-only` smoke.
4. Run the shell suites once on the mac (they were only executed on Linux): `bash scripts/intake-post-run-invariants.test.sh && bash scripts/intake-run-wrapper.test.sh && bash scripts/intake-run-preflight.test.sh`.
5. Confirm preflight green, then kickstart exactly ONE run: `launchctl kickstart -k gui/$(id -u)/dk.mragile.3dpa-intake`.
6. Monitor to a TERMINAL state, not just "running". Do not stop at wrapper exit 0 — verify semantically: valid structured reviewer 1 + reviewer 2 output (`validate-reviewer-output.js`); correct merge or fail-closed park; fresh `last-run-report.md`; Discord notification received; lock removed; checkout back on clean `main`; live overlay/picker verification if it ships; remote `main` as ground truth. The new POSTRUN machine line in the wrapper log should read `ok=true`.
7. If the candidate reaches `{GO,GO}`, verify merge/push/live overlay/picker/iOS-local-mirror/custody evidence per the runner contract. If it parks again, preserve the exact reason and stop. Never ship `centauri_carbon_2` around PD5. Never touch engine.js/app.js/validators.
8. If the run fails the new post-run gate, capture `scripts/.intake-runner-state/last-run-session.log` BEFORE any new run overwrites it — the empty-log root cause from 22:20 is still unproven.

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
