# Phase 2 Implementation — Gate Ledger (Share + Persist + Workshop, web + iOS v1.0.6)

**Created:** 2026-07-05 · **Purpose:** single source of truth for where the Phase-2 implementation stands, so any model can resume safely after a stop.
**Prompt:** `docs/prompts/2026-07-05-fable5-phase2-implementation.md` · **Specs:** IMPL-042 (A+B), IMPL-044 (W1+W2).

---

## Why this file exists

Fable token budget is limited and the session may stop mid-way. This ledger plus the git history is the resume surface. **Every gate below ends at a clean committed (and, for web, pushed) boundary.** If a session stops, the repo is always at the last completed gate, and the next session — with any model — reads this file, finds the first unchecked gate, and continues. Do not rely on conversation context to resume; rely on this file and `git log`.

## Resume protocol (run this first, every session)

1. Read this ledger top to bottom. The first gate whose box is unchecked is your entry point.
2. Run `git status`. **If the tree is dirty, the previous gate did not complete.** Everything from a *completed* gate is committed, so uncommitted changes are partial work from a stopped gate. `git stash` it, inspect if useful, then discard and re-run that gate from a clean boundary. Never build on top of a half-finished gate.
3. For web gates, also confirm HEAD is pushed (`git status -sb` shows `## main...origin/main` with nothing ahead) before starting new work. If ahead, push first.
4. Execute exactly one gate. Meet its exit criteria. Commit (web: commit + push), and **tick this ledger's box + write the commit hash in the same gate's final commit** so the tick and the code are atomic.
5. Repeat until all gates are done, then the wrap-up gate.

## Invariants (hold for every gate)

- Zero changes to `engine.js` or `data/` on either platform. Proof: `node scripts/validate-data.js` and `node scripts/walkthrough-harness.js` pass with output unchanged from baseline (Gate W0). Run both before the first code commit and after the last.
- One logical change = one commit; stage every touched file (index.html/style.css included when structure changes).
- localStorage in try-catch; new user-facing copy gets English + Danish locale keys; PARAM_LABELS stay English.
- TDD-first with the repo's RED-evidence convention (`3dprintassistant/CLAUDE.md`).
- iOS `main` stays local-commit-only until the iOS ship gate (I5); web pushes at each gate.
- If an in-scope item seems to need an engine change: do not make it, record the conflict here under Notes, skip that sub-item, continue.

---

## Web gates

| Gate | Scope | Exit criteria | Status | Commit(s) |
|------|-------|---------------|--------|-----------|
| **W0** | Baseline. Read ground-truth files. Run validate-data + walkthrough, capture baseline output verbatim in Notes. Confirm clean tree, HEAD pushed. | Baseline captured; tree clean. | [x] | (read-only; ledger commit) |
| **W1** | IMPL-042 Phase A: state codec (encode/decode/validate) + Node round-trip tests (RED first); localStorage `3dpa_state_v1` restore-on-init with unknown-id degradation; "Start over" affordance. | New tests green; validate-data + walkthrough green & unchanged; UI smoke: refresh restores state, start-over clears. Committed + pushed. | [x] | `6431e07` (codec+tests) + this ledger-tick commit (persistence hook + start-over + toast) |
| **W2** | IMPL-042 Phase B: URL param encode/decode (extends W1 codec) + tests; Share button by Compare; `history.replaceState`; URL precedence over localStorage; invalid ids degrade. | Tests green; gates green; smoke: pasted `?p=...&m=...` URL restores chips; Share copies with toast. Committed + pushed. | [x] | this ledger-tick commit (URL restore precedence + Share button + replaceState) |
| **W3** | IMPL-044 W1: Workshop view (nav like Troubleshooter); save current config by name to `3dpa_workshop_v1`; list/restore/rename/delete; per-profile Share (W2 URL); "Export my Workshop" / "Import" JSON backup. Reuses W1 codec. | Storage tests green (round-trip, corrupt, quota, version); gates green; smoke both themes. Committed + pushed. | [x] | `f5217ed` (store+tests) + this ledger-tick commit (view, save/name modal, card actions, backup UI) |
| **W4** | IMPL-044 W2: per-saved-profile outcome records (worked / failed with tags reusing `data/rules/troubleshooter.json` symptom ids); optional note; deep-link a failed outcome into troubleshooter with symptom preselected. | Tests green; smoke: log an outcome, deep-link lands on the right symptom. Committed + pushed. | [x] | `1d40a58` (store journal + tests) + this ledger-tick commit (outcome dialog, journal rows, deep-link) |
| **W5** | Hygiene ride-alongs, one commit each: (a) add Danish keys `secNozzleTemp_prusaslicer` + `secBedTemp_prusaslicer`; (b) fix stale ROADMAP export status row (export is live for Bambu behind Beta, not disabled); (c) align public printer-count copy with count computed from `data/printers.json`. | validate-data green; three separate commits. Pushed. | [ ] | |
| **W6** | Web ship verification. Confirm all web pushed; `curl` live site + one share URL; 200 + app shell loads. | Post-deploy evidence recorded in Notes. | [ ] | (verify-only) |

