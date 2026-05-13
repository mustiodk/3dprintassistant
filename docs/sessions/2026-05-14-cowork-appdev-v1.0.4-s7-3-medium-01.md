# 2026-05-14 — Cowork (appdev): v1.0.4 S7-3 — Phase 1.5 MEDIUM-01 first-layer bed-clamp attribution honesty (Phase 1.5 closes)

## Durable context

- **S7-3 closes Phase 1.5.** Owner-triaged scope: HIGH-01 + HIGH-02 + MEDIUM-01 + LOW-01 — all four shipped to web across S7-1 / S7-2 / S7-3 / S7-4. After this session's wrap, v1.0.4 transitions to **S8 (Phase 2.1 / Task 8 iOS engine + data byte-identical sync + XCTest mirroring + one iOS local commit, no push)** and then **S9 (Phase 2.2 / Task 9 UI walkthrough + MARKETING_VERSION bump 1.0.3 → 1.0.4 + second iOS local commit + 5-point ship-ready handoff)**. Owner manually dispatches TestFlight after S9.
- **Option B (per Codex's recommendation wording) chosen for warning copy.** Three branches: full-apply keeps the historical `"+N°C applied"` copy contract; fully-clipped switches to `"+N°C requested but fully clipped by <cap source>"`; partially-clipped emits `"+X°C applied (requested +N°C, partially clipped by <cap source>)"`. The cap source names the binding cap (material vs printer) based on `matBedCap <= prnBedCap` — actionable info for the user. This mirrors MEDIUM-05's `env_compensation_capped_by_material` nozzle-side attribution discipline.
- **Effective-delta computation is now duplicated across 3 engine sites.** `getAdvancedFilamentSettings` (~L1227), the new env warning rewrite in `getWarnings`, and the 14b `printer_max_bed_temp_clamped` initTarget all spell out the same `bs.bed_temp_base + bedAdj + (bs.initial_layer_bed_offset || 0) + (isPETG ? 5 : 0) + bedFirstLayerEnvAdj` recipe (with/without env adj depending on which site). Reviewer Important #1 flagged this — track as MEDIUM follow-up before any next bed-formula touch (extract `_computeInitBedTarget(state)` helper). Not in MEDIUM-01 scope; the one-finding-one-commit rule applies. Worth re-mentioning: the comment in the env warning block explicitly cross-references "line ~1227" twice — telegraphing the coupling.
- **The `(isPETG ? 5 : 0)` initial-layer override is now 3× duplicated.** Same drift risk as #1 above. Reviewer Important #2 flagged. Track together: data-drive via `material.initial_layer_group_offset` (or analogous) when the helper extraction lands.
- **Partial-clip branch (0 < effectiveAdj < requestedAdj) is the rare third state — and turned out reachable.** Initial impl shipped without harness coverage of this branch. Reviewer flagged "dead-untested today" — walking env+material combos found PLA + X1C + vcold is the ONLY naturally-reachable partial-clip combo with current data: PLA bed_temp_base=55, bed_temp_max=65; vcold bed_adj=5 + bed_first_layer_adj=10; effective = `min(70,65) - min(60,65)` = 5, partial-clipped by PLA's 65°C cap. Tightening commit `58d919b` added the assertion (e) for this combo. Important lesson family: when a multi-branch fix ships, exercise each branch in the harness with the most naturally-reachable real combo, not just the "main" path.
- **Code-review-then-tighten pattern caught a real Important finding for the third consecutive Phase 1.5 session.** S7-2 caught PVA scope creep; S7-4 caught Creality empty-MCS mis-targeting; S7-3 caught partial-clip-branch untested. Three for three — the discipline is paying for itself. Worth adding to the standing-rules cluster: "remediation arc with multi-branch / multi-surface impact requires internal code-review subagent between impl and tightening before push."
- **Profile-matrix-audit blind spot acknowledged but unfixed.** The 47196-config broad sweep uses `environment: 'normal'` per DEFAULT_STATE — does NOT exercise cold/vcold for the new `printer_max_bed_temp_clamped` emission surface. Reviewer Minor #6. Filed as backlog hygiene. The 4 (+1 in tightening) curated harness cases cover the documented combos; a broader env-axis sweep would catch future env-related regressions cheaply.

## What happened / Actions

1. **State check** at session start: web HEAD `8787bc1` clean; iOS HEAD `eeb2915` clean.
2. **Skill discipline** confirmed: 7 remediation-arc skills loaded earlier in this multi-turn session remain in scope (using-superpowers rule "Don't invoke a skill already running"); no re-load needed.
3. **Read Codex MEDIUM-01 finding in full** at `codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-response.md#MEDIUM-01`. Confirmed concrete static example: PETG Basic + cold env on a printer where the bed-cap is binding (material side at 85°C) — engine's initial-layer math already reaches the cap before env compensation, so the +7°C "applied" claim was a lie.
4. **Read engine.js anchor sites** in batch: `getAdvancedFilamentSettings` bed-temp math (1220-1245), env-warning emission (1607-1660), `printer_max_bed_temp_clamped` block (1737-1758). Confirmed the duplication points (3 sites).
5. **Small-cap printer survey** via Node script to find a printer-bound clip case. Two printers ≤95°C bed: `a1mini` (80°C) and `kobra_3_max` (90°C). Picked Kobra 3 Max for the pair test — PETG+cold pushes initTarget from 85 (pre-fix, env-excluded) to 92 (post-fix, env-included), crossing the 90°C cap.
6. **Per-finding plan: option B (rewrite copy)** for the env warning, **+ initTarget pair fix** for the cap-warning. Concrete TDD-RED cases identified: (a) PETG+X1C+cold (material full-clip), (b) PLA+X1C+cold (no clip), (c) PETG+Kobra3Max+cold (printer pair-fire), (d) PETG+X1C+cold non-regression on cap-warning.
7. **TDD-RED.** Wrote 4 assertion groups into a new `// ─── v1.0.4 P1.5 — MEDIUM-01 ... ─` block in `walkthrough-harness.js`, inserted between HIGH-12 close and DQ-2. Ran harness — threw on assertion (a)'s `"+7°C applied"` check with the actual lying copy: `"Cold garage (5–15°C) first-layer bed compensation: +7°C applied to first-layer bed temperature."` — exactly the Codex-flagged bug. RED for the right reason.
8. **TDD-GREEN (2 engine.js edits).**
   - Env first-layer bed warning at engine.js around L1637: replaced static `"+${env.bed_first_layer_adj}°C applied"` template with a three-branch effective-delta computation. Mirrors `getAdvancedFilamentSettings`'s `bs.bed_temp_base + bedAdj + (bs.initial_layer_bed_offset || 0) + (isPETG ? 5 : 0)` recipe, computes `initBedNoEnv`/`initBedWithEnv`/`bedCap`, then `effectiveAdj = Math.min(initBedWithEnv, bedCap) - Math.min(initBedNoEnv, bedCap)`. Three copy branches: full-apply, fully-clipped, partially-clipped.
   - 14b `printer_max_bed_temp_clamped` initTarget at engine.js around L1742: added `bedFirstLayerEnvAdj` so `initTarget` reflects the actual requested initial-layer bed (matching the emission's clamp math).
9. **Verify GREEN (initial).** Walkthrough 11 cumulative v1.0.4 OK lines (new `[v1.0.4 P1.5 MEDIUM-01]` line — was 10 after S7-4); curated 11/11 ✓; DQ-2 clean. validate-data 6/6 clean. profile-matrix-audit 47196 broad / 0 failures + 0 curated.
10. **Local commit `243be51`** — `fix: first-layer bed-clamp attribution honesty (P1.5 MEDIUM-01)`. No push yet; reviewer SHA range first.
11. **Internal code-review subagent dispatched** with SHA range `8787bc1..243be51`, canonical Codex MEDIUM-01 framing, owner-locked Option B context, 8 specific things to challenge (math duplication, isPETG magic, `effectiveAdj <= 0` defensive guard, partial-clip wording length, `${printer.name}` safety, matrix-audit env blindspot, base-over-cap edge case, anything else).
12. **Reviewer returned** structured report under 600 words: 0 Critical / 3 Important / 5 Minor. GO-with-fixes, confidence medium-high.
13. **Reviewer findings — triage:**
    - **Important #1** (math duplication 3×): Carry-forward. Reviewer says "Out of scope for this commit (one-finding/one-commit rule)." Tracked as MEDIUM follow-up.
    - **Important #2** (`isPETG` magic 3×): Carry-forward, pair with #1.
    - **Important #3** (partial-clip branch dead-untested today): **Must-fix accepted.** Walked env+material space; found PLA + X1C + vcold is the only naturally-reachable partial-clip combo (math: 60 + 10 vs cap 65 = effective 5, requested 10).
    - **Minor #5** (`${printer.name}` safety walk-through): **Quick comment added** for future readers — costs nothing, prevents speculative guards.
    - **Minor #6** (matrix-audit env blindspot): Carry-forward backlog hygiene.
    - **Minor #7** (warning text length on mobile cards): Carry-forward; visual check before next release.
    - **Minor #4** (`<= 0` vs `=== 0` defensive guard): "Fine as-is" per reviewer. No change.
    - **Hidden assumption #1** (smoke assert that emitted bed equals warning's claimed effective): Carry-forward; lands alongside #1's helper extraction.
14. **Tightening commit `58d919b`** addressing Important #3 + Minor #5:
    - Added partial-clip assertion (e) to the harness MEDIUM-01 block: PLA + X1C + vcold combo asserts `+5°C applied` + `requested +10°C` + `partially clip` text patterns. Console.log updated to mention all three branches.
    - Added a brief comment above the `capSource` ternary in engine.js explaining the `${printer.name}` safety invariant.
15. **Re-verify post-tightening.** Walkthrough 11 OK lines (HIGH-02 console line updated); validate-data 6/6; matrix-audit 47196/0 + 0 curated.
16. **Push.** `git push origin main` → `8787bc1..58d919b main -> main`. Cloudflare Pages auto-deploys.
17. **Trigger A close (this).**

## Files touched

**Web repo (`3dprintassistant`):**

- Modified: `engine.js` — across two commits:
  - `243be51` impl: env first-layer bed warning rewrite (effective-delta computation + 3 copy branches); 14b `printer_max_bed_temp_clamped` initTarget includes `bedFirstLayerEnvAdj`.
  - `58d919b` tightening: brief safety comment above the `capSource` ternary.
- Modified: `scripts/walkthrough-harness.js` — across two commits:
  - `243be51` impl: new "v1.0.4 P1.5 MEDIUM-01" block with 4 assertion groups (a–d).
  - `58d919b` tightening: added assertion (e) covering the partial-clip branch via PLA+X1C+vcold; console.log updated.
- (this close) Created: `docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s7-3-medium-01.md`.
- (this close) Modified: `docs/sessions/INDEX.md` — S7-3 entry prepended; Phase 1.5 closed.
- (this close) Modified: `docs/planning/ROADMAP.md` — header date + active-queue v1.0.4 pointer flipped from "Phase 1.5 in-progress" to "Phase 1.5 closed; S8 Phase 2.1 opens".
- (this close) Modified: `docs/sessions/NEXT-SESSION.md` — regenerated for S8 (Phase 2.1 / Task 8 iOS sync). Major surface change — first iOS-side session in the v1.0.4 arc.

**iOS repo (`3dprintassistant-ios`):** none. HEAD `eeb2915` untouched per Phase 2 gate. **Will be touched first in S8.**

## Commits

**Web `3dprintassistant` `main` (in order on top of S7-4 close `8787bc1`):**

- `243be51` — `fix: first-layer bed-clamp attribution honesty (P1.5 MEDIUM-01)` — 2 files (engine.js + scripts/walkthrough-harness.js), +131/-6. Impl commit.
- `58d919b` — `fix: tighten P1.5 MEDIUM-01 — partial-clip branch coverage + safety comment` — 2 files (engine.js + scripts/walkthrough-harness.js), +34/-1. Tightening commit per reviewer findings.

Both pushed via `git push origin main` after tightening verified green.

Plus the close commit produced by this session (session log + INDEX + ROADMAP + NEXT-SESSION regen).

**iOS:** no commits. HEAD `eeb2915`. **S8 will be first iOS-side session in v1.0.4 arc.**

## Open questions / Follow-up

Md-hygiene sweep findings (one-liner per check):

- **Root-level stubs:** only `CLAUDE.md` at repo root; real doc, not a redirect stub. Clean.
- **Untracked files:** working tree clean post-push.
- **Secrets in tree:** `grep -lE 'ghp_|sk-[A-Za-z0-9]{20,}|xoxb-|BEGIN [A-Z]+ KEY'` across engine.js + harness → no matches.
- **Protocol drift:** `diff -q Projects/CLAUDE.md Projects/AGENTS.md` → byte-identical.
- **Stale ROADMAP:** addressed inline — Phase 1.5 closed + S8 active-queue pointer added.
- **Duplicate specs:** none introduced.
- **Content-routing:** durable patterns live in this log's Durable context.

Carry-forward to S8 (Phase 2.1 / Task 8 iOS engine + data sync) and beyond:

- **Reviewer Important #1 + #2: extract `_computeInitBedTarget(state)` helper + data-drive `(isPETG ? 5 : 0)`.** Filed as backlog hygiene. Land before any next bed-formula touch.
- **Reviewer Minor #6: extend profile-matrix-audit.js to sweep cold/vcold env axis.** Filed as backlog hygiene. Would catch future regressions on `printer_max_bed_temp_clamped` and the env warning rewrite cheaply.
- **Reviewer Hidden assumption #1: smoke assertion that emitted `bed_temperature_initial_layer` equals the warning's claimed effective bed value.** Single combo (e.g. PETG+X1C+cold), would pin the duplication-drift risk between getAdvancedFilamentSettings and the env warning. Lands alongside the helper extraction.
- **Reviewer Minor #7: visual mobile-card check on warning text length** before next release. The partial-clip wording (~140 chars) is the longest. Manual smoke on the smallest breakpoint.
- **Shared `RETIRED_IDS` const array (S7-4 follow-up, still deferred).** Documented in S7-4 log; multi-arc audit beyond v1.0.4 scope.

S8 entry-point specifics:

- **iOS HEAD currently `eeb2915`** (last touched 2026-04-27 era, well before v1.0.4 Phase 1).
- **Web HEAD `58d919b`** (post-tightening) is the source-of-truth for what to `cp` to iOS. Specifically: `engine.js` + all 4 modified data files in v1.0.4 Phase 1 (materials.json, nozzles.json, printers.json, environment.json) + the harness-stable test surface from Phase 1.5.
- **XCTest mirroring** needs to cover the new behaviors landed across S2 → S7-3: strength `speed_multiplier`, env data layer + cold-warning copy + env clamp attribution, physical printer × nozzle guard, physical printer × plate guard + material plate range, 5-tier MCS resolver, chamber safe-cap guard, nozzle min-diameter cleanup + nozzle-side authority drop, Phase 1.5 HIGH-01 env-fan/draft_shield export, Phase 1.5 HIGH-02 PLA cold/chamber safety, Phase 1.5 LOW-01 retired-ID guards, Phase 1.5 MEDIUM-01 bed-clamp attribution. Many of these have parallel iOS XCTest assertions to add or update.
- **No push from iOS in S8.** Phase 2 gate stays active until S9's 5-point ship-ready check passes.

## Memory sweep

**Candidates considered, all rejected for durability:**

- "Internal code-review subagent caught a real Important finding for the third consecutive Phase 1.5 session" — already implicit in `feedback_skill_discipline_remediation_arcs.md`'s mandate. The "3 for 3" pattern is calibration evidence, not a new memory.
- "Effective-delta computation is duplicated 3× in engine.js and is a known drift risk" — narrow 3dpa-internal tactical note; lives in this log's Durable context. Reviewer Important #1 + #2 captured the follow-up. Not durable across other projects.
- "When a multi-branch fix ships, exercise each branch with the most naturally-reachable real combo, not just the main path" — useful TDD discipline observation, but already covered by `superpowers:test-driven-development`'s "edge cases and errors covered" checklist. Captured in this log.

**Result: no new memory entries.**

## Vault sweep

**Surfaces considered (per the canonical 6 in `Projects/CLAUDE.md` Trigger A vault-sweep checklist):**

- **Strategic decision / rationale** → `Obsidian Vault/10-Projects/3dpa.md`: phase milestone (Phase 1.5 closed) is captured in ROADMAP + INDEX. No strategic-level write-up needed.
- **New shorthand / term** → `memory/glossary.md`: no new shorthand introduced.
- **Cross-project pattern / routing change** → `Obsidian Vault/20-Areas/Development/toolchain.md`: the "code-review-then-tighten subagent" pattern has now validated across 3 consecutive sessions, but it's an in-skill discipline (already part of `superpowers:requesting-code-review`), not a new tool-routing rule.
- **Hobby observation that feeds product intuition** → `Obsidian Vault/20-Areas/Hobbies/3d-printing.md`: PETG-bed-cap behavior at 85°C is documented in Polymaker / Prusa wiki. Not Musti-unique; skip.
- **Consulting / external source:** N/A.

**Result: nothing durable to propagate.**

## Next session

**S8 — Phase 2.1 / Task 8 iOS engine + data byte-identical sync** opens. Phase 1.5 is CLOSED. Procedure: byte-identical `cp` of web's `engine.js` + `data/*.json` into iOS repo; update / extend iOS XCTest assertions to mirror Phase 1 walkthrough + Phase 1.5 (HIGH-01 / HIGH-02 / MEDIUM-01 / LOW-01) test surface where applicable; run iOS XCTest green; ONE iOS local commit (engine + data + tests). **No push.** Phase 2 gate stays active until S9's 5-point ship-ready check passes. After S8 closes, S9 cold-starts on Phase 2.2 / Task 9 (UI screenshot walkthrough + MARKETING_VERSION 1.0.3 → 1.0.4 + second iOS local commit + 5-point ship-ready handoff). Owner manually dispatches TestFlight after S9.

## Self-check (Trigger A Phase 5)

- **Phase 1 step 1** (`git status`): clean on web post-close-push; clean on iOS (`eeb2915`).
- **Phase 1 step 2** (project scope): 3dpa-web only this session; iOS untouched per Phase 2 gate.
- **Phase 1 step 3** (disambiguation): not needed — opening message named S7-3 MEDIUM-01 explicitly (after owner pivot clarification).
- **Phase 2 step 4** (md-hygiene): 7 checks ran; all clean. Findings under Open questions above.
- **Phase 2 step 5** (session log): written at `docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s7-3-medium-01.md`. Destination label **(5-documented)**.
- **Phase 2 step 6** (INDEX): S7-3 entry prepended; Phase 1.5 marked closed.
- **Phase 2 step 7** (ROADMAP): header date + active-queue line both updated to reflect Phase 1.5 closed + S8 Phase 2.1 opens.
- **Phase 3 step 8** (memory): 3 candidates considered, 0 written.
- **Phase 3 step 9** (vault): 5 surfaces considered, 0 to propose.
- **Phase 4 step 10** (NEXT-SESSION regen): regenerated for S8 Phase 2.1 — major surface change since this is the first iOS-side session in the v1.0.4 arc.
- **Phase 4 step 11** (copy-paste prompt): surfaced between `>>> START >>>` / `<<< END <<<` markers.
- **Phase 5 step 12** (self-check): this section.
