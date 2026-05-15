# Codex review packet — Printer Addition Protocol

**Date:** 2026-05-15
**Author of artefact:** Claude (Opus 4.7, 1M context)
**Reviewer requested:** Codex
**Project:** 3dpa (web + iOS)
**Project context:** [`docs/3dpa-context.md`](../../docs/3dpa-context.md)

---

## Default framing (from ai-collab.md)

> Challenge this. Do not validate it by default. Name hidden assumptions,
> simpler alternatives, risks, and where the current design is genuinely good
> enough. Separate must-fix issues from optional improvements. End with a clear
> recommendation and confidence level.

---

## Context

3dpa is a single-developer hobby project (Mustafa, solo) that ships a web app (vanilla JS, Cloudflare Pages) and an iOS app (SwiftUI + JavaScriptCore running the same `engine.js`). Web is master; iOS bundled `data/printers.json` and `engine.js` are byte-identical mirrors. A remote printer overlay system (`catalog/ios-printer-overlay-v1.json`) shipped 2026-05-10 so current iOS users can receive new printers without a binary update.

**Trigger for this protocol work.** The two printer additions that landed *after* the overlay system shipped both went sideways (details below). The owner (Mustafa) asked Claude to investigate honestly, capture learnings, and write a "fixed trigger and protocol for how we add printers in the future." Claude authored the protocol; Claude also flagged it as potentially heavy for a hobby project; the owner accepted the artefact and immediately asked Codex to review whether it can be simplified without losing quality.

**What changed in the repo.** Single docs commit `47b363c` on web `main`:

```
docs: add printer-addition protocol (post-mortem of X2D + i7 overlay mishaps)
3 files changed, 249 insertions(+), 1 deletion(-)
 create mode 100644 docs/runbooks/printer-addition-protocol.md
```

Plus a companion vault edit (one new section in `Obsidian Vault/20-Areas/Development/ai-collaboration/trigger-cheatsheet.md` — already auto-synced and pushed as `90fe77d`).

---

## The problem we're solving (post-mortem of the two prior printer adds)

The overlay system shipped 2026-05-10 (commit `e206a89` on web). After that, only two real printer additions hit the repo.

### Printer 1 — X2D (and H2D Pro alongside), 2026-05-10

Three relevant commits, same day:

1. **`b2f4367` 11:20 — `data: add X2D remote printer overlay`**
   - Touched **only** `catalog/ios-printer-overlay-v1.json`.
   - `data/printers.json` (bundled web data) was **not** edited.
   - Diff: +45 / −4 lines, entirely in the overlay file.
   - **Effect:** current iOS 1.0.3 users would have received X2D via overlay; web users would NOT have seen X2D in the picker. The mental model treated overlay as an alternative path to bundled, not as a same-day patch on top of bundled.

2. **`9ec6f4f` 11:49 — `data: refresh Bambu printer catalog`**
   - Mixed commit: +135 / −35 across `data/printers.json` (110 lines), `catalog/ios-printer-overlay-v1.json` (50 lines), `app.js` (4 lines), `engine.js` (6 lines).
   - Eight Bambu printers' specs corrected at the same time (max_bed_temp 120→110 on several, multi_color_systems trimmed, plate lists pruned).
   - Added X2D to bundled web data AND added H2D Pro to the overlay.
   - **Effect:** a printer addition is now bundled together with a broad correction sweep that would be very hard to bisect or revert if a regression were found later.

3. **`c153a42` 17:43 — `fix: harden iOS printer overlay validator`**
   - Touched: `catalog/ios-printer-overlay-v1.json` (−87 lines), ROADMAP, NEXT-SESSION, `docs/specs/ios-remote-printer-catalog.md`, `scripts/validate-ios-printer-overlay.js`.
   - **Stripped X2D and H2D Pro entirely out of the overlay** — `payload.printers` returned to `[]`.
   - Reason: the validator was comparing overlay IDs against the *current* `data/printers.json`, which made same-day adds impossible. The fix moved the validator's collision check to a separate shipped-iOS baseline file (which was actually only created on 2026-05-12 in `f9a91f1`, so this commit is structurally incomplete; the validator improvement was finished two days later).
   - **Effect:** X2D + H2D Pro shipped bundled-only. No current iOS user ever received them via overlay. Net outcome of the overlay attempt: zero same-day iOS coverage; the printers wait for v1.0.4 to land via review.

### Printer 2 — SPARKX i7 → Creality i7, 2026-05-12

Four relevant commits, one hour:

1. **`d21e452` 20:53 — `data: add SPARKX i7 printer`**
   - Touched: `app.js` (marketing copy: "12 brands" → "13 brands ... SPARKX"), `data/printers.json` (+29 lines: new SPARKX brand row + i7 printer entry), `scripts/walkthrough-harness.js` (+17 lines: new combo).
   - **Bug:** the i7 was added as a brand-new manufacturer "SPARKX". The actual product is a Creality printer under their "i Series" sub-category. Source clippings carried both "SPARKX" and "Creality" branding cues; the taxonomy decision was made without cross-checking the manufacturer's own site/store.

2. **`f9a91f1` 21:35 — `fix: validate iOS overlay against shipped catalog`**
   - Created `catalog/ios-bundled-catalog-baselines.json` (+89 lines).
   - Adjusted `scripts/validate-ios-printer-overlay.js`.
   - **Note:** this is the validator-improvement work that was started on 2026-05-10 (`c153a42`) and only completed here, mid-printer-add. Tooling work entangled with data work.

