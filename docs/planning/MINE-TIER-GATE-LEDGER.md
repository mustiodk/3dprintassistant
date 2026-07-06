# MINE-TIER GATE LEDGER — W3 engine train (IMPL-044 plan Part 2)

**Session:** 2026-07-06 (autonomous, Fable 5) · **Branch:** `mine-tier-20260706` off `main` `6c9d4a0` (tag `mine-tier-baseline-20260706`)
**Contract:** `docs/superpowers/plans/2026-07-06-impl-044-w3w4-plan.md` Part 2 · spec `docs/specs/IMPL-044-W3W4-mine-tier-and-custom-filaments.md` §5
**Hard boundaries:** nothing merges to main; nothing deploys; iOS local commits only (push gate intact); `USE_LEGACY_EXPORT` + export path untouched; no Export Phase 2/3/4; no max_mvs fix.

> Ledger discipline: rows are ticked ONLY after the command ran and the output was observed. No pre-narration.

## G0 — Baseline (recorded 2026-07-06, all observed)

| Gate | Result |
|---|---|
| `git status` web | clean; `main == origin/main == 6c9d4a0` |
| iOS repo | `c647982` (1 ahead local — pre-existing, push-gated) |
| `engine-golden-snapshot --check` | **NO DRIFT (36 states)** (17 soft max_mvs schema warnings = known queued data gap, out of scope) |
| `validate-data` shasum | `c766befd6976db69dc965c933eb56681cef8576a3807d0cccaa046f9922ccf11` (tail: "All data files valid.") |
| `walkthrough-harness` shasum | `901cc4d220e11a00a5b5cb8ae6f79e3b82c1b72ddd584c1b6cfe1b9c6175a4dc` |
| `profile-matrix-audit` (Generated-stripped) shasum | `3bd3da7c364d1d273ce4c2b53c9322667dd77224ae9dc6d8e31400fb5d8fed9e` (matches prior session's display-stable hash) |

## Task gates (plan Part 2)

| # | Task | RED evidence (observed) | GREEN | Golden regen (deltas enumerated in commit) | Commit |
|---|---|---|---|---|---|
| 1 | Mode plumbing (`profileMode:'mine'`, `_tier` third layer, `setPersonalTuning`, pairKey guard) | walkthrough threw "setPersonalTuning must be a public engine API" | `[W3 T1] OK` | 36→39 states; shared changed: NONE; mine-noinj byte==safe; outer 100→90 | `4119625` |
| 2 | Temp deltas + NEW lower-bound floors | "must FLOOR at nozzle_temp_min 220 (raw 215); got 230 °C" | `[W3 T2] OK` | only 2 injected mine states, temp surfaces (incl. abs cap 280raw→270) | `5c4b94a` |
| 3 | Fan deltas + NEW 0–100 bounds (3 emissions) | "got max=100 overhang=100 min=70" (delta unapplied) | `[W3 T3] OK` | only 2 injected mine states, 3 fan emissions (mk4 90+20→100 bound) | `24ce5b8` |
| 4 | Retraction delta post-`_scaleRetraction` | "got 0.6 mm / 0.6" | `[W3 T4] OK` | only x1c-pla mine retraction surfaces 0.6→1 (+why) | `9708f1a` |
| 5 | Provenance `personal` | "prov must be personal ... got calculated" | `[W3 T5] OK` | 49 prov/why-only leaf changes, 2 mine states, zero value changes | `b5aac53` |
| 6 | Web UI: Mine segment + injection + share mine→safe | 3 REDs: "got safe,tuned" / "got p=a1&pm=mine" + "got null" / "FAIL acceptedFor date" | `[W3 T6] OK` + codec + tuning tests PASS + preview smoke (accept→Mine chip→0.8mm+prov→pm=safe URL→crafted-URL degrade→DA→light theme) | NO DRIFT (39) | `5538f2e` |
| 7 | Rules-table → troubleshooter.json remedy migration | **DEFERRED (explicit decision 2026-07-06)** — see below | — | — | — |
| 8 | iOS train (LOCAL commits only, push gate intact) | WorkshopStore tests fail-compile on old store ("no member 'acceptedFor'"; stash-run verified); EngineService mirror inverted-first RED `("81") != ("90")` | **134/134 passed** (was 125; +4 store +5 engine) | N/A (engine byte-identical `diff -q`) | `80040e6` sync · `4d5f2fc` store+fixture · `76e01f2` bridge+mirrors · `a7b160e` UI wiring |

## Task-7 scope decision (2026-07-06): remedy-block migration DEFERRED

Spec §3.3 committed the W3 engine train to migrating `workshop-tuning-rules.js`
magnitudes into structured `remedy` blocks in `data/rules/troubleshooter.json`.
**Deferred as an explicit follow-up, not executed on this train.** Rationale:

1. The spec's own trigger — "iOS W3 will be a second consumer" of the
   magnitudes — has NOT fired. This train's iOS scope (task 8) is engine
   byte-sync + XCTest mirrors + emitter key-preservation + third segment; iOS
   has no journal/harvest UI (I3 deferral), so nothing on iOS reads
   TUNING_RULES. The offsets iOS consumes arrive pre-materialized via the
   backup envelope's `tuning` section.
2. The spec's premise "that train opens data/ anyway" turned out false: the
   Mine tier landed with ZERO data/ changes (offsets ride the
   setPersonalTuning API), keeping validate-data + matrix-audit hashes
   baseline-identical throughout.
3. The migration is a zero-behavior-change refactor; folding it in would
   widen this already-large train's review surface for no user-visible gain.

**Follow-up owner:** the iOS journal/harvest train (when iOS gains the
Workshop journal + suggestions surface) — that is when the second consumer
becomes real. Queued in ROADMAP. The `sourceRef`-resolution Node test keeps
guarding table↔troubleshooter drift until then.

## Known display asymmetry (pre-existing, spec §5.1 — deliberately NOT widened)

`getAdvancedFilamentSettings.retraction_distance` (the filament panel's
Advanced row + the TEXT export's "Retraction length" line) shows the raw
material base — pre-W3 it already ignored nozzle/bowden scaling (HIGH-001
display family). In mine mode this is more visible: text export says
"Retraction length: 0.6 mm" while the resolved profile, the suggestion card,
and the Bambu JSON export all coherently say 1 mm (self-audit 2026-07-06,
verified by direct engine run: BS `filament_retraction_length ["1"]`, text
`0.6 mm`). Spec cold-read finding 5 pins the invariant as resolved ==
BS-export == card and says the W3 train must not widen the adv surface.
Queued as part of the existing HIGH-001-family display cleanup, not this
train.

## Cross-model review (2026-07-07)

| Step | Result |
|---|---|
| `bridge --health` | ok (v0.2.0; claude/codex/git CLIs + credential present) |
| `bridge --mode codex-only` | Codex returned **NO-GO: 2 HIGH + 1 MEDIUM + 1 OBSERVATION** (`codex/mine-tier-review/bridge-2026-07-07-000644-951128.md`) — all triaged below; the two in-scope findings fixed one-per-commit; **post-fix state: all gates green, both platforms** |

| # | Codex finding | Verification | Disposition |
|---|---|---|---|
| 1 | HIGH — live-URL `pm=safe` mapping + URL-beats-storage restore silently reverts Mine to Safe on refresh | **CONFIRMED** (code reading; T6 preview smoke had masked it via a stripped-path navigation) | **FIXED `cae683d`** — `encodeToParams` keeps mine; NEW `StateCodec.encodeForShare` owns the sender-side mine→safe mapping; `copyShareUrl` uses it. Browser-verified on the real bug path (reload with query present → Mine survives; share emits `pm=safe`). |
| 2 | HIGH — text/reference export filament retraction still raw (0.6) while resolved/BS-export say 1 mm in mine mode | **CONFIRMED** (self-audit found it independently pre-review) | **DEFERRED with rationale** — the correct fix (export surfaces read resolved values) touches the export path (hard session boundary: IMPL-043 P1 just shipped owner-verified; do not touch) AND moves non-mine golden bytes (scaling≠1 states); the mine-only patch (raw+delta) would emit a third value that is neither raw nor final — worse honesty. Queued with the HIGH-001 display family / Export Phase 2 (ROADMAP). Documented in "Known display asymmetry" above + OWNER-VERIFY. |
| 3 | MEDIUM — prov claims 'personal' when caps erase the delta (x1c+abs 60↔60) | **REPRODUCED** live | **FIXED `55beff8`** — counterfactual safe-base twin through the same cap chain; personal prov requires consulted AND value-changed. Golden NO DRIFT (twin provably inert). iOS mirror `2009d84` (135/135). |
| 4 | OBSERVATION — task-7 deferral is a tracked Part 2 contract variance | Agrees with the ledger's own record | Tracked here + ROADMAP follow-up (owner: iOS journal/harvest train). |

## Independent verification (fresh-context subagent, 2026-07-07)

9/9 checks **ALL-VERIFIED** by a fresh-context agent that re-ran every gate
itself: commit set exact; golden NO DRIFT (39); validate-data + matrix-audit
hashes == G0; walkthrough exit 0 with all six `[W3 Tn] OK` lines; 5 Node
suites green; golden fixture honesty (39 states, noinj==safe deep-equal,
mine values 1 mm / 90 mm/s / 210 °C / fan 80 / prov personal); iOS engine
`diff -q` identical + exactly the 4 W3 commits + clean tree; boundary checks
(nothing on main, zero `data/` changes, `USE_LEGACY_EXPORT` untouched).

## OWNER-VERIFY

**The 5-minute proof that your accepted tuning changes the profile:**

1. Open https://3dprintassistant.com is NOT enough — the branch is not
   merged. Run it locally instead: `cd ~/dev/Claude/Projects/3dprintassistant
   && git checkout mine-tier-20260706 && npx serve -l 4200 .` →
   http://localhost:4200
2. Configure **X1 Carbon + 0.4 nozzle + PLA Basic**. Note the baseline:
   Retraction distance **0.6 mm** (profile), nozzle temp **220 °C**.
3. Save the profile (💾), open **Workshop**, log **2 failed prints** on it,
   both tagged **Stringing / Oozing** (journal → Failed → tick Stringing).
4. A Suggestion card appears: "Retraction distance +0.2 mm … 2 failed
   prints tagged Stringing". Press **Accept**. "My tuning" now shows
   `Retraction distance +0.2 mm — X1 Carbon · PLA Basic`.
5. Back on **Configure**: the Profile Mode group now has a third segment
   **Mine**. Select it. Expected, within the new bounds:
   - Retraction distance: **0.6 → 0.8 mm** (exactly the accepted +0.2,
     capped far below the material max 2 mm) — hover the ⓘ: provenance
     says `personal — workshop tuning: retraction_distance_delta +0.2mm
     (accepted <date>)`.
   - Bambu export (Beta) carries `filament_retraction_length ["0.8"]`.
   - Switch back to Safe: 0.6 mm returns. Switch material → Mine segment
     disappears (pair-scoped). Share button URL carries `pm=safe`.
6. Accept the follow-up suggestion after logging another failed stringing
   print → 1.0 mm (+0.2 each accept, stops at +0.6 cumulative clamp).

**Branch review / merge / rollback:**

```bash
cd ~/dev/Claude/Projects/3dprintassistant
git log --oneline mine-tier-baseline-20260706..mine-tier-20260706   # 6 commits
git diff mine-tier-baseline-20260706..mine-tier-20260706            # full review
# merge + deploy (web auto-deploys from main):
git checkout main && git merge --no-ff mine-tier-20260706 && git push
# rollback BEFORE merge: nothing to do — main is untouched (tag mine-tier-baseline-20260706)
# rollback AFTER merge:  git revert -m 1 <merge-commit> && git push
```

**iOS:** 4 local commits on `3dprintassistant-ios/main`
(`80040e6`→`a7b160e`, on top of the pre-existing `c647982`) — push-gated;
they ride the next TestFlight train. 134/134 XCTests green. On-device Mine
appears only for a pair with imported/accepted tuning (import your web
Workshop backup to see it).

**Known asymmetry to not be surprised by:** the filament panel's Advanced
"Retraction length" row (and the text export's same line) shows the raw
material base (0.6) — pre-existing HIGH-001-family display behavior, spec
§5.1 says don't widen it on this train; the resolved profile, suggestion
card, and Bambu JSON are the coherent delta'd surfaces.
