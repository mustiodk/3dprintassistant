#!/bin/zsh
# intake-r2-review.test.sh — regression tests for the Reviewer-2 prompt
# boundary (2026-08-07 kobra_2_neo park).
#
# Every case drives intake-r2-review.sh against a STUB bridge that records its
# argv and replays an exact observed shape — no live model call, deterministic.
#
# Signatures locked here:
#   (a) 2026-08-07 kobra_2_neo: the runner hand-wrote the R2 prompt and omitted
#       the structured-output instruction, so Codex answered in prose, the
#       verdict was unreadable, and the candidate parked `review-unavailable`.
#       The boundary must append its canonical block to EVERY prompt.
#   (b) reference_bridge_outdir_cwd_relative: bridge resolves --out-dir against
#       the CALLER'S cwd, so a drifted cwd silently writes the transcript
#       somewhere nobody reads. The boundary must hand bridge an absolute path.
#   (c) bridge prints its "Wrote <path>" marker on STDERR. A run with no such
#       marker produced no transcript and must fail closed, not report success.

SCRIPT_DIR="${0:A:h}"
SUT="$SCRIPT_DIR/intake-r2-review.sh"

PASS=0
FAIL=0

TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

ok() { PASS=$((PASS+1)); echo "  ✓ $1"; }
ko() { FAIL=$((FAIL+1)); echo "  ✗ $1"; }

assert_contains() { # haystack needle label
  if [[ "$1" == *"$2"* ]]; then ok "$3"; else ko "$3 (missing: $2 | got: ${1:0:200})"; fi
}

assert_not_contains() { # haystack needle label
  if [[ "$1" != *"$2"* ]]; then ok "$3"; else ko "$3 (unexpectedly present: $2)"; fi
}

assert_rc() { # actual expected label
  if [[ "$1" == "$2" ]]; then ok "$3"; else ko "$3 (rc=$1, want $2)"; fi
}

# --- stub bridge --------------------------------------------------------------
# Records argv one-per-line, then replays a chosen shape. Behaviour is switched
# by env so a single stub covers every case.
#   STUB_MODE=ok        -> writes a transcript + the "Wrote <path>" stderr marker
#   STUB_MODE=no-marker -> exits 0 having printed nothing (silent no-op shape)
#   STUB_MODE=fail      -> exits 3

make_stub() { # path
  cat > "$1" <<'STUB'
#!/bin/zsh
printf '%s\n' "$@" > "$STUB_ARGV"
out_dir=""
prev=""
for a in "$@"; do
  [[ "$prev" == "--out-dir" ]] && out_dir="$a"
  prev="$a"
done
case "${STUB_MODE:-ok}" in
  fail) exit 3 ;;
  no-marker) exit 0 ;;
  *)
    mkdir -p "$out_dir"
    print -r -- "# stub transcript" > "$out_dir/bridge-stub.md"
    print -u2 -r -- "Wrote $out_dir/bridge-stub.md"
    exit 0 ;;
esac
STUB
  chmod +x "$1"
}

STUB_BRIDGE="$TMP_ROOT/bridge-stub"
make_stub "$STUB_BRIDGE"
export STUB_ARGV="$TMP_ROOT/argv.txt"

PROMPT="$TMP_ROOT/r2-prompt.md"
print -r -- "Review the main...intake/kobra_2_neo diff for shippability." > "$PROMPT"

OUT="$TMP_ROOT/out"
mkdir -p "$OUT"

echo "intake-r2-review.sh"

# --- 1. canonical block is appended to every prompt ----------------------------
echo "\n[1] appends the canonical structured-output block"
STUB_MODE=ok out="$("$SUT" \
  --prompt-file "$PROMPT" --out-dir "$OUT" --label r2-t1 \
  --bridge-bin "$STUB_BRIDGE" 2>&1)"
rc=$?
assert_rc "$rc" 0 "exits 0 on a clean run"
assert_contains "$out" "R2REVIEW ok=true" "emits the ok status line"

task_arg="$(grep -A0 -m1 'Review the main' "$STUB_ARGV")"
argv_all="$(cat "$STUB_ARGV")"
assert_contains "$argv_all" "Review the main...intake/kobra_2_neo diff" "review task reaches bridge"
assert_contains "$argv_all" "STRUCTURED OUTPUT CONTRACT" "canonical block reaches bridge"
assert_contains "$argv_all" '"verdict"' "block names the verdict field"
assert_contains "$argv_all" "before any prose" "block demands structured-result-first"
assert_contains "$argv_all" "--mode" "invokes bridge with a mode"
assert_contains "$argv_all" "codex-only" "pins reviewer 2 to codex-only"

