# Printer-intake pipeline — full-process autonomy audit

**Date:** 2026-07-09
**Trigger:** owner directive — "I want a fully automated process, that's the goal." Audit the entire intake pipeline, then assess S5 against that goal.
**Method:** 2 parallel read-only audit agents (triage+ship mechanics; S4 learning loop + agent contracts) + controller read of the S5 spec/plan + Assistant contract + live-runtime observation (live KV queue, Scout run, scheduler surfaces).
**Companion:** the improved design this audit feeds — [`../superpowers/specs/2026-07-09-intake-autonomy-v2-design.md`](../superpowers/specs/2026-07-09-intake-autonomy-v2-design.md).

---

## 1. Stage-by-stage state (built vs automated)

| # | Stage | Built? | Runs unattended? | Evidence |
|---|---|---|---|---|
| 1 | **Capture** — `/api/feedback` tee → `PRINTER_INTAKE` KV (form lane + S2 heuristic lane via `extractPrinterMention`) | ✅ live | **✅ yes** | Verified live 2026-07-09: a real iOS v1.0.4 general-feedback request ("Creality K2 SE") was captured as a structured heuristic-lane entry |
| 2 | **Triage** — `scripts/printer-intake-scout.js` (deterministic, watermarked, PII-safe) | ✅ | **❌ no runner** | All scheduler surfaces empty (launchd, crontab, CI, agent-ops, Claude cloud crons, desktop scheduled tasks — each checked 2026-07-09). Scout correctly staged `candidate-creality-k2_se.json` when run manually |
| 3 | **Research + fill** — Printer Addition Assistant (LLM agent, evidence rules) | ✅ contract | **❌ owner-gated by contract** | `printer-addition-assistant.md`: per-candidate approval before any commit; new-brand sign-off; visual picker check; taxonomy stop conditions |
| 4 | **Ship** — printers.json + walkthrough + iOS mirror + overlay republish + deploy + live verify | ⚠️ gates scripted, doing manual | **❌** | Runbook Phases 3–5: 20 steps, ~17 manual/agent touchpoints. **No overlay-republish script exists** — `content_version` bump + `payload_sha256` recompute are hand-done; the algorithm (`stableStringify`+`sha256`) lives only inside the read-only validator (`validate-ios-printer-overlay.js:53-65`) |
| 5 | **Learn** — S4 retrospective (gather → propose → owner `--apply`) | ✅ | **❌ by design** | `apply-guardrails-diff.js:11-14`: dry-run default; "the `--apply` flag IS the owner's ratification." Data-starved: 3 real ledger entries, 0 retrospective runs, 0 calibration rows, 0 entries exercised the learnable-miss path |

**Net:** requests are captured automatically and then wait for a human indefinitely. The 2026-07-09 K2 SE request made this visible: captured 16:52Z, staged `needs-research` only when a human ran the Scout ~5h later, and would have shipped only in an owner session.

## 2. The ship path in detail (audit agent 1, condensed)

Scripted **gates** (all deterministic, all strong): `validate-data.js`, `picker-dry-run.js` (incl. wrong-brand assertion), `walkthrough-harness.js`, `profile-matrix-audit.js`, `validate-guardrails.js`, `validate-ios-printer-overlay.js` (field/enum allowlists, numeric safety ranges, sha256 integrity, `min_app_version` ≤ MARKETING_VERSION, baseline anti-staleness, pre-1.0.5 collision union — "a strict superset of the forgiving Swift decode": green validator ⇒ the iOS runtime accepts the payload).

Manual/agent **doing** (what full automation must cover): FDM confirm → spec research w/ source hierarchy → taxonomy (series_group/id/new-brand) → app-cap judgment → edit printers.json → walkthrough combo → web commit → iOS mirror cp + diff -q (+ XCTest or data-only waiver decision) → edit overlay payload → **bump content_version** → **recompute payload_sha256** → overlay commit → (baselines at binary graduation) → owner visual picker check → risk-triggered reviewer dispatch → push → live overlay curl verify → Phase 5 self-check.

**Cheapest, highest-safety scripting win:** a `republish-overlay.js` that edits the payload, sets `content_version`/`generated_at`, recomputes the hash with the validator's own functions, and then runs the validator — removes the load-bearing hand-hash step in one shot.

## 3. The learning loop in detail (audit agent 2, condensed)

