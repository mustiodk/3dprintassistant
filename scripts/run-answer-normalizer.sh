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

# launchd hands a job a minimal PATH — an interactive shell's PATH is NOT
# inherited, so `node` is simply absent and the run dies with
# "command not found: node". The intake runner's own bootstrap sets PATH the
# same way for the same reason; this file must not rely on a login shell.
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

REPO="${THREEDPA_INTAKE_REPO:-$HOME/.local/share/3dpa-intake/checkout/3dprintassistant}"

if [[ ! -d "$REPO" ]]; then
  print -u2 "NORMALIZER ok=false reason=repo-missing detail=$REPO"
  exit 1
fi

[[ -f "$HOME/.config/claude-code/oauth.env" ]] && source "$HOME/.config/claude-code/oauth.env"

command -v node >/dev/null 2>&1 || {
  print -u2 "NORMALIZER ok=false reason=node-not-on-path detail=PATH=$PATH"
  exit 1
}

cd "$REPO" || { print -u2 "NORMALIZER ok=false reason=cd-failed"; exit 1; }
exec node scripts/intake-answer-normalizer.js "$@"
