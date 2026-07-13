# 2026-07-13 — Cowork (appdev): Centauri intake full audit + R1/park fixes (Air)

## Durable context

- **The owner explicitly reopened the intake lane** ("complete audit … find the
  issue and fix it … rerun the request"), lifting the terminal-session park.
  The `nextEligibleTrigger: owner` condition on the parked sidecar is
  satisfied by that command; the mac-mini e2e rerun is authorized.
- **Complete audit of the day's three intake failures for the Centauri
  Carbon 2 request (`req:1783955904071:fb09d854` / `req:1783803440249:a639de6a`):**
  1. **2026-07-12 19:58 `review-unavailable`** — `--json-schema` was handed a
     FILE PATH; CLI <2.1.205 silently degraded (exit 0, prose, no
     `structured_output`). Root-caused + fixed in the Air root-cause session
     (boundary script, PR #24 `c0da52a`). **Validated: fix held** — every
     subsequent turn transported the schema inline.
  2. **2026-07-13 10:08 `review-split`** — R1 NO-GO (cool_plate +
     open_door_threshold_bed_temp provenance), R2 GO. Not a defect: genuine
     reviewer disagreement, answered by the terminal session's bounded
     evidence repair (canonical full-HTTPS official sources → candidate
     `1694af2`). My live probes independently NO-GO'd the OLD `8695583`
     candidate on exactly those provenance grounds — coherent.
  3. **2026-07-13 19:08 `review-unavailable`** (the unexplained one) —
     inline schema through the merged boundary, model emitted the verdict
     JSON in markdown prose, no `structured_output`, boundary failed closed
     exit 65. **Diagnosed this session — see below.**
  Plus the runner terminal-contract violation (branch/packet deleted after
  parking, stale report) caught by `POSTRUN report-stale` and manually
  repaired in the terminal session.
- **Diagnosis of failure 3 (evidence, not speculation):** three live pre-fix
  probes on the Air (CLI 2.1.173, clean-env Opus 4.8, real `8695583`
  candidate diff, verdicts discarded) failed to repro: 5.7KB with the
  conflicting "emit the structured result before prose" instruction → valid
  structured output; 48KB exact scale with the instruction early AND as the
  final line → valid; 48KB through a **nested-dirty** wrapper inheriting the
  full parent Claude Code session env (replicating the mac-mini runner path,
  which every prior clean-env proof did NOT replicate) → valid. Combined with
  the earlier N=4: 7 consecutive successes across scale, env-dirtiness, and
  instruction conflict. **Conclusion: single-sample stochastic
  prose-compliance** — the model wrote the schema-shaped verdict into text
  instead of invoking the structured-output tool, plausibly nudged by the
  contract instruction, but not deterministically forced by it.
- **Fixes shipped (hostile sub-agent review NO-GO → all findings patched):**
  - Web `f989af6` — the boundary ALWAYS appends a trailing canonical
    STRUCTURED OUTPUT CONTRACT block superseding any conflicting prompt
    instruction, preserves the exact effective prompt as `<label>-prompt.md`,
    and captures the prompt body with a CHECKED substitution (hostile-review
    P1: a swallowed `cat` failure could have sent a contract-block-only
    prompt and accepted a schema-valid GO over a review nobody sent). Suite
    73/73.
  - Web `4d034ad` — POSTRUN check 6 park preservation: fresh sidecar ⇒
    packet must exist; fresh `review-unavailable`/`review-split` sidecar ⇒
    `intake/<id>` branch must exist. Reason-scoped (hostile-review P1: a
    blanket branch requirement would false-fail every stage-3 park;
    `review-no-go` exempt because stage 0b legitimately deletes its branch
    next run). Fail-closed on unreadable sidecars. Tests 12–21.
  - Web `1c744ba` + parent `e08c382` — kickoff + runner contract **v2.2**:
    reviewer output is channel-specific (R1 = structured-output mechanism
    ONLY, no output-format instructions in the R1 prompt; "before prose" =
    Reviewer 2 text channel only) + "Parking is not cleanup" terminal
    obligation.
  - Post-fix live proof: 2 probes (clean + nested-dirty env, 48KB conflict
    prompt) through the patched boundary → contract-valid structured output,
    block trailing, evidence preserved. **All 5 probe verdicts discarded** —
    no review turns spent, candidate review state unchanged.
- **Residual gap (accepted, documented):** a runner deleting the ENTIRE
  parked dir (sidecar included) evades check 6; such a candidate is
  resurrected by stage-0 ledger reconciliation next run. Report-vs-parked-dir
  cross-checking deliberately not built (scope).
- **Engine/data impact evaluation (standing rule):** scripts + contract only;
  no dataset/engine change → no web or iOS app change required.

## What happened / Actions

1. Cold start with GitHub-first gate: pulled web `behind:4` current
   (`050967f`), read the three 2026-07-13 session logs, NEXT-SESSION,
   outcomes ledger, both ai-om findings, contract v2.1, kickoff, boundary +
   invariants scripts.
2. Audited all failures (list above); validated the file-path fix held and
   the review-split was answered by the evidence repair.
3. Implemented boundary prompt-guard + POSTRUN park preservation with tests;
   ran the full intake suite set (boundary 73/73, invariants incl. 9 new
   cases, wrapper, preflight, 5 node suites — all green).
4. Hostile sub-agent review of the full change set: **NO-GO, 11 findings**
   (2 P1: stage-3 park false-fail; swallowed `cat` fail-open). All patched;
   re-ran suites green.
5. Live probe matrix on the Air (A1/A2/A3 pre-fix — no repro; B1/B2
   post-fix — valid): diagnosis + fix proof as above.
6. Commits: web `f989af6`, `4d034ad`, `1c744ba` (pushed); parent `706391e`
   (findings mitigated + INDEX + status.json, generator tests OK). Contract
   v2.2 content landed as auto-sync `e08c382` (see Open questions).
7. Updated ROADMAP lock banner (intake lane reopened, e2e pending on
   mac-mini) and regenerated NEXT-SESSION.md as the mac-mini e2e kickoff.

## Files touched

- Modified: `scripts/intake-r1-structured-review.sh`,
  `scripts/intake-r1-structured-review.test.sh`,
  `scripts/intake-post-run-invariants.sh`,
  `scripts/intake-post-run-invariants.test.sh`,
  `scripts/intake-run-kickoff.md`, `docs/planning/ROADMAP.md`,
  `docs/sessions/INDEX.md`, `docs/sessions/NEXT-SESSION.md`
- ai-om: `docs/agents/intake-pipeline-runner.md` (v2.2), both 2026-07-13
  intake findings (+ INDEX + status.json), session log + INDEX + NEXT.
- Probe evidence (scratchpad, session-local): 5 envelopes/metadata under
  `scratchpad/probes/` — not committed by design (verdicts discarded).

## Commits

- Web `f989af6` — fix(intake): boundary owns R1 output format.
- Web `4d034ad` — fix(intake): POSTRUN park-preservation invariant.
- Web `1c744ba` — docs(intake): kickoff v2.2.
- Parent `e08c382` — auto-sync (contract v2.2 content; see below) +
  `706391e` — findings resolutions.

## Open questions / Follow-up

- **Commit-boundary miss (process, K3-family recurrence-adjacent):** the cron
  auto-sync scooped the contract v2.2 edit as `e08c382` before the deliberate
  commit. Content was already post-hostile-review, so reviewed material
  shipped — but the commit-message hygiene was lost and it was already pushed
  before detection. Lesson re-affirmed: run `~/.claude/claude-sync.sh hold`
  BEFORE editing review-gated contract files, not just for planning
  artifacts. Not re-ledgered as a new finding (family closed 2026-06-10
  against the v4 hold; this is a controller-discipline miss, recorded here).
- **The decisive live validation is the mac-mini e2e rerun** — the preserved
  live prompt `pd5-centauri_carbon_2-r1-20260713T190845Z*` exists only there;
  the e2e session should diff it against the effective prompt the v2.2 path
  produces.
- Discord receipt of the terminal notification is still owner-unverified
  (transport `posted=true` only).
- Residual park-preservation gap (whole-dir deletion) documented above.
- Md-hygiene: no root stubs, no untracked should-be-tracked md, no secrets,
  no stray `</content>` tags in session-created docs; INDEX parity restored
  by this wrap's entries; ROADMAP lock banner refreshed this session (the
  2026-07-12 export-banner drift remains queued as before).
- Verify-before-mutate ledger: `0 flags (0/0/0), 0 destructive-core,
  7 unclassified, 0 generated-write` — no flags to resolve this session.
- Lesson-spotter (compact): 1 candidate accepted — "clean-env proofs don't
  prove the nested-dirty live path; replicate the exact invocation
  environment before claiming a proof covers production" (captured inside the
  K4 finding's Resolution; no separate finding file). 1 no-action (probe
  cost discipline held: 5 turns, verdicts discarded). No K1/K2 surfaced; K4
  resolution and K3 mitigation recorded in existing findings.

## Next session

**Mac-mini:** run the regenerated `NEXT-SESSION.md` — owner-authorized e2e
rerun of the Centauri Carbon 2 intake through the fixed v2.2 path (pull both
repos first; verify boundary + invariants + kickoff arrived), then the intake
terminal report, then back to the iOS 1.0.7 issue-fix train.
