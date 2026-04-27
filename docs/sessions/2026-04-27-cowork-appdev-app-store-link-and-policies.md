# 2026-04-27 — Cowork (appdev): App Store link on web + session policy hardening

## Durable context

- **EU DSA Trader Status approved 2026-04-27** — App Store now live worldwide for `id6761634761`. Removes the announcement hold that had been gating PR-8 retirement and the marketing flow. The 11-day wait (submitted 2026-04-16) is the data point if Apple verification timing comes up again.
- **iOS push gate is now stricter than NEXT-SESSION.md says.** New CLAUDE.md Standing Rule: don't push iOS to GitHub `main` until the version is fully ready for TestFlight testing. Supersedes the older "free to push if XCTest passes" guidance. Primary reason: keep `main` aligned with TestFlight state so `git log main` is authoritative for "what's live." Secondary: removes temptation to dispatch TestFlight off WIP (each dispatch burns ~10 min on `macos-26` at 10× rate; the 2026-04-23 switch to `workflow_dispatch`-only already pulled us back from 100% quota — verified at `testflight.yml:8`). Memory entry `feedback_ios_push_gate.md` mirrors the rule across conversations. **NEXT-SESSION.md rule #8 still has the old wording — flag for next regenerate.**
- **No-guessing rule is now binding.** Memory entry `feedback_no_guessing.md` + reinforced via in-session correction: before recommending anything about how a system behaves (forms, workers, endpoints, flags), open the actual file. No speculation presented as fact. Triggered by an in-session false premise where I claimed the feedback form didn't capture email; it does (`functions/api/feedback.js:254-260`).
- **App Store link approach for web — locked decisions:** storefront-less URL `https://apps.apple.com/app/id6761634761` (Apple's recommended form, auto-routes to visitor's storefront — works EU + worldwide); generic phone-outline SVG glyph rather than Apple-branded badge (avoids trademark/IP friction; the App Store destination handles Apple branding); two link points (header icon + nav button) instead of an in-app landing view (cleaner — no asset to maintain).
- **Git identity warning resolved.** Owner ran `git config --global user.name "Mustafa Ozturk"` + `user.email "4445666+mustiodk@users.noreply.github.com"` (GitHub-issued no-reply form, hides real email in public commit history). All future commits from this machine will attribute correctly. Previous commit `7d35f92` left as-is — single odd commit not worth a force-push.

## What happened / Actions

1. **Memory + policy sweep.** Owner asked for a binding "no guessing" rule after I speculated about the feedback flow. Saved `feedback_no_guessing.md` + index entry. Then pivoted to the iOS push-gate question: owner wanted no iOS pushes until ready for TestFlight. Drafted CLAUDE.md Standing Rule + memory entry. Initial draft framed Actions-minutes as primary motivation; corrected after reading `testflight.yml` — workflow is `workflow_dispatch:`-only so pushes consume zero minutes today. Re-framed: hygiene primary, minutes secondary (guardrail against using TestFlight as iteration loop).
2. **LOW-011 filed.** Discussion about the recently-arrived iOS feedback that came in without an email. Initial recommendation (Resend + Reply-To) re-evaluated after reading the actual code: web feedback form lacks helper text under the email field (iOS has it), and the Worker buries `Reply-to email` at the bottom of the embed. Filed as `[LOW-011]` in IR-5 backlog: web copy parity + Worker reorder. ~10 LoC. Resend deferred as YAGNI.
3. **PR-8 ship.** Owner picked option 1+2 (replace Beta nav + view + add header icon). Storefront-less URL `https://apps.apple.com/app/id6761634761`. Inline SVG phone glyph (no Apple branding). Edits across `index.html`, `app.js`, `style.css`, `locales/en.json`, `locales/da.json`. Verified live in Cloudflare Preview server: `navIOS` and `appStoreLink` present in DOM, EN+DA locale switch correct, zero new console errors (existing Sentry-loader warnings + `[MEDIUM-019-followup]` `max_mvs` 0.8mm gaps are pre-existing). One commit `7d35f92`, pushed to `main` → Cloudflare Pages auto-deploy.
4. **Doc updates.** ROADMAP project-status table (EU unblocked + worldwide live), PR-8 section (3 checkboxes ticked + shipped detail block), CLAUDE.md active-projects table + priority line.
5. **Git identity fix.** Verified config landed via `git config --global --get`; both values correct.

