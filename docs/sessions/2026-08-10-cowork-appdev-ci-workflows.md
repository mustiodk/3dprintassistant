# 2026-08-10 — Cowork (appdev): CI for web + iOS, and what it found in its first hour

## Durable context

- **macOS bash 3.2 does not apply `set -e` to a failing `[[ ]]`.** Verified
  directly with the suites' own preamble: `[[ 0 != 0 ]]` runs to the end and
  exits 0, while `false`, `[ 0 -ne 0 ]` and `test 0 -ne 0` all abort. There are
  **69** bare `[[ ]]` assertions across the seven `scripts/*.test.sh` suites, and
  until this session they had only ever run on macOS — so they were decorative.
  They enforce now, on Linux, in CI. **A green local run of those suites is
  weaker evidence than a green CI run**, which inverts the usual trust order.
  Finding: [`2026-08-10-macos-bash-3.2-does-not-enforce-set-e-on-double-bracket.md`](../../../ai-operating-model/docs/findings/2026-08-10-macos-bash-3.2-does-not-enforce-set-e-on-double-bracket.md).
- **The four red suites were one root cause, not four bugs.** `32ef0f0`
  (2026-07-18, push consent) added `"type": "module"` to the ROOT package.json
  for the Worker/vitest suites. That reclassifies every root `.js` as ESM, where
  `module` is undefined, so the browser scripts' trailing `module.exports` became
  dead code and `require()` returned `{}`. Red for 23 days. `scripts/package.json`
  already pinned `{"type":"commonjs"}`; the root files were never covered.
  Renaming them to `.cjs` is not available — `index.html` loads them by name.
- **The repo's test files are NOT uniform — four execution tiers**, and the naive
  shapes are all wrong here. `find … | node $f` reports 9 false failures (the
  `functions/api/push/*.test.mjs` suites import vitest). Shell globs miss nested
  suites (`scripts/lib/*.test.js`; 14 of 15 `*.test.mjs` are nested). `bash $f`
  over the shell suites is wrong — mixed bash/zsh shebangs, and a bash suite run
  under zsh fails with **zero output and exit 1**, indistinguishable from a real
  failure. CI therefore uses `git ls-files` selectors everywhere and asks vitest
  itself which files it claims.
- **iOS bundled `data/` deliberately lags web, so a byte-identical data gate
  would be red by design.** Bundled iOS carries 92 printers against web's 95;
  `kobra_2_neo`, `adventurer_3` and `ender_3_s1` are overlay-delivered with the
  bundled mirror deferred to the next binary train. Only `engine.js` is strictly
  identical (sha256 verified both sides). The mirror gate covers engine.js only,
  and the reasoning is recorded in the workflow so a future session does not
  "fix" the omission.
- **The mirror gate lives in the iOS repo, not web, and that direction is
  forced**: `mustiodk/3dprintassistant` is PUBLIC (unauthenticated fetch works),
  `3dprintassistant-ios` is PRIVATE. iOS→web needs no token; web→iOS would.

## What happened / Actions

1. **Cold start (Trigger C).** Health gate tripped twice: `3dprintassistant-ios:
   behind:2` (fast-forwarded) and `claude-sync: behind:59` with a wedged
   `stash pop` conflict (resolved to upstream, 59 pulled, owner-approved). A
   third problem the health line **could not see**: the web checkout was parked
   on `codex/feedback-diagnostics-v2`, which was current with its own upstream,
   while local `main` was **63 commits behind**. The ROADMAP and NEXT-SESSION
   read first were the 9-day-stale feature-branch copies; the authoritative ones
   on `origin/main` said something entirely different (no task locked; the
   Feedback Diagnostics v2 lock had been superseded).
2. **Owner chose the CI item** (ROADMAP Active Work Queue), overriding its
   written scope line "(c) leave iOS CI alone" to include iOS, and directed
   inspiration from the dania / cph-curtain workflows.
3. **Triaged the red suites first**, per the ROADMAP's own instruction. Four red,
   one root cause (above). Fixed with a shared `load-browser-script.js` that
   evaluates the raw source the way a browser does — the pattern
   `state-codec.test.js` already used for `engine.js`.
