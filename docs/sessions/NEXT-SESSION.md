# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-13 after v1.0.4 S7-2 close (Phase 1.5 HIGH-02 shipped). Web `main` at `f2aa84f`; iOS `main` at `eeb2915` (untouched). Phase 1.5 owner-triaged scope: HIGH-01 ✅ + HIGH-02 ✅ + MEDIUM-01 (S7-3) + LOW-01 (S7-4) in v1.0.4; defer MEDIUM-02 + OBSERVATION-01 to v1.0.5. **S7-3 picks up MEDIUM-01** — first-layer bed-clamp attribution honesty.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — S7-3, v1.0.4 Phase 1.5 MEDIUM-01 (first-layer bed-clamp attribution honesty)

## Required skills — invoke at cold-start (owner directive 2026-05-13 post-S7-1, reaffirmed S7-2)

Per `superpowers:using-superpowers`, the rule is "invoke relevant skills BEFORE any response or action." For S7-N remediation arcs, that means loading these skills at cold-start, not when about to act:

1. **`superpowers:using-superpowers`** — meta-discipline.
2. **`superpowers:writing-plans`** — refine/review existing v1.0.4 plan if the finding's surface is non-trivial.
3. **`superpowers:executing-plans`** — plan-checkpoint discipline.
4. **`superpowers:requesting-code-review`** — dispatch a code-review subagent between impl and tightening commits. The HIGH-02 reviewer caught a real PVA scope-creep bug + a vcold harness gap + a validate-data schema gap — exactly the class of issues easy to miss in self-review. Keep using this pattern unless owner overrides.
5. **`superpowers:systematic-debugging`** — fallback when TDD-GREEN doesn't land cleanly.
6. **`superpowers:test-driven-development`** — rigid; RED → verify-fails → GREEN → verify-passes per finding.
7. **`superpowers:verification-before-completion`** — rigid; no completion claims without fresh evidence.

Load all seven via the `Skill` tool at the start of S7-3 (and S7-4). Announce each as it loads.

## Read First, In This Order

Follow Trigger C from the canonical protocol. Show progress while reading. Confirm current state, locked next step, and risks before making changes. Read:

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
6. Last three session logs, in full (newest first):
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s7-2-high-02.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s7-1-high-01.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s6-codex-packet.md`
7. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md` (this file)
8. Task-specific files (THIS IS THE WORK — MEDIUM-01 first-layer bed-clamp attribution):
   - **Codex finding MEDIUM-01 in full:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-response.md` (read the `### MEDIUM-01` section).
   - **`getAdvancedFilamentSettings` bed-temp computation:** `engine.js:1220-1245` (where `env.bed_first_layer_adj` enters `initBed` and where `bedCap` clamps).
   - **First-layer bed warning copy:** `engine.js:1624-1631` — emits `+NdegC applied to first-layer bed temperature` even when the delta was fully clipped by `bedCap`.
   - **Existing bed-clamp warning:** `engine.js:1706-1727` — should include `bed_first_layer_adj` in its attribution alongside the existing nozzle-side attribution discipline.
   - **Pair finding for attribution discipline parity:** `env_compensation_capped_by_material` (MEDIUM-05 from S2; covers the nozzle side — bed side currently lacks the same honesty).
   - **Concrete static example (Codex evidence):** `data/materials.json:520-526` for PETG Basic — `bed_temp_base: 75`, `bed_temp_max: 85`, `initial_layer_bed_offset: 5`. Cold env wants another +7°C bed delta but the engine's own +5 initial-layer offset already reaches the 85°C cap, so the requested +7 is fully clipped while the warning still reads "+7°C applied."

## Current State

- **v1.0.3 is live worldwide on the App Store.** Remote overlay `content_version=2026051202` ships i7 under Creality / i Series.
- **v1.0.4 Phase 1 COMPLETE (7/7 web tasks).** 10 cumulative v1.0.4 walkthrough OK lines after S7-2.
- **v1.0.4 Phase 1.5:** HIGH-01 ✅ (S7-1, `eaf3f09`) + HIGH-02 ✅ (S7-2, `a4b8873` + `f2aa84f` post-review tightening).
- **Web `main` at `f2aa84f`.** iOS `main` at `eeb2915` (untouched).
- **Phase shape:** Phase 1 ✅ → Phase 1.5 owner-triage ✅ → S7-1 HIGH-01 ✅ → S7-2 HIGH-02 ✅ → **S7-3 MEDIUM-01 (THIS SESSION)** → S7-4 LOW-01 → S8 Phase 2.1 → S9 Phase 2.2.

