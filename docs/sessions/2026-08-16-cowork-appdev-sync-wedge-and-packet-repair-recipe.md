# 2026-08-16 — Cowork (appdev): a four-day sync wedge, and the repair recipe for two parked packets

**Machine:** iMac. **Product code changed:** none. **Intake pipeline:** not run.

## Durable context

- **`claude-sync.sh pull` wedges itself, and the health gate is structurally
  blind to it.** The autostash-pop 3-way-conflicts on per-machine files and
  leaves an orphaned `UU` with **no `MERGE_HEAD`** — so it never reads as a
  merge in progress, and health renders it as plain `dirty`, which SF-2 treats
  as non-blocking. `~/.claude` sat 18 commits behind for ~4 days on this. The
  loop reproduced live twice while being watched. Third recurrence of a
  mechanism `.gitignore` already names verbatim. Untracked three files in
  `~/.claude` `4aceea6e`; **detection is still open** — one `git ls-files -u` in
  health would emit a `wedged:N` token and catch it on day one.
- **A run report's account of its own failure is a claim, not evidence.**
  `run-20260816T100246Z` blamed a "2026-08-15 canonical-source-identity +
  notes-metadata schema tightening" that does not exist — the rule shipped
  2026-07-10 and the normalizer has one commit in its entire history. Two
  `git log` calls disproved it. It had already been reported to the owner as
  fact.
- **The intake evidence gate hides a second failure behind the first.**
  `validate-candidate-evidence.js:362-368` errors on non-canonical
  `checkedSources` and then `continue`s — skipping line 370. Behind it,
  `multi_color_systems` is CRITICAL but **not** in `ABSENCE_BOOLEAN_FIELDS`, so
  the absence route can never satisfy it regardless of source formatting.
  Canonicalising the URLs alone moves the error and burns the single repair pass.
- **Two source formats coexist in one packet and are not the same shape.**
  `field.source` wants a full `https://…` URL; `absenceRationale.checkedSources[]
  .canonicalSource` wants the normalized form (no scheme, no `www.`, no trailing
  slash) because `isCanonicalSourceIdentity(v)` is true only when
  `canonicalSource(v) === v`. Same page, two strings.
- **Intake repair work is mac-mini-pinned, verified not assumed.** The branches
  `intake/ender_3_s1_pro` and `intake/hi` are **not** on origin, the four ship
  commits are unreachable from the iMac clone, and `~/.local/share/3dpa-intake/`
  does not exist here.

## What happened / Actions

**Cold start halted at the sync gate**, as designed. Health reported
`claude-sync: behind:18+dirty`, `3dprintassistant: behind:8`,
`3dprintassistant-ios: diverged:4:11`. Diagnosed each separately rather than as
one problem:

- Web: clean tree, zero local commits → fast-forwarded, now `current`.
- iOS: ahead 4 / behind 11, but **non-overlapping by file** — the local commits
  touch only two new CI files, the remote touches none of them. Rebased on owner
  approval; replayed clean, stayed local under the push gate.
- `~/.claude`: behind 18 **plus** an orphaned `UU` in
  `plugins/known_marketplaces.json` with no `MERGE_HEAD`. Owner ran
  `git checkout --theirs` on it, which in a *stash* conflict takes the stashed
  (older) side and leaves the index untouched — corrected to the newer upstream
  timestamp and staged. The subsequent `pull` then produced a second identical
  conflict in `.last-update-result.json`, which is how the mechanism became
  visible.

**Untracked three per-machine files** (`~/.claude` `4aceea6e`) with the
rationale written into `.gitignore`: `plugins/known_marketplaces.json` (243
commits/60d, only a timestamp differs; reverses an explicit keep-list decision),
`.last-update-result.json` (records this machine's updater path — iMac
`npm-global` vs mac-mini `native`), and `chrome/chrome-native-host` (hardcoded
absolute path to the local binary, so syncing it actively breaks whichever
machine loses the race — a correctness bug, not churn). Owner approved the third
after it was surfaced as out of the original two-file scope.

**Read `run-20260816T100246Z`**, which had already consumed both owner decisions
armed on 08-15. The research half went well: the manufacturer-conflict ladder
resolved `ender_3_s1_pro`'s `max_speed` to 150 mm/s from sources already on file
(its first real proof), and `hi` self-corrected `epoxy_flexible` → `epoxy_resin`
without the new vocabulary gate having to fire. Both then failed the evidence
gate and parked `research-defect` with one repair pass each.
`centauri_combo_2` was correctly declined as a duplicate of shipped
`centauri_carbon_2`.

**Verified fail-closed held** rather than trusting the note: the four ship
commits are not ancestors of `main`, neither printer is in bundled
`data/printers.json`, and production still serves `content_version=2026080801` —
the branches' `2026081601` never published.

**Disproved the run's stated cause** and read the validator to find the real
shape of the repair, including the hidden `multi_color_systems` layer. Wrote the
full recipe into `NEXT-SESSION.md` with target JSON shapes and a local
verification loop, so the repair pass is not spent rediscovering it.

## Files touched

**Modified:** `~/.claude/.gitignore` · `3dprintassistant/docs/sessions/NEXT-SESSION.md` ·
`ai-operating-model/docs/findings/INDEX.md` · `3dprintassistant/docs/sessions/INDEX.md` ·
`3dprintassistant/docs/planning/ROADMAP.md`

**Untracked (removed from git, kept on disk):** `~/.claude/plugins/known_marketplaces.json` ·
`~/.claude/.last-update-result.json` · `~/.claude/chrome/chrome-native-host`

**Created:** this log · two findings (below)