## Files touched

**Modified (web):**
- `index.html` — header App Store icon, nav `<a id="navIOS">`, deleted `viewBeta` div
- `app.js` — removed `viewBeta` toggle, `navBeta` handler, 4 stale `betaHero/betaCard` text-set calls, `currentView` comment
- `style.css` — `.nav-beta` + `.feedback-card--beta` removed; `.nav-ios` + `.app-store-link` added
- `locales/en.json` — removed 4 `beta*` keys, added `navIOS: "iOS App"`
- `locales/da.json` — removed 4 `beta*` keys, added `navIOS: "iOS-app"`
- `docs/planning/ROADMAP.md` — PR-8 closed, status table updated, `[LOW-011]` filed in IR-5

**Modified (top-level):**
- `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — iOS push gate Standing Rule + active-projects table + priority line
- `~/.claude/projects/.../memory/MEMORY.md` — 2 new index entries
- `~/.claude/projects/.../memory/feedback_no_guessing.md` — NEW
- `~/.claude/projects/.../memory/feedback_ios_push_gate.md` — NEW

**Untracked (unrelated, not staged):**
- `enoglekort_logo.png`, `mockup_e_nøglekort.png` — appear to belong to a different project (e-nøglekort = Danish e-key-card). Not 3dpa. **Hygiene flag — owner should move or `git rm` these from the 3dpa repo root next session.**

**Deleted:** none

## Commits

- `7d35f92` — `web: retire iOS Beta UI + add live App Store link [PR-8]` (pushed)

## Open questions / owner asks

- **NEXT-SESSION.md rule #8 wording is now stale.** Currently says "Never push iOS `main` if XCTest is red. Free to push otherwise." New CLAUDE.md rule supersedes. NEXT-SESSION is owner-triggered, so flagging — not auto-rewriting. Next regenerate should pull the updated push-gate language from CLAUDE.md.
- **Two stray PNG files in 3dpa repo root** (`enoglekort_logo.png`, `mockup_e_nøglekort.png`) appear unrelated — owner decision: delete, move, or commit?
- **`[LOW-011]` is owner-prioritised** — touch when nearby, no urgency.
- **Announcement flow remains the post-EU outstanding item** (Discord/Twitter/LinkedIn + day-1 monitoring). Now that EU is unblocked, this is the next non-DQ track.

## Vault sweep

Per CLAUDE.md vault-sweep checklist:

- **Strategic decision / "why" worth propagating:** YES — the iOS push gate rationale (hygiene primary, minutes secondary; backstory of the 2026-04-23 quota incident) is durable cross-project knowledge that fits `Obsidian Vault/20-Areas/Development/toolchain.md`. **Propose**: append a one-paragraph note covering "iOS push policy on 3dpa: gated to ship-readiness, not test-passing; rationale = repo hygiene + Actions-minutes guardrail." Owner decides.
- **New shorthand / term:** none.
- **Cross-project pattern:** the "no-guessing" rule applies to all coding work, not just 3dpa. **Propose**: a one-line in `Obsidian Vault/20-Areas/Development/toolchain.md` under a "working principles with Claude" section, or wherever cross-cutting collaboration rules live in the vault. Owner decides.
- **Hobby observation:** none.
- **Consulting insight:** none.
- **External source to ingest:** none.

Nothing strictly required — both items can land via the memory system + project CLAUDE.md and stay there. The vault entries would just give the owner a single place to look up "how do I work with Claude on toolchain stuff."

## Next session

- Either announcement flow (Discord/Twitter/LinkedIn copy + day-1 monitoring plan), or DQ-3 (Pressure / Linear Advance per material — current NEXT-SESSION.md target). Owner picks.
- If owner regenerates NEXT-SESSION.md before next session: pull updated push-gate rule from CLAUDE.md (rule #8 needs the new wording).
