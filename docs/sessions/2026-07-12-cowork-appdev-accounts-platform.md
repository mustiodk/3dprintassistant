# 2026-07-12 — Cowork (appdev): Accounts Platform — as-is analyse, spec + gated plan, review-til-GO

## Durable context

- **The Accounts Platform (optional accounts + cloud sync + filament inventory + My 3dpa hub) is now fully specced and planned, gated on owner AP0.** Spec: `docs/superpowers/specs/2026-07-11-accounts-platform-design.md` (APD0–APD15) · plan: `docs/superpowers/plans/2026-07-11-accounts-platform-plan.md` (AP0–AP11) · review ledger: `docs/reviews/2026-07-11-accounts-platform-review.md`. This deliberately supersedes the "no accounts / no backend" non-goal — but bounded (APD11): `3dpa-context.md` non-goals update only when AP1 merges; local-first stays forever (APD0).
- **The single most important owner decision is APD13:** shipping inventory + sync free would irreversibly gut MD2's "3dpa Pro" anchor (MD0 forbids retro-paywalls). Recommendation on the table: **(b) sync = Pro** (inventory local-first free; cloud sync = the one-time unlock). The plan is executable end-to-end only under option (a); (b)/(c)/(d) require a Phase-2 Pro companion plan before AP4.
- **The sync merge layer is NEW code, not reuse.** The hostile review disproved the draft's central reuse claim: shipped `workshop-store.js`/`WorkshopStore` merge is incoming-wins + tuning-op-union only. Sync v1 needs per-field rev maps, journal-record union, deletion ledger, tombstones with ack-based compaction, replica namespaces — sized as the largest client component (AP5 = 2 sessions, I2 = 2).
- **Review economics datum:** 17 Codex rounds + 3 sub-agent reviews to GO (trend 16→15→8→3→2→2→1→2→2→3→1→0, then plan-lens reopened 6 P1 → 4→2→2→2→0). K3 finding filed (`ai-operating-model/docs/findings/2026-07-12-greenfield-spec-cross-model-convergence-asymptotic-17-rounds.md`): budget O(10+) rounds for greenfield multi-domain specs, or split per domain; run the plan-executability lens before declaring cross-model GO.
- **Live-site side-finding (owner decision queued at AP0.5):** `functions/**`, `worker.js`, `wrangler.toml` are publicly fetchable on 3dprintassistant.com today (`[assets] directory="."`; `.assetsignore` doesn't cover them — verified 200s). No secrets exposed, but worth excluding before auth source lands.
- **bambuinventory reuse verdict:** data model + color matcher + spool-card UX port; PHP/MySQL stack + Gmail/MQTT personal infra do not. `import_meta` passthrough + `source:'import'` make the future one-time import bridge lossless (backlog #040).

## What happened / Actions

1. Cold start (Trigger C): health showed iOS `ahead:3` (normal push gate) + android/ensemble missing (known). Read protocol chain + ROADMAP + last 3 logs + monetization plan; **merged PR #13** (owner's recorded condition — "after the export wrap lands" — was satisfied by P2/P3/P4 all merging 2026-07-11).
2. Work Protocol Full lane (accounts + payment-adjacent + cross-platform + owner "komplet"). As-is analysis verified against code; spec drafted (APD0–APD15) on branch `claude/accounts-platform-spec-20260711`; gated plan drafted (AP0–AP11, one PR per gate, review gate before merge).
3. Review ladder: hostile sub-agent spec review (NO-GO: 2 P0 + 14 findings) → patched → **12 Codex rounds → GO** → hostile plan-executability review (GO-WITH-PATCHES: 6 P1 + 10) → QA verification (PASS WITH FIXES: 11) → **5 more Codex rounds → GO (R17, 0 findings)**. Every finding dispositioned; grouped-family commits (deviation from strict one-finding-one-commit for single-file doc patches — finding→hunk mapping preserved in commit bodies + review ledger).
4. ROADMAP: Accounts Platform queue row + backlog #039–#044 + #022 note. Review-dispositions ledger written.
5. Trigger A close + this wrap PR (owner-ordered merge).

## Files touched

- **Added:** spec, plan, review ledger, 13 bridge reports (`docs/reviews/bridge-2026-07-12-*.md`), this log.
- **Modified:** `docs/planning/ROADMAP.md` (queue row + backlog), `docs/sessions/INDEX.md`, `docs/sessions/NEXT-SESSION.md` (surgical additive note only), ai-om findings INDEX + calibration (own repo commit `2b7248b`).
- **No code, no engine, no data touched** (Codex R17 independently verified: API tests green, golden no drift).

## Commits

~25 docs commits on `claude/accounts-platform-spec-20260711` (drafts → per-review-family fixes → tracking), merged to `main` via the wrap PR. ai-om: `2b7248b`.

## Open questions / Follow-up

- **Owner AP0 (blocks execution):** ratify APD0–APD15 (esp. **APD13** a/b/c/d — recommendation (b)); Apple Services ID + SiwA App-ID capability + staging callbacks; Google OAuth client; privacy-policy delta approval; AP10 version pick (suggest 1.1.0); asset-exposure decision (AP0.5).
- **Md-hygiene findings:** none beyond the asset-exposure item above (protocol drift none; no stray tags; no untracked strays post-commit; secrets scan clean).
- **Lesson/finding sweep:** 1 K3 accepted (convergence asymptote — file linked above); 1 candidate declined (bash cwd resets — tool noise). No K1/K4. MCP not in scope.
- **Deviation note:** review fixes landed as family commits, not strictly one-finding-one-commit (43 findings across 5 review sources on two single files); mapping preserved in commit bodies + the review ledger.
- **Sequencing:** AP-execution must not collide with the in-flight 1.0.7 train (mac-mini) or the 1.0.8 tip-jar train; AP10 is strictly after both.

## Next session

- If owner replies AP0 GO: start **AP1** (backend foundation, dark) per the plan — or **AP7** (inventory local-first) which only needs AP0 and ships user value immediately.
- Otherwise the locked export/1.0.7 sequence continues on the codex track unchanged (ROADMAP is truth).
