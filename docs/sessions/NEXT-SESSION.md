# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-13 after v1.0.4 S7-1 close (Phase 1.5 Codex HIGH-01 shipped). Web `main` at `eaf3f09`; iOS `main` at `eeb2915` (untouched). Phase 1.5 owner-triaged scope: HIGH-01 + HIGH-02 + MEDIUM-01 + LOW-01 in v1.0.4; defer MEDIUM-02 + OBSERVATION-01 to v1.0.5. **HIGH-02 modeling locked to Option B** ("right thing, not cutting corners") — `safe_chamber_temp_max` data + engine + harness + material-aware cold-env warning copy rewrite. S7-2 picks up HIGH-02 next.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — S7-2, v1.0.4 Phase 1.5 HIGH-02 (PLA cold/chamber safety, Option B)

## Read First, In This Order

Follow Trigger C from the canonical protocol. Show progress while reading. Confirm current state, locked next step, and risks before making changes. Read:

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
6. Last three session logs, in full (newest first):
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s7-1-high-01.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s6-codex-packet.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s5-impl.md`
7. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md`
8. Task-specific files (THIS IS THE WORK — HIGH-02 PLA cold/chamber safety):
   - **Codex finding HIGH-02 in full:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-response.md` (read the `### HIGH-02` section — evidence cites engine.js / materials.json / environment.json / walkthrough-harness.js line numbers).
   - **Existing harness X1E+PLA silent assertion (to flip):** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/scripts/walkthrough-harness.js:849-855`.
   - **Chamber safe-cap guard (Task 6):** `engine.js:1746-1749` — fires `chamber_above_material_safe` only when material carries `safe_chamber_temp_max`.
   - **PLA heat-creep warning (passive enclosure only):** `engine.js:1502-1507`.
   - **Cold-env preheat checklist:** `engine.js:1366-1378`.
   - **Cold-env "Keep door closed" warning copy:** `data/rules/environment.json:31-34` (preserved verbatim through `getWarnings` at `engine.js:1607-1612` + `:1641-1643`).
   - **PLA-family heat-resistance baseline:** `data/materials.json:88-89` (`heat_resistance_c: 57` for PLA Basic). All PLA-family materials likely similar — confirm before assigning `safe_chamber_temp_max`.
   - **AI collaboration rubric:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/ai-collab.md`.

## Current State

- **v1.0.3 is live worldwide on the App Store.** Remote overlay `content_version=2026051202` ships i7 under Creality / i Series.
- **v1.0.4 Phase 1 COMPLETE (7/7 web tasks).** Walkthrough has 9 cumulative v1.0.4 OK lines after S7-1.
- **v1.0.4 Phase 1.5 owner-triage COMPLETE.** Codex audit response committed (`fe2964e`); triage 0 CRITICAL / 2 HIGH / 2 MEDIUM / 1 LOW / 1 OBSERVATION. Owner scope: HIGH-01 + HIGH-02 + MEDIUM-01 + LOW-01 in v1.0.4; defer MEDIUM-02 + OBSERVATION-01 to v1.0.5.
- **S7-1 SHIPPED Codex HIGH-01** to web (`eaf3f09`): live export surfaces (BS process / BS filament / plain-text / app.js advanced render) now read env-scaled `fan_min_speed` / `fan_max_speed` + emit `enable_draft_shield`.
- **Web `main` at `eaf3f09`.** iOS `main` at `eeb2915` (untouched). 9 cumulative v1.0.4 walkthrough OK lines.
- **Phase shape:** Phase 1 ✅ → Phase 1.5 owner-triage ✅ → S7-1 HIGH-01 ✅ → **S7-2 HIGH-02 (THIS SESSION)** → S7-3 MEDIUM-01 → S7-4 LOW-01 → S8 Phase 2.1 → S9 Phase 2.2.

## Recommended First Lane — S7-2 HIGH-02 (PLA cold/chamber safety, Option B)

### Why "Option B"

