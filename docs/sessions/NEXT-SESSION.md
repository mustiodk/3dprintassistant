# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for a fresh session on the mac-mini.

**Last updated:** 2026-07-14 after Centauri Carbon 2 shipped through the fixed
v2.3 intake pipeline and a clean post-patch control run passed.

Copy everything between the markers into the fresh session.

>>> START >>>

3dpa cold start on the mac-mini. Verify the closed Centauri Carbon 2 ship and
current twin-repo health, then report the available next lanes to the owner.
Do not rerun Centauri intake, and do not automatically start or push the iOS
1.0.7 or 1.0.8 trains during the cold-start audit.

Read in order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md` in full
5. `3dprintassistant/docs/sessions/INDEX.md`
6. These session logs in full:
   - `3dprintassistant/docs/sessions/2026-07-14-cowork-appdev-centauri-owner-decision-ship.md`
   - `3dprintassistant/docs/sessions/2026-07-14-cowork-appdev-centauri-v23-debug-rerun.md`
7. This `NEXT-SESSION.md`

Before any mutation:

```bash
cd ~/dev/Claude/Projects
~/.claude/claude-sync.sh health
~/.claude/claude-sync.sh verify-parents
~/.claude/claude-sync.sh push-children --dry
git -C 3dprintassistant fetch origin --prune
git -C 3dprintassistant status --short --branch
git -C 3dprintassistant rev-parse HEAD origin/main
git -C 3dprintassistant branch --list intake/centauri_carbon_2
test ! -e 3dprintassistant/scripts/.intake-runner-state/parked/centauri_carbon_2/parked.json
test ! -e 3dprintassistant/scripts/.printer-intake-out/candidate-elegoo-centauri_carbon_2.json
git -C 3dprintassistant-ios status --short --branch
git -C 3dprintassistant-ios rev-list --left-right --count main...origin/main
```

Expected state to verify, not assume:

- Web is clean on `main`, equal to `origin/main`, and contains the Centauri
  merge `954cfa3`, custody `88816bd`, notifier fix `2ae4ddc`, and the later
  session-wrap commit.
- No `intake/centauri_carbon_2` branch, parked sidecar, or candidate packet
  remains after the successful ship.
- The ship run was fresh PD5 `GO/GO`, wrapper `POSTRUN ok=true`, and live
  overlay/picker green. The later clean control run was
  `0 shipped · 0 parked · 0 errored` and also `POSTRUN ok=true`.
- Production overlay is `content_version=2026071401`, payload SHA
  `05d490d885865bc19b8b94e4afd57e513a71706b60dd91e66827e9b0da2e2b53`,
  and contains `centauri_carbon_2` with `multi_color_systems:["canvas"]` plus
  the corrected base-versus-Combo CANVAS note.
- iOS is clean and locally ahead by seven commits; newest is the local-only
  Centauri mirror `f9a810c`. Do not push it outside a TestFlight-ready train.
- No intake lock or autonomy freeze exists.

Current product sequence remains iOS 1.0.7 followed by the separate iOS 1.0.8
tip-jar train, but the cold start must stop at owner lane selection unless the
owner explicitly authorizes implementation. Android AG0 and the four rejected
web analytics selection events remain separate owner-decision lanes in ROADMAP.

Standing rules:

- Show the progress tracker on multi-step work.
- ROADMAP is truth; read it fully before status claims.
- One finding = one commit.
- Preserve the iOS push gate and clean-state release gate.
- A future printer intake still ships only on a semantic fresh `{GO,GO}` plus
  live verification and custody; never infer success from prose or exit `0`.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
