# 2026-05-08 — Cowork (appdev): v1.0.3 batch items 1 + 3 shipped end-to-end

## Durable context

- **Multi-pass Codex review pattern (1 design + 4 milestone + 1 post-implementation) caught real bugs the design review couldn't see.** 4 design-phase Must-Fix bugs + 1 runtime stranded-eligibility bug that only surfaced when the implementation existed for Codex to read. Pattern validation: post-implementation code review on top of pre-implementation design review is non-redundant; they catch different bug classes (design = contract / API shape / scope; post-impl = concurrency / async-boundary / interaction-with-existing-code). For high-stakes features (Apple-quota-bound, hard-to-reverse), both passes are worth the cost.
- **Wiki-pages-as-primary-source workflow validated again.** Apple's `developer.apple.com/documentation/*` pages are JS-rendered SPAs that WebFetch can't parse — only the page title returns. Owner-clipped pages into `Obsidian Vault/50-Wiki/raw/apple/review/` produced the verbatim quotes we needed (quota wording, heuristic anchor, 5.6.1 wording, anti-patterns). Same pattern that recovered handover #1's printer audit. **Standing recommendation:** for any Apple-doc / hard-data-table research need, default to owner clipping into the vault; do not waste a Gemini handover or WebFetch loop on JS-SPAs.
- **Branch divergence on ROADMAP creates structural cost.** The pilot's paperwork lives on `ai/operating-model-pilot`; product changes (data, code) go to `main`. The ROADMAP truth forked between the two — pilot branch had v1.0.3 batch section + item 3 SHIPPED; main was 2 weeks behind. Resolution: also update main's ROADMAP at ship time so each branch reflects its own reality. End-of-pilot merge will reconcile; until then, expect ROADMAP edits in both places.
- **The novelty-vs-eligibility separation principle.** For engagement-tracking systems with thresholds (StoreKit 4-process anchor pattern), novelty controls counter increments only — it does NOT control eligibility evaluation. Pre-fix, `OutputView.maybePromptForReview()` early-returned on `guard isNovel else { return }`, stranding users who hit the threshold while another gate was still closed. Post-fix, `evaluateForRequest(profileKeyHash:)` registers idempotently AND evaluates eligibility regardless of novelty; duplicate-prompt protection comes from same-version + cooldown gates, not the novelty guard.
- **iOS push gate practical scope:** "ship-ready" = all planned changes for the version landed + XCTest green + walkthrough green + MARKETING_VERSION bumped + xcodegen regenerated. Once those conditions hold, the version-bump-commit + push + TestFlight dispatch is mechanical "automate before instructing" territory — the owner doesn't need to be in the loop for each command. Surface the cost (10 min CI run on macos-26) but don't ask permission for each step.
- **iOS data and code on `main` may diverge from binary in TestFlight.** TestFlight workflow's `actions/checkout@v3` checks out `main` at runner-pickup-start, not at dispatch time. If commits land between dispatch and runner pickup, they may or may not be in the build. Practical implication: when dispatching multiple coordinated changes, either (a) push everything FIRST and dispatch ONCE at the end, or (b) accept that the in-flight build might be stale and re-dispatch.

## What happened / Actions

This was a long, ambitious session that took the v1.0.3 batch from "1/5 designed" to "2/5 shipped end-to-end" plus solid pilot evidence for the operating-model evaluation. Roughly four phases:

### Phase 1 — Cold start + Codex review of the design packet (item 3)

1. Cold start on 3dpa per CLAUDE.md Trigger C; read protocol → context → ROADMAP → INDEX → 3 prior session logs → Gemini #3 response file. Confirmed v1.0.3 batch state: handovers #2 + #3 drafted; #3's Gemini response landed end-of-prior-session; Phase A printer changes locked but held.
2. Owner asked for evaluation of Gemini #3 + the (already-appended) Codex pass 1 verdict on it. Walked through the Gemini blocks → flagged 4 specific failures of Quality bar (wrong guideline 1.1.7 vs 5.6.1; thresholds without sources; Reddit-as-primary; output thin). Codex pass 1 had already corrected most of these. My triage proposal: per-finding adoption with gap-fill from Apple primary, not wholesale-decline.
3. Stepped through M1–M2–M3 milestones with Codex peer-review at each:
   - **M1** (plan v2 incorporation) — folded Codex pass 2's 7 modifications + architecture notes. Codex pass 3 approved with 2 small clarifications (profile-key conceptual definition + UserDefaults `Set` storage gotcha). Both applied.
   - **M2** (Apple primary-source gap-fill) — direct WebFetch failed on JS-SPA pages; owner clipped 4 Apple pages into `Obsidian Vault/50-Wiki/raw/apple/review/`; I read them as primary source and filled 7 gap-fill items inline (6 ✅ + 1 null per source-or-null rule + 1 demoted to packet). Codex pass 4 approved.
   - **M3** (Item 3 design packet draft) at `codex/ios-review-prompt/codex-2026-05-08-ios-review-prompt-packet.md`. 537 lines. Codex pass 5 (full design review) returned 4 Must-Fix + 4 Should-Fix + 3 Optional + 8 Genuinely-good-enough. Owner confirmed both judgment calls (option (a) AppTransaction async cache + `userLevel` inclusion). Resolution drafted and applied.

