# 2026-07-13 — Cowork (appdev): Centauri PD5 recovery and Claude handover

## Durable context

- `centauri_carbon_2` is **parked and not shipped**. Web `main` is clean at
  `c535324`, equal to `origin/main`; the candidate stays on
  `intake/centauri_carbon_2` at `f39d7f9`.
- Recovery implementation is merged: Bridge output isolation (web PR #21,
  ai-om PR #1), full packet/materialized-row parity (web PR #22, ai-om PR #2),
  and existing-overlay refresh behavior (web PR #23).
- Remote checkpoint tags preserve both historical candidates:
  `intake-checkpoint/centauri_carbon_2-candidate-20260712` peels to `be49fea`;
  `intake-checkpoint/centauri_carbon_2-review-split-20260713` peels to `8695583`.
- Direct official Elegoo evidence now explicitly lists Centauri Carbon 2 under
  compatibility and defines the Cool Plate Surface. All deterministic candidate
  gates passed against unchanged `main`.
- The latest Reviewer 1 turn exited 0 under `--output-format json` plus the
  strict schema, but its envelope omitted `structured_output` and its free-form
  result used incompatible fields. No verdict was inferred, Reviewer 2 was not
  spent, and no same-run retry or ship occurred.
- The next session must reproduce the **exact long prompt + schema + parse
  boundary outside PD5** before spending another candidate review turn. A short
  structured-output smoke is not readiness proof.

## What happened / Actions

- Repaired the machine-local Opus wrapper at `~/.local/bin/claude-opus-4-8`
  without changing the global Codex model or upgrading either CLI. Its hermetic
  test and a real auth smoke passed; a focused review accepted the wrapper after
  model-override hardening.
- Executed the approved checkpoint-recovery plan. Web PRs #21/#22/#23 merged as
  `ea0f0da`, `9467d44`, and `c535324`; ai-om PRs #1/#2 merged as `3fd718a` and
  `0378000`.
- Preserved and rebased the candidate without rerunning Scout. Added direct
  official evidence and reran the deterministic evidence/data/picker/
  walkthrough/profile/overlay/diff gates; all were green.
- First owner continuation parked because progress text preceded the mandatory
  exact-first-line JSON. The second continuation removed that prefix and used a
  strict schema, but the real long request omitted `structured_output`.
- Fail-closed behavior held: no inferred verdict, no R2, no same-run retry, no
  candidate merge, no live overlay, no iOS mirror, and no provenance custody.
- Terminal state is preserved in ignored runner state. `POSTRUN ok=true`; lock
  and freeze are absent; checkout is clean `main`; LaunchAgent is loaded idle.
- Notification metadata records `posted=true`, but the owner's screenshot shows
  an earlier `manual-checkpoint-continuation` report. Delivery of the retry-2
  Discord report remains **UNVERIFIED** and must be checked by the next session.

## Files touched

### Tracked implementation already merged

- Web PR #21 / ai-om PR #1: isolated Bridge review output under ignored state.
- Web PR #22 / ai-om PR #2: fail-closed packet/materialized-row evidence parity.
- Web PR #23: existing-overlay refresh behavior.

### Preserved local evidence (ignored; do not delete)

- `scripts/.intake-runner-state/bridge-reviews/pd5-centauri_carbon_2-r1-owner-retry2-20260713.txt`
- `scripts/.intake-runner-state/bridge-reviews/pd5-centauri_carbon_2-r1-owner-retry2-metadata.json`
- `scripts/.intake-runner-state/bridge-reviews/pd5-centauri_carbon_2-r1-owner-retry2-prompt.md`
- `scripts/.intake-runner-state/bridge-reviews/claude-opus-r1-schema.json`
- `scripts/.intake-runner-state/parked/centauri_carbon_2/parked.json`
- `scripts/.intake-runner-state/last-run-report.md`
- `scripts/.intake-runner-state/last-run-session.log`

### Machine-local support files

- `~/.local/bin/claude-opus-4-8`
- `~/.local/bin/claude-opus-4-8.test.sh`

### Wrap documentation

- `docs/planning/ROADMAP.md`
- `docs/sessions/INDEX.md`
- `docs/sessions/NEXT-SESSION.md`
- this log

## Commits

- Web recovery merges: `ea0f0da`, `9467d44`, `c535324`.
- AI operating-model recovery merges: `3fd718a`, `0378000`.
- Candidate-only commits remain unmerged by design; current candidate `f39d7f9`.
- Wrap commit recorded by the closing session.

## Open questions / Follow-up

- Root-cause why the exact long Claude R1 request omitted `structured_output`
  despite a short real schema smoke returning it. Reproduce at the same prompt
  scale and parse boundary before any new PD5 turn.
- Verify whether the retry-2 Discord message is actually visible; `posted=true`
  is transport metadata, not owner-visible receipt proof.
- Findings captured in ai-om:
  [`2026-07-13-pd5-reviewers-split-on-centauri-evidence`](../../../ai-operating-model/docs/findings/2026-07-13-pd5-reviewers-split-on-centauri-evidence.md)
  and
  [`2026-07-13-claude-json-schema-smoke-did-not-predict-pd5-output`](../../../ai-operating-model/docs/findings/2026-07-13-claude-json-schema-smoke-did-not-predict-pd5-output.md).
- Md-hygiene: no root redirect stubs, untracked should-be-tracked markdown,
  secret files, actual stray `</content>` tags, protocol drift, or session-index
  orphans were found. ROADMAP and NEXT-SESSION were stale for this incident and
  are updated by this wrap. Preserved ignored evidence is intentional.
- Lesson spotter ran escalated: two candidates, both accepted (K1 review split;
  K4 non-representative schema smoke). No K3 skill-vs-outcome finding; no MCP
  behavior was tested.
- Verify-before-mutate summary (verbatim):
  `verify-before-mutate ledger: no entries this session`.
- Memory sweep: no durable memory to add; project facts and the reusable process
  lessons are preserved in this log and the findings ledger.
- Vault sweep: nothing durable to propagate; this is local project/tooling
  evidence already canonical in the repos.

## Next session

Use `docs/sessions/NEXT-SESSION.md`. Claude's first task is a deterministic
exact-scale reproduction of the R1 structured-output failure. Only after that
mechanism is proven may it resume the preserved candidate once from
evidence/PD5. Any fresh invalid output, `NO-GO`, split, or post-run failure parks
and stops. After an intake terminal report, the next product sequence remains
iOS 1.0.7, then the separate 1.0.8 tip-jar train. My 3DPA remains parked behind
both and requires an explicit owner command.