## iOS gates (target v1.0.6 — verify actual MARKETING_VERSION first, bump per its real value)

| Gate | Scope | Exit criteria | Status | Commit(s) |
|------|-------|---------------|--------|-----------|
| **I0** | Baseline. Read `Models/AppState.swift`, Views tree, XCTest layout. Run existing XCTest green. Note current MARKETING_VERSION in Notes. | Existing XCTest green; version noted. | [ ] | (read-only) |
| **I1** | iOS state persistence: persist app-state JSON to Application Support; restore on launch with the same unknown-id degradation as web; XCTest. No engine work. | XCTest green. Local commit only (push gate). | [ ] | |
| **I2** | iOS Workshop W1 (SwiftUI): saved-profiles shelf; JSON backup document **byte-compatible** with web format (test this). | XCTest green incl. cross-format test. Local commit. | [ ] | |
| **I3** | iOS Workshop W2 (journal) — conditional. Implement only if it lands cleanly in the same design language; otherwise defer and record the decision in Notes. | XCTest green, or explicit documented deferral. Local commit or Notes entry. | [ ] | |
| **I4** | iOS finalize: EN + DA localized strings for all new copy; `MARKETING_VERSION` bump + xcodegen regen if used; full XCTest green via xcodebuild; build succeeds for TestFlight config. | Full XCTest green; TestFlight-config build succeeds. Local commit. | [ ] | |
| **I5** | iOS ship gate. Push `origin main` (push-gate "ready to ship" condition now met). Print the exact dispatch command for the owner. **Do not dispatch.** | Pushed; dispatch command printed; STOP before dispatch. | [ ] | |

## Stretch (only if everything above is green with budget left)

| Gate | Scope | Exit criteria | Status | Commit(s) |
|------|-------|---------------|--------|-----------|
| **S1** | IMPL-042 Phase C: landing-page generator + curated page set + sitemap + runbook regen step, exactly per spec. Finish whole or `git revert` clean — no half-landed generator. | Generator tests green; pages + sitemap generated; separate commits; pushed. | [ ] | |

## Wrap-up (final gate, always run before finishing)

| Gate | Scope | Status |
|------|-------|--------|
| **WRAP** | Session log (`docs/sessions/`, cowork-appdev), INDEX prepend, ROADMAP tick + export-row fix confirmation, memory/vault sweep, final plain-language summary with commit hashes + owner's remaining manual actions (TestFlight dispatch command; IMPL-043 Phase 0 golden-file homework; Search Console only if S1 ran). | [ ] |

---

## Notes / running log

(Each gate appends: baseline outputs, decisions, deferrals, post-deploy evidence, blockers. Keep terse. This is what a resuming model reads to understand what already happened.)

- 2026-07-05: ledger created; no gates started yet.
- 2026-07-05 **W0 baseline** (Fable session): tree clean, web HEAD `dfba404` = `origin/main`. `node scripts/validate-data.js` green (all 6 data files valid). `node scripts/walkthrough-harness.js` green ("All automated checks passed" + DQ-2 Safe/Tuned assertions ✓). Baseline recorded as output hashes for engine-untouched comparison — recompute with `node scripts/validate-data.js | shasum -a 256` and `node scripts/walkthrough-harness.js | shasum -a 256`:
  - validate-data: `c766befd6976db69dc965c933eb56681cef8576a3807d0cccaa046f9922ccf11` (10 lines)
  - walkthrough: `c80e437af75dc0fd14a3725ecbf3a6b6636713a3d497b74625073dcc916bbb7c` (1355 lines)
  - CORRECTION (W1): baselines were captured with stdout+stderr combined — compare with `node scripts/<script>.js 2>&1 | shasum -a 256` (the walkthrough emits 17 pre-existing "[Engine schema] soft warning" stderr lines that are part of the 1355-line baseline).
