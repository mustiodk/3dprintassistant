# 2026-08-22 — Cowork (appdev): iOS 1.5.0 My Gear — autonomous execution

Execution log for the [1.5.0 plan](../superpowers/plans/2026-08-22-ios-1-5-0-my-gear-plan.md).
The owner handed over full autonomy this session: run the phases end to end,
take technical decisions with subagent + cross-model input, stop only for
something genuinely critical. Evidence is recorded per phase as it is produced,
not reconstructed at wrap-up.

## Durable context

- **The iOS repo is private; the web repo is public.** Actions minutes are
  therefore billed for iOS and free for web, and `macos-26` bills at 10x. This
  is what decides PR granularity — see the PR-strategy entry below. It is not
  written down anywhere else and it silently governs every CI decision on this
  train.
- **`ci.yml` does not exist on `origin` at all.** The remote knows exactly one
  workflow, `Deploy to TestFlight`; the four CI commits are part of the six held
  locally. So the workflow is not merely "never run" — GitHub has never seen it.
- **iOS locale JSONs live inside `en.lproj` / `da.lproj`**, beside
  `Localizable.strings`. That means the bundle resolves them per-locale for
  free, and it also means the app has three string mechanisms in the tree, not
  the two the plan named.
- **Test fixtures on iOS are inline `#"""` raw strings**, not bundle resources
  (`WorkshopStoreTests.swift:29`). Gear fixtures inherit that, which removes a
  whole class of XcodeGen resource plumbing from Phase 1.

## Phase 0 — freeze the boundary · GATE MET

| Gate item | Result |
|---|---|
| `claude-sync.sh hold` ACTIVE | set — "iOS 1.5.0 release train" |
| The six held shas, exactly | `ffd64f4 9050d28 79fc8dc e5cff55 b613d55 98cc9cb`, count 6, no drift |
| Engine mirror vs **pushed** web `origin/main` | `090b52ac31deabe7` both sides |
| Data tree mirror (not required by the gate, checked anyway) | all 7 JSONs identical |
| Full suite green at 222 | **222 executed, 0 failures**, `-testLanguage en -testRegion US` |
| Branch | `feat/ios-1-5-0-my-gear`, nothing touches `origin/main` until Phase 7 |

Storage contract re-read in full before any store code. Its §1 forbidden
pattern is now recorded as superseding the gear spec's word "Codable" —
amended in the spec itself (`1157ada`), because the ambiguity had to close in
the document a porter would actually read.

### Two risks closed early rather than at Phase 6

`testflight.yml` had no `timeout-minutes` (`5952909`). It inherited GitHub's
360-minute default on the 10x runner in a repo that has hit quota once; the
eight builds on record run 4m55s-7m17s, so it is now bounded at 30.

### PR strategy — decided on evidence, not habit

Pushing a feature branch does **not** trigger `ci.yml` (`push:` is
`branches: [main]`); opening a PR does. With iOS private and macOS at 10x,
eight phase-PRs would spend roughly 560 billed minutes before a single build.
Three PRs on coherent units — after Phase 1, Phase 3 and Phase 5 — plus the
release push give four CI runs and still put the workflow on the real runner
early, which is the point (`feedback_push_ci_to_the_real_runner_early`).

### Open decision 9 taken: the file is `gear.json`

`Application Support/3DPrintAssistant/` already holds `workshop.json` and
`app-state.json`, both with an injectable `fileURL` for tests. The spec says
"beside `app-state.json`" and never names it. `gear.json` is the only name
consistent with the two files already there.
