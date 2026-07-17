#!/usr/bin/env bash
set -euo pipefail

SOURCE_REPO=""
INSTALL_ROOT=""
IOS_REPO=""
EXPECTED_ORIGIN=""
MIGRATE_FROM=""
VERIFY_ONLY=false
NO_LAUNCHCTL=false

fail() {
  echo "INSTALL ok=false reason=$1 detail=${2:-}" >&2
  exit "${3:-1}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-repo|--install-root|--ios-repo|--expected-origin|--migrate-state-from)
      [[ $# -ge 2 && -n "$2" ]] || fail bad-args "$1 requires a value" 64
      case "$1" in
        --source-repo) SOURCE_REPO="$2" ;;
        --install-root) INSTALL_ROOT="$2" ;;
        --ios-repo) IOS_REPO="$2" ;;
        --expected-origin) EXPECTED_ORIGIN="$2" ;;
        --migrate-state-from) MIGRATE_FROM="$2" ;;
      esac
      shift 2
      ;;
    --verify-only) VERIFY_ONLY=true; shift ;;
    --no-launchctl) NO_LAUNCHCTL=true; shift ;;
    *) fail bad-args "unknown argument $1" 64 ;;
  esac
done

[[ -n "$SOURCE_REPO" && -n "$INSTALL_ROOT" && -n "$IOS_REPO" && -n "$EXPECTED_ORIGIN" ]] \
  || fail bad-args '--source-repo, --install-root, --ios-repo and --expected-origin are required' 64

SOURCE_REPO="$(cd "$SOURCE_REPO" 2>/dev/null && pwd -P)" || fail source-missing "$SOURCE_REPO"
IOS_REPO="$(cd "$IOS_REPO" 2>/dev/null && pwd -P)" || fail ios-repo-missing "$IOS_REPO"
if [[ -n "$MIGRATE_FROM" ]]; then
  MIGRATE_FROM="$(cd "$MIGRATE_FROM" 2>/dev/null && pwd -P)" || fail migration-source-missing "$MIGRATE_FROM"
fi

git -C "$SOURCE_REPO" rev-parse --git-dir >/dev/null 2>&1 || fail source-not-git "$SOURCE_REPO"
[[ "$(git -C "$SOURCE_REPO" branch --show-current)" == main ]] || fail source-not-main ""
[[ -z "$(git -C "$SOURCE_REPO" status --porcelain --untracked-files=all)" ]] || fail source-dirty ""
[[ "$(git -C "$SOURCE_REPO" remote get-url origin 2>/dev/null)" == "$EXPECTED_ORIGIN" ]] \
  || fail source-origin-mismatch ""
git -C "$SOURCE_REPO" fetch origin main --quiet || fail source-fetch-failed ""
source_behind="$(git -C "$SOURCE_REPO" rev-list HEAD..origin/main --count)"
source_ahead="$(git -C "$SOURCE_REPO" rev-list origin/main..HEAD --count)"
[[ "$source_behind" == 0 && "$source_ahead" == 0 ]] \
  || fail source-out-of-sync "behind=$source_behind ahead=$source_ahead"

git -C "$IOS_REPO" rev-parse --git-dir >/dev/null 2>&1 || fail ios-repo-not-git "$IOS_REPO"
[[ -z "$(git -C "$IOS_REPO" status --porcelain --untracked-files=all)" ]] || fail ios-repo-dirty ""

CHECKOUT="$INSTALL_ROOT/checkout/3dprintassistant"
BIN_DIR="$INSTALL_ROOT/bin"
LAUNCHD_DIR="$INSTALL_ROOT/launchd"
BOOTSTRAP="$BIN_DIR/intake-sync-bootstrap.sh"
PLIST="$LAUNCHD_DIR/dk.mragile.3dpa-intake.plist"
LOCK="$INSTALL_ROOT/intake-sync.lock"
MANIFEST="$INSTALL_ROOT/state-migration.sha256"
SOURCE_BOOTSTRAP="$SOURCE_REPO/scripts/intake-sync-bootstrap.sh"
SOURCE_PLIST="$SOURCE_REPO/scripts/launchd/dk.mragile.3dpa-intake.plist"

[[ -f "$SOURCE_BOOTSTRAP" && -x "$SOURCE_BOOTSTRAP" ]] || fail source-bootstrap-missing "$SOURCE_BOOTSTRAP"
[[ -f "$SOURCE_PLIST" ]] || fail source-plist-missing "$SOURCE_PLIST"

escape_sed() {
  printf '%s' "$1" | sed 's/[&|]/\\&/g'
}

render_plist() {
  local output="$1"
  sed \
    -e "s|__INTAKE_BOOTSTRAP__|$(escape_sed "$BOOTSTRAP")|g" \
    -e "s|__INTAKE_REPO__|$(escape_sed "$CHECKOUT")|g" \
    -e "s|__IOS_REPO__|$(escape_sed "$IOS_REPO")|g" \
    -e "s|__EXPECTED_ORIGIN__|$(escape_sed "$EXPECTED_ORIGIN")|g" \
    -e "s|__INTAKE_LOCK__|$(escape_sed "$LOCK")|g" \
    -e "s|__INSTALL_ROOT__|$(escape_sed "$INSTALL_ROOT")|g" \
    "$SOURCE_PLIST" > "$output"
}

