# Next Session — App Store Connect Upload

> Copy everything below the line and paste as the first message in a fresh Cowork chat.

---

Start by reading these three files in order (do NOT skip — the ROADMAP moves faster than memory):

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — project rules, memory, shorthand
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md` — single source of truth (read the "Project status at a glance" table + the BR-6 and BR-10 sections)
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-04-14-cowork-appdev.md` — the most recent session log

Then confirm back to me:
- "iOS code is complete — last commits: iOS `cbf0947`, web `bccfca4`"
- "Remaining for App Store: upload in ASC + privacy labels + submit"

## What we're doing this session

**Only manual ASC work remains.** The iOS app is code-complete, all cross-device UI fixes are in, 18/18 unit tests pass, screenshots are fresh (iPhone 17 Pro Max, 1320×2868). Deadline is **April 28**.

The three steps:

### 1. Upload screenshots + metadata
- Screenshots: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/docs/screenshots/01-home.png` … `09-checklist.png` (9 files, all at 1320×2868)
- Metadata (copy-paste ready): `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/docs/app-store-metadata.md`
  - App Name: "3D Print Assistant"
  - Subtitle: "Print settings made simple"
  - Promotional Text, Description, Keywords — all in that file
  - Support URL: `https://3dprintassistant.com/support`
  - Privacy Policy URL: `https://3dprintassistant.com/privacy`
  - Category: Primary Utilities, Secondary Productivity
  - Age Rating: 4+

### 2. Fill Privacy Nutrition Labels
- File: `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/docs/app-store-privacy-labels.md`
- **Answer "Yes"** to "Does the app collect data?" (Sentry runs)
- Declare: Diagnostics → Crash Data + Performance Data + Other Diagnostic Data
- All three: NOT used to track, NOT linked to user, used for App Functionality
- Everything else: No

### 3. Select latest TestFlight build + submit for review

## Tool routing

- I (Claude) CAN drive the ASC web UI via the Chrome MCP (tool name: `mcp__claude-in-chrome__*`). If the extension is connected, I can read the page, click, fill forms, etc. You handle 2FA + the final "Submit" button.
- I CANNOT log into your Apple ID — that's all you.
- If anything on the web app side needs a last-minute change (e.g. metadata typo): web repo is `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/`, auto-deploys from `main`.

## Rollback safety

- Last commits: iOS `cbf0947`, web `bccfca4`
- Pre-UI-review rollback tag on both repos: `pre-ui-review-2026-04-14`
- To roll back: `git reset --hard pre-ui-review-2026-04-14` in either repo

## Post-submission (not for this session)

Backlog starts on the refactoring items in ROADMAP "Post-release" section (PR-1 typing, PR-2 view models, PR-3 Codable decoding, PR-5 accessibility). Also the Phase 2.7a Bambu export fix remains open.

---

**When you're ready, open Chrome to App Store Connect, tell me what you see, and we'll go step by step.**
