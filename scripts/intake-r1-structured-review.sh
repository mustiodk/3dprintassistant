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
#   1. The schema file must parse as a JSON OBJECT before any review turn is
#      spent (a quoted path is valid JSON but not a schema — rejected too).
#   2. The schema is transported INLINE (content, never the path) after an
#      R1-specific compatibility transform removes constraints Claude Code
#      2.1.175 silently rejects. validate-reviewer-output.js re-enforces them.
#   3. Stale evidence from a previous run under the same label is removed
#      before the turn, so no failure mode can surface prior-run evidence.
#   4. Envelope parsing, shape checks (non-empty, JSON, subtype=success,
#      is_error=false, structured_output present), contract validation via
#      validate-reviewer-output.js, and metadata writes all run inside ONE
#      node process (intake-r1-structured-review-parse.js) — no shell
#      substitution can swallow an exit code or word-split a field. Prose is
#      NEVER parsed for a verdict; every failure exits 65, which the runner
#      maps to `auto-parked:review-unavailable`.
#   5. The paid turn is bounded by --timeout-secs (default 1800) — a hung CLI
#      becomes a deterministic `review-timeout` failure, not a held lock.
#   6. A canonical STRUCTURED OUTPUT CONTRACT block is ALWAYS appended to the
#      prompt before the turn (2026-07-13 second incident: the runner prompt's
#      "emit the structured result before prose" instruction steered the model
#      into printing the verdict as prose JSON. The block never describes the
#      mechanism as a visible tool: Claude Code applies the schema to the final
#      response automatically. The exact prompt and transported schema are
#      preserved as run evidence.
#
# Usage:
#   intake-r1-structured-review.sh \
#     --prompt-file <path> --schema-file <path> \
#     --out-dir <dir> --label <evidence-file-stem> \
#     [--claude-bin <bin>]           # default: claude-opus-4-8 (PATH wrapper)
#     [--require-reviewer <id>]      # e.g. claude-opus-r1
#     [--timeout-secs <n>]           # default 1800
#     [--repo <path>]                # default: this script's repo root
#
# Exit codes: 0 valid structured verdict captured · 65 fail-closed · 1 bad-args.
# Machine line: "R1REVIEW ok=true verdict=<GO|NO-GO> ..." or
#               "R1REVIEW ok=false reason=<slug> detail=<...>" (detail is
#               sanitized — never raw CLI/model bytes).

