# 3dpa — Next Session Kickoff

**Purpose:** execute the GO'd Train 1 implementation plan (My Gear + Setups).
The specs are ratified, the plan survived three adversarial rounds to zero
findings, and web tasks ship value before iOS work begins.

**Last updated:** 2026-08-17, at the mac-mini wrap-up that ratified the
next-gen platform. The former two-packet repair block is DONE (`ender_3_s1_pro`
shipped live 2026-08-17; `hi` is an owner decision, see below). The former #32
scoping block is superseded by the ratified spec.

**MACHINE:** web tasks (1–5) run anywhere with node. iOS tasks (6–10) need a
Mac with full Xcode — the mac-mini is verified (Xcode 26.5 + iOS 26.5 sim);
verify per machine with `xcode-select -p` before starting task 6.

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

- **`hi` owner decision** — parked `judgment-on-evidence` (event-only) after a
  *legitimate* R1 objection: `available_nozzle_sizes=[0.4,0.6,0.8]` cites the
  K2 Plus quick-swap kit page, which is not a Hi source. Options: supply
  Hi-specific kit-compatibility evidence, or restrict to `[0.4]`. Expect the
  decision issue from the sweep; `verify-reentry` remains the only gate.
- **`ender_3_pro`** — new park `needs-source-resolution` (2026-08-17 run);
  expect its issue.
- **K3 `enterResearchRepair` no-caller** — one-repair-pass bound is agent
  policy, not enforced code
  (`ai-operating-model/docs/findings/2026-08-17-one-bounded-repair-pass-has-no-enforcing-caller.md`).
  Mitigation locus needs validation before building; owner call.
- **iOS 1.1.4** — implementation-complete, owner-gated (push, TestFlight,
  device acceptance, authenticated explicit-zero dashboard check).

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
against its own upstream (bit four cold starts). `3dprintassistant-ios:
ahead:N` is expected (push gate — includes the run's own `13f149f` mirror
commit), not a problem. If health says `dirty`, run `git ls-files -u` before
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
- `state` in app.js is a `const` (`app.js:66`) — merge with `Object.assign`,
  re-render via `render()` (`app.js:1580`); the printer row's brand field is
  `manufacturer`, not `brand`.

<<< END <<<

Maintenance note: regenerated on Trigger A / Trigger B / explicit owner ask
only. This revision was the 2026-08-17 Trigger A wrap-up (mac-mini): entry
point changed from the two-packet repair (DONE — shipped/decided) to Train 1
execution; #32 scoping superseded by the ratified platform spec.
