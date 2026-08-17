# 2026-08-17 — Cowork (appdev): packet repair lands at the right locus; next-gen platform ratified

**Machine:** mac-mini. **Product code changed:** none (docs/specs/plan only). **Intake:** the 12:00 run consumed both repairs.

## Durable context

- **The repair recipe's locus was wrong, and checking before editing saved the
  pass.** The 08-16 recipe said hand-edit the two parked packets. Three facts
  killed that premise: the repair pass *rebuilds* the candidate on a new branch
  HEAD (contract §8), `parked.json` sha256-guards the packet
  (`intake-owner-decision.js:143`), and the sanctioned writers re-stamp that
  hash. The fix landed where the rebuild actually reads — the runbook (which
  the kickoff says wins on conflict) — as a full machine-schema section for the
  evidence packet, proven empirically: a packet rebuilt to the documented shape
  went **5 errors → `ok=true`** against the real validator before anything was
  committed.
- **The 12:00 run is the positive proof.** `ender_3_s1_pro` SHIPPED live on the
  first rebuilt packet (the evidence gate that had never passed, passed).
  `hi` also passed the gate, then drew a *legitimate* R1 NO-GO — its
  nozzle-kit citation is a K2 Plus page, not a Hi page — and sits
  `judgment-on-evidence` (event-only park; owner decision). A new candidate
  `ender_3_pro` parked `needs-source-resolution` the same run.
- **`enterResearchRepair` has no production caller** — the "one bounded repair
  pass" is agent policy reading as enforced code. K3 filed (fourth member of
  the dead-code-as-safety-control family); mitigation is an owner call with
  locus-validation required first.
- **The next-gen platform is ratified.** Owner re-opened all four July
  decision families and locked: **Free** (today + My Gear/Setups) · **Pro
  one-time** (inventory + sync + future premium, under a binding "Pro grows"
  contract — listings only ever describe what exists today) · **AI credits**
  (prepaid consumables on a free account). Sync moved from being the Pro
  product to Pro's multiplier; inventory is the headliner (overturns SYN-10's
  free-inventory lock). Accounts required only at credit purchase.
- **The AI buddy's loyalty problem has an architecture, not a hope.** Five
  layers (identity prompt, provenance grounding, disagreement→Tuned-path
  framing, hard authority rules with deterministic runtime scans, and a
  contradiction-bait eval suite that gates every prompt/model change). The
  apply-loop: v1 = input-side proposal cards (buddy changes configurator
  *answers*; engine regenerates; Blocked/Confirm/Clean preflight defined
  against the real engine API), v1.5 = value deltas through the Workshop
  "Mine" rail.
