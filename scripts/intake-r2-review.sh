#!/bin/zsh
# intake-r2-review.sh — prompt boundary for the Reviewer-2 (codex/bridge) turn.
#
# WHY: v2.2 moved Reviewer 1's output-format instruction out of the runner's
# hand-written prompt and into intake-r1-structured-review.sh, because a prompt
# the runner composes fresh each run is a prompt the runner can compose wrong.
# Reviewer 2 was left out of that fix and kept its instruction in the contract
# as something the runner must remember to type.
#
# On 2026-08-07 it forgot. `kobra_2_neo` cleared R1 with zero objections; the R2
# prompt omitted "emit the structured result before prose", Codex reviewed it
# happily and answered in ordinary sentences, the verdict was not machine-
# readable, and the candidate parked `review-unavailable` for a day. The same
# run shipped `adventurer_3` — same code, same reviewers, one difference: the
# instruction was present that time.
#
# WHAT THIS SCRIPT GUARANTEES:
#   1. The canonical STRUCTURED OUTPUT CONTRACT block is appended to EVERY R2
#      prompt, after the body, explicitly superseding any conflicting earlier
#      instruction. The runner cannot omit what it does not write.
#   2. --out-dir is absolutised before bridge sees it. bridge resolves out-dir
#      against the CALLER'S cwd (bridge.py: `Path(args.out_dir) / ...`), so a
#      drifted cwd silently writes the transcript where nobody looks
#      (reference_bridge_outdir_cwd_relative).
#   3. A run is successful only if bridge emitted its `Wrote <path>` marker on
#      STDERR and that transcript exists. Exit 0 alone is not success.
#   4. Every failure exits 65, which the runner maps to
#      `auto-parked:review-unavailable` — identical to today's behaviour for a
#      malformed R2 result. This script adds no park class and no retry rule.
#
# WHAT IT DELIBERATELY DOES NOT DO: parse a verdict. The transcript is read and
# validated exactly as it is today, by scripts/validate-reviewer-output.js. Only
# the prompt side failed, so only the prompt side is owned here.
#
# Usage:
#   intake-r2-review.sh \
#     --prompt-file <path> --out-dir <dir> --label <evidence-file-stem> \
#     [--bridge-bin <bin>]           # default: bridge (PATH wrapper)
#     [--timeout-secs <n>]           # per-turn bound handed to bridge
#
# Exit codes: 0 transcript captured · 65 fail-closed · 1 bad-args.
# Machine line: "R2REVIEW ok=true transcript=<abs path> prompt=<abs path>" or
#               "R2REVIEW ok=false reason=<slug> detail=<...>".
set -uo pipefail

PROMPT_FILE=""
OUT_DIR=""
LABEL=""
BRIDGE_BIN="bridge"
TIMEOUT_SECS=600

