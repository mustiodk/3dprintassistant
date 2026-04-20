# 3D Print Assistant — 3rd-party code review starter kit

**Version reviewed:** web `c4c5071` (live on [3dprintassistant.com](https://3dprintassistant.com)), iOS `24aef66` (TestFlight build `202604200952`, v1.0.1)
**Kit prepared:** 2026-04-20
**Owner:** Musti (solo developer, `mustiodk@gmail.com`)

---

## What is this?

A self-contained briefing package for an outside engineer / consultant to perform an **extensive project, data, and code review** of the 3D Print Assistant product across **both** the web app and the native iOS app. The review should pay particular attention to recent architectural changes that moved the engine from heavy hardcoding toward a future-proof data-driven model.

The owner is solo and has taken the product from MVP to App Store launch and a live web deployment in ~2 months. He wants a second pair of expert eyes before the next wave of work (macOS companion app, Windows port, more printer coverage, community profile layer).

## Who is this for?

A senior engineer (or small team) comfortable reading **JavaScript**, **Swift / SwiftUI**, and **JSON data schemas**, with an interest in:

- Cross-platform code sharing via **JavaScriptCore** (engine lives in JS, Swift wraps it on iOS)
- Domain modeling for 3D printing (slicer config, nozzle geometry, material profiles)
- Data-driven vs. hardcoded design patterns
- Small-team / solo-developer maintainability tradeoffs

## How to use this kit

Read in this order:

1. **[REVIEW-BRIEF.md](REVIEW-BRIEF.md)** — what we want reviewed, focus areas, non-goals, timeline.
2. **[ARCHITECTURE-OVERVIEW.md](ARCHITECTURE-OVERVIEW.md)** — high-level map of both codebases + shared engine pattern.
3. **[SETUP.md](SETUP.md)** — how to clone and run web + iOS locally.
4. **[REFERENCE-INDEX.md](REFERENCE-INDEX.md)** — pointer to existing internal docs that go deeper (ROADMAP, specs for IMPL-039 and IMPL-040, prior 21-item release review, session logs).
5. **[DELIVERABLE-TEMPLATE.md](DELIVERABLE-TEMPLATE.md)** — expected output format, severity classification, how to submit findings.

## What's in the repos?

### [`3dprintassistant/`](https://github.com/mustiodk/3dprintassistant) — Web app
- Pure static site (HTML / CSS / vanilla JS). Hosted on Cloudflare Pages (recently migrated to Workers Builds).
- Three core files do the heavy lifting: `engine.js` (business logic), `app.js` (UI only), `data/*.json` (data).
- Single Cloudflare Worker at `/api/feedback` forwards to Discord (secret stays server-side).
- No build step. Just Git push → auto-deploy.

### [`3dprintassistant-ios/`](https://github.com/mustiodk/3dprintassistant-ios) — iOS app
- SwiftUI, iOS 17+. Live on the App Store in ~121 non-EU countries (EU blocked on DSA Trader Status).
- **The same `engine.js` runs natively** inside a `JSContext` via JavaScriptCore. The Swift app `fetch()`-polyfills bundled JSON files so the engine's code path is identical across platforms.
- CI: GitHub Actions → Fastlane → TestFlight on every push to `main`. CI runs 20 unit tests including the two new IMPL-040 invariant guards.

## Important non-review guidance

- **Don't push to either `main`.** iOS `main` push triggers an automatic TestFlight build upload; web auto-deploys to production. Work in a branch or worktree.
- **Don't touch secrets.** `Config.xcconfig` is gitignored on iOS; you can build with the `.template` version. Cloudflare Worker's `DISCORD_WEBHOOK_URL` env var stays in the dashboard — code inspection is fine, value isn't needed.
- **The product is live.** Users are printing real objects based on these suggestions. Correctness concerns (wrong layer height clamp, wrong temperature advice, wrong material safety guidance) are higher-severity than style concerns.

## Contact

Open a GitHub Issue on either repo, or message the owner directly. For urgent/security findings please use a private channel.