Owner explicitly chose Option B over A when triaging HIGH-02: *"nr 2 looks like the the best option if we want to do the right thing, not cutting corners"*. Option B is "Option A + material-aware rewrite of the cold-env 'Keep door closed' warning copy" — wider blast radius than data-only.

### Concrete surface

1. **Data: add `safe_chamber_temp_max` to PLA-family materials in `data/materials.json`.**
   - PLA-family IDs: `pla_basic`, `pla_matte`, `pla_silk`, `pla_metal`, `pla_cf`.
   - Suggested cap: **50°C** (conservative margin below PLA's 57°C softening point per `heat_resistance_c` field). Matches the PETG Basic precedent that S5 used for HIGH-05.
   - Recipe applies the existing chamber-safe-cap guard naturally (`engine.js:1746-1749`) — X1E (chamber max 60°C) + PLA will fire `chamber_above_material_safe`.

2. **Engine: extend cold-env warning path to be material-aware (the Option-B-specific part).**
   - `getWarnings` currently rewrites only the *first* env warning at `engine.js:1607-1612` and preserves subsequent JSON warnings verbatim at `:1641-1643`. The cold env's second warning ("Keep door closed throughout print") fires unconditionally from `data/rules/environment.json:31-34`.
   - Option B: intercept the second cold-env warning for PLA-family on enclosed/active-heated printers — either suppress it, or replace with PLA-specific "door / top open for PLA heat-creep mitigation" copy.
   - Cross-check with the existing PLA heat-creep warning at `engine.js:1502-1507` — currently gated on `printer.enclosure === 'passive'`. Option B may extend it to `'active'` for PLA-family so the positive open-door guidance fires symmetrically.

3. **Checklist: material-aware preheat-enclosure suppression.**
   - `getChecklist` at `engine.js:1366-1378` adds "Preheat enclosure" for any enclosed printer in cold/vcold env. For PLA-family on enclosed/active-heated printers this contradicts the open-door guidance. Suppress it for PLA-family + enclosed/active-heated combo.

4. **Harness: flip the X1E+PLA silent assertion.**
   - Existing assertion at `scripts/walkthrough-harness.js:849-855` codifies X1E + PLA silent on chamber guard — drop the silent-for-PLA line, replace with positive assertion that `chamber_above_material_safe` fires for X1E + PLA (X1E chamber 60°C > new PLA cap 50°C).
   - Add cold-env material-aware assertions: cold + PLA + X1E should NOT carry "Keep door closed" verbatim; should EITHER suppress that warning OR present the open-door PLA-specific copy.

### Procedure

1. **`git status` in web + iOS.** Confirm clean state. Web HEAD `eaf3f09` (or later if intervening commits); iOS HEAD `eeb2915`.
2. **TDD-first per the standing rule.** Per `superpowers:test-driven-development`:
   - Write **RED** assertions in `scripts/walkthrough-harness.js`: PLA + X1E fires `chamber_above_material_safe`; PLA-family on enclosed/active-heated printer + cold env does NOT carry the verbatim "Keep door closed" copy; checklist doesn't include "Preheat enclosure" for PLA-family + enclosed/active-heated + cold.
   - Run walkthrough — verify RED fails for the right reason on each new assertion.
3. **GREEN.**
   - Add `safe_chamber_temp_max: 50` to each PLA-family material entry in `data/materials.json`.
   - Extend `getWarnings` cold-env path with material-aware filtering for PLA-family on enclosed/active-heated printers.
   - Extend `getChecklist` preheat-enclosure entry with material-aware suppression.
   - Update / flip the existing X1E+PLA silent assertion to positive.
4. **Verification gate.** `node scripts/walkthrough-harness.js` (expect 10+ cumulative v1.0.4 OK lines), `node scripts/validate-data.js`, `node scripts/profile-matrix-audit.js`.
5. **Commit + push.** One commit: `fix: PLA-aware cold/chamber safety guidance (P1.5 HIGH-02)`. Push to `origin/main`. Cloudflare Pages auto-deploys.
6. **Trigger A close.** Session log → INDEX prepend → ROADMAP header/queue update → NEXT-SESSION regen for S7-3 (MEDIUM-01) → memory sweep → vault sweep → self-check.

## Scope Rules

- **Autonomous remediation eligible.** S7-2 is autonomous web-only per Phase 1.5 carve-out (1-4 HIGH lane). Pause condition: if HIGH-02 remediation reveals a new design surface not covered by owner direction (e.g., conflict between Option B's cold-env-copy suppression and an existing warning ID's positive surface), STOP and surface to owner.
- **No iOS changes.** iOS HEAD `eeb2915` stays untouched. Phase 2.1 picks up after S7-4 closes.
- **No autonomous Codex follow-up review.** Phase 1.5 carve-out covered S6 packet + S7 response triage; doesn't extend to peer-reviewing S7-N remediation.
- **No autonomous TestFlight dispatch.**
- **TDD-first per finding.** Load `superpowers:test-driven-development` skill before writing any production code. Rigid: RED → verify-fails → GREEN → verify-passes.
- **Verification before completion.** Load `superpowers:verification-before-completion` skill before claiming work done. No completion claims without fresh evidence.
- **Trigger A close runs at session end.** Per-finding-checkpoint discipline — Trigger A between S7-N findings.
- **Stop conditions that abort + Trigger B:** dirty working tree before commit; verification gate fails after a remediation attempt (revert + surface, don't push broken); design ambiguity surfacing mid-implementation.

## S7-1 carry-forward (relevant for S7-2 and onward)

- **Codex response file** at `codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-response.md` is the canonical source. S7-2 reads finding HIGH-02 in full before coding. Subsequent S7-N commits reference Codex finding IDs (P1.5 HIGH-02 / MEDIUM-01 / LOW-01).
- **`enable_height_slowdown` + `enable_draft_shield` array-wrapping irregularity** filed in S7-1 follow-up: both are in `BAMBU_ARRAY_FIELDS` but the boolean-toggle branch (`engine.js:2926-2931`) emits plain strings and returns early. Verify against actual Bambu Studio process-profile expectations when Phase 2.7a re-enables export UI. Not S7-2 scope.
- **Engine kept legacy plain-string `cooling_fan_min` key** in `getAdvancedFilamentSettings` output for back-compat with iOS pre-sync. S7-1 migrated consumers (text export + Bambu export + app.js advanced render) to S-wrapped `fan_min_speed` / `fan_max_speed`. Phase 2.1 Task 8 byte-identical sync will propagate cleanly.

## After S7-2

- **S7-3 — MEDIUM-01** (bed-clamp attribution honesty). `engine.js:1624-1631` claims `+NdegC applied to first-layer bed temperature` even when the requested delta was fully clipped by `bed_temp_max`. Compute effective post-clamp delta; emit cap/clip warning when partially or fully clipped. Pair: bed-clamp warning at `engine.js:1706-1727` should include `bed_first_layer_adj` in its attribution.
- **S7-4 — LOW-01** (test-contract hardening). Add explicit negative assertions for retired warning IDs in successor positive cases: `nozzle_too_small` (alongside existing `cf_small_nozzle` guard), `k2_plus_cfs`, `creality_no_multicolor`.
- **S8 — Phase 2.1 / Task 8.** Byte-identical engine + data copy to iOS; add XCTests mirroring Phase 1 walkthrough assertions + Phase 1.5 HIGH-01 / HIGH-02 / MEDIUM-01 / LOW-01. iOS XCTest green; one iOS local commit (engine + data + tests). **No push.**
- **S9 — Phase 2.2 / Task 9.** UI screenshot walkthrough; MARKETING_VERSION 1.0.3 → 1.0.4 via `sed` + `xcodegen`; second iOS local commit (project.yml + .pbxproj); 5-point ship-ready handoff. **Owner manually dispatches TestFlight.**

Each web finding lands as one web commit; iOS commits stay local until S9's 5-point ship-ready check passes.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
