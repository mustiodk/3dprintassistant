# 2026-05-15 — Cowork (appdev): printer-addition protocol authored + 2 rounds of Codex review

## Durable context

- **The printer-addition protocol is now the authoritative gate for any future printer addition.** Lives at [`docs/runbooks/printer-addition-protocol.md`](../runbooks/printer-addition-protocol.md) (186 lines, locked at v3). Triggered by the **Printer Addition Gate** copy-paste prompt under "3dpa Work Gates" in the vault trigger cheatsheet. Standing rule 10 in `docs/3dpa-context.md` makes it binding. Phase 5 self-check (10-bullet checklist) gates Trigger A wrap-up; `superpowers:requesting-code-review` is risk-triggered only — not mandatory on every printer add. Risk triggers: new brand row, new `series_group`, overlay publish, engine/app/validator/spec touch, conflicting sources, deprecation, multi-printer session.

- **The executable gate is `scripts/picker-dry-run.js`** (116 lines, 6 tests). Replaces v1's broken paste-bash. Loads engine.js correctly via `vm.runInThisContext` mirroring the walkthrough harness; asserts the new printer appears under expected `manufacturer` / `series_group`; supports optional `wrong_brand_id` to detect taxonomy regressions (the SPARKX bug class). On GREEN, emits a single clean line; on RED, dumps engine init context to stderr for debugging. Must be run **before** committing any taxonomy change.

- **Codex reviewer pattern proven across two rounds, validating the v1.0.4 arc's 7-for-7 confidence.** Round 1 caught a real factual bug Claude had shipped (v1's pasted Node snippets were invalid — `require('./engine.js')` doesn't work because engine.js is a browser IIFE; `getPrintersByBrand()` returns `[{label, models}]` not `.groups[].printers`). Round 2 caught a subtler bug — the v2 overlay-only-forbidden rule was too rigid; overlay spec has legitimate cleanup/rollback/republish paths that v3 now carves out explicitly. **Durable lesson:** executable snippets in a runbook/doc count as shipped code — run them before commit or they're a verification violation regardless of file extension.

- **The two prior failed printer adds informed the protocol's structure.** X2D / H2D Pro (2026-05-10) went overlay-only without bundled — mental model bug; the validator forced same-day chicken-and-egg, and the printers ultimately shipped bundled-only. SPARKX i7 → Creality i7 (2026-05-12) shipped as a new "SPARKX" brand and was caught in-app by the owner an hour later — taxonomy lookup wasn't a discrete step. The protocol's Phase 1 (taxonomy decision before any file edit), Phase 2 (picker dry-run as pre-commit gate), Phase 3 (no mixed-work commits), and the "one printer = one focused commit per repo" rule each map to one of those failure modes.

- **Codex closing instruction stands: "stop sanding it."** v3 is locked. Don't touch unless the first real printer-add use surfaces a new gap. The next printer addition is the test of whether the protocol actually works in the wild.

## What happened / Actions

1. **Cold-start (Trigger C).** Standard 3dpa reads + verified git state at HEAD `fa8f31b` (web) / `c99a797` (iOS, 0 ahead). v1.0.4 had just shipped to TestFlight via the morning's S9 session.

2. **ROADMAP refresh (`e65d622`).** Cleaned stale "Next step: S9 cold-starts on Phase 2.2..." from the v1.0.4 config-impact (CLOSED) entry on line 55. S9 had already shipped that morning; the pointer was leftover from a pre-S9 wrap. Added the S9 ship narrative (M1 + Obs1 + OBS-01 + MARKETING_VERSION) and updated "Next step" to "v1.0.4 monitoring OR v1.0.5 hygiene cold-start."

3. **Investigation of the 2 post-overlay printer additions.** Owner request: review last 2 printer-add commits + create a fixed protocol. Loaded `superpowers:systematic-debugging`. Used `git log` on `data/printers.json` + `catalog/ios-printer-overlay-v1.json` to find them. Identified X2D (`b2f4367`) + the same-day Bambu refresh + validator strip (`9ec6f4f` + `c153a42`) + the SPARKX i7 four-commit saga (`d21e452` + `f9a91f1` + `0a4cc2f` + `2284207`). Read the SPARKX i7 hotfix session log in full.

