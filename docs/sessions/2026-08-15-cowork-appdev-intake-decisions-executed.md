# 2026-08-15 — Cowork (appdev): both intake decisions executed, plus three guard fixes

## Durable context

- **This session ran on the mac-mini**, which is what made it possible at all.
  The morning session (`…-intake-decision-root-and-tiebreak.md`) ran on the iMac
  and could only do repo-side work; the parked sidecars are gitignored and
  host-local. Both owner decisions are now recorded against the automation
  checkout at `~/.local/share/3dpa-intake/checkout/3dprintassistant`.
- **The automation checkout was three commits behind `origin/main`** and did not
  have the ladder (`733e9fb`) or the #34 fix (`d2c39d3`). The bootstrap syncs it
  at run start, so this would have self-corrected — but the envelope would have
  been written by stale tooling. Verify the checkout's HEAD before writing a
  decision into it; it is a separate clone with its own git state.
- **`ender_3_s1_pro` is a clean rung-1 case and the research is already done.**
  The packet holds both sources: the manual V1.4 page-12 Device Specifications
  table (150 mm/s, specification-grade) and the store.creality.com page *title*
  (160 mm/s, no spec table, marketing copy). 150 also matches shipped sibling
  `ender_3_s1`. Nothing new was supplied — the ladder, not the sources, is what
  changed. The next run is the first behavioural proof that the ladder works,
  because it is policy read by the research agent and not enforced code.
- **`hi` could not be fixed the obvious way.** `attest-field` and
  `approve-series` genuinely cannot stack (`approveSeries` throws on any
  existing decision, `intake-owner-decision.js:379`; a `series_group` is applied
  only from `action:"reenter"`). So `approve-series` was the only path, and it
  re-enters through research — which is what makes the plate value get
  redrafted rather than hand-edited.
- **Hand-editing ratified state was the wrong instinct twice.** The guardrails
  JSON has a designed applier (`apply-guardrails-diff.js`) that also writes
  `_provenance`, bumps `version` and sets `lastRatified`; the hand edit was
  reverted and redone through it. Check for an applier before editing generated
  or ratified state.

## What happened / Actions

1. Cold start halted at the sync gate: web `behind:6`, iOS `behind:5`. Both
   trees clean; fast-forwarded before reading any local state. Branch confirmed
   `main` on both (the 08-12 stale-branch trap).
2. Corrected the ROADMAP Current Snapshot iOS row, which still said v1.0.4 was
   live and 1.1.0 was the next train while the Active Release section six lines
   below said 1.1.3 / 1.1.4.
