# 2026-08-15 — Cowork (appdev): intake decision-root binding + a manufacturer-conflict ladder

## Durable context

- **The intake pipeline was not failing.** The owner opened the session on that
  premise; the 08-13 run (`run-20260813T100302Z`) had in fact worked correctly
  end to end. It consumed the 08-12 owner envelope (`decidedAt
  2026-08-12T21:43:53.320Z`, `verify-reentry ok=true`), **resolved
  `max_acceleration` = 500 mm/s²** from Creality's own firmware
  (`CrealityOfficial/Ender-3S1`, `s1_pro_plus` branch, `DEFAULT_MAX_ACCELERATION`),
  failed to resolve `max_speed`, re-parked with exactly one gap, and opened
  [#36](https://github.com/mustiodk/3dprintassistant/issues/36). It also
  correctly declined Anycubic Photon as non-FDM. The 08-12 canonical-ID repair
  held — the sidecar is now under `ender_3_s1_pro`.
- **Silence on 08-14/08-15 is not evidence of a dead runner.** The queue held
  only an owner-gated park, which the runner skips, and no new requests arrived.
  08-11 and 08-12 were silent the same way while the runner was demonstrably
  alive. This is the exact inference that produced two wrong findings on 08-12;
  it was deliberately not repeated.
- **`ender_3_s1_pro` was in a structural loop, and more owner sources could not
  break it.** `OWNER_ATTESTABLE_FIELDS` is `{enclosure, series,
  available_plates}` and `validate-candidate-evidence.js:55` is categorical —
  *"Nothing numeric may ever be added"* — so the owner may supply **sources,
  never a value**. Both competing sources were already known, so any re-entry
  reproduced the park. Two rounds had already proven it (08-10 park → 08-12
  leads → 08-13 identical re-park).
- **The conflict is adjudicated in prose, not in code.** This is the
  load-bearing discovery of the session and it should survive.
  `validate-candidate-evidence.js` adjudicates ONE drafted field at a time —
  `{value, evidenceType, confidence}` — is never handed two competing values,
  and the string `conflict` does not appear in it. The manufacturer-vs-manufacturer
  rule lives in `docs/runbooks/printer-addition-protocol.md` and is applied by
  the research agent. Any future attempt to "enforce" a source-conflict rule in
  the validator produces dead code.
- **Machine note:** this session ran on the **iMac**. The intake runner is
  mac-mini-pinned (`~/.local/share/3dpa-intake/` does not exist here), so no
  host-local parked state could be read or written. All work was repo-side.

## What happened / Actions

1. Cold start halted at the sync gate: `3dprintassistant` was **behind 11**.
   Fast-forwarded to `origin/main` before reading any local state. Confirmed the
   branch was `main` (the 08-12 stale-branch trap).
2. Read the intake state from custody commits + GitHub rather than from
   host-local sidecars, which are unreachable from this machine.
3. Reported status: pipeline healthy, one genuine blocker (#36), plus the
   observation that [#35](https://github.com/mustiodk/3dprintassistant/issues/35)
   had closed on 08-13 and `epoxy_resin` now exists at `engine.js:363` — so
   [#29](https://github.com/mustiodk/3dprintassistant/issues/29) (Creality Hi) is
   **no longer blocked**, contradicting the then-current `NEXT-SESSION.md`.
4. Owner asked for the two fixes **but required assumption validation before
   implementation**. Validation invalidated two assumptions — see below.
5. Implemented both, TDD-first, one finding per commit; pushed.

## The two invalidated assumptions

- **Tie-break locus (material).** The status report had recommended adding the
  rule to the evidence validator. Validation showed that code path can never
  observe a conflict, so the rule would have been **dead code that reads as a
  safety control** — the same shape as the 69 decorative shell assertions found
  on 08-10. Rule moved to the runbook, which is where the decision is actually
  made. Captured as K3
  [`2026-08-15-recommended-fix-locus-would-have-been-dead-code`](../../../ai-operating-model/docs/findings/2026-08-15-recommended-fix-locus-would-have-been-dead-code.md).
- **#34 fix shape (to the good side).** Assumed a one-line prose correction.
  `--repo-root` turned out to be a real flag honoured by all four decision
  commands (all route through `readContext → defaults`,
  `intake-owner-decision.js:109`), so the command could be **bound** to the right
  checkout instead of describing it — removing the failure class rather than
  documenting it.

## Files touched

Modified:
- `scripts/intake-decision-issue.js`
- `scripts/intake-decision-issue.test.js`
- `docs/runbooks/printer-addition-protocol.md`

Created (ai-om):
- `../ai-operating-model/docs/findings/2026-08-15-recommended-fix-locus-would-have-been-dead-code.md`

## Commits

- [`d2c39d3`](https://github.com/mustiodk/3dprintassistant/commit/d2c39d3) —
  `fix(intake): bind the decision command to a root instead of describing one`
  (closes #34). Generated decision issues now emit an absolute `--repo-root`
  **and** an absolute script path, derived from the state dir the sidecar was
  actually read from. Five new assertions, RED first. The fifth caught that the
  first version of my own fix still left `node scripts/...` relative, which
  would have made the issue body's own claim ("run this from any directory")
  untrue.
- [`733e9fb`](https://github.com/mustiodk/3dprintassistant/commit/733e9fb) —
  `docs(intake): give manufacturer-vs-manufacturer conflicts a resolution ladder`.
  Three rungs: spec-grade outranks marketing copy (→ `confirmed`, resolved by
  authority); newer revision outranks older; otherwise take the lower value
  (→ `inferred`, cannot reach ship-ready alone). Always a risk flag, always
  reviewer dispatch. A genuine tie still parks.

Both pushed: `544ca47..733e9fb` on `origin/main`. Scripts + docs only — the
Cloudflare auto-deploy is functionally a no-op.

## Verification

- `scripts/intake-decision-issue.test.js` — 27 passed, 0 failed.
- All 17 intake + evidence node suites re-run by **exit code**, not by reading
  the last line (several use `node:test` output which prints `ℹ duration_ms`
  regardless of outcome): all `exit=0`.
- Rendered the generated issue body and inspected it directly rather than
  trusting the assertions alone.

## Open questions / Follow-up

- **#36 still carries the old text.** The sweep leaves an existing issue alone
  (`planSync` matches on the candidate marker in the body), so `d2c39d3` will not
  rewrite it. Either close #36 so the next sweep regenerates it with the correct
  root, or edit it by hand. Left as an owner call.
- **The ladder is policy read by the research agent, not enforced code.** That is
  the only possible locus (see Durable context), but it means the first proof is
  the next run's behaviour. Worth checking explicitly on the run that processes
  `ender_3_s1_pro`.
- [#33](https://github.com/mustiodk/3dprintassistant/issues/33) (`seturn`
  guardrail) remains unapplied; guardrails untouched since 2026-06-15.
- **#29 is unblocked and `NEXT-SESSION.md` said otherwise** — corrected in this
  wrap-up. A resume surface asserting a blocker that has since cleared is the
  same staleness class as the 08-12 branch trap, in a different surface.
- Md-hygiene: protocol files byte-identical (`diff` clean); no orphan root
  stubs; no untracked files; no secrets; session INDEX at full parity. The
  `</content>` scan returned 23 files — **all false positives**, every hit a
  backtick-wrapped mention of the checklist item itself in prior logs. The naive
  `grep -rl` in the checklist needs the last-line confirmation step it already
  documents.
- Lesson spotter: compact checkpoint run; one candidate accepted (the K3 above),
  no K1 or K4 surfaced. Calibration row appended.
- No MCP behaviour was tested or discovered.
- Verify-before-mutate v2 summary, verbatim:
  `verify-before-mutate ledger: 0 flags (0 resolved_same_turn, 0 resolved_late, 0 unresolved_by_session_end), 0 destructive-core, 2 unclassified, 0 generated-write`
  One `⚠️ EVIDENCE GAP` flag fired mid-session on `findings/INDEX.md` (read via
  `sed`, not the Read tool); verified same-turn with a Read — prepend correct,
  format matched, no revert needed.

## Next session

Locked: **execute the #28 / #36 re-entry on the mac-mini.** Exact command in
`NEXT-SESSION.md`. It cannot run from the iMac — the parked sidecars are
gitignored and host-local.
