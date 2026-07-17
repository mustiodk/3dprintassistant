#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INSTALLER="$ROOT/scripts/install-intake-runner.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [[ ! -x "$INSTALLER" ]]; then
  echo "FAIL: missing executable $INSTALLER" >&2
  exit 1
fi

ORIGIN="$TMP/origin.git"
SOURCE="$TMP/source"
OLD="$TMP/old"
IOS="$TMP/ios"
INSTALL_ROOT="$TMP/install"
OUT="$TMP/install.out"

git init -q --bare "$ORIGIN"
git clone -q "$ORIGIN" "$SOURCE"
git -C "$SOURCE" switch -qc main
git -C "$SOURCE" config user.email test@example.invalid
git -C "$SOURCE" config user.name "installer test"
mkdir -p "$SOURCE/scripts/launchd"
cp "$ROOT/scripts/intake-sync-bootstrap.sh" "$SOURCE/scripts/intake-sync-bootstrap.sh"
cp "$ROOT/scripts/launchd/dk.mragile.3dpa-intake.plist" "$SOURCE/scripts/launchd/dk.mragile.3dpa-intake.plist"
chmod +x "$SOURCE/scripts/intake-sync-bootstrap.sh"
printf 'scripts/.intake-runner-state/\nscripts/.printer-intake-out/\nscripts/.printer-intake-runner.watermark.json\n' > "$SOURCE/.gitignore"
printf 'base\n' > "$SOURCE/data.txt"
git -C "$SOURCE" add .
git -C "$SOURCE" commit -qm init
git -C "$SOURCE" push -q -u origin main
git -C "$ORIGIN" symbolic-ref HEAD refs/heads/main

git init -q -b main "$IOS"
git -C "$IOS" config user.email test@example.invalid
git -C "$IOS" config user.name "installer ios test"
printf 'name: test\n' > "$IOS/project.yml"
git -C "$IOS" add project.yml
git -C "$IOS" commit -qm init
git -C "$IOS" update-ref refs/remotes/origin/main HEAD

mkdir -p "$OLD/scripts/.intake-runner-state/parked/u1" "$OLD/scripts/.printer-intake-out"
printf '{"candidateId":"u1"}\n' > "$OLD/scripts/.intake-runner-state/parked/u1/parked.json"
printf '{"tool":"scout"}\n' > "$OLD/scripts/.printer-intake-out/run-report.json"
printf '{"watermark":"test"}\n' > "$OLD/scripts/.printer-intake-runner.watermark.json"

run_installer() {
  set +e
  "$INSTALLER" \
    --source-repo "$SOURCE" \
    --install-root "$INSTALL_ROOT" \
    --ios-repo "$IOS" \
    --expected-origin "$ORIGIN" \
    "$@" > "$OUT" 2>&1
  INSTALL_RC=$?
  set -e
}

tree_digest() {
  find "$1" -type f -print0 | sort -z | xargs -0 shasum -a 256
}

# 1 — fresh install + explicit state migration.
run_installer --migrate-state-from "$OLD" --no-launchctl
[[ "$INSTALL_RC" == 0 ]] || { cat "$OUT" >&2; exit 1; }
grep -q 'INSTALL ok=true mode=install' "$OUT"
CHECKOUT="$INSTALL_ROOT/checkout/3dprintassistant"
BOOTSTRAP="$INSTALL_ROOT/bin/intake-sync-bootstrap.sh"
PLIST="$INSTALL_ROOT/launchd/dk.mragile.3dpa-intake.plist"
[[ "$(git -C "$CHECKOUT" rev-parse HEAD)" == "$(git -C "$SOURCE" rev-parse HEAD)" ]]
cmp -s "$SOURCE/scripts/intake-sync-bootstrap.sh" "$BOOTSTRAP"
[[ -x "$BOOTSTRAP" ]]
grep -Fq "$BOOTSTRAP" "$PLIST"
grep -Fq "$CHECKOUT" "$PLIST"
grep -Fq "$IOS" "$PLIST"
grep -Fq "$ORIGIN" "$PLIST"
grep -Fq "$INSTALL_ROOT/intake-sync.lock" "$PLIST"
grep -Fq "$INSTALL_ROOT" "$PLIST"
cmp -s "$OLD/scripts/.intake-runner-state/parked/u1/parked.json" "$CHECKOUT/scripts/.intake-runner-state/parked/u1/parked.json"
cmp -s "$OLD/scripts/.printer-intake-out/run-report.json" "$CHECKOUT/scripts/.printer-intake-out/run-report.json"
cmp -s "$OLD/scripts/.printer-intake-runner.watermark.json" "$CHECKOUT/scripts/.printer-intake-runner.watermark.json"
[[ -s "$INSTALL_ROOT/state-migration.sha256" ]]

# 2 — verify-only is byte-stable.
before="$(tree_digest "$INSTALL_ROOT")"
run_installer --verify-only --no-launchctl
[[ "$INSTALL_RC" == 0 ]] || { cat "$OUT" >&2; exit 1; }
grep -q 'INSTALL ok=true mode=verify' "$OUT"
after="$(tree_digest "$INSTALL_ROOT")"
[[ "$after" == "$before" ]] || { echo 'FAIL: verify-only changed installed bytes' >&2; exit 1; }

# 3 — repeated install/migration is idempotent.
run_installer --migrate-state-from "$OLD" --no-launchctl
[[ "$INSTALL_RC" == 0 ]] || { cat "$OUT" >&2; exit 1; }
[[ "$(tree_digest "$INSTALL_ROOT")" == "$before" ]]

# 4 — conflicting destination state fails without overwrite.
printf '{"candidateId":"changed"}\n' > "$OLD/scripts/.intake-runner-state/parked/u1/parked.json"
destination_before="$(shasum -a 256 "$CHECKOUT/scripts/.intake-runner-state/parked/u1/parked.json")"
run_installer --migrate-state-from "$OLD" --no-launchctl
[[ "$INSTALL_RC" != 0 ]]
grep -q 'state-conflict' "$OUT"
[[ "$(shasum -a 256 "$CHECKOUT/scripts/.intake-runner-state/parked/u1/parked.json")" == "$destination_before" ]]

echo "install-intake-runner.test.sh: all tests passed"
