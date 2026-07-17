# Intake Autonomy v2 / v2.1 — Gate Ledger

**v2:** [plan](../superpowers/plans/2026-07-10-intake-autonomy-v2-impl-plan.md) · [spec](../superpowers/specs/2026-07-09-intake-autonomy-v2-design.md)

**v2.1:** [small-gates plan](../superpowers/plans/2026-07-10-intake-autonomy-v2.1-small-gates-plan.md) · [evidence/retry spec](../superpowers/specs/2026-07-10-intake-autonomy-v2.1-evidence-retry-retrospective-design.md)

Rules: ticks are recorded **as they happen, never pre-narrated**. Every row carries evidence (command output lines, commit SHAs, verbatim log lines). One row per gate exit; failure branches recorded verbatim.

| Gate | Status | Evidence |
|---|---|---|
| S1 sync-first isolated runner | ✅ production cutover green 2026-07-17 | Reviewed implementation merged/pushed (web `67d7913`, ai-om `64f46c6`); automation-owned checkout installed and loaded; supervised zero-candidate run ended `PREFLIGHT`/`POSTRUN`/`SYNCBOOT ok=true` and launchd exit 0; i7 duplicate custody `6113f04`; U1 re-entry then parked fail-closed at evidence before review; no iOS push |
| I1 parked-sidecar path ownership | ✅ 2026-07-16 | `run-20260715T100124Z` root cause reconstructed from the headless transcript; RED reproduced the unsafe raw writer, web `104251c` + ai-om `8151868` close it under contract v2.4; Claude hostile review PASS; focused suite green; see I1 row |
| R8 final validation + ready state | ✅ 2026-07-10 | Expected test files exist; full R8 intake suite + project validators green; final review NO-GO on ai-om split-routing fixed by `a118bd5`; focused re-review GO; no push/PR/merge; see R8 row |
| R7 K2 SE migration drill | ✅ 2026-07-10 | Existing R3 fixture drill re-run: `node scripts/intake-parked-store.test.js` **14/14**; K2 SE v1 sidecar migrates to `decision-required`, remains tainted, fixture byte-unchanged; no automatic reattempt; see R7 row |
| R6 runner contract integration | ✅ 2026-07-10 | web `e3c3d44` + ai-om `9bc6e0c`; direct review NO-GO chain closed by `d749925`/`fbe7ccc`/`b15f430`/`6de7f86`/`1ad308d`; final focused re-review GO; verification green; see R6 row |
| R5 provenance store + custody preflight | ✅ 2026-07-10 | RED missing provenance module + preflight lacking repo/dry-run custody pass → 2/2 provenance tests + custody shell harness; direct hostile review NO-GO with 3 findings; accepted coverage findings landed one-per-commit; focused re-review GO; see R5 row |
| R4 RD3 retry gate | ✅ 2026-07-10 | RED missing module → 16/16 tests; direct hostile review NO-GO with 2 behavior findings + coverage gap; findings applied one-per-commit; focused re-review GO; see R4 row |
| R3 parked store v2 + K2 SE migration | ✅ 2026-07-10 | RED missing module → 14/14 tests; direct hostile review NO-GO ×2, both findings applied one-per-commit; focused re-review GO; K2 SE fixture migrates only, no re-attempt; see R3 row |
| R2 structured reviewer-output contract | ✅ 2026-07-10 | RED missing module → 12/12 tests; direct hostile review NO-GO ×3, all findings applied one-per-commit; focused re-review GO; see R2 row |
| R1 evidence slots + candidate evidence gate | ✅ 2026-07-10 | RED-first source/evidence modules + Scout skeleton; final 3/3 normalizer, 15/15 evidence, full Scout green; Claude GO-WITH-PATCHES findings applied one-per-commit; final direct fallback re-review GO after Claude spend-limit outage; see R1 row |
| R0 taxonomy + NO-GO taint graph | ✅ 2026-07-10 | RED missing module → 11/11 tests + CLI `ok=true`; hostile review NO-GO then GO-WITH-PATCHES, 5 accepted findings landed one-per-commit; final Claude re-review GO; see R0 row |
| B0 launchd environment probe | ✅ 2026-07-10 | 4/4 PASS on a real launchd run (`ppid=1`); see B0 row below |
| B1 republish-overlay.js | ✅ 2026-07-10 | `c3abe4e` — 21/21 TDD, hostile GO-WITH-PATCHES ×8 applied, live-overlay no-op sanity clean; see B1 row |
| B2 live verification probes | ✅ 2026-07-10 | `cc9ba95`+`d1f84cd`+`bcdf510` — 25/25 probe tests, both probes green on real prod, refactor byte-for-byte; see B2 row |
| B3 preflight + lock/freeze + KV hygiene + notifier | ✅ 2026-07-10 | `b90dad0`→`461daf8` — 26 unit tests, real preflight `ok=true`, live KV dry-run deletes=0 kept=3; see B3 row |
| B4 contracts + PD7 + plist + dry-run | ✅ 2026-07-10 | web `04477ad`→`d766f6d` + ai-om `f38d270`+`58eadda` — K2 SE dry-run caught the reserialize hazard; hostile ×14 applied; see B4 row |
| B5 latency + rollback drill + enablement | ✅ 2026-07-10 FINAL | webhook set + test POST `posted=true`; plist bootstrapped (12:00); first live run completed 12:02–12:17 CEST — K2 SE `auto-parked:review-no-go` (pipeline worked correctly: parked, not shipped, on a plausibly-overcautious review); see B5 row |

---

## Rows (newest first)

### S1 — sync-first isolated runner ✅ production cutover (2026-07-17)

**Root cause and decision:** the production LaunchAgent pointed at the owner's
normal web checkout and called preflight before synchronization. Reproduction
proved clean/behind stops as `web-out-of-sync` and dirty/behind stops as
`web-dirty`. Pull-first in the same checkout fixes only clean/behind; automated
stash/reset/clean would put owner work at risk. The owner approved a persistent
automation-owned checkout with a strict sync bootstrap in front of the existing
preflight/wrapper/POSTRUN chain.

**Plan gate:** independent Claude review through Bridge returned
`GO-WITH-PATCHES`. The plan now includes a six-hour stale bootstrap-lock
takeover, positive proof that both parked candidates remain owner-ineligible
before the cutover run, contract-version traceability, and explicit handling of
the development checkout becoming behind after automation custody pushes. The
owner's stop rule is active: no style/polish review loop.

