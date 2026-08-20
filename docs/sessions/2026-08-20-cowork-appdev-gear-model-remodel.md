# 2026-08-20 — Cowork (appdev): the gear model was wrong, and 2.0 got its shape

**Machine:** mac-mini. **Product code changed:** none. **Branch `train1-my-gear-setups` remains parked, unmerged, unpushed at `a6fa1f9`.**

## Durable context

- **A gear is a shortcut, not an inventory.** This is the session's centre and it
  invalidates the previously ratified spec §2. The owner: *"det skal ses som en genvej til
  at springe led over.. min gear er ikke bare et udstyr og de filamenter brugeren har."*
  There is **no stored ownership pool**; where the app needs to know what a user has, it
  derives that from their gears. Everything the parked branch built around `printers{}`
  and `filaments{}` is withdrawn.
- **The rule is stable-vs-per-print, not hardware-vs-intent.** Spec §2 said *"hardware is
  a setup, intent is per print"* and used that to exclude `environment`. The owner's rule
  is broader and better: whatever does not change between prints belongs to the gear. That
  moved `environment` and `profileMode` **into** the gear — a direct reversal — and made a
  gear an **open partial-state map** keyed by the engine's own 19 filter keys rather than a
  fixed field list. Seven fields are the default offer; the user may pin any of the rest.
- **A UI design document is input, not requirements.** The owner corrected a premise this
  session's review had adopted wholesale. Mismatches between build and design are
  *questions for him*, never verdicts. Provenance must stay separable: the missing
  save-from-configurator flow (M2) came from **his own words** before any artboard was
  read, which is why it survived the reframing when design-sourced findings weakened.
- **Web freezes the format.** Web ships gear when complete (D14) while iOS waits for the
  2.0 shell (D12), so the first real browser write locks the envelope for iCloud sync and
  for iOS. This is why two specs were written before any code: the format must be designed
  for all of 2.0, not for gear alone.
- **Cloud sync needs no login and therefore no backend.** The owner asked whether sync
  could work without one; on Apple devices it can, via the device's own iCloud account.
  That removed **accounts and the server** from 2.0 entirely — infrastructure gaps went
  from four to two (the AI backend with credit accounting, and printer protocols).
- **Printer Link is further along than anyone assumed.** `bambuinventory/printer_sync.py`
  already runs Bambu's local MQTT protocol with AMS slot tracking and RFID metadata. The
  hard part is solved; porting it to iOS is a port. Two limits: iOS-only (a browser cannot
  reach a LAN printer) and Bambu's protocol is unofficial, so it carries permanent
  maintenance.
- **The existing inventory is a server app, and that is unresolved.**
  `Projects/bambuinventory/` is single-user PHP + MySQL on Simply.com with the database as
  its source of truth. Opening it to other users needs the accounts D16 just removed. This
  blocks web-Inventory and cross-platform Pro entitlement, and it is deferred, not answered
  (D18b).
- **Five defects in `workshop-store.js` are live right now** and would become data loss the
  day sync ships (D-1…D-5 in the sync spec). Three must land **before web ships gear**, not
  with sync. D-5 is the sharp one: `_read()` returns `[]` on a version mismatch (`:35`) and
  a later `_write` persists that over the user's real data — harmless with one version,
  destructive under cross-platform skew.

## What happened / Actions

1. **Mismatch review** of the ratified spec + Train 1 plan + the parked branch against the
   2.0 design's 23 artboards. 14 findings. Codex gate refuted the original M1 framing (it
   argued from vocabulary), the Inventory-supersession argument, an M2 schema assumption
   and an M4 self-contradiction — all four corrected rather than defended. It also surfaced
   three envelope defects, each reproduced with direct probes before acceptance.
2. **Owner correction on authority**: the design is input, not requirements. The review's
   premise section was rewritten and a memory written.
