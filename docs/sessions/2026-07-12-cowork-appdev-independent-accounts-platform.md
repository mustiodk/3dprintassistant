# 2026-07-12 — Cowork (appdev): independent My 3DPA platform candidate

## Durable context

- The independent Codex candidate was designed only after Claude PR #16 was confirmed merged, and without reading Claude's same-task spec, plan, review, or session log. ROADMAP reconciliation happened only after the independent spec and plan were review-complete.
- The recommendation is an optional, local-first My 3DPA platform: Firebase Apple/Google identity, the existing Cloudflare Worker plus EU D1, PDM2 portability, free Workshop sync, event-sourced inventory, self-serve signed/encrypted export and deletion/DR, and later lifetime Pro without subscriptions.
- The implementation plan is not permission to provision anything. G0 is docs/tooling only; O0 is the first owner decision gate. Production/public and iOS/App Store activation have separate owner-canary, soak, rollback, and release gates.
- The plan reached zero P0–P2 independently with three lenses: architecture subagent, QA subagent, and isolated Claude bridge review. The final cross-model pass still found three gaps after both subagents were green; those were patched and all reviewers reran green.
- PR #17 merged the independent candidate to web `main` as docs/planning only. No web runtime, engine, canonical data, iOS code, Android code, external account resource, or production behavior changed.

## What happened / Actions

1. Phase 0 watchdog polled the parallel Claude task and GitHub until Claude wrap PR #16 was confirmed merged (`bf179b9`), then stopped normally.
2. Created an isolated worktree/branch from post-Claude `origin/main` and preserved a quarantine boundary around the parallel same-task artifacts.
3. Cold-read web, iOS, and bambuinventory source plus prior monetization context; researched official Firebase, Cloudflare, Apple, Google, GDPR, and competitor surfaces.
4. Authored the independent implementation-grade spec and a small-gate implementation plan with explicit dependencies, path scopes, commands, evidence, rollback, migrations, feature flags, owner gates, and cross-platform/data-logic evaluation.
5. Ran iterative architecture, QA, and cross-model reviews until all three reported zero P0–P2. Material patches included remote staging, deletion/erasure ordering, atomic rollout steps, iOS release soaks, schema ownership, inventory event immutability, identity separation, and entitlement sequencing.
6. Reconciled ROADMAP additively after the independence gate: both proposals remain visible for owner comparison; four extra backlog items were added (#045–#048).
7. Opened PR #17; Cloudflare Workers build passed; PR merged at `4f877e16b747370d7bf9bf4f8eaf12688f26e41f`.
8. Trigger A lesson spotter found a K1 recurrence: architecture/QA were green while bridge still found three P2 gaps on the same candidate. Captured in ai-operating-model; no MCP finding.

## Files touched

### Added

- `docs/superpowers/specs/2026-07-12-codex-my3dpa-account-cloud-design.md`
- `docs/superpowers/plans/2026-07-12-codex-my3dpa-account-cloud-plan.md`
- `docs/reviews/2026-07-12-codex-my3dpa-spec-review.md`
- `docs/reviews/2026-07-12-codex-my3dpa-spec-final-cross-model.md`
- `docs/reviews/2026-07-12-codex-my3dpa-plan-review.md`
- `docs/reviews/2026-07-12-codex-my3dpa-plan-final-cross-model.md`
- this session log

### Modified

- `docs/planning/ROADMAP.md`
- `docs/sessions/INDEX.md`
- `docs/sessions/NEXT-SESSION.md`

### Other project

- `ai-operating-model/docs/findings/2026-07-12-bridge-found-plan-gaps-after-subagents-zero.md`
- related findings index/prior recurrence status and lesson-spotter calibration row

## Commits

- Independent spec baseline/review arc: `9d23ae9` through `5c3c661`.
- Independent plan baseline/review arc: `e6ae216` through `e3eb30b`.
- ROADMAP comparison candidate: `f7130a9`.
- PR #17 merge: `4f877e1` (`docs: independent My 3DPA platform spec and gated plan`).
- ai-operating-model K1 recurrence: `3959427`.
- Wrap branch/PR: recorded before merge in the wrap PR description; this log intentionally does not claim an unverified future merge.

## Open questions / Follow-up

- **Owner decision:** compare the parallel Claude AP0 bundle with the independent Codex O0/G0/C0 bundle and ratify one synthesized decision set. Do not start account implementation from both plans in parallel.
- Key decision differences to settle explicitly include free-vs-Pro sync boundary, provider/backend topology, inventory contract/event model, gate granularity, iOS/Android sequencing, and the production deletion/DR posture.
- Md-hygiene: ROADMAP is now 425+ lines with many historical banners despite the slim-surface rule; propose a dedicated archive/slimming pass after the current export/iOS release trains, not a silent cleanup inside this wrap.
- Md-hygiene: the two account specs/plans are intentional A/B comparison artifacts, not accidental duplicates. Retire or synthesize only after owner selection.
- Md-hygiene: session INDEX was missing the merged parallel Claude session entry; this wrap adds it. `NEXT-SESSION.md` is intentionally not indexed.
- Md-hygiene: top-level `CLAUDE.md` / `AGENTS.md` are byte-identical; no secrets, root redirect stubs, untracked 3dpa markdown, or stray `</content>` tags were found.
- ai-operating-model md-hygiene: `lesson-spotter-calibration.md` has pre-existing structural drift (new rows appear after `## Field Notes` / review text). Surface for a later calibration-table cleanup; not silently reorganized here.
- Lesson spotter: accepted one high-value K1 recurrence; declined the first bridge timeout/retry as already-covered operational noise. Protocol overload warning: none.
- Findings sweep: K1 captured; no K3 (skills produced expected outcome), no K4 (no tool overruled a controller judgment), no MCP finding.
- Verify-before-mutate summary (verbatim): `verify-before-mutate ledger: no entries this session`.
- Memory sweep: no durable personal preference or routing memory to add; the reusable reviewer lesson is captured in the findings ledger.
- Vault sweep: nothing durable to propagate while the product decision remains unratified; canonical artifacts stay in the 3dpa repo.

## Next session

Run the owner comparison gate in `docs/sessions/NEXT-SESSION.md`. Produce a short decision/disposition document that maps both proposals into one ratified gate sequence; do not implement accounts until that owner decision exists. Existing export Phase 3/4 and iOS 1.0.7/1.0.8 release priorities remain independently valid.