3. Executed the `ender_3_s1_pro` (#28/#36) re-entry: `provide-evidence` with all
   three prior leads including the manual PDF, then `verify-reentry ok=true`.
4. Investigated `hi` before approving, found the plate-vocabulary gap, closed it,
   then approved the series. Both candidates now report
   `OWNERDECISION ok=true action=verify-reentry`.
5. Regenerated #36 and #29 bodies from the fixed generator, in place rather than
   close/reopen so the numbers stay valid.
6. Applied the owner-approved `seturn` guardrail (#33) through the sanctioned
   applier.
7. Closed the `planSync` gap that made steps 5's hand-work necessary.

## The three guard fixes

- **Plate vocabulary (`50442b7`).** `KNOWN_PLATE_IDS` guarded only the owner
  path; researcher-drafted values were unchecked. Parked `hi` carries
  `epoxy_flexible`, absent from `engine.js` and `data/`. List moved to the
  shared evidence gate. Finding:
  [`2026-08-15-allowlist-guarded-the-owner-path-not-the-machine-path`](../../../ai-operating-model/docs/findings/2026-08-15-allowlist-guarded-the-owner-path-not-the-machine-path.md).
- **`seturn` guardrail (`a9a9392`).** Owner-approved 2026-07-29, never written.
  Applied via `apply-guardrails-diff.js` (version 1→2, `_provenance` recorded,
  idempotency proven by identical md5). Two guards then forced follow-on work:
  the fallback-parity test compares arrays **in order**, so `seturn` belongs at
  the tail, and `intake-retrospective.test.js` hardcoded "real config is version
  1" across five checks — it tested the number, not the behaviour, and is now
  relative.
- **Issue-body drift (`7e1df57`).** `planSync` never revisited an existing
  issue, so `d2c39d3` reached no already-open issue. Finding:
  [`2026-08-15-fixing-a-generator-does-not-fix-its-published-output`](../../../ai-operating-model/docs/findings/2026-08-15-fixing-a-generator-does-not-fix-its-published-output.md).

## Files touched

Modified: `docs/planning/ROADMAP.md`, `scripts/validate-candidate-evidence.js`,
`scripts/validate-candidate-evidence.test.js`, `scripts/intake-owner-decision.js`,
`scripts/printer-intake-guardrails.json`, `scripts/printer-intake-scout.js`,
`scripts/printer-intake-scout.test.js`, `scripts/intake-retrospective.test.js`,
`scripts/intake-decision-issue.js`, `scripts/intake-decision-issue.test.js`.

Created (ai-om): the two findings above.

Host-local (not in git): owner-decision envelopes for `ender_3_s1_pro` and `hi`.

## Commits

- [`363aca8`](https://github.com/mustiodk/3dprintassistant/commit/363aca8) — docs(roadmap): correct the Current Snapshot iOS row to 1.1.3 live / 1.1.4 train
- [`50442b7`](https://github.com/mustiodk/3dprintassistant/commit/50442b7) — fix(intake): validate researcher-drafted plate ids against the catalog vocabulary
- [`a9a9392`](https://github.com/mustiodk/3dprintassistant/commit/a9a9392) — fix(intake): apply the owner-approved `seturn` resin guardrail (closes #33)
- [`7e1df57`](https://github.com/mustiodk/3dprintassistant/commit/7e1df57) — fix(intake): refresh decision-issue bodies that have drifted from the generator

All pushed to `origin/main`; automation checkout synced to `7e1df57`. Scripts and
docs only — no engine, data, or iOS change, so the Cloudflare auto-deploy is a
functional no-op.

## Verification

- 23 intake/validate/epoxy/guardrails suites green **by exit code** (several use
  `node:test`, whose `ℹ duration_ms` tail says nothing about pass/fail).
- Three plain-script suites run directly: scout, retrospective, guardrails-diff.
- Two shell suites (post-run-invariants, run-wrapper) exit 0 — noting the bash
  3.2 caveat: CI is the real gate for these.
- CI green on all four commits, `7e1df57` included (confirmed at wrap-up).
- `planSync` refresh proven end-to-end against live GitHub: dry-run reports
  `refreshed=0` because both issues match the generator byte-for-byte.
- Guardrails idempotency: second `--apply` leaves the file byte-identical.

## Open questions / Follow-up

- **The ladder is unproven.** It is policy the research agent reads, not enforced
  code, so the next scheduled run is the first real evidence. Check three things
  on the run that processes `ender_3_s1_pro`: does it resolve `max_speed` to 150
  citing the manual; does it carry a risk flag and dispatch **both** reviewers;
  and if it re-parks, read the resolution note before touching anything — "the
  ladder needs a rung" and "the researcher never read the runbook section" are
  different findings.
- **`hi`'s plate value is still `epoxy_flexible` in the packet.** It is expected
  to be redrafted at re-research. If it is not, the new gate parks it
  `research-defect` instead of shipping it.
- **The 4 selection events still 400** on every chip click; needs an owner
  decision (allowlist vs delete the dead `track()` calls). Not started.
- **"Protected behaviour" section for `3dpa-context.md`** (from the 08-01
  external-audit spillover) remains the highest-value process item; est. 1–2h,
  deserves its own session.
- Md-hygiene: protocol files byte-identical (`diff` clean); findings INDEX at
  full parity (113 files, 0 orphans); no untracked files in any repo; no stray
  `</content>` last-line tags; no secrets.
- Lesson spotter: compact checkpoint; two K3 candidates accepted (both above),
  no K1 or K4 surfaced. The two guards that overruled me (fallback parity,
  retrospective version coupling) were tests doing their job, not tool-vs-
  controller disagreement.
- Verify-before-mutate v2 summary, verbatim:
  `verify-before-mutate ledger: 2 flags (0 resolved_same_turn, 0 resolved_late, 2 unresolved_by_session_end), 0 destructive-core, 19 unclassified, 1 generated-write`
  Both flags fired on files I had read in the **automation checkout** rather than
  the dev tree, and both were verified same-turn by other means and stated
  inline: `intake-owner-decision.js` by `git show HEAD:… | diff -` against the
  checkout copy (identical) plus a require-cycle check, and
  `printer-intake-scout.test.js` by running the suite and observing the new
  block execute. The detector appears to look for a `direct_file_read` of the
  same path and does not credit either method — **owner's call whether those two
  count as resolved**; controller self-assessment is not valid proof per the v2
  spec M3.

## Next session

Nothing is locked. Both intake decisions are armed and the next scheduled 12:00
run owns the processing — the useful next action is to read that run's report
rather than to start anything. If a session is wanted before then, the strongest
candidates are the #32 iOS-train scoping block (carried in `NEXT-SESSION.md`) or
the "Protected behaviour" section.