SCRIPT_DIR="${0:A:h}"
REPO="${SCRIPT_DIR:h}"
PROMPT_FILE=""
SCHEMA_FILE=""
OUT_DIR=""
LABEL=""
CLAUDE_BIN="claude-opus-4-8"
REQUIRE_REVIEWER=""
TIMEOUT_SECS=1800

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
    --timeout-secs)
      [[ $# -ge 2 && "$2" == <-> && "$2" != 0 ]] || fail bad-args "--timeout-secs requires a positive integer" 1
      TIMEOUT_SECS="$2"; shift 2 ;;
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
# Label becomes evidence filenames — reject separators/expansion hazards.
[[ "$LABEL" =~ '^[A-Za-z0-9._-]+$' ]] || fail bad-args "label must match [A-Za-z0-9._-]+" 1
[[ -s "$PROMPT_FILE" ]] || fail bad-args "prompt file missing or empty: $PROMPT_FILE" 1
[[ -f "$SCHEMA_FILE" ]] || fail bad-args "schema file missing: $SCHEMA_FILE" 1

VALIDATOR="$REPO/scripts/validate-reviewer-output.js"
PARSER="$SCRIPT_DIR/intake-r1-structured-review-parse.js"
[[ -f "$VALIDATOR" ]] || fail bad-args "validate-reviewer-output.js not found at $VALIDATOR" 1
[[ -f "$PARSER" ]] || fail bad-args "intake-r1-structured-review-parse.js not found at $PARSER" 1

mkdir -p "$OUT_DIR" || fail bad-args "cannot create out dir: $OUT_DIR" 1
ENVELOPE="$OUT_DIR/$LABEL-envelope.json"
STDERR_LOG="$OUT_DIR/$LABEL-stderr.log"
STRUCTURED="$OUT_DIR/$LABEL-structured.json"
METADATA="$OUT_DIR/$LABEL-metadata.json"
TIMEOUT_MARKER="$OUT_DIR/$LABEL-timeout.marker"
PROMPT_SENT="$OUT_DIR/$LABEL-prompt.md"
SCHEMA_SENT="$OUT_DIR/$LABEL-schema.json"

# 1 — no run (including one that fails the schema gate below) may inherit
# prior evidence under the same label: a stale structured/metadata pair
# surviving a later failure is a fail-open.
rm -f "$ENVELOPE" "$STDERR_LOG" "$STRUCTURED" "$METADATA" "$TIMEOUT_MARKER" \
  "$PROMPT_SENT" "$SCHEMA_SENT" \
  || fail bad-args "cannot clear prior evidence under $OUT_DIR/$LABEL-*" 1

# Pre-CLI failure evidence: injection-safe metadata via node argv (never
# shell interpolation into JSON).
write_fail_metadata() { # failReason cliExitCode-or-empty
  node -e '
    const fs = require("fs");
    const [out, label, cliExit, failReason] = process.argv.slice(1);
    fs.writeFileSync(out, JSON.stringify({
      label,
      structuredOutputPresent: false,
      contractValid: false,
      sessionId: null,
      cliExitCode: cliExit === "" ? null : Number(cliExit),
      failReason,
    }, null, 2) + "\n");
  ' "$METADATA" "$LABEL" "${2:-}" "$1" 2>/dev/null
}

# 2 — schema must parse as a JSON OBJECT before any review turn is spent.
# Claude Code <2.1.205 silently ignores schemas containing constraints such as
# `format`; the live mac-mini CLI is 2.1.175. Transport only the documented
# grammar-safe shape and let validate-reviewer-output.js enforce the stronger
# R1 contract after capture. This boundary is R1-specific, so weakening the
# transport never weakens the terminal gate.
SCHEMA_CONTENT="$(node - "$SCHEMA_FILE" <<'NODE'
const fs = require('fs');

const drop = new Set([
  '$schema', 'format', 'minLength', 'maxLength', 'minItems', 'maxItems',
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf',
  'oneOf', 'allOf', 'not', 'if', 'then', 'else',
]);

function compatible(value) {
  if (Array.isArray(value)) return value.map(compatible);
  if (!value || typeof value !== 'object') return value;
  const output = {};
  for (const [key, child] of Object.entries(value)) {
    if (!drop.has(key)) output[key] = compatible(child);
  }
  return output;
}

try {
  const parsed = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) process.exit(1);
  process.stdout.write(JSON.stringify(compatible(parsed)));
} catch (_) {
  process.exit(1);
}
NODE
)"
if [[ $? -ne 0 || -z "$SCHEMA_CONTENT" ]]; then
  write_fail_metadata schema-not-json ""
  fail schema-not-json "$SCHEMA_FILE is not a JSON schema object" 1
fi
print -r -- "$SCHEMA_CONTENT" > "$SCHEMA_SENT" \
  || { write_fail_metadata schema-evidence-write-failed ""; fail bad-args "cannot write transported schema to $SCHEMA_SENT" 1; }

# 2c — prompt-side conflict guard (2026-07-13 SECOND incident, run
# run-20260713T190102Z): the runner contract's reviewer instruction ("emit the
# structured result before prose") steered the model to print the verdict JSON
# as TEXT, so it never invoked the CLI's structured-output mechanism — the
# envelope carried prose with a plausible GO object and no `structured_output`,
# exactly like the file-path bug's shape but with the schema travelling inline.
# The boundary owns the last word on output format: a canonical trailing block
# is ALWAYS appended to the prompt, superseding any conflicting instruction,
# and the exact effective prompt is preserved as run evidence.
# The prompt body is captured with a CHECKED substitution (hostile-review
# finding: a `cat` failure inside a group redirect is swallowed by the
# succeeding prints, and a contract-block-only prompt could earn a schema-valid
# GO over a review task nobody sent). The CLI receives the same in-memory
# string that is preserved as evidence — never an unchecked re-read.
PROMPT_BODY="$(cat "$PROMPT_FILE")" \
  || { write_fail_metadata prompt-unreadable ""; fail bad-args "cannot read prompt: $PROMPT_FILE" 1; }
[[ -n "$PROMPT_BODY" ]] \
  || { write_fail_metadata prompt-unreadable ""; fail bad-args "prompt read empty: $PROMPT_FILE" 1; }
CONTRACT_BLOCK="---

STRUCTURED OUTPUT CONTRACT (appended by intake-r1-structured-review.sh; supersedes ANY earlier instruction in this prompt about output format):

