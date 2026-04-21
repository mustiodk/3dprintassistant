# Next session — copy-paste prompt

**Last updated:** 2026-04-21 (end of [`2026-04-21-cowork-appdev.md`](2026-04-21-cowork-appdev.md), after the md-hygiene sweep).

Copy everything between the `>>> START >>>` and `<<< END <<<` markers below into a fresh Cowork session to kick off the next one.

**Queue note:** IR-0 `[CRITICAL-003]` (unknown preset-ID silent fallback) is **deferred by one session** to land this security + cleanup pass first. After this session, regenerate `NEXT-SESSION.md` with the CRITICAL-003 prompt (the handoff for that task is preserved in the end of `2026-04-21-cowork-appdev.md`).

---

>>> START >>>

Start a new appdev-housekeeping session.

This session interrupts the IR-0 engine queue for one focused security + cleanup pass. CRITICAL-003 resumes next session.

Read, in order:
1. `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — standing rules (always). Pay attention to the new "Md-hygiene evaluation" standing rule and the Session-log protocol.
2. `3dprintassistant/docs/planning/ROADMAP.md` — check "Last updated" and the IR-0 section. `[LOW-001]` (Sentry DSN rotation) is on that list — this session closes it.
3. `3dprintassistant/docs/sessions/INDEX.md` — skim the top 5 entries.
4. The last 3 session logs (in full — not just the INDEX one-liner). Newest first:
   - `docs/sessions/2026-04-21-cowork-appdev.md` — today's CRITICAL-002 fix + the md-hygiene sweep findings at the end (the "Follow-up" section is effectively this session's scope sheet).
   - `docs/sessions/2026-04-21-cowork-appdev-consolidation.md`
   - `docs/sessions/2026-04-20-cowork-appdev-review-package.md`

Today: batch secrets rotation + iOS root stub cleanup + web untracked-doc promotion. Zero source-code changes; filesystem + git + external-console work only.

Scope (four chunks, one commit per chunk — don't batch):

**Chunk 1 — iOS `.gitignore` tightening (BEFORE touching any secret).** On `3dprintassistant-ios`:
- Append to `.gitignore`: `*.p8`, `*.mobileprovision`, `*.certSigningRequest`, `AuthKey_*`, `_test/` (contains test JSON outputs, not source).
- Verify no currently-tracked file matches the new patterns: `git ls-files | grep -E '\.(p8|mobileprovision|certSigningRequest)$|^AuthKey_'`. Must return empty.
- Commit: `iOS: gitignore Apple keys + provisioning + test artefacts`.

**Chunk 2 — Rotate + revoke the four secrets (owner-driven, Claude assists).** Done via web consoles — Claude should NOT run any command that touches the rotated values.
- **Sentry DSN** (IR-0 `[LOW-001]`): owner revokes old DSN on sentry.io + creates new → Claude helps update `Config.xcconfig` locally + confirms `.gitignore` keeps it out → owner triggers next TestFlight build via CI secret update. Commit: `iOS: rotate Sentry DSN [LOW-001]` (Config.xcconfig is gitignored so commit is for the build / CI side).
- **App Store Connect API key** (`AuthKey_MHDMJN32AP.p8`): owner revokes the key on App Store Connect → generates new → downloads new `.p8` to local machine → `rm` the old `.p8` from the working tree → verify Fastlane / CI references the new key id. No git commit (file was never tracked; only `.gitignore` guards it).
- **Provisioning profile + CSR**: owner regenerates `3DPrintAssistant_AppStore.mobileprovision` from Apple Developer + downloads to keychain. Delete the local copies from the working tree (`rm` — single-use, no value in keeping). `CertificateSigningRequest.certSigningRequest` is likewise single-use; `rm`.
- **GitHub PAT** in the `claude-projects` Projects-root repo's remote URL: owner revokes the PAT at github.com/settings/tokens → runs `gh auth login` (or `git remote set-url origin https://github.com/mustiodk/claude-projects.git` after configuring a credential helper or SSH) → verify with `git remote -v` that the URL no longer contains `ghp_*`.

