# 2026-07-16 — Cowork (appdev): intake parked-path root cause and production rerun

## Durable context

- The 2026-07-16 `web-dirty` preflight failure was a symptom of the previous
  run, not a preflight defect: `run-20260715T100124Z` called
  `writeParked('i7_i', sidecar)` although the raw API expected a file path, so
  it created an untracked repo-root file named `i7_i`.
- Web `104251c` makes the parked store own the canonical path through
  `writeParkedForCandidate(candidateId, sidecar)` and rejects relative or
  non-`parked.json` raw destinations before I/O. AI-OM `8151868` advances the
  runner contract to v2.4 with the exact helper call.
- The production rerun `run-20260716T201219Z` passed `PREFLIGHT` and `POSTRUN`,
  returned `0 shipped · 1 parked · 0 errored`, posted its notification, and
  left web `main` clean/equal to `origin/main` at custody `537cd14`.
- `i7_i` remains correctly parked as `decision-required / unverified-model /
  owner`; the rerun rediscovered and skipped it rather than laundering it into
  an automatic retry. Its original stray artifact is preserved byte-for-byte
  under ignored incident state with SHA-256 `c361fd14…`.
- The rerun found Snapmaker U1, completed official-source research, and parked
  it before branch creation as `decision-required / new-series-group / owner`.
  The candidate packet is preserved with SHA-256 `1979b40b…`; no printer data,
  overlay, or iOS catalog changed.

## What happened / Actions

1. Ran the 3dpa GitHub-first cold start. Web was clean/current except the
   untracked `i7_i`; iOS was clean and eight commits ahead under its push gate;
   Android was missing and stayed out of scope.
2. Preserved the stray artifact byte-for-byte under
   `scripts/.intake-runner-state/incidents/`, reconstructed the 2026-07-15
   headless transcript, and proved the exact unsafe writer call. The correct
   parked sidecar and candidate packet already existed and were not rewritten.
3. Used TDD to reproduce the bare-id write and relative-path write, then added
   the candidate-owned helper and raw path guard. Updated the scheduled kickoff
   and AI-OM runner contract v2.4.
4. Ran independent Claude hostile review. Verdict: **PASS — no MUST-FIX**.
   Accepted its two incident-relevant hardening suggestions (absolute raw paths
   and the exact literal incident call); left unrelated taint-path coverage out
   of this patch.
5. Fresh verification passed: `node --check`; parked-store **16/16**; taxonomy
   **11/11**; preflight harness; POSTRUN invariant harness; wrapper harness;
   and `git diff --check` in both repositories.
6. Committed/pushed web code + incident ledger and AI-OM contract, released the
   sync hold, then restarted `zsh scripts/intake-run-wrapper.sh` from clean
   `main`. The wrapper exited 0 with `PREFLIGHT ok=true` and
   `POSTRUN ok=true`; notifier metadata returned `posted=true` (transport result,
   not an independent visual read of Discord).
7. Verified the terminal state: web clean/current; no repo-root `i7_i`, lock,
   or autonomy freeze; both owner-gated parked sidecars and candidate artifacts
   present; iOS untouched and still eight commits ahead.

## Files touched (Modified / Deleted / Untracked)

### Tracked — 3dprintassistant

- `scripts/intake-parked-store.js`
- `scripts/intake-parked-store.test.js`
- `scripts/intake-run-kickoff.md`
- `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md`
- `scripts/printer-intake-outcomes.jsonl` (runner custody for U1)
- `docs/planning/ROADMAP.md`
- `docs/sessions/INDEX.md`
- `docs/sessions/NEXT-SESSION.md`
- `docs/sessions/2026-07-16-cowork-appdev-intake-parked-path-root-cause.md`

### Tracked — ai-operating-model

- `docs/agents/intake-pipeline-runner.md`
- `docs/findings/2026-07-16-headless-runner-guessed-parked-writer-path.md`
- `docs/findings/INDEX.md`
- `docs/agents/lesson-spotter-calibration.md`

### Ignored runtime/evidence state

- Removed the stray repo-root `i7_i` only after preserving its bytes at
  `scripts/.intake-runner-state/incidents/run-20260715T100124Z-stray-i7_i.json`.
- Created/refreshed U1 parked sidecar, candidate packet, last-run report/session
  output, watermark, and review evidence under ignored runner state.
- No printer catalog, overlay, engine, UI, or iOS files changed.

## Commits

- `104251c` — `fix(intake): guard parked sidecar destinations`
- `d1ba56a` — `docs(intake): record parked path incident close`
- `8151868` (ai-operating-model) — `fix(intake): codify candidate-owned park writes`
- `537cd14` — `chore(intake): custody u1 provenance (run-20260716T201219Z park: new-series-group)`
- `bf4a1dd` (ai-operating-model) — `docs(findings): capture headless parked-path mismatch`
- Wrap/tracking commit — this log, INDEX, ROADMAP, and NEXT-SESSION close.

## Open questions / Follow-up

- Owner input, optional: identify what the ambiguous `i7_i` / `i7! I` request
  was meant to name, or leave it parked indefinitely. Do not auto-retry it.
- Owner input, optional: approve a new Snapmaker U1 `series_group` (runner
  suggested `U Series`) before any U1 re-entry. Do not infer the taxonomy.
- The prior product sequence remains available: reviewed iOS 1.0.7, then the
  separate iOS 1.0.8 tip-jar train. Neither was started or pushed.
- Lesson/finding sweep: one K3 captured at
  `ai-operating-model/docs/findings/2026-07-16-headless-runner-guessed-parked-writer-path.md`.
  No K4 controller/tool override and no K1 reviewer disagreement surfaced.
- Md-hygiene: no root stub, untracked Markdown, secret, duplicate Markdown,
  stale ROADMAP, protocol drift, INDEX parity gap, or stray `</content>` tag.
- MCP hook: skipped; no MCP or connector behavior was in scope.
- Verify-before-mutate controller summary (verbatim):
  `verify-before-mutate ledger: no entries this session`. The child runner's
  own output recorded two staging-file deletion flags and verified both parked
  copies/SHA matches in-turn.
- Memory sweep: no external memory update proposed; the durable project and
  cross-project lessons are already in the gate ledger, session log, contract,
  and finding.
- Vault sweep: nothing durable to propagate; this is an operational runner/API
  lesson already captured in its authoritative repositories.

## Next session

Run a 3dpa cold start and verify the terminal incident/rerun state. Then ask the
owner which lane to take: Snapmaker U1 taxonomy decision, clarification of the
ambiguous `i7_i` request, or return to the reviewed iOS 1.0.7 release plan. Do
not automatically rerun either parked candidate and do not push iOS outside its
TestFlight-ready gate.