### Phase 2 — Implementation of item 3 (review prompt) and post-impl review

4. Implemented the feature end-to-end: 3 new files (`ProfileKeyHasher.swift`, `ReviewPromptService.swift`, `StoreKitDistributionDetector.swift`), 4 modified (`ContentView.swift`, `OutputView.swift`, `OutputViewModel.swift`, `FeedbackView.swift`), 2 new test files (10 unit + 4 integration). Build clean after one fix (`import StoreKit` in OutputView). 60/60 XCTest green. Committed as iOS `756b107`. Web companion commit `381dac1` on `ai/operating-model-pilot` (research artifact + design packet + Resolution + ROADMAP entry).
5. Owner requested **post-implementation Codex review** on the actual code. Drafted the implementation-review packet at `codex/ios-review-prompt/codex-2026-05-08-ios-review-prompt-implementation-review.md` with explicit "Files to read (MANDATORY, in full)" section after I'd left it ambiguous on the first draft.
6. **Codex pass 6** verdict: approve-with-modifications. 1 Must-Fix (eligibility gated on novelty → stranded-user bug) + 3 Should-Fix (engine-output gate via `profileRenderedSuccessfully`; orchestration testability; cross-version cooldown coverage). Codex's commit-splitting note accepted: 3 separate commits per project rule (one finding = one commit per platform). Implementation:
   - **Commit `1bb543e`** (MF1-impl) — `evaluateForRequest(profileKeyHash:) async -> Bool` registers idempotently + evaluates eligibility regardless of novelty. Refactor of `OutputView.maybePromptForReview()`. New regression test.
   - **Commit `de4aa9d`** (SF1-impl) — `OutputViewModel.profileRenderedSuccessfully` computed property. New model-layer test.
   - **Commit `2309af1`** (SF3-impl) — 2 paired cross-version cooldown tests for symmetric coverage.
   - SF2-impl resolved implicitly by MF1-impl's `evaluateForRequest` becoming the testable orchestration boundary.
7. 64/64 XCTest green throughout. Resolution section written into the implementation-review packet. Web commit `f3549ee` on `ai/operating-model-pilot` (Resolution + ROADMAP touch).
8. **Ship sequence:** bumped MARKETING_VERSION 1.0.2 → 1.0.3 (commit `066add8`), pushed iOS `main`, pushed web `ai/operating-model-pilot` (with origin tracking — was local-only), dispatched TestFlight (run `25557115706`).

### Phase 3 — Item 1 (printers) ship

9. Owner asked which items 1-5 were actually shipped. Honest answer: only item 3. Item 1 (printer changes) was locked + held. Owner authorised "lets finish a and then figure out what is left on b."
10. Read locked Phase A scope from `gemini-printer-specs-kobra-audit-and-centauri.md` § "Locked Phase A scope" — verbatim final JSON for both Kobra X correction (6 fields) and Centauri Carbon new entry (CoreXY passive enclosure, 320°C nozzle, 110°C bed).
11. Switched web from `ai/operating-model-pilot` to `main` (data changes go to main so Cloudflare auto-deploys). Applied both edits to `data/printers.json`. Synced byte-identical to iOS via `cp`. Walkthrough harness 10/10 + DQ-2 3/3 green; iOS XCTest 64/64 green.
12. **Split commits via `git add -p`** to satisfy one-finding-one-commit-per-platform: 4 commits total — Kobra X web `0f47b44` + iOS `b0d1315`; Centauri Carbon web `8de9381` + iOS `15930c1`. Pushed both repos. Web auto-deployed to 3dprintassistant.com (live).
13. Updated main's ROADMAP — added the v1.0.3 batch section (was previously only on `ai/operating-model-pilot`); marked items 1 + 3 SHIPPED with full provenance; filed 2 IR-5 followups (`[0.25mm-nozzle-catalog]` + `[pla-specific-plate-id]`). Commit `047a7f8`, pushed.

### Phase 4 — Item 2 assessment + close decision

