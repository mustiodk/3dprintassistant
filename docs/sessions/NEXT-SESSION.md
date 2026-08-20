# 3dpa — Next Session Kickoff

**Purpose:** ratify the sync spec, answer the inventory-architecture question, then
re-plan Train 1's web half against the two new specs.

**Last updated:** 2026-08-20, mac-mini wrap-up (gear model remodelled; spec §2 withdrawn).
**Entry point CHANGED.** Train 1 execution is no longer the entry point — the plan is
void, not amendable.

---

## What changed, in one paragraph

The Train 1 branch was reviewed clean and recommended for merge. The owner then found it
half-finished, and a mismatch review found why: **a gear is a shortcut, not an
inventory.** The ratified spec §2 built two layers — a stored pool of owned hardware, plus
setups drawn from it — and the owner's product has one. Eighteen decisions replaced the
model. `train1-my-gear-setups` stays **parked, unmerged, unpushed** at `a6fa1f9`. Nothing
shipped, so the permanent envelope is still free — which is the only reason this is rework
rather than a migration.

## Read these first (they are the authority now)

1. [`docs/reviews/2026-08-20-gear-model-owner-decisions.md`](../reviews/2026-08-20-gear-model-owner-decisions.md) — **D1–D18.** The binding record. Read it before the specs.
2. [`docs/superpowers/specs/2026-08-20-gear-model-v2-spec.md`](../superpowers/specs/2026-08-20-gear-model-v2-spec.md) — **RATIFIED.** Supersedes §2 of the 2026-08-17 spec.
3. [`docs/superpowers/specs/2026-08-20-sync-v1-spec.md`](../superpowers/specs/2026-08-20-sync-v1-spec.md) — **awaiting ratification.**
4. [`docs/reviews/2026-08-20-train1-vs-2-0-design-mismatch-review.md`](../reviews/2026-08-20-train1-vs-2-0-design-mismatch-review.md) — the 14 findings, for background only. The decisions above supersede it.

**Do not** treat `docs/superpowers/plans/2026-08-17-train1-my-gear-setups-plan.md` as live.
It is void.

## The standing frame that governs everything here

**The 2.0 UI design is a design document, not requirements.** It shows how the owner
imagines a feature could look. Every build-vs-design mismatch is a **question for him**,
never a verdict against the build. Keep provenance separable — a finding sourced from the
owner's own words carries weight a design-sourced one does not.

---

# THE SESSION

## 1. Ratify the sync spec (or take corrections)

It has been through one Codex round; six must-fix corrected, each verified in code first.
Two things must happen before its plan is written:

- **`CKSyncEngine` verified against live Apple documentation.** The doc page could not be
  retrieved during research and the spec says so explicitly. Confirm it can express §3's
  per-field-group merge and tombstone precedence, or the merge moves into the adapter.
- **Owner ratification.**

## 2. Answer D18b — the next real product decision

**Local-first inventory vs. the existing server app.** `Projects/bambuinventory/` is
single-user **PHP + MySQL on Simply.com** with the database as its source of truth.
Opening it to other users needs accounts — exactly what D16 removed when the owner asked
whether sync could work without a login. The choice gates web Inventory and cross-platform
Pro entitlement.

## 3. Then re-plan Train 1's web half

Against the two new specs, from scratch. Web ships gear when complete (D14) and therefore
**freezes the envelope**, so the sync spec must be ratified first.

**Three shipped `workshop-store.js` defects land before web ships gear**, not with sync:

- **D-1** `remove()` hard-deletes with no tombstone (`:176-180`) — additive fix
- **D-3** `addOutcome` bumps the value timestamp (`:201`) — additive fix
- **D-5** `_read()` returns `[]` on version mismatch (`:35`) and a later `_write` persists
  that over real data — **the only non-additive fix, and the most dangerous under
  cross-platform skew**

## Also open (not this session unless the owner says so)

