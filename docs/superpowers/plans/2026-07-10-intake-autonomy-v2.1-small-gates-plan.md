# Intake Autonomy v2.1 Small-Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Intake Autonomy v2.1 so source evidence is recorded before review, NO-GO taint cannot reach timer-based retry, shipped printers keep committed provenance, and K2 SE migrates safely to `decision-required`.

**Architecture:** Add deterministic CommonJS helpers around the existing intake scripts. Gate R0 lands the taxonomy graph first so later sidecar writes cannot be misclassified; later gates add evidence validation, reviewer objection validation, parked-store migration, retry gating, provenance custody, runner/runbook integration, and a controlled K2 SE acceptance path.

**Tech Stack:** Node.js CommonJS scripts, `node:test`, shell scripts, existing `bridge` cross-model review workflow, existing 3dpa validators.

## Global Constraints

- This is an amendment to `docs/superpowers/specs/2026-07-10-intake-autonomy-v2.1-evidence-retry-retrospective-design.md`; v2 remains authoritative where v2.1 does not override it.
- Engine/app/data profile semantics are unchanged until a real printer ships. No `engine.js`, `app.js`, or `data/*.json` edit is part of gates R0-R7.
- Web UI: no change. iOS: no binary/TestFlight change. Android plan: no change.
- Gate order is binding. Do not create a component that can write a v2.1 parked sidecar before R0 taxonomy validation is green.
- Every gate ends with: implementation tests green, relevant project validators green, hostile review, patch findings, cross-model check, then commit.
- Cross-model command when Codex is driving: `bridge --mode claude-only "<focused gate review prompt>" --out-dir codex/intake-autonomy-v2.1-review --turn-timeout-seconds 1200`.
- Cross-model command when Claude is driving: `bridge --mode codex-only "<focused gate review prompt>" --out-dir codex/intake-autonomy-v2.1-review --turn-timeout-seconds 1200`.
- Before any gate review, set `BRIDGE_MODE=claude-only` when Codex is driving or `BRIDGE_MODE=codex-only` when Claude is driving; all gate commands below use that variable.
- If a reviewer NO-GOs a gate, patch and re-review that gate before opening the next gate.
- One accepted review finding = one commit. Do not batch unrelated fixes.
- Do not dispatch TestFlight. iOS mirror work, if any future data row ships, stays local under the iOS push gate unless owner explicitly enters a ship train.

---

## File Structure

- Create `scripts/intake-park-taxonomy.json`: declarative classes, reasons, bounds, triggers, and sanctioned review-entry edges.
- Create `scripts/intake-park-taxonomy.js`: taxonomy loader, reason classifier, NO-GO-taint reachability check, and CLI validator.
- Create `scripts/intake-park-taxonomy.test.js`: graph/reason tests, including no path from NO-GO taint to review except explicit owner or RD3-satisfying evidence.
- Create `scripts/lib/intake-source-normalizer.js`: canonical source identity shared by evidence validation, absence rationale, and retry gate.
- Create `scripts/lib/intake-source-normalizer.test.js`: host case/query/fragment/tracking/mirror normalization tests.
- Modify `scripts/printer-intake-scout.js`: candidate skeleton field slots for every profile/safety-critical field plus `evidenceType` and `absenceRationale`.
- Modify `scripts/printer-intake-scout.test.js`: skeleton assertions for the new evidence slots.
- Create `scripts/validate-candidate-evidence.js`: deterministic evidence gate; classifies missing evidence as `research-defect` or `world-absent`.
- Create `scripts/validate-candidate-evidence.test.js`: app-cap, absence-rationale, missing-source, and validator-owned `world-absent` tests.
- Create `scripts/validate-reviewer-output.js`: reviewer result contract validator.
- Create `scripts/validate-reviewer-output.test.js`: GO/NO-GO/malformed reviewer output tests.
- Create `scripts/intake-parked-store.js`: v2 sidecar writer/reader/migrator with taint and `repairAttempts`.
- Create `scripts/intake-parked-store.test.js`: taint refusal, repair bound, K2 SE migration to `decision-required`.
- Create `scripts/intake-retry-gate.js`: RD3 retry eligibility checks.
- Create `scripts/intake-retry-gate.test.js`: canonical novelty, excerpt/claim presence, replay guard, zero-review-turn refusal tests.
- Create `scripts/intake-provenance-store.js`: committed provenance updater for `docs/printer-provenance.json`.
- Create `scripts/intake-provenance-store.test.js`: idempotent per-printer append/update tests.
- Create `docs/printer-provenance.json`: tracked empty provenance object.
- Modify `scripts/intake-run-preflight.sh`: narrowly recognized custody-state pass for provenance + outcomes ledger.
- Create `scripts/intake-run-preflight.test.sh`: crash-window fixture tests for dirty/ahead custody states.
- Modify `scripts/intake-run-kickoff.md`: contract version note and v2.1 gate order.
- Modify `docs/runbooks/printer-addition-protocol.md`: v2.1 evidence/retry/provenance operational amendment.
- Modify `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md`: append v2.1 gate rows as gates finish.

---

## Task R-1: Execution Branch Setup

**Files:**
- No file edits.

**Interfaces:**
- Produces: implementation branch `codex/intake-v21-impl`.
- Consumes: clean `main` after the planning PR is merged.

- [ ] **Step 1: Sync main**

```bash
git switch main
git pull --ff-only
git status --short --branch
```

Expected: `## main...origin/main` and no dirty files.

- [ ] **Step 2: Create implementation branch**

```bash
git switch -c codex/intake-v21-impl
```

Expected: `Switched to a new branch 'codex/intake-v21-impl'`.

---

## Task R0: Taxonomy Config And NO-GO Taint Graph

**Files:**
- Create: `scripts/intake-park-taxonomy.json`
- Create: `scripts/intake-park-taxonomy.js`
- Create: `scripts/intake-park-taxonomy.test.js`
- Modify: `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md`

**Interfaces:**
- Produces: `classifyParkReason(reason, sidecar) -> { className, trigger, bound, reviewEntry }`
- Produces: `validateTaxonomyGraph(taxonomy) -> { ok, violations }`
- Consumes later: `intake-parked-store.js`, `intake-retry-gate.js`, runner integration.

