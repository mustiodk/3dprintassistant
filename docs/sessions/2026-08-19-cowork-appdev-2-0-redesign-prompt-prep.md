# 2026-08-19 — Cowork (appdev): preparing the 2.0 redesign, and a prompt written for a tool nobody had checked

**Machine:** mac-mini. **Product code changed:** none (one new doc under `docs/prompts/`).
**Locked entry point (Train 1) deliberately not taken** — the owner pivoted to redesign prep.

## Durable context

- **The redesign deliberately precedes Train 1.** Train 1 (My Gear + Setups) adds UI
  directly to a Home screen the owner considers crowded — verified: `HomeView.swift`
  stacks **twelve elements**, five of them low-value links at the same visual weight as
  the primary CTA. Redesigning first means 2.0 is built into the new layout instead of
  retrofitted. The plan is still GO'd and untouched.
- **"Claude Design" is a distinct product, not claude.ai artifacts.** Anthropic Labs,
  launched 2026-04-17, research preview: a canvas workspace with its own prototype
  format, inline-comment + slider refinement (sliders avoid full regeneration, which
  matters — one documented case burned 58% of a Pro weekly quota in two sessions), and
  **codebase-linked design-system inference**. Two prompt revisions were written and
  pushed before this was checked; see the finding.
- **Design-system extraction from attached inputs is inference, not reading**, and fails
  on edge cases. So attaching the current design does **not** remove the need to state
  exact hex tokens — an earlier revision stripped them on "the owner attaches the design"
  grounds and had to reverse.
- **The gear-vs-intent boundary is the one thing a designer will get wrong.** Gemini
  proposed an active-gear CTA reading *"Generate Profile for [gear]"*. That skips the
  per-print intent questions the engine requires. Hardware is a gear; **intent is per
  print** — the ratified spec §2 says the same. Any redesign prompt must state it
  explicitly or the flow gets over-collapsed.
- **Workshop semantics were corrected against the code, not assumed.** It is not a
  browsable profile catalog: `Strings.Workshop.emptyMessage` reads *"Generate a profile,
  then tap the star to save it here."* Star-save from Output, user-named, for reuse and
  export. The owner had already corrected Gemini on this; the code confirms it.
- **Gear cards must differentiate on nozzle + filament, not printer name.** Different
  gears frequently share brand and printer (same X1C with 0.4 standard + PLA, and again
  with 0.6 hardened + PETG). This is the hard part of that card and it reached the Gemini
  run late.

## What happened / Actions

1. Cold start (Trigger C). Health clean except `3dprintassistant-android: missing` — not
   cloned on this Mac, separate parked project, surfaced and out of scope. Both 3dpa repos
   on `main`, 0 ahead / 0 behind. Branch verified per the 08-12 stale-branch trap.
2. Owner pivoted off Train 1 to prepare the 2.0 phase and a front-page redesign.
   Work-protocol invoked (brainstorm trigger); scope restated as **one deliverable — a
   redesign kickoff prompt**, not implementation.
3. Grounded the prompt in real state: read `HomeView.swift`, `BrandPickerView.swift`,
   `ColorTheme.swift`, `style.css` tokens, and the ratified platform spec §2–§4. Wrote v1
   (`ac9a4bb`), scoped to Home + brand picker.
4. Owner ran v1 through **Gemini Stitch**, converged on "Quiet Instrument Panel", and
   pasted the interaction back — deliberately withholding the visuals so a second tool
   would interpret independently. Wrote v2 carrying the decisions, correcting the
   generate-now CTA and the Workshop semantics (`774eef2`).
5. Owner asked for a shorter form since he attaches the existing design; stripped all
   descriptions of the current UI (`686b4b6`).
6. Owner asked — unprompted — how one best prompts Claude Design. Researched it; found the
   prompt's central instruction was addressed to the wrong kind of tool. Rewrote against
   documented practice: dropped the HTML-artifact framing, restated the returning-user
   journey as a **connected flow**, restored exact hex tokens, added explicit state
   coverage (zero / one / **eight** gears — eight is what forces the overlay), a
   self-critique step and handoff naming (`a3fce1d`).

## Files touched

**Created:** `docs/prompts/2026-08-19-ios-2.0-redesign-prompt.md` (v1, consumed by the
Gemini run) · `docs/prompts/2026-08-19-ios-2.0-redesign-prompt-v2-claude.md` (v2, for
Claude Design) · this log · ai-om finding.
**Modified:** `docs/sessions/INDEX.md` · `docs/sessions/NEXT-SESSION.md` ·
`docs/planning/ROADMAP.md` · ai-om `findings/INDEX.md` + lesson-spotter calibration.

## Commits

Web `main` (all pushed): `ac9a4bb` v1 prompt · `774eef2` v2 post-Gemini · `686b4b6` short
form · `a3fce1d` tuned to Claude Design practices. Plus this wrap-up.
**Not this session's authorship:** `a439fc1` / `447c534` — the 12:11 intake run's custody
commits, which landed mid-session and forced a rebase.

## Open questions / Follow-up

- **`ender_3_pro` did not ship.** Today's `run-20260819T100138Z` re-parked it
  `needs-source-resolution`. `NEXT-SESSION` expected the ladder's rung 3 to resolve
  250/100/100 from the decision written 08-18 — it did not. Worth reading the run's own
  account before assuming why (and per the 08-16 finding, that account is a claim).
  A new candidate `centauri_combo_2` was declined as a correct duplicate.
- **`hi` still has no owner-notification path** — unchanged from 08-18.
- **iOS 1.1.4 is still `Waiting for Review`** (build `202608182214`, Manual Release).
  Untouched today; no ruling seen.
- **Finding:** [`2026-08-19-prompt-written-for-an-unverified-tool.md`](../../../ai-operating-model/docs/findings/2026-08-19-prompt-written-for-an-unverified-tool.md)
  — K3, `open`. Third instance in two days of a guard whose entry condition is narrower
  than the behaviour it exists to stop.
- **Lesson spotter (compact):** 3 candidates, 1 accepted (the K3), 2 declined — the
  Fable-vs-Stitch name guess (disclosure discipline worked; folded in as an aggravating
  detail) and the Workshop-semantics code check (read-the-record working as designed).
  No K1 (no reviewers), no K4, no MCP in scope. Calibration row added.
- **md-hygiene:** `CLAUDE.md`/`AGENTS.md` byte-identical; no untracked `.md`; no stray
  `</content>`; no secrets hits; findings INDEX parity holds (122 files, 0 orphans).
  One observation: `docs/prompts/` now holds two near-sibling 2026-08-19 prompts. Both are
  kept deliberately — v1 is the artefact the Gemini run consumed, v2 targets a different
  tool, and v2's header cross-references v1. Not a duplicate to collapse.
- **VBM summary, verbatim:** `verify-before-mutate ledger: 0 flags (0 resolved_same_turn, 0 resolved_late, 0 unresolved_by_session_end), 0 destructive-core, 4 unclassified, 0 generated-write`

## Next session

**Train 1 (My Gear + Setups) execution remains the locked entry point** — unchanged, plan
still GO'd. If the redesign returns first with a chosen direction + token sheet, land that
as a design spec under `docs/superpowers/specs/` before Train 1's UI tasks (6–10) consume
it; Train 1's web store/boot tasks (1–5) are design-independent and can proceed either way.
