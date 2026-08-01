# 2026-08-01 — Cowork (appdev): Feedback Diagnostics v2 — web review-fix pass + iOS Task 8

**Branches:** web `codex/feedback-diagnostics-v2` @ `fda09aa` (pushed) · iOS `codex/feedback-diagnostics-v2-ios` @ `acfd8fb` (local only, push gate active)

## Durable context

- **The plan's Task 9 Step 2 hardcodes mac-mini paths** (`/Users/mustafaozturk-macmini/...`). This session ran on the **iMac** (`iMac-tilhrende-Mustafa.local`, `$HOME=/Users/mragile.io`), which does have a working iOS toolchain (Xcode 26.3, xcodegen 2.45.3, iPhone 17 Pro sim). The memory note that the *Air* has an intermittent toolchain does not generalise to the iMac. Any future run should resolve those paths from the actual repo location, not the literal plan text.
- **A fresh iOS worktree cannot build until `Config.xcconfig` is copied in.** It is gitignored local-secrets, so `git worktree add` produces a tree that fails immediately with *"Unable to open base configuration reference file"*. This looks like a broken baseline and is not. Copy it from the main checkout; never read or rewrite it.
- **XcodeGen names the project's root group after the containing directory**, so generating inside `.worktrees/<name>` renames the group in `project.pbxproj`. That is a worktree artifact that would be wrong once merged to `main`. It must be reverted before committing, leaving only the genuine new-file references.
- **`bridge --mode claude-only` is the *wrong* mode when the controller is Claude.** The plan text says `claude-only` because it was written for a Codex controller. Bridge's own help is explicit: `codex-only` is the cross-model mode "when you are driving from Claude". Read the controller identity, not the plan literal.
- **Web has no remote printer-catalog overlay.** The overlay (`catalog/ios-printer-overlay-v1.json`) is consumed only by the iOS `PrinterCatalogProvider`. So the honest web value for `catalog.overlaySource` is `"bundled"` with no `contentVersion` — inventing one would be a lie in the diagnostic record.
- **The `ScreenCaptureUITests` 4/6 failure is pre-existing on this machine**, reproduced on pristine `main` @ `2be10a4`. The ROADMAP records "6/6 UI clean-container" for 1.1.3, which was a clean-container run on the mac-mini — the discrepancy is environment, not regression, but it means the UI suite is not currently a usable gate here.

## What happened / Actions

**Cold start.** Sync health reported `3dprintassistant: behind:71`, `3dprintassistant-ios: behind:38`, `bridge: behind:3` — a hard halt per Trigger C step 1.5. Fetched and fast-forwarded all three before reading any local state. Verified against live GitHub that the web feature branch tip **was exactly** the stated gate `bd171e8`, and iOS `origin/main` **was exactly** `2be10a4`. The feature docs exist only on the feature branch, so the branch was checked out to read them.

**Web review-fix pass — six findings, six commits, TDD throughout.**

| Commit | Finding | Substance |
|---|---|---|
| `3219e27` | P2 #3 | `diagnostic_completeness` was computed then discarded. Added the column with a closed CHECK domain, emitted for v2, plumbed through the stored row. NOT NULL so a forgetful caller fails closed. |
| `1910d63` | P2 #4 | A "different" printer preference was reported as `kind:"supported"` with no `printerId`. Now `unknown`/`different`. Also closed the matching server gap — `physicalPrinter.kind`/`.match` had **no** closed vocabulary at all, so a forged payload could assert any classification. |
| `193057c` | P2 #5 | `engineInitialized` was hard-coded `true`, so a report filed after a failed `Engine.init()` claimed a healthy engine — exactly the case worth triaging. Now tracks the real outcome. Catalog provenance comes from a new manifest `catalogRevision` (a fingerprint over `data/*.json` only, so it does not churn on unrelated assets). |
| `e44f17e` | P2 #6 | The bug-reports-only diagnostics rule lived solely in the client. Now rejected at the boundary, matching the unknown-key fail-closed posture. |
| `ad1e49a` | P2 #7 | The literal 120-vs-80 mismatch was already closed structurally by `1dab6d0`; the real gap was that nothing tested the two contracts against each other. Writing that test surfaced a live instance of the same family — unrounded `ageMs` fails the whole report on any non-integer clock. |
| `90816ef` | Confirmation should-fix | `captureReason`/`entryPoint` were free text client-side. Not merely latent: the `snapshot()` default `entryPoint` was `"feedback"`, which is **not** in `FEEDBACK_ENTRY_POINTS` — any call omitting the argument already produced a payload the Worker rejects. |

**iOS Task 8** (`acfd8fb`) — Swift mirror of the wire contract with closed enums as the allowlist, a main-actor RAM-only 25-entry recorder with frozen-failure capture, `FeedbackReceipt` return, and end-to-end removal of the direct Discord fallback (service, `AppConstants`, Info.plist, xcconfig template). Privacy: `deviceClass` replaces the exact hardware model the legacy footer sent; no persistent identifier; custom printer text confined to the encrypted block.

**Task 9 verification.** Full web battery green; iOS 211/211 unit; all 8 shared files byte-identical. Two proofs beyond the plan: the shipping web form's own submission replayed through the real validator for every v2 category, and **real Swift-`JSONEncoder` output exported from an XCTest and validated by the actual Worker validator** — all accepted, correct completeness/breadcrumbs/channel, no user text in plaintext. The web replay is what caught `fda09aa`.

**Self-caught defect** (`fda09aa`): non-bug reports were labelled `completeness=complete` while deliberately carrying nothing, and the `minimal` value added in `3219e27` could never occur. Found by verification, not by review.

## Blocker — cross-model review NOT obtained (fail-closed)

