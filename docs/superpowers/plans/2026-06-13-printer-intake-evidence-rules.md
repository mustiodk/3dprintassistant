# Printer Intake Evidence Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the printer-intake process so real backlog entries are classified with explicit source authority, confidence, taxonomy, and blocked/ship-ready rules before any catalog edit.

**Architecture:** The canonical protocol owns printer-add rules. The Scout and Assistant contracts mirror those rules by role: the deterministic Scout stages private `needs-research` skeletons and triage reports, while the assisted Assistant performs source weighing, owner/reviewer gates, and shipping. The deterministic Scout code only changes private candidate skeleton metadata so the evidence policy travels with staged artifacts.

**Tech Stack:** Markdown process docs, Node.js deterministic Scout script/tests, git commits per gate.

---

## File Structure

- Modify `docs/runbooks/printer-addition-protocol.md`: canonical source hierarchy, field confidence, outcome classes, taxonomy edge cases, review triggers.
- Modify `../ai-operating-model/docs/agents/printer-intake-scout.md`: deterministic Scout role and output contract.
- Modify `../ai-operating-model/docs/agents/printer-addition-assistant.md`: Assistant block/ship rules and owner/reviewer gate language.
- Modify `scripts/printer-intake-scout.test.js`: TDD guard for candidate skeleton evidence policy.
- Modify `scripts/printer-intake-scout.js`: add evidence-policy metadata to private candidate skeletons only.
- Modify `docs/planning/ROADMAP.md`: update active queue after process hardening.
- Modify `docs/sessions/NEXT-SESSION.md`: point the next session at real queue seeding after rules are hardened.

## Review Gate Template

After each task commit, dispatch a subagent reviewer with this shape:

```text
Review the last commit in /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant.
Requirements: <task-specific requirements>.
Check for contradictions with the spec at docs/superpowers/specs/2026-06-13-printer-intake-evidence-rules-design.md, overreach into live catalog/iOS/TestFlight, and missing QA.
Return Critical / Important / Minor findings and verdict GO / GO_WITH_FIXES / NO_GO.
Do not edit files.
```

If verdict is `GO_WITH_FIXES` or `NO_GO`, patch only the reviewed task's scope,
run that task's QA again, commit the patch, and re-review until verdict is `GO`.

---

### Task 1: Protocol Hardening

**Files:**
- Modify: `docs/runbooks/printer-addition-protocol.md`

- [ ] **Step 1: Insert source authority + field confidence rules**

Add this section after `## Mental model (read first — load-bearing)`:

```markdown
## Evidence rules (before trusting a candidate)

### Source authority

Classify every source used for a candidate:

1. **Manufacturer authority** — official product page, manual, spec sheet,
   support/wiki page, or manufacturer software/firmware profile. Use this class
   for profile-affecting and safety-affecting fields whenever possible.
2. **Distributor/reseller authority** — authorized reseller or marketplace page.
   May corroborate model existence, alternate naming, and availability, but does
   not override manufacturer data for profile/safety fields.
3. **Independent review/community evidence** — reputable reviews, owner reports,
   videos, forums, and photos. May help identify physical/mechanical facts such
   as enclosure shape or extruder layout, but does not override manufacturer
   data.
4. **Requester text** — context only. It never establishes specs or taxonomy by
   itself.

If manufacturer data conflicts with reseller/review/community data, use the
manufacturer value as the proposed value only when the model/revision/region
clearly matches. Record the conflict as a risk flag and dispatch review before
shipping. If two manufacturer sources conflict, the candidate is
`needs-source-resolution` and must not ship until resolved.

### Field confidence

Each drafted field is one of:

- `confirmed` — directly supported by a cited manufacturer source, or by
  multiple compatible non-manufacturer sources only when the field is not
  profile/safety critical.
- `inferred` — derived from clear evidence but not directly listed as a spec.
  Inferred values on profile/safety fields require a risk flag and review.
- `low-confidence` — missing, contradictory, weakly sourced, or based on silence.

Profile/safety-critical fields are:
`series`, `enclosure`, `active_chamber_heating`, `max_chamber_temp` if present,
`extruder_type`, `max_nozzle_temp`, `max_bed_temp`, `max_speed`,
`max_acceleration`, `available_nozzle_sizes`, `available_plates`,
`multi_color_systems`, `has_lidar`, `has_camera`,
`open_door_threshold_bed_temp` if present, and `notes` when they contain
warnings, material limits, or operating constraints.

Boolean absence is not proof. A `false` value needs official/manual evidence,
explicit "not equipped" documentation, or a recorded absence rationale. A
sufficient absence rationale says which source classes were checked, what
feature would normally be advertised if present, and why the omission is safe
for this field. Silence alone is `low-confidence`.

A low-confidence profile/safety-critical field blocks `ship-ready`.
```