- Approach A confirmed in code: learn **between** runs; runtime fully deterministic; no LLM in the Scout path.
- Every guardrail content change is owner-ratified (`--apply`); tombstones not deletes; idempotent re-apply; forbidden targets (`brandTokens`/`familyTokens`) route to a **manual Worker-list edit**, never a diff.
- The supervision signal (`ownerResolution` + `correctiveSignal`) is **owner-authored** — the loop cannot learn without the owner tagging outcomes. Both real corrective signals to date (`brandTokens:snapmaker`, `brandTokens:flashforge`) are of the kind that is deliberately outside the auto-appliable set.
- Calibration gates (halt >30% reject over 3 cycles; keep/simplify/remove review after 5–10 runs) are unreachable today: **0 runs recorded.**

## 4. S5 assessment against the "fully automated" goal

S5 (spec + plan, 2026-06-15, QA-green, never executed) is **supervised** autonomy — deliberately:

1. **Terminal human gate at every enabled rung.** Rung 2 (headline): branch + review note + PR; "the owner's action = review the PR + go/no-go (merge). **The Assistant never merges.**"
2. **The human-free rung cannot ship a printer.** Rung 3 is default-DISABLED ("may remain permanently disabled") and restricted to changes that touch **no overlay payload** — but delivering a printer to live iOS users **requires** an overlay republish. Structurally unreachable goal at any rung.
3. **No runner, no ship scripts, no deploy verification.** S5 is docs/contract only, gated on S4 evidence that does not exist (0 runs vs the 5–10 required).
4. Rung-invariant human gates (new-brand sign-off, visual picker, per-candidate approval at Rung 0/1) are never relaxed.

**Verdict: not fit for the owner's stated goal — by design, not by defect.** S5 answered "how does the owner approve faster?"; the goal is "how does it ship without the owner?" → replaced by the v2 design (owner pre-approved improving the plan, 2026-07-09).

**What v2 keeps from S5 (the good parts):** earned/phased autonomy with demotion; the rung-invariant validator stack; the honest committed≠deployed discipline; the branch-first rollout; the S4 evidence loop as a monitoring signal; the insight that overlay auto-publish requires **automatic post-deploy live verification with auto-rollback** (S5 §4.1 Rung 3 stated this as its own condition — v2 builds exactly that).

## 5. Key architectural findings enabling full automation

1. **The owner's role today is four separable jobs:** (a) triggering runs — pure scheduling; (b) mechanical shipping — pure scripting; (c) safety verification — replaceable by the existing deterministic validator stack + cross-model adversarial review + post-deploy live-verify/auto-rollback; (d) judgment/taste — mostly codifiable defaults (the Assistant's autonomous-run rules already define the pattern: proceed on a documented default + flag), with a **park lane** for the genuinely unverifiable.
2. **The overlay validator being a strict superset of the iOS runtime decode** means machine-green ⇒ delivered-safely for the overlay path — the property that made the Aries incident class detectable pre-ship.
3. **Cross-model review is a proven load-bearing gate in this exact repo** (Codex NO-GOs caught the PII phone-leak, the Mine-tier HIGH-1 silent revert, the VBM bypass twice) — memory `feedback_cross_model_review_final_gate`. It is the right replacement for the human merge decision.
4. **Park-don't-fabricate is already the contract's DNA** (`unverified-model`: "do not fabricate specs"). Full automation keeps this: the pipeline ships everything verifiable and parks the rest with a notification — an exception path, not a human-in-the-loop.

## 6. Incidental findings (this audit, 2026-07-09)

- **Live queue was 95% stale test data** — 22 entries: 16 seeded (2026-06-14), 2 malformed `req:rehearsal:*` (non-numeric ts), 3 processed, 1 real. Cleaned same day (19 deleted, 3 real kept: K2 SE + two `incomplete` brand-only entries). Prior "queue cleaned" claims were incomplete; requester emails sit in plaintext KV (30–90d TTL) — argues for the pipeline itself deleting/anonymizing processed entries (v2 scope).
- `scripts/.printer-intake.local.json` (Cloudflare API token) verified gitignored + never committed.
- The K2 SE request arrived via **general feedback from iOS v1.0.4** — the S1 prefill bug (fixed in 1.0.5+, still not on the App Store) remains a live misroute source that S2's heuristic lane correctly backstopped.
