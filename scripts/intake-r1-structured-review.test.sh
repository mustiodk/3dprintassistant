#!/bin/zsh
# intake-r1-structured-review.test.sh — deterministic regression tests for the
# R1 structured-output boundary (2026-07-13 centauri_carbon_2 incident).
#
# Every case drives intake-r1-structured-review.sh against a STUB claude bin
# that replays an exact observed failure shape — no live model call, fully
# deterministic. The two incident signatures locked here:
#   (a) exit 0 + envelope WITHOUT `structured_output` (mac-mini retry-2 shape);
#   (b) exit 0 + EMPTY stdout (CLI 2.1.173 shape when --json-schema is handed a
#       FILE PATH instead of inline schema JSON — reproduced 2026-07-13 on the
#       MacBook Air).
# Plus the schema-transport contract: the boundary must pass the schema CONTENT
# inline; a stub records argv and the test asserts the --json-schema argument
# parses as JSON identical to the schema file.

SCRIPT_DIR="${0:A:h}"
SUT="$SCRIPT_DIR/intake-r1-structured-review.sh"

PASS=0
FAIL=0

TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

ok() { PASS=$((PASS+1)); echo "  ✓ $1"; }
ko() { FAIL=$((FAIL+1)); echo "  ✗ $1"; }

assert_contains() { # haystack needle label
  if [[ "$1" == *"$2"* ]]; then ok "$3"; else ko "$3 (missing: $2 | got: ${1:0:160})"; fi
}

assert_rc() { # actual expected label
  if [[ "$1" == "$2" ]]; then ok "$3"; else ko "$3 (rc=$1, want $2)"; fi
}

# --- fixtures -----------------------------------------------------------------

SCHEMA="$TMP_ROOT/schema.json"
cat > "$SCHEMA" <<'EOF'
{
  "type": "object",
  "additionalProperties": false,
  "required": ["reviewer", "verdict", "objections"],
  "properties": {
    "reviewer": { "type": "string", "const": "claude-opus-r1" },
    "verdict": { "type": "string", "enum": ["GO", "NO-GO"] },
    "objections": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["field", "question", "raisedAt"],
        "properties": {
          "field": { "type": "string", "minLength": 1 },
          "question": { "type": "string", "minLength": 1 },
          "raisedAt": { "type": "string", "minLength": 20 }
        }
      }
    }
  }
}
EOF

PROMPT="$TMP_ROOT/prompt.md"
print -r -- "hostile review prompt body (content irrelevant to the boundary)" > "$PROMPT"

# make_stub <name> <body...> — creates a stub claude bin that records argv,
# then behaves per body. $ARGV_LOG is exported for the stub to append to.
make_stub() {
  local name="$1"; shift
  local stub="$TMP_ROOT/$name"
  {
    echo '#!/bin/zsh'
    echo 'printf "%s\0" "$@" > "$ARGV_LOG"'
    print -r -- "$@"
  } > "$stub"
  chmod +x "$stub"
  echo "$stub"
}

run_sut() { # stub label -> sets RC, OUT
  local stub="$1" label="$2"
  local out_dir="$TMP_ROOT/out-$label"
  mkdir -p "$out_dir"
  export ARGV_LOG="$TMP_ROOT/argv-$label.log"
  OUT="$(ARGV_LOG="$ARGV_LOG" "$SUT" \
    --prompt-file "$PROMPT" --schema-file "$SCHEMA" \
    --out-dir "$out_dir" --label "test-$label" \
    --claude-bin "$stub" --require-reviewer claude-opus-r1 2>&1)"
  RC=$?
  OUT_DIR="$out_dir"
}

echo "== intake-r1-structured-review boundary tests =="

