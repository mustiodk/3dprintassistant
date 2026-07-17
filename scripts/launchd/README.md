# 3dpa intake launchd agents

Two LaunchAgents (Intake Autonomy v2):

| Plist | Label | What |
|---|---|---|
| `dk.mragile.3dpa-intake-probe.plist` | `dk.mragile.3dpa-intake-probe` | Gate B0 environment probe (kickstart-only, no calendar). Re-run when auth plumbing changes. |
| `dk.mragile.3dpa-intake.plist` | `dk.mragile.3dpa-intake` | The daily pipeline — `StartCalendarInterval` **12:00 local** (owner-set 2026-07-10) → installed sync bootstrap → isolated checkout wrapper. |

## Isolated runner install

The tracked plist is a tokenized template. Do not copy it directly to
`~/Library/LaunchAgents`; `install-intake-runner.sh` renders the machine paths.
From a clean/current web `main`:

```bash
scripts/install-intake-runner.sh \
  --source-repo "$PWD" \
  --install-root /Users/mustafaozturk-macmini/.local/share/3dpa-intake \
  --ios-repo /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant-ios \
  --expected-origin "$(git remote get-url origin)" \
  --migrate-state-from "$PWD"

scripts/install-intake-runner.sh \
  --source-repo "$PWD" \
  --install-root /Users/mustafaozturk-macmini/.local/share/3dpa-intake \
  --ios-repo /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant-ios \
  --expected-origin "$(git remote get-url origin)" \
  --verify-only
```

The migration is explicit and conflict-safe: only the three declared ignored
state roots are copied, unequal destination bytes stop as `state-conflict`, and
`state-migration.sha256` must match before cutover.

## Cut over only after verify is green

Preserve the currently installed plist before replacement:

```bash
cp /Users/mustafaozturk-macmini/Library/LaunchAgents/dk.mragile.3dpa-intake.plist \
  /Users/mustafaozturk-macmini/.local/share/3dpa-intake/launchd/dk.mragile.3dpa-intake.previous.plist
launchctl bootout gui/$(id -u)/dk.mragile.3dpa-intake
cp /Users/mustafaozturk-macmini/.local/share/3dpa-intake/launchd/dk.mragile.3dpa-intake.plist \
  /Users/mustafaozturk-macmini/Library/LaunchAgents/dk.mragile.3dpa-intake.plist
launchctl bootstrap gui/$(id -u) \
  /Users/mustafaozturk-macmini/Library/LaunchAgents/dk.mragile.3dpa-intake.plist
launchctl print gui/$(id -u)/dk.mragile.3dpa-intake | head -20
```

Manual supervised trigger:

```bash
launchctl kickstart -k gui/$(id -u)/dk.mragile.3dpa-intake
```

Read `~/Library/Logs/3dpa-intake.{out,err}.log` and require terminal
`SYNCBOOT`, `PREFLIGHT`, and `POSTRUN` evidence before candidate decisions are
applied.

## Roll back the scheduler

```bash
launchctl bootout gui/$(id -u)/dk.mragile.3dpa-intake
cp /Users/mustafaozturk-macmini/.local/share/3dpa-intake/launchd/dk.mragile.3dpa-intake.previous.plist \
  /Users/mustafaozturk-macmini/Library/LaunchAgents/dk.mragile.3dpa-intake.plist
launchctl bootstrap gui/$(id -u) \
  /Users/mustafaozturk-macmini/Library/LaunchAgents/dk.mragile.3dpa-intake.plist
```

Rollback changes only the LaunchAgent path. It does not reset either checkout,
delete installed state, rerun a candidate, or touch iOS. The freeze flag in the
active automation checkout still stops runs without unloading the schedule.

## Missed-run semantics (know this before relying on the daily heartbeat)

`StartCalendarInterval` fires ONCE on wake if 12:00 passed while the mac was
**asleep** — but is **skipped entirely** if the mac was powered OFF over 12:00.
Since the "0 candidates" run report is the daily alive-heartbeat, a powered-off
day produces NO report; a missing daily report therefore means either
powered-off/never-fired OR a wedged run — check
`~/Library/Logs/3dpa-intake.{out,err}.log` and the automation checkout's
`scripts/.intake-runner-state/last-skip.log` before assuming failure.

Wrapper/probe logs: stdout/stderr land in `~/Library/Logs/3dpa-intake*.log`
(launchd opens these before the script runs — they must never point into a dir
the script itself creates); run state lands under the persistent automation
checkout, not the owner's development checkout.