**Local implementation evidence:** sync bootstrap RED (missing executable) →
all clean/current, clean/behind, dirt-preservation, ahead/diverged, origin,
branch, wrapper, fresh/stale-lock, development-decoupling, and exit-propagation
cases green (`intake-sync-bootstrap.test.sh`). Runtime-path tests RED on the
hardcoded iOS sibling/web paths → preflight, wrapper, validator, republisher,
kickoff, and AI-OM v2.5 path contract green. Owner-decision tests RED on missing
module and stale U1 blocked copy → six duplicate/re-entry identity/SHA/archive/
idempotency cases green; kickoff + AI-OM v2.6 require deterministic
`verify-reentry`. Installer RED on missing executable → fresh clone, exact
bootstrap/plist rendering, SHA-verified state migration, verify-only byte
stability, idempotency, and conflict refusal green.

**Review boundary:** independent implementation review returned
`GO-WITH-PATCHES`: wrapper fallback, owner-approval crash
recovery, and duplicate-ledger replay landed one-per-commit (`baee2f5`,
`daf815b`, `a9ef915`). The single focused follow-up returned **GO** on all
three; the review loop stopped there. Fresh final verification passed:
bootstrap + installer + preflight + wrapper + POSTRUN shell suites; combined
Node suite **32/32**; taxonomy **11/11**; parked store **16/16**; candidate
evidence **30/30**; reviewer output **14/14**; data **6/6**; live-path overlay
validator green; plist lint green; both worktrees clean.

**Production cutover:** the reviewed changes were fast-forwarded and pushed as
web `67d7913` and ai-om `64f46c6`. The installer created the persistent
automation-owned checkout at `~/.local/share/3dpa-intake/checkout/3dprintassistant`,
migrated ignored state by SHA, rendered the launchd plist with explicit web/iOS
paths, and replaced the old LaunchAgent. Supervised run
`run-20260717T103753Z` found only the two owner-gated parked candidates, shipped
zero, parked zero, errored zero, and ended with `PREFLIGHT ok=true`,
`POSTRUN ok=true`, `SYNCBOOT ok=true reason=none detail=behind=0 ahead=0`, and
launchd exit 0. The automation checkout was clean/current; the owner checkout's
dirt could no longer block the scheduled run.

**Owner decisions and fail-closed result:** the ambiguous `i7_i` request was
verified as the already-live Creality `sparkx_i7` (`i7`, `i Series`), closed as
`was-duplicate-missed`, and custody-pushed in `6113f04`; catalog and overlay were
unchanged and the production picker was green. The owner-approved U1 decision
bound `series_group:"U Series"` to candidate SHA `1979b40b…`, and
`verify-reentry` passed. Production run `run-20260717T104818Z` materialized U1
on preserved branch `intake/u1@3ff3811`; data, picker, all 18 walkthrough
combos, matrix audit, guardrails, overlay generation, and diff guards passed.
The single-shot evidence gate then failed before PD5 because the prior packet
used `evidenceType:"manufacturer-spec-page"` instead of `"manufacturer"` for
all 13 critical fields, had notes parity drift, and omitted
`open_door_threshold_bed_temp`. The runner made no packet edit, spent no review
turn, merged/pushed nothing, restored clean/current `main`, parked U1 as
`research-defect` with its packet and branch preserved, and again ended
`POSTRUN`/`SYNCBOOT ok=true` with launchd exit 0. iOS remained clean/eight ahead
and unpushed; no 1.0.7/1.0.8 train started.

### I1 — parked-sidecar path ownership ✅ (2026-07-16; web `104251c` + ai-om `8151868`)

**Incident and root cause:** `run-20260715T100124Z` correctly parked the
ambiguous `i7_i` candidate as `unverified-model`, but its headless transcript
shows an earlier call to `writeParked('i7_i', sidecar)`. The raw API expected a
file path and performed an unchecked `writeFileSync`, so that call created the
untracked repo-root file `i7_i`. The wrapper's POSTRUN then correctly failed
`web-dirty`, and the same artifact blocked the 2026-07-16 preflight before a
runner report could be produced. The preflight was the correct fail-closed
symptom, not the defect.

**TDD and fix:** the regression first failed against both the exact bare
candidate-id call and a relative `parked.json` path. Web commit `104251c` makes
the store own the canonical destination through
`writeParkedForCandidate(candidateId, sidecar)`, validates candidate identity,
and makes the raw writer reject relative paths or a basename other than
`parked.json` before filesystem I/O. The kickoff requires the candidate-owned
helper. AI-OM commit `8151868` advances the executable runner contract to v2.4
with the same invariant. The original stray artifact was preserved byte-for-byte
under ignored incident state before removal from repo root; the canonical parked
sidecar and candidate packet were not rewritten.

**Review and verification:** independent Claude hostile review returned
**PASS — no MUST-FIX**. Two directly relevant suggestions were accepted before
commit: require an absolute raw-writer path and pin the literal incident call in
the test. The unrelated suggestion for extra taint-path coverage was left outside
this incident patch. Fresh verification passed: `node --check
scripts/intake-parked-store.js`; parked-store **16/16**; taxonomy **11/11**;
`intake-run-preflight.test.sh`; `intake-post-run-invariants.test.sh`;
`intake-run-wrapper.test.sh`; and `git diff --check` in both repositories.
No printer catalog, overlay, web UI, iOS data, or Android plan changed.

### Additive stage-order clarification (2026-07-13)

The R6 row below is immutable implementation history: its original
`research/fill → evidence gate → retry gate → mechanical ship → PD5` wording
describes the pre-parity contract and is not rewritten. The 2026-07-13
materialized-evidence amendment adds catalog parity, so the current operative
order is now:

`research/fill → Stage 4 mechanical materialization on the isolated intake
branch → Stage 4b candidate-evidence plus catalog-parity gate → Stage 5 entry
retry gate for judgment-on-evidence candidates → PD5 dual review`.

This ordering is fail-closed: catalog parity cannot run before the candidate row
exists, and neither the retry gate nor PD5 may spend a review turn until the
evidence/catalog gate passes. The original v2.1 spec's `3b evidence gate` and
`4b retry gate` table labels remain as ratified historical labels; the operative
labels and order are the Stage 4 / 4b / 5 sequence above, matching the current
kickoff and AI-OM runner contract.