14. Owner asked whether to bundle item 2 with item 1. Checked `gemini-environments-taxonomy-research.md` state: handover drafted + linter-tightened, but Gemini has never seen it. Lines 305 + 321 mark empty `# Gemini Response` and `# Resolution` placeholders. Multi-day workstream remaining (research → triage → Codex packet → implementation → tests).
15. **Recommendation:** ship item 1 alone (already done). Don't bundle item 2. Start fresh session for items 2 / 4 / 5 when ready.

## Files touched

**Web repo `ai/operating-model-pilot` (committed):**
- `docs/research/gemini-ios-review-prompt-best-practices.md` — Resolution evolution through M0 → M1 → M2 (committed in `381dac1`)
- `codex/ios-review-prompt/codex-2026-05-08-ios-review-prompt-packet.md` — M3 design packet (created in `381dac1`)
- `codex/ios-review-prompt/codex-2026-05-08-ios-review-prompt-implementation-review.md` — post-impl review packet + Resolution (created in `f3549ee`)
- `docs/planning/ROADMAP.md` — v1.0.3 batch entry on pilot branch (`381dac1` + `f3549ee`)

**Web repo `main` (committed):**
- `data/printers.json` — Kobra X correction (`0f47b44`) + Centauri Carbon insert (`8de9381`)
- `docs/planning/ROADMAP.md` — v1.0.3 batch section added; items 1 + 3 SHIPPED (`047a7f8`)

**iOS repo `main` (committed):**
- 5 new files: `ProfileKeyHasher.swift`, `ReviewPromptService.swift`, `StoreKitDistributionDetector.swift`, `ReviewPromptServiceTests.swift`, `OutputViewIntegrationTests.swift`
- 5 modified: `ContentView.swift`, `OutputView.swift`, `OutputViewModel.swift`, `FeedbackView.swift`, `OutputViewModelTests.swift`
- 1 modified twice: `data/printers.json` (Kobra X + Centauri Carbon syncs)
- 2 generated: `project.yml` (MARKETING_VERSION bump), `project.pbxproj` (xcodegen regenerated)

**Untracked at session end (not mine, not committed):**
- `docs/prompts/roadmap-slimming-claude-handover.md` (web) — owner pre-existing
- `docs/reviews/2026-04-23-high-003-codex/06-single-paste.pdf` (iOS) — owner pre-existing

## Commits

**Web `ai/operating-model-pilot`** (3 commits, all pushed to origin):
- `381dac1` — `v1.0.3 item 3 (iOS App Store review prompt) — design phase complete`
- `f3549ee` — `v1.0.3 item 3: post-implementation Codex review + Resolution applied`
- (branch tracking established at first push — was local-only before)

**Web `main`** (3 commits, all pushed):
- `0f47b44` — `data: fix Kobra X to open-frame bedslinger (Anycubic wiki primary source) [v1.0.3]`
- `8de9381` — `data: add Elegoo Centauri Carbon (CoreXY, passive enclosure) [v1.0.3]`
- `047a7f8` — `ROADMAP: v1.0.3 batch items 1 + 3 shipped on main`