item_manifest() {
  local item="$1"
  if [[ -f "$item" ]]; then
    shasum -a 256 "$item" | awk '{print $1 "  ."}'
  elif [[ -d "$item" ]]; then
    find "$item" -type f | LC_ALL=C sort | while IFS= read -r file; do
      relative="${file#"$item"/}"
      hash="$(shasum -a 256 "$file" | awk '{print $1}')"
      printf '%s  %s\n' "$hash" "$relative"
    done
  fi
}

state_manifest() {
  local repo="$1"
  local relative item
  for relative in \
    scripts/.intake-runner-state \
    scripts/.printer-intake-out \
    scripts/.printer-intake-runner.watermark.json; do
    item="$repo/$relative"
    if [[ -e "$item" ]]; then
      if [[ -f "$item" ]]; then
        printf '%s  %s\n' "$(shasum -a 256 "$item" | awk '{print $1}')" "$relative"
      else
        find "$item" -type f | LC_ALL=C sort | while IFS= read -r file; do
          printf '%s  %s\n' \
            "$(shasum -a 256 "$file" | awk '{print $1}')" \
            "${file#"$repo"/}"
        done
      fi
    fi
  done
}

validate_checkout() {
  [[ -d "$CHECKOUT/.git" ]] || fail checkout-missing "$CHECKOUT"
  [[ "$(git -C "$CHECKOUT" branch --show-current)" == main ]] || fail checkout-not-main ""
  [[ "$(git -C "$CHECKOUT" remote get-url origin 2>/dev/null)" == "$EXPECTED_ORIGIN" ]] \
    || fail checkout-origin-mismatch ""
  [[ -z "$(git -C "$CHECKOUT" status --porcelain --untracked-files=all)" ]] || fail checkout-dirty ""
  git -C "$CHECKOUT" fetch origin main --quiet || fail checkout-fetch-failed ""
  checkout_behind="$(git -C "$CHECKOUT" rev-list HEAD..origin/main --count)"
  checkout_ahead="$(git -C "$CHECKOUT" rev-list origin/main..HEAD --count)"
  [[ "$checkout_behind" == 0 && "$checkout_ahead" == 0 ]] \
    || fail checkout-out-of-sync "behind=$checkout_behind ahead=$checkout_ahead"
}

verify_install() {
  validate_checkout
  cmp -s "$SOURCE_BOOTSTRAP" "$BOOTSTRAP" || fail bootstrap-mismatch "$BOOTSTRAP"
  [[ -x "$BOOTSTRAP" ]] || fail bootstrap-not-executable "$BOOTSTRAP"
  local expected_plist
  expected_plist="$(mktemp)"
  trap 'rm -f "$expected_plist"' RETURN
  render_plist "$expected_plist"
  cmp -s "$expected_plist" "$PLIST" || fail plist-mismatch "$PLIST"
  [[ -f "$MANIFEST" ]] || fail state-manifest-missing "$MANIFEST"
  local current_manifest
  current_manifest="$(state_manifest "$CHECKOUT")"
  [[ "$current_manifest" == "$(cat "$MANIFEST")" ]] || fail state-manifest-mismatch ""
}

if [[ "$VERIFY_ONLY" == true ]]; then
  verify_install
  echo "INSTALL ok=true mode=verify checkout=$CHECKOUT"
  exit 0
fi

mkdir -p "$INSTALL_ROOT" "$BIN_DIR" "$LAUNCHD_DIR"
if [[ ! -e "$CHECKOUT" ]]; then
  mkdir -p "$(dirname "$CHECKOUT")"
  git clone -q "$EXPECTED_ORIGIN" "$CHECKOUT" || fail clone-failed "$CHECKOUT"
else
  validate_checkout
fi

# Refuse every unequal state collision before copying anything.
if [[ -n "$MIGRATE_FROM" ]]; then
  for relative in \
    scripts/.intake-runner-state \
    scripts/.printer-intake-out \
    scripts/.printer-intake-runner.watermark.json; do
    source_item="$MIGRATE_FROM/$relative"
    destination_item="$CHECKOUT/$relative"
    if [[ -e "$source_item" && -e "$destination_item" ]] \
      && [[ "$(item_manifest "$source_item")" != "$(item_manifest "$destination_item")" ]]; then
      fail state-conflict "$relative"
    fi
  done
  for relative in \
    scripts/.intake-runner-state \
    scripts/.printer-intake-out \
    scripts/.printer-intake-runner.watermark.json; do
    source_item="$MIGRATE_FROM/$relative"
    destination_item="$CHECKOUT/$relative"
    if [[ -e "$source_item" && ! -e "$destination_item" ]]; then
      mkdir -p "$(dirname "$destination_item")"
      cp -R "$source_item" "$destination_item"
    fi
  done
fi

bootstrap_tmp="$BOOTSTRAP.tmp.$$"
cp "$SOURCE_BOOTSTRAP" "$bootstrap_tmp"
chmod +x "$bootstrap_tmp"
mv -f "$bootstrap_tmp" "$BOOTSTRAP"

plist_tmp="$PLIST.tmp.$$"
render_plist "$plist_tmp"
mv -f "$plist_tmp" "$PLIST"

state_manifest "$CHECKOUT" > "$MANIFEST"
verify_install

# Loading/replacing the real LaunchAgent is deliberately a separate documented
# cutover after verify-only. --no-launchctl is retained as an explicit test and
# dry-environment seam; neither mode mutates ~/Library/LaunchAgents.
: "$NO_LAUNCHCTL"
echo "INSTALL ok=true mode=install checkout=$CHECKOUT state_manifest=$MANIFEST"