- [ ] **Step 1: Write the failing taxonomy graph tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  loadTaxonomy,
  classifyParkReason,
  validateTaxonomyGraph,
} = require('./intake-park-taxonomy.js');

test('review-no-go is judgment-on-evidence and never timer-triggered', () => {
  const t = loadTaxonomy();
  const c = classifyParkReason('review-no-go', { tainted: true }, t);
  assert.equal(c.className, 'judgment-on-evidence');
  assert.equal(c.trigger, 'event');
  assert.equal(c.reviewEntry, false);
});

test('unknown reasons fail closed to decision-required', () => {
  const t = loadTaxonomy();
  const c = classifyParkReason('future-surprise', { tainted: false }, t);
  assert.equal(c.className, 'decision-required');
  assert.equal(c.trigger, 'owner');
});

test('NO-GO taint has no automatic path to a review turn', () => {
  const t = loadTaxonomy();
  const result = validateTaxonomyGraph(t);
  assert.deepEqual(result.violations, []);
  assert.equal(result.ok, true);
});

test('future needs-source-resolution:conflicting is not active yet', () => {
  const t = loadTaxonomy();
  const c = classifyParkReason('needs-source-resolution:conflicting', { tainted: false }, t);
  assert.equal(c.className, 'decision-required');
});
```

- [ ] **Step 2: Run RED**

Run: `node scripts/intake-park-taxonomy.test.js`

Expected: FAIL with `Cannot find module './intake-park-taxonomy.js'`.

- [ ] **Step 3: Create taxonomy JSON**

```json
{
  "schema": "intake-park-taxonomy@1",
  "classes": {
    "availability-blocked": {
      "reasons": ["review-unavailable"],
      "trigger": "next-run",
      "bound": 5,
      "reviewEntry": true,
      "taintedAllowed": false
    },
    "research-defect": {
      "reasons": ["research-defect"],
      "trigger": "next-run",
      "bound": 1,
      "reviewEntry": true,
      "taintedAllowed": false
    },
    "world-absent": {
      "reasons": ["world-absent"],
      "trigger": "weekly",
      "bound": 4,
      "reviewEntry": true,
      "taintedAllowed": false
    },
    "judgment-on-evidence": {
      "reasons": ["review-no-go", "review-no-go-unresolved"],
      "trigger": "event",
      "bound": null,
      "reviewEntry": false,
      "taintedAllowed": true
    },
    "decision-required": {
      "reasons": ["new-series-group", "app-cap-no-go", "pd4-criteria-unmet", "review-split", "needs-owner-taxonomy", "needs-taxonomy-decision", "blocked", "needs-source-resolution"],
      "trigger": "owner",
      "bound": null,
      "reviewEntry": false,
      "taintedAllowed": true
    },
    "transient-pipeline": {
      "reasons": ["main-moved"],
      "trigger": "immediate",
      "bound": 2,
      "reviewEntry": false,
      "taintedAllowed": false
    }
  },
  "sanctionedTaintedReviewEdges": ["owner-instruction", "rd3-external-evidence"]
}
```

- [ ] **Step 4: Implement taxonomy helper**

```js
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DEFAULT_PATH = path.join(__dirname, 'intake-park-taxonomy.json');

function loadTaxonomy(filePath = DEFAULT_PATH) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function classifyParkReason(reason, sidecar = {}, taxonomy = loadTaxonomy()) {
  for (const [className, def] of Object.entries(taxonomy.classes || {})) {
    if ((def.reasons || []).includes(reason)) {
      if (sidecar.tainted && def.taintedAllowed === false) {
        return { className: 'decision-required', trigger: 'owner', bound: null, reviewEntry: false };
      }
      return { className, trigger: def.trigger, bound: def.bound, reviewEntry: !!def.reviewEntry };
    }
  }
  return { className: 'decision-required', trigger: 'owner', bound: null, reviewEntry: false };
}

function validateTaxonomyGraph(taxonomy = loadTaxonomy()) {
  const violations = [];
  for (const [className, def] of Object.entries(taxonomy.classes || {})) {
    if (def.taintedAllowed === true && def.reviewEntry === true) {
      violations.push(`${className} allows taint and automatic review entry`);
    }
    if (def.taintedAllowed === true && ['next-run', 'weekly', 'immediate'].includes(def.trigger)) {
      violations.push(`${className} allows taint and automatic trigger ${def.trigger}`);
    }
  }
  return { ok: violations.length === 0, violations };
}

if (require.main === module) {
  const taxonomy = loadTaxonomy(process.argv[2] || DEFAULT_PATH);
  const result = validateTaxonomyGraph(taxonomy);
  for (const v of result.violations) console.error(`[intake-park-taxonomy] ${v}`);
  console.log(`[intake-park-taxonomy] ok=${result.ok}`);
  process.exit(result.ok ? 0 : 1);
}

module.exports = { loadTaxonomy, classifyParkReason, validateTaxonomyGraph };
```

- [ ] **Step 5: Run GREEN**

Run: `node scripts/intake-park-taxonomy.test.js && node scripts/intake-park-taxonomy.js`

Expected: tests pass and CLI prints `[intake-park-taxonomy] ok=true`.

- [ ] **Step 6: Gate review**

Run: `bridge --mode "$BRIDGE_MODE" "Review R0 taxonomy config and graph test for Intake Autonomy v2.1. Verify no NO-GO taint can reach automatic review, and unknown reasons fail closed. Files: scripts/intake-park-taxonomy.json scripts/intake-park-taxonomy.js scripts/intake-park-taxonomy.test.js" --out-dir codex/intake-autonomy-v2.1-review --turn-timeout-seconds 1200`

Expected: GO or GO-WITH-PATCHES. Apply accepted findings before commit.

- [ ] **Step 7: Commit**

```bash
git add scripts/intake-park-taxonomy.json scripts/intake-park-taxonomy.js scripts/intake-park-taxonomy.test.js docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md
git commit -m "feat(intake): add v2.1 park taxonomy guard"
```

## Task R1: Evidence Slots And Candidate Evidence Gate

**Files:**
- Create: `scripts/lib/intake-source-normalizer.js`
- Create: `scripts/lib/intake-source-normalizer.test.js`
- Create: `scripts/validate-candidate-evidence.js`
- Create: `scripts/validate-candidate-evidence.test.js`
- Modify: `scripts/printer-intake-scout.js`
- Modify: `scripts/printer-intake-scout.test.js`
- Modify: `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md`

**Interfaces:**
- Produces: `canonicalSource(url) -> string`
- Produces: `validateCandidateEvidence(candidate) -> { ok, reason, errors }`
- Consumes: candidate skeletons emitted by `printer-intake-scout.js`.

- [ ] **Step 1: Write RED tests for source normalization**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalSource } = require('./intake-source-normalizer.js');

test('canonicalSource ignores case, fragments, and tracking params', () => {
  assert.equal(
    canonicalSource('HTTPS://Creality.COM/products/k2-se?utm_source=x&ref=abc#specs'),
    'creality.com/products/k2-se'
  );
});
```

