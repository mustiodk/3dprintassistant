# Printer-Intake Process Patch + Voxelab Aries Re-run — Gated Plan

**Date:** 2026-06-13
**Project:** 3dprintassistant (+ ai-operating-model contracts)
**Status:** Plan for owner approval — execution is gate-by-gate, nothing ships until green.

## Why this plan exists

The 2026-06-13 Voxelab Aries delivery rehearsal returned **NO-GO** for two
process gaps, not a data mistake:

1. **Missing manufacturer acceleration data.** `max_acceleration` is
   profile/safety-critical and the protocol treats it as manufacturer-required.
   Voxelab publishes no acceleration figure, so the conservative `5000` had no
   sanctioned home.
2. **iOS verification gap.** `xcodebuild` points at CommandLineTools and no full
   Xcode is installed, but the protocol hard-requires iOS XCTest before Phase 5.

This plan **patches the process for both gaps**, then **re-runs Aries** through
the updated flow. It does **not** seed the real Discord backlog — that waits
until Aries is green end-to-end.

## Ground truth established this session (load-bearing)

- **`max_acceleration` is advisory-only in the engine.** It is read in exactly
  one place — the HIGH-012 bedslinger warning text at `engine.js:2415`
  (`"{name} tops out at {X} mm/s² acceleration…"`) — and a debug line in the
  walkthrough harness. It is **not** a clamp on emitted accelerations (those come
  from `objective_profiles` material/tier maps with their own caps). A
  *conservative* app-cap can therefore only make that advisory more cautious; it
  can never raise an emitted value into unsafe territory. The only residual risk
  is honesty, which labeling + review address.
- **Overlay validator forbids a new key; `notes[]` is allowed.**
  `scripts/validate-ios-printer-overlay.js` rejects any printer field outside a
  fixed allowlist; `max_acceleration` is required `int[1,100000]`; `notes` is an
  allowed optional string array. A structured `max_acceleration_provenance` key
  would be rejected → it would need a separate overlay-spec/validator arc (out of
  scope). `validate-data.js` does not even check `max_acceleration` and has no
  unknown-key rejection.
- **Conclusion:** the app-cap "separation" must live at the **protocol/evidence
  layer** (a named `app-cap` confidence class + documented null-source sweep +
  required `notes[]` provenance line + a new reviewer trigger), using the
  existing `max_acceleration` field and `notes[]`. No engine/validator/schema
  change, fully additive, overlay-compatible, keeps the iOS data-only waiver
  clean (no new data keys).

## Manual evidence (official Voxelab Aries user manual)

Source: `https://enfss.voxelab3dp.com/10000/software/704d44cbccfc0bc0ab8dfa2747925e31.pdf`
(`voxelab3dp.com` = manufacturer authority). Equipment Parameters table confirms:

| Field | Manual value | Confidence |
|---|---|---|
| Forming technology | FDM | confirmed |
| Print size | 200×200×200mm | confirmed |
| Number of nozzles | 1 (single) | confirmed |
| Nozzle diameter | 0.4mm | confirmed |
| Filament | φ1.75mm PLA / ABS / PETG | confirmed |
| Hotbed temperature | ≤110℃ | confirmed (resolves reseller 100℃ conflict) |
| Nozzle temperature | ≤250℃ | confirmed |
| Print speed | ≤180mm/s | confirmed |
| Slicing software | Cura / Simplify3D / VoxelMaker | → orcaslicer routing |
| **max_acceleration** | **absent — no row in the full table** | **app-cap** |

**Chosen app-cap value: `5000 mm/s²`** — the catalog's most-conservative shipped
bedslinger ceiling (Ender-3 V3 SE; Prusa Mini+, the closest analogue:
bowden + open-frame), so the advisory is consistent with how comparable
entry-level open-frame bedslingers are already advised, and conservative vs. the
bedslinger median (10000).

## Owner decisions already locked

- Voxelab approved as a new brand row; Aries → conservative `bedslinger` bucket.
- Gap 1 → **sanctioned app-cap** path (not a hard block).
- Gap 2 → **scoped data-only XCTest waiver** (not CI / not install-Xcode).

## Per-gate workflow (every gate, no exceptions)

1. **Execute** the task's edits.
2. **Subagent review** — dispatch a hostile/critical sub-agent scoped to that
   gate's diff; it returns findings (Critical / Important / Minor).
3. **Patch** every Critical/Important finding (Minors logged or fixed).
4. **QA quality check** — re-run the gate's validators/tests + confirm each
   finding is resolved; capture command output (no self-reported green).
