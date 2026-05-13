# Next session - cold-start prompt (3dpa web + iOS)

**Last updated:** 2026-05-13 after v1.0.4 S6 close. Phase 1.5 Codex audit packet is **prepped and pushed** (web `690519e`). Owner runs Codex manually using the dispatch command at the bottom of this file; once findings are pasted into `codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-response.md`, S7 cold-starts and triages per the IR rubric. Web `main` is at `690519e`; iOS `main` at `eeb2915` (untouched).

A stale file between sessions is acceptable. Regenerated on Trigger A / Trigger B / explicit owner ask.

---

>>> START >>>

# Cold-start: 3D Print Assistant — S7, v1.0.4 Phase 1.5 (Codex audit response triage + web-only remediation)

## Read First, In This Order

Follow Trigger C from the canonical protocol. Show progress while reading. Confirm current state, locked next step, and risks before making changes. Read:

1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
2. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/CLAUDE.md`
3. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/3dpa-context.md`
4. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md`
5. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/INDEX.md`
6. Last three session logs, in full (newest first):
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s6-codex-packet.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s5-impl.md`
   - `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-05-13-cowork-appdev-v1.0.4-s4-impl.md`
7. `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/NEXT-SESSION.md`
8. Task-specific files (THIS IS THE WORK):
   - **Codex response (the entry point):** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-response.md`. If empty, STOP — owner hasn't dispatched Codex yet. Surface that and end the session.
   - **Packet for reference (what Codex was asked):** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-packet.md`.
   - **Diff for reference (the surface Codex reviewed):** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/v1.0.4-audit/v1.0.4-commit-range.diff`.
   - **Phase 1.5 spec, plan, Step 5 layout (S7 cold-start procedure):** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/superpowers/plans/2026-05-13-v1.0.4-config-impact.md` Phase 1.5 Step 5 section.
   - **AI collaboration / IR severity rubric:** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/ai-collab.md`.
   - **Merged.md (locked SHA `5bcd68b`):** `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/reviews/2026-05-11-config-impact-qa/merged.md` — the original v1.0.4 scope source.

## Current State

- **v1.0.3 is live worldwide on the App Store.** Remote overlay `content_version=2026051202` adds `sparkx_i7` under Creality / i Series.
- **v1.0.4 Phase 1 is COMPLETE on web (7/7 tasks shipped).** Walkthrough has 8 cumulative v1.0.4 OK lines; profile-matrix-audit 55/55 curated + 47196 broad clean at every commit; validate-data clean.
- **v1.0.4 Phase 1.5 packet PREPPED and pushed** — web `690519e` (3 files: diff + packet + empty response under `codex/v1.0.4-audit/`).
- **Owner runs Codex manually.** Owner-gated dispatch (Option B low-touch). S7 cold-starts AFTER owner has pasted Codex findings into the response file.
- **Web `main` at `690519e`.** iOS `main` at `eeb2915` (untouched).
- **Phase shape:** Phase 1 ✅ → Phase 1.5 packet prep ✅ (S6) → **Phase 1.5 response triage (THIS SESSION, S7)** → Phase 2.1 (iOS engine/data sync + XCTest, Task 8) → Phase 2.2 (UI walkthrough + MARKETING_VERSION bump + ship, Task 9). Owner manually dispatches TestFlight after Phase 2.2.

## Recommended First Lane

S7 of the multi-session autonomous arc. This session reads the Codex response, triages findings, applies the autonomy/pause logic, and either remediates web-only OR pauses for owner adjudication OR confirms green-path collapse.

1. **`git status` in web + iOS** to confirm clean state. Confirm web HEAD is `690519e` (or later if owner committed something) and iOS HEAD is `eeb2915`.
2. **Read the response file in full** at `codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-response.md`.
   - **If empty:** STOP. Surface to owner: "Codex response file is empty — has Codex been dispatched yet? S7 needs the response before continuing." End the session.
3. **Triage findings per IR severity rubric** (CRITICAL / HIGH / MEDIUM / LOW / OBSERVATION). Count by severity. Apply stop conditions:
   - **≥1 CRITICAL or ≥5 HIGH** → STOP autonomous flow. Surface findings + recommended ordering + ask owner whether to remediate, defer to v1.0.5, or split. Wait for owner direction before any code touch.
   - **0 CRITICAL, 1-4 HIGH** → autonomous web-only remediation. One finding = one commit. Per-finding checkpoint applies between findings (if context budget tight, Trigger A close after each commit and continue in S7-N session). Re-run `validate-data` + walkthrough + matrix-audit per commit.
   - **MEDIUM/LOW only** → surface to owner with a recommended split: which to remediate this arc vs defer to v1.0.5 vs ignore. Owner triages; autonomous remediation only on accepted items.
   - **0 findings (or OBSERVATIONs only)** → green-path collapse. Note this explicitly in the session log + skip directly to S8 (Phase 2.1 / Task 8). The Trigger A close note for S7 should preface the S8 cold-start instead of regenerating an S8 entry-point file.
4. **Per-finding remediation pattern** (when autonomous): TDD-first per finding — RED block in `scripts/walkthrough-harness.js` asserting the fix, GREEN engine/data change, verification gate (validate-data + walkthrough + matrix-audit), commit `fix: <one-line>`, push. Same exact-value / exact-ID assertion discipline applied across S2-S5.
5. **Trigger A close** (or per-finding checkpoint wrap if context budget runs tight mid-remediation): session log + INDEX prepend + ROADMAP header/queue update + NEXT-SESSION regen for S8 (or for S7-continuation) + memory + vault sweeps + self-check.