**Repo state changed without new commits:** `3dprintassistant` fast-forwarded 8;
`3dprintassistant-ios` rebased 4 local CI commits onto `origin/main` (still
`ahead:4`, unpushed).

## Commits

- `~/.claude` `4aceea6e` — `fix(sync): untrack three per-machine files that silently wedge pulls`

No 3dpa product code shipped. No intake run triggered.

## Findings captured

- K3 [`2026-08-16-run-report-named-a-schema-change-that-never-happened`](../../../ai-operating-model/docs/findings/2026-08-16-run-report-named-a-schema-change-that-never-happened.md) — `open`
- K3 [`2026-08-16-autostash-pop-wedge-is-invisible-to-the-health-gate`](../../../ai-operating-model/docs/findings/2026-08-16-autostash-pop-wedge-is-invisible-to-the-health-gate.md) — `mitigated`

**Not captured as new:** the verify-before-mutate ledger scored both of this
session's flags `unresolved_by_session_end` despite same-turn Bash verification
with inline outcomes. That is already ledgered as
[`2026-07-28-vbm-resolution-detection-misses-bash-verification`](../../../ai-operating-model/docs/findings/2026-07-28-vbm-resolution-detection-misses-bash-verification.md)
with R2a/R2b queued; this session is a second field instance, not a new finding.

## verify-before-mutate summary (verbatim, per the standing rule)

```
verify-before-mutate ledger: 2 flags (0 resolved_same_turn, 0 resolved_late,
2 unresolved_by_session_end), 0 destructive-core, 5 unclassified, 0 generated-write
  - [unresolved_by_session_end] Write /Users/mragile.io/.claude/plugins/known_marketplaces.json (write_existing)
  - [unresolved_by_session_end] Bash /Users/mragile.io/dev/Claude/Projects (repo_destructive)
```

Controller account, for the owner's read — the owner's judgement is the
measurement, not this paragraph. Both flags were verified in-turn with inline
outcomes stated, and both appear to be false positives:

1. `known_marketplaces.json` — the file had been `cat`'d twice via Bash before
   the write; the hook counts only `direct_file_read` (the Read tool). Verified
   after the write with a JSON parse, key inspection, on-disk `installLocation`
   check and a conflict-marker count.
2. `Projects (repo_destructive)` — attributed to the wrong repo. Every mutation
   in that command ran in `~/.claude`; only the shell cwd resets to `Projects`
   between calls. Verified with `git status --short` in `Projects`, which was
   empty.

A third flag fired later on `findings/INDEX.md` (same Read-tool cause) and was
verified with a structure check plus the md-hygiene parity loop; it is not in
the summary above, which was captured mid-session.

## Md-hygiene sweep

1. **Root-level stubs** — none found.
2. **Untracked but should-be-tracked** — none in 3dpa; the two new findings and
   this log are committed as part of wrap-up.
3. **Secrets** — none; the `~/.claude` work touched only per-machine caches, and
   `.credentials.json` remains gitignored.
4. **Content buried in a log** — the source-format asymmetry and the
   `multi_color_systems` trap are durable and belong in
   `docs/runbooks/printer-addition-protocol.md`, not only in `NEXT-SESSION.md`.
   **Proposed, not done** — see Open questions.
5. **Stale ROADMAP sections** — Current Snapshot claimed the live overlay was
   `content_version=2026071402`; production actually serves `2026080801`
   (curl-verified). Corrected this session.
6. **Duplicate specs/plans** — none found.
7. **Protocol-file drift** — `diff -u Projects/CLAUDE.md Projects/AGENTS.md`
   clean.
8. **INDEX-vs-files parity** — findings INDEX parity loop run over entry-links:
   no orphans, no stated count to keep in sync.
9. **Stray tool artifacts** — none; no `</content>` tails in files created this
   session.

## Open questions / Follow-up

- **Should the two-format asymmetry and the `multi_color_systems` trap go into
  `docs/runbooks/printer-addition-protocol.md`?** They are durable properties of
  the evidence gate, not facts about these two candidates, and the runbook is
  what the research agent actually reads. Not done unilaterally — the runbook is
  ratified state and the owner has been burned by hand-edits to such files
  before.
- **Should `claude-sync health` emit a `wedged:N` token when `git ls-files -u`
  is non-empty?** Roughly one line, and it converts a four-day silent drift into
  a day-one hard stop. Detection is the half of the wedge finding that is still
  open.
- **Should the "which tracked files does each machine write independently?"
  sweep be run once, properly?** Three separate wedges have now been fixed one
  file-set at a time, each found by watching a failure rather than by looking.
- **Candidate standing rule:** *a tool's account of why it failed is a claim, not
  evidence* — the no-mutation-on-unverified-premise bar applies to run reports
  unchanged. Raised by the 08-16 finding; not added to `CLAUDE.md` without an
  owner call.
- **iOS 1.1.4 remains gated on owner authorization** — push, TestFlight
  dispatch, device acceptance, authenticated explicit-zero dashboard check.
  Untouched this session.

## Next session

**Mac-mini.** Repair the two parked packets before the next scheduled run
consumes their one remaining pass. Full recipe, corrected diagnosis, target JSON
shapes and the local verification loop are in
[`NEXT-SESSION.md`](NEXT-SESSION.md). The #32 iOS-train scoping block follows it,
unchanged.

Also on the mac-mini, before anything else:

```
cd ~/.claude && cp chrome/chrome-native-host /tmp/cnh.bak && git checkout -- .last-update-result.json chrome/chrome-native-host plugins/known_marketplaces.json && ./claude-sync.sh pull && cp /tmp/cnh.bak chrome/chrome-native-host && ./claude-sync.sh health
```
