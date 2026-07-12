#!/bin/zsh
# intake-run-wrapper.sh — launchd plist entrypoint (Intake Autonomy v2, Gate B3).
#
# Sequence: env pin → preflight → lock ACQUIRE → claude -p (headless runner
# session) → post-run invariants (intake-post-run-invariants.sh — claude exit 0
# alone is NOT success; 2026-07-12 incident) → trap-release + failure notify
# (Codex SF-1: lock custody lives HERE, not inside the Claude session — the
# lock releases on EVERY exit, including claude failing to launch at all; the
# runner contract additionally releases on its own graceful paths).
#
# ENV PARITY (B0 review observation): PATH pin + oauth.env sourcing below MUST
# match scripts/intake-launchd-probe.sh — the probe proved THIS environment.

export PATH="/Users/mustafaozturk-macmini/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

REPO="/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant"
OAUTH_ENV="$HOME/.config/claude-code/oauth.env"

# Test seams (production launchd passes no arguments — defaults above hold):
# --repo <path> · --oauth-env <path> · --path-prepend <dir> (stub claude/node).
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)         REPO="$2"; shift 2 ;;
    --oauth-env)    OAUTH_ENV="$2"; shift 2 ;;
    --path-prepend) export PATH="$2:$PATH"; shift 2 ;;
    *) echo "WRAPPER unknown argument $1"; exit 64 ;;
  esac
done

LOCK="$REPO/scripts/.intake-run.lock"
KICKOFF="$REPO/scripts/intake-run-kickoff.md"
STATE_DIR="$REPO/scripts/.intake-runner-state"

cd "$REPO" || exit 78
mkdir -p "$STATE_DIR" "$REPO/scripts/.printer-intake-out"

notify_failure() {
  # Never let a notification failure mask the run failure itself.
  node "$REPO/scripts/intake-notify.js" --failure "$1" || true
}

# 1 — preflight (checks only; includes freeze/lock/repo/auth predicates)
preflight_out=$("$REPO/scripts/intake-run-preflight.sh" 2>&1)
preflight_rc=$?
echo "$preflight_out"
if [[ $preflight_rc -ne 0 ]]; then
  # A held lock (75) or freeze (78) is an expected skip, not an incident: the
  # freeze CREATION already notified CRITICAL, so daily freeze-skip notifies
  # would be noise. Skips are recorded in last-skip.log (append-only) instead
  # — an intended deviation from "any failure: notify", ledgered at B3.
  if [[ $preflight_rc -eq 75 || $preflight_rc -eq 78 ]]; then
    echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') skip rc=$preflight_rc ${preflight_out##*$'\n'}" >> "$STATE_DIR/last-skip.log"
  else
    notify_failure "preflight: rc=$preflight_rc ${preflight_out##*$'\n'}"
  fi
  exit $preflight_rc
fi

# 2 — headless Claude auth: the keychain credential is 401-stale on this
# machine (gate ledger B0) — oauth.env is the canonical env-token source.
if [[ ! -f "$OAUTH_ENV" ]]; then
  notify_failure "auth: oauth.env missing at $OAUTH_ENV"
  exit 1
fi
set -a; source "$OAUTH_ENV"; set +a

# 3 — lock acquire (atomic via noclobber) + trap release on EVERY exit path.
# Stale takeover: rm then noclobber-create — the loser of a simultaneous
# takeover race exits 75.
if [[ -f "$LOCK" ]]; then
  lock_age=$(( $(date +%s) - $(stat -f %m "$LOCK") ))
  if (( lock_age >= 6 * 3600 )); then
    echo "WRAPPER stale lock (age=${lock_age}s) — taking over"
    rm -f "$LOCK"
  fi
fi
if ! (set -o noclobber; print -r -- "{\"pid\": $$, \"acquiredAt\": \"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\"}" > "$LOCK") 2>/dev/null; then
  echo "WRAPPER lock held (concurrent run) — skipping"
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') skip rc=75 lock-held-at-acquire" >> "$STATE_DIR/last-skip.log"
  exit 75
fi
# Signal traps must EXIT (a zsh signal trap that doesn't exit resumes the
# script — a TERM'd run would strip the lock yet keep running); the EXIT trap
# then performs the release. SIGKILL can't trap: the 6h stale TTL is the backstop.
trap 'rm -f "$LOCK"' EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

# 4 — the runner session. --permission-mode bypassPermissions: this is an
# unattended pipeline on the owner's machine; the safety envelope is the
# runner contract + validators + PD5 dual review + PD6/PD8, not interactive
# permission prompts (which would hang a headless run).
if [[ ! -f "$KICKOFF" ]]; then
  notify_failure "kickoff: $KICKOFF missing"
  exit 1
fi
run_start_epoch=$(date +%s)
claude -p "$(cat "$KICKOFF")" --output-format text --permission-mode bypassPermissions \
  > "$STATE_DIR/last-run-session.log" 2>&1
claude_rc=$?

if [[ $claude_rc -ne 0 ]]; then
  # --shipped-unknown: a crashed runner session MAY have shipped before dying,
  # so the shipped-and-unreported freeze rule must treat shipped as unknown
  # (fail-closed) — a plain failure report claiming shipped:0 would bypass PD8.
  # The 300-char tail can carry requester-derived text; the webhook channel is
  # owner-only by design (accepted at B3, ledgered).
  node "$REPO/scripts/intake-notify.js" --failure "runner-session: claude exited rc=$claude_rc — tail: $(tail -c 300 "$STATE_DIR/last-run-session.log" | tr '\n' ' ')" --shipped-unknown || true
  exit $claude_rc
fi

# 5 — POST-RUN INVARIANTS (2026-07-12 incident): claude exit 0 only proves the
# CLI completed — a session once exited 0 after the candidate commit with no
# PD5 review, report, notify or cleanup, and this wrapper reported success.
# The deterministic gate verifies the contract's observable terminal
# obligations (fresh report ⇒ notify ran; non-empty session log; HEAD on main;
# clean-or-custody tree; custody-only ahead). Failure is fail-closed:
# --shipped-unknown, because an incomplete session MAY have shipped (PD8).
postrun_out=$("$REPO/scripts/intake-post-run-invariants.sh" \
  --repo "$REPO" --state-dir "$STATE_DIR" --run-start-epoch "$run_start_epoch" 2>&1)
postrun_rc=$?
echo "$postrun_out"
if [[ $postrun_rc -ne 0 ]]; then
  node "$REPO/scripts/intake-notify.js" --failure "post-run: runner session exited 0 but terminal invariants failed — ${postrun_out##*$'\n'}" --shipped-unknown || true
  exit 65
fi

exit 0
