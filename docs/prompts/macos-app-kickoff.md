# Session kickoff — 3D Print Assistant for macOS (v0.1)

Paste this as the first message when starting a fresh Cowork session dedicated to the macOS app.

---

## Context

We're starting a **new project**: native macOS companion app for 3D Print Assistant. Parent folder is `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-macos/`. **Before creating the folder, confirm the name with me** (per my standing rule in CLAUDE.md).

**Backlog entry:** #037 in `3dprintassistant/docs/planning/ROADMAP.md` (Medium value).

---

## Architecture (decided — do not re-litigate)

**Path 3: SwiftUI + WKWebView with bundled offline assets.**

```
┌──────────────────────────────────┐
│  PrintAssistantMac.app (~8 MB)   │
│                                  │
│  ┌────────────────────────────┐  │
│  │ SwiftUI window chrome      │  │
│  │ (title bar, menus, sizing) │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ WKWebView                  │  │
│  │   ↓ loads                  │  │
│  │   file:///Resources/web/   │  │
│  │     index.html             │  │
│  │     app.js                 │  │
│  │     engine.js              │  │
│  │     style.css              │  │
│  │     feedback-form.js       │  │
│  │     data/*.json            │  │
│  │     locales/*.json         │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
   No network needed for core use.
   Only /api/feedback hits network.
```

### Why Path 3 (and not Path 2 or 2.5)
- **Matches product ethos** — "free, offline, no tracking" stays true on Mac
- **Consistent with iOS** — same "edit web, copy to app" discipline, same offline-first behavior
- **Stronger Mac App Store story** — has native value (works offline), not "just a website wrapper"
- **No server dependency** — Cloudflare outage doesn't break Mac users

### Rejected alternatives (documented so we don't revisit)
- **Path 2** (loads live `https://3dprintassistant.com`): breaks offline, slower cold start, Cloudflare becomes a dependency, weaker App Store review story
- **Path 2.5** (bundled logic + live data fetch): marginal benefit for extra plumbing; data files are KB-scale so bundling them isn't a cost
- **Electron**: 200MB binary for a webview wrapper. No.
- **Catalyst**: looks like "iPad app on Mac," not a real Mac app
- **Tauri**: would make sense if Windows were active roadmap, but #038 is Larger Vision and gated behind macOS success

---

## Required mitigations (these are NOT optional — they're what makes Path 3 sustainable)

### Mitigation 1: Automated web-asset sync
Sync rule must not rely on human memory. Pick ONE of:

**Option A (preferred) — Xcode Build Phase:**
Run Script phase, before "Copy Bundle Resources":
```bash
WEB="${SRCROOT}/../3dprintassistant"
DEST="${SRCROOT}/PrintAssistantMac/Resources/web"
rm -rf "$DEST"
mkdir -p "$DEST"
cp "$WEB/index.html" "$WEB/app.js" "$WEB/engine.js" "$WEB/style.css" "$WEB/feedback-form.js" "$DEST/"
cp -R "$WEB/data" "$WEB/locales" "$DEST/"
```

**Option B — standalone `sync-web-assets.sh`:**
Same commands. Developer runs it manually before opening Xcode. Less safe (easy to forget).

Go with Option A. Build Phase = zero manual load, impossible to forget.

### Mitigation 2: `/api/feedback` protocol-aware submission
Edit `feedback-form.js` (in the web repo — this fix lives there, not in Mac repo):

```js
// feedback-form.js onSubmit()
const apiBase = (location.protocol === 'file:')
  ? 'https://3dprintassistant.com'
  : '';  // same-origin on web
const res = await fetch(`${apiBase}/api/feedback`, { ... });
```

Also must update the Cloudflare Worker's CORS allowlist in `functions/api/feedback.js` to allow `file://` origin (or: skip the Origin check when the Origin header is missing/null, which is what WKWebView on macOS sends for file:// pages).

**Decision needed in session:** safer CORS model for this case. Options:
- (a) Allow `null` Origin — permissive, simplest
- (b) Whitelist a custom user-agent header the Mac app sends — tighter but more code
- (a) is probably fine for a hobby app; flag the trade-off when you get to it.

### Mitigation 3: Document the sync rule
Update `3dprintassistant/CLAUDE.md` and/or `3dprintassistant-macos/CLAUDE.md`:

> **Data sync rule (macOS):** `engine.js`, `data/*.json`, `locales/*.json`, and UI files (`index.html`, `app.js`, `style.css`, `feedback-form.js`) live in the web repo. The Mac repo's Xcode Build Phase copies them into `Resources/web/` at build time. Never edit them in the Mac repo.

Same pattern as iOS data sync rule, just swap iOS → macOS.

---

## Before you do anything

1. Read `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` — project rules, memory hot cache, shorthand
2. Read `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md` — status table + #037 backlog row (Path 3 decision + mitigations spelled out)
3. Read `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-04-16-cowork-appdev.md` — latest session log, tells you iOS is released/EU-blocked, web feedback just migrated
4. **Confirm folder name with me** before running `mkdir 3dprintassistant-macos`.

---

## Implementation plan (propose via EnterPlanMode)

