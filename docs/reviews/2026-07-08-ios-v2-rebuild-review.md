# 2026-07-08 — iOS v2 rebuild: design-gate + plan-gate review dispositions

Two hostile fresh-context sub-agent reviews (design gate on the spec, plan gate on the master plan), run in parallel per the Full-lane both-gates rule. Both returned **GO-WITH-PATCHES**. All blocking patches applied same-session to spec/plan/audit before the Codex cross-model round. Convergent findings (both reviewers independently) marked ★.

## Design gate (spec)

| # | Sev | Finding | Disposition |
|---|---|---|---|
| C-1 | CRITICAL | No v1→v2 on-disk data-migration invariant (app-state.json, workshop file w/ tuning+journal, UserDefaults keys) — silent loss of a user's accepted tuning on update was unguarded | **APPLIED** — spec §3 invariant 1 (frozen paths/formats/keys) + G1 upgrade fixture test + G8 on-device update-in-place check; AppStatePersistence added to D4 carried list |
| H-2 ★ | HIGH | D5 unspecified at the store joint: `createWorkshopTuning` needs write-side store APIs Swift `WorkshopStore` lacks; JSContext localStorage is in-memory only | **APPLIED** — D5a: default (a) JSCore `workshop-store.js` w/ persistent-storage polyfill; mandatory G4-entry spike; fallback (c) Swift write-APIs fixture-pinned; option (b) JSExport rejected (reentrancy) |
| H-3 | HIGH | `workshop-tuning-rules.js` self-declares TRANSITIONAL (W3-T7 migration trigger = exactly this train); pinning it byte-identical risks churn | **APPLIED** — D5b: freeze migration until post-v2 (default), owner may order web migration pre-G5 at Gate 0; deferral of the recorded W3-T7 trigger made explicit |
| H-4 ★ | HIGH | Drift protocol covered iOS hotfixes only, not web-master engine/data movement during an 8–15-session window | **APPLIED** — D2 dual drift protocol + plan protocol step 3a (per-gate byte-diff vs web main, mirror-sync-first, ledger SHA) |
| H-5 | HIGH | Audit premise wrong: iOS has NO URL codec (not "decode-side exists"); share needs the short-key table + mine→safe rule (known web bug locus); inbound deep links need web-side AASA | **APPLIED** — audit corrected; D5c: share via `state-codec.js` in JSCore, outbound-only in 2.0.0; inbound deep links → non-goals |
| M-6 | MEDIUM | Missing decisions: min iOS version, Sentry carry, AppStatePersistence carry, G8 merge mechanics, ledger/log home | **APPLIED** — iOS 17.0 in D1; Sentry + AppStatePersistence in D4; true-merge-no-squash + branch-dispatch sequence in G8; spec §6 artifact homes |
| M-7 ★ | MEDIUM | Branch backup push default should be ON (two-machine owner; push gate governs main only; pushed-branch precedent exists) | **APPLIED** — D1a: push at every gate exit, owner may override at G0 |
| M-8 | MEDIUM | G3 underweighted; profile comparison = lowest value / highest design uncertainty; share belongs with the codec work | **APPLIED** — comparison cut from v2.0.0 (non-goal, post-v2 candidate); share moved to G5; envelope widened to 10–15 sessions |
| M-9 | MEDIUM | "Assertions unchanged" understates @MainActor blast radius (53/54 EngineServiceTests async; bridge documents non-MainActor assumption) | **APPLIED** — D4 blast-radius note; §3 reworded (assertions preserved, isolation adaptations enumerated); G1 budgeted 2 sessions |
| L-10 ★ | LOW | D5 fallback said "at G4" while plan put tuning at G5 | **APPLIED** — spike is G4-entry (journal writes need the store too); references aligned |
| L-11 | LOW | `compareLockBtn` line-number nit | **APPLIED** — audit corrected |

## Plan gate (master plan)