## Scope Rules

- **Autonomy authorization (S7-specific):** web-only one-finding-one-commit remediation is autonomous under the autonomy/pause-conditions logic. Pause conditions take priority — never auto-remediate past the stop threshold.
- **No iOS changes.** iOS HEAD `eeb2915` stays untouched. Phase 2.1 is gated until Phase 1.5 closes (this session's remediation lands).
- **No autonomous Codex peer review.** The Phase 1.5 carve-out covered S6 packet prep + S7 response triage; it does NOT extend to dispatching follow-up Codex reviews on S7's remediation. If S7 remediation creates a new design surface that warrants peer review, surface to owner and stop.
- **No autonomous TestFlight dispatch.**
- **Trigger A close still runs at session end** — log + INDEX + ROADMAP + NEXT-SESSION regen. Memory + vault sweeps still run.
- **Stop conditions that trigger abort + Trigger B:** dirty working tree before any commit; verification gate fails after a remediation attempt (revert + surface, don't push broken); mid-flow adjudication needed; Codex response file format unparseable.
- **`[claude-adjudicated]` calls eligible for owner override** at any cold-start.

## S6-learned addition

**PHASE1_END pinning to the explicit Task 7 SHA (`901153a`) reads cleaner than HEAD-based bash.** NEXT-SESSION's bash for the diff snapshot at S5 close resolved `PHASE1_END` from `git log -1 main`, which would have set the endpoint label to S5's docs-only close commit `e36a91b`. The diff content was identical either way (filter excludes docs), but the packet's commit-range field reads more cleanly with the explicit Task 7 SHA. For S7 specifically: this lesson family ("plan templates can ossify around assumptions; verify the actual state") has now been reapplied at S5 (Task 6 PLA Basic → petg_basic substitution + 2 line-citation re-greps) and S6 (PHASE1_END pinning). When S7 cites engine.js line numbers in remediation commits, grep first.

## S5-learned reminder (still applies)

**Plan templates can encode stale line citations + stale data assumptions; recon before coding.** S5 caught this on Task 6 (PLA Basic carries no `safe_chamber_temp_max`) and Task 7 (line citation drift). S7 may face the same when remediating Codex findings — verify the actual file state, don't trust template literals from older docs.

## S4-learned reminder (still applies)

**When retiring or renaming a warning ID, sweep ALL test contracts before commit.** Walkthrough harness + profile-matrix-audit + validate-data + any other `scripts/*` files. S5 caught one drift pre-commit; S7 should apply the same discipline if remediation touches warning IDs.

## S3-learned reminder (still applies)

**When replicating engine logic in warning-side checks, MIRROR THE FULL RECIPE — don't use simplified subsets.** If S7 remediation involves new warning-side recipe checks (clamp logic, threshold comparisons), mirror the engine's full path including initial-layer offsets, env adjustments, and clamping bounds.

## S2-learned reminder (still applies)

**Write exact-value / exact-ID assertions in the harness from the start.** Reduces fixup round-trips. Apply to any new RED block in S7.

## Copy-paste-ready Codex dispatch command (for owner — run BEFORE S7)

```
=== Phase 1.5 packet ready ===
Packet: codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-packet.md
Diff:   codex/v1.0.4-audit/v1.0.4-commit-range.diff
Empty response file: codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-response.md

To dispatch Codex (run from terminal):
  cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant && \
    codex "Review per docs/codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-packet.md.
            Save findings to codex/v1.0.4-audit/codex-2026-05-13-v1.0.4-audit-response.md
            using IR severity rubric (CRITICAL/HIGH/MEDIUM/LOW/OBSERVATION).
            Honor 'Challenge this. Do not validate it by default.' framing per ai-collab.md."

Once Codex has written findings to the response file, kick off S7 with:
  "3dpa cold start"

S7 will read this NEXT-SESSION.md, read the response, and triage per the IR rubric.
```

## What you'll do across S7…S∞ (skim)

- **S7 (this session)** — Phase 1.5 remediation. Cold-start on owner-pasted response. Triage per IR rubric. Apply autonomy/pause logic. Either web-only one-finding-one-commit remediation, owner-paused adjudication, owner-triaged split, or green-path collapse. **No iOS work.**
- **S8** — Phase 2.1 / Task 8. Byte-identical engine + data copy to iOS; add new XCTests mirroring Phase 1 walkthrough assertions (+ any Phase 1.5 remediation); iOS XCTest green; one iOS local commit (engine + data + tests). **No push.** If S7 was green-path-collapsed, S8 absorbs the confirmation note.
- **S9** — Phase 2.2 / Task 9. UI screenshot walkthrough; MARKETING_VERSION bump 1.0.3 → 1.0.4 via `sed` + `xcodegen`; second iOS local commit (project.yml + .pbxproj); 5-point ship-ready handoff. **Owner manually dispatches TestFlight.**

Each web task was one commit per platform. iOS commits stay local until the 5-point ship-ready check passes at the end of S9.

<<< END <<<

---

**Maintenance note:** This file is regenerated on Trigger A / Trigger B / explicit owner ask per the lifecycle protocol.
