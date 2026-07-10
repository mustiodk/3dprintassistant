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

fail() {
  echo "PREFLIGHT ok=false reason=$1 detail=${2:-}"
  exit "${3:-1}"
}

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

# 3 — web repo predicates: clean AND exactly in sync with origin/main
if [[ -n "$(git status --porcelain)" ]]; then
  fail web-dirty "$(git status --porcelain | head -3 | tr '\n' ' ')"
fi
git fetch origin main --quiet || fail web-fetch-failed ""
behind=$(git rev-list HEAD..origin/main --count)
ahead=$(git rev-list origin/main..HEAD --count)
if [[ "$behind" != "0" || "$ahead" != "0" ]]; then
  fail web-out-of-sync "behind=$behind ahead=$ahead"
fi

# 4 — iOS repo predicates: clean; AHEAD-ONLY allowed (mirror commits
# accumulate by design under the push gate); behind/diverged blocks.
if [[ ! -d "$IOS_REPO/.git" ]]; then
  fail ios-repo-missing "$IOS_REPO"
fi
if [[ -n "$(git -C "$IOS_REPO" status --porcelain)" ]]; then
  fail ios-dirty "$(git -C "$IOS_REPO" status --porcelain | head -3 | tr '\n' ' ')"
fi
git -C "$IOS_REPO" fetch origin main --quiet || fail ios-fetch-failed ""
ios_behind=$(git -C "$IOS_REPO" rev-list HEAD..origin/main --count)
if [[ "$ios_behind" != "0" ]]; then
  fail ios-behind-or-diverged "behind=$ios_behind"
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
