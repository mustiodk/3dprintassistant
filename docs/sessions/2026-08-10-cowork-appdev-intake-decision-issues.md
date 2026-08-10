# 2026-08-10 — Cowork (appdev): decision-required parks had no way to reach the owner

## Durable context

- **`decision-required` was the only park class the pipeline could never clear itself** — `trigger:"owner"`, `bound:null` — and it had no owner-facing surface. The exit mechanism was complete (`intake-owner-decision.js` + `verify-reentry`); the *entrance* to the owner's attention did not exist. `intake-owner-questions.js` is hard-scoped by `OWNER_ATTESTABLE_FIELDS` to three fields and refuses everything else, which is correct — that is its safety property — so it was never going to cover a taxonomy call or a source conflict. The surface was built around a mechanism, not around the need.
- **Every automated check was green the whole time, because each was individually true.** Notify reported both parks; POSTRUN passed; the ledger recorded both; the runs exited 0. POSTRUN verified park *preservation* (sidecar, packet, branch) and never park *reachability*. The pipeline treats shipped-silently as a safety incident (the PD8 freeze rule) but had no equivalent notion of stuck-silently — that asymmetry is the real finding, not the missing script.
- **The fix's primary entry point is `sync`, not `open`, and that choice is load-bearing.** A sweep over the parked store cannot drift, backfills anything previously missed, and is a fixpoint. Per-candidate bookkeeping at park time is exactly the kind of step an LLM runner session skips silently — the same failure mode that produced the 2026-07-12 incident this pipeline's POSTRUN gate exists to catch.
- **The first version of the POSTRUN check was wrong in a way only running it revealed:** it re-queried GitHub live, putting a network call inside a fail-closed gate. A GitHub outage would then have failed the entire intake run — trading a notification gap for a pipeline outage, strictly the worse failure. Replaced with the receipt pattern check 2 already used for notify. **Do not put network calls in `intake-post-run-invariants.sh`**; leave a receipt and check its mtime.
- **`intake-run-wrapper.test.sh` had been red since the moment it was written** (2026-08-04, `6d12c14` — kickoff says `contract v3.0`, the assertion demanded `contract version 3.0`, both in the same commit). Six days unnoticed. This is direct N=2 evidence for the already-open "223 tests and no CI" work-queue item: nothing runs these suites, so a guard that never matched anything looked exactly like a guard that worked.
- **Shell-suite interpreters are mixed and it matters.** `scripts/*.test.sh` are a mix of `#!/usr/bin/env bash` and `#!/bin/zsh`, and several are not executable. Running a bash suite under `zsh` fails silently with **zero output and exit 1**, which reads exactly like a real failure. Invoke each with its own shebang (`./script`) or the shell its first line names — I burned a diagnostic cycle on a phantom `intake-sync-bootstrap` failure this way.

## What happened / Actions

1. **Cold start (Trigger C).** Sync-health gate tripped immediately: `3dprintassistant: behind:6`. Resolved by fast-forward before reading any local state, per the GitHub-first rule, then re-verified `current`.
2. **Diagnosis.** Traced both parks from the outcomes ledger → parked sidecars in the *automation* checkout (`~/.local/share/3dpa-intake/checkout/`, not the dev tree, whose state dir is stale since July) → `intake-owner-questions.js`'s `OWNER_ATTESTABLE_FIELDS` scope → the `decision-required` row in `intake-park-taxonomy.json`. Confirmed against GitHub that the only intake issues ever opened (#26, #27) were field questions. Cause validated before any edit.
3. **TDD.** Wrote `intake-decision-issue.test.js` first, confirmed RED (module absent), then implemented. 22 tests: sidecar collection, unsafe-id refusal, per-reason command guidance, fixpoint behaviour, label separation from the attestation parser, receipt shape.
4. **Wired + enforced.** Added the sweep to the kickoff stage order and as a contract bullet (v3.2), plus POSTRUN check 7 with fixture cases 32/33/34.
5. **Backfilled live.** Opened issues #28 (`ender3_s1_pro`) and #29 (`hi`); re-ran sync to confirm the fixpoint (`opened=0 existing=2`).
6. **Deployed + verified.** Fast-forwarded the automation checkout to `d35e317` and ran the real sweep there; receipt written with `existing:[28,29]`. Committed ≠ deployed, so this was checked in the environment the 12:00 LaunchAgent actually reads.

## Files touched

**Added**
- `scripts/intake-decision-issue.js`
- `scripts/intake-decision-issue.test.js`
- `../ai-operating-model/docs/findings/2026-08-10-park-taxonomy-had-a-terminal-class-with-no-notification-surface.md`
- `docs/sessions/2026-08-10-cowork-appdev-intake-decision-issues.md` (this file)

**Modified**
- `scripts/intake-run-kickoff.md` — stage order + contract bullet v3.2
- `scripts/intake-post-run-invariants.sh` — check 7 (receipt)
- `scripts/intake-post-run-invariants.test.sh` — receipt in `init_repo`, cases 32/33/34
- `scripts/intake-run-wrapper.test.sh` — receipt in both "good claude" stubs; stale contract token
- `docs/planning/ROADMAP.md`, `docs/sessions/INDEX.md`, `docs/sessions/NEXT-SESSION.md`
- `../ai-operating-model/docs/findings/INDEX.md`

## Commits