- **`ender_3_pro` did NOT resolve.** Re-parked `needs-source-resolution` by
  `run-20260819T100138Z`. Read the run's own account before assuming why — a run report's
  explanation of its own failure is a claim, not evidence.
- **`hi` has no owner-notification path** — one-line fix available, but locus-validate first.
- **The web nozzle picker is still wrong** — `app.js:1536` calls
  `Engine.getCompatibleNozzles(state.material)`, so every printer offers all nine sizes.
  iOS was fixed 2026-08-18; web and iOS behave differently. The engine is correct; the call
  site is the bug.
- **Web light theme fails AA on production today** — green `#009a6a` measures 3.60:1, link
  `#0b7fc4` 4.33:1.
- **Two findings opened 2026-08-20**, both `open`:
  [review gauntlet said merge](../../../ai-operating-model/docs/findings/2026-08-20-review-gauntlet-scoped-to-the-plan-said-merge.md) ·
  [fixed a class then missed it next door](../../../ai-operating-model/docs/findings/2026-08-20-fixed-a-defect-class-then-missed-it-next-door.md)

---

# Cold start

>>> START >>>

Cold start 3dpa. Today's task: ratify the sync spec, answer D18b (local-first vs.
server-backed inventory), then re-plan Train 1's web half.

**Read in order:**
1. `Projects/CLAUDE.md` (top-level protocol — routing + standing rules)
2. `3dprintassistant/CLAUDE.md` (project rules)
3. `3dprintassistant/docs/3dpa-context.md` (evergreen architecture, engine API)
4. `3dprintassistant/docs/planning/ROADMAP.md`
5. `3dprintassistant/docs/sessions/INDEX.md`
6. The last 3 session logs in full
7. This file
8. `docs/reviews/2026-08-20-gear-model-owner-decisions.md` — **D1–D18, the binding record**
9. `docs/superpowers/specs/2026-08-20-gear-model-v2-spec.md` (ratified) and
   `docs/superpowers/specs/2026-08-20-sync-v1-spec.md` (awaiting ratification)

**Repo health first — check the BRANCH, not just the health line.** Run `git branch -vv`.
`3dprintassistant` may read `no-upstream` if the checkout is parked on
`train1-my-gear-setups`, which has never been pushed — that is expected, not a problem.
Switch to `main` before reading tracking docs. If health says `dirty`, run
`git ls-files -u` before trusting it.

**Process:**
- The 2026-08-17 Train 1 plan is **void**. Do not amend it; re-plan from the new specs.
- The parked branch is a reference implementation, not a base to build on. Its mechanics
  survive (soft-delete, row normalizers, the `{ok, error}` contract, apply-time
  bookkeeping); its model does not.
- Verify `CKSyncEngine` against live Apple docs before any plan commits to it.

## Standing rules that bite on this project

- **A UI design document is input, not requirements.** Surface mismatches as questions.
- Keep finding provenance separable — owner-sourced beats design-sourced.
- **A read must never bump a write timestamp.** When you fix one instance, grep every
  adjacent store in the same session.
- ROADMAP is truth. Read fully before reporting status — from `main`.
- No mutation on an unverified premise; verify in the SAME turn, state inline.
- Validate the fix LOCUS before building an enforcement site.
- A tool's account of why it failed is a claim, not evidence.
- An AI research answer's verbatim quote is a claim until you fetch the page.
- Before writing instructions ADDRESSED to a named external tool, verify what it is.
- One finding = one commit. iOS `main` stays push-gated; web pushes freely.
- `MARKETING_VERSION` bumps per release train, never per TestFlight iteration.
- A green engine suite says nothing about whether the SCREEN calls the right function.
- `state` in app.js is a `const` (`app.js:66`) — merge with `Object.assign`; the printer
  row's brand field is `manufacturer`, not `brand`.
- Committed ≠ deployed.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask only. This
revision was the 2026-08-20 Trigger A wrap-up (mac-mini): entry point **CHANGED** from
Train 1 execution to sync-spec ratification + the inventory decision, after the gear model
was replaced by owner decisions D1–D18.
