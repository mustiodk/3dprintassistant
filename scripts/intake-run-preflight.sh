#!/bin/zsh
# intake-run-preflight.sh — deterministic fail-closed preflight
# (Intake Autonomy v2, Gate B3; spec §3.1).
#
# CHECKS ONLY — lock ACQUISITION lives in intake-run-wrapper.sh (Codex SF-1).
# Order: freeze flag → run-lock freshness → repo predicates (web clean+in-sync;
# iOS clean, ahead-only allowed) → wrangler auth + KV delete-scope probe →
# bridge --health. Any failure prints a machine-readable line and exits
# non-zero; the wrapper maps that to notify + no run.
#
# Exit codes: 0 ok · 78 frozen (EX_CONFIG) · 75 lock held (EX_TEMPFAIL) · 1 other.
# Machine line: "PREFLIGHT ok=true|false reason=<slug> detail=<...>"

export PATH="/Users/mustafaozturk-macmini/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

REPO="/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant"
IOS_REPO="/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant-ios"
FREEZE="$REPO/scripts/.intake-autonomy-freeze"
LOCK="$REPO/scripts/.intake-run.lock"
STALE_LOCK_SECONDS=$((6 * 3600))
DRY_RUN=false

fail() {
  echo "PREFLIGHT ok=false reason=$1 detail=${2:-}"
  exit "${3:-1}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      if [[ $# -lt 2 || -z "$2" ]]; then
        fail bad-args "--repo requires a path"
      fi
      REPO="$2"
      FREEZE="$REPO/scripts/.intake-autonomy-freeze"
      LOCK="$REPO/scripts/.intake-run.lock"
      shift 2
      ;;
    --ios-repo)
      if [[ $# -lt 2 || -z "$2" ]]; then
        fail bad-args "--ios-repo requires a path"
      fi
      IOS_REPO="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      fail bad-args "unknown argument $1"
      ;;
  esac
done

cd "$REPO" || fail cd-failed "$REPO"

# 1 — freeze flag (PD8 kill switch)
if [[ -f "$FREEZE" ]]; then
  fail frozen "$(head -c 200 "$FREEZE" | tr '\n' ' ')" 78
fi

# 2 — run lock: held+fresh → exit; stale (>6h) → warn + proceed (the wrapper
# will take it over; a crashed run must not block tomorrow's).
if [[ -f "$LOCK" ]]; then
  lock_age=$(( $(date +%s) - $(stat -f %m "$LOCK") ))
  if (( lock_age < STALE_LOCK_SECONDS )); then
    fail lock-held "age=${lock_age}s" 75
  fi
  echo "PREFLIGHT-WARN stale lock (age=${lock_age}s > ${STALE_LOCK_SECONDS}s) — proceeding"
fi

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

ensure_dry_run_origin_main() {
  if ! git show-ref --verify --quiet refs/remotes/origin/main; then
    git update-ref refs/remotes/origin/main HEAD 2>/dev/null || fail dry-run-origin-main ""
  fi
}

# 3 — web repo predicates: clean/in-sync, with a narrow custody repair pass
if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  if all_dirty_paths_are_custody; then
    echo "PREFLIGHT-WARN custody-dirty — runner will repair before normal work"
  else
    fail web-dirty "$(git status --porcelain --untracked-files=all | head -3 | tr '\n' ' ')"
  fi
fi
if [[ "$DRY_RUN" == "false" ]]; then
  git fetch origin main --quiet || fail web-fetch-failed ""
else
  ensure_dry_run_origin_main
fi
behind=$(git rev-list HEAD..origin/main --count)
ahead=$(git rev-list origin/main..HEAD --count)
if [[ "$behind" != "0" ]]; then
  fail web-out-of-sync "behind=$behind ahead=$ahead"
fi
if [[ "$ahead" != "0" ]]; then
  if ahead_commits_are_custody_only; then
    echo "PREFLIGHT-WARN custody-ahead — runner will push/repair before normal work"
  else
    fail web-out-of-sync "behind=$behind ahead=$ahead"
  fi
fi

# 4 — iOS repo predicates: clean; AHEAD-ONLY allowed (mirror commits
# accumulate by design under the push gate); behind/diverged blocks.
if [[ ! -d "$IOS_REPO/.git" ]]; then
  fail ios-repo-missing "$IOS_REPO"
fi
if [[ -n "$(git -C "$IOS_REPO" status --porcelain)" ]]; then
  fail ios-dirty "$(git -C "$IOS_REPO" status --porcelain | head -3 | tr '\n' ' ')"
fi
if [[ "$DRY_RUN" == "false" ]]; then
  git -C "$IOS_REPO" fetch origin main --quiet || fail ios-fetch-failed ""
elif ! git -C "$IOS_REPO" show-ref --verify --quiet refs/remotes/origin/main; then
  git -C "$IOS_REPO" update-ref refs/remotes/origin/main HEAD 2>/dev/null \
    || fail dry-run-ios-origin-main ""
fi
ios_behind=$(git -C "$IOS_REPO" rev-list HEAD..origin/main --count)
if [[ "$ios_behind" != "0" ]]; then
  fail ios-behind-or-diverged "behind=$ios_behind"
fi

if [[ "$DRY_RUN" == "true" ]]; then
  echo "PREFLIGHT ok=true reason=none detail=dry-run"
  exit 0
fi

# 5 — wrangler auth + KV delete-scope probe (write+delete a probe: key; the
# hygiene stage needs delete scope, and whoami alone cannot prove it)
NAMESPACE_ID="f3d89a4e70a34e3fab1c0f7676efebb5"
whoami_out=$(npx wrangler whoami 2>&1)
if [[ $? -ne 0 ]] || ! echo "$whoami_out" | grep -qE '[0-9a-f]{32}'; then
  fail wrangler-auth "${whoami_out[1,200]}"
fi
probe_key="probe:preflight:$(date +%s)"
# --ttl: if the delete below ever fails, the probe key self-expires in a day
# (hygiene ignores non-req: keys, so nothing else would clean it).
if ! npx wrangler kv key put --remote --namespace-id "$NAMESPACE_ID" "$probe_key" "preflight" --ttl 86400 > /dev/null 2>&1; then
  fail kv-put-scope "$probe_key"
fi
if ! npx wrangler kv key delete --remote --namespace-id "$NAMESPACE_ID" "$probe_key" > /dev/null 2>&1; then
  fail kv-delete-scope "$probe_key left behind — delete manually"
fi

# 6 — bridge health (presence-not-validity; PD5 park-on-failure covers an
# expired token at a real turn)
if ! bridge --health > /dev/null 2>&1; then
  fail bridge-health ""
fi

echo "PREFLIGHT ok=true reason=none detail="
exit 0
