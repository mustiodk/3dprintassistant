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
  printf 'scripts/.intake-runner-state/\nscripts/.printer-intake-out/\n' > .gitignore
  copy_script
  git add .
  git commit -qm init
  git update-ref refs/remotes/origin/main HEAD
  # healthy terminal run state: non-empty session log + fresh report
  mkdir -p "$STATE"
  printf 'run summary\n' > "$STATE/last-run-session.log"
  printf '# 3dpa intake run — test\n' > "$STATE/last-run-report.md"
  printf '{"schema":"intake-decision-sync@1","opened":[],"closed":[],"existing":[]}\n' \
    > "$STATE/last-decision-sync.json"
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

# 8 — Bridge output inside ignored runner state is retained without dirtying web
init_repo
mkdir -p "$STATE/bridge-reviews"
printf 'codex-only bridge run\n' > "$STATE/bridge-reviews/bridge-2026-07-13-100815-004699.md"
expect_ok

# 9 — custody-only dirt is repairable next run, not a failure
init_repo
printf '{"candidateKey":"k2_se"}\n' >> "$REPO/scripts/printer-intake-outcomes.jsonl"
expect_ok

# 10 — custody-only ahead commits allowed (push repair next run)
init_repo
printf '{"candidateKey":"k2_se"}\n' >> "$REPO/scripts/printer-intake-outcomes.jsonl"
git -C "$REPO" add scripts/printer-intake-outcomes.jsonl
git -C "$REPO" commit -qm "chore(intake): custody k2_se"
expect_ok

# 11 — non-custody ahead commits fail (unpushed merge / stray work)
init_repo
printf 'bad' > "$REPO/data/printers.json"
git -C "$REPO" add data/printers.json
git -C "$REPO" commit -qm "feat: unpushed printer row"
expect_fail web-out-of-sync

make_parked() { # id [reason] — fresh intake-parked@2 sidecar for this run
  local reason="${2:-review-unavailable}"
  mkdir -p "$STATE/parked/$1"
  printf '{"schema":"intake-parked@2","reason":"%s","class":"%s","repairAttempts":0,"verdictRefs":[],"tainted":false,"evidence":[]}\n' \
    "$reason" "$reason" > "$STATE/parked/$1/parked.json"
}

set_candidate_artifact() { # id relative-path sha256
  node -e '
    const fs = require("fs");
    const sidecar = process.argv[1];
    const data = JSON.parse(fs.readFileSync(sidecar, "utf8"));
    data.candidateArtifact = { path: process.argv[2], sha256: process.argv[3] };
    fs.writeFileSync(sidecar, `${JSON.stringify(data)}\n`);
  ' "$STATE/parked/$1/parked.json" "$2" "$3"
}

set_preserved_ref() { # id ref
  node -e '
    const fs = require("fs");
    const sidecar = process.argv[1];
    const data = JSON.parse(fs.readFileSync(sidecar, "utf8"));
    data.preservedRef = process.argv[2];
    fs.writeFileSync(sidecar, `${JSON.stringify(data)}\n`);
  ' "$STATE/parked/$1/parked.json" "$2"
}

# 12 — fresh park with preserved branch + packet passes
init_repo
git -C "$REPO" branch intake/centauri_carbon_2
make_parked centauri_carbon_2
mkdir -p "$REPO/scripts/.printer-intake-out"
printf '{}\n' > "$REPO/scripts/.printer-intake-out/candidate-elegoo-centauri_carbon_2.json"
expect_ok

# 13 — fresh park whose branch was deleted fails (2026-07-13 incident shape)
init_repo
make_parked centauri_carbon_2
mkdir -p "$REPO/scripts/.printer-intake-out"
printf '{}\n' > "$REPO/scripts/.printer-intake-out/candidate-elegoo-centauri_carbon_2.json"
expect_fail park-branch-missing

# 14 — fresh park whose packet evidence is gone fails
init_repo
git -C "$REPO" branch intake/centauri_carbon_2
make_parked centauri_carbon_2
expect_fail park-packet-missing