3. **Eighteen decisions taken one at a time** (D1–D18), recorded as they were made in
   `docs/reviews/2026-08-20-gear-model-owner-decisions.md`.
4. **2.0's shape settled.** The controller proposed splitting the release; the owner
   rejected it on commercial grounds — Pro must feel worth its price on launch day — and
   the recommendation was withdrawn. Cloud sync and AI Expert ship at launch; Inventory and
   Printer Link follow for Pro holders.
5. **App Store risk verified, not assumed**: marketing those two as "coming soon" at the
   point of purchase risks rejection under 2.1(a) app completeness, 2.3.1(a) accurate
   metadata and 3.1.2(a) ongoing value. Resolution is framing only — Pro sells what works;
   the rest arrives later as free additions announced outside the store listing.
6. **Gear model v2 spec** written, Codex-gated (six must-fix, all corrected), **ratified by
   the owner**.
7. **Sync v1 spec** written, Codex-gated (six must-fix, all corrected, each verified in the
   code first), awaiting ratification.

## Files touched

**Created:** `docs/reviews/2026-08-20-train1-vs-2-0-design-mismatch-review.md` ·
`docs/reviews/2026-08-20-gear-model-owner-decisions.md` ·
`docs/superpowers/specs/2026-08-20-gear-model-v2-spec.md` ·
`docs/superpowers/specs/2026-08-20-sync-v1-spec.md` · three bridge transcripts · this log ·
two ai-om findings.
**Modified:** findings `INDEX.md` · lesson-spotter calibration · memory index.
**Not touched:** any product code, `engine.js`, `data/`, the parked branch.

## Commits

Web `main`, all pushed: `8a08180` mismatch review · `565c0a4` premise correction ·
`d0f4…`–`b1665da` decisions D1–D17 · `000af0d` D18 · `47b54d4` gear spec draft ·
`beb5f69` gear spec revised · ratification commit · `51b5f17` sync spec revised.

## Open questions / Follow-up

- **Sync spec awaits ratification**, and `CKSyncEngine` must be verified against live Apple
  documentation before the plan commits to it — the doc page could not be retrieved during
  research and the spec says so explicitly rather than asserting the capability.
- **D18b — local-first vs. server-backed inventory** is the next real product decision.
  It gates web Inventory and Pro entitlement on web.
- **Repair UX for a `stale` gear** is defined as a state, not an interaction.
- **`workshop-store.js` D-1/D-3/D-5 land before web ships gear.**
- **Findings:** [`review gauntlet said merge`](../../../ai-operating-model/docs/findings/2026-08-20-review-gauntlet-scoped-to-the-plan-said-merge.md) (K3, `open`) and [`fixed a class then missed it next door`](../../../ai-operating-model/docs/findings/2026-08-20-fixed-a-defect-class-then-missed-it-next-door.md) (K3, `open`).
- **Lesson spotter (compact):** 3 candidates, 2 accepted, 1 declined (routed to memory as
  `feedback_design_doc_is_input_not_spec`). No K1, no K4, no MCP. Calibration row added —
  fifth consecutive session where the decisive correction came from the owner.
- **md-hygiene:** `CLAUDE.md`/`AGENTS.md` byte-identical; no untracked `.md`; no stray
  `</content>`; findings INDEX parity holds (128 files, 0 orphans). One observation:
  `docs/reviews/` now mixes bridge transcripts with authored review documents. Not acted
  on — the transcripts are evidence the authored docs cite, and separating them would break
  the links.
- **VBM summary, verbatim:**

  ```text
  verify-before-mutate ledger: 0 flags (0 resolved_same_turn, 0 resolved_late, 0 unresolved_by_session_end), 0 destructive-core, 76 unclassified, 0 generated-write
  ```

## Next session

Ratify the sync spec, then answer **D18b** (local-first vs. server-backed inventory).
After that, re-plan Train 1's web half against the two new specs — the 2026-08-17 plan is
void, not amendable.