**Chunk 3 — iOS root stub removal.** On `3dprintassistant-ios`:
- `git rm` nine root files (all 5–7 line deprecated redirects, targets verified to exist):
  - `IMPLEMENTATION_PLAN.md`, `TASKS.md`, `UI-CRITIQUE.md`, `UI-V2-SPEC.md`, `ROADMAP.md`, `fresh-session-prompt.md`, `phase-2.5b-code-prompt.md`, `phase-2.7a-export-prompt.md`, `phase-2.7b-descriptions-prompt.md`.
- Commit: `iOS: retire 9 deprecated root stubs (targets live under web docs/)`.
- Push iOS main (no source changes → no TestFlight build triggered; still confirm CI state after push).

**Chunk 4 — Web untracked promotion + archive.** On `3dprintassistant`:
- `git add docs/prompts/phase-2.5b-code-prompt.md phase-2.7a-export-prompt.md phase-2.7b-descriptions-prompt.md`.
- `git add docs/research/` (5 files: ChatGPT review, UI-CRITIQUE, Bambu spec, JSON schema, Gemini prompt).
- `git add docs/sessions/2026-04-10-cowork-appdev.md docs/sessions/2026-04-13-cowork-appdev.md` (listed in INDEX — otherwise links are broken on github.com).
- `rm docs/planning/fresh-session-prompt.md` (25 lines, superseded by NEXT-SESSION.md).
- Archive `docs/planning/iOS-RELEASE-PLAN.md` (161 lines, pre-ship plan — iOS shipped 2026-04-16) → `_archive/3dprintassistant-iOS-RELEASE-PLAN-pre-ship-2026-04-08.md` with a small provenance header matching the BACKLOG archive format. Then `rm` the original.
- Decide on `bambu configs/`, `research md/`, `slicer data img/`, `discord_admin_logo.png`, `logo.png`, `icon-raw.png_1.png`: these look like personal scratch / source material. Default action: add each top-level folder/file to `.gitignore` (don't commit, don't delete — owner keeps them locally).
- Commit: `docs: track referenced prompts + research + session logs; archive iOS-RELEASE-PLAN`.

Process:
1. Propose each chunk in plain English before executing. Chunks 2a/2b/2c/2d (the four rotations) MUST wait for owner confirmation between each — the owner is operating external web consoles in parallel.
2. Don't push iOS main until chunks 1 + 3 are green locally and owner has confirmed the new Sentry DSN is in `Config.xcconfig`.
3. Write the session log to `docs/sessions/2026-04-22-cowork-appdev-housekeeping.md` (or whatever the date is). Durable context section MUST call out: (a) which keys were rotated (IDs only, never values), (b) any CI secret names that changed, (c) anything left undone.
4. Update INDEX.md with a new top bullet.
5. Regenerate `NEXT-SESSION.md` pointing at CRITICAL-003 — the handoff text already exists at the end of `2026-04-21-cowork-appdev.md`, reuse it.

Standing rules (don't drift):
- Progress bar on every multi-step task: `[🟩🟩⬜⬜⬜⬜ 40%] step`.
- Md-hygiene sweep at session end (new standing rule — see `CLAUDE.md`).
- ROADMAP is truth. Tick `[LOW-001]` when the Sentry DSN rotation lands.
- Right thing not easy thing. Rotate, don't "just update the .gitignore and hope."
- Don't push iOS main without owner sign-off for the rotation-adjacent commit (Chunk 2a).
- One finding = one commit. Four chunks = at least four commits.

<<< END <<<

---

## How to maintain this file

- **Every session end**, I rewrite this file with the prompt for the next session — populated from the "Next session" / "Open questions" sections of the session log I just wrote, plus any md-hygiene findings surfaced in that session.
- **No other file** serves this role. If this file is stale (last-updated > 7 days), ask me to regenerate from the most recent session log.
- **Owner action**: just copy-paste the block between the markers. Nothing else to do.
- **Queue pointer** at the top ("Queue note") tracks what's being deferred so nothing falls off.
