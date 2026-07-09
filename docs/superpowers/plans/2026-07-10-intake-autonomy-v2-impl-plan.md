# Intake Autonomy v2 — Implementation Plan (build phase → full autonomy from run 1)

> **For agentic workers:** REQUIRED SUB-SKILL: use subagent-driven development or plan-execution discipline to implement this plan gate-by-gate. Steps use checkbox (`- [ ]`) syntax for tracking. Every gate ends implement → hostile sub-agent review → patch → QA → commit. **Execution is mac-mini-pinned** (launchd, wrangler auth, full Xcode, bridge).

**Goal:** build the components in spec §4 so the ratified Intake Autonomy v2 design (PD0–PD8 + owner amendment: **no shadow phase, no manual merges — full autonomy from run 1**) runs as a daily scheduled headless pipeline on the mac-mini: Scout triage → autonomous research/fill → scripted ship → dual-review merge gate → auto-merge/deploy → live verify + auto-rollback → post-merge iOS mirror → ledger + KV hygiene + Discord run report.

**Spec:** [`../specs/2026-07-09-intake-autonomy-v2-design.md`](../specs/2026-07-09-intake-autonomy-v2-design.md) (hostile-reviewed ×14, RATIFIED 2026-07-10). **Audit:** [`../../reviews/2026-07-09-printer-intake-autonomy-audit.md`](../../reviews/2026-07-09-printer-intake-autonomy-audit.md). **This plan requires a Codex cross-model review (GO) before build session 1** — owner directive recorded in the spec header.

**Architecture recap (spec §3):** one pipeline run = headless Claude Code session (`claude -p`) under launchd executing a versioned runner contract; deterministic preflight fail-closed; runner-owned watermark; strictly serial per candidate; PD5 merge gate (hostile sub-agent GO + Codex GO, any NO-GO parks); PD6 live verify + auto-rollback with the `max(bad, snapshot)+1` version rule; iOS mirror strictly post-merge; PD8 freeze semantics.

---

## Grounding facts (verified 2026-07-10 against working tree — Explore-agent sweep + spec/audit)

