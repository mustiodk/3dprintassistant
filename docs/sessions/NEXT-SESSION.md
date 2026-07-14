# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for a fresh session on the mac-mini.

**Last updated:** 2026-07-14 after the terminal Centauri v2.3 debug/rerun.
The candidate is parked `review-split → decision-required`; nothing shipped.

Copy everything between the markers into the fresh session.

>>> START >>>

3dpa cold start on the mac-mini. Resolve the owner-decision gate for the
Centauri Carbon 2 review split. Do not start iOS 1.0.7 or 1.0.8, and do not
rerun or edit the candidate until the owner has answered the two CANVAS
questions below.

Read in order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md` (terminal banner + intake row)
5. `3dprintassistant/docs/sessions/INDEX.md`
6. These session logs in full:
   - `3dprintassistant/docs/sessions/2026-07-14-cowork-appdev-centauri-v23-debug-rerun.md`
   - `3dprintassistant/docs/sessions/2026-07-14-cowork-appdev-centauri-v22-e2e-rerun.md`
7. This `NEXT-SESSION.md`
8. `ai-operating-model/docs/agents/intake-pipeline-runner.md` (v2.3)
9. `3dprintassistant/docs/runbooks/printer-addition-protocol.md`

Before any mutation:

```bash
cd ~/dev/Claude/Projects
~/.claude/claude-sync.sh health
~/.claude/claude-sync.sh verify-parents
~/.claude/claude-sync.sh push-children --dry
git -C 3dprintassistant fetch origin --prune
git -C 3dprintassistant status --short --branch
git -C 3dprintassistant rev-parse HEAD origin/main
git -C 3dprintassistant show-ref --verify refs/heads/intake/centauri_carbon_2
git -C 3dprintassistant rev-parse intake/centauri_carbon_2
git -C 3dprintassistant-ios status --short --branch
git -C 3dprintassistant-ios rev-list --left-right --count main...origin/main
```

Expected state to verify, not assume:

- Web clean `main`, equal to `origin/main`, at or beyond custody `a358e47`
  and the wrap commit.
- Candidate branch exactly
  `intake/centauri_carbon_2@c4f5075aa60d767ad79cd61e2ff46960a33409ec`.
- Parked sidecar says `reason=review-split`, `class=decision-required`,
  `nextEligibleTrigger=owner-decision`, and exact packet SHA
  `0ada20324970ed0dba69f7fb7a3e60d563f7508be652570b26708b4ed8bf1ac1`.
- Terminal report says `0 shipped · 1 parked · 0 errored`; R1 GO and R2 NO-GO.
- Live overlay remains `2026071005` without `centauri_carbon_2`.
- iOS remains locally ahead under its push gate; do not push it.

Owner decision required before intake can resume:

1. Model base-printer CANVAS upgrade compatibility as
   `multi_color_systems: ["canvas"]`, or explicitly override with a reason to
   keep `[]`.
2. Replace the inaccurate "Combo variant only" note with wording that CANVAS
   is included with the Combo and sold separately for the base printer, or
   explicitly provide contrary source evidence.

After the owner decision, a later authorized implementation session may update
the preserved branch and evidence packet, create a new branch HEAD, rerun the
mechanical/evidence gates once for that HEAD, and start fresh R1/R2 turns. It
must still obey `{GO,GO}` ship / split park / NO-GO park and never force ship.

Hard stops until owner decision:

- Do not run the LaunchAgent, wrapper, Scout, R1 boundary, Bridge review, or
  candidate validator/retry.
- Do not edit/delete the parked sidecar, candidate branch, packet, archive
  evidence, checkpoint tags, or raw review evidence.
- Do not merge `c4f5075`, bump/republish the overlay, mirror to iOS, or report
  Centauri as live.
- Do not start the iOS 1.0.7 or 1.0.8 trains in this session.

Standing rules:

- Show the progress tracker on multi-step work.
- ROADMAP is truth; read it fully before status claims.
- One finding = one commit.
- Preserve the iOS push gate and clean-state release gate.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
