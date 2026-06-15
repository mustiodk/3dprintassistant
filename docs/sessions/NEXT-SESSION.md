# NEXT-SESSION — 3dpa

**Purpose:** kickoff prompt for the next 3dpa session.

**Last updated:** 2026-06-15 (S1 + overlay-collision hardening SHIPPED to TestFlight as v1.0.5). **v1.0.5 is on TestFlight** — S1 contextual-feedback prefill fix (`ae03510`) + Part C overlay disjoint-guard hardening (`af4bbe0`) + version bump (`518f781`); run [27569280416](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/27569280416) = success; iOS `origin/main` = `518f781`; **112 unit + 2 UITest green** on the now-full-Xcode mac-mini. **Locked next = the owner's on-device S1 acceptance verdict.** Open in parallel: the overlay **Phase-4b graduation** (web) + the **S2/S3** pipeline topics.

**State of the feedback-pipeline set (S1–S5):**
- **S1** ✅ shipped to TestFlight in v1.0.5 (`ae03510`). **On-device acceptance pending** (the real S1 gate — built+uploaded ≠ accepted).
- **S2** intake capture completeness — QA-green spec+plan, **not executed.** Web Worker, immediate (auto-deploy), local Node tests. Independent.
- **S3** Scout robustness + learned-guardrails config — QA-green spec+plan, **not executed.** Script+config, local Node tests. Independent. Unblocks S4.
- **S4** Intake Retrospective — QA-green spec+plan; **gated on S3 landing.**
- **S5** Assistant autonomy ladder — QA-green spec+plan; **gated on S4 landing.**

---

>>> START >>>

Read in order:
1. `Projects/CLAUDE.md` (or `AGENTS.md`) — top-level rules.
2. `Projects/3dprintassistant/CLAUDE.md` + `docs/3dpa-context.md` — architecture + engine + standing rules.
3. `docs/planning/ROADMAP.md` — banner + Active Work Queue (S1 shipped; overlay hardening shipped; S2–S5 status).
4. `docs/sessions/INDEX.md` + the last 3 session logs, especially
   `2026-06-15-cowork-appdev-s1-overlay-hardening-1.0.5-ship.md` (this ship).
5. `docs/sessions/NEXT-SESSION.md` (this file).
6. For the chosen work: the topic's spec + plan (`docs/superpowers/{specs,plans}/2026-06-15-s*`) in full, OR `docs/runbooks/printer-addition-protocol.md` (Phase 4b) for the overlay graduation.

Today's task — pick by what the owner reports:

- **If owner reports the S1 on-device verdict:** GO → S1 done; consider submitting v1.0.5 to App Store review (or hold on TestFlight). Regression → focused fix arc on the reported entry point (the mac-mini runs XCTest locally now — reproduce there first).
- **Overlay Phase-4b graduation (web — recommended clean follow-up):** republish `catalog/ios-printer-overlay-v1.json` WITHOUT Aries/Mega-X (now bundled in v1.0.5) + add a `1.0.5` baseline to `catalog/ios-bundled-catalog-baselines.json`; run `scripts/validate-ios-printer-overlay.js`; verify live via `curl`. Per `docs/runbooks/printer-addition-protocol.md` Phase 4b. Part C makes a missed graduation non-fatal, but this is the clean step.
- **S2 or S3 (independent web/script):** execute per its gated plan — each gate = implement → sub-agent review → patch → QA → commit, advance only on green. S3 unblocks S4/S5.

Scope / gating:
- S1 shipped; S2/S3 independent; **S4 needs S3 landed; S5 needs S4 landed.**
- The mac-mini now runs iOS XCTest locally (Xcode 26.5 + iOS 26.5 sim + `Config.xcconfig`) — use it for any iOS change instead of relying on the data-only waiver. Gotcha: rapid back-to-back `xcodebuild test` can wedge the sim → `xcrun simctl shutdown all` + re-run.

Standing rules:
- ROADMAP is truth; read it before status claims.
- iOS push gate: iOS commits stay local until TestFlight-ready + owner dispatch (v1.0.5 already pushed/dispatched).
- One finding = one commit. Web auto-deploys from `main`.
- Develop review-gated work under a `claude-sync.sh hold`; release after the deliberate commit.
- Attachments don't reach the session — if the owner says "attached", ask for a plain-text paste.

<<< END <<<

## Maintenance Note

Regenerated on Trigger A / Trigger B / explicit owner ask only. Locked item = **owner's on-device S1 acceptance verdict**; open follow-ups = overlay Phase-4b graduation (web) + S2/S3 execution. S1 shipped in v1.0.5 (`ae03510`); Part C overlay hardening shipped (`af4bbe0`); v1.0.5 on TestFlight (run 27569280416, `518f781`).