- **Validator exports are reusable as designed:** `scripts/validate-ios-printer-overlay.js:305` exports `{ validateOverlay, collectBaselineUnion, collectKnownBrandIds, compareVersions, stableStringify, sha256, FIRST_OVERRIDE_MERGE_VERSION }`; the payload hash is `sha256(stableStringify(overlay.payload))` (`:244`). Overlay file: `catalog/ios-printer-overlay-v1.json` (`:8`); baselines: `catalog/ios-bundled-catalog-baselines.json` (`:9`); iOS MARKETING_VERSION read from `../3dprintassistant-ios/project.yml` (`:10`, `:98`).
- **Scout CLI already supports runner custody:** `--source kv`, `--no-watermark` (disables the Scout's own timestamp-gate state file `scripts/.printer-intake.watermark.json`), `--out <dir>` (staging; `assertSafeOutDir` at `printer-intake-scout.js:834-845` allows ONLY `scripts/.printer-intake-out/` or an out-of-repo path), `--use-config-token`, `--wrangler-bin` (`printer-intake-scout.js:60-102`). Staging candidates are `candidate-<mfr>-<model>.json` (`:938-943`). KV via `npx wrangler kv key list|get --remote --namespace-id f3d89a4e70a34e3fab1c0f7676efebb5` (`:751-777`); account id env `CLOUDFLARE_ACCOUNT_ID` set by `runWrangler` (`:742`); config token read from gitignored `scripts/.printer-intake.local.json` (`loadConfig` `:730-739`; **naming drift: env var read is `CF_API_TOKEN`, file keys `cfApiToken`/`token` — the header comment says `CLOUDFLARE_API_TOKEN`;** the injected wrangler env var IS `CLOUDFLARE_API_TOKEN` at `:743`).
- **`picker-dry-run.js`'s fetch shim is LOCAL-FILE-ONLY** (`picker-dry-run.js:41-51`: joins the URL to repo root and `readFile`s — an `https://` URL would 404). So `verify-live-picker.js` must **download the live `data/printers.json` (+ every other file the engine fetches at init) into a temp root and point the existing bootstrap at that root** — no HTTP support added to the shim. CLI shape today: `<brand_id> <series_group> <printer_id> [wrong_brand_id]` (`:35`).
- **S4 gather contract (PD7):** `intake-retrospective-gather.js` depends on `runId` (watermark gate `:114-116`), `ownerResolution ∈ MISS_RESOLUTIONS` (`:40`, `:121`), `correctiveSignal` (`:122-124`), `candidateKey` string-or-array (`:129-130`); ledger `scripts/printer-intake-outcomes.jsonl`, schema marker `printer-intake-outcomes@1`. **Pre-existing drift found while grounding:** the committed creator_5_pro line uses `ownerResolution:"was-unresolved-brand"` (not in `MISS_RESOLUTIONS`) and `correctiveSignal:"brandTokens:*"` (not in `ARRAY_TARGETS`) → silently non-clustered today. Surfaced to owner as a follow-up; NOT silently "fixed" here (the values are deliberately outside the auto-appliable set per the audit §3).
- **Gitignore already covers** `scripts/.printer-intake.local.json`, both watermark files, and `scripts/.printer-intake-out/` (`.gitignore:6-11`). New entries needed: freeze flag, run lock, runner watermark, run-report file.
- **agent-ops launchd is a PATTERN, not a host** (spec PD1 caveat confirmed): plist `agent-ops/launchd/com.mustiodk.agent-ops.daily.plist` (label `com.mustiodk.agent-ops.daily`, zsh script, 07:15, logs under `agent-ops/logs/`) — but its paths hardcode pre-migration `/Users/mragile.io/...` while this machine is `/Users/mustafaozturk-macmini/...`, and it runs no LLM/keychain auth. Zero evidence `claude -p` + keychain works under launchd → Gate B0 exists for exactly this.
- **`ai-operating-model/docs/agents/intake-pipeline-runner.md` does not exist yet.** The Assistant contract's "Autonomous-run rules" (`printer-addition-assistant.md:230-250`) carry the three inherited rules (branch isolation incl. iOS mirror; ambiguous-model surface-don't-pick; honest delivery status) and state the future autonomous routine MUST inherit all three. The Scout contract's Forbidden Actions include "Scheduling itself" (`printer-intake-scout.md:162`) — the RUNNER schedules; the Scout stays unscheduled per contract.
- **Runbook anchors:** Phase 3 impl+verification `printer-addition-protocol.md:215-323` (gates at `:241-255`; owner visual picker `:310`; live curl `:315-323`); Phase 4b graduation `:335-353`; Phase 5 self-check `:379-409`; app-cap conditions `:87-117`; data-only XCTest waiver `:257-304`.
- **wrangler.toml:** KV binding `PRINTER_INTAKE` id `f3d89a4e...` (`:23-25`); analytics binding `ANALYTICS` (`:16-18`). The Worker consumes the binding name; scripts use the namespace id.
- **First real candidate:** KV `req:1783615951531:a03e6e7e` (Creality K2 SE) kept live — **the durable source.** The 2026-07-09 staging file `candidate-creality-k2_se.json` is machine-local/gitignored and is NOT present on this mac-mini (verified) — any step needing it must re-stage from KV first (plan-review M8).
- **`printer-intake-outcomes.jsonl` is git-tracked** (`git ls-files` verified) — every runner ledger append dirties the tree, so the runner must own a ledger commit or the fail-closed preflight deadlocks the next run (plan-review C1). **`.assetsignore` excludes `docs/**` and `scripts/**`** (verified) — docs commits change zero served bytes, so deploy latency is only observable via a served-asset change (plan-review H4).
- **iOS repo locator convention:** sibling `../3dprintassistant-ios` (validator `:10`); no shared constant — the runner adopts the same convention.

## Non-goals (explicit)

- No new web Worker, telemetry, queue UI, engine/app/data-semantics change, iOS push automation, or S4 auto-apply (spec §4 "explicitly not built").
- No Android overlay work (future extension point noted in the runner contract only).
- No fix to the pre-existing S4 ledger drift (`was-unresolved-brand` / `brandTokens:*` non-clustering) — surfaced as an owner follow-up row; changing `MISS_RESOLUTIONS`/`ARRAY_TARGETS` alters what the learning loop may auto-propose and is its own decision.
- No manual-path removal: the runbook's manual protocol stays valid and canonical on conflict (spec risk 4).
- No TestFlight/iOS push: mirror commits stay local (push gate rung-invariant).

## Mandatory data/logic-change evaluation (web + iOS + Android-plan)

- **Engine/app/data semantics: untouched.** The pipeline ships `data/printers.json` rows + overlay payloads through the SAME validator gates as the manual path. `walkthrough-harness.js` gains rows only inside `COMBOS[]` (diff-path guard enforces this).
- **Web UI:** none. **iOS:** delivery via existing overlay mechanism; bundled mirror stays a local commit post-merge; XCTest on the mini when waiver void-conditions fire. **Android (planned):** runner contract notes `android-printer-overlay-v1.json` as a future extension point (AD8); no code.
- New repo surfaces are all `scripts/` tooling + contracts + one plist — no user-facing behavior.