3. **`0a4cc2f` 21:36 — `data: publish SPARKX i7 iOS overlay`**
   - Touched only `catalog/ios-printer-overlay-v1.json` (+49 lines).
   - Published the wrong-taxonomy i7 live to current iOS users.

4. **`2284207` 22:01 — `fix: place i7 under Creality catalog`**
   - Touched: `app.js` (reverted "13 brands" back to "12 brands", removed SPARKX from brand list), `data/printers.json` (manufacturer: sparkx → creality, removed standalone SPARKX brand row), `catalog/ios-printer-overlay-v1.json` (bumped content_version, removed SPARKX brand row, fixed manufacturer field, recomputed hash), `scripts/walkthrough-harness.js` (label updated), execution-plan file.
   - **Trigger:** owner opened the running web app, saw "SPARKX" as a brand sibling of Bambu Lab, recognized that wasn't right, and asked for the fix.

The owner caught a taxonomy bug **after** it had shipped to the live overlay. Three commits over one hour to land a single printer correctly, plus a marketing copy revert. The verification step that would have caught the bug pre-commit (a 10-line Node script that prints the picker shape) was actually run as **post-hoc verification** in the session log — but not before the wrong commit shipped.

---

## Root cause analysis

Five root causes, in order of leverage:

1. **Mental model misalignment about the overlay.** Overlay was treated as an alternative path to add a printer for iOS without a binary update. Reality: bundled is the source of truth; overlay is an additive same-day patch on top of bundled. Web users never see the overlay. Future iOS binaries make overlay entries redundant. This shaped the X2D `b2f4367` commit (overlay-only).