Return your final verdict conforming to the JSON Schema requested by the Claude CLI. Claude Code applies that schema to your final response automatically. Do NOT search for or call a tool named StructuredOutput; no such visible tool is required. Do NOT write the verdict JSON object in your text response — not before your prose, not after it, and not in a code block. If an earlier instruction tells you to emit a structured result before prose or print JSON inline, IGNORE it.

The local Claude CLI cannot transport every semantic constraint, so obey these rules explicitly:
- For a GO verdict, objections MUST be an empty array.
- For a NO-GO verdict, objections MUST contain at least one item.
- Every objection must contain field, a concrete blocking question, and raisedAt. raisedAt MUST be an ISO-8601 timestamp for when the objection was raised, never a source location or file path.
- Non-blocking notes belong only in ordinary prose and MUST NOT appear in objections.

You may include concise review rationale as ordinary text, but only the envelope's structured_output field is authoritative."
EFFECTIVE_PROMPT="$PROMPT_BODY

$CONTRACT_BLOCK"
print -r -- "$EFFECTIVE_PROMPT" > "$PROMPT_SENT" \
  || { write_fail_metadata prompt-evidence-write-failed ""; fail bad-args "cannot write effective prompt to $PROMPT_SENT" 1; }

# 3 — the review turn: schema INLINE, stdin closed, envelope captured whole,
# bounded by a watchdog so a hung CLI cannot hold the runner lock forever.
"$CLAUDE_BIN" -p "$EFFECTIVE_PROMPT" \
  --output-format json \
  --json-schema "$SCHEMA_CONTENT" \
  < /dev/null > "$ENVELOPE" 2> "$STDERR_LOG" &
cli_pid=$!
# Watchdog fds are fully detached: an orphaned `sleep` must never hold a
# caller's captured stdout/stderr pipe open after this script exits.
(
  sleep "$TIMEOUT_SECS"
  if kill -0 "$cli_pid" 2>/dev/null; then
    : > "$TIMEOUT_MARKER"
    kill -TERM "$cli_pid" 2>/dev/null
  fi
) < /dev/null > /dev/null 2>&1 &!
watchdog_pid=$!
wait "$cli_pid"
rc=$?
# Kill the watchdog subshell AND its sleep child (negative pid = process
# group is not portable here; pkill by parent is).
kill "$watchdog_pid" 2>/dev/null
pkill -P "$watchdog_pid" 2>/dev/null

if [[ -f "$TIMEOUT_MARKER" ]]; then
  write_fail_metadata review-timeout "$rc"
  fail review-timeout "CLI exceeded ${TIMEOUT_SECS}s and was terminated"
fi

if [[ $rc -ne 0 ]]; then
  write_fail_metadata review-cli-nonzero "$rc"
  fail review-cli-nonzero "rc=$rc (stderr preserved at $STDERR_LOG)"
fi

# 4 — exit 0 is NOT success: the envelope must be non-empty…
if [[ ! -s "$ENVELOPE" ]]; then
  write_fail_metadata empty-envelope "$rc"
  fail empty-envelope "CLI exited 0 with empty stdout (known file-path --json-schema shape)"
fi

# 5 — …and everything downstream (JSON parse, subtype/is_error/structured_
# output checks, contract validation, metadata evidence) happens inside ONE
# node process whose exit code is checked — nothing is inferred from prose.
parse_line="$(node "$PARSER" "$ENVELOPE" "$STRUCTURED" "$METADATA" \
  "$VALIDATOR" "$REQUIRE_REVIEWER" "$LABEL" "$rc")"
parse_rc=$?

if [[ $parse_rc -ne 0 ]]; then
  case "$parse_line" in
    PARSE\ ok=false\ reason=*)
      reason_and_detail="${parse_line#PARSE ok=false reason=}"
      slug="${reason_and_detail%% *}"
      detail="${reason_and_detail#* detail=}"
      fail "$slug" "$detail" ;;
    *)
      fail parse-boundary-error "parser rc=$parse_rc with unexpected output" ;;
  esac
fi

case "$parse_line" in
  PARSE\ ok=true\ verdict=GO|PARSE\ ok=true\ verdict=NO-GO)
    verdict="${parse_line#PARSE ok=true verdict=}" ;;
  *)
    fail parse-boundary-error "parser rc=0 with unexpected output" ;;
esac

echo "R1REVIEW ok=true verdict=$verdict structured=$STRUCTURED metadata=$METADATA"
exit 0
