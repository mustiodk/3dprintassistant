#!/bin/zsh
# intake-post-run-invariants.sh — deterministic fail-closed POST-run gate
# (Intake Autonomy v2; 2026-07-12 incident follow-up).
#
# WHY: `claude -p` exit 0 only proves the CLI completed — not that the runner
# session executed the contract. On 2026-07-12 a session exited 0 after the
# candidate commit with NO PD5 review, NO report, NO notify and NO cleanup,
# and the wrapper reported success. This script verifies the contract's
# observable terminal obligations so such a run is non-zero and fail-closed.
#
# CHECKS (any failure prints a machine line and exits 65 — EX_DATAERR):
#   1. last-run-session.log exists and is non-empty (the contract's final
#      summary paragraph lands on stdout → the wrapper's log redirect).
#   2. last-run-report.md exists and was (re)written during THIS run
#      (mtime >= --run-start-epoch) — intake-notify.js ALWAYS writes it, so a
#      fresh report is the deterministic proof the notify stage ran.
#   3. HEAD is back on `main` (runbook cleanup; parked intake/* branches may
#      exist, but must not be left checked out).
#   4. Working tree clean, or custody-paths-only dirty (same repairable
#      exception preflight grants — the next run repairs it).
#   5. Ahead-of-origin commits are custody-only (an unpushed merge or stray
#      work fails; custody push-repair is next run's job).
#
# Exit codes: 0 ok · 65 invariant violated · 1 bad-args.
# Machine line: "POSTRUN ok=true|false reason=<slug> detail=<...>"

REPO="/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant"
STATE_DIR=""
RUN_START_EPOCH=""

fail() {
  echo "POSTRUN ok=false reason=$1 detail=${2:-}"
  exit "${3:-65}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      [[ $# -ge 2 && -n "$2" ]] || fail bad-args "--repo requires a path" 1
      REPO="$2"; shift 2 ;;
    --state-dir)
      [[ $# -ge 2 && -n "$2" ]] || fail bad-args "--state-dir requires a path" 1
      STATE_DIR="$2"; shift 2 ;;
    --run-start-epoch)
      [[ $# -ge 2 && "$2" == <-> ]] || fail bad-args "--run-start-epoch requires an epoch integer" 1
      RUN_START_EPOCH="$2"; shift 2 ;;
    *)
      fail bad-args "unknown argument $1" 1 ;;
  esac
done

[[ -n "$RUN_START_EPOCH" ]] || fail bad-args "--run-start-epoch is required" 1
[[ -n "$STATE_DIR" ]] || STATE_DIR="$REPO/scripts/.intake-runner-state"

cd "$REPO" || fail cd-failed "$REPO" 1

# mtime via zsh's builtin zstat — identical on macOS (prod) and Linux (tests),
# unlike the BSD/GNU `stat` binaries whose flags conflict.
zmodload zsh/stat 2>/dev/null || fail zstat-unavailable "zmodload zsh/stat failed" 1
mtime_of() {
  zstat +mtime -- "$1" 2>/dev/null
}

# 1 — session log: the runner's stdout transcript must exist and be non-empty
SESSION_LOG="$STATE_DIR/last-run-session.log"
if [[ ! -f "$SESSION_LOG" ]]; then
  fail session-log-missing "$SESSION_LOG"
fi
if [[ ! -s "$SESSION_LOG" ]]; then
  fail session-log-empty "$SESSION_LOG"
fi

# 2 — run report: freshly written this run ⇒ the notify stage actually ran
REPORT="$STATE_DIR/last-run-report.md"
if [[ ! -f "$REPORT" ]]; then
  fail report-missing "$REPORT"
fi
report_mtime=$(mtime_of "$REPORT")
if [[ -z "$report_mtime" ]] || (( report_mtime < RUN_START_EPOCH )); then
  fail report-stale "mtime=${report_mtime:-?} run-start=$RUN_START_EPOCH"
fi

# 3 — terminal branch: runbook cleanup ends on main
current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [[ "$current_branch" != "main" ]]; then
  fail not-on-main "branch=$current_branch"
fi

# custody predicates — identical vocabulary to intake-run-preflight.sh
is_custody_path() {
  case "$1" in
    scripts/printer-intake-outcomes.jsonl|docs/printer-provenance.json) return 0 ;;
    *) return 1 ;;
  esac
}

all_dirty_paths_are_custody() {
  local line file_path
  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    file_path="${line[4,-1]}"
    is_custody_path "$file_path" || return 1
  done < <(git status --porcelain --untracked-files=all)
  return 0
}

ahead_commits_are_custody_only() {
  local commit subject file_path saw_path
  while IFS= read -r commit; do
    [[ -n "$commit" ]] || continue
    subject="$(git log -1 --format=%s "$commit")"
    case "$subject" in
      chore\(intake\):\ custody*) ;;
      *) return 1 ;;
    esac

    saw_path=false
    while IFS= read -r file_path; do
      [[ -n "$file_path" ]] || continue
      saw_path=true
      is_custody_path "$file_path" || return 1
    done < <(git diff-tree --no-commit-id --name-only -r "$commit")
    [[ "$saw_path" == "true" ]] || return 1
  done < <(git rev-list origin/main..HEAD)
  return 0
}

# 4 — working tree: clean, or custody-only (repairable next run, as preflight)
if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  if all_dirty_paths_are_custody; then
    echo "POSTRUN-WARN custody-dirty — next run's preflight repair pass covers it"
  else
    fail web-dirty "$(git status --porcelain --untracked-files=all | head -3 | tr '\n' ' ')"
  fi
fi

# 5 — ahead commits: custody-only allowed; anything else is an unpushed
# merge / stray work → fail-closed. (No fetch here — the run's own fetches
# already updated origin/main; a post-run network call must not flake the gate.)
ahead=$(git rev-list origin/main..HEAD --count 2>/dev/null)
if [[ -z "$ahead" ]]; then
  fail web-out-of-sync "origin/main unresolved"
fi
if [[ "$ahead" != "0" ]] && ! ahead_commits_are_custody_only; then
  fail web-out-of-sync "ahead=$ahead non-custody"
fi

echo "POSTRUN ok=true reason=none detail="
exit 0