4. **Authored protocol v1 (`47b363c`) — 4 artifacts.**
   - New runbook `docs/runbooks/printer-addition-protocol.md` (247 lines).
   - Trigger entry "Printer Addition Gate" in `Obsidian Vault/20-Areas/Development/ai-collaboration/trigger-cheatsheet.md`.
   - Standing rule 10 in `docs/3dpa-context.md`.
   - ROADMAP "Remote printer catalog operations" entry updated to point at the runbook.

   Owner-asked additions before write: Phase 6 deprecation/removal section + Phase 7 reviewer-dispatch gate via `superpowers:requesting-code-review` blocking Trigger A on NO-GO. Claude self-flagged the protocol as "heavy for a hobby project" in the wrap-up note.

5. **Codex review packet round 1 (`37a23b1`).** Owner immediately acted on the heavy-process flag. Authored `codex/printer-addition-protocol-review/codex-2026-05-15-printer-addition-protocol-packet.md` (~370 lines) per the `docs/ai-collab.md` Review Packet template. Included: full post-mortem evidence, 5 root causes, owner's 5 session wishes with Claude's interpretation of intent (the "why behind the ask" layer), 4 simplification alternatives (A as-shipped, B ~80-line minimal, C tiered, D inline-only), 7 specific uncertainties, response template. Owner dispatched Codex manually.

6. **Codex round 1 verdict: SIMPLIFY-PROPOSED, high confidence.** Caught 3 must-fixes:
   - **Real factual bug**: v1's Phase 1/2 Node snippets were invalid (`require('./engine.js')` doesn't work; `getPrintersByBrand()` shape misremembered). The load-bearing pre-commit gate was non-functional.
   - **Internal contradiction**: Phase 3 said "each step is its own commit" then "step 1 + step 2 same commit."
   - **Phase 7 mandatory reviewer conflicted with ai-collab.md's risk-based second-model rule.**

   Recommended Option B+: ~90-120 lines, checked-in script, merged Phases 3-5, Phase 6 to appendix, Phase 7 risk-triggered.

7. **Authored protocol v2 (`dae3442`).** Owner picked the lightweight Phase 7 (always-checklist + risk-triggered reviewer dispatch) and approved Option B+. Loaded `superpowers:test-driven-development` + `superpowers:verification-before-completion`. TDD-built `scripts/picker-dry-run.js` (RED: 7 checks fail with MODULE_NOT_FOUND; GREEN: 5/5 pass; manual sanity: sparkx-as-brand RED-lines, x1c GREEN). Rewrote runbook 247 → 172 lines (30% trim). Trimmed standing rule 10 from 4 → 2 lines. Trimmed vault trigger ~20 → ~10 lines. Updated Codex packet with round 1 response inline.

8. **Round 2 audit request (`5189796`).** Owner asked for a fresh honest audit of v2. Appended ~150 lines to the packet explicitly framing as NOT "did Claude follow round-1 advice" but a fresh verdict (LOCK-IT / SIMPLIFY-FURTHER / TIGHTEN-SPECIFICS / NO-GO). Surfaced 2 honest gaps Claude knowingly didn't address ("current live App Store version" wording; overlay spec field allowlist) and 8 concrete uncertainties.

9. **Codex round 2 verdict: TIGHTEN-SPECIFICS, high confidence.** Codex independently ran the tests + manual commands. 1 must-fix (overlay-only exception missing — rollback/cleanup/republish are legitimate per the overlay spec); 3 should-fixes (TC6 RED-path test missing, validator-supported-fields pointer needed, iOS XCTest cwd ambiguous); 1 optional (engine soft warnings should be suppressed on GREEN). Closing: "stop sanding it."

10. **Authored protocol v3 (`9754c47`).** Applied all 3 should-fixes + the must-fix + the optional warning suppression. TC6 (wrong_brand_id pointing to existing brand) added with inverted-first TDD-RED demo: temporarily inverted `if (spurious)` to `if (!spurious)` in the script, ran tests, observed TC4 + TC6 both flip with captured failure output, restored, re-ran 6/6 green. Caught an incidental Phase 7 → Phase 5 numbering leftover from v1 while making the cwd-split edit. Runbook 172 → 186 lines (+14 for the must-fix overlay-exception expansion + validator-fields pointer + cwd split).

