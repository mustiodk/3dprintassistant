#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
OUT="$TMP/preflight.out"

copy_preflight() {
  mkdir -p "$TMP/repo/scripts"
  cp "$ROOT/scripts/intake-run-preflight.sh" "$TMP/repo/scripts/intake-run-preflight.sh"
  chmod +x "$TMP/repo/scripts/intake-run-preflight.sh"
}

init_repo() {
  rm -rf "$TMP/repo"
  mkdir -p "$TMP/repo"
  cd "$TMP/repo"
  git init -q
  git config user.email test@example.invalid
  git config user.name "intake test"
  mkdir -p scripts docs data
  printf '[]\n' > scripts/printer-intake-outcomes.jsonl
  printf '{"schema":"printer-provenance@1","printers":{}}\n' > docs/printer-provenance.json
  printf '{"printers":[]}\n' > data/printers.json
  copy_preflight
  git add .
  git commit -qm init
  git update-ref refs/remotes/origin/main HEAD
}

expect_ok() {
  local output
  if ! output=$("$TMP/repo/scripts/intake-run-preflight.sh" --repo "$TMP/repo" --dry-run 2>&1); then
    printf '%s\n' "$output" >&2
    echo "expected preflight success" >&2
    exit 1
  fi
  printf '%s\n' "$output" > "$OUT"
  grep -q 'PREFLIGHT ok=true reason=none detail=dry-run' "$OUT"
}

expect_fail() {
  local reason="$1"
  local output
  if output=$("$TMP/repo/scripts/intake-run-preflight.sh" --repo "$TMP/repo" --dry-run 2>&1); then
    printf '%s\n' "$output" >&2
    echo "expected preflight failure" >&2
    exit 1
  fi
  printf '%s\n' "$output" > "$OUT"
  grep -q "PREFLIGHT ok=false reason=$reason" "$OUT"
}

init_repo
printf '{}\n' > "$TMP/repo/docs/printer-provenance.json"
printf '{"candidateKey":"k2_se"}\n' >> "$TMP/repo/scripts/printer-intake-outcomes.jsonl"
expect_ok

init_repo
printf bad > "$TMP/repo/data/printers.json"
expect_fail web-dirty

init_repo
printf '{}\n' > "$TMP/repo/docs/printer-provenance.json"
printf '{"candidateKey":"k2_se"}\n' >> "$TMP/repo/scripts/printer-intake-outcomes.jsonl"
git -C "$TMP/repo" add docs/printer-provenance.json scripts/printer-intake-outcomes.jsonl
git -C "$TMP/repo" commit -qm "chore(intake): custody k2_se provenance"
expect_ok

init_repo
printf bad > "$TMP/repo/data/printers.json"
git -C "$TMP/repo" add data/printers.json
git -C "$TMP/repo" commit -qm "chore(intake): custody touches data"
expect_fail web-out-of-sync

init_repo
printf '{}\n' > "$TMP/repo/docs/printer-provenance.json"
git -C "$TMP/repo" add docs/printer-provenance.json
git -C "$TMP/repo" commit -qm "feat(intake): mutate custody path"
expect_fail web-out-of-sync
