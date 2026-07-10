#!/bin/zsh
# Gate B0 — launchd environment probe (Intake Autonomy v2).
#
# Proves the four credential/tooling classes the daily intake runner needs all
# work when the process is STARTED BY LAUNCHD (not a login shell):
#   1. claude -p headless auth (env-token path via ~/.config/claude-code/oauth.env)
#   2. wrangler whoami         (Cloudflare OAuth under launchd)
#   3. bridge --health         (presence-not-validity: a healthy exit proves the
#                               credential SOURCE + tooling, not token validity)
#   4. worktree-neutral git push probe (push credentials; touches no real branch)
#
# Run via: launchctl bootstrap gui/$UID ~/Library/LaunchAgents/dk.mragile.3dpa-intake-probe.plist
#          launchctl kickstart -k gui/$UID/dk.mragile.3dpa-intake-probe
# NEVER from a terminal — a terminal run proves nothing about the launchd env.
#
# Each probe is independently guarded: a FAIL records and CONTINUES (no bare
# set -e), so one broken credential class never hides the state of the others.

# launchd's default PATH is /usr/bin:/bin:/usr/sbin:/sbin — none of our tools
# live there. The real runner wrapper (B4.5 intake-run-wrapper.sh) MUST pin the
# same PATH and source the same oauth.env, or probe and runner envs drift.
export PATH="/Users/mustafaozturk-macmini/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

REPO="/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant"
OUT_DIR="$REPO/scripts/.printer-intake-out"
LOG="$OUT_DIR/launchd-probe.log"
OAUTH_ENV="$HOME/.config/claude-code/oauth.env"

# Creates the dir for $LOG below. NOTE: this cannot rescue the plist's
# StandardOutPath/StandardErrorPath — launchd opens those before the script
# runs, which is why the plist logs to ~/Library/Logs (always present) instead.
mkdir -p "$OUT_DIR"

if ! cd "$REPO"; then
  echo "FAIL setup cd-to-repo-failed ($REPO)" >> "$LOG"
  exit 78  # EX_CONFIG — setup failure, distinct from probe failures
fi

echo "=== probe run $(date -u '+%Y-%m-%dT%H:%M:%SZ') pid=$$ ppid=$PPID user=$(id -un)" >> "$LOG"

fail_count=0

# Flatten newlines and truncate, keeping the FAIL detail on one log line.
snip() { local s="${1//$'\n'/ }"; print -r -- "${s[1,300]}" }

# --- Probe 1: claude -p headless auth -------------------------------------
# No tool use, no repo access — the cheapest possible proof that a headless
# Claude session can authenticate from a launchd context.
# Credential source: oauth.env (the `claude setup-token` artifact bridge also
# reads). The macOS keychain entry proved 401-stale in the 2026-07-10 B0 run
# (post-2026-06-17 token rotation), in terminal AND launchd — so the env-token
# path is the runner's canonical auth, not a workaround. Sourced in a SUBSHELL
# so the token never enters probes 2-4's environments.
if [[ ! -f "$OAUTH_ENV" ]]; then
  echo "FAIL claude-headless oauth.env-missing ($OAUTH_ENV)" >> "$LOG"
  (( fail_count++ ))
else
  p1_out=$( (set -a; source "$OAUTH_ENV"; set +a; claude -p 'Reply with exactly: PROBE_OK' --output-format text) 2>&1 )
  p1_rc=$?
  if [[ $p1_rc -eq 0 && "$p1_out" == *PROBE_OK* ]]; then
    echo "PASS claude-headless (rc=0, output contained PROBE_OK)" >> "$LOG"
  else
    echo "FAIL claude-headless rc=$p1_rc output=$(snip "$p1_out")" >> "$LOG"
    (( fail_count++ ))
  fi
fi

# --- Probe 2: wrangler whoami ----------------------------------------------
# `wrangler whoami` exits 0 even unauthenticated — the 32-hex account-id grep
# is the real assertion.
p2_out=$(npx wrangler whoami 2>&1)
p2_rc=$?
if [[ $p2_rc -eq 0 ]] && echo "$p2_out" | grep -qE '[0-9a-f]{32}'; then
  echo "PASS wrangler-whoami (rc=0, account id present)" >> "$LOG"
else
  echo "FAIL wrangler-whoami rc=$p2_rc output=$(snip "$p2_out")" >> "$LOG"
  (( fail_count++ ))
fi

# --- Probe 3: bridge --health ----------------------------------------------
# Presence-not-validity caveat (memory feedback_preflight_proves_source_not_validity):
# a healthy exit proves the tooling + credential SOURCE resolve under launchd;
# an expired token still 401s at a real turn — PD5's park-on-failure covers that.
p3_out=$(bridge --health 2>&1)
p3_rc=$?
if [[ $p3_rc -eq 0 ]]; then
  echo "PASS bridge-health (rc=0)" >> "$LOG"
else
  echo "FAIL bridge-health rc=$p3_rc output=$(snip "$p3_out")" >> "$LOG"
  (( fail_count++ ))
fi

# --- Probe 4: worktree-neutral push probe -----------------------------------
# git commit-tree writes an unreferenced commit object; pushing it to a scratch
# ref and deleting the ref proves push credentials without detaching HEAD,
# touching the index, or mutating any real branch. The forced refspec (+) keeps
# the probe idempotent if a prior run's delete-push failed and left the ref.
p4_ok=1
sha=$(git commit-tree 'HEAD^{tree}' -p HEAD -m 'launchd push probe' 2>>"$LOG")
if [[ -z "$sha" ]]; then
  echo "FAIL git-push-probe commit-tree-produced-no-sha" >> "$LOG"
  p4_ok=0
else
  # ${sha} braced: bare $sha:refs would trigger zsh's :r history modifier
  # (bit the first B0 run — the refspec arrived mangled).
  if ! git push origin "+${sha}:refs/heads/intake-probe-scratch" >> "$LOG" 2>&1; then
    echo "FAIL git-push-probe push-failed" >> "$LOG"
    p4_ok=0
  elif ! git push origin :intake-probe-scratch >> "$LOG" 2>&1; then
    echo "FAIL git-push-probe delete-push-failed (scratch branch intake-probe-scratch LEFT ON ORIGIN — next run force-overwrites it; delete manually if retiring the probe)" >> "$LOG"
    p4_ok=0
  fi
fi
if [[ $p4_ok -eq 1 ]]; then
  echo "PASS git-push-probe (scratch ref pushed + deleted)" >> "$LOG"
else
  (( fail_count++ ))
fi

echo "=== probe done: $((4 - fail_count))/4 PASS" >> "$LOG"
exit $fail_count