Run: `node scripts/lib/intake-source-normalizer.test.js`

Expected: FAIL with missing module.

- [ ] **Step 2: Implement source normalizer**

```js
function canonicalSource(input) {
  const u = new URL(String(input));
  u.hash = '';
  const tracking = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref'];
  for (const key of tracking) u.searchParams.delete(key);
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = u.pathname.replace(/\/+$/, '') || '/';
  const query = u.searchParams.toString();
  return `${host}${pathname}${query ? `?${query}` : ''}`;
}

module.exports = { canonicalSource };
```

- [ ] **Step 3: Write RED tests for candidate evidence**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCandidateEvidence } = require('./validate-candidate-evidence.js');

function baseCandidate(overrides = {}) {
  const confirmed = (value) => ({ value, source: 'https://creality.com/products/k2-se', confidence: 'confirmed', evidenceType: 'manufacturer' });
  return {
    schema: 'printer-intake-candidate@1',
    printersJsonRow: {
      extruder_type: confirmed('direct_drive'),
      enclosure: confirmed('open'),
      max_nozzle_temp: confirmed(300),
      max_bed_temp: confirmed(100),
      max_speed: confirmed(500),
      max_acceleration: { value: 20000, source: null, confidence: 'inferred', evidenceType: 'app-cap' },
      available_nozzle_sizes: confirmed([0.4]),
      multi_color_systems: confirmed(['cfs']),
      available_plates: confirmed(['textured_pei']),
      active_chamber_heating: { value: false, source: null, confidence: 'confirmed', evidenceType: 'absence-rationale',
        absenceRationale: {
          sourceClassesChecked: ['official-product-page'],
          checkedSources: [{ canonicalSource: 'creality.com/products/k2-se', retrievedAt: '2026-07-10T00:00:00Z' }],
          normallyAdvertisedIfPresent: 'Creality advertises active chamber heating on K-series pages when present.',
          omissionSafeBecause: 'False is conservative for open-frame thermal handling.'
        } },
      has_camera: { value: false, source: null, confidence: 'confirmed', evidenceType: 'absence-rationale',
        absenceRationale: {
          sourceClassesChecked: ['official-product-page'],
          checkedSources: [{ canonicalSource: 'creality.com/products/k2-se', retrievedAt: '2026-07-10T00:00:00Z' }],
          normallyAdvertisedIfPresent: 'Creality advertises camera features when present.',
          omissionSafeBecause: 'False disables optional feature assumptions.'
        } },
      has_lidar: { value: false, source: null, confidence: 'confirmed', evidenceType: 'absence-rationale',
        absenceRationale: {
          sourceClassesChecked: ['official-product-page'],
          checkedSources: [{ canonicalSource: 'creality.com/products/k2-se', retrievedAt: '2026-07-10T00:00:00Z' }],
          normallyAdvertisedIfPresent: 'Creality advertises LiDAR on K-series pages when present.',
          omissionSafeBecause: 'LiDAR affects feature flags only; false is conservative.'
        } }
    },
    ...overrides
  };
}

test('confirmed manufacturer evidence passes', () => {
  assert.equal(validateCandidateEvidence(baseCandidate()).ok, true);
});

test('missing source on max_speed parks as research-defect', () => {
  const c = baseCandidate();
  c.printersJsonRow.max_speed.source = null;
  const r = validateCandidateEvidence(c);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'research-defect');
});

test('absence rationale with silence parks', () => {
  const c = baseCandidate();
  delete c.printersJsonRow.has_lidar.absenceRationale;
  const r = validateCandidateEvidence(c);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'research-defect');
});

test('complete source sweep can classify absence as world-absent', () => {
  const c = baseCandidate();
  c.printersJsonRow.max_speed = {
    value: null,
    source: null,
    confidence: 'low-confidence',
    evidenceType: 'absence-rationale',
    absenceRationale: {
      sourceClassesChecked: ['official-product-page', 'manual', 'support-wiki'],
      checkedSources: [{ canonicalSource: 'creality.com/products/k2-se', retrievedAt: '2026-07-10T00:00:00Z' }],
      normallyAdvertisedIfPresent: 'Maximum speed is normally advertised on printer product/spec pages.',
      omissionSafeBecause: 'The field cannot be safely invented; the candidate must park until the world changes.'
    }
  };
  const r = validateCandidateEvidence(c);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'world-absent');
  assert.equal(r.worldAbsentFields.includes('max_speed'), true);
});
```

Run: `node scripts/validate-candidate-evidence.test.js`

Expected: FAIL with missing module.

- [ ] **Step 4: Add candidate skeleton fields**

Modify `FIELD` in `scripts/printer-intake-scout.js`:

```js
const FIELD = () => ({ value: null, source: null, confidence: 'low-confidence', evidenceType: null, absenceRationale: null });
```

Extend `printersJsonRow`:

```js
extruder_type: FIELD(), max_acceleration: FIELD(),
active_chamber_heating: FIELD(), has_camera: FIELD(), has_lidar: FIELD(),
```

- [ ] **Step 5: Implement `validate-candidate-evidence.js`**

```js
#!/usr/bin/env node
const fs = require('fs');

