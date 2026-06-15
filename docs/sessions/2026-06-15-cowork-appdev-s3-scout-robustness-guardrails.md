# 2026-06-15 — Cowork (appdev): S3 — Scout robustness + learned-guardrails config (Gates 1–3)

## Durable context

- **S3 executed end-to-end (all 3 gates) under the Work Protocol Full lane.** The printer-intake Scout's hardcoded heuristics are now a versioned, owner-ratifiable config the Scout reads at runtime — `scripts/printer-intake-guardrails.json` (schema `printer-intake-guardrails@1`) + a validator `scripts/validate-guardrails.js`. **This config is the architectural hinge S4's learning loop proposes diffs into**; runtime stays deterministic (static data, no LLM at decision time). Gate 1 was a strict **behaviour-preserving refactor** (byte-identical run reports vs pre-refactor baselines on all 3 fixtures); Gate 2 added brand-alias seeds + the `possibleBrandTypo` hint + `report.version`→3; Gate 3 added model-suffix-strip.
- **The validator is deliberately count-AGNOSTIC** (structural + referential `brandAliases value ∈ brands[].id` + flat-array no-dup/normalised checks). The plan/spec said "the validator asserts `length===14`" — that would have **broken Gate 2** (16 aliases; Gate 2 QA requires the validator to still pass) and **defeated S3's whole learnable-config purpose** (S4 accretes aliases). The 14-verbatim-key copy-correctness check lives in `validate-guardrails.test.js` **TC6** instead (updated to 16 in Gate 2). Plan + spec text corrected in `1a6e256`.
- **`loadGuardrails` fallback is strict** (review MEDIUM): a missing OR schema-valid-but-partial config (e.g. missing `resinKeywords`) falls back to the bundled `GUARDRAILS_DEFAULTS` **wholesale** + emits a `guardrails-load-failed` run-error — it never silently disables FDM-scope declines. `GUARDRAILS_DEFAULTS` must stay in sync with the JSON; **TC30** is a data-level drift guard (deep-equals the 9 data fields, ignoring `lastRatified`/`_provenance`).
- **`possibleBrandTypo` is flag-not-resolve**: a single unambiguous edit-distance-1 known-brand match is surfaced `{got, didYouMean}` on the report item; it NEVER auto-maps and is suppressed on ≥2 ties. `stripModelSuffixes` is **dedupe-lookup-only** (original model preserved), trailing-token-boundary-anchored, config-list-only (never a generic last-token drop), never strips to empty, and **excludes the brand-absent inference path** (a suffix must not skew brand inference).
- **A `module.exports` guard was added** to the Scout (`if (require.main === module)`) so tests can `require` it for unit testing (exports `GUARDRAILS_DEFAULTS`, `brandTypoHint`, `stripModelSuffixes`) — CLI behaviour unchanged (the spawn-based suite + byte-diff confirm).
- **Ship path = local tooling.** The config + Scout live under asset-ignored `scripts/`; the Scout is local/scheduled. Web auto-deploys from `main` but this has **zero deploy/runtime impact** (no engine/data-profile/overlay/app change).

## What happened / Actions

