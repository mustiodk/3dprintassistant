# Setup — run web + iOS locally

## Web

### Requirements
- Node 18+ (for the static file server)
- A modern browser (Chrome / Safari / Firefox)

### Clone + run
```bash
git clone https://github.com/mustiodk/3dprintassistant.git
cd 3dprintassistant
git checkout c4c5071    # The reviewed revision (2026-04-20)

# Serve statically
npx serve -l 4200 .
```

Then open <http://localhost:4200>. No build step. Edit `engine.js` / `app.js` / `data/*.json` and reload the page to see changes.

### Check the Cloudflare side (optional)
The Cloudflare Worker lives at `worker.js` + `wrangler.toml`. If you want to test `/api/feedback` locally:

```bash
npm install -g wrangler
wrangler dev
```

You won't have the `DISCORD_WEBHOOK_URL` secret — the Worker will return `webhook_not_configured` (HTTP 500). That's expected and is a valid negative test.

## iOS

### Requirements
- macOS 15+
- Xcode 16+ (Xcode 26 is what CI uses; earlier versions may still work)
- Ruby 3.3 + Bundler (for fastlane)
- An iOS 17 Simulator (built-in with Xcode)
- Optional: XcodeGen (`brew install xcodegen`) if you need to regenerate `project.pbxproj`

### Clone
```bash
git clone https://github.com/mustiodk/3dprintassistant-ios.git
cd 3dprintassistant-ios
git checkout 24aef66   # The reviewed revision (2026-04-20)
```

### Create a placeholder secrets file
The real `Config.xcconfig` is gitignored (contains Sentry DSN + Discord webhook URL). Use the template:

```bash
cp Config.xcconfig.template Config.xcconfig
# Contents are fine as-is (empty values). App will launch but won't send
# Sentry events or Discord feedback — that's expected in review.
```

### Build + run in Simulator
Open `3DPrintAssistant.xcodeproj` in Xcode, pick an iPhone 17 Pro simulator, hit ⌘+R.

Or from CLI:
```bash
xcodebuild build \
  -project 3DPrintAssistant.xcodeproj \
  -scheme 3DPrintAssistant \
  -destination "platform=iOS Simulator,name=iPhone 17 Pro" \
  -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO
```

`CODE_SIGNING_ALLOWED=NO` is required for simulator builds because the dev certs on the simulator path throw SIP-protected xattr errors in some configurations.

### Run tests
```bash
xcodebuild test \
  -project 3DPrintAssistant.xcodeproj \
  -scheme 3DPrintAssistant \
  -destination "platform=iOS Simulator,name=iPhone 17 Pro" \
  -derivedDataPath build \
  -only-testing:3DPrintAssistantTests \
  CODE_SIGNING_ALLOWED=NO
```

Expected: **20 tests pass, 0 failures, 0 skipped.** Runtime < 1 minute.

The suite covers:
- Engine bridge health (`EngineServiceTests` — 18 tests)
- Feedback payload shape (`FeedbackTests` — 9 tests)
- OutputViewModel state transitions (`OutputViewModelTests` — 5 tests)
- Plus the two new IMPL-040 parity guards (`testSurfaceChipDescsMatchResolveProfileEmission`, `testSupportChipDescsMatchResolveProfileEmission`) — these are the tests that enforce the "chip desc number equals engine emission" invariant.

### UI tests (cross-device screen capture)
Documented in `3dprintassistant-ios/CLAUDE.md`. Not required for this review unless you want to reproduce the prior cross-device UI review.

## Shared engine verification

To verify that web + iOS both run the identical engine:

```bash
cd 3dprintassistant
cmp -s engine.js ../3dprintassistant-ios/3DPrintAssistant/Engine/engine.js \
  && echo "engines identical" || echo "engines drifted"
```

Every shared data file should also compare identical:

```bash
W=./data I=../3dprintassistant-ios/3DPrintAssistant/Data
for f in printers.json materials.json nozzles.json \
         rules/environment.json rules/objective_profiles.json \
         rules/warnings.json rules/troubleshooter.json \
         rules/slicer_capabilities.json; do
  cmp -s "$W/$f" "$I/$f" && echo "✓ $f" || echo "✗ $f drifts"
done
```

Locale files are also shared:

```bash
cmp -s ./locales/en.json ../3dprintassistant-ios/3DPrintAssistant/Resources/en.lproj/en.json && echo "✓ en.json"
cmp -s ./locales/da.json ../3dprintassistant-ios/3DPrintAssistant/Resources/da.lproj/da.json && echo "✓ da.json"
```

If any of these drift in the reviewed revision, that's a finding.

## Live deployment (reference only)

- **Web production:** [3dprintassistant.com](https://3dprintassistant.com) (Cloudflare Pages / Workers Builds; auto-deploys on push to `main`).
- **iOS production:** [apps.apple.com/app/3d-print-assistant/id6761634761](https://apps.apple.com/app/3d-print-assistant/id6761634761) (generic storefront link — auto-routes per region. Live in ~121 non-EU countries. EU blocked on DSA Trader Status verification.)

## Don't-do reminders

- **Do not push to either `main`.** Both CIs auto-deploy. Work in a branch.
- **Do not commit the `Config.xcconfig` with real secrets** (even for testing). It's gitignored for a reason.
- **Do not increment the iOS `MARKETING_VERSION`** — that's a release action the owner handles.