11. **Push to origin (`fa8f31b..9754c47`).** Owner approved push after final verification gate (6/6 tests, validate-data 6/6 ✓, working tree clean, vault autosynced via `802e354`). Cloudflare auto-deploy runs on push but no user-facing surface changed.

## Files touched

**Web repo `3dprintassistant` main (all pushed):**
- `docs/runbooks/printer-addition-protocol.md` — NEW. v1 247 → v2 172 → v3 186 lines.
- `docs/3dpa-context.md` — standing rule 10 added (v1) then trimmed (v2).
- `docs/planning/ROADMAP.md` — v1.0.4 (CLOSED) entry refreshed (e65d622); "Remote printer catalog operations" entry updated to point at runbook (v1).
- `scripts/picker-dry-run.js` — NEW. 116 lines. Loads engine.js via vm; asserts picker shape; optional spurious-brand check; warning suppression on GREEN.
- `scripts/picker-dry-run.test.js` — NEW. 99 lines. 6 test cases covering GREEN, missing printer RED, wrong series_group RED, absent-wrong-brand GREEN, usage error, present-wrong-brand RED.
- `codex/printer-addition-protocol-review/codex-2026-05-15-printer-addition-protocol-packet.md` — NEW. 676 lines. Round-1 packet + Codex round-1 response + round-2 ask + Codex round-2 response.
- `docs/sessions/2026-05-15-cowork-appdev-printer-addition-protocol.md` — this log (this close commit).
- `docs/sessions/INDEX.md` — prepend entry (this close commit).
- `docs/sessions/NEXT-SESSION.md` — regenerated for protocol-trial cold-start (this close commit).

**Vault (autosynced):**
- `Obsidian Vault/20-Areas/Development/ai-collaboration/trigger-cheatsheet.md` — "Printer Addition Gate" section added under "3dpa Work Gates"; trimmed in v2.

**iOS repo:** untouched. No engine, no data change.

## Commits

**Web `3dprintassistant` main (pushed `fa8f31b..9754c47`):**
- `e65d622` — `docs: refresh v1.0.4 (CLOSED) entry with S8.5/S9 close (drop stale "Next step")`
- `47b363c` — `docs: add printer-addition protocol (post-mortem of X2D + i7 overlay mishaps)`
- `37a23b1` — `docs: Codex review packet for printer-addition protocol simplification`
- `dae3442` — `docs+scripts: printer-addition protocol v2 (Codex SIMPLIFY-PROPOSED)`
- `5189796` — `docs: Codex round-2 audit request appended to packet (v2 review)`
- `9754c47` — `docs+scripts: printer-addition protocol v3 (Codex TIGHTEN-SPECIFICS)`
- This session-close commit.

**Vault (autosynced):**
- `90fe77d` — initial Printer Addition Gate addition.
- `802e354` — gate trim per v2.

## Open questions / Follow-up

**Md-hygiene findings (Phase 2 step 4):**
- Root-level stubs: clean (only `CLAUDE.md`).
- Untracked: none post-push.
- Secrets scan: clean across this session's diff.
- Protocol drift: `Projects/CLAUDE.md` vs `Projects/AGENTS.md` byte-identical.
- Stale ROADMAP: header "Last updated 2026-05-15" still current.
- Duplicate specs: none introduced. The runbook references `docs/specs/ios-remote-printer-catalog.md` (overlay system spec) without duplicating its content.

**Protocol-trial readiness (real open questions):**
- **First real printer-add will be the test.** No specific printer queued. Future-Claude can run the trial with any candidate (user has historically flagged community-requested printers; vault `50-Wiki/raw/3dpa/` is a likely source-clipping landing zone).
- **The runbook's Phase 4 (deprecation) is intentionally thin** — when the first real deprecation hits, capture the executed procedure as Phase 4a per the runbook's own instruction.
- **Phase 7's risk-trigger list is calibrated to the X2D + i7 failure modes** — if a future printer-add fails in a NEW way, the trigger list needs an entry. The protocol is self-evolving by design.

**Carry-forward v1.0.5 hygiene items (unchanged):**
- See morning S9 close. Min-1 PLA-only test coverage, Min-2 NSNumber decoder, m2 test rename, helper extraction, magic constants, mobile-card text length, smoke assertion, RETIRED_IDS const, walkthrough hardcoded baseline, MEDIUM-02 packet-text decision.

