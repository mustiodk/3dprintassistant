# 2026-05-11 — Cowork (appdev): config-impact QA pass + cross-pass review

## Durable context

- **Two real bugs landed at session start.** (1) Web Advanced filament temps weren't showing per-layer rows when initial == other (parity gap with iOS commit `3a59cd1`). Fixed and pushed in web `809549d` — Advanced view now always renders 4 explicit rows; Simple keeps the smart collapse. (2) Owner reported environment options barely move recommended nozzle/bed temps and community guidance suggests +10°C or more for cold-garage prints. Investigation surfaced a systemic shape — dead data fields, magnitude conservatism, material-blind handling — and was deferred behind a structured QA pass.
- **The QA pass workflow was novel for 3dpa: parallel-then-cross-pass review.** Sequential, independent — Claude first, then Codex — followed by a cross-pass exercise where each agent reads the other's deliverable + the other's review of them. Independence enforced via path obscurity (subdirectory) + opening-line constraint. Lifted only at the merge step. This is now a documented pattern in `docs/research/configuration-impact-qa-handover.md`.
- **Pass converged on 5 mutual HIGH findings** that are the safe core of the future v1.0.4 batch: `available_nozzle_sizes` DEAD, `available_plates` DEAD, `ams_lite_compatible` DEAD, `strength_levels[].speed_multiplier` DEAD, env dead-fields (`fan_multiplier` + `force_draft_shield` + the known `bed_first_layer_adj`). Each is a small, narrow-scope engine fix.
- **Two passes have meaningfully different shape.** Codex was tighter (~10 findings), Claude was wider (~29 findings). Codex caught 3-4 real findings Claude missed (cold-warning-text-vs-emit drift; empty-MCS prime_tower; surface-ironing data/runtime drift; `filament_condition` enum no-op). Claude caught 8 real findings Codex missed (multi-color SYSTEM-type differentiation, chamber safety gap, cf_small_nozzle warning copy bug, several material-side dead fields). The **union** is the value — neither pass alone is sufficient.
- **No CRITICAL findings** on either side. Both agree no actively-emitted unsafe value was reproduced. `safe_chamber_temp_max` is borderline-CRITICAL but only escalates the moment a chamber-temp profile field is added to active-chamber printer output.
- **Severity disagreements are narrow** (adjacent tiers, not factual). Claude over-rated `special` flags (HIGH→MEDIUM per Codex) and `decorative` (HIGH→MEDIUM); Codex under-rated `userLevel=advanced` (LOW→MEDIUM per Claude) and `nozzle.not_suitable_for` runtime DEAD (LOW→HIGH per Claude). Owner adjudicates final calls in the eventual `merged.md`.
- **App Review path unchanged.** v1.0.3 build `202605101637` still in App Review monitoring. No iOS push gate involved this session — all work was either web-only (`809549d`) or doc-only.

## What happened / Actions