| sha | what |
|---|---|
| [`ac71231`](https://github.com/mustiodk/3dprintassistant/commit/ac71231) | `fix(intake): decision-required parks were unreachable — give them an issue` |
| [`ef7b67b`](https://github.com/mustiodk/3dprintassistant/commit/ef7b67b) | `fix(intake): prove the decision sweep ran by receipt, not a live gh query` |
| [`d35e317`](https://github.com/mustiodk/3dprintassistant/commit/d35e317) | `test(intake): the kickoff contract assertion has been red since it was written` |

One finding = one commit; the receipt refactor is a separate commit from the mechanism because `ac71231` was already pushed and its invariant was genuinely wrong, not merely improvable.

## Verification

- 22/22 new decision-issue tests green.
- Green: `intake-post-run-invariants`, `intake-run-preflight`, `intake-run-wrapper`, `intake-sync-bootstrap`, `intake-r1-structured-review`, `intake-r2-review`, `install-intake-runner`, all `intake-*.test.js`, `validate-data`, `validate-guardrails`, `export-audit` (0 FAIL).
- **Pre-existing and untouched:** `workshop-store`, `workshop-tuning`, `workshop-tuning-rules`, `state-codec` fail identically at clean HEAD (verified by stashing). Browser-side, unrelated to intake — flagged below, not fixed.
- Live: sweep is a fixpoint against the real repo; receipt present in the automation checkout at `d35e317`.

## Open questions / Follow-up

- **Two printers are now waiting on owner decisions.** [#29](https://github.com/mustiodk/3dprintassistant/issues/29) `hi` — Creality calls it "Hi Series"; no catalog sibling matches, so establishing the label is a taxonomy call. [#28](https://github.com/mustiodk/3dprintassistant/issues/28) `ender3_s1_pro` — Creality's own manual (150 mm/s) contradicts Creality's own store page (160 mm/s); the manual value matches the shipped `ender_3_s1` sibling exactly.
- **`workshop-*` + `state-codec` suites are red on `main`** and were before this session. Not investigated. Worth a bounded pass — four red suites are four guards nobody is getting.
- **The no-CI item just got its second concrete instance** (`../planning/ROADMAP.md` Active Work Queue, finding `2026-08-01-wrap-up-checks-session-bookkeeping-not-project-capability.md`). A guard red from birth for six days, plus four suites red on `main`, is the exact failure the proposed workflow catches. Recommend promoting it.
- **Md-hygiene sweep:** protocol-file drift `diff -u CLAUDE.md AGENTS.md` clean; findings INDEX↔files parity clean (0 orphans, verified programmatically); no stray `</content>` tags in session-created files; no secrets; no orphan root stubs. No action needed.
- **VBM ledger (verbatim, end of session):**

  ```
  verify-before-mutate ledger: 6 flags (0 resolved_same_turn, 0 resolved_late,
    6 unresolved_by_session_end), 0 destructive-core, 14 unclassified, 0 generated-write
  note: gate on unresolved_by_session_end; resolved_late = timing-health;
    resolved = not premise-proved (spec M1)
    - [unresolved_by_session_end] Edit 3dprintassistant/scripts/intake-post-run-invariants.sh (edit)
    - [unresolved_by_session_end] Edit 3dprintassistant/scripts/intake-post-run-invariants.test.sh (edit)
    - [unresolved_by_session_end] Edit ai-operating-model/docs/findings/INDEX.md (edit)
    - [unresolved_by_session_end] Edit 3dprintassistant/docs/sessions/INDEX.md (edit)
    - [unresolved_by_session_end] Write 3dprintassistant/docs/sessions/NEXT-SESSION.md (write_existing)
    - [unresolved_by_session_end] Edit ~/.claude/.../memory/MEMORY.md (edit)
  ```

  **Controller's account — the owner's read of this list is the measurement, not mine.** Five of the six were verified in the SAME turn by a Bash call with the outcome stated inline (`grep -n 'STATE_DIR'` for the invariants script; anchor-uniqueness + entry-link parity for both INDEXes; marker/structure + `git diff --stat` for NEXT-SESSION; pointer-target `ls` + full index parity for MEMORY.md). None was credited. That is a clean recurrence of the already-queued [`2026-07-28-vbm-resolution-detection-misses-bash-verification.md`](../../../ai-operating-model/docs/findings/2026-07-28-vbm-resolution-detection-misses-bash-verification.md) (R2b — bounded Bash-verification credit), same shape as its 8-flag/0-credited observation, so no new finding.

  **One is a genuine miss, not a detection gap:** flag 2 (`intake-post-run-invariants.test.sh`), where I cited a `grep` from an *earlier* turn instead of re-verifying in the same turn. The ledger was right to refuse it, and I corrected the habit for the four flags that followed. The premises were sound in every case — the gate behaves as specified and all suites are green — but resolved-rate is a discipline metric, never premise-proof.

  Worth noting for the R2b design: the MEMORY.md verification also caught **my own checker being wrong** (a `tr -d '](' ` that left the trailing paren, reporting all 29 pointers broken including one I had just `ls`-confirmed). A verification step that can fail loudly is doing its job; that is an argument for crediting Bash verification, not against it.

## Next session

Nothing is blocked on code. The pipeline is fixed, deployed, and its next scheduled run (12:00) will sweep automatically. The open work is owner decisions on #28/#29, then the CI item.