### R8 — final validation + ready state ✅ (2026-07-10; web final-docs close + ai-om `a118bd5`)

**Verification:** R8 Step 0 proved all expected test files exist. Full local intake suite passed: `node scripts/intake-park-taxonomy.test.js` **11/11**; `node scripts/lib/intake-source-normalizer.test.js` **3/3**; `node scripts/validate-candidate-evidence.test.js` **15/15**; `node scripts/validate-reviewer-output.test.js` **12/12**; `node scripts/intake-parked-store.test.js` **14/14**; `node scripts/intake-retry-gate.test.js` **16/16**; `node scripts/intake-provenance-store.test.js` **2/2**; `bash scripts/intake-run-preflight.test.sh`; `node scripts/printer-intake-scout.test.js` **ALL TESTS PASS**; `node scripts/republish-overlay.test.js` **21/21**; `node scripts/verify-live-overlay.test.js` **15/15**; `node scripts/verify-live-picker.test.js` **10/10**; `node scripts/intake-kv-hygiene.test.js` **15/15**; `node scripts/intake-notify.test.js` **11/11**; `node scripts/intake-diff-guards.test.js` **10/10**. Project validators passed: `node scripts/validate-data.js`, `node scripts/validate-ios-printer-overlay.js`, and `git diff --check`.

**Final review:** direct read-only `gpt-5.4` fallback reviewed the full R0–R7 implementation in session `019f4dd7-7630-7031-9f88-081617d5bea3` and returned **NO-GO** ([record](../../codex/intake-autonomy-v2.1-review/direct-codex-2026-07-10-r8-final.md)): two ai-om executable contracts still collapsed split `{GO, NO-GO}` verdicts into generic `review-no-go`, contradicting the canonical v2.1 multiset rule. The accepted finding landed in ai-om commit `a118bd5` (`docs(agents): preserve intake split-review routing`), updating both `intake-pipeline-runner.md` and `printer-addition-assistant.md`. Affected test rerun: `node scripts/validate-reviewer-output.test.js` **12/12**. Focused re-review session `019f4dda-8c4d-7bb3-902a-1f63060f941e` returned **GO** ([record](../../codex/intake-autonomy-v2.1-review/direct-codex-2026-07-10-r8-final-followup.md)).

**Ready state:** v2.1 implementation is complete locally on web branch `codex/intake-v21-impl`; cross-repo ai-om contract commits are local on `ai-operating-model/main` (`9bc6e0c`, `a118bd5`). No push, PR, or merge was performed in this R8 run. K2 SE remains parked + tainted + stationary: no Scout rerun, no PD5 re-entry, no timer retry, and no automatic acceptance path. R8 does not change engine/app/printer-data semantics or publish an overlay; web/iOS/Android user-visible behavior remains unchanged until the branch is explicitly pushed, reviewed, and merged.

### R7 — K2 SE migration drill ✅ (2026-07-10; existing R3 fixture/test, ledger-only close)

**Drill:** R7 reused the existing R3 fixture `scripts/fixtures/k2-se-parked-v1.json` and did not recreate or edit it. The already-landed fixture tests are stronger than the plan snippet: `K2 SE v1 review-no-go migrates to decision-required and tainted` proves `schema=intake-parked@2`, `class=decision-required`, `tainted=true`, `repairAttempts=0`, empty evidence, and a synthesized durable NO-GO `verdictRefs` entry; `readParked migrates the real-like K2 SE fixture without mutating it` proves the fixture is byte-unchanged by the migration path.

**Verification:** `node scripts/intake-parked-store.test.js` passed **14/14** after R6 integration, including the two K2 SE fixture checks plus taint-laundering, malformed repair counter, and allowed-update preservation coverage.

**Boundary:** R7 proves migration only. A real K2 SE re-attempt requires explicit owner instruction under RD2; without that, migrated K2 SE remains `decision-required`. R7 does **not** re-run Scout, does not re-enter PD5, does not touch `data/printers.json`, does not publish an overlay, and does not change web/iOS/Android behavior.

### R6 — runner contract integration + docs alignment ✅ (2026-07-10; web `e3c3d44` + `d749925` + `fbe7ccc` + `b15f430` + `6de7f86` + `1ad308d`; ai-om `9bc6e0c`)

**Scope:** R6 promoted the v2.1 contract from implementation pieces into the executable runner surfaces: `scripts/intake-run-kickoff.md`, this runbook, this ledger, and the cross-repo runner contract at `ai-operating-model/docs/agents/intake-pipeline-runner.md`. The kickoff now points at contract version 2.1 and encodes the exact scheduled-run stage order: custody-aware preflight → taxonomy validation → parked migration/retry sweep → known-good snapshot → Scout triage → research/fill → `validate-candidate-evidence.js` before review → `canRetryJudgment` for judgment-on-evidence retries → mechanical ship + diff guard → structured PD5 dual review → park or merge/push → live verify + rollback → iOS mirror local-only after web merge → provenance+ledger custody before watermark → KV hygiene → notify.

**Review chain:** Claude review remained unavailable under the confirmed monthly spend limit, so R6 used the default direct read-only `gpt-5.4` fallback. Initial review session `019f4dc8-7e88-79d0-99ec-c1994e1c892e` returned **NO-GO ×3** ([record](../../codex/intake-autonomy-v2.1-review/direct-codex-2026-07-10-r6.md)): autonomous checklist items still implied owner sign-off, risk-triggered review wording contradicted mandatory PD5 dual review, and the B5 K2 SE row still exposed the superseded weekly retry policy. Fixes landed one-per-commit: `d749925` made checklist gates mode-aware, `fbe7ccc` made autonomous PD5 mandatory, and `b15f430` marked review-no-go retry policy superseded/event-only. Focused re-review session `019f4dcb-f61b-7ab1-b837-2019fc31a68c` returned **NO-GO** ([record](../../codex/intake-autonomy-v2.1-review/direct-codex-2026-07-10-r6-followup.md)) on a remaining unqualified new-brand forbidden action; `6de7f86` scoped that forbidden action by manual vs autonomous mode. Next focused review session `019f4dd0-7293-7752-acad-5c587b2544b2` returned **NO-GO** ([record](../../codex/intake-autonomy-v2.1-review/direct-codex-2026-07-10-r6-followup2.md)) on the last canonical conflict: manual Phase 3 still implied iOS mirror before overlay/push while the runner requires local-only post-merge PD6. `1ad308d` made autonomous iOS sequencing explicit in execution modes, Phase 3, verification, and Phase 5. Final focused re-review session `019f4dd3-2dd6-7b52-a2bc-1857af075869` returned **GO** ([record](../../codex/intake-autonomy-v2.1-review/direct-codex-2026-07-10-r6-followup3.md)).

