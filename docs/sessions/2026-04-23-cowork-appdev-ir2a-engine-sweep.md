# 2026-04-23 — Cowork (appdev): IR-2a engine-sweep + CRITICAL-001 code landing

## Durable context

What a future session needs that ROADMAP doesn't capture:

- **CRITICAL-001 is CODE-COMPLETE but NOT yet ACTIVE.** All Worker + iOS code shipped to `main` on both repos. Activation requires three secret-config steps the owner needs to do manually:
  1. `openssl rand -hex 32` → Cloudflare Worker env var `FEEDBACK_HMAC_SECRET` (via Cloudflare dashboard).
  2. Same value → GitHub repo secret `FEEDBACK_HMAC_SECRET` on `3dprintassistant-ios` (for CI builds).
  3. Same value → local `Config.xcconfig` `FEEDBACK_HMAC_SECRET = …` (for dev builds).

  Until those secrets are set, iOS submissions to the Worker will hit `hmac_not_configured` (500). Safe — existing v1.0.0/v1.0.1 binaries in the App Store POST direct-to-Discord and are unaffected. No live users impacted.

- **HMAC design (commit to memory before touching this).** Signature is `base64(HMAC-SHA256(secret, "${timestamp}\n${rawBody}"))`. Client sends headers `X-App-Source: ios`, `X-Timestamp: <unix-seconds>`, `X-Signature: <base64>`. Server rejects timestamps >±5 min from now (`HMAC_MAX_SKEW_SECONDS = 300`). The raw body is read once via `request.text()`, then `JSON.parse`d — do not call `request.json()` before HMAC verify or the body stream is consumed and the raw bytes are gone.

- **Worker accepts TWO auth paths.** Web path: CORS origin allow-list (unchanged). iOS path: HMAC-verified when `X-App-Source: ios`. Footer formatting branches on `context.appSource`; iOS context carries `{appVersion, buildNumber, systemName, systemVersion, deviceModel, locale}` not the web's `{browser, browserVersion, os, screen}`.

- **HIGH-010 is SPLIT into parts A + B.** Part A (sanitization — strip `@everyone`/`@here`/mention tags/markdown links from user fields before building embed) shipped in the same Worker commit as CRITICAL-001 because they touch the same embed-build block. Part B (rate limit — 10 req/min per IP, 100 req/min global) is intentionally left for owner dashboard action (Cloudflare Security → WAF → Rate Limiting Rule on `/api/feedback`). Chose dashboard over code-based KV rate-limiter because (a) KV binding requires Cloudflare Pages Functions dashboard config anyway, so no autonomy win from code, (b) native Rate Limiting rule is one-click and reversible.

- **HIGH-008 surfaced one real silent substitution on Prusa.** The C6 warning loop now covers every `patternFor`-routed field (top/bottom/internal + seam_position). Previously-hidden substitution newly visible in the harness: **Prusa fine-quality surfaces silently downgraded "Monotonic line" → "monotonic"**. Every other combo clean. Seam-position is only checked when `state.seam` is explicitly set — the default display string "Aligned (or Back)" is a composite hint that always reduces to the slicer default and would fire a noisy warning on every print if checked.

- **MEDIUM-018 is SPLIT into parts A + B.** Part A (remove orphan refs `abs_cf`/`pla_wood`/`pla_glow` from `nozzles.json` `not_suitable_for`) shipped — these IDs never existed in `materials.json`, safe dead-data cleanup. Part B (unify ID-vs-group convention — some entries use material IDs like `pla_cf`, others use group strings like `pla`) still awaits owner decision. The remaining refs are all valid — just inconsistent semantics.

- **HIGH-012 has TWO followups shipped tonight (A + B).** The initial HIGH-012 fix (2026-04-22) only touched `outer_wall_speed.why`. Two more A1-hardcoded why-texts existed: `outer_wall_acceleration.why` and `slow_down_tall.why`. Both now template against `printer.name`. Same bug class, separate code paths — committed as separate findings per one-finding-one-commit.

- **`_clampNum` non-finite fallback order (MEDIUM for future maintainers).** Returns `min` first (finite bound > 0), falls back to `max` (covers call sites that pass `null` for min — wall-speed, line-width), finally `0` (defensive; unreachable for current call sites). Don't reorder without reading this — layer-height call sites pass both bounds finite (want `min` as sane default), but speed/line-width call sites need `max` as the cap fallback.

- **`_engineError` sentinel shape changed** from `null`-and-string-compare to `{set: false, value: null}` / `{set: true, value: "msg"}`. The poll loop AND the post-loop re-read (HIGH-004) both use `_engineError.set` boolean + `_engineError.value` string. Swift side: `ctx.evaluateScript("_engineError.set")?.toBool()` and `.evaluateScript("_engineError.value")?.toString()`.

- **Config.xcconfig now carries TWO feedback secrets.** `DISCORD_FEEDBACK_WEBHOOK` is kept as a local-dev fallback (when `FEEDBACK_HMAC_SECRET` is empty, `FeedbackService` routes direct-to-Discord). Once production has HMAC active, the dev-fallback path is only exercised by developers without the secret configured. Consider retiring the webhook fallback entirely in v1.1 once the Worker path is proven in prod.

