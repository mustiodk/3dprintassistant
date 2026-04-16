# Session kickoff — 3D Print Assistant for macOS (v0.1)

Paste this as the first message when starting a new Cowork session dedicated to the macOS app.

---

## Context

We're starting a **new project** for the macOS version of 3D Print Assistant. Parent folder should be `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-macos/` — **ask me to confirm the folder name before creating it** (per my standing rule in CLAUDE.md).

### What this is
A native Mac app that wraps the existing web app (`3dprintassistant.com`) as a **WKWebView** with bundled offline assets. Same core product (profile generator + troubleshooter), native Mac chrome (title bar, menu bar, window state), offline-first, no account, no tracking.

Backlog reference: **#037** in `3dprintassistant/docs/planning/ROADMAP.md` (Medium value, ~half day to day).

### Why this approach (decided in 2026-04-16 session)
- Same pattern as iOS (engine.js + data/*.json bundled) but **simpler** — no JavaScriptCore bridge needed. WKWebView renders the full UI directly.
- Shares web files via the existing sync rule ("edit in web project → copy to iOS/macOS").
- Native `.app` bundle → eligible for Mac App Store.
- Real distinctive Mac feel: traffic-light window chrome, menu bar with File/View/Help, optional transparent title bar.

Rejected alternatives:
- **Electron** — 200MB binary for a pure webview wrapper. Not justified.
- **Catalyst** (run iOS app as Mac) — looks like "iPad app on Mac," not a real Mac app.
- **Tauri** — cross-platform, only if Windows is also on the roadmap now (it's #038, Larger vision — deferred).

### Pre-decision: try PWA first?
User mentioned they might want to try **Safari → Add to Dock** as a quick validation before building the real app. If they haven't decided, ask:
> "Do you want to spend 30 min polishing the PWA manifest + `apple-touch-icon` + meta tags for `3dprintassistant.com` first to validate the feel via Safari's 'Add to Dock', or go straight to building the native SwiftUI wrapper?"

If PWA first → 1 small commit on the web repo to add `manifest.webmanifest`, high-res icons, proper meta tags. Then the user tries it in Safari and decides.
If native first → proceed below.

---

## Before you do anything

1. Read `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md` in full — project rules, memory hot cache, shorthand
2. Read `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/planning/ROADMAP.md` — status table, #037 backlog row, #038 backlog row
3. Read `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant/docs/sessions/2026-04-16-cowork-appdev.md` — latest session log, tells you iOS is released/EU-blocked, web feedback migration just shipped
4. **If the macOS folder doesn't exist yet:** ask me before creating it. Then create it at `/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-macos/`.

---

## Initial plan (this session's scope)

Propose an implementation plan via EnterPlanMode. Likely structure:

### Phase 0 — scaffolding
- [ ] `project.yml` (XcodeGen) for a SwiftUI + WKWebView macOS app, deployment target macOS 14+
- [ ] `Info.plist` with app name, bundle id (`com.mragile.3dprintassistant`), icon, copyright
- [ ] `AppDelegate.swift` / `PrintAssistantApp.swift` entry (SwiftUI `@main`)
- [ ] `ContentView.swift` hosting `WKWebViewRepresentable`
- [ ] `WebView.swift` — NSViewRepresentable wrapping WKWebView, configured for local resources
- [ ] Bundle web assets — copy `3dprintassistant/index.html` + `app.js` + `engine.js` + `style.css` + `feedback-form.js` + `locales/*.json` + `data/*.json` into `Resources/web/`
- [ ] Load initial page via `loadFileURL(_:allowingReadAccessTo:)`
- [ ] Verify it runs via `xcodebuild` / open the `.app`

### Phase 1 — native chrome
- [ ] App icon (reuse iOS Benchy, resize to macOS icon sizes via `iconutil`)
- [ ] Window state persistence (remember size + position via `NSWindow` frame autosave)
- [ ] Default window size (probably 1280×900, matches typical web view)
- [ ] Optional: transparent/unified title bar for clean look
- [ ] Menu bar items:
  - File → New Window
  - View → Actual Size, Zoom In, Zoom Out (map to WKWebView zoom)
  - Help → Visit Website (opens `https://3dprintassistant.com` in default browser), Send Feedback (opens the same modal via JS call into the webview), About

### Phase 2 — offline-first verification
- [ ] Disable network access in Mac OS → confirm app still fully works (all data bundled)
- [ ] Verify the **web Feedback modal** does NOT try to call `/api/feedback` in the bundled context — this is the subtle trap. It would hit `file:///.../api/feedback` which 404s. Either:
  - (a) swap to calling `https://3dprintassistant.com/api/feedback` when running from file:// (bridge via a small protocol handler)
  - (b) strip the Feedback section entirely from the bundled HTML and expose it only via Help menu → opens browser
  - Need to decide during Phase 2

### Phase 3 — distribution
- [ ] Notarize for distribution outside App Store (DMG path)
- [ ] OR: Mac App Store submission (needs entitlements + review)
- [ ] Decide: DMG first (faster), MAS later

### Phase 4 — update ROADMAP
- [ ] ROADMAP backlog #037 → move to Completed phases, note shipped version
- [ ] Add data-sync rule for macOS to CLAUDE.md and roadmap architecture section

---

## Constraints / preferences (from CLAUDE.md)

- **Smooth, minimal, functional UI** — this project inherits the design system of the web. No extra chrome, no gradients, no flashy. Just WKWebView + native Mac defaults.
- **No build step for web assets** — they're bundled as-is. Any future engine.js change on web must be copied in (same rule as iOS).
- **Progress bar on every multi-step task** — `[🟩🟩⬜⬜ 40%] step name`. User wants to see this even for short sessions.
- **Quality over speed** — MVP is already out on other platforms. This one should feel polished from v0.1.
- **Token routing** — if the work is pure Swift/Git/file ops, prefer doing it in Claude Code (this tool) — don't offload to Gemini unless doing large-file analysis of `engine.js` etc.

---

## First question to ask me

> Before creating `3dprintassistant-macos/`, should I also plan to reuse assets from the web project (copying `engine.js`, `data/*.json`, etc. into `Resources/web/`), or do you want to start fully fresh and add assets later?

Then wait for my answer before running `mkdir` or `xcodegen`.

---

## Don't-do

- **No Chrome MCP / Cloudflare poking.** This session is Swift/Xcode only.
- **No cross-platform shortcuts** — if I ask for Windows during this session, flag it: #038 is deferred until macOS ships and validates desktop demand.
- **No changes to the iOS repo** unless explicitly requested.
- **No preview server** for the macOS app — verification is via `xcodebuild` + `open Build/Products/Debug/PrintAssistantMac.app`.
