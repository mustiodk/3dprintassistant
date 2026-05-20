# 2026-05-20 — Cowork (appdev): v1.0.4 submitted for App Store review

## Durable context

- **v1.0.4 SUBMITTED for App Store review 2026-05-20.** Build `202605192119` (GitHub Actions run [26125919796](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/26125919796)), MARKETING_VERSION 1.0.4, commit `ed08507`. Manual Release selected. Owner will report approval/release when it lands.
- **Decision: did NOT bundle any backlog into v1.0.4.** The load-bearing principle: a TestFlight build the owner has already tested is a *known-good artifact* — bundling anything resets the test cycle and re-introduces regression risk into a validated build. Nothing in the backlog cleared the bar (must be iOS-binary-affecting AND user-facing AND high-value AND low-risk). The v1.0.5 hygiene carries are refactor/test-only (no user value); the only user-facing iOS candidate (FDM-only scope copy) is too marginal to reset a test for. Web-only items (`[CRITICAL-001-followup]`, `[LOW-011]`) are decoupled — they ship to web independently and never needed to gate on the iOS review.
- **v1.0.4 is an accuracy/honesty release, NOT a feature release.** Critically: **no new data collection → no App Privacy change** (unlike v1.0.3, which added Usage Data). The submit doc reflects this — App Privacy left untouched. User-facing story = environment-aware recommendations (cold/hot/humid scaling of fan/temp/first-layer-bed) + honest post-clamp warnings + Creality i7 baked into bundled catalog + Advanced cooling detail (env-scaled fan + slow-below-layer-time row).
- **Submit doc** created at [`3dprintassistant-ios/docs/app-store-v1.0.4-submit.md`](../../../3dprintassistant-ios/docs/app-store-v1.0.4-submit.md), parallel to the v1.0.3 doc. Contains paste-ready What's New / Promotional Text (unchanged) / Review Notes / pre-submit checklist.

## What happened / Actions

1. Cold start (Trigger C) — read spine, verified git state. NEXT-SESSION offered 3 lanes; owner picked **Lane C** (v1.0.4 → App Store submission) after confirming TestFlight GO.
2. Pre-submit backlog-bundle assessment (matrix-style) → recommendation: **submit as-is, bundle nothing.** Owner agreed.
3. Confirmed no v1.0.4 submit doc existed (only v1.0.3). Pulled the actual v1.0.4 changeset (commits since `3a59cd1`) to ground release notes in shipped reality, not memory.
4. Created `docs/app-store-v1.0.4-submit.md` in owner's established voice; filled build number `202605192119` on owner-supply.
5. Owner submitted v1.0.4 for review.

## Files touched

- **Untracked (new):** `3dprintassistant-ios/docs/app-store-v1.0.4-submit.md`
- Web (this wrap): session log + INDEX + ROADMAP + NEXT-SESSION.

## Commits

- iOS: `docs: add v1.0.4 App Store submit notes` (docs-only; local — push is owner's call per iOS push gate, though v1.0.4 is now ship-submitted so a docs push is harmless).
- Web: this wrap commit (log + INDEX + ROADMAP + NEXT-SESSION).

## Open questions / Follow-up

- **Md-hygiene:** ROADMAP "Active Release: v1.0.3" header is now stale (v1.0.4 submitted). Flipped in this wrap.
- `[CRITICAL-001-followup]` (iOS feedback → own Discord channel, web/Worker-only, ~15 LoC) was offered as parallel work during review — owner did not take it up this session; remains in Active Work Queue.
- iOS submit-doc commit is local; owner decides whether to push.

## Next session

Owner will report when v1.0.4 is approved/released. Until then, three open lanes (any order):
- **Web-only `[CRITICAL-001-followup]`** — route iOS feedback to a separate Discord channel; zero risk to the in-review binary.
- **Lane A — Resin PoC** (v5 mechanical pass / Gate 1 desk research / bridge cwd-scope preamble).
- **Lane B — v1.0.5 hygiene** carry bundle.