- 2026-07-05 **W1 done**: codec `state-codec.js` (browser `window.StateCodec` + Node `module.exports`; FIELDS table = single field-map for storage + URL, incl. the 6 extended advanced fields with short keys `se,b,bp,et,fc,i` and `x` for special — additive extension of the spec's param list for full-fidelity shares). Genuine TDD RED (module-not-found, exit 1) → 22 checks green. app.js: `persistState()` at top of `render()` (single choke point — every mutation path calls render), `restorePersistedState()` after Engine.init before applyLang (picker/chips/slicer restore falls out of the normal build path), `resetAll()` extracted and shared by header Reset + new "Start over" link (visible with printer summary), `showToast()` utility (reused by W2 share). Locale keys `startOver`/`restoredNotice` (en+da). UI smoke verified in preview: persist→reload→full restore (chips, summary, collapsed picker, slicer, toast); start-over clears + hides; retired-id degradation (bad printer dropped, valid material/nozzle kept, no crash); both themes; console clean apart from pre-existing Sentry-loader + engine-schema warnings (also present on live). Walkthrough + validate-data outputs diff-identical to W0 baseline. Also committed `.claude/launch.json` (preview server config, `npx serve -l 4200`). Doc drift noted for WRAP md-hygiene: `docs/3dpa-context.md:91` canonical state example uses `environment: "room_temp"` but real env ids are `normal/cold/vcold/humid`.
- 2026-07-05 **W2 done**: `restoreInitialState()` — URL params (decoded+validated via codec) win over localStorage; storage-restore keeps the toast, URL-restore deliberately silent. `syncUrl()` (`history.replaceState`) beside `persistState()` in render — every configured view bookmarkable. Share button (`#shareBtn`, green hover, hidden until profile) next to Compare; copies `origin+path+params` via clipboard API with an `execCommand` textarea fallback (headless preview blocks BOTH copy paths — wiring + URL content + toast proven with a resolved-write stub; real browsers on secure origins are fine). Locale keys `shareBtn`/`shareCopied` (en+da). Preview-verified: URL beats conflicting storage; csv `uc=functional,large` restores both chips; `sq` updates in address bar on mutation; invalid ids (`p=fake_printer_9000&sq=zzz`) degrade with valid fields kept; both themes. Gates diff-identical to baseline.
- 2026-07-05 **W3 done**: `workshop-store.js` `createWorkshopStore(storage)` — envelope `3dpa_workshop_v1 {v:1, profiles:[{id,name,state,notes,created,updated}]}`; import MERGES (imported wins on id collision) so restoring a backup never destroys local profiles; quota → `ok:false` no half-write. **This envelope is the cross-platform backup format I2 must match byte-compatibly** (`exportJSON` = `JSON.stringify(envelope, null, 2)`). Genuine TDD RED → 27 checks. UI: Workshop nav view (grid of cards: name/date/meta + Load/Share/Rename/Delete), ★ Save button in results header (suggested name "Material · Printer", name dialog `#nameModal` shared by save+rename, Enter commits), two-tap delete ("Sure?" arms 3s), per-profile Share via extracted `copyShareUrl(stateObj)`, Export/Import backup via hidden file input. Profile names are user input — escHtml'd everywhere (verified with `<b>` payload). 22 locale keys added (en+da). Preview-verified: save→list→load (restores state+URL+view switch), rename prefill, import via real file-input change event, dedupe/merge, two-tap delete, DA strings, light+dark. Gates diff-identical.
- 2026-07-05 **W4 done**: store `addOutcome/removeOutcome` — outcome `{id, result worked|failed, symptoms[troubleshooter ids], note≤500, date}`, `journal[]` additive (W1-era profiles fine), rides backups automatically. RED (`addOutcome is not a function`) → 41 checks green. UI: "+ Log a print" per card → outcome dialog (`#outcomeModal`: Worked/Failed segmented, symptom chips from `Engine.getSymptoms()` shown only on Failed, optional note ≤300); journal rows on cards (newest first, cap 4 visible, ✓ green / ✗ orange, localized tag names, × remove); failed outcomes with tags get "Troubleshoot →" deep-link → sets `activeSymptom` + view switch. 9 locale keys (en+da). Preview-verified: worked + failed w/ stringing logged, rows render, deep-link lands on troubleshooter with stringing preselected + causes rendered, × removes from DOM+storage. Gates diff-identical.
- 2026-07-05 W0 facts for later gates: (a) real app state (`app.js:66`) has 6 extended advanced fields beyond the canonical shape — `seam, brim, build_plate, extruder_type, filament_condition, ironing` — persistence covers ALL state fields; URL codec uses the spec's fixed param list + added short keys for the extended fields (single field-map table). (b) Danish key gap confirmed: `locales/en.json` 242 keys vs `da.json` 240; missing `secNozzleTemp_prusaslicer` + `secBedTemp_prusaslicer` (W5a premise verified). (c) **Cross-machine iOS caution:** this machine's iOS HEAD = `518f781` = `origin/main` (v1.0.5). The 2026-07-04 session's 3 local-only iOS mirror commits (`aedaac7`, `e304843`, `8129316` — data mirrors for snapmaker/creator/ender3_v4_combo) exist on the OTHER machine only. iOS gates here MUST re-mirror web `data/` byte-identical before I4 (recreating that content); after I5 pushes, the other machine's local iOS branch will diverge and the owner should `git reset --hard origin/main` there (content is duplicated, nothing lost). Record this in the WRAP owner-actions list.