**Verification:** after the final fix, `node scripts/intake-park-taxonomy.js` returned `ok=true`; `node scripts/validate-candidate-evidence.test.js` passed **15/15**; `node scripts/validate-reviewer-output.test.js` passed **12/12**; `node scripts/intake-parked-store.test.js` passed **14/14**; `node scripts/intake-retry-gate.test.js` passed **16/16**; `node scripts/intake-provenance-store.test.js` passed **2/2**; `bash scripts/intake-run-preflight.test.sh` passed; and `git diff --check` passed in both the web repo and `ai-operating-model`.

**Contract proven:** the canonical runner/runbook/ledger surfaces now align on the v2.1 controls: taxonomy runs before sidecar migration/write or review; no review turn is spent before `validate-candidate-evidence.js`; judgment retries can enter PD5 only through `canRetryJudgment`; reviewer output is structured and validated; NO-GO taint is event-only, never timer-repaired; provenance + append-only ledger custody lands before watermark advance; and the iOS mirror is local-only after web merge/push and successful live verification. R6 changes only operational docs/prompts plus the cross-repo agent contract; there is no engine, app, shipped-printer-data, overlay payload, web UI, iOS, or Android semantic change, so no app/data utilization change is needed at this gate.

### R5 — provenance store + custody preflight ✅ (2026-07-10; `d513cc9` + `89169a8` + `119fa8a`)

**TDD:** `node scripts/intake-provenance-store.test.js` first failed on the missing module; `bash scripts/intake-run-preflight.test.sh` first failed because the old preflight ignored `--repo/--dry-run` and blocked on the controller worktree dirt. Final provenance coverage proves idempotent upsert by printer id, preservation of existing printer provenance, and no mutation of either the source document or the passed provenance object. Final custody shell harness proves dirty custody paths pass, dirty `data/printers.json` fails, a custody-subject ahead commit touching only custody paths passes, a custody-subject commit touching `data/printers.json` fails, and a non-custody subject touching a custody path fails. A zsh-specific regression was caught during GREEN: `local path` shadowed zsh's command-search `path` array; renaming to `file_path` restored command lookup.

**Review chain:** direct read-only `gpt-5.4` review session `019f4dbd-3c42-7582-b58c-7bb323996fa9` returned **NO-GO** ([record](../../codex/intake-autonomy-v2.1-review/direct-codex-2026-07-10-r5.md)): the provenance file was still untracked pre-commit, dry-run coverage did not prove `origin/main` was preserved, and provenance-object immutability was not asserted. The tracked-file issue was closed by the baseline R5 commit. The two accepted coverage findings landed one-per-commit: `89169a8` proves dry-run preserves `origin/main` and leaves the repo one custody commit ahead; `119fa8a` proves the provenance argument is not mutated. Mutation checks confirmed both tests fail against the rejected behavior before being restored green. Focused re-review session `019f4dc1-7b2d-7201-a674-e96a6ec5e392` returned **GO** ([record](../../codex/intake-autonomy-v2.1-review/direct-codex-2026-07-10-r5-followup.md)).

**Contract proven:** `docs/printer-provenance.json` is tracked and starts as `printer-provenance@1`; `upsertPrinterProvenance()` writes by printer id without mutating inputs. `intake-run-preflight.sh` now recognises RD10 custody state before the generic web clean/sync predicate: only `scripts/printer-intake-outcomes.jsonl` and `docs/printer-provenance.json` are tolerated as dirty custody paths; ahead commits are tolerated only when every ahead commit has subject `chore(intake): custody*` and touches only those two paths; `behind` still fail-closes first. Dry-run preserves an existing `refs/remotes/origin/main` so tests cannot erase ahead evidence. Engine, shipped printer data, overlays, web UI, iOS, and Android plan are untouched, so no app/data utilization change is needed at this gate.

### R4 — RD3 judgment retry gate ✅ (2026-07-10; `1537bdf` + `0c8cf5e` + `12efd9f`)

**TDD:** `node scripts/intake-retry-gate.test.js` first failed on the missing module. Final **16/16** coverage pins bare URLs, canonical-source replay, unchanged/missing diffs, absent resolution fields, invalid URLs, non-judgment classes, malformed inputs, objection count/identity/order drift, and malformed or impossible `resolvedAt` timestamps. Every rejection returns `review-no-go-unresolved` with `reviewRequests:0`; only a structurally complete retry returns exactly one review request.

**Review chain:** canonical direct read-only `gpt-5.4` fallback initial verdict **NO-GO** ([record](../../codex/intake-autonomy-v2.1-review/direct-codex-2026-07-10-r4.md)). The reviewer reproduced reordered and extra-leading objections reaching review and a free-text timestamp passing. Identity/order binding and strict timestamp validation landed as separate commits with their own RED tests. Focused re-review session `019f4d91-e745-7b11-9fa7-6d886ca04223` returned **GO**, including direct proof that a valid multi-objection retry still requests exactly one review.

**Contract proven:** a retry reaches PD5 only from `judgment-on-evidence`, with a changed diff, the exact persisted objection set, and per-objection canonically novel `source` + `excerpt` + `claim` + valid `resolvedAt`. Structural failure never spends a review turn and remains in the event-only `review-no-go-unresolved` lane. This gate changes no engine, printer data, overlay, web UI, iOS, or Android behavior; no app/data utilization change is needed.

### R3 — parked store v2 + K2 SE migration ✅ (2026-07-10; `318fd90` + `868c950` + `1d96535`)

**TDD:** `node scripts/intake-parked-store.test.js` first failed on the missing module. Final **14/14** coverage proves the real-like K2 SE v1 fixture migrates to `intake-parked@2` as `decision-required`, remains tainted, synthesizes a durable NO-GO verdict reference, starts with `repairAttempts:0`, and leaves the fixture byte-unchanged. Tainted sidecars are refused from every class except `judgment-on-evidence` and `decision-required`. An untainted `research-defect` receives exactly one repair pass; the next entry and any malformed/negative/fractional counter fail closed to `decision-required` + owner trigger.