- [ ] **Step 2: Add outcome classes**

Add this section after the evidence rules:

```markdown
### Outcome classes

Deterministic Scout outcomes:

- `duplicate` — already bundled; no add.
- `declined-non-fdm` — resin, SLA/MSLA/LCD/DLP, SLS/MJF, or other non-FDM.
- `unactionable` — empty/spam/no model signal.
- `incomplete` — brand/model information is insufficient.
- `needs-research` — novel request; FDM and specs are not confirmed yet.
- `parse-error` — ingestion entry could not be parsed; operational error, not a
  printer decision.

Assisted research / Assistant outcomes:

- `unverified-model` — no authoritative source confirms the model; do not claim
  universal nonexistence.
- `needs-source-resolution` — required evidence is missing or conflicting.
- `needs-owner-taxonomy` — owner must approve a new brand, new series group, or
  non-obvious taxonomy.
- `needs-taxonomy-decision` — model does not map cleanly to the current engine
  taxonomy.
- `blocked` — validators, source conflicts, or owner/reviewer gates prevent
  shipping.
- `ship-ready` — all required fields are confirmed, validators are green, owner
  gates are satisfied, and required reviewer dispatches have returned GO.

The deterministic Scout never emits assisted-only outcomes.
```

- [ ] **Step 3: Tighten Phase 1 taxonomy decision**

In `Phase 1 — Taxonomy decision`, extend step 2 with:

```markdown
   If a new brand has no sibling `series_group`, mark the candidate
   `needs-owner-taxonomy`. If `series` does not cleanly fit the current
   `corexy` / `bedslinger` engine enum, mark it `needs-taxonomy-decision`; do
   not extend the engine enum inside a printer-add commit.
```

- [ ] **Step 4: Extend risk-triggered reviewer dispatch**

Append these bullets to `### Risk-triggered reviewer dispatch`:

```markdown
- Source conflict on any profile/safety-critical field.
- Any `inferred` value for `series`, `enclosure`, `active_chamber_heating`,
  `extruder_type`, `max_nozzle_temp`, or `max_bed_temp`.
- Non-obvious `corexy` / `bedslinger` mapping.
- `false` value for feature booleans based only on missing mentions.
- Manufacturer-vs-manufacturer conflict.
```

- [ ] **Step 5: QA Task 1**

Run:

```bash
git diff --check
rg -n "Source authority|Field confidence|Outcome classes|needs-source-resolution|needs-owner-taxonomy|needs-taxonomy-decision|parse-error|blocked|manufacturer-vs-manufacturer|false value for feature booleans" docs/runbooks/printer-addition-protocol.md
```

Expected: `git diff --check` exits 0; `rg` prints all newly required rule terms.

- [ ] **Step 6: Commit Task 1**

```bash
git add docs/runbooks/printer-addition-protocol.md
git commit -m "docs: harden printer addition evidence rules"
```

- [ ] **Step 7: Review Task 1**

Dispatch subagent using the Review Gate Template. Requirements:

