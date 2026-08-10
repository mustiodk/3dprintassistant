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
printf 'scripts/.intake-runner-state/\nscripts/.printer-intake-out/\nscripts/.printer-intake-runner.watermark.json\nscripts/.printer-intake.local.json\n' > "$SOURCE/.gitignore"
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
# Protected notifier config: gitignored secret, migrated separately from the
# mutable state manifest. SECRETMARKER must never appear in installer output.
printf '{"discordWebhookUrl":"https://hooks.discord.test/SECRETMARKER"}\n' > "$OLD/scripts/.printer-intake.local.json"
chmod 600 "$OLD/scripts/.printer-intake.local.json"

# BSD and GNU stat take incompatible flags, and the obvious shim
# `stat -f ... || stat -c ...` does NOT work: on GNU, `-f` means "filesystem
# status" and EXITS 0, so the fallback never fires and the caller silently gets
# filesystem junk instead of a mode. Dispatch on the platform instead.
file_mode() {
  case "$(uname -s)" in
    Darwin) stat -f %Lp "$1" ;;
    *)      stat -c %a  "$1" ;;
  esac
}

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
run_installer --verify-only --migrate-state-from "$OLD" --no-launchctl
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

# --- protected notifier-config installation (PD8 recovery design §7) --------

# 5 — the install migrates the config byte-identically at mode 0600, never
#     printing the secret; it is excluded from the mutable state manifest.
printf '{"candidateId":"u1"}\n' > "$OLD/scripts/.intake-runner-state/parked/u1/parked.json"  # restore after test 4
CONFIG_DEST="$CHECKOUT/scripts/.printer-intake.local.json"
run_installer --migrate-state-from "$OLD" --no-launchctl
[[ "$INSTALL_RC" == 0 ]] || { cat "$OUT" >&2; echo 'FAIL: install with protected config failed' >&2; exit 1; }
cmp -s "$OLD/scripts/.printer-intake.local.json" "$CONFIG_DEST" || { echo 'FAIL: protected config not migrated byte-identically' >&2; exit 1; }
[[ "$(file_mode "$CONFIG_DEST")" == 600 ]] || { echo "FAIL: protected config mode $(file_mode "$CONFIG_DEST") != 600" >&2; exit 1; }
grep -q 'SECRETMARKER' "$OUT" && { echo 'FAIL: installer printed the webhook secret' >&2; exit 1; }
grep -q 'printer-intake.local.json' "$INSTALL_ROOT/state-migration.sha256" && { echo 'FAIL: protected config leaked into the state manifest' >&2; exit 1; }

# 6 — verify-only proves presence, byte equality, and mode; repeat install
#     stays idempotent with the config in place.
run_installer --verify-only --migrate-state-from "$OLD" --no-launchctl
[[ "$INSTALL_RC" == 0 ]] || { cat "$OUT" >&2; echo 'FAIL: verify-only failed with a correct protected config' >&2; exit 1; }
config_before="$(tree_digest "$INSTALL_ROOT")"
run_installer --migrate-state-from "$OLD" --no-launchctl
[[ "$INSTALL_RC" == 0 ]] || { cat "$OUT" >&2; exit 1; }
[[ "$(tree_digest "$INSTALL_ROOT")" == "$config_before" ]] || { echo 'FAIL: repeat install with config not idempotent' >&2; exit 1; }

# 7 — verify-only detects byte drift and wrong mode, without printing bytes.
printf '{"discordWebhookUrl":"https://hooks.discord.test/DRIFTED"}\n' > "$CONFIG_DEST"
chmod 600 "$CONFIG_DEST"
run_installer --verify-only --migrate-state-from "$OLD" --no-launchctl
[[ "$INSTALL_RC" != 0 ]] || { echo 'FAIL: verify-only accepted drifted config bytes' >&2; exit 1; }
grep -q 'protected-config-mismatch' "$OUT" || { cat "$OUT" >&2; echo 'FAIL: drift not reported as protected-config-mismatch' >&2; exit 1; }
grep -Eq 'SECRETMARKER|DRIFTED' "$OUT" && { echo 'FAIL: verify printed config bytes' >&2; exit 1; }
cp "$OLD/scripts/.printer-intake.local.json" "$CONFIG_DEST"
chmod 644 "$CONFIG_DEST"
run_installer --verify-only --migrate-state-from "$OLD" --no-launchctl
[[ "$INSTALL_RC" != 0 ]] || { echo 'FAIL: verify-only accepted mode 644' >&2; exit 1; }
grep -q 'protected-config-mode' "$OUT" || { cat "$OUT" >&2; echo 'FAIL: wrong mode not reported as protected-config-mode' >&2; exit 1; }
chmod 600 "$CONFIG_DEST"
run_installer --verify-only --migrate-state-from "$OLD" --no-launchctl
[[ "$INSTALL_RC" == 0 ]] || { cat "$OUT" >&2; echo 'FAIL: verify-only failed after restoring config' >&2; exit 1; }

