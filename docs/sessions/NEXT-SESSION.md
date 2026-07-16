# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for a fresh session on the mac-mini.

**Last updated:** 2026-07-16 after the parked-sidecar path root cause was fixed
and a production intake wrapper rerun completed with green terminal invariants.

Copy everything between the markers into the fresh session.

>>> START >>>

3dpa cold start on the mac-mini. Verify the closed intake path incident and the
latest production rerun, then present the available next lanes to the owner.
Do not automatically rerun either parked candidate and do not start or push the
iOS 1.0.7/1.0.8 trains during the cold-start audit.

Read in order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md` in full
5. `3dprintassistant/docs/sessions/INDEX.md`
6. These session logs in full:
   - `3dprintassistant/docs/sessions/2026-07-16-cowork-appdev-intake-parked-path-root-cause.md`
   - `3dprintassistant/docs/sessions/2026-07-14-cowork-appdev-sv06-ace-synthetic-e2e.md`
   - `3dprintassistant/docs/sessions/2026-07-14-cowork-appdev-centauri-owner-decision-ship.md`
7. This `NEXT-SESSION.md`
8. Task-specific evidence if the owner selects the intake lane:
   - `3dprintassistant/docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md` → I1
   - `ai-operating-model/docs/findings/2026-07-16-headless-runner-guessed-parked-writer-path.md`

Before any mutation:

```bash
cd ~/dev/Claude/Projects
~/.claude/claude-sync.sh health
~/.claude/claude-sync.sh verify-parents
~/.claude/claude-sync.sh push-children --dry
git -C 3dprintassistant fetch origin --prune
git -C 3dprintassistant status --short --branch
git -C 3dprintassistant rev-list --left-right --count main...origin/main
git -C ai-operating-model status --short --branch
git -C ai-operating-model rev-list --left-right --count main...origin/main
test ! -e 3dprintassistant/i7_i
test ! -e 3dprintassistant/scripts/.intake-run.lock
test ! -e 3dprintassistant/scripts/.intake-autonomy-freeze
test -s 3dprintassistant/scripts/.intake-runner-state/parked/i7_i/parked.json
test -s 3dprintassistant/scripts/.intake-runner-state/parked/u1/parked.json
git -C 3dprintassistant-ios status --short --branch
git -C 3dprintassistant-ios rev-list --left-right --count main...origin/main
```

Expected state to verify, not assume:

- Web is clean on `main`, equal to `origin/main`, with path fix `104251c`,
  incident ledger `d1ba56a`, and latest custody `537cd14`.
- AI-OM is clean/current and runner contract v2.4 commit `8151868` is present.
- Production rerun `run-20260716T201219Z` reported
  `0 shipped · 1 parked · 0 errored`, notification `posted=true`, and wrapper
  `PREFLIGHT ok=true` / `POSTRUN ok=true`. This is same-session runtime
  evidence, not an inference from commits.
- `i7_i` remains `decision-required / unverified-model / owner`; it was
  rediscovered and filtered from automatic processing. The repo-root stray file
  is absent. Do not infer what model it meant.
- Snapmaker U1 remains `decision-required / new-series-group / owner`; its
  researched packet is preserved and no branch/catalog/overlay/iOS change was
  made. A series group needs an explicit owner decision before re-entry.
- No intake lock or autonomy freeze exists.
- iOS is clean and eight commits ahead locally under the push gate; it was not
  changed or pushed in the incident/rerun session.

Ask the owner to select one lane after the audit:

1. Decide the Snapmaker U1 series group and explicitly authorize re-entry.
2. Clarify the intended `i7_i` printer, or leave it parked.
3. Return to the reviewed iOS 1.0.7 issue-fix release plan; iOS 1.0.8 tip jar
   remains a separate later train.
4. Choose another ROADMAP item.

Standing rules:

- Show the progress tracker on multi-step work.
- ROADMAP is truth; read it fully before status claims.
- One finding = one commit.
- Preserve the iOS push gate and clean-state release gate.
- A parked candidate re-enters only on its sanctioned owner trigger; never
  rewrite sidecars or infer a ship from prose, exit `0`, or adjacent success.
- Future printer intake ships only on semantic fresh `{GO,GO}`, live
  verification, custody, notification, and green POSTRUN.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
