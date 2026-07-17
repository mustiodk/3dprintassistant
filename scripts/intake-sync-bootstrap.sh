#!/bin/zsh
# Synchronize the automation-owned intake checkout, then run the normal
# fail-closed wrapper. This script intentionally never stashes, resets, cleans,
# rebases, or commits repository state.

export PATH="/Users/mustafaozturk-macmini/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

REPO=""
IOS_REPO=""
EXPECTED_ORIGIN=""
LOCK=""
WRAPPER=""
STALE_LOCK_SECONDS=$((6 * 3600))
LOCK_TOKEN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo|--ios-repo|--expected-origin|--lock|--wrapper|--path-prepend)
      [[ $# -ge 2 && -n "$2" ]] || {
        echo "SYNCBOOT ok=false reason=bad-args detail=$1 requires a value"
        exit 64
      }
      case "$1" in
        --repo) REPO="$2" ;;
        --ios-repo) IOS_REPO="$2" ;;
        --expected-origin) EXPECTED_ORIGIN="$2" ;;
        --lock) LOCK="$2" ;;
        --wrapper) WRAPPER="$2" ;;
        --path-prepend) export PATH="$2:$PATH" ;;
      esac
      shift 2
      ;;
    *)
      echo "SYNCBOOT ok=false reason=bad-args detail=unknown argument $1"
      exit 64
      ;;
  esac
done

[[ -n "$REPO" && -n "$IOS_REPO" && -n "$EXPECTED_ORIGIN" && -n "$LOCK" ]] || {
  echo "SYNCBOOT ok=false reason=bad-args detail=--repo, --ios-repo, --expected-origin and --lock are required"
  exit 64
}
[[ -n "$WRAPPER" ]] || WRAPPER="$REPO/scripts/intake-run-wrapper.sh"

cleanup_lock() {
  if [[ -n "$LOCK_TOKEN" && -f "$LOCK" ]] \
    && [[ "$(cat "$LOCK" 2>/dev/null)" == "$LOCK_TOKEN" ]]; then
    rm -f -- "$LOCK"
  fi
}

if [[ -e "$LOCK" ]]; then
  lock_age=$(( $(date +%s) - $(stat -f %m "$LOCK" 2>/dev/null || echo 0) ))
  if (( lock_age < STALE_LOCK_SECONDS )); then
    echo "SYNCBOOT ok=false reason=lock-held detail=age=${lock_age}s"
    exit 75
  fi
  echo "SYNCBOOT-WARN stale lock age=${lock_age}s — taking over"
  rm -f -- "$LOCK"
fi

mkdir -p -- "${LOCK:h}" || {
  echo "SYNCBOOT ok=false reason=lock-parent detail=${LOCK:h}"
  exit 73
}
LOCK_TOKEN="pid=$$ acquiredAt=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
if ! (set -o noclobber; print -r -- "$LOCK_TOKEN" > "$LOCK") 2>/dev/null; then
  LOCK_TOKEN=""
  echo "SYNCBOOT ok=false reason=lock-held detail=acquire-race"
  exit 75
fi
trap cleanup_lock EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

notify_failure() {
  if [[ -f "$REPO/scripts/intake-notify.js" ]]; then
    node "$REPO/scripts/intake-notify.js" --failure "sync-bootstrap: $1" >/dev/null 2>&1 || true
  fi
}

fail() {
  local reason="$1"
  local detail="${2:-}"
  local rc="${3:-1}"
  notify_failure "$reason $detail"
  echo "SYNCBOOT ok=false reason=$reason detail=$detail"
  exit "$rc"
}

[[ -d "$REPO/.git" ]] || fail repo-missing "$REPO" 78
[[ -d "$IOS_REPO" ]] || fail ios-repo-missing "$IOS_REPO" 78
[[ -x "$WRAPPER" ]] || fail wrapper-missing "$WRAPPER" 78

cd "$REPO" || fail cd-failed "$REPO" 78

dirty="$(git status --porcelain --untracked-files=all 2>/dev/null)" \
  || fail repo-status-failed "$REPO"
[[ -z "$dirty" ]] || fail repo-dirty "${dirty[1,240]}"

branch="$(git branch --show-current 2>/dev/null)" || fail branch-unresolved ""
[[ "$branch" == "main" ]] || fail wrong-branch "branch=$branch"

actual_origin="$(git remote get-url origin 2>/dev/null)" || fail origin-missing ""
[[ "$actual_origin" == "$EXPECTED_ORIGIN" ]] \
  || fail wrong-origin "expected=$EXPECTED_ORIGIN actual=$actual_origin"

git fetch origin main --quiet || fail fetch-failed "origin/main"
behind="$(git rev-list HEAD..origin/main --count 2>/dev/null)" \
  || fail divergence-unresolved "behind"
ahead="$(git rev-list origin/main..HEAD --count 2>/dev/null)" \
  || fail divergence-unresolved "ahead"

if [[ "$behind" != 0 && "$ahead" != 0 ]]; then
  fail repo-diverged "behind=$behind ahead=$ahead"
fi
if [[ "$ahead" != 0 ]]; then
  fail repo-ahead "behind=$behind ahead=$ahead"
fi
if [[ "$behind" != 0 ]]; then
  git merge --ff-only origin/main >/dev/null 2>&1 \
    || fail fast-forward-failed "behind=$behind"
fi

dirty="$(git status --porcelain --untracked-files=all 2>/dev/null)" \
  || fail repo-status-failed "post-sync"
[[ -z "$dirty" ]] || fail repo-dirty-post-sync "${dirty[1,240]}"
[[ "$(git branch --show-current)" == "main" ]] || fail wrong-branch-post-sync ""
[[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]] \
  || fail repo-out-of-sync-post-sync ""

export THREEDPA_INTAKE_REPO="$REPO"
export THREEDPA_IOS_REPO="$IOS_REPO"

"$WRAPPER" --repo "$REPO" --ios-repo "$IOS_REPO"
wrapper_rc=$?
if [[ $wrapper_rc -ne 0 ]]; then
  echo "SYNCBOOT ok=false reason=wrapper-failed detail=rc=$wrapper_rc"
  exit $wrapper_rc
fi

echo "SYNCBOOT ok=true reason=none detail=behind=$behind ahead=$ahead"
exit 0
