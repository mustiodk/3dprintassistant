#!/bin/zsh
# intake-post-run-invariants.sh — deterministic fail-closed POST-run gate
# (Intake Autonomy v2; 2026-07-12 incident follow-up).
#
# WHY: `claude -p` exit 0 only proves the CLI completed — not that the runner
# session executed the contract. On 2026-07-12 a session exited 0 after the
# candidate commit with NO PD5 review, NO report, NO notify and NO cleanup,
# and the wrapper reported success. This script verifies the contract's
# observable terminal obligations so such a run is non-zero and fail-closed.
#
# CHECKS (any failure prints a machine line and exits 65 — EX_DATAERR):
#   1. last-run-session.log exists and is non-empty (the contract's final
#      summary paragraph lands on stdout → the wrapper's log redirect).
#   2. last-run-report.md exists and was (re)written during THIS run
#      (mtime >= --run-start-epoch) — intake-notify.js ALWAYS writes it, so a
#      fresh report is the deterministic proof the notify stage ran.
#   3. HEAD is back on `main` (runbook cleanup; parked intake/* branches may
#      exist, but must not be left checked out).
#   4. Working tree clean, or custody-paths-only dirty (same repairable
#      exception preflight grants — the next run repairs it).
#   5. Ahead-of-origin commits are custody-only (an unpushed merge or stray
#      work fails; custody push-repair is next run's job).
#   6. Park preservation: any parked sidecar written this run still has its
#      exact declared candidate packet, and review-stage parks
#      (review-unavailable / review-split) still have their intake/<id> branch;
#      when preservedRef is present it must name the branch's current commit.
#
# Exit codes: 0 ok · 65 invariant violated · 1 bad-args.
# Machine line: "POSTRUN ok=true|false reason=<slug> detail=<...>"

REPO="/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant"
STATE_DIR=""
RUN_START_EPOCH=""

fail() {
  echo "POSTRUN ok=false reason=$1 detail=${2:-}"
  exit "${3:-65}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      [[ $# -ge 2 && -n "$2" ]] || fail bad-args "--repo requires a path" 1
      REPO="$2"; shift 2 ;;
    --state-dir)
      [[ $# -ge 2 && -n "$2" ]] || fail bad-args "--state-dir requires a path" 1
      STATE_DIR="$2"; shift 2 ;;
    --run-start-epoch)
      [[ $# -ge 2 && "$2" == <-> ]] || fail bad-args "--run-start-epoch requires an epoch integer" 1
      RUN_START_EPOCH="$2"; shift 2 ;;
    *)
      fail bad-args "unknown argument $1" 1 ;;
  esac
done

[[ -n "$RUN_START_EPOCH" ]] || fail bad-args "--run-start-epoch is required" 1
[[ -n "$STATE_DIR" ]] || STATE_DIR="$REPO/scripts/.intake-runner-state"

cd "$REPO" || fail cd-failed "$REPO" 1

# mtime via zsh's builtin zstat — identical on macOS (prod) and Linux (tests),
# unlike the BSD/GNU `stat` binaries whose flags conflict.
zmodload zsh/stat 2>/dev/null || fail zstat-unavailable "zmodload zsh/stat failed" 1
mtime_of() {
  zstat +mtime -- "$1" 2>/dev/null
}

# 1 — session log: the runner's stdout transcript must exist and be non-empty
SESSION_LOG="$STATE_DIR/last-run-session.log"
if [[ ! -f "$SESSION_LOG" ]]; then
  fail session-log-missing "$SESSION_LOG"
fi
if [[ ! -s "$SESSION_LOG" ]]; then
  fail session-log-empty "$SESSION_LOG"
fi

# 2 — run report: freshly written this run ⇒ the notify stage actually ran
REPORT="$STATE_DIR/last-run-report.md"
if [[ ! -f "$REPORT" ]]; then
  fail report-missing "$REPORT"
fi
report_mtime=$(mtime_of "$REPORT")
if [[ -z "$report_mtime" ]] || (( report_mtime < RUN_START_EPOCH )); then
  fail report-stale "mtime=${report_mtime:-?} run-start=$RUN_START_EPOCH"
fi

# 3 — terminal branch: runbook cleanup ends on main
current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [[ "$current_branch" != "main" ]]; then
  fail not-on-main "branch=$current_branch"
fi

# custody predicates — identical vocabulary to intake-run-preflight.sh
is_custody_path() {
  case "$1" in
    scripts/printer-intake-outcomes.jsonl|docs/printer-provenance.json) return 0 ;;
    *) return 1 ;;
  esac
}