```text
Task 1 must update only docs/runbooks/printer-addition-protocol.md.
It must add source authority hierarchy, field confidence, outcome classes,
taxonomy edge-case handling, and added review triggers. It must not introduce
iOS/TestFlight requirements for printer additions.
```

Patch and re-review until verdict is `GO`.

---

### Task 2: Agent Contract Alignment

**Files:**
- Modify: `../ai-operating-model/docs/agents/printer-intake-scout.md`
- Modify: `../ai-operating-model/docs/agents/printer-addition-assistant.md`

- [ ] **Step 1: Patch Scout mission**

In `printer-intake-scout.md`, replace the mission language that says the Scout
researches specs, drafts complete rows/overlay entries, runs validators, or
produces a validated candidate with language equivalent to:

```markdown
4. For valid, novel requests, emit a private `needs-research` candidate
   skeleton. The deterministic Scout does **not** confirm FDM, research specs,
   draft complete `printers.json` rows, draft overlay payloads, run validators,
   or mark anything ship-ready.
5. Write one private candidate skeleton per novel request + a daily run report.
```

- [ ] **Step 2: Patch Scout promotion/output contract**

In the Scout contract, state:

```markdown
The deterministic Scout can emit only deterministic outcomes:
`duplicate`, `declined-non-fdm`, `unactionable`, `incomplete`,
`needs-research`, `parse-error`, and existing operational error types.
It must not emit assisted-only outcomes (`unverified-model`,
`needs-source-resolution`, `needs-owner-taxonomy`, `needs-taxonomy-decision`,
`blocked`, `ship-ready`) because those require web research, source weighing,
validators, or owner/reviewer judgment.
```

Update the candidate packet/output wording so skeletons include source-policy
instructions, not researched field values.

- [ ] **Step 3: Patch Assistant mission/stop conditions**

In `printer-addition-assistant.md`, add that the Assistant:

```markdown
- owns assisted source confirmation and can classify packets as
  `unverified-model`, `needs-source-resolution`, `needs-owner-taxonomy`,
  `needs-taxonomy-decision`, `blocked`, or `ship-ready`;
- must apply the protocol source hierarchy before recommending ship/fix/decline;
- must block shipping when a profile/safety-critical field is low-confidence or
  conflicting;
- must record manufacturer-over-reseller decisions and dispatch review when a
  conflict affects profile/safety fields.
```

- [ ] **Step 4: QA Task 2**

Run:

```bash
git -C ../ai-operating-model diff --check -- docs/agents/printer-intake-scout.md docs/agents/printer-addition-assistant.md
rg -n "does \\*\\*not\\*\\* confirm FDM|ship-ready|needs-source-resolution|needs-owner-taxonomy|needs-taxonomy-decision|source hierarchy|low-confidence|profile/safety" ../ai-operating-model/docs/agents/printer-intake-scout.md ../ai-operating-model/docs/agents/printer-addition-assistant.md
```

Expected: diff check exits 0; `rg` prints deterministic-only Scout language and
Assistant blocking language.

- [ ] **Step 5: Commit Task 2**

From `Projects/ai-operating-model`:

```bash
git add docs/agents/printer-intake-scout.md docs/agents/printer-addition-assistant.md
git commit -m "docs: align printer intake agent evidence contracts"
```

- [ ] **Step 6: Review Task 2**

Dispatch subagent using the Review Gate Template, but point it at the
`ai-operating-model` repo and the Task 2 commit. Requirements:

```text
Task 2 must align only the Scout/Assistant contracts. The Scout must remain
deterministic and must not claim web research, validators, complete rows,
overlay payloads, or ship-ready packets. The Assistant must own source weighing,
blocked outcomes, and shipping gates. No iOS/TestFlight requirement.
```

Patch and re-review until verdict is `GO`.

---

### Task 3: Deterministic Scout Skeleton Evidence Policy

**Files:**
- Modify: `scripts/printer-intake-scout.test.js`
- Modify: `scripts/printer-intake-scout.js`

- [ ] **Step 1: Write failing test**

