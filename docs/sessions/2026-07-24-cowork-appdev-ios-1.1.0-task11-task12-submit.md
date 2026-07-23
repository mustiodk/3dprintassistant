# 2026-07-24 — Cowork (appdev): iOS 1.1.0 Task 11 compose + Task 12 ship — submitted for App Review

## Durable context

- **iOS 1.1.0 is SUBMITTED for App Review** (owner submitted 2026-07-24, Manual
  Release). Task 11 (compose) and Task 12 Steps 1–5 are complete. What remains:
  Apple approval → owner manual release → Danish-storefront 1.1.0 confirmation →
  then the separately-gated first public notification (Task 12 Step 6). Public
  send stays OFF.
- **Both repos are pushed and live-aligned.** Web `main` = `origin/main` at
  `21fca0e` (full notification provider + privacy + catalog baseline deployed to
  Cloudflare via git — production verified: server paths 404, `/api/push/register`
  routes, privacy.html push disclosure live, `PUSH_PUBLIC_SEND_ENABLED="false"`).
  iOS `main` = `origin/main` at `aa0c8a6` (the 9 pre-existing + full reviewed
  1.1.0 train flushed in one push). TestFlight run `30035346767` built `aa0c8a6`
  = reviewed HEAD, success.
- **The 1.1.0 catalog-baseline was a plan gap.** Bumping `MARKETING_VERSION` to
  1.1.0 RED'd `validate-ios-printer-overlay.js` (anti-staleness gate requires a
  bundled-catalog baseline for the current MARKETING_VERSION). Fixed additively
  (`60d32ea`, 78/14, snapmaker). This recurs on every version bump (1.0.5, 1.0.7,
  1.1.0) yet is never in the release plan → finding filed. Future release plans
  that bump MARKETING_VERSION MUST include the overlay-baseline step.
- **Distribution-signed entitlement check is CI-only on this Mac.** Only an Apple
  *Development* cert is installed; the *Distribution* cert lives in CI
  (`DISTRIBUTION_CERT_BASE64`). Ad-hoc signing rejects an `aps-environment`
  entitlement. So the `codesign -d --entitlements` production check runs in CI at
  Task 12 dispatch; locally, Release build-settings resolution
  (`APS_ENVIRONMENT=production`, no `UIBackgroundModes`) is the deterministic
  stand-in.
- **Native slicer export is allowlisted** (IMPL-043 phased): Bambu = X1C family,
  Orca = Ender-3 V3 family (`ORCA_VERIFIED_PROFILES`), Prusa = CORE One L only.
  Every other printer uses the Copy fallback and shows no native export action.
  This is by design — not a bug.
- **What's New copy was owner-revised** away from the ratified §11.1 text: leads
  with native export (all 3 slicers) + Workshop as the headline, notifications
  second, dropped the "offline catalog" jargon + the analytics line. The submit
  doc was updated to match what was actually submitted.

## What happened / Actions

**Task 11 (compose 1.1.0):**
1. Bumped `MARKETING_VERSION` 1.0.7→1.1.0 + xcodegen (`9a0197f`, iOS).
2. Web `privacy.html` opt-in push-token disclosure (`d012cc8`); iOS privacy-labels
   already carried the Device ID declaration from Task 9 prep.
3. Verified §11 copy verbatim; recounted 78 printers / 14 brands from the exact
   bundled archive; registered the 1.1.0 overlay baseline (`60d32ea`).
4. Captured iPhone + iPad screenshots (Home shows v1.1.0 + Product Updates row;
   Output shows native "Export for Bambu Studio"); a11y review (fixed-size fonts
   = app-wide idiom, non-blocking).
5. Full gate battery green: web provider 62, Worker/analytics 33, validators/
   walkthrough/export-audit 0-FAIL, wrangler dry-run public-send false, engine+data
   byte-identical; iOS 183/183. Release config `aps-environment=production`.
6. Final `bridge --mode codex-only` review (codex-only because controller = Claude):
   NO-GO on 3 P2 doc-accuracy defects only → all fixed (`edf8466`, `aa0c8a6`) →
   no open P0/P1/P2.
7. Recorded Task 11 evidence in the gate ledger (`21fca0e`).

**Task 12 (ship — under owner GO):**
8. Web: ff-merged provider→`main`, pushed `df9aa8e..21fca0e`, Cloudflare deploy
   verified in production.