**iOS `main`** (8 commits, all pushed):
- `756b107` — `feat: iOS App Store review prompt v1 (v1.0.3 batch item 3)`
- `1bb543e` — `fix(review-prompt): MF1-impl — eligibility no longer gated on novelty`
- `de4aa9d` — `fix(review-prompt): SF1-impl — explicit successful-profile gate`
- `2309af1` — `test(review-prompt): SF3-impl — cross-version local cooldown coverage`
- `066add8` — `chore: bump MARKETING_VERSION to 1.0.3`
- `b0d1315` — `data: fix Kobra X to open-frame bedslinger (mirror of web 949f95b) [v1.0.3]`
- `15930c1` — `data: add Elegoo Centauri Carbon (mirror of web) [v1.0.3]`
- (note: `b0d1315`'s subject line incorrectly references `949f95b` — should have been `0f47b44`. Cosmetic; not load-bearing.)

**TestFlight dispatch:** run [25557115706](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25557115706) — workflow_dispatch on `main`, dispatched 14:03 UTC.

**Test counts:**
- Walkthrough harness: 10/10 + DQ-2 3/3 green every commit.
- iOS XCTest: 46 → 60 (initial item 3 commit) → 61 (MF1-impl regression test) → 62 (SF1-impl test) → 64 (SF3-impl 2 tests) → 64 (item 1 data sync, no new tests).

## Open questions / owner asks

- **TestFlight binary content uncertainty.** The dispatch happened before item 1 commits landed on iOS `main`. Whether the resulting binary includes the new printers depends on when the GitHub Actions runner picked up the queued job. Recommendation: check the binary in App Store Connect → if it's missing printers, dispatch one more time. Otherwise accept whatever made it in.
- **Branch reconciliation strategy at end-of-pilot (2026-05-14).** Pilot branch has paperwork (ai-collab.md, codex packets, gemini handovers); main has product changes. ROADMAP truth was forked and reconciled by hand this session. Decision needed: merge pilot into main wholesale, cherry-pick artefacts to main, or archive pilot branch. Affects whether next-session ROADMAP work happens on pilot or main.
- **Item 2 (environments) timing.** Handover drafted but not sent to Gemini. Multi-day workstream (research → triage → packet → implementation). Bundle with items 4/5 in a single v1.0.3.x ship, or ship item 2 alone in v1.0.3.1?
- **iOS commit `b0d1315` cosmetic fix.** Subject line references wrong web hash (`949f95b` instead of `0f47b44`). Worth fixing via `git commit --amend` if not yet too rooted, but likely not — the commit is already pushed and downstream commits chain from it. Leave as-is.
- **Pilot evaluation captures.** Item 3's 6 Codex passes + 5 caught-before-ship bugs is the marquee evidence. Should the operating model's end-of-pilot decision matrix capture this quantitatively (cost: tokens, time, owner attention; value: bugs caught, regressions prevented) before 2026-05-14? Affects whether the operating model gets adopted or rejected.

## Vault sweep

Per the 6-item vault-sweep checklist:

1. **Strategic decision worth propagating:** YES — *"Multi-pass Codex review pattern (1 design + N milestone + 1 post-impl) catches different bug classes; both worth running for high-stakes features"* fits `Obsidian Vault/20-Areas/Development/toolchain.md` alongside the existing Codex notes. Propose adding.
2. **New shorthand / term:** none new this session.
3. **Cross-project pattern:** the wiki-pages-as-primary-source workflow now validated 3 times (handover #1 printer audit recovery, handover #3 iOS review prompt M2 gap-fill, item 1 implementation reading Apple FAQs). Worth promoting to a permanent toolchain note. Propose updating `Obsidian Vault/20-Areas/Development/toolchain.md`.
4. **Hobby observation:** none.
5. **Consulting insight:** none.
6. **External source to ingest:** the Apple pages owner clipped (HIG ratings-and-reviews, RequestReviewAction, Requesting App Store Reviews, App Store Review Guidelines 5.6.1, Anycubic Kobra X FAQ, Elegoo Centauri Carbon product page) are already in the wiki — no new ingest needed.

Net: 1–2 toolchain.md updates worth proposing; nothing strictly required.

## Md-hygiene sweep

1. **Root-level stubs:** none introduced.
2. **Untracked but should-be-tracked:** 2 untracked files exist in working tree (web `docs/prompts/roadmap-slimming-claude-handover.md`, iOS `docs/reviews/2026-04-23-high-003-codex/06-single-paste.pdf`) — both pre-date this session per `git status`. Owner decision; not mine to commit.
3. **Secrets in tree:** none. (No `.p8`, `.mobileprovision`, `AuthKey*`, `ghp_*`, `sk-*`, `xoxb-*`.)
4. **Content buried in session log:** the multi-pass-Codex-review insight is captured in Durable context above + flagged for vault propagation. No further action.
5. **Stale ROADMAP sections:** "Last updated" header refreshed this session (commit `047a7f8`). Phase DQ section is intact (DQ-3 deferred post-v1.0.3, noted). v1.0.3 batch section newly added with current status.
6. **Duplicate specs:** none introduced.
7. **Protocol-file drift:** `diff -u Projects/CLAUDE.md Projects/AGENTS.md` not run this session. Worth checking next wrap-up.

No new findings requiring autonomous cleanup. The 2 owner-untracked files are owner's call.

## Next session

Most likely first action depends on owner priority:

- **(a)** Item 2 (environments) — hand `gemini-environments-taxonomy-research.md` to Gemini, triage response, write Codex packet, implement.
- **(b)** Item 4 (analytics) — draft handover #4, hand to Gemini.
- **(c)** Item 5 (web output-panel UX) — Claude direct (no Gemini per per-tool routing).
- **(d)** TestFlight QA on the in-flight build (verify review prompt suppressed on TestFlight, verify Kobra X and Centauri Carbon visible if binary picked them up).
- **(e)** End-of-pilot evaluation prep (2026-05-14, 6 days) — consolidate the operating model evidence; decide adopt/reject.
- **(f)** Branch reconciliation strategy (pilot vs main).

Pilot ends 2026-05-14 (6 days). Items 2 + 4 + 5 are not strictly part of the pilot evaluation — only the operating model itself is. So the pilot decision can land regardless of what other batch items ship.