all_dirty_paths_are_custody() {
  local line file_path
  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    file_path="${line[4,-1]}"
    is_custody_path "$file_path" || return 1
  done < <(git status --porcelain --untracked-files=all)
  return 0
}

ahead_commits_are_custody_only() {
  local commit subject file_path saw_path
  while IFS= read -r commit; do
    [[ -n "$commit" ]] || continue
    subject="$(git log -1 --format=%s "$commit")"
    case "$subject" in
      chore\(intake\):\ custody*) ;;
      *) return 1 ;;
    esac

    saw_path=false
    while IFS= read -r file_path; do
      [[ -n "$file_path" ]] || continue
      saw_path=true
      is_custody_path "$file_path" || return 1
    done < <(git diff-tree --no-commit-id --name-only -r "$commit")
    [[ "$saw_path" == "true" ]] || return 1
  done < <(git rev-list origin/main..HEAD)
  return 0
}

# 4 — working tree: clean, or custody-only (repairable next run, as preflight)
if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  if all_dirty_paths_are_custody; then
    echo "POSTRUN-WARN custody-dirty — next run's preflight repair pass covers it"
  else
    fail web-dirty "$(git status --porcelain --untracked-files=all | head -3 | tr '\n' ' ')"
  fi
fi

# 5 — ahead commits: custody-only allowed; anything else is an unpushed
# merge / stray work → fail-closed. (No fetch here — the run's own fetches
# already updated origin/main; a post-run network call must not flake the gate.)
ahead=$(git rev-list origin/main..HEAD --count 2>/dev/null)
if [[ -z "$ahead" ]]; then
  fail web-out-of-sync "origin/main unresolved"
fi
if [[ "$ahead" != "0" ]] && ! ahead_commits_are_custody_only; then
  fail web-out-of-sync "ahead=$ahead non-custody"
fi