**Review chain:** Claude remained unavailable under the confirmed monthly spend limit, so the canonical direct read-only `gpt-5.4` fallback reviewed R3. Initial verdict **NO-GO ×2** ([record](../../codex/intake-autonomy-v2.1-review/direct-codex-2026-07-10-r3.md)): an update could strip persisted NO-GO history and launder the candidate into a repair lane; malformed repair counters could buy another pass. The findings landed one-per-commit. Focused re-review in session `019f4d8a-1618-7850-90f1-55ea3d3b7dad` returned **GO**.

**Contract proven:** `writeParked()` preserves prior NO-GO verdict references and monotone taint from an existing v1/v2 file before validating the next class. Migration and repair entry accept only non-negative integer counters and never grant a pass on malformed state. K2 SE was **not re-run**: R3 reads the committed fixture and proves migration only; a real re-attempt remains owner-gated for R7/RD2. Engine, shipped printer data, overlays, web UI, iOS, and Android plan are untouched, so no app/data utilization change is needed at this gate.

### R2 — structured reviewer-output contract ✅ (2026-07-10; `868904e` + `b6bdb6e` + `96ff8fd`)

**TDD:** `validate-reviewer-output.test.js` first failed on the missing module. The final **12/12** suite covers null/non-object input, GO/NO-GO objection cardinality, malformed objections, strict ISO syntax + impossible calendar dates, canonical lowercase reviewer ids, and a structural test pinning RD4 split-verdict routing in both operational docs.

**Review chain:** Claude was unavailable under the confirmed monthly spend limit, so the canonical read-only direct fallback reviewed R2. First pass **NO-GO ×3** ([record](../../codex/intake-autonomy-v2.1-review/direct-codex-2026-07-10-r2.md)): JavaScript normalised impossible dates; reviewer ids allowed case drift; kickoff/runbook still collapsed split verdicts into generic parking. Each finding landed separately. Focused re-review session `019f4d33-83af-7890-b379-08ea2f0f6054` reran the tests and returned **GO**.

**Contract proven:** malformed output never throws or infers from prose and routes `review-unavailable`; `GO` requires zero objections; `NO-GO` requires structured objections with stable lowercase reviewer id + real ISO-8601 calendar time. Both verdicts are always classified as a multiset: `{GO, GO}` ships, `{NO-GO, NO-GO}` parks as `review-no-go`, and a split routes `review-split` → `decision-required`.

### R1 — evidence slots + deterministic candidate evidence gate ✅ (2026-07-10; `56d139a` + `92c98cd` + `aa48967` + `a526b61` + `b459db9`)

**TDD:** source normalizer first failed on missing module; evidence validator first failed on missing module; the pre-implementation Scout regression produced 7 expected failures (missing v2.1 slot keys plus `extruder_type`, `max_acceleration`, chamber/camera/lidar, and `notes`). Final evidence surface covers the runbook's required always-on critical fields plus optional `max_chamber_temp` / `open_door_threshold_bed_temp` when proposed. Manufacturer evidence, typed boolean absence rationale, complete-sweep `world-absent`, app-cap documentation, durable matching `notes[]` citations, and zero-review-turn rejection are test-pinned.

**Hostile review chain:** independent Claude review **GO-WITH-PATCHES** ([transcript](../../codex/intake-autonomy-v2.1-review/bridge-2026-07-10-194437-060173.md)). Accepted findings landed one-per-commit: all rejection paths assert `reviewRequests=0`; equivalent manufacturer-not-published app-cap wording; trailing citation punctuation; distinct notes metadata diagnostics; boolean-only absence rationale. `series_group` was correctly left taxonomy-only because the canonical runbook's profile/safety-critical field list excludes it. Planned Claude re-review then failed before verdict on the account's monthly spend limit; the default direct fallback also failed because configured `gpt-5.6-sol` requires a newer CLI. One bounded read-only `gpt-5.4` fallback completed **GO** ([record](../../codex/intake-autonomy-v2.1-review/direct-codex-2026-07-10-r1-final.md), session `019f4d27-84f4-7e43-927c-c4e823e4e952`).

**Contract proven:** invalid evidence returns `reviewRequests:0`; only the validator assigns `world-absent`; confirmed safety/profile values require manufacturer evidence; app-cap is acceleration-only and must name the value + unpublished-source rationale in row notes; absence rationale is typed, canonical-source checked, and boolean-field-only. Engine, app, shipped data, web UI, iOS, and Android plan remain untouched.

### R0 — taxonomy config + NO-GO taint graph ✅ (2026-07-10; `cd0d97c` + `5a1f035` + `d22d84b` + `850a056` + `4b7044e`)

**TDD:** `node scripts/intake-park-taxonomy.test.js` first failed with `Cannot find module './intake-park-taxonomy.js'`; implementation then reached 6/6. The controller added adversarial mutation coverage before review so the graph validator itself was exercised, not only the committed happy-path config. Final suite: **11/11**, plus `node scripts/intake-park-taxonomy.js` → `[intake-park-taxonomy] ok=true`.

**Hostile review chain:** first parent-scope Claude review **NO-GO** — M1 found the runtime taint redirect could be deleted while all tests stayed green; M2/S1/S2 tightened unknown-reason closure, all automatic review classes, and required-edge removal. Accepted findings landed one-per-commit (`cd0d97c`, `5a1f035`, `d22d84b`, `850a056`). Re-review returned **GO-WITH-PATCHES** on a future-schema bypass: omitted/null `taintedAllowed` escaped both runtime redirect and static validation. RED reproduced (`future-auto-review` classified into itself), then `4b7044e` made runtime default-deny (`!== true`) and validation require an explicit boolean / flag all non-false automatic paths. Final re-review: **GO** ([transcript](../../codex/intake-autonomy-v2.1-review/bridge-2026-07-10-193144-014492.md)).

**Contract proven:** unknown reasons → `decision-required` / owner / no review; `review-no-go` + `review-no-go-unresolved` stay event-only; tainted candidates are runtime-redirected away from `availability-blocked`, `research-defect`, and `world-absent`; only `owner-instruction` and `rd3-external-evidence` are sanctioned tainted review-entry edges. No v2.1 sidecar writer exists yet; R1 may now open.

### B5 — latency + rollback drill + exit checklist 🟡 (2026-07-10; B5.0–B5.3 complete, **B5.4 deliberately NOT executed**)

