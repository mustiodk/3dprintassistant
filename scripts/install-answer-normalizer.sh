#!/bin/zsh
# Installs the answer-normalizer LaunchAgent: 11:30 daily, thirty minutes before
# the 12:00 intake run, so owner answers are already in a readable shape by the
# time the run reads them.
#
# Mirrors the intake runner's install pattern. Sources oauth.env because the
# standalone keychain credential is 401-stale on this machine for headless runs.
set -euo pipefail

REPO="${1:-$HOME/.local/share/3dpa-intake/checkout/3dprintassistant}"
LABEL="dk.mragile.3dpa-answer-normalizer"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"

[[ -d "$REPO" ]] || { print -u2 "repo not found: $REPO"; exit 1; }
[[ -f "$REPO/scripts/intake-answer-normalizer.js" ]] \
  || { print -u2 "normalizer not present in $REPO — pull first"; exit 1; }
chmod +x "$REPO/scripts/run-answer-normalizer.sh" 2>/dev/null || true

cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>${REPO}/scripts/run-answer-normalizer.sh</string>
    <string>--apply</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict><key>THREEDPA_INTAKE_REPO</key><string>${REPO}</string></dict>
  <key>WorkingDirectory</key><string>${REPO}</string>
  <!-- 11:30 local — thirty minutes ahead of the 12:00 intake run. -->
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>11</integer>
    <key>Minute</key><integer>30</integer>
  </dict>
  <key>StandardOutPath</key><string>${HOME}/Library/Logs/3dpa-answer-normalizer.out.log</string>
  <key>StandardErrorPath</key><string>${HOME}/Library/Logs/3dpa-answer-normalizer.err.log</string>
  <key>RunAtLoad</key><false/>
</dict>
</plist>
PLISTEOF

plutil -lint "$PLIST" >/dev/null
launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
print "installed ${LABEL} — 11:30 daily, repo=${REPO}"