# effective prompt preserved as evidence
if [[ -s "$OUT/r2-t1-prompt.md" ]]; then
  ok "preserves the effective prompt as evidence"
  ev="$(cat "$OUT/r2-t1-prompt.md")"
  assert_contains "$ev" "STRUCTURED OUTPUT CONTRACT" "evidence carries the appended block"
  assert_contains "$ev" "Review the main...intake/kobra_2_neo diff" "evidence carries the review task"
else
  ko "preserves the effective prompt as evidence"
fi

# --- 2. relative --out-dir is absolutised before bridge sees it ----------------
echo "\n[2] hands bridge an ABSOLUTE out-dir (cwd-drift immunity)"
REL_ROOT="$TMP_ROOT/relcase"
mkdir -p "$REL_ROOT/nested"
(
  cd "$REL_ROOT" || exit 1
  STUB_MODE=ok "$SUT" --prompt-file "$PROMPT" --out-dir nested --label r2-t2 \
    --bridge-bin "$STUB_BRIDGE" >/dev/null 2>&1
)
outdir_seen="$(grep -A1 -m1 -- '--out-dir' "$STUB_ARGV" | tail -1)"
if [[ "$outdir_seen" == /* ]]; then
  ok "bridge received an absolute --out-dir ($outdir_seen)"
else
  ko "bridge received an absolute --out-dir (got: $outdir_seen)"
fi

# --- 3. no "Wrote" marker on stderr => fail closed ----------------------------
echo "\n[3] a run that produced no transcript fails closed"
out="$(STUB_MODE=no-marker "$SUT" \
  --prompt-file "$PROMPT" --out-dir "$OUT" --label r2-t3 \
  --bridge-bin "$STUB_BRIDGE" 2>&1)"
rc=$?
assert_rc "$rc" 65 "exits 65 (runner maps to review-unavailable)"
assert_contains "$out" "R2REVIEW ok=false" "emits the fail-closed status line"
assert_contains "$out" "transcript-missing" "names the reason"
assert_not_contains "$out" "ok=true" "never reports success"

# --- 4. non-zero bridge exit => fail closed -----------------------------------
echo "\n[4] a non-zero bridge exit fails closed"
out="$(STUB_MODE=fail "$SUT" \
  --prompt-file "$PROMPT" --out-dir "$OUT" --label r2-t4 \
  --bridge-bin "$STUB_BRIDGE" 2>&1)"
rc=$?
assert_rc "$rc" 65 "exits 65"
assert_contains "$out" "R2REVIEW ok=false" "emits the fail-closed status line"
assert_contains "$out" "bridge-nonzero" "names the reason"

# --- 5. argument hygiene ------------------------------------------------------
echo "\n[5] argument hygiene"
out="$("$SUT" --out-dir "$OUT" --label r2-t5 --bridge-bin "$STUB_BRIDGE" 2>&1)"
assert_rc "$?" 1 "missing --prompt-file is a bad-args error"
assert_contains "$out" "R2REVIEW ok=false" "bad-args still emits a status line"

EMPTY="$TMP_ROOT/empty.md"
: > "$EMPTY"
out="$("$SUT" --prompt-file "$EMPTY" --out-dir "$OUT" --label r2-t6 \
  --bridge-bin "$STUB_BRIDGE" 2>&1)"
assert_rc "$?" 1 "an empty prompt file is rejected before any paid turn"
assert_contains "$out" "R2REVIEW ok=false" "empty prompt emits a status line"

out="$("$SUT" --prompt-file "$PROMPT" --out-dir "$OUT" --label 'bad label/..' \
  --bridge-bin "$STUB_BRIDGE" 2>&1)"
assert_rc "$?" 1 "a label with path separators is rejected"

# --- 6. the block supersedes a conflicting instruction in the prompt ----------
echo "\n[6] the boundary owns the last word on output format"
CONFLICT="$TMP_ROOT/conflict.md"
print -r -- "Review the diff. Reply in plain prose only; do not output JSON." > "$CONFLICT"
STUB_MODE=ok "$SUT" --prompt-file "$CONFLICT" --out-dir "$OUT" --label r2-t7 \
  --bridge-bin "$STUB_BRIDGE" >/dev/null 2>&1
ev="$(cat "$OUT/r2-t7-prompt.md" 2>/dev/null)"
assert_contains "$ev" "supersedes" "the appended block claims supersession"
if [[ "${ev##*do not output JSON}" == *"STRUCTURED OUTPUT CONTRACT"* ]]; then
  ok "the block is appended AFTER the conflicting instruction"
else
  ko "the block is appended AFTER the conflicting instruction"
fi

# --- summary ------------------------------------------------------------------
echo "\n${PASS} passed, ${FAIL} failed"
[[ $FAIL -eq 0 ]]
