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
meta="$(cat "$OUT_DIR/test-c1-metadata.json")"
assert_contains "$meta" '"structuredOutputPresent": false' "c1 metadata structuredOutputPresent=false"
assert_contains "$meta" '"failReason": "structured-output-missing"' "c1 metadata failReason recorded"

# --- case 2: silent empty stdout, exit 0 (file-path-arg CLI shape) ----------
stub=$(make_stub c2 'exit 0')
run_sut "$stub" c2
assert_rc "$RC" 65 "c2 empty stdout exits 65"
assert_contains "$OUT" "reason=empty-envelope" "c2 reason is empty-envelope"
meta="$(cat "$OUT_DIR/test-c2-metadata.json")"
assert_contains "$meta" '"failReason": "empty-envelope"' "c2 failure metadata written"

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
meta="$(cat "$OUT_DIR/test-c5-metadata.json")"
assert_contains "$meta" '"structuredOutputPresent": true' "c5 metadata structuredOutputPresent=true"
assert_contains "$meta" '"contractValid": false' "c5 metadata contractValid=false"

# --- case 6: schema transported INLINE, not as a path (own run, not c3's) ----
stub=$(make_stub c6 'cat <<'"'"'ENV'"'"'
{"type":"result","subtype":"success","is_error":false,"num_turns":1,"session_id":"11111111-2222-4333-8444-999999999999","result":"","structured_output":{"reviewer":"claude-opus-r1","verdict":"GO","objections":[]}}
ENV
exit 0')
run_sut "$stub" c6
assert_rc "$RC" 0 "c6 run exits 0"
if [[ ! -s "$TMP_ROOT/argv-c6.log" ]]; then
  ko "c6 argv log captured"
fi
schema_arg="$(python3 - "$TMP_ROOT/argv-c6.log" <<'PY'
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

# --- case 11: is_error=true with a valid structured GO is NEVER trusted -------
stub=$(make_stub c11 'cat <<'"'"'ENV'"'"'
{"type":"result","subtype":"success","is_error":true,"num_turns":1,"session_id":"11111111-2222-4333-8444-aaaaaaaaaaaa","result":"","structured_output":{"reviewer":"claude-opus-r1","verdict":"GO","objections":[]}}
ENV
exit 0')
run_sut "$stub" c11
assert_rc "$RC" 65 "c11 is_error=true exits 65"
assert_contains "$OUT" "reason=envelope-is-error" "c11 reason is envelope-is-error"

# --- case 12: structured_output explicitly null -------------------------------
stub=$(make_stub c12 'cat <<'"'"'ENV'"'"'
{"type":"result","subtype":"success","is_error":false,"num_turns":1,"session_id":"11111111-2222-4333-8444-bbbbbbbbbbbb","result":"prose","structured_output":null}
ENV
exit 0')
run_sut "$stub" c12
assert_rc "$RC" 65 "c12 null structured_output exits 65"
assert_contains "$OUT" "reason=structured-output-missing" "c12 reason is structured-output-missing"

# --- case 13: non-success subtype ----------------------------------------------
stub=$(make_stub c13 'cat <<'"'"'ENV'"'"'
{"type":"result","subtype":"error_max_turns","is_error":false,"num_turns":40,"session_id":"11111111-2222-4333-8444-cccccccccccc","result":""}
ENV
exit 0')
run_sut "$stub" c13
assert_rc "$RC" 65 "c13 non-success subtype exits 65"
assert_contains "$OUT" "reason=envelope-subtype" "c13 reason is envelope-subtype"

# --- case 14: whitespace-only stdout -------------------------------------------
stub=$(make_stub c14 'printf "  \n  "
exit 0')
run_sut "$stub" c14
assert_rc "$RC" 65 "c14 whitespace-only stdout exits 65"
assert_contains "$OUT" "reason=envelope-not-json" "c14 reason is envelope-not-json"

# --- case 15: missing session_id → metadata sessionId null ---------------------
stub=$(make_stub c15 'cat <<'"'"'ENV'"'"'
{"type":"result","subtype":"success","is_error":false,"num_turns":1,"result":"","structured_output":{"reviewer":"claude-opus-r1","verdict":"GO","objections":[]}}
ENV
exit 0')
run_sut "$stub" c15
assert_rc "$RC" 0 "c15 missing session_id still valid"
meta="$(cat "$OUT_DIR/test-c15-metadata.json")"
assert_contains "$meta" '"sessionId": null' "c15 metadata sessionId is null"

# --- case 16: stale prior-run evidence can never survive into a new run --------
stale_dir="$TMP_ROOT/out-c16"
mkdir -p "$stale_dir"
print -r -- '{"reviewer":"claude-opus-r1","verdict":"GO","objections":[]}' > "$stale_dir/test-c16-structured.json"
print -r -- '{"label":"test-c16","structuredOutputPresent":true,"contractValid":true,"sessionId":null,"cliExitCode":0,"failReason":null}' > "$stale_dir/test-c16-metadata.json"
stub=$(make_stub c16 'cat <<'"'"'ENV'"'"'
{"type":"result","subtype":"success","is_error":false,"num_turns":1,"session_id":"11111111-2222-4333-8444-dddddddddddd","result":"","structured_output":{"reviewer":"claude-opus-r1","verdict":"NO-GO","objections":[{"field":"max_speed","question":"source?","raisedAt":"2026-07-13T10:08:15Z"}]}}
ENV
exit 0')
run_sut "$stub" c16
assert_rc "$RC" 0 "c16 fresh run exits 0"
assert_contains "$OUT" "verdict=NO-GO" "c16 verdict comes from THIS run, not stale GO"
assert_contains "$(cat "$TMP_ROOT/out-c16/test-c16-structured.json")" '"verdict": "NO-GO"' "c16 structured file rewritten by this run"

# stale evidence must also be cleared when the schema gate rejects pre-spend
print -r -- '{"contractValid":true}' > "$TMP_ROOT/out-c16b-stale.json"
mkdir -p "$TMP_ROOT/out-c16b"
print -r -- '{"label":"test-c16b","structuredOutputPresent":true,"contractValid":true}' > "$TMP_ROOT/out-c16b/test-c16b-metadata.json"
print -r -- '{"reviewer":"claude-opus-r1","verdict":"GO","objections":[]}' > "$TMP_ROOT/out-c16b/test-c16b-structured.json"
BAD_SCHEMA2="$TMP_ROOT/bad-schema2.json"
print -r -- '"/tmp/some/path.json"' > "$BAD_SCHEMA2"
stub=$(make_stub c16b 'exit 0')
export ARGV_LOG="$TMP_ROOT/argv-c16b.log"
OUT="$("$SUT" --prompt-file "$PROMPT" --schema-file "$BAD_SCHEMA2" \
  --out-dir "$TMP_ROOT/out-c16b" --label test-c16b --claude-bin "$stub" 2>&1)"
RC=$?
assert_rc "$RC" 1 "c16b quoted-path schema rejected pre-spend"
assert_contains "$OUT" "reason=schema-not-json" "c16b reason is schema-not-json"
if [[ ! -f "$TMP_ROOT/argv-c16b.log" ]]; then
  ok "c16b stub never invoked (no review turn spent on quoted path)"
else
  ko "c16b stub never invoked (argv log exists)"
fi
if [[ ! -f "$TMP_ROOT/out-c16b/test-c16b-structured.json" ]]; then
  ok "c16b stale structured evidence cleared"
else
  ko "c16b stale structured evidence cleared"
fi
assert_contains "$(cat "$TMP_ROOT/out-c16b/test-c16b-metadata.json")" '"failReason": "schema-not-json"' "c16b metadata reflects the gate failure"

# --- case 17: hostile session_id bytes cannot inject metadata keys -------------
stub=$(make_stub c17 'cat <<'"'"'ENV'"'"'
{"type":"result","subtype":"success","is_error":false,"num_turns":1,"session_id":"x\",\"pwn\":true,\"y\":\"z","result":"","structured_output":{"reviewer":"claude-opus-r1","verdict":"GO","objections":[]}}
ENV
exit 0')
run_sut "$stub" c17
assert_rc "$RC" 0 "c17 hostile session_id still valid run"
if python3 -c "
import json,sys
d=json.load(open('$TMP_ROOT/out-c17/test-c17-metadata.json'))
assert set(d.keys()) == {'label','structuredOutputPresent','contractValid','sessionId','cliExitCode','failReason'}, d.keys()
assert 'pwn' not in d
assert d['sessionId'] == 'x\",\"pwn\":true,\"y\":\"z'.replace(chr(92)+'\"','\"')
" 2>/dev/null; then
  ok "c17 metadata parses with exact keys, no injection"
else
  ko "c17 metadata parses with exact keys, no injection"
fi

# --- case 18: validator crash is validator-error, not contract-invalid ---------
FAKE_REPO="$TMP_ROOT/fake-repo"
mkdir -p "$FAKE_REPO/scripts"
print -r -- 'throw new Error("validator exploded");' > "$FAKE_REPO/scripts/validate-reviewer-output.js"
stub=$(make_stub c18 'cat <<'"'"'ENV'"'"'
{"type":"result","subtype":"success","is_error":false,"num_turns":1,"session_id":"11111111-2222-4333-8444-eeeeeeeeeeee","result":"","structured_output":{"reviewer":"claude-opus-r1","verdict":"GO","objections":[]}}
ENV
exit 0')
export ARGV_LOG="$TMP_ROOT/argv-c18.log"
OUT="$("$SUT" --prompt-file "$PROMPT" --schema-file "$SCHEMA" \
  --out-dir "$TMP_ROOT/out-c18" --label test-c18 --claude-bin "$stub" \
  --repo "$FAKE_REPO" 2>&1)"
RC=$?
assert_rc "$RC" 65 "c18 validator crash exits 65"
assert_contains "$OUT" "reason=validator-error" "c18 reason is validator-error"

# --- case 19: label with path separator rejected --------------------------------
OUT="$("$SUT" --prompt-file "$PROMPT" --schema-file "$SCHEMA" \
  --out-dir "$TMP_ROOT/out-c19" --label "../escape" --claude-bin /bin/false 2>&1)"
RC=$?
assert_rc "$RC" 1 "c19 label with separator exits 1"
assert_contains "$OUT" "label must match" "c19 label rejected by charset rule"

# --- case 20: hung CLI is bounded by --timeout-secs ------------------------------
stub=$(make_stub c20 'sleep 30
exit 0')
export ARGV_LOG="$TMP_ROOT/argv-c20.log"
OUT="$("$SUT" --prompt-file "$PROMPT" --schema-file "$SCHEMA" \
  --out-dir "$TMP_ROOT/out-c20" --label test-c20 --claude-bin "$stub" \
  --timeout-secs 1 2>&1)"
RC=$?
assert_rc "$RC" 65 "c20 hung CLI exits 65"
assert_contains "$OUT" "reason=review-timeout" "c20 reason is review-timeout"

echo
echo "PASS=$PASS FAIL=$FAIL"
[[ $FAIL -eq 0 ]] || exit 1
exit 0
