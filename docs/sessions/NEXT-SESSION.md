# 3dpa — Next Session Kickoff

**Purpose:** resume Feedback Diagnostics v2 at the explicit owner-only O0 gate.

**Last updated:** 2026-08-01 after Task 9 completed with a final exact-HEAD Bridge GO.

The task remains locked. Do not choose another ROADMAP item and do not weaken or
bypass O0. Trust live Git/GitHub evidence over this snapshot.

## Verified handoff

- Web implementation reviewed at `7be81deb10a8c699349e307861947fc8d2eb734a`
  on `codex/feedback-diagnostics-v2`; the feature branch is authorized for
  handoff only, not merge or production deployment.
- iOS implementation reviewed at `5bfcc89f48a5260ce2703a24dc7bb77c5a4fe2c7`
  on local-only `codex/feedback-diagnostics-v2-ios`, worktree
  `3dprintassistant-ios/.worktrees/feedback-diagnostics-v2-ios`, based on verified
  `main` `2be10a403a74e764d7551e861dc5998f16c9f1f9`.
- Final gates: web 60 Node / 70 Vitest; iOS complete scheme 217/217; release,
  data, walkthrough, export, dry-run and shared-file identity proofs green.
- Final Bridge confirmation:
  `docs/reviews/bridge-2026-08-01-130631-202595.md` — **GO**, 0 P0/P1, tied to
  the exact implementation HEADs above.

## Locked next action — Task 10 Step 1, O0

Stop and obtain explicit owner permission for all of the following:

1. `wrangler d1 create 3dpa-feedback-production --jurisdiction=eu`
2. One interactive `wrangler secret put FEEDBACK_DATA_KEY`
3. Assignment of a unique feedback rate-limit namespace
4. Remote feedback migration
5. Worker deploy
6. Synthetic production canaries

Before that explicit permission, do **not** create, bind or migrate
`FEEDBACK_DB`; set `FEEDBACK_DATA_KEY`; allocate `FEEDBACK_RATE_LIMITER`; modify
`wrangler.toml`; deploy the Worker or web client; send production canaries;
modify ROADMAP for rollout; bump the iOS release train; push iOS; start
TestFlight; or change App Store Connect.

After O0, follow Task 10 literally and fail closed: independently prove D1
`jurisdiction: eu` before wiring its UUID; configure five accepted attempts per
60 seconds; dark-deploy the backward-compatible Worker; run and delete one
synthetic legacy and one synthetic v2 canary; verify encrypted storage,
minimized Discord and owner read; only then consider web rollout. The later iOS
step is one release-train bump from 1.1.3 to 1.1.4 and still requires its own
ship-ready push gate. Do not dispatch TestFlight.

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only.
