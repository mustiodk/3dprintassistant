# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for a fresh session on the mac-mini.

**Last updated:** 2026-07-14 after the owner-authorized Sovol SV06 ACE
synthetic production E2E auto-shipped through the patched v2.3 intake pipeline.

Copy everything between the markers into the fresh session.

>>> START >>>

3dpa cold start on the mac-mini. Verify the closed Sovol SV06 ACE synthetic E2E
ship and current twin-repo health, then report the available next lanes to the
owner. Do not rerun SV06 ACE intake, and do not automatically start or push the
iOS 1.0.7 or 1.0.8 trains during the cold-start audit.

Read in order:

1. `~/dev/Claude/Projects/AGENTS.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md` in full
5. `3dprintassistant/docs/sessions/INDEX.md`
6. These session logs in full:
   - `3dprintassistant/docs/sessions/2026-07-14-cowork-appdev-sv06-ace-synthetic-e2e.md`
   - `3dprintassistant/docs/sessions/2026-07-14-cowork-appdev-centauri-owner-decision-ship.md`
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
git -C 3dprintassistant branch --list intake/sv06_ace
test ! -e 3dprintassistant/scripts/.intake-runner-state/parked/sv06_ace/parked.json
test ! -e 3dprintassistant/scripts/.printer-intake-out/candidate-sovol-sv06_ace.json
test ! -e 3dprintassistant/scripts/.intake-run.lock
test ! -e 3dprintassistant/scripts/.intake-autonomy-freeze
git -C 3dprintassistant-ios status --short --branch
git -C 3dprintassistant-ios rev-list --left-right --count main...origin/main
diff -q 3dprintassistant/data/printers.json 3dprintassistant-ios/ThreeDPrintAssistant/Resources/data/printers.json
```

Expected state to verify, not assume:

- Web is clean on `main`, equal to `origin/main`, and contains pipeline fixes
  `c2fe6fd` + `16606a7`, ship merge `3bba2c2`, custody `54dc4c8`, and the later
  session-wrap commit.
- No `intake/sv06_ace` branch, parked sidecar, candidate packet, intake lock, or
  autonomy freeze remains after the successful ship.
- Run `run-20260714T110737Z` was fresh PD5 `GO/GO`, evidence green, wrapper
  `POSTRUN ok=true`, and notifier posted. The prior run parked fail-closed; it
  did not ship.
- Production overlay is `content_version=2026071402`, payload SHA
  `2b5627a4a9b0dd6010f3d3c088b059f175559193bacc3e3103148ea17910cb3d`,
  and contains `sv06_ace`; the production picker resolves it under
  `sovol / High Speed`.
- iOS is clean and locally ahead by eight commits; newest is the local-only
  SV06 ACE mirror `80c26dd`. Web/iOS printer catalogs are byte-identical. Do
  not push it outside a TestFlight-ready train.
- KV request `req:1784025588168:43e000dc` remains temporarily because it is
  auto-shipped but still inside the 7-day requester-contact window. Normal KV
  hygiene, not manual deletion, owns its later removal.

Current product sequence remains iOS 1.0.7 followed by the separate iOS 1.0.8
tip-jar train, but the cold start must stop at owner lane selection unless the
owner explicitly authorizes implementation. Android AG0 and the four rejected
web analytics selection events remain separate owner-decision lanes in ROADMAP.

Standing rules:

- Show the progress tracker on multi-step work.
- ROADMAP is truth; read it fully before status claims.
- One finding = one commit.
- Preserve the iOS push gate and clean-state release gate.
- A future printer intake still ships only on semantic fresh `{GO,GO}` plus
  live verification and custody; never infer success from prose or exit `0`.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
