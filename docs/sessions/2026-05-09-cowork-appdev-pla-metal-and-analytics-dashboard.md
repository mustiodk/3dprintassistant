# 2026-05-09 — Cowork (appdev): PLA Metal + analytics dashboard

## Durable context

- **PLA Metal shipped as an additive v1.0.3 build, not a new marketing version.** Web `54f7e31` + iOS `2878806` add `pla_metal` across materials/nozzles/engine/iOS picker. TestFlight run [`25576365270`](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25576365270) succeeded with version `1.0.3`, build `202605081953`. Owner confirmed the build appeared in TestFlight. Important process lesson: future iOS push/dispatch must explicitly reconcile "same marketing version build" vs "new version bump" before dispatch.
- **Bambu PLA Metal evidence came from owner-curated vault sources.** Primary sources read from `Obsidian Vault/50-Wiki/raw/3dpa/bambu/filament/`: Bambu PLA Metal TDS PDF, PLA Usage Guide, and filament guide. Dedicated PLA Usage Guide/TDS support treating Bambu PLA Metal as regular AMS-compatible PLA with no hardened-nozzle requirement, despite a broader "metal-filled PLA" guide line. Added values: 190-230C nozzle, 35-45C bed guidance, 55C/8h drying, humidity below 20% RH, speed under 300 mm/s, retraction 0.6-1.0 mm.
- **Analytics dashboard is live and owner-readable.** `https://3dprintassistant.com/analytics` is protected by `ANALYTICS_ADMIN_TOKEN`, queries Cloudflare Workers Analytics Engine dataset `3dpa_usage_v1` via server-side `/api/analytics-query`, and now shows overview, generated profiles, printers, materials, environment/support/colors, feedback, and versions/channels.
- **Cloudflare Workers Assets was serving internal files before today.** Live `/.git/config` returned `200` during setup. Fixed with `.assetsignore` exclusions plus Worker hard-blocks for `/.git`, `/.claude`, and `/.wrangler`; verified live `/.git/config` now returns `404`. Keep this as a deployment hygiene lesson for any Worker Assets project.
- **Analytics SQL dialect gotchas are now known.** Cloudflare Analytics Engine SQL rejected backticks and unquoted dataset names starting with a digit. The working form is `FROM "3dpa_usage_v1"`. Tests now lock this.

## What happened / Actions

1. Started from 3dpa `main`, not retired `ai/operating-model-pilot`; stashed stale local edits on that retired branch before working.
2. Added PLA Metal after confirming it was absent in repo data and validating against Bambu vault sources.
3. Mirrored engine/data to iOS byte-identically and added the iOS picker description.
4. Verified data/engine work: `node scripts/validate-data.js`, ad-hoc material/nozzle check, walkthrough harness hard checks + DQ-2 assertions, web/iOS byte comparisons, `git diff --check`, and full iOS XCTest on iPhone 17 Pro simulator (67 unit + 1 UI screenshot test green).
5. Committed and pushed web + iOS PLA Metal support, then dispatched TestFlight on explicit owner ask. Run `25576365270` succeeded; owner later confirmed it appeared in TestFlight.
6. Reviewed Claude cold-start/lifecycle protocols and project variants; confirmed Codex should follow top-level `AGENTS.md`/`CLAUDE.md`, project Trigger C read orders, and Dania isolation exception.
7. Read ROADMAP/NEXT-SESSION to orient next work. Clarified that "web output-panel UX" was under-scoped and should be treated as a UX audit/deep-dive, not blind implementation.
8. Built a simple owner dashboard at `/analytics` with server-side SQL proxy `/api/analytics-query`. Added canned queries rather than arbitrary browser-supplied SQL so Cloudflare credentials never reach the client.
9. Helped owner configure Wrangler auth, Cloudflare Analytics Engine dataset/binding (`3dpa_usage_v1` / `ANALYTICS`), Cloudflare read token, account id, and dashboard admin token.
10. Debugged Cloudflare setup live: handled versioned secrets, enabled Analytics Engine, fixed SQL parser errors, and verified `{"ok":true,"stored":true}` for analytics writes.
11. Added extra web profile-generation analytics per owner ask: `outputMode` (`simple` / `advanced`) now stores in `blob20`, and dashboard has a "Generated profiles" card combining brand, printer model, filament, material group, output mode, and profile count.
12. Closed with Trigger A: session log, INDEX, ROADMAP, NEXT-SESSION, md-hygiene/self-check.

## Files touched

**Web repo — product/data:**
- `data/materials.json`
- `data/nozzles.json`
- `engine.js`

**iOS repo — mirrored product/data:**
- `3DPrintAssistant/Engine/engine.js`
- `3DPrintAssistant/Data/materials.json`
- `3DPrintAssistant/Data/nozzles.json`
- `3DPrintAssistant/Views/Configurator/MaterialPickerView.swift`

**Web repo — analytics dashboard / Worker:**
- `.assetsignore`
- `analytics.html`
- `app.js`
- `docs/specs/analytics-v1.md`
- `functions/api/analytics.js`
- `functions/api/analytics.test.mjs`
- `functions/api/analytics-query.js`
- `functions/api/analytics-query.test.mjs`
- `worker.js`

