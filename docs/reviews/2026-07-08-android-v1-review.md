# 2026-07-08 — Android v1 bundle: design-gate + plan-gate review dispositions

Two hostile fresh-context sub-agent reviews (design gate on audit-delta + spec + macOS companion; plan gate on the master plan), run in parallel per the Full-lane both-gates rule. Both returned **GO-WITH-PATCHES**. All patches applied same-session to the bundle before the Codex cross-model round (addendum below).

## Design gate (audit-delta + spec + macOS companion)

Reviewer ground-truthed every load-bearing claim against real code: byte sizes exact, state-codec exports exact, prototype description exact, EVENT_KEYS bug confirmed, quickjs-wrapper + androidx.javascriptengine facts verified true, macOS doc confirmed light/non-blocking, AD0 counter-case confirmed fairly stated.

| # | Sev | Finding | Disposition |
|---|---|---|---|
| D-1 | HIGH | **AD9's "platform:'android' works with zero Worker change — verified" false at the auth layer:** `analytics.js` HMAC-checks only `X-App-Source: ios`; every other non-browser request 403s on `isAllowedOrigin` — a native Android client is `forbidden_origin` before its HMAC is read. The delta verified one layer (payload validator) and asserted the whole Worker — the exact D5a-class error the bundle itself cites. | **APPLIED** (controller re-verified the 403 path first) — delta §2.6 rewritten; AD9 now schedules TWO pre-AG3 web commits (auth-branch extension + EVENT_KEYS fix); plan protocol step 11 updated |
| D-2 | MEDIUM | Delta §2.7 misdescribed the feedback failure mode: a native Android client is 403'd outright (never reaches Discord) — the "recorded as web" binarization is real but unreachable; the fix is an auth-branch change, not labeling. | **APPLIED** — §2.7 rewritten; AD9 feedback bullet scoped as auth-branch + rendering |
| D-3 | MEDIUM | Spec §4 omitted release-gate owner actions its own evidence base names (manual first upload, data-safety form, listing assets + privacy policy URL, production-access application) while claiming "everything else runs autonomously". | **APPLIED** — §4 rows 9–12 added |
| D-4 | LOW | AD3's minSdk-29 justification cited Javet's floor — a fallback not in the recorded chain. | **APPLIED** — Javet clause dropped; spike-verifies-real-floor kept |
| D-5 | LOW | "Healthy `quickjs-ng` upstream" (half the bus-factor mitigation) unverified — wrapper may embed Bellard quickjs. | **APPLIED** — "which QuickJS does the wrapper embed" added to the AG1 spike checklist (spec AD5 + delta §3) |
| D-6 | LOW | "4 unpushed commits on the other Mac" was an inference presented as fact (source line of unknown vintage; may predate origin's current state), plus a leftover thinking-aloud aside in a finalized doc. | **APPLIED** — marked `UNVERIFIED:` per the resume-surface truth-gate; aside deleted; Gate-0 Q5 resolves it either way |
| D-7 | LOW | "iOS fixtures reusable as-is" overstated — the bytes are verbatim web output but live as an inline Swift string; freshness at the W3 merge window not guaranteed. | **APPLIED** — delta §2.3 + spec AD5a reworded: reusable in content; AG4 entry regenerates fresh web fixtures |

## Plan gate (master plan)

Reviewer verified: all five named web harness commands exist (incl. `engine-golden-snapshot.js --check`), prototype artifacts exist, both Worker bugs real, and the iOS-review adaptation carried perf-baseline/harness-ownership/adjective-free-exits/string-rule/drift-sweep/ledger-at-gate-0/machine-prereqs correctly.

| # | Sev | Finding | Disposition |
|---|---|---|---|
| P-1 | HIGH | **Play-calendar parallelism unreachable as written:** the 14-day clock needs a closed track, which needs everything AG7 builds (listing, rating, data safety, keystore, first manual upload) — "recruit early at AG4" couldn't start any clock, and with AG7 after AG6 there is no AG5/AG6 work left to parallelize. | **APPLIED** — sequencing exception (b) rewritten as the owner-triggered **AG7a split** with the full non-skippable precondition list; default = post-AG7 window is honest dead time; spec AD10 track-ramp aligned |
| P-2 | HIGH | **Spec AD8's day-one overlay CONSUMER assigned to no gate** (AG7's overlay work was web-publisher-only; the app-side fetch/sha256/min_app_version/merge feature — with real iOS failure history — was unscheduled). | **APPLIED** — AG4 scope + gate map row (fixture-tested locally; live end-to-end check at AG7 against the published empty-delta artifact) |
| P-3 | MEDIUM | AG0 ledger chicken-and-egg reintroduced (owner replies "GO" in chat; no session owns creating the ledger AG1 must read). | **APPLIED** — ledger created THIS session with a PENDING-GO row; AG0 text updated (first session seeing GO flips the row) |
| P-4 | MEDIUM | QuickJS-fallback adoption treated as a ledger note though it breaks AD4's load-bearing bridge shape (sync calls, sync polyfills, init budget). | **APPLIED** — AG1 spike + risk register: fallback = spec amendment + hostile re-review + envelope +1–2 sessions |
| P-5 | MEDIUM | Node.js missing from machine prereqs though protocol step 4 runs five Node commands every gate; Node on the mac-mini never verified. | **APPLIED** — step 2 checks `node --version` + web repo present (flagged as unverified-until-AG1) |
| P-6 | MEDIUM | The 14-day window unowned (assistant can't see Play Console; no owner touchpoints; engagement failure discovered day 14). | **APPLIED** — AG7 exit: owner Console checks ~day 5 + ~day 10, assistant-drafted nudges, window-session work defined |
| P-7 | MEDIUM | AG3/AG4 underweighted (AG4 packed six deliverables into 1–2 sessions); ledger would read chronic slippage. | **APPLIED** — AG3→2, AG4→2–3 with a recorded split option; envelope note gains the gate-sum (11–15) |
| P-8 | MEDIUM | Standing-rule conflict open for the whole program: top-level CLAUDE.md still says `3dpa-android` is parked/no-push while the plan pushes at every gate exit. | **APPLIED** — AG0 gains a protocol-row commit (CLAUDE.md + byte-identical AGENTS.md) upon recorded GO |
| P-9 | LOW | Web prerequisites lacked a deployed-verification (committed ≠ deployed; instrumented tests never hit prod). | **APPLIED** — AG3/AG4 entry curl-probes the LIVE Workers; protocol step 11 generalized |
| P-10 | LOW | Play In-App Review functionally unverifiable at AG6 (API no-ops on non-Play installs). | **APPLIED** — semantics at AG6, functional verification at AG7 internal smoke |
| P-11 | LOW | CI-flakiness fallback trigger was vibes. | **APPLIED** — numeric trigger (≥3 infra failures across 2 consecutive gates), executor decides, ledger-records |
| P-12 | LOW | iOS test-evolution rule dropped without a greenfield analog — the fixture floor had no anti-weakening protection. | **APPLIED** — protocol step 7a fixture-evolution rule |
| P-13 | LOW | Plan header cited this dispositions file before it existed. | **APPLIED** — this file created same session, before any commit |
| P-14 | LOW | Stale iOS wording "`state-codec.js` (once mirrored)" — all mirrors land at AG1 on greenfield. | **APPLIED** — reworded |

## Residual risk (post-patch, honest)

- The QuickJS wrapper is verified-by-research only; the AG1-entry spike is the deliberate resolution point (incl. the embedded-engine question). Fallback cost is now priced, not hidden.
- Play policy facts are current as of 2026-07; AG7 entry re-verifies (policies move).
- The mac-mini's Node presence and the prototype repo's true remote state are unverifiable from this machine — both are AG0/AG1-entry checks by design.
- Codex cross-model round on the patched artifacts: see addendum below.

## Addendum — Codex cross-model round (bridge codex-only, 2026-07-09)

Packet: `codex/android-v1-review/bridge-2026-07-09-001143-419640.md` (`bridge --health` ok → `bridge --mode codex-only`, 234 s). Verdict: **GO-WITH-PATCHES** — 2 HIGH + 2 MEDIUM + 1 LOW, **none overlapping either sub-agent** (the non-overlap pattern holds a second time). Codex additionally re-ran the five web contract commands (all pass) and the overlay validator (fails — that failure IS finding CX-2). All patches applied same-session; both HIGHs controller-verified before patching (validator run + `BLOB_FIELDS` read).

| # | Sev | Finding | Disposition |
|---|---|---|---|
| CX-1 | HIGH | The `EVENT_KEYS` fix was underspecified: `troubleshoot_used {symptom}` / `export_clicked {type,…}` have no `BLOB_FIELDS`/query columns — a minimal allowlist patch passes a bare curl while silently dropping the dimensions (fake parity). | **APPLIED** (verified: no `symptom`/`type` in BLOB_FIELDS) — AD9 + AG3 now require the full schema patch (allowed keys + blob/query mapping + real-payload tests) and event-specific live probes |
| CX-2 | HIGH | "The validator already models everything hard" sat on RED infrastructure: `validate-ios-printer-overlay.js` currently fails — it requires a bundled-catalog baseline for live iOS `MARKETING_VERSION` 1.0.7 and baselines stop at 1.0.5. AG7 would strand on stale sibling infra. | **APPLIED** (verified by running it) — AG7 precondition: green the iOS validator (1.0.7 baseline) or decouple the Android validator path; delta §2.5 + spec AD8 corrected |
| CX-3 | MEDIUM | "API 36 required from 2026-08-31" presented as verified; the official Play page currently says API 35 — the bump is expected, not yet official. | **APPLIED** — delta §4.4 + spec AD3 downgraded to likely; decision unchanged (target 36 proactively); re-verify at AG7 |
| CX-4 | MEDIUM | AG1-vs-AG4 store sequencing ambiguous (fixtures "before any UI gate" vs AD5a re-verify at AG4 — where does the Kotlin store land?). | **APPLIED** — AG1 = contract layer only (emitter + op-log APIs + adapter, fixture level); AG4 = UI + import/export + fresh re-verify |
| CX-5 | LOW | AG3/AG4 said probes run "before exit," contradicting protocol step 11's entry-check framing. | **APPLIED** — "at gate entry, before any Android code depending on the Worker" |

**Review-pattern note:** 3-for-3 again with non-overlapping real catches (design D-1 auth-layer 403, plan P-1/P-2 sequencing + unscheduled feature, Codex CX-2 run-the-tool infrastructure rot being the standouts). Verdict chain: GO-WITH-PATCHES ×3, all patches applied; the bundle is ready for owner Gate 0 (AG0).
