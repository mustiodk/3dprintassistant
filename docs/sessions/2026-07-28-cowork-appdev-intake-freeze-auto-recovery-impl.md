# 2026-07-28 — Cowork (appdev): intake freeze auto-recovery implementation

## Durable context

- **Freeze deletion has no safe lock-based design here.** Two review rounds
  died on it: a mutation lock cannot be a true mutex when PD8 forbids ever
  blocking freeze *creation*, so the creator needs a timeout bypass — which by
  construction can interleave with a paused deleter. The working design is
  lock-free: `rename(freeze → .claimed.<pid>.<rand>)` atomically captures one
  inode, the claimed bytes are compared to the validated bytes, and only the
  claim is ever unlinked. Do not reintroduce a lock.
- **Every crash window is covered by preflight, not by the notifier.** Freeze
  creation (`.tmp`) and deletion (`.claimed.*`) both strand a sibling file if
  the process dies mid-protocol; preflight fails `rc=78` on *any*
  `.intake-autonomy-freeze.*` sibling. That glob is what makes the whole
  protocol fail-closed — it is load-bearing, not defensive tidiness.
- **The legacy parser is deliberately narrow twice over:** the freeze must
  have exactly the pre-schema key set `{reason, detail, at}` (a truncated
  *current* freeze that lost `runId`/`shipState` must not masquerade as
  legacy), and the id must match `run-YYYYMMDDTHHMMSSZ` (a placeholder like
  `?` echoed by a saved report is not exact-run proof). Both bounds came from
  review probes, not theory.
- **A 5-round adversarial loop converged rather than thrashed** (5→3→2→1→0
  findings, severity narrowing, round 4 explicitly clearing earlier fixes
  against regression). The stopping rule applied: fix anything that breaches
  "nothing fails open, no freeze dies without exact-run delivery proof";
  ledger anything that only polishes an already-fail-closed residual.
- **`--migrate-state-from` may point at the installed checkout itself.** In
  the update path source and destination config are the same file: `cmp`
  self-compares equal, no conflict fires, and the branch reduces to a `chmod
  600`. That is the intended deployment invocation, not a degenerate case.

## What happened / Actions

1. Cold start on `codex/intake-freeze-auto-recovery`; sync health surfaced
   `3dprintassistant-android: missing` (out of scope, untouched). Set a
   `claude-sync hold` for the review-gated work.
2. Executed the plan's six tasks TDD-first: RED notifier recovery contract →
   notifier `recoverFreeze()` → RED wrapper ordering → wrapper wiring → RED
   installer protected-config → installer migration → PD8 doc/contract
   alignment (web + ai-om v2.7, the latter in an isolated parent worktree).
3. Ran `bridge --mode codex-only` five times. Rounds 1–4 returned NO-GO with
   11 findings total; each accepted finding landed as its own commit with a
   RED-first test. Round 3's P1 forced replacing the mutation-lock design with
   atomic claim-verify-unlink; round 4's P1 forced the preflight sibling glob.
   Round 5 returned **GO** with no open P0/P1/P2.
4. Full battery: 11 suites green, `git diff --check` clean.
5. Merged `--no-ff` to web `main` (`53e032b`) and pushed; merged/pushed ai-om
   contract v2.7 (`3dee67c`) without touching unrelated parent dirt.
6. Deployed: fast-forwarded the automation checkout with the bootstrap's own
   `git merge --ff-only origin/main`, ran installer install + verify-only
   (both `ok=true`), then verified read-only that the freeze is byte-identical,
   config is `0600`, no stranded siblings exist, the LaunchAgent is loaded and
   idle, and no intake process is running. **Not kickstarted.**
7. Proved recovery end-to-end without touching production: a sandboxed
   dry-run of the *deployed* notifier against *copies* of the live freeze and
   `last-run-report.json`, with a stub webhook and no network, returned
   `recovered=true runId=run-20260718T112636Z`; the real freeze stayed
   byte-identical.

## Files touched

### Modified (web, merged as `53e032b`)

- `scripts/intake-notify.js`, `scripts/intake-notify.test.js`
- `scripts/intake-run-wrapper.sh`, `scripts/intake-run-wrapper.test.sh`
- `scripts/intake-run-preflight.sh`, `scripts/intake-run-preflight.test.sh`
- `scripts/install-intake-runner.sh`, `scripts/install-intake-runner.test.sh`
- `scripts/intake-run-kickoff.md` (contract token v2.6 → v2.7)
- `.gitignore` (freeze siblings)
- `docs/runbooks/printer-addition-protocol.md`,
  `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md`,
  `docs/planning/ROADMAP.md`

### Modified (ai-operating-model, merged as `3dee67c`)

- `ai-operating-model/docs/agents/intake-pipeline-runner.md` (contract v2.7)

### Not touched

- The live freeze, intake queue, watermarks, candidate packets, KV, the
  notifier secret's contents, and the LaunchAgent schedule.

## Commits

Implementation `b42d473`→`d6beb93`; review fixes `b49f935`, `420dc30`,
`ef55752`, `1e3f314`, `0d68c2a`, `52ca6ee`, `cc3081a`, `ae418df`, `bad2d62`,
`535b6fd`; merges `53e032b` (web) and `3dee67c` (ai-om).

## Open questions / Follow-up

- **Primary next check:** the next scheduled 12:00 run must repost the U1
  report once, clear the legacy freeze on successful delivery, pass preflight,
  and then process the queued `Elegoo seturn 4 ultra 16k` through the normal
  assisted-research lane (expected terminal outcome: resolved to Saturn 4
  Ultra 16K and declined as non-FDM). If the freeze does **not** clear, that is
  a critical operational finding — not permission for manual intake.
- **Accepted residual (owner-approved, unchanged):** no historical delivery
  receipt exists for the manual U1 replay, so the recovery repost may produce
  one duplicate Discord report.
- **Accepted residual (design §5):** a crash between a successful POST and the
  claim unlink duplicates one message; preflight keeps the stranded claim
  fail-closed until the owner clears it. Safer than deleting without proof.
- **Md-hygiene:** no orphan root stubs, no untracked docs left behind, no
  secrets in the tree (the notifier config is gitignored and was never read or
  printed), no duplicate specs, no `</content>` artifacts. `diff -u
  Projects/CLAUDE.md Projects/AGENTS.md` — checked at wrap. The unrelated
  pre-existing `daniasportsrejser*` parent dirt remains outside this project's
  commits.
- **Findings sweep (K1/K3/K4):** no K4 (no tool overruled a controller call);
  no K3 skill-vs-outcome surprise; K1 is the interesting one — the reviewer
  disagreed with my design *twice* (rounds 2 and 3 both rejecting successive
  patches to the same lock idea) before the design was replaced rather than
  patched again. That matches the existing
  `feedback_review_the_applied_fixes_not_just_the_draft` memory (two
  recurrences of a bug class ⇒ find the invariant, don't patch the next site),
  so no new finding file was written — the lesson already exists and was
  applied. Worth noting it took two rounds to act on it.

## Next session

Verify the outcome of the next scheduled 12:00 intake run: check
`scripts/.intake-runner-state/last-run-report.md`, `last-skip.log`, the
Discord channel, and whether `scripts/.intake-autonomy-freeze` (and any
`.claimed.*` / `.tmp` sibling) is gone. Then follow the queued Elegoo request
through its normal terminal outcome. Do not clear a surviving freeze by hand.