## Recommended First Lane — S7-3 MEDIUM-01 (first-layer bed-clamp attribution honesty)

### Codex's framing of the bug

`getAdvancedFilamentSettings` adds `env.bed_first_layer_adj` into `initBed` at `engine.js:1227`, then clamps `initBed` to `bedCap` at `engine.js:1234-1238`. `getWarnings` emits "`+NdegC applied to first-layer bed temperature`" at `engine.js:1624-1631` **whenever `env.bed_first_layer_adj > 0`** — it does not check whether the requested delta was actually applied after the clamp. Effect: the warning lies about emitted output when the bed-temp cap clips the delta.

### Concrete reproduction

PETG Basic + cold env on a printer whose `bed_temp_max` ≤ 85°C:
- `bed_temp_base: 75`, `initial_layer_bed_offset: 5` → engine's own first-layer offset already puts `initBed` at 80°C.
- Cold env's `bed_first_layer_adj: 7` would push to 87°C, but PETG's `bed_temp_max: 85` clips it to 85°C.
- Effective delta vs base = 10°C (not 12 = 5 + 7); effective env delta = 5°C (not 7).
- Current warning copy says `+7°C applied to first-layer bed temperature` — **lies**.

### Concrete surface

1. **Engine: compute effective post-clamp delta in `getAdvancedFilamentSettings` (engine.js:1220-1245)** and expose it on the returned object alongside the existing fields. Or compute it inline in the warning generator at `engine.js:1624-1631` from the same data the engine actually applies.
2. **Engine: warning honesty in `getWarnings` (engine.js:1624-1631).** Three options to choose between:
   - (A) Suppress the `env_${env.id}_bed_first_layer` warning entirely when the requested delta is fully clipped.
   - (B) Rewrite the warning copy to `"first-layer bed compensation: +N°C requested but clipped to material max (M°C)"` when partially or fully clipped.
   - (C) Always emit two warnings: the requested-delta warning AND a paired clip-warning when applicable.
   - (B) is the honest middle ground per Codex's `requested but clipped` language. Confirm with owner if ambiguous.
3. **Engine: pair the bed-clamp warning at `engine.js:1706-1727`** (`printer_max_bed_temp_clamped`) with attribution discipline — include `bed_first_layer_adj` in the cap explanation alongside `env.nozzle_adj` parity from the MEDIUM-05 work.
4. **Harness: new MEDIUM-01 assertion block.**
   - PETG Basic + cold env + small-cap printer (e.g., A1) → `env_${env.id}_bed_first_layer` either suppressed OR carries the new "requested but clipped" copy; effective delta computed correctly.
   - PETG Basic + normal env (no delta) → no false `env_${env.id}_bed_first_layer` warning (existing behavior, non-regression).
   - PLA Basic + cold env + same printer → effective delta == 7 (within cap), warning copy unchanged. Non-regression.

### Procedure

1. **`git status`** in web + iOS. Confirm clean. Web HEAD `f2aa84f`; iOS HEAD `eeb2915`.
2. **TDD-RED.** Author new harness block + run; verify each assertion fails for the right reason.
3. **GREEN.** Engine changes per the surface above. Run walkthrough harness; verify all GREEN. Run validate-data + profile-matrix-audit.
4. **Local commit.** Single impl commit on top of web `f2aa84f`. Don't push yet.
5. **Internal code review.** Dispatch general-purpose subagent w/ `requesting-code-review` prompt. SHA range `f2aa84f..HEAD_AFTER_IMPL`. Stress: warning copy phrasing choice (suppress vs rewrite vs paired), edge cases (partial clip, exact-cap delta, multiple env deltas — bed_adj + bed_first_layer_adj combinations), regression risk on the existing MEDIUM-05 attribution discipline.
6. **Tightening commit** if reviewer surfaces Important findings (matches S7-2 pattern). Re-run verification gate.
7. **Push** after green + reviewer-clear. `git push origin main` → Cloudflare auto-deploys.
8. **Trigger A close.** Session log → INDEX prepend → ROADMAP header/queue update → NEXT-SESSION regen for S7-4 → memory sweep → vault sweep → self-check.