5. **QA approval** — gate is green only when review findings are resolved AND QA
   commands pass. Then **commit** (one focused commit per gate, per repo).
6. **Advance** to the next gate. A red gate stops the run; surface and fix.

Sync hold stays set for the whole run (`claude-sync.sh hold` already active);
released only at Gate 8 after the deliberate commits land.

---

## Gate 0 — This plan

- **Files:** create this plan doc.
- **Execute:** write the plan (done).
- **Review/QA:** owner reads + approves the gate breakdown.
- **Commit (web):** `docs: plan printer-intake process patch + Aries re-run`.

## Gate 1 — Protocol: missing-acceleration app-cap rule

- **Files:** `docs/runbooks/printer-addition-protocol.md`;
  addendum note in `docs/superpowers/specs/2026-06-13-printer-intake-evidence-rules-design.md`.
- **Execute:** add an `app-cap` field-confidence class scoped to `max_acceleration`
  only, justified by it being advisory-only in the engine. Requirements to use it:
  (a) a documented null-source sweep across manufacturer/reseller/community
  classes showing no published acceleration; (b) a conservative value justified
  against sibling printers in the same engine bucket; (c) a required `notes[]`
  provenance line naming it an app cap, not a manufacturer max; (d) mandatory
  reviewer dispatch. Add the matching review trigger. Keep it tight — no engine,
  validator, or schema change; no new JSON key.
- **Subagent review:** is the rule sound, scoped only to acceleration, internally
  consistent with the existing evidence rules, and non-loophole (does it let
  other safety-critical fields slip)?
- **QA:** `git diff --check`; grep the protocol for `app-cap`,
  `null-source sweep`, the new trigger, and confirm the safety-critical list +
  hard-block rules for *other* fields are untouched.
- **Commit (web):** `docs: protocol app-cap path for unpublished max_acceleration`.

## Gate 2 — Protocol: data-only iOS XCTest waiver

- **Files:** `docs/runbooks/printer-addition-protocol.md` (Phase 3 verification +
  Phase 5 self-check); addendum note in the evidence-rules spec.
- **Execute:** add a narrowly-scoped waiver — for adds that touch **no**
  engine/Swift/schema and introduce **no new data keys**, and are byte-identical
  web↔iOS (`diff -q` clean), the web engine gates (validate-data, picker-dry-run,
  walkthrough, profile-matrix-audit) + overlay validator stand in for local
  XCTest. Rationale stated: same engine bytes + same data bytes + forgiving
  Codable ⇒ XCTest cannot differ. **Void conditions** explicit: any
  Swift/engine/schema/new-key change requires real XCTest (CI or a Mac with full
  Xcode); the waiver is logged in the commit/session, never silent.
- **Subagent review:** is the waiver's soundness argument airtight, are the void
  conditions complete, can it be abused to skip XCTest on a real Swift change?
- **QA:** `git diff --check`; grep for `data-only`, `waiver`, `void`, and confirm
  Phase 5 self-check references it.
- **Commit (web):** `docs: protocol data-only iOS XCTest waiver for printer adds`.

## Gate 3 — Agent contracts alignment

- **Files:** `ai-operating-model/docs/agents/printer-addition-assistant.md`,
  `ai-operating-model/docs/agents/printer-intake-scout.md`.
- **Execute:** Assistant — app-cap is an allowed-with-review path; data-only iOS
  waiver recognized; runbook stays canonical. Scout — app-cap is assisted-only
  (deterministic Scout never emits it); skeleton evidence policy mentions it
  exists for the assisted pass.
- **Subagent review:** contracts consistent with the patched runbook; no
  deterministic-Scout overreach; runbook-wins clause intact.
- **QA:** `git diff --check`; grep both contracts for `app-cap` ownership +
  waiver; diff against runbook wording.
- **Commit (ai-om parent):** `docs(agents): align printer-intake contracts with app-cap + iOS waiver`.

## Gate 4 — Aries web data + picker regression

- **Files:** `data/printers.json`, `scripts/picker-dry-run.test.js`,
  `scripts/walkthrough-harness.js`,
  `docs/reviews/2026-06-13-profile-matrix-audit-voxelab-aries.md`.
