# Feedback Diagnostics v2 — cross-repo implementation review (Task 9)

**Date:** 2026-08-01
**Scope:** the web/Worker review-fix pass (P2 #3–#7 + confirmation should-fix) and the new iOS Task 8 slice.
**This is a pre-O0 handoff review, not a production-deploy approval.**

## Exact reviewed HEADs

| Repo | Branch | HEAD |
|---|---|---|
| Web | `codex/feedback-diagnostics-v2` | `fda09aa` |
| iOS | `codex/feedback-diagnostics-v2-ios` (worktree `.worktrees/feedback-diagnostics-v2-ios`) | `acfd8fb` |

iOS branch base: `main` @ `2be10a4`, verified current against `origin/main` before the worktree was created.

## Commits in this pass

Web, one finding per commit, on top of the reviewed baseline `6381e9e`:

| Commit | Finding |
|---|---|
| `3219e27` | P2 #3 — persist diagnostic completeness |
| `1910d63` | P2 #4 — stop reporting an unresolved printer as supported (+ server-side kind/match vocabulary and coherence rule) |
| `193057c` | P2 #5 — real catalog provenance and engine state (+ manifest `catalogRevision`) |
| `e44f17e` | P2 #6 — server-enforced minimal diagnostics for non-bug categories |
| `ad1e49a` | P2 #7 — client/server breadcrumb contract alignment (integer `ageMs`) + the missing parity test |
| `90816ef` | Confirmation-review should-fix — client capture-vocabulary guard |
| `fda09aa` | Task 9 self-verification — label minimal reports `minimal`, not `complete` |

iOS: `acfd8fb` — the whole of Task 8 as one feature commit (new subsystem, not a review finding).

## Verification evidence

### Web / Worker
- Node: **125 tests, 0 failures**.
- Vitest Workers pool: **12 files, 70 tests, 0 failures**.
- `npm run verify:release`: manifest current.
- `node scripts/validate-data.js`: all data files valid.
- `node scripts/walkthrough-harness.js`: `_All automated checks passed._`
- `node scripts/export-audit.js`: **0 FAIL / 0 warn / 6 info**.
- `npx wrangler deploy --dry-run`: succeeds; **no feedback production bindings present**.
- `git diff --check`: clean.

### iOS
- `xcodebuild test -only-testing:3DPrintAssistantTests`: **211 tests, 0 failures** (199 baseline + 12 new).
- `ScreenCaptureUITests`: **4 of 6 failing — pre-existing.** Reproduced identically (same tests, same line numbers) on pristine `main` @ `2be10a4` with none of these changes applied. Not caused by this work; recorded as a separate follow-up.
- Generated-project diff reduced to the three new file references. XcodeGen additionally renamed the root group after the worktree directory; that is a worktree artifact and was reverted rather than committed.

### Cross-platform proofs
- **Shared-file identity:** `engine.js` plus `printers.json`, `materials.json`, `nozzles.json` and all four `data/rules/*.json` are byte-identical between repos (8/8).
- **Wire-contract parity, end to end:** real `JSONEncoder`-produced iOS payloads were exported from an XCTest and run through the actual Worker validator (`normalizeFeedbackPayload(..., "ios")`). All three v2 categories **ACCEPTED**, with `completeness=complete` for `bugReport` and `minimal` for `generalFeedback`/`featureRequest`, 3 breadcrumbs vs 0, and `releaseChannel=debug`. No user-authored text appears in the plaintext diagnostics block.
- **Real web client payloads:** the shipping `feedback-form.js` submission logic was replayed for all three v2 categories through the same validator — all **ACCEPTED**. This is what caught `fda09aa`.

## Independent review status — FAIL-CLOSED

**The required cross-model review in plan Task 9 Step 3 was NOT obtained.**

`bridge --health` passed, but both the Bridge `codex-only` run and a direct
`codex exec -s read-only` probe returned:

```
ERROR: You've hit your usage limit. ... try again at Aug 7th, 2026 12:35 PM.
```

The Codex account is exhausted account-wide until **2026-08-07**. Per the plan's
own rule — "a timeout, empty artifact or auth failure is invalid evidence and
blocks release progression" — this is recorded as an unmet gate, not worked
around.

Note on mode: the plan text specifies `bridge --mode claude-only`, which was
correct when the controller was Codex. This session's controller is Claude, so
the cross-model mode is `codex-only` (bridge's own help: *"codex-only = ... cross-model
review when you are driving from Claude"*). That is the run that hit the limit.

A **supplementary same-model** hostile review (`bridge --mode claude-only`) was
attempted so the code would not be left reviewed only by its author. **It also
produced no evidence:** the nested Claude turn stalled, blew well past its own
`--turn-timeout-seconds 900` bound (~25 minutes of silence), and was terminated
with an empty artifact. This matches the known nested-interactive stall recorded
in memory `reference_bridge_nested_session_auth_401` and the 2026-07-19
precedent in the ROADMAP.

**Net position: no independent review evidence was obtained this session, from
either model.** Everything in the "Verification evidence" section above is
mechanical (tests, validators, byte-diffs, real-payload replays) and was
produced by the author. It is real evidence, but it is not review.

## Consequence for O0

O0 remains blocked. It now has two prerequisites rather than one: the owner
authorisations listed in plan Task 10 Step 1, **and** a valid cross-model
implementation review once Codex capacity returns on 2026-08-07 (or via another
independent reviewer the owner chooses).

Nothing in this pass provisioned, bound, migrated, deployed, or released
anything. No Cloudflare resource, no secret, no rate-limit namespace, no
`wrangler.toml` change, no Worker deploy, no production canary, no iOS version
bump, no iOS push, no TestFlight dispatch, no App Store Connect change.
