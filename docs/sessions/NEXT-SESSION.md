# NEXT-SESSION — 3dpa

**Purpose:** kickoff prompt for the next 3dpa session.

**Last updated:** 2026-06-16 (S4 Intake Retrospective + S2 intake capture **EXECUTED + pushed**). The printer-intake pipeline is now **S1–S4 executed**: S4's learning loop (deterministic gather + owner-approved idempotent apply + retrospective contract + calibration) proposes guardrail diffs into the S3 config — **no LLM in the Scout's decision path**; it is **dormant until the outcomes ledger has real entries** (the Printer Addition Assistant appends one per processed candidate). S2's Worker-side `extractPrinterMention` + widened tee now captures wrong-form printer requests as structured, actionable Scout input (fixes the v1 BLOCK), server-side so it catches iOS too. 3dpa `736a6a8`→`9969cff` + ai-om `b51c4b6`/`8710494` pushed (web auto-deploys). **Locked next = owner go/no-go on S5 (now unblocked) OR one of the open follow-ups below.**

**State of the feedback-pipeline set (S1–S5):**
- **S1** ✅ shipped to TestFlight in v1.0.5. **On-device acceptance still pending** (the real S1 gate).
- **S2** ✅ **EXECUTED 2026-06-16** (Gates 1–2, pushed; web auto-deploys). **Gate 3 (optional web nudge) deferred — owner-pick.** Open: an owner live smoke.
- **S3** ✅ EXECUTED 2026-06-15.
- **S4** ✅ **EXECUTED 2026-06-16** (Gates 1–3, pushed). **Dormant until the outcomes ledger has real entries.**
- **S5** Assistant autonomy ladder — QA-green spec+plan; **now unblocked (S4 landed); owner-gated.** Consumes S4's calibration record.

---

>>> START >>>

Read in order:
1. `Projects/CLAUDE.md` (or `AGENTS.md`) — top-level rules.
2. `Projects/3dprintassistant/CLAUDE.md` + `docs/3dpa-context.md` — architecture + engine + standing rules.
3. `docs/planning/ROADMAP.md` — banner + Active Work Queue (S1–S4 executed; S5 unblocked; per-topic status).
4. `docs/sessions/INDEX.md` + the last 3 session logs, especially
   `2026-06-16-cowork-appdev-s4-retrospective-s2-capture.md` (this S4+S2 execution).
5. `docs/sessions/NEXT-SESSION.md` (this file).
6. For the chosen work: the topic's spec + plan in full (`docs/superpowers/{specs,plans}/2026-06-15-s*`).

Today's task — pick by what the owner reports:

- **S5 (Assistant autonomy ladder — unblocked by S4):** execute per its gated plan (each gate = implement → sub-agent hostile review → patch → QA → commit). Branch + review note + PR + owner go/no-go; autonomy earned by guardrail maturity; consumes S4's calibration record (the outcomes-ledger `was-*` rate, NOT the retrospective's own reject-rate — see the S5 spec). iOS push gate preserved at every rung; web/iOS are separate repos (web-PR-only, iOS mirror local).
- **S2 live smoke (owner / guarded):** POST a printer-ish general-feedback submission to the live `/api/feedback` (valid Origin) → expect a `lane:"heuristic"` KV entry + `{ok:true}`; a non-printer submission → not teed. Then `node scripts/printer-intake-scout.js --source kv` shows it under `heuristicCandidates`, flagged, not auto-promoted. (Not done in-session to avoid polluting the live `PRINTER_INTAKE` KV.)
- **S2 Gate 3 (optional web nudge):** owner-pick — inline "looks like a printer request — use the Missing-printer form" in `feedback-form.js` + `locales/*.json`; needs a web preview. Deferred (spec §8 risk 8).
- **S1 on-device verdict (owner-pending):** GO → consider submitting v1.0.5 to App Store review; regression → focused fix (mac-mini runs XCTest locally — reproduce there first).
- **Overlay Phase-4b graduation (web, after 1.0.5 accepted):** republish `catalog/ios-printer-overlay-v1.json` without now-bundled Aries/Mega-X + add a `1.0.5` baseline; run `scripts/validate-ios-printer-overlay.js`; curl-verify.
- **`functions/` asset-ignore hygiene (spawned task `task_cb32967a`):** add `functions` + `functions/**` to `.assetsignore` so the Worker source (incl. the S2 `_lib` token lists) stops being served publicly; curl-verify 404 after deploy.

Scope / gating:
- S1 shipped (acceptance pending); S2 + S3 + S4 executed; **S5 unblocked + owner-gated.**
- S4 is dormant until the outcomes ledger has entries; the first retrospective run lands the first `ai-operating-model/docs/agents/intake-retrospective-calibration.md` row.
- Intake config / Scout / retrospective changes run the local gate: `node scripts/validate-guardrails.js` + `node scripts/validate-guardrails-diff.test.js` + `node scripts/printer-intake-scout.test.js` + `node scripts/intake-retrospective.test.js` (see `docs/runbooks/profile-data-change-test-protocol.md`).

Standing rules:
- ROADMAP is truth; read it before status claims.
- iOS push gate: iOS commits stay local until TestFlight-ready + owner dispatch.
- One finding = one commit. Web auto-deploys from `main` (intake tooling under asset-ignored `scripts/` has no deploy/runtime impact; `functions/api/feedback.js` IS the live Worker — changes there deploy on push).
- Develop review-gated work under a `claude-sync.sh hold`; release after the deliberate commits.
- Attachments don't reach the session — if the owner says "attached", ask for a plain-text paste.

<<< END <<<

## Maintenance Note

Regenerated on Trigger A / Trigger B / explicit owner ask only. Locked item = **owner go/no-go on S5 (unblocked) or an open follow-up**; open follow-ups = S2 live smoke · S2 Gate-3 nudge · S1 on-device verdict · overlay Phase-4b graduation · `functions/` asset-ignore (spawned task). S4+S2 executed 2026-06-16 (`736a6a8`→`9969cff` + ai-om `b51c4b6`/`8710494`).