const CRITICAL_FIELDS = [
  'extruder_type', 'enclosure', 'max_nozzle_temp', 'max_bed_temp', 'max_speed',
  'max_acceleration', 'available_nozzle_sizes', 'multi_color_systems',
  'available_plates', 'active_chamber_heating', 'has_camera', 'has_lidar'
];

function hasAbsenceRationale(field) {
  const r = field && field.absenceRationale;
  return !!(r && Array.isArray(r.sourceClassesChecked) && r.sourceClassesChecked.length
    && Array.isArray(r.checkedSources) && r.checkedSources.length
    && r.normallyAdvertisedIfPresent && r.omissionSafeBecause);
}

function hasCompleteSourceSweep(field) {
  const classes = new Set(((field && field.absenceRationale && field.absenceRationale.sourceClassesChecked) || []));
  return classes.has('official-product-page') && classes.has('manual') && classes.has('support-wiki');
}

function fieldPasses(name, field) {
  if (!field || field.value === null || field.value === undefined) return false;
  if (field.confidence === 'confirmed' && field.source) return true;
  if (name === 'max_acceleration' && field.evidenceType === 'app-cap') return true;
  if (field.evidenceType === 'absence-rationale' && field.value === false && hasAbsenceRationale(field)) return true;
  return false;
}

function validateCandidateEvidence(candidate) {
  const row = candidate.printersJsonRow || {};
  const errors = [];
  const worldAbsentFields = [];
  for (const name of CRITICAL_FIELDS) {
    if (!fieldPasses(name, row[name])) {
      errors.push(`missing or insufficient evidence for ${name}`);
      if (row[name] && row[name].evidenceType === 'absence-rationale' && hasCompleteSourceSweep(row[name])) worldAbsentFields.push(name);
    }
  }
  const reason = errors.length ? (worldAbsentFields.length === errors.length ? 'world-absent' : 'research-defect') : null;
  return { ok: errors.length === 0, reason, errors, worldAbsentFields };
}

if (require.main === module) {
  const candidate = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const result = validateCandidateEvidence(candidate);
  for (const e of result.errors) console.error(`[validate-candidate-evidence] ${e}`);
  console.log(`[validate-candidate-evidence] ok=${result.ok} reason=${result.reason || 'none'}`);
  process.exit(result.ok ? 0 : 1);
}

module.exports = { validateCandidateEvidence, CRITICAL_FIELDS };
```

- [ ] **Step 6: Add Scout skeleton regression**

In `scripts/printer-intake-scout.test.js`, assert a fixture-generated candidate contains:

```js
assert.deepEqual(Object.keys(candidate.printersJsonRow.max_speed).sort(), ['absenceRationale', 'confidence', 'evidenceType', 'source', 'value'].sort());
assert.ok(candidate.printersJsonRow.extruder_type);
assert.ok(candidate.printersJsonRow.max_acceleration);
assert.ok(candidate.printersJsonRow.active_chamber_heating);
assert.ok(candidate.printersJsonRow.has_camera);
assert.ok(candidate.printersJsonRow.has_lidar);
```

- [ ] **Step 7: Run GREEN**

Run:

```bash
node scripts/lib/intake-source-normalizer.test.js
node scripts/validate-candidate-evidence.test.js
node scripts/printer-intake-scout.test.js
```

Expected: all tests exit 0.

- [ ] **Step 8: Gate review and commit**

Run bridge with prompt:

```bash
bridge --mode "$BRIDGE_MODE" "Review R1 evidence slots and candidate evidence gate for Intake Autonomy v2.1. Focus on source provenance, absence-rationale deadlocks, and whether a researcher can self-select world-absent. Files: scripts/printer-intake-scout.js scripts/printer-intake-scout.test.js scripts/validate-candidate-evidence.js scripts/validate-candidate-evidence.test.js scripts/lib/intake-source-normalizer.js scripts/lib/intake-source-normalizer.test.js" --out-dir codex/intake-autonomy-v2.1-review --turn-timeout-seconds 1200
git add scripts/printer-intake-scout.js scripts/printer-intake-scout.test.js scripts/validate-candidate-evidence.js scripts/validate-candidate-evidence.test.js scripts/lib/intake-source-normalizer.js scripts/lib/intake-source-normalizer.test.js docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md
git commit -m "feat(intake): validate v2.1 candidate evidence"
```

## Task R2: Reviewer Output Contract

**Files:**
- Create: `scripts/validate-reviewer-output.js`
- Create: `scripts/validate-reviewer-output.test.js`
- Modify: `scripts/intake-run-kickoff.md`
- Modify: `docs/runbooks/printer-addition-protocol.md`
- Modify: `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md`

**Interfaces:**
- Produces: `validateReviewerOutput(output) -> { ok, errors }`
- Consumes later: `intake-parked-store.js` stores validated objections.

- [ ] **Step 1: Write RED tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateReviewerOutput } = require('./validate-reviewer-output.js');

test('NO-GO requires at least one structured objection', () => {
  const r = validateReviewerOutput({ reviewer: 'hostile', verdict: 'NO-GO', objections: [] });
  assert.equal(r.ok, false);
});

test('GO requires no objections', () => {
  const r = validateReviewerOutput({ reviewer: 'hostile', verdict: 'GO', objections: [] });
  assert.equal(r.ok, true);
});

test('structured NO-GO passes', () => {
  const r = validateReviewerOutput({
    reviewer: 'codex',
    verdict: 'NO-GO',
    objections: [{ field: 'max_speed', question: 'Source the 500 mm/s cap.', raisedAt: '2026-07-10T00:00:00Z' }]
  });
  assert.equal(r.ok, true);
});
```

- [ ] **Step 2: Implement validator**

