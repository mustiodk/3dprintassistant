#!/usr/bin/env bash
# Integration tests for intake-run-wrapper.sh fail-closed post-run gating
# (2026-07-12 incident: claude -p exited 0 after the candidate commit without
# PD5 / report / notify / cleanup and the wrapper reported success).
#
# Uses the wrapper's test seams (--repo/--oauth-env/--path-prepend) plus a
# stubbed preflight, notify, and claude binary. zsh required (prod shell).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

REPO="$TMP/repo"
STATE="$REPO/scripts/.intake-runner-state"
BIN="$TMP/bin"

init_fixture() {
  rm -rf "$REPO" "$BIN"
  mkdir -p "$REPO/scripts" "$BIN"
  cd "$REPO"
  git init -q
  git config user.email test@example.invalid
  git config user.name "intake test"
  git checkout -qb main
  printf 'x\n' > file.txt
  printf 'scripts/.intake-runner-state/\nscripts/.printer-intake-out/\nscripts/.intake-run.lock\nscripts/notify-calls.log\n' > .gitignore
  cp "$ROOT/scripts/intake-run-wrapper.sh" scripts/intake-run-wrapper.sh
  cp "$ROOT/scripts/intake-post-run-invariants.sh" scripts/intake-post-run-invariants.sh 2>/dev/null || true
  cp "$ROOT/scripts/intake-run-kickoff.md" scripts/intake-run-kickoff.md
  chmod +x scripts/intake-run-wrapper.sh scripts/intake-post-run-invariants.sh 2>/dev/null || true
  cat > scripts/intake-run-preflight.sh <<'EOF'
#!/bin/zsh
echo "PREFLIGHT ok=true reason=none detail=stub"
exit 0
EOF
  chmod +x scripts/intake-run-preflight.sh
  cat > scripts/intake-notify.js <<'EOF'
require('fs').appendFileSync(__dirname + '/notify-calls.log',
  JSON.stringify(process.argv.slice(2)) + '\n');
EOF
  git add .
  git commit -qm init
  git update-ref refs/remotes/origin/main HEAD
  # PATH-pin seam dir: stub claude + real node
  ln -sf "$(command -v node)" "$BIN/node"
  touch "$TMP/oauth.env"
}

# stub claude that mirrors the incident: prints nothing, changes nothing,
# leaves the repo on an intake branch, exits 0
make_incident_claude() {
  cat > "$BIN/claude" <<EOF
#!/usr/bin/env bash
git -C "$REPO" checkout -qb intake/centauri_carbon_2
printf 'candidate\n' >> "$REPO/file.txt"
git -C "$REPO" add file.txt
git -C "$REPO" commit -qm "candidate splice"
exit 0
EOF
  chmod +x "$BIN/claude"
}

# stub claude that completes the contract's terminal obligations: prints a
# summary (session log), refreshes last-run-report.md (notify), ends on main
make_good_claude() {
  cat > "$BIN/claude" <<EOF
#!/usr/bin/env bash
mkdir -p "$STATE"
printf '# 3dpa intake run — stub\n' > "$STATE/last-run-report.md"
echo "run complete: shipped 0 parked 0 errored 0"
exit 0
EOF
  chmod +x "$BIN/claude"
}

make_observable_good_claude() {
  cat > "$BIN/claude" <<EOF
#!/usr/bin/env bash
touch "$TMP/claude-invoked"
mkdir -p "$STATE"
printf '# 3dpa intake run — stub\n' > "$STATE/last-run-report.md"
echo "run complete: shipped 0 parked 0 errored 0"
exit 0
EOF
  chmod +x "$BIN/claude"
}

make_crashing_claude() {
  cat > "$BIN/claude" <<EOF
#!/usr/bin/env bash
echo "boom"
exit 7
EOF
  chmod +x "$BIN/claude"
}

run_wrapper() {
  set +e
  zsh "$REPO/scripts/intake-run-wrapper.sh" \
    --repo "$REPO" --oauth-env "$TMP/oauth.env" --path-prepend "$BIN" \
    > "$TMP/wrapper.out" 2>&1
  rc=$?
  set -e
}