## File structure

**Create (web repo unless noted):**
- `scripts/republish-overlay.js` + `scripts/republish-overlay.test.js`
- `scripts/verify-live-overlay.js` + `scripts/verify-live-overlay.test.js`
- `scripts/verify-live-picker.js` + `scripts/verify-live-picker.test.js`
- `scripts/intake-kv-hygiene.js` + `scripts/intake-kv-hygiene.test.js`
- `scripts/intake-run-preflight.sh`
- `scripts/intake-run-wrapper.sh` (plist entrypoint: preflight → lock acquire → `claude -p` → trap-release + failure notify; Codex SF-1)
- `scripts/intake-notify.js` + `scripts/intake-notify.test.js` (webhook + local report + freeze rule + monthly digest)
- `scripts/launchd/dk.mragile.3dpa-intake.plist` (+ `scripts/launchd/README.md` install note)
- `scripts/intake-launchd-probe.sh` + `scripts/launchd/dk.mragile.3dpa-intake-probe.plist` (Gate B0; probe artifacts retained)
- `scripts/lib/engine-bootstrap.js` (B2 refactor: shared vm+fetch-shim loader extracted from `picker-dry-run.js`)
- `scripts/intake-runner.config.json` (committed; PD6 retry budget + per-run candidate bound + schedule metadata — created in B3, filled by B5)
- `scripts/intake-run-kickoff.md` (committed; the exact prompt the plist `cat`s into `claude -p` — created in B4)
- `ai-operating-model/docs/agents/intake-pipeline-runner.md` (ai-om repo)
- `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md` (empty-first; ticks recorded as they happen, never pre-narrated)

**Modify:**
- `.gitignore` (+ `scripts/.intake-autonomy-freeze`, `scripts/.intake-run.lock`, `scripts/.printer-intake-runner.watermark.json`, `scripts/.printer-intake-out/last-run-report.md` is already covered by the dir rule)
- `scripts/intake-retrospective-gather.js` (+ last-line-wins per candidateKey; additive `ownerResolution` values) + its test
- `printer-intake-outcomes.jsonl` schema marker: **owner migrates the marker line once, outside the pipeline** (PD7) — the plan only documents the command
- `ai-operating-model/docs/agents/printer-addition-assistant.md` (autonomous-mode section; Forbidden Actions tightened: never push iOS, branch or main)
- `docs/runbooks/printer-addition-protocol.md` (autonomous path as first-class mode + PD3/PD4 waiver record)
- `scripts/.printer-intake.local.json` (owner adds `discordWebhookUrl` — gitignored, never printed; setup input, not a gate)

## Session map (4–5 sessions, one gate-cluster each)

| Session | Gates | Exit |
|---|---|---|
| 1 | **B0** launchd environment probe | all 4 probes PASS under launchd, or a PD1 alternative decision escalates to owner |
| 2 | **B1** republish-overlay + **B2** verify-live-overlay / verify-live-picker | unit suites green; scripts round-trip live prod data read-only |
| 3 | **B3** preflight + lock/freeze + KV hygiene + notifier | preflight green on the real mini; hygiene dry-run over live KV matches class policy |
| 4 | **B4** runner contract + Assistant amendment + runbook amendment + PD7 gather change + plist | contracts committed; runner dry-run (no-merge mode) over K2 SE staging |
| 5 | **B5** deploy-latency measurement + self-run rollback drill + E2E enablement | drill green end-to-end; plist loaded; **full autonomy live — first scheduled run may ship K2 SE** |

Per-gate pattern (every gate): implement → hostile sub-agent review → patch → QA → commit (one concern per commit) → tick the gate ledger with evidence.

---

## Gate B0 — launchd environment probe (Phase-A-first; spec review #7)

**Why first:** keychain access (Claude OAuth, git creds, wrangler OAuth) from a launchd session is a known failure class; nothing else is worth building until this is proven.