**Session docs:**
- `docs/planning/ROADMAP.md`
- `docs/sessions/INDEX.md`
- `docs/sessions/NEXT-SESSION.md`
- `docs/sessions/2026-05-09-cowork-appdev-pla-metal-and-analytics-dashboard.md` (this file)

## Commits

**Web `3dprintassistant` main:**
- `54f7e31` — `data: add PLA Metal filament support [v1.0.3]`
- `3954a9e` — `feat: add analytics dashboard`
- `fb2a8ed` — `chore: exclude internal files from static assets`
- `e4dc72d` — `chore: hard-block internal asset paths`
- `4aa2880` — `chore: surface analytics query errors`
- `79698cf` — `fix: use Analytics Engine SQL table identifiers`
- `45eb81d` — `fix: quote Analytics Engine dataset identifier`
- `700e322` — `feat: add web output mode analytics`
- `(this close)` — docs close commit, if committed after this log

**iOS `3dprintassistant-ios` main:**
- `2878806` — `data: add PLA Metal filament support (mirror of web) [v1.0.3]`

**TestFlight:**
- `25576365270` — succeeded; uploaded version `1.0.3`, build `202605081953`.

## Verification

- Web data validation: `node scripts/validate-data.js` passed.
- Web walkthrough harness: hard checks passed; DQ-2 assertions passed. Soft warnings included existing 0.8mm `max_mvs` gaps plus new PLA Metal 0.8mm gap (not invented).
- Byte-identity: web/iOS `engine.js`, `materials.json`, `nozzles.json` compared clean after sync.
- iOS XCTest: full simulator test run passed (67 unit tests + 1 UI screenshot test).
- Worker tests: `node --test functions/api/*.test.mjs` passed after each analytics dashboard/query change; final count 10/10 green.
- Syntax/format: `node --check` used on Worker modules during setup; `git diff --check` clean.
- Live checks: `/analytics` returns `200`; `/api/analytics` returns `{"ok":true,"stored":true}`; bad dashboard token returns `401`; `/.git/config` returns `404`.

## Open questions / owner asks

- **TestFlight QA:** Owner saw the new build, but on-device QA still needs an explicit pass: PLA Metal visible and sane; review prompt suppressed on TestFlight; Kobra X/Centauri still visible; analytics invisible/non-breaking.
- **App Store privacy labels:** before public v1.0.3 release, App Store Connect should reflect anonymous Product Interaction analytics.
- **Dashboard access:** owner should keep the `ANALYTICS_ADMIN_TOKEN` in password manager. If forgotten, reset via `npx wrangler versions secret put ANALYTICS_ADMIN_TOKEN` and deploy that version.
- **Analytics test rows:** setup events with `appVersion` values like `setup-test`, `setup-test-2`, `setup-output-mode` exist in the first-day dataset. Harmless; remember them when reading early charts.
- **v1.0.3 remaining items:** item 2 environments taxonomy and item 5 web output-panel UX still pending. Item 5 is under-scoped; start with a quick UX audit before implementation.
- **Cloudflare token exposure:** owner pasted a UUID during setup; it appears to have been a Wrangler version id, not the secret token. No action unless owner believes the actual Cloudflare API token was pasted elsewhere.

## Memory sweep

Proposed durable entries:

1. **Cloudflare Workers Assets hygiene:** projects deployed with Workers Assets need explicit excludes/hard-blocks for `.git`, `.claude`, `.wrangler`, temp config files, and similar internal paths. Verify with live `curl /.git/config` after deploy.
2. **Cloudflare Analytics Engine SQL dialect:** dataset names starting with a digit need standard double quotes (`FROM "3dpa_usage_v1"`); backticks and unquoted identifiers fail parser.
3. **iOS TestFlight process nuance:** pushing iOS `main` does not equal TestFlight; before dispatch, confirm whether the ask is a same-marketing-version build or a version bump, then apply the iOS push gate accordingly.

## Vault sweep

Potential vault propagation:

- Development/toolchain note candidate: owner-curated raw wiki pages worked again as primary sources for manufacturer hard-data lookup (Bambu PLA Metal), and Cloudflare Workers Assets needs internal-path hardening.
- No hobby/consulting insight. No new external source ingest needed; Bambu sources were already in `50-Wiki/raw/3dpa/bambu/`.

## Md-hygiene sweep

- **Critical finding fixed:** live `/.git/config` exposure under Workers Assets. `.assetsignore` + Worker hard-block deployed and verified.
- **Untracked should-be-tracked:** none after close docs are committed.
- **Secrets in repo:** none added; Cloudflare tokens entered via Wrangler secrets.
- **Stale ROADMAP/NEXT-SESSION:** updated during close.
- **Protocol drift:** top-level `Projects/CLAUDE.md` / `AGENTS.md` were previously confirmed byte-identical in this session; no top-level protocol edits made after that.

## Next session

Recommended first lane: **TestFlight QA** on the latest v1.0.3 build, because the binary is already in TestFlight and now includes PLA Metal + analytics.

Then choose between:

1. **Environments taxonomy** — hand `docs/research/gemini-environments-taxonomy-research.md` to Gemini, triage response, then implement web+iOS.
2. **Web output-panel UX** — start with a quick audit/scope note; don't implement blind from the vague roadmap phrase.
3. **Analytics observation** — look at `/analytics` after real traffic accumulates; ignore setup-test rows from this session.