fail() {
  echo "R2REVIEW ok=false reason=$1 detail=${2:-}"
  exit "${3:-65}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prompt-file)
      [[ $# -ge 2 && -n "$2" ]] || fail bad-args "--prompt-file requires a path" 1
      PROMPT_FILE="$2"; shift 2 ;;
    --out-dir)
      [[ $# -ge 2 && -n "$2" ]] || fail bad-args "--out-dir requires a path" 1
      OUT_DIR="$2"; shift 2 ;;
    --label)
      [[ $# -ge 2 && -n "$2" ]] || fail bad-args "--label requires a value" 1
      LABEL="$2"; shift 2 ;;
    --bridge-bin)
      [[ $# -ge 2 && -n "$2" ]] || fail bad-args "--bridge-bin requires a value" 1
      BRIDGE_BIN="$2"; shift 2 ;;
    --timeout-secs)
      [[ $# -ge 2 && "$2" == <-> && "$2" != 0 ]] || fail bad-args "--timeout-secs requires a positive integer" 1
      TIMEOUT_SECS="$2"; shift 2 ;;
    *)
      fail bad-args "unknown argument $1" 1 ;;
  esac
done

[[ -n "$PROMPT_FILE" ]] || fail bad-args "--prompt-file is required" 1
[[ -n "$OUT_DIR" ]] || fail bad-args "--out-dir is required" 1
[[ -n "$LABEL" ]] || fail bad-args "--label is required" 1
# Label becomes an evidence filename — reject separators/expansion hazards.
[[ "$LABEL" =~ '^[A-Za-z0-9._-]+$' ]] || fail bad-args "label must match [A-Za-z0-9._-]+" 1
[[ -s "$PROMPT_FILE" ]] || fail bad-args "prompt file missing or empty: $PROMPT_FILE" 1

mkdir -p "$OUT_DIR" || fail bad-args "cannot create out dir: $OUT_DIR" 1
# 2 — absolutise: bridge resolves --out-dir against the caller's cwd.
OUT_DIR="${OUT_DIR:A}"

PROMPT_SENT="$OUT_DIR/$LABEL-prompt.md"
STDERR_LOG="$OUT_DIR/$LABEL-stderr.log"

# No run may inherit prior evidence under the same label.
rm -f "$PROMPT_SENT" "$STDERR_LOG" \
  || fail bad-args "cannot clear prior evidence under $OUT_DIR/$LABEL-*" 1

# 1 — the prompt body is captured with a CHECKED substitution: an unchecked
# `cat` failure would leave a contract-block-only prompt, which could earn a
# schema-valid verdict over a review task nobody sent.
PROMPT_BODY="$(cat "$PROMPT_FILE")" \
  || fail bad-args "cannot read prompt: $PROMPT_FILE" 1
[[ -n "$PROMPT_BODY" ]] || fail bad-args "prompt read empty: $PROMPT_FILE" 1

CONTRACT_BLOCK="---

STRUCTURED OUTPUT CONTRACT (appended by intake-r2-review.sh; supersedes ANY earlier instruction in this prompt about output format):

Begin your reply with the verdict object below, before any prose, in a single fenced json block. Nothing may precede it — no preamble, no summary, no heading.

\`\`\`json
{ \"reviewer\": \"codex-r2\", \"verdict\": \"GO\", \"objections\": [] }
\`\`\`

Rules:
- \"verdict\" is exactly \"GO\" or \"NO-GO\".
- For a GO verdict, objections MUST be an empty array.
- For a NO-GO verdict, objections MUST contain at least one item, each with field, a concrete blocking question, and raisedAt.
- raisedAt MUST be an ISO-8601 timestamp for when the objection was raised, never a source location or file path.
- Non-blocking notes, nits and observations belong ONLY in the prose after the block, never in objections. Anything you place in objections blocks the candidate from shipping.

After the block, write your review rationale as ordinary prose. Only the fenced object is read as your verdict; a verdict stated in prose alone is discarded and the candidate is parked unreviewed."

EFFECTIVE_PROMPT="$PROMPT_BODY

$CONTRACT_BLOCK"
print -r -- "$EFFECTIVE_PROMPT" > "$PROMPT_SENT" \
  || fail bad-args "cannot write effective prompt to $PROMPT_SENT" 1

# 3 — the review turn. bridge pins the reviewer to gpt-5.5 and bounds each turn
# itself; the marker it writes on stderr is the only proof a transcript exists.
"$BRIDGE_BIN" --mode codex-only "$EFFECTIVE_PROMPT" \
  --out-dir "$OUT_DIR" \
  --turn-timeout-seconds "$TIMEOUT_SECS" \
  < /dev/null > /dev/null 2> "$STDERR_LOG"
rc=$?

if [[ $rc -ne 0 ]]; then
  fail bridge-nonzero "rc=$rc (stderr preserved at $STDERR_LOG)"
fi

# `Wrote <path>` is bridge's stable final marker (bridge.py). Take the LAST one
# so a re-entrant run cannot resurrect an earlier line.
TRANSCRIPT="$(grep -a '^Wrote ' "$STDERR_LOG" 2>/dev/null | tail -1)"
TRANSCRIPT="${TRANSCRIPT#Wrote }"

if [[ -z "$TRANSCRIPT" ]]; then
  fail transcript-missing "bridge exited 0 without a 'Wrote <path>' marker (stderr at $STDERR_LOG)"
fi
[[ -s "$TRANSCRIPT" ]] \
  || fail transcript-missing "marker names a missing or empty transcript: $TRANSCRIPT"

echo "R2REVIEW ok=true transcript=$TRANSCRIPT prompt=$PROMPT_SENT"
exit 0