# 1 — incident replay: do-almost-nothing claude exits 0 → wrapper must FAIL
#     CLOSED (non-zero), notify --shipped-unknown, and release the lock
init_fixture
make_incident_claude
# stale report from a previous run
mkdir -p "$STATE"
printf '# old failure report\n' > "$STATE/last-run-report.md"
touch -d '3 hours ago' "$STATE/last-run-report.md" 2>/dev/null \
  || touch -t "$(date -v-3H +%Y%m%d%H%M 2>/dev/null)" "$STATE/last-run-report.md"
run_wrapper
if [[ $rc -eq 0 ]]; then
  cat "$TMP/wrapper.out" >&2
  echo "FAIL: wrapper accepted an incomplete runner session as success" >&2
  exit 1
fi
grep -q 'POSTRUN ok=false' "$TMP/wrapper.out" || { cat "$TMP/wrapper.out" >&2; echo "FAIL: no POSTRUN failure line" >&2; exit 1; }
grep -q -- '--shipped-unknown' "$REPO/scripts/notify-calls.log" || { echo "FAIL: post-run failure did not notify --shipped-unknown" >&2; exit 1; }
grep -q 'post-run' "$REPO/scripts/notify-calls.log" || { echo "FAIL: notify missing post-run stage" >&2; exit 1; }
[[ ! -f "$REPO/scripts/.intake-run.lock" ]] || { echo "FAIL: lock not released" >&2; exit 1; }

# 2 — contract-completing claude → wrapper exits 0 with POSTRUN ok=true
init_fixture
make_good_claude
run_wrapper
if [[ $rc -ne 0 ]]; then
  cat "$TMP/wrapper.out" >&2
  echo "FAIL: wrapper rejected a terminally-complete run (rc=$rc)" >&2
  exit 1
fi
grep -q 'POSTRUN ok=true' "$TMP/wrapper.out" || { cat "$TMP/wrapper.out" >&2; echo "FAIL: no POSTRUN ok line" >&2; exit 1; }
[[ ! -f "$REPO/scripts/.intake-run.lock" ]] || { echo "FAIL: lock not released" >&2; exit 1; }

# 3 — crashing claude keeps the existing rc-propagation + shipped-unknown path
init_fixture
make_crashing_claude
run_wrapper
[[ $rc -eq 7 ]] || { cat "$TMP/wrapper.out" >&2; echo "FAIL: expected rc=7, got $rc" >&2; exit 1; }
grep -q -- '--shipped-unknown' "$REPO/scripts/notify-calls.log" || { echo "FAIL: crash did not notify --shipped-unknown" >&2; exit 1; }
[[ ! -f "$REPO/scripts/.intake-run.lock" ]] || { echo "FAIL: lock not released" >&2; exit 1; }

# 4 — Bridge output is always an ignored directory under runner state
bridge_output_failures=0
init_fixture
make_good_claude
run_wrapper
if [[ ! -d "$STATE/bridge-reviews" ]]; then
  echo "FAIL: successful wrapper run did not create $STATE/bridge-reviews" >&2
  bridge_output_failures=$((bridge_output_failures + 1))
fi

# 5 — a conflicting non-directory fails closed before Claude is invoked
init_fixture
mkdir -p "$STATE"
printf 'not a directory\n' > "$STATE/bridge-reviews"
rm -f "$TMP/claude-invoked"
make_observable_good_claude
run_wrapper
if [[ $rc -eq 0 ]]; then
  echo "FAIL: wrapper accepted a non-directory Bridge output path" >&2
  bridge_output_failures=$((bridge_output_failures + 1))
fi
if [[ ! -f "$REPO/scripts/notify-calls.log" ]] \
  || ! grep -q 'bridge-output' "$REPO/scripts/notify-calls.log"; then
  echo "FAIL: Bridge output path conflict did not send a bridge-output failure notification" >&2
  bridge_output_failures=$((bridge_output_failures + 1))
fi
if [[ -e "$TMP/claude-invoked" ]]; then
  echo "FAIL: Claude was invoked after the Bridge output path conflict" >&2
  bridge_output_failures=$((bridge_output_failures + 1))
fi
[[ $bridge_output_failures -eq 0 ]] || exit 1

echo "intake-run-wrapper.test.sh: all tests passed"
