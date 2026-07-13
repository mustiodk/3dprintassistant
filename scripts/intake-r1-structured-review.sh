#!/bin/zsh
# intake-r1-structured-review.sh — fail-closed boundary for a structured
# Reviewer-1 turn run through the Claude CLI (`claude -p --output-format json
# --json-schema`), born from the 2026-07-13 centauri_carbon_2 PD5 incident.
#
# WHY: `--json-schema` accepts the schema as an INLINE JSON STRING only. Before
# CLI v2.1.205 a non-compilable schema value — e.g. a FILE PATH — was silently
# ignored: the CLI exited 0 with a normal envelope whose `result` is free prose
# and NO `structured_output` field (docs: code.claude.com/docs/en/errors.md,
# "Before v2.1.205, an invalid schema produced unstructured output with no
# error"). On 2026-07-13 the retry-2 R1 turn passed the schema as a file path,
# so the exact long review ran UNCONSTRAINED and returned prose plus an
# improvised `{reviewer:"reviewer-1",decision:"GO"}` object; the short smoke
# had inlined its schema and therefore did not predict this. On CLI 2.1.173 a
# file-path schema can instead yield rc=0 with EMPTY stdout. Both shapes are
# locked in intake-r1-structured-review.test.sh.
#
# WHAT THIS SCRIPT GUARANTEES:
#   1. The schema file must parse as JSON BEFORE any review turn is spent.
#   2. The schema is transported INLINE (content, never the path).
#   3. The envelope must be non-empty, parseable JSON, subtype=success.
#   4. `structured_output` must be present and pass validate-reviewer-output.js
#      (optionally pinned to an exact reviewer id). Prose is NEVER parsed for a
#      verdict — a missing/invalid structured object fails closed (exit 65),
#      which the runner contract maps to `auto-parked:review-unavailable`.
#   5. Raw envelope + structured object + metadata are preserved under
#      --out-dir before the script returns.
#
# Usage:
#   intake-r1-structured-review.sh \
#     --prompt-file <path> --schema-file <path> \
#     --out-dir <dir> --label <evidence-file-stem> \
#     [--claude-bin <bin>]           # default: claude-opus-4-8 (PATH wrapper)
#     [--require-reviewer <id>]      # e.g. claude-opus-r1
#     [--repo <path>]                # default: this script's repo root
#
# Exit codes: 0 valid structured verdict captured · 65 fail-closed · 1 bad-args.
# Machine line: "R1REVIEW ok=true verdict=<GO|NO-GO> ..." or
#               "R1REVIEW ok=false reason=<slug> detail=<...>"

SCRIPT_DIR="${0:A:h}"
REPO="${SCRIPT_DIR:h}"
PROMPT_FILE=""
SCHEMA_FILE=""
OUT_DIR=""
LABEL=""
CLAUDE_BIN="claude-opus-4-8"
REQUIRE_REVIEWER=""

