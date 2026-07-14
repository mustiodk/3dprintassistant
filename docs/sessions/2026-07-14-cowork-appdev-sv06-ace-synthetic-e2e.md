# 2026-07-14 — Sovol SV06 ACE synthetic printer-intake E2E

## Durable context

- The owner-authorized synthetic production request proved the complete
  `/api/feedback` → Discord/KV → Scout → research/evidence → fresh R1/R2 →
  merge/live/custody path on the mac-mini.
- The first run stayed fail-closed. It spent no R2 turn and shipped nothing
  after R1 returned a contract-invalid `GO` payload.
- Two independent pipeline defects were fixed TDD-first without weakening any
  gate: full-SHA parked-ref comparison (`c2fe6fd`) and explicit R1 semantic
  output rules (`16606a7`).
- The clean re-entry reached semantic fresh `GO/GO`; iOS received only a local
  data mirror and remains push-gated. iOS 1.0.7/1.0.8 were not started.

## What happened / Actions

**Terminal `GO/GO` — auto-shipped and live-verified.** An owner-authorized
synthetic missing-printer request traversed the real production path from
`/api/feedback` through Discord/KV, Scout, research, deterministic validation,
fresh R1/R2 review, merge, deployment verification, local iOS mirroring, and
custody closure.

- Run: `run-20260714T110737Z`
- Production request key: `req:1784025588168:43e000dc`
- Printer: Sovol SV06 ACE (`sovol / High Speed / sv06_ace`)
- R1: `claude-opus-r1` → `GO`, `objections=[]`
- R2: `codex-r2` → `GO`, `objections=[]`
- Ship merge: `3bba2c2`
- Live overlay: `content_version=2026071402`, payload SHA
  `2b5627a4a9b0dd6010f3d3c088b059f175559193bacc3e3103148ea17910cb3d`
- Local-only iOS mirror: `80c26dd` (not pushed)
- Custody: `54dc4c8`
- Wrapper terminal state: `POSTRUN ok=true`; notification posted; no freeze;
  lock released.

The owner-authorized request was clearly marked synthetic in its notes. The
production endpoint returned HTTP 200 only after the Discord webhook accepted
the post, and the new record appeared in live `PRINTER_INTAKE` KV with lane
`form`, source `web`, and the exact request key above.

## Candidate and evidence

SV06 ACE was absent from both the live bundled web catalog and remote overlay
before submission. The official manufacturer page was the primary source:
`https://www.sovol3d.com/products/sovol-sv06-ace`. The materialized row records
the manufacturer-confirmed 600 mm/s speed, 20,000 mm/s² acceleration,
220×220×250 mm volume, 300°C nozzle, 100°C bed, direct drive, textured PEI,
camera, and 0.2/0.4/0.6/0.8 mm nozzle support. Field-level provenance is stored
under `sv06_ace` in `docs/printer-provenance.json`.

## First run: fail-closed park

The first wrapper run correctly did **not** ship. It reached all mechanical and
evidence gates, but the R1 structured payload was contract-invalid: it combined
`verdict:"GO"` with a non-empty objection and used a non-ISO `raisedAt`. R2 was
not run. The candidate parked as `review-unavailable`, with branch, packet, raw
review evidence, and sidecar preserved.

The wrapper then exposed an independent POSTRUN defect: the sidecar stored the
contractual full-SHA `preservedRef`, while the checker expected an invented
`intake/<id>@<sha>` representation. POSTRUN exited 65 and reported the failure;
there was still no ship.

## Debugging and patches

Both failures were handled through systematic root-cause analysis and TDD.

1. **POSTRUN preserved-ref mismatch** — test 27 was changed to exercise the
   contract's raw full-SHA value and failed RED. The checker now compares that
   SHA directly with the branch tip. Regression suites passed. Commit:
   `c2fe6fd fix(intake): accept full SHA parked refs`.
2. **R1 semantic output rules absent from the effective prompt** — the installed
   Claude CLI cannot transport the schema's `oneOf`, array-cardinality, or
   `format` keywords, so the boundary strips them and validates semantics after
   capture. The boundary-owned prompt block explained the mechanism but did not
   restate the removed rules. Four RED assertions pinned GO/NO-GO objection
   cardinality, ISO-8601 `raisedAt`, and prose-only non-blocking notes. The prompt
   now states all four rules. Commit:
   `16606a7 fix(intake): state R1 semantic output rules`.

No gate was weakened, no verdict was rewritten, and no ship was forced.

## Clean rerun and delivery