1. Cold-start (Trigger C) confirmed v1.0.3 in App Review monitoring; locked entry point read.
2. Owner reported two bugs: web Advanced filament temps missing per-layer rows; environment compensation feels too small.
3. **Bug 1 — Advanced filament temps fix** investigated, planned, edited (`app.js:1213-1230`), validated (`validate-data` + walkthrough harness green), browser-smoke-tested via Claude Preview against A1+PLA Basic+std_0.4 (Advanced rendered 4 explicit rows; Simple kept collapse), committed and pushed as web `809549d`.
4. **Bug 2 — environment compensation** investigated, found `bed_first_layer_adj` DEAD plus material-blind cold compensation. Owner deferred fix pending broader QA pass to "find more problems like this."
5. **QA handover authored** at `docs/research/configuration-impact-qa-handover.md`: shared procedural spec for parallel Claude+Codex pass with read-only constraint, common methodology (5 phases), shared severity tiers, shared finding template, comparison protocol. Committed `9925f86`.
6. **Owner amended plan: sequential not parallel; Claude first, then Codex; Codex must not read Claude's deliverable.** Handover updated with peer-agent independence constraint + per-agent deliverable paths obscured (each agent told its path in opening line). Committed `ab979f4`.
7. **Claude QA pass executed** — Phase 0 pre-flight, Phase 1 data-file consumption audit, Phase 2 per-option output sampling, Phase 3 magnitude check (partial — no web access for tier-1 vendor sources), Phase 4 cross-option interaction matrix, Phase 5 synthesis. Two reviewer-agent passes spot-checked 20 highest-stakes findings (all confirmed). Throwaway sampler scripts deleted at synthesis. Deliverable at `docs/reviews/2026-05-11-config-impact-qa/claude.md`.
8. **Codex QA pass executed** (separately, via owner-triggered Codex session). Deliverable at `docs/reviews/2026-05-11-config-impact-qa/codex.md`.
9. **Cross-pass review (Claude reviews Codex)** — owner triggered the merge step; Claude read Codex's deliverable, produced a structured comparison (mutual agreements, gaps either side missed, severity disagreements, adjudicated v1.0.4 merge-batch priority). Appended to `claude.md` as a new section without altering original report content.
10. **Codex prompt drafted** for the symmetric exercise (Codex reviews Claude + Codex reviews Claude's review of Codex). Three explicit layers: direct review, meta-review, honest self-assessment. Owner will trigger the Codex session.
11. Trigger A wrap-up executed (this log + INDEX + ROADMAP + memory/vault sweeps + NEXT-SESSION + commit).

## Files touched

**Web repo:**
- `app.js` — Advanced filament temps fix (`809549d`).
- `docs/research/configuration-impact-qa-handover.md` — handover spec authored + amended for sequential/independence (`9925f86` + `ab979f4`).
- `docs/planning/ROADMAP.md` — QA-pass entry added under Active Work Queue + env-temp engine fixes parked under Deferred (`9925f86` + `ab979f4`); QA-pass status updated this session.
- `docs/reviews/2026-05-11-config-impact-qa/claude.md` — Claude QA deliverable (29 findings) + cross-pass review section appended.
- `docs/reviews/2026-05-11-config-impact-qa/codex.md` — Codex QA deliverable (10 findings, owner-triggered separate session).
- `docs/sessions/2026-05-11-cowork-appdev-config-impact-qa.md` — this log.
- `docs/sessions/INDEX.md` — entry prepended.
- `docs/sessions/NEXT-SESSION.md` — regenerated for next entry point.

**iOS repo:** none touched.

**Other:**
- `/Users/mragile.io/Documents/Claude/.claude/launch.json` — created at top-level so Claude Preview could find the dev-server config from working-dir level. Outside 3dpa repo; harmless side-effect to surface in case it confuses a future session.

## Commits

**Web `3dprintassistant` main:**
- `809549d` — `fix: show advanced filament layer temperatures` (Bug 1 fix; auto-deployed via Cloudflare Pages).
- `9925f86` — `docs: plan config-impact QA pass + park env-temp fixes` (handover doc + ROADMAP entry).
- `ab979f4` — `docs: enforce peer-agent independence in QA handover` (sequencing + independence).
- This session-close commit (deliverables + log + INDEX + ROADMAP + NEXT-SESSION).

**iOS `3dprintassistant-ios` main:** none.

## Open questions / Follow-up

- **Codex cross-pass review pending.** Owner has the prompt; will trigger Codex separately. Once Codex's cross-pass section lands in `codex.md`, the merge step produces `merged.md` in the same directory.
- **Adjudicated severity calls remain owner-decided.** Two cross-pass-reviews may disagree on the same call; owner adjudicates.
- **Material magnitude verification (Phase 3) is the weakest leg of Claude's pass.** No web access to Bambu / PrusaSlicer / OrcaSlicer bundled presets; vault Bambu sources are product/how-to pages, not preset tables. Recommended for a separate Gemini-style research handover before any value-changing implementation. Codex pass also skipped tier-1 sourcing (both agents agreed at gate decisions). Real gap.
- **No iOS-side action this session** but most of the QA findings imply engine.js changes which means iOS sync at v1.0.4 ship time. iOS push gate stands — no push until ship-ready for TestFlight.
- **Md-hygiene observation only:** top-level `~/Documents/Claude/.claude/launch.json` was created this session for Claude Preview MCP. Not a 3dpa repo file; surfaced here for awareness.

## Memory sweep

No durable memory to add. Specifically considered:
- The parallel-then-cross-pass workflow pattern — already documented in the handover file itself (`docs/research/configuration-impact-qa-handover.md`), discoverable, doesn't need a memory entry mirroring it.
- Owner-preference signals during the session — none surprising; consistent with existing memory entries (visible progress tracker on multi-step work used; no-cutting-corners verified by spawning reviewer agents; honest reporting bar honoured by Phase 3 limitation disclosure).

## Vault sweep

One candidate worth proposing for `Obsidian Vault/20-Areas/Development/ai-collaboration/`:

- **Cross-pass review pattern after independent parallel agents.** The pattern proven this session: (1) shared procedural spec, (2) sequential independent passes with peer-read constraint enforced, (3) lifted constraint at merge step, (4) each agent reviews the other's findings AND the other's review of them (the meta-layer is where most of the unique value lives), (5) owner adjudicates remaining disagreements in a merged report. This is potentially reusable for future high-stakes QA work across other projects (consulting deliverables, knowledge-hub design reviews, etc.). The handover at `Projects/3dprintassistant/docs/research/configuration-impact-qa-handover.md` is the concrete template — vault entry would link there + describe the meta-pattern in one paragraph + note the two failure modes (peer-read leakage from working tree; rubber-stamp adjudication where neither agent pushes back).

Owner decides whether to propagate. No autonomous edit.

## Next session

Recommended first lane: **Codex cross-pass review of Claude.** Paste the prepared Codex prompt (in chat above) into a fresh Codex session. Codex will append a cross-pass section to its own `codex.md`. Once that's done, the merge step produces `merged.md`.

If Apple settles v1.0.3 review during the wait, that takes priority over the QA-merge cycle — `release manually + monitor` per the prior NEXT-SESSION's locked entry point.
