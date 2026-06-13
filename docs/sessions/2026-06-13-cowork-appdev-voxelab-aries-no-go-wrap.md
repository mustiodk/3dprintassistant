# 2026-06-13 — Cowork (appdev): Voxelab Aries no-go + printer-intake wrap

## Durable context

- Printer adds do not require a new iOS binary when they are limited to `data/printers.json` plus the iOS remote printer overlay. Web remains the bundled source of truth; overlay is an additive same-day patch for existing iOS clients.
- Voxelab Aries is a legitimate FDM candidate and the owner approved Voxelab as a new brand plus conservative `bedslinger` taxonomy, but the attempted ship was reverted after review.
- The blocker is not taxonomy. The blocker is `max_acceleration`: it is profile/safety-critical, current protocol treats it as manufacturer data, and no official Voxelab/manual/firmware/source found a manufacturer max acceleration value.
- Before seeding the real Discord backlog, the natural next task is a protocol/app-data decision: whether old printers with missing manufacturer acceleration can use an explicit app-side conservative cap with provenance, or whether they must stay blocked.
- Local iOS XCTest could not run on this Mac because full Xcode is not installed (`xcodebuild` points at CommandLineTools and no `/Applications/Xcode*.app` was present). The next session needs either a non-TestFlight local iOS test path or an explicit data-only overlay XCTest waiver rule.

## What happened / Actions

- Ran the Voxelab Aries delivery rehearsal after the owner approved the new brand and conservative taxonomy path.
- Added Aries to web data and the iOS overlay, then dispatched a review gate before treating it as shippable.
- Review returned NO-GO because `max_acceleration: 5000` was unsourced and the local iOS XCTest gate was unavailable.
- Searched stronger sources after review: official Aries manual, VoxelMaker config, Voxelab firmware package, archived firmware repo, and community Cura/profile material. None provided a manufacturer-authoritative Aries max acceleration.
- Reverted both Aries web data and overlay publication commits. Live overlay remains `content_version=2026051202` with only `sparkx_i7`; Aries did not ship.
- Fixed a separate audit false-positive in `scripts/profile-matrix-audit.js`: safe-range clamps below preferred/base temperatures are now recognized as clamp warnings rather than hard safety failures.
- Updated ROADMAP and `NEXT-SESSION.md` to make the next entry point the process adjustment, not backlog seeding.

## Files touched (Modified / Deleted / Untracked)

- Modified: `docs/planning/ROADMAP.md`
- Modified: `docs/sessions/INDEX.md`
- Modified: `docs/sessions/NEXT-SESSION.md`
- Added: `docs/sessions/2026-06-13-cowork-appdev-voxelab-aries-no-go-wrap.md`
- Modified in parent repo: `ai-operating-model/docs/agents/lesson-spotter-calibration.md`
- No untracked markdown from md-hygiene.
- Temporary source-inspection directories under `/tmp` were cleaned during the session.

## Commits

Web / 3dprintassistant:

- `f9d3b88` docs: plan Voxelab Aries printer add
- `cd834c8` test: align nozzle-cap audit with clamp warnings
- `3e381e0` data: add Voxelab Aries (Aries Series)
- `af121ad` data: publish Voxelab Aries iOS overlay (content_version=2026061301)
- `2d1561b` Revert "data: publish Voxelab Aries iOS overlay (content_version=2026061301)"
- `aa0826e` Revert "data: add Voxelab Aries (Aries Series)"
- `7605166` docs: record Voxelab Aries no-go review

iOS / 3dprintassistant-ios:

- `63c291c` data: sync printers.json - add Voxelab Aries
- `8c38d02` Revert "data: sync printers.json - add Voxelab Aries"
- iOS remains local-only and ahead of `origin/main` by 2 commits under the iOS push gate.

Verification:

- `node scripts/validate-data.js` passed.
- `node scripts/picker-dry-run.test.js` passed.
- `node scripts/profile-matrix-audit.js > /tmp/profile-matrix-post-revert.md` passed.
- `node scripts/validate-ios-printer-overlay.js` passed.
- `diff -q 3dprintassistant/data/printers.json 3dprintassistant-ios/3DPrintAssistant/Data/printers.json` had no output after the iOS revert.
- Live overlay check returned `content_version: 2026051202`, `brands: []`, `printers: ["sparkx_i7"]`.

## Open questions / Follow-up

- Locked next entry: define and review the missing-acceleration-data path before real backlog seeding. Candidate rule shape: manufacturer data beats reseller data; reseller/community data can support non-critical metadata, but profile/safety-critical fields need manufacturer evidence or an explicitly named app-side conservative cap with provenance and reviewer approval.
- Decide the iOS test gate for data-only printer additions on this machine: install/verify a local full-Xcode XCTest path, run XCTest on another available Mac/CI, or document a narrow overlay-only waiver rule.
- Md-hygiene: root markdown stubs are canonical only; no untracked markdown; ROADMAP stale banner was refreshed; no MCP ledger update needed because no MCP capability was tested.
- Lesson/finding sweep: compact lesson spotter returned 1 product-process candidate, accepted into 3dpa ROADMAP/NEXT only. No new K1/K2/K3/K4 finding captured.
- Memory sweep: no durable personal/cross-project memory to add. The lesson is project-specific and captured in 3dpa docs.
- Vault sweep: nothing durable to propagate beyond 3dpa project docs.

Verify-before-mutate summary:

```text
verify-before-mutate ledger: 6 flags (0 resolved, 6 ignored), 5 destructive-core, 189 unclassified
note: resolved = path-touched, not premise-proved (spec M1)
  - [ignored] Bash /Users/mustafaozturk-macmini/dev/Claude/Projects/ai-operating-model/docs/ensemble/2026-06-12-agent-factory-tweaks-review-transcript.jsonl (rename)
  - [ignored] Bash /Users/mustafaozturk-macmini/dev/Claude/Projects/ai-operating-model/docs/ensemble/2026-06-12-agent-factory-tweaks-review-team-id.txt (rename)
  - [ignored] Bash /private/tmp/Voxelabs-Aquila-Firmware (delete)
  - [ignored] Bash /private/tmp/voxelab-aries-fw (delete)
  - [ignored] Bash /private/tmp/voxelmaker-win (delete)
  - [ignored] Bash /private/tmp/voxelmaker-mac (delete)
```

## Next session

Start with the locked entry in `docs/sessions/NEXT-SESSION.md`: patch the printer-addition process for missing manufacturer acceleration data and the iOS test/waiver gate, then re-run Aries through the updated flow before seeding the real Discord backlog.
