#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOOTSTRAP="$ROOT/scripts/intake-sync-bootstrap.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [[ ! -x "$BOOTSTRAP" ]]; then
  echo "FAIL: missing executable $BOOTSTRAP" >&2
  exit 1
fi

ORIGIN="$TMP/origin.git"
SEED="$TMP/seed"
AUTO="$TMP/automation"
DEV="$TMP/development"
IOS="$TMP/ios"
LOCK="$TMP/intake-sync.lock"
WRAPPER_LOG="$TMP/wrapper.log"
OUT="$TMP/bootstrap.out"

git init -q --bare "$ORIGIN"
git init -q -b main "$SEED"
git -C "$SEED" config user.email test@example.invalid
git -C "$SEED" config user.name "intake sync test"
mkdir -p "$SEED/scripts" "$IOS"
printf 'base\n' > "$SEED/data.txt"
cat > "$SEED/scripts/intake-run-wrapper.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf 'repo=%s ios=%s\n' "$2" "$4" >> "$WRAPPER_LOG"
exit "${WRAPPER_RC:-0}"
EOF
chmod +x "$SEED/scripts/intake-run-wrapper.sh"
git -C "$SEED" add .
git -C "$SEED" commit -qm init
git -C "$SEED" remote add origin "$ORIGIN"
git -C "$SEED" push -q -u origin main
git -C "$ORIGIN" symbolic-ref HEAD refs/heads/main

clone_auto() {
  rm -rf "$AUTO"
  git clone -q "$ORIGIN" "$AUTO"
  git -C "$AUTO" config user.email test@example.invalid
  git -C "$AUTO" config user.name "intake sync test"
  : > "$WRAPPER_LOG"
  rm -f "$LOCK" "$OUT"
}

push_remote_change() {
  local value="$1"
  printf '%s\n' "$value" >> "$SEED/data.txt"
  git -C "$SEED" add data.txt
  git -C "$SEED" commit -qm "remote $value"
  git -C "$SEED" push -q origin main
}

run_bootstrap() {
  local expected_origin="${1:-$ORIGIN}"
  local wrapper="${2:-$AUTO/scripts/intake-run-wrapper.sh}"
  set +e
  WRAPPER_LOG="$WRAPPER_LOG" "$BOOTSTRAP" \
    --repo "$AUTO" \
    --ios-repo "$IOS" \
    --expected-origin "$expected_origin" \
    --lock "$LOCK" \
    --wrapper "$wrapper" > "$OUT" 2>&1
  BOOT_RC=$?
  set -e
}

expect_reason() {
  grep -q "SYNCBOOT ok=$1 reason=$2" "$OUT" || {
    cat "$OUT" >&2
    echo "FAIL: expected ok=$1 reason=$2" >&2
    exit 1
  }
}

expect_wrapper_count() {
  local expected="$1"
  local actual
  actual="$(wc -l < "$WRAPPER_LOG" | tr -d ' ')"
  [[ "$actual" == "$expected" ]] || {
    echo "FAIL: expected wrapper count $expected, got $actual" >&2
    exit 1
  }
}

# 1 — clean/current runs exactly once.
clone_auto
run_bootstrap
[[ "$BOOT_RC" == 0 ]]
expect_reason true none
expect_wrapper_count 1
[[ ! -e "$LOCK" ]]

# 2 — clean/behind fast-forwards before running.
clone_auto
before="$(git -C "$AUTO" rev-parse HEAD)"
push_remote_change behind
run_bootstrap
[[ "$BOOT_RC" == 0 ]]
expect_reason true none
[[ "$(git -C "$AUTO" rev-parse HEAD)" != "$before" ]]
[[ "$(git -C "$AUTO" rev-parse HEAD)" == "$(git -C "$AUTO" rev-parse origin/main)" ]]
expect_wrapper_count 1

# 3a — dirty tracked bytes are preserved and never run.
clone_auto
printf 'owner work\n' >> "$AUTO/data.txt"
tracked_sha="$(shasum -a 256 "$AUTO/data.txt")"
run_bootstrap
[[ "$BOOT_RC" != 0 ]]
expect_reason false repo-dirty
[[ "$(shasum -a 256 "$AUTO/data.txt")" == "$tracked_sha" ]]
expect_wrapper_count 0