- Cold start (3dpa). Owner picked **S3 over S2** (S3 is on the critical path — unblocks S4/S5; S1 already repairs the main capture funnel, lowering S2's urgency). Confirmed both S3 spec + plan exist (QA-green v2). Applied **Work Protocol → Code mode, Full lane** (trigger: refactor + shared intake logic).
- Grounded the plan against the live Scout: all cited line numbers/signatures accurate; the 14 alias values all real `brands[].id`; captured 3 pristine baseline reports for the byte-identical gate.
- **Gate 1** (`1a6e256`): config + validator + validator test (additive, verified green) → behaviour-preserving Scout refactor (`loadGuardrails`/`buildGuardrails`/`loadCatalog(guardrails)`/`fdmDecline(…,guardrails)`/`classify(…,guardrails)` + `--guardrails` flag) → byte-identical diff + suite green → hostile review **GO-WITH-NITS** → 3 findings patched (MEDIUM partial-config hardening + TC31; LOW drift-guard TC30; LOW plan/spec count-note) → commit.
- **Gate 2** (`13f602b` + ai-om `ce19a05`): TDD RED (6 fail) → seeds + `brandTypoHint`/`withinEdit1` + `possibleBrandTypo` + version→3 + export → GREEN (TC32/TC33) → hostile review **GO** (withinEdit1 fuzzed 300k pairs vs reference Levenshtein; regression confirmed only version+field changed) → 2 LOWs accepted no-fix → commit + ai-om Scout-contract line.
- **Gate 3** (`bd23085`): TDD RED (4 fail) → `stripModelSuffixes` + apply at the 2 brand-known dedupe sites (inference path excluded) + export → GREEN (TC34 collapse-aware + TC35 unit) → hostile review **GO-WITH-NITS** (0 over-strip vs all 71 printer names) → 2 LOWs patched (`+cfs`/`(cfs)` compact forms now strip; degenerate input can't strip to empty) + 3 TC35 assertions → commit.
- Runbook gate line (`ff7508e`). Hold released. Wrap.

## Files touched

3dpa (`3dprintassistant`):
- New: `scripts/printer-intake-guardrails.json`, `scripts/validate-guardrails.js`, `scripts/validate-guardrails.test.js`, `scripts/fixtures/printer-intake-aliases.json`, `scripts/fixtures/printer-intake-suffixes.json`.
- Modified: `scripts/printer-intake-scout.js`, `scripts/printer-intake-scout.test.js` (TC29–TC35), `docs/runbooks/profile-data-change-test-protocol.md`, `docs/superpowers/specs/2026-06-15-s3-scout-robustness-guardrails-config-design.md` + `docs/superpowers/plans/2026-06-15-s3-scout-robustness-guardrails-config-impl-plan.md` (count-note correction).
- Wrap: this log + `docs/sessions/INDEX.md` + `docs/planning/ROADMAP.md` + `docs/sessions/NEXT-SESSION.md`.

Parent (`ai-operating-model`): `docs/agents/printer-intake-scout.md` (contract `possibleBrandTypo` line), `docs/findings/2026-06-15-committed-s3-plan-before-its-review.md` (execution follow-up), `docs/agents/lesson-spotter-calibration.md` (row).

## Commits

- 3dpa: `1a6e256` (Gate 1) · `13f602b` (Gate 2) · `bd23085` (Gate 3) · `ff7508e` (runbook) · wrap commit (this log/INDEX/ROADMAP/NEXT-SESSION).
- ai-om (parent): `ce19a05` (Scout contract, already pushed) · wrap commit (finding follow-up + calibration row).

## Open questions / Follow-up

- **[owner] Next topic — S4 is now unblocked** (S3 landed): S4 (Intake Retrospective learning loop — proposes diffs into the new guardrails config) is the natural next, but is owner-gated. **S2** (intake capture completeness) remains independently executable. **S1 on-device acceptance** (v1.0.5 TestFlight) is still owner-pending. **Overlay Phase-4b graduation** still open (do after 1.0.5 accepted).
- **Finding extended (not re-filed):** [`2026-06-15-committed-s3-plan-before-its-review.md`](../../../ai-operating-model/docs/findings/2026-06-15-committed-s3-plan-before-its-review.md) — the S3 plan's "validator asserts count===14" was a 3rd defect its belated review missed (would break Gate 2). Lesson: a plan's hardcoded count/invariant must be checked against later gates that change it.
- **md-hygiene:** the carried "Cloudflare Pages" finding stays RESOLVED (prior ship wrap verified docs already say Workers+Assets) — not carried further. No orphan root stubs; all new files committed; no secrets in the tree; protocol files byte-identical; sessions INDEX parity maintained (this entry added).
- **verify-before-mutate summary (Trigger A):** `5 flags (4 resolved, 1 ignored), 0 destructive-core, 22 unclassified, 0 generated-write`. The 1 "ignored" = the `printer-intake-aliases.json` fixture Write — **verified inline** this session (the prior `ls scripts/fixtures/` confirmed the dir + the file's absence; the subsequent `git status` showed it untracked-new, no clobber). The ledger's same-turn-path-touch heuristic didn't credit prior-turn evidence → the known Bash/prior-evidence-not-credited measurement family (N≥3), not a real ignored mutation.
- **MCP:** none in scope (node / git / grep + sub-agents only).

## Next session

See [`NEXT-SESSION.md`](NEXT-SESSION.md). Locked entry = **owner go/no-go on the next feedback-pipeline topic** — S4 (unblocked by S3) or S2 (independent) — plus the still-open S1 on-device verdict + overlay Phase-4b graduation.