```js
function validateReviewerOutput(output) {
  const errors = [];
  if (!output || typeof output !== 'object') errors.push('output must be an object');
  if (!output.reviewer) errors.push('reviewer is required');
  if (!['GO', 'NO-GO'].includes(output.verdict)) errors.push('verdict must be GO or NO-GO');
  if (!Array.isArray(output.objections)) errors.push('objections must be an array');
  if (Array.isArray(output.objections)) {
    if (output.verdict === 'GO' && output.objections.length !== 0) errors.push('GO must have empty objections');
    if (output.verdict === 'NO-GO' && output.objections.length === 0) errors.push('NO-GO requires objections');
    for (const [i, o] of output.objections.entries()) {
      if (!o.field) errors.push(`objections[${i}].field is required`);
      if (!o.question) errors.push(`objections[${i}].question is required`);
      if (Number.isNaN(Date.parse(o.raisedAt || ''))) errors.push(`objections[${i}].raisedAt must be ISO-8601`);
    }
  }
  return { ok: errors.length === 0, errors };
}

module.exports = { validateReviewerOutput };
```

- [ ] **Step 3: Update contracts**

In `scripts/intake-run-kickoff.md`, add:

```md
Every reviewer must emit the v2.1 structured result before prose:
`{ reviewer, verdict:"GO"|"NO-GO", objections:[{field,question,raisedAt}] }`.
Malformed reviewer output parks as `review-unavailable`; do not infer objections
from prose.
```

In `docs/runbooks/printer-addition-protocol.md`, add the same contract under the autonomous review section.

- [ ] **Step 4: Run GREEN**

Run: `node scripts/validate-reviewer-output.test.js`

Expected: all tests pass.

- [ ] **Step 5: Gate review and commit**

```bash
bridge --mode "$BRIDGE_MODE" "Review R2 reviewer-output contract for v2.1. Verify malformed output cannot silently pass and NO-GO objections are structured enough for RD3." --out-dir codex/intake-autonomy-v2.1-review --turn-timeout-seconds 1200
git add scripts/validate-reviewer-output.js scripts/validate-reviewer-output.test.js scripts/intake-run-kickoff.md docs/runbooks/printer-addition-protocol.md docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md
git commit -m "feat(intake): validate reviewer objection output"
```

## Task R3: Parked Store V2 And K2 SE Migration

**Files:**
- Create: `scripts/intake-parked-store.js`
- Create: `scripts/intake-parked-store.test.js`
- Create: `scripts/fixtures/k2-se-parked-v1.json`
- Modify: `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md`

**Interfaces:**
- Consumes: `classifyParkReason()` from R0.
- Produces: `readParked(filePath)`, `writeParked(filePath, sidecar)`, `migrateParkedV1(sidecar)`, `enterResearchRepair(sidecar)`.

- [ ] **Step 1: Write RED tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { migrateParkedV1, enterResearchRepair, assertWritableClass } = require('./intake-parked-store.js');

test('K2 SE v1 review-no-go migrates to decision-required and tainted', () => {
  const migrated = migrateParkedV1({
    reason: 'review-no-go',
    objections: [{ reviewer: 'hostile', field: 'max_speed', question: 'source?', raisedAt: '2026-07-10T10:16:47Z' }]
  });
  assert.equal(migrated.class, 'decision-required');
  assert.equal(migrated.tainted, true);
});

test('tainted sidecar cannot be written to research-defect', () => {
  assert.throws(() => assertWritableClass({ tainted: true, class: 'research-defect' }), /tainted/i);
});

test('research-defect gets one repair attempt only', () => {
  const first = enterResearchRepair({ class: 'research-defect', tainted: false, repairAttempts: 0 });
  assert.equal(first.repairAttempts, 1);
  assert.equal(first.class, 'research-defect');
  const second = enterResearchRepair(first);
  assert.equal(second.class, 'decision-required');
});
```

- [ ] **Step 2: Create K2 SE v1 fixture**

Create `scripts/fixtures/k2-se-parked-v1.json`:

```json
{
  "reason": "review-no-go",
  "candidateKey": ["req:1783615951531:a03e6e7e"],
  "firstParkedAt": "2026-07-10T10:16:47Z",
  "lastAttemptAt": "2026-07-10T10:16:47Z",
  "diffSha": "b88ae6df048d75c6",
  "objections": [
    { "reviewer": "hostile", "field": "multi_color_systems", "question": "Verify CFS support from manufacturer evidence.", "raisedAt": "2026-07-10T10:16:47Z" },
    { "reviewer": "hostile", "field": "max_speed", "question": "Verify 500mm/s is the K2 SE cap.", "raisedAt": "2026-07-10T10:16:47Z" }
  ]
}
```

- [ ] **Step 3: Implement parked store**

```js
const fs = require('fs');
const { classifyParkReason } = require('./intake-park-taxonomy.js');

function isTainted(sidecar) {
  return !!sidecar.tainted || (sidecar.verdictRefs || []).some((v) => v.verdict === 'NO-GO') || sidecar.reason === 'review-no-go';
}

function assertWritableClass(sidecar) {
  if (isTainted(sidecar) && ['research-defect', 'world-absent', 'availability-blocked'].includes(sidecar.class)) {
    throw new Error(`tainted candidate cannot enter ${sidecar.class}`);
  }
}

function migrateParkedV1(v1) {
  const tainted = isTainted(v1);
  const classified = classifyParkReason(v1.reason, { tainted });
  const migrated = {
    schema: 'intake-parked@2',
    ...v1,
    class: tainted && v1.reason === 'review-no-go' ? 'decision-required' : classified.className,
    repairAttempts: v1.repairAttempts || 0,
    verdictRefs: v1.verdictRefs || (v1.reason === 'review-no-go' ? [{ reviewer: 'unknown', verdict: 'NO-GO', at: v1.lastAttemptAt || v1.firstParkedAt || null, ref: 'v1-migration' }] : []),
    tainted
  };
  assertWritableClass(migrated);
  return migrated;
}

function enterResearchRepair(sidecar) {
  if (sidecar.class !== 'research-defect') return sidecar;
  const repairAttempts = Number(sidecar.repairAttempts || 0);
  if (repairAttempts >= 1) return { ...sidecar, class: 'decision-required', nextEligibleTrigger: 'owner' };
  return { ...sidecar, repairAttempts: repairAttempts + 1 };
}

function readParked(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return raw.schema === 'intake-parked@2' ? raw : migrateParkedV1(raw);
}