- [ ] **B0.1 probe script** `scripts/intake-launchd-probe.sh` (zsh; `mkdir -p scripts/.printer-intake-out` FIRST — the dir is gitignored and absent on a fresh machine): four independent probes, **each wrapped in its own `if ! …; then echo FAIL; fi` guard** (no bare `set -e` abort — a FAIL must not skip the remaining probes), each appending `PASS|FAIL <probe> <detail>` to `scripts/.printer-intake-out/launchd-probe.log`:
  1. `claude -p 'Reply with exactly: PROBE_OK' --output-format text` → assert output contains `PROBE_OK` (proves headless auth; NO tool use, no repo access needed).
  2. `npx wrangler whoami` → assert exit 0 + account id in output (proves wrangler OAuth/keychain under launchd; run in the web repo cwd).
  3. `bridge --health` → assert its documented healthy exit (per `Projects/bridge/docs/RUNBOOK.md`; **presence-not-validity caveat applies** — memory `feedback_preflight_proves_source_not_validity`: a 401 only shows at a real turn; the PD5 gate's park-on-failure covers that).
  4. Worktree-neutral push probe (never detaches/mutates the checkout): `sha=$(git commit-tree 'HEAD^{tree}' -p HEAD -m 'launchd push probe'); git push origin "$sha:refs/heads/intake-probe-scratch"; git push origin :intake-probe-scratch` → assert both pushes exit 0. Proves push credentials under launchd; touches no real branch, no worktree state.
- [ ] **B0.2 probe plist** `scripts/launchd/dk.mragile.3dpa-intake-probe.plist`: label `dk.mragile.3dpa-intake-probe`, `/bin/zsh <abs path>/intake-launchd-probe.sh`, `WorkingDirectory` = web repo, logs to `scripts/.printer-intake-out/launchd-probe.{out,err}.log`, `RunAtLoad false`, no calendar (kickstart-only). **Absolute paths use `/Users/mustafaozturk-macmini/...` (agent-ops' plist path drift is the cautionary example).**
- [ ] **B0.3 run:** `mkdir -p scripts/.printer-intake-out` (launchd does NOT create missing `StandardOutPath` parent dirs) → `cp` plist → `~/Library/LaunchAgents/` → `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/dk.mragile.3dpa-intake-probe.plist` → `launchctl kickstart -k gui/$(id -u)/dk.mragile.3dpa-intake-probe` → read the log. Expected: 4× PASS.
- [ ] **B0.4 failure branch:** any FAIL → record verbatim in the gate ledger; classify (keychain prompt suppressed / PATH / TTY assumption); attempt the documented launchd remedies (e.g. `SessionCreate`, explicit PATH env in plist). If `claude -p` auth is structurally unavailable under launchd → STOP the build and surface PD1 alternatives to the owner (Claude scheduled cloud agent / login-session LaunchAgent variant) — this is a genuine scope decision, not a mechanical fix.
- [ ] **B0.5 QA + commit:** probe script + probe plist + gate-ledger row (probe log lines quoted verbatim in the ledger — the artifacts themselves live under the gitignored staging dir and are NOT committable). Rollback: `launchctl bootout` + remove plist (documented in the ledger row).

**Expected output:** `launchd-probe.log` with 4 PASS lines produced by a launchd-initiated (not terminal-initiated) run.

## Gate B1 — `scripts/republish-overlay.js` (closes the hand-hash gap; audit §2)

CLI (deterministic, no LLM):

```bash
node scripts/republish-overlay.js --add-printer <id> [--add-brand <id>] [--min-app-version X]   # copies rows byte-identically from data/printers.json
node scripts/republish-overlay.js --rollback-to <snapshot.json> [--bad-version <YYYYMMDDXX>]
node scripts/republish-overlay.js --set-enabled false [--bad-version <YYYYMMDDXX>]              # PD8 content emergency stop
node scripts/republish-overlay.js --snapshot <out.json>                                        # write current overlay as known-good snapshot
node scripts/republish-overlay.js --bump-version                                               # benign version-only republish, payload unchanged (B5 drill/measurement tool)
```

- [ ] **B1.1 RED tests** (`republish-overlay.test.js`, node:test, fixture-copied overlay files — NEVER the live repo file in tests):
  - add-printer: row byte-identical to `data/printers.json` (stableStringify equality), **`content_version` next = `max(current + 1, <today>01)`** within the YYYYMMDDXX scheme (never republish at an unchanged version — the iOS cached-version guard would silently reject the new payload; plan-review H1), `generated_at` refreshed, `payload_sha256` == `sha256(stableStringify(payload))`, validator invoked and green. Test cases: current from a past day → `<today>01`; **current already today's counter → current+1**.
  - `--bump-version`: payload byte-identical (stableStringify equality pre/post), version advances by the same `max(current + 1, <today>01)` rule, hash recomputed.
  - **PD6 version-ordering (the CRITICAL rule):** same-day rollback case — deployed bad `2026071002`, snapshot carries `2026071001` → rollback output MUST be `2026071003` (`max(bad, snapshot)+1`), never `2026071001`+1-naive. Second case: bad version from a LATER day than snapshot.
  - **Counter-99 / 2099 cap:** version `YYYYMMDD99` +1 → script exits non-zero with a `CRITICAL` line (fail LOUD; the runner maps this to freeze+notify).
  - idempotence: running add-printer for an id already in the overlay → no-op exit with explicit message (no version churn).
  - enabled:false republish applies the SAME version rule.
- [ ] **B1.2 implement** reusing `require('./validate-ios-printer-overlay.js')` exports (`stableStringify`, `sha256`); **`content_version` comparison is plain numeric — do NOT reuse the exported `compareVersions`, which is semver-only (Codex optional; `validate-ios-printer-overlay.js:80`)**; always end by invoking `validateOverlay` and exiting non-zero on any finding.
- [ ] **B1.3 QA:** unit suite green; read-only sanity vs the LIVE repo overlay: `--snapshot` then a dry add of an EXISTING id (expects the idempotent no-op). Full web Node test suite green.
- [ ] **B1.4 hostile review → patch → commit.** Rollback note: script is additive tooling; revert = `git revert` of one commit.

## Gate B2 — live verification probes (PD3 + PD6 read side)

- [ ] **B2.1 RED tests** (mock `fetch` via injected loader):
  - `verify-live-overlay.js`: fetches the live overlay URL (the runbook Phase 3 curl target, `printer-addition-protocol.md:315-323`) and asserts the **FULL envelope** equals the committed file — `schema_version`, `content_version`, `enabled`, `min_app_version`, `payload_sha256`, AND canonical payload equality (`sha256(stableStringify(payload))` recomputed on the fetched body — the stored hash covers payload only, so version+hash alone would pass a live overlay flipped to `enabled:false` or a wrong `min_app_version`; Codex MF-1; iOS treats `enabled:false` as bundled-only, `PrinterCatalogProvider.swift:122`). **Ship-path mode requires `enabled:true`; the PD8 emergency-stop verification is an explicit `--expect-disabled` mode.** Bounded retries (`--retries`/`--interval`, defaults read from `scripts/intake-runner.config.json` once B5 fills it; until then conservative 10×30s); **`--measure` mode: poll until the live values equal the committed ones and print elapsed seconds (machine-readable line)** — tested with a mocked fetch that flips after N polls; exit codes: 0 match / 2 mismatch-after-retries / 3 fetch-error.
  - `verify-live-picker.js`: downloads live `data/printers.json` (+ the full set of files `Engine.init()` fetches — enumerate from `engine.js` init and mirror `picker-dry-run.js`'s ROOT layout) into a temp root, runs the existing vm bootstrap against that root (reuse by extracting `picker-dry-run.js`'s loader into a shared `scripts/lib/engine-bootstrap.js` — refactor commit separate from feature commit), asserts `<brand>/<series_group>/<printer_id>` resolves + wrong-brand-absence, same assertions as the local dry-run but against PRODUCTION data.
- [ ] **B2.2 implement**; local engine bootstrap refactor proven behavior-preserving (existing `picker-dry-run.test.js` 6/6 stays green byte-for-byte on output).
- [ ] **B2.3 QA:** unit green + one real read-only run of each against production (expected: current overlay matches; an existing printer resolves).
- [ ] **B2.4 hostile review → patch → commit(s)** (refactor commit + feature commit).

## Gate B3 — preflight, lock/freeze, KV hygiene, notifier (spec §3.1, §3.7, PD8)

- [ ] **B3.1 `scripts/intake-run-preflight.sh`** (zsh): freeze-flag check (`scripts/.intake-autonomy-freeze` → exit 78 EX_CONFIG w/ reason) → run-lock (`scripts/.intake-run.lock`; held+fresh → exit; stale >6h → warn + proceed) → repo predicates: web `git status --porcelain` empty AND `git fetch && git rev-list HEAD..origin/main --count` == 0 AND `origin/main..HEAD` == 0; iOS clean + **ahead-only allowed**, behind/diverged blocks → wrangler auth probe `npx wrangler whoami` **+ KV delete-scope check** (write+delete a `probe:` key via `wrangler kv key put/delete --remote --namespace-id ...`) → `bridge --health`. **Lock custody lives in the WRAPPER, not inside the Claude session (Codex SF-1):** the plist invokes a zsh wrapper that acquires the lock (pid + ISO timestamp) after preflight passes, `trap`-releases it on EVERY exit (including `claude -p` failing to launch at all) and fires a failure notification via `intake-notify.js` when the Claude call exits non-zero; the runner contract additionally releases on its own graceful exit paths (plan-review M3). Any failure: notify + exit non-zero. Machine-readable summary line for the runner.
- [ ] **B3.1b `scripts/intake-runner.config.json`** (committed): `{ "liveVerify": { "retries": 10, "intervalSeconds": 30, "calibrated": false }, "maxCandidatesPerRun": 3, "schedule": "daily 07:45" }` — B5.1 flips `calibrated:true` with measured values. Consumers: `verify-live-overlay.js`, the runner contract.
- [ ] **B3.2 `scripts/intake-kv-hygiene.js` + RED tests** (class policy, spec §3.7): dupes/declines deleted after a 7-day contact window (age from the `req:<ts>:` key timestamp); unactionable deleted immediately; `parse-error` deleted after ledgering once; `incomplete` left to TTL. Dry-run default; `--apply` deletes. Tests: fixture ledger+keylist → exact delete set; the 7-day boundary; never deletes `needs-research`/staged/parked keys.
- [ ] **B3.3 `scripts/intake-notify.js` + RED tests:** input = run-report JSON; ALWAYS writes `scripts/.printer-intake-out/last-run-report.md`; POSTs to `discordWebhookUrl` from `scripts/.printer-intake.local.json` (**URL never printed/logged** — memory `feedback_mask_secrets_before_printing`; log `webhook: set(len=N)` style only); **shipped-and-unreported freeze rule:** if the report contains a shipped candidate AND the webhook POST fails → create the freeze flag + exit non-zero. **Monthly digest (spec §8 risk 5): when the run date is the 1st, append a digest of the ledger's `auto-shipped` rows since the last digest to the report.** Tests: mock fetch; freeze created exactly in shipped+failed case; report file always written; no-webhook-configured behaves as failed-POST for the freeze rule but succeeds when nothing shipped; digest appears on the 1st and only on the 1st.
- [ ] **B3.4 `.gitignore` additions** (freeze flag, run lock, runner watermark). Verify with `git status` after touching each file.
- [ ] **B3.5 QA:** all unit suites green; preflight run for real on the mini (expected green); hygiene DRY-RUN against live KV — expected today: the two `incomplete` entries left, K2 SE untouched (staged, not terminal).
- [ ] **B3.6 hostile review → patch → commits** (one per component).

**Owner setup input (not a gate):** create the Discord webhook (suggested: `#3dpa-intake-runs`) and add `discordWebhookUrl` to `scripts/.printer-intake.local.json`. Until set, runs still work — reports land in `last-run-report.md`, and nothing can ship silently because of the freeze rule. Second setup input at B5: schedule time (proposed 07:45 daily, after agent-ops' 07:15).

## Gate B4 — contracts + PD7 + plist (the runner's brain)

- [ ] **B4.1 `ai-operating-model/docs/agents/intake-pipeline-runner.md`** (new; versioned contract the headless session executes). Must encode, from the spec: §3 stage order; runner-owned watermark (`scripts/.printer-intake-runner.watermark.json`, advanced per candidate ONLY after its ledger line lands; Scout invoked `--source kv --no-watermark --out scripts/.printer-intake-out`); staging lifecycle (terminal → delete skeleton; parked → `scripts/.printer-intake-out/parked/` with per-reason retry policy: `review-unavailable` next run, `unverified-model` weekly ×4 then expire+notify; crash leftovers resumed); PD2 auto class incl. (e) `series_group` must EXACTLY equal an existing sibling label (else `auto-parked:new-series-group`); PD4 new-brand criteria; PD5 merge gate (hostile sub-agent + `bridge --health` → `bridge --mode codex-only`, fallback `codex exec -s read-only`; any NO-GO parks, no same-run retry; Codex unreachable → `review-unavailable` park, fail-closed); strictly-serial mechanical ship on branch `intake/<printer-id>` off current `main`; **walkthrough diff-path guard (hunk-level — `git diff --stat` is file-level only and cannot prove this; Codex MF-2): `git diff --unified=0 -- scripts/walkthrough-harness.js`, reject any hunk outside the computed `COMBOS[]` array line range (array starts ~`:459`; compute the range, don't hardcode), with a test that mutates outside the block**; merge-gate `main` re-verify before merge; **iOS mirror strictly post-merge** (cp + `diff -q` + local commit; XCTest when waiver void-conditions fire); **snapshot custody: known-good snapshot taken at run start via `republish-overlay.js --snapshot` and REFRESHED after each verified candidate before the next starts** (spec §3.6 / review #5 — a run-start-only snapshot would roll back candidate 1's verified work when candidate 2 fails); PD6 verify + rollback chain (republish-overlay `--rollback-to` with `--bad-version`; **rollback-verify failure → `enabled:false` republish with the same version rule → CRITICAL notify → freeze**); **ledger custody (plan-review C1): the ledger append is a tracked-file change — each candidate's ledger line lands as its OWN commit on `main` + push BEFORE the runner watermark advances past that candidate** (a dirty tracked ledger would deadlock the next run's fail-closed preflight); **startup ledger reconciliation (Codex MF-3 — crash replay window): because the Scout runs `--no-watermark`, a crash after ledger-commit but before watermark/KV cleanup would re-stage an already-shipped candidate next run — so runner startup reconciles staged/KV candidates against the committed ledger by normalized `candidateKey` and, where a terminal outcome exists, cleans up/advances WITHOUT re-shipping or appending a duplicate line**; **app-cap lane: an app-cap candidate ships only under the protocol's reviewer-GO condition (`printer-addition-protocol.md:87-117`), else `auto-parked:app-cap-no-go`**; KV hygiene; notify (incl. the failure path); bounded per-run candidate count (from `intake-runner.config.json`, default 3); run-lock release on every exit path; PD8 freeze semantics; Android overlay noted as future extension. Cross-references: runbook (canonical on conflict), Scout + Assistant contracts.
- [ ] **B4.2 Assistant contract amendment** (`printer-addition-assistant.md`): autonomous-mode section — PD5 replaces per-candidate owner approval for PD2/PD4 classes; park lane; ledger `auto-shipped` / `auto-parked:<reason>` values; the three 2026-06-20 autonomous-run rules inherited verbatim; **Forbidden Actions tightened: never push iOS — branch or main.**
- [ ] **B4.3 runbook amendment** (`printer-addition-protocol.md`): autonomous path as a first-class mode; records the PD3 waiver (visual picker → `picker-dry-run` pre-ship + `verify-live-picker` post-deploy + owner post-ship spot check via the run report) and the PD4 waiver (new-brand criteria) as owner-ratified 2026-07-10; manual path remains valid and canonical on conflict.
- [ ] **B4.4 PD7 gather change + RED tests (ONE commit):** `intake-retrospective-gather.js` — additive `ownerResolution` values (`auto-shipped`, `auto-parked:<reason>` treated as non-miss outcomes) + **retro-tag support: for a given `candidateKey`, the LAST ledger line wins in clustering — and correction resolution reads the FULL ledger, not the watermark-gated slice** (plan-review M7: a correction appended after the original line was consumed by a prior incremental gather would otherwise arrive alone and silently no-op). **Array-vs-string `candidateKey` identity: normalize to the sorted key set for last-line-wins matching.** Tests: correction line flips a clustered miss; **cross-watermark correction case**; array-key correction matches its string/array original; `auto-*` values don't enter miss clusters; existing fixture behavior unchanged. Document (not run) the one-time owner schema-marker migration command.
- [ ] **B4.5 real plist** `scripts/launchd/dk.mragile.3dpa-intake.plist` (label `dk.mragile.3dpa-intake`, daily `StartCalendarInterval` — proposed 07:45, owner-adjustable via `intake-runner.config.json` + plist; invokes `scripts/intake-run-wrapper.sh`: preflight → lock acquire → `claude -p "$(cat scripts/intake-run-kickoff.md)"` → trap-release + failure notify; logs under `scripts/.printer-intake-out/`). **B4.5b: write `scripts/intake-run-kickoff.md`** (the exact kickoff prompt — points the session at the runner contract + config). NOT loaded yet (loading is B5 exit).
- [ ] **B4.6 runner DRY-RUN (no-merge mode):** **first re-stage the candidate from KV** (`node scripts/printer-intake-scout.js --source kv --no-watermark --out scripts/.printer-intake-out` — the 2026-07-09 staging file is not on this machine; KV `req:1783615951531:a03e6e7e` is the durable source), then execute the contract manually in a supervised session with the merge step replaced by a printed diff. **Isolation (plan-review H3): ledger writes → a temp fixture path, runner watermark untouched, KV hygiene forced dry-run, notify → local report only; delete the `intake/<id>` dry-run branch afterwards; assert `git status --porcelain` is EMPTY at dry-run end** (proves the ledger-custody design leaves no dirt). Validates stage order, staging lifecycle, ledger/notify plumbing end-to-end without shipping. (Build-phase verification, not a shadow phase: nothing here requires owner action.)
- [ ] **B4.7 hostile review (contract gets its own reviewer pass) → patch → commits.**

## Gate B5 — latency measurement, rollback drill, enablement (spec §5 build-phase exit)

- [ ] **B5.0 pre-drill snapshot (explicit; Codex SF-2):** `node scripts/republish-overlay.js --snapshot scripts/.printer-intake-out/pre-b5-latency-known-good.json` — this exact path is the drill's rollback target.
- [ ] **B5.1 deploy-latency measurement (served-asset changes ONLY — docs/scripts commits change zero served bytes per `.assetsignore`; plan-review H4):** three `republish-overlay.js --bump-version` publishes (benign, payload unchanged), each timed push→live via `verify-live-overlay.js --measure`; set `intake-runner.config.json` `liveVerify` = `ceil(p95 × 3)`-equivalent retries/interval, `calibrated:true` (raw numbers in the gate ledger). These bumps feed straight into B5.2.
- [ ] **B5.2 self-run rollback drill (real, machine-run):** treat the last B5.1 bump as the "bad" publish → invoke the PD6 rollback path for real (`--rollback-to scripts/.printer-intake-out/pre-b5-latency-known-good.json --bad-version <last bump>`) → assert live version == `max(bump, snapshot)+1` and payload hash == snapshot's → ledger + notify fire. Expected: the full chain (publish→verify→rollback→verify→report) with zero manual steps, iOS devices monotonic throughout.
- [ ] **B5.3 exit checklist (all machine-verified):** §4 component suites green ×6; B0 probe green; drill green; preflight green **and green AGAIN after the drill** (proves ledger custody left no dirt; plan-review C1); runner contract dry-run green; **webhook configured + one test POST green — a HARD enablement gate** (Codex SF-3: report-file-only mode would weaken the spec's "every run notifies" posture; without a working webhook, run 1's ship would also trip the shipped-and-unreported freeze on day one — so B5.4 does not load the plist until the test POST is green). Tick the gate ledger with evidence lines.
- [ ] **B5.4 enable:** bootstrap the real plist. **Full autonomy is live from the first scheduled run** (PD2 + PD4 classes; K2 SE is first in queue). Notify the owner via the run report channel that scheduling is active.
- [ ] **B5.5 hostile review of the session's diff → patch → commit → gate ledger final row.**

## Testing / validation strategy (spec §6 mapping)

- Every new script: node:test RED-first, fixtures only (never mutate live repo overlay/ledger in tests); full web suite (`node --test functions/api/*.test.mjs scripts/*.test.js`) green at every gate exit.
- Live interactions during build are read-only except: B0.4 scratch-branch push (deleted), B3.5 KV probe key (deleted), B5.1 measurement commits, B5.2 drill (net effect: overlay back at snapshot content, version advanced — allowed by design).
- The PD6 CRITICAL version-ordering rule is proven twice: unit (B1) and live (B5.2).

## Risks / rollback

| Risk | Mitigation | Rollback |
|---|---|---|
| B0 launchd auth fails structurally | B0.4 stop-and-escalate (PD1 alternatives) — nothing else built yet | bootout + delete plist |
| Drill leaves overlay in a bad state | drill operates on version/hash only (payload byte-identical to snapshot); PD6 chain itself is the recovery; manual `republish-overlay.js --rollback-to` as last resort | one command, documented in ledger |
| Runner ships a wrong printer | PD5 dual review on the real diff + PD2/PD4 park rules + PD6 live verify + S4 retro-tag drift detection; self-freeze on CRITICAL | `git revert` (web additive) + overlay rollback w/ version rule |
| Headless session runs away | bounded candidates/run (3), single-flight lock, freeze flag, launchctl bootout | PD8, one file |
| Webhook secret leak | gitignored config, never printed, `len=` style logging only | rotate webhook in Discord |

## Follow-ups surfaced by grounding (owner-visible, not in this plan's scope)

1. S4 ledger drift: `was-unresolved-brand` + `brandTokens:*` lines are silently non-clustered by gather (see Grounding facts) — decide extend-vocab vs retro-edit next S4 pass.
2. Scout header-comment env-var naming drift (`CF_API_TOKEN` vs documented `CLOUDFLARE_API_TOKEN`) — one-line doc fix, ride any Scout-touching commit.
3. agent-ops plist/scripts still hardcode pre-migration `/Users/mragile.io/...` paths — agent-ops-scoped fix, separate project.

## Review record for THIS plan (both gates run 2026-07-10; dispositions in [`../../reviews/2026-07-10-intake-autonomy-v2-plan-review.md`](../../reviews/2026-07-10-intake-autonomy-v2-plan-review.md))

1. Hostile sub-agent plan review: **GO-WITH-PATCHES — 1 CRITICAL (ledger-commit custody deadlock) + 4 HIGH + 9 MEDIUM + 3 LOW; all 17 applied.**
2. Codex cross-model review (`bridge --health` ok → `bridge --mode codex-only`, transcript `codex/intake-autonomy-v2-review/bridge-2026-07-10-013631-926039.md`): **GO-WITH-PATCHES — 3 must-fix (full-envelope live verify; hunk-level walkthrough guard; startup ledger reconciliation) + 2 should-fix + 1 optional; all applied.** Build session 1 (Gate B0) is cleared to start.
