# 2026-07-11 — Cowork (appdev): Monetization brainstorm → Phase 1 tip-jar plan APPROVED

## Durable context

- **Monetization strategy is now decided and owner-ratified:** A+B phased — tip jar first (Phase 1), "3dpa Pro" one-time unlock deferred until filament inventory lands (Phase 2). Canonical record: [`../superpowers/plans/2026-07-11-monetization-phase1-tip-jar-plan.md`](../superpowers/plans/2026-07-11-monetization-phase1-tip-jar-plan.md) (MD0–MD4).
- **The load-bearing "why":** (1) Apple 3.1.1 forces all in-app developer donations/unlocks through IAP — Ko-fi/MobilePay links are web-only surfaces; (2) Workshop + Export are already shipped free on both platforms → retro-paywalling was explicitly rejected (community-trust + web-parity undermines it); (3) the no-accounts architecture makes iOS/Android-first monetization the cheap path (StoreKit 2 / Play Billing, no backend) — a web paywall would force building accounts, deliberately deferred.
- **Rejected alternatives:** subscription (no per-user service cost to justify it; hobby-community subscription fatigue) and paywalling shipped features (goodwill destruction). Owner goal confirmed as cost-cover + signal, not side income — keeps Phase 1 deliberately small.
- **Visibility decision:** base entry points only in Settings/About/footer + ONE lifetime contextual card at the user's 10th generated profile (local-state flag, dismiss = never again). No toolbar icon, no recurring prompts — tip-jars buried only in Settings convert ~0, hence the single value-moment card.
- **Denmark/tax:** Apple is merchant of record (consumer VAT handled); payouts + Ko-fi tips = taxable income (hobbyvirksomhed path). Open question flagged in the plan: whether Apple EU-B2B payouts require moms registration for reverse-charge reporting below the 50k threshold — verify with Skattestyrelsen before first revenue year-end.
- **Session isolation:** all work on branch `claude/monetization-brainstorm-20260711` (parallel Codex session active on the export sequence — nothing mixed; NEXT-SESSION got only a surgical additive note, not a regen, to avoid clobbering the codex session's in-flight surfaces).

## What happened / Actions

1. Cold start (Trigger C): sync gate caught web `behind:17` → clean ff-pull (Export Phase 2 merge + Phase 3 Orca work from the codex/mac-mini track). iOS `ahead:3` = normal push gate. Proceeded on owner-named task (monetization brainstorm) per the pivot rule.
2. Brainstorm (work-protocol Full lane — payment trigger; matrix style): 4-option matrix (tip jar / one-time Pro / subscription / retro-paywall) against Apple rules, DK tax reality, and the no-accounts architecture. Recommended A+B phased; owner ratified, chose A first.
3. Converged the Phase 1 design across two follow-up rounds (tiers 15/45/95 kr; placement; the one-lifetime 10th-profile card; zero-nag rule).
4. Wrote the plan doc + ROADMAP queue row + surgical NEXT-SESSION note; wrap-up + PR (owner-requested).

## Files touched

- **Added:** `docs/superpowers/plans/2026-07-11-monetization-phase1-tip-jar-plan.md`, this session log.
- **Modified:** `docs/planning/ROADMAP.md` (Active Work Queue row), `docs/sessions/NEXT-SESSION.md` (surgical additive note only — locked export entry point unchanged), `docs/sessions/INDEX.md` (entry).
- **No code, no engine, no data touched.**

## Commits

On branch `claude/monetization-brainstorm-20260711`, PR'd to `main` (docs-only): plan doc · tracking updates (ROADMAP + NEXT-SESSION) · session log + INDEX. See PR for hashes.

## Open questions / Follow-up

- **Owner to-dos (lead time — start before the 1.0.8 train):** (1) create Ko-fi account; (2) sign ASC Paid Applications agreement; (3) complete ASC banking + tax forms; (4) enroll Small Business Program (15%).
- **Owner decision later:** merge timing of this PR vs the codex session's in-flight export PRs (docs-only, conflicts unlikely but ROADMAP/NEXT-SESSION are shared surfaces — merge after the export wrap lands if in doubt).
- **Tax verification:** moms/reverse-charge question (plan §1) before first revenue year-end.
- **Vault-sweep proposal (not auto-applied):** add a product-intuition note to `Obsidian Vault/20-Areas/Hobbies/3d-printing.md` — "3D-printing hobby community monetization norms: one-time purchase > subscription; never retro-paywall shipped features; tip jars convert only at value moments." Owner decides.
- **Md-hygiene:** NEXT-SESSION.md is one wrap behind main's ROADMAP (export P2/P3 state) — expected mid-flight parallel-session drift; the codex session's own wrap-up regenerates it. My note in the file points readers at ROADMAP as truth.
- **Phase 2 seed (recorded in plan §3):** Android v1 architecture should leave room for a Play Billing entitlement check — gated bundle deliberately NOT touched.

## Next session

- The locked export-first sequence is unchanged (codex track). Monetization-wise: nothing to do until (a) owner completes the Ko-fi/ASC to-dos, then (b) Track W web Ko-fi can ship any session, and (c) Track I = iOS 1.0.8 train strictly after 1.0.7 ships.
