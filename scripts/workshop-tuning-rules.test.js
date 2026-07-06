#!/usr/bin/env node
// ─── Tests for workshop-tuning-rules.js (IMPL-044 W3, gate B3) ───────────────
//
// Run: node scripts/workshop-tuning-rules.test.js
// Exit 0 on all-green, 1 on any failure.
//
// The load-bearing test is TC1: every rules-table sourceRef must resolve to a
// REAL troubleshooter cause whose `setting` matches the offset's target family
// (spec §3.4 — existence-only checks let direction/magnitude drift hide).

const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..');
const { TUNING_RULES, rulesForSymptom } = require(path.join(ROOT, 'workshop-tuning-rules.js'));
const ts = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/rules/troubleshooter.json'), 'utf8'));

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log(`  ok   ${name}`);
  else { console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); failures++; }
}

console.log('# workshop-tuning-rules.js tests\n');

// ── TC1 — every sourceRef resolves to a real troubleshooter cause ──
const SETTING_FAMILY = {
  nozzle_temp_delta: /nozzle temperature/i,
  bed_temp_delta: /bed temperature/i,
  fan_delta_pct: /cooling fan/i,
  retraction_distance_delta: /retraction/i,
  speed_multiplier_delta: /speed/i,
};
TUNING_RULES.forEach(r => {
  const [sid, rankRef] = r.sourceRef.split('/');
  const sym = ts.symptoms.find(s => s.id === sid);
  check(`sourceRef symptom exists: ${r.sourceRef}`, !!sym);
  if (!sym) return;
  const rank = parseInt(rankRef.replace('rank', ''), 10);
  const cause = sym.causes.find(c => c.rank === rank);
  check(`sourceRef cause exists: ${r.sourceRef}`, !!cause);
  if (r.kind === 'offset' && cause) {
    check(`sourceRef setting family matches: ${r.sourceRef} (${cause.setting})`,
      SETTING_FAMILY[r.offsetKey].test(cause.setting), cause.setting);
  }
});

// ── TC2 — spec §3.4 vocabulary is closed; dropped/advice rows pinned ──
const keys = new Set(TUNING_RULES.filter(r => r.kind === 'offset').map(r => r.offsetKey));
check('offset vocabulary closed', [...keys].sort().join(',') ===
  'bed_temp_delta,fan_delta_pct,nozzle_temp_delta,retraction_distance_delta,speed_multiplier_delta');
check('no warping→fan row (spec: unsourced, dropped)',
  !TUNING_RULES.some(r => r.symptomId === 'warping' && r.offsetKey === 'fan_delta_pct'));
check('first_layer is advice-only',
  TUNING_RULES.filter(r => r.symptomId === 'first_layer').every(r => r.kind === 'advice'));

// ── TC3 — group filtering ──
const tpuStr = rulesForSymptom('stringing', 'TPU');
check('TPU stringing primary is advice', tpuStr.primary && tpuStr.primary.kind === 'advice');
const plaStr = rulesForSymptom('stringing', 'PLA');
check('PLA stringing primary is retraction offset',
  plaStr.primary && plaStr.primary.offsetKey === 'retraction_distance_delta');
check('tpu_jam speed row is TPU-scoped',
  rulesForSymptom('tpu_jam', 'PLA').primary == null &&
  rulesForSymptom('tpu_jam', 'TPU').primary.offsetKey === 'speed_multiplier_delta');
const petgStr = rulesForSymptom('stringing', 'PETG');
check('PETG stringing has fan secondary',
  petgStr.secondaries.some(r => r.offsetKey === 'fan_delta_pct'));
check('PLA stringing has no fan secondary',
  !plaStr.secondaries.some(r => r.offsetKey === 'fan_delta_pct'));

// ── TC5 — material-scoped rows match the source cause's own material scope ──
TUNING_RULES.filter(r => r.materialGroups).forEach(r => {
  const [sid, rankRef] = r.sourceRef.split('/');
  const cause = (ts.symptoms.find(s => s.id === sid) || { causes: [] }).causes
    .find(c => c.rank === parseInt(rankRef.replace('rank', ''), 10));
  if (cause && Array.isArray(cause.materials)) {
    check(`material scope matches source: ${r.sourceRef}`,
      r.materialGroups.every(g => cause.materials.includes(g)), JSON.stringify(cause.materials));
  }
});
check('PETG stringing fan row present (spec §3.4)',
  TUNING_RULES.some(r => r.symptomId === 'stringing' && r.offsetKey === 'fan_delta_pct'
    && r.rank === 'secondary' && (r.materialGroups || []).includes('PETG')));

// ── TC4 — every offset row is bounded and stepped in the right direction ──
TUNING_RULES.filter(r => r.kind === 'offset').forEach(r => {
  check(`bounded: ${r.symptomId}/${r.offsetKey}`,
    r.clampMin <= 0 && r.clampMax >= 0 && r.step !== 0 &&
    Math.sign(r.step) === r.direction &&
    (r.direction > 0 ? r.clampMax >= r.step : r.clampMin <= r.step));
});

console.log(failures ? `\n${failures} FAILURES` : '\nAll green');
process.exit(failures ? 1 : 0);
