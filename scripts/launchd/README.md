# 3dpa intake launchd agents

Two LaunchAgents (Intake Autonomy v2):

| Plist | Label | What |
|---|---|---|
| `dk.mragile.3dpa-intake-probe.plist` | `dk.mragile.3dpa-intake-probe` | Gate B0 environment probe (kickstart-only, no calendar). Re-run when auth plumbing changes. |
| `dk.mragile.3dpa-intake.plist` | `dk.mragile.3dpa-intake` | The daily pipeline — `StartCalendarInterval` **12:00 local** (owner-set 2026-07-10) → `scripts/intake-run-wrapper.sh`. |

## Install (go-live is Gate B5.4 — do NOT load before the B5.3 exit checklist is green)

```bash
mkdir -p ~/dev/Claude/Projects/3dprintassistant/scripts/.printer-intake-out   # launchd won't create log parents
cp scripts/launchd/dk.mragile.3dpa-intake.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/dk.mragile.3dpa-intake.plist
launchctl print gui/$(id -u)/dk.mragile.3dpa-intake | head -5   # verify loaded
```

Manual trigger (testing): `launchctl kickstart -k gui/$(id -u)/dk.mragile.3dpa-intake`

## Stop / uninstall

```bash
launchctl bootout gui/$(id -u)/dk.mragile.3dpa-intake
rm ~/Library/LaunchAgents/dk.mragile.3dpa-intake.plist
```

(The freeze flag `scripts/.intake-autonomy-freeze` stops RUNS without unloading
the schedule; `bootout` stops the schedule itself.)

## Missed-run semantics (know this before relying on the daily heartbeat)

`StartCalendarInterval` fires ONCE on wake if 12:00 passed while the mac was
**asleep** — but is **skipped entirely** if the mac was powered OFF over 12:00.
Since the "0 candidates" run report is the daily alive-heartbeat, a powered-off
day produces NO report; a missing daily report therefore means either
powered-off/never-fired OR a wedged run — check
`~/Library/Logs/3dpa-intake.{out,err}.log` and
`scripts/.intake-runner-state/last-skip.log` before assuming failure.

Wrapper/probe logs: stdout/stderr land in `~/Library/Logs/3dpa-intake*.log`
(launchd opens these before the script runs — they must never point into a dir
the script itself creates); run state lands in `scripts/.intake-runner-state/`.