In `scripts/printer-intake-scout.test.js`, after TC20 verifies candidate
skeletons are written, read the first candidate JSON and add checks:

```javascript
  if (cands.length >= 1) {
    const cand = JSON.parse(fs.readFileSync(path.join(STAGING, cands[0]), 'utf8'));
    check('candidate skeleton carries evidencePolicy', !!cand.evidencePolicy,
      `got ${JSON.stringify(cand)}`);
    check('evidencePolicy says Scout cannot ship-ready',
      /cannot promote/i.test(cand.evidencePolicy.scoutLimitations || ''),
      `got ${JSON.stringify(cand.evidencePolicy)}`);
    check('evidencePolicy lists manufacturer authority first',
      Array.isArray(cand.evidencePolicy.sourceAuthority)
        && /Manufacturer authority/.test(cand.evidencePolicy.sourceAuthority[0] || ''),
      `got ${JSON.stringify(cand.evidencePolicy && cand.evidencePolicy.sourceAuthority)}`);
    check('evidencePolicy lists assisted-only outcomes',
      Array.isArray(cand.evidencePolicy.assistedOnlyOutcomes)
        && cand.evidencePolicy.assistedOnlyOutcomes.includes('needs-source-resolution')
        && cand.evidencePolicy.assistedOnlyOutcomes.includes('ship-ready'),
      `got ${JSON.stringify(cand.evidencePolicy && cand.evidencePolicy.assistedOnlyOutcomes)}`);
  }
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node scripts/printer-intake-scout.test.js
```

Expected: FAIL on the new `candidate skeleton carries evidencePolicy` check.

- [ ] **Step 3: Implement minimal skeleton metadata**

In `candidateSkeleton(item)` in `scripts/printer-intake-scout.js`, add this
property to the returned object, near `note`:

```javascript
    evidencePolicy: {
      scoutLimitations: 'Deterministic Scout cannot promote a request to ship-ready; assisted source research and owner/reviewer gates are required.',
      sourceAuthority: [
        'Manufacturer authority: official product page, manual, spec sheet, support/wiki, or manufacturer software profile',
        'Distributor/reseller authority: corroborates naming/availability but does not override manufacturer safety/profile fields',
        'Independent review/community evidence: may inform mechanical clues but does not override manufacturer data',
        'Requester text: context only, never a spec source',
      ],
      fieldConfidence: ['confirmed', 'inferred', 'low-confidence'],
      assistedOnlyOutcomes: [
        'unverified-model',
        'needs-source-resolution',
        'needs-owner-taxonomy',
        'needs-taxonomy-decision',
        'blocked',
        'ship-ready',
      ],
      conflictRule: 'Manufacturer data outranks reseller/review/community data only when model/revision/region clearly matches; conflicts on profile/safety fields require review before shipping.',
    },
```

- [ ] **Step 4: Verify GREEN**

Run:

```bash
node scripts/printer-intake-scout.test.js
```

Expected: `ALL TESTS PASS`.

- [ ] **Step 5: QA Task 3**

Run:

```bash
git diff --check
node scripts/printer-intake-scout.test.js
```

Expected: both exit 0; Scout tests print `ALL TESTS PASS`.

- [ ] **Step 6: Commit Task 3**

```bash
git add scripts/printer-intake-scout.js scripts/printer-intake-scout.test.js
git commit -m "test: carry evidence policy in printer intake skeletons"
```

- [ ] **Step 7: Review Task 3**

Dispatch subagent using the Review Gate Template. Requirements:

```text
Task 3 must add a test-first private skeleton evidencePolicy only. It must not
change live catalog data, overlay data, KV behavior, classification behavior, or
PII handling. Scout tests must pass.
```

Patch and re-review until verdict is `GO`.

---

### Task 4: Planning Surface Update

