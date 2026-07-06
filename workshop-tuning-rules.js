// ─── 3D Print Assistant — Workshop tuning rules (IMPL-044 W3, gate B3) ───────
// TRANSITIONAL app-layer home for suggestion magnitudes (spec §3.3 in
// docs/specs/IMPL-044-W3W4-mine-tier-and-custom-filaments.md): the W3 engine
// train migrates these into structured `remedy` blocks in
// data/rules/troubleshooter.json, after which this file becomes a thin reader.
// Every row's sourceRef names the troubleshooter cause it operationalizes;
// scripts/workshop-tuning-rules.test.js resolves each ref against the data.

const TUNING_RULES = [
  // stringing — primary: retraction (jams flexibles → TPU excluded, gets advice)
  { symptomId: 'stringing', kind: 'offset', offsetKey: 'retraction_distance_delta',
    direction: +1, step: 0.2, unit: 'mm', clampMin: 0, clampMax: 0.6,
    materialGroups: null, excludeGroups: ['TPU'], sourceRef: 'stringing/rank1',
    rank: 'primary', why: 'Retraction pulls melt back during travel; increase in 0.2mm steps.' },
  { symptomId: 'stringing', kind: 'offset', offsetKey: 'nozzle_temp_delta',
    direction: -1, step: -5, unit: '°C', clampMin: -15, clampMax: 15,
    materialGroups: null, excludeGroups: ['TPU'], sourceRef: 'stringing/rank2',
    rank: 'secondary', why: 'Cooler melt drips less during travel.' },
  { symptomId: 'stringing', kind: 'offset', offsetKey: 'fan_delta_pct',
    direction: +1, step: 10, unit: '%', clampMin: -20, clampMax: 20,
    materialGroups: ['PETG'], excludeGroups: null, sourceRef: 'stringing/rank4',
    rank: 'secondary', why: 'PETG needs moderate cooling — too little lets strings stay soft and stretch.' },
  { symptomId: 'stringing', kind: 'advice', adviceKey: 'dry_filament',
    direction: null, step: 0, unit: '', clampMin: 0, clampMax: 0,
    materialGroups: ['TPU'], excludeGroups: null, sourceRef: 'stringing/rank5',
    rank: 'primary', why: 'TPU stringing is usually moisture; offsets cannot fix a wet spool.' },
  // warping — primary offsetable cause: bed temp (ranks 1-3 are mechanical)
  { symptomId: 'warping', kind: 'offset', offsetKey: 'bed_temp_delta',
    direction: +1, step: 5, unit: '°C', clampMin: -10, clampMax: 10,
    materialGroups: null, excludeGroups: null, sourceRef: 'warping/rank4',
    rank: 'primary', why: 'A warmer bed keeps first layers adhered while upper layers shrink.' },
  // layer_separation — primary: nozzle temp up; secondary: fan down
  { symptomId: 'layer_separation', kind: 'offset', offsetKey: 'nozzle_temp_delta',
    direction: +1, step: 5, unit: '°C', clampMin: -15, clampMax: 15,
    materialGroups: null, excludeGroups: null, sourceRef: 'layer_separation/rank1',
    rank: 'primary', why: 'Hotter melt bonds layers more strongly.' },
  { symptomId: 'layer_separation', kind: 'offset', offsetKey: 'fan_delta_pct',
    direction: -1, step: -10, unit: '%', clampMin: -20, clampMax: 20,
    materialGroups: null, excludeGroups: null, sourceRef: 'layer_separation/rank3',
    rank: 'secondary', why: 'Less cooling keeps each layer warm enough to bond to the next.' },
  // under_extrusion — primary offsetable: nozzle temp up (ranks 1-3 not in vocabulary)
  { symptomId: 'under_extrusion', kind: 'offset', offsetKey: 'nozzle_temp_delta',
    direction: +1, step: 5, unit: '°C', clampMin: -15, clampMax: 15,
    materialGroups: null, excludeGroups: null, sourceRef: 'under_extrusion/rank4',
    rank: 'primary', why: 'Hotter melt flows more easily through the nozzle.' },
  // over_extrusion — primary offsetable: nozzle temp down (rank1 flow not in vocabulary)
  { symptomId: 'over_extrusion', kind: 'offset', offsetKey: 'nozzle_temp_delta',
    direction: -1, step: -5, unit: '°C', clampMin: -15, clampMax: 15,
    materialGroups: null, excludeGroups: null, sourceRef: 'over_extrusion/rank2',
    rank: 'primary', why: 'Cooler melt is less runny and over-deposits less.' },
  // elephant_foot — primary offsetable: bed temp down (ranks 1-2 mechanical)
  { symptomId: 'elephant_foot', kind: 'offset', offsetKey: 'bed_temp_delta',
    direction: -1, step: -5, unit: '°C', clampMin: -10, clampMax: 10,
    materialGroups: null, excludeGroups: null, sourceRef: 'elephant_foot/rank3',
    rank: 'primary', why: 'A slightly cooler bed firms the first layers so they are not squashed.' },
  // ringing — primary: outer wall speed down
  { symptomId: 'ringing', kind: 'offset', offsetKey: 'speed_multiplier_delta',
    direction: -1, step: -0.1, unit: '×', clampMin: -0.3, clampMax: 0,
    materialGroups: null, excludeGroups: null, sourceRef: 'ringing/rank1',
    rank: 'primary', why: 'Slower outer walls reduce the vibrations that print as ripples.' },
  // tpu_jam — primary: print speed down, TPU only
  { symptomId: 'tpu_jam', kind: 'offset', offsetKey: 'speed_multiplier_delta',
    direction: -1, step: -0.1, unit: '×', clampMin: -0.3, clampMax: 0,
    materialGroups: ['TPU'], excludeGroups: null, sourceRef: 'tpu_jam/rank1',
    rank: 'primary', why: 'Soft filament buckles when pushed fast; slower is the #1 TPU fix.' },
  // first_layer — advice only (the +5°C bed guidance belongs to warping, not here)
  { symptomId: 'first_layer', kind: 'advice', adviceKey: 'first_layer_basics',
    direction: null, step: 0, unit: '', clampMin: 0, clampMax: 0,
    materialGroups: null, excludeGroups: null, sourceRef: 'first_layer/rank1',
    rank: 'primary', why: 'First-layer failures are usually plate prep or Z-offset; fix those before tuning numbers.' },
];

function rulesForSymptom(symptomId, materialGroup) {
  const applicable = TUNING_RULES.filter(r => {
    if (r.symptomId !== symptomId) return false;
    if (r.materialGroups && !r.materialGroups.includes(materialGroup)) return false;
    if (r.excludeGroups && r.excludeGroups.includes(materialGroup)) return false;
    return true;
  });
  return {
    primary: applicable.find(r => r.rank === 'primary') || null,
    secondaries: applicable.filter(r => r.rank === 'secondary'),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TUNING_RULES, rulesForSymptom };
}
