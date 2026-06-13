#!/usr/bin/env node
// ─── 3D Print Assistant — Domain walkthrough harness ─────────────────────────
// Loads engine.js in Node, runs resolveProfile + getWarnings + getFilters +
// getChecklist for a fixed set of real printer × nozzle × material × goals
// combos, and emits a structured markdown report.
//
// Reusable for future audits — add combos to COMBOS[] at bottom and re-run.
//
// Run: node scripts/walkthrough-harness.js > docs/reviews/.../domain-walkthrough.md

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');

// ─── Engine bootstrap — polyfill fetch + localStorage, then eval engine.js ──
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

global.fetch = async function localFetch(url) {
  if (typeof url !== 'string') throw new Error('harness fetch expects string URL');
  // Strip leading './'
  const rel = url.replace(/^\.\//, '');
  const filePath = path.join(ROOT, rel);
  let content;
  try {
    content = await fs.promises.readFile(filePath, 'utf8');
  } catch (e) {
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

// engine.js declares `const Engine = (() => { ... })();` at module scope.
// vm.runInThisContext scopes `const` to the run, so append a line that
// publishes it onto globalThis before evaluation ends.
const engineSrc = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
vm.runInThisContext(engineSrc + '\n;globalThis.__Engine = Engine;\n', { filename: 'engine.js' });
const Engine = globalThis.__Engine;

// ─── Report helpers ─────────────────────────────────────────────────────────

function h1(s)   { return `# ${s}\n\n`; }
function h2(s)   { return `## ${s}\n\n`; }
function h3(s)   { return `### ${s}\n\n`; }
function bold(s) { return `**${s}**`; }
function code(s) { return `\`${s}\``; }

// Keys of interest — kept short so the report stays scannable. Everything
// else is dumped to a JSON appendix for full audit.
const PARAMS_OF_INTEREST = [
  'layer_height',
  'initial_layer_height',
  'line_width',
  'wall_loops',
  'top_shell_layers',
  'bottom_shell_layers',
  'sparse_infill_density',
  'sparse_infill_pattern',
  'top_surface_pattern',
  'internal_solid_infill_pattern',
  'outer_wall_speed',
  'inner_wall_speed',
  'infill_speed',
  'travel_speed',
  'initial_layer_speed',
  'nozzle_temperature',
  'nozzle_temperature_initial_layer',
  'bed_temperature',
  'bed_temperature_initial_layer',
  'retraction_distance',
  'retraction_speed',
  'max_volumetric_speed',
  'fan_max_speed',
  'fan_min_speed',
  'enable_overhang_cooling',
  'support_type',
];

function fmtParam(p) {
  if (p == null) return '—';
  if (typeof p !== 'object') return String(p);
  const val = p.value != null ? String(p.value) : '—';
  return val;
}

function fmtWhy(p) {
  if (!p || typeof p !== 'object') return '';
  return p.why || '';
}

function runCombo(combo) {
  const state = combo.state;
  const printer = Engine.getPrinter(state.printer);
  const nozzle  = Engine.getNozzle(state.nozzle);
  const mat     = Engine.getMaterial(state.material);
  const slicer  = Engine.getSlicerForPrinter(state.printer);

  // Activate slicer so PROFILE_TABS / PARAM_LABELS resolve correctly for this combo
  Engine.setActiveSlicer(slicer);

  const profile   = Engine.resolveProfile(state);
  const warnings  = Engine.getWarnings(state);
  const filters   = Engine.getFilters(state);
  const checklist = Engine.getChecklist(state);
  const advFil    = Engine.getAdvancedFilamentSettings(state);

  // Find chip descs for the currently-selected surface / strength / speed.
  // Filter groups use `key` (not `id`) — items use `id`.
  function findChip(groupKey, itemId) {
    const g = filters.find(f => f.key === groupKey);
    if (!g) return null;
    return g.items.find(i => i.id === itemId) || null;
  }
  const chipSurface  = findChip('surface',  state.surface);
  const chipStrength = findChip('strength', state.strength);
  const chipSpeed    = findChip('speed',    state.speed);

  // Also capture whether combo's chip descs embed the correct emitted numbers
  const chipParityIssues = [];
  const lh = profile.layer_height?.value;
  const lhNum = lh != null ? parseFloat(String(lh).match(/[\d.]+/)?.[0] || 'NaN') : null;
  if (chipSurface?.desc && lhNum != null) {
    const m = chipSurface.desc.match(/([\d.]+)\s*mm/);
    if (m) {
      const chipNum = parseFloat(m[1]);
      if (Math.abs(chipNum - lhNum) > 1e-6) {
        chipParityIssues.push({ field: 'surface layer_height', chipNum, emittedNum: lhNum });
      }
    }
  }

  return {
    combo,
    printer, nozzle, mat, slicer,
    profile, warnings, filters, checklist, advFil,
    chipSurface, chipStrength, chipSpeed, chipParityIssues,
  };
}

function renderComboSection(r) {
  const { combo, printer, nozzle, mat, slicer, profile, warnings, checklist, advFil } = r;
  const { chipSurface, chipStrength, chipSpeed } = r;

  let out = '';
  out += h2(`Combo ${combo.id} — ${combo.label}`);

  out += `${bold('State:')} printer=\`${combo.state.printer}\`, nozzle=\`${combo.state.nozzle}\`, material=\`${combo.state.material}\`  \n`;
  out += `${bold('Goals:')} surface=${combo.state.surface}, strength=${combo.state.strength}, speed=${combo.state.speed}, env=${combo.state.environment}, support=${combo.state.support}  \n`;
  out += `${bold('Slicer:')} \`${slicer}\`  \n`;

  // Context block
  out += '\n<details><summary>Printer + material context</summary>\n\n';
  if (printer) {
    out += `- Printer: ${printer.name} — series=${printer.series}, enclosure=${printer.enclosure}, extruder=${printer.extruder_type}\n`;
    out += `- Caps: max_speed=${printer.max_speed}, max_accel=${printer.max_acceleration}, max_noz_t=${printer.max_nozzle_temp}, max_bed_t=${printer.max_bed_temp}\n`;
    out += `- Available nozzles: ${JSON.stringify(printer.available_nozzle_sizes)}\n`;
  }
  if (nozzle) {
    out += `- Nozzle: ${nozzle.name} — size=${nozzle.size}, material=${nozzle.material}, hardened=${nozzle.hardened}\n`;
  }
  if (mat) {
    const bs = mat.base_settings;
    out += `- Material: ${mat.name} — group=${mat.group}, difficulty=${mat.difficulty}, ams_compatible=${mat.ams_compatible}\n`;
    out += `- Temp ranges: nozzle ${bs.nozzle_temp_min}–${bs.nozzle_temp_base}–${bs.nozzle_temp_max}, bed ${bs.bed_temp_min}–${bs.bed_temp_base}–${bs.bed_temp_max}\n`;
    out += `- Retraction: length=${bs.retraction_length}, speed=${bs.retraction_speed}, max=${mat.retraction_max}\n`;
    out += `- max_mvs by nozzle: ${JSON.stringify(bs.max_mvs || {})}\n`;
    if (mat.enclosure_required) out += `- ⚠ enclosure_required=true\n`;
    if (mat.ventilation_required) out += `- ⚠ ventilation_required=true\n`;
    if (mat.nozzle_requirements) out += `- Nozzle requirement: ${JSON.stringify(mat.nozzle_requirements)}\n`;
  }
  out += '\n</details>\n\n';

  // Emitted profile
  out += h3('Emitted profile (key params)');
  out += '| Param | Value | Mode | Why |\n|---|---|---|---|\n';
  for (const k of PARAMS_OF_INTEREST) {
    const p = profile[k];
    if (!p) continue;
    const value = fmtParam(p).replace(/\|/g, '\\|');
    const why   = fmtWhy(p).replace(/\|/g, '\\|');
    out += `| ${k} | ${value} | ${p.mode || '—'} | ${why} |\n`;
  }
  out += '\n';

  // Advanced filament settings (where temps + MVS actually live)
  out += h3('Advanced filament settings (the filament preset — temps, retraction, PA)');
  if (advFil) {
    out += '| Key | Value |\n|---|---|\n';
    for (const [k, v] of Object.entries(advFil)) {
      if (v == null) continue;
      if (k.startsWith('_')) continue;  // skip metadata keys (_prov sidecar)
      out += `| ${k} | ${String(v).replace(/\|/g, '\\|')} |\n`;
    }
    out += '\n';
  }

  // Warnings
  out += h3(`Warnings fired (${warnings.length})`);
  if (warnings.length === 0) {
    out += '_No warnings._\n\n';
  } else {
    for (const w of warnings) {
      out += `- ${bold(`[${w.id}]`)} ${w.text || '(no text)'}`;
      if (w.detail) out += ` — ${w.detail}`;
      if (w.fix) out += ` — ${bold('Fix:')} ${w.fix}`;
      out += '\n';
    }
    out += '\n';
  }

  // Checklist
  out += h3(`Checklist (${checklist.length})`);
  if (checklist.length === 0) {
    out += '_Empty._\n\n';
  } else {
    for (const c of checklist) {
      out += `- ${c.critical ? '⚠ ' : ''}${c.text}`;
      if (c.detail) out += ` — ${c.detail}`;
      out += '\n';
    }
    out += '\n';
  }

  // Chip desc parity
  out += h3('Chip descs (IMPL-040 visibility)');
  const chip = (name, c) => {
    if (!c) return `- ${name}: _not found_\n`;
    return `- ${name}: "${c.desc || ''}"\n`;
  };
  out += chip(`surface="${combo.state.surface}"`, chipSurface);
  out += chip(`strength="${combo.state.strength}"`, chipStrength);
  out += chip(`speed="${combo.state.speed}"`, chipSpeed);
  out += '\n';

  // Automated checks
  out += h3('Automated checks');
  const checks = automatedChecks(r);
  if (checks.length === 0) {
    out += '_All automated checks passed._\n\n';
  } else {
    for (const c of checks) {
      out += `- ${c.severity === 'fail' ? '❌' : c.severity === 'warn' ? '⚠' : 'ℹ'} ${c.label}: ${c.message}\n`;
    }
    out += '\n';
  }

  return out;
}

// ─── Automated checks — purely structural / arithmetic, not domain judgment ──

function automatedChecks(r) {
  const checks = [];
  const { printer, nozzle, mat, profile, advFil, warnings, combo } = r;
  const getNum = (paramKey) => {
    const p = profile[paramKey];
    if (!p || p.value == null) return null;
    const m = String(p.value).match(/-?[\d.]+/);
    return m ? parseFloat(m[0]) : null;
  };
  const getAdvNum = (key) => {
    const v = advFil?.[key];
    if (v == null) return null;
    const m = String(v).match(/-?[\d.]+/);
    return m ? parseFloat(m[0]) : null;
  };

  if (!printer) {
    checks.push({ severity: 'fail', label: 'unknown printer fixture', message: `state.printer="${combo.state.printer}" is not present in data/printers.json` });
  }
  if (!nozzle) {
    checks.push({ severity: 'fail', label: 'unknown nozzle fixture', message: `state.nozzle="${combo.state.nozzle}" is not present in data/nozzles.json` });
  }
  if (!mat) {
    checks.push({ severity: 'fail', label: 'unknown material fixture', message: `state.material="${combo.state.material}" is not present in data/materials.json` });
  }

  // 0. Silent-invalid-preset check — if a `simple` profile param emits undefined,
  //    that's the signature of an unknown preset ID falling through.
  const simpleUndefined = Object.entries(profile).filter(([k, v]) => v && v.mode === 'simple' && (v.value == null || v.value === 'undefined'));
  if (simpleUndefined.length > 0) {
    checks.push({ severity: 'fail', label: 'simple params have undefined value', message: `undefined on: ${simpleUndefined.map(([k])=>k).join(', ')} — likely an unknown preset ID in state` });
  }

  // 0b. Verify combo state uses valid preset IDs
  const filterKeys = r.filters.map(g => g.key);
  ['surface','strength','speed'].forEach(k => {
    const g = r.filters.find(f => f.key === k);
    if (!g) return;
    const selected = combo.state[k];
    if (selected && !g.items.some(i => i.id === selected)) {
      checks.push({ severity: 'fail', label: `invalid ${k} preset`, message: `state.${k}="${selected}" not in valid items [${g.items.map(i=>i.id).join(', ')}]` });
    }
  });

  // 0c. [IMPL-041 / DQ-1] Provenance coverage — every numeric or numeric-derived
  //     emission must carry a non-null `prov` tag so pros can audit the numbers
  //     we emit. String-only qualitative emissions (pattern names, generator
  //     type, seam position) are exempt — no digit, no claim to audit.
  //
  //     Shape: prov === null  → qualitative, exempt
  //            prov === { source: 'vendor'|'rule'|'default'|'calculated', ref? }
  //                             → tagged, valid
  //
  //     This check lands in DQ-1 commit 2 and FAILS initially by design. DQ-1
  //     commit 3 fills baseline tags on every numeric emission in resolveProfile
  //     to satisfy it. Once green, it prevents future untagged emissions from
  //     slipping through review.
  const _hasDigit = (v) => v != null && /\d/.test(String(v));
  const _isNumericEmission = (entry) => {
    if (!entry || entry.value == null) return false;
    return typeof entry.value === 'number' || _hasDigit(entry.value);
  };
  const _validProvShape = (p) => {
    if (p == null) return true; // null is explicitly allowed for qualitative fields
    if (typeof p !== 'object') return false;
    const okSources = ['vendor', 'rule', 'default', 'calculated'];
    return okSources.includes(p.source);
  };
  const _untagged = Object.entries(profile).filter(([, v]) => _isNumericEmission(v) && v.prov == null);
  if (_untagged.length > 0) {
    checks.push({
      severity: 'fail',
      label: 'numeric emissions missing provenance (DQ-1)',
      message: `${_untagged.length} numeric field(s) without prov tag: ${_untagged.map(([k]) => k).join(', ')}`
    });
  }
  const _malformed = Object.entries(profile).filter(([, v]) => v && v.prov != null && !_validProvShape(v.prov));
  if (_malformed.length > 0) {
    checks.push({
      severity: 'fail',
      label: 'malformed prov on profile emissions (DQ-1)',
      message: `${_malformed.length} field(s) with invalid prov shape: ${_malformed.map(([k]) => k).join(', ')} — expected { source: 'vendor'|'rule'|'default'|'calculated', ref? }`
    });
  }

  // 1. layer_height within nozzle × 0.25 … nozzle × 0.70 (or override if present)
  const lh = getNum('layer_height');
  if (lh != null && nozzle) {
    const maxLH = +(nozzle.size * 0.70).toFixed(3);
    const minLH = +(nozzle.size * 0.25).toFixed(3);
    if (lh > maxLH + 1e-9) checks.push({ severity: 'fail', label: 'layer_height > formula max', message: `${lh} > ${maxLH} (nozzle ${nozzle.size} × 0.70)` });
    if (lh < minLH - 1e-9) checks.push({ severity: 'fail', label: 'layer_height < formula min', message: `${lh} < ${minLH} (nozzle ${nozzle.size} × 0.25)` });
  }

  // 2. bed_temperature within printer.max_bed_temp (read from advFil — temps
  //    live in filament preset, not process preset)
  const bt  = getAdvNum('other_layers_bed_temp');
  const bt0 = getAdvNum('initial_layer_bed_temp');
  if (bt != null && printer?.max_bed_temp != null && bt > printer.max_bed_temp) {
    checks.push({ severity: 'fail', label: 'other_layers_bed_temp > printer.max_bed_temp', message: `${bt}°C > ${printer.max_bed_temp}°C (printer cap)` });
  }
  if (bt0 != null && printer?.max_bed_temp != null && bt0 > printer.max_bed_temp) {
    checks.push({ severity: 'fail', label: 'initial_layer_bed_temp > printer.max_bed_temp', message: `${bt0}°C > ${printer.max_bed_temp}°C (printer cap)` });
  }

  // 3. nozzle_temperature within printer.max_nozzle_temp
  const nt  = getAdvNum('other_layers_temp');
  const nt0 = getAdvNum('initial_layer_temp');
  if (nt != null && printer?.max_nozzle_temp != null && nt > printer.max_nozzle_temp) {
    checks.push({ severity: 'fail', label: 'other_layers_temp > printer.max_nozzle_temp', message: `${nt}°C > ${printer.max_nozzle_temp}°C (printer cap)` });
  }
  if (nt0 != null && printer?.max_nozzle_temp != null && nt0 > printer.max_nozzle_temp) {
    checks.push({ severity: 'fail', label: 'initial_layer_temp > printer.max_nozzle_temp', message: `${nt0}°C > ${printer.max_nozzle_temp}°C (printer cap)` });
  }

  // 4. bed_temperature within material safe range
  if (bt != null && mat?.base_settings) {
    const bs = mat.base_settings;
    if (bt > bs.bed_temp_max) checks.push({ severity: 'warn', label: 'other_layers_bed_temp > material.bed_temp_max', message: `${bt}°C > ${bs.bed_temp_max}°C` });
    if (bt < bs.bed_temp_min) checks.push({ severity: 'warn', label: 'other_layers_bed_temp < material.bed_temp_min', message: `${bt}°C < ${bs.bed_temp_min}°C` });
  }

  // 5. nozzle_temperature within material safe range
  if (nt != null && mat?.base_settings) {
    const bs = mat.base_settings;
    if (nt > bs.nozzle_temp_max) checks.push({ severity: 'warn', label: 'other_layers_temp > material.nozzle_temp_max', message: `${nt}°C > ${bs.nozzle_temp_max}°C` });
    if (nt < bs.nozzle_temp_min) checks.push({ severity: 'warn', label: 'other_layers_temp < material.nozzle_temp_min', message: `${nt}°C < ${bs.nozzle_temp_min}°C` });
  }

  // 6. outer_wall_speed within printer.max_speed
  const ow = getNum('outer_wall_speed');
  if (ow != null && printer?.max_speed != null) {
    if (ow > printer.max_speed) checks.push({ severity: 'fail', label: 'outer_wall_speed > printer.max_speed', message: `${ow} > ${printer.max_speed}` });
  }

  // 7. Enclosure check — enclosure_required materials on open-frame printers
  if (mat?.enclosure_required && printer?.enclosure === 'none') {
    const hasEnclosureWarning = warnings.some(w => /enclosure/i.test(w.id + ' ' + (w.text || '')));
    if (!hasEnclosureWarning) {
      checks.push({ severity: 'fail', label: 'enclosure warning missing', message: `material requires enclosure, printer has none, but no warning fires` });
    }
  }

  // 8. Abrasive-material + soft-nozzle check
  if (mat?.nozzle_requirements?.material === 'hardened' && nozzle?.hardened === false) {
    const hasAbrasiveWarning = warnings.some(w => /hard|abrasive|nozzle/i.test(w.id + ' ' + (w.text || '')));
    if (!hasAbrasiveWarning) {
      checks.push({ severity: 'fail', label: 'abrasive-nozzle warning missing', message: `material needs hardened nozzle, ${nozzle?.name} is not hardened, no warning` });
    }
  }

  // 9. Retraction scaling check — retraction_distance should differ from base
  //    retraction_length when nozzle != 0.4
  if (nozzle && mat?.base_settings && nozzle.size !== 0.4) {
    const rd = getNum('retraction_distance');
    const baseRd = mat.base_settings.retraction_length;
    if (rd != null && baseRd != null && Math.abs(rd - baseRd) < 1e-6) {
      checks.push({ severity: 'warn', label: 'retraction not scaled for nozzle', message: `nozzle=${nozzle.size} but retraction_distance=${rd} matches base ${baseRd}` });
    }
  }

  // 10. IMPL-040 chip desc parity — report pre-collected parity issues
  for (const p of r.chipParityIssues || []) {
    checks.push({ severity: 'fail', label: 'IMPL-040 drift: chip ≠ emission', message: `${p.field}: chip says ${p.chipNum} mm, profile emits ${p.emittedNum} mm` });
  }

  // 11. Simple-mode speed params non-null — catches invalid-preset silent
  //     fallback path (see combo-state check above)
  ['outer_wall_speed','inner_wall_speed'].forEach(k => {
    const p = r.profile[k];
    if (p && p.mode === 'simple' && (p.value == null || String(p.value).toLowerCase() === 'undefined')) {
      checks.push({ severity: 'fail', label: `${k} emitted undefined`, message: `silent fallback — check combo state` });
    }
  });

  return checks;
}

// ─── Combos ─────────────────────────────────────────────────────────────────
// Pulled from PLAN.md Phase 1 table.

function stateDefault(overrides) {
  return {
    useCase: ['functional'],
    surface: 'standard',
    strength: 'standard',
    speed: 'balanced',
    environment: 'room_temp',
    support: 'none',
    colors: 'single',
    userLevel: 'intermediate',
    special: [],
    ...overrides,
  };
}

const COMBOS = [
  { id: 1, label: 'X1C + 0.4 std + PLA Basic + Standard/Balanced (baseline sanity)',
    state: stateDefault({ printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic' }) },

  { id: 2, label: 'X1C + 0.2 precision + TPU 95A + Fine/Quality (small nozzle + flex)',
    state: stateDefault({ printer: 'x1c', nozzle: 'prc_0.2', material: 'tpu_95a', surface: 'fine', speed: 'quality' }) },

  { id: 3, label: 'X1C + 0.8 std + PLA Basic + Draft/Fast (big nozzle + max throughput)',
    state: stateDefault({ printer: 'x1c', nozzle: 'std_0.8', material: 'pla_basic', surface: 'draft', speed: 'fast' }) },

  { id: 4, label: 'P1S + 0.6 hardened + PLA-CF + Strong/Balanced (abrasive + strength)',
    state: stateDefault({ printer: 'p1s', nozzle: 'hrd_0.6', material: 'pla_cf', strength: 'strong' }) },

  { id: 5, label: 'A1 mini + 0.4 std + PETG Basic + Standard/Balanced (bedslinger, A1 mini bed-temp q)',
    state: stateDefault({ printer: 'a1mini', nozzle: 'std_0.4', material: 'petg_basic' }) },

  { id: 6, label: 'A1 + 0.4 std + ABS + Standard/Balanced (bedslinger open-frame + high-temp)',
    state: stateDefault({ printer: 'a1', nozzle: 'std_0.4', material: 'abs' }) },

  { id: 7, label: 'Prusa MK4 + 0.4 std + PLA Silk + Fine/Quality (Prusa slicer path)',
    state: stateDefault({ printer: 'mk4', nozzle: 'std_0.4', material: 'pla_silk', surface: 'fine', speed: 'quality' }) },

  { id: 8, label: 'Prusa MK4S + 0.4 std + PETG HF + Standard/Fast (Prusa + HF)',
    state: stateDefault({ printer: 'mk4s', nozzle: 'std_0.4', material: 'petg_hf', speed: 'fast' }) },

  { id: 9, label: 'Voron 2.4 + 0.4 hardened + PA-CF + Maximum/Balanced (CoreXY + abrasive + hot)',
    state: stateDefault({ printer: 'voron_2_4', nozzle: 'hrd_0.4', material: 'pa_cf', surface: 'maximum' }) },

  { id: 10, label: 'K1 Max + 0.4 std + PC + Strong/Balanced (K1+PC bed-temp gap check)',
    state: stateDefault({ printer: 'k1_max', nozzle: 'std_0.4', material: 'pc', strength: 'strong' }) },

  { id: 11, label: 'Creality i7 / SPARKX + 0.4 hardened + PLA-CF + Standard/Balanced (new open-frame bedslinger)',
    state: stateDefault({ printer: 'sparkx_i7', nozzle: 'hrd_0.4', material: 'pla_cf' }) },
];

// ─── Main ───────────────────────────────────────────────────────────────────

(async () => {
  try {
    await Engine.init();
  } catch (e) {
    console.error('Engine.init() failed:', e);
    process.exit(1);
  }

  let report = '';
  report += h1(`Domain walkthrough — ${COMBOS.length} combos`);
  report += `_Generated by \`scripts/walkthrough-harness.js\`. Engine SHA256: ${crypto_sha256(path.join(ROOT, 'engine.js'))}._\n\n`;
  report += '_Date: 2026-04-20. Reviewed commits: web `c4c5071`, iOS `24aef66`._\n\n';
  report += `This report runs the live engine for ${COMBOS.length} representative printer × nozzle × material × goals combinations. Each combo shows the emitted profile, any warnings fired, the generated chip descriptions, and the results of a set of automated structural checks (clamp-to-printer-caps, retraction scaling, warning-fires-when-expected, IMPL-040 parity).\n\n`;
  report += 'Items flagged ❌ or ⚠ are either bugs or noteworthy drift; items flagged ℹ are context.\n\n';

  // Also resolve each combo and collect summary
  const results = COMBOS.map(runCombo);

  // Summary table
  report += h2('Summary');
  report += '| # | Combo | Warnings | Automated checks (fail/warn) |\n|---|---|---|---|\n';
  for (const r of results) {
    const checks = automatedChecks(r);
    const fails = checks.filter(c => c.severity === 'fail').length;
    const warns = checks.filter(c => c.severity === 'warn').length;
    const summary = fails > 0 ? `❌ ${fails} fail` : warns > 0 ? `⚠ ${warns} warn` : '✓ clean';
    report += `| ${r.combo.id} | ${r.combo.label} | ${r.warnings.length} | ${summary} |\n`;
  }
  report += '\n---\n\n';

  // Details per combo
  for (const r of results) {
    report += renderComboSection(r);
    report += '---\n\n';
  }

  // ─── v1.0.4 — Strength speed_multiplier wired in (HIGH-09 / HIGH-04) ──────
  {
    function pickSpeed(state, fieldKey) {
      Engine.setActiveSlicer(Engine.getSlicerForPrinter(state.printer));
      const profile = Engine.resolveProfile(state);
      const value = profile?.[fieldKey]?.value;
      if (typeof value !== 'string') throw new Error(`missing ${fieldKey} in profile`);
      return parseFloat(value);
    }
    const base = { printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic',
                   useCase: ['functional'], surface: 'standard', speed: 'balanced',
                   environment: 'normal', support: 'none', colors: 'single',
                   userLevel: 'intermediate', special: [], build_plate: 'textured_pei',
                   profileMode: 'safe' };
    const std = pickSpeed({ ...base, strength: 'standard' }, 'outer_wall_speed');
    const strong = pickSpeed({ ...base, strength: 'strong' }, 'outer_wall_speed');
    const max = pickSpeed({ ...base, strength: 'maximum' }, 'outer_wall_speed');
    if (std !== 100) throw new Error(`v1.0.4 HIGH-09: expected std outer=100 on X1C+PLA+balanced, got ${std}`);
    if (strong !== 90) throw new Error(`v1.0.4 HIGH-09: expected strong outer=90 (100*0.9), got ${strong}`);
    if (max !== 80) throw new Error(`v1.0.4 HIGH-09: expected maximum outer=80 (100*0.8), got ${max}`);
    if (!(strong < std)) throw new Error(`v1.0.4 HIGH-09: strong outer (${strong}) should be < standard (${std}) on X1C+PLA+balanced`);
    if (!(max < strong)) throw new Error(`v1.0.4 HIGH-09: maximum outer (${max}) should be < strong (${strong}) on X1C+PLA+balanced`);
    const stdInner = pickSpeed({ ...base, strength: 'standard' }, 'inner_wall_speed');
    const strongInner = pickSpeed({ ...base, strength: 'strong' }, 'inner_wall_speed');
    if (!(strongInner < stdInner)) throw new Error(`v1.0.4 HIGH-09: strong inner (${strongInner}) should be < standard (${stdInner})`);
    console.log(`[v1.0.4 HIGH-09] OK strong<standard<inner on X1C+PLA+balanced: outer std=${std}, strong=${strong}, max=${max}`);
  }

  // ─── v1.0.4 — Env data layer + cold-warning fix (HIGH-07/08, HIGH-05) ─────
  {
    function profile(state) {
      Engine.setActiveSlicer(Engine.getSlicerForPrinter(state.printer));
      return Engine.resolveProfile(state);
    }
    function adv(state) {
      Engine.setActiveSlicer(Engine.getSlicerForPrinter(state.printer));
      return Engine.getAdvancedFilamentSettings(state);
    }
    function warnings(state) { return Engine.getWarnings(state).map(w => w.id); }
    const base = { printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic',
                   useCase: ['functional'], surface: 'standard', strength: 'standard',
                   speed: 'balanced', support: 'none', colors: 'single',
                   userLevel: 'intermediate', special: [], build_plate: 'textured_pei',
                   profileMode: 'safe' };

    // 1) bed_first_layer_adj wired into advanced filament settings (cold = +7°C bed first-layer)
    const advNormal = adv({ ...base, environment: 'normal' });
    const advCold = adv({ ...base, environment: 'cold' });
    const bedNormal = parseFloat(advNormal.bed_temperature_initial_layer.value);
    const bedCold = parseFloat(advCold.bed_temperature_initial_layer.value);
    if (!(bedCold > bedNormal)) throw new Error(`v1.0.4 HIGH-07: cold first-layer bed (${bedCold}) should exceed normal (${bedNormal}) by env.bed_first_layer_adj`);
    if (bedCold - bedNormal !== 7) throw new Error(`v1.0.4 HIGH-07: expected +7°C from env.cold.bed_first_layer_adj, got +${bedCold - bedNormal}`);

    // 2) fan_multiplier wired into cooling fan emission (cold = 0.9× of normal)
    const fanNormal = parseFloat(advNormal.fan_max_speed.value);
    const fanCold = parseFloat(advCold.fan_max_speed.value);
    if (!(fanCold < fanNormal)) throw new Error(`v1.0.4 HIGH-07: cold fan max (${fanCold}) should be lower than normal (${fanNormal}) by env.fan_multiplier`);
    if (Math.round(fanCold) !== Math.round(fanNormal * 0.9)) throw new Error(`v1.0.4 HIGH-07: expected fanCold = round(fanNormal * 0.9) = ${Math.round(fanNormal * 0.9)}, got ${fanCold} (fanNormal=${fanNormal})`);

    // 3) force_draft_shield wired into profile output for cold/vcold env
    const profCold = profile({ ...base, environment: 'cold' });
    const draftShieldField = profCold.draft_shield;
    if (!draftShieldField || !/enabled|on|true/i.test(String(draftShieldField.value))) {
      throw new Error(`v1.0.4 HIGH-08: cold env should emit draft_shield enabled; got ${JSON.stringify(draftShieldField)}`);
    }

    // 4) Cold-warning text does NOT lie. If warning copy mentions "first layer bed +N", N must match emitted delta.
    const coldWarnings = Engine.getWarnings({ ...base, environment: 'cold' });
    const bedClaim = coldWarnings.find(w => /first[\s-]?layer\s+bed/i.test(w.text + ' ' + (w.detail || '')));
    if (bedClaim) {
      const match = (bedClaim.text + ' ' + (bedClaim.detail || '')).match(/\+\s*(\d+)\s*°?C/i);
      const claimed = match ? parseInt(match[1], 10) : null;
      const delta = Math.round(bedCold - bedNormal);
      if (claimed !== null && claimed !== delta) {
        throw new Error(`v1.0.4 HIGH-05: cold warning claims +${claimed}°C first-layer bed but emit is +${delta}°C`);
      }
    }
    console.log(`[v1.0.4 ENV] OK bed_first_layer_adj=+${Math.round(bedCold - bedNormal)}°C, fan reduced, draft_shield emitted, warning copy matches emit`);
  }

  // ─── v1.0.4 Phase 1.5 — Codex HIGH-01 export-path env-fan + draft_shield ──
  // Phase 1.5 Codex audit (2026-05-13) found that text export + Bambu export
  // bypass the env-scaled fan_min_speed/fan_max_speed engine emissions and the
  // BAMBU_PROCESS_MAP lacks draft_shield → enable_draft_shield. Live export
  // buttons (app.js:814-846) ship these unscaled values to users.
  {
    const base = { printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic',
                   useCase: ['functional'], surface: 'standard', strength: 'standard',
                   speed: 'balanced', support: 'none', colors: 'single',
                   userLevel: 'intermediate', special: [], build_plate: 'textured_pei',
                   profileMode: 'safe' };
    const coldState = { ...base, environment: 'cold' };

    // Baseline: PLA Basic cooling_fan_min = 70%, fan_max = 100, env.cold.fan_multiplier = 0.9.
    // Engine-side env-scaled emission: fan_min_speed = round(70 × 0.9) = 63, fan_max_speed = 90.
    const advCold = Engine.getAdvancedFilamentSettings(coldState);
    const scaledFanMin = parseInt(advCold.fan_min_speed.value, 10);
    const scaledFanMax = parseInt(advCold.fan_max_speed.value, 10);
    if (scaledFanMin !== 63) throw new Error(`v1.0.4 Codex HIGH-01 baseline: expected fan_min_speed=63 (70×0.9) for PLA+cold; got ${scaledFanMin}`);
    if (scaledFanMax !== 90) throw new Error(`v1.0.4 Codex HIGH-01 baseline: expected fan_max_speed=90 (100×0.9) for PLA+cold; got ${scaledFanMax}`);

    // 1) Text export must surface the env-scaled fan min (not the raw 70%).
    const txt = Engine.formatProfileAsText(coldState);
    if (!txt) throw new Error(`v1.0.4 Codex HIGH-01 export: formatProfileAsText returned null for x1c+cold`);
    const fanMinLine = txt.match(/Fan speed \(min\):\s*([\d]+)/);
    if (!fanMinLine) throw new Error(`v1.0.4 Codex HIGH-01 export: text export missing "Fan speed (min):" line`);
    const txtFanMin = parseInt(fanMinLine[1], 10);
    if (txtFanMin !== scaledFanMin) {
      throw new Error(`v1.0.4 Codex HIGH-01 export: text export Fan speed (min)=${txtFanMin} should match env-scaled ${scaledFanMin} (not unscaled 70)`);
    }

    // 2) Bambu process export must include enable_draft_shield for cold env.
    const bs = Engine.exportBambuStudioJSON(coldState);
    if (!bs) throw new Error(`v1.0.4 Codex HIGH-01 export: exportBambuStudioJSON returned null for x1c+cold`);
    if (bs.process.enable_draft_shield !== '1') {
      throw new Error(`v1.0.4 Codex HIGH-01 export: BS process.enable_draft_shield should be '1' for cold env; got ${JSON.stringify(bs.process.enable_draft_shield)}`);
    }

    // 3) Bambu filament export must apply env.fan_multiplier (not raw material default).
    const bsFanMin = bs.filament.fan_min_speed?.[0];
    const bsFanMax = bs.filament.fan_max_speed?.[0];
    if (parseInt(bsFanMin, 10) !== scaledFanMin) {
      throw new Error(`v1.0.4 Codex HIGH-01 export: BS filament.fan_min_speed=${bsFanMin} should match env-scaled ${scaledFanMin} (not unscaled 70)`);
    }
    if (parseInt(bsFanMax, 10) !== scaledFanMax) {
      throw new Error(`v1.0.4 Codex HIGH-01 export: BS filament.fan_max_speed=${bsFanMax} should match env-scaled ${scaledFanMax} (not unscaled 100)`);
    }

    // 4) S8.5 — overhang fan also env-scaled (Codex post-Phase-1 audit Important #1).
    // PLA cooling_fan_overhang is 100; env.cold.fan_multiplier=0.9 → expected 90.
    const scaledOverhang = Math.round(100 * 0.9);
    if (scaledOverhang !== 90) {
      throw new Error(`v1.0.4 S8.5 overhang baseline: expected 90 (100×0.9) for PLA+cold; got ${scaledOverhang}`);
    }
    // 4a) Text export — Overhang fan speed line must be env-scaled (not raw 100).
    const overhangLine = txt.match(/Overhang fan speed:\s*(\d+)/);
    if (!overhangLine) {
      throw new Error(`v1.0.4 S8.5 overhang export: text export missing "Overhang fan speed:" line`);
    }
    const txtOverhang = parseInt(overhangLine[1], 10);
    if (txtOverhang !== scaledOverhang) {
      throw new Error(`v1.0.4 S8.5 overhang export: text export Overhang fan speed=${txtOverhang} should match env-scaled ${scaledOverhang} (not unscaled 100)`);
    }
    // 4b) BS export overhang_fan_speed[0] env-scaled.
    const bsOverhang = bs.filament.overhang_fan_speed?.[0];
    if (parseInt(bsOverhang, 10) !== scaledOverhang) {
      throw new Error(`v1.0.4 S8.5 overhang export: BS filament.overhang_fan_speed=${bsOverhang} should match env-scaled ${scaledOverhang} (not unscaled 100)`);
    }
    // 4c) Advanced surface — getAdvancedFilamentSettings.cooling_fan_overhang must be env-scaled.
    const advCoolOverhang = parseInt(advCold.cooling_fan_overhang, 10);
    if (advCoolOverhang !== scaledOverhang) {
      throw new Error(`v1.0.4 S8.5 overhang Advanced: advCold.cooling_fan_overhang=${advCoolOverhang} should match env-scaled ${scaledOverhang} (not unscaled 100)`);
    }

    // 5) S8.5 tightening (reviewer I-1) — resolveProfile p.fan_speed must also be
    //    env-scaled. PLA Basic fan_policy='high' → 100%; env.cold.fan_multiplier=0.9
    //    → expected 90%. Same intent as fan_min/max/overhang scaling, different
    //    surface (the labeled "Fan speed" column rendered in every slicer tab).
    Engine.setActiveSlicer(Engine.getSlicerForPrinter(coldState.printer));
    const profCold2 = Engine.resolveProfile(coldState);
    const profFanSpeed = profCold2.fan_speed?.value;
    if (!profFanSpeed) {
      throw new Error(`v1.0.4 S8.5 reviewer I-1: PLA+cold profile must emit fan_speed; got ${profFanSpeed}`);
    }
    const profFanPct = parseInt(String(profFanSpeed).replace('%', ''), 10);
    if (profFanPct !== scaledFanMax) {
      throw new Error(`v1.0.4 S8.5 reviewer I-1: profCold.fan_speed=${profFanSpeed} should be env-scaled ${scaledFanMax}% (PLA fan_policy='high' × env.cold.fan_multiplier=0.9), not unscaled 100%`);
    }
    // Provenance flips to 'rule' when scaling actually applies.
    if (profCold2.fan_speed?.prov?.source !== 'rule') {
      throw new Error(`v1.0.4 S8.5 reviewer I-1: profCold.fan_speed.prov.source should be 'rule' when env-scaled; got ${profCold2.fan_speed?.prov?.source}`);
    }

    console.log(`[v1.0.4 P1.5 HIGH-01-export] OK text+BS+Advanced use env-scaled fan (min=${scaledFanMin}, max=${scaledFanMax}, overhang=${scaledOverhang}, profile fan_speed=${profFanPct}%) + enable_draft_shield for cold env`);
  }

  // ─── v1.0.4 — env clamp misattribution (MEDIUM-05) ────────────────────────
  {
    // PLA Basic on A1 + vcold (PLA max_nozzle=230). Env wants +10°C → 230 + initial offset
    // would clamp. Warning should attribute to env, not material.
    const stVcold = { printer: 'a1', nozzle: 'std_0.4', material: 'pla_basic',
                      useCase: ['functional'], surface: 'standard', strength: 'standard',
                      speed: 'balanced', environment: 'vcold', support: 'none', colors: 'single',
                      userLevel: 'intermediate', special: [], build_plate: 'textured_pei',
                      profileMode: 'safe' };
    const ws = Engine.getWarnings(stVcold);
    const envClampWarn = ws.find(w => /env_compensation_capped|env.*clamp|cold.*clamp/i.test(w.id || ''));
    if (!envClampWarn) {
      throw new Error(`v1.0.4 MEDIUM-05: expected env-attributed clamp warning on PLA+a1+vcold; got ids ${ws.map(w => w.id).join(',')}`);
    }
    console.log(`[v1.0.4 MEDIUM-05] OK env-attributed clamp warning id=${envClampWarn.id}`);
  }

  // ─── v1.0.4 — Physical printer × nozzle guard (HIGH-01) ───────────────────
  {
    // Ender-3 V3 SE has available_nozzle_sizes:[0.4]. Selecting std_0.8 must warn.
    const stBad = { printer: 'ender3_v3_se', nozzle: 'std_0.8', material: 'pla_basic',
                    useCase: ['functional'], surface: 'standard', strength: 'standard',
                    speed: 'balanced', environment: 'normal', support: 'none', colors: 'single',
                    userLevel: 'intermediate', special: [], build_plate: 'textured_pei',
                    profileMode: 'safe' };
    const warnIds = Engine.getWarnings(stBad).map(w => w.id);
    const has = warnIds.includes('nozzle_not_on_printer');
    if (!has) throw new Error(`v1.0.4 HIGH-01: expected nozzle-not-available warning on ender3_v3_se+std_0.8; got ${warnIds.join(',')}`);

    // Centauri Carbon has available_nozzle_sizes:[0.4]. std_0.4 must NOT warn for this reason.
    const stOk = { ...stBad, printer: 'centauri_carbon', nozzle: 'std_0.4' };
    const okWarnIds = Engine.getWarnings(stOk).map(w => w.id);
    if (okWarnIds.includes('nozzle_not_on_printer')) {
      throw new Error(`v1.0.4 HIGH-01: centauri_carbon+std_0.4 should NOT trigger nozzle-not-on-printer; got ${okWarnIds.join(',')}`);
    }

    // Bambu X1C has available_nozzle_sizes:[0.2, 0.4, 0.6, 0.8]. std_0.6 must NOT trigger guard.
    const stMulti = { ...stBad, printer: 'x1c', nozzle: 'std_0.6' };
    const multiWarnIds = Engine.getWarnings(stMulti).map(w => w.id);
    if (multiWarnIds.includes('nozzle_not_on_printer')) {
      throw new Error(`v1.0.4 HIGH-01: x1c+std_0.6 should NOT trigger nozzle-not-on-printer; got ${multiWarnIds.join(',')}`);
    }

    // getCompatibleNozzlesForPrinter is a hard contract on the public surface; if
    // it's silently dropped the harness must fail rather than skip the check.
    if (typeof Engine.getCompatibleNozzlesForPrinter !== 'function') {
      throw new Error(`v1.0.4 HIGH-01: Engine.getCompatibleNozzlesForPrinter must be exposed on the public surface`);
    }
    const list = Engine.getCompatibleNozzlesForPrinter('pla_basic', 'ender3_v3_se');
    const std08 = list.find(e => e.id === 'std_0.8');
    if (std08 && std08.compatible === true) {
      throw new Error(`v1.0.4 HIGH-01: getCompatibleNozzlesForPrinter should mark std_0.8 incompatible on ender3_v3_se`);
    }
    const std04 = list.find(e => e.id === 'std_0.4');
    if (std04 && std04.compatible !== true) {
      throw new Error(`v1.0.4 HIGH-01: getCompatibleNozzlesForPrinter should keep std_0.4 compatible on ender3_v3_se`);
    }

    console.log(`[v1.0.4 HIGH-01] OK printer × nozzle guard fires for ender3_v3_se+std_0.8 and stays silent for centauri_carbon+std_0.4`);
  }

  // ─── v1.0.4 — Physical printer × plate guard + material plate range (HIGH-02 / HIGH-03) ─
  {
    const baseHarness = { nozzle: 'std_0.4', useCase: ['functional'], surface: 'standard',
                          strength: 'standard', speed: 'balanced', environment: 'normal',
                          support: 'none', colors: 'single', userLevel: 'intermediate',
                          special: [], profileMode: 'safe' };

    // 1) BAD: H2D ships [textured_pei, smooth_pei] — cool_plate is not on the printer.
    //    Selecting it must warn with exact ID 'plate_not_on_printer'.
    const stBad = { ...baseHarness, printer: 'h2d', material: 'pla_basic', build_plate: 'cool_plate' };
    const badIds = Engine.getWarnings(stBad).map(w => w.id);
    if (!badIds.includes('plate_not_on_printer')) {
      throw new Error(`v1.0.4 HIGH-02: expected exact warning id 'plate_not_on_printer' on h2d+cool_plate; got ${badIds.join(',')}`);
    }

    // 2) GOOD: Centauri Carbon has available_plates:[textured_pei]. Must NOT trigger guard.
    const stOk = { ...baseHarness, printer: 'centauri_carbon', material: 'pla_basic', build_plate: 'textured_pei' };
    const okIds = Engine.getWarnings(stOk).map(w => w.id);
    if (okIds.includes('plate_not_on_printer')) {
      throw new Error(`v1.0.4 HIGH-02: centauri_carbon+textured_pei should NOT trigger plate_not_on_printer; got ${okIds.join(',')}`);
    }

    // 3) MULTI-PLATE GOOD: x1c ships multiple plates incl. textured_pei. Must NOT trigger guard.
    const stMulti = { ...baseHarness, printer: 'x1c', material: 'pla_basic', build_plate: 'textured_pei' };
    const multiIds = Engine.getWarnings(stMulti).map(w => w.id);
    if (multiIds.includes('plate_not_on_printer')) {
      throw new Error(`v1.0.4 HIGH-02: x1c+textured_pei should NOT trigger plate_not_on_printer (multi-plate printer); got ${multiIds.join(',')}`);
    }

    // 4) HIGH-03 POSITIVE: petg_basic on textured_pei (x1c) — recipe yields
    //    initBed=85 (75 base + 0 env + 5 init-offset + 5 PETG bump), other=75;
    //    plate range for petg_basic on textured_pei is [60, 80]. 85 > 80 ⇒ MUST
    //    fire plate_bed_temp_range. Exercises the initial-layer-driven path
    //    where steady-state stays in-range but the initial layer exceeds it.
    const stBedRange = { ...baseHarness, printer: 'x1c', material: 'petg_basic', build_plate: 'textured_pei' };
    const bedRangeIds = Engine.getWarnings(stBedRange).map(w => w.id);
    if (!bedRangeIds.includes('plate_bed_temp_range')) {
      throw new Error(`v1.0.4 HIGH-03: expected exact warning id 'plate_bed_temp_range' on x1c+petg_basic+textured_pei (initBed 85°C exceeds plate max 80°C); got ${bedRangeIds.join(',')}`);
    }

    // 5) HIGH-03 NEGATIVE: pla_basic on textured_pei (x1c) — both targets fall
    //    inside the plate's [55, 65]°C range. Must NOT fire plate_bed_temp_range.
    const stBedRangeOk = { ...baseHarness, printer: 'x1c', material: 'pla_basic', build_plate: 'textured_pei' };
    const bedRangeOkIds = Engine.getWarnings(stBedRangeOk).map(w => w.id);
    if (bedRangeOkIds.includes('plate_bed_temp_range')) {
      throw new Error(`v1.0.4 HIGH-03: x1c+pla_basic+textured_pei should NOT trigger plate_bed_temp_range (both bed targets in [55,65]); got ${bedRangeOkIds.join(',')}`);
    }

    console.log(`[v1.0.4 HIGH-02/HIGH-03] OK plate guard fires for h2d+cool_plate, stays silent for centauri_carbon+textured_pei and x1c+textured_pei; plate_bed_temp_range fires for petg_basic+textured_pei and stays silent for pla_basic+textured_pei`);
  }

  // ─── v1.0.4 — Practical MCS tiers (HIGH-03 system-type, HIGH ams_lite, MEDIUM-01 empty-MCS) ─
  {
    function getProfile(state) {
      Engine.setActiveSlicer(Engine.getSlicerForPrinter(state.printer));
      return Engine.resolveProfile(state);
    }
    function wIds(state) { return Engine.getWarnings(state).map(w => w.id); }
    const baseMCS = { nozzle: 'std_0.4', useCase: ['functional'], surface: 'standard',
                      strength: 'standard', speed: 'balanced', environment: 'normal',
                      support: 'none', userLevel: 'intermediate', special: [],
                      build_plate: 'textured_pei', profileMode: 'safe' };

    // 1) EMPTY MCS: centauri_carbon (multi_color_systems:[]) + multi_2_4 must warn AND must NOT emit prime_tower: Enabled.
    const stEmpty = { ...baseMCS, printer: 'centauri_carbon', material: 'pla_basic', colors: 'multi_2_4' };
    const profEmpty = getProfile(stEmpty);
    const emptyIds = wIds(stEmpty);
    if (!emptyIds.includes('mcs_empty_no_multicolor')) {
      throw new Error(`v1.0.4 MEDIUM-01: empty-MCS centauri_carbon+multi_2_4 must fire 'mcs_empty_no_multicolor'; got ${emptyIds.join(',')}`);
    }
    if (profEmpty.prime_tower && /enabled/i.test(String(profEmpty.prime_tower.value || ''))) {
      throw new Error(`v1.0.4 MEDIUM-01: empty-MCS must NOT emit prime_tower=Enabled; got ${profEmpty.prime_tower.value}`);
    }
    // v1.0.4 P1.5 LOW-01 — retired Creality-only no-multicolor warning must
    // NOT fire alongside the generalized mcs_empty_no_multicolor (the
    // Creality-specific check was retired in S4 when MCS tiers landed).
    // Two cases pair this guard so it actually exercises the manufacturer-
    // gated retirement: the centauri_carbon (Elegoo) successor catches the
    // generalized re-introduction; the ender3_v3_se (Creality manufacturer)
    // successor catches a *manufacturer-gated* re-introduction that would
    // otherwise slip past the Elegoo case alone.
    if (emptyIds.includes('creality_no_multicolor')) {
      throw new Error(`v1.0.4 P1.5 LOW-01: retired creality_no_multicolor still fires on empty-MCS (Elegoo) successor case; got ${emptyIds.join(',')}`);
    }
    const stEmptyCreality = { ...baseMCS, printer: 'ender3_v3_se', material: 'pla_basic', colors: 'multi_2_4' };
    const emptyCrealityIds = wIds(stEmptyCreality);
    if (!emptyCrealityIds.includes('mcs_empty_no_multicolor')) {
      throw new Error(`v1.0.4 P1.5 LOW-01: Creality empty-MCS (ender3_v3_se) successor MUST fire mcs_empty_no_multicolor; got ${emptyCrealityIds.join(',')}`);
    }
    if (emptyCrealityIds.includes('creality_no_multicolor')) {
      throw new Error(`v1.0.4 P1.5 LOW-01: retired creality_no_multicolor still fires on Creality empty-MCS (ender3_v3_se) successor case — manufacturer-gated regression caught; got ${emptyCrealityIds.join(',')}`);
    }

    // 2) AMS LITE MATERIAL GATE: A1 (ams_lite) + ABS (ams_compatible:true but ams_lite_compatible:false) + multi MUST warn 'ams_lite_material_incompat'.
    const stLite = { ...baseMCS, printer: 'a1', material: 'abs', colors: 'multi_2_4' };
    const liteIds = wIds(stLite);
    if (!liteIds.includes('ams_lite_material_incompat')) {
      throw new Error(`v1.0.4 (ams_lite): A1+ABS+multi must fire 'ams_lite_material_incompat'; got ${liteIds.join(',')}`);
    }

    // 3) AMS LITE COMPATIBLE: A1 + PLA Basic (ams_lite_compatible likely true) + multi MUST NOT fire ams_lite_material_incompat.
    const stLiteOK = { ...baseMCS, printer: 'a1', material: 'pla_basic', colors: 'multi_2_4' };
    const liteOKIds = wIds(stLiteOK);
    if (liteOKIds.includes('ams_lite_material_incompat')) {
      throw new Error(`v1.0.4 (ams_lite): A1+PLA Basic+multi must NOT fire 'ams_lite_material_incompat'; got ${liteOKIds.join(',')}`);
    }

    // 4) AMS-LIKE (x1c, ams_compatible PLA Basic) — no false ams_lite warning, no empty-MCS warning.
    const stAMS = { ...baseMCS, printer: 'x1c', material: 'pla_basic', colors: 'multi_2_4' };
    const amsIds = wIds(stAMS);
    if (amsIds.includes('ams_lite_material_incompat')) {
      throw new Error(`v1.0.4 (system-type): x1c (ams_like) must NOT fire ams_lite-specific warning; got ${amsIds.join(',')}`);
    }
    if (amsIds.includes('mcs_empty_no_multicolor')) {
      throw new Error(`v1.0.4 (system-type): x1c (ams_like) must NOT fire empty-MCS warning; got ${amsIds.join(',')}`);
    }

    // 5) CFS tier (k2_plus): k2_plus + pla_basic + multi MUST fire 'mcs_tier_cfs_guidance'.
    const stCFS = { ...baseMCS, printer: 'k2_plus', material: 'pla_basic', colors: 'multi_2_4' };
    const cfsIds = wIds(stCFS);
    if (!cfsIds.includes('mcs_tier_cfs_guidance')) {
      throw new Error(`v1.0.4 (cfs tier): k2_plus+pla+multi must fire 'mcs_tier_cfs_guidance'; got ${cfsIds.join(',')}`);
    }
    // v1.0.4 P1.5 LOW-01 — retired k2_plus_cfs must NOT fire on the CFS
    // successor positive case (subsumed by mcs_tier_cfs_guidance in S4).
    if (cfsIds.includes('k2_plus_cfs')) {
      throw new Error(`v1.0.4 P1.5 LOW-01: retired k2_plus_cfs still fires on K2 Plus CFS successor case; got ${cfsIds.join(',')}`);
    }

    // 6) CFS LITE sysLabel branch (sparkx_i7): sparkx_i7 + pla_basic + multi MUST also fire 'mcs_tier_cfs_guidance'
    // (exercises the cfs_lite branch in the sysLabel ternary — same ID, different printer/system label).
    const stCFSLite = { ...baseMCS, printer: 'sparkx_i7', material: 'pla_basic', colors: 'multi_2_4' };
    const cfsLiteIds = wIds(stCFSLite);
    if (!cfsLiteIds.includes('mcs_tier_cfs_guidance')) {
      throw new Error(`v1.0.4 (cfs_lite tier): sparkx_i7+pla+multi must fire 'mcs_tier_cfs_guidance'; got ${cfsLiteIds.join(',')}`);
    }
    // v1.0.4 P1.5 LOW-01 — retired k2_plus_cfs must NOT fire on the CFS-Lite
    // successor positive case either (different printer/system label, same
    // generalized successor warning).
    if (cfsLiteIds.includes('k2_plus_cfs')) {
      throw new Error(`v1.0.4 P1.5 LOW-01: retired k2_plus_cfs still fires on sparkx_i7 CFS-Lite successor case; got ${cfsLiteIds.join(',')}`);
    }

    // 7) GENERIC NON-AMS tier (mk4 with mmu3): must fire 'mcs_tier_generic_non_ams_guidance'.
    const stGeneric = { ...baseMCS, printer: 'mk4', material: 'pla_basic', colors: 'multi_2_4' };
    const genericIds = wIds(stGeneric);
    if (!genericIds.includes('mcs_tier_generic_non_ams_guidance')) {
      throw new Error(`v1.0.4 (generic_non_ams tier): mk4+pla+multi must fire 'mcs_tier_generic_non_ams_guidance'; got ${genericIds.join(',')}`);
    }

    // 8) AMS-LIKE prime_tower PRESERVED: x1c + multi MUST still emit prime_tower=Enabled (positive case — pairs with assertion 1's negative).
    const profAMS = getProfile({ ...baseMCS, printer: 'x1c', material: 'pla_basic', colors: 'multi_2_4' });
    if (!profAMS.prime_tower || !/enabled/i.test(String(profAMS.prime_tower.value || ''))) {
      throw new Error(`v1.0.4 (ams_like): x1c+multi MUST emit prime_tower=Enabled; got ${profAMS.prime_tower?.value || '(absent)'}`);
    }

    // 9) MULTI_5 empty-MCS suppression: centauri_carbon + multi_5 must suppress BOTH prime_tower AND flush_into_infill
    //    (exercises the multi_5 branch in the gating).
    const profEmpty5 = getProfile({ ...baseMCS, printer: 'centauri_carbon', material: 'pla_basic', colors: 'multi_5' });
    if (profEmpty5.prime_tower && /enabled/i.test(String(profEmpty5.prime_tower.value || ''))) {
      throw new Error(`v1.0.4 (multi_5 empty-MCS): centauri_carbon+multi_5 must NOT emit prime_tower=Enabled; got ${profEmpty5.prime_tower.value}`);
    }
    if (profEmpty5.flush_into_infill && /enabled/i.test(String(profEmpty5.flush_into_infill.value || ''))) {
      throw new Error(`v1.0.4 (multi_5 empty-MCS): centauri_carbon+multi_5 must NOT emit flush_into_infill=Enabled; got ${profEmpty5.flush_into_infill.value}`);
    }

    console.log(`[v1.0.4 MCS] OK empty-MCS warn+suppress; ams_lite gates; ams_like preserves prime_tower; cfs/cfs_lite/generic_non_ams advisories fire; multi_5 suppression on empty-MCS works; retired IDs (creality_no_multicolor / k2_plus_cfs) silent on successor cases (LOW-01). empty prime_tower=${profEmpty.prime_tower?.value || '(absent)'}, ams_like prime_tower=${profAMS.prime_tower?.value}, cfs ids=${cfsIds.length}, generic ids=${genericIds.length}`);
  }

  // ─── v1.0.4 — Chamber safe-cap guard (HIGH-05) ─────────────────────────────
  // Owner default 4: guard-only. No numeric chamber profile field is emitted;
  // the guard surfaces a warning whenever the active-chamber printer + material
  // pair could exceed the material's safe ceiling.
  //
  // Canonical pathological combo: X1E (active_chamber_heating, max_chamber=60°C)
  // + PETG Basic (safe_chamber_temp_max=50°C) — guard MUST fire.
  // Silent-for cases:
  //   - X1C + PETG Basic: enclosed but no active_chamber_heating → guard MUST NOT fire.
  //   - X1E + PLA Basic: active chamber but PLA carries no safe_chamber_temp_max → guard MUST NOT fire.
  {
    const stFire = stateDefault({
      printer: 'x1e', nozzle: 'std_0.4', material: 'petg_basic',
    });
    const fireWarns = Engine.getWarnings(stFire);
    const fireIds = fireWarns.map(w => w.id);
    if (!fireIds.includes('chamber_above_material_safe')) {
      throw new Error(`v1.0.4 HIGH-05: X1E+petg_basic must fire chamber_above_material_safe; got ${fireIds.join(',')}`);
    }
    const petg = Engine.getMaterial('petg_basic');
    const matCap = petg?.safe_chamber_temp_max ?? petg?.enclosure_behavior?.safe_chamber_temp_max;
    if (matCap !== 50) {
      throw new Error(`v1.0.4 HIGH-05: petg_basic safe_chamber_temp_max expected 50, got ${matCap}`);
    }
    const guardWarn = fireWarns.find(w => w.id === 'chamber_above_material_safe');
    if (!/50°C/.test(guardWarn.text)) {
      throw new Error(`v1.0.4 HIGH-05: guard text must reference 50°C cap; got "${guardWarn.text}"`);
    }

    const stSilentNoActive = stateDefault({
      printer: 'x1c', nozzle: 'std_0.4', material: 'petg_basic',
    });
    const silentNoActiveIds = Engine.getWarnings(stSilentNoActive).map(w => w.id);
    if (silentNoActiveIds.includes('chamber_above_material_safe')) {
      throw new Error(`v1.0.4 HIGH-05: X1C+petg_basic (no active chamber) must NOT fire chamber_above_material_safe; got ${silentNoActiveIds.join(',')}`);
    }

    // v1.0.4 P1.5 HIGH-02: post-fix, X1E + PLA Basic MUST fire the guard
    // (PLA-family now carries safe_chamber_temp_max=50 < X1E max_chamber=60).
    // The original "silent on no-safe-cap" case is replaced by X1C+pla_basic
    // (no active-chamber → guard silent regardless of material cap).
    const stFirePLA = stateDefault({
      printer: 'x1e', nozzle: 'std_0.4', material: 'pla_basic',
    });
    const firePLAWarns = Engine.getWarnings(stFirePLA);
    const firePLAIds = firePLAWarns.map(w => w.id);
    if (!firePLAIds.includes('chamber_above_material_safe')) {
      throw new Error(`v1.0.4 P1.5 HIGH-02: X1E+pla_basic must fire chamber_above_material_safe; got ${firePLAIds.join(',')}`);
    }
    const pla = Engine.getMaterial('pla_basic');
    const plaCap = pla?.safe_chamber_temp_max ?? pla?.enclosure_behavior?.safe_chamber_temp_max;
    if (plaCap !== 50) {
      throw new Error(`v1.0.4 P1.5 HIGH-02: pla_basic safe_chamber_temp_max expected 50, got ${plaCap}`);
    }
    const plaGuard = firePLAWarns.find(w => w.id === 'chamber_above_material_safe');
    if (!/50°C/.test(plaGuard.text)) {
      throw new Error(`v1.0.4 P1.5 HIGH-02: guard text must reference 50°C cap for PLA; got "${plaGuard.text}"`);
    }

    const stSilentNoActivePLA = stateDefault({
      printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic',
    });
    const silentNoActivePLAIds = Engine.getWarnings(stSilentNoActivePLA).map(w => w.id);
    if (silentNoActivePLAIds.includes('chamber_above_material_safe')) {
      throw new Error(`v1.0.4 P1.5 HIGH-02: X1C+pla_basic (no active chamber) must NOT fire chamber_above_material_safe; got ${silentNoActivePLAIds.join(',')}`);
    }

    console.log(`[v1.0.4 HIGH-05] OK chamber_above_material_safe fires on X1E+petg_basic (cap=${matCap}°C) and X1E+pla_basic (cap=${plaCap}°C); silent on X1C+petg_basic and X1C+pla_basic (no active chamber).`);
  }

  // ─── v1.0.4 P1.5 — HIGH-02 PLA cold/chamber safety (Option B) ──────────────
  // PLA on enclosed/active-heated printers must NOT be told to keep the door
  // closed during cold-env compensation; instead it must get the positive
  // open-door / remove-top-glass guidance + the chamber safe-cap guard. The
  // generic cold-env "Preheat enclosure 15 min" copy contradicts the heat-creep
  // mitigation and must be suppressed for the same material/printer pair.
  //
  // Non-regression: PETG (no open_door_threshold_bed_temp) on X1E + cold MUST
  // still receive the verbatim "Keep door closed" copy — the suppression is
  // material-aware, not env-aware.
  {
    // PLA on X1E (active-heated, enclosure='active') + cold env.
    const stPlaColdActive = stateDefault({
      printer: 'x1e', nozzle: 'std_0.4', material: 'pla_basic', environment: 'cold',
    });
    const plaColdWarns = Engine.getWarnings(stPlaColdActive);
    const plaColdIds = plaColdWarns.map(w => w.id);
    const plaColdText = plaColdWarns.map(w => `${w.text} ${w.detail || ''}`).join(' || ');

    // (a) Extended pla_heat_creep MUST fire (was passive-only; Option B extends to active).
    if (!plaColdIds.includes('pla_heat_creep')) {
      throw new Error(`v1.0.4 P1.5 HIGH-02: pla_heat_creep MUST fire on X1E+PLA+cold (active enclosure extension); got ${plaColdIds.join(',')}`);
    }

    // (b) NO warning text on PLA+enclosed pair may say "Keep door closed".
    if (/Keep door closed/i.test(plaColdText)) {
      throw new Error(`v1.0.4 P1.5 HIGH-02: PLA + enclosed + cold MUST NOT carry "Keep door closed" copy; warnings text = ${plaColdText}`);
    }

    // (c) Checklist MUST NOT include "Preheat enclosure" for PLA-family + enclosed
    //     (contradicts the open-door guidance the same checklist provides next).
    const plaChecklist = Engine.getChecklist(stPlaColdActive);
    const plaChecklistText = plaChecklist.map(c => c.text).join(' || ');
    if (/Preheat enclosure/i.test(plaChecklistText)) {
      throw new Error(`v1.0.4 P1.5 HIGH-02: PLA + enclosed + cold MUST NOT include "Preheat enclosure" checklist item; got = ${plaChecklistText}`);
    }
    // (d) Existing "Open front door + remove top glass panel" item MUST still appear
    //     (this is the positive guidance — without it the user gets no door direction at all).
    if (!/Open front door/i.test(plaChecklistText)) {
      throw new Error(`v1.0.4 P1.5 HIGH-02: PLA + enclosed + cold MUST include "Open front door" checklist item; got = ${plaChecklistText}`);
    }

    // (e) Non-regression on passive-enclosure path: PLA + P1S (passive) + cold
    //     must still fire pla_heat_creep (existing behavior).
    const stPlaColdPassive = stateDefault({
      printer: 'p1s', nozzle: 'std_0.4', material: 'pla_basic', environment: 'cold',
    });
    const plaColdPassiveIds = Engine.getWarnings(stPlaColdPassive).map(w => w.id);
    if (!plaColdPassiveIds.includes('pla_heat_creep')) {
      throw new Error(`v1.0.4 P1.5 HIGH-02 non-regression: pla_heat_creep must still fire on P1S+PLA+cold (passive enclosure); got ${plaColdPassiveIds.join(',')}`);
    }

    // (f) Non-regression: PETG (no open_door_threshold_bed_temp) on X1E + cold
    //     MUST still carry the "Keep door closed" copy — suppression is
    //     material-aware (PLA-only), not blanket env-aware.
    const stPetgColdActive = stateDefault({
      printer: 'x1e', nozzle: 'std_0.4', material: 'petg_basic', environment: 'cold',
    });
    const petgColdText = Engine.getWarnings(stPetgColdActive)
      .map(w => `${w.text} ${w.detail || ''}`).join(' || ');
    if (!/Keep door closed/i.test(petgColdText)) {
      throw new Error(`v1.0.4 P1.5 HIGH-02 non-regression: PETG (no open_door_threshold) on X1E+cold MUST still carry "Keep door closed" copy; got = ${petgColdText}`);
    }

    // (g) Non-regression: PVA (carries open_door_threshold_bed_temp but is
    //     out of HIGH-02 scope) on X1C + cold MUST still carry the verbatim
    //     "Keep door closed" copy — suppression predicate must NOT broaden
    //     to all materials with open_door_threshold. Pre-existing PVA
    //     humidity posture is preserved.
    const stPvaColdEnclosed = stateDefault({
      printer: 'x1c', nozzle: 'std_0.4', material: 'pva', environment: 'cold',
    });
    const pvaColdText = Engine.getWarnings(stPvaColdEnclosed)
      .map(w => `${w.text} ${w.detail || ''}`).join(' || ');
    if (!/Keep door closed/i.test(pvaColdText)) {
      throw new Error(`v1.0.4 P1.5 HIGH-02 scope guard: PVA on X1C+cold MUST still carry "Keep door closed" (HIGH-02 is PLA-only); got = ${pvaColdText}`);
    }

    // (h) vcold pin: PLA + X1E + vcold MUST suppress vcold's "Extended preheat
    //     (20 min)" copy (the `preheat \(` regex clause exists specifically
    //     for this string). pla_heat_creep MUST still fire. Pins the regex
    //     against future env.json copy edits drifting silently.
    const stPlaVcoldActive = stateDefault({
      printer: 'x1e', nozzle: 'std_0.4', material: 'pla_basic', environment: 'vcold',
    });
    const plaVcoldWarns = Engine.getWarnings(stPlaVcoldActive);
    const plaVcoldIds = plaVcoldWarns.map(w => w.id);
    const plaVcoldText = plaVcoldWarns.map(w => `${w.text} ${w.detail || ''}`).join(' || ');
    if (!plaVcoldIds.includes('pla_heat_creep')) {
      throw new Error(`v1.0.4 P1.5 HIGH-02 vcold: pla_heat_creep MUST fire on X1E+PLA+vcold; got ${plaVcoldIds.join(',')}`);
    }
    if (/Extended preheat/i.test(plaVcoldText)) {
      throw new Error(`v1.0.4 P1.5 HIGH-02 vcold: PLA + enclosed + vcold MUST NOT carry "Extended preheat" copy; warnings text = ${plaVcoldText}`);
    }
    if (/Preheat the enclosure/i.test(plaVcoldText)) {
      throw new Error(`v1.0.4 P1.5 HIGH-02 vcold: PLA + enclosed + vcold MUST NOT carry "Preheat the enclosure" copy; warnings text = ${plaVcoldText}`);
    }

    console.log(`[v1.0.4 P1.5 HIGH-02] OK PLA on X1E (active) + cold/vcold: pla_heat_creep fires; no "Keep door closed"/"Extended preheat"/"Preheat the enclosure"; no "Preheat enclosure" in checklist; "Open front door" still present. Passive (P1S) regression clean. PETG + PVA non-regressions: "Keep door closed" preserved (PLA-only scope).`);
  }

  // ─── v1.0.4 — Nozzle min-diameter cleanup + nozzle-side authority drop (HIGH-12 / HIGH-06) ─
  // TPU 85A on std_0.4: TPU 85A min_diameter=0.6 → guard MUST fire.
  // Retired cf_small_nozzle MUST NOT fire (it carried the misleading "0.2mm
  // nozzle will clog immediately" hardcode that fired on any CF-or-bigger
  // material below min_diameter, not just 0.2mm nozzles).
  // Warning body must mention selected (0.4mm) and required (0.6mm) sizes —
  // never the bogus "0.2mm" hardcode.
  // Nozzle entries must no longer carry suitable_for / not_suitable_for arrays
  // (material-side nozzle_requirements is authoritative per owner default 5).
  {
    const st = stateDefault({ printer: 'x1c', nozzle: 'std_0.4', material: 'tpu_85a' });
    const ws = Engine.getWarnings(st);
    const ids = ws.map(w => w.id);

    if (ids.includes('cf_small_nozzle')) {
      throw new Error(`v1.0.4 HIGH-12: retired cf_small_nozzle still fires; got ${ids.join(',')}`);
    }
    // v1.0.4 P1.5 LOW-01 — retired nozzle_too_small must NOT fire on the
    // successor positive case (TPU 85A + std_0.4). Subsumed by
    // nozzle_below_min_diameter in S5; this guard prevents a regression
    // from silently re-introducing the retired ID alongside the successor.
    if (ids.includes('nozzle_too_small')) {
      throw new Error(`v1.0.4 P1.5 LOW-01: retired nozzle_too_small still fires alongside nozzle_below_min_diameter; got ${ids.join(',')}`);
    }
    if (!ids.includes('nozzle_below_min_diameter')) {
      throw new Error(`v1.0.4 HIGH-12: expected nozzle_below_min_diameter on x1c+std_0.4+tpu_85a; got ${ids.join(',')}`);
    }
    const guardWarn = ws.find(w => w.id === 'nozzle_below_min_diameter');
    const body = String(guardWarn.text || '') + ' ' + String(guardWarn.detail || '');
    if (/0\.2\s*mm/.test(body)) {
      throw new Error(`v1.0.4 HIGH-12: warning body wrongly mentions 0.2mm on tpu_85a+std_0.4: ${body}`);
    }
    if (!/0\.4/.test(body) || !/0\.6/.test(body)) {
      throw new Error(`v1.0.4 HIGH-12: warning body must mention selected (0.4) and required (0.6); got ${body}`);
    }

    // Spot-check one nozzle for HIGH-06 schema cleanup. Full data sweep runs
    // in the verification gate (Step 5 node -e oneliner).
    const sampleNoz = Engine.getNozzle('std_0.4');
    if (sampleNoz && ('suitable_for' in sampleNoz || 'not_suitable_for' in sampleNoz)) {
      throw new Error(`v1.0.4 HIGH-06: nozzle ${sampleNoz.id} still carries suitable_for/not_suitable_for after cleanup`);
    }

    console.log(`[v1.0.4 HIGH-12/HIGH-06] OK nozzle_below_min_diameter parameterized (selected=0.4mm, required=0.6mm); retired cf_small_nozzle + nozzle_too_small silent on successor case (LOW-01); std_0.4 carries no suitable_for/not_suitable_for.`);
  }

  // ─── v1.0.4 P1.5 — MEDIUM-01 First-layer bed-clamp attribution honesty ────
  // Pre-fix: env_${env.id}_bed_first_layer warning claimed "+N°C applied"
  // whenever env.bed_first_layer_adj > 0, regardless of whether bedCap clipped
  // the requested delta. Also: printer_max_bed_temp_clamped initTarget math
  // excluded bed_first_layer_adj, so cap-warnings underreported when env
  // compensation pushed past the printer bed cap.
  //
  // Post-fix:
  //   - env_..._bed_first_layer warning computes effective post-clamp delta
  //     and switches to "requested but clipped" copy when partially/fully
  //     clipped; keeps "+N°C applied" copy when delta lands cleanly.
  //   - printer_max_bed_temp_clamped initTarget includes bed_first_layer_adj,
  //     mirroring getAdvancedFilamentSettings' computation — attribution
  //     discipline parity with MEDIUM-05's nozzle-side env-attribution.
  {
    // (a) PETG + X1C + cold: material cap (PETG 85°C) fully clips +7°C env.
    //     initBedNoEnv = 75+0+5+5 = 85 (already at PETG cap);
    //     initBedWithEnv = 92, clamped to 85;
    //     effective applied = 0.
    //     Warning copy MUST indicate "requested but clipped" and MUST NOT
    //     claim "+7°C applied".
    const stPetgX1cCold = stateDefault({
      printer: 'x1c', nozzle: 'std_0.4', material: 'petg_basic', environment: 'cold',
    });
    const petgX1cWarns = Engine.getWarnings(stPetgX1cCold);
    const petgX1cBed = petgX1cWarns.find(w => w.id === 'env_cold_bed_first_layer');
    if (!petgX1cBed) {
      throw new Error(`v1.0.4 P1.5 MEDIUM-01: PETG+X1C+cold must still emit env_cold_bed_first_layer warning; got ids ${petgX1cWarns.map(w=>w.id).join(',')}`);
    }
    if (/\+7°C applied/i.test(petgX1cBed.text)) {
      throw new Error(`v1.0.4 P1.5 MEDIUM-01: PETG+X1C+cold warning still claims "+7°C applied" despite material cap fully clipping; text = "${petgX1cBed.text}"`);
    }
    if (!/requested.+clip/i.test(petgX1cBed.text)) {
      throw new Error(`v1.0.4 P1.5 MEDIUM-01: PETG+X1C+cold warning must indicate "requested but clipped" framing; text = "${petgX1cBed.text}"`);
    }

    // (b) PLA + X1C + cold: no clipping. PLA bedCap = min(65, 110) = 65;
    //     initBedNoEnv = 55+0+0+0 = 55; initBedWithEnv = 62 ≤ 65.
    //     Effective applied = +7°C. Copy MUST keep "+7°C applied" and MUST
    //     NOT mention clipping (non-regression).
    const stPlaX1cCold = stateDefault({
      printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic', environment: 'cold',
    });
    const plaX1cWarns = Engine.getWarnings(stPlaX1cCold);
    const plaX1cBed = plaX1cWarns.find(w => w.id === 'env_cold_bed_first_layer');
    if (!plaX1cBed) {
      throw new Error(`v1.0.4 P1.5 MEDIUM-01: PLA+X1C+cold must still emit env_cold_bed_first_layer (no clip); got ids ${plaX1cWarns.map(w=>w.id).join(',')}`);
    }
    if (!/\+7°C applied/i.test(plaX1cBed.text)) {
      throw new Error(`v1.0.4 P1.5 MEDIUM-01 non-regression: PLA+X1C+cold (no clip) MUST keep "+7°C applied" copy; text = "${plaX1cBed.text}"`);
    }
    if (/clip/i.test(plaX1cBed.text)) {
      throw new Error(`v1.0.4 P1.5 MEDIUM-01 non-regression: PLA+X1C+cold (no clip) MUST NOT mention clipping; text = "${plaX1cBed.text}"`);
    }
    // Same combo: PLA + X1C + cold MUST NOT fire printer_max_bed_temp_clamped
    // (X1C bed cap 110 is generous; PLA initTarget post-env = 62 ≤ 110).
    if (plaX1cWarns.map(w=>w.id).includes('printer_max_bed_temp_clamped')) {
      throw new Error(`v1.0.4 P1.5 MEDIUM-01 non-regression: PLA+X1C+cold MUST NOT fire printer_max_bed_temp_clamped; got ${plaX1cWarns.map(w=>w.id).join(',')}`);
    }

    // (c) Pair-fix coverage: PETG + Kobra 3 Max + cold. Kobra 3 Max
    //     max_bed_temp = 90; PETG initTarget(no env) = 85 ≤ 90 so cap-warning
    //     historically did NOT fire even though env compensation actually
    //     pushed past the printer cap. Including bed_first_layer_adj in the
    //     initTarget math makes initTarget(with env) = 92 > 90 → fires.
    //     Attribution discipline parity with MEDIUM-05.
    const stPetgKobraCold = stateDefault({
      printer: 'kobra_3_max', nozzle: 'std_0.4', material: 'petg_basic', environment: 'cold',
    });
    const petgKobraIds = Engine.getWarnings(stPetgKobraCold).map(w => w.id);
    if (!petgKobraIds.includes('printer_max_bed_temp_clamped')) {
      throw new Error(`v1.0.4 P1.5 MEDIUM-01 pair: PETG+Kobra 3 Max+cold MUST fire printer_max_bed_temp_clamped (env compensation pushes initTarget=92 past Kobra's 90°C bed cap); got ${petgKobraIds.join(',')}`);
    }

    // (d) Non-regression: PETG + X1C + cold MUST NOT fire
    //     printer_max_bed_temp_clamped — material cap is binding, not printer.
    //     X1C max_bed_temp = 110; PETG initTarget post-env = 92 ≤ 110. The
    //     env warning rewrite at (a) is what conveys the material-side clip.
    if (petgX1cWarns.map(w=>w.id).includes('printer_max_bed_temp_clamped')) {
      throw new Error(`v1.0.4 P1.5 MEDIUM-01 non-regression: PETG+X1C+cold MUST NOT fire printer_max_bed_temp_clamped (X1C 110°C bed cap is generous; material cap is the binding constraint); got ${petgX1cWarns.map(w=>w.id).join(',')}`);
    }

    // (e) Partial-clip branch coverage: PLA Basic + X1C + vcold.
    //     vcold has bed_adj=5 and bed_first_layer_adj=10. PLA bed_temp_base=55,
    //     bed_temp_max=65, initial_layer_bed_offset=0, not isPETG.
    //     initBedNoEnv = 55+5+0+0 = 60.
    //     initBedWithEnv = 60+10 = 70.
    //     bedCap = min(65, 110 X1C cap) = 65.
    //     effectiveAdj = min(70,65) - min(60,65) = 65 - 60 = 5.
    //     Requested +10°C; only +5°C lands — partial clip branch must fire.
    //     This is the ONLY naturally-reachable partial-clip combo with current
    //     env + materials data, so the harness pins the branch's copy shape
    //     against future drift (added per code-review subagent's "branch is
    //     dead-untested today" Important finding).
    const stPlaX1cVcold = stateDefault({
      printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic', environment: 'vcold',
    });
    const plaVcoldBed = Engine.getWarnings(stPlaX1cVcold).find(w => w.id === 'env_vcold_bed_first_layer');
    if (!plaVcoldBed) {
      throw new Error(`v1.0.4 P1.5 MEDIUM-01: PLA+X1C+vcold must emit env_vcold_bed_first_layer (partial-clip); got warnings from vcold combo`);
    }
    if (!/\+5°C applied/i.test(plaVcoldBed.text)) {
      throw new Error(`v1.0.4 P1.5 MEDIUM-01: PLA+X1C+vcold (partial clip) MUST report "+5°C applied"; text = "${plaVcoldBed.text}"`);
    }
    if (!/requested \+10°C/i.test(plaVcoldBed.text)) {
      throw new Error(`v1.0.4 P1.5 MEDIUM-01: PLA+X1C+vcold (partial clip) MUST report "requested +10°C"; text = "${plaVcoldBed.text}"`);
    }
    if (!/partially clip/i.test(plaVcoldBed.text)) {
      throw new Error(`v1.0.4 P1.5 MEDIUM-01: PLA+X1C+vcold (partial clip) MUST contain "partially clip"; text = "${plaVcoldBed.text}"`);
    }

    console.log(`[v1.0.4 P1.5 MEDIUM-01] OK env_*_bed_first_layer reflects post-clamp truth across all three branches: fully-clipped PETG+X1C+cold says "requested but clipped"; un-clipped PLA+X1C+cold keeps "+7°C applied"; partial-clip PLA+X1C+vcold says "+5°C applied (requested +10°C, partially clipped...)". printer_max_bed_temp_clamped now fires on PETG+Kobra 3 Max+cold via env contribution to initTarget; non-regression on PLA+X1C and PETG+X1C printer-cap-clamp paths.`);
  }

  // ─── v1.0.5 — env-name prefix dedupe on bed-first-layer warning ──────────
  // Bug (owner-reported 2026-05-19, screenshot): when an env triggers BOTH
  // the dedicated bed-first-layer warning (MEDIUM-01) AND the consolidated
  // env-compensation warning (nozzle / bed / first-layer-speed), both banners
  // led with the same `${env.name}` prefix — e.g. two consecutive warnings
  // both starting with "Cold garage (5–15°C)". The bed-first-layer banner
  // doesn't need to carry env framing because the consolidated banner that
  // follows already does. Fix: strip the env.name prefix from the three
  // MEDIUM-01 attribution-honesty branches in engine.js. Consolidated banner
  // keeps the env prefix as the canonical "this is from <env>" framing.
  {
    // Probe all three MEDIUM-01 attribution branches at the same combos used
    // above. Assert each text does NOT start with env.name. Each combo also
    // emits a consolidated env warning, so this is the dedup contract.
    const cases = [
      { label: 'fully-clipped (PETG+X1C+cold)', envId: 'cold', envName: 'Cold garage (5–15°C)',
        state: stateDefault({ printer: 'x1c', nozzle: 'std_0.4', material: 'petg_basic', environment: 'cold' }),
        bedWarningId: 'env_cold_bed_first_layer' },
      { label: 'full-apply (PLA+X1C+cold)', envId: 'cold', envName: 'Cold garage (5–15°C)',
        state: stateDefault({ printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic', environment: 'cold' }),
        bedWarningId: 'env_cold_bed_first_layer' },
      { label: 'partial-clip (PLA+X1C+vcold)', envId: 'vcold', envName: 'Very cold (<5°C)',
        state: stateDefault({ printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic', environment: 'vcold' }),
        bedWarningId: 'env_vcold_bed_first_layer' },
    ];
    for (const c of cases) {
      const warns = Engine.getWarnings(c.state);
      const bed = warns.find(w => w.id === c.bedWarningId);
      if (!bed) {
        throw new Error(`v1.0.5 env-prefix-dedupe: ${c.label} must emit ${c.bedWarningId}; got ids ${warns.map(w=>w.id).join(',')}`);
      }
      if (bed.text.startsWith(c.envName)) {
        throw new Error(`v1.0.5 env-prefix-dedupe: ${c.label} bed warning MUST NOT start with env.name "${c.envName}"; text = "${bed.text}"`);
      }
      // Pair contract: the consolidated banner exists for this combo and DOES
      // carry the env.name prefix — that's the surface the dedup defers to.
      const consolidated = warns.find(w => w.id === `env_${c.envId}_0`);
      if (!consolidated) {
        throw new Error(`v1.0.5 env-prefix-dedupe: ${c.label} must also emit consolidated env_${c.envId}_0 warning (pair contract); got ids ${warns.map(w=>w.id).join(',')}`);
      }
      if (!consolidated.text.startsWith(c.envName)) {
        throw new Error(`v1.0.5 env-prefix-dedupe: ${c.label} consolidated warning MUST keep env.name prefix "${c.envName}" (the bed warning defers to it); text = "${consolidated.text}"`);
      }
    }
    console.log(`[v1.0.5 env-prefix-dedupe] OK env_*_bed_first_layer no longer duplicates env.name prefix across all three MEDIUM-01 branches; consolidated env_*_0 warning keeps the env framing.`);
  }

  // [IMPL-041 / DQ-2] Cross-combo Safe/Tuned assertion. Runs two baseline
  // combos in Safe and Tuned; asserts:
  //   (a) Safe emission byte-equal to the default (profileMode absent) combo
  //       — protects the "zero-surprise for existing users" invariant.
  //   (b) Tuned emission differs from Safe on at least 3 of the 5 MVP tiered
  //       fields for an A1+strong+fast combo (sized for Bedslinger coverage),
  //       proving the _tuned data actually flows through _tier() + _clampNum.
  report += h2('DQ-2 Safe vs Tuned assertion');
  const dq2Lines = [];
  const dq2Fields = ['outer_wall_speed', 'outer_wall_acceleration', 'sparse_infill_density'];

  const baseSafe = Engine.resolveProfile(stateDefault({
    printer: 'a1', nozzle: 'std_0.4', material: 'pla_basic',
    strength: 'strong', speed: 'fast',
  }));
  const explicitSafe = Engine.resolveProfile(stateDefault({
    printer: 'a1', nozzle: 'std_0.4', material: 'pla_basic',
    strength: 'strong', speed: 'fast', profileMode: 'safe',
  }));
  const tuned = Engine.resolveProfile(stateDefault({
    printer: 'a1', nozzle: 'std_0.4', material: 'pla_basic',
    strength: 'strong', speed: 'fast', profileMode: 'tuned',
  }));

  // (a) Safe-default byte-equality check — absent profileMode vs explicit 'safe'
  const byteEqual = dq2Fields.every(k => baseSafe[k]?.value === explicitSafe[k]?.value);
  dq2Lines.push(`- ${byteEqual ? '✓' : '❌'} Safe baseline: profileMode absent === profileMode='safe' on ${dq2Fields.length} tiered fields.`);

  // (b) Tuned delta — count how many tiered fields differ from Safe
  const differentiated = dq2Fields.filter(k => baseSafe[k]?.value !== tuned[k]?.value);
  const diffSummary = differentiated.map(k => `${k}: ${baseSafe[k]?.value} → ${tuned[k]?.value}`).join(', ');
  dq2Lines.push(`- ${differentiated.length >= 3 ? '✓' : '❌'} Tuned differentiation: ${differentiated.length}/5 tiered fields differ on A1+strong+fast (${diffSummary || 'none'}).`);

  // (c) Prov tier markers — tuned run should carry " (_tuned)" or " (base from _tuned)" in prov.ref for at least the differentiated fields
  const provTagged = differentiated.filter(k => typeof tuned[k]?.prov?.ref === 'string' && /_tuned/.test(tuned[k].prov.ref));
  dq2Lines.push(`- ${provTagged.length === differentiated.length ? '✓' : '⚠'} Prov refs tier-tagged: ${provTagged.length}/${differentiated.length} differentiated fields carry '_tuned' marker.`);

  report += dq2Lines.join('\n') + '\n\n---\n\n';

  process.stdout.write(report);
})();

function crypto_sha256(filePath) {
  const h = require('crypto').createHash('sha256');
  h.update(fs.readFileSync(filePath));
  return h.digest('hex').slice(0, 12);
}
