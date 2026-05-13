# 2026-05-14 — Cowork (appdev): v1.0.4 S7-4 — Phase 1.5 LOW-01 test-contract hardening

## Durable context

- **S7-4 shipped LOW-01 (test-contract hardening) before S7-3 (MEDIUM-01).** Owner pivoted the per-finding order during the same conversation that wrapped S7-2: LOW-01 first, then MEDIUM-01. The two findings are independent (different engine surfaces — LOW-01 is test-only, MEDIUM-01 touches `getWarnings` bed-attribution path), so reordering is safe; the original S7-N numbering is a sequence label, not a strict dependency. After this session, the remaining v1.0.4 Phase 1.5 work is S7-3 (MEDIUM-01) → S8 (Phase 2.1) → S9 (Phase 2.2).
- **Test-only commit pattern with degenerate RED→GREEN cycle, demonstrated honestly.** LOW-01 adds negative assertions for retired warning IDs. Since the underlying behavior is already correct (the IDs were retired in S4/S5), the assertions pass on first run — the natural RED phase is degenerate. Pragmatic TDD discipline applied: wrote ONE representative negative assertion (`nozzle_too_small`) deliberately inverted first (assert `includes` instead of `!includes`), ran harness, watched it throw with a clear error message naming the actual emitted warning IDs — proving (a) assertion machinery works, (b) error-message shape would correctly name the offender on a real regression, (c) `nozzle_too_small` is genuinely absent from current emissions. Flipped to correct form, re-ran GREEN. Trusted the other three negative assertions by symmetry. Full harness GREEN verified them collectively. Worth keeping this "inverted-first demonstration on one representative case" pattern for future test-only hardening commits — it gives an actual RED→GREEN demonstration without absurd extra work.
- **The reviewer caught a real placement bug the committer missed (mirror of S7-2's PVA scope creep).** Initial commit `d863635` paired `creality_no_multicolor` (negative) with the empty-MCS positive successor case on `centauri_carbon` — an Elegoo printer. But the retired warning was *manufacturer-gated to Creality* per S4's retirement context. A regression that re-introduces the manufacturer gate would emit on a Creality empty-MCS printer and the Elegoo-printer guard would stay silent. Tightening commit `bc9c655` added a parallel sub-case on `ender3_v3_se` (Creality manufacturer + empty MCS) — substantively strengthens the regression test. Lesson family: when adding negative regression guards, exercise the *gate* the retirement removed, not just any printer that satisfies the successor's positive case. Two consecutive sessions now (S7-2 + S7-4) the internal reviewer found a real Important issue the committer missed — pattern is paying for itself.
- **Vacuous-by-construction risk for retired-ID guards (reviewer Important #1).** The harness `if (ids.includes('xxx')) throw` shape is forever-passing if engine.js never emits the literal — perfect for catching real regressions, useless against typo-class regressions where a new ID with one character off (e.g., `nozzle_to_small`) is introduced. Reviewer suggested a shared `RETIRED_IDS` const array referenced from both harness and engine — a future retirement is one array push, and there's a canonical list to grep against. Carried as informational follow-up (not S7-4 scope) — would expand to "every retired ID across all phases" which is multi-arc audit territory. Filed for future hygiene pass.
- **Belt-and-braces matrix-audit guard on the `k2` (non-Plus) case is acceptable but not the primary coverage.** Reviewer Important #3 noted that `noWarning('k2_plus_cfs')` on the `postfix-k2-pla-multicolor-cfs-copy` case (printer `k2`, not `k2_plus`) is the weaker assertion — the retired ID was specifically named `k2_plus_cfs` and the regression would re-fire on `k2_plus`, not `k2`. The primary coverage is the new matrix-audit guard on `creality-k2plus-multicolor-cfs` at line 146 + the harness CFS branch on `k2_plus`. Not changed; documented as belt-and-braces in this log.
- **MCS console.log copy now explicitly mentions retired-ID silence; HIGH-12 console.log matches.** Symmetry concern from reviewer Minor #4 closed. Future readers scanning OK lines see at-a-glance which retired IDs each block protects against.

## What happened / Actions

1. **State check** at session start: web HEAD `28089e5` (S7-2 close-follow-up — three commits ago at session wrap); iOS HEAD `eeb2915`. Both clean.
2. **Owner pivot acknowledged.** S7-3 (MEDIUM-01) was the NEXT-SESSION-locked entry point; owner re-ordered to S7-4 (LOW-01) this turn. Independent findings, safe to reorder; original arc numbering preserved as sequence labels.
3. **Skill discipline confirmed.** All 7 remediation-arc skills loaded earlier in this multi-turn session remain in scope; per using-superpowers rule "Don't invoke a skill already running" no re-load needed.
4. **Codex LOW-01 finding read in full** at `codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-response.md#LOW-01`. Codex named 3 retired IDs (`nozzle_too_small`, `k2_plus_cfs`, `creality_no_multicolor`) and 4-5 unguarded successor cases (line numbers from the audit SHA `901153a`). Grepped current harness + matrix-audit at HEAD `28089e5` to map current state (line numbers had shifted): `cf_small_nozzle` already guarded once in harness HIGH-12 block; `k2_plus_cfs` guarded once in matrix-audit on a non-successor case; `creality_no_multicolor` already guarded once in matrix-audit postfix K2 case; `nozzle_too_small` had zero guards anywhere; harness MCS empty-MCS + CFS + CFS-Lite positive cases lacked any negative guards for the corresponding retired IDs.
5. **Per-finding plan: 4 harness assertions + 2 matrix-audit additions.** Mapped insertion sites to current line numbers (not Codex's audit-SHA line numbers).
6. **TDD-RED demo on `nozzle_too_small`.** Wrote the assertion deliberately inverted (assert `includes` instead of `!includes`) in the HIGH-12 block. Ran harness — threw with `v1.0.4 P1.5 LOW-01 RED-DEMO: inverted assertion fires as expected; got mat_tpu_85a_0,mat_tpu_85a_1,mat_tpu_85a_2,mat_tpu_85a_3,nozzle_below_min_diameter,nozzle_not_supported,tpu85a_enclosure,tpu85a_moisture`. Confirmed: (a) machinery works, (b) error shape names the actual emission set on a real regression, (c) `nozzle_too_small` genuinely absent. Flipped to correct form (`if (ids.includes(...)) throw`), re-ran GREEN.
7. **Wrote remaining 3 harness assertions** in correct form: `creality_no_multicolor` absent on MCS empty-MCS centauri_carbon case; `k2_plus_cfs` absent on MCS CFS k2_plus case; `k2_plus_cfs` absent on MCS CFS-Lite sparkx_i7 case. Updated MCS block console.log to mention retired-ID silence on successor cases.
8. **Wrote 2 matrix-audit additions:** `noWarning('k2_plus_cfs')` on the `creality-k2plus-multicolor-cfs` case at line 145-146; `noWarning('k2_plus_cfs')` alongside existing `noWarning('creality_no_multicolor')` on the `postfix-k2-pla-multicolor-cfs-copy` case at line 282-283.
9. **Verification gate (initial).** Walkthrough 10 cumulative v1.0.4 OK lines (same count — guards fold into existing HIGH-12 + MCS blocks); validate-data 6/6; profile-matrix-audit 47196 broad / 0 failures + 0 curated.
10. **Local commit `d863635`** — `test: harden contract for retired warning IDs (P1.5 LOW-01)`. No push yet; reviewer SHA range first.
11. **Internal code review via Agent (general-purpose subagent w/ requesting-code-review prompt).** Reviewer briefed with SHA range `28089e5..d863635`, canonical Codex LOW-01 framing, 6 specific things to challenge (successor-case coverage completeness, pairing rigor on `creality_no_multicolor` — Elegoo vs Creality, `k2_plus_cfs` on `k2` vs `k2_plus`, console.log churn inconsistency, test brittleness against typos, anything else). Reviewer returned structured report: 0 Critical / 3 Important / 3 Minor. GO-with-fixes, confidence medium.
12. **Reviewer findings:**
    - **Important #1** — Vacuous-by-construction risk: the negative assertions check literal IDs engine.js no longer references; a typo regression (`nozzle_to_small`) would slip past. Recommended shared `RETIRED_IDS` const array. **Carried as informational follow-up** — structural change beyond LOW-01 scope; the literal-ID guards still do what Codex asked.
    - **Important #2** — `creality_no_multicolor` placement is mis-targeted: centauri_carbon is Elegoo, but the retired ID was manufacturer-gated to Creality. **Must-fix accepted.**
    - **Important #3** — `k2_plus_cfs` on the `k2` (not k2_plus) postfix case is belt-and-braces, not primary coverage. **No change; commit message clarifies.**
    - **Minor #4** — HIGH-12 console.log doesn't mention `nozzle_too_small` (only MCS line was updated). **Fix accepted.**
    - **Minor #5** — TDD discipline note understates the gap. Calibration noted in tightening commit message.
13. **Tightening commit `bc9c655`** addressing the two accepted Important+Minor findings:
    - Added parallel empty-MCS sub-case using `ender3_v3_se` (Creality manufacturer + enclosure:none + multi_color_systems:[]). Asserts `mcs_empty_no_multicolor` fires positively AND `creality_no_multicolor` stays silent. Now both Elegoo-printer generalized re-introduction AND Creality-printer manufacturer-gated re-introduction are caught by the harness.
    - Updated HIGH-12 console.log from "cf_small_nozzle retired" to "retired cf_small_nozzle + nozzle_too_small silent on successor case (LOW-01)" — symmetry with the MCS block's updated console.log.
14. **Re-verify post-tightening.** Walkthrough 10 OK lines + curated 11/11 ✓ + DQ-2 clean; validate-data 6/6; matrix-audit 47196/0 + 0 curated.
15. **Push.** `git push origin main` → `28089e5..bc9c655 main -> main`. Cloudflare Pages auto-deploys (no-op for test-only changes — preview/build pipeline doesn't ship test scripts).
16. **Trigger A close (this).**

## Files touched

**Web repo (`3dprintassistant`):**

- Modified: `scripts/walkthrough-harness.js` — across two commits:
  - `d863635` impl: 4 new negative assertions (HIGH-12 `nozzle_too_small` absent; MCS empty-MCS `creality_no_multicolor` absent; MCS CFS `k2_plus_cfs` absent; MCS CFS-Lite `k2_plus_cfs` absent); MCS block console.log updated to mention LOW-01 retired-ID silence.
  - `bc9c655` tightening: new Creality empty-MCS sub-case using `ender3_v3_se` (paired `mcs_empty_no_multicolor` positive + `creality_no_multicolor` negative); HIGH-12 console.log updated to mention `nozzle_too_small`.
- Modified: `scripts/profile-matrix-audit.js` — in `d863635` only: added `noWarning('k2_plus_cfs')` to `creality-k2plus-multicolor-cfs` case at line 146 + `noWarning('k2_plus_cfs')` to `postfix-k2-pla-multicolor-cfs-copy` case at line 283.
- (this close) Created: `docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s7-4-low-01.md`.
- (this close) Modified: `docs/sessions/INDEX.md` — S7-4 entry prepended.
- (this close) Modified: `docs/planning/ROADMAP.md` — header date + active-queue v1.0.4 pointer updated to S7-3 (MEDIUM-01 is the only remaining Phase 1.5 web finding).
- (this close) Modified: `docs/sessions/NEXT-SESSION.md` — regenerated for S7-3 cold-start.

**iOS repo (`3dprintassistant-ios`):** none. HEAD `eeb2915` untouched per Phase 2 gate.

## Commits

**Web `3dprintassistant` `main` (in order on top of S7-2 close `28089e5`):**

- `d863635` — `test: harden contract for retired warning IDs (P1.5 LOW-01)` — 2 files (scripts/walkthrough-harness.js + scripts/profile-matrix-audit.js), +27/-3. Test-only commit; impl phase.
- `bc9c655` — `test: tighten P1.5 LOW-01 — Creality empty-MCS sub-case + console.log symmetry` — 1 file (scripts/walkthrough-harness.js), +15/-2. Tightening commit per internal reviewer findings.

Both pushed via `git push origin main` after tightening verified green.

Plus the close commit produced by this session (session log + INDEX + ROADMAP + NEXT-SESSION regen).

**iOS:** no commits. HEAD `eeb2915`.

## Open questions / Follow-up

Md-hygiene sweep findings (one-liner per check):

- **Root-level stubs:** only `CLAUDE.md` at repo root; real doc, not a redirect stub. Clean.
- **Untracked files:** working tree clean post-push, pre-close-commit.
- **Secrets in tree:** `grep -lE 'ghp_|sk-[A-Za-z0-9]{20,}|xoxb-|BEGIN [A-Z]+ KEY'` across both touched scripts → no matches. Clean.
- **Protocol drift:** `diff -q Projects/CLAUDE.md Projects/AGENTS.md` → byte-identical.
- **Stale ROADMAP:** addressed inline this close — header date + active-queue v1.0.4 pointer updated to S7-3.
- **Duplicate specs:** none introduced; LOW-01 changes sit entirely within existing scripts.
- **Content-routing:** durable patterns are arc-internal (kept in this log's Durable context); nothing belongs in ROADMAP or top-level protocol.

Carry-forward to S7-3 (MEDIUM-01 first-layer bed-clamp attribution honesty):

- **Codex finding MEDIUM-01 in full** at `codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-response.md#MEDIUM-01`. Already captured in the previous NEXT-SESSION regen at S7-2 close; will be re-surfaced in this session's regen.
- **Three warning-copy options** still on the table for S7-3 in-session decision: (A) suppress warning when fully clipped; (B) rewrite to "requested but clipped"; (C) paired warnings. (B) is the honest middle ground per Codex's wording.

Other follow-ups (informational, not S7-3 scope):

- **Shared `RETIRED_IDS` const array (reviewer Important #1).** Track as hygiene improvement. Would add typo-class regression coverage to all retired-ID guards across harness + engine. Multi-arc audit; defer.
- **Per-finding plan inline vs separate plan file.** Both HIGH-02 and LOW-01 used inline plans in the conversation rather than separate `docs/superpowers/plans/*.md` files. The canonical v1.0.4 plan at `docs/superpowers/plans/2026-05-13-v1.0.4-config-impact.md` predates Phase 1.5 insertion; for single-finding remediation inside an existing arc, inline plans work fine. Worth noting as a usage pattern.

## Memory sweep

**Candidates considered, all rejected for durability:**

- "TDD-RED demo on one representative case is the right discipline for test-only hardening commits where the natural RED is degenerate" — useful project-internal tactic but already implicitly captured in `superpowers:test-driven-development` (skill explicitly addresses test-after vs test-first). Captured in this log's Durable context. Not durable across projects in its current shape.
- "When adding negative regression guards, exercise the *gate* the retirement removed, not just any printer that satisfies the successor's positive case" — sharp lesson but narrow to engine-warning retirement arcs in 3dpa. Not durable beyond 3dpa.
- "Internal subagent code review catches placement bugs missed in self-review (S7-2 PVA scope creep + S7-4 creality_no_multicolor mis-targeting now both validated)" — already captured by `feedback_skill_discipline_remediation_arcs.md`'s `requesting-code-review` mandate. No new memory needed.

**Result: no new memory entries.**

## Vault sweep

**Surfaces considered (per the canonical 6 in `Projects/CLAUDE.md` Trigger A vault-sweep checklist):**

- **Strategic decision / rationale** → `Obsidian Vault/10-Projects/3dpa.md`: no strategic-level write-up needed. LOW-01 is test-contract hardening, not a strategic shift.
- **New shorthand / term** → `memory/glossary.md`: no new shorthand introduced.
- **Cross-project pattern / routing change** → `Obsidian Vault/20-Areas/Development/toolchain.md`: the "TDD-RED demo on one representative case for test-only hardening" pattern is potentially cross-project, but it's an existing TDD-skill discipline applied — not a new tool-routing rule. Skip.
- **Hobby observation that feeds product intuition** → `Obsidian Vault/20-Areas/Hobbies/3d-printing.md`: N/A — LOW-01 is test-side; no hobby insight surfaced.
- **Consulting / external source:** N/A.

**Result: nothing durable to propagate.**

## Next session

S7-3 cold-starts on Codex MEDIUM-01 (first-layer bed-clamp attribution honesty) — the last remaining Phase 1.5 web finding. Concrete entry point: `engine.js:1227` (`env.bed_first_layer_adj` into `initBed`) + `engine.js:1234-1238` (`bedCap` clamp) + `engine.js:1624-1631` (warning that claims `+NdegC applied` regardless of post-clamp truth) + `engine.js:1706-1727` (existing bed-clamp warning that should pair attribution discipline with MEDIUM-05's nozzle-side `env_compensation_capped_by_material`). Three warning-copy options laid out for in-session decision: suppress / rewrite to "requested but clipped" / paired warnings. Pattern: TDD-first per finding; internal code review subagent between impl and tightening commits (validated S7-2 + S7-4 — catches real Important findings the committer misses); full verification gate; one impl + one tightening commit on top if reviewer surfaces Important findings; push; Trigger A close → after MEDIUM-01 ships, Phase 1.5 closes and S8 (Phase 2.1 iOS sync, Task 8) opens. iOS still gated until S7-3 ships and Phase 1.5 closes.

## Self-check (Trigger A Phase 5)

- **Phase 1 step 1** (`git status`): clean on web post-close-push; clean on iOS (`eeb2915`).
- **Phase 1 step 2** (project scope): 3dpa-web only; iOS untouched per Phase 2 gate.
- **Phase 1 step 3** (disambiguation): not needed — opening message explicitly named S7-4.
- **Phase 2 step 4** (md-hygiene): 7 checks ran; all clean. Findings under Open questions above.
- **Phase 2 step 5** (session log): written at `docs/sessions/2026-05-14-cowork-appdev-v1.0.4-s7-4-low-01.md`. Destination label **(5-documented)** — 3dpa CLAUDE.md documents the convention.
- **Phase 2 step 6** (INDEX): S7-4 entry prepended.
- **Phase 2 step 7** (ROADMAP): header date + active-queue v1.0.4 pointer updated to S7-3 (the only remaining Phase 1.5 web finding).
- **Phase 3 step 8** (memory): 3 candidates considered, 0 written. Reasons in Memory sweep above.
- **Phase 3 step 9** (vault): 5 surfaces considered, 0 to propose. Reasons in Vault sweep above.
- **Phase 4 step 10** (NEXT-SESSION regen): regenerated for S7-3 MEDIUM-01 with carry-forward surface bullets and three warning-copy options.
- **Phase 4 step 11** (copy-paste prompt): surfaced between `>>> START >>>` / `<<< END <<<` markers in NEXT-SESSION.
- **Phase 5 step 12** (self-check): this section.