function writeParked(filePath, sidecar) {
  assertWritableClass(sidecar);
  fs.writeFileSync(filePath, JSON.stringify(sidecar, null, 2) + '\n');
}

module.exports = { isTainted, assertWritableClass, migrateParkedV1, enterResearchRepair, readParked, writeParked };
```

- [ ] **Step 4: Run GREEN**

Run: `node scripts/intake-parked-store.test.js`

Expected: tests pass.

- [ ] **Step 5: Gate review and commit**

```bash
bridge --mode "$BRIDGE_MODE" "Review R3 parked-store v2 and K2 SE migration. Verify tainted review-no-go cannot become research-defect/world-absent/availability-blocked and repairAttempts is enforced." --out-dir codex/intake-autonomy-v2.1-review --turn-timeout-seconds 1200
git add scripts/intake-parked-store.js scripts/intake-parked-store.test.js scripts/fixtures/k2-se-parked-v1.json docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md
git commit -m "feat(intake): add v2.1 parked-store migration"
```

## Task R4: RD3 Retry Gate

**Files:**
- Create: `scripts/intake-retry-gate.js`
- Create: `scripts/intake-retry-gate.test.js`
- Modify: `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md`

**Interfaces:**
- Consumes: `canonicalSource()` and v2 parked sidecar.
- Produces: `canRetryJudgment(sidecar, regenerated) -> { ok, reason, errors, reviewRequests }`

- [ ] **Step 1: Write RED tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { canRetryJudgment } = require('./intake-retry-gate.js');

function sidecar() {
  return {
    class: 'judgment-on-evidence',
    diffSha: 'old',
    evidence: [{ canonicalSource: 'creality.com/products/k2-se' }],
    objections: [{ field: 'max_speed', question: 'source 500', raisedAt: '2026-07-10T00:00:00Z' }]
  };
}

test('bare URL does not satisfy objection', () => {
  const r = canRetryJudgment(sidecar(), { diffSha: 'new', objections: [{ resolvedBy: { source: 'https://creality.com/products/k2-se' } }] });
  assert.equal(r.ok, false);
  assert.equal(r.reviewRequests, 0);
});

test('same canonical source with query param is not novel', () => {
  const r = canRetryJudgment(sidecar(), { diffSha: 'new', objections: [{ resolvedBy: { source: 'https://www.creality.com/products/k2-se?utm_source=x', excerpt: '500 mm/s', claim: 'max_speed=500' } }] });
  assert.equal(r.ok, false);
});

test('new source with excerpt and claim passes structural gate', () => {
  const r = canRetryJudgment(sidecar(), { diffSha: 'new', objections: [{ resolvedBy: { source: 'https://support.creality.com/k2-se-specs', excerpt: 'Maximum speed 500 mm/s', claim: 'max_speed=500' } }] });
  assert.equal(r.ok, true);
});

test('unchanged diffSha refuses retry before any review turn', () => {
  const r = canRetryJudgment(sidecar(), { diffSha: 'old', objections: [{ resolvedBy: { source: 'https://support.creality.com/k2-se-specs', excerpt: 'Maximum speed 500 mm/s', claim: 'max_speed=500' } }] });
  assert.equal(r.ok, false);
  assert.equal(r.reviewRequests, 0);
});
```

- [ ] **Step 2: Implement retry gate**

```js
const { canonicalSource } = require('./lib/intake-source-normalizer.js');

function canRetryJudgment(sidecar, regenerated) {
  const errors = [];
  const known = new Set((sidecar.evidence || []).map((e) => e.canonicalSource).filter(Boolean));
  if (regenerated.diffSha === sidecar.diffSha) errors.push('diffSha unchanged');
  const resolved = regenerated.objections || [];
  for (let i = 0; i < (sidecar.objections || []).length; i += 1) {
    const r = resolved[i] && resolved[i].resolvedBy;
    if (!r) errors.push(`objection ${i} has no resolvedBy`);
    else {
      if (!r.source || !r.excerpt || !r.claim) errors.push(`objection ${i} lacks source/excerpt/claim`);
      if (r.source) {
        const c = canonicalSource(r.source);
        if (known.has(c)) errors.push(`objection ${i} source is not novel: ${c}`);
      }
    }
  }
  return { ok: errors.length === 0, reason: errors.length ? 'review-no-go-unresolved' : null, errors, reviewRequests: errors.length ? 0 : 1 };
}

module.exports = { canRetryJudgment };
```

- [ ] **Step 3: Run GREEN**

Run: `node scripts/intake-retry-gate.test.js`

Expected: tests pass.

- [ ] **Step 4: Gate review and commit**

```bash
bridge --mode "$BRIDGE_MODE" "Review R4 RD3 retry gate. Verify bare URLs, same canonical sources, unchanged diffs, and missing excerpts consume zero review turns." --out-dir codex/intake-autonomy-v2.1-review --turn-timeout-seconds 1200
git add scripts/intake-retry-gate.js scripts/intake-retry-gate.test.js docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md
git commit -m "feat(intake): gate judgment retries on new evidence"
```

## Task R5: Provenance Store And Custody Preflight

**Files:**
- Create: `docs/printer-provenance.json`
- Create: `scripts/intake-provenance-store.js`
- Create: `scripts/intake-provenance-store.test.js`
- Modify: `scripts/intake-run-preflight.sh`
- Create: `scripts/intake-run-preflight.test.sh`
- Modify: `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md`

**Interfaces:**
- Produces: `upsertPrinterProvenance(doc, printerId, provenance) -> doc`
- Modifies preflight: tolerate only two custody paths and only custody-subject ahead commits.

- [ ] **Step 1: Write RED provenance tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { upsertPrinterProvenance } = require('./intake-provenance-store.js');