2. **Validator design forced same-day chicken-and-egg.** Original validator compared overlay IDs against current `data/printers.json`. Any same-day add either had to skip bundled (Printer 1's outcome) or fight the validator mid-flight (forcing the c153a42 rewrite). The shipped-iOS-baseline file (`ios-bundled-catalog-baselines.json`) created in `f9a91f1` fixes this structurally, but it didn't exist when the X2D attempt was made.

3. **Taxonomy lookup wasn't a discrete step.** Both source clippings for the i7 carried "SPARKX" and "Creality" cues. No required cross-check ("does this brand exist in the picker today? where does the manufacturer put this on their own site?") meant the call went the wrong way.

4. **No display-side dry-run as a pre-commit gate.** Engine exposes `getBrands()` + `getPrintersByBrand(brandId)` returning the picker shape. A few lines of Node would have rendered the picker output post-edit and shown SPARKX as a brand-new sibling of Bambu Lab — visually obvious. The check existed in the post-mortem verification, not pre-commit.

5. **Printer adds bundled with unrelated work.** `9ec6f4f` mixed X2D addition with a Bambu correction sweep. `d21e452` mixed i7 addition with marketing copy. The standing rule "one finding = one commit per platform" applied to reviews but not to printer additions — gap.

---

## Owner's wishes (with Claude's interpretation of intent)

Across the session, the owner made five distinct requests. The user explicitly asked Claude to assess the reason behind each. Honest interpretations:

### Wish 1 — "review last 2 commits, investigate what happened, what went wrong, what did we learn from it"

Stated ask: investigate before proposing fixes.

**Interpretation.** The owner caught the i7 mistake in-app and was personally on the hook for the post-mortem. The two-step framing ("investigate first, *then* protocol") signals he wants the protocol grounded in actual evidence, not abstract best practice. There's also implicit trust here — he didn't dictate the analysis approach; he delegated it to the systematic-debugging skill.

### Wish 2 — "be honest on the errors we made, i want key takeaways and learnings into our new add printer protocols"

Stated ask: honest critique, learnings encoded into the protocol.

**Interpretation.** Note the pronoun: "errors **we** made," inclusive. The owner is not framing this as Claude-failed-me. He's accepting joint responsibility (which is accurate — owner ran the commits, Claude advised on shape). The phrase "key takeaways and learnings" shows preference for durable wisdom over momentary fixes; he wants the protocol to embed the lessons so future Claude (with no memory of this session) can't repeat them.

### Wish 3 — "/using-superpowers use skills needed for this"

Stated ask: invoke superpowers skills appropriately.

**Interpretation.** The owner has used superpowers extensively in the v1.0.4 arc (reviewer-pattern 7-for-7). He trusts the systematic-debugging discipline to constrain Claude's tendency to jump to fixes. Naming it explicitly is a hint: "don't shortcut this — it matters enough to do properly."

### Wish 4 — accepting the draft + adding two requirements

The owner approved the four-artifact draft (runbook + trigger + 3dpa-context bullet + ROADMAP pointer) AND said:

> "yes, write all four as drafted and also include a selfcheck in the end during a wrap up. self check should be run by an 3rd party skill (you decide) and you only wrap up if everything get back green."

**Interpretation.** Three things visible here:
- Acceptance of the draft means the shape was on target — investigation, taxonomy, dry-run, surface-by-surface commits, verification, all matched his mental model.
- "3rd party skill" with "you decide" delegates the skill choice but constrains the answer: must be external review, not self-verification. Claude picked `superpowers:requesting-code-review` because it dispatches an independent subagent (the v1.0.4 arc's 7-for-7 pattern), distinct from `verification-before-completion` which is the implementer's own check.
- "only wrap up if everything get back green" is a hard gate: the reviewer has veto power over Trigger A wrap-up. This is informed by the v1.0.4 arc where the reviewer surfaced real findings every single time (5 reviewer Important findings, 12+ Minor) — the owner has empirically calibrated trust in the reviewer pattern.

Also: when asked whether to include removal/deprecation, he chose "Yes." Pattern: prefers complete-now over incremental.

### Wish 5 — "now i want to focus on your callout, making a heavy process. Give a markdown ... so it can review the challenge, our goal and the endpoint and give us feedback on how we could simplify this without losing quality"

Stated ask: hand to Codex for simplification review.

**Interpretation — this is the most interesting one.** Claude flagged the heavy-process concern voluntarily in the wrap-up ("247 lines is on the heavier side for what is a single-developer hobby project"). The owner acted on it within seconds. This is NOT contradictory with his earlier "yes, write all four" — it's a deliberate "build it well, then prune" pattern:

1. Build the protocol comprehensively so the actual shape is concrete and reviewable.
2. *Then* invite external pressure for simplification.
3. Quality is non-negotiable; complexity is.

This is a healthy review posture. It's also a leverage move: the protocol is already locked in commit `47b363c` and a vault sync, so any change is an edit on top of a committed artefact — not a debate about what to write. That makes simplification feedback actionable rather than abstract.

**Constraint embedded in the ask:** "without losing quality of the process." Quality = the protocol must continue to catch what it was designed to catch (the two failure modes from the post-mortem). Codex should not propose simplifications that re-introduce mental-model misalignment, taxonomy errors, or unbundled-printer-add commits.

### Pattern across all five wishes

The owner consistently:
- Defers process discipline to skills/tools (systematic-debugging, requesting-code-review).
- Rejects ceremony for its own sake but pays for ceremony that catches real bugs.
- Values "errors we made" framings — joint responsibility, low blame, high learning.
- Prefers concrete artefacts over abstract argument (he commits, then reviews).

---

## Plan we implemented

Four artefacts:

### Artefact 1 — Runbook (NEW): [`docs/runbooks/printer-addition-protocol.md`](../../docs/runbooks/printer-addition-protocol.md)

247 lines. Structured in 7 phases:

| Phase | Purpose | Gate |
|---|---|---|
| 1 | Taxonomy decision (sources, manufacturer, series_group, id, name) | Pre-edit |
| 2 | Picker dry-run via Node script asserting picker shape | Pre-commit |
| 3 | Surface-by-surface commits: web bundled → walkthrough → iOS bundled → overlay (if shipping overlay-only) | Implementation |
| 4 | Verification: validate-data, overlay validator, walkthrough, matrix-audit, iOS XCTest, owner visual check | All-green |
| 5 | Live overlay confirmation (only if Phase 3 step 4 ran) | Post-deploy |
| 6 | Deprecation / removal asymmetry (overlay cannot retract shipped-bundled entries) | Special case |
| 7 | Self-check via `superpowers:requesting-code-review` against the diff | Gates Trigger A wrap-up |

Plus explicit "what this protocol forbids" + cross-references.

### Artefact 2 — Vault trigger entry (EDIT): `Obsidian Vault/20-Areas/Development/ai-collaboration/trigger-cheatsheet.md`

One new section "Printer Addition Gate" under the existing "3dpa Work Gates" heading, between "Profile/Data Change Gate" and "TestFlight Push Gate." Contains a copy-paste prompt that references the runbook and summarizes Phase 1/2/4/6/7. ~20 lines added.

### Artefact 3 — Standing rule (EDIT): [`docs/3dpa-context.md`](../../docs/3dpa-context.md)

New standing rule 10 (one bullet) added to the "Standing rules that affect review and research" section. Replaces the implicit "we'll do this right next time" with an explicit binding rule. ~3 lines added.

### Artefact 4 — ROADMAP pointer (EDIT): [`docs/planning/ROADMAP.md`](../../docs/planning/ROADMAP.md)

The "Remote printer catalog operations" entry in the Active Work Queue was updated to point at the runbook instead of duplicating the procedure. Adds a one-line provenance note ("Protocol authored 2026-05-15 after the post-mortem..."). Net 0 lines (replaced).

---

## Claude's own concern (the heavy-process callout)

**The honest worry I flagged voluntarily in the wrap-up:**

> "the runbook is 247 lines, on the heavier side for what is a single-developer hobby project. It's defensible because both prior printer adds went sideways in different ways, but if it starts feeling ceremonial after the next 2-3 uses, prune Phase 7's reviewer checklist or fold Phase 5 (live overlay confirmation) back into Phase 4."

**Where the concern bites hardest:**

- Phase 7's reviewer dispatch was an owner-asked addition with strong precedent (7-for-7 reviewer pattern). On a one-printer addition it might be overkill — the v1.0.4 arc dispatched the reviewer against ~700-line diffs touching engine + iOS + tests + data. A 50-line `data/printers.json` add doesn't have the same surface area to hide bugs.
- Phases 4 + 5 both have verification gates and could probably be one phase ("verify everything, including live overlay if applicable").
- The "what this protocol forbids" section is partly redundant with the phase content itself.
- The taxonomy dry-run script in Phase 2 is correctly emphasized, but it's also embedded as a one-time tool — should it be a checked-in script (`scripts/picker-dry-run.js <id> <brand> <series_group>`) instead of pasted bash?
- The deprecation section (Phase 6) is non-trivial in length but addresses a case that has happened **zero times** in 3dpa's history. YAGNI argument is strong.

**Where I'm convinced the weight is real:**

- The Phase 1 taxonomy step is load-bearing. It's the root-cause fix for the i7 incident. Cannot prune.
- The "edit surfaces in order, one commit per surface" structure (Phase 3) is the root-cause fix for the X2D + correction-sweep mixing. Cannot prune.
- The mental-model section at the top is what makes the rest land. Cannot prune.

---

## Decision to challenge

> Is the 247-line, 7-phase, 4-artefact protocol the right weight for a single-developer hobby project that adds maybe 5-10 printers per year, or is it process-creep that future-Mustafa will route around within 6 months?

Sub-questions worth challenging:

1. **Is Phase 7 (reviewer dispatch) appropriate on every printer add, or only when the addition touches `engine.js` / new brand / new series_group?**
2. **Is the deprecation section (Phase 6) earning its keep, given zero historical use cases?**
3. **Can Phase 4 + Phase 5 collapse into one verification phase without losing the live-overlay-confirmation step?**
4. **Should the Phase 2 picker dry-run be a checked-in script with CLI args instead of paste-bash?**
5. **Is the "what this protocol forbids" section additive or redundant?**

---

## Alternatives considered

**Option A — As-shipped (current state, commit `47b363c`).** 247-line runbook with 7 phases + 4 artefacts. Comprehensive but heavy.

**Option B — Minimal runbook (~80 lines).** Keep Phases 1, 2, 3, 4. Drop Phase 5 (fold into 4), Phase 6 (defer to first removal event), Phase 7 (reviewer dispatch only on owner ask). Trigger entry shrinks proportionally. Standing rule 10 unchanged. ROADMAP pointer unchanged.

**Option C — Tiered runbook.** Same 247 lines but tier 1 = "common case: existing brand, no engine touch" (only Phases 1, 2, 3, 4); tier 2 = "uncommon case: new brand, engine touch, or deprecation" (full protocol). Discoverable via a switch at the top.

**Option D — Inline-in-context.** Delete the runbook; embed Phases 1+2+3+4 directly in `docs/3dpa-context.md` standing rules and ROADMAP entry. Lose Phases 5/6/7 entirely.

**Current direction.** Option A is committed. The owner's review request is implicitly asking "is B or C right?" or "is A right and we're worrying unnecessarily?"

---

## Diff or artefact

Repo: `mustiodk/3dprintassistant` (`main` branch)

Commit: `47b363c docs: add printer-addition protocol (post-mortem of X2D + i7 overlay mishaps)` (local-only at packet author time; web auto-deploys to Cloudflare on push)

Files to read:
- [`docs/runbooks/printer-addition-protocol.md`](../../docs/runbooks/printer-addition-protocol.md) — full 247-line runbook (NEW)
- [`docs/3dpa-context.md`](../../docs/3dpa-context.md) — standing rule 10 added
- [`docs/planning/ROADMAP.md`](../../docs/planning/ROADMAP.md) — "Remote printer catalog operations" entry rewritten

Vault companion (already pushed, autosync commit `90fe77d`):
- `Obsidian Vault/20-Areas/Development/ai-collaboration/trigger-cheatsheet.md` — "Printer Addition Gate" section under "3dpa Work Gates"

Historical commits referenced in the post-mortem:
- `b2f4367` (2026-05-10) — X2D overlay-only add
- `9ec6f4f` (2026-05-10) — Bambu refresh + X2D bundled + H2D Pro overlay (mixed)
- `c153a42` (2026-05-10) — validator harden, stripped overlay printers
- `d21e452` (2026-05-12) — SPARKX i7 wrong-brand add
- `f9a91f1` (2026-05-12) — validator improvement mid-flight
- `0a4cc2f` (2026-05-12) — wrong-brand overlay publish
- `2284207` (2026-05-12) — owner-caught taxonomy fix

Useful sister doc: [`docs/specs/ios-remote-printer-catalog.md`](../../docs/specs/ios-remote-printer-catalog.md) — the overlay system spec.

---

## Checks already run

Pre-commit on `47b363c`:
- No engine/data change in this commit (docs-only), so the standard data gate did not apply.
- Manual diff review of the runbook content against the post-mortem evidence.
- `git diff -u Projects/CLAUDE.md Projects/AGENTS.md` byte-identical (unchanged surface).

What was NOT done (deliberately):
- The protocol itself has not been exercised on a real printer addition yet (no printer adds since the protocol was authored).
- The Phase 7 reviewer dispatch has not been live-tested on a printer-add diff. Inherits credibility from the v1.0.4 arc's 7-for-7 reviewer pattern but is unproven in this specific context.

---

## What we are uncertain about

Concrete questions, not "is this good?":

1. **Phase 7 reviewer dispatch on every printer add — appropriate or overkill?** The v1.0.4 arc's reviewer-pattern proved itself on ~700-line cross-platform diffs touching engine + iOS + tests + data. A vanilla printer-add diff is ~50 lines in one file across three repos. Does the cost (reviewer subagent dispatch ≈ extra few minutes + token spend) justify the benefit on this surface area? If not always, what's the right trigger condition (new brand only? engine.js touched? series_group new?)?

2. **Phase 6 deprecation — is it real?** Zero printers have ever been deprecated in 3dpa. The section covers a case that may not occur for years (if ever). Argument for keeping: when it does happen, the asymmetry (overlay cannot retract bundled-in-shipped-binary) is non-obvious and would be re-discovered painfully without the doc. Argument for cutting: YAGNI; write it when it's needed.

3. **Phase 4 + Phase 5 collapse?** Phase 5 is just one curl + spot-check; could fold under Phase 4 as a conditional bullet ("if overlay was published, also curl the live URL"). Would lose the clean phase boundary; might also lose the explicit "wait for Cloudflare deploy" beat. Net effect: slightly shorter, slightly less explicit.

4. **The picker dry-run script — paste-bash or checked-in tool?** Currently a paste-bash one-liner. If checked in as `scripts/picker-dry-run.js <printer_id> <brand_id> <series_group>`, it'd be reusable + diff-friendly + harder to skip. Cost: another script to maintain.

5. **Standing rule 10 — load-bearing or duplicative?** It says "follow the runbook" plus 3 lines of summary. Could it just say "follow the runbook" (1 line)? Or is the inline summary protection against the runbook being deleted/renamed?

6. **The trigger entry length.** ~20 lines of copy-paste prompt is on the longer side compared to other 3dpa Work Gates (Profile/Data Change Gate is ~5 lines, TestFlight Push Gate ~7 lines). Is the length earning its keep or is it duplicating runbook content?

7. **Is "one printer = one commit per surface" actually right?** Could be "one printer = one commit per repo" (i.e. web edit collapses bundled + walkthrough + overlay into one commit, iOS edit collapses bundled + tests). Currently the runbook says "step 1 + step 2 (walkthrough) — same commit or separated by no more than one commit", but step 4 (overlay) is implied to be its own commit. The rule could be tighter or looser.

---

## Feedback wanted

Per the ai-collab.md Review Packet template, useful axes:

- **Design risk.** Anywhere the protocol could be routed around (i.e. ignored) easily? Anywhere it sets up a future trap?
- **Hidden assumptions.** Does the protocol assume things about the codebase that aren't actually true (e.g., assumes engine.js has a particular API, assumes overlay spec works a particular way)?
- **Simpler alternatives.** Specifically: can Options B / C / D from "Alternatives considered" preserve quality? If yes, which one and what gets dropped?
- **Edge cases.** Any printer-addition scenario the protocol doesn't cover and should (new slicer routing? new max_chamber_temp field? printers without an `id` field? overlay version conflicts?)?
- **Maintainability.** Will future-Mustafa (or future-Claude in a cold session 6 months from now) actually read and follow this, or route around it? What would make it more sticky?
- **Release risk.** Is there a way the protocol itself introduces new failure modes (e.g., Phase 7 reviewer dispatch failing for non-protocol reasons and blocking a legitimate wrap-up)?

What we're NOT looking for:
- Approval that the post-mortem is correct (already evidenced by commits + session logs).
- Style edits on the runbook prose.
- Re-litigation of the X2D/i7 incidents themselves — they're closed.

---

## Time pressure

**Exploratory.** The protocol is locked in commit `47b363c`; v1.0.4 has just shipped to TestFlight ([run 25892826819](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25892826819)) and there is no immediate next printer-add planned. There's room to simplify before the first real use.

---

## Reversibility

**Easy.** All four artefacts are docs/markdown. Edits or full reverts are one commit each. The runbook has not been baked into any code path, CI, or automation; if we delete the file and update the standing rule + ROADMAP pointer, the project is restored to its pre-protocol state with no functional impact.

---

## Recommendation template for Codex's response

When responding, please use this structure (it makes the response trivial to triage):

```md
## Verdict
GO (keep as-is) / SIMPLIFY-PROPOSED / NO-GO (fundamental rework)

## Confidence
Low / Medium / High

## Must-fix issues
(things that should change before the protocol is used)

## Should-fix issues
(things that should change in a follow-up)

## Optional improvements
(would be nice but not necessary)

## Where the design is genuinely good enough
(explicit, not "everything else is fine")

## Recommended simplification (if any)
Concrete proposal — which sections to cut, merge, or restructure, with reasoning.

## Hidden assumptions surfaced
(what the protocol assumes that may not hold)

## Closing note
One paragraph capturing the overall recommendation in plain language.
```

---

## Standing rules Codex should be aware of (from ai-collab.md)

- AI tools advise; Mustafa decides. A review verdict is evidence, not permission.
- If two tools disagree, inspect the repo/source directly for factual claims.
- For risk disagreements, prefer the simpler reversible option unless evidence supports the more complex one.

**Default framing reminder:** Challenge this. Do not validate it by default.

---

# Codex response — 2026-05-15

## Verdict

SIMPLIFY-PROPOSED

247 lines is too heavy as the default path for a solo hobby project. The underlying controls are right; the artefact is over-expanded and has one concrete correctness bug in its pasted dry-run commands.

## Confidence

High

## Must-fix issues

1. **The Phase 1/2 Node snippets are invalid as written.** `require('./engine.js')` does not expose `init`, `getBrands`, or `getPrintersByBrand`; I ran it and it fails. The existing harness loads `engine.js` via `vm` with `fetch` / `localStorage` polyfills. Also, `getPrintersByBrand()` returns an array of `{ label, models }`, not `.groups[].printers`. Relevant surfaces: `docs/runbooks/printer-addition-protocol.md` Phase 2 and `engine.js` picker API around `getBrands()` / `getPrintersByBrand()`.

2. **The commit rule contradicts itself.** Phase 3 says "each step is its own commit" but walkthrough coverage is "same commit as step 1." Make the rule: one printer add = one focused web commit, one focused iOS mirror commit, optional separate overlay commit.

3. **Phase 7 should not be mandatory for every printer add.** It conflicts with the project's risk-based second-model guidance in `docs/3dpa-context.md` and is the most likely route-around point.

## Should-fix issues

- Collapse Phase 4 and Phase 5. Live overlay confirmation is a conditional verification bullet, not a standalone phase.
- Move Phase 6 deprecation/removal out of the default path. Keep a short warning in the runbook; put the full detail in an appendix or write it when the first deprecation happens.
- Trim Standing Rule 10 and the vault trigger. They currently duplicate the runbook and lock in the heavy version across multiple surfaces.

## Optional improvements

- Check in `scripts/picker-dry-run.js <brand_id> <series_group> <printer_id> [wrong_brand_id]`. This turns the most important new gate into a reusable tool instead of a fragile pasted one-liner.
- Keep a shortened "forbidden moves" box. It is redundant, but useful as a red-flag summary for cold-session assistants.
- Replace hard-coded "iOS 1.0.3" wording with "current live App Store version."

## Where the design is genuinely good enough

- The mental model is load-bearing and should stay: bundled data is source of truth; overlay is additive, temporary, and iOS-only.
- The taxonomy step is exactly the right root-cause fix for the SPARKX/i7 miss.
- The picker dry-run is the right test, once implemented correctly.
- The no-mixed-work rule is the right fix for the X2D/Bambu correction sweep problem.

## Recommended simplification

Use Option B+, not A or pure C.

Target about 90-120 lines:

1. Keep: Background, Mental Model, Taxonomy Decision.
2. Replace Phase 2 with a checked-in script and one command.
3. Merge Phases 3-5 into "Implementation + Verification."
4. Replace Phase 6 with a 5-line "Deprecation is asymmetric; use appendix/spec before removal" note.
5. Replace Phase 7 with "Escalate to reviewer when risk triggers fire."

Reviewer triggers:

- new brand
- new `series_group`
- overlay publish to current iOS users
- engine / app / validator / spec changes
- conflicting sources
- deprecation / removal
- more than one printer in the same session

## Hidden assumptions surfaced

- The runbook assumes `engine.js` is CommonJS-importable. It is not.
- It assumes the picker API shape incorrectly.
- It assumes third-party reviewer dispatch is always available and worth blocking wrap-up on.
- It assumes deprecation machinery exists or can be safely invented at first use.
- It assumes "three surfaces agree" is always straightforward, but the overlay spec restricts supported fields and rejects unsupported optional fields.

## Closing note

The protocol is directionally right but overweight. Keep the lessons, sharpen the executable gate, and make reviewer/deprecation paths risk-triggered. The best version is not "less quality"; it is a smaller protocol future-Mustafa and future-Claude will actually follow.

---

# Round 2 — v2 audit request — 2026-05-15

## Default framing (unchanged)

> Challenge this. Do not validate it by default. Name hidden assumptions, simpler alternatives, risks, and where the current design is genuinely good enough. Separate must-fix issues from optional improvements. End with a clear recommendation and confidence level.

## Round-2 framing

You verdicted SIMPLIFY-PROPOSED on v1 with high confidence and gave a concrete Option B+ recommendation. Claude implemented v2 attempting to honor that recommendation. **This round is NOT "did Claude follow your advice." It is a fresh honest audit of the v2 state.** Treat v1 as historical context, not a baseline you have to defer to. If v2 is still wrong (over- or under-built, broken, internally inconsistent), say so plainly.

## What changed (web commits 47b363c → dae3442)

Single commit `dae3442` on web `main`. `5 files changed, +403 / -217`.

| File | Change |
|---|---|
| `docs/runbooks/printer-addition-protocol.md` | Rewrote 247 → 172 lines (30% trim) |
| `docs/3dpa-context.md` | Standing rule 10 trimmed 4 lines → 2 lines |
| `scripts/picker-dry-run.js` | NEW, 101 lines — replaces v1's broken paste-bash |
| `scripts/picker-dry-run.test.js` | NEW, 85 lines — 5 test cases for the script |
| `codex/.../codex-2026-05-15-printer-addition-protocol-packet.md` | Round-1 response captured |

Vault trigger entry separately trimmed ~20 → ~10 lines (autosynced).

## Concrete claim-by-claim mapping to round-1 verdict

| Round-1 finding | Claim on round-2 status |
|---|---|
| Must-fix #1 — Node snippets invalid | Replaced with `scripts/picker-dry-run.js`. TDD: wrote test file first, watched 7 checks fail with `MODULE_NOT_FOUND`, then built script, then 5/5 pass. Manual sanity: `sparkx` as asserted brand → RED with brand-list diagnostic; `x1c` under `bambu_lab` / `X Series` with `sparkx` as negative brand check → GREEN. |
| Must-fix #2 — commit rule contradiction | Phase 3 now says: "One printer = one focused commit per repo: (1) web commit with `data/printers.json` + walkthrough combo, (2) iOS mirror commit byte-identical, (3) optional overlay commit." |
| Must-fix #3 — Phase 7 not mandatory | v2 Phase 5 is a 10-bullet self-check (always runs, gates Trigger A). v2 Phase 5 sub-section "Risk-triggered reviewer dispatch" lists your 7 triggers verbatim and reserves `superpowers:requesting-code-review` for those cases only. |
| Should-fix — collapse Phase 4 + 5 | Done. v2 Phase 3 is "Implementation + verification" merged. |
| Should-fix — Phase 6 to appendix | Done. v2 Phase 4 is a 5-line asymmetry note: "Before any deprecation work, read the overlay spec ... and decide deprecate vs remove. When the first real deprecation happens, capture the executed procedure here as Phase 4a." |
| Should-fix — trim rule 10 + vault trigger | Done. Rule 10 now 2 lines: "Printer additions follow `docs/runbooks/printer-addition-protocol.md`. Bundled `data/printers.json` is the source of truth; the iOS overlay is an additive same-day patch." Vault trigger trimmed to 6-line prompt. |
| Optional — checked-in script | Done. `scripts/picker-dry-run.js` + `scripts/picker-dry-run.test.js`. |
| Optional — forbidden moves box | Kept, 5 lines. |
| Optional — "current live App Store version" wording | **NOT done.** v2 still says "current iOS users" without naming version. Honest gap. |
| Hidden assumption — engine.js CommonJS | Fixed (script uses `vm.runInThisContext` per harness pattern). |
| Hidden assumption — picker API shape `{label, models}` | Fixed (script + tests use the correct shape). |
| Hidden assumption — reviewer always available | Fixed by making it risk-triggered. |
| Hidden assumption — deprecation machinery exists | Acknowledged in Phase 4 ("when the first real deprecation happens, capture the executed procedure"). Not solved. |
| Hidden assumption — overlay spec field restrictions | **NOT addressed.** v2 still says "edit `payload.printers`" without surfacing supported/rejected field list. |

## Verification evidence (fresh run at HEAD = dae3442)

```
$ node scripts/picker-dry-run.test.js
ALL 5 TESTS PASS

$ node scripts/validate-data.js
✓ printers.json
✓ materials.json
✓ nozzles.json
✓ rules/environment.json
✓ rules/objective_profiles.json
✓ rules/troubleshooter.json
All data files valid.

$ node scripts/picker-dry-run.js sparkx "i Series" sparkx_i7
[Engine schema] 17 soft warning(s): ... (k_factor_matrix gaps, pre-existing engine noise)
RED: picker dry-run found mismatches:
  - brand id 'sparkx' not found in getBrands(); known: bambu_lab, creality, prusa, anycubic, qidi, elegoo, sovol, flashforge, artillery, anker, voron, diy
  - series_group 'i Series' not found under brand 'sparkx'; known: (none)
exit=1

$ node scripts/picker-dry-run.js creality "i Series" sparkx_i7 sparkx
GREEN: sparkx_i7 present under creality / i Series, no spurious 'sparkx' brand
exit=0
```

Walkthrough harness + matrix audit + iOS XCTest not re-run because no engine / data / test code changed in this arc. Risk-trigger check on v2-authoring itself: no new brand, no new series_group, no overlay publish, no engine/app/validator/spec touch, no conflicting sources, no deprecation, no printer added. None of your seven triggers fire — so v2 was committed on self-check alone, per its own rules.

## Things Claude is honestly uncertain about (round 2)

Concrete uncertainties, not "did I do it right":

1. **172 lines is still above your 90-120 target.** Where would you make the cut now? Claude judged the explicit 10-bullet self-check + the explicit risk-trigger list as load-bearing (failure modes live there), but that's the part that grew. Specific question: would you collapse the 10-bullet checklist into a 3-line "verify gates green and no mixed work" prose paragraph?

2. **The 10-bullet self-check has subjective items.** "Web commit is one printer; no engine.js, marketing, or correction-sweep mixing" — what counts as mixing? Could a future cold-session assistant rationalize a small `app.js` edit as "non-mixing"? Should the checklist be more mechanical (e.g., `git diff --stat | grep -v 'printers.json\|walkthrough'` must be empty)?

3. **The picker dry-run script emits engine soft-warnings to stderr.** The 17 `k_factor_matrix` gap warnings come from `Engine.init()` and predate this work. They make the script output noisy for users who haven't seen them before. Suppress (capture stderr, only print on RED), or leave as informational?

4. **Test coverage gaps.** The 5 test cases cover: GREEN happy path, missing printer RED, wrong series_group RED, negative-brand check, usage error. They do NOT cover: brand id that doesn't exist as the *asserted* brand (only as wrong_brand_id), engine.init() failure path, empty/malformed data files. Are these gaps real or YAGNI?

5. **Overlay spec field restrictions (your round-1 hidden assumption #5).** v2 says "edit `payload.printers`" with no field allowlist. The overlay spec at `docs/specs/ios-remote-printer-catalog.md` presumably restricts which printer fields are supported. Should the runbook inline that allowlist or just point at the spec? Did you mean a specific concrete failure mode here that I haven't seen?

6. **Phase 4 deprecation is now arguably too thin.** v1 had a full procedure (deprecate vs remove, engine flag, walkthrough handling, overlay note). v2 is "read the spec, capture the executed procedure when it happens." Is that the right minimum, or is it leaving a future Claude with too little scaffolding?

7. **`scripts/picker-dry-run.js` itself is untested as a tool.** The `.test.js` file tests the script's CLI contract, but the script itself has no second-pair review. Should it land via the risk-triggered reviewer path (since it's new tooling code), or is the test file's contract enough?

8. **The runbook now references both itself and its own simplification trail** (the v1→v2 footer link to this packet). Is that useful provenance or pointless self-reference?

## Specific files to read for this round

- [`docs/runbooks/printer-addition-protocol.md`](../../docs/runbooks/printer-addition-protocol.md) (172 lines, v2)
- [`scripts/picker-dry-run.js`](../../scripts/picker-dry-run.js) (101 lines, NEW)
- [`scripts/picker-dry-run.test.js`](../../scripts/picker-dry-run.test.js) (85 lines, NEW)
- [`docs/3dpa-context.md`](../../docs/3dpa-context.md) — rule 10 (2 lines)
- Vault: `Obsidian Vault/20-Areas/Development/ai-collaboration/trigger-cheatsheet.md` — "Printer Addition Gate" section (6-line prompt)

Round-1 review (your prior verdict + recommendations) is preserved above for context but should not constrain round-2 judgment.

## Feedback wanted (round 2)

- **Did the v2 trim go far enough, too far, or right?** Concrete: should the 10-bullet checklist shrink to 3 bullets?
- **Does the script API + test set have real holes** beyond what Claude flagged in uncertainties #4?
- **Is the lightweight Phase 7 hybrid (always-checklist + risk-triggered-reviewer) clear enough to follow** in a cold session 6 months from now, or is the line "what counts as a trigger?" too soft?
- **Did v2 introduce new bugs, internal contradictions, or fragile assumptions** that weren't in v1?
- **Is there one concrete thing you'd cut from v2 today** that would lose nothing? Be specific.

## Time pressure

**Exploratory.** v1 + v2 are both committed; nothing depends on this. The protocol's first real use will be the next printer addition (no date set). Goal of round 2 is to lock the v2 shape (or surface the next pruning pass) before that first use.

## Reversibility

**Easy.** All artefacts are docs/markdown + a small tool. Edits, full reverts, or another simplification pass are one commit each.

## Recommendation template for round-2 response

```md
## Verdict (round 2)
LOCK-IT / SIMPLIFY-FURTHER / TIGHTEN-SPECIFICS / NO-GO (rework needed)

## Confidence
Low / Medium / High

## Did Claude correctly resolve round-1 must-fixes?
(brief, item-by-item if any are partial)

## New must-fix issues (introduced by v2 or missed by v1)

## New should-fix issues

## Optional improvements

## Where v2 is genuinely good enough

## Concrete simplification proposal (if any)

## Hidden assumptions still in v2

## Answers to Claude's 8 round-2 uncertainties
(brief one-liner each is fine)

## Closing note
One paragraph.
```

---

# Codex response — round 2 — 2026-05-15

## Verdict (round 2)

TIGHTEN-SPECIFICS

v2 is the right overall shape. I would not simplify it further yet. The main issue is no longer "too much process"; it is a couple of sharp operational specifics that could confuse the first real overlay republish/add.

## Confidence

High

## Did Claude correctly resolve round-1 must-fixes?

Yes, materially.

1. Broken Node snippets: resolved with `scripts/picker-dry-run.js`; I ran the tests and manual commands, and the core contract works.
2. Commit contradiction: mostly resolved. The web/iOS/overlay commit shape is now clear enough, though the "one commit per repo" wording could be slightly sharper.
3. Mandatory reviewer dispatch: resolved. Always-run self-check + risk-triggered reviewer is the right compromise.

## New must-fix issues

One: clarify legitimate overlay-only republish cases.

The runbook forbids editing overlay without bundled data, but the overlay spec has real overlay-only operations: rollback, corrected overlay republish, and eventually removing overlay rows after a binary has subsumed them. The rule should say: "Do not add a printer to overlay unless bundled source-of-truth already contains the same printer. Overlay-only cleanup/rollback/promotion republish is allowed when following the overlay spec."

## New should-fix issues

- Add one sentence under the overlay commit step: only include fields supported by `scripts/validate-ios-printer-overlay.js`; if bundled data needs a new printer field not allowed by the overlay validator/iOS runtime, either extend the overlay spec/validator in a separate reviewed arc or ship bundled-only.
- Add a test where `wrong_brand_id` fails because it points to an existing brand, e.g. Bambu happy path with `creality` as the forbidden brand. That tests the SPARKX guard's RED path, not just its GREEN path.
- State the iOS XCTest command's working directory or path. The current command block mixes web-repo Node commands with an iOS project command.

## Optional improvements

- Suppress or label the 17 engine soft warnings in `picker-dry-run.js` on GREEN. They are harmless but visually noisy.
- Trim the v1→v2 provenance link from the runbook after this stabilizes. Useful now, unnecessary later.

## Where v2 is genuinely good enough

- The 10-bullet self-check is fine. Do not collapse it to 3 bullets; it is short, mechanical enough, and maps to the actual failures.
- The vault trigger is now the right size.
- Phase 4 being thin is acceptable because deprecation has never happened.
- The risk-trigger list is clear enough for a cold session.

## Concrete simplification proposal (if any)

No further structural simplification. Cut only the historical simplification-trail link later if it starts feeling self-referential.

## Hidden assumptions still in v2

- It assumes all future bundled printer fields are overlay-safe. Not guaranteed.
- It assumes "overlay edit without bundled edit" is always bad. Not true for cleanup/rollback/promotion republish.
- It assumes the new script's noisy stderr will not confuse future users.

## Answers to Claude's 8 round-2 uncertainties

1. 172 lines is okay. Do not chase 90-120 blindly.
2. Keep the 10 bullets; make overlay exception and cwd specifics mechanical.
3. Suppress or label engine soft warnings on GREEN.
4. Add the `wrong_brand_id` RED-path test; other gaps are YAGNI.
5. Do not inline the full allowlist; add a pointer to validator-supported fields.
6. Phase 4 is thin but acceptable.
7. Test contract is enough; no reviewer needed for the tool now.
8. Provenance link is useful temporarily, optional later.

## Closing note

v2 has crossed from process-creep into usable hobby-project protocol. Lock the structure, tighten the overlay exception and validator-field wording, add one missing test, and then stop sanding it.