4. **Built web CI** (6 steps + a separate drift job) and **iOS CI** (ubuntu
   mirror gate + macos-26 unit job), dry-ran every step's real logic locally
   under `bash -e`.
5. **Three review layers, in order:** local dry-run → `bridge --mode codex-only`
   (NO-GO, 3 P1) → hostile subagent (NO-GO, 2 more P1). All findings applied,
   one commit each.
6. **Pushed the branch and ran it for real** — which failed, four times, on
   things no review had raised. Iterated to green, then fast-forwarded `main`.

## Files touched

**Added (web)**
- `.github/workflows/ci.yml`
- `scripts/load-browser-script.js`
- `scripts/browser-globals.test.js`

**Modified (web)**
- `scripts/state-codec.test.js`, `workshop-store.test.js`, `workshop-tuning.test.js`, `workshop-tuning-rules.test.js`
- `scripts/intake-post-run-invariants.test.sh`, `intake-sync-bootstrap.test.sh`
- `scripts/install-intake-runner.sh`, `install-intake-runner.test.sh`, `intake-run-wrapper.sh`, `intake-run-preflight.sh`, `intake-sync-bootstrap.sh` (BSD/GNU `stat` dispatch)
- mode-only: `intake-post-run-invariants.test.sh`, `intake-r2-review.test.sh`, `intake-run-preflight.test.sh`, `intake-run-wrapper.test.sh` (`chmod +x`)

**Added (iOS)**
- `.github/workflows/ci.yml`, `scripts/ci-select-simulator.py`

**Added (ai-om)** — 3 findings + INDEX

## Commits

**Web — 14, merged to `main` at `657d9f5`, CI green:**

| sha | what |
|---|---|
| `a62465e` | four suites were unreachable from their own source files |
| `5568195` | 4 of 7 shell suites were not executable |
| `b34df44` | run the 54 test files that nothing was running |
| `874d27b` | postrun invariants suite was intermittently red on a clock tick |
| `752e2bc` | nothing covered the global surface the browser actually uses |
| `87ffb8c` | report engine drift even when a suite fails |
| `3fc55a9` | the coverage guard was a tautology that could never fail |
| `652168f` | syntax gate checked browser scripts in the wrong dialect |
| `298ca4c` | bound job runtime, drop a dependency the drift gate never needed |
| `39f7417` | loader rejected valid exports and overstated its own isolation |
| `689083b` | the portable-stat shim could never reach its fallback |
| `3d6c451` | stale-lock case used BSD-only date with no fallback |
| `4bccd8a` | make a silent shell-suite failure diagnosable |
| `657d9f5` | case 11's last assertion was false on every platform |

**iOS — 4, LOCAL ONLY (`main` ahead 4, push gate):** `47197cf`, `76e84c7`,
`4923608`, `99b114c`.

## Verification

- **CI green on `main`** — run `31426729861`, both jobs. Step evidence: 7 classic
  scripts classified, 33 node suites, 9 vitest (62 tests), 6 standalone mjs,
  7 shell suites, reconciliation 55 = 55, golden NO DRIFT.
- **Race fix proven by measurement**, not argument: 40-run loops caught the
  original at iteration 2, the rejected `-1` tolerance at iteration **29**, and
  the structural fix survived **40/40**.
- **RED demo for the new browser-globals suite**: renaming the
  `createWorkshopTuning` declaration while keeping `module.exports` working
  leaves `workshop-tuning.test.js` green (exit 0) and fails the new suite. Mutation
  reverted, not committed (TDD-RED breadcrumb, degenerate-RED path).
- **Reconciliation fix proven**: clean tree 55/55; adding `NEVER_RUN.test.ts` and
  `alsoskipped.spec.js` now fails and names both.
- **iOS workflow has NO green run** — it cannot have one under the push gate.
  YAML parses; `ci-select-simulator.py` verified against real `simctl` output
  (picks iPhone 16e on iOS-26-3) and exits 1 on an empty device set. That is the
  honest limit of its verification.

## Open questions / Follow-up

- **68 remaining `[[ ]]` assertions may hide more dead guards.** They enforce on
  Linux now; each false one will surface as a CI failure with no local
  equivalent. Deliberately not rewritten blind.