The preserved sidecar passed the patched POSTRUN invariant, then the wrapper was
started cleanly. It re-entered the parked candidate, spent fresh R1 and R2 turns,
received semantic `GO/GO`, and merged/pushed `3bba2c2`. Deployment verification
then passed against the committed overlay and the production picker. The local
iOS catalog mirror `80c26dd` was created under the data-only waiver and remains
unpushed under the iOS push gate. Custody `54dc4c8` records final provenance and
the outcomes ledger records `ownerResolution:"auto-shipped"`.

After ship, `intake/sv06_ace`, the candidate packet, parked sidecar, run lock,
and autonomy-freeze marker are absent. Web `main` is clean and equals
`origin/main`. Web and iOS `printers.json` are byte-identical; iOS is clean and
eight commits ahead locally.

## Verification

Fresh post-deploy verification on the custody commit:

- `verify-live-overlay.js`: live equals committed, attempt 1.
- `verify-live-picker.js sovol "High Speed" sv06_ace`: production GREEN.
- `validate-data.js`: 6/6 data surfaces valid.
- `validate-ios-printer-overlay.js`: 2 brands, 8 printers, collision check green.
- `walkthrough-harness.js`: all automated checks passed; SV06 ACE is combo 17.
- `profile-matrix-audit.js`: no core failures.
- R1 boundary: `PASS=80 FAIL=0`.
- Reviewer validator: 14/14.
- POSTRUN invariants, wrapper, and notifier suites: all green (notifier 13/13).

KV hygiene was run dry. It reported `deletes=0 kept=6 applied=false`; the new
synthetic request is `auto-shipped, inside 7-day contact window`. It must remain
temporarily for requester contact and will not be manually deleted. The normal
hygiene policy removes it after that window.

## Product-impact evaluation

This is an additive printer-data change. The web app and remote overlay already
consume the row and production picker verification passed. iOS receives it via
the live overlay now and has a byte-identical local bundled mirror for a future
release. No engine, schema, Swift, functional, structural, UI, or UX change is
needed to use the improvement. iOS 1.0.7 and 1.0.8 were not started, dispatched,
or pushed.

## Files touched (Modified / Deleted / Untracked)

- Web/runtime: `scripts/intake-post-run-invariants.sh`,
  `scripts/intake-post-run-invariants.test.sh`,
  `scripts/intake-r1-structured-review.sh`, and
  `scripts/intake-r1-structured-review.test.sh`.
- Catalog/custody: `data/printers.json`, `catalog/ios-printer-overlay-v1.json`,
  `docs/printer-provenance.json`, `scripts/printer-intake-outcomes.jsonl`, and
  the walkthrough coverage.
- Tracking: this log, `docs/sessions/INDEX.md`,
  `docs/sessions/NEXT-SESSION.md`, and `docs/planning/ROADMAP.md`.
- iOS: `3DPrintAssistant/Data/printers.json` in local commit `80c26dd`.
- Deleted: no owner files. The candidate packet/sidecar/branch were removed by
  the runner only after terminal ship and custody.
- Untracked: none at close.

## Commits

- `c2fe6fd` — accept full SHA parked refs.
- `16606a7` — state R1 semantic output rules.
- `3bba2c2` — ship Sovol SV06 ACE.
- `54dc4c8` — custody provenance/outcome closure.
- `438ba8f` + `744695a` — close the E2E tracking surfaces and correct the iOS
  mirror verification path.
- iOS local-only `80c26dd` — byte-identical bundled catalog mirror; not pushed.

## Open questions / Follow-up

- Historical run evidence was retained. The wrapper intentionally refreshed
  the canonical last-run surfaces; no conflicting old history required manual
  deletion.
- Md-hygiene: no orphan root-level Markdown stubs, no untracked Markdown outside
  this wrap, and current state was promoted into ROADMAP/NEXT-SESSION/INDEX.
- Product work did not touch the unrelated
  `~/.claude/plugins/known_marketplaces.json` change. During the mandatory
  parent-sync step, claude-sync auto-committed/pushed its generated
  `lastUpdated`-only delta as `3ea863de`; `~/.claude` is clean/current. The
  existing 2026-07-12 marketplace-metadata churn finding remains owner-pending.
- Lesson spotter (compact): one no-action candidate — the initial wrong iOS
  mirror path was caught by final verification and already belongs to the
  existing assert-without-verify family. K3/K4/K1 sweep found no new finding;
  no MCP behavior was in scope.
- Memory sweep: no durable memory to add; the existing fail-closed printer
  intake memory already covers the reusable behavior.
- Vault sweep: nothing durable to propagate; this is project-operational state,
  not strategy, shorthand, cross-project method, hobby insight, consulting
  context, or external-source ingest.
- Verify-before-mutate summary (verbatim):

```text
verify-before-mutate ledger: no entries this session
```

## Next session

Printer intake is closed. Return to owner lane selection. Do not automatically
start iOS 1.0.7 or the separate iOS 1.0.8 tip-jar train.
