# Intake freeze auto-recovery implementation plan

**Goal:** Restore unattended printer intake by adding exact-run,
notification-proven recovery for `shipped-and-unreported` freezes without
weakening PD8 or manually processing the queued request.

**Architecture:** The wrapper invokes notifier recovery before normal
preflight. The notifier is the only component allowed to validate a saved
terminal report, repost it, and remove a matching freeze. The installer
migrates and verifies the protected notifier config independently of mutable
state.

**Design:** [2026-07-28-intake-freeze-auto-recovery-design.md](../specs/2026-07-28-intake-freeze-auto-recovery-design.md)

**Constraints:** Keep the live freeze and intake queue untouched during
development. Do not kickstart the LaunchAgent. Do not change engine/data,
web UI, or iOS. Never print notifier config contents. One accepted review
finding per commit.

---

## Task 1: Pin structured freeze and recovery behavior with RED tests

**Files**

- Modify: `scripts/intake-notify.test.js`
- Later modify: `scripts/intake-notify.js`

**RED**

Add tests proving:

1. Known-shipment freeze records `runId`, `shipState:"known"`, and `shipped`.
2. Unknown-shipment freeze records `runId`, `shipState:"unknown"`.
3. Exact known freeze + matching saved report + successful POST clears.
4. Run mismatch, unknown state, zero/missing/malformed report, and failed POST
   preserve the original freeze bytes.
5. Strict legacy known-shipment detail recovers; free-form/unknown legacy
   freezes do not.
6. No freeze is a no-op success.

Run:

```bash
node scripts/intake-notify.test.js
```

Expected: new recovery assertions fail because no recovery API/CLI or
structured freeze fields exist.

Commit the RED tests separately.

## Task 2: Implement notifier-owned exact-run recovery

**Files**

- Modify: `scripts/intake-notify.js`

Implement:

- atomic structured freeze writes;
- strict freeze parsing and legacy migration parser;
- saved `last-run-report.json` loading from runner state;
- `recoverFreeze(opts)` with exact-run and positive-shipment predicates;
- successful-post-only freeze removal;
- machine line
  `RECOVERY recovered=<bool> applicable=<bool> reason=<slug> runId=<id>`;
- CLI `--recover`;
- webhook redaction unchanged.

The recovery POST must reuse the same normalized report/rendering path as
normal notification. It must not create a new freeze while trying to recover
an existing one, and it must never advance the monthly digest cursor.

Run:

```bash
node scripts/intake-notify.test.js
```

Expected: all notifier tests green.

Commit implementation separately.

## Task 3: Wire recovery before preflight with integration proof

**Files**

- Modify: `scripts/intake-run-wrapper.test.sh`
- Modify: `scripts/intake-run-wrapper.sh`

**RED**

Extend wrapper fixtures so notifier records `--recover` calls and can simulate
recovery success/failure. Prove:

- `--recover` is invoked before preflight;
- after recovery success, preflight and Claude each run exactly once;
- recovery failure still reaches normal preflight, which owns the final `78`
  freeze skip;
- non-recovery wrapper behavior remains unchanged.

Run:

```bash
bash scripts/intake-run-wrapper.test.sh
```

Expected: ordering assertions fail before wrapper wiring.

**GREEN**

Invoke:

```bash
node "$REPO/scripts/intake-notify.js" --recover
```

immediately after state-directory creation and before preflight. Log its
machine result. Do not treat a non-zero recovery result as independent
permission to bypass preflight; the existing freeze predicate remains the
authoritative stop.

Run wrapper and notifier suites green, then commit.

## Task 4: Harden protected-config migration with TDD

**Files**

- Modify: `scripts/install-intake-runner.test.sh`
- Modify: `scripts/install-intake-runner.sh`

**RED**

Add installer cases for:

- byte-identical config migration with destination mode `0600`;
- repeat install and verify-only idempotency;
- missing migration-source config fails before mutation;
- unequal destination fails without overwrite;
- verify-only detects byte drift and wrong mode;
- output contains no webhook URL or secret marker.

Run:

```bash
bash scripts/install-intake-runner.test.sh
```

Expected: new config assertions fail.

**GREEN**

Add a protected-config helper separate from the mutable state manifest.
Require the explicit migration source in install and verify paths, copy with
mode `0600`, compare bytes without printing them, and refuse conflicts.

Run installer, bootstrap, wrapper, preflight, and notifier suites, then commit.

## Task 5: Align PD8 contracts and operational docs

**Web files**

- Modify: `docs/runbooks/printer-addition-protocol.md`
- Modify: `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `scripts/intake-run-kickoff.md` if it contains the manual-only PD8
  rule

**AI operating-model file**

- Modify in an isolated parent-repo worktree:
  `ai-operating-model/docs/agents/intake-pipeline-runner.md`

Document:

- structured freeze schema;
- exact-run recovery gate;
- unknown-state permanent fail-closed behavior;
- strict legacy U1 migration;
- wrapper order;
- installer protected-config requirement;
- no manual candidate advancement and no manual LaunchAgent kickstart.

Run contract token tests and `git diff --check`. Commit web and AI-OM changes
in their respective repositories without touching unrelated sibling changes.

## Task 6: Adversarial review

Run:

```bash
bridge --health
bridge --mode codex-only --output-file scripts/.intake-runner-state/bridge-reviews/intake-freeze-auto-recovery.md "<focused review prompt>"
```

Review specifically for:

- run-ID confusion or TOCTOU deletion;
- legacy parser overreach;
- unknown-shipment fail-open paths;
- secret disclosure;
- POST-success/delete crash windows;
- wrapper ordering/double-run risk;
- installer overwrite/mode bugs.

Apply each accepted P0/P1/P2 finding as its own commit and rerun affected tests.
Require a non-empty final GO with no open P0/P1/P2.

## Task 7: Full verification and release

Run at minimum:

```bash
node scripts/intake-notify.test.js
bash scripts/intake-run-wrapper.test.sh
bash scripts/install-intake-runner.test.sh
bash scripts/intake-sync-bootstrap.test.sh
node scripts/intake-diff-guards.test.js
git diff --check origin/main...HEAD
git status --short --branch
```

Also run every repository test that directly references notifier, wrapper,
preflight, installer, freeze, or PD8.

Release only after green proof:

1. Rebase/refresh safely if `origin/main` advanced.
2. Merge web branch to web `main` and push.
3. Merge/push the AI-OM contract branch separately.
4. Run installer update + verify-only against the automation-owned checkout,
   with the existing runtime checkout as the explicit protected-state source.
5. Read-only verify installed HEAD, config mode `0600`, freeze still present,
   LaunchAgent loaded/idle, and no intake process was started.
6. Do not kickstart. Leave exact-run recovery to the next scheduled 12:00 run.

If installer deployment or review fails, do not clear the freeze or run intake
manually; report the exact critical blocker.