# 8 — an unequal existing destination fails without overwrite.
printf '{"discordWebhookUrl":"https://hooks.discord.test/DRIFTED"}\n' > "$CONFIG_DEST"
chmod 600 "$CONFIG_DEST"
dest_before="$(shasum -a 256 "$CONFIG_DEST")"
run_installer --migrate-state-from "$OLD" --no-launchctl
[[ "$INSTALL_RC" != 0 ]] || { echo 'FAIL: install overwrote a conflicting protected config' >&2; exit 1; }
grep -q 'protected-config-conflict' "$OUT" || { cat "$OUT" >&2; echo 'FAIL: conflict not reported as protected-config-conflict' >&2; exit 1; }
[[ "$(shasum -a 256 "$CONFIG_DEST")" == "$dest_before" ]] || { echo 'FAIL: conflicting destination was mutated' >&2; exit 1; }
grep -Eq 'SECRETMARKER|DRIFTED' "$OUT" && { echo 'FAIL: conflict path printed config bytes' >&2; exit 1; }
cp "$OLD/scripts/.printer-intake.local.json" "$CONFIG_DEST"
chmod 600 "$CONFIG_DEST"

# 9 — a missing migration-source config fails before mutating the install;
#     the migration source is required in both install and verify paths.
mv "$OLD/scripts/.printer-intake.local.json" "$TMP/config.aside"
digest_before="$(tree_digest "$INSTALL_ROOT")"
run_installer --migrate-state-from "$OLD" --no-launchctl
[[ "$INSTALL_RC" != 0 ]] || { echo 'FAIL: install accepted a migration source with no notifier config' >&2; exit 1; }
grep -q 'migration-config-missing' "$OUT" || { cat "$OUT" >&2; echo 'FAIL: missing source config not reported as migration-config-missing' >&2; exit 1; }
[[ "$(tree_digest "$INSTALL_ROOT")" == "$digest_before" ]] || { echo 'FAIL: failed install mutated the installed tree' >&2; exit 1; }
mv "$TMP/config.aside" "$OLD/scripts/.printer-intake.local.json"
run_installer --verify-only --no-launchctl
[[ "$INSTALL_RC" != 0 ]] || { echo 'FAIL: verify-only ran without the required migration source' >&2; exit 1; }
run_installer --no-launchctl
[[ "$INSTALL_RC" != 0 ]] || { echo 'FAIL: install ran without the required migration source' >&2; exit 1; }

# 10 — a broader-mode source still lands at exactly 0600 through the copy
#      path (temp file must never be world-readable; review P3: umask guard).
chmod 644 "$OLD/scripts/.printer-intake.local.json"
rm -f "$CONFIG_DEST"
run_installer --migrate-state-from "$OLD" --no-launchctl
[[ "$INSTALL_RC" == 0 ]] || { cat "$OUT" >&2; echo 'FAIL: install failed with a 644-mode source config' >&2; exit 1; }
[[ "$(file_mode "$CONFIG_DEST")" == 600 ]] || { echo "FAIL: copy path produced mode $(file_mode "$CONFIG_DEST"), not 600" >&2; exit 1; }
grep -q 'SECRETMARKER' "$OUT" && { echo 'FAIL: installer printed the webhook secret' >&2; exit 1; }
chmod 600 "$OLD/scripts/.printer-intake.local.json"

echo "install-intake-runner.test.sh: all tests passed"