# 3b — dirty untracked bytes are preserved and never run.
clone_auto
printf 'owner work\n' > "$AUTO/untracked.txt"
untracked_sha="$(shasum -a 256 "$AUTO/untracked.txt")"
run_bootstrap
[[ "$BOOT_RC" != 0 ]]
expect_reason false repo-dirty
[[ "$(shasum -a 256 "$AUTO/untracked.txt")" == "$untracked_sha" ]]
expect_wrapper_count 0

# 4 — local-ahead refuses.
clone_auto
printf 'local\n' >> "$AUTO/data.txt"
git -C "$AUTO" add data.txt
git -C "$AUTO" commit -qm local-ahead
run_bootstrap
[[ "$BOOT_RC" != 0 ]]
expect_reason false repo-ahead
expect_wrapper_count 0

# 5 — divergence refuses.
clone_auto
printf 'local divergent\n' >> "$AUTO/data.txt"
git -C "$AUTO" add data.txt
git -C "$AUTO" commit -qm local-divergent
push_remote_change divergent
run_bootstrap
[[ "$BOOT_RC" != 0 ]]
expect_reason false repo-diverged
expect_wrapper_count 0

# 6 — wrong branch refuses before fetch/runner.
clone_auto
git -C "$AUTO" switch -qc topic
run_bootstrap
[[ "$BOOT_RC" != 0 ]]
expect_reason false wrong-branch
expect_wrapper_count 0

# 7 — wrong origin refuses.
clone_auto
run_bootstrap "$TMP/not-the-origin.git"
[[ "$BOOT_RC" != 0 ]]
expect_reason false wrong-origin
expect_wrapper_count 0

# 8 — missing wrapper refuses.
clone_auto
run_bootstrap "$ORIGIN" "$AUTO/scripts/missing-wrapper.sh"
[[ "$BOOT_RC" != 0 ]]
expect_reason false wrapper-missing
expect_wrapper_count 0

# 9 — fresh external lock is an expected skip.
clone_auto
printf 'held\n' > "$LOCK"
run_bootstrap
[[ "$BOOT_RC" == 75 ]]
expect_reason false lock-held
expect_wrapper_count 0

# 10 — stale external lock is taken over atomically and released.
clone_auto
printf 'stale\n' > "$LOCK"
touch -t "$(date -v-7H +%Y%m%d%H%M)" "$LOCK"
run_bootstrap
[[ "$BOOT_RC" == 0 ]]
grep -q 'stale lock' "$OUT"
expect_reason true none
expect_wrapper_count 1
[[ ! -e "$LOCK" ]]

# 11 — dirty/behind development checkout is irrelevant to valid automation.
clone_auto
rm -rf "$DEV"
git clone -q "$ORIGIN" "$DEV"
printf 'human work\n' >> "$DEV/data.txt"
dev_sha="$(shasum -a 256 "$DEV/data.txt")"
push_remote_change dev-behind
git -C "$AUTO" pull -q --ff-only
run_bootstrap
[[ "$BOOT_RC" == 0 ]]
expect_reason true none
expect_wrapper_count 1
[[ "$(shasum -a 256 "$DEV/data.txt")" == "$dev_sha" ]]
[[ "$(git -C "$DEV" rev-list HEAD..origin/main --count)" != 0 ]]

# 12 — wrapper status propagates and the external lock still releases.
clone_auto
set +e
WRAPPER_LOG="$WRAPPER_LOG" WRAPPER_RC=7 "$BOOTSTRAP" \
  --repo "$AUTO" --ios-repo "$IOS" --expected-origin "$ORIGIN" \
  --lock "$LOCK" --wrapper "$AUTO/scripts/intake-run-wrapper.sh" > "$OUT" 2>&1
BOOT_RC=$?
set -e
[[ "$BOOT_RC" == 7 ]]
expect_reason false wrapper-failed
expect_wrapper_count 1
[[ ! -e "$LOCK" ]]

echo "intake-sync-bootstrap.test.sh: all tests passed"
