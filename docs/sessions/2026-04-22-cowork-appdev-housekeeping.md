# 2026-04-22 — Cowork (appdev): security rotations + md hygiene

## Durable context

What a future session needs to know that ROADMAP doesn't capture:

- **Keys rotated in this session (IDs only, never values).**
  - Sentry: public key `0aa31ac865f8…` revoked + deleted → replaced by `2585aa9f91dc…` on the same project (apple-ios). Project id `4511157747318864`, org id `4511144446001152`, region `ingest.de.sentry.io`. Ingest endpoint verified HTTP 200 against the new key (synthetic event `28a76ba98dc5…`, dashboard Issues tab shows it landed).
  - App Store Connect API key: old key id `MHDMJN32AP` revoked on ASC → replaced by `SF8C66YLJY`. Issuer id unchanged (`ceb7e0f2-d1aa-40c2-9463-c65026911248`). New `.p8` lives at `3dprintassistant-ios/asc keys/AuthKey_SF8C66YLJY.p8` (gitignored via `AuthKey_*`). Independently verified end-to-end: built an ES256-signed JWT locally with the new `.p8`, called `GET /v1/apps` on App Store Connect API → HTTP 200, returns the "3D Print Assistant" app entry (id `6761634761`). Next TestFlight build will be the final integration proof.
  - Provisioning profile (`3DPrintAssistant_AppStore.mobileprovision`): **not regenerated** — Fastlane's `sigh` action downloads a fresh profile from ASC on every CI build (Fastfile line 14). The local copy was pure leftover from 2026-04-04 manual builds and had been unused since CI took over. Deleted from the working tree; new ones will never be tracked thanks to `*.mobileprovision` gitignore.
  - CSR (`CertificateSigningRequest.certSigningRequest`): single-use scaffolding, consumed when the distribution cert was issued on 2026-04-04. Deleted from the working tree.
  - GitHub PAT `ghp_25n09TxKAqv…` (sitting in plaintext in the Projects-root `.git/config` remote URL): revoked on github.com (it was the `claude-sync` token). A second unused token `claude-deploy` with `repo+workflow` scope and no expiration was also deleted while there — dead weight, never consumed. Remote URL stripped back to `https://github.com/mustiodk/claude-projects.git` (no embedded creds). Git auth now flows through the pre-existing `gh auth git-credential` helper globally configured in `~/.gitconfig`, which pulls an OAuth token (`gho_…`) from the macOS keychain. Verified with `git fetch origin` post-revocation — clean pass.