# 15 — packet inside the parked dir itself also satisfies preservation
init_repo
git -C "$REPO" branch intake/centauri_carbon_2
make_parked centauri_carbon_2
printf '{}\n' > "$STATE/parked/centauri_carbon_2/candidate-elegoo-centauri_carbon_2.json"
expect_ok

# 16 — PRIOR-run sidecar with deleted branch is exempt (stage 0b cleanup of a
#      ledgered review-no-go park must not trip the preservation gate)
init_repo
make_parked centauri_carbon_2
touch -mt 202601010000 "$STATE/parked/centauri_carbon_2/parked.json"
RUN_START=$(( $(date +%s) - 60 ))
expect_ok
RUN_START=0

# 17 — stage-3 park (no branch ever created) passes with packet only
#      (hostile-review finding: unverified-model parks happen BEFORE stage 4)
init_repo
make_parked mystery_printer unverified-model
printf '{}\n' > "$STATE/parked/mystery_printer/candidate-unknown-mystery_printer.json"
expect_ok

# 18 — fresh review-no-go park is branch-exempt (stage 0b migration can bump
#      sidecar mtime in the same run its prior-run branch is deleted) but
#      still needs its packet
init_repo
make_parked centauri_carbon_2 review-no-go
printf '{}\n' > "$STATE/parked/centauri_carbon_2/candidate-elegoo-centauri_carbon_2.json"
expect_ok

# 19 — review-split park without its branch fails (owner decision needs it)
init_repo
make_parked centauri_carbon_2 review-split
printf '{}\n' > "$STATE/parked/centauri_carbon_2/candidate-elegoo-centauri_carbon_2.json"
expect_fail park-branch-missing

# 20 — staging packet matched by CONTENT when the filename does not embed the
#      printer id (Scout names packets candidate-<mfr>-<snake(model)>.json)
init_repo
make_parked x1c unverified-model
mkdir -p "$REPO/scripts/.printer-intake-out"
printf '{"printerId":"x1c","model":"X1 Carbon"}\n' > "$REPO/scripts/.printer-intake-out/candidate-bambu-x1_carbon.json"
expect_ok

# 21 — sidecar without a reason field fails unreadable (fail-closed)
init_repo
git -C "$REPO" branch intake/centauri_carbon_2
mkdir -p "$STATE/parked/centauri_carbon_2"
printf '{"schema":"intake-parked@2"}\n' > "$STATE/parked/centauri_carbon_2/parked.json"
expect_fail park-sidecar-unreadable

# 22 — v2 sidecar artifact identity passes only when the exact path + SHA match
init_repo
make_parked centauri_carbon_2 unverified-model
mkdir -p "$REPO/scripts/.printer-intake-out"
packet_rel="scripts/.printer-intake-out/candidate-elegoo-centauri_carbon_2.json"
printf '{"printerId":"centauri_carbon_2","filled":true}\n' > "$REPO/$packet_rel"
packet_sha="$(shasum -a 256 "$REPO/$packet_rel" | awk '{print $1}')"
set_candidate_artifact centauri_carbon_2 "$packet_rel" "$packet_sha"
expect_ok

# 23 — a skeleton at the right path cannot impersonate the declared packet
init_repo
make_parked centauri_carbon_2 unverified-model
mkdir -p "$REPO/scripts/.printer-intake-out"
packet_rel="scripts/.printer-intake-out/candidate-elegoo-centauri_carbon_2.json"
printf '{"printerId":"centauri_carbon_2","filled":false}\n' > "$REPO/$packet_rel"
set_candidate_artifact centauri_carbon_2 "$packet_rel" "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
expect_fail park-packet-mismatch

# 24 — candidateArtifact may not escape the repository
init_repo
make_parked centauri_carbon_2 unverified-model
outside="$TMP/outside-candidate.json"
printf '{"printerId":"centauri_carbon_2","filled":true}\n' > "$outside"
outside_sha="$(shasum -a 256 "$outside" | awk '{print $1}')"
set_candidate_artifact centauri_carbon_2 "../outside-candidate.json" "$outside_sha"
expect_fail park-packet-unsafe

