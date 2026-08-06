#!/bin/zsh
# launchd entry point for the answer normalizer.
#
# Exists so the plist can invoke a single executable with plain arguments
# instead of embedding a shell one-liner — `&&` inside a plist string needs XML
# escaping and silently produces an unloadable job when it is missed.
#
# Sources oauth.env because the standalone keychain credential is 401-stale for
# headless runs on this machine (see reference_mac_mini_headless_claude_auth_oauth_env).
set -uo pipefail

REPO="${THREEDPA_INTAKE_REPO:-$HOME/.local/share/3dpa-intake/checkout/3dprintassistant}"

if [[ ! -d "$REPO" ]]; then
  print -u2 "NORMALIZER ok=false reason=repo-missing detail=$REPO"
  exit 1
fi

[[ -f "$HOME/.config/claude-code/oauth.env" ]] && source "$HOME/.config/claude-code/oauth.env"

cd "$REPO" || { print -u2 "NORMALIZER ok=false reason=cd-failed"; exit 1; }
exec node scripts/intake-answer-normalizer.js "$@"