# 6 — park preservation (2026-07-13 incident): the runner parked
# centauri_carbon_2 correctly, then deleted the candidate branch and ignored
# packet as "cleanup" and reported success. A sidecar written THIS run
# (mtime >= run start) must leave its preservation-marked evidence behind.
#
# Branch requirement is scoped by park REASON (hostile-review finding: most
# parks happen at stage 3, BEFORE the intake/<id> branch exists — demanding a
# branch for `unverified-model` etc. would fail every legitimate research-stage
# park):
#   - `review-unavailable` / `review-split` (stage-5 parks; branch exists and
#     must survive for retry / owner decision) → branch REQUIRED.
#   - `review-no-go` → branch EXEMPT here: its branch legitimately dies in the
#     NEXT run's stage 0b after ledgering, and a stage-0b sidecar migration can
#     bump mtime in the same run the branch is deleted — a hard requirement
#     would false-fail that healthy path. Its objections live in the sidecar.
#   - all other reasons (stage-3/4 parks) → branch not expected.
# Packet evidence is required for EVERY fresh sidecar. A v2 sidecar carrying
# candidateArtifact.path + sha256 must preserve those exact bytes; a new Scout
# skeleton at the same filename is not custody. Legacy sidecars without full
# identity metadata retain the existence fallback: any candidate-*.json in the
# parked dir itself, or a staging packet that names or contains the id.
PARKED_ROOT="$STATE_DIR/parked"
if [[ -d "$PARKED_ROOT" ]]; then
  for sidecar in "$PARKED_ROOT"/*/parked.json(N); do
    sidecar_mtime=$(mtime_of "$sidecar")
    if [[ -z "$sidecar_mtime" ]]; then
      fail park-sidecar-unreadable "cannot stat $sidecar"
    fi
    (( sidecar_mtime >= RUN_START_EPOCH )) || continue
    candidate_id="${sidecar:h:t}"
    park_reason="$(grep -o '"reason"[[:space:]]*:[[:space:]]*"[^"]*"' "$sidecar" \
      | head -1 | sed 's/.*:[[:space:]]*"//; s/"$//')"
    if [[ -z "$park_reason" ]]; then
      fail park-sidecar-unreadable "no reason field in $sidecar"
    fi
    case "$park_reason" in
      review-unavailable|review-split)
        if ! git show-ref --verify --quiet "refs/heads/intake/$candidate_id"; then
          fail park-branch-missing "intake/$candidate_id deleted (fresh $park_reason park)"
        fi
        preserved_ref="$(node -e '
          const fs = require("fs");
          const sidecar = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
          process.stdout.write(typeof sidecar.preservedRef === "string" ? sidecar.preservedRef : "");
        ' "$sidecar" 2>/dev/null)" \
          || fail park-sidecar-unreadable "cannot parse preservedRef in $sidecar"
        if [[ -n "$preserved_ref" ]]; then
          branch_sha="$(git rev-parse "refs/heads/intake/$candidate_id" 2>/dev/null)" \
            || fail park-branch-missing "cannot resolve intake/$candidate_id"
          expected_ref="intake/$candidate_id@$branch_sha"
          if [[ "$preserved_ref" != "$expected_ref" ]]; then
            fail park-ref-mismatch "declared=$preserved_ref actual=$expected_ref"
          fi
        fi ;;
    esac
    artifact_status="$(node - "$REPO" "$sidecar" <<'NODE'
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

try {
  const repo = fs.realpathSync(process.argv[2]);
  const sidecar = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const artifact = sidecar.candidateArtifact;
  if (!artifact || (!artifact.path && !artifact.sha256)) {
    process.stdout.write('legacy');
    process.exit(0);
  }
  if (typeof artifact.path !== 'string' || typeof artifact.sha256 !== 'string'
      || !/^[a-f0-9]{64}$/i.test(artifact.sha256)) {
    process.stdout.write('invalid');
    process.exit(0);
  }
  const absolute = path.resolve(repo, artifact.path);
  if (absolute !== repo && !absolute.startsWith(`${repo}${path.sep}`)) {
    process.stdout.write('unsafe');
    process.exit(0);
  }
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    process.stdout.write('missing');
    process.exit(0);
  }
  const canonical = fs.realpathSync(absolute);
  if (canonical !== repo && !canonical.startsWith(`${repo}${path.sep}`)) {
    process.stdout.write('unsafe');
    process.exit(0);
  }
  const actual = crypto.createHash('sha256').update(fs.readFileSync(canonical)).digest('hex');
  process.stdout.write(actual === artifact.sha256.toLowerCase() ? 'ok' : 'mismatch');
} catch (_) {
  process.stdout.write('invalid');
}
NODE
)"
    packet_found=false
    case "$artifact_status" in
      ok) packet_found=true ;;
      unsafe) fail park-packet-unsafe "$candidate_id candidateArtifact escapes repository" ;;
      missing) fail park-packet-missing "$candidate_id declared candidateArtifact is missing" ;;
      mismatch) fail park-packet-mismatch "$candidate_id candidateArtifact sha256 mismatch" ;;
      invalid) fail park-sidecar-unreadable "$candidate_id invalid candidateArtifact metadata" ;;
      legacy)
        for packet in "${sidecar:h}"/candidate-*.json(N); do
          [[ -e "$packet" ]] && packet_found=true && break
        done
        if [[ "$packet_found" != "true" ]]; then
          for packet in "$REPO/scripts/.printer-intake-out"/candidate-*.json(N); do
            if [[ "${packet:t}" == *"$candidate_id"* ]] \
              || grep -q "\"$candidate_id\"" "$packet" 2>/dev/null; then
              packet_found=true; break
            fi
          done
        fi ;;
      *) fail park-sidecar-unreadable "$candidate_id unknown artifact status" ;;
    esac
    if [[ "$packet_found" != "true" ]]; then
      fail park-packet-missing "$candidate_id (no candidate packet in parked dir or staging)"
    fi
  done
fi

echo "POSTRUN ok=true reason=none detail="
exit 0
