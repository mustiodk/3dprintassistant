# 2026-07-09 — Cowork (appdev): Cold-start GitHub issues #2–#5 (WEB FIXES ON BRANCH, iOS NOT STARTED)

> Cold-start session triaging the four open GitHub issues the owner filed
> (`mustiodk/3dprintassistant` #2–#5). **All web work lives on branch
> `claude/cold-start-3dpa-issues-ihs5du` (pushed), NOTHING merged to `main`,
> NOTHING deployed.** Main stays pristine. The owner reviews + merges.
>
> **Pivotal mid-session realization: issues #2, #3, #4 are primarily iOS bugs**
> (owner tested on iOS; a Workshop screenshot confirmed the "3-dots" ··· menu
> that hides export/import IS the iOS Workshop overflow menu). The web commits
> below are only HALF each fix — the iOS mirror is the locked next-session work.

## Durable context

- **The four issues, and where each truly lives:**
  - **#2 (re-save loaded profile):** a loaded/unchanged Workshop profile could be
    saved again → silent duplicates. Web fixed; **iOS has the same bug.**
  - **#3 (Discord link dead):** old `discord.gg/UVPGaXcy` invite had expired
    (default invites lapse after 7 days). New permanent invite
    **`discord.gg/4KmcHrPkcS`** (owner-supplied). Web `support.html` fixed;
    **iOS `AppConstants.swift` almost certainly still points at the dead one.**
  - **#4 (export doesn't say what it exports):** TWO distinct concerns tangled in
    one issue — (a) the *Workshop backup* export never showed which profile it
    dumped; (b) the *slicer* export never named its target slicer, and the owner
    can't tell how we differentiate Bambu/Orca/Prusa. Web addressed both; **iOS
    hides both behind the ··· menu and needs the mirror + discoverability work.**
  - **#5 (analytics missing export/import):** see the finding below — it was a
    real server bug, not just a dashboard gap.
- **REAL BUG FOUND (#5): the analytics Worker was rejecting every `export_clicked`
  event with HTTP 400 `invalid_event`.** `functions/api/analytics.js` `EVENT_KEYS`
  only allowlisted `app_opened` / `profile_generated` / `feedback_opened`. The app
  has been firing `export_clicked` since IMPL-043 — all silently dropped, so export
  usage never reached Analytics Engine. Fixed on branch: allowlisted
  `export_clicked`, `workshop_saved`, `workshop_loaded`, `workshop_exported`,
  `workshop_imported`, `troubleshoot_used`; **blob19 generalized from
  feedback-category-only to a shared per-event `detail` dimension** (feedback
  category / export type / export scope / symptom). Blob order + count (20)
  unchanged, so existing rows and queries keep working. New `features` canned
  query + "Feature Usage" dashboard panel. **This overlaps the ROADMAP-queued
  "analytics EVENT_KEYS full-schema" finding from the Android planning session —
  reconcile the two before merge (this branch is a superset; confirm it also
  carries the `android` HMAC branch or note that as still-open).**
- **Export state re-confirmed from `2026-07-06-cowork-appdev-learns-export.md`:**
  Bambu Studio export is BUILT + MERGED + LIVE (owner import test PASSED). Orca
  golden fixtures ARE captured (`scripts/fixtures/slicer-golden/orca-x1c-*-ref.json`,
  Orca is a BS fork — identical keys + inherits, version `2.1.0.18`, so Phase 3 =
  a small delta on the Bambu passthrough, NOT a new serializer). Prusa fixture
  present (`prusa-coreone-config.ini`), Phase 4 not built. So the owner's "export
  should already be implemented" is TRUE for Bambu only; Orca/Prusa native export
  is the still-open half of "differentiate between slicers".
- **TestFlight dispatch is GitHub Actions (owner-confirmed) — MUST verify the
  workflow next session.** This Linux env cannot build/sign iOS; the only way I
  can dispatch is triggering a GH Actions macOS-runner workflow (tag or
  `workflow_dispatch`). If it turns out to be Xcode Cloud/manual, the owner
  dispatches and I only prep code + bump build number.
- **iOS repo is `mustiodk/3dprintassistant-ios` (owner-confirmed).** `add_repo`
  was pending the owner's approval popup when the session wrapped — it is NOT yet
  in the session. First action next session: approve + clone + register root.

## What happened / Actions

All commits on `claude/cold-start-3dpa-issues-ihs5du` (pushed, unmerged):

- `4ed7fad` **#2** — Save button disables + reads "✓ Saved / ✓ Gemt" while the
  current config is codec-normalized byte-identical (multi fields sorted) to the
  loaded/just-saved profile; any change re-enables; deleting the backing profile
  re-enables. App-layer only (`app.js`, `locales/*`, `style.css`).
- `fcfbfa8` **#4a** — Workshop backup export picker: with >1 profile, ↓ Export
  opens "All profiles (N)" (full backup incl. tuning, unchanged format) or one
  named profile → `3dpa-profile-<slug>.json`. `exportJSON(ids?)` gains an optional
  filter (partial export omits global tuning); envelope shape untouched so single
  files import like full backups. Import toast now names the profile count. New
  test TC6b. (`workshop-store.js`, `app.js`, `index.html`, `style.css`, `locales/*`,
  `scripts/workshop-store.test.js` — all store tests green.)
- `2e7e216` **#5** — analytics Worker allowlist + blob19 `detail` generalization +
  `features` query + "Feature Usage" panel + spec update (see finding above).
  (`functions/api/analytics.js`, `functions/api/analytics-query.js`,
  `analytics.html`, `app.js`, `docs/specs/analytics-v1.md`.)
- `db53f75` **#3** — Discord invite → `discord.gg/4KmcHrPkcS` (`support.html`).
- `64a1bcb` **#4b** — export UI names its target slicer: "for Bambu Studio" by the
  Beta badge; copy fallback reads "↓ Copy for OrcaSlicer / PrusaSlicer" via
  `Engine.getSlicerDisplayName`. Pure UI. (`index.html`, `app.js`, `locales/*`,
  `style.css`.)

Verification done: `node scripts/workshop-store.test.js` all green; ad-hoc node
harness on the analytics Worker `__test` (20 blobs, detail routing, new events
accepted, `printer_selected` still rejected, `features` query builds); locale JSON
+ `node --check` on app.js + analytics.html inline script all parse.

## Owner interactions this session

- Supplied the permanent Discord invite.
- Corrected my stale read of IMPL-043 (export IS implemented for Bambu; golden
  files ARE uploaded) → directed me to the session logs.
- Stated **most reported bugs are the iOS app** and that fixes must happen in the
  same session to avoid cross-session drift.
- Answered #4 design: **yes** to an export shortcut on the profile page.
- Confirmed iOS repo name + that TestFlight is GitHub Actions ("but check").
- Requested this wrap + a locked next-session entry point to do the work fresh.

## Open questions / Follow-up

- **MERGE DECISION (owner):** this branch's 5 web commits are review-ready but
  unmerged; #5's data only starts flowing after merge + Cloudflare deploy.
- **iOS is the real work and is NOT started** — see locked entry point below.
- **#4 remaining design calls** carried into next session: (a) move iOS export out
  of the ··· overflow menu into a visible action; (b) add the profile-page export
  shortcut (owner said yes); (c) native Orca export (Phase 3, fixtures ready) is
  the substantive answer to "differentiate between slicers" — Orca serves 10/14
  brands; Prusa Phase 4 after.
- **Analytics finding reconciliation:** confirm this branch's #5 change is merged/
  aligned with the Android-session's queued EVENT_KEYS finding and whether the
  `android` HMAC auth branch is still owed.

## Next session

**Locked next entry point: iOS mirror of #2/#3/#4 + TestFlight build.** Full
kickoff in `docs/sessions/NEXT-SESSION.md`. In short: approve + clone
`mustiodk/3dprintassistant-ios`; verify the GH Actions TestFlight workflow; mirror
the Discord link (#3), the block-re-save (#2), and the export slicer-naming +
discoverability (#4, incl. moving export out of the ··· menu and a profile-page
shortcut); run XCTest; bump build number; dispatch (or hand the owner the exact
dispatch step). Decide web-branch merge with the owner in parallel.