| # | Sev | Finding | Disposition |
|---|---|---|---|
| H-1 ★ | HIGH | No protocol for web engine/data evolving mid-rebuild; gate-exit byte-diff fails by design with no guidance | **APPLIED** — protocol step 3a (see design H-4) |
| H-2 ★ | HIGH | Local-only branch = cross-machine execution blocker (iOS repo excluded from push-children; second machine finds nothing), not just data loss; machine prereqs unlisted | **APPLIED** — D1a default flip + protocol step 2 machine-prereq check |
| H-3 ★ | HIGH | G5 one-liner hid the store-topology decision (workshop-tuning.js is not self-contained like engine.js) | **APPLIED** — D5a + G4-entry spike (see design H-2) |
| H-4 | HIGH | Hotfix cherry-pick dies post-restructure; no detection mechanism; G8 merged before acceptance (revert-of-largest-merge recovery) | **APPLIED** — ledger last-synced-main-SHA + `git log` detection + diff-driven re-apply (step 3b); G8 resequenced: TestFlight from `--ref ios-v2` + owner acceptance BEFORE the merge |
| M-1 | MEDIUM | G0/G1 ledger chicken-and-egg | **APPLIED** — ledger created at G0 |
| M-2 | MEDIUM | `troubleshoot_used` assigned to G3 but the surface is G4 | **APPLIED** — moved to G4 |
| M-3 | MEDIUM | G6-early reordering silently regresses DA coverage | **APPLIED** — protocol step 8 string rule; reordering allowed only with it |
| M-4 | MEDIUM | G7 references a perf baseline G1 never captures | **APPLIED** — G1 captures + commits `perf-baseline.md` |
| M-5 | MEDIUM | project.yml hardcoded paths break on restructure; no xcodegen step | **APPLIED** — G1 bullet |
| M-6 | MEDIUM | ScreenCaptureUITests maintenance unowned though three exits depend on it | **APPLIED** — protocol step 10 (each UI gate maintains it) |
| M-7 | MEDIUM | No rule governing migrated-test evolution after G1 | **APPLIED** — protocol step 7 (equivalent-or-stronger, ledger-enumerated) |
| M-8 | MEDIUM | G7 exits on adjectives; baseline xcodebuild invocation unspecified | **APPLIED** — committed checklist artifact required; invocation in protocol step 4 (sim pinned at G1) |
| L-1..L-4 | LOW | try! is documented-safe (wording) · IMPL-040 rule names the test file · ledger repo ambiguity · "135" literal goes stale | **APPLIED** — wording fixes; doc-sync in G1; "web repo" clause; "suite count at fork (≥135)" |
| L-5 | LOW | 8–12 sessions bottom-heavy; 10–15 honest | **APPLIED** — envelope widened, ledger tracks slip |

## Residual risk (post-patch, honest)

- D5a's default (a) rests on an unverified premise (web store persisted-bytes ↔ v1 on-disk envelope compatibility) — deliberately resolved by the mandatory G4-entry spike rather than asserted now.
- Estimates remain estimates; the ledger is the slip instrument.
- Codex cross-model round on the patched artifacts: see addendum below.

## Addendum — Codex cross-model round (bridge codex-only, 2026-07-08)

Packet: `codex/ios-v2-rebuild-review/bridge-2026-07-08-232153-554173.md`. Verdict: **GO-WITH-PATCHES** — 3 HIGH + 2 MEDIUM + 1 LOW, all missed by both sub-agent reviewers, all applied same-session:

| # | Sev | Finding | Disposition |
|---|---|---|---|
| CX-H1 | HIGH | Per-gate web drift byte-diff would falsely flag `printers.json` (differs by design: iOS baseline + overlay) | **APPLIED** — protocol 3a excludes printers.json; overlay carries new printers during the rebuild; bundle graduation + overlay republish evaluated once at G8 entry |
| CX-H2 | HIGH | D5a default (a) contradicted by actual bytes: web store persists COMPACT JSON (`workshop-store.js:54`), iOS disk file is PRETTY + frozen invariant | **APPLIED** — D5a default flipped to (c) Swift write-side op-log APIs + thin adapter into `createWorkshopTuning` (harvest logic stays byte-identical JS); (a) demoted to spike-conditional alternative w/ rendering adapter |
| CX-H3 | HIGH | Cold executors routed through stale `3dpa-context.md` (`room_temp` env, safe/tuned-only profileMode, "64 unit tests") | **APPLIED** — 3dpa-context fixed THIS session (env ids, mine tier paragraph, test-count line); plan G1 doc-sync narrowed to what remains |
| CX-M1 | MEDIUM | Mirrored app-layer JS modules have no resource home/loader until G4/G5 | **APPLIED** — G1 bullet: mirrored-JS home + project.yml entries + byte-diff tests + JSContext smoke loader |
| CX-M2 | MEDIUM | Baselines omit the non-engine contract harnesses | **APPLIED** — protocol step 4 now names the four Node test commands |
| CX-L1 | LOW | Planning bundle untracked, conflicting with "pushed = cross-machine visible" | **APPLIED** — committed + pushed at this session's wrap-up |

**Review-pattern note:** the reviewer-catches-something-real pattern held again — 2 sub-agents + Codex each surfaced non-overlapping real findings (design C-1, plan H-4, Codex CX-H2 being the standouts). Verdict chain: GO-WITH-PATCHES ×3, all patches applied; the bundle is ready for owner Gate 0.
