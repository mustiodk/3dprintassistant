# 2026-07-13 — Cowork (appdev): R1 structured-output boundary root-caused + fixed (Air session)

## Durable context

- **Machine caveat:** the owner's mac-mini kickoff prompt ran on the MacBook
  Air (hostname-verified). All mac-mini-local evidence (ignored
  `.intake-runner-state/`, `~/.local/bin/claude-opus-4-8`, parked sidecar,
  LaunchAgent, `POSTRUN` log) was unreachable — no ssh path exists. Everything
  machine-independent was completed here; **the single authorized evidence/PD5
  continuation did NOT run and remains available for the mac-mini.**
- **Root cause (proven, not inferred):** `claude -p --json-schema` accepts the
  schema **only as an inline JSON string**. Retry-2 passed the FILE PATH
  `claude-opus-r1-schema.json`. Official Claude Code errors reference: *before
  CLI v2.1.205 an invalid schema produced unstructured output with no error* —
  exit 0, `subtype:success`, prose `result`, no `structured_output`. That is
  the exact incident envelope; the model improvised
  `{reviewer:"reviewer-1",decision:"GO"}` because it never received a schema.
  The short smoke inlined its schema, which is why it passed — the K4
  finding's "non-representative probe" at mechanism level. On CLI 2.1.173 the
  same mistake yields rc=0 + EMPTY stdout instead; both shapes are test-locked.
  Prompt scale was irrelevant (inline schema succeeded at 12.6KB and 50.6KB
  with the real candidate diff from checkpoint tag `8695583`).
- **Fix merged (web PR #24, merge `c0da52a`):**
  `scripts/intake-r1-structured-review.sh` + `intake-r1-structured-review-parse.js`
  now own any structured Reviewer-1 CLI turn: pre-spend JSON *object* schema
  gate, inline transport, stale-evidence clearing, bounded turn, fail-closed
  envelope checks (non-empty / JSON / subtype / is_error / structured_output),
  validation via `validate-reviewer-output.js` (+ `--require-reviewer`),
  injection-safe metadata. Exit 65 on every failure → `review-unavailable`
  park. Prose is never parsed for a verdict.
- **Acceptance:** 58-assertion stub suite (both incident replays) green; all
  sibling intake suites green; N=4 live exact-scale proofs (50.6KB
  real-candidate prompt, clean-env Opus 4.8, CLI 2.1.173) returned
  contract-valid `structured_output` every run. **Probe verdicts were
  discarded** — no review verdict is claimed; the candidate's review state is
  unchanged (`review-split` / `decision-required`).
- Nested `claude -p` on a Cowork/CC machine 401s unless run with bridge-style
  clean env + `CLAUDE_CODE_OAUTH_TOKEN` from `~/.config/claude-code/oauth.env`
  (existing `reference_bridge_nested_session_auth_401` pattern; the launchd
  mac-mini path is not nested and only needs its normal oauth.env).
- No engine.js / app.js / validator / iOS / contract / CLI-version change.
  Candidate branch, checkpoint tags, and all preserved evidence untouched.

## What happened / Actions

1. Cold start with GitHub-first gate: pulled web (33 behind → `5bca273`) and
   bridge (2 behind); verified checkpoint tags peel to `be49fea`/`8695583`.
2. Discovered the machine mismatch (Air, not mac-mini); mac-mini unreachable.
3. Reproduced the boundary empirically: file-path schema fails at every scale
   (2.1.173: rc=0, empty stdout); inline schema succeeds at every scale
   including the real 4.3KB candidate diff embedded in 12.6KB/50.6KB prompts
   with authentic validator output. Docs agent confirmed the pre-2.1.205
   silent-degradation behavior with citations.
4. TDD RED → GREEN on the new boundary (26 assertions), commit `8abc527`.
5. Hostile sub-agent review: NO-GO, 9 findings (2 P0 fail-open: stale-evidence
   reuse, `is_error:true` acceptance). All patched — parse boundary moved into
   one node process, injection-safe metadata, schema-object gate, label
   charset, `--timeout-secs` with detached watchdog (a live hang found during
   testing: an orphaned watchdog `sleep` held the caller's captured stdout).
   Suite 58/58; commit `75a4750`.
6. N=4 exact-scale proofs through the boundary script (runs 1–3 pre-patch,
   run 4 on the patched script): `structuredOutputPresent=true`,
   `contractValid=true` all four.
7. PR #24 merged to web `main` (`c0da52a`); local main clean/synced.
8. ai-om finding
   `2026-07-13-claude-json-schema-smoke-did-not-predict-pd5-output` closed as
   `mitigated` with the proof table; INDEX + regenerated `status.json`
   (generator tests green) committed as `158b549` on the parent repo.

## Files touched

- `scripts/intake-r1-structured-review.sh` (new)
- `scripts/intake-r1-structured-review-parse.js` (new)
- `scripts/intake-r1-structured-review.test.sh` (new)
- `docs/sessions/2026-07-13-cowork-appdev-r1-boundary-rootcause.md` (this log)
- `docs/sessions/INDEX.md`, `docs/sessions/NEXT-SESSION.md`,
  `docs/planning/ROADMAP.md` (handoff touch)
- ai-om: finding file + `docs/findings/INDEX.md` + `docs/findings/status.json`

## Commits

- Web: `8abc527` (boundary + tests, TDD), `75a4750` (hostile-review patch set),
  PR #24 merge `c0da52a`.
- Parent (ai-om): `158b549` (finding closed, status.json regenerated).

## Open questions / Follow-up

- **Mac-mini, next session (the ONE authorized continuation):** pull web
  `main` (≥ `c0da52a`), then run the evidence/PD5 continuation using
  `scripts/intake-r1-structured-review.sh` for R1 (see NEXT-SESSION.md for the
  exact recipe). Reviewer 2 stays `bridge --mode codex-only` per the pinned
  form. Any invalid output, NO-GO, split, auth or post-run failure parks and
  stops.
- Discord receipt of the retry-2 report remains **UNVERIFIED** (mac-mini/owner
  check; `posted=true` is transport metadata only).
- Optional owner decision (not authorized here): upgrading Claude CLI to
  ≥2.1.205 would make invalid-schema values fail loudly at the CLI layer too;
  the merged boundary already protects either way.
- Expected-state deltas vs the kickoff checklist were machine differences, not
  drift: iOS ahead 3 on the Air clone (6 is the mac-mini count), no
  LaunchAgent/lock here, `POSTRUN ok=true` unverifiable from the Air
  (`UNVERIFIED:` from this machine).
- Md-hygiene: no new stubs/secrets/orphans; this wrap adds its INDEX line; the
  pre-existing ROADMAP drift flagged 2026-07-12 (export banner + overlay
  version row) remains queued for a focused cleanup — not touched during an
  incident wrap.

## Next session

On the **mac-mini**: run the regenerated `NEXT-SESSION.md` kickoff — it now
contains the post-fix continuation recipe (fresh R1 via the merged boundary
script, then R2 via bridge, then v2.1 classification). After the intake
terminal report: iOS 1.0.7 issue-fix train, then the 1.0.8 tip-jar train; My
3DPA stays parked pending explicit owner command.
