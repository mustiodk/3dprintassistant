# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for a fresh Claude session **on the
mac-mini**.
**Last updated:** 2026-07-13 (Air session, post-fix). The R1 structured-output
failure is root-caused and the fail-closed boundary is MERGED (web PR #24,
`c0da52a`). `centauri_carbon_2` remains parked (`review-split` /
`decision-required`) and not shipped. What remains is exactly ONE
owner-authorized evidence/PD5 continuation, which must run on the mac-mini
(parked sidecar, `~/.local/bin/claude-opus-4-8`, LaunchAgent, and preserved
evidence are machine-local there — the Air session could not and did not run
it).

Root cause (proven; details in
`2026-07-13-cowork-appdev-r1-boundary-rootcause.md`): `claude -p --json-schema`
accepts the schema ONLY as an inline JSON string; retry-2 passed the FILE PATH
`claude-opus-r1-schema.json`, and CLI <2.1.205 silently degrades an invalid
schema to unstructured output (exit 0, prose, no `structured_output`). The new
boundary script transports the schema inline and fails closed on every
non-contract shape.

---

Copy everything between the markers into Claude.

>>> START >>>

3dpa cold start on the mac-mini. Run the single authorized evidence/PD5
continuation for the parked `centauri_carbon_2` candidate, using the merged R1
boundary script.

Read in order:

1. `~/dev/Claude/Projects/CLAUDE.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md` (top 🔒 banner)
5. `3dprintassistant/docs/sessions/INDEX.md`
6. These logs in full:
   - `3dprintassistant/docs/sessions/2026-07-13-cowork-appdev-r1-boundary-rootcause.md`
   - `3dprintassistant/docs/sessions/2026-07-13-cowork-appdev-centauri-pd5-handover.md`
7. This `NEXT-SESSION.md`.
8. `ai-operating-model/docs/agents/intake-pipeline-runner.md`
9. `scripts/intake-r1-structured-review.sh` header (the merged boundary).

Verify current state before mutation:

```bash
cd ~/dev/Claude/Projects
~/.claude/claude-sync.sh verify-parents
~/.claude/claude-sync.sh push-children --dry
git -C 3dprintassistant fetch --all --prune
git -C 3dprintassistant status --short --branch
git -C 3dprintassistant rev-parse HEAD origin/main
```

Expected starting state (mac-mini):

- Web clean `main` at ≥ `c0da52a` (PR #24 merge), equal to `origin/main` —
  pull ff-only if behind.
- Preserved branch `intake/centauri_carbon_2` at `f39d7f9`; remote checkpoint
  tags peel to `be49fea` and `8695583`.
- Parked sidecar `scripts/.intake-runner-state/parked/centauri_carbon_2/parked.json`
  intact; lock/freeze absent; LaunchAgent loaded idle; latest wrapper log has
  `POSTRUN ok=true`.
- `~/.local/bin/claude-opus-4-8` present and its test green.
- iOS clean, ahead N under the push gate (6 on the mac-mini at last count) —
  do not touch or push it.
- Also verify (carried item): whether the retry-2 Discord report is actually
  visible in the channel — `posted=true` was transport metadata only.

Continuation procedure (this is the ONE authorized run — owner instruction
recorded 2026-07-13; no Scout, no full LaunchAgent replay, no new research
lane, no same-run retry):

1. Rebase check: candidate `f39d7f9` must still sit on current `main`; if
   `main` moved, rebase, re-run ALL validators + diff guards (max 2
   re-entries, then `auto-parked:main-moved`).
2. Re-run the pre-review gates on the branch: evidence gate
   (`node scripts/validate-candidate-evidence.js <packet> --printers-json data/printers.json`),
   `intake-diff-guards --base main`, validate-data, picker dry-run,
   walkthrough harness, matrix audit, overlay validator, `git diff --check`.
   Any failure parks without spending a review turn.
3. **Fresh R1 through the merged boundary** (never a bare `claude -p`):

   ```bash
   zsh scripts/intake-r1-structured-review.sh \
     --prompt-file <fresh R1 prompt file> \
     --schema-file scripts/.intake-runner-state/bridge-reviews/claude-opus-r1-schema.json \
     --out-dir scripts/.intake-runner-state/bridge-reviews \
     --label pd5-centauri_carbon_2-r1-continuation-$(date +%Y%m%d) \
     --claude-bin claude-opus-4-8 \
     --require-reviewer claude-opus-r1
   ```

   The script fails closed (exit 65 → park `review-unavailable`) on any
   non-contract shape; `R1REVIEW ok=true verdict=…` is the only valid output.
4. Only after a contract-valid R1 `GO`: spend Reviewer 2 via the pinned form
   `bridge --health` then
   `bridge --mode codex-only "<concrete review over main...intake/centauri_carbon_2 diff>" --out-dir <ignored bridge-reviews dir>`
   (fallback `codex exec -s read-only -m gpt-5.5`). Validate with
   `validate-reviewer-output.js`.
5. Classify the multiset exactly per contract v2.1: `{GO,GO}` → recheck
   remote main → ff-merge → push → live verify overlay+picker → local-only
   iOS mirror → atomic custody commit → notify. Anything else → park with
   exact structured outputs, notify, stop. No provenance custody on any
   parked path.
6. Semantic terminal verification: structured reviews on disk,
   merge-or-park correctness, fresh `last-run-report.md`, actual Discord
   receipt (owner-visible, not `posted=true`), lock removed, clean `main`,
   remote `main` ground truth, `POSTRUN ok=true`. If POSTRUN fails, copy
   `last-run-session.log` before any further run.

Hard stop rules unchanged: never ship around PD5; never touch engine.js,
app.js, validators, or iOS outside a legitimate `{GO,GO}` merge path; never
retry a NO-GO in-run; preserve candidate branch, checkpoint tags, ignored
state, and raw review evidence until the incident is closed.

After the intake terminal report, stop and report. Next product sequence is
the reviewed iOS 1.0.7 issue-fix train, then the separate 1.0.8 tip-jar train.
My 3DPA remains parked until explicit owner command.

Standing rules:

- Show the progress bar on multi-step work.
- ROADMAP is truth; read it fully before status claims.
- One finding = one commit.
- iOS push gate remains active.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
