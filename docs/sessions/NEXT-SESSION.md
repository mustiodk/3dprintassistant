# 3dpa — Next Session Kickoff

**Purpose:** execute the GO'd Train 1 implementation plan (My Gear + Setups).
The specs are ratified, the plan survived three adversarial rounds to zero
findings, and web tasks ship value before iOS work begins.

**Last updated:** 2026-08-20, mac-mini wrap-up (temperature-units decision + iOS 1.1.4 release).
Entry point UNCHANGED — Train 1 execution. The owner opened the **2.0 redesign**
track this session; it runs in his design tool, not here, and does not block
Train 1's web tasks.

**New parallel track: the 2.0 redesign.** Direction locked ("Quiet Instrument
Panel"), prompt prepared at
[`../prompts/2026-08-19-ios-2.0-redesign-prompt-v2-claude.md`](../prompts/2026-08-19-ios-2.0-redesign-prompt-v2-claude.md).
When it returns with a chosen direction + token sheet, land that as a design spec
under `docs/superpowers/specs/` **before Train 1's iOS UI tasks (6-10)**. Tasks
1-5 (web store, boot/switcher, panel, pickers, drift-proof) are design-independent
and can proceed either way. Two decisions are binding on the redesign and easy to
lose: a gear pre-fills **hardware only** (intent stays per print, so no
"Generate Profile" CTA), and **Workshop is star-save-from-Output, not a catalog**.

**Released; no work remains: iOS 1.1.4 is live.** The owner confirmed approval
and manual release. Apple DK + US lookups both returned `version: 1.1.4` on
2026-08-20 with release timestamp `2026-08-19T17:54:22Z`. Build
`202608182214` came from `991deba`; the iOS repo is clean/current at `1e3de11`.

**Product decision: keep Celsius/metric only.** The temperature-units research
confirmed this is the printer/slicer ecosystem's operational convention,
including US-facing workflows. The owner chose no action. Do not add a
Fahrenheit preference or broad metric/imperial toggle from this research alone.

**Known-broken and deliberately left: the WEB nozzle picker.** `app.js:1536`
calls `Engine.getCompatibleNozzles(state.material)`, so every printer offers all
nine nozzle sizes even ones it cannot mount. iOS was fixed this session
(`7c695d9`); the owner chose iOS-only, so **web and iOS now behave differently**.
A task chip is filed. Read
[`2026-08-18-green-suite-never-touched-the-screens.md`](../../../ai-operating-model/docs/findings/2026-08-18-green-suite-never-touched-the-screens.md)
before touching it — the engine is correct, the call site is the bug.

---

# THE SESSION — execute Train 1

**Plan (read it in full, then execute task-by-task):**
`docs/superpowers/plans/2026-08-17-train1-my-gear-setups-plan.md`

- 10 TDD tasks: web store → boot/switcher → My Gear panel → pool-first
  pickers → drift-proof+push · iOS store (web-parity fixture) → Home CTA →
  screens → pickers · close-out (ROADMAP/#32/analytics note).
- The plan header requires `superpowers:subagent-driven-development`
  (recommended) or `superpowers:executing-plans` — **owner picks at session
  start**; subagent-driven is the plan's recommendation.
- Specs behind it (consult on any ambiguity — the plan argues from them):
  `docs/superpowers/specs/2026-08-17-next-gen-platform-design.md` (§2) and,
  for later trains, `2026-08-17-ai-buddy-design.md`.
- **Engine and data are untouched by construction** — Task 5 proves it with
  `engine-golden-snapshot.js --check` (NO DRIFT). If any task seems to need an
  engine edit, STOP and surface it.
- Web commits push per task (CI must be green); **iOS commits stay local**
  under the push gate until the owner composes the 1.2.0 train.

## Also open (not this session unless the owner says so)

- **`ender_3_pro` did NOT resolve.** The 2026-08-19 12:11 run
  (`run-20260819T100138Z`) re-parked it `needs-source-resolution` (custody
  `447c534`) instead of taking rung 3's lower values (250 / 100 / 100) from the
  decision written 08-18. **Read the run's own account before assuming why** —
  per the 2026-08-16 finding, a run report's explanation of its own failure is a
  claim, not evidence. Same run declined `centauri_combo_2` as a correct
  duplicate (`a439fc1`).
- **`hi` has no owner-notification path.** Its `judgment-on-evidence` class
  matches neither `isDecisionPark`'s class test nor `DECISION_REASONS` (which
  has `review-split`, not `review-no-go`); a sweep dry-run returns `opened=0`.
  One-line fix available, but whether these parks *should* raise issues is a
  design call — locus-validate first.
- **K3 objection-vs-claim** — `open`, three mitigations recorded, none built.
  The retry gate verifies that an objection was answered, never that the answer
  supports the value. Owner call.
- **K4 scope-check gap** — `recurrence-seen`. Owner overruled an over-scoped
  closing recommendation; the rule that was supposed to prevent it only arms
  when designing against an ask.
- **iOS 1.1.4** — live on the App Store; Apple DK + US storefront checks green.
  The iOS repo is clean/current. Future iOS train work remains push-gated.
- **K3 `enterResearchRepair` no-caller** — unchanged from 2026-08-17.

---

# Cold start

>>> START >>>

Cold start 3dpa. Today's task: execute the Train 1 (My Gear + Setups) plan.

**Read in order:**
1. `Projects/CLAUDE.md` (top-level protocol — routing + standing rules)
2. `3dprintassistant/CLAUDE.md` (project rules)
3. `3dprintassistant/docs/3dpa-context.md` (evergreen architecture, engine API)
4. `3dprintassistant/docs/planning/ROADMAP.md`
5. `3dprintassistant/docs/sessions/INDEX.md`
6. The last 3 session logs in full
7. This file
8. `docs/superpowers/plans/2026-08-17-train1-my-gear-setups-plan.md` — the
   task source; read fully before the first task.

**Repo health first — check the BRANCH, not just the health line.** Run
`git branch -vv`; a checkout parked on a feature branch reads "current"
against its own upstream (bit four cold starts). `3dprintassistant-ios: current`
is expected today; future local train commits may show `ahead:N` under the push
gate and are not automatically a problem. If health says `dirty`, run `git ls-files -u` before
trusting it (autostash-pop wedge, 2026-08-16).

**Process:**
- Announce execution mode (subagent-driven recommended vs inline) and get the
  owner's pick before Task 1.
- TDD every task exactly as written: failing test → RED observed → minimal
  implementation → green → commit. One task = one commit (plus fix commits if
  a gate rejects).
- Web tasks: push after each green task; confirm CI green before the next.
- Task 5 gates the web half: walkthrough green + golden NO DRIFT + production
  smoke. Task 10 closes the train (parity spot-check, ROADMAP, #32 comment).

## Standing rules that bite on this project

- ROADMAP is truth. Read fully before reporting status — from `main`.
- No mutation on an unverified premise; verify in the SAME turn, state inline.
- Validate the fix LOCUS before building an enforcement site.
- A tool's account of why it failed is a claim, not evidence.
- Look for the applier before hand-editing generated/ratified state.
- One finding = one commit. Web is master; iOS mirrors `engine.js`
  byte-identical; `data/printers.json` is deliberately NOT identical.
- iOS `main` stays push-gated. Web pushes freely.
- A green local macOS shell-suite run proves less than green CI (bash 3.2
  `set -e` / `[[ ]]`). `node:test` tails say nothing — check exit codes.
- Committed ≠ deployed; the intake pipeline runs from
  `~/.local/share/3dpa-intake/checkout/3dprintassistant` (separate clone).
- Before writing instructions ADDRESSED to a named external tool/model/service,
  verify what it is. The no-unverified-premise rule arms on mutation, not on
  authorship, so a plausible name-mapping goes unchecked and silently shapes the
  whole document (2026-08-19: an HTML-artifact prompt written for Claude Design,
  which is a canvas product).
- An AI research answer's verbatim quote is a claim until you fetch the page;
  "three tools agree" is one source if they cite the same unretrievable page.
- An objection being satisfied does not make its claim true — check the value,
  not just that the question was answered.
- `state` in app.js is a `const` (`app.js:66`) — merge with `Object.assign`,
  re-render via `render()` (`app.js:1580`); the printer row's brand field is
  `manufacturer`, not `brand`.
- A green engine suite says nothing about whether the SCREEN calls the right
  engine function. When a function has a narrower variant, grep its call sites;
  "tests only" is the bug. Keep one test per interactive screen that performs
  the real gesture (2026-08-18: two user-visible bugs past 213 green tests).
- Verify a RED fails for the INTENDED reason before trusting it, and read test
  totals from the `.xcresult` bundle, never a piped console tail.
- SwiftUI: press animations come from a `ButtonStyle`'s `configuration.isPressed`.
  A `DragGesture(minimumDistance: 0)` inside a `ScrollView` starves the pan
  recognizer and silently kills scrolling. `EdgeSwipeBack.swift` is UIKit-backed
  on purpose — do not "simplify" it into a SwiftUI gesture.
- Before pasting into App Store Connect, dump the LIVE field values
  (`description`, `whatsNew`, `promotionalText`, `notes`) and read them in full.
  ASC auto-carries review notes from the previous version, so they arrive
  pre-filled and read as already-correct; the prepared submit doc only covers
  what its author thought to change.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask
only. This revision was the 2026-08-20 Trigger A wrap-up (mac-mini): entry point
UNCHANGED (Train 1 execution). Recorded iOS 1.1.4 as publicly live after Apple
DK + US verification, removed stale owner-gate/ahead state, and locked the
temperature-units research as a no-action Celsius/metric product decision.
