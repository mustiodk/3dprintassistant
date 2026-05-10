# Profile/Data Change Test Protocol

This is a lightweight release checklist for a single-person hobby project. The goal is to catch real profile/data regressions without turning every small change into ceremony.

## Default Rule

If a change touches `engine.js`, `data/*.json`, warnings, exports, or anything visible in the generated profile, run the **standard gate** before pushing.

## Standard Gate

Run these from the web repo:

```bash
node scripts/validate-data.js
node scripts/profile-matrix-audit.js > docs/reviews/YYYY-MM-DD-profile-matrix-audit.md
```

Pass criteria:

- data validation passes
- curated scenarios have `0` core failures
- broad sweep has `0` invariant failures
- no surprising UX warnings

If the change is for iOS/TestFlight, also sync the changed bundled files and run the iOS unit tests:

```bash
xcodebuild test \
  -project 3DPrintAssistant.xcodeproj \
  -scheme 3DPrintAssistant \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=<available>' \
  -only-testing:3DPrintAssistantTests
```

## When To Add Extra Tests

Add a small independent post-fix matrix when:

- the bug was found by the broad sweep
- the fix changes temperature, speed, warning, or export logic
- the fix affects many printers/materials at once

Command:

```bash
node scripts/profile-matrix-audit.js --postfix > docs/reviews/YYYY-MM-DD-profile-postfix-validation.md
```

Keep it small: 10-15 cases is enough. Use nearby but different examples from the original bug.

## Quick UI Smoke

Do this only when the change is user-visible copy/layout/picker/output behavior.

Minimum web smoke:

- one high-speed printer picker row
- one enclosed high-temp profile
- one open-frame high-temp profile
- one clamped temp case
- one warning detail case

For iOS/TestFlight, the owner phone smoke after upload is enough unless layout/navigation changed heavily.

## Pushback Rule

Quality first, but keep it practical.

Push back when:

- a requested push would ship failed audits/tests
- a new TestFlight build would not give the user anything meaningful to test
- a manual phone test is weaker than a quick automated invariant sweep

Do not push back just to add process. The process should stay smaller than the work.

## Session Evidence

In the final note, include only the useful evidence:

```md
Verification:
- Data validation: PASS
- Main audit: 55/55 curated, 0 broad failures
- Post-fix audit: 15/15 PASS
- iOS tests: 85/85 PASS
- UI smoke: PASS
```

That is enough for normal profile/data releases.