### Phase 0 — scaffolding (30 min)
- [ ] Create `3dprintassistant-macos/` folder (after my confirmation)
- [ ] `project.yml` (XcodeGen) — macOS 14+ deployment target, bundle id `com.mragile.3dprintassistant`, SwiftUI app
- [ ] `PrintAssistantMacApp.swift` — `@main` SwiftUI app
- [ ] `ContentView.swift` — window hosting the web view
- [ ] `WebView.swift` — `NSViewRepresentable` wrapping WKWebView
- [ ] `AppConstants.swift` — web URL, feedback URL, etc.
- [ ] Bundle seed: copy web files into `Resources/web/` manually for first build (Build Phase comes in Phase 1)
- [ ] Load `Resources/web/index.html` via `loadFileURL(_:allowingReadAccessTo:)`
- [ ] Verify it runs: `xcodegen generate && xcodebuild build -scheme PrintAssistantMac CODE_SIGNING_ALLOWED=NO` → open the `.app`

### Phase 1 — Build Phase sync (15 min) — **Mitigation 1**
- [ ] Add "Run Script" Build Phase to Xcode project.yml (pre-Copy-Bundle-Resources)
- [ ] Script body from the snippet above
- [ ] Delete seed files from git (only `.gitignore` the `Resources/web/` directory — files are generated at build)
- [ ] Verify: edit engine.js in web repo, rebuild Mac app, confirm change is visible

### Phase 2 — /api/feedback protocol fix (20 min) — **Mitigation 2**
- [ ] Edit `3dprintassistant/feedback-form.js` → add `apiBase` const based on `location.protocol`
- [ ] Edit `3dprintassistant/functions/api/feedback.js` → decide CORS policy for `null` origin (recommend: allow null since it's always from a bundled app submitting with the standard user-agent pattern)
- [ ] Verify on web (still works from browser), verify on Mac app (works from bundle)
- [ ] Commit + push the web changes — auto-deploys to Cloudflare

### Phase 3 — native Mac chrome (1–2 hours)
- [ ] App icon — reuse iOS Benchy, generate `.icns` via `iconutil` from 1024×1024 + sizes (512,256,128,64,32,16 @1x and @2x)
- [ ] Window state persistence — `NSWindow` frame autosave name
- [ ] Default window size (1280×900 feels right for the web layout)
- [ ] Menu bar:
  - File → New Window (duplicate window)
  - Edit → standard edit menu (auto-populated by SwiftUI)
  - View → Actual Size (⌘0), Zoom In (⌘+), Zoom Out (⌘−) → bind to `webView.magnification`
  - Help → "Visit Website" (opens `https://3dprintassistant.com` in default browser), "Send Feedback" (JS bridge: execute `FeedbackForm.open('generalFeedback')` in webview), "About 3D Print Assistant"
- [ ] Optional polish: transparent unified title bar for a cleaner look

### Phase 4 — verification
- [ ] Disable all network (Little Snitch block or airplane mode equivalent)
- [ ] Verify entire app works except Feedback submit (which should show a clean error)
- [ ] Enable network, verify Feedback submit lands in `#web-app-feedback` with the expected embed
- [ ] Run on multiple window sizes: 800×600, 1280×900, 1920×1080, 2560×1440 — check for layout issues

### Phase 5 — distribution decision
- [ ] Decide: DMG (direct download, sign + notarize) OR Mac App Store (more friction but discoverability)
- [ ] DMG recommended for v0.1 — faster to ship, no review wait
- [ ] MAS later in a follow-up session

### Phase 6 — ROADMAP + CLAUDE.md housekeeping
- [ ] Move #037 from backlog to Completed phases with shipped version
- [ ] Create `3dprintassistant-macos/CLAUDE.md` with architecture notes + build commands
- [ ] Add the macOS data-sync rule to the web repo's CLAUDE.md

---

## Constraints / preferences (from user's CLAUDE.md)

- **Smooth, minimal, functional** — inherits web design system. No extra chrome, no gradients.
- **Progress bar on every multi-step task** — `[🟩🟩⬜⬜ 40%] step name`. Show it every time.
- **Quality over speed** — MVP is out on other platforms. v0.1 here should feel polished.
- **Token routing** — Swift/Git/file ops stay in Claude Code (this session). Don't offload to Gemini.

---

## Don't-do

- **No Chrome MCP / Cloudflare dashboard poking this session** — the Cloudflare env + Worker are set up, no changes needed. If I ask you to make a CORS change, just edit `functions/api/feedback.js` and push. Don't touch the dashboard.
- **No changes to the iOS repo** unless explicitly asked
- **No preview server for the Mac app** — verification is via `xcodebuild` + opening the `.app`
- **No re-debate of Path 2 vs 3** — decision is locked. If you think of a reason to revisit, raise it as an `AskUserQuestion` but frame it as "I noticed X, should we reconsider?", don't unilaterally change direction
- **Windows support (#038) is off-topic for this session**

---

## First question to ask me

> Confirming scaffold: folder name `3dprintassistant-macos`, bundle id `com.mragile.3dprintassistant`, macOS 14+ deployment target, app name "3D Print Assistant" — any changes before I start Phase 0?

Then wait for my answer.