fail() {
  echo "R1REVIEW ok=false reason=$1 detail=${2:-}"
  exit "${3:-65}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prompt-file)
      [[ $# -ge 2 && -n "$2" ]] || fail bad-args "--prompt-file requires a path" 1
      PROMPT_FILE="$2"; shift 2 ;;
    --schema-file)
      [[ $# -ge 2 && -n "$2" ]] || fail bad-args "--schema-file requires a path" 1
      SCHEMA_FILE="$2"; shift 2 ;;
    --out-dir)
      [[ $# -ge 2 && -n "$2" ]] || fail bad-args "--out-dir requires a path" 1
      OUT_DIR="$2"; shift 2 ;;
    --label)
      [[ $# -ge 2 && -n "$2" ]] || fail bad-args "--label requires a value" 1
      LABEL="$2"; shift 2 ;;
    --claude-bin)
      [[ $# -ge 2 && -n "$2" ]] || fail bad-args "--claude-bin requires a value" 1
      CLAUDE_BIN="$2"; shift 2 ;;
    --require-reviewer)
      [[ $# -ge 2 && -n "$2" ]] || fail bad-args "--require-reviewer requires a value" 1
      REQUIRE_REVIEWER="$2"; shift 2 ;;
    --repo)
      [[ $# -ge 2 && -n "$2" ]] || fail bad-args "--repo requires a path" 1
      REPO="$2"; shift 2 ;;
    *)
      fail bad-args "unknown argument $1" 1 ;;
  esac
done

[[ -n "$PROMPT_FILE" ]] || fail bad-args "--prompt-file is required" 1
[[ -n "$SCHEMA_FILE" ]] || fail bad-args "--schema-file is required" 1
[[ -n "$OUT_DIR" ]] || fail bad-args "--out-dir is required" 1
[[ -n "$LABEL" ]] || fail bad-args "--label is required" 1
[[ -s "$PROMPT_FILE" ]] || fail bad-args "prompt file missing or empty: $PROMPT_FILE" 1
[[ -f "$SCHEMA_FILE" ]] || fail bad-args "schema file missing: $SCHEMA_FILE" 1

VALIDATOR="$REPO/scripts/validate-reviewer-output.js"
[[ -f "$VALIDATOR" ]] || fail bad-args "validate-reviewer-output.js not found at $VALIDATOR" 1

# 1 — schema must parse as JSON BEFORE any review turn is spent (a path or
# typo here is exactly the silent-degradation trigger this script exists for).
if ! node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$SCHEMA_FILE" 2>/dev/null; then
  fail schema-not-json "$SCHEMA_FILE" 1
fi
SCHEMA_CONTENT="$(cat "$SCHEMA_FILE")"

mkdir -p "$OUT_DIR" || fail bad-args "cannot create out dir: $OUT_DIR" 1
ENVELOPE="$OUT_DIR/$LABEL-envelope.json"
STDERR_LOG="$OUT_DIR/$LABEL-stderr.log"
STRUCTURED="$OUT_DIR/$LABEL-structured.json"
METADATA="$OUT_DIR/$LABEL-metadata.json"

write_metadata() { # structuredOutputPresent contractValid sessionId exitCode reason
  cat > "$METADATA" <<EOF
{
  "label": "$LABEL",
  "structuredOutputPresent": $1,
  "contractValid": $2,
  "sessionId": ${3:-null},
  "cliExitCode": $4,
  "failReason": ${5:-null}
}
EOF
}

# 2 — the review turn: schema INLINE, stdin closed, envelope captured whole.
"$CLAUDE_BIN" -p "$(cat "$PROMPT_FILE")" \
  --output-format json \
  --json-schema "$SCHEMA_CONTENT" \
  < /dev/null > "$ENVELOPE" 2> "$STDERR_LOG"
rc=$?

if [[ $rc -ne 0 ]]; then
  write_metadata false false null $rc '"review-cli-nonzero"'
  fail review-cli-nonzero "rc=$rc stderr=$(head -c 120 "$STDERR_LOG" | tr '\n' ' ')"
fi

# 3 — exit 0 is NOT success: the envelope must be non-empty…
if [[ ! -s "$ENVELOPE" ]]; then
  write_metadata false false null $rc '"empty-envelope"'
  fail empty-envelope "CLI exited 0 with empty stdout (known file-path --json-schema shape)"
fi

# …parseable JSON…
if ! node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$ENVELOPE" 2>/dev/null; then
  write_metadata false false null $rc '"envelope-not-json"'
  fail envelope-not-json "$(head -c 120 "$ENVELOPE" | tr '\n' ' ')"
fi

# …and a successful result envelope.
read -r subtype session_id has_structured <<< "$(node -e '
  const fs = require("fs");
  const d = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const sid = typeof d.session_id === "string" ? d.session_id : "";
  console.log(`${d.subtype ?? ""} ${sid || "-"} ${Object.prototype.hasOwnProperty.call(d, "structured_output") && d.structured_output !== null}`);
' "$ENVELOPE")"

session_json="null"
[[ "$session_id" != "-" && -n "$session_id" ]] && session_json="\"$session_id\""

if [[ "$subtype" != "success" ]]; then
  write_metadata false false "$session_json" $rc '"envelope-subtype"'
  fail envelope-subtype "subtype=$subtype"
fi

# 4 — the incident signature: no structured_output ⇒ the schema never bound.
# NEVER fall back to parsing prose out of `result`.
if [[ "$has_structured" != "true" ]]; then
  write_metadata false false "$session_json" $rc '"structured-output-missing"'
  fail structured-output-missing "envelope has no structured_output; prose is not a verdict"
fi

node -e '
  const fs = require("fs");
  const d = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  fs.writeFileSync(process.argv[2], JSON.stringify(d.structured_output, null, 2) + "\n");
' "$ENVELOPE" "$STRUCTURED"

# 5 — contract validation through the SAME validator the runner uses.
validation="$(node -e '
  const fs = require("fs");
  const { validateReviewerOutput } = require(process.argv[1]);
  const output = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const requiredReviewer = process.argv[3] || "";
  const res = validateReviewerOutput(output);
  if (res.ok && requiredReviewer && output.reviewer !== requiredReviewer) {
    res.ok = false;
    res.errors.push(`reviewer must be ${requiredReviewer}, got ${output.reviewer}`);
  }
  console.log(res.ok ? `OK ${output.verdict}` : `INVALID ${res.errors.join("; ")}`);
' "$VALIDATOR" "$STRUCTURED" "$REQUIRE_REVIEWER")"

if [[ "$validation" != OK\ * ]]; then
  write_metadata true false "$session_json" $rc '"contract-invalid"'
  fail contract-invalid "${validation#INVALID }"
fi

verdict="${validation#OK }"
write_metadata true true "$session_json" $rc null

echo "R1REVIEW ok=true verdict=$verdict structured=$STRUCTURED metadata=$METADATA"
exit 0