## Memory sweep

**Proposing 1 new memory:**

`feedback_executable_snippets_are_shipped_code.md` — Paste-bash, Node snippets, shell one-liners, or any executable instructions embedded in a runbook, protocol, doc, or session log count as **shipped code** under `verification-before-completion`. Run the snippet exactly as written before commit. The runbook is the contract; ship-untested-as-written is a verification violation regardless of whether the file says "this is a doc." Today's case: v1 of the printer-addition protocol shipped pasted Node snippets that `require('./engine.js')` (engine.js is a browser IIFE — would have thrown) and called `.groups[].printers` on `getPrintersByBrand()` (which returns `[{label, models}]` — would have silently passed because `.groups` was undefined). Codex caught it; Claude should have caught it by running the snippet exactly as written before commit.

**Considered but skipped:**
- *"Codex multi-round review pattern."* Already implicit in `ai-collab.md` and `feedback_skill_discipline_remediation_arcs.md`. The 7-for-7 → 9-for-9 streak is calibration evidence, not a new rule.
- *"Stop sanding it" lesson.* Situational; not a durable rule.
- *"Honest assessment of owner intent in review packets."* Today's packet had a "wishes assessment" section that the owner asked for. Useful pattern but very session-specific; would re-emerge if asked again. Skip.

## Vault sweep

**Surfaces considered (per `Projects/CLAUDE.md` Trigger A vault-sweep checklist):**

- **Strategic decision / rationale** → `Obsidian Vault/10-Projects/3dpa.md`: a printer-addition protocol now exists. Worth a one-line entry under "recent strategic moves" if that page has such a section. **Action: propose adding a one-line cross-reference if the page exists.**
- **Shorthand / new term** → no new vocabulary.
- **Cross-project pattern / routing change** → `Obsidian Vault/20-Areas/Development/toolchain.md`: the "executable snippets count as shipped code under verification" lesson generalizes beyond 3dpa. Could land as a tool-routing rule. **Action: propose 1-2 line addition.**
- **Hobby observation** → N/A.
- **Consulting insight** → N/A.
- **External source** → N/A.

**Status: 2 candidates surfaced. Owner-gated.** Not auto-edited.

## Next session

**Owner-stated goal: test the new protocol in a fresh session.** `NEXT-SESSION.md` regenerated as a printer-addition-trial cold-start with the standard 3dpa Trigger C reads + the new runbook + the Printer Addition Gate trigger prompt. Lane B (v1.0.4 monitoring) and Lane C (v1.0.5 hygiene cold-start) remain as fallbacks.

## Self-check (Trigger A Phase 5)

- **Phase 1 step 1** (`git status`): web clean post-this-commit; iOS untouched this session (still 0 ahead per morning S9 close).
- **Phase 1 step 2** (project scope): 3dpa (web only; iOS untouched).
- **Phase 1 step 3** (disambiguation): not needed — opening message named printer-addition protocol scope explicitly.
- **Phase 2 step 4** (md-hygiene): 6 checks ran; all clean. Findings under "Md-hygiene findings" above.
- **Phase 2 step 5** (session log): written at `docs/sessions/2026-05-15-cowork-appdev-printer-addition-protocol.md`. Destination label **(5-documented)** per 3dpa convention.
- **Phase 2 step 6** (INDEX): entry prepended.
- **Phase 2 step 7** (ROADMAP): no structural change needed. The "Remote printer catalog operations" entry already points at the runbook from the v1 commit. Header "Last updated 2026-05-15" still current.
- **Phase 3 step 8** (memory): 1 candidate proposed (`feedback_executable_snippets_are_shipped_code.md`); 3 candidates considered and declined.
- **Phase 3 step 9** (vault): 2 candidates surfaced for owner decision (10-Projects/3dpa.md cross-reference; 20-Areas/Development/toolchain.md general lesson). Not auto-edited.
- **Phase 4 step 10** (NEXT-SESSION regen): regenerated for printer-addition trial.
- **Phase 4 step 11** (copy-paste prompt): surfaced in NEXT-SESSION between `>>> START >>>` / `<<< END <<<` markers.
- **Phase 5 step 12** (self-check): this section.
