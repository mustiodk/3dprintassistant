# NEXT-SESSION — 3dpa

**Purpose:** kickoff prompt for the next 3dpa session.

**Last updated:** 2026-06-15 (S3 Scout robustness + learned-guardrails config EXECUTED — Gates 1–3). The printer-intake Scout now reads a versioned, validated `scripts/printer-intake-guardrails.json` (+ `validate-guardrails.js`) — the config surface **S4's learning loop diffs into**. Commits `1a6e256`→`13f602b`→`bd23085` + runbook `ff7508e` (3dpa) + Scout-contract `ce19a05` (ai-om); 35-case Scout suite green, Gate-1 byte-identical. **Locked next = owner go/no-go on the next pipeline topic (S4 now unblocked, or S2).**

**State of the feedback-pipeline set (S1–S5):**
- **S1** ✅ shipped to TestFlight in v1.0.5 (`ae03510`). **On-device acceptance still pending** (the real S1 gate).
- **S2** intake capture completeness — QA-green spec+plan, **not executed.** Web Worker, immediate (auto-deploy), local Node tests. Independent.
- **S3** Scout robustness + learned-guardrails config — ✅ **EXECUTED 2026-06-15** (Gates 1–3, committed + pushed). Unblocks S4.
- **S4** Intake Retrospective (learning loop, Approach A) — QA-green spec+plan; **now unblocked (S3 landed).** Proposes diffs into the S3 config.
- **S5** Assistant autonomy ladder — QA-green spec+plan; gated on S4.

---

>>> START >>>

Read in order:
1. `Projects/CLAUDE.md` (or `AGENTS.md`) — top-level rules.
2. `Projects/3dprintassistant/CLAUDE.md` + `docs/3dpa-context.md` — architecture + engine + standing rules.
3. `docs/planning/ROADMAP.md` — banner + Active Work Queue (S3 executed; S1 on TestFlight; S2/S4/S5 status).
4. `docs/sessions/INDEX.md` + the last 3 session logs, especially
   `2026-06-15-cowork-appdev-s3-scout-robustness-guardrails.md` (this S3 execution) +
   `2026-06-15-cowork-appdev-s1-overlay-hardening-1.0.5-ship.md` (the v1.0.5 ship).
5. `docs/sessions/NEXT-SESSION.md` (this file).
6. For the chosen work: the topic's spec + plan (`docs/superpowers/{specs,plans}/2026-06-15-s*`) in full.

Today's task — pick by what the owner reports:

- **S4 (Intake Retrospective — recommended next; unblocked by S3):** execute per its gated plan (each gate = implement → sub-agent hostile review → patch → QA → commit, advance only on green). Approach A: a reflective propose-and-approve pass that proposes guardrail diffs into `scripts/printer-intake-guardrails.json` (the S3 config) — reuses lesson-spotter + Curator patterns; learn between runs, deterministic at runtime. NOTE the S3 contract: the validator is count-agnostic; any proposed diff must pass `node scripts/validate-guardrails.js` before apply (now in the runbook).
- **S2 (intake capture completeness — independent):** widen the `/api/feedback` tee + a Worker-side `extractPrinterMention` so misrouted printer requests reach the Scout as structured fields. Web Worker, local Node tests.
- **S1 on-device verdict (owner-pending):** GO → consider submitting v1.0.5 to App Store review; regression → focused fix (the mac-mini runs XCTest locally — reproduce there first).
- **Overlay Phase-4b graduation (web, after 1.0.5 accepted):** republish `catalog/ios-printer-overlay-v1.json` without now-bundled Aries/Mega-X + add a `1.0.5` baseline; run `scripts/validate-ios-printer-overlay.js`; curl-verify.

Scope / gating:
- S1 shipped (acceptance pending); S2 independent; **S4 unblocked (S3 landed); S5 gated on S4.**
- S3 config changes run their own gate: `node scripts/validate-guardrails.js` + `node scripts/printer-intake-scout.test.js` (see `docs/runbooks/profile-data-change-test-protocol.md`).

Standing rules:
- ROADMAP is truth; read it before status claims.
- iOS push gate: iOS commits stay local until TestFlight-ready + owner dispatch.
- One finding = one commit. Web auto-deploys from `main` (S3 is local Scout tooling under asset-ignored `scripts/` — no deploy/runtime impact).
- Develop review-gated work under a `claude-sync.sh hold`; release after the deliberate commits.
- Attachments don't reach the session — if the owner says "attached", ask for a plain-text paste.

<<< END <<<

## Maintenance Note

Regenerated on Trigger A / Trigger B / explicit owner ask only. Locked item = **owner go/no-go on the next feedback-pipeline topic (S4 unblocked, or S2)**; open follow-ups = S1 on-device verdict + overlay Phase-4b graduation. S3 executed (Gates 1–3, `1a6e256`→`bd23085` + runbook `ff7508e` + ai-om `ce19a05`).
