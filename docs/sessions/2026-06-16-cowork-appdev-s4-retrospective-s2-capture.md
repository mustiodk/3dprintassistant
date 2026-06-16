# 2026-06-16 — Cowork (appdev): S4 Intake Retrospective + S2 intake capture (executed)

## Durable context

- **Two feedback-pipeline topics executed end-to-end under Work Protocol Full lane, each gate `implement → hostile sub-agent review → patch → QA → commit`.** Owner directive: do **S4 first** (commit+push), then **S2** (commit+push), autonomous, then wrap. Both shipped; **Gate 3 of S2 (the optional web nudge) is deliberately NOT built** — the spec marks it owner-pick (§8 risk 8, needs a web-preview UX call). Cross-repo: 3dpa `scripts/` + `functions/`, ai-om `docs/agents/` (in the claude-projects parent).
- **S4 = the learning loop, Approach A (learn between runs, deterministic at runtime).** The deterministic runtime invariant is load-bearing: **no LLM ever enters the Scout's decision path.** The retrospective only *proposes* owner-ratifiable diffs to `scripts/printer-intake-guardrails.json` (the S3 config); the owner ratifies; the Scout reads only the static ratified config. The committed `scripts/printer-intake-outcomes.jsonl` is the **durable history** (raw Scout run reports are overwritten + gitignored, so they are NOT a history source — the Printer Addition Assistant appends one PII-safe outcome line per processed candidate; its `project-writer` scope was amended to permit that one append-only path, carved out of the per-candidate approval gate).
- **The S4 config-mutating apply path (`apply-guardrails-diff.js`) is the only thing that writes the config, and ONLY on `--apply` (the owner ratification; dry-run is the default).** It is idempotent (re-apply = byte-identical), provenance-keyed-by-target, writes a tombstone on retire, **refuses a retire whose value doesn't match the current mapping**, bumps `version` (a content-revision counter) only on a non-empty effective changeset, and re-validates the diff (chaining S3's validator) before any write. The `_provenance` keys use the full target identity (`brandAliases.<key>` / `<list>::<value>`) — new entries coexist with S3's bare-key provenance (no migration; validator is key-agnostic).
- **S2 fixed the v1 BLOCK with Worker-side deterministic structuring.** The tee fired only for `category==="missingPrinter"`; a printer request typed into general/feature/bug feedback was invisible + dropped (Scout finding 2). The fix is `functions/api/_lib/printer-mention.js` `extractPrinterMention()` — a `\b`-anchored brand/family-token gate that turns a free-text mention into **structured** `{brand?,model,span}` so the Scout's `mapFields` id-branch makes it **actionable** (needs-research/duplicate/incomplete), never `unactionable`. The tee gained a heuristic lane (general/feature/bug only — `missing*` excluded) storing **only the bounded matched span** (not the full message; 30-day TTL vs 90 for the form lane), inside the existing fail-open try/catch. The server-side tee also catches **iOS** general-feedback mentions — no iOS binary change. **S1 (iOS funnel) + S2 (residual capture) together close finding-1 root + finding-2 residual.**
- **The Scout now threads lane provenance** (`sourceLane` form|heuristic, `originalCategory`, `lanes:{form,heuristic}`), surfaces a heuristic risk flag on the report **item** for every heuristic outcome, groups heuristic candidates separately (`heuristicCandidates`), and `collapse()` makes **form win** the surviving lane order-independently (the prior first-seen-wins was the bug, spec §8 risk 5). Untagged/legacy records default to `form` — byte-identical backward-compat. Report `version` stays **3** (sourceLane is additive / detect-by-presence per the S4 spec).
- **Hostile reviews earned their keep on every gate.** Real defects caught + patched before commit: S4 G2 intra-diff dup-target (a diff that fails its own validator); S4 G3 evidence-array-not-deduped (pollutes committed config), target-collision-self-invalid-diff, exit-2-on-unreadable-ledger, UTC-date-drift; S2 G1 **[HIGH] PII** (email/phone token adjacent to a brand entered the stored span — contradicted the spec's PII guarantee) + 3 precision (mega intensifier, capitalized short-family, Mars3 digit-fused resin); S2 G2 brand-only-incomplete grouping observability. All confirm `feedback_spec_reviewer_cold_read` + `feedback_gated_plan_first_for_substantial_work` (confirmation, not new findings).
- **This mac-mini treats `.js` with `export`/`import` as ESM** (named imports resolve; Node auto-detect), so `node --check` + `node --test` work on the Worker lib + feedback.js without a package.json. The Scout suite is spawn-based; the Worker libs use `*.test.mjs` (the live analytics pattern).

## What happened / Actions

- Cold start (3dpa) → owner picked S4 then S2 (autonomous, work protocol, commit+push each). Set a `claude-sync.sh hold` for the review-gated work.
- **S4 (3 gates):** G1 outcomes ledger (`scripts/printer-intake-outcomes.jsonl`, `_schema` marker line) + Assistant permission amendment (ai-om) → G2 `validate-guardrails-diff.js` (+ test; chains S3's validator) → G3 `intake-retrospective-gather.js` (deterministic cluster/dedup) + `apply-guardrails-diff.js` (owner-approved apply) + `intake-retrospective.md` contract + calibration ledger + golden-file/apply tests + `.gitignore` watermark. Pushed.
- **S2 (2 gates):** G1 `printer-mention.js` extractor + widened tee in `feedback.js` + 25-case `.mjs` test → G2 Scout lane provenance + `collapse()` form-wins + `heuristicCandidates` + lane fixture + TC36-42. Pushed (auto-deploys).
- Every gate: per-gate hostile sub-agent review (GO-WITH-NITS across the board), patched, QA green, committed. Full no-regression sweep after each (all sibling suites green; real config untouched at v1).

## Files touched

3dpa (`3dprintassistant`):
- New: `scripts/printer-intake-outcomes.jsonl`, `scripts/validate-guardrails-diff.js` (+`.test.js`), `scripts/intake-retrospective-gather.js`, `scripts/apply-guardrails-diff.js`, `scripts/intake-retrospective.test.js`, `scripts/fixtures/printer-intake-outcomes-sample.jsonl`, `functions/api/_lib/printer-mention.js` (+`.test.mjs`), `scripts/fixtures/printer-intake-lanes.json`.
- Modified: `scripts/printer-intake-scout.js` (+`.test.js`), `functions/api/feedback.js`, `.gitignore`, `docs/superpowers/specs/2026-06-15-s4-intake-retrospective-design.md` (glyph fix).
- Wrap: this log + `docs/sessions/INDEX.md` + `docs/planning/ROADMAP.md` + `docs/sessions/NEXT-SESSION.md`.

ai-om (`ai-operating-model`, in claude-projects parent):
- New: `docs/agents/intake-retrospective.md`, `docs/agents/intake-retrospective-calibration.md`.
- Modified: `docs/agents/printer-addition-assistant.md` (permission amendment), `docs/agents/lesson-spotter-calibration.md` (wrap row), `CLAUDE.md` (Current state).

## Commits

- 3dpa: `736a6a8` (S4 G1) · `3edf4a8` (S4 G2) · `a23b834` (S4 G3) · `bfcb7c8` (S2 G1) · `9969cff` (S2 G2) · wrap commit. **Pushed `589bad7..a23b834` (S4) + `a23b834..9969cff` (S2).**
- ai-om (parent): `b51c4b6` (S4 G1 assistant amendment) · `8710494` (S4 G3 contract+calibration) · wrap commit. **Pushed `1d16822..8710494`.**

## Open questions / Follow-up

- **[owner] S2 post-deploy live smoke (not done by me — avoids polluting the live `PRINTER_INTAKE` KV).** Per the S2 plan: POST a printer-ish general-feedback submission to the live `/api/feedback` (valid Origin) → expect a `lane:"heuristic"` KV entry + `{ok:true}`; a non-printer submission → not teed. Then a Scout `--source kv` dry-run shows it under `heuristicCandidates`, flagged, not auto-promoted.
- **[owner-pick] S2 Gate 3 — the optional web form-UX nudge** (inline "looks like a printer request — use the Missing-printer form"). Deferred; needs a web-preview + a keep/defer call (spec §8 risk 8).
- **[md-hygiene, spawned task `task_cb32967a`] `functions/` is not in `3dprintassistant/.assetsignore`** → the Worker source (incl. the new S2 `_lib` token lists) is served publicly at `https://3dprintassistant.com/functions/...`. Pre-existing; S2 added 2 files. No secret leak. Fix = add `functions` + `functions/**` to `.assetsignore`.
- **[S4 next] S4 is built but dormant until the outcomes ledger has real entries** (the Assistant appends them on the next real intake-queue run). The first retrospective over a non-empty ledger lands the first `intake-retrospective-calibration.md` row.
- **[S5 unblocked]** S4 landed → **S5 (Assistant autonomy ladder)** is now unblocked (it consumes S4's calibration record). Still owner-gated.
- **verify-before-mutate summary (Trigger A):** `14 flags (12 resolved, 0 ignored), 7 destructive-core, 39 unclassified, 1 generated-write`. All 13 of my Writes resolved (verified inline each time via ls/git-status). The 2 "open" Bash deletes (`/private/tmp/s4probe`, `/private/tmp/scout-head.js`) are the **hostile-review sub-agents' own scratch-file cleanup** (each verified inline in its review) — not controller mutations.
- **Lesson/findings sweep:** lesson-spotter compact → **no new K1/K3/K4**; every gate's hostile review caught a real first-draft defect (incl. an S2 HIGH PII leak) and all were patched same-gate → strong **confirmation** of `feedback_spec_reviewer_cold_read` + `feedback_gated_plan_first_for_substantial_work` (confirmation, not new findings). No reviewer disagreement (single reviewer/gate, all accepted), no skill surprise, no tool overruled the controller. Calibration row appended.

## Next session

See [`NEXT-SESSION.md`](NEXT-SESSION.md). Locked entry = **owner go/no-go on S5 (autonomy ladder, now unblocked) or the S2 live smoke / Gate-3 nudge**; S4 is dormant-until-ledger-has-entries.