**B5.0 snapshot:** `scripts/.intake-runner-state/pre-b5-latency-known-good.json` at `2026070401`. **Path deviation (necessary, not just safe):** the plan's literal `.printer-intake-out/` target is rmSync-wiped by the Scout test suite, which the B5.3 exit checklist itself runs — the drill's rollback target would have been destroyed mid-gate. Plan annotated.
**B5.1 deploy-latency (served-asset bumps only, payload byte-identical):** three `--bump-version` publishes `2026071001/02/03`, each pathspec-committed + pushed + measured: **push→live 55.5s / 30.3s / 60.4s** (drill re-measure: 50.4s). Budget `ceil(p95×3)` = 182s → config calibrated `retries:14 × 15s` (attempt 1 immediate ⇒ 13 intervals = 195s ≥ 182s; the first-cut 13×15 undershot at 180s — B5.5 review catch, fixed). `calibrated:true`.
**B5.2 self-run rollback drill (REAL, on production):** bad = `2026071003` → `--rollback-to <snapshot> --bad-version 2026071003` → live-verified **`2026071004` = max(bad, snapshot)+1** (the PD6 CRITICAL rule proven live, not just in unit tests), payload hash == snapshot at every step, verify OK in 50.4s, notify fired (local report; nothing shipped → no freeze; correct). Post-drill `verify-live-picker` GREEN on prod. iOS monotonicity held end-to-end (2026070401→…→04, payload identical throughout — zero user-visible exposure; independently re-verified by the B5.5 reviewer via live curl). **Known limitation (accepted):** the payload-identical drill proves the version chain live; payload-restore correctness rests on B1's byte-identical round-trip unit tests — the first real rollback closes that residual.
**B5.3 exit checklist:** component suites **82/82** + retrospective ALL PASS ✅ · B0 probe 4/4 under launchd ✅ · drill ✅ · preflight `ok=true` before AND AGAIN AFTER the drill (plan C1 no-dirt proof) ✅ · B4.6 dry-run ✅ · **webhook configured + test POST — ✗ NOT SATISFIABLE: the owner has not supplied the Discord webhook URL. This is the Codex SF-3 HARD enablement gate.**
**B5.4 EXECUTED 2026-07-10 12:01 CEST (owner supplied the webhook):** `discordWebhookUrl` added to gitignored `scripts/.printer-intake.local.json` (URL never logged); enablement test POST `posted=true frozen=false` (delivered to the private owner-only `#3dpa-intake-runs`); daily plist `launchctl bootstrap`ed (12:00, verified loaded). Local time was already past noon → first run **manually kickstarted** (same launchd path).

**FIRST LIVE RUN COMPLETE (2026-07-10T10:02:33Z–10:17:30Z, ~15 min): `shipped:0 parked:1 errored:0`.** K2 SE → **`auto-parked:review-no-go`** — the hostile reviewer NO-GO'd on two points: (1) `multi_color_systems:["cfs"]` — reviewer believed base K2 SE excludes CFS; (2) `max_speed:500` — reviewer flagged the value as low vs K-series siblings (all 600mm/s) and questioned marketing-vs-firmware provenance. **Controller assessment (recorded, not acted on): both concerns look like FALSE ALARMS against the manufacturer's own K2 SE page** (creality.com/products/k2-se: CFS explicitly supported ≤4 units/16 colors; ≤500mm/s explicitly listed as this specific — cheaper — model's own cap, not a shared-sibling figure) — cross-checked against the B4.6 dry-run's WebFetch research this same session. **Not overridden** — a NO-GO parks by design (PD5), and the whole point of the park lane is that this decision is the owner's, never silent. Ledger: `req:1783615951531:a03e6e7e` → `auto-parked:review-no-go`, `ledgeredAt:2026-07-10T10:16:47Z` (own commit `baa7831`). Branch `intake/k2_se` preserved (not merged) for inspection. Parked sidecar: `scripts/.intake-runner-state/parked/k2_se/parked.json`; the first-run v1 sidecar text recorded a weekly retry policy, but that policy was superseded the same day by the v1.1/v2.1 event-only NO-GO contract: `review-no-go` is never timer-retried or time-expired, and may re-enter review only through new external evidence accepted by `canRetryJudgment` or explicit owner instruction. **Live overlay unchanged** (`2026071004`, from the B5.2 drill); `data/printers.json` does NOT contain k2_se (verified). Tree clean post-run, preflight `ok=true` (confirmed same session). **Owner decision available, not required:** accept the park as-is, provide new external evidence for a supervised `judgment-on-evidence` re-entry, explicitly instruct a re-attempt, or leave it — none of these block the pipeline, which is fully live and will process the next real request the same way.

This row is now ✅ FINAL — B0 through B5.4 are all built, reviewed, and machine-verified; the daily 12:00 schedule is live going forward.
**B5.5 hostile review: GO-WITH-PATCHES ×5, all applied** — HIGH: this evidence row was missing (fixed by this row, committed before session end); MEDIUM: calibration off-by-one-interval (fixed retries 14 + corrected note); LOW ×3: drill-limitation note (above), drill report's fabricated identical timestamps (ad-hoc invocation artifact — **runner note: stamp `startedAt` at run entry**, the contract's timings requirement), plan snapshot-path annotation (done).

### B4 — contracts + PD7 + plist + K2 SE dry-run ✅ (2026-07-10; web `04477ad` `08561fd` `42cc19d` `78b118f` `d766f6d` + ai-om `f38d270` `58eadda`)

