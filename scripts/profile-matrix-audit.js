#!/usr/bin/env node
// 3D Print Assistant - profile matrix audit
//
// Runs realistic configuration cases through the same engine functions that feed
// user-visible output: simple filament temps, advanced filament settings,
// generated print settings, warnings, checklist, and export payloads.
//
// Usage:
//   node scripts/profile-matrix-audit.js > docs/reviews/2026-05-10-profile-matrix-audit.md

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

global.fetch = async function localFetch(url) {
  if (typeof url !== 'string') throw new Error('audit fetch expects string URL');
  const rel = url.replace(/^\.\//, '');
  const filePath = path.join(ROOT, rel);
  let content;
  try {
    content = await fs.promises.readFile(filePath, 'utf8');
  } catch (_) {
    return { ok: false, status: 404, url, json: async () => null, text: async () => '' };
  }
  return {
    ok: true,
    status: 200,
    url,
    json: async () => JSON.parse(content),
    text: async () => content,
  };
};

const engineSrc = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
vm.runInThisContext(engineSrc + '\n;globalThis.__Engine = Engine;\n', { filename: 'engine.js' });
const Engine = globalThis.__Engine;
const CATALOG = {
  printers: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/printers.json'), 'utf8')).printers,
  materials: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/materials.json'), 'utf8')).materials,
  nozzles: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/nozzles.json'), 'utf8')).nozzles,
};

const DEFAULT_STATE = {
  nozzle: 'std_0.4',
  material: 'pla_basic',
  surface: 'standard',
  strength: 'standard',
  speed: 'balanced',
  support: 'none',
  colors: 'single',
  environment: 'normal',
  userLevel: 'intermediate',
  profileMode: 'safe',
};

const SWEEP_SPEEDS = ['balanced', 'fast'];
const SWEEP_PROFILE_MODES = ['safe', 'tuned'];

const CASES = [
  // Bambu high-temp and recent data changes.
  c('bambu-p1s-pc-bed-cap', 'P1S + PC clamps bed display/profile to 100C', { printer: 'p1s', material: 'pc' }, [
    simpleBed('100 °C'), advancedBed('100 °C', '100 °C'), warning('printer_max_bed_temp_clamped'),
  ]),
  c('bambu-p1p-pc-bed-cap', 'P1P + PC clamps bed display/profile to 100C', { printer: 'p1p', material: 'pc' }, [
    simpleBed('100 °C'), advancedBed('100 °C', '100 °C'), warning('printer_max_bed_temp_clamped'),
  ]),
  c('bambu-x1c-pc-baseline', 'X1C + PC uses PC profile without bed/nozzle clamp', { printer: 'x1c', material: 'pc' }, [
    simpleTemps('280 °C', '110 °C'), advancedTemps('285 °C', '280 °C', '115 °C', '110 °C'), noWarning('printer_max_bed_temp_clamped'), noWarning('printer_max_nozzle_temp'),
  ]),
  c('bambu-x1e-pc-active-chamber', 'X1E + PC exposes active chamber guidance', { printer: 'x1e', material: 'pc' }, [
    printerField('max_nozzle_temp', 320), printerField('max_chamber_temp', 60), warning('active_chamber_heating'),
  ]),
  c('bambu-x1e-pa-active-chamber', 'X1E + PA gets active chamber guidance', { printer: 'x1e', material: 'pa' }, [
    printerField('max_chamber_temp', 60), warning('active_chamber_heating'),
  ]),
  c('bambu-a1mini-petg-bed-cap', 'A1 Mini + PETG initial layer clamps to 80C bed cap', { printer: 'a1mini', material: 'petg_basic' }, [
    advancedBed('80 °C', '75 °C'), warning('printer_max_bed_temp_clamped'), noWarning('printer_bed_temp_incompatible'),
  ]),
  c('bambu-a1mini-abs-hard-bed-incompat', 'A1 Mini + ABS is hard-incompatible on bed temp', { printer: 'a1mini', material: 'abs' }, [
    warning('printer_bed_temp_incompatible'),
  ]),
  c('bambu-h2d-pla-fast', 'H2D + PLA + Fast shows 1000mm/s capability but safe print speeds', { printer: 'h2d', material: 'pla_basic', surface: 'standard', strength: 'minimal', speed: 'fast' }, [
    printerField('max_speed', 1000), profileValue('outer_wall_speed', '149 mm/s'), profileValue('inner_wall_speed', '208 mm/s'),
  ]),
  c('bambu-h2d-pla-fast-tuned', 'H2D + PLA + Fast + Tuned raises acceleration tier, not hardware max speed', { printer: 'h2d', material: 'pla_basic', surface: 'standard', strength: 'minimal', speed: 'fast', profileMode: 'tuned' }, [
    profileValue('outer_wall_acceleration', '10000 mm/s²'),
  ]),
  c('bambu-h2d-pro-pc', 'H2D Pro + PC high-temp profile with active chamber guidance', { printer: 'h2d_pro', material: 'pc' }, [
    printerField('max_speed', 1000), warning('active_chamber_heating'),
  ]),
  c('bambu-x2d-pc', 'X2D + PC remote/bundled data behaves as active heated', { printer: 'x2d', material: 'pc' }, [
    printerField('max_chamber_temp', 65), warning('active_chamber_heating'),
  ]),

  // Cross-brand high-temp / clamp coverage.
  c('creality-k1max-pc-bed-cap', 'Creality K1 Max + PC clamps bed to 100C', { printer: 'k1_max', material: 'pc' }, [
    advancedBed('100 °C', '100 °C'), warning('printer_max_bed_temp_clamped'),
  ]),
  c('creality-k2plus-pc-active-chamber', 'Creality K2 Plus + PC active chamber guidance', { printer: 'k2_plus', material: 'pc' }, [
    printerField('max_chamber_temp', 60), warning('active_chamber_heating'),
  ]),
  c('prusa-core-one-l-pc-active-chamber', 'Prusa CORE One L + PC active chamber guidance', { printer: 'core_one_l', material: 'pc' }, [
    printerField('max_chamber_temp', 55), warning('active_chamber_heating'),
  ]),
  c('prusa-mini-pc-nozzle-edge', 'Prusa Mini+ + PC should not emit nozzle target above 280C cap', { printer: 'mini_plus', material: 'pc' }, [
    printerField('max_nozzle_temp', 280),
  ]),
  c('qidi-plus4-pc-high-temp', 'QIDI Plus4 + PC high-temp headroom', { printer: 'plus4', material: 'pc' }, [
    printerField('max_nozzle_temp', 370), warning('active_chamber_heating'),
  ]),
  c('qidi-q1pro-pc-active-chamber', 'QIDI Q1 Pro + PC active chamber guidance', { printer: 'q1_pro', material: 'pc' }, [
    printerField('max_chamber_temp', 60), warning('active_chamber_heating'),
  ]),
  c('elegoo-centauri-pc-passive-enclosed', 'Elegoo Centauri Carbon + PC is enclosed but not active heated', { printer: 'centauri_carbon', material: 'pc' }, [
    printerField('enclosure', 'passive'), noWarning('active_chamber_heating'),
  ]),
  c('flashforge-ad5x-pc-nozzle-edge', 'FlashForge AD5X + PC should not emit nozzle target above printer cap', { printer: 'ad5x', material: 'pc' }, [
    printerField('max_nozzle_temp', 280),
  ]),
  c('anycubic-kobra2-pc-nozzle-low', 'Anycubic Kobra 2 + PC must warn about low nozzle cap', { printer: 'kobra_2', material: 'pc' }, [
    warning('printer_max_nozzle_temp'),
  ]),

  // Abrasive/nozzle, TPU, multicolor, supports, slicer families.
  c('bambu-a1-placf-soft-nozzle', 'A1 + PLA-CF + standard nozzle warns about abrasive material', { printer: 'a1', material: 'pla_cf', nozzle: 'std_0.4' }, [
    warning('cf_soft_nozzle'),
  ]),
  c('bambu-x1c-placf-hardened-nozzle', 'X1C + PLA-CF + hardened nozzle clears soft-nozzle warning', { printer: 'x1c', material: 'pla_cf', nozzle: 'hrd_0.4' }, [
    noWarning('cf_soft_nozzle'),
  ]),
  c('bambu-a1-tpu85-speed-cap', 'A1 + TPU 85A keeps speeds very low', { printer: 'a1', material: 'tpu_85a', speed: 'fast' }, [
    maxProfileNumber('outer_wall_speed', 20), maxProfileNumber('inner_wall_speed', 25),
  ]),
  c('bambu-p1s-multicolor-ams', 'P1S + PLA + multicolor does not trigger CFS-specific warning', { printer: 'p1s', material: 'pla_basic', colors: 'multi_2_4' }, [
    noWarning('k2_plus_cfs'),
  ]),
  c('creality-k2plus-multicolor-cfs', 'K2 Plus + multicolor shows CFS warning', { printer: 'k2_plus', material: 'pla_basic', colors: 'multi_5' }, [
    warning('mcs_tier_cfs_guidance'),
  ]),
  c('anycubic-kobrax-multicolor', 'Anycubic Kobra X + multicolor uses ACE metadata without unknown-printer warning', { printer: 'kobra_x', material: 'pla_basic', colors: 'multi_5' }, [
    printerField('multi_color_systems', ['ace']), noWarning('missing_printer'),
  ]),
  c('prusa-mk4s-pva-support', 'Prusa MK4S + PVA support material stays in PrusaSlicer family', { printer: 'mk4s', material: 'pva', support: 'balanced' }, [
    slicer('prusaslicer'),
  ]),
  c('prusa-xl-toolchanger-pla', 'Prusa XL + PLA keeps toolchanger metadata available', { printer: 'xl', material: 'pla_basic' }, [
    printerField('multi_color_systems', ['toolchanger']), slicer('prusaslicer'),
  ]),
  c('sovol-sv08-pla-fast', 'Sovol SV08 + PLA + Fast uses high-speed CoreXY metadata safely', { printer: 'sv08', material: 'pla_basic', speed: 'fast', surface: 'standard' }, [
    printerField('max_speed', 700), maxProfileNumber('outer_wall_speed', 300),
  ]),
  c('voron-24-abs-enclosed', 'Voron 2.4 + ABS treats passive enclosure as usable', { printer: 'voron_2_4', material: 'abs' }, [
    noWarning('enclosure_required'),
  ]),

  // Added breadth: lower-cap printers, more high-temp materials, and nozzle edge cases.
  c('creality-ender3v3-petg-fast-nozzle-cap', 'Ender-3 V3 + PETG + Fast should not exceed 260C nozzle cap', { printer: 'ender3_v3', material: 'petg_basic', speed: 'fast' }, [
    printerField('max_nozzle_temp', 260),
  ]),
  c('creality-ender3v3-abs-open-hard-warning', 'Ender-3 V3 + ABS warns for open frame and bed/nozzle constraints', { printer: 'ender3_v3', material: 'abs' }, [
    warning('enclosure_required'),
  ]),
  c('creality-k2pro-pa-active-chamber', 'K2 Pro + PA gets active chamber guidance', { printer: 'k2_pro', material: 'pa' }, [
    printerField('max_chamber_temp', 60), warning('active_chamber_heating'),
  ]),
  c('prusa-mk4s-pc-open-high-temp', 'Prusa MK4S + PC warns about open-frame high-temp printing', { printer: 'mk4s', material: 'pc' }, [
    warning('enclosure_required'),
  ]),
  c('prusa-core-one-pc-passive-enclosed', 'Prusa CORE One + PC is passive enclosed without active chamber guidance', { printer: 'core_one', material: 'pc' }, [
    printerField('enclosure', 'passive'), noWarning('active_chamber_heating'),
  ]),
  c('prusa-core-one-l-pa-cf-active-chamber', 'Prusa CORE One L + PA-CF uses active chamber and abrasive warnings', { printer: 'core_one_l', material: 'pa_cf', nozzle: 'std_0.4' }, [
    warning('active_chamber_heating'), warning('cf_soft_nozzle'),
  ]),
  c('anycubic-kobra-s1max-pc-active-chamber', 'Anycubic Kobra S1 Max + PC gets active chamber guidance', { printer: 'kobra_s1_max', material: 'pc' }, [
    warning('active_chamber_heating'),
  ]),
  c('anycubic-kobra3max-pc-bed-hard-limit', 'Anycubic Kobra 3 Max + PC warns hard bed incompatibility', { printer: 'kobra_3_max', material: 'pc' }, [
    warning('printer_bed_temp_incompatible'),
  ]),
  c('anycubic-kobra2-petg-fast-nozzle-cap', 'Anycubic Kobra 2 + PETG + Fast should not exceed 260C nozzle cap', { printer: 'kobra_2', material: 'petg_basic', speed: 'fast' }, [
    printerField('max_nozzle_temp', 260),
  ]),
  c('qidi-plus4-petcf-hardened', 'QIDI Plus4 + PET-CF + hardened nozzle keeps composite temps inside range', { printer: 'plus4', material: 'pet_cf', nozzle: 'hrd_0.6' }, [
    noWarning('cf_soft_nozzle'),
  ]),
  c('qidi-xsmart3-pc-passive-bed-cap', 'QIDI X-Smart 3 + PC caps bed at 100C on passive enclosure', { printer: 'x_smart_3', material: 'pc' }, [
    warning('printer_max_bed_temp_clamped'),
  ]),
  c('elegoo-neptune4-pc-open-bed-cap', 'Elegoo Neptune 4 + PC is open-frame with 110C bed cap behavior', { printer: 'neptune_4', material: 'pc' }, [
    warning('enclosure_required'), warning('printer_max_bed_temp_clamped'),
  ]),
  c('sovol-sv06plus-pla-fast-speed-cap', 'Sovol SV06 Plus + PLA + Fast respects 150mm/s printer speed cap', { printer: 'sv06_plus', material: 'pla_basic', speed: 'fast' }, [
    maxProfileNumber('outer_wall_speed', 150), maxProfileNumber('inner_wall_speed', 150),
  ]),
  c('sovol-sv04-petg-fast-speed-cap', 'Sovol SV04 IDEX + PETG + Fast respects 150mm/s printer speed cap', { printer: 'sv04', material: 'petg_basic', speed: 'fast' }, [
    maxProfileNumber('outer_wall_speed', 150), maxProfileNumber('inner_wall_speed', 150),
  ]),
  c('flashforge-adventurer5m-pc-open-low-nozzle', 'Adventurer 5M + PC warns about open frame and low nozzle headroom', { printer: 'adv_5m', material: 'pc' }, [
    warning('enclosure_required'),
  ]),
  c('flashforge-guider3ultra-pc-passive-high-temp', 'Guider 3 Ultra + PC has high-temp nozzle and enclosed metadata', { printer: 'guider_3_ultra', material: 'pc' }, [
    printerField('max_nozzle_temp', 350), noWarning('enclosure_required'),
  ]),
  c('artillery-x4plus-petg-fast', 'Artillery X4 Plus + PETG + Fast stays within 300C headroom', { printer: 'x4_plus', material: 'petg_basic', speed: 'fast' }, [
    printerField('max_nozzle_temp', 300),
  ]),
  c('anker-m5-petg-fast-nozzle-cap', 'AnkerMake M5 + PETG + Fast should not exceed 260C nozzle cap', { printer: 'm5', material: 'petg_basic', speed: 'fast' }, [
    printerField('max_nozzle_temp', 260),
  ]),
  c('voron-02-pc-bed-cap', 'Voron 0.2 + PC clamps active bed to 110C but stays enclosed', { printer: 'voron_0_2', material: 'pc' }, [
    warning('printer_max_bed_temp_clamped'), noWarning('enclosure_required'),
  ]),
  c('ratrig-vcore4-pc-open-high-temp', 'RatRig V-Core 4 + PC warns open frame despite high bed/nozzle capability', { printer: 'ratrig_vcore4', material: 'pc' }, [
    warning('enclosure_required'),
  ]),
  c('vzbot-330-pc-open-high-speed', 'VzBot 330 + PC separates high-speed metadata from enclosure warnings', { printer: 'vzbot_330', material: 'pc', speed: 'fast' }, [
    printerField('max_speed', 800), warning('enclosure_required'),
  ]),
  c('bambu-p1s-tpu95-ams-risk', 'P1S + TPU 95A + multicolor should surface AMS/direct-feed risk', { printer: 'p1s', material: 'tpu_95a', colors: 'multi_2_4' }, [
    warning('tpu_ams_incompatible'),
  ]),
  c('bambu-a1-tpu90-nozzle-warning', 'A1 + TPU 90A + 0.4 nozzle shows flexible-material nozzle guidance', { printer: 'a1', material: 'tpu_90a', nozzle: 'std_0.4' }, [
    warning('mat_tpu_90a_0'),
  ]),
  c('bambu-x1c-pa-cf-soft-nozzle', 'X1C + PA-CF + standard nozzle warns for abrasive composite', { printer: 'x1c', material: 'pa_cf', nozzle: 'std_0.4' }, [
    warning('cf_soft_nozzle'),
  ]),
  c('bambu-x1c-pa-cf-hardened-nozzle', 'X1C + PA-CF + hardened nozzle clears soft-nozzle warning', { printer: 'x1c', material: 'pa_cf', nozzle: 'hrd_0.6' }, [
    noWarning('cf_soft_nozzle'),
  ]),
];

const POSTFIX_CASES = [
  c('postfix-p2s-pla-fast-hrd02-material-max', 'P2S + PLA Basic + hardened 0.2 + Fast/Tuned clamps to PLA max', { printer: 'p2s', material: 'pla_basic', nozzle: 'hrd_0.2', speed: 'fast', profileMode: 'tuned' }, [
    simpleNozzle('230 °C'), maxAdvancedNozzle(230), warning('material_max_nozzle_temp_clamped'), warning('layer_height_clamped'), noWarning('printer_max_nozzle_temp_clamped'),
  ]),
  c('postfix-k1c-placf-hrd04-fast', 'K1C + PLA-CF + hardened 0.4 + Fast stays inside PLA-CF max', { printer: 'k1c', material: 'pla_cf', nozzle: 'hrd_0.4', speed: 'fast' }, [
    simpleNozzle('240 °C'), maxAdvancedNozzle(240), noWarning('cf_soft_nozzle'), noUxMatching(/open-frame material warning/i),
  ]),
  c('postfix-ender3v3plus-petg-fast-cap', 'Ender-3 V3 Plus + PETG + Fast clamps to 260C printer cap', { printer: 'ender3_v3_plus', material: 'petg_basic', speed: 'fast' }, [
    simpleNozzle('260 °C'), maxAdvancedNozzle(260), warning('printer_max_nozzle_temp_clamped'),
  ]),
  c('postfix-ender3v3se-asa-open-cap', 'Ender-3 V3 SE + ASA keeps nozzle under 260C and preserves open-frame warnings', { printer: 'ender3_v3_se', material: 'asa' }, [
    maxAdvancedNozzle(260), warning('printer_max_nozzle_temp_clamped'), warning('enclosure_required'),
  ]),
  c('postfix-a1mini-hips-bed-boundary', 'A1 Mini + HIPS clamps bed to 80C without hard bed incompatibility', { printer: 'a1mini', material: 'hips' }, [
    advancedBed('80 °C', '80 °C'), warning('printer_max_bed_temp_clamped'), noWarning('printer_bed_temp_incompatible'),
  ]),
  c('postfix-kobra3max-asa-bed-equality', 'Kobra 3 Max + ASA bed equals material minimum and avoids hard incompatibility', { printer: 'kobra_3_max', material: 'asa' }, [
    advancedBed('90 °C', '90 °C'), warning('printer_max_bed_temp_clamped'), noWarning('printer_bed_temp_incompatible'), warning('enclosure_required'),
  ]),
  c('postfix-adv5mpro-pc-passive-low-nozzle', 'Adventurer 5M Pro + PC clamps nozzle/bed and avoids open-frame copy', { printer: 'adv_5m_pro', material: 'pc' }, [
    maxAdvancedNozzle(280), warning('printer_max_nozzle_temp_clamped'), warning('printer_max_bed_temp_clamped'), noUxMatching(/open-frame material warning/i),
  ]),
  c('postfix-coreone-asa-passive-visibility', 'CORE One + ASA passive enclosure has no open-frame or active-chamber copy', { printer: 'core_one', material: 'asa' }, [
    noWarning('enclosure_required'), noWarning('active_chamber_heating'), noUxMatching(/open-frame material warning/i),
  ]),
  c('postfix-max4-pa-active-chamber-copy', 'QIDI Max4 + PA active chamber guidance includes 60C max', { printer: 'max4', material: 'pa' }, [
    warning('active_chamber_heating'), warningDetailIncludes('active_chamber_heating', '60°C'),
  ]),
  c('postfix-h2c-petcf-hrd08-fast-speed', 'H2C + PET-CF + hardened 0.8 + Fast/Tuned stays within PET-CF range', { printer: 'h2c', material: 'pet_cf', nozzle: 'hrd_0.8', speed: 'fast', profileMode: 'tuned' }, [
    maxAdvancedNozzle(275), noWarning('cf_soft_nozzle'), maxProfileNumber('outer_wall_speed', 300),
  ]),
  c('postfix-sv08max-pla-silk-speed-metadata', 'SV08 Max + PLA Silk + Fast avoids raw picker speed metadata', { printer: 'sv08_max', material: 'pla_silk', speed: 'fast' }, [
    noUxMatching(/raw advertised speed/i),
  ]),
  c('postfix-vzbot235-petg-hf-open-speed', 'VzBot 235 + PETG HF + Fast/Tuned keeps open PETG warning without raw speed metadata', { printer: 'vzbot_235', material: 'petg_hf', speed: 'fast', profileMode: 'tuned' }, [
    warning('petg_open_printer'), noUxMatching(/raw advertised speed/i),
  ]),
  c('postfix-p1s-tpu85-nozzle-diameter', 'P1S + TPU 85A + standard 0.4 warns on nozzle size and keeps TPU speeds low', { printer: 'p1s', material: 'tpu_85a', nozzle: 'std_0.4' }, [
    warning('nozzle_too_small'), noWarning('tpu_ams_incompatible'), maxProfileNumber('outer_wall_speed', 20),
  ]),
  c('postfix-k2-pla-multicolor-cfs-copy', 'Creality K2 + PLA multicolor shows CFS-specific warning', { printer: 'k2', material: 'pla_basic', colors: 'multi_5' }, [
    warning('mcs_tier_cfs_guidance'), noWarning('creality_no_multicolor'), noUxMatching(/open-frame material warning/i),
  ]),
  c('postfix-p2s-pc-bed-110-boundary', 'Bambu P2S + PC clamps bed to 110C and avoids open-frame copy', { printer: 'p2s', material: 'pc' }, [
    advancedBed('110 °C', '110 °C'), warning('printer_max_bed_temp_clamped'), noWarning('printer_bed_temp_incompatible'), noUxMatching(/open-frame material warning/i),
  ]),
];

function c(id, label, patch, expects = []) {
  return { id, label, state: { ...DEFAULT_STATE, ...patch }, expects };
}

function warning(id) {
  return {
    label: `warning ${id}`,
    check: (r) => r.warnings.some((w) => w.id === id),
    message: (r) => `Expected warning ${id}; got [${r.warnings.map((w) => w.id).join(', ')}]`,
  };
}

function noWarning(id) {
  return {
    label: `no warning ${id}`,
    check: (r) => !r.warnings.some((w) => w.id === id),
    message: () => `Did not expect warning ${id}`,
  };
}

function warningDetailIncludes(id, needle) {
  return {
    label: `warning ${id} detail includes ${needle}`,
    check: (r) => r.warnings.some((w) => w.id === id && String(`${w.text} ${w.detail}`).includes(needle)),
    message: (r) => `Expected warning ${id} to include ${needle}; got ${JSON.stringify(r.warnings.find((w) => w.id === id) || null)}`,
  };
}

function noUxMatching(pattern) {
  return {
    label: `no UX warning matching ${pattern}`,
    check: (r) => !r.uxWarnings.some((msg) => pattern.test(msg)),
    message: (r) => `Unexpected UX warning matching ${pattern}: ${r.uxWarnings.join('; ')}`,
  };
}

function simpleTemps(nozzle, bed) {
  return {
    label: `simple temps ${nozzle} / ${bed}`,
    check: (r) => r.simpleTemps.nozzle === nozzle && r.simpleTemps.bed === bed,
    message: (r) => `Expected simple temps ${nozzle}/${bed}; got ${r.simpleTemps.nozzle}/${r.simpleTemps.bed}`,
  };
}

function simpleBed(bed) {
  return {
    label: `simple bed ${bed}`,
    check: (r) => r.simpleTemps.bed === bed,
    message: (r) => `Expected simple bed ${bed}; got ${r.simpleTemps.bed}`,
  };
}

function simpleNozzle(nozzle) {
  return {
    label: `simple nozzle ${nozzle}`,
    check: (r) => r.simpleTemps.nozzle === nozzle,
    message: (r) => `Expected simple nozzle ${nozzle}; got ${r.simpleTemps.nozzle}`,
  };
}

function advancedTemps(initNozzle, otherNozzle, initBed, otherBed) {
  return {
    label: `advanced temps ${initNozzle}/${otherNozzle}/${initBed}/${otherBed}`,
    check: (r) =>
      r.advFil.initial_layer_temp === initNozzle &&
      r.advFil.other_layers_temp === otherNozzle &&
      r.advFil.initial_layer_bed_temp === initBed &&
      r.advFil.other_layers_bed_temp === otherBed,
    message: (r) => `Expected advanced temps ${initNozzle}/${otherNozzle}/${initBed}/${otherBed}; got ${r.advFil.initial_layer_temp}/${r.advFil.other_layers_temp}/${r.advFil.initial_layer_bed_temp}/${r.advFil.other_layers_bed_temp}`,
  };
}

function advancedBed(initBed, otherBed) {
  return {
    label: `advanced bed ${initBed}/${otherBed}`,
    check: (r) => r.advFil.initial_layer_bed_temp === initBed && r.advFil.other_layers_bed_temp === otherBed,
    message: (r) => `Expected advanced bed ${initBed}/${otherBed}; got ${r.advFil.initial_layer_bed_temp}/${r.advFil.other_layers_bed_temp}`,
  };
}

function maxAdvancedNozzle(max) {
  return {
    label: `advanced nozzle <= ${max}`,
    check: (r) => numberFrom(r.advFil?.initial_layer_temp) <= max && numberFrom(r.advFil?.other_layers_temp) <= max,
    message: (r) => `Expected advanced nozzle <= ${max}; got ${r.advFil?.initial_layer_temp}/${r.advFil?.other_layers_temp}`,
  };
}

function printerField(field, expected) {
  return {
    label: `printer.${field} = ${JSON.stringify(expected)}`,
    check: (r) => JSON.stringify(r.printer?.[field]) === JSON.stringify(expected),
    message: (r) => `Expected printer.${field}=${JSON.stringify(expected)}; got ${JSON.stringify(r.printer?.[field])}`,
  };
}

function profileValue(field, expected) {
  return {
    label: `${field} = ${expected}`,
    check: (r) => r.profile?.[field]?.value === expected,
    message: (r) => `Expected ${field}=${expected}; got ${r.profile?.[field]?.value}`,
  };
}

function maxProfileNumber(field, max) {
  return {
    label: `${field} <= ${max}`,
    check: (r) => numberFrom(r.profile?.[field]?.value) <= max,
    message: (r) => `Expected ${field} <= ${max}; got ${r.profile?.[field]?.value}`,
  };
}

function slicer(expected) {
  return {
    label: `slicer = ${expected}`,
    check: (r) => r.slicer === expected,
    message: (r) => `Expected slicer ${expected}; got ${r.slicer}`,
  };
}

function numberFrom(value) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

function runCase(testCase) {
  const state = testCase.state;
  const result = runState(state);

  Object.assign(result, {
    ...testCase,
    state,
    expectationFailures: [],
  });

  result.invariantFailures = invariantChecks(result);
  result.uxWarnings = uxChecks(result);

  for (const expectation of testCase.expects) {
    if (!expectation.check(result)) {
      result.expectationFailures.push({
        label: expectation.label,
        message: expectation.message(result),
      });
    }
  }

  return result;
}

function runState(state) {
  const printer = Engine.getPrinter(state.printer);
  const material = Engine.getMaterial(state.material);
  const nozzle = Engine.getNozzle(state.nozzle);
  const slicer = Engine.getSlicerForPrinter(state.printer);
  Engine.setActiveSlicer(slicer);

  const profile = Engine.resolveProfile(state);
  const simpleTemps = Engine.getAdjustedTemps(state.material, state.environment, state.nozzle, state.speed, state.printer);
  const advFil = Engine.getAdvancedFilamentSettings(state);
  const warnings = Engine.getWarnings(state);
  const checklist = Engine.getChecklist(state);
  const exportProfile = Engine.exportProfile(state);
  const bambuJson = slicer === 'bambu_studio' ? Engine.exportBambuStudioJSON(state) : null;

  return {
    printer,
    material,
    nozzle,
    slicer,
    profile,
    simpleTemps,
    advFil,
    warnings,
    checklist,
    exportProfile,
    bambuJson,
    invariantFailures: [],
    uxWarnings: [],
  };
}

function runSweepCase(state) {
  const result = runState(state);
  result.id = `${state.printer}/${state.material}/${state.nozzle}/${state.speed}/${state.profileMode}`;
  result.label = `${result.printer?.name || state.printer} + ${result.material?.name || state.material} + ${result.nozzle?.name || state.nozzle} (${state.speed}, ${state.profileMode})`;
  result.state = state;
  result.expectationFailures = [];
  result.invariantFailures = invariantChecks(result);
  return result;
}

function buildSweepStates() {
  const states = [];
  for (const printer of CATALOG.printers) {
    for (const material of CATALOG.materials) {
      for (const nozzle of CATALOG.nozzles) {
        for (const speed of SWEEP_SPEEDS) {
          for (const profileMode of SWEEP_PROFILE_MODES) {
            states.push({
              ...DEFAULT_STATE,
              printer: printer.id,
              material: material.id,
              nozzle: nozzle.id,
              speed,
              profileMode,
            });
          }
        }
      }
    }
  }
  return states;
}

function invariantChecks(r) {
  const failures = [];
  const p = r.printer || {};
  const m = r.material || {};
  const bs = m.base_settings || {};

  const values = [
    ['simple nozzle', r.simpleTemps.nozzle, p.max_nozzle_temp],
    ['advanced initial nozzle', r.advFil?.initial_layer_temp, p.max_nozzle_temp],
    ['advanced other nozzle', r.advFil?.other_layers_temp, p.max_nozzle_temp],
    ['legacy export initial nozzle', r.exportProfile?.filament?.nozzle_temperature, p.max_nozzle_temp],
    ['legacy export other nozzle', r.exportProfile?.filament?.nozzle_temperature_other_layers, p.max_nozzle_temp],
    ['Bambu export initial nozzle', r.bambuJson?.filament?.nozzle_temperature_initial_layer?.[0], p.max_nozzle_temp],
    ['Bambu export other nozzle', r.bambuJson?.filament?.nozzle_temperature?.[0], p.max_nozzle_temp],
    ['simple bed', r.simpleTemps.bed, p.max_bed_temp],
    ['advanced initial bed', r.advFil?.initial_layer_bed_temp, p.max_bed_temp],
    ['advanced other bed', r.advFil?.other_layers_bed_temp, p.max_bed_temp],
    ['legacy export initial bed', r.exportProfile?.filament?.bed_temperature, p.max_bed_temp],
    ['legacy export other bed', r.exportProfile?.filament?.bed_temperature_other_layers, p.max_bed_temp],
    ['Bambu export initial bed', r.bambuJson?.filament?.hot_plate_temp_initial_layer?.[0], p.max_bed_temp],
    ['Bambu export other bed', r.bambuJson?.filament?.hot_plate_temp?.[0], p.max_bed_temp],
  ];
  for (const [label, value, cap] of values) {
    const n = numberFrom(value);
    if (Number.isFinite(n) && cap != null && n > cap) {
      failures.push(`${label} ${n} exceeds printer cap ${cap}`);
    }
  }

  const nozzleTemps = [
    ['simple nozzle', r.simpleTemps.nozzle],
    ['advanced initial nozzle', r.advFil?.initial_layer_temp],
    ['advanced other nozzle', r.advFil?.other_layers_temp],
    ['legacy export initial nozzle', r.exportProfile?.filament?.nozzle_temperature],
    ['legacy export other nozzle', r.exportProfile?.filament?.nozzle_temperature_other_layers],
    ['Bambu export initial nozzle', r.bambuJson?.filament?.nozzle_temperature_initial_layer?.[0]],
    ['Bambu export other nozzle', r.bambuJson?.filament?.nozzle_temperature?.[0]],
  ];
  for (const [label, value] of nozzleTemps) {
    const n = numberFrom(value);
    if (Number.isFinite(n) && bs.nozzle_temp_max != null && n > bs.nozzle_temp_max) {
      failures.push(`${label} ${n} exceeds material max ${bs.nozzle_temp_max}`);
    }
  }

  const bedTemps = [
    ['simple bed', r.simpleTemps.bed],
    ['advanced initial bed', r.advFil?.initial_layer_bed_temp],
    ['advanced other bed', r.advFil?.other_layers_bed_temp],
    ['legacy export initial bed', r.exportProfile?.filament?.bed_temperature],
    ['legacy export other bed', r.exportProfile?.filament?.bed_temperature_other_layers],
    ['Bambu export initial bed', r.bambuJson?.filament?.hot_plate_temp_initial_layer?.[0]],
    ['Bambu export other bed', r.bambuJson?.filament?.hot_plate_temp?.[0]],
  ];
  for (const [label, value] of bedTemps) {
    const n = numberFrom(value);
    if (Number.isFinite(n) && bs.bed_temp_max != null && n > bs.bed_temp_max) {
      failures.push(`${label} ${n} exceeds material max ${bs.bed_temp_max}`);
    }
  }

  const outer = numberFrom(r.profile?.outer_wall_speed?.value);
  const inner = numberFrom(r.profile?.inner_wall_speed?.value);
  if (Number.isFinite(outer) && p.max_speed != null && outer > p.max_speed) {
    failures.push(`outer_wall_speed ${outer} exceeds printer max_speed ${p.max_speed}`);
  }
  if (Number.isFinite(inner) && p.max_speed != null && inner > p.max_speed) {
    failures.push(`inner_wall_speed ${inner} exceeds printer max_speed ${p.max_speed}`);
  }

  if (p.max_nozzle_temp != null && bs.nozzle_temp_base != null && p.max_nozzle_temp < bs.nozzle_temp_base) {
    if (!r.warnings.some((w) => w.id === 'printer_max_nozzle_temp')) {
      failures.push('printer_max_nozzle_temp warning missing when printer cannot reach material base nozzle temp');
    }
  }

  if (p.max_bed_temp != null && bs.bed_temp_min != null && p.max_bed_temp < bs.bed_temp_min) {
    if (!r.warnings.some((w) => w.id === 'printer_bed_temp_incompatible')) {
      failures.push('printer_bed_temp_incompatible warning missing when printer cannot reach material minimum bed temp');
    }
  }

  if (m.nozzle_requirements?.material === 'hardened' && r.nozzle?.hardened === false) {
    if (!r.warnings.some((w) => /nozzle|cf|abrasive|harden/i.test(`${w.id} ${w.text}`))) {
      failures.push('abrasive material with non-hardened nozzle has no warning');
    }
  }

  return failures;
}

function uxChecks(r) {
  const issues = [];
  const printerDesc = buildPrinterDescForAudit(r.printer);

  if (/\d+\s*mm\/s/.test(printerDesc)) {
    issues.push(`Printer picker desc includes raw advertised speed: "${printerDesc}"`);
  }

  const openFrameWarning = r.warnings.find((w) => /open-frame printers/i.test(w.text || ''));
  if (openFrameWarning && r.printer?.enclosure !== 'none') {
    issues.push(`Generic open-frame material warning appears on enclosed printer (${r.printer.name})`);
  }

  const active = r.warnings.find((w) => w.id === 'active_chamber_heating');
  if (active && r.printer?.max_chamber_temp != null && !String(active.detail || active.text || '').includes(String(r.printer.max_chamber_temp))) {
    issues.push(`Active chamber tip does not disclose printer max chamber ${r.printer.max_chamber_temp}C`);
  }

  if (r.printer?.active_chamber_heating && ['PA', 'PC'].includes(r.material?.group) && !active) {
    issues.push('Active-chamber printer with PA/PC has no active chamber guidance');
  }

  return issues;
}

function buildPrinterDescForAudit(p) {
  if (!p) return '';
  const parts = [];
  if (p.enclosure === 'active_heated') parts.push('Active heated');
  else if (p.enclosure === 'passive') parts.push('Enclosed');
  else parts.push('Open');
  if (p.max_speed >= 700) parts.push('High-speed');
  return parts.join(' · ');
}

function tableEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function warningsText(warnings) {
  if (!warnings.length) return 'None';
  return warnings.map((w) => `[${w.id}] ${w.text}`).join('<br>');
}

function failureCategory(f) {
  if (/nozzle .*exceeds printer cap/i.test(f)) return 'Nozzle output exceeds printer cap';
  if (/bed .*exceeds printer cap/i.test(f)) return 'Bed output exceeds printer cap';
  if (/nozzle .*exceeds material max/i.test(f)) return 'Nozzle output exceeds material max';
  if (/bed .*exceeds material max/i.test(f)) return 'Bed output exceeds material max';
  if (/wall_speed .*exceeds printer max_speed/i.test(f)) return 'Profile speed exceeds printer max speed';
  if (/printer_max_nozzle_temp warning missing/i.test(f)) return 'Missing low-nozzle-cap warning';
  if (/printer_bed_temp_incompatible warning missing/i.test(f)) return 'Missing hard bed-incompatible warning';
  if (/abrasive material/i.test(f)) return 'Missing abrasive/nozzle warning';
  return 'Other invariant failure';
}

function summarizeSweep(results) {
  const failed = results.filter((r) => r.invariantFailures.length);
  const groups = new Map();

  for (const r of failed) {
    for (const failure of r.invariantFailures) {
      const category = failureCategory(failure);
      if (!groups.has(category)) groups.set(category, { category, count: 0, failures: new Map(), examples: [] });
      const group = groups.get(category);
      group.count += 1;
      group.failures.set(failure, (group.failures.get(failure) || 0) + 1);
      if (group.examples.length < 8) {
        group.examples.push({
          id: r.id,
          printer: r.printer?.name,
          material: r.material?.name,
          nozzle: r.nozzle?.name,
          speed: r.state.speed,
          mode: r.state.profileMode,
          failure,
          warnings: r.warnings.map((w) => w.id),
          simple: `N ${r.simpleTemps.nozzle}, B ${r.simpleTemps.bed}`,
          advanced: `N ${r.advFil?.initial_layer_temp}/${r.advFil?.other_layers_temp}, B ${r.advFil?.initial_layer_bed_temp}/${r.advFil?.other_layers_bed_temp}`,
        });
      }
    }
  }

  return {
    total: results.length,
    failedConfigs: failed.length,
    failureCount: failed.reduce((sum, r) => sum + r.invariantFailures.length, 0),
    groups: Array.from(groups.values()).sort((a, b) => b.count - a.count),
  };
}

function renderReport(results, sweepResults) {
  const failed = results.filter((r) => r.expectationFailures.length || r.invariantFailures.length);
  const ux = results.filter((r) => r.uxWarnings.length);
  const passed = results.length - failed.length;
  const sweep = summarizeSweep(sweepResults);

  let out = '';
  out += '# 3DPA Profile Matrix Audit\n\n';
  out += `Generated: ${new Date().toISOString()}\n\n`;
  out += 'This audit runs the engine functions that feed user-visible output: simple temperature rows, advanced filament settings, print settings, warnings, checklist, and export payloads. It does not tap through the iOS UI.\n\n';

  out += '## Summary\n\n';
  out += `- Curated phone scenarios: ${results.length}\n`;
  out += `- Curated scenarios passed core expectations/invariants: ${passed}\n`;
  out += `- Curated scenarios failed core expectations/invariants: ${failed.length}\n`;
  out += `- Curated UX visibility warnings: ${ux.length}\n`;
  out += `- Broad invariant sweep configurations: ${sweep.total}\n`;
  out += `- Broad invariant sweep failed configurations: ${sweep.failedConfigs}\n`;
  out += `- Broad invariant sweep failure observations: ${sweep.failureCount}\n\n`;

  out += '## Broad Invariant Sweep\n\n';
  out += `The sweep covers every bundled printer/material/nozzle combination in both \`${SWEEP_SPEEDS.join('`/`')}\` speed goals and both \`${SWEEP_PROFILE_MODES.join('`/`')}\` profile modes. It checks generated display values, advanced settings, legacy export fields, Bambu export fields, and missing safety warnings.\n\n`;
  if (!sweep.groups.length) {
    out += 'No broad invariant failures.\n\n';
  } else {
    out += '| Failure group | Observations | Example detail |\n';
    out += '|---|---:|---|\n';
    for (const group of sweep.groups) {
      const topExact = Array.from(group.failures.entries()).sort((a, b) => b[1] - a[1])[0];
      out += `| ${tableEscape(group.category)} | ${group.count} | ${tableEscape(topExact ? `${topExact[0]} (${topExact[1]}x)` : '')} |\n`;
    }
    out += '\n';

    out += '### Representative Broad Sweep Examples\n\n';
    for (const group of sweep.groups) {
      out += `#### ${group.category}\n\n`;
      for (const example of group.examples) {
        out += `- **${example.printer} / ${example.material} / ${example.nozzle}** (${example.speed}, ${example.mode})\n`;
        out += `  - ${example.failure}\n`;
        out += `  - Simple: ${example.simple}; advanced: ${example.advanced}; warnings: ${example.warnings.length ? example.warnings.join(', ') : 'none'}\n`;
      }
      out += '\n';
    }
  }

  out += '## Curated Scenario Findings\n\n';
  if (!failed.length && !ux.length) {
    out += 'No findings.\n\n';
  } else {
    if (failed.length) {
      out += '### Core Failures\n\n';
      for (const r of failed) {
        out += `- **${r.id}** (${r.label})\n`;
        for (const f of r.expectationFailures) out += `  - Expectation: ${f.message}\n`;
        for (const f of r.invariantFailures) out += `  - Invariant: ${f}\n`;
      }
      out += '\n';
    }
    if (ux.length) {
      out += '### UX / Visibility Warnings\n\n';
      for (const r of ux) {
        out += `- **${r.id}** (${r.label})\n`;
        for (const f of r.uxWarnings) out += `  - ${f}\n`;
      }
      out += '\n';
    }
  }

  out += '## Curated Case Matrix\n\n';
  out += '| Case | Printer | Material | Nozzle | Goals | Simple temps | Advanced temps | Speeds | Warnings | Status |\n';
  out += '|---|---|---|---|---|---|---|---|---|---|\n';
  for (const r of results) {
    const status = r.expectationFailures.length || r.invariantFailures.length ? 'FAIL' : 'PASS';
    const goals = `surface=${r.state.surface}, strength=${r.state.strength}, speed=${r.state.speed}, mode=${r.state.profileMode}`;
    const simple = `N ${r.simpleTemps.nozzle}, B ${r.simpleTemps.bed}`;
    const adv = `N ${r.advFil?.initial_layer_temp}/${r.advFil?.other_layers_temp}, B ${r.advFil?.initial_layer_bed_temp}/${r.advFil?.other_layers_bed_temp}`;
    const speeds = `outer ${r.profile?.outer_wall_speed?.value || '-'}, inner ${r.profile?.inner_wall_speed?.value || '-'}, accel ${r.profile?.outer_wall_acceleration?.value || '-'}`;
    out += `| ${tableEscape(r.id)} | ${tableEscape(r.printer?.name)} | ${tableEscape(r.material?.name)} | ${tableEscape(r.nozzle?.name)} | ${tableEscape(goals)} | ${tableEscape(simple)} | ${tableEscape(adv)} | ${tableEscape(speeds)} | ${tableEscape(warningsText(r.warnings))} | ${status} |\n`;
  }
  out += '\n';

  out += '## Detailed Curated Failures\n\n';
  if (!failed.length) {
    out += 'No core failures.\n\n';
  } else {
    for (const r of failed) {
      out += `### ${r.id} - ${r.label}\n\n`;
      out += `State: \`${JSON.stringify(r.state)}\`\n\n`;
      out += `Printer caps: nozzle ${r.printer?.max_nozzle_temp ?? '-'}C, bed ${r.printer?.max_bed_temp ?? '-'}C, chamber ${r.printer?.max_chamber_temp ?? '-'}C, speed ${r.printer?.max_speed ?? '-'} mm/s\n\n`;
      out += `Simple temps: nozzle ${r.simpleTemps.nozzle}, bed ${r.simpleTemps.bed}\n\n`;
      out += `Advanced temps: initial nozzle ${r.advFil?.initial_layer_temp}, other nozzle ${r.advFil?.other_layers_temp}, initial bed ${r.advFil?.initial_layer_bed_temp}, other bed ${r.advFil?.other_layers_bed_temp}\n\n`;
      if (r.expectationFailures.length) {
        out += 'Expectation failures:\n';
        for (const f of r.expectationFailures) out += `- ${f.message}\n`;
        out += '\n';
      }
      if (r.invariantFailures.length) {
        out += 'Invariant failures:\n';
        for (const f of r.invariantFailures) out += `- ${f}\n`;
        out += '\n';
      }
      out += 'Warnings:\n';
      for (const w of r.warnings) {
        out += `- [${w.id}] ${w.text}`;
        if (w.detail) out += ` Detail: ${w.detail}`;
        if (w.fix) out += ` Fix: ${w.fix}`;
        out += '\n';
      }
      out += '\n';
    }
  }

  out += '## Notes\n\n';
  out += '- `simple temps` are what the compact iOS/web filament temperature rows display.\n';
  out += '- `advanced temps` are the filament preset/export values.\n';
  out += '- Advertised printer max speed is not expected to equal wall speed; wall speed is limited by objective profile, material flow, and conservative caps.\n';
  out += '- UX warnings are not necessarily engine failures, but they explain why manual testing can feel confusing.\n';

  return out;
}

function renderScenarioReport(title, results) {
  const failed = results.filter((r) => r.expectationFailures.length || r.invariantFailures.length);
  const ux = results.filter((r) => r.uxWarnings.length);
  const passed = results.length - failed.length;

  let out = '';
  out += `# ${title}\n\n`;
  out += `Generated: ${new Date().toISOString()}\n\n`;
  out += 'This post-fix validation runs a fresh, smaller matrix through the same engine functions as the main audit. It is intentionally independent of the curated main matrix.\n\n';
  out += '## Summary\n\n';
  out += `- Scenarios: ${results.length}\n`;
  out += `- Passed core expectations/invariants: ${passed}\n`;
  out += `- Failed core expectations/invariants: ${failed.length}\n`;
  out += `- UX visibility warnings: ${ux.length}\n\n`;

  out += '## Findings\n\n';
  if (!failed.length && !ux.length) {
    out += 'No findings.\n\n';
  } else {
    if (failed.length) {
      out += '### Core Failures\n\n';
      for (const r of failed) {
        out += `- **${r.id}** (${r.label})\n`;
        for (const f of r.expectationFailures) out += `  - Expectation: ${f.message}\n`;
        for (const f of r.invariantFailures) out += `  - Invariant: ${f}\n`;
      }
      out += '\n';
    }
    if (ux.length) {
      out += '### UX / Visibility Warnings\n\n';
      for (const r of ux) {
        out += `- **${r.id}** (${r.label})\n`;
        for (const f of r.uxWarnings) out += `  - ${f}\n`;
      }
      out += '\n';
    }
  }

  out += '## Scenario Matrix\n\n';
  out += '| Case | Printer | Material | Nozzle | Goals | Simple temps | Advanced temps | Speeds | Warnings | Status |\n';
  out += '|---|---|---|---|---|---|---|---|---|---|\n';
  for (const r of results) {
    const status = r.expectationFailures.length || r.invariantFailures.length ? 'FAIL' : 'PASS';
    const goals = `surface=${r.state.surface}, strength=${r.state.strength}, speed=${r.state.speed}, mode=${r.state.profileMode}`;
    const simple = `N ${r.simpleTemps.nozzle}, B ${r.simpleTemps.bed}`;
    const adv = `N ${r.advFil?.initial_layer_temp}/${r.advFil?.other_layers_temp}, B ${r.advFil?.initial_layer_bed_temp}/${r.advFil?.other_layers_bed_temp}`;
    const speeds = `outer ${r.profile?.outer_wall_speed?.value || '-'}, inner ${r.profile?.inner_wall_speed?.value || '-'}, accel ${r.profile?.outer_wall_acceleration?.value || '-'}`;
    out += `| ${tableEscape(r.id)} | ${tableEscape(r.printer?.name)} | ${tableEscape(r.material?.name)} | ${tableEscape(r.nozzle?.name)} | ${tableEscape(goals)} | ${tableEscape(simple)} | ${tableEscape(adv)} | ${tableEscape(speeds)} | ${tableEscape(warningsText(r.warnings))} | ${status} |\n`;
  }
  out += '\n';
  return out;
}

(async function main() {
  await Engine.init();
  if (process.argv.includes('--postfix')) {
    const postfixResults = POSTFIX_CASES.map(runCase);
    process.stdout.write(renderScenarioReport('3DPA Post-Fix Independent Validation', postfixResults));
    return;
  }
  const results = CASES.map(runCase);
  const sweepResults = buildSweepStates().map(runSweepCase);
  process.stdout.write(renderReport(results, sweepResults));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
