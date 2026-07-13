# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for a fresh Claude session on the mac-mini.
**Last updated:** 2026-07-13. `centauri_carbon_2` is parked and not shipped;
recovery implementation is merged, but the latest Reviewer 1 response was not
contract-valid.

The next session must diagnose the exact long-prompt structured-output failure
before spending another candidate review turn. This is a checkpoint
continuation, not a new Scout/full-pipeline run.

---

Copy everything between the markers into Claude.

>>> START >>>

3dpa cold start on the mac-mini. Take over the parked
`centauri_carbon_2` intake incident from the preserved checkpoint.

Read in order:

1. `~/dev/Claude/Projects/CLAUDE.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md`
5. `3dprintassistant/docs/sessions/INDEX.md`
6. The last three relevant logs in full:
   - `3dprintassistant/docs/sessions/2026-07-13-cowork-appdev-centauri-pd5-handover.md`
   - `3dprintassistant/docs/sessions/2026-07-12-remote-intake-runner-postrun-gate.md`
   - `3dprintassistant/docs/sessions/2026-07-12-cowork-appdev-intake-preflight-recovery.md`
7. This `NEXT-SESSION.md`.
8. `ai-operating-model/docs/agents/intake-pipeline-runner.md`
9. `ai-operating-model/docs/findings/2026-07-13-claude-json-schema-smoke-did-not-predict-pd5-output.md`
10. `ai-operating-model/docs/findings/2026-07-13-pd5-reviewers-split-on-centauri-evidence.md`

Then verify current state before mutation:

```bash
cd ~/dev/Claude/Projects
~/.claude/claude-sync.sh verify-parents
~/.claude/claude-sync.sh push-children --dry
git -C 3dprintassistant fetch --all --prune
git -C 3dprintassistant status --short --branch
git -C 3dprintassistant rev-parse HEAD origin/main
git -C 3dprintassistant-ios status --short --branch
```

Expected starting state:

- Web clean `main` at `c535324`, equal to `origin/main`.
- Preserved branch `intake/centauri_carbon_2` at `f39d7f9`.
- Remote checkpoint tags peel to `be49fea` and `8695583`.
- iOS clean but ahead 6 under the push gate; do not touch or push it.
- Android may remain missing/health-only.
- LaunchAgent loaded and idle; intake lock/freeze absent; last wrapper log has
  `POSTRUN ok=true`.
- Candidate has not merged or shipped.

Primary task: root-cause and fix the **Reviewer 1 structured-output boundary**,
then resume exactly once from the preserved evidence/PD5 checkpoint only if the
mechanism is deterministically proven.

Preserved evidence — do not delete or overwrite before copying if needed:

- Raw R1 result:
  `3dprintassistant/scripts/.intake-runner-state/bridge-reviews/pd5-centauri_carbon_2-r1-owner-retry2-20260713.txt`
  (SHA-256 `12ab84d74964fd4ddd5e8db8dc9b0420baead6ec9ed0e5b424729a0fb7aed3ca`).
- Metadata:
  `3dprintassistant/scripts/.intake-runner-state/bridge-reviews/pd5-centauri_carbon_2-r1-owner-retry2-metadata.json`
  (`structuredOutputPresent=false`, `contractValid=false`, session id
  `58ad771b-fea3-4444-9a3e-cfbe5453e308`).
- Exact prompt:
  `3dprintassistant/scripts/.intake-runner-state/bridge-reviews/pd5-centauri_carbon_2-r1-owner-retry2-prompt.md`.
- Exact schema:
  `3dprintassistant/scripts/.intake-runner-state/bridge-reviews/claude-opus-r1-schema.json`.
- Parked state: `scripts/.intake-runner-state/parked/centauri_carbon_2/parked.json`.
- Terminal report/session log: `scripts/.intake-runner-state/last-run-report.md`
  and `last-run-session.log`.
- Machine-local Opus wrapper/test: `~/.local/bin/claude-opus-4-8` and
  `~/.local/bin/claude-opus-4-8.test.sh`.

Process and stop rules:

1. **Do not start PD5 yet.** Reproduce the exact long prompt + schema + model
   wrapper + result-envelope parse outside a candidate review turn. The earlier
   short schema smoke is explicitly insufficient.
2. Explain why the real request exited 0 but omitted `structured_output` and
   returned prose plus incompatible `reviewer`/`decision` fields. Do not infer a
   verdict from that output.
3. Fix the narrowest correct layer and add a deterministic regression test at
   the exact failing boundary. Use normal branch/PR/merge discipline. Do not
   upgrade the Claude or Codex CLI, change the global Codex model, or weaken the
   v2.1 reviewer contract without owner attention.
4. Re-run the relevant wrapper/contract tests and an exact-scale non-candidate
   proof. A short `hello`/schema smoke is not the acceptance test.
5. Once the mechanism is proven, this pasted prompt authorizes **one** fresh
   continuation from evidence/PD5 on the preserved candidate. No Scout, no full
   LaunchAgent rerun, no new research lane, and no same-run review retry.
6. Follow the runner contract exactly. Reviewer 2 may be spent only after a
   fresh contract-valid Reviewer 1 `GO`. Any invalid output, `NO-GO`, review
   split, auth failure, or post-run-gate failure parks and stops.
7. Never ship around PD5. Never touch `engine.js`, `app.js`, validators, or iOS
   unless a fresh `{GO,GO}` reaches the contract's merge/live/mirror stage.
8. Verify the terminal result semantically: structured reviewer outputs,
   merge-or-park correctness, fresh report, Discord receipt (the current
   `posted=true` is not owner-visible proof; the supplied screenshot showed an
   older report), lock removed, clean `main`, remote `main` ground truth, and
   `POSTRUN ok=true`.
9. If a new post-run gate fails, copy `last-run-session.log` before any further
   run can overwrite it.

After the intake terminal report, stop and report. The next product sequence is
the reviewed iOS 1.0.7 issue-fix train, then the separate 1.0.8 tip-jar train.
My 3DPA remains parked behind both and opens only on explicit owner command.

Standing rules:

- Show the progress bar on multi-step work.
- ROADMAP is truth; read it fully before status claims.
- Web is master for engine/data; iOS mirrors only after a legitimate ship path.
- One finding = one commit.
- iOS push gate remains active.
- Preserve the candidate branch, checkpoint tags, ignored state, and raw review
  evidence until the incident is closed.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