**Components:** runner contract v1 (`ai-operating-model/docs/agents/intake-pipeline-runner.md`) · Assistant autonomous-mode amendment · runbook v5 (autonomous mode + PD3/PD4 waivers as protocol law + PD7 marker-migration doc) · PD7 gather change (last-line-wins over the FULL ledger, `normalizeCandidateKey` exported; 7 new checks) · `intake-diff-guards.js` (scripted COMBOS-hunk + printers-splice guards, 10 tests) · hygiene shipped-key class · daily plist **12:00** + kickoff prompt + launchd README (**plist NOT loaded — loading is B5.4**).
**B4.6 dry-run (K2 SE, isolated no-merge) — ran end-to-end and caught a REAL defect:** re-staged the candidate from KV `req:1783615951531:a03e6e7e` (durable source; staging file was machine-local as plan M8 predicted) → researched real official specs (creality.com/products/k2-se: ≤300°C/≤100°C/500mm/s/20000mm/s², open-frame CoreXY, CFS, K Series sibling — PD2-class, no app-cap) → branch `intake/k2_se` → **a naive whole-file JSON reserialize of the hand-formatted `data/printers.json` produced a 1342-line diff for a 1-row add** → fixed as a string-level splice = **+21/-0** → all validators green (validate-data, picker GREEN, walkthrough combo 16 ✓ clean, matrix-audit no failures, `republish-overlay --add-printer k2_se` → `2026071001` + overlay validator ok) → hunk guard PASS → `bridge --health` ok (PD5 reachable) → would-merge diff printed (no-merge mode) → ledger line to a SCRATCHPAD copy (real ledger untouched; `auto-shipped` line verified non-clustering + normalized identity) → notify local-only (`posted=false frozen=false`, nothing shipped) → teardown: branch deleted, k2_se absent from printers.json/overlay/COMBOS, live overlay back at `2026070401`, runner watermark never created. **Bounded coverage note (no silent caps):** the dry-run exercised PD5 *reachability* (`bridge --health`), not full review turns — the full dual review runs for real on every live candidate; its mechanics were proven separately this session (4 hostile sub-agent gates) and via `bridge --mode codex-only` in the plan session.
**Hostile review: GO-WITH-PATCHES ×14, all applied** — HIGH-1: the splice hazard wasn't encoded in the contract → minimal-splice rule + the scripted `intake-diff-guards.js` (pinned `main...HEAD` base — an unpinned diff is vacuously empty post-commit, review #9); HIGH-2: parked-candidate retry was unreachable (parks listed terminal, no stage read `parked/`) → stage 2b retry sweep + closed terminal-outcome set with correction-keep values explicitly NON-terminal; HIGH-3: three unqualified manual new-brand gates in the Assistant contract would have parked every PD4 candidate → mode-qualified; MEDIUM ×5: ff-only main re-verify + bounded 2 re-entries (`auto-parked:main-moved`), literal NUL made gather binary-to-git → escape, retro-tag rules (fresh `runId` + full candidateKey) documented, shipped-key hygiene class (stops daily re-staging), guard base pinned + plan-mandated test shipped; LOW ×4 incl. launchd README w/ missed-run semantics (asleep fires on wake, powered-off SKIPS — daily-heartbeat ambiguity documented), require-path fix, watermark declared diagnostic-only.
**QA:** guards+hygiene 25/25 · retrospective ALL PASS · full web suite **118/118**. **Process note:** first B4 commit attempt swept pre-staged teardown files into the PD7 commit (index-wide `git commit` after `git add`); caught pre-push, history redone with pathspec commits — one concern per commit restored.

### B3 — preflight + lock/freeze + KV hygiene + notifier ✅ (2026-07-10, `b90dad0` + `221541a` + `19ee6cb` + `461daf8`)

