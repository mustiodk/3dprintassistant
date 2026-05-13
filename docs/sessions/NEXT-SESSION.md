# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-13 after v1.0.4 S5 close. Phase 1 is COMPLETE on web: S5 shipped Tasks 6 + 7 in one session with zero reviewer round-trips (`6f9e542` chamber safe-cap guard + `901153a` nozzle-min-diameter cleanup + nozzle-side authority drop). 7/7 Phase 1 web tasks shipped; walkthrough has 8 cumulative v1.0.4 OK lines; profile-matrix-audit 55/55 curated + 0 broad failures. iOS HEAD `eeb2915` untouched. S6 target: Phase 1.5 — prepare the Codex audit packet at `codex/v1.0.4-audit/`, surface a copy-paste-ready dispatch command in the Trigger A close note, and stop. Owner runs Codex manually; S7 cold-starts on the response.

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — S6, v1.0.4 Phase 1.5 (Codex audit packet prep, owner-gated dispatch)

## Read First, In This Order

Follow Trigger C from the canonical protocol. Show progress while reading. Confirm current state, locked next step, and risks before making changes. Read:

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
6. Last three session logs, in full (newest first):
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s5-impl.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s4-impl.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s3-impl.md`
7. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md`
8. Task-specific files (THIS IS THE WORK):
   - **Phase 1.5 spec, plan, and packet template:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-05-13-v1.0.4-config-impact.md` — read Phase 1.5 section (starts around line 902).
   - **AI collaboration / Codex Review Packet template:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/ai-collab.md`.
   - **Merged.md (locked SHA `5bcd68b`):** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/reviews/2026-05-11-config-impact-qa/merged.md` — gives Codex the original v1.0.4 scope source.

## Current State

- **v1.0.3 is live worldwide on the App Store.** Remote overlay `content_version=2026051202` adds `sparkx_i7` under Creality / i Series.
- **v1.0.4 Phase 1 is COMPLETE on web (7/7 tasks shipped).** Task 1 strength `speed_multiplier`, Task 2 env data layer + cold-warning copy + clamp attribution, Task 3 physical printer × nozzle guard, Task 4 physical printer × plate guard + material plate range, Task 5 practical multicolor 5-tier resolver (9 sub-assertions in walkthrough), Task 6 chamber safe-cap guard, Task 7 nozzle min-diameter cleanup + nozzle-side authority drop.
- **Walkthrough harness has 8 cumulative v1.0.4 OK lines.** Profile-matrix-audit clean across 55/55 curated + 47196 broad configs at every Phase 1 commit. `validate-data` clean.
- **Web `main` is at `901153a` (Task 7 close).** iOS `main` is at `eeb2915` (untouched).
- **Phase shape locked at 4 phases:** Phase 1 (web Tasks 1-7) ✅ → **Phase 1.5 (Codex audit, owner-gated dispatch — THIS SESSION)** → Phase 2.1 (iOS engine/data sync + XCTest) → Phase 2.2 (UI walkthrough + MARKETING_VERSION bump + ship).
- **New warning IDs introduced across Phase 1** (S6 should grep `engine.js` for the canonical list; carry-forward from S5 log lists candidates but flags drift risk): `chamber_above_material_safe` (Task 6), `nozzle_below_min_diameter` (Task 7 — replaces retired `cf_small_nozzle` + `nozzle_too_small`), `plate_not_on_printer` (Task 4), `mcs_empty_no_multicolor` / `ams_lite_material_incompat` / `mcs_tier_cfs_guidance` / `mcs_tier_generic_non_ams_guidance` (Task 5), `env_compensation_capped_by_material` (Task 2), Task 3 printer-nozzle guard ID, Task 1 strength-multiplier clamp ID (verify against engine.js).

## Recommended First Lane

This is S6 of the multi-session autonomous arc. Owner-gated dispatch (Option B — low-touch). S6 prepares the packet AND a copy-paste-ready dispatch command AND a pre-created empty response file, then stops. Owner runs Codex manually.

1. **`git status` in web + iOS** to confirm clean state.
2. **Confirm the Phase 1 commit range and packet pre-requisites.**
   - Phase 1 start (last commit before Task 1): `5bcd68b` (S1 close — "docs: wrap SPARKX i7 overlay hotfix session").
   - Phase 1 end (Task 7): `901153a`.
   - Hand-verify both by `git log 5bcd68b^..901153a --oneline`.
3. **Execute Phase 1.5 Step 1 — Snapshot the Phase 1 commit-range diff.**
   ```bash
   PHASE1_START=5bcd68b
   PHASE1_END=$(git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant log --oneline -1 --format='%H' main)
   DATESTAMP=$(date +%Y-%m-%d)
   mkdir -p /Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/v1.0.4-audit
   git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant diff "$PHASE1_START..$PHASE1_END" \
       -- engine.js data/ scripts/walkthrough-harness.js scripts/profile-matrix-audit.js \
       > /Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/v1.0.4-audit/v1.0.4-commit-range.diff
   wc -l /Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/v1.0.4-audit/v1.0.4-commit-range.diff
   ```
   Expected: several thousand lines (engine + data + harness + audit changes across 7 tasks).
4. **Execute Phase 1.5 Step 2 — Author the Codex packet per [`docs/ai-collab.md`](../ai-collab.md) Review Packet template.**
   - Path: `codex/v1.0.4-audit/codex-${DATESTAMP}-v1.0.4-audit-packet.md`.
   - Template literals at `<...>` filled at execution time from actual Phase 1 commit list, walkthrough OK-line count, new warning IDs (grep engine.js — see plan Phase 1.5 Step 2 for the full template, and the S5 log's carry-forward notes warning-ID list with drift risk flag).
   - Use the implementation plan's template verbatim (`2026-05-13-v1.0.4-config-impact.md` Phase 1.5 Step 2) and only fill in dynamic values.
5. **Execute Phase 1.5 Step 3 — Pre-create empty response file.**
   ```bash
   touch /Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/v1.0.4-audit/codex-${DATESTAMP}-v1.0.4-audit-response.md
   ```
6. **Verification gate (S6-specific):** `validate-data` + walkthrough (no `❌`) + `profile-matrix-audit` (0/0) — confirm no drift between Phase 1 close and packet prep.
7. **Commit + push:** one commit packaging the diff snapshot + packet + empty response placeholder. Subject: `chore: prep v1.0.4 Phase 1.5 Codex audit packet (owner-gated dispatch)`.
8. **Trigger A close (S6 → S7):** session log + INDEX prepend + ROADMAP header/queue update + NEXT-SESSION regen for S7 + memory + vault sweeps + self-check.
9. **In the Trigger A close note, surface the copy-paste-ready Codex dispatch command** — owner runs it manually. Example: `cd ~/Documents/Claude/Projects/3dprintassistant && cat codex/v1.0.4-audit/codex-${DATESTAMP}-v1.0.4-audit-packet.md` followed by paste-into-Codex-CLI instructions per `docs/ai-collab.md`.

## Scope Rules

- **Autonomy authorization (Phase 1.5 carve-out, narrow + additive):** S6 may autonomously *prepare* the Codex audit packet + diff snapshot + empty response file under `codex/v1.0.4-audit/` and surface a copy-paste-ready dispatch command in the Trigger A close note. **Owner runs Codex manually.** The blanket "No autonomous Codex peer review" rule remains in force outside this scoped Phase 1.5 carve-out.
- **No code changes this session.** S6 is documentation + diff snapshot only. Engine + data + harness + audit are untouched (Phase 1 is closed; any changes pre-Codex would invalidate the audit packet's commit range).
- **No iOS changes.** iOS HEAD `eeb2915` stays untouched. Phase 2 is gated until Phase 1.5 closes via S7 remediation.
- **No autonomous TestFlight dispatch.**
- **Trigger A close still runs at session end** — log + INDEX + ROADMAP + NEXT-SESSION regen for S7. Memory + vault sweeps still run.
- **Stop conditions that trigger abort + Trigger B:** dirty working tree before snapshot; diff snapshot fails (e.g., empty due to wrong range); cannot locate `docs/ai-collab.md` Review Packet template; mid-flow adjudication needed.
- **`[claude-adjudicated]` calls eligible for owner override** at any cold-start. If owner flips any default at this cold-start: edit `merged.md`, re-snapshot the lock SHA, proceed.

## S5-learned addition

**Plan templates can encode stale line citations + stale data assumptions; recon before coding.** Task 6's plan template said `engine.js:1566-1574` (actual site at 1739-1748) and assumed PLA Basic carried `safe_chamber_temp_max` (actual: only PETG/PET-group materials carry it under `enclosure_behavior.safe_chamber_temp_max=50`). Task 7's plan said `engine.js:1424-1427` for `cf_small_nozzle` (actual: 1524-1529). For S6 specifically: don't blindly copy template literals from the plan — read `docs/ai-collab.md` Review Packet template + the plan's Phase 1.5 Step 2 layout, then fill dynamic values from the actual engine.js / harness / audit state at HEAD.

## S4-learned reminder (still applies)

**When retiring or renaming a warning ID, sweep ALL test contracts before commit.** S5 successfully applied this for Task 7's `nozzle_too_small` → `nozzle_below_min_diameter` rename (caught `profile-matrix-audit.js:280` pre-commit). S6 should grep `engine.js` for the canonical Phase 1 warning-ID list rather than trust this NEXT-SESSION's drift-risk list — drift between session-log carry-forward and reality is real.

## S3-learned reminder (still applies)

**When replicating engine logic in warning-side checks, MIRROR THE FULL RECIPE — don't use simplified subsets.** Not directly relevant to S6 (no engine work) but stays in the carry-forward for Phase 2.1 iOS sync (Task 8 in S8).

## S2-learned reminder (still applies)

**Write exact-value / exact-ID assertions in the harness from the start.** Not directly relevant to S6 (no harness work) but stays in the carry-forward for any future Phase 2 / iOS XCTest authoring (Task 8 in S8).

## What you'll do across S6…S∞ (skim)

- **S6 (this session)** — Phase 1.5 packet prep. Snapshot Phase 1 commit-range diff; author packet per `docs/ai-collab.md` Review Packet template; pre-create empty response file; surface copy-paste-ready Codex dispatch command in Trigger A close note. **Owner-gated: S6 ends after packet prep; owner runs Codex manually.**
- **S7** — Phase 1.5 remediation. Cold-start on owner-pasted response file at `codex/v1.0.4-audit/codex-YYYY-MM-DD-v1.0.4-audit-response.md`. Triage per IR rubric. Stop conditions: ≥1 CRITICAL or ≥5 HIGH → pause for owner; 1-4 HIGH → autonomous web-only one-finding-one-commit remediation; MEDIUM/LOW → owner-triaged. **Green-path collapse:** if Codex returns 0 findings, S7 compresses into a confirmation note at the start of S8.
- **S8** — Phase 2.1 / Task 8. Byte-identical engine + data copy to iOS; add 7 new XCTests mirroring Phase 1 walkthrough assertions; iOS XCTest green; one iOS local commit (engine + data + tests). **No push.**
- **S9** — Phase 2.2 / Task 9. UI screenshot walkthrough; MARKETING_VERSION bump 1.0.3 → 1.0.4 via `sed` + `xcodegen`; second iOS local commit (project.yml + .pbxproj); 5-point ship-ready handoff. **Owner manually dispatches TestFlight.**

Each web task was one commit per platform. iOS commits stay local until the 5-point ship-ready check passes at the end of S9.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