# --- case 1: incident replay — envelope present, structured_output ABSENT ----
stub=$(make_stub c1 'cat <<'"'"'ENV'"'"'
{"type":"result","subtype":"success","is_error":false,"num_turns":1,"session_id":"58ad771b-0000-4444-9a3e-000000000000","result":"Deterministic review follows.\n\n{\"reviewer\": \"reviewer-1\", \"decision\": \"GO\"}\n\nProse rationale…"}
ENV
exit 0')
run_sut "$stub" c1
assert_rc "$RC" 65 "c1 incident replay exits 65"
assert_contains "$OUT" "reason=structured-output-missing" "c1 reason is structured-output-missing"
assert_contains "$OUT" "R1REVIEW ok=false" "c1 machine line fails closed"

# --- case 2: silent empty stdout, exit 0 (file-path-arg CLI shape) ----------
stub=$(make_stub c2 'exit 0')
run_sut "$stub" c2
assert_rc "$RC" 65 "c2 empty stdout exits 65"
assert_contains "$OUT" "reason=empty-envelope" "c2 reason is empty-envelope"

# --- case 3: valid GO --------------------------------------------------------
stub=$(make_stub c3 'cat <<'"'"'ENV'"'"'
{"type":"result","subtype":"success","is_error":false,"num_turns":1,"session_id":"11111111-2222-4333-8444-555555555555","result":"","structured_output":{"reviewer":"claude-opus-r1","verdict":"GO","objections":[]}}
ENV
exit 0')
run_sut "$stub" c3
assert_rc "$RC" 0 "c3 valid GO exits 0"
assert_contains "$OUT" "R1REVIEW ok=true verdict=GO" "c3 machine line carries verdict"
if [[ -s "$OUT_DIR/test-c3-structured.json" && -s "$OUT_DIR/test-c3-metadata.json" && -s "$OUT_DIR/test-c3-envelope.json" ]]; then
  ok "c3 evidence files written"
else
  ko "c3 evidence files written"
fi
meta="$(cat "$OUT_DIR/test-c3-metadata.json")"
assert_contains "$meta" '"structuredOutputPresent": true' "c3 metadata structuredOutputPresent=true"
assert_contains "$meta" '"contractValid": true' "c3 metadata contractValid=true"
assert_contains "$meta" '"sessionId": "11111111-2222-4333-8444-555555555555"' "c3 metadata sessionId recorded"

# --- case 4: valid NO-GO with objection --------------------------------------
stub=$(make_stub c4 'cat <<'"'"'ENV'"'"'
{"type":"result","subtype":"success","is_error":false,"num_turns":1,"session_id":"11111111-2222-4333-8444-666666666666","result":"","structured_output":{"reviewer":"claude-opus-r1","verdict":"NO-GO","objections":[{"field":"max_speed","question":"source?","raisedAt":"2026-07-13T10:08:15Z"}]}}
ENV
exit 0')
run_sut "$stub" c4
assert_rc "$RC" 0 "c4 valid NO-GO exits 0"
assert_contains "$OUT" "R1REVIEW ok=true verdict=NO-GO" "c4 machine line carries NO-GO"

# --- case 5: structured_output present but contract-invalid (incident field
# names: reviewer-1/decision) ---------------------------------------------------
stub=$(make_stub c5 'cat <<'"'"'ENV'"'"'
{"type":"result","subtype":"success","is_error":false,"num_turns":1,"session_id":"11111111-2222-4333-8444-777777777777","result":"","structured_output":{"reviewer":"reviewer-1","decision":"GO"}}
ENV
exit 0')
run_sut "$stub" c5
assert_rc "$RC" 65 "c5 contract-invalid exits 65"
assert_contains "$OUT" "reason=contract-invalid" "c5 reason is contract-invalid"

# --- case 6: schema transported INLINE, not as a path ------------------------
schema_arg="$(python3 - "$TMP_ROOT/argv-c3.log" <<'PY'
import sys
args = open(sys.argv[1]).read().split('\0')
for i, a in enumerate(args):
    if a == '--json-schema' and i + 1 < len(args):
        sys.stdout.write(args[i+1]); break
PY
)"
if python3 -c "import json,sys; json.loads(sys.argv[1])" "$schema_arg" 2>/dev/null; then
  ok "c6 --json-schema argument is inline JSON (not a path)"
else
  ko "c6 --json-schema argument is inline JSON (got: ${schema_arg:0:80})"
fi
if [[ "$schema_arg" == "$(cat "$SCHEMA")" ]]; then
  ok "c6 inline schema equals schema file content"
else
  ko "c6 inline schema equals schema file content"
fi

# --- case 7: CLI nonzero exit -------------------------------------------------
stub=$(make_stub c7 'echo "API Error: 401" >&2
exit 1')
run_sut "$stub" c7
assert_rc "$RC" 65 "c7 cli nonzero exits 65"
assert_contains "$OUT" "reason=review-cli-nonzero" "c7 reason is review-cli-nonzero"

# --- case 8: schema file not JSON → fails BEFORE any model spend -------------
BAD_SCHEMA="$TMP_ROOT/bad-schema.json"
echo "not json at all" > "$BAD_SCHEMA"
stub=$(make_stub c8 'exit 0')
export ARGV_LOG="$TMP_ROOT/argv-c8.log"
OUT="$("$SUT" --prompt-file "$PROMPT" --schema-file "$BAD_SCHEMA" \
  --out-dir "$TMP_ROOT/out-c8" --label test-c8 --claude-bin "$stub" 2>&1)"
RC=$?
assert_rc "$RC" 1 "c8 non-JSON schema exits 1 (bad-args)"
assert_contains "$OUT" "reason=schema-not-json" "c8 reason is schema-not-json"
if [[ ! -f "$TMP_ROOT/argv-c8.log" ]]; then
  ok "c8 stub never invoked (no review turn spent)"
else
  ko "c8 stub never invoked (argv log exists)"
fi

# --- case 9: reviewer id mismatch under --require-reviewer --------------------
stub=$(make_stub c9 'cat <<'"'"'ENV'"'"'
{"type":"result","subtype":"success","is_error":false,"num_turns":1,"session_id":"11111111-2222-4333-8444-888888888888","result":"","structured_output":{"reviewer":"bridge-codex-r2","verdict":"GO","objections":[]}}
ENV
exit 0')
run_sut "$stub" c9
assert_rc "$RC" 65 "c9 reviewer mismatch exits 65"
assert_contains "$OUT" "reason=contract-invalid" "c9 reason is contract-invalid"

# --- case 10: envelope is not JSON --------------------------------------------
stub=$(make_stub c10 'echo "plain prose, no envelope"
exit 0')
run_sut "$stub" c10
assert_rc "$RC" 65 "c10 non-JSON envelope exits 65"
assert_contains "$OUT" "reason=envelope-not-json" "c10 reason is envelope-not-json"

echo
echo "PASS=$PASS FAIL=$FAIL"
[[ $FAIL -eq 0 ]] || exit 1
exit 0