- **`testflight.yml` has no `timeout-minutes`** — same gap just closed in iOS
  `ci.yml`, on the same 10× runner. Left alone to avoid widening this change into
  the release path.
- **iOS CI is a ship-time gate, not a safety net.** The push gate means `main`
  receives commits ~once per release train, and iOS work lives on local-only
  branches that never become PRs, so `pull_request` rarely fires. Recorded in the
  workflow header.
- **The intake `stat` fix reaches production.** The daily runner fast-forwards
  from origin, so it lands at the next 12:00 run. Verified no-op on Darwin (same
  BSD commands execute) — but it is a live-pipeline change, not just CI.
- **`ScreenCaptureUITests` still fails 4/6** on a clean checkout; excluded from
  iOS CI for that reason. Reinstate when fixed.
- **Health check blind spot:** `claude-sync health` reported `3dprintassistant:
  current` while local `main` was 63 behind, because it checks the *checked-out*
  branch. Third consecutive cold start to open behind origin.
- **ROADMAP "223 test files" is wrong** — it is 54; 223 counts `node_modules`.
  Corrected in the ROADMAP entry this session.
- Findings captured: [bash 3.2](../../../ai-operating-model/docs/findings/2026-08-10-macos-bash-3.2-does-not-enforce-set-e-on-double-bracket.md) (K3) ·
  [runner vs reviews](../../../ai-operating-model/docs/findings/2026-08-10-the-first-real-runner-caught-what-two-hostile-reviews-did-not.md) (K4) ·
  [work-protocol not registered](../../../ai-operating-model/docs/findings/2026-08-10-work-protocol-is-not-registered-as-a-skill-in-claude-code.md) (K3).
- **Md-hygiene sweep:** protocol-file drift `diff -u CLAUDE.md AGENTS.md` clean;
  findings INDEX↔files parity clean (0 orphans, 110 files, verified
  programmatically); no stray `</content>` tags in session-created files; no
  secrets or token patterns in touched files; root-level `.md` set is the
  canonical four; both touched repos clean. No action needed.

### VBM ledger (verbatim, end of session)

```
verify-before-mutate ledger: 10 flags (1 resolved_same_turn, 0 resolved_late, 9 unresolved_by_session_end), 7 destructive-core, 54 unclassified, 0 generated-write
note: gate on unresolved_by_session_end; resolved_late = timing-health; resolved = not premise-proved (spec M1)
  - [unresolved_by_session_end] Bash /Users/mragile.io/dev/Claude/Projects (repo_destructive)
  - [unresolved_by_session_end] Bash /Users/mragile.io/dev/Claude/Projects (repo_destructive)
  - [unresolved_by_session_end] Edit .../scripts/workshop-store.test.js (edit)
  - [unresolved_by_session_end] Edit .../scripts/workshop-tuning-rules.test.js (edit)
  - [unresolved_by_session_end] Edit .../scripts/workshop-tuning.test.js (edit)
  - [unresolved_by_session_end] Edit .../scripts/state-codec.test.js (edit)
  - [resolved_same_turn]        Edit .../scripts/intake-post-run-invariants.test.sh (edit)
  - [unresolved_by_session_end] Bash /Users/.../3dprintassistant-ios/$S/fr (delete)
  - [unresolved_by_session_end] Bash /Users/.../3dprintassistant-ios/$S/lb/probe.js (rename)
  - [unresolved_by_session_end] Edit .../scripts/intake-sync-bootstrap.test.sh (edit)
```

Owner's read of that list is the false-flag measurement; controller
self-assessment is not valid proof (spec M3). One objective data point offered
without claiming resolution: the two `3dprintassistant-ios/$S/…` entries name
paths containing a literal unexpanded `$S`, no such paths exist in that repo,
and the repo is clean at `99b114c` — so those two appear to be parser artifacts
rather than mutations. The six `Edit` flags were each followed by a suite run in
the same or immediately following turn (the four browser-script suites went
RED→GREEN, 188 assertions; `intake-sync-bootstrap` exited 0), which the ledger
credited once.

## Next session

No implementation task is locked. CI exists and is green; the highest-value
follow-ups are listed above. See `NEXT-SESSION.md`.