## Scope Rules

- **Autonomous remediation eligible.** S7-3 is autonomous web-only per Phase 1.5 carve-out (MEDIUM lane within owner-triaged scope). Pause condition: if MEDIUM-01 remediation reveals a new design surface not covered by owner direction (e.g., a more invasive engine restructure required), STOP and surface to owner.
- **No iOS changes.** iOS HEAD `eeb2915` stays untouched. Phase 2.1 picks up after S7-4 closes.
- **No autonomous Codex follow-up review.** Phase 1.5 carve-out doesn't extend to peer-reviewing S7-N remediation.
- **No autonomous TestFlight dispatch.**
- **TDD-first per finding.** Rigid: RED → verify-fails → GREEN → verify-passes.
- **Verification before completion.** No completion claims without fresh evidence.
- **Internal code review subagent between impl and tightening** — pattern validated in S7-2; keep using it on S7-3 + S7-4.
- **Trigger A close runs at session end.** Per-finding-checkpoint discipline.
- **Stop conditions that abort + Trigger B:** dirty working tree before commit; verification gate fails after a remediation attempt (revert + surface, don't push broken); design ambiguity surfacing mid-implementation.

## S7-2 carry-forward (relevant for S7-3 and onward)

- **The `chamber_above_material_safe` guard pattern** (`mat?.field ?? mat?.enclosure_behavior?.field` fallback) proved its worth in S7-2 — zero engine line change required to extend the HIGH-05 guard from PETG to PLA once data carried the field. Keep this pattern when adding new material-aware guards. Engine surface stays stable; data is the dial.
- **Env-warning regex couples to `environment.json` literal copy.** Filed in S7-2 as known tech debt. Reviewer-recommended fix: `kind`-tagged warning objects. Not S7-3 scope unless MEDIUM-01 work touches `getWarnings` warning-shape semantics (which it might, since the env_bed_first_layer warning lives in the same generator). If it does — consider lifting at least the cold-env warnings shape to `{kind, text}` opportunistically. Discuss before lifting; pure scope-creep otherwise.
- **All three engine predicates from HIGH-02 are gated on `material.group === 'PLA'`.** MEDIUM-01 may need to gate behavior on bed-temp clamping, not material group — different axis. Don't confuse the two.
- **validate-data.js now schema-checks `safe_chamber_temp_max` + `open_door_threshold_bed_temp`.** Standing pattern: if engine.js gates behavior on a field's presence/value, validate-data.js should enforce its shape. If MEDIUM-01 introduces new data fields, mirror the discipline.

## After S7-3

- **S7-4 — LOW-01** (test-contract hardening). Add explicit negative assertions for retired warning IDs in successor positive cases: `nozzle_too_small` (alongside existing `cf_small_nozzle` guard), `k2_plus_cfs`, `creality_no_multicolor`. Should be a small, focused commit.
- **S8 — Phase 2.1 / Task 8.** Byte-identical engine + data copy to iOS; add XCTests mirroring Phase 1 walkthrough assertions + Phase 1.5 HIGH-01 / HIGH-02 / MEDIUM-01 / LOW-01. iOS XCTest green; one iOS local commit (engine + data + tests). **No push.**
- **S9 — Phase 2.2 / Task 9.** UI screenshot walkthrough; MARKETING_VERSION 1.0.3 → 1.0.4 via `sed` + `xcodegen`; second iOS local commit (project.yml + .pbxproj); 5-point ship-ready handoff. **Owner manually dispatches TestFlight.**

Each web finding lands as one or two web commits (impl + optional tightening per code review); iOS commits stay local until S9's 5-point ship-ready check passes.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
