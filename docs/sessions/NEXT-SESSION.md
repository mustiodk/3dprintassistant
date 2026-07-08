# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-08 evening (OWNER PIVOT: the 2026-07-08 "iOS v2 rebuild" goal was mis-stated — the real goal is an **Android app** (first priority) and later a **macOS app**. The iOS v2 planning bundle is **PARKED as a reference/evidence base** (Gate 0 never ratified); its audit + contracts + review-hardened decision framework are the input for the Android/macOS planning session below.)
**Locked next entry point:** the **Android + macOS planning session** (prompt below). Also still open: owner on-device Mine acceptance of iOS v1.0.7 on TestFlight.

---

Copy everything between the markers into a new session.

>>> START >>>
You are working on the 3D Print Assistant (3dpa) — live web app (3dprintassistant.com) + live iOS app, one shared engine. Run autonomously; I may not be here to answer questions — patch holes in this goal yourself, write your interpretation down explicitly, and turn genuine unknowns into Gate 0 owner decisions with recommended defaults instead of blocking.

**Cold start (3dpa read order) — read fully before acting:**
1. ~/dev/Claude/Projects/CLAUDE.md and 3dprintassistant/CLAUDE.md
2. 3dprintassistant/docs/3dpa-context.md (evergreen context — NOTE: its "not in scope: Android — no plans" line is now FALSE per this pivot; fixing it is part of your job)
3. 3dprintassistant/docs/planning/ROADMAP.md (source of truth; see the 2026-07-08 pivot note in the banner)
4. docs/sessions/INDEX.md + last 3 session logs in full (start with 2026-07-08-cowork-appdev-ios-v2-audit-plan.md — its addendum records this pivot)
5. **The reusable evidence base (read all four):** docs/reviews/2026-07-08-ios-v2-rebuild-audit.md (codebase audit + §4 cross-platform contracts — platform-neutral, your foundation) · docs/superpowers/specs/2026-07-08-ios-v2-rebuild-design.md (PARKED as a program, reuse its decision framework D0–D7/D5a/D5c and §3 quality bar) · docs/superpowers/plans/2026-07-08-ios-v2-rebuild-plan.md (reuse the gate-shape: standing protocol, one-gate-per-session, drift sweeps, autonomy map) · docs/reviews/2026-07-08-ios-v2-rebuild-review.md (what three hostile reviewers caught — avoid re-making those mistakes on Android)
6. **Prior Android prototype:** top-level CLAUDE.md row `3dpa-android` + `Projects/3dprintassistant-android/` — CAUTION: may be MISSING on this machine (it lives on the other Mac, 4 commits ahead of origin). If missing locally, clone github.com/mustiodk/3dprintassistant-android read-only to inspect what origin has. HARD BOUNDARY: do NOT push to that repo (Phase 1 no-push rule stands until I relax it). Read its NEXT-SESSION.md/state and assess: reuse, mine for parts, or restart clean — with a recommendation.

**Today's task (planning only — NO implementation; execution happens in later gated sessions):**
Produce a triple-reviewed planning bundle, same shape as the 2026-07-08 iOS v2 bundle, for:
(A) **Android app — first priority, full depth:** Android-specific audit-delta/research → design spec (decisions with autonomous defaults, owner can override at its Gate 0) → gated master plan (G0–Gn, one autonomous session per gate, per-gate micro-plans at gate entry).
(B) **macOS app — second priority, lighter:** an assessment + phased plan section or short companion spec (stack decision, reuse surface, distribution), explicitly sequenced AFTER Android ships; do not let it bloat the Android work.

**Non-negotiable constraints (from the audit §4 contracts — verify each against Android reality):**
- engine.js + data/*.json stay byte-identical, web is master — NEVER port engine logic to Kotlin/Swift. Android needs a JS runtime decision (research + compare: QuickJS wrappers, Javet/V8, WebView-as-bridge; startup cost, binary size, maintenance) — this is the load-bearing Android decision, treat it like the iOS bundle treated D5/D5a.
- State-codec FIELDS, Workshop envelope v1 byte-compat + op-log semantics, learns layer as byte-identical JS (the D5 principle), analytics privacy shape (platform value for Android), feedback Worker path.
- Overlay: ios-printer-overlay is iOS-specific — decide Android's printer-delta strategy (consume a same-shaped overlay, or bundle-only + releases).
- Quality bar: the §3 invariants pattern (fixtures, golden mirrors, TDD RED-first, hostile review per gate, cross-model at architecture + release gates).

**Known owner-side dependencies to surface in the autonomy map (don't guess — make them Gate 0 questions with defaults):** Google Play Console account + signing + fees (does it exist?), Android test device availability, which Mac carries Android Studio/toolchain, CI (GitHub Actions) for Play delivery, and for macOS: Apple distribution route (Mac App Store vs notarized direct) + stack (SwiftUI multiplatform reusing iOS learnings vs Catalyst).

**Scope question to answer explicitly in the spec:** is Android v1 parity-with-iOS-v1.0.7, or does it bake in the iOS-v2 improvement content (native learns-loop, troubleshooter, journal, a11y, i18n EN+DA) from day one? Recommend and justify (the audit says the learns-loop is the product's differentiator — weigh that).

**Process (standing):** Work Protocol Full lane (user-facing, cross-platform, architecture, new-platform release). Write → hostile fresh-context sub-agent review (design gate AND plan gate, separately) → patch → Codex cross-model round (bridge --health first, then bridge --mode codex-only; direct codex exec -s read-only fallback) → patch → commit (one concern = one commit, web repo docs tree: audit-delta in docs/reviews/, spec in docs/superpowers/specs/, plan in docs/superpowers/plans/). Fix the 3dpa-context Android-scope line in its own commit. Update ROADMAP banner + queue. Progress bar every multi-step turn. When done: executive summary + full Trigger A wrap-up (3dpa scope).

**Housekeeping riders:** keep the iOS v2 bundle referenced as PARKED (do not delete anything); if the Android plan reuses its gates, cite rather than copy.

My answers to Gate-0-style questions, if I filled them in before pasting (blank = decide a default yourself):
- Play Console account exists: [ ]
- Android test device I own: [ ]
- Mac that should carry the Android toolchain: [ ]
- Android v1 bar (iOS-parity vs improved-from-day-one): [ ]
- Parked android prototype (evaluate vs skip): [ ]
<<< END <<<

**Maintenance note:** regenerated on Trigger A / Trigger B / explicit owner ask only — a stale NEXT-SESSION between sessions is fine (see `CLAUDE.md → Session-log protocol`).