**Files:**
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/sessions/NEXT-SESSION.md`

- [ ] **Step 1: Update ROADMAP active queue**

In the Printer Intake Automation item, replace the "Next" sentence with:

```markdown
**Evidence-rules hardening complete 2026-06-13:** source hierarchy, conflict
handling, confidence rules, assisted outcome classes, and deterministic Scout
skeleton policy are now codified before real backlog seeding. **Next:** seed
the real Discord backlog into remote KV and run the Scout end to end; Aries
should become an assisted `needs-source-resolution` / `needs-owner-taxonomy`
packet, while Photon should remain `declined-non-fdm`.
```

- [ ] **Step 2: Update NEXT-SESSION**

In `docs/sessions/NEXT-SESSION.md`, replace the locked next entry point with:

```markdown
1. **Real queue rehearsal** — seed/process the Discord backlog now that evidence
   rules are hardened. Expected outcomes: Voxelab Aries → assisted
   `needs-source-resolution` / `needs-owner-taxonomy` packet; Anycubic Photon
   Mono M7 Pro → `declined-non-fdm`. Do not edit live catalog/overlay/iOS until
   the Assistant presents a packet and owner approval is explicit.
```

- [ ] **Step 3: QA Task 4**

Run:

```bash
git diff --check
rg -n "Evidence-rules hardening complete|Real queue rehearsal|needs-source-resolution|needs-owner-taxonomy|declined-non-fdm|Do not edit live catalog" docs/planning/ROADMAP.md docs/sessions/NEXT-SESSION.md
```

Expected: diff check exits 0; `rg` prints all required phrases.

- [ ] **Step 4: Commit Task 4**

```bash
git add docs/planning/ROADMAP.md docs/sessions/NEXT-SESSION.md
git commit -m "docs: queue real printer backlog after evidence hardening"
```

- [ ] **Step 5: Review Task 4**

Dispatch subagent using the Review Gate Template. Requirements:

```text
Task 4 must update only planning/handoff text. It must point the next step at
real queue rehearsal after evidence hardening, not direct Aries shipping. It
must preserve no live catalog/overlay/iOS edits before owner approval.
```

Patch and re-review until verdict is `GO`.

---

### Task 5: Final Verification

**Files:**
- Verify all touched files.

- [ ] **Step 1: Run final web-repo verification**

Run:

```bash
git diff --check origin/main..HEAD
node scripts/printer-intake-scout.test.js
rg -n "Source authority|Field confidence|Outcome classes|needs-source-resolution|needs-owner-taxonomy|needs-taxonomy-decision|parse-error|blocked" docs/runbooks/printer-addition-protocol.md docs/superpowers/specs/2026-06-13-printer-intake-evidence-rules-design.md
```

Expected: diff check exits 0; Scout tests print `ALL TESTS PASS`; grep prints
the rule terms.

- [ ] **Step 2: Run final ai-operating-model verification**

Run:

```bash
git -C ../ai-operating-model diff --check origin/main..HEAD
rg -n "does \\*\\*not\\*\\* confirm FDM|ship-ready|needs-source-resolution|needs-owner-taxonomy|needs-taxonomy-decision|source hierarchy|low-confidence|profile/safety" ../ai-operating-model/docs/agents/printer-intake-scout.md ../ai-operating-model/docs/agents/printer-addition-assistant.md
```

Expected: diff check exits 0; grep prints the role-boundary and blocking terms.

- [ ] **Step 3: Final subagent review**

Dispatch a final reviewer over the complete arc. Requirements:

```text
Review the completed printer-intake evidence-rules hardening arc across
3dprintassistant and ai-operating-model. Confirm it implements the spec, preserves
Scout/Assistant role separation, does not mutate catalog/overlay/iOS data, and
leaves the next action as real queue rehearsal rather than direct Aries shipping.
```

Patch and re-review until verdict is `GO`.

- [ ] **Step 4: Push and release hold**

Run:

```bash
git status --short --branch
git push origin main
git -C ../ai-operating-model status --short --branch
git -C ../ai-operating-model push origin main
~/.claude/claude-sync.sh release
```

Expected: both relevant repos are clean/current after push, and the sync hold is
released.
