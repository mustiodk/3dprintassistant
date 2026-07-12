#!/usr/bin/env bash
# Regression tests for intake-post-run-invariants.sh (2026-07-12 incident:
# a runner session exited 0 after the candidate commit WITHOUT PD5 review,
# report, notify, or cleanup — and the wrapper accepted it as success).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
OUT="$TMP/postrun.out"

REPO="$TMP/repo"
STATE="$REPO/scripts/.intake-runner-state"
RUN_START=0   # epoch 0 by default — any existing file counts as fresh

copy_script() {
  mkdir -p "$REPO/scripts"
  cp "$ROOT/scripts/intake-post-run-invariants.sh" "$REPO/scripts/intake-post-run-invariants.sh"
  chmod +x "$REPO/scripts/intake-post-run-invariants.sh"
}

init_repo() {
  rm -rf "$REPO"
  mkdir -p "$REPO"
  cd "$REPO"
  git init -q
  git config user.email test@example.invalid
  git config user.name "intake test"
  git checkout -qb main
  mkdir -p scripts docs data
  printf '[]\n' > scripts/printer-intake-outcomes.jsonl
  printf '{"schema":"printer-provenance@1","printers":{}}\n' > docs/printer-provenance.json
  printf '{"printers":[]}\n' > data/printers.json
  printf 'scripts/.intake-runner-state/\n' > .gitignore
  copy_script
  git add .
  git commit -qm init
  git update-ref refs/remotes/origin/main HEAD
  # healthy terminal run state: non-empty session log + fresh report
  mkdir -p "$STATE"
  printf 'run summary\n' > "$STATE/last-run-session.log"
  printf '# 3dpa intake run — test\n' > "$STATE/last-run-report.md"
}

run_postrun() {
  "$REPO/scripts/intake-post-run-invariants.sh" \
    --repo "$REPO" --state-dir "$STATE" --run-start-epoch "$RUN_START" 2>&1
}

expect_ok() {
  local output
  if ! output=$(run_postrun); then
    printf '%s\n' "$output" >&2
    echo "expected post-run invariants success" >&2
    exit 1
  fi
  printf '%s\n' "$output" > "$OUT"
  grep -q 'POSTRUN ok=true reason=none' "$OUT"
}

expect_fail() {
  local reason="$1"
  local output rc
  set +e
  output=$(run_postrun)
  rc=$?
  set -e
  if [[ $rc -eq 0 ]]; then
    printf '%s\n' "$output" >&2
    echo "expected post-run invariants failure ($reason)" >&2
    exit 1
  fi
  if [[ $rc -ne 65 ]]; then
    echo "expected exit 65, got $rc" >&2
    exit 1
  fi
  printf '%s\n' "$output" > "$OUT"
  grep -q "POSTRUN ok=false reason=$reason" "$OUT"
}

# 1 — healthy terminal state passes
init_repo
expect_ok

# 2 — empty session log (incident: last-run-session.log ended ~empty)
init_repo
: > "$STATE/last-run-session.log"
expect_fail session-log-empty

# 3 — missing session log
init_repo
rm "$STATE/last-run-session.log"
expect_fail session-log-missing

# 4 — stale report (incident: last-run-report.md was still the OLD failure
#     report → notify never ran this run)
init_repo
RUN_START=$(( $(date +%s) + 60 ))
expect_fail report-stale
RUN_START=0

# 5 — missing report
init_repo
rm "$STATE/last-run-report.md"
expect_fail report-missing

# 6 — left on an intake branch (incident: no cleanup back to main)
init_repo
git -C "$REPO" checkout -qb intake/centauri_carbon_2
expect_fail not-on-main

# 7 — dirty tree with non-custody paths (e.g. untracked bridge transcript)
init_repo
printf 'full-mode bridge run\n' > "$REPO/bridge-2026-07-12-222924-350261.md"
expect_fail web-dirty

# 8 — custody-only dirt is repairable next run, not a failure
init_repo
printf '{"candidateKey":"k2_se"}\n' >> "$REPO/scripts/printer-intake-outcomes.jsonl"
expect_ok

# 9 — custody-only ahead commits allowed (push repair next run)
init_repo
printf '{"candidateKey":"k2_se"}\n' >> "$REPO/scripts/printer-intake-outcomes.jsonl"
git -C "$REPO" add scripts/printer-intake-outcomes.jsonl
git -C "$REPO" commit -qm "chore(intake): custody k2_se"
expect_ok

# 10 — non-custody ahead commits fail (unpushed merge / stray work)
init_repo
printf 'bad' > "$REPO/data/printers.json"
git -C "$REPO" add data/printers.json
git -C "$REPO" commit -qm "feat: unpushed printer row"
expect_fail web-out-of-sync

echo "intake-post-run-invariants.test.sh: all tests passed"