# 25 — a repository-local symlink may not smuggle an outside artifact through
init_repo
make_parked centauri_carbon_2 unverified-model
outside="$TMP/outside-candidate-symlink-target.json"
printf '{"printerId":"centauri_carbon_2","filled":true}\n' > "$outside"
mkdir -p "$REPO/scripts/.printer-intake-out"
ln -s "$outside" "$REPO/scripts/.printer-intake-out/candidate-elegoo-centauri_carbon_2.json"
outside_sha="$(shasum -a 256 "$outside" | awk '{print $1}')"
set_candidate_artifact centauri_carbon_2 "scripts/.printer-intake-out/candidate-elegoo-centauri_carbon_2.json" "$outside_sha"
expect_fail park-packet-unsafe

# 26 — a review-stage sidecar may not point at a pre-rebase branch commit
init_repo
git -C "$REPO" branch intake/centauri_carbon_2
make_parked centauri_carbon_2 review-unavailable
printf '{}\n' > "$STATE/parked/centauri_carbon_2/candidate-elegoo-centauri_carbon_2.json"
set_preserved_ref centauri_carbon_2 "intake/centauri_carbon_2@1111111111111111111111111111111111111111"
expect_fail park-ref-mismatch

# 27 — an exact review-stage branch identity satisfies custody
init_repo
git -C "$REPO" branch intake/centauri_carbon_2
make_parked centauri_carbon_2 review-unavailable
printf '{}\n' > "$STATE/parked/centauri_carbon_2/candidate-elegoo-centauri_carbon_2.json"
branch_sha="$(git -C "$REPO" rev-parse refs/heads/intake/centauri_carbon_2)"
set_preserved_ref centauri_carbon_2 "$branch_sha"
expect_ok

# ── 2026-08-04 incident: R1 failed twice, runner never parked ──────────────
# The boundary correctly returned `R1REVIEW ok=false reason=envelope-subtype`
# (nested session aborted_streaming) on BOTH attempts, and the runner ignored
# the contract's fail-closed clause — it backgrounded, exited, and left no
# review-unavailable park. POSTRUN only caught it generically as report-stale,
# which named a symptom and not the cause. This invariant is deterministic: an
# R1 attempt that produced no verdict THIS RUN must have produced a park.

r1_attempt() { # label [with-structured]
  mkdir -p "$STATE/bridge-reviews"
  printf 'review prompt\n' > "$STATE/bridge-reviews/pd5-$1-r1-20260804T175112Z-prompt.md"
  printf '{"is_error":true,"subtype":"error_during_execution"}\n' \
    > "$STATE/bridge-reviews/pd5-$1-r1-20260804T175112Z-envelope.json"
  if [[ "${2:-}" == "with-structured" ]]; then
    printf '{"reviewer":"claude-opus-r1","verdict":"GO","objections":[]}\n' \
      > "$STATE/bridge-reviews/pd5-$1-r1-20260804T175112Z-structured.json"
  fi
}

# 28 — a verdictless R1 attempt with NO park is the 2026-08-04 failure
init_repo
r1_attempt ender_3_s1
expect_fail r1-attempted-not-parked

set_last_attempt() { # id iso8601
  node -e '
    const fs = require("fs");
    const p = process.argv[1];
    const d = JSON.parse(fs.readFileSync(p, "utf8"));
    d.lastAttemptAt = process.argv[2];
    fs.writeFileSync(p, `${JSON.stringify(d)}\n`);
  ' "$STATE/parked/$1/parked.json" "$2"
}

# 29 — same attempt, but the contract was followed: review-unavailable park
init_repo
git -C "$REPO" branch intake/ender_3_s1
r1_attempt ender_3_s1
make_parked ender_3_s1 review-unavailable
set_last_attempt ender_3_s1 "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '{}\n' > "$STATE/parked/ender_3_s1/candidate-creality-ender_3_s1.json"
branch_sha="$(git -C "$REPO" rev-parse refs/heads/intake/ender_3_s1)"
set_preserved_ref ender_3_s1 "$branch_sha"
expect_ok

