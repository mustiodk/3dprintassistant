# 2026-05-15 — Cowork (appdev): printer-addition protocol trial — Photon Mono M7 Pro decline + v4 surgical edit

## Durable context

- **Real-world trial of the v3 protocol on first contact.** Owner brought a community-requested printer (Anycubic Photon Mono M7 Pro) into a fresh chat. The candidate is resin / MSLA — fundamentally non-FDM. The runbook's Phase 1 step 3 sanity question ("where does the manufacturer themselves put this?") caught it cleanly, but only because the agent applied the implicit FDM assumption. A future cold-start could have walked taxonomy first. v3 → v4 closes that with a new Phase 1 step 0 (FDM-only scope check) listing the disqualified technologies (MSLA / LCD / SLA / DLP / SLS / MJF) and example brands (Photon, Saturn / Mars, Form, Sonic, Halot).
- **Scope-vs-strategy nuance worth preserving.** Runbook v4 reads "No plans for resin or other non-FDM support" — operational guidance ("decline today"). Owner's v1.0.5 backlog item phrases it as "MSLA / resin out of scope (future implementation)" — public-facing messaging that preserves long-term optionality. Both are correct in their lane; future copy work must keep the public messaging softer than the runbook's internal stance. The runbook is for the agent + owner; the future user-facing surface (web About / footer / iOS Settings) is for end users who may also own resin printers.
- **Push-state drift surfaced quietly.** The previous session's wrap commit `8339a2a` was local-only at this session's cold-start despite NEXT-SESSION saying web HEAD was pushed. Today's push (`9754c47..6314fda`) flushed both that wrap commit + the new v4 edit to origin. Worth keeping the "verify push state in self-check" reflex on Trigger A from now on.
- **Reviewer-pattern intuition holds at trial scale.** No reviewer dispatch fired (correctly — no engine / app / validator / spec / brand / overlay touched), and the trial still produced a real finding (v3 protocol's implicit FDM assumption). The risk-triggered-only posture feels correctly calibrated for protocol-edit work; revisit if false-negatives surface.

## What happened / Actions

1. **Cold-start (Trigger C):** loaded 5 superpowers skills (using-superpowers + writing-plans + executing-plans + test-driven-development + verification-before-completion), read top-level CLAUDE.md → project CLAUDE.md (web + iOS) → 3dpa-context.md (note rule 10) → ROADMAP → INDEX (top 30 lines) → printer-addition-protocol.md (full v3) → NEXT-SESSION.md. Confirmed state: web HEAD `8339a2a` (one ahead of remote, unnoticed at cold-start), iOS HEAD `c99a797`, no in-flight binary.
2. **Phase 1 (taxonomy decision):** owner asked to "have a look at" the Anycubic Photon Mono M7 Pro. Confirmed via `data/printers.json` brand list (12 FDM brands, no resin-only brand) + Anycubic printer list (7 Kobras — all FDM) that 3dpa has no resin/MSLA support. Phase 1 step 3 sanity question failed: Anycubic shelves Photon under "Resin 3D Printer." Recommendation: **decline + v4 the runbook**. Owner picked option 2 (decline + add scope note to runbook).
3. **Phase 1 v4 edit:** added Phase 1 step 0 (FDM-only scope check) to `docs/runbooks/printer-addition-protocol.md` + v4 note in Background. New step explicitly disqualifies MSLA / LCD / SLA / DLP / SLS / MJF and lists example brands.
4. **Verification gates (all green):**
   - `node scripts/validate-data.js` → 6/6 ✓
   - `node scripts/picker-dry-run.test.js` → 6/6 ✓ (including TC6 RED demo path)
   - `node scripts/walkthrough-harness.js` → clean (DQ-2 tail OK)
   - `node scripts/profile-matrix-audit.js` → 0 curated failures, 0 broad failures
5. **Risk-trigger evaluation:** no trigger fires (docs-only; no new brand / series_group / overlay / engine / app / validator / spec touched; no source conflicts; no deprecation; no multi-printer). Reviewer dispatch correctly skipped.
6. **Commit + push:** web `6314fda` ("docs: printer-addition protocol v4 — Phase 1 FDM-only scope check") pushed alongside the previously-local `8339a2a` (`9754c47..6314fda  main -> main`). Working tree clean, branch up to date.
7. **Decline note drafted** for the requester (paste-ready prose; no file edit).
8. **v1.0.5 backlog item added** to ROADMAP active-queue v1.0.4 SHIPPED entry: "FDM-only scope copy on a user-facing surface — owner-pick web About / footer / iOS Settings; phrase as 'FDM (filament extrusion) only today; MSLA / resin out of scope (future implementation)' to preserve optionality vs. the runbook's harder operational 'no plans' stance."

## Files touched (Modified / Deleted / Untracked)

**Modified:**
- `docs/runbooks/printer-addition-protocol.md` — v4 edit (12 insertions, 1 deletion)
- `docs/planning/ROADMAP.md` — Last-updated paragraph + new v1.0.5 carry bullet (this commit's wrap)

**Untracked:** none

**Deleted:** none

## Commits

- `6314fda` — `docs: printer-addition protocol v4 — Phase 1 FDM-only scope check` (pushed, with `8339a2a` previously-local wrap commit also flushed)
- Trigger A wrap commit — TBD at end of this session

iOS: untouched (`c99a797`).

## Open questions / Follow-up

- **Md-hygiene findings:** none. `diff -u Projects/CLAUDE.md Projects/AGENTS.md` clean; no root .md stubs; no untracked .md; no secrets; no buried durable content (this log captures the FDM-vs-MSLA strategy nuance up in Durable context).
- **Phase 1 step numbering** (0, 1, 2, 3). Step 0 reads as a precondition gate before the taxonomy walk, which is the intent. Owner-eyeball whether to renumber 1-4 in a future surgical edit.
- **Resin-request recurrence.** Photon was the first; future requests for Photon variants, Elegoo Saturn / Mars, Phrozen Sonic, Creality Halot, Formlabs Form will follow the same decline path. The runbook v4 short-circuits this; consider whether the public messaging copy (v1.0.5 backlog item) should preempt this by being prominent enough to deflect the request before users hit feedback.
- **Push-state verification reflex.** Trigger A should explicitly check `git log origin/main..HEAD` count = 0 at close, not just "working tree clean." NEXT-SESSION can drift if a previous session forgot to push.

## Next session

Owner stated: "as next, i will test 1.0.4 and let you know if we are ready to push for review."

**Lane A — v1.0.4 review-readiness decision (gated on owner's TestFlight feedback).** If GO: submit v1.0.4 to App Store review via App Store Connect (manual ASC workflow, no CLI step in repo). If REGRESSION: open a focused fix arc; no version bump unless ship is blocked.

**Lane B — v1.0.5 hygiene pass cold-start (fallback if Lane A is parked).** Carry-forward bundle now includes the FDM-only scope copy item; see ROADMAP Active Work Queue.

**Lane C — Lane B fallback.** Other deferred items if both above are parked.