- **Ten bridge codex-only rounds today, all completed (97-331 s), zero open
  findings at the end.** Two rounds runtime-probed the code under review (the
  engine preflight functions; the plan's embedded store code in a Node VM).
  The plan-gate caught a would-crash `const state` reassignment in the plan's
  own sample and a wrong field name (`brand` vs `manufacturer`) before any
  code exists — exactly what the gate is for.

## What happened / Actions

1. Cold start halted at the sync gate (`3dprintassistant behind:4`),
   fast-forwarded clean, verified branch `main` (the 08-12 trap).
2. Validated the repair recipe's premise against ground truth; killed the
   hand-edit locus; documented the evidence-packet machine schema in
   `docs/runbooks/printer-addition-protocol.md` (`555706e`) + pointed the
   kickoff at it (`99e79ee`); proof-packet `ok=true` before commit; both
   pushed before the 12:00 run, which self-syncs (`HEAD == origin/main`
   asserted by its bootstrap).
3. Read the run's outcome from git + sidecars (not the stale report file):
   ship commits for `ender_3_s1_pro` on `main`; `hi` → `review-no-go`;
   `ender_3_pro` new park.
4. Owner-led brainstorm (work-protocol Full lane): re-opened the July
   decision set, locked tiers/monetization/accounts via ~10 structured
   decision rounds, then wrote
   `docs/superpowers/specs/2026-08-17-next-gen-platform-design.md` — 4 review
   rounds (NO-GO 11 findings → GO zero).
5. Owner asked for a dedicated AI-buddy part →
   `docs/superpowers/specs/2026-08-17-ai-buddy-design.md` — 3 rounds
   (NO-GO 8 → GO zero), platform spec §4/§8 synced.
6. Owner ratified → Train 1 implementation plan
   `docs/superpowers/plans/2026-08-17-train1-my-gear-setups-plan.md` (10 TDD
   tasks, web-first then iOS-local) — 3 rounds (NO-GO 8 → GO zero).
7. Both specs published as private artifacts for owner reading (platform:
   `claude.ai/code/artifact/c59bf0d8…`, buddy: `…/59f3bf7f…`).

## Files touched

**Created:** the two specs · the Train 1 plan · this log · ai-om finding
`2026-08-17-one-bounded-repair-pass-has-no-enforcing-caller.md` · 10 bridge
transcripts under `codex/next-gen-platform-review/`.
**Modified:** `docs/runbooks/printer-addition-protocol.md` ·
`scripts/intake-run-kickoff.md` · `docs/planning/ROADMAP.md` ·
`docs/sessions/INDEX.md` · `docs/sessions/NEXT-SESSION.md` · ai-om findings
INDEX + lesson-spotter calibration.

## Commits

Web `main` (all pushed, CI green): `555706e` runbook schema · `99e79ee`
kickoff pointer · `a9a3d74` platform spec · `a66c529` round-1 dispositions ·
`7509852` round-2 · `b1519af` taxonomy fix · `6554288` GO transcripts ·
`ea73163` AI-buddy spec + sync · +2 disposition commits · `5c274b9`-era plan +
fixes · transcripts. ai-om: `23b1993` finding + calibration.
Intake's own commits (not this session's work): `d1a8367`/`1af368d`/`df92a1b`
ship ender_3_s1_pro · `28bdac9`/`00230ed` custody parks. iOS: `13f149f`
(run's own mirror commit, local under push gate — untouched by this session).

## Open questions / Follow-up

- **`hi` owner decision** (judgment-on-evidence): the R1 objection is
  Hi-specific nozzle-kit compatibility evidence for `[0.4,0.6,0.8]` vs
  restricting to `[0.4]`. Decision issue expected via the sweep.
- **`ender_3_pro`** parked `needs-source-resolution` — expect its issue.
- **K3 `enterResearchRepair` no-caller** — mitigation is an owner call
  (wire into `writeParkedForCandidate` vs POSTRUN invariant); validate the
  locus first.
- **iOS 1.1.4 remains owner-gated** (push, TestFlight, device acceptance,
  explicit-zero dashboard check). Untouched today.
- Md-hygiene: protocol files identical; no root stubs; no untracked; secrets
  scan hits were `risk-`/`task-` substring false positives (verified); no
  stray `</content>` tails; ROADMAP banner updated this wrap-up; findings
  INDEX parity held (prepend verified by Read after a VBM flag).
- Lesson spotter (compact): 3 candidates, 1 accepted (the K3), 2 declined
  (bridge working as designed; known cwd-reset behavior). No K1/K4/MCP.
- verify-before-mutate summary, verbatim:
  `verify-before-mutate ledger: 1 flags (0 resolved_same_turn, 0 resolved_late, 1 unresolved_by_session_end), 0 destructive-core, 14 unclassified, 0 generated-write`
  — the flag fired on the `intake-run-kickoff.md` Edit (read at the
  *automation checkout* path, edited at the dev-tree path); verified same-turn
  by diffing `git show HEAD:` against the checkout copy (byte-identical) and
  asserting the 16-bullet structure was unchanged, outcome stated inline. A
  second flag (findings INDEX, Bash-`head` read) was verified same-turn with a
  Read call. Owner's read of this list is the measurement.

## Next session

**Execute the Train 1 plan in a fresh session** — see `NEXT-SESSION.md` for
the kickoff (web tasks 1-5 first; iOS tasks 6-10 need a Mac with full Xcode —
mac-mini verified). Plan is GO'd; subagent-driven execution recommended by the
plan header; owner chooses at session start.