test('upsert is idempotent by printer id', () => {
  const doc = { schema: 'printer-provenance@1', printers: {} };
  const p = { max_speed: { value: 500, source: 'https://creality.com/products/k2-se', confidence: 'confirmed', evidenceType: 'manufacturer', gatheredAt: '2026-07-10T00:00:00Z' } };
  const once = upsertPrinterProvenance(doc, 'k2_se', p);
  const twice = upsertPrinterProvenance(once, 'k2_se', p);
  assert.deepEqual(twice, once);
});
```

- [ ] **Step 2: Create provenance file and store**

`docs/printer-provenance.json`:

```json
{
  "schema": "printer-provenance@1",
  "printers": {}
}
```

`scripts/intake-provenance-store.js`:

```js
function upsertPrinterProvenance(doc, printerId, provenance) {
  const next = JSON.parse(JSON.stringify(doc));
  next.schema = next.schema || 'printer-provenance@1';
  next.printers = next.printers || {};
  next.printers[printerId] = provenance;
  return next;
}

module.exports = { upsertPrinterProvenance };
```

- [ ] **Step 3: Write RED preflight custody tests**

`scripts/intake-run-preflight.test.sh` should create a temporary git repo, simulate:

```bash
# dirty allowed custody paths
printf '{}\n' > docs/printer-provenance.json
printf '{}\n' > scripts/printer-intake-outcomes.jsonl

# dirty disallowed path
printf bad > data/printers.json

# ahead commit with subject "chore(intake): custody ..."
# ahead commit with subject "feat(other): ..."
```

Expected assertions:

```bash
./scripts/intake-run-preflight.sh --repo "$tmp" --dry-run
# dirty custody only -> ok
# dirty third path -> non-zero
# ahead custody-only subject -> ok
# ahead foreign subject -> non-zero
```

- [ ] **Step 4: Patch preflight**

Add a function before the generic clean/in-sync predicate:

```sh
is_custody_path() {
  case "$1" in
    scripts/printer-intake-outcomes.jsonl|docs/printer-provenance.json) return 0 ;;
    *) return 1 ;;
  esac
}
```

Then recognize dirty/ahead custody states exactly. Anything outside those two paths or outside the custody commit subject pattern remains fail-closed.

- [ ] **Step 5: Run GREEN**

Run:

```bash
node scripts/intake-provenance-store.test.js
bash scripts/intake-run-preflight.test.sh
```

Expected: both exit 0.

- [ ] **Step 6: Gate review and commit**

```bash
bridge --mode "$BRIDGE_MODE" "Review R5 provenance store and preflight custody relaxation. Verify only the two custody paths and custody-subject ahead commits are tolerated, and everything else fail-closes." --out-dir codex/intake-autonomy-v2.1-review --turn-timeout-seconds 1200
git add docs/printer-provenance.json scripts/intake-provenance-store.js scripts/intake-provenance-store.test.js scripts/intake-run-preflight.sh scripts/intake-run-preflight.test.sh docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md
git commit -m "feat(intake): add provenance custody path"
```

## Task R6: Runner And Runbook Integration

**Files:**
- Modify: `scripts/intake-run-kickoff.md`
- Modify: `docs/runbooks/printer-addition-protocol.md`
- Modify: `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md`
- Cross-repo modify during execution: `/Users/mustafaozturk-macmini/dev/Claude/Projects/ai-operating-model/docs/agents/intake-pipeline-runner.md`

**Interfaces:**
- Consumes all R0-R5 scripts.
- Produces a contract sequence that invokes taxonomy, evidence, reviewer-output, retry, parked-store, provenance, and custody checks in order.

- [ ] **Step 1: Update kickoff stage order**

Replace the v1 kickoff stage sentence with:

```md
Follow the stage order exactly: preflight with v2.1 custody pass → v2.1 taxonomy
validation → parked-candidate migration/retry sweep → Scout triage
(`--source kv --no-watermark --out scripts/.printer-intake-out`) → per-candidate
research/fill → `validate-candidate-evidence.js` before any review turn →
`intake-retry-gate.js` for judgment-on-evidence retries → PD5 dual review with
structured reviewer output → parked-store write or merge+push → provenance+ledger
custody commit before watermark advance → live verify → iOS mirror local commit
only if data changed → KV hygiene → notify.
```

- [ ] **Step 2: Update runbook**

Add an "Intake Autonomy v2.1" subsection:

```md
Autonomous v2.1 additions:
- Every profile/safety-critical field must carry value/source/confidence/evidenceType.
- `world-absent` is validator-assigned only after typed absence rationale.
- Reviewer NO-GO emits structured objections; malformed reviewer output parks as `review-unavailable`.
- Any NO-GO taints the candidate; tainted candidates cannot enter timer/research repair lanes.
- Shipped printer provenance is committed to `docs/printer-provenance.json`.
```

- [ ] **Step 3: Edit ai-operating-model runner contract but do not commit yet**

From `/Users/mustafaozturk-macmini/dev/Claude/Projects/ai-operating-model`, update
`docs/agents/intake-pipeline-runner.md` to call the v2.1 scripts in the same
order. Leave the ai-om change uncommitted until the R6 bridge review has read it.

- [ ] **Step 4: Run docs/protocol verification**

Run:

```bash
node scripts/intake-park-taxonomy.js
node scripts/validate-candidate-evidence.test.js
node scripts/validate-reviewer-output.test.js
node scripts/intake-parked-store.test.js
node scripts/intake-retry-gate.test.js
node scripts/intake-provenance-store.test.js
bash scripts/intake-run-preflight.test.sh
```

Expected: all exit 0.

- [ ] **Step 5: Gate review and commit**

```bash
bridge --mode "$BRIDGE_MODE" "Review R6 runner/runbook integration for Intake Autonomy v2.1. Verify stage order and cross-repo contract wording cannot create a sidecar before R0 taxonomy or spend a review turn before evidence validation. Include these files: scripts/intake-run-kickoff.md, docs/runbooks/printer-addition-protocol.md, docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md, and /Users/mustafaozturk-macmini/dev/Claude/Projects/ai-operating-model/docs/agents/intake-pipeline-runner.md." --out-dir codex/intake-autonomy-v2.1-review --turn-timeout-seconds 1200
git add scripts/intake-run-kickoff.md docs/runbooks/printer-addition-protocol.md docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md
git commit -m "docs(intake): integrate v2.1 runner contract"
cd /Users/mustafaozturk-macmini/dev/Claude/Projects/ai-operating-model
git add docs/agents/intake-pipeline-runner.md
git commit -m "docs(agents): integrate intake autonomy v2.1 contract"
cd /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant
```

## Task R7: K2 SE Migration Drill

**Files:**
- Modify: `scripts/intake-parked-store.test.js`
- Modify: `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md`

**Interfaces:**
- Consumes R3 migration and R4 retry gate.
- Produces proof that the real-like K2 SE v1 sidecar migrates to `decision-required`.

- [ ] **Step 1: Add fixture-based migration test**

Reuse `scripts/fixtures/k2-se-parked-v1.json` created in R3. Do not recreate or
edit the fixture in R7; this gate only proves the already-defined migration
contract remains true after runner integration.

Test:

```js
test('real-like K2 SE fixture migrates to decision-required', () => {
  const fixture = require('./fixtures/k2-se-parked-v1.json');
  const migrated = migrateParkedV1(fixture);
  assert.equal(migrated.class, 'decision-required');
  assert.equal(migrated.tainted, true);
  assert.equal(migrated.repairAttempts, 0);
});
```

- [ ] **Step 2: Run migration drill**

Run: `node scripts/intake-parked-store.test.js`

Expected: test passes.

- [ ] **Step 3: Owner-authorized acceptance run remains parked**

Do not re-run K2 SE automatically. Add this ledger note:

```md
R7 proves migration only. A real K2 SE re-attempt requires explicit owner instruction under RD2; without that, migrated K2 SE remains `decision-required`.
```

- [ ] **Step 4: Gate review and commit**

```bash
bridge --mode "$BRIDGE_MODE" "Review R7 K2 SE migration drill. Verify it proves decision-required migration only and does not authorize an automatic K2 SE reattempt." --out-dir codex/intake-autonomy-v2.1-review --turn-timeout-seconds 1200
git add scripts/fixtures/k2-se-parked-v1.json scripts/intake-parked-store.test.js docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md
git commit -m "test(intake): prove k2 se v2.1 migration"
```

## Task R8: Final Gate, Full Validation, And Enablement

**Files:**
- Modify: `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/sessions/NEXT-SESSION.md`

**Interfaces:**
- Consumes all prior gates.
- Produces final implementation-ready state; does not dispatch a live candidate unless a separate owner instruction exists.

- [ ] **Step 1: Run the full local intake suite**

```bash
node scripts/intake-park-taxonomy.test.js
node scripts/lib/intake-source-normalizer.test.js
node scripts/validate-candidate-evidence.test.js
node scripts/validate-reviewer-output.test.js
node scripts/intake-parked-store.test.js
node scripts/intake-retry-gate.test.js
node scripts/intake-provenance-store.test.js
bash scripts/intake-run-preflight.test.sh
node scripts/printer-intake-scout.test.js
node scripts/republish-overlay.test.js
node scripts/verify-live-overlay.test.js
node scripts/verify-live-picker.test.js
node scripts/intake-kv-hygiene.test.js
node scripts/intake-notify.test.js
node scripts/intake-diff-guards.test.js
```

Expected: every command exits 0.

- [ ] **Step 2: Run project validators**

```bash
node scripts/validate-data.js
node scripts/validate-ios-printer-overlay.js
git diff --check
```

Expected: all exit 0.

- [ ] **Step 3: Run final cross-model review**

```bash
bridge --mode "$BRIDGE_MODE" "Final review Intake Autonomy v2.1 implementation after R0-R7. Verify the NO-GO taint invariant, evidence provenance before review, reviewer-output schema, parked-store migration, retry gate, provenance custody, and runner/runbook ordering. Return GO/NO-GO with must-fix findings only." --out-dir codex/intake-autonomy-v2.1-review --turn-timeout-seconds 1200
```

Expected: GO. If GO-WITH-PATCHES, apply and rerun the affected local tests plus this final review.

- [ ] **Step 4: Commit final docs**

```bash
git add docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md docs/planning/ROADMAP.md docs/sessions/NEXT-SESSION.md
git commit -m "chore(intake): mark v2.1 implementation ready"
```

- [ ] **Step 5: PR and merge**

```bash
cat > /tmp/intake-v21-pr.md <<'EOF'
## Summary
- implements Intake Autonomy v2.1 in small gates R0-R8
- records evidence before review, enforces NO-GO taint, and preserves shipped-printer provenance
- keeps K2 SE parked unless the owner explicitly authorizes a re-attempt