- **Execute:** TC7 picker test (RED→GREEN); Voxelab brand row (`sort_order: 12`),
  move `diy` 12→13; Aries printer row — all manual-confirmed fields, `max_speed:
  180`, `max_bed_temp: 110`, `max_nozzle_temp: 250`, `extruder_type: bowden`,
  `enclosure: none`, `max_acceleration: 5000` with a `notes[]` app-cap line;
  walkthrough combo 12 (`aries` + `std_0.4` + `abs`).
- **Subagent review:** taxonomy, field sourcing/confidence, app-cap compliance
  with Gate 1, no engine/validator/marketing mixing.
- **QA:** `node scripts/picker-dry-run.test.js` (ALL 7 PASS) +
  `node scripts/picker-dry-run.js voxelab "Aries Series" aries` (GREEN) +
  `validate-data.js` + `walkthrough-harness.js` + `profile-matrix-audit.js`, all
  exit 0, no broad/curated failures.
- **Commit (web):** `data: add Voxelab Aries (Aries Series)` — commit body cites
  manual URL, bed-temp conflict resolution, and the app-cap rationale.

## Gate 5 — iOS bundled mirror sync (data-only waiver applies)

- **Files:** `../3dprintassistant-ios/3DPrintAssistant/Data/printers.json`.
- **Execute:** `cp` web `printers.json` → iOS; `diff -q` must be clean.
- **Subagent review:** byte-identical mirror; waiver preconditions all hold (no
  Swift/engine/schema/new-key change).
- **QA:** `diff -q` exit 0; record the data-only XCTest waiver invocation
  explicitly per Gate 2.
- **Commit (iOS, local only — push gate):** `data: sync printers.json — add Voxelab Aries`.

## Gate 6 — iOS overlay publish

- **Files:** `catalog/ios-printer-overlay-v1.json`.
- **Execute:** `content_version: 2026061301`, append Voxelab brand + Aries printer
  (preserve `sparkx_i7`), recompute `payload_sha256` via the stable-stringify
  algorithm.
- **Subagent review:** overlay allowlist compliance, hash correctness, additive
  (no retraction), `content_version` monotonic vs live `2026051202`.
- **QA:** `node scripts/validate-ios-printer-overlay.js` → `ok: 1 brands, 2 printers`.
- **Commit (web):** `data: publish Voxelab Aries iOS overlay (content_version=2026061301)`.

## Gate 7 — Risk-triggered full review + visual-picker proof

- **Execute:** dispatch the protocol's risk-triggered `requesting-code-review` on
  the full Aries diff (triggers: new brand, new series_group, overlay publish,
  app-cap exception, non-obvious bedslinger mapping). Re-run every web gate +
  overlay validator + `diff -q`. Bring up the local preview server and capture a
  picker screenshot showing **Voxelab → Aries Series → Aries**.
- **QA / owner gate:** reviewer returns **GO**; owner confirms the visual-picker
  check (new brand + new series_group + overlay ⇒ owner visual check is mandatory
  per protocol). No push before both.

## Gate 8 — Ship + planning update + close

- **Execute (only on Gate 7 green):** `git -C 3dprintassistant push` (web →
  Cloudflare auto-deploy); confirm live overlay `content_version=2026061301` via
  the protocol's `curl … | jq` check (`committed-is-not-deployed`). iOS stays
  **local-only** (push gate). Update ROADMAP + NEXT-SESSION to "Aries shipped via
  bundled web data + additive overlay; Photon remains declined-non-fdm; backlog
  seeding is the next decision." Run the Phase 5 self-check (10 bullets).
  Release the sync hold (`claude-sync.sh release`).
- **Do NOT** seed the real Discord backlog — that's the next, separate decision.

## Data / logic-change evaluation (mandatory)

- **Web UI:** no structural change — brand→series→printer picker consumes the new
  brand/printer automatically.
- **iOS UI:** no binary change for current users — the remote overlay merges the
  new brand/printer on next launch; the bundled mirror prepares the next binary.
- **Engine:** no change — the conservative `bedslinger` path is intentionally
  reused; `max_acceleration` stays advisory-only.
- **Optional follow-up (not this arc):** surfacing the `notes[]` app-cap line as
  a user-visible data-quality flag is the deferred Phase 2.7b notes-rendering UI
  work — flagged, not built here.

## Rollback

Each gate is one commit. If Gate 7 returns NO-GO, revert Gates 4–6 (data +
mirror + overlay) exactly as the prior rehearsal did (`git revert`), leave the
process patches (Gates 1–3) in place, and classify Aries per the reviewer's
blocker. Process hardening survives even if Aries does not ship.