- **CI secret names updated (for future reference / runbook).**
  - `SENTRY_DSN` (iOS GitHub repo) — new Sentry DSN value.
  - `ASC_API_KEY_ID` (iOS GitHub repo) — `SF8C66YLJY`.
  - `ASC_API_KEY_CONTENT` (iOS GitHub repo) — full PEM block of the new `.p8`.
  - `ASC_API_ISSUER_ID` (iOS GitHub repo) — defensively rewritten with the known-good value (GitHub secrets are write-only so we can't read them back; no-op if it was already correct).
  - No changes needed to `CERTIFICATE_P12_BASE64` or the p12 password secret — we didn't rotate the distribution cert (only the API key), so the p12 is still the correct one.

- **Security rationale (why these four, why now).** Three of the four were prophylactic — the `.p8`, `.mobileprovision`, and `.certSigningRequest` were sitting *untracked* in the iOS working tree where a stray commit or backup would have leaked them; rotation + tightened `.gitignore` means a future mistake can't leak the current credentials. The other two were real incidents: (a) the old Sentry DSN was already in git history (commit `e707df4`) before RB-3 moved it to `Config.xcconfig` — anyone reading the public repo could extract it; (b) the GitHub PAT was in `.git/config` in plaintext, one `cat` away from leaking via a support ticket, screen share, or backup.

- **Sentry returns HTTP 200 at the ingest edge for deleted keys — but drops the events server-side.** Verified by the owner's Issues-tab screenshot: the 1 synthetic event sent via the **new** DSN is visible; all 3 synthetic events sent via the **deleted old** DSN are not. So `curl`-level verification of DSN liveness is misleading (endpoint always 200s); the only reliable check is whether the event appears in Issues. Sentry rotation is fully effective in the way that matters.

- **iOS working-tree carries substantial untracked drift beyond this session's scope.** After the session's commits, the tree still has: 9 `D` state flat-layout screenshots (`docs/screenshots/01-home.png`…`09-checklist.png`) replaced by a new `iphone/ipad/` subfolder layout; large untracked `docs/` additions (`app-store-metadata.md`, `app-store-privacy-labels.md`, `privacy-policy.md`, `prompts/`, `screenshots/_backup-apr{8,14,15}/`, `screenshots/ipad/`, `screenshots/iphone/`); untracked `memory/` and `research/` folders at the repo root; icon artefacts (`AppIcon-1024.png`, `AppIcon-clean.png`, `icon-raw.png_{1,2}.png`). None of these are in scope for a security/cleanup pass, but the doc-sprawl situation on iOS is genuinely untidy — worth a dedicated "iOS doc hygiene" session later.

## Context

Interrupt session — paused IR-0 `[CRITICAL-003]` for one focused security + cleanup pass. Scope: rotate four credentials (Sentry DSN, ASC API key, provisioning profile, GitHub PAT), tighten iOS `.gitignore`, retire 9 deprecated root stubs on iOS, promote untracked docs on web, archive pre-ship planning doc. Zero source-code changes. Four chunks, one commit per chunk. CRITICAL-003 resumes next session.

## What happened / Actions

Executed in order: Chunk 1 → Chunk 3 → Chunk 4 → Chunk 2a/b/c/d. Non-rotation chunks went first so the Sentry DSN commit could ride on the same iOS push as the .gitignore + stub-removal. Verification where feasible: synthetic Sentry curl event against new DSN (200 ✓, event visible in Issues); ES256 JWT + ASC API call against new `.p8` (200 ✓, returns app entry); `git fetch origin` on Projects-root after PAT revocation (success ✓).

## Files touched

### Web (`3dprintassistant`)

**Modified:**
- `.gitignore` — appended personal-scratch section (`bambu configs/`, `research md/`, `slicer data img/`, `discord_admin_logo.png`, `logo.png`, `icon-raw.png_1.png`).
- `docs/planning/ROADMAP.md` — ticked `[LOW-001]` with a one-line outcome.

**Added (promoted from untracked):**
- `docs/prompts/phase-2.5b-code-prompt.md`
- `docs/prompts/phase-2.7a-export-prompt.md`
- `docs/prompts/phase-2.7b-descriptions-prompt.md`
- `docs/research/3dprintassistant_ios_master_release_review.md`
- `docs/research/UI-CRITIQUE.md`
- `docs/research/bambu-studio-export-spec-gemini.md`
- `docs/research/bambu-studio-json-schema.md`
- `docs/research/gemini-bambu-analysis-prompt.md`
- `docs/sessions/2026-04-10-cowork-appdev.md`
- `docs/sessions/2026-04-13-cowork-appdev.md`

**Deleted (untracked → removed from filesystem, not from git):**
- `docs/planning/fresh-session-prompt.md` (superseded by `NEXT-SESSION.md`).
- `docs/planning/iOS-RELEASE-PLAN.md` (archived — see below).

### Projects root (`claude-projects`)

**New:**
- `_archive/3dprintassistant-iOS-RELEASE-PLAN-pre-ship-2026-04-08.md` — the archived iOS-RELEASE-PLAN with a provenance header matching the BACKLOG archive format.

### iOS (`3dprintassistant-ios`)

**Modified:**
- `.gitignore` — appended `*.p8`, `*.mobileprovision`, `*.certSigningRequest`, `AuthKey_*`, `_test/`.
- `Config.xcconfig` — new `SENTRY_DSN` value (still gitignored, not committed).

**Deleted (tracked):**
- `IMPLEMENTATION_PLAN.md`, `TASKS.md`, `UI-CRITIQUE.md`, `UI-V2-SPEC.md` — 4 deprecated root stubs. (Their HEAD content was the full pre-stub planning docs, ~1332 lines — see "Open questions".)

**Deleted (untracked — filesystem only):**
- `ROADMAP.md`, `fresh-session-prompt.md`, `phase-2.5b-code-prompt.md`, `phase-2.7a-export-prompt.md`, `phase-2.7b-descriptions-prompt.md` — 5 untracked root stubs.
- `AuthKey_MHDMJN32AP.p8` — old ASC API key.
- `3DPrintAssistant_AppStore.mobileprovision` — single-use leftover.
- `CertificateSigningRequest.certSigningRequest` — single-use leftover.

**Untracked, preserved locally:**
- `asc keys/AuthKey_SF8C66YLJY.p8` — new ASC API key. Gitignored by `AuthKey_*` pattern.

## Commits

**Web (`3dprintassistant`) — pushed to `main`:**
- `9cf249c` — `docs: track referenced prompts + research + session logs; archive iOS-RELEASE-PLAN` (Chunk 4)
- `ad9ab31` — `roadmap: tick [LOW-001] — Sentry DSN rotated` (Chunk 2a completion)

**iOS (`3dprintassistant-ios`) — pushed to `main`:**
- `40ace9b` — `iOS: gitignore Apple keys + provisioning + test artefacts` (Chunk 1)
- `283c6f7` — `iOS: retire 9 deprecated root stubs (targets live under web docs/)` (Chunk 3)

CI triggered on both pushes. iOS push carries no source change; expect green test run but no TestFlight upload (no version bump).

## Data/logic change evaluation (standing rule)

- No engine / data / app code touched. No evaluation required.
- Web UI: unchanged.
- iOS UI: unchanged.
- Next CI-built TestFlight binary will automatically pick up the new Sentry DSN via the refreshed `SENTRY_DSN` secret; nothing to verify in-app until then (or do a manual local build to test).

## Md-hygiene sweep (new standing rule)

Findings from the end-of-session scan:

1. **Root stubs retired.** 9 iOS root stubs removed (tracked via Chunk 3). All targets verified to exist under `3dprintassistant/docs/`.
2. **Untracked-but-should-be-tracked promoted on web.** 10 files added via Chunk 4. `github.com` links in ROADMAP + INDEX no longer 404.
3. **Secrets in the tree:** 4 found (1 .p8, 1 .mobileprovision, 1 .certSigningRequest, 1 PAT-in-URL). All four rotated + removed this session. `.gitignore` updated to block future instances.
4. **Content buried in session logs:** none new. The durable context above captures everything rotation-adjacent.
5. **Stale ROADMAP sections:** none — ROADMAP header refreshed to 2026-04-21 in the prior session; `[LOW-001]` tick is the only ROADMAP change this session.
6. **Duplicate specs/plans:** none created. The `iOS-RELEASE-PLAN.md` was a solo doc that became irrelevant after ship; archived not deleted, per convention.

Outstanding (beyond this session's scope, surfaced for owner review):

- **iOS doc drift beyond the 9 stubs.** ~12 untracked files/folders + 9 deleted-flat screenshots. Owner call: stage + commit as-is, or is there a restructure in flight? See the "Open questions" bullet.

## Open questions / owner asks

- ~~**Sentry old-DSN events — do they appear in Issues?**~~ **Resolved 2026-04-22 (same session).** Owner confirmed via Issues-tab screenshot: only the new-DSN test event is visible; the 3 old-DSN test events never appear. Rotation verified end-to-end.
- **Pre-existing iOS stubs had full HEAD content (~1332 lines).** The 4 tracked stubs (`IMPLEMENTATION_PLAN.md`, `TASKS.md`, `UI-CRITIQUE.md`, `UI-V2-SPEC.md`) appeared in `git status` as `M` because their HEAD state was still the full pre-stub planning docs — working-tree copies had been replaced with 5-7 line redirects but the replacement was never committed. Final state is correct regardless (the `git rm` removed the HEAD long-form version). Mentioning for the record.
- ~~**iOS working-tree drift cleanup.**~~ **Resolved 2026-04-22 (bonus round, same session).** Triaged + shipped as iOS `26f78aa` + web `43c10f9`: promoted `docs/app-store-metadata.md`, `docs/app-store-privacy-labels.md`, `docs/screenshots/iphone/`, `docs/screenshots/ipad/`; retired `research/` (4 stubs), `memory/` (3 superseded notes), 3× `docs/screenshots/_backup-apr*` (5.4 MB), `docs/privacy-policy.md` (subsumed by web `privacy.html`), 9 flat-layout screenshots; moved `docs/prompts/rb2-actor-prompt.md` to web `docs/prompts/` for consistency with phase-2.5b/2.7a/2.7b; moved icon-source PNGs to a new gitignored `_art/` folder; fixed the `phase-2.7a-export-prompt.md` reference paths that pointed at the retired iOS `research/` stubs.
- ~~**`asc keys/` folder location.**~~ **Resolved 2026-04-22 (bonus round, same session).** `.p8` moved to `~/.appstoreconnect/private_keys/AuthKey_SF8C66YLJY.p8` (Apple/Fastlane convention). Perms tightened: `~/.appstoreconnect` + subdirs `700`, `.p8` file `600`. `asc keys/` folder removed from the iOS repo. CI unaffected (Fastlane reads `ASC_API_KEY_CONTENT` from env, not a file path); local `fastlane`/`xcrun altool` now find the key at the default location without config.

## Next session

Resume IR-0 at `[CRITICAL-003]` — preset-ID validation in `resolveProfile` (unknown `surface`/`strength`/`speed` → coerce to default + warn `invalid_preset`). iOS test mirror to match. One commit. Handoff details already captured in the "Next session" section of `2026-04-21-cowork-appdev.md` — `NEXT-SESSION.md` regenerated to point there.