## Context

Overnight autonomous session, session-scoped blanket-auth pattern (same as 2026-04-22). Owner went to sleep asking for "a plan for everything you can actually implement". Delivered 13 findings across web + iOS, plus code for CRITICAL-001 ready for dashboard activation, plus simplified Phase 2 runbook.

Mid-session the owner asked for a project overview by phase, then revised Phase 2 to drop complex rehearsal activities ("very limited usage of the iOS app right now"). Final output reflects that simplified scope.

The partner-reviewer hook installed 2026-04-22 did NOT fire this session — confirmed on a trivial whitespace test at start. Running in Claude Agent SDK environment which doesn't expose `/hooks` slash-command and may not honor user-level `~/.claude/settings.json` hooks the same way standard Claude Code CLI does. Worth retesting from the standard CLI next time.

## What happened / Actions

Order was: IR-0 quick runs → engine correctness (Track 2) → iOS reliability (Track 3) → CRITICAL-001 + HIGH-010-A code → MEDIUM-018-A → docs.

Every engine change: edit web → `cp` to iOS byte-identical → `node scripts/walkthrough-harness.js` → targeted iOS XCTest → commit web → commit iOS → push both.

**13 findings + 2 new docs landed.**

## Files touched

### Web (`3dprintassistant`)

**Modified (committed):**
- `engine.js` — HIGH-009, MEDIUM-002, MEDIUM-001, MEDIUM-007, HIGH-012-followup A, HIGH-012-followup B, HIGH-008 (cumulative)
- `functions/api/feedback.js` — CRITICAL-001 + HIGH-010-A (Worker rewrite)
- `data/nozzles.json` — MEDIUM-018-A

**Untracked (this session — to be committed as "docs: session close"):**
- `docs/app-store-whats-new-v1.0.2.md` — locked draft, awaiting tone pass.
- `docs/runbooks/incident-response.md` — new solo-dev-scope incident runbook (simplified Phase 2).
- `docs/sessions/2026-04-23-cowork-appdev-ir2a-engine-sweep.md` (this log).
- `docs/sessions/INDEX.md` — prepended bullet.
- `docs/sessions/NEXT-SESSION.md` — full rewrite with comprehensive project context.
- `docs/planning/ROADMAP.md` — 9 IR-2a boxes ticked, header refreshed.

### iOS (`3dprintassistant-ios`)

**Modified (committed):**
- `3DPrintAssistant/Engine/engine.js` — byte-identical syncs (× 7)
- `3DPrintAssistant/Engine/EngineService.swift` — HIGH-004, HIGH-005
- `3DPrintAssistant/Services/FeedbackService.swift` — CRITICAL-001
- `3DPrintAssistant/Utils/AppConstants.swift` — CRITICAL-001 (new `feedbackAPIURL` + `feedbackHMACSecret` getters)
- `3DPrintAssistant/App/Info.plist` — CRITICAL-001 (new `FeedbackAPIURL` + `FeedbackHMACSecret` keys)
- `3DPrintAssistant/Data/nozzles.json` — MEDIUM-018-A sync
- `.github/workflows/testflight.yml` — CRITICAL-001 (load `FEEDBACK_HMAC_SECRET` from GitHub secrets)
- `Config.xcconfig` — CRITICAL-001 (new `FEEDBACK_HMAC_SECRET` placeholder)
- `Config.xcconfig.template` — CRITICAL-001 (documented new secret + rotation)

## Commits

**Web (`3dprintassistant`) — 9 commits this session, all pushed to `main`:**
- `62d7ae9` — `engine: return finite bound from _clampNum non-finite fallback [HIGH-009]`
- `c2479db` — `engine: reject missing nozzle in resolveProfile early-return guard [MEDIUM-002]`
- `d211d89` — `engine: numeric-compare limits_override.nozzles keys [MEDIUM-001]`
- `1b0c4aa` — `engine: init-time validation of printer.series enum [MEDIUM-007]`
- `e1ca1a0` — `engine: template outer_wall_acceleration why-text per printer [HIGH-012-followup-A]`
- `4efc122` — `engine: template slow_down_tall why-text per printer [HIGH-012-followup-B]`
- `4f35b3b` — `engine: extend C6 loop to cover every patternFor field [HIGH-008]`
- `76b8bfa` — `worker: accept iOS HMAC path + sanitise mentions [CRITICAL-001][HIGH-010-A]`
- `597499b` — `data: remove orphan material refs from nozzles.not_suitable_for [MEDIUM-018-A]`

