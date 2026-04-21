# Fresh session kickoff — post-internal-review

Paste this as the first message of a new Cowork session. Internal review + Phase 1 domain walkthrough are done (2026-04-20). External 3rd-party review is still out.

---

## Context for this session

State as of 2026-04-21:

- **Web app** live at [3dprintassistant.com](https://3dprintassistant.com) — commit `c4c5071` (IMPL-040 shipped).
- **iOS app** live on the App Store in ~121 non-EU countries — commit `24aef66`, v1.0.1 build `202604200952` on TestFlight. EU distribution still blocked on DSA Trader Status verification.
- **Internal review** completed 2026-04-20 via `/code-reviewer`. Full deliverable at [`docs/reviews/2026-04-20-internal/`](../reviews/2026-04-20-internal/) (9 files). **59 findings: 3 CRITICAL / 14 HIGH / 22 MEDIUM / 10 LOW / 10 OBS.**
- **Phase 1 domain walkthrough** ran 10 real combos through the live engine and surfaced 2 additional CRITICAL + 3 HIGH findings (already merged into the review deliverable). Harness at [`scripts/walkthrough-harness.js`](../../scripts/walkthrough-harness.js), raw output at [`docs/reviews/2026-04-20-internal/domain-walkthrough.md`](../reviews/2026-04-20-internal/domain-walkthrough.md).
- **External 3rd-party review** is still out. Starter kit at [`docs/3rd-party-review/`](../3rd-party-review/). When findings return, merge into [`ROADMAP.md`](../planning/ROADMAP.md) IR-0.
- **Export** is disabled (engine + iOS UI) pending [IMPL-036] rewrite. Export-path findings are deferred (see IR-deferred in ROADMAP).

## Before doing anything this session

Read, in order:

1. [`/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`](../../../CLAUDE.md) — standing rules, memory hot cache, shorthand glossary, most-recent project status.
2. [`3dprintassistant/docs/planning/ROADMAP.md`](../planning/ROADMAP.md) — single source of truth for all planning. Check the "Last updated" line first. The **IR-\*** section (near the top) is the current priority queue.
3. The most recent file in [`3dprintassistant/docs/sessions/`](../sessions/) (latest `YYYY-MM-DD-cowork-*.md`). Tells you what the last session actually did.
4. [`3dprintassistant/docs/3rd-party-review/README.md`](../3rd-party-review/README.md) + [`REVIEW-BRIEF.md`](../3rd-party-review/REVIEW-BRIEF.md) — external review scope + deliverable format.
5. If the external review has returned: the reviewer's `00-executive-summary.md`, then CRITICAL + HIGH findings.

## Default behavior if I don't give a brief

### If the external 3rd-party review is still out (current state)

Start triaging **IR-0** in ROADMAP.md — CRITICAL → HIGH order, one finding per commit, sign-off per fix. **Do not batch.**

IR-0 queue (full list in ROADMAP, short form here):

1. **[CRITICAL-002]** Bed-temp clamp to `printer.max_bed_temp` + warning. `[Web+iOS]`
2. **[CRITICAL-003]** Validate preset IDs in `resolveProfile`; warn on unknown. `[Web+iOS]`
3. **[CRITICAL-001]** Route iOS feedback through `/api/feedback` Worker. `[iOS+Worker]` (ship as v1.0.2)
4. **[HIGH-012]** Fix wrong-printer "A1/A1 Mini" why-text for non-A1 bedslingers. `[Web+iOS]`
5. **[HIGH-014]** Verify A1 mini real `max_bed_temp` — data says 100, Bambu says 80. `[You]`
6. **[HIGH-010]** Rate-limit + sanitise `/api/feedback`. `[Worker]`
7. **[HIGH-002]** Tighten IMPL-040 parity test (exact-count + no silent skips). `[iOS]`
8. **[LOW-001]** Rotate Sentry DSN. `[iOS]` (10 min)
9. **[MEDIUM-015/016]** Slicer capabilities: add lightning to Prusa, adaptivecubic to Bambu+Orca. `[Web+iOS]`
10. **[LOW-002]** Rewrite HIPS enclosure reason (ABS copy-paste). `[You]` text, `[Code]` apply.

Propose the fix plan in plain English first — get sign-off before implementing.

### If the external 3rd-party review has returned

1. Create session log at `docs/sessions/YYYY-MM-DD-cowork-appdev.md` noting review arrived + initial triage pass.
2. Merge external findings into [`ROADMAP.md`](../planning/ROADMAP.md) IR-0 (or new IR-6). Cross-reference against existing 59 findings — de-dupe.
3. Walk findings in CRITICAL → HIGH → MEDIUM → LOW → OBSERVATION order. **One finding = one commit. Get sign-off per fix. Do not batch.**
4. Trust the external reviewer on domain-correctness findings (if they print regularly and say "this is wrong", believe them over any formula).
5. Update `CLAUDE.md` if a new "Critical Rule" class concern emerges.

### If I want something non-architecture instead

Good candidates (do not touch `engine.js` / IMPL-039 / IMPL-040 while external review is out):
- Add a material to `data/materials.json` (requests in Discord `#web-app-feedback`, `#ios-app-feedback`, `#feature-requests`).
- Add a printer to `data/printers.json` (same sources).
- macOS companion app (#037 in ROADMAP — spec locked at SwiftUI + WKWebView with bundled offline assets). Kickoff prompt: [`macos-app-kickoff.md`](macos-app-kickoff.md).

## Workflow rules (standing — do not drift)

- **Progress bar on every multi-step task.** Format: `[🟩🟩🟩🟩⬜⬜⬜⬜⬜⬜ 40%] Step description`. Always visible in Cowork.
- **ROADMAP is truth.** Read [`ROADMAP.md`](../planning/ROADMAP.md) before reporting status. Claude Code updates it directly — always more current than memory.
- **No doc sprawl.** Don't create standalone `PLAN.md` / `FINDINGS.md` / `NOTES.md` files. Merge into ROADMAP (planning) or existing review deliverable files (findings). The only exception is machine-generated output (e.g. `domain-walkthrough.md` — regeneratable by a script).
- **Right thing, not easy thing.** Web + iOS are live. No band-aid fixes. Full correct solution across both platforms every time. Rule documented in `memory/feedback_right_thing_not_easy_thing.md`.
- **Quality over speed.** MVP phase is over.
- **One finding = one commit.** Don't batch review findings. Each should be independently revertable.
- **Session log.** End every Cowork session with a log at `docs/sessions/YYYY-MM-DD-cowork-{type}.md` (`appdev`, `uiux`, `review-response`).
- **Don't push to iOS `main` without explicit sign-off.** It triggers TestFlight.

## What I want out of this session

(Fill in when you start the session — examples below, replace with your ask.)

- [ ] "Start IR-0 triage — first item."
- [ ] "Work on [specific finding code]."
- [ ] "External review returned — walk the findings."
- [ ] "Add material/printer XYZ."
- [ ] "Start macOS app scaffolding."
- [ ] "Something else entirely."

---

## Quick facts Claude should have fresh in context

| Item | Value |
|------|-------|
| Web repo | https://github.com/mustiodk/3dprintassistant |
| iOS repo | https://github.com/mustiodk/3dprintassistant-ios |
| Web live URL | https://3dprintassistant.com |
| iOS App Store link | https://apps.apple.com/app/3d-print-assistant/id6761634761 |
| iOS current version | 1.0.1 (build 202604200952, TestFlight as of 2026-04-20) |
| EU distribution | Blocked on DSA Trader Status verification (submitted 2026-04-16) |
| Discord server | Private. Inbox channels: `#ios-app-feedback`, `#web-app-feedback`, `#3dpa-ios-feedback`, `#feature-requests` |
| Primary dev | Musti (solo, Copenhagen, mustiodk@gmail.com) |
| Reviewed commits | web `c4c5071`, iOS `24aef66` |
| Internal review deliverable | [`docs/reviews/2026-04-20-internal/`](../reviews/2026-04-20-internal/) |
| Walkthrough harness | [`scripts/walkthrough-harness.js`](../../scripts/walkthrough-harness.js) |
| External review kit | [`docs/3rd-party-review/`](../3rd-party-review/) |
| Findings tally | 3 CRITICAL / 14 HIGH / 22 MEDIUM / 10 LOW / 10 OBS (59 total, 2026-04-20) |

Ready.