# 29b — 2026-08-06 false positive: a TAINTED candidate cannot legally carry
# reason `review-unavailable` (availability-blocked sets taintedAllowed:false,
# so classifyParkReason redirects it). The park is still correct and the run
# must pass — the old check demanded the literal string and failed it.
init_repo
git -C "$REPO" branch intake/ender_3_s1
r1_attempt ender_3_s1
make_parked ender_3_s1 review-no-go-unresolved
set_last_attempt ender_3_s1 "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '{}\n' > "$STATE/parked/ender_3_s1/candidate-creality-ender_3_s1.json"
branch_sha="$(git -C "$REPO" rev-parse refs/heads/intake/ender_3_s1)"
set_preserved_ref ender_3_s1 "$branch_sha"
expect_ok

# 29c — a park left over from a PRIOR run does not count as recording this one
#
# RUN_START is sampled BEFORE init_repo here and in cases 31, 33 and 34 below,
# and that ordering is the point. Sampling it after the artifacts exist made
# this suite intermittently red (~1 run in 6): an artifact written at second T
# was compared against a run-start of T+1 whenever the wall clock ticked in
# between, so the run failed with the wrong reason —
#
#   POSTRUN ok=false reason=report-stale detail=mtime=1786388765 run-start=1786388766
#
# where this case expects `r1-attempted-not-parked`. Sampling first makes
# run-start <= every artifact this case intends to be current, by construction
# and at any setup duration. A `- 1` tolerance was tried first and rejected: it
# only narrows the window (2s of setup reopens it) and it weakens the staleness
# boundary the invariant exists to enforce.
#
# Cases that need a genuinely stale artifact age it explicitly with
# `touch -t 202601010000`, which no sampling order can accidentally satisfy.
#
# Production was never affected: the real runner samples run-start at run START,
# before any artifact is written. Only the test built the ordering backwards.
RUN_START=$(date +%s)
init_repo
git -C "$REPO" branch intake/ender_3_s1
r1_attempt ender_3_s1
make_parked ender_3_s1 review-no-go-unresolved
set_last_attempt ender_3_s1 "2026-01-01T00:00:00Z"
printf '{}\n' > "$STATE/parked/ender_3_s1/candidate-creality-ender_3_s1.json"
expect_fail r1-attempted-not-parked
RUN_START=0

# 30 — an R1 that DID produce a verdict needs no park (normal GO path)
init_repo
r1_attempt ender_3_s1 with-structured
expect_ok

# 31 — a stale R1 attempt from a PRIOR run must not implicate this one.
# Age the ARTIFACT rather than moving RUN_START forward: a future run-start
# would also stale the report and test two things at once.
RUN_START=$(date +%s)
init_repo
r1_attempt ender_3_s1
touch -t 202601010000 "$STATE/bridge-reviews/pd5-ender_3_s1-r1-20260804T175112Z-prompt.md"
expect_ok
RUN_START=0

# 32 — the decision-issue sweep never ran (2026-08-10 silent-park gap: `hi` and
#      `ender3_s1_pro` both parked decision-required and were never surfaced,
#      because no stage existed to surface them).
init_repo
rm "$STATE/last-decision-sync.json"
expect_fail decision-sync-missing

# 33 — a receipt left by a PRIOR run does not count as this run's sweep (same
#      shape as case 4's stale report: the file existing proves nothing).
RUN_START=$(date +%s)
init_repo
touch -t 202601010000 "$STATE/last-decision-sync.json"
expect_fail decision-sync-stale
RUN_START=0

# 34 — a sweep that ran and found nothing stuck still passes: a quiet day must
#      be distinguishable from a skipped stage, and it is, by the receipt.
RUN_START=$(date +%s)
init_repo
touch "$STATE/last-decision-sync.json"
expect_ok
RUN_START=0

echo "intake-post-run-invariants.test.sh: all tests passed"