**iOS (`3dprintassistant-ios`) — 11 commits this session, all pushed to `main`:**
- `250f187` — HIGH-009 sync
- `9fe5127` — MEDIUM-002 sync
- `677e623` — MEDIUM-001 sync
- `6296ec4` — MEDIUM-007 sync
- `543a51c` — HIGH-012-followup-A sync
- `cf98878` — HIGH-012-followup-B sync
- `e7ef228` — HIGH-008 sync
- `83edae6` — `iOS: re-read _engineError after init poll-loop exit [HIGH-004]`
- `d2957da` — `iOS: structured _engineError sentinel replaces null string-compare [HIGH-005]`
- `af3b8b7` — `iOS: route feedback through HMAC-signed Worker [CRITICAL-001]`
- `5a360dc` — MEDIUM-018-A sync

**20 commits total. 37/37 iOS XCTest green after every one. Walkthrough harness 9/9 clean after every one.**

## Data/logic change evaluation (standing rule)

- **HIGH-009 / MEDIUM-002 / MEDIUM-001 / MEDIUM-007:** defensive engine hardening. No UI surface change. Benefit is implicit — current users won't notice unless they have malformed data today (they don't).
- **HIGH-012-followup A/B:** truth-telling improvement in rationale why-text. Zero UI change; `why` strings render verbatim on both platforms.
- **HIGH-008:** one new warning emits in prod (Prusa + fine-quality → `pattern_substituted_top_surface_pattern`). Warning is structured — web + iOS `WarningCard` render it automatically per RB-1 contract. No UI change needed. If analytics cared about warning ID volumes, this will show up.
- **HIGH-004 / HIGH-005:** iOS-only bridge hardening. No UI change. Sentry will start receiving real JS errors instead of "timed out" masquerades — that's observability, not user-facing.
- **CRITICAL-001 + HIGH-010-A:** Worker rebuild. No UI change web or iOS. Once secrets are live, iOS feedback will go through Worker → Discord instead of direct. Discord-side: feedback looks identical (Worker rebuilds the same embed shape). User-visible difference: zero.
- **MEDIUM-018-A:** data-only dead-ref cleanup. Zero runtime behavior change (the orphan refs never matched a real material anyway).

## Walkthrough harness result

**10/10 combos, 9 clean + 1 pre-existing warn (Combo 3: X1C + 0.8 std + PLA Basic + Draft/Fast — unchanged from prior sessions).** After HIGH-008 landed, one *new* expected warning fires on **Combo 7 (Prusa MK4 + Fine)**: `pattern_substituted_top_surface_pattern` surfaces the silent "Monotonic line" → "monotonic" downgrade. This is correct — it's exactly the previously-invisible drift the finding was filed to surface.

## iOS XCTest result

**37/37 passing.** Unchanged from session start. No new tests added this session (the engine findings were defensive hardening without new observable surfaces — existing harness + XCTest is the regression floor).

## Md-hygiene sweep

1. **Root stubs:** none — no orphan root-level `.md` files added.
2. **Untracked-but-should-be-tracked:** 2 new docs (`app-store-whats-new-v1.0.2.md` + `runbooks/incident-response.md`) — both promoted in the session-close commit. Plus 3 session-protocol files (this log, INDEX update, NEXT-SESSION).
3. **Secrets in tree:** clean post-commit — no `.p8` / `.mobileprovision` / `.certSigningRequest` / PAT-in-URL / plaintext secret strings.
4. **Content buried in session log:** HMAC design note + `_engineError` sentinel shape change promoted to Durable context (future sessions need these before touching those paths).
5. **Stale ROADMAP sections:** header refreshed; IR-2a ticks applied; CRITICAL-001 / HIGH-010 / Track 1 / Track 5 status updated.
6. **Duplicate specs:** none added.

## Open questions / owner asks

**Owner decisions still needed (all three are Track 1 items):**
- `[HIGH-014]` — A1 mini `max_bed_temp`: 80°C (Bambu spec) or 100°C (current data)?
- `[LOW-002]` — HIPS `enclosure_behavior.reason` text (currently copy-pasted from ABS).
- `[MEDIUM-018-B]` — unify `nozzles.not_suitable_for` via material IDs or groups?

**Owner dashboard / secret-config tasks (prereq for CRITICAL-001 activation):**
- Generate HMAC secret → set in 3 places (CF Worker env, GitHub repo secret, local Config.xcconfig). `openssl rand -hex 32`.
- `[HIGH-010 part B]` — create Cloudflare Rate Limiting rule on `/api/feedback` (10/min/IP, 100/min global).

**Owner ship tasks:**
- Tone pass on `docs/app-store-whats-new-v1.0.2.md`.
- Bump `CFBundleShortVersionString` → `1.0.2` in `project.yml`, run `xcodegen generate`, commit + push (triggers CI TestFlight upload).
- TestFlight internal test: submit feedback, confirm it lands in Discord via Worker.
- Rotate old Discord webhook URL in Cloudflare env (point to new secret).
- Submit v1.0.2 to App Review, manual release toggle.
- If EU DSA unblocked: enable EU in rollout. Else: ships to ~121 non-EU countries same as v1.0.0.

## Next session

Full comprehensive kickoff prompt in [`NEXT-SESSION.md`](NEXT-SESSION.md) — that file has been rewritten to include full project context, not just delta from this session. Safe to start fresh cold with just that prompt.
