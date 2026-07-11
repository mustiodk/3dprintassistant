# Cross-Model Review: iOS 1.0.7 Issue-Fix Release Plan

## Context

The owner approved a focused issue-fix release for the existing iOS 1.0.7
TestFlight train. Public App Store remains 1.0.4. The work fixes GitHub issues
#2–#5 on iOS and adds only the web analytics contract required by the new iOS
Workshop events.

## Decision to challenge

Challenge whether the design and plan are actually executable, minimal, safe,
and sufficient to produce a trustworthy new 1.0.7 TestFlight build without
misstating K2 SE delivery or overclaiming Orca/Prusa export support.

## Artifacts

- `docs/superpowers/specs/2026-07-11-ios-1.0.7-issue-fix-release-design.md`
- `docs/superpowers/plans/2026-07-11-ios-1.0.7-issue-fix-release-plan.md`
- `docs/prompts/phase-ios-1.0.7-issue-fix-release-prompt.md`
- `docs/planning/ROADMAP.md` (new top banner + active queue item)
- Sibling repo `../3dprintassistant-ios/` current source and tests
- Current web analytics implementation/tests under `functions/api/`

## Checks already run

- Live App Store API: public version 1.0.4.
- GitHub Actions run `28830781702`: successful earlier 1.0.7 upload.
- Live iOS overlay: `content_version=2026071005`, contains `k2_se`.
- iOS local state: one committed-but-unpushed `bfc9a2b`; remote does not bundle
  K2 SE, local does.
- With local `bfc9a2b`, web/iOS engine and full data tree are byte-identical.
- Current web analytics tests: 22/22 green.
- Four GitHub issues remain open; old July 9 web branch has no PR.

## Concrete uncertainty

Stress-test:

1. Saved-state fingerprint lifecycle across save, restore, state mutation,
   deletion, view re-render, and unknown-id degradation.
2. Whether single-profile export’s omission of global extras is clear and safe,
   and whether full backup byte compatibility remains protected.
3. SwiftUI discoverability/layout risk, especially navigation-toolbar crowding
   and empty Workshop state.
4. Analytics contract compatibility with current web `type`/eventDetail schema,
   HMAC path, 20-blob order, dashboard queries, and privacy boundary.
5. TDD/commit boundaries: one issue/finding per commit, deterministic commands,
   and no hidden placeholders.
6. Cross-repo ordering, push gate, TestFlight version/build mechanics, and owner
   App Store submission gate.
7. Any plan step that cannot work against the actual file/API/test surface.

## Alternatives considered

- Native Orca/Prusa serializers in this train: rejected as a separate
  fixture/import-tested feature.
- Minimal #2/#3 hotfix: rejected because #4/#5 remain material owner reports.
- Whole-branch merge of July 9 web fixes: rejected because current main has a
  later incompatible analytics contract and unrelated fixes.

## Feedback wanted

Return:

- `VERDICT: GO`, `GO-WITH-PATCHES`, or `NO-GO`.
- Findings grouped as MUST-FIX, SHOULD-FIX, OPTIONAL.
- Direct file/section references and concrete replacement wording or task
  changes.
- Explicit statement if a requirement is over-scoped or under-specified.

Do not edit files. Do not review implementation that does not exist yet.
