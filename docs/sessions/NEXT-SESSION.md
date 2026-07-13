# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for a fresh session on the mac-mini.

**Last updated:** 2026-07-13 (late) after the Air audit/fix session. The owner
has EXPLICITLY reopened the printer-intake lane and authorized an e2e rerun of
the Centauri Carbon 2 request. All fixes are merged and pushed on web `main`
(boundary contract block `f989af6`, POSTRUN park preservation `4d034ad`,
kickoff v2.2 `1c744ba`) and the runner contract is v2.2 (parent repo). After
the intake terminal report, the product lane returns to iOS 1.0.7.

Copy everything between the markers into the fresh session on the mac-mini.

>>> START >>>

3dpa cold start on the mac-mini. OWNER-AUTHORIZED task: e2e rerun of the
Centauri Carbon 2 printer-intake request through the fixed v2.2 pipeline, and
confirm the outcome. The owner command of 2026-07-13 ("complete audit … fix …
rerun the request and confirm") satisfies the parked sidecar's
`nextEligibleTrigger: "owner"` — this session may spend review turns for this
one candidate. Do not start the iOS 1.0.7 or 1.0.8 trains in this session.

Read in order:

1. `~/dev/Claude/Projects/CLAUDE.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md` (top banner — intake reopened)
5. `3dprintassistant/docs/sessions/INDEX.md`
6. These session logs in full:
   - `3dprintassistant/docs/sessions/2026-07-13-cowork-appdev-centauri-intake-audit-fix.md`
   - `3dprintassistant/docs/sessions/2026-07-13-cowork-appdev-centauri-intake-terminal.md`
   - `3dprintassistant/docs/sessions/2026-07-13-cowork-appdev-r1-boundary-rootcause.md`
7. `ai-operating-model/docs/agents/intake-pipeline-runner.md` (contract v2.2 IN FULL)
8. `3dprintassistant/scripts/intake-run-kickoff.md` (v2.2)
9. This `NEXT-SESSION.md`

Before any mutation:

```bash
cd ~/dev/Claude/Projects
~/.claude/claude-sync.sh health
git -C 3dprintassistant fetch origin --prune
git -C 3dprintassistant status --short --branch
git -C 3dprintassistant pull --ff-only
git -C 3dprintassistant log --oneline -6   # must include f989af6 4d034ad 1c744ba
git -C 3dprintassistant branch --list 'intake/*'   # intake/centauri_carbon_2 @ 1694af2
zsh 3dprintassistant/scripts/intake-r1-structured-review.test.sh   # 73/73
bash 3dprintassistant/scripts/intake-post-run-invariants.test.sh
bash 3dprintassistant/scripts/intake-run-wrapper.test.sh
```

Expected state to verify, not assume:

- Web clean `main` == `origin/main`, containing the three fix commits.
- `intake/centauri_carbon_2` at `1694af2`; archive ref + checkpoint tags
  intact; parked sidecar `scripts/.intake-runner-state/parked/centauri_carbon_2/`
  present with the R1 evidence; packet
  `scripts/.printer-intake-out/candidate-elegoo-centauri_carbon_2.json` present.
- No `scripts/.intake-autonomy-freeze`, no stale `scripts/.intake-run.lock`.
- iOS clean `main`, ahead under the push gate (do not touch).

E2E procedure (this is the confirmation run the owner asked for):

1. **First, one diagnostic diff (no turn spent):** compare the preserved
   failed live prompt
   `scripts/.intake-runner-state/bridge-reviews/pd5-centauri_carbon_2-r1-20260713T190845Z*`
   against what v2.2 now produces — confirm the old prompt carried the
   "structured result before prose" instruction and that the new path
   forbids it + appends the boundary's STRUCTURED OUTPUT CONTRACT block.
2. Update the parked sidecar per the owner authorization (owner-triggered
   re-entry; keep taint/verdictRefs history intact) so the candidate is due
   this run.
3. Run the pipeline via the wrapper (manual invocation, not launchd wait):
   `zsh scripts/intake-run-wrapper.sh` from the web repo root. The v2.2
   kickoff routes R1 through the boundary (which now appends the contract
   block), then R2 via `bridge --mode codex-only` (run `bridge --health`
   first per the kickoff).
4. Outcomes are all acceptable — report faithfully, never force a ship:
   - `{GO,GO}` → merge, push, live verify (PD6), iOS mirror LOCAL commit
     only (never push iOS), custody commit, notify. Confirm live overlay
     contains `centauri_carbon_2` and picker verification passes.
   - `{NO-GO,*}` / split / review-unavailable → park per taxonomy, PRESERVE
     branch+packet (v2.2: parking is not cleanup), fresh report + notify,
     POSTRUN must be ok=true. A second consecutive stochastic
     structured-output miss would now come with the exact effective prompt
     preserved — capture it in the ai-om K4 finding as a true recurrence.
5. Verify POSTRUN prints `ok=true` and the wrapper exits 0; confirm the
   Discord notification and report accurately describe the outcome.
6. Ledger + provenance custody per contract; then wrap up (Trigger A),
   updating ROADMAP's top banner with the terminal outcome.

Standing rules:

- Show the progress tracker on multi-step work.
- ROADMAP is truth; read it fully before status claims.
- One finding = one commit. Park, don't fabricate.
- iOS push gate stays active; web pushes freely.
- Run `~/.claude/claude-sync.sh hold "intake e2e"` before touching
  review-gated contract files; `release` after the deliberate commit.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