**Components:** `intake-runner.config.json` (liveVerify 10×30 uncalibrated; maxCandidatesPerRun 3; **schedule `daily 12:00` — owner-set this session, supersedes the plan's proposed 07:45**) · `intake-kv-hygiene.js` (14 tests) · `intake-notify.js` (12 tests) · `intake-run-preflight.sh` + `intake-run-wrapper.sh` · gitignore (freeze/lock/watermark/state-dir).
**Hostile review: GO-WITH-PATCHES ×14, all applied** — HIGH-1: zsh signal trap without exit meant a TERM'd run stripped the lock yet KEPT RUNNING (empirically verified by reviewer) → signal traps now exit, EXIT trap releases; HIGH-2: the wrapper's failure report hardcoded `shipped:0`, so crash-after-ship + webhook-down bypassed the PD8 shipped-and-unreported freeze → `--shipped-unknown` fail-closed path (unknown ship state + unreported ⇒ freeze); HIGH-3: hygiene classified by `scoutOutcome` but PD7 corrections mutate `ownerResolution` — a `was-mis-declined` requester record would still be deleted → correction-keep set (`was-mis-declined`/`was-brand-typo`/`was-suffix-variant` protect; `was-noise`/`was-duplicate-missed` deliberately confirm deletability); MEDIUM ×4: contact window base = max(key ts, `ledgeredAt`) (B4 write-side must emit `ledgeredAt`), digest cursor advances only on a DELIVERED digest, atomic noclobber lock acquire, skip-path recording (`last-skip.log`; **intended deviation: freeze/lock skips do NOT notify daily — the freeze creation already notified CRITICAL; ledgered here**); LOW ×7 incl. probe-key TTL, ship-vocab pinned (`shipped`/`auto-shipped`, no regex), allowed_mentions none, surrogate-safe truncation, **accepted decision: `last-run-session.log` + 300-char failure tails may carry requester-derived text — webhook channel stays owner-only, never widen the audience**, ambient-auth rule for hygiene `--apply` (**B4 contract items: emit `ledgeredAt`; hygiene runs ambient-auth; plist encodes 12:00**).
**QA:** 26/26 component tests; real preflight fail-closed on dirty tree + `ahead=11` (both correct), then **`PREFLIGHT ok=true` post-push on the real mini**; hygiene live dry-run `deletes=0 kept=3` (2 incomplete + staged K2 SE — exactly the plan's expectation; K2 SE KV key confirmed alive).

### B2 — live verification probes ✅ (2026-07-10, `cc9ba95` + `d1f84cd` + `bcdf510`)

**Refactor first (`cc9ba95`):** `scripts/lib/engine-bootstrap.js` extracted from `picker-dry-run.js` (loader + init-chatter capture + picker assertions); behavior-preserving proven **byte-for-byte** (picker-dry-run.test.js 7/7, output diff empty vs pre-refactor baseline).
**`verify-live-overlay.js` (`d1f84cd`):** FULL-envelope compare incl. `enabled` + `min_app_version` + hash **recomputed from the fetched body** (Codex MF-1 pinned by test: live `enabled:false` with matching version+hash FAILS ship-path verify); `--expect-disabled` PD8 mode; `--measure` machine line `MEASURE elapsed_seconds=… attempts=… version=…` (**runner contract note: grep for `MEASURE `, the CLI prefixes lines**); retries default 10×30s until B5 calibrates config (**`--retries N` = N TOTAL attempts**).
**`verify-live-picker.js` (`bcdf510`):** downloads live engine.js + all 9 init files into a temp root → shared bootstrap → same assertions as the local dry-run against PRODUCTION data. Exit contract both scripts: 0 ok / 2 mismatch / 3 fetch-or-init / 1 usage.
**Hostile review: GO-WITH-PATCHES ×9, all applied** — HIGH: garbage-200 engine.js crashed into exit 1 (usage collision) + leaked temp root → try/catch → exit 3 + IIFE .catch (empirically re-tested via HTML-200 fixture); HIGH: last-attempt-wins classification let a trailing network blip mask a REAL mismatch as exit 3 (runner would skip rollback) → deterministic any-observed-mismatch-wins + interleave test; MEDIUM ×3: committed-file self-consistency assert (hand-edited payload could false-PASS vs a stale live server), REQUIRED_FILES set-equality both directions (stale extra entry = false rollback), overlay test suite synthesized fixture (was built from the real catalog file — would red-out during a genuine PD8 emergency); LOW ×3 + OBSERVATION (MEASURE-prefix note above).
**QA:** 25/25 probe tests; real read-only prod runs green (overlay `OK attempts=1 elapsed=0.138s`; picker `GREEN sparkx_i7 under creality / i Series` on live data); full web suite 82/82.

### B1 — republish-overlay.js ✅ (2026-07-10, `c3abe4e`)

**TDD:** RED (module absent) → GREEN 17/17 → post-review 21/21. PD6 same-day rollback rule pinned twice (unit: bad `2026071002` + snapshot `2026071001` → `2026071003`; integration: rollbackTo above bad). Counter-99/2099 cap → exit **2** + `CRITICAL` (runner freeze-maps exit 2; ordinary failures exit 1 — both pinned).
**Hostile review: GO-WITH-PATCHES ×8, all applied** — HIGH: garbage `--bad-version` → `NaN || 0` silently zeroed the PD6 floor (rollback would republish AT the bad version, exit 0) → integer-validated at parse + `assertPublishable` NaN guard + CLI test; MEDIUM ×3: exit-code contract untested (now pinned 2-vs-1), crash-orphaned `.republish-tmp` would deadlock the B3 preflight (stale-cleanup + gitignore `catalog/*.republish-tmp`), no-op path silently discarded `--min-app-version`/`--add-brand` (now throws); LOW ×3: snapshot-file sanity check, machine-readable `changed=… version=…` stdout token, byte-diff test (bump changes only content_version+generated_at lines). One test flake fixed (same-millisecond `generated_at` collision).
**QA:** suite 21/21; full web suite 53 files pass/0 fail; live-overlay read-only sanity (`--snapshot` + idempotent no-op on `aries`, `git status` catalog clean).
**Discovered hazard (B3/B4 design input):** `printer-intake-scout.test.js:259,289` `rmSync`-recursive-deletes the REAL `scripts/.printer-intake-out/` — the standard QA command wipes anything stored there (it deleted the B0 probe logs mid-session; ledger had preserved the evidence verbatim). **Deviation adopted:** runner durable state (parked/, last-run-report.md) moves to a new gitignored `scripts/.intake-runner-state/`; `.printer-intake-out/` stays Scout-scratch only (re-derivable from KV). Plan's paths for these two artifacts are superseded accordingly.

### B0 — launchd environment probe ✅ (2026-07-10)

**Artifacts:** `scripts/intake-launchd-probe.sh` + `scripts/launchd/dk.mragile.3dpa-intake-probe.plist` (kickstart-only, `RunAtLoad false`). Probe logs live in the gitignored staging dir — evidence quoted verbatim here per plan B0.5.

**Run 1 (07:34Z, launchd `ppid=1`) — 2/4 PASS, failure branch (B0.4):**
```
FAIL claude-headless rc=1 output=Failed to authenticate. API Error: 401 Invalid authentication credentials
PASS wrangler-whoami (rc=0, account id present)
PASS bridge-health (rc=0)
error: src refspec 091d4b6cec63e750e277f2cef6d631901456a857efs/heads/intake-probe-scratch does not match any
FAIL git-push-probe push-failed
```
- **claude-headless 401 classified NOT structural:** reproduced in a scrubbed *terminal* env (`env -i`), so not a launchd/keychain-session problem — the standalone CLI's macOS keychain credential is stale (post-2026-06-17 token rotation). Remedy: source `~/.config/claude-code/oauth.env` (the `claude setup-token` artifact bridge already reads; verified valid → `PROBE_OK`). The env-token path is now the runner's canonical headless auth. **Owner note: the keychain entry itself stays stale until an interactive `claude /login`; oauth.env expiry is the real dependency (setup-token issued 2026-06-17).**
- **git-push-probe:** zsh `:r` modifier mangled the bare `$sha:refs/...` refspec → `${sha}` braced. Real bug, real catch.

**Run 2 (07:37Z, `ppid=1`) — 4/4 PASS** with remedies applied.

**Hostile review: GO-WITH-PATCHES ×8** (HIGH: this ledger was missing the failure-branch rows — fixed by this entry; MEDIUM: contradictory FAIL-then-PASS log when oauth.env missing → now counts as the probe's FAIL and skips the claude call; MEDIUM: non-idempotent scratch push after a failed delete → forced `+${sha}:` refspec; MEDIUM: plist Std\*Path pointed into the gitignored dir launchd can't create → moved to `~/Library/Logs/`; LOW ×3: token subshell-scoped away from probes 2–4, newline-flattened log snips, setup failure exits 78 EX_CONFIG; OBSERVATION → **B4 checklist item: `intake-run-wrapper.sh` must pin the same PATH + source the same oauth.env as the probe, or probe and runner envs drift**).

**Run 3 (07:43Z, `ppid=1`, patched script + plist) — 4/4 PASS:**
```
PASS claude-headless (rc=0, output contained PROBE_OK)
PASS wrangler-whoami (rc=0, account id present)
PASS bridge-health (rc=0)
PASS git-push-probe (scratch ref pushed + deleted)
=== probe done: 4/4 PASS
```

**Rollback:** `launchctl bootout gui/$UID/dk.mragile.3dpa-intake-probe` + `rm ~/Library/LaunchAgents/dk.mragile.3dpa-intake-probe.plist` (already booted out post-QA; plist copy left in `~/Library/LaunchAgents/` removed at bootout — re-run = `mkdir -p scripts/.printer-intake-out` → cp → bootstrap → kickstart).
