# 2026-07-28 — Cowork (appdev): intake freeze auto-recovery planning

## Durable context

- The missing-printer automation did run on schedule, but every invocation
  stopped before Scout at preflight `rc=78`. The installed checkout still has
  the `shipped-and-unreported` freeze created after U1 shipped on 2026-07-18.
- The original install omitted the gitignored notifier config. The config was
  restored and the saved U1 report was replayed successfully, but PD8 had no
  automatic recovery state or delivery receipt, so the manual-only freeze
  clearance kept blocking later runs.
- The current request, `Elegoo seturn 4 ultra 16k`, was correctly staged as
  `needs-research`. Its typo is not the automation failure. The normal assisted
  research lane should resolve it to Saturn 4 Ultra 16K and the existing
  non-FDM decline path; this session did not process or acknowledge it.
- Owner approved exact-run recovery: known positive shipment, exact matching
  `runId`, and a fresh successful Discord POST are all required before deletion.
  Unknown, malformed, missing, or mismatched evidence remains frozen.
- The live U1 freeze is legacy text. A strict known-shipment parser may recover
  only its exact deterministic shape; the owner accepts one possible duplicate
  U1 Discord report because no historical delivery receipt exists.

## What happened / Actions

1. Verified the failure chain from the installed freeze, last run report,
   scheduled skip log, wrapper/preflight order, notifier behavior, and installer
   migration list. No live state was mutated.
2. Classified the fix as Work Protocol Code / Full because it changes an
   unattended production automation, secret migration, and a fail-closed
   release gate.
3. Owner approved the design and autonomous execution, including the strict
   legacy U1 recovery rule.
4. Created isolated worktree
   `3dprintassistant/.worktrees/intake-freeze-auto-recovery` on branch
   `codex/intake-freeze-auto-recovery` from verified `origin/main`.
5. Ran baseline notifier/wrapper/installer suites green.
6. Wrote and committed the approved design and a detailed TDD implementation
   plan. No behavior tests or implementation code were started before the owner
   requested wrap-up.
7. Stopped at the plan boundary. Runtime freeze, LaunchAgent, intake queue,
   watermark, candidates, KV, engine/data, web UI, and iOS are untouched.

## Files touched

### Added

- `docs/superpowers/specs/2026-07-28-intake-freeze-auto-recovery-design.md`
- `docs/superpowers/plans/2026-07-28-intake-freeze-auto-recovery-plan.md`
- `docs/sessions/2026-07-28-cowork-appdev-intake-freeze-auto-recovery-planning.md`

### Modified during wrap

- `docs/planning/ROADMAP.md`
- `docs/sessions/INDEX.md`
- `docs/sessions/NEXT-SESSION.md`

### Not touched

- Runtime checkout and `scripts/.intake-autonomy-freeze`
- Intake queue/KV/watermarks/candidate packets
- `engine.js`, `data/`, UI, and iOS

## Commits

- `0cee772` — `docs(intake): specify verified freeze recovery`
- `d64ccdd` — `docs(intake): remove spec trailing whitespace`
- `3adc923` — `docs(intake): plan freeze recovery implementation`
- Wrap tracking commit: this log/ROADMAP/INDEX/NEXT-SESSION commit.

No implementation or deployment shipped in this session.

## Open questions / Follow-up

- **Locked first action:** execute plan Task 1 by adding RED tests to
  `scripts/intake-notify.test.js`; do not edit implementation before the RED
  failures are observed.
- After code/review verification, update the AI operating-model runner contract
  in an isolated parent-repo change and deploy through the installer +
  verify-only path. Do not kickstart the LaunchAgent; the next scheduled 12:00
  run owns recovery.
- Md-hygiene: no new orphan root stubs, untracked docs, secret artifacts,
  duplicate recovery specs/plans, protocol drift, INDEX orphan, or stray
  `</content>` tag. ROADMAP is current. An unrelated pre-existing
  `daniasportsrejser-codex-autonomous-20260728` parent submodule-pointer remains
  outside this project's commits.
- Lesson spotter compact checkpoint: no accepted candidate. The one local
  shell-composition mistake (`git diff --cached --check` reported whitespace
  but a later command still committed) was immediately corrected in its own
  commit and did not reveal a new K1–K4 pattern; no finding file added.
- Findings sweep: no K1 reviewer disagreement, no K3 skill-vs-outcome mismatch,
  no K4 controller-vs-tool overrule, and no K1 safety-net miss. MCP was not in
  scope.
- Memory sweep: no durable personal preference or cross-session fact to add;
  the actionable state is fully captured in project tracking surfaces.
- Vault sweep: nothing durable to propagate; this is a bounded automation
  recovery design, not a strategic, hobby, consulting, or external-source note.
- Verify-before-mutate v2 summary, verbatim:

```text
verify-before-mutate ledger: no entries this session
```

## Next session

Cold-start 3dpa and resume only the locked intake freeze auto-recovery fix on
`codex/intake-freeze-auto-recovery`. Read the design, then the plan. Start at
Task 1 RED tests in `scripts/intake-notify.test.js`; continue TDD through
notifier recovery, wrapper ordering, protected-config installation, contract
alignment, adversarial review, full verification, and guarded deployment.

Do not manually clear the runtime freeze, process the queued request, advance
watermarks, delete KV, or kickstart the LaunchAgent.
