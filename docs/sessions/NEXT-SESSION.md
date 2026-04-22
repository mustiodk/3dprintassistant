# Next session — copy-paste prompt

**Last updated:** 2026-04-22 (end of [`2026-04-22-cowork-appdev-ir0-sweep.md`](2026-04-22-cowork-appdev-ir0-sweep.md), after the overnight IR-0 sweep landed 5 findings).

Copy everything between the `>>> START >>>` and `<<< END <<<` markers below into a fresh Cowork session to kick off the next one.

**Phase:** IR-2a — iOS v1.0.2 ship pass. Goal: ship v1.0.2 to the App Store with `[CRITICAL-001]` feedback-routing as the user-visible headline, bundled with engine-correctness + iOS reliability fixes. See ROADMAP `IR-2a` section for the full scope breakdown.

---

>>> START >>>

Start a new appdev session. Phase: **IR-2a — iOS v1.0.2 ship pass.**

Read, in order:
1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — standing rules (always). Pay particular attention to Session-log protocol + Md-hygiene evaluation + "one finding = one commit" rule.
2. `3dprintassistant/docs/planning/ROADMAP.md` — **full file.** Check "Last updated" + the **IR-2a iOS v1.0.2 ship pass** section.
3. `3dprintassistant/docs/sessions/INDEX.md` — skim top 5 entries.
4. Last 3 session logs in full (newest first):
   - `docs/sessions/2026-04-22-cowork-appdev-ir0-sweep.md` — yesterday's IR-0 sweep (5 findings shipped, **4 deferred to this phase**). "Open questions" section has three owner asks and one hook-verification step. Read carefully.
   - `docs/sessions/2026-04-22-cowork-appdev-housekeeping.md` — security rotations. Reference for Sentry DSN / ASC API key / CI secret names if you touch deploy paths.
   - `docs/sessions/2026-04-21-cowork-appdev.md` — CRITICAL-002 bed-temp clamp. Reference for the `_clampNum` / `getWarnings` purity pattern used in the CRITICAL-002 + CRITICAL-003 implementations.
5. `3dprintassistant/docs/reviews/2026-04-20-internal/01-critical.md` — re-read `[CRITICAL-001]` in full (iOS feedback through Worker; this is the headline feature of v1.0.2).
6. `3dprintassistant/docs/reviews/2026-04-20-internal/02-high.md` — re-read `[HIGH-004]`, `[HIGH-005]`, `[HIGH-008]`, `[HIGH-009]`, `[HIGH-010]`, `[HIGH-014]`.
7. `3dprintassistant/docs/reviews/2026-04-20-internal/03-medium.md` — re-read `[MEDIUM-001]`, `[MEDIUM-002]`, `[MEDIUM-007]`, `[MEDIUM-018]`.

**First action — verify partner-reviewer hook is live.**
Before any code work, make ONE trivial edit (e.g. a whitespace change in engine.js, then revert it). If the PostToolUse hook fires, you'll see `additionalContext` from the `simplify` skill surface on the next turn. If silent, the settings-watcher didn't pick up the newly-installed hook — tell me to open `/hooks` once, or restart the session. The hook is user-level at `~/.claude/settings.json`; it scopes to `3dprintassistant/**` + `3dprintassistant-ios/**` excluding `docs/**`, and invokes the `simplify` skill via an agent (Haiku).

**Session scope (in proposed order — one finding = one commit per platform):**

### Track 1 — Open-ask data fixes (minutes each, if owner answers ready)
1. `[HIGH-014]` — owner confirms A1 mini `max_bed_temp` spec. If 80°C (not 100°C), patch `data/printers.json`; CRITICAL-002 bed-temp clamp now makes the downstream warning automatic. `[You]` + `[Code]`
2. `[LOW-002]` — owner provides HIPS `enclosure_behavior.reason` text; I apply to `data/materials.json`. `[You]` + `[Code]`
3. `[MEDIUM-018]` — owner decides: unify `nozzles.json.not_suitable_for` via material IDs or group names? Then clean orphan refs (`abs_cf`, `pla_wood`, `pla_glow`). `[You]` + `[Code]`