## Verification
- node scripts/intake-park-taxonomy.test.js
- node scripts/lib/intake-source-normalizer.test.js
- node scripts/validate-candidate-evidence.test.js
- node scripts/validate-reviewer-output.test.js
- node scripts/intake-parked-store.test.js
- node scripts/intake-retry-gate.test.js
- node scripts/intake-provenance-store.test.js
- bash scripts/intake-run-preflight.test.sh
- node scripts/printer-intake-scout.test.js
- node scripts/republish-overlay.test.js
- node scripts/verify-live-overlay.test.js
- node scripts/verify-live-picker.test.js
- node scripts/intake-kv-hygiene.test.js
- node scripts/intake-notify.test.js
- node scripts/intake-diff-guards.test.js
- node scripts/validate-data.js
- node scripts/validate-ios-printer-overlay.js
- git diff --check
EOF
git push -u origin codex/intake-v21-impl
gh pr create --base main --head codex/intake-v21-impl --title "Implement Intake Autonomy v2.1 small-gate build" --body-file /tmp/intake-v21-pr.md
gh pr merge --merge --delete-branch
git switch main
git pull --ff-only
```

Expected: PR merges into `main`, branch deleted remotely, local `main` fast-forwards.

## Rollback Notes

- Planning-only PR rollback: revert the merge commit on `main`.
- Implementation gates R0-R7 rollback: revert one gate commit at a time, newest first; never leave a sidecar writer without the R0 taxonomy validator.
- Live pipeline rollback is not part of this plan. Contract v1.1 remains active and safe: `review-no-go` is event-only.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-10-intake-autonomy-v2.1-small-gates-plan.md`.

Execute inline with `superpowers:executing-plans`, one gate per session unless the gate is trivially small after tests and review. Do not use subagents unless the owner explicitly authorizes subagent work in that execution session.