`bridge --health` passed. Both `bridge --mode codex-only` and a direct `codex exec -s read-only` probe returned:

> `ERROR: You've hit your usage limit. ... try again at Aug 7th, 2026 12:35 PM.`

Codex is exhausted **account-wide until 2026-08-07**. Per the plan's own rule ("a timeout, empty artifact or auth failure is invalid evidence and blocks release progression") this is an **unmet gate**, not something to work around.

A supplementary *same-model* review (`bridge --mode claude-only`) was attempted as a partial substitute and **also produced nothing** — the nested Claude turn stalled, exceeded its own 900s bound by ~10 minutes, and was terminated with an empty artifact. That is the known nested-interactive stall (memory `reference_bridge_nested_session_auth_401`; same failure shape as the 2026-07-19 ROADMAP entry).

**Net: no independent review evidence at all this session, from either model.** The verification in this log is mechanical and author-produced — real, but not review.

**O0 therefore has two prerequisites now:** the owner authorisations in plan Task 10 Step 1, **and** a valid cross-model review once Codex capacity returns.

## Files touched

Web (7 commits): `functions/api/_lib/feedback-contract.js` + test, `functions/api/_lib/feedback-store.js`, `functions/api/feedback.js`, `functions/api/feedback/{persistence,admin,retention}.test.mjs`, `feedback-migrations/0001_feedback_reports.sql`, `feedback-diagnostics.js`, `app.js`, `scripts/gen-release-manifest.mjs` + test, `scripts/feedback-diagnostics.test.mjs`, `release-manifest.js`.
iOS (1 commit): new `Models/FeedbackDiagnostics.swift`, `Services/FeedbackDiagnosticRecorder.swift`, `3DPrintAssistantTests/FeedbackDiagnosticRecorderTests.swift`; modified `FeedbackService.swift`, `AppConstants.swift`, `Strings.swift`, `FeedbackView.swift`, `FeedbackViewModel.swift`, `OutputView.swift`, `ContentView.swift`, `Info.plist`, `Config.xcconfig.template`, `FeedbackTests.swift`, `docs/app-store-privacy-labels.md`, `project.pbxproj`.
Docs: `docs/reviews/2026-07-31-feedback-diagnostics-v2-implementation-review.md`, this log, ROADMAP, INDEX, NEXT-SESSION.

## Open questions / Follow-up

- **Cross-model review outstanding** — rerun `bridge --mode codex-only --turn-timeout-seconds 900` from `Projects/` on or after 2026-08-07, or nominate another independent reviewer. Blocks O0.
- **`ScreenCaptureUITests` 4/6 failing on the iMac at pristine `2be10a4`.** Not caused by this work. Worth a separate look at whether it is simulator state or real drift since the mac-mini 1.1.3 run — until then the UI suite is not a trustworthy gate on this machine.
- **Md-hygiene:** protocol files byte-identical; no secrets in either tree; 19 session logs contain `</content>` but **none as a bare trailing tag** (all prose mentions) so no action per the checklist; the new review doc was untracked and is now committed.
- **verify-before-mutate:** 9 flags — 5 credited `resolved_same_turn`, 4 recorded `unresolved_by_session_end`. All four of those were in fact verified inline in the same turn with stated evidence (Info.plist via `sed` + `plutil -lint` + grep; privacy-labels via heading grep; the `git checkout` via clean `git status` before and after; the temp-test delete via empty `git status`). They appear to be detector false-negatives rather than ignored flags — this is the owner-read measurement the v2 spec asks for.
- Confirmation-review optionals remain deliberately open: no HTTP-handler-layer rejection test, and `freezeFailure()`-tied enum members with no web call sites (iOS now uses `export_failed`).

## Next session

Cross-model review, then O0. See `docs/sessions/NEXT-SESSION.md`.

## Mac-mini continuation — Task 9 complete, stopped at O0

Live Git verification superseded the stale machine-local assumptions above. The
web feature branch contained the pushed gate `bd171e8`; iOS `main` was clean and
current at `2be10a403a74e764d7551e861dc5998f16c9f1f9`. Because the earlier iOS
feature commit was unavailable on this machine, the Task 8 worktree was
recreated from that exact base and the feature was rebuilt locally under the
same locked contract.

Final reviewed implementation HEADs:

- Web: `7be81deb10a8c699349e307861947fc8d2eb734a`
- iOS: `5bfcc89f48a5260ce2703a24dc7bb77c5a4fe2c7` (local only; no upstream)

The first valid Bridge review
(`docs/reviews/bridge-2026-08-01-124526-257741.md`) returned two P1 findings and
one P2 should-fix. They landed independently as web `3b81e1e`, web `3e7b524`,
web `7be81de` and the matching iOS half `5bfcc89`. The fixes add coarse web
application metadata without raw UA, pin both v2 Printer Intake routes, and
reduce every non-bug diagnostic envelope to application/release context only.

The complete post-fix battery passed: web 60 Node and 70 Vitest; release, data,
walkthrough, export, Wrangler dry-run and diff checks green; iOS complete scheme
217/217 with zero failures/skips; real Swift non-bug JSON accepted by the
canonical Worker; engine and the three core data files byte-identical. The
bounded confirmation review
(`docs/reviews/bridge-2026-08-01-130631-202595.md`) returned explicit **GO** with
0 P0/P1 tied to the exact HEADs above.

The web feature branch was pushed for handoff. iOS remains unpushed with no
version change. No feedback database, secret, limiter, migration, deploy,
production canary, TestFlight or App Store Connect action occurred.

Task 10 Step 1 is now the only next entry point: explicit owner O0 permission
for the EU D1 create command, interactive data-key secret, unique limiter
namespace, remote migration, Worker deploy and synthetic production canaries.
ROADMAP and rollout configuration remain unchanged until that permission.
