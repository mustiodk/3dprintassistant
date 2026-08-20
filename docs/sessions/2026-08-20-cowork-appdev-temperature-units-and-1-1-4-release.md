# 2026-08-20 — Temperature-units decision + iOS 1.1.4 release close

## Durable context

- **iOS 1.1.4 is live.** The owner confirmed approval and release. A same-session Apple lookup against both the Danish and US storefronts returned `version: 1.1.4` and `currentVersionReleaseDate: 2026-08-19T17:54:22Z`. The submitted build was `202608182214` from release commit `991deba`; the iOS repository is now clean/current at `1e3de11`.
- **Temperature and measurement units stay unchanged.** Research across the printer/slicer ecosystem supported Celsius and metric as the operational convention even for US users. The owner explicitly chose no action if that was the industry standard. Do not add a Fahrenheit preference or a broad metric/imperial toggle from this research alone.
- No product code, engine logic, data, export behavior, web UI, or iOS UI changed in this session. The next implementation entry point remains Train 1 web tasks 1–5; Train 1 iOS UI tasks 6–10 still consume the 2.0 design spec first.

## What happened

1. Cold-started 3dpa and verified the web and iOS repositories were on `main`, clean and current. The separate Android checkout remains missing and was out of scope.
2. Investigated how printer manufacturers, slicers and community workflows treat units. The evidence supported keeping Celsius/metric as the product posture; the owner chose no product change.
3. On owner confirmation that 1.1.4 had been approved and released, verified the public release independently through Apple's DK and US lookup endpoints.
4. Ran the full Trigger A close: tracking drift, Markdown hygiene, lesson-spotter calibration, findings sweep, resume-surface regeneration, commit/push and final verification.

## Files touched

- `docs/planning/ROADMAP.md` — records 1.1.4 as live, closes the release checklist and captures the no-action units decision.
- `docs/sessions/INDEX.md` — adds this session.
- `docs/sessions/NEXT-SESSION.md` — removes the stale review/manual-release state and regenerates the Train 1 entry point.
- This session log.
- Parent `CLAUDE.md` + `AGENTS.md` — byte-identical project table update to 1.1.4 live.
- `ai-operating-model/docs/agents/lesson-spotter-calibration.md` — compact no-finding calibration row.

## Commits

No product code shipped. This close produces documentation-only commits in the 3dprintassistant repo and its parent project router.

## Open questions / follow-up

- **Units:** closed with no action. Reopen only on direct user evidence or a new feature that genuinely needs alternate display units.
- **Known web nozzle-picker gap:** unchanged and deliberately outside this session.
- **Markdown hygiene:** no orphan root stubs, untracked Markdown, real secret hits, CLAUDE/AGENTS drift, orphan session logs, or bare trailing `</content>` tags. ROADMAP still has completed historical rows under Active Work Queue; archive them in a dedicated cleanup rather than expanding this release close.
- **Lesson spotter:** compact mode, zero candidates. The no-change product decision and release-state correction belong on project tracking surfaces, not as new AI-method findings.
- **Findings sweep:** no K1, K2, K3 or K4 finding; no reviewer or MCP behavior was in scope.
- **Verify-before-mutate summary (verbatim):**

  ```text
  verify-before-mutate ledger: no entries this session
  ```

- **Memory sweep:** no durable memory update proposed; the release truth and product decision belong in ROADMAP/session history. Memory writes were not requested.
- **Vault sweep:** nothing durable to promote to the vault.

## Next session

Execute Train 1 from `docs/superpowers/plans/2026-08-17-train1-my-gear-setups-plan.md`: web tasks 1–5 first. Before iOS UI tasks 6–10, land the chosen 2.0 redesign direction as a design spec.
