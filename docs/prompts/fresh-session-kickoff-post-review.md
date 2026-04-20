# Fresh session kickoff — post 3rd-party review

Paste this as the first message of a new Cowork session after the 3rd-party review has been dispatched (or returned).

---

## Context for this session

A complete 3rd-party code & data review starter kit was prepared on 2026-04-20 and lives in:

**`/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3rd-party-review/`**

Reviewed revisions were:
- Web: `c4c5071` (IMPL-040 shipped, live on 3dprintassistant.com)
- iOS: `24aef66` (IMPL-040 sync + CI-enforced parity guards, TestFlight build `202604200952`)

## Before doing anything this session

Read, in order:

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — my standing rules, memory hot cache, shorthand glossary, and most-recent project status summary.
2. `3dprintassistant/docs/planning/ROADMAP.md` — the single source of truth for all planning. Check the "Last updated" line first; that tells you what the most recent state is.
3. The most recent file in `3dprintassistant/docs/sessions/` (latest `YYYY-MM-DD-cowork-*.md`). This tells you what the last session actually did, which often disagrees with what the ROADMAP claimed.
4. `3dprintassistant/docs/3rd-party-review/README.md` + `REVIEW-BRIEF.md` — the review scope + deliverable format we sent out.
5. If the review has come back: read the reviewer's `00-executive-summary.md` first, then scan the CRITICAL + HIGH findings before the MEDIUM / LOW ones.

## How to pick what to work on

### If the review is still out
Default to small, additive work that doesn't touch the architecture the reviewer is evaluating. Good candidates, ordered by value:
- Write a new material to `data/materials.json` (requests tracked in Discord `#web-app-feedback`, `#ios-app-feedback`, and `#feature-requests`).
- Add a new printer to `data/printers.json` similarly.
- macOS companion app (#037 in ROADMAP — spec already locked at Path 3 / SwiftUI + WKWebView with bundled offline assets). The kickoff prompt lives at `docs/prompts/macos-app-kickoff.md`.
- Wait for EU DSA Trader Status verification (nothing to do until Apple responds).

Do **not** rewrite `engine.js`, `getFilters`, `resolveProfile`, or any of the IMPL-039/040 machinery while the review is out. Those are the things the reviewer is looking at; changing them mid-review would waste their time.

### If the review has come back
1. Create a new session log at `docs/sessions/YYYY-MM-DD-cowork-appdev.md` noting the review arrived + your initial triage pass.
2. Walk the reviewer's findings in this order:
   - CRITICAL (fix before touching anything else — these block a release)
   - HIGH (schedule for this week)
   - MEDIUM + LOW (triage into ROADMAP backlog)
   - OBSERVATIONS (update ROADMAP if a pattern emerges; otherwise record + move on)
3. For each actionable finding, propose a fix in plain English first. Get my sign-off before implementing. Reviewer opinions are valuable but not always right — I want to validate each one individually.
4. Update [CLAUDE.md](CLAUDE.md) if the review surfaced a new "Critical Rule" class concern (like IMPL-040 did).
5. Don't batch multiple reviewer findings into one commit. One finding = one commit = one push, so each is independently revertable.

## Workflow rules (standing — do not drift)

- **Progress bar on every multi-step task.** Format: `[🟩🟩🟩🟩⬜⬜⬜⬜⬜⬜ 40%] Step description`. User wants this always visible in Cowork sessions.
- **ROADMAP is truth.** Read it before reporting any status. Claude Code updates it directly; it's always more current than my memory.
- **Quality over speed.** MVP phase is over. Web + iOS are both live.
- **Right thing, not easy thing.** We're live now — no band-aid fixes. Full correct solution across web + iOS always. Do not narrow scope to "the minimal diff" — the rule is in `memory/feedback_right_thing_not_easy_thing.md`.
- **Session logs.** Every Cowork session ends with a log at `docs/sessions/YYYY-MM-DD-cowork-{type}.md` (e.g. `appdev`, `uiux`, `review-response`).
- **Don't push to iOS `main` without explicit sign-off.** It triggers TestFlight.

## What I want out of this session

(Fill this in when you start the session. Examples below — replace with your actual ask.)

- [ ] "Triage the review findings."
- [ ] "Add Material XYZ."
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
| iOS current version | 1.0.1 (build 202604200952 — in TestFlight as of 2026-04-20) |
| EU distribution | Blocked on DSA Trader Status verification (submitted 2026-04-16) |
| Discord server | Private. Inbox channels: `#ios-app-feedback`, `#web-app-feedback` |
| Primary dev | Musti (solo, Copenhagen, mustiodk@gmail.com) |
| Review starter kit | `docs/3rd-party-review/` — 5 docs + references |

Ready.