### Track 2 — Engine correctness (code-only; run walkthrough + XCTest per commit)
4. `[HIGH-008]` — extend C6 warning loop to cover every `patternFor` field. Module-level field list so new patterns auto-get coverage. `[Web+iOS]`
5. `[HIGH-009]` — `_clampNum` non-finite fallback returns `min`, not `undefined`/`null`. Eliminates `.toFixed()` crash path. `[Web+iOS]`
6. `[MEDIUM-001]` — Numeric-compare `limits_override.nozzles` keys (currently `"0.40"` string lookup silently fails). `[Web+iOS]`
7. `[MEDIUM-002]` — Add `if (!nozzle) return {};` guard to `resolveProfile`. `[Web+iOS]`
8. `[MEDIUM-007]` — Init-time validation of `printer.series` enum. Typo'd entries currently misclassify. `[Web+iOS]`

### Track 3 — iOS reliability (bridge error path)
9. `[HIGH-004]` — Re-read `_engineError` in post-loop block before throwing the timeout. Real JS errors stop masking as "timed out". `[iOS]`
10. `[HIGH-005]` — Replace `_engineError != "null"` string-compare with `typeof !== 'undefined'` or structured sentinel. `[iOS]`

### Track 4 — Headline feature: CRITICAL-001 + HIGH-010 (the actual v1.0.2 story)
11. `[CRITICAL-001]` — iOS `FeedbackService.swift` POSTs to `https://3dprintassistant.com/api/feedback` with `X-App-Source: ios` + HMAC header. Worker accepts iOS path, sanitises, rebuilds embed. Rotate old Discord webhook after cutover verified. `[iOS+Worker]`
12. `[HIGH-010]` — IP rate limit on `/api/feedback` Worker — 10 req/min per IP, 100 req/min global. Cloudflare Rate Limiting preferred. Deploy alongside CRITICAL-001. `[Worker]`

### Track 5 — Ship mechanics
13. Bump `CFBundleShortVersionString` to `1.0.2` in `project.yml` + regenerate pbxproj via `xcodegen generate`. CI auto-bumps build number on push.
14. Draft "What's New" (≤ 4000 chars). Focus: privacy (feedback routing) + reliability (silent-error fixes). Owner tone pass.
15. TestFlight internal round. Verify: feedback submit lands in Discord; engine init doesn't crash; `invalid_preset` warning fires on stale state; MK4 profile no longer names A1 in rationale.
16. Submit to App Review with manual release toggle. If EU DSA status still blocked, v1.0.2 ships to the ~121 non-EU countries only (same as v1.0.0).

**Process (don't drift):**
- Propose diff in plain English before each edit. Wait for owner sign-off per finding. (Overnight blanket-auth from 2026-04-22 was session-scoped — default is back to propose-and-wait.)
- One finding = one commit per platform.
- After every web `engine.js` or `data/rules/` edit: sync iOS byte-identical (`cp`), run walkthrough harness (`node scripts/walkthrough-harness.js`), run iOS XCTest on the affected test file.
- Commit message format: `engine: <summary> [<FINDING-ID>]` or `data: <summary> [<FINDING-ID>]` or `iOS: <summary> [<FINDING-ID>]`. Trailer must be `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- Don't push iOS main if any XCTest is red.
- Rotate Discord webhook URL **only after** CRITICAL-001 is verified end-to-end on TestFlight. Before rotation is a window where both old (direct from old binary) and new (Worker from v1.0.2 binary) paths are live — that's expected.

**Standing rules:**
- Progress bar on every multi-step step: `[🟩🟩⬜⬜⬜⬜ 40%] step`.
- Md-hygiene sweep at session end.
- ROADMAP is truth — tick IR-2a items as they land.
- Right thing not easy thing — don't batch CRITICAL-001 with engine correctness work; distinct commits per finding even if the session is long.
- Data/logic change evaluation — every change, mention whether web + iOS UI need updates to best use the improvement.

**Acceptance for IR-2a:**
- iOS v1.0.2 live in Apple's "Ready for Sale" state (same country reach as v1.0.0).
- Old Discord webhook URL no longer present in any app binary; new Worker-routed path verified on TestFlight.
- Rate limit live on `/api/feedback` — curl-flood test confirms 429 at threshold.
- Full iOS XCTest suite green (≥ 37/37 + whatever new regression tests this session adds).
- ROADMAP IR-2a section fully ticked; session log written; INDEX updated; this file regenerated for the next phase.

<<< END <<<

---

## How to maintain this file

- **Every session end**, I rewrite this file with the prompt for the next session — populated from the "Next session" / "Open questions" sections of the session log I just wrote, plus any md-hygiene findings surfaced in that session.
- **No other file** serves this role. If this file is stale (last-updated > 7 days), ask me to regenerate from the most recent session log.
- **Owner action**: just copy-paste the block between the markers. Nothing else to do.
- **Phase pointer** at the top tracks which IR-* phase is active so nothing falls off.
