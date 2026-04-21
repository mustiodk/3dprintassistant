# Session log index

**Rolling table of contents for `docs/sessions/`. Reverse chronological — newest first.**

Each entry is a single line: `date — topic — one-line outcome`. Read the full log when the outcome references something the current task depends on.

**Protocol:** every session end, append a new bullet at the top. See `CLAUDE.md → Session-log protocol`.

---

- **2026-04-21** — IR-0 [CRITICAL-002] bed-temp clamp ([log](2026-04-21-cowork-appdev.md)) — engine clamps `initial_layer_bed_temp` / `other_layers_bed_temp` to `min(material.bed_temp_max, printer.max_bed_temp)`; new `printer_max_bed_temp_clamped` + `printer_bed_temp_incompatible` warnings; Combos 6 + 10 ❌→✓; 35/35 iOS tests; web `dc87961`, iOS `378861a`.
- **2026-04-21** — Review consolidation + fresh-session prep ([log](2026-04-21-cowork-appdev-consolidation.md)) — merged domain-findings + PLAN.md into 8 review files + IR-* ROADMAP section; deleted 2 redundant docs; 59 findings triaged.
- **2026-04-20** — 3rd-party review package ([log](2026-04-20-cowork-appdev-review-package.md)) — starter kit (6 docs) dispatched against web `c4c5071`, iOS `24aef66`; `fresh-session-kickoff-post-review.md` prepared.
- **2026-04-20** — IMPL-040 chip-desc / resolveProfile single source of truth ([log](2026-04-20-cowork-appdev-impl040.md)) — every UI number now computed by the same function that emits it; 20/20 tests; 118-combo matrix clean.
- **2026-04-20** — IMPL-039 printer-capability clamping + slicer-aware values ([log](2026-04-20-cowork-appdev-impl039.md)) — `getPrinterLimits` + `_clampNum` + `mapForSlicer` + `slicer_capabilities.json`; 32/32 tests; Bambu export byte-matches vendor format.
- **2026-04-19** — Cowork App Dev ([log](2026-04-19-cowork-appdev.md)) — Draft layer 0.30→0.28 (Bambu rejected import); committed the 114-line RB-1 engine diff that had been sitting uncommitted (production was rendering "undefined" for every warning).
- **2026-04-17** — Cloudflare Pages → Workers migration blocker ([log](2026-04-17-cloudflare-functions-blocker.md)) — Tally retired; Discord `/api/feedback` Worker stood up; `wrangler.toml` + `worker.js` required because project had migrated to Workers Builds.
- **2026-04-16 → 17** — App Store release + Discord restructure ([log](2026-04-16-cowork-appdev.md)) — iOS v1.0 approved + released (~121 non-EU countries); EU blocked on DSA Trader Status; Discord server restructure.
- **2026-04-15** — BR-11 feedback system + BR-12 empty-output hardening + App Store submission ([log](2026-04-15-cowork-appdev.md)) — native feedback sheet → Discord; 2-tap Reset scoped per-screen; submitted to Review 13 days ahead of April 28 deadline.
- **2026-04-14** — BR-10 cross-device UI review ([log](2026-04-14-cowork-appdev.md)) — UITest target + 33 screenshots across SE/17 Pro/17 Pro Max; 4 P0/P1 layout fixes; App Store screenshots retaken.
- **2026-04-13** — App icon + branding ([log](2026-04-13-cowork-appdev.md)) — clay Benchy 1024×1024; nav bar + home logo; web header swap.
- **2026-04-10** — Release blockers + pre-release polish (RB-1…6, BR-1…7) ([log](2026-04-10-cowork-appdev.md)) — structured warnings, actor bridge, Sentry DSN extraction, OutputView split, device QA.