9. iOS: ff-merged release→`main`, pushed `f2f1f3b..aa0c8a6` (single push).
10. Dispatched exactly one TestFlight run `30035346767` (headSha `aa0c8a6`, success).
11. **Nine owner acceptance gates — all green.** ①②③⑤⑦ owner on the real
    TestFlight build; ④⑥⑧⑨ controller on the simulator build from the same HEAD:
    - ② new-printer routing proven across 4 printers (X1C, MK4S, K1C, Kobra S1),
      cold + warm, + app_update → App Store — via signed canary sends I drove
      through the owner CLI (`send-ios-push.mjs canary`, production env).
    - ③ full opt-out → canary preview `notification_id was not found`.
    - ④ Workshop save → star solid green, correct saved-state (no false unsaved).
    - ⑥ Export disabled at 0 profiles, Import enabled.
    - ⑧ fresh online launch → Creality list shows overlay-delivered K2 SE +
      Ender-3 V4 Combo each exactly once (clean merge, no dupes).
    - ⑨ Bambu export validated via actual app-exported files (2 JSON, correct
      values); Orca (Ender-3 V3, 2 JSON) + Prusa (CORE One L, 1 INI) validated via
      serializer output; combined with prior owner real imports (Bambu 2026-07-06,
      Orca/Prusa 2026-07-13). Re-import deemed unnecessary (serializers unchanged).
12. Owner completed ASC: App Privacy Identifiers→Device ID (opt-in / not tracking
    / not linked / App Functionality — controller drove the form in the Claude
    Browser pane through the linkage step, owner finished), revised What's New,
    build `202607231851` selected, Manual Release, **Submitted for Review**.

## Files touched

- Web (`main`): `privacy.html`, `catalog/ios-bundled-catalog-baselines.json`,
  `docs/planning/IOS-1.1.0-GATE-LEDGER.md`, review transcript, this log + INDEX +
  ROADMAP + NEXT-SESSION.
- iOS (`main`): `project.yml`, `project.pbxproj` (version bump),
  `docs/app-store-privacy-labels.md`, `docs/app-store-v1.1.0-submit.md`.
- Cloud (not git): Cloudflare production deploy (provider live-dark); ASC 1.1.0
  submission + App Privacy update.

## Commits

- Web: `d012cc8` (privacy), `60d32ea` (1.1.0 baseline), `21fca0e` (Task 11 ledger
  + review), all flushed to `main` via ff-merge `df9aa8e..21fca0e` + push.
- iOS: `9a0197f` (version), `edf8466` + `aa0c8a6` (Codex P2 fixes), pushed
  `f2f1f3b..aa0c8a6`.
- Wrap-up commits (this close): session log/INDEX/ROADMAP/NEXT-SESSION/gate-ledger
  (web) + submit-doc What's New reconcile (iOS).

## Open questions / Follow-up

- **NEXT (owner):** await Apple approval → **Release This Version** (manual) →
  confirm Danish storefront shows 1.1.0. THEN decide/send the first public
  notification (Task 12 Step 6, separately gated — copy/topic/audience/campaign-id
  approval; flip `PUSH_PUBLIC_SEND_ENABLED` only for the controlled send).
- **Finding filed:** `2026-07-24-release-plan-omits-overlay-baseline-on-version-bump.md`
  (recurring plan gap; ai-om findings).
- **VBM summary (verbatim, owner adjudicates):** `verify-before-mutate ledger:
  2 flags (0 resolved_same_turn, 0 resolved_late, 2 unresolved_by_session_end),
  1 destructive-core, 8 unclassified, 6 generated-write` — flags:
  (1) `.claude/launch.json (delete)` = the temp dev-server config I created for the
  privacy.html render check; verified session-created + untracked, `git status`
  showed only privacy.html after removal. (2) `3dprintassistant-ios (repo_destructive)`
  = `git checkout -- Info.plist` reverting the failed ad-hoc archive's
  CFBundleVersion stamp; verified clean tree immediately after. Both verified
  in-turn; classifier does not link cross-call verification.
- **Lesson-spotter (compact):** 1 finding filed (overlay-baseline plan gap); MCP
  gotchas → `mcp.md` (iOS Simulator MCP needs `sudo xcode-select` even when
  `xcode-select -p` is already correct; computer-use needs macOS Screen Recording;
  ASC dialog inner tree not exposed to the a11y layer → JS-inspection + coordinate
  clicks). No K1 reviewer-disagreement catches beyond the Codex NO-GO (captured).
- **Md-hygiene:** no protocol drift, no root stubs, no secrets in tree, no stray
  `</content>` tags in committed docs. Temp artifacts at `~/Desktop/3dpa-gate9-export/`
  (Bambu export files) + scratchpad canary/gate9 scripts — non-repo, owner may delete.

## Next session

**iOS 1.1.0 post-submission:** if Apple approves, owner releases manually + verifies
DK storefront. First public notification is the next deliberate, owner-gated action
(Task 12 Step 6) — not automatic. Runbook: `docs/runbooks/ios-push.md`. Kickoff in
`NEXT-SESSION.md`.
